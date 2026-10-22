/* Dispatch shared logic (Direct Delivery): trip math, route rebuild, unit / driver lists, trip creation. Used by the Trip Management (dispatch.js) and the Dispatch Detail page (dispatch-detail.js). */
(function(){
'use strict';
const {hm}=UI;
function unitOf(t){return MD.vehicle(t.unit)||null;}
function load(os,v){const m3=os.reduce((a,o)=>a+(+o.m3||0),0),ton=os.reduce((a,o)=>a+(+o.ton||0),0);if(!v)return {m3,ton,lf:null};const r1=m3/v.m3,r2=ton/v.ton;return {m3,ton,r1,r2,lf:Math.max(r1,r2),bind:r1>=r2?'m3':'ton',over:r1>1||r2>1};}
function rebuild(t,os){const v=unitOf(t)||{chassis:os[0].unitCategory};const pr=MD.project(os[0].project);const out=t.out!=null?t.out:Math.min(...os.map(o=>UI.parseHM(o.window[0])));
 /* all points of the orders in sequence (order stops: Pick Up, then Drop Off); Pool / Transit are not trip stops. Legs with a rate = the trip route (t.legs) */
 const ptsOf=o=>ORD.stopsOf(o).filter(s=>s.type==='Pick Up'||s.type==='Drop Off');const seen={};const picks=[];os.forEach(o=>ptsOf(o).filter(s=>s.type==='Pick Up').forEach(s=>{if(!seen[s.loc]){seen[s.loc]=1;picks.push({loc:s.loc,kind:'pick',order:o.id,city:s.city});}}));
 const drops=[];(t.stopOrder||os.map(o=>o.id)).forEach(id=>{const o=os.find(x=>x.id===id);if(o)ptsOf(o).filter(s=>s.type==='Drop Off').forEach(s=>drops.push({loc:s.loc,kind:'drop',order:o.id,city:s.city}));});
 const stops=(picks.length?picks:[{loc:os[0].origin.loc,kind:'pick',order:os[0].id}]).concat(drops.length?drops:[{loc:os[0].drops[0].loc,kind:'drop',order:os[0].id,city:os[0].drops[0].city}]);
 const legs=[];os.forEach(o=>(ORD.liveDealing(o).legs||[]).filter(l=>l.rate).forEach(l=>{if(!legs.some(x=>x.from===l.from&&x.to===l.to))legs.push({from:l.from,to:l.to});}));
 const tt=DOM.ddTimes({out,chassis:v.chassis,stops,longhaul:!!pr.longhaul});return Object.assign(t,{legs,out,stops:tt.stops,inPool:tt.end,durMin:tt.durMin,km:tt.km,longhaul:tt.longhaul,orders:os.map(o=>o.id),sl:os[0].sl,project:os[0].project,projectId:pr.id,chassis:v.chassis});}
window.DDX={rebuild};
function unitsFor(os,t){const date=(t&&t.date)||os[0].date;const pr=MD.project(os[0].project);const al=STORE.get('allocations');const alloc=al.filter(a=>a.kind==='unit'&&a.status==='Active'&&a.source!=='Vendor');
 const ded=alloc.filter(a=>a.project===pr.code).map(a=>a.plate);const taken=new Set(alloc.map(a=>a.plate));
 /* Dedicated: only the units allocated to the project. Any other project: own units that are not allocated to a project */
 const poolU=MD.get().dd.vehicles.filter(v=>v.status==='Active'&&v.own==='own'&&!taken.has(v.plate)).map(v=>v.plate);const list=pr.ptype==='Dedicated'?ded:poolU;
 const probe=Object.assign({date,id:t?t.id:'_new'},t||{},{out:t&&t.out!=null?t.out:Math.min(...os.map(o=>UI.parseHM(o.window[0]))),inPool:t&&t.inPool?t.inPool:Math.min(...os.map(o=>UI.parseHM(o.window[0])))+480});
 return [...new Set(list)].map(pl=>{const v=MD.vehicle(pl);if(!v)return null;const b=DOM.unitBusy(pl,probe);const ust=STORE.get('unitStatus').find(s=>s.plate===pl&&s.from<=date&&(!s.to||s.to>=date));
  const why=v.opStatus!=='Available'||ust?'Maintenance':v.status!=='Active'?'Inactive':v.kirExp<date||v.stnkExp<date?'Docs expired':b?'On '+b.id.slice(-4):'';return {v,why,l:load(os,v)};}).filter(Boolean);}
function driversFor(t){const date=t.date;const pr=MD.project(t.projectId)||{};const al=STORE.get('allocations');const alloc=al.filter(a=>a.kind==='driver'&&a.status==='Active'&&a.source!=='Vendor');
 const own=MD.get().dd.drivers.filter(d=>d.status==='Active'&&d.own==='own').map(d=>d.id);const taken=new Set(alloc.map(a=>a.driver));
 const ids=pr.ptype==='Dedicated'?alloc.filter(a=>a.project===pr.code).map(a=>a.driver):own.filter(id=>!taken.has(id));
 return [...new Set(ids)].map(id=>{const d=MD.driver(id);if(!d)return null;const dw=DOM.dutyWith(id,t);const lv=DOM.onLeave(id,date);const why=lv?'On leave':dw.busy?'Busy':!dw.exempt&&dw.duty>720?'Over 12h':d.simExp<date?'SIM expired':'';
  return {d,dw,why};}).filter(Boolean);}
function save(t,action,detail){const all=STORE.get('trips');const i=all.findIndex(x=>x.id===t.id);t.status=t.status==='Published'?'Published':(t.unit&&t.driver?'Planned':'Draft');if(i>=0)all[i]=t;else all.push(t);STORE.set('trips',all);if(action)STORE.audit({action,detail,obj:t.id,type:'Dispatch'});}
function setOrders(ids,patch){const os=STORE.get('orders');ids.forEach(id=>{const o=os.find(x=>x.id===id);if(o)Object.assign(o,patch);});STORE.set('orders',os);}
function newTripId(date){const n=STORE.get('trips').filter(t=>t.type==='DT'&&t.date===date).reduce((a,t)=>Math.max(a,+t.id.slice(-4)),0)+1;return 'DT-'+date.replace(/-/g,'')+'-'+String(n).padStart(4,'0');}
function routeKm(t){const legs=(t.stops||[]).map(s=>+s.km||0);return legs.length>1?legs.slice(1).reduce((a,b)=>a+b,0):(t.km||0);}
/* Additional Charges agreed with the customer in the Customer Project (Master Data); they fill the additions of a trip until the planner changes them */
function chargesOf(pr){return (pr&&pr.charges||[]).map(c=>({comp:c.type,amt:c.amount,auto:true,reason:'Customer project price'+(c.basis?' ('+String(c.basis).replace(/_/g,' ')+')':'')}));}
/* additions of a trip: what the planner saved; a trip never touched shows the customer project's charges */
function addsOf(t,pr){return (t.addTouched||(t.additions&&t.additions.length))?(t.additions||[]):chargesOf(pr);}
function tripCost(t,plate){const o0=STORE.byId('orders',(t.orders||[])[0])||{};const v=(plate&&MD.vehicle(plate))||unitOf(t)||(()=>{/* no unit yet: the tonase of our own units of that Category + Karoseri, so the recommendation does not jump when the unit is picked */const ch=t.chassis||o0.unitCategory||'CDD',bd=o0.body||'Wingbox';const own=MD.get().dd.vehicles.find(x=>x.own==='own'&&x.status==='Active'&&x.chassis===ch&&x.body===bd);return {chassis:ch,body:bd,ton:own?own.ton:o0.ton};})();const pr=MD.project(t.projectId)||{};
 /* distance = the route only (first pick up to last drop); the pool legs are not counted for now */
 const km=routeKm(t);
 return {chassis:v.chassis,body:v.body,ton:v.ton,sl:t.sl,ptype:pr.ptype||'On Call',project:pr.name,km,loadedKm:km,emptyKm:0,durationMin:t.durMin||300,stops:(t.stops||[]).length,crew:MD.crew(pr),toll:t.toll,date:t.date,additions:addsOf(t,pr).map(a=>Object.assign({scope:'trip'},a)),ujOverride:t.ujOverride||null};}
/* default toll: the toll of an earlier trip of the same project and route (first pick up to last drop), else not set yet */
function defaultToll(t){const first=(t.stops[0]||{}).loc,last=(t.stops[t.stops.length-1]||{}).loc;const p=STORE.get('trips').find(x=>x.type==='DT'&&!x.vendor&&x.project===t.project&&x.toll&&x.toll.cond&&(x.stops||[])[0]&&x.stops[0].loc===first&&(x.stops[x.stops.length-1]||{}).loc===last);return p?JSON.parse(JSON.stringify(p.toll)):null;}
/* a Draft trip for one unit of the order (route calculated first, unit and driver come next) */
function ensureTrip(o,slot,slots){const date=o.date;const t={id:newTripId(date),type:'DT',date,status:'Draft',version:null,toll:null,additions:[],stopOrder:[o.id]};
 rebuild(t,[o]);t.toll=defaultToll(t);save(t,'Created '+t.id,o.id+(slots>1?' ('+slot+'/'+slots+')':''));
 const cov=STORE.get('trips').filter(x=>x.type==='DT'&&!x.vendor&&x.date===date&&!/Cancelled|Skipped/.test(x.status)&&x.orders.indexOf(o.id)>=0).length;setOrders([o.id],{trip:t.id,status:cov>=(o.qty||1)?'Planned':o.status});return STORE.byId('trips',t.id);}
function freeOrders(t){t.orders.forEach(id=>{const o=STORE.byId('orders',id);if(!o)return;const left=STORE.get('trips').filter(x=>x.type==='DT'&&!x.vendor&&x.id!==t.id&&!/Cancelled|Skipped/.test(x.status)&&x.orders.indexOf(id)>=0);
  if(left.length)setOrders([id],{trip:left[0].id,status:left.length>=(o.qty||1)?o.status:'Assigned'});else{setOrders([id],{status:'Assigned'});const os=STORE.get('orders');const x=os.find(z=>z.id===id);if(x){delete x.trip;STORE.set('orders',os);}}});}
function cancelTrip(t){const all=STORE.get('trips');const x=all.find(y=>y.id===t.id);x.status='Cancelled';x.skipReason='Deleted from the Trip Management';STORE.set('trips',all);freeOrders(x);STORE.audit({action:'Deleted '+x.id,detail:x.orders.join(', '),obj:x.id,type:'Dispatch'});return x;}
/* "1/2": which unit of the order this trip is */
function slotOf(t){const o=STORE.byId('orders',t.orders[0]);const q=o?(o.qty||1):1;if(q<2||t.orders.length!==1)return {slot:0,slots:0};
 const sib=STORE.get('trips').filter(x=>x.type==='DT'&&!x.vendor&&x.date===t.date&&!/Cancelled|Skipped/.test(x.status)&&x.orders.length===1&&x.orders[0]===o.id).sort((a,b)=>a.id.localeCompare(b.id));return {slot:sib.findIndex(x=>x.id===t.id)+1,slots:q};}
/* Three stages, one after the other: 1 Trip Confirmation (check route, distance, toll and uang jalan, then confirm) > 2 Trip Assignment (unit and driver, then publish) > 3 Ready to Depart (published; Converted once the trip is created).
   Transporter: Trip Assignment while plate and driver are missing, Ready to Depart once they are in. */
const isConfirmed=t=>!!t&&(t.confirmedAt||(t.confirmedAt===undefined&&!!t.unit&&!!t.driver));/* older trips that already have unit and driver count as confirmed */
function statusOf(t,vendor){if(vendor){if(!t)return 'Trip Confirmation';if(t.status==='Converted')return 'Converted';if(t.status==='Published')return 'Ready to Depart';return t.confirmedAt?'Trip Assignment':'Trip Confirmation';}
 if(!t)return 'Trip Confirmation';if(t.status==='Converted')return 'Converted';if(t.status==='Published')return 'Ready to Depart';return isConfirmed(t)?'Trip Assignment':'Trip Confirmation';}
const TONE={'Trip Confirmation':'amber','Trip Assignment':'navy','Ready to Depart':'green'};
function confirmTrip(t){const all=STORE.get('trips');const x=all.find(y=>y.id===t.id);x.confirmedAt=STORE.now();x.confirmedBy=STORE.me().n;STORE.set('trips',all);STORE.audit({action:'Confirmed '+x.id,detail:'Route, distance and uang jalan checked',obj:x.id,type:'Dispatch'});return x;}
function reopenTrip(t){const all=STORE.get('trips');const x=all.find(y=>y.id===t.id);x.confirmedAt=null;x.confirmedBy=null;STORE.set('trips',all);STORE.audit({action:'Back to Trip Confirmation '+x.id,detail:'',obj:x.id,type:'Dispatch'});return x;}
/* a Transporter order gets one trip per unit too (Draft, no plate yet): Trip Confirmation > Trip Assignment (plate and driver) > Ready to Depart */
function ensureVendorTrip(o,slot,slots){const a=o.assignment||{};const date=o.date;const names=[];(a.vendors&&a.vendors.length?a.vendors:[{vendor:a.vendor,qty:o.qty||1}]).forEach(v=>{for(let i=0;i<(v.qty||1);i++)names.push(v.vendor);});
 const vname=names[slot-1]||names[0]||a.vendor||'Transporter';
 const t={id:newTripId(date),type:'DT',date,status:'Draft',version:null,toll:null,additions:[],stopOrder:[o.id],vendor:vname,vendorDriver:'',vendorConf:'Awaiting vendor',vendorRate:a.price,nopolVia:'',unit:null,driver:null};
  /* On Call Transporter: the unit was picked from Daily Availability, so plate, driver and phone are already known */
  const au=(a.units||[])[Math.max(0,(slot||1)-1)];if(au&&au.plate){t.unit=au.plate;t.vendorDriver=au.driverName||'';t.vendorPhone=au.phone||'';t.nopolVia=a.nopolVia||'Daily Availability';}
 rebuild(t,[o]);const all=STORE.get('trips');all.push(t);STORE.set('trips',all);STORE.audit({action:'Created '+t.id,detail:o.id+' '+vname+(slots>1?' ('+slot+'/'+slots+')':''),obj:t.id,type:'Dispatch'});
 if(!a.trip){const os=STORE.get('orders');const x=os.find(z=>z.id===o.id);if(x){x.assignment=Object.assign({},x.assignment,{trip:t.id});STORE.set('orders',os);}}return t;}
/* plate and driver of a Transporter trip (typed, picked from the transporter's registered units, or read from its WhatsApp reply): the trip is then Ready to Depart */
function fillVendorTrip(t,plate,driver,phone,via,noPublish){const all=STORE.get('trips');const x=all.find(y=>y.id===t.id);x.unit=plate;x.vendorDriver=driver;x.vendorPhone=phone||'';x.nopolVia=via||'Trip Management';STORE.set('trips',all);
 const o=STORE.byId('orders',x.orders[0]);if(o){const a=o.assignment||(o.assignment={});a.plate=a.plate||plate;a.driverName=a.driverName||driver;a.driverPhone=a.driverPhone||phone||'';a.nopolAt=STORE.now();a.nopolVia=x.nopolVia;a.units=(a.units||[]).concat([{plate,cat:o.unitCategory||'',kar:o.body||'',vendor:x.vendor,driverName:driver,phone:phone||''}]);if(!a.trip)a.trip=x.id;ORD.save(o,'Nopol and driver ('+x.nopolVia+')',plate+', '+driver+(phone?', '+phone:''));}
 return noPublish?x:publishTrip(x,'');}/* every unit of an own-asset order gets its trip as soon as the order is on the board (Qty 2 = 2 trips); nothing is created twice */
function syncVendor(date){let n=0;STORE.get('orders').filter(o=>o.date===date&&o.assignment&&o.assignment.path==='Vendor'&&['Assigned','Planned'].indexOf(o.status)>=0).forEach(o=>{const q=o.qty||1;const cov=()=>STORE.get('trips').filter(x=>x.type==='DT'&&x.vendor&&x.date===date&&!/Cancelled|Skipped/.test(x.status)&&x.orders.indexOf(o.id)>=0).length;let c=cov();while(c<q){c++;ensureVendorTrip(STORE.byId('orders',o.id),c,q);n++;}});return n;}
function syncTrips(date){let n=syncVendor(date);STORE.get('orders').filter(o=>o.date===date&&o.assignment&&(o.assignment.path==='Own'||o.assignment.path==='Dedicated')&&['Assigned','Planned','Converted'].indexOf(o.status)>=0).forEach(o=>{const q=o.qty||1;
  const cov=()=>STORE.get('trips').filter(x=>x.type==='DT'&&!x.vendor&&x.date===date&&!/Cancelled|Skipped/.test(x.status)&&x.orders.indexOf(o.id)>=0).length;let c=cov();while(c<q){c++;ensureTrip(STORE.byId('orders',o.id),c,q);n++;}});return n;}
/* Publish one trip: sent to CCR and Field Ops. No cut-off and no reason: publish and publish again are free */
function publishTrip(t){const all=STORE.get('trips');const x=all.find(y=>y.id===t.id);x.status='Published';x.version=(x.version||0)+1;x.changed=false;x.publishedAt=STORE.now();x.publishedBy=STORE.me().n;x.flags=(x.flags||[]).filter(f=>f!=='Late change');STORE.set('trips',all);
 STORE.audit({action:(x.version>1?'Dispatched again ':'Dispatched ')+x.id,detail:'',obj:x.id,type:'Dispatch'});
 STORE.notify({kind:'Info',to:['ccr','fieldops'],title:'Trip '+x.id+' dispatched',link:{default:'dispatch-detail.html?trip='+x.id+'&from=depart',fieldops:'readiness-tablet.html'}});
 DOCS.regenerate(d=>d.type==='Daily Dispatch Plan'&&d.date===x.date,()=>[{type:'Daily Dispatch Plan',scope:'DP-'+x.date.replace(/-/g,''),date:x.date,route:'All trips'}]);return x;}
/* history of a unit / driver (idle time) */
const absM=(d,m)=>Date.parse(d+'T00:00:00Z')/60000+(m||0);
function lastTrip(field,key,t){const s=absM(t.date,t.out);let best=null,be=-1;STORE.get('trips').forEach(x=>{if(x.type!=='DT'||x.vendor||x.id===t.id||/Cancelled|Skipped/.test(x.status)||x[field]!==key)return;const e=absM(x.date,x.inPool);if(e<=s&&e>be){be=e;best=x;}});(STORE.get('ddHistory')||[]).forEach(h=>{if(h.kind!==(field==='unit'?'unit':'driver')||h.key!==key)return;const e=absM(h.date,h.min);if(e<=s&&e>be){be=e;best=h;}});return best?{end:be,idle:s-be}:null;}
const endTxt=l=>l?UI.fdate(new Date(l.end*60000).toISOString().slice(0,10),{noYear:1})+' '+hm(l.end%1440):'No trip yet';
const idleTxt=l=>{if(!l)return '-';const m=Math.round(l.idle);return m>=1440?Math.floor(m/1440)+'d '+Math.floor(m%1440/60)+'h':Math.floor(m/60)+'h '+(m%60)+'m';};
const idleVal=l=>l?l.idle:1e9;
/* the latest Tenko (driver) or P2H (unit) on record up to a date: {at,result,...} or null */
function latestCheck(kind,id,field,upTo){const pre=kind+':'+id+':';const rows=(STORE.get('readiness')||[]).filter(r=>r.key.indexOf(pre)===0&&r[field]&&(!upTo||r.key.slice(pre.length)<=upTo));rows.sort((a,b)=>(a[field].at||0)-(b[field].at||0));const r=rows[rows.length-1];return r?r[field]:null;}
window.DDL={chargesOf,addsOf,latestCheck,ensureVendorTrip,fillVendorTrip,isConfirmed,confirmTrip,reopenTrip,syncTrips,publishTrip,routeKm,unitOf,load,rebuild,unitsFor,driversFor,save,setOrders,newTripId,tripCost,defaultToll,ensureTrip,freeOrders,cancelTrip,slotOf,statusOf,TONE,lastTrip,endTxt,idleTxt,idleVal};
})();