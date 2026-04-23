"use client";

import { useState } from "react";
import { useApiKey } from "@/lib/key/useApiKey";
import { maskKey } from "@/lib/key/keyStore";
import ApiKeyModal from "./ApiKeyModal";
import {
  ACCENT,
  ACCENT_HOVER,
  DANGER,
  FAINT,
  FONT_MONO,
  FONT_SANS,
  MUTED,
} from "@/components/ui/theme";

export default function KeyManager() {
  const { key, mode, clearKey } = useApiKey();
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div style={{ fontSize: 12, fontFamily: FONT_SANS }}>
      {key ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontFamily: FONT_MONO, color: MUTED }}>{maskKey(key)}</span>
            <span style={{ fontSize: 11, color: FAINT }}>
              {mode === "session" ? "session only" : "this browser"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <LinkButton onClick={() => setShowEditor(true)} color={ACCENT} hover={ACCENT_HOVER}>
              Replace
            </LinkButton>
            <LinkButton onClick={clearKey} color={DANGER} hover={DANGER}>
              Forget key
            </LinkButton>
          </div>
        </div>
      ) : (
        <LinkButton onClick={() => setShowEditor(true)} color={ACCENT} hover={ACCENT_HOVER}>
          Connect OpenRouter key
        </LinkButton>
      )}
      <ApiKeyModal open={showEditor} onClose={() => setShowEditor(false)} />
    </div>
  );
}

// Small underlined-text button, shared across KeyManager's states so
// the affordances look consistent.
function LinkButton({
  onClick,
  color,
  hover,
  children,
}: {
  onClick: () => void;
  color: string;
  hover: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.color = hover)}
      onMouseLeave={(e) => (e.currentTarget.style.color = color)}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        color,
        textDecoration: "underline",
        textUnderlineOffset: 2,
        cursor: "pointer",
        fontFamily: FONT_SANS,
        fontSize: 12,
      }}
    >
      {children}
    </button>
  );
}
