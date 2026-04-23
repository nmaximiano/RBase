import { queryDuckDB, sanitizeValue } from "@/lib/db/duckdb";

export async function getScript(projectId: string): Promise<string> {
  const result = await queryDuckDB(
    `SELECT content FROM _r_scripts WHERE project_id = ${sanitizeValue(projectId)}`
  );
  if (result.rows.length > 0) return String(result.rows[0][0]);
  return "";
}

export async function saveScript(projectId: string, content: string): Promise<void> {
  const sid = sanitizeValue(projectId);
  const val = sanitizeValue(content);
  await queryDuckDB(
    `INSERT OR REPLACE INTO _r_scripts (project_id, content, updated_at)
     VALUES (${sid}, ${val}, current_timestamp)`
  );
}
