"use client";

import React from "react";
import type { RowsResponse } from "@/lib/types";
import type { ObjectRegistryEntry } from "@/lib/r/registry";

interface DataTableProps {
  rowsData: RowsResponse | null;
  activeEntry: ObjectRegistryEntry | null;
  activeRName: string | null;
  activeStableId: string | null;
  envReady: boolean;
  runtimeStatus: string;
  loading: boolean;
  error: string;
  objectSummary: string | null;
  registryEmpty: boolean;
  onOpenAddDataset: () => void;
  // Table interaction
  page: number;
  sortCol: string | null;
  sortDir: "asc" | "desc";
  startRow: number;
  endRow: number;
  totalRows: number;
  totalPages: number;
  perPage: number;
  activeCell: [number, number] | null;
  activeCellValue: string | null;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setActiveCell: (cell: [number, number] | null) => void;
  handleSort: (col: string) => void;
  handlePerPageChange: (n: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
}

export function DataTable({
  rowsData,
  activeEntry,
  activeRName,
  activeStableId,
  envReady,
  runtimeStatus,
  loading,
  error,
  objectSummary,
  registryEmpty,
  onOpenAddDataset,
  page,
  sortCol,
  sortDir,
  startRow,
  endRow,
  totalRows,
  totalPages,
  perPage,
  activeCell,
  activeCellValue,
  setPage,
  setActiveCell,
  handleSort,
  handlePerPageChange,
  handleKeyDown,
  tableRef,
}: DataTableProps) {
  // Empty/loading states
  if (registryEmpty && !envReady && runtimeStatus !== "error") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="h-5 w-5 mx-auto mb-3 border-2 border-accent border-t-transparent animate-spin rounded-full" />
          <p className="text-sm font-medium text-text mb-1">Setting up R environment</p>
          <p className="text-xs text-text-muted">Loading packages and datasets...</p>
        </div>
      </div>
    );
  }

  if (registryEmpty && !loading && envReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-10 h-10 text-text-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
          </svg>
          <p className="text-sm font-medium text-text mb-1">No R objects</p>
          <p className="text-xs text-text-muted mb-4">Upload a dataset or create objects in the R console.</p>
          <button
            onClick={onOpenAddDataset}
            className="inline-flex items-center gap-2 bg-text text-surface py-2 px-4 text-xs font-medium hover:bg-text/85 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload data
          </button>
        </div>
      </div>
    );
  }

  // Non-data.frame summary
  if (activeEntry && !activeEntry.isDataFrame && objectSummary !== null) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-3">
          <span className="text-sm font-semibold text-text">{activeRName}</span>
          <span className="text-xs text-text-muted ml-2">({activeEntry.class})</span>
        </div>
        <pre className="text-sm leading-normal text-text bg-surface border border-border p-5 whitespace-pre overflow-x-auto" style={{ fontFamily: 'var(--font-source-code-pro), "Source Code Pro", ui-monospace, monospace' }}>{objectSummary.trim()}</pre>
      </div>
    );
  }

  // Data table
  if (rowsData && rowsData.rows.length > 0) {
    return (
      <>
        <div
          ref={tableRef}
          className="flex-1 overflow-auto focus:outline-none bg-surface-alt"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={(e) => {
            const td = (e.target as HTMLElement).closest("td, th");
            if (!td) return;
            const tr = td.closest("tr");
            if (!tr) return;
            const isHeader = !!td.closest("thead");
            const ci = Array.from(tr.children).indexOf(td) - 1;
            if (ci < 0) return;
            if (isHeader) {
              setActiveCell([-1, ci]);
            } else {
              const ri = Array.from(tr.closest("tbody")!.children).indexOf(tr);
              setActiveCell([ri, ci]);
            }
          }}
        >
          <table className="text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface">
                <th className="sticky left-0 z-20 bg-surface border-b border-r border-border px-2.5 py-2.5 text-center text-text-muted font-medium w-[52px] min-w-[52px]" />
                {rowsData.columns.map((col, ci) => (
                  <th
                    key={col}
                    onClick={(e) => { e.stopPropagation(); setActiveCell([-1, ci]); handleSort(col); }}
                    className={`border-b border-r border-border px-3.5 py-2.5 text-left font-medium whitespace-nowrap cursor-pointer select-none transition-colors min-w-[140px] ${
                      activeCell?.[0] === -1 && activeCell?.[1] === ci
                        ? "bg-accent/10 text-accent"
                        : "text-text-secondary hover:text-text hover:bg-surface-hover"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col}
                      {sortCol === col && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {sortDir === "asc"
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />}
                        </svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsData.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-surface-alt/50" : "bg-surface"}>
                  <td className="sticky left-0 z-[5] border-r border-b border-border px-2.5 py-2 text-center text-text-muted font-medium tabular-nums w-[52px] min-w-[52px] bg-inherit text-[13px]">
                    <div className={ri % 2 === 0 ? "bg-surface rounded" : "bg-surface-alt/50 rounded"}>
                      {startRow + ri}
                    </div>
                  </td>
                  {row.map((cell, ci) => {
                    const isActive = activeCell?.[0] === ri && activeCell?.[1] === ci;
                    return (
                      <td
                        key={ci}
                        title={String(cell)}
                        className={`border-r border-b border-text/20 px-3.5 py-2 min-w-[140px] max-w-[320px] truncate transition-colors text-[13px] ${
                          isActive ? "outline outline-2 outline-accent bg-accent/5 text-text" : "text-text"
                        }`}
                      >
                        {String(cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination footer */}
        <div className="shrink-0 border-t border-border bg-surface-alt flex items-center px-4 h-8 gap-3 text-[11px] text-text-muted">
          {activeCellValue !== null && (
            <>
              <span className="shrink-0 font-medium text-text-secondary">
                {activeCell![0] === -1 ? `Col ${activeCell![1] + 1}` : `R${startRow + activeCell![0]}:C${activeCell![1] + 1}`}
              </span>
              <span className="text-text truncate max-w-[200px]">{activeCellValue}</span>
              <span className="h-3 w-px bg-border shrink-0" />
            </>
          )}
          <span className="shrink-0">{startRow}–{endRow} of {totalRows.toLocaleString()}</span>
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(Number(e.target.value))}
            className="bg-transparent border-none text-[11px] text-text-muted focus:outline-none cursor-pointer"
          >
            <option value={25}>25/pg</option>
            <option value={50}>50/pg</option>
            <option value={100}>100/pg</option>
          </select>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-1.5 py-0.5 rounded text-text-muted hover:text-text transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <span className="px-1 tabular-nums">{rowsData.page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-1.5 py-0.5 rounded text-text-muted hover:text-text transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        </div>
      </>
    );
  }

  // Loading dataset
  if ((loading || (!rowsData && activeStableId && activeEntry?.isDataFrame)) && !error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="h-5 w-5 border-2 border-accent border-t-transparent animate-spin rounded-full" />
        <span className="text-xs text-text-muted">Loading dataset</span>
      </div>
    );
  }

  // Empty rows
  if (!error && rowsData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">This dataset has no rows.</p>
      </div>
    );
  }

  return <div className="flex-1" />;
}
