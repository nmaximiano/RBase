"use client";

import RBaseMark from "./RBaseMark";
import { FONT_MONO, HAIRLINE, MUTED } from "./theme";

export default function Footer() {
  return (
    <div
      style={{
        borderTop: `1px solid ${HAIRLINE}`,
        padding: "28px 56px",
        display: "flex",
        alignItems: "center",
        fontSize: 12,
        color: MUTED,
        flexWrap: "wrap",
        gap: 16,
      }}
      className="rbase-ui-footer"
    >
      <RBaseMark size={18} />
      <span style={{ marginLeft: "auto", fontFamily: FONT_MONO }}>
        © 2026 RBase · Apache-2.0
      </span>
    </div>
  );
}
