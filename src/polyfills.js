/**
 * TRM Clinic Tools — Polyfills
 *
 * This file runs before any app loads. It patches three things:
 *
 * 1. window.storage  — the ACL and Shoulder apps use Claude's artifact
 *                      storage API as their primary save mechanism. This
 *                      polyfill reimplements it using localStorage so
 *                      autosave works identically in the real Vite app.
 *
 * 2. window.PDFLib   — ACL and Shoulder load pdf-lib via CDN script tag,
 *                      but first check if window.PDFLib already exists.
 *                      We pre-populate it from the npm package so the CDN
 *                      request never fires.
 *
 * 3. window.jspdf    — APRE does the same for jsPDF. Same fix.
 */

import * as PDFLib from "pdf-lib";
import { jsPDF } from "jspdf";

// ── 1. window.storage polyfill ───────────────────────────────────────────────
// Mirrors the Claude artifact storage API shape exactly:
//   get(key)         → { key, value } | null
//   set(key, value)  → { key, value }
//   delete(key)      → { key, deleted: true }

if (!window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const value = localStorage.getItem(key);
        if (value === null) return null;
        return { key, value };
      } catch {
        return null;
      }
    },

    set: async (key, value) => {
      try {
        localStorage.setItem(key, value);
        return { key, value };
      } catch {
        return null;
      }
    },

    delete: async (key) => {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true };
      } catch {
        return null;
      }
    },

    list: async (prefix = "") => {
      try {
        const keys = Object.keys(localStorage).filter(k =>
          prefix ? k.startsWith(prefix) : true
        );
        return { keys, prefix };
      } catch {
        return { keys: [] };
      }
    },
  };
}

// ── 2. window.PDFLib (for ACL + Shoulder apps) ───────────────────────────────
// The apps check `if (window.PDFLib)` before injecting the CDN script.
// Pre-populating this means the CDN is never contacted.
if (!window.PDFLib) {
  window.PDFLib = PDFLib;
}

// ── 3. window.jspdf (for APRE app) ───────────────────────────────────────────
// APRE checks `if (window.jspdf)` before injecting the CDN script.
if (!window.jspdf) {
  window.jspdf = { jsPDF };
}
