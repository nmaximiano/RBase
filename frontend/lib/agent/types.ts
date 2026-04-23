// OpenAI-compatible message + tool types (OpenRouter uses the same shape).

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type Message =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface DatasetInfo {
  name: string;
  columns: string[];
  row_count: number;
}

export interface ConversationTurn {
  user: string;
  assistant: string;
  r_code?: string[];
}

export interface RExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
  updatedActiveDataset?: DatasetInfo;
  updatedOtherDatasets?: DatasetInfo[];
}

export interface AgentHandlers {
  onMessageDelta: (delta: string) => void;
  onMessageDone: (content: string) => void;
  onPlan: (steps: string[]) => void;
  onExecuteR: (args: { code: string; description: string }) => Promise<RExecResult>;
  onAskUser: (question: string) => Promise<string>;
  onError?: (message: string) => void;
}

export interface AgentRunOptions {
  apiKey: string;
  model: string;
  message: string;
  datasetContext?: DatasetInfo;
  otherDatasets?: DatasetInfo[];
  history?: ConversationTurn[];
  signal?: AbortSignal;
  handlers: AgentHandlers;
}
