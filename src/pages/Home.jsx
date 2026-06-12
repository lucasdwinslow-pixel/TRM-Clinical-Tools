import { useState } from "react";

const TRM_LOGO = "data:image/png;base64,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";

const categories = [
  {
    id: "le",
    label: "Lower Extremity",
    tools: [
      { id: "acl", name: "ACL Testing", href: "/acl" },
      { id: "hip", name: "Hip Testing", href: "/hip" },
    ],
  },
  {
    id: "ue",
    label: "Upper Extremity",
    tools: [
      { id: "shoulder", name: "Shoulder Testing", href: "/shoulder" },
      { id: "elbow", name: "Elbow Testing", href: "/elbow" },
    ],
  },
  {
    id: "sc",
    label: "Strength & Conditioning",
    tools: [
      { id: "apre", name: "APRE Tracking", href: "/apre" },
    ],
  },
  {
    id: "neuro",
    label: "Neurology",
    tools: [
      { id: "concussion", name: "Concussion Testing", href: "/concussion" },
    ],
  },
];

export default function Home() {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <>
      <style>{`
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
        }

        .pb-main { flex: 1; padding: 32px 32px 0; }

        /* Header */
        .pb-logo { display: block; width: clamp(160px, 44vw, 260px); height: auto; margin-bottom: -22px; }
        .pb-playbook {
          font-size: clamp(38px, 10vw, 58px);
          font-weight: 900; font-style: italic;
          text-transform: uppercase; letter-spacing: -0.03em;
          line-height: 0.92; color: #fff; display: block;
        }
        .pb-divider { margin-top: 18px; border-top: 4px solid var(--lime); padding-top: 16px; }
        .pb-subtitle {
          font-size: 13px; font-weight: 700; letter-spacing: 0.08em;
          line-height: 1.6; text-transform: uppercase; color: #fff;
        }
        .pb-subtitle-accent { color: var(--lime); }

        /* Categories */
        .pb-categories { margin-top: 36px; }
        .pb-cat { margin-bottom: 28px; }

        .pb-cat-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 4px;
        }
        .pb-cat-label {
          font-size: 10px; font-weight: 800; letter-spacing: 0.22em;
          text-transform: uppercase; color: var(--lime); white-space: nowrap;
        }
        .pb-cat-line { flex: 1; height: 1px; background: rgba(197,255,46,0.25); }

        .pb-coming-soon {
          padding: 16px 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          font-size: 12px; font-weight: 700; letter-spacing: 0.18em;
          text-transform: uppercase; color: rgba(255,255,255,0.2);
        }

        /* Tool rows */
        .pb-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: pointer; text-decoration: none; color: inherit;
          -webkit-tap-highlight-color: transparent; position: relative;
        }
        .pb-item:first-of-type { border-top: 1px solid rgba(255,255,255,0.08); }

        .pb-item-name {
          font-size: clamp(22px, 5.5vw, 32px);
          font-weight: 900; font-style: italic;
          text-transform: uppercase; letter-spacing: -0.02em;
          line-height: 1.05; color: #fff; transition: color 0.15s ease;
        }
        .pb-item:hover .pb-item-name { color: var(--lime); }

        .pb-arrow {
          flex-shrink: 0; width: 44px; height: 44px;
          border: 2px solid var(--lime); border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: var(--lime); margin-left: 16px;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .pb-item:hover .pb-arrow {
          background: rgba(197,255,46,0.12); transform: translateX(3px);
        }

        /* Stagger */
        .pb-fade { opacity: 0; transform: translateY(12px); animation: pbUp 0.4s ease forwards; }
        .pb-fade:nth-child(1) { animation-delay: 0.05s; }
        .pb-fade:nth-child(2) { animation-delay: 0.12s; }
        .pb-fade:nth-child(3) { animation-delay: 0.19s; }
        .pb-fade:nth-child(4) { animation-delay: 0.26s; }
        @keyframes pbUp { to { opacity: 1; transform: none; } }

        /* Footer */
        .pb-footer {
          padding: 32px 32px 20px;
          display: flex; justify-content: space-between; align-items: flex-end;
        }
        .pb-footer-logo { width: 64px; height: auto; display: block; }
        .pb-indicator {
          width: 128px; height: 4px;
          background: rgba(255,255,255,0.35);
          border-radius: 99px; margin: 0 auto 8px;
        }

        @media (max-width: 480px) {
          .pb-main { padding: 20px 20px 0; }
          .pb-footer { padding: 24px 20px 16px; }
        }
      `}</style>

      <div className="pb-root">
        <main className="pb-main">

          <header className="pb-header">
            <img src={TRM_LOGO} alt="TRM" className="pb-logo" />
            <span className="pb-playbook">Playbook</span>
            <div className="pb-divider">
              <p className="pb-subtitle">
                Outpatient Orthopedic Physical Therapy<br />
                <span className="pb-subtitle-accent">Train • Recover • Move</span>
              </p>
            </div>
          </header>

          <div className="pb-categories">
            {categories.map((cat, ci) => (
              <div
                key={cat.id}
                className="pb-cat pb-fade"
                style={{ animationDelay: `${0.05 + ci * 0.08}s` }}
              >
                <div className="pb-cat-header">
                  <span className="pb-cat-label">{cat.label}</span>
                  <div className="pb-cat-line" />
                </div>

                {cat.tools.length === 0 ? (
                  <div className="pb-coming-soon">Coming Soon</div>
                ) : (
                  cat.tools.map((tool) => (
                    <a
                      key={tool.id}
                      href={tool.href}
                      className="pb-item"
                      onMouseEnter={() => setHoveredId(tool.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="pb-item-name">{tool.name}</div>
                      <div className="pb-arrow">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </a>
                  ))
                )}
              </div>
            ))}
          </div>

        </main>

        <footer className="pb-footer">
          <img src={TRM_LOGO} alt="TRM" className="pb-footer-logo" />
        </footer>

        <div className="pb-indicator" />
      </div>
    </>
  );
}
