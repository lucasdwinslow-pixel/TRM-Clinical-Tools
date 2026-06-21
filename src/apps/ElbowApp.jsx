import { useState, useRef, useEffect } from "react";

// ─── pdf-lib ────────────────────────────────────────────────────────────────
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

// ─── Colors ─────────────────────────────────────────────────────────────────
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

// ─── Global Styles ──────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("trm-elbow-styles")) {
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1, maximum-scale=1";
    document.head.appendChild(meta);
  }
  const s = document.createElement("style");
  s.id = "trm-elbow-styles";
  s.textContent = `
    html, body { overscroll-behavior-y: none; }
    .trm-e-sidenav { width: 190px; flex-shrink: 0; position: sticky; top: 108px; max-height: calc(100vh - 125px); overflow-y: auto; margin-right: 20px; align-self: flex-start; }
    .trm-e-sidenav::-webkit-scrollbar { width: 3px; }
    .trm-e-sidenav::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
    .trm-e-content { flex: 1; min-width: 0; }
    @media (max-width: 700px) {
      .trm-e-sidenav { display: none !important; }
      .trm-e-main-pad { padding-bottom: 84px !important; }
      .trm-e-r2, .trm-e-r3, .trm-e-r4 { grid-template-columns: 1fr !important; }
      .trm-e-r2-persist { grid-template-columns: 1fr 1fr !important; }
      .trm-e-card-body { padding: 14px !important; }
      .trm-e-header-subtitle { display: none !important; }
      .trm-e-tab-sub { display: none !important; }
      .trm-e-tab-btn { padding: 10px 12px !important; }
      .trm-e-stat-bar { gap: 16px !important; padding: 10px 14px !important; }
      .trm-e-fab { bottom: 72px !important; right: 12px !important; gap: 5px !important; }
      .trm-e-fab button { padding: 10px 12px !important; font-size: 11px !important; min-height: 44px; }
      input[type="number"], input[type="text"], select, textarea { font-size: 16px !important; min-height: 44px !important; }
    }
  `;
  document.head.appendChild(s);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toNum  = v => parseFloat(v) || 0;
const hasVal = v => v !== "" && v !== null && v !== undefined && !isNaN(parseFloat(v));
const calcLSI     = (inv, uninv) => { if (!hasVal(inv)||!hasVal(uninv)||toNum(uninv)===0) return null; return ((toNum(inv)/toNum(uninv))*100).toFixed(1); };
const calcTorqueNm = (forceLbs, leverCm) => { if (!hasVal(forceLbs)||!hasVal(leverCm)) return null; return (toNum(forceLbs)*4.44822*(toNum(leverCm)/100)).toFixed(1); };
const calcNorm    = (nm, bwLbs) => { if (!nm||!hasVal(bwLbs)||toNum(bwLbs)===0) return null; return (toNum(nm)/(toNum(bwLbs)*0.453592)).toFixed(2); };
const calcBWRatio = (forceLbs, bwLbs) => { if (!hasVal(forceLbs)||!hasVal(bwLbs)||toNum(bwLbs)===0) return null; return ((toNum(forceLbs)/toNum(bwLbs))*100).toFixed(1); };
const calcERIR    = (erF, irF) => { if (!hasVal(erF)||!hasVal(irF)||toNum(irF)===0) return null; return ((toNum(erF)/toNum(irF))*100).toFixed(1); };
const avgTrials   = (...vs) => { const ns=vs.map(v=>parseFloat(v)).filter(v=>!isNaN(v)); return ns.length?(ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1):null; };

const lsiColor = v => { const n=parseFloat(v); if(isNaN(n)) return MUTED; if(n>=90) return LIME; if(n>=80) return GOLD; return RED_BAD; };

const VALID_RANGES = {
  bw:[50,500], leverArm:[20,50],
  elbowFlexR:[0,160],elbowFlexL:[0,160], elbowExtR:[0,10],elbowExtL:[0,10],
  pronationR:[0,90],pronationL:[0,90], supinationR:[0,90],supinationL:[0,90],
  gripR:[0,200],gripL:[0,200],
  scaptionForceR:[0,100],scaptionForceL:[0,100],
  erForceR:[0,80],erForceL:[0,80], irForceR:[0,120],irForceL:[0,120],
  scaptionTPFR:[0,1000],scaptionTPFL:[0,1000],
  erTPFR:[0,1000],erTPFL:[0,1000],irTPFR:[0,1000],irTPFL:[0,1000],
};
const isOutOfRange = (key, val) => {
  if (!hasVal(val)) return false;
  const r = VALID_RANGES[key]; if (!r) return false;
  const v = parseFloat(val); return v < r[0] || v > r[1];
};

// ─── Shared Style Objects ────────────────────────────────────────────────────
const inp = { background:"#1c1c1c", border:"1px solid #2e2e2e", borderRadius:6, padding:"8px 12px", color:WHITE, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
const inpInvalid = { background:"#2a1010", border:"1px solid #f87171", borderRadius:6, padding:"8px 12px", color:"#f87171", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
const lbl = { display:"block", fontSize:10, fontWeight:800, letterSpacing:"0.12em", color:MUTED, textTransform:"uppercase", marginBottom:4 };
const calcBox = { background:"#0f0f0f", border:`1px solid ${LIME}33`, borderRadius:6, padding:"8px 12px", color:LIME, fontSize:13, fontFamily:"monospace", textAlign:"center" };

// ─── UI Components ───────────────────────────────────────────────────────────
function Card({ title, accent, required, children, id, focusable, activeCard, setActiveCard }) {
  const isActive = focusable ? activeCard === id : false;
  const hi = accent ? "accent" : required ? "required" : isActive ? "active" : "default";
  const borderColor = hi==="accent"?LIME+"44":hi==="required"?LIME+"55":hi==="active"?LIME+"66":BORDER;
  const shadowColor = hi==="accent"?`0 0 24px ${LIME}18`:hi==="default"?"0 2px 12px rgba(0,0,0,0.4)":`0 0 20px ${LIME}22`;
  const headerBg    = hi==="default"?"#161616":`linear-gradient(90deg,${LIME}${hi==="accent"?"18":"12"},transparent)`;
  const headerBorder= hi==="default"?BORDER:LIME+"33";
  const barColor    = hi==="default"?"#444":LIME;
  const titleColor  = hi==="default"?"#888":LIME;
  return (
    <div id={id} style={{ background:CARD, borderRadius:12, marginBottom:20, overflow:"hidden", border:`1px solid ${borderColor}`, boxShadow:shadowColor, transition:"box-shadow 0.3s, border-color 0.3s" }}>
      <div onClick={focusable?()=>setActiveCard(id):undefined} style={{ padding:"12px 20px", background:headerBg, borderBottom:`1px solid ${headerBorder}`, display:"flex", alignItems:"center", gap:10, cursor:focusable?"pointer":"default", userSelect:"none" }}>
        <div style={{ width:3, height:18, borderRadius:2, background:barColor }} />
        <span style={{ fontSize:11, fontWeight:800, letterSpacing:"0.18em", color:titleColor, textTransform:"uppercase" }}>{title}</span>
        {required && <span style={{ marginLeft:"auto", fontSize:9, fontWeight:800, color:LIME, letterSpacing:"0.12em", textTransform:"uppercase", opacity:0.7 }}>Required</span>}
      </div>
      <div className="trm-e-card-body" style={{ padding:20 }}>{children}</div>
    </div>
  );
}
function R2({ children, mb=12, persist=false }) {
  return <div className={persist?"trm-e-r2-persist":"trm-e-r2"} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:mb }}>{children}</div>;
}
function R3({ children, mb=12 }) {
  return <div className="trm-e-r3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:mb }}>{children}</div>;
}
function Field({ label, value, onChange, type="number", step="0.1", placeholder="—", unit, readOnly, fieldKey }) {
  const invalid = !readOnly && fieldKey && isOutOfRange(fieldKey, value);
  return (
    <div>
      <label style={lbl}>{label}{unit?` (${unit})`:""}</label>
      <input style={readOnly?{...inp,color:LIME,background:"#0f0f0f",borderColor:LIME+"33",cursor:"default"}:invalid?inpInvalid:inp}
        type={readOnly?"text":type} step={step} placeholder={placeholder} value={value} readOnly={readOnly}
        onChange={readOnly?undefined:e=>onChange(e.target.value)} />
    </div>
  );
}
function StatBar({ stats }) {
  return (
    <div className="trm-e-stat-bar" style={{ background:"#0f0f0f", border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 20px", display:"flex", gap:28, flexWrap:"wrap", marginTop:8 }}>
      {stats.map((s,i) => (
        <div key={i} style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, fontWeight:700, color:MUTED, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>{s.label}</div>
          <div style={{ fontSize:18, fontWeight:800, color:s.color||LIME, fontFamily:"monospace" }}>{s.value||"—"}</div>
        </div>
      ))}
    </div>
  );
}
function SideToggle({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:8 }}>
      {["Left","Right"].map(s => (
        <button key={s} onClick={()=>onChange(s)} style={{ padding:"8px 24px", borderRadius:8, fontSize:12, fontWeight:800, cursor:"pointer", background:value===s?LIME:"transparent", border:`2px solid ${value===s?LIME:BORDER}`, color:value===s?BLACK:MUTED }}>{s}</button>
      ))}
    </div>
  );
}

function ConfirmModal({ open, fileName, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#141414", border:`1px solid ${BORDER}`, borderRadius:16, width:"100%", maxWidth:420, boxShadow:"0 24px 80px rgba(0,0,0,0.8)", overflow:"hidden" }}>
        <div style={{ height:3, background:`linear-gradient(90deg,${GOLD},${GOLD}88,transparent)` }} />
        <div style={{ padding:"28px 28px 24px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:20 }}>
            <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:GOLD+"18", border:`1px solid ${GOLD}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚠</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:WHITE, marginBottom:6 }}>Replace Current Session?</div>
              <div style={{ fontSize:12, color:"#888", lineHeight:1.6 }}>Loading this file will overwrite all data currently on the form. This cannot be undone.</div>
            </div>
          </div>
          {fileName && <div style={{ background:"#0f0f0f", border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px 14px", marginBottom:24, display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:11, color:MUTED }}>FILE</span><span style={{ fontSize:12, fontWeight:700, color:"#ccc", fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fileName}</span></div>}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:"11px 0", borderRadius:10, border:`1px solid ${BORDER}`, background:"#1a1a1a", color:"#888", fontSize:12, fontWeight:700, cursor:"pointer" }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:1, padding:"11px 0", borderRadius:10, border:`1px solid ${GOLD}66`, background:GOLD+"18", color:GOLD, fontSize:12, fontWeight:800, cursor:"pointer" }}>Yes, Load File</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function NewPatientModal({ open, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#141414", border:`1px solid ${BORDER}`, borderRadius:16, width:"100%", maxWidth:400, boxShadow:"0 24px 80px rgba(0,0,0,0.8)", overflow:"hidden" }}>
        <div style={{ height:3, background:`linear-gradient(90deg,${RED_BAD},${RED_BAD}88,transparent)` }} />
        <div style={{ padding:"28px 28px 24px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:24 }}>
            <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:RED_BAD+"18", border:`1px solid ${RED_BAD}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✕</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:WHITE, marginBottom:6 }}>Clear Form for New Patient?</div>
              <div style={{ fontSize:12, color:"#888", lineHeight:1.6 }}>All fields will be reset. Make sure you've saved the current session as a PDF before continuing.</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:"11px 0", borderRadius:10, border:`1px solid ${BORDER}`, background:"#1a1a1a", color:"#888", fontSize:12, fontWeight:700, cursor:"pointer" }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:1, padding:"11px 0", borderRadius:10, border:`1px solid ${RED_BAD}66`, background:RED_BAD+"18", color:RED_BAD, fontSize:12, fontWeight:800, cursor:"pointer" }}>Clear & Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionAnchor({ id, label }) {
  return (
    <div id={id} style={{ scrollMarginTop:120 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, marginTop:4 }}>
        <div style={{ flex:1, height:1, background:BORDER }} />
        <span style={{ fontSize:9, fontWeight:800, color:MUTED, letterSpacing:"0.16em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>
        <div style={{ flex:1, height:1, background:BORDER }} />
      </div>
    </div>
  );
}

// ─── LSI Result Block (reused across sections) ───────────────────────────────
function LSIBlock({ label, lsi, threshold, unit="%" }) {
  if (!lsi) return null;
  const n = parseFloat(lsi);
  const passes = n >= threshold;
  const approaching = !passes && n >= threshold - 10;
  const color = passes ? LIME : approaching ? GOLD : RED_BAD;
  const text  = passes ? `✓ Meets ≥${threshold}% threshold` : approaching ? `Approaching (≥${threshold}%)` : `Below threshold (<${threshold}%)`;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${color}44`, marginTop:8 }}>
      <span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</span>
      <span style={{ fontSize:24, fontWeight:900, fontFamily:"monospace", color }}>{lsi}{unit}</span>
      <span style={{ fontSize:12, fontWeight:800, color }}>{text}</span>
    </div>
  );
}

// ─── Blank data ───────────────────────────────────────────────────────────────
const BLANK_DATA = {
  patient: { date:"", surgeon:"", surgeryType:"", weeksPostOp:"", involvedSide:"Left", sex:"Male", athleteCategory:"", armDominance:"" },
  bw:"", leverArm:"",
  subj: { painFree:false, noSwelling:false, noInstability:false, physicianClear:false },
  romWNL:false,
  elbowFlexR:"",elbowFlexL:"", elbowExtR:"",elbowExtL:"",
  pronationR:"",pronationL:"", supinationR:"",supinationL:"",
  gripR:"",gripL:"",
  scaptionForceR:"",scaptionForceL:"", scaptionTPFR:"",scaptionTPFL:"",
  erForceR:"",erForceL:"", erTPFR:"",erTPFL:"",
  irForceR:"",irForceL:"", irTPFR:"",irTPFL:"",
  ash:{ peakInv:"",peakUninv:"",tpfInv:"",tpfUninv:"",notes:"" },
  ckcuestReps:"",ckcuestReps2:"",ckcuestReps3:"",
  ueYbal:{ invLimbLength:"",uninvLimbLength:"",invMedial:"",uninvMedial:"",invInfLat:"",uninvInfLat:"",invSupLat:"",uninvSupLat:"" },
  plyo:{ invPeakForce:"",uninvPeakForce:"",invTPF:"",uninvTPF:"",notes:"" },
  shotputInv1:"",shotputInv2:"",shotputInv3:"",
  shotputUninv1:"",shotputUninv2:"",shotputUninv3:"",
  pse:{ timeInv:"",timeUninv:"",notes:"" },
  n9090Pass:false, fdsExtPass:false,
  clinicalNotes:"", noteText:"",
  impression:"",
};

const SECTION_GROUPS = [
  { id:"sec-patient",    label:"Patient",    short:"Patient"    },
  { id:"sec-subjective", label:"Subjective", short:"Subj"       },
  { id:"sec-rom",        label:"ROM",        short:"ROM"        },
  { id:"sec-strength",   label:"Strength",   short:"Strength"   },
  { id:"sec-functional", label:"Functional", short:"Functional" },
  { id:"sec-note",       label:"Note",       short:"Note"       },
];

// ── Mobile section nav — canonical (matches trm-mobile-nav skill) ─────────────
const SECTION_NAV = [
  { key: "sec-patient",    label: "Patient",  ids: ["sec-patient"]    },
  { key: "sec-subjective", label: "Subj",     ids: ["sec-subjective"] },
  { key: "sec-rom",        label: "ROM",      ids: ["sec-rom"]        },
  { key: "sec-strength",   label: "Strength", ids: ["sec-strength"]   },
  { key: "sec-functional", label: "Function", ids: ["sec-functional"] },
  { key: "sec-note",       label: "Note",     ids: ["sec-note"]       },
];

function sectionHasData(group, d) {
  const checks = {
    "sec-patient":    () => d.patient?.date || d.patient?.surgeryType || d.bw,
    "sec-subjective": () => Object.values(d.subj||{}).some(Boolean),
    "sec-rom":        () => d.elbowFlexR || d.pronationR,
    "sec-strength":   () => d.gripR || d.erForceR || d.ash?.peakInv,
    "sec-functional": () => d.ckcuestReps || d.ueYbal?.invMedial || d.shotputInv1,
    "sec-note":       () => !!d.clinicalNotes,
  };
  return checks[group.id]?.() ? true : false;
}

// ─── Note builder ─────────────────────────────────────────────────────────────
function buildElbowNote(d) {
  const inv   = d.patient.involvedSide;
  const invR  = inv === "Right";
  const uninv = invR ? "Left" : "Right";
  const isDominant  = d.patient.armDominance === "dominant";
  const isContact   = d.patient.athleteCategory === "contact";
  const bwNum = toNum(d.bw);
  const strThr = isDominant && isContact ? 110 : 90;
  const lines = []; const add = l => lines.push(l); const br = () => lines.push("");
  const addIf = (c,l) => { if(c) lines.push(l); };

  add("OBJECTIVE — ELBOW REHABILITATION TESTING"); br();
  addIf(d.patient.date, `Date of Testing: ${d.patient.date}`);
  addIf(d.patient.surgeon, `Surgeon: ${d.patient.surgeon}`);
  addIf(d.patient.surgeryType, `Surgery Type: ${d.patient.surgeryType}`);
  addIf(hasVal(d.patient.weeksPostOp), `Weeks Post-Op: ${d.patient.weeksPostOp}`);
  add(`Involved Side: ${inv}`);
  addIf(d.patient.athleteCategory, `Athlete Category: ${d.patient.athleteCategory === "contact" ? "Contact" : "Non-Contact"}`);
  addIf(d.patient.armDominance, `Arm Dominance (Involved): ${isDominant ? "Dominant" : "Non-Dominant"}`);
  br();

  const subjVals = d.subj || {};
  if (Object.values(subjVals).some(Boolean)) {
    add("SUBJECTIVE CRITERIA");
    addIf(subjVals.painFree, "Pain-free with activity and at rest: Confirmed");
    addIf(subjVals.noSwelling, "No swelling or effusion: Confirmed");
    addIf(subjVals.noInstability, "No instability complaints: Confirmed");
    addIf(subjVals.physicianClear, "Physician clearance: Obtained");
    br();
  }

  const hasROM = [d.elbowFlexR,d.elbowFlexL,d.elbowExtR,d.elbowExtL,d.pronationR,d.pronationL,d.supinationR,d.supinationL].some(hasVal);
  if (hasROM || d.romWNL) {
    add("ELBOW RANGE OF MOTION");
    addIf(hasVal(d.elbowFlexR), `Elbow Flexion — Right: ${d.elbowFlexR}°`);
    addIf(hasVal(d.elbowFlexL), `Elbow Flexion — Left: ${d.elbowFlexL}°`);
    addIf(hasVal(d.elbowExtR), `Elbow Extension — Right: ${d.elbowExtR}°`);
    addIf(hasVal(d.elbowExtL), `Elbow Extension — Left: ${d.elbowExtL}°`);
    addIf(hasVal(d.pronationR), `Pronation — Right: ${d.pronationR}°`);
    addIf(hasVal(d.pronationL), `Pronation — Left: ${d.pronationL}°`);
    addIf(hasVal(d.supinationR), `Supination — Right: ${d.supinationR}°`);
    addIf(hasVal(d.supinationL), `Supination — Left: ${d.supinationL}°`);
    addIf(d.romWNL, "ROM within normal limits: Confirmed by clinician");
    br();
  }

  const gripInv   = invR ? d.gripR : d.gripL;
  const gripUninv = invR ? d.gripL : d.gripR;
  const gripInvNm   = calcTorqueNm(gripInv, d.leverArm);
  const gripUninvNm = calcTorqueNm(gripUninv, d.leverArm);
  const gripInvNorm   = calcNorm(gripInvNm, d.bw);
  const gripUninvNorm = calcNorm(gripUninvNm, d.bw);
  if (hasVal(gripInv) || hasVal(gripUninv)) {
    add("GRIP STRENGTH — DYNAMOMETER");
    const normTgt = d.patient.sex==="Female" ? "0.45–0.55 Nm/kg" : "0.55–0.65 Nm/kg";
    addIf(hasVal(gripInv), `Grip — ${inv} (Involved): ${gripInv} lbs${gripInvNm ? ` / ${gripInvNm} Nm` : ""}${gripInvNorm ? ` / ${gripInvNorm} Nm/kg` : ""}`);
    addIf(hasVal(gripUninv), `Grip — ${uninv} (Uninvolved): ${gripUninv} lbs${gripUninvNm ? ` / ${gripUninvNm} Nm` : ""}${gripUninvNorm ? ` / ${gripUninvNorm} Nm/kg` : ""}`);
    add(`  Normative Reference: ${normTgt}`);
    br();
  }

  // Shoulder Dynamo
  const scapInv  = invR ? d.scaptionForceR : d.scaptionForceL;
  const scapUninv= invR ? d.scaptionForceL : d.scaptionForceR;
  const erInv    = invR ? d.erForceR : d.erForceL;
  const erUninv  = invR ? d.erForceL : d.erForceR;
  const irInv    = invR ? d.irForceR : d.irForceL;
  const irUninv  = invR ? d.irForceL : d.irForceR;
  const scapLSI  = calcLSI(scapInv, scapUninv);
  const erLSI    = calcLSI(erInv, erUninv);
  const irLSI    = calcLSI(irInv, irUninv);
  const erIRRatio = calcERIR(erInv, irInv);
  const erBWR = bwNum>0 && hasVal(erInv)  ? calcBWRatio(erInv,  d.bw) : null;
  const irBWR = bwNum>0 && hasVal(irInv)  ? calcBWRatio(irInv,  d.bw) : null;
  const scBWR = bwNum>0 && hasVal(scapInv)? calcBWRatio(scapInv,d.bw) : null;
  const isThrower = isDominant && !isContact;

  if (hasVal(scapInv)||hasVal(erInv)||hasVal(irInv)) {
    add("SHOULDER DYNAMO STRENGTH");
    const lsiTgt = isDominant && isContact ? 110 : 90;
    if (hasVal(scapInv)) {
      add(`Scaption — ${inv}: ${scapInv} lbs${scBWR?` / ${scBWR}% BW`:""}`);
      addIf(hasVal(scapUninv), `Scaption — ${uninv}: ${scapUninv} lbs`);
      addIf(scapLSI, isThrower ? `  Scaption BW Ratio: ${scBWR}% (target 15–20%)` : `  Scaption LSI: ${scapLSI}% (target ≥${lsiTgt}%)`);
    }
    if (hasVal(erInv)) {
      add(`ER — ${inv}: ${erInv} lbs${erBWR?` / ${erBWR}% BW`:""}`);
      addIf(hasVal(erUninv), `ER — ${uninv}: ${erUninv} lbs`);
      addIf(erLSI, isThrower ? `  ER BW Ratio: ${erBWR}% (target 12–15%)` : `  ER LSI: ${erLSI}% (target ≥${lsiTgt}%)`);
    }
    if (hasVal(irInv)) {
      add(`IR — ${inv}: ${irInv} lbs${irBWR?` / ${irBWR}% BW`:""}`);
      addIf(hasVal(irUninv), `IR — ${uninv}: ${irUninv} lbs`);
      addIf(irLSI, isThrower ? `  IR BW Ratio: ${irBWR}% (target ≥25%)` : `  IR LSI: ${irLSI}% (target ≥${lsiTgt}%)`);
    }
    addIf(erIRRatio, `  ER:IR Ratio — ${inv}: ${erIRRatio}% (target 65–70%)`);
    br();
  }

  const ash = d.ash || {};
  if (hasVal(ash.peakInv)||hasVal(ash.peakUninv)) {
    add("ASH TEST — VALD FORCE PLATE");
    const ashThr = isDominant ? 110 : 90;
    const ashLSI  = calcLSI(ash.peakInv, ash.peakUninv);
    const ashTpfLSI = calcLSI(ash.tpfInv, ash.tpfUninv);
    addIf(hasVal(ash.peakInv),   `Peak Force — ${inv}: ${ash.peakInv} N`);
    addIf(hasVal(ash.peakUninv), `Peak Force — ${uninv}: ${ash.peakUninv} N`);
    addIf(ashLSI, `  Peak Force LSI: ${ashLSI}% (target ≥${ashThr}%${ashLSI&&parseFloat(ashLSI)>=ashThr?" ✓":""}`);
    addIf(hasVal(ash.tpfInv),   `Time to Peak — ${inv}: ${ash.tpfInv} ms`);
    addIf(hasVal(ash.tpfUninv), `Time to Peak — ${uninv}: ${ash.tpfUninv} ms`);
    addIf(ashTpfLSI, `  TPF Asymmetry: ${(100-parseFloat(ashTpfLSI)).toFixed(1)}%${ashTpfLSI&&parseFloat(ashTpfLSI)>=90?" ✓ <10% asymmetry":" — >10% asymmetry"}`);
    br();
  }

  const ckcVals = [d.ckcuestReps,d.ckcuestReps2,d.ckcuestReps3].map(v=>parseFloat(v)).filter(v=>!isNaN(v));
  if (ckcVals.length) {
    const avg = (ckcVals.reduce((a,b)=>a+b,0)/ckcVals.length).toFixed(1);
    add("CKC UPPER EXTREMITY STABILITY TEST (CKCUEST)");
    add(`Average reps: ${avg} (target >21 reps)${parseFloat(avg)>21?" ✓":""}`);
    br();
  }

  const ue = d.ueYbal || {};
  const calcComp = (m,il,sl,ll) => (hasVal(m)&&hasVal(il)&&hasVal(sl)&&hasVal(ll)&&toNum(ll)>0)?(((toNum(m)+toNum(il)+toNum(sl))/(3*toNum(ll)))*100).toFixed(1):null;
  const ueComp = calcComp(ue.invMedial,ue.invInfLat,ue.invSupLat,ue.invLimbLength);
  if (hasVal(ue.invMedial)||hasVal(ue.invLimbLength)) {
    add("UE Y-BALANCE TEST");
    addIf(hasVal(ue.invLimbLength),  `Limb Length — ${inv}: ${ue.invLimbLength} cm`);
    addIf(hasVal(ue.invMedial),      `${inv} — Medial: ${ue.invMedial} cm | Inf-Lat: ${ue.invInfLat||"—"} cm | Sup-Lat: ${ue.invSupLat||"—"} cm`);
    addIf(hasVal(ue.uninvMedial),    `${uninv} — Medial: ${ue.uninvMedial} cm | Inf-Lat: ${ue.uninvInfLat||"—"} cm | Sup-Lat: ${ue.uninvSupLat||"—"} cm`);
    addIf(ueComp, `  ${inv} Composite: ${ueComp}% (target ≥90%${ueComp&&parseFloat(ueComp)>=90?" ✓":""})`);
    br();
  }

  const spInvAvg   = avgTrials(d.shotputInv1,  d.shotputInv2,  d.shotputInv3);
  const spUninvAvg = avgTrials(d.shotputUninv1, d.shotputUninv2, d.shotputUninv3);
  const spLSI = calcLSI(spInvAvg, spUninvAvg);
  const spTgt = isDominant ? 110 : 90;
  if (spInvAvg || spUninvAvg) {
    add("SEATED SHOTPUT TEST");
    addIf(spInvAvg,   `${inv} avg: ${spInvAvg}"`);
    addIf(spUninvAvg, `${uninv} avg: ${spUninvAvg}"`);
    addIf(spLSI, `  LSI: ${spLSI}% (target >${spTgt}%${spLSI&&parseFloat(spLSI)>spTgt?" ✓":""})`);
    br();
  }

  const pe = d.pse || {};
  const peLSI = calcLSI(pe.timeInv, pe.timeUninv);
  if (hasVal(pe.timeInv)||hasVal(pe.timeUninv)) {
    add("POSTERIOR SHOULDER ENDURANCE TEST");
    addIf(d.bw, `Load: ${(toNum(d.bw)*0.453592*0.02).toFixed(2)} kg (2% BW)`);
    addIf(hasVal(pe.timeInv),   `Time Held — ${inv}: ${pe.timeInv} sec`);
    addIf(hasVal(pe.timeUninv), `Time Held — ${uninv}: ${pe.timeUninv} sec`);
    addIf(peLSI, `  Time LSI: ${peLSI}% (target ≥90%${peLSI&&parseFloat(peLSI)>=90?" ✓":""})`);
    br();
  }

  if (d.n9090Pass || d.fdsExtPass) {
    add("CLINICAL ASSESSMENTS");
    addIf(d.n9090Pass, "90/90 Assessment: Pass");
    addIf(d.fdsExtPass, "FDS Extension Test: Pass");
    br();
  }

  if (d.clinicalNotes?.trim()) {
    add("CLINICAL NOTES");
    add(d.clinicalNotes.trim());
    br();
  }

  return lines.join("\n").trim();
}

// ─── PDF Save / Load ──────────────────────────────────────────────────────────
async function saveSessionPDF(data, mode="download") {
  const { PDFDocument, rgb, StandardFonts } = await getPdfLib();
  const doc      = await PDFDocument.create();
  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Embed TRM SVG logo as PNG (pdf-lib doesn't support SVG natively)
  const TRM_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 867 352" fill="white"><path fill-rule="evenodd" d="M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z"/></svg>`;
  const logoImg = await new Promise((resolve, reject) => {
    const blob = new Blob([TRM_LOGO_SVG], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 867; canvas.height = 352;
      canvas.getContext("2d").drawImage(img, 0, 0, 867, 352);
      canvas.toBlob(async (pngBlob) => {
        URL.revokeObjectURL(url);
        resolve(await doc.embedPng(new Uint8Array(await pngBlob.arrayBuffer())));
      }, "image/png");
    };
    img.onerror = reject;
    img.src = url;
  });
  // Logo dimensions (aspect ratio 867:352 ≈ 2.46:1)
  const LOGO_H    = 40;
  const LOGO_W    = Math.round(LOGO_H * 867 / 352); // ~99px
  const LOGO_H_SM = 16;
  const LOGO_W_SM = Math.round(LOGO_H_SM * 867 / 352); // ~39px

  // WinAnsi sanitizer — prevents pdf-lib crashes on non-ASCII chars
  const san = t => String(t)
    .replace(/−/g,"-").replace(/—/g,"--").replace(/–/g,"-")
    .replace(/≥/g,">=").replace(/≤/g,"<=").replace(/°/g," deg")
    .replace(/✓/g,"[check]").replace(/✗/g,"[x]").replace(/⚠/g,"[!]")
    .replace(/[^\x00-\xFF]/g,"?");

  // Color tokens — matches ACL light paper style
  const DARK_R   = rgb(0.07, 0.07, 0.07);
  const WHITE_R  = rgb(1, 1, 1);
  const BLACK_R  = rgb(0.05, 0.05, 0.05);
  const GRAY     = rgb(0.45, 0.45, 0.45);
  const LGRAY    = rgb(0.82, 0.82, 0.82);
  const BGRAY    = rgb(0.96, 0.96, 0.96);
  const BORDER_R = rgb(0.88, 0.88, 0.88);
  const LIME_R   = rgb(0.42, 0.82, 0.12);
  const LIME_BG  = rgb(0.90, 0.98, 0.82);
  const LIME_TXT = rgb(0.18, 0.48, 0.04);
  const GOLD_R   = rgb(0.90, 0.65, 0.08);
  const GOLD_BG  = rgb(1.0,  0.95, 0.80);
  const GOLD_TXT = rgb(0.65, 0.42, 0.02);
  const RED_R    = rgb(0.88, 0.22, 0.22);
  const RED_BG   = rgb(1.0,  0.90, 0.90);
  const RED_TXT  = rgb(0.65, 0.10, 0.10);

  // LSI status helper
  const lsiSt = (v, thr=90) => {
    const n = parseFloat(v);
    if (isNaN(n)) return null;
    if (n >= thr)      return { color:LIME_R, bg:LIME_BG, txt:LIME_TXT, label:"PASS" };
    if (n >= thr - 10) return { color:GOLD_R, bg:GOLD_BG, txt:GOLD_TXT, label:"BORDERLINE" };
    return                    { color:RED_R,  bg:RED_BG,  txt:RED_TXT,  label:"FAIL" };
  };

  // Compute metrics
  const invR    = data.patient.involvedSide === "Right";
  const inv     = data.patient.involvedSide || "Left";
  const uninv   = invR ? "Left" : "Right";
  const isDom   = data.patient.armDominance === "dominant";
  const isCont  = data.patient.athleteCategory === "contact";
  const strThr  = isDom && isCont ? 110 : 90;
  const spThr   = isDom ? 110 : 90;

  const gripInv   = invR ? data.gripR   : data.gripL;
  const gripUninv = invR ? data.gripL   : data.gripR;
  const gripLSI   = calcLSI(gripInv, gripUninv);

  const scapInv   = invR ? data.scaptionForceR : data.scaptionForceL;
  const scapUninv = invR ? data.scaptionForceL : data.scaptionForceR;
  const scapLSI   = calcLSI(scapInv, scapUninv);

  const erInv   = invR ? data.erForceR : data.erForceL;
  const erUninv = invR ? data.erForceL : data.erForceR;
  const erLSI   = calcLSI(erInv, erUninv);

  const irInv   = invR ? data.irForceR : data.irForceL;
  const irUninv = invR ? data.irForceL : data.irForceR;
  const irLSI   = calcLSI(irInv, irUninv);

  const erIRRatio = calcERIR(erInv, irInv);

  const ash       = data.ash || {};
  const ashLSI    = calcLSI(ash.peakInv, ash.peakUninv);
  const ashTpfLSI = calcLSI(ash.tpfInv, ash.tpfUninv);
  const ashThr    = isDom ? 110 : 90;

  const ckcVals = [data.ckcuestReps,data.ckcuestReps2,data.ckcuestReps3].map(v=>parseFloat(v)).filter(v=>!isNaN(v));
  const ckcAvg  = ckcVals.length ? (ckcVals.reduce((a,b)=>a+b,0)/ckcVals.length).toFixed(1) : null;

  const ue = data.ueYbal || {};
  const ueCompInv = (hasVal(ue.invMedial)&&hasVal(ue.invInfLat)&&hasVal(ue.invSupLat)&&hasVal(ue.invLimbLength)&&toNum(ue.invLimbLength)>0)
    ? (((toNum(ue.invMedial)+toNum(ue.invInfLat)+toNum(ue.invSupLat))/(3*toNum(ue.invLimbLength)))*100).toFixed(1) : null;

  const spInvAvg   = avgTrials(data.shotputInv1,  data.shotputInv2,  data.shotputInv3);
  const spUninvAvg = avgTrials(data.shotputUninv1, data.shotputUninv2, data.shotputUninv3);
  const spLSI = calcLSI(spInvAvg, spUninvAvg);

  const pe    = data.pse || {};
  const peLSI = calcLSI(pe.timeInv, pe.timeUninv);

  // Session embed
  const sessionJson = JSON.stringify(data);
  const utf8Bytes   = new TextEncoder().encode(sessionJson);
  let binary = ""; utf8Bytes.forEach(b=>{ binary+=String.fromCharCode(b); });
  const encoded = btoa(binary);
  doc.setSubject("TRM_ELBOW_V1:" + encoded);
  doc.setKeywords(["TRM_ELBOW_V1:" + encoded]);
  doc.setTitle(san("TRM Elbow Session -- " + (data.patient.date || new Date().toISOString().slice(0,10))));

  // Page layout constants
  const L      = 36;
  const R_edge = 576;
  const CW     = R_edge - L;
  const width  = 612;
  const height = 792;
  const col2   = L + Math.floor(CW / 2) + 4;

  let page, y, pageCount = 0;

  const addNewPage = () => {
    // Draw footer on the page we're leaving (skip on very first call)
    if (pageCount > 0) {
      page.drawRectangle({ x:0, y:0, width, height:26, color:DARK_R });
      page.drawRectangle({ x:0, y:26, width, height:1.5, color:LIME_R });
      page.drawText(san("TRM  |  Elbow Rehabilitation Testing Tool  --  Session data embedded. Upload to TRM app to restore."), {
        x:L, y:8, size:6.5, font, color:rgb(0.44,0.44,0.44)
      });
      page.drawText(san(`Page ${pageCount}`), {
        x:R_edge - font.widthOfTextAtSize(`Page ${pageCount}`, 6.5), y:8, size:6.5, font, color:rgb(0.38,0.38,0.38)
      });
    }
    pageCount++;
    page = doc.addPage([width, height]);

    if (pageCount === 1) {
      // ── Full page-1 header ──────────────────────────────────────────────
      page.drawRectangle({ x:0, y:height-70, width, height:70, color:DARK_R });
      page.drawRectangle({ x:0, y:height-72, width, height:2, color:LIME_R });
      page.drawImage(logoImg, { x:L, y:height-62, width:LOGO_W, height:LOGO_H });
      page.drawLine({ start:{x:L+LOGO_W+10, y:height-16}, end:{x:L+LOGO_W+10, y:height-62}, thickness:0.8, color:rgb(0.28,0.28,0.28) });
      page.drawText(san("Elbow Testing & Outcome Measures"), { x:L+LOGO_W+20, y:height-34, size:10, font, color:rgb(0.68,0.68,0.68) });
      page.drawText(san("SESSION REPORT"), { x:L+LOGO_W+20, y:height-52, size:8.5, font:fontBold, color:LIME_R });
      const dateStr = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
      page.drawText(san(dateStr), { x:R_edge-font.widthOfTextAtSize(dateStr,8), y:height-34, size:8, font, color:rgb(0.50,0.50,0.50) });
      page.drawText(san("Physician Reference"), { x:R_edge-fontBold.widthOfTextAtSize("Physician Reference",7.5), y:height-50, size:7.5, font:fontBold, color:rgb(0.38,0.38,0.38) });
      // ── Patient strip ───────────────────────────────────────────────────
      const p = data.patient;
      page.drawRectangle({ x:0, y:height-108, width, height:36, color:BGRAY });
      page.drawRectangle({ x:0, y:height-109, width, height:1, color:BORDER_R });
      const ptFields = [
        ["Date",         p.date         || "--"],
        ["Weeks Post-Op",p.weeksPostOp  ? `${p.weeksPostOp} wks` : "--"],
        ["Side",         p.involvedSide || "--"],
        ["Surgery",      p.surgeryType  || "--"],
        ["Surgeon",      p.surgeon      ? `Dr. ${p.surgeon}` : "--"],
      ];
      const ptColW = CW / ptFields.length;
      ptFields.forEach(([label, val], i) => {
        const px = L + i * ptColW;
        page.drawText(san(label.toUpperCase()), { x:px, y:height-84, size:5.5, font:fontBold, color:GRAY });
        const v = val.length > 16 ? val.slice(0,15) + "." : val;
        page.drawText(san(v), { x:px, y:height-97, size:8.5, font:fontBold, color:BLACK_R });
      });
      y = height - 122;
    } else {
      // ── Compact continuation header ─────────────────────────────────────
      page.drawRectangle({ x:0, y:height-32, width, height:32, color:DARK_R });
      page.drawRectangle({ x:0, y:height-34, width, height:2, color:LIME_R });
      page.drawImage(logoImg, { x:L, y:height-24, width:LOGO_W_SM, height:LOGO_H_SM });
      page.drawText(san("  |  Elbow Testing & Outcome Measures  --  continued"), {
        x:L+LOGO_W_SM+2, y:height-22, size:8.5, font:fontBold, color:rgb(0.72,0.72,0.72)
      });
      const ptCont = san(`${data.patient.date||""}${data.patient.weeksPostOp?"  |  Wk "+data.patient.weeksPostOp:""}${data.patient.involvedSide?"  |  "+data.patient.involvedSide+" side":""}`).trim();
      if (ptCont) page.drawText(ptCont, { x:R_edge-font.widthOfTextAtSize(ptCont,7), y:height-22, size:7, font, color:rgb(0.50,0.50,0.50) });
      y = height - 52;
    }
  };

  // Drawing helpers
  const wrapLine = (text, fnt, size, maxW) => {
    const words = text.split(" "); const wrapped = []; let cur = "";
    for (const w of words) { const test = cur ? cur+" "+w : w; if (fnt.widthOfTextAtSize(test,size)<=maxW){cur=test;}else{if(cur)wrapped.push(cur);cur=w;} }
    if (cur) wrapped.push(cur);
    return wrapped.length ? wrapped : [""];
  };

  const section = title => {
    if (y < 140) addNewPage();
    y -= 4;
    page.drawRectangle({ x:L-4, y:y-3, width:CW+8, height:14, color:rgb(0.11,0.11,0.11) });
    page.drawRectangle({ x:L-4, y:y-3, width:3,    height:14, color:LIME_R });
    page.drawText(san(title.toUpperCase()), { x:L+5, y, size:7, font:fontBold, color:LGRAY });
    y -= 17;
  };

  const row = (label, value, x2=null, label2=null, value2=null) => {
    if (y < 120) addNewPage();
    page.drawText(san(label), { x:L, y, size:8.5, font:fontBold, color:BLACK_R });
    page.drawText(san(String(value||"--")), { x:L+165, y, size:8.5, font, color:value?BLACK_R:LGRAY });
    if (x2 && label2) {
      page.drawText(san(label2), { x:x2, y, size:8.5, font:fontBold, color:BLACK_R });
      page.drawText(san(String(value2||"--")), { x:x2+165, y, size:8.5, font, color:value2?BLACK_R:LGRAY });
    }
    y -= 12;
  };

  const lsiRow = (label, val, thr=90, unit="%") => {
    if (y < 120) addNewPage();
    const st = lsiSt(val, thr);
    page.drawText(san(label), { x:L, y, size:8.5, font:fontBold, color:BLACK_R });
    if (val !== null && val !== undefined) {
      const valStr = `${val}${unit}`;
      page.drawText(san(valStr), { x:L+165, y, size:8.5, font:fontBold, color:st?st.color:GRAY });
      if (st) {
        const chipX = L+165+fontBold.widthOfTextAtSize(valStr,8.5)+8;
        const chipW = fontBold.widthOfTextAtSize(st.label,5.8)+8;
        page.drawRectangle({ x:chipX, y:y-2, width:chipW, height:11, color:st.bg });
        page.drawRectangle({ x:chipX, y:y-2, width:chipW, height:1.5, color:st.color });
        page.drawText(san(st.label), { x:chipX+4, y:y+1, size:5.8, font:fontBold, color:st.txt });
      }
    } else {
      page.drawText("--", { x:L+165, y, size:8.5, font, color:LGRAY });
    }
    y -= 12;
  };

  const divider = () => {
    if (y < 120) { addNewPage(); return; }
    page.drawLine({ start:{x:L,y}, end:{x:R_edge,y}, thickness:0.4, color:BORDER_R });
    y -= 8;
  };

  // ── Page 1: Clinical data ───────────────────────────────────────────────────
  addNewPage();

  // Clinical snapshot boxes (up to 4 key LSI metrics)
  const snapItems = [];
  if (gripLSI) snapItems.push({ label:"Grip LSI",     value:gripLSI,  unit:"%", st:lsiSt(gripLSI,strThr),  note:`${inv} vs ${uninv}` });
  if (erLSI)   snapItems.push({ label:"ER LSI",        value:erLSI,    unit:"%", st:lsiSt(erLSI,strThr),    note:`Target >=${strThr}%` });
  if (ashLSI)  snapItems.push({ label:"ASH Peak LSI",  value:ashLSI,   unit:"%", st:lsiSt(ashLSI,ashThr),   note:"Force plate" });
  if (spLSI)   snapItems.push({ label:"Shotput LSI",   value:spLSI,    unit:"%", st:lsiSt(spLSI,spThr),     note:`Target >${spThr}%` });
  if (snapItems.length === 0 && ckcAvg) snapItems.push({ label:"CKC UEST Avg", value:ckcAvg, unit:" reps",
    st: parseFloat(ckcAvg)>21 ? {color:LIME_R,bg:LIME_BG,txt:LIME_TXT,label:"PASS"} : {color:GOLD_R,bg:GOLD_BG,txt:GOLD_TXT,label:"BORDERLINE"},
    note:"Target >21 reps" });
  const showSnap = snapItems.slice(0,4);

  page.drawRectangle({ x:L-4, y:y-1, width:CW+8, height:15, color:rgb(0.11,0.11,0.11) });
  page.drawRectangle({ x:L-4, y:y-1, width:3, height:15, color:LIME_R });
  page.drawText("CLINICAL SNAPSHOT  --  KEY OUTCOME METRICS", { x:L+6, y:y+3, size:7.5, font:fontBold, color:LIME_R });
  y -= 20;

  if (showSnap.length > 0) {
    const boxW = Math.floor(CW/4) - 3;
    const boxH = 50;
    showSnap.forEach((item, i) => {
      const bx = L + i*(boxW+4);
      const dc = item.st ? item.st.color : LGRAY;
      const bg = item.st ? item.st.bg    : BGRAY;
      page.drawRectangle({ x:bx, y:y-boxH, width:boxW, height:boxH, color:bg });
      page.drawRectangle({ x:bx, y:y,      width:boxW, height:2,     color:dc });
      page.drawRectangle({ x:bx, y:y-boxH, width:3,    height:boxH,  color:dc });
      page.drawText(san(item.label.toUpperCase()), { x:bx+8, y:y-12, size:6.5, font:fontBold, color:GRAY });
      page.drawText(san(`${item.value}${item.unit}`), { x:bx+8, y:y-29, size:18, font:fontBold, color:dc });
      if (item.st) page.drawText(san(item.st.label), { x:bx+8, y:y-40, size:6, font:fontBold, color:item.st.txt });
      page.drawText(san(item.note), { x:bx+8, y:y-boxH+5, size:5.5, font, color:GRAY });
    });
    y -= boxH + 10;
  } else {
    page.drawText("No computed metrics -- enter testing data to generate the snapshot.", { x:L, y, size:8, font, color:GRAY });
    y -= 16;
  }
  y -= 4;

  // Patient info
  section("Patient Information");
  const p = data.patient;
  if (p.date || p.weeksPostOp) row("Date / Weeks Post-Op", san(`${p.date||"--"}  /  ${p.weeksPostOp?p.weeksPostOp+" wks":"--"}`));
  if (p.surgeryType) row("Surgery Type", san(p.surgeryType));
  if (p.surgeon)     row("Surgeon",      san(p.surgeon));
  row("Involved Side", san(inv));
  if (p.athleteCategory || p.armDominance)
    row("Athlete Category", san(isCont?"Contact":"Non-Contact"), col2, "Arm (Involved)", san(isDom?"Dominant":"Non-Dominant"));
  if (hasVal(data.bw) || hasVal(data.leverArm))
    row("Body Weight (lbs)", san(data.bw||"--"), col2, "Lever Arm (cm)", san(data.leverArm||"--"));

  // Subjective criteria
  const subj = data.subj || {};
  if (Object.values(subj).some(Boolean)) {
    divider(); section("Subjective Criteria");
    if (subj.painFree)       row("Pain-free with activity", "Yes");
    if (subj.noSwelling)     row("No swelling / effusion",  "Yes");
    if (subj.noInstability)  row("No instability",          "Yes");
    if (subj.physicianClear) row("Physician clearance",     "Obtained");
  }

  // ROM
  const hasROM = [data.elbowFlexR,data.elbowFlexL,data.elbowExtR,data.elbowExtL,data.pronationR,data.pronationL,data.supinationR,data.supinationL].some(hasVal);
  if (hasROM || data.romWNL) {
    divider(); section("Range of Motion");
    if (hasVal(data.elbowFlexR)||hasVal(data.elbowFlexL))   row("Elbow Flex R / L",  san(`${data.elbowFlexR||"--"} deg / ${data.elbowFlexL||"--"} deg`));
    if (hasVal(data.elbowExtR) ||hasVal(data.elbowExtL))    row("Elbow Ext R / L",   san(`${data.elbowExtR||"--"} deg / ${data.elbowExtL||"--"} deg`));
    if (hasVal(data.pronationR)||hasVal(data.pronationL))   row("Pronation R / L",   san(`${data.pronationR||"--"} deg / ${data.pronationL||"--"} deg`));
    if (hasVal(data.supinationR)||hasVal(data.supinationL)) row("Supination R / L",  san(`${data.supinationR||"--"} deg / ${data.supinationL||"--"} deg`));
    if (data.romWNL) row("ROM WNL", "Confirmed");
  }

  // Grip strength
  if (hasVal(gripInv)||hasVal(gripUninv)) {
    divider(); section("Grip Strength (Dynamometer)");
    if (hasVal(gripInv))   row(san(`Grip ${inv} (Involved)`),   san(`${gripInv} lbs`));
    if (hasVal(gripUninv)) row(san(`Grip ${uninv} (Uninvolved)`), san(`${gripUninv} lbs`));
    if (gripLSI)           lsiRow("Grip LSI", gripLSI, strThr);
    if (y < 120) addNewPage();
    page.drawText(san(`Normative ref: sex-matched normative data`), { x:L, y, size:7.5, font, color:GRAY }); y -= 12;
  }

  // Shoulder dynamo
  if (hasVal(scapInv)||hasVal(erInv)||hasVal(irInv)) {
    divider(); section("Shoulder Dynamo Strength");
    if (hasVal(scapInv)||hasVal(scapUninv)) {
      row(san(`Scaption ${inv}`), san(`${scapInv||"--"} lbs`), col2, san(`Scaption ${uninv}`), san(`${scapUninv||"--"} lbs`));
      if (scapLSI) lsiRow("Scaption LSI", scapLSI, strThr);
    }
    if (hasVal(erInv)||hasVal(erUninv)) {
      row(san(`ER ${inv}`), san(`${erInv||"--"} lbs`), col2, san(`ER ${uninv}`), san(`${erUninv||"--"} lbs`));
      if (erLSI) lsiRow("ER LSI", erLSI, strThr);
    }
    if (hasVal(irInv)||hasVal(irUninv)) {
      row(san(`IR ${inv}`), san(`${irInv||"--"} lbs`), col2, san(`IR ${uninv}`), san(`${irUninv||"--"} lbs`));
      if (irLSI) lsiRow("IR LSI", irLSI, strThr);
    }
    if (erIRRatio) lsiRow(san(`ER:IR Ratio (${inv})`), erIRRatio, 65);
  }

  // ASH test
  if (hasVal(ash.peakInv)||hasVal(ash.peakUninv)) {
    divider(); section("ASH Test (Force Plate)");
    row(san(`Peak Force ${inv}`), san(`${ash.peakInv||"--"} N`), col2, san(`Peak Force ${uninv}`), san(`${ash.peakUninv||"--"} N`));
    if (ashLSI) lsiRow("Peak Force LSI", ashLSI, ashThr);
    if (hasVal(ash.tpfInv)||hasVal(ash.tpfUninv)) {
      row(san(`TPF ${inv}`), san(`${ash.tpfInv||"--"} ms`), col2, san(`TPF ${uninv}`), san(`${ash.tpfUninv||"--"} ms`));
      if (ashTpfLSI) {
        const tpfAsym = (100 - parseFloat(ashTpfLSI)).toFixed(1);
        const tpfSt = parseFloat(tpfAsym) <= 10
          ? { color:LIME_R, bg:LIME_BG, txt:LIME_TXT, label:"PASS" }
          : parseFloat(tpfAsym) <= 15
            ? { color:GOLD_R, bg:GOLD_BG, txt:GOLD_TXT, label:"BORDERLINE" }
            : { color:RED_R,  bg:RED_BG,  txt:RED_TXT,  label:"FAIL" };
        if (y < 120) addNewPage();
        page.drawText(san("TPF Asymmetry"), { x:L, y, size:8.5, font:fontBold, color:BLACK_R });
        page.drawText(san(`${tpfAsym}%`), { x:L+165, y, size:8.5, font:fontBold, color:tpfSt.color });
        const chipX = L+165+fontBold.widthOfTextAtSize(`${tpfAsym}%`,8.5)+8;
        const chipW = fontBold.widthOfTextAtSize(tpfSt.label,5.8)+8;
        page.drawRectangle({ x:chipX, y:y-2, width:chipW, height:11, color:tpfSt.bg });
        page.drawRectangle({ x:chipX, y:y-2, width:chipW, height:1.5, color:tpfSt.color });
        page.drawText(san(tpfSt.label), { x:chipX+4, y:y+1, size:5.8, font:fontBold, color:tpfSt.txt });
        y -= 12;
      }
    }
  }

  // CKC UEST
  if (ckcAvg) {
    divider(); section("CKC Upper Extremity Stability Test");
    const ckcSt = parseFloat(ckcAvg) > 21
      ? { color:LIME_R, bg:LIME_BG, txt:LIME_TXT, label:"PASS" }
      : { color:GOLD_R, bg:GOLD_BG, txt:GOLD_TXT, label:"BORDERLINE" };
    if (y < 120) addNewPage();
    page.drawText(san("Avg Reps (target >21)"), { x:L, y, size:8.5, font:fontBold, color:BLACK_R });
    page.drawText(san(`${ckcAvg} reps`), { x:L+165, y, size:8.5, font:fontBold, color:ckcSt.color });
    const cChipX = L+165+fontBold.widthOfTextAtSize(`${ckcAvg} reps`,8.5)+8;
    const cChipW = fontBold.widthOfTextAtSize(ckcSt.label,5.8)+8;
    page.drawRectangle({ x:cChipX, y:y-2, width:cChipW, height:11, color:ckcSt.bg });
    page.drawRectangle({ x:cChipX, y:y-2, width:cChipW, height:1.5, color:ckcSt.color });
    page.drawText(san(ckcSt.label), { x:cChipX+4, y:y+1, size:5.8, font:fontBold, color:ckcSt.txt });
    y -= 12;
  }

  // UE Y-Balance
  if (hasVal(ue.invMedial)||ueCompInv) {
    divider(); section("UE Y-Balance Test");
    if (hasVal(ue.invLimbLength)) row("Limb Length (Inv)", san(`${ue.invLimbLength} cm`));
    if (hasVal(ue.invMedial)) row(san(`${inv}: Med / InfLat / SupLat`), san(`${ue.invMedial||"--"} / ${ue.invInfLat||"--"} / ${ue.invSupLat||"--"} cm`));
    if (hasVal(ue.uninvMedial)) row(san(`${uninv}: Med / InfLat / SupLat`), san(`${ue.uninvMedial||"--"} / ${ue.uninvInfLat||"--"} / ${ue.uninvSupLat||"--"} cm`));
    if (ueCompInv) lsiRow(san(`${inv} Composite`), ueCompInv, 90);
  }

  // Shotput
  if (spInvAvg||spUninvAvg) {
    divider(); section("Seated Shotput Test");
    if (spInvAvg)   row(san(`${inv} Avg`),   san(`${spInvAvg}"`));
    if (spUninvAvg) row(san(`${uninv} Avg`), san(`${spUninvAvg}"`));
    if (spLSI) lsiRow("Shotput LSI", spLSI, spThr);
  }

  // PSE
  if (hasVal(pe.timeInv)||hasVal(pe.timeUninv)) {
    divider(); section("Posterior Shoulder Endurance (PSE)");
    if (hasVal(pe.timeInv))   row(san(`Time ${inv}`),   san(`${pe.timeInv} sec`));
    if (hasVal(pe.timeUninv)) row(san(`Time ${uninv}`), san(`${pe.timeUninv} sec`));
    if (peLSI) lsiRow("Time LSI", peLSI, 90);
  }

  // Clinical assessments
  if (data.n9090Pass||data.fdsExtPass) {
    divider(); section("Clinical Assessments");
    if (data.n9090Pass)  row("90/90 Assessment",    "Pass");
    if (data.fdsExtPass) row("FDS Extension Test",  "Pass");
  }

  // Clinical notes
  if (data.clinicalNotes?.trim()) {
    divider(); section("Clinical Notes");
    for (const nl of data.clinicalNotes.trim().split("\n")) {
      for (const wl of wrapLine(nl.trim(), font, 8.5, CW)) {
        if (y < 120) addNewPage();
        page.drawText(san(wl), { x:L, y, size:8.5, font, color:BLACK_R }); y -= 12;
      }
    }
  }

  // ── Page 2: SOAP Note ───────────────────────────────────────────────────────
  addNewPage();
  const noteText = buildElbowNote(data);
  for (const rawLine of noteText.split("\n")) {
    if (y < 60) addNewPage();
    if (rawLine === "") { y -= 7; continue; }
    const isHeader = rawLine===rawLine.toUpperCase() && rawLine.trim().length>0 && !rawLine.includes(":") && rawLine.trim().length<80;
    const isBullet = rawLine.startsWith("  ");
    if (isHeader) {
      y -= 4;
      page.drawRectangle({ x:L-4, y:y-3, width:R_edge-L+8, height:14, color:rgb(0.11,0.11,0.11) });
      page.drawRectangle({ x:L-4, y:y-3, width:3, height:14, color:LIME_R });
      page.drawText(san(rawLine.trim()), { x:L+5, y, size:7, font:fontBold, color:LGRAY }); y -= 18;
    } else {
      const xOff = isBullet ? L+10 : L;
      for (const wl of wrapLine(rawLine.trim(), font, 9, R_edge-xOff)) {
        if (y < 60) addNewPage();
        page.drawText(san(wl), { x:xOff, y, size:9, font, color:BLACK_R }); y -= 13;
      }
    }
  }

  // Footer on the last page
  page.drawRectangle({ x:0, y:0, width, height:26, color:DARK_R });
  page.drawRectangle({ x:0, y:26, width, height:1.5, color:LIME_R });
  page.drawText(san("TRM  |  Elbow Rehabilitation Testing Tool  --  Session data embedded. Upload to TRM app to restore."), {
    x:L, y:8, size:6.5, font, color:rgb(0.44,0.44,0.44)
  });
  page.drawText(san(`Page ${pageCount}`), {
    x:R_edge - font.widthOfTextAtSize(`Page ${pageCount}`, 6.5), y:8, size:6.5, font, color:rgb(0.38,0.38,0.38)
  });

  // Save / share
  const pdfBytes = await doc.save();
  const filename  = `TRM_Elbow_${new Date().toISOString().slice(0,10)}.pdf`;
  const blob      = new Blob([pdfBytes], { type:"application/pdf" });
  if (mode === "share") {
    const shareFile = new File([blob], filename, { type:"application/pdf" });
    if (navigator.canShare && navigator.canShare({ files:[shareFile] })) {
      try { await navigator.share({ files:[shareFile], title:"TRM Elbow Session PDF" }); }
      catch(err) { if (err.name !== "AbortError") throw err; }
      return "shared";
    }
    return "share-unsupported";
  }
  const url = URL.createObjectURL(blob);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (!isIOS) {
    const a = document.createElement("a"); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    if (isSafari) { setTimeout(()=>{ window.open(url,"_blank"); },100); setTimeout(()=>URL.revokeObjectURL(url),90000); }
    else { setTimeout(()=>URL.revokeObjectURL(url),30000); }
    return "downloaded";
  }
  window.open(url,"_blank"); setTimeout(()=>URL.revokeObjectURL(url),60000); return "ios-tab";
}

async function loadSessionPDF(file, onData, onError) {
  try {
    const { PDFDocument } = await getPdfLib();
    const arrayBuffer = await file.arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer,{ignoreEncryption:true});
    let encoded=null;
    const PREFIX="TRM_ELBOW_V1:";
    const subject=doc.getSubject()||"";
    if(subject.startsWith(PREFIX)) encoded=subject.slice(PREFIX.length);
    if(!encoded){ const rawKw=doc.getKeywords()||""; const kw=Array.isArray(rawKw)?(rawKw[0]||""):rawKw; if(kw.startsWith(PREFIX)) encoded=kw.slice(PREFIX.length); }
    if(!encoded){ onError("This PDF does not contain TRM Elbow session data. Make sure you are uploading a PDF saved directly from the TRM Elbow app."); return; }
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const json=new TextDecoder("utf-8").decode(bytes);
    onData(JSON.parse(json));
  } catch(e) { onError("Could not read session data from this PDF. ("+e.message+")"); }
}

// ─── TESTING TAB ──────────────────────────────────────────────────────────────
function Tab1({ data:d, setData:setD }) {
  const sd  = (k,v) => setD(p=>({...p,[k]:v}));
  const setP = (k,v) => sd("patient",{...d.patient,[k]:v});
  const setSubj = (k) => sd("subj",{...d.subj,[k]:!d.subj[k]});
  const setAsh  = (k,v) => sd("ash",{...d.ash,[k]:v});
  const setUeYbal = (k,v) => sd("ueYbal",{...d.ueYbal,[k]:v});
  const setPlyo   = (k,v) => sd("plyo",{...d.plyo,[k]:v});
  const setPse    = (k,v) => sd("pse",{...d.pse,[k]:v});

  const [activeCard, setActiveCard] = useState("patient");
  const [noteCopied, setNoteCopied] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTION_NAV[0].key);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700);
  const navLockRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const visible = new Set();
    const update = () => {
      if (navLockRef.current) return; // tap-driven scroll in progress — don't override
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

  const inv   = d.patient.involvedSide;
  const invR  = inv === "Right";
  const uninv = invR ? "Left" : "Right";
  const isDominant = d.patient.armDominance === "dominant";
  const isContact  = d.patient.athleteCategory === "contact";
  const isNonContact = d.patient.athleteCategory === "non-contact";
  const isThrower  = isDominant && isNonContact;
  const strLsiThreshold = isDominant && isContact ? 110 : 90;

  const bwNum = toNum(d.bw); const bwOk = hasVal(d.bw) && bwNum > 0;
  const sessionStarted = !!d.patient.armDominance;

  // Grip calcs
  const gripInv    = invR ? d.gripR : d.gripL;
  const gripUninv  = invR ? d.gripL : d.gripR;
  const gripInvNm  = calcTorqueNm(gripInv,  d.leverArm);
  const gripUninvNm= calcTorqueNm(gripUninv, d.leverArm);
  const gripInvNorm  = calcNorm(gripInvNm,  d.bw);
  const gripUninvNorm= calcNorm(gripUninvNm, d.bw);
  const gripMin = d.patient.sex==="Female" ? 0.45 : 0.55;
  const gripMax = d.patient.sex==="Female" ? 0.55 : 0.65;
  const gripInvPass  = gripInvNorm  ? (parseFloat(gripInvNorm) >= gripMin && parseFloat(gripInvNorm) <= gripMax) : null;
  const gripUninvPass= gripUninvNorm? (parseFloat(gripUninvNorm)>= gripMin && parseFloat(gripUninvNorm)<= gripMax): null;

  // Shoulder Dynamo
  const scapInv   = invR ? d.scaptionForceR : d.scaptionForceL;
  const scapUninv = invR ? d.scaptionForceL : d.scaptionForceR;
  const erInv     = invR ? d.erForceR : d.erForceL;
  const erUninv   = invR ? d.erForceL : d.erForceR;
  const irInv     = invR ? d.irForceR : d.irForceL;
  const irUninv   = invR ? d.irForceL : d.irForceR;
  const scapTPFInv  = invR ? d.scaptionTPFR : d.scaptionTPFL;
  const scapTPFUninv= invR ? d.scaptionTPFL : d.scaptionTPFR;
  const erTPFInv    = invR ? d.erTPFR : d.erTPFL;
  const erTPFUninv  = invR ? d.erTPFL : d.erTPFR;
  const irTPFInv    = invR ? d.irTPFR : d.irTPFL;
  const irTPFUninv  = invR ? d.irTPFL : d.irTPFR;

  const scapLSI = calcLSI(scapInv,scapUninv);
  const erLSI   = calcLSI(erInv,erUninv);
  const irLSI   = calcLSI(irInv,irUninv);
  const erIRRatio = calcERIR(erInv, irInv);
  const erBWR  = bwOk ? calcBWRatio(erInv,  d.bw) : null;
  const irBWR  = bwOk ? calcBWRatio(irInv,  d.bw) : null;
  const scBWR  = bwOk ? calcBWRatio(scapInv,d.bw) : null;

  const strLsiColor = v => { const n=parseFloat(v); if(isNaN(n)) return MUTED; if(n>=strLsiThreshold) return LIME; if(n>=strLsiThreshold-10) return GOLD; return RED_BAD; };
  const strLsiLabel = v => { if(!hasVal(v)) return ""; const n=parseFloat(v); if(n>=strLsiThreshold) return `✓ Meets ≥${strLsiThreshold}% threshold`; if(n>=strLsiThreshold-10) return `Approaching (≥${strLsiThreshold}%)`; return `Below threshold (<${strLsiThreshold}%)`; };
  const bwBenchColor = (val,lo,hi) => { if(!hasVal(val)) return MUTED; const n=parseFloat(val); if(n>=lo&&(hi==null||n<=hi)) return LIME; if(n>=(lo-5)) return GOLD; return RED_BAD; };

  // ASH
  const ash = d.ash || {};
  const ashLSI    = calcLSI(ash.peakInv, ash.peakUninv);
  const ashTPFLSI = calcLSI(ash.tpfInv, ash.tpfUninv);
  const ashThreshold = isDominant ? 110 : 90;

  // CKCUEST
  const ckcVals = [d.ckcuestReps,d.ckcuestReps2,d.ckcuestReps3].map(v=>parseFloat(v)).filter(v=>!isNaN(v));
  const ckcAvg  = ckcVals.length ? (ckcVals.reduce((a,b)=>a+b,0)/ckcVals.length).toFixed(1) : null;
  const ckcClass = ckcAvg ? (parseFloat(ckcAvg)>21?{label:"Meets Benchmark (>21)",color:LIME}:parseFloat(ckcAvg)>=17?{label:"Borderline",color:GOLD}:{label:"Below Benchmark",color:RED_BAD}) : null;

  // UE Y-Balance
  const ue = d.ueYbal || {};
  const calcComp = (m,il,sl,ll) => (hasVal(m)&&hasVal(il)&&hasVal(sl)&&hasVal(ll)&&toNum(ll)>0)?(((toNum(m)+toNum(il)+toNum(sl))/(3*toNum(ll)))*100).toFixed(1):null;
  const ueInvComp   = calcComp(ue.invMedial,ue.invInfLat,ue.invSupLat,ue.invLimbLength);
  const ueUninvComp = calcComp(ue.uninvMedial,ue.uninvInfLat,ue.uninvSupLat,ue.uninvLimbLength);

  // Plyo
  const plyo = d.plyo || {};
  const plyoLSI     = calcLSI(plyo.invPeakForce, plyo.uninvPeakForce);
  const plyoTPFLSI  = calcLSI(plyo.invTPF,       plyo.uninvTPF);

  // Shotput
  const spInvAvg   = avgTrials(d.shotputInv1,  d.shotputInv2,  d.shotputInv3);
  const spUninvAvg = avgTrials(d.shotputUninv1, d.shotputUninv2, d.shotputUninv3);
  const spLSI  = calcLSI(spInvAvg, spUninvAvg);
  const spTgt  = isDominant ? 110 : 90;

  // PSE
  const pse = d.pse || {};
  const pseLSI = calcLSI(pse.timeInv, pse.timeUninv);
  const pseLoadKg = bwOk ? (bwNum * 0.453592 * 0.02).toFixed(2) : null;

  const generateNote = () => sd("noteText", buildElbowNote(d));
  const copyNote = () => { navigator.clipboard.writeText(d.noteText).then(()=>{ setNoteCopied(true); setTimeout(()=>setNoteCopied(false),2500); }); };

  return (
    <div>

      <div style={{ display:"flex", alignItems:"flex-start", gap:0 }}>
        {/* Sidebar */}
        <div className="trm-e-sidenav">
          <div style={{ background:"#141414", border:`1px solid ${BORDER}`, borderRadius:12, overflow:"hidden", padding:"6px 0" }}>
            {SECTION_GROUPS.map((g,i) => {
              const active=activeSection===g.id; const filled=sectionHasData(g,d);
              return <button key={g.id} onClick={()=>{ scrollTo([g.id]); setActiveSection(g.id); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 14px", background:active?LIME+"14":"transparent", border:"none", borderLeft:`3px solid ${active?LIME:"transparent"}`, cursor:"pointer", textAlign:"left", borderBottom:i<SECTION_GROUPS.length-1?`1px solid ${BORDER}`:"none" }}><span style={{ flex:1, fontSize:11, fontWeight:active?800:600, color:active?LIME:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>{g.label}</span>{filled&&<div style={{ width:6, height:6, borderRadius:"50%", background:active?LIME:LIME_DIM, flexShrink:0 }} />}</button>;
            })}
          </div>
        </div>

        <div className="trm-e-content" style={{ flex:1, minWidth:0 }}>
          {/* ═══ PATIENT ═══ */}
          <SectionAnchor id="sec-patient" label="Patient" />
          <Card title="Patient Information" accent id="patient" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <R3>
              <Field label="Date of Testing" type="text" value={d.patient.date} onChange={v=>setP("date",v)} placeholder="MM/DD/YYYY" step={null} />
              <Field label="Weeks Post-Op" unit="wks" value={d.patient.weeksPostOp} onChange={v=>setP("weeksPostOp",v)} step="1" />
              <Field label="Surgery Type" type="text" value={d.patient.surgeryType} onChange={v=>setP("surgeryType",v)} placeholder="e.g. UCL Reconstruction" step={null} />
            </R3>
            <R2>
              <Field label="Surgeon" type="text" value={d.patient.surgeon} onChange={v=>setP("surgeon",v)} placeholder="Surgeon last name" step={null} />
              <div>
                <label style={lbl}>Biological Sex</label>
                <div style={{ display:"flex", gap:8 }}>
                  {["Male","Female"].map(s=><button key={s} onClick={()=>setP("sex",s)} style={{ flex:1, padding:"8px 0", borderRadius:8, fontSize:12, fontWeight:800, cursor:"pointer", background:d.patient.sex===s?LIME:"transparent", border:`2px solid ${d.patient.sex===s?LIME:BORDER}`, color:d.patient.sex===s?BLACK:MUTED }}>{s}</button>)}
                </div>
              </div>
            </R2>
            <div style={{ marginTop:16, padding:"14px 16px", borderRadius:10, border:`1px solid ${LIME}33`, background:LIME+"08" }}>
              <div style={{ fontSize:10, fontWeight:800, color:LIME, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:12 }}>Testing Profile</div>
              <R2 mb={0}>
                <div>
                  <label style={lbl}>Athlete Category</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {[{v:"non-contact",label:"Non-Contact"},{v:"contact",label:"Contact"}].map(opt=><button key={opt.v} onClick={()=>setP("athleteCategory",d.patient.athleteCategory===opt.v?"":opt.v)} style={{ flex:1, padding:"9px 0", borderRadius:8, fontSize:12, fontWeight:800, cursor:"pointer", background:d.patient.athleteCategory===opt.v?LIME:"transparent", border:`2px solid ${d.patient.athleteCategory===opt.v?LIME:BORDER}`, color:d.patient.athleteCategory===opt.v?BLACK:MUTED }}>{opt.label}</button>)}
                  </div>
                </div>
                <div>
                  <label style={lbl}>Involved Arm Dominance</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {[{v:"dominant",label:"Dominant"},{v:"non-dominant",label:"Non-Dom"}].map(opt=><button key={opt.v} onClick={()=>setP("armDominance",d.patient.armDominance===opt.v?"":opt.v)} style={{ flex:1, padding:"9px 0", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", background:d.patient.armDominance===opt.v?GOLD:"transparent", border:`2px solid ${d.patient.armDominance===opt.v?GOLD:BORDER}`, color:d.patient.armDominance===opt.v?BLACK:MUTED }}>{opt.label}</button>)}
                  </div>
                </div>
              </R2>
              {d.patient.athleteCategory && d.patient.armDominance && (
                <div style={{ marginTop:12, padding:"8px 12px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${LIME}33` }}>
                  <div style={{ fontSize:10, color:MUTED, marginBottom:2 }}>Active Profile</div>
                  <div style={{ fontSize:14, fontWeight:800, color:LIME }}>
                    {isDominant?"Dominant":"Non-Dominant"} · {isContact?"Contact":"Non-Contact"}
                    <span style={{ fontSize:11, fontWeight:600, color:MUTED, marginLeft:12 }}>Strength target: ≥{strLsiThreshold}% LSI{isThrower?" (BW ratios primary)":""}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="Body Metrics" id="bodymetrics" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <R2>
              <Field label="Body Weight" unit="lbs" value={d.bw} onChange={v=>sd("bw",v)} fieldKey="bw" />
              <Field label="HHD Lever Arm" unit="cm" value={d.leverArm} onChange={v=>sd("leverArm",v)} placeholder="distal forearm to pad" fieldKey="leverArm" />
            </R2>
            <div style={{ fontSize:11, color:MUTED }}>Lever arm used for grip and shoulder HHD torque normalization. Measure from distal cuff to HHD pad contact point.</div>
          </Card>

          {/* ═══ SUBJECTIVE ═══ */}
          <SectionAnchor id="sec-subjective" label="Subjective" />
          <Card title="Subjective Criteria" id="subjective" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize:11, color:MUTED, marginBottom:14 }}>All four criteria must be confirmed to pass subjective screening.</div>
            {[["painFree","Pain-free with activity and at rest"],["noSwelling","No swelling or joint effusion"],["noInstability","No complaints of instability"],["physicianClear","Physician clearance obtained"]].map(([key,label])=>(
              <div key={key} onClick={()=>setSubj(key)} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:9, cursor:"pointer", marginBottom:8, background:d.subj[key]?LIME+"08":"transparent", border:`1.5px solid ${d.subj[key]?LIME+"55":BORDER}`, transition:"all 0.15s" }}>
                <div style={{ width:20, height:20, borderRadius:5, flexShrink:0, border:`2px solid ${d.subj[key]?LIME:"#3a3a3a"}`, background:d.subj[key]?LIME:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {d.subj[key]&&<span style={{ fontSize:11, color:BLACK, fontWeight:900 }}>✓</span>}
                </div>
                <span style={{ fontSize:13, fontWeight:600, color:"#ccc" }}>{label}</span>
                {d.subj[key]&&<span style={{ marginLeft:"auto", fontSize:9, fontWeight:800, color:LIME, letterSpacing:"0.12em", textTransform:"uppercase", background:LIME+"14", padding:"2px 8px", borderRadius:99, border:`1px solid ${LIME}33` }}>PASS</span>}
              </div>
            ))}
            {Object.values(d.subj).every(Boolean)&&<div style={{ marginTop:8, padding:"10px 14px", borderRadius:8, background:LIME+"0a", border:`1px solid ${LIME}33`, display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:13, fontWeight:800, color:LIME }}>✓ All subjective criteria confirmed</span></div>}
          </Card>

          {/* ═══ ELBOW ROM ═══ */}
          <SectionAnchor id="sec-rom" label="Range of Motion" />
          <Card title="Elbow Range of Motion" id="rom" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr 1fr", gap:8, marginBottom:6, paddingBottom:8, borderBottom:`1px solid ${BORDER}` }}>
              <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em" }}>Measurement (°)</div>
              <div style={{ fontSize:10, fontWeight:800, color:"#6b9fff", textTransform:"uppercase", letterSpacing:"0.1em", textAlign:"center" }}>Right</div>
              <div style={{ fontSize:10, fontWeight:800, color:"#6b9fff", textTransform:"uppercase", letterSpacing:"0.1em", textAlign:"center" }}>Left</div>
            </div>
            {[{label:"Elbow Flexion",rKey:"elbowFlexR",lKey:"elbowFlexL"},{label:"Elbow Extension",rKey:"elbowExtR",lKey:"elbowExtL"},{label:"Pronation",rKey:"pronationR",lKey:"pronationL"},{label:"Supination",rKey:"supinationR",lKey:"supinationL"}].map(({label,rKey,lKey})=>(
              <div key={rKey} style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr 1fr", gap:8, marginBottom:4, alignItems:"center" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#aaa" }}>{label}</div>
                <input style={{...inp,fontSize:12,padding:"6px 8px",textAlign:"center"}} type="number" placeholder="—" value={d[rKey]||""} onChange={e=>sd(rKey,e.target.value)} />
                <input style={{...inp,fontSize:12,padding:"6px 8px",textAlign:"center"}} type="number" placeholder="—" value={d[lKey]||""} onChange={e=>sd(lKey,e.target.value)} />
              </div>
            ))}
            {[["elbowFlexR","elbowFlexL","Flexion deficit"],["pronationR","pronationL","Pronation deficit"],["supinationR","supinationL","Supination deficit"]].some(([r,l])=>hasVal(d[r])&&hasVal(d[l]))&&(
              <StatBar stats={[
                ...(hasVal(d.elbowFlexR)&&hasVal(d.elbowFlexL)?[{label:"Flex Deficit",value:Math.abs(toNum(invR?d.elbowFlexR:d.elbowFlexL)-toNum(invR?d.elbowFlexL:d.elbowFlexR)).toFixed(0)+"°",color:Math.abs(toNum(invR?d.elbowFlexR:d.elbowFlexL)-toNum(invR?d.elbowFlexL:d.elbowFlexR))<=10?LIME:Math.abs(toNum(invR?d.elbowFlexR:d.elbowFlexL)-toNum(invR?d.elbowFlexL:d.elbowFlexR))<=20?GOLD:RED_BAD}]:[]),
                ...(hasVal(d.pronationR)&&hasVal(d.pronationL)?[{label:"Pron Deficit",value:Math.abs(toNum(invR?d.pronationR:d.pronationL)-toNum(invR?d.pronationL:d.pronationR)).toFixed(0)+"°",color:Math.abs(toNum(invR?d.pronationR:d.pronationL)-toNum(invR?d.pronationL:d.pronationR))<=10?LIME:GOLD}]:[]),
                ...(hasVal(d.supinationR)&&hasVal(d.supinationL)?[{label:"Sup Deficit",value:Math.abs(toNum(invR?d.supinationR:d.supinationL)-toNum(invR?d.supinationL:d.supinationR)).toFixed(0)+"°",color:Math.abs(toNum(invR?d.supinationR:d.supinationL)-toNum(invR?d.supinationL:d.supinationR))<=10?LIME:GOLD}]:[]),
              ]} />
            )}
            <div style={{ marginTop:14 }}>
              <button onClick={()=>sd("romWNL",!d.romWNL)} style={{ padding:"10px 24px", borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", background:d.romWNL?LIME:"transparent", border:`2px solid ${d.romWNL?LIME:BORDER}`, color:d.romWNL?BLACK:MUTED, transition:"all 0.15s" }}>
                {d.romWNL?"✓ ROM WNL — Confirmed":"ROM WNL — Click to Confirm"}
              </button>
            </div>
          </Card>

          {/* ═══ STRENGTH ═══ */}
          <SectionAnchor id="sec-strength" label="Strength Testing" />

          {/* Grip */}
          <Card title="Grip Strength — Dynamometer" id="grip" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize:11, color:MUTED, marginBottom:14, lineHeight:1.6 }}>
              Dynamo hand grip series. Normalized torque = Force × Lever Arm / BW(kg). Target: {d.patient.sex==="Female"?"0.45–0.55":"0.55–0.65"} Nm/kg.
            </div>
            <R2 mb={12} persist>
              <Field label={`Grip — ${inv} (Involved)`} unit="lbs" value={invR?d.gripR:d.gripL} onChange={v=>sd(invR?"gripR":"gripL",v)} fieldKey={invR?"gripR":"gripL"} />
              <Field label={`Grip — ${uninv} (Uninvolved)`} unit="lbs" value={invR?d.gripL:d.gripR} onChange={v=>sd(invR?"gripL":"gripR",v)} fieldKey={invR?"gripL":"gripR"} />
            </R2>
            {(gripInvNorm||gripUninvNorm)&&(
              <div style={{ background:"#111", borderRadius:10, border:`1px solid ${BORDER}`, padding:"14px 16px", marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Normalized Values vs Norms ({d.patient.sex==="Female"?"0.45–0.55":"0.55–0.65"} Nm/kg)</div>
                {gripInvNorm&&(
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                    <span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", minWidth:100 }}>{inv} Involved</span>
                    <span style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:gripInvPass?LIME:gripInvNorm&&parseFloat(gripInvNorm)>=(gripMin-0.05)?GOLD:RED_BAD }}>{gripInvNorm} Nm/kg</span>
                    <span style={{ fontSize:11, fontWeight:700, color:gripInvPass?LIME:RED_BAD }}>{gripInvPass?"✓ Within normal range":"Outside target range"}</span>
                  </div>
                )}
                {gripUninvNorm&&(
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", minWidth:100 }}>{uninv} Uninvolved</span>
                    <span style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:gripUninvPass?LIME:gripUninvNorm&&parseFloat(gripUninvNorm)>=(gripMin-0.05)?GOLD:RED_BAD }}>{gripUninvNorm} Nm/kg</span>
                    <span style={{ fontSize:11, fontWeight:700, color:gripUninvPass?LIME:RED_BAD }}>{gripUninvPass?"✓ Within normal range":"Outside target range"}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Shoulder Dynamo */}
          <Card title="Shoulder Dynamo Strength" id="shoulder" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize:11, color:MUTED, marginBottom:14, lineHeight:1.6 }}>
              Dynamo LSI — regions: Scaption, ER, IR. Assess peak force (lbs) and time to peak force (ms) bilaterally.
              {isThrower
                ? <span style={{ color:GOLD, fontWeight:700 }}> Dominant non-contact: BW ratios are primary metric.</span>
                : <span style={{ color:LIME, fontWeight:700 }}> Strength LSI target: ≥{strLsiThreshold}%.</span>}
            </div>

            {/* Scaption */}
            {[
              { label:"Shoulder Scaption", fInvKey:invR?"scaptionForceR":"scaptionForceL", fUninvKey:invR?"scaptionForceL":"scaptionForceR", tInvKey:invR?"scaptionTPFR":"scaptionTPFL", tUninvKey:invR?"scaptionTPFL":"scaptionTPFR", lsi:scapLSI, bwr:scBWR, bwRange:"15–20%", bwLo:15, bwHi:20 },
              { label:"External Rotation",  fInvKey:invR?"erForceR":"erForceL",         fUninvKey:invR?"erForceL":"erForceR",       tInvKey:invR?"erTPFR":"erTPFL",             tUninvKey:invR?"erTPFL":"erTPFR",           lsi:erLSI,   bwr:erBWR,   bwRange:"12–15%", bwLo:12, bwHi:15 },
              { label:"Internal Rotation",  fInvKey:invR?"irForceR":"irForceL",         fUninvKey:invR?"irForceL":"irForceR",       tInvKey:invR?"irTPFR":"irTPFL",             tUninvKey:invR?"irTPFL":"irTPFR",           lsi:irLSI,   bwr:irBWR,   bwRange:"≥25%",  bwLo:25, bwHi:null },
            ].map(({ label, fInvKey, fUninvKey, tInvKey, tUninvKey, lsi, bwr, bwRange, bwLo, bwHi }) => (
              <div key={label} style={{ marginBottom:20, background:"#111", borderRadius:10, border:`1px solid ${BORDER}`, padding:"14px 16px" }}>
                <div style={{ fontSize:13, fontWeight:800, color:WHITE, marginBottom:12 }}>{label}</div>
                <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Peak Force</div>
                <R2 mb={10} persist>
                  <Field label={`${inv} (Involved)`}   unit="lbs" value={d[fInvKey]  ||""} onChange={v=>sd(fInvKey,v)}   fieldKey={fInvKey}   />
                  <Field label={`${uninv} (Uninvolved)`} unit="lbs" value={d[fUninvKey]||""} onChange={v=>sd(fUninvKey,v)} fieldKey={fUninvKey} />
                </R2>
                <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Time to Peak Force</div>
                <R2 mb={10} persist>
                  <Field label={`${inv} TPF`}   unit="ms" value={d[tInvKey]  ||""} onChange={v=>sd(tInvKey,v)}   />
                  <Field label={`${uninv} TPF`} unit="ms" value={d[tUninvKey]||""} onChange={v=>sd(tUninvKey,v)} />
                </R2>
                {isThrower && bwr && bwOk && (
                  <div style={{ padding:"10px 12px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${bwBenchColor(bwr,bwLo,bwHi)}44`, display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                    <span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>BW Ratio (target {bwRange})</span>
                    <span style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:bwBenchColor(bwr,bwLo,bwHi) }}>{bwr}%</span>
                    <span style={{ fontSize:11, fontWeight:700, color:bwBenchColor(bwr,bwLo,bwHi) }}>
                      {parseFloat(bwr)>=(bwLo)&&(bwHi==null||parseFloat(bwr)<=bwHi)?"✓ In range":`Target ${bwRange}`}
                    </span>
                  </div>
                )}
                {!isThrower && lsi && (
                  <div style={{ padding:"10px 12px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${strLsiColor(lsi)}44`, display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Strength LSI</span>
                    <span style={{ fontSize:24, fontWeight:900, fontFamily:"monospace", color:strLsiColor(lsi) }}>{lsi}%</span>
                    <span style={{ fontSize:12, fontWeight:800, color:strLsiColor(lsi) }}>{strLsiLabel(lsi)}</span>
                  </div>
                )}
              </div>
            ))}

            {/* ER:IR + StatBar */}
            <StatBar stats={[
              {label:"ER:IR Ratio",value:erIRRatio?erIRRatio+"%":null,color:erIRRatio?(parseFloat(erIRRatio)>=65&&parseFloat(erIRRatio)<=70?LIME:parseFloat(erIRRatio)>=60?GOLD:RED_BAD):MUTED},
              ...(isThrower?[
                {label:"ER:BW",value:erBWR?erBWR+"%":null,color:bwBenchColor(erBWR,12,15)},
                {label:"IR:BW",value:irBWR?irBWR+"%":null,color:bwBenchColor(irBWR,25,null)},
                {label:"Scap:BW",value:scBWR?scBWR+"%":null,color:bwBenchColor(scBWR,15,20)},
              ]:[
                {label:`Scap LSI`,value:scapLSI?scapLSI+"%":null,color:strLsiColor(scapLSI)},
                {label:`ER LSI`,value:erLSI?erLSI+"%":null,color:strLsiColor(erLSI)},
                {label:`IR LSI`,value:irLSI?irLSI+"%":null,color:strLsiColor(irLSI)},
              ]),
            ]} />

            {isThrower && (
              <div style={{ marginTop:12, padding:"10px 14px", borderRadius:8, background:GOLD+"0a", border:`1px solid ${GOLD}33`, fontSize:11, color:MUTED, lineHeight:1.7 }}>
                <span style={{ color:GOLD, fontWeight:800 }}>Thrower BW Ratio Norms: </span>
                ER:IR = 65–70% · ER:BW = 12–15% · IR:BW ≥ 25% · Scaption:BW = 15–20%
              </div>
            )}
          </Card>

          {/* ASH Test */}
          <Card title="VALD Force Plate — ASH Test" id="ash" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize:11, color:MUTED, marginBottom:16, lineHeight:1.6 }}>
              Active Shoulder Harness test on force plate. Peak force LSI: {isDominant?"dominant ≥110%":"≥90%"}. Time to peak force: &lt;10% asymmetry (≥90% LSI).
              {isDominant?<span style={{ color:GOLD, fontWeight:700 }}> Dominant arm — target peak force LSI ≥110%.</span>:<span style={{ color:LIME, fontWeight:700 }}> Non-dominant arm — target peak force LSI ≥90%.</span>}
            </div>
            <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Peak Force</div>
            <R2 mb={10} persist>
              <Field label={`${inv} Peak Force`}   unit="N" value={ash.peakInv||""}   onChange={v=>setAsh("peakInv",v)}   />
              <Field label={`${uninv} Peak Force`} unit="N" value={ash.peakUninv||""} onChange={v=>setAsh("peakUninv",v)} />
            </R2>
            {ashLSI&&(
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, padding:"8px 12px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${strLsiColor(ashLSI)}44` }}>
                <span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Peak Force LSI</span>
                <span style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:strLsiColor(ashLSI) }}>{ashLSI}%</span>
                <span style={{ fontSize:11, fontWeight:700, color:strLsiColor(ashLSI) }}>{strLsiLabel(ashLSI)}</span>
                <span style={{ fontSize:10, color:MUTED, marginLeft:"auto" }}>Target: ≥{ashThreshold}%</span>
              </div>
            )}
            <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Time to Peak Force</div>
            <R2 mb={10} persist>
              <Field label={`${inv} TPF`}   unit="ms" value={ash.tpfInv||""}   onChange={v=>setAsh("tpfInv",v)}   />
              <Field label={`${uninv} TPF`} unit="ms" value={ash.tpfUninv||""} onChange={v=>setAsh("tpfUninv",v)} />
            </R2>
            {ashTPFLSI&&(
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"8px 12px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${lsiColor(ashTPFLSI)}44` }}>
                <span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Time Symmetry</span>
                <span style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:lsiColor(ashTPFLSI) }}>{ashTPFLSI}%</span>
                <span style={{ fontSize:11, fontWeight:700, color:lsiColor(ashTPFLSI) }}>{parseFloat(ashTPFLSI)>=90?"✓ ≥90% — <10% asymmetry":parseFloat(ashTPFLSI)>=80?"Approaching target":"⚠ >10% asymmetry"}</span>
              </div>
            )}
            <div><label style={lbl}>Clinical Notes</label><input style={inp} type="text" placeholder="e.g. apprehension at end range" value={ash.notes||""} onChange={e=>setAsh("notes",e.target.value)} /></div>
          </Card>

          {/* ═══ FUNCTIONAL ═══ */}
          <SectionAnchor id="sec-functional" label="Functional Testing" />

          {/* CKCUEST */}
          <Card title="CKC Upper Extremity Stability Test" id="ckcuest" required={sessionStarted} focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ fontSize:11, color:MUTED, marginBottom:14, lineHeight:1.6 }}>Patient in push-up position, alternating touches for 15 sec. Benchmark: &gt;21 reps.</div>
            <R3 mb={8}>
              <div><label style={lbl}>Reps / 15 sec (Test 1)</label><input style={inp} type="number" step="1" placeholder="—" value={d.ckcuestReps||""} onChange={e=>sd("ckcuestReps",e.target.value)} /></div>
              <div><label style={lbl}>Reps / 15 sec (Test 2)</label><input style={inp} type="number" step="1" placeholder="—" value={d.ckcuestReps2||""} onChange={e=>sd("ckcuestReps2",e.target.value)} /></div>
              <div><label style={lbl}>Reps / 15 sec (Test 3)</label><input style={inp} type="number" step="1" placeholder="—" value={d.ckcuestReps3||""} onChange={e=>sd("ckcuestReps3",e.target.value)} /></div>
            </R3>
            {ckcAvg&&(
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${ckcClass.color}44`, marginTop:6 }}>
                <span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Average</span>
                <span style={{ fontSize:24, fontWeight:900, fontFamily:"monospace", color:ckcClass.color }}>{ckcAvg} reps</span>
                <span style={{ fontSize:12, fontWeight:800, color:ckcClass.color }}>{ckcClass.label}</span>
              </div>
            )}
          </Card>

          {/* Injury-Specific */}
          {d.patient.athleteCategory && d.patient.armDominance && (
            <Card title="Injury-Specific Tests" id="injurySpecific" focusable activeCard={activeCard} setActiveCard={setActiveCard}
              accent={false} required={false}>
              <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:8, background:`${isDominant&&isContact?LIME:isDominant&&isNonContact?GOLD:BLUE}12`, border:`1px solid ${isDominant&&isContact?LIME:isDominant&&isNonContact?GOLD:BLUE}33` }}>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:isDominant&&isContact?LIME:isDominant&&isNonContact?GOLD:BLUE, marginBottom:2 }}>
                  {isDominant?"Dominant":"Non-Dominant"} · {isContact?"Contact":"Non-Contact"} Athlete
                </div>
                <div style={{ fontSize:11, color:MUTED }}>
                  {isContact&&"UE Y-Balance (≥90%) + Plyo Push-up"}
                  {isNonContact&&isDominant&&"Seated Shotput (>110% avg) + Posterior Shoulder Endurance + 90/90 + FDS Ext"}
                  {isNonContact&&!isDominant&&"Seated Shotput (>90%)"}
                </div>
              </div>

              {/* CONTACT: Y-Balance + Plyo Push-up */}
              {isContact && (<>
                <div style={{ marginBottom:20, background:"#111", borderRadius:10, border:`1px solid ${BLUE}33`, padding:"14px 16px" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:WHITE, marginBottom:4 }}>UE Y-Balance Test</div>
                  <div style={{ fontSize:11, color:MUTED, marginBottom:12 }}>Composite = (Medial+InfLat+SupLat)÷(3×Limb Length)×100. Target ≥90%.</div>
                  <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Limb Length</div>
                  <R2 mb={12} persist>
                    <Field label={`${inv} Limb Length`}   unit="cm" value={ue.invLimbLength||""}   onChange={v=>setUeYbal("invLimbLength",v)}   />
                    <Field label={`${uninv} Limb Length`} unit="cm" value={ue.uninvLimbLength||""} onChange={v=>setUeYbal("uninvLimbLength",v)} />
                  </R2>
                  <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Reach Distances</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                    <Field label={`Medial — ${inv}`}  unit="cm" value={ue.invMedial||""}  onChange={v=>setUeYbal("invMedial",v)}  />
                    <Field label={`InfLat — ${inv}`}  unit="cm" value={ue.invInfLat||""}  onChange={v=>setUeYbal("invInfLat",v)}  />
                    <Field label={`SupLat — ${inv}`}  unit="cm" value={ue.invSupLat||""}  onChange={v=>setUeYbal("invSupLat",v)}  />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                    <Field label={`Medial — ${uninv}`} unit="cm" value={ue.uninvMedial||""} onChange={v=>setUeYbal("uninvMedial",v)} />
                    <Field label={`InfLat — ${uninv}`} unit="cm" value={ue.uninvInfLat||""} onChange={v=>setUeYbal("uninvInfLat",v)} />
                    <Field label={`SupLat — ${uninv}`} unit="cm" value={ue.uninvSupLat||""} onChange={v=>setUeYbal("uninvSupLat",v)} />
                  </div>
                  {(ueInvComp||ueUninvComp)&&(
                    <div style={{ display:"flex", gap:24, flexWrap:"wrap", padding:"12px 14px", background:"#0a0a0a", borderRadius:8, border:`1px solid ${BORDER}` }}>
                      {ueInvComp&&<div style={{ textAlign:"center" }}><div style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{inv} Composite</div><div style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:parseFloat(ueInvComp)>=90?LIME:parseFloat(ueInvComp)>=80?GOLD:RED_BAD }}>{ueInvComp}%</div><div style={{ fontSize:10, fontWeight:700, color:parseFloat(ueInvComp)>=90?LIME:parseFloat(ueInvComp)>=80?GOLD:RED_BAD }}>{parseFloat(ueInvComp)>=90?"✓ Meets ≥90%":parseFloat(ueInvComp)>=80?"Approaching":"Below threshold"}</div></div>}
                      {ueUninvComp&&<div style={{ textAlign:"center" }}><div style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{uninv} Composite</div><div style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:parseFloat(ueUninvComp)>=90?LIME:GOLD }}>{ueUninvComp}%</div></div>}
                    </div>
                  )}
                </div>

                <div style={{ background:"#111", borderRadius:10, border:`1px solid ${BLUE}33`, padding:"14px 16px" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:WHITE, marginBottom:4 }}>VALD Force Plate — Plyo Push-Up</div>
                  <div style={{ fontSize:11, color:MUTED, marginBottom:12 }}>Bilateral plyometric push-up. LSI target: {isDominant?"dominant ≥110%":"≥90%"}. TPF: &lt;10% asymmetry.</div>
                  <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Peak Force</div>
                  <R2 mb={10} persist>
                    <Field label={`${inv} Peak Force`}   unit="N" value={plyo.invPeakForce||""}   onChange={v=>setPlyo("invPeakForce",v)}   />
                    <Field label={`${uninv} Peak Force`} unit="N" value={plyo.uninvPeakForce||""} onChange={v=>setPlyo("uninvPeakForce",v)} />
                  </R2>
                  {plyoLSI&&<div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, padding:"8px 12px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${strLsiColor(plyoLSI)}44` }}><span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Peak Force LSI</span><span style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:strLsiColor(plyoLSI) }}>{plyoLSI}%</span><span style={{ fontSize:11, fontWeight:700, color:strLsiColor(plyoLSI) }}>{strLsiLabel(plyoLSI)}</span></div>}
                  <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Time to Peak Force</div>
                  <R2 mb={10} persist>
                    <Field label={`${inv} TPF`}   unit="ms" value={plyo.invTPF||""}   onChange={v=>setPlyo("invTPF",v)}   />
                    <Field label={`${uninv} TPF`} unit="ms" value={plyo.uninvTPF||""} onChange={v=>setPlyo("uninvTPF",v)} />
                  </R2>
                  {plyoTPFLSI&&<div style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 12px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${lsiColor(plyoTPFLSI)}44` }}><span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>TPF Symmetry</span><span style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:lsiColor(plyoTPFLSI) }}>{plyoTPFLSI}%</span><span style={{ fontSize:11, fontWeight:700, color:lsiColor(plyoTPFLSI) }}>{parseFloat(plyoTPFLSI)>=90?"✓ <10% asymmetry":"⚠ >10% asymmetry"}</span></div>}
                  <div style={{ marginTop:10 }}><label style={lbl}>Notes</label><input style={inp} type="text" placeholder="e.g. visible asymmetry noted" value={plyo.notes||""} onChange={e=>setPlyo("notes",e.target.value)} /></div>
                </div>
              </>)}

              {/* DOM + NON-CONTACT: Shotput + PSE + 90/90 + FDS */}
              {isNonContact && (<>
                <div style={{ marginBottom:20, background:"#111", borderRadius:10, border:`1px solid ${GOLD}33`, padding:"14px 16px" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:WHITE, marginBottom:4 }}>Seated Shotput Test</div>
                  <div style={{ fontSize:11, color:MUTED, marginBottom:12 }}>Average distance thrown bilaterally. Target: {isDominant?">110% LSI":">90% LSI"}.</div>
                  <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{inv} (Involved) — Trials</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                    <Field label="Trial 1" unit="in" value={d.shotputInv1||""} onChange={v=>sd("shotputInv1",v)} step="0.5" />
                    <Field label="Trial 2" unit="in" value={d.shotputInv2||""} onChange={v=>sd("shotputInv2",v)} step="0.5" />
                    <Field label="Trial 3" unit="in" value={d.shotputInv3||""} onChange={v=>sd("shotputInv3",v)} step="0.5" />
                    <div><label style={lbl}>Avg</label><div style={{...calcBox,padding:"9px 12px"}}>{spInvAvg?spInvAvg+'"':"—"}</div></div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{uninv} (Uninvolved) — Trials</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:12 }}>
                    <Field label="Trial 1" unit="in" value={d.shotputUninv1||""} onChange={v=>sd("shotputUninv1",v)} step="0.5" />
                    <Field label="Trial 2" unit="in" value={d.shotputUninv2||""} onChange={v=>sd("shotputUninv2",v)} step="0.5" />
                    <Field label="Trial 3" unit="in" value={d.shotputUninv3||""} onChange={v=>sd("shotputUninv3",v)} step="0.5" />
                    <div><label style={lbl}>Avg</label><div style={{...calcBox,padding:"9px 12px"}}>{spUninvAvg?spUninvAvg+'"':"—"}</div></div>
                  </div>
                  {spLSI&&<div style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 12px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${parseFloat(spLSI)>spTgt?LIME:GOLD}44` }}><span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>LSI</span><span style={{ fontSize:22, fontWeight:900, fontFamily:"monospace", color:parseFloat(spLSI)>spTgt?LIME:parseFloat(spLSI)>=spTgt-10?GOLD:RED_BAD }}>{spLSI}%</span><span style={{ fontSize:11, fontWeight:700, color:parseFloat(spLSI)>spTgt?LIME:parseFloat(spLSI)>=spTgt-10?GOLD:RED_BAD }}>{parseFloat(spLSI)>spTgt?`✓ Meets >${spTgt}% target`:`Below target (>${spTgt}%)`}</span></div>}
                </div>

                {isDominant&&(
                  <div style={{ marginBottom:20, background:"#111", borderRadius:10, border:`1px solid ${GOLD}33`, padding:"14px 16px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:WHITE, marginBottom:4 }}>Posterior Shoulder Endurance Test</div>
                    {pseLoadKg&&<div style={{ marginBottom:10, padding:"8px 12px", borderRadius:6, background:GOLD+"0a", border:`1px solid ${GOLD}33`, fontSize:12, color:GOLD, fontWeight:700 }}>Load = 2% BW → {pseLoadKg} kg</div>}
                    <div style={{ fontSize:11, color:MUTED, marginBottom:12 }}>Time held in testing position. LSI target: &gt;90%.</div>
                    <R2 mb={10} persist>
                      <Field label={`${inv} Time Held`}   unit="sec" value={pse.timeInv||""}   onChange={v=>setPse("timeInv",v)}   step="1" />
                      <Field label={`${uninv} Time Held`} unit="sec" value={pse.timeUninv||""} onChange={v=>setPse("timeUninv",v)} step="1" />
                    </R2>
                    {pseLSI&&<div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:8, background:"#0a0a0a", border:`1px solid ${lsiColor(pseLSI)}44` }}><span style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Time LSI</span><span style={{ fontSize:24, fontWeight:900, fontFamily:"monospace", color:lsiColor(pseLSI) }}>{pseLSI}%</span><span style={{ fontSize:12, fontWeight:800, color:lsiColor(pseLSI) }}>{parseFloat(pseLSI)>=90?"✓ Meets ≥90% threshold":parseFloat(pseLSI)>=80?"Approaching threshold":"Below threshold"}</span></div>}
                    <div style={{ marginTop:10 }}><label style={lbl}>Notes</label><input style={inp} type="text" placeholder="e.g. pain, fatigue pattern" value={pse.notes||""} onChange={e=>setPse("notes",e.target.value)} /></div>
                  </div>
                )}

                {isDominant&&(
                  <div style={{ background:"#111", borderRadius:10, border:`1px solid ${GOLD}33`, padding:"14px 16px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:WHITE, marginBottom:12 }}>Additional Clinical Assessments</div>
                    {[["n9090Pass","90/90 Shoulder Assessment"],["fdsExtPass","FDS Extension Test"]].map(([key,label])=>(
                      <div key={key} onClick={()=>sd(key,!d[key])} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:8, cursor:"pointer", marginBottom:8, background:d[key]?LIME+"08":"transparent", border:`1.5px solid ${d[key]?LIME+"55":BORDER}`, transition:"all 0.15s" }}>
                        <div style={{ width:20, height:20, borderRadius:5, flexShrink:0, border:`2px solid ${d[key]?LIME:"#3a3a3a"}`, background:d[key]?LIME:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>{d[key]&&<span style={{ fontSize:11, color:BLACK, fontWeight:900 }}>✓</span>}</div>
                        <span style={{ fontSize:13, fontWeight:600, color:"#ccc" }}>{label}</span>
                        {d[key]&&<span style={{ marginLeft:"auto", fontSize:9, fontWeight:800, color:LIME, letterSpacing:"0.12em", textTransform:"uppercase", background:LIME+"14", padding:"2px 8px", borderRadius:99 }}>PASS</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>)}
            </Card>
          )}

          {/* ═══ NOTE ═══ */}
          <SectionAnchor id="sec-note" label="SOAP Note" />
          <Card title="Clinical Notes" id="clinicalnotes" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
            <div style={{ marginBottom:12 }}><label style={lbl}>Additional Clinical Notes</label><textarea style={{...inp,height:110,resize:"vertical",lineHeight:1.7,fontSize:13}} placeholder="e.g. patient reports intermittent numbness, noted valgus stress apprehension..." value={d.clinicalNotes||""} onChange={e=>sd("clinicalNotes",e.target.value)} /></div>
          </Card>

          <button onClick={generateNote} style={{ width:"100%", padding:16, borderRadius:12, fontSize:13, fontWeight:900, letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer", background:`linear-gradient(135deg,${LIME},${LIME_DIM})`, color:BLACK, border:"none", boxShadow:`0 8px 32px ${LIME}44`, marginBottom:20 }}>
            ⬇ Generate SOAP Note Objective
          </button>

          {d.noteText&&(
            <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${LIME}44`, marginBottom:40 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 20px", background:LIME+"14", borderBottom:`1px solid ${LIME}33` }}>
                <span style={{ fontSize:11, fontWeight:800, color:LIME, letterSpacing:"0.15em", textTransform:"uppercase" }}>SOAP Note — Objective Section</span>
                <button onClick={copyNote} style={{ padding:"8px 20px", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", background:noteCopied?"#15803d":LIME, color:BLACK, border:"none" }}>{noteCopied?"✓ Copied!":"Copy to Clipboard"}</button>
              </div>
              <pre style={{ padding:20, background:"#0a0a0a", color:"#d4faa6", fontSize:12, fontFamily:"monospace", lineHeight:1.8, whiteSpace:"pre-wrap", margin:0, maxHeight:500, overflowY:"auto" }}>{d.noteText}</pre>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE SECTION NAV (Testing tab) ── */}
      {isMobile && (() => {
        const idx  = SECTION_NAV.findIndex(s => s.key === activeSection);
        const cur  = SECTION_NAV[idx] ?? SECTION_NAV[0];
        const prev = SECTION_NAV[idx - 1];
        const next = SECTION_NAV[idx + 1];
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
                  border: `1px solid ${prev ? BORDER : "#181818"}`,
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
                  border: `1px solid ${next ? BORDER : "#181818"}`,
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

// ─── RTS TAB ──────────────────────────────────────────────────────────────────
function RTSTab({ data:d, setData:setD }) {
  const inv   = d.patient.involvedSide;
  const invR  = inv === "Right";
  const isDominant  = d.patient.armDominance === "dominant";
  const isContact   = d.patient.athleteCategory === "contact";
  const isNonContact= d.patient.athleteCategory === "non-contact";
  const strThr = isDominant && isContact ? 110 : 90;
  const spTgt  = isDominant ? 110 : 90;
  const ashThr = isDominant ? 110 : 90;

  const gripInv  = invR ? d.gripR : d.gripL;
  const gripInvNm= calcTorqueNm(gripInv, d.leverArm);
  const gripInvNorm = calcNorm(gripInvNm, d.bw);
  const gripMin  = d.patient.sex==="Female" ? 0.45 : 0.55;
  const gripMax  = d.patient.sex==="Female" ? 0.55 : 0.65;

  const scapInv = invR?d.scaptionForceR:d.scaptionForceL; const scapUninv=invR?d.scaptionForceL:d.scaptionForceR;
  const erInv   = invR?d.erForceR:d.erForceL;             const erUninv  =invR?d.erForceL:d.erForceR;
  const irInv   = invR?d.irForceR:d.irForceL;             const irUninv  =invR?d.irForceL:d.irForceR;
  const scapLSI=calcLSI(scapInv,scapUninv); const erLSI=calcLSI(erInv,erUninv); const irLSI=calcLSI(irInv,irUninv);
  const erBWR=calcBWRatio(erInv,d.bw); const irBWR=calcBWRatio(irInv,d.bw); const scBWR=calcBWRatio(scapInv,d.bw);
  const erIRRatio=calcERIR(erInv,irInv);

  const ash=d.ash||{}; const ashLSI=calcLSI(ash.peakInv,ash.peakUninv); const ashTPFLSI=calcLSI(ash.tpfInv,ash.tpfUninv);
  const ckcVals=[d.ckcuestReps,d.ckcuestReps2,d.ckcuestReps3].map(v=>parseFloat(v)).filter(v=>!isNaN(v));
  const ckcAvg=ckcVals.length?(ckcVals.reduce((a,b)=>a+b,0)/ckcVals.length):null;
  const ue=d.ueYbal||{};
  const calcComp=(m,il,sl,ll)=>(hasVal(m)&&hasVal(il)&&hasVal(sl)&&hasVal(ll)&&toNum(ll)>0)?(((toNum(m)+toNum(il)+toNum(sl))/(3*toNum(ll)))*100).toFixed(1):null;
  const ueInvComp=calcComp(ue.invMedial,ue.invInfLat,ue.invSupLat,ue.invLimbLength);
  const plyo=d.plyo||{}; const plyoLSI=calcLSI(plyo.invPeakForce,plyo.uninvPeakForce);
  const spInvAvg=avgTrials(d.shotputInv1,d.shotputInv2,d.shotputInv3);
  const spUninvAvg=avgTrials(d.shotputUninv1,d.shotputUninv2,d.shotputUninv3);
  const spLSI=calcLSI(spInvAvg,spUninvAvg);
  const pse=d.pse||{}; const pseLSI=calcLSI(pse.timeInv,pse.timeUninv);
  const isThrower=isDominant&&isNonContact;

  const mk = (label, value, target, unit="%", notes="") => {
    const hasData=hasVal(value); const numVal=parseFloat(value);
    const passes=hasData&&numVal>=target; const approaching=hasData&&!passes&&numVal>=target-10;
    const color=!hasData?MUTED:passes?LIME:approaching?GOLD:RED_BAD;
    const badge=!hasData?"No Data":passes?"PASS":approaching?"APPROACHING":"FAIL";
    return {label,value,target,passes,approaching,hasData,color,badge,unit,notes};
  };
  const mkManual = (label, passes, notes="") => ({label,value:null,passes,hasData:true,manual:true,color:passes?LIME:RED_BAD,badge:passes?"PASS":"NOT CONFIRMED",notes});
  const mkBW = (label, value, lo, hi, notes="") => {
    const hasData=hasVal(value); const n=parseFloat(value);
    const passes=hasData&&n>=lo&&(hi==null||n<=hi); const approaching=hasData&&!passes&&n>=(lo-5);
    const color=!hasData?MUTED:passes?LIME:approaching?GOLD:RED_BAD;
    const badge=!hasData?"No Data":passes?"PASS":approaching?"APPROACHING":"FAIL";
    return {label,value,passes,approaching,hasData,color,badge,unit:"%",notes};
  };

  const profile=!d.patient.athleteCategory||!d.patient.armDominance?null:`${isDominant?"Dominant":"Non-Dominant"} · ${isContact?"Contact":"Non-Contact"}`;

  const universalCriteria = [
    mkManual("Subjective Criteria (all 4)", Object.values(d.subj||{}).every(Boolean), "Pain-free, no swelling, no instability, physician clearance"),
    mkManual("Elbow ROM WNL", d.romWNL, "Clinician-confirmed ROM within normal limits"),
    ...(gripInvNorm?[mk("Grip Strength (Involved)", gripInvNorm, gripMin, " Nm/kg", `Target: ${d.patient.sex==="Female"?"0.45–0.55":"0.55–0.65"} Nm/kg`)]:[]),
    ...(isThrower?[
      mkBW("Scaption BW Ratio", scBWR, 15, 20, "Target: 15–20% BW"),
      mkBW("ER BW Ratio", erBWR, 12, 15, "Target: 12–15% BW"),
      mkBW("IR BW Ratio", irBWR, 25, null, "Target: ≥25% BW"),
      mkBW("ER:IR Ratio", erIRRatio, 65, 70, "Target: 65–70%"),
    ]:[
      mk("Scaption LSI", scapLSI, strThr, "%", `Involved vs uninvolved — ≥${strThr}%`),
      mk("ER Strength LSI", erLSI, strThr, "%", `Involved vs uninvolved — ≥${strThr}%`),
      mk("IR Strength LSI", irLSI, strThr, "%", `Involved vs uninvolved — ≥${strThr}%`),
    ]),
    mk("ASH Peak Force LSI", ashLSI, ashThr, "%", `Target: ≥${ashThr}%`),
    mk("ASH Time to Peak (<10% asym)", ashTPFLSI, 90, "%", "≥90% LSI = <10% asymmetry"),
    mk("CKCUEST (>21 reps)", ckcAvg?String(ckcAvg):null, 21, " reps", ">21 reps / 15 sec"),
  ];

  const contactCriteria = isContact ? [
    mk("UE Y-Balance Composite", ueInvComp, 90, "%", "Involved limb composite ≥90%"),
    mk("Plyo Push-Up LSI", plyoLSI, ashThr, "%", `Peak force ≥${ashThr}%`),
  ] : [];

  const nonContactCriteria = isNonContact ? [
    mk("Seated Shotput LSI", spLSI, spTgt, "%", `Average distance >${spTgt}%`),
    ...(isDominant?[
      mk("Post. Shoulder Endurance LSI", pseLSI, 90, "%", "Time held ≥90% LSI"),
      mkManual("90/90 Assessment", d.n9090Pass, "Clinician-assessed"),
      mkManual("FDS Extension Test", d.fdsExtPass, "Clinician-assessed"),
    ]:[]),
  ] : [];

  const allCriteria=[...universalCriteria,...contactCriteria,...nonContactCriteria];
  const testedCriteria=allCriteria.filter(c=>c.hasData||c.manual);
  const passingCriteria=allCriteria.filter(c=>c.passes);
  const allPass=testedCriteria.length>0&&testedCriteria.every(c=>c.passes);

  const CriterionRow=({c})=>(
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", background:"#111", borderRadius:10, border:`1px solid ${c.color}33`, marginBottom:8 }}>
      <div style={{ width:28, height:28, borderRadius:8, background:c.color+"18", border:`1.5px solid ${c.color}55`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontSize:14, lineHeight:1 }}>{c.passes?"✓":c.hasData?"✗":"—"}</span>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:800, color:WHITE }}>{c.label}</div>
        {c.notes&&<div style={{ fontSize:10, color:MUTED, marginTop:2 }}>{c.notes}</div>}
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        {c.hasData&&c.value!=null&&!c.manual&&<div style={{ fontSize:18, fontWeight:900, fontFamily:"monospace", color:c.color }}>{c.value}{c.unit}</div>}
        <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", color:c.color, marginTop:2 }}>{c.badge}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:700, margin:"0 auto" }}>
      <div style={{ background:CARD, borderRadius:12, border:`1px solid ${BORDER}`, marginBottom:20, overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", background:`linear-gradient(90deg,${LIME}14,transparent)`, borderBottom:`1px solid ${LIME}33` }}>
          <div style={{ fontSize:11, fontWeight:800, color:LIME, letterSpacing:"0.18em", textTransform:"uppercase" }}>Return-to-Sport — Pass / Fail Summary</div>
        </div>
        <div style={{ padding:"16px 20px" }}>
          {!profile?(
            <div style={{ padding:14, borderRadius:8, background:GOLD+"10", border:`1px solid ${GOLD}44`, fontSize:12, color:GOLD }}>⚠ Set Athlete Category and Arm Dominance in the Testing tab to generate the RTS checklist.</div>
          ):(
            <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Athlete Profile</div>
                <div style={{ fontSize:16, fontWeight:900, color:WHITE }}>{profile}</div>
                <div style={{ fontSize:10, color:MUTED, marginTop:3 }}>Strength LSI threshold: <span style={{ color:LIME, fontWeight:700 }}>≥{strThr}%</span>{isThrower&&<span style={{ color:GOLD }}> · BW ratios primary for throwers</span>}</div>
              </div>
              <div style={{ marginLeft:"auto", textAlign:"center" }}>
                <div style={{ fontSize:10, color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Criteria Met</div>
                <div style={{ fontSize:32, fontWeight:900, fontFamily:"monospace", color:allPass?LIME:passingCriteria.length>0?GOLD:RED_BAD }}>{passingCriteria.length}/{allCriteria.length}</div>
                <div style={{ fontSize:11, fontWeight:800, color:allPass?LIME:GOLD, marginTop:2 }}>{allPass?"✓ ALL CRITERIA MET":"IN PROGRESS"}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {profile&&(
        <>
          <div style={{ background:CARD, borderRadius:12, border:`1px solid ${BORDER}`, marginBottom:20, overflow:"hidden" }}>
            <div style={{ padding:"12px 20px", background:"#161616", borderBottom:`1px solid ${BORDER}` }}><div style={{ fontSize:11, fontWeight:800, color:"#888", letterSpacing:"0.15em", textTransform:"uppercase" }}>Universal Criteria — All Athletes</div></div>
            <div style={{ padding:"16px 20px" }}>{universalCriteria.map((c,i)=><CriterionRow key={i} c={c} />)}</div>
          </div>

          {isContact&&(
            <div style={{ background:CARD, borderRadius:12, border:`1px solid ${BLUE}44`, marginBottom:20, overflow:"hidden" }}>
              <div style={{ padding:"12px 20px", background:BLUE+"10", borderBottom:`1px solid ${BLUE}33` }}><div style={{ fontSize:11, fontWeight:800, color:BLUE, letterSpacing:"0.15em", textTransform:"uppercase" }}>{isDominant?"Dominant":"Non-Dominant"} · Contact — Injury-Specific Criteria</div></div>
              <div style={{ padding:"16px 20px" }}>{contactCriteria.map((c,i)=><CriterionRow key={i} c={c} />)}</div>
            </div>
          )}

          {isNonContact&&(
            <div style={{ background:CARD, borderRadius:12, border:`1px solid ${GOLD}44`, marginBottom:20, overflow:"hidden" }}>
              <div style={{ padding:"12px 20px", background:GOLD+"0a", borderBottom:`1px solid ${GOLD}33` }}><div style={{ fontSize:11, fontWeight:800, color:GOLD, letterSpacing:"0.15em", textTransform:"uppercase" }}>{isDominant?"Dominant":"Non-Dominant"} · Non-Contact — Injury-Specific Criteria</div></div>
              <div style={{ padding:"16px 20px" }}>{nonContactCriteria.map((c,i)=><CriterionRow key={i} c={c} />)}</div>
            </div>
          )}

          <div style={{ background:CARD, borderRadius:12, border:`1px solid ${BORDER}`, marginBottom:20, overflow:"hidden" }}>
            <div style={{ padding:"12px 20px", background:"#161616", borderBottom:`1px solid ${BORDER}` }}><div style={{ fontSize:11, fontWeight:800, color:"#888", letterSpacing:"0.15em", textTransform:"uppercase" }}>BW Ratio Reference — Dominant Arm Throwers</div></div>
            <div style={{ padding:"16px 20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[{label:"ER:IR Ratio",target:"65–70%",desc:"External to internal rotation"},{label:"ER:BW",target:"12–15%",desc:"ER force / bodyweight"},{label:"IR:BW",target:"≥25%",desc:"IR force / bodyweight"},{label:"Scaption:BW",target:"15–20%",desc:"Scaption / bodyweight"}].map(r=>(
                  <div key={r.label} style={{ padding:"10px 14px", background:"#111", borderRadius:8, border:`1px solid ${BORDER}` }}>
                    <div style={{ fontSize:11, fontWeight:800, color:WHITE }}>{r.label}</div>
                    <div style={{ fontSize:18, fontWeight:900, fontFamily:"monospace", color:LIME, margin:"4px 0" }}>{r.target}</div>
                    <div style={{ fontSize:10, color:MUTED }}>{r.desc}</div>
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

// ─── COMPARISON TAB ───────────────────────────────────────────────────────────
function CompTab({ currentData:d, sessions, setSessions, onAddSession }) {
  const [paragraph, setParagraph] = useState("");
  const [copied, setCopied] = useState(false);

  const computeMetrics = sd => {
    if (!sd) return null;
    const invR = sd.patient?.involvedSide==="Right";
    const isDom = sd.patient?.armDominance==="dominant";
    const isContact = sd.patient?.athleteCategory==="contact";
    const strThr = isDom&&isContact?110:90;
    const scapInv=invR?sd.scaptionForceR:sd.scaptionForceL; const scapUninv=invR?sd.scaptionForceL:sd.scaptionForceR;
    const erInv=invR?sd.erForceR:sd.erForceL; const erUninv=invR?sd.erForceL:sd.erForceR;
    const irInv=invR?sd.irForceR:sd.irForceL; const irUninv=invR?sd.irForceL:sd.irForceR;
    const ash=sd.ash||{}; const pse=sd.pse||{}; const ue=sd.ueYbal||{};
    const ckcVals=[sd.ckcuestReps,sd.ckcuestReps2,sd.ckcuestReps3].map(v=>parseFloat(v)).filter(v=>!isNaN(v));
    const calcComp=(m,il,sl,ll)=>(hasVal(m)&&hasVal(il)&&hasVal(sl)&&hasVal(ll)&&toNum(ll)>0)?(((toNum(m)+toNum(il)+toNum(sl))/(3*toNum(ll)))*100).toFixed(1):null;
    const spInvA=avgTrials(sd.shotputInv1,sd.shotputInv2,sd.shotputInv3);
    const spUninvA=avgTrials(sd.shotputUninv1,sd.shotputUninv2,sd.shotputUninv3);
    return {
      wks:sd.patient?.weeksPostOp||null, date:sd.patient?.date||null,
      gripInvNorm:calcNorm(calcTorqueNm(invR?sd.gripR:sd.gripL,sd.leverArm),sd.bw),
      scapLSI:calcLSI(scapInv,scapUninv), erLSI:calcLSI(erInv,erUninv), irLSI:calcLSI(irInv,irUninv),
      ashLSI:calcLSI(ash.peakInv,ash.peakUninv), ashTPFLSI:calcLSI(ash.tpfInv,ash.tpfUninv),
      ckcAvg:ckcVals.length?(ckcVals.reduce((a,b)=>a+b,0)/ckcVals.length).toFixed(1):null,
      ueComp:calcComp(ue.invMedial,ue.invInfLat,ue.invSupLat,ue.invLimbLength),
      plyoLSI:calcLSI((sd.plyo||{}).invPeakForce,(sd.plyo||{}).uninvPeakForce),
      spLSI:calcLSI(spInvA,spUninvA),
      pseLSI:calcLSI(pse.timeInv,pse.timeUninv),
      strThr,
    };
  };

  const sessionCols=sessions.map((s,i)=>({key:`s${i}`,label:s.label,metrics:computeMetrics(s.data),isSession:true}));
  const currentCol={key:"current",label:"Today",metrics:computeMetrics(d),isCurrent:true};
  const allCols=[...sessionCols,currentCol];

  const metricRows=[
    {label:"Weeks Post-Op",key:"wks",u:" wks",higher:true,group:"session"},
    {label:"Grip Inv (Nm/kg)",key:"gripInvNorm",u:" Nm/kg",higher:true,group:"strength",spark:true},
    {label:"Scaption LSI",key:"scapLSI",u:"%",higher:true,group:"strength",spark:true},
    {label:"ER Strength LSI",key:"erLSI",u:"%",higher:true,group:"strength",spark:true},
    {label:"IR Strength LSI",key:"irLSI",u:"%",higher:true,group:"strength",spark:true},
    {label:"ASH Peak Force LSI",key:"ashLSI",u:"%",higher:true,group:"ash",spark:true},
    {label:"ASH TPF Symmetry",key:"ashTPFLSI",u:"%",higher:true,group:"ash",spark:true},
    {label:"CKCUEST Avg",key:"ckcAvg",u:" reps",higher:true,group:"functional",spark:true},
    {label:"UE Y-Balance (%)",key:"ueComp",u:"%",higher:true,group:"functional",spark:true},
    {label:"Plyo Push-Up LSI",key:"plyoLSI",u:"%",higher:true,group:"functional",spark:true},
    {label:"Shotput LSI",key:"spLSI",u:"%",higher:true,group:"functional",spark:true},
    {label:"PSE Time LSI",key:"pseLSI",u:"%",higher:true,group:"functional",spark:true},
  ];
  const groups=[{key:"session",label:"Session"},{key:"strength",label:"Strength"},{key:"ash",label:"ASH / VALD"},{key:"functional",label:"Functional"}];

  const delta=(cur,prev,higher)=>{ const c=parseFloat(cur),p=parseFloat(prev); if(isNaN(c)||isNaN(p)) return null; const diff=c-p; if(Math.abs(diff)<0.05) return{diff:0,dir:"same"}; const improved=higher===true?diff>0:diff<0; return{diff:Math.abs(diff).toFixed(1),dir:improved?"up":"down"}; };
  const deltaColor=dir=>({up:LIME,down:RED_BAD,same:GOLD,neutral:MUTED}[dir]||MUTED);
  const deltaArrow=dir=>({up:"▲",down:"▼",same:"=",neutral:"~"}[dir]||"—");

  const Sparkline=({rowKey})=>{ const vals=allCols.map(c=>parseFloat(c.metrics?.[rowKey])).filter(v=>!isNaN(v)); if(vals.length<2) return null; const min=Math.min(...vals),max=Math.max(...vals); const range=max-min||1; const W=80,H=24,pad=3; const points=allCols.map((c,i)=>({v:parseFloat(c.metrics?.[rowKey]),i})).filter(p=>!isNaN(p.v)).map(p=>{const x=pad+(p.i/Math.max(allCols.length-1,1))*(W-pad*2);const y=H-pad-((p.v-min)/range)*(H-pad*2);return`${x},${y}`;}); const lastVal=parseFloat(allCols[allCols.length-1].metrics?.[rowKey]); const firstVal=parseFloat(allCols.find(c=>!isNaN(parseFloat(c.metrics?.[rowKey])))?.metrics?.[rowKey]); const trend=!isNaN(lastVal)&&!isNaN(firstVal)?(lastVal>firstVal?LIME:lastVal<firstVal?RED_BAD:GOLD):MUTED; return(<svg width={W} height={H} style={{display:"block"}}><polyline points={points.join(" ")} fill="none" stroke={trend} strokeWidth={1.5} strokeLinejoin="round"/>{points.map((pt,i)=>{const[x,y]=pt.split(",").map(Number);return<circle key={i} cx={x} cy={y} r={2} fill={i===points.length-1?trend:"#333"} stroke={trend} strokeWidth={0.5}/>;})}</svg>); };

  const generateParagraph=()=>{
    const cur=computeMetrics(d); const prev=sessions.length>0?computeMetrics(sessions[sessions.length-1].data):null;
    const wks=toNum(d.patient?.weeksPostOp); const stype=d.patient?.surgeryType; const sentences=[];
    let opening=`Patient is${wks>0?` ${wks} weeks post-operative`:` post-operative`}${stype?` from ${stype}`:""}. Formal elbow return-to-sport testing battery completed.`;
    sentences.push(opening);
    if(cur.erLSI||cur.irLSI||cur.scapLSI){ const parts=[]; if(cur.scapLSI) parts.push(`scaption LSI ${cur.scapLSI}%`); if(cur.erLSI) parts.push(`ER LSI ${cur.erLSI}%`); if(cur.irLSI) parts.push(`IR LSI ${cur.irLSI}%`); sentences.push(`Shoulder dynamo strength: ${parts.join("; ")} (target ≥${cur.strThr}%).`); }
    if(cur.ashLSI) sentences.push(`ASH peak force LSI: ${cur.ashLSI}% (target ≥${cur.strThr}%)${cur.ashTPFLSI?`; time to peak LSI: ${cur.ashTPFLSI}% (${parseFloat(cur.ashTPFLSI)>=90?"<10% asymmetry":">10% asymmetry"})`:""}.`);
    if(cur.ckcAvg) sentences.push(`CKCUEST average: ${cur.ckcAvg} reps (${parseFloat(cur.ckcAvg)>21?"meets >21 benchmark":"below benchmark"}).`);
    if(cur.ueComp) sentences.push(`UE Y-Balance composite: ${cur.ueComp}% (${parseFloat(cur.ueComp)>=90?"meets ≥90%":"below ≥90%"}).`);
    if(cur.spLSI){ const spTgt=d.patient?.armDominance==="dominant"?110:90; sentences.push(`Seated shotput LSI: ${cur.spLSI}% (target >${spTgt}%${parseFloat(cur.spLSI)>spTgt?" ✓":""}).`); }
    if(cur.pseLSI) sentences.push(`Posterior shoulder endurance time LSI: ${cur.pseLSI}% (${parseFloat(cur.pseLSI)>=90?"meets ≥90%":"below ≥90%"}).`);
    setParagraph(sentences.join(" "));
  };

  const colW=90,labelW=190;
  return(
    <div>
      <Card title="Progress Tracking" accent>
        <div style={{ fontSize:12, color:MUTED, marginBottom:14, lineHeight:1.6 }}>{sessions.length>0?`Comparing ${sessions.length} previous session${sessions.length>1?"s":""} against today's data.`:"Load previous session PDFs to enable multi-session comparison."}</div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <button onClick={onAddSession} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${BORDER}`, background:"#1a1a1a", color:"#aaa", cursor:"pointer", fontSize:11, fontWeight:700 }}>+ Add Session PDF</button>
          {sessions.length>0&&<button onClick={()=>setSessions([])} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${RED_BAD}44`, background:"transparent", color:RED_BAD, cursor:"pointer", fontSize:11, fontWeight:700 }}>Clear All Sessions</button>}
          {sessions.map((s,i)=><div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderRadius:6, background:"#1a1a1a", border:`1px solid ${BORDER}` }}><span style={{ fontSize:10, fontWeight:700, color:"#aaa" }}>{s.label}</span><button onClick={()=>setSessions(prev=>prev.filter((_,idx)=>idx!==i))} style={{ background:"none", border:"none", color:MUTED, cursor:"pointer", fontSize:12, lineHeight:1, padding:0 }}>×</button></div>)}
        </div>
      </Card>

      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, overflow:"hidden", marginBottom:20 }}>
        <div style={{ padding:"12px 20px", background:"#161616", borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:3, height:18, borderRadius:2, background:LIME }} />
          <span style={{ fontSize:11, fontWeight:800, letterSpacing:"0.18em", color:"#888", textTransform:"uppercase" }}>Session Timeline</span>
        </div>
        <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ minWidth:labelW+(allCols.length*colW)+(sessions.length>0?60:0) }}>
            <div style={{ display:"flex", borderBottom:`1px solid ${BORDER}`, background:"#141414" }}>
              <div style={{ width:labelW, flexShrink:0, padding:"10px 16px", fontSize:10, fontWeight:800, color:MUTED, textTransform:"uppercase", letterSpacing:"0.1em" }}>Measure</div>
              {allCols.map((col,ci)=><div key={col.key} style={{ width:colW, flexShrink:0, padding:"10px 8px", textAlign:"center" }}><div style={{ fontSize:10, fontWeight:900, color:col.isCurrent?LIME:"#888", letterSpacing:"0.06em", marginBottom:2 }}>{col.isCurrent?"TODAY":`Visit ${ci+1}`}</div><div style={{ fontSize:9, color:col.isCurrent?LIME+"88":MUTED }}>{col.metrics?.wks?`Wk ${col.metrics.wks}`:col.label}</div></div>)}
              {sessions.length>0&&<div style={{ width:60, flexShrink:0, padding:"10px 8px", fontSize:10, fontWeight:800, color:MUTED, textAlign:"center", textTransform:"uppercase" }}>Trend</div>}
            </div>
            {groups.map(grp=>{
              const grpRows=metricRows.filter(r=>r.group===grp.key);
              const hasAny=grpRows.some(r=>allCols.some(c=>c.metrics?.[r.key]!=null&&c.metrics?.[r.key]!==""));
              if(!hasAny) return null;
              return(<div key={grp.key}>
                <div style={{ padding:"6px 16px", background:"#111", borderTop:`1px solid ${BORDER}`, borderBottom:`1px solid ${BORDER}22` }}><span style={{ fontSize:9, fontWeight:900, color:MUTED, letterSpacing:"0.16em", textTransform:"uppercase" }}>{grp.label}</span></div>
                {grpRows.map((row,ri)=>{
                  return(<div key={row.key} style={{ display:"flex", alignItems:"center", background:ri%2===0?"#111":"transparent", borderBottom:`1px solid ${BORDER}22` }}>
                    <div style={{ width:labelW, flexShrink:0, padding:"9px 16px", fontSize:11, fontWeight:600, color:"#ccc" }}>{row.label}</div>
                    {allCols.map((col,ci)=>{
                      const val=col.metrics?.[row.key]; const hasV=val!=null&&val!=="";
                      const prevC=ci>0?allCols[ci-1]:null; const prevV=prevC?.metrics?.[row.key];
                      const cellDelta=prevC?delta(val,prevV,row.higher):null;
                      return(<div key={col.key} style={{ width:colW, flexShrink:0, padding:"9px 8px", textAlign:"center" }}>
                        <div style={{ fontSize:12, fontFamily:"monospace", fontWeight:col.isCurrent?800:400, color:col.isCurrent?WHITE:"#888" }}>{hasV?`${val}${row.u}`:<span style={{ color:"#333" }}>—</span>}</div>
                        {cellDelta&&hasV&&<div style={{ fontSize:9, fontWeight:700, color:deltaColor(cellDelta.dir), marginTop:1 }}>{deltaArrow(cellDelta.dir)}{cellDelta.diff!=="0.0"?` ${cellDelta.diff}`:""}</div>}
                      </div>);
                    })}
                    {sessions.length>0&&<div style={{ width:60, flexShrink:0, padding:"4px 8px", display:"flex", alignItems:"center", justifyContent:"center" }}>{row.spark&&<Sparkline rowKey={row.key} />}</div>}
                  </div>);
                })}
              </div>);
            })}
          </div>
        </div>
        <div style={{ padding:"10px 16px", background:"#0f0f0f", borderTop:`1px solid ${BORDER}`, display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
          {[[LIME,"▲ Improved"],[RED_BAD,"▼ Declined"],[GOLD,"= Unchanged"]].map(([c,l])=><span key={l} style={{ fontSize:10, fontWeight:700, color:c }}>{l}</span>)}
        </div>
      </div>

      <Card title="Progress Note Generator" accent>
        <button onClick={generateParagraph} style={{ padding:"12px 32px", borderRadius:10, fontSize:12, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", background:LIME, color:BLACK, border:"none", marginBottom:14 }}>Generate Progress Note</button>
        {paragraph&&(
          <div style={{ background:"#0f0f0f", borderRadius:10, border:`1px solid ${LIME}44`, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", background:LIME+"12", borderBottom:`1px solid ${LIME}22` }}>
              <span style={{ fontSize:10, fontWeight:800, color:LIME, letterSpacing:"0.15em", textTransform:"uppercase" }}>Clinical Progress Note</span>
              <button onClick={()=>{ navigator.clipboard.writeText(paragraph).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}); }} style={{ padding:"6px 16px", borderRadius:6, fontSize:11, fontWeight:800, cursor:"pointer", background:copied?"#15803d":LIME, color:BLACK, border:"none" }}>{copied?"✓ Copied!":"Copy"}</button>
            </div>
            <div style={{ padding:20, color:"#d4faa6", fontSize:13, lineHeight:2.0, fontFamily:"inherit" }}>{paragraph}</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,    setActiveTab]    = useState(0);
  const [saving,       setSaving]       = useState(false);
  const [loadMsg,      setLoadMsg]      = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open:false, file:null, fileName:"" });
  const [newPtModal,   setNewPtModal]   = useState(false);
  const [sessions,     setSessions]     = useState([]);
  const [data,         setData]         = useState(BLANK_DATA);
  const [storageRestored, setStorageRestored] = useState(false);
  const [restoreComplete, setRestoreComplete] = useState(false);
  const fileInputRef    = useRef(null);
  const compareInputRef = useRef(null);

  useEffect(()=>{ (async()=>{ try { let p=null; try{const s=await window.storage.get("trm_elbow_autosave");if(s&&s.value)p=JSON.parse(s.value);}catch(e){} if(!p){try{const l=localStorage.getItem("trm_elbow_autosave_local");if(l)p=JSON.parse(l);}catch(e){}} if(p){const hasData=p.patient?.date||p.patient?.surgeryType||p.bw;if(hasData){setData(p);setStorageRestored(true);setTimeout(()=>setStorageRestored(false),5000);}} }catch(e){}finally{setRestoreComplete(true);} })(); },[]);
  useEffect(()=>{ if(!restoreComplete) return; const s=JSON.stringify(data); try{localStorage.setItem("trm_elbow_autosave_local",s);}catch(e){} (async()=>{try{await window.storage.set("trm_elbow_autosave",s);}catch(e){}})(); },[data,restoreComplete]);

  const tabs=[{label:"Testing",sub:"Outcome Measures"},{label:"Comparison",sub:"Progress Tracking"},{label:"RTS",sub:"Pass / Fail Summary"}];

  const handleSavePDF=async()=>{ setSaving(true); try{ const r=await saveSessionPDF(data,"download"); if(r==="ios-tab"){setLoadMsg({type:"success",text:"PDF opened in new tab — use Share → Save to Files to save it."});setTimeout(()=>setLoadMsg(null),12000);} }catch(e){setLoadMsg({type:"error",text:"Save failed: "+e.message});setTimeout(()=>setLoadMsg(null),8000);} setSaving(false); };
  const handleShare=async()=>{ setSaving(true); try{ const r=await saveSessionPDF(data,"share"); if(r==="share-unsupported"){ await saveSessionPDF(data,"download"); } }catch(e){setLoadMsg({type:"error",text:"Share failed. Try Save PDF instead."});setTimeout(()=>setLoadMsg(null),8000);} setSaving(false); };
  const handleFileChange=e=>{ const file=e.target.files[0]; if(!file) return; e.target.value=""; setConfirmModal({open:true,file,fileName:file.name}); };
  const doLoadFile=async()=>{ const file=confirmModal.file; setConfirmModal({open:false,file:null,fileName:""}); await loadSessionPDF(file,sessionData=>{ const label=sessionData.patient?.date||(sessionData.patient?.weeksPostOp?`Wk ${sessionData.patient.weeksPostOp}`:"Previous Session"); setSessions(prev=>{const exists=prev.findIndex(s=>s.label===label);if(exists>=0){const n=[...prev];n[exists]={data:sessionData,label};return n;}return[{data:sessionData,label},...prev].slice(0,5);}); setData(sessionData); setLoadMsg({type:"success",text:`Session loaded — fields restored.`}); setTimeout(()=>setLoadMsg(null),5000); },errMsg=>{setLoadMsg({type:"error",text:errMsg});setTimeout(()=>setLoadMsg(null),6000);}); };
  const handleCompareFile=async e=>{ const file=e.target.files[0]; if(!file) return; e.target.value=""; await loadSessionPDF(file,sessionData=>{ const label=sessionData.patient?.date||(sessionData.patient?.weeksPostOp?`Wk ${sessionData.patient.weeksPostOp}`:"Session"); setSessions(prev=>{const exists=prev.findIndex(s=>s.label===label);if(exists>=0){const n=[...prev];n[exists]={data:sessionData,label};return n;}if(prev.length>=5){setLoadMsg({type:"error",text:"Max 5 comparison sessions."});setTimeout(()=>setLoadMsg(null),5000);return prev;}return[...prev,{data:sessionData,label}];}); setLoadMsg({type:"success",text:`Added ${label} to comparison.`}); setTimeout(()=>setLoadMsg(null),4000); },errMsg=>{setLoadMsg({type:"error",text:errMsg});setTimeout(()=>setLoadMsg(null),6000);}); };
  const doNewPatient=async()=>{ setData(BLANK_DATA); setSessions([]); setNewPtModal(false); setActiveTab(0); try{await window.storage.delete("trm_elbow_autosave");}catch(e){} try{localStorage.removeItem("trm_elbow_autosave_local");}catch(e){} };

  return (
    <div style={{ background:BLACK, minHeight:"100vh", color:WHITE, fontFamily:"'Inter','Helvetica Neue',sans-serif" }}>
      <ConfirmModal open={confirmModal.open} fileName={confirmModal.fileName} onConfirm={doLoadFile} onCancel={()=>setConfirmModal({open:false,file:null,fileName:""})} />
      <NewPatientModal open={newPtModal} onConfirm={doNewPatient} onCancel={()=>setNewPtModal(false)} />

      {/* HEADER */}
      <div style={{ background:DARK, borderBottom:`1px solid ${BORDER}`, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 20px rgba(0,0,0,0.8)" }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 20px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:58 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:12 }}>
              <svg viewBox="0 0 867 352" xmlns="http://www.w3.org/2000/svg" style={{ height:44, width:"auto", display:"block", color:WHITE, flexShrink:0 }} aria-label="TRM" role="img"><path fillRule="evenodd" fill="currentColor" d="M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z" /></svg>
              <span style={{ color:BORDER, fontSize:18 }}>|</span>
              <span className="trm-e-header-subtitle" style={{ fontSize:11, fontWeight:700, color:"#777", letterSpacing:"0.08em", textTransform:"uppercase" }}>Elbow Testing & Outcome Measures</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={handleFileChange} />
              <input ref={compareInputRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={handleCompareFile} />
              <span style={{ fontSize:10, fontWeight:700, color:MUTED, letterSpacing:"0.1em", textTransform:"uppercase" }}>Involved:</span>
              <SideToggle value={data.patient.involvedSide} onChange={v=>setData(p=>({...p,patient:{...p.patient,involvedSide:v}}))} />
            </div>
          </div>
          <div style={{ display:"flex", borderTop:`1px solid ${BORDER}` }}>
            {tabs.map((t,i)=>(
              <button key={i} onClick={()=>setActiveTab(i)} className="trm-e-tab-btn" style={{ padding:"10px 22px", background:"transparent", border:"none", borderBottom:`3px solid ${activeTab===i?LIME:"transparent"}`, cursor:"pointer", textAlign:"left" }}>
                <div style={{ fontSize:12, fontWeight:800, color:activeTab===i?LIME:"#666" }}>{t.label}</div>
                <div className="trm-e-tab-sub" style={{ fontSize:9, color:activeTab===i?LIME+"88":"#444", letterSpacing:"0.08em", textTransform:"uppercase" }}>{t.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="trm-e-main-pad" style={{ maxWidth:900, margin:"0 auto", padding:"20px 16px" }}>
        {storageRestored&&<div style={{ marginBottom:20, padding:"12px 18px", borderRadius:10, border:`1px solid ${BLUE}55`, background:BLUE+"12", display:"flex", alignItems:"center", gap:12 }}><span style={{ fontSize:16 }}>💾</span><span style={{ fontSize:12, fontWeight:700, color:BLUE }}>Session auto-restored from your last visit.</span><button onClick={()=>setStorageRestored(false)} style={{ marginLeft:"auto", background:"none", border:"none", color:MUTED, cursor:"pointer", fontSize:16 }}>×</button></div>}
        {loadMsg&&<div style={{ marginBottom:20, padding:"12px 18px", borderRadius:10, border:`1px solid ${loadMsg.type==="success"?LIME+"55":RED_BAD+"55"}`, background:loadMsg.type==="success"?LIME+"12":RED_BAD+"12", display:"flex", alignItems:"center", gap:12 }}><span style={{ fontSize:16 }}>{loadMsg.type==="success"?"✓":"⚠"}</span><span style={{ fontSize:12, fontWeight:700, color:loadMsg.type==="success"?LIME:RED_BAD }}>{loadMsg.text}</span><button onClick={()=>setLoadMsg(null)} style={{ marginLeft:"auto", background:"none", border:"none", color:MUTED, cursor:"pointer", fontSize:16 }}>×</button></div>}
        {activeTab===0&&<Tab1 data={data} setData={setData} />}
        {activeTab===1&&<CompTab currentData={data} sessions={sessions} setSessions={setSessions} onAddSession={()=>compareInputRef.current.click()} />}
        {activeTab===2&&<RTSTab data={data} setData={setData} />}
      </div>

      <div style={{ borderTop:`1px solid ${BORDER}`, padding:"16px 20px", textAlign:"center" }}>
        <svg viewBox="0 0 867 352" xmlns="http://www.w3.org/2000/svg" style={{ height:15, width:"auto", display:"inline-block", verticalAlign:"middle", color:WHITE }} aria-label="TRM" role="img"><path fillRule="evenodd" fill="currentColor" d="M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z" /></svg>
        <span style={{ color:MUTED, fontSize:11, marginLeft:10 }}>Elbow Testing Tool — Not a substitute for clinical judgment</span>
      </div>

      {/* FAB */}
      <div className="trm-e-fab" style={{ position:"fixed", bottom:24, right:24, zIndex:200, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ display:"flex", alignItems:"stretch", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, overflow:"hidden", background:"rgba(255,255,255,0.05)", boxShadow:"0 2px 10px rgba(0,0,0,0.5)" }}>
          <button onClick={()=>setNewPtModal(true)} style={{ padding:"8px 12px", background:"rgba(248,113,113,0.09)", color:"rgba(248,113,113,0.85)", border:"none", cursor:"pointer", fontSize:9, fontWeight:800, letterSpacing:"0.07em", textTransform:"uppercase" }}>Reset</button>
          <div style={{ width:1, background:"rgba(255,255,255,0.12)", flexShrink:0 }} />
          <button onClick={()=>fileInputRef.current.click()} style={{ padding:"8px 12px", background:"transparent", color:"rgba(255,255,255,0.55)", border:"none", cursor:"pointer", fontSize:9, fontWeight:800, letterSpacing:"0.07em", textTransform:"uppercase" }}>Load</button>
        </div>
        <div style={{ display:"flex", alignItems:"stretch", border:`1px solid ${LIME}52`, borderRadius:8, overflow:"hidden", boxShadow:`0 2px 10px ${LIME}14`, background:LIME+"0f", opacity:saving?0.5:1 }}>
          <button onClick={handleSavePDF} disabled={saving} style={{ padding:"8px 14px", background:"transparent", color:LIME+"f2", border:"none", cursor:saving?"default":"pointer", fontSize:9, fontWeight:800, letterSpacing:"0.07em", textTransform:"uppercase" }}>{saving?"Saving…":"Save PDF"}</button>
          <div style={{ width:1, background:LIME+"40", flexShrink:0 }} />
          <button onClick={handleShare} disabled={saving} title="Share / AirDrop" style={{ padding:"6px 10px", background:"transparent", border:"none", cursor:saving?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
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
