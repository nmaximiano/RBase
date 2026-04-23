import { queryDuckDB, sanitizeValue } from "@/lib/db/duckdb";

export async function getPreference(key: string): Promise<string | null> {
  const result = await queryDuckDB(
    `SELECT value FROM _user_preferences WHERE key = ${sanitizeValue(key)}`
  );
  return result.rows.length > 0 ? String(result.rows[0][0]) : null;
}

export async function setPreference(key: string, value: string): Promise<void> {
  await queryDuckDB(
    `INSERT INTO _user_preferences (key, value) VALUES (${sanitizeValue(key)}, ${sanitizeValue(value)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
  );
}
