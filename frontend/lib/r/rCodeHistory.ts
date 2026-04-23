import { queryDuckDB, sanitizeValue } from "@/lib/db/duckdb";

export async function appendRCode(
  projectId: string,
  code: string,
  source: "agent" | "user"
): Promise<void> {
  const result = await queryDuckDB(
    `SELECT COALESCE(MAX(seq), -1) + 1 AS next_seq FROM _r_code_history WHERE project_id = ${sanitizeValue(projectId)}`
  );
  const nextSeq = Number(result.rows[0]?.[0] ?? 0);
  await queryDuckDB(
    `INSERT INTO _r_code_history (project_id, seq, code, source) VALUES (${sanitizeValue(projectId)}, ${nextSeq}, ${sanitizeValue(code)}, ${sanitizeValue(source)})`
  );
}

export interface RCodeEntry {
  seq: number;
  code: string;
  source: "agent" | "user";
}

export async function getRCodeHistory(projectId: string): Promise<RCodeEntry[]> {
  const result = await queryDuckDB(
    `SELECT seq, code, source FROM _r_code_history WHERE project_id = ${sanitizeValue(projectId)} ORDER BY seq`
  );
  return result.rows.map((row) => ({
    seq: Number(row[0]),
    code: String(row[1]),
    source: String(row[2]) as "agent" | "user",
  }));
}

export async function clearRCodeHistory(projectId: string): Promise<void> {
  await queryDuckDB(
    `DELETE FROM _r_code_history WHERE project_id = ${sanitizeValue(projectId)}`
  );
}
