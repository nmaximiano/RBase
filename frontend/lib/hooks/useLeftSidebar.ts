"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type SidebarTab = "env" | "plots";

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 400;
const SIDEBAR_DEFAULT = 260;

// Icon-bar tabbed sidebar: switch between Environment and Plots via
// the left icon rail. Only one panel is visible at a time.
export function useLeftSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("env");
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);

  const drag = useRef({ active: false, startX: 0, startW: 0 });

  const toggleTab = useCallback((tab: SidebarTab) => {
    setActiveTab(tab);
  }, []);

  const handleSidebarDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      drag.current = { active: true, startX: e.clientX, startW: sidebarWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth]
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!drag.current.active) return;
      const delta = e.clientX - drag.current.startX;
      setSidebarWidth(
        Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, drag.current.startW + delta))
      );
    }
    function onMouseUp() {
      if (!drag.current.active) return;
      drag.current.active = false;
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

  return {
    activeTab,
    sidebarWidth,
    toggleTab,
    handleSidebarDragStart,
  };
}
