"use client";

import React from "react";
import Link from "next/link";
import SettingsMenu from "@/components/ui/SettingsMenu";
import { BORDER, FONT_SANS, HAIRLINE, INK, MUTED } from "@/components/ui/theme";

interface ActiveEntry {
  class: string;
  isDataFrame: boolean;
  nrow?: number;
  ncol?: number;
  length?: number;
}

interface ProjectToolbarProps {
  projectName: string;
  isRenaming: boolean;
  setIsRenaming: (v: boolean) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  renameRef: React.RefObject<HTMLInputElement | null>;
  onRename: () => void;
  activeEntry: ActiveEntry | null;
  /** Reset actions grouped under the toolbar's Reset… menu. */
  onClearConsole: () => void;
  onResetAgent: () => void;
  onResetEnv: () => void;
}

// Combined Nav + Toolbar for the IDE page. Replaces the standalone
// <Nav> for this surface so the working view has a single thin top
// strip: session name on the left, active-object metadata, a small
// Projects link, and the settings gear on the right.
export default function ProjectToolbar({
  projectName,
  isRenaming,
  setIsRenaming,
  renameValue,
  setRenameValue,
  renameRef,
  onRename,
  activeEntry,
  onClearConsole,
  onResetAgent,
  onResetEnv,
}: ProjectToolbarProps) {
  return (
    <div className="shrink-0 border-b border-border bg-surface-alt">
      <div className="flex items-center gap-3 px-4 h-11 text-[12px]" style={{ fontFamily: FONT_SANS }}>
        {/* Editable session name */}
        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={onRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            className="text-[15px] font-medium text-text bg-surface-alt border border-accent px-1.5 py-0.5 outline-none w-56"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setRenameValue(projectName);
              setIsRenaming(true);
            }}
            className="text-[15px] font-medium text-text truncate max-w-[260px] hover:text-accent transition-colors cursor-pointer"
            title="Click to rename session"
          >
            {projectName}
          </button>
        )}

        {/* Active-object metadata */}
        {activeEntry && (
          <>
            <span className="h-3 w-px bg-border shrink-0" />
            <span className="text-[11px] text-accent font-[family-name:var(--font-jetbrains-mono)] whitespace-nowrap">
              {activeEntry.class}
            </span>
            {activeEntry.isDataFrame && activeEntry.nrow !== undefined && (
              <span className="text-[11px] text-text-muted font-[family-name:var(--font-jetbrains-mono)] whitespace-nowrap tabular-nums">
                · {activeEntry.nrow.toLocaleString()} rows
              </span>
            )}
            {activeEntry.isDataFrame && activeEntry.ncol !== undefined && (
              <span className="text-[11px] text-text-muted font-[family-name:var(--font-jetbrains-mono)] whitespace-nowrap tabular-nums">
                · {activeEntry.ncol} cols
              </span>
            )}
            {!activeEntry.isDataFrame && activeEntry.length !== undefined && (
              <span className="text-[11px] text-text-muted font-[family-name:var(--font-jetbrains-mono)] whitespace-nowrap tabular-nums">
                · length {activeEntry.length}
              </span>
            )}
          </>
        )}

        {/* Right cluster: Projects link + settings gear.
            Reset actions live inside the gear's dropdown. */}
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/projects"
            style={{
              fontSize: 12,
              fontFamily: FONT_SANS,
              color: MUTED,
              padding: "3px 10px",
              border: `1px solid ${HAIRLINE}`,
              borderRadius: 4,
              textDecoration: "none",
              lineHeight: 1.4,
              transition: "color 120ms ease, border-color 120ms ease, background 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = INK;
              e.currentTarget.style.borderColor = BORDER;
              e.currentTarget.style.background = "var(--rbase-row-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = MUTED;
              e.currentTarget.style.borderColor = HAIRLINE;
              e.currentTarget.style.background = "transparent";
            }}
          >
            Projects
          </Link>
          <SettingsMenu
            actions={[
              {
                label: "Clear console",
                hint: "Empty the R console history",
                onClick: onClearConsole,
              },
              {
                label: "Reset agent",
                hint: "Clear chat and wipe agent memory",
                onClick: onResetAgent,
              },
              {
                label: "Reset environment",
                hint: "Restore datasets to their original state",
                destructive: true,
                onClick: onResetEnv,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
