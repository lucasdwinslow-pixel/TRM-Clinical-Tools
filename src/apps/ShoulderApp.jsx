import { useState, useRef, useEffect } from "react";

// pdf-lib loaded via script tag
let _pdfLibResolve;
const _pdfLibPromise = new Promise(res => { _pdfLibResolve = res; });
if (typeof window !== "undefined") {
  if (window.PDFLib) { _pdfLibResolve(window.PDFLib); }
  else {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
    script.onload = () => _pdfLibResolve(window.PDFLib);
    document.head.appendChild(script);
  }
}
const getPdfLib = () => _pdfLibPromise;

const LIME     = "#b8ff57";
const LIME_DIM = "#8ed43c";
const BLACK    = "#0b0f12";
const DARK     = "#101417";
const CARD     = "#1c2023";
const BORDER   = "rgba(255,255,255,0.10)";
const MUTED    = "rgba(255,255,255,0.4)";
const WHITE    = "#ffffff";
const GOLD     = "#fbbf24";
const RED_BAD  = "#f87171";
const BLUE     = "#38bdf8";

if (typeof document !== "undefined" && !document.getElementById("trm-shoulder-styles")) {
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1";
    document.head.appendChild(meta);
  }
  const s = document.createElement("style");
  s.id = "trm-shoulder-styles";
  s.textContent = `
    html, body { overscroll-behavior-y: none; }
    .trm-sidenav { width: 190px; flex-shrink: 0; position: sticky; top: 108px; max-height: calc(100vh - 125px); overflow-y: auto; margin-right: 20px; align-self: flex-start; }
    .trm-sidenav::-webkit-scrollbar { width: 3px; }
    .trm-sidenav::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
    .trm-content { flex: 1; min-width: 0; }
    @media (max-width: 700px) {
      .trm-sidenav { display: none !important; }
      .trm-r2, .trm-r3, .trm-r4 { grid-template-columns: 1fr !important; }
      .trm-r2-persist { grid-template-columns: 1fr 1fr !important; }
      .trm-card-body { padding: 14px !important; }
      .trm-header-subtitle { display: none !important; }
      .trm-tab-sub { display: none !important; }
      .trm-tab-btn { padding: 10px 12px !important; }
      .trm-stat-bar { gap: 16px !important; padding: 10px 14px !important; }
      .trm-fab { bottom: 90px !important; right: 12px !important; gap: 5px !important; }
      .trm-fab button { padding: 10px 12px !important; font-size: 11px !important; min-height: 44px; }
      input[type="number"], input[type="text"], select, textarea {
        font-size: 16px !important; min-height: 44px !important;
      }
    }
  `;
  document.head.appendChild(s);
}

const toNum  = (v) => parseFloat(v) || 0;
const hasVal = (v) => v !== "" && v !== null && v !== undefined && !isNaN(parseFloat(v));
const calcLSI = (inv, uninv) => {
  if (!hasVal(inv) || !hasVal(uninv) || toNum(uninv) === 0) return null;
  return ((toNum(inv) / toNum(uninv)) * 100).toFixed(1);
};
const calcDiff = (a, b) => {
  if (!hasVal(a) || !hasVal(b)) return null;
  return (toNum(a) - toNum(b)).toFixed(1);
};
const calcTorqueNm = (forceLbs, leverCm) => {
  if (!hasVal(forceLbs) || !hasVal(leverCm)) return null;
  return (toNum(forceLbs) * 4.44822 * (toNum(leverCm) / 100)).toFixed(1);
};
const calcNorm = (nm, bwLbs) => {
  if (!nm || !hasVal(bwLbs) || toNum(bwLbs) === 0) return null;
  return (toNum(nm) / (toNum(bwLbs) * 0.453592)).toFixed(2);
};
const calcERIR = (erNm, irNm) => {
  if (!hasVal(erNm) || !hasVal(irNm) || toNum(irNm) === 0) return null;
  return ((toNum(erNm) / toNum(irNm)) * 100).toFixed(1);
};

const VALID_RANGES = {
  bw:[50,500], leverArm:[20,50],
  flexionR:[0,200], flexionL:[0,200], abductionR:[0,200], abductionL:[0,200],
  erSideR:[0,120], erSideL:[0,120], irSideR:[0,90], irSideL:[0,120],
  er90R:[0,120], er90L:[0,120], ir90R:[0,90], ir90L:[0,90],
  horizAddR:[0,50], horizAddL:[0,50], abirR:[0,90], abirL:[0,90],
  aberR:[0,120], aberL:[0,120], scapUpRotR:[0,60], scapUpRotL:[0,60],
  elbowFlexR:[0,160], elbowFlexL:[0,160], elbowExtR:[0,10], elbowExtL:[0,10],
  pronationR:[0,90], pronationL:[0,90], supinationR:[0,90], supinationL:[0,90],
  erForceR:[0,80], erForceL:[0,80], irForceR:[0,120], irForceL:[0,120],
  scaptionForceR:[0,100], scaptionForceL:[0,100],
  grip9090R:[0,200], grip9090L:[0,200], gripFds3R:[0,200], gripFds3L:[0,200],
  shotPutR1:[0,300], shotPutR2:[0,300], shotPutR3:[0,300],
  shotPutL1:[0,300], shotPutL2:[0,300], shotPutL3:[0,300],
  ckcuest:[0,50], smbThrowInv:[0,20], smbThrowUninv:[0,20],
  ueYbalInvReach:[0,120], ueYbalUninvReach:[0,120],
  ueYbalInvLimbLength:[20,100], ueYbalUninvLimbLength:[20,100],
  ueYbalInvMedial:[0,120], ueYbalUninvMedial:[0,120],
  ueYbalInvInfLat:[0,120], ueYbalUninvInfLat:[0,120],
  ueYbalInvSupLat:[0,120], ueYbalUninvSupLat:[0,120],
  valdPlyoInvPeakForce:[0,1000], valdPlyoUninvPeakForce:[0,1000],
  valdPlyoInvTimePeak:[0,500], valdPlyoUninvTimePeak:[0,500],
  valdPlyoInvRFD:[0,5000], valdPlyoUninvRFD:[0,5000],
  shotPutInv:[0,300], shotPutUninv:[0,300],
};
const isOutOfRange = (key, val) => {
  if (!hasVal(val)) return false;
  const r = VALID_RANGES[key];
  if (!r) return false;
  const v = parseFloat(val);
  return v < r[0] || v > r[1];
};

const lsiColor = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return MUTED;
  if (n >= 90) return LIME;
  if (n >= 80) return GOLD;
  return RED_BAD;
};

const inp = {
  background: "#1c1c1c", border: "1px solid #2e2e2e", borderRadius: 6,
  padding: "8px 12px", color: WHITE, fontSize: 13, width: "100%",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const inpInvalid = {
  background: "#2a1010", border: "1px solid #f87171", borderRadius: 6,
  padding: "8px 12px", color: "#f87171", fontSize: 13, width: "100%",
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

function Card({ title, accent, required, children, id, focusable, activeCard, setActiveCard }) {
  const isActive = focusable ? activeCard === id : false;
  const handleClick = focusable && setActiveCard ? () => setActiveCard(id) : undefined;
  const hi = accent ? "accent" : required ? "required" : isActive ? "active" : "default";
  const borderColor  = hi === "accent" ? LIME+"44" : hi === "required" ? LIME+"55" : hi === "active" ? LIME+"66" : BORDER;
  const shadowColor  = hi === "accent" ? `0 0 24px ${LIME}18` : hi === "required" ? `0 0 20px ${LIME}22` : hi === "active" ? `0 0 20px ${LIME}22` : "0 2px 12px rgba(0,0,0,0.4)";
  const headerBg     = hi === "accent" ? `linear-gradient(90deg,${LIME}18,transparent)` : hi === "required" ? `linear-gradient(90deg,${LIME}12,transparent)` : hi === "active" ? `linear-gradient(90deg,${LIME}14,transparent)` : "#161616";
  const headerBorder = hi === "default" ? BORDER : LIME+"33";
  const barColor     = hi === "default" ? "#444" : LIME;
  const titleColor   = hi === "default" ? "#888" : LIME;
  return (
    <div id={id} style={{ background: CARD, borderRadius: 12, marginBottom: 20, overflow: "hidden", border: `1px solid ${borderColor}`, boxShadow: shadowColor, transition: "box-shadow 0.3s, border-color 0.3s" }}>
      <div onClick={handleClick} style={{ padding: "12px 20px", background: headerBg, borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", gap: 10, cursor: focusable ? "pointer" : "default", userSelect: "none" }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: barColor }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: titleColor, textTransform: "uppercase" }}>{title}</span>
        {required && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, color: LIME, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>Required</span>}
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
        style={readOnly ? { ...inp, color: LIME, background: "#0f0f0f", borderColor: LIME+"33", cursor: "default" } : invalid ? inpInvalid : inp}
        type={readOnly ? "text" : type} step={step} placeholder={placeholder}
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
        <button key={s} onClick={() => onChange(s)} style={{ padding: "8px 24px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", background: value === s ? LIME : "transparent", border: `2px solid ${value === s ? LIME : BORDER}`, color: value === s ? BLACK : MUTED }}>{s}</button>
      ))}
    </div>
  );
}

function ConfirmModal({ open, fileName, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#141414", border: `1px solid ${BORDER}`, borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.8)", overflow: "hidden" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${GOLD}, ${GOLD}88, transparent)` }} />
        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: GOLD+"18", border: `1px solid ${GOLD}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚠</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: WHITE, marginBottom: 6 }}>Replace Current Session?</div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>Loading this file will overwrite all data currently on the form. This cannot be undone.</div>
            </div>
          </div>
          {fileName && (
            <div style={{ background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: MUTED }}>FILE</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#ccc", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#1a1a1a", color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${GOLD}66`, background: GOLD+"18", color: GOLD, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Yes, Load File</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function NewPatientModal({ open, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#141414", border: `1px solid ${BORDER}`, borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 24px 80px rgba(0,0,0,0.8)", overflow: "hidden" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${RED_BAD}, ${RED_BAD}88, transparent)` }} />
        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: RED_BAD+"18", border: `1px solid ${RED_BAD}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✕</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: WHITE, marginBottom: 6 }}>Clear Form for New Patient?</div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>All fields will be reset to blank. Make sure you've saved the current session as a PDF before continuing.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#1a1a1a", color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${RED_BAD}66`, background: RED_BAD+"18", color: RED_BAD, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Clear & Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TriResult({ value, onChange }) {
  const opts = [
    { v: "neg", label: "Neg", color: LIME },
    { v: "pos", label: "Pos", color: RED_BAD },
    { v: "equivocal", label: "Equiv", color: GOLD },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(value === o.v ? "" : o.v)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, fontWeight: 800, cursor: "pointer", background: value === o.v ? o.color+"28" : "transparent", border: `1.5px solid ${value === o.v ? o.color : BORDER}`, color: value === o.v ? o.color : MUTED }}>{o.label}</button>
      ))}
    </div>
  );
}

// ─── NOTE BUILDER (scap bug fixed) ───────────────────────────────────────────
function buildShoulderNote(d) {
  const inv   = d.patient.involvedSide;
  const invR  = inv === "Right";
  const uninv = invR ? "Left" : "Right";
  // FIX: guard against removed scap field
  const scap  = d.scap || {};

  const lines = [];
  const add   = (l) => lines.push(l);
  const addIf = (c, l) => { if (c) lines.push(l); };
  const br    = () => lines.push("");

  add("OBJECTIVE - SHOULDER REHABILITATION TESTING"); br();
  addIf(d.patient.date,            `Date of Testing: ${d.patient.date}`);
  addIf(d.patient.surgeon,         `Surgeon: ${d.patient.surgeon}`);
  addIf(d.patient.surgeryType,     `Surgery Type: ${d.patient.surgeryType}`);
  addIf(hasVal(d.patient.weeksPostOp), `Weeks Post-Op: ${d.patient.weeksPostOp}`);
  add(`Involved Side: ${inv}`);
  addIf(d.patient.athleteCategory, `Athlete Category: ${d.patient.athleteCategory === "contact" ? "Contact Athlete" : "Non-Contact Athlete"}`);
  addIf(d.patient.armDominance,    `Arm Dominance (Involved): ${d.patient.armDominance === "dominant" ? "Dominant Arm" : "Non-Dominant Arm"}`);
  br();

  addIf(hasVal(d.bw), `Body Weight: ${d.bw} lbs`);
  addIf(hasVal(d.leverArm), `HHD Lever Arm: ${d.leverArm} cm`);
  if (hasVal(d.bw) || hasVal(d.leverArm)) br();

  const hasROM = ["flexionR","flexionL","abductionR","abductionL","erSideR","erSideL","irSideR","irSideL","er90R","er90L","ir90R","ir90L","horizAddR","horizAddL","abirR","abirL","aberR","aberL","scapUpRotR","scapUpRotL","elbowFlexR","elbowFlexL","elbowExtR","elbowExtL","pronationR","pronationL","supinationR","supinationL"].some(k => hasVal(d[k]));
  if (hasROM) {
    add("SHOULDER RANGE OF MOTION");
    const rFlexDiff  = calcDiff(invR ? d.flexionR : d.flexionL, invR ? d.flexionL : d.flexionR);
    const rAbdDiff   = calcDiff(invR ? d.abductionR : d.abductionL, invR ? d.abductionL : d.abductionR);
    addIf(hasVal(d.flexionR),   `Flexion - Right: ${d.flexionR}°`);
    addIf(hasVal(d.flexionL),   `Flexion - Left: ${d.flexionL}°`);
    addIf(rFlexDiff !== null,   `  Flexion Deficit (${inv}−${uninv}): ${rFlexDiff}°`);
    addIf(hasVal(d.abductionR), `Abduction - Right: ${d.abductionR}°`);
    addIf(hasVal(d.abductionL), `Abduction - Left: ${d.abductionL}°`);
    addIf(rAbdDiff !== null,    `  Abduction Deficit (${inv}−${uninv}): ${rAbdDiff}°`);
    addIf(hasVal(d.erSideR),  `ER at 0° - Right: ${d.erSideR}°`);
    addIf(hasVal(d.erSideL),  `ER at 0° - Left: ${d.erSideL}°`);
    addIf(hasVal(d.irSideR),  `IR at 0° - Right: ${d.irSideR}°`);
    addIf(hasVal(d.irSideL),  `IR at 0° - Left: ${d.irSideL}°`);
    addIf(hasVal(d.er90R),    `ER at 90° Abduction - Right: ${d.er90R}°`);
    addIf(hasVal(d.er90L),    `ER at 90° Abduction - Left: ${d.er90L}°`);
    addIf(hasVal(d.ir90R),    `IR at 90° Abduction - Right: ${d.ir90R}°`);
    addIf(hasVal(d.ir90L),    `IR at 90° Abduction - Left: ${d.ir90L}°`);
    if (hasVal(d.er90R) && hasVal(d.ir90R)) add(`  Total Arc - Right (ER90+IR90): ${(toNum(d.er90R)+toNum(d.ir90R)).toFixed(0)}°`);
    if (hasVal(d.er90L) && hasVal(d.ir90L)) add(`  Total Arc - Left (ER90+IR90): ${(toNum(d.er90L)+toNum(d.ir90L)).toFixed(0)}°`);
    addIf(hasVal(d.horizAddR), `Horizontal Adduction - Right: ${d.horizAddR}°`);
    addIf(hasVal(d.horizAddL), `Horizontal Adduction - Left: ${d.horizAddL}°`);
    addIf(hasVal(d.abirR), `ABIR - Right: ${d.abirR}°`);
    addIf(hasVal(d.abirL), `ABIR - Left: ${d.abirL}°`);
    addIf(hasVal(d.aberR), `ABER - Right: ${d.aberR}°`);
    addIf(hasVal(d.aberL), `ABER - Left: ${d.aberL}°`);
    addIf(hasVal(d.scapUpRotR), `Scapular Upward Rotation - Right: ${d.scapUpRotR}°`);
    addIf(hasVal(d.scapUpRotL), `Scapular Upward Rotation - Left: ${d.scapUpRotL}°`);
    addIf(hasVal(d.elbowFlexR), `Elbow Flexion - Right: ${d.elbowFlexR}°`);
    addIf(hasVal(d.elbowFlexL), `Elbow Flexion - Left: ${d.elbowFlexL}°`);
    addIf(hasVal(d.elbowExtR), `Elbow Extension - Right: ${d.elbowExtR}°`);
    addIf(hasVal(d.elbowExtL), `Elbow Extension - Left: ${d.elbowExtL}°`);
    addIf(hasVal(d.pronationR), `Pronation - Right: ${d.pronationR}°`);
    addIf(hasVal(d.pronationL), `Pronation - Left: ${d.pronationL}°`);
    addIf(hasVal(d.supinationR), `Supination - Right: ${d.supinationR}°`);
    addIf(hasVal(d.supinationL), `Supination - Left: ${d.supinationL}°`);
    br();
  }

  const erInvNm    = invR ? calcTorqueNm(d.erForceR, d.leverArm) : calcTorqueNm(d.erForceL, d.leverArm);
  const erUninvNm  = invR ? calcTorqueNm(d.erForceL, d.leverArm) : calcTorqueNm(d.erForceR, d.leverArm);
  const irInvNm    = invR ? calcTorqueNm(d.irForceR, d.leverArm) : calcTorqueNm(d.irForceL, d.leverArm);
  const irUninvNm  = invR ? calcTorqueNm(d.irForceL, d.leverArm) : calcTorqueNm(d.irForceR, d.leverArm);
  const erInvNorm  = calcNorm(erInvNm,  d.bw);
  const erUninvNorm= calcNorm(erUninvNm, d.bw);
  const erLSI      = calcLSI(erInvNorm, erUninvNorm);
  const irLSI      = calcLSI(calcNorm(irInvNm,d.bw), calcNorm(irUninvNm,d.bw));
  const erirInv    = calcERIR(erInvNm, irInvNm);

  if (hasVal(d.erForceR) || hasVal(d.erForceL) || hasVal(d.irForceR) || hasVal(d.irForceL)) {
    add("ROTATOR CUFF STRENGTH — ISOMETRIC HHD");
    addIf(hasVal(d.leverArm), `Lever Arm: ${d.leverArm} cm`);
    if (hasVal(d.erForceR)) add(`External Rotation - Right: ${d.erForceR} lbs${calcTorqueNm(d.erForceR,d.leverArm) ? ` / ${calcTorqueNm(d.erForceR,d.leverArm)} Nm` : ""}${calcNorm(calcTorqueNm(d.erForceR,d.leverArm),d.bw) ? ` / ${calcNorm(calcTorqueNm(d.erForceR,d.leverArm),d.bw)} Nm/kg` : ""}`);
    if (hasVal(d.erForceL)) add(`External Rotation - Left: ${d.erForceL} lbs${calcTorqueNm(d.erForceL,d.leverArm) ? ` / ${calcTorqueNm(d.erForceL,d.leverArm)} Nm` : ""}${calcNorm(calcTorqueNm(d.erForceL,d.leverArm),d.bw) ? ` / ${calcNorm(calcTorqueNm(d.erForceL,d.leverArm),d.bw)} Nm/kg` : ""}`);
    addIf(erLSI !== null, `ER Limb Symmetry Index (${inv}/${uninv}): ${erLSI}%`);
    if (hasVal(d.bw) && toNum(d.bw) > 0) {
      addIf(hasVal(d.erForceR), `  ER Right BW Ratio: ${((toNum(d.erForceR)/toNum(d.bw))*100).toFixed(1)}% (norm 12-15%)`);
      addIf(hasVal(d.erForceL), `  ER Left BW Ratio: ${((toNum(d.erForceL)/toNum(d.bw))*100).toFixed(1)}% (norm 12-15%)`);
    }
    if (hasVal(d.irForceR)) add(`Internal Rotation - Right: ${d.irForceR} lbs${calcTorqueNm(d.irForceR,d.leverArm) ? ` / ${calcTorqueNm(d.irForceR,d.leverArm)} Nm` : ""}${calcNorm(calcTorqueNm(d.irForceR,d.leverArm),d.bw) ? ` / ${calcNorm(calcTorqueNm(d.irForceR,d.leverArm),d.bw)} Nm/kg` : ""}`);
    if (hasVal(d.irForceL)) add(`Internal Rotation - Left: ${d.irForceL} lbs${calcTorqueNm(d.irForceL,d.leverArm) ? ` / ${calcTorqueNm(d.irForceL,d.leverArm)} Nm` : ""}${calcNorm(calcTorqueNm(d.irForceL,d.leverArm),d.bw) ? ` / ${calcNorm(calcTorqueNm(d.irForceL,d.leverArm),d.bw)} Nm/kg` : ""}`);
    addIf(irLSI !== null, `IR Limb Symmetry Index (${inv}/${uninv}): ${irLSI}%`);
    if (hasVal(d.bw) && toNum(d.bw) > 0) {
      addIf(hasVal(d.irForceR), `  IR Right BW Ratio: ${((toNum(d.irForceR)/toNum(d.bw))*100).toFixed(1)}% (norm ~25%)`);
      addIf(hasVal(d.irForceL), `  IR Left BW Ratio: ${((toNum(d.irForceL)/toNum(d.bw))*100).toFixed(1)}% (norm ~25%)`);
    }
    if (erirInv !== null) {
      const rv = parseFloat(erirInv);
      add(`ER:IR Ratio — ${inv} (Involved): ${erirInv}%${rv >= 66 ? " ✓ Within normal range (≥66%)" : rv >= 60 ? " — Borderline" : " ✗ Below benchmark (<66%)"}`);
    }
    br();
  }

  const avgT = (...vs) => { const ns = vs.map(v => parseFloat(v)).filter(v => !isNaN(v)); return ns.length ? (ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1) : null; };
  const hasScaptionGrip = hasVal(d.scaptionForceR) || hasVal(d.scaptionForceL) || hasVal(d.grip9090R) || hasVal(d.grip9090L) || hasVal(d.gripFds3R) || hasVal(d.gripFds3L);
  if (hasScaptionGrip) {
    add("SCAPTION & GRIP STRENGTH");
    const scaptInv   = invR ? d.scaptionForceR : d.scaptionForceL;
    const scaptUninv = invR ? d.scaptionForceL : d.scaptionForceR;
    addIf(hasVal(scaptInv),   `Scaption — ${inv}: ${scaptInv} lbs`);
    addIf(hasVal(scaptUninv), `Scaption — ${uninv}: ${scaptUninv} lbs`);
    const scaptLSI = calcLSI(scaptInv, scaptUninv);
    addIf(scaptLSI !== null, `  Scaption LSI: ${scaptLSI}%`);
    const g9090IA = invR ? d.grip9090R : d.grip9090L;
    const g9090UA = invR ? d.grip9090L : d.grip9090R;
    const gFds3IA = invR ? d.gripFds3R : d.gripFds3L;
    const gFds3UA = invR ? d.gripFds3L : d.gripFds3R;
    if (g9090IA || g9090UA) {
      addIf(g9090IA, `Grip 90/90 — ${inv}: ${g9090IA} lbs`);
      addIf(g9090UA, `Grip 90/90 — ${uninv}: ${g9090UA} lbs`);
      const lsi90 = calcLSI(g9090IA, g9090UA); addIf(lsi90, `  90/90 LSI: ${lsi90}%`);
    }
    if (gFds3IA || gFds3UA) {
      addIf(gFds3IA, `Grip FDS-3 — ${inv}: ${gFds3IA} lbs`);
      addIf(gFds3UA, `Grip FDS-3 — ${uninv}: ${gFds3UA} lbs`);
      const lsiFds = calcLSI(gFds3IA, gFds3UA); addIf(lsiFds, `  FDS-3 LSI: ${lsiFds}%`);
    }
    br();
  }

  const ash = d.ash || {};
  const ashPositions = [
    { key: "isoI", label: "ISO I — Arm at Side (0° Abduction)" },
    { key: "isoT", label: "ISO T — 90° Abduction / Horizontal" },
    { key: "isoY", label: "ISO Y — Full Elevation / Y Position" },
  ];
  const hasAsh = ashPositions.some(p => hasVal(ash[`${p.key}InvLoad`]) || hasVal(ash[`${p.key}UninvLoad`]));
  const hasValdData = hasVal(ash.valdPlyoInvPeakForce) || hasVal(ash.valdPlyoUninvPeakForce);
  if (hasAsh || hasValdData) {
    add("ASH TEST & VALD FORCEDECKS");
    ashPositions.forEach(({ key, label }) => {
      const iL = ash[`${key}InvLoad`]; const uL = ash[`${key}UninvLoad`];
      if (hasVal(iL) || hasVal(uL)) {
        add(label + ":");
        addIf(hasVal(iL), `  ${inv} (Involved): ${iL} lbs`);
        addIf(hasVal(uL), `  ${uninv} (Uninvolved): ${uL} lbs`);
        const lsi = calcLSI(iL, uL);
        addIf(lsi !== null, `  LSI: ${lsi}%${parseFloat(lsi) >= 90 ? " ✓ Meets ≥90% threshold" : " — Below threshold"}`);
        addIf(ash[`${key}Notes`], `  Notes: ${ash[`${key}Notes`]}`);
      }
    });
    if (hasValdData) {
      add("VALD ForceDecks — Plyo Push Up:");
      addIf(hasVal(ash.valdPlyoInvPeakForce),   `  Peak Force — ${inv}: ${ash.valdPlyoInvPeakForce} N`);
      addIf(hasVal(ash.valdPlyoUninvPeakForce),  `  Peak Force — ${uninv}: ${ash.valdPlyoUninvPeakForce} N`);
      const fSym = calcLSI(ash.valdPlyoInvPeakForce, ash.valdPlyoUninvPeakForce);
      addIf(fSym !== null, `  Peak Force LSI: ${fSym}%${parseFloat(fSym) >= 90 ? " ✓ Meets target" : " — Below target"}`);
      addIf(hasVal(ash.valdPlyoInvTimePeak),   `  Time to Peak — ${inv}: ${ash.valdPlyoInvTimePeak} ms`);
      addIf(hasVal(ash.valdPlyoUninvTimePeak), `  Time to Peak — ${uninv}: ${ash.valdPlyoUninvTimePeak} ms`);
      const tSym = calcLSI(ash.valdPlyoInvTimePeak, ash.valdPlyoUninvTimePeak);
      addIf(tSym !== null, `  Time Symmetry: ${tSym}%${parseFloat(tSym) >= 90 ? " ✓ <10% asymmetry" : " — >10% asymmetry"}`);
      addIf(hasVal(ash.valdPlyoInvRFD),    `  RFD — ${inv}: ${ash.valdPlyoInvRFD} N/s`);
      addIf(hasVal(ash.valdPlyoUninvRFD),  `  RFD — ${uninv}: ${ash.valdPlyoUninvRFD} N/s`);
      addIf(ash.valdPlyoNotes, `  Notes: ${ash.valdPlyoNotes}`);
    }
    br();
  }

  const pe = d.posteriorEndurance || {};
  if (hasVal(pe.reps) || hasVal(pe.timeInv) || hasVal(pe.timeUninv)) {
    add("POSTERIOR SHOULDER ENDURANCE TEST");
    addIf(hasVal(pe.reps),      `Reps to Fatigue — ${inv} (Involved): ${pe.reps}`);
    addIf(hasVal(pe.repsUninv), `Reps to Fatigue — ${uninv} (Uninvolved): ${pe.repsUninv}`);
    if (hasVal(pe.reps)) {
      const r = parseFloat(pe.reps);
      add(`  Interpretation (Involved): ${r >= 20 ? "Good posterior endurance (≥20 reps)" : r >= 12 ? "Moderate — monitor cuff fatigue" : "Reduced posterior endurance"}`);
    }
    addIf(hasVal(pe.timeInv),   `Time Held — ${inv} (Involved): ${pe.timeInv} sec`);
    addIf(hasVal(pe.timeUninv), `Time Held — ${uninv} (Uninvolved): ${pe.timeUninv} sec`);
    const peLSI = calcLSI(pe.timeInv, pe.timeUninv);
    addIf(peLSI !== null, `  Time LSI: ${peLSI}%${parseFloat(peLSI) >= 90 ? " ✓ Meets ≥90% threshold" : " — Below threshold"}`);
    addIf(pe.notes, `Notes: ${pe.notes}`);
    br();
  }

  if (scap.dyskinesis || scap.winging || scap.lateralSlide || hasVal(scap.kibler)) {
    add("SCAPULAR ASSESSMENT");
    addIf(scap.dyskinesis,    `Scapular Dyskinesis: ${scap.dyskinesis}`);
    addIf(scap.winging,       `Scapular Winging: ${scap.winging}`);
    addIf(scap.lateralSlide,  `Lateral Slide Test: ${scap.lateralSlide}`);
    addIf(hasVal(scap.kibler),`Lateral Slide Difference (40° abd): ${scap.kibler} mm`);
    br();
  }

  const func = d.functional || {};
  const hasFuncData = hasVal(func.ckcuestReps) || hasVal(func.smbThrowInv) || hasVal(func.smbThrowUninv)
    || func.carryTest || func.singleArmCarry
    || hasVal(func.ueYbalInvMedial)
    || hasVal(func.shotPutInv) || func.psetScore
    || hasVal(func.ueYbalInvLimbLength);
  if (hasFuncData) {
    add("FUNCTIONAL TESTING");
    if (hasVal(func.ckcuestReps)) {
      const ckcClass = parseFloat(func.ckcuestReps) >= 21 ? "Meets benchmark (≥21 reps)" : parseFloat(func.ckcuestReps) >= 17 ? "Borderline" : "Below benchmark";
      add(`CKC Upper Extremity Stability Test (CKCUEST): ${func.ckcuestReps} reps/15 sec — ${ckcClass}`);
    }
    if (hasVal(func.smbThrowInv) || hasVal(func.smbThrowUninv)) {
      const smbLSI = calcLSI(func.smbThrowInv, func.smbThrowUninv);
      addIf(hasVal(func.smbThrowInv),   `Seated Medicine Ball Throw — ${inv} (Involved): ${func.smbThrowInv} m`);
      addIf(hasVal(func.smbThrowUninv), `Seated Medicine Ball Throw — ${uninv} (Uninvolved): ${func.smbThrowUninv} m`);
      addIf(smbLSI !== null, `  Throw LSI: ${smbLSI}%`);
    }
    if (hasVal(func.ueYbalInvLimbLength) || hasVal(func.ueYbalInvMedial)) {
      add("UE Y-Balance Test:");
      addIf(hasVal(func.ueYbalInvLimbLength),   `  Limb Length — ${inv}: ${func.ueYbalInvLimbLength} cm`);
      addIf(hasVal(func.ueYbalUninvLimbLength),  `  Limb Length — ${uninv}: ${func.ueYbalUninvLimbLength} cm`);
      const calcC = (m, il, sl, ll) => (hasVal(m) && hasVal(il) && hasVal(sl) && hasVal(ll) && toNum(ll) > 0) ? (((toNum(m)+toNum(il)+toNum(sl))/(3*toNum(ll)))*100).toFixed(1) : null;
      const cInv   = calcC(func.ueYbalInvMedial, func.ueYbalInvInfLat, func.ueYbalInvSupLat, func.ueYbalInvLimbLength);
      const cUninv = calcC(func.ueYbalUninvMedial, func.ueYbalUninvInfLat, func.ueYbalUninvSupLat, func.ueYbalUninvLimbLength);
      addIf(hasVal(func.ueYbalInvMedial),   `  ${inv} Medial: ${func.ueYbalInvMedial} cm | Inf-Lat: ${func.ueYbalInvInfLat || "—"} cm | Sup-Lat: ${func.ueYbalInvSupLat || "—"} cm`);
      addIf(hasVal(func.ueYbalUninvMedial), `  ${uninv} Medial: ${func.ueYbalUninvMedial} cm | Inf-Lat: ${func.ueYbalUninvInfLat || "—"} cm | Sup-Lat: ${func.ueYbalUninvSupLat || "—"} cm`);
      addIf(cInv !== null,   `  ${inv} Composite: ${cInv}%${parseFloat(cInv) >= 90 ? " ✓ Meets ≥90% target" : " — Below target"}`);
      addIf(cUninv !== null, `  ${uninv} Composite: ${cUninv}%${parseFloat(cUninv) >= 90 ? " ✓ Meets ≥90% target" : " — Below target"}`);
    }
    addIf(func.carryTest,       `Bilateral Carry Test: ${func.carryTest}`);
    addIf(func.singleArmCarry,  `Single-Arm Overhead Carry: ${func.singleArmCarry}`);
    if (hasVal(func.shotPutInv) || hasVal(func.shotPutUninv)) {
      const spLSI = calcLSI(func.shotPutInv, func.shotPutUninv);
      const spTarget = d.patient?.armDominance === "dominant" ? 110 : 90;
      add("Seated Shot Put Test (7 lb ball):");
      const spInvF  = invR ? avgT(func.shotPutR1,func.shotPutR2,func.shotPutR3) : avgT(func.shotPutL1,func.shotPutL2,func.shotPutL3);
      const spUninvF= invR ? avgT(func.shotPutL1,func.shotPutL2,func.shotPutL3) : avgT(func.shotPutR1,func.shotPutR2,func.shotPutR3);
      addIf(spInvF,   `  ${inv} avg: ${spInvF}"`);
      addIf(spUninvF, `  ${uninv} avg: ${spUninvF}"`);
      addIf(spLSI !== null, `  LSI: ${spLSI}% (Target ≥${spTarget}%)${parseFloat(spLSI) >= spTarget ? " ✓ Meets target" : " — Below target"}`);
    }
    if (func.psetScore) {
      add(`Progressive Shoulder Endurance Test (PSET): ${func.psetScore}`);
      addIf(func.psetNotes, `  Limiting factor: ${func.psetNotes}`);
    }
    if (hasVal(d.er90R) && hasVal(d.ir90R) && hasVal(d.er90L) && hasVal(d.ir90L)) {
      const arcR = (toNum(d.er90R) + toNum(d.ir90R)).toFixed(0);
      const arcL = (toNum(d.er90L) + toNum(d.ir90L)).toFixed(0);
      const arcInv   = invR ? arcR : arcL;
      const arcUninv = invR ? arcL : arcR;
      const arcDiff  = Math.abs(toNum(arcInv) - toNum(arcUninv)).toFixed(0);
      add(`Total Arc of Motion — ${inv}: ${arcInv}° | ${uninv}: ${arcUninv}° | Bilateral Diff: ${arcDiff}°${parseFloat(arcDiff) <= 5 ? " ✓ Within ±5°" : ` — Exceeds ±5° threshold`}`);
    }
    addIf(func.totalArcBilateralNotes, `  Total Arc Notes: ${func.totalArcBilateralNotes}`);
    br();
  }

  const hasProData = ["dash","quickdash","ases","penn","wosi","psfs"].some(k => hasVal(d[k]));
  if (hasProData) {
    add("PATIENT-REPORTED OUTCOMES");
    if (hasVal(d.dash)) { const v = parseFloat(d.dash); add(`DASH: ${d.dash}/100${v <= 10 ? " ✓ Minimal disability (≤10)" : v <= 30 ? " — Mild-moderate disability" : " — Significant disability"}`); }
    if (hasVal(d.quickdash)) add(`QuickDASH: ${d.quickdash}/100`);
    if (hasVal(d.ases)) { const v = parseFloat(d.ases); add(`ASES Shoulder Index: ${d.ases}/100${v >= 80 ? " ✓ Good-excellent outcome" : v >= 60 ? " — Fair outcome" : " — Poor outcome"}`); }
    if (hasVal(d.penn)) { const v = parseFloat(d.penn); add(`Penn Shoulder Score: ${d.penn}/100${v >= 80 ? " ✓ Good-excellent outcome" : v >= 60 ? " — Fair outcome" : " — Poor outcome"}`); }
    if (hasVal(d.wosi)) { const v = parseFloat(d.wosi); add(`WOSI: ${d.wosi}/2100 (lower = better)${v <= 500 ? " — Minimal impairment" : v <= 1050 ? " — Moderate impairment" : " — Significant impairment"}`); }
    if (hasVal(d.psfs)) add(`Patient Specific Functional Scale (PSFS): ${d.psfs}/10`);
    br();
  }

  if (d.clinicalNotes && d.clinicalNotes.trim()) {
    add("CLINICAL NOTES");
    add(d.clinicalNotes.trim());
    br();
  }

  return lines.join("\n").trim();
}

async function embedTRMLogo(doc) {
  const d = "M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 867 352"><path fill="white" fill-rule="evenodd" d="${d}"/></svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  URL.revokeObjectURL(url);
  const CW = 152, CH = Math.round(352 / 867 * 152);
  const canvas = document.createElement("canvas");
  canvas.width = CW; canvas.height = CH;
  canvas.getContext("2d").drawImage(img, 0, 0, CW, CH);
  const b64 = canvas.toDataURL("image/png").split(",")[1];
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const pdfImg = await doc.embedPng(bytes);
  const w = 38, h = Math.round(352 / 867 * 38);
  return { pdfImg, w, h };
}

async function saveSessionPDF(data, mode = "download") {
  const { PDFDocument, rgb, StandardFonts } = await getPdfLib();
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedTRMLogo(doc);
  const GRAY   = rgb(0.4, 0.4, 0.4);
  const LGRAY  = rgb(0.85, 0.85, 0.85);
  const BLACK_R = rgb(0.05, 0.05, 0.05);
  // Sanitize text to WinAnsi-safe ASCII before any drawText call
  const san = (t) => String(t)
    .replace(/−/g, "-")  // mathematical minus sign
    .replace(/—/g, "--") // em dash
    .replace(/–/g, "-")  // en dash
    .replace(/≥/g, ">=") // ≥
    .replace(/≤/g, "<=") // ≤
    .replace(/✓/g, "[check]") // ✓
    .replace(/✗/g, "[x]")     // ✗
    .replace(/⚠/g, "[!]")     // ⚠
    .replace(/[^\x00-\xFF]/g, "?"); // any remaining non-latin1
  // Dual-field metadata: Subject + Keywords backup (some PDF viewers strip /Info on re-save)
  const sessionJson = JSON.stringify(data);
  const utf8Bytes = new TextEncoder().encode(sessionJson);
  let binary = "";
  utf8Bytes.forEach(b => { binary += String.fromCharCode(b); });
  const encoded = btoa(binary);
  doc.setSubject("TRM_SHOULDER_V1:" + encoded);
  doc.setKeywords(["TRM_SHOULDER_V1:" + encoded]); // Backup — Keywords survives more PDF viewers
  doc.setTitle("TRM Shoulder Session");
  const page = doc.addPage([612, 792]);
  const L = 48, R = 564, T = 744;
  let y = T;
  const draw = (text, x, yp, size, f, c) => page.drawText(san(text), { x, y: yp, size, font: f || font, color: c || BLACK_R });
  const hline = (yp, c) => page.drawLine({ start: { x: L, y: yp }, end: { x: R, y: yp }, thickness: 0.5, color: c || LGRAY });
  page.drawRectangle({ x: 0, y: 758, width: 612, height: 34, color: rgb(0.04, 0.04, 0.04) });
  page.drawImage(logo.pdfImg, { x: L, y: 758 + (34 - logo.h) / 2, width: logo.w, height: logo.h });
  draw("Shoulder Testing & Outcome Measures", L + 46, 769, 9, font, GRAY);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  draw(today, R - font.widthOfTextAtSize(today, 9), 769, 9, font, GRAY);
  y = T - 12;
  const inv   = data.patient.involvedSide;
  draw("PATIENT", L, y, 7, fontBold, GRAY);
  y -= 14;
  const ptFields = [
    ["Date", data.patient.date], ["Surgery Type", data.patient.surgeryType],
    ["Surgeon", data.patient.surgeon], ["Weeks Post-Op", data.patient.weeksPostOp],
    ["Involved Side", inv],
  ].filter(([,v]) => v && String(v).trim() !== "");
  let px = L;
  ptFields.forEach(([lbText, val]) => {
    if (px > R - 80) { px = L; y -= 14; }
    draw(lbText + ": ", px, y, 8, fontBold, GRAY);
    draw(String(val), px + fontBold.widthOfTextAtSize(lbText + ": ", 8), y, 8, font, BLACK_R);
    px += 120;
  });
  y -= 18; hline(y); y -= 12;

  // ===== RTS Pass / Fail Summary =====
  {
    const invR_p  = data.patient.involvedSide === "Right";
    const isCont  = data.patient.athleteCategory === "contact";
    const isNonC  = data.patient.athleteCategory === "non-contact";
    const isDom   = data.patient.armDominance === "dominant";
    const hasProf = isCont || isNonC;
    const strThr  = isDom ? 110 : 90;

    const erRnm_p = calcTorqueNm(data.erForceR, data.leverArm);
    const erLnm_p = calcTorqueNm(data.erForceL, data.leverArm);
    const irRnm_p = calcTorqueNm(data.irForceR, data.leverArm);
    const irLnm_p = calcTorqueNm(data.irForceL, data.leverArm);
    const erLSI_p = invR_p ? calcLSI(calcNorm(erRnm_p,data.bw), calcNorm(erLnm_p,data.bw)) : calcLSI(calcNorm(erLnm_p,data.bw), calcNorm(erRnm_p,data.bw));
    const irLSI_p = invR_p ? calcLSI(calcNorm(irRnm_p,data.bw), calcNorm(irLnm_p,data.bw)) : calcLSI(calcNorm(irLnm_p,data.bw), calcNorm(irRnm_p,data.bw));
    const scLSI_p = calcLSI(invR_p ? data.scaptionForceR : data.scaptionForceL, invR_p ? data.scaptionForceL : data.scaptionForceR);
    const ash_p   = data.ash || {};
    const ashILSI = calcLSI(ash_p.isoIInvLoad,          ash_p.isoIUninvLoad);
    const ashTLSI = calcLSI(ash_p.isoTInvLoad,          ash_p.isoTUninvLoad);
    const ashYLSI = calcLSI(ash_p.isoYInvLoad,          ash_p.isoYUninvLoad);
    const vFLSI   = calcLSI(ash_p.valdPlyoInvPeakForce, ash_p.valdPlyoUninvPeakForce);
    const vTLSI   = calcLSI(ash_p.valdPlyoInvTimePeak,  ash_p.valdPlyoUninvTimePeak);
    const func_p  = data.functional || {};
    const ckcNums = [func_p.ckcuestReps, func_p.ckcuestReps2, func_p.ckcuestReps3].filter(v => hasVal(v)).map(v => parseFloat(v));
    const ckcAvg_p = ckcNums.length ? (ckcNums.reduce((a,b)=>a+b,0)/ckcNums.length).toFixed(1) : null;
    const uybc = (() => {
      const { ueYbalInvMedial:m, ueYbalInvInfLat:il, ueYbalInvSupLat:sl, ueYbalInvLimbLength:ll } = func_p;
      if (!hasVal(m)||!hasVal(il)||!hasVal(sl)||!hasVal(ll)||toNum(ll)===0) return null;
      return (((toNum(m)+toNum(il)+toNum(sl))/(3*toNum(ll)))*100).toFixed(1);
    })();
    const avgT_p  = (...vs) => { const ns=vs.map(v=>parseFloat(v)).filter(v=>!isNaN(v)); return ns.length?(ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1):null; };
    const spInvF  = (invR_p ? avgT_p(func_p.shotPutR1,func_p.shotPutR2,func_p.shotPutR3) : avgT_p(func_p.shotPutL1,func_p.shotPutL2,func_p.shotPutL3)) || func_p.shotPutInv  || "";
    const spUnvF  = (invR_p ? avgT_p(func_p.shotPutL1,func_p.shotPutL2,func_p.shotPutL3) : avgT_p(func_p.shotPutR1,func_p.shotPutR2,func_p.shotPutR3)) || func_p.shotPutUninv || "";
    const spLSI_p = calcLSI(spInvF, spUnvF);
    const spTgt   = isDom ? 110 : 90;
    const pe_p    = data.posteriorEndurance || {};
    const peLSI_p = calcLSI(pe_p.timeInv, pe_p.timeUninv);

    const mkC_p = (label, value, target, unit="%", notes="") => {
      const hasData = hasVal(value);
      const numVal  = hasData ? parseFloat(value) : 0;
      const passes  = hasData && numVal >= target;
      const appr    = hasData && !passes && numVal >= target - 10;
      return { label, value, target, passes, appr, hasData, unit, notes };
    };

    const univC = [
      { label:"Shoulder ROM WNL", passes:!!data.romWNL, appr:false, hasData:true, value:null, unit:"", notes:"Clinician confirmed" },
      mkC_p("ER Strength LSI",       erLSI_p,  strThr, "%", `Target >=${strThr}%`),
      mkC_p("IR Strength LSI",       irLSI_p,  strThr, "%", `Target >=${strThr}%`),
      mkC_p("Scaption LSI",          scLSI_p,  strThr, "%", `Target >=${strThr}%`),
      mkC_p("ASH ISO I LSI",         ashILSI,  90,     "%", ">=90% each position"),
      mkC_p("ASH ISO T LSI",         ashTLSI,  90,     "%", ""),
      mkC_p("ASH ISO Y LSI",         ashYLSI,  90,     "%", ""),
      mkC_p("VALD Peak Force LSI",   vFLSI,    strThr, "%", `Plyo push-up >=${strThr}%`),
      mkC_p("VALD Time to Peak LSI", vTLSI,    90,     "%", "<10% asymmetry"),
      mkC_p("CKCUEST",               ckcAvg_p, 21,     " reps", ">=21 reps / 15 sec"),
    ];
    const contC = isCont ? [
      mkC_p("UE Y-Balance Composite", uybc, 90, "%", "Involved limb >=90%"),
    ] : [];
    const nconC = isNonC ? [
      mkC_p("Seated Shot Put LSI",    spLSI_p, spTgt, "%", `Avg LSI >=${spTgt}%`),
      mkC_p("Posterior Endurance LSI", peLSI_p, 90,   "%", "Time held >=90% LSI"),
    ] : [];

    const allC   = [...univC, ...contC, ...nconC];
    const passing = allC.filter(c => c.passes);
    const allPass = allC.length > 0 && allC.every(c => c.passes);

    const GN = rgb(0.09,0.64,0.29); const GN_BG = rgb(0.92,0.99,0.92); const GN_BD = rgb(0.60,0.88,0.60);
    const AM = rgb(0.73,0.47,0.07); const AM_BG = rgb(1.0, 0.97,0.88); const AM_BD = rgb(0.90,0.78,0.45);
    const RD = rgb(0.78,0.15,0.15); const RD_BG = rgb(1.0, 0.93,0.93); const RD_BD = rgb(0.92,0.68,0.68);
    const ND = rgb(0.55,0.55,0.55); const ND_BG = rgb(0.96,0.96,0.96); const ND_BD = rgb(0.80,0.80,0.80);
    const scoreC = allPass ? GN : passing.length > 0 ? AM : RD;
    const colorsFor = (c) => c.passes ? {t:GN,bg:GN_BG,bd:GN_BD} : c.appr ? {t:AM,bg:AM_BG,bd:AM_BD} : c.hasData ? {t:RD,bg:RD_BG,bd:RD_BD} : {t:ND,bg:ND_BG,bd:ND_BD};

    // Header bar
    y -= 2;
    page.drawRectangle({ x:L, y:y-24, width:R-L, height:26, color:rgb(0.94,0.94,0.93), borderColor:rgb(0.78,0.78,0.78), borderWidth:0.5 });
    draw("RETURN-TO-SPORT PASS / FAIL CRITERIA", L+8, y-8, 7.5, fontBold, rgb(0.25,0.25,0.25));
    if (hasProf) {
      const profStr = `${isCont ? "Contact" : "Non-contact"} | ${isDom ? "Dominant" : "Non-dominant"} arm | Strength LSI threshold: >=${strThr}%`;
      draw(profStr, L+8, y-17, 6.5, font, rgb(0.45,0.45,0.45));
    }
    const scoreStr = `${passing.length}/${allC.length}`;
    const scoreW = fontBold.widthOfTextAtSize(scoreStr, 14);
    page.drawText(san(scoreStr), { x:R-scoreW-6, y:y-12, size:14, font:fontBold, color:scoreC });
    const stsLbl = allPass ? "ALL PASS" : "IN PROGRESS";
    const stsW = fontBold.widthOfTextAtSize(stsLbl, 6);
    page.drawText(san(stsLbl), { x:R-stsW-6, y:y-20, size:6, font:fontBold, color:scoreC });
    y -= 32;

    // 2-column criteria grid
    const CW  = (R - L - 5) / 2;
    const C2X = L + CW + 5;
    const RH  = 19;

    const drawSecLbl_p = (lbl) => {
      page.drawLine({ start:{x:L,y:y-1}, end:{x:R,y:y-1}, thickness:0.4, color:rgb(0.78,0.78,0.78) });
      page.drawText(san(lbl.toUpperCase()), { x:L, y:y-9, size:6.5, font:fontBold, color:rgb(0.50,0.50,0.50) });
      y -= 14;
    };

    const drawCRow_p = (c, cx) => {
      const cls = colorsFor(c);
      page.drawRectangle({ x:cx, y:y-RH+4, width:CW, height:RH, color:cls.bg, borderColor:cls.bd, borderWidth:0.4 });
      page.drawText(san(c.label), { x:cx+5, y:y-7, size:7.5, font:fontBold, color:rgb(0.05,0.05,0.05) });
      if (c.notes) page.drawText(san(c.notes), { x:cx+5, y:y-14, size:6, font, color:rgb(0.50,0.50,0.50) });
      const badge = !c.hasData ? "NO DATA" : c.passes ? "PASS" : c.appr ? "APPR" : "FAIL";
      const bw    = fontBold.widthOfTextAtSize(badge, 6.5);
      page.drawText(san(badge), { x:cx+CW-bw-4, y:y-14, size:6.5, font:fontBold, color:cls.t });
      if (c.hasData && c.value !== null && c.value !== undefined) {
        const valStr = c.value + c.unit;
        const vw = fontBold.widthOfTextAtSize(valStr, 8);
        page.drawText(san(valStr), { x:cx+CW-vw-4, y:y-7, size:8, font:fontBold, color:cls.t });
      }
    };

    const drawSection_p = (items, label) => {
      if (!items.length) return;
      drawSecLbl_p(label);
      let col = 0;
      for (const c of items) {
        drawCRow_p(c, col === 0 ? L : C2X);
        if (col === 1) { y -= RH + 2; col = 0; } else { col = 1; }
      }
      if (col === 1) y -= RH + 2;
      y -= 4;
    };

    drawSection_p(univC, "Universal Criteria");
    drawSection_p(contC, "Contact Criteria");
    drawSection_p(nconC, "Non-contact Criteria");

    y -= 2; hline(y); y -= 8;
  }
  // ===== End RTS Pass / Fail Summary =====

  const noteText = buildShoulderNote(data);
  const page2 = doc.addPage([612, 792]);
  const L2 = 48, R2p = 564;
  let y2 = 744;
  page2.drawRectangle({ x: 0, y: 758, width: 612, height: 34, color: rgb(0.04, 0.04, 0.04) });
  page2.drawImage(logo.pdfImg, { x: L2, y: 758 + (34 - logo.h) / 2, width: logo.w, height: logo.h });
  page2.drawText("Shoulder Testing — SOAP Note (Plain Text)", { x: L2 + 46, y: 769, size: 9, font, color: GRAY });
  const wrapLine = (text, fnt, size, maxW) => {
    const words = text.split(" "); const wrapped = []; let cur = "";
    for (const w of words) { const test = cur ? cur + " " + w : w; if (fnt.widthOfTextAtSize(test, size) <= maxW) { cur = test; } else { if (cur) wrapped.push(cur); cur = w; } }
    if (cur) wrapped.push(cur);
    return wrapped.length ? wrapped : [""];
  };
  const noteLines = noteText.split("\n");
  for (const rawLine of noteLines) {
    if (y2 < 48) break;
    if (rawLine === "") { y2 -= 7; continue; }
    const isHeader = rawLine === rawLine.toUpperCase() && rawLine.trim().length > 0 && !rawLine.includes(":") && rawLine.trim().length < 80;
    const isBullet = rawLine.startsWith("  ");
    if (isHeader) {
      y2 -= 4;
      page2.drawRectangle({ x: L2 - 4, y: y2 - 3, width: R2p - L2 + 8, height: 15, color: rgb(0.91, 0.91, 0.91) });
      page2.drawText(san(rawLine.trim()), { x: L2, y: y2, size: 8, font: fontBold, color: GRAY });
      y2 -= 18;
    } else {
      const fSize = 9;
      const xOffset = isBullet ? L2 + 10 : L2;
      const wrapped = wrapLine(san(rawLine.trim()), font, fSize, R2p - L2 - (isBullet ? 10 : 0));
      for (const wl of wrapped) { if (y2 < 48) break; page2.drawText(wl, { x: xOffset, y: y2, size: fSize, font, color: BLACK_R }); y2 -= 13; }
    }
  }
  page2.drawLine({ start: { x: L2, y: 48 }, end: { x: R2p, y: 48 }, thickness: 0.5, color: LGRAY });
  page2.drawText(san("TRM Documentation Copy  --  Plain text for EMR entry."), { x: L2, y: 36, size: 7, font, color: GRAY });
  const pdfBytes = await doc.save();
  const filename = `TRM_Shoulder_${new Date().toISOString().slice(0,10)}.pdf`;
  const blob = new Blob([pdfBytes], { type: "application/pdf" });

  // SHARE mode — native OS share sheet (AirDrop, Save to Files, etc.)
  if (mode === "share") {
    const shareFile = new File([blob], filename, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile], title: "TRM Shoulder Session PDF" });
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
    // Safari sometimes ignores <a download> on blob URLs — open new tab as fallback
    if (isSafari) {
      setTimeout(() => { window.open(url, "_blank"); }, 100);
      setTimeout(() => URL.revokeObjectURL(url), 90000);
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

    // Try Subject first, then Keywords fallback (some PDF viewers strip /Info on re-save)
    let encoded = null;
    const PREFIX = "TRM_SHOULDER_V1:";

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
        "This PDF does not contain TRM Shoulder session data. " +
        "Make sure you are uploading a PDF saved directly from the TRM app " +
        "(not a print-to-PDF, screenshot, or file re-saved by another viewer)."
      );
      return;
    }

    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const json = new TextDecoder("utf-8").decode(bytes);
    const sessionData = JSON.parse(json);
    onData(sessionData);
  } catch (e) {
    onError("Could not read session data from this PDF. The file may be corrupted or was re-saved by an external viewer which stripped the embedded data. (" + e.message + ")");
  }
}

const BLANK_DATA = {
  patient: { date: "", surgeon: "", surgeryType: "", weeksPostOp: "", involvedSide: "Left", sex: "Male", athleteCategory: "", armDominance: "" },
  bw: "", leverArm: "",
  flexionR: "", flexionL: "", abductionR: "", abductionL: "",
  erSideR: "", erSideL: "", irSideR: "", irSideL: "",
  er90R: "", er90L: "", ir90R: "", ir90L: "",
  horizAddR: "", horizAddL: "", abirR: "", abirL: "", aberR: "", aberL: "",
  scapUpRotR: "", scapUpRotL: "",
  elbowFlexR: "", elbowFlexL: "", elbowExtR: "", elbowExtL: "",
  pronationR: "", pronationL: "", supinationR: "", supinationL: "",
  erForceR: "", erForceL: "", irForceR: "", irForceL: "",
  scaptionForceR: "", scaptionForceL: "",
  grip9090R: "", grip9090L: "", gripFds3R: "", gripFds3L: "",
  ash: { isoIInvLoad: "", isoIUninvLoad: "", isoINotes: "", isoTInvLoad: "", isoTUninvLoad: "", isoTNotes: "", isoYInvLoad: "", isoYUninvLoad: "", isoYNotes: "", valdPlyoInvPeakForce: "", valdPlyoUninvPeakForce: "", valdPlyoInvTimePeak: "", valdPlyoUninvTimePeak: "", valdPlyoInvRFD: "", valdPlyoUninvRFD: "", valdPlyoNotes: "" },
  posteriorEndurance: { reps: "", repsUninv: "", timeInv: "", timeUninv: "", notes: "" },
  functional: {
    ckcuestReps: "", ckcuestReps2: "", ckcuestReps3: "",
    smbThrowInv: "", smbThrowUninv: "",
    ueYbalInvReach: "", ueYbalUninvReach: "", ueYbalInvLimbLength: "", ueYbalUninvLimbLength: "",
    ueYbalInvMedial: "", ueYbalUninvMedial: "", ueYbalInvInfLat: "", ueYbalUninvInfLat: "", ueYbalInvSupLat: "", ueYbalUninvSupLat: "",
    carryTest: "", singleArmCarry: "",
    shotPutR1: "", shotPutR2: "", shotPutR3: "", shotPutL1: "", shotPutL2: "", shotPutL3: "",
    shotPutInv: "", shotPutUninv: "", psetScore: "", psetNotes: "", totalArcBilateralNotes: "",
  },
  romWNL: false,
  dash: "", quickdash: "", ases: "", penn: "", wosi: "", psfs: "",
  impression: "",
  clinicalNotes: "", noteText: "",
};

const SECTION_GROUPS = [
  { id: "sec-patient",    label: "Patient",    short: "Patient",    cards: ["patient","bodymetrics"] },
  { id: "sec-rom",        label: "ROM",        short: "ROM",        cards: ["rom"] },
  { id: "sec-strength",   label: "Strength",   short: "Strength",   cards: ["strength","ash","posteriorEndurance"] },
  { id: "sec-functional", label: "Functional", short: "Functional", cards: ["functional"] },
  { id: "sec-note",       label: "SOAP Note",  short: "Note",       cards: ["notes"] },
];

// ── MOBILE SECTION NAV — maps section keys to on-page element IDs ──
const SECTION_NAV = [
  { key: "sec-patient",    label: "Patient",    ids: ["sec-patient",    "patient"] },
  { key: "sec-rom",        label: "ROM",        ids: ["sec-rom",        "rom"] },
  { key: "sec-strength",   label: "Strength",   ids: ["sec-strength",   "strength"] },
  { key: "sec-functional", label: "Functional", ids: ["sec-functional", "functional"] },
  { key: "sec-note",       label: "Note",       ids: ["sec-note",       "pros"] },
];

function sectionHasData(group, d) {
  const checks = {
    "sec-patient":    () => d.patient?.date || d.patient?.surgeryType || d.bw,
    "sec-rom":        () => d.flexionR || d.er90R || d.ir90R || d.abirR || d.elbowFlexR,
    "sec-strength":   () => d.erForceR || d.erForceL || d.grip9090R || (d.ash?.isoIInvLoad),
    "sec-functional": () => d.functional?.ckcuestReps || d.functional?.smbThrowInv || d.functional?.shotPutR1,
    "sec-note":       () => !!d.clinicalNotes,
  };
  return checks[group.id]?.() ? true : false;
}

function SectionAnchor({ id, label }) {
  return (
    <div id={id} style={{ scrollMarginTop: 120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 4 }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ fontSize: 9, fontWeight: 800, color: MUTED, letterSpacing: "0.16em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>
    </div>
  );
}

function Tab1({ data: d, setData: setD }) {
  const sd  = (k, v)  => setD(p => ({ ...p, [k]: v }));
  const setP = (k, v) => sd("patient", { ...d.patient, [k]: v });
  const setFunc = (k, v) => sd("functional", { ...d.functional, [k]: v });
  const setAsh = (k, v) => sd("ash", { ...d.ash, [k]: v });
  const setPE = (k, v) => sd("posteriorEndurance", { ...d.posteriorEndurance, [k]: v });

  const inv   = d.patient.involvedSide;
  const invR  = inv === "Right";
  const uninv = invR ? "Left" : "Right";
  const isContact = d.patient.athleteCategory === "contact";
  const isNonContact = d.patient.athleteCategory === "non-contact";
  const isDominant = d.patient.armDominance === "dominant";
  const sessionStarted = !!d.patient.armDominance;
  const erirTarget = isDominant ? 75 : 66;
  const [activeCard, setActiveCard] = useState("patient");
  const [noteCopied, setNoteCopied] = useState(false);
  const [elbowOpen, setElbowOpen] = useState(false);

  // ── Mobile section nav ──
  const [isMobile, setIsMobile]           = useState(() => window.innerWidth < 700);
  const [activeSection, setActiveSection]  = useState(SECTION_NAV[0].key);
  const navLockRef = useRef(null); // set during a tap-driven scroll to mute the observer

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const visible = new Set();
    const update = () => {
      if (navLockRef.current) return; // a tap is driving the scroll — don't override it
      for (const sec of SECTION_NAV) {
        if (sec.ids.some(id => visible.has(id))) { setActiveSection(sec.key); return; }
      }
    };
    const observers = [];
    SECTION_NAV.flatMap(s => s.ids).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => e.isIntersecting ? visible.add(id) : visible.delete(id));
        update();
      }, { threshold: 0.2 });
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [isMobile]);

  const scrollTo = (ids) => {
    const el = document.getElementById(ids[0]);
    if (!el) return;
    if (navLockRef.current) clearTimeout(navLockRef.current);
    navLockRef.current = setTimeout(() => { navLockRef.current = null; }, 700);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToSection = (secId) => {
    setActiveSection(secId);
    const sec = SECTION_NAV.find(s => s.key === secId);
    scrollTo(sec ? sec.ids : [secId]);
  };

  const erRnm   = calcTorqueNm(d.erForceR, d.leverArm);
  const erLnm   = calcTorqueNm(d.erForceL, d.leverArm);
  const irRnm   = calcTorqueNm(d.irForceR, d.leverArm);
  const irLnm   = calcTorqueNm(d.irForceL, d.leverArm);
  const erRnorm = calcNorm(erRnm, d.bw);
  const erLnorm = calcNorm(erLnm, d.bw);
  const irRnorm = calcNorm(irRnm, d.bw);
  const irLnorm = calcNorm(irLnm, d.bw);
  const erLSI   = invR ? calcLSI(erRnorm, erLnorm) : calcLSI(erLnorm, erRnorm);
  const irLSI   = invR ? calcLSI(irRnorm, irLnorm) : calcLSI(irLnorm, irRnorm);

  const bwNum = toNum(d.bw);
  const bwOk = hasVal(d.bw) && bwNum > 0;
  const bwRat = (force) => (hasVal(force) && bwOk) ? ((toNum(force)/bwNum)*100).toFixed(1) : null;

  const erDomForce    = isDominant ? (invR ? d.erForceR   : d.erForceL)   : (invR ? d.erForceL   : d.erForceR);
  const erNonDomForce = isDominant ? (invR ? d.erForceL   : d.erForceR)   : (invR ? d.erForceR   : d.erForceL);
  const irDomForce    = isDominant ? (invR ? d.irForceR   : d.irForceL)   : (invR ? d.irForceL   : d.irForceR);
  const irNonDomForce = isDominant ? (invR ? d.irForceL   : d.irForceR)   : (invR ? d.irForceR   : d.irForceL);
  const scDomForce    = isDominant ? (invR ? d.scaptionForceR : d.scaptionForceL) : (invR ? d.scaptionForceL : d.scaptionForceR);
  const scNonDomForce = isDominant ? (invR ? d.scaptionForceL : d.scaptionForceR) : (invR ? d.scaptionForceR : d.scaptionForceL);

  const erDomBW    = bwRat(erDomForce);
  const erNonDomBW = bwRat(erNonDomForce);
  const irDomBW    = bwRat(irDomForce);
  const scDomBW    = bwRat(scDomForce);

  const erirDomNm    = isDominant ? (invR ? erRnm : erLnm) : (invR ? erLnm : erRnm);
  const irirDomNm    = isDominant ? (invR ? irRnm : irLnm) : (invR ? irLnm : irRnm);
  const erirNonDomNm = isDominant ? (invR ? erLnm : erRnm) : (invR ? erRnm : erLnm);
  const irirNonDomNm = isDominant ? (invR ? irLnm : irRnm) : (invR ? irRnm : irLnm);
  const erirDom    = calcERIR(erirDomNm, irirDomNm);
  const erirNonDom = calcERIR(erirNonDomNm, irirNonDomNm);

  const domBenchColor = (val, lo, hi) => { if (!hasVal(val)) return MUTED; const n = parseFloat(val); if (n >= lo && n <= hi) return LIME; if (n > hi) return GOLD; return RED_BAD; };
  const domBenchColorMin = (val, target) => { if (!hasVal(val)) return MUTED; return parseFloat(val) >= target ? LIME : RED_BAD; };
  const domBenchLabel = (val, lo, hi, unit="") => { if (!hasVal(val)) return ""; const n = parseFloat(val); if (n >= lo && n <= hi) return `✓ In range (${lo}–${hi}${unit})`; if (n > hi) return `Above range (target ${lo}–${hi}${unit})`; return `Below range (target ${lo}–${hi}${unit})`; };
  const domBenchLabelMin = (val, target, unit="") => { if (!hasVal(val)) return ""; return parseFloat(val) >= target ? `✓ Meets ≥${target}${unit}` : `Below target (≥${target}${unit})`; };

  const nonDomLSI = (nonDom, dom) => { if (!hasVal(nonDom) || !hasVal(dom) || toNum(dom) === 0) return null; return ((toNum(nonDom)/toNum(dom))*100).toFixed(1); };
  const erNonDomLSI  = nonDomLSI(erNonDomForce, erDomForce);
  const irNonDomLSI  = nonDomLSI(irNonDomForce, irDomForce);
  const scNonDomLSI  = nonDomLSI(scNonDomForce, scDomForce);
  const nonDomLSIColor = (v) => { if (!hasVal(v)) return MUTED; return parseFloat(v) >= 90 ? LIME : parseFloat(v) >= 80 ? GOLD : RED_BAD; };
  const nonDomLSILabel = (v) => { if (!hasVal(v)) return ""; return parseFloat(v) >= 90 ? "✓ ≥90% of dominant" : parseFloat(v) >= 80 ? "Approaching 90%" : "Below 90% of dominant"; };

  const strLsiThreshold = isDominant ? 110 : 90;
  const strLsiColor = (v) => { const n = parseFloat(v); if (isNaN(n)) return MUTED; if (n >= strLsiThreshold) return LIME; if (n >= strLsiThreshold - 10) return GOLD; return RED_BAD; };
  const strLsiLabel = (v) => { if (!hasVal(v)) return ""; const n = parseFloat(v); if (n >= strLsiThreshold) return `✓ Meets ≥${strLsiThreshold}% threshold`; if (n >= strLsiThreshold - 10) return `Approaching (≥${strLsiThreshold}%)`; return `Below threshold (<${strLsiThreshold}%)`; };

  const avgTrials = (...vals) => { const ns = vals.map(v => parseFloat(v)).filter(v => !isNaN(v)); return ns.length ? (ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1) : null; };
  const grip9090InvAvg   = invR ? d.grip9090R : d.grip9090L;
  const grip9090UninvAvg = invR ? d.grip9090L : d.grip9090R;
  const gripFds3InvAvg   = invR ? d.gripFds3R : d.gripFds3L;
  const gripFds3UninvAvg = invR ? d.gripFds3L : d.gripFds3R;
  const grip9090LSI = calcLSI(grip9090InvAvg, grip9090UninvAvg);
  const gripFds3LSI = calcLSI(gripFds3InvAvg, gripFds3UninvAvg);

  const ash = d.ash || {};
  const ashIsoILSI = calcLSI(ash.isoIInvLoad, ash.isoIUninvLoad);
  const ashIsoTLSI = calcLSI(ash.isoTInvLoad, ash.isoTUninvLoad);
  const ashIsoYLSI = calcLSI(ash.isoYInvLoad, ash.isoYUninvLoad);

  const romInvFlex   = invR ? d.flexionR   : d.flexionL;
  const romUninvFlex = invR ? d.flexionL   : d.flexionR;
  const romInvAbd    = invR ? d.abductionR : d.abductionL;
  const romUninvAbd  = invR ? d.abductionL : d.abductionR;
  const romInvER90   = invR ? d.er90R : d.er90L;
  const romUninvER90 = invR ? d.er90L : d.er90R;
  const romInvIR90   = invR ? d.ir90R : d.ir90L;
  const romUninvIR90 = invR ? d.ir90L : d.ir90R;
  const totalArcInv   = (hasVal(romInvER90) && hasVal(romInvIR90)) ? (toNum(romInvER90) + toNum(romInvIR90)).toFixed(0) : null;
  const totalArcUninv = (hasVal(romUninvER90) && hasVal(romUninvIR90)) ? (toNum(romUninvER90) + toNum(romUninvIR90)).toFixed(0) : null;
  const girdDiff = (hasVal(romInvER90) && hasVal(romInvIR90) && hasVal(romUninvER90) && hasVal(romUninvIR90)) ? (toNum(totalArcInv) - toNum(totalArcUninv)).toFixed(0) : null;
  const horizAddInv   = invR ? d.horizAddR : d.horizAddL;
  const horizAddUninv = invR ? d.horizAddL : d.horizAddR;
  const posteriorCapDiff = calcDiff(horizAddUninv, horizAddInv);

  const func = d.functional || {};
  const smbLSI = calcLSI(func.smbThrowInv, func.smbThrowUninv);
  const ckcClass = hasVal(func.ckcuestReps) ?
    (parseFloat(func.ckcuestReps) >= 21 ? { label: "Meets Benchmark (≥21)", color: LIME } :
     parseFloat(func.ckcuestReps) >= 17 ? { label: "Borderline", color: GOLD } :
     { label: "Below Benchmark", color: RED_BAD }) : null;

  const calcUEYbalComposite = (medial, infLat, supLat, limbLength) => {
    if (!hasVal(medial) || !hasVal(infLat) || !hasVal(supLat) || !hasVal(limbLength) || toNum(limbLength) === 0) return null;
    return (((toNum(medial) + toNum(infLat) + toNum(supLat)) / (3 * toNum(limbLength))) * 100).toFixed(1);
  };
  const ueYbalInvComp   = calcUEYbalComposite(func.ueYbalInvMedial, func.ueYbalInvInfLat, func.ueYbalInvSupLat, func.ueYbalInvLimbLength);
  const ueYbalUninvComp = calcUEYbalComposite(func.ueYbalUninvMedial, func.ueYbalUninvInfLat, func.ueYbalUninvSupLat, func.ueYbalUninvLimbLength);
  const ueYbalAsymmetry = (hasVal(ueYbalInvComp) && hasVal(ueYbalUninvComp)) ? Math.abs(toNum(ueYbalInvComp) - toNum(ueYbalUninvComp)).toFixed(1) : null;
  const ueYbalPassFail = (comp) => {
    if (!hasVal(comp)) return null;
    return parseFloat(comp) >= 90 ? { label: "✓ Meets ≥90% threshold", color: LIME } : parseFloat(comp) >= 80 ? { label: "Approaching threshold", color: GOLD } : { label: "Below threshold (<90%)", color: RED_BAD };
  };

  const valdForceAsym = calcLSI(ash.valdPlyoInvPeakForce, ash.valdPlyoUninvPeakForce);
  const valdTimeAsym  = calcLSI(ash.valdPlyoInvTimePeak, ash.valdPlyoUninvTimePeak);
  const valdRFDAsym   = calcLSI(ash.valdPlyoInvRFD, ash.valdPlyoUninvRFD);
  const peLSI = calcLSI((d.posteriorEndurance || {}).timeInv, (d.posteriorEndurance || {}).timeUninv);

  const shotPutAvgR = avgTrials(func.shotPutR1, func.shotPutR2, func.shotPutR3);
  const shotPutAvgL = avgTrials(func.shotPutL1, func.shotPutL2, func.shotPutL3);
  const shotPutInvAvg   = invR ? shotPutAvgR : shotPutAvgL;
  const shotPutUninvAvg = invR ? shotPutAvgL : shotPutAvgR;
  const shotPutInvFinal   = shotPutInvAvg   || func.shotPutInv   || "";
  const shotPutUninvFinal = shotPutUninvAvg || func.shotPutUninv || "";
  const shotPutLSI = calcLSI(shotPutInvFinal, shotPutUninvFinal);
  const shotPutTarget = isDominant ? 110 : 90;
  const shotPutStatus = (lsi) => {
    if (!hasVal(lsi)) return null;
    const n = parseFloat(lsi);
    return n >= shotPutTarget ? { label: `✓ Meets ≥${shotPutTarget}% target`, color: LIME } : n >= shotPutTarget - 10 ? { label: `Approaching target (${shotPutTarget}%)`, color: GOLD } : { label: `Below target (<${shotPutTarget}%)`, color: RED_BAD };
  };

  const totalArcDiff = (hasVal(totalArcInv) && hasVal(totalArcUninv)) ? Math.abs(toNum(totalArcInv) - toNum(totalArcUninv)).toFixed(0) : null;
  const totalArcPassFail = totalArcDiff !== null ? (parseFloat(totalArcDiff) <= 5 ? { label: "✓ Within ±5° bilateral symmetry", color: LIME } : parseFloat(totalArcDiff) <= 10 ? { label: "Borderline (6–10° difference)", color: GOLD } : { label: `⚠ Exceeds ±5° threshold (${totalArcDiff}°)`, color: RED_BAD }) : null;

  const generateNote = () => sd("noteText", buildShoulderNote(d));
  const copyNote = () => {
    navigator.clipboard.writeText(d.noteText).then(() => { setNoteCopied(true); setTimeout(() => setNoteCopied(false), 2500); });
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
        <div className="trm-sidenav">
          <div style={{ background: "#141414", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", padding: "6px 0" }}>
            {SECTION_GROUPS.map((g, i) => {
              const active = activeSection === g.id;
              const filled = sectionHasData(g, d);
              return (
                <button key={g.id} onClick={() => scrollToSection(g.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: active ? LIME+"14" : "transparent", border: "none", borderLeft: `3px solid ${active ? LIME : "transparent"}`, cursor: "pointer", textAlign: "left", borderBottom: i < SECTION_GROUPS.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: active ? 800 : 600, color: active ? LIME : "#888", letterSpacing: "0.07em", textTransform: "uppercase" }}>{g.label}</span>
                  {filled && <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? LIME : LIME_DIM, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="trm-content" style={{ flex: 1, minWidth: 0 }}>
          <SectionAnchor id="sec-patient" label="Patient" />
          <Card title="Patient Information" accent id="patient" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <R3>
              <Field label="Date of Testing" type="text" value={d.patient.date} onChange={v => setP("date", v)} placeholder="MM/DD/YYYY" step={null} />
              <Field label="Weeks Post-Op" unit="wks" value={d.patient.weeksPostOp} onChange={v => setP("weeksPostOp", v)} step="1" />
              <Field label="Surgery Type" type="text" value={d.patient.surgeryType} onChange={v => setP("surgeryType", v)} placeholder="e.g. Bankart, RCR, SLAP" step={null} />
            </R3>
            <R2>
              <Field label="Surgeon" type="text" value={d.patient.surgeon} onChange={v => setP("surgeon", v)} placeholder="Surgeon last name" step={null} />
              <div>
                <label style={lbl}>Biological Sex</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Male", "Female"].map(s => (
                    <button key={s} onClick={() => setP("sex", s)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", background: d.patient.sex === s ? LIME : "transparent", border: `2px solid ${d.patient.sex === s ? LIME : BORDER}`, color: d.patient.sex === s ? BLACK : MUTED }}>{s}</button>
                  ))}
                </div>
              </div>
            </R2>
            <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, border: `1px solid ${LIME}33`, background: LIME+"08" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: LIME, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Testing Profile</div>
              <R2 mb={0}>
                <div>
                  <label style={lbl}>Athlete Category</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ v: "non-contact", label: "Non-Contact" }, { v: "contact", label: "Contact" }].map(opt => (
                      <button key={opt.v} onClick={() => setP("athleteCategory", d.patient.athleteCategory === opt.v ? "" : opt.v)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", background: d.patient.athleteCategory === opt.v ? LIME : "transparent", border: `2px solid ${d.patient.athleteCategory === opt.v ? LIME : BORDER}`, color: d.patient.athleteCategory === opt.v ? BLACK : MUTED }}>{opt.label}</button>
                    ))}
                  </div>
                  {d.patient.athleteCategory && (<div style={{ marginTop: 6, fontSize: 10, color: LIME+"aa" }}>{d.patient.athleteCategory === "contact" ? "Includes: instability battery, multi-directional laxity, contact RTS criteria" : "Includes: overhead battery, scapular motor control, non-contact RTS criteria"}</div>)}
                </div>
                <div>
                  <label style={lbl}>Involved Arm Dominance</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ v: "dominant", label: "Dominant" }, { v: "non-dominant", label: "Non-Dom" }].map(opt => (
                      <button key={opt.v} onClick={() => setP("armDominance", d.patient.armDominance === opt.v ? "" : opt.v)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer", background: d.patient.armDominance === opt.v ? GOLD : "transparent", border: `2px solid ${d.patient.armDominance === opt.v ? GOLD : BORDER}`, color: d.patient.armDominance === opt.v ? BLACK : MUTED }}>{opt.label}</button>
                    ))}
                  </div>
                  {d.patient.armDominance && (<div style={{ marginTop: 6, fontSize: 10, color: GOLD+"aa" }}>{d.patient.armDominance === "dominant" ? "Dominant arm: ER:IR ratio target ≥75% for throwers" : "Non-dominant: standard ER:IR target ≥66%"}</div>)}
                </div>
              </R2>
            </div>
          </Card>

          <Card title="Body Metrics" id="bodymetrics" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <R2>
              <Field label="Body Weight" unit="lbs" value={d.bw} onChange={v => sd("bw", v)} fieldKey="bw" />
              <Field label="HHD Lever Arm" unit="cm" value={d.leverArm} onChange={v => sd("leverArm", v)} placeholder="distal cuff to pad" fieldKey="leverArm" />
            </R2>
            <div style={{ fontSize: 11, color: MUTED }}>Lever arm used for torque normalization (ER and IR both sides). Measure from distal forearm cuff to HHD pad contact point.</div>
          </Card>

          <SectionAnchor id="sec-rom" label="Range of Motion" />
          <Card title="Shoulder Range of Motion" id="rom" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8, marginBottom: 6, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Measurement (°)</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#6b9fff", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>Right</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#6b9fff", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>Left</div>
            </div>
            {[
              { label: "Flexion",          rKey: "flexionR",   lKey: "flexionL"   },
              { label: "Abduction",        rKey: "abductionR", lKey: "abductionL" },
              { label: "ER at 0°",         rKey: "erSideR",    lKey: "erSideL"    },
              { label: "IR at 0°",         rKey: "irSideR",    lKey: "irSideL"    },
              { label: "ER at 90°",        rKey: "er90R",      lKey: "er90L"      },
              { label: "IR at 90°",        rKey: "ir90R",      lKey: "ir90L"      },
              { label: "Horiz Adduction",  rKey: "horizAddR",  lKey: "horizAddL"  },
              { label: "ABIR",             rKey: "abirR",      lKey: "abirL"      },
              { label: "ABER",             rKey: "aberR",      lKey: "aberL"      },
              { label: "Scap Upward Rot",  rKey: "scapUpRotR", lKey: "scapUpRotL" },
            ].map(({ label, rKey, lKey }) => (
              <div key={rKey} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8, marginBottom: 4, alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa" }}>{label}</div>
                <input style={{ ...inp, fontSize: 12, padding: "6px 8px", textAlign: "center" }} type="number" placeholder="—" value={d[rKey] || ""} onChange={e => sd(rKey, e.target.value)} />
                <input style={{ ...inp, fontSize: 12, padding: "6px 8px", textAlign: "center" }} type="number" placeholder="—" value={d[lKey] || ""} onChange={e => sd(lKey, e.target.value)} />
              </div>
            ))}

            {(hasVal(romInvFlex) || hasVal(romInvAbd) || hasVal(totalArcInv) || hasVal(horizAddInv) || (hasVal(d.scapUpRotR) && hasVal(d.scapUpRotL))) && (
              <div style={{ marginTop: 10 }}>
                <StatBar stats={[
                  ...(calcDiff(romInvFlex, romUninvFlex) !== null ? [{ label: `Flex Deficit`, value: calcDiff(romInvFlex, romUninvFlex) + "°", color: (() => { const v = parseFloat(calcDiff(romInvFlex, romUninvFlex)); return isNaN(v) ? MUTED : v >= -10 ? LIME : v >= -20 ? GOLD : RED_BAD; })() }] : []),
                  ...(calcDiff(romInvAbd, romUninvAbd) !== null ? [{ label: `Abd Deficit`, value: calcDiff(romInvAbd, romUninvAbd) + "°", color: (() => { const v = parseFloat(calcDiff(romInvAbd, romUninvAbd)); return isNaN(v) ? MUTED : v >= -10 ? LIME : v >= -20 ? GOLD : RED_BAD; })() }] : []),
                  ...(totalArcInv ? [{ label: `Total Arc ${inv}`, value: totalArcInv + "°", color: parseFloat(totalArcInv) >= 150 ? LIME : parseFloat(totalArcInv) >= 120 ? GOLD : RED_BAD }] : []),
                  ...(totalArcUninv ? [{ label: `Total Arc ${uninv}`, value: totalArcUninv + "°", color: WHITE }] : []),
                  ...(girdDiff !== null ? [{ label: "GIRD", value: girdDiff + "°", color: parseFloat(girdDiff) >= -18 ? LIME : RED_BAD }] : []),
                  ...(posteriorCapDiff !== null ? [{ label: "Post Cap Deficit", value: Math.abs(parseFloat(posteriorCapDiff)).toFixed(1) + "°", color: Math.abs(parseFloat(posteriorCapDiff)) <= 18 ? LIME : RED_BAD }] : []),
                  ...((hasVal(d.scapUpRotR) && hasVal(d.scapUpRotL)) ? [{ label: "Scap UR Diff", value: Math.abs(toNum(d.scapUpRotR) - toNum(d.scapUpRotL)).toFixed(1) + "°", color: Math.abs(toNum(d.scapUpRotR) - toNum(d.scapUpRotL)) <= 5 ? LIME : Math.abs(toNum(d.scapUpRotR) - toNum(d.scapUpRotL)) <= 10 ? GOLD : RED_BAD }] : []),
                ]} />
              </div>
            )}

            <div style={{ marginTop: 14, borderRadius: 8, overflow: "hidden", border: `1px solid ${elbowOpen ? LIME+"33" : BORDER}` }}>
              <button onClick={() => setElbowOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", background: elbowOpen ? LIME+"0a" : "#131313", border: "none", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: elbowOpen ? LIME : "#888", letterSpacing: "0.12em", textTransform: "uppercase" }}>Elbow & Forearm ROM</span>
                  {(hasVal(d.elbowFlexR) || hasVal(d.pronationR)) && (<div style={{ width: 6, height: 6, borderRadius: "50%", background: LIME }} />)}
                </div>
                <span style={{ fontSize: 12, color: elbowOpen ? LIME : MUTED, display: "inline-block", transform: elbowOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
              </button>
              {elbowOpen && (
                <div style={{ padding: "12px 14px", background: "#0f0f0f", borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Measurement (°)</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#6b9fff", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>Right</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#6b9fff", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>Left</div>
                  </div>
                  {[
                    { label: "Elbow Flexion",   rKey: "elbowFlexR", lKey: "elbowFlexL" },
                    { label: "Elbow Extension", rKey: "elbowExtR",  lKey: "elbowExtL"  },
                    { label: "Pronation",       rKey: "pronationR", lKey: "pronationL" },
                    { label: "Supination",      rKey: "supinationR",lKey: "supinationL"},
                  ].map(({ label, rKey, lKey }) => (
                    <div key={rKey} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8, marginBottom: 4, alignItems: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa" }}>{label}</div>
                      <input style={{ ...inp, fontSize: 12, padding: "6px 8px", textAlign: "center" }} type="number" placeholder="—" value={d[rKey] || ""} onChange={e => sd(rKey, e.target.value)} />
                      <input style={{ ...inp, fontSize: 12, padding: "6px 8px", textAlign: "center" }} type="number" placeholder="—" value={d[lKey] || ""} onChange={e => sd(lKey, e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <SectionAnchor id="sec-strength" label="Strength & ASH" />
          <Card title="Rotator Cuff Strength — Isometric HHD" id="strength" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
              Enter break-test force (lbs) at 90° abduction. Torque = Force × 4.44822 × Lever Arm (m). Normalized = Nm / body mass (kg). ER:IR ratio benchmark: ≥{erirTarget}%{isDominant ? " (dominant arm — throwing athlete target)" : ""}.
            </div>

            {/* External Rotation */}
            <div style={{ marginBottom: 20, background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 10 }}>External Rotation</div>
              <R2 mb={10} persist>
                <Field label="ER — Right" unit="lbs" value={d.erForceR} onChange={v => sd("erForceR", v)} fieldKey="erForceR" />
                <Field label="ER — Left"  unit="lbs" value={d.erForceL} onChange={v => sd("erForceL", v)} fieldKey="erForceL" />
              </R2>
              {hasVal(erDomForce) && bwOk && (
                <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Dominant Arm Benchmarks</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ ...calcBox, color: domBenchColor(erDomBW, 12, 15) }}>
                      {erDomBW}% BW
                      <div style={{ fontSize: 9, marginTop: 2, opacity: 0.8 }}>{domBenchLabel(erDomBW, 12, 15, "%")}</div>
                    </div>
                    {erirDom && (<div style={{ ...calcBox, color: domBenchColor(erirDom, 65, 70) }}>ER:IR {erirDom}%<div style={{ fontSize: 9, marginTop: 2, opacity: 0.8 }}>{domBenchLabel(erirDom, 65, 70, "%")}</div></div>)}
                  </div>
                </div>
              )}
              {hasVal(erNonDomForce) && hasVal(erDomForce) && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Non-Dominant vs Dominant (90% Target)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: nonDomLSIColor(erNonDomLSI) }}>{erNonDomLSI}%</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: nonDomLSIColor(erNonDomLSI) }}>{nonDomLSILabel(erNonDomLSI)}</span>
                  </div>
                </div>
              )}
              {erLSI && (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${strLsiColor(erLSI)}44` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>RTS Strength LSI — Involved vs Uninvolved (Target: ≥{strLsiThreshold}%)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: strLsiColor(erLSI) }}>{erLSI}%</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: strLsiColor(erLSI) }}>{strLsiLabel(erLSI)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Internal Rotation */}
            <div style={{ marginBottom: 20, background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 10 }}>Internal Rotation</div>
              <R2 mb={10} persist>
                <Field label="IR — Right" unit="lbs" value={d.irForceR} onChange={v => sd("irForceR", v)} fieldKey="irForceR" />
                <Field label="IR — Left"  unit="lbs" value={d.irForceL} onChange={v => sd("irForceL", v)} fieldKey="irForceL" />
              </R2>
              {hasVal(irDomForce) && bwOk && (
                <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Dominant Arm Benchmarks</div>
                  <div style={{ ...calcBox, width: "fit-content", color: domBenchColorMin(irDomBW, 25) }}>{irDomBW}% BW<div style={{ fontSize: 9, marginTop: 2, opacity: 0.8 }}>{domBenchLabelMin(irDomBW, 25, "%")}</div></div>
                </div>
              )}
              {hasVal(irNonDomForce) && hasVal(irDomForce) && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Non-Dominant vs Dominant (90% Target)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: nonDomLSIColor(irNonDomLSI) }}>{irNonDomLSI}%</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: nonDomLSIColor(irNonDomLSI) }}>{nonDomLSILabel(irNonDomLSI)}</span>
                  </div>
                </div>
              )}
              {irLSI && (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${strLsiColor(irLSI)}44` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>RTS Strength LSI — Involved vs Uninvolved (Target: ≥{strLsiThreshold}%)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: strLsiColor(irLSI) }}>{irLSI}%</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: strLsiColor(irLSI) }}>{strLsiLabel(irLSI)}</span>
                  </div>
                </div>
              )}
            </div>

            <StatBar stats={[
              { label: "ER:IR — Dominant",     value: erirDom    ? erirDom    + "%" : null, color: domBenchColor(erirDom, 65, 70) },
              { label: "ER:IR — Non-Dominant", value: erirNonDom ? erirNonDom + "%" : null, color: domBenchColor(erirNonDom, 65, 70) },
              { label: "ER %BW — Dom", value: erDomBW ? erDomBW + "%" : null, color: domBenchColor(erDomBW, 12, 15) },
              { label: "IR %BW — Dom", value: irDomBW ? irDomBW + "%" : null, color: domBenchColorMin(irDomBW, 25) },
            ]} />

            {/* Scaption */}
            <div style={{ marginTop: 20, background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 6 }}>Scaption (Scapular Plane Elevation)</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>Break-test at 90° elevation, scapular plane. Dom target: 15–20% BW. Non-dom: ≥90% of dom raw (lbs).</div>
              <R2 mb={10} persist>
                <Field label="Scaption — Right" unit="lbs" value={d.scaptionForceR} onChange={v => sd("scaptionForceR", v)} fieldKey="scaptionForceR" />
                <Field label="Scaption — Left"  unit="lbs" value={d.scaptionForceL} onChange={v => sd("scaptionForceL", v)} fieldKey="scaptionForceL" />
              </R2>
              {hasVal(scDomForce) && bwOk && (
                <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Dominant Arm Benchmarks</div>
                  <div style={{ ...calcBox, width: "fit-content", color: domBenchColor(scDomBW, 15, 20) }}>{scDomBW}% BW<div style={{ fontSize: 9, marginTop: 2, opacity: 0.8 }}>{domBenchLabel(scDomBW, 15, 20, "%")}</div></div>
                </div>
              )}
              {hasVal(scNonDomForce) && hasVal(scDomForce) && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Non-Dominant vs Dominant (90% Target)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: nonDomLSIColor(scNonDomLSI) }}>{scNonDomLSI}%</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: nonDomLSIColor(scNonDomLSI) }}>{nonDomLSILabel(scNonDomLSI)}</span>
                  </div>
                </div>
              )}
              {(() => { const scLSI = calcLSI(invR ? d.scaptionForceR : d.scaptionForceL, invR ? d.scaptionForceL : d.scaptionForceR); return scLSI ? (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${strLsiColor(scLSI)}44` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>RTS Strength LSI — Involved vs Uninvolved (Target: ≥{strLsiThreshold}%)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: strLsiColor(scLSI) }}>{scLSI}%</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: strLsiColor(scLSI) }}>{strLsiLabel(scLSI)}</span>
                  </div>
                </div>
              ) : null; })()}
            </div>

            {/* Grip */}
            <div style={{ marginTop: 16, background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 4 }}>Grip Strength (Dynamometer)</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>Single trial per side, two positions. LSI ≥90% target.</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Position 1 — 90/90 (Shoulder & Elbow at 90°)</div>
                <R2 mb={8} persist>
                  <Field label={`${inv} (Involved)`}   unit="lbs" value={invR ? d.grip9090R : d.grip9090L} onChange={v => sd(invR ? "grip9090R" : "grip9090L", v)} fieldKey={invR ? "grip9090R" : "grip9090L"} />
                  <Field label={`${uninv} (Uninvolved)`} unit="lbs" value={invR ? d.grip9090L : d.grip9090R} onChange={v => sd(invR ? "grip9090L" : "grip9090R", v)} fieldKey={invR ? "grip9090L" : "grip9090R"} />
                </R2>
                {grip9090LSI && (<div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>90/90 LSI</span><span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: lsiColor(grip9090LSI) }}>{grip9090LSI}%</span><span style={{ fontSize: 11, fontWeight: 700, color: lsiColor(grip9090LSI) }}>{parseFloat(grip9090LSI) >= 90 ? "✓ Meets 90% threshold" : parseFloat(grip9090LSI) >= 80 ? "Approaching threshold" : "Below threshold"}</span></div>)}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Position 2 — FDS Position 3</div>
                <R2 mb={8} persist>
                  <Field label={`${inv} (Involved)`}   unit="lbs" value={invR ? d.gripFds3R : d.gripFds3L} onChange={v => sd(invR ? "gripFds3R" : "gripFds3L", v)} fieldKey={invR ? "gripFds3R" : "gripFds3L"} />
                  <Field label={`${uninv} (Uninvolved)`} unit="lbs" value={invR ? d.gripFds3L : d.gripFds3R} onChange={v => sd(invR ? "gripFds3L" : "gripFds3R", v)} fieldKey={invR ? "gripFds3L" : "gripFds3R"} />
                </R2>
                {gripFds3LSI && (<div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>FDS-3 LSI</span><span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: lsiColor(gripFds3LSI) }}>{gripFds3LSI}%</span><span style={{ fontSize: 11, fontWeight: 700, color: lsiColor(gripFds3LSI) }}>{parseFloat(gripFds3LSI) >= 90 ? "✓ Meets 90% threshold" : parseFloat(gripFds3LSI) >= 80 ? "Approaching threshold" : "Below threshold"}</span></div>)}
              </div>
            </div>
          </Card>

          {/* ASH Test + VALD */}
          <Card title="ASH Test & VALD ForceDecks — Plyo Push Up" id="ash" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>Active Shoulder Harness (ASH) Test: isometric load measured bilaterally in three positions. Record force (lbs) for involved and uninvolved sides. LSI auto-calculated. Goal: ≥90% LSI each position.</div>
            {[
              { posKey: "isoI", label: "ISO I — Arm at Side (0° Abduction)", desc: "Isometric hold, arm adducted, elbow 90° — tests IR/ER at neutral" },
              { posKey: "isoT", label: "ISO T — 90° Abduction / Horizontal",  desc: "Arm abducted to 90°, horizontal plane — tests posterior cuff" },
              { posKey: "isoY", label: "ISO Y — Full Elevation / Y Position", desc: "Arm in full elevation / scapular plane — tests overhead stability" },
            ].map(({ posKey, label, desc }) => {
              const invLoad = ash[`${posKey}InvLoad`] || "";
              const uninvLoad = ash[`${posKey}UninvLoad`] || "";
              const posNotes = ash[`${posKey}Notes`] || "";
              const posLSI = posKey === "isoI" ? ashIsoILSI : posKey === "isoT" ? ashIsoTLSI : ashIsoYLSI;
              return (
                <div key={posKey} style={{ marginBottom: 18, background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: WHITE }}>{label}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{desc}</div>
                  </div>
                  <R3 mb={8}>
                    <Field label={`${inv} (Involved)`}   unit="lbs" value={invLoad}   onChange={v => setAsh(`${posKey}InvLoad`, v)} />
                    <Field label={`${uninv} (Uninvolved)`} unit="lbs" value={uninvLoad} onChange={v => setAsh(`${posKey}UninvLoad`, v)} />
                    <div><label style={lbl}>Notes</label><input style={inp} type="text" placeholder="e.g. pain, apprehension" value={posNotes} onChange={e => setAsh(`${posKey}Notes`, e.target.value)} /></div>
                  </R3>
                  {posLSI && (<div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>LSI</span><span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: lsiColor(posLSI) }}>{posLSI}%</span><span style={{ fontSize: 11, fontWeight: 700, color: lsiColor(posLSI) }}>{parseFloat(posLSI) >= 90 ? "✓ ≥90% threshold" : parseFloat(posLSI) >= 80 ? "Approaching" : "Below threshold"}</span></div>)}
                </div>
              );
            })}

            {/* VALD ForceDecks — Plyo Push Up */}
            <div style={{ marginTop: 4, background: "#0d1a22", borderRadius: 10, border: `1px solid ${BLUE}33`, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 4 }}>VALD ForceDecks — Plyo Push Up</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
                Bilateral plyometric push-up. Peak force LSI: dominant ≥110%, non-dominant ≥90%. Time to peak force: &lt;10% asymmetry.
                {isDominant
                  ? <span style={{ color: GOLD, fontWeight: 700 }}> Dominant arm — target peak force LSI ≥110%.</span>
                  : <span style={{ color: LIME, fontWeight: 700 }}> Non-dominant arm — target peak force LSI ≥90%.</span>}
              </div>

              <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Peak Force</div>
              <R2 mb={10} persist>
                <Field label={`${inv} Peak Force`}   unit="N" value={ash.valdPlyoInvPeakForce || ""}   onChange={v => setAsh("valdPlyoInvPeakForce", v)} />
                <Field label={`${uninv} Peak Force`} unit="N" value={ash.valdPlyoUninvPeakForce || ""} onChange={v => setAsh("valdPlyoUninvPeakForce", v)} />
              </R2>
              {valdForceAsym && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${strLsiColor(valdForceAsym)}44` }}>
                  <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Peak Force LSI</span>
                  <span style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: strLsiColor(valdForceAsym) }}>{valdForceAsym}%</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: strLsiColor(valdForceAsym) }}>{strLsiLabel(valdForceAsym)}</span>
                  <span style={{ fontSize: 10, color: MUTED, marginLeft: "auto" }}>Target: ≥{strLsiThreshold}%</span>
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Time to Peak Force</div>
              <R2 mb={10} persist>
                <Field label={`${inv} Time to Peak`}   unit="ms" value={ash.valdPlyoInvTimePeak || ""}   onChange={v => setAsh("valdPlyoInvTimePeak", v)} />
                <Field label={`${uninv} Time to Peak`} unit="ms" value={ash.valdPlyoUninvTimePeak || ""} onChange={v => setAsh("valdPlyoUninvTimePeak", v)} />
              </R2>
              {valdTimeAsym && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${lsiColor(valdTimeAsym)}44` }}>
                  <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Time Symmetry</span>
                  <span style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: lsiColor(valdTimeAsym) }}>{valdTimeAsym}%</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: lsiColor(valdTimeAsym) }}>{parseFloat(valdTimeAsym) >= 90 ? "✓ ≥90% — <10% asymmetry" : parseFloat(valdTimeAsym) >= 80 ? "Approaching target" : "⚠ >10% asymmetry"}</span>
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Rate of Force Development (RFD)</div>
              <R2 mb={8} persist>
                <Field label={`${inv} RFD`}   unit="N/s" value={ash.valdPlyoInvRFD || ""}   onChange={v => setAsh("valdPlyoInvRFD", v)} />
                <Field label={`${uninv} RFD`} unit="N/s" value={ash.valdPlyoUninvRFD || ""} onChange={v => setAsh("valdPlyoUninvRFD", v)} />
              </R2>
              {valdRFDAsym && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${lsiColor(valdRFDAsym)}44` }}>
                  <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>RFD Symmetry</span>
                  <span style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: lsiColor(valdRFDAsym) }}>{valdRFDAsym}%</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: lsiColor(valdRFDAsym) }}>{parseFloat(valdRFDAsym) >= 90 ? "✓ ≥90%" : parseFloat(valdRFDAsym) >= 80 ? "Approaching" : "⚠ Below"}</span>
                </div>
              )}
              <div><label style={lbl}>Clinical Notes</label><input style={inp} type="text" placeholder="e.g. visible asymmetry on involved side" value={ash.valdPlyoNotes || ""} onChange={e => setAsh("valdPlyoNotes", e.target.value)} /></div>
            </div>
          </Card>

          {/* Posterior Shoulder Endurance */}
          <Card title="Posterior Shoulder Endurance Test" id="posteriorEndurance" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>
              Side-lying ER endurance. Resistance = 2% of patient body weight{bwOk ? ` (${(bwNum * 0.02).toFixed(1)} lbs based on entered BW)` : " — enter BW in Body Metrics to auto-calculate"}. Record max reps to fatigue and time held (seconds) for both sides. Time LSI target: ≥90%.
            </div>
            <div style={{ background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Reps to Fatigue — Bilateral</div>
              <R2 mb={10} persist>
                <Field label={`${inv} (Involved)`} unit="reps" value={(d.posteriorEndurance || {}).reps || ""} onChange={v => setPE("reps", v)} step="1" />
                <Field label={`${uninv} (Uninvolved)`} unit="reps" value={(d.posteriorEndurance || {}).repsUninv || ""} onChange={v => setPE("repsUninv", v)} step="1" />
              </R2>
              {hasVal((d.posteriorEndurance || {}).reps) && (
                <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 6, background: "#0f0f0f", border: `1px solid ${BORDER}`, fontSize: 11, color: MUTED }}>
                  <span style={{ color: WHITE, fontWeight: 700 }}>Reps Interpretation (Involved): </span>
                  {parseFloat((d.posteriorEndurance || {}).reps) >= 20 ? <span style={{ color: LIME }}>✓ Good posterior endurance (≥20 reps)</span> : parseFloat((d.posteriorEndurance || {}).reps) >= 12 ? <span style={{ color: GOLD }}>Moderate — monitor for rotator cuff fatigue patterns</span> : <span style={{ color: RED_BAD }}>Reduced posterior endurance — may indicate posterior cuff deficits</span>}
                </div>
              )}
              <div style={{ marginBottom: 14 }}><label style={lbl}>Clinical Notes</label><input style={inp} type="text" placeholder="e.g. fatigue at mid-arc" value={(d.posteriorEndurance || {}).notes || ""} onChange={e => setPE("notes", e.target.value)} /></div>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Time Held (seconds) — Bilateral for LSI</div>
              <R2 mb={10} persist>
                <Field label={`${inv} (Involved)`} unit="sec" value={(d.posteriorEndurance || {}).timeInv || ""} onChange={v => setPE("timeInv", v)} step="1" />
                <Field label={`${uninv} (Uninvolved)`} unit="sec" value={(d.posteriorEndurance || {}).timeUninv || ""} onChange={v => setPE("timeUninv", v)} step="1" />
              </R2>
              {peLSI && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${lsiColor(peLSI)}44` }}>
                  <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Time LSI</span>
                  <span style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: lsiColor(peLSI) }}>{peLSI}%</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: lsiColor(peLSI) }}>{parseFloat(peLSI) >= 90 ? "✓ Meets ≥90% threshold" : parseFloat(peLSI) >= 80 ? "Approaching threshold" : "Below threshold (<90%)"}</span>
                </div>
              )}
            </div>
          </Card>

          <SectionAnchor id="sec-functional" label="Functional Testing" />
          <Card title="Functional Testing" id="functional" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>CKCUEST: patient in push-up position, touches alternately for 15 sec. Benchmark ≥21 touches/15 sec (≥17 borderline). Seated medicine ball throw: measure bilateral for LSI calculation.</div>

            {/* CKCUEST */}
            <div style={{ marginBottom: 20, background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: WHITE }}>CKCUEST</span>
                {ckcClass && <span style={{ fontSize: 12, fontWeight: 800, color: ckcClass.color }}>{ckcClass.label}</span>}
              </div>
              <R3 mb={6}>
                <div><label style={lbl}>Reps / 15 sec (Test 1)</label><input style={inp} type="number" step="1" placeholder="—" value={func.ckcuestReps} onChange={e => setFunc("ckcuestReps", e.target.value)} /></div>
                <div><label style={lbl}>Reps / 15 sec (Test 2)</label><input style={inp} type="number" step="1" placeholder="—" value={func.ckcuestReps2 || ""} onChange={e => setFunc("ckcuestReps2", e.target.value)} /></div>
                <div><label style={lbl}>Reps / 15 sec (Test 3)</label><input style={inp} type="number" step="1" placeholder="—" value={func.ckcuestReps3 || ""} onChange={e => setFunc("ckcuestReps3", e.target.value)} /></div>
              </R3>
              {(() => {
                const vals = [func.ckcuestReps, func.ckcuestReps2, func.ckcuestReps3].map(v => parseFloat(v)).filter(v => !isNaN(v));
                if (vals.length === 0) return null;
                const avg = (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Average</span>
                    <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: parseFloat(avg) >= 23 ? LIME : parseFloat(avg) >= 18 ? GOLD : RED_BAD }}>{avg}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: parseFloat(avg) >= 23 ? LIME : parseFloat(avg) >= 18 ? GOLD : RED_BAD }}>{parseFloat(avg) >= 23 ? "✓ Meets Benchmark (≥23)" : parseFloat(avg) >= 18 ? "Borderline (18–22)" : "Below Benchmark (<18)"}</span>
                  </div>
                );
              })()}
            </div>

            {/* Seated MB Throw */}
            <div style={{ background: "#111", borderRadius: 10, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: WHITE }}>Seated Medicine Ball Throw (2 kg)</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>LSI</span>
                  <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: lsiColor(smbLSI) }}>{smbLSI ? smbLSI + "%" : "—"}</span>
                </div>
              </div>
              <R2 mb={6}>
                <Field label={`${inv} (Involved)`}   unit="m" value={func.smbThrowInv}   onChange={v => setFunc("smbThrowInv", v)}   step="0.01" fieldKey="smbThrowInv" />
                <Field label={`${uninv} (Uninvolved)`} unit="m" value={func.smbThrowUninv} onChange={v => setFunc("smbThrowUninv", v)} step="0.01" fieldKey="smbThrowUninv" />
              </R2>
              {smbLSI && (<span style={{ fontSize: 11, fontWeight: 700, color: lsiColor(smbLSI) }}>{parseFloat(smbLSI) >= 90 ? "✓ Meets 90% LSI threshold" : parseFloat(smbLSI) >= 80 ? "Approaching threshold" : "Below threshold"}</span>)}
            </div>

            {/* Contact Athlete */}
            {isContact && (
              <div style={{ marginTop: 20, padding: "12px 14px", borderRadius: 10, border: `1px solid ${BLUE}66`, background: BLUE+"10" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: BLUE, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Contact Athlete — Sport-Specific Functional Tests</div>

                {/* UE Y-Balance */}
                <div style={{ marginBottom: 18, background: "#0d1a22", borderRadius: 8, border: `1px solid ${BLUE}33`, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 4 }}>UE Y-Balance Test</div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>Composite = (Medial + Inferolateral + Superolateral) ÷ (3 × Limb Length) × 100. Target ≥90%.</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Limb Length</div>
                  <R2 mb={12} persist>
                    <Field label={`${inv} Limb Length`}   unit="cm" value={func.ueYbalInvLimbLength || ""}   onChange={v => setFunc("ueYbalInvLimbLength", v)}   fieldKey="ueYbalInvLimbLength" />
                    <Field label={`${uninv} Limb Length`} unit="cm" value={func.ueYbalUninvLimbLength || ""} onChange={v => setFunc("ueYbalUninvLimbLength", v)} fieldKey="ueYbalUninvLimbLength" />
                  </R2>
                  <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Reach Distances</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <Field label={`Medial — ${inv}`}   unit="cm" value={func.ueYbalInvMedial || ""}   onChange={v => setFunc("ueYbalInvMedial", v)}   fieldKey="ueYbalInvMedial" />
                    <Field label={`Inf-Lat — ${inv}`}  unit="cm" value={func.ueYbalInvInfLat || ""}   onChange={v => setFunc("ueYbalInvInfLat", v)}   fieldKey="ueYbalInvInfLat" />
                    <Field label={`Sup-Lat — ${inv}`}  unit="cm" value={func.ueYbalInvSupLat || ""}   onChange={v => setFunc("ueYbalInvSupLat", v)}   fieldKey="ueYbalInvSupLat" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <Field label={`Medial — ${uninv}`} unit="cm" value={func.ueYbalUninvMedial || ""} onChange={v => setFunc("ueYbalUninvMedial", v)} fieldKey="ueYbalUninvMedial" />
                    <Field label={`Inf-Lat — ${uninv}`}unit="cm" value={func.ueYbalUninvInfLat || ""} onChange={v => setFunc("ueYbalUninvInfLat", v)} fieldKey="ueYbalUninvInfLat" />
                    <Field label={`Sup-Lat — ${uninv}`}unit="cm" value={func.ueYbalUninvSupLat || ""} onChange={v => setFunc("ueYbalUninvSupLat", v)} fieldKey="ueYbalUninvSupLat" />
                  </div>
                  {(ueYbalInvComp || ueYbalUninvComp) && (
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 6, padding: "10px 14px", background: "#0a0a0a", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                      {ueYbalInvComp && (<div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{inv} Composite</div><div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: ueYbalPassFail(ueYbalInvComp)?.color || MUTED }}>{ueYbalInvComp}%</div><div style={{ fontSize: 10, fontWeight: 700, color: ueYbalPassFail(ueYbalInvComp)?.color || MUTED }}>{ueYbalPassFail(ueYbalInvComp)?.label}</div></div>)}
                      {ueYbalUninvComp && (<div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{uninv} Composite</div><div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: ueYbalPassFail(ueYbalUninvComp)?.color || MUTED }}>{ueYbalUninvComp}%</div><div style={{ fontSize: 10, fontWeight: 700, color: ueYbalPassFail(ueYbalUninvComp)?.color || MUTED }}>{ueYbalPassFail(ueYbalUninvComp)?.label}</div></div>)}
                      {ueYbalAsymmetry && (<div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Side Asymmetry</div><div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: parseFloat(ueYbalAsymmetry) <= 4 ? LIME : parseFloat(ueYbalAsymmetry) <= 8 ? GOLD : RED_BAD }}>{ueYbalAsymmetry}%</div></div>)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Non-Contact Athlete */}
            {isNonContact && (
              <div style={{ marginTop: 20, padding: "12px 14px", borderRadius: 10, border: `1px solid ${GOLD}44`, background: GOLD+"08" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Non-Contact Athlete — Sport-Specific Functional Tests</div>

                {/* Carry Tests */}
                <div style={{ marginBottom: 18, background: "#1a1500", borderRadius: 8, border: `1px solid ${GOLD}33`, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 8 }}>Functional Load Tests</div>
                  <R2 mb={0} persist>
                    <div><label style={lbl}>Bilateral Carry Test</label><input style={inp} type="text" placeholder="e.g. 30m completed, 50 lbs" value={func.carryTest || ""} onChange={e => setFunc("carryTest", e.target.value)} /></div>
                    <div><label style={lbl}>Single-Arm Overhead Carry</label><input style={inp} type="text" placeholder="e.g. failed at 10m, no pain" value={func.singleArmCarry || ""} onChange={e => setFunc("singleArmCarry", e.target.value)} /></div>
                  </R2>
                </div>

                {/* Seated Shot Put */}
                <div style={{ marginBottom: 18, background: "#1a1500", borderRadius: 8, border: `1px solid ${GOLD}33`, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 4 }}>Seated Shot Put Test — 7 lb Ball</div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>3 trials per side, inches. Average auto-calculated. Target LSI: {isDominant ? <span style={{ color: LIME, fontWeight: 800 }}>≥110% (dominant)</span> : <span style={{ color: LIME, fontWeight: 800 }}>≥90% (non-dominant)</span>}.</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{inv} (Involved)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <Field label="Trial 1" unit="in" value={invR ? (func.shotPutR1 || "") : (func.shotPutL1 || "")} onChange={v => setFunc(invR ? "shotPutR1" : "shotPutL1", v)} step="0.5" />
                    <Field label="Trial 2" unit="in" value={invR ? (func.shotPutR2 || "") : (func.shotPutL2 || "")} onChange={v => setFunc(invR ? "shotPutR2" : "shotPutL2", v)} step="0.5" />
                    <Field label="Trial 3" unit="in" value={invR ? (func.shotPutR3 || "") : (func.shotPutL3 || "")} onChange={v => setFunc(invR ? "shotPutR3" : "shotPutL3", v)} step="0.5" />
                    <div><label style={lbl}>Avg</label><div style={{ ...calcBox, padding: "9px 12px" }}>{shotPutInvAvg ? shotPutInvAvg + '"' : "—"}</div></div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{uninv} (Uninvolved)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <Field label="Trial 1" unit="in" value={invR ? (func.shotPutL1 || "") : (func.shotPutR1 || "")} onChange={v => setFunc(invR ? "shotPutL1" : "shotPutR1", v)} step="0.5" />
                    <Field label="Trial 2" unit="in" value={invR ? (func.shotPutL2 || "") : (func.shotPutR2 || "")} onChange={v => setFunc(invR ? "shotPutL2" : "shotPutR2", v)} step="0.5" />
                    <Field label="Trial 3" unit="in" value={invR ? (func.shotPutL3 || "") : (func.shotPutR3 || "")} onChange={v => setFunc(invR ? "shotPutL3" : "shotPutR3", v)} step="0.5" />
                    <div><label style={lbl}>Avg</label><div style={{ ...calcBox, padding: "9px 12px" }}>{shotPutUninvAvg ? shotPutUninvAvg + '"' : "—"}</div></div>
                  </div>
                  {shotPutLSI && (() => { const status = shotPutStatus(shotPutLSI); return (<div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${status.color}44` }}><span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>LSI</span><span style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: status.color }}>{shotPutLSI}%</span><span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</span><span style={{ fontSize: 10, color: MUTED, marginLeft: "auto" }}>Target: ≥{shotPutTarget}%</span></div>); })()}
                </div>

                {/* PSET */}
                <div style={{ marginBottom: 18, background: "#1a1500", borderRadius: 8, border: `1px solid ${GOLD}33`, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 4 }}>PSET (Progressive Shoulder Endurance Test)</div>
                  <R2 mb={6} persist>
                    <div><label style={lbl}>Level / Stage Achieved</label><input style={inp} type="text" placeholder="e.g. Level 4, Stage 3B" value={func.psetScore || ""} onChange={e => setFunc("psetScore", e.target.value)} /></div>
                    <div><label style={lbl}>Notes / Limiting Factor</label><input style={inp} type="text" placeholder="e.g. fatigue at shoulder, pain NRS 2/10" value={func.psetNotes || ""} onChange={e => setFunc("psetNotes", e.target.value)} /></div>
                  </R2>
                </div>

                {/* Total Arc Bilateral */}
                <div style={{ background: "#1a1500", borderRadius: 8, border: `1px solid ${GOLD}33`, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: WHITE, marginBottom: 4 }}>Total Arc of Motion — Bilateral Comparison</div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 10, lineHeight: 1.6 }}>Total arc = ER90° + IR90°. Goal: bilateral difference ≤5°. Values pulled automatically from ROM card above.</div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", padding: "12px 14px", borderRadius: 8, background: "#0a0a0a", border: `1px solid ${BORDER}` }}>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{inv} Total Arc</div><div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: totalArcInv ? WHITE : MUTED }}>{totalArcInv ? totalArcInv + "°" : "—"}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{uninv} Total Arc</div><div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: totalArcUninv ? WHITE : MUTED }}>{totalArcUninv ? totalArcUninv + "°" : "—"}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Bilateral Diff</div><div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: totalArcPassFail ? totalArcPassFail.color : MUTED }}>{totalArcDiff !== null ? totalArcDiff + "°" : "—"}</div></div>
                    {totalArcPassFail && (<div style={{ display: "flex", alignItems: "center" }}><span style={{ fontSize: 12, fontWeight: 800, color: totalArcPassFail.color }}>{totalArcPassFail.label}</span></div>)}
                  </div>
                  <div><label style={{ ...lbl, marginTop: 10 }}>Additional Notes</label><input style={inp} type="text" placeholder="e.g. restricted posterior capsule, GIRD noted" value={func.totalArcBilateralNotes || ""} onChange={e => setFunc("totalArcBilateralNotes", e.target.value)} /></div>
                </div>
              </div>
            )}
          </Card>

          <SectionAnchor id="sec-note" label="Outcomes & SOAP Note" />
          <Card title="Patient-Reported Outcomes" id="pros" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>Enter applicable PRO scores. All values carry automatically into the Physician Letter and SOAP Note.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }} className="trm-r3">
              <Field label="DASH Score" unit="/100" value={d.dash || ""} onChange={v => sd("dash", v)} placeholder="0–100" step="1" />
              <Field label="QuickDASH" unit="/100" value={d.quickdash || ""} onChange={v => sd("quickdash", v)} placeholder="0–100" step="1" />
              <Field label="ASES Shoulder Index" unit="/100" value={d.ases || ""} onChange={v => sd("ases", v)} placeholder="0–100" step="1" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }} className="trm-r3">
              <Field label="Penn Shoulder Score" unit="/100" value={d.penn || ""} onChange={v => sd("penn", v)} placeholder="0–100" step="1" />
              <Field label="WOSI" unit="/2100" value={d.wosi || ""} onChange={v => sd("wosi", v)} placeholder="0–2100 (lower = better)" step="1" />
              <Field label="PSFS" unit="/10" value={d.psfs || ""} onChange={v => sd("psfs", v)} placeholder="0–10" step="0.5" />
            </div>
            {(hasVal(d.dash) || hasVal(d.ases) || hasVal(d.penn) || hasVal(d.wosi) || hasVal(d.psfs)) && (
              <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {hasVal(d.dash) && <div style={{ padding: "6px 12px", borderRadius: 6, background: "#111", border: `1px solid ${parseFloat(d.dash) <= 10 ? LIME : parseFloat(d.dash) <= 30 ? GOLD : RED_BAD}44`, fontSize: 11, color: parseFloat(d.dash) <= 10 ? LIME : parseFloat(d.dash) <= 30 ? GOLD : RED_BAD, fontWeight: 700 }}>DASH {d.dash} — {parseFloat(d.dash) <= 10 ? "Minimal disability" : parseFloat(d.dash) <= 30 ? "Mild-moderate" : "Significant disability"}</div>}
                {hasVal(d.ases) && <div style={{ padding: "6px 12px", borderRadius: 6, background: "#111", border: `1px solid ${parseFloat(d.ases) >= 80 ? LIME : parseFloat(d.ases) >= 60 ? GOLD : RED_BAD}44`, fontSize: 11, color: parseFloat(d.ases) >= 80 ? LIME : parseFloat(d.ases) >= 60 ? GOLD : RED_BAD, fontWeight: 700 }}>ASES {d.ases} — {parseFloat(d.ases) >= 80 ? "Good-excellent" : parseFloat(d.ases) >= 60 ? "Fair" : "Poor"}</div>}
                {hasVal(d.penn) && <div style={{ padding: "6px 12px", borderRadius: 6, background: "#111", border: `1px solid ${parseFloat(d.penn) >= 80 ? LIME : parseFloat(d.penn) >= 60 ? GOLD : RED_BAD}44`, fontSize: 11, color: parseFloat(d.penn) >= 80 ? LIME : parseFloat(d.penn) >= 60 ? GOLD : RED_BAD, fontWeight: 700 }}>Penn {d.penn} — {parseFloat(d.penn) >= 80 ? "Good-excellent" : parseFloat(d.penn) >= 60 ? "Fair" : "Poor"}</div>}
                {hasVal(d.wosi) && <div style={{ padding: "6px 12px", borderRadius: 6, background: "#111", border: `1px solid ${parseFloat(d.wosi) <= 500 ? LIME : parseFloat(d.wosi) <= 1050 ? GOLD : RED_BAD}44`, fontSize: 11, color: parseFloat(d.wosi) <= 500 ? LIME : parseFloat(d.wosi) <= 1050 ? GOLD : RED_BAD, fontWeight: 700 }}>WOSI {d.wosi} — {parseFloat(d.wosi) <= 500 ? "Minimal" : parseFloat(d.wosi) <= 1050 ? "Moderate" : "Significant"}</div>}
              </div>
            )}
          </Card>
          <button onClick={generateNote} style={{ width: "100%", padding: 16, borderRadius: 12, fontSize: 13, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", background: `linear-gradient(135deg,${LIME},${LIME_DIM})`, color: BLACK, border: "none", boxShadow: `0 8px 32px ${LIME}44`, marginBottom: 20 }}>
            ⬇ Generate SOAP Note Objective
          </button>

          {d.noteText && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${LIME}44`, marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", background: LIME+"14", borderBottom: `1px solid ${LIME}33` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: LIME, letterSpacing: "0.15em", textTransform: "uppercase" }}>SOAP Note — Objective Section</span>
                <button onClick={copyNote} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer", background: noteCopied ? "#15803d" : LIME, color: BLACK, border: "none" }}>{noteCopied ? "✓ Copied!" : "Copy to Clipboard"}</button>
              </div>
              <pre style={{ padding: 20, background: "#0a0a0a", color: "#d4faa6", fontSize: 12, fontFamily: "monospace", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0, maxHeight: 500, overflowY: "auto" }}>{d.noteText}</pre>
            </div>
          )}
          {isMobile && <div style={{ height: 84 }} />}
        </div>
      </div>

      {/* ── MOBILE SECTION NAV (bottom bar) ── */}
      {isMobile && (() => {
        const idx  = SECTION_NAV.findIndex(s => s.key === activeSection);
        const cur  = SECTION_NAV[idx] ?? SECTION_NAV[0];
        const prev = SECTION_NAV[idx - 1];
        const next = SECTION_NAV[idx + 1];
        const NAV_BORDER = "#2a2a2a";
        return (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            zIndex: 150, background: "#0f0f0f",
            borderTop: `1px solid ${LIME}33`,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}>
            {/* Section dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingTop: 8, paddingBottom: 4 }}>
              {SECTION_NAV.map(s => (
                <button key={s.key} onClick={() => { scrollTo(s.ids); setActiveSection(s.key); }} style={{
                  width: s.key === activeSection ? 22 : 7, height: 7, borderRadius: 4,
                  padding: 0, border: "none", flexShrink: 0,
                  background: s.key === activeSection ? LIME : "#2e2e2e",
                  cursor: "pointer", transition: "width 0.2s, background 0.2s",
                }} />
              ))}
            </div>
            {/* Prev / label / Next */}
            <div style={{ display: "flex", alignItems: "stretch", gap: 6, padding: "4px 12px 10px" }}>
              <button
                onClick={() => { if (prev) { scrollTo(prev.ids); setActiveSection(prev.key); } }}
                disabled={!prev}
                style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 10,
                  border: `1px solid ${prev ? NAV_BORDER : "#181818"}`,
                  background: prev ? "#1a1a1a" : "#0a0a0a",
                  cursor: prev ? "pointer" : "default", textAlign: "left", minWidth: 0,
                }}>
                <span style={{ fontSize: 18, color: prev ? "#666" : "#222", lineHeight: 1, flexShrink: 0 }}>‹</span>
                {prev && (
                  <div>
                    <div style={{ fontSize: 8, color: "#555", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Prev</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{prev.label}</div>
                  </div>
                )}
              </button>
              <div style={{ flexShrink: 0, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 72 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: LIME, letterSpacing: "0.08em", textTransform: "uppercase" }}>{cur.label}</div>
                <div style={{ fontSize: 8, color: "#666", fontWeight: 700, marginTop: 1 }}>{idx + 1} / {SECTION_NAV.length}</div>
              </div>
              <button
                onClick={() => { if (next) { scrollTo(next.ids); setActiveSection(next.key); } }}
                disabled={!next}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
                  padding: "8px 10px", borderRadius: 10,
                  border: `1px solid ${next ? NAV_BORDER : "#181818"}`,
                  background: next ? "#1a1a1a" : "#0a0a0a",
                  cursor: next ? "pointer" : "default", textAlign: "right", minWidth: 0,
                }}>
                {next && (
                  <div>
                    <div style={{ fontSize: 8, color: "#555", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "right" }}>Next</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textAlign: "right" }}>{next.label}</div>
                  </div>
                )}
                <span style={{ fontSize: 18, color: next ? "#666" : "#222", lineHeight: 1, flexShrink: 0 }}>›</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── BUILD PHYSICIAN LETTER ───────────────────────────────────────────────────
function buildShoulderLetter(d, ptName, therapistName, clinic, impression) {
  const inv  = d.patient.involvedSide;
  const invR = inv === "Right";
  const uninv = invR ? "Left" : "Right";
  const isDominant  = d.patient.armDominance === "dominant";
  const isContact   = d.patient.athleteCategory === "contact";
  const strTarget   = isDominant ? 110 : 90;

  const erRnm   = calcTorqueNm(d.erForceR, d.leverArm);
  const erLnm   = calcTorqueNm(d.erForceL, d.leverArm);
  const irRnm   = calcTorqueNm(d.irForceR, d.leverArm);
  const irLnm   = calcTorqueNm(d.irForceL, d.leverArm);
  const erRnorm = calcNorm(erRnm, d.bw); const erLnorm = calcNorm(erLnm, d.bw);
  const irRnorm = calcNorm(irRnm, d.bw); const irLnorm = calcNorm(irLnm, d.bw);
  const erLSI   = invR ? calcLSI(erRnorm, erLnorm) : calcLSI(erLnorm, erRnorm);
  const irLSI   = invR ? calcLSI(irRnorm, irLnorm) : calcLSI(irLnorm, irRnorm);
  const scLSI   = calcLSI(invR ? d.scaptionForceR : d.scaptionForceL, invR ? d.scaptionForceL : d.scaptionForceR);

  const ash  = d.ash  || {};
  const func = d.functional || {};
  const pe   = d.posteriorEndurance || {};

  const ashILSI = calcLSI(ash.isoIInvLoad, ash.isoIUninvLoad);
  const ashTLSI = calcLSI(ash.isoTInvLoad, ash.isoTUninvLoad);
  const ashYLSI = calcLSI(ash.isoYInvLoad, ash.isoYUninvLoad);
  const valdFLSI = calcLSI(ash.valdPlyoInvPeakForce, ash.valdPlyoUninvPeakForce);
  const valdTLSI = calcLSI(ash.valdPlyoInvTimePeak,  ash.valdPlyoUninvTimePeak);

  const avgT = (...vs) => { const ns = vs.map(v => parseFloat(v)).filter(v => !isNaN(v)); return ns.length ? (ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1) : null; };
  const spInv   = invR ? avgT(func.shotPutR1,func.shotPutR2,func.shotPutR3) : avgT(func.shotPutL1,func.shotPutL2,func.shotPutL3);
  const spUninv = invR ? avgT(func.shotPutL1,func.shotPutL2,func.shotPutL3) : avgT(func.shotPutR1,func.shotPutR2,func.shotPutR3);
  const spLSI   = calcLSI(spInv || func.shotPutInv, spUninv || func.shotPutUninv);
  const peLSI   = calcLSI(pe.timeInv, pe.timeUninv);
  const ckcVals = [func.ckcuestReps,func.ckcuestReps2,func.ckcuestReps3].map(v=>parseFloat(v)).filter(v=>!isNaN(v));
  const ckcAvg  = ckcVals.length ? (ckcVals.reduce((a,b)=>a+b,0)/ckcVals.length).toFixed(1) : null;

  const calcUEYbal = (m,il,sl,ll) => (hasVal(m)&&hasVal(il)&&hasVal(sl)&&hasVal(ll)&&toNum(ll)>0)
    ? (((toNum(m)+toNum(il)+toNum(sl))/(3*toNum(ll)))*100).toFixed(1) : null;
  const ueYbalComp = calcUEYbal(func.ueYbalInvMedial,func.ueYbalInvInfLat,func.ueYbalInvSupLat,func.ueYbalInvLimbLength);

  const today = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const pt    = ptName        || "[Patient Name]";
  const surg  = d.patient.surgeon || "[Surgeon Name]";
  const ther  = therapistName || "[Therapist Name, Credentials]";
  const cl    = clinic        || "Train Recover Move";
  const wks   = d.patient.weeksPostOp ? `${d.patient.weeksPostOp} weeks` : "[X] weeks";
  const stype = d.patient.surgeryType || "[Surgery Type]";

  const lines = [];
  const add = (l) => lines.push(l);
  const br  = () => lines.push("");

  add(cl); add(today); br();
  add(`Dr. ${surg}`); br();
  add(`Re: ${pt} — Shoulder Rehabilitation Progress Update`); br();
  add(`Dear Dr. ${surg},`); br();
  add(`I am writing to provide a progress update on ${pt}, who is currently ${wks} post-operative from ${stype} and has been receiving physical therapy at ${cl}. We recently completed a formal shoulder return-to-sport testing battery and I wanted to share the key findings with you.`);
  br();

  // ROM
  const romInvFlex = invR ? d.flexionR : d.flexionL;
  const romUninvFlex = invR ? d.flexionL : d.flexionR;
  const romInvAbd  = invR ? d.abductionR : d.abductionL;
  const romUninvAbd = invR ? d.abductionL : d.abductionR;
  const er90Inv    = invR ? d.er90R : d.er90L;
  const ir90Inv    = invR ? d.ir90R : d.ir90L;
  const er90Uninv  = invR ? d.er90L : d.er90R;
  const ir90Uninv  = invR ? d.ir90L : d.ir90R;
  if (hasVal(romInvFlex) || hasVal(er90Inv) || hasVal(ir90Inv)) {
    add("RANGE OF MOTION");
    let rLine = `${pt} demonstrated`;
    if (hasVal(romInvFlex) && hasVal(romUninvFlex)) rLine += ` shoulder flexion of ${romInvFlex}° (involved ${inv}) and ${romUninvFlex}° (uninvolved ${uninv})`;
    else if (hasVal(romInvFlex)) rLine += ` shoulder flexion of ${romInvFlex}° on the involved side`;
    if (hasVal(romInvAbd)) rLine += `; abduction ${romInvAbd}° (involved)${hasVal(romUninvAbd) ? ` and ${romUninvAbd}° (uninvolved)` : ""}`;
    if (hasVal(er90Inv) && hasVal(ir90Inv)) {
      const arcInv = (toNum(er90Inv)+toNum(ir90Inv)).toFixed(0);
      rLine += `; total arc of motion on the involved side was ${arcInv}°`;
      if (hasVal(er90Uninv) && hasVal(ir90Uninv)) {
        const arcUninv = (toNum(er90Uninv)+toNum(ir90Uninv)).toFixed(0);
        const diff = Math.abs(toNum(arcInv)-toNum(arcUninv)).toFixed(0);
        rLine += ` versus ${arcUninv}° uninvolved (${parseFloat(diff) <= 5 ? "within" : "exceeds"} the ±5° bilateral symmetry threshold)`;
      }
    }
    add(rLine + "."); br();
  }

  // Strength
  const hasStr = erLSI || irLSI || scLSI;
  if (hasStr) {
    add("ROTATOR CUFF STRENGTH — ISOMETRIC HHD");
    const profile = isDominant ? "dominant arm" : "non-dominant arm";
    const target  = `≥${strTarget}% LSI`;
    let sLine = `Isometric rotator cuff strength testing was performed bilaterally (${profile}, ${target} return-to-sport criterion). `;
    if (erLSI) {
      const ev = parseFloat(erLSI);
      sLine += `External rotation LSI: ${erLSI}% (${ev >= strTarget ? "meets" : "below"} ${target}). `;
    }
    if (irLSI) {
      const iv = parseFloat(irLSI);
      sLine += `Internal rotation LSI: ${irLSI}% (${iv >= strTarget ? "meets" : "below"} ${target}). `;
    }
    if (scLSI) {
      const sv = parseFloat(scLSI);
      sLine += `Scaption LSI: ${scLSI}% (${sv >= strTarget ? "meets" : "below"} ${target}). `;
    }
    if (isDominant && hasVal(d.bw) && toNum(d.bw) > 0) {
      const bwNum = toNum(d.bw);
      const erDomForce = invR ? d.erForceR : d.erForceL;
      const irDomForce = invR ? d.irForceR : d.irForceL;
      if (hasVal(erDomForce)) sLine += `ER:BW ratio: ${((toNum(erDomForce)/bwNum)*100).toFixed(1)}% (target 12–15%). `;
      if (hasVal(irDomForce)) sLine += `IR:BW ratio: ${((toNum(irDomForce)/bwNum)*100).toFixed(1)}% (target ~25%). `;
    }
    add(sLine.trim()); br();
  }

  // ASH + VALD
  const hasASH = ashILSI || ashTLSI || ashYLSI;
  if (hasASH || valdFLSI) {
    add("ASH TEST & VALD FORCEDECKS");
    let ashLine = "";
    if (hasASH) {
      const ashParts = [
        ashILSI && `ISO I: ${ashILSI}%`,
        ashTLSI && `ISO T: ${ashTLSI}%`,
        ashYLSI && `ISO Y: ${ashYLSI}%`,
      ].filter(Boolean);
      const allMet = [ashILSI,ashTLSI,ashYLSI].filter(Boolean).every(v => parseFloat(v) >= 90);
      ashLine += `Active Shoulder Harness testing yielded LSI values of ${ashParts.join(", ")} — all ${allMet ? "meeting" : "not yet meeting"} the ≥90% threshold. `;
    }
    if (valdFLSI) {
      const fv = parseFloat(valdFLSI);
      ashLine += `VALD ForceDecks plyo push-up peak force LSI: ${valdFLSI}% (${fv >= strTarget ? "meets" : "below"} ≥${strTarget}% criterion). `;
      if (valdTLSI) ashLine += `Time to peak force LSI: ${valdTLSI}% (${parseFloat(valdTLSI) >= 90 ? "<10% asymmetry — meets threshold" : ">10% asymmetry"}). `;
    }
    add(ashLine.trim()); br();
  }

  // Functional
  const hasFunctional = ckcAvg || ueYbalComp || spLSI || peLSI;
  if (hasFunctional) {
    add("FUNCTIONAL TESTING");
    let fLine = "";
    if (ckcAvg) {
      const cv = parseFloat(ckcAvg);
      fLine += `Closed Kinetic Chain Upper Extremity Stability Test (CKCUEST) average: ${ckcAvg} reps (${cv >= 21 ? "meets ≥21 rep benchmark" : "below the ≥21 rep benchmark"}). `;
    }
    if (isContact && ueYbalComp) {
      const uv = parseFloat(ueYbalComp);
      fLine += `UE Y-Balance composite score on the involved limb: ${ueYbalComp}% (${uv >= 90 ? "meets ≥90% threshold" : "below the ≥90% return-to-sport threshold"}). `;
    }
    if (!isContact && spLSI) {
      const sv = parseFloat(spLSI);
      const spTarget = isDominant ? 110 : 90;
      fLine += `Seated Shot Put Test LSI: ${spLSI}% (${sv >= spTarget ? `meets ≥${spTarget}% target` : `below ≥${spTarget}% target`}). `;
    }
    if (peLSI) {
      const pv = parseFloat(peLSI);
      fLine += `Posterior Shoulder Endurance Test time LSI: ${peLSI}% (${pv >= 90 ? "meets ≥90% threshold" : "below ≥90% threshold"}). `;
    }
    add(fLine.trim()); br();
  }

  // PROs
  const hasPRO = hasVal(d.dash) || hasVal(d.ases) || hasVal(d.penn) || hasVal(d.wosi) || hasVal(d.psfs);
  if (hasPRO) {
    add("PATIENT-REPORTED OUTCOMES");
    let proLine = "";
    if (hasVal(d.dash)) proLine += `DASH score: ${d.dash}/100 (${parseFloat(d.dash) <= 10 ? "minimal disability" : parseFloat(d.dash) <= 30 ? "mild-moderate disability" : "significant disability"}). `;
    if (hasVal(d.ases)) proLine += `ASES Shoulder Index: ${d.ases}/100 (${parseFloat(d.ases) >= 80 ? "good-excellent outcome" : parseFloat(d.ases) >= 60 ? "fair outcome" : "poor outcome"}). `;
    if (hasVal(d.penn)) proLine += `Penn Shoulder Score: ${d.penn}/100 (${parseFloat(d.penn) >= 80 ? "good-excellent outcome" : parseFloat(d.penn) >= 60 ? "fair outcome" : "poor outcome"}). `;
    if (hasVal(d.wosi)) proLine += `WOSI: ${d.wosi}/2100 (${parseFloat(d.wosi) <= 500 ? "minimal impairment" : parseFloat(d.wosi) <= 1050 ? "moderate impairment" : "significant impairment"}). `;
    if (hasVal(d.psfs)) proLine += `PSFS: ${d.psfs}/10. `;
    add(proLine.trim()); br();
  }

  add("CLINICAL IMPRESSION");
  add(impression && impression.trim()
    ? impression.trim()
    : "[Please enter your clinical impression above before sending this letter.]");
  br();
  add("We appreciate your collaboration in this patient's care and will continue to keep you informed as rehabilitation progresses. Please do not hesitate to reach out with any questions.");
  br();
  add("Sincerely,"); br();
  add(ther); add(cl);
  return lines.join("\n");
}

// ─── TAB 2: COMPARISON ───────────────────────────────────────────────────────
function ShoulderCompTab({ currentData: d, sessions, setSessions, onAddSession }) {
  const [copiedPara, setCopiedPara] = useState(false);
  const [paragraph,  setParagraph]  = useState("");

  const computeMetrics = (sd) => {
    if (!sd) return null;
    const invR  = sd.patient?.involvedSide === "Right";
    const inv   = sd.patient?.involvedSide || "Left";
    const isDom = sd.patient?.armDominance === "dominant";
    const strThr = isDom ? 110 : 90;
    const leverArm = sd.leverArm;
    const bw       = sd.bw;

    const erRnm   = calcTorqueNm(sd.erForceR, leverArm);
    const erLnm   = calcTorqueNm(sd.erForceL, leverArm);
    const irRnm   = calcTorqueNm(sd.irForceR, leverArm);
    const irLnm   = calcTorqueNm(sd.irForceL, leverArm);
    const erRnorm = calcNorm(erRnm, bw); const erLnorm = calcNorm(erLnm, bw);
    const irRnorm = calcNorm(irRnm, bw); const irLnorm = calcNorm(irLnm, bw);
    const erLSI   = invR ? calcLSI(erRnorm, erLnorm) : calcLSI(erLnorm, erRnorm);
    const irLSI   = invR ? calcLSI(irRnorm, irLnorm) : calcLSI(irLnorm, irRnorm);
    const scLSI   = calcLSI(invR ? sd.scaptionForceR : sd.scaptionForceL, invR ? sd.scaptionForceL : sd.scaptionForceR);

    const ash  = sd.ash  || {};
    const func = sd.functional || {};
    const pe   = sd.posteriorEndurance || {};

    const avgT = (...vs) => { const ns=vs.map(v=>parseFloat(v)).filter(v=>!isNaN(v)); return ns.length?(ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1):null; };
    const spInv   = invR ? avgT(func.shotPutR1,func.shotPutR2,func.shotPutR3) : avgT(func.shotPutL1,func.shotPutL2,func.shotPutL3);
    const spUninv = invR ? avgT(func.shotPutL1,func.shotPutL2,func.shotPutL3) : avgT(func.shotPutR1,func.shotPutR2,func.shotPutR3);
    const spLSI   = calcLSI(spInv||func.shotPutInv, spUninv||func.shotPutUninv);
    const peLSI   = calcLSI(pe.timeInv, pe.timeUninv);
    const ckcVals = [func.ckcuestReps,func.ckcuestReps2,func.ckcuestReps3].map(v=>parseFloat(v)).filter(v=>!isNaN(v));
    const ckcAvg  = ckcVals.length ? (ckcVals.reduce((a,b)=>a+b,0)/ckcVals.length).toFixed(1) : null;

    const calcUEYbal = (m,il,sl,ll) => (hasVal(m)&&hasVal(il)&&hasVal(sl)&&hasVal(ll)&&toNum(ll)>0)?
      (((toNum(m)+toNum(il)+toNum(sl))/(3*toNum(ll)))*100).toFixed(1):null;
    const ueYbalComp = calcUEYbal(func.ueYbalInvMedial,func.ueYbalInvInfLat,func.ueYbalInvSupLat,func.ueYbalInvLimbLength);

    const er90Inv   = invR ? sd.er90R : sd.er90L;
    const ir90Inv   = invR ? sd.ir90R : sd.ir90L;
    const er90Uninv = invR ? sd.er90L : sd.er90R;
    const ir90Uninv = invR ? sd.ir90L : sd.ir90R;
    const totalArcInv   = (hasVal(er90Inv)   && hasVal(ir90Inv))   ? (toNum(er90Inv)+toNum(ir90Inv)).toFixed(0)     : null;
    const totalArcUninv = (hasVal(er90Uninv) && hasVal(ir90Uninv)) ? (toNum(er90Uninv)+toNum(ir90Uninv)).toFixed(0) : null;

    return {
      wks:       sd.patient?.weeksPostOp || null,
      date:      sd.patient?.date        || null,
      flexInv:   invR ? sd.flexionR : sd.flexionL,
      abdInv:    invR ? sd.abductionR : sd.abductionL,
      er90Inv,  ir90Inv, totalArcInv, totalArcUninv,
      erLSI,  irLSI,  scLSI,
      ashILSI: calcLSI(ash.isoIInvLoad, ash.isoIUninvLoad),
      ashTLSI: calcLSI(ash.isoTInvLoad, ash.isoTUninvLoad),
      ashYLSI: calcLSI(ash.isoYInvLoad, ash.isoYUninvLoad),
      valdFLSI: calcLSI(ash.valdPlyoInvPeakForce, ash.valdPlyoUninvPeakForce),
      valdTLSI: calcLSI(ash.valdPlyoInvTimePeak,  ash.valdPlyoUninvTimePeak),
      peReps:   pe.reps || null,
      peLSI,
      ckcAvg,
      ueYbalComp,
      spLSI,
      dash: sd.dash || null,
      ases: sd.ases || null,
      penn: sd.penn || null,
      wosi: sd.wosi || null,
      psfs: sd.psfs || null,
      inv, strThr,
    };
  };

  const sessionCols = sessions.map((s, i) => ({ key: `s${i}`, label: s.label, metrics: computeMetrics(s.data), isSession: true }));
  const currentCol  = { key: "current", label: "Today", metrics: computeMetrics(d), isCurrent: true };
  const allCols     = [...sessionCols, currentCol];
  const hasSessions = sessions.length > 0;

  const inv   = d.patient?.involvedSide || "Left";
  const uninv = inv === "Right" ? "Left" : "Right";

  const metricRows = [
    { label: "Weeks Post-Op",       key: "wks",          u: " wks", higher: true,  group: "session"   },
    { label: `Flexion ${inv} (°)`,  key: "flexInv",      u: "°",    higher: true,  group: "rom"       },
    { label: `Abduction ${inv} (°)`,key: "abdInv",       u: "°",    higher: true,  group: "rom"       },
    { label: `ER at 90° ${inv}`,    key: "er90Inv",      u: "°",    higher: true,  group: "rom"       },
    { label: `IR at 90° ${inv}`,    key: "ir90Inv",      u: "°",    higher: true,  group: "rom"       },
    { label: `Total Arc ${inv}`,    key: "totalArcInv",  u: "°",    higher: true,  group: "rom",  spark: true },
    { label: `Total Arc ${uninv}`,  key: "totalArcUninv",u: "°",    higher: true,  group: "rom"       },
    { label: "ER Strength LSI",     key: "erLSI",        u: "%",    higher: true,  group: "strength", spark: true },
    { label: "IR Strength LSI",     key: "irLSI",        u: "%",    higher: true,  group: "strength", spark: true },
    { label: "Scaption LSI",        key: "scLSI",        u: "%",    higher: true,  group: "strength", spark: true },
    { label: "ASH ISO I LSI",       key: "ashILSI",      u: "%",    higher: true,  group: "ash",  spark: true },
    { label: "ASH ISO T LSI",       key: "ashTLSI",      u: "%",    higher: true,  group: "ash",  spark: true },
    { label: "ASH ISO Y LSI",       key: "ashYLSI",      u: "%",    higher: true,  group: "ash",  spark: true },
    { label: "VALD Peak Force LSI", key: "valdFLSI",     u: "%",    higher: true,  group: "ash",  spark: true },
    { label: "VALD Time LSI",       key: "valdTLSI",     u: "%",    higher: true,  group: "ash"       },
    { label: "PE Reps",             key: "peReps",       u: " reps",higher: true,  group: "functional" },
    { label: "PE Time LSI",         key: "peLSI",        u: "%",    higher: true,  group: "functional",spark: true },
    { label: "CKCUEST Avg",         key: "ckcAvg",       u: " reps",higher: true,  group: "functional",spark: true },
    { label: "UE Y-Balance (%)",    key: "ueYbalComp",   u: "%",    higher: true,  group: "functional",spark: true },
    { label: "Shot Put LSI",        key: "spLSI",        u: "%",    higher: true,  group: "functional",spark: true },
    { label: "DASH Score",          key: "dash",         u: "/100", higher: false, group: "outcomes", spark: true },
    { label: "ASES",                key: "ases",         u: "/100", higher: true,  group: "outcomes", spark: true },
    { label: "Penn Shoulder",       key: "penn",         u: "/100", higher: true,  group: "outcomes", spark: true },
    { label: "WOSI",                key: "wosi",         u: "/2100",higher: false, group: "outcomes", spark: true },
    { label: "PSFS",                key: "psfs",         u: "/10",  higher: true,  group: "outcomes", spark: true },
  ];

  const groups = [
    { key: "session",    label: "Session"    },
    { key: "rom",        label: "ROM"        },
    { key: "strength",   label: "Strength"   },
    { key: "ash",        label: "ASH / VALD" },
    { key: "functional", label: "Functional" },
    { key: "outcomes",   label: "Outcomes"   },
  ];

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

  const Sparkline = ({ rowKey }) => {
    const vals = allCols.map(c => parseFloat(c.metrics?.[rowKey])).filter(v => !isNaN(v));
    if (vals.length < 2) return null;
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const W = 80, H = 24, pad = 3;
    const points = allCols
      .map((c, i) => ({ v: parseFloat(c.metrics?.[rowKey]), i }))
      .filter(p => !isNaN(p.v))
      .map(p => {
        const x = pad + (p.i / Math.max(allCols.length - 1, 1)) * (W - pad * 2);
        const y = H - pad - ((p.v - min) / range) * (H - pad * 2);
        return `${x},${y}`;
      });
    const lastVal  = parseFloat(allCols[allCols.length - 1].metrics?.[rowKey]);
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

  const generateParagraph = () => {
    const cur  = computeMetrics(d);
    const prev = sessions.length > 0 ? computeMetrics(sessions[sessions.length - 1].data) : null;
    const wks  = toNum(d.patient?.weeksPostOp);
    const mos  = wks > 0 ? (wks / 4.33).toFixed(1) : null;
    const stype = d.patient?.surgeryType;
    const isDom = d.patient?.armDominance === "dominant";
    const isContact = d.patient?.athleteCategory === "contact";
    const strThr = isDom ? 110 : 90;
    const n = (v) => parseFloat(v);
    const changed = (cur, prev) => {
      if (!cur || !prev) return null;
      const diff = (n(cur) - n(prev)).toFixed(1);
      return { diff: Math.abs(diff), dir: n(cur) > n(prev) ? "increased" : n(cur) < n(prev) ? "decreased" : "unchanged" };
    };
    const sentences = [];

    // Opening
    let opening = "Patient is";
    if (wks > 0) opening += ` ${wks} weeks (${mos} months) post-operative`;
    else opening += " post-operative";
    if (stype) opening += ` from ${stype}`;
    opening += ". Testing was performed as part of a formal shoulder return-to-sport assessment battery.";
    sentences.push(opening);

    // Strength
    const strParts = [];
    if (cur.erLSI) {
      const ev = n(cur.erLSI);
      const ch = prev?.erLSI ? changed(cur.erLSI, prev.erLSI) : null;
      let s = `External rotation LSI is ${cur.erLSI}%`;
      if (ch) s += `, ${ch.dir} from ${prev.erLSI}% at prior testing`;
      s += ` (target ≥${strThr}% — ${ev >= strThr ? "meets criterion" : "below criterion"})`;
      strParts.push(s);
    }
    if (cur.irLSI) {
      const iv = n(cur.irLSI);
      const ch = prev?.irLSI ? changed(cur.irLSI, prev.irLSI) : null;
      let s = `IR LSI ${cur.irLSI}%`;
      if (ch) s += ` (${ch.dir} from ${prev.irLSI}%)`;
      s += ` (${iv >= strThr ? "meets" : "below"} ≥${strThr}%)`;
      strParts.push(s);
    }
    if (cur.scLSI) {
      const sv = n(cur.scLSI);
      strParts.push(`scaption LSI ${cur.scLSI}% (${sv >= strThr ? "meets" : "below"} ≥${strThr}%)`);
    }
    if (strParts.length > 0) sentences.push("Rotator cuff strength: " + strParts.join("; ") + ".");

    // ASH
    const ashParts = [];
    if (cur.ashILSI) ashParts.push(`ISO I: ${cur.ashILSI}% (${n(cur.ashILSI) >= 90 ? "meets" : "below"} ≥90%)`);
    if (cur.ashTLSI) ashParts.push(`ISO T: ${cur.ashTLSI}% (${n(cur.ashTLSI) >= 90 ? "meets" : "below"} ≥90%)`);
    if (cur.ashYLSI) ashParts.push(`ISO Y: ${cur.ashYLSI}% (${n(cur.ashYLSI) >= 90 ? "meets" : "below"} ≥90%)`);
    if (ashParts.length > 0) sentences.push("Active Shoulder Harness testing: " + ashParts.join("; ") + ".");
    if (cur.valdFLSI) {
      let s = `VALD ForceDecks plyo push-up peak force LSI: ${cur.valdFLSI}%`;
      if (cur.valdTLSI) s += `; time-to-peak LSI: ${cur.valdTLSI}% (${n(cur.valdTLSI) >= 90 ? "<10% asymmetry — meets threshold" : ">10% asymmetry"})`;
      sentences.push(s + ".");
    }

    // ROM
    if (cur.flexInv || cur.totalArcInv) {
      const parts = [];
      if (cur.flexInv) parts.push(`shoulder flexion ${cur.flexInv}° (involved)`);
      if (cur.totalArcInv) {
        let s = `total arc ${cur.totalArcInv}° (involved)`;
        if (cur.totalArcUninv) {
          const diff = Math.abs(n(cur.totalArcInv) - n(cur.totalArcUninv)).toFixed(0);
          s += ` vs ${cur.totalArcUninv}° (uninvolved) — ${parseFloat(diff) <= 5 ? "within ±5° threshold" : `${diff}° bilateral difference`}`;
        }
        parts.push(s);
      }
      sentences.push("Range of motion: " + parts.join("; ") + ".");
    }

    // Functional
    const funcParts = [];
    if (cur.ckcAvg) {
      const cv = n(cur.ckcAvg);
      const ch = prev?.ckcAvg ? changed(cur.ckcAvg, prev.ckcAvg) : null;
      let s = `CKCUEST average ${cur.ckcAvg} reps`;
      if (ch) s += ` (${ch.dir} from ${prev.ckcAvg})`;
      s += ` (${cv >= 21 ? "meets ≥21 benchmark" : "below benchmark"})`;
      funcParts.push(s);
    }
    if (isContact && cur.ueYbalComp) {
      const uv = n(cur.ueYbalComp);
      const ch = prev?.ueYbalComp ? changed(cur.ueYbalComp, prev.ueYbalComp) : null;
      let s = `UE Y-Balance composite ${cur.ueYbalComp}%`;
      if (ch) s += ` (${ch.dir} from ${prev.ueYbalComp}%)`;
      s += ` (${uv >= 90 ? "meets ≥90% threshold" : "below ≥90% threshold"})`;
      funcParts.push(s);
    }
    if (!isContact && cur.spLSI) {
      const spTarget = isDom ? 110 : 90;
      const sv = n(cur.spLSI);
      const ch = prev?.spLSI ? changed(cur.spLSI, prev.spLSI) : null;
      let s = `seated shot put LSI ${cur.spLSI}%`;
      if (ch) s += ` (${ch.dir} from ${prev.spLSI}%)`;
      s += ` (${sv >= spTarget ? "meets" : "below"} ≥${spTarget}% target)`;
      funcParts.push(s);
    }
    if (cur.peLSI) {
      const pv = n(cur.peLSI);
      funcParts.push(`posterior endurance time LSI ${cur.peLSI}% (${pv >= 90 ? "meets ≥90%" : "below ≥90%"})`);
    }
    if (funcParts.length > 0) sentences.push("Functional testing: " + funcParts.join("; ") + ".");

    // PROs
    const proParts = [];
    if (cur.ases) proParts.push(`ASES ${cur.ases}/100 (${n(cur.ases) >= 80 ? "good-excellent" : n(cur.ases) >= 60 ? "fair" : "poor"})`);
    if (cur.dash) proParts.push(`DASH ${cur.dash}/100 (${n(cur.dash) <= 10 ? "minimal disability" : n(cur.dash) <= 30 ? "mild-moderate" : "significant disability"})`);
    if (cur.penn) proParts.push(`Penn ${cur.penn}/100`);
    if (cur.wosi) proParts.push(`WOSI ${cur.wosi}/2100`);
    if (proParts.length > 0) sentences.push("Patient-reported outcomes: " + proParts.join("; ") + ".");

    // Closing trajectory
    const rtsIndicators = [];
    if (cur.erLSI)      rtsIndicators.push({ met: n(cur.erLSI)  >= strThr, label: "ER strength" });
    if (cur.irLSI)      rtsIndicators.push({ met: n(cur.irLSI)  >= strThr, label: "IR strength" });
    if (cur.ckcAvg)     rtsIndicators.push({ met: n(cur.ckcAvg) >= 21,     label: "CKCUEST" });
    if (cur.ueYbalComp) rtsIndicators.push({ met: n(cur.ueYbalComp) >= 90, label: "UE Y-Balance" });
    if (cur.spLSI)      rtsIndicators.push({ met: n(cur.spLSI) >= (isDom ? 110 : 90), label: "shot put" });
    if (rtsIndicators.length > 0) {
      const metCount = rtsIndicators.filter(r => r.met).length;
      const notMet   = rtsIndicators.filter(r => !r.met).map(r => r.label);
      let traj = "";
      if (metCount === rtsIndicators.length) {
        traj = "Overall, patient demonstrates a favorable trajectory across all assessed domains";
        if (wks > 0) traj += "; return-to-sport consideration is appropriate pending physician clearance";
      } else if (metCount >= rtsIndicators.length / 2) {
        traj = `Overall trajectory is positive, though ${notMet.join(" and ")} remain${notMet.length === 1 ? "s" : ""} below the return-to-sport threshold; continued targeted intervention is indicated`;
      } else {
        traj = `Patient continues to demonstrate meaningful deficits in ${notMet.join(", ")}, indicating that formal return-to-sport clearance is not yet appropriate at this time`;
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
          document.body.appendChild(ta); ta.focus(); ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setCopiedPara(true); setTimeout(() => setCopiedPara(false), 2500);
        } catch (e2) {}
      });
  };

  const colW   = 90;
  const labelW = 190;
  const totalW = labelW + (allCols.length * colW) + (hasSessions ? 60 : 0);

  return (
    <div>
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
          {sessions.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, background: "#1a1a1a", border: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#aaa" }}>{s.label}</span>
              <button onClick={() => setSessions(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      </Card>

      {/* Session Timeline Table */}
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
                  <div style={{ padding: "6px 16px", background: "#111", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}22` }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: MUTED, letterSpacing: "0.16em", textTransform: "uppercase" }}>{grp.label}</span>
                  </div>
                  {grpRows.map((row, ri) => {
                    const curVal  = currentCol.metrics?.[row.key];
                    const prevCol = hasSessions ? sessionCols[sessionCols.length - 1] : null;
                    return (
                      <div key={row.key} style={{ display: "flex", alignItems: "center", background: ri % 2 === 0 ? "#111" : "transparent", borderBottom: `1px solid ${BORDER}22` }}>
                        <div style={{ width: labelW, flexShrink: 0, padding: "9px 16px", fontSize: 11, fontWeight: 600, color: "#ccc" }}>{row.label}</div>
                        {allCols.map((col, ci) => {
                          const val = col.metrics?.[row.key];
                          const hasV = val != null && val !== "";
                          const prevC = ci > 0 ? allCols[ci - 1] : null;
                          const prevV = prevC?.metrics?.[row.key];
                          const cellDelta = prevC ? delta(val, prevV, row.higher) : null;
                          return (
                            <div key={col.key} style={{ width: colW, flexShrink: 0, padding: "9px 8px", textAlign: "center" }}>
                              <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: col.isCurrent ? 800 : 400, color: col.isCurrent ? WHITE : "#888" }}>
                                {hasV ? `${val}${row.u}` : <span style={{ color: "#333" }}>—</span>}
                              </div>
                              {cellDelta && hasV && (
                                <div style={{ fontSize: 9, fontWeight: 700, color: deltaColor(cellDelta.dir), marginTop: 1 }}>
                                  {deltaArrow(cellDelta.dir)}{cellDelta.diff !== "0.0" ? ` ${cellDelta.diff}` : ""}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {hasSessions && (
                          <div style={{ width: 60, flexShrink: 0, padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {row.spark ? <Sparkline rowKey={row.key} /> : null}
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

        <div style={{ padding: "10px 16px", background: "#0f0f0f", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          {[[LIME, "▲ Improved"], [RED_BAD, "▼ Declined"], [GOLD, "= Unchanged"], [MUTED, "~ Neutral"]].map(([c, l]) => (
            <span key={l} style={{ fontSize: 10, fontWeight: 700, color: c }}>{l}</span>
          ))}
          {hasSessions && <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>Sparklines show full session trend (left = earliest, right = today)</span>}
        </div>
      </div>

      {/* Progress Note */}
      <Card title="Progress Note Generator" accent>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          Generates a structured clinical progress note from all current testing data{hasSessions ? ", with direct comparison against the most recent previous session" : ""}. Only sections with entered data appear.
        </div>
        <button onClick={generateParagraph} style={{ padding: "12px 32px", borderRadius: 10, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", background: LIME, color: BLACK, border: "none", marginBottom: 14 }}>
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

// ─── TAB 4: PHYSICIAN LETTER ──────────────────────────────────────────────────
function LetterTab({ currentData: d, setData }) {
  const [ptName,       setPtName]    = useState("");
  const [therapistName,setTherapist] = useState("");
  const [clinic,       setClinic]    = useState("Train Recover Move");
  const [letter,       setLetter]    = useState("");
  const [copied,       setCopied]    = useState(false);

  const impression    = d.impression || "";
  const setImpression = (v) => setData(p => ({ ...p, impression: v }));

  const generate = () => setLetter(buildShoulderLetter(d, ptName, therapistName, clinic, impression));
  const copy = () => {
    navigator.clipboard.writeText(letter)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
      .catch(() => {
        try {
          const ta = document.createElement("textarea");
          ta.value = letter; ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
          document.body.appendChild(ta); ta.focus(); ta.select();
          document.execCommand("copy"); document.body.removeChild(ta);
          setCopied(true); setTimeout(() => setCopied(false), 2500);
        } catch (e2) {}
      });
  };

  return (
    <div>
      <Card title="Letter Settings" accent>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          All testing data is pulled from the Testing tab automatically. Only sections with entered data appear. Fill in your clinical impression below — that is the only section requiring manual input.
        </div>
        <R3>
          <Field label="Patient Name"                 type="text" value={ptName}        onChange={setPtName}     placeholder="Full name"             step={null} />
          <Field label="Therapist Name + Credentials" type="text" value={therapistName} onChange={setTherapist}  placeholder="Jane Smith, DPT, SCS"  step={null} />
          <Field label="Clinic / Organization"        type="text" value={clinic}        onChange={setClinic}     placeholder="Train Recover Move"     step={null} />
        </R3>
        <div style={{ fontSize: 11, color: MUTED, marginTop: -4 }}>Surgeon name is carried automatically from the Testing tab.</div>
      </Card>

      <Card title="Clinical Impression">
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>
          Write 2–4 sentences summarizing your clinical interpretation: overall trajectory, specific deficits that remain, and your recommendation regarding return-to-sport readiness. This is the only manual section.
        </div>
        <textarea
          style={{ ...inp, height: 130, resize: "vertical", lineHeight: 1.7, fontSize: 13 }}
          placeholder="e.g. Patient is demonstrating meaningful progress in rotator cuff strength symmetry with ER LSI improving from 74% to 89% over the past 8 weeks. Strength values are approaching but have not yet reached the ≥90% LSI threshold required for return-to-sport clearance. CKCUEST and posterior endurance performance are within normal limits. We plan to advance through the sport-specific strengthening phase and repeat formal testing in 6 weeks prior to return-to-sport consideration."
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

function RTSTab({ data: d, setData: setD }) {
  const inv      = d.patient.involvedSide;
  const invR     = inv === "Right";
  const uninv    = invR ? "Left" : "Right";
  const isContact    = d.patient.athleteCategory === "contact";
  const isNonContact = d.patient.athleteCategory === "non-contact";
  const isDominant   = d.patient.armDominance === "dominant";

  const strLsiThreshold = isDominant ? 110 : 90;
  const shotPutTarget   = isDominant ? 110 : 90;

  const calcLSIRTS = (a, b) => { if (!hasVal(a) || !hasVal(b) || toNum(b) === 0) return null; return ((toNum(a)/toNum(b))*100).toFixed(1); };

  const erRnm  = calcTorqueNm(d.erForceR, d.leverArm);
  const erLnm  = calcTorqueNm(d.erForceL, d.leverArm);
  const irRnm  = calcTorqueNm(d.irForceR, d.leverArm);
  const irLnm  = calcTorqueNm(d.irForceL, d.leverArm);
  const erRnorm = calcNorm(erRnm, d.bw); const erLnorm = calcNorm(erLnm, d.bw);
  const irRnorm = calcNorm(irRnm, d.bw); const irLnorm = calcNorm(irLnm, d.bw);
  const erLSI = invR ? calcLSI(erRnorm, erLnorm) : calcLSI(erLnorm, erRnorm);
  const irLSI = invR ? calcLSI(irRnorm, irLnorm) : calcLSI(irLnorm, irRnorm);
  const scLSI = calcLSI(invR ? d.scaptionForceR : d.scaptionForceL, invR ? d.scaptionForceL : d.scaptionForceR);

  const ash = d.ash || {};
  const func = d.functional || {};
  const pe   = d.posteriorEndurance || {};

  const ashIsoILSI = calcLSI(ash.isoIInvLoad, ash.isoIUninvLoad);
  const ashIsoTLSI = calcLSI(ash.isoTInvLoad, ash.isoTUninvLoad);
  const ashIsoYLSI = calcLSI(ash.isoYInvLoad, ash.isoYUninvLoad);
  const valdForceLSI = calcLSI(ash.valdPlyoInvPeakForce, ash.valdPlyoUninvPeakForce);
  const valdTimeLSI  = calcLSI(ash.valdPlyoInvTimePeak,  ash.valdPlyoUninvTimePeak);

  const avgTrials = (...vs) => { const ns = vs.map(v => parseFloat(v)).filter(v => !isNaN(v)); return ns.length ? (ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1) : null; };
  const spInvAvg   = invR ? avgTrials(func.shotPutR1,func.shotPutR2,func.shotPutR3) : avgTrials(func.shotPutL1,func.shotPutL2,func.shotPutL3);
  const spUninvAvg = invR ? avgTrials(func.shotPutL1,func.shotPutL2,func.shotPutL3) : avgTrials(func.shotPutR1,func.shotPutR2,func.shotPutR3);
  const shotPutLSI  = calcLSI(spInvAvg || func.shotPutInv, spUninvAvg || func.shotPutUninv);
  const peLSI       = calcLSI(pe.timeInv, pe.timeUninv);

  const ckcVals = [func.ckcuestReps, func.ckcuestReps2, func.ckcuestReps3].map(v => parseFloat(v)).filter(v => !isNaN(v));
  const ckcAvg  = ckcVals.length ? (ckcVals.reduce((a,b)=>a+b,0)/ckcVals.length) : null;

  const calcUEYbal = (m,il,sl,ll) => (hasVal(m)&&hasVal(il)&&hasVal(sl)&&hasVal(ll)&&toNum(ll)>0) ? (((toNum(m)+toNum(il)+toNum(sl))/(3*toNum(ll)))*100).toFixed(1) : null;
  const ueYbalComp = calcUEYbal(func.ueYbalInvMedial, func.ueYbalInvInfLat, func.ueYbalInvSupLat, func.ueYbalInvLimbLength);

  const profile = !d.patient.athleteCategory || !d.patient.armDominance
    ? null
    : `${isDominant ? "Dominant" : "Non-Dominant"} & ${isContact ? "Contact" : "Non-Contact"}`;

  const toggleRomWNL = () => setD(p => ({ ...p, romWNL: !p.romWNL }));

  const mkCriterion = (label, value, target, passValue, unit = "%", notes = "") => {
    const hasData = hasVal(value);
    const numVal  = parseFloat(value);
    const passes  = hasData && numVal >= target;
    const approaching = hasData && !passes && numVal >= target - 10;
    const color   = !hasData ? MUTED : passes ? LIME : approaching ? GOLD : RED_BAD;
    const badge   = !hasData ? "No Data" : passes ? "PASS" : approaching ? "APPROACHING" : "FAIL";
    return { label, value, target, passes, approaching, hasData, color, badge, unit, notes };
  };

  const universalCriteria = [
    { label: "Shoulder ROM Within Normal Limits", manual: true, passes: d.romWNL, hasData: true, color: d.romWNL ? LIME : RED_BAD, badge: d.romWNL ? "PASS" : "NOT CONFIRMED", notes: "Clinician-confirmed toggle" },
    { ...mkCriterion("ER Strength LSI", erLSI, strLsiThreshold, strLsiThreshold), notes: `Involved vs uninvolved — target ≥${strLsiThreshold}%` },
    { ...mkCriterion("IR Strength LSI", irLSI, strLsiThreshold, strLsiThreshold), notes: `Involved vs uninvolved — target ≥${strLsiThreshold}%` },
    { ...mkCriterion("Scaption LSI",    scLSI, strLsiThreshold, strLsiThreshold), notes: `Involved vs uninvolved — target ≥${strLsiThreshold}%` },
    { ...mkCriterion("ASH ISO I LSI",  ashIsoILSI, 90, 90), notes: "≥90% each position" },
    { ...mkCriterion("ASH ISO T LSI",  ashIsoTLSI, 90, 90), notes: "" },
    { ...mkCriterion("ASH ISO Y LSI",  ashIsoYLSI, 90, 90), notes: "" },
    { ...mkCriterion("VALD Peak Force LSI", valdForceLSI, strLsiThreshold, strLsiThreshold), notes: `Plyo push-up — target ≥${strLsiThreshold}%` },
    { ...mkCriterion("VALD Time to Peak LSI", valdTimeLSI, 90, 90), notes: "<10% asymmetry (≥90% LSI)" },
    { ...mkCriterion("CKCUEST", ckcAvg !== null ? String(ckcAvg) : "", 21, 21), unit: " reps", notes: "≥21 reps / 15 sec" },
  ];

  const contactCriteria = isContact ? [
    { ...mkCriterion("UE Y-Balance Composite", ueYbalComp, 90, 90), notes: "Involved limb composite ≥90%" },
  ] : [];

  const nonContactCriteria = isNonContact ? [
    { ...mkCriterion("Seated Shot Put LSI", shotPutLSI, shotPutTarget, shotPutTarget), notes: `Average distance LSI ≥${shotPutTarget}%` },
    { ...mkCriterion("Posterior Endurance Time LSI", peLSI, 90, 90), notes: "Time held ≥90% LSI" },
  ] : [];

  const allCriteria = [...universalCriteria, ...contactCriteria, ...nonContactCriteria];
  const totalCriteria = allCriteria.filter(c => c.hasData || c.manual);
  const passingCriteria = allCriteria.filter(c => c.passes);
  const allPass = totalCriteria.length > 0 && totalCriteria.every(c => c.passes);

  const CriterionRow = ({ c }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#111", borderRadius: 10, border: `1px solid ${c.color}33`, marginBottom: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: c.color+"18", border: `1.5px solid ${c.color}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>{c.passes ? "✓" : c.hasData ? "✗" : "—"}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: WHITE }}>{c.label}</div>
        {c.notes && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{c.notes}</div>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {c.hasData && c.value !== undefined && !c.manual && (
          <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "monospace", color: c.color }}>
            {c.value}{c.unit}
          </div>
        )}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: c.color, marginTop: 2 }}>{c.badge}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", background: `linear-gradient(90deg,${LIME}14,transparent)`, borderBottom: `1px solid ${LIME}33` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: LIME, letterSpacing: "0.18em", textTransform: "uppercase" }}>Return-to-Sport — Pass / Fail Summary</div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          {!profile ? (
            <div style={{ padding: "14px", borderRadius: 8, background: GOLD+"10", border: `1px solid ${GOLD}44`, fontSize: 12, color: GOLD }}>
              ⚠ Set Athlete Category and Arm Dominance in the Testing tab to generate the RTS criteria checklist.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Athlete Profile</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: WHITE }}>{profile}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>
                  Strength LSI threshold: <span style={{ color: LIME, fontWeight: 700 }}>≥{strLsiThreshold}%</span>
                  {isNonContact && isDominant && <span style={{ color: GOLD }}> · BW ratios are primary metric for throwers</span>}
                </div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Criteria Met</div>
                <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: allPass ? LIME : passingCriteria.length > 0 ? GOLD : RED_BAD }}>
                  {passingCriteria.length}/{allCriteria.length}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: allPass ? LIME : GOLD, marginTop: 2 }}>
                  {allPass ? "✓ ALL CRITERIA MET" : "IN PROGRESS"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {profile && (
        <>
          {/* ROM Toggle */}
          <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 20, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: LIME, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>ROM — Clinician Assessment</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={toggleRomWNL}
                style={{ padding: "10px 24px", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", background: d.romWNL ? LIME : "transparent", border: `2px solid ${d.romWNL ? LIME : BORDER}`, color: d.romWNL ? BLACK : MUTED, transition: "all 0.15s" }}
              >
                {d.romWNL ? "✓ ROM WNL — Confirmed" : "ROM WNL — Click to Confirm"}
              </button>
              <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
                Clinician confirms shoulder ROM is within normal limits for sport-specific demands.
              </span>
            </div>
          </div>

          {/* Universal Criteria */}
          <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", background: "#161616", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#888", letterSpacing: "0.15em", textTransform: "uppercase" }}>Universal Criteria — All Athletes</div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {universalCriteria.map((c, i) => <CriterionRow key={i} c={c} />)}
            </div>
          </div>

          {/* Contact Criteria */}
          {isContact && (
            <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BLUE}44`, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", background: BLUE+"10", borderBottom: `1px solid ${BLUE}33` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: BLUE, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {isDominant ? "Dominant & Contact — Injury-Specific Criteria" : "Non-Dominant & Contact — Injury-Specific Criteria"}
                </div>
              </div>
              <div style={{ padding: "16px 20px" }}>
                {contactCriteria.map((c, i) => <CriterionRow key={i} c={c} />)}
                <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, background: BLUE+"0a", border: `1px solid ${BLUE}22`, fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
                  UE Y-Balance composite score ≥90% required for contact athlete clearance.
                </div>
              </div>
            </div>
          )}

          {/* Non-Contact Criteria */}
          {isNonContact && (
            <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${GOLD}44`, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", background: GOLD+"0a", borderBottom: `1px solid ${GOLD}33` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {isDominant ? "Dominant & Non-Contact — Injury-Specific Criteria" : "Non-Dominant & Non-Contact — Injury-Specific Criteria"}
                </div>
              </div>
              <div style={{ padding: "16px 20px" }}>
                {nonContactCriteria.map((c, i) => <CriterionRow key={i} c={c} />)}
                {isDominant && (
                  <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, background: GOLD+"0a", border: `1px solid ${GOLD}22`, fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
                    Dominant non-contact athletes (throwers): strength assessed primarily via BW ratios (ER:BW 12–15%, IR:BW ~25%, Scaption:BW 15–20%). Shot put target ≥110% LSI.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BW Ratio Reference */}
          <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", background: "#161616", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#888", letterSpacing: "0.15em", textTransform: "uppercase" }}>BW Ratio Reference — Dominant Arm (Throwers)</div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "ER:IR Ratio", target: "65–70%", desc: "External to internal rotation" },
                  { label: "ER:BW",       target: "12–15%", desc: "ER force relative to bodyweight" },
                  { label: "IR:BW",       target: "~25%",   desc: "IR force relative to bodyweight" },
                  { label: "Scaption:BW", target: "15–20%", desc: "Scaption relative to bodyweight" },
                ].map(r => (
                  <div key={r.label} style={{ padding: "10px 14px", background: "#111", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: WHITE }}>{r.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "monospace", color: LIME, margin: "4px 0" }}>{r.target}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PlaceholderTab({ label, description }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: LIME+"14", border: `1px solid ${LIME}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 20 }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: WHITE, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 12, color: MUTED, maxWidth: 360, lineHeight: 1.7 }}>{description}</div>
    </div>
  );
}

export default function App() {
  const [activeTab,    setActiveTab]    = useState(0);
  const [saving,       setSaving]       = useState(false);
  const [loadMsg,      setLoadMsg]      = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, file: null, fileName: "" });
  const [newPtModal,   setNewPtModal]   = useState(false);
  const [sessions,     setSessions]     = useState([]);
  const [data,         setData]         = useState(BLANK_DATA);
  const [storageRestored, setStorageRestored] = useState(false);
  const [restoreComplete, setRestoreComplete] = useState(false);
  const fileInputRef    = useRef(null);
  const compareInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        let parsedData = null;
        try { const saved = await window.storage.get("trm_shoulder_autosave"); if (saved && saved.value) parsedData = JSON.parse(saved.value); } catch (e) {}
        if (!parsedData) { try { const local = localStorage.getItem("trm_shoulder_autosave_local"); if (local) parsedData = JSON.parse(local); } catch (e) {} }
        if (parsedData) { const hasData = parsedData.patient?.date || parsedData.patient?.surgeon || parsedData.bw; if (hasData) { setData(parsedData); setStorageRestored(true); setTimeout(() => setStorageRestored(false), 5000); } }
      } catch (e) {} finally { setRestoreComplete(true); }
    })();
  }, []);

  useEffect(() => {
    if (!restoreComplete) return;
    const serialized = JSON.stringify(data);
    try { localStorage.setItem("trm_shoulder_autosave_local", serialized); } catch (e) {}
    (async () => { try { await window.storage.set("trm_shoulder_autosave", serialized); } catch (e) {} })();
  }, [data, restoreComplete]);

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
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
          setLoadMsg({ type: "success", text: "PDF saved. If no download dialog appeared, check the new tab that opened — use File → Export as PDF or the download icon to save it." });
          setTimeout(() => setLoadMsg(null), 14000);
        }
      }
    } catch (e) {
      setLoadMsg({ type: "error", text: "Save failed: " + e.message });
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
    } catch (e) {
      setLoadMsg({ type: "error", text: "Share failed: " + e.message });
      setTimeout(() => setLoadMsg(null), 8000);
    }
    setSaving(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    setConfirmModal({ open: true, file, fileName: file.name });
  };

  const doLoadFile = async () => {
    const file = confirmModal.file;
    setConfirmModal({ open: false, file: null, fileName: "" });
    await loadSessionPDF(file, (sessionData) => {
      const dateLabel = sessionData.patient?.date || "Previous Session";
      const wks = sessionData.patient?.weeksPostOp;
      const label = wks ? `${dateLabel} (Wk ${wks})` : dateLabel;
      setSessions(prev => {
        const exists = prev.findIndex(s => s.label === label);
        if (exists >= 0) { const n = [...prev]; n[exists] = { data: sessionData, label, date: dateLabel }; return n; }
        return [{ data: sessionData, label, date: dateLabel }, ...prev].slice(0, 5);
      });
      setData(sessionData);
      setLoadMsg({ type: "success", text: `Session loaded from ${dateLabel} — fields restored. Comparison tab updated.` });
      setTimeout(() => setLoadMsg(null), 5000);
    }, (errMsg) => { setLoadMsg({ type: "error", text: errMsg }); setTimeout(() => setLoadMsg(null), 6000); });
  };

  const handleCompareFileChange = async (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    await loadSessionPDF(file, (sessionData) => {
      const dateLabel = sessionData.patient?.date || "Session";
      const wks = sessionData.patient?.weeksPostOp;
      const label = wks ? `${dateLabel} (Wk ${wks})` : dateLabel;
      setSessions(prev => {
        const exists = prev.findIndex(s => s.label === label);
        if (exists >= 0) { const n = [...prev]; n[exists] = { data: sessionData, label, date: dateLabel }; return n; }
        if (prev.length >= 5) { setLoadMsg({ type: "error", text: "Maximum of 5 comparison sessions reached." }); setTimeout(() => setLoadMsg(null), 5000); return prev; }
        return [...prev, { data: sessionData, label, date: dateLabel }];
      });
      setLoadMsg({ type: "success", text: `Added ${label} to comparison.` });
      setTimeout(() => setLoadMsg(null), 4000);
    }, (errMsg) => { setLoadMsg({ type: "error", text: errMsg }); setTimeout(() => setLoadMsg(null), 6000); });
  };

  const doNewPatient = async () => {
    setData(BLANK_DATA); setSessions([]); setNewPtModal(false); setActiveTab(0);
    try { await window.storage.delete("trm_shoulder_autosave"); } catch (e) {}
    try { localStorage.removeItem("trm_shoulder_autosave_local"); } catch (e) {}
  };

  return (
    <div style={{ background: BLACK, minHeight: "100vh", color: WHITE, fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
      <ConfirmModal open={confirmModal.open} fileName={confirmModal.fileName} onConfirm={doLoadFile} onCancel={() => setConfirmModal({ open: false, file: null, fileName: "" })} />
      <NewPatientModal open={newPtModal} onConfirm={doNewPatient} onCancel={() => setNewPtModal(false)} />

      <div style={{ background: DARK, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <svg viewBox="0 0 867 352" xmlns="http://www.w3.org/2000/svg" style={{ height:44, width:"auto", display:"block", color:WHITE, flexShrink:0 }} aria-label="TRM" role="img"><path fillRule="evenodd" fill="currentColor" d="M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z" /></svg>
              <span style={{ color: BORDER, fontSize: 18 }}>|</span>
              <span className="trm-header-subtitle" style={{ fontSize: 11, fontWeight: 700, color: "#777", letterSpacing: "0.08em", textTransform: "uppercase" }}>Shoulder Testing & Outcome Measures</span>
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
                <div className="trm-tab-sub" style={{ fontSize: 9, color: activeTab === i ? LIME+"88" : "#444", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {storageRestored && (
          <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 10, border: `1px solid ${BLUE}55`, background: BLUE+"12", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16 }}>💾</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>Session auto-restored — your data was saved from your last visit.</span>
            <button onClick={() => setStorageRestored(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}
        {loadMsg && (
          <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 10, border: `1px solid ${loadMsg.type === "success" ? LIME+"55" : RED_BAD+"55"}`, background: loadMsg.type === "success" ? LIME+"12" : RED_BAD+"12", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16 }}>{loadMsg.type === "success" ? "✓" : "⚠"}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: loadMsg.type === "success" ? LIME : RED_BAD }}>{loadMsg.text}</span>
            <button onClick={() => setLoadMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}
        {activeTab === 0 && <Tab1 data={data} setData={setData} />}
        {activeTab === 1 && <ShoulderCompTab currentData={data} sessions={sessions} setSessions={setSessions} onAddSession={() => compareInputRef.current.click()} />}
        {activeTab === 2 && <RTSTab data={data} setData={setData} />}
        {activeTab === 3 && <LetterTab currentData={data} setData={setData} />}
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 20px", textAlign: "center" }}>
        <svg viewBox="0 0 867 352" xmlns="http://www.w3.org/2000/svg" style={{ height:15, width:"auto", display:"inline-block", verticalAlign:"middle", color:WHITE }} aria-label="TRM" role="img"><path fillRule="evenodd" fill="currentColor" d="M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z" /></svg>
        <span style={{ color: MUTED, fontSize: 11, marginLeft: 10 }}>Shoulder Rehabilitation Testing Tool — Not a substitute for clinical judgment</span>
      </div>

      <div className="trm-fab" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", alignItems: "center", gap: 8 }}>

        {/* Split: Reset | Load */}
        <div style={{
          display: "flex", alignItems: "stretch",
          border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, overflow: "hidden",
          background: "rgba(255,255,255,0.05)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
        }}>
          <button
            onClick={() => setNewPtModal(true)}
            style={{
              padding: "8px 12px",
              background: "rgba(248,113,113,0.09)", color: "rgba(248,113,113,0.85)",
              border: "none", cursor: "pointer",
              fontSize: 9, fontWeight: 800,
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
            Reset
          </button>
          <div style={{ width: 1, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              padding: "8px 12px",
              background: "transparent", color: "rgba(255,255,255,0.55)",
              border: "none", cursor: "pointer",
              fontSize: 9, fontWeight: 800,
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
            Load
          </button>
        </div>

        {/* Split: Save PDF | Share */}
        <div style={{
          display: "flex", alignItems: "stretch",
          border: `1px solid ${LIME}52`, borderRadius: 8, overflow: "hidden",
          background: LIME + "0f",
          boxShadow: `0 2px 10px ${LIME}14`,
          opacity: saving ? 0.5 : 1,
        }}>
          <button
            onClick={handleSavePDF}
            disabled={saving}
            style={{
              padding: "8px 14px",
              background: "transparent", color: LIME + "f2",
              border: "none", cursor: saving ? "default" : "pointer",
              fontSize: 9, fontWeight: 800,
              letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
            {saving ? "Saving…" : "Save PDF"}
          </button>
          <div style={{ width: 1, background: LIME + "40", flexShrink: 0 }} />
          <button
            onClick={handleAirDrop}
            disabled={saving}
            title="Share / AirDrop"
            style={{
              padding: "6px 10px",
              background: "transparent",
              border: "none", cursor: saving ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="10" width="16" height="12" rx="2" fill="rgba(56,189,248,0.15)" stroke="rgba(56,189,248,0.9)" strokeWidth="1.5"/>
              <path d="M12 2V15M12 2L9 5.5M12 2L15 5.5" stroke="rgba(56,189,248,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
