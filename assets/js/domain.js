/* MODA TMS Planning - shared domain logic (window.DOM). Pure-ish: reads STORE and MD, never renders. */
(function(){
'use strict';
const PARAM_DEFAULT={avgSpeed:40,speedOverride:{Fuso:45,Tronton:50},
 tollClass:{Blindvan:'Gol I',Hiace:'Gol I',CDE:'Gol II',CDD:'Gol II',Fuso:'Gol II',Tronton:'Gol III',Trailer:'Gol V'},
 turnaround:15,reportLead:60,dutyMax:12,restMin:8,minGapWd:15,minGapFri:10,shiftDay:'06:00',shiftNight:'18:00',addTco:5,liqVol:0.92,roadFactor:1.3,
 cutoff:'16:00',waterfallMin:30,noShowGrace:15,tenkoSys:120,tenkoDia:80,tempMin:36,tempMax:37,docWarn:14,replSlaH0:30,replSlaH1:240,excSlaH0:15,longhaulH:24,drivingBlock:4,restBreak:30,recheckGap:4,combineAcrossCustomer:false,availExpiry:24};
const REASONS=[
 {code:'DRV-UNFIT',label:'Unfit',lock:true,kind:'Driver'},{code:'DRV-SIM-EXP',label:'SIM expired',lock:true,kind:'Driver'},
 {code:'UNT-STNK-EXP',label:'STNK expired',lock:true,kind:'Unit'},{code:'UNT-KIR-EXP',label:'KIR expired',lock:true,kind:'Unit'},
 {code:'DRV-DUTY-12H',label:'Over 12h',lock:true,kind:'Driver'},{code:'DRV-REST-8H',label:'Rest < 8h',lock:true,kind:'Driver'},
 {code:'DRV-LEAVE',label:'On leave',lock:true,kind:'Driver'},{code:'DRV-SICK',label:'Sick',lock:true,kind:'Driver'},
 {code:'DRV-ABSENT',label:'Absent',lock:true,kind:'Driver'},{code:'DRV-UNREACH',label:'Unreachable',lock:true,kind:'Driver'},
 {code:'DRV-LATE',label:'Late attendance',lock:false,kind:'Driver'},{code:'DRV-APP',label:'Driver Apps off',lock:false,kind:'Driver'},
 {code:'DRV-MISSING',label:'No driver',lock:true,kind:'Driver'},{code:'P2H-CRIT',label:'P2H Critical',lock:false,kind:'Unit'},
 {code:'UNT-NA',label:'Unit not available',lock:true,kind:'Unit'},{code:'VND-NOT-CONFIRMED',label:'Vendor not confirmed',lock:true,kind:'Vendor'},
 {code:'DOC-EXPIRING',label:'Document expiring',lock:false,kind:'Unit'},
 {code:'POOL-UNIT',label:'Unit pool short',lock:false,kind:'Unit'},{code:'POOL-DRV',label:'Driver pool short',lock:false,kind:'Driver'}];
function params(){const p=STORE.get('params');return Object.assign({},PARAM_DEFAULT,p&&typeof p==='object'&&!Array.isArray(p)?p:{});}
function reasons(){const r=STORE.get('reasonCodes');return Array.isArray(r)&&r.length?r:REASONS;}
function reason(code){return reasons().find(r=>r.code===code)||{code,label:code,lock:false};}
function speedFor(ch){const p=params();return +(p.speedOverride&&p.speedOverride[ch])||+p.avgSpeed||40;}
function tollClass(ch){const p=params();if(ch==='Trailer')return 'Gol V';return (p.tollClass||{})[ch]||null;}
function cutoffMin(){return UI.parseHM(params().cutoff)||960;}
/* ---------- Toll Tariff lookup: key Entry x Exit x Gol, effective date <= date, latest wins ---------- */
function tariff(entry,exit,gol,date){const rows=STORE.get('tollTariff').filter(r=>r.entry===entry&&r.exit===exit&&r.gol===gol&&r.eff<=date&&r.status!=='Inactive');
 rows.sort((a,b)=>b.eff.localeCompare(a.eff));return rows[0]||null;}
/* toll evaluation for a set of pairs */
function tollEval(toll,chassis,date){
 toll=toll||{cond:null,pairs:[]};const gol=tollClass(chassis);const out={cond:toll.cond,gol,pairs:[],total:0,src:null,eff:null,missing:false,unavail:false,suggested:false,manual:false,noCond:!toll.cond,notMapped:!gol};
 if(toll.cond==='none'||!toll.cond)return out;
 (toll.pairs||[]).forEach((p,i)=>{const r={i,entry:p.entry,exit:p.exit,status:p.status||'confirmed',manual:p.manual,reason:p.reason,amt:null,eff:null,state:'ok'};
  if(!p.entry||!p.exit){r.state='missing';out.missing=true;}
  else if(p.entry===p.exit){r.state='same';out.missing=true;}
  else if(r.status==='suggested'){r.state='suggested';out.suggested=true;const t=gol&&tariff(p.entry,p.exit,gol,date);r.amt=t?t.tariff:null;r.eff=t?t.eff:null;}
  else{const t=gol&&tariff(p.entry,p.exit,gol,date);
   if(p.manual!=null&&p.manual!==''&&(p.useManual||!t)){r.amt=+p.manual;r.state='manual';out.manual=true;}
   else if(t){r.amt=t.tariff;r.eff=t.eff;r.state='table';if(!out.eff||t.eff>out.eff)out.eff=t.eff;}
   else{r.state='unavail';out.unavail=true;}
   if(r.amt!=null&&r.state!=='suggested')out.total+=r.amt;}
  out.pairs.push(r);});
 const confirmed=out.pairs.filter(p=>p.state!=='suggested'&&p.state!=='missing'&&p.state!=='same');
 if(!confirmed.length)out.missing=true;
 out.src=out.manual?'manual':out.unavail?'unavail':out.eff?'table':null;
 return out;}
/* ---------- Trip Cost (UJ) and Incentive recommendation ---------- */
function slLevel(sl){return sl==='Express'?'Express':'Standard';}
function inTier(r,km,minK,maxK){const a=+r[minK]||0,b=(r[maxK]===''||r[maxK]==null)?Infinity:+r[maxK];return km>=a&&km<b;}
function pickSla(rows,sla){const x=rows.filter(r=>(r.sla||'Standard')===sla);return x.length?x:rows.filter(r=>(r.sla||'Standard')==='Standard');}
function cost(o){
 const md=MD.get();const sla=slLevel(o.sl);const km=Math.round(o.km||0);const rec=[];const flags=[];
 /* BBM: loaded legs at loaded ratio, empty legs at empty ratio */
 const fr=pickSla(md.tc.tc_bbm.filter(r=>r.chassis===o.chassis),sla);
 /* Master Data rule: fuel ratio per Chassis + Body Type + Tonase. Exact row first, then same tonase, then same body; otherwise the nearest tonase of that chassis, shown as such in the basis (never a silent first row) */
 const tonO=+o.ton||0;let near=false;let f=fr.find(r=>r.body===o.body&&+r.tonase===tonO)||fr.find(r=>tonO&&+r.tonase===tonO)||fr.find(r=>r.body===o.body);
 if(!f&&fr.length){f=tonO?fr.slice().sort((a,b)=>Math.abs((+a.tonase||0)-tonO)-Math.abs((+b.tonase||0)-tonO))[0]:fr[0];near=!!tonO;}
 let bbm=0,bbmTxt=km+' km';if(f){const price=(md.fuel&&md.fuel[f.bbm])||+f.harga||6800;const ri=+f.ratioIsi||5,re=+f.ratioKosong||6,lk=Math.round(o.loadedKm!=null?o.loadedKm:km*0.5),ek=Math.round(o.emptyKm!=null?o.emptyKm:km*0.5);const li=lk/ri+ek/re;bbm=Math.round(li*price/100)*100;bbmTxt='('+lk+' km / '+ri+' km/L + '+ek+' km / '+re+' km/L) x Rp '+UI.num(price)+'/L';}else flags.push('No fuel ratio');
 rec.push({k:'BBM',basis:bbmTxt,amt:bbm,miss:!f});
 const tl=o.vendor?null:tollEval(o.toll,o.chassis,o.date);
 rec.push({k:'Tol',toll:tl,amt:tl?tl.total:0});
 const mel=pickSla(md.tc.tc_mel,sla).find(r=>inTier(r,km,'min','max'));
 rec.push({k:'Mel',basis:mel?('Tier '+(+mel.min)+(mel.max!==''&&mel.max!=null?' - '+(+mel.max):'+')+' km'):'No rate in master',amt:mel?+mel.cost:0,miss:!mel});
 const cat=km<200?'City-to-City':'Longhaul';const pk=pickSla(md.tc.tc_parkir.filter(r=>r.kategori===cat),sla).find(r=>inTier(r,km,'min','max'));
 rec.push({k:'Parkir',basis:pk?('Tier '+(+pk.min)+(pk.max!==''&&pk.max!=null?' - '+(+pk.max):'+')+' km'):'No rate in master',amt:pk?+pk.cost:0,miss:!pk});
 const crew=o.crew||{driver:1,addDriver:0,helper:0};const nCrew=(crew.driver||1)+(crew.addDriver||0)+(crew.helper||0);
 const meal=pickSla(md.tc.tc_makan,sla);const mD=(meal.find(r=>r.crew==='Driver')||{}).nominal||0,mH=(meal.find(r=>r.crew==='Helper')||{}).nominal||mD;
 const blocks=Math.max(1,Math.ceil((o.durationMin||480)/480));
 const makan=blocks*((crew.driver||1)*mD+(crew.addDriver||0)*mD+(crew.helper||0)*mH);
 rec.push({k:'Uang makan',basis:nCrew+' crew'+(blocks>1?' x '+blocks:''),amt:makan});
 if(o.ujOverride)rec.forEach(r=>{const v=o.ujOverride[r.k];if(v!=null&&r.k!=='Tol'){r.auto=r.amt;r.amt=+v;r.edited=true;r.miss=false;}});/* the planner may overwrite a component of the Uang Jalan */
 const recTotal=rec.reduce((a,r)=>a+(r.amt||0),0);
 const adds=o.additions||[];const addTotal=adds.reduce((a,x)=>a+(+x.amt||0),0);
 /* Incentive (IN1 / FR-29): per person, helper & additional driver = driver rate */
 const ptype=o.ptype==='Milkrun'?'Milkrun':(o.sl==='Express'?'Express':o.ptype);
 const incRows=md.incentive.filter(r=>r.ptype===ptype);
 const mapped=incRows.filter(r=>o.project&&(r.projects||'').split(',').map(s=>s.trim()).indexOf(o.project)>=0);const base=mapped.length?mapped:incRows;
 const daily=base.find(r=>r.jenis==='Daily');const trip=base.find(r=>r.jenis==='Trip/DO/Route'&&inTier(r,km,'kmMin','kmMax'));
 const drv=(daily?+daily.nominal:0)+(trip?+trip.nominal:0);
 const incBasis=ptype==='Milkrun'?'Milkrun, daily'+(trip?' + trip':''):ptype==='Express'?'Express':(o.ptype+', '+(o.sl||'Regular'));
 const inc=[{k:'Driver',basis:incBasis,amt:drv,noRate:!daily&&!trip}];
 if(crew.addDriver)inc.push({k:'Additional Driver',basis:'Driver rate',amt:drv*crew.addDriver,noRate:!drv});
 if(crew.helper)inc.push({k:'Helper'+(crew.helper>1?' x'+crew.helper:''),basis:'Driver rate'+(crew.helper>1?' x '+crew.helper:''),amt:drv*crew.helper,noRate:!drv});
 return {rec,recTotal,adds,addTotal,total:recTotal+addTotal,inc,incTotal:inc.reduce((a,r)=>a+r.amt,0),toll:tl,flags,crew,sl:o.sl||'Regular',km};}
/* ---------- operating hours / day groups (D66) ---------- */
const DG=[['wd','Mon - Thu'],['fri','Friday'],['we','Weekend']];
function hours(project,dg){if(!project||!project.hours)return null;const h=project.hours;if(dg==='fri')return h.fri||h.wd||null;return h[dg]||null;}
function win(project,dg){const h=hours(project,dg);return h?[UI.parseHM(h[0]),UI.parseHM(h[1])]:null;}
function operating(project,date){return !!hours(project,UI.dayGroup(date));}
/* ---------- Milkrun: reference + plan -> engine input ---------- */
/* D88: no versions. refOf(projectId, plan) reads the plan's own snapshot (frozen at Publish); without a plan (or a plan that has no snapshot yet) it reads the live reference. */
function refOf(projectId,plan){if(plan&&typeof plan==='object'&&plan.refSnap)return plan.refSnap;return REF.view(projectId);}
function planRoutes(plan,dg){
 const ref=refOf(plan.projectId,plan);if(!ref)return [];const p=params();
 return ref.routeGroups.map(g=>{
  const rows=(plan.matrix||[]).filter(m=>m.route===g.id&&!m.excluded);
  const volDay=rows.reduce((a,m)=>a+(+m.volDay||0),0);const volIncl=volDay*(1+p.addTco/100);
  const fromMatrix=rows.reduce((a,m)=>Math.max(a,(m.trips||[]).filter(Boolean).length),0);
  const auto=Math.max(1,Math.ceil(volIncl/(g.cap||22)));
  const base=plan.inputType==='A'?(fromMatrix||auto):auto;
  const ov=plan.cycles&&plan.cycles[g.id];const N=ov&&ov[dg]!=null?ov[dg]:(ov&&ov.all!=null?ov.all:base);
  const stops=g.stops.map(s=>{const L=MD.location(s.loc)||{};const sv=rows.filter(m=>m.supplier===s.loc).reduce((a,m)=>a+(+m.volDay||0),0);return {loc:s.loc,km:s.km,fixht:L.fixht!=null?L.fixht:10,buffer:L.buffer!=null?L.buffer:5,addht:L.addht||0,volDay:sv};});
  const C=MD.location(g.cust)||{};
  return {id:g.id,name:g.name,vehicle:{chassis:g.chassis,body:g.body,cap:g.cap},cap:g.cap,heijunka:g.heijunka||null,stagger:g.stagger||0,stops,cust:{loc:g.cust,km:g.custKm,fixht:C.fixht!=null?C.fixht:30,buffer:C.buffer!=null?C.buffer:15,addht:0},returnKm:g.returnKm,cycles:N,baseCycles:base,volDay,volIncl,volCycle:volIncl/N};});}
/* FR-17: candidate order is stable by creation order / Allocation ID ascending (numeric part). No poolOrder. */
function allocSeq(a){const m=/(\d+)\s*$/.exec(String((a&&a.id)||''));return m?+m[1]:0;}
function byAllocSeq(x,y){return allocSeq(x)-allocSeq(y);}
function allocUnits(projectCode){const a=STORE.get('allocations').filter(x=>x.project===projectCode&&x.kind==='unit'&&x.status!=='Released');const out={};
 a.sort(byAllocSeq).forEach(x=>{const v=MD.vehicle(x.plate);if(!v)return;const k=v.chassis+' '+v.body;(out[k]=out[k]||[]).push(v.plate);});return out;}
function allocDrivers(projectCode){return STORE.get('allocations').filter(x=>x.project===projectCode&&x.kind==='driver'&&x.status!=='Released');}
const SCH_CACHE={};
function planSchedule(plan,dg,o){
 const pr=MD.project(plan.projectId);const w=win(pr,dg);if(!w)return null;const p=params();
 const routes=planRoutes(plan,dg);const alloc=allocUnits(pr.code);
 const key=JSON.stringify([plan.id,plan.updatedAt,dg,routes.map(r=>[r.cycles,r.volDay]),plan.edits&&plan.edits[dg],alloc,o&&o.extra]);
 if(SCH_CACHE[key]&&!(o&&o.fresh))return SCH_CACHE[key];
 const input={routes,window:w,edits:(plan.edits&&plan.edits[dg])||{},alloc,allocDrivers:allocDrivers(pr.code).length,
  params:{turnaround:p.turnaround,reportLead:p.reportLead,dutyMax:p.dutyMax*60,restMin:p.restMin*60,minGap:dg==='fri'?p.minGapFri:p.minGapWd,shiftDay:[UI.parseHM(p.shiftDay),UI.parseHM(p.shiftNight)],speedFor}};
 if(o&&o.mutate)o.mutate(input);
 const s=CHAIN.schedule(input);s.window=w;s.dg=dg;s.project=pr;s.routesIn=routes;
 /* D81 + §12.4: slot labels (Unit A, B... / Driver A, B...) are presentation of the U1-U3 / D1-D4 result.
    Labels are route-local (each Route Group numbers its own combination); slotUnitKey / slotDriverKey carry the physical
    slot identity from chaining, used for H-1 resolution. */
 s.unitSlot=unitLabels(s);
 s.unitSlotByRoute=routeSlotLabels(s,'unit');s.driverSlotByRoute=routeSlotLabels(s,'driver');
 s.cycles.forEach(c=>{const ur=s.unitSlotByRoute[c.route]||{},dr=s.driverSlotByRoute[c.route]||{};
  c.slotUnit=c.unit?(ur[c.unit]||s.unitSlot[c.unit]):null;c.slotDriver=c.driver?(dr[c.driver]||drvLabel(c.driver)):null;
  /* identity = the physical slot from chaining: a unit / driver that returns to the pool and takes a later cycle of another route stays ONE slot (one real unit / driver at H-1); labels stay route-local */
  c.slotUnitKey=c.unit?'U|'+c.unit:null;c.slotDriverKey=c.driver?'D|'+c.driver:null;});
 SCH_CACHE[key]=s;return s;}
/* §12.4: labels are assigned inside one Route Group only (order of first appearance on that route) */
function routeSlotLabels(sch,kind){
 const out={};
 sch.routes.forEach(r=>{const m={};
  if(kind==='unit'){const list=sch.units.filter(u=>u.cycles.some(c=>c.route===r.id)).slice().sort((a,b)=>Math.min.apply(null,a.cycles.filter(c=>c.route===r.id).map(c=>c.out))-Math.min.apply(null,b.cycles.filter(c=>c.route===r.id).map(c=>c.out))||String(a.plate).localeCompare(String(b.plate)));
   list.forEach((u,i)=>{m[u.plate]='Unit '+slotLetter(i);});}
  else{const list=sch.drivers.filter(d=>d.cycles.some(c=>c.route===r.id)).slice().sort((a,b)=>a.start-b.start||String(a.id).localeCompare(String(b.id)));
   list.forEach((d,i)=>{m[d.id]='Driver '+slotLetter(i);});}
  out[r.id]=m;});
 return out;}
/* ---------- slots: a slot is the engine result (Unit A, Driver A), a real unit / driver is resolved at H-1 ---------- */
function slotLetter(i){let s='';i=i|0;do{s=String.fromCharCode(65+i%26)+s;i=Math.floor(i/26)-1;}while(i>=0);return s;}
function drvLabel(id){const n=parseInt(String(id).replace(/\D/g,''),10);return 'Driver '+slotLetter((isNaN(n)||n<1?1:n)-1);}
function unitLabels(sch){const m={};sch.units.slice().sort((a,b)=>Math.min.apply(null,a.cycles.map(c=>c.out))-Math.min.apply(null,b.cycles.map(c=>c.out))||String(a.vt).localeCompare(String(b.vt))||String(a.plate).localeCompare(String(b.plate))).forEach((u,i)=>{m[u.plate]='Unit '+slotLetter(i);});return m;}
function unitLabel(sch,plate){if(!plate)return '-';if(sch.unitSlot[plate])return sch.unitSlot[plate];sch.extraSlot=sch.extraSlot||{};if(!sch.extraSlot[plate])sch.extraSlot[plate]='Unit '+slotLetter(sch.units.length+Object.keys(sch.extraSlot).length);return sch.extraSlot[plate];}
/* route-local display label for the same physical slot (used by the Step 5 selects) */
function unitLabelFor(sch,route,plate){const m=sch.unitSlotByRoute&&sch.unitSlotByRoute[route];return (m&&m[plate])||unitLabel(sch,plate);}
function driverLabelFor(sch,route,id){const m=sch.driverSlotByRoute&&sch.driverSlotByRoute[route];return (m&&m[id])||drvLabel(id);}
/* per-route identity key carried by trips; falls back to the legacy global label for old seed rows */
function slotKeyOf(t,kind){return (kind==='driver'?t.slotDriverKey:t.slotUnitKey)||((t.route?t.route+'|':'')+(kind==='driver'?t.slotDriver:t.slotUnit));}
function slotFields(c){return {slotUnit:c.slotUnit||null,slotDriver:c.slotDriver||null,slotUnitKey:c.slotUnitKey||null,slotDriverKey:c.slotDriverKey||null,vt:c.vtype};}
function resolved(t){return !!(t.unit&&t.driver);}
/* slot counts vs allocation per Category + Karoseri (Resource & Review) */
function resourceByType(sch){const alloc=allocUnits(sch.project.code);const used={};sch.units.forEach(u=>{used[u.vt]=(used[u.vt]||0)+1;});
 return Array.from(new Set(Object.keys(alloc).concat(Object.keys(used)))).map(vt=>({vt,slots:used[vt]||0,alloc:(alloc[vt]||[]).length}));}
function unitWhy(plate,date){const v=MD.vehicle(plate);if(!v)return 'Unknown unit';
 const ust=STORE.get('unitStatus').filter(s=>s.plate===plate&&s.from<=date&&(!s.to||s.to>=date)).sort((a,b)=>b.at-a.at)[0];
 const mr=STORE.get('maintenance').find(m=>m.plate===plate&&m.status==='Open'&&m.severity==='Critical'&&m.date<=date);
 if(ust?ust.status==='Not Available':(mr||v.opStatus==='Maintenance'))return 'Maintenance';
 if(v.stnkExp&&v.stnkExp<date)return 'STNK expired';if(v.kirExp&&v.kirExp<date)return 'KIR expired';return '';}
function driverWhy(id,date){const d=MD.driver(id);if(!d)return 'Unknown driver';if(d.status&&d.status!=='Active')return 'Inactive';if(onLeave(id,date))return 'On leave';if(d.simExp&&d.simExp<date)return 'SIM expired';return '';}
/* can real unit `plate` serve every cycle of the slot (list = trips of that slot on the date)? '' = yes, else the reason */
function unitFits(plate,list,taken){const t0=list[0],date=t0.date;const v=MD.vehicle(plate);if(!v)return 'Unknown unit';if(t0.vt&&(v.chassis+' '+v.body)!==t0.vt)return 'Other type';
 if(taken&&taken.has(plate))return 'Used by another slot';const w=unitWhy(plate,date);if(w)return w;
 const ids=new Set(list.map(x=>x.id)),turn=params().turnaround;
 const b=STORE.get('trips').filter(x=>x.unit===plate&&x.date===date&&!ids.has(x.id)&&!/Skipped|Cancelled/.test(x.status)).find(x=>list.some(t=>x.out<tripEnd(t)+turn&&t.out<tripEnd(x)+turn));
 return b?'On '+(b.route?b.route+'-'+b.cycle:b.id):'';}
function driverFits(id,list,taken){const date=list[0].date;if(taken&&taken.has(id))return 'Used by another slot';const w=driverWhy(id,date);if(w)return w;
 const p=params(),ids=new Set(list.map(x=>x.id));const oth=driverDay(id,date).trips.filter(x=>!ids.has(x.id));
 if(oth.some(x=>list.some(t=>x.out<tripEnd(t)+p.turnaround&&t.out<tripEnd(x)+p.turnaround)))return 'Busy';
 const all=list.concat(oth);const st=Math.min.apply(null,all.map(x=>x.out-p.reportLead)),en=Math.max.apply(null,all.map(tripEnd));
 if(en-st>p.dutyMax*60)return 'Over 12h';if(restBefore(id,date,st)<p.restMin*60)return 'Rest < 8h';return '';}
/* pool-level prediction for a trip whose unit / driver is not resolved yet (before H-1) */
function poolPredict(t){const day=STORE.get('trips').filter(x=>x.type==='MR'&&x.date===t.date&&x.project===t.project&&!/Skipped|Cancelled/.test(x.status));
 const uNeed=new Set(day.filter(x=>x.vt===t.vt&&x.slotUnit).map(x=>slotKeyOf(x,'unit'))).size,dNeed=new Set(day.filter(x=>x.slotDriver).map(x=>slotKeyOf(x,'driver'))).size;
 const uAv=(allocUnits(t.project)[t.vt]||[]).filter(pl=>!unitWhy(pl,t.date)).length,dAv=allocDrivers(t.project).filter(a=>!driverWhy(a.driver,t.date)).length;
 return {unit:{need:uNeed,avail:uAv,vt:t.vt},driver:{need:dNeed,avail:dAv}};}
/* Suggest assignment (H-1): proposes a real unit / driver for each unresolved slot of one day.
   Order of candidates: mapping of the previous day if still valid, then the project allocation pool, then replacement pool (Readiness FR-20).
   Valid = available, docs valid, not on leave, no overlap, duty <= 12h, rest >= 8h. One slot = one real unit / driver for all its cycles. */
function suggestDay(list){const act=list.filter(t=>t.slotUnit&&!/Skipped|Cancelled|Released|Converted/.test(t.status));const out={assign:[],missing:[]};if(!act.length)return out;
 const date=act[0].date,project=act[0].project;const U={},D={};act.forEach(t=>{const ku=slotKeyOf(t,'unit');(U[ku]=U[ku]||[]).push(t);if(t.slotDriver){const kd=slotKeyOf(t,'driver');(D[kd]=D[kd]||[]).push(t);}});
 const takenU=new Set(act.filter(t=>t.unit).map(t=>t.unit)),takenD=new Set(act.filter(t=>t.driver).map(t=>t.driver));
 const prev=STORE.get('trips').filter(t=>t.type==='MR'&&t.date===UI.addDays(date,-1)&&t.project===project&&!/Skipped|Cancelled/.test(t.status));
 const ord=(a,b)=>a.length-b.length||a.localeCompare(b);
 const uniq=a=>a.filter((x,i)=>x.id&&a.findIndex(y=>y.id===x.id)===i);
 const aDr=allocDrivers(project).slice().sort((a,b)=>(a.role===b.role?0:a.role==='Default'?-1:1)||byAllocSeq(a,b)).map(a=>a.driver);
 Object.keys(U).sort(ord).forEach(key=>{const L=U[key];if(L.every(t=>t.unit))return;const slot=L[0].slotUnit,vt=L[0].vt;const have=L.map(t=>t.unit).filter(Boolean)[0];if(have)takenU.delete(have);
  const pv=prev.find(t=>slotKeyOf(t,'unit')===key&&t.vt===vt&&t.unit);
  const cands=uniq([].concat(have?[{id:have,src:'Kept'}]:[],pv?[{id:pv.unit,src:'Previous day'}]:[],(allocUnits(project)[vt]||[]).map(id=>({id,src:'Project pool'})),MD.get().vehicles.filter(v=>v.group==='POOL'&&(v.chassis+' '+v.body)===vt).map(v=>({id:v.plate,src:'Replacement pool'}))));
  const hit=cands.find(c=>!unitFits(c.id,L,takenU));
  if(hit){takenU.add(hit.id);out.assign.push({kind:'unit',slot,key,id:hit.id,src:hit.src,vt,ids:L.map(t=>t.id)});}else{if(have)takenU.add(have);out.missing.push({kind:'unit',slot,key,vt,ids:L.map(t=>t.id)});}});
 Object.keys(D).sort(ord).forEach(key=>{const L=D[key];if(L.every(t=>t.driver))return;const slot=L[0].slotDriver;const have=L.map(t=>t.driver).filter(Boolean)[0];if(have)takenD.delete(have);
  const pv=prev.find(t=>slotKeyOf(t,'driver')===key&&t.driver);
  const cands=uniq([].concat(have?[{id:have,src:'Kept'}]:[],pv?[{id:pv.driver,src:'Previous day'}]:[],aDr.map(id=>({id,src:'Project pool'})),MD.get().drivers.filter(d=>d.group==='POOL'&&d.status==='Active').map(d=>({id:d.id,src:'Replacement pool'}))));
  const hit=cands.find(c=>!driverFits(c.id,L,takenD));
  if(hit){takenD.add(hit.id);const p=params();out.assign.push({kind:'driver',slot,key,id:hit.id,src:hit.src,ids:L.map(t=>t.id),duty:Math.max.apply(null,L.map(tripEnd))-Math.min.apply(null,L.map(t=>t.out-p.reportLead))});}else{if(have)takenD.add(have);out.missing.push({kind:'driver',slot,key,ids:L.map(t=>t.id)});}});
 return out;}
/* cost for one cycle (FR-44/45) */
function cycleCost(plan,sch,c,date,extraAdds){const pr=sch.project;const r=sch.routes.find(x=>x.id===c.route);const ri=sch.routesIn.find(x=>x.id===c.route);
 const toll=(plan.toll||{})[c.route];const adds=((plan.additions||{})[c.route+'-'+c.cycle]||[]).map(a=>Object.assign({scope:'plan'},a)).concat(extraAdds||[]);
 return cost({chassis:ri.vehicle.chassis,body:ri.vehicle.body,sl:pr.sl,ptype:'Milkrun',project:pr.name,km:r.km,loadedKm:r.loadedKm,emptyKm:r.emptyKm,durationMin:c.inPool-c.out,stops:ri.stops.length+1,crew:MD.crew(pr),toll,date:date||plan.period[0],additions:adds});}
/* ---------- trips / duty ---------- */
function tripsOf(date){return STORE.get('trips').filter(t=>t.date===date);}
function tripEnd(t){return t.inPool!=null?t.inPool:(t.out+(t.durMin||240));}
function driverDay(driverId,date,except){const p=params();const list=STORE.get('trips').filter(t=>t.date===date&&t.driver===driverId&&t.id!==except&&!/Skipped|Cancelled/.test(t.status)&&!t.longhaul);
 if(!list.length)return {duty:0,start:null,end:null,trips:[]};const start=Math.min(...list.map(t=>t.out-p.reportLead)),end=Math.max(...list.map(tripEnd));return {duty:end-start,start,end,trips:list};}
/* duty if trip t were driven by driverId (Milkrun and Direct Delivery alike, limit 12h). Not a calendar day:
   - idle for 8h or more before this trip (or no earlier trip): the count restarts, only this trip counts (mine)
   - otherwise: the duty worked in the 12 hours before the trip is added (prior), then this trip (mine) */
function dutyWith(driverId,t){const p=params();if(t.longhaul)return {duty:0,prior:0,mine:0,later:0,rest:restBefore(driverId,t.date,t.out-p.reportLead),exempt:true,busy:false};
 const lead=p.reportLead,restM=p.restMin*60,W=p.dutyMax*60;const abs=(d,m)=>Date.parse(d+'T00:00:00Z')/60000+m;
 const hist=(STORE.get('ddHistory')||[]).filter(h=>h.kind==='driver'&&h.key===driverId&&h.sDate).map(h=>({s:abs(h.sDate,h.sMin),e:abs(h.date,h.min)}));
 const others=STORE.get('trips').filter(x=>x.id!==t.id&&x.driver===driverId&&!/Skipped|Cancelled/.test(x.status)&&!x.longhaul).map(x=>({s:abs(x.date,x.out),e:abs(x.date,tripEnd(x))})).concat(hist);
 const st0=abs(t.date,t.out),ms=st0-lead,me=abs(t.date,tripEnd(t));
 const ends=others.filter(o=>o.e<=st0).map(o=>o.e);const lastEnd=ends.length?Math.max.apply(null,ends):null;const idle=lastEnd==null?Infinity:st0-lastEnd;
 const reset=idle>=restM;const prior=reset?0:others.reduce((a,o)=>a+Math.max(0,Math.min(o.e,ms)-Math.max(o.s-lead,ms-W)),0);const mine=Math.max(0,me-ms);
 const busy=others.some(o=>o.s<me+p.turnaround&&st0<o.e+p.turnaround);
 return {duty:prior+mine,prior,mine,later:0,rest:idle===Infinity?1440:Math.max(0,idle),busy,exempt:false,reset};}
function restBefore(driverId,date,startMin){const prev=driverDay(driverId,UI.addDays(date,-1));if(prev.end==null)return 24*60;return startMin+1440-prev.end;}
function unitBusy(plate,t){const p=params();return STORE.get('trips').filter(x=>x.date===t.date&&x.unit===plate&&x.id!==t.id&&!/Skipped|Cancelled/.test(x.status)).find(x=>x.out<tripEnd(t)+p.turnaround&&t.out<tripEnd(x)+p.turnaround)||null;}
function onLeave(driverId,date){return STORE.get('leave').find(l=>l.driver===driverId&&l.from<=date&&l.to>=date&&l.status!=='Cancelled');}
/* ---------- readiness derivation (FR-17) ---------- */
function rkey(kind,id,date){return kind+':'+id+':'+date;}
function check(kind,id,date){return STORE.get('readiness').find(r=>r.key===rkey(kind,id,date))||null;}
function excOf(tripId){return STORE.get('exceptions').filter(e=>e.tripId===tripId).sort((a,b)=>b.requestedAt-a.requestedAt)[0]||null;}
function evaluate(t){
 const p=params();const now=STORE.now();const today=STORE.today();const res={state:'waiting',reasons:[],lock:[],driver:{},unit:{},exc:null,checkOpen:false};
 const depTs=STORE.ts(t.date,t.out);res.depTs=depTs;res.reportTs=depTs-p.reportLead*60000;res.checkOpen=t.date<=today&&now>=res.reportTs-30*60000;
 if(/Skipped|Cancelled/.test(t.status)){res.state='skipped';res.reasons.push(t.skipReason||t.status);return res;}
 if(t.status==='Released'||t.status==='Converted'){res.state='ready';res.done=true;}
 const add=(code,detail)=>{const r=reason(code);res.reasons.push({code,label:r.label,detail});if(r.lock)res.lock.push(code);};
 if(t.vendor){const vc=t.vendorConf||'Awaiting vendor';res.vendor=vc;if(vc==='Confirmed')res.state='ready';else if(vc==='Not confirmed'){add('VND-NOT-CONFIRMED');res.state='notready';}else res.state='waiting';return res;}
 const exc=excOf(t.id);res.exc=exc;
 /* driver half */
 /* Milkrun trip before H-1 resolution: the missing half is predicted per pool and type instead of per real unit / driver */
 const slotMode=t.type==='MR'&&!!t.slotUnit&&t.date>today&&!/Released|Converted/.test(t.status);
 const half=kind=>{res.pool=res.pool||poolPredict(t);const x=res.pool[kind];res[kind].pool=x;if(x.avail<x.need)add(kind==='unit'?'POOL-UNIT':'POOL-DRV',x.avail+' of '+x.need);else if(x.avail===x.need)res.poolTight=true;};
 const drv=t.driver&&MD.driver(t.driver);res.driver.rec=drv;
 if(!drv){if(slotMode)half('driver');else add('DRV-MISSING');}
 else{
  const lv=onLeave(drv.id,t.date);const att=check('drv',drv.id,t.date);res.driver.att=att&&att.att;res.driver.tenko=att&&att.tenko;res.driver.leave=lv;
  if(lv){add(lv.type==='Sick'?'DRV-SICK':'DRV-LEAVE',lv.type);}
  if(att&&att.att){const a=att.att.v;if(a==='Sick')add('DRV-SICK');else if(a==='Absent'||a==='Leave'||a==='Permission')add('DRV-ABSENT',a);else if(a==='Unreachable')add('DRV-UNREACH');else if(a==='Late')add('DRV-LATE',UI.ftime(att.att.at));}
  if(att&&att.tenko){if(att.tenko.result==='Unfit')add('DRV-UNFIT','BP '+att.tenko.sys+'/'+att.tenko.dia);if(att.tenko.app==='No')add('DRV-APP');}
  if(drv.simExp&&drv.simExp<t.date)add('DRV-SIM-EXP');
  const d=dutyWith(drv.id,t);res.driver.duty=d;if(!d.exempt&&d.duty>p.dutyMax*60)add('DRV-DUTY-12H',UI.dur(d.duty));if(d.rest<p.restMin*60)add('DRV-REST-8H',UI.dur(d.rest));}
 /* unit half */
 const u=t.unit&&MD.vehicle(t.unit);res.unit.rec=u;
 if(u){const ust=STORE.get('unitStatus').filter(s=>s.plate===u.plate&&s.from<=t.date&&(!s.to||s.to>=t.date)).sort((a,b)=>b.at-a.at)[0];
  const mr=STORE.get('maintenance').find(m=>m.plate===u.plate&&m.status==='Open'&&m.severity==='Critical'&&m.date<=t.date&&m.tripId!==t.id);
  res.unit.ops=ust?ust.status:(mr?'Not Available':(u.opStatus==='Maintenance'?'Not Available':'Available'));res.unit.opsFallback=!!ust;
  if(res.unit.ops==='Not Available')add('UNT-NA');
  if(u.stnkExp&&u.stnkExp<t.date)add('UNT-STNK-EXP');if(u.kirExp&&u.kirExp<t.date)add('UNT-KIR-EXP');
  const warn=UI.addDays(t.date,p.docWarn);res.unit.docWarn=(u.kirExp<=warn&&u.kirExp>=t.date)?'KIR '+UI.fdate(u.kirExp,{noYear:1}):(u.stnkExp<=warn&&u.stnkExp>=t.date)?'STNK '+UI.fdate(u.stnkExp,{noYear:1}):null;
  const pc=check('unit',u.plate,t.date);res.unit.p2h=pc&&pc.p2h;if(pc&&pc.p2h&&pc.p2h.result==='Fail')add('P2H-CRIT',(pc.p2h.nok||[]).join(', '));}
 else if(slotMode)half('unit');
 else add('UNT-NA','No unit');
 if(res.done)return res;
 if(exc&&exc.decision==='Approved'){res.state='withex';return res;}
 if(t.replacing){res.state='replacing';return res;}
 if(exc&&!exc.decision&&!exc.expired){res.state='exreq';return res;}
 const hard=res.reasons.filter(r=>typeof r==='object');
 const future=t.date>today||!res.checkOpen;
 if(future){
  if(hard.some(r=>r.code==='DRV-LEAVE'||r.code==='DRV-SICK'||r.code==='POOL-UNIT'||r.code==='POOL-DRV'))res.state='pred';
  else if(hard.some(r=>['DRV-SIM-EXP','UNT-STNK-EXP','UNT-KIR-EXP','DRV-DUTY-12H','DRV-REST-8H','DRV-MISSING','UNT-NA','DRV-UNFIT','P2H-CRIT','DRV-ABSENT','DRV-UNREACH'].indexOf(r.code)>=0))res.state='notready';
  else if(res.unit.docWarn||res.poolTight||(res.driver.duty&&res.driver.duty.duty>=(p.dutyMax-1)*60)){res.state='atrisk';if(res.unit.docWarn)res.reasons.push({code:'DOC-EXPIRING',label:res.unit.docWarn});}
  else res.state=t.date>today?'ready':'waiting';
  res.predicted=t.date>today;return res;}
 if(hard.length){res.state='notready';return res;}
 const att=res.driver.att,tk=res.driver.tenko,ph=res.unit.p2h;
 if(att&&tk&&ph&&ph.result!=='Fail')res.state='ready';
 else if(res.unit.docWarn||(res.driver.duty&&res.driver.duty.duty>=(p.dutyMax-1)*60)){res.state='atrisk';if(res.unit.docWarn)res.reasons.push({code:'DOC-EXPIRING',label:res.unit.docWarn});}
 else res.state='waiting';
 return res;}
/* exception SLA (FR-32): H-0 min(15 min, departure - 5 min); H-1 until cut-off 16:00 */
function excDeadline(t,reqTs){const p=params();const today=STORE.today();
 if(t.date>today){return STORE.ts(UI.addDays(t.date,-1),cutoffMin());}
 const dep=STORE.ts(t.date,t.out);return Math.min(reqTs+p.excSlaH0*60000,dep-5*60000);}
/* ---------- Direct Delivery route times (Dispatch FR-11) ---------- */
function hav(a,b){if(!a||!b||a.lat==null||b.lat==null)return 25;const R=6371,toR=x=>x*Math.PI/180;const dLa=toR(b.lat-a.lat),dLo=toR(b.lng-a.lng);const h=Math.sin(dLa/2)**2+Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function legKm(a,b){const p=params();return Math.max(3,Math.round(hav(MD.location(a),MD.location(b))*p.roadFactor));}
/* trip: {out, chassis, stops:[{loc}], pool, longhaul} -> stops with ETA, km, duration incl. long-haul rest (30 min / 4h driving) */
function ddTimes(t){const p=params();const sp=speedFor(t.chassis||'CDD');let cur=t.out,prev=null,km=0,drive=0,rests=0;const stops=[];/* the pool is not counted for now: the route starts at stop 1 (time = t.out) and ends at the last stop */
 (t.stops||[]).forEach(s=>{const k=prev?legKm(prev,s.loc):0;const tr=prev?Math.max(15,Math.round(k/sp*60)):0;km+=k;
  let brk=0;drive+=tr;/* no rest per 4h in the plan: Direct Delivery rests happen during the delivery */
  const L=MD.location(s.loc)||{};const h=(L.fixht||30)+(L.buffer||10);const eta=cur+tr+brk;stops.push(Object.assign({},s,{km:k,travel:tr,rest:brk,eta,etd:eta+h}));cur=eta+h;prev=s.loc;});
 const end=cur;
 const durMin=end-t.out;const longhaul=!!t.longhaul||durMin/60>p.longhaulH;
 return {stops,km,durMin,end,longhaul,rests,driveMin:drive};}
/* PM default (QA-022): a trip of today whose departure has passed is In transit; Convert is no longer offered */
function inTransit(t){return !!t&&!/Skipped|Cancelled|Draft/.test(t.status||'')&&t.date===STORE.today()&&STORE.now()>STORE.ts(t.date,t.out);}
/* Direct Delivery / Order / Resource pages list only the plans of Master Data Customer Projects; the hidden Milkrun fixture plans stay for the Milkrun pages */
/* the Project Manager only sees / opens the plans assigned to him / her; every other role sees all plans (plans in PM Assignment have no PM, so no PM sees them) */
function plans(){const me=STORE.persona()==='pm'?STORE.me().n:null;return STORE.get('projectPlans').filter(p=>!p.fixture&&(!me||p.pm===me));}
function allPlans(){return STORE.get('projectPlans').filter(p=>!p.fixture);}
/* Daily Availability rows; the ones reported more than availExpiry hours ago are removed (Planning Config > Order and assignment) */
function availRows(){const h=params().availExpiry;const all=STORE.get('vendorAvail')||[];if(!(h>0))return all;const cut=STORE.now()-h*3600000;const keep=all.filter(r=>!(r.reportedAt&&r.reportedAt<cut));if(keep.length!==all.length)STORE.set('vendorAvail',keep);return keep;}
window.DOM={availRows,plans,allPlans,inTransit,params,hav,legKm,ddTimes,PARAM_DEFAULT,REASONS,reasons,reason,speedFor,tollClass,cutoffMin,tariff,tollEval,cost,DG,hours,win,operating,refOf,planRoutes,planSchedule,cycleCost,allocUnits,allocDrivers,slotLetter,drvLabel,unitLabels,unitLabel,unitLabelFor,driverLabelFor,routeSlotLabels,slotKeyOf,slotFields,resolved,resourceByType,unitWhy,driverWhy,unitFits,driverFits,poolPredict,suggestDay,tripsOf,tripEnd,driverDay,dutyWith,unitBusy,onLeave,check,rkey,excOf,evaluate,excDeadline,slLevel};
})();
