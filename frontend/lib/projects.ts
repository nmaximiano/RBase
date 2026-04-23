import { queryDuckDB, dropTable, flushCheckpoint, sanitizeIdentifier, sanitizeValue } from "./db/duckdb";

export interface ProjectMeta {
  id: string;
  name: string;
  dataset_count: number;
  dataset_names: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  datasets: ProjectDataset[];
  created_at: string;
  updated_at: string;
}

export interface ProjectDataset {
  id: string;
  filename: string;
  columns: string[];
  row_count: number;
  file_size_bytes: number;
  display_order: number;
  r_name: string | null;
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function createProject(
  name: string,
  datasetIds: string[] = []
): Promise<string> {
  const id = generateId();
  const now = new Date().toISOString();

  await queryDuckDB(`
    INSERT INTO _projects (id, name, created_at, updated_at)
    VALUES (${sanitizeValue(id)}, ${sanitizeValue(name)}, ${sanitizeValue(now)}, ${sanitizeValue(now)})
  `);

  for (let i = 0; i < datasetIds.length; i++) {
    await queryDuckDB(`
      INSERT INTO _project_datasets (project_id, dataset_id, display_order)
      VALUES (${sanitizeValue(id)}, ${sanitizeValue(datasetIds[i])}, ${i})
    `);
  }

  return id;
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const result = await queryDuckDB(`
    SELECT
      s.id,
      s.name,
      s.created_at::VARCHAR as created_at,
      s.updated_at::VARCHAR as updated_at,
      COUNT(sd.dataset_id)::INTEGER as dataset_count,
      COALESCE(STRING_AGG(d.filename, ', ' ORDER BY sd.display_order), '') as dataset_names
    FROM _projects s
    LEFT JOIN _project_datasets sd ON s.id = sd.project_id
    LEFT JOIN _datasets d ON sd.dataset_id = d.id
    GROUP BY s.id, s.name, s.created_at, s.updated_at
    ORDER BY s.updated_at DESC
  `);

  return result.rows.map((row) => ({
    id: String(row[0]),
    name: String(row[1]),
    created_at: String(row[2]),
    updated_at: String(row[3]),
    dataset_count: Number(row[4]),
    dataset_names: String(row[5])
      .split(", ")
      .filter(Boolean),
  }));
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const sessionResult = await queryDuckDB(`
    SELECT id, name, created_at::VARCHAR as created_at, updated_at::VARCHAR as updated_at
    FROM _projects WHERE id = ${sanitizeValue(id)}
  `);

  if (sessionResult.rows.length === 0) return null;
  const row = sessionResult.rows[0];

  const datasetsResult = await queryDuckDB(`
    SELECT d.id, d.filename, d.columns, d.row_count, d.file_size_bytes, sd.display_order, sd.r_name
    FROM _project_datasets sd
    JOIN _datasets d ON sd.dataset_id = d.id
    WHERE sd.project_id = ${sanitizeValue(id)}
    ORDER BY sd.display_order
  `);

  const datasets: ProjectDataset[] = datasetsResult.rows.map((r) => ({
    id: String(r[0]),
    filename: String(r[1]),
    columns: Array.isArray(r[2]) ? (r[2] as string[]) : [],
    row_count: Number(r[3]),
    file_size_bytes: Number(r[4]),
    display_order: Number(r[5]),
    r_name: r[6] != null ? String(r[6]) : null,
  }));

  return {
    id: String(row[0]),
    name: String(row[1]),
    created_at: String(row[2]),
    updated_at: String(row[3]),
    datasets,
  };
}

export async function deleteProject(id: string): Promise<void> {
  // 1. Find all datasets + table names belonging to this session
  const safeId = sanitizeValue(id);
  const dsResult = await queryDuckDB(`
    SELECT d.id, d.table_name
    FROM _project_datasets sd
    JOIN _datasets d ON sd.dataset_id = d.id
    WHERE sd.project_id = ${safeId}
  `);

  // 2. Drop each dataset's DuckDB data table and _rview_ table, then delete metadata
  for (const row of dsResult.rows) {
    const datasetId = String(row[0]);
    const tableName = String(row[1]);
    await dropTable(tableName);
    // Also drop any view table created by the R environment
    const viewTable = `_rview_${datasetId.replace(/-/g, "_")}`;
    try { await queryDuckDB(`DROP TABLE IF EXISTS ${sanitizeIdentifier(viewTable)}`); } catch {}
    await queryDuckDB(`DELETE FROM _datasets WHERE id = ${sanitizeValue(datasetId)}`);
  }

  // 3. Clean up session-scoped auxiliary tables
  await queryDuckDB(`DELETE FROM _rdata_blobs WHERE project_id = ${safeId}`);
  await queryDuckDB(`DELETE FROM _r_code_history WHERE project_id = ${safeId}`);
  await queryDuckDB(`DELETE FROM _chat_history WHERE project_id = ${safeId}`);
  await queryDuckDB(`DELETE FROM _plot_store WHERE project_id = ${safeId}`);

  // 4. Delete join rows and session row
  await queryDuckDB(`DELETE FROM _project_datasets WHERE project_id = ${safeId}`);
  await queryDuckDB(`DELETE FROM _projects WHERE id = ${safeId}`);
}

export async function renameProject(
  id: string,
  newName: string
): Promise<void> {
  const now = new Date().toISOString();
  await queryDuckDB(`
    UPDATE _projects
    SET name = ${sanitizeValue(newName)}, updated_at = ${sanitizeValue(now)}
    WHERE id = ${sanitizeValue(id)}
  `);
}

export async function addDatasetToProject(
  projectId: string,
  datasetId: string,
  rName?: string
): Promise<void> {
  const maxOrderResult = await queryDuckDB(`
    SELECT COALESCE(MAX(display_order), -1)::INTEGER as max_order
    FROM _project_datasets WHERE project_id = ${sanitizeValue(projectId)}
  `);
  const maxOrder = Number(maxOrderResult.rows[0]?.[0] ?? -1);

  const rNameVal = rName ? sanitizeValue(rName) : "NULL";
  await queryDuckDB(`
    INSERT INTO _project_datasets (project_id, dataset_id, display_order, r_name)
    VALUES (${sanitizeValue(projectId)}, ${sanitizeValue(datasetId)}, ${maxOrder + 1}, ${rNameVal})
    ON CONFLICT DO NOTHING
  `);

  const now = new Date().toISOString();
  await queryDuckDB(
    `UPDATE _projects SET updated_at = ${sanitizeValue(now)} WHERE id = ${sanitizeValue(projectId)}`
  );
}

export async function removeDatasetFromProject(
  projectId: string,
  datasetId: string
): Promise<void> {
  await queryDuckDB(`
    DELETE FROM _project_datasets
    WHERE project_id = ${sanitizeValue(projectId)} AND dataset_id = ${sanitizeValue(datasetId)}
  `);

  const now = new Date().toISOString();
  await queryDuckDB(
    `UPDATE _projects SET updated_at = ${sanitizeValue(now)} WHERE id = ${sanitizeValue(projectId)}`
  );
}

export async function updateProjectDatasetRName(
  projectId: string,
  datasetId: string,
  rName: string
): Promise<void> {
  await queryDuckDB(`
    UPDATE _project_datasets
    SET r_name = ${sanitizeValue(rName)}
    WHERE project_id = ${sanitizeValue(projectId)} AND dataset_id = ${sanitizeValue(datasetId)}
  `);
  // Force immediate OPFS checkpoint so renames survive page reload
  await flushCheckpoint();
}

export async function touchProject(projectId: string): Promise<void> {
  const now = new Date().toISOString();
  await queryDuckDB(
    `UPDATE _projects SET updated_at = ${sanitizeValue(now)} WHERE id = ${sanitizeValue(projectId)}`
  );
}
