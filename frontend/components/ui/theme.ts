// Editorial design tokens. The raw values live in globals.css under
// :root (light) and html.dark (dark), so flipping the theme updates
// every consumer in one place, no hardcoded hex across components.
// Consumers import these string constants and drop them into inline
// styles; the CSS engine resolves the var at render time.

// Surfaces
export const PAPER = "var(--rbase-paper)";
export const PAPER_TINT = "var(--rbase-paper-tint)";

// Ink / foreground
export const INK = "var(--rbase-ink)";
export const INK_STRONG = "var(--rbase-ink-strong)";
export const INK_SOFT = "var(--rbase-ink-soft)";

// Semantic
export const MUTED = "var(--rbase-muted)";
export const FAINT = "var(--rbase-faint)";
export const BORDER = "var(--rbase-border)";
export const HAIRLINE = "var(--rbase-hairline)";
export const CODE_BG = "var(--rbase-code-bg)";
export const ROW_HOVER = "var(--rbase-row-hover)";

// Accent
export const ACCENT = "var(--rbase-accent)";
export const ACCENT_HOVER = "var(--rbase-accent-hover)";
export const ACCENT_SOFT = "var(--rbase-accent-soft)";

// Destructive
export const DANGER = "var(--rbase-danger)";

// Typography (resolved from next/font variables set on the body in layout.tsx)
export const FONT_SANS = "var(--font-inter-tight), system-ui, sans-serif";
export const FONT_SERIF = "var(--font-instrument-serif), serif";
export const FONT_MONO = "var(--font-jetbrains-mono), ui-monospace, monospace";

// External references
export const APP_HREF = "/projects";
export const GITHUB_HREF = "https://github.com/nmaximiano/rbase";
