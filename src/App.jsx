import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";

const ACLApp      = lazy(() => import("./apps/ACLApp.jsx"));
const ShoulderApp = lazy(() => import("./apps/ShoulderApp.jsx"));
const APREApp     = lazy(() => import("./apps/APREApp.jsx"));

function AppLoader({ name }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      fontFamily: "sans-serif",
    }}>
      <div style={{ width: 200, height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: "40%",
          background: "#aaff00",
          borderRadius: 2,
          animation: "slide 1s ease-in-out infinite alternate",
        }} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 4, color: "#555", textTransform: "uppercase" }}>
        Loading {name}...
      </div>
      <style>{`@keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(350%); } }`}</style>
    </div>
  );
}

function BackButton() {
  return (
    <a href="/" style={{
      position: "fixed", top: 16, left: 16, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 8,
      background: "#0a0a0a", border: "2px solid #2a2a2a",
      color: "#aaff00", padding: "8px 14px",
      fontFamily: "sans-serif", fontWeight: 700,
      fontSize: 12, letterSpacing: 3, textTransform: "uppercase",
      textDecoration: "none", transition: "border-color 0.15s",
      WebkitTapHighlightColor: "transparent",
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M8 2L4 6l4 4" stroke="#aaff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      TRM
    </a>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/acl" element={
          <><BackButton /><Suspense fallback={<AppLoader name="ACL Testing App" />}><ACLApp /></Suspense></>
        } />

        <Route path="/shoulder" element={
          <><BackButton /><Suspense fallback={<AppLoader name="Shoulder Testing App" />}><ShoulderApp /></Suspense></>
        } />

        <Route path="/apre" element={
          <><BackButton /><Suspense fallback={<AppLoader name="APRE Calculator" />}><APREApp /></Suspense></>
        } />

        <Route path="*" element={
          <div style={{
            minHeight: "100vh", background: "#0a0a0a", color: "#fff",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            fontFamily: "sans-serif", gap: 16,
          }}>
            <div style={{ fontSize: 80, color: "#aaff00", lineHeight: 1 }}>404</div>
            <div style={{ fontSize: 13, letterSpacing: 4, color: "#555", textTransform: "uppercase" }}>Page not found</div>
            <a href="/" style={{ marginTop: 8, color: "#aaff00", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", fontWeight: 700 }}>
              ← Back to TRM Tools
            </a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
