// Loading placeholder for the project workspace. Mirrors the real
// layout (combined toolbar + nav → sidebar w/ stacked Env+Plots |
// center w/ tabs + data + console | right chat panel) so the
// transition into the hydrated page doesn't jump. The IDE page has
// no standalone <Nav>. Session name + Dashboard link + settings
// gear live in the toolbar.
export function ProjectSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-surface-alt">
      {/* Combined toolbar: h-11, paper-tint. Left: name + metadata chips.
          Right: Projects button + gear placeholders. */}
      <div className="shrink-0 border-b border-border bg-surface-alt">
        <div className="flex items-center gap-3 px-4 h-11">
          <div className="h-3.5 w-36 bg-surface animate-pulse" />
          <div className="h-3 w-px bg-border" />
          <div className="h-3 w-16 bg-surface-alt animate-pulse" />
          <div className="ml-auto flex items-center gap-1">
            <div className="h-[22px] w-20 bg-surface-alt animate-pulse" style={{ border: "1px solid var(--rbase-hairline)", borderRadius: 4 }} />
            <div className="h-[34px] w-[34px] bg-surface-alt animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Content: sidebar + center + chat */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left sidebar: icon rail + active panel (Environment by default) */}
        <div
          className="shrink-0 flex flex-row bg-surface border-r border-border"
          style={{ width: "300px" }}
        >
          {/* Icon rail: paper-tint chrome */}
          <div
            className="shrink-0 flex flex-col items-center pt-2 gap-1 border-r border-border"
            style={{ width: "40px", background: "var(--rbase-paper-tint)" }}
          >
            {[0, 1].map((i) => (
              <div key={i} className="h-8 w-8 bg-surface-alt animate-pulse" />
            ))}
          </div>
          {/* Active panel (Environment) */}
          <div className="flex-1 flex flex-col min-w-0">
            <div
              className="shrink-0 flex items-center h-9 px-3"
              style={{ borderBottom: "1px solid var(--rbase-hairline)" }}
            >
              <span className="rbase-eyebrow">Environment</span>
            </div>
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="h-3 w-32 bg-surface-alt animate-pulse" />
            </div>
          </div>
        </div>

        {/* Column resize handle */}
        <div className="rbase-drag-v" />

        {/* Center column: tabs + table + console */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TabBar: h-9, paper-tint row with a single selected Script tab on
              paper. Mirrors the real loaded state (Script tab is always first
              and active by default) so the transition doesn't reflow. */}
          <div
            className="shrink-0 flex items-center border-b border-border h-9"
            style={{ background: "var(--rbase-paper-tint)" }}
          >
            <div
              className="flex items-center h-full px-3"
              style={{
                background: "var(--rbase-paper)",
                borderRight: "1px solid var(--rbase-hairline)",
              }}
            >
              <div className="h-3 w-24 bg-surface-alt animate-pulse" />
            </div>
          </div>
          {/* Script editor area: paper bg to match ScriptEditor */}
          <div className="flex-1 bg-surface" />
          {/* Drag handle */}
          <div className="rbase-drag-h" />
          {/* Console header: h-9 eyebrow */}
          <div
            className="shrink-0 flex items-center h-9 px-3 bg-surface"
            style={{ borderBottom: "1px solid var(--rbase-hairline)" }}
          >
            <span className="rbase-eyebrow">Console</span>
          </div>
          {/* Console body */}
          <div className="shrink-0 bg-surface" style={{ height: "420px" }}>
            <div className="flex items-center gap-2 px-3 pt-2">
              <div className="h-3 w-3 bg-surface-alt animate-pulse" />
              <div className="h-3 w-48 bg-surface-alt animate-pulse" />
            </div>
          </div>
        </div>

        {/* Column resize handle */}
        <div className="rbase-drag-v" />

        {/* Chat panel */}
        <div className="shrink-0 w-[480px] border-l border-border bg-surface flex flex-col">
          {/* Chat header: h-9, tinted row, MiniTab placeholders (active paper, inactive tint) */}
          <div
            className="shrink-0 flex items-center h-9 bg-surface-alt"
            style={{ borderBottom: "1px solid var(--rbase-hairline)" }}
          >
            <div
              className="h-full w-24 bg-surface"
              style={{ borderRight: "1px solid var(--rbase-hairline)" }}
            />
            <div
              className="h-full w-24 bg-surface-alt animate-pulse"
              style={{ borderRight: "1px solid var(--rbase-hairline)" }}
            />
          </div>
          {/* Chat empty state */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="h-8 w-8 bg-surface-alt animate-pulse mb-3" />
            <div className="h-4 w-40 bg-surface-alt animate-pulse mb-2" />
            <div className="h-3 w-56 bg-surface-alt animate-pulse" />
          </div>
          {/* Chat input */}
          <div className="shrink-0 px-4 pb-4 pt-2">
            <div className="h-[52px] border border-border bg-surface-alt rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
