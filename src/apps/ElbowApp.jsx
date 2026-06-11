import { useState } from "react";

const LIME  = "#b8ff57";
const BLACK = "#0a0a0a";
const DARK  = "#111111";
const BORDER = "#2a2a2a";
const MUTED = "#555555";
const WHITE = "#ffffff";
const CARD  = "#181818";

export default function ElbowApp() {
  return (
    <div style={{ background: BLACK, minHeight: "100dvh", fontFamily: "'Inter',sans-serif", color: WHITE }}>

      {/* Sticky header */}
      <div style={{ background: DARK, borderBottom: `1px solid ${BORDER}`, position: "sticky",
        top: 0, zIndex: 100, boxShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", height: 58 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: "'Arial Black',Impact,sans-serif", fontSize: 28,
                fontWeight: 900, color: WHITE, letterSpacing: "-1px" }}>TRM</span>
              <span style={{ color: BORDER, fontSize: 18 }}>|</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#777",
                letterSpacing: "0.08em", textTransform: "uppercase" }}>Elbow Testing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming soon body */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`,
          padding: "60px 40px", display: "inline-block", minWidth: 320 }}>

          <div style={{ width: 56, height: 56, borderRadius: "50%",
            background: LIME + "18", border: `2px solid ${LIME}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px", fontSize: 22 }}>
            🦾
          </div>

          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em",
            color: LIME, textTransform: "uppercase", marginBottom: 12 }}>
            Coming Soon
          </div>

          <div style={{ fontSize: 22, fontWeight: 900, color: WHITE, marginBottom: 12 }}>
            Elbow Testing
          </div>

          <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
            Elbow clinical testing tools are under construction. Check back soon.
          </div>

          <div style={{ marginTop: 32 }}>
            <a href="/" style={{ display: "inline-block", padding: "10px 24px", borderRadius: 8,
              background: LIME + "14", border: `1px solid ${LIME}44`, color: LIME,
              fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
              textTransform: "uppercase", textDecoration: "none" }}>
              ← Back to TRM
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 20px", textAlign: "center" }}>
        <span style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, color: WHITE, fontSize: 13 }}>TRM</span>
        <span style={{ color: MUTED, fontSize: 11, marginLeft: 10 }}>
          Elbow Testing — Not a substitute for clinical judgment
        </span>
      </div>

    </div>
  );
}
