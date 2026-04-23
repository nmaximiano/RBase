"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import RBaseMark from "./RBaseMark";
import {
  ACCENT,
  FONT_SANS,
  HAIRLINE,
  INK,
  MUTED,
  PAPER,
} from "./theme";

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
  active?: boolean;
  /** Render as plain text, not a link. For coming-soon placeholders. */
  disabled?: boolean;
}

interface Props {
  /** Left-to-right nav links after the logo. */
  links?: NavLink[];
  /** Primary CTA button at the far right. */
  cta?: { label: string; href: string; external?: boolean };
  /** Custom content inserted before the CTA (e.g. a settings menu). */
  rightSlot?: ReactNode;
  /** Where the logo links to. Default "/". */
  homeHref?: string;
}

export default function Nav({
  links,
  cta,
  rightSlot,
  homeHref = "/",
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "22px 56px",
        borderBottom: `1px solid ${HAIRLINE}`,
        background: PAPER,
        fontFamily: FONT_SANS,
      }}
      className="rbase-ui-nav"
    >
      <Link href={homeHref} style={{ textDecoration: "none" }}>
        <RBaseMark size={26} />
      </Link>
      {links && links.length > 0 && (
        <nav
          style={{
            display: "flex",
            gap: 32,
            marginLeft: 56,
            fontSize: 14,
            color: MUTED,
          }}
          className="rbase-ui-navlinks"
        >
          {links.map((link) => {
            const style = {
              color: link.active ? INK : MUTED,
              textDecoration: "none",
            };
            if (link.disabled) {
              // Render as a real <a> so styling + cursor match working
              // links exactly; preventDefault makes it a no-op for now.
              return (
                <a
                  key={link.label}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  style={style}
                >
                  {link.label}
                </a>
              );
            }
            return link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={style}
              >
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href} style={style}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 10,
          alignItems: "center",
          fontSize: 14,
        }}
      >
        {/* CTA first, then rightSlot: the settings gear always sits
            rightmost for cross-page consistency (projects/terms/privacy
            have no CTA; the landing page does, and the gear should still
            be the last element). */}
        {cta && <NavCTA {...cta} />}
        {rightSlot}
      </div>
    </div>
  );
}

function NavCTA({
  label,
  href,
  external,
}: {
  label: string;
  href: string;
  external?: boolean;
}) {
  const style = {
    background: ACCENT,
    color: PAPER,
    textDecoration: "none",
    padding: "8px 14px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
  };
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
      {label}
    </a>
  ) : (
    <Link href={href} style={style}>
      {label}
    </Link>
  );
}
