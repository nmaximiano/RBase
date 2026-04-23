/**
 * Adapter between React chat UI state and the agent loop in lib/agent.
 *
 * `runAgent` knows nothing about React; it just calls handler callbacks.
 * This hook builds those handlers by closing over the UI setters
 * (`queueMessage`, `setMessages`, `setIsTyping`) and the R-environment
 * hooks (`refreshEnv`, `fetchObjectRows`, registry refs). Anything
 * app-wide that a chat turn should flip (typing indicator, error
 * banners, streaming bubble lifecycle, plan card) is wired here, not
 * inside the agent.
 *
 * Key functions:
 *   - handleSendMessage: one chat turn: gather context, call runAgent, persist
 *   - handleStopChat: aborts the in-flight fetch and unblocks ask_user
 *   - handleAgentAnswer: the user's reply to an ask_user question
 *   - executeRCode: runs code through WebR, captures plots, writes code history
 *   - reconcileRegistryAfterExec: rebuilds the stableId→rName map and view tables
 *
 * `ask_user` uses a pending Promise stored in `pendingAsk` that the next
 * user message resolves. Abort rejects it with an empty answer. After
 * every `execute_r`, the registry is re-diffed so renames/removals
 * propagate to tabs and DuckDB view tables in a single atomic-ish step.
 */

import { type MutableRefObject, type Dispatch, type SetStateAction, useRef } from "react";
import { type ChatMessage, nextMsgId } from "@/lib/types";
import { type ObjectRegistryEntry, getViewTableName, buildRegistry, persistRenames } from "@/lib/r/registry";
import { execAndSync } from "@/lib/r/bridge";
import * as chatMemory from "@/lib/db/chatMemory";
import * as localProjects from "@/lib/projects";
import { runAgent } from "@/lib/agent/agent";
import { DEFAULT_MODEL } from "@/lib/agent/config";
import type { DatasetInfo, RExecResult } from "@/lib/agent/types";
import { getKey } from "@/lib/key/keyStore";
import type { RConsoleHandle } from "@/components/RConsole";

export interface UseAgentExecutionDeps {
  projectId: string;
  activeStableId: string | null;
  activeRName: string | null;
  runtimeStatus: string;

  registry: Map<string, ObjectRegistryEntry>;
  registryEntries: ObjectRegistryEntry[];
  registryRef: MutableRefObject<Map<string, ObjectRegistryEntry>>;
  projectDatasetsRef: MutableRefObject<any[]>;

  queueMessage: (fn: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  abortRef: MutableRefObject<AbortController | null>;
  isTyping: boolean;

  refreshEnv: () => Promise<Map<string, ObjectRegistryEntry>>;
  fetchObjectRows: (stableId: string, rName: string, page: number, perPage: number, sortCol?: string, sortDir?: "asc" | "desc") => Promise<void>;
  syncedToView: MutableRefObject<Set<string>>;
  setRegistry: Dispatch<SetStateAction<Map<string, ObjectRegistryEntry>>>;
  setSortCol: Dispatch<SetStateAction<string | null>>;
  setSortDir: Dispatch<SetStateAction<"asc" | "desc">>;
  setPage: Dispatch<SetStateAction<number>>;
  setProjectDatasets: Dispatch<SetStateAction<any[]>>;
  setActiveStableId: Dispatch<SetStateAction<string | null>>;

  addPlots: (images: ImageBitmap[], source: "agent" | "user", code?: string) => void;
  consoleRef: MutableRefObject<RConsoleHandle | null>;

  snapshotChanges: () => void;

  selectedModel: string | null;
}

export function useAgentExecution(deps: UseAgentExecutionDeps) {
  const {
    projectId, activeStableId, activeRName, runtimeStatus,
    registry, registryEntries, registryRef, projectDatasetsRef,
    queueMessage, setMessages, setIsTyping, abortRef, isTyping,
    refreshEnv, fetchObjectRows, syncedToView, setRegistry,
    setSortCol, setSortDir, setPage, setProjectDatasets, setActiveStableId,
    addPlots, consoleRef, snapshotChanges,
    selectedModel,
  } = deps;

  // Outstanding ask_user promise, resolved by handleAgentAnswer.
  const pendingAsk = useRef<{ askId: string; resolve: (answer: string) => void } | null>(null);

  async function gatherDatasetContext(): Promise<{ active?: DatasetInfo; others: DatasetInfo[] }> {
    const others: DatasetInfo[] = [];
    let active: DatasetInfo | undefined;
    if (runtimeStatus !== "ready") return { others };
    const { evalR } = await import("@/lib/r/webr");
    for (const entry of registryEntries) {
      if (!entry.isDataFrame) continue;
      let columns: string[] = [];
      try {
        columns = (await evalR(`cat(paste(colnames(${entry.rName}), collapse="\\t"))`))
          .stdout.split("\t").filter(Boolean);
      } catch {}
      const info: DatasetInfo = { name: entry.rName, columns, row_count: entry.nrow ?? 0 };
      if (entry.stableId === activeStableId) active = info;
      else others.push(info);
    }
    return { active, others };
  }

  async function executeRCode(code: string): Promise<{ result: RExecResult; plotDataUrls: string[] }> {
    if (runtimeStatus !== "ready") {
      return {
        result: { success: false, stdout: "", stderr: "", error: "Runtime not ready" },
        plotDataUrls: [],
      };
    }
    const viewTable = activeStableId ? getViewTableName(activeStableId) : null;
    let r: { stdout: string; stderr: string; error: string | null; images?: ImageBitmap[] };
    if (viewTable && activeRName) {
      r = await execAndSync(code, viewTable, activeRName);
    } else {
      const { evalR } = await import("@/lib/r/webr");
      const direct = await evalR(code);
      r = { stdout: direct.stdout, stderr: direct.stderr, error: direct.error, images: direct.images };
    }

    const plotDataUrls: string[] = [];
    if (r.images && r.images.length > 0 && !r.error) {
      addPlots(r.images, "agent", code);
      for (const img of r.images) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          plotDataUrls.push(dataUrl);
          queueMessage((prev) => [...prev, { id: nextMsgId(), role: "plot", text: "", time: new Date(), imageSrc: dataUrl }]);
        } catch {}
      }
    }

    consoleRef.current?.appendAgentCommand(code, r.error || r.stderr || r.stdout || "OK");

    if (!r.error) {
      try {
        const { appendRCode } = await import("@/lib/r/rCodeHistory");
        await appendRCode(projectId, code, "agent");
      } catch {}
    }

    return {
      result: { success: !r.error, stdout: r.stdout, stderr: r.stderr, error: r.error },
      plotDataUrls,
    };
  }

  async function reconcileRegistryAfterExec(preExec: Map<string, ObjectRegistryEntry>) {
    const updatedActive: { info?: DatasetInfo } = {};
    const updatedOthers: DatasetInfo[] = [];
    try {
      const { listREnvironment: listEnv, evalR: evalRLocal } = await import("@/lib/r/webr");
      setSortCol(null);
      setSortDir("asc");
      setPage(1);
      syncedToView.current.clear();
      const newRegistry = buildRegistry(await listEnv(), projectDatasetsRef.current as any, preExec);
      setRegistry(newRegistry);

      for (const entry of newRegistry.values()) {
        if (!entry.isDataFrame) continue;
        let cols: string[] = [];
        try {
          cols = (await evalRLocal(`cat(paste(colnames(${entry.rName}), collapse="\\t"))`))
            .stdout.split("\t").filter(Boolean);
        } catch {}
        const info: DatasetInfo = { name: entry.rName, columns: cols, row_count: entry.nrow ?? 0 };
        if (entry.stableId === activeStableId) updatedActive.info = info;
        else updatedOthers.push(info);
      }

      await persistRenames(projectId, newRegistry, preExec, setProjectDatasets as any);

      for (const [stableId, oldEntry] of preExec) {
        if (!newRegistry.has(stableId)) {
          try {
            const { queryDuckDB } = await import("@/lib/db/duckdb");
            await queryDuckDB(`DROP TABLE IF EXISTS "${getViewTableName(stableId)}"`);
          } catch {}
          if (oldEntry.datasetId) {
            try {
              await localProjects.removeDatasetFromProject(projectId, oldEntry.datasetId);
              setProjectDatasets((prev) => prev.filter((d) => d.id !== oldEntry.datasetId));
            } catch {}
          }
        }
      }

      if (activeStableId === "__script__") {
        // Script tab: leave it alone
      } else if (activeStableId && !newRegistry.has(activeStableId)) {
        const fb = Array.from(newRegistry.values()).find(e => e.isDataFrame);
        setActiveStableId(fb?.stableId ?? null);
        if (fb) await fetchObjectRows(fb.stableId, fb.rName, 1, 50);
      } else if (activeStableId && newRegistry.has(activeStableId)) {
        const e = newRegistry.get(activeStableId)!;
        if (e.isDataFrame) await fetchObjectRows(activeStableId, e.rName, 1, 50);
      }
      snapshotChanges();
      return { updatedActive: updatedActive.info, updatedOthers, newRegistry };
    } catch {
      syncedToView.current.clear();
      await refreshEnv();
      snapshotChanges();
      return { updatedActive: undefined, updatedOthers: [], newRegistry: preExec };
    }
  }

  async function handleSendMessage(text: string) {
    if (!text || isTyping) return;
    const apiKey = getKey();
    if (!apiKey) {
      setMessages((prev) => [...prev, {
        id: nextMsgId(),
        role: "assistant",
        text: "Please connect your OpenRouter key to start chatting.",
        time: new Date(),
      }]);
      return;
    }

    const userMsg: ChatMessage = { id: nextMsgId(), role: "user", text, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const abort = new AbortController();
    abortRef.current = abort;

    const assistantParts: string[] = [];
    const rCodeParts: string[] = [];
    const plotDataUrls: string[] = [];
    let streamingMsgId: string | null = null;
    let preExecRegistry = new Map(registry);

    try {
      const { active, others } = await gatherDatasetContext();
      const history = (await chatMemory.getHistory(projectId)).map(({ user, assistant, r_code }) => ({ user, assistant, r_code }));

      await runAgent({
        apiKey,
        model: selectedModel || DEFAULT_MODEL,
        message: text,
        datasetContext: active,
        otherDatasets: others,
        history,
        signal: abort.signal,
        handlers: {
          onMessageDelta: (delta) => {
            if (!streamingMsgId) {
              streamingMsgId = nextMsgId();
              const sid = streamingMsgId;
              queueMessage((prev) => [...prev, { id: sid, role: "assistant", text: delta, time: new Date(), isStreaming: true }]);
            } else {
              const sid = streamingMsgId;
              queueMessage((prev) => prev.map((m) => m.id === sid ? { ...m, text: m.text + delta } : m));
            }
          },
          onMessageDone: (content) => {
            if (streamingMsgId) {
              const sid = streamingMsgId;
              queueMessage((prev) => prev.map((m) => m.id === sid ? { ...m, text: content, isStreaming: false } : m));
              streamingMsgId = null;
            } else {
              queueMessage((prev) => [...prev, { id: nextMsgId(), role: "assistant", text: content, time: new Date() }]);
            }
            assistantParts.push(content);
          },
          onPlan: (steps) => {
            queueMessage((prev) => {
              const existing = prev.find((m) => m.role === "plan");
              return existing
                ? prev.map((m) => m === existing ? { ...m, planSteps: steps, planActive: true } : m)
                : [...prev, { id: nextMsgId(), role: "plan", text: "", time: new Date(), planSteps: steps, planActive: true }];
            });
          },
          onExecuteR: async ({ code }) => {
            rCodeParts.push(code);
            queueMessage((prev) => [...prev, {
              id: nextMsgId(),
              role: "tool",
              text: "",
              toolName: "R code",
              toolArgs: { code: code.length > 200 ? code.slice(0, 200) + "..." : code },
              toolStatus: "running",
              time: new Date(),
            }]);

            const { result, plotDataUrls: newPlots } = await executeRCode(code);
            plotDataUrls.push(...newPlots);

            // Mark the running tool card as complete.
            queueMessage((prev) => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === "tool" && updated[i].toolStatus === "running") {
                  updated[i] = {
                    ...updated[i],
                    toolStatus: "completed",
                    text: result.success ? (result.stdout || "Executed successfully.") : `Error: ${result.error}`,
                  };
                  break;
                }
              }
              return updated;
            });

            const { updatedActive, updatedOthers, newRegistry } = await reconcileRegistryAfterExec(preExecRegistry);
            preExecRegistry = newRegistry;

            return {
              ...result,
              updatedActiveDataset: updatedActive,
              updatedOtherDatasets: updatedOthers,
            };
          },
          onAskUser: (question) => new Promise<string>((resolve) => {
            const askId = `ask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            pendingAsk.current = { askId, resolve };
            queueMessage((prev) => [...prev, {
              id: nextMsgId(),
              role: "assistant",
              text: question,
              time: new Date(),
              askId,
              askQuestion: question,
              answered: false,
            }]);
          }),
        },
      });

      // Clear any still-streaming flag + fade out plan.
      if (streamingMsgId) {
        const sid = streamingMsgId;
        queueMessage((prev) => prev.map((m) => m.id === sid ? { ...m, isStreaming: false } : m));
      }
      queueMessage((prev) => prev.map((m) => m.role === "plan" && m.planActive ? { ...m, planActive: false } : m));

      const fullAssistant = assistantParts.join("\n\n");
      if (fullAssistant) {
        chatMemory.appendTurn(
          projectId,
          text,
          fullAssistant,
          rCodeParts.length > 0 ? rCodeParts : undefined,
          plotDataUrls.length > 0 ? plotDataUrls : undefined,
        );
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        const msg = err?.message || "Something went wrong.";
        setMessages((prev) => [...prev, { id: nextMsgId(), role: "assistant", text: msg, time: new Date() }]);
      }
    } finally {
      abortRef.current = null;
      setIsTyping(false);
      if (runtimeStatus === "ready") {
        syncedToView.current.clear();
        await refreshEnv();
        snapshotChanges();
      }
    }
  }

  function handleStopChat() {
    abortRef.current?.abort();
    // If the agent was waiting on ask_user, unblock it with empty answer.
    if (pendingAsk.current) {
      pendingAsk.current.resolve("");
      pendingAsk.current = null;
    }
  }

  async function handleAgentAnswer(askId: string, answer: string) {
    setMessages((prev) => [
      ...prev.map((m) => m.askId === askId ? { ...m, answered: true } : m),
      { id: nextMsgId(), role: "user", text: answer, time: new Date() },
    ]);
    if (pendingAsk.current?.askId === askId) {
      pendingAsk.current.resolve(answer);
      pendingAsk.current = null;
    }
  }

  return {
    handleSendMessage,
    handleAgentAnswer,
    handleStopChat,
  };
}
