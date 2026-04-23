"use client";

import { useState } from "react";
import { useApiKey } from "@/lib/key/useApiKey";
import {
  ACCENT,
  ACCENT_HOVER,
  BORDER,
  DANGER,
  FONT_MONO,
  FONT_SANS,
  HAIRLINE,
  INK,
  INK_STRONG,
  MUTED,
  PAPER,
  PAPER_TINT,
} from "@/components/ui/theme";

interface Props {
  open: boolean;
  onClose?: () => void;
}

export default function ApiKeyModal({ open, onClose }: Props) {
  const { setKey } = useApiKey();
  const [input, setInput] = useState("");
  const [sessionOnly, setSessionOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleSave() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please paste your OpenRouter key.");
      return;
    }
    if (!trimmed.startsWith("sk-or-")) {
      setError("That doesn't look like an OpenRouter key. Keys start with sk-or-.");
      return;
    }
    setKey(trimmed, sessionOnly ? "session" : "persistent");
    setInput("");
    setError(null);
    onClose?.();
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        fontFamily: FONT_SANS,
      }}
    >
      <div
        style={{
          background: PAPER,
          color: INK,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 24px 48px -16px rgba(0, 0, 0, 0.3)",
          width: "100%",
          maxWidth: 440,
          margin: "0 16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 20px 14px",
            borderBottom: `1px solid ${HAIRLINE}`,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, color: INK, margin: 0 }}>
            Connect your OpenRouter key
          </h3>
          <p
            style={{
              fontSize: 12.5,
              color: MUTED,
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}
          >
            RBase uses your own OpenRouter API key to run the agent. Your key
            stays in this browser. It never touches our servers (we don&apos;t
            have any).
          </p>
        </div>

        <div style={{ padding: "16px 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                color: INK_STRONG,
                marginBottom: 6,
              }}
            >
              OpenRouter API key
            </label>
            <input
              type="password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder="sk-or-v1-..."
              autoFocus
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                background: PAPER_TINT,
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                color: INK,
                fontFamily: FONT_MONO,
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
              onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
            />
            {error && (
              <p style={{ fontSize: 11, color: DANGER, margin: "6px 0 0" }}>{error}</p>
            )}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: INK_STRONG,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={sessionOnly}
              onChange={(e) => setSessionOnly(e.target.checked)}
              style={{ accentColor: ACCENT }}
            />
            Session only (forget key when I close this tab)
          </label>

          <div style={{ fontSize: 11, color: MUTED }}>
            Don&apos;t have one?{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: ACCENT,
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.color = ACCENT)}
            >
              Create a key on openrouter.ai
            </a>{" "}
            (takes about a minute).
          </div>
        </div>

        <div
          style={{
            padding: "12px 20px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: MUTED,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: FONT_SANS,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: "#FAFAF7",
              background: ACCENT,
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: FONT_SANS,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT_HOVER)}
            onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
          >
            Save and continue
          </button>
        </div>
      </div>
    </div>
  );
}
