"use client";

import { useState } from "react";
import type { StoredPlot } from "@/lib/hooks/usePlotStore";
import { PlotLightbox } from "./PlotLightbox";

interface PlotPanelProps {
  plots: StoredPlot[];
  onDelete: (plotId: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Plot thumbnails list. The panel header (label + clear) lives in the
// parent LeftSidebar now; this is just the scrolling content.
export function PlotPanel({ plots, onDelete }: PlotPanelProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (plots.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          No plots yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
      {plots.map((plot) => (
        <div
          key={plot.id}
          className="group relative overflow-hidden"
          style={{
            background: "var(--rbase-surface)",
            border: "1px solid var(--rbase-hairline)",
          }}
        >
          <button
            onClick={() => onDelete(plot.id)}
            className="absolute top-1 right-1 z-10 w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(0,0,0,0.55)" }}
            title="Delete plot"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={plot.dataUrl}
            alt="R plot"
            className="w-full cursor-zoom-in block"
            draggable={false}
            onClick={() => setLightboxSrc(plot.dataUrl)}
          />
          <div
            className="flex items-center gap-2 px-2 py-1"
            style={{
              borderTop: "1px solid var(--rbase-hairline)",
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
              fontSize: 9.5,
            }}
          >
            <span style={{ color: plot.source === "user" ? "var(--rbase-accent)" : "var(--rbase-muted)" }}>
              {plot.source}
            </span>
            <span style={{ color: "var(--rbase-faint)" }}>{formatTime(plot.timestamp)}</span>
            {plot.code && (
              <span
                className="truncate ml-auto max-w-[120px]"
                style={{ color: "var(--rbase-faint)" }}
                title={plot.code}
              >
                {plot.code}
              </span>
            )}
          </div>
        </div>
      ))}

      {lightboxSrc && <PlotLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
