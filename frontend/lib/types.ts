export type { ObjectRegistryEntry, DatasetMeta } from "@/lib/r/registry";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "plan" | "plot";
  text: string;
  time: Date;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolStatus?: "running" | "completed";
  progress?: number;
  planSteps?: string[];
  planActive?: boolean;
  imageSrc?: string;
  askId?: string;
  askQuestion?: string;
  answered?: boolean;
  isStreaming?: boolean;
}

export interface RowsResponse {
  columns: string[];
  rows: any[][];
  total: number;
  page: number;
  per_page: number;
}

let _msgId = Date.now();
export function nextMsgId() { return `msg-${++_msgId}`; }
