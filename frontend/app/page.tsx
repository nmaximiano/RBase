"use client";

import Link from "next/link";
import Nav from "@/components/ui/Nav";
import Footer from "@/components/ui/Footer";
import RBaseMark from "@/components/ui/RBaseMark";
import SettingsMenu from "@/components/ui/SettingsMenu";
import IDEScreenshot from "@/components/landing/IDEScreenshot";
import {
  ACCENT,
  ACCENT_SOFT,
  APP_HREF,
  BORDER,
  FONT_MONO,
  FONT_SANS,
  FONT_SERIF,
  GITHUB_HREF,
  HAIRLINE,
  INK,
  INK_SOFT,
  INK_STRONG,
  MUTED,
  PAPER,
} from "@/components/ui/theme";

// Landing page. Paper/ink palette, serif-led. Visual language is
// intentionally isolated from the app's --color-* theme tokens so
// light/dark mode in the IDE doesn't affect this surface. Nav and
// Footer chrome come from components/ui/ and are shared with other
// marketing/content pages as they're ported.

export default function LandingPage() {
  return (
    <div style={{ background: PAPER, color: INK, fontFamily: FONT_SANS, minHeight: "100vh" }}>
      <Nav
        links={[
          { label: "Capabilities", href: "#capabilities" },
          { label: "Comparison", href: "#comparison" },
          { label: "GitHub", href: GITHUB_HREF, external: true },
        ]}
        rightSlot={<SettingsMenu />}
        cta={{ label: "Open RBase →", href: APP_HREF }}
      />
      <Hero />
      <HeroScreenshot />
      <TechStrip />
      <Features />
      <Comparison />
      <ClosingCTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <div style={{ padding: "88px 56px 40px", maxWidth: 1180, margin: "0 auto" }} className="rbase-landing-hero">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: 40,
        }}
      >
        <span>Vol. 01 — An R IDE that runs in your browser</span>
      </div>

      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 112,
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          margin: 0,
          maxWidth: 1000,
          textWrap: "pretty",
        }}
        className="rbase-landing-h1"
      >
        R,{" "}
        <span style={{ fontStyle: "italic" }}>without the friction.</span>
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 80,
          marginTop: 44,
          alignItems: "end",
        }}
        className="rbase-landing-herogrid"
      >
        <p
          style={{
            fontSize: 20,
            lineHeight: 1.45,
            color: INK_SOFT,
            margin: 0,
            maxWidth: 560,
            textWrap: "pretty",
          }}
        >
          A modern IDE and an AI agent that writes statistics; in your browser, on your data.
          No install, no account, no server.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <Link
              href={APP_HREF}
              style={{
                background: ACCENT,
                color: PAPER,
                textDecoration: "none",
                padding: "14px 22px",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              Try it — no login
            </Link>
            <div style={{ fontSize: 13, color: MUTED }}>
              No account. No install.
            </div>
          </div>
          <a
            href={GITHUB_HREF}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "transparent",
              color: INK,
              textDecoration: "none",
              border: `1px solid ${BORDER}`,
              padding: "14px 22px",
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

function HeroScreenshot() {
  return (
    <div style={{ padding: "0 56px 88px", maxWidth: 1280, margin: "0 auto" }} className="rbase-landing-shot">
      <div style={{ marginTop: 32 }}>
        <IDEScreenshot accent={ACCENT} accentSoft={ACCENT_SOFT} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 14,
          fontSize: 12,
          color: MUTED,
          fontFamily: FONT_MONO,
        }}
      >
        <span>fig. 01 — a project in RBase, rendered in your browser</span>
        <span>tryrbase.com</span>
      </div>
    </div>
  );
}

function TechStrip() {
  const items = [
    { label: "WebR", style: "italic" as const },
    { label: "DuckDB-WASM" },
    { label: "OpenRouter" },
    { label: "Apache-2.0", style: "italic" as const },
    { label: "Next.js" },
  ];
  return (
    <div
      style={{
        borderTop: `1px solid ${HAIRLINE}`,
        borderBottom: `1px solid ${HAIRLINE}`,
        padding: "24px 56px",
        display: "flex",
        alignItems: "center",
        gap: 48,
        fontFamily: FONT_SERIF,
        fontSize: 22,
        color: MUTED,
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
      className="rbase-landing-strip"
    >
      <span
        style={{
          fontSize: 11,
          fontFamily: FONT_SANS,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Built with
      </span>
      {items.map((item) => (
        <span key={item.label} style={{ fontStyle: item.style }}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    num: "01",
    title: "An agent that writes R",
    body:
      "Describe the analysis. The agent drafts the code, runs it, reads the output, and iterates. It shows its work, cites what it used, and never sends your data anywhere. Calls go from your browser directly to your LLM provider.",
    foot: "Claude · Gemini · GPT · DeepSeek",
  },
  {
    num: "02",
    title: "The R you know",
    body:
      "dplyr, ggplot2, lubridate, stringr: the full tidyverse compiled to WebAssembly. Fit models, draw plots, write pipelines just like you would locally. A full R session boots in a few seconds.",
    foot: "WebR · tidyverse · base R",
  },
  {
    num: "03",
    title: "Work anywhere, iterate fast",
    body:
      "Open a project on a Chromebook, pick it up on your laptop. A live R REPL, instant ggplot previews, and a DuckDB-backed table that stays responsive on millions of rows. No VPN, no setup, no tears.",
    foot: "Chromebook · iPad · any browser",
  },
];

function Features() {
  return (
    <div
      id="capabilities"
      style={{
        padding: "88px 56px",
        maxWidth: 1180,
        margin: "0 auto",
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
      className="rbase-landing-section"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 64,
          marginBottom: 56,
        }}
        className="rbase-landing-sectionhead"
      >
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>
          01 — Capabilities
        </div>
        <h2
          style={{
            fontFamily: FONT_SERIF,
            fontWeight: 400,
            fontSize: 52,
            lineHeight: 1.05,
            margin: 0,
            letterSpacing: "-0.015em",
            maxWidth: 700,
          }}
          className="rbase-landing-h2"
        >
          Everything you ran in RStudio, and an agent who{" "}
          <span style={{ fontStyle: "italic" }}>actually reads the docs</span>.
        </h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          background: HAIRLINE,
          border: `1px solid ${HAIRLINE}`,
        }}
        className="rbase-landing-featuregrid"
      >
        {FEATURES.map((f) => (
          <div
            key={f.num}
            style={{
              background: PAPER,
              padding: "36px 32px 32px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: MUTED, marginBottom: 28 }}>{f.num}</div>
            <h3
              style={{
                fontFamily: FONT_SERIF,
                fontWeight: 400,
                fontSize: 26,
                lineHeight: 1.15,
                margin: "0 0 14px",
                letterSpacing: "-0.01em",
              }}
            >
              {f.title}
            </h3>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.55,
                color: INK_SOFT,
                margin: "0 0 28px",
                textWrap: "pretty",
              }}
            >
              {f.body}
            </p>
            <div
              style={{
                marginTop: "auto",
                paddingTop: 18,
                borderTop: `1px solid ${HAIRLINE}`,
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: MUTED,
              }}
            >
              {f.foot}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const COMPARE_ROWS: Array<[string, string, string, string, string]> = [
  ["Native AI agent (reads your data, writes R)", "Included", "Yes (preview)", "Copilot (ext.)", "—"],
  ["Zero install, zero account", "Yes", "Install required", "Install required", "Paid license"],
  ["Runs entirely in the browser", "Yes", "No", "No", "No"],
  ["Works on Chromebook / iPad / any browser", "Yes", "No", "No", "No"],
  ["License", "Apache-2.0", "Elastic 2.0", "AGPL-3.0", "Proprietary"],
  ["Community-built", "Yes", "Corporate (Posit)", "Corporate (Posit)", "Corporate (StataCorp)"],
];

function Comparison() {
  return (
    <div
      id="comparison"
      style={{ padding: "56px 56px 88px", maxWidth: 1180, margin: "0 auto" }}
      className="rbase-landing-section"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 64,
          marginBottom: 40,
        }}
        className="rbase-landing-sectionhead"
      >
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>
          02 — Comparison
        </div>
        <h2
          style={{
            fontFamily: FONT_SERIF,
            fontWeight: 400,
            fontSize: 52,
            lineHeight: 1.05,
            margin: 0,
            letterSpacing: "-0.015em",
            maxWidth: 640,
          }}
          className="rbase-landing-h2"
        >
          How RBase compares to the alternatives.
        </h2>
      </div>

      <div className="rbase-landing-tablewrap" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK}` }}>
              <th style={{ textAlign: "left", padding: "16px 0", fontWeight: 500, width: "34%", fontSize: 13, letterSpacing: "0.02em" }} />
              <th style={{ textAlign: "left", padding: "16px 20px", fontWeight: 500, color: INK, background: ACCENT_SOFT }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <RBaseMark size={18} />
                </div>
              </th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontWeight: 400, color: MUTED }}>Positron</th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontWeight: 400, color: MUTED }}>RStudio</th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontWeight: 400, color: MUTED }}>Stata</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row[0]} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td style={{ padding: "14px 0", color: INK_STRONG }}>{row[0]}</td>
                <td style={{ padding: "14px 20px", background: ACCENT_SOFT, fontWeight: 500, color: ACCENT }}>{row[1]}</td>
                <td style={{ padding: "14px 20px", color: MUTED }}>{row[2]}</td>
                <td style={{ padding: "14px 20px", color: MUTED }}>{row[3]}</td>
                <td style={{ padding: "14px 20px", color: MUTED }}>{row[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClosingCTA() {
  return (
    <div style={{ borderTop: `1px solid ${HAIRLINE}`, padding: "80px 56px", textAlign: "center" }}>
      <h2
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 68,
          lineHeight: 1.02,
          margin: "0 0 10px",
          letterSpacing: "-0.02em",
        }}
        className="rbase-landing-cta-h"
      >
        Start with a dataset.{" "}
        <span style={{ fontStyle: "italic", color: ACCENT }}>End with a result.</span>
      </h2>
      <p style={{ fontSize: 17, color: MUTED, margin: "0 0 32px" }}>
        Free &amp; open source. Bring your own OpenRouter key.
      </p>
      <div style={{ display: "inline-flex", justifyContent: "center" }}>
        <Link
          href={APP_HREF}
          style={{
            background: INK,
            color: PAPER,
            textDecoration: "none",
            padding: "14px 26px",
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          Launch RBase
        </Link>
      </div>
    </div>
  );
}

