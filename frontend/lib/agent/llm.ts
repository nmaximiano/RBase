import { OPENROUTER_BASE_URL } from "./config";
import type { Message, ToolDefinition } from "./types";

export interface StreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export interface StreamOptions {
  apiKey: string;
  model: string;
  messages: Message[];
  tools: ToolDefinition[];
  temperature?: number;
  signal?: AbortSignal;
}

export async function* streamCompletion(opts: StreamOptions): AsyncGenerator<StreamChunk> {
  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "RBase",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      tools: opts.tools,
      temperature: opts.temperature ?? 0.5,
      stream: true,
      stream_options: { include_usage: true },
      provider: { sort: "latency" },
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${text || res.statusText}`);
  }
  if (!res.body) throw new Error("OpenRouter returned no response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line || line.startsWith(":")) continue; // empty or SSE comment
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          yield JSON.parse(payload) as StreamChunk;
        } catch {
          // skip malformed chunk
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}
