// Smoke test for the agent loop. Mocks global fetch with a minimal OpenAI-
// compatible SSE stream that returns plain content + finish_reason "stop"
// (no tool calls). Verifies runAgent exits after one round instead of
// infinite-looping. Does not exercise the tool-dispatch branches.

import { afterEach, describe, expect, it, vi } from "vitest";
import { runAgent } from "./agent";

function sseResponse(lines: string[]): Response {
  const body = lines.map((l) => `data: ${l}\n`).join("") + "data: [DONE]\n";
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runAgent", () => {
  it("terminates after one round when the stream has no tool calls", async () => {
    const chunk1 = JSON.stringify({
      choices: [{ delta: { content: "Hello there." }, finish_reason: null }],
    });
    const chunk2 = JSON.stringify({
      choices: [{ delta: {}, finish_reason: "stop" }],
    });

    const fetchMock = vi.fn(async () => sseResponse([chunk1, chunk2]));
    vi.stubGlobal("fetch", fetchMock);

    const deltas: string[] = [];
    let doneContent = "";

    await runAgent({
      apiKey: "test-key",
      model: "test/model",
      message: "hi",
      handlers: {
        onMessageDelta: (d) => deltas.push(d),
        onMessageDone: (c) => {
          doneContent = c;
        },
        onPlan: () => {},
        onExecuteR: async () => ({ success: true, stdout: "", stderr: "", error: null }),
        onAskUser: async () => "",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(deltas.join("")).toBe("Hello there.");
    expect(doneContent).toBe("Hello there.");
  });
});
