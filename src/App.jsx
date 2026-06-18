import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";

const ACLApp = lazy(() => import("./apps/ACLApp.jsx"));
const ShoulderApp = lazy(() => import("./apps/ShoulderApp.jsx"));
const APREApp = lazy(() => import("./apps/APREApp.jsx"));
const HipApp = lazy(() => import("./apps/hip_testing_app_v1.jsx"));
const ElbowApp = lazy(() => import("./apps/ElbowApp.jsx"));
const ConcussionApp = lazy(() => import("./apps/ConcussionApp.jsx"));

// Full-bleed black wrapper — prevents any white showing around app edges
const AppShell = ({ children }) => (
  <div style={{
    background: "#0b0f12",
    minHeight: "100dvh",
    width: "100%",
    position: "relative",
  }}>
    {children}
  </div>
);

function AppLoader({ name }) {
  return (
    <AppShell>
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        fontFamily: "sans-serif",
      }}>
        <div style={{
          width: 200,
          height: 3,
          background: "#1a1a1a",
          borderRadius: 2,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: "40%",
            background: "#aaff00",
            borderRadius: 2,
            animation: "slide 1s ease-in-out infinite alternate",
          }} />
        </div>
        <div style={{
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: 4,
          color: "#555",
          textTransform: "uppercase",
        }}>
          Loading {name}...
        </div>
        <style>{`
          @keyframes slide {
            from { transform: translateX(-100%); }
            to { transform: translateX(350%); }
          }
        `}</style>
      </div>
    </AppShell>
  );
}

function BackButton() {
  return (
    <>
      <style>{`
        .trm-back {
          position: fixed;
          top: 16px; left: 16px;
          z-index: 9999;
          display: flex; align-items: center; gap: 8px;
          background: #0a0a0a;
          border: 2px solid #2a2a2a;
          border-radius: 0;
          color: #aaff00;
          padding: 8px 14px;
          font-family: sans-serif;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 3px;
          text-transform: uppercase;
          text-decoration: none;
          transition: border-color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .trm-back:hover { border-color: #aaff00; }
        .trm-back svg { width: 12px; height: 12px; }
        @media (max-width: 700px) {
          .trm-back {
            top: auto;
            bottom: 20px; left: 14px;
            background: rgba(255,255,255,0.03);
            border: 1px solid #2a2a2a88;
            border-radius: 7px;
            color: #666;
            padding: 7px 10px;
            font-weight: 800;
            font-size: 9px;
            letter-spacing: 0.07em;
            box-shadow: 0 1px 6px rgba(0,0,0,0.3);
          }
          .trm-back:hover { border-color: #2a2a2a88; }
          .trm-back svg { width: 10px; height: 10px; }
        }
      `}</style>
      <a href="/" className="trm-back">
        <svg viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Playbook
      </a>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Dashboard */}
        <Route path="/" element={<Home />} />

        {/* ACL Testing App */}
        <Route path="/acl" element={
          <AppShell>
            <BackButton />
            <Suspense fallback={<AppLoader name="ACL Testing App" />}>
              <ACLApp />
            </Suspense>
          </AppShell>
        } />

        {/* Shoulder Testing App */}
        <Route path="/shoulder" element={
          <AppShell>
            <BackButton />
            <Suspense fallback={<AppLoader name="Shoulder Testing App" />}>
              <ShoulderApp />
            </Suspense>
          </AppShell>
        } />

        {/* Elbow Testing App */}
        <Route path="/elbow" element={
          <AppShell>
            <BackButton />
            <Suspense fallback={<AppLoader name="Elbow Testing" />}>
              <ElbowApp />
            </Suspense>
          </AppShell>
        } />

        {/* Concussion Testing App */}
        <Route path="/concussion" element={
          <AppShell>
            <BackButton />
            <Suspense fallback={<AppLoader name="Concussion Testing" />}>
              <ConcussionApp />
            </Suspense>
          </AppShell>
        } />

        {/* APRE Calculator */}
        <Route path="/apre" element={
          <AppShell>
            <BackButton />
            <Suspense fallback={<AppLoader name="APRE Calculator" />}>
              <APREApp />
            </Suspense>
          </AppShell>
        } />

        {/* Hip Testing App */}
        <Route path="/hip" element={
          <AppShell>
            <BackButton />
            <Suspense fallback={<AppLoader name="Hip Testing App" />}>
              <HipApp />
            </Suspense>
          </AppShell>
        } />

        {/* 404 */}
        <Route path="*" element={
          <AppShell>
            <div style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "sans-serif",
              gap: 16,
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 80,
                color: "#aaff00",
                lineHeight: 1,
              }}>404</div>
              <div style={{
                fontSize: 13,
                letterSpacing: 4,
                color: "#555",
                textTransform: "uppercase",
              }}>Page not found</div>
              <a href="/" style={{
                marginTop: 8,
                color: "#aaff00",
                fontSize: 12,
                letterSpacing: 3,
                textTransform: "uppercase",
                textDecoration: "none",
                fontWeight: 700,
              }}>
                ← Back to TRM Tools
              </a>
            </div>
          </AppShell>
        } />

      </Routes>
    </BrowserRouter>
  );
}
