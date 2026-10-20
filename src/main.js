/* ===== Nebenexistenz · Logik ===== */
const BUILD="__BUILD__";
const KEY="nebenexistenz-v1";
const GV=5;
const MAX_AKTIV=3;
const IN_FRAME=(()=>{try{return window.self!==window.top}catch(e){return true}})();

/* ---------- Zustand ---------- */
function fresh(){return{
  gv:GV, onb:false, demo:false,
  prof:{land:"", ort:"", beruf:"", netto:0, fix:0, ruecklage:0, stunden:4, tage:[2,6]},
  pduties:{}, werte:[], people:[], ventures:[], time:[], weeks:[],
  settings:{theme:"auto", vib:true, apps:{wg:"https://wurstgott.github.io/fernweh/wertegeruest/", bt:"https://wurstgott.github.io/biotop/", gk:"https://wurstgott.github.io/fernweh/glueckskompass/"}},
  lv:{}, fresh:[], seen:{}, mq:[], hint:{d:"",id:""}, hintsOff:{}, opens:{d:"",n:0}, override:"", tab:"home"
}}
let S=fresh();
function load(){
  try{const raw=localStorage.getItem(KEY); if(!raw) return;
    const o=JSON.parse(raw); S=deepMerge(fresh(),o); migrate();
  }catch(e){}
}
function deepMerge(base,o){
  for(const k in o){ if(o[k]&&typeof o[k]==="object"&&!Array.isArray(o[k])&&base[k]&&typeof base[k]==="object"&&!Array.isArray(base[k])) base[k]=deepMerge(base[k],o[k]); else base[k]=o[k] }
  return base;
}
function migrate(){
  S.ventures.forEach(v=>{ v.duties=v.duties||{}; v.team=v.team||[]; v.runs=v.runs||[]; v.results=v.results||[]; v.werte=v.werte||{}; v.bio=v.bio||{}; v.calc=Object.assign({},(tplOf(v)||{}).calc||{},v.calc||{}) });
  if((S.gv||1)<2){S.ventures.forEach(v=>{S.lv[v.id]=stage(v);v.pending=v.pending||{}});S.fresh=[]}
  if((S.gv||1)<4){const p=S.prof;if(n0(p.wp)||n0(p.verplant))p.weiteres=true;delete p.krypto;delete p.immoRate}
  if((S.gv||1)<5){["oed","beamt"].forEach(k=>{if(S.pduties[k]){S.ventures.forEach(v=>{v.duties[k]=v.duties[k]||S.pduties[k];if(k==="beamt")v.duties.beamtA=v.duties.beamtA||S.pduties[k]});delete S.pduties[k]}})}
  const ap=S.settings.apps||{};
  if(ap.wg==="https://wurstgott.github.io/wertegeruest/") ap.wg="https://wurstgott.github.io/fernweh/wertegeruest/";
  if(ap.gk==="https://wurstgott.github.io/glueckskompass/") ap.gk="https://wurstgott.github.io/fernweh/glueckskompass/";
  S.gv=GV;
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function save(){ detectProgress(); persist() }

/* ---------- Hilfen ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const dayDiff=(a,b)=>Math.round((new Date(b+"T12:00")-new Date(a+"T12:00"))/864e5);
const eur=(n,d=0)=>(isFinite(n)?n:0).toLocaleString("de-DE",{minimumFractionDigits:d,maximumFractionDigits:d})+" €";
const dz=x=>x===""||x==null?"":String(x).replace(".",",");
const n0=x=>{if(typeof x==="number")return isFinite(x)?x:0;
  let t=String(x==null?"":x).trim().replace(/[\s€%]/g,"").replace(/^−/,"-");
  if(t.includes(","))t=t.replace(/\./g,"").replace(",",".");      // 1.234,50
  else if(/^-?\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,"");  // 22.000
  const v=parseFloat(t);return isFinite(v)?v:0};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const tplOf=v=>VORLAGEN.find(t=>t.id===v.tpl);
const landN=()=>{const l=LAENDER.find(x=>x.id===S.prof.land);return l?l.n:"deinem Bundesland"};
const dateDE=d=>{if(!d)return"";const [y,m,t]=d.split("-");return t+"."+m+"."+y};
const agoTxt=d=>{if(!d)return"noch nie";const n=dayDiff(d,today());return n<=0?"heute":n===1?"gestern":"vor "+n+" Tagen"};
const ZAHLW=n=>["null","einer","zwei","drei","vier","fünf","sechs","sieben","acht","neun","zehn","elf","zwölf"][n]||String(n);
const WT=["So","Mo","Di","Mi","Do","Fr","Sa"];
const WTL=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
function snapshot(){return JSON.parse(JSON.stringify(S))}
const aktive=()=>S.ventures.filter(v=>!v.exit);
const vById=id=>S.ventures.find(v=>v.id===id);

/* ---------- Rechnung ---------- */
const AUSFALL=0.85; // Wetter, Krankheit, Absagen
function ustFaktor(v){const f=tplOf(v).f;return S.prof.ust?(f.lebensmittel&&!f.ausschank?1.07:1.19):1}
function calc(v){
  const c=v.calc, t=tplOf(v);
  const umsatz=n0(c.preis)*n0(c.stueck)/ustFaktor(v);
  const ware=n0(c.kosten)*n0(c.stueck);
  const schwund=ware*n0(c.schwund)/100;
  const form=c.form||"kurz";
  const abg=form==="mini"?RECHT.minijobAbgabe/100:form==="kurz"?0.03:0;
  const personal=n0(c.lohn)*n0(c.teamStd)*(1+abg);
  const prov=umsatz*n0(c.prov)/100;
  const kosten=ware+schwund+n0(c.stand)+personal+n0(c.fix)+prov;
  const gewinn=umsatz-kosten;
  const laeufe=n0(c.laeufe||t.laeufe), effL=laeufe*AUSFALL;
  const jahrK=n0(c.jahr);
  const jahrU=umsatz*effL, jahrG=gewinn*effL-jahrK;
  const meine=n0(c.meineStd);
  const proStd=meine>0?jahrG/(meine*laeufe*AUSFALL):null;
  const start=n0(c.start);
  const amort=gewinn>0?Math.ceil(start/gewinn):null;
  const wochenStd=meine*laeufe/52;
  const saison=t.lauf==="Markttag"||t.lauf==="Festtag";
  const kapital=Math.round((start+(saison?0.5*n0(c.stand)*laeufe+0.25*ware*laeufe:2*(ware+n0(c.stand)+n0(c.fix)))+jahrK)/50)*50;
  const ruecklage=Math.max(0,jahrG)*0.3;
  return{umsatz,ware,schwund,personal,prov,kosten,gewinn,laeufe,effL,jahrK,jahrU,jahrG,meine,proStd,start,amort,wochenStd,abg,ruecklage,kapital,saison};
}
function tplKapital(t){return calc({tpl:t.id,calc:Object.assign({form:t.f.team?(t.besch||"mini"):"keine",laeufe:t.laeufe,start:Math.round((t.start[0]+t.start[1])/2/100)*100},t.calc),runs:[],team:[]}).kapital}
function rahmen(){
  const p=S.prof, fest=(p.beruf==="ang"||p.beruf==="oed"||p.beruf==="beamt")&&!p.befristet, mon=fest?3:6;
  const monat=n0(p.netto)-n0(p.fix)+(p.immo?n0(p.immoUeber):0), defizit=Math.max(0,-monat);
  const immoPuffer=p.immo?3*n0(p.kaltmiete):0;
  const notgroschen=mon*n0(p.fix)+immoPuffer+6*defizit;
  const wpAll=p.weiteres?n0(p.wp):0, res=p.weiteres?n0(p.verplant):0, inWp=p.verplantWo==="wp";
  const wp=Math.max(0,wpAll-(inWp?res:0)), resBar=inWp?Math.max(0,res-wpAll):res;
  const wpDeckt=Math.min(notgroschen/2,0.5*wp);          // Wertpapiere ersetzen höchstens die Hälfte des Notgroschens, mit 50 % Abschlag
  const schulden=p.schuld?n0(p.schulden):0;
  const frei=Math.max(0,n0(p.ruecklage)-resBar-schulden-(notgroschen-wpDeckt));
  const erstes=S.ventures.length<=1;
  const deckel=Math.round(frei*(erstes?0.10:0.15)/50)*50, gesamt=Math.round(frei*0.30/50)*50;
  const gebunden=aktive().reduce((s,v)=>s+calc(v).kapital,0);
  return{mon,fest,notgroschen,immoPuffer,defizit,wpDeckt,schulden,frei,deckel,gesamt,gebunden,erstes,monat,gesetzt:n0(p.ruecklage)>0||n0(p.netto)>0};
}
function jahresUmsatzAlle(){return aktive().reduce((s,v)=>s+calc(v).jahrU,0)}
function jahresGewinnAlle(){return aktive().reduce((s,v)=>s+calc(v).jahrG,0)}
function rechnungTxt(v){const c=v.calc,r=calc(v),t=tplOf(v);
  return `Pro ${t.lauf}: Preis ${eur(n0(c.preis),2)}, Stückkosten ${eur(n0(c.kosten),2)}, ${n0(c.stueck)} Stück, Stand- oder Plattformkosten ${eur(n0(c.stand))}, Team ${n0(c.teamStd)} Std. zu ${eur(n0(c.lohn),2)}, sonstige Fixkosten ${eur(n0(c.fix))}. Ergebnis pro ${t.lauf}: Umsatz ${eur(r.umsatz)}, Gewinn ${eur(r.gewinn)}. ${r.laeufe} Läufe im Jahr, Startkosten ${eur(r.start)}`}

/* ---------- Bauteile ---------- */
function dutiesFor(v){
  const f=(tplOf(v)||{}).f||{};
  return PFLICHTEN.filter(d=>{try{return d.wenn(S.prof,f)}catch(e){return false}});
}
const PERSON=new Set(["ag","kv","fse","ku","euer","ihk","kasse","bg"]);
function dutyDone(v,d){return PERSON.has(d.id)?!!S.pduties[d.id]:!!(v.duties||{})[d.id]}
function traegt(v){
  if(v.runs.length<3) return false;
  const last=v.runs.slice(-3);
  const ok=last.every(r=>{const g=n0(r.umsatz)-n0(r.kosten),m=n0(r.meineStd),t=n0(r.teamStd);return g>0&&m<=Math.max(1,0.15*(m+t))});
  return ok&&v.runs.some(r=>n0(r.meineStd)===0);
}
const CHECK={
  wahl:()=>true,
  pass:v=>!!v.passOk&&n0(v.calc.preis)>0&&n0(v.calc.stueck)>0,
  prod:v=>!!(v.prod&&v.prod.trim()),
  amt:v=>dutiesFor(v).filter(d=>d.w==="vor").every(d=>dutyDone(v,d)),
  lauf:v=>v.runs.length>=1,
  team:v=>v.team.length>0||!!v.solo,
  traegt:v=>traegt(v)
};
function stageChecks(v){return BAUTEILE.map(b=>!!CHECK[b.id](v))}
function stage(v){const c=stageChecks(v);let n=0;for(const x of c){if(x)n++;else break}return n}
function detectProgress(){
  S.ventures.forEach(v=>{
    const n=stage(v), old=S.lv[v.id]||0;
    if(n>old){ for(let i=old;i<n;i++) S.fresh.push(v.id+":"+i);
      if(n>=3&&!S.seen.amt){S.seen.amt=1;S.mq.push("amt")}
      if(n>=5&&v.team.some(m=>m.form!=="partner")&&!S.seen.team){S.seen.team=1;S.mq.push("team")}
      if(n>=6&&!S.seen.lauf){S.seen.lauf=1;S.mq.push("lauf")}
      if(n>=7&&!S.seen.traegt){S.seen.traegt=1;S.mq.push("traegt")}
    }
    S.lv[v.id]=n;
    if(v.exit&&!S.seen.exit){S.seen.exit=1;S.mq.push("exit")}
  });
  if(S.ventures.length&&!S.seen.first){S.seen.first=1;S.mq.push("first")}
}

/* ---------- Gleichgewicht ---------- */
function weekMin(vid){const t=today();
  const tm=S.time.filter(x=>dayDiff(x.d,t)<7&&(!vid||x.vid===vid)).reduce((s,x)=>s+n0(x.min),0);
  const rn=S.ventures.filter(v=>!vid||v.id===vid).reduce((s,v)=>s+v.runs.filter(r=>dayDiff(r.d,t)<7&&dayDiff(r.d,t)>=0).reduce((a,r)=>a+n0(r.meineStd)*60,0),0);
  return tm+rn}
const seenRecently=p=>{const t=today();return (p.last&&dayDiff(p.last,t)<=14)||(p.added&&dayDiff(p.added,t)<14)};
function lifeShare(){if(!S.people.length) return null; return S.people.filter(seenRecently).length/S.people.length}
function balance(){
  const budget=Math.max(30,n0(S.prof.stunden)*60), load=weekMin()/budget, ls=lifeShare();
  const solo=aktive().filter(v=>v.solo).length;
  let score=clamp((load-0.8)*0.9,-0.4,1.1)+(ls==null?0:(0.55-ls)*0.9)+solo*0.08;
  score=clamp(score,-1,1);
  const state=!S.ventures.length&&!S.people.length?"leer":score>0.25?"zieht":score<-0.2?"leben":"gleich";
  return{score,load,ls,budget,state};
}
const isVorhabentag=()=>S.prof.tage.includes(new Date().getDay())||S.firstDay===today();

/* ---------- Nächster Schritt ---------- */
function stalePerson(){
  const c=S.people.filter(p=>p.last!==today());
  if(!c.length) return null;
  return c.sort((a,b)=>(a.last||"0000")<(b.last||"0000")?-1:1)[0];
}
function lifeStep(reason){
  if(!S.people.length) return{tone:"var(--leben)",ey:"Leben",t:"Trag die Menschen ein, die dir nah sind",x:reason+" Die App achtet dann darauf, dass sie nicht aus dem Blick geraten.",btns:[{l:"Menschen eintragen",a:"sheet",id:"people",c:"leben"}]};
  const p=stalePerson();
  if(!p||S.lifeLater===today()) return{tone:"var(--leben)",ey:"Leben",t:"Für heute ist nichts mehr dran",x:"Die Vorhaben laufen auch, wenn du nicht hinschaust. Genieß den Rest des Tages.",btns:[]};
  const imp=LEBEN_IMPULSE[(new Date().getDate()+p.name.length)%LEBEN_IMPULSE.length].replace("{p}",p.name);
  return{tone:"var(--leben)",ey:"Leben",t:imp,x:reason+" Zuletzt eingetragen: "+agoTxt(p.last)+".",btns:[{l:"Erledigt",a:"seen",id:p.id,c:"leben"},{l:"Heute nicht",a:"later",c:"ghost"}]};
}
function ventureStep(v){
  const n=stage(v), t=tplOf(v), bt=BAUTEILE[n];
  const B={tone:"var(--neben)",ey:v.name+" · "+(bt?bt.verb:"weitergeben")};
  if(!bt) return{tone:"var(--geld)",ey:v.name+" · weitergeben",t:"Prüfen, ob „"+v.name+"“ übergeben werden kann",x:"Es trägt sich. Jetzt ist ein guter Moment, es an jemanden zu verkaufen, der es selbst führen will, zum Beispiel an die Standleitung.",btns:[{l:"Übergabe ansehen",a:"venture",id:v.id,sub:"uebergabe"}]};
  switch(bt.id){
    case"pass": return{...B,t:"Rechnung für „"+v.name+"“ prüfen",x:"Trag Preis, Kosten und Stückzahl ein. Die App zeigt dir, ob es sich trägt und ob das nötige Geld zu deinem Rahmen passt.",btns:[{l:"Zur Rechnung",a:"venture",id:v.id,sub:"rechnung"},{l:"Preise vergleichen lassen",a:"auftrag",id:v.id,task:"a_preis",c:"ghost"}]};
    case"prod": return{...B,t:"Konzept für „"+v.name+"“ ausarbeiten lassen",x:"Lass Claude drei Varianten mit Stückkosten und Kennzeichnungspflichten ausarbeiten. Mit Konzept, Fotos und Muster kannst du dich danach um Stand oder Laden bewerben.",btns:[{l:"Claude beauftragen",a:"auftrag",id:v.id,task:"a_konzept"},{l:"Selbst eintragen",a:"venture",id:v.id,sub:"auftraege",c:"ghost"}]};
    case"amt":{const open=dutiesFor(v).filter(d=>d.w==="vor"&&!dutyDone(v,d)), d=open.find(d=>!isPending(v,d));
      if(!d){const w=open.map(d=>fill(d.wer,v));return{...B,t:"Warten auf "+[...new Set(w)].join(", "),x:"Du hast alles beantragt. Bis die Antwort kommt, gibt es für „"+v.name+"“ nichts zu tun.",btns:[{l:"Pflichten ansehen",a:"venture",id:v.id,sub:"pflichten",c:"ghost"},{l:"Zum Leben",a:"tab",id:"leben",c:"leben"}]}}
      return{...B,t:d.t,x:fill(d.x,v).split(". ")[0]+".",btns:[{l:"Ansehen",a:"venture",id:v.id,sub:"pflichten"},...(d.auftrag?[{l:"Claude beauftragen",a:"auftrag",id:v.id,task:d.auftrag,c:"ghost"}]:NOASK.has(fill(d.wer,v))?[]:[{l:"Anfrage vorbereiten",a:"auftrag",id:v.id,task:"a_anfrage",duty:d.id,c:"ghost"}])]}}
    case"lauf": return{...B,t:"Den ersten "+t.lauf+" mitmachen und abrechnen",x:"Beim ersten Lauf bist du am besten selbst dabei. Danach trägst du Umsatz, Kosten und deine Stunden ein und siehst, was wirklich übrig bleibt.",btns:[{l:"Lauf eintragen",a:"sheet",id:"run",vid:v.id}]};
    case"team": return t.f.kommission
      ?{...B,t:"Läden finden, die für dich verkaufen",x:"Ein Laden oder Stand, der auf Provision verkauft, nimmt dir den Alltag ab.",btns:[{l:"Partnerläden finden",a:"auftrag",id:v.id,task:"a_laeden"},{l:"Zum Team",a:"venture",id:v.id,sub:"team",c:"ghost"}]}
      :{...B,t:t.f.team?"Jemanden finden, der den Alltag führt":"Entscheiden, wer den Alltag macht",x:"Ein Vorhaben trägt erst dann nebenher, wenn nicht du jeden Handgriff machst.",btns:[{l:"Zum Team",a:"venture",id:v.id,sub:"team"},{l:"Anzeige schreiben lassen",a:"auftrag",id:v.id,task:"a_stelle",c:"ghost"}]};
    case"traegt": return{...B,t:"Zeigen, dass es sich trägt",x:"Drei Läufe mit Gewinn, und mindestens einer ganz ohne dich. Dann ist „"+v.name+"“ ein tragender Teil.",btns:[{l:"Lauf eintragen",a:"sheet",id:"run",vid:v.id},{l:t.f.team?"Handbuch fürs Team":"Rechnung ansehen",...(t.f.team?{a:"auftrag",id:v.id,task:"a_handbuch"}:{a:"venture",id:v.id,sub:"rechnung"}),c:"ghost"}]};
  }
  return{...B,t:"„"+v.name+"“ ansehen",x:"",btns:[{l:"Öffnen",a:"venture",id:v.id}]};
}
function isPending(v,d){return !!((v.pending||{})[d.id])}
function nextStep(){
  const p=S.prof;
  if(!p.land||!p.beruf) return{tone:"var(--neben)",ey:"Anfang",t:"Deinen Rahmen festlegen",x:"Bundesland, Hauptberuf, Geld und Zeit. Daraus leitet die App ab, welche Schritte nötig sind und wie viel du einsetzen kannst.",btns:[{l:"Rahmen festlegen",a:"sheet",id:"profil"}]};
  if(new Date().getDay()===0&&!(S.weeks.length&&dayDiff(S.weeks[S.weeks.length-1].d,today())<6))
    return{tone:"var(--sinn)",ey:"Wochenblick",t:"Wie war die Woche?",x:"Drei kurze Fragen: mit wem du Zeit hattest, ob die Vorhaben Kraft gegeben oder genommen haben, und was du weglässt.",btns:[{l:"Wochenblick",a:"sheet",id:"week",c:"sinn"}]};
  if(!isVorhabentag()&&S.override!==today()){
    const st=lifeStep("Heute ist kein Vorhabentag, also ist Leben dran.");
    st.btns.push({l:"Doch kurz etwas erledigen",a:"override",c:"ghost"}); return st;
  }
  const b=balance();
  if(b.state==="zieht"&&S.override!==today()) { const st=lifeStep("Die Vorhaben ziehen gerade stärker als dein Rahmen vorsieht."); st.btns.push({l:"Trotzdem weiter",a:"override",c:"ghost"}); return st }
  const act=aktive();
  if(!act.length) return{tone:"var(--neben)",ey:"Erstes Vorhaben",t:"Ein erstes Vorhaben aufhängen",x:"Wähl eine von "+ZAHLW(VORLAGEN.length)+" Vorlagen. Jede bringt ihre Pflichtschritte, eine Rechnung und passende Aufträge an Claude mit.",btns:[{l:"Vorlagen ansehen",a:"sheet",id:"neu"}]};
  const sorted=[...act].sort((a,b)=>stage(b)-stage(a)||(a.created<b.created?-1:1));
  const ripe=sorted.find(v=>stage(v)>=7);
  const v=ripe||sorted.find(v=>stage(v)<7)||sorted[0];
  return ventureStep(v);
}

/* ---------- Text füllen ---------- */
function fill(s,v,extra){
  const t=v?tplOf(v):null, f=t?t.f:{};
  const tm=v&&v.team.length?v.team[0]:null;
  const r=v?calc(v):null;
  const pr=v?preisSpanne(v):null;
  const map={land:landN(),ort:S.prof.ort||"meiner Region",frist:RECHT.fsEFrist,kuV:RECHT.kuVorjahr.toLocaleString("de-DE"),kuL:RECHT.kuLaufend.toLocaleString("de-DE"),
    kurzTage:RECHT.kurzTage,desc:v&&t?(v.desc||t.kurz):"",mini:RECHT.minijob,abg:RECHT.minijobAbgabe,ml:RECHT.mindestlohn.toLocaleString("de-DE",{minimumFractionDigits:2}),
    haerte:RECHT.haerte,gew:RECHT.gewStFrei.toLocaleString("de-DE"),ihk:RECHT.ihkFrei.toLocaleString("de-DE"),stand:RECHT.stand,
    immo:S.prof.immo?" und habe Einkünfte aus Vermietung":"",beruf:({ang:"angestellt",oed:"im öffentlichen Dienst angestellt",beamt:"verbeamtet",stud:"im Studium",selbst:"schon selbstständig",ohne:"nicht angestellt"})[S.prof.beruf]||"berufstätig",name:v?v.name:"",vorlage:t?t.n:"",taetig:t?t.taetig:"",std:v?Math.max(1,Math.ceil(calc(v).wochenStd)):S.prof.stunden,
    form:tm&&tm.form==="mini"?"geringfügige Beschäftigung (Minijob)":"kurzfristige Beschäftigung",
    rechnung:v?rechnungTxt(v):"",laeufe:v&&v.runs.length?v.runs.map(x=>dateDE(x.d)+": Umsatz "+eur(n0(x.umsatz))+", Gewinn "+eur(n0(x.umsatz)-n0(x.kosten))).join("; "):"noch keine",
    preis:pr?eur(pr[0])+" bis "+eur(pr[1]):"",lm:f.lebensmittel?", Lebensmittelüberwachung, Gesundheitsamt":"",
    team:f.team?", Information des Teams nach § 613a BGB":"",
    ...ntMap(),
    stelle:"die zuständige Stelle",thema:"die Anmeldung meines Vorhabens",...(extra||{})};
  return s.replace(/\{(\w+)\}/g,(m,k)=>map[k]!=null?map[k]:m);
}
function ntInfo(){const p=S.prof,r=NTR[p.land]||null,l=p.lehrkraft?NTL[p.land]:null;
  const h=r?(p.lehrkraft&&p.land==="BE"?null:r.h):8;
  return{r,l,h,grenze:h||8,hTxt:h?h+" Stunden pro Woche":p.lehrkraft&&p.land==="BE"?"ein Fünftel deiner Pflichtstunden":"ein Fünftel deiner regelmäßigen Arbeitszeit, bei 40 Stunden also 8 Stunden pro Woche"};}
function ntMap(){const n=ntInfo(),r=n.r||{},l=n.l;
  return{ntG:r.g||"Landesbeamtengesetz",ntU:r.u||"",ntX:(r.x||"")+(r.ok?"":" Die Angaben für dieses Land sind noch nicht amtlich geprüft. Kläre sie mit deiner Dienststelle."),
    ntGrenze:"Als Regelgrenze gilt "+n.hTxt+" für alle Nebentätigkeiten zusammen, einschließlich Organisation und Vorbereitung.",
    ntWer:l?"Landesschulamt":"Dienststelle",
    ntVerb:(r.m==="G"&&S.prof.beruf==="beamt")?"zur Genehmigung vorlege":"anzeige",
    ntWie:l?"Mit dem Formular „"+l.formName+"“ auf dem Dienstweg über deine Schulleitung an das Landesschulamt, rechtzeitig vor Beginn. Die Schulleitung gibt eine Stellungnahme dazu ab. Anzugeben sind Art und Aufgaben, Beginn, Wochentage und Uhrzeit, die voraussichtliche Vergütung im Monat und die Stunden pro Woche einschließlich Vor- und Nachbereitung. "+l.zeit+" Warte die Reaktion des Landesschulamts ab, bevor du anfängst. Die vorbereiteten Angaben stehen unter „Formularwerte“.":"Schriftlich an deine Dienststelle, rechtzeitig vor Beginn, mit Art der Tätigkeit, Stunden pro Woche einschließlich Organisation und erwarteter Vergütung. Frag nach, ob es ein Formular gibt. Die vorbereiteten Angaben stehen unter „Formularwerte“.",
    oedWie:l?"Als angestellte Lehrkraft in Sachsen-Anhalt nutzt du dasselbe Formular wie Beamte, „"+l.formName+"“, auf dem Dienstweg über deine Schulleitung an das Landesschulamt. "+l.zeit:"Die Anzeige geht an die Personalstelle deines Arbeitgebers, bei Lehrkräften meist über die Schulleitung an die zuständige Landesbehörde. Eine kurze schriftliche Mail oder ein Formular genügt oft, frag nach, welche Form verlangt wird."};
}
function promptFor(v,task,dutyId){
  const a=AUFTRAEGE.find(x=>x.id===task), d=dutyId?PFLICHTEN.find(x=>x.id===dutyId):null;
  const extra=d?{stelle:fill(d.wer,v),thema:d.t+". Hintergrund: "+fill(d.x,v).replace(/\.\s*$/,"")}:null;
  return fill(a.p,v,extra)+"\n\nAntworte auf Deutsch in einfachen Sätzen. Nenne Quellen mit Link und sag klar, was ich selbst prüfen oder mit einer Fachperson klären muss.";
}
function preisSpanne(v){
  const r=calc(v), inv=n0(v.calc.inventar);
  let jg=r.jahrG;
  if(v.runs.length>=2){const avg=v.runs.reduce((s,x)=>s+n0(x.umsatz)-n0(x.kosten),0)/v.runs.length;jg=avg*r.effL-r.jahrK}
  const lo=inv+0.5*Math.max(0,jg), hi=inv+1.0*Math.max(0,jg);
  return[Math.round(lo/100)*100,Math.round(hi/100)*100,jg];
}

/* ---------- Mobile (Hauptbild) ---------- */
function shapePath(form,cx,cy,r){
  switch(form){
    case"dreieck":return`M${cx} ${cy-r*1.1}L${cx+r*1.05} ${cy+r*.75}L${cx-r*1.05} ${cy+r*.75}Z`;
    case"blatt":return`M${cx} ${cy-r*1.2}Q${cx+r*1.2} ${cy} ${cx} ${cy+r*1.2}Q${cx-r*1.2} ${cy} ${cx} ${cy-r*1.2}Z`;
    case"quadrat":return`M${cx-r*.85} ${cy-r*.85}h${r*1.7}v${r*1.7}h${-r*1.7}Z`;
    case"halbmond":return`M${cx-r} ${cy-r*.2}A${r} ${r} 0 0 0 ${cx+r} ${cy-r*.2}Z`;
    case"raute":return`M${cx} ${cy-r*1.15}L${cx+r*.9} ${cy}L${cx} ${cy+r*1.15}L${cx-r*.9} ${cy}Z`;
    case"tropfen":return`M${cx} ${cy-r*1.25}C${cx+r*.4} ${cy-r*.5} ${cx+r} ${cy-r*.1} ${cx+r} ${cy+r*.35}A${r} ${r} 0 0 1 ${cx-r} ${cy+r*.35}C${cx-r} ${cy-r*.1} ${cx-r*.4} ${cy-r*.5} ${cx} ${cy-r*1.25}Z`;
    case"fahne":return`M${cx-r*.9} ${cy-r*1.1}L${cx+r*1.1} ${cy-r*.2}L${cx-r*.9} ${cy+r*.7}Z`;
    case"kapsel":return`M${cx-r*.55} ${cy-r*1.1}h${r*1.1}a${r*.55} ${r*.55} 0 0 1 ${r*.55} ${r*.55}v${r*1.1}a${r*.55} ${r*.55} 0 0 1 ${-r*.55} ${r*.55}h${-r*1.1}a${r*.55} ${r*.55} 0 0 1 ${-r*.55} ${-r*.55}v${-r*1.1}a${r*.55} ${r*.55} 0 0 1 ${r*.55} ${-r*.55}Z`;
    default:return`M${cx-r} ${cy}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0Z`;
  }
}
function mobileSVG(){
  const b=balance(), ang=(b.score*9).toFixed(2);
  const W="var(--wire)", act=aktive(), done=S.ventures.filter(v=>v.exit);
  const fr=new Set(S.fresh);
  let maxY=180; const H=()=>done.length?330:Math.max(220,Math.ceil(maxY+18));
  let s=`<svg viewBox="0 0 354 __H__" role="img" aria-labelledby="mobT"><title id="mobT">Mobile: links das Leben, rechts die Vorhaben. ${b.state==="zieht"?"Die Vorhaben ziehen stärker.":b.state==="leben"?"Das Leben wiegt schwerer.":"Beide Seiten halten sich die Waage."}</title>`;
  s+=`<g class="sway"><circle cx="177" cy="8" r="3.2" fill="none" stroke="${W}" stroke-width="1.5"/><line x1="177" y1="11" x2="177" y2="52" stroke="${W}" stroke-width="1.5"/>`;
  s+=`<g class="tilt" style="transform:rotate(${ang}deg)">`;
  s+=`<path d="M56 60 Q177 44 298 60" fill="none" stroke="${W}" stroke-width="1.7"/><circle cx="177" cy="52" r="3" fill="${W}"/>`;
  /* Leben-Seite */
  s+=`<g class="mob-hit" data-a="tab" data-id="leben" tabindex="0" role="button" aria-label="Lebensseite öffnen">`;
  s+=`<circle cx="56" cy="146" r="40" fill="transparent"/><line x1="56" y1="60" x2="56" y2="118" stroke="${W}" stroke-width="1.5"/>`;
  s+=`<path class="plate" d="${shapePath("kreis",56,146,28)}" fill="var(--leben)"/>`;
  s+=`<text x="56" y="150" text-anchor="middle" font-family="var(--f-mono)" font-size="11" fill="var(--on)" letter-spacing=".06em">LEBEN</text>`;
  const ppl=S.people.slice(0,6);
  if(ppl.length){
    s+=`<line x1="56" y1="174" x2="56" y2="194" stroke="${W}" stroke-width="1.5"/><path d="M18 196 Q56 190 96 196" fill="none" stroke="${W}" stroke-width="1.5"/><circle cx="56" cy="193" r="2.2" fill="${W}"/>`;
    ppl.forEach((p,i)=>{
      const x=ppl.length===1?56:20+i*(76/(ppl.length-1)), len=22+((i*37)%30), y=195+len;
      const rec=p.last&&dayDiff(p.last,today())<=14, r=rec?9:7.5; maxY=Math.max(maxY,y+r);
      s+=`<line x1="${x.toFixed(1)}" y1="195" x2="${x.toFixed(1)}" y2="${(y-r).toFixed(1)}" stroke="${W}" stroke-width="1.2"/>`;
      s+=rec?`<circle cx="${x.toFixed(1)}" cy="${y}" r="${r}" fill="var(--leben)"/>`:`<circle cx="${x.toFixed(1)}" cy="${y}" r="${r}" fill="none" stroke="var(--leben)" stroke-width="1.5" stroke-dasharray="3 2.5"/>`;
    });
  }
  s+=`</g>`;
  /* Vorhaben-Seite */
  s+=`<line x1="298" y1="60" x2="298" y2="88" stroke="${W}" stroke-width="1.5"/><path d="M214 92 Q280 84 340 92" fill="none" stroke="${W}" stroke-width="1.6"/><circle cx="298" cy="88" r="2.5" fill="${W}"/>`;
  s+=`<g class="mob-hit" data-a="tab" data-id="vorhaben" tabindex="0" role="button" aria-label="Geld, zu den Vorhaben"><circle cx="216" cy="122" r="22" fill="transparent"/><line x1="216" y1="92" x2="216" y2="112" stroke="${W}" stroke-width="1.3"/><path class="plate" d="${shapePath("kreis",216,126,14)}" fill="var(--geld)"/></g>`;
  const slots=[[250,58],[286,96],[324,70]];
  for(let i=0;i<MAX_AKTIV;i++){
    const [x,len]=slots[i], v=act[i];
    if(!v){
      if(i===act.length) s+=`<g class="mob-hit" data-a="sheet" data-id="neu" tabindex="0" role="button" aria-label="Neues Vorhaben aufhängen"><circle cx="${x}" cy="${92+len}" r="24" fill="transparent"/><line x1="${x}" y1="92" x2="${x}" y2="${92+len-18}" stroke="${W}" stroke-width="1.2" stroke-dasharray="2 3"/><path d="${shapePath("kreis",x,92+len,16)}" fill="none" stroke="var(--faint)" stroke-width="1.4" stroke-dasharray="4 3"/><text x="${x}" y="${92+len+4}" text-anchor="middle" font-family="var(--f-ui)" font-size="16" fill="var(--faint)">+</text></g>`;
      continue;
    }
    const t=tplOf(v), n=stage(v), r=9+n*2.3, ybase=92+len+n*4; maxY=Math.max(maxY,ybase+r*1.3);
    s+=`<g class="mob-hit" data-a="venture" data-id="${v.id}" tabindex="0" role="button" aria-label="${esc(v.name)}, ${n} von 7 Bauteilen">`;
    s+=`<rect x="${x-18}" y="96" width="36" height="${(ybase-96+r+12).toFixed(1)}" fill="transparent"/><line x1="${x}" y1="92" x2="${x}" y2="${(ybase-r).toFixed(1)}" stroke="${W}" stroke-width="1.3"/>`;
    for(let k=0;k<7;k++){
      const yy=100+k*((ybase-r-108)/6);
      const on=k<n, nx=k===n, cls=fr.has(v.id+":"+k)?" class=\"plate-new\" style=\"transform-origin:"+x+"px "+yy.toFixed(1)+"px\"":"";
      if(on) s+=`<circle${cls} cx="${x}" cy="${yy.toFixed(1)}" r="2.6" fill="var(--neben)"/>`;
      else if(nx) s+=`<circle cx="${x}" cy="${yy.toFixed(1)}" r="2.6" fill="var(--bg)" stroke="var(--neben)" stroke-width="1.2"/>`;
    }
    const pc=fr.size&&[...fr].some(k=>k.startsWith(v.id+":"))?` class="plate plate-new" style="transform-origin:${x}px ${ybase}px"`:` class="plate"`;
    s+=`<path${pc} d="${shapePath(t.form,x,ybase,r)}" fill="var(--neben)"/>`;
    s+=`</g>`;
  }
  s+=`</g></g>`;
  /* Weitergegeben: ruht auf dem Boden, verschwindet nie */
  if(done.length){
    s+=`<line x1="24" y1="318" x2="330" y2="318" stroke="var(--line)" stroke-width="1.2"/>`;
    s+=`<text x="24" y="310" font-family="var(--f-mono)" font-size="10" fill="var(--faint)" letter-spacing=".06em">WEITERGEGEBEN</text>`;
    done.slice(0,8).forEach((v,i)=>{const x=150+i*24;s+=`<g class="mob-hit" data-a="venture" data-id="${v.id}" tabindex="0" role="button" aria-label="${esc(v.name)}, weitergegeben"><path d="${shapePath(tplOf(v).form,x,309,7)}" fill="var(--faint)"/></g>`});
  }
  s+=`</svg>`;
  return s.replace("__H__",H());
}
function balanceLine(){
  const b=balance(), h=(weekMin()/60);
  const st={zieht:"Die Vorhaben ziehen",leben:"Das Leben wiegt schwerer",gleich:"Im Gleichgewicht",leer:"Noch hängt nur das Leben"}[b.state];
  const ppl=S.people.length?` · ${S.people.filter(seenRecently).length} von ${S.people.length} Menschen gesehen`:"";
  return`<p class="balance"><b>${st}</b> · ${h.toLocaleString("de-DE",{maximumFractionDigits:1})} von ${S.prof.stunden} Std. Vorhabenzeit${ppl}</p>
  <p class="legend" aria-hidden="true"><span><i style="background:var(--leben)"></i>Leben</span><span><i style="background:var(--neben)"></i>Vorhaben</span><span><i style="background:var(--geld)"></i>Geld</span></p>`;
}

/* ---------- Ansichten ---------- */
const ICON={
  home:`<svg viewBox="0 0 24 24"><path d="M12 3v5M4 9q8-3 16 0M6 9v4M18 9v3"/><circle cx="6" cy="16" r="3"/><path d="M15.5 15h5l-2.5 4.5z"/></svg>`,
  vorhaben:`<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`,
  amt:`<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>`,
  leben:`<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.5-4 3-6 6-6s5.5 2 6 6M15 14.5c2.6 0 4.6 1.6 5 5"/></svg>`,
  gear:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>`,
  check:`<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`
};
function stepCard(st){
  return`<section class="next" style="--tone:${st.tone}" aria-labelledby="nextT"><p class="eyebrow"><span class="knot"></span>Nächster Schritt · ${esc(st.ey)}</p><h2 id="nextT">${esc(st.t)}</h2><p class="muted small">${esc(st.x)}</p><div class="row">${st.btns.map(btnHTML).join("")}</div></section>`;
}
function btnHTML(b){
  const at=Object.entries(b).filter(([k])=>!["l","c"].includes(k)).map(([k,v])=>`data-${k}="${esc(v)}"`).join(" ");
  return`<button class="btn ${b.c||""}" ${at}>${esc(b.l)}</button>`;
}
function hintFor(){
  const t=today();
  if(S.hint.d===t&&S.hint.id) return S.hintsOff[S.hint.id]?null:HINTS.find(h=>h.id===S.hint.id);
  if(S.hint.d===t&&S.hint.done) return null;
  const h=HINTS.find(h=>!S.hintsOff[h.id]&&h.when());
  if(h){S.hint={d:t,id:h.id};persist()} return h;
}
const HINTS=[
  {id:"oft",when:()=>S.opens.n>=4,t:"Du hast heute schon oft hineingesehen.",x:"Die Vorhaben laufen auch, wenn du nicht schaust. Die App meldet sich nicht von selbst, und das ist Absicht."},
  {id:"markt",when:()=>{const m=new Date().getMonth();return m>=1&&m<=6&&aktive().some(v=>tplOf(v).f.markt&&!v.duties.platz)},t:"Weihnachtsmärkte vergeben Plätze früh.",x:"Viele Fristen enden im Frühjahr oder Sommer. Der Auftrag „Passende Märkte finden“ sammelt sie für dich."},
  {id:"ku",when:()=>jahresUmsatzAlle()>20000,t:"Dein erwarteter Jahresumsatz nähert sich 25.000 Euro.",x:"Über dieser Grenze endet im Folgejahr die Kleinunternehmerregelung. Alle Vorhaben zählen zusammen."},
  {id:"werte",when:()=>aktive().length>0&&!S.werte.length,t:"Deine Werte fehlen noch.",x:"Wenn du deine Werte einträgst, prüft jedes Vorhaben, ob es dazu passt. Die Werte findest du im Wertegerüst."},
  {id:"solo",when:()=>aktive().some(v=>v.solo&&stage(v)>=5),t:"Ein Vorhaben machst du allein.",x:"Das ist erlaubt, kostet aber deine Zeit. Auf Dauer trägt sich eine Nebenexistenz leichter mit jemandem, der den Alltag führt."}
];
function viewHome(){
  const st=nextStep(), h=hintFor();
  let s=`<h1 class="vh">Nebenexistenz</h1><div class="stage">${mobileSVG()}</div>${balanceLine()}`;
  if(S.demo) s+=`<div class="banner"><span>Du siehst Beispieldaten.</span><button class="btn small ghost" data-a="demoOff">Beispiel löschen</button></div>`;
  s+=stepCard(st);
  const act=aktive();
  if(act.length){
    s+=`<div class="sec"><div class="wirehead"><span class="eyebrow">Hängt gerade</span></div><div class="list">`;
    act.forEach(v=>{const n=stage(v);s+=`<button class="li" data-a="venture" data-id="${v.id}"><span class="grow"><span class="t">${esc(v.name)}</span><span class="s">${BAUTEILE[n-1].n} · ${n} von 7 Bauteilen</span><span class="parts" aria-hidden="true">${BAUTEILE.map((b,i)=>`<i class="part ${i<n?"on":i===n?"nx":""}"></i>`).join("")}</span></span><span class="chev"></span></button>`});
    s+=`</div></div>`;
  }
  if(h) s+=`<div class="sec"><div class="note neben"><strong>${esc(h.t)}</strong><span>${esc(h.x)}</span><div><button class="linkbtn" data-a="hintOff" data-id="${h.id}">Passt so</button></div></div></div>`;
  s+=`<div class="sec"><div class="chips"><button class="btn ghost small" data-a="sheet" data-id="time">Vorhabenzeit eintragen</button>${isVorhabentag()?`<span class="pill info">Heute ist Vorhabentag</span>`:`<span class="pill">Heute ist ${WTL[new Date().getDay()]}, kein Vorhabentag</span>`}</div></div>`;
  s+=foot();
  return s;
}
function foot(){return`<div class="foot"><span>Die App bereitet vor und erklärt. Sie ersetzt keine Steuer- oder Rechtsberatung. Rechtsstand ${RECHT.stand}.</span><span>Alle Daten bleiben auf diesem Gerät. Stand ${esc(BUILD)}. © Carlo Maximilian Engeländer</span></div>`}

function viewVorhaben(){
  const act=aktive(), done=S.ventures.filter(v=>v.exit);
  let s=`<h2 style="margin-top:12px">Vorhaben</h2><p class="muted small">Höchstens drei gleichzeitig. So bleibt die Nebenexistenz neben dem Leben und nicht davor.</p>`;
  s+=`<div class="sec"><div class="list">`;
  if(!act.length) s+=`<p class="muted small" style="padding:14px 0">Noch hängt nichts. Das erste Vorhaben ist eine Wahl aus ${ZAHLW(VORLAGEN.length)} Vorlagen.</p>`;
  act.forEach(v=>{const n=stage(v),r=calc(v),t=tplOf(v);
    s+=`<button class="li" data-a="venture" data-id="${v.id}"><svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="${shapePath(t.form,15,15,10)}" fill="var(--neben)"/></svg><span class="grow"><span class="t">${esc(v.name)}</span><span class="s">${t.n} · ${BAUTEILE[n-1].n} · ${r.gewinn>0?"etwa "+eur(r.jahrG)+" Gewinn im Jahr":"Rechnung offen"}</span></span><span class="chev"></span></button>`});
  s+=`</div><button class="btn wide" data-a="sheet" data-id="neu" ${act.length>=MAX_AKTIV?"disabled":""}>Neues Vorhaben aufhängen</button>${act.length>=MAX_AKTIV?`<p class="muted small">Drei Vorhaben hängen. Übergib eines, bevor ein neues dazukommt.</p>`:""}</div>`;
  if(done.length){s+=`<div class="sec"><div class="wirehead"><span class="eyebrow">Weitergegeben</span></div><div class="list">`;
    done.forEach(v=>{s+=`<button class="li" data-a="venture" data-id="${v.id}"><span class="dot" style="--c:var(--faint)"></span><span class="grow"><span class="t">${esc(v.name)}</span><span class="s">${dateDE(v.exit.d)} · ${v.exit.art==="einstellen"?"eingestellt":"für "+eur(n0(v.exit.preis))+" übergeben"}</span></span><span class="chev"></span></button>`});
    s+=`</div></div>`}
  if(S.ventures.length) s+=wirkungHTML();
  const ju=jahresUmsatzAlle(), jg=jahresGewinnAlle();
  if(act.length){s+=`<div class="sec"><div class="wirehead"><span class="eyebrow">Alle Vorhaben zusammen</span></div><div class="figs">
    <button class="fig" data-a="explain" data-id="umsatz"><span class="k">Umsatz im Jahr</span><span class="v num">${eur(ju)}</span><span class="e">${ju<RECHT.kuVorjahr?"unter der Kleinunternehmergrenze":"über 25.000 €, Kleinunternehmerregelung prüfen"}</span></button>
    <button class="fig" data-a="explain" data-id="gewinn"><span class="k">Gewinn im Jahr</span><span class="v num ${jg<0?"neg":""}">${eur(jg)}</span><span class="e">vor Einkommensteuer</span></button></div></div>`}
  s+=wissenHTML("geld","Grundlagen zum Geld");
  return s+foot();
}
function wirkung(){
  const all=S.ventures, ppl=new Set();
  let lohn=0, std=0;
  all.forEach(v=>{v.team.forEach(m=>{if(m.form!=="partner")ppl.add(v.id+m.id)});
    const avg=v.team.filter(m=>m.form!=="partner"&&m.form!=="frei");const l=avg.length?avg.reduce((s,m)=>s+n0(m.lohn),0)/avg.length:n0(v.calc.lohn);
    v.runs.forEach(r=>{lohn+=n0(r.teamStd)*l;std+=n0(r.teamStd)})});
  const partner=all.reduce((s,v)=>s+v.team.filter(m=>m.form==="partner").length,0);
  const weiter=all.filter(v=>v.exit&&v.exit.art!=="einstellen").length;
  const bioV=all.filter(v=>Object.keys(v.bio||{}).length), bio=bioV.length?bioV.reduce((s,v)=>s+BIO_FRAGEN.filter(q=>v.bio[q.id]==="ja").length,0)/bioV.length:null;
  return{ppl:ppl.size,lohn,std,partner,weiter,bio};
}
function wirkungHTML(){const w=wirkung();
  if(!w.ppl&&!w.partner&&!w.lohn&&!w.weiter) return`<div class="sec"><div class="wirehead"><span class="eyebrow">Was es bewirkt</span></div><p class="muted small">Das Ziel ist nicht nur Geld für dich, sondern Arbeit für andere, Nachhaltigkeit und Sinn. Sobald jemand für eines deiner Vorhaben arbeitet oder verkauft, siehst du hier, was es bewirkt.</p></div>`;
  return`<div class="sec"><div class="wirehead"><span class="eyebrow">Was es bewirkt</span></div><p class="muted small">Das Ziel ist nicht nur Geld für dich, sondern Arbeit für andere, Nachhaltigkeit und Sinn. Deshalb steht das hier zuerst.</p><div class="figs">
  <div class="fig"><span class="k">Menschen mit Arbeit</span><span class="v num">${w.ppl}</span><span class="e">${w.partner?w.partner+" Partner verkaufen mit":"im Team deiner Vorhaben"}</span></div>
  <div class="fig"><span class="k">Löhne gezahlt</span><span class="v num">${eur(w.lohn)}</span><span class="e">${w.std.toLocaleString("de-DE")} Arbeitsstunden laut Läufen</span></div>
  <div class="fig"><span class="k">Weitergegeben</span><span class="v num">${w.weiter}</span><span class="e">${w.weiter===1?"Existenz gehört jetzt jemand anderem":"Existenzen gehören jetzt anderen"}</span></div>
  <div class="fig"><span class="k">Nachhaltigkeit</span><span class="v num">${w.bio==null?"–":w.bio.toLocaleString("de-DE",{maximumFractionDigits:1})+" / 5"}</span><span class="e">Schnitt des Nachhaltigkeitsblicks</span></div></div></div>`;
}
function wissenHTML(ber,title){
  const w=WISSEN.filter(x=>x.bereich===ber||(ber==="leben"&&x.bereich==="sinn"));
  return`<div class="sec"><div class="wirehead"><span class="eyebrow">${title}</span></div><div class="list">${w.map(x=>`<button class="li" data-a="sheet" data-id="wissen" data-wid="${x.id}"><span class="grow"><span class="t">${esc(x.t)}</span><span class="s">${esc(x.src)} ${evHTML(x.ev)}</span></span><span class="chev"></span></button>`).join("")}</div></div>`;
}
function evHTML(n){return`<span class="ev" aria-label="Belegstärke ${n} von 3">${[1,2,3].map(i=>`<i class="${i<=n?"on":""}"></i>`).join("")}</span>`}

function viewAmt(){
  const act=aktive(), l=LAENDER.find(x=>x.id===S.prof.land);
  let s=`<h2 style="margin-top:12px">Ämter und Pflichten</h2><p class="muted small">Was für deine Vorhaben nötig ist, abgeleitet aus Bundesland, Hauptberuf und Vorlage. Abhaken kannst du auch direkt hier.</p>`;
  if(!S.prof.land) s+=`<div class="sec"><button class="btn" data-a="sheet" data-id="profil">Zuerst den Rahmen festlegen</button></div>`;
  if(l){s+=`<div class="sec"><div class="wirehead"><span class="eyebrow">${esc(l.n)}</span></div><div class="card flat"><p class="small">Landesrecht betrifft dich vor allem bei Feiertagen, Ausschank, Sonn- und Feiertagsverkauf${S.prof.beruf==="beamt"?" und beim Nebentätigkeitsrecht für Beamte":""}.</p><p class="small muted">Zusätzliche Feiertage in ${esc(l.n)}: ${l.ft.map(esc).join(", ")}. An diesen Tagen sind Märkte oft geschlossen, und Saisonhilfen zählen den Tag mit, wenn er eigentlich ein Arbeitstag gewesen wäre.</p>${act[0]?`<div><button class="btn small ghost" data-a="auftrag" data-id="${act[0].id}" data-task="a_land">Landesregeln prüfen lassen</button></div>`:""}</div></div>`}
  {const bb=beamtBlock(null);if(bb)s+=`<div class="sec">${bb}</div>`}
  if(!act.length){s+=`<p class="muted small" style="margin-top:20px">Sobald ein Vorhaben hängt, erscheinen hier seine Pflichtschritte.</p>`;return s+foot()}
  const seen=new Set();
  ["vor","team","laufend","exit"].forEach(w=>{
    let rows="";
    act.forEach(v=>dutiesFor(v).filter(d=>d.w===w).forEach(d=>{
      const k=PERSON.has(d.id)?d.id:v.id+d.id; if(seen.has(k)) return; seen.add(k);
      rows+=dutyRow(v,d,!PERSON.has(d.id)&&act.length>1);
    }));
    if(!rows) return;
    const open=act.some(v=>phaseOpen(w,v,stage(v)));
    s+=open?`<div class="sec"><div class="wirehead"><span class="eyebrow">${PFLICHT_PHASEN[w]}</span></div><div>${rows}</div></div>`:`<div class="sec">${phaseLater(w,"pha-"+w,(rows.match(/class="duty"/g)||[]).length,rows)}</div>`;
  });
  s+=`<div class="sec"><div class="wirehead"><span class="eyebrow">Formulare vorbereitet</span></div><div class="list">${act.filter(v=>!tplOf(v).f.kurs).map(v=>`<button class="li" data-a="sheet" data-id="form" data-form="gewa" data-vid="${v.id}"><span class="grow"><span class="t">Gewerbeanmeldung</span><span class="s">${esc(v.name)}</span></span><span class="chev"></span></button>`).join("")}<button class="li" data-a="sheet" data-id="form" data-form="fse" data-vid="${act[0].id}"><span class="grow"><span class="t">Fragebogen zur steuerlichen Erfassung</span><span class="s">für alle Vorhaben zusammen</span></span><span class="chev"></span></button></div></div>`;
  return s+foot();
}
function dutyRow(v,d,showName){
  const on=dutyDone(v,d), key="d-"+v.id+"-"+d.id;
  return`<div class="duty"><button class="check" data-a="duty" data-id="${v.id}" data-duty="${d.id}" aria-pressed="${on}" aria-label="${esc(d.t)} erledigt">${ICON.check}</button><div><p class="wer">${esc(fill(d.wer,v))}${showName?" · "+esc(v.name):""}</p><p class="t">${esc(d.t)}${!on&&isPending(v,d)?` <span class="pill info">wartet seit ${dateDE(v.pending[d.id])}</span>`:""}</p></div>
  <details data-key="${key}" ${OPEN.has(key)?"open":""}><summary>Warum und wie</summary><p>${esc(fill(d.x,v))}</p><p style="margin-top:6px"><strong>So geht’s:</strong> ${esc(fill(d.wie,v))}</p><div class="acts">${d.link&&fill(d.link,v)?`<a class="linkbtn" href="${esc(fill(d.link,v))}" target="_blank" rel="noopener">${esc(fill(d.link,v).replace(/^https:\/\//,"").split("/")[0])}</a>`:""}${d.auftrag?`<button class="btn small ghost" data-a="auftrag" data-id="${v.id}" data-task="${d.auftrag}">Claude beauftragen</button>`:""}${!d.auftrag&&!NOASK.has(fill(d.wer,v))?`<button class="btn small ghost" data-a="auftrag" data-id="${v.id}" data-task="a_anfrage" data-duty="${d.id}">Anfrage vorbereiten</button>`:""}${d.form?`<button class="btn small ghost" data-a="sheet" data-id="form" data-form="${d.form}" data-vid="${v.id}">Formularwerte</button>`:""}</div>${!on&&d.w==="vor"&&!PERSON.has(d.id)?`<div class="acts"><button class="linkbtn" data-a="pend" data-id="${v.id}" data-duty="${d.id}">${isPending(v,d)?"Doch noch nicht beantragt":"Beantragt, warte auf Antwort"}</button></div>`:""}${on?`<p class="mono" style="margin-top:6px">erledigt am ${dateDE(PERSON.has(d.id)?S.pduties[d.id]:v.duties[d.id])}</p>`:""}</details></div>`;
}
const OPEN=new Set();
function phaseOpen(w,v,n){if(w==="vor")return true;if(w==="exit")return n>=7||!!v.exit;return n>=4}
function phaseLater(w,key,cnt,rows){return`<details class="phase" data-key="${key}" ${OPEN.has(key)?"open":""}><summary>Später: ${PFLICHT_PHASEN[w]} <span class="pill">${cnt}</span></summary><div>${rows}</div></details>`}
const NOASK=new Set(["Eigene Seite","Team","Käuferin oder Käufer"]);

function viewLeben(){
  const b=balance(), wm=weekMin();
  let s=`<h2 style="margin-top:12px">Leben</h2><p class="muted small">Die linke Seite des Mobiles. Sie zieht mit, und sie soll schwerer wiegen als die Vorhaben.</p>`;
  s+=`<div class="sec"><div class="figs"><button class="fig" data-a="explain" data-id="zeit"><span class="k">Vorhabenzeit diese Woche</span><span class="v num">${(wm/60).toLocaleString("de-DE",{maximumFractionDigits:1})} / ${S.prof.stunden} Std.</span><span class="bar" style="--c:${b.load>1?"var(--leben)":"var(--neben)"}"><i style="width:${clamp(b.load*100,0,100)}%"></i></span></button>
  <button class="fig" data-a="explain" data-id="menschen"><span class="k">Menschen gesehen</span><span class="v num">${S.people.length?S.people.filter(p=>p.last&&dayDiff(p.last,today())<=14).length+" / "+S.people.length:"–"}</span><span class="e">in den letzten 14 Tagen</span></button></div></div>`;
  s+=`<div class="sec"><div class="wirehead"><span class="eyebrow">Nahe Menschen</span></div><p class="muted small">Tipp auf einen Namen, wenn du heute mit dem Menschen Zeit hattest.</p><div class="people">${S.people.map(p=>{const st=!p.last||dayDiff(p.last,today())>14;return`<button class="person ${st?"stale":""}" data-a="seen" data-id="${p.id}" aria-label="${esc(p.name)}, zuletzt ${agoTxt(p.last)}"><span class="av">${esc(p.name.slice(0,1).toUpperCase())}</span>${esc(p.name)} <span class="ago">${agoTxt(p.last)}</span></button>`}).join("")}<button class="chip" data-a="sheet" data-id="people">${S.people.length?"Bearbeiten":"Menschen eintragen"}</button></div></div>`;
  s+=`<div class="sec"><div class="wirehead"><span class="eyebrow">Deine Vorhabentage</span></div><p class="muted small">Nur an diesen Tagen schlägt die App Schritte für die Vorhaben vor. An allen anderen Tagen ist Leben dran.</p><div class="chips">${[1,2,3,4,5,6,0].map(d=>`<button class="chip" data-a="tag" data-id="${d}" data-key="tag${d}" aria-pressed="${S.prof.tage.includes(d)}">${WT[d]}</button>`).join("")}</div>
  <div class="field"><span class="lab">Stunden pro Woche für alle Vorhaben</span><div class="chips">${[1,2,3,4,6,8].map(h=>`<button class="chip" data-a="std" data-id="${h}" data-key="std${h}" aria-pressed="${S.prof.stunden==h}">${h}</button>`).join("")}</div></div></div>`;
  s+=`<div class="sec"><div class="chips"><button class="btn sinn" data-a="sheet" data-id="week">Wochenblick</button><button class="btn ghost" data-a="sheet" data-id="time">Vorhabenzeit eintragen</button></div>${S.weeks.length?`<p class="muted small">Letzter Wochenblick ${agoTxt(S.weeks[S.weeks.length-1].d)}: ${esc({gab:"Die Vorhaben haben Kraft gegeben.",neutral:"Weder noch.",nahm:"Die Vorhaben haben Kraft genommen."}[S.weeks[S.weeks.length-1].kraft]||"")}${S.weeks[S.weeks.length-1].weg?" Weglassen: „"+esc(S.weeks[S.weeks.length-1].weg)+"“":""}</p>`:""}</div>`;
  s+=`<div class="sec"><div class="wirehead"><span class="eyebrow">Deine Werte</span></div>${S.werte.length?`<div class="chips">${S.werte.map(w=>`<span class="pill ok">${esc(w)}</span>`).join("")}</div>`:`<p class="muted small">Noch keine. Trag bis zu fünf Werte ein, zum Beispiel aus deinem Wertegerüst.</p>`}<div><button class="btn small ghost" data-a="sheet" data-id="werte">Werte eintragen</button></div></div>`;
  s+=appLinks();
  s+=wissenHTML("leben","Warum die Lebensseite schwerer wiegt");
  return s+foot();
}
function appLinks(){
  const a=S.settings.apps;
  return`<div class="sec"><div class="wirehead"><span class="eyebrow">Deine anderen Apps</span></div><div class="list">
  <a class="li" href="${esc(a.wg)}" target="_blank" rel="noopener"><span class="dot" style="--c:var(--neben)"></span><span class="grow"><span class="t">Wertegerüst</span><span class="s">Werte finden und verankern. Die Werte prüfen hier jedes Vorhaben.</span></span><span class="chev"></span></a>
  <a class="li" href="${esc(a.bt)}" target="_blank" rel="noopener"><span class="dot" style="--c:var(--sinn)"></span><span class="grow"><span class="t">Biotop</span><span class="s">Nachhaltiger leben. Hier fließt es in den Nachhaltigkeitsblick jedes Vorhabens.</span></span><span class="chev"></span></a>
  <a class="li" href="${esc(a.gk)}" target="_blank" rel="noopener"><span class="dot" style="--c:var(--geld)"></span><span class="grow"><span class="t">Glückskompass</span><span class="s">Glücksforschung zum Ausprobieren. Hier fragt die App nach jeder Vorhabenzeit, ob sie dir gutgetan hat.</span></span><span class="chev"></span></a></div></div>`;
}

/* ---------- Bögen ---------- */
let SH=null; // {id, ...opts}
let STACK=[], backPending=false, deferred=null;
function openSheet(id,o={},replace){
  if(backPending){deferred=()=>openSheet(id,o,replace);return}
  const wasOpen=!!SH;
  if(wasOpen&&!replace&&id!=="moment"){SH._sc=$("#sheet .sbody").scrollTop;STACK.push(SH)}
  SH={id,...o};
  if(!wasOpen){ STACK=[]; lastFocus=document.activeElement; try{history.pushState({sheet:1},"")}catch(e){} }
  renderSheet(true);
}
function backSheet(){ if(!STACK.length){closeSheet();return} SH=STACK.pop(); renderSheet(); const b=$("#sheet .sbody"); if(b) b.scrollTop=SH._sc||0 }
function backTo(id,o){ if(STACK.length&&STACK[STACK.length-1].id===id){SH=STACK.pop();Object.assign(SH,o);renderSheet()} else openSheet(id,o,true) }
let lastFocus=null;
function closeSheet(fromPop){
  if(!SH) return; SH=null; STACK=[];
  const sh=$("#sheet"), sc=$("#scrim"); sh.classList.remove("on"); sc.classList.remove("on");
  setTimeout(()=>{if(!SH){sh.hidden=true;sc.hidden=true;sh.querySelector(".sbody").innerHTML=""}},330);
  document.documentElement.style.overflow="";
  if(!fromPop){try{if(history.state&&history.state.sheet){backPending=true;history.back();setTimeout(()=>{if(backPending){backPending=false;const f=deferred;deferred=null;if(f)f()}},400)}}catch(e){}}
  render(); if(lastFocus&&lastFocus.isConnected) lastFocus.focus();
  setTimeout(showMoment,900);
}
function renderSheet(first){
  const sh=$("#sheet"), sc=$("#scrim"), body=sh.querySelector(".sbody");
  const fn=SHEETS[SH.id]; if(!fn){closeSheet();return}
  const st=body.scrollTop;
  body.innerHTML=fn(SH);
  sh.setAttribute("aria-label",(body.querySelector("h2")||{}).textContent||"Bogen");
  if(first){ sh.hidden=false; sc.hidden=false; body.scrollTop=0; document.documentElement.style.overflow="hidden";
    requestAnimationFrame(()=>{sh.classList.add("on");sc.classList.add("on");const c=body.querySelector(".closebtn");if(c)c.focus({preventScroll:true})}) }
  else body.scrollTop=st;
  afterRender();
}
const head=(ey,t,c)=>`<div class="shead"><div class="grow"><p class="eyebrow"><span class="knot" style="--c:${c||"var(--neben)"}"></span>${esc(ey)}</p><h2>${esc(t)}</h2></div><button class="closebtn" data-a="close">${STACK.length?"Zurück":"Schließen"}</button></div>`;

const SHEETS={
  welcome(){return`${head("Willkommen","Eine Nebenexistenz, die neben dem Leben bleibt")}
    <p>Die App hilft dir, nebenher kleine, legale Gewerbe aufzubauen, die andere für dich führen. Du steuerst, die Arbeit verteilt sich.</p>
    <div class="timeline"><div class="tl on"><span class="t">Rahmen festlegen</span><span class="muted small">Bundesland, Hauptberuf, Geld und Zeit. Daraus folgen Pflichten und wie viel Geld du einsetzen kannst.</span></div>
    <div class="tl on"><span class="t">Vorhaben aufhängen</span><span class="muted small">Jedes Vorhaben wächst in sieben Bauteilen: wählen, prüfen, ausgestalten, anmelden, erproben, übertragen, tragen. Anmeldungen und Formulare sind vorbereitet, Recherchen und Texte übernimmt Claude per Knopfdruck.</span></div>
    <div class="tl on"><span class="t">Weitergeben</span><span class="muted small">Wenn ein Vorhaben sich trägt, schlägt die App vor, es zu verkaufen. Es bleibt im Bild sichtbar.</span></div></div>
    <div class="note leben"><span>Die linke Seite des Mobiles ist dein Leben. Wenn die Vorhaben zu schwer werden, neigt es sich. An Tagen ohne Vorhabenzeit schlägt die App nur Schritte für das Leben vor.</span></div>
    <div class="stack"><button class="btn wide" data-a="welcomeGo">Rahmen festlegen</button><button class="btn ghost wide" data-a="demoOn">Mit Beispiel umsehen</button></div>
    <p class="muted small">Ohne Konto, ohne Server, ohne Benachrichtigungen. Alles bleibt auf deinem Gerät.</p>`},

  profil(){const p=S.prof,r=rahmen();
    return`${head("Rahmen","Dein Rahmen")}
    <div class="field"><label for="f-land">Bundesland, in dem du steuerlich gemeldet bist</label><select id="f-land" data-bind="prof.land"><option value="">Bitte wählen</option>${LAENDER.map(l=>`<option value="${l.id}" ${p.land===l.id?"selected":""}>${l.n}</option>`).join("")}</select></div>
    <div class="field"><label for="f-ort">Ort oder Region (optional)</label><input id="f-ort" type="text" data-bind="prof.ort" value="${esc(p.ort)}" placeholder="zum Beispiel Leipzig"><span class="hint">Nur für die Aufträge an Claude, damit Recherchen in deiner Gegend suchen. Keine Adresse nötig.</span></div>
    <div class="field"><span class="lab">Hauptberuf</span><div class="chips">${BERUFE.map(b=>`<button class="chip" data-a="beruf" data-id="${b.id}" data-key="ber${b.id}" aria-pressed="${p.beruf===b.id}">${b.n}</button>`).join("")}</div>${p.beruf==="ang"||p.beruf==="oed"||p.beruf==="beamt"?`<div class="chips" style="margin-top:4px">${p.beruf!=="beamt"?`<button class="chip" data-a="pflag" data-k="befristet" data-id="${p.befristet?0:1}" data-key="befr" aria-pressed="${!!p.befristet}">Befristet oder in der Probezeit</button>`:""}${p.beruf!=="ang"?`<button class="chip" data-a="pflag" data-k="lehrkraft" data-id="${p.lehrkraft?0:1}" data-key="lehr" aria-pressed="${!!p.lehrkraft}">Lehrkraft an einer Schule</button>`:""}</div>`:""}
    ${p.beruf==="beamt"?`<p class="hint">Als Beamtin oder Beamter gilt in ${esc(landN())}: ${(NTR[p.land]||{}).m==="A"?"ein eigenes Gewerbe wird angezeigt, nicht genehmigt":(NTR[p.land]?"ein eigenes Gewerbe braucht eine Genehmigung":"wähl oben dein Bundesland")}. Die Regelgrenze für alle Nebentätigkeiten zusammen ist ${esc(ntInfo().hTxt)}.</p>`:""}</div>
    <div class="wirehead"><span class="eyebrow">Geld</span></div>
    <p class="hint">Daraus berechnet die App nur, wie viel du in Vorhaben stecken kannst, ohne dich zu gefährden. Alles bleibt auf deinem Gerät.</p>
    <div class="grid2"><div class="field"><label for="f-netto">Netto im Monat</label><div class="suffix"><input id="f-netto" type="text" inputmode="decimal" data-num="1" data-bind="prof.netto" value="${p.netto?dz(p.netto):""}"><span>€</span></div></div><div class="field"><label for="f-fix">Ausgaben im Monat</label><div class="suffix"><input id="f-fix" type="text" inputmode="decimal" data-num="1" data-bind="prof.fix" value="${p.fix?dz(p.fix):""}"><span>€</span></div></div></div>
    <p class="hint" style="margin-top:-6px">Ausgaben heißt alles, was du im Monat ausgibst, auch Essen und Freizeit${p.immo?", aber ohne die vermietete Immobilie":""}.</p>
    <div class="field"><label for="f-rl">Verfügbares Geld</label><div class="suffix"><input id="f-rl" type="text" inputmode="decimal" data-num="1" data-bind="prof.ruecklage" value="${p.ruecklage?dz(p.ruecklage):""}"><span>€</span></div><span class="hint">Konto, Tagesgeld, bald fälliges Festgeld. <button class="linkbtn" style="min-height:0;padding:0" data-a="explain" data-id="ruecklagen">Was zählt dazu?</button></span></div>
    <div class="field"><span class="lab">Wertpapiere oder Geld, das schon reserviert ist?</span><div class="chips"><button class="chip" data-a="pflag" data-k="weiteres" data-id="0" data-key="weiteres0" aria-pressed="${!p.weiteres}">Nein</button><button class="chip" data-a="pflag" data-k="weiteres" data-id="1" data-key="weiteres1" aria-pressed="${!!p.weiteres}">Ja</button></div></div>
    ${p.weiteres?`<div class="field"><label for="f-vp">Reserviert für etwas anderes</label><div class="suffix"><input id="f-vp" type="text" inputmode="decimal" data-num="1" data-bind="prof.verplant" value="${p.verplant?dz(p.verplant):""}"><span>€</span></div><span class="hint">Zum Beispiel Eigenkapital für eine Immobilie, die du kaufen willst.</span></div><div class="field"><span class="lab">Das reservierte Geld liegt</span><div class="chips"><button class="chip" data-a="pwo" data-id="bar" data-key="wobar" aria-pressed="${p.verplantWo!=="wp"}">auf dem Konto</button><button class="chip" data-a="pwo" data-id="wp" data-key="wowp" aria-pressed="${p.verplantWo==="wp"}">in Wertpapieren</button></div></div><div class="field"><label for="f-wp">ETF, Aktien und Fonds</label><div class="suffix"><input id="f-wp" type="text" inputmode="decimal" data-num="1" data-bind="prof.wp" value="${p.wp?dz(p.wp):""}"><span>€</span></div><span class="hint">Krypto lässt du weg, die App rechnet es bewusst nicht ein.</span></div>`:""}
    <div class="field"><span class="lab">Vermietete Immobilie?</span><div class="chips"><button class="chip" data-a="pflag" data-k="immo" data-id="0" data-key="immo0" aria-pressed="${!p.immo}">Nein</button><button class="chip" data-a="pflag" data-k="immo" data-id="1" data-key="immo1" aria-pressed="${!!p.immo}">Ja</button></div></div>
    ${p.immo?`<div class="grid2"><div class="field"><label for="f-ik">Kaltmiete pro Monat</label><div class="suffix"><input id="f-ik" type="text" inputmode="decimal" data-num="1" data-bind="prof.kaltmiete" value="${p.kaltmiete?dz(p.kaltmiete):""}"><span>€</span></div></div><div class="field"><label for="f-iu">Überschuss pro Monat</label><div class="suffix"><input id="f-iu" type="text" inputmode="text" data-num="1" data-bind="prof.immoUeber" value="${p.immoUeber?dz(p.immoUeber):""}"><span>€</span></div></div></div><p class="hint" style="margin-top:-6px">Überschuss heißt Miete minus Kreditrate, Hausgeld und Rücklage. Ist er negativ, schreib ein Minus davor. <button class="linkbtn" style="min-height:0;padding:0" data-a="explain" data-id="immo">Warum das zählt</button></p>`:""}
    <div class="field"><span class="lab">Konsumschulden oder Dispo?</span><div class="chips"><button class="chip" data-a="pflag" data-k="schuld" data-id="0" data-key="schuld0" aria-pressed="${!p.schuld}">Nein</button><button class="chip" data-a="pflag" data-k="schuld" data-id="1" data-key="schuld1" aria-pressed="${!!p.schuld}">Ja</button></div></div>
    ${p.schuld?`<div class="field"><label for="f-sd">Offener Betrag</label><div class="suffix"><input id="f-sd" type="text" inputmode="decimal" data-num="1" data-bind="prof.schulden" value="${p.schulden?dz(p.schulden):""}"><span>€</span></div><span class="hint">Ratenkredite, Kreditkarte, Dispo. Nicht die Immobilie.</span></div>`:""}
    <div class="field"><span class="lab">An welchen Tagen darf es um die Vorhaben gehen?</span><div class="chips">${[1,2,3,4,5,6,0].map(d=>`<button class="chip" data-a="tag" data-id="${d}" data-key="ptag${d}" aria-pressed="${p.tage.includes(d)}">${WT[d]}</button>`).join("")}</div><span class="hint">An allen anderen Tagen schlägt die App nur Schritte für dein Leben vor. Heute zählt einmalig als Vorhabentag.</span></div>
    <div class="field"><span class="lab">Wie viele Stunden pro Woche, für alle Vorhaben zusammen?</span><div class="chips">${[1,2,3,4,6,8].map(h=>`<button class="chip" data-a="std" data-id="${h}" data-key="pstd${h}" aria-pressed="${p.stunden==h}">${h}</button>`).join("")}</div>${p.beruf==="beamt"?`<span class="hint">Deine dienstrechtliche Grenze liegt bei ${esc(ntInfo().hTxt)}, für alle Nebentätigkeiten zusammen. ${p.stunden>=ntInfo().grenze?"Du planst schon bis an diese Grenze. Lass Luft für Saisonspitzen.":"Mit diesem Rahmen bleibst du darunter."}</span>`:""}</div>
    ${ustBlock()}
    <div id="rahmenOut">${rahmenOut()}</div>
    <button class="btn wide" data-a="profilSave">Speichern</button>`},

  neu(){return`${head("Neues Vorhaben","Was soll nebenher laufen?")}
    <p class="muted small">Jede Vorlage bringt eigene Pflichtschritte, Startwerte für die Rechnung und passende Aufträge mit. Du gibst ihr gleich einen eigenen Namen.</p>
    <div class="stack">${VORLAGEN.map(t=>`<button class="card" data-a="pickTpl" data-id="${t.id}"><span style="display:flex;gap:12px;align-items:center"><svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="${shapePath(t.form,17,17,11)}" fill="var(--neben)"/></svg><span><span class="t" style="font:650 17px/1.25 var(--f-ui);display:block">${esc(t.n)}</span><span class="mono">Geld bis zum Start etwa ${eur(tplKapital(t))}</span></span></span><span class="small">${esc(t.kurz)}</span><span class="small muted">${esc(t.bsp)}</span></button>`).join("")}</div>`},

  name(o){const t=VORLAGEN.find(x=>x.id===o.tpl);
    return`${head(t.n,"Wie heißt es?")}<div class="field"><label for="f-vname">Name des Vorhabens</label><input id="f-vname" type="text" value="" placeholder="zum Beispiel Wachs & Docht" maxlength="40"></div>
    <div class="field"><label for="f-vdesc">In einem Satz</label><input id="f-vdesc" type="text" value="" placeholder="${esc(t.bsp.replace("Zum Beispiel ",""))}" maxlength="140"><span class="hint">Dieser Satz geht in die Aufträge an Claude.</span></div>
    <button class="btn wide" data-a="createV" data-id="${t.id}">Aufhängen</button>`},

  venture(o){const v=vById(o.vid); if(!v) return"";
    const t=tplOf(v), n=stage(v), sub=o.sub||"bauteile";
    const tabs=[["bauteile","Bauteile"],["rechnung","Rechnung"],["pflichten","Pflichten"],["auftraege","Aufträge"],["team","Team"],["laeufe","Läufe"],["uebergabe","Übergabe"]];
    let s=`${head(t.n+(v.exit?" · weitergegeben":""),v.name)}<div class="parts" aria-label="${n} von 7 Bauteilen">${BAUTEILE.map((b,i)=>`<i class="part ${i<n?"on":i===n?"nx":""}"></i>`).join("")}</div>
    <div class="seg" role="tablist">${tabs.map(([k,l])=>`<button role="tab" data-a="sub" data-id="${k}" aria-current="${sub===k}">${l}</button>`).join("")}</div>`;
    return s+VSUB[sub](v);
  },

  auftrag(o){const v=vById(o.vid), a=AUFTRAEGE.find(x=>x.id===o.task), pr=promptFor(v,o.task,o.duty), du=o.duty?PFLICHTEN.find(x=>x.id===o.duty):null;
    const res=v.results.filter(r=>r.task===a.id);
    return`${head("Auftrag an Claude",du?"Anfrage an "+du.wer:a.t)}
    <p class="muted small">Der Auftrag ist schon mit deinem Vorhaben gefüllt. Er enthält keinen Namen und kein Vermögen. Du kannst ihn vorher ändern.</p>
    <textarea id="f-prompt" aria-label="Auftragstext">${esc(pr)}</textarea>
    <div class="chips"><a class="btn" id="claudeGo" href="https://claude.ai/new?q=${encodeURIComponent(pr)}" target="_blank" rel="noopener" data-a="claudeGo">In Claude öffnen</a><button class="btn ghost" data-a="copy" data-src="f-prompt">Kopieren</button></div>
    <div class="wirehead" style="margin-top:6px"><span class="eyebrow">Ergebnis ablegen</span></div>
    <p class="muted small">Füge die Antwort von Claude hier ein. Sie bleibt beim Vorhaben.${a.out==="prod"?" Ein Konzept hier zählt als Bauteil „Ausgestaltet“.":""}</p>
    <textarea id="f-result" aria-label="Ergebnis" placeholder="Antwort einfügen"></textarea>
    <button class="btn wide sinn" data-a="saveResult" data-id="${v.id}" data-task="${a.id}">Ablegen</button>
    ${res.length?`<div class="list">${res.map(r=>`<details class="li" style="display:block"><summary class="t">${dateDE(r.d)}</summary><pre class="prompt">${esc(r.text)}</pre></details>`).join("")}</div>`:""}`},

  form(o){const v=vById(o.vid); if(o.form==="nt") return ntForm(v); const rows=o.form==="gewa"?gewaRows(v):fseRows();
    return`${head(o.form==="gewa"?"Formular":"Formular",o.form==="gewa"?"Gewerbeanmeldung":"Fragebogen zur steuerlichen Erfassung")}
    <p class="muted small">${o.form==="gewa"?"Die Angaben für das Formular GewA 1, vorbereitet aus deinem Vorhaben. Persönliche Daten wie Anschrift und Ausweis trägst du im Portal selbst ein.":"Die wichtigsten Angaben für ELSTER, berechnet aus der Rechnung aller Vorhaben. Prüfe jede Zahl, bevor du sie überträgst."}</p>
    ${o.form==="gewa"?`<div class="field"><label for="g-start">Beginn</label><input id="g-start" type="date" data-bind="v.${v.id}.start" value="${esc(v.start||"")}"></div>`:""}
    <div>${rows.map((r,i)=>`<div class="formrow"><div><p class="k">${esc(r[0])}</p><p class="v" id="fv${i}">${esc(r[1])}</p>${r[2]?`<p class="muted small">${esc(r[2])}</p>`:""}</div><button class="btn small ghost" data-a="copy" data-src="fv${i}">Kopieren</button></div>`).join("")}</div>
    ${o.form==="gewa"?`<button class="btn ghost wide" data-a="auftrag" data-id="${v.id}" data-task="a_amt">Zuständiges Amt finden lassen</button>`:`<a class="btn ghost wide" href="https://www.elster.de" target="_blank" rel="noopener">Zu ELSTER</a>`}`},

  time(o){const act=aktive(); const vid=o.vid||(act[0]&&act[0].id)||"";
    return`${head("Vorhabenzeit","Zeit für die Vorhaben eintragen","var(--neben)")}
    <p class="muted small">Was du für die Vorhaben tust, zählt hier: Mails, Absprachen, Aufträge. Daraus entsteht das Gleichgewicht im Mobile.</p>
    ${act.length?`<div class="field"><span class="lab">Für welches Vorhaben?</span><div class="chips">${act.map(v=>`<button class="chip" data-a="tvid" data-id="${v.id}" data-key="tv${v.id}" aria-pressed="${vid===v.id}">${esc(v.name)}</button>`).join("")}</div></div>`:""}
    <div class="field"><span class="lab">Wie lange?</span><div class="chips">${[15,30,45,60,90,120].map(m=>`<button class="chip" data-a="tmin" data-id="${m}" data-key="tm${m}" aria-pressed="${SH.min==m}">${m<60?m+" Min.":(m/60).toLocaleString("de-DE")+" Std."}</button>`).join("")}</div></div>
    <div class="field"><span class="lab">Hat dir das gutgetan?</span><div class="scale">${[1,2,3,4,5].map(m=>`<button class="chip" data-a="tmood" data-id="${m}" data-key="mo${m}" aria-pressed="${SH.mood==m}" aria-label="${m} von 5">${m}</button>`).join("")}</div><span class="hint">1 heißt gar nicht, 5 sehr. Die Frage stammt aus dem Glückskompass: Was dir nicht guttut, darfst du abgeben.</span></div>
    <button class="btn wide" data-a="saveTime" data-vid="${vid}" ${SH.min?"":"disabled"}>Eintragen</button>`},

  run(o){const v=vById(o.vid), r=calc(v), t=tplOf(v);
    return`${head(v.name,"Einen "+t.lauf+" abrechnen")}
    <p class="muted small">Die Felder sind mit der Rechnung vorbelegt. Trag ein, was wirklich war.</p>
    <div class="field"><label for="r-d">Datum</label><input id="r-d" type="date" value="${today()}"></div>
    <div class="grid2"><div class="field"><label for="r-u">Umsatz</label><div class="suffix"><input id="r-u" type="text" inputmode="decimal" data-num="1" value="${Math.round(r.umsatz)}"><span>€</span></div></div>
    <div class="field"><label for="r-k">Kosten gesamt</label><div class="suffix"><input id="r-k" type="text" inputmode="decimal" data-num="1" value="${Math.round(r.kosten)}"><span>€</span></div></div>
    <div class="field"><label for="r-m">Deine Stunden</label><div class="suffix"><input id="r-m" type="text" inputmode="decimal" data-num="1" value="${dz(n0(v.calc.meineStd))}"><span>Std.</span></div></div>
    <div class="field"><label for="r-t">Team-Stunden</label><div class="suffix"><input id="r-t" type="text" inputmode="decimal" data-num="1" value="${dz(n0(v.calc.teamStd))}"><span>Std.</span></div></div></div>
    <div class="field"><label for="r-n">Notiz</label><input id="r-n" type="text" placeholder="Was lief gut, was nicht?"></div>
    <button class="btn wide" data-a="saveRun" data-id="${v.id}">Abrechnen</button>`},

  member(o){const v=vById(o.vid);
    return`${head(v.name,"Jemand führt den Alltag")}
    <div class="field"><label for="m-n">Name oder Rolle</label><input id="m-n" type="text" placeholder="zum Beispiel Standleitung Jana"></div>
    <div class="field"><span class="lab">Beschäftigung</span><div class="chips">${[["kurz","Kurzfristig (Saison)"],["mini","Minijob"],["frei","Selbstständig"],["partner","Partner auf Provision"]].map(([k,l])=>`<button class="chip" data-a="mform" data-id="${k}" data-key="mf${k}" aria-pressed="${(SH.form||"kurz")===k}">${l}</button>`).join("")}</div>
    <span class="hint">${(SH.form||"kurz")==="kurz"?"Bis drei Monate oder "+RECHT.kurzTage+" Arbeitstage im Jahr, ohne Sozialabgaben. Passt zur Weihnachtsmarktsaison.":(SH.form==="mini")?"Bis "+RECHT.minijob+" € im Monat, rund "+RECHT.minijobAbgabe+" % Pauschalabgaben für dich.":SH.form==="partner"?"Ein Laden, Hof oder Stand, der für dich verkauft und dafür eine Provision behält. Kein Arbeitsverhältnis, aber eine Kommissionsvereinbarung.":"Nur, wenn die Person wirklich frei ist: eigene Zeiten, eigene Mittel, mehrere Auftraggeber. Sonst droht Scheinselbstständigkeit."}</span></div>
    <div class="field" ${SH.form==="partner"?"hidden":""}><label for="m-l">Stundenlohn</label><div class="suffix"><input id="m-l" type="text" inputmode="decimal" data-num="1" value="${dz(Math.max(RECHT.mindestlohn,n0(v.calc.lohn)))}"><span>€</span></div><span class="hint">Mindestlohn ${fill("{ml}")} €. Für die Standleitung, die Verantwortung trägt, ist mehr angemessen.</span></div>
    <button class="btn wide" data-a="saveMember" data-id="${v.id}">Hinzufügen</button>`},

  people(){return`${head("Leben","Nahe Menschen","var(--leben)")}
    <p class="muted small">Bis zu sechs Menschen, die dir wichtig sind. Nur Vornamen, nur auf deinem Gerät.</p>
    <div class="list">${S.people.map(p=>`<div class="li" style="cursor:default"><span class="grow"><span class="t">${esc(p.name)}</span><span class="s">zuletzt ${agoTxt(p.last)}</span></span><button class="btn small ghost" data-a="delPerson" data-id="${p.id}">Entfernen</button></div>`).join("")}</div>
    ${S.people.length<6?`<div class="field"><label for="p-n">Neuer Name</label><input id="p-n" type="text" maxlength="24" placeholder="zum Beispiel Mama, Jonas"></div><button class="btn wide leben" data-a="addPerson">Hinzufügen</button>`:""}`},

  werte(){return`${head("Werte","Deine Werte","var(--sinn)")}
    <p class="muted small">Bis zu fünf Werte. Jedes Vorhaben fragt dich, ob es zu ihnen passt. Wenn du das Wertegerüst nutzt, trag hier deine Stützen ein.</p>
    <div class="chips">${S.werte.map((w,i)=>`<button class="chip" data-a="delWert" data-id="${i}" aria-label="${esc(w)} entfernen">${esc(w)} ✕</button>`).join("")}</div>
    ${S.werte.length<5?`<div class="field"><label for="w-n">Neuer Wert</label><input id="w-n" type="text" maxlength="24" placeholder="zum Beispiel Gerechtigkeit"></div><button class="btn wide sinn" data-a="addWert">Hinzufügen</button>`:""}
    <a class="linkbtn" href="${esc(S.settings.apps.wg)}" target="_blank" rel="noopener">Im Wertegerüst vertiefen</a>`},

  week(){const w=SH.w||(SH.w={kraft:"",weg:"",mit:[]});
    return`${head("Wochenblick","Wie war die Woche?","var(--sinn)")}
    <div class="field"><span class="lab">Mit wem hattest du diese Woche Zeit?</span><div class="chips">${S.people.map(p=>`<button class="chip" data-a="wmit" data-id="${p.id}" data-key="wm${p.id}" aria-pressed="${w.mit.includes(p.id)}" style="--c:var(--leben)">${esc(p.name)}</button>`).join("")||`<span class="muted small">Noch keine Menschen eingetragen.</span>`}</div></div>
    <div class="field"><span class="lab">Haben die Vorhaben dir Kraft gegeben oder genommen?</span><div class="chips">${[["gab","gegeben"],["neutral","weder noch"],["nahm","genommen"]].map(([k,l])=>`<button class="chip" data-a="wkraft" data-id="${k}" data-key="wk${k}" aria-pressed="${w.kraft===k}">${l}</button>`).join("")}</div></div>
    <div class="field"><label for="w-weg">Was lässt du nächste Woche weg?</label><input id="w-weg" type="text" value="${esc(w.weg)}" placeholder="zum Beispiel abends Mails beantworten"></div>
    <button class="btn wide sinn" data-a="saveWeek" ${w.kraft?"":"disabled"}>Abschließen</button>
    <a class="linkbtn" href="${esc(S.settings.apps.gk)}" target="_blank" rel="noopener">Ein passendes Experiment im Glückskompass suchen</a>`},

  wissen(o){const w=WISSEN.find(x=>x.id===o.wid);
    return`${head("Wissen · Belegstärke "+w.ev+" von 3",w.t,w.bereich==="geld"?"var(--geld)":"var(--leben)")}<p>${esc(w.x)}</p><div class="note"><span>${esc(w.c)}</span></div><p class="small muted">Quelle: <a href="${esc(w.u)}" target="_blank" rel="noopener">${esc(w.src)}</a></p>`},

  explain(o){const T={
      umsatz:["Umsatz im Jahr","Preis mal Stückzahl mal Läufe pro Jahr, für alle aktiven Vorhaben zusammen. Für die Kleinunternehmerregelung zählt der Nettoumsatz aller Tätigkeiten unter deinem Namen. Grenze im Vorjahr "+RECHT.kuVorjahr.toLocaleString("de-DE")+" €, im laufenden Jahr "+RECHT.kuLaufend.toLocaleString("de-DE")+" €."],
      gewinn:["Gewinn im Jahr","Gewinn pro Lauf mal Läufe pro Jahr, wobei 15 Prozent der Läufe ausfallen (Wetter, Krankheit, Absagen), minus Kosten pro Jahr. Startkosten sind nicht abgezogen. Der Gewinn kommt zu deinem Einkommen und wird mit deinem persönlichen Steuersatz besteuert. Lege grob ein Viertel davon zurück."],
      zeit:["Vorhabenzeit","Alles, was du selbst für die Vorhaben tust, in den letzten sieben Tagen. Dein Rahmen sind "+S.prof.stunden+" Stunden pro Woche. Liegt die Zeit darüber, neigt sich das Mobile zu den Vorhaben."],
      menschen:["Menschen gesehen","Wie viele deiner nahen Menschen du in den letzten 14 Tagen eingetragen hast. Weniger als die Hälfte lässt das Mobile zu den Vorhaben kippen."],
      kapital:["Geld bis zum Start","Was du vorstrecken musst, bevor Geld zurückkommt: Startkosten, Kosten pro Jahr und bei Saisonvorhaben etwa die Hälfte der Standgebühren der Saison und ein Viertel der Saisonware, weil beides teils im Voraus bezahlt wird. Bei anderen Vorhaben zwei Läufe Vorlauf."],
      ruecklagen:["Was zum verfügbaren Geld zählt","Dazu zählt Geld, das du innerhalb weniger Wochen ohne Verlust nutzen kannst: Guthaben auf dem Konto über deinem Monatsbedarf, Tagesgeld und Festgeld, das in den nächsten Monaten fällig wird. Nicht dazu zählen das Kapital in einer Immobilie, Bausparverträge und Altersvorsorge wie Riester, Rürup, Betriebsrente oder Lebensversicherung. Wertpapiere und Geld, das schon für etwas anderes reserviert ist, trägst du darunter getrennt ein. Krypto lässt du weg: Der Kurs schwankt zu stark, um ein Vorhaben darauf zu bauen."],
      notgroschen:["Notgroschen","Der Notgroschen bleibt unberührt, egal wie gut ein Vorhaben aussieht. Er umfasst drei Monate deiner Ausgaben, wenn du unbefristet angestellt oder verbeamtet bist, sonst sechs. Mit einer vermieteten Immobilie kommen drei Kaltmieten dazu, für Mietausfall oder Reparaturen, auch wenn die Wohnung schon abbezahlt ist. Geht dein Monat nicht auf, kommen sechs Monate Fehlbetrag dazu. ETF, Aktien und Fonds können höchstens die Hälfte des Notgroschens ersetzen, und zwar nur mit der Hälfte ihres Werts, weil sie im falschen Moment gerade gefallen sein können."],
      immo:["Vermietete Immobilie","Das Kapital in einer Wohnung ist gebunden und zählt darum nicht als Geld für ein Vorhaben. Für die App zählen zwei Dinge: der monatliche Überschuss, also was nach Kreditrate, Hausgeld und Rücklage auf dem Konto ankommt, und ein Puffer von drei Kaltmieten für Mietausfall oder Reparaturen. Steuerlich ist der Überschuss nicht dasselbe wie das Ergebnis aus Vermietung. Bei einer finanzierten Wohnung mindern Abschreibung und Zinsen den Gewinn, oft entsteht sogar ein steuerlicher Verlust, der dein zu versteuerndes Einkommen senkt. Gewinne aus einem Vorhaben kommen in derselben Erklärung dazu und werden mit deinem persönlichen Steuersatz besteuert. Ein Verlust aus dem Vorhaben mindert umgekehrt die Steuer auf dein Gehalt."],
      deckel:["Wie viel Geld du einsetzen kannst","Von deinem verfügbaren Geld ziehen wir den Notgroschen ab, Geld, das schon reserviert ist, und offene Konsumschulden. Vom Rest empfehlen wir für das erste Vorhaben höchstens 10 Prozent, für jedes weitere 15 Prozent und für alle zusammen 30 Prozent. Das erste Vorhaben ist auch Lehrgeld. Mehr kannst du bewusst bestätigen. Gesperrt ist nur, was an den Notgroschen oder an verplantes Geld gehen würde. Das Geld für ein Vorhaben sollte aus diesem freien Geld kommen und nicht aus dem Verkauf von Anlagen. Wer ETF verkauft, zahlt auf Gewinne über dem Sparer-Pauschbetrag (1.000 Euro, bei Zusammenveranlagung 2.000 Euro) Abgeltungsteuer. Bei Aktien-ETF ist wegen der Teilfreistellung von 30 Prozent effektiv rund 18,5 Prozent des Gewinns fällig, plus gegebenenfalls Kirchensteuer. Krypto ist nach mehr als einem Jahr Haltedauer steuerfrei. Davor gilt der persönliche Steuersatz, solange alle solchen Gewinne im Jahr über der Freigrenze von 1.000 Euro liegen. Das ist eine Faustregel zur Vorsicht, keine Anlageberatung."]
    }[o.eid];
    return`${head("Erklärt",T[0])}<p>${esc(T[1])}</p>`},

  settings(){const st=S.settings;
    return`${head("Einstellungen","Einstellungen")}
    <div class="field"><span class="lab">Darstellung</span><div class="chips">${[["auto","Wie das Gerät"],["light","Hell"],["dark","Dunkel"]].map(([k,l])=>`<button class="chip" data-a="theme" data-id="${k}" data-key="th${k}" aria-pressed="${st.theme===k}">${l}</button>`).join("")}</div></div>
    <div class="field"><span class="lab">Vibration beim Tippen</span><div class="chips"><button class="chip" data-a="vib" data-key="vib" aria-pressed="${st.vib}">${st.vib?"An":"Aus"}</button></div></div>
    <div class="stack"><button class="btn ghost" data-a="sheet" data-id="profil">Rahmen bearbeiten</button><button class="btn ghost" data-a="sheet" data-id="people">Menschen bearbeiten</button><button class="btn ghost" data-a="sheet" data-id="werte">Werte bearbeiten</button></div>
    <div class="wirehead"><span class="eyebrow">Adressen deiner anderen Apps</span></div>
    ${[["wg","Wertegerüst"],["bt","Biotop"],["gk","Glückskompass"]].map(([k,l])=>`<div class="field"><label for="ap-${k}">${l}</label><input id="ap-${k}" type="text" data-bind="settings.apps.${k}" value="${esc(st.apps[k])}"></div>`).join("")}
    <div class="wirehead"><span class="eyebrow">Datensicherung</span></div>
    <p class="muted small">Safari löscht Daten von Webseiten, die lange nicht geöffnet wurden. Füge die App zum Home-Bildschirm hinzu und sichere ab und zu.</p>
    <div class="chips"><button class="btn ghost small" data-a="export">Sicherung kopieren</button>${IN_FRAME?"":`<button class="btn ghost small" data-a="exportFile">Als Datei sichern</button>`}<button class="btn ghost small" data-a="sheet" data-id="import">Sicherung laden</button></div>
    <div class="wirehead"><span class="eyebrow">Neu anfangen</span></div>
    <div class="chips">${S.demo?`<button class="btn ghost small" data-a="demoOff">Beispiel löschen</button>`:`<button class="btn ghost small" data-a="demoOn">Beispiel laden</button>`}<button class="btn ghost small" data-a="reset1">Alles löschen</button></div>
    ${SH.demoAsk?`<div class="note"><strong>Beispiel laden?</strong><span>Deine eigenen Daten werden gesichert und kommen zurück, wenn du das Beispiel wieder löschst.</span><div><button class="btn small" data-a="demoOn" data-ok="1">Ja, Beispiel laden</button></div></div>`:""}
    ${SH.reset?`<div class="note leben"><strong>Wirklich alles löschen?</strong><span>Rahmen, Vorhaben, Menschen und Verlauf gehen verloren. Das lässt sich nicht rückgängig machen.</span><div><button class="btn leben small" data-a="reset2">Ja, alles löschen</button></div></div>`:""}
    <p class="muted small">Nebenexistenz · Stand ${esc(BUILD)} · Rechtsstand ${RECHT.stand}. Die App erklärt und bereitet vor. Sie ersetzt keine Steuer- oder Rechtsberatung. © Carlo Maximilian Engeländer. Alle Rechte vorbehalten.</p>`},

  exportv(){return`${head("Sicherung","Sicherung kopieren")}<p class="muted small">Kopiere den Text und bewahre ihn an einem sicheren Ort auf, zum Beispiel in einer Notiz.</p><textarea id="f-exp" readonly>${esc(JSON.stringify(S))}</textarea><button class="btn wide" data-a="copy" data-src="f-exp">Kopieren</button>`},
  import(){return`${head("Sicherung","Sicherung laden")}<p class="muted small">Füge eine Sicherung ein oder wähle eine Datei. Der jetzige Stand wird ersetzt.</p><textarea id="f-imp" placeholder="Sicherung einfügen"></textarea><input type="file" id="f-impfile" accept=".json,application/json"><button class="btn wide" data-a="doImport">Laden</button>`},

  moment(o){const M=MOMENTE[o.mid];
    return`${head("Moment",M.t,"var(--geld)")}<p>${esc(M.x)}</p>${o.more&&o.more.length?`<p class="muted small">Auch neu: ${o.more.map(k=>MOMENTE[k].t).join(", ")}.</p>`:""}<button class="btn wide" data-a="close">Weiter</button>`}
};
const MOMENTE={
  team:{t:"Jemand arbeitet mit.",x:"Durch dein Vorhaben hat jetzt ein anderer Mensch bezahlte Arbeit. Das ist ein Teil dessen, wofür die Nebenexistenz da ist."},
  gew:{t:"Dein Gewerbe ist angemeldet.",x:"Das war der größte Schritt auf dem Papier. Ab jetzt meldet sich das Finanzamt mit dem Fragebogen, und die IHK schickt einen Brief. Beides ist normal."},
  first:{t:"Das erste Vorhaben hängt.",x:"Es hängt rechts am Mobile. Jedes Bauteil, das dazukommt, erscheint als Punkt am Draht, und die Form wird größer."},
  amt:{t:"Alles angemeldet.",x:"Die Pflichtschritte vor dem Start sind erledigt. Ab jetzt ist das Vorhaben legal und steuerlich erfasst."},
  lauf:{t:"Der erste Lauf ist abgerechnet.",x:"Jetzt gibt es echte Zahlen statt Schätzungen. Vergleich sie mit der Rechnung und pass die Rechnung an."},
  traegt:{t:"Es trägt sich.",x:"Drei Läufe mit Gewinn, kaum eigene Zeit, und einer ganz ohne dich. Das ist eine Nebenexistenz im eigentlichen Sinn. Jetzt kannst du überlegen, es weiterzugeben."},
  exit:{t:"Weitergegeben.",x:"Das Vorhaben gehört jetzt jemand anderem. Im Bild ruht es unten auf dem Boden, es verschwindet nicht."}
};
function ustEmpf(){
  const ju=jahresUmsatzAlle(), start=aktive().reduce((a,v)=>a+n0(v.calc.start),0), firmen=aktive().some(v=>tplOf(v).f.kommission);
  if(ju>RECHT.kuVorjahr) return{k:"regel",t:"Deine Vorhaben kommen zusammen auf etwa "+eur(ju)+" Umsatz im Jahr. Das liegt über "+RECHT.kuVorjahr.toLocaleString("de-DE")+" €. Ab dem Folgejahr bist du dann ohnehin umsatzsteuerpflichtig."};
  if(start>10000) return{k:"klein",t:"Deine Vorhaben bleiben unter der Grenze. Bei Startkosten von etwa "+eur(start)+" kann sich die Regelbesteuerung trotzdem lohnen, weil du die Umsatzsteuer auf diese Käufe zurückbekommst. Das sollte eine Steuerberatung durchrechnen."};
  return{k:"klein",t:aktive().length?"Deine Vorhaben kommen zusammen auf etwa "+eur(ju)+" Umsatz im Jahr und bleiben unter der Grenze. Du verkaufst an Privatleute"+(firmen?" oder über Läden":"")+", da ist die Kleinunternehmerregelung meist die einfachere und günstigere Wahl.":"Für kleine Vorhaben, die an Privatleute verkaufen, ist das fast immer die einfachere und günstigere Wahl. Sobald du Vorhaben angelegt hast, prüft die App das hier für dich."};
}
function ustBlock(){const p=S.prof,e=ustEmpf(),cur=p.ust?"regel":"klein";
  const O=(k,t,x)=>`<button class="opt" data-a="ust" data-id="${k==="regel"?1:0}" data-key="ust${k}" aria-pressed="${cur===k}"><span class="ot">${t}${e.k===k?` <span class="pill ok">passt zu dir</span>`:""}</span><span class="ox">${x}</span></button>`;
  return`<div class="field"><span class="lab">Wie gehst du mit der Umsatzsteuer um?</span>
  <p class="hint">Das entscheidest du im Fragebogen beim Finanzamt. Die App rechnet danach deine Preise.</p>
  <div class="stack">${O("klein","Kleinunternehmer","Keine Umsatzsteuer auf deinen Preisen und keine Voranmeldungen. Deine Preise sind Endpreise. Dafür bekommst du die Umsatzsteuer auf deine Einkäufe nicht zurück. Möglich, solange alle Vorhaben zusammen im Vorjahr unter "+RECHT.kuVorjahr.toLocaleString("de-DE")+" € und im laufenden Jahr unter "+RECHT.kuLaufend.toLocaleString("de-DE")+" € Umsatz bleiben.")}
  ${O("regel","Mit Umsatzsteuer","In deinen Preisen stecken 19 Prozent Umsatzsteuer, bei vielen Lebensmitteln 7 Prozent. Die führst du ans Finanzamt ab, meist mit einer Voranmeldung über ELSTER jeden Monat oder jedes Quartal. Dafür bekommst du die Umsatzsteuer auf deine Einkäufe zurück. Wer das freiwillig wählt, ist fünf Jahre daran gebunden.")}</div>
  <p class="hint"><strong>Empfehlung:</strong> ${esc(e.t)}</p></div>`;
}
function rahmenOut(){const r=rahmen(),p=S.prof;
  if(!r.gesetzt) return`<p class="muted small">Sobald du Zahlen einträgst, zeigt die App, wie viel Geld du einsetzen kannst.</p>`;
  const ng=[r.mon+" Monate Ausgaben",r.immoPuffer?"3 Kaltmieten":"",r.defizit?"6 Monate Fehlbetrag":""].filter(Boolean).join(", ");
  return`<div class="figs">
  <button class="fig" data-a="explain" data-id="deckel"><span class="k">${r.erstes?"Für das erste Vorhaben":"Je Vorhaben"}</span><span class="v num">bis ${eur(r.deckel)}</span><span class="e">Empfehlung</span></button>
  <div class="fig"><span class="k">Für alle zusammen</span><span class="v num">bis ${eur(r.gesamt)}</span><span class="e">Empfehlung</span></div>
  <button class="fig" data-a="explain" data-id="notgroschen"><span class="k">Notgroschen</span><span class="v num">${eur(r.notgroschen)}</span><span class="e">${ng}${r.wpDeckt?". Wertpapiere decken "+eur(r.wpDeckt):""}</span></button>
  <button class="fig" data-a="explain" data-id="deckel"><span class="k">Freies Geld</span><span class="v num">${eur(r.frei)}</span><span class="e">nach Notgroschen${p.weiteres&&n0(p.verplant)?", Reserviertem":""}${r.schulden?" und Schulden":""}</span></button>
  <div class="fig"><span class="k">Monatlich frei</span><span class="v num ${r.monat<0?"neg":""}">${eur(r.monat)}</span><span class="e">${p.immo?"inklusive Vermietung":"Netto minus Ausgaben"}</span></div>
  <div class="fig"><span class="k">Gebunden</span><span class="v num">${eur(r.gebunden)}</span><span class="e">in deinen Vorhaben bis zum Start</span></div></div>
  ${r.schulden?`<p class="warn">Mit Konsumschulden oder Dispo ist Tilgen fast immer die bessere Anlage. Die Zinsen dort sind höher als das, was ein kleines Vorhaben sicher einbringt.</p>`:""}
  ${r.monat<0?`<p class="warn">Dein Monat geht gerade nicht auf. Die App hält dafür sechs Monate Fehlbetrag im Notgroschen zurück.</p>`:""}`;
}
function ntSpitze(v){const r=calc(v),t=tplOf(v);if(!r.saison)return null;
  const proWoche=Math.min(6,Math.max(1,Math.round(r.laeufe/5)));   // Saison von etwa fünf Wochen angenommen
  return Math.ceil(n0(v.calc.meineStd)*proWoche+1)}
function ntForm(v){const t=tplOf(v),r=calc(v),n=ntInfo(),l=n.l,p=S.prof,sp=ntSpitze(v);
  const tage=p.tage.slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>WTL[d]).join(", ");
  const andere=aktive().filter(x=>x.id!==v.id).map(x=>"„"+x.name+"“ ("+tplOf(x).n+")");
  const rows=[
    ["Art und Aufgaben",t.taetig+" als Inhaber eines Einzelunternehmens („"+v.name+"“). "+(v.team.length?"Den Alltag führen "+v.team.map(m=>m.name).join(", ")+". Meine Aufgaben: Planung, Einkauf, Absprachen, Abrechnung.":"Meine Aufgaben: Planung, Einkauf, Absprachen, Abrechnung."),""],
    ["Bei welcher Stelle","Eigenes Gewerbe, kein Arbeitgeber",""],
    ["Beginn",v.start?dateDE(v.start):"Datum eintragen, an dem du anfängst",""],
    ["Regelmäßig oder unregelmäßig",r.saison?"unregelmäßig, saisonal, etwa "+r.laeufe+" "+t.lauf+"e im Jahr":"regelmäßig",""],
    ["Wochentage und Uhrzeit",tage+(l?", jeweils nach 14 Uhr":"")+(r.saison?". Die Markt- oder Festtage selbst führt das Team":""),l?"Laut Erlass sind Nebentätigkeiten grundsätzlich nur nach 14 Uhr zulässig.":""],
    ["Stunden pro Woche, mit Vor- und Nachbereitung","im Durchschnitt etwa "+Math.max(1,Math.ceil(r.wochenStd))+" Stunden"+(sp?", in der Saison bis etwa "+sp+" Stunden":""),sp&&sp>n.grenze?"Achtung: In der Saison liegst du über der Regelgrenze von "+n.grenze+" Stunden. Kläre vorher, ob ein Durchschnitt über mehrere Wochen anerkannt wird, oder plane weniger eigene Stunden.":"Die Regelgrenze sind "+n.hTxt+" für alle Nebentätigkeiten zusammen."],
    ["Voraussichtliche Vergütung im Monat","etwa "+eur(Math.max(0,r.jahrG)/12)+" Gewinn im Jahresschnitt (Umsatz etwa "+eur(r.jahrU/12)+")","Bei einem Gewerbe gibt es keine Vergütung im engeren Sinn. Gib den erwarteten Gewinn an und nenne den Umsatz dazu."],
    ["Weitere Nebentätigkeiten",andere.length?andere.join(", "):"keine",andere.length?"Jedes Vorhaben ist eine eigene Nebentätigkeit. Die Stunden zählen zusammen.":""]
  ];
  return`${head("Formular","Nebentätigkeit "+(n.r&&n.r.m==="G"&&p.beruf==="beamt"?"beantragen":"anzeigen"))}
    <p class="muted small">Die Angaben, die ${l?"das Formular des Landesschulamts":"deine Dienststelle"} meist verlangt, vorbereitet aus deinem Vorhaben und deinem Rahmen. Prüf jede Angabe, bevor du sie überträgst.</p>
    <div class="field"><label for="n-start">Beginn</label><input id="n-start" type="date" data-bind="v.${v.id}.start" value="${esc(v.start||"")}"></div>
    <div>${rows.map((r,i)=>`<div class="formrow"><div><p class="k">${esc(r[0])}</p><p class="v" id="nv${i}">${esc(r[1])}</p>${r[2]?`<p class="muted small">${esc(r[2])}</p>`:""}</div><button class="btn small ghost" data-a="copy" data-src="nv${i}">Kopieren</button></div>`).join("")}</div>
    ${l?`<a class="btn ghost wide" href="${esc(l.form)}" target="_blank" rel="noopener">Formular beim Landesschulamt</a><p class="hint">Grundlage: ${esc(n.r.g)} und <a href="${esc(l.erlassU)}" target="_blank" rel="noopener">${esc(l.erlass)}</a>.</p>`:n.r&&n.r.u?`<p class="hint">Grundlage: <a href="${esc(n.r.u)}" target="_blank" rel="noopener">${esc(n.r.g)}</a>.</p>`:""}
    <button class="btn ghost wide" data-a="auftrag" data-id="${v.id}" data-task="a_nt">Anschreiben von Claude formulieren lassen</button>`;
}
function beamtNotes(v){const p=S.prof;if(p.beruf!=="beamt"&&!(p.lehrkraft&&p.beruf==="oed"))return[];
  const t=v?tplOf(v):null,f=t?t.f:{},n=ntInfo(),out=[];
  if(p.beruf==="beamt"){
    const sp=v?ntSpitze(v):null;
    if(v&&calc(v).wochenStd>n.grenze) out.push("Dieses Vorhaben braucht im Schnitt mehr als "+n.grenze+" Stunden pro Woche von dir. Das liegt über der Regelgrenze für Nebentätigkeiten.");
    else if(sp&&sp>n.grenze) out.push("In der Saison kommst du auf bis zu etwa "+sp+" Stunden pro Woche. Die Regelgrenze sind "+n.grenze+". "+(p.land==="SN"?"In Sachsen zählt der Durchschnitt über höchstens vier Monate.":"Ob ein Durchschnitt über mehrere Wochen anerkannt wird, ist nicht geregelt. Kläre das vorher mit deiner Dienststelle."));
    out.push("Auch in den Ferien gilt die Grenze. Ein Gericht in Mecklenburg-Vorpommern hat entschieden, dass mehr als 8 Stunden Nebentätigkeit pro Woche im Urlaub in der Regel dienstliche Interessen beeinträchtigen.");
    out.push("Während einer Krankschreibung solltest du nicht im Vorhaben mitarbeiten. Gerichte haben das schon als Dienstvergehen gewertet.");
  }
  if(p.lehrkraft){
    out.push("Nicht an deiner Schule: kein Verkauf, keine Werbung und keine Angebote auf dem Schulgelände, keine Nutzung von Schulmail, Räumen oder Kopierer und keine Kontaktdaten von Eltern oder Schülern.");
    if(f.kurs) out.push("Keine bezahlten Kurse für eigene Schülerinnen und Schüler oder deren Eltern. Das kann die Unparteilichkeit berühren und ist ein typischer Grund für eine Untersagung.");
    if(f.ausschank||f.markt) out.push("Halte Abstand zu Festen und Märkten deiner eigenen Schule, besonders beim Ausschank von Alkohol.");
    if(p.land==="ST") out.push(NTL.ST.zeit);
  }
  return out;
}
function beamtBlock(v){const b=beamtNotes(v);if(!b.length)return"";
  return`<details class="phase" data-key="bn-${v?v.id:"all"}" ${OPEN.has("bn-"+(v?v.id:"all"))?"open":""}><summary>Als ${S.prof.beruf==="beamt"?"Beamtin oder Beamter":"Lehrkraft"} beachten <span class="pill">${b.length}</span></summary><ul class="small" style="margin:0 0 12px;padding-left:18px;display:grid;gap:6px">${b.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details>`;
}
function gewaRows(v){const t=tplOf(v), f=t.f;
  return[
    ["Angemeldete Tätigkeit",t.taetig,"Möglichst genau, aber nicht zu eng. Ändere es, wenn du zum Beispiel selbst herstellst."],
    ["Geschäftsbezeichnung",v.name,"Als Einzelunternehmen ohne Handelsregister darfst du diesen Namen nutzen. Auf Rechnungen und Briefen muss zusätzlich dein Vor- und Nachname stehen."],
    ["Art der Anmeldung","Neuerrichtung, Hauptniederlassung",aktive().length>1?"Führst du schon ein Gewerbe, reicht oft eine Ummeldung mit erweiterter Tätigkeit.":""],
    ["Im Nebenerwerb","Ja",""],
    ["Rechtsform","Einzelunternehmen",""],
    ["Beginn",v.start?dateDE(v.start):"Datum, an dem du anfängst",""],
    ["Beschäftigte","Vollzeit 0, Teilzeit "+v.team.filter(m=>m.form==="kurz"||m.form==="mini").length,""],
    ["Erlaubnis oder Eintrag",f.ausschank?"Für Ausschank ggf. Gestattung nach Landesrecht":f.handwerk?"Klären, ob Eintrag bei der Handwerkskammer nötig ist":"Keine erforderlich",""]
  ];
}
function fseRows(){const ju=jahresUmsatzAlle(), jg=jahresGewinnAlle(), m=12-new Date().getMonth();
  return[
    ["Art der Tätigkeit","Gewerblich, Einzelunternehmen, nebenberuflich",""],
    ["Gewinnermittlung","Einnahmenüberschussrechnung (EÜR)",""],
    ["Umsatz im Eröffnungsjahr",eur(Math.round(ju*m/12/100)*100),"Grob anteilig für "+m+" Monate. Bei Saisonvorhaben lieber selbst schätzen."],
    ["Umsatz im Folgejahr",eur(Math.round(ju/100)*100),""],
    ["Gewinn im Eröffnungsjahr",eur(Math.round(jg*m/12/100)*100),""],
    ["Gewinn im Folgejahr",eur(Math.round(jg/100)*100),""],
    ["Kleinunternehmerregelung",ju<RECHT.kuVorjahr?"In Anspruch nehmen":"Eher nicht möglich",ju<RECHT.kuVorjahr?"Erwarteter Umsatz liegt unter "+RECHT.kuVorjahr.toLocaleString("de-DE")+" €. Bei Verkauf an Privatleute meist günstiger.":"Erwarteter Umsatz liegt über der Grenze."],
    ["Andere Einkünfte","Aus deinem Hauptberuf, laut Lohnsteuerbescheinigung",""],
    ["Steuerberatung","Keine, oder die Kanzlei eintragen",""]
  ];
}

/* ---------- Unterseiten eines Vorhabens ---------- */
const VSUB={
  bauteile(v){const n=stage(v), c=stageChecks(v);
    const next=v.exit?null:(n<7?ventureStep(v):null);
    return`${next?`<div class="note neben"><strong>${esc(next.t)}</strong><span>${esc(next.x)}</span><div class="chips">${next.btns.map(b=>btnHTML({...b,c:(b.c||"")+" small"})).join("")}</div></div>`:""}
    <div class="timeline">${BAUTEILE.map((b,i)=>`<div class="tl ${i<n?"on":""} ${i===n?"cur":""}"><span class="v">${b.verb}</span><span class="t">${b.n}</span><span class="muted small">${esc(b.x)}</span>${i>=n&&c[i]?`<span class="mono">schon erfüllt, wartet auf die Schritte davor</span>`:""}</div>`).join("")}</div>
    <p class="muted small">${esc(v.desc||tplOf(v).kurz)}</p>
    ${v.exit?"":`<button class="linkbtn" data-a="delV" data-id="${v.id}">Vorhaben abhängen und löschen</button>`}`},

  rechnung(v){const c=v.calc,t=tplOf(v),r0=calc(v);
    const F=(k,l,u,h)=>`<div class="field"><label for="c-${k}">${l}</label><div class="suffix"><input id="c-${k}" type="text" inputmode="decimal" data-num="1" data-bind="v.${v.id}.calc.${k}" value="${dz(c[k])}"><span>${u}</span></div>${h?`<span class="hint">${h}</span>`:""}</div>`;
    return`<p class="muted small">Alles bezieht sich auf einen ${t.lauf}. Die Startwerte sind typisch für die Vorlage. Ändere sie auf deine Lage.</p>
    <div class="grid2">${F("preis","Preis pro Stück","€")}${F("kosten","Kosten pro Stück","€")}${F("stueck","Stück pro "+t.lauf,"Stk.")}${F("stand",t.f.versand?"Plattform und Porto":t.f.kommission?"Regalmiete":"Stand oder Miete","€",r0.saison?"Pro "+t.lauf+". Bei Saisonmiete die Gesamtmiete durch die Zahl der Tage teilen.":"")}</div>
    <details class="more" data-key="calc-${v.id}" ${OPEN.has("calc-"+v.id)?"open":""}><summary>Weitere Annahmen: Team, Zeit, Gebühren, Schwund, Kosten pro Jahr</summary><div class="grid2">${F("lohn","Lohn Team","€/Std.")}${F("teamStd","Team-Stunden","Std.")}${F("meineStd","Deine Stunden","Std.")}${F("fix","Sonstiges","€")}${F("prov",t.f.kommission?"Provision":"Gebühren","%",t.f.kommission?"Was die Läden behalten, üblich sind 25 bis 40 Prozent.":"Kartenzahlung oder Plattform, meist 1 bis 12 Prozent.")}${F("schwund","Schwund","%","Ware, die verdirbt, kaputtgeht oder übrig bleibt.")}${F("jahr","Kosten pro Jahr","€","Versicherung, Konto, Beiträge, Lizenzen.")}${F("laeufe","Läufe pro Jahr","")}${F("start","Startkosten","€","Einmalig: Stand, Werkzeug, erste Ausstattung.")}</div></details>
    <div class="field"><span class="lab">Beschäftigung im Team</span><div class="chips">${[["kurz","Kurzfristig"],["mini","Minijob"],["keine","Kein Team"]].map(([k,l])=>`<button class="chip" data-a="cform" data-id="${k}" data-vid="${v.id}" data-key="cf${k}" aria-pressed="${(c.form||"kurz")===k}">${l}</button>`).join("")}</div></div>
    <div id="calcOut">${calcOut(v)}</div>
    ${v.passOk?`<p class="pill ok">Passung bestätigt am ${dateDE(v.passOk)}</p>`:""}
    <div class="wirehead"><span class="eyebrow">Passung zu deinen Werten</span></div>${werteBlock(v)}
    <div class="wirehead"><span class="eyebrow">Nachhaltigkeitsblick</span></div>${bioBlock(v)}
    ${!v.passOk&&SH.passAsk?`<div class="note"><strong>Mehr Geld als empfohlen.</strong><span>Das Vorhaben braucht etwa ${eur(calc(v).kapital)} bis zum Start. Empfohlen sind ${eur(rahmen().deckel)}, für alle Vorhaben zusammen ${eur(rahmen().gesamt)}. Du kannst trotzdem bestätigen, wenn du das Geld bewusst einplanst und ein Verlust dich nicht belasten würde.</span></div>`:""}
    ${v.passOk?"":`<button class="btn wide" data-a="passOk" data-id="${v.id}">${SH.passAsk?"Ja, bewusst bestätigen":"Passung bestätigen"}</button><p class="muted small">Damit sagst du: Ich habe Rechnung, Geldbedarf und Werte angesehen und will weitermachen.</p>`}
    <button class="btn ghost wide" data-a="auftrag" data-id="${v.id}" data-task="a_kalk">Rechnung von Claude prüfen lassen</button>`},

  pflichten(v){const ds=dutiesFor(v), n=stage(v);
    return`<p class="muted small">Abgeleitet aus ${esc(landN())}, deinem Hauptberuf und der Vorlage. Bauteil „Angemeldet“ gibt es, wenn alle Schritte vor dem Start erledigt sind.</p>`+beamtBlock(v)+
    ["vor","team","laufend","exit"].map(w=>{const l=ds.filter(d=>d.w===w);if(!l.length)return"";const rows=l.map(d=>dutyRow(v,d,false)).join("");
      return phaseOpen(w,v,n)?`<div class="wirehead"><span class="eyebrow">${PFLICHT_PHASEN[w]}</span></div><div>${rows}</div>`:phaseLater(w,"ph-"+v.id+w,l.length,rows)}).join("")+
    (tplOf(v).f.kurs?"":`<button class="btn ghost wide" data-a="sheet" data-id="form" data-form="gewa" data-vid="${v.id}">Gewerbeanmeldung vorbereitet</button>`)},

  auftraege(v){const f=tplOf(v).f, list=AUFTRAEGE.filter(a=>(!a.f||f[a.f])&&(!a.nur||a.nur(S.prof)));
    const grp={pass:"Prüfen",amt:"Anmelden",prod:"Ausgestalten",team:"Übertragen",exit:"Weitergeben"};
    return`<p class="muted small">Jeder Auftrag ist mit deinem Vorhaben gefüllt. Claude recherchiert oder schreibt, du legst das Ergebnis hier ab.</p>`+
    Object.keys(grp).map(g=>{const l=list.filter(a=>a.out===g);return l.length?`<div class="wirehead"><span class="eyebrow">${grp[g]}</span></div><div class="list">${l.map(a=>{const k=v.results.filter(r=>r.task===a.id).length;return`<button class="li" data-a="auftrag" data-id="${v.id}" data-task="${a.id}"><span class="grow"><span class="t">${esc(a.t)}</span>${k?`<span class="s">${k} Ergebnis${k>1?"se":""} abgelegt</span>`:""}</span><span class="chev"></span></button>`}).join("")}</div>`:""}).join("")+
    `<div class="wirehead"><span class="eyebrow">Konzept</span></div><div class="field"><label for="v-prod">Produkt- oder Angebotskonzept in deinen Worten</label><textarea id="v-prod" data-bind="v.${v.id}.prod" placeholder="Was genau wird verkauft, von wem hergestellt, zu welchem Preis?">${esc(v.prod||"")}</textarea><span class="hint">Sobald hier etwas steht, gilt das Bauteil „Ausgestaltet“.</span></div>`},

  team(v){const f=tplOf(v).f;
    return`<p class="muted small">Ein Vorhaben trägt nebenher, wenn jemand anders den Alltag führt. Du steuerst über Absprachen, Handbuch und Abrechnung.</p>
    <div class="list">${v.team.map(m=>`<div class="li" style="cursor:default"><span class="dot" style="--c:var(--leben)"></span><span class="grow"><span class="t">${esc(m.name)}</span><span class="s">${{kurz:"kurzfristig beschäftigt",mini:"Minijob",frei:"selbstständig",partner:"verkauft auf Provision"}[m.form]}${m.form==="partner"?"":" · "+eur(n0(m.lohn),2)+" pro Stunde"}</span>${m.form==="frei"?`<span class="warn">Scheinselbstständigkeit prüfen</span>`:""}${n0(m.lohn)<RECHT.mindestlohn&&m.form!=="frei"&&m.form!=="partner"?`<span class="warn">Unter dem Mindestlohn</span>`:""}</span><button class="btn small ghost" data-a="delMember" data-id="${v.id}" data-mid="${m.id}">Entfernen</button></div>`).join("")}</div>
    <button class="btn wide" data-a="sheet" data-id="member" data-vid="${v.id}">${f.kommission?"Partner oder Person hinzufügen":"Person hinzufügen"}</button>
    <div class="chips"><button class="btn ghost small" data-a="auftrag" data-id="${v.id}" data-task="a_stelle">Anzeige schreiben lassen</button><button class="btn ghost small" data-a="auftrag" data-id="${v.id}" data-task="a_handbuch">Ablauf-Handbuch</button>${f.team?`<button class="btn ghost small" data-a="auftrag" data-id="${v.id}" data-task="a_vertrag">Vertrag entwerfen</button>`:""}${f.kommission?`<button class="btn ghost small" data-a="auftrag" data-id="${v.id}" data-task="a_laeden">Partnerläden finden</button>`:""}</div>
    <div class="note"><span>${v.solo?"Du hast entschieden, dieses Vorhaben allein zu führen. Das Mobile rechnet dafür etwas mehr Gewicht auf die Vorhaben-Seite.":"Du kannst auch bewusst entscheiden, es allein zu machen. Dann kostet es deine Zeit."}</span><div><button class="linkbtn" data-a="solo" data-id="${v.id}">${v.solo?"Doch nicht allein":"Ich mache es bewusst allein"}</button></div></div>`},

  laeufe(v){const t=tplOf(v), r=calc(v);
    return`<p class="muted small">Ein Lauf ist ein ${t.lauf}. Nach jedem Lauf trägst du ein, was wirklich war. Drei Läufe mit Gewinn und wenig eigener Zeit, davon einer ganz ohne dich, ergeben „Trägt sich“.</p>
    <div class="list">${v.runs.slice().reverse().map(x=>{const g=n0(x.umsatz)-n0(x.kosten);return`<div class="li" style="cursor:default"><span class="grow"><span class="t">${dateDE(x.d)} · Gewinn <span class="num">${eur(g)}</span></span><span class="s">Umsatz ${eur(n0(x.umsatz))} · deine Zeit ${n0(x.meineStd).toLocaleString("de-DE")} Std. · Team ${n0(x.teamStd).toLocaleString("de-DE")} Std.${x.note?" · "+esc(x.note):""}</span></span><button class="btn small ghost" data-a="delRun" data-id="${v.id}" data-rid="${x.id}">Löschen</button></div>`}).join("")||`<p class="muted small" style="padding:12px 0">Noch kein Lauf. Erwartet laut Rechnung: ${eur(r.gewinn)} Gewinn pro ${t.lauf}.</p>`}</div>
    ${v.exit?"":`<button class="btn wide" data-a="sheet" data-id="run" data-vid="${v.id}">Lauf eintragen</button>`}`},

  uebergabe(v){
    if(v.exit) return`<div class="note sinn"><strong>${v.exit.art==="einstellen"?"Eingestellt":"Übergeben"} am ${dateDE(v.exit.d)}</strong><span>${v.exit.art==="einstellen"?"Das Vorhaben läuft nicht mehr.":"Für "+eur(n0(v.exit.preis))+(v.exit.an?" an "+esc(v.exit.an):"")+"."}</span></div>${dutiesFor(v).filter(d=>d.w==="exit").map(d=>dutyRow(v,d,false)).join("")}`;
    const n=stage(v), r=calc(v), pr=preisSpanne(v), art=SH.art||v.exitArt||"komplett";
    const moods=S.time.filter(x=>x.vid===v.id&&x.mood).slice(-4), mood=moods.length?moods.reduce((s,x)=>s+x.mood,0)/moods.length:null;
    const last=v.runs[v.runs.length-1];
    const reasons=[];
    if(n>=7) reasons.push(["ok","Es trägt sich: drei Läufe mit Gewinn, einer davon ganz ohne dich."]);
    if(v.team.length) reasons.push(["ok","Es gibt jemanden, der den Alltag kennt und es übernehmen könnte."]);
    if(mood!=null&&mood<2.6) reasons.push(["warn","Die Vorhabenzeit für dieses Vorhaben tut dir zuletzt nicht gut."]);
    if(r.wochenStd>n0(S.prof.stunden)*0.6) reasons.push(["warn","Es braucht mehr als die Hälfte deiner Vorhabenzeit."]);
    if(last&&n0(last.umsatz)-n0(last.kosten)<=0) reasons.push(["warn","Der letzte Lauf hatte keinen Gewinn."]);
    const ripe=n>=7||reasons.some(x=>x[0]==="warn");
    return`<div class="note ${ripe?"sinn":"neben"}"><strong>${n>=7?"Ein guter Moment zum Weitergeben.":ripe?"Weitergeben oder Pause ist eine Überlegung wert.":"Noch zu früh."}</strong><span>${n>=7||ripe?"Ein Vorhaben, das sich trägt, ist für andere am meisten wert. Ein Verkauf gibt dir Geld und Zeit zurück und jemand anderem eine eigene Existenz.":"Weitergeben lohnt sich meist, wenn das Vorhaben eine Saison oder mehrere Läufe ohne dich getragen hat."}</span></div>
    ${reasons.length?`<div class="list">${reasons.map(([k,t])=>`<div class="li" style="cursor:default"><span class="pill ${k==="ok"?"ok":"warn"}">${k==="ok"?"spricht dafür":"Achtung"}</span><span class="grow small">${esc(t)}</span></div>`).join("")}</div>`:""}
    <div class="field"><span class="lab">Wie weitergeben?</span><div class="chips">${[["komplett","Komplett verkaufen"],["anteil","Mit Beteiligung"],["einstellen","Einstellen"]].map(([k,l])=>`<button class="chip" data-a="exitArt" data-id="${k}" data-key="ea${k}" aria-pressed="${art===k}">${l}</button>`).join("")}</div>
    <span class="hint">${art==="komplett"?"Empfohlen. Ein klarer Schnitt passt zu einer Nebenexistenz mit wenig Verwaltung: Preis gezahlt, Gewerbe abgemeldet, fertig.":art==="anteil"?"Mit Beteiligung bleibst du Mitunternehmer oder stiller Gesellschafter. Das heißt Verträge, Abrechnungen und Steuern auf Dauer. Es widerspricht dem Ziel, wenig Verwaltung zu haben.":"Ohne Verkauf meldest du das Gewerbe ab und verkaufst das Inventar. Auch das ist eine gute Entscheidung, wenn es nicht mehr passt."}</span></div>
    ${art!=="einstellen"?`<div class="field"><label for="x-inv">Wert des Inventars heute</label><div class="suffix"><input id="x-inv" type="text" inputmode="decimal" data-num="1" data-bind="v.${v.id}.calc.inventar" value="${v.calc.inventar||""}"><span>€</span></div><span class="hint">Stand, Kasse, Vorrat, Werkzeug, zum heutigen Zeitwert.</span></div>
    <div id="preisOut"><div class="figs"><div class="fig"><span class="k">Preisorientierung</span><span class="v num">${eur(pr[0])} – ${eur(pr[1])}</span><span class="e">Inventar plus ein halber bis ganzer Jahresgewinn</span></div><div class="fig"><span class="k">Jahresgewinn</span><span class="v num">${eur(pr[2])}</span><span class="e">${v.runs.length>=2?"hochgerechnet aus "+v.runs.length+" abgerechneten Läufen":"noch geschätzt, aus der Rechnung"}</span></div></div></div>
    <p class="muted small">Eine grobe Faustregel für sehr kleine Betriebe, kein Gutachten. Was jemand zahlt, hängt an Lieferkontakten und daran, wie sicher die Zahlen sind. Standplatzzusagen sind meist persönlich und gehen nicht automatisch mit über. Kläre mit dem Veranstalter, ob er die neue Person übernimmt.</p>
    ${v.team.some(m=>m.form!=="partner")?`<div class="note sinn"><strong>Am naheliegendsten: Verkauf an ${esc(v.team.find(m=>m.form!=="partner").name)}</strong><span>Wer den Alltag schon kennt, ist oft die beste Käuferin. Ein fairer Weg sind 30 Prozent Anzahlung und der Rest in 12 bis 24 Monatsraten, mit Eigentumsvorbehalt am Inventar, dazu eine Saison Begleitung. Mit dem Kauf endet das Arbeitsverhältnis bei dir.</span><div><button class="btn small sinn" data-a="auftrag" data-id="${v.id}" data-task="a_kaeufer">Verkauf an die Standleitung vorbereiten</button></div></div>`:""}
    <div class="chips"><button class="btn ghost small" data-a="auftrag" data-id="${v.id}" data-task="a_expose">Exposé schreiben lassen</button><button class="btn ghost small" data-a="auftrag" data-id="${v.id}" data-task="a_vertrag2">Vertrag entwerfen</button></div>`:""}
    <div class="wirehead"><span class="eyebrow">Bei der Übergabe</span></div>${dutiesFor(v).filter(d=>d.w==="exit").map(d=>dutyRow(v,d,false)).join("")}
    <div class="wirehead"><span class="eyebrow">Abschließen</span></div>
    ${art!=="einstellen"?`<div class="grid2"><div class="field"><label for="x-preis">Vereinbarter Preis</label><div class="suffix"><input id="x-preis" type="text" inputmode="decimal" data-num="1" value="${pr[0]||""}"><span>€</span></div></div><div class="field"><label for="x-an">An wen</label><input id="x-an" type="text" placeholder="Vorname"></div></div>`:""}
    ${SH.exitAsk?`<div class="note leben"><strong>Es hat sich noch nicht getragen.</strong><span>Du kannst trotzdem abschließen, zum Beispiel wenn es dir nicht mehr guttut.</span></div>`:""}
    <button class="btn wide sinn" data-a="doExit" data-id="${v.id}" data-art="${art}">${SH.exitAsk?"Ja, trotzdem abschließen":art==="einstellen"?"Als eingestellt markieren":"Als übergeben markieren"}</button>`}
};
function calcOut(v){const r=calc(v),t=tplOf(v),R=rahmen(),c=v.calc;
  const w=[];
  if(n0(c.lohn)>0&&n0(c.lohn)<RECHT.mindestlohn&&(c.form||"kurz")!=="keine") w.push("Der Teamlohn liegt unter dem Mindestlohn von "+fill("{ml}")+" €.");
  if(R.gesetzt&&r.kapital>R.deckel) w.push("Bis zum ersten Lauf brauchst du etwa "+eur(r.kapital)+". Das liegt über deinem Deckel von "+eur(R.deckel)+(R.erstes?" für das erste Vorhaben":"")+". Fang kleiner an oder spar die Differenz vorher an.");
  if(R.gesetzt&&R.gebunden>R.gesamt) w.push("Alle Vorhaben zusammen binden etwa "+eur(R.gebunden)+". Das ist mehr als 30 Prozent deines freien Geldes ("+eur(R.gesamt)+").");
  if(t.f.markt&&new Date().getMonth()>=7&&!v.duties.platz) w.push("Für die Saison in diesem Jahr sind die meisten Marktplätze schon vergeben. Plane für das nächste Jahr, oder fang mit einem Platz an einem bestehenden Stand an.");
  if(r.wochenStd>n0(S.prof.stunden)) w.push("Allein dieses Vorhaben braucht im Schnitt "+r.wochenStd.toLocaleString("de-DE",{maximumFractionDigits:1})+" Stunden pro Woche. Das ist mehr als dein ganzer Rahmen.");
  if(!S.prof.ust&&jahresUmsatzAlle()>RECHT.kuVorjahr) w.push("Alle Vorhaben zusammen liegen über 25.000 € Umsatz. Die Kleinunternehmerregelung entfällt dann im Folgejahr. Stell im Rahmen auf Umsatzsteuer um, dann rechnet die App mit Nettopreisen.");
  const pct=Math.round(r.abg*100);
  return`<div class="figs">
    <div class="fig"><span class="k">Gewinn pro ${esc(t.lauf)}</span><span class="v num ${r.gewinn<0?"neg":""}">${eur(r.gewinn)}</span><span class="e">Umsatz ${eur(r.umsatz)} minus Kosten ${eur(r.kosten)}</span></div>
    <button class="fig" data-a="explain" data-id="gewinn"><span class="k">Gewinn im Jahr</span><span class="v num ${r.jahrG<0?"neg":""}">${eur(r.jahrG)}</span><span class="e">bei etwa ${Math.round(r.effL)} von ${r.laeufe} Läufen, nach Jahreskosten</span></button>
    <div class="fig"><span class="k">Pro eigener Stunde</span><span class="v num">${r.proStd==null?"–":eur(r.proStd)}</span><span class="e">${r.wochenStd.toLocaleString("de-DE",{maximumFractionDigits:1})} Std. pro Woche im Schnitt</span></div>
    <button class="fig" data-a="explain" data-id="kapital"><span class="k">Geld bis zum Start</span><span class="v num">${eur(r.kapital)}</span><span class="e">${r.saison?"Start, Anzahlung Stand, erste Ware":"Start und zwei Läufe Vorlauf"}</span></button></div>
    ${r.jahrG>0?`<p class="muted small">Leg etwa ${eur(r.ruecklage/12)} im Monat für die Einkommensteuer zurück, also grob 30 Prozent des Jahresgewinns. Nach der ersten Steuererklärung kommen oft Nachzahlung und Vorauszahlungen zusammen.</p>`:""}
    <p class="muted small">Gerechnet mit ${Math.round((1-AUSFALL)*100)} Prozent Ausfall bei den Läufen${r.schwund?", "+eur(r.schwund)+" Schwund pro "+esc(t.lauf):""}${r.prov?", "+eur(r.prov)+" Gebühren pro "+esc(t.lauf):""}${r.jahrK?" und "+eur(r.jahrK)+" Kosten pro Jahr für Versicherung, Konto und Beiträge":""}.${S.prof.ust?" Preise gelten als Bruttopreise, die Umsatzsteuer ist herausgerechnet.":""}</p>
    ${r.personal>0?`<p class="muted small">Team pro ${esc(t.lauf)}: ${eur(r.personal)}, ${(c.form||"kurz")==="mini"?"inklusive rund "+RECHT.minijobAbgabe+" Prozent Pauschalabgaben":"inklusive rund "+pct+" Prozent Umlagen. Keine Sozialabgaben, aber Lohnsteuer nach Steuermerkmalen oder pauschal 25 Prozent"}.</p>`:""}
    ${w.map(x=>`<p class="warn">${esc(x)}</p>`).join("")}`;
}
function werteBlock(v){
  if(!S.werte.length) return`<p class="muted small">Noch keine Werte eingetragen. Mit Werten prüfst du hier, ob das Vorhaben zu dir passt.</p><div><button class="btn small ghost" data-a="sheet" data-id="werte">Werte eintragen</button></div>`;
  return`<div class="stack">${S.werte.map(w=>`<div><p class="small" style="margin-bottom:6px">${esc(w)}</p><div class="chips">${[["passt","passt"],["teils","teils"],["reibt","reibt sich"]].map(([k,l])=>`<button class="chip" data-a="wert" data-id="${v.id}" data-w="${esc(w)}" data-val="${k}" data-key="wv${esc(w)}${k}" aria-pressed="${v.werte[w]===k}" style="--c:${k==="reibt"?"var(--leben)":"var(--sinn)"}">${l}</button>`).join("")}</div></div>`).join("")}</div>
  ${Object.values(v.werte).includes("reibt")?`<div class="note leben"><span>Mindestens ein Wert reibt sich. Überleg, was du ändern müsstest, damit es passt, oder ob es das richtige Vorhaben ist.</span></div>`:""}`;
}
function bioBlock(v){
  const yes=BIO_FRAGEN.filter(q=>v.bio[q.id]==="ja").length;
  return`<div class="stack">${BIO_FRAGEN.map(q=>`<div><p class="small" style="margin-bottom:6px"><strong>${q.t}.</strong> ${esc(q.q)}</p><div class="chips">${[["ja","ja"],["teils","teils"],["nein","nein"]].map(([k,l])=>`<button class="chip" data-a="bio" data-id="${v.id}" data-q="${q.id}" data-val="${k}" data-key="bi${q.id}${k}" aria-pressed="${v.bio[q.id]===k}" style="--c:var(--sinn)">${l}</button>`).join("")}</div></div>`).join("")}</div>
  <p class="muted small">${yes} von 5 Punkten erfüllt.</p><div class="chips"><button class="btn small ghost" data-a="auftrag" data-id="${v.id}" data-task="a_nachhaltig">Nachhaltiger machen lassen</button><a class="linkbtn" href="${esc(S.settings.apps.bt)}" target="_blank" rel="noopener">Im Biotop weiterdenken</a></div>`;
}

/* ---------- Hauptansicht ---------- */
const TABS=[["home","Mobile"],["vorhaben","Vorhaben"],["amt","Ämter"],["leben","Leben"]];
function render(){
  const main=$("#main");
  const v={home:viewHome,vorhaben:viewVorhaben,amt:viewAmt,leben:viewLeben}[S.tab]||viewHome;
  main.innerHTML=v();
  document.querySelectorAll("nav.tabs button").forEach((b,i)=>{const on=TABS[i][0]===S.tab;b.setAttribute("aria-current",on?"page":"false")});
  moveDot();
  afterRender();
  if(S.tab==="home"&&S.fresh.length){setTimeout(()=>{S.fresh=[];persist()},1500)}
}
function moveDot(){const i=TABS.findIndex(t=>t[0]===S.tab),nav=$("nav.tabs .in"),d=$(".tabdot");if(!nav||!d)return;const w=nav.clientWidth/4;d.style.left=(w*i+w/2-2.5)+"px"}
function afterRender(){
  if(lastSel&&performance.now()-lastSel.t<800){const el=document.querySelector(`[data-key="${CSS.escape(lastSel.key)}"]`);
    if(el&&el.getAttribute("aria-pressed")==="true"){const b=el.getBoundingClientRect();el.style.setProperty("--fx",(lastSel.x-b.left)+"px");el.style.setProperty("--fy",(lastSel.y-b.top)+"px");el.classList.add("fill-in")}}
  lastSel=null;
  if(IOS) armHaptics();
}
function setTab(t){S.tab=t;persist();render();window.scrollTo(0,0);try{const m=$("#main h2,#main h1");if(m){m.setAttribute("tabindex","-1");m.focus({preventScroll:true})}}catch(e){}}

/* ---------- Momente ---------- */
function showMoment(){
  if(SH||S.tab!=="home"||!S.mq.length) return;
  const [mid,...more]=S.mq; S.mq=[]; persist();
  openSheet("moment",{mid,more});
}

/* ---------- Toast mit Rückgängig ---------- */
let toastT=null, undoSnap=null;
function toast(msg,undo,ok){
  const t=$("#toast"); undoSnap=undo||null;
  t.innerHTML=`${ok?`<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`:""}<span>${esc(msg)}</span>${undo?`<button data-a="undo">Rückgängig</button>`:""}`;
  t.classList.toggle("up",!!SH); t.hidden=false; requestAnimationFrame(()=>t.classList.add("on"));
  clearTimeout(toastT); toastT=setTimeout(()=>{t.classList.remove("on");setTimeout(()=>{t.hidden=true},250);undoSnap=null},undo?5200:2400);
  live(msg);
}
function live(m){const l=$("#live");l.textContent="";setTimeout(()=>{l.textContent=m},50)}

/* ---------- Haptik und Klickfamilien ---------- */
const IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const HAPSEL=".btn,.chip,.opt,.check,.person,.card,.logo,.closebtn,.iconbtn,.fig";
const PAT={sel:10,act:12,ok:[10,60,14],err:[24,60,24]};
const vibOn=()=>S.settings.vib!==false;
function buzz(k){ if(!vibOn()||IOS) return; try{navigator.vibrate&&navigator.vibrate(PAT[k])}catch(e){} }
function armHaptics(){ if(!vibOn()) return;
  document.querySelectorAll(HAPSEL).forEach(el=>{
    if(el.tagName==="A"||el.querySelector(":scope>label.hap")) return;
    const l=document.createElement("label"); l.className="hap"; l.setAttribute("aria-hidden","true");
    l.addEventListener("click",e=>{if(e.target===l) e.stopPropagation()});
    const i=document.createElement("input"); i.type="checkbox"; i.setAttribute("switch",""); i.tabIndex=-1;
    l.appendChild(i); el.appendChild(l);
  });
}
let lastSel=null, tg=null, cancelUntil=0;
const TAPSEL=".btn,.chip,.check,.person,.card,.li,.fig,.mob-hit";
addEventListener("touchstart",e=>{cancelUntil=0;const t=e.touches[0],el=e.target.closest&&e.target.closest(TAPSEL);tg=el?{el,x:t.clientX,y:t.clientY,moved:false}:null},{passive:true,capture:true});
addEventListener("touchmove",e=>{if(!tg||tg.moved)return;const t=e.touches[0];if(Math.hypot(t.clientX-tg.x,t.clientY-tg.y)>10){tg.moved=true;tg.el.classList.add("nopress")}},{passive:true,capture:true});
addEventListener("touchend",e=>{if(!tg)return;if(tg.moved)cancelUntil=performance.now()+600;tg.el.classList.remove("nopress");tg=null},{passive:true,capture:true});
document.addEventListener("click",e=>{if(performance.now()<cancelUntil){cancelUntil=0;e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener("pointerup",e=>{
  const el=e.target.closest&&e.target.closest(".btn,.card,.fig,.closebtn"); if(!el||el.disabled||matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const b=el.getBoundingClientRect(), d=Math.max(b.width,b.height)*2.2, r=document.createElement("span");
  r.className="ripple"; r.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-b.left-d/2}px;top:${e.clientY-b.top-d/2}px`;
  el.appendChild(r); setTimeout(()=>r.remove(),650);
});

/* ---------- Zentraler Klick-Handler ---------- */
document.addEventListener("click",e=>{
  const hap=e.target.classList&&e.target.closest&&e.target.closest("label.hap"); if(hap&&e.target.tagName==="INPUT") e.target.blur();
  const el=e.target.closest&&e.target.closest("[data-a]"); if(!el||el.disabled) return;
  const a=el.dataset.a, d=el.dataset;
  if(el.classList.contains("chip")||el.classList.contains("opt")||el.classList.contains("check")||el.classList.contains("person")){lastSel={key:d.key||"",x:e.clientX,y:e.clientY,t:performance.now()};buzz("sel")} else buzz("act");
  const H=ACT[a]; if(H){ if(el.tagName==="A"&&a!=="claudeGo") e.preventDefault(); H(d,el,e) }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&SH) backSheet();
  if((e.key==="Enter"||e.key===" ")&&e.target.classList&&e.target.classList.contains("mob-hit")){e.preventDefault();e.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
  if(e.key==="Tab"&&SH){const f=[...$("#sheet").querySelectorAll("button,a,input,select,textarea,[tabindex]")].filter(x=>!x.disabled&&x.offsetParent!==null&&x.tabIndex>=0);if(!f.length)return;
    if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus()}}
});
document.addEventListener("toggle",e=>{const k=e.target.dataset&&e.target.dataset.key;if(!k)return;e.target.open?OPEN.add(k):OPEN.delete(k)},true);

/* Eingaben: data-bind="prof.netto" oder "v.<id>.calc.preis" */
document.addEventListener("input",e=>{
  const b=e.target.dataset&&e.target.dataset.bind; if(!b) return;
  const parts=b.split("."); let obj=S, i=0;
  if(parts[0]==="v"){obj=vById(parts[1]);i=2;if(!obj)return}
  for(;i<parts.length-1;i++){obj=obj[parts[i]]=obj[parts[i]]||{}}
  const k=parts[parts.length-1], val=e.target.dataset.num?(e.target.value.trim()===""?"":n0(e.target.value)):e.target.value;
  obj[k]=val; save();
  if(parts[0]==="v"&&parts[2]==="calc"){const v=vById(parts[1]);const o=$("#calcOut");if(o)o.innerHTML=calcOut(v);const po=$("#preisOut");if(po&&SH)renderSheetPart(v)}
  if(parts[0]==="prof"){const o=$("#rahmenOut");if(o)o.innerHTML=rahmenOut()}
});
document.addEventListener("change",e=>{if(e.target.tagName==="SELECT"&&e.target.dataset.bind){e.target.dispatchEvent(new Event("input",{bubbles:true}))}});
function renderSheetPart(v){const pr=preisSpanne(v),r=calc(v),po=$("#preisOut");if(!po)return;const vs=po.querySelectorAll(".v");if(vs[0])vs[0].textContent=eur(pr[0])+" – "+eur(pr[1]);if(vs[1])vs[1].textContent=eur(r.jahrG)}

const ACT={
  tab:d=>{if(SH)closeSheet();setTab(d.id)},
  sheet:d=>{const o={};if(d.vid)o.vid=d.vid;if(d.wid)o.wid=d.wid;if(d.form)o.form=d.form;openSheet(d.id,o)},
  close:()=>backSheet(),
  venture:d=>openSheet("venture",{vid:d.id,sub:d.sub||"bauteile"}),
  sub:d=>{SH.sub=d.id;SH.art=null;renderSheet()},
  auftrag:d=>openSheet("auftrag",{vid:d.id,task:d.task,duty:d.duty||""}),
  explain:d=>openSheet("explain",{eid:d.id}),
  later:()=>{S.lifeLater=today();save();render()},
  override:()=>{S.override=today();save();render();toast("Für heute zeigt die App auch Schritte für die Vorhaben. Morgen gilt wieder dein Rahmen.")},
  seen:d=>{const p=S.people.find(x=>x.id===d.id);if(!p)return;const sn=snapshot();p.last=today();save();render();if(SH)renderSheet();buzz("ok");toast(p.name+" eingetragen.",sn,true)},
  hintOff:d=>{S.hintsOff[d.id]=1;S.hint={d:today(),id:"",done:1};save();render()},
  welcomeGo:()=>{S.onb=true;if(!S.firstDay)S.firstDay=today();save();openSheet("profil",{},true)},
  demoOn:d=>{const own=!S.demo&&(S.ventures.length||S.prof.land||S.people.length);
    if(own&&!(d&&d.ok)&&SH&&SH.id==="settings"){SH.demoAsk=true;renderSheet();return}
    if(own){try{localStorage.setItem(KEY+"-eigen",JSON.stringify(S))}catch(e){}}
    loadDemo();S.onb=true;save();if(SH)closeSheet();render();toast(own?"Beispiel geladen. Deine Daten sind gesichert.":"Beispiel geladen.")},
  demoOff:()=>{let back=null;try{back=localStorage.getItem(KEY+"-eigen")}catch(e){}
    if(back){S=deepMerge(fresh(),JSON.parse(back));migrate();try{localStorage.removeItem(KEY+"-eigen")}catch(e){}}
    else{const keep=S.settings;S=fresh();S.settings=keep;S.onb=true}
    save();if(SH)closeSheet();render();toast(back?"Beispiel gelöscht. Deine Daten sind zurück.":"Beispiel gelöscht.")},
  beruf:d=>{S.prof.beruf=d.id;save();renderSheet()},
  ust:d=>{S.prof.ust=d.id==="1";save();renderSheet()},
  immo:d=>{S.prof.immo=d.id==="1";save();renderSheet()},
  pflag:d=>{S.prof[d.k]=d.id==="1";save();renderSheet()},
  pwo:d=>{S.prof.verplantWo=d.id;save();renderSheet()},
  profilSave:()=>{if(!S.prof.land||!S.prof.beruf){const b=$("[data-a=profilSave]");b.classList.add("shake");setTimeout(()=>b.classList.remove("shake"),350);buzz("err");toast("Bitte Bundesland und Hauptberuf wählen.");return}save();closeSheet();buzz("ok");toast("Rahmen gespeichert.",null,true)},
  pickTpl:d=>openSheet("name",{tpl:d.id}),
  createV:d=>{const t=VORLAGEN.find(x=>x.id===d.id), nm=($("#f-vname").value||"").trim()||t.n, ds=($("#f-vdesc").value||"").trim();
    if(aktive().length>=MAX_AKTIV) return;
    const v={id:uid(),tpl:t.id,name:nm,desc:ds,created:today(),calc:Object.assign({form:t.f.team?(t.besch||"mini"):"keine",laeufe:t.laeufe,start:Math.round((t.start[0]+t.start[1])/2/100)*100,inventar:0},t.calc),duties:{},team:[],runs:[],results:[],werte:{},bio:{},prod:""};
    S.ventures.push(v);save();closeSheet();setTab("home");buzz("ok");toast("„"+nm+"“ hängt am Mobile.",null,true)},
  delV:d=>{const sn=snapshot();S.ventures=S.ventures.filter(v=>v.id!==d.id);delete S.lv[d.id];save();closeSheet();toast("Vorhaben gelöscht.",sn)},
  duty:d=>{const v=vById(d.id), du=PFLICHTEN.find(x=>x.id===d.duty), sn=snapshot();
    if(PERSON.has(du.id)){S.pduties[du.id]?delete S.pduties[du.id]:S.pduties[du.id]=today()} else {v.duties[du.id]?delete v.duties[du.id]:v.duties[du.id]=today()}
    const on=dutyDone(v,du); if(on&&du.id==="gew"&&!S.seen.gew){S.seen.gew=1;S.mq.push("gew")}
    save(); if(SH)renderSheet(); render(); if(on){buzz("ok");toast("Erledigt: "+du.t,sn,true)} },
  pend:d=>{const v=vById(d.id);v.pending=v.pending||{};v.pending[d.duty]?delete v.pending[d.duty]:v.pending[d.duty]=today();save();if(SH)renderSheet();render()},
  passOk:d=>{const v=vById(d.id),r=calc(v),R=rahmen();const no=m=>{const b=$("[data-a=passOk]");if(b){b.classList.add("shake");setTimeout(()=>b.classList.remove("shake"),350)}buzz("err");toast(m)};
    if(!(n0(v.calc.preis)>0&&n0(v.calc.stueck)>0)) return no("Trag zuerst Preis und Stückzahl ein.");
    if(r.gewinn<=0) return no("Die Rechnung zeigt noch keinen Gewinn. Ändere Preis oder Kosten.");
    if(R.gesetzt&&R.gebunden>R.frei) return no("Dafür müsstest du an deinen Notgroschen oder an verplantes Geld. Fang kleiner an oder spar vorher an.");
    if(R.gesetzt&&(r.kapital>R.deckel||R.gebunden>R.gesamt)&&!SH.passAsk){SH.passAsk=true;renderSheet();const b=$("[data-a=passOk]");if(b)b.scrollIntoView({block:"center"});return}
    SH.sub="bauteile";v.passOk=today();save();renderSheet();render();buzz("ok");toast("Passung bestätigt.",null,true)},
  cform:d=>{const v=vById(d.vid);v.calc.form=d.id;save();renderSheet()},
  wert:d=>{const v=vById(d.id);v.werte[d.w]=v.werte[d.w]===d.val?undefined:d.val;if(!v.werte[d.w])delete v.werte[d.w];save();renderSheet()},
  bio:d=>{const v=vById(d.id);v.bio[d.q]=v.bio[d.q]===d.val?undefined:d.val;if(!v.bio[d.q])delete v.bio[d.q];save();renderSheet()},
  claudeGo:(d,el)=>{const t=$("#f-prompt");if(t){el.href="https://claude.ai/new?q="+encodeURIComponent(t.value);copyText(t.value)}},
  copy:d=>{const src=document.getElementById(d.src);if(!src)return;copyText(src.value!=null&&src.tagName!=="P"?src.value:src.textContent,src)},
  saveResult:d=>{const v=vById(d.id), tx=($("#f-result").value||"").trim();if(!tx){buzz("err");toast("Füge zuerst eine Antwort ein.");return}
    v.results.push({id:uid(),task:d.task,text:tx,d:today()});const a=AUFTRAEGE.find(x=>x.id===d.task);if(a.out==="prod"&&!(v.prod||"").trim())v.prod=tx.slice(0,1200);save();renderSheet();render();buzz("ok");toast("Ergebnis abgelegt.",null,true)},
  tvid:d=>{SH.vid=d.id;renderSheet()},
  tmin:d=>{SH.min=SH.min==d.id?0:+d.id;renderSheet()},
  tmood:d=>{SH.mood=SH.mood==d.id?0:+d.id;renderSheet()},
  saveTime:d=>{S.time.push({id:uid(),d:today(),vid:d.vid||"",min:SH.min,mood:SH.mood||null});S.time=S.time.slice(-400);save();closeSheet();buzz("ok");
    const b=balance();toast(b.state==="zieht"?"Eingetragen. Für diese Woche ist dein Rahmen erreicht.":"Eingetragen.",null,true)},
  saveRun:d=>{const v=vById(d.id);v.runs.push({id:uid(),d:$("#r-d").value||today(),umsatz:n0($("#r-u").value),kosten:n0($("#r-k").value),meineStd:n0($("#r-m").value),teamStd:n0($("#r-t").value),note:$("#r-n").value.trim()});save();backTo("venture",{vid:v.id,sub:"laeufe"});buzz("ok");toast("Lauf abgerechnet.",null,true)},
  delRun:d=>{const v=vById(d.id),sn=snapshot();v.runs=v.runs.filter(r=>r.id!==d.rid);save();renderSheet();render();toast("Lauf gelöscht.",sn)},
  mform:d=>{SH.form=d.id;const keep={n:$("#m-n").value,l:$("#m-l").value};renderSheet();$("#m-n").value=keep.n;$("#m-l").value=keep.l},
  saveMember:d=>{const v=vById(d.id),nm=$("#m-n").value.trim();if(!nm){buzz("err");toast("Gib einen Namen oder eine Rolle ein.");return}
    const fm=SH.form||"kurz";v.team.push({id:uid(),name:nm,form:fm,lohn:n0($("#m-l").value)});if(v.solo)v.solo=false;
    if(fm==="kurz"||fm==="mini"){v.calc.form=fm;const emp=v.team.filter(m=>m.form==="kurz"||m.form==="mini");v.calc.lohn=Math.round(emp.reduce((a,m)=>a+n0(m.lohn),0)/emp.length*100)/100}
    save();backTo("venture",{vid:v.id,sub:"team"});buzz("ok");toast(nm+" führt jetzt mit.",null,true)},
  delMember:d=>{const v=vById(d.id),sn=snapshot();v.team=v.team.filter(m=>m.id!==d.mid);save();renderSheet();render();toast("Entfernt.",sn)},
  solo:d=>{const v=vById(d.id);v.solo=!v.solo;save();renderSheet();render()},
  exitArt:d=>{SH.art=d.id;const v=vById(SH.vid);v.exitArt=d.id;save();renderSheet()},
  doExit:d=>{const v0=vById(d.id);if(stage(v0)<7&&!SH.exitAsk){SH.exitAsk=true;renderSheet();const b=$("[data-a=doExit]");if(b)b.scrollIntoView({block:"center"});return}
    const v=vById(d.id),sn=snapshot(),pi=$("#x-preis"),an=$("#x-an");v.exit={d:today(),art:d.art,preis:pi?n0(pi.value):0,an:an?an.value.trim():""};save();closeSheet();setTab("home");buzz("ok");toast("„"+v.name+"“ ist weitergegeben.",sn,true)},
  addPerson:()=>{const i=$("#p-n"),nm=(i.value||"").trim();if(!nm)return;S.people.push({id:uid(),name:nm,last:"",added:today()});save();renderSheet();render();setTimeout(()=>{const x=$("#p-n");if(x)x.focus()},30)},
  delPerson:d=>{const sn=snapshot();S.people=S.people.filter(p=>p.id!==d.id);save();renderSheet();render();toast("Entfernt.",sn)},
  addWert:()=>{const i=$("#w-n"),w=(i.value||"").trim();if(!w||S.werte.includes(w))return;S.werte.push(w);save();renderSheet();render()},
  delWert:d=>{const sn=snapshot();S.werte.splice(+d.id,1);save();renderSheet();render();toast("Entfernt.",sn)},
  tag:d=>{const x=+d.id,t=S.prof.tage;S.prof.tage=t.includes(x)?t.filter(y=>y!==x):[...t,x];save();render();if(SH)renderSheet()},
  std:d=>{S.prof.stunden=+d.id;save();render();if(SH)renderSheet()},
  wmit:d=>{const w=SH.w;w.mit=w.mit.includes(d.id)?w.mit.filter(x=>x!==d.id):[...w.mit,d.id];w.weg=$("#w-weg").value;renderSheet()},
  wkraft:d=>{SH.w.kraft=d.id;SH.w.weg=$("#w-weg").value;renderSheet()},
  saveWeek:()=>{const w=SH.w;w.weg=$("#w-weg").value.trim();w.mit.forEach(id=>{const p=S.people.find(x=>x.id===id);if(p&&(!p.last||p.last<today()))p.last=today()});S.weeks.push({d:today(),kraft:w.kraft,weg:w.weg,mit:w.mit});save();closeSheet();buzz("ok");
    toast(w.kraft==="nahm"?"Notiert. Vielleicht ist ein Vorhaben reif zum Weitergeben.":"Wochenblick gespeichert.",null,true)},
  theme:d=>{S.settings.theme=d.id;applyTheme();save();renderSheet()},
  vib:()=>{S.settings.vib=!S.settings.vib;save();renderSheet()},
  export:()=>openSheet("exportv"),
  exportFile:()=>{try{const b=new Blob([JSON.stringify(S,null,1)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="nebenexistenz-"+today()+".json";document.body.appendChild(a);a.click();a.remove()}catch(e){toast("Das ging nicht. Nutze „Sicherung kopieren“.")}},
  doImport:async()=>{let tx=($("#f-imp").value||"").trim();const f=$("#f-impfile").files[0];if(!tx&&f)tx=await f.text();
    try{const o=JSON.parse(tx);if(!o||typeof o!=="object"||!("prof" in o))throw 0;const sn=snapshot();S=deepMerge(fresh(),o);migrate();save();closeSheet();applyTheme();render();buzz("ok");toast("Sicherung geladen.",sn,true)}catch(e){buzz("err");toast("Das ist keine gültige Sicherung.")}},
  reset1:()=>{SH.reset=true;renderSheet()},
  reset2:()=>{S=fresh();persist();try{localStorage.removeItem(KEY+"-eigen")}catch(e){}closeSheet();applyTheme();render();openSheet("welcome")},
  undo:()=>{if(!undoSnap)return;S=undoSnap;undoSnap=null;persist();$("#toast").classList.remove("on");if(SH)renderSheet();render()},
  logo:(d,el)=>{el.classList.add("spin");setTimeout(()=>el.classList.remove("spin"),520);if(SH)closeSheet();setTab("home")}
};
function copyText(tx,src){
  const done=()=>{buzz("ok");toast("Kopiert.",null,true)};
  try{navigator.clipboard.writeText(tx).then(done,()=>fallback())}catch(e){fallback()}
  function fallback(){try{const r=document.createRange();if(src&&src.select){src.select()}else if(src){r.selectNodeContents(src);const s=getSelection();s.removeAllRanges();s.addRange(r)}document.execCommand&&document.execCommand("copy");toast("Markiert. Jetzt kopieren.")}catch(e){}}
}

/* ---------- Beispiel ---------- */
function loadDemo(){
  const keep=S.settings; S=fresh(); S.settings=keep; S.demo=true; S.onb=true;
  const d=k=>{const x=new Date();x.setDate(x.getDate()-k);return x.toISOString().slice(0,10)};
  S.prof={land:"SN",ort:"Leipzig",beruf:"ang",netto:2900,fix:2100,ruecklage:30000,stunden:4,tage:[2,6]};
  S.pduties={ag:d(40),fse:d(30),ku:d(30),kasse:d(28),bg:d(30)};
  S.werte=["Gerechtigkeit","Nachhaltigkeit","Freiheit"];
  S.people=[{id:"p1",name:"Mia",last:d(2)},{id:"p2",name:"Jonas",last:d(5)},{id:"p3",name:"Mama",last:d(19)},{id:"p4",name:"Ali",last:d(9)}];
  const t=VORLAGEN[0];
  S.ventures=[{id:"v1",tpl:"markt",name:"Wachs & Docht",desc:"Bienenwachstücher und Kerzen auf zwei Leipziger Weihnachtsmärkten",created:d(60),passOk:d(50),
    calc:Object.assign({},t.calc,{form:"kurz",laeufe:24,start:1800,inventar:1200}),
    duties:{gew:d(35),haft:d(33),platz:d(45),gpsr:d(20),lucid:d(25)},prod:"Bienenwachstücher in drei Größen und Rapskerzen, gefertigt von einer Werkstatt für Menschen mit Behinderung in Leipzig-Grünau.",
    team:[{id:"m1",name:"Standleitung Jana",form:"kurz",lohn:16}],runs:[{id:"r1",d:d(3),umsatz:590,kosten:445,meineStd:1.5,teamStd:12,note:"Regen am Nachmittag"}],
    results:[],werte:{Gerechtigkeit:"passt",Nachhaltigkeit:"passt",Freiheit:"teils"},bio:{mat:"ja",weg:"ja",pack:"teils",halt:"ja",rest:"teils"}},
   {id:"v2",tpl:"verleih",name:"Lastenrad Ost",desc:"Ein Lastenrad und ein Anhänger zum Leihen im Leipziger Osten",created:d(12),
    calc:Object.assign({},VORLAGEN[2].calc,{form:"kurz",laeufe:12,start:2600,inventar:0}),duties:{},prod:"",team:[],runs:[],results:[],werte:{},bio:{}}];
  S.time=[{id:"t1",d:d(1),vid:"v1",min:45,mood:4},{id:"t2",d:d(4),vid:"v2",min:60,mood:3}];
  S.weeks=[{d:d(1),kraft:"gab",weg:"Abends keine Mails",mit:["p1","p2"]}];
  S.seen={first:1,amt:1,lauf:1}; S.lv={v1:6,v2:1}; S.fresh=[]; S.mq=[];
}

/* ---------- Theme, Aktualisierung, Start ---------- */
function applyTheme(){const t=S.settings.theme;if(t==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme",t)}
function busy(){const a=document.activeElement;return !!SH||(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))}
function checkUpdate(){
  if(!/github\.io$/.test(location.hostname)) return;
  fetch(location.pathname,{cache:"reload"}).then(r=>r.text()).then(t=>{const m=t.match(/const BUILD="([^"]+)"/);if(!m||m[1]===BUILD)return;
    const go=()=>{if(busy()){setTimeout(go,4000);return}location.reload()};go()}).catch(()=>{});
}
function countOpen(){const t=today();if(S.opens.d===t)S.opens.n++;else S.opens={d:t,n:1};persist()}
addEventListener("popstate",()=>{
  if(backPending){backPending=false;const f=deferred;deferred=null;if(f)f();return}
  if(!SH) return;
  if(STACK.length){backSheet();try{history.pushState({sheet:1},"")}catch(e){}} else closeSheet(true)});
addEventListener("resize",moveDot);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){countOpen();checkUpdate();if(!SH)render()}});

/* Herunterziehen am Griff schließt den Bogen */
(function(){let y0=null,dy=0;const g=()=>$("#sheet .grip");
  document.addEventListener("pointerdown",e=>{if(e.target.closest(".grip")){y0=e.clientY;dy=0;$("#sheet").style.transition="none"}});
  document.addEventListener("pointermove",e=>{if(y0==null)return;dy=Math.max(0,e.clientY-y0);$("#sheet").style.transform=`translateY(${dy}px)`});
  document.addEventListener("pointerup",()=>{if(y0==null)return;const s=$("#sheet");s.style.transition="";s.style.transform="";y0=null;if(dy>90)closeSheet()});
})();

function boot(){
  document.documentElement.lang="de";
  load(); applyTheme(); countOpen();
  if(!S.prof.tage) S.prof.tage=[2,6];
  const h=(location.hash||"").slice(1); if(TABS.some(t=>t[0]===h)) S.tab=h;
  render();
  if(!S.onb) openSheet("welcome"); else setTimeout(showMoment,900);
  setTimeout(checkUpdate,1500);
  if("serviceWorker" in navigator&&location.protocol==="https:"&&!IN_FRAME&&/github\.io$/.test(location.hostname)){navigator.serviceWorker.register("sw.js").catch(()=>{})}
}
boot();
