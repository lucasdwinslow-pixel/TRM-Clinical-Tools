// ⚠️ Order matters — polyfills and global CSS must load first
import "./polyfills.js";
import "./global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ── Register PWA service worker ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => console.log("TRM SW registered:", reg.scope))
      .catch((err) => console.warn("TRM SW failed:", err));
  });
}
