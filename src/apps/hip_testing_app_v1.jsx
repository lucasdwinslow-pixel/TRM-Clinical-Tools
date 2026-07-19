import { useState, useRef, useEffect } from "react";

// ─── PDF-LIB LOADER ───────────────────────────────────────────────────────────
let _pdfLibResolve;
const _pdfLibPromise = new Promise(r => { _pdfLibResolve = r; });
if (typeof window !== "undefined") {
  if (window.PDFLib) { _pdfLibResolve(window.PDFLib); }
  else {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
    s.onload = () => _pdfLibResolve(window.PDFLib);
    document.head.appendChild(s);
  }
}
const getPdfLib = () => _pdfLibPromise;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LIME="#b8ff57",LIME_DIM="#8ed43c",BLACK="#0a0a0a",DARK="#111111",CARD="#181818";
const BORDER="#2a2a2a",MUTED="#555555",WHITE="#ffffff",GOLD="#fbbf24";
const RED_BAD="#f87171",BLUE="#38bdf8";

// ─── MATH ─────────────────────────────────────────────────────────────────────
const toNum = v => parseFloat(v)||0;
const hasVal = v => v!==""&&v!==null&&v!==undefined&&!isNaN(parseFloat(v));
const calcLSI = (inv,uninv) => {
  if(!hasVal(inv)||!hasVal(uninv)||toNum(uninv)===0) return null;
  return ((toNum(inv)/toNum(uninv))*100).toFixed(1);
};
const calcTimedLSI = (inv,uninv) => {
  if(!hasVal(inv)||!hasVal(uninv)||toNum(inv)===0) return null;
  return ((toNum(uninv)/toNum(inv))*100).toFixed(1);
};
const calcAsym = (a,b) => {
  if(!hasVal(a)||!hasVal(b)) return null;
  const mx=Math.max(toNum(a),toNum(b));
  if(mx===0) return null;
  return ((Math.abs(toNum(a)-toNum(b))/mx)*100).toFixed(1);
};
const trialToIn = t => { const ft=parseFloat(t.ft),inch=parseFloat(t.in)||0; if(isNaN(ft)) return null; return ft*12+inch; };
const hopAvgIn = trials => { if(!Array.isArray(trials)) return null; const v=trials.map(trialToIn).filter(x=>x!==null); if(!v.length) return null; return (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1); };
const hopAvgTimed = trials => { if(!Array.isArray(trials)) return null; const v=trials.map(x=>parseFloat(x)).filter(x=>!isNaN(x)); if(!v.length) return null; return (v.reduce((a,b)=>a+b,0)/v.length).toFixed(2); };

const lsiColor = v => { const n=parseFloat(v); if(isNaN(n)) return MUTED; return n>=90?LIME:n>=80?GOLD:RED_BAD; };
const asymColor = v => { const n=parseFloat(v); if(isNaN(n)) return MUTED; return n<=10?LIME:n<=15?GOLD:RED_BAD; };

// ─── MOBILE STYLES ────────────────────────────────────────────────────────────
if (typeof document!=="undefined"&&!document.getElementById("trm-hip-styles")) {
  if(!document.querySelector('meta[name="viewport"]')) {
    const m=document.createElement("meta"); m.name="viewport";
    m.content="width=device-width,initial-scale=1,viewport-fit=cover";
    document.head.appendChild(m);
  }
  const s=document.createElement("style"); s.id="trm-hip-styles";
  s.textContent=`
    html,body{overscroll-behavior-y:none}
    .trm-fab{bottom:max(24px,env(safe-area-inset-bottom,24px))!important;right:max(24px,env(safe-area-inset-right,24px))!important}
    .trm-main-content{padding-bottom:max(100px,calc(80px + env(safe-area-inset-bottom,0px)))!important}
    .trm-sidenav{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:150;display:flex;flex-direction:column;gap:2px;padding:6px 0;background:rgba(11,15,18,0.85);backdrop-filter:blur(8px);border-left:1px solid rgba(255,255,255,0.08);border-radius:8px 0 0 8px}
    .trm-sidenav-item{display:flex;align-items:center;justify-content:center;width:34px;height:26px;cursor:pointer;font-size:8px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.25);border-left:2px solid transparent;transition:all 0.15s;user-select:none}
    .trm-sidenav-item:hover{color:rgba(255,255,255,0.6)!important}
    .trm-sidenav-item.active{color:#b8ff57!important;border-left-color:#b8ff57!important;text-shadow:0 0 8px rgba(184,255,87,0.5)}
    .trm-mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:150;background:#0f0f0f;border-top:1px solid rgba(184,255,87,0.2);flex-direction:row;align-items:center;gap:6px;padding:8px 10px calc(8px + env(safe-area-inset-bottom))}
    @media(max-width:700px){
      .trm-sidenav{display:none!important}
      .trm-main-content{padding-bottom:120px!important}
      .trm-r2,.trm-r3,.trm-r4{grid-template-columns:1fr!important}
      .trm-r2-persist{grid-template-columns:1fr 1fr!important}
      .trm-card-body{padding:14px!important}
      .trm-header-subtitle{display:none!important}
      .trm-tab-sub{display:none!important}
      .trm-tab-btn{padding:10px 12px!important}
      .trm-stat-bar{gap:16px!important;padding:10px 14px!important}
      .trm-fab{bottom:90px!important;right:12px!important;gap:5px!important}
      .trm-fab button{padding:10px 12px!important;font-size:11px!important;min-height:44px;min-width:44px}
      input[type="number"],input[type="text"],select,textarea{font-size:16px!important;min-height:44px!important}
    }
  `;
  document.head.appendChild(s);
}

// ─── INPUT STYLES ─────────────────────────────────────────────────────────────
const VALID_RANGES = {
  bw:[50,500], hipFlex:[0,150], hipExt:[-20,50], hipAbd:[0,80], hipAdd:[0,60], hipIR:[0,80], hipER:[0,80],
  dynPF:[0,2000], dynTPF:[0,1500], imtpPF:[0,5000], imtpTPF:[0,1500],
  cmjHeight:[0,80], cmjAsym:[0,100], cmjCov:[0,50],
  slForce:[0,5000], slTTS:[0,10], agilityTime:[3.0,10.0],
  iHOT:[0,100], hosSport:[0,100], tampa:[11,44],
};
const isOOR = (key,val) => { if(!hasVal(val)) return false; const r=VALID_RANGES[key]; if(!r) return false; const v=parseFloat(val); return v<r[0]||v>r[1]; };
const inpInvalid = { background:"#2a1010",border:"1px solid #f87171",borderRadius:6,padding:"8px 12px",color:RED_BAD,fontSize:13,width:"100%",outline:"none",fontFamily:"inherit",boxSizing:"border-box" };
const inp = { background:"#1c1c1c",border:"1px solid #2e2e2e",borderRadius:6,padding:"8px 12px",color:WHITE,fontSize:13,width:"100%",outline:"none",fontFamily:"inherit",boxSizing:"border-box" };
const lbl = { display:"block",fontSize:10,fontWeight:800,letterSpacing:"0.12em",color:MUTED,textTransform:"uppercase",marginBottom:4 };
const calcBox = { background:"#0f0f0f",border:`1px solid ${LIME}33`,borderRadius:6,padding:"8px 12px",color:LIME,fontSize:13,fontFamily:"monospace",textAlign:"center" };

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Card({ title, accent, children, id, focusable, activeCard, setActiveCard }) {
  const isActive = focusable?(activeCard===id):false;
  const handleClick = focusable&&setActiveCard?()=>setActiveCard(id):undefined;
  return (
    <div id={id} style={{ background:CARD,border:`1px solid ${accent?LIME+"44":isActive?LIME+"66":BORDER}`,borderRadius:12,marginBottom:20,overflow:"hidden",boxShadow:accent?`0 0 24px ${LIME}18`:isActive?`0 0 20px ${LIME}22`:"0 2px 12px rgba(0,0,0,0.4)",transition:"box-shadow 0.2s,border-color 0.2s" }}>
      <div onClick={handleClick} style={{ padding:"12px 20px",background:accent?`linear-gradient(90deg,${LIME}18,transparent)`:isActive?`linear-gradient(90deg,${LIME}14,transparent)`:"#161616",borderBottom:`1px solid ${accent?LIME+"33":isActive?LIME+"33":BORDER}`,display:"flex",alignItems:"center",gap:10,cursor:focusable?"pointer":"default",userSelect:"none" }}>
        <div style={{ width:3,height:18,borderRadius:2,background:accent?LIME:isActive?LIME:"#444" }}/>
        <span style={{ fontSize:11,fontWeight:800,letterSpacing:"0.18em",color:accent?LIME:isActive?LIME:"#888",textTransform:"uppercase" }}>{title}</span>
      </div>
      <div className="trm-card-body" style={{ padding:20 }}>{children}</div>
    </div>
  );
}
function R2({ children, mb=12, persist=false }) {
  return <div className={persist?"trm-r2-persist":"trm-r2"} style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:mb }}>{children}</div>;
}
function R3({ children, mb=12 }) {
  return <div className="trm-r3" style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:mb }}>{children}</div>;
}
function R4({ children, mb=12 }) {
  return <div className="trm-r4" style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:mb }}>{children}</div>;
}
function Field({ label, value, onChange, type="number", step="0.1", placeholder="—", unit, readOnly, fieldKey }) {
  const invalid=!readOnly&&fieldKey&&isOOR(fieldKey,value);
  return (
    <div>
      <label style={lbl}>{label}{unit?` (${unit})`:""}</label>
      <input style={readOnly?{...inp,color:LIME,background:"#0f0f0f",borderColor:LIME+"33",cursor:"default"}:invalid?inpInvalid:inp}
        type="text"
        inputMode={!readOnly&&type==="number"?"decimal":undefined}
        step={step} placeholder={placeholder}
        autoCorrect="off" autoCapitalize="off" spellCheck={false}
        value={value} readOnly={readOnly}
        onChange={readOnly?undefined:e=>onChange(e.target.value)}
        title={invalid?`Value out of expected range (${VALID_RANGES[fieldKey]?.[0]}-${VALID_RANGES[fieldKey]?.[1]})`:undefined}
      />
    </div>
  );
}
function StatBar({ stats }) {
  return (
    <div className="trm-stat-bar" style={{ background:"#0f0f0f",border:`1px solid ${BORDER}`,borderRadius:8,padding:"12px 20px",display:"flex",gap:28,flexWrap:"wrap",marginTop:8 }}>
      {stats.map((s,i)=>(
        <div key={i} style={{ textAlign:"center" }}>
          <div style={{ fontSize:10,fontWeight:700,color:MUTED,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3 }}>{s.label}</div>
          <div style={{ fontSize:18,fontWeight:800,color:s.color||LIME,fontFamily:"monospace" }}>{s.value||"—"}</div>
        </div>
      ))}
    </div>
  );
}
function SideToggle({ value, onChange }) {
  return (
    <div style={{ display:"flex",gap:8 }}>
      {["Left","Right"].map(s=>(
        <button key={s} onClick={()=>onChange(s)} style={{ padding:"8px 24px",borderRadius:8,fontSize:12,fontWeight:800,cursor:"pointer",background:value===s?LIME:"transparent",border:`2px solid ${value===s?LIME:BORDER}`,color:value===s?BLACK:MUTED }}>{s}</button>
      ))}
    </div>
  );
}
function Badge({ pass, label }) {
  if(pass===null||pass===undefined) return null;
  const c = pass?LIME:RED_BAD;
  return <span style={{ fontSize:10,fontWeight:800,color:c,letterSpacing:"0.06em" }}>{pass?"✓":"✗"} {label}</span>;
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ open, fileName, onConfirm, onCancel }) {
  if(!open) return null;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#141414",border:`1px solid ${BORDER}`,borderRadius:16,width:"100%",maxWidth:420,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.8)" }}>
        <div style={{ height:3,background:`linear-gradient(90deg,${GOLD},${GOLD}88,transparent)` }}/>
        <div style={{ padding:"28px 28px 24px" }}>
          <div style={{ display:"flex",alignItems:"flex-start",gap:16,marginBottom:20 }}>
            <div style={{ width:40,height:40,borderRadius:10,flexShrink:0,background:GOLD+"18",border:`1px solid ${GOLD}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>⚠</div>
            <div>
              <div style={{ fontSize:14,fontWeight:800,color:WHITE,marginBottom:6 }}>Replace Current Session?</div>
              <div style={{ fontSize:12,color:"#888",lineHeight:1.6 }}>Loading this file will overwrite all data currently on the form. This cannot be undone.</div>
            </div>
          </div>
          {fileName&&<div style={{ background:"#0f0f0f",border:`1px solid ${BORDER}`,borderRadius:8,padding:"8px 14px",marginBottom:24,display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:11,color:MUTED }}>FILE</span>
            <span style={{ fontSize:12,fontWeight:700,color:"#ccc",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{fileName}</span>
          </div>}
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={onCancel} style={{ flex:1,padding:"12px",borderRadius:10,fontSize:12,fontWeight:800,cursor:"pointer",background:"transparent",border:`1px solid ${BORDER}`,color:MUTED }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:1,padding:"12px",borderRadius:10,fontSize:12,fontWeight:800,cursor:"pointer",background:GOLD+"18",border:`1px solid ${GOLD}44`,color:GOLD }}>Load Session</button>
          </div>
        </div>
      </div>
    </div>
  );
}
function NewPatientModal({ open, onConfirm, onCancel }) {
  if(!open) return null;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#141414",border:`1px solid ${BORDER}`,borderRadius:16,width:"100%",maxWidth:400,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.8)" }}>
        <div style={{ height:3,background:`linear-gradient(90deg,${RED_BAD},${RED_BAD}88,transparent)` }}/>
        <div style={{ padding:"28px 28px 24px" }}>
          <div style={{ fontSize:14,fontWeight:800,color:WHITE,marginBottom:8 }}>Start New Patient?</div>
          <div style={{ fontSize:12,color:"#888",lineHeight:1.6,marginBottom:24 }}>All current form data will be cleared. Make sure you have saved the current session as a PDF first.</div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={onCancel} style={{ flex:1,padding:"12px",borderRadius:10,fontSize:12,fontWeight:800,cursor:"pointer",background:"transparent",border:`1px solid ${BORDER}`,color:MUTED }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:1,padding:"12px",borderRadius:10,fontSize:12,fontWeight:800,cursor:"pointer",background:RED_BAD+"18",border:`1px solid ${RED_BAD}44`,color:RED_BAD }}>Clear &amp; Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SOAP NOTE BUILDER ────────────────────────────────────────────────────────
function buildNote(d) {
  const inv = d.patient.involvedSide, invR = inv==="Right", uninv = invR?"Left":"Right";
  const dyn = d.dynamo||{};
  const IND="   "; const IND2="      ";
  const lines=[]; const add=l=>lines.push(l); const br=()=>lines.push("");
  const sub=l=>lines.push(IND+l); const sub2=l=>lines.push(IND2+l);
  const subIf=(c,l)=>{ if(c) sub(l); }; const sub2If=(c,l)=>{ if(c) sub2(l); };

  add("HIP TESTING & OUTCOME MEASURES"); add(`Date: ${d.patient.date||"[date]"}`);
  add(`Patient: [de-identified]  |  Involved Side: ${inv}  |  ${d.patient.weeksPostOp?`${d.patient.weeksPostOp} Weeks Post-Op`:""}${d.patient.diagnosis?`  |  Dx: ${d.patient.diagnosis}`:""}`);
  br();

  // ROM
  const romFields = [["hipFlexR","hipFlexL","Hip Flexion","deg"],["hipExtR","hipExtL","Hip Extension","deg"],["hipAbdR","hipAbdL","Hip Abduction","deg"],["hipAddR","hipAddL","Hip Adduction","deg"],["hipIRR","hipIRL","Hip Internal Rotation","deg"],["hipERR","hipERL","Hip External Rotation","deg"]];
  const hasROM = romFields.some(([r,l])=>hasVal(d[r])||hasVal(d[l]));
  if(hasROM) {
    add("HIP RANGE OF MOTION:");
    romFields.forEach(([rKey,lKey,name,unit])=>{
      if(!hasVal(d[rKey])&&!hasVal(d[lKey])) return;
      const rVal=d[rKey], lVal=d[lKey];
      const invVal=invR?rVal:lVal, uninvVal=invR?lVal:rVal;
      let line=`  * ${name}: R ${rVal||"-"} ${unit} / L ${lVal||"-"} ${unit}`;
      if(hasVal(invVal)&&hasVal(uninvVal)) {
        const diff=Math.abs(toNum(invVal)-toNum(uninvVal)).toFixed(0);
        const defSide=toNum(invVal)<toNum(uninvVal)?`${inv} deficit`:"Equal or inv dominant";
        line+=`  [Side diff: ${diff} ${unit} - ${defSide}]`;
      }
      add(line);
    });
    br();
  }

  // Dynamo
  const dynMoves=[
    ["abdPFR","abdPFL","abdTPFR","abdTPFL","Hip Abduction"],
    ["addPFR","addPFL","addTPFR","addTPFL","Hip Adduction"],
    ["erPFR","erPFL","erTPFR","erTPFL","Hip External Rotation"],
    ["irPFR","irPFL","irTPFR","irTPFL","Hip Internal Rotation"],
  ];
  const hasDyn = dynMoves.some(([r,l])=>hasVal(dyn[r])||hasVal(dyn[l]));
  if(hasDyn) {
    add("ISOMETRIC HIP STRENGTH (VALD Dynamo - N):");
    const lsiVals=[];
    dynMoves.forEach(([pfR,pfL,tpfR,tpfL,name])=>{
      if(!hasVal(dyn[pfR])&&!hasVal(dyn[pfL])) return;
      const lsi=invR?calcLSI(dyn[pfR],dyn[pfL]):calcLSI(dyn[pfL],dyn[pfR]);
      const tpfAsym=calcAsym(dyn[tpfR],dyn[tpfL]);
      if(lsi) lsiVals.push(parseFloat(lsi));
      sub(`${name}: L ${dyn[pfL]||"-"} N / R ${dyn[pfR]||"-"} N`);
      if(lsi) sub2(`LSI ${lsi}%${parseFloat(lsi)>=90?" [PASS]":" [FAIL]"}`);
      if(hasVal(dyn[tpfR])&&hasVal(dyn[tpfL])) {
        sub(`TPF: L ${dyn[tpfL]||"-"} ms / R ${dyn[tpfR]||"-"} ms`);
        if(tpfAsym) sub2(`TPF Asym: ${tpfAsym}%${parseFloat(tpfAsym)<=10?" [PASS]":" [FAIL]"}`);
      }
    });
    if(lsiVals.length>0) {
      const avg=(lsiVals.reduce((a,b)=>a+b,0)/lsiVals.length).toFixed(1);
      add(`  * Average Dynamo LSI: ${avg}%  ${parseFloat(avg)>=90?"[PASS] Meets >90% threshold":"[FAIL] Below 90% threshold"}`);
    }
    sub("Benchmark: LSI >=90% and TPF asymmetry <10% for all tested movements; Average LSI >90%.");
    br();
  }

  // IMTP
  const imt=d.imtp||{};
  if(hasVal(imt.pfR)||hasVal(imt.pfL)) {
    add("ISOMETRIC MID-THIGH PULL (VALD ForceDecks - N):");
    const pfAsym=calcAsym(imt.pfR,imt.pfL);
    const tpfAsym=calcAsym(imt.tpfR,imt.tpfL);
    sub(`Peak Force: R ${imt.pfR||"-"} N / L ${imt.pfL||"-"} N`);
    sub2If(pfAsym!==null,`Force Asymmetry: ${pfAsym}%${parseFloat(pfAsym)<=10?" [PASS] Within 10% threshold":parseFloat(pfAsym)<=15?" [BORDERLINE]":" [FAIL] Exceeds threshold"}`);
    if(hasVal(imt.tpfR)||hasVal(imt.tpfL)) {
      sub(`Time to Peak Force: R ${imt.tpfR||"-"} ms / L ${imt.tpfL||"-"} ms`);
      sub2If(tpfAsym!==null,`TPF Asymmetry: ${tpfAsym}%${parseFloat(tpfAsym)<=10?" [PASS] Within 10% threshold":" [FAIL] Exceeds threshold"}`);
    }
    br();
  }

  // CMJ
  const cmj=d.cmj||{};
  if(hasVal(cmj.jumpHeight)||hasVal(cmj.eccAsym)||hasVal(cmj.concAsym)||hasVal(cmj.cov)) {
    add("COUNTERMOVEMENT JUMP (VALD ForceDecks):");
    subIf(hasVal(cmj.jumpHeight),`Jump Height: ${cmj.jumpHeight} cm`);
    if(hasVal(cmj.eccAsym)) sub(`Max Eccentric Braking Impulse Asymmetry: ${cmj.eccAsym}%${parseFloat(cmj.eccAsym)<=10?" [PASS]":" [FAIL]"}`);
    if(hasVal(cmj.concAsym)) sub(`Max Concentric Impulse Asymmetry: ${cmj.concAsym}%${parseFloat(cmj.concAsym)<=10?" [PASS]":" [FAIL]"}`);
    if(hasVal(cmj.cov)) sub(`Coefficient of Variation (CoV): ${cmj.cov}%${parseFloat(cmj.cov)<=10?" [PASS]":" [FAIL]"}`);
    subIf(hasVal(cmj.modRSI),`Modified RSI: ${cmj.modRSI}`);
    sub("Benchmark: Ecc impulse asym <10%, Conc impulse asym <10%, CoV <10%.");
    br();
  }

  // SLLAH
  const slh=d.slLandHold||{};
  if(hasVal(slh.rPeakForce)||hasVal(slh.lPeakForce)||hasVal(slh.rTTS)||hasVal(slh.lTTS)) {
    add("SINGLE LEG LAND AND HOLD (VALD ForceDecks):");
    if(hasVal(slh.rPeakForce)||hasVal(slh.lPeakForce)) {
      sub(`Peak Landing Force: R ${slh.rPeakForce||"-"} N / L ${slh.lPeakForce||"-"} N`);
      if(hasVal(slh.rPeakForce)&&hasVal(slh.lPeakForce)) {
        const fa=calcAsym(slh.rPeakForce,slh.lPeakForce);
        sub2If(fa!==null,`Force Asymmetry: ${fa}%${parseFloat(fa)<=10?" [PASS] Within threshold":parseFloat(fa)<=15?" [BORDERLINE]":" [FAIL] Exceeds threshold"}`);
      }
    }
    if(hasVal(slh.rTTS)||hasVal(slh.lTTS)) {
      sub(`Time to Stabilization: R ${slh.rTTS||"-"} s / L ${slh.lTTS||"-"} s`);
      if(hasVal(slh.rTTS)&&hasVal(slh.lTTS)) {
        const ta=calcAsym(slh.rTTS,slh.lTTS);
        sub2If(ta!==null,`TTS Asymmetry: ${ta}%${parseFloat(ta)<=10?" [PASS] Within threshold":parseFloat(ta)<=15?" [BORDERLINE]":" [FAIL] Exceeds threshold"}`);
      }
    }
    br();
  }

  // Hops
  const hopAvgs={ singleI:hopAvgIn(d.hops.singleI),singleU:hopAvgIn(d.hops.singleU),tripleI:hopAvgIn(d.hops.tripleI),tripleU:hopAvgIn(d.hops.tripleU),crossI:hopAvgIn(d.hops.crossI),crossU:hopAvgIn(d.hops.crossU) };
  const hopLSIs={ single:calcLSI(hopAvgs.singleI,hopAvgs.singleU),triple:calcLSI(hopAvgs.tripleI,hopAvgs.tripleU),cross:calcLSI(hopAvgs.crossI,hopAvgs.crossU),timed:calcTimedLSI(hopAvgTimed(d.hops.timedI),hopAvgTimed(d.hops.timedU)) };
  const hopTests=[["Single Hop for Distance",hopAvgs.singleI,hopAvgs.singleU,hopLSIs.single,"in"],["Triple Hop for Distance",hopAvgs.tripleI,hopAvgs.tripleU,hopLSIs.triple,"in"],["Crossover Hop for Distance",hopAvgs.crossI,hopAvgs.crossU,hopLSIs.cross,"in"],["6-Meter Timed Hop",hopAvgTimed(d.hops.timedI),hopAvgTimed(d.hops.timedU),hopLSIs.timed,"sec"]].filter(([,i,u])=>hasVal(i)||hasVal(u));
  if(hopTests.length>0) {
    add("HOP TESTING:");
    hopTests.forEach(([name,i,u,lsiVal,unit])=>{
      sub(`${name}:`);
      if(hasVal(i)) sub2(`${inv} (Involved): ${i} ${unit}`);
      if(hasVal(u)) sub2(`${uninv} (Uninvolved): ${u} ${unit}`);
      if(lsiVal!==null) sub2(`LSI: ${lsiVal}%${parseFloat(lsiVal)>=90?" [PASS]":" [FAIL]"}`);
    });
    sub("Benchmark: LSI >=90% meets criteria. 80-89% borderline. <80% does not meet criteria.");
    br();
  }

  if(hasVal(d.agilityTime)) {
    add("AGILITY TESTING:"); sub(`Pro Agility Test (5-10-5) - Best Time: ${d.agilityTime} sec`); br();
  }

  const hasProa = hasVal(d.iHOT)||hasVal(d.hosSport)||hasVal(d.tampa);
  if(hasProa) {
    add("PATIENT-REPORTED OUTCOMES:");
    if(hasVal(d.iHOT)) sub(`iHOT-33: ${d.iHOT}/100${parseFloat(d.iHOT)>=70?" [PASS] Acceptable function (>=70)":parseFloat(d.iHOT)>=50?" [MODERATE] Moderate dysfunction":" [FAIL] Significant dysfunction (<50)"}`);
    if(hasVal(d.hosSport)) sub(`HOS-Sport: ${d.hosSport}%${parseFloat(d.hosSport)>=74?" [PASS] Meets RTS threshold (>=74%)":parseFloat(d.hosSport)>=60?" [APPROACHING] Approaching threshold":" [FAIL] Below threshold"}`);
    if(hasVal(d.tampa)) sub(`Tampa Scale of Kinesiophobia (TSK-11): ${d.tampa}${parseFloat(d.tampa)<=17?" [PASS] Acceptable fear levels (<=17)":parseFloat(d.tampa)<=22?" [MILD] Mild kinesiophobia":" [ELEVATED] Elevated kinesiophobia (>22)"}`);
  }

  return lines.join("\n").trim();
}

// ─── LETTER BUILDER ───────────────────────────────────────────────────────────
function buildLetter(d, ptName, therapistName, clinic, impression) {
  const inv=d.patient.involvedSide, invR=inv==="Right", uninv=invR?"Left":"Right";
  const today=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const pt=ptName||"[Patient Name]", surg=d.patient.surgeon||"[Surgeon Name]";
  const ther=therapistName||"[Therapist Name, Credentials]", cl=clinic||"Train Recover Move";
  const wks=d.patient.weeksPostOp?`${d.patient.weeksPostOp} weeks`:"[X] weeks";
  const dx=d.patient.diagnosis||"hip pathology";
  const dyn=d.dynamo||{};
  const lines=[]; const add=l=>lines.push(l); const br=()=>lines.push("");

  add(cl); add(today); br();
  add(`Dr. ${surg}`); br();
  add(`Re: ${pt} - Hip Rehabilitation Progress Update`); br();
  add(`Dear Dr. ${surg},`); br();
  add(`I am writing to share a progress update on ${pt}, who is currently ${wks} post-op from ${dx} and has been receiving physical therapy here at ${cl}. We recently completed a formal return-to-sport testing battery and wanted to share key findings.`);
  br();

  const dynMoves=[["abdPFR","abdPFL","Hip Abduction"],["addPFR","addPFL","Hip Adduction"],["erPFR","erPFL","Hip External Rotation"],["irPFR","irPFL","Hip Internal Rotation"]];
  const dynResults=dynMoves.map(([r,l,name])=>{
    const lsi=invR?calcLSI(dyn[r],dyn[l]):calcLSI(dyn[l],dyn[r]);
    return lsi?{name,lsi}:null;
  }).filter(Boolean);
  if(dynResults.length>0) {
    add("HIP STRENGTH (VALD Dynamo)");
    const lsiVals=dynResults.map(x=>parseFloat(x.lsi));
    const avg=(lsiVals.reduce((a,b)=>a+b,0)/lsiVals.length).toFixed(1);
    const allMet=lsiVals.every(v=>v>=90), noneMet=lsiVals.every(v=>v<80);
    let sLine=`Isometric hip strength testing revealed the following LSI values: ${dynResults.map(x=>`${x.name} ${x.lsi}%`).join(", ")}. Average Dynamo LSI: ${avg}%. `;
    if(allMet) sLine+="All values meet the 90% LSI return-to-sport threshold.";
    else if(noneMet) sLine+="All values fall below the 80% threshold, indicating meaningful strength deficits.";
    else sLine+="Performance is mixed relative to the 90% LSI benchmark.";
    add(sLine); br();
  }

  const imt=d.imtp||{};
  const pfAsym=calcAsym(imt.pfR,imt.pfL);
  if(pfAsym!==null) {
    add("FORCE PLATE - ISOMETRIC MID-THIGH PULL");
    const met=parseFloat(pfAsym)<=10;
    add(`Peak force asymmetry on the isometric mid-thigh pull was ${pfAsym}%${met?", meeting the <10% threshold":", which exceeds the <10% threshold for return-to-sport consideration"}.`); br();
  }

  const cmj=d.cmj||{};
  if(hasVal(cmj.eccAsym)||hasVal(cmj.concAsym)) {
    add("FORCE PLATE - COUNTERMOVEMENT JUMP");
    let cLine=`Countermovement jump testing revealed `;
    if(hasVal(cmj.eccAsym)) cLine+=`eccentric braking impulse asymmetry of ${cmj.eccAsym}% (threshold <10%)`;
    if(hasVal(cmj.concAsym)) cLine+=`${hasVal(cmj.eccAsym)?" and ":""}concentric impulse asymmetry of ${cmj.concAsym}% (threshold <10%)`;
    if(hasVal(cmj.cov)) cLine+=`, with a CoV of ${cmj.cov}%`;
    add(cLine+"."); br();
  }

  const hAvgs={ singleI:hopAvgIn(d.hops.singleI),singleU:hopAvgIn(d.hops.singleU),tripleI:hopAvgIn(d.hops.tripleI),tripleU:hopAvgIn(d.hops.tripleU),crossI:hopAvgIn(d.hops.crossI),crossU:hopAvgIn(d.hops.crossU) };
  const hLSIs={ single:calcLSI(hAvgs.singleI,hAvgs.singleU),triple:calcLSI(hAvgs.tripleI,hAvgs.tripleU),cross:calcLSI(hAvgs.crossI,hAvgs.crossU),timed:calcTimedLSI(hopAvgTimed(d.hops.timedI),hopAvgTimed(d.hops.timedU)) };
  const hopEntries=[["Single Hop",hLSIs.single],["Triple Hop",hLSIs.triple],["Crossover Hop",hLSIs.cross],["6-Meter Timed Hop",hLSIs.timed]].filter(([,v])=>v!==null);
  if(hopEntries.length>0) {
    add("HOP TESTING");
    const str=hopEntries.map(([n,v])=>`${n} LSI ${v}%`).join(", ");
    const allMet=hopEntries.every(([,v])=>parseFloat(v)>=90);
    let h=`${pt} completed hop testing: ${str}. `;
    h+=allMet?"All values meet the 90% LSI benchmark.":"Performance is mixed relative to the 90% LSI benchmark.";
    add(h); br();
  }

  if(hasVal(d.agilityTime)) { add("AGILITY"); add(`Pro Agility Test best time: ${d.agilityTime} seconds.`); br(); }

  add("CLINICAL IMPRESSION");
  add(impression&&impression.trim()?impression.trim():"[Please enter your clinical impression above before sending this letter.]");
  br();
  add("Please feel free to contact me with any questions. We appreciate your collaboration in this patient's care.");
  br(); add("Sincerely,"); br(); add(ther); add(cl);
  return lines.join("\n");
}

// ─── TAB 1: TESTING ───────────────────────────────────────────────────────────
function Tab1({ data:d, setData:setD }) {
  const sd=(k,v)=>setD(p=>({...p,[k]:v}));
  const setP=(k,v)=>sd("patient",{...d.patient,[k]:v});
  const setDyn=(k,v)=>sd("dynamo",{...d.dynamo,[k]:v});
  const setIMTP=(k,v)=>sd("imtp",{...d.imtp,[k]:v});
  const setCMJ=(k,v)=>sd("cmj",{...d.cmj,[k]:v});
  const setSLH=(k,v)=>sd("slLandHold",{...d.slLandHold,[k]:v});
  const inv=d.patient.involvedSide, invR=inv==="Right", uninv=invR?"Left":"Right";
  const [activeCard,setActiveCard]=useState("patient");
  const [noteCopied,setNoteCopied]=useState(false);
  const dyn=d.dynamo||{};
  const imt=d.imtp||{};
  const cmj=d.cmj||{};
  const slh=d.slLandHold||{};

  const dynLSIs={
    abd: invR?calcLSI(dyn.abdPFR,dyn.abdPFL):calcLSI(dyn.abdPFL,dyn.abdPFR),
    add: invR?calcLSI(dyn.addPFR,dyn.addPFL):calcLSI(dyn.addPFL,dyn.addPFR),
    er:  invR?calcLSI(dyn.erPFR, dyn.erPFL) :calcLSI(dyn.erPFL, dyn.erPFR),
    ir:  invR?calcLSI(dyn.irPFR, dyn.irPFL) :calcLSI(dyn.irPFL, dyn.irPFR),
  };
  const dynTPFAsyms={
    abd:calcAsym(dyn.abdTPFR,dyn.abdTPFL), add:calcAsym(dyn.addTPFR,dyn.addTPFL),
    er:calcAsym(dyn.erTPFR,dyn.erTPFL), ir:calcAsym(dyn.irTPFR,dyn.irTPFL),
  };
  const allDynLSIs=[dynLSIs.abd,dynLSIs.add,dynLSIs.er,dynLSIs.ir].filter(v=>v!==null).map(parseFloat);
  const dynamoAvgLSI=allDynLSIs.length>0?(allDynLSIs.reduce((a,b)=>a+b,0)/allDynLSIs.length).toFixed(1):null;

  const imtpPFAsym=calcAsym(imt.pfR,imt.pfL);
  const imtpTPFAsym=calcAsym(imt.tpfR,imt.tpfL);

  const slForceAsym=calcAsym(slh.rPeakForce,slh.lPeakForce);
  const slTTSAsym=calcAsym(slh.rTTS,slh.lTTS);

  const hopAvgs={
    singleI:hopAvgIn(d.hops.singleI),singleU:hopAvgIn(d.hops.singleU),
    tripleI:hopAvgIn(d.hops.tripleI),tripleU:hopAvgIn(d.hops.tripleU),
    crossI:hopAvgIn(d.hops.crossI), crossU:hopAvgIn(d.hops.crossU),
  };
  const hopLSIs={
    single:calcLSI(hopAvgs.singleI,hopAvgs.singleU), triple:calcLSI(hopAvgs.tripleI,hopAvgs.tripleU),
    cross:calcLSI(hopAvgs.crossI,hopAvgs.crossU), timed:calcTimedLSI(hopAvgTimed(d.hops.timedI),hopAvgTimed(d.hops.timedU)),
  };

  const agilityNorms={
    "Male Elite":{mean:4.22,sd:0.15},"Female Elite":{mean:4.73,sd:0.18},
    "Male Collegiate":{mean:4.38,sd:0.20},"Female Collegiate":{mean:4.92,sd:0.22},
    "Male HS":{mean:4.55,sd:0.25},"Female HS":{mean:5.10,sd:0.28},
    "Male General":{mean:4.80,sd:0.30},"Female General":{mean:5.40,sd:0.35},
  };
  const [normGroup,setNormGroup]=useState(d.patient.sex==="Female"?"Female Collegiate":"Male Collegiate");
  const handleSexChange=s=>{ setP("sex",s); const lvl=normGroup.replace("Male ","").replace("Female ",""); setNormGroup(`${s} ${lvl}`); };
  const norm=agilityNorms[normGroup];
  const agClass=()=>{ if(!hasVal(d.agilityTime)||!norm) return null; const z=(toNum(d.agilityTime)-norm.mean)/norm.sd; if(z<=-2) return{label:"Elite",color:LIME}; if(z<=-1) return{label:"Above Avg",color:LIME}; if(z<=1) return{label:"Average",color:GOLD}; return{label:"Below Avg",color:RED_BAD}; };

  const generateNote=()=>{ const n=buildNote(d); setD(p=>({...p,noteText:n})); };
  const copyNote=()=>{ navigator.clipboard?.writeText(d.noteText).then(()=>{ setNoteCopied(true); setTimeout(()=>setNoteCopied(false),2500); }); };

  const DynamoSection=({label,pfR,pfL,tpfR,tpfL,lsi,tpfAsym,pfRKey,pfLKey,tpfRKey,tpfLKey})=>(
    <div style={{ marginBottom:14,background:"#111",borderRadius:10,border:`1px solid ${BORDER}`,padding:"12px 14px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
        <span style={{ fontSize:12,fontWeight:800,color:WHITE }}>{label}</span>
        <div style={{ display:"flex",gap:20,alignItems:"center" }}>
          {lsi&&<div style={{ textAlign:"center" }}><div style={{ fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em" }}>PF LSI</div><div style={{ fontSize:18,fontWeight:900,fontFamily:"monospace",color:lsiColor(lsi) }}>{lsi}%</div></div>}
          {tpfAsym&&<div style={{ textAlign:"center" }}><div style={{ fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em" }}>TPF Asym</div><div style={{ fontSize:18,fontWeight:900,fontFamily:"monospace",color:asymColor(tpfAsym) }}>{tpfAsym}%</div></div>}
        </div>
      </div>
      <R4 mb={8}>
        <div><label style={lbl}>Left PF (N)</label><input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={pfL} onChange={e=>setDyn(pfLKey,e.target.value)}/></div>
        <div><label style={lbl}>Right PF (N)</label><input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={pfR} onChange={e=>setDyn(pfRKey,e.target.value)}/></div>
        <div><label style={lbl}>Left TPF (ms)</label><input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={tpfL} onChange={e=>setDyn(tpfLKey,e.target.value)}/></div>
        <div><label style={lbl}>Right TPF (ms)</label><input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={tpfR} onChange={e=>setDyn(tpfRKey,e.target.value)}/></div>
      </R4>
      {(lsi||tpfAsym)&&<div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
        {lsi&&<Badge pass={parseFloat(lsi)>=90} label={`PF LSI ${parseFloat(lsi)>=90?"meets >=90%":"below 90%"}`}/>}
        {tpfAsym&&<Badge pass={parseFloat(tpfAsym)<=10} label={`TPF Asym ${parseFloat(tpfAsym)<=10?"<10%":">10%"}`}/>}
      </div>}
    </div>
  );

  return (
    <div>
      <Card title="Patient Information" id="patient" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <R3 mb={12}>
          <Field label="Date" value={d.patient.date} onChange={v=>setP("date",v)} type="text" placeholder="MM/DD/YYYY"/>
          <Field label="Surgeon" value={d.patient.surgeon} onChange={v=>setP("surgeon",v)} type="text" placeholder="Dr. Name"/>
          <Field label="Weeks Post-Op" value={d.patient.weeksPostOp} onChange={v=>setP("weeksPostOp",v)} placeholder="e.g. 24"/>
        </R3>
        <R2 mb={12}>
          <Field label="Diagnosis / Procedure" value={d.patient.diagnosis} onChange={v=>setP("diagnosis",v)} type="text" placeholder="e.g. Hip Arthroscopy - Labral Repair"/>
          <Field label="Body Weight" unit="lbs" value={d.bw} onChange={v=>sd("bw",v)} fieldKey="bw" placeholder="e.g. 175"/>
        </R2>
        <div style={{ display:"flex",alignItems:"center",gap:20,flexWrap:"wrap" }}>
          <div>
            <div style={lbl}>Sex</div>
            <div style={{ display:"flex",gap:8 }}>
              {["Male","Female"].map(s=><button key={s} onClick={()=>handleSexChange(s)} style={{ padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:800,cursor:"pointer",background:d.patient.sex===s?LIME:"transparent",border:`2px solid ${d.patient.sex===s?LIME:BORDER}`,color:d.patient.sex===s?BLACK:MUTED }}>{s}</button>)}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Hip Range of Motion" id="rom" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize:11,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          Enter bilateral measurements in degrees. Flag: side-to-side difference &gt;10° or value &gt;15% below normative range.
        </div>
        {[
          ["Hip Flexion","hipFlexR","hipFlexL","hipFlex",120],
          ["Hip Extension","hipExtR","hipExtL","hipExt",20],
          ["Hip Abduction","hipAbdR","hipAbdL","hipAbd",45],
          ["Hip Adduction","hipAddR","hipAddL","hipAdd",30],
          ["Hip Internal Rotation","hipIRR","hipIRL","hipIR",40],
          ["Hip External Rotation","hipERR","hipERL","hipER",45],
        ].map(([name,rKey,lKey,rangeKey,norm])=>{
          const rVal=d[rKey], lVal=d[lKey];
          const diff=hasVal(rVal)&&hasVal(lVal)?Math.abs(toNum(rVal)-toNum(lVal)).toFixed(0):null;
          const invVal=invR?rVal:lVal, uninvVal=invR?lVal:rVal;
          const deficit=hasVal(invVal)&&hasVal(uninvVal)&&toNum(invVal)<toNum(uninvVal);
          return (
            <div key={name} style={{ marginBottom:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                <span style={{ fontSize:12,fontWeight:700,color:WHITE }}>{name}</span>
                {diff!==null&&<span style={{ fontSize:11,fontWeight:800,color:parseFloat(diff)>10?GOLD:LIME }}>{diff}° side-to-side</span>}
              </div>
              <R2 mb={0} persist>
                <div>
                  <label style={lbl}>Left (°)</label>
                  <input style={isOOR(rangeKey,lVal)?inpInvalid:inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={lVal} onChange={e=>sd(lKey,e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Right (°)</label>
                  <input style={isOOR(rangeKey,rVal)?inpInvalid:inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={rVal} onChange={e=>sd(rKey,e.target.value)}/>
                </div>
              </R2>
              {deficit&&<div style={{ marginTop:4,fontSize:11,fontWeight:700,color:GOLD }}>⚠ {inv} side deficit detected</div>}
            </div>
          );
        })}
        <div style={{ marginTop:8,padding:"8px 14px",background:"#0f0f0f",borderRadius:6,border:`1px solid ${BORDER}`,display:"flex",gap:20,flexWrap:"wrap" }}>
          {[["<=10° Difference — Symmetric",LIME],["Involved Side Deficit",GOLD],["Value Out of Range",RED_BAD]].map(([l,c])=>(
            <span key={l} style={{ fontSize:11,fontWeight:700,color:c }}>■ {l}</span>
          ))}
        </div>
      </Card>

      <Card title="Isometric Hip Strength — VALD Dynamo" id="dynamo" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize:11,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          Enter peak force (N) and time to peak force (ms) per side. LSI = involved/uninvolved x 100. Pass: LSI &gt;=90%, TPF asymmetry &lt;10%, Average LSI &gt;90%.
        </div>
        {DynamoSection({label:"Hip Abduction", pfR:dyn.abdPFR, pfL:dyn.abdPFL, tpfR:dyn.abdTPFR, tpfL:dyn.abdTPFL, lsi:dynLSIs.abd, tpfAsym:dynTPFAsyms.abd, pfRKey:"abdPFR", pfLKey:"abdPFL", tpfRKey:"abdTPFR", tpfLKey:"abdTPFL"})}
        {DynamoSection({label:"Hip Adduction", pfR:dyn.addPFR, pfL:dyn.addPFL, tpfR:dyn.addTPFR, tpfL:dyn.addTPFL, lsi:dynLSIs.add, tpfAsym:dynTPFAsyms.add, pfRKey:"addPFR", pfLKey:"addPFL", tpfRKey:"addTPFR", tpfLKey:"addTPFL"})}
        {DynamoSection({label:"Hip External Rotation", pfR:dyn.erPFR, pfL:dyn.erPFL, tpfR:dyn.erTPFR, tpfL:dyn.erTPFL, lsi:dynLSIs.er, tpfAsym:dynTPFAsyms.er, pfRKey:"erPFR", pfLKey:"erPFL", tpfRKey:"erTPFR", tpfLKey:"erTPFL"})}
        {DynamoSection({label:"Hip Internal Rotation", pfR:dyn.irPFR, pfL:dyn.irPFL, tpfR:dyn.irTPFR, tpfL:dyn.irTPFL, lsi:dynLSIs.ir, tpfAsym:dynTPFAsyms.ir, pfRKey:"irPFR", pfLKey:"irPFL", tpfRKey:"irTPFR", tpfLKey:"irTPFL"})}
        {allDynLSIs.length>0&&(
          <StatBar stats={[
            {label:"Abd LSI",value:dynLSIs.abd?dynLSIs.abd+"%":null,color:lsiColor(dynLSIs.abd)},
            {label:"Add LSI",value:dynLSIs.add?dynLSIs.add+"%":null,color:lsiColor(dynLSIs.add)},
            {label:"ER LSI",value:dynLSIs.er?dynLSIs.er+"%":null,color:lsiColor(dynLSIs.er)},
            {label:"IR LSI",value:dynLSIs.ir?dynLSIs.ir+"%":null,color:lsiColor(dynLSIs.ir)},
            {label:"Avg LSI",value:dynamoAvgLSI?dynamoAvgLSI+"%":null,color:dynamoAvgLSI?lsiColor(dynamoAvgLSI):MUTED},
          ].filter(s=>s.value)}/>
        )}
        {dynamoAvgLSI&&(
          <div style={{ marginTop:8,fontSize:12,fontWeight:800,color:parseFloat(dynamoAvgLSI)>=90?LIME:RED_BAD }}>
            {parseFloat(dynamoAvgLSI)>=90?"[PASS]":"[FAIL]"} Average Dynamo LSI: {dynamoAvgLSI}% {parseFloat(dynamoAvgLSI)>=90?"— Meets >90% threshold":"— Does not meet >90% threshold"}
          </div>
        )}
      </Card>

      <Card title="Isometric Mid-Thigh Pull — VALD ForceDecks" id="imtp" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize:11,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          Bilateral IMTP from VALD ForceDecks. Enter peak force (N) and time to peak force (ms) per side. Pass: both asymmetries &lt;10%.
        </div>
        <R2 mb={10}>
          <div>
            <label style={lbl}>Peak Force Left (N)</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={imt.pfL} onChange={e=>setIMTP("pfL",e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>Peak Force Right (N)</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={imt.pfR} onChange={e=>setIMTP("pfR",e.target.value)}/>
          </div>
        </R2>
        <R2 mb={10}>
          <div>
            <label style={lbl}>TPF Left (ms)</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={imt.tpfL} onChange={e=>setIMTP("tpfL",e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>TPF Right (ms)</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={imt.tpfR} onChange={e=>setIMTP("tpfR",e.target.value)}/>
          </div>
        </R2>
        {(imtpPFAsym!==null||imtpTPFAsym!==null)&&(
          <StatBar stats={[
            ...(imtpPFAsym!==null?[{label:"PF Asymmetry",value:imtpPFAsym+"%",color:asymColor(imtpPFAsym)}]:[]),
            ...(imtpTPFAsym!==null?[{label:"TPF Asymmetry",value:imtpTPFAsym+"%",color:asymColor(imtpTPFAsym)}]:[]),
          ]}/>
        )}
        {(imtpPFAsym!==null||imtpTPFAsym!==null)&&(
          <div style={{ marginTop:8,display:"flex",gap:16,flexWrap:"wrap" }}>
            {imtpPFAsym!==null&&<Badge pass={parseFloat(imtpPFAsym)<=10} label={`PF Asym ${parseFloat(imtpPFAsym)<=10?"<10%":">10%"}`}/>}
            {imtpTPFAsym!==null&&<Badge pass={parseFloat(imtpTPFAsym)<=10} label={`TPF Asym ${parseFloat(imtpTPFAsym)<=10?"<10%":">10%"}`}/>}
          </div>
        )}
      </Card>

      <Card title="Countermovement Jump — VALD ForceDecks" id="cmj" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize:11,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          Enter asymmetry values directly from VALD output. Pass: Max eccentric impulse asym &lt;10%, Max concentric impulse asym &lt;10%, CoV &lt;10%.
        </div>
        <R3 mb={10}>
          <div>
            <label style={lbl}>Jump Height (cm)</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={cmj.jumpHeight} onChange={e=>setCMJ("jumpHeight",e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>Mod RSI</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={cmj.modRSI} onChange={e=>setCMJ("modRSI",e.target.value)}/>
          </div>
          <div/>
        </R3>
        <R3 mb={10}>
          <div>
            <label style={lbl}>Ecc Impulse Asym (%)</label>
            <input style={isOOR("cmjAsym",cmj.eccAsym)?inpInvalid:inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={cmj.eccAsym} onChange={e=>setCMJ("eccAsym",e.target.value)}/>
            {hasVal(cmj.eccAsym)&&<div style={{ marginTop:4,fontSize:11,fontWeight:700,color:asymColor(cmj.eccAsym) }}>{parseFloat(cmj.eccAsym)<=10?"[PASS] Meets <10%":"[FAIL] Exceeds 10%"}</div>}
          </div>
          <div>
            <label style={lbl}>Conc Impulse Asym (%)</label>
            <input style={isOOR("cmjAsym",cmj.concAsym)?inpInvalid:inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={cmj.concAsym} onChange={e=>setCMJ("concAsym",e.target.value)}/>
            {hasVal(cmj.concAsym)&&<div style={{ marginTop:4,fontSize:11,fontWeight:700,color:asymColor(cmj.concAsym) }}>{parseFloat(cmj.concAsym)<=10?"[PASS] Meets <10%":"[FAIL] Exceeds 10%"}</div>}
          </div>
          <div>
            <label style={lbl}>CoV (%)</label>
            <input style={isOOR("cmjCov",cmj.cov)?inpInvalid:inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={cmj.cov} onChange={e=>setCMJ("cov",e.target.value)}/>
            {hasVal(cmj.cov)&&<div style={{ marginTop:4,fontSize:11,fontWeight:700,color:asymColor(cmj.cov) }}>{parseFloat(cmj.cov)<=10?"[PASS] CoV <10%":"[FAIL] CoV >10%"}</div>}
          </div>
        </R3>
        {(hasVal(cmj.eccAsym)||hasVal(cmj.concAsym)||hasVal(cmj.cov))&&(
          <div style={{ marginTop:8,padding:"8px 14px",background:"#0f0f0f",borderRadius:6,border:`1px solid ${BORDER}`,display:"flex",gap:20,flexWrap:"wrap" }}>
            {[["<=10% — Meets Criteria",LIME],["10-15% — Borderline",GOLD],[">15% — Does Not Meet",RED_BAD]].map(([l,c])=>(
              <span key={l} style={{ fontSize:11,fontWeight:700,color:c }}>■ {l}</span>
            ))}
          </div>
        )}
      </Card>

      <Card title="Single Leg Land and Hold — VALD ForceDecks" id="sllah" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize:11,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          Drop landing from standardized height, hold 3 seconds. Pass: Time to stabilization asymmetry &lt;10%, Peak landing force asymmetry &lt;10%.
        </div>
        <R2 mb={10}>
          <div>
            <label style={lbl}>Peak Landing Force Left (N)</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={slh.lPeakForce} onChange={e=>setSLH("lPeakForce",e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>Peak Landing Force Right (N)</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={slh.rPeakForce} onChange={e=>setSLH("rPeakForce",e.target.value)}/>
          </div>
        </R2>
        <R2 mb={10}>
          <div>
            <label style={lbl}>Time to Stabilization Left (s)</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={slh.lTTS} onChange={e=>setSLH("lTTS",e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>Time to Stabilization Right (s)</label>
            <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="—" value={slh.rTTS} onChange={e=>setSLH("rTTS",e.target.value)}/>
          </div>
        </R2>
        {(slForceAsym!==null||slTTSAsym!==null)&&(
          <StatBar stats={[
            ...(slForceAsym!==null?[{label:"Force Asym",value:slForceAsym+"%",color:asymColor(slForceAsym)}]:[]),
            ...(slTTSAsym!==null?[{label:"TTS Asym",value:slTTSAsym+"%",color:asymColor(slTTSAsym)}]:[]),
          ]}/>
        )}
        {(slForceAsym!==null||slTTSAsym!==null)&&(
          <div style={{ marginTop:8,display:"flex",gap:16,flexWrap:"wrap" }}>
            {slForceAsym!==null&&<Badge pass={parseFloat(slForceAsym)<=10} label={`Force Asym ${parseFloat(slForceAsym)<=10?"<10%":">10%"}`}/>}
            {slTTSAsym!==null&&<Badge pass={parseFloat(slTTSAsym)<=10} label={`TTS Asym ${parseFloat(slTTSAsym)<=10?"<10%":">10%"}`}/>}
          </div>
        )}
      </Card>

      <Card title="Hop Testing" id="hops" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize:11,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          Enter up to 3 trials per side in feet and inches. Average (inches) used for LSI. Pass: LSI &gt;=90%.
        </div>
        {[
          ["Single Hop","singleI","singleU",hopLSIs.single],
          ["Triple Hop","tripleI","tripleU",hopLSIs.triple],
          ["Crossover Hop","crossI","crossU",hopLSIs.cross],
        ].map(([name,ki,ku,lsiVal])=>{
          const avgI=hopAvgs[ki],avgU=hopAvgs[ku];
          return (
            <div key={name} style={{ marginBottom:18,background:"#111",borderRadius:10,border:`1px solid ${BORDER}`,padding:"14px 16px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                <span style={{ fontSize:13,fontWeight:800,color:WHITE }}>{name}</span>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <span style={{ fontSize:10,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em" }}>LSI</span>
                  <span style={{ fontSize:20,fontWeight:900,fontFamily:"monospace",color:lsiColor(lsiVal) }}>{lsiVal?lsiVal+"%":"—"}</span>
                </div>
              </div>
              <div className="trm-r2" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                {[[`${inv} (Involved)`,ki],[`${uninv} (Uninvolved)`,ku]].map(([sideLabel,key])=>(
                  <div key={key}>
                    <div style={{ fontSize:10,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>{sideLabel}</div>
                    {[0,1,2].map(t=>(
                      <div key={t} style={{ display:"grid",gridTemplateColumns:"24px 1fr 1fr",gap:6,alignItems:"center",marginBottom:5 }}>
                        <span style={{ fontSize:10,color:MUTED,fontWeight:700 }}>T{t+1}</span>
                        <div>
                          <label style={{...lbl,marginBottom:2}}>ft</label>
                          <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="0"
                            value={d.hops[key][t].ft}
                            onChange={e=>{ const trials=d.hops[key].map((tr,i)=>i===t?{...tr,ft:e.target.value}:tr); sd("hops",{...d.hops,[key]:trials}); }}/>
                        </div>
                        <div>
                          <label style={{...lbl,marginBottom:2}}>in</label>
                          <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="0"
                            value={d.hops[key][t].in}
                            onChange={e=>{ const trials=d.hops[key].map((tr,i)=>i===t?{...tr,in:e.target.value}:tr); sd("hops",{...d.hops,[key]:trials}); }}/>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop:6,padding:"6px 10px",background:"#0f0f0f",borderRadius:6,border:`1px solid ${LIME}22`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <span style={{ fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700 }}>Avg</span>
                      <span style={{ fontSize:13,fontFamily:"monospace",fontWeight:800,color:(key===ki?avgI:avgU)?LIME:MUTED }}>
                        {(key===ki?avgI:avgU)?`${key===ki?avgI:avgU} in`:"—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {/* 6m Timed Hop */}
        <div style={{ marginBottom:18,background:"#111",borderRadius:10,border:`1px solid ${BORDER}`,padding:"14px 16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <span style={{ fontSize:13,fontWeight:800,color:WHITE }}>6m Timed Hop</span>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <span style={{ fontSize:10,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em" }}>LSI</span>
              <span style={{ fontSize:20,fontWeight:900,fontFamily:"monospace",color:lsiColor(hopLSIs.timed) }}>{hopLSIs.timed?hopLSIs.timed+"%":"—"}</span>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            {[[`${inv} (Involved)`,"timedI"],[`${uninv} (Uninvolved)`,"timedU"]].map(([sideLabel,key])=>{
              const avg=hopAvgTimed(d.hops[key]);
              return (
                <div key={key}>
                  <div style={{ fontSize:10,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>{sideLabel}</div>
                  {[0,1,2].map(t=>(
                    <div key={t} style={{ display:"grid",gridTemplateColumns:"24px 1fr",gap:6,alignItems:"center",marginBottom:5 }}>
                      <span style={{ fontSize:10,color:MUTED,fontWeight:700 }}>T{t+1}</span>
                      <div>
                        <label style={{...lbl,marginBottom:2}}>sec</label>
                        <input style={inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="0.00"
                          value={d.hops[key][t]}
                          onChange={e=>{ const trials=d.hops[key].map((v,i)=>i===t?e.target.value:v); sd("hops",{...d.hops,[key]:trials}); }}/>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop:6,padding:"6px 10px",background:"#0f0f0f",borderRadius:6,border:`1px solid ${LIME}22`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700 }}>Avg</span>
                    <span style={{ fontSize:13,fontFamily:"monospace",fontWeight:800,color:avg?LIME:MUTED }}>{avg?`${avg} sec`:"—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop:10,padding:"10px 16px",background:"#0f0f0f",borderRadius:8,border:`1px solid ${BORDER}`,display:"flex",gap:20,flexWrap:"wrap" }}>
          {[[">=90% — RTS Met",LIME],["80-89% — Borderline",GOLD],["<80% — Not Met",RED_BAD]].map(([l,c])=>(
            <span key={l} style={{ fontSize:11,fontWeight:700,color:c }}>■ {l}</span>
          ))}
        </div>
      </Card>

      <Card title="Agility Testing" id="agility" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize:11,color:MUTED,marginBottom:14 }}>Sports-specific testing. Example: Pro Agility Test (5-10-5). Record best time. Lower is better.</div>
        <R3>
          <div>
            <label style={lbl}>Best Time (sec)</label>
            <input style={isOOR("agilityTime",d.agilityTime)?inpInvalid:inp} type="text" inputMode="decimal" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="e.g. 4.42" value={d.agilityTime} onChange={e=>sd("agilityTime",e.target.value)}/>
          </div>
          <div style={{ gridColumn:"span 2" }}>
            <label style={lbl}>Comparison Norm Group</label>
            <select style={inp} value={normGroup} onChange={e=>setNormGroup(e.target.value)}>
              {Object.keys(agilityNorms).map(k=><option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </R3>
        {hasVal(d.agilityTime)&&norm&&(
          <StatBar stats={[
            {label:"Patient Time",value:d.agilityTime+" sec",color:WHITE},
            {label:"Norm Mean",value:norm.mean+" sec",color:MUTED},
            {label:"Diff vs Norm",value:(toNum(d.agilityTime)-norm.mean).toFixed(2)+" sec",color:toNum(d.agilityTime)<=norm.mean?LIME:RED_BAD},
            {label:"Classification",value:agClass()?.label,color:agClass()?.color},
          ]}/>
        )}
      </Card>

      <Card title="Patient-Reported Outcomes" id="pro" focusable activeCard={activeCard} setActiveCard={setActiveCard}>
        <div style={{ fontSize:11,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          iHOT-33 &gt;=70 = acceptable function. HOS-Sport &gt;=74% = RTS threshold. TSK-11 &lt;=17 = acceptable fear levels for RTS.
        </div>
        <R3>
          <div>
            <Field label="iHOT-33" unit="/ 100" value={d.iHOT} onChange={v=>sd("iHOT",v)} placeholder="0-100" fieldKey="iHOT"/>
            {hasVal(d.iHOT)&&(
              <div style={{ marginTop:6,display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ fontSize:20,fontWeight:900,fontFamily:"monospace",color:parseFloat(d.iHOT)>=70?LIME:parseFloat(d.iHOT)>=50?GOLD:RED_BAD }}>{d.iHOT}</div>
                <div style={{ fontSize:11,fontWeight:700,color:parseFloat(d.iHOT)>=70?LIME:parseFloat(d.iHOT)>=50?GOLD:RED_BAD }}>
                  {parseFloat(d.iHOT)>=70?"[PASS] Acceptable function":parseFloat(d.iHOT)>=50?"Moderate dysfunction":"Significant dysfunction"}
                </div>
              </div>
            )}
          </div>
          <div>
            <Field label="HOS-Sport" unit="%" value={d.hosSport} onChange={v=>sd("hosSport",v)} placeholder="0-100" fieldKey="hosSport"/>
            {hasVal(d.hosSport)&&(
              <div style={{ marginTop:6,display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ fontSize:20,fontWeight:900,fontFamily:"monospace",color:parseFloat(d.hosSport)>=74?LIME:parseFloat(d.hosSport)>=60?GOLD:RED_BAD }}>{d.hosSport}</div>
                <div style={{ fontSize:11,fontWeight:700,color:parseFloat(d.hosSport)>=74?LIME:parseFloat(d.hosSport)>=60?GOLD:RED_BAD }}>
                  {parseFloat(d.hosSport)>=74?"[PASS] Meets RTS threshold":parseFloat(d.hosSport)>=60?"Approaching threshold":"Below threshold"}
                </div>
              </div>
            )}
          </div>
          <div>
            <Field label="Tampa Scale (TSK-11)" unit="score" value={d.tampa} onChange={v=>sd("tampa",v)} placeholder="11-44" fieldKey="tampa"/>
            {hasVal(d.tampa)&&(
              <div style={{ marginTop:6,display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ fontSize:20,fontWeight:900,fontFamily:"monospace",color:parseFloat(d.tampa)<=17?LIME:parseFloat(d.tampa)<=22?GOLD:RED_BAD }}>{d.tampa}</div>
                <div style={{ fontSize:11,fontWeight:700,color:parseFloat(d.tampa)<=17?LIME:parseFloat(d.tampa)<=22?GOLD:RED_BAD }}>
                  {parseFloat(d.tampa)<=17?"[PASS] Acceptable fear levels":parseFloat(d.tampa)<=22?"Mild kinesiophobia":"Elevated kinesiophobia"}
                </div>
              </div>
            )}
          </div>
        </R3>
      </Card>

      <button onClick={generateNote} style={{ width:"100%",padding:16,borderRadius:12,fontSize:13,fontWeight:900,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",background:`linear-gradient(135deg,${LIME},${LIME_DIM})`,color:BLACK,border:"none",boxShadow:`0 8px 32px ${LIME}44`,marginBottom:20 }}>
        Generate SOAP Note — Objective Section
      </button>
      {d.noteText&&(
        <div style={{ borderRadius:12,overflow:"hidden",border:`1px solid ${LIME}44`,marginBottom:40 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",background:LIME+"14",borderBottom:`1px solid ${LIME}33` }}>
            <span style={{ fontSize:11,fontWeight:800,color:LIME,letterSpacing:"0.15em",textTransform:"uppercase" }}>SOAP Note — Objective Section</span>
            <button onClick={copyNote} style={{ padding:"8px 20px",borderRadius:8,fontSize:11,fontWeight:800,cursor:"pointer",background:noteCopied?"#15803d":LIME,color:BLACK,border:"none" }}>
              {noteCopied?"Copied!":"Copy to Clipboard"}
            </button>
          </div>
          <pre style={{ padding:20,background:"#0a0a0a",color:"#d4faa6",fontSize:12,fontFamily:"monospace",lineHeight:1.8,whiteSpace:"pre-wrap",margin:0,maxHeight:500,overflowY:"auto",WebkitOverflowScrolling:"touch" }}>{d.noteText}</pre>
        </div>
      )}
    </div>
  );
}

// ─── TAB 2: COMPARISON ────────────────────────────────────────────────────────
function computeMetrics(sd) {
  if(!sd) return null;
  const invR=sd.patient?.involvedSide==="Right";
  const dyn=sd.dynamo||{}, imt=sd.imtp||{}, cmj=sd.cmj||{}, slh=sd.slLandHold||{};
  const abdLSI=invR?calcLSI(dyn.abdPFR,dyn.abdPFL):calcLSI(dyn.abdPFL,dyn.abdPFR);
  const addLSI=invR?calcLSI(dyn.addPFR,dyn.addPFL):calcLSI(dyn.addPFL,dyn.addPFR);
  const erLSI=invR?calcLSI(dyn.erPFR,dyn.erPFL):calcLSI(dyn.erPFL,dyn.erPFR);
  const irLSI=invR?calcLSI(dyn.irPFR,dyn.irPFL):calcLSI(dyn.irPFL,dyn.irPFR);
  const lsiVals=[abdLSI,addLSI,erLSI,irLSI].filter(v=>v!==null).map(parseFloat);
  const dynamoAvgLSI=lsiVals.length>0?(lsiVals.reduce((a,b)=>a+b,0)/lsiVals.length).toFixed(1):null;
  const hAvgSI=hopAvgIn(sd.hops?.singleI||[]),hAvgSU=hopAvgIn(sd.hops?.singleU||[]);
  const hAvgTI=hopAvgIn(sd.hops?.tripleI||[]),hAvgTU=hopAvgIn(sd.hops?.tripleU||[]);
  const hAvgCI=hopAvgIn(sd.hops?.crossI||[]),hAvgCU=hopAvgIn(sd.hops?.crossU||[]);
  const hTimI=hopAvgTimed(sd.hops?.timedI||[]),hTimU=hopAvgTimed(sd.hops?.timedU||[]);
  const hipFlexInv=invR?sd.hipFlexR:sd.hipFlexL, hipAbdInv=invR?sd.hipAbdR:sd.hipAbdL;
  const hipIRInv=invR?sd.hipIRR:sd.hipIRL, hipERInv=invR?sd.hipERR:sd.hipERL;
  const imtpPFAsym=calcAsym(imt.pfR,imt.pfL), imtpTPFAsym=calcAsym(imt.tpfR,imt.tpfL);
  const slForceAsym=calcAsym(slh.rPeakForce,slh.lPeakForce), slTTSAsym=calcAsym(slh.rTTS,slh.lTTS);
  return {
    wks:sd.patient?.weeksPostOp||null, date:sd.patient?.date||null,
    hipFlexInv, hipAbdInv, hipIRInv, hipERInv,
    abdLSI, addLSI, erLSI, irLSI, dynamoAvgLSI,
    imtpPFAsym, imtpTPFAsym,
    cmjHeight:cmj.jumpHeight||null, cmjEccAsym:cmj.eccAsym||null, cmjConcAsym:cmj.concAsym||null, cmjCoV:cmj.cov||null,
    slForceAsym, slTTSAsym,
    hopSingle:calcLSI(hAvgSI,hAvgSU), hopTriple:calcLSI(hAvgTI,hAvgTU),
    hopCross:calcLSI(hAvgCI,hAvgCU), hopTimed:calcTimedLSI(hTimI,hTimU),
    agility:sd.agilityTime||null, iHOT:sd.iHOT||null, hosSport:sd.hosSport||null, tampa:sd.tampa||null,
  };
}

function Sparkline({ vals, higher=true }) {
  if(!vals||vals.length<2) return null;
  const nums=vals.map(parseFloat).filter(v=>!isNaN(v));
  if(nums.length<2) return null;
  const mn=Math.min(...nums),mx=Math.max(...nums),range=mx-mn||1;
  const W=50,H=18;
  const pts=nums.map((v,i)=>{ const x=(i/(nums.length-1))*W; const y=H-((v-mn)/range)*H; return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ");
  const last=nums[nums.length-1],first=nums[0];
  const trend=last>first?"up":last<first?"down":"flat";
  const good=(higher&&trend==="up")||(!higher&&trend==="down");
  const color=trend==="flat"?MUTED:good?LIME:RED_BAD;
  const lastPt=pts.split(" ").pop().split(",");
  return (
    <svg width={W} height={H} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}/>
      <circle cx={lastPt[0]} cy={lastPt[1]} r={2.5} fill={color}/>
    </svg>
  );
}

const metricRows=[
  {key:"hipFlexInv",  label:"Hip Flex (Inv)",   group:"rom",    u:"°",    higher:true,  spark:true},
  {key:"hipAbdInv",   label:"Hip Abd (Inv)",    group:"rom",    u:"°",    higher:true,  spark:true},
  {key:"hipIRInv",    label:"Hip IR (Inv)",     group:"rom",    u:"°",    higher:true,  spark:true},
  {key:"hipERInv",    label:"Hip ER (Inv)",     group:"rom",    u:"°",    higher:true,  spark:true},
  {key:"abdLSI",      label:"Abd LSI",          group:"dynamo", u:"%",    higher:true,  spark:true},
  {key:"addLSI",      label:"Add LSI",          group:"dynamo", u:"%",    higher:true,  spark:true},
  {key:"erLSI",       label:"ER LSI",           group:"dynamo", u:"%",    higher:true,  spark:true},
  {key:"irLSI",       label:"IR LSI",           group:"dynamo", u:"%",    higher:true,  spark:true},
  {key:"dynamoAvgLSI",label:"Avg Dynamo LSI",   group:"dynamo", u:"%",    higher:true,  spark:true},
  {key:"imtpPFAsym",  label:"IMTP PF Asym",     group:"fp",     u:"%",    higher:false, spark:true},
  {key:"imtpTPFAsym", label:"IMTP TPF Asym",    group:"fp",     u:"%",    higher:false, spark:true},
  {key:"cmjHeight",   label:"CMJ Height",       group:"fp",     u:" cm",  higher:true,  spark:true},
  {key:"cmjEccAsym",  label:"CMJ Ecc Asym",     group:"fp",     u:"%",    higher:false, spark:true},
  {key:"cmjConcAsym", label:"CMJ Conc Asym",    group:"fp",     u:"%",    higher:false, spark:true},
  {key:"cmjCoV",      label:"CMJ CoV",          group:"fp",     u:"%",    higher:false, spark:true},
  {key:"slForceAsym", label:"SLLAH Force Asym", group:"sllah",  u:"%",    higher:false, spark:true},
  {key:"slTTSAsym",   label:"SLLAH TTS Asym",   group:"sllah",  u:"%",    higher:false, spark:true},
  {key:"hopSingle",   label:"Single Hop LSI",   group:"hops",   u:"%",    higher:true,  spark:true},
  {key:"hopTriple",   label:"Triple Hop LSI",   group:"hops",   u:"%",    higher:true,  spark:true},
  {key:"hopCross",    label:"Cross Hop LSI",    group:"hops",   u:"%",    higher:true,  spark:true},
  {key:"hopTimed",    label:"6m Timed LSI",     group:"hops",   u:"%",    higher:true,  spark:true},
  {key:"agility",     label:"Pro Agility",      group:"agility",u:" s",   higher:false, spark:true},
  {key:"iHOT",        label:"iHOT-33",          group:"pros",   u:"/100", higher:true,  spark:true},
  {key:"hosSport",    label:"HOS-Sport",        group:"pros",   u:"%",    higher:true,  spark:true},
  {key:"tampa",       label:"Tampa (TSK-11)",   group:"pros",   u:"",     higher:false, spark:true},
];
const groups=[
  {key:"rom",    label:"Range of Motion"},
  {key:"dynamo", label:"Dynamo Strength"},
  {key:"fp",     label:"Force Plate (IMTP / CMJ)"},
  {key:"sllah",  label:"SL Land & Hold"},
  {key:"hops",   label:"Hop Testing"},
  {key:"agility",label:"Agility"},
  {key:"pros",   label:"Patient-Reported Outcomes"},
];

function Tab2({ currentData:d, sessions, setSessions, onAddSession }) {
  const currentMetrics=computeMetrics(d);
  const sessionCols=sessions.map((s,i)=>({key:`s${i}`,label:s.label,metrics:computeMetrics(s.data),isCurrent:false}));
  const currentCol={key:"current",label:"Today",metrics:currentMetrics,isCurrent:true};
  const allCols=[...sessionCols,currentCol];
  const hasSessions=sessions.length>0;
  const colW=90,labelW=180;
  const totalW=labelW+(allCols.length*colW)+(hasSessions?60:0);

  const [paragraph,setParagraph]=useState("");
  const [copiedPara,setCopiedPara]=useState(false);

  const delta=(cur,prev,higher)=>{ if(cur==null||prev==null||cur===""||prev==="") return null; const c=parseFloat(cur),p=parseFloat(prev); if(isNaN(c)||isNaN(p)) return null; const diff=(c-p).toFixed(1); const dir=c>p?"up":c<p?"down":"flat"; return{diff,dir}; };
  const deltaColor=dir=>dir==="up"?LIME:dir==="down"?RED_BAD:MUTED;
  const deltaArrow=dir=>dir==="up"?"^":dir==="down"?"v":"-";

  const n=v=>parseFloat(v)||0;
  const changed=(cur,prev)=>{ if(!cur||!prev) return null; const diff=Math.abs(n(cur)-n(prev)).toFixed(1); const dir=n(cur)>n(prev)?"increased":"decreased"; return{diff,dir}; };

  const generateParagraph=()=>{
    const inv=d.patient.involvedSide||"involved"; const invR=inv==="Right"; const uninv=invR?"Left":"Right";
    const cur=currentMetrics; const prev=hasSessions?sessionCols[sessionCols.length-1]?.metrics:null;
    const sentences=[];

    // ── Intro ──
    const wks=d.patient.weeksPostOp;
    const dx=d.patient.diagnosis||"hip pathology";
    let intro=`Patient is`;
    if(wks) intro+=` ${wks} weeks post-op from ${dx}`;
    else intro+=` s/p ${dx}`;
    intro+=`, presenting for formal return-to-sport testing. The following objective findings were recorded`;
    if(prev) intro+=`, with comparison to prior session on ${prev.date||"previous visit"}`;
    sentences.push(intro+".");

    // ── Dynamo strength ──
    const dynKeys=["abdLSI","addLSI","erLSI","irLSI"];
    const dynLabels={abdLSI:"hip abduction",addLSI:"hip adduction",erLSI:"external rotation",irLSI:"internal rotation"};
    const dynResults=dynKeys.map(k=>cur[k]?{key:k,label:dynLabels[k],val:cur[k]}:null).filter(Boolean);
    if(dynResults.length>0){
      const avgLSI=cur.dynamoAvgLSI;
      const allMet=dynResults.every(r=>n(r.val)>=90);
      const noneMet=dynResults.every(r=>n(r.val)<80);
      let s=`Isometric hip strength testing (VALD Dynamo) demonstrates LSI values of: ${dynResults.map(r=>`${r.label} ${r.val}%`).join(", ")}`;
      if(avgLSI) s+=`, with an average LSI of ${avgLSI}%`;
      if(allMet) s+=` — all movements meeting the ≥90% return-to-sport benchmark`;
      else if(noneMet) s+=` — all values below the 80% threshold, indicating meaningful strength deficits`;
      else {
        const failing=dynResults.filter(r=>n(r.val)<90).map(r=>r.label);
        s+=`; ${failing.join(" and ")} remain${failing.length===1?"s":""} below the ≥90% threshold`;
      }
      if(prev&&prev.dynamoAvgLSI&&avgLSI){
        const ch=changed(avgLSI,prev.dynamoAvgLSI);
        if(ch) s+=`; average LSI has ${ch.dir} by ${ch.diff}% since last session`;
      }
      sentences.push(s+".");
    }

    // ── IMTP ──
    if(cur.imtpPFAsym!==null){
      const v=n(cur.imtpPFAsym);
      let s=`Isometric mid-thigh pull peak force asymmetry is ${cur.imtpPFAsym}%`;
      if(v<=10) s+=`, meeting the ≤10% bilateral threshold`;
      else if(v<=15) s+=`, borderline relative to the ≤10% threshold`;
      else s+=`, exceeding the ≤10% threshold — bilateral force production deficit warrants attention`;
      if(prev&&prev.imtpPFAsym!==null){const ch=changed(prev.imtpPFAsym,cur.imtpPFAsym); if(ch) s+=`; asymmetry has ${ch.dir} from ${prev.imtpPFAsym}% at last session`;}
      sentences.push(s+".");
    }

    // ── CMJ ──
    const cmj=d.cmj||{};
    if(hasVal(cmj.eccAsym)||hasVal(cmj.concAsym)){
      const parts=[];
      if(hasVal(cmj.eccAsym)) parts.push(`eccentric braking impulse asymmetry ${cmj.eccAsym}% (${n(cmj.eccAsym)<=10?"within":"exceeds"} ≤10% threshold)`);
      if(hasVal(cmj.concAsym)) parts.push(`concentric impulse asymmetry ${cmj.concAsym}% (${n(cmj.concAsym)<=10?"within":"exceeds"} ≤10% threshold)`);
      if(cmj.jumpHeight) parts.push(`jump height ${cmj.jumpHeight} cm`);
      sentences.push(`Countermovement jump force platform assessment reveals ${parts.join("; ")}.`);
    }

    // ── SLLAH ──
    if(cur.slForceAsym!==null){
      let s=`Single leg land and hold demonstrates peak landing force asymmetry of ${cur.slForceAsym}% (${n(cur.slForceAsym)<=10?"within":"exceeds"} ≤10% threshold)`;
      if(cur.slTTSAsym!==null) s+=` and time-to-stabilization asymmetry of ${cur.slTTSAsym}% (${n(cur.slTTSAsym)<=10?"within":"exceeds"} threshold)`;
      sentences.push(s+".");
    }

    // ── Hops ──
    const hopVals=[
      {name:"single hop",cur:cur.hopSingle,prev:prev?.hopSingle},
      {name:"triple hop",cur:cur.hopTriple,prev:prev?.hopTriple},
      {name:"crossover hop",cur:cur.hopCross,prev:prev?.hopCross},
      {name:"6-meter timed hop",cur:cur.hopTimed,prev:prev?.hopTimed},
    ].filter(h=>h.cur!==null);
    if(hopVals.length>0){
      const met=hopVals.filter(h=>n(h.cur)>=90);
      const notMet=hopVals.filter(h=>n(h.cur)<90);
      const avg=(hopVals.reduce((a,h)=>a+n(h.cur),0)/hopVals.length).toFixed(1);
      let s=`Functional hop testing yields an average LSI of ${avg}% (${hopVals.map(h=>`${h.name}: ${h.cur}%`).join(", ")})`;
      if(met.length===hopVals.length) s+=`, with all tests meeting the ≥90% RTS benchmark`;
      else if(met.length>0) s+=`; the ${met.map(h=>h.name).join(" and ")} meet the ≥90% benchmark while ${notMet.map(h=>h.name).join(" and ")} remain${notMet.length===1?"s":""} below threshold`;
      else s+=`, with no values currently meeting the ≥90% RTS benchmark`;
      const improved=hopVals.filter(h=>h.prev&&n(h.cur)>n(h.prev));
      const regressed=hopVals.filter(h=>h.prev&&n(h.cur)<n(h.prev));
      if(regressed.length>0) s+=`; regression noted in ${regressed.map(h=>`${h.name} (${h.cur}% from ${h.prev}%)`).join(" and ")}`;
      else if(improved.length>0) s+=`; improvement noted in ${improved.map(h=>h.name).join(" and ")} since last session`;
      sentences.push(s+".");
    }

    // ── PROs ──
    const prosParts=[];
    if(hasVal(d.iHOT)){const v=n(d.iHOT); prosParts.push(`iHOT-33 score ${d.iHOT}/100 (${v>=70?"meets ≥70 acceptable function threshold":v>=50?"moderate dysfunction":"significant dysfunction — <50"})`);}
    if(hasVal(d.hosSport)){const v=n(d.hosSport); prosParts.push(`HOS-Sport ${d.hosSport}% (${v>=74?"meets ≥74% RTS threshold":v>=60?"approaching threshold":"below threshold"})`);}
    if(hasVal(d.tampa)){const v=n(d.tampa); prosParts.push(`Tampa Scale of Kinesiophobia ${d.tampa} (${v<=17?"acceptable fear levels for RTS":v<=22?"mild kinesiophobia":"elevated kinesiophobia — psychological readiness intervention warranted"})`);}
    if(prosParts.length>0) sentences.push(`Patient-reported outcomes: ${prosParts.join("; ")}.`);

    // ── Overall trajectory ──
    const indicators=[];
    if(cur.dynamoAvgLSI) indicators.push({met:n(cur.dynamoAvgLSI)>=90,label:"hip strength symmetry"});
    if(hopVals.length>0) indicators.push({met:hopVals.every(h=>n(h.cur)>=90),label:"functional hop testing"});
    if(cur.imtpPFAsym!==null) indicators.push({met:n(cur.imtpPFAsym)<=10,label:"bilateral force production"});
    if(hasVal(d.hosSport)) indicators.push({met:n(d.hosSport)>=74,label:"patient-reported function"});
    if(indicators.length>0){
      const metCount=indicators.filter(r=>r.met).length;
      const notMetLabels=indicators.filter(r=>!r.met).map(r=>r.label);
      let traj="";
      if(metCount===indicators.length) traj="Overall, the patient demonstrates favorable progress across all assessed return-to-sport domains; continued sport-specific loading is appropriate";
      else if(metCount>=indicators.length/2) traj=`Overall trajectory is positive, though ${notMetLabels.join(" and ")} remain${notMetLabels.length===1?"s":""} below RTS threshold — targeted intervention is indicated`;
      else traj=`Patient continues to demonstrate meaningful deficits in ${notMetLabels.join(", ")}; return-to-sport clearance is not yet appropriate and treatment should emphasize resolution of these criteria`;
      sentences.push(traj+".");
    }

    setParagraph(sentences.join(" "));
  };

  const copyPara=()=>{
    navigator.clipboard?.writeText(paragraph)
      .then(()=>{setCopiedPara(true);setTimeout(()=>setCopiedPara(false),2500);})
      .catch(()=>{
        try{
          const ta=document.createElement("textarea"); ta.value=paragraph;
          ta.style.cssText="position:fixed;opacity:0;top:0;left:0";
          document.body.appendChild(ta); ta.focus(); ta.select();
          document.execCommand("copy"); document.body.removeChild(ta);
          setCopiedPara(true); setTimeout(()=>setCopiedPara(false),2500);
        }catch(e2){}
      });
  };

  const getColor=(row,val)=>{ if(val==null||val==="") return WHITE; const n=parseFloat(val); if(isNaN(n)) return WHITE; if(["abdLSI","addLSI","erLSI","irLSI","dynamoAvgLSI","hopSingle","hopTriple","hopCross","hopTimed"].includes(row.key)) return lsiColor(n); if(["imtpPFAsym","imtpTPFAsym","cmjEccAsym","cmjConcAsym","cmjCoV","slForceAsym","slTTSAsym"].includes(row.key)) return asymColor(n); return WHITE; };

  return (
    <div>
      <Card title="Progress Tracking" accent>
        <div style={{ fontSize:12,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          {hasSessions?`Comparing ${sessions.length} previous session${sessions.length>1?"s":""} against today's data.`:"Load previous session PDFs to enable multi-session comparison. Up to 5 sessions supported."}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
          <button onClick={onAddSession} style={{ padding:"8px 16px",borderRadius:8,border:`1px solid ${BORDER}`,background:"#1a1a1a",color:"#aaa",cursor:"pointer",fontSize:11,fontWeight:700 }}>+ Add Session PDF</button>
          {hasSessions&&<button onClick={()=>setSessions([])} style={{ padding:"8px 16px",borderRadius:8,border:`1px solid ${RED_BAD}44`,background:"transparent",color:RED_BAD,cursor:"pointer",fontSize:11,fontWeight:700 }}>Clear All Sessions</button>}
          {sessions.map((s,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:6,background:"#1a1a1a",border:`1px solid ${BORDER}` }}>
              <span style={{ fontSize:10,fontWeight:700,color:"#aaa" }}>{s.label}</span>
              <button onClick={()=>setSessions(prev=>prev.filter((_,idx)=>idx!==i))} style={{ background:"none",border:"none",color:MUTED,cursor:"pointer",fontSize:12,lineHeight:1,padding:0 }}>x</button>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,overflow:"hidden",marginBottom:20 }}>
        <div style={{ padding:"12px 20px",background:"#161616",borderBottom:`1px solid ${BORDER}`,display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:3,height:18,borderRadius:2,background:LIME }}/>
          <span style={{ fontSize:11,fontWeight:800,letterSpacing:"0.18em",color:LIME,textTransform:"uppercase" }}>Session Timeline</span>
          {!hasSessions&&<span style={{ fontSize:11,color:MUTED,marginLeft:8 }}>— Load PDFs to enable comparison</span>}
        </div>
        <div style={{ overflowX:"auto",WebkitOverflowScrolling:"touch" }}>
          <div style={{ minWidth:totalW }}>
            <div style={{ display:"flex",borderBottom:`1px solid ${BORDER}`,background:"#141414" }}>
              <div style={{ width:labelW,flexShrink:0,padding:"10px 16px",fontSize:10,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em" }}>Measure</div>
              {allCols.map((col,ci)=>(
                <div key={col.key} style={{ width:colW,flexShrink:0,padding:"10px 8px",textAlign:"center" }}>
                  <div style={{ fontSize:10,fontWeight:900,color:col.isCurrent?LIME:"#888",letterSpacing:"0.06em",marginBottom:2 }}>{col.isCurrent?"TODAY":`Visit ${ci+1}`}</div>
                  <div style={{ fontSize:9,color:col.isCurrent?LIME+"88":MUTED,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{col.metrics?.wks?`Wk ${col.metrics.wks}`:col.label}</div>
                </div>
              ))}
              {hasSessions&&<div style={{ width:60,flexShrink:0,padding:"10px 8px",fontSize:10,fontWeight:800,color:MUTED,textAlign:"center",textTransform:"uppercase" }}>Trend</div>}
            </div>
            {groups.map(grp=>{
              const grpRows=metricRows.filter(r=>r.group===grp.key);
              const hasAny=grpRows.some(r=>allCols.some(c=>c.metrics?.[r.key]!=null&&c.metrics?.[r.key]!==""));
              if(!hasAny) return null;
              return (
                <div key={grp.key}>
                  <div style={{ padding:"6px 16px",background:"#111",borderTop:`1px solid ${BORDER}`,borderBottom:`1px solid ${BORDER}22` }}>
                    <span style={{ fontSize:9,fontWeight:900,color:MUTED,letterSpacing:"0.16em",textTransform:"uppercase" }}>{grp.label}</span>
                  </div>
                  {grpRows.map((row,ri)=>{
                    const sparkVals=allCols.map(c=>c.metrics?.[row.key]).filter(v=>v!=null&&v!=="");
                    return (
                      <div key={row.key} style={{ display:"flex",alignItems:"center",background:ri%2===0?"#111":"transparent",borderBottom:`1px solid ${BORDER}22` }}>
                        <div style={{ width:labelW,flexShrink:0,padding:"9px 16px",fontSize:11,fontWeight:600,color:"#ccc" }}>{row.label}</div>
                        {allCols.map((col,ci)=>{
                          const val=col.metrics?.[row.key];
                          const hasV=val!=null&&val!=="";
                          const prevC=ci>0?allCols[ci-1]:null;
                          const prevV=prevC?.metrics?.[row.key];
                          const cellDelta=prevC?delta(val,prevV,row.higher):null;
                          const valColor=getColor(row,val);
                          return (
                            <div key={col.key} style={{ width:colW,flexShrink:0,padding:"9px 8px",textAlign:"center" }}>
                              <div style={{ fontSize:12,fontFamily:"monospace",fontWeight:col.isCurrent?800:400,color:col.isCurrent?valColor:"#888" }}>
                                {hasV?`${val}${row.u}`:<span style={{ color:"#333" }}>—</span>}
                              </div>
                              {cellDelta&&hasV&&<div style={{ fontSize:9,fontWeight:700,color:deltaColor(cellDelta.dir),marginTop:1 }}>{deltaArrow(cellDelta.dir)}{cellDelta.diff!=="0.0"?` ${cellDelta.diff}`:""}</div>}
                            </div>
                          );
                        })}
                        {hasSessions&&<div style={{ width:60,flexShrink:0,padding:"4px 8px",display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {row.spark&&<Sparkline vals={allCols.map(c=>c.metrics?.[row.key]).filter(v=>v!=null&&v!=="")} higher={row.higher}/>}
                        </div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Progress Note Generator ── */}
      <Card title="Progress Note Generator" accent>
        <div style={{ fontSize:12,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          Generates a structured clinical progress note from all current testing data{hasSessions?", with direct comparison against the most recent previous session":""}.  Benchmarks are evaluated automatically — only sections with entered data appear.
        </div>
        <button onClick={generateParagraph} style={{ padding:"12px 32px",borderRadius:10,fontSize:12,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",background:LIME,color:BLACK,border:"none",marginBottom:14 }}>
          Generate Progress Note
        </button>
        {paragraph&&(
          <div style={{ background:BLACK,borderRadius:10,border:`1px solid ${LIME}44`,overflow:"hidden" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:LIME+"12",borderBottom:`1px solid ${LIME}22` }}>
              <span style={{ fontSize:10,fontWeight:800,color:LIME,letterSpacing:"0.15em",textTransform:"uppercase" }}>
                Clinical Progress Note{hasSessions?" — with session comparison":" — current session only"}
              </span>
              <button onClick={copyPara} style={{ padding:"6px 16px",borderRadius:6,fontSize:11,fontWeight:800,cursor:"pointer",background:copiedPara?"#15803d":LIME,color:BLACK,border:"none" }}>
                {copiedPara?"✓ Copied!":"Copy"}
              </button>
            </div>
            <div style={{ padding:20,color:"#d4faa6",fontSize:13,lineHeight:2.0,fontFamily:"inherit" }}>{paragraph}</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── TAB 3: REPORT ────────────────────────────────────────────────────────────
function Tab3({ currentData:d, setData }) {
  const sd=(k,v)=>setData(p=>({...p,[k]:v}));
  const [ptName,setPtName]=useState("");
  const [therapist,setTherapist]=useState("");
  const [clinic,setClinic]=useState("Train Recover Move");
  const [letterCopied,setLetterCopied]=useState(false);
  const [letterText,setLetterText]=useState("");

  const generateLetter=()=>setLetterText(buildLetter(d,ptName,therapist,clinic,d.impression));
  const copyLetter=()=>{
    navigator.clipboard?.writeText(letterText).then(()=>{ setLetterCopied(true); setTimeout(()=>setLetterCopied(false),2500); });
  };

  return (
    <div>
      <Card title="Physician Letter Generator" accent>
        <div style={{ fontSize:11,color:MUTED,marginBottom:14,lineHeight:1.6 }}>
          Generates a formatted progress letter for the referring surgeon or physician. Testing data is pulled automatically from the Testing tab.
        </div>
        <R3 mb={12}>
          <Field label="Patient Name" value={ptName} onChange={setPtName} type="text" placeholder="[de-identify as needed]"/>
          <Field label="Therapist / Credentials" value={therapist} onChange={setTherapist} type="text" placeholder="Jane Doe, PT, DPT"/>
          <Field label="Clinic Name" value={clinic} onChange={setClinic} type="text" placeholder="Train Recover Move"/>
        </R3>
        <div style={{ marginBottom:12 }}>
          <label style={lbl}>Clinical Impression</label>
          <textarea style={{...inp,minHeight:80,resize:"vertical",lineHeight:1.6}} placeholder="Enter your clinical impression and RTS recommendation here..." value={d.impression} onChange={e=>sd("impression",e.target.value)}/>
        </div>
        <button onClick={generateLetter} style={{ width:"100%",padding:14,borderRadius:10,fontSize:13,fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",background:`linear-gradient(135deg,${LIME},${LIME_DIM})`,color:BLACK,border:"none",boxShadow:`0 8px 32px ${LIME}44` }}>
          Generate Physician Letter
        </button>
      </Card>

      {letterText&&(
        <div style={{ borderRadius:12,overflow:"hidden",border:`1px solid ${LIME}44`,marginBottom:40 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",background:LIME+"14",borderBottom:`1px solid ${LIME}33` }}>
            <span style={{ fontSize:11,fontWeight:800,color:LIME,letterSpacing:"0.15em",textTransform:"uppercase" }}>Physician Letter</span>
            <button onClick={copyLetter} style={{ padding:"8px 20px",borderRadius:8,fontSize:11,fontWeight:800,cursor:"pointer",background:letterCopied?"#15803d":LIME,color:BLACK,border:"none" }}>
              {letterCopied?"Copied!":"Copy to Clipboard"}
            </button>
          </div>
          <pre style={{ padding:20,background:"#0a0a0a",color:"#d4faa6",fontSize:12,fontFamily:"monospace",lineHeight:1.8,whiteSpace:"pre-wrap",margin:0,maxHeight:600,overflowY:"auto",WebkitOverflowScrolling:"touch" }}>{letterText}</pre>
        </div>
      )}
    </div>
  );
}

// ─── PDF GENERATION ───────────────────────────────────────────────────────────
// NOTE: sanitizePdf strips non-ASCII. All PDF label strings use ASCII-only text.
const sanitizePdf = s => String(s||"").replace(/[^\x20-\x7E]/g,"").slice(0,200);

async function generateSessionPDF(data, mode="download") {
  const { PDFDocument, rgb, StandardFonts } = await getPdfLib();
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const inv=data.patient.involvedSide, invR=inv==="Right", uninv=invR?"Left":"Right";
  const dyn=data.dynamo||{}, imt=data.imtp||{}, cmj=data.cmj||{}, slh=data.slLandHold||{};

  // ── Color Palette (TRM light dashboard) ──
  const BLACK_R  = rgb(0.05,0.05,0.05);
  const WHITE_R  = rgb(1,1,1);
  const GRAY     = rgb(0.45,0.45,0.45);
  const LGRAY    = rgb(0.82,0.82,0.82);
  const BGRAY    = rgb(0.96,0.96,0.96);
  const DARK_R   = rgb(0.07,0.07,0.07);
  const LIME_R   = rgb(0.42,0.82,0.12);
  const LIME_BG  = rgb(0.90,0.98,0.82);
  const LIME_TXT = rgb(0.18,0.48,0.04);
  const GOLD_R   = rgb(0.90,0.65,0.08);
  const GOLD_BG  = rgb(1.0,0.95,0.80);
  const GOLD_TXT = rgb(0.65,0.42,0.02);
  const RED_R    = rgb(0.88,0.22,0.22);
  const RED_BG   = rgb(1.0,0.90,0.90);
  const RED_TXT  = rgb(0.65,0.10,0.10);
  const BORDER_R = rgb(0.88,0.88,0.88);

  const width=612, height=792;
  const L=48, R_edge=width-48, CW=R_edge-L;

  // ── TRM SVG Logo (viewBox 0 0 867 352), Y-flipped for pdf-lib (y_pdf = 352 - y_svg) ──
  const TRM_SVG_D="M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z";
  const trmPdfPath=TRM_SVG_D; // pdf-lib drawSvgPath handles SVG y-down; anchor y = logo TOP, draws downward
  const logoScale=26/352, logoW=867*(26/352), logoH=26;       // header logo ~26pt tall
  const ftrScale=12/352, ftrLogoW=867*(12/352), ftrLogoH=12;  // footer logo ~12pt tall

  // ── Status helpers (light theme, descriptive labels) ──
  const lsiStatus = v => { const n=parseFloat(v); if(isNaN(n)) return null;
    if(n>=90) return { color:LIME_R, bg:LIME_BG, txt:LIME_TXT, label:">= 90%  MEETS CRITERIA" };
    if(n>=80) return { color:GOLD_R, bg:GOLD_BG, txt:GOLD_TXT, label:"80-89%  BORDERLINE" };
    return            { color:RED_R,  bg:RED_BG,  txt:RED_TXT,  label:"<  80%  BELOW CRITERIA" }; };
  const asymStatus = v => { const n=parseFloat(v); if(isNaN(n)) return null;
    if(n<=10) return { color:LIME_R, bg:LIME_BG, txt:LIME_TXT, label:"<= 10%  WITHIN THRESHOLD" };
    if(n<=15) return { color:GOLD_R, bg:GOLD_BG, txt:GOLD_TXT, label:"11-15%  BORDERLINE" };
    return            { color:RED_R,  bg:RED_BG,  txt:RED_TXT,  label:">  15%  EXCEEDS THRESHOLD" }; };

  let pageCount=0; let page, y;

  // ── Page 1 header (dark bar 70pt + lime stripe + SVG logo) ──
  const drawMainHeader=()=>{
    page.drawRectangle({x:0,y:height-70,width,height:70,color:DARK_R});
    page.drawRectangle({x:0,y:height-72,width,height:2,color:LIME_R});
    page.drawSvgPath(trmPdfPath,{x:L,y:height-(70-logoH)/2,scale:logoScale,color:WHITE_R});
    const ruleX=L+logoW+16;
    page.drawLine({start:{x:ruleX,y:height-16},end:{x:ruleX,y:height-62},thickness:0.8,color:rgb(0.28,0.28,0.28)});
    page.drawText(sanitizePdf("Hip Testing & Outcome Measures"),{x:ruleX+10,y:height-34,size:10,font,color:rgb(0.68,0.68,0.68)});
    page.drawText(sanitizePdf("SESSION REPORT"),{x:ruleX+10,y:height-52,size:8.5,font:fontBold,color:LIME_R});
    const dateStr=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    page.drawText(sanitizePdf(dateStr),{x:R_edge-font.widthOfTextAtSize(dateStr,8),y:height-34,size:8,font,color:rgb(0.50,0.50,0.50)});
    const refTxt="Physician Reference";
    page.drawText(sanitizePdf(refTxt),{x:R_edge-fontBold.widthOfTextAtSize(refTxt,7.5),y:height-50,size:7.5,font:fontBold,color:rgb(0.38,0.38,0.38)});
  };

  // ── Footer (drawn on the page being left, and on the final page) ──
  const drawFooter=(isLast)=>{
    page.drawRectangle({x:0,y:0,width,height:26,color:DARK_R});
    page.drawRectangle({x:0,y:26,width,height:1.5,color:LIME_R});
    page.drawSvgPath(trmPdfPath,{x:L,y:26-(26-ftrLogoH)/2,scale:ftrScale,color:rgb(0.55,0.55,0.55)});
    const ftrTxt=isLast?"Hip Rehabilitation Testing Tool":"Hip Rehabilitation Testing Tool  -  Session data embedded. Upload to TRM app to restore.";
    page.drawText(sanitizePdf(ftrTxt),{x:L+ftrLogoW+8,y:8,size:6.5,font,color:rgb(0.44,0.44,0.44)});
    const pgStr=isLast?`Page ${pageCount} of ${pageCount}`:`Page ${pageCount}`;
    page.drawText(sanitizePdf(pgStr),{x:R_edge-font.widthOfTextAtSize(pgStr,6.5),y:8,size:6.5,font,color:rgb(0.38,0.38,0.38)});
  };

  // ── Overflow: footer on current page, new page with compact continuation header ──
  const addNewPage=()=>{
    drawFooter(false);
    pageCount++;
    page=doc.addPage([width,height]);
    page.drawRectangle({x:0,y:height-32,width,height:32,color:DARK_R});
    page.drawRectangle({x:0,y:height-34,width,height:2,color:LIME_R});
    page.drawText(sanitizePdf("TRM  |  Hip Testing & Outcome Measures  -  continued"),{x:L,y:height-22,size:8.5,font:fontBold,color:rgb(0.72,0.72,0.72)});
    const ptCont=`${data.patient.date||""}${data.patient.weeksPostOp?"  -  Wk "+data.patient.weeksPostOp:""}${data.patient.involvedSide?"  -  "+data.patient.involvedSide+" side":""}`;
    if(ptCont.trim()) page.drawText(sanitizePdf(ptCont.trim()),{x:R_edge-font.widthOfTextAtSize(ptCont.trim(),7),y:height-22,size:7,font,color:rgb(0.50,0.50,0.50)});
    y=height-52;
  };

  // ── PAGE 1 ──
  page=doc.addPage([width,height]); pageCount++;
  drawMainHeader();

  // Patient strip
  const pp=data.patient;
  page.drawRectangle({x:0,y:height-108,width,height:36,color:BGRAY});
  page.drawRectangle({x:0,y:height-109,width,height:1,color:BORDER_R});
  const ptFields=[
    ["Date",          pp.date || "-"],
    ["Weeks Post-Op", pp.weeksPostOp ? `${pp.weeksPostOp} wks` : "-"],
    ["Side",          pp.involvedSide || "-"],
    ["Body Weight",   data.bw ? `${data.bw} lbs` : "-"],
    ["Surgeon",       pp.surgeon ? `Dr. ${pp.surgeon}` : "-"],
  ];
  const ptColW=CW/ptFields.length;
  ptFields.forEach(([lb,val],i)=>{
    const px=L+i*ptColW;
    page.drawText(sanitizePdf(lb.toUpperCase()),{x:px,y:height-84,size:5.5,font:fontBold,color:GRAY});
    const v=val.length>16?val.slice(0,15)+".":val;
    page.drawText(sanitizePdf(v),{x:px,y:height-97,size:8.5,font:fontBold,color:BLACK_R});
  });
  y=height-122;

  const dynLSIs_p={
    abd:invR?calcLSI(dyn.abdPFR,dyn.abdPFL):calcLSI(dyn.abdPFL,dyn.abdPFR),
    add:invR?calcLSI(dyn.addPFR,dyn.addPFL):calcLSI(dyn.addPFL,dyn.addPFR),
    er:invR?calcLSI(dyn.erPFR,dyn.erPFL):calcLSI(dyn.erPFL,dyn.erPFR),
    ir:invR?calcLSI(dyn.irPFR,dyn.irPFL):calcLSI(dyn.irPFL,dyn.irPFR),
  };
  const allLSIVals=[dynLSIs_p.abd,dynLSIs_p.add,dynLSIs_p.er,dynLSIs_p.ir].filter(v=>v!==null).map(parseFloat);
  const avgLSI_p=allLSIVals.length>0?(allLSIVals.reduce((a,b)=>a+b,0)/allLSIVals.length).toFixed(1):null;
  const minDynLSI_p=allLSIVals.length>0?Math.min(...allLSIVals).toFixed(1):null;
  const imtpPFAsym_p=calcAsym(imt.pfR,imt.pfL);
  const hAvgSI_p=hopAvgIn(data.hops.singleI),hAvgSU_p=hopAvgIn(data.hops.singleU);
  const hopSingleLSI=calcLSI(hAvgSI_p,hAvgSU_p);

  // Clinical snapshot header
  page.drawRectangle({x:L-4,y:y-1,width:CW+8,height:15,color:rgb(0.11,0.11,0.11)});
  page.drawRectangle({x:L-4,y:y-1,width:3,height:15,color:LIME_R});
  page.drawText(sanitizePdf("CLINICAL SNAPSHOT  -  KEY OUTCOME METRICS"),{x:L+6,y:y+3,size:7.5,font:fontBold,color:LIME_R});
  y-=20;

  const snapItems=[];
  if(minDynLSI_p) snapItems.push({label:"Dynamo LSI (Min)",value:minDynLSI_p,unit:"%",st:lsiStatus(minDynLSI_p),note:"Worst of tested planes"});
  if(imtpPFAsym_p) snapItems.push({label:"IMTP Asym",value:imtpPFAsym_p,unit:"%",st:asymStatus(imtpPFAsym_p),note:"Peak force"});
  if(hopSingleLSI) snapItems.push({label:"Single Hop LSI",value:hopSingleLSI,unit:"%",st:lsiStatus(hopSingleLSI),note:`${inv} / ${uninv}`});
  if(hasVal(data.iHOT)) snapItems.push({label:"iHOT-33",value:data.iHOT,unit:"",st:(v=>{const n=parseFloat(v);if(isNaN(n))return null;if(n>=70)return{color:LIME_R,bg:LIME_BG,txt:LIME_TXT,label:">= 70  MEETS RTS THRESHOLD"};if(n>=50)return{color:GOLD_R,bg:GOLD_BG,txt:GOLD_TXT,label:"50-69  MODERATE"};return{color:RED_R,bg:RED_BG,txt:RED_TXT,label:"<  50  SIGNIFICANT"};})(data.iHOT),note:"Patient-reported"});
  else if(hasVal(cmj.eccAsym)) snapItems.push({label:"CMJ Ecc Asym",value:cmj.eccAsym,unit:"%",st:asymStatus(cmj.eccAsym),note:"Eccentric braking"});

  const showSnap=snapItems.slice(0,4);
  if(showSnap.length>0) {
    const boxW=Math.floor(CW/4)-3,boxH=50;
    showSnap.forEach((item,i)=>{
      const bx=L+i*(boxW+4);
      const dotColor=item.st?item.st.color:LGRAY;
      const bgColor=item.st?item.st.bg:BGRAY;
      const txtColor=item.st?item.st.txt:GRAY;
      page.drawRectangle({x:bx,y:y-boxH,width:boxW,height:boxH,color:bgColor});
      page.drawRectangle({x:bx,y:y,width:boxW,height:2,color:dotColor});
      page.drawRectangle({x:bx,y:y-boxH,width:3,height:boxH,color:dotColor});
      page.drawText(sanitizePdf(item.label.toUpperCase()),{x:bx+8,y:y-12,size:6.5,font:fontBold,color:GRAY});
      page.drawText(sanitizePdf(`${item.value}${item.unit}`),{x:bx+8,y:y-29,size:18,font:fontBold,color:dotColor});
      if(item.st) page.drawText(sanitizePdf(item.st.label),{x:bx+8,y:y-40,size:6,font:fontBold,color:txtColor});
      page.drawText(sanitizePdf(item.note),{x:bx+8,y:y-boxH+5,size:5.5,font,color:GRAY});
    });
    y-=boxH+10;
  } else {
    page.drawText(sanitizePdf("No computed metrics -- enter testing data to generate the snapshot."),{x:L,y,size:8,font,color:GRAY});
    y-=16;
  }
  y-=4;

  const col2=L+Math.floor(CW/2)+4;
  const section=title=>{ if(y<140) addNewPage(); y-=4; page.drawRectangle({x:L-4,y:y-3,width:CW+8,height:14,color:rgb(0.11,0.11,0.11)}); page.drawRectangle({x:L-4,y:y-3,width:3,height:14,color:LIME_R}); page.drawText(sanitizePdf(title.toUpperCase()),{x:L+5,y:y,size:7,font:fontBold,color:rgb(0.72,0.72,0.72)}); y-=17; };
  const row=(label,value,x2=null,label2=null,value2=null)=>{ if(y<120) addNewPage(); page.drawText(sanitizePdf(label),{x:L,y,size:8.5,font:fontBold,color:BLACK_R}); page.drawText(sanitizePdf(String(value||"--")),{x:L+165,y,size:8.5,font,color:value?BLACK_R:LGRAY}); if(x2&&label2){page.drawText(sanitizePdf(label2),{x:x2,y,size:8.5,font:fontBold,color:BLACK_R}); page.drawText(sanitizePdf(String(value2||"--")),{x:x2+165,y,size:8.5,font,color:value2?BLACK_R:LGRAY});} y-=12; };
  const lsiRow=(label,val,statusFn=lsiStatus,unit="%")=>{
    if(y<120) addNewPage();
    const st=statusFn?statusFn(val):null;
    page.drawText(sanitizePdf(label),{x:L,y,size:8.5,font:fontBold,color:BLACK_R});
    if(val!==null&&val!==undefined){
      const valStr=`${val}${unit}`;
      page.drawText(sanitizePdf(valStr),{x:L+165,y,size:8.5,font:fontBold,color:st?st.color:GRAY});
      if(st){
        const chipX=L+165+fontBold.widthOfTextAtSize(valStr,8.5)+8;
        const chipW=fontBold.widthOfTextAtSize(st.label,5.8)+8;
        page.drawRectangle({x:chipX,y:y-2,width:chipW,height:11,color:st.bg});
        page.drawRectangle({x:chipX,y:y-2,width:chipW,height:1.5,color:st.color});
        page.drawText(sanitizePdf(st.label),{x:chipX+4,y:y+1,size:5.8,font:fontBold,color:st.txt});
      }
    }else{
      page.drawText("--",{x:L+165,y,size:8.5,font,color:LGRAY});
    }
    y-=12;
  };
  const divider=()=>{ if(y<120){addNewPage();return;} page.drawLine({start:{x:L,y},end:{x:R_edge,y},thickness:0.4,color:BORDER_R}); y-=8; };

  section("Session Information");
  row("Date:",data.patient.date,col2,"Surgeon:",data.patient.surgeon?`Dr. ${data.patient.surgeon}`:null);
  row("Involved Side:",inv,col2,"Weeks Post-Op:",data.patient.weeksPostOp?`${data.patient.weeksPostOp} wks`:null);
  row("Diagnosis:",data.patient.diagnosis,col2,"Body Weight:",data.bw?`${data.bw} lbs`:null);
  divider();

  const romRows=[["Hip Flexion","hipFlexR","hipFlexL"],["Hip Extension","hipExtR","hipExtL"],["Hip Abduction","hipAbdR","hipAbdL"],["Hip Adduction","hipAddR","hipAddL"],["Hip IR","hipIRR","hipIRL"],["Hip ER","hipERR","hipERL"]];
  const hasROM=romRows.some(([,r,l])=>hasVal(data[r])||hasVal(data[l]));
  if(hasROM) {
    section("Hip Range of Motion");
    romRows.forEach(([name,rKey,lKey])=>{ if(!hasVal(data[rKey])&&!hasVal(data[lKey])) return; row(`${name} R:`,data[rKey]?`${data[rKey]} deg`:null,col2,`${name} L:`,data[lKey]?`${data[lKey]} deg`:null); });
    divider();
  }

  const dynRows=[["Hip Abduction","abdPFR","abdPFL","abdTPFR","abdTPFL","abd"],["Hip Adduction","addPFR","addPFL","addTPFR","addTPFL","add"],["Hip ER","erPFR","erPFL","erTPFR","erTPFL","er"],["Hip IR","irPFR","irPFL","irTPFR","irTPFL","ir"]];
  const hasDyn=dynRows.some(([,r,l])=>hasVal(dyn[r])||hasVal(dyn[l]));
  if(hasDyn) {
    section("Isometric Hip Strength -- VALD Dynamo");
    dynRows.forEach(([name,pfR,pfL,tpfR,tpfL])=>{
      if(!hasVal(dyn[pfR])&&!hasVal(dyn[pfL])) return;
      const lsi=invR?calcLSI(dyn[pfR],dyn[pfL]):calcLSI(dyn[pfL],dyn[pfR]);
      const tpfAsym=calcAsym(dyn[tpfR],dyn[tpfL]);
      row(`${name} -- L:`,dyn[pfL]?`${dyn[pfL]} N`:null,col2,`R:`,dyn[pfR]?`${dyn[pfR]} N`:null);
      if(lsi) lsiRow(`  ${name} LSI:`,lsi);
      if(tpfAsym) lsiRow(`  ${name} TPF Asym:`,tpfAsym,asymStatus,"%");
    });
    if(avgLSI_p) lsiRow("Average Dynamo LSI:",avgLSI_p);
    divider();
  }

  if(hasVal(imt.pfR)||hasVal(imt.pfL)) {
    section("Isometric Mid-Thigh Pull -- VALD ForceDecks");
    row("Peak Force L:",imt.pfL?`${imt.pfL} N`:null,col2,"Peak Force R:",imt.pfR?`${imt.pfR} N`:null);
    if(imtpPFAsym_p) lsiRow("PF Asymmetry:",imtpPFAsym_p,asymStatus);
    if(hasVal(imt.tpfR)||hasVal(imt.tpfL)) {
      row("TPF L:",imt.tpfL?`${imt.tpfL} ms`:null,col2,"TPF R:",imt.tpfR?`${imt.tpfR} ms`:null);
      const tpfA=calcAsym(imt.tpfR,imt.tpfL); if(tpfA) lsiRow("TPF Asymmetry:",tpfA,asymStatus);
    }
    divider();
  }

  if(hasVal(cmj.jumpHeight)||hasVal(cmj.eccAsym)||hasVal(cmj.concAsym)||hasVal(cmj.cov)) {
    section("Countermovement Jump -- VALD ForceDecks");
    if(hasVal(cmj.jumpHeight)) row("Jump Height:",`${cmj.jumpHeight} cm`,col2,"Mod RSI:",cmj.modRSI||null);
    if(hasVal(cmj.eccAsym)) lsiRow("Ecc Impulse Asymmetry:",cmj.eccAsym,asymStatus);
    if(hasVal(cmj.concAsym)) lsiRow("Conc Impulse Asymmetry:",cmj.concAsym,asymStatus);
    if(hasVal(cmj.cov)) lsiRow("Coefficient of Variation:",cmj.cov,asymStatus);
    divider();
  }

  if(hasVal(slh.rPeakForce)||hasVal(slh.lPeakForce)||hasVal(slh.rTTS)||hasVal(slh.lTTS)) {
    section("Single Leg Land and Hold -- VALD ForceDecks");
    if(hasVal(slh.rPeakForce)||hasVal(slh.lPeakForce)) {
      row("Peak Force L:",slh.lPeakForce?`${slh.lPeakForce} N`:null,col2,"Peak Force R:",slh.rPeakForce?`${slh.rPeakForce} N`:null);
      const fa=calcAsym(slh.rPeakForce,slh.lPeakForce); if(fa) lsiRow("Force Asymmetry:",fa,asymStatus);
    }
    if(hasVal(slh.rTTS)||hasVal(slh.lTTS)) {
      row("TTS L:",slh.lTTS?`${slh.lTTS} s`:null,col2,"TTS R:",slh.rTTS?`${slh.rTTS} s`:null);
      const ta=calcAsym(slh.rTTS,slh.lTTS); if(ta) lsiRow("TTS Asymmetry:",ta,asymStatus);
    }
    divider();
  }

  const hopTests_p=[["Single Hop",hopAvgIn(data.hops.singleI),hopAvgIn(data.hops.singleU),"in"],["Triple Hop",hopAvgIn(data.hops.tripleI),hopAvgIn(data.hops.tripleU),"in"],["Crossover Hop",hopAvgIn(data.hops.crossI),hopAvgIn(data.hops.crossU),"in"],["6m Timed Hop",hopAvgTimed(data.hops.timedI),hopAvgTimed(data.hops.timedU),"sec"]].filter(([,i,u])=>hasVal(i)||hasVal(u));
  if(hopTests_p.length>0) {
    section("Hop Testing");
    hopTests_p.forEach(([name,i,u,unit])=>{
      row(`${name} -- ${inv}:`,i?`${i} ${unit}`:null,col2,`${uninv}:`,u?`${u} ${unit}`:null);
      const l=unit==="sec"?calcTimedLSI(i,u):calcLSI(i,u); if(l) lsiRow(`  ${name} LSI:`,l);
    });
    divider();
  }

  if(hasVal(data.agilityTime)) {
    section("Agility Testing");
    row("Pro Agility (5-10-5) -- Best Time:",`${data.agilityTime} sec`);
    divider();
  }

  const hasProb=hasVal(data.iHOT)||hasVal(data.hosSport)||hasVal(data.tampa);
  if(hasProb) {
    section("Patient-Reported Outcomes");
    if(hasVal(data.iHOT)) lsiRow("iHOT-33:",data.iHOT,v=>{ const n=parseFloat(v); if(isNaN(n)) return null; if(n>=70) return{color:LIME_R,bg:LIME_BG,txt:LIME_TXT,label:">= 70  MEETS RTS THRESHOLD"}; if(n>=50) return{color:GOLD_R,bg:GOLD_BG,txt:GOLD_TXT,label:"50-69  MODERATE"}; return{color:RED_R,bg:RED_BG,txt:RED_TXT,label:"<  50  SIGNIFICANT"}; },"/100");
    if(hasVal(data.hosSport)) lsiRow("HOS-Sport:",data.hosSport,v=>{ const n=parseFloat(v); if(isNaN(n)) return null; if(n>=74) return{color:LIME_R,bg:LIME_BG,txt:LIME_TXT,label:">= 74%  RTS THRESHOLD"}; if(n>=60) return{color:GOLD_R,bg:GOLD_BG,txt:GOLD_TXT,label:"60-73%  BORDERLINE"}; return{color:RED_R,bg:RED_BG,txt:RED_TXT,label:"<  60%  BELOW THRESHOLD"}; },"%");
    if(hasVal(data.tampa)) lsiRow("Tampa Scale (TSK-11):",data.tampa,v=>{ const n=parseFloat(v); if(isNaN(n)) return null; if(n<=17) return{color:LIME_R,bg:LIME_BG,txt:LIME_TXT,label:"<= 17  ACCEPTABLE"}; if(n<=22) return{color:GOLD_R,bg:GOLD_BG,txt:GOLD_TXT,label:"18-22  MILD KINESIO."}; return{color:RED_R,bg:RED_BG,txt:RED_TXT,label:">  22  ELEVATED"}; },"");
    divider();
  }

  // Interpretation legend
  const legendY=Math.min(y-4,70);
  if(legendY>36) {
    page.drawLine({start:{x:L,y:legendY+14},end:{x:R_edge,y:legendY+14},thickness:0.4,color:BORDER_R});
    page.drawText(sanitizePdf("INTERPRETATION:"),{x:L,y:legendY+2,size:6.5,font:fontBold,color:GRAY});
    const lgItems=[
      {color:LIME_R,bg:LIME_BG,text:">= 90% LSI / <= 10% asym - Meets criteria"},
      {color:GOLD_R,bg:GOLD_BG,text:"Borderline"},
      {color:RED_R, bg:RED_BG, text:"Below criteria"},
    ];
    let lx=L+fontBold.widthOfTextAtSize("INTERPRETATION:",6.5)+14;
    lgItems.forEach(({color,bg,text})=>{
      if(lx+11+font.widthOfTextAtSize(text,6.5)>R_edge) return;
      page.drawRectangle({x:lx,y:legendY,width:8,height:8,color:bg});
      page.drawRectangle({x:lx,y:legendY+6,width:8,height:2,color});
      page.drawText(sanitizePdf(text),{x:lx+11,y:legendY+1,size:6.5,font,color:GRAY});
      lx+=11+font.widthOfTextAtSize(text,6.5)+18;
    });
  }

  drawFooter(true);

  const sessionJson=JSON.stringify(data);
  const bytes=new TextEncoder().encode(sessionJson);
  const encoded=btoa(String.fromCharCode(...bytes));
  const PREFIX="TRM_HIP_V1:";
  doc.setSubject(PREFIX+encoded);
  doc.setKeywords([PREFIX+encoded]);
  doc.setTitle(`TRM Hip Session -- ${data.patient.date||new Date().toISOString().slice(0,10)}`);

  const pdfBytes=await doc.save();
  const filename=`TRM_Hip_${new Date().toISOString().slice(0,10)}.pdf`;
  const blob=new Blob([pdfBytes],{type:"application/pdf"});

  if(mode==="share") {
    const shareFile=new File([blob],filename,{type:"application/pdf"});
    if(navigator.canShare&&navigator.canShare({files:[shareFile]})) {
      try { await navigator.share({files:[shareFile],title:"TRM Hip Session PDF"}); } catch(err) { if(err.name!=="AbortError") throw err; }
      return "shared";
    }
    return "share-unsupported";
  }
  const url=URL.createObjectURL(blob);
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const isSafari=/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if(!isIOS) {
    const a=document.createElement("a"); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    if(isSafari) { setTimeout(()=>{window.open(url,"_blank");},100); setTimeout(()=>URL.revokeObjectURL(url),90000); }
    else setTimeout(()=>URL.revokeObjectURL(url),30000);
    return "downloaded";
  }
  window.open(url,"_blank"); setTimeout(()=>URL.revokeObjectURL(url),60000);
  return "ios-tab";
}

// ─── PDF LOADING ──────────────────────────────────────────────────────────────
async function loadSessionPDF(file, onData, onError) {
  try {
    const { PDFDocument } = await getPdfLib();
    const arrayBuffer = await file.arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    let encoded = null;
    const PREFIX = "TRM_HIP_V1:";
    const subject = doc.getSubject() || "";
    if (subject.startsWith(PREFIX)) encoded = subject.slice(PREFIX.length);
    if (!encoded) {
      const rawKeywords = doc.getKeywords() || "";
      const keywords = Array.isArray(rawKeywords) ? (rawKeywords[0] || "") : rawKeywords;
      if (keywords.startsWith(PREFIX)) encoded = keywords.slice(PREFIX.length);
    }
    if (!encoded) { onError("This PDF does not contain TRM Hip session data. Make sure you are uploading a PDF saved directly from this app."); return; }
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const json = new TextDecoder("utf-8").decode(bytes);
    const raw = JSON.parse(json);
    const sessionData = {
      ...BLANK_DATA, ...raw,
      patient:     { ...BLANK_DATA.patient,     ...(raw.patient     || {}) },
      dynamo:      { ...BLANK_DATA.dynamo,       ...(raw.dynamo      || {}) },
      imtp:        { ...BLANK_DATA.imtp,         ...(raw.imtp        || {}) },
      cmj:         { ...BLANK_DATA.cmj,          ...(raw.cmj         || {}) },
      slLandHold:  { ...BLANK_DATA.slLandHold,   ...(raw.slLandHold  || {}) },
      hops:        { ...BLANK_DATA.hops,         ...(raw.hops        || {}) },
    };
    onData(sessionData);
  } catch(e) { onError("Could not read session data from this PDF. (" + e.message + ")"); }
}

// ─── BLANK DATA ───────────────────────────────────────────────────────────────
const BLANK_DATA = {
  patient: { date:"", surgeon:"", diagnosis:"", weeksPostOp:"", involvedSide:"Left", sex:"Male" },
  bw: "",
  hipFlexR:"", hipFlexL:"", hipExtR:"", hipExtL:"",
  hipAbdR:"", hipAbdL:"", hipAddR:"", hipAddL:"",
  hipIRR:"", hipIRL:"", hipERR:"", hipERL:"",
  dynamo: { abdPFR:"",abdPFL:"",abdTPFR:"",abdTPFL:"", addPFR:"",addPFL:"",addTPFR:"",addTPFL:"", erPFR:"",erPFL:"",erTPFR:"",erTPFL:"", irPFR:"",irPFL:"",irTPFR:"",irTPFL:"" },
  imtp: { pfR:"", pfL:"", tpfR:"", tpfL:"" },
  cmj:  { jumpHeight:"", eccAsym:"", concAsym:"", cov:"", modRSI:"" },
  slLandHold: { rPeakForce:"", lPeakForce:"", rTTS:"", lTTS:"" },
  hops: {
    singleI:[{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    singleU:[{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    tripleI:[{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    tripleU:[{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    crossI: [{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    crossU: [{ft:"",in:""},{ft:"",in:""},{ft:"",in:""}],
    timedI:["","",""], timedU:["","",""],
  },
  agilityTime:"",
  iHOT:"", hosSport:"", tampa:"",
  noteText:"", impression:"",
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,    setActiveTab]    = useState(0);
  const [data,         setData]         = useState(BLANK_DATA);
  const [saving,       setSaving]       = useState(false);
  const [loadMsg,      setLoadMsg]      = useState(null);
  const [sessions,     setSessions]     = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open:false, file:null, fileName:"" });
  const [newPtModal,   setNewPtModal]   = useState(false);
  const [storageRestored, setStorageRestored] = useState(false);
  const fileInputRef    = useRef(null);
  const compareInputRef = useRef(null);
  const navLockRef      = useRef(null);

  // ── Mobile breakpoint ──────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── SIDE NAV SECTIONS ──────────────────────────────────────────────────────
  const sideNavSections = [
    { key:"pt",   label:"PT",   ids:["patient"] },
    { key:"rom",  label:"ROM",  ids:["rom"] },
    { key:"str",  label:"STR",  ids:["dynamo","imtp"] },
    { key:"fp",   label:"FP",   ids:["cmj","sllah"] },
    { key:"hop",  label:"HOP",  ids:["hops"] },
    { key:"pro",  label:"PRO",  ids:["agility","pro"] },
  ];
  const [activeSection, setActiveSection] = useState("pt");

  const scrollToSection = (ids) => {
    const el = document.getElementById(ids[0]);
    if (!el) return;
    // Set the anti-glitch lock for the duration of the smooth scroll animation
    if (navLockRef.current) clearTimeout(navLockRef.current);
    navLockRef.current = setTimeout(() => { navLockRef.current = null; }, 700);
    // Offset by sticky header height (~110px) so the card title is fully visible
    const top = el.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab !== 0) return;
    const allIds = sideNavSections.flatMap(s => s.ids);
    const observers = [];
    const visible = new Set();
    const update = () => {
      if (navLockRef.current) return; // tap-driven scroll in progress — don't override
      for (const sec of sideNavSections) {
        if (sec.ids.some(id => visible.has(id))) { setActiveSection(sec.key); return; }
      }
    };
    allIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { e.isIntersecting ? visible.add(id) : visible.delete(id); });
        update();
      }, { threshold: 0.15 });
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [activeTab]);

  const tabs=[
    {label:"Testing",    sub:"ROM / Strength / Force Plate / Hops"},
    {label:"Comparison", sub:"Session Timeline"},
    {label:"Report",     sub:"Letter / Impression"},
  ];

  useEffect(()=>{
    const save=async()=>{
      const val=JSON.stringify(data);
      try { await window.storage.set("trm_hip_autosave",val); } catch(e) {}
      try { localStorage.setItem("trm_hip_autosave_local",val); } catch(e) {}
    };
    const t=setTimeout(save,800);
    return ()=>clearTimeout(t);
  },[data]);

  useEffect(()=>{
    const restore=async()=>{
      let val=null;
      try { const r=await window.storage.get("trm_hip_autosave"); val=r?.value||null; } catch(e) {}
      if(!val) { try { val=localStorage.getItem("trm_hip_autosave_local"); } catch(e) {} }
      if(val) {
        try {
          const raw=JSON.parse(val);
          const merged={...BLANK_DATA,...raw,patient:{...BLANK_DATA.patient,...(raw.patient||{})},dynamo:{...BLANK_DATA.dynamo,...(raw.dynamo||{})},imtp:{...BLANK_DATA.imtp,...(raw.imtp||{})},cmj:{...BLANK_DATA.cmj,...(raw.cmj||{})},slLandHold:{...BLANK_DATA.slLandHold,...(raw.slLandHold||{})},hops:{...BLANK_DATA.hops,...(raw.hops||{})}};
          const hasAny=merged.patient.date||merged.bw||merged.hipFlexR||merged.dynamo.abdPFR||merged.imtp.pfR||merged.iHOT;
          if(hasAny) { setData(merged); setStorageRestored(true); }
        } catch(e) {}
      }
    };
    restore();
  },[]);

  const handleSavePDF = async () => {
    setSaving(true);
    try {
      const result = await generateSessionPDF(data, "download");
      if (result === "share-unsupported") setLoadMsg({ type:"error", text:"Share not supported on this browser. Try Save PDF instead." });
    } catch(e) { setLoadMsg({ type:"error", text:"PDF generation failed: " + e.message }); }
    finally { setSaving(false); }
  };
  const handleAirDrop = async () => {
    setSaving(true);
    try {
      const result = await generateSessionPDF(data, "share");
      if (result === "share-unsupported") { await generateSessionPDF(data, "download"); }
    } catch(e) { setLoadMsg({ type:"error", text:"Share failed: " + e.message }); }
    finally { setSaving(false); }
  };

  const handleFileChange = e => {
    const file = e.target.files?.[0]; if(!file) return;
    setConfirmModal({ open:true, file, fileName:file.name });
    e.target.value = "";
  };
  const doLoadFile = () => {
    const file = confirmModal.file; setConfirmModal({ open:false, file:null, fileName:"" });
    if(!file) return;
    loadSessionPDF(file,
      (sessionData) => { setData(sessionData); setSessions([]); setActiveTab(0); setLoadMsg({ type:"success", text:"Session loaded successfully." }); setTimeout(()=>setLoadMsg(null),4000); },
      (errMsg) => { setLoadMsg({ type:"error", text:errMsg }); setTimeout(()=>setLoadMsg(null),6000); }
    );
  };

  const handleCompareFileChange = e => {
    const file = e.target.files?.[0]; if(!file) return; e.target.value = "";
    loadSessionPDF(file,
      (sessionData) => {
        const dateLabel=sessionData.patient?.date||new Date().toLocaleDateString();
        const wks=sessionData.patient?.weeksPostOp;
        const label=wks?`${dateLabel} (Wk ${wks})`:dateLabel;
        setSessions(prev=>{
          const exists=prev.findIndex(s=>s.label===label);
          if(exists>=0){ const n=[...prev]; n[exists]={data:sessionData,label,date:dateLabel}; return n; }
          if(prev.length>=5){ setLoadMsg({type:"error",text:"Maximum 5 comparison sessions. Remove one first."}); setTimeout(()=>setLoadMsg(null),5000); return prev; }
          return [...prev,{data:sessionData,label,date:dateLabel}];
        });
        setLoadMsg({type:"success",text:`Added ${label} to comparison.`}); setTimeout(()=>setLoadMsg(null),4000);
      },
      (errMsg)=>{ setLoadMsg({type:"error",text:errMsg}); setTimeout(()=>setLoadMsg(null),6000); }
    );
  };

  const doNewPatient = async () => {
    setData(BLANK_DATA); setSessions([]); setNewPtModal(false); setActiveTab(0);
    try { await window.storage.delete("trm_hip_autosave"); } catch(e) {}
    try { localStorage.removeItem("trm_hip_autosave_local"); } catch(e) {}
  };

  return (
    <div style={{ background:BLACK, minHeight:"100vh", color:WHITE, fontFamily:"'Inter','Helvetica Neue',sans-serif" }}>
      <ConfirmModal open={confirmModal.open} fileName={confirmModal.fileName} onConfirm={doLoadFile} onCancel={()=>setConfirmModal({open:false,file:null,fileName:""})}/>
      <NewPatientModal open={newPtModal} onConfirm={doNewPatient} onCancel={()=>setNewPtModal(false)}/>

      {/* Header */}
      <div style={{ background:DARK,borderBottom:`1px solid ${BORDER}`,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 20px rgba(0,0,0,0.8)" }}>
        <div style={{ maxWidth:900,margin:"0 auto",padding:"0 20px" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",height:58 }}>
            <div style={{ display:"flex",alignItems:"baseline",gap:12 }}>
              <svg viewBox="0 0 867 352" xmlns="http://www.w3.org/2000/svg" style={{ height:44, width:"auto", display:"block", color:WHITE, flexShrink:0 }} aria-label="TRM" role="img"><path fillRule="evenodd" fill="currentColor" d="M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z" /></svg>
              <span style={{ color:BORDER,fontSize:18 }}>|</span>
              <span className="trm-header-subtitle" style={{ fontSize:11,fontWeight:700,color:"#777",letterSpacing:"0.08em",textTransform:"uppercase" }}>Hip Testing & Outcome Measures</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={handleFileChange}/>
              <input ref={compareInputRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={handleCompareFileChange}/>
              <span style={{ fontSize:10,fontWeight:700,color:MUTED,letterSpacing:"0.1em",textTransform:"uppercase" }}>Involved:</span>
              <SideToggle value={data.patient.involvedSide} onChange={v=>setData(p=>({...p,patient:{...p.patient,involvedSide:v}}))}/>
            </div>
          </div>
          <div style={{ display:"flex",borderTop:`1px solid ${BORDER}` }}>
            {tabs.map((t,i)=>(
              <button key={i} onClick={()=>setActiveTab(i)} className="trm-tab-btn" style={{ padding:"10px 22px",background:"transparent",border:"none",borderBottom:`3px solid ${activeTab===i?LIME:"transparent"}`,cursor:"pointer",textAlign:"left" }}>
                <div style={{ fontSize:12,fontWeight:800,color:activeTab===i?LIME:"#666" }}>{t.label}</div>
                <div className="trm-tab-sub" style={{ fontSize:9,color:activeTab===i?LIME+"88":"#444",letterSpacing:"0.08em",textTransform:"uppercase" }}>{t.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="trm-main-content" style={{ maxWidth:900,margin:"0 auto",padding:"20px 16px",paddingBottom:100 }}>
        {storageRestored&&(
          <div style={{ marginBottom:20,padding:"12px 18px",borderRadius:10,border:`1px solid ${BLUE}55`,background:BLUE+"12",display:"flex",alignItems:"center",gap:12 }}>
            <span style={{ fontSize:16 }}>*</span>
            <span style={{ fontSize:12,fontWeight:700,color:BLUE }}>Session auto-restored from your last visit.</span>
            <button onClick={()=>setStorageRestored(false)} style={{ marginLeft:"auto",background:"none",border:"none",color:MUTED,cursor:"pointer",fontSize:16,lineHeight:1 }}>x</button>
          </div>
        )}
        {loadMsg&&(
          <div style={{ marginBottom:20,padding:"12px 18px",borderRadius:10,border:`1px solid ${loadMsg.type==="success"?LIME+"55":RED_BAD+"55"}`,background:loadMsg.type==="success"?LIME+"12":RED_BAD+"12",display:"flex",alignItems:"center",gap:12 }}>
            <span style={{ fontSize:16 }}>{loadMsg.type==="success"?"OK":"!"}</span>
            <span style={{ fontSize:12,fontWeight:700,color:loadMsg.type==="success"?LIME:RED_BAD }}>{loadMsg.text}</span>
            <button onClick={()=>setLoadMsg(null)} style={{ marginLeft:"auto",background:"none",border:"none",color:MUTED,cursor:"pointer",fontSize:16,lineHeight:1 }}>x</button>
          </div>
        )}
        {activeTab===0&&<Tab1 data={data} setData={setData}/>}
        {activeTab===1&&<Tab2 currentData={data} sessions={sessions} setSessions={setSessions} onAddSession={()=>compareInputRef.current.click()}/>}
        {activeTab===2&&<Tab3 currentData={data} setData={setData}/>}
      </div>

      {/* Footer */}
      <div style={{ borderTop:`1px solid ${BORDER}`,padding:"16px 20px",textAlign:"center" }}>
        <svg viewBox="0 0 867 352" xmlns="http://www.w3.org/2000/svg" style={{ height:15, width:"auto", display:"inline-block", verticalAlign:"middle", color:WHITE }} aria-label="TRM" role="img"><path fillRule="evenodd" fill="currentColor" d="M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z" /></svg>
        <span style={{ color:MUTED,fontSize:11,marginLeft:10 }}>Hip Testing & Outcome Measures — Not a substitute for clinical judgment</span>
      </div>

      {/* Desktop side nav */}
      {activeTab === 0 && (
        <nav className="trm-sidenav">
          {sideNavSections.map(sec => (
            <div key={sec.key}
              className={`trm-sidenav-item ${activeSection === sec.key ? "active" : ""}`}
              onClick={() => { scrollToSection(sec.ids); setActiveSection(sec.key); }}>
              {sec.label}
            </div>
          ))}
        </nav>
      )}

      {/* Mobile bottom nav — dots + Prev/label/Next */}
      {isMobile && activeTab === 0 && (() => {
        const idx  = sideNavSections.findIndex(s => s.key === activeSection);
        const cur  = sideNavSections[idx] ?? sideNavSections[0];
        const prev = sideNavSections[idx - 1];
        const next = sideNavSections[idx + 1];
        return (
          <div style={{
            position:"fixed", bottom:0, left:0, right:0,
            zIndex:150, background:"#0f0f0f",
            borderTop:`1px solid ${LIME}33`,
            paddingBottom:"env(safe-area-inset-bottom)",
          }}>
            {/* Section dots */}
            <div style={{ display:"flex", justifyContent:"center", gap:5, paddingTop:8, paddingBottom:4 }}>
              {sideNavSections.map(s => (
                <button key={s.key} onClick={() => { scrollToSection(s.ids); setActiveSection(s.key); }} style={{
                  width: s.key === activeSection ? 22 : 7, height:7, borderRadius:4,
                  padding:0, border:"none", flexShrink:0,
                  background: s.key === activeSection ? LIME : "#2e2e2e",
                  cursor:"pointer", transition:"width 0.2s, background 0.2s",
                }}/>
              ))}
            </div>
            {/* Prev / label / Next */}
            <div style={{ display:"flex", alignItems:"stretch", gap:6, padding:"4px 12px 10px" }}>
              <button
                onClick={() => { if (prev) { scrollToSection(prev.ids); setActiveSection(prev.key); } }}
                disabled={!prev}
                style={{
                  flex:1, display:"flex", alignItems:"center", gap:8,
                  padding:"8px 10px", borderRadius:10,
                  border:`1px solid ${prev ? BORDER : "#181818"}`,
                  background: prev ? "#1a1a1a" : "#0a0a0a",
                  cursor: prev ? "pointer" : "default", textAlign:"left", minWidth:0,
                }}>
                <span style={{ fontSize:18, color: prev ? "#666" : "#222", lineHeight:1, flexShrink:0 }}>‹</span>
                {prev && (
                  <div>
                    <div style={{ fontSize:8, color:"#555", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>Prev</div>
                    <div style={{ fontSize:10, fontWeight:700, color:"#888" }}>{prev.label}</div>
                  </div>
                )}
              </button>
              <div style={{ flexShrink:0, textAlign:"center", display:"flex", flexDirection:"column", justifyContent:"center", minWidth:72 }}>
                <div style={{ fontSize:10, fontWeight:900, color:LIME, letterSpacing:"0.08em", textTransform:"uppercase" }}>{cur.label}</div>
                <div style={{ fontSize:8, color:"#666", fontWeight:700, marginTop:1 }}>{idx + 1} / {sideNavSections.length}</div>
              </div>
              <button
                onClick={() => { if (next) { scrollToSection(next.ids); setActiveSection(next.key); } }}
                disabled={!next}
                style={{
                  flex:1, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8,
                  padding:"8px 10px", borderRadius:10,
                  border:`1px solid ${next ? BORDER : "#181818"}`,
                  background: next ? "#1a1a1a" : "#0a0a0a",
                  cursor: next ? "pointer" : "default", textAlign:"right", minWidth:0,
                }}>
                {next && (
                  <div>
                    <div style={{ fontSize:8, color:"#555", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", textAlign:"right" }}>Next</div>
                    <div style={{ fontSize:10, fontWeight:700, color:"#888", textAlign:"right" }}>{next.label}</div>
                  </div>
                )}
                <span style={{ fontSize:18, color: next ? "#666" : "#222", lineHeight:1, flexShrink:0 }}>›</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* FAB */}
      <div className="trm-fab" style={{ position:"fixed",bottom:24,right:24,zIndex:200,display:"flex",alignItems:"center",gap:8 }}>
        <div style={{ display:"flex",alignItems:"stretch",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,overflow:"hidden",background:"rgba(255,255,255,0.05)",boxShadow:"0 2px 10px rgba(0,0,0,0.5)" }}>
          <button onClick={()=>setNewPtModal(true)} style={{ padding:"8px 12px",background:"rgba(248,113,113,0.09)",color:"rgba(248,113,113,0.85)",border:"none",cursor:"pointer",fontSize:9,fontWeight:800,letterSpacing:"0.07em",textTransform:"uppercase" }}>Reset</button>
          <div style={{ width:1,background:"rgba(255,255,255,0.12)",flexShrink:0 }}/>
          <button onClick={()=>fileInputRef.current.click()} style={{ padding:"8px 12px",background:"transparent",color:"rgba(255,255,255,0.55)",border:"none",cursor:"pointer",fontSize:9,fontWeight:800,letterSpacing:"0.07em",textTransform:"uppercase" }}>Load</button>
        </div>
        <div style={{ display:"flex",alignItems:"stretch",border:`1px solid ${LIME}52`,borderRadius:8,overflow:"hidden",background:LIME+"0f",boxShadow:`0 2px 10px ${LIME}14`,opacity:saving?0.5:1 }}>
          <button onClick={handleSavePDF} disabled={saving} style={{ padding:"8px 14px",background:"transparent",color:LIME+"f2",border:"none",cursor:saving?"default":"pointer",fontSize:9,fontWeight:800,letterSpacing:"0.07em",textTransform:"uppercase" }}>{saving?"Saving…":"Save PDF"}</button>
          <div style={{ width:1,background:LIME+"40",flexShrink:0 }}/>
          <button onClick={handleAirDrop} disabled={saving} title="Share / AirDrop" style={{ padding:"6px 10px",background:"transparent",border:"none",cursor:saving?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
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
