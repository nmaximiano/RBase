"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getScript, saveScript } from "@/lib/db/scriptStorage";

const SAVE_DEBOUNCE_MS = 500;
const DEFAULT_CONTENT = `# Welcome to your project!
# Write your own R code or ask the agent for help.

print("Hello, world")  # press \`ctrl\` + \`enter\` to execute
`;

export function useScript(projectId: string, duckdbReady: boolean) {
  const [content, setContent] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = useRef(content);
  latestContent.current = content;

  // Load script from DuckDB on mount
  useEffect(() => {
    if (!duckdbReady) return;
    let cancelled = false;
    getScript(projectId).then((saved) => {
      if (!cancelled) {
        setContent(saved || DEFAULT_CONTENT);
        setLoaded(true);
      }
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [projectId, duckdbReady]);

  // Debounced save
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveScript(projectId, newContent).catch((e) => console.error("[script] save failed:", e));
    }, SAVE_DEBOUNCE_MS);
  }, [projectId]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveScript(projectId, latestContent.current).catch((e) => console.error("[script] flush failed:", e));
      }
    };
  }, [projectId]);

  return { content, updateContent, loaded };
}
