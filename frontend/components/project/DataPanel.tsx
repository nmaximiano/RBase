"use client";

import React from "react";
import type { RConsoleHandle } from "@/components/RConsole";
import type { RowsResponse } from "@/lib/types";
import type { ObjectRegistryEntry } from "@/lib/r/registry";
import { TabBar, SCRIPT_TAB_ID } from "@/components/project/TabBar";
import { DataTable } from "@/components/project/DataTable";
import { ConsolePanel } from "@/components/project/ConsolePanel";
import { ScriptEditor } from "@/components/project/ScriptEditor";

interface DataPanelProps {
  // Tab bar
  registryEntries: ObjectRegistryEntry[];
  activeStableId: string | null;
  onObjectTabClick: (stableId: string) => void;
  activeEntry: ObjectRegistryEntry | null;
  activeRName: string | null;
  envReady: boolean;
  runtimeStatus: string;
  loading: boolean;
  error: string;
  objectSummary: string | null;
  onOpenAddDataset: () => void;
  onDownloadCsv: () => void;
  // Data table
  rowsData: RowsResponse | null;
  page: number;
  perPage: number;
  sortCol: string | null;
  sortDir: "asc" | "desc";
  totalRows: number;
  totalPages: number;
  startRow: number;
  endRow: number;
  activeCell: [number, number] | null;
  activeCellValue: string | null;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setActiveCell: (cell: [number, number] | null) => void;
  handleSort: (col: string) => void;
  handlePerPageChange: (n: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
  // Console
  consoleHeight: number;
  onConsoleResizeStart: (e: React.MouseEvent) => void;
  consoleRef: React.RefObject<RConsoleHandle | null>;
  projectId: string;
  duckdbReady: boolean;
  onConsoleDataChanged: () => Promise<void>;
  onConsoleCodeExecuted: (code: string) => Promise<void>;
  onPlotCaptured: (images: ImageBitmap[], code: string) => void;
  // Script editor
  scriptContent: string;
  onScriptChange: (content: string) => void;
  onScriptRunCode: (code: string) => void;
  onScriptRunAll: () => void;
  scriptTabLabel: string;
}

export function DataPanel(props: DataPanelProps) {
  const isScriptActive = props.activeStableId === SCRIPT_TAB_ID;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TabBar
        registryEntries={props.registryEntries}
        activeStableId={props.activeStableId}
        onObjectTabClick={props.onObjectTabClick}
        envReady={props.envReady}
        activeEntryIsDataFrame={props.activeEntry?.isDataFrame ?? false}
        onOpenAddDataset={props.onOpenAddDataset}
        onDownloadCsv={props.onDownloadCsv}
        scriptTabLabel={props.scriptTabLabel}
      />

      {isScriptActive ? (
        // Render the script editor even when the R env isn't ready yet.
        // The editor is pure code editing, doesn't need webR, and keeping
        // it mounted avoids a tinted "setting up" flash during env init.
        // Run actions short-circuit when runtimeStatus isn't ready.
        <ScriptEditor
          content={props.scriptContent}
          onChange={props.onScriptChange}
          onRunCode={props.onScriptRunCode}
          onRunAll={props.onScriptRunAll}
        />
      ) : props.envReady ? (
        <DataTable
          rowsData={props.rowsData}
          activeEntry={props.activeEntry}
          activeRName={props.activeRName}
          activeStableId={props.activeStableId}
          envReady={props.envReady}
          runtimeStatus={props.runtimeStatus}
          loading={props.loading}
          error={props.error}
          objectSummary={props.objectSummary}
          registryEmpty={props.registryEntries.length === 0}
          onOpenAddDataset={props.onOpenAddDataset}
          page={props.page}
          sortCol={props.sortCol}
          sortDir={props.sortDir}
          startRow={props.startRow}
          endRow={props.endRow}
          totalRows={props.totalRows}
          totalPages={props.totalPages}
          perPage={props.perPage}
          activeCell={props.activeCell}
          activeCellValue={props.activeCellValue}
          setPage={props.setPage}
          setActiveCell={props.setActiveCell}
          handleSort={props.handleSort}
          handlePerPageChange={props.handlePerPageChange}
          handleKeyDown={props.handleKeyDown}
          tableRef={props.tableRef}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-5 w-5 mx-auto mb-3 border-2 border-accent border-t-transparent animate-spin rounded-full" />
            <p className="text-sm font-medium text-text mb-1">Setting up R environment</p>
            <p className="text-xs text-text-muted">Loading packages and datasets...</p>
          </div>
        </div>
      )}

      <ConsolePanel
        height={props.consoleHeight}
        onResizeStart={props.onConsoleResizeStart}
        consoleRef={props.consoleRef}
        projectId={props.projectId}
        duckdbReady={props.duckdbReady}
        onDataChanged={props.onConsoleDataChanged}
        onCodeExecuted={props.onConsoleCodeExecuted}
        onPlotCaptured={props.onPlotCaptured}
      />
    </div>
  );
}
