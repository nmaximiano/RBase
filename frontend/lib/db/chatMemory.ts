/**
 * Chat memory stored in DuckDB.
 * Keeps per-session conversation history for the agent.
 * The _chat_history table is created in initDuckDB().
 */
import { queryDuckDB, sanitizeValue } from "./duckdb";

export interface ChatTurn {
  user: string;
  assistant: string;
  r_code?: string[];
  plots?: string[]; // base64 data URLs for plot images produced during this turn
}

const MAX_TURNS = 20;

/** Get conversation history for a session. */
export async function getHistory(projectId: string): Promise<ChatTurn[]> {
  const result = await queryDuckDB(`
    SELECT user_msg, assistant_msg, r_code, plots
    FROM _chat_history
    WHERE project_id = ${sanitizeValue(projectId)}
    ORDER BY turn_index ASC
  `);
  return result.rows.map((row) => ({
    user: row[0] as string,
    assistant: row[1] as string,
    r_code: row[2] ? JSON.parse(row[2] as string) : undefined,
    plots: row[3] ? JSON.parse(row[3] as string) : undefined,
  }));
}

/** Append a turn to the session history. Trims to MAX_TURNS. */
export async function appendTurn(
  projectId: string,
  userMsg: string,
  assistantMsg: string,
  rCode?: string[],
  plots?: string[]
): Promise<void> {
  const safeSessionId = sanitizeValue(projectId);

  // Get next turn index
  const countResult = await queryDuckDB(`
    SELECT COALESCE(MAX(turn_index), -1) + 1 AS next_idx
    FROM _chat_history
    WHERE project_id = ${safeSessionId}
  `);
  const nextIdx = countResult.rows[0][0] as number;

  const safeUser = sanitizeValue(userMsg);
  const safeAssistant = sanitizeValue(assistantMsg);
  const rCodeJson = rCode ? sanitizeValue(JSON.stringify(rCode)) : "NULL";
  const plotsJson = plots && plots.length > 0 ? sanitizeValue(JSON.stringify(plots)) : "NULL";

  await queryDuckDB(`
    INSERT INTO _chat_history (project_id, turn_index, user_msg, assistant_msg, r_code, plots)
    VALUES (${safeSessionId}, ${nextIdx}, ${safeUser}, ${safeAssistant}, ${rCodeJson}, ${plotsJson})
  `);

  // Trim old turns beyond MAX_TURNS
  if (nextIdx >= MAX_TURNS) {
    const cutoff = nextIdx - MAX_TURNS + 1;
    await queryDuckDB(`
      DELETE FROM _chat_history
      WHERE project_id = ${safeSessionId} AND turn_index < ${cutoff}
    `);
  }
}

/** Clear history for a session. */
export async function clearHistory(projectId: string): Promise<void> {
  await queryDuckDB(`
    DELETE FROM _chat_history WHERE project_id = ${sanitizeValue(projectId)}
  `);
}
