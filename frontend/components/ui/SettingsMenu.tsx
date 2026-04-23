"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import KeyManager from "@/components/settings/KeyManager";
import { useTheme } from "@/lib/hooks/useTheme";
import {
  BORDER,
  DANGER,
  FONT_MONO,
  FONT_SANS,
  GITHUB_HREF,
  HAIRLINE,
  INK,
  MUTED,
  PAPER,
  ROW_HOVER,
} from "./theme";

export interface SettingsAction {
  label: string;
  hint?: string;
  destructive?: boolean;
  onClick: () => void;
}

interface Props {
  /** Optional extra action rows rendered in their own grouped section
      before the footer links. Intended for page-specific workflow
      actions (e.g. the session page's three reset options). */
  actions?: SettingsAction[];
  /** Eyebrow label above the actions group. Defaults to 'Reset'. */
  actionsLabel?: string;
}

// Gear icon + paper/ink dropdown. Drop into any Nav's rightSlot.
// Contains: OpenRouter key controls, theme toggle, optional page-specific
// actions, links to GitHub / Terms / Privacy. Reads theme state internally
// via useTheme so both client and server pages can drop it in without
// threading props.
export default function SettingsMenu({ actions, actionsLabel = "Reset" }: Props = {}) {
  const { theme, toggle: toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: MUTED,
          padding: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = INK)}
        onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
      >
        <GearIcon />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: PAPER,
            color: INK,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.18)",
            minWidth: 300,
            zIndex: 60,
            fontFamily: FONT_SANS,
            fontSize: 13,
          }}
        >
          <Block>
            <Eyebrow>OpenRouter key</Eyebrow>
            <div style={{ marginTop: 6 }}>
              <KeyManager />
            </div>
          </Block>

          <MenuItem
            onClick={toggleTheme}
            trailing={theme === "dark" ? <SunIcon /> : <MoonIcon />}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </MenuItem>

          {actions && actions.length > 0 && (
            <>
              <Divider />
              <div style={{ padding: "10px 14px 6px" }}>
                <div className="rbase-eyebrow">{actionsLabel}</div>
              </div>
              {actions.map((a) => (
                <ActionRow
                  key={a.label}
                  action={a}
                  onRun={() => {
                    setOpen(false);
                    a.onClick();
                  }}
                />
              ))}
            </>
          )}

          <Divider />

          <MenuLink href={GITHUB_HREF} external>
            View on GitHub
          </MenuLink>
          <MenuLink href="/terms">Terms</MenuLink>
          <MenuLink href="/privacy">Privacy</MenuLink>
        </div>
      )}
    </div>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 14px", borderBottom: `1px solid ${HAIRLINE}` }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: 10,
        color: MUTED,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${HAIRLINE}` }} />;
}

function ActionRow({
  action,
  onRun,
}: {
  action: SettingsAction;
  onRun: () => void;
}) {
  const titleColor = action.destructive ? DANGER : INK;
  return (
    <button
      type="button"
      onClick={onRun}
      onMouseEnter={(e) => (e.currentTarget.style.background = ROW_HOVER)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 14px 10px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: FONT_SANS,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: titleColor, marginBottom: 2 }}>
        {action.label}
      </div>
      {action.hint && (
        <div
          style={{
            fontSize: 11,
            color: MUTED,
            fontFamily: FONT_MONO,
          }}
        >
          {action.hint}
        </div>
      )}
    </button>
  );
}

function MenuItem({
  children,
  onClick,
  color,
  trailing,
}: {
  children: React.ReactNode;
  onClick: () => void;
  color?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = ROW_HOVER)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 14px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: color ?? INK,
        fontFamily: FONT_SANS,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span>{children}</span>
      {trailing}
    </button>
  );
}

function MenuLink({
  children,
  href,
  external = false,
}: {
  children: React.ReactNode;
  href: string;
  external?: boolean;
}) {
  const style = {
    display: "block",
    padding: "10px 14px",
    color: MUTED,
    textDecoration: "none",
    fontSize: 13,
    fontFamily: FONT_SANS,
  } as const;
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.background = ROW_HOVER;
    (e.currentTarget as HTMLElement).style.color = INK;
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.background = "transparent";
    (e.currentTarget as HTMLElement).style.color = MUTED;
  };
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </a>
  ) : (
    <Link href={href} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
    </Link>
  );
}

function GearIcon() {
  return (
    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}
