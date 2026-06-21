import { useEffect } from 'react';
import QRCode from 'qrcode';

// ── APP URL ───────────────────────────────────────────────────────────────────
var APP_URL = '';

// ── DATA ──────────────────────────────────────────────────────────────────────
var PROTO = {
  apre10:{name:"APRE 10",phase:"Hypertrophy / Tissue Loading",wk:"Weeks 6-10 post-op",s1r:10,s2r:10,
    s3:[{x:6,l:"<=6",d:[-10,-5],z:"dn"},{x:8,l:"7-8",d:[-5,0],z:"dn"},{x:11,l:"9-11",d:[0,0],z:"sa"},{x:13,l:"12-13",d:[5,10],z:"up"},{x:999,l:">=14",d:[10,15],z:"up"}],
    s4:[{x:6,l:"<=6",n:[-10,-5],z:"dn"},{x:8,l:"7-8",n:[-5,0],z:"dn"},{x:11,l:"9-11",n:[0,0],z:"sa"},{x:13,l:"12-13",n:[5,10],z:"up"},{x:999,l:">=14",n:[10,15],z:"up"}],
    w2p:0.65,w3p:0.68,w2s:"2 x 10",w3s:"3 x 8",w3t:"(0-2-5-2) Tempo",
    w2companions:[
      {name:"Terminal Knee Extension",detail:"3 x 15 each · VMO activation · band at knee · full terminal extension",load:"Light band",pct:null},
      {name:"Hip Thrust",detail:"3 x 12 · bilateral · drive through heels · 2-sec hold at top",load:null,pct:0.30,base:"lp"},
      {name:"Side-lying Hip Abduction",detail:"3 x 15 each · slow and controlled · no trunk rotation",load:"Bodyweight",pct:null},
      {name:"Standing Calf Raise",detail:"3 x 15 · full range · 3-sec eccentric lower · ankle stability",load:"Bodyweight",pct:null}
    ],
    w3companions:[
      {name:"Romanian Deadlift",detail:"3 x 10 · hip hinge · neutral spine · hamstring stretch at bottom",load:null,pct:0.25,base:"lp"},
      {name:"Band Hip Abduction",detail:"3 x 15 each direction · upright posture · frontal plane control",load:"Light band",pct:null},
      {name:"Single-leg Balance",detail:"3 x 30s each · slight knee bend · progress to eyes closed",load:"Bodyweight",pct:null},
      {name:"Seated Calf Raise",detail:"3 x 15 · soleus focus · reduces knee joint stress · full ROM",load:"Bodyweight",pct:null}
    ]},
  apre6:{name:"APRE 6",phase:"Strength Development",wk:"Weeks 10-16 post-op",s1r:6,s2r:6,
    s3:[{x:2,l:"0-2",d:[-10,-5],z:"dn"},{x:4,l:"3-4",d:[-5,0],z:"dn"},{x:7,l:"5-7",d:[0,0],z:"sa"},{x:9,l:"8-9",d:[5,10],z:"up"},{x:999,l:">=10",d:[10,15],z:"up"}],
    s4:[{x:2,l:"0-2",n:[-10,-5],z:"dn"},{x:4,l:"3-4",n:[-5,0],z:"dn"},{x:7,l:"5-7",n:[0,0],z:"sa"},{x:9,l:"8-9",n:[5,10],z:"up"},{x:999,l:">=10",n:[10,15],z:"up"}],
    w2p:0.75,w3p:0.80,w2s:"3 x 5",w3s:"4 x 4",w3t:"Controlled eccentric",
    w2companions:[
      {name:"Goblet Squat",detail:"3 x 8 · 3-sec eccentric · chest tall · knee tracking over 2nd toe",load:null,pct:0.30,base:"ke"},
      {name:"Nordic Hamstring Curl",detail:"3 x 6 · slow eccentric only · partner or anchor · do not hyperextend",load:"Bodyweight",pct:null},
      {name:"Forward Step-Up",detail:"3 x 10 each · drive through heel · full hip extension at top",load:"Bodyweight",pct:null},
      {name:"Copenhagen Adductor",detail:"3 x 8 each · side-plank position · inner thigh · no trunk drop",load:"Bodyweight",pct:null}
    ],
    w3companions:[
      {name:"Bulgarian Split Squat",detail:"3 x 8 each · rear foot elevated · upright torso · knee over toe",load:null,pct:0.25,base:"ke"},
      {name:"Romanian Deadlift",detail:"3 x 10 · hip hinge · neutral spine · bilateral",load:null,pct:0.30,base:"lp"},
      {name:"Lateral Band Walk",detail:"3 x 15 each direction · medium band · mini-squat position · no trunk sway",load:"Med band",pct:null},
      {name:"Single-leg Balance (Eyes Closed)",detail:"3 x 30s each · slight knee bend · proprioceptive progression",load:"Bodyweight",pct:null}
    ]},
  apre3:{name:"APRE 3",phase:"Max Strength / Power Foundation",wk:"Weeks 16+ / Pre-RTS",s1r:5,s2r:3,
    s3:[{x:1,l:"0-1",d:[-10,-5],z:"dn"},{x:3,l:"2-3",d:[0,0],z:"sa"},{x:5,l:"4-5",d:[5,10],z:"up"},{x:999,l:">=6",d:[10,15],z:"up"}],
    s4:[{x:1,l:"0-1",n:[-10,-5],z:"dn"},{x:3,l:"2-3",n:[0,0],z:"sa"},{x:5,l:"4-5",n:[5,10],z:"up"},{x:999,l:">=6",n:[10,15],z:"up"}],
    w2p:0.85,w3p:0.90,w2s:"3 x 3",w3s:"5 x 3",w3t:"Max intent / explosive",
    w2companions:[
      {name:"Trap Bar Deadlift",detail:"4 x 4 · max intent · explosive drive · neutral spine · full hip extension",load:null,pct:0.50,base:"lp"},
      {name:"Nordic Hamstring Curl",detail:"4 x 5 · max eccentric · partner or anchor · 4-sec lower phase",load:"Bodyweight",pct:null},
      {name:"Single-leg Press",detail:"3 x 6 each · full extension · controlled return · 2-sec eccentric",load:null,pct:0.55,base:"lp"},
      {name:"Bilateral Depth Drop",detail:"3 x 8 · step off 20-30cm box · land softly · absorb at hip and knee",load:"Bodyweight",pct:null}
    ],
    w3companions:[
      {name:"Bulgarian Split Squat",detail:"4 x 4 each · rear foot elevated · heavy load · max strength intent",load:null,pct:0.40,base:"ke"},
      {name:"Single-leg RDL",detail:"3 x 8 each · reach opposite hand · hamstring focus · control the descent",load:null,pct:0.20,base:"lp"},
      {name:"Lateral Bound",detail:"3 x 6 each direction · stick the landing · 2-sec pause · frontal plane power",load:"Bodyweight",pct:null},
      {name:"Reactive Step-Up",detail:"3 x 8 each · quick ground contact · drive knee up · sport-prep RFD",load:"Bodyweight",pct:null}
    ]}
};

var TL = [
  {l:"Phase 1",w:"Wks 0-6",c:"#444",items:["ROM restoration","Quad activation","NMES","Gait training"],note:"APRE not yet indicated. Focus on swelling control and neuromuscular re-education."},
  {l:"APRE 10",w:"Wks 6-10",c:"#b8ff57",items:["10RM protocol","Limited-arc KE","SL Leg Press","Volume focus"],note:"Autoregulate each session. Goal is tissue tolerance and hypertrophy before advancing."},
  {l:"APRE 6",w:"Wks 10-16",c:"#fbbf24",items:["6RM protocol","Full ROM KE","Bilateral squat","Hip & hamstring"],note:"Graft maturation supports heavier loading. Shift from volume to intensity."},
  {l:"APRE 3",w:"Wks 16+",c:"#f87171",items:["3RM protocol","Heavy unilateral","Rate of force dev","Plyo bridge"],note:"Final strength phase before RTS. Pair with plyometric program and formal testing."},
  {l:"RTS Criteria",w:"9-12 mo",c:"#a78bfa",items:["LSI >=90%","Hop battery","Force plate","Sport-specific"],note:"Strength is one criterion. Full RTS battery including psychological readiness required."}
];

// ── MODULE STATE ──────────────────────────────────────────────────────────────
var proto = "apre10";
var S = {
  ke:{ww:null,s3r:null,s4r:null,s4w:null,rm:null,nextw:null},
  lp:{ww:null,s3r:null,s4r:null,s4w:null,rm:null,nextw:null}
};
var SESSION = {
  currentWeek:1, patCode:"",
  hist_ke:[null,null,null,null,null,null],
  hist_lp:[null,null,null,null,null,null],
  prevKEw:null, prevLPw:null, loadedFromQR:false,
  carriedW2:[], carriedW3:[],
  disabledDefaultsW2:[], disabledDefaultsW3:[]
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function r5(v){ return Math.round(v/2.5)*2.5; }
function fw(v){ if(v===null||isNaN(v))return"--"; var r=r5(v); return r%1===0?""+r:r.toFixed(1); }
function epley(w,r){ if(!w||!r||r<=0)return null; return r===1?w:w*(1+r/30); }
function adjR(tbl,r){ for(var i=0;i<tbl.length;i++){ if(r<=tbl[i].x)return tbl[i]; } return tbl[tbl.length-1]; }
function zTag(z){ return z==="up"?"tup":z==="dn"?"tdn":"tsa"; }
function zLbl(z){ return z==="up"?"INCREASE":z==="dn"?"REDUCE":"HOLD"; }
function zEmoji(z){ return z==="up"?"🔼":z==="dn"?"🔽":"✅"; }
function exC(ex){ return ex==="ke"?"var(--lime)":"var(--blue)"; }
function fmtRange(base,delta){
  if(delta[0]===0&&delta[1]===0)return fw(base)+" lbs";
  var lo=r5(base+delta[0]),hi=r5(base+delta[1]);
  return lo===hi?fw(lo)+" lbs":fw(lo)+"-"+fw(hi)+" lbs";
}

// ── QR (npm qrcode package) ───────────────────────────────────────────────────
async function makeQRDataURL(url){
  try {
    return await QRCode.toDataURL(url,{
      width:180, margin:2, errorCorrectionLevel:'M',
      color:{dark:'#000000',light:'#ffffff'}
    });
  } catch(e){ return null; }
}

// ── URL / SESSION ─────────────────────────────────────────────────────────────
function buildQRPayload(){
  var wkNum=parseInt(document.getElementById("s_weeks").value)||SESSION.currentWeek;
  var hke=SESSION.hist_ke.slice(), hlp=SESSION.hist_lp.slice();
  if(S.ke.rm&&wkNum>=1&&wkNum<=6) hke[wkNum-1]=Math.round(S.ke.rm);
  if(S.lp.rm&&wkNum>=1&&wkNum<=6) hlp[wkNum-1]=Math.round(S.lp.rm);
  var pp=PROTO[proto];
  var dw2=[],dw3=[],cw2=[],cw3=[];
  pp.w2companions.forEach(function(c,i){var cb=document.getElementById('excb_w2_'+i);if(cb&&!cb.checked)dw2.push(i);});
  pp.w3companions.forEach(function(c,i){var cb=document.getElementById('excb_w3_'+i);if(cb&&!cb.checked)dw3.push(i);});
  document.querySelectorAll('.ex-custom-row[data-workout="w2"]').forEach(function(row){var n=row.querySelector('.ex-custom-name').value.trim();var d=row.querySelector('.ex-custom-detail').value.trim();if(n)cw2.push({n:n,d:d});});
  document.querySelectorAll('.ex-custom-row[data-workout="w3"]').forEach(function(row){var n=row.querySelector('.ex-custom-name').value.trim();var d=row.querySelector('.ex-custom-detail').value.trim();if(n)cw3.push({n:n,d:d});});
  var payload={wk:wkNum,proto:proto,ke_nw:S.ke.nextw?Math.round(S.ke.nextw):null,lp_nw:S.lp.nextw?Math.round(S.lp.nextw):null,hke:hke,hlp:hlp};
  if(dw2.length)payload.dw2=dw2;
  if(dw3.length)payload.dw3=dw3;
  if(cw2.length)payload.cw2=cw2;
  if(cw3.length)payload.cw3=cw3;
  return APP_URL+"?s="+btoa(JSON.stringify(payload));
}

function loadFromURL(){
  var params=new URLSearchParams(window.location.search);
  var s=params.get("s");
  if(!s)return;
  try {
    var data=JSON.parse(atob(s));
    if(data.proto&&PROTO[data.proto]){ proto=data.proto; }
    SESSION.currentWeek=Math.min((data.wk||1)+1,6);
    SESSION.hist_ke=data.hke||[null,null,null,null,null,null];
    SESSION.hist_lp=data.hlp||[null,null,null,null,null,null];
    SESSION.prevKEw=data.ke_nw||null;
    SESSION.prevLPw=data.lp_nw||null;
    SESSION.loadedFromQR=true;
    SESSION.carriedW2=data.cw2||[];
    SESSION.carriedW3=data.cw3||[];
    SESSION.disabledDefaultsW2=data.dw2||[];
    SESSION.disabledDefaultsW3=data.dw3||[];
    document.getElementById("p10").classList.toggle("on",proto==="apre10");
    document.getElementById("p6").classList.toggle("on",proto==="apre6");
    document.getElementById("p3").classList.toggle("on",proto==="apre3");
    document.getElementById("phLbl").textContent=PROTO[proto].phase;
    document.getElementById("phWk").textContent=PROTO[proto].wk;
    var banner=document.getElementById("wk_banner");
    document.getElementById("wk_num_banner").textContent=SESSION.currentWeek;
    banner.style.display="block";
    if(SESSION.prevKEw){document.getElementById("wk_ke_hint").style.display="block";document.getElementById("wk_ke_hint_val").textContent=fw(SESSION.prevKEw)+" lbs";}
    if(SESSION.prevLPw){document.getElementById("wk_lp_hint").style.display="block";document.getElementById("wk_lp_hint_val").textContent=fw(SESSION.prevLPw)+" lbs";}
    var swk=document.getElementById("s_weeks");
    if(swk)swk.value=SESSION.currentWeek;
    if(SESSION.prevKEw){var kww=document.getElementById("ke_ww");if(kww){kww.value=fw(SESSION.prevKEw);calc("ke");}}
    if(SESSION.prevLPw){var lpww=document.getElementById("lp_ww");if(lpww){lpww.value=fw(SESSION.prevLPw);calc("lp");}}
    drawHistory();
  } catch(e){ console.warn("QR decode failed",e); }
}

// ── SET TABLE ─────────────────────────────────────────────────────────────────
function drawSets(ex,ww){
  var pp=PROTO[proto];
  var s1=ww>0?r5(ww*0.50):null;
  var s2=ww>0?r5(ww*0.75):null;
  var c=exC(ex);
  var rows=[
    {lb:"Set 1",rp:pp.s1r,ld:s1,pt:"50%",hl:false},
    {lb:"Set 2",rp:pp.s2r,ld:s2,pt:"75%",hl:false},
    {lb:"Set 3",rp:"Max",ld:ww>0?ww:null,pt:"100%",hl:true},
    {lb:"Set 4",rp:"Max",ld:null,pt:"Adj.",hl:true,adj:true}
  ];
  var html=rows.map(function(r){
    var tdStyle=r.hl?"color:"+c+";font-weight:700":"";
    var loadCell;
    if(r.adj){loadCell='<span style="color:#333">See below</span>';}
    else if(r.ld!==null){loadCell='<span style="'+(r.hl?"color:"+c+";font-weight:700":"")+'">'+(fw(r.ld))+'</span>';}
    else{loadCell='<span style="color:#333">--</span>';}
    return '<tr class="'+(r.hl?"hl":"")+'">'
      +'<td style="'+tdStyle+'">'+r.lb+'</td>'
      +'<td>'+r.rp+'</td>'
      +'<td>'+loadCell+'</td>'
      +'<td style="color:#444">'+r.pt+'</td>'
      +'</tr>';
  }).join('');
  document.getElementById(ex+"_tbl").innerHTML=html;
}

// ── CALC ──────────────────────────────────────────────────────────────────────
function calc(ex){
  var pp=PROTO[proto];
  var rawWW=document.getElementById(ex+"_ww").value.replace(/[^\d.]/g,"");
  var rawS3=document.getElementById(ex+"_s3").value.replace(/[^\d]/g,"");
  var rawS4=document.getElementById(ex+"_s4").value.replace(/[^\d]/g,"");
  var ww=parseFloat(rawWW)||0;
  var s3n=rawS3!==""?parseInt(rawS3):null;
  var s4n=rawS4!==""?parseInt(rawS4):null;
  S[ex].ww=ww||null; S[ex].s3r=s3n; S[ex].s4r=s4n;
  drawSets(ex,ww);
  var anyInput=["ke_ww","ke_s3","ke_s4","lp_ww","lp_s3","lp_s4"].some(function(id){return document.getElementById(id).value.trim()!=="";});
  document.getElementById("resetBtn").classList.toggle("hidden",!anyInput);
  var c=exC(ex);
  if(s3n!==null&&ww>0){
    var a3=adjR(pp.s3,s3n);
    var s4w=r5(ww+(a3.d[0]+a3.d[1])/2);
    S[ex].s4w=s4w;
    document.getElementById(ex+"_s4rec").classList.remove("hidden");
    document.getElementById(ex+"_s4rec").innerHTML=
      '<div class="rb '+ex+'">'
      +'<div class="rl">Set 4 -- Adjusted Load</div>'
      +'<div class="rm2">'
      +'<div><div class="rw" style="color:'+c+'">'+fmtRange(ww,a3.d)+'</div><div class="rs">go to failure</div></div>'
      +'<span class="rtag '+zTag(a3.z)+'">'+zLbl(a3.z)+'</span>'
      +'</div></div>';
    document.getElementById(ex+"_s4g").classList.remove("hidden");
    if(s4n!==null){
      var rm=epley(s4w,s4n);
      S[ex].rm=rm;
      if(rm){document.getElementById(ex+"_rmb").classList.remove("hidden");document.getElementById(ex+"_rm").textContent=fw(rm)+" lbs";}
      var a4=adjR(pp.s4,s4n);
      var nextw=r5(s4w+(a4.n[0]+a4.n[1])/2);
      S[ex].nextw=nextw;
      document.getElementById(ex+"_next").classList.remove("hidden");
      document.getElementById(ex+"_next").innerHTML=
        '<div class="rb '+ex+'" style="margin-bottom:0">'
        +'<div class="rl">Next Session -- Set 3 Starting Weight</div>'
        +'<div class="rm2">'
        +'<div><div class="rw" style="color:'+c+'">'+fmtRange(s4w,a4.n)+'</div><div class="rs">working weight for Set 3</div></div>'
        +'<span style="font-size:22px">'+zEmoji(a4.z)+'</span>'
        +'</div></div>';
    } else {
      S[ex].rm=null;S[ex].nextw=null;
      document.getElementById(ex+"_next").classList.add("hidden");
      document.getElementById(ex+"_rmb").classList.add("hidden");
    }
  } else {
    S[ex].s4w=null;S[ex].rm=null;S[ex].nextw=null;
    document.getElementById(ex+"_s4rec").classList.add("hidden");
    document.getElementById(ex+"_s4g").classList.add("hidden");
    document.getElementById(ex+"_next").classList.add("hidden");
    document.getElementById(ex+"_rmb").classList.add("hidden");
  }
  drawWorkouts();
  updateFab();
}

// ── WORKOUTS ──────────────────────────────────────────────────────────────────
function drawWorkouts(){
  var pp=PROTO[proto];
  var keRM=S.ke.rm,lpRM=S.lp.rm;
  if(!keRM&&!lpRM){document.getElementById("w_empty").classList.remove("hidden");document.getElementById("w_content").classList.add("hidden");return;}
  document.getElementById("w_empty").classList.add("hidden");document.getElementById("w_content").classList.remove("hidden");
  function cL(rm,p){return rm?fw(r5(rm*p))+" lbs":"--";}
  function xRow(dotC,name,detail,load,loadC){
    return '<div class="xi">'
      +'<div class="xdot" style="background:'+dotC+'"></div>'
      +'<div style="flex:1"><div class="xname">'+name+'</div><div class="xdet">'+detail+'</div></div>'
      +'<div class="xload" style="color:'+(loadC||"#555")+';font-size:'+(loadC?"12px":"11px")+'">'+load+'</div>'
      +'</div>';
  }
  var both=keRM&&lpRM;
  var w2="",w3="";
  if(keRM){w2+=xRow("var(--lime)","Knee Extension",pp.w2s+" · "+Math.round(pp.w2p*100)+"% 1RM",cL(keRM,pp.w2p),"var(--lime)");w3+=xRow("var(--lime)","Knee Extension",pp.w3s+" · "+Math.round(pp.w3p*100)+"% 1RM · "+pp.w3t,cL(keRM,pp.w3p),"var(--lime)");}
  if(lpRM){w2+=xRow("var(--blue)","Leg Press / Shuttle",pp.w2s+" · "+Math.round(pp.w2p*100)+"% 1RM",cL(lpRM,pp.w2p),"var(--blue)");w3+=xRow("var(--blue)","Leg Press / Shuttle",pp.w3s+" · "+Math.round(pp.w3p*100)+"% 1RM · "+pp.w3t,cL(lpRM,pp.w3p),"var(--blue)");}
  getExercisesForPDF('w2').forEach(function(c){w2+=xRow("#333",c.name,c.detail,c.load||"","");});
  getExercisesForPDF('w3').forEach(function(c){w3+=xRow("#333",c.name,c.detail,c.load||"","");});
  var legend="";
  if(both){legend='<div style="display:flex;margin-bottom:12px;background:#111;border-radius:8px;border:1px solid #1e1e1e;overflow:hidden"><div style="flex:1;padding:10px 12px"><div style="font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--lime);margin-bottom:3px">KE Est. 1RM</div><div style="font-size:20px;font-weight:800;font-family:monospace;color:var(--lime)">'+fw(keRM)+' lbs</div></div><div style="width:1px;background:#1e1e1e"></div><div style="flex:1;padding:10px 12px"><div style="font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--blue);margin-bottom:3px">LP Est. 1RM</div><div style="font-size:20px;font-weight:800;font-family:monospace;color:var(--blue)">'+fw(lpRM)+' lbs</div></div></div>';}
  else if(keRM){legend='<div style="margin-bottom:12px;padding:10px 12px;background:#111;border-radius:8px;border:1px solid rgba(184,255,87,.15)"><div style="font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--lime);margin-bottom:3px">KE Est. 1RM</div><div style="font-size:20px;font-weight:800;font-family:monospace;color:var(--lime)">'+fw(keRM)+' lbs</div></div>';}
  else{legend='<div style="margin-bottom:12px;padding:10px 12px;background:#111;border-radius:8px;border:1px solid rgba(56,189,248,.15)"><div style="font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--blue);margin-bottom:3px">LP Est. 1RM</div><div style="font-size:20px;font-weight:800;font-family:monospace;color:var(--blue)">'+fw(lpRM)+' lbs</div></div>';}
  document.getElementById("w_content").innerHTML=legend
    +'<div class="stitle">'+pp.name+' — Weekly Volume Sessions</div>'
    +'<div class="wcard"><div class="wday">Workout 2 — Mid-Week <span class="wtag">'+Math.round(pp.w2p*100)+'% 1RM</span></div>'+w2+'</div>'
    +'<div class="wcard"><div class="wday">Workout 3 — End of Week <span class="wtag">'+Math.round(pp.w3p*100)+'% 1RM</span></div>'+w3+'</div>'
    +'<div style="font-size:10px;color:#333;line-height:1.7;margin-top:4px">Companion exercises are suggestions — adjust to patient tolerance.<br><span style="color:var(--lime)">Green</span> = Knee Extension · <span style="color:var(--blue)">Blue</span> = Leg Press loads.</div>';
  drawHistory();
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
function drawHistory(){
  var wkNum=SESSION.currentWeek;
  var hke=SESSION.hist_ke.slice(),hlp=SESSION.hist_lp.slice();
  if(S.ke.rm)hke[wkNum-1]=Math.round(S.ke.rm);
  if(S.lp.rm)hlp[wkNum-1]=Math.round(S.lp.rm);
  var hasAny=hke.some(function(v){return v!==null;})||hlp.some(function(v){return v!==null;});
  var html='<div class="stitle">6-Week Block — 1RM Progression</div>';
  if(!hasAny&&!SESSION.loadedFromQR){
    html+='<div class="card"><div class="cb" style="text-align:center;padding:28px 16px"><div style="font-size:30px;margin-bottom:10px">📊</div><div style="font-size:12px;color:var(--muted);line-height:1.7">No history yet.<br>Complete Week 1 and export a PDF.<br>Scan the QR next session to see your block progress here.</div></div></div>';
  } else {
    html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:12px">';
    html+='<div style="padding:10px 14px;background:#161616;border-bottom:1px solid var(--border);font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">Estimated 1RM by Week</div>';
    html+='<table style="width:100%;border-collapse:collapse"><thead><tr><th style="font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:8px 14px;text-align:left">Exercise</th>';
    for(var w=1;w<=6;w++){var isCur=w===wkNum;html+='<th style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:'+(isCur?'var(--lime)':'var(--muted)')+';padding:8px 6px;text-align:center">Wk'+w+(isCur?' ●':'')+'</th>';}
    html+='</tr></thead><tbody>';
    html+='<tr><td style="padding:10px 14px;font-size:12px;font-weight:700;color:var(--lime)">KE</td>';
    for(var w=1;w<=6;w++){var val=hke[w-1];var isCur=w===wkNum;var prev=w>1?hke[w-2]:null;var delta=(val!==null&&prev!==null)?(val-prev):null;var dStr=delta!==null?('<span style="font-size:9px;color:'+(delta>0?'var(--lime)':delta<0?'var(--red)':'var(--muted)')+'"> '+(delta>0?'+':'')+delta+'</span>'):'';html+='<td style="padding:10px 6px;text-align:center;font-family:monospace;font-size:'+(isCur?'14px':'12px')+';font-weight:'+(isCur?'800':'400')+';color:'+(val!==null?(isCur?'var(--lime)':'#aaa'):'#333')+'">'+(val!==null?val+'<br>'+dStr:'—')+'</td>';}
    html+='</tr>';
    html+='<tr><td style="padding:10px 14px;font-size:12px;font-weight:700;color:var(--blue)">LP</td>';
    for(var w=1;w<=6;w++){var val=hlp[w-1];var isCur=w===wkNum;var prev=w>1?hlp[w-2]:null;var delta=(val!==null&&prev!==null)?(val-prev):null;var dStr=delta!==null?('<span style="font-size:9px;color:'+(delta>0?'var(--lime)':delta<0?'var(--red)':'var(--muted)')+'"> '+(delta>0?'+':'')+delta+'</span>'):'';html+='<td style="padding:10px 6px;text-align:center;font-family:monospace;font-size:'+(isCur?'14px':'12px')+';font-weight:'+(isCur?'800':'400')+';color:'+(val!==null?(isCur?'var(--blue)':'#aaa'):'#333')+'">'+(val!==null?val+'<br>'+dStr:'—')+'</td>';}
    html+='</tr></tbody></table></div>';
    var maxRM=0;hke.concat(hlp).forEach(function(v){if(v&&v>maxRM)maxRM=v;});
    if(maxRM>0){
      html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px"><div style="font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Progress Bars</div>';
      ['ke','lp'].forEach(function(ex){
        var hist=ex==='ke'?hke:hlp;var col=ex==='ke'?'var(--lime)':'var(--blue)';var lbl=ex==='ke'?'Knee Extension':'Leg Press';
        html+='<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:'+col+';margin-bottom:5px">'+lbl+'</div><div style="display:flex;align-items:flex-end;gap:4px;height:50px">';
        for(var w=1;w<=6;w++){var val=hist[w-1];var h=val?Math.max(8,Math.round((val/maxRM)*46)):4;var isCur=w===wkNum;html+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:100%;height:'+h+'px;background:'+(val?(isCur?col:'rgba(255,255,255,.15)'):'#1e1e1e')+';border-radius:3px 3px 0 0;transition:height .3s"></div><div style="font-size:8px;color:'+(isCur?col:'var(--muted)')+'">W'+w+'</div></div>';}
        html+='</div></div>';
      });
      html+='</div>';
    }
    html+='<div style="font-size:10px;color:#333;line-height:1.7;margin-top:4px">Data carries forward via QR code on each PDF export.<br><span style="color:var(--lime)">●</span> = current week</div>';
  }
  var el=document.getElementById("histContent");
  if(el)el.innerHTML=html;
}

// ── TIMELINE ──────────────────────────────────────────────────────────────────
function drawTimeline(){
  var pm={"APRE 10":"apre10","APRE 6":"apre6","APRE 3":"apre3"};
  var el=document.getElementById("tlContent");
  if(!el)return;
  el.innerHTML=TL.map(function(t,i){
    var cur=pm[t.l]===proto;
    return '<div class="tlrow">'
      +'<div class="tlspine"><div class="tldot" style="background:'+t.c+';box-shadow:0 0 7px '+t.c+'55"></div>'+(i<TL.length-1?'<div class="tlline"></div>':'')+'</div>'
      +'<div class="tlcard'+(cur?' cur':'')+'">'
      +'<div class="tltop"><span class="tltitle" style="color:'+t.c+'">'+t.l+'</span><span class="tlwk" style="color:'+t.c+'77">'+t.w+'</span></div>'
      +(cur?'<div class="tlpill">Current Protocol</div>':'')
      +'<div class="chips">'+t.items.map(function(i){return'<span class="chip">'+i+'</span>';}).join('')+'</div>'
      +'<div class="tlnote">'+t.note+'</div>'
      +'</div></div>';
  }).join('');
}

// ── REFERENCE ─────────────────────────────────────────────────────────────────
function drawRef(){
  var cols={apre10:"#b8ff57",apre6:"#fbbf24",apre3:"#f87171"};
  function zc(z){return z==="up"?"#b8ff57":z==="dn"?"#f87171":"#fbbf24";}
  function al(z,d){return z==="sa"?"Hold":z==="up"?"+"+d[0]+"-"+d[1]+" lbs":d[0]+" to "+d[1]+" lbs";}
  function aln(z,n){return z==="sa"?"Hold":z==="up"?"+"+n[0]+"-"+n[1]+" lbs":n[0]+" to "+n[1]+" lbs";}
  var el=document.getElementById("refContent");
  if(!el)return;
  el.innerHTML=["apre10","apre6","apre3"].map(function(pk){
    var pp=PROTO[pk],c=cols[pk];
    return '<div class="refblk">'
      +'<div class="refhd"><div class="refdot" style="background:'+c+'"></div>'
      +'<span style="font-size:12px;font-weight:800;color:'+c+'">'+pp.name+'</span>'
      +'<span style="font-size:10px;color:var(--muted)"> -- '+pp.phase+'</span></div>'
      +'<div class="refsub">Set 3 Reps -- Set 4 Load</div>'
      +'<div class="reftbl">'+pp.s3.map(function(a){return'<div class="refrow"><span class="refreps">'+a.l+' reps</span><span class="refadj" style="color:'+zc(a.z)+';background:'+zc(a.z)+'18">'+al(a.z,a.d)+'</span></div>';}).join('')+'</div>'
      +'<div class="refsub">Set 4 Reps -- Next Session</div>'
      +'<div class="reftbl">'+pp.s4.map(function(a){return'<div class="refrow"><span class="refreps">'+a.l+' reps</span><span class="refadj" style="color:'+zc(a.z)+';background:'+zc(a.z)+'18">'+aln(a.z,a.n)+'</span></div>';}).join('')+'</div>'
      +'</div>';
  }).join('');
}

// ── EXERCISE CUSTOMIZATION ────────────────────────────────────────────────────
function makeCustomRowHTML(wk,name,detail){
  return '<div class="ex-custom-row" data-workout="'+wk+'">'
    +'<div class="ex-custom-fields">'
    +'<input type="text" class="sinp ex-custom-name" placeholder="Exercise name" value="'+(name||'').replace(/"/g,'&quot;')+'">'
    +'<input type="text" class="sinp ex-custom-detail" placeholder="Sets · reps · notes" value="'+(detail||'').replace(/"/g,'&quot;')+'">'
    +'</div>'
    +'<button type="button" class="ex-remove-btn" onclick="this.parentNode.remove()">✕</button>'
    +'</div>';
}
function addCustomRow(wk){
  var c=document.getElementById('ex_custom_rows_'+wk);
  if(!c)return;
  var d=document.createElement('div');
  d.innerHTML=makeCustomRowHTML(wk,'','');
  c.appendChild(d.firstChild);
}
if(typeof window!=='undefined')window.addCustomRow=addCustomRow;
function renderExerciseLists(){
  ['w2','w3'].forEach(function(wk){
    var pp=PROTO[proto];
    var companions=wk==='w2'?pp.w2companions:pp.w3companions;
    var disabled=wk==='w2'?SESSION.disabledDefaultsW2:SESSION.disabledDefaultsW3;
    var carried=wk==='w2'?SESSION.carriedW2:SESSION.carriedW3;
    var el=document.getElementById('ex_list_'+wk);
    if(!el)return;
    var html=companions.map(function(c,i){
      var checked=disabled.indexOf(i)===-1;
      return '<label class="ex-default-row">'
        +'<input type="checkbox" class="ex-cb" id="excb_'+wk+'_'+i+'"'+(checked?' checked':'')+'>'
        +'<div class="ex-default-info">'
        +'<div class="ex-default-name">'+c.name+'</div>'
        +'<div class="ex-default-detail">'+c.detail+'</div>'
        +'</div></label>';
    }).join('');
    html+='<div id="ex_custom_rows_'+wk+'">';
    carried.forEach(function(c){html+=makeCustomRowHTML(wk,c.n,c.d);});
    html+='</div>';
    html+='<button type="button" class="ex-add-btn" onclick="addCustomRow(\''+wk+'\')">+ Add Exercise</button>';
    el.innerHTML=html;
  });
}
function getExercisesForPDF(workout){
  var pp=PROTO[proto];
  var companions=workout==='w2'?pp.w2companions:pp.w3companions;
  var results=[];
  companions.forEach(function(c,i){
    var cb=document.getElementById('excb_'+workout+'_'+i);
    if(!cb||cb.checked)results.push(c);
  });
  document.querySelectorAll('.ex-custom-row[data-workout="'+workout+'"]').forEach(function(row){
    var n=row.querySelector('.ex-custom-name');
    var d=row.querySelector('.ex-custom-detail');
    var name=n?n.value.trim():'';
    var detail=d?d.value.trim():'';
    if(name)results.push({name:name,detail:detail,load:null,pct:null});
  });
  return results;
}

// ── FAB / SHEET ───────────────────────────────────────────────────────────────
function updateFab(){
  var hasData=!!(S.ke.rm||S.lp.rm);
  var fab=document.getElementById("fab");
  if(fab){hasData?fab.classList.add("ready"):fab.classList.remove("ready");}
}
function openSheet(){
  var hasData=!!(S.ke.rm||S.lp.rm);
  document.getElementById("sheet_nodata").classList.toggle("hidden",hasData);
  document.getElementById("sheet_form").classList.toggle("hidden",!hasData);
  document.getElementById("overlay").style.opacity="1";
  document.getElementById("overlay").style.pointerEvents="auto";
  document.getElementById("sheet").classList.add("open");
  if(hasData)renderExerciseLists();
}
function closeSheet(){
  document.getElementById("overlay").style.opacity="0";
  document.getElementById("overlay").style.pointerEvents="none";
  document.getElementById("sheet").classList.remove("open");
}

// ── PROTO / TAB ───────────────────────────────────────────────────────────────
function setProto(p){
  proto=p;
  document.getElementById("p10").classList.toggle("on",p==="apre10");
  document.getElementById("p6").classList.toggle("on",p==="apre6");
  document.getElementById("p3").classList.toggle("on",p==="apre3");
  document.getElementById("phLbl").textContent=PROTO[p].phase;
  document.getElementById("phWk").textContent=PROTO[p].wk;
  calc("ke");calc("lp");drawTimeline();drawRef();
}
function goTab(t,el){
  ["calc","workouts","history","timeline","ref"].forEach(function(x){document.getElementById("tab_"+x).classList.add("hidden");});
  document.querySelectorAll(".nb").forEach(function(b){b.classList.remove("on");});
  document.getElementById("tab_"+t).classList.remove("hidden");
  el.classList.add("on");
  if(t==="history")drawHistory();
}
function resetAll(){
  ["ke","lp"].forEach(function(ex){
    ["ww","s3","s4"].forEach(function(f){document.getElementById(ex+"_"+f).value="";});
    [ex+"_s4rec",ex+"_s4g",ex+"_next",ex+"_rmb"].forEach(function(id){document.getElementById(id).classList.add("hidden");});
    S[ex]={ww:null,s3r:null,s4r:null,s4w:null,rm:null,nextw:null};
    drawSets(ex,0);
  });
  document.getElementById("resetBtn").classList.add("hidden");
  document.getElementById("w_empty").classList.remove("hidden");
  document.getElementById("w_content").classList.add("hidden");
  updateFab();
}

// ── PDF ───────────────────────────────────────────────────────────────────────
async function genPDF(){
  if(typeof window.jspdf==='undefined'){alert("PDF library not loaded.");return;}
  var jsPDF=window.jspdf.jsPDF;
  var pp=PROTO[proto];
  var keRM=S.ke.rm,lpRM=S.lp.rm;
  var hasKE=!!keRM,hasLP=!!lpRM;
  if(!keRM&&!lpRM){alert("Complete the APRE calculator first.");return;}
  var patCode=document.getElementById("s_name").value||"PT-???";
  var patDate=document.getElementById("s_date").value||(new Date().toLocaleDateString());
  var wkOfBlock=document.getElementById("s_weeks").value||SESSION.currentWeek;
  var therapist=document.getElementById("s_therapist").value||"--";
  var qrURL=buildQRPayload();
  var qrDataURL=await makeQRDataURL(qrURL);
  var doc=new jsPDF({orientation:"portrait",unit:"mm",format:"letter"});
  var W=215.9,H=279.4;
  var BLK=[10,10,10],DRK=[18,18,18],LIM=[184,255,87],LID=[142,212,60];
  var WHT=[255,255,255],MUT=[120,120,120],BRD=[50,50,50],BLU=[56,189,248];
  var GLD=[251,191,36],RED=[248,113,113],CRD=[28,28,28];
  function sRGB(a){doc.setTextColor(a[0],a[1],a[2]);}
  function sFill(a){doc.setFillColor(a[0],a[1],a[2]);}
  function sDraw(a){doc.setDrawColor(a[0],a[1],a[2]);}
  function drawFooter(pgNum,total,isClinic){
    sFill([15,15,15]);doc.rect(0,H-12,W,12,"F");
    sFill(LIM);doc.rect(0,H-12,W,0.3,"F");
    doc.setFontSize(6.5);doc.setFont("helvetica","bold");sRGB(WHT);doc.text("TRM",14,H-5.5);
    doc.setFont("helvetica","normal");sRGB(MUT);
    var mid=isClinic?"APRE Progressive Loading  |  ACL Rehabilitation  |  Not a substitute for clinical judgment":"Questions about your program? Contact your therapist before modifying any loads.";
    doc.text(mid,W/2,H-5.5,"center");
    doc.text(pgNum+" / "+total,W-14,H-5.5,"right");
  }
  // PAGE 1
  sFill(BLK);doc.rect(0,0,W,H,"F");
  sFill(DRK);doc.rect(0,0,W,36,"F");
  sFill(LIM);doc.rect(0,35.5,W,0.5,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(26);sRGB(WHT);doc.text("TRM",14,22);
  sFill(LIM);doc.rect(36,10,1.5,16,"F");
  sFill([40,60,20]);doc.roundedRect(40,13,18,9,2,2,"F");
  doc.setFontSize(7);sRGB(LIM);doc.text("APRE",49,19,"center");
  doc.setFontSize(8);doc.setFont("helvetica","normal");sRGB(MUT);doc.text("CLINICIAN SUMMARY",W-14,14,"right");
  doc.setFontSize(7);doc.text("TRM Progressive Resistance Loading",W-14,19,"right");
  doc.text("ACL Rehabilitation Protocol",W-14,23.5,"right");
  sFill([35,50,15]);doc.roundedRect(W-60,27,46,6,1.5,1.5,"F");
  sDraw(LID);doc.setLineWidth(0.3);doc.roundedRect(W-60,27,46,6,1.5,1.5,"S");
  doc.setFontSize(6.5);doc.setFont("helvetica","bold");sRGB(LIM);
  doc.text(pp.name+" -- "+pp.phase,W-37,31.2,"center");
  var y=44;
  sFill(DRK);doc.roundedRect(14,y,W-28,18,2,2,"F");
  sDraw(BRD);doc.setLineWidth(0.3);doc.roundedRect(14,y,W-28,18,2,2,"S");
  sFill(LIM);doc.roundedRect(14,y,3,18,1,1,"F");
  var infoW=(W-28)/4;
  ["CODE","DATE","BLOCK WEEK","THERAPIST"].forEach(function(lb,i){
    var x=17+6+infoW*i;
    doc.setFontSize(6);doc.setFont("helvetica","bold");sRGB(MUT);doc.text(lb,x,y+7);
    doc.setFontSize(9.5);doc.setFont("helvetica","bold");sRGB(WHT);
    doc.text([patCode,patDate,"Week "+wkOfBlock+" / 6",therapist][i],x,y+14);
  });
  y+=24;
  doc.setFontSize(7.5);doc.setFont("helvetica","bold");sRGB(MUT);doc.text("TODAY'S RESULTS",14,y);
  sFill([35,35,35]);doc.rect(14,y+2,W-28,0.3,"F");y+=8;
  function drawResultCard(ex,rm,sx,cardW){
    var col=ex==="ke"?LIM:BLU;var lbl=ex==="ke"?"KNEE EXTENSION":"LEG PRESS / SHUTTLE";
    var se=S[ex];var CARDH=76;
    var adjZ=null,adjLbl="",adjCol=MUT;
    if(se.s4r!==null){var a4=adjR(pp.s4,se.s4r);adjZ=a4.z;}
    else if(se.s3r!==null){var a3r=adjR(pp.s3,se.s3r);adjZ=a3r.z;}
    if(adjZ==="up"){adjLbl="INCREASE";adjCol=LIM;}
    else if(adjZ==="dn"){adjLbl="REDUCE";adjCol=RED;}
    else if(adjZ==="sa"){adjLbl="HOLD";adjCol=GLD;}
    sFill([22,22,22]);doc.roundedRect(sx,y,cardW,CARDH,2,2,"F");
    sDraw(col);doc.setLineWidth(0.5);doc.roundedRect(sx,y,cardW,CARDH,2,2,"S");
    sFill(col);doc.roundedRect(sx,y,cardW,7,2,2,"F");doc.roundedRect(sx,y+3,cardW,4,0,0,"F");
    doc.setFontSize(6.5);doc.setFont("helvetica","bold");doc.setTextColor(0,0,0);doc.text(lbl,sx+cardW/2,y+5.2,"center");
    var cy=y+12;
    doc.setFontSize(6);doc.setFont("helvetica","bold");sRGB(MUT);doc.text("NEXT SESSION — SET 3 WORKING WEIGHT",sx+5,cy);cy+=6;
    var nwText=se.nextw?fw(se.nextw)+" lbs":"—";
    doc.setFontSize(24);doc.setFont("helvetica","bold");doc.setTextColor(col[0],col[1],col[2]);doc.text(nwText,sx+5,cy+9);
    if(adjZ){var badgeX=sx+cardW-5;doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setTextColor(adjCol[0],adjCol[1],adjCol[2]);doc.text(adjLbl,badgeX,cy+6,"right");doc.setFontSize(6.5);doc.setFont("helvetica","normal");sRGB(MUT);doc.text("next session",badgeX,cy+11,"right");}
    cy+=17;sFill([40,40,40]);doc.rect(sx+4,cy,cardW-8,0.3,"F");cy+=5;
    doc.setFontSize(6);doc.setFont("helvetica","bold");sRGB(MUT);doc.text("ESTIMATED 1RM",sx+5,cy);cy+=4;
    doc.setFontSize(13);doc.setFont("helvetica","bold");doc.setTextColor(col[0],col[1],col[2]);doc.text(fw(rm)+" lbs",sx+5,cy+2);cy+=10;
    sFill([16,16,16]);doc.rect(sx+1,cy,cardW-2,16,"F");
    var stats=[["WKG WT",fw(se.ww)+" lbs"],["S3 REPS",se.s3r!==null?se.s3r+" reps":"—"],["S4 WT",fw(se.s4w)+" lbs"],["S4 REPS",se.s4r!==null?se.s4r+" reps":"—"]];
    var sw=(cardW-2)/4;
    stats.forEach(function(st,i){var bx=sx+1+sw*i;if(i>0){sFill([35,35,35]);doc.rect(bx,cy,0.3,16,"F");}doc.setFontSize(5);doc.setFont("helvetica","bold");sRGB(MUT);doc.text(st[0],bx+sw/2,cy+5.5,"center");doc.setFontSize(8);doc.setFont("helvetica","bold");sRGB(WHT);doc.text(st[1],bx+sw/2,cy+12,"center");});
  }
  if(hasKE&&hasLP){var cw2=(W-30)/2;drawResultCard("ke",keRM,14,cw2);drawResultCard("lp",lpRM,14+cw2+2,cw2);}
  else if(hasKE){drawResultCard("ke",keRM,14,W-28);}
  else{drawResultCard("lp",lpRM,14,W-28);}
  y+=82;
  doc.setFontSize(7.5);doc.setFont("helvetica","bold");sRGB(MUT);doc.text("WEEK AHEAD",14,y);
  sFill([35,35,35]);doc.rect(14,y+2,W-28,0.3,"F");y+=8;
  var wkW=(W-30)/2;
  function drawWeekCard(sx,wkW,label,tag,pct,keLoad,lpLoad){
    var cardH=36;sFill([18,18,18]);doc.roundedRect(sx,y,wkW,cardH,2,2,"F");sDraw([40,40,40]);doc.setLineWidth(0.3);doc.roundedRect(sx,y,wkW,cardH,2,2,"S");
    sFill([28,28,28]);doc.roundedRect(sx,y,wkW,12,2,2,"F");doc.roundedRect(sx,y+8,wkW,4,0,0,"F");
    doc.setFontSize(6.5);doc.setFont("helvetica","bold");sRGB(WHT);doc.text(label,sx+5,y+7);
    doc.setFontSize(5.5);doc.setFont("helvetica","normal");sRGB(MUT);doc.text(tag,sx+wkW-4,y+7,"right");
    doc.setFontSize(5.5);doc.setFont("helvetica","bold");sRGB(MUT);doc.text("INTENSITY",sx+5,y+16);
    doc.setFontSize(11);doc.setFont("helvetica","bold");sRGB(GLD);doc.text(pct,sx+5,y+22);
    if(keLoad){doc.setFontSize(5.5);doc.setFont("helvetica","bold");sRGB(MUT);doc.text("KE",sx+wkW/2+2,y+16);doc.setFontSize(10);doc.setFont("helvetica","bold");doc.setTextColor(LIM[0],LIM[1],LIM[2]);doc.text(keLoad,sx+wkW/2+2,y+22);}
    if(lpLoad){var lpX=keLoad?sx+wkW-4:sx+wkW/2+2;doc.setFontSize(5.5);doc.setFont("helvetica","bold");sRGB(MUT);doc.text("LP",lpX,y+16,keLoad?"right":"left");doc.setFontSize(10);doc.setFont("helvetica","bold");doc.setTextColor(BLU[0],BLU[1],BLU[2]);doc.text(lpLoad,lpX,y+22,keLoad?"right":"left");}
    doc.setFontSize(5.5);doc.setFont("helvetica","normal");sRGB(MUT);var setsText=label.indexOf("2")>=0?pp.w2s:pp.w3s;doc.text(setsText,sx+5,y+30);
    doc.setFontSize(5);doc.setFont("helvetica","italic");sRGB([60,60,60]);var tempoRaw=label.indexOf("2")>=0?"Not to failure":pp.w3t;var tempoTxt=tempoRaw.length>18?tempoRaw.substring(0,17)+"…":tempoRaw;doc.text(tempoTxt,sx+wkW-4,y+30,"right");
  }
  drawWeekCard(14,wkW,"WORKOUT 2 — MID-WEEK","Volume",Math.round(pp.w2p*100)+"%",hasKE?fw(r5(keRM*pp.w2p))+" lbs":null,hasLP?fw(r5(lpRM*pp.w2p))+" lbs":null);
  drawWeekCard(14+wkW+2,wkW,"WORKOUT 3 — END OF WEEK","Consolidation",Math.round(pp.w3p*100)+"%",hasKE?fw(r5(keRM*pp.w3p))+" lbs":null,hasLP?fw(r5(lpRM*pp.w3p))+" lbs":null);
  y+=40;
  doc.setFontSize(7.5);doc.setFont("helvetica","bold");sRGB(MUT);doc.text("CLINICAL NOTES",14,y);
  sFill([35,35,35]);doc.rect(14,y+2,W-28,0.3,"F");y+=8;
  sFill([18,18,18]);doc.roundedRect(14,y,W-28,30,2,2,"F");sDraw([40,40,40]);doc.setLineWidth(0.3);doc.roundedRect(14,y,W-28,30,2,2,"S");
  for(var i=0;i<3;i++){sFill([40,40,40]);doc.rect(20,y+8+(i*8),W-40,0.3,"F");}y+=38;
  doc.setFontSize(6.5);doc.setFont("helvetica","normal");sRGB(MUT);doc.text("Therapist Signature",14,y+5);sFill([50,50,50]);doc.rect(14,y+7,88,0.3,"F");doc.text("Date",110,y+5);doc.rect(110,y+7,55,0.3,"F");
  drawFooter("1","?",true);
  // ATHLETE PAGES
  function getAdjNote(ex){var se=S[ex];if(!se||se.s4r===null)return null;var a4=adjR(pp.s4,se.s4r);if(a4.z==="up")return"Great session — you progressed. Loads have been increased for next week.";if(a4.z==="dn")return"Today indicated a deload is appropriate. Reduced loads will support recovery.";return"Solid session — loads held steady to consolidate your strength gains.";}
  var athletePageCount=0;
  function newAthletePage(){
    doc.addPage();athletePageCount++;
    sFill(BLK);doc.rect(0,0,W,H,"F");sFill(DRK);doc.rect(0,0,W,32,"F");sFill(LIM);doc.rect(0,31.5,W,0.5,"F");sFill(LIM);doc.rect(0,0,4,32,"F");
    if(athletePageCount===1){doc.setFontSize(20);doc.setFont("helvetica","bold");sRGB(WHT);doc.text("YOUR TRAINING PLAN",8,15);doc.setFontSize(8);doc.setFont("helvetica","normal");sRGB(LIM);doc.text("Personalized ACL strength program based on today's APRE testing.",8,22);doc.setFontSize(7);sRGB(MUT);doc.text(patCode+"  |  "+patDate+"  |  Block Week "+wkOfBlock+" / 6  |  "+pp.name,8,28);}
    else{doc.setFontSize(14);doc.setFont("helvetica","bold");sRGB(WHT);doc.text("YOUR TRAINING PLAN",8,14);doc.setFontSize(7);doc.setFont("helvetica","normal");sRGB(MUT);doc.text(patCode+"  |  "+patDate+"  |  "+pp.name,8,22);doc.setFontSize(7);sRGB(LIM);doc.text("Continued...",8,28);}
    y=38;drawFooter("?","?",false);
  }
  function needRoom(needed){if(y+needed>H-16){newAthletePage();}}
  function wCard(dayLbl,dayTag,intensity,rows2,note){
    var est=16+rows2.length*11+(note?9:0)+7;needRoom(est);var sy=y;
    sFill([22,36,8]);doc.roundedRect(14,y,W-28,16,2,2,"F");doc.roundedRect(14,y+11,W-28,5,0,0,"F");sDraw([55,95,18]);doc.setLineWidth(0.4);doc.roundedRect(14,y,W-28,16,2,2,"S");
    var maxLblW=W-28-35;doc.setFont("helvetica","bold");var lblSize=9;doc.setFontSize(lblSize);sRGB(LIM);if(doc.getTextWidth(dayLbl)>maxLblW){doc.setFontSize(8);}doc.text(dayLbl,18,y+8);
    doc.setFontSize(6);doc.setFont("helvetica","normal");sRGB(LID);doc.text(dayTag,18,y+14);
    doc.setFontSize(7);doc.setFont("helvetica","bold");sRGB(LIM);doc.text(intensity,W-16,y+8,"right");
    y+=20;
    rows2.forEach(function(row,i){
      var isPrimary=row.type==="ke"||row.type==="lp";var isComp=row.type==="companion";
      if(isComp){sFill(i%2===0?[26,21,8]:[22,18,7]);}else{sFill(i%2===0?[14,14,14]:[19,19,19]);}
      doc.rect(14,y,W-28,11,"F");
      if(isComp){sFill(GLD);doc.rect(14,y,2.5,11,"F");doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setTextColor(GLD[0],GLD[1],GLD[2]);doc.text(row.name,20,y+6);doc.setFontSize(6.5);doc.setFont("helvetica","normal");sRGB(MUT);doc.text(row.detail,20,y+10);}
      else{var dc=row.type==="ke"?LIM:BLU;sFill(dc);doc.roundedRect(17,y+3.5,3,3,0.5,0.5,"F");doc.setFontSize(8.5);doc.setFont("helvetica","bold");sRGB(WHT);doc.text(row.name,23,y+6);doc.setFontSize(6.5);doc.setFont("helvetica","normal");sRGB(MUT);doc.text(row.detail,23,y+10);}
      var loadTxt=row.load||"";
      if(!loadTxt&&row.pct){var baseRM=row.base==="ke"?keRM:lpRM;if(baseRM){loadTxt=fw(r5(baseRM*row.pct))+" lbs";}else{loadTxt=Math.round(row.pct*100)+"% 1RM";}}
      if(loadTxt){doc.setFontSize(isPrimary?10:9);doc.setFont("helvetica","bold");if(row.type==="ke"){sRGB(LIM);}else if(row.type==="lp"){sRGB(BLU);}else{doc.setTextColor(GLD[0],GLD[1],GLD[2]);}doc.text(loadTxt,W-16,y+7,"right");}
      y+=11;
    });
    if(note){sFill([13,13,13]);doc.rect(14,y,W-28,9,"F");sFill(LID);doc.rect(14,y,2.5,9,"F");doc.setFontSize(6.5);doc.setFont("helvetica","italic");sRGB([145,185,95]);doc.text(note,19,y+6);y+=9;}
    sDraw([38,38,38]);doc.setLineWidth(0.3);doc.roundedRect(14,sy,W-28,y-sy,2,2,"S");y+=7;
  }
  newAthletePage();
  var keNote=getAdjNote("ke"),lpNote=getAdjNote("lp"),perfNote=keNote||lpNote||"";
  if(perfNote){needRoom(16);sFill([16,26,6]);doc.roundedRect(14,y,W-28,14,2,2,"F");sDraw([50,80,20]);doc.setLineWidth(0.3);doc.roundedRect(14,y,W-28,14,2,2,"S");sFill(LIM);doc.rect(14,y,3,14,"F");doc.setFontSize(6.5);doc.setFont("helvetica","bold");sRGB(LIM);doc.text("BASED ON TODAY'S APRE RESULTS",20,y+5.5);doc.setFontSize(7);doc.setFont("helvetica","normal");sRGB([175,210,130]);doc.text(perfNote,20,y+11);y+=20;}
  var w1rows=[];
  if(hasKE)w1rows.push({type:"ke",name:"Knee Extension",detail:"Set 1: "+pp.s1r+" reps @ 50%   Set 2: "+pp.s2r+" reps @ 75%   Sets 3 & 4: max reps to failure",load:""});
  if(hasLP)w1rows.push({type:"lp",name:"Leg Press / Shuttle",detail:"Set 1: "+pp.s1r+" reps @ 50%   Set 2: "+pp.s2r+" reps @ 75%   Sets 3 & 4: max reps to failure",load:""});
  wCard("WORKOUT 1 — APRE TESTING SESSION","Primary testing day — therapist directed","Autoregulated",w1rows,"Therapist sets Set 3 working weight. Sets 3 & 4 are taken to failure. Loads adjust automatically.");
  var w2rows=[];
  if(hasKE)w2rows.push({type:"ke",name:"Knee Extension",detail:pp.w2s+"   "+Math.round(pp.w2p*100)+"% of your 1RM — do NOT go to failure",load:fw(r5(keRM*pp.w2p))+" lbs"});
  if(hasLP)w2rows.push({type:"lp",name:"Leg Press / Shuttle",detail:pp.w2s+"   "+Math.round(pp.w2p*100)+"% of your 1RM — do NOT go to failure",load:fw(r5(lpRM*pp.w2p))+" lbs"});
  getExercisesForPDF('w2').forEach(function(c){w2rows.push({type:"companion",name:c.name,detail:c.detail,load:c.load||null,pct:c.pct||null,base:c.base||null});});
  wCard("WORKOUT 2 — MID-WEEK","Posterior chain & volume day",""+Math.round(pp.w2p*100)+"% 1RM",w2rows,"Complete the KE/LP sets first, then companions. Rest 90 sec. Controlled reps — form over load.");
  var w3rows=[];
  if(hasKE)w3rows.push({type:"ke",name:"Knee Extension",detail:pp.w3s+"   "+Math.round(pp.w3p*100)+"% of your 1RM   "+pp.w3t,load:fw(r5(keRM*pp.w3p))+" lbs"});
  if(hasLP)w3rows.push({type:"lp",name:"Leg Press / Shuttle",detail:pp.w3s+"   "+Math.round(pp.w3p*100)+"% of your 1RM   "+pp.w3t,load:fw(r5(lpRM*pp.w3p))+" lbs"});
  getExercisesForPDF('w3').forEach(function(c){w3rows.push({type:"companion",name:c.name,detail:c.detail,load:c.load||null,pct:c.pct||null,base:c.base||null});});
  wCard("WORKOUT 3 — END OF WEEK","Strength consolidation day",""+Math.round(pp.w3p*100)+"% 1RM",w3rows,"Slightly heavier than Workout 2 — still not to failure. Prioritize tempo and full range of motion.");
  needRoom(28);sFill([20,20,10]);doc.roundedRect(14,y,W-28,26,2,2,"F");sDraw([80,80,30]);doc.setLineWidth(0.3);doc.roundedRect(14,y,W-28,26,2,2,"S");doc.setFontSize(7.5);doc.setFont("helvetica","bold");sRGB(GLD);doc.text("IMPORTANT REMINDERS",18,y+7);doc.setFontSize(7);doc.setFont("helvetica","normal");sRGB([200,190,140]);doc.text("Warm up 5-10 min before each session (bike, walk, or as directed by your therapist).",18,y+13);doc.text("Stop if you experience sharp pain. Mild muscle fatigue is normal — joint pain is not.",18,y+19);doc.text("Contact your therapist if something feels wrong or weights seem too heavy or too light.",18,y+25);y+=32;
  needRoom(50);var qrBoxH=46;sFill([8,14,4]);doc.roundedRect(14,y,W-28,qrBoxH,2,2,"F");sDraw([50,90,20]);doc.setLineWidth(0.4);doc.roundedRect(14,y,W-28,qrBoxH,2,2,"S");sFill(LIM);doc.rect(14,y,3.5,qrBoxH,"F");
  doc.setFontSize(8);doc.setFont("helvetica","bold");sRGB(LIM);doc.text("SCAN FOR NEXT SESSION",22,y+8);doc.setFontSize(6.5);doc.setFont("helvetica","normal");sRGB([175,215,130]);doc.text("Scan this QR code on Week "+(parseInt(wkOfBlock)+1)+" to pre-load carry-forward weights",22,y+14);doc.setFontSize(6);sRGB(MUT);doc.text("No patient data is stored — codes contain only weights and protocol.",22,y+19);
  var nextWk=parseInt(wkOfBlock)+1;
  if(nextWk<=6){var keNext=S.ke.nextw?fw(S.ke.nextw)+" lbs":"--";var lpNext=S.lp.nextw?fw(S.lp.nextw)+" lbs":"--";doc.setFontSize(7);doc.setFont("helvetica","bold");if(hasKE){sRGB(LIM);doc.text("Wk "+nextWk+" KE Set 3: "+keNext,22,y+27);}if(hasLP){sRGB(BLU);doc.text("Wk "+nextWk+" LP Set 3: "+lpNext,22,y+(hasKE?33:27));}}
  else{doc.setFontSize(7);doc.setFont("helvetica","bold");sRGB(GLD);doc.text("Block complete! Reassess protocol — consider advancing to "+(proto==="apre10"?"APRE 6":proto==="apre6"?"APRE 3":"RTS testing")+".",22,y+27);}
  if(qrDataURL){try{var qrSize=36;var qrX=W-14-qrSize;var qrY=y+(qrBoxH-qrSize)/2;sFill([255,255,255]);doc.roundedRect(qrX-1,qrY-1,qrSize+2,qrSize+2,1,1,"F");doc.addImage(qrDataURL,"PNG",qrX,qrY,qrSize,qrSize);}catch(e){}}
  else{doc.setFontSize(5.5);doc.setFont("helvetica","normal");sRGB(MUT);var shortUrl=qrURL.length>60?qrURL.substring(0,57)+"...":qrURL;doc.text("URL: "+shortUrl,22,y+39);}
  y+=qrBoxH+4;
  var totalPg=1+athletePageCount;var pageInfo=doc.internal.getNumberOfPages();
  for(var pg=1;pg<=pageInfo;pg++){doc.setPage(pg);doc.setFontSize(6.5);doc.setFont("helvetica","normal");sRGB(MUT);doc.text(pg+" / "+totalPg,W-14,H-5.5,"right");}
  closeSheet();var blob=doc.output("blob");window.open(URL.createObjectURL(blob),"_blank");
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
:root{--lime:#b8ff57;--lime-dim:#8ed43c;--black:#0b0f12;--dark:#101417;--card:#1c2023;--border:rgba(255,255,255,0.10);--muted:rgba(255,255,255,0.4);--white:#ffffff;--gold:#fbbf24;--red:#f87171;--blue:#38bdf8}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
input[type=number]{-moz-appearance:textfield}
.apre-wrap{background:var(--black);color:var(--white);font-family:-apple-system,'SF Pro Text',system-ui,sans-serif;max-width:430px;margin:0 auto;min-height:100vh;padding-bottom:110px}
.hdr{background:var(--dark);border-bottom:1px solid var(--border);padding:48px 20px 0;position:sticky;top:0;z-index:100}
.logo-row{display:flex;align-items:center;gap:10px;margin-bottom:3px}
.logo-text{font-family:'Arial Black',sans-serif;font-weight:900;font-size:24px;color:var(--white)}
.logo-bar{width:3px;height:24px;border-radius:2px;background:linear-gradient(180deg,var(--lime),var(--lime-dim))}
.logo-pill{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--lime);background:rgba(184,255,87,.1);border:1px solid rgba(184,255,87,.22);border-radius:4px;padding:2px 7px}
.hdr-sub{font-size:10px;color:var(--muted);letter-spacing:.12em;text-transform:uppercase;margin-bottom:13px;font-weight:600}
.proto-row{display:flex;gap:6px}
.pill{flex:1;border:1px solid var(--border);border-radius:6px;padding:8px 4px;cursor:pointer;background:var(--card);text-align:center;transition:all .15s}
.pill.on{border-color:var(--lime);background:rgba(184,255,87,.07)}
.pill-name{font-size:12px;font-weight:800;color:var(--muted)}
.pill.on .pill-name{color:var(--lime)}
.pill-wk{font-size:9px;color:var(--muted);margin-top:2px}
.pill.on .pill-wk{color:var(--lime-dim)}
.nav{display:flex;border-top:1px solid var(--border);margin-top:12px}
.nb{flex:1;border:none;cursor:pointer;padding:10px 0;background:transparent;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-bottom:2px solid transparent;color:var(--muted);transition:all .15s}
.nb.on{color:var(--lime);border-bottom-color:var(--lime)}
.content{padding:16px 20px 0}
.phase-badge{background:rgba(184,255,87,.05);border:1px solid rgba(184,255,87,.15);border-radius:7px;padding:8px 11px;margin-bottom:13px;display:flex;justify-content:space-between;align-items:center}
.phase-lbl{font-size:12px;font-weight:600;color:var(--lime)}
.phase-wk{font-size:10px;color:var(--lime-dim)}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden}
.ke-card{border-color:rgba(184,255,87,.28);box-shadow:0 0 18px rgba(184,255,87,.04)}
.lp-card{border-color:rgba(56,189,248,.28);box-shadow:0 0 18px rgba(56,189,248,.04)}
.ch{padding:10px 15px;background:#161616;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.ke-card .ch{background:linear-gradient(90deg,rgba(184,255,87,.07),transparent);border-bottom-color:rgba(184,255,87,.15)}
.lp-card .ch{background:linear-gradient(90deg,rgba(56,189,248,.07),transparent);border-bottom-color:rgba(56,189,248,.15)}
.ch-left{display:flex;align-items:center;gap:7px}
.cbar{width:3px;height:13px;border-radius:2px}
.ke-card .cbar{background:var(--lime)}
.lp-card .cbar{background:var(--blue)}
.ctitle{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.ke-card .ctitle{color:var(--lime)}
.lp-card .ctitle{color:var(--blue)}
.cb{padding:14px 15px}
.xbadge{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:4px}
.xbadge.ke{background:rgba(184,255,87,.12);color:var(--lime);border:1px solid rgba(184,255,87,.25)}
.xbadge.lp{background:rgba(56,189,248,.12);color:var(--blue);border:1px solid rgba(56,189,248,.25)}
.fld{margin-bottom:11px}
.flbl{display:block;font-size:10px;font-weight:800;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;margin-bottom:5px}
.inp{background:#1c1c1c;border:1px solid #2e2e2e;border-radius:6px;padding:11px 12px;color:var(--white);font-size:17px;font-family:'SF Mono',monospace;width:100%;outline:none;transition:border-color .15s}
.inp::placeholder{color:#2e2e2e}
.inp.ke:focus{border-color:var(--lime)}
.inp.lp:focus{border-color:var(--blue)}
.div{height:1px;background:#1e1e1e;margin:12px 0}
.st{width:100%;border-collapse:collapse}
.st th{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:0 0 7px;text-align:left}
.st th:not(:first-child){text-align:center}
.st td{padding:7px 0;border-top:1px solid #1e1e1e;font-size:13px;color:#888}
.st td:not(:first-child){text-align:center;font-family:'SF Mono',monospace}
.st tr.hl td{color:var(--white)}
.rb{background:#0f0f0f;border-radius:8px;padding:13px;margin-bottom:10px}
.rb.ke{border:1px solid rgba(184,255,87,.2)}
.rb.lp{border:1px solid rgba(56,189,248,.2)}
.rl{font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:7px}
.rm2{display:flex;justify-content:space-between;align-items:center}
.rw{font-size:32px;font-weight:800;font-family:'SF Mono',monospace;letter-spacing:-1px}
.rs{font-size:11px;color:var(--muted);margin-top:2px}
.rtag{font-size:10px;font-weight:800;letter-spacing:.06em;padding:5px 10px;border-radius:20px;text-transform:uppercase}
.tup{background:rgba(184,255,87,.14);color:var(--lime)}
.tsa{background:rgba(251,191,36,.14);color:var(--gold)}
.tdn{background:rgba(248,113,113,.14);color:var(--red)}
.rmbox{border-radius:7px;padding:10px 12px;margin-bottom:11px;display:flex;justify-content:space-between;align-items:center;background:#0b0f12}
.rmbox.ke{border:1px solid rgba(184,255,87,.18)}
.rmbox.lp{border:1px solid rgba(56,189,248,.18)}
.rml{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.rmv{font-size:22px;font-weight:800;font-family:'SF Mono',monospace}
.wcard{background:#0f0f0f;border:1px solid var(--border);border-radius:10px;padding:13px;margin-bottom:10px}
.wday{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--lime);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
.wtag{font-size:9px;background:rgba(184,255,87,.09);border:1px solid rgba(184,255,87,.18);border-radius:4px;padding:2px 7px;color:var(--lime-dim)}
.xi{display:flex;align-items:flex-start;gap:9px;padding:8px 0;border-top:1px solid #1e1e1e}
.xdot{width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:5px}
.xname{font-size:12px;color:var(--white);font-weight:600;flex:1;line-height:1.4}
.xdet{font-size:10px;color:var(--muted);margin-top:1px}
.xload{font-size:12px;font-family:'SF Mono',monospace;font-weight:700;flex-shrink:0}
.tlrow{display:flex;gap:12px}
.tlspine{display:flex;flex-direction:column;align-items:center}
.tldot{width:11px;height:11px;border-radius:50%;flex-shrink:0;margin-top:3px}
.tlline{width:1px;flex:1;background:#1e1e1e;margin-top:4px}
.tlcard{flex:1;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:8px}
.tlcard.cur{border-color:rgba(184,255,87,.4);box-shadow:0 0 14px rgba(184,255,87,.06)}
.tltop{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}
.tltitle{font-size:13px;font-weight:800}
.tlwk{font-size:10px;font-family:'SF Mono',monospace}
.tlpill{font-size:9px;font-weight:800;background:rgba(184,255,87,.1);border:1px solid rgba(184,255,87,.22);color:var(--lime);padding:2px 7px;border-radius:10px;display:inline-block;margin-bottom:6px}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px}
.chip{font-size:9px;background:#1e1e1e;color:var(--muted);padding:3px 7px;border-radius:10px;border:1px solid var(--border)}
.tlnote{font-size:11px;color:#444;line-height:1.5}
.refblk{margin-bottom:20px}
.refhd{display:flex;align-items:center;gap:7px;margin-bottom:7px}
.refdot{width:7px;height:7px;border-radius:50%}
.reftbl{background:var(--card);border-radius:8px;overflow:hidden;border:1px solid var(--border);margin-bottom:9px}
.refrow{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-bottom:1px solid #1e1e1e}
.refrow:last-child{border-bottom:none}
.refreps{font-size:12px;color:#666;font-family:'SF Mono',monospace}
.refadj{font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px}
.refsub{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.stitle{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:9px}
.rbtn{width:100%;margin-top:6px;background:transparent;border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.hidden{display:none!important}
#fab{position:fixed;bottom:24px;right:20px;z-index:400;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,rgba(255,255,255,0.10),#222);box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;transition:background .3s,box-shadow .3s}
#fab.ready{background:linear-gradient(135deg,#b8ff57,#8ed43c);box-shadow:0 4px 20px rgba(184,255,87,.35),0 2px 8px rgba(0,0,0,.6)}
#fab svg{stroke:#555;transition:stroke .3s}
#fab.ready svg{stroke:#0b0f12}
#fab .fabtxt{font-size:7px;font-weight:900;letter-spacing:.06em;color:#555;transition:color .3s}
#fab.ready .fabtxt{color:#0b0f12}
#overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:500;opacity:0;pointer-events:none;transition:opacity .25s}
#sheet{position:fixed;bottom:0;left:50%;transform:translateX(-50%) translateY(100%);width:100%;max-width:430px;z-index:600;background:#161616;border-top:1px solid rgba(255,255,255,0.10);border-radius:20px 20px 0 0;padding:0 20px 44px;transition:transform .3s cubic-bezier(.32,.72,0,1);box-shadow:0 -8px 40px rgba(0,0,0,.8);overflow-y:auto;max-height:85vh}
.ex-section-lbl{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#555;margin:14px 0 6px}
.ex-default-row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid #1e1e1e;cursor:pointer}
.ex-default-row:last-of-type{border-bottom:none}
.ex-cb{width:16px;height:16px;margin-top:3px;flex-shrink:0;accent-color:var(--lime);cursor:pointer}
.ex-default-info{flex:1}
.ex-default-name{font-size:12px;font-weight:600;color:#aaa;transition:color .15s}
.ex-default-row:has(.ex-cb:checked) .ex-default-name{color:#fff}
.ex-default-detail{font-size:10px;color:var(--muted);margin-top:1px}
.ex-custom-row{display:flex;align-items:center;gap:8px;margin-top:8px}
.ex-custom-fields{flex:1;display:flex;flex-direction:column;gap:6px}
.ex-remove-btn{background:rgba(255,255,255,0.10);border:none;border-radius:50%;width:28px;height:28px;color:#888;cursor:pointer;font-size:15px;flex-shrink:0;line-height:1}
.ex-add-btn{width:100%;margin-top:10px;background:transparent;border:1px dashed rgba(255,255,255,0.10);border-radius:8px;padding:9px;color:#444;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.ex-add-btn:active{background:#1c1c1c;color:#888}
#sheet.open{transform:translateX(-50%) translateY(0)}
.sheet-handle{display:flex;justify-content:center;padding:12px 0 4px}
.sheet-grip{width:36px;height:4px;border-radius:2px;background:#333}
.sheet-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-top:4px}
.sheet-close{background:rgba(255,255,255,0.10);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;color:#888;font-size:18px;display:flex;align-items:center;justify-content:center;line-height:1;padding-bottom:1px}
.sheet-btn{width:100%;padding:15px;border-radius:12px;border:none;cursor:pointer;background:linear-gradient(135deg,#b8ff57,#8ed43c);color:#0b0f12;font-size:13px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;box-shadow:0 4px 20px rgba(184,255,87,.3)}
.sinp{background:#1c1c1c;border:1px solid #2e2e2e;border-radius:6px;padding:10px 12px;color:#fff;font-size:14px;width:100%;outline:none;font-family:inherit;transition:border-color .15s}
.sinp:focus{border-color:#b8ff57}
.sinp[type=number]{-moz-appearance:textfield}
.sinp[type=number]::-webkit-inner-spin-button,.sinp[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
`;

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function APREApp() {
  useEffect(() => {
    APP_URL = window.location.origin + '/apre';

    drawSets("ke", 0);
    drawSets("lp", 0);
    drawTimeline();
    drawRef();
    drawHistory();
    loadFromURL();

    var t = new Date();
    var dateEl = document.getElementById("s_date");
    if (dateEl) dateEl.value = (t.getMonth()+1)+"/"+t.getDate()+"/"+t.getFullYear();

    var EVENTS = ["input","change","keyup","blur","paste"];
    function bindInput(id, ex) {
      var el = document.getElementById(id);
      if (!el) return;
      EVENTS.forEach(function(evt) {
        el.addEventListener(evt, function(){ calc(ex); }, {passive:true});
      });
    }
    bindInput("ke_ww","ke"); bindInput("ke_s3","ke"); bindInput("ke_s4","ke");
    bindInput("lp_ww","lp"); bindInput("lp_s3","lp"); bindInput("lp_s4","lp");

    var pollTimer = null;
    function startPoll(ex){ if(pollTimer)clearInterval(pollTimer); pollTimer=setInterval(function(){calc(ex);},400); }
    function stopPoll(){ if(pollTimer){clearInterval(pollTimer);pollTimer=null;} }
    ["ke_ww","ke_s3","ke_s4"].forEach(function(id){
      var el=document.getElementById(id);
      if(el){el.addEventListener("focus",function(){startPoll("ke");});el.addEventListener("blur",stopPoll);}
    });
    ["lp_ww","lp_s3","lp_s4"].forEach(function(id){
      var el=document.getElementById(id);
      if(el){el.addEventListener("focus",function(){startPoll("lp");});el.addEventListener("blur",stopPoll);}
    });
    return () => { if(pollTimer) clearInterval(pollTimer); };
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="apre-wrap">

        {/* HEADER */}
        <div className="hdr">
          <div className="logo-row">
            <svg viewBox="0 0 867 352" xmlns="http://www.w3.org/2000/svg" style={{ height:38, width:"auto", display:"block", color:"var(--white)" }} aria-label="TRM" role="img"><path fillRule="evenodd" fill="currentColor" d="M541.00,4.00 L495.00,278.50 L546.00,346.50 L561.50,345.50 L593.00,144.50 L650.00,346.50 L697.50,345.50 L785.50,144.50 L786.00,348.50 L863.50,348.50 L859.50,4.00 L776.00,5.00 L685.50,202.00 L623.50,4.00 Z M270.00,4.00 L243.00,348.50 L321.50,347.50 L332.00,212.50 L426.00,348.50 L525.50,348.50 L419.50,207.50 L458.50,185.50 L476.50,166.50 L488.50,145.50 L496.50,115.50 L497.50,84.00 L492.50,61.00 L482.50,42.00 L456.50,19.00 L424.50,7.00 L396.50,4.00 Z M344.00,66.50 L371.50,66.50 L372.00,67.50 L379.50,67.50 L380.00,68.50 L383.50,68.50 L384.00,69.50 L388.50,69.50 L389.00,70.50 L391.50,70.50 L394.00,72.50 L396.50,72.50 L397.00,73.50 L398.50,73.50 L400.00,75.50 L401.50,75.50 L408.00,82.00 L408.00,83.50 L409.00,84.00 L409.00,85.50 L410.00,86.00 L410.00,87.50 L411.00,88.00 L411.00,89.50 L413.00,92.00 L413.00,95.50 L414.00,96.00 L414.00,101.50 L415.00,102.00 L415.00,110.50 L414.00,111.00 L414.00,119.50 L413.00,120.00 L413.00,123.50 L412.00,124.00 L412.00,126.50 L411.00,127.00 L411.00,129.50 L410.00,130.00 L409.00,133.50 L407.00,135.00 L407.00,136.50 L405.00,138.00 L405.00,139.50 L396.50,148.00 L395.00,148.00 L394.50,149.00 L393.00,149.00 L392.50,150.00 L391.00,150.00 L388.50,152.00 L383.00,153.00 L382.50,154.00 L379.00,154.00 L378.50,155.00 L375.00,155.00 L374.50,156.00 L369.00,156.00 L368.50,157.00 L337.00,157.00 L336.50,156.50 L336.50,145.00 L337.50,144.50 L337.50,132.00 L338.50,131.50 L338.50,119.00 L339.50,118.50 L339.50,106.00 L340.50,105.50 L340.50,94.00 L341.50,93.50 L341.50,81.00 L342.50,80.50 L342.50,68.00 Z M9.00,4.00 L4.00,72.50 L85.00,73.00 L64.00,348.50 L141.50,348.50 L163.50,73.00 L245.50,72.50 L250.50,4.00 Z" /></svg>
            <div className="logo-bar"></div>
            <div className="logo-pill">APRE</div>
          </div>
          <div className="hdr-sub">Progressive Resistance Loading · ACL Rehab</div>
          <div className="proto-row">
            <div className="pill on" id="p10" onClick={()=>setProto('apre10')}><div className="pill-name">APRE 10</div><div className="pill-wk">Wks 6–10</div></div>
            <div className="pill" id="p6" onClick={()=>setProto('apre6')}><div className="pill-name">APRE 6</div><div className="pill-wk">Wks 10–16</div></div>
            <div className="pill" id="p3" onClick={()=>setProto('apre3')}><div className="pill-name">APRE 3</div><div className="pill-wk">Wks 16+</div></div>
          </div>
          <div className="nav">
            <button className="nb on" onClick={(e)=>goTab('calc',e.currentTarget)}>Calculator</button>
            <button className="nb" onClick={(e)=>goTab('workouts',e.currentTarget)}>Workouts</button>
            <button className="nb" onClick={(e)=>goTab('history',e.currentTarget)}>6-Wk Block</button>
            <button className="nb" onClick={(e)=>goTab('timeline',e.currentTarget)}>Progression</button>
            <button className="nb" onClick={(e)=>goTab('ref',e.currentTarget)}>Reference</button>
          </div>
        </div>

        <div className="content">

          {/* CALC TAB */}
          <div id="tab_calc">
            <div style={{height:'12px'}}></div>
            <div className="phase-badge">
              <span className="phase-lbl" id="phLbl">Hypertrophy / Tissue Loading</span>
              <span className="phase-wk" id="phWk">Weeks 6–10 post-op</span>
            </div>
            <div id="wk_banner" style={{display:'none',background:'rgba(184,255,87,.07)',border:'1px solid rgba(184,255,87,.2)',borderRadius:'8px',padding:'10px 13px',marginBottom:'13px'}}>
              <div style={{fontSize:'9px',fontWeight:'800',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--lime)',marginBottom:'6px'}}>📋 LOADED FROM LAST SESSION — WEEK <span id="wk_num_banner">1</span> OF 6</div>
              <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                <div id="wk_ke_hint" style={{display:'none',fontSize:'11px',color:'#aaa'}}>KE Set 3 start: <span style={{color:'var(--lime)',fontFamily:'monospace',fontWeight:'700'}} id="wk_ke_hint_val">—</span></div>
                <div id="wk_lp_hint" style={{display:'none',fontSize:'11px',color:'#aaa'}}>LP Set 3 start: <span style={{color:'var(--blue)',fontFamily:'monospace',fontWeight:'700'}} id="wk_lp_hint_val">—</span></div>
              </div>
              <div style={{fontSize:'10px',color:'var(--muted)',marginTop:'5px'}}>These are carry-forward recommendations from last week. Adjust if clinically indicated.</div>
            </div>

            {/* KE Card */}
            <div className="card ke-card">
              <div className="ch"><div className="ch-left"><div className="cbar"></div><span className="ctitle">Knee Extension</span></div><span className="xbadge ke">KE</span></div>
              <div className="cb">
                <div className="fld"><label className="flbl">Set 3 Working Weight (lbs)</label><input className="inp ke" type="text" inputMode="decimal" placeholder="Enter working weight" id="ke_ww" /></div>
                <div className="div"></div>
                <table className="st"><thead><tr><th>Set</th><th>Reps</th><th>Load (lbs)</th><th>% 1RM</th></tr></thead><tbody id="ke_tbl"></tbody></table>
                <div className="div"></div>
                <div className="fld"><label className="flbl">Set 3 — Reps Completed</label><input className="inp ke" type="text" inputMode="numeric" placeholder="How many reps?" id="ke_s3" /></div>
                <div id="ke_s4rec" className="hidden"></div>
                <div id="ke_s4g" className="hidden">
                  <div id="ke_rmb" className="rmbox ke hidden"><div className="rml">Estimated 1RM</div><div className="rmv" style={{color:'var(--lime)'}} id="ke_rm">—</div></div>
                  <div className="fld"><label className="flbl">Set 4 — Reps Completed</label><input className="inp ke" type="text" inputMode="numeric" placeholder="After Set 4..." id="ke_s4" /></div>
                  <div id="ke_next" className="hidden"></div>
                </div>
              </div>
            </div>

            {/* LP Card */}
            <div className="card lp-card">
              <div className="ch"><div className="ch-left"><div className="cbar"></div><span className="ctitle">Leg Press / Shuttle</span></div><span className="xbadge lp">LP</span></div>
              <div className="cb">
                <div className="fld"><label className="flbl">Set 3 Working Weight (lbs)</label><input className="inp lp" type="text" inputMode="decimal" placeholder="Enter working weight" id="lp_ww" /></div>
                <div className="div"></div>
                <table className="st"><thead><tr><th>Set</th><th>Reps</th><th>Load (lbs)</th><th>% 1RM</th></tr></thead><tbody id="lp_tbl"></tbody></table>
                <div className="div"></div>
                <div className="fld"><label className="flbl">Set 3 — Reps Completed</label><input className="inp lp" type="text" inputMode="numeric" placeholder="How many reps?" id="lp_s3" /></div>
                <div id="lp_s4rec" className="hidden"></div>
                <div id="lp_s4g" className="hidden">
                  <div id="lp_rmb" className="rmbox lp hidden"><div className="rml">Estimated 1RM</div><div className="rmv" style={{color:'var(--blue)'}} id="lp_rm">—</div></div>
                  <div className="fld"><label className="flbl">Set 4 — Reps Completed</label><input className="inp lp" type="text" inputMode="numeric" placeholder="After Set 4..." id="lp_s4" /></div>
                  <div id="lp_next" className="hidden"></div>
                </div>
              </div>
            </div>
            <button className="rbtn hidden" id="resetBtn" onClick={()=>resetAll()}>Reset All</button>
          </div>

          {/* WORKOUTS TAB */}
          <div id="tab_workouts" className="hidden">
            <div style={{height:'12px'}}></div>
            <div id="w_empty" className="card">
              <div className="cb" style={{textAlign:'center',padding:'28px 16px'}}>
                <div style={{fontSize:'30px',marginBottom:'10px'}}>📋</div>
                <div style={{fontSize:'12px',color:'var(--muted)',lineHeight:'1.7'}}>Complete the APRE calculator first.<br/>Weekly workouts generate automatically<br/>once Set 4 reps are entered.</div>
                <div style={{fontSize:'10px',color:'#333',marginTop:'6px'}}>Works with KE only, LP only, or both.</div>
              </div>
            </div>
            <div id="w_content" className="hidden"></div>
          </div>

          {/* HISTORY TAB */}
          <div id="tab_history" className="hidden">
            <div style={{height:'12px'}}></div>
            <div id="histContent"></div>
          </div>

          {/* TIMELINE TAB */}
          <div id="tab_timeline" className="hidden">
            <div style={{height:'12px'}}></div>
            <div className="stitle">ACL Progression Roadmap</div>
            <div id="tlContent"></div>
          </div>

          {/* REF TAB */}
          <div id="tab_ref" className="hidden">
            <div style={{height:'12px'}}></div>
            <div id="refContent"></div>
          </div>

        </div>{/* .content */}

        {/* FAB */}
        <button id="fab" onClick={openSheet} title="Export PDF">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <polyline points="9 15 12 18 15 15"/>
          </svg>
          <span className="fabtxt">PDF</span>
        </button>

        {/* OVERLAY */}
        <div id="overlay" onClick={closeSheet}></div>

        {/* SHEET */}
        <div id="sheet">
          <div className="sheet-handle"><div className="sheet-grip"></div></div>
          <div className="sheet-hdr">
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{width:'3px',height:'16px',background:'var(--lime)',borderRadius:'2px'}}></div>
              <div>
                <div style={{fontSize:'14px',fontWeight:'800',color:'#fff'}}>Export Session PDF</div>
                <div style={{fontSize:'10px',color:'#555',marginTop:'1px'}}>Opens in browser — share or save from there</div>
              </div>
            </div>
            <button className="sheet-close" onClick={closeSheet}>✕</button>
          </div>
          <div id="sheet_nodata" className="hidden" style={{textAlign:'center',padding:'16px 0 20px'}}>
            <div style={{fontSize:'28px',marginBottom:'8px'}}>⚠️</div>
            <div style={{fontSize:'12px',color:'#555',lineHeight:'1.6'}}>Complete the APRE calculator first.<br/>Enter Set 4 reps on at least one exercise.</div>
          </div>
          <div id="sheet_form">
            <div className="g2" style={{marginBottom:'10px'}}>
              <div>
                <label style={{display:'block',fontSize:'9px',fontWeight:'800',letterSpacing:'.12em',textTransform:'uppercase',color:'#555',marginBottom:'5px'}}>Patient Code</label>
                <input id="s_name" className="sinp" type="text" placeholder="e.g. PT-001" />
              </div>
              <div>
                <label style={{display:'block',fontSize:'9px',fontWeight:'800',letterSpacing:'.12em',textTransform:'uppercase',color:'#555',marginBottom:'5px'}}>Date</label>
                <input id="s_date" className="sinp" type="text" placeholder="MM/DD/YYYY" />
              </div>
            </div>
            <div className="g2" style={{marginBottom:'16px'}}>
              <div>
                <label style={{display:'block',fontSize:'9px',fontWeight:'800',letterSpacing:'.12em',textTransform:'uppercase',color:'#555',marginBottom:'5px'}}>Week of Block (1–6)</label>
                <input id="s_weeks" className="sinp" type="number" inputMode="numeric" placeholder="e.g. 2" min="1" max="6" />
              </div>
              <div>
                <label style={{display:'block',fontSize:'9px',fontWeight:'800',letterSpacing:'.12em',textTransform:'uppercase',color:'#555',marginBottom:'5px'}}>Therapist</label>
                <input id="s_therapist" className="sinp" type="text" placeholder="Your name" />
              </div>
            </div>
            <div style={{height:'1px',background:'#222',margin:'4px 0 12px'}}></div>
            <div className="ex-section-lbl">Workout 2 — Companion Exercises</div>
            <div id="ex_list_w2" style={{background:'#111',borderRadius:'8px',padding:'0 12px',marginBottom:'4px',border:'1px solid #1e1e1e'}}></div>
            <div className="ex-section-lbl">Workout 3 — Companion Exercises</div>
            <div id="ex_list_w3" style={{background:'#111',borderRadius:'8px',padding:'0 12px',marginBottom:'16px',border:'1px solid #1e1e1e'}}></div>
            <button className="sheet-btn" onClick={genPDF}>↗ Export PDF + QR Code</button>
          </div>
        </div>

      </div>{/* .apre-wrap */}
    </>
  );
}
