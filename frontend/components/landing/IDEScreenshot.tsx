"use client";

// Pure-HTML mock of the RBase IDE. Mirrors the real session view:
// thin toolbar → 3-column workspace (env sidebar | center editor+console |
// agent full-height). Chrome uses editorial theme vars (theme-aware);
// syntax colors are intentionally fixed.

const SYNTAX_ASSIGN = "oklch(0.42 0.12 20)";
const SYNTAX_STRING = "oklch(0.45 0.09 130)";

interface Props {
  accent?: string;
  accentSoft?: string;
  scale?: number;
}

export default function IDEScreenshot({
  accent = "var(--rbase-accent)",
  accentSoft = "var(--rbase-accent-soft)",
  scale = 1,
}: Props) {
  const bg = "var(--rbase-paper)";
  const panel = "var(--rbase-paper-tint)";
  const border = "var(--rbase-hairline)";
  const borderStrong = "var(--rbase-border)";
  const dim = "var(--rbase-muted)";
  const faint = "var(--rbase-faint)";
  const text = "var(--rbase-ink)";
  const s = (n: number) => n * scale;
  const mono = "var(--font-jetbrains-mono), ui-monospace, monospace";
  const sans = "var(--font-inter-tight), sans-serif";

  const eyebrowStyle: React.CSSProperties = {
    fontFamily: sans,
    fontSize: s(9.5),
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: faint,
  };

  // R-object tabs across the top of the center column.
  const objectTabs: Array<{ label: string; active: boolean; count?: string; script?: boolean }> = [
    { label: "analysis.R", active: true, script: true },
    { label: "gapminder", active: false, count: "2k" },
    { label: "gm_2007", active: false, count: "142" },
  ];

  // R objects in the environment sidebar.
  const envRows: Array<{ name: string; meta: string; active?: boolean }> = [
    { name: "gapminder", meta: "1704 × 6", active: true },
    { name: "gm_2007", meta: "142 × 6" },
    { name: "model", meta: "lm" },
  ];

  // Agent-authored ggplot2 code shown in the editor.
  const codeLines: Array<[string, ...string[]]> = [
    ["1", "library", "(", "tidyverse", ")"],
    ["2", "library", "(", "gapminder", ")"],
    ["3", ""],
    ["4", "gm_2007 ", "<- ", "gapminder ", "%>% ", "filter", "(year == 2007)"],
    ["5", ""],
    ["6", "ggplot", "(gm_2007, ", "aes", "(x = gdpPercap, y = lifeExp)) +"],
    ["7", "  ", "geom_point", '(alpha = 0.55, color = "#4d6be8") +'],
    ["8", "  ", "geom_smooth", '(method = "lm", se = ', "FALSE", ","],
    ["9", '              color = "#0e0e0c", linewidth = 0.7) +'],
    ["10", "  ", "scale_x_log10", "() +"],
    ["11", "  ", "theme_minimal", "() +"],
    ["12", "  ", "labs", '(title = "Life expectancy vs GDP per capita",'],
    ["13", '       subtitle = "Gapminder, 2007")'],
  ];

  const keywordSet = new Set([
    "library",
    "filter",
    "ggplot",
    "aes",
    "geom_point",
    "geom_smooth",
    "scale_x_log10",
    "theme_minimal",
    "labs",
    "FALSE",
  ]);

  // Scatter of ~40 country-years across log-GDP vs life-expectancy,
  // shaped to match the real 2007 gapminder cloud: dense cluster in
  // the lower-left (sub-Saharan Africa), a long middle band (Asia +
  // Americas), tight upper-right cluster (Europe + Oceania), and a
  // few outliers above/below the fit.
  const scatterPoints: Array<[number, number]> = [
    // Lower-left: low GDP / lower life exp
    [18, 182], [26, 178], [32, 188], [42, 172], [38, 160], [48, 176],
    [56, 165], [62, 152], [52, 158], [70, 142], [66, 170], [76, 135],
    // Middle band
    [85, 128], [92, 118], [102, 108], [108, 122], [112, 100], [120, 88],
    [118, 112], [128, 80], [134, 95], [142, 75], [148, 68], [144, 85],
    // Upper-right: high GDP / high life exp
    [156, 60], [162, 48], [168, 52], [176, 44], [182, 38], [186, 32],
    [196, 36], [202, 28], [206, 24], [214, 26], [220, 20], [210, 32],
    // A few honest outliers
    [80, 55], [104, 135], [158, 124], [54, 105],
  ];

  // Linear regression overlay (straight on log-x). Matches the
  // geom_smooth(method = "lm") call in the displayed code.
  const regressionLine = { x1: 12, y1: 172, x2: 228, y2: 28 };

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 10",
        background: bg,
        border: `1px solid ${borderStrong}`,
        borderRadius: s(10),
        overflow: "hidden",
        fontFamily: mono,
        fontSize: s(10),
        color: text,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 24px 48px -24px rgba(14,14,12,0.18), 0 2px 4px rgba(14,14,12,0.04)",
      }}
    >
      {/* Toolbar: mirrors the real ProjectToolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: s(10),
          padding: `0 ${s(12)}px`,
          height: s(32),
          borderBottom: `1px solid ${border}`,
          background: panel,
          fontFamily: sans,
        }}
      >
        <span style={{ fontSize: s(11), fontWeight: 500, color: text, letterSpacing: "-0.01em" }}>
          gapminder_2007
        </span>
        <span style={{ width: 1, height: s(10), background: border }} />
        <span style={{ fontFamily: mono, fontSize: s(9), color: accent }}>tbl_df</span>
        <span style={{ fontFamily: mono, fontSize: s(9), color: dim, fontVariantNumeric: "tabular-nums" }}>
          · 1,704 × 6
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ color: dim, display: "flex", alignItems: "center" }}>
          <svg width={s(13)} height={s(13)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </span>
      </div>

      {/* Main: sidebar | center | agent (full height) */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: `${s(222)}px 1fr ${s(300)}px`, minHeight: 0 }}>
        {/* Left sidebar: icon rail + Environment panel */}
        <div style={{ display: "flex", minWidth: 0, borderRight: `1px solid ${border}` }}>
          <div
            style={{
              width: s(32),
              flexShrink: 0,
              background: panel,
              borderRight: `1px solid ${border}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: s(6),
              gap: s(4),
            }}
          >
            <div
              style={{
                width: s(22),
                height: s(22),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: bg,
                color: accent,
              }}
            >
              <svg width={s(12)} height={s(12)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
              </svg>
            </div>
            <div
              style={{
                width: s(22),
                height: s(22),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: dim,
              }}
            >
              <svg width={s(12)} height={s(12)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column"}}>
            <div
              style={{
                ...eyebrowStyle,
                padding: `${s(6)}px ${s(10)}px`,
                borderBottom: `1px solid ${border}`,
              }}
            >
              Environment
            </div>
            <div style={{ padding: `${s(4)}px 0`, flex: 1 }}>
              {envRows.map((row) => (
                <div
                  key={row.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: s(6),
                    padding: `${s(2)}px ${s(10)}px`,
                    fontFamily: mono,
                    fontSize: s(10),
                    color: row.active ? accent : dim,
                    fontWeight: row.active ? 500 : 400,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.name}
                  </span>
                  <span style={{ fontSize: s(8.5), color: faint, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {row.meta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: tabs + editor + console */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, borderRight: `1px solid ${border}` }}>
          <div
            style={{
              display: "flex",
              height: s(28),
              borderBottom: `1px solid ${border}`,
              background: panel,
              fontFamily: mono,
              fontSize: s(10),
            }}
          >
            {objectTabs.map((t) => (
              <div
                key={t.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: s(5),
                  padding: `0 ${s(10)}px`,
                  borderRight: `1px solid ${border}`,
                  background: t.active ? bg : "transparent",
                  color: t.active ? text : dim,
                  fontWeight: t.active ? 500 : 400,
                }}
              >
                <span>{t.label}</span>
                {t.count && (
                  <span style={{ fontSize: s(8.5), color: faint, fontVariantNumeric: "tabular-nums" }}>
                    {t.count}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: `${s(10)}px ${s(6)}px`, flex: 1, minHeight: 0, overflow: "hidden" }}>
            {codeLines.map(([ln, ...parts], i) => (
              <div key={i} style={{ display: "flex", gap: s(10), lineHeight: 1.65 }}>
                <span style={{ color: faint, width: s(16), textAlign: "right", flexShrink: 0 }}>{ln}</span>
                <span style={{ whiteSpace: "pre" }}>
                  {parts.map((p, j) => {
                    let c = text;
                    if (p.startsWith("#")) c = faint;
                    else if (keywordSet.has(p)) c = accent;
                    else if (p === "<- " || p === "%>% ") c = SYNTAX_ASSIGN;
                    else if (p.startsWith('"')) c = SYNTAX_STRING;
                    return (
                      <span key={j} style={{ color: c }}>
                        {p}
                      </span>
                    );
                  })}
                </span>
              </div>
            ))}
          </div>

          <div style={{ height: "26%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div
              style={{
                ...eyebrowStyle,
                padding: `${s(6)}px ${s(10)}px`,
                borderTop: `1px solid ${border}`,
                borderBottom: `1px solid ${border}`,
              }}
            >
              Console
            </div>
            <div style={{ padding: `${s(6)}px ${s(10)}px`, lineHeight: 1.6, overflow: "hidden", flex: 1 }}>
              <div>
                <span style={{ color: accent }}>&gt;</span> summary(gm_2007$lifeExp)
              </div>
              <div style={{ whiteSpace: "pre" }}>
                {"   Min. 1st Qu.  Median    Mean 3rd Qu.    Max."}
              </div>
              <div style={{ whiteSpace: "pre" }}>
                {"  39.61   57.16   71.94   67.01   76.41   82.60"}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Agent, full height. User bubble + assistant prose + plot card */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              height: s(28),
              borderBottom: `1px solid ${border}`,
              background: panel,
              fontFamily: sans,
              fontSize: s(10),
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                padding: `0 ${s(14)}px`,
                display: "flex",
                alignItems: "center",
                background: bg,
                color: text,
                fontWeight: 500,
                borderRight: `1px solid ${border}`,
              }}
            >
              Agent
            </div>
            <div
              style={{
                padding: `0 ${s(14)}px`,
                display: "flex",
                alignItems: "center",
                background: panel,
                color: dim,
                borderRight: `1px solid ${border}`,
              }}
            >
              Config
            </div>
            <div style={{ flex: 1 }} />
          </div>

          <div
            style={{
              flex: 1,
              padding: s(12),
              fontFamily: sans,
              fontSize: s(10),
              lineHeight: 1.55,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: s(10),
            }}
          >
            {/* User message: accent bubble on the right */}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingLeft: s(28) }}>
              <div
                style={{
                  background: accent,
                  color: "#FAFAF7",
                  padding: `${s(5)}px ${s(9)}px`,
                  borderRadius: s(10),
                  borderBottomRightRadius: s(3),
                  fontSize: s(10),
                  lineHeight: 1.45,
                }}
              >
                Plot life expectancy against GDP per capita for 2007, with a regression line.
              </div>
            </div>

            {/* Assistant prose: plain text on the left, like AssistantMessageItem */}
            <div style={{ paddingRight: s(28), display: "flex", flexDirection: "column", gap: s(6) }}>
              <div>
                Filtered{" "}
                <code style={{ background: accentSoft, padding: "1px 4px", borderRadius: 3, fontFamily: mono, fontSize: s(9) }}>
                  gapminder
                </code>{" "}
                to 2007 into{" "}
                <code style={{ background: accentSoft, padding: "1px 4px", borderRadius: 3, fontFamily: mono, fontSize: s(9) }}>
                  gm_2007
                </code>{" "}
                (142 countries). Plotted{" "}
                <code style={{ background: accentSoft, padding: "1px 4px", borderRadius: 3, fontFamily: mono, fontSize: s(9) }}>
                  lifeExp
                </code>{" "}
                against log(
                <code style={{ background: accentSoft, padding: "1px 4px", borderRadius: 3, fontFamily: mono, fontSize: s(9) }}>
                  gdpPercap
                </code>
                ), with a linear{" "}
                <code style={{ background: accentSoft, padding: "1px 4px", borderRadius: 3, fontFamily: mono, fontSize: s(9) }}>
                  geom_smooth
                </code>{" "}
                on top.
              </div>
            </div>

            {/* Plot card: matches PlotMessageItem's bordered card. Square. */}
            <div style={{ paddingRight: s(28) }}>
              <div
                style={{
                  border: `1px solid ${border}`,
                  borderRadius: s(6),
                  overflow: "hidden",
                  background: "#fff",
                  aspectRatio: "1 / 1",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ padding: `${s(8)}px ${s(10)}px ${s(4)}px` }}>
                  <div style={{ fontSize: s(10), fontWeight: 500, color: text }}>
                    Life expectancy vs GDP per capita
                  </div>
                  <div style={{ fontSize: s(8.5), color: faint }}>Gapminder, 2007 (log x)</div>
                </div>
                <svg
                  viewBox="0 0 240 200"
                  style={{ flex: 1, width: "100%", display: "block" }}
                  preserveAspectRatio="none"
                >
                  {/* Faint horizontal grid */}
                  {[0.25, 0.5, 0.75].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      x2="240"
                      y1={y * 200}
                      y2={y * 200}
                      stroke="var(--rbase-code-bg)"
                      strokeDasharray="2 3"
                    />
                  ))}
                  {/* Scatter: one dot per country-year */}
                  {scatterPoints.map(([x, y], i) => (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="2.4"
                      fill={accent}
                      fillOpacity="0.55"
                    />
                  ))}
                  {/* Linear regression overlay */}
                  <line
                    x1={regressionLine.x1}
                    y1={regressionLine.y1}
                    x2={regressionLine.x2}
                    y2={regressionLine.y2}
                    stroke="var(--rbase-ink)"
                    strokeWidth="1.2"
                    strokeOpacity="0.75"
                  />
                </svg>
              </div>
            </div>

            {/* Follow-up agent prose after the plot */}
            <div style={{ paddingRight: s(28), display: "flex", flexDirection: "column", gap: s(6) }}>
              <div>
                Richer countries tend to live longer. The log-linear fit explains about 66% of
                the variance. Countries sitting well below the line typically had acute
                public-health crises in the 2000s.
              </div>
              <div>
                Want me to color the points by continent, fit separate slopes per region, or
                compare this against 1957 to see how the trend has shifted?
              </div>
            </div>
          </div>

          <div
            style={{
              padding: s(8),
              borderTop: `1px solid ${border}`,
              display: "flex",
              gap: s(6),
              alignItems: "center",
            }}
          >
            <div
              style={{
                flex: 1,
                padding: `${s(5)}px ${s(8)}px`,
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: s(4),
                fontFamily: sans,
                fontSize: s(9),
                color: faint,
              }}
            >
              Ask the agent…
            </div>
            <div style={{ width: s(20), height: s(20), borderRadius: s(4), background: accent }} />
          </div>
        </div>
      </div>
    </div>
  );
}
