"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useRuntime } from "@/lib/hooks/useRuntime";
import RuntimeToast from "@/components/RuntimeToast";
import { useResizablePanel } from "@/lib/hooks/useResizablePanel";
import { useLeftSidebar } from "@/lib/hooks/useLeftSidebar";
import { usePlotStore } from "@/lib/hooks/usePlotStore";
import { useDataTable } from "@/lib/hooks/useDataTable";
import { useProjectData } from "@/lib/hooks/useProjectData";
import { useREnvironment } from "@/lib/hooks/useREnvironment";
import { useAgentChat } from "@/lib/hooks/useAgentChat";
import { useScript } from "@/lib/hooks/useScript";
import { ProjectSkeleton } from "@/components/skeletons";
import * as localDatasets from "@/lib/datasets";
import * as localProjects from "@/lib/projects";
import { loadTableIntoR, saveRFrameToDuckDB } from "@/lib/r/bridge";
import { listREnvironment } from "@/lib/r/webr";
import {
  getViewTableName,
  buildRegistry,
  cleanRVarName,
  persistRenames,
} from "@/lib/r/registry";
import type { RConsoleHandle } from "@/components/RConsole";
import { LeftSidebar } from "@/components/project/LeftSidebar";
import ProjectToolbar from "@/components/project/ProjectToolbar";
import { DataPanel } from "@/components/project/DataPanel";
import { ChatPanel } from "@/components/project/ChatPanel";
import { SCRIPT_TAB_ID } from "@/components/project/TabBar";
import { useAgentExecution } from "@/lib/hooks/useAgentExecution";
import { flushCheckpoint, isOpfsFallback } from "@/lib/db/duckdb";
import { takePendingUploads } from "@/lib/pendingUploads";
import { getPreference, setPreference } from "@/lib/db/preferences";
import { MODEL_OPTIONS, DEFAULT_MODEL } from "@/lib/models";

const LOCAL_USER_ID = "local";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params.id as string;
  const consoleRef = useRef<RConsoleHandle>(null);

  const { status: runtimeStatus, progress: runtimeProgress, duckdbReady } = useRuntime(LOCAL_USER_ID);

  // Flush DuckDB WAL before page unload to prevent chat history loss
  useEffect(() => {
    const handler = () => { flushCheckpoint(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Storage warnings
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [opfsFallback, setOpfsFallback] = useState(false);
  useEffect(() => {
    if (isOpfsFallback()) setOpfsFallback(true);
    const quotaHandler = (e: Event) => setStorageWarning((e as CustomEvent).detail);
    const fallbackHandler = () => setOpfsFallback(true);
    window.addEventListener("duckdb-storage-error", quotaHandler);
    window.addEventListener("duckdb-opfs-fallback", fallbackHandler);
    return () => {
      window.removeEventListener("duckdb-storage-error", quotaHandler);
      window.removeEventListener("duckdb-opfs-fallback", fallbackHandler);
    };
  }, []);

  // Project data (local-only session loading and dataset CRUD)
  const projectData = useProjectData(projectId, duckdbReady);
  const {
    projectName,
    projectDatasets, setProjectDatasets, projectDatasetsRef,
    activeDatasetId, setActiveDatasetId,
    loading, error, setError,
    isRenamingProject, setIsRenamingProject,
    projectRenameValue, setProjectRenameValue,
    projectRenameRef, handleProjectRename,
    fetchProjectLocal,
  } = projectData;

  // Shared active object ID used by R env and data table. Defaults to the
  // Script tab so the tab strip shows a selected tab during env setup,
  // matching the skeleton and avoiding a "no tabs" flash.
  const [activeStableId, setActiveStableId] = useState<string | null>(SCRIPT_TAB_ID);

  const dataTable = useDataTable(activeStableId, duckdbReady);
  const {
    rowsCache, setRowsCache,
    page, setPage, perPage, sortCol, setSortCol, sortDir, setSortDir,
    activeCell, setActiveCell,
    tableRef, rowsData, refetchRef,
    handleSort, handlePerPageChange, handleKeyDown,
    totalRows, totalPages, startRow, endRow, activeCellValue,
    resetPagination,
  } = dataTable;

  const rEnv = useREnvironment({
    projectId, runtimeStatus,
    projectDatasets, projectDatasetsRef, setProjectDatasets,
    projectDataLoaded: !loading,
    activeStableId, setActiveStableId,
    setError, setRowsCache, setSortCol, setSortDir,
  });
  const {
    registry, setRegistry, registryRef,
    objectSummary,
    activeEntry, activeRName, registryEntries,
    syncedToView, envInitDone, envReady,
    refreshEnv, fetchObjectRows, handleObjectTabClick, resetEnv, snapshotChanges,
  } = rEnv;

  const chat = useAgentChat(projectId, duckdbReady);
  const {
    messages, setMessages,
    isTyping, setIsTyping,
    messagesEndRef, abortRef,
    queueMessage,
    handleClearChat,
  } = chat;

  // Model selection
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

  useEffect(() => {
    if (!duckdbReady) return;
    getPreference("agent_model")
      .then((val) => {
        if (val && MODEL_OPTIONS.some((m) => m.id === val)) setSelectedModel(val);
      })
      .catch(() => {});
  }, [duckdbReady]);

  function handleModelChange(modelId: string) {
    if (!MODEL_OPTIONS.some((m) => m.id === modelId)) return;
    setSelectedModel(modelId);
    setPreference("agent_model", modelId).catch(() => {});
  }

  // Left sidebar
  const sidebar = useLeftSidebar();
  const { plots, addPlots, removePlot, clearPlots } = usePlotStore(projectId, duckdbReady);
  const script = useScript(projectId, duckdbReady);

  // Console resize
  const CONSOLE_MIN = 140;
  const CONSOLE_MAX = 600;
  const CONSOLE_DEFAULT = 420;
  const [consoleHeight, setConsoleHeight] = useState(CONSOLE_DEFAULT);
  const isDraggingConsole = useRef(false);
  const consoleDragStartY = useRef(0);
  const consoleDragStartH = useRef(0);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDraggingConsole.current) return;
      const delta = consoleDragStartY.current - e.clientY;
      setConsoleHeight(Math.min(CONSOLE_MAX, Math.max(CONSOLE_MIN, consoleDragStartH.current + delta)));
    }
    function onMouseUp() {
      if (!isDraggingConsole.current) return;
      isDraggingConsole.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function handleConsoleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    isDraggingConsole.current = true;
    consoleDragStartY.current = e.clientY;
    consoleDragStartH.current = consoleHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }

  // Upload modal
  const [showAddDataset, setShowAddDataset] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [uploadingInModal, setUploadingInModal] = useState(false);
  const [modalDragging, setModalDragging] = useState(false);
  const modalFileRef = useRef<HTMLInputElement>(null);
  const modalDragCounter = useRef(0);

  function handleOpenAddDataset() {
    setUploadingInModal(false);
    setModalDragging(false);
    modalDragCounter.current = 0;
    setShowAddDataset(true);
  }

  // Right panel resize
  const { panelWidth, handlePanelDragStart } = useResizablePanel();

  // Wire data table refetch callback
  refetchRef.current = (args) => {
    const entry = registry.get(args.activeStableId);
    if (entry?.isDataFrame) {
      fetchObjectRows(args.activeStableId, entry.rName, args.page, args.perPage, args.sortCol, args.sortDir);
    }
  };

  async function handleRemoveDataset(e: React.MouseEvent, datasetId: string) {
    e.stopPropagation();
    try {
      await localProjects.removeDatasetFromProject(projectId, datasetId);
      await localDatasets.deleteDataset(datasetId);
      setProjectDatasets((prev) => prev.filter((d) => d.id !== datasetId));
      setRowsCache((prev) => {
        const next = { ...prev };
        delete next[datasetId];
        return next;
      });
      if (activeDatasetId === datasetId) {
        const remaining = projectDatasets.filter((d) => d.id !== datasetId);
        setActiveDatasetId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (e) {
      console.error("[session] handleRemoveDataset failed:", e);
    }
  }

  const MAX_FILE_SIZE = 500 * 1024 * 1024;

  async function finalizeUpload(activeId?: string, activeRName?: string) {
    envInitDone.current = true;
    await fetchProjectLocal();
    syncedToView.current.clear();
    const newReg = buildRegistry(
      await listREnvironment(),
      projectDatasetsRef.current,
      registryRef.current,
    );
    setRegistry(newReg);
    if (activeId && activeRName) {
      setActiveStableId(activeId);
      setSortCol(null);
      setSortDir("asc");
      setPage(1);
      await fetchObjectRows(activeId, activeRName, 1, 50);
    }
    setShowAddDataset(false);
    return newReg;
  }

  async function handleModalUpload(file: File) {
    if (uploadingInModal) return;
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (["csv", "tsv", "parquet"].includes(ext)) {
      // DuckDB flow: falls through below
    } else if (ext === "dta") {
      setUploadingInModal(true);
      try {
        if (runtimeStatus !== "ready") { setError("R environment is not ready yet."); setUploadingInModal(false); return; }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const webr = (await import("@/lib/r/webr")).getWebR();
        const { evalR } = await import("@/lib/r/webr");
        if (!webr) throw new Error("WebR not initialized");
        await webr.installPackages(["haven"], { quiet: true });
        await webr.FS.writeFile("/tmp/" + file.name, bytes);
        const rName = cleanRVarName(file.name);
        const readResult = await evalR(`library(haven); ${rName} <- as.data.frame(read_dta("/tmp/${file.name}"))`);
        if (readResult.error) throw new Error(readResult.error);
        const labelsRName = `${rName}_labels`;
        await evalR(`{ .labs <- sapply(${rName}, function(x) { l <- attr(x, "label"); if (is.null(l)) NA_character_ else l }); if (any(!is.na(.labs))) { ${labelsRName} <- data.frame(variable = names(.labs), label = unname(.labs), stringsAsFactors = FALSE) }; rm(.labs) }`);
        const colNames = (await evalR(`cat(paste(colnames(${rName}), collapse="\\t"))`)).stdout.split("\t").filter(Boolean);
        const rowCount = parseInt((await evalR(`cat(nrow(${rName}))`)).stdout || "0", 10);
        const tableName = `ds_${crypto.randomUUID().replace(/-/g, "_")}`;
        await saveRFrameToDuckDB(rName, tableName);
        const { createDatasetFromRFrame } = await import("@/lib/datasets");
        const ds = await createDatasetFromRFrame(rName, tableName, colNames, rowCount);
        await localProjects.addDatasetToProject(projectId, ds.id, rName);
        const hasLabels = await evalR(`cat(exists("${labelsRName}"))`);
        if (hasLabels.stdout?.trim() === "TRUE") {
          const labelsTable = `ds_${crypto.randomUUID().replace(/-/g, "_")}`;
          await saveRFrameToDuckDB(labelsRName, labelsTable);
          const labelsCols = (await evalR(`cat(paste(colnames(${labelsRName}), collapse="\\t"))`)).stdout.split("\t").filter(Boolean);
          const labelsRowCount = parseInt((await evalR(`cat(nrow(${labelsRName}))`)).stdout || "0", 10);
          const labelsDs = await createDatasetFromRFrame(labelsRName, labelsTable, labelsCols, labelsRowCount);
          await localProjects.addDatasetToProject(projectId, labelsDs.id, labelsRName);
        }
        await finalizeUpload(ds.id, rName);
      } catch (e: any) { setError(e.message || "Stata upload failed"); } finally { setUploadingInModal(false); }
      return;
    } else if (["rdata", "rda", "rds"].includes(ext)) {
      setUploadingInModal(true);
      try {
        if (runtimeStatus !== "ready") { setError("R environment is not ready yet."); setUploadingInModal(false); return; }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { storeRDataBlob } = await import("@/lib/r/rdata");
        await storeRDataBlob(projectId, file.name, bytes);
        const webr = (await import("@/lib/r/webr")).getWebR();
        const { evalR } = await import("@/lib/r/webr");
        if (!webr) throw new Error("WebR not initialized");
        await webr.FS.writeFile("/tmp/" + file.name, bytes);
        let loadedNames: string[] = [];
        if (ext === "rds") {
          const baseName = file.name.replace(/\.rds$/i, "").replace(/[^a-zA-Z0-9_]/g, "_");
          const rdsResult = await evalR(`${baseName} <- readRDS("/tmp/${file.name}")`);
          if (rdsResult.error) throw new Error(rdsResult.error);
          loadedNames = [baseName];
        } else {
          const loadResult = await evalR(`cat(load("/tmp/${file.name}"), sep="\\t")`);
          if (loadResult.error) throw new Error(loadResult.error);
          loadedNames = (loadResult.stdout || "").split("\t").filter(Boolean);
        }
        if (loadedNames.length === 0) { setError("No objects found in the uploaded file"); setUploadingInModal(false); return; }
        const afterObjs = await listREnvironment();
        const newDataFrames = afterObjs.filter((o) => o.isDataFrame && new Set(loadedNames).has(o.name));
        if (newDataFrames.length === 0) { setError("No data.frames found in the uploaded file"); setUploadingInModal(false); return; }
        const dfNames = new Set(newDataFrames.map((o) => o.name));
        const junkNames = loadedNames.filter((n) => !dfNames.has(n));
        if (junkNames.length > 0) await evalR(`rm(${junkNames.map((n) => `\`${n}\``).join(", ")}, envir = .GlobalEnv)`);
        const { createDatasetFromRFrame } = await import("@/lib/datasets");
        const usedRNames = new Set(projectDatasetsRef.current.map((d) => d.r_name).filter(Boolean));
        for (const df of newDataFrames) {
          try {
            let rName = df.name;
            if (usedRNames.has(rName)) { let n = 2; while (usedRNames.has(`${df.name}_${n}`)) n++; rName = `${df.name}_${n}`; await evalR(`\`${rName}\` <- \`${df.name}\``); }
            usedRNames.add(rName);
            const tableName = `ds_${crypto.randomUUID().replace(/-/g, "_")}`;
            await saveRFrameToDuckDB(rName, tableName);
            const colNames = df.ncol ? (await evalR(`cat(paste(colnames(${rName}), collapse="\\t"))`)).stdout.split("\t").filter(Boolean) : [];
            const ds = await createDatasetFromRFrame(rName, tableName, colNames, df.nrow ?? 0);
            await localProjects.addDatasetToProject(projectId, ds.id, rName);
          } catch (e) { console.error(`[upload] Failed to sync data.frame "${df.name}":`, e); }
        }
        const newReg = await finalizeUpload();
        let firstSyncedEntry: { stableId: string; rName: string } | null = null;
        for (const [, entry] of newReg) {
          if (entry.isDataFrame) {
            try {
              await saveRFrameToDuckDB(entry.rName, getViewTableName(entry.stableId));
              syncedToView.current.add(entry.stableId);
              if (!firstSyncedEntry) firstSyncedEntry = entry;
            } catch {}
          }
        }
        if (firstSyncedEntry) {
          setActiveStableId(firstSyncedEntry.stableId);
          setSortCol(null);
          setSortDir("asc");
          setPage(1);
          await fetchObjectRows(firstSyncedEntry.stableId, firstSyncedEntry.rName, 1, 50);
        }
      } catch (e: any) { setError(e.message || "RData upload failed"); } finally { setUploadingInModal(false); }
      return;
    } else {
      setError("Supported formats: CSV, TSV, Parquet, Stata (.dta), RData");
      return;
    }

    // DuckDB-based upload (CSV, TSV, Parquet)
    setUploadingInModal(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ds = await localDatasets.createDataset(file.name, bytes);
      await localProjects.addDatasetToProject(projectId, ds.id);
      if (runtimeStatus === "ready") {
        const tableName = await localDatasets.getDatasetTableName(ds.id);
        if (tableName) {
          try {
            const cleanName = cleanRVarName(file.name);
            await loadTableIntoR(tableName, cleanName);
            await localProjects.updateProjectDatasetRName(projectId, ds.id, cleanName);
            setProjectDatasets((prev) => prev.map((d) => d.id === ds.id ? { ...d, r_name: cleanName } : d));
            await finalizeUpload(ds.id, cleanName);
          } catch (e) { console.error("[upload] Failed to load into R:", e); }
        }
      } else {
        await finalizeUpload();
      }
    } catch (e: any) { setError(e.message || "Upload failed"); setUploadingInModal(false); }
  }

  async function handleAddDataset(datasetId: string) {
    try {
      await localProjects.addDatasetToProject(projectId, datasetId);
      envInitDone.current = true;
      await fetchProjectLocal();
      setActiveDatasetId(datasetId);
    } catch (e) { console.error("[session] handleAddExistingDataset failed:", e); }
    setShowAddDataset(false);
  }

  // Process files deferred from the dashboard
  const pendingUploadsProcessed = useRef(false);
  useEffect(() => {
    if (pendingUploadsProcessed.current || runtimeStatus !== "ready" || loading) return;
    const files = takePendingUploads(projectId);
    if (files.length === 0) { pendingUploadsProcessed.current = true; return; }
    pendingUploadsProcessed.current = true;
    (async () => { for (const file of files) await handleModalUpload(file); })();
  }, [runtimeStatus, loading, projectId]);

  // Agent execution (in-browser agent, R execution, registry reconciliation)
  const { handleSendMessage, handleAgentAnswer, handleStopChat } = useAgentExecution({
    projectId, activeStableId, activeRName, runtimeStatus,
    registry, registryEntries, registryRef, projectDatasetsRef,
    queueMessage, setMessages, setIsTyping, abortRef, isTyping,
    refreshEnv, fetchObjectRows, syncedToView, setRegistry,
    setSortCol, setSortDir, setPage, setProjectDatasets, setActiveStableId,
    addPlots, consoleRef, snapshotChanges,
    selectedModel,
  });

  const handleSendMessageCb = useCallback((text: string) => handleSendMessage(text), [activeStableId, activeEntry, isTyping, projectId, registry]);

  const handleConsoleDataChanged = useCallback(async () => {
    syncedToView.current.clear();
    const prevReg = registryRef.current;
    const newReg = await refreshEnv();
    await persistRenames(projectId, newReg, prevReg, setProjectDatasets);
    for (const [, oldEntry] of prevReg) { if (!newReg.has(oldEntry.stableId) && oldEntry.datasetId) { try { await localProjects.removeDatasetFromProject(projectId, oldEntry.datasetId); setProjectDatasets((prev) => prev.filter((d) => d.id !== oldEntry.datasetId)); } catch {} } }
    if (activeStableId === SCRIPT_TAB_ID) {
      // Script tab is active; don't switch away, just refresh in background
    } else if (activeStableId && newReg.has(activeStableId)) { const e = newReg.get(activeStableId); if (e?.isDataFrame) await fetchObjectRows(activeStableId, e.rName, page, perPage, sortCol ?? undefined, sortDir); }
    else if (activeStableId && !newReg.has(activeStableId)) { const fb = Array.from(newReg.values()).find(e => e.isDataFrame); setActiveStableId(fb?.stableId ?? null); if (fb) await fetchObjectRows(fb.stableId, fb.rName, 1, 50); }
    // Persist changed objects to per-object snapshots (non-blocking)
    snapshotChanges();
  }, [activeStableId, page, perPage, sortCol, sortDir, projectId]);

  const handleConsoleCodeExecuted = useCallback(async (code: string) => {
    try { const { appendRCode } = await import("@/lib/r/rCodeHistory"); await appendRCode(projectId, code, "user"); } catch {}
  }, [projectId]);

  // Script editor: run code in the console
  const handleScriptRunCode = useCallback(async (code: string) => {
    if (runtimeStatus !== "ready" || !code.trim()) return;
    const { evalR } = await import("@/lib/r/webr");
    const result = await evalR(code);
    const output = [result.stdout, result.stderr, result.error].filter(Boolean).join("\n") || "OK";
    consoleRef.current?.appendCommand(code, output, "user");
    if (result.images && result.images.length > 0 && !result.error) {
      addPlots(result.images, "user", code);
    }
    try { const { appendRCode } = await import("@/lib/r/rCodeHistory"); await appendRCode(projectId, code, "user"); } catch {}
    await handleConsoleDataChanged();
  }, [runtimeStatus, projectId, handleConsoleDataChanged, addPlots]);

  const handleScriptRunAll = useCallback(() => {
    if (script.content.trim()) handleScriptRunCode(script.content.trim());
  }, [script.content, handleScriptRunCode]);

  // Wrap tab click to handle script tab vs R object tabs
  const handleTabClick = useCallback((stableId: string) => {
    if (stableId === SCRIPT_TAB_ID) {
      setActiveStableId(SCRIPT_TAB_ID);
    } else {
      handleObjectTabClick(stableId);
    }
  }, [handleObjectTabClick, setActiveStableId]);

  const handleDownloadCsv = useCallback(async () => {
    if (!activeStableId || !activeRName) return;
    try {
      await saveRFrameToDuckDB(activeRName, getViewTableName(activeStableId));
      const { queryDuckDB } = await import("@/lib/db/duckdb");
      const result = await queryDuckDB(`SELECT * FROM "${getViewTableName(activeStableId)}"`);
      const csv = [result.columns.join(","), ...result.rows.map((row) => row.map((v) => { if (v == null) return ""; const s = String(v); return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s; }).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${activeRName}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message || "Download failed"); }
  }, [activeStableId, activeRName]);

  // Unified banner: show the most relevant active message. Error >
  // storage warning > opfs fallback, ordered by how much the user
  // should care right now. Declared before the early-return so the
  // hook order is stable across renders.
  const banner = useMemo<
    | { kind: "error" | "warning" | "info"; text: string; onDismiss: () => void }
    | null
  >(() => {
    if (error) return { kind: "error", text: error, onDismiss: () => setError("") };
    if (storageWarning)
      return { kind: "warning", text: storageWarning, onDismiss: () => setStorageWarning(null) };
    if (opfsFallback)
      return {
        kind: "info",
        text: "RBase is open in another tab. Projects created here won't be saved.",
        onDismiss: () => setOpfsFallback(false),
      };
    return null;
  }, [error, storageWarning, opfsFallback, setError]);

  if (loading && !error) {
    return (
      <>
        <ProjectSkeleton />
        <RuntimeToast status={runtimeStatus} progress={runtimeProgress} duckdbReady={duckdbReady} />
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface-alt overflow-hidden">
      {banner && (
        <div
          className={`shrink-0 flex items-center gap-3 px-6 py-2 text-xs border-b border-border ${
            banner.kind === "error"
              ? "bg-error-bg text-error"
              : "bg-surface-alt/60 text-text-secondary"
          }`}
        >
          <span>{banner.text}</span>
          <button
            onClick={banner.onDismiss}
            className={`ml-auto transition-colors cursor-pointer ${
              banner.kind === "error"
                ? "text-error hover:opacity-70"
                : "text-text-muted hover:text-text"
            }`}
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {showAddDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowAddDataset(false); }}>
          <div className="bg-surface border border-border shadow-xl w-full max-w-md mx-4 overflow-hidden"
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); modalDragCounter.current++; if (e.dataTransfer.types.includes("Files")) setModalDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); modalDragCounter.current--; if (modalDragCounter.current === 0) setModalDragging(false); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); modalDragCounter.current = 0; setModalDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleModalUpload(f); }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-text">Upload dataset</h3>
              <button onClick={() => setShowAddDataset(false)} className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-alt transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 pb-5">
              <div className={`relative border border-dashed px-3 py-2.5 text-center transition-colors ${modalDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}>
                {uploadingInModal ? (
                  <div className="flex items-center justify-center gap-2"><div className="h-3.5 w-3.5 border-[1.5px] border-accent border-t-transparent animate-spin rounded-full" /><span className="text-[11px] font-medium text-text-muted">Uploading...</span></div>
                ) : (
                  <p className="text-[11px] text-text-muted">Drop a file here, or <button onClick={() => modalFileRef.current?.click()} className="text-accent hover:text-accent-hover font-medium underline underline-offset-2">browse</button></p>
                )}
                <input ref={modalFileRef} type="file" accept=".csv,.tsv,.parquet,.dta,.rdata,.rda,.rds" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleModalUpload(f); }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowResetConfirm(false); }}>
          <div className="bg-surface border border-border shadow-xl w-full max-w-sm mx-4 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="shrink-0 w-9 h-9 bg-error/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              </div>
              <div><h3 className="text-sm font-semibold text-text">Reset R environment?</h3><p className="text-xs text-text-muted mt-0.5">This cannot be undone.</p></div>
            </div>
            <p className="text-[13px] text-text-secondary mb-4">All transformations, computed variables, and console history will be lost.</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer">Cancel</button>
              <button onClick={() => { setShowResetConfirm(false); resetEnv(); consoleRef.current?.clearHistory(); handleClearChat(); clearPlots(); setSortCol(null); setSortDir("asc"); setPage(1); setActiveCell(null); setError(""); }} className="px-4 py-2 text-sm font-medium text-white bg-error hover:bg-error/85 transition-colors cursor-pointer">Reset environment</button>
            </div>
          </div>
        </div>
      )}

      <ProjectToolbar
        projectName={projectName}
        isRenaming={isRenamingProject}
        setIsRenaming={setIsRenamingProject}
        renameValue={projectRenameValue}
        setRenameValue={setProjectRenameValue}
        renameRef={projectRenameRef}
        onRename={handleProjectRename}
        activeEntry={activeEntry}
        onClearConsole={() => consoleRef.current?.clearHistory()}
        onResetAgent={() => { handleStopChat(); handleClearChat(); }}
        onResetEnv={() => setShowResetConfirm(true)}
      />

      <div className="flex-1 flex flex-row overflow-hidden">
        <LeftSidebar
          activeTab={sidebar.activeTab}
          sidebarWidth={sidebar.sidebarWidth}
          onToggleTab={sidebar.toggleTab}
          onDragStart={sidebar.handleSidebarDragStart}
          envEntries={registryEntries}
          activeStableId={activeStableId}
          onObjectClick={handleTabClick}
          envReady={envReady}
          scriptRow={projectName ? { label: `${projectName}.R`, stableId: SCRIPT_TAB_ID } : undefined}
          onRunCode={async (code: string) => {
            const { evalR } = await import("@/lib/r/webr");
            const result = await evalR(code);
            consoleRef.current?.appendAgentCommand(
              code,
              [result.stdout, result.stderr, result.error].filter(Boolean).join("\n")
            );
          }}
          onRefreshEnv={async () => {
            syncedToView.current.clear();
            const prev = registryRef.current;
            const nr = await refreshEnv();
            await persistRenames(projectId, nr, prev, setProjectDatasets);
            for (const [, old] of prev) {
              if (!nr.has(old.stableId) && old.datasetId) {
                try {
                  await localProjects.removeDatasetFromProject(projectId, old.datasetId);
                  setProjectDatasets((p) => p.filter((d) => d.id !== old.datasetId));
                } catch {}
              }
            }
          }}
          plots={plots}
          onDeletePlot={removePlot}
          onClearPlots={clearPlots}
        />

        <DataPanel
          registryEntries={registryEntries} activeStableId={activeStableId} onObjectTabClick={handleTabClick}
          activeEntry={activeEntry} activeRName={activeRName} envReady={envReady} runtimeStatus={runtimeStatus}
          loading={loading} error={error} objectSummary={objectSummary} rowsData={rowsData}
          page={page} perPage={perPage} sortCol={sortCol} sortDir={sortDir}
          totalRows={totalRows} totalPages={totalPages} startRow={startRow} endRow={endRow}
          activeCell={activeCell} activeCellValue={activeCellValue}
          setPage={setPage} setActiveCell={setActiveCell} handleSort={handleSort} handlePerPageChange={handlePerPageChange} handleKeyDown={handleKeyDown} tableRef={tableRef}
          onOpenAddDataset={handleOpenAddDataset} onDownloadCsv={handleDownloadCsv}
          consoleHeight={consoleHeight} onConsoleResizeStart={handleConsoleResizeStart} consoleRef={consoleRef}
          projectId={projectId} duckdbReady={duckdbReady}
          onConsoleDataChanged={handleConsoleDataChanged} onConsoleCodeExecuted={handleConsoleCodeExecuted}
          onPlotCaptured={(images, code) => addPlots(images, "user", code)}
          scriptContent={script.content} onScriptChange={script.updateContent}
          onScriptRunCode={handleScriptRunCode} onScriptRunAll={handleScriptRunAll}
          scriptTabLabel={projectName ? `${projectName}.R` : ""}
        />

        <div onMouseDown={handlePanelDragStart} className="rbase-drag-v" />

        <ChatPanel
          messages={messages} isTyping={isTyping} onSendMessage={handleSendMessageCb} onStopChat={handleStopChat}
          onClearChat={handleClearChat} onAgentAnswer={handleAgentAnswer} activeStableId={activeStableId}
          selectedModel={selectedModel} onModelChange={handleModelChange} messagesEndRef={messagesEndRef}
          panelWidth={panelWidth}
        />
      </div>

      <RuntimeToast status={runtimeStatus} progress={runtimeProgress} duckdbReady={duckdbReady} />
    </div>
  );
}
