import { useState } from "react";
import { Link } from "react-router-dom";

const tools = [
  {
    id: "acl",
    name: "ACL Testing App",
    description: "Return-to-sport testing battery, limb symmetry index, hop testing & SOAP note generation",
    tag: "LOWER EXTREMITY",
    color: "#aaff00",
    to: "/acl",
  },
  {
    id: "shoulder",
    name: "Shoulder Testing App",
    description: "Scapular & rotator cuff strength, functional testing, SOAP note output & clinical scoring",
    tag: "UPPER EXTREMITY",
    color: "#00d4ff",
    to: "/shoulder",
  },
  {
    id: "apre",
    name: "APRE Calculator",
    description: "Auto-regulatory progressive resistance training with week-to-week QR-coded PDF tracking",
    tag: "STRENGTH & CONDITIONING",
    color: "#ff6b2b",
    to: "/apre",
  },
];

const XMark = ({ style }) => (
  <svg viewBox="0 0 60 60" fill="none" style={style}>
    <line x1="5" y1="5" x2="55" y2="55" stroke="#aaff00" strokeWidth="8" strokeLinecap="round"/>
    <line x1="55" y1="5" x2="5" y2="55" stroke="#aaff00" strokeWidth="8" strokeLinecap="round"/>
  </svg>
);

export default function Home() {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600&family=Barlow+Condensed:wght@700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0a0a0a; overscroll-behavior: none; }
        .trm-root { min-height: 100vh; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); background: #0a0a0a; color: #fff; font-family: 'Barlow', sans-serif; position: relative; overflow: hidden; }
        .trm-bar { background: #aaff00; color: #0a0a0a; font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; padding: 8px 40px; display: flex; align-items: center; gap: 12px; }
        .trm-bar-dot { width: 6px; height: 6px; background: #0a0a0a; border-radius: 50%; flex-shrink: 0; }
        .trm-header { position: relative; z-index: 10; padding: 48px 40px 36px; border-bottom: 3px solid #aaff00; }
        .trm-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 4px; color: #aaff00; text-transform: uppercase; margin-bottom: 10px; }
        .trm-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(52px, 8vw, 88px); line-height: 0.92; letter-spacing: 2px; color: #fff; text-transform: uppercase; }
        .trm-title-accent { color: #aaff00; }
        .trm-subtitle-row { display: flex; align-items: center; gap: 16px; margin-top: 18px; flex-wrap: wrap; }
        .trm-line { height: 2px; width: 40px; background: #aaff00; flex-shrink: 0; }
        .trm-clinic-tag { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 3px; color: #888; text-transform: uppercase; }
        .trm-count { margin-left: auto; background: #aaff00; color: #0a0a0a; font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 2px; padding: 4px 14px; line-height: 1.4; }
        .trm-tool-list { position: relative; z-index: 10; padding: 0 40px 60px; }
        .trm-section-label { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 5px; color: #555; text-transform: uppercase; padding: 28px 0 14px; border-bottom: 1px solid #1e1e1e; }
        .trm-tool-row { display: flex; align-items: center; gap: 24px; padding: 28px 0; border-bottom: 1px solid #1e1e1e; cursor: pointer; text-decoration: none; color: inherit; position: relative; -webkit-tap-highlight-color: transparent; }
        .trm-tool-row::before { content: ''; position: absolute; left: -40px; top: 0; bottom: 0; width: 0; background: var(--accent); transition: width 0.18s ease; }
        .trm-tool-row:hover::before, .trm-tool-row:active::before { width: 5px; }
        .trm-tool-text { flex: 1; }
        .trm-tool-tag { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 4px; color: #555; text-transform: uppercase; margin-bottom: 5px; transition: color 0.15s ease; }
        .trm-tool-row:hover .trm-tool-tag, .trm-tool-row:active .trm-tool-tag { color: var(--accent); }
        .trm-tool-name { font-family: 'Bebas Neue', sans-serif; font-size: clamp(28px, 4.5vw, 46px); text-transform: uppercase; letter-spacing: 2px; color: #fff; line-height: 1; margin-bottom: 8px; transition: color 0.15s ease; }
        .trm-tool-row:hover .trm-tool-name, .trm-tool-row:active .trm-tool-name { color: var(--accent); }
        .trm-tool-desc { font-size: 13.5px; color: #666; line-height: 1.55; max-width: 520px; font-weight: 400; }
        .trm-arrow { flex-shrink: 0; width: 36px; height: 36px; border: 2px solid #2a2a2a; display: flex; align-items: center; justify-content: center; color: #444; transition: all 0.18s ease; }
        .trm-tool-row:hover .trm-arrow, .trm-tool-row:active .trm-arrow { color: var(--accent); border-color: var(--accent); transform: translateX(4px); }
        .trm-footer { position: relative; z-index: 10; padding: 24px 40px; border-top: 1px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .trm-footer-brand { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; color: #aaff00; }
        .trm-footer-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #444; text-transform: uppercase; margin-top: 2px; }
        .trm-footer-right { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #333; text-transform: uppercase; }
        .fade-in { opacity: 0; transform: translateY(14px); animation: fadeUp 0.45s ease forwards; }
        .fade-in:nth-child(1) { animation-delay: 0.05s; }
        .fade-in:nth-child(2) { animation-delay: 0.13s; }
        .fade-in:nth-child(3) { animation-delay: 0.21s; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 600px) {
          .trm-bar { padding: 8px 20px; font-size: 9px; letter-spacing: 2px; }
          .trm-header { padding: 28px 20px 22px; }
          .trm-tool-list { padding: 0 20px 40px; }
          .trm-tool-row::before { left: -20px; }
          .trm-footer { padding: 20px; }
          .trm-tool-desc { display: none; }
          .trm-count { display: none; }
        }
      `}</style>

      <div className="trm-root">
        <XMark style={{ width:160, position:'absolute', top:-24, right:-24, opacity:0.07, pointerEvents:'none', zIndex:1 }} />
        <XMark style={{ width:90, position:'absolute', bottom:100, left:-16, opacity:0.05, pointerEvents:'none', zIndex:1 }} />
        <XMark style={{ width:50, position:'absolute', top:240, right:60, opacity:0.04, pointerEvents:'none', zIndex:1 }} />

        <div className="trm-bar">
          <div className="trm-bar-dot" />
          TRAIN · RECOVER · MOVE — CLINICAL TOOLS
          <div className="trm-bar-dot" />
        </div>

        <header className="trm-header">
          <div className="trm-eyebrow">Outpatient Orthopedic Physical Therapy</div>
          <div className="trm-title">
            TRM<br />
            <span className="trm-title-accent">CLINIC</span><br />
            TOOLS
          </div>
          <div className="trm-subtitle-row">
            <div className="trm-line" />
            <div className="trm-clinic-tag">TRAIN · RECOVER · MOVE</div>
            <div className="trm-count">{tools.length} TOOLS</div>
          </div>
        </header>

        <main className="trm-tool-list">
          <div className="trm-section-label">Clinical Applications</div>
          {tools.map((tool) => (
            <Link
              key={tool.id}
              to={tool.to}
              className="trm-tool-row fade-in"
              style={{ '--accent': tool.color }}
              onMouseEnter={() => setHoveredId(tool.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="trm-tool-text">
                <div className="trm-tool-tag">{tool.tag}</div>
                <div className="trm-tool-name">{tool.name}</div>
                <div className="trm-tool-desc">{tool.description}</div>
              </div>
              <div className="trm-arrow">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Link>
          ))}
        </main>

        <footer className="trm-footer">
          <div>
            <div className="trm-footer-brand">TRM</div>
            <div className="trm-footer-sub">Fayetteville, AR · (479) 966-4055</div>
          </div>
          <div className="trm-footer-right">Attn: Blakeley Kreis</div>
        </footer>
      </div>
    </>
  );
}
