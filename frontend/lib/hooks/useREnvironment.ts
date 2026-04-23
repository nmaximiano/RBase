"use client";

/**
 * Keeps three sources of truth in sync: the R runtime (via WebR), the
 * stable-id registry (`stableId → rName`), and the DuckDB `_rview_*`
 * view tables that back the data table UI.
 *
 * The registry is the authority on "which R object is this tab pointing
 * at?" Tabs identify frames by `stableId` (an identity that survives
 * renames), while R sees them by `rName`. `buildRegistry` reconciles
 * the two after every exec, and `persistRenames` writes changes through
 * to `_project_datasets.r_name` so they survive a reload.
 *
 * Key functions:
 *   - refreshEnv: called after every R exec; rebuilds the registry
 *   - resetEnv: nukes R state + clears code/blob/snapshot history
 *   - snapshotChanges: diffs env digests and writes changed object blobs
 *   - fetchObjectRows: materializes an R frame as a DuckDB view, then paginates
 *
 * Why snapshots: re-executing the whole code history to rebuild a
 * session is slow and fragile. We snapshot each changed object as a
 * `saveRDS` blob in `_rdata_blobs` (prefix `__snap__`) so reopening the
 * project is a batch `readRDS` instead of a replay. The code-history
 * path still exists as a legacy fallback for old sessions.
 */

import { useState, useRef, useEffect } from "react";
import { listREnvironment, getObjectSummary } from "@/lib/r/webr";
import { loadTableIntoR, saveRFrameToDuckDB } from "@/lib/r/bridge";
import { getTableRows as duckGetTableRows } from "@/lib/db/duckdb";
import * as localDatasets from "@/lib/datasets";
import * as localProjects from "@/lib/projects";
import {
  type ObjectRegistryEntry,
  type DatasetMeta,
  getViewTableName,
  buildRegistry,
  cleanRVarName,
} from "@/lib/r/registry";
import type { RowsResponse } from "@/lib/types";
import type { RuntimeStatus } from "@/lib/hooks/useRuntime";
import {
  type EnvDigest,
  digestEnv,
  diffDigests,
  syncChangedObjects,
  restoreSnapshotBlobs,
  hasSnapshotBlobs,
  clearSnapshotBlobs,
  markSnapshotEnabled,
} from "@/lib/r/envSnapshot";

interface UseREnvironmentParams {
  projectId: string;
  runtimeStatus: RuntimeStatus;
  projectDatasets: DatasetMeta[];
  projectDatasetsRef: React.MutableRefObject<DatasetMeta[]>;
  setProjectDatasets: React.Dispatch<React.SetStateAction<DatasetMeta[]>>;
  projectDataLoaded: boolean;
  activeStableId: string | null;
  setActiveStableId: React.Dispatch<React.SetStateAction<string | null>>;
  setError: (msg: string) => void;
  setRowsCache: React.Dispatch<React.SetStateAction<Record<string, RowsResponse>>>;
  setSortCol: React.Dispatch<React.SetStateAction<string | null>>;
  setSortDir: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
}

/** Wipe R global env and drop all _rview_ DuckDB tables. */
async function cleanRState() {
  try {
    const { evalR } = await import("@/lib/r/webr");
    await evalR(`rm(list = ls(envir = .GlobalEnv), envir = .GlobalEnv)`);
  } catch {}
  try {
    const { queryDuckDB } = await import("@/lib/db/duckdb");
    const tables = await queryDuckDB(
      `SELECT table_name FROM information_schema.tables WHERE table_name LIKE '_rview_%'`
    );
    for (const row of tables.rows) {
      try { await queryDuckDB(`DROP TABLE IF EXISTS "${row[0]}"`); } catch {}
    }
  } catch {}
}

/** Restore persisted .RData blobs into the R environment (user-uploaded only, not snapshots). */
async function loadRDataBlobs(projectId: string): Promise<void> {
  try {
    const { getRDataBlobs } = await import("@/lib/r/rdata");
    const blobs = await getRDataBlobs(projectId);
    // Filter out snapshot blobs; those are handled by restoreSnapshotBlobs
    const userBlobs = blobs.filter(b => !b.filename.startsWith("__snap__"));
    if (userBlobs.length > 0) {
      console.log(`[env-init] Reloading ${userBlobs.length} .RData blob(s)`);
      const webr = (await import("@/lib/r/webr")).getWebR();
      const { evalR } = await import("@/lib/r/webr");
      for (const { filename, blob } of userBlobs) {
        try {
          await webr!.FS.writeFile("/tmp/" + filename, blob);
          const ext = filename.split(".").pop()?.toLowerCase();
          if (ext === "rds") {
            const baseName = filename.replace(/\.rds$/i, "").replace(/[^a-zA-Z0-9_]/g, "_");
            await evalR(`${baseName} <- readRDS("/tmp/${filename}")`);
          } else {
            await evalR(`load("/tmp/${filename}")`);
          }
        } catch (e) {
          console.warn("[env-init] .RData blob reload failed:", filename, e);
        }
      }
    }
  } catch (e) {
    console.error("[env-init] .RData blob reload failed:", e);
  }
}

/** Load each session dataset from DuckDB into R as a data.frame. */
async function loadDatasetsIntoR(
  projectId: string,
  projectDatasets: DatasetMeta[],
): Promise<Map<string, string>> {
  const loadedRNames = new Map<string, string>();
  for (const ds of projectDatasets) {
    const tableName = await localDatasets.getDatasetTableName(ds.id);
    if (!tableName) continue;
    try {
      const rName = ds.r_name || cleanRVarName(ds.filename);
      console.log(`[env-init] Loading "${ds.filename}" as R var "${rName}"`);
      await loadTableIntoR(tableName, rName);
      loadedRNames.set(ds.id, rName);
      if (!ds.r_name) {
        await localProjects.updateProjectDatasetRName(projectId, ds.id, rName);
      }
    } catch (e) {
      console.error(`[env-init] Failed to load "${ds.filename}":`, e);
    }
  }
  return loadedRNames;
}

/** Re-execute saved R code history to restore derived objects (legacy fallback). */
async function replayRCodeHistory(projectId: string): Promise<void> {
  try {
    const { getRCodeHistory } = await import("@/lib/r/rCodeHistory");
    const history = await getRCodeHistory(projectId);
    if (history.length > 0) {
      console.log(`[env-init] Replaying ${history.length} R commands (legacy fallback)`);
      const { evalR } = await import("@/lib/r/webr");
      for (const entry of history) {
        try { await evalR(entry.code); } catch (e) {
          console.warn(`[env-init] Replay failed:`, entry.code.slice(0, 50), e);
        }
      }
    }
  } catch (e) {
    console.error("[env-init] R code replay failed:", e);
  }
}

/** Load .RData blobs, datasets, and restore R environment for a session. */
async function loadSessionIntoR(
  projectId: string,
  projectDatasets: DatasetMeta[],
): Promise<Map<string, string>> {
  let t = performance.now();
  await loadRDataBlobs(projectId);
  console.log(`[env-init]   loadRDataBlobs: ${(performance.now() - t).toFixed(0)}ms`);

  t = performance.now();
  const loadedRNames = await loadDatasetsIntoR(projectId, projectDatasets);
  console.log(`[env-init]   loadDatasetsIntoR: ${(performance.now() - t).toFixed(0)}ms`);

  // Prefer per-object snapshots; fall back to code replay for legacy sessions
  t = performance.now();
  const hasSnapshots = await hasSnapshotBlobs(projectId);
  console.log(`[env-init]   hasSnapshotBlobs: ${hasSnapshots} (${(performance.now() - t).toFixed(0)}ms)`);

  if (hasSnapshots) {
    t = performance.now();
    const restored = await restoreSnapshotBlobs(projectId);
    console.log(`[env-init]   restoreSnapshotBlobs: ${restored.length} object(s) in ${(performance.now() - t).toFixed(0)}ms`, restored);
  } else {
    t = performance.now();
    console.log("[env-init] No snapshots found, falling back to code replay");
    await replayRCodeHistory(projectId);
    console.log(`[env-init]   replayRCodeHistory: ${(performance.now() - t).toFixed(0)}ms`);
  }

  return loadedRNames;
}

export function useREnvironment({
  projectId,
  runtimeStatus,
  projectDatasets,
  projectDatasetsRef,
  setProjectDatasets,
  projectDataLoaded,
  activeStableId,
  setActiveStableId,
  setError,
  setRowsCache,
  setSortCol,
  setSortDir,
}: UseREnvironmentParams) {
  const [registry, setRegistry] = useState<Map<string, ObjectRegistryEntry>>(new Map());
  const [objectSummary, setObjectSummary] = useState<string | null>(null);
  const [envReady, setEnvReady] = useState(false);
  const syncedToView = useRef<Set<string>>(new Set());
  const envInitDone = useRef(false);
  const lastDigest = useRef<EnvDigest>(new Map());

  const registryRef = useRef(registry);
  registryRef.current = registry;

  // Derived convenience values
  const activeEntry = activeStableId ? registry.get(activeStableId) ?? null : null;
  const activeRName = activeEntry?.rName ?? null;
  const registryEntries = Array.from(registry.values());

  // ── Reset all env state when session changes ──
  const prevSessionId = useRef(projectId);
  useEffect(() => {
    if (prevSessionId.current === projectId) return;
    prevSessionId.current = projectId;
    envInitDone.current = false;
    syncedToView.current.clear();
    setRegistry(new Map());
    setEnvReady(false);
    setObjectSummary(null);
  }, [projectId]);

  // ── Initialize R environment once runtime + session data are ready ──
  useEffect(() => {
    if (runtimeStatus !== "ready" || !projectDataLoaded || envInitDone.current) return;
    envInitDone.current = true;
    console.log("[env-init] Starting for session", projectId, "with", projectDatasets.length, "datasets");

    (async () => {
      const t0 = performance.now();

      // Always clean R state first; prevents leaking objects across sessions
      await cleanRState();
      syncedToView.current.clear();
      console.log(`[env-init] cleanRState: ${(performance.now() - t0).toFixed(0)}ms`);

      // Load this session's data into R
      const t1 = performance.now();
      const loadedRNames = await loadSessionIntoR(projectId, projectDatasets);
      console.log(`[env-init] loadSessionIntoR: ${(performance.now() - t1).toFixed(0)}ms`);

      // Sync r_name back to state if any were auto-generated
      if (loadedRNames.size > 0) {
        const updatedDsList = projectDatasets.map(d => {
          const loaded = loadedRNames.get(d.id);
          return loaded && loaded !== d.r_name ? { ...d, r_name: loaded } : d;
        });
        setProjectDatasets(updatedDsList);
        projectDatasetsRef.current = updatedDsList;
      }

      // Build registry from current R environment
      const t2 = performance.now();
      const objs = await listREnvironment();
      console.log(`[env-init] listREnvironment: ${(performance.now() - t2).toFixed(0)}ms`);
      console.log("[env-init] R env after init:", objs.map(o => `${o.name}(${o.isDataFrame ? "df" : o.class})`));
      const newRegistry = buildRegistry(objs, projectDatasetsRef.current, new Map());
      setRegistry(newRegistry);

      // Capture initial digest so future diffs start from the right baseline
      const t3 = performance.now();
      lastDigest.current = await digestEnv();
      console.log(`[env-init] digestEnv: ${(performance.now() - t3).toFixed(0)}ms`);

      // Mark this session as using the snapshot system (prevents replay fallback)
      const t4 = performance.now();
      markSnapshotEnabled(projectId);
      console.log(`[env-init] TOTAL: ${(performance.now() - t0).toFixed(0)}ms`);

      // Always default to the script tab. Users asked for a
      // predictable entry point regardless of what's in the env.
      if (!activeStableId) {
        setActiveStableId("__script__");
      }

      setEnvReady(true);
    })();
  }, [runtimeStatus, projectDataLoaded, projectId]);

  /**
   * Diff the R environment against the last known state and persist
   * only the objects that changed (added/modified/removed).
   */
  async function snapshotChanges() {
    try {
      const current = await digestEnv();
      const diff = diffDigests(lastDigest.current, current);
      const hasChanges = diff.added.length > 0 || diff.modified.length > 0 || diff.removed.length > 0;
      if (hasChanges) {
        console.log("[env-snapshot] Changes detected:", {
          added: diff.added,
          modified: diff.modified,
          removed: diff.removed,
        });
        await syncChangedObjects(projectId, diff);
      }
      lastDigest.current = current;
    } catch (e) {
      console.warn("[env-snapshot] Snapshot failed:", e);
    }
  }

  async function refreshEnv() {
    if (runtimeStatus !== "ready") return new Map<string, ObjectRegistryEntry>();
    const objs = await listREnvironment();
    console.log("[refreshEnv] Objects:", objs.map(o => `${o.name}(${o.isDataFrame ? `df:${o.nrow}x${o.ncol}` : o.class})`));
    const newReg = buildRegistry(objs, projectDatasetsRef.current, registryRef.current);
    setRegistry(newReg);
    return newReg;
  }

  async function fetchObjectRows(
    stableId: string,
    rName: string,
    pg: number,
    pp: number,
    sc?: string,
    sd?: "asc" | "desc"
  ) {
    try {
      const viewTable = getViewTableName(stableId);
      if (!syncedToView.current.has(stableId)) {
        await saveRFrameToDuckDB(rName, viewTable);
        syncedToView.current.add(stableId);
      }
      try {
        const rows = await duckGetTableRows(viewTable, pg, pp, sc, sd);
        setRowsCache((prev) => ({ ...prev, [stableId]: rows as unknown as RowsResponse }));
      } catch (queryErr: any) {
        const msg = queryErr.message || "";
        if (/does not exist/i.test(msg)) {
          syncedToView.current.delete(stableId);
          await saveRFrameToDuckDB(rName, viewTable);
          syncedToView.current.add(stableId);
          const rows = await duckGetTableRows(viewTable, pg, pp, sc, sd);
          setRowsCache((prev) => ({ ...prev, [stableId]: rows as unknown as RowsResponse }));
        } else if (sc && /not found|Binder Error/i.test(msg)) {
          setSortCol(null);
          setSortDir("asc");
          const rows = await duckGetTableRows(viewTable, pg, pp);
          setRowsCache((prev) => ({ ...prev, [stableId]: rows as unknown as RowsResponse }));
        } else {
          throw queryErr;
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to load object data");
    }
  }

  async function handleObjectTabClick(stableId: string) {
    setActiveStableId(stableId);
    setObjectSummary(null);
    const entry = registry.get(stableId);
    if (!entry) return;
    if (entry.isDataFrame) {
      await fetchObjectRows(stableId, entry.rName, 1, 50);
    } else {
      const summary = await getObjectSummary(entry.rName);
      setObjectSummary(summary);
    }
  }

  async function resetEnv() {
    setEnvReady(false);

    // Clear persisted R code history + .RData blobs + snapshots + console
    try { const { clearRCodeHistory } = await import("@/lib/r/rCodeHistory"); await clearRCodeHistory(projectId); } catch {}
    try { const { clearRDataBlobs } = await import("@/lib/r/rdata"); await clearRDataBlobs(projectId); } catch {}
    try { await clearSnapshotBlobs(projectId); } catch {}
    try { localStorage.removeItem(`rconsole_${projectId}`); localStorage.removeItem(`rconsole_${projectId}_cmds`); } catch {}

    // Wipe R state and reload datasets (without code replay)
    await cleanRState();
    syncedToView.current.clear();

    const loadedRNames = new Map<string, string>();
    for (const ds of projectDatasetsRef.current) {
      const tableName = await localDatasets.getDatasetTableName(ds.id);
      if (!tableName) continue;
      try {
        const rName = ds.r_name || cleanRVarName(ds.filename);
        await loadTableIntoR(tableName, rName);
        loadedRNames.set(ds.id, rName);
      } catch (e) {
        console.error(`[resetEnv] Failed to load "${ds.filename}":`, e);
      }
    }

    const objs = await listREnvironment();
    const newRegistry = buildRegistry(objs, projectDatasetsRef.current, new Map());
    setRegistry(newRegistry);

    setActiveStableId("__script__");

    lastDigest.current = await digestEnv();
    envInitDone.current = true;
    setEnvReady(true);
  }

  return {
    registry, setRegistry, registryRef,
    objectSummary,
    activeEntry, activeRName, registryEntries,
    syncedToView, envInitDone, envReady,
    refreshEnv, fetchObjectRows, handleObjectTabClick, resetEnv, snapshotChanges,
  };
}
