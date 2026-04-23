/**
 * Persistent plot storage backed by DuckDB.
 * Stores sidebar plot images (base64 data URLs) per session.
 */
import { queryDuckDB, sanitizeValue } from "./duckdb";
import type { StoredPlot } from "@/lib/hooks/usePlotStore";

/** Load all plots for a session, ordered by timestamp. */
export async function getPlots(projectId: string): Promise<StoredPlot[]> {
  const result = await queryDuckDB(`
    SELECT plot_id, data_url, source, timestamp, code
    FROM _plot_store
    WHERE project_id = ${sanitizeValue(projectId)}
    ORDER BY timestamp ASC
  `);
  return result.rows.map((row) => ({
    id: row[0] as string,
    dataUrl: row[1] as string,
    source: row[2] as "user" | "agent",
    timestamp: row[3] as number,
    code: (row[4] as string) || undefined,
  }));
}

/** Persist one or more plots for a session. */
export async function savePlots(
  projectId: string,
  plots: StoredPlot[]
): Promise<void> {
  for (const p of plots) {
    const escapedCode = p.code ? sanitizeValue(p.code) : "NULL";
    await queryDuckDB(`
      INSERT OR REPLACE INTO _plot_store (project_id, plot_id, data_url, source, timestamp, code)
      VALUES (${sanitizeValue(projectId)}, ${sanitizeValue(p.id)}, ${sanitizeValue(p.dataUrl)}, ${sanitizeValue(p.source)}, ${p.timestamp}, ${escapedCode})
    `);
  }
}

/** Delete a single plot for a session. */
export async function deletePlot(projectId: string, plotId: string): Promise<void> {
  await queryDuckDB(`DELETE FROM _plot_store WHERE project_id = ${sanitizeValue(projectId)} AND plot_id = ${sanitizeValue(plotId)}`);
}

/** Clear all plots for a session. */
export async function clearPlots(projectId: string): Promise<void> {
  await queryDuckDB(`DELETE FROM _plot_store WHERE project_id = ${sanitizeValue(projectId)}`);
}
