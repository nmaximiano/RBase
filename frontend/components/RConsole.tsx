"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
} from "react";

/** Serializable subset of HistoryEntry (no ImageBitmap). */
interface SerializableEntry {
  type: "input" | "output" | "error";
  text: string;
  source?: "user" | "agent" | "script";
}

interface HistoryEntry {
  type: "input" | "output" | "error" | "plot";
  text?: string;
  image?: ImageBitmap;
  source?: "user" | "agent" | "script";
}

export interface RConsoleHandle {
  appendAgentCommand(code: string, result: string): void;
  appendCommand(code: string, result: string, source: "agent" | "user" | "script"): void;
  getHistory(): HistoryEntry[];
  clearHistory(): void;
}

interface RConsoleProps {
  projectId: string;
  duckdbReady?: boolean;
  onDataChanged?: () => void;
  onCodeExecuted?: (code: string) => void;
  onPlotCaptured?: (images: ImageBitmap[], code: string) => void;
}

const STORAGE_KEY_PREFIX = "rconsole_";
const MAX_PERSISTED_ENTRIES = 200;
/** Lines of output before collapsing */
const COLLAPSE_THRESHOLD = 6;

/** Terminal-safe monospace font stack for R output alignment. */
const OUTPUT_FONT: React.CSSProperties = {
  fontFamily: 'var(--font-source-code-pro), "Source Code Pro", ui-monospace, monospace',
};

// R syntax highlighting

const R_KEYWORDS = new Set([
  "library", "require", "function", "if", "else", "for", "while", "repeat",
  "return", "next", "break", "in", "TRUE", "FALSE", "NULL", "NA", "NA_integer_",
  "NA_real_", "NA_complex_", "NA_character_", "Inf", "NaN", "T", "F",
]);

const R_TOKEN_RE = new RegExp(
  [
    "(#[^\\n]*)",                                           // 1 comment
    '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')',     // 2 string
    "((?:<-|->|%>%|%in%|\\|>|>=|<=|!=|==|&&|\\|\\|))",     // 3 operator
    "(\\b(?:library|require|function|if|else|for|while|repeat|return|next|break|in|TRUE|FALSE|NULL|NA|NA_integer_|NA_real_|NA_complex_|NA_character_|Inf|NaN|T|F)\\b)", // 4 keyword
    "(\\b[a-zA-Z_.][a-zA-Z0-9_.]*(?=\\s*\\())",            // 5 function call
    "(\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)",          // 6 number
  ].join("|"),
  "g"
);

export function highlightR(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  R_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = R_TOKEN_RE.exec(code)) !== null) {
    // Push plain text before this match
    if (m.index > lastIndex) {
      nodes.push(
        <span key={`t${lastIndex}`} className="text-text">
          {code.slice(lastIndex, m.index)}
        </span>
      );
    }

    let cls: string;
    if (m[1] != null) {
      cls = "text-text-muted italic"; // comment
    } else if (m[2] != null) {
      cls = "text-amber-400"; // string
    } else if (m[3] != null) {
      cls = "text-rose-400"; // operator
    } else if (m[4] != null) {
      cls = "text-purple-400"; // keyword
    } else if (m[5] != null) {
      cls = "text-blue-400"; // function call
    } else {
      cls = "text-cyan-400"; // number
    }

    nodes.push(
      <span key={`m${m.index}`} className={cls}>
        {m[0]}
      </span>
    );
    lastIndex = m.index + m[0].length;
  }

  // Trailing plain text
  if (lastIndex < code.length) {
    nodes.push(
      <span key={`t${lastIndex}`} className="text-text">
        {code.slice(lastIndex)}
      </span>
    );
  }

  return nodes;
}

// Click-to-copy wrapper

function CopyableEntry({ text, children }: { text: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [text]
  );

  return (
    <div
      className="group relative -mx-1.5 px-1.5 py-1 rounded hover:bg-surface-alt transition-colors"
    >
      {children}
      <button
        onClick={handleCopy}
        className={`absolute top-1 right-1.5 p-1 rounded transition-opacity duration-150 cursor-pointer ${
          copied
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        } hover:bg-border/50`}
        title="Copy"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
        )}
      </button>
    </div>
  );
}

// Helpers

/** Strip agent-internal [ENV] diagnostic lines from R output. */
function stripEnvLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.startsWith("[ENV]"))
    .join("\n")
    .trim();
}

function loadPersistedHistory(projectId: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + projectId);
    if (!raw) return [];
    const entries: SerializableEntry[] = JSON.parse(raw);
    return entries.map((e) => ({ ...e }));
  } catch {
    return [];
  }
}

function persistHistory(projectId: string, history: HistoryEntry[]) {
  try {
    const serializable: SerializableEntry[] = history
      .filter((e): e is HistoryEntry & { text: string } => e.type !== "plot" && !!e.text)
      .slice(-MAX_PERSISTED_ENTRIES)
      .map((e) => ({
        type: e.type as "input" | "output" | "error",
        text: e.text,
        ...(e.source ? { source: e.source } : {}),
      }));
    localStorage.setItem(STORAGE_KEY_PREFIX + projectId, JSON.stringify(serializable));
  } catch {}
}


/** Output block, always fully expanded. */
function CollapsibleOutput({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  return <div className={`${className} overflow-x-auto`} style={OUTPUT_FONT}>{text}</div>;
}

// Main component

const RConsole = forwardRef<RConsoleHandle, RConsoleProps>(
  function RConsole({ projectId, duckdbReady, onDataChanged, onCodeExecuted, onPlotCaptured }, ref) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [input, setInput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const historyLoaded = useRef(false);

    // Defer loading persisted history until duckdbReady so console and chat
    // history appear at the same time (chat loads from DuckDB).
    useEffect(() => {
      if (historyLoaded.current) return;
      if (duckdbReady === false) return; // wait for DuckDB
      historyLoaded.current = true;
      const saved = loadPersistedHistory(projectId);
      if (saved.length > 0) setHistory(saved);
    }, [duckdbReady, projectId]);

    useEffect(() => {
      if (!historyLoaded.current) return; // don't persist the empty initial state
      persistHistory(projectId, history);
    }, [history, projectId]);

    useImperativeHandle(ref, () => ({
      appendAgentCommand(code: string, result: string) {
        this.appendCommand(code, result, "agent");
      },
      appendCommand(code: string, result: string, source: "agent" | "user" | "script") {
        const cleaned = stripEnvLines(result);
        const isError = /^Error\b/m.test(cleaned);
        setHistory((h) => [
          ...h,
          { type: "input", text: code, source },
          ...(cleaned
            ? [{ type: isError ? "error" as const : "output" as const, text: cleaned, source }]
            : []),
        ]);
      },
      getHistory() {
        return history;
      },
      clearHistory() {
        setHistory([]);
      },
    }));

    const scrollToBottom = useCallback(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [history, scrollToBottom]);

    // Refocus textarea when execution finishes
    useEffect(() => {
      if (!isRunning) inputRef.current?.focus();
    }, [isRunning]);

    /** Auto-resize the textarea to fit content */
    const autoResize = useCallback(() => {
      const ta = inputRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }, []);

    const runCommand = useCallback(
      async (code: string) => {
        if (!code.trim()) return;

        setIsRunning(true);
        setHistory((h) => [...h, { type: "input", text: code, source: "user" }]);

        try {
          const { evalR } = await import("@/lib/r/webr");
          const result = await evalR(code);

          setHistory((h) => {
            const entries: HistoryEntry[] = [...h];
            if (result.stdout) {
              entries.push({ type: "output", text: result.stdout });
            }
            if (result.stderr) {
              entries.push({ type: "error", text: result.stderr });
            }
            if (result.error) {
              entries.push({ type: "error", text: result.error });
            }
            for (const img of result.images) {
              entries.push({ type: "plot", image: img });
            }
            return entries;
          });

          if (!result.error) {
            onDataChanged?.();
            onCodeExecuted?.(code);
          }

          if (result.images.length > 0) {
            onPlotCaptured?.(result.images, code);
          }
        } catch (err) {
          setHistory((h) => [
            ...h,
            {
              type: "error",
              text: err instanceof Error ? err.message : String(err),
            },
          ]);
        }

        setIsRunning(false);
        inputRef.current?.focus();
      },
      [onDataChanged, onCodeExecuted, onPlotCaptured]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isRunning && input.trim()) {
          runCommand(input);
          setInput("");
          // Reset textarea height after submit
          requestAnimationFrame(() => {
            const ta = inputRef.current;
            if (ta) ta.style.height = "auto";
          });
        }
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      autoResize();
      scrollToBottom();
    };

    const handleOutputClick = useCallback(
      () => {
        const sel = window.getSelection();
        if (sel && sel.toString().length > 0) return;
        inputRef.current?.focus();
      },
      []
    );

    return (
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto overflow-x-auto bg-surface font-mono text-sm px-3 py-2 leading-normal select-text"
        onClick={handleOutputClick}
      >
        {history.length === 0 && (
          <div className="text-text-muted">
            R console ready. Type R commands and press Enter.
          </div>
        )}
        {history.map((entry, i) => {
          if (entry.type === "input") {
            return (
              <CopyableEntry key={i} text={entry.text!}>
                <div className="flex gap-1.5 min-w-0 mt-1 first:mt-0" style={OUTPUT_FONT}>
                  <span className={`shrink-0 select-none ${
                    entry.source === "agent" ? "text-accent" : entry.source === "script" ? "text-indigo-400" : "text-emerald-500"
                  }`}>
                    {entry.source === "agent" ? "agent >" : entry.source === "script" ? "script >" : "user >"}
                  </span>
                  <span className="whitespace-pre-wrap break-words min-w-0">
                    {highlightR(entry.text!)}
                  </span>
                </div>
              </CopyableEntry>
            );
          }
          if (entry.type === "output") {
            return (
              <CopyableEntry key={i} text={entry.text!}>
                <CollapsibleOutput
                  text={entry.text!}
                  className="whitespace-pre text-text"
                />
              </CopyableEntry>
            );
          }
          if (entry.type === "error") {
            return (
              <CopyableEntry key={i} text={entry.text!}>
                <CollapsibleOutput
                  text={entry.text!}
                  className="whitespace-pre text-error/80"
                />
              </CopyableEntry>
            );
          }
          if (entry.type === "plot" && entry.image) {
            return <PlotCanvas key={i} image={entry.image} />;
          }
          return null;
        })}
        {isRunning && (
          <div className="text-text-muted animate-pulse mt-1.5">
            Running...
          </div>
        )}

        {/* Input area: inline at bottom of scroll */}
        <div className="mt-2 pb-4">
          <div className="flex gap-1.5 items-start" style={OUTPUT_FONT}>
            <span className="text-emerald-500 select-none shrink-0 leading-normal pt-px">&gt;</span>
            <textarea
              ref={inputRef}
              rows={3}
              value={input}
              onChange={handleInputChange}
              onFocus={scrollToBottom}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/50 focus:outline-none disabled:opacity-50 caret-emerald-500 resize-none leading-normal"
              placeholder={isRunning ? "Running..." : ""}
            />
            {isRunning && (
              <span className="text-text-muted animate-pulse text-[10px] shrink-0">...</span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

function PlotCanvas({ image }: { image: ImageBitmap }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(image, 0, 0);
    }
  }, [image]);

  return (
    <canvas
      ref={canvasRef}
      className="my-1 ml-4 rounded max-w-full"
      style={{
        maxHeight: 300,
        background: "white",
      }}
    />
  );
}

export default RConsole;
