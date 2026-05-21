import { useState } from "react";

const tools = [
  {
    id: "acl",
    name: "ACL Testing App",
    tag: "Lower Extremity",
    href: "/acl",
  },
  {
    id: "shoulder",
    name: "Shoulder Testing App",
    tag: "Upper Extremity",
    href: "/shoulder",
  },
  {
    id: "apre",
    name: "APRE Calculator",
    tag: "Strength & Conditioning",
    href: "/apre",
  },
];

export default function Home() {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overscroll-behavior: none; }

        :root {
          --lime: #C5FF2E;
          --bg: #121619;
          --border: rgba(255,255,255,0.1);
        }

        .pb-root {
          min-height: 100vh;
          background-color: var(--bg);
          background-image:
            linear-gradient(rgba(0,0,0,0.82), rgba(0,0,0,0.92)),
            url('https://lh3.googleusercontent.com/aida-public/AB6AXuAHH4-Tq2Zvh_shO7wNwSh9fTt3vl5zqHqG1KOrQ4q3VTQJBQfQHMY8TkqzNfglrpLNtfdX46wnNkXhU-cTKk2eO0uo-a-GT8oBqVVhzVEW0BI6OeO-j-q4Dm7F_SLO9rzEWHOMeQUPAm5JIGm-ruIPaUORw0wpk7X6lFQHCkt20rPygBb0FZwYRHddyg3A54q72YCoPA6EksES9hT4ChmgtlGlYeAge2wS25pCMGvSF3csGiwVwU8l57y-nnPEftF1HQ_ybJKiVrjr');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          color: #fff;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          position: relative;
          isolation: isolate;
        }

        /* ── Grain overlay (#3) ── */
        .pb-root::after {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0.045;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px 128px;
        }

        /* All direct children sit above the grain */
        .pb-status, .pb-main, .pb-footer, .pb-indicator { position: relative; z-index: 1; }

        /* ── Status bar ── */
        .pb-status {
          height: 44px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          flex-shrink: 0;
        }
        .pb-status-time {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .pb-status-icons {
          display: flex;
          gap: 4px;
          align-items: center;
          opacity: 0.7;
        }

        /* ── Main ── */
        .pb-main {
          flex: 1;
          padding: 16px 32px 0;
        }

        /* ── Header ── */
        .pb-header {
          margin-bottom: 40px;
        }

        .pb-title-block {
          display: flex;
          flex-direction: column;
        }

        .pb-title-trm {
          font-size: clamp(48px, 13vw, 64px);
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: -0.03em;
          line-height: 0.92;
          color: var(--lime);
          display: block;
        }

        /* (#1 color change) PLAYBOOK is white */
        .pb-title-playbook {
          font-size: clamp(48px, 13vw, 64px);
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: -0.03em;
          line-height: 0.92;
          color: #ffffff;
          display: block;
          margin-top: 2px;
        }

        .pb-divider-row {
          margin-top: 18px;
          border-top: 4px solid var(--lime);
          padding-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .pb-subtitle {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          line-height: 1.65;
          text-transform: uppercase;
          color: rgba(255,255,255,0.6);
        }
        .pb-subtitle-accent {
          color: var(--lime);
        }

        /* (#2) Tool count badge */
        .pb-badge {
          flex-shrink: 0;
          background: var(--lime);
          color: #0a0a0a;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 4px;
          white-space: nowrap;
          line-height: 1;
        }

        /* ── Tool list ── */
        .pb-list {
          display: flex;
          flex-direction: column;
        }

        /* (#1) Left accent bar on hover */
        .pb-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 26px 0 26px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          -webkit-tap-highlight-color: transparent;
          position: relative;
          overflow: visible;
        }

        /* The sliding lime bar */
        .pb-item::before {
          content: '';
          position: absolute;
          left: -32px;
          top: 0;
          bottom: 0;
          width: 0;
          background: var(--lime);
          border-radius: 0 3px 3px 0;
          transition: width 0.18s ease;
        }
        .pb-item:hover::before { width: 5px; }

        .pb-item-text { flex: 1; }

        .pb-item-tag {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 5px;
          transition: color 0.15s ease;
        }
        .pb-item:hover .pb-item-tag { color: var(--lime); }

        .pb-item-name {
          font-size: clamp(26px, 6vw, 36px);
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 1.05;
          color: #fff;
          transition: color 0.15s ease;
        }
        .pb-item:hover .pb-item-name { color: var(--lime); }

        .pb-arrow {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border: 2px solid var(--lime);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--lime);
          margin-left: 20px;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .pb-item:hover .pb-arrow {
          background: rgba(197,255,46,0.13);
          transform: translateX(4px);
        }

        /* fade-in stagger */
        .pb-fade { opacity: 0; transform: translateY(12px); animation: pbUp 0.4s ease forwards; }
        .pb-fade:nth-child(1) { animation-delay: 0.05s; }
        .pb-fade:nth-child(2) { animation-delay: 0.12s; }
        .pb-fade:nth-child(3) { animation-delay: 0.19s; }
        @keyframes pbUp { to { opacity: 1; transform: none; } }

        /* ── Footer (#4) ── */
        .pb-footer {
          padding: 0 32px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin: 24px 32px 0;
          padding-top: 18px;
          margin-left: 0;
          margin-right: 0;
          padding-left: 32px;
          padding-right: 32px;
        }
        .pb-footer-brand {
          font-size: 20px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: -0.02em;
          color: var(--lime);
          text-transform: uppercase;
        }
        .pb-footer-meta {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
        }

        /* ── Home indicator ── */
        .pb-indicator {
          width: 128px;
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 99px;
          margin: 14px auto 10px;
        }

        @media (max-width: 480px) {
          .pb-main { padding: 12px 20px 0; }
          .pb-footer { padding-left: 20px; padding-right: 20px; margin: 20px 0 0; }
          .pb-status { padding: 0 20px; }
          .pb-item::before { left: -20px; }
        }
      `}</style>

      <div className="pb-root">

        {/* Status bar */}
        <div className="pb-status">
          <span className="pb-status-time">9:41</span>
          <div className="pb-status-icons">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <rect x="1" y="11" width="2" height="5" rx="0.5"/>
              <rect x="5" y="8"  width="2" height="8" rx="0.5"/>
              <rect x="9" y="5"  width="2" height="11" rx="0.5"/>
              <rect x="13" y="2" width="2" height="14" rx="0.5"/>
            </svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
        </div>

        {/* Main content */}
        <main className="pb-main">

          {/* Header */}
          <header className="pb-header">
            <div className="pb-title-block">
              <span className="pb-title-trm">TRM</span>
              <span className="pb-title-playbook">Playbook</span>
            </div>
            <div className="pb-divider-row">
              <p className="pb-subtitle">
                Outpatient Orthopedic Physical Therapy<br />
                <span className="pb-subtitle-accent">Train • Recover • Move</span>
              </p>
              <div className="pb-badge">{tools.length} Tools</div>
            </div>
          </header>

          {/* Tool list */}
          <section className="pb-list">
            {tools.map((tool) => (
              <a
                key={tool.id}
                href={tool.href}
                className="pb-item pb-fade"
                onMouseEnter={() => setHoveredId(tool.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="pb-item-text">
                  <div className="pb-item-tag">{tool.tag}</div>
                  <div className="pb-item-name">{tool.name}</div>
                </div>
                <div className="pb-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </a>
            ))}
          </section>

        </main>

        {/* Footer */}
        <footer className="pb-footer">
          <span className="pb-footer-brand">TRM</span>
          <span className="pb-footer-meta">Clinic Tools · v2025</span>
        </footer>

        {/* iOS home indicator */}
        <div className="pb-indicator" />

      </div>
    </>
  );
}
