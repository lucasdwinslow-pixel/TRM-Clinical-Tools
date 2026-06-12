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

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LIME     = "#b8ff57";
const LIME_DIM = "#8ed43c";
const BLACK    = "#0a0a0a";
const DARK     = "#111111";
const CARD     = "#181818";
const BORDER   = "#2a2a2a";
const MUTED    = "#555555";
const WHITE    = "#ffffff";
const GOLD     = "#fbbf24";
const RED_BAD  = "#f87171";
const BLUE     = "#38bdf8";
const PURPLE   = "#a78bfa";

// ─── MOBILE STYLES ────────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("trm-concussion-styles")) {
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1";
    document.head.appendChild(meta);
  }
  const s = document.createElement("style");
  s.id = "trm-concussion-styles";
  s.textContent = `
    html, body { overscroll-behavior-y: none; }
    @media (max-width: 600px) {
      .trm-con-r2, .trm-con-r3, .trm-con-r4 { grid-template-columns: 1fr !important; }
      .trm-con-r2-persist { grid-template-columns: 1fr 1fr !important; }
      .trm-con-card-body { padding: 14px !important; }
      .trm-con-header-subtitle { display: none !important; }
      .trm-con-tab-sub { display: none !important; }
      .trm-con-tab-btn { padding: 10px 12px !important; }
      .trm-con-stat-bar { gap: 16px !important; padding: 10px 14px !important; }
      .trm-con-fab { bottom: 16px !important; right: 12px !important; gap: 5px !important; }
      .trm-con-fab button { padding: 10px 12px !important; font-size: 11px !important; min-height: 44px; }
      input[type="number"], input[type="text"], select, textarea {
        font-size: 16px !important; min-height: 44px !important;
      }
    }
  `;
  document.head.appendChild(s);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const toNum  = (v) => parseFloat(v) || 0;
const hasVal = (v) => v !== "" && v !== null && v !== undefined && !isNaN(parseFloat(v));

// ─── CCP SCREENING TOOL SCORING ───────────────────────────────────────────────
// 29-question tool, scored 0=None 1=Mild 2=Moderate 3=Severe
// 5 clinical profiles + 2 modifiers; cutoffs per published tool
const CCP_PROFILES = {
  anxiety:   { label: "Anxiety/Mood",      keys: ["q1","q5","q10","q26","q29"], max: 15, cutoff: 4 },
  cognitive: { label: "Cognitive/Fatigue", keys: ["q13","q24","q28"],           max: 9,  cutoff: 3 },
  migraine:  { label: "Migraine",          keys: ["q2","q6","q11","q20","q27"], max: 15, cutoff: 3 },
  ocular:    { label: "Ocular",            keys: ["q3","q7","q8","q14","q19"],  max: 15, cutoff: 3 },
  vestibular:{ label: "Vestibular",        keys: ["q4","q9","q12","q15","q21"],  max: 15, cutoff: 3 },
  sleep:     { label: "Sleep Modifier",    keys: ["q17","q18","q22","q23"],      max: 12, cutoff: 3 },
  neck:      { label: "Neck Modifier",     keys: ["q16","q25"],                  max: 6,  cutoff: 2 },
};

const ccpScores = (sx) => {
  const out = {};
  Object.entries(CCP_PROFILES).forEach(([id, p]) => {
    const raw = p.keys.reduce((s, k) => s + (parseInt(sx[k]) || 0), 0);
    const avg = raw / p.keys.length;
    out[id] = { raw, avg: Math.round(avg * 100) / 100, positive: raw >= p.cutoff };
  });
  out.total = Object.values(out).reduce((s, v) => s + (v.raw || 0), 0);
  return out;
};

const profileColor = (positive) => positive ? RED_BAD : LIME;

const balanceColor = (errors) => {
  const n = parseInt(errors);
  if (isNaN(n)) return MUTED;
  if (n <= 5) return LIME;
  if (n <= 10) return GOLD;
  return RED_BAD;
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const inp = {
  background: "#1c1c1c", border: "1px solid #2e2e2e", borderRadius: 6,
  padding: "8px 12px", color: WHITE, fontSize: 13, width: "100%",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const lbl = {
  display: "block", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
  color: MUTED, textTransform: "uppercase", marginBottom: 4,
};
const sectionHeader = {
  fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase",
  letterSpacing: "0.12em", marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${BORDER}`,
};

// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────────
function Card({ title, accent, children, id, focusable, activeCard, setActiveCard }) {
  const isActive = focusable ? activeCard === id : false;
  const handleClick = focusable && setActiveCard ? () => setActiveCard(id) : undefined;
  return (
    <div id={id} style={{
      background: CARD, borderRadius: 12, marginBottom: 20, overflow: "hidden",
      border: `1px solid ${accent ? LIME + "44" : isActive ? LIME + "66" : BORDER}`,
      boxShadow: accent ? `0 0 24px ${LIME}18` : isActive ? `0 0 20px ${LIME}22` : "0 2px 12px rgba(0,0,0,0.4)",
      transition: "box-shadow 0.2s, border-color 0.2s",
    }}>
      <div onClick={handleClick} style={{
        padding: "12px 20px",
        background: accent ? `linear-gradient(90deg,${LIME}18,transparent)` : isActive ? `linear-gradient(90deg,${LIME}14,transparent)` : "#161616",
        borderBottom: `1px solid ${accent ? LIME + "33" : isActive ? LIME + "33" : BORDER}`,
        display: "flex", alignItems: "center", gap: 10,
        cursor: focusable ? "pointer" : "default", userSelect: "none",
      }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: accent ? LIME : isActive ? LIME : "#444" }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: accent ? LIME : isActive ? LIME : "#888", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div className="trm-con-card-body" style={{ padding: 20 }}>{children}</div>
    </div>
  );
}
function R2({ children, mb = 12, persist = false }) {
  return <div className={persist ? "trm-con-r2-persist" : "trm-con-r2"} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: mb }}>{children}</div>;
}
function R3({ children, mb = 12 }) {
  return <div className="trm-con-r3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: mb }}>{children}</div>;
}
function R4({ children, mb = 12 }) {
  return <div className="trm-con-r4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: mb }}>{children}</div>;
}
function Field({ label, value, onChange, type = "number", step = "1", placeholder = "—", unit, readOnly }) {
  return (
    <div>
      <label style={lbl}>{label}{unit ? ` (${unit})` : ""}</label>
      <input
        style={readOnly ? { ...inp, color: LIME, background: "#0f0f0f", borderColor: LIME + "33", cursor: "default" } : inp}
        type={readOnly ? "text" : type} step={step} placeholder={placeholder}
        value={value} readOnly={readOnly}
        onChange={readOnly ? undefined : e => onChange(e.target.value)}
      />
    </div>
  );
}
function StatBar({ stats }) {
  return (
    <div className="trm-con-stat-bar" style={{ background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 20px", display: "flex", gap: 28, flexWrap: "wrap", marginTop: 8 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: s.color || LIME, fontFamily: "monospace" }}>{s.value !== null && s.value !== undefined ? s.value : "—"}</div>
        </div>
      ))}
    </div>
  );
}

// CCP Item row: 4-button toggle (None=0, Mild=1, Moderate=2, Severe=3)
const CCP_LABELS = ["None", "Mild", "Moderate", "Severe"];
const CCP_COLORS = [LIME, GOLD, "#fb923c", RED_BAD];
function CcpItem({ num, label, value, onChange }) {
  const v = parseInt(value) ?? 0;
  return (
    <div style={{ marginBottom: 10, display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 10, alignItems: "center" }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textAlign: "right" }}>{num}</span>
      <span style={{ fontSize: 12, color: WHITE, lineHeight: 1.35 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {[0,1,2,3].map(n => (
          <button key={n} onClick={() => onChange(n === v ? 0 : n)} style={{
            width: 36, height: 30, borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: "pointer",
            background: v === n ? CCP_COLORS[n] + "28" : "transparent",
            border: `1.5px solid ${v === n ? CCP_COLORS[n] : BORDER}`,
            color: v === n ? CCP_COLORS[n] : MUTED,
          }}>{n}</button>
        ))}
      </div>
    </div>
  );
}

// Binary toggle button group
function BinaryToggle({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(value === o.v ? "" : o.v)} style={{
          flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, fontWeight: 800,
          cursor: "pointer",
          background: value === o.v ? o.color + "28" : "transparent",
          border: `1.5px solid ${value === o.v ? o.color : BORDER}`,
          color: value === o.v ? o.color : MUTED,
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function ConfirmModal({ open, fileName, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#141414", border: `1px solid ${BORDER}`, borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.8)", overflow: "hidden" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${GOLD}, ${GOLD}88, transparent)` }} />
        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: GOLD + "18", border: `1px solid ${GOLD}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚠</div>
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
            <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${GOLD}66`, background: GOLD + "18", color: GOLD, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Yes, Load File</button>
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
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: RED_BAD + "18", border: `1px solid ${RED_BAD}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✕</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: WHITE, marginBottom: 6 }}>Clear Form for New Patient?</div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>All fields will be reset to blank. Make sure you've saved the current session as a PDF before continuing.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#1a1a1a", color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${RED_BAD}66`, background: RED_BAD + "18", color: RED_BAD, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Clear & Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NOTE BUILDER ─────────────────────────────────────────────────────────────
function buildConcussionNote(d) {
  const lines = [];

  // ACL-style plain-text indentation: section titles at column 0,
  // primary items at 3 spaces, sub-detail at 6 spaces. No padEnd/padStart
  // column alignment and no box-drawing separators, so the note pastes
  // cleanly into proportional-font EMR fields and renders in the PDF.
  const section = (title) => {
    lines.push("");
    lines.push(title);
  };

  const row    = (label, value) => { if (value !== null && value !== undefined && value !== "") lines.push(`   ${label}: ${value}`); };
  const item   = (value)        => { if (value !== null && value !== undefined && value !== "") lines.push(`   ${value}`); };
  const sub    = (label)        => lines.push(`   ${label}`);
  const detail = (value)        => { if (value !== null && value !== undefined && value !== "") lines.push(`      ${value}`); };
  const br     = ()             => lines.push("");

  // ── Main header ──
  lines.push("OBJECTIVE — CONCUSSION / mTBI EVALUATION");
  row("Date of Testing",         d.patient.date);
  row("Date of Injury",          d.patient.injuryDate);
  row("Sport / Activity",        d.patient.sport);
  row("Provider",                d.patient.provider);
  row("Days Post-Injury",        d.patient.daysPost);
  row("Sex",                     d.patient.sex);
  row("Prior Concussion History",d.patient.concussionHx);

  // ── Mechanism ──
  const mx = d.mechanism || {};
  if (mx.type || mx.loc || mx.activity || mx.amnesia || mx.seizure) {
    section("MECHANISM OF INJURY");
    row("Mechanism Type",           mx.type);
    row("Loss of Consciousness",    mx.loc);
    row("LOC Duration",             mx.locDuration ? mx.locDuration + " min" : null);
    row("Amnesia",                  mx.amnesia);
    row("Activity at Time of Injury", mx.activity);
    row("Seizure",                  mx.seizure);
  }

  // ── CCP ──
  const sx = d.symptoms || {};
  const ccpS = ccpScores(sx);
  const numEndorsed = Object.values(sx).filter(v => parseInt(v) > 0).length;
  const posProfiles = Object.entries(CCP_PROFILES).filter(([id]) => ccpS[id]?.positive).map(([,p]) => p.label);

  section("CCP SCREENING TOOL");
  item(`Total Raw Score: ${ccpS.total}   |   Items Endorsed: ${numEndorsed} / 29`);
  item(posProfiles.length > 0
    ? `Positive Profiles: ${posProfiles.join(", ")}`
    : "No profiles met threshold");
  br();
  sub("Profile Breakdown:");
  Object.entries(CCP_PROFILES).forEach(([id, p]) => {
    const s = ccpS[id];
    const tag = id === "sleep" || id === "neck" ? "modifier" : "profile";
    const status = s.positive ? `POSITIVE (>= ${p.cutoff})` : "Negative";
    detail(`${p.label} (${tag}): ${s.raw}/${p.max} - ${status}`);
  });

  const ccpQList = [
    {key:"q1",label:"Feeling sad"},{key:"q2",label:"Headache when you wake up"},
    {key:"q3",label:"Difficulty/headache looking at screen"},{key:"q4",label:"Dizziness when moving head"},
    {key:"q5",label:"Difficulty turning off thoughts"},{key:"q6",label:"Headache with nausea"},
    {key:"q7",label:"Trouble focusing eyes while reading"},{key:"q8",label:"Frontal headache"},
    {key:"q9",label:"Difficulty in busy environments"},{key:"q10",label:"Constantly thinking about symptoms"},
    {key:"q11",label:"Headache with light/noise sensitivity"},{key:"q12",label:"Motion sickness"},
    {key:"q13",label:"More tired at end of day"},{key:"q14",label:"Blurry or double vision"},
    {key:"q15",label:"Slow wavy dizziness/lightheadedness"},{key:"q16",label:"Neck pain or stiffness"},
    {key:"q17",label:"Sleeping more than usual"},{key:"q18",label:"Sleeping less than usual"},
    {key:"q19",label:"Eye strain during visual activities"},{key:"q20",label:"Visual aura"},
    {key:"q21",label:"Fast spinning dizziness/vertigo"},{key:"q22",label:"Difficulty falling asleep"},
    {key:"q23",label:"Difficulty staying asleep"},{key:"q24",label:"Trouble remembering things"},
    {key:"q25",label:"Difficulty moving neck"},{key:"q26",label:"Feeling nervous/anxious"},
    {key:"q27",label:"Increased headache with physical activity"},{key:"q28",label:"Increased headache with cognitive activity"},
    {key:"q29",label:"Feeling more stressed than usual"},
  ];
  const endorsed = ccpQList.filter(q => parseInt(sx[q.key]) > 0);
  if (endorsed.length > 0) {
    br();
    sub("Endorsed Items:");
    endorsed.forEach(q => {
      const v = parseInt(sx[q.key]);
      const sev = ["None","Mild","Moderate","Severe"][v] || v;
      detail(`Q${q.key.slice(1).padStart(2,"0")} ${q.label}: ${sev} (${v})`);
    });
  }

  // ── Cervical ──
  const cx = d.cervical || {};
  const hasCx = Object.values(cx).some(v => v && v !== "");
  if (hasCx) {
    section("CERVICAL EXAM");
    if (cx.flexion || cx.extension || cx.rightRotation || cx.leftRotation || cx.deepNeckFlexor) {
      sub("Range of Motion:");
      if (cx.flexion)        detail(`Flexion: ${cx.flexion}°`);
      if (cx.extension)      detail(`Extension: ${cx.extension}°`);
      if (cx.rightRotation)  detail(`Right Rotation: ${cx.rightRotation}°`);
      if (cx.leftRotation)   detail(`Left Rotation: ${cx.leftRotation}°`);
      if (cx.deepNeckFlexor) detail(`Deep Neck Flexor Endurance: ${cx.deepNeckFlexor}`);
    }
    const sTests = [
      cx.sharpPurser   && `Sharp Purser: ${cx.sharpPurser}`,
      cx.alarLigament  && `Alar Ligament: ${cx.alarLigament}`,
      cx.sideGlide     && `Side Glide: ${cx.sideGlide}${cx.sideGlideLevels ? " (" + cx.sideGlideLevels + ")" : ""}`,
      cx.cervicalFlexRot && `Cervical Flexion Rotation Test: ${cx.cervicalFlexRot}${cx.cervicalFlexRotSide ? " (" + cx.cervicalFlexRotSide + ")" : ""}`,
      cx.headImpulse   && `Head Impulse: ${cx.headImpulse}${cx.headImpulseSide ? " (" + cx.headImpulseSide + ")" : ""}`,
    ].filter(Boolean);
    if (sTests.length) { br(); sub("Special Tests:"); sTests.forEach(t => detail(t)); }
    if (cx.palpation) { br(); sub(`Palpation: ${cx.palpation}`); }
  }

  // ── VOMS ──
  const vm = d.voms || {};
  const vomsRows = [
    ["baseline","Baseline"],["smoothPursuit","Smooth Pursuit"],["saccadesHorz","Saccades Horizontal"],
    ["saccadesVert","Saccades Vertical"],["convergence","Convergence"],
    ["vorHorz","VOR Horizontal"],["vorVert","VOR Vertical"],["vorCancellation","VOR Cancellation"],
  ];
  const hasVoms = vomsRows.some(([k]) => vm[k] && ["headache","dizziness","nausea","fogginess"].some(col => hasVal(vm[k][col])));
  if (hasVoms) {
    section("VOMS");
    const vomsCols = [["headache","Headache"],["dizziness","Dizziness"],["nausea","Nausea"],["fogginess","Fogginess"]];
    let vomsShown = 0;
    vomsRows.forEach(([key, label]) => {
      const r = vm[key] || {};
      const hasComment = r.comments && r.comments.trim();
      if (vomsCols.some(([c]) => hasVal(r[c])) || hasComment) {
        if (vomsShown > 0) br();
        sub(label);
        vomsCols.forEach(([c, cl]) => detail(`${cl}: ${hasVal(r[c]) ? r[c] : 0}/10`));
        if (hasComment) lines.push(`         Comments: ${r.comments.trim()}`);
        vomsShown++;
      }
    });
  }

  // ── Eye Alignment ──
  const ey = d.eyeAlignment || {};
  const hasEy = Object.values(ey).some(v => v && v !== "");
  if (hasEy) {
    section("EYE ALIGNMENT");
    if (ey.maddoxRightHorz || ey.maddoxRightVert || ey.maddoxLeftHorz || ey.maddoxLeftVert) {
      sub("Maddox Rod:");
      if (ey.maddoxRightHorz || ey.maddoxRightVert)
        detail(`Right: Horizontal = ${ey.maddoxRightHorz || "-"}, Vertical = ${ey.maddoxRightVert || "-"}`);
      if (ey.maddoxLeftHorz || ey.maddoxLeftVert)
        detail(`Left: Horizontal = ${ey.maddoxLeftHorz || "-"}, Vertical = ${ey.maddoxLeftVert || "-"}`);
    }
    if (ey.coverRight || ey.uncoverRight || ey.coverLeft || ey.uncoverLeft) {
      br(); sub("Cover / Uncover Test:");
      if (ey.coverRight || ey.uncoverRight)
        detail(`Right: Cover = ${ey.coverRight || "-"}, Uncover = ${ey.uncoverRight || "-"}`);
      if (ey.coverLeft || ey.uncoverLeft)
        detail(`Left: Cover = ${ey.coverLeft || "-"}, Uncover = ${ey.uncoverLeft || "-"}`);
    }
  }

  // ── Tandem Gait ──
  const tg = d.tandemGait || {};
  const hasTg = Object.values(tg).some(v => hasVal(v));
  if (hasTg) {
    section("TANDEM GAIT");
    if (tg.s1 || tg.s2 || tg.s3) {
      const stimes = [tg.s1,tg.s2,tg.s3].filter(v=>hasVal(v)).map(v=>parseFloat(v));
      sub("Single Task:");
      detail(`Trial 1: ${tg.s1 || "-"} s, Trial 2: ${tg.s2 || "-"} s, Trial 3: ${tg.s3 || "-"} s`);
      if (stimes.length) detail(`Best: ${Math.min(...stimes).toFixed(1)} s - ${Math.min(...stimes) <= 14 ? "Normal (<=14s)" : "Impaired (>14s)"}`);
    }
    if (tg.d1 || tg.d2 || tg.d3) {
      br(); sub("Dual Task:");
      if (tg.d1) detail(`Trial 1 (subtract 7s): ${tg.d1} s`);
      if (tg.d2) detail(`Trial 2 (words backward): ${tg.d2} s`);
      if (tg.d3) detail(`Trial 3 (months backward): ${tg.d3} s`);
    }
  }

  // ── Exertional ──
  const ex = d.exertional || {};
  if (ex.protocol || ex.heartRate || ex.sx_provocation) {
    section("MODIFIED BUFFALO EXERTION TEST");
    row("Protocol",              ex.protocol);
    row("Max HR Achieved",       ex.heartRate ? ex.heartRate + " bpm" : null);
    row("Symptom Provocation",   ex.sx_provocation);
    row("Symptom Threshold HR",  ex.threshold  ? ex.threshold  + " bpm" : null);
    row("Notes",                 ex.notes);
  }

  // ── RTP ──
  if (d.rtpStage || d.rtpNotes) {
    section("RETURN TO PLAY / LEARN STATUS");
    row("Current RTP Stage", d.rtpStage);
    row("Notes",             d.rtpNotes);
  }

  // ── Clinical Notes ──
  if (d.clinicalNotes && d.clinicalNotes.trim()) {
    section("CLINICAL NOTES");
    item(d.clinicalNotes.trim());
  }

  br();
  return lines.join("\n").trim();
}

// ─── PDF SAVE ─────────────────────────────────────────────────────────────────
async function saveSessionPDF(data) {
  const { PDFDocument, rgb, StandardFonts } = await getPdfLib();
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const GRAY   = rgb(0.4, 0.4, 0.4);
  const LGRAY  = rgb(0.85, 0.85, 0.85);
  const BLACK_R = rgb(0.05, 0.05, 0.05);

  const json    = JSON.stringify(data);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  doc.setSubject("TRM_CONCUSSION_V1:" + encoded);
  doc.setTitle("TRM Concussion Session");

  const page = doc.addPage([612, 792]);
  const L = 48, R = 564;
  let y = 744;

  const draw = (text, x, yp, size, f, c) => {
    try { page.drawText(String(text), { x, y: yp, size, font: f || font, color: c || BLACK_R }); } catch(e){}
  };
  const hline = (yp) => page.drawLine({ start: { x: L, y: yp }, end: { x: R, y: yp }, thickness: 0.5, color: LGRAY });

  // Header
  page.drawRectangle({ x: 0, y: 758, width: 612, height: 34, color: rgb(0.04, 0.04, 0.04) });
  draw("TRM", L, 769, 15, fontBold, rgb(1,1,1));
  draw("Concussion / mTBI Evaluation & Documentation", L + 46, 769, 9, font, GRAY);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  draw(today, R - font.widthOfTextAtSize(today, 9), 769, 9, font, GRAY);

  y = 732;
  draw("PATIENT", L, y, 7, fontBold, GRAY);
  y -= 14;
  const ptFields = [
    ["Date", data.patient.date], ["Sport", data.patient.sport],
    ["Provider", data.patient.provider], ["Days Post-Injury", data.patient.daysPost],
    ["Sex", data.patient.sex], ["Prior Concussions", data.patient.concussionHx],
  ].filter(([,v]) => v && String(v).trim() !== "");
  let px = L;
  ptFields.forEach(([lbText, val]) => {
    if (px > R - 80) { px = L; y -= 14; }
    try {
      draw(lbText + ": ", px, y, 8, fontBold, GRAY);
      draw(String(val), px + fontBold.widthOfTextAtSize(lbText + ": ", 8), y, 8, font, BLACK_R);
    } catch(e) {}
    px += 140;
  });
  y -= 16;
  hline(y);
  y -= 12;

  // Note text page
  const noteText = buildConcussionNote(data);
  const page2 = doc.addPage([612, 792]);
  const L2 = 48, R2p = 564;
  let y2 = 744;
  const maxLineWidth = R2p - L2;
  page2.drawRectangle({ x: 0, y: 758, width: 612, height: 34, color: rgb(0.04, 0.04, 0.04) });
  page2.drawText("TRM", { x: L2, y: 769, size: 15, font: fontBold, color: rgb(1,1,1) });
  page2.drawText("Concussion Evaluation — Documentation Note (Plain Text)", { x: L2 + 46, y: 769, size: 9, font, color: GRAY });

  const wrapLine = (text, fnt, size, maxW) => {
    const words = String(text).split(" ");
    const wrapped = []; let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      try {
        if (fnt.widthOfTextAtSize(test, size) <= maxW) { cur = test; }
        else { if (cur) wrapped.push(cur); cur = w; }
      } catch(e) { cur = test; }
    }
    if (cur) wrapped.push(cur);
    return wrapped.length ? wrapped : [""];
  };

  const noteLines = noteText.split("\n");
  for (const rawLine of noteLines) {
    if (y2 < 48) break;
    if (rawLine === "") { y2 -= 7; continue; }
    const isBullet = rawLine.startsWith("  ");
    const isHeader = rawLine === rawLine.toUpperCase() && rawLine.trim().length > 0 && !rawLine.includes(":") && rawLine.trim().length < 80;
    if (isHeader) {
      y2 -= 4;
      page2.drawRectangle({ x: L2 - 4, y: y2 - 3, width: R2p - L2 + 8, height: 15, color: rgb(0.91, 0.91, 0.91) });
      try { page2.drawText(rawLine.trim(), { x: L2, y: y2, size: 8, font: fontBold, color: GRAY }); } catch(e){}
      y2 -= 18;
    } else {
      const fSize = 9;
      const xOffset = isBullet ? L2 + 10 : L2;
      const wrapped = wrapLine(rawLine.trim(), font, fSize, maxLineWidth - (isBullet ? 10 : 0));
      for (const wl of wrapped) {
        if (y2 < 48) break;
        try { page2.drawText(wl, { x: xOffset, y: y2, size: fSize, font, color: BLACK_R }); } catch(e){}
        y2 -= 13;
      }
    }
  }
  page2.drawLine({ start: { x: L2, y: 48 }, end: { x: R2p, y: 48 }, thickness: 0.5, color: LGRAY });
  page2.drawText("TRM Documentation Copy  —  Plain text for EMR entry.", { x: L2, y: 36, size: 7, font, color: GRAY });

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const filename = `TRM_Concussion_${new Date().toISOString().slice(0,10)}.pdf`;
  return { blob, filename };
}

async function loadSessionPDF(file, onData, onError) {
  try {
    const { PDFDocument } = await getPdfLib();
    const arrayBuffer = await file.arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer);
    const subject = doc.getSubject();
    if (!subject || !subject.startsWith("TRM_CONCUSSION_V1:")) {
      onError("This PDF doesn't contain TRM Concussion session data. Make sure you're uploading a PDF saved from this app.");
      return;
    }
    const encoded    = subject.replace("TRM_CONCUSSION_V1:", "");
    const json       = decodeURIComponent(escape(atob(encoded)));
    const sessionData = JSON.parse(json);
    onData(sessionData);
  } catch (e) {
    onError("Could not read session data from this PDF. The file may be corrupted or from an incompatible version.");
  }
}

// ─── BLANK DATA ───────────────────────────────────────────────────────────────
const BLANK_SX = {
  // Anxiety/Mood profile
  q1:0, q5:0, q10:0, q26:0, q29:0,
  // Cognitive/Fatigue profile
  q13:0, q24:0, q28:0,
  // Migraine profile
  q2:0, q6:0, q11:0, q20:0, q27:0,
  // Ocular profile
  q3:0, q7:0, q8:0, q14:0, q19:0,
  // Vestibular profile
  q4:0, q9:0, q12:0, q15:0, q21:0,
  // Sleep modifier
  q17:0, q18:0, q22:0, q23:0,
  // Neck modifier
  q16:0, q25:0,
};

const BLANK_VOMS_ROW = { headache: "", dizziness: "", nausea: "", fogginess: "", comments: "" };
const BLANK_DATA = {
  patient: { date: "", injuryDate: "", sport: "", provider: "", daysPost: "", sex: "Male", concussionHx: "None" },
  mechanism: { type: "", loc: "", locDuration: "", amnesia: "", activity: "", seizure: "" },
  symptoms: { ...BLANK_SX },
  cervical: {
    flexion: "", extension: "", rightRotation: "", leftRotation: "", deepNeckFlexor: "",
    sharpPurser: "", alarLigament: "",
    sideGlide: "", sideGlideLevels: "",
    cervicalFlexRot: "", cervicalFlexRotSide: "",
    headImpulse: "", headImpulseSide: "",
    palpation: "",
  },
  voms: {
    baseline:        { ...BLANK_VOMS_ROW },
    smoothPursuit:   { ...BLANK_VOMS_ROW },
    saccadesHorz:    { ...BLANK_VOMS_ROW },
    saccadesVert:    { ...BLANK_VOMS_ROW },
    convergence:     { ...BLANK_VOMS_ROW },
    vorHorz:         { ...BLANK_VOMS_ROW },
    vorVert:         { ...BLANK_VOMS_ROW },
    vorCancellation: { ...BLANK_VOMS_ROW },
  },
  eyeAlignment: {
    maddoxRightHorz: "", maddoxRightVert: "",
    maddoxLeftHorz: "",  maddoxLeftVert: "",
    coverRight: "", uncoverRight: "",
    coverLeft: "",  uncoverLeft: "",
  },
  tandemGait: { s1: "", s2: "", s3: "", d1: "", d2: "", d3: "" },
  exertional: { protocol: "", heartRate: "", sx_provocation: "", threshold: "", notes: "" },
  rtpStage: "", rtpNotes: "",
  healthStatus: "", siqr: "",
  clinicalNotes: "", noteText: "",
};

// ─── TAB 1: TESTING ───────────────────────────────────────────────────────────
function Tab1({ data: d, setData: setD }) {
  const sd    = (k, v) => setD(p => ({ ...p, [k]: v }));
  const setP  = (k, v) => sd("patient",      { ...d.patient,      [k]: v });
  const setMx = (k, v) => sd("mechanism",    { ...d.mechanism,    [k]: v });
  const setSx = (k, v) => sd("symptoms",     { ...d.symptoms,     [k]: v });
  const setCx = (k, v) => sd("cervical",     { ...d.cervical,     [k]: v });
  const setVr = (row, k, v) => sd("voms",    { ...d.voms, [row]: { ...d.voms[row], [k]: v } });
  const setEy = (k, v) => sd("eyeAlignment", { ...d.eyeAlignment, [k]: v });
  const setTg = (k, v) => sd("tandemGait",   { ...d.tandemGait,   [k]: v });
  const setEx = (k, v) => sd("exertional",   { ...d.exertional,   [k]: v });

  const [activeCard, setActiveCard] = useState("patient");
  const [noteCopied, setNoteCopied] = useState(false);

  const sx  = d.symptoms     || {};
  const cx  = d.cervical     || {};
  const vm  = d.voms         || {};
  const ey  = d.eyeAlignment || {};
  const tg  = d.tandemGait   || {};
  const ex  = d.exertional   || {};
  const scores = ccpScores(sx);
  const numSx = Object.values(sx).filter(v => parseInt(v) > 0).length;

  const generateNote = () => sd("noteText", buildConcussionNote(d));
  const copyNote = () => {
    navigator.clipboard.writeText(d.noteText).then(() => {
      setNoteCopied(true);
      setTimeout(() => setNoteCopied(false), 2500);
    });
  };

  // CCP question definitions ordered by question number, with profile tag
  const CCP_QUESTIONS = [
    { key:"q1",  num:1,  label:"Feeling sad" },
    { key:"q2",  num:2,  label:"Headache when you wake up" },
    { key:"q3",  num:3,  label:"Difficulty or headache when looking at a phone or computer screen" },
    { key:"q4",  num:4,  label:"Dizziness when you move your head" },
    { key:"q5",  num:5,  label:"Difficulty turning off your thoughts (e.g., rumination)" },
    { key:"q6",  num:6,  label:"Headache with nausea or upset stomach" },
    { key:"q7",  num:7,  label:"Trouble focusing your eyes while reading" },
    { key:"q8",  num:8,  label:"Frontal headache" },
    { key:"q9",  num:9,  label:"Difficulty or discomfort in busy environments" },
    { key:"q10", num:10, label:"Constantly thinking about your symptoms" },
    { key:"q11", num:11, label:"Headache with sensitivity to light or noise" },
    { key:"q12", num:12, label:"Feeling motion sick (\"sea or car sick\")" },
    { key:"q13", num:13, label:"Feeling more tired at the end of the day" },
    { key:"q14", num:14, label:"Blurry or double vision" },
    { key:"q15", num:15, label:"Slow wavy dizziness / lightheadedness" },
    { key:"q16", num:16, label:"Neck pain or stiffness" },
    { key:"q17", num:17, label:"Sleeping more than usual" },
    { key:"q18", num:18, label:"Sleeping less than usual" },
    { key:"q19", num:19, label:"Eye strain (eyes feel tired) during visual activities" },
    { key:"q20", num:20, label:"Visual aura (flashes, stars, spots, flickering light) with or without headache" },
    { key:"q21", num:21, label:"Fast spinning dizziness / vertigo" },
    { key:"q22", num:22, label:"Difficulty falling asleep" },
    { key:"q23", num:23, label:"Difficulty staying asleep" },
    { key:"q24", num:24, label:"Trouble remembering things (e.g., what you completed today, having to re-read info)" },
    { key:"q25", num:25, label:"Difficulty moving your neck" },
    { key:"q26", num:26, label:"Feeling nervous or anxious" },
    { key:"q27", num:27, label:"Increased headache following physical activity" },
    { key:"q28", num:28, label:"Increased headache following cognitive activity" },
    { key:"q29", num:29, label:"Feeling more stressed than usual" },
  ];

  // Profile color map for badges
  const Q_PROFILE_MAP = {
    q1:"anxiety", q5:"anxiety", q10:"anxiety", q26:"anxiety", q29:"anxiety",
    q13:"cognitive", q24:"cognitive", q28:"cognitive",
    q2:"migraine", q6:"migraine", q11:"migraine", q20:"migraine", q27:"migraine",
    q3:"ocular", q7:"ocular", q8:"ocular", q14:"ocular", q19:"ocular",
    q4:"vestibular", q9:"vestibular", q12:"vestibular", q15:"vestibular", q21:"vestibular",
    q17:"sleep", q18:"sleep", q22:"sleep", q23:"sleep",
    q16:"neck", q25:"neck",
  };
  const PROFILE_COLOR_MAP = {
    anxiety: PURPLE, cognitive: BLUE, migraine: RED_BAD,
    ocular: GOLD, vestibular: "#34d399", sleep: "#94a3b8", neck: "#f9a8d4",
  };
  const PROFILE_ABBR = {
    anxiety:"ANX", cognitive:"COG", migraine:"MIG", ocular:"OC", vestibular:"VES", sleep:"SLP", neck:"NECK",
  };

  // Profile groups for summary display only
  const CCP_GROUPS = [
    { id:"anxiety",    color: PURPLE,     questions: ["q1","q5","q10","q26","q29"] },
    { id:"cognitive",  color: BLUE,       questions: ["q13","q24","q28"] },
    { id:"migraine",   color: RED_BAD,    questions: ["q2","q6","q11","q20","q27"] },
    { id:"ocular",     color: GOLD,       questions: ["q3","q7","q8","q14","q19"] },
    { id:"vestibular", color: "#34d399",  questions: ["q4","q9","q12","q15","q21"] },
    { id:"sleep",      color: "#94a3b8",  questions: ["q17","q18","q22","q23"] },
    { id:"neck",       color: "#f9a8d4",  questions: ["q16","q25"] },
  ];



  return (
    <div>
      {/* ── PATIENT INFO ─────────────────────────────────────────────────── */}
      <Card title="Patient Information" accent id="patient" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <R3 mb={12}>
          <Field label="Date of Testing" type="text" value={d.patient.date} onChange={v => setP("date", v)} placeholder="MM/DD/YYYY" step={null} />
          <Field label="Date of Injury" type="text" value={d.patient.injuryDate} onChange={v => setP("injuryDate", v)} placeholder="MM/DD/YYYY" step={null} />
          <Field label="Days Post-Injury" value={d.patient.daysPost} onChange={v => setP("daysPost", v)} step="1" />
        </R3>
        <R3 mb={12}>
          <Field label="Sport / Activity" type="text" value={d.patient.sport} onChange={v => setP("sport", v)} placeholder="e.g. Football, Soccer" step={null} />
          <Field label="Provider" type="text" value={d.patient.provider} onChange={v => setP("provider", v)} placeholder="Clinician name" step={null} />
          <div>
            <label style={lbl}>Biological Sex</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Male", "Female"].map(s => (
                <button key={s} onClick={() => setP("sex", s)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 800,
                  cursor: "pointer",
                  background: d.patient.sex === s ? LIME : "transparent",
                  border: `2px solid ${d.patient.sex === s ? LIME : BORDER}`,
                  color: d.patient.sex === s ? BLACK : MUTED,
                }}>{s}</button>
              ))}
            </div>
          </div>
        </R3>
        <div>
          <label style={lbl}>Prior Concussion History</label>
          <select style={inp} value={d.patient.concussionHx} onChange={e => setP("concussionHx", e.target.value)}>
            <option value="None">None</option>
            <option value="1 prior">1 prior</option>
            <option value="2 prior">2 prior</option>
            <option value="3 or more prior">3 or more prior</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
      </Card>

      {/* ── MECHANISM OF INJURY ───────────────────────────────────────────── */}
      <Card title="Mechanism of Injury" id="mechanism" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <R2 mb={12}>
          <div>
            <label style={lbl}>Mechanism Type</label>
            <select style={inp} value={d.mechanism.type} onChange={e => setMx("type", e.target.value)}>
              <option value="">— Select —</option>
              <option value="Direct blow to head">Direct blow to head</option>
              <option value="Head-to-head contact">Head-to-head contact</option>
              <option value="Head-to-ground contact">Head-to-ground contact</option>
              <option value="Indirect (whiplash)">Indirect (whiplash / body contact)</option>
              <option value="Fall">Fall</option>
              <option value="Motor vehicle accident">Motor vehicle accident</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <Field label="Activity at Time of Injury" type="text" value={d.mechanism.activity} onChange={v => setMx("activity", v)} placeholder="e.g. tackling, heading ball" step={null} />
        </R2>
        <R3 mb={12}>
          <div>
            <label style={lbl}>Loss of Consciousness (LOC)</label>
            <BinaryToggle value={d.mechanism.loc} onChange={v => setMx("loc", v)} options={[
              { v: "No", label: "No", color: LIME },
              { v: "Yes", label: "Yes", color: RED_BAD },
            ]} />
          </div>
          {d.mechanism.loc === "Yes" && (
            <Field label="LOC Duration" unit="min" value={d.mechanism.locDuration} onChange={v => setMx("locDuration", v)} step="0.5" />
          )}
          <div>
            <label style={lbl}>Amnesia</label>
            <select style={inp} value={d.mechanism.amnesia} onChange={e => setMx("amnesia", e.target.value)}>
              <option value="">— Not assessed —</option>
              <option value="None">None</option>
              <option value="Anterograde only">Anterograde only</option>
              <option value="Retrograde only">Retrograde only</option>
              <option value="Both anterograde and retrograde">Both anterograde and retrograde</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Seizure Activity</label>
            <BinaryToggle value={d.mechanism.seizure} onChange={v => setMx("seizure", v)} options={[
              { v: "No", label: "No", color: LIME },
              { v: "Yes", label: "Yes", color: RED_BAD },
            ]} />
          </div>
        </R3>
      </Card>

      {/* ── CCP SCREENING TOOL ───────────────────────────────────────────── */}
      <Card title="Concussion Clinical Profiles (CCP) Screen" id="symptoms" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, lineHeight: 1.6 }}>
          Rate each symptom: <strong style={{ color: LIME }}>0 = None</strong> &nbsp;
          <strong style={{ color: GOLD }}>1 = Mild</strong> &nbsp;
          <strong style={{ color: "#fb923c" }}>2 = Moderate</strong> &nbsp;
          <strong style={{ color: RED_BAD }}>3 = Severe</strong>
        </div>
        {/* Profile legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {CCP_GROUPS.map(g => (
            <span key={g.id} style={{ fontSize: 9, fontWeight: 800, color: scores[g.id]?.positive ? g.color : MUTED, background: scores[g.id]?.positive ? g.color+"14" : "#1a1a1a", border: `1px solid ${scores[g.id]?.positive ? g.color+"55" : BORDER}`, borderRadius: 4, padding: "2px 7px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {PROFILE_ABBR[g.id]} {scores[g.id]?.raw}/{CCP_PROFILES[g.id].max}
            </span>
          ))}
        </div>

        {/* All 29 questions in numerical order */}
        <div>
          {CCP_QUESTIONS.map(q => {
            const profileId = Q_PROFILE_MAP[q.key];
            const profileColor = PROFILE_COLOR_MAP[profileId];
            return (
              <div key={q.key} style={{ marginBottom: 8, display: "grid", gridTemplateColumns: "22px 1fr 36px auto", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textAlign: "right" }}>{q.num}</span>
                <span style={{ fontSize: 12, color: WHITE, lineHeight: 1.3 }}>{q.label}</span>
                <span style={{ fontSize: 8, fontWeight: 800, color: profileColor, background: profileColor+"18", border:`1px solid ${profileColor}44`, borderRadius: 3, padding: "2px 3px", textAlign:"center", letterSpacing:"0.04em" }}>
                  {PROFILE_ABBR[profileId]}
                </span>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0,1,2,3].map(n => {
                    const v = parseInt(sx[q.key]) || 0;
                    return (
                      <button key={n} onClick={() => setSx(q.key, n === v ? 0 : n)} style={{
                        width: 34, height: 28, borderRadius: 5, fontSize: 11, fontWeight: 800, cursor: "pointer",
                        background: v === n ? CCP_COLORS[n]+"28" : "transparent",
                        border: `1.5px solid ${v === n ? CCP_COLORS[n] : BORDER}`,
                        color: v === n ? CCP_COLORS[n] : MUTED,
                      }}>{n}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Results Summary */}
        <div style={{ marginTop: 16, background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Profile Summary</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {CCP_GROUPS.map(group => {
              const s = scores[group.id];
              const profile = CCP_PROFILES[group.id];
              return (
                <div key={group.id} style={{ textAlign: "center", minWidth: 74, background: s.positive ? group.color+"14" : "#181818", border: `1px solid ${s.positive ? group.color+"55" : BORDER}`, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: s.positive ? group.color : MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{profile.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", color: s.positive ? group.color : "#555" }}>{s.raw}</div>
                  <div style={{ fontSize: 8, color: MUTED }}>/{profile.max} · avg {s.avg.toFixed(1)}</div>
                  {s.positive && <div style={{ fontSize: 7, color: group.color, marginTop: 2, fontWeight: 800 }}>✕ POS ≥{profile.cutoff}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Raw</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: WHITE }}>{scores.total}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Items Endorsed</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: numSx > 0 ? GOLD : LIME }}>{numSx}/29</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Positive Profiles</div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: CCP_GROUPS.filter(g => scores[g.id]?.positive).length > 0 ? RED_BAD : LIME }}>
                {CCP_GROUPS.filter(g => scores[g.id]?.positive).length}/{CCP_GROUPS.length}
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => sd("symptoms", { ...BLANK_SX })} style={{ marginTop: 12, padding: "6px 14px", borderRadius: 7, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          Reset All to 0
        </button>
      </Card>

      {/* ── CERVICAL EXAM ────────────────────────────────────────────────── */}
      <Card title="Cervical Exam" id="cervical" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={sectionHeader}>Range of Motion</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
          {[["Flexion","flexion"],["Extension","extension"],["R Rotation","rightRotation"],["L Rotation","leftRotation"],["Deep Neck Flexor End.","deepNeckFlexor"]].map(([label,key]) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <input type="number" style={inp} value={cx[key]} placeholder="°" onChange={e => setCx(key, e.target.value)} />
            </div>
          ))}
        </div>

        <div style={sectionHeader}>Special Tests</div>
        {/* Tests with simple +/- */}
        <div style={{ marginBottom: 10 }}>
          {[["Sharp Purser","sharpPurser"],["Alar Ligament","alarLigament"]].map(([label,key]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom:`1px solid ${BORDER}` }}>
              <span style={{ fontSize: 12, color: WHITE }}>{label}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {[["Positive","+",RED_BAD],["Negative","-",LIME]].map(([lText,val,color]) => (
                  <button key={val} onClick={() => setCx(key, cx[key]===val?"":val)} style={{ padding:"5px 14px", borderRadius:6, fontSize:11, fontWeight:800, cursor:"pointer", background: cx[key]===val ? color+"28":"transparent", border:`1.5px solid ${cx[key]===val?color:BORDER}`, color: cx[key]===val?color:MUTED }}>{lText}</button>
                ))}
              </div>
            </div>
          ))}
          {/* Side glide */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom:`1px solid ${BORDER}` }}>
            <span style={{ fontSize: 12, color: WHITE }}>Side Glide Assessment</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[["Positive","+",RED_BAD],["Negative","-",LIME]].map(([lText,val,color]) => (
                <button key={val} onClick={() => setCx("sideGlide", cx.sideGlide===val?"":val)} style={{ padding:"5px 14px", borderRadius:6, fontSize:11, fontWeight:800, cursor:"pointer", background: cx.sideGlide===val ? color+"28":"transparent", border:`1.5px solid ${cx.sideGlide===val?color:BORDER}`, color: cx.sideGlide===val?color:MUTED }}>{lText}</button>
              ))}
              <div style={{ marginLeft: 8 }}>
                <input type="text" style={{ ...inp, width: 110 }} value={cx.sideGlideLevels} placeholder="Levels (e.g. C2-3)" onChange={e => setCx("sideGlideLevels", e.target.value)} />
              </div>
            </div>
          </div>
          {/* Tests with R/L */}
          {[["Cervical Flexion Rotation Test","cervicalFlexRot"],["Head Impulse (Thrust)","headImpulse"]].map(([label,key]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom:`1px solid ${BORDER}` }}>
              <span style={{ fontSize: 12, color: WHITE }}>{label}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {[["Positive","+",RED_BAD],["Negative","-",LIME]].map(([lText,val,color]) => (
                  <button key={val} onClick={() => setCx(key, cx[key]===val?"":val)} style={{ padding:"5px 14px", borderRadius:6, fontSize:11, fontWeight:800, cursor:"pointer", background: cx[key]===val ? color+"28":"transparent", border:`1.5px solid ${cx[key]===val?color:BORDER}`, color: cx[key]===val?color:MUTED }}>{lText}</button>
                ))}
                <div style={{ width: 1, background: BORDER }} />
                {[["R","R"],["L","L"]].map(([lText,val]) => (
                  <button key={val} onClick={() => { const k = key+"Side"; setCx(k, cx[k]===val?"":val); }} style={{ padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:800, cursor:"pointer", background: cx[key+"Side"]===val ? BLUE+"28":"transparent", border:`1.5px solid ${cx[key+"Side"]===val?BLUE:BORDER}`, color: cx[key+"Side"]===val?BLUE:MUTED }}>{lText}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={sectionHeader}>Palpation</div>
        <textarea style={{ ...inp, minHeight: 64, resize: "vertical" }} value={cx.palpation} onChange={e => setCx("palpation", e.target.value)} placeholder="Tenderness locations, muscle findings…" />
      </Card>

      {/* ── VOMS ──────────────────────────────────────────────────────────── */}
      <Card title="VOMS" id="voms" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          Vestibular / Ocular Motor Screening. Score each symptom 0–10 (0 = none, 10 = worst).
        </div>
        {/* Table header */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#161616" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", color: MUTED, fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", border: `1px solid ${BORDER}`, width: "22%" }}>Test</th>
                {["Headache","Dizziness","Nausea","Fogginess"].map(h => (
                  <th key={h} style={{ padding: "8px 8px", textAlign: "center", color: MUTED, fontWeight: 800, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", border: `1px solid ${BORDER}`, width: "10%" }}>{h}</th>
                ))}
                <th style={{ padding: "8px 10px", textAlign: "left", color: MUTED, fontWeight: 800, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", border: `1px solid ${BORDER}` }}>Comments</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["baseline",        "Baseline"],
                ["smoothPursuit",   "Smooth Pursuit"],
                ["saccadesHorz",    "Saccades Horizontal"],
                ["saccadesVert",    "Saccades Vertical"],
                ["convergence",     "Convergence"],
                ["vorHorz",         "VOR Horizontal"],
                ["vorVert",         "VOR Vertical"],
                ["vorCancellation", "VOR Cancellation"],
              ].map(([rowKey, rowLabel], ri) => {
                const row = vm[rowKey] || BLANK_VOMS_ROW;
                const hasAny = ["headache","dizziness","nausea","fogginess"].some(k => hasVal(row[k]) && parseInt(row[k]) > 0);
                return (
                  <tr key={rowKey} style={{ background: ri % 2 === 0 ? "#141414" : "#181818" }}>
                    <td style={{ padding: "8px 10px", color: hasAny ? WHITE : "#888", fontWeight: hasAny ? 700 : 400, fontSize: 12, border: `1px solid ${BORDER}` }}>{rowLabel}</td>
                    {["headache","dizziness","nausea","fogginess"].map(col => {
                      const v = row[col];
                      const n = parseInt(v);
                      const color = isNaN(n) || n === 0 ? MUTED : n <= 3 ? GOLD : n <= 6 ? "#fb923c" : RED_BAD;
                      return (
                        <td key={col} style={{ padding: "4px 4px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                          <input
                            type="number" min={0} max={10} step={1}
                            style={{ ...inp, width: "100%", textAlign: "center", padding: "6px 4px", color: color, fontSize: 13, fontWeight: 700 }}
                            value={v} placeholder="—"
                            onChange={e => setVr(rowKey, col, e.target.value)}
                          />
                        </td>
                      );
                    })}
                    <td style={{ padding: "4px 6px", border: `1px solid ${BORDER}` }}>
                      <input type="text" style={{ ...inp, fontSize: 11 }} value={row.comments} placeholder="Notes…" onChange={e => setVr(rowKey, "comments", e.target.value)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── EYE ALIGNMENT ────────────────────────────────────────────────── */}
      <Card title="Eye Alignment" id="eyeAlignment" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        {/* Maddox Rod */}
        <div style={sectionHeader}>Maddox Rod</div>
        <div style={{ overflowX: "auto", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#161616" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", color: MUTED, fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", border: `1px solid ${BORDER}`, width: "30%" }}> </th>
                <th style={{ padding: "8px 10px", textAlign: "center", color: MUTED, fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", border: `1px solid ${BORDER}` }}>Horizontal Line</th>
                <th style={{ padding: "8px 10px", textAlign: "center", color: MUTED, fontWeight: 800, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", border: `1px solid ${BORDER}` }}>Vertical Line</th>
              </tr>
            </thead>
            <tbody>
              {[["Right","maddoxRightHorz","maddoxRightVert"],["Left","maddoxLeftHorz","maddoxLeftVert"]].map(([side,hKey,vKey],ri) => (
                <tr key={side} style={{ background: ri%2===0 ? "#141414" : "#181818" }}>
                  <td style={{ padding:"8px 10px", color:"#aaa", fontWeight:700, fontSize:12, border:`1px solid ${BORDER}` }}>{side}</td>
                  {[hKey,vKey].map(k => (
                    <td key={k} style={{ padding:"4px 6px", border:`1px solid ${BORDER}` }}>
                      <input type="text" style={{ ...inp, textAlign:"center" }} value={ey[k]} placeholder="—" onChange={e => setEy(k, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cover-Uncover Test */}
        <div style={sectionHeader}>Cover / Uncover Test</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#161616" }}>
                <th style={{ padding:"8px 10px", textAlign:"left", color:MUTED, fontWeight:800, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", border:`1px solid ${BORDER}`, width:"20%" }}> </th>
                <th style={{ padding:"8px 10px", textAlign:"center", color:MUTED, fontWeight:800, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", border:`1px solid ${BORDER}` }}>Cover Test</th>
                <th style={{ padding:"8px 10px", textAlign:"center", color:MUTED, fontWeight:800, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", border:`1px solid ${BORDER}` }}>Uncover Test</th>
              </tr>
            </thead>
            <tbody>
              {[["Right","coverRight","uncoverRight"],["Left","coverLeft","uncoverLeft"]].map(([side,covKey,uncKey],ri) => (
                <tr key={side} style={{ background: ri%2===0 ? "#141414":"#181818" }}>
                  <td style={{ padding:"8px 10px", color:"#aaa", fontWeight:700, fontSize:12, border:`1px solid ${BORDER}` }}>{side}</td>
                  {[[covKey,"Tropia / NA"],[uncKey,"Phoria / NA"]].map(([k,ph]) => (
                    <td key={k} style={{ padding:"4px 6px", border:`1px solid ${BORDER}` }}>
                      <div style={{ display:"flex", gap:5 }}>
                        {ph.split(" / ").map(opt => (
                          <button key={opt} onClick={() => setEy(k, ey[k]===opt?"":opt)} style={{ flex:1, padding:"6px 0", borderRadius:6, fontSize:11, fontWeight:800, cursor:"pointer", background: ey[k]===opt ? LIME+"28":"transparent", border:`1.5px solid ${ey[k]===opt?LIME:BORDER}`, color: ey[k]===opt?LIME:MUTED }}>{opt}</button>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── TANDEM GAIT ───────────────────────────────────────────────────── */}
      <Card title="Tandem Gait" id="tandemGait" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Single Task */}
          <div>
            <div style={sectionHeader}>Single Task</div>
            <div style={{ display: "flex", flexDirection:"column", gap: 8 }}>
              {[["Trial 1","s1"],["Trial 2","s2"],["Trial 3","s3"]].map(([label,key]) => (
                <div key={key} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:11, color:"#888", width:48, flexShrink:0 }}>{label}</span>
                  <input type="number" step="0.1" style={{ ...inp, flex:1 }} value={tg[key]} placeholder="sec" onChange={e => setTg(key, e.target.value)} />
                  <span style={{ fontSize:10, color:MUTED }}>s</span>
                </div>
              ))}
            </div>
            {[tg.s1,tg.s2,tg.s3].some(v => hasVal(v)) && (
              <div style={{ marginTop:10, padding:"8px 12px", background:"#0f0f0f", border:`1px solid ${BORDER}`, borderRadius:7 }}>
                <div style={{ fontSize:9, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em" }}>Best Time</div>
                <div style={{ fontSize:18, fontWeight:900, fontFamily:"monospace", color: (() => { const best = Math.min(...[tg.s1,tg.s2,tg.s3].filter(v=>hasVal(v)).map(v=>parseFloat(v))); return best <= 14 ? LIME : RED_BAD; })() }}>
                  {Math.min(...[tg.s1,tg.s2,tg.s3].filter(v=>hasVal(v)).map(v=>parseFloat(v))).toFixed(1)}s
                </div>
                <div style={{ fontSize:9, color:MUTED }}>{Math.min(...[tg.s1,tg.s2,tg.s3].filter(v=>hasVal(v)).map(v=>parseFloat(v))) <= 14 ? "✓ Normal (≤14s)" : "✗ Impaired (>14s)"}</div>
              </div>
            )}
          </div>

          {/* Dual Task */}
          <div>
            <div style={sectionHeader}>Dual Task</div>
            <div style={{ display: "flex", flexDirection:"column", gap: 8 }}>
              {[
                ["Trial 1","d1","Subtract 7s (100, 93, 86…)"],
                ["Trial 2","d2","Words backwards"],
                ["Trial 3","d3","Months backwards"],
              ].map(([label,key,sub]) => (
                <div key={key}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:11, color:"#888", width:48, flexShrink:0 }}>{label}</span>
                    <input type="number" step="0.1" style={{ ...inp, flex:1 }} value={tg[key]} placeholder="sec" onChange={e => setTg(key, e.target.value)} />
                    <span style={{ fontSize:10, color:MUTED }}>s</span>
                  </div>
                  <div style={{ fontSize:9, color:"#555", marginTop:2, paddingLeft:58 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop:10, fontSize:10, color:MUTED }}>Normal single-task tandem gait ≤14s (4 passes). Dual task: compare to single-task for cognitive-motor interference.</div>
      </Card>

      {/* ── EXERTIONAL TESTING ────────────────────────────────────────────── */}
      <Card title="Modified Buffalo Exertion Test" id="exertional" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>
          Buffalo Concussion Treadmill / Bike Test or equivalent aerobic challenge to determine symptom threshold heart rate.
        </div>
        <R3 mb={12}>
          <div>
            <label style={lbl}>Protocol Used</label>
            <select style={inp} value={ex.protocol} onChange={e => setEx("protocol", e.target.value)}>
              <option value="">— Select —</option>
              <option value="Buffalo Concussion Treadmill Test (BCTT)">Buffalo Concussion Treadmill Test (BCTT)</option>
              <option value="Buffalo Concussion Bike Test (BCBT)">Buffalo Concussion Bike Test (BCBT)</option>
              <option value="Graded Symptom Exercise Test">Graded Symptom Exercise Test</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <Field label="Max HR Achieved" unit="bpm" value={ex.heartRate} onChange={v => setEx("heartRate", v)} />
          <div>
            <label style={lbl}>Symptom Provocation</label>
            <BinaryToggle value={ex.sx_provocation} onChange={v => setEx("sx_provocation", v)} options={[
              { v: "No", label: "None", color: LIME },
              { v: "Yes", label: "Provoked", color: RED_BAD },
            ]} />
          </div>
        </R3>
        {ex.sx_provocation === "Yes" && (
          <R2 mb={12}>
            <Field label="Threshold HR" unit="bpm" value={ex.threshold} onChange={v => setEx("threshold", v)} placeholder="HR at symptom onset" />
            <div />
          </R2>
        )}
        <div>
          <label style={lbl}>Exertional Testing Notes</label>
          <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={ex.notes} onChange={e => setEx("notes", e.target.value)} placeholder="Symptoms provoked, perceived exertion, test termination reason…" />
        </div>
      </Card>

      {/* ── RETURN TO PLAY / LEARN ────────────────────────────────────────── */}
      <Card title="Return to Play / Learn Status" id="rtp" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <R2 mb={12}>
          <div>
            <label style={lbl}>Current RTP Stage</label>
            <select style={inp} value={d.rtpStage} onChange={e => sd("rtpStage", e.target.value)}>
              <option value="">— Select Stage —</option>
              <option value="Stage 1 — Symptom-limited activity">Stage 1 — Symptom-limited activity</option>
              <option value="Stage 2 — Light aerobic exercise">Stage 2 — Light aerobic exercise</option>
              <option value="Stage 3 — Sport-specific exercise">Stage 3 — Sport-specific exercise</option>
              <option value="Stage 4 — Non-contact training drills">Stage 4 — Non-contact training drills</option>
              <option value="Stage 5 — Full-contact practice">Stage 5 — Full-contact practice</option>
              <option value="Stage 6 — Return to competition">Stage 6 — Return to competition (cleared)</option>
              <option value="Medical Hold — Not cleared">Medical Hold — Not cleared</option>
            </select>
          </div>
          <div />
        </R2>
        <div>
          <label style={lbl}>RTP / RTL Notes</label>
          <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={d.rtpNotes} onChange={e => sd("rtpNotes", e.target.value)} placeholder="Cleared by, limitations, school accommodations, follow-up plan…" />
        </div>
      </Card>

      {/* ── CLINICAL NOTES ───────────────────────────────────────────────── */}
      <Card title="Clinical Notes" id="clinicalNotes" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <textarea
          style={{ ...inp, minHeight: 100, resize: "vertical", lineHeight: 1.6 }}
          value={d.clinicalNotes}
          onChange={e => sd("clinicalNotes", e.target.value)}
          placeholder="Additional clinical observations, differential considerations, plan of care, referrals…"
        />
      </Card>

      {/* ── NOTE GENERATOR ───────────────────────────────────────────────── */}
      <Card title="Documentation Note" accent id="note" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          Auto-generates an objective documentation note from all entered data. Paste directly into your EMR.
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button onClick={generateNote} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${LIME}55`, background: LIME + "18", color: LIME, fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Generate Note
          </button>
          {d.noteText && (
            <button onClick={copyNote} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${BLUE}55`, background: BLUE + "18", color: noteCopied ? LIME : BLUE, fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {noteCopied ? "✓ Copied!" : "Copy to Clipboard"}
            </button>
          )}
        </div>
        {d.noteText && (
          <textarea
            style={{ ...inp, minHeight: 360, resize: "vertical", fontFamily: "monospace", fontSize: 11, lineHeight: 1.65, color: "#ddd" }}
            value={d.noteText}
            onChange={e => sd("noteText", e.target.value)}
          />
        )}
      </Card>
    </div>
  );
}

// ─── TAB 2: RETURN TO PLAY PROTOCOL ──────────────────────────────────────────
const RTP_STAGES = [
  {
    num: 1,
    title: "Symptom-Limited Activity",
    goal: "Reintroduce cognitive and light physical activity without provoking symptoms.",
    activity: [
      "Daily activities that do not provoke symptoms",
      "Walking, light stretching",
      "School attendance as tolerated (may need accommodations)",
      "Screen time if asymptomatic",
    ],
    avoid: ["Aerobic exercise", "Resistance training", "Any contact risk"],
    criteria: ["Asymptomatic at rest", "No symptom provocation with light daily activity"],
    minDuration: "As needed until asymptomatic",
    rtl: "Full return to learn (with accommodations if needed) when asymptomatic",
    color: BLUE,
  },
  {
    num: 2,
    title: "Light Aerobic Exercise",
    goal: "Increase heart rate without exacerbating symptoms.",
    activity: [
      "Walking, swimming (no diving), stationary cycling",
      "Light jogging on flat surface",
      "Target: 60–70% max HR",
    ],
    avoid: ["Resistance training", "Head-impact risk", "High-intensity intervals"],
    criteria: ["Asymptomatic at rest ≥24 hours", "No symptom provocation with Stage 1 activity"],
    minDuration: "Minimum 24 hours symptom-free before advancing",
    rtl: "Full return to learn if not already achieved",
    color: "#34d399",
  },
  {
    num: 3,
    title: "Sport-Specific Exercise",
    goal: "Add movement and sport-specific skills; no contact.",
    activity: [
      "Running drills, skating drills (sport-specific)",
      "Agility and change-of-direction exercises",
      "Sport-specific footwork (no ball / puck yet for contact sports)",
      "Resistance training may begin",
    ],
    avoid: ["Head-impact activities", "Contact or collision risk", "Ball headers (soccer)"],
    criteria: ["Asymptomatic with Stage 2 activity for ≥24 hours"],
    minDuration: "Minimum 24 hours symptom-free before advancing",
    rtl: "Full return to learn should be achieved before this stage",
    color: GOLD,
  },
  {
    num: 4,
    title: "Non-Contact Training Drills",
    goal: "Restore coordination, confidence, and sport-specific skills in a team setting.",
    activity: [
      "More complex drills (passing, catching, shooting)",
      "Non-contact team practice",
      "Resistance training progression",
      "Cognitive dual-task training",
    ],
    avoid: ["Body contact", "Collision risk", "Heading / checking"],
    criteria: ["Asymptomatic with Stage 3 activity for ≥24 hours", "Medical clearance should be obtained before Stage 5"],
    minDuration: "Minimum 24 hours symptom-free before advancing",
    rtl: "N/A — RTL complete",
    color: "#fb923c",
  },
  {
    num: 5,
    title: "Full-Contact Practice",
    goal: "Restore confidence; assess functional performance by coaching staff.",
    activity: [
      "Full participation in normal training and contact practice",
      "All sport-specific activities permitted",
      "Normal resistance and conditioning",
    ],
    avoid: ["Advancing without medical clearance"],
    criteria: [
      "Asymptomatic with Stage 4 activity for ≥24 hours",
      "Written medical clearance from physician or licensed healthcare provider",
      "Normal neurological examination",
    ],
    minDuration: "Minimum 24 hours before return to competition",
    rtl: "N/A — RTL complete",
    color: "#f472b6",
  },
  {
    num: 6,
    title: "Return to Competition",
    goal: "Full unrestricted return to sport.",
    activity: [
      "Normal game play and competition",
      "Full training and conditioning",
    ],
    avoid: [],
    criteria: [
      "Asymptomatic with Stage 5 activity",
      "Medical clearance on file",
      "Athlete, parent/guardian, and coaching staff informed",
    ],
    minDuration: "Ongoing monitoring recommended",
    rtl: "N/A — RTL complete",
    color: LIME,
  },
];

const RTL_STAGES = [
  {
    step: 1,
    title: "Complete Cognitive Rest",
    description: "No school, no reading, no screens, no homework. Typical: first 24–48 hours post-injury.",
  },
  {
    step: 2,
    title: "Gradual Return — Homework Only",
    description: "Short homework sessions (15–20 min) with breaks. No in-school attendance yet.",
  },
  {
    step: 3,
    title: "Part-Time School Attendance",
    description: "Half-days or modified schedule. Extended time on tests, reduced workload, no standardized testing.",
  },
  {
    step: 4,
    title: "Full-Time School with Accommodations",
    description: "Full attendance with academic supports: extra time, reduced homework load, rest breaks, preferential seating.",
  },
  {
    step: 5,
    title: "Full Return to School",
    description: "All accommodations phased out. Normal academic workload resumed without symptom provocation.",
  },
];

function TabRTP({ data: d, setData: setD }) {
  const sd = (k, v) => setD(p => ({ ...p, [k]: v }));
  const rtp = d.rtpStage || "";
  const rtpNotes = d.rtpNotes || "";
  const [expandedStage, setExpandedStage] = useState(null);

  const currentStageNum = parseInt(rtp.match(/Stage (\d)/)?.[1]) || null;

  return (
    <div>
      {/* Header card */}
      <div style={{ background: CARD, borderRadius: 12, marginBottom: 20, overflow: "hidden", border: `1px solid ${LIME}44`, boxShadow: `0 0 24px ${LIME}18` }}>
        <div style={{ padding: "12px 20px", background: `linear-gradient(90deg,${LIME}18,transparent)`, borderBottom: `1px solid ${LIME}33` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: LIME }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: LIME, textTransform: "uppercase" }}>Graduated Return-to-Play Protocol</span>
          </div>
        </div>
        <div className="trm-con-card-body" style={{ padding: 20 }}>
          <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7, marginBottom: 16 }}>
            Based on the <strong style={{ color: WHITE }}>Consensus Statement on Concussion in Sport (6th Ed.)</strong> and SCAT6 guidelines.
            Each stage requires a minimum of <strong style={{ color: WHITE }}>24 hours symptom-free</strong> before advancing.
            If symptoms return at any stage, drop back to the previous stage and reassess.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Current RTP Stage</label>
              <select style={inp} value={rtp} onChange={e => sd("rtpStage", e.target.value)}>
                <option value="">— Select Stage —</option>
                <option value="Stage 1 — Symptom-limited activity">Stage 1 — Symptom-limited activity</option>
                <option value="Stage 2 — Light aerobic exercise">Stage 2 — Light aerobic exercise</option>
                <option value="Stage 3 — Sport-specific exercise">Stage 3 — Sport-specific exercise</option>
                <option value="Stage 4 — Non-contact training drills">Stage 4 — Non-contact training drills</option>
                <option value="Stage 5 — Full-contact practice">Stage 5 — Full-contact practice (requires medical clearance)</option>
                <option value="Stage 6 — Return to competition">Stage 6 — Return to competition (cleared)</option>
                <option value="Medical Hold — Not cleared">Medical Hold — Not cleared for any stage</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Notes / Clearance Details</label>
              <textarea style={{ ...inp, minHeight: 44, resize: "vertical" }} value={rtpNotes} onChange={e => sd("rtpNotes", e.target.value)} placeholder="Cleared by, date, limitations, follow-up plan…" />
            </div>
          </div>
        </div>
      </div>

      {/* Stage progress bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, alignItems: "center" }}>
        {RTP_STAGES.map((stage, i) => {
          const isActive = currentStageNum === stage.num;
          const isPast = currentStageNum !== null && stage.num < currentStageNum;
          return (
            <div key={stage.num} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 6, borderRadius: 3, background: isPast ? stage.color : isActive ? stage.color : BORDER, marginBottom: 6, transition: "background 0.3s" }} />
              <div style={{ fontSize: 9, fontWeight: 800, color: isActive ? stage.color : isPast ? stage.color + "99" : MUTED, letterSpacing: "0.06em" }}>S{stage.num}</div>
            </div>
          );
        })}
      </div>

      {/* RTP Stages */}
      <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>Return-to-Play Stages — click to expand</div>
      {RTP_STAGES.map(stage => {
        const isActive = currentStageNum === stage.num;
        const isExpanded = expandedStage === stage.num;
        const isPast = currentStageNum !== null && stage.num < currentStageNum;
        return (
          <div key={stage.num} onClick={() => setExpandedStage(isExpanded ? null : stage.num)} style={{
            background: CARD, borderRadius: 10, marginBottom: 8, overflow: "hidden", cursor: "pointer",
            border: `1px solid ${isActive ? stage.color + "88" : isPast ? stage.color + "33" : BORDER}`,
            boxShadow: isActive ? `0 0 16px ${stage.color}22` : "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}>
            {/* Stage header */}
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: isActive ? stage.color + "12" : "transparent" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: isActive ? stage.color + "28" : isPast ? stage.color + "18" : "#1c1c1c", border: `2px solid ${isActive ? stage.color : isPast ? stage.color + "55" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: isActive ? stage.color : isPast ? stage.color + "99" : MUTED }}>{isPast && !isActive ? "✓" : stage.num}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: isActive ? stage.color : isPast ? "#aaa" : WHITE }}>
                  Stage {stage.num} — {stage.title}
                </div>
                {!isExpanded && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{stage.goal}</div>}
              </div>
              {isActive && <span style={{ fontSize: 9, fontWeight: 800, color: stage.color, background: stage.color + "18", border: `1px solid ${stage.color}44`, borderRadius: 4, padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Current</span>}
              <span style={{ fontSize: 14, color: MUTED, flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</span>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BORDER}` }}>
                <div style={{ marginTop: 14, marginBottom: 10, fontSize: 11, color: "#bbb", lineHeight: 1.6 }}>
                  <strong style={{ color: stage.color }}>Goal:</strong> {stage.goal}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: stage.avoid.length ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: LIME, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>✓ Permitted Activities</div>
                    {stage.activity.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                        <span style={{ color: LIME, flexShrink: 0, fontSize: 11 }}>•</span>
                        <span style={{ fontSize: 11, color: "#ccc", lineHeight: 1.4 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                  {stage.avoid.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: RED_BAD, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>✕ Avoid</div>
                      {stage.avoid.map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                          <span style={{ color: RED_BAD, flexShrink: 0, fontSize: 11 }}>•</span>
                          <span style={{ fontSize: 11, color: "#ccc", lineHeight: 1.4 }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Criteria to Advance</div>
                  {stage.criteria.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: GOLD, flexShrink: 0, fontSize: 11 }}>→</span>
                      <span style={{ fontSize: 11, color: "#ccc", lineHeight: 1.4 }}>{c}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}`, fontSize: 10, color: MUTED }}>
                    ⏱ {stage.minDuration}
                  </div>
                </div>
                {stage.rtl !== "N/A — RTL complete" && (
                  <div style={{ fontSize: 11, color: BLUE, background: BLUE + "0e", border: `1px solid ${BLUE}33`, borderRadius: 7, padding: "8px 12px" }}>
                    <strong>RTL:</strong> {stage.rtl}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Medical Hold */}
      <div onClick={() => sd("rtpStage", rtp === "Medical Hold — Not cleared" ? "" : "Medical Hold — Not cleared")} style={{ marginTop: 8, padding: "12px 16px", background: rtp === "Medical Hold — Not cleared" ? RED_BAD + "14" : "transparent", border: `1px solid ${rtp === "Medical Hold — Not cleared" ? RED_BAD + "88" : BORDER}`, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: RED_BAD + "18", border: `2px solid ${RED_BAD}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: RED_BAD }}>⚠</span>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: rtp === "Medical Hold — Not cleared" ? RED_BAD : WHITE }}>Medical Hold — Not Cleared</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Athlete is not cleared for any return-to-play activity. Document reason in notes.</div>
        </div>
        {rtp === "Medical Hold — Not cleared" && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, color: RED_BAD, background: RED_BAD + "18", border: `1px solid ${RED_BAD}44`, borderRadius: 4, padding: "3px 8px", textTransform: "uppercase" }}>Active</span>}
      </div>

      {/* RTL Protocol Reference */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Return-to-Learn (RTL) Protocol — Reference</div>
        <div style={{ background: CARD, borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {RTL_STAGES.map((stage, i) => (
            <div key={stage.step} style={{ padding: "12px 16px", borderBottom: i < RTL_STAGES.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: BLUE + "18", border: `1.5px solid ${BLUE}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: BLUE }}>{stage.step}</span>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: WHITE, marginBottom: 3 }}>{stage.title}</div>
                <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>{stage.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key rules reminder */}
      <div style={{ marginTop: 20, padding: "14px 16px", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Key Protocol Rules</div>
        {[
          { color: LIME,    text: "Each stage requires a minimum of 24 hours symptom-free before advancing to the next." },
          { color: RED_BAD, text: "If any symptoms return during a stage, drop back one stage and reassess after 24 hours." },
          { color: GOLD,    text: "Written medical clearance from a physician or licensed healthcare provider is required before Stage 5." },
          { color: BLUE,    text: "Return-to-learn should be completed before or in parallel with the physical RTP protocol." },
          { color: PURPLE,  text: "Children and adolescents may require longer recovery and more conservative progression than adults." },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 3, borderRadius: 2, background: r.color, flexShrink: 0, alignSelf: "stretch" }} />
            <span style={{ fontSize: 11, color: "#bbb", lineHeight: 1.5 }}>{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RULE-BASED ASSESSMENT BUILDER ───────────────────────────────────────────
function buildAssessmentText(sortedSessions) {
  const isComparison = sortedSessions.length > 1;
  const current = sortedSessions[sortedSessions.length - 1];
  const earliest = sortedSessions[0];

  const paragraphs = [];

  // ── Helper ──
  const pct = (a, b) => b === 0 ? null : Math.round(((b - a) / b) * 100);
  const hasV = v => v !== "" && v !== null && v !== undefined && !isNaN(parseFloat(v));
  const improved = (cur, prev, lowerBetter = false) => {
    if (!hasV(cur) || !hasV(prev)) return null;
    const diff = parseFloat(cur) - parseFloat(prev);
    if (Math.abs(diff) < 0.1) return "unchanged";
    return lowerBetter ? (diff < 0 ? "improved" : "worsened") : (diff > 0 ? "improved" : "worsened");
  };

  // ── INTRO ──
  const d = current.data;
  const pt = d.patient || {};
  const sport = pt.sport ? `${pt.sport} athlete` : "patient";
  const daysPost = pt.daysPost ? `Day ${pt.daysPost} post-injury` : null;
  const dateStr = pt.date || null;
  const introDate = [dateStr, daysPost].filter(Boolean).join(", ");

  if (isComparison) {
    const earliest_pt = earliest.data?.patient || {};
    const span = earliest_pt.date && pt.date ? ` from ${earliest_pt.date} to ${pt.date}` : "";
    const nSessions = sortedSessions.length;
    paragraphs.push(`The following assessment reflects a comparative review of ${nSessions} concussion evaluation sessions${span} for this ${sport}. Progress is described across all available data points.`);
  } else {
    paragraphs.push(`Assessment reflects findings from the current concussion evaluation${introDate ? ` (${introDate})` : ""} for this ${sport}.`);
  }

  // ── CCP PROFILES ──
  const sx = d.symptoms || {};
  const sc = ccpScores(sx);
  const posProfiles = Object.entries(CCP_PROFILES).filter(([id]) => sc[id]?.positive);
  const negProfiles = Object.entries(CCP_PROFILES).filter(([id]) => !sc[id]?.positive && sc[id]?.raw !== undefined);
  const numEndorsed = Object.values(sx).filter(v => parseInt(v) > 0).length;

  const profileImplications = {
    anxiety:    "suggesting anxiety/mood involvement consistent with an emotional/anxiety concussion profile",
    cognitive:  "indicating cognitive fatigue and mental effort intolerance consistent with a cognitive/fatigue profile",
    migraine:   "consistent with a migraine-type concussion presentation with photosensitivity and exertional headache features",
    ocular:     "indicating ocular motor dysfunction requiring targeted visual rehabilitation",
    vestibular: "consistent with vestibular dysfunction and motion sensitivity requiring vestibular rehabilitation",
    sleep:      "indicating significant sleep dysregulation as a contributing modifier",
    neck:       "indicating cervicogenic involvement as a contributing modifier requiring cervical-focused intervention",
  };

  let ccpPara = "";
  if (isComparison) {
    const prevSx = earliest.data?.symptoms || {};
    const prevSc = ccpScores(prevSx);
    const prevEndorsed = Object.values(prevSx).filter(v => parseInt(v) > 0).length;
    const totalChange = sc.total - prevSc.total;
    const endorsedChange = numEndorsed - prevEndorsed;
    const direction = totalChange < 0 ? "decreased" : totalChange > 0 ? "increased" : "remained stable";

    ccpPara = `Symptom burden has ${direction} over the course of treatment, with a CCP total score of ${sc.total} (${numEndorsed}/29 items endorsed) compared to ${prevSc.total} (${prevEndorsed}/29) at the initial session`;
    if (Math.abs(totalChange) > 0) ccpPara += `, representing a ${Math.abs(totalChange)}-point ${totalChange < 0 ? "reduction" : "increase"}`;
    ccpPara += ".";

    const nowPos = posProfiles.map(([id]) => id);
    const wasPos = Object.entries(CCP_PROFILES).filter(([id]) => prevSc[id]?.positive).map(([id]) => id);
    const resolved = wasPos.filter(id => !nowPos.includes(id)).map(id => CCP_PROFILES[id].label);
    const persistent = nowPos.filter(id => wasPos.includes(id)).map(id => CCP_PROFILES[id].label);
    const newPos = nowPos.filter(id => !wasPos.includes(id)).map(id => CCP_PROFILES[id].label);

    if (resolved.length) ccpPara += ` The following profiles have resolved: ${resolved.join(", ")}.`;
    if (persistent.length) ccpPara += ` Persistent positive profiles include ${persistent.join(", ")}, which continue to warrant targeted intervention.`;
    if (newPos.length) ccpPara += ` Newly positive profiles at the current visit: ${newPos.join(", ")}.`;
    if (nowPos.length === 0) ccpPara += " All clinical profiles are currently negative, suggesting resolution of the primary symptom clusters.";
  } else {
    if (posProfiles.length === 0) {
      ccpPara = `CCP screening reveals no positive clinical profiles, with a total score of ${sc.total} and ${numEndorsed}/29 items endorsed. This presentation is consistent with symptom resolution or a subclinical burden.`;
    } else {
      const profList = posProfiles.map(([id, p]) => `${p.label} (${sc[id].raw}/${p.max})`).join(", ");
      ccpPara = `CCP screening identifies the following positive profiles: ${profList}, with a total score of ${sc.total} and ${numEndorsed}/29 items endorsed. `;
      if (posProfiles.length === 1) {
        ccpPara += `This unimodal presentation — ${profileImplications[posProfiles[0][0]]} — supports a targeted single-profile treatment approach.`;
      } else {
        const impl = posProfiles.map(([id]) => profileImplications[id]).join("; ");
        ccpPara += `This multimodal presentation reflects ${posProfiles.length} concurrent active profiles: ${impl}.`;
      }
    }
  }
  paragraphs.push(ccpPara);

  // ── CERVICAL ──
  const cx = d.cervical || {};
  const prevCx = earliest.data?.cervical || {};
  const romKeys = [["flexion","flexion"],["extension","extension"],["rightRotation","right rotation"],["leftRotation","left rotation"]];
  const romDeficits = romKeys.filter(([k]) => hasV(cx[k]) && parseFloat(cx[k]) < 50);
  const posTests = [
    [cx.sharpPurser==="+", "Sharp Purser"],
    [cx.alarLigament==="+", "Alar Ligament"],
    [cx.sideGlide==="+", `Side Glide${cx.sideGlideLevels ? " at "+cx.sideGlideLevels : ""}`],
    [cx.cervicalFlexRot==="+", `Cervical Flexion Rotation Test${cx.cervicalFlexRotSide ? " ("+cx.cervicalFlexRotSide+")" : ""}`],
    [cx.headImpulse==="+", `Head Impulse${cx.headImpulseSide ? " ("+cx.headImpulseSide+")" : ""}`],
  ].filter(([pos]) => pos).map(([,name]) => name);

  const hasCxData = romKeys.some(([k]) => hasV(cx[k])) || posTests.length > 0 || cx.palpation;
  if (hasCxData) {
    let cxPara = "Cervical examination ";
    if (romDeficits.length > 0) {
      const deficitList = romDeficits.map(([k, label]) => `${label} (${cx[k]}°)`).join(", ");
      if (isComparison) {
        const romChanges = romKeys.map(([k, label]) => {
          const chg = improved(cx[k], prevCx[k]);
          if (!chg || chg === "unchanged") return null;
          return `${label} ${chg} (${prevCx[k]||"?"}° → ${cx[k]}°)`;
        }).filter(Boolean);
        cxPara += romChanges.length
          ? `demonstrates ROM changes including: ${romChanges.join("; ")}.`
          : `reveals persistent ROM deficits in ${deficitList}.`;
      } else {
        cxPara += `reveals limited range of motion in ${deficitList}, suggesting cervicogenic involvement.`;
      }
    } else if (romKeys.some(([k]) => hasV(cx[k]))) {
      cxPara += "ROM is within functional limits.";
    }
    if (posTests.length > 0) {
      cxPara += ` Special testing is positive for ${posTests.join(", ")}, supporting a cervicogenic component to the current presentation.`;
    } else if ([cx.sharpPurser, cx.alarLigament, cx.cervicalFlexRot, cx.headImpulse].some(v => v === "-")) {
      cxPara += " Upper cervical instability screen is negative.";
    }
    if (cx.palpation) cxPara += ` Palpation reveals ${cx.palpation}.`;
    paragraphs.push(cxPara);
  }

  // ── VOMS ──
  const vm = d.voms || {};
  const vomsRows = [
    ["baseline","Baseline"],["smoothPursuit","Smooth Pursuit"],["saccadesHorz","Horizontal Saccades"],
    ["saccadesVert","Vertical Saccades"],["convergence","Convergence"],
    ["vorHorz","VOR Horizontal"],["vorVert","VOR Vertical"],["vorCancellation","VOR Cancellation"],
  ];
  const vomsAbnormal = vomsRows.filter(([key]) => {
    const row = vm[key] || {};
    return ["headache","dizziness","nausea","fogginess"].some(c => hasV(row[c]) && parseInt(row[c]) > 0);
  });
  const vomsNormal = vomsRows.filter(([key]) => {
    const row = vm[key] || {};
    const tested = ["headache","dizziness","nausea","fogginess"].some(c => hasV(row[c]));
    const allZero = tested && ["headache","dizziness","nausea","fogginess"].every(c => !hasV(row[c]) || parseInt(row[c]) === 0);
    return allZero;
  });

  const hasVomsData = vomsAbnormal.length > 0 || vomsNormal.length > 0;
  if (hasVomsData) {
    let vomsPara = "";
    if (isComparison) {
      const prevVm = earliest.data?.voms || {};
      const prevAbnormal = vomsRows.filter(([key]) => {
        const row = prevVm[key] || {};
        return ["headache","dizziness","nausea","fogginess"].some(c => hasV(row[c]) && parseInt(row[c]) > 0);
      }).map(([,label]) => label);
      const curAbnormal = vomsAbnormal.map(([,label]) => label);
      const resolved = prevAbnormal.filter(l => !curAbnormal.includes(l));
      const persist = curAbnormal.filter(l => prevAbnormal.includes(l));
      const newAbn = curAbnormal.filter(l => !prevAbnormal.includes(l));

      if (resolved.length === 0 && persist.length === 0 && newAbn.length === 0 && curAbnormal.length === 0) {
        vomsPara = "VOMS testing is currently within normal limits across all subtests, representing resolution of previously noted oculomotor or vestibular provocation.";
      } else {
        vomsPara = "VOMS assessment";
        if (resolved.length) vomsPara += ` shows resolution of symptom provocation with ${resolved.join(", ")}`;
        if (persist.length) vomsPara += `${resolved.length ? ";" : ""} persistent provocation with ${persist.join(", ")}`;
        if (newAbn.length) vomsPara += `${(resolved.length||persist.length) ? ";" : ""} and new provocation with ${newAbn.join(", ")}`;
        vomsPara += ".";
      }
    } else {
      if (vomsAbnormal.length === 0) {
        vomsPara = `VOMS testing reveals no symptom provocation across all subtests, suggesting intact oculomotor and vestibular function at this time.`;
      } else {
        const abnList = vomsAbnormal.map(([key, label]) => {
          const row = vm[key] || {};
          const vals = ["headache","dizziness","nausea","fogginess"].map(c => parseInt(row[c])||0);
          const max = Math.max(...vals);
          return `${label} (max ${max}/10)`;
        });
        vomsPara = `VOMS identifies symptom provocation with ${abnList.join(", ")}.`;
        if (vomsAbnormal.some(([k]) => ["vorHorz","vorVert","vorCancellation"].includes(k))) {
          vomsPara += " VOR pathway involvement is noted, indicating a vestibular rehabilitation focus.";
        }
        if (vomsAbnormal.some(([k]) => ["smoothPursuit","saccadesHorz","saccadesVert","convergence"].includes(k))) {
          vomsPara += " Oculomotor pathway dysfunction is present, supporting targeted visual-vestibular rehabilitation.";
        }
        if (vomsNormal.length) vomsPara += ` Testing is within normal limits for: ${vomsNormal.map(([,l])=>l).join(", ")}.`;
      }
    }
    paragraphs.push(vomsPara);
  }

  // ── TANDEM GAIT ──
  const tg = d.tandemGait || {};
  const best = bestSingle(tg);
  if (best !== null) {
    let tgPara = "";
    if (isComparison) {
      const prevBest = bestSingle(earliest.data?.tandemGait);
      if (prevBest !== null) {
        const diff = (best - prevBest).toFixed(1);
        const dir = best < prevBest ? "improved" : best > prevBest ? "declined" : "unchanged";
        tgPara = `Tandem gait (single-task) has ${dir} from ${prevBest.toFixed(1)}s to ${best.toFixed(1)}s`;
        tgPara += best <= 14
          ? ", now within normal limits (≤14s)."
          : `, remaining above the normative threshold of 14s.`;
      } else {
        tgPara = `Tandem gait (single-task) best performance is ${best.toFixed(1)}s${best <= 14 ? " (within normal limits)" : " (impaired, >14s normative cutoff)"}.`;
      }
    } else {
      tgPara = `Tandem gait single-task best time is ${best.toFixed(1)}s, which is ${best <= 14 ? "within normal limits (≤14s)" : "above the normative threshold of 14s, indicating functional gait impairment"}.`;
      const dualVals = [tg.d1, tg.d2, tg.d3].filter(v => hasV(v)).map(v => parseFloat(v));
      if (dualVals.length && best !== null) {
        const dualAvg = dualVals.reduce((a,b)=>a+b,0) / dualVals.length;
        const dualDiff = dualAvg - best;
        if (dualDiff > 2) {
          tgPara += ` Dual-task performance reveals a mean increase of ${dualDiff.toFixed(1)}s over single-task, indicating cognitive-motor interference.`;
        } else if (dualVals.length > 0) {
          tgPara += " Dual-task performance is comparable to single-task, suggesting minimal cognitive-motor interference.";
        }
      }
    }
    paragraphs.push(tgPara);
  }

  // ── EXERTIONAL ──
  const ex = d.exertional || {};
  if (ex.protocol || ex.heartRate || ex.sx_provocation) {
    let exPara = "";
    if (isComparison) {
      const prevEx = earliest.data?.exertional || {};
      const prevProv = prevEx.sx_provocation;
      const curProv = ex.sx_provocation;
      if (prevProv && curProv) {
        if (prevProv === "Yes" && curProv === "No") {
          exPara = `Exertional testing (${ex.protocol || "aerobic challenge"}) demonstrates resolution of exercise-induced symptom provocation compared to the initial evaluation, with no symptoms elicited at a max HR of ${ex.heartRate || "?"}bpm. This represents a clinically significant milestone in recovery.`;
        } else if (prevProv === "No" && curProv === "Yes") {
          exPara = `Exertional testing reveals new symptom provocation during the current evaluation, with a threshold HR of ${ex.threshold || "?"}bpm, which was not present at the initial session. This warrants reassessment of current activity level.`;
        } else if (prevProv === "Yes" && curProv === "Yes") {
          const prevThr = parseFloat(prevEx.threshold);
          const curThr = parseFloat(ex.threshold);
          if (!isNaN(prevThr) && !isNaN(curThr) && curThr > prevThr) {
            exPara = `Symptom threshold during exertional testing has increased from ${prevThr}bpm to ${curThr}bpm, indicating improved exercise tolerance, though provocation remains present.`;
          } else {
            exPara = `Exertional symptom provocation persists at the current evaluation${ex.threshold ? ` (threshold ${ex.threshold}bpm)` : ""}, indicating continued exercise intolerance.`;
          }
        } else {
          exPara = `Exertional testing was negative for symptom provocation at the current evaluation (max HR ${ex.heartRate || "?"}bpm).`;
        }
      }
    } else {
      if (ex.sx_provocation === "Yes") {
        exPara = `Exertional testing via ${ex.protocol || "aerobic challenge"} elicits symptom provocation`;
        if (ex.threshold) exPara += ` at a threshold HR of ${ex.threshold}bpm`;
        exPara += `, indicating exercise-induced symptom intolerance consistent with physiological dysregulation. Subsymptom-threshold aerobic exercise is recommended as part of the rehabilitation plan.`;
      } else if (ex.sx_provocation === "No") {
        exPara = `Exertional testing via ${ex.protocol || "aerobic challenge"} is negative for symptom provocation (max HR ${ex.heartRate || "?"}bpm), indicating adequate physiological tolerance to graded aerobic exercise at this time.`;
      }
      if (ex.notes && !exPara) exPara = `Exertional testing notes: ${ex.notes}`;
    }
    if (exPara) paragraphs.push(exPara);
  }

  // ── OVERALL IMPRESSION ──
  let impression = "";
  const rtpStage = d.rtpStage || "";
  const stageNum = parseInt(rtpStage.match(/Stage (\d)/)?.[1]) || null;

  if (isComparison) {
    const overallImproving = (() => {
      let score = 0;
      const prevSx2 = earliest.data?.symptoms || {};
      const prevSc2 = ccpScores(prevSx2);
      if (sc.total < prevSc2.total) score++;
      if (sc.total > prevSc2.total) score--;
      const prevBest2 = bestSingle(earliest.data?.tandemGait);
      const curBest2 = bestSingle(tg);
      if (curBest2 !== null && prevBest2 !== null && curBest2 < prevBest2) score++;
      if (curBest2 !== null && prevBest2 !== null && curBest2 > prevBest2) score--;
      return score;
    })();

    impression = `Overall, this patient demonstrates ${overallImproving > 0 ? "a positive trajectory of recovery" : overallImproving < 0 ? "a complex recovery course with some areas of concern" : "a mixed recovery course"} across the evaluated timeframe.`;
    if (posProfiles.length === 0) {
      impression += " Current profile negativity suggests the patient may be approaching return-to-play readiness, pending continued clinical monitoring.";
    } else {
      impression += ` Ongoing active profiles — ${posProfiles.map(([,p])=>p.label).join(", ")} — indicate continued need for profile-targeted intervention.`;
    }
  } else {
    if (posProfiles.length === 0 && best !== null && best <= 14) {
      impression = "Overall clinical presentation is encouraging, with negative CCP profiles and functional tandem gait performance. The patient may be progressing toward return-to-play readiness, pending provider evaluation.";
    } else if (posProfiles.length >= 3) {
      impression = `This is a complex, multimodal concussion presentation with ${posProfiles.length} active clinical profiles. A multidisciplinary, profile-targeted rehabilitation approach is indicated.`;
    } else if (posProfiles.length > 0) {
      impression = `Clinical presentation is consistent with a${posProfiles.length === 1 ? " unimodal" : " multimodal"} concussion profile. Directed rehabilitation targeting the identified profile(s) is recommended with serial reassessment.`;
    } else {
      impression = "Clinical findings are notable. Continued monitoring and reassessment are recommended as recovery progresses.";
    }
    if (stageNum) impression += ` Patient is currently at ${rtpStage}.`;
  }
  paragraphs.push(impression);

  return paragraphs.filter(Boolean).join("\n\n");
}

// ─── TAB 1: COMPARISON ───────────────────────────────────────────────────────
const MAX_SESSIONS = 3; // max prior sessions to load

function loadPDF(file) {
  return new Promise((resolve, reject) => {
    getPdfLib().then(({ PDFDocument }) => {
      file.arrayBuffer().then(buf => {
        PDFDocument.load(buf).then(doc => {
          const subject = doc.getSubject();
          if (!subject || !subject.startsWith("TRM_CONCUSSION_V1:")) {
            reject(new Error("Not a TRM session PDF."));
            return;
          }
          try {
            const json = decodeURIComponent(escape(atob(subject.replace("TRM_CONCUSSION_V1:", ""))));
            resolve({ data: JSON.parse(json), fileName: file.name });
          } catch(e) { reject(new Error("Corrupt session data.")); }
        }).catch(reject);
      }).catch(reject);
    }).catch(reject);
  });
}

// Pull the best tandem gait single-task time from a session
function bestSingle(tg) {
  if (!tg) return null;
  const vals = [tg.s1, tg.s2, tg.s3].filter(v => v !== "" && v !== null && v !== undefined && !isNaN(parseFloat(v))).map(v => parseFloat(v));
  return vals.length ? Math.min(...vals) : null;
}

// Delta badge helper
function Delta({ a, b, lowerBetter = false, unit = "" }) {
  if (a === null || b === null || a === undefined || b === undefined) return <span style={{ color: MUTED, fontSize: 10 }}>—</span>;
  const diff = parseFloat(a) - parseFloat(b);
  if (Math.abs(diff) < 0.01) return <span style={{ color: MUTED, fontSize: 10 }}>±0{unit}</span>;
  const improved = lowerBetter ? diff < 0 : diff > 0;
  const color = improved ? LIME : RED_BAD;
  return <span style={{ color, fontSize: 10, fontWeight: 800 }}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}{unit}</span>;
}

// Single comparison cell
function CmpCell({ value, color, sub, bold }) {
  return (
    <td style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, textAlign: "center", verticalAlign: "middle" }}>
      <div style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 900 : 700, fontFamily: "monospace", color: color || WHITE }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{sub}</div>}
    </td>
  );
}

function SectionHeader({ children }) {
  return (
    <tr>
      <td colSpan={99} style={{ padding: "10px 12px 6px", background: "#0f0f0f", borderBottom: `1px solid ${BORDER}`, fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {children}
      </td>
    </tr>
  );
}

function TabComparison({ currentData }) {
  const [sessions, setSessions] = useState([]); // array of { data, fileName, error }
  const [loadErrors, setLoadErrors] = useState([]);
  const fileInputRef = useRef(null);

  const allSessions = [
    { data: currentData, fileName: "Current Session", isCurrent: true },
    ...sessions.map(s => ({ ...s, isCurrent: false })),
  ];

  const handleFiles = async (files) => {
    const remaining = MAX_SESSIONS - sessions.length;
    const toLoad = Array.from(files).slice(0, remaining);
    const errors = [];
    const loaded = [];
    for (const f of toLoad) {
      try {
        const result = await loadPDF(f);
        loaded.push(result);
      } catch(e) {
        errors.push(`${f.name}: ${e.message}`);
      }
    }
    setSessions(prev => [...prev, ...loaded]);
    if (errors.length) setLoadErrors(errors);
    setTimeout(() => setLoadErrors([]), 6000);
  };

  const removeSession = (idx) => setSessions(prev => prev.filter((_, i) => i !== idx));

  // Sort all sessions by date for trend display
  const sorted = [...allSessions].sort((a, b) => {
    const da = a.data?.patient?.date || "";
    const db = b.data?.patient?.date || "";
    return da.localeCompare(db);
  });

  const colColor = (i) => [LIME, BLUE, GOLD, PURPLE][i % 4];

  return (
    <div>
      {/* Load controls */}
      <div style={{ background: CARD, borderRadius: 12, marginBottom: 20, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", background: "#161616", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: BLUE }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: BLUE, textTransform: "uppercase" }}>Session Comparison</span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: MUTED }}>{sessions.length}/{MAX_SESSIONS} prior sessions loaded</span>
        </div>
        <div className="trm-con-card-body" style={{ padding: 16 }}>
          <p style={{ fontSize: 11, color: "#aaa", marginBottom: 14, lineHeight: 1.6 }}>
            Load up to {MAX_SESSIONS} prior session PDFs saved from this app to compare against the current session. Sessions are sorted by date automatically.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={sessions.length >= MAX_SESSIONS}
              style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${sessions.length >= MAX_SESSIONS ? BORDER : BLUE+"55"}`, background: sessions.length >= MAX_SESSIONS ? "#111" : BLUE+"14", color: sessions.length >= MAX_SESSIONS ? MUTED : BLUE, fontSize: 11, fontWeight: 800, cursor: sessions.length >= MAX_SESSIONS ? "default" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              + Load Prior PDF{sessions.length > 0 ? "s" : ""}
            </button>
            {sessions.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: colColor(i+1)+"14", border: `1px solid ${colColor(i+1)}44`, borderRadius: 7, padding: "5px 10px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: colColor(i+1), flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: colColor(i+1), fontWeight: 700, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.fileName}</span>
                <button onClick={() => removeSession(i)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "0 2px" }}>×</button>
              </div>
            ))}
          </div>
          {loadErrors.length > 0 && loadErrors.map((e, i) => (
            <div key={i} style={{ marginTop: 8, fontSize: 11, color: RED_BAD, background: RED_BAD+"0e", border: `1px solid ${RED_BAD}33`, borderRadius: 6, padding: "6px 10px" }}>⚠ {e}</div>
          ))}
        </div>
      </div>

      {allSessions.length < 2 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: MUTED }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>No prior sessions loaded</div>
          <div style={{ fontSize: 11, maxWidth: 360, margin: "0 auto", lineHeight: 1.7 }}>Load one or more prior session PDFs above to see a side-by-side comparison with the current session.</div>
        </div>
      )}

      {allSessions.length >= 2 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#0f0f0f" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", border: `1px solid ${BORDER}`, fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", width: "22%", minWidth: 160 }}>Metric</th>
                {sorted.map((s, i) => {
                  const c = colColor(s.isCurrent ? 0 : sessions.findIndex(x => x.fileName === s.fileName) + 1);
                  return (
                    <th key={i} style={{ padding: "10px 12px", textAlign: "center", border: `1px solid ${BORDER}`, minWidth: 130 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 3 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: c, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.isCurrent ? "Current" : s.fileName.replace(".pdf","").slice(0,18)}</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: WHITE }}>{s.data?.patient?.date || "—"}</div>
                      <div style={{ fontSize: 9, color: MUTED }}>Day {s.data?.patient?.daysPost || "?"} post-injury</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>

              {/* ── PATIENT ── */}
              <SectionHeader>Patient Info</SectionHeader>
              {[["Sport / Activity", s => s.data?.patient?.sport],
                ["Provider", s => s.data?.patient?.provider],
                ["RTP Stage", s => s.data?.rtpStage?.replace(/Stage \d — /,"S") || "—"],
              ].map(([label, fn]) => (
                <tr key={label} style={{ background: "#141414" }}>
                  <td style={{ padding: "7px 12px", border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: "#aaa" }}>{label}</td>
                  {sorted.map((s, i) => <CmpCell key={i} value={fn(s) || "—"} />)}
                </tr>
              ))}

              {/* ── CCP PROFILES ── */}
              <SectionHeader>CCP Screening — Profile Scores (raw / max)</SectionHeader>
              {Object.entries(CCP_PROFILES).map(([id, profile]) => {
                const groupColors = { anxiety: PURPLE, cognitive: BLUE, migraine: RED_BAD, ocular: GOLD, vestibular: "#34d399", sleep: "#94a3b8", neck: "#f9a8d4" };
                const pc = groupColors[id];
                return (
                  <tr key={id} style={{ background: "#141414" }}>
                    <td style={{ padding: "7px 12px", border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700 }}>
                      <span style={{ color: pc }}>{profile.label}</span>
                      <span style={{ color: MUTED, fontSize: 9, marginLeft: 6 }}>cutoff ≥{profile.cutoff}</span>
                    </td>
                    {sorted.map((s, i) => {
                      const sc = ccpScores(s.data?.symptoms || {});
                      const val = sc[id];
                      const positive = val?.positive;
                      return (
                        <td key={i} style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace", color: positive ? RED_BAD : LIME }}>{val?.raw ?? "—"}</span>
                          <span style={{ fontSize: 10, color: MUTED }}>/{profile.max}</span>
                          {positive && <div style={{ fontSize: 8, color: RED_BAD, fontWeight: 800, marginTop: 1 }}>POS</div>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr style={{ background: "#0f0f0f" }}>
                <td style={{ padding: "7px 12px", border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 800, color: WHITE }}>Total Raw Score</td>
                {sorted.map((s, i) => {
                  const sc = ccpScores(s.data?.symptoms || {});
                  const ref = ccpScores(sorted[0].data?.symptoms || {});
                  return (
                    <td key={i} style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", color: sc.total === 0 ? LIME : sc.total < 10 ? GOLD : RED_BAD }}>{sc.total}</div>
                      {i > 0 && <Delta a={sc.total} b={ref.total} lowerBetter />}
                    </td>
                  );
                })}
              </tr>
              <tr style={{ background: "#141414" }}>
                <td style={{ padding: "7px 12px", border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: "#aaa" }}>Items Endorsed</td>
                {sorted.map((s, i) => {
                  const n = Object.values(s.data?.symptoms || {}).filter(v => parseInt(v) > 0).length;
                  const ref = Object.values(sorted[0].data?.symptoms || {}).filter(v => parseInt(v) > 0).length;
                  return (
                    <td key={i} style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: n === 0 ? LIME : GOLD }}>{n}/29</span>
                      {i > 0 && <div><Delta a={n} b={ref} lowerBetter /></div>}
                    </td>
                  );
                })}
              </tr>

              {/* ── CERVICAL ROM ── */}
              <SectionHeader>Cervical ROM (degrees)</SectionHeader>
              {[["Flexion","flexion"],["Extension","extension"],["R Rotation","rightRotation"],["L Rotation","leftRotation"],["Deep Neck Flexor","deepNeckFlexor"]].map(([label, key]) => (
                <tr key={key} style={{ background: "#141414" }}>
                  <td style={{ padding: "7px 12px", border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: "#aaa" }}>{label}</td>
                  {sorted.map((s, i) => {
                    const val = s.data?.cervical?.[key];
                    const ref = sorted[0].data?.cervical?.[key];
                    const hasVal = val !== "" && val !== null && val !== undefined;
                    return (
                      <td key={i} style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: hasVal ? WHITE : MUTED }}>{hasVal ? val+"°" : "—"}</span>
                        {i > 0 && hasVal && ref && <div><Delta a={parseFloat(val)} b={parseFloat(ref)} unit="°" /></div>}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ── CERVICAL SPECIAL TESTS ── */}
              <SectionHeader>Cervical Special Tests</SectionHeader>
              {[["Sharp Purser","sharpPurser"],["Alar Ligament","alarLigament"],["Side Glide","sideGlide"],["Cervical Flex Rot","cervicalFlexRot"],["Head Impulse","headImpulse"]].map(([label, key]) => (
                <tr key={key} style={{ background: "#141414" }}>
                  <td style={{ padding: "7px 12px", border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: "#aaa" }}>{label}</td>
                  {sorted.map((s, i) => {
                    const val = s.data?.cervical?.[key];
                    const side = s.data?.cervical?.[key+"Side"];
                    const color = val === "+" ? RED_BAD : val === "-" ? LIME : MUTED;
                    return (
                      <td key={i} style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color }}>{val || "—"}</span>
                        {side && <span style={{ fontSize: 10, color: BLUE, marginLeft: 4 }}>{side}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ── VOMS ── */}
              <SectionHeader>VOMS (0–10 per symptom)</SectionHeader>
              {[
                ["baseline","Baseline"],["smoothPursuit","Smooth Pursuit"],["saccadesHorz","Saccades Horz"],
                ["saccadesVert","Saccades Vert"],["convergence","Convergence"],
                ["vorHorz","VOR Horizontal"],["vorVert","VOR Vertical"],["vorCancellation","VOR Cancellation"],
              ].map(([rowKey, rowLabel]) => (
                <tr key={rowKey} style={{ background: "#141414" }}>
                  <td style={{ padding: "7px 12px", border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: "#aaa" }}>{rowLabel}</td>
                  {sorted.map((s, i) => {
                    const row = s.data?.voms?.[rowKey] || {};
                    const cols = ["headache","dizziness","nausea","fogginess"];
                    const vals = cols.map(c => row[c]).filter(v => v !== "" && v !== undefined && v !== null);
                    const max = vals.length ? Math.max(...vals.map(v => parseInt(v)||0)) : null;
                    const allZero = vals.length > 0 && vals.every(v => parseInt(v) === 0);
                    return (
                      <td key={i} style={{ padding: "6px 8px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                        {vals.length === 0 ? <span style={{ color: MUTED }}>—</span> : (
                          <div style={{ display: "flex", gap: 3, justifyContent: "center", alignItems: "center" }}>
                            {cols.map(c => {
                              const v = parseInt(row[c]);
                              if (isNaN(v) || row[c] === "") return null;
                              const color = v === 0 ? "#333" : v <= 3 ? GOLD : v <= 6 ? "#fb923c" : RED_BAD;
                              return <span key={c} style={{ fontSize: 10, fontWeight: 700, color, background: v > 0 ? color+"18" : "transparent", border: `1px solid ${v > 0 ? color+"44" : BORDER}`, borderRadius: 3, padding: "1px 4px", minWidth: 16 }}>{v}</span>;
                            })}
                            {allZero && <span style={{ fontSize: 10, color: LIME }}>✓ neg</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ── TANDEM GAIT ── */}
              <SectionHeader>Tandem Gait</SectionHeader>
              <tr style={{ background: "#141414" }}>
                <td style={{ padding: "7px 12px", border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: "#aaa" }}>Single Task — Best (s)</td>
                {sorted.map((s, i) => {
                  const best = bestSingle(s.data?.tandemGait);
                  const refBest = bestSingle(sorted[0].data?.tandemGait);
                  const color = best === null ? MUTED : best <= 14 ? LIME : RED_BAD;
                  return (
                    <td key={i} style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 900, fontFamily: "monospace", color }}>{best !== null ? best.toFixed(1)+"s" : "—"}</div>
                      {best !== null && <div style={{ fontSize: 9, color }}>{best <= 14 ? "✓ Normal" : "✗ Impaired"}</div>}
                      {i > 0 && best !== null && refBest !== null && <Delta a={best} b={refBest} lowerBetter unit="s" />}
                    </td>
                  );
                })}
              </tr>
              {[["s1","Trial 1"],["s2","Trial 2"],["s3","Trial 3"],["d1","Dual T1"],["d2","Dual T2"],["d3","Dual T3"]].map(([key, label]) => (
                <tr key={key} style={{ background: "#0f0f0f" }}>
                  <td style={{ padding: "6px 12px", border: `1px solid ${BORDER}`, fontSize: 10, color: MUTED, paddingLeft: 24 }}>{label}</td>
                  {sorted.map((s, i) => {
                    const v = s.data?.tandemGait?.[key];
                    const hasV = v !== "" && v !== null && v !== undefined && !isNaN(parseFloat(v));
                    return <td key={i} style={{ padding: "6px 8px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: hasV ? WHITE : MUTED }}>{hasV ? parseFloat(v).toFixed(1)+"s" : "—"}</span>
                    </td>;
                  })}
                </tr>
              ))}

              {/* ── EXERTIONAL ── */}
              <SectionHeader>Exertional Testing</SectionHeader>
              {[
                ["Protocol", s => s.data?.exertional?.protocol || "—"],
                ["Max HR", s => s.data?.exertional?.heartRate ? s.data.exertional.heartRate+" bpm" : "—"],
                ["Sx Provocation", s => s.data?.exertional?.sx_provocation || "—"],
                ["Threshold HR", s => s.data?.exertional?.threshold ? s.data.exertional.threshold+" bpm" : "—"],
              ].map(([label, fn]) => (
                <tr key={label} style={{ background: "#141414" }}>
                  <td style={{ padding: "7px 12px", border: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: "#aaa" }}>{label}</td>
                  {sorted.map((s, i) => {
                    const val = fn(s);
                    const color = label === "Sx Provocation" ? (val === "Yes" ? RED_BAD : val === "No" ? LIME : MUTED) : WHITE;
                    return <CmpCell key={i} value={val} color={color} />;
                  })}
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      )}

      {/* Delta legend */}
      {allSessions.length >= 2 && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "#0f0f0f", border: `1px solid ${BORDER}`, borderRadius: 8, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Δ vs. earliest session:</span>
          <span style={{ fontSize: 10, color: LIME }}>▲ green = improvement</span>
          <span style={{ fontSize: 10, color: RED_BAD }}>▼ red = worsening</span>
          <span style={{ fontSize: 10, color: MUTED }}>VOMS cells show H / D / N / F scores</span>
        </div>
      )}

      {/* ── AI ASSESSMENT GENERATOR ── */}
      <AssessmentGenerator sortedSessions={sorted} hasSessions={allSessions.length >= 1} />
    </div>
  );
}

// ─── ASSESSMENT GENERATOR COMPONENT ─────────────────────────────────────────
function AssessmentGenerator({ sortedSessions, hasSessions }) {
  const [assessmentText, setAssessmentText] = useState("");
  const [copied, setCopied] = useState(false);

  const isComparison = sortedSessions.length > 1;
  const hasEnoughData = (() => {
    const d = sortedSessions[sortedSessions.length - 1]?.data;
    if (!d) return false;
    const sx = d.symptoms || {};
    const hasSymptoms = Object.values(sx).some(v => parseInt(v) > 0);
    const hasCervical = d.cervical && Object.values(d.cervical).some(v => v && v !== "");
    const hasVoms = d.voms && Object.values(d.voms).some(row => Object.values(row).some(v => v !== "" && v !== undefined));
    const hasTandem = d.tandemGait && Object.values(d.tandemGait).some(v => v !== "");
    const hasExertional = d.exertional && (d.exertional.protocol || d.exertional.heartRate);
    return hasSymptoms || hasCervical || hasVoms || hasTandem || hasExertional;
  })();

  const generate = () => {
    const text = buildAssessmentText(sortedSessions);
    setAssessmentText(text);
  };

  const copy = () => {
    navigator.clipboard.writeText(assessmentText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ background: CARD, borderRadius: 12, overflow: "hidden", border: `1px solid ${PURPLE}44`, boxShadow: `0 0 20px ${PURPLE}14` }}>
        <div style={{ padding: "12px 20px", background: `linear-gradient(90deg,${PURPLE}18,transparent)`, borderBottom: `1px solid ${PURPLE}33`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: PURPLE }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: PURPLE, textTransform: "uppercase" }}>
            {isComparison ? "Comparative Assessment" : "Clinical Assessment"}
          </span>
        </div>

        <div className="trm-con-card-body" style={{ padding: 20 }}>
          <p style={{ fontSize: 11, color: "#aaa", lineHeight: 1.7, marginBottom: 16 }}>
            {isComparison
              ? `Generates a clinical Assessment paragraph comparing all ${sortedSessions.length} loaded sessions — trajectory of recovery, what has improved, what remains impaired, and overall clinical impression.`
              : "Generates a clinical Assessment paragraph interpreting current findings — active profiles, physical exam, functional performance, and overall clinical impression. Paste directly into your Assessment section."}
          </p>

          {!hasEnoughData && !assessmentText && (
            <div style={{ padding: "12px 14px", background: "#111", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11, color: MUTED, marginBottom: 14 }}>
              ℹ Enter data in the Evaluation tab first — symptoms, cervical exam, VOMS, tandem gait, and/or exertional testing.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              onClick={generate}
              disabled={!hasEnoughData}
              style={{
                padding: "10px 22px", borderRadius: 8, fontSize: 12, fontWeight: 800,
                cursor: !hasEnoughData ? "default" : "pointer",
                border: `1px solid ${!hasEnoughData ? BORDER : PURPLE+"55"}`,
                background: !hasEnoughData ? "#111" : PURPLE+"18",
                color: !hasEnoughData ? MUTED : PURPLE,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}
            >
              {isComparison ? "Generate Comparative Assessment" : "Generate Assessment"}
            </button>
            {assessmentText && (
              <button onClick={copy} style={{ padding: "10px 22px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", border: `1px solid ${copied ? LIME+"55" : BLUE+"55"}`, background: copied ? LIME+"18" : BLUE+"18", color: copied ? LIME : BLUE, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
            )}
            {assessmentText && (
              <button onClick={generate} style={{ padding: "10px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED }}>
                Regenerate
              </button>
            )}
          </div>

          {assessmentText && (
            <div>
              <textarea
                style={{ ...inp, minHeight: 220, resize: "vertical", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 12, lineHeight: 1.8, color: "#e8e8e8", letterSpacing: "0.01em" }}
                value={assessmentText}
                onChange={e => setAssessmentText(e.target.value)}
              />
              <div style={{ marginTop: 8, fontSize: 10, color: MUTED }}>
                ✎ You can edit the text above before copying.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PLACEHOLDER TAB ──────────────────────────────────────────────────────────
function PlaceholderTab({ label, description }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#555", marginBottom: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#444", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>{description}</div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]   = useState(0);
  const [saving,    setSaving]      = useState(false);
  const [loadMsg,   setLoadMsg]     = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, file: null, fileName: "" });
  const [newPtModal,   setNewPtModal]   = useState(false);
  const [data,         setData]         = useState(BLANK_DATA);
  const [storageRestored, setStorageRestored] = useState(false);
  const [restoreComplete, setRestoreComplete] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-restore
  useEffect(() => {
    (async () => {
      try {
        let parsedData = null;
        try {
          const saved = await window.storage.get("trm_concussion_autosave");
          if (saved && saved.value) parsedData = JSON.parse(saved.value);
        } catch (e) {}
        if (!parsedData) {
          try { const local = localStorage.getItem("trm_concussion_autosave_local"); if (local) parsedData = JSON.parse(local); } catch (e) {}
        }
        if (parsedData) {
          const hasData = parsedData.patient?.date || parsedData.patient?.sport || parsedData.patient?.daysPost;
          if (hasData) { setData(parsedData); setStorageRestored(true); setTimeout(() => setStorageRestored(false), 5000); }
        }
      } catch (e) {} finally { setRestoreComplete(true); }
    })();
  }, []);

  // Auto-save
  useEffect(() => {
    if (!restoreComplete) return;
    const serialized = JSON.stringify(data);
    try { localStorage.setItem("trm_concussion_autosave_local", serialized); } catch (e) {}
    (async () => { try { await window.storage.set("trm_concussion_autosave", serialized); } catch (e) {} })();
  }, [data, restoreComplete]);

  const tabs = [
    { label: "Evaluation",  sub: "Testing & Outcomes" },
    { label: "Comparison",  sub: "Progress Tracking" },
    { label: "RTP Protocol",sub: "Return-to-Play" },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const { blob, filename } = await saveSessionPDF(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    catch (e) { setLoadMsg({ type: "error", text: "Save failed: " + e.message }); }
    setSaving(false);
  };

  const handleShare = async () => {
    setSaving(true);
    try {
      const { blob, filename } = await saveSessionPDF(data);
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename, text: "TRM Concussion evaluation" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setLoadMsg({ type: "error", text: "Sharing isn't supported on this device — saved the PDF instead." });
        setTimeout(() => setLoadMsg(null), 6000);
      }
    } catch (e) {
      if (e.name !== "AbortError") setLoadMsg({ type: "error", text: "Share failed: " + e.message });
    }
    setSaving(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setConfirmModal({ open: true, file, fileName: file.name });
  };

  const doLoadFile = async () => {
    const file = confirmModal.file;
    setConfirmModal({ open: false, file: null, fileName: "" });
    await loadSessionPDF(file,
      (sessionData) => {
        setData(sessionData);
        setLoadMsg({ type: "success", text: "Session loaded successfully." });
        setTimeout(() => setLoadMsg(null), 5000);
      },
      (errMsg) => {
        setLoadMsg({ type: "error", text: errMsg });
        setTimeout(() => setLoadMsg(null), 6000);
      }
    );
  };

  const doNewPatient = async () => {
    setData(BLANK_DATA);
    setNewPtModal(false);
    setActiveTab(0);
    try { await window.storage.delete("trm_concussion_autosave"); } catch (e) {}
    try { localStorage.removeItem("trm_concussion_autosave_local"); } catch (e) {}
  };

  return (
    <div style={{ background: BLACK, minHeight: "100vh", color: WHITE, fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
      <ConfirmModal open={confirmModal.open} fileName={confirmModal.fileName} onConfirm={doLoadFile} onCancel={() => setConfirmModal({ open: false, file: null, fileName: "" })} />
      <NewPatientModal open={newPtModal} onConfirm={doNewPatient} onCancel={() => setNewPtModal(false)} />

      {/* Header */}
      <div style={{ background: DARK, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: "'Arial Black',Impact,sans-serif", fontSize: 28, fontWeight: 900, color: WHITE, letterSpacing: "-1px" }}>TRM</span>
              <span style={{ color: BORDER, fontSize: 18 }}>|</span>
              <span className="trm-con-header-subtitle" style={{ fontSize: 11, fontWeight: 700, color: "#777", letterSpacing: "0.08em", textTransform: "uppercase" }}>Concussion / mTBI Evaluation & Documentation</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileChange} />
            </div>
          </div>
          <div style={{ display: "flex", borderTop: `1px solid ${BORDER}` }}>
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)} className="trm-con-tab-btn" style={{ padding: "10px 22px", background: "transparent", border: "none", borderBottom: `3px solid ${activeTab === i ? LIME : "transparent"}`, cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: activeTab === i ? LIME : "#666" }}>{t.label}</div>
                <div className="trm-con-tab-sub" style={{ fontSize: 9, color: activeTab === i ? LIME + "88" : "#444", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {/* Toast messages */}
        {storageRestored && (
          <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 10, border: `1px solid ${BLUE}55`, background: BLUE + "12", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16 }}>💾</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>Session auto-restored — your data was saved from your last visit.</span>
            <button onClick={() => setStorageRestored(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}
        {loadMsg && (
          <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 10, border: `1px solid ${loadMsg.type === "success" ? LIME + "55" : RED_BAD + "55"}`, background: loadMsg.type === "success" ? LIME + "12" : RED_BAD + "12", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16 }}>{loadMsg.type === "success" ? "✓" : "⚠"}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: loadMsg.type === "success" ? LIME : RED_BAD }}>{loadMsg.text}</span>
            <button onClick={() => setLoadMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}

        {activeTab === 0 && <Tab1 data={data} setData={setData} />}
        {activeTab === 1 && <TabComparison currentData={data} />}
        {activeTab === 2 && <TabRTP data={data} setData={setData} />}
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 20px", textAlign: "center" }}>
        <span style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, color: WHITE, fontSize: 13 }}>TRM</span>
        <span style={{ color: MUTED, fontSize: 11, marginLeft: 10 }}>Concussion Evaluation Tool — Not a substitute for clinical judgment</span>
      </div>

      {/* FAB Buttons */}
      <div className="trm-con-fab" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", alignItems: "center", gap: 8 }}>

        {/* Left group: New Patient | Load */}
        <div style={{ display: "flex", alignItems: "stretch", border: `1px solid ${BORDER}55`, borderRadius: 7, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>
          <button onClick={() => setNewPtModal(true)} style={{ padding: "7px 10px", background: "rgba(248,113,113,0.05)", color: RED_BAD + "aa", border: "none", cursor: "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            New Patient
          </button>
          <div style={{ width: 1, background: BORDER + "66", flexShrink: 0 }} />
          <button onClick={() => fileInputRef.current.click()} style={{ padding: "7px 10px", background: "rgba(255,255,255,0.03)", color: "#999", border: "none", cursor: "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Load
          </button>
        </div>

        {/* Right group: Save PDF | ⬆ Share (AirDrop) */}
        <div style={{ display: "flex", alignItems: "stretch", border: `1px solid ${LIME}28`, borderRadius: 7, overflow: "hidden", boxShadow: `0 1px 6px ${LIME}0a`, opacity: saving ? 0.5 : 1 }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: "7px 12px", background: LIME + "0c", color: LIME + "cc", border: "none", cursor: saving ? "default" : "pointer", fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            {saving ? "Saving…" : "Save PDF"}
          </button>
          <div style={{ width: 1, background: LIME + "22", flexShrink: 0 }} />
          <button onClick={handleShare} disabled={saving} title="Share / AirDrop" style={{ padding: "7px 10px", background: LIME + "0c", color: LIME + "cc", border: "none", cursor: saving ? "default" : "pointer", fontSize: 12, lineHeight: 1, display: "flex", alignItems: "center" }}>
            ⬆
          </button>
        </div>
      </div>
    </div>
  );
}
