import { useState, useRef, useEffect, useCallback } from "react";

// ─── THEME CONSTANTS ────────────────────────────────────────────────────────
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

// ─── VIEWPORT + GLOBAL STYLES ───────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("trm-apre-styles")) {
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1";
    document.head.appendChild(meta);
  }
  const s = document.createElement("style");
  s.id = "trm-apre-styles";
  s.textContent = `
    html, body { overscroll-behavior-y: none; }
    input[type="number"] { font-size: 16px !important; min-height: 44px !important; }
    @media (max-width: 700px) {
      .apre-grid2 { grid-template-columns: 1fr !important; }
      .apre-fab { bottom: 16px !important; right: 12px !important; }
      .apre-fab button { padding: 10px 12px !important; font-size: 11px !important; min-height: 44px; }
    }
  `;
  document.head.appendChild(s);
}

// ─── PROTOCOL DATA ──────────────────────────────────────────────────────────
const PROTO = {
  "APRE 10": {
    id: "10", label: "APRE 10 — Muscular Endurance",
    desc: "10RM protocol — hypertrophy / endurance emphasis. Ideal for early-phase rehab, muscle activation, and tissue tolerance building.",
    sets: [
      { label: "Set 1 — Warm-Up", pct: 50, reps: 12 },
      { label: "Set 2 — Light Load", pct: 75, reps: 10 },
      { label: "Set 3 — Working Set", pct: 100, reps: "AMRAP" },
      { label: "Set 4 — Adjusted", pct: null, reps: "AMRAP" },
    ],
    adj3: [
      { range: "0–2 reps", action: "Decrease 5–10 lbs", color: RED_BAD },
      { range: "3–4 reps", action: "Decrease 0–5 lbs", color: GOLD },
      { range: "5–6 reps", action: "Keep same weight", color: LIME },
      { range: "7–8 reps", action: "Keep same weight", color: LIME },
      { range: "9–11 reps", action: "Increase 0–5 lbs", color: GOLD },
      { range: "12–16 reps", action: "Increase 5–10 lbs", color: BLUE },
      { range: "17+ reps", action: "Increase 10–15 lbs", color: BLUE },
    ],
    adj4: [
      { range: "0–2 reps", action: "Decrease 5–10 lbs next session", color: RED_BAD },
      { range: "3–4 reps", action: "Decrease 0–5 lbs next session", color: GOLD },
      { range: "5–6 reps", action: "Keep same weight next session", color: LIME },
      { range: "7–8 reps", action: "Keep same weight next session", color: LIME },
      { range: "9–11 reps", action: "Increase 0–5 lbs next session", color: GOLD },
      { range: "12–16 reps", action: "Increase 5–10 lbs next session", color: BLUE },
      { range: "17+ reps", action: "Increase 10–15 lbs next session", color: BLUE },
    ],
  },
  "APRE 6": {
    id: "6", label: "APRE 6 — Strength / Hypertrophy",
    desc: "6RM protocol — balanced strength and hypertrophy. The most commonly used APRE protocol in rehab settings.",
    sets: [
      { label: "Set 1 — Warm-Up", pct: 50, reps: 10 },
      { label: "Set 2 — Moderate", pct: 75, reps: 6 },
      { label: "Set 3 — Working Set", pct: 100, reps: "AMRAP" },
      { label: "Set 4 — Adjusted", pct: null, reps: "AMRAP" },
    ],
    adj3: [
      { range: "0–2 reps", action: "Decrease 5–10 lbs", color: RED_BAD },
      { range: "3–4 reps", action: "Decrease 0–5 lbs", color: GOLD },
      { range: "5–7 reps", action: "Keep same weight", color: LIME },
      { range: "8–12 reps", action: "Increase 5–10 lbs", color: BLUE },
      { range: "13+ reps", action: "Increase 10–15 lbs", color: BLUE },
    ],
    adj4: [
      { range: "0–2 reps", action: "Decrease 5–10 lbs next session", color: RED_BAD },
      { range: "3–4 reps", action: "Decrease 0–5 lbs next session", color: GOLD },
      { range: "5–7 reps", action: "Keep same weight next session", color: LIME },
      { range: "8–12 reps", action: "Increase 5–10 lbs next session", color: BLUE },
      { range: "13+ reps", action: "Increase 10–15 lbs next session", color: BLUE },
    ],
  },
  "APRE 3": {
    id: "3", label: "APRE 3 — Max Strength / Power",
    desc: "3RM protocol — max strength emphasis. For late-stage rehab, return-to-sport strength targets, and peaking phases.",
    sets: [
      { label: "Set 1 — Warm-Up", pct: 50, reps: 6 },
      { label: "Set 2 — Moderate", pct: 75, reps: 3 },
      { label: "Set 3 — Working Set", pct: 100, reps: "AMRAP" },
      { label: "Set 4 — Adjusted", pct: null, reps: "AMRAP" },
    ],
    adj3: [
      { range: "1–2 reps", action: "Decrease 5–10 lbs", color: RED_BAD },
      { range: "3–4 reps", action: "Keep same weight", color: LIME },
      { range: "5–6 reps", action: "Increase 5–10 lbs", color: BLUE },
      { range: "7+ reps", action: "Increase 10–15 lbs", color: BLUE },
    ],
    adj4: [
      { range: "1–2 reps", action: "Decrease 5–10 lbs next session", color: RED_BAD },
      { range: "3–4 reps", action: "Keep same weight next session", color: LIME },
      { range: "5–6 reps", action: "Increase 5–10 lbs next session", color: BLUE },
      { range: "7+ reps", action: "Increase 10–15 lbs next session", color: BLUE },
    ],
  },
};

// ─── PROGRESSION TIMELINE ───────────────────────────────────────────────────
const TIMELINE = [
  { phase: "Phase 1", wks: "Weeks 1–2", proto: "APRE 10", focus: "Tissue tolerance, activation, motor pattern re-education", color: LIME },
  { phase: "Phase 2", wks: "Weeks 3–4", proto: "APRE 10", focus: "Endurance base, load capacity building", color: LIME },
  { phase: "Phase 3", wks: "Weeks 5–6", proto: "APRE 6", focus: "Transition to strength emphasis, cross-sectional area", color: GOLD },
  { phase: "Phase 4", wks: "Weeks 7–8", proto: "APRE 6", focus: "Strength building, progressive overload", color: GOLD },
  { phase: "Phase 5", wks: "Weeks 9–10", proto: "APRE 3", focus: "Max strength, neuromuscular recruitment", color: BLUE },
  { phase: "Phase 6", wks: "Weeks 11–12", proto: "APRE 3", focus: "Peaking phase — return-to-sport capacity", color: BLUE },
];

// ─── CALCULATION HELPERS ────────────────────────────────────────────────────
const r5 = (v) => Math.round(v / 5) * 5;
const epley = (w, r) => (r <= 1) ? w : r5(w * (1 + r / 30));

function adjSet4(proto, reps3, wt3) {
  const n = parseInt(reps3);
  if (isNaN(n) || n < 0) return wt3;
  if (proto === "APRE 10") {
    if (n <= 2) return r5(wt3 - 10);
    if (n <= 4) return r5(wt3 - 5);
    if (n <= 8) return wt3;
    if (n <= 11) return r5(wt3 + 5);
    if (n <= 16) return r5(wt3 + 10);
    return r5(wt3 + 15);
  }
  if (proto === "APRE 6") {
    if (n <= 2) return r5(wt3 - 10);
    if (n <= 4) return r5(wt3 - 5);
    if (n <= 7) return wt3;
    if (n <= 12) return r5(wt3 + 10);
    return r5(wt3 + 15);
  }
  // APRE 3
  if (n <= 2) return r5(wt3 - 10);
  if (n <= 4) return wt3;
  if (n <= 6) return r5(wt3 + 10);
  return r5(wt3 + 15);
}

function nextSession(proto, reps4, wt4) {
  const n = parseInt(reps4);
  if (isNaN(n) || n < 0) return wt4;
  if (proto === "APRE 10") {
    if (n <= 2) return r5(wt4 - 10);
    if (n <= 4) return r5(wt4 - 5);
    if (n <= 8) return wt4;
    if (n <= 11) return r5(wt4 + 5);
    if (n <= 16) return r5(wt4 + 10);
    return r5(wt4 + 15);
  }
  if (proto === "APRE 6") {
    if (n <= 2) return r5(wt4 - 10);
    if (n <= 4) return r5(wt4 - 5);
    if (n <= 7) return wt4;
    if (n <= 12) return r5(wt4 + 10);
    return r5(wt4 + 15);
  }
  // APRE 3
  if (n <= 2) return r5(wt4 - 10);
  if (n <= 4) return wt4;
  if (n <= 6) return r5(wt4 + 10);
  return r5(wt4 + 15);
}

// ─── STYLE HELPERS ──────────────────────────────────────────────────────────
const inp = {
  background: "#1c1c1c", border: `1px solid #2e2e2e`, borderRadius: 6,
  padding: "10px 14px", color: WHITE, fontSize: 16, width: "100%",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  textAlign: "center", minHeight: 44,
};

const lbl = {
  display: "block", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
  color: MUTED, textTransform: "uppercase", marginBottom: 4,
};

// ─── CARD COMPONENT ─────────────────────────────────────────────────────────
function Card({ title, accent, children }) {
  const borderColor = accent ? LIME + "44" : BORDER;
  const headerBg = accent ? `linear-gradient(90deg,${LIME}18,transparent)` : "#161616";
  const barColor = accent ? LIME : "#444";
  const titleColor = accent ? LIME : "#888";
  return (
    <div style={{ background: CARD, borderRadius: 12, marginBottom: 20, overflow: "hidden", border: `1px solid ${borderColor}`, boxShadow: accent ? `0 0 24px ${LIME}18` : "0 2px 12px rgba(0,0,0,0.4)" }}>
      <div style={{ padding: "12px 20px", background: headerBg, borderBottom: `1px solid ${accent ? LIME + "33" : BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: barColor }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: titleColor, textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── SET TABLE ROW ──────────────────────────────────────────────────────────
function SetRow({ label, load, reps, highlight, isInput, inputValue, onInput, unit }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, padding: "10px 14px",
      background: highlight ? LIME + "0a" : "transparent",
      borderBottom: `1px solid ${BORDER}22`, alignItems: "center",
    }}>
      <div style={{ fontSize: 12, fontWeight: highlight ? 800 : 600, color: highlight ? LIME : "#aaa" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: highlight ? LIME : WHITE, textAlign: "center" }}>
        {load != null ? `${load} ${unit || "lbs"}` : "—"}
      </div>
      {isInput ? (
        <input
          style={{ ...inp, padding: "6px 10px", fontSize: 14, fontWeight: 700 }}
          type="number" min="0" step="1" placeholder="reps"
          value={inputValue} onChange={e => onInput(e.target.value)}
        />
      ) : (
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: highlight ? LIME : WHITE, textAlign: "center" }}>
          {reps}
        </div>
      )}
    </div>
  );
}

// ─── EXERCISE CALCULATOR CARD ───────────────────────────────────────────────
function ExerciseCard({ title, icon, proto, protoKey }) {
  const [rm, setRm] = useState("");
  const [reps3, setReps3] = useState("");
  const [reps4, setReps4] = useState("");

  const p = PROTO[protoKey];
  const rmNum = parseFloat(rm) || 0;
  const set1Load = r5(rmNum * p.sets[0].pct / 100);
  const set2Load = r5(rmNum * p.sets[1].pct / 100);
  const set3Load = rmNum > 0 ? r5(rmNum) : 0;
  const set4Load = (rmNum > 0 && reps3 !== "") ? adjSet4(protoKey, reps3, set3Load) : null;
  const est1RM = (set4Load && reps4 !== "") ? epley(set4Load, parseInt(reps4) || 0) : null;
  const nextWt = (set4Load && reps4 !== "") ? nextSession(protoKey, reps4, set4Load) : null;

  return (
    <Card title={`${icon}  ${title}`} accent={rmNum > 0}>
      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>{protoKey.replace("APRE ", "")}RM Working Weight (lbs)</label>
        <input style={inp} type="number" min="0" step="5" placeholder="Enter estimated RM" value={rm} onChange={e => setRm(e.target.value)} />
      </div>
      {rmNum > 0 && (
        <>
          {/* Set table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, padding: "8px 14px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Set</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>Load</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>Reps</div>
          </div>
          <SetRow label={p.sets[0].label} load={set1Load} reps={p.sets[0].reps} />
          <SetRow label={p.sets[1].label} load={set2Load} reps={p.sets[1].reps} />
          <SetRow label={p.sets[2].label} load={set3Load} reps="AMRAP" highlight isInput inputValue={reps3} onInput={setReps3} />
          <SetRow label={p.sets[3].label} load={set4Load} reps="AMRAP" highlight isInput inputValue={reps4} onInput={setReps4} />

          {/* Results */}
          {est1RM && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ padding: "12px 14px", borderRadius: 8, background: "#0f0f0f", border: `1px solid ${LIME}33`, textAlign: "center" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Estimated 1RM</div>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: LIME }}>{est1RM} lbs</div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 8, background: "#0f0f0f", border: `1px solid ${GOLD}33`, textAlign: "center" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Next Session Weight</div>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: GOLD }}>{nextWt} lbs</div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ─── WORKOUTS TAB ───────────────────────────────────────────────────────────
function WorkoutsTab({ protoKey }) {
  const [keRM, setKeRM] = useState("");
  const [lpRM, setLpRM] = useState("");
  const p = PROTO[protoKey];
  const keNum = parseFloat(keRM) || 0;
  const lpNum = parseFloat(lpRM) || 0;

  const generateWeek = (rmVal, exerciseName) => {
    if (rmVal <= 0) return null;
    return [1, 2, 3].map(day => {
      const s1 = r5(rmVal * p.sets[0].pct / 100);
      const s2 = r5(rmVal * p.sets[1].pct / 100);
      const s3 = r5(rmVal);
      return { day, exercise: exerciseName, s1, s2, s3, s1r: p.sets[0].reps, s2r: p.sets[1].reps };
    });
  };

  const keWeek = generateWeek(keNum, "Knee Extension");
  const lpWeek = generateWeek(lpNum, "Leg Press");

  return (
    <div>
      <Card title="Weekly Workout Generator" accent>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 16, lineHeight: 1.7 }}>
          Enter your current estimated RM for each exercise to generate a week of {protoKey} programming. Each day uses the same starting loads — the APRE auto-regulation adjusts weight within the session based on Set 3 and Set 4 rep performance.
        </div>
        <div className="apre-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={lbl}>Knee Extension — {protoKey.replace("APRE ", "")}RM (lbs)</label>
            <input style={inp} type="number" min="0" step="5" placeholder="e.g. 80" value={keRM} onChange={e => setKeRM(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Leg Press — {protoKey.replace("APRE ", "")}RM (lbs)</label>
            <input style={inp} type="number" min="0" step="5" placeholder="e.g. 200" value={lpRM} onChange={e => setLpRM(e.target.value)} />
          </div>
        </div>
      </Card>

      {(keWeek || lpWeek) && [1, 2, 3].map(day => (
        <Card key={day} title={`Day ${day} — ${protoKey}`}>
          {[keWeek, lpWeek].filter(Boolean).map((week, wi) => {
            const d = week[day - 1];
            return (
              <div key={wi} style={{ marginBottom: wi === 0 && lpWeek ? 20 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: LIME, marginBottom: 8 }}>{d.exercise}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Set 1", load: d.s1, reps: d.s1r },
                    { label: "Set 2", load: d.s2, reps: d.s2r },
                    { label: "Set 3", load: d.s3, reps: "AMRAP" },
                    { label: "Set 4", load: "Adjusted", reps: "AMRAP" },
                  ].map((s, si) => (
                    <div key={si} style={{ padding: "8px 10px", borderRadius: 6, background: "#0f0f0f", border: `1px solid ${si >= 2 ? LIME + "33" : BORDER}`, textAlign: "center" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", color: si >= 2 ? LIME : WHITE }}>{typeof s.load === "number" ? `${s.load} lbs` : s.load}</div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>× {s.reps}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
      ))}
    </div>
  );
}

// ─── PROGRESSION TIMELINE TAB ───────────────────────────────────────────────
function ProgressionTab({ protoKey }) {
  return (
    <div>
      <Card title="APRE Progression Timeline" accent>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 20, lineHeight: 1.7 }}>
          Suggested 12-week periodization model progressing through all three APRE protocols. Current protocol is highlighted. Adjust timing based on patient response and clinical judgment.
        </div>
        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 2, background: BORDER }} />
          {TIMELINE.map((t, i) => {
            const active = protoKey === t.proto;
            return (
              <div key={i} style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start", position: "relative" }}>
                {/* Dot */}
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  background: active ? t.color : "#222",
                  border: `2px solid ${active ? t.color : BORDER}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: active ? `0 0 12px ${t.color}44` : "none",
                  zIndex: 1, marginTop: 3,
                }}>
                  {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: BLACK }} />}
                </div>
                {/* Content */}
                <div style={{
                  flex: 1, padding: "12px 16px", borderRadius: 10,
                  background: active ? t.color + "12" : "#111",
                  border: `1px solid ${active ? t.color + "55" : BORDER}`,
                  boxShadow: active ? `0 0 16px ${t.color}22` : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: active ? t.color : WHITE }}>{t.phase}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.color, letterSpacing: "0.1em" }}>{t.proto}</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, marginBottom: 4 }}>{t.wks}</div>
                  <div style={{ fontSize: 11, color: active ? "#ccc" : "#888", lineHeight: 1.5 }}>{t.focus}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 6-Week Block History */}
      <Card title="6-Week Block Structure">
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.7 }}>
          Each 6-week block represents a full mesocycle. Track estimated 1RM trends across blocks to ensure progressive overload.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { label: "Block 1", wks: "Wks 1–6", protos: "APRE 10 → APRE 6", color: LIME },
            { label: "Block 2", wks: "Wks 7–12", protos: "APRE 6 → APRE 3", color: GOLD },
            { label: "Block 3", wks: "Wks 13–18", protos: "Repeat / Sport-Specific", color: BLUE },
          ].map((b, i) => (
            <div key={i} style={{ padding: "14px", borderRadius: 10, background: "#111", border: `1px solid ${b.color}33`, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: b.color, marginBottom: 4 }}>{b.label}</div>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{b.wks}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{b.protos}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── REFERENCE TAB ──────────────────────────────────────────────────────────
function ReferenceTab() {
  return (
    <div>
      {Object.keys(PROTO).map(key => {
        const p = PROTO[key];
        return (
          <Card key={key} title={p.label}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>{p.desc}</div>

            {/* Set Structure */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: LIME, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Set Structure</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {p.sets.map((s, i) => (
                  <div key={i} style={{ padding: "10px", borderRadius: 8, background: "#0f0f0f", border: `1px solid ${i >= 2 ? LIME + "33" : BORDER}`, textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{`Set ${i + 1}`}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: i >= 2 ? LIME : WHITE }}>{s.pct ? `${s.pct}%` : "Adj"}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>× {s.reps}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Adjustment Tables */}
            {[
              { label: "Set 3 Rep Adjustment (→ Set 4 Load)", data: p.adj3 },
              { label: "Set 4 Rep Adjustment (→ Next Session)", data: p.adj4 },
            ].map((table, ti) => (
              <div key={ti} style={{ marginBottom: ti === 0 ? 20 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{table.label}</div>
                <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", background: "#141414", padding: "8px 14px", borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Reps Achieved</div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>Action</div>
                  </div>
                  {table.data.map((row, ri) => (
                    <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", padding: "8px 14px", borderBottom: ri < table.data.length - 1 ? `1px solid ${BORDER}22` : "none", background: ri % 2 === 0 ? "#111" : "transparent" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: row.color }}>{row.range}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#ccc" }}>{row.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        );
      })}

      {/* Epley Formula Reference */}
      <Card title="Estimated 1RM — Epley Formula">
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
          <strong style={{ color: WHITE }}>1RM = Weight × (1 + Reps / 30)</strong>
          <br /><br />
          The Epley formula is used to estimate a 1-rep maximum from sub-maximal performance. All estimated 1RM values in this calculator use this formula applied to Set 4 data (adjusted load × reps achieved). Values are rounded to the nearest 5 lbs.
        </div>
      </Card>
    </div>
  );
}

// ─── PDF EXPORT ─────────────────────────────────────────────────────────────
let _jsPDFResolve;
const _jsPDFPromise = new Promise(res => { _jsPDFResolve = res; });
if (typeof window !== "undefined") {
  if (window.jspdf) { _jsPDFResolve(window.jspdf); }
  else {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => _jsPDFResolve(window.jspdf);
    document.head.appendChild(script);
  }
}
const getJsPDF = () => _jsPDFPromise;

// ─── PATIENT INFO MODAL ────────────────────────────────────────────────────
function PatientInfoModal({ open, onClose, onExport }) {
  const [ptName, setPtName] = useState("");
  const [date, setDate] = useState("");
  const [therapist, setTherapist] = useState("");
  const [notes, setNotes] = useState("");

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}>
      <div style={{ background: "#141414", border: `1px solid ${BORDER}`, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, maxHeight: "85vh", overflow: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.8)" }}>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: WHITE }}>Export Session PDF</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Optional — leave blank to omit from PDF.</div>
          <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={lbl}>Patient Name</label>
              <input style={{ ...inp, textAlign: "left" }} type="text" placeholder="Full name" value={ptName} onChange={e => setPtName(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Date</label>
              <input style={{ ...inp, textAlign: "left" }} type="text" placeholder="MM/DD/YYYY" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Therapist</label>
              <input style={{ ...inp, textAlign: "left" }} type="text" placeholder="Name, credentials" value={therapist} onChange={e => setTherapist(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Clinical Notes</label>
              <textarea style={{ ...inp, textAlign: "left", height: 80, resize: "vertical" }} placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          <button onClick={() => onExport({ ptName, date, therapist, notes })} style={{
            width: "100%", padding: 14, borderRadius: 10, fontSize: 13, fontWeight: 900,
            letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
            background: `linear-gradient(135deg,${LIME},${LIME_DIM})`, color: BLACK, border: "none",
          }}>
            ⬇ Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [protoKey, setProtoKey] = useState("APRE 6");
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const tabs = [
    { label: "Calculator", sub: "Set Loads" },
    { label: "Workouts", sub: "Weekly Plan" },
    { label: "Progression", sub: "Timeline" },
    { label: "Reference", sub: "Tables" },
  ];

  const handleExportPDF = async (info) => {
    setPdfModalOpen(false);
    const { jsPDF } = await getJsPDF();
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = 612, H = 792;
    const L = 48, R = W - 48;

    // ─── PAGE 1: Clinician Summary ───
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, W, H, "F");

    // Header bar
    doc.setFillColor(17, 17, 17);
    doc.rect(0, 0, W, 44, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("TRM", L, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("APRE Calculator — Session Summary", L + 50, 30);

    const today = info.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.text(today, R - doc.getTextWidth(today), 30);

    let y = 68;

    // Patient info
    if (info.ptName || info.therapist) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "bold");
      doc.text("PATIENT INFORMATION", L, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      if (info.ptName) { doc.text(`Patient: ${info.ptName}`, L, y); y += 14; }
      if (info.therapist) { doc.text(`Therapist: ${info.therapist}`, L, y); y += 14; }
      y += 8;
    }

    // Protocol
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "bold");
    doc.text("PROTOCOL", L, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(184, 255, 87);
    doc.text(PROTO[protoKey].label, L, y);
    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    const descLines = doc.splitTextToSize(PROTO[protoKey].desc, R - L);
    doc.text(descLines, L, y);
    y += descLines.length * 12 + 14;

    // Set structure
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "bold");
    doc.text("SET STRUCTURE", L, y);
    y += 14;
    PROTO[protoKey].sets.forEach((s, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      const pctStr = s.pct ? `${s.pct}%` : "Adjusted";
      doc.text(`Set ${i + 1}: ${pctStr} × ${s.reps}`, L + 10, y);
      y += 13;
    });
    y += 12;

    // Adjustment tables
    ["adj3", "adj4"].forEach((adjKey) => {
      const tableLabel = adjKey === "adj3" ? "SET 3 ADJUSTMENT → SET 4 LOAD" : "SET 4 ADJUSTMENT → NEXT SESSION";
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "bold");
      doc.text(tableLabel, L, y);
      y += 14;
      PROTO[protoKey][adjKey].forEach(row => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        doc.text(`${row.range}:  ${row.action}`, L + 10, y);
        y += 12;
      });
      y += 10;
    });

    // Notes
    if (info.notes) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "bold");
      doc.text("CLINICAL NOTES", L, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      const noteLines = doc.splitTextToSize(info.notes, R - L);
      doc.text(noteLines, L, y);
    }

    // Footer
    doc.setDrawColor(40, 40, 40);
    doc.line(L, H - 48, R, H - 48);
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("TRM APRE Calculator — Clinician Reference Copy", L, H - 36);
    doc.text("https://trm-apre.vercel.app/", R - doc.getTextWidth("https://trm-apre.vercel.app/"), H - 36);

    // ─── PAGE 2: Patient Take-Home ───
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, "F");

    // Header
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, W, 44, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text("TRM", L, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("APRE Exercise Card — Patient Copy", L + 45, 28);
    doc.text(today, R - doc.getTextWidth(today), 28);

    y = 64;

    if (info.ptName) {
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(info.ptName, L, y);
      y += 16;
    }

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Protocol: ${protoKey}`, L, y);
    y += 20;

    // Workout table header
    doc.setFillColor(240, 240, 240);
    doc.rect(L, y, R - L, 18, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    const cols = [L + 10, L + 100, L + 200, L + 300, L + 400];
    doc.text("SET", cols[0], y + 12);
    doc.text("LOAD", cols[1], y + 12);
    doc.text("REPS", cols[2], y + 12);
    doc.text("COMPLETED", cols[3], y + 12);
    y += 22;

    PROTO[protoKey].sets.forEach((s, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(`Set ${i + 1}`, cols[0], y + 12);
      doc.text(s.pct ? `${s.pct}%` : "Adjusted", cols[1], y + 12);
      doc.text(String(s.reps), cols[2], y + 12);
      // Empty box for patient to write in
      doc.setDrawColor(180, 180, 180);
      doc.rect(cols[3], y + 2, 60, 14);
      y += 20;
    });

    y += 16;

    // Instructions
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.text("INSTRUCTIONS", L, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const instructions = [
      "1. Perform Set 1 and Set 2 at the prescribed load and reps.",
      "2. Set 3: Use your full working weight and perform as many reps as possible (AMRAP).",
      "3. Record your Set 3 reps — your therapist will adjust Set 4 load based on performance.",
      "4. Set 4: Perform AMRAP at the adjusted load. Record reps completed.",
      "5. Your next session starting weight is based on Set 4 performance.",
    ];
    instructions.forEach(line => {
      doc.text(line, L + 10, y);
      y += 13;
    });

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(L, H - 48, R, H - 48);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("TRM APRE Calculator — Patient Take-Home Copy", L, H - 36);

    // Save
    const fileName = info.ptName
      ? `TRM_APRE_${info.ptName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`
      : `TRM_APRE_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  return (
    <div style={{ background: BLACK, minHeight: "100vh", color: WHITE, fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
      <PatientInfoModal open={pdfModalOpen} onClose={() => setPdfModalOpen(false)} onExport={handleExportPDF} />

      {/* ─── STICKY HEADER ─── */}
      <div style={{ background: DARK, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: "'Arial Black',Impact,sans-serif", fontSize: 28, fontWeight: 900, color: WHITE, letterSpacing: "-1px" }}>TRM</span>
              <span style={{ color: BORDER, fontSize: 18 }}>|</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#777", letterSpacing: "0.08em", textTransform: "uppercase" }}>APRE Calculator</span>
            </div>
          </div>

          {/* Protocol selector */}
          <div style={{ display: "flex", gap: 6, paddingBottom: 10 }}>
            {Object.keys(PROTO).map(key => (
              <button key={key} onClick={() => setProtoKey(key)} style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                cursor: "pointer", letterSpacing: "0.06em",
                background: protoKey === key ? LIME : "transparent",
                border: `2px solid ${protoKey === key ? LIME : BORDER}`,
                color: protoKey === key ? BLACK : MUTED,
                transition: "all 0.15s",
              }}>
                {key}
              </button>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", borderTop: `1px solid ${BORDER}` }}>
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                padding: "10px 22px", background: "transparent", border: "none",
                borderBottom: `3px solid ${activeTab === i ? LIME : "transparent"}`,
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: activeTab === i ? LIME : "#666" }}>{t.label}</div>
                <div style={{ fontSize: 9, color: activeTab === i ? LIME + "88" : "#444", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {/* Protocol description banner */}
        {activeTab === 0 && (
          <div style={{
            marginBottom: 20, padding: "14px 18px", borderRadius: 10,
            background: LIME + "0a", border: `1px solid ${LIME}33`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: LIME, marginBottom: 4 }}>{PROTO[protoKey].label}</div>
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>{PROTO[protoKey].desc}</div>
          </div>
        )}

        {activeTab === 0 && (
          <div className="apre-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <ExerciseCard title="Knee Extension" icon="🦵" proto={protoKey} protoKey={protoKey} />
            <ExerciseCard title="Leg Press" icon="🏋️" proto={protoKey} protoKey={protoKey} />
          </div>
        )}
        {activeTab === 1 && <WorkoutsTab protoKey={protoKey} />}
        {activeTab === 2 && <ProgressionTab protoKey={protoKey} />}
        {activeTab === 3 && <ReferenceTab />}
      </div>

      {/* ─── FOOTER ─── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 20px", textAlign: "center" }}>
        <span style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, color: WHITE, fontSize: 13 }}>TRM</span>
        <span style={{ color: MUTED, fontSize: 11, marginLeft: 10 }}>APRE Calculator — Auto-regulation strength training for rehabilitation</span>
      </div>

      {/* ─── FAB ─── */}
      <div className="apre-fab" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setPdfModalOpen(true)} style={{
          padding: "10px 18px", borderRadius: 10,
          border: `1px solid ${LIME}55`, background: LIME + "18",
          color: LIME, cursor: "pointer", fontSize: 11, fontWeight: 800,
          letterSpacing: "0.08em", textTransform: "uppercase",
          boxShadow: `0 4px 16px ${LIME}22`,
        }}>
          Save PDF
        </button>
      </div>
    </div>
  );
}
