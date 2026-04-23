import { queryDuckDB, sanitizeValue } from "@/lib/db/duckdb";
import { evalR, getWebR } from "./webr";

// ── Environment Digest ──────────────────────────────────────────────
// A lightweight fingerprint of each object in R's global env.
// Used to diff before/after a command to detect what changed.

export interface ObjectDigest {
  name: string;
  class: string;
  size: number;       // object.size() in bytes
  nrow?: number;
  ncol?: number;
}

export type EnvDigest = Map<string, ObjectDigest>;

/**
 * Snapshot the current R global environment: object names, classes, sizes,
 * and dimensions. Cheap to compute: no serialization.
 */
export async function digestEnv(): Promise<EnvDigest> {
  const result = await evalR(
    `local({
      objs <- ls(envir = .GlobalEnv)
      objs <- objs[!grepl("^(csv_out|tmp|\\\\.)$", objs)]
      if (length(objs) > 0) {
        for (nm in objs) {
          obj <- get(nm, envir = .GlobalEnv)
          if (is.function(obj)) next
          cls <- class(obj)[1]
          sz <- as.numeric(object.size(obj))
          isdf <- is.data.frame(obj)
          nr <- if (isdf) nrow(obj) else NA
          nc <- if (isdf) ncol(obj) else NA
          cat(nm, "\\t", cls, "\\t", sz, "\\t", nr, "\\t", nc, "\\n", sep="")
        }
      }
    })`
  );

  const digest: EnvDigest = new Map();
  if (result.error || !result.stdout.trim()) return digest;

  for (const line of result.stdout.trim().split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    digest.set(parts[0], {
      name: parts[0],
      class: parts[1],
      size: parseFloat(parts[2]) || 0,
      nrow: parts[3] !== "NA" ? parseInt(parts[3]) : undefined,
      ncol: parts[4] !== "NA" ? parseInt(parts[4]) : undefined,
    });
  }
  return digest;
}

/**
 * Diff two environment digests. Returns lists of object names that
 * were added, modified, or removed.
 */
export function diffDigests(
  before: EnvDigest,
  after: EnvDigest,
): { added: string[]; modified: string[]; removed: string[] } {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  for (const [name, afterObj] of after) {
    const beforeObj = before.get(name);
    if (!beforeObj) {
      added.push(name);
    } else if (
      beforeObj.size !== afterObj.size ||
      beforeObj.class !== afterObj.class ||
      beforeObj.nrow !== afterObj.nrow ||
      beforeObj.ncol !== afterObj.ncol
    ) {
      modified.push(name);
    }
  }

  for (const name of before.keys()) {
    if (!after.has(name)) {
      removed.push(name);
    }
  }

  return { added, modified, removed };
}

// ── Per-object RDS blob persistence ─────────────────────────────────

/** Filename prefix to distinguish snapshot blobs from user-uploaded .RData files. */
const SNAPSHOT_PREFIX = "__snap__";

function snapFilename(objName: string): string {
  return `${SNAPSHOT_PREFIX}${objName}.rds`;
}

function isSnapshotFilename(filename: string): boolean {
  return filename.startsWith(SNAPSHOT_PREFIX) && filename.endsWith(".rds");
}

function objNameFromSnapshotFilename(filename: string): string {
  return filename.slice(SNAPSHOT_PREFIX.length, -4); // strip prefix and .rds
}

/**
 * Save a single R object as an .rds blob in DuckDB.
 */
export async function saveObjectBlob(
  projectId: string,
  objName: string,
): Promise<void> {
  const webr = getWebR();
  if (!webr) throw new Error("WebR not initialized");

  const filename = snapFilename(objName);
  const tmpPath = `/tmp/${filename}`;

  // saveRDS in R, then read the bytes from WebR's VFS
  await evalR(`saveRDS(\`${objName}\`, "${tmpPath}")`);
  const bytes = await webr.FS.readFile(tmpPath);

  // Store in DuckDB as a blob
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await queryDuckDB(
    `INSERT OR REPLACE INTO _rdata_blobs (project_id, filename, blob)
     VALUES (${sanitizeValue(projectId)}, ${sanitizeValue(filename)}, '\\x${hex}'::BLOB)`
  );

  // Clean up temp file
  try { await evalR(`unlink("${tmpPath}")`); } catch {}
}

/**
 * Delete the snapshot blob for a single R object.
 */
export async function deleteObjectBlob(
  projectId: string,
  objName: string,
): Promise<void> {
  const filename = snapFilename(objName);
  await queryDuckDB(
    `DELETE FROM _rdata_blobs WHERE project_id = ${sanitizeValue(projectId)} AND filename = ${sanitizeValue(filename)}`
  );
}

/**
 * Delete all snapshot blobs for a session (preserves user-uploaded .RData files).
 */
export async function clearSnapshotBlobs(projectId: string): Promise<void> {
  await queryDuckDB(
    `DELETE FROM _rdata_blobs WHERE project_id = ${sanitizeValue(projectId)} AND filename LIKE '${SNAPSHOT_PREFIX}%'`
  );
}

/**
 * Restore all snapshot blobs into R's global environment via readRDS.
 * Returns the list of object names that were restored.
 */
export async function restoreSnapshotBlobs(projectId: string): Promise<string[]> {
  const webr = getWebR();
  if (!webr) return [];

  const result = await queryDuckDB(
    `SELECT filename, blob FROM _rdata_blobs WHERE project_id = ${sanitizeValue(projectId)} AND filename LIKE '${SNAPSHOT_PREFIX}%' ORDER BY created_at`
  );

  const restored: string[] = [];
  for (const row of result.rows) {
    const filename = String(row[0]);
    if (!isSnapshotFilename(filename) || filename === SNAPSHOT_SENTINEL) continue;
    const objName = objNameFromSnapshotFilename(filename);
    const blob = row[1] instanceof Uint8Array ? row[1] : new Uint8Array(row[1] as ArrayBuffer);

    try {
      const tmpPath = `/tmp/${filename}`;
      await webr.FS.writeFile(tmpPath, blob);
      await evalR(`\`${objName}\` <- readRDS("${tmpPath}")`);
      try { await evalR(`unlink("${tmpPath}")`); } catch {}
      restored.push(objName);
    } catch (e) {
      console.warn(`[env-snapshot] Failed to restore "${objName}":`, e);
    }
  }

  return restored;
}

/** Sentinel filename that marks a session as using the snapshot system. */
const SNAPSHOT_SENTINEL = `${SNAPSHOT_PREFIX}__init__.rds`;

/**
 * Mark a session as using the snapshot system.
 * Prevents fallback to code replay on sessions with no object changes.
 */
export async function markSnapshotEnabled(projectId: string): Promise<void> {
  // Store a tiny sentinel blob (single NULL value serialized)
  const webr = getWebR();
  if (!webr) return;
  const tmpPath = `/tmp/${SNAPSHOT_SENTINEL}`;
  await evalR(`saveRDS(NULL, "${tmpPath}")`);
  const bytes = await webr.FS.readFile(tmpPath);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await queryDuckDB(
    `INSERT OR REPLACE INTO _rdata_blobs (project_id, filename, blob)
     VALUES (${sanitizeValue(projectId)}, ${sanitizeValue(SNAPSHOT_SENTINEL)}, '\\x${hex}'::BLOB)`
  );
  try { await evalR(`unlink("${tmpPath}")`); } catch {}
}

/**
 * Check if a session uses the snapshot system (to decide replay fallback).
 */
export async function hasSnapshotBlobs(projectId: string): Promise<boolean> {
  const result = await queryDuckDB(
    `SELECT COUNT(*) FROM _rdata_blobs WHERE project_id = ${sanitizeValue(projectId)} AND filename LIKE '${SNAPSHOT_PREFIX}%'`
  );
  return Number(result.rows[0]?.[0] ?? 0) > 0;
}

// ── Incremental sync ────────────────────────────────────────────────

/**
 * Given a diff of changed objects, persist only what changed.
 * Saves added/modified objects sequentially (WebR is single-threaded),
 * deletes removed blobs in parallel (DuckDB only, no R needed).
 */
export async function syncChangedObjects(
  projectId: string,
  diff: { added: string[]; modified: string[]; removed: string[] },
): Promise<void> {
  const toSave = [...diff.added, ...diff.modified];
  const toDelete = diff.removed;

  // Deletes are pure DuckDB; fire them all at once
  const deleteOps = toDelete.map((name) =>
    deleteObjectBlob(projectId, name).catch((e) =>
      console.warn(`[env-snapshot] Failed to delete blob "${name}":`, e)
    )
  );

  // Saves go through WebR (single-threaded); must be sequential
  for (const name of toSave) {
    try {
      await saveObjectBlob(projectId, name);
    } catch (e) {
      console.warn(`[env-snapshot] Failed to save "${name}":`, e);
    }
  }

  await Promise.all(deleteOps);
}
