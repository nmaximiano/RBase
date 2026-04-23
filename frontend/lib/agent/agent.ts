/**
 * The chat turn loop. Runs entirely in the browser against OpenRouter.
 *
 * `runAgent(options)` streams a completion, dispatches any tool calls back
 * to the UI via `options.handlers`, appends the tool results, and loops
 * until the model stops calling tools or MAX_ROUNDS is hit. There is no
 * SSE or HTTP round-trip between the agent and the tool handlers; they
 * are plain async callbacks in the same JS runtime. The caller supplies
 * an AbortSignal; aborting it exits the loop at the next safe point.
 *
 * Key functions:
 *   - runAgent: main entry point; resolves when the turn is fully done
 *   - buildSystemMessage: serializes dataset context + current plan as JSON
 *   - slidingWindow: keeps only the last CONTEXT_WINDOW messages per round
 *   - summarizeRResult: trims stdout/stderr before feeding back to the LLM
 *
 * Event flow per round: stream → onMessageDelta (content) + buffer tool_calls
 * → onMessageDone → dispatch each tool via the matching handler → push
 * role:"tool" result → next round. Final round injects a "wrap up" system
 * hint so the model doesn't try to call more tools.
 */

import {
  AGENT_TEMPERATURE,
  CONTEXT_WINDOW,
  HISTORY_TAIL,
  MAX_ROUNDS,
  SYSTEM_PROMPT,
  TOOLS,
} from "./config";
import { streamCompletion } from "./llm";
import type {
  AgentRunOptions,
  DatasetInfo,
  Message,
  ToolCall,
  ConversationTurn,
  RExecResult,
} from "./types";

type DatasetContext = {
  active_dataset?: DatasetInfo;
  other_datasets?: DatasetInfo[];
  conversation_history?: ConversationTurn[];
};

function buildDatasetContext(
  active?: DatasetInfo,
  others?: DatasetInfo[],
  history?: ConversationTurn[],
): DatasetContext {
  const ctx: DatasetContext = {};
  if (active) ctx.active_dataset = active;
  if (others && others.length > 0) ctx.other_datasets = others;
  if (history && history.length > 0) ctx.conversation_history = history.slice(-HISTORY_TAIL);
  return ctx;
}

function buildSystemMessage(ctx: DatasetContext, plan: string[] | null): string {
  const payload: Record<string, unknown> = {
    role: "data_assistant",
    instructions: SYSTEM_PROMPT,
    ...ctx,
  };
  if (plan) payload.active_plan = plan;
  return JSON.stringify(payload, null, 2);
}

function slidingWindow(messages: Message[]): Message[] {
  if (messages.length <= 2 + CONTEXT_WINDOW) return messages;
  return [messages[0], messages[1], ...messages.slice(-CONTEXT_WINDOW)];
}

function normalizeRCode(code: string): string {
  if (code.includes("\\n") && !code.includes("\n")) {
    return code.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"');
  }
  return code;
}

function summarizeRResult(result: RExecResult): string {
  if (result.success) {
    return result.stdout ? result.stdout.slice(0, 1000) : "Executed successfully.";
  }
  let error = result.error ?? "Unknown error";
  if (error.startsWith("Error: ")) error = error.slice(7);
  const stderr = (result.stderr ?? "").slice(0, 500);
  let text = `Error: ${error.slice(0, 1000)}`;
  if (stderr && stderr.trim() !== error.trim()) text += `\nStderr: ${stderr}`;
  return text;
}

export async function runAgent(options: AgentRunOptions): Promise<void> {
  const { apiKey, model, message, handlers, signal } = options;

  const datasetCtx = buildDatasetContext(
    options.datasetContext,
    options.otherDatasets,
    options.history,
  );
  let currentPlan: string[] | null = null;

  const messages: Message[] = [
    { role: "system", content: buildSystemMessage(datasetCtx, currentPlan) },
    { role: "user", content: message },
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (signal?.aborted) return;

    messages[0] = { role: "system", content: buildSystemMessage(datasetCtx, currentPlan) };

    // On the final round, nudge the LLM to wrap up with text.
    if (round === MAX_ROUNDS - 1) {
      messages.push({
        role: "system",
        content:
          "You have reached your last action. Do NOT call any tools. " +
          "Summarize what you've accomplished so far and what remains, " +
          "then ask the user if they'd like you to continue.",
      });
    }

    const trimmed = slidingWindow(messages);

    let fullContent = "";
    const toolCallBuffers = new Map<number, { id: string; name: string; arguments: string }>();
    let finishReason: string | null | undefined = null;

    const stream = streamCompletion({
      apiKey,
      model,
      messages: trimmed,
      tools: TOOLS,
      temperature: AGENT_TEMPERATURE,
      signal,
    });

    for await (const chunk of stream) {
      if (signal?.aborted) return;
      const choice = chunk.choices?.[0];
      const delta = choice?.delta;
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (!delta) continue;

      if (delta.content) {
        fullContent += delta.content;
        handlers.onMessageDelta(delta.content);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          let buf = toolCallBuffers.get(idx);
          if (!buf) {
            buf = { id: "", name: "", arguments: "" };
            toolCallBuffers.set(idx, buf);
          }
          if (tc.id) buf.id = tc.id;
          if (tc.function?.name) buf.name = tc.function.name;
          if (tc.function?.arguments) buf.arguments += tc.function.arguments;
        }
      }
    }

    if (fullContent) handlers.onMessageDone(fullContent);

    // Reconstruct tool calls in order.
    const toolCalls: ToolCall[] = [];
    const sortedIndices = Array.from(toolCallBuffers.keys()).sort((a, b) => a - b);
    for (const idx of sortedIndices) {
      const buf = toolCallBuffers.get(idx)!;
      toolCalls.push({
        id: buf.id,
        type: "function",
        function: { name: buf.name, arguments: buf.arguments },
      });
    }

    // Append assistant message to conversation history.
    const assistantMsg: Message = { role: "assistant" };
    if (fullContent) assistantMsg.content = fullContent;
    if (toolCalls.length > 0) assistantMsg.tool_calls = toolCalls;
    messages.push(assistantMsg);

    if (finishReason !== "tool_calls" || toolCalls.length === 0) return;

    for (const tc of toolCalls) {
      if (signal?.aborted) return;

      let args: Record<string, unknown> = {};
      try {
        let parsed = JSON.parse(tc.function.arguments || "{}");
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
        if (parsed && typeof parsed === "object") args = parsed as Record<string, unknown>;
      } catch {
        args = {};
      }

      const name = tc.function.name;

      if (name === "execute_r") {
        const code = normalizeRCode(String(args.code ?? ""));
        const description = String(args.description ?? "");
        let result: RExecResult;
        try {
          result = await handlers.onExecuteR({ code, description });
        } catch (e: unknown) {
          result = {
            success: false,
            stdout: "",
            stderr: "",
            error: e instanceof Error ? e.message : "R execution failed",
          };
        }
        if (result.updatedActiveDataset !== undefined) {
          datasetCtx.active_dataset = result.updatedActiveDataset;
        }
        if (result.updatedOtherDatasets !== undefined) {
          datasetCtx.other_datasets = result.updatedOtherDatasets;
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: summarizeRResult(result),
        });
      } else if (name === "plan") {
        const rawSteps = Array.isArray(args.steps) ? (args.steps as unknown[]) : [];
        const steps = rawSteps.map((s) =>
          typeof s === "string" ? s : (s as { description?: string })?.description ?? "",
        );
        currentPlan = steps;
        handlers.onPlan(steps);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: "Plan updated.",
        });
      } else if (name === "ask_user") {
        const question = String(args.question ?? "");
        let answer = "";
        try {
          answer = await handlers.onAskUser(question);
        } catch {
          answer = "";
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: answer ? `User answered: ${answer}` : "User did not respond.",
        });
      } else {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: `Error: unknown tool '${name}'.`,
        });
      }
    }
  }
}
