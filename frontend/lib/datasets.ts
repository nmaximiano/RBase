import {
  queryDuckDB,
  importCSV as duckImportCSV,
  importParquet as duckImportParquet,
  dropTable,
  sanitizeValue,
} from "./db/duckdb";

export interface Dataset {
  id: string;
  filename: string;
  columns: string[];
  row_count: number;
  file_size_bytes: number;
  created_at: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

function sanitizeTableName(filename: string, id: string): string {
  // Use id-based table name to avoid collisions
  return `ds_${id.replace(/-/g, "_")}`;
}

export async function createDataset(
  filename: string,
  bytes: Uint8Array
): Promise<Dataset> {
  const id = generateId();
  const tableName = sanitizeTableName(filename, id);

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const { columns, rowCount } = ext === "parquet"
    ? await duckImportParquet(tableName, bytes)
    : await duckImportCSV(tableName, bytes);

  const now = new Date().toISOString();

  await queryDuckDB(`
    INSERT INTO _datasets (id, table_name, filename, columns, row_count, file_size_bytes, created_at)
    VALUES (
      ${sanitizeValue(id)},
      ${sanitizeValue(tableName)},
      ${sanitizeValue(filename)},
      ${columns.length > 0 ? `['${columns.join("','")}']` : "'[]'"},
      ${rowCount},
      ${bytes.byteLength},
      ${sanitizeValue(now)}
    )
  `);

  return {
    id,
    filename,
    columns,
    row_count: rowCount,
    file_size_bytes: bytes.byteLength,
    created_at: now,
  };
}

export async function deleteDataset(id: string): Promise<void> {
  // Get table name first
  const result = await queryDuckDB(
    `SELECT table_name FROM _datasets WHERE id = ${sanitizeValue(id)}`
  );
  if (result.rows.length > 0) {
    const tableName = String(result.rows[0][0]);
    await dropTable(tableName);
  }

  // Remove from session_datasets
  await queryDuckDB(
    `DELETE FROM _project_datasets WHERE dataset_id = ${sanitizeValue(id)}`
  );

  // Remove metadata
  await queryDuckDB(`DELETE FROM _datasets WHERE id = ${sanitizeValue(id)}`);
}

export async function getDatasetTableName(id: string): Promise<string | null> {
  const result = await queryDuckDB(
    `SELECT table_name FROM _datasets WHERE id = ${sanitizeValue(id)}`
  );
  if (result.rows.length === 0) return null;
  return String(result.rows[0][0]);
}

/**
 * Create a dataset entry pointing to an already-existing DuckDB table
 * (e.g. one created by saveRFrameToDuckDB from an .RData upload).
 */
export async function createDatasetFromRFrame(
  name: string,
  tableName: string,
  columns: string[],
  rowCount: number
): Promise<Dataset> {
  const id = generateId();
  const now = new Date().toISOString();
  const colsArray =
    columns.length > 0 ? `['${columns.join("','")}']` : "ARRAY[]::VARCHAR[]";

  await queryDuckDB(`
    INSERT INTO _datasets (id, table_name, filename, columns, row_count, file_size_bytes, created_at)
    VALUES (
      ${sanitizeValue(id)},
      ${sanitizeValue(tableName)},
      ${sanitizeValue(name)},
      ${colsArray},
      ${rowCount},
      0,
      ${sanitizeValue(now)}
    )
  `);

  return {
    id,
    filename: name,
    columns,
    row_count: rowCount,
    file_size_bytes: 0,
    created_at: now,
  };
}
