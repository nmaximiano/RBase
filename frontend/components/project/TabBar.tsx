"use client";

import React from "react";
import type { ObjectRegistryEntry } from "@/lib/r/registry";

export const SCRIPT_TAB_ID = "__script__";

interface TabBarProps {
  registryEntries: ObjectRegistryEntry[];
  activeStableId: string | null;
  onObjectTabClick: (stableId: string) => void;
  envReady: boolean;
  activeEntryIsDataFrame: boolean;
  onOpenAddDataset: () => void;
  onDownloadCsv: () => void;
  scriptTabLabel: string;
}

// Editorial tab bar. Thin strip, mono labels, active tab sits on the
// `surface` tier so it pops one step lighter than the tabs row below
// (which is on `paper-tint`). No accent underline; the surface shift
// is the active indicator. Counts in tiny faint mono.
export function TabBar({
  registryEntries,
  activeStableId,
  onObjectTabClick,
  envReady,
  activeEntryIsDataFrame,
  onOpenAddDataset,
  onDownloadCsv,
  scriptTabLabel,
}: TabBarProps) {
  const isScriptActive = activeStableId === SCRIPT_TAB_ID;

  const tabClass = (active: boolean) =>
    `group relative flex items-center gap-1.5 px-3 h-full border-r text-[12px] font-[family-name:var(--font-inter-tight)] whitespace-nowrap cursor-pointer select-none transition-colors ${
      active
        ? "text-text font-medium"
        : "text-text-muted hover:text-text"
    }`;

  return (
    <div
      className="shrink-0 flex items-center overflow-x-auto min-w-0 border-b border-border h-9"
      style={{ background: "var(--rbase-paper-tint)" }}
    >
      {/* Script tab: always first, undeletable */}
      {scriptTabLabel && (
        <button
          onClick={() => onObjectTabClick(SCRIPT_TAB_ID)}
          className={tabClass(isScriptActive)}
          style={{
            background: isScriptActive ? "var(--rbase-paper)" : "transparent",
            borderColor: "var(--rbase-hairline)",
            color: isScriptActive ? "var(--rbase-ink)" : "var(--rbase-muted)",
          }}
        >
          <span className="truncate max-w-[180px]">{scriptTabLabel}</span>
        </button>
      )}

      {/* R environment object tabs */}
      {registryEntries.map((entry) => {
        const active = activeStableId === entry.stableId;
        return (
          <button
            key={entry.stableId}
            onClick={() => onObjectTabClick(entry.stableId)}
            className={tabClass(active)}
            style={{
              background: active ? "var(--rbase-paper)" : "transparent",
              borderColor: "var(--rbase-hairline)",
              color: active ? "var(--rbase-ink)" : "var(--rbase-muted)",
            }}
          >
            <span className="truncate max-w-[160px]">{entry.rName}</span>
            {entry.isDataFrame && entry.nrow !== undefined && entry.nrow > 0 && (
              <span className="text-[9.5px] text-text-muted tabular-nums">
                {entry.nrow > 999 ? `${(entry.nrow / 1000).toFixed(0)}k` : entry.nrow}
              </span>
            )}
          </button>
        );
      })}

      {registryEntries.length === 0 && envReady && (
        <span className="text-[12px] text-text-muted px-3 font-[family-name:var(--font-inter-tight)]">
          No R objects
        </span>
      )}

      <button
        onClick={onOpenAddDataset}
        className="flex items-center justify-center w-8 h-full text-text-muted hover:text-text transition-colors cursor-pointer"
        title="Upload data"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {activeEntryIsDataFrame && (
        <button
          onClick={onDownloadCsv}
          title="Download as CSV"
          className="ml-auto flex items-center justify-center w-8 h-full text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </button>
      )}
    </div>
  );
}
