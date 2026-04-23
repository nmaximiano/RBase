"use client";

import { useEffect, useCallback } from "react";

interface PlotLightboxProps {
  src: string;
  onClose: () => void;
}

function downloadPlot(src: string) {
  const link = document.createElement("a");
  link.href = src;
  link.download = `plot-${Date.now()}.png`;
  link.click();
}

export function PlotLightbox({ src, onClose }: PlotLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 cursor-zoom-out"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-end gap-2 max-w-[95vw] max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar above image, right-aligned */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => downloadPlot(src)}
            className="h-8 px-3 rounded-lg bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium shadow-lg"
            title="Download plot"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
            Download
          </button>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer flex items-center justify-center shadow-lg"
            title="Close (Esc)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <img
          src={src}
          alt="R plot (enlarged)"
          className="max-w-[95vw] max-h-[calc(95vh-3rem)] rounded-lg shadow-2xl bg-white object-contain cursor-default"
        />
      </div>
    </div>
  );
}
