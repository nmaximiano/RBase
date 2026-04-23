"use client";

import React from "react";
import RConsole from "@/components/RConsole";
import type { RConsoleHandle } from "@/components/RConsole";

interface ConsolePanelProps {
  height: number;
  onResizeStart: (e: React.MouseEvent) => void;
  consoleRef: React.RefObject<RConsoleHandle | null>;
  projectId: string;
  duckdbReady: boolean;
  onDataChanged: () => Promise<void>;
  onCodeExecuted: (code: string) => Promise<void>;
  onPlotCaptured: (images: ImageBitmap[], code: string) => void;
}

// Console pane. Per the mock: nothing but a mono "CONSOLE" eyebrow on
// a thin header strip, and the console content below. Download / clear
// actions are hover-revealed on the right side of the header; they
// exist but don't clutter the chrome by default.
export function ConsolePanel({
  height,
  onResizeStart,
  consoleRef,
  projectId,
  duckdbReady,
  onDataChanged,
  onCodeExecuted,
  onPlotCaptured,
}: ConsolePanelProps) {
  function downloadHistory() {
    const entries = consoleRef.current?.getHistory();
    if (!entries || entries.length === 0) return;
    const lines: string[] = [];
    for (const e of entries) {
      if (e.type === "input") lines.push(e.text ?? "");
      else if (e.type === "output" && e.text) lines.push(...e.text.split("\n").map((l) => `# ${l}`));
      else if (e.type === "error" && e.text) lines.push(...e.text.split("\n").map((l) => `# ERROR: ${l}`));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "console_history.R";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Drag handle (hairline) */}
      <div onMouseDown={onResizeStart} className="rbase-drag-h" />

      {/* Header strip: eyebrow only; actions hover-revealed. */}
      <div
        className="group shrink-0 flex items-center h-9 px-3 bg-surface"
        style={{ borderBottom: "1px solid var(--rbase-hairline)" }}
      >
        <span className="rbase-eyebrow">Console</span>
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={downloadHistory}
            title="Download console history"
            className="p-1 text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
          <button
            onClick={() => consoleRef.current?.clearHistory()}
            title="Clear console"
            className="p-1 text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Console body */}
      <div style={{ height: `${height}px` }} className="shrink-0 overflow-hidden">
        <div className="h-full">
          <RConsole
            ref={consoleRef}
            projectId={projectId}
            duckdbReady={duckdbReady}
            onDataChanged={onDataChanged}
            onCodeExecuted={onCodeExecuted}
            onPlotCaptured={onPlotCaptured}
          />
        </div>
      </div>
    </>
  );
}
