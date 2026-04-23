"use client";

import { INK } from "./theme";

// Brand constants: the mark itself looks identical in light and dark
// mode. These are deliberately NOT pulled from theme.ts: the cobalt
// square and off-white R are the logo, not UI accents that should
// theme-shift. Only the "Base" wordmark text follows the page theme.
const BRAND_COLOR = "oklch(0.45 0.12 255)";
const BRAND_ON_COLOR = "#FAFAF7";

interface Props {
  size?: number;
  /** Override the square color. Defaults to the brand cobalt. */
  color?: string;
  /** Swap: off-white square with a brand-colored R. For dark/accent backgrounds. */
  inverted?: boolean;
}

// RBase wordmark. R sits inside a cobalt square; "Base" follows in the
// body face. Centering uses SVG so it's pixel-accurate regardless of
// font metrics.
export default function RBaseMark({
  size = 24,
  color = BRAND_COLOR,
  inverted = false,
}: Props) {
  const squareBg = inverted ? BRAND_ON_COLOR : color;
  const rColor = inverted ? color : BRAND_ON_COLOR;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.25,
        fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
        fontWeight: 600,
        fontSize: size * 0.88,
        color: INK,
        letterSpacing: "-0.01em",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ flexShrink: 0, display: "block" }}
        aria-hidden="true"
      >
        <rect width={size} height={size} rx={size * 0.12} fill={squareBg} />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill={rColor}
          fontFamily="var(--font-instrument-serif), serif"
          fontSize={size * 0.8}
          fontStyle="italic"
          fontWeight={400}
        >
          R
        </text>
      </svg>
      <span>Base</span>
    </div>
  );
}
