"use client";

import type { ReactNode } from "react";
import {
  FONT_MONO,
  FONT_SERIF,
  HAIRLINE,
  INK,
  INK_STRONG,
  MUTED,
} from "./theme";

// Header + Section building blocks for narrow-column document pages
// (Terms, Privacy, future legal/policy pages). Shared so each doc page
// just assembles content; the typography and spacing live here.

export function DocHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <header style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: 24,
          fontFamily: FONT_MONO,
        }}
      >
        <span
          style={{
            width: 28,
            height: 1,
            background: INK,
            display: "inline-block",
          }}
        />
        <span>{eyebrow}</span>
      </div>
      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 72,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          margin: 0,
        }}
        className="rbase-doc-h1"
      >
        {title}
      </h1>
      {lede && (
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.5,
            color: MUTED,
            margin: "24px 0 0",
            maxWidth: 620,
          }}
        >
          {lede}
        </p>
      )}
    </header>
  );
}

export function DocSection({
  num,
  title,
  children,
  last = false,
}: {
  num: string;
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section
      style={{
        padding: "40px 0",
        borderTop: `1px solid ${HAIRLINE}`,
        ...(last ? { borderBottom: `1px solid ${HAIRLINE}` } : {}),
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: MUTED,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {num}
      </div>
      <h2
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 32,
          lineHeight: 1.1,
          letterSpacing: "-0.015em",
          margin: "0 0 20px",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 16,
          lineHeight: 1.65,
          color: INK_STRONG,
          maxWidth: 640,
        }}
      >
        {children}
      </div>
    </section>
  );
}
