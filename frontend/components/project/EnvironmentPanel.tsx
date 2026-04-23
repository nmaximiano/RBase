"use client";

import { useState, useRef, useEffect } from "react";

interface EnvEntry {
  stableId: string;
  rName: string;
  class: string;
  isDataFrame: boolean;
  nrow?: number;
  ncol?: number;
  length?: number;
}

interface EnvironmentPanelProps {
  entries: EnvEntry[];
  activeStableId: string | null;
  onObjectClick: (stableId: string) => void;
  envReady: boolean;
  onRunCode: (code: string) => Promise<void>;
  onRefreshEnv: () => Promise<void>;
  // Pinned script row shown above the R objects. Not deletable,
  // not renameable; just a shortcut to the script tab.
  scriptRow?: { label: string; stableId: string };
}

// File-tree-style list from the mock: mono, tight rows, dim by default,
// accent color for the active row. No chunky badge; class + dimensions
// live in a faint right-aligned metadata string. Actions hover-revealed.
export function EnvironmentPanel({
  entries,
  activeStableId,
  onObjectClick,
  envReady,
  onRunCode,
  onRefreshEnv,
  scriptRow,
}: EnvironmentPanelProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  const mono = "var(--font-jetbrains-mono), ui-monospace, monospace";

  // Render the pinned script row inline so we can reuse it across the
  // loading / empty / populated states. No actions menu; it's not an R
  // object, just a shortcut back to the script tab.
  const scriptRowEl = scriptRow ? (
    <div
      className="group relative flex items-center gap-2 px-3 py-[3px] cursor-pointer"
      style={{
        color: scriptRow.stableId === activeStableId ? "var(--rbase-accent)" : "var(--rbase-muted)",
        fontFamily: mono,
        fontSize: 11,
        fontWeight: scriptRow.stableId === activeStableId ? 500 : 400,
      }}
      onMouseEnter={(e) => {
        if (scriptRow.stableId !== activeStableId) e.currentTarget.style.color = "var(--rbase-ink)";
      }}
      onMouseLeave={(e) => {
        if (scriptRow.stableId !== activeStableId) e.currentTarget.style.color = "var(--rbase-muted)";
      }}
      onClick={() => onObjectClick(scriptRow.stableId)}
    >
      <ScriptIcon />
      <span className="truncate flex-1 min-w-0">{scriptRow.label}</span>
    </div>
  ) : null;

  if (entries.length === 0 && !envReady) {
    return (
      <div className="flex-1 overflow-y-auto py-1">
        {scriptRowEl}
        <div className="px-3 py-3">
          <p className="rbase-eyebrow">Loading…</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto py-1">
        {scriptRowEl}
        <div className="px-4 py-6">
          <p className="text-[11px] text-text-muted text-center leading-relaxed">
            No R objects. Upload a dataset or run code.
          </p>
        </div>
      </div>
    );
  }

  async function handleDelete(rName: string) {
    setMenuOpen(null);
    await onRunCode(`rm(\`${rName}\`)`);
    await onRefreshEnv();
  }

  function handleRenameStart(entry: EnvEntry) {
    setMenuOpen(null);
    setRenamingId(entry.stableId);
    setRenameValue(entry.rName);
  }

  async function handleRenameSubmit(oldName: string) {
    const newName = renameValue.trim();
    setRenamingId(null);
    if (!newName || newName === oldName) return;
    await onRunCode(`\`${newName}\` <- \`${oldName}\`; rm(\`${oldName}\`)`);
    await onRefreshEnv();
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {scriptRowEl}
      {entries.map((entry) => {
        const isActive = entry.stableId === activeStableId;
        const isRenaming = renamingId === entry.stableId;
        const dims =
          entry.isDataFrame && entry.nrow !== undefined && entry.ncol !== undefined
            ? `${entry.nrow} × ${entry.ncol}`
            : entry.length !== undefined
              ? `len ${entry.length}`
              : entry.class;

        return (
          <div
            key={entry.stableId}
            className="group relative flex items-center gap-2 px-3 py-[3px] cursor-pointer"
            style={{
              color: isActive ? "var(--rbase-accent)" : "var(--rbase-muted)",
              fontFamily: mono,
              fontSize: 11,
              fontWeight: isActive ? 500 : 400,
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--rbase-ink)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--rbase-muted)";
            }}
            onClick={() => !isRenaming && onObjectClick(entry.stableId)}
          >
            {isRenaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(entry.rName);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                onBlur={() => handleRenameSubmit(entry.rName)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-surface border border-accent px-1 py-0.5 outline-none"
                style={{ fontFamily: mono, fontSize: 11, color: "var(--rbase-ink)" }}
              />
            ) : (
              <>
                {entry.isDataFrame ? <TableIcon /> : <ObjectIcon />}
                <span className="truncate flex-1 min-w-0">{entry.rName}</span>
                <span
                  style={{
                    fontSize: 9.5,
                    color: "var(--rbase-faint)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                  className="shrink-0"
                >
                  {dims}
                </span>
                <div
                  className="relative shrink-0"
                  ref={menuOpen === entry.stableId ? menuRef : undefined}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === entry.stableId ? null : entry.stableId);
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-4 h-4 flex items-center justify-center transition-opacity"
                    style={{ color: "var(--rbase-muted)" }}
                    title="Actions"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.2" />
                      <circle cx="10" cy="10" r="1.2" />
                      <circle cx="10" cy="16" r="1.2" />
                    </svg>
                  </button>

                  {menuOpen === entry.stableId && (
                    <div
                      className="absolute right-0 top-5 z-50 border py-1 min-w-[100px]"
                      style={{
                        background: "var(--rbase-surface)",
                        borderColor: "var(--rbase-border)",
                        boxShadow: "0 8px 20px -8px rgba(0,0,0,0.18)",
                        fontFamily: "var(--font-inter-tight), sans-serif",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameStart(entry);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-text hover:bg-surface-hover transition-colors"
                      >
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry.rName);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-hover transition-colors"
                        style={{ color: "var(--rbase-danger)" }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Minimal row icons. All render at 10x10 in the row's currentColor so
// they inherit active/muted state from the parent without extra wiring.

function ScriptIcon() {
  return (
    <svg
      className="shrink-0"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 1.5 H9 L12.5 5 V14.5 H3.5 Z" />
      <path d="M9 1.5 V5 H12.5" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg
      className="shrink-0"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="1.75" y="3" width="12.5" height="10" />
      <line x1="1.75" y1="6.5" x2="14.25" y2="6.5" />
      <line x1="6" y1="3" x2="6" y2="13" />
      <line x1="10" y1="3" x2="10" y2="13" />
    </svg>
  );
}

function ObjectIcon() {
  return (
    <svg
      className="shrink-0"
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="8" cy="8" r="2.25" />
    </svg>
  );
}
