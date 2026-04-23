"use client";

import { memo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { ChatMessage } from "@/lib/types";
import { highlightR } from "@/components/RConsole";
import { formatToolName } from "@/lib/format";
import { PlotLightbox } from "./PlotLightbox";
import { CheckIcon, Spinner } from "@/components/icons";

/**
 * Normalize LaTeX math for remark-math.
 *
 * Two passes:
 * 1. Delimiter normalization: rewrite \(...\), \[...\], $$...$$ to a canonical
 *    block-display form fenced on its own lines, so remark-math always parses it.
 * 2. Heuristic fallback: for any line *outside* an existing $$...$$ block that
 *    contains a known LaTeX command (\widehat, \frac, \text{...}, Greek letters,
 *    etc.), strip stray trailing backslashes (CommonMark hard-break artifacts)
 *    and wrap the line as display math. This catches the case where the model
 *    forgets delimiters entirely and emits raw LaTeX.
 *
 * Currency like $1.50 is preserved by escaping bare $ followed by a digit.
 */
const TEX_CMD = /\\(?:widehat|hat|bar|tilde|vec|overline|underline|frac|dfrac|tfrac|sqrt|sum|prod|int|oint|lim|log|ln|exp|sin|cos|tan|min|max|text|mathrm|mathbf|mathit|mathcal|cdot|cdots|dots|ldots|times|div|pm|mp|leq|geq|neq|approx|equiv|sim|propto|infty|partial|nabla|forall|exists|in|notin|subset|supset|cup|cap|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|left|right|begin|end)\b/;

function prepareMath(text: string): string {
  const toDisplay = (inner: string) => `\n\n$$\n${inner.trim()}\n$$\n\n`;

  // Pass 1: normalize explicit delimiters into canonical block form.
  let out = text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, i) => toDisplay(i))
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, i) => toDisplay(i))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, i) => toDisplay(i));

  // Pass 2: heuristic fallback. Split on the canonical $$...$$ blocks we just
  // produced, then in each non-math segment wrap any line that looks like raw
  // LaTeX. This avoids double-wrapping content that's already in math mode.
  const parts = out.split(/(\n\n\$\$\n[\s\S]+?\n\$\$\n\n)/g);
  out = parts
    .map((part) => {
      if (part.startsWith("\n\n$$\n")) return part; // already math
      return part
        .split("\n")
        .map((line) => {
          if (!TEX_CMD.test(line)) return line;
          // Strip a stray trailing `\` (CommonMark hard-break artifact from
          // upstream-mangled `\[...\]` fences) and surrounding whitespace.
          const cleaned = line.replace(/\\\s*$/, "").trim();
          if (!cleaned) return line;
          return toDisplay(cleaned);
        })
        .join("\n");
    })
    .join("");

  // Pass 3: escape bare currency $N (e.g. $1.50) so remark-math ignores it.
  return out.replace(/(?<!\$)(?<!\\)\$(?=[\d~])/g, "\\$");
}

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

export const ToolMessageItem = memo(function ToolMessageItem({ msg }: { msg: ChatMessage }) {
  return (
    <div className="border-l-2 border-accent/30 pl-3 py-1.5">
      <div className="flex items-center gap-2 text-[13px]">
        {msg.toolStatus === "running" ? (
          <Spinner className="h-3.5 w-3.5 shrink-0 text-accent" />
        ) : (
          <CheckIcon className="w-3.5 h-3.5 shrink-0 text-green-500" />
        )}
        <span className="font-semibold text-text">
          {formatToolName(msg.toolName || "")}
        </span>
      </div>
      {msg.toolArgs && Object.keys(msg.toolArgs).length > 0 && (
        <div className="mt-1 ml-[22px] text-[13px] text-text-muted space-y-0.5">
          {Object.entries(msg.toolArgs).map(([k, v]) => (
            <div key={k}>
              <span className="text-text-muted">{k}:</span>{" "}
              <span className="text-text">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      {msg.progress !== undefined && msg.toolStatus === "running" && (
        <div className="mt-1.5 ml-[22px] flex items-center gap-2">
          <div className="h-1 bg-surface-alt rounded-full overflow-hidden w-32">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${msg.progress}%` }}
            />
          </div>
          <span className="text-[13px] text-text-muted tabular-nums">{msg.progress}%</span>
        </div>
      )}
      {msg.toolStatus === "completed" && msg.text && (
        <div className="mt-1 ml-[22px] text-[13px] text-text-muted">
          {msg.text.length > 320 ? msg.text.slice(0, 320) + "..." : msg.text}
        </div>
      )}
    </div>
  );
});

/** Strip markdown images with non-renderable src (attachment://, empty, etc.) */
function stripBrokenImages(text: string): string {
  return text.replace(/!\[[^\]]*\]\((?:attachment:\/\/[^)]*|)\)/g, "");
}

const consoleFontStyle: React.CSSProperties = {
  fontFamily: 'var(--font-source-code-pro), "Source Code Pro", ui-monospace, monospace',
};

const mdComponents: Record<string, React.ComponentType<React.HTMLAttributes<HTMLElement> & { node?: unknown }>> = {
  code({ className, children, node, ...props }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) {
    const isBlock = className?.startsWith("language-");
    const text = String(children).replace(/\n$/, "");
    if (isBlock) {
      return <code className={`${className ?? ""} !text-sm`} style={consoleFontStyle} {...props}>{highlightR(text)}</code>;
    }
    // Inline code
    return <code style={consoleFontStyle} {...props}>{highlightR(text)}</code>;
  },
  pre({ children, node, ...props }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) {
    return <pre style={consoleFontStyle} {...props}>{children}</pre>;
  },
};

export const AssistantMessageItem = memo(function AssistantMessageItem({ msg }: { msg: ChatMessage }) {
  return (
    <div className="pr-8 break-words prose prose-sm max-w-none text-text prose-headings:text-text prose-strong:text-text prose-p:text-text prose-li:text-text prose-th:text-text-secondary prose-td:text-text prose-a:text-accent prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-thead:border-border prose-tr:border-border">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={mdComponents}>{stripBrokenImages(prepareMath(msg.text))}</ReactMarkdown>
    </div>
  );
});

export const UserMessageItem = memo(function UserMessageItem({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-end pl-8">
      <div className="bg-accent rounded-2xl rounded-br-sm px-4 py-3">
        <p className="text-[15px] text-white whitespace-pre-wrap">{msg.text}</p>
      </div>
    </div>
  );
});

export const PlotMessageItem = memo(function PlotMessageItem({ msg }: { msg: ChatMessage }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  return (
    <div className="pr-8">
      <div className="rounded-lg border border-border overflow-hidden bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={msg.imageSrc}
          alt="R plot"
          className="w-full h-auto cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
        />
      </div>
      {lightboxOpen && msg.imageSrc && (
        <PlotLightbox src={msg.imageSrc} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
});

export const AskUserMessageItem = memo(function AskUserMessageItem({
  msg,
  onAnswer,
}: {
  msg: ChatMessage;
  onAnswer: (askId: string, answer: string) => void;
}) {
  const [value, setValue] = useState("");

  if (msg.answered) {
    return <AssistantMessageItem msg={msg} />;
  }

  return (
    <div className="pr-8 space-y-3">
      <div className="break-words prose prose-sm max-w-none text-text prose-headings:text-text prose-strong:text-text prose-p:text-text prose-li:text-text prose-code:text-accent prose-a:text-accent">
        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>{prepareMath(msg.text)}</ReactMarkdown>
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) {
              onAnswer(msg.askId!, value.trim());
              setValue("");
            }
          }}
          className="flex-1 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent transition-colors"
          placeholder="Type your answer..."
        />
        <button
          onClick={() => {
            if (value.trim()) {
              onAnswer(msg.askId!, value.trim());
              setValue("");
            }
          }}
          className="bg-accent rounded-lg px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors cursor-pointer"
        >
          Send
        </button>
      </div>
    </div>
  );
});
