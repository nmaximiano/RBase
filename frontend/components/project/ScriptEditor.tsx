"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { r } from "codemirror-lang-r";

interface ScriptEditorProps {
  content: string;
  onChange: (content: string) => void;
  onRunCode: (code: string) => void;
  onRunAll: () => void;
}

// Use R's parse() to check expression completeness.
// Passes code via a temp variable to avoid string escaping issues.
async function checkRParse(code: string): Promise<"complete" | "incomplete" | "error"> {
  const { evalR } = await import("@/lib/r/webr");
  const webr = (await import("@/lib/r/webr")).getWebR();
  if (!webr) return "error";
  // Write code to a temp file to avoid any escaping problems
  const encoder = new TextEncoder();
  await webr.FS.writeFile("/tmp/_parse_check.R", encoder.encode(code));
  const result = await evalR(
    `tryCatch({ parse(file="/tmp/_parse_check.R"); cat("complete") }, error = function(e) { if (grepl("unexpected end of input|unexpected end of string", e$message, ignore.case=TRUE)) cat("incomplete") else cat("error") })`
  );
  const out = (result.stdout || "").trim();
  if (out === "complete") return "complete";
  if (out === "incomplete") return "incomplete";
  return "error";
}

// Statement boundary cache: parsed once, reused on subsequent Ctrl+Enter,
// invalidated on edit from the first affected boundary onward.
interface StmtBoundary { start: number; end: number; }
let cachedBoundaries: StmtBoundary[] = [];
let cachedContent = "";

// Scan from a given line forward, finding statement boundaries via R's parse().
async function scanBoundaries(lines: string[], fromLine: number): Promise<StmtBoundary[]> {
  const boundaries: StmtBoundary[] = [];
  let i = fromLine;

  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i++;
    if (i >= lines.length) break;

    const stmtStart = i;
    let stmtEnd = i;
    while (stmtEnd < lines.length) {
      const block = lines.slice(stmtStart, stmtEnd + 1).join("\n").trim();
      if (!block) { stmtEnd++; continue; }
      const status = await checkRParse(block);
      if (status === "complete" || status === "error") break;
      stmtEnd++;
    }
    boundaries.push({ start: stmtStart, end: stmtEnd });
    i = stmtEnd + 1;
  }

  return boundaries;
}

// Find the complete expression block containing the cursor line.
// Uses cached boundaries when available, rescanning only from the first
// invalidated boundary on edit.
async function getExpressionBlock(lines: string[], startLine: number): Promise<{ code: string; endLine: number }> {
  const content = lines.join("\n");

  if (content !== cachedContent) {
    // Content changed: find where the edit happened and rescan from there.
    // Keep boundaries that are entirely before the first changed line.
    const oldLines = cachedContent.split("\n");
    let firstDiff = 0;
    while (firstDiff < oldLines.length && firstDiff < lines.length && oldLines[firstDiff] === lines[firstDiff]) firstDiff++;

    // Keep cached boundaries that end before the first diff
    const kept = cachedBoundaries.filter(b => b.end < firstDiff);
    const rescanFrom = kept.length > 0 ? kept[kept.length - 1].end + 1 : 0;

    const newBoundaries = await scanBoundaries(lines, rescanFrom);
    cachedBoundaries = [...kept, ...newBoundaries];
    cachedContent = content;
  }

  // Look up cursor in cached boundaries
  for (const b of cachedBoundaries) {
    if (startLine >= b.start && startLine <= b.end) {
      return { code: lines.slice(b.start, b.end + 1).join("\n"), endLine: b.end };
    }
  }

  // Fallback
  return { code: lines[startLine], endLine: startLine };
}

// Mock editor: mono 12px, faint right-aligned line numbers with NO
// vertical separator between gutter and code; they sit on the same
// surface (paper) and bleed together.
const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "12px",
    fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  },
  ".cm-content": {
    padding: "10px 0",
    caretColor: "var(--rbase-accent)",
  },
  ".cm-line": {
    padding: "0 10px",
    lineHeight: "1.65",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--rbase-faint)",
    border: "none",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 10px 0 12px",
    minWidth: "20px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--rbase-muted)",
  },
  // Only highlight the active line while the editor has focus.
  // Otherwise the last-touched line stays lit even when the user has
  // clicked away to the console, chat, etc.
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused .cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--rbase-accent) 6%, transparent)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--rbase-accent)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "color-mix(in srgb, var(--rbase-accent) 18%, transparent)",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
});

export function ScriptEditor({ content, onChange, onRunCode, onRunAll }: ScriptEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunCodeRef = useRef(onRunCode);
  const onRunAllRef = useRef(onRunAll);
  const runningRef = useRef(false);
  onChangeRef.current = onChange;
  onRunCodeRef.current = onRunCode;
  onRunAllRef.current = onRunAll;

  const runCurrentLine = useCallback((view: EditorView): boolean => {
    // Prevent overlapping runs
    if (runningRef.current) return true;

    const state = view.state;
    const selection = state.selection.main;

    // If there's a selection, run the selected text
    if (!selection.empty) {
      const selectedText = state.sliceDoc(selection.from, selection.to).trim();
      if (selectedText) onRunCodeRef.current(selectedText);
      return true;
    }

    const doc = state.doc;
    const cursorLine = doc.lineAt(selection.head).number - 1; // 0-indexed
    const lines = doc.toString().split("\n");

    // Skip empty lines; just advance
    if (!lines[cursorLine]?.trim()) {
      const nextLine = cursorLine + 1;
      if (nextLine < doc.lines) {
        const lineInfo = doc.line(nextLine + 1);
        view.dispatch({ selection: { anchor: lineInfo.from } });
      }
      return true;
    }

    // Async: find the expression block via R's parser, then run it
    runningRef.current = true;
    getExpressionBlock(lines, cursorLine).then(({ code, endLine }) => {
      if (code.trim()) onRunCodeRef.current(code.trim());

      // Advance cursor to the next line after the block
      const nextLine = endLine + 1;
      if (nextLine < view.state.doc.lines) {
        const lineInfo = view.state.doc.line(nextLine + 1);
        view.dispatch({ selection: { anchor: lineInfo.from } });
      }
    }).finally(() => {
      runningRef.current = false;
    });

    return true;
  }, []);

  const runAll = useCallback((view: EditorView): boolean => {
    onRunAllRef.current();
    return true;
  }, []);

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const scriptKeymap = keymap.of([
      { key: "Ctrl-Enter", run: runCurrentLine },
      { key: "Mod-Enter", run: runCurrentLine },
      { key: "Ctrl-Shift-Enter", run: runAll },
      { key: "Mod-Shift-Enter", run: runAll },
    ]);

    const state = EditorState.create({
      doc: content,
      extensions: [
        scriptKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        history(),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        highlightSelectionMatches(),
        r(),
        syntaxHighlighting(defaultHighlightStyle),
        editorTheme,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Only run once on mount

  // Sync external content changes (e.g. initial load from DuckDB)
  const lastExternalContent = useRef(content);
  useEffect(() => {
    if (!viewRef.current) return;
    if (content === lastExternalContent.current) return;
    lastExternalContent.current = content;
    const view = viewRef.current;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden bg-surface" />
  );
}
