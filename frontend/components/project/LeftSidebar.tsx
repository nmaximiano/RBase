"use client";

import type { SidebarTab } from "@/lib/hooks/useLeftSidebar";
import type { StoredPlot } from "@/lib/hooks/usePlotStore";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { PlotPanel } from "./PlotPanel";

interface EnvEntry {
  stableId: string;
  rName: string;
  class: string;
  isDataFrame: boolean;
  nrow?: number;
  ncol?: number;
  length?: number;
}

interface LeftSidebarProps {
  activeTab: SidebarTab;
  sidebarWidth: number;
  onToggleTab: (tab: SidebarTab) => void;
  onDragStart: (e: React.MouseEvent) => void;
  envEntries: EnvEntry[];
  activeStableId: string | null;
  onObjectClick: (stableId: string) => void;
  envReady: boolean;
  onRunCode: (code: string) => Promise<void>;
  onRefreshEnv: () => Promise<void>;
  scriptRow?: { label: string; stableId: string };
  plots: StoredPlot[];
  onDeletePlot: (plotId: string) => void;
  onClearPlots: () => void;
}

const ICON_BAR_WIDTH = 40;

const TABS: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "env",
    label: "Environment",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
      </svg>
    ),
  },
  {
    id: "plots",
    label: "Plots",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
      </svg>
    ),
  },
];

// Tabbed sidebar: a thin icon rail on the left toggles between
// Environment and Plots; only the active panel is visible. Editorial
// styling: paper-tint icon rail, paper panel area, mono eyebrow on
// top of the active panel.
export function LeftSidebar({
  activeTab,
  sidebarWidth,
  onToggleTab,
  onDragStart,
  envEntries,
  activeStableId,
  onObjectClick,
  envReady,
  onRunCode,
  onRefreshEnv,
  scriptRow,
  plots,
  onDeletePlot,
  onClearPlots,
}: LeftSidebarProps) {
  const panelTitle = activeTab === "env" ? "Environment" : "Plots";
  const showClear = activeTab === "plots" && plots.length > 0;

  return (
    <>
      <div
        className="shrink-0 flex flex-row bg-surface border-r border-border"
        style={{ width: `${ICON_BAR_WIDTH + sidebarWidth}px` }}
      >
        {/* Icon rail: chrome surface (paper-tint) with tab icons */}
        <div
          className="shrink-0 flex flex-col items-center pt-2 gap-1 border-r border-border"
          style={{
            width: `${ICON_BAR_WIDTH}px`,
            background: "var(--rbase-paper-tint)",
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onToggleTab(tab.id)}
                title={tab.label}
                className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
                style={{
                  color: isActive ? "var(--rbase-accent)" : "var(--rbase-muted)",
                  background: isActive ? "var(--rbase-paper)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "var(--rbase-ink)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "var(--rbase-muted)";
                }}
              >
                {tab.icon}
              </button>
            );
          })}
        </div>

        {/* Active panel */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Eyebrow header */}
          <div
            className="group shrink-0 flex items-center h-9 px-3"
            style={{ borderBottom: "1px solid var(--rbase-hairline)" }}
          >
            <span className="rbase-eyebrow">{panelTitle}</span>
            {activeTab === "plots" && plots.length > 0 && (
              <span
                className="ml-2 tabular-nums"
                style={{
                  fontFamily: "var(--font-inter-tight), sans-serif",
                  fontSize: 11,
                  color: "var(--rbase-faint)",
                }}
              >
                {plots.length}
              </span>
            )}
            {showClear && (
              <button
                onClick={onClearPlots}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  fontSize: 11,
                  color: "var(--rbase-muted)",
                  fontFamily: "var(--font-inter-tight), sans-serif",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--rbase-danger)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--rbase-muted)")}
              >
                Clear
              </button>
            )}
          </div>

          {activeTab === "env" && (
            <EnvironmentPanel
              entries={envEntries}
              activeStableId={activeStableId}
              onObjectClick={onObjectClick}
              envReady={envReady}
              onRunCode={onRunCode}
              onRefreshEnv={onRefreshEnv}
              scriptRow={scriptRow}
            />
          )}
          {activeTab === "plots" && (
            <PlotPanel plots={plots} onDelete={onDeletePlot} />
          )}
        </div>
      </div>

      {/* Column resize handle */}
      <div onMouseDown={onDragStart} className="rbase-drag-v" />
    </>
  );
}
