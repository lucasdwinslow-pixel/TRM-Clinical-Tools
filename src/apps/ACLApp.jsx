import { useState, useRef, useEffect } from "react";

// pdf-lib loaded via script tag — compatible with Claude artifact sandbox
let _pdfLibResolve;
const _pdfLibPromise = new Promise(res => { _pdfLibResolve = res; });

if (typeof window !== "undefined") {
  if (window.PDFLib) {
    _pdfLibResolve(window.PDFLib);
  } else {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
    script.onload = () => _pdfLibResolve(window.PDFLib);
    document.head.appendChild(script);
  }
}

const getPdfLib = () => _pdfLibPromise;



// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LIME = "#b8ff57";
const LIME_DIM = "#8ed43c";
const BLACK = "#0a0a0a";
const DARK = "#111111";
const CARD = "#181818";
const BORDER = "#2a2a2a";
const MUTED = "#555555";
const WHITE = "#ffffff";
const GOLD = "#fbbf24";
const RED_BAD = "#f87171";
const BLUE = "#38bdf8";

// ─── MATH ─────────────────────────────────────────────────────────────────────
const toNum = (v) => parseFloat(v) || 0;
const hasVal = (v) => v !== "" && v !== null && v !== undefined && !isNaN(parseFloat(v));
const calcLSI = (inv, uninv) => {
  if (!hasVal(inv) || !hasVal(uninv) || toNum(uninv) === 0) return null;
  return ((toNum(inv) / toNum(uninv)) * 100).toFixed(1);
};
const calcTimedLSI = (inv, uninv) => {
  if (!hasVal(inv) || !hasVal(uninv) || toNum(inv) === 0) return null;
  return ((toNum(uninv) / toNum(inv)) * 100).toFixed(1);
};
const calcDiff = (a, b) => {
  if (!hasVal(a) || !hasVal(b)) return null;
  return (toNum(a) - toNum(b)).toFixed(1);
};
const calcTorqueNm = (forceLbs, tibCm) => {
  if (!hasVal(forceLbs) || !hasVal(tibCm)) return null;
  return (toNum(forceLbs) * 4.44822 * (toNum(tibCm) / 100)).toFixed(1);
};
const calcNorm = (nm, bwLbs) => {
  if (!nm || !hasVal(bwLbs) || toNum(bwLbs) === 0) return null;
  return (toNum(nm) / (toNum(bwLbs) * 0.453592)).toFixed(2);
};

// Y-Balance: composite = (ant + pm + pl) / (limbLen * 3) * 100
// Each direction pct = reach / limbLen * 100
const calcYBalance = (ant, pm, pl, limbLen) => {
  if (!hasVal(limbLen) || toNum(limbLen) === 0) return null;
  // Require all three directions — missing ones would be treated as 0,
  // which silently deflates the composite and produces a misleading result.
  if (!hasVal(ant) || !hasVal(pm) || !hasVal(pl)) return null;
  const ll = toNum(limbLen);
  const composite = (toNum(ant) + toNum(pm) + toNum(pl)) / (ll * 3) * 100;
  return composite.toFixed(1);
};
const calcYDir = (reach, limbLen) => {
  if (!hasVal(reach) || !hasVal(limbLen) || toNum(limbLen) === 0) return null;
  return ((toNum(reach) / toNum(limbLen)) * 100).toFixed(1);
};

// Hop helpers: convert ft+inch trial array to average inches
const trialToIn = (t) => {
  const ft = parseFloat(t.ft), inch = parseFloat(t.in) || 0;
  if (isNaN(ft)) return null;
  return ft * 12 + inch;
};
const hopAvgIn = (trials) => {
  if (!Array.isArray(trials)) return null;
  const vals = trials.map(trialToIn).filter(v => v !== null);
  if (vals.length === 0) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
};

const hopAvgTimed = (trials) => {
  if (!Array.isArray(trials)) return null;
  const vals = trials.map(v => parseFloat(v)).filter(v => !isNaN(v));
  if (vals.length === 0) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
};

const lsiColor = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return MUTED;
  if (n >= 90) return LIME;
  if (n >= 80) return GOLD;
  return RED_BAD;
};
const yBalColor = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return MUTED;
  return n >= 90 ? LIME : RED_BAD;
};
// ─── RESPONSIVE HOOK (CSS-only, no JS needed) ──────────────────────────────
// Inject mobile styles once
if (typeof document !== "undefined" && !document.getElementById("trm-mobile-styles")) {
  // Prevent iOS auto-zoom by setting viewport (if not already set)
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, viewport-fit=cover";
    document.head.appendChild(meta);
  }
  const s = document.createElement("style");
  s.id = "trm-mobile-styles";
  s.textContent = `
    /* Prevent iOS Safari pull-to-refresh from resetting the page */
    html, body {
      overscroll-behavior-y: none;
    }
    /* Support iPhone notch/Dynamic Island and home bar safe areas */
    .trm-fab {
      bottom: max(24px, env(safe-area-inset-bottom, 24px)) !important;
      right: max(24px, env(safe-area-inset-right, 24px)) !important;
    }
    .trm-main-content {
      padding-bottom: max(100px, calc(80px + env(safe-area-inset-bottom, 0px))) !important;
    }
    @media (max-width: 600px) {
      .trm-r2, .trm-r3, .trm-r4 { grid-template-columns: 1fr !important; }
      .trm-r2-persist { grid-template-columns: 1fr 1fr !important; }
      .trm-card-body { padding: 14px !important; }
      .trm-header-subtitle { display: none !important; }
      .trm-tab-sub { display: none !important; }
      .trm-tab-btn { padding: 10px 12px !important; }
      .trm-stat-bar { gap: 16px !important; padding: 10px 14px !important; }
      .trm-fab { bottom: 16px !important; right: 12px !important; gap: 5px !important; }
      .trm-fab button { padding: 10px 12px !important; font-size: 11px !important; min-height: 44px; min-width: 44px; }
      input[type="number"], input[type="text"], select, textarea { 
        font-size: 16px !important; 
        min-height: 44px !important;
      }
      /* Ensure content is never hidden behind the fixed FAB bar */
      .trm-main-content { padding-bottom: 90px !important; }
    }
  `;
  document.head.appendChild(s);
}
const VALID_RANGES = {
  bw:      [50, 500],   // lbs
  tib:     [20, 60],    // cm
  limbLen: [60, 110],   // cm
  flexR:   [0, 160],  flexL: [0, 160],
  extR:    [-20, 10], extL:  [-20, 10],
  keR:     [0, 400],  keL:   [0, 400],
  forceR:  [0, 400],  forceL:[0, 400],
  hsR:     [0, 300],  hsL:   [0, 300],
  tpfR:    [50, 800], tpfL:  [50, 800],
  ikdc:    [0, 100],
  tampa:   [11, 44],
  agilityTime: [3.0, 10.0],
};
const isOutOfRange = (key, val) => {
  if (!hasVal(val)) return false;
  const r = VALID_RANGES[key];
  if (!r) return false;
  const v = parseFloat(val);
  return v < r[0] || v > r[1];
};
const inpInvalid = { background: "#2a1010", border: "1px solid #f87171", borderRadius: 6, padding: "8px 12px", color: "#f87171", fontSize: 13, width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const inp = {
  background: "#1c1c1c", border: "1px solid #2e2e2e", borderRadius: 6,
  padding: "8px 12px", color: WHITE, fontSize: 13, width: "100%",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const lbl = {
  display: "block", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
  color: MUTED, textTransform: "uppercase", marginBottom: 4,
};
const calcBox = {
  background: "#0f0f0f", border: `1px solid ${LIME}33`, borderRadius: 6,
  padding: "8px 12px", color: LIME, fontSize: 13, fontFamily: "monospace", textAlign: "center",
};

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Card({ title, accent, children, id, focusable, activeCard, setActiveCard }) {
  const isActive = focusable ? activeCard === id : false;
  const handleClick = focusable && setActiveCard ? () => setActiveCard(id) : undefined;
  return (
    <div id={id} style={{
      background: CARD,
      border: `1px solid ${accent ? LIME + "44" : isActive ? LIME + "66" : BORDER}`,
      borderRadius: 12, marginBottom: 20, overflow: "hidden",
      boxShadow: accent ? `0 0 24px ${LIME}18` : isActive ? `0 0 20px ${LIME}22` : "0 2px 12px rgba(0,0,0,0.4)",
      transition: "box-shadow 0.2s, border-color 0.2s",
    }}>
      <div
        onClick={handleClick}
        style={{
          padding: "12px 20px",
          background: accent ? `linear-gradient(90deg,${LIME}18,transparent)` : isActive ? `linear-gradient(90deg,${LIME}14,transparent)` : "#161616",
          borderBottom: `1px solid ${accent ? LIME + "33" : isActive ? LIME + "33" : BORDER}`,
          display: "flex", alignItems: "center", gap: 10,
          cursor: focusable ? "pointer" : "default",
          userSelect: "none",
        }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: accent ? LIME : isActive ? LIME : "#444" }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: accent ? LIME : isActive ? LIME : "#888", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div className="trm-card-body" style={{ padding: 20 }}>{children}</div>
    </div>
  );
}
function R2({ children, mb = 12, persist = false }) {
  return <div className={persist ? "trm-r2-persist" : "trm-r2"} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: mb }}>{children}</div>;
}
function R3({ children, mb = 12 }) {
  return <div className="trm-r3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: mb }}>{children}</div>;
}
function R4({ children, mb = 12 }) {
  return <div className="trm-r4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: mb }}>{children}</div>;
}
function Field({ label, value, onChange, type = "number", step = "0.1", placeholder = "—", unit, readOnly, fieldKey }) {
  const invalid = !readOnly && fieldKey && isOutOfRange(fieldKey, value);
  return (
    <div>
      <label style={lbl}>{label}{unit ? ` (${unit})` : ""}</label>
      <input
        style={readOnly
          ? { ...inp, color: LIME, background: "#0f0f0f", borderColor: LIME + "33", cursor: "default" }
          : invalid ? inpInvalid : inp}
        type={readOnly ? "text" : type} step={step} placeholder={placeholder}
        inputMode={!readOnly && type === "number" ? "decimal" : undefined}
        autoCorrect="off" autoCapitalize="off" spellCheck={false}
        value={value} readOnly={readOnly}
        onChange={readOnly ? undefined : e => onChange(e.target.value)}
        title={invalid ? `Value out of expected range (${VALID_RANGES[fieldKey]?.[0]}–${VALID_RANGES[fieldKey]?.[1]})` : undefined}
      />
    </div>
  );
}
function StatBar({ stats }) {
  return (
    <div className="trm-stat-bar" style={{ background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 20px", display: "flex", gap: 28, flexWrap: "wrap", marginTop: 8 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: s.color || LIME, fontFamily: "monospace" }}>{s.value || "—"}</div>
        </div>
      ))}
    </div>
  );
}
function SideToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {["Left", "Right"].map(s => (
        <button key={s} onClick={() => onChange(s)} style={{
          padding: "8px 24px", borderRadius: 8, fontSize: 12, fontWeight: 800,
          cursor: "pointer", background: value === s ? LIME : "transparent",
          border: `2px solid ${value === s ? LIME : BORDER}`,
          color: value === s ? BLACK : MUTED
        }}>{s}</button>
      ))}
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ open, fileName, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#141414",
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        width: "100%", maxWidth: 420,
        boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px #ffffff08",
        overflow: "hidden",
      }}>
        {/* Header stripe */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${GOLD}, ${GOLD}88, transparent)`,
        }} />

        <div style={{ padding: "28px 28px 24px" }}>
          {/* Icon + title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: GOLD + "18", border: `1px solid ${GOLD}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>⚠</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: WHITE, letterSpacing: "0.02em", marginBottom: 6 }}>
                Replace Current Session?
              </div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
                Loading this file will overwrite all data currently on the form. This cannot be undone.
              </div>
            </div>
          </div>

          {/* File name pill */}
          {fileName && (
            <div style={{
              background: "#0f0f0f", border: `1px solid ${BORDER}`,
              borderRadius: 8, padding: "8px 14px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 11, color: MUTED }}>FILE</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#ccc", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fileName}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                border: `1px solid ${BORDER}`, background: "#1a1a1a",
                color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer",
                letterSpacing: "0.06em",
              }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                border: `1px solid ${GOLD}66`, background: GOLD + "18",
                color: GOLD, fontSize: 12, fontWeight: 800, cursor: "pointer",
                letterSpacing: "0.06em",
              }}>
              Yes, Load File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NEW PATIENT MODAL ────────────────────────────────────────────────────────
function NewPatientModal({ open, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#141414",
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        width: "100%", maxWidth: 400,
        boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px #ffffff08",
        overflow: "hidden",
      }}>
        {/* Header stripe */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${RED_BAD}, ${RED_BAD}88, transparent)`,
        }} />

        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: RED_BAD + "18", border: `1px solid ${RED_BAD}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>✕</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: WHITE, letterSpacing: "0.02em", marginBottom: 6 }}>
                Clear Form for New Patient?
              </div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
                All fields will be reset to blank. Make sure you've saved the current session as a PDF before continuing.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                border: `1px solid ${BORDER}`, background: "#1a1a1a",
                color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer",
                letterSpacing: "0.06em",
              }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                border: `1px solid ${RED_BAD}66`, background: RED_BAD + "18",
                color: RED_BAD, fontSize: 12, fontWeight: 800, cursor: "pointer",
                letterSpacing: "0.06em",
              }}>
              Clear & Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VALD CARD ────────────────────────────────────────────────────────────────
function ValdCard({ title, id, fields, values, onChange, highlight, focusable, activeCard, setActiveCard }) {
  const regularFields = fields.filter(f => f.type !== "textarea");
  const textareaFields = fields.filter(f => f.type === "textarea");
  return (
    <Card title={title} id={id} focusable={focusable} activeCard={activeCard} setActiveCard={setActiveCard}>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>Enter values directly from the Vald ForceDecks report.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {regularFields.map(f => (
          <div key={f.key}>
            <label style={lbl}>{f.label}{f.unit ? ` (${f.unit})` : ""}</label>
            {f.type === "select" ? (
              <select style={inp} value={values[f.key] || ""} onChange={e => onChange(f.key, e.target.value)}>
                <option value="">—</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input style={inp} type="number" inputMode="decimal" step={f.step || "0.1"} placeholder="—"
                value={values[f.key] || ""} onChange={e => onChange(f.key, e.target.value)} />
            )}
          </div>
        ))}
      </div>
      {textareaFields.map(f => (
        <div key={f.key} style={{ marginTop: 10 }}>
          <label style={lbl}>{f.label}</label>
          <textarea
            style={{ ...inp, height: 64, resize: "vertical", lineHeight: 1.6, fontSize: 12 }}
            placeholder={f.placeholder || "Optional clinical note…"}
            value={values[f.key] || ""}
            onChange={e => onChange(f.key, e.target.value)}
          />
        </div>
      ))}
      {highlight && highlight(values)}
    </Card>
  );
}

// ─── SMART NOTE BUILDER ───────────────────────────────────────────────────────
function buildNote(d) {
  const inv = d.patient.involvedSide;
  const invR = inv === "Right";
  const uninv = invR ? "Left" : "Right";

  const gR = [d.girth.r5, d.girth.r10, d.girth.r15].reduce((a, v) => a + toNum(v), 0);
  const gL = [d.girth.l5, d.girth.l10, d.girth.l15].reduce((a, v) => a + toNum(v), 0);
  const gBig = Math.max(gR, gL), gSmall = Math.min(gR, gL);
  const gPct = gBig > 0 ? (((gBig - gSmall) / gBig) * 100).toFixed(1) : null;
  const gSide = gR < gL ? "Right deficit" : gL < gR ? "Left deficit" : "Equal";

  const torRnm = calcTorqueNm(d.forceR, d.tib);
  const torLnm = calcTorqueNm(d.forceL, d.tib);
  const normR = calcNorm(torRnm, d.bw);
  const normL = calcNorm(torLnm, d.bw);
  const torLSI = invR ? calcLSI(normR, normL) : calcLSI(normL, normR);
  const keLSI = invR ? calcLSI(d.keR, d.keL) : calcLSI(d.keL, d.keR);

  const hopAvgs_build = {
    singleI: hopAvgIn(d.hops.singleI), singleU: hopAvgIn(d.hops.singleU),
    tripleI: hopAvgIn(d.hops.tripleI), tripleU: hopAvgIn(d.hops.tripleU),
    crossI:  hopAvgIn(d.hops.crossI),  crossU:  hopAvgIn(d.hops.crossU),
  };
  const hopLSIs = {
    single: calcLSI(hopAvgs_build.singleI, hopAvgs_build.singleU),
    triple: calcLSI(hopAvgs_build.tripleI, hopAvgs_build.tripleU),
    cross:  calcLSI(hopAvgs_build.crossI,  hopAvgs_build.crossU),
    timed:  calcTimedLSI(hopAvgTimed(d.hops.timedI), hopAvgTimed(d.hops.timedU)),
  };
  const yb = d.yBalance || {};
  const ybCompR = calcYBalance(yb.rAnt, yb.rPM, yb.rPL, d.limbLen);
  const ybCompL = calcYBalance(yb.lAnt, yb.lPM, yb.lPL, d.limbLen);

  const lines = [];
  const IND  = "   ";    // 3 spaces — measured values (Right/Left readings)
  const IND2 = "      "; // 6 spaces — derived values (asymmetries, deficits, LSI, indices)
  const add    = (l)    => lines.push(l);
  const sub    = (l)    => lines.push(IND + l);
  const sub2   = (l)    => lines.push(IND2 + l);
  const addIf  = (c, l) => { if (c) lines.push(l); };
  const subIf  = (c, l) => { if (c) lines.push(IND + l); };
  const sub2If = (c, l) => { if (c) lines.push(IND2 + l); };
  const br     = ()     => lines.push("");

  add("OBJECTIVE - ACL REHABILITATION TESTING"); br();
  subIf(d.patient.date,                `Date of Testing: ${d.patient.date}`);
  subIf(d.patient.surgeon,             `Surgeon: ${d.patient.surgeon}`);
  subIf(d.patient.graftType,           `Graft Type: ${d.patient.graftType}`);
  subIf(hasVal(d.patient.weeksPostOp), `Weeks Post-Op: ${d.patient.weeksPostOp}`);
  sub(`Involved Side: ${inv}`); br();

  if (hasVal(d.bw) || hasVal(d.tib) || hasVal(d.limbLen)) {
    add("BODY METRICS");
    subIf(hasVal(d.bw),      `Body Weight: ${d.bw} lbs`);
    subIf(hasVal(d.tib),     `Tibial Length: ${d.tib} cm`);
    subIf(hasVal(d.limbLen), `Limb Length (ASIS to MM): ${d.limbLen} cm`);
    br();
  }

  if (hasVal(d.flexR) || hasVal(d.flexL) || hasVal(d.extR) || hasVal(d.extL)) {
    add("KNEE RANGE OF MOTION");
    const flexInv   = invR ? d.flexR : d.flexL;
    const flexUninv = invR ? d.flexL : d.flexR;
    const fd = calcDiff(flexInv, flexUninv);
    const extInv   = invR ? d.extR : d.extL;
    const extUninv = invR ? d.extL : d.extR;
    const ed = calcDiff(extInv, extUninv);
    if (hasVal(d.flexR) || hasVal(d.flexL)) {
      sub("Knee Flexion:");
      subIf(hasVal(d.flexR), `Right: ${d.flexR} degrees`);
      subIf(hasVal(d.flexL), `Left: ${d.flexL} degrees`);
      sub2If(fd !== null, `Flexion Deficit (${inv}-${uninv}): ${fd} degrees`);
    }
    if (hasVal(d.extR) || hasVal(d.extL)) {
      sub("Knee Extension:");
      subIf(hasVal(d.extR), `Right: ${d.extR} degrees`);
      subIf(hasVal(d.extL), `Left: ${d.extL} degrees`);
      sub2If(ed !== null, `Extension Deficit (${inv}-${uninv}): ${ed} degrees`);
    }
    br();
  }

  if (gR > 0 || gL > 0) {
    add("QUAD GIRTH (proximal to superior patella border)");
    const rp = [hasVal(d.girth.r5) && `5cm: ${d.girth.r5}cm`, hasVal(d.girth.r10) && `10cm: ${d.girth.r10}cm`, hasVal(d.girth.r15) && `15cm: ${d.girth.r15}cm`].filter(Boolean);
    const lp = [hasVal(d.girth.l5) && `5cm: ${d.girth.l5}cm`, hasVal(d.girth.l10) && `10cm: ${d.girth.l10}cm`, hasVal(d.girth.l15) && `15cm: ${d.girth.l15}cm`].filter(Boolean);
    if (rp.length > 0) { sub("Right:"); sub(`Total: ${gR.toFixed(1)} cm   (${rp.join("  ")})`); }
    if (lp.length > 0) { sub("Left:"); sub(`Total: ${gL.toFixed(1)} cm   (${lp.join("  ")})`); }
    sub2If(gPct !== null, `Girth Asymmetry: ${gPct}% (${gSide})`);
    br();
  }

  if (hasVal(d.keR) || hasVal(d.keL)) {
    add("KNEE EXTENSION STRENGTH");
    sub("Peak Force:");
    subIf(hasVal(d.keR), `Right: ${d.keR} lbs`);
    subIf(hasVal(d.keL), `Left: ${d.keL} lbs`);
    const kd = calcDiff(d.keR, d.keL);
    sub2If(kd !== null, `Difference (R-L): ${kd} lbs`);
    sub2If(keLSI !== null, `Limb Symmetry Index (${inv} / ${uninv}): ${keLSI}%`);
    if (hasVal(d.tpfR) || hasVal(d.tpfL)) {
      sub("Time to Peak Force:");
      subIf(hasVal(d.tpfR), `Right: ${d.tpfR} sec`);
      subIf(hasVal(d.tpfL), `Left: ${d.tpfL} sec`);
      if (hasVal(d.tpfR) && hasVal(d.tpfL)) {
        const tpfAsym = (Math.abs(toNum(d.tpfR) - toNum(d.tpfL)) / Math.max(toNum(d.tpfR), toNum(d.tpfL)) * 100).toFixed(1);
        sub2(`Asymmetry: ${tpfAsym}%${parseFloat(tpfAsym) <= 10 ? " -- Within 10% threshold" : " -- Exceeds 10% threshold"}`);
      }
    }
    br();
  }

  if (torRnm || torLnm) {
    add("ISOMETRIC QUAD TORQUE - 90 DEGREE KNEE FLEXION (HHD)");
    if (hasVal(d.forceR) && torRnm) {
      sub("Right:");
      sub(`Force: ${d.forceR} lbs`);
      sub2(`Torque: ${torRnm} Nm${normR ? `   Normalized: ${normR} Nm/kg` : ""}`);
    }
    if (hasVal(d.forceL) && torLnm) {
      sub("Left:");
      sub(`Force: ${d.forceL} lbs`);
      sub2(`Torque: ${torLnm} Nm${normL ? `   Normalized: ${normL} Nm/kg` : ""}`);
    }
    sub2If(torLSI !== null, `Quadriceps Index (${inv} / ${uninv}): ${torLSI}%`);
    br();
  }

  // Hamstring
  const hsTorRnm_n = calcTorqueNm(d.hsR, d.tib);
  const hsTorLnm_n = calcTorqueNm(d.hsL, d.tib);
  const hsNormR_n  = calcNorm(hsTorRnm_n, d.bw);
  const hsNormL_n  = calcNorm(hsTorLnm_n, d.bw);
  const hsLSI_n    = invR ? calcLSI(hsNormR_n, hsNormL_n) : calcLSI(hsNormL_n, hsNormR_n);
  const hqR_n = (hasVal(hsNormR_n) && hasVal(normR) && toNum(normR) > 0) ? ((toNum(hsNormR_n) / toNum(normR)) * 100).toFixed(1) : null;
  const hqL_n = (hasVal(hsNormL_n) && hasVal(normL) && toNum(normL) > 0) ? ((toNum(hsNormL_n) / toNum(normL)) * 100).toFixed(1) : null;
  const hqInv_n   = invR ? hqR_n : hqL_n;

  if (hasVal(d.hsR) || hasVal(d.hsL)) {
    add("ISOMETRIC HAMSTRING STRENGTH (HHD)");
    if (hasVal(d.hsR)) {
      sub("Right:");
      sub(`Force: ${d.hsR} lbs`);
      if (hsTorRnm_n) sub2(`Torque: ${hsTorRnm_n} Nm${hsNormR_n ? `   Normalized: ${hsNormR_n} Nm/kg` : ""}`);
    }
    if (hasVal(d.hsL)) {
      sub("Left:");
      sub(`Force: ${d.hsL} lbs`);
      if (hsTorLnm_n) sub2(`Torque: ${hsTorLnm_n} Nm${hsNormL_n ? `   Normalized: ${hsNormL_n} Nm/kg` : ""}`);
    }
    sub2If(hsLSI_n !== null, `Hamstring LSI (${inv} / ${uninv}): ${hsLSI_n}%`);
    sub2If(hqR_n !== null, `H:Q Ratio - Right: ${hqR_n}% (Benchmark >=60%)`);
    sub2If(hqL_n !== null, `H:Q Ratio - Left: ${hqL_n}% (Benchmark >=60%)`);
    if (hqInv_n) sub2(`H:Q Ratio - ${inv} (Involved): ${hqInv_n}%${parseFloat(hqInv_n) >= 60 ? " -- Meets benchmark" : parseFloat(hqInv_n) >= 50 ? " -- Borderline" : " -- Below benchmark"}`);
    br();
  }

  // Vald — raw measurements at 3 spaces, derived asymmetry/CoV at 6 spaces
  const valdDerivedFields = new Set([
    "peakForceAsym","peakForceCov",                          // Squat derived
    "eccBrakingImpAsym","eccBrakingImpCov",                  // CMJ derived
    "concPeakForceAsym","concPeakForceCov",                  // CMJ derived
  ]);
  const valdMeta = [
    { key: "valdSquat", title: "SQUAT SYMMETRY - VALD FORCEDECKS",
      fields: ["lsiPct","peakForceAsym","peakForceCov","peakConForce","copPath","classification","clinicalNote"],
      labels: { lsiPct:"LSI", peakForceAsym:"Peak Force Asymmetry", peakForceCov:"Peak Force CoV", peakConForce:"Peak Concentric Force", copPath:"COP Path Length", classification:"Classification", clinicalNote:"Clinical Note" },
      units:  { lsiPct:"%", peakForceAsym:"%", peakForceCov:"%", peakConForce:"N", copPath:"mm" } },
    { key: "valdCMJ", title: "COUNTERMOVEMENT JUMP - VALD FORCEDECKS",
      fields: ["jumpHeight","eccBrakingImpAsym","eccBrakingImpCov","concPeakForceAsym","concPeakForceCov","modRSI","classification","clinicalNote"],
      labels: { jumpHeight:"Jump Height (impulse-derived)", eccBrakingImpAsym:"Max Eccentric Braking Impulse Asymmetry", eccBrakingImpCov:"Eccentric Braking Impulse CoV", concPeakForceAsym:"Max Concentric Peak Force Asymmetry", concPeakForceCov:"Concentric Peak Force CoV", modRSI:"Modified RSI", classification:"Classification", clinicalNote:"Clinical Note" },
      units:  { jumpHeight:"cm", eccBrakingImpAsym:"%", eccBrakingImpCov:"%", concPeakForceAsym:"%", concPeakForceCov:"%", modRSI:"" } },
  ];

  valdMeta.forEach(({ key, title, fields, labels, units }) => {
    const v = d[key] || {};
    if (!fields.some(f => v[f] && v[f] !== "")) return;
    add(title);
    fields.forEach(f => {
      const val = v[f]; if (!val || val === "") return;
      const unit = units[f] || "";
      const text = `${labels[f]}: ${val}${unit && !["classification","clinicalNote"].includes(f) ? " " + unit : ""}`;
      if (valdDerivedFields.has(f)) sub2(text); else sub(text);
    });
    br();
  });

  // SL Land and Hold
  const slh = d.slLandHold || {};
  if (hasVal(slh.rPeakForce) || hasVal(slh.lPeakForce) || hasVal(slh.rTTS) || hasVal(slh.lTTS)) {
    add("SINGLE LEG LAND AND HOLD");
    if (hasVal(slh.rPeakForce) || hasVal(slh.lPeakForce)) {
      sub("Peak Landing Force:");
      subIf(hasVal(slh.rPeakForce), `Right: ${slh.rPeakForce} N`);
      subIf(hasVal(slh.lPeakForce), `Left:  ${slh.lPeakForce} N`);
      if (hasVal(slh.rPeakForce) && hasVal(slh.lPeakForce) && Math.max(toNum(slh.rPeakForce), toNum(slh.lPeakForce)) > 0) {
        const fa = ((Math.abs(toNum(slh.rPeakForce) - toNum(slh.lPeakForce)) / Math.max(toNum(slh.rPeakForce), toNum(slh.lPeakForce))) * 100).toFixed(1);
        sub2(`Force Asymmetry: ${fa}%${parseFloat(fa) <= 10 ? " -- Within 10% threshold" : parseFloat(fa) <= 15 ? " -- Borderline" : " -- Exceeds threshold"}`);
      }
    }
    if (hasVal(slh.rTTS) || hasVal(slh.lTTS)) {
      sub("Time to Stabilization:");
      subIf(hasVal(slh.rTTS), `Right: ${slh.rTTS} sec`);
      subIf(hasVal(slh.lTTS), `Left:  ${slh.lTTS} sec`);
      if (hasVal(slh.rTTS) && hasVal(slh.lTTS) && Math.max(toNum(slh.rTTS), toNum(slh.lTTS)) > 0) {
        const ta = ((Math.abs(toNum(slh.rTTS) - toNum(slh.lTTS)) / Math.max(toNum(slh.rTTS), toNum(slh.lTTS))) * 100).toFixed(1);
        sub2(`TTS Asymmetry: ${ta}%${parseFloat(ta) <= 10 ? " -- Within 10% threshold" : parseFloat(ta) <= 15 ? " -- Borderline" : " -- Exceeds threshold"}`);
      }
    }
    br();
  }

  // Y-Balance
  const ybHas = hasVal(yb.rAnt) || hasVal(yb.rPM) || hasVal(yb.rPL) || hasVal(yb.lAnt) || hasVal(yb.lPM) || hasVal(yb.lPL);
  if (ybHas) {
    add("Y-BALANCE TEST");
    sub("Benchmark: Composite score >= 90% of limb length. Anterior reach side difference > 4 cm is clinically significant.");
    subIf(hasVal(d.limbLen), `Limb Length: ${d.limbLen} cm (applied both sides)`);
    if (hasVal(d.limbLen)) {
      sub("Right:");
      subIf(hasVal(yb.rAnt), `Anterior: ${yb.rAnt} cm (${calcYDir(yb.rAnt, d.limbLen)}% LL)`);
      subIf(hasVal(yb.rPM),  `Posteromedial: ${yb.rPM} cm (${calcYDir(yb.rPM, d.limbLen)}% LL)`);
      subIf(hasVal(yb.rPL),  `Posterolateral: ${yb.rPL} cm (${calcYDir(yb.rPL, d.limbLen)}% LL)`);
      sub2If(ybCompR !== null, `Composite Score: ${ybCompR}% limb length`);
      sub("Left:");
      subIf(hasVal(yb.lAnt), `Anterior: ${yb.lAnt} cm (${calcYDir(yb.lAnt, d.limbLen)}% LL)`);
      subIf(hasVal(yb.lPM),  `Posteromedial: ${yb.lPM} cm (${calcYDir(yb.lPM, d.limbLen)}% LL)`);
      subIf(hasVal(yb.lPL),  `Posterolateral: ${yb.lPL} cm (${calcYDir(yb.lPL, d.limbLen)}% LL)`);
      sub2If(ybCompL !== null, `Composite Score: ${ybCompL}% limb length`);
    }
    if (hasVal(yb.rAnt) && hasVal(yb.lAnt)) {
      const antDiff = Math.abs(toNum(yb.rAnt) - toNum(yb.lAnt)).toFixed(1);
      sub2(`Anterior Reach Side Difference: ${antDiff} cm${parseFloat(antDiff) > 4 ? " -- EXCEEDS 4cm THRESHOLD" : ""}`);
    }
    br();
  }

  // Hops
  const hopTests = [
    ["Single Hop for Distance", hopAvgs_build.singleI, hopAvgs_build.singleU, hopLSIs.single, "in"],
    ["Triple Hop for Distance", hopAvgs_build.tripleI, hopAvgs_build.tripleU, hopLSIs.triple, "in"],
    ["Crossover Hop for Distance", hopAvgs_build.crossI, hopAvgs_build.crossU, hopLSIs.cross, "in"],
    ["6-Meter Timed Hop", hopAvgTimed(d.hops.timedI), hopAvgTimed(d.hops.timedU), hopLSIs.timed, "sec"],
  ].filter(([, i, u]) => hasVal(i) || hasVal(u));

  if (hopTests.length > 0) {
    add("HOP TESTING");
    hopTests.forEach(([name, i, u, lsiVal, unit]) => {
      sub(`${name}:`);
      subIf(hasVal(i), `${inv} (Involved): ${i} ${unit}`);
      subIf(hasVal(u), `${uninv} (Uninvolved): ${u} ${unit}`);
      sub2If(lsiVal !== null, `LSI: ${lsiVal}%`);
    });
    sub("LSI Benchmark: >=90% meets RTS criteria. 80-89% borderline. <80% does not meet criteria.");
    br();
  }

  if (hasVal(d.agilityTime)) {
    add("PRO AGILITY TEST (5-10-5)");
    sub(`Best Time: ${d.agilityTime} sec`);
    br();
  }

  if (hasVal(d.ikdc) || hasVal(d.tampa)) {
    add("PATIENT-REPORTED OUTCOMES");
    subIf(hasVal(d.ikdc), `IKDC Subjective Knee Form: ${d.ikdc}/100${parseFloat(d.ikdc) >= 95 ? " -- Meets RTS threshold (>=95)" : parseFloat(d.ikdc) >= 80 ? " -- Approaching threshold" : " -- Below threshold"}`);
    subIf(hasVal(d.tampa), `Tampa Scale of Kinesiophobia (TSK-11): ${d.tampa}${parseFloat(d.tampa) <= 17 ? " -- Acceptable fear levels (<=17)" : parseFloat(d.tampa) <= 22 ? " -- Mild kinesiophobia" : " -- Elevated kinesiophobia (>22)"}`);
    br();
  }

  return lines.join("\n").trim();
}

// ─── LETTER BUILDER ───────────────────────────────────────────────────────────
function buildLetter(d, ptName, therapistName, clinic, impression) {
  const inv = d.patient.involvedSide;
  const invR = inv === "Right";
  const uninv = invR ? "Left" : "Right";

  const torRnm = calcTorqueNm(d.forceR, d.tib);
  const torLnm = calcTorqueNm(d.forceL, d.tib);
  const normR = calcNorm(torRnm, d.bw);
  const normL = calcNorm(torLnm, d.bw);
  const torLSI  = invR ? calcLSI(normR, normL) : calcLSI(normL, normR);
  const keLSI   = invR ? calcLSI(d.keR, d.keL) : calcLSI(d.keL, d.keR);
  const normInv = invR ? normR : normL;
  const hopAvgs_letter = {
    singleI: hopAvgIn(d.hops.singleI), singleU: hopAvgIn(d.hops.singleU),
    tripleI: hopAvgIn(d.hops.tripleI), tripleU: hopAvgIn(d.hops.tripleU),
    crossI:  hopAvgIn(d.hops.crossI),  crossU:  hopAvgIn(d.hops.crossU),
  };
  const hopLSIs = {
    single: calcLSI(hopAvgs_letter.singleI, hopAvgs_letter.singleU),
    triple: calcLSI(hopAvgs_letter.tripleI, hopAvgs_letter.tripleU),
    cross:  calcLSI(hopAvgs_letter.crossI,  hopAvgs_letter.crossU),
    timed:  calcTimedLSI(hopAvgTimed(d.hops.timedI), hopAvgTimed(d.hops.timedU)),
  };

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const pt   = ptName || "[Patient Name]";
  const surg = d.patient.surgeon || "[Surgeon Name]";
  const ther = therapistName || "[Therapist Name, Credentials]";
  const cl   = clinic || "Train Recover Move";
  const wks  = d.patient.weeksPostOp ? `${d.patient.weeksPostOp} weeks` : "[X] weeks";
  const graft = d.patient.graftType || "[graft type]";

  const lines = [];
  const add = (l) => lines.push(l);
  const br = () => lines.push("");

  add(cl); add(today); br();
  add(`Dr. ${surg}`); br();
  add(`Re: ${pt} — ACL Rehabilitation Progress Update`); br();
  add(`Dear Dr. ${surg},`); br();

  add(`I wanted to reach out with a progress update on ${pt}, who is currently ${wks} post ACL reconstruction with a ${graft} graft and has been receiving physical therapy here at ${cl}. We recently completed a formal return-to-sport testing battery and I wanted to share the key findings with you.`);
  br();

  // Strength — lead with the most clinically meaningful data
  const hasStrength = hasVal(d.keR) || hasVal(d.keL) || keLSI || torLSI;
  if (hasStrength) {
    add("QUADRICEPS STRENGTH");
    let sLine = "";
    if (keLSI) {
      const kv = parseFloat(keLSI);
      sLine += `Knee extension strength testing revealed a Limb Symmetry Index (LSI) of ${keLSI}% (involved ${inv} versus uninvolved ${uninv} side). `;
      if (kv >= 90) sLine += "This meets the 90% LSI threshold for return-to-sport consideration. ";
      else if (kv >= 80) sLine += "This approaches but has not yet reached the 90% LSI threshold required for return-to-sport clearance. ";
      else sLine += "This remains below the 80% threshold, indicating a meaningful quadriceps strength deficit on the involved side. ";
    }
    if (torLSI) {
      sLine += `Isometric quadriceps torque testing (HHD at 90° knee flexion) yielded a Quadriceps Index of ${torLSI}%`;
      if (normInv) sLine += ` with a normalized torque of ${normInv} Nm/kg on the involved limb`;
      sLine += ". ";
    }
    if (sLine) add(sLine.trim());
    br();
  }

  // Hamstring
  const hsTorR_l = calcTorqueNm(d.hsR, d.tib);
  const hsTorL_l = calcTorqueNm(d.hsL, d.tib);
  const hsNR_l   = calcNorm(hsTorR_l, d.bw);
  const hsNL_l   = calcNorm(hsTorL_l, d.bw);
  const hsLSI_l  = invR ? calcLSI(hsNR_l, hsNL_l) : calcLSI(hsNL_l, hsNR_l);
  const hqR_l    = (hasVal(hsNR_l) && hasVal(normR) && toNum(normR) > 0) ? ((toNum(hsNR_l) / toNum(normR)) * 100).toFixed(1) : null;
  const hqL_l    = (hasVal(hsNL_l) && hasVal(normL) && toNum(normL) > 0) ? ((toNum(hsNL_l) / toNum(normL)) * 100).toFixed(1) : null;
  const hqInv_l  = invR ? hqR_l : hqL_l;

  if (hasVal(d.hsR) || hasVal(d.hsL)) {
    add("HAMSTRING STRENGTH");
    let hsLine = "";
    if (hsLSI_l) {
      hsLine += `Isometric hamstring testing yielded an LSI of ${hsLSI_l}% (${inv} versus ${uninv}). `;
    }
    if (hqInv_l) {
      const hqv = parseFloat(hqInv_l);
      hsLine += `Hamstring-to-quadriceps ratio on the involved (${inv}) side was ${hqInv_l}%. `;
      if (hqv >= 60) hsLine += "This meets the ≥60% benchmark. ";
      else if (hqv >= 50) hsLine += "This is borderline relative to the ≥60% benchmark. ";
      else hsLine += "This falls below the ≥60% benchmark, indicating a relative hamstring deficit. ";
    }
    if (hsLine) add(hsLine.trim());
    br();
  }

  // ROM
  if (hasVal(d.flexR) || hasVal(d.flexL) || hasVal(d.extR) || hasVal(d.extL)) {
    add("RANGE OF MOTION");
    const fInv = invR ? d.flexR : d.flexL, fUninv = invR ? d.flexL : d.flexR;
    const eInv = invR ? d.extR : d.extL, eUninv = invR ? d.extL : d.extR;
    let rLine = `${pt} demonstrated`;
    if (hasVal(fInv) && hasVal(fUninv)) rLine += ` knee flexion of ${fInv}° (involved) and ${fUninv}° (uninvolved)`;
    else if (hasVal(fInv)) rLine += ` knee flexion of ${fInv}° on the involved side`;
    if (hasVal(eInv)) rLine += `. Knee extension measured ${eInv}° on the involved side${hasVal(eUninv) ? ` and ${eUninv}° on the uninvolved side` : ""}`;
    rLine += ".";
    add(rLine); br();
  }

  // Y-Balance
  const yb = d.yBalance || {};
  const ybCompInv = invR ? calcYBalance(yb.rAnt, yb.rPM, yb.rPL, d.limbLen) : calcYBalance(yb.lAnt, yb.lPM, yb.lPL, d.limbLen);
  const ybCompUninv = invR ? calcYBalance(yb.lAnt, yb.lPM, yb.lPL, d.limbLen) : calcYBalance(yb.rAnt, yb.rPM, yb.rPL, d.limbLen);
  if (ybCompInv || ybCompUninv) {
    add("Y-BALANCE TEST");
    let yLine = "Y-Balance testing ";
    if (ybCompInv && ybCompUninv) {
      yLine += `demonstrated a composite score of ${ybCompInv}% on the involved (${inv}) limb and ${ybCompUninv}% on the uninvolved (${uninv}) limb. `;
    } else if (ybCompInv) {
      yLine += `demonstrated a composite score of ${ybCompInv}% on the involved limb. `;
    }
    const antInv = invR ? yb.rAnt : yb.lAnt, antUninv = invR ? yb.lAnt : yb.rAnt;
    if (hasVal(antInv) && hasVal(antUninv)) {
      const antDiff = Math.abs(toNum(antInv) - toNum(antUninv)).toFixed(1);
      yLine += `Anterior reach difference between limbs was ${antDiff} cm${parseFloat(antDiff) > 4 ? ", which exceeds the 4 cm threshold associated with increased injury risk" : ", which is within acceptable limits"}. `;
    }
    yLine += "The benchmark for composite score is ≥90% of limb length.";
    add(yLine); br();
  }

  // Vald
  const valdSect = [
    { k: "valdSquat", name: "Bilateral Squat Symmetry",
      show: (v) => { let s = `${v.classification ? v.classification + ". " : ""}${v.peakForceAsym ? `Peak force asymmetry ${v.peakForceAsym}%. ` : ""}${v.peakForceCov ? `Peak force CoV ${v.peakForceCov}%. ` : ""}${v.clinicalNote || ""}`; return s.trim(); } },
    { k: "valdCMJ", name: "Countermovement Jump",
      show: (v) => { let s = `${v.jumpHeight ? `Jump height ${v.jumpHeight} cm. ` : ""}${v.eccBrakingImpAsym ? `Eccentric braking impulse asymmetry ${v.eccBrakingImpAsym}%. ` : ""}${v.concPeakForceAsym ? `Concentric peak force asymmetry ${v.concPeakForceAsym}%. ` : ""}${v.modRSI ? `Modified RSI ${v.modRSI}. ` : ""}${v.classification ? v.classification + ". " : ""}${v.clinicalNote || ""}`; return s.trim(); } },
  ].filter(({ k }) => Object.values(d[k] || {}).some(v => v && v !== ""));

  if (valdSect.length > 0) {
    add("FORCE PLATFORM TESTING (VALD FORCEDECKS)");
    valdSect.forEach(({ k, name, show }) => {
      const summary = show(d[k] || {});
      if (summary) add(`${name}: ${summary}`);
    });
    br();
  }

  // SL Land and Hold
  const slhN = d.slLandHold || {};
  if (hasVal(slhN.rPeakForce) || hasVal(slhN.lPeakForce) || hasVal(slhN.rTTS) || hasVal(slhN.lTTS)) {
    add("SINGLE LEG LAND AND HOLD");
    const slhParts = [];
    if (hasVal(slhN.rPeakForce) && hasVal(slhN.lPeakForce)) {
      const fa = ((Math.abs(toNum(slhN.rPeakForce) - toNum(slhN.lPeakForce)) / Math.max(toNum(slhN.rPeakForce), toNum(slhN.lPeakForce))) * 100).toFixed(1);
      slhParts.push(`Peak landing force R: ${slhN.rPeakForce} N / L: ${slhN.lPeakForce} N (${fa}% asymmetry — ${parseFloat(fa) <= 10 ? "within" : "exceeds"} 10% threshold)`);
    } else {
      if (hasVal(slhN.rPeakForce)) slhParts.push(`Peak landing force R: ${slhN.rPeakForce} N`);
      if (hasVal(slhN.lPeakForce)) slhParts.push(`Peak landing force L: ${slhN.lPeakForce} N`);
    }
    if (hasVal(slhN.rTTS) && hasVal(slhN.lTTS)) {
      const ta = ((Math.abs(toNum(slhN.rTTS) - toNum(slhN.lTTS)) / Math.max(toNum(slhN.rTTS), toNum(slhN.lTTS))) * 100).toFixed(1);
      slhParts.push(`Time to stabilization R: ${slhN.rTTS} s / L: ${slhN.lTTS} s (${ta}% asymmetry — ${parseFloat(ta) <= 10 ? "within" : "exceeds"} 10% threshold)`);
    } else {
      if (hasVal(slhN.rTTS)) slhParts.push(`Time to stabilization R: ${slhN.rTTS} s`);
      if (hasVal(slhN.lTTS)) slhParts.push(`Time to stabilization L: ${slhN.lTTS} s`);
    }
    slhParts.forEach(p => add(p));
    br();
  }

  // Hops
  const hopEntries = [
    ["Single Hop", hopLSIs.single],
    ["Triple Hop", hopLSIs.triple],
    ["Crossover Hop", hopLSIs.cross],
    ["6-Meter Timed Hop", hopLSIs.timed],
  ].filter(([, v]) => v !== null);

  if (hopEntries.length > 0) {
    add("FUNCTIONAL HOP TESTING");
    const hopStr = hopEntries.map(([n, v]) => `${n} LSI ${v}%`).join(", ");
    const allMet = hopEntries.every(([, v]) => parseFloat(v) >= 90);
    const noneMet = hopEntries.every(([, v]) => parseFloat(v) < 80);
    let hLine = `${pt} completed functional hop testing: ${hopStr}. `;
    if (allMet) hLine += "All values meet the 90% LSI return-to-sport benchmark.";
    else if (noneMet) hLine += "All values fall below the 80% threshold, indicating significant functional symmetry deficits.";
    else hLine += "Performance is mixed relative to the 90% LSI benchmark required for return-to-sport clearance.";
    add(hLine); br();
  }

  if (hasVal(d.agilityTime)) {
    add("AGILITY");
    add(`Pro Agility Test (5-10-5) best time: ${d.agilityTime} seconds.`); br();
  }

  if (hasVal(d.ikdc) || hasVal(d.tampa)) {
    add("PATIENT-REPORTED OUTCOMES");
    let proLine = "";
    if (hasVal(d.ikdc)) {
      const iv = parseFloat(d.ikdc);
      proLine += `IKDC score was ${d.ikdc}/100${iv >= 95 ? ", meeting the ≥95 RTS threshold" : iv >= 80 ? ", approaching but not yet meeting the ≥95 RTS threshold" : ", below the ≥95 RTS threshold"}. `;
    }
    if (hasVal(d.tampa)) {
      const tv = parseFloat(d.tampa);
      proLine += `Tampa Scale of Kinesiophobia (TSK-11) score was ${d.tampa}${tv <= 17 ? ", indicating acceptable fear of movement levels for return to sport" : tv <= 22 ? ", indicating mild kinesiophobia that may warrant psychological support" : ", indicating elevated kinesiophobia — psychological readiness intervention is recommended prior to RTS clearance"}. `;
    }
    if (proLine) add(proLine.trim());
    br();
  }

  add("CLINICAL IMPRESSION");
  add(impression && impression.trim()
    ? impression.trim()
    : "[Please enter your clinical impression above before sending this letter.]");
  br();

  add("Please feel free to reach out with any questions. We value your collaboration in this patient's care and will continue to keep you informed as testing progresses.");
  br();
  add("Sincerely,"); br();
  add(ther); add(cl);

  return lines.join("\n");
}

// ─── TAB 1: TESTING ───────────────────────────────────────────────────────────
function Tab1({ data: d, setData: setD }) {
  const sd = (k, v) => setD(p => ({ ...p, [k]: v }));
  const setP = (k, v) => sd("patient", { ...d.patient, [k]: v });
  const inv = d.patient.involvedSide, invR = inv === "Right", uninv = invR ? "Left" : "Right";
  const [activeCard, setActiveCard] = useState("patient");

  const gTotR = () => [d.girth.r5, d.girth.r10, d.girth.r15].reduce((a, v) => a + toNum(v), 0);
  const gTotL = () => [d.girth.l5, d.girth.l10, d.girth.l15].reduce((a, v) => a + toNum(v), 0);
  const gPct = () => { const b = Math.max(gTotR(), gTotL()), s = Math.min(gTotR(), gTotL()); return b > 0 ? (((b - s) / b) * 100).toFixed(1) : null; };
  const gSide = () => { const r = gTotR(), l = gTotL(); return r < l ? "Right deficit" : l < r ? "Left deficit" : "Equal"; };

  const torRnm = calcTorqueNm(d.forceR, d.tib);
  const torLnm = calcTorqueNm(d.forceL, d.tib);
  const normR = calcNorm(torRnm, d.bw);
  const normL = calcNorm(torLnm, d.bw);
  const torLSI = invR ? calcLSI(normR, normL) : calcLSI(normL, normR);
  const keLSI  = invR ? calcLSI(d.keR, d.keL) : calcLSI(d.keL, d.keR);

  // Hamstring calculations
  const hsTorRnm = calcTorqueNm(d.hsR, d.tib);
  const hsTorLnm = calcTorqueNm(d.hsL, d.tib);
  const hsNormR  = calcNorm(hsTorRnm, d.bw);
  const hsNormL  = calcNorm(hsTorLnm, d.bw);
  const hsLSI    = invR ? calcLSI(hsNormR, hsNormL) : calcLSI(hsNormL, hsNormR);
  // H:Q ratio per side — hamstring norm / quad norm × 100
  const hqRatioR = (hasVal(hsNormR) && hasVal(normR) && toNum(normR) > 0)
    ? ((toNum(hsNormR) / toNum(normR)) * 100).toFixed(1) : null;
  const hqRatioL = (hasVal(hsNormL) && hasVal(normL) && toNum(normL) > 0)
    ? ((toNum(hsNormL) / toNum(normL)) * 100).toFixed(1) : null;
  const hqRatioInv  = invR ? hqRatioR : hqRatioL;
  const hqRatioUninv = invR ? hqRatioL : hqRatioR;
  const hqColor = (v) => { const n = parseFloat(v); if (isNaN(n)) return MUTED; return n >= 60 ? LIME : n >= 50 ? GOLD : RED_BAD; };

  const hopAvgs = {
    singleI: hopAvgIn(d.hops.singleI), singleU: hopAvgIn(d.hops.singleU),
    tripleI: hopAvgIn(d.hops.tripleI), tripleU: hopAvgIn(d.hops.tripleU),
    crossI:  hopAvgIn(d.hops.crossI),  crossU:  hopAvgIn(d.hops.crossU),
  };
  const hopLSIs = {
    single: calcLSI(hopAvgs.singleI, hopAvgs.singleU),
    triple: calcLSI(hopAvgs.tripleI, hopAvgs.tripleU),
    cross:  calcLSI(hopAvgs.crossI,  hopAvgs.crossU),
    timed:  calcTimedLSI(hopAvgTimed(d.hops.timedI), hopAvgTimed(d.hops.timedU)),
  };

  // Y-Balance calculations — single limbLen used for both sides
  const yb = d.yBalance || {};
  const setYB = (k, v) => sd("yBalance", { ...yb, [k]: v });
  const ybCompR = calcYBalance(yb.rAnt, yb.rPM, yb.rPL, d.limbLen);
  const ybCompL = calcYBalance(yb.lAnt, yb.lPM, yb.lPL, d.limbLen);
  const ybCompInv = invR ? ybCompR : ybCompL;
  const ybCompUninv = invR ? ybCompL : ybCompR;
  const antDiff = hasVal(yb.rAnt) && hasVal(yb.lAnt)
    ? Math.abs(toNum(yb.rAnt) - toNum(yb.lAnt)).toFixed(1) : null;

  const agilityNorms = {
    "Male Elite": { mean: 4.22, sd: 0.15 }, "Female Elite": { mean: 4.73, sd: 0.18 },
    "Male Collegiate": { mean: 4.38, sd: 0.20 }, "Female Collegiate": { mean: 4.92, sd: 0.22 },
    "Male HS": { mean: 4.55, sd: 0.25 }, "Female HS": { mean: 5.10, sd: 0.28 },
    "Male General": { mean: 4.80, sd: 0.30 }, "Female General": { mean: 5.40, sd: 0.35 },
  };
  const [normGroup, setNormGroup] = useState(d.patient.sex === "Female" ? "Female Collegiate" : "Male Collegiate");
  // Sync norm group prefix when sex changes, preserving level selection
  const handleSexChange = (s) => {
    setP("sex", s);
    const level = normGroup.replace("Male ", "").replace("Female ", "");
    setNormGroup(`${s} ${level}`);
  };
  // Re-sync normGroup if sex is restored from autosave (d.patient.sex changes externally)
  useEffect(() => {
    const sex = d.patient.sex;
    if (!sex) return;
    setNormGroup(prev => {
      const level = prev.replace("Male ", "").replace("Female ", "");
      return `${sex} ${level}`;
    });
  }, [d.patient.sex]);
  const norm = agilityNorms[normGroup];
  const agClass = () => {
    if (!hasVal(d.agilityTime) || !norm) return null;
    const t = toNum(d.agilityTime);
    if (t <= norm.mean - norm.sd) return { label: "Above Average", color: LIME };
    if (t <= norm.mean)           return { label: "Average",       color: LIME };
    if (t <= norm.mean + norm.sd) return { label: "Below Average", color: GOLD };
    return { label: "Well Below Average", color: RED_BAD };
  };

  // Vald field definitions — RTS-focused
  const valdSquatFields = [
    { key: "lsiPct",         label: "LSI",                        unit: "%" },
    { key: "peakForceAsym",  label: "Peak Force Asymmetry",       unit: "%" },
    { key: "peakForceCov",   label: "Peak Force CoV",             unit: "%" },
    { key: "peakConForce",   label: "Peak Concentric Force",      unit: "N" },
    { key: "copPath",        label: "COP Path Length",            unit: "mm" },
    { key: "classification", label: "Classification", type: "select", options: ["Within Normal Limits","Mild Asymmetry","Moderate Asymmetry","Significant Asymmetry"] },
    { key: "clinicalNote",   label: "Clinical Note", type: "textarea", placeholder: "e.g. Asymmetry predominantly right-sided, consistent with involved limb deloading pattern…" },
  ];
  const valdCMJFields = [
    { key: "jumpHeight",        label: "Jump Height (impulse-derived)",     unit: "cm" },
    { key: "eccBrakingImpAsym", label: "Max Eccentric Braking Impulse Asym", unit: "%" },
    { key: "eccBrakingImpCov",  label: "Eccentric Braking Impulse CoV",     unit: "%" },
    { key: "concPeakForceAsym", label: "Max Concentric Peak Force Asym",    unit: "%" },
    { key: "concPeakForceCov",  label: "Concentric Peak Force CoV",         unit: "%" },
    { key: "modRSI",            label: "Modified RSI",                       unit: "" },
    { key: "classification",    label: "Classification", type: "select", options: ["Within Normal Limits","Mild Asymmetry","Moderate Asymmetry","Significant Asymmetry"] },
    { key: "clinicalNote",      label: "Clinical Note", type: "textarea", placeholder: "e.g. Jump height consistent with normative data; asymmetry driven by reduced concentric output on involved side…" },
  ];

  const setVald = (section, key, val) => sd(section, { ...(d[section] || {}), [key]: val });

  const [noteCopied, setNoteCopied] = useState(false);
  const generateNote = () => sd("noteText", buildNote(d));
  const copyNote = () => {
    navigator.clipboard.writeText(d.noteText)
      .then(() => { setNoteCopied(true); setTimeout(() => setNoteCopied(false), 2500); })
      .catch(() => {
        // iOS fallback: select a textarea and use execCommand
        try {
          const ta = document.createElement("textarea");
          ta.value = d.noteText;
          ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
          document.body.appendChild(ta);
          ta.focus(); ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setNoteCopied(true); setTimeout(() => setNoteCopied(false), 2500);
        } catch (e2) {}
      });
  };

  return (
    <div>
      {/* Patient — no age field */}
      <Card title="Patient Information" accent id="patient" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <R3>
          <Field label="Date of Testing" type="text" value={d.patient.date} onChange={v => setP("date", v)} placeholder="MM/DD/YYYY" step={null} />
          <Field label="Weeks Post-Op" unit="wks" value={d.patient.weeksPostOp} onChange={v => setP("weeksPostOp", v)} step="1" />
          <Field label="Graft Type" type="text" value={d.patient.graftType} onChange={v => setP("graftType", v)} placeholder="e.g. BPTB, HS, QT" step={null} />
        </R3>
        <R2>
          <Field label="Surgeon" type="text" value={d.patient.surgeon} onChange={v => setP("surgeon", v)} placeholder="Surgeon last name" step={null} />
          <div>
            <label style={lbl}>Biological Sex</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Male", "Female"].map(s => (
                <button key={s} onClick={() => handleSexChange(s)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 800,
                  cursor: "pointer",
                  background: d.patient.sex === s ? LIME : "transparent",
                  border: `2px solid ${d.patient.sex === s ? LIME : BORDER}`,
                  color: d.patient.sex === s ? BLACK : MUTED,
                }}>{s}</button>
              ))}
            </div>
          </div>
        </R2>
      </Card>

      {/* Body Metrics */}
      <Card title="Body Metrics" id="bodymetrics" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <R3>
          <Field label="Body Weight" unit="lbs" value={d.bw} onChange={v => sd("bw", v)} fieldKey="bw" />
          <Field label="Tibial Length" unit="cm" value={d.tib} onChange={v => sd("tib", v)} placeholder="joint line to HHD pad" fieldKey="tib" />
          <Field label="Limb Length" unit="cm" value={d.limbLen} onChange={v => sd("limbLen", v)} placeholder="ASIS to medial malleolus" fieldKey="limbLen" />
        </R3>
        <div style={{ fontSize: 11, color: MUTED }}>Tibial length used for torque calculation (both sides). Limb length used for Y-Balance composite (both sides).</div>
      </Card>

      {/* ROM */}
      <Card title="Knee Range of Motion" id="rom" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <R4 mb={12}>
          <Field label="Flexion Right"  unit="°" value={d.flexR} onChange={v => sd("flexR", v)} fieldKey="flexR" />
          <Field label="Flexion Left"   unit="°" value={d.flexL} onChange={v => sd("flexL", v)} fieldKey="flexL" />
          <Field label="Extension Right" unit="°" value={d.extR} onChange={v => sd("extR", v)} fieldKey="extR" />
          <Field label="Extension Left"  unit="°" value={d.extL} onChange={v => sd("extL", v)} fieldKey="extL" />
        </R4>
        <StatBar stats={(() => {
          const flexInv   = invR ? d.flexR : d.flexL;
          const flexUninv = invR ? d.flexL : d.flexR;
          const extInv    = invR ? d.extR  : d.extL;
          const extUninv  = invR ? d.extL  : d.extR;
          const flexDiff  = calcDiff(flexInv, flexUninv);
          const extDiff   = calcDiff(extInv,  extUninv);
          const flexColor = flexDiff !== null ? (parseFloat(flexDiff) >= -5 ? LIME : parseFloat(flexDiff) >= -15 ? GOLD : RED_BAD) : MUTED;
          const extColor  = extDiff  !== null ? (parseFloat(extDiff)  >=  0 ? LIME : parseFloat(extDiff)  >=  -5 ? GOLD : RED_BAD) : MUTED;
          return [
            { label: `Flex Deficit (${inv}−${uninv})`, value: flexDiff !== null ? flexDiff + "°" : null, color: flexColor },
            { label: `Ext Deficit (${inv}−${uninv})`,  value: extDiff  !== null ? extDiff  + "°" : null, color: extColor  },
          ];
        })()} />
      </Card>

      {/* Girth */}
      <Card title="Quad Girth Measurements" id="girth" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>Circumference at 5, 10, 15 cm proximal to superior patella border (cm)</div>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: 320 }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 90px", gap: 8, marginBottom: 8 }}>
              <div />{["5 cm","10 cm","15 cm","Total"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", textAlign: "center" }}>{h}</div>)}
            </div>
            {[["Right","r"],["Left","l"]].map(([side, k]) => (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 90px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: WHITE }}>{side}</div>
                {["5","10","15"].map(n => (
                  <input key={n} style={{ ...inp, minHeight: 44 }} type="number" inputMode="decimal" step="0.1" placeholder="—"
                    value={d.girth[`${k}${n}`]}
                    onChange={e => sd("girth", { ...d.girth, [`${k}${n}`]: e.target.value })} />
                ))}
                <div style={calcBox}>{(k === "r" ? gTotR() : gTotL()).toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>
        <StatBar stats={[
          { label: "Right Total", value: gTotR().toFixed(1) + " cm", color: WHITE },
          { label: "Left Total",  value: gTotL().toFixed(1) + " cm", color: WHITE },
          { label: "Asymmetry",   value: gPct() !== null ? gPct() + "%" : null,
            color: gPct() !== null ? (parseFloat(gPct()) <= 10 ? LIME : parseFloat(gPct()) <= 15 ? GOLD : RED_BAD) : MUTED },
          { label: "Deficit Side", value: gSide(), color: (() => {
            const r = gTotR(), l = gTotL();
            if (r === l) return LIME;
            const deficitOnInvolved = (invR && r < l) || (!invR && l < r);
            return deficitOnInvolved ? (parseFloat(gPct()) <= 10 ? GOLD : RED_BAD) : LIME;
          })() },
        ]} />
      </Card>

      {/* KE Strength */}
      <Card title="Knee Extension Strength" id="ke" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>Force values automatically populate HHD inputs in the torque section below.</div>
        <R2>
          <Field label="Right" unit="lbs" value={d.keR} onChange={v => { sd("keR", v); sd("forceR", v); }} fieldKey="keR" />
          <Field label="Left"  unit="lbs" value={d.keL} onChange={v => { sd("keL", v); sd("forceL", v); }} fieldKey="keL" />
        </R2>
        <R2 mb={8}>
          <Field label="Time to Peak Force — Right" unit="sec" value={d.tpfR} onChange={v => sd("tpfR", v)} placeholder="—" fieldKey="tpfR" />
          <Field label="Time to Peak Force — Left"  unit="sec" value={d.tpfL} onChange={v => sd("tpfL", v)} placeholder="—" fieldKey="tpfL" />
        </R2>
        {(() => {
          const tpfAsym = (hasVal(d.tpfR) && hasVal(d.tpfL) && toNum(d.tpfR) > 0 && toNum(d.tpfL) > 0)
            ? (Math.abs(toNum(d.tpfR) - toNum(d.tpfL)) / Math.max(toNum(d.tpfR), toNum(d.tpfL)) * 100).toFixed(1)
            : null;
          return (
            <StatBar stats={[
              { label: "Diff (R-L)", value: calcDiff(d.keR, d.keL) !== null ? calcDiff(d.keR, d.keL) + " lbs" : null, color: WHITE },
              { label: `LSI (${inv}/${uninv})`, value: keLSI ? keLSI + "%" : null, color: lsiColor(keLSI) },
              { label: "TPF Asymmetry", value: tpfAsym ? tpfAsym + "%" : null, color: tpfAsym ? (parseFloat(tpfAsym) <= 10 ? LIME : parseFloat(tpfAsym) <= 15 ? GOLD : RED_BAD) : MUTED },
            ]} />
          );
        })()}
      </Card>

      {/* Torque */}
      <Card title="Isometric Quad Torque — 90° Knee Flexion (HHD)" id="torque" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>
          Force carried from KE Strength above. Torque (Nm) = Force(lbs) × 4.448 × Tibial Length(m). Normalized = Nm / BW(kg).
          {hasVal(d.tib) && <span style={{ color: LIME, marginLeft: 6 }}>Tibial length: {d.tib} cm</span>}
        </div>
        <R2>
          <Field label="HHD Force — Right (lbs)" value={d.forceR} onChange={v => sd("forceR", v)} placeholder="auto from KE" />
          <Field label="HHD Force — Left (lbs)"  value={d.forceL} onChange={v => sd("forceL", v)} placeholder="auto from KE" />
        </R2>
        <div className="trm-r4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          {[["Torque R (Nm)", torRnm],["Torque L (Nm)", torLnm],["Norm R (Nm/kg)", normR],["Norm L (Nm/kg)", normL]].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
              <div style={{ ...calcBox, textAlign: "left" }}>{val || "—"}</div>
            </div>
          ))}
        </div>
        <StatBar stats={[{ label: `Quadriceps Index (${inv}/${uninv})`, value: torLSI ? torLSI + "%" : null, color: lsiColor(torLSI) }]} />
      </Card>

      {/* Hamstring Strength */}
      <Card title="Isometric Hamstring Strength (HHD)" id="hamstring" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>
          Hamstring force via HHD. Torque and H:Q ratio calculated using the same tibial length and body weight as above.
          {hasVal(d.tib) && <span style={{ color: LIME, marginLeft: 6 }}>Tibial length: {d.tib} cm</span>}
        </div>
        <R2>
          <Field label="HHD Force — Right (lbs)" value={d.hsR} onChange={v => sd("hsR", v)} fieldKey="hsR" />
          <Field label="HHD Force — Left (lbs)"  value={d.hsL} onChange={v => sd("hsL", v)} fieldKey="hsL" />
        </R2>

        {/* Torque + norm display */}
        <div className="trm-r4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          {[["HS Torque R (Nm)", hsTorRnm],["HS Torque L (Nm)", hsTorLnm],["Norm R (Nm/kg)", hsNormR],["Norm L (Nm/kg)", hsNormL]].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
              <div style={{ ...calcBox, textAlign: "left" }}>{val || "—"}</div>
            </div>
          ))}
        </div>

        {/* H:Q ratio per side */}
        {(hqRatioR || hqRatioL) && (
          <div style={{ background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
              Hamstring : Quad Ratio — Benchmark ≥60%
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["Right", hqRatioR], ["Left", hqRatioL]].map(([side, ratio]) => (
                <div key={side} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: WHITE, width: 36 }}>{side}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: hqColor(ratio) }}>
                    {ratio ? ratio + "%" : "—"}
                  </div>
                  {ratio && (
                    <div style={{
                      fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5,
                      background: parseFloat(ratio) >= 60 ? LIME + "18" : parseFloat(ratio) >= 50 ? GOLD + "18" : RED_BAD + "18",
                      border: `1px solid ${parseFloat(ratio) >= 60 ? LIME + "44" : parseFloat(ratio) >= 50 ? GOLD + "44" : RED_BAD + "44"}`,
                      color: hqColor(ratio),
                    }}>
                      {parseFloat(ratio) >= 60 ? "Meets Benchmark" : parseFloat(ratio) >= 50 ? "Borderline" : "Below Benchmark"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <StatBar stats={[
          { label: `HS LSI (${inv}/${uninv})`, value: hsLSI ? hsLSI + "%" : null, color: lsiColor(hsLSI) },
          { label: `H:Q Ratio — ${inv} (Involved)`,   value: hqRatioInv   ? hqRatioInv + "%"   : null, color: hqColor(hqRatioInv) },
          { label: `H:Q Ratio — ${uninv} (Uninvolved)`, value: hqRatioUninv ? hqRatioUninv + "%" : null, color: hqColor(hqRatioUninv) },
        ]} />
        <div style={{ marginTop: 10, padding: "8px 14px", background: "#0f0f0f", borderRadius: 6, border: `1px solid ${BORDER}`, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[["≥60% H:Q — Meets Benchmark", LIME],["50–59% — Borderline", GOLD],["<50% — Below Benchmark", RED_BAD]].map(([l,c]) => (
            <span key={l} style={{ fontSize: 11, fontWeight: 700, color: c }}>■ {l}</span>
          ))}
        </div>
      </Card>
      <ValdCard title="Squat Symmetry — Vald ForceDecks" id="ValdSquat"
        fields={valdSquatFields} values={d.valdSquat || {}}
        onChange={(k, v) => setVald("valdSquat", k, v)}
        focusable activeCard={activeCard} setActiveCard={setActiveCard}
        highlight={(vals) => vals.lsiPct && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <div style={{ ...lbl, marginBottom: 3 }}>LSI</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: lsiColor(vals.lsiPct) }}>{vals.lsiPct}%</div>
            </div>
            {vals.classification && <div style={{ padding: "6px 14px", borderRadius: 8, background: "#111", border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 700, color: WHITE }}>{vals.classification}</div>}
          </div>
        )} />

      {/* Vald — CMJ */}
      <ValdCard title="Countermovement Jump — Vald ForceDecks" id="ValdCMJ"
        fields={valdCMJFields} values={d.valdCMJ || {}}
        onChange={(k, v) => setVald("valdCMJ", k, v)}
        focusable activeCard={activeCard} setActiveCard={setActiveCard}
        highlight={(vals) => vals.modRSI && (
          <div style={{ marginTop: 12 }}>
            <div style={{ ...lbl, marginBottom: 3 }}>Modified RSI</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: BLUE }}>{vals.modRSI}</div>
          </div>
        )} />

      {/* SL Land and Hold */}
      {(() => {
        const slh = d.slLandHold || {};
        const setSLH = (k, v) => sd("slLandHold", { ...slh, [k]: v });
        const forceAsym = hasVal(slh.rPeakForce) && hasVal(slh.lPeakForce) && Math.max(toNum(slh.rPeakForce), toNum(slh.lPeakForce)) > 0
          ? ((Math.abs(toNum(slh.rPeakForce) - toNum(slh.lPeakForce)) / Math.max(toNum(slh.rPeakForce), toNum(slh.lPeakForce))) * 100).toFixed(1)
          : null;
        const ttsAsym = hasVal(slh.rTTS) && hasVal(slh.lTTS) && Math.max(toNum(slh.rTTS), toNum(slh.lTTS)) > 0
          ? ((Math.abs(toNum(slh.rTTS) - toNum(slh.lTTS)) / Math.max(toNum(slh.rTTS), toNum(slh.lTTS))) * 100).toFixed(1)
          : null;
        const asymColor = (v) => {
          const n = parseFloat(v);
          if (isNaN(n)) return MUTED;
          return n <= 10 ? LIME : n <= 15 ? GOLD : RED_BAD;
        };
        return (
          <Card title="Single Leg Land and Hold" id="SLLandHold" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
              Record peak landing force and time to stabilization for each limb. Asymmetry is calculated as |R − L| / max(R, L) × 100. Benchmark: &lt;10% asymmetry for both measures.
            </div>

            {/* Peak Landing Force */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Peak Landing Force</div>
              <R2 mb={8}>
                <Field label="Right" unit="N" value={slh.rPeakForce} onChange={v => setSLH("rPeakForce", v)} placeholder="—" />
                <Field label="Left"  unit="N" value={slh.lPeakForce} onChange={v => setSLH("lPeakForce", v)} placeholder="—" />
              </R2>
              {forceAsym !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Force Asymmetry</span>
                  <span style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: asymColor(forceAsym) }}>{forceAsym}%</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: asymColor(forceAsym) }}>
                    {parseFloat(forceAsym) <= 10 ? "✓ Within 10% threshold" : parseFloat(forceAsym) <= 15 ? "Borderline" : "Exceeds threshold"}
                  </span>
                </div>
              )}
            </div>

            {/* Time to Stabilization */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Time to Stabilization</div>
              <R2 mb={8}>
                <Field label="Right" unit="sec" value={slh.rTTS} onChange={v => setSLH("rTTS", v)} placeholder="—" />
                <Field label="Left"  unit="sec" value={slh.lTTS} onChange={v => setSLH("lTTS", v)} placeholder="—" />
              </R2>
              {ttsAsym !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>TTS Asymmetry</span>
                  <span style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: asymColor(ttsAsym) }}>{ttsAsym}%</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: asymColor(ttsAsym) }}>
                    {parseFloat(ttsAsym) <= 10 ? "✓ Within 10% threshold" : parseFloat(ttsAsym) <= 15 ? "Borderline" : "Exceeds threshold"}
                  </span>
                </div>
              )}
            </div>

            <StatBar stats={[
              { label: "Force R (N)", value: hasVal(slh.rPeakForce) ? slh.rPeakForce + " N" : null, color: WHITE },
              { label: "Force L (N)", value: hasVal(slh.lPeakForce) ? slh.lPeakForce + " N" : null, color: WHITE },
              { label: "Force Asym",  value: forceAsym ? forceAsym + "%" : null, color: asymColor(forceAsym) },
              { label: "TTS R (sec)", value: hasVal(slh.rTTS) ? slh.rTTS + " s" : null, color: WHITE },
              { label: "TTS L (sec)", value: hasVal(slh.lTTS) ? slh.lTTS + " s" : null, color: WHITE },
              { label: "TTS Asym",   value: ttsAsym ? ttsAsym + "%" : null, color: asymColor(ttsAsym) },
            ]} />
            <div style={{ marginTop: 10, padding: "8px 14px", background: "#0f0f0f", borderRadius: 6, border: `1px solid ${BORDER}`, display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[["≤10% — Within Threshold", LIME],["11–15% — Borderline", GOLD],[">15% — Exceeds Threshold", RED_BAD]].map(([l,c]) => (
                <span key={l} style={{ fontSize: 11, fontWeight: 700, color: c }}>■ {l}</span>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Y-Balance */}
      <Card title="Y-Balance Test" id="YBalance" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.7 }}>
          Composite score = (Anterior + Posteromedial + Posterolateral) ÷ (Limb Length × 3) × 100. Benchmark: ≥90% composite. Anterior side difference &gt;4 cm is a meaningful asymmetry flag.
          {hasVal(d.limbLen) && <span style={{ color: LIME, marginLeft: 6 }}>Limb length: {d.limbLen} cm (applied to both sides)</span>}
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 100px", gap: 8, marginBottom: 8 }}>
          <div />
          {["Anterior (cm)", "Posteromedial (cm)", "Posterolateral (cm)", "Composite"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>{h}</div>
          ))}
        </div>

        {[
          ["Right", "r", d.limbLen, ybCompR],
          ["Left",  "l", d.limbLen, ybCompL],
        ].map(([side, k, limbLen, comp]) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 100px", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: WHITE }}>{side}</div>
              {hasVal(limbLen) && <div style={{ fontSize: 10, color: MUTED }}>{limbLen} cm LL</div>}
            </div>
            {["Ant","PM","PL"].map(dir => (
              <input key={dir} style={inp} type="number" inputMode="decimal" step="0.1" placeholder="—"
                value={yb[`${k}${dir}`] || ""}
                onChange={e => setYB(`${k}${dir}`, e.target.value)} />
            ))}
            <div style={{ ...calcBox, color: comp ? yBalColor(comp) : MUTED }}>
              {comp ? comp + "%" : "—"}
            </div>
          </div>
        ))}

        {/* Per-direction % of limb length breakdown */}
        {hasVal(d.limbLen) && (
          <div style={{ marginTop: 12, background: "#0f0f0f", borderRadius: 8, border: `1px solid ${BORDER}`, padding: "12px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Reach as % of Limb Length</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["Right", "r", [yb.rAnt, yb.rPM, yb.rPL]],
                ["Left",  "l", [yb.lAnt, yb.lPM, yb.lPL]],
              ].map(([side, k, [ant, pm, pl]]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: WHITE, marginBottom: 6 }}>{side}</div>
                  {[["Anterior", ant], ["Posteromedial", pm], ["Posterolateral", pl]].map(([name, val]) => {
                    const pct = calcYDir(val, d.limbLen);
                    return (
                      <div key={name} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: MUTED }}>{name}</span>
                        <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: pct ? yBalColor(pct) : MUTED }}>
                          {pct ? pct + "%" : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        <StatBar stats={[
          { label: `Composite — ${inv} (Involved)`,   value: ybCompInv  ? ybCompInv + "%"  : null, color: ybCompInv  ? yBalColor(ybCompInv)  : MUTED },
          { label: `Composite — ${uninv} (Uninvolved)`, value: ybCompUninv ? ybCompUninv + "%" : null, color: ybCompUninv ? yBalColor(ybCompUninv) : MUTED },
          { label: "Ant Reach Difference", value: antDiff ? antDiff + " cm" : null, color: antDiff && parseFloat(antDiff) > 4 ? RED_BAD : LIME },
        ]} />
        <div style={{ marginTop: 10, padding: "8px 14px", background: "#0f0f0f", borderRadius: 6, border: `1px solid ${BORDER}`, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[["≥90% — Meets Benchmark", LIME],["<90% — Below Benchmark", RED_BAD],["Ant Diff >4 cm — Flag", GOLD]].map(([l,c]) => (
            <span key={l} style={{ fontSize: 11, fontWeight: 700, color: c }}>■ {l}</span>
          ))}
        </div>
      </Card>

      {/* Hops */}
      <Card title="Hop Testing" id="hops" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          Enter up to 3 trials per side in feet and inches. The average (in inches) is used for LSI calculations.
        </div>
        {[
          ["Single Hop", "singleI", "singleU", hopLSIs.single],
          ["Triple Hop", "tripleI", "tripleU", hopLSIs.triple],
          ["Crossover Hop", "crossI", "crossU", hopLSIs.cross],
        ].map(([name, ki, ku, lsiVal]) => {
          const avgI = hopAvgs[ki], avgU = hopAvgs[ku];
          return (
            <div key={name} style={{ marginBottom: 18, background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: WHITE }}>{name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>LSI</span>
                  <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: lsiColor(lsiVal) }}>{lsiVal ? lsiVal + "%" : "—"}</span>
                </div>
              </div>
              <div className="trm-r2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[[`${inv} (Involved)`, ki], [`${uninv} (Uninvolved)`, ku]].map(([sideLabel, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{sideLabel}</div>
                    {[0,1,2].map(t => (
                      <div key={t} style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr", gap: 6, alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>T{t+1}</span>
                        <div>
                          <label style={{ ...lbl, marginBottom: 2 }}>ft</label>
                          <input style={inp} type="number" inputMode="decimal" step="1" min="0" placeholder="0"
                            value={d.hops[key][t].ft}
                            onChange={e => {
                              const trials = d.hops[key].map((tr, i) => i === t ? { ...tr, ft: e.target.value } : tr);
                              sd("hops", { ...d.hops, [key]: trials });
                            }} />
                        </div>
                        <div>
                          <label style={{ ...lbl, marginBottom: 2 }}>in</label>
                          <input style={inp} type="number" inputMode="decimal" step="0.1" min="0" max="11.9" placeholder="0"
                            value={d.hops[key][t].in}
                            onChange={e => {
                              const trials = d.hops[key].map((tr, i) => i === t ? { ...tr, in: e.target.value } : tr);
                              sd("hops", { ...d.hops, [key]: trials });
                            }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 6, padding: "6px 10px", background: "#0f0f0f", borderRadius: 6, border: `1px solid ${LIME}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Avg</span>
                      <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 800, color: (key === ki ? avgI : avgU) ? LIME : MUTED }}>
                        {(key === ki ? avgI : avgU) ? `${(key === ki ? avgI : avgU)} in` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* 6m Timed Hop — 3 trials per side */}
        <div style={{ marginBottom: 18, background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: WHITE }}>6m Timed Hop</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>LSI</span>
              <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: lsiColor(hopLSIs.timed) }}>{hopLSIs.timed ? hopLSIs.timed + "%" : "—"}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[[`${inv} (Involved)`, "timedI"], [`${uninv} (Uninvolved)`, "timedU"]].map(([sideLabel, key]) => {
              const avg = hopAvgTimed(d.hops[key]);
              return (
                <div key={key}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{sideLabel}</div>
                  {[0,1,2].map(t => (
                    <div key={t} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 6, alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>T{t+1}</span>
                      <div>
                        <label style={{ ...lbl, marginBottom: 2 }}>sec</label>
                        <input style={inp} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00"
                          value={d.hops[key][t]}
                          onChange={e => {
                            const trials = d.hops[key].map((v, i) => i === t ? e.target.value : v);
                            sd("hops", { ...d.hops, [key]: trials });
                          }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 6, padding: "6px 10px", background: "#0f0f0f", borderRadius: 6, border: `1px solid ${LIME}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Avg</span>
                    <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 800, color: avg ? LIME : MUTED }}>
                      {avg ? `${avg} sec` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 10, padding: "10px 16px", background: "#0f0f0f", borderRadius: 8, border: `1px solid ${BORDER}`, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[["≥90% — RTS Met", LIME],["80–89% — Borderline", GOLD],["<80% — Not Met", RED_BAD]].map(([l, c]) => (
            <span key={l} style={{ fontSize: 11, fontWeight: 700, color: c }}>■ {l}</span>
          ))}
        </div>
      </Card>

      {/* Agility */}
      <Card title="Pro Agility Test (5-10-5)" id="agility" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>Sprints 5 yards, 10 yards, 5 yards. Record best time. Lower is better.</div>
        <R3>
          <div>
            <label style={lbl}>Best Time (sec)</label>
            <input style={isOutOfRange("agilityTime", d.agilityTime) ? inpInvalid : inp} type="number" inputMode="decimal" step="0.01" placeholder="e.g. 4.42" value={d.agilityTime} onChange={e => sd("agilityTime", e.target.value)} title={isOutOfRange("agilityTime", d.agilityTime) ? "Value out of expected range (3.0–10.0s)" : undefined} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={lbl}>Comparison Norm Group</label>
            <select style={inp} value={normGroup} onChange={e => setNormGroup(e.target.value)}>
              {Object.keys(agilityNorms).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </R3>
        {hasVal(d.agilityTime) && norm && (
          <StatBar stats={[
            { label: "Patient Time",   value: d.agilityTime + " sec", color: WHITE },
            { label: "Norm Mean",      value: norm.mean + " sec",     color: MUTED },
            { label: "Diff vs Norm",   value: (toNum(d.agilityTime) - norm.mean).toFixed(2) + " sec", color: toNum(d.agilityTime) <= norm.mean ? LIME : RED_BAD },
            { label: "Classification", value: agClass()?.label, color: agClass()?.color },
          ]} />
        )}
      </Card>

      {/* Patient-Reported Outcomes */}
      <Card title="Patient-Reported Outcomes" id="pro" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          IKDC ≥ 95 is required for full RTS clearance. Tampa Scale (TSK-11) score ≤ 17 indicates acceptable kinesiophobia levels for RTS.
        </div>
        <R2>
          <div>
            <Field label="IKDC Score" unit="/ 100" value={d.ikdc} onChange={v => sd("ikdc", v)} placeholder="0–100" fieldKey="ikdc" />
            {hasVal(d.ikdc) && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: parseFloat(d.ikdc) >= 95 ? LIME : parseFloat(d.ikdc) >= 80 ? GOLD : RED_BAD }}>{d.ikdc}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: parseFloat(d.ikdc) >= 95 ? LIME : parseFloat(d.ikdc) >= 80 ? GOLD : RED_BAD }}>
                  {parseFloat(d.ikdc) >= 95 ? "✓ Meets RTS threshold" : parseFloat(d.ikdc) >= 80 ? "Approaching threshold" : "Below threshold"}
                </div>
              </div>
            )}
          </div>
          <div>
            <Field label="Tampa Scale (TSK-11)" unit="score" value={d.tampa} onChange={v => sd("tampa", v)} placeholder="11–44" fieldKey="tampa" />
            {hasVal(d.tampa) && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: parseFloat(d.tampa) <= 17 ? LIME : parseFloat(d.tampa) <= 22 ? GOLD : RED_BAD }}>{d.tampa}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: parseFloat(d.tampa) <= 17 ? LIME : parseFloat(d.tampa) <= 22 ? GOLD : RED_BAD }}>
                  {parseFloat(d.tampa) <= 17 ? "✓ Acceptable fear levels" : parseFloat(d.tampa) <= 22 ? "Mild kinesiophobia" : "Elevated kinesiophobia"}
                </div>
              </div>
            )}
          </div>
        </R2>
        <div style={{ marginTop: 8, padding: "8px 14px", background: "#0f0f0f", borderRadius: 6, border: `1px solid ${BORDER}`, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[["IKDC ≥ 95 — RTS Threshold", LIME], ["TSK-11 ≤ 17 — Acceptable", LIME], ["TSK-11 > 22 — Elevated Fear", RED_BAD]].map(([l, c]) => (
            <span key={l} style={{ fontSize: 11, fontWeight: 700, color: c }}>■ {l}</span>
          ))}
        </div>
      </Card>

      <button onClick={generateNote} style={{ width: "100%", padding: 16, borderRadius: 12, fontSize: 13, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", background: `linear-gradient(135deg,${LIME},${LIME_DIM})`, color: BLACK, border: "none", boxShadow: `0 8px 32px ${LIME}44`, marginBottom: 20 }}>
        ⬇ Generate SOAP Note Objective
      </button>

      {d.noteText && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${LIME}44`, marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", background: LIME + "14", borderBottom: `1px solid ${LIME}33` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: LIME, letterSpacing: "0.15em", textTransform: "uppercase" }}>SOAP Note — Objective Section</span>
            <button onClick={copyNote} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer", background: noteCopied ? "#15803d" : LIME, color: BLACK, border: "none" }}>
              {noteCopied ? "✓ Copied!" : "Copy to Clipboard"}
            </button>
          </div>
          <pre style={{ padding: 20, background: "#0a0a0a", color: "#d4faa6", fontSize: 12, fontFamily: "monospace", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0, maxHeight: 500, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>{d.noteText}</pre>
        </div>
      )}
    </div>
  );
}

// ─── TAB 2: COMPARISON ────────────────────────────────────────────────────────
function Tab2({ currentData: d, sessions, setSessions, onAddSession }) {
  const [copiedPara, setCopiedPara] = useState(false);
  const [paragraph,  setParagraph]  = useState("");
  const computeMetrics = (sd) => {
    if (!sd) return null;
    const invR = sd.patient?.involvedSide === "Right";
    const inv  = sd.patient?.involvedSide || "Left";
    const uninv = invR ? "Left" : "Right";
    const torRnm  = calcTorqueNm(sd.forceR, sd.tib);
    const torLnm  = calcTorqueNm(sd.forceL, sd.tib);
    const normR   = calcNorm(torRnm, sd.bw);
    const normL   = calcNorm(torLnm, sd.bw);
    const torLSI  = invR ? calcLSI(normR, normL) : calcLSI(normL, normR);
    const keLSI   = invR ? calcLSI(sd.keR, sd.keL) : calcLSI(sd.keL, sd.keR);
    const yb      = sd.yBalance || {};
    const ybR     = calcYBalance(yb.rAnt, yb.rPM, yb.rPL, sd.limbLen);
    const ybL     = calcYBalance(yb.lAnt, yb.lPM, yb.lPL, sd.limbLen);
    const ybInv   = invR ? ybR : ybL;
    const hAvgSI  = hopAvgIn(sd.hops?.singleI || []);
    const hAvgSU  = hopAvgIn(sd.hops?.singleU || []);
    const hAvgTI  = hopAvgIn(sd.hops?.tripleI || []);
    const hAvgTU  = hopAvgIn(sd.hops?.tripleU || []);
    const hAvgCI  = hopAvgIn(sd.hops?.crossI  || []);
    const hAvgCU  = hopAvgIn(sd.hops?.crossU  || []);
    const hTimI   = hopAvgTimed(sd.hops?.timedI || []);
    const hTimU   = hopAvgTimed(sd.hops?.timedU || []);
    const girthR  = [sd.girth?.r5, sd.girth?.r10, sd.girth?.r15].reduce((a,v) => a + toNum(v), 0);
    const girthL  = [sd.girth?.l5, sd.girth?.l10, sd.girth?.l15].reduce((a,v) => a + toNum(v), 0);
    const girthAsym = Math.max(girthR, girthL) > 0 ? ((Math.abs(girthR - girthL) / Math.max(girthR, girthL)) * 100).toFixed(1) : null;

    return {
      wks:        sd.patient?.weeksPostOp || null,
      date:       sd.patient?.date        || null,
      sex:        sd.patient?.sex         || "Male",
      flexInv:    invR ? sd.flexR : sd.flexL,
      flexUninv:  invR ? sd.flexL : sd.flexR,
      extInv:     invR ? sd.extR  : sd.extL,
      girthAsym,
      keInv:      invR ? sd.keR   : sd.keL,
      keLSI,
      torLSI,
      sqLSI:      (sd.valdSquat || {}).lsiPct  || null,
      cmjHeight:  (sd.valdCMJ   || {}).jumpHeight || null,
      slForceAsym: (() => {
        const s = sd.slLandHold || {};
        if (!hasVal(s.rPeakForce) || !hasVal(s.lPeakForce)) return null;
        const mx = Math.max(toNum(s.rPeakForce), toNum(s.lPeakForce));
        return mx > 0 ? ((Math.abs(toNum(s.rPeakForce) - toNum(s.lPeakForce)) / mx) * 100).toFixed(1) : null;
      })(),
      slTTSAsym: (() => {
        const s = sd.slLandHold || {};
        if (!hasVal(s.rTTS) || !hasVal(s.lTTS)) return null;
        const mx = Math.max(toNum(s.rTTS), toNum(s.lTTS));
        return mx > 0 ? ((Math.abs(toNum(s.rTTS) - toNum(s.lTTS)) / mx) * 100).toFixed(1) : null;
      })(),
      ybInv,
      hopSingle:  calcLSI(hAvgSI, hAvgSU),
      hopTriple:  calcLSI(hAvgTI, hAvgTU),
      hopCross:   calcLSI(hAvgCI, hAvgCU),
      hopTimed:   calcTimedLSI(hTimI, hTimU),
      agility:    sd.agilityTime || null,
      ikdc:       sd.ikdc        || null,
      tampa:      sd.tampa       || null,
      tpfR:       sd.tpfR        || null,
      tpfL:       sd.tpfL        || null,
      inv, uninv,
    };
  };

  // All columns: sessions (oldest→newest) + current
  const sessionCols = sessions.map((s, i) => ({
    key: `s${i}`,
    label: s.label,
    metrics: computeMetrics(s.data),
    isSession: true,
  }));
  const currentCol = {
    key: "current",
    label: "Today",
    metrics: computeMetrics(d),
    isCurrent: true,
  };
  const allCols = [...sessionCols, currentCol];
  const hasSessions = sessions.length > 0;

  // ── Row definitions ──
  const inv = d.patient?.involvedSide || "Left";
  const uninv = d.patient?.involvedSide === "Right" ? "Left" : "Right";

  const metricRows = [
    { label: "Weeks Post-Op",          key: "wks",       u: " wks",  higher: true,  group: "session"   },
    { label: `Flex ${inv} (°)`,        key: "flexInv",   u: "°",     higher: true,  group: "rom"       },
    { label: `Flex ${uninv} (°)`,      key: "flexUninv", u: "°",     higher: true,  group: "rom"       },
    { label: `Ext ${inv} (°)`,         key: "extInv",    u: "°",     higher: null,  group: "rom"       },
    { label: "Girth Asymmetry (%)",    key: "girthAsym", u: "%",     higher: false, group: "girth"     },
    { label: `KE Strength ${inv}`,     key: "keInv",     u: " lbs",  higher: true,  group: "strength"  },
    { label: "KE LSI (%)",             key: "keLSI",     u: "%",     higher: true,  group: "strength",  spark: true },
    { label: "Quad Index (%)",         key: "torLSI",    u: "%",     higher: true,  group: "strength",  spark: true },
    { label: "Squat LSI (%)",          key: "sqLSI",     u: "%",     higher: true,  group: "strength",  spark: true },
    { label: "CMJ Height (cm)",              key: "cmjHeight",   u: " cm",   higher: true,  group: "power"     },
    { label: "SL Land Force Asym (%)",       key: "slForceAsym", u: "%",     higher: false, group: "power"     },
    { label: "SL Land TTS Asym (%)",         key: "slTTSAsym",   u: "%",     higher: false, group: "power"     },
    { label: `Y-Balance ${inv} (%)`,   key: "ybInv",     u: "%",     higher: true,  group: "balance",   spark: true },
    { label: "Single Hop LSI (%)",     key: "hopSingle", u: "%",     higher: true,  group: "hop",       spark: true },
    { label: "Triple Hop LSI (%)",     key: "hopTriple", u: "%",     higher: true,  group: "hop",       spark: true },
    { label: "Crossover Hop LSI (%)",  key: "hopCross",  u: "%",     higher: true,  group: "hop",       spark: true },
    { label: "6m Timed Hop LSI (%)",   key: "hopTimed",  u: "%",     higher: true,  group: "hop",       spark: true },
    { label: "Pro Agility (sec)",      key: "agility",   u: " sec",  higher: false, group: "agility"   },
    { label: "IKDC Score",             key: "ikdc",      u: "/100",  higher: true,  group: "pro",       spark: true },
    { label: "Tampa Scale (TSK-11)",   key: "tampa",     u: "",      higher: false, group: "pro",       spark: true },
  ];

  const groups = [
    { key: "session",  label: "Session"   },
    { key: "rom",      label: "ROM"       },
    { key: "girth",    label: "Girth"     },
    { key: "strength", label: "Strength"  },
    { key: "power",    label: "Power"     },
    { key: "balance",  label: "Balance"   },
    { key: "hop",      label: "Hop Tests" },
    { key: "agility",  label: "Agility"   },
    { key: "pro",      label: "Outcomes"  },
  ];

  // ── Delta helpers ──
  const delta = (cur, prev, higher) => {
    const c = parseFloat(cur), p = parseFloat(prev);
    if (isNaN(c) || isNaN(p)) return null;
    const diff = c - p;
    if (Math.abs(diff) < 0.05) return { diff: 0, dir: "same" };
    const improved = higher === true ? diff > 0 : higher === false ? diff < 0 : null;
    return { diff: Math.abs(diff).toFixed(1), dir: improved === null ? "neutral" : improved ? "up" : "down" };
  };
  const deltaColor = (dir) => ({ up: LIME, down: RED_BAD, same: GOLD, neutral: MUTED }[dir] || MUTED);
  const deltaArrow = (dir) => ({ up: "▲", down: "▼", same: "=", neutral: "~" }[dir] || "—");

  // ── Sparkline SVG ──
  const Sparkline = ({ rowKey, unit }) => {
    const vals = allCols.map(c => parseFloat(c.metrics?.[rowKey])).filter(v => !isNaN(v));
    if (vals.length < 2) return null;
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const W = 80, H = 24, pad = 3;
    const points = allCols
      .map((c, i) => ({ v: parseFloat(c.metrics?.[rowKey]), i }))
      .filter(p => !isNaN(p.v))
      .map((p, _, arr) => {
        const x = pad + (p.i / (allCols.length - 1)) * (W - pad * 2);
        const y = H - pad - ((p.v - min) / range) * (H - pad * 2);
        return `${x},${y}`;
      });
    const lastVal = parseFloat(allCols[allCols.length - 1].metrics?.[rowKey]);
    const firstVal = parseFloat(allCols.find(c => !isNaN(parseFloat(c.metrics?.[rowKey])))?.metrics?.[rowKey]);
    const trend = !isNaN(lastVal) && !isNaN(firstVal) ? (lastVal > firstVal ? LIME : lastVal < firstVal ? RED_BAD : GOLD) : MUTED;
    return (
      <svg width={W} height={H} style={{ display: "block" }}>
        <polyline points={points.join(" ")} fill="none" stroke={trend} strokeWidth={1.5} strokeLinejoin="round" />
        {points.map((pt, i) => {
          const [x, y] = pt.split(",").map(Number);
          return <circle key={i} cx={x} cy={y} r={2} fill={i === points.length - 1 ? trend : "#333"} stroke={trend} strokeWidth={0.5} />;
        })}
      </svg>
    );
  };

  // ── Smart template progress paragraph ──
  const generateParagraph = () => {
    const cur  = computeMetrics(d);
    const prev = sessions.length > 0 ? computeMetrics(sessions[sessions.length - 1].data) : null;
    const inv  = d.patient?.involvedSide || "Left";
    const uninv = inv === "Right" ? "Left" : "Right";
    const wks  = toNum(d.patient?.weeksPostOp);
    const mos  = wks > 0 ? (wks / 4.33).toFixed(1) : null;
    const graft = d.patient?.graftType;
    const sex  = d.patient?.sex || "Male";
    const torqueNorm = inv === "Right"
      ? calcNorm(calcTorqueNm(d.forceR, d.tib), d.bw)
      : calcNorm(calcTorqueNm(d.forceL, d.tib), d.bw);
    const torqueThreshLow  = sex === "Female" ? 2.7 : 3.1;
    const torqueThreshHigh = sex === "Female" ? 2.9 : 3.3;

    const n = (v) => parseFloat(v);
    const changed = (cur, prev) => {
      if (!cur || !prev) return null;
      const diff = (n(cur) - n(prev)).toFixed(1);
      const dir = n(cur) > n(prev) ? "increased" : n(cur) < n(prev) ? "decreased" : "unchanged";
      return { diff: Math.abs(diff), dir, improved: n(cur) > n(prev) };
    };

    const sentences = [];

    // ── Opening: patient context ──
    let opening = "Patient is";
    if (wks > 0) opening += ` ${wks} weeks (${mos} months) post-operative`;
    else opening += " post-operative";
    opening += " ACL reconstruction";
    if (graft) opening += ` with a ${graft} graft`;
    opening += ".";
    sentences.push(opening);

    // ── Strength section ──
    const strengthParts = [];
    if (cur.keLSI) {
      const kv = n(cur.keLSI);
      const ch = prev?.keLSI ? changed(cur.keLSI, prev.keLSI) : null;
      let s = `Knee extension limb symmetry index (LSI) is ${cur.keLSI}%`;
      if (ch) s += `, ${ch.dir} from ${prev.keLSI}% at the previous assessment`;
      if (kv >= 95) s += `, meeting the ≥95% threshold for full return-to-sport clearance`;
      else if (kv >= 90) s += `, meeting the ≥90% RTS benchmark though not yet at the ≥95% full clearance threshold`;
      else if (kv >= 80) s += `, approaching but not yet meeting the ≥90% RTS threshold`;
      else s += `, remaining below the ≥80% minimum — continued quadriceps strengthening is the primary emphasis`;
      strengthParts.push(s);
    }
    if (torqueNorm) {
      const tv = n(torqueNorm);
      let s = `Normalized quadriceps torque is ${torqueNorm} Nm/kg`;
      if (tv >= torqueThreshLow) s += `, meeting the sex-specific normative target of ${torqueThreshLow}–${torqueThreshHigh} Nm/kg`;
      else s += `, below the sex-specific target of ${torqueThreshLow}–${torqueThreshHigh} Nm/kg`;
      strengthParts.push(s);
    }
    if (strengthParts.length > 0) sentences.push(strengthParts.join("; ") + ".");

    // ── ROM section ──
    if (cur.flexInv || cur.flexUninv) {
      const flexCh = prev?.flexInv ? changed(cur.flexInv, prev.flexInv) : null;
      let s = `Range of motion assessment demonstrates knee flexion of ${cur.flexInv}°`;
      if (cur.flexUninv) s += ` on the involved (${inv}) side and ${cur.flexUninv}° on the uninvolved (${uninv}) side`;
      if (flexCh && flexCh.diff > 0) s += `; flexion has ${flexCh.dir} ${flexCh.diff}° since last session`;
      const flexDiff = cur.flexInv && cur.flexUninv ? Math.abs(n(cur.flexInv) - n(cur.flexUninv)) : null;
      if (flexDiff !== null) {
        if (flexDiff <= 5) s += `, with symmetrical motion (${flexDiff}° side difference)`;
        else s += `, with a ${flexDiff.toFixed(0)}° side difference indicating residual motion deficit on the involved side`;
      }
      sentences.push(s + ".");
    }

    // ── Girth section ──
    if (cur.girthAsym) {
      const gv = n(cur.girthAsym);
      const ch = prev?.girthAsym ? changed(cur.girthAsym, prev.girthAsym) : null;
      let s = `Thigh girth asymmetry measures ${cur.girthAsym}%`;
      if (ch && ch.diff > 0) s += `, ${ch.improved ? "increased" : "improved"} from ${prev.girthAsym}%`;
      if (gv <= 10) s += `, meeting the ≤10% full clearance criterion`;
      else if (gv <= 15) s += `, approaching but not yet within the ≤10% acceptable threshold`;
      else s += `, indicating meaningful quadriceps atrophy on the involved side`;
      sentences.push(s + ".");
    }

    // ── Hop testing section ──
    const hopVals = [
      { name: "single hop", cur: cur.hopSingle, prev: prev?.hopSingle },
      { name: "triple hop", cur: cur.hopTriple, prev: prev?.hopTriple },
      { name: "crossover hop", cur: cur.hopCross, prev: prev?.hopCross },
      { name: "6-meter timed hop", cur: cur.hopTimed, prev: prev?.hopTimed },
    ].filter(h => h.cur !== null);

    if (hopVals.length > 0) {
      const hopMet    = hopVals.filter(h => n(h.cur) >= 90);
      const hopNotMet = hopVals.filter(h => n(h.cur) < 90);
      const hopReg    = hopVals.filter(h => h.prev && n(h.cur) < n(h.prev));
      const avgLSI    = (hopVals.reduce((a, h) => a + n(h.cur), 0) / hopVals.length).toFixed(1);

      let s = `Functional hop testing (performed at 7/10 RPE per protocol) yields an average LSI of ${avgLSI}% across ${hopVals.length} test${hopVals.length > 1 ? "s" : ""}`;

      if (hopMet.length === hopVals.length) {
        s += `, with all values meeting the ≥90% return-to-sport benchmark`;
      } else if (hopMet.length > 0) {
        s += `; the ${hopMet.map(h => h.name).join(" and ")} meet${hopMet.length === 1 ? "s" : ""} the ≥90% benchmark while the ${hopNotMet.map(h => h.name).join(" and ")} remain${hopNotMet.length === 1 ? "s" : ""} below threshold`;
      } else {
        s += `, with no values yet meeting the ≥90% RTS benchmark`;
      }

      if (hopReg.length > 0) {
        s += `; notably, the ${hopReg.map(h => `${h.name} (${h.cur}%, down from ${h.prev}%)`).join(" and ")} show${hopReg.length === 1 ? "s" : ""} regression from the previous session and warrant attention`;
      } else if (prev && hopVals.some(h => h.prev)) {
        const improved = hopVals.filter(h => h.prev && n(h.cur) > n(h.prev));
        if (improved.length > 0) s += `, with improvement noted in the ${improved.map(h => h.name).join(" and ")} since last assessment`;
      }
      sentences.push(s + ".");
    }

    // ── Hamstring / H:Q ──
    const hsNormInv = inv === "Right"
      ? calcNorm(calcTorqueNm(d.hsR, d.tib), d.bw)
      : calcNorm(calcTorqueNm(d.hsL, d.tib), d.bw);
    const quadNormInv = torqueNorm;
    const hqRatio = (hasVal(hsNormInv) && hasVal(quadNormInv) && toNum(quadNormInv) > 0)
      ? ((toNum(hsNormInv) / toNum(quadNormInv)) * 100).toFixed(1) : null;
    if (hqRatio) {
      const hv = n(hqRatio);
      let s = `Hamstring-to-quadriceps ratio on the involved (${inv}) side is ${hqRatio}%`;
      if (hv >= 60) s += `, meeting the ≥60% benchmark`;
      else if (hv >= 50) s += `, borderline relative to the ≥60% benchmark`;
      else s += `, below the ≥60% benchmark — relative hamstring deficit warrants targeted intervention`;
      sentences.push(s + ".");
    }

    // ── Vald force platform ──
    const cmj = d.valdCMJ || {};
    const slh = d.slLandHold || {};
    const valdParts = [];
    if (hasVal(cmj.eccBrakingImpAsym) || hasVal(cmj.concPeakForceAsym)) {
      let s = "CMJ force platform testing";
      const cmjMetrics = [];
      if (hasVal(cmj.eccBrakingImpAsym)) {
        const v = n(cmj.eccBrakingImpAsym);
        cmjMetrics.push(`eccentric braking impulse asymmetry ${cmj.eccBrakingImpAsym}% (${v <= 10 ? "within" : "exceeds"} ≤10% threshold)`);
      }
      if (hasVal(cmj.concPeakForceAsym)) {
        const v = n(cmj.concPeakForceAsym);
        cmjMetrics.push(`concentric peak force asymmetry ${cmj.concPeakForceAsym}% (${v <= 10 ? "within" : "exceeds"} ≤10% threshold)`);
      }
      if (cmj.jumpHeight) cmjMetrics.push(`jump height ${cmj.jumpHeight} cm`);
      s += ` reveals ${cmjMetrics.join("; ")}`;
      valdParts.push(s);
    }
    if (hasVal(slh.rPeakForce) && hasVal(slh.lPeakForce)) {
      const mx = Math.max(toNum(slh.rPeakForce), toNum(slh.lPeakForce));
      const fa = mx > 0 ? ((Math.abs(toNum(slh.rPeakForce) - toNum(slh.lPeakForce)) / mx) * 100).toFixed(1) : null;
      if (fa !== null) {
        let s = `single-leg land and hold shows peak landing force asymmetry of ${fa}% (${parseFloat(fa) <= 10 ? "within" : "exceeds"} the ≤10% threshold)`;
        if (hasVal(slh.rTTS) && hasVal(slh.lTTS)) {
          const tmx = Math.max(toNum(slh.rTTS), toNum(slh.lTTS));
          const ta = tmx > 0 ? ((Math.abs(toNum(slh.rTTS) - toNum(slh.lTTS)) / tmx) * 100).toFixed(1) : null;
          if (ta !== null) s += `; time to stabilization asymmetry ${ta}% (${parseFloat(ta) <= 10 ? "within" : "exceeds"} threshold)`;
        }
        valdParts.push(s);
      }
    }
    if (valdParts.length > 0) {
      sentences.push("Force platform assessment: " + valdParts.join("; ") + ".");
    }
    if (cur.ybInv) {
      const yv = n(cur.ybInv);
      const ch = prev?.ybInv ? changed(cur.ybInv, prev.ybInv) : null;
      let s = `Y-Balance composite on the involved (${inv}) limb is ${cur.ybInv}% of limb length`;
      if (ch && ch.diff > 0) s += `, ${ch.dir} from ${prev.ybInv}%`;
      if (yv >= 90) s += `, meeting the ≥90% return-to-sport benchmark`;
      else if (yv >= 80) s += `, approaching but not yet meeting the ≥90% RTS threshold`;
      else s += `, below the ≥80% minimum — dynamic balance remains a clinical priority`;
      sentences.push(s + ".");
    }

    // ── PROs ──
    if (cur.ikdc || cur.tampa) {
      const parts = [];
      if (cur.ikdc) {
        const iv = n(cur.ikdc);
        const ch = prev?.ikdc ? changed(cur.ikdc, prev.ikdc) : null;
        let s = `IKDC score is ${cur.ikdc}/100`;
        if (ch && ch.diff > 0) s += `, ${ch.dir} from ${prev.ikdc} at last session`;
        if (iv >= 95) s += ` (meets ≥95 RTS threshold)`;
        else if (iv >= 80) s += ` (approaching the ≥95 threshold required for full clearance)`;
        else s += ` (below the ≥95 threshold)`;
        parts.push(s);
      }
      if (cur.tampa) {
        const tv = n(cur.tampa);
        const ch = prev?.tampa ? changed(cur.tampa, prev.tampa) : null;
        let s = `Tampa Scale of Kinesiophobia score is ${cur.tampa}`;
        if (ch && ch.diff > 0) s += `, ${ch.improved ? "worsened" : "improved"} from ${prev.tampa}`;
        if (tv <= 17) s += ` (acceptable fear of movement levels for RTS)`;
        else if (tv <= 22) s += ` (mild kinesiophobia — psychological readiness should be monitored)`;
        else s += ` (elevated kinesiophobia — psychological readiness intervention recommended prior to RTS clearance)`;
        parts.push(s);
      }
      sentences.push("Patient-reported outcomes: " + parts.join("; ") + ".");
    }

    // ── Trajectory closing ──
    const rtsIndicators = [];
    if (cur.keLSI) rtsIndicators.push({ met: n(cur.keLSI) >= 90, label: "quad strength" });
    if (hopVals.length > 0) rtsIndicators.push({ met: hopVals.every(h => n(h.cur) >= 90), label: "hop testing" });
    if (cur.ybInv) rtsIndicators.push({ met: n(cur.ybInv) >= 90, label: "dynamic balance" });
    if (cur.ikdc) rtsIndicators.push({ met: n(cur.ikdc) >= 95, label: "subjective function" });

    if (rtsIndicators.length > 0) {
      const metCount = rtsIndicators.filter(r => r.met).length;
      const notMet   = rtsIndicators.filter(r => !r.met).map(r => r.label);
      let traj = "";

      if (metCount === rtsIndicators.length) {
        traj = `Overall, patient demonstrates a favorable trajectory across all assessed domains`;
        if (wks > 0 && wks >= 39) traj += `, and is within the expected timeframe for return-to-sport consideration`;
        else if (wks > 0) traj += `; continued progression toward the 9-month clearance milestone is appropriate`;
      } else if (metCount >= rtsIndicators.length / 2) {
        traj = `Overall trajectory is positive, though ${notMet.join(" and ")} remain${notMet.length === 1 ? "s" : ""} below RTS threshold`;
        if (wks > 0 && wks >= 26) traj += `; continued progression is indicated with targeted emphasis on deficient domains`;
        else traj += `; current deficits are consistent with this stage of recovery`;
      } else {
        traj = `Patient continues to demonstrate meaningful deficits in ${notMet.join(", ")}, indicating that return-to-sport clearance is not yet appropriate`;
        if (wks > 0) traj += `; treatment plan should emphasize targeted resolution of these criteria`;
      }
      sentences.push(traj + ".");
    }

    setParagraph(sentences.join(" "));
  };

  const copyPara = () => {
    navigator.clipboard.writeText(paragraph)
      .then(() => { setCopiedPara(true); setTimeout(() => setCopiedPara(false), 2500); })
      .catch(() => {
        try {
          const ta = document.createElement("textarea");
          ta.value = paragraph;
          ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
          document.body.appendChild(ta);
          ta.focus(); ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setCopiedPara(true); setTimeout(() => setCopiedPara(false), 2500);
        } catch (e2) {}
      });
  };

  // Column width
  const colW = 90;
  const labelW = 180;
  const totalW = labelW + (allCols.length * colW) + (hasSessions ? 60 : 0); // 60 for spark col

  return (
    <div>
      {/* ── Header: session management ── */}
      <Card title="Progress Tracking" accent>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          {hasSessions
            ? `Comparing ${sessions.length} previous session${sessions.length > 1 ? "s" : ""} against today's data. Load additional PDFs to add more comparison columns (max 5).`
            : "Load a previous session PDF using the Load button (bottom-right), or add sessions below for comparison only."}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onAddSession} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#1a1a1a", color: "#aaa", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
            + Add Session PDF
          </button>
          {sessions.length > 0 && (
            <button onClick={() => setSessions([])} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${RED_BAD}44`, background: "transparent", color: RED_BAD, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              Clear All Sessions
            </button>
          )}
          {/* Session chips */}
          {sessions.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, background: "#1a1a1a", border: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#aaa" }}>{s.label}</span>
              <button onClick={() => setSessions(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Multi-session comparison table ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "12px 20px", background: "#161616", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: LIME }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "#888", textTransform: "uppercase" }}>Session Timeline</span>
          {!hasSessions && <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>— Load session PDFs to enable multi-session comparison</span>}
        </div>

        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: totalW }}>
            {/* Column headers */}
            <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, background: "#141414" }}>
              <div style={{ width: labelW, flexShrink: 0, padding: "10px 16px", fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Measure</div>
              {allCols.map((col, ci) => (
                <div key={col.key} style={{ width: colW, flexShrink: 0, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: col.isCurrent ? LIME : "#888", letterSpacing: "0.06em", marginBottom: 2 }}>
                    {col.isCurrent ? "TODAY" : `Visit ${ci + 1}`}
                  </div>
                  <div style={{ fontSize: 9, color: col.isCurrent ? LIME + "88" : MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {col.metrics?.wks ? `Wk ${col.metrics.wks}` : col.label}
                  </div>
                  {col.metrics?.date && !col.isCurrent && (
                    <div style={{ fontSize: 8, color: "#444", marginTop: 1 }}>{col.metrics.date}</div>
                  )}
                </div>
              ))}
              {hasSessions && <div style={{ width: 60, flexShrink: 0, padding: "10px 8px", fontSize: 10, fontWeight: 800, color: MUTED, textAlign: "center", textTransform: "uppercase" }}>Trend</div>}
            </div>

            {/* Rows by group */}
            {groups.map(grp => {
              const grpRows = metricRows.filter(r => r.group === grp.key);
              const hasAnyData = grpRows.some(r => allCols.some(c => c.metrics?.[r.key] != null && c.metrics?.[r.key] !== ""));
              if (!hasAnyData) return null;
              return (
                <div key={grp.key}>
                  {/* Group header */}
                  <div style={{ padding: "6px 16px", background: "#111", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}22` }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: MUTED, letterSpacing: "0.16em", textTransform: "uppercase" }}>{grp.label}</span>
                  </div>

                  {grpRows.map((row, ri) => {
                    const curVal = currentCol.metrics?.[row.key];
                    const prevCol = hasSessions ? sessionCols[sessionCols.length - 1] : null;
                    const prevVal = prevCol?.metrics?.[row.key];
                    const d_delta = delta(curVal, prevVal, row.higher);

                    return (
                      <div key={row.key} style={{ display: "flex", alignItems: "center", background: ri % 2 === 0 ? "#111" : "transparent", borderBottom: `1px solid ${BORDER}22` }}>
                        {/* Label */}
                        <div style={{ width: labelW, flexShrink: 0, padding: "9px 16px", fontSize: 11, fontWeight: 600, color: "#ccc" }}>{row.label}</div>

                        {/* Session value cells */}
                        {allCols.map((col, ci) => {
                          const val = col.metrics?.[row.key];
                          const hasV = val != null && val !== "";
                          // Delta vs previous column
                          const prevC = ci > 0 ? allCols[ci - 1] : null;
                          const prevV = prevC?.metrics?.[row.key];
                          const cellDelta = prevC ? delta(val, prevV, row.higher) : null;

                          return (
                            <div key={col.key} style={{ width: colW, flexShrink: 0, padding: "9px 8px", textAlign: "center" }}>
                              <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: col.isCurrent ? 800 : 400, color: col.isCurrent ? WHITE : "#888" }}>
                                {hasV ? `${val}${row.u}` : <span style={{ color: "#333" }}>—</span>}
                              </div>
                              {/* Per-cell delta vs prior column */}
                              {cellDelta && hasV && (
                                <div style={{ fontSize: 9, fontWeight: 700, color: deltaColor(cellDelta.dir), marginTop: 1 }}>
                                  {deltaArrow(cellDelta.dir)}{cellDelta.diff !== "0.0" ? ` ${cellDelta.diff}` : ""}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Sparkline */}
                        {hasSessions && (
                          <div style={{ width: 60, flexShrink: 0, padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {row.spark ? <Sparkline rowKey={row.key} unit={row.u} /> : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ padding: "10px 16px", background: "#0f0f0f", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          {[[LIME, "▲ Improved"], [RED_BAD, "▼ Declined"], [GOLD, "= Unchanged"], [MUTED, "~ Neutral"]].map(([c, l]) => (
            <span key={l} style={{ fontSize: 10, fontWeight: 700, color: c }}>{l}</span>
          ))}
          {hasSessions && <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>Sparklines show full session trend (left = earliest, right = today)</span>}
        </div>
      </div>

      {/* ── Progress paragraph ── */}
      <Card title="Progress Note Generator" accent>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          Generates a structured clinical progress note from all current testing data{hasSessions ? ", with direct comparison against the most recent previous session" : ""}. Benchmarks are evaluated automatically — only sections with entered data appear.
        </div>
        <button
          onClick={generateParagraph}
          style={{
            padding: "12px 32px", borderRadius: 10, fontSize: 12, fontWeight: 800,
            letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
            background: LIME, color: BLACK, border: "none", marginBottom: 14,
          }}>
          Generate Progress Note
        </button>

        {paragraph && (
          <div style={{ background: "#0f0f0f", borderRadius: 10, border: `1px solid ${LIME}44`, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: LIME + "12", borderBottom: `1px solid ${LIME}22` }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: LIME, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Clinical Progress Note {hasSessions ? "— with session comparison" : "— current session only"}
              </span>
              <button onClick={copyPara} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: "pointer", background: copiedPara ? "#15803d" : LIME, color: BLACK, border: "none" }}>
                {copiedPara ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ padding: 20, color: "#d4faa6", fontSize: 13, lineHeight: 2.0, fontFamily: "inherit" }}>{paragraph}</div>
          </div>
        )}
      </Card>
    </div>
  );
}


// ─── TAB 3: PROGRESSION CRITERIA ─────────────────────────────────────────────
function Tab3({ currentData: d, setData }) {
  // active = [trackIdx, sectionIdx within that track]
  const [active, setActive] = useState([0, 0]);
  // attested lives in main data so it persists via PDF save/load and QR restore
  const attested = d.attested || {};
  const toggleAttest = (key) => setData(prev => ({
    ...prev,
    attested: { ...prev.attested, [key]: !(prev.attested?.[key]) },
  }));

  const invR = d.patient.involvedSide === "Right";
  const inv  = d.patient.involvedSide;
  const torRnm  = calcTorqueNm(d.forceR, d.tib);
  const torLnm  = calcTorqueNm(d.forceL, d.tib);
  const normInv = invR ? calcNorm(torRnm, d.bw) : calcNorm(torLnm, d.bw);
  const keLSI   = invR ? calcLSI(d.keR, d.keL) : calcLSI(d.keL, d.keR);
  const wks     = toNum(d.patient.weeksPostOp);
  const mos     = wks / 4.33;
  const hopSingle = calcLSI(hopAvgIn(d.hops.singleI), hopAvgIn(d.hops.singleU));
  const hopTriple = calcLSI(hopAvgIn(d.hops.tripleI), hopAvgIn(d.hops.tripleU));
  const hopCross  = calcLSI(hopAvgIn(d.hops.crossI),  hopAvgIn(d.hops.crossU));
  const hopTimed  = calcTimedLSI(hopAvgTimed(d.hops.timedI), hopAvgTimed(d.hops.timedU));
  const yb        = d.yBalance || {};
  const ybInv     = invR ? calcYBalance(yb.rAnt, yb.rPM, yb.rPL, d.limbLen) : calcYBalance(yb.lAnt, yb.lPM, yb.lPL, d.limbLen);

  // ── helpers ──
  const m    = (v, thresh) => v !== null ? parseFloat(v) >= thresh : null;
  const mWks = (n) => wks > 0 ? wks >= n : null;
  const and  = (...vals) => { if (vals.some(v => v === null)) return null; return vals.every(Boolean); };
  const hopMet80 = () => {
    const vals = [hopSingle, hopTriple, hopCross, hopTimed].filter(v => v !== null);
    if (vals.length === 0) return null;
    return vals.some(v => parseFloat(v) >= 80);
  };
  const hopAllMet = (thresh) => {
    const vals = [hopSingle, hopTriple, hopCross, hopTimed].filter(v => v !== null);
    if (vals.length === 0) return null;
    return vals.every(v => parseFloat(v) >= thresh);
  };

  const keLSIdisp = keLSI   !== null ? `Current: ${keLSI}%`        : "KE strength not entered (Testing tab)";
  const normDisp  = normInv !== null ? `Current: ${normInv} Nm/kg`  : "Requires BW + tibial length + force";
  const wksDisp   = wks > 0         ? `Current: ${wks} wks (${mos.toFixed(1)} mo)` : "Weeks post-op not entered (Testing tab)";
  const ybDisp    = ybInv   !== null ? `Current: ${ybInv}%`         : "Y-Balance data not entered (Testing tab)";
  const hopDetail = [hopSingle, hopTriple, hopCross, hopTimed].filter(v => v !== null).length > 0
    ? `Single: ${hopSingle||"—"}%  Triple: ${hopTriple||"—"}%  Cross: ${hopCross||"—"}%  Timed: ${hopTimed||"—"}%`
    : "Hop data not entered (Testing tab)";

  // ─────────────────────────────────────────────────────────────────────────
  // TRACK DEFINITIONS
  // ─────────────────────────────────────────────────────────────────────────

  const tracks = [
    // ── TRACK 0: REHAB PHASES ──────────────────────────────────────────────
    {
      id: "phases",
      label: "Rehab Phases",
      sublabel: "Phase transitions & criteria",
      color: "#38bdf8",
      sections: [
        {
          label: "Phase 1 → 2",
          time: "Wk 2+",
          color: "#38bdf8",
          description: "Advance from Phase 1 (Recovery from Surgery) to Phase 2 (Strength & Neuromuscular Control). All criteria must be met.",
          groups: [
            {
              title: "Range of Motion",
              criteria: [
                { text: "Full knee extension — symmetrical, including hyperextension", detail: "Assess clinically", met: null, clinical: true },
                { text: "90° knee flexion achieved", detail: wksDisp, met: mWks(2) },
              ],
            },
            {
              title: "Neuromuscular",
              criteria: [
                { text: "Quadriceps lag test passed — maintain full active extension", detail: "Seated at table edge; clinician sets, patient holds", met: null, clinical: true },
                { text: "Minimize arthrogenic muscle inhibition", detail: "Clinical assessment", met: null, clinical: true },
              ],
            },
            {
              title: "Function",
              criteria: [
                { text: "Decreased swelling / effusion", detail: "Clinical assessment", met: null, clinical: true },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 2 weeks post-op", detail: wksDisp, met: mWks(2) },
              ],
            },
          ],
        },
        {
          label: "Phase 2 → 3",
          time: "Wk 12+",
          color: "#84cc16",
          description: "Advance from Phase 2 (Strength & Neuromuscular Control) to Phase 3 (Landings, Running, Agility). All criteria must be met.",
          groups: [
            {
              title: "Range of Motion",
              criteria: [
                { text: "Symmetrical full knee extension including hyperextension", detail: "Clinical measurement", met: null, clinical: true },
                { text: "120° knee flexion by week 6", detail: wksDisp, met: mWks(6) },
                { text: "Full knee flexion ROM achieved", detail: "Target: end of Phase 2", met: null, clinical: true },
              ],
            },
            {
              title: "Balance",
              criteria: [
                { text: "Single leg stance ≥ 43 sec eyes open", detail: "Timed clinical test", met: null, clinical: true },
                { text: "Single leg stance ≥ 9 sec eyes closed", detail: "Timed clinical test", met: null, clinical: true },
              ],
            },
            {
              title: "Strength",
              criteria: [
                { text: "Single leg calf raise — full ROM, 0-2-0-2 tempo × 85% of unaffected side", detail: "85% repetition symmetry", met: null, clinical: true },
                { text: "Single leg press 1RM ≥ 1.5× bodyweight at 90° knee flexion", detail: "Clinical testing", met: null, clinical: true },
              ],
            },
            {
              title: "Function",
              criteria: [
                { text: "Functional alignment test: 20 cm box squat to 60°, 0-2-0-2 × 5 reps", detail: "Positive shin angle required", met: null, clinical: true },
                { text: "Single leg rise test: 90° flexion, arms crossed × 85% of unaffected or 10 reps", detail: "Clinical testing", met: null, clinical: true },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 12 weeks post-op", detail: wksDisp, met: mWks(12) },
              ],
            },
          ],
        },
        {
          label: "Phase 3 → 4",
          time: "Wk 20+",
          color: "#f43f5e",
          description: "Advance from Phase 3 (Landings, Running, Agility) to Phase 4 (Return to Sport). All criteria must be met.",
          groups: [
            {
              title: "Balance",
              criteria: [
                { text: "Single leg rise test × 22 reps at 90° squat, arms crossed", detail: "Exceeds Phase 2 benchmark", met: null, clinical: true },
                { text: "Y-Balance composite ≥ 90% of limb length", detail: ybDisp, met: m(ybInv, 90) },
              ],
            },
            {
              title: "Strength",
              criteria: [
                { text: "Single leg press 1RM ≥ 1.8× bodyweight at 90° knee flexion", detail: "Upgraded from 1.5× in Phase 2", met: null, clinical: true },
                { text: "Squat 1RM ≥ 1.5–1.8× bodyweight (lifting athletes)", detail: "For lifting athletes only", met: null, clinical: true },
              ],
            },
            {
              title: "Hop Testing — all ≥ 90% LSI",
              criteria: [
                { text: "Single hop for distance ≥ 90% LSI", detail: hopSingle !== null ? `Current: ${hopSingle}%` : "Hop data not entered", met: m(hopSingle, 90) },
                { text: "Triple hop for distance ≥ 90% LSI", detail: hopTriple !== null ? `Current: ${hopTriple}%` : "Hop data not entered", met: m(hopTriple, 90) },
                { text: "Triple crossover hop ≥ 90% LSI", detail: hopCross  !== null ? `Current: ${hopCross}%`  : "Hop data not entered", met: m(hopCross, 90) },
                { text: "6m Timed Hop ≥ 90% LSI", detail: hopTimed !== null ? `Current: ${hopTimed}%` : "Hop data not entered", met: m(hopTimed, 90) },
              ],
            },
            {
              title: "Running",
              criteria: [
                { text: "Completed 1 mile run consecutively without pain or effusion", detail: "Running Level 5 milestone", met: null, clinical: true },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 20 weeks post-op (5 months)", detail: wksDisp, met: mWks(20) },
              ],
            },
          ],
        },
      ],
    },

    // ── TRACK 1: ACTIVITY PROGRESSIONS ────────────────────────────────────
    {
      id: "activity",
      label: "Activity Progressions",
      sublabel: "Gait, brace & sport activity unlocks",
      color: "#a78bfa",
      sections: [
        {
          label: "Off Crutches",
          time: "Wk 2",
          color: "#22d3ee",
          description: "Criteria to discontinue crutch use and progress to independent ambulation.",
          groups: [
            {
              title: "Criteria",
              criteria: [
                { text: "Normal gait pattern without crutches", detail: "No Trendelenburg, no antalgic pattern", met: null, clinical: true },
                { text: "Adequate quadriceps control — no extension lag", detail: "Seated quad lag test", met: null, clinical: true },
                { text: "Decreased swelling permitting normal gait", detail: "Clinical assessment", met: null, clinical: true },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 2 weeks post-op", detail: wksDisp, met: mWks(2) },
              ],
            },
          ],
        },
        {
          label: "Unlock Brace",
          time: "Wk 4",
          color: "#818cf8",
          description: "Unlock brace to allow full range of motion (0–90°) for ambulation and exercise.",
          groups: [
            {
              title: "Criteria",
              criteria: [
                { text: "Full active extension maintained — no extension lag", detail: "Quad lag test passed", met: null, clinical: true },
                { text: "90° or greater knee flexion achieved", detail: wksDisp, met: mWks(4) },
                { text: "Controlled swelling with activity", detail: "Clinical assessment", met: null, clinical: true },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 4 weeks post-op", detail: wksDisp, met: mWks(4) },
              ],
            },
          ],
        },
        {
          label: "D/C Brace",
          time: "Wk 6",
          color: "#a78bfa",
          description: "Discontinue brace use for daily ambulation. Patient transitions to brace-free walking.",
          groups: [
            {
              title: "Criteria",
              criteria: [
                { text: "Normal gait pattern without brace", detail: "No compensatory strategies", met: null, clinical: true },
                { text: "Full active extension and adequate quad strength", detail: "Clinical assessment", met: null, clinical: true },
                { text: "Minimal effusion with activity", detail: "Clinical assessment", met: null, clinical: true },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 6 weeks post-op", detail: wksDisp, met: mWks(6) },
              ],
            },
          ],
        },
        {
          label: "Plyometrics",
          time: "Wk 10",
          color: GOLD,
          description: "Initiate Phase 1 bodyweight plyometrics — box jumps, double-leg landing progressions.",
          groups: [
            {
              title: "Strength Gate",
              criteria: [
                { text: "KE LSI ≥ 70%", detail: keLSIdisp, met: m(keLSI, 70) },
              ],
            },
            {
              title: "Phase Prerequisite",
              criteria: [
                { text: "Phase 2 functional criteria satisfied", detail: "Balance, strength, and function goals met", met: mWks(12) },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 10 weeks post-op", detail: wksDisp, met: mWks(10) },
              ],
            },
          ],
        },
        {
          label: "Running",
          time: "Wk 14",
          color: "#a78bfa",
          description: "Initiate running program (Level 1 treadmill/track protocol). Both time AND functional criteria must be met.",
          groups: [
            {
              title: "Strength — either criterion clears",
              logic: "or",
              criteria: [
                { text: "KE LSI ≥ 70%", detail: keLSIdisp, met: m(keLSI, 70), isOr: true },
                { text: "OR Normalized quad torque ≥ 1.5 Nm/kg (involved)", detail: normDisp, met: m(normInv, 1.5), isOr: true },
              ],
            },
            {
              title: "Functional Hop",
              criteria: [
                { text: "At least one hop test ≥ 80% LSI", detail: hopDetail, met: hopMet80() },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 14 weeks post-op (3.5 months)", detail: wksDisp, met: mWks(14) },
              ],
            },
            {
              title: "Allograft Note",
              criteria: [
                { text: "⚠ Allograft only: delay running until 4.5 months AND hop ≥ 80%", detail: "Autograft: no additional delay. Allograft: verify graft type.", met: null, clinical: true },
              ],
            },
          ],
        },
        {
          label: "Sprinting",
          time: "Mo 4",
          color: "#fb923c",
          description: "Initiate sprint work, ladder drills, shuttle runs, pivoting, and cutting progressions.",
          groups: [
            {
              title: "Running Prerequisite",
              criteria: [
                { text: "Completed 1 mile run consecutively without pain or effusion", detail: "Running Levels 1–5 completed", met: null, clinical: true },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 4 months post-op (≥ 17 weeks)", detail: wksDisp, met: mWks(17) },
              ],
            },
            {
              title: "Allograft Note",
              criteria: [
                { text: "⚠ Allograft only: delay sprinting until month 5–6 AND 1 mile run completed", detail: "Autograft: 4 months + 1 mile. Allograft: 5–6 months + 1 mile.", met: null, clinical: true },
              ],
            },
          ],
        },
      ],
    },

    // ── TRACK 2: RETURN TO SPORT ───────────────────────────────────────────
    {
      id: "rts",
      label: "Return to Sport",
      sublabel: "Practice, contact & full clearance",
      color: LIME,
      sections: [
        {
          label: "Non-Contact",
          time: "Mo 6",
          color: "#e879f9",
          description: "Return to non-contact sport practice. Sport-specific drills with ATC/strength coach. No live contact or scrimmage.",
          groups: [
            {
              title: "Phase 3 → 4 Prerequisite",
              criteria: [
                { text: "All Phase 3 → Phase 4 criteria satisfied", detail: "Strength, hop testing, balance, and running milestones complete", met: and(m(hopSingle, 90), m(hopTriple, 90), m(hopCross, 90), mWks(20)) },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 6 months post-op (≥ 26 weeks)", detail: wksDisp, met: mWks(26) },
              ],
            },
            {
              title: "Restriction",
              criteria: [
                { text: "Non-contact only — no live contact, scrimmage, or full practice", detail: "Sport-specific drills with ATC/strength coach supervision only", met: null, clinical: true },
              ],
            },
          ],
        },
        {
          label: "Contact",
          time: "Mo 7",
          color: "#f59e0b",
          description: "Return to full contact practice. Patient must have completed non-contact phase without issue.",
          groups: [
            {
              title: "Non-Contact Phase Prerequisite",
              criteria: [
                { text: "Non-contact practice completed without pain or effusion for ≥ 1 week", detail: "Must pass non-contact phase first", met: null, clinical: true },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 7 months post-op (≥ 30 weeks)", detail: wksDisp, met: mWks(30) },
              ],
            },
          ],
        },
        {
          label: "Full Clearance",
          time: "Mo 9",
          color: LIME,
          description: "Full return-to-sport clearance. All Phase 4 goals must be met AND multidisciplinary clearance obtained.",
          groups: [
            {
              title: "Patient-Reported Outcomes",
              criteria: [
                { text: "IKDC Subjective Knee Form ≥ 95", detail: hasVal(d.ikdc) ? `Current: ${d.ikdc}` : "IKDC not entered (Testing tab)", met: m(d.ikdc, 95) },
                { text: "Tampa Scale of Kinesiophobia (TSK-11) ≤ 17", detail: hasVal(d.tampa) ? `Current: ${d.tampa}${parseFloat(d.tampa) <= 17 ? " ✓" : " — elevated kinesiophobia"}` : "Tampa not entered (Testing tab)", met: hasVal(d.tampa) ? parseFloat(d.tampa) <= 17 : null },
                { text: "ACL-Return to Sport Inventory ≥ 95%", detail: "Patient-reported outcome", met: null, clinical: true },
              ],
            },
            {
              title: "Range of Motion",
              criteria: [
                { text: "Full ROM — symmetrical to uninvolved side", detail: (() => {
                  const invR2 = d.patient.involvedSide === "Right";
                  const fInv = invR2 ? d.flexR : d.flexL, fUninv = invR2 ? d.flexL : d.flexR;
                  const eInv = invR2 ? d.extR  : d.extL,  eUninv = invR2 ? d.extL  : d.extR;
                  if (!hasVal(fInv) && !hasVal(eInv)) return "ROM not entered (Testing tab)";
                  const parts = [];
                  if (hasVal(fInv) && hasVal(fUninv)) parts.push(`Flex: ${fInv}° vs ${fUninv}°`);
                  if (hasVal(eInv) && hasVal(eUninv)) parts.push(`Ext: ${eInv}° vs ${eUninv}°`);
                  return parts.join("  ") || "ROM data partial";
                })(), met: null, clinical: true },
              ],
            },
            {
              title: "Quad Girth",
              criteria: [
                { text: "Quad girth asymmetry ≤ 10% bilaterally", detail: (() => {
                  const gR = [d.girth?.r5, d.girth?.r10, d.girth?.r15].reduce((a,v) => a + toNum(v), 0);
                  const gL = [d.girth?.l5, d.girth?.l10, d.girth?.l15].reduce((a,v) => a + toNum(v), 0);
                  if (gR === 0 && gL === 0) return "Girth not entered (Testing tab)";
                  const asym = ((Math.abs(gR - gL) / Math.max(gR, gL)) * 100).toFixed(1);
                  return `Current asymmetry: ${asym}%`;
                })(), met: (() => {
                  const gR = [d.girth?.r5, d.girth?.r10, d.girth?.r15].reduce((a,v) => a + toNum(v), 0);
                  const gL = [d.girth?.l5, d.girth?.l10, d.girth?.l15].reduce((a,v) => a + toNum(v), 0);
                  if (gR === 0 && gL === 0) return null;
                  const asym = (Math.abs(gR - gL) / Math.max(gR, gL)) * 100;
                  return asym <= 10;
                })() },
              ],
            },
            {
              title: "Quadriceps Strength",
              criteria: [
                { text: "Limb Symmetry Index ≥ 90%", detail: keLSIdisp, met: m(keLSI, 90) },
                { text: "Peak force within 10% side-to-side", detail: (() => {
                  if (!hasVal(d.keR) || !hasVal(d.keL)) return "KE strength not entered (Testing tab)";
                  const asym = (Math.abs(toNum(d.keR) - toNum(d.keL)) / Math.max(toNum(d.keR), toNum(d.keL)) * 100).toFixed(1);
                  return `Current asymmetry: ${asym}%`;
                })(), met: (() => {
                  if (!hasVal(d.keR) || !hasVal(d.keL)) return null;
                  return (Math.abs(toNum(d.keR) - toNum(d.keL)) / Math.max(toNum(d.keR), toNum(d.keL)) * 100) <= 10;
                })() },
                { text: "Time to peak force within 10% side-to-side", detail: (() => {
                  if (!hasVal(d.tpfR) || !hasVal(d.tpfL)) return "Time to peak force not entered (Testing tab)";
                  const asym = (Math.abs(toNum(d.tpfR) - toNum(d.tpfL)) / Math.max(toNum(d.tpfR), toNum(d.tpfL)) * 100).toFixed(1);
                  return `Current asymmetry: ${asym}%`;
                })(), met: (() => {
                  if (!hasVal(d.tpfR) || !hasVal(d.tpfL)) return null;
                  return (Math.abs(toNum(d.tpfR) - toNum(d.tpfL)) / Math.max(toNum(d.tpfR), toNum(d.tpfL)) * 100) <= 10;
                })() },
                { text: (() => {
                  const sex = d.patient?.sex || "Male";
                  return sex === "Female"
                    ? "Normalized quad torque ≥ 2.7–2.9 Nm/kg (involved, female norm)"
                    : "Normalized quad torque ≥ 3.1–3.3 Nm/kg (involved, male norm)";
                })(), detail: normDisp, met: (() => {
                  if (!normInv) return null;
                  const sex = d.patient?.sex || "Male";
                  return sex === "Female" ? parseFloat(normInv) >= 2.7 : parseFloat(normInv) >= 3.1;
                })() },
              ],
            },
            {
              title: "Force Platform — CMJ (within 10% asymmetry & CoV)",
              criteria: [
                { text: "Max eccentric braking impulse asymmetry ≤ 10%", detail: hasVal(d.valdCMJ?.eccBrakingImpAsym) ? `Current: ${d.valdCMJ.eccBrakingImpAsym}%` : "Vald CMJ data not entered", met: hasVal(d.valdCMJ?.eccBrakingImpAsym) ? parseFloat(d.valdCMJ.eccBrakingImpAsym) <= 10 : null },
                { text: "Eccentric braking impulse CoV ≤ 10%",           detail: hasVal(d.valdCMJ?.eccBrakingImpCov)  ? `Current: ${d.valdCMJ.eccBrakingImpCov}%`  : "Vald CMJ data not entered", met: hasVal(d.valdCMJ?.eccBrakingImpCov)  ? parseFloat(d.valdCMJ.eccBrakingImpCov)  <= 10 : null },
                { text: "Max concentric peak force asymmetry ≤ 10%",     detail: hasVal(d.valdCMJ?.concPeakForceAsym) ? `Current: ${d.valdCMJ.concPeakForceAsym}%` : "Vald CMJ data not entered", met: hasVal(d.valdCMJ?.concPeakForceAsym) ? parseFloat(d.valdCMJ.concPeakForceAsym) <= 10 : null },
                { text: "Concentric peak force CoV ≤ 10%",               detail: hasVal(d.valdCMJ?.concPeakForceCov)  ? `Current: ${d.valdCMJ.concPeakForceCov}%`  : "Vald CMJ data not entered", met: hasVal(d.valdCMJ?.concPeakForceCov)  ? parseFloat(d.valdCMJ.concPeakForceCov)  <= 10 : null },
              ],
            },
            {
              title: "SL Land and Hold (peak force and TTS asymmetry ≤ 10%)",
              criteria: [
                { text: "Peak landing force asymmetry ≤ 10%", detail: (() => { const s = d.slLandHold || {}; if (!hasVal(s.rPeakForce) || !hasVal(s.lPeakForce)) return "SL Land and Hold data not entered"; const fa = ((Math.abs(toNum(s.rPeakForce) - toNum(s.lPeakForce)) / Math.max(toNum(s.rPeakForce), toNum(s.lPeakForce))) * 100).toFixed(1); return `Current: ${fa}%`; })(), met: (() => { const s = d.slLandHold || {}; if (!hasVal(s.rPeakForce) || !hasVal(s.lPeakForce)) return null; const fa = (Math.abs(toNum(s.rPeakForce) - toNum(s.lPeakForce)) / Math.max(toNum(s.rPeakForce), toNum(s.lPeakForce))) * 100; return fa <= 10; })() },
                { text: "Time to stabilization asymmetry ≤ 10%", detail: (() => { const s = d.slLandHold || {}; if (!hasVal(s.rTTS) || !hasVal(s.lTTS)) return "SL Land and Hold data not entered"; const ta = ((Math.abs(toNum(s.rTTS) - toNum(s.lTTS)) / Math.max(toNum(s.rTTS), toNum(s.lTTS))) * 100).toFixed(1); return `Current: ${ta}%`; })(), met: (() => { const s = d.slLandHold || {}; if (!hasVal(s.rTTS) || !hasVal(s.lTTS)) return null; const ta = (Math.abs(toNum(s.rTTS) - toNum(s.lTTS)) / Math.max(toNum(s.rTTS), toNum(s.lTTS))) * 100; return ta <= 10; })() },
              ],
            },
            {
              title: "Hop Testing — fatigued (7/10 RPE prior to testing) — all within 10%",
              criteria: [
                { text: "⚑ All hop tests performed at 7/10 RPE (sport-specific fatigue protocol)", detail: "Hop data carried from Testing tab — confirm RPE was achieved", met: null, clinical: true },
                { text: "Single hop LSI ≥ 90%", detail: hopSingle !== null ? `Current: ${hopSingle}%` : "Hop data not entered", met: m(hopSingle, 90) },
                { text: "Triple hop LSI ≥ 90%", detail: hopTriple !== null ? `Current: ${hopTriple}%` : "Hop data not entered", met: m(hopTriple, 90) },
                { text: "Crossover hop LSI ≥ 90%", detail: hopCross !== null ? `Current: ${hopCross}%` : "Hop data not entered", met: m(hopCross, 90) },
                { text: "6m Timed hop LSI ≥ 90%", detail: hopTimed !== null ? `Current: ${hopTimed}%` : "Hop data not entered", met: m(hopTimed, 90) },
              ],
            },
            {
              title: "General Fitness",
              criteria: [
                { text: "Pro Agility (5-10-5) or equivalent agility test completed", detail: "See Testing tab — agility time entered", met: hasVal(d.agilityTime) ? true : null },
                { text: "Illinois Agility / Timed sprint test completed", detail: "Clinical testing", met: null, clinical: true },
              ],
            },
            {
              title: "Time Gate",
              criteria: [
                { text: "≥ 9 months post-op (≥ 39 weeks)", detail: wksDisp, met: mWks(39) },
              ],
            },
            {
              title: "Allograft Note",
              criteria: [
                { text: "⚠ Allograft only: full RTS delayed until 12 months AND all functional testing ≥ 90%", detail: "Autograft: 9 months. Allograft: 12 months.", met: null, clinical: true },
              ],
            },
            {
              title: "Multidisciplinary Clearance",
              criteria: [
                { text: "Physical Therapist cleared", detail: "PT sign-off required", met: null, clinical: true },
                { text: "Athletic Trainer / Coach cleared", detail: "ATC and coach sign-off required", met: null, clinical: true },
                { text: "Surgeon cleared", detail: "Physician sign-off required", met: null, clinical: true },
              ],
            },
          ],
        },
      ],
    },
  ];

  // ── derived state ──
  const [trackIdx, sectionIdx] = active;
  const track   = tracks[trackIdx];
  const sec     = track.sections[sectionIdx];

  // unique key for attestation scoping
  const attestPrefix = `t${trackIdx}s${sectionIdx}`;

  const groupStatus = (grp, gi) => {
    const vals = grp.criteria.map((c, ci) => {
      if (c.clinical) return attested[`${attestPrefix}:${gi}:${ci}`] === true ? true : null;
      return c.met;
    });
    if (grp.logic === "or") {
      if (vals.every(v => v === null)) return null;
      return vals.some(v => v === true) ? true : false;
    }
    if (vals.every(v => v === null)) return null;
    if (vals.filter(v => v !== null).every(v => v === true)) return vals.some(v => v === false) ? false : true;
    return vals.some(v => v === false) ? false : null;
  };

  // Per-section progress — works for any track/section, not just the active one
  const sectionProgress = (trk, ti, si) => {
    const s = trk.sections[si];
    const prefix = `t${ti}s${si}`;
    let confirmed = 0, pending = 0, failed = 0;
    s.groups.forEach((grp, gi) => {
      grp.criteria.forEach((c, ci) => {
        if (c.clinical) {
          if (attested[`${prefix}:${gi}:${ci}`] === true) confirmed++;
          else pending++;
        } else {
          if (c.met === true)  confirmed++;
          else if (c.met === false) failed++;
          else pending++;
        }
      });
    });
    const total = confirmed + pending + failed;
    return { confirmed, pending, failed, total };
  };

  // Track-level rollup
  const trackProgress = (trk, ti) => {
    let confirmed = 0, pending = 0, failed = 0, total = 0;
    trk.sections.forEach((_, si) => {
      const p = sectionProgress(trk, ti, si);
      confirmed += p.confirmed; pending += p.pending; failed += p.failed; total += p.total;
    });
    return { confirmed, pending, failed, total };
  };

  // ── RTS Full Clearance detection ──
  // Find the Full Clearance section (last section of the RTS track, index 2)
  const rtsTrack = tracks[2];
  const fullClearanceSection = rtsTrack?.sections[rtsTrack.sections.length - 1];
  const fullClearanceProgress = fullClearanceSection ? sectionProgress(rtsTrack, 2, rtsTrack.sections.length - 1) : null;
  const isFullyCleared = fullClearanceProgress
    ? fullClearanceProgress.total > 0 && fullClearanceProgress.failed === 0 && fullClearanceProgress.pending === 0
    : false;

  // timeline data
  const timelineItems = [
    { label: "Wk 2",  sublabel: "Ph 1→2",    color: "#22d3ee", wkThresh: 2  },
    { label: "Wk 4",  sublabel: "Brace",      color: "#818cf8", wkThresh: 4  },
    { label: "Wk 6",  sublabel: "D/C Brace",  color: "#a78bfa", wkThresh: 6  },
    { label: "Wk 10", sublabel: "Plyo",        color: GOLD,      wkThresh: 10 },
    { label: "Wk 12", sublabel: "Ph 2→3",     color: "#84cc16", wkThresh: 12 },
    { label: "Wk 14", sublabel: "Running",     color: "#a78bfa", wkThresh: 14 },
    { label: "Mo 4",  sublabel: "Sprinting",   color: "#fb923c", wkThresh: 17 },
    { label: "Mo 5",  sublabel: "Ph 3→4",     color: "#f43f5e", wkThresh: 20 },
    { label: "Mo 6",  sublabel: "Non-Contact", color: "#e879f9", wkThresh: 26 },
    { label: "Mo 7",  sublabel: "Contact",     color: "#f59e0b", wkThresh: 30 },
    { label: "Mo 9",  sublabel: "Full RTS",    color: LIME,      wkThresh: 39 },
  ];

  // track accent colors
  const trackColors = ["#38bdf8", "#a78bfa", LIME];
  const trackLabels = ["Rehab Phases", "Activity Progressions", "Return to Sport"];

  return (
    <div>
      {/* ── CSS animations ── */}
      <style>{`
        @keyframes rts-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(184,255,87,0); }
          50% { box-shadow: 0 0 40px 8px rgba(184,255,87,0.18); }
        }
        @keyframes rts-stamp {
          0% { opacity: 0; transform: scale(1.18) rotate(-2deg); }
          60% { opacity: 1; transform: scale(0.97) rotate(0.5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes rts-bar-fill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes rts-fade-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── RTS CLEARED MOMENT ── */}
      {isFullyCleared && (
        <div style={{
          marginBottom: 24,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${LIME}66`,
          background: `linear-gradient(135deg, #0d1a00, #0a0a0a, #0d1a00)`,
          animation: "rts-pulse 3s ease-in-out infinite",
          position: "relative",
        }}>
          {/* Top glow bar — animates in */}
          <div style={{
            height: 4,
            background: `linear-gradient(90deg, transparent, ${LIME}, ${LIME_DIM}, ${LIME}, transparent)`,
            animation: "rts-bar-fill 1.2s cubic-bezier(0.4,0,0.2,1) forwards",
          }} />

          <div style={{ padding: "32px 36px", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>

            {/* Stamp */}
            <div style={{
              flexShrink: 0,
              width: 88, height: 88, borderRadius: "50%",
              border: `3px solid ${LIME}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column",
              animation: "rts-stamp 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
              background: LIME + "0f",
            }}>
              <span style={{ fontSize: 30, lineHeight: 1 }}>✓</span>
              <span style={{ fontSize: 7, fontWeight: 900, color: LIME, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 3 }}>Cleared</span>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 220, animation: "rts-fade-up 0.7s 0.3s both" }}>
              <div style={{
                fontSize: 22, fontWeight: 900, color: LIME,
                letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 8,
                fontFamily: "'Arial Black', Impact, sans-serif",
              }}>
                Cleared for Return to Sport
              </div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7, maxWidth: 480 }}>
                Every criterion has been met.{wks > 0 ? ` ${wks} weeks of work.` : ""} This moment is earned — not given.
              </div>
              {wks > 0 && (
                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${LIME}44`, background: LIME + "0f", fontSize: 11, fontWeight: 800, color: LIME, letterSpacing: "0.08em" }}>
                    {wks} weeks post-op
                  </div>
                  <div style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${LIME}33`, background: LIME + "08", fontSize: 11, fontWeight: 700, color: LIME + "cc", letterSpacing: "0.08em" }}>
                    {mos.toFixed(1)} months
                  </div>
                </div>
              )}
            </div>

            {/* Right — stamp detail */}
            <div style={{ flexShrink: 0, textAlign: "right", animation: "rts-fade-up 0.7s 0.5s both" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>TRM Protocol</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#444", letterSpacing: "0.1em" }}>Full Clearance</div>
              {d.patient?.date && <div style={{ fontSize: 9, color: "#333", marginTop: 2 }}>{d.patient.date}</div>}
            </div>
          </div>

          {/* Bottom border glow */}
          <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${LIME}44, transparent)` }} />
        </div>
      )}

      {/* ── TIMELINE ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", background: "#161616", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: "#444" }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "#888", textTransform: "uppercase" }}>Recovery Timeline — TRM Protocol</span>
          {wks > 0 && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: LIME }}>{wks} wks ({mos.toFixed(1)} mo) post-op</span>}
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 0 }}>
            <div style={{ position: "absolute", top: 18, left: 24, right: 24, height: 2, background: "#222", zIndex: 0 }} />
            {timelineItems.map((t, i) => {
              const passed  = wks > 0 && wks >= t.wkThresh;
              const current = passed && (i === timelineItems.length - 1 || wks < timelineItems[i + 1].wkThresh);
              return (
                <div key={t.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: passed ? t.color : "#1a1a1a", border: `2px solid ${passed ? t.color : "#333"}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: current ? `0 0 12px ${t.color}88` : passed ? `0 0 6px ${t.color}44` : "none", transition: "all 0.3s" }}>
                    {passed
                      ? <span style={{ fontSize: 13, color: "#000", fontWeight: 900 }}>✓</span>
                      : <span style={{ fontSize: 8, fontWeight: 800, color: "#555" }}>{t.wkThresh < 17 ? `W${t.wkThresh}` : `M${Math.round(t.wkThresh / 4.33)}`}</span>}
                  </div>
                  {i < timelineItems.length - 1 && (
                    <div style={{ position: "absolute", top: 15, left: "50%", width: "100%", height: 4, background: passed && wks >= timelineItems[i + 1].wkThresh ? `linear-gradient(90deg,${t.color},${timelineItems[i + 1].color})` : passed ? `linear-gradient(90deg,${t.color},#333)` : "#1f1f1f", zIndex: -1 }} />
                  )}
                  <div style={{ marginTop: 5, textAlign: "center" }}>
                    <div style={{ fontSize: 8, fontWeight: 800, color: passed ? t.color : "#444", letterSpacing: "0.04em" }}>{t.label}</div>
                    <div style={{ fontSize: 7, color: passed ? t.color + "99" : "#333", marginTop: 1, whiteSpace: "nowrap" }}>{t.sublabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[["● Reached", LIME], ["● Not yet", "#333"]].map(([l, c]) => (
              <span key={l} style={{ fontSize: 10, fontWeight: 700, color: c }}>{l}</span>
            ))}
            {wks === 0 && <span style={{ fontSize: 10, color: MUTED }}>Enter weeks post-op on the Testing tab to activate</span>}
          </div>
        </div>
      </div>

      {/* ── THREE SWIMLANE TRACKS ── */}
      {tracks.map((trk, ti) => {
        const tColor = trackColors[ti];
        const isActiveTrack = trackIdx === ti;
        const tp = trackProgress(trk, ti);

        // Track-level segmented bar values (%)
        const tConfPct  = tp.total > 0 ? (tp.confirmed / tp.total) * 100 : 0;
        const tFailPct  = tp.total > 0 ? (tp.failed    / tp.total) * 100 : 0;
        const tPendPct  = tp.total > 0 ? (tp.pending   / tp.total) * 100 : 0;
        const tAllDone  = tp.total > 0 && tp.failed === 0 && tp.pending === 0;
        const tAnyFail  = tp.failed > 0;

        return (
          <div key={trk.id} style={{ marginBottom: 16 }}>

            {/* ── Track header bar ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 16px 0",
              background: isActiveTrack ? tColor + "14" : "#141414",
              border: `1px solid ${isActiveTrack ? tColor + "55" : BORDER}`,
              borderBottom: "none",
              borderRadius: "10px 10px 0 0",
            }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: tColor, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", color: tColor, textTransform: "uppercase" }}>{trk.label}</span>
                  <span style={{ fontSize: 10, color: MUTED }}>{trk.sublabel}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: tAllDone ? LIME : tAnyFail ? RED_BAD : MUTED }}>
                    {tp.confirmed}/{tp.total} confirmed
                    {tp.failed > 0 ? ` · ${tp.failed} failing` : ""}
                    {tp.pending > 0 && !tAllDone ? ` · ${tp.pending} pending` : ""}
                  </span>
                </div>
                {/* Track-level segmented bar */}
                <div style={{ height: 5, borderRadius: 3, background: "#1e1e1e", overflow: "hidden", display: "flex", marginBottom: 0 }}>
                  {tConfPct > 0 && <div style={{ width: `${tConfPct}%`, background: tAllDone ? LIME : tColor, transition: "width 0.4s" }} />}
                  {tFailPct > 0 && <div style={{ width: `${tFailPct}%`, background: RED_BAD, transition: "width 0.4s" }} />}
                  {tPendPct > 0 && <div style={{ width: `${tPendPct}%`, background: "#2e2e2e", transition: "width 0.4s" }} />}
                </div>
              </div>
            </div>

            {/* Tab strip + criteria in one card */}
            <div style={{
              background: CARD,
              border: `1px solid ${isActiveTrack && isFullyCleared && ti === 2 ? LIME + "88" : isActiveTrack ? tColor + "44" : BORDER}`,
              borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden",
              boxShadow: isFullyCleared && ti === 2 ? `0 0 32px ${LIME}18` : "none",
              transition: "border-color 0.6s, box-shadow 0.6s",
            }}>

              {/* Section tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, background: "#161616", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
                {trk.sections.map((s, si) => {
                  const isActive = isActiveTrack && sectionIdx === si;
                  const sp = sectionProgress(trk, ti, si);
                  const confPct = sp.total > 0 ? (sp.confirmed / sp.total) * 100 : 0;
                  const failPct = sp.total > 0 ? (sp.failed    / sp.total) * 100 : 0;
                  const pendPct = sp.total > 0 ? (sp.pending   / sp.total) * 100 : 0;
                  const allDone = sp.total > 0 && sp.failed === 0 && sp.pending === 0;
                  const anyFail = sp.failed > 0;

                  return (
                    <button key={si} onClick={() => setActive([ti, si])} style={{
                      flexShrink: 0, padding: "10px 14px 0", background: "transparent", border: "none",
                      borderBottom: `3px solid ${isActive ? s.color : "transparent"}`,
                      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 3, minWidth: 82, transition: "border-color 0.15s", paddingBottom: 10,
                    }}>
                      {/* time + label */}
                      <span style={{ fontSize: 10, fontWeight: 900, color: isActive ? s.color : anyFail ? RED_BAD : allDone ? LIME : "#666", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        {s.time}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? WHITE : "#555", whiteSpace: "nowrap", marginBottom: 5 }}>
                        {s.label}
                      </span>

                      {/* Segmented micro-bar */}
                      <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#222", overflow: "hidden", display: "flex" }}>
                        {confPct > 0 && (
                          <div style={{ width: `${confPct}%`, background: allDone ? LIME : s.color, borderRadius: "2px 0 0 2px", transition: "width 0.3s" }} />
                        )}
                        {failPct > 0 && (
                          <div style={{ width: `${failPct}%`, background: RED_BAD, transition: "width 0.3s" }} />
                        )}
                        {pendPct > 0 && (
                          <div style={{ width: `${pendPct}%`, background: "#2e2e2e", transition: "width 0.3s" }} />
                        )}
                      </div>

                      {/* counts under bar */}
                      <span style={{ fontSize: 8, color: anyFail ? RED_BAD : allDone ? LIME : "#444", marginTop: 2, whiteSpace: "nowrap" }}>
                        {allDone ? "✓ complete" : anyFail ? `${sp.failed} failing` : sp.confirmed > 0 ? `${sp.confirmed}/${sp.total}` : "not started"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Criteria panel — only shown for active track */}
              {isActiveTrack && (() => {
                const sp = sectionProgress(track, trackIdx, sectionIdx);
                const allDone = sp.total > 0 && sp.failed === 0 && sp.pending === 0;
                const anyFail = sp.failed > 0;
                const confPct = sp.total > 0 ? (sp.confirmed / sp.total) * 100 : 0;
                const failPct = sp.total > 0 ? (sp.failed    / sp.total) * 100 : 0;
                const pendPct = sp.total > 0 ? (sp.pending   / sp.total) * 100 : 0;

                return (
                  <div>
                    {/* Section header with inline summary bar */}
                    <div style={{
                      padding: "14px 20px",
                      background: allDone && sec.label === "Full Clearance"
                        ? `linear-gradient(90deg,${LIME}22,${LIME}08,transparent)`
                        : `linear-gradient(90deg,${sec.color}18,transparent)`,
                      borderBottom: `1px solid ${allDone && sec.label === "Full Clearance" ? LIME + "44" : sec.color + "33"}`,
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "background 0.6s, border-color 0.6s",
                    }}>
                      <div style={{ width: 4, borderRadius: 2, alignSelf: "stretch", background: allDone && sec.label === "Full Clearance" ? LIME : sec.color, flexShrink: 0, transition: "background 0.6s" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, color: allDone && sec.label === "Full Clearance" ? BLACK : BLACK, background: allDone && sec.label === "Full Clearance" ? LIME : sec.color, padding: "2px 8px", borderRadius: 4, transition: "background 0.6s" }}>{sec.time}</span>
                          <span style={{ fontSize: 15, fontWeight: 900, color: allDone && sec.label === "Full Clearance" ? LIME : sec.color, transition: "color 0.6s" }}>{sec.label}</span>
                          {/* status badge */}
                          {allDone && sec.label === "Full Clearance" && (
                            <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 900, color: BLACK, background: LIME, padding: "2px 10px", borderRadius: 10, letterSpacing: "0.1em", textTransform: "uppercase", animation: "rts-stamp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
                              ✓ CLEARED
                            </span>
                          )}
                          {allDone && sec.label !== "Full Clearance" && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, color: LIME, background: LIME + "22", padding: "2px 8px", borderRadius: 10 }}>✓ All criteria met</span>}
                          {anyFail && !allDone && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, color: RED_BAD, background: RED_BAD + "22", padding: "2px 8px", borderRadius: 10 }}>{sp.failed} criterion failing</span>}
                        </div>
                        {/* Segmented bar in header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#1e1e1e", overflow: "hidden", display: "flex" }}>
                            {confPct > 0 && <div style={{ width: `${confPct}%`, background: allDone ? LIME : sec.color, transition: "width 0.3s, background 0.6s" }} />}
                            {failPct > 0 && <div style={{ width: `${failPct}%`, background: RED_BAD, transition: "width 0.3s" }} />}
                            {pendPct > 0 && <div style={{ width: `${pendPct}%`, background: "#2a2a2a", transition: "width 0.3s" }} />}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: anyFail ? RED_BAD : allDone ? LIME : MUTED, whiteSpace: "nowrap" }}>
                            {sp.confirmed}/{sp.total} confirmed · {sp.pending} pending · {sp.failed} failing
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, marginTop: 6 }}>{sec.description}</div>
                      </div>
                      {/* prev / next */}
                      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                        <button onClick={() => setActive([ti, Math.max(0, sectionIdx - 1)])} disabled={sectionIdx === 0} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: sectionIdx === 0 ? "#111" : "#1e1e1e", color: sectionIdx === 0 ? "#333" : WHITE, cursor: sectionIdx === 0 ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                        <button onClick={() => setActive([ti, Math.min(trk.sections.length - 1, sectionIdx + 1)])} disabled={sectionIdx === trk.sections.length - 1} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: sectionIdx === trk.sections.length - 1 ? "#111" : "#1e1e1e", color: sectionIdx === trk.sections.length - 1 ? "#333" : WHITE, cursor: sectionIdx === trk.sections.length - 1 ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                      </div>
                    </div>

                    {/* Groups & criteria */}
                    <div style={{ padding: 20 }}>
                      {sec.groups.map((grp, gi) => {
                        const gs = groupStatus(grp, gi);
                        return (
                          <div key={gi} style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", border: `1px solid ${gs === true ? sec.color + "55" : gs === false ? RED_BAD + "44" : BORDER}`, background: gs === true ? sec.color + "06" : "#111" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: `1px solid ${BORDER}22`, background: "#181818" }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: gs === true ? sec.color : "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>{grp.title}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {grp.logic === "or" && <span style={{ fontSize: 9, fontWeight: 800, color: BLUE, background: BLUE + "22", padding: "2px 6px", borderRadius: 4 }}>OR</span>}
                                <span style={{ fontSize: 14, color: gs === null ? MUTED : gs ? LIME : RED_BAD }}>{gs === null ? "○" : gs ? "✓" : "✗"}</span>
                              </div>
                            </div>
                            {grp.criteria.map((c, ci) => {
                              const attestKey = `${attestPrefix}:${gi}:${ci}`;
                              const isChecked = attested[attestKey] === true;
                              const effectiveMet = c.clinical ? (isChecked ? true : null) : c.met;
                              return (
                                <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", borderBottom: ci < grp.criteria.length - 1 ? `1px solid ${BORDER}22` : "none", background: isChecked ? sec.color + "08" : "transparent" }}>
                                  {c.clinical ? (
                                    <button onClick={() => toggleAttest(attestKey)} title={isChecked ? "Click to unmark" : "Click to confirm"} style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: `2px solid ${isChecked ? sec.color : "#444"}`, background: isChecked ? sec.color : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, transition: "all 0.15s" }}>
                                      {isChecked && <span style={{ fontSize: 12, color: BLACK, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 16, color: c.met === null ? MUTED : c.met ? LIME : RED_BAD, flexShrink: 0, lineHeight: 1.4 }}>{c.met === null ? "○" : c.met ? "✓" : "✗"}</span>
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: c.isOr ? BLUE : effectiveMet === null ? "#ccc" : effectiveMet ? sec.color : RED_BAD, lineHeight: 1.4 }}>{c.text}</div>
                                    <div style={{ fontSize: 11, color: MUTED, marginTop: 3, lineHeight: 1.5 }}>{c.detail}</div>
                                    {c.clinical && !isChecked && <div style={{ fontSize: 10, color: "#555", marginTop: 3, fontStyle: "italic" }}>Clinician assessment required — check to confirm</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Legend */}
                      <div style={{ padding: "9px 14px", background: "#0f0f0f", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 11, color: MUTED, lineHeight: 1.9, marginTop: 4 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                          <div style={{ width: 20, height: 6, borderRadius: 2, background: sec.color }} />
                          <span><span style={{ color: LIME, fontWeight: 700 }}>Confirmed</span> — auto from Testing tab or clinician-checked</span>
                          <div style={{ width: 20, height: 6, borderRadius: 2, background: RED_BAD, marginLeft: 8 }} />
                          <span><span style={{ color: RED_BAD, fontWeight: 700 }}>Failing</span> — data below threshold</span>
                          <div style={{ width: 20, height: 6, borderRadius: 2, background: "#2e2e2e", marginLeft: 8 }} />
                          <span><span style={{ color: MUTED, fontWeight: 700 }}>Pending</span> — awaiting data or clinical assessment</span>
                        </div>
                        <span style={{ color: "#888" }}>□ Empty checkbox</span> — clinical item, click to confirm{"  ·  "}
                        <span style={{ color: MUTED }}>○ circle</span> — no testing data entered yet
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Collapsed state */}
              {!isActiveTrack && (
                <div style={{ padding: "10px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {trk.sections.map((s, si) => {
                    const sp = sectionProgress(trk, ti, si);
                    const allDone = sp.total > 0 && sp.failed === 0 && sp.pending === 0;
                    const anyFail = sp.failed > 0;
                    return (
                      <button key={si} onClick={() => setActive([ti, si])} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "#1a1a1a", border: `1px solid ${anyFail ? RED_BAD + "55" : allDone ? s.color + "55" : BORDER}`, cursor: "pointer" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: anyFail ? RED_BAD : allDone ? LIME : "#3a3a3a" }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: anyFail ? RED_BAD : allDone ? LIME : "#666" }}>{s.time}</span>
                        <span style={{ fontSize: 10, color: anyFail ? RED_BAD + "aa" : allDone ? LIME + "aa" : "#444" }}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ─── TAB 4: PHYSICIAN LETTER ──────────────────────────────────────────────────
function Tab4({ currentData: d, setData }) {
  const [ptName,       setPtName]     = useState("");
  const [therapistName,setTherapist]  = useState("");
  const [clinic,       setClinic]     = useState("Train Recover Move");
  const [letter,       setLetter]     = useState("");
  const [copied,       setCopied]     = useState(false);

  // impression is stored in data so it persists across PDF save/load and autosave
  const impression = d.impression || "";
  const setImpression = (v) => setData(p => ({ ...p, impression: v }));

  const generate = () => setLetter(buildLetter(d, ptName, therapistName, clinic, impression));
  const copy = () => {
    navigator.clipboard.writeText(letter)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
      .catch(() => {
        try {
          const ta = document.createElement("textarea");
          ta.value = letter;
          ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
          document.body.appendChild(ta);
          ta.focus(); ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setCopied(true); setTimeout(() => setCopied(false), 2500);
        } catch (e2) {}
      });
  };

  return (
    <div>
      <Card title="Letter Settings" accent>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          All testing data is pulled from Tab 1 automatically. Only sections with entered data will appear. Fill in your clinical impression below — that is the only section requiring manual input.
        </div>
        <R3>
          <Field label="Patient Name"                type="text" value={ptName}         onChange={setPtName}    placeholder="Full name"           step={null} />
          <Field label="Therapist Name + Credentials" type="text" value={therapistName}  onChange={setTherapist} placeholder="Jane Smith, DPT, SCS" step={null} />
          <Field label="Clinic / Organization"       type="text" value={clinic}         onChange={setClinic}    placeholder="Train Recover Move"   step={null} />
        </R3>
        <div style={{ fontSize: 11, color: MUTED, marginTop: -4 }}>Surgeon name is carried automatically from the Testing tab.</div>
      </Card>

      <Card title="Clinical Impression">
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>
          Write 2–4 sentences summarizing your clinical interpretation: overall trajectory, specific deficits that remain, and your recommendation regarding return-to-sport readiness. This is the only manual section.
        </div>
        <textarea
          style={{ ...inp, height: 130, resize: "vertical", lineHeight: 1.7, fontSize: 13 }}
          placeholder="e.g. Patient continues to demonstrate meaningful progress in quadriceps strength symmetry, with KE LSI improving from 67% to 81% over the past 6 weeks. However, strength values remain below the 90% LSI threshold required for return-to-sport clearance, and functional hop testing reflects persistent asymmetry on the involved limb. We plan to advance through Phase 3 plyometric training and repeat formal testing in 6 weeks prior to sport-specific clearance consideration."
          value={impression}
          onChange={e => setImpression(e.target.value)}
        />
      </Card>

      <button onClick={generate} style={{ width: "100%", padding: 16, borderRadius: 12, fontSize: 13, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", background: `linear-gradient(135deg,${LIME},${LIME_DIM})`, color: BLACK, border: "none", boxShadow: `0 8px 32px ${LIME}44`, marginBottom: 20 }}>
        ⬇ Build Physician Letter
      </button>

      {letter && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${LIME}44`, marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", background: LIME + "14", borderBottom: `1px solid ${LIME}33` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: LIME, letterSpacing: "0.15em", textTransform: "uppercase" }}>Physician Communication Letter</span>
            <button onClick={copy} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer", background: copied ? "#15803d" : LIME, color: BLACK, border: "none" }}>
              {copied ? "✓ Copied!" : "Copy to Clipboard"}
            </button>
          </div>
          <pre style={{ padding: 24, background: "#0a0a0a", color: "#d4faa6", fontSize: 13, fontFamily: "inherit", lineHeight: 1.9, whiteSpace: "pre-wrap", margin: 0, maxHeight: 600, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>{letter}</pre>
        </div>
      )}
    </div>
  );
}




function sanitizePdf(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/≠/g, "!=")
    .replace(/±/g, "+/-")
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/°/g, " deg")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "?"); // catch-all for any other non-Latin-1 chars
}

async function saveSessionPDF(data, mode = "download") {
  const { PDFDocument, rgb, StandardFonts } = await getPdfLib();
  const doc = await PDFDocument.create();

  // Embed full session data in PDF metadata (existing dual-field strategy)
  const sessionJson = JSON.stringify(data);
  const utf8Bytes = new TextEncoder().encode(sessionJson);
  let binary = "";
  utf8Bytes.forEach(b => { binary += String.fromCharCode(b); });
  const encoded = btoa(binary);
  doc.setSubject("TRM_SESSION_V1:" + encoded);
  doc.setKeywords(["TRM_SESSION_V1:" + encoded]); // Backup — some PDF viewers strip Subject; Keywords survives
  doc.setTitle("TRM ACL Testing Session");
  doc.setCreator("TRM ACL Rehabilitation Testing Tool");

  let page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── Color Palette ──────────────────────────────────────────────────────
  const BLACK_R  = rgb(0.05, 0.05, 0.05);
  const WHITE_R  = rgb(1, 1, 1);
  const GRAY     = rgb(0.45, 0.45, 0.45);
  const LGRAY    = rgb(0.82, 0.82, 0.82);
  const BGRAY    = rgb(0.96, 0.96, 0.96);
  const DARK_R   = rgb(0.07, 0.07, 0.07);
  const LIME_R   = rgb(0.42, 0.82, 0.12);
  const LIME_BG  = rgb(0.90, 0.98, 0.82);
  const LIME_TXT = rgb(0.18, 0.48, 0.04);
  const GOLD_R   = rgb(0.90, 0.65, 0.08);
  const GOLD_BG  = rgb(1.0,  0.95, 0.80);
  const GOLD_TXT = rgb(0.65, 0.42, 0.02);
  const RED_R    = rgb(0.88, 0.22, 0.22);
  const RED_BG   = rgb(1.0,  0.90, 0.90);
  const RED_TXT  = rgb(0.65, 0.10, 0.10);
  const BORDER_R = rgb(0.88, 0.88, 0.88);

  const L = 48, R = width - 48;
  const CW = R - L;

  // ── Pre-compute all derived metrics ──────────────────────────────────
  const inv  = data.patient?.involvedSide || "Left";
  const invR = inv === "Right";
  const uninv = invR ? "Left" : "Right";

  const torRnm_p  = calcTorqueNm(data.forceR, data.tib);
  const torLnm_p  = calcTorqueNm(data.forceL, data.tib);
  const normR_p   = calcNorm(torRnm_p, data.bw);
  const normL_p   = calcNorm(torLnm_p, data.bw);
  const torLSI_p  = invR ? calcLSI(normR_p, normL_p) : calcLSI(normL_p, normR_p);
  const keLSI_p   = invR ? calcLSI(data.keR, data.keL) : calcLSI(data.keL, data.keR);

  const hsTorR_p  = calcTorqueNm(data.hsR, data.tib);
  const hsTorL_p  = calcTorqueNm(data.hsL, data.tib);
  const hsNormR_p = calcNorm(hsTorR_p, data.bw);
  const hsNormL_p = calcNorm(hsTorL_p, data.bw);
  const hsLSI_p   = invR ? calcLSI(hsNormR_p, hsNormL_p) : calcLSI(hsNormL_p, hsNormR_p);
  const hqRR_p    = (hasVal(hsNormR_p) && hasVal(normR_p) && toNum(normR_p) > 0) ? ((toNum(hsNormR_p)/toNum(normR_p))*100).toFixed(1) : null;
  const hqRL_p    = (hasVal(hsNormL_p) && hasVal(normL_p) && toNum(normL_p) > 0) ? ((toNum(hsNormL_p)/toNum(normL_p))*100).toFixed(1) : null;
  const hqInv_p   = invR ? hqRR_p : hqRL_p;

  const yb = data.yBalance || {};
  const ybCompR_p   = calcYBalance(yb.rAnt, yb.rPM, yb.rPL, data.limbLen);
  const ybCompL_p   = calcYBalance(yb.lAnt, yb.lPM, yb.lPL, data.limbLen);
  const ybCompInv_p = invR ? ybCompR_p : ybCompL_p;
  const antDiff_p   = hasVal(yb.rAnt) && hasVal(yb.lAnt) ? Math.abs(toNum(yb.rAnt) - toNum(yb.lAnt)).toFixed(1) : null;

  const hopSI_p  = hopAvgIn(data.hops.singleI),  hopSU_p  = hopAvgIn(data.hops.singleU);
  const hopTrI_p = hopAvgIn(data.hops.tripleI),  hopTrU_p = hopAvgIn(data.hops.tripleU);
  const hopCrI_p = hopAvgIn(data.hops.crossI),   hopCrU_p = hopAvgIn(data.hops.crossU);
  const hopTmI_p = hopAvgTimed(data.hops.timedI), hopTmU_p = hopAvgTimed(data.hops.timedU);
  const lsiSingle = calcLSI(hopSI_p,  hopSU_p);
  const lsiTriple = calcLSI(hopTrI_p, hopTrU_p);
  const lsiCross  = calcLSI(hopCrI_p, hopCrU_p);
  const lsiTimed  = calcTimedLSI(hopTmI_p, hopTmU_p);

  // Status helpers — returns color-coded status object or null
  const lsiStatus = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return null;
    if (n >= 90) return { color: LIME_R, bg: LIME_BG, txt: LIME_TXT, label: ">= 90%  MEETS CRITERIA" };
    if (n >= 80) return { color: GOLD_R, bg: GOLD_BG, txt: GOLD_TXT, label: "80-89%  BORDERLINE" };
    return            { color: RED_R,  bg: RED_BG,  txt: RED_TXT,  label: "<  80%  BELOW CRITERIA" };
  };
  const ybalStatus = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return null;
    return n >= 90
      ? { color: LIME_R, bg: LIME_BG, txt: LIME_TXT, label: ">= 90%  MEETS CRITERIA" }
      : { color: RED_R,  bg: RED_BG,  txt: RED_TXT,  label: "<  90%  BELOW CRITERIA" };
  };
  const hqStatus = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return null;
    if (n >= 60) return { color: LIME_R, bg: LIME_BG, txt: LIME_TXT, label: ">= 60%  MEETS CRITERIA" };
    if (n >= 50) return { color: GOLD_R, bg: GOLD_BG, txt: GOLD_TXT, label: "50-59%  BORDERLINE" };
    return            { color: RED_R,  bg: RED_BG,  txt: RED_TXT,  label: "<  50%  BELOW CRITERIA" };
  };

  // ── HEADER ─────────────────────────────────────────────────────────────
  // Dark bar
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: DARK_R });
  // Lime accent stripe at bottom of header
  page.drawRectangle({ x: 0, y: height - 72, width, height: 2, color: LIME_R });
  // TRM logotype
  page.drawText(sanitizePdf("TRM"), { x: L, y: height - 48, size: 34, font: fontBold, color: WHITE_R });
  // Vertical rule
  page.drawLine({ start: {x: L + 82, y: height - 16}, end: {x: L + 82, y: height - 62}, thickness: 0.8, color: rgb(0.28, 0.28, 0.28) });
  page.drawText(sanitizePdf("ACL Testing & Outcome Measures"), { x: L + 92, y: height - 34, size: 10, font, color: rgb(0.68, 0.68, 0.68) });
  page.drawText(sanitizePdf("SESSION REPORT"), { x: L + 92, y: height - 52, size: 8.5, font: fontBold, color: LIME_R });

  // Date + label top-right
  const dateStr = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  page.drawText(sanitizePdf(dateStr), { x: R - font.widthOfTextAtSize(dateStr, 8), y: height - 34, size: 8, font, color: rgb(0.50, 0.50, 0.50) });
  const refTxt = "Physician Reference";
  page.drawText(sanitizePdf(refTxt), { x: R - fontBold.widthOfTextAtSize(refTxt, 7.5), y: height - 50, size: 7.5, font: fontBold, color: rgb(0.38, 0.38, 0.38) });

  // ── PATIENT STRIP ─────────────────────────────────────────────────────
  const p = data.patient;
  page.drawRectangle({ x: 0, y: height - 108, width, height: 36, color: BGRAY });
  page.drawRectangle({ x: 0, y: height - 109, width, height: 1, color: BORDER_R });

  const ptFields = [
    ["Date",          p.date          || "—"],
    ["Weeks Post-Op", p.weeksPostOp   ? `${p.weeksPostOp} wks` : "—"],
    ["Side",          p.involvedSide  || "—"],
    ["Graft",         p.graftType     || "—"],
    ["Surgeon",       p.surgeon       ? `Dr. ${p.surgeon}` : "—"],
    ["Sex",           p.sex           || "—"],
  ];
  const ptColW = CW / ptFields.length;
  ptFields.forEach(([label, val], i) => {
    const px = L + i * ptColW;
    page.drawText(sanitizePdf(label.toUpperCase()), { x: px, y: height - 84, size: 5.5, font: fontBold, color: GRAY });
    const v = val.length > 16 ? val.slice(0, 15) + "." : val;
    page.drawText(sanitizePdf(v), { x: px, y: height - 97, size: 8.5, font: fontBold, color: BLACK_R });
  });

  let y = height - 122;
  let pageCount = 1;

  // Called automatically when content is about to overflow the page bottom.
  // Draws a footer on the current page, starts a new page, and draws a continuation header.
  const addNewPage = () => {
    // Footer on the page we're leaving
    page.drawRectangle({ x: 0, y: 0, width, height: 26, color: DARK_R });
    page.drawRectangle({ x: 0, y: 26, width, height: 1.5, color: LIME_R });
    page.drawText(sanitizePdf("TRM  |  ACL Rehabilitation Testing Tool  —  Session data embedded. Upload to TRM app to restore."), {
      x: L, y: 8, size: 6.5, font, color: rgb(0.44, 0.44, 0.44)
    });
    page.drawText(sanitizePdf(`Page ${pageCount}`), {
      x: R - font.widthOfTextAtSize(`Page ${pageCount}`, 6.5), y: 8, size: 6.5, font, color: rgb(0.38, 0.38, 0.38)
    });
    // New page
    pageCount++;
    page = doc.addPage([612, 792]);
    // Continuation header — compact dark bar
    page.drawRectangle({ x: 0, y: height - 32, width, height: 32, color: DARK_R });
    page.drawRectangle({ x: 0, y: height - 34, width, height: 2, color: LIME_R });
    page.drawText(sanitizePdf("TRM  |  ACL Testing & Outcome Measures  —  continued"), {
      x: L, y: height - 22, size: 8.5, font: fontBold, color: rgb(0.72, 0.72, 0.72)
    });
    const ptCont = `${data.patient?.date || ""}${data.patient?.weeksPostOp ? "  \u2022  Wk " + data.patient.weeksPostOp : ""}${data.patient?.involvedSide ? "  \u2022  " + data.patient.involvedSide + " side" : ""}`;
    if (ptCont.trim()) {
      page.drawText(sanitizePdf(ptCont.trim()), {
        x: R - font.widthOfTextAtSize(ptCont.trim(), 7), y: height - 22, size: 7, font, color: rgb(0.50, 0.50, 0.50)
      });
    }
    y = height - 52;
  };

  // ── CLINICAL SNAPSHOT ─────────────────────────────────────────────────
  // Section header — dark bar matching app card style
  page.drawRectangle({ x: L - 4, y: y - 1, width: CW + 8, height: 15, color: rgb(0.11, 0.11, 0.11) });
  page.drawRectangle({ x: L - 4, y: y - 1, width: 3,      height: 15, color: LIME_R });
  page.drawText(sanitizePdf("CLINICAL SNAPSHOT  —  KEY OUTCOME METRICS"), { x: L + 6, y: y + 3, size: 7.5, font: fontBold, color: LIME_R });
  y -= 20;

  // Build up to 4 snapshot items (most clinically important)
  const snapItems = [];
  if (keLSI_p !== null)        snapItems.push({ label: "KE LSI",        value: keLSI_p,       unit: "%", st: lsiStatus(keLSI_p),       bench: ">= 90% for RTS", note: `${inv} / ${uninv}` });
  else if (torLSI_p !== null)  snapItems.push({ label: "Quad Index",    value: torLSI_p,      unit: "%", st: lsiStatus(torLSI_p),      bench: ">= 90% for RTS", note: "Isometric torque LSI" });
  if (hsLSI_p !== null)        snapItems.push({ label: "HS LSI",        value: hsLSI_p,       unit: "%", st: lsiStatus(hsLSI_p),       bench: ">= 90% for RTS", note: `${inv} / ${uninv}` });
  else if (hqInv_p !== null)   snapItems.push({ label: "H:Q Ratio",     value: hqInv_p,       unit: "%", st: hqStatus(hqInv_p),        bench: ">= 60% benchmark", note: `${inv} (involved)` });
  if (ybCompInv_p !== null)    snapItems.push({ label: "Y-Balance",     value: ybCompInv_p,   unit: "%", st: ybalStatus(ybCompInv_p),  bench: ">= 90% of LL", note: `${inv} composite` });
  const hopVals = [lsiSingle, lsiTriple, lsiCross, lsiTimed].filter(v => v !== null).map(parseFloat);
  if (hopVals.length > 0) {
    const worst = Math.min(...hopVals).toFixed(1);
    snapItems.push({ label: "Hop LSI (Min)", value: worst, unit: "%", st: lsiStatus(worst), bench: ">= 90% for RTS", note: "Worst of 4 tests" });
  }

  const showSnap = snapItems.slice(0, 4);
  if (showSnap.length > 0) {
    const boxW = Math.floor(CW / 4) - 3;
    const boxH = 50;
    showSnap.forEach((item, i) => {
      const bx = L + i * (boxW + 4);
      const dotColor = item.st ? item.st.color : LGRAY;
      const bgColor  = item.st ? item.st.bg    : BGRAY;
      const txtColor = item.st ? item.st.txt   : GRAY;

      // Box with colored top & left border accents
      page.drawRectangle({ x: bx, y: y - boxH, width: boxW, height: boxH, color: bgColor });
      page.drawRectangle({ x: bx,           y: y,        width: boxW, height: 2, color: dotColor }); // top bar
      page.drawRectangle({ x: bx,           y: y - boxH, width: 3,    height: boxH, color: dotColor }); // left bar

      // Label
      page.drawText(sanitizePdf(item.label.toUpperCase()), { x: bx + 8, y: y - 12, size: 6.5, font: fontBold, color: GRAY });
      // Value (large)
      page.drawText(sanitizePdf(`${item.value}${item.unit}`), { x: bx + 8, y: y - 29, size: 18, font: fontBold, color: dotColor });
      // Status label
      if (item.st) page.drawText(sanitizePdf(item.st.label), { x: bx + 8, y: y - 40, size: 6, font: fontBold, color: txtColor });
      // Benchmark note
      page.drawText(sanitizePdf(item.note), { x: bx + 8, y: y - boxH + 5, size: 5.5, font, color: GRAY });
    });
    y -= boxH + 10;
  } else {
    page.drawText(sanitizePdf("No computed metrics — enter testing data to generate the clinical snapshot."), { x: L, y, size: 8, font, color: GRAY });
    y -= 16;
  }

  // Extra snap items (5th+) as a compact text line if they exist
  const extraSnap = snapItems.slice(4);
  if (extraSnap.length > 0 && y > 60) {
    let ex = L;
    extraSnap.forEach(item => {
      if (ex > R - 60) return;
      const dotColor = item.st ? item.st.color : GRAY;
      const str = `${item.label}: ${item.value}${item.unit}`;
      page.drawText(sanitizePdf(str), { x: ex, y, size: 8, font: fontBold, color: dotColor });
      ex += fontBold.widthOfTextAtSize(str, 8) + 6;
      if (item.st) {
        page.drawText(sanitizePdf(`(${item.st.label.split("  ")[1]})`), { x: ex, y, size: 7, font, color: GRAY });
        ex += font.widthOfTextAtSize(`(${item.st.label.split("  ")[1]})`, 7) + 16;
      }
    });
    y -= 14;
  }
  y -= 4;

  // ── SECTION & ROW HELPERS ─────────────────────────────────────────────
  const col2 = L + Math.floor(CW / 2) + 4;

  const section = (title) => {
    if (y < 140) addNewPage(); // need room for header + at least one row
    y -= 4;
    page.drawRectangle({ x: L - 4, y: y - 3, width: CW + 8, height: 14, color: rgb(0.11, 0.11, 0.11) });
    page.drawRectangle({ x: L - 4, y: y - 3, width: 3,      height: 14, color: LIME_R });
    page.drawText(sanitizePdf(title.toUpperCase()), { x: L + 5, y: y, size: 7, font: fontBold, color: rgb(0.72, 0.72, 0.72) });
    y -= 17;
  };

  const row = (label, value, x2 = null, label2 = null, value2 = null) => {
    if (y < 120) addNewPage();
    page.drawText(sanitizePdf(label), { x: L, y, size: 8.5, font: fontBold, color: BLACK_R });
    page.drawText(sanitizePdf(String(value || "—")), { x: L + 155, y, size: 8.5, font, color: value ? BLACK_R : LGRAY });
    if (x2 && label2) {
      page.drawText(sanitizePdf(label2), { x: x2, y, size: 8.5, font: fontBold, color: BLACK_R });
      page.drawText(sanitizePdf(String(value2 || "—")), { x: x2 + 155, y, size: 8.5, font, color: value2 ? BLACK_R : LGRAY });
    }
    y -= 12;
  };

  // Row with color-coded value + status chip inline
  const lsiRow = (label, lsiVal, statusFn = lsiStatus, unit = "%") => {
    if (y < 120) addNewPage();
    const st = statusFn ? statusFn(lsiVal) : null;
    page.drawText(sanitizePdf(label), { x: L, y, size: 8.5, font: fontBold, color: BLACK_R });
    if (lsiVal !== null && lsiVal !== undefined) {
      const valStr = `${lsiVal}${unit}`;
      page.drawText(sanitizePdf(valStr), { x: L + 155, y, size: 8.5, font: fontBold, color: st ? st.color : GRAY });
      if (st) {
        const chipX = L + 155 + fontBold.widthOfTextAtSize(valStr, 8.5) + 8;
        const chipLabel = st.label;
        const chipW = fontBold.widthOfTextAtSize(chipLabel, 5.8) + 8;
        page.drawRectangle({ x: chipX, y: y - 2, width: chipW, height: 11, color: st.bg });
        page.drawRectangle({ x: chipX, y: y - 2, width: chipW, height: 1.5, color: st.color });
        page.drawText(sanitizePdf(chipLabel), { x: chipX + 4, y: y + 1, size: 5.8, font: fontBold, color: st.txt });
      }
    } else {
      page.drawText(sanitizePdf("—"), { x: L + 155, y, size: 8.5, font, color: LGRAY });
    }
    y -= 12;
  };

  const divider = () => {
    if (y < 120) { addNewPage(); return; }
    page.drawLine({ start: {x: L, y}, end: {x: R, y}, thickness: 0.4, color: BORDER_R });
    y -= 8;
  };

  // ── SESSION INFO ──────────────────────────────────────────────────────
  section("Session Information");
  row("Date:", p.date, col2, "Surgeon:", p.surgeon ? `Dr. ${p.surgeon}` : null);
  row("Weeks Post-Op:", p.weeksPostOp ? `${p.weeksPostOp} weeks` : null, col2, "Graft Type:", p.graftType);
  row("Body Weight:", data.bw ? `${data.bw} lbs` : null, col2, "Tibial Length:", data.tib ? `${data.tib} cm` : null);
  row("Limb Length:", data.limbLen ? `${data.limbLen} cm (ASIS-MM)` : null);
  divider();

  // ── RANGE OF MOTION ───────────────────────────────────────────────────
  if (hasVal(data.flexR) || hasVal(data.flexL) || hasVal(data.extR) || hasVal(data.extL)) {
    section("Range of Motion");
    row("Knee Flexion — Right:", data.flexR ? `${data.flexR} deg` : null, col2, "Left:", data.flexL ? `${data.flexL} deg` : null);
    row("Knee Extension — Right:", data.extR ? `${data.extR} deg` : null, col2, "Left:", data.extL ? `${data.extL} deg` : null);
    const fInv = invR ? data.flexR : data.flexL, fUninv = invR ? data.flexL : data.flexR;
    const fd = calcDiff(fInv, fUninv);
    if (fd !== null) row(`Flex Deficit (${inv}-${uninv}):`, `${fd} deg`);
    divider();
  }

  // ── THIGH GIRTH ───────────────────────────────────────────────────────
  const gTotR_p = [data.girth.r5, data.girth.r10, data.girth.r15].reduce((a,v) => a + toNum(v), 0);
  const gTotL_p = [data.girth.l5, data.girth.l10, data.girth.l15].reduce((a,v) => a + toNum(v), 0);
  if (gTotR_p > 0 || gTotL_p > 0) {
    section("Thigh Girth (cm above patella)");
    row("5cm — Right:", data.girth.r5 || null, col2, "Left:", data.girth.l5 || null);
    row("10cm — Right:", data.girth.r10 || null, col2, "Left:", data.girth.l10 || null);
    row("15cm — Right:", data.girth.r15 || null, col2, "Left:", data.girth.l15 || null);
    const gBig = Math.max(gTotR_p, gTotL_p), gSmall = Math.min(gTotR_p, gTotL_p);
    const gPct = gBig > 0 ? (((gBig - gSmall)/gBig)*100).toFixed(1) : null;
    const gSide = gTotR_p < gTotL_p ? "Right deficit" : gTotL_p < gTotR_p ? "Left deficit" : "Equal";
    if (gPct !== null) row("Asymmetry:", `${gPct}%  (${gSide})`);
    divider();
  }

  // ── STRENGTH TESTING ──────────────────────────────────────────────────
  const hasStr = hasVal(data.keR) || hasVal(data.keL) || hasVal(data.forceR) || hasVal(data.forceL) || hasVal(data.hsR) || hasVal(data.hsL);
  if (hasStr) {
    section("Strength Testing");
    if (hasVal(data.keR) || hasVal(data.keL)) {
      row("KE Force — Right:", data.keR ? `${data.keR} lbs` : null, col2, "Left:", data.keL ? `${data.keL} lbs` : null);
      if (hasVal(data.tpfR) || hasVal(data.tpfL)) row("Time to Peak Force — R:", data.tpfR ? `${data.tpfR} s` : null, col2, "L:", data.tpfL ? `${data.tpfL} s` : null);
      if (keLSI_p !== null) lsiRow(`KE LSI (${inv} / ${uninv}):`, keLSI_p);
    }
    if (hasVal(data.forceR) || hasVal(data.forceL)) {
      row("HHD Force — Right:", data.forceR ? `${data.forceR} lbs` : null, col2, "Left:", data.forceL ? `${data.forceL} lbs` : null);
      if (torRnm_p || torLnm_p) row("Torque at 90 deg — Right:", torRnm_p ? `${torRnm_p} Nm` : null, col2, "Left:", torLnm_p ? `${torLnm_p} Nm` : null);
      if (normR_p || normL_p)   row("Normalized — Right:", normR_p ? `${normR_p} Nm/kg` : null, col2, "Left:", normL_p ? `${normL_p} Nm/kg` : null);
      if (torLSI_p !== null)    lsiRow(`Quad Index (${inv} / ${uninv}):`, torLSI_p);
    }
    if (hasVal(data.hsR) || hasVal(data.hsL)) {
      row("Hamstring Force — Right:", data.hsR ? `${data.hsR} lbs` : null, col2, "Left:", data.hsL ? `${data.hsL} lbs` : null);
      if (hsLSI_p !== null) lsiRow(`HS LSI (${inv} / ${uninv}):`, hsLSI_p);
      if (hqRR_p || hqRL_p) row("H:Q Ratio — Right:", hqRR_p ? `${hqRR_p}%` : null, col2, "Left:", hqRL_p ? `${hqRL_p}%` : null);
      if (hqInv_p !== null) lsiRow(`H:Q Ratio (${inv}):`, hqInv_p, hqStatus);
    }
    divider();
  }

  // ── HOP TESTING ───────────────────────────────────────────────────────
  const anyHop = hopSI_p || hopSU_p || hopTrI_p || hopTrU_p || hopCrI_p || hopCrU_p || hopTmI_p || hopTmU_p;
  if (anyHop) {
    section("Hop Testing");
    const hopTests = [
      ["Single Hop for Distance", hopSI_p,  hopSU_p,  lsiSingle, '"'],
      ["Triple Hop for Distance", hopTrI_p, hopTrU_p, lsiTriple, '"'],
      ["Crossover Hop",           hopCrI_p, hopCrU_p, lsiCross,  '"'],
      ["6m Timed Hop",            hopTmI_p, hopTmU_p, lsiTimed,  "s"],
    ].filter(([, i, u]) => i || u);
    hopTests.forEach(([name, invVal, uninvVal, lsiV, unit]) => {
      row(`${name}:`, invVal ? `${inv}: ${invVal}${unit}` : null, col2, uninvVal ? `${uninv}:` : null, uninvVal ? `${uninvVal}${unit}` : null);
      if (lsiV !== null) lsiRow(`  LSI:`, lsiV);
    });
    divider();
  }

  // ── Y-BALANCE TEST ────────────────────────────────────────────────────
  const ybHas = hasVal(yb.rAnt) || hasVal(yb.rPM) || hasVal(yb.rPL) || hasVal(yb.lAnt) || hasVal(yb.lPM) || hasVal(yb.lPL);
  if (ybHas) {
    section("Y-Balance Test  (Benchmark: >= 90% of Limb Length)");
    const ybFmt = (reach, ll) => hasVal(reach) && hasVal(ll) ? `${reach} cm  (${calcYDir(reach, ll)}% LL)` : (hasVal(reach) ? `${reach} cm` : null);
    row("Anterior — Right:", ybFmt(yb.rAnt, data.limbLen), col2, "Left:", ybFmt(yb.lAnt, data.limbLen));
    row("Posteromedial — Right:", ybFmt(yb.rPM, data.limbLen), col2, "Left:", ybFmt(yb.lPM, data.limbLen));
    row("Posterolateral — Right:", ybFmt(yb.rPL, data.limbLen), col2, "Left:", ybFmt(yb.lPL, data.limbLen));
    if (ybCompR_p !== null) lsiRow("Composite Score — Right:", ybCompR_p, ybalStatus);
    if (ybCompL_p !== null) lsiRow("Composite Score — Left:", ybCompL_p, ybalStatus);
    if (antDiff_p !== null) {
      if (y < 120) addNewPage();
      const flagged = parseFloat(antDiff_p) > 4;
      page.drawText(sanitizePdf("Anterior Side Difference:"), { x: L, y, size: 8.5, font: fontBold, color: BLACK_R });
      page.drawText(sanitizePdf(`${antDiff_p} cm`), { x: L + 155, y, size: 8.5, font, color: flagged ? RED_R : BLACK_R });
      if (flagged) {
        const fx = L + 155 + font.widthOfTextAtSize(`${antDiff_p} cm`, 8.5) + 6;
        page.drawText(sanitizePdf("> 4 cm  CLINICALLY SIGNIFICANT"), { x: fx, y, size: 7, font: fontBold, color: RED_R });
      }
      y -= 12;
    }
    divider();
  }

  // ── AGILITY ───────────────────────────────────────────────────────────
  if (hasVal(data.agilityTime)) {
    section("Pro Agility Test (5-10-5)");
    row("Best Time:", `${data.agilityTime} sec`);
    divider();
  }

  // ── PATIENT-REPORTED OUTCOMES ─────────────────────────────────────────
  if (hasVal(data.ikdc) || hasVal(data.tampa)) {
    section("Patient-Reported Outcomes");
    if (hasVal(data.ikdc)) {
      const iv = parseFloat(data.ikdc);
      const ikdcSt = iv >= 95 ? { color: LIME_R, bg: LIME_BG, txt: LIME_TXT, label: ">= 95  MEETS RTS THRESHOLD" }
                   : iv >= 80 ? { color: GOLD_R, bg: GOLD_BG, txt: GOLD_TXT, label: "80-94  APPROACHING" }
                   :            { color: RED_R,  bg: RED_BG,  txt: RED_TXT,  label: "<  80  BELOW THRESHOLD" };
      lsiRow("IKDC Subjective Knee Form:", data.ikdc.toString(), () => ikdcSt, "/100");
    }
    if (hasVal(data.tampa)) {
      const tv = parseFloat(data.tampa);
      const tampaSt = tv <= 17 ? { color: LIME_R, bg: LIME_BG, txt: LIME_TXT, label: "<= 17  ACCEPTABLE" }
                    : tv <= 22 ? { color: GOLD_R, bg: GOLD_BG, txt: GOLD_TXT, label: "18-22  MILD KINESIO." }
                    :            { color: RED_R,  bg: RED_BG,  txt: RED_TXT,  label: ">  22  ELEVATED" };
      lsiRow("Tampa Scale (TSK-11):", data.tampa.toString(), () => tampaSt, "");
    }
    divider();
  }

  // ── VALD FORCE PLATFORM ───────────────────────────────────────────────
  const valdSections = [
    { label: "Squat Symmetry — Vald ForceDecks", v: data.valdSquat || {},
      rows: [["LSI", "lsiPct", "%"], ["Peak Force Asym", "peakForceAsym", "%"], ["Peak Force CoV", "peakForceCov", "%"], ["Classification", "classification", ""]] },
    { label: "CMJ — Vald ForceDecks", v: data.valdCMJ || {},
      rows: [["Jump Height", "jumpHeight", "cm"], ["Ecc Braking Asym", "eccBrakingImpAsym", "%"], ["Ecc Braking CoV", "eccBrakingImpCov", "%"], ["Conc PF Asym", "concPeakForceAsym", "%"], ["Modified RSI", "modRSI", ""], ["Classification", "classification", ""]] },
  ].filter(s => Object.values(s.v).some(v => v && v !== ""));

  if (valdSections.length > 0) {
    section("Force Platform Testing (Vald ForceDecks)");
    valdSections.forEach(({ label, v, rows }) => {
      if (y < 120) addNewPage();
      page.drawText(sanitizePdf(label), { x: L, y, size: 7.5, font: fontBold, color: GRAY });
      y -= 13;
      rows.forEach(([lbl, key, unit]) => {
        if (!v[key] || v[key] === "") return;
        row(`  ${lbl}:`, unit ? `${v[key]}${unit}` : v[key]);
      });
    });
    divider();
  }

  // ── SL LAND AND HOLD ──────────────────────────────────────────────────
  const slh = data.slLandHold || {};
  const slhHas = hasVal(slh.rPeakForce) || hasVal(slh.lPeakForce) || hasVal(slh.rTTS) || hasVal(slh.lTTS);
  if (slhHas) {
    section("Single Leg Land and Hold");
    if (hasVal(slh.rPeakForce) || hasVal(slh.lPeakForce)) {
      if (y < 120) addNewPage();
      page.drawText(sanitizePdf("Peak Landing Force"), { x: L, y, size: 7.5, font: fontBold, color: GRAY });
      y -= 13;
      if (hasVal(slh.rPeakForce)) row("  Right:", `${slh.rPeakForce} N`);
      if (hasVal(slh.lPeakForce)) row("  Left:",  `${slh.lPeakForce} N`);
      if (hasVal(slh.rPeakForce) && hasVal(slh.lPeakForce) && Math.max(toNum(slh.rPeakForce), toNum(slh.lPeakForce)) > 0) {
        const fa = ((Math.abs(toNum(slh.rPeakForce) - toNum(slh.lPeakForce)) / Math.max(toNum(slh.rPeakForce), toNum(slh.lPeakForce))) * 100).toFixed(1);
        const faSt = parseFloat(fa) <= 10
          ? { color: LIME_R, bg: LIME_BG, txt: LIME_TXT, label: `${fa}%  WITHIN THRESHOLD` }
          : parseFloat(fa) <= 15
          ? { color: GOLD_R, bg: GOLD_BG, txt: GOLD_TXT, label: `${fa}%  BORDERLINE` }
          : { color: RED_R,  bg: RED_BG,  txt: RED_TXT,  label: `${fa}%  EXCEEDS THRESHOLD` };
        lsiRow("  Force Asymmetry:", fa, () => faSt, "%");
      }
    }
    if (hasVal(slh.rTTS) || hasVal(slh.lTTS)) {
      if (y < 120) addNewPage();
      page.drawText(sanitizePdf("Time to Stabilization"), { x: L, y, size: 7.5, font: fontBold, color: GRAY });
      y -= 13;
      if (hasVal(slh.rTTS)) row("  Right:", `${slh.rTTS} sec`);
      if (hasVal(slh.lTTS)) row("  Left:",  `${slh.lTTS} sec`);
      if (hasVal(slh.rTTS) && hasVal(slh.lTTS) && Math.max(toNum(slh.rTTS), toNum(slh.lTTS)) > 0) {
        const ta = ((Math.abs(toNum(slh.rTTS) - toNum(slh.lTTS)) / Math.max(toNum(slh.rTTS), toNum(slh.lTTS))) * 100).toFixed(1);
        const taSt = parseFloat(ta) <= 10
          ? { color: LIME_R, bg: LIME_BG, txt: LIME_TXT, label: `${ta}%  WITHIN THRESHOLD` }
          : parseFloat(ta) <= 15
          ? { color: GOLD_R, bg: GOLD_BG, txt: GOLD_TXT, label: `${ta}%  BORDERLINE` }
          : { color: RED_R,  bg: RED_BG,  txt: RED_TXT,  label: `${ta}%  EXCEEDS THRESHOLD` };
        lsiRow("  TTS Asymmetry:", ta, () => taSt, "%");
      }
    }
    divider();
  }

  // ── INTERPRETATION LEGEND ─────────────────────────────────────────────
  const legendY = Math.min(y - 4, 70);
  const legendMaxX = R;
  if (legendY > 36) {
    page.drawLine({ start: {x: L, y: legendY + 14}, end: {x: legendMaxX, y: legendY + 14}, thickness: 0.4, color: BORDER_R });
    page.drawText(sanitizePdf("INTERPRETATION:"), { x: L, y: legendY + 2, size: 6.5, font: fontBold, color: GRAY });
    const lgItems = [
      { color: LIME_R, bg: LIME_BG, txt: LIME_TXT, text: ">= 90% — Meets RTS criteria" },
      { color: GOLD_R, bg: GOLD_BG, txt: GOLD_TXT, text: "80-89% — Borderline" },
      { color: RED_R,  bg: RED_BG,  txt: RED_TXT,  text: "< 80%  — Below criteria" },
    ];
    let lx = L + fontBold.widthOfTextAtSize("INTERPRETATION:", 6.5) + 14;
    lgItems.forEach(({ color, bg, text }) => {
      if (lx + 11 + font.widthOfTextAtSize(text, 6.5) > legendMaxX) return;
      page.drawRectangle({ x: lx, y: legendY, width: 8, height: 8, color: bg });
      page.drawRectangle({ x: lx, y: legendY + 6, width: 8, height: 2, color: color });
      page.drawText(sanitizePdf(text), { x: lx + 11, y: legendY + 1, size: 6.5, font, color: GRAY });
      lx += 11 + font.widthOfTextAtSize(text, 6.5) + 18;
    });
  }

  // ── FOOTER (last page) ────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: 0, width, height: 26, color: DARK_R });
    page.drawRectangle({ x: 0, y: 26, width, height: 1.5, color: LIME_R });
    page.drawText(sanitizePdf("TRM  |  ACL Rehabilitation Testing Tool"), {
      x: L, y: 8, size: 6.5, font, color: rgb(0.44, 0.44, 0.44),
    });
    page.drawText(sanitizePdf(`Page ${pageCount} of ${pageCount}`), {
      x: R - font.widthOfTextAtSize(`Page ${pageCount} of ${pageCount}`, 6.5),
      y: 8, size: 6.5, font, color: rgb(0.38, 0.38, 0.38),
    });

// ── DOWNLOAD ──────────────────────────────────────────────────────────
  const pdfBytes = await doc.save();
  const filename = `TRM_Session_${new Date().toISOString().slice(0,10)}.pdf`;
  const blob = new Blob([pdfBytes], { type: "application/pdf" });

  // SHARE mode — always uses native OS share sheet (AirDrop, Save to Files, etc.)
  if (mode === "share") {
    const shareFile = new File([blob], filename, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile], title: "TRM Session PDF" });
      } catch (err) {
        if (err.name !== "AbortError") throw err;
        // User dismissed share sheet — not an error
      }
      return "shared";
    }
    return "share-unsupported";
  }

  // DOWNLOAD mode — direct file save
  const url = URL.createObjectURL(blob);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (!isIOS) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Safari sometimes ignores <a download> on blob URLs — open in new tab as fallback.
    // We delay slightly so the download attempt lands first, then open tab as backup.
    // Do NOT call window.open synchronously after async work — Safari treats it as a popup.
    if (isSafari) {
      setTimeout(() => { window.open(url, "_blank"); }, 100);
      setTimeout(() => URL.revokeObjectURL(url), 90000); // Safari needs more time
    } else {
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
    return "downloaded";
  }
  // iOS: <a download> is ignored — open in new tab so user can save via browser toolbar
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "ios-tab";
}

async function loadSessionPDF(file, onData, onError) {
  try {
    const { PDFDocument } = await getPdfLib();
    const arrayBuffer = await file.arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    // Try multiple metadata locations. Some PDF viewers (iOS PDFKit, Preview, Adobe)
    // silently strip the /Info dictionary on re-save. We write to both Subject and
    // Keywords on save, so we try each in turn before giving up.
    let encoded = null;
    const PREFIX = "TRM_SESSION_V1:";

    const subject = doc.getSubject() || "";
    if (subject.startsWith(PREFIX)) encoded = subject.slice(PREFIX.length);

    if (!encoded) {
      const rawKeywords = doc.getKeywords() || "";
      // pdf-lib returns an Array when keywords were set via setKeywords([...]),
      // but older saves stored a plain string — handle both gracefully.
      const keywords = Array.isArray(rawKeywords) ? (rawKeywords[0] || "") : rawKeywords;
      if (keywords.startsWith(PREFIX)) encoded = keywords.slice(PREFIX.length);
    }

    if (!encoded) {
      onError(
        "This PDF does not contain TRM session data. " +
        "Make sure you are uploading a PDF saved directly from the TRM app " +
        "(not a print-to-PDF, screenshot, or file re-saved by another viewer). " +
        "PDFs from older app versions that predate this format cannot be restored."
      );
      return;
    }

    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const json = new TextDecoder("utf-8").decode(bytes);
    const raw = JSON.parse(json);
    _mergeAndDeliver(raw, onData);
  } catch (e) {
    onError("Could not read session data from this PDF. The file may be corrupted or was re-saved by an external PDF viewer which stripped the embedded data. (" + e.message + ")");
  }
}




function _mergeAndDeliver(raw, onData) {
    // Deep-merge with BLANK_DATA so any fields added after the PDF was saved
    // are always present (prevents crashes when new keys are accessed).
    const sessionData = {
      ...BLANK_DATA,
      ...raw,
      patient: { ...BLANK_DATA.patient, ...(raw.patient || {}) },
      girth:   { ...BLANK_DATA.girth,   ...(raw.girth   || {}) },
      hops:    { ...BLANK_DATA.hops,    ...(raw.hops    || {}) },
      yBalance:{ ...BLANK_DATA.yBalance,...(raw.yBalance|| {}) },
      valdSquat:  { ...BLANK_DATA.valdSquat,  ...(raw.valdSquat  || {}) },
      valdCMJ:    { ...BLANK_DATA.valdCMJ,    ...(raw.valdCMJ    || {}) },
      slLandHold: { ...BLANK_DATA.slLandHold, ...(raw.slLandHold || {}) },
      attested:   { ...(raw.attested || {}) },
    };
    onData(sessionData);
}

// ─── BLANK DATA ───────────────────────────────────────────────────────────────
const BLANK_DATA = {
  patient: { date: "", surgeon: "", graftType: "", weeksPostOp: "", involvedSide: "Left", sex: "Male" },
  bw: "", tib: "", limbLen: "",
  flexR: "", flexL: "", extR: "", extL: "",
  girth: { r5: "", r10: "", r15: "", l5: "", l10: "", l15: "" },
  keR: "", keL: "", forceR: "", forceL: "",
  tpfR: "", tpfL: "",
  hsR: "", hsL: "",
  ikdc: "", tampa: "",
  valdSquat: {}, valdCMJ: {},
  slLandHold: { rPeakForce: "", lPeakForce: "", rTTS: "", lTTS: "" },
  yBalance: { rAnt: "", rPM: "", rPL: "", lAnt: "", lPM: "", lPL: "" },
  hops: {
    singleI: [{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    singleU: [{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    tripleI: [{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    tripleU: [{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    crossI:  [{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    crossU:  [{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    timedI: ["","",""], timedU: ["","",""],
  },
  agilityTime: "",
  noteText: "",
  impression: "",
  attested: {},  // progression tab clinical checkbox states
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,     setActiveTab]     = useState(0);
  const [saving,        setSaving]        = useState(false);
  const [loadMsg,       setLoadMsg]       = useState(null);
  const [sessions,      setSessions]      = useState([]);
  // Modal state
  const [confirmModal,  setConfirmModal]  = useState({ open: false, file: null, fileName: "" });
  const [newPtModal,    setNewPtModal]    = useState(false);

  const fileInputRef    = useRef(null);
  const compareInputRef = useRef(null);

  const [data, setData] = useState(BLANK_DATA);
  const [storageRestored, setStorageRestored] = useState(false);
  // Gate: don't autosave until we've finished the restore attempt
  const [restoreComplete, setRestoreComplete] = useState(false);

  // ── AUTO-RESTORE from storage on first load ──────────────────────────────
  // Checks window.storage first (cross-session), then localStorage (iOS pull-to-refresh fallback)
  useEffect(() => {
    (async () => {
      try {
        let parsedData = null;

        // Primary: window.storage (persists across sessions)
        try {
          const saved = await window.storage.get("trm_autosave");
          if (saved && saved.value) parsedData = JSON.parse(saved.value);
        } catch (e) {}

        // Fallback: localStorage (synchronous — survives iOS pull-to-refresh within same session)
        if (!parsedData) {
          try {
            const local = localStorage.getItem("trm_autosave_local");
            if (local) parsedData = JSON.parse(local);
          } catch (e) {}
        }

        if (parsedData) {
          const hasData = parsedData.patient?.date || parsedData.patient?.surgeon || parsedData.bw || parsedData.tib;
          if (hasData) {
            // Deep-merge with BLANK_DATA so any fields added in newer versions
            // are always present — prevents crashes if autosave is from an older build
            const merged = {
              ...BLANK_DATA,
              ...parsedData,
              patient:    { ...BLANK_DATA.patient,    ...(parsedData.patient    || {}) },
              girth:      { ...BLANK_DATA.girth,      ...(parsedData.girth      || {}) },
              hops:       { ...BLANK_DATA.hops,       ...(parsedData.hops       || {}) },
              yBalance:   { ...BLANK_DATA.yBalance,   ...(parsedData.yBalance   || {}) },
              valdSquat:  { ...BLANK_DATA.valdSquat,  ...(parsedData.valdSquat  || {}) },
              valdCMJ:    { ...BLANK_DATA.valdCMJ,    ...(parsedData.valdCMJ    || {}) },
              slLandHold: { ...BLANK_DATA.slLandHold, ...(parsedData.slLandHold || {}) },
              attested:   { ...(parsedData.attested   || {}) },
            };
            setData(merged);
            setStorageRestored(true);
            setTimeout(() => setStorageRestored(false), 5000);
          }
        }
      } catch (e) {
        // No saved data — start fresh
      } finally {
        setRestoreComplete(true);
      }
    })();
  }, []);

  // ── AUTO-SAVE to storage on every data change ─────────────────────────────
  // Only runs after restoreComplete is true — prevents overwriting saved data on mount
  // Uses BOTH window.storage (persistent) AND localStorage (synchronous iOS fallback)
  useEffect(() => {
    if (!restoreComplete) return;
    const serialized = JSON.stringify(data);
    // Synchronous localStorage write — survives iOS pull-to-refresh & tab switches instantly
    try { localStorage.setItem("trm_autosave_local", serialized); } catch (e) {}
    // Async window.storage write — persists across sessions
    (async () => {
      try {
        await window.storage.set("trm_autosave", serialized);
      } catch (e) {
        // Storage unavailable — silently continue
      }
    })();
  }, [data, restoreComplete]);

  // ── WARN before accidental refresh / tab close ───────────────────────────
  // beforeunload works on desktop; pagehide is used for iOS Safari compatibility
  useEffect(() => {
    const hasAnyData = () =>
      !!(data.patient?.date || data.patient?.surgeon || data.bw || data.tib ||
        data.limbLen || data.flexR || data.flexL || data.keR || data.keL ||
        data.hops?.singleI?.[0]?.ft);

    const handleBeforeUnload = (e) => {
      if (hasAnyData()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    // iOS Safari fires pagehide instead of beforeunload for back/forward/refresh
    // We force a final autosave here as a safety net
    const handlePageHide = () => {
      try {
        const current = JSON.stringify(data);
        window.storage.set("trm_autosave", current);
      } catch (e) {}
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [data]);

  const tabs = [
    { label: "Testing",     sub: "Outcome Measures" },
    { label: "Comparison",  sub: "Progress Tracking" },
    { label: "Progression", sub: "Phase Criteria" },
    { label: "Letter",      sub: "Physician Communication" },
  ];

  const handleSavePDF = async () => {
    setSaving(true);
    try {
      const result = await saveSessionPDF(data, "download");
      if (result === "ios-tab") {
        setLoadMsg({ type: "success", text: "PDF opened in a new tab — tap the Share icon in your browser toolbar, then \"Save to Files\" to save it." });
        setTimeout(() => setLoadMsg(null), 12000);
      } else {
        // On Safari/MacBook the download dialog may not appear — PDF also opens in a new tab as backup
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
          setLoadMsg({ type: "success", text: "PDF saved. If no download dialog appeared, check the new tab that opened — use File → Export as PDF or the download icon to save it." });
          setTimeout(() => setLoadMsg(null), 14000);
        }
      }
    } catch(e) {
      setLoadMsg({type:"error", text:"Save failed: " + e.message});
      setTimeout(() => setLoadMsg(null), 8000);
    }
    setSaving(false);
  };

  const handleAirDrop = async () => {
    setSaving(true);
    try {
      const result = await saveSessionPDF(data, "share");
      if (result === "share-unsupported") {
        setLoadMsg({ type: "error", text: "Sharing is not supported in this browser. Use Save PDF instead." });
        setTimeout(() => setLoadMsg(null), 6000);
      }
    } catch(e) {
      setLoadMsg({type:"error", text:"Share failed: " + e.message});
      setTimeout(() => setLoadMsg(null), 8000);
    }
    setSaving(false);
  };

  // Step 1: file picker triggers — show confirm modal instead of loading directly
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setConfirmModal({ open: true, file, fileName: file.name });
  };

  // Step 2: user confirmed — actually load the file
  const doLoadFile = async () => {
    const file = confirmModal.file;
    setConfirmModal({ open: false, file: null, fileName: "" });
    await loadSessionPDF(file,
      (sessionData) => {
        const dateLabel = sessionData.patient?.date || "Previous Session";
        const wks = sessionData.patient?.weeksPostOp;
        const label = wks ? `${dateLabel} (Wk ${wks})` : dateLabel;
        setSessions(prev => {
          const exists = prev.findIndex(s => s.label === label);
          if (exists >= 0) { const n = [...prev]; n[exists] = {data: sessionData, label, date: dateLabel}; return n; }
          return [{data: sessionData, label, date: dateLabel}, ...prev].slice(0, 5);
        });
        setData(sessionData);
        setLoadMsg({type:"success", text:`Session loaded from ${dateLabel} — fields restored. Comparison tab updated.`});
        setTimeout(() => setLoadMsg(null), 5000);
      },
      (errMsg) => {
        setLoadMsg({type:"error", text: errMsg});
        setTimeout(() => setLoadMsg(null), 6000);
      }
    );
  };

  // Load a PDF purely for comparison (no confirm needed — doesn't overwrite form)
  const handleCompareFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    await loadSessionPDF(file,
      (sessionData) => {
        const dateLabel = sessionData.patient?.date || "Session";
        const wks = sessionData.patient?.weeksPostOp;
        const label = wks ? `${dateLabel} (Wk ${wks})` : dateLabel;
        setSessions(prev => {
          const exists = prev.findIndex(s => s.label === label);
          if (exists >= 0) { const n = [...prev]; n[exists] = {data: sessionData, label, date: dateLabel}; return n; }
          if (prev.length >= 5) {
            setLoadMsg({type:"error", text:"Maximum of 5 comparison sessions reached. Remove one before adding another."});
            setTimeout(() => setLoadMsg(null), 5000);
            return prev;
          }
          return [...prev, {data: sessionData, label, date: dateLabel}];
        });
        setLoadMsg({type:"success", text:`Added ${label} to comparison.`});
        setTimeout(() => setLoadMsg(null), 4000);
      },
      (errMsg) => {
        setLoadMsg({type:"error", text: errMsg});
        setTimeout(() => setLoadMsg(null), 6000);
      }
    );
  };

  // New patient: clear everything
  const doNewPatient = async () => {
    setData(BLANK_DATA);
    setSessions([]);
    setNewPtModal(false);
    setActiveTab(0);
    // Clear autosave so blank form doesn't restore on next visit
    try { await window.storage.delete("trm_autosave"); } catch (e) {}
    try { localStorage.removeItem("trm_autosave_local"); } catch (e) {}
  };

  return (
    <div style={{ background: BLACK, minHeight: "100vh", color: WHITE, fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>

      <ConfirmModal
        open={confirmModal.open}
        fileName={confirmModal.fileName}
        onConfirm={doLoadFile}
        onCancel={() => setConfirmModal({ open: false, file: null, fileName: "" })}
      />
      <NewPatientModal
        open={newPtModal}
        onConfirm={doNewPatient}
        onCancel={() => setNewPtModal(false)}
      />

      <div style={{ background: DARK, borderBottom: `1px solid ${BORDER}`, position: "-webkit-sticky", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: "'Arial Black',Impact,sans-serif", fontSize: 28, fontWeight: 900, color: WHITE, letterSpacing: "-1px" }}>TRM</span>
              <span style={{ color: BORDER, fontSize: 18 }}>|</span>
              <span className="trm-header-subtitle" style={{ fontSize: 11, fontWeight: 700, color: "#777", letterSpacing: "0.08em", textTransform: "uppercase" }}>ACL Testing & Outcome Measures</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileChange} />
              <input ref={compareInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleCompareFileChange} />
              <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase" }}>Involved:</span>
              <SideToggle value={data.patient.involvedSide} onChange={v => setData(p => ({ ...p, patient: { ...p.patient, involvedSide: v } }))} />
            </div>
          </div>
          <div style={{ display: "flex", borderTop: `1px solid ${BORDER}` }}>
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)} className="trm-tab-btn" style={{ padding: "10px 22px", background: "transparent", border: "none", borderBottom: `3px solid ${activeTab === i ? LIME : "transparent"}`, cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: activeTab === i ? LIME : "#666" }}>{t.label}</div>
                <div className="trm-tab-sub" style={{ fontSize: 9, color: activeTab === i ? LIME + "88" : "#444", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="trm-main-content" style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px", paddingBottom: 100 }}>
        {/* Auto-save restored toast */}
        {storageRestored && (
          <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 10, border: `1px solid ${BLUE}55`, background: BLUE + "12", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16 }}>💾</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>Session auto-restored — your data was saved from your last visit.</span>
            <button onClick={() => setStorageRestored(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}
        {/* Session load/save toast */}
        {loadMsg && (
          <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 10, border: `1px solid ${loadMsg.type === "success" ? LIME + "55" : RED_BAD + "55"}`, background: loadMsg.type === "success" ? LIME + "12" : RED_BAD + "12", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16 }}>{loadMsg.type === "success" ? "✓" : "⚠"}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: loadMsg.type === "success" ? LIME : RED_BAD }}>{loadMsg.text}</span>
            <button onClick={() => setLoadMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}
        {activeTab === 0 && <Tab1 data={data} setData={setData} />}
        {activeTab === 1 && <Tab2 currentData={data} sessions={sessions} setSessions={setSessions} onAddSession={() => compareInputRef.current.click()} />}
        {activeTab === 2 && <Tab3 currentData={data} setData={setData} />}
        {activeTab === 3 && <Tab4 currentData={data} setData={setData} />}
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 20px", textAlign: "center" }}>
        <span style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, color: WHITE, fontSize: 13 }}>TRM</span>
        <span style={{ color: MUTED, fontSize: 11, marginLeft: 10 }}>ACL Rehabilitation Testing Tool — Not a substitute for clinical judgment</span>
      </div>

      {/* ── SESSION BUTTONS ── */}
      <div className="trm-fab" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", alignItems: "center", gap: 8 }}>

        {/* Split: Reset | Load */}
        <div style={{
          display: "flex", alignItems: "stretch",
          border: `1px solid ${BORDER}55`, borderRadius: 7, overflow: "hidden",
          boxShadow: "0 1px 6px rgba(0,0,0,0.3)",
        }}>
          <button
            onClick={() => setNewPtModal(true)}
            style={{
              padding: "7px 9px",
              background: "rgba(248,113,113,0.04)", color: RED_BAD + "99",
              border: "none", cursor: "pointer",
              fontSize: 9, fontWeight: 800,
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
            Reset
          </button>
          <div style={{ width: 1, background: BORDER + "66", flexShrink: 0 }} />
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              padding: "7px 9px",
              background: "rgba(255,255,255,0.03)", color: "#666",
              border: "none", cursor: "pointer",
              fontSize: 9, fontWeight: 800,
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
            Load
          </button>
        </div>

        {/* Split: Save PDF | ⬆ AirDrop */}
        <div style={{
          display: "flex", alignItems: "stretch",
          border: `1px solid ${LIME}28`, borderRadius: 7, overflow: "hidden",
          boxShadow: `0 1px 6px ${LIME}0a`,
          opacity: saving ? 0.5 : 1,
        }}>
          <button
            onClick={handleSavePDF}
            disabled={saving}
            style={{
              padding: "7px 11px",
              background: LIME + "0c", color: LIME + "cc",
              border: "none", cursor: saving ? "default" : "pointer",
              fontSize: 9, fontWeight: 800,
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
            {saving ? "Saving…" : "Save PDF"}
          </button>
          <div style={{ width: 1, background: LIME + "22", flexShrink: 0 }} />
          <button
            onClick={handleAirDrop}
            disabled={saving}
            title="Share / AirDrop"
            style={{
              padding: "7px 9px",
              background: LIME + "0c", color: LIME + "cc",
              border: "none", cursor: saving ? "default" : "pointer",
              fontSize: 12, lineHeight: 1, display: "flex", alignItems: "center",
            }}>
            ⬆
          </button>
        </div>

      </div>
    </div>
  );
}
