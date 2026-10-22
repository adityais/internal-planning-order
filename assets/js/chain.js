/* Milkrun chaining engine - pure functions, no DOM, no store (Milkrun Planning T1-T9, U1-U3, D1-D4).
   CHAIN.schedule(input) -> { routes:[{id, cycles:[...], feasible, maxFit, A, D, I}], units, drivers, stats }
   All times are minutes from 00:00 of the operating day (may exceed 1440 = next day). */
(function(){
'use strict';
const DEF={turnaround:15,reportLead:60,dutyMax:720,restMin:480,minGap:15,shiftDay:[360,1080],speed:40,addTco:5};
function travel(km,speed,minGap){return Math.max(minGap,Math.round(km/speed*60));}
/* T3 handling at a stop: fixed + additional x volume + buffer */
function handling(s,vol){return Math.round((+s.fixht||0)+(+s.addht||0)*(vol||0)+(+s.buffer||0));}
/* Route time template (T1-T4): leg list relative to Out Pool */
function template(r,p){
 const speed=p.speedFor?p.speedFor(r.vehicle.chassis):p.speed;const gap=p.minGap;
 const volCycle=r.volCycle||0;const legs=[];let t=0;
 r.stops.forEach((s,i)=>{const tr=travel(s.km,speed,gap);t+=tr;const h=handling(s,s.volDay&&r.cycles?s.volDay/r.cycles:0);legs.push({loc:s.loc,kind:'sup',travel:tr,inOff:t,outOff:t+h,km:s.km});t+=h;});
 const ctr=travel(r.cust.km,speed,gap);t+=ctr;const A=t;const H=handling(r.cust,volCycle);legs.push({loc:r.cust.loc,kind:'cust',travel:ctr,inOff:t,outOff:t+H,km:r.cust.km});t+=H;
 const rtr=travel(r.returnKm,speed,gap);t+=rtr;
 const km=r.stops.reduce((a,s)=>a+(+s.km||0),0)+(+r.cust.km||0)+(+r.returnKm||0);
 return {legs,A,H,D:t,ret:rtr,km,loadedKm:km-(+r.stops[0]?.km||0)-(+r.returnKm||0),emptyKm:(+r.stops[0]?.km||0)+(+r.returnKm||0)};}
/* T5-T8 cycle times for one route in one day group */
function cycleTimes(r,win,p,edits){
 const tp=template(r,p);const N=Math.max(1,r.cycles|0);const open=win[0],close=win[1];
 const I=r.heijunka?+r.heijunka:(N>1?Math.floor((close-open-tp.H-(r.stagger||0))/(N-1)):0);
 const maxFit=I>0?Math.floor((close-open-tp.H-(r.stagger||0))/I)+1:1;
 const cycles=[];
 for(let k=1;k<=N;k++){
  const arrCalc=open+(r.stagger||0)+(k-1)*I;const outCalc=arrCalc-tp.A;
  const e=(edits&&edits[k])||{};
  let out=e.out!=null?e.out:outCalc;
  /* stop times forward from Out Pool, honouring manual IN edits (cells "s<i>") */
  let t=out;const stops=[];let manual=e.out!=null?1:0;
  tp.legs.forEach((l,i)=>{const calcIn=t+l.travel;let inn=calcIn;const key='s'+i;
   if(e[key]!=null){inn=Math.max(e[key],calcIn);manual++;}
   const h=l.outOff-l.inOff;stops.push({loc:l.loc,kind:l.kind,in:inn,out:inn+h,calcIn:out===outCalc&&!manual?calcIn:null,manual:e[key]!=null});t=inn+h;});
  const inPool=t+tp.ret;const arr=stops[stops.length-1].in;const custOut=stops[stops.length-1].out;
  const outside=custOut>close||arr<open;
  cycles.push({route:r.id,routeName:r.name,cycle:k,out,outCalc,arr,arrCalc,inPool,inCalc:outCalc+tp.D,stops,manual,outside,shift:(((out%1440)+1440)%1440)>=p.shiftDay[0]&&(((out%1440)+1440)%1440)<p.shiftDay[1]?'Day':'Night',vtype:r.vehicle.chassis+' '+r.vehicle.body,unit:null,driver:null,pinUnit:e.unit||null,pinDriver:e.driver||null});}
 const nOutside=cycles.filter(c=>c.outside).length;
 return {id:r.id,name:r.name,cycles,feasible:nOutside===0,maxFit:Math.max(1,Math.min(maxFit,N)),maxFitRaw:maxFit,A:tp.A,D:tp.D,H:tp.H,I,km:tp.km,loadedKm:tp.loadedKm,emptyKm:tp.emptyKm,legs:tp.legs,nOutside};}
/* U1-U3 unit chaining per vehicle type */
function chainUnits(cycles,alloc,p){
 const byType={};cycles.forEach(c=>{(byType[c.vtype]=byType[c.vtype]||[]).push(c);});
 const units={};let shortN=0;
 Object.keys(byType).forEach(vt=>{
  const list=byType[vt].slice().sort((a,b)=>a.out-b.out||a.route.localeCompare(b.route)||a.cycle-b.cycle);
  const pool=(alloc[vt]||[]).slice();const used=[];/* {plate,freeAt,lastRoute,cycles} */
  list.forEach(c=>{
   if(c.pinUnit){let u=used.find(x=>x.plate===c.pinUnit);if(!u){u={plate:c.pinUnit,short:/^Short /.test(c.pinUnit),freeAt:-1e9,lastRoute:null,cycles:[],vt};used.push(u);const pi=pool.indexOf(c.pinUnit);if(pi>=0)pool.splice(pi,1);}
    if(u.freeAt>c.out){const holder=u.cycles[u.cycles.length-1];c.conflict={type:'unit',plate:u.plate,holder:holder?holder.route+' cycle '+holder.cycle:'',holderRoute:holder&&holder.route,holderCycle:holder&&holder.cycle,freeAt:u.freeAt};}
    c.unit=u.plate;c.unitShort=!!u.short;u.cycles.push(c);u.freeAt=Math.max(u.freeAt,c.inPool+p.turnaround);u.lastRoute=c.route;return;}
   /* a unit that is back in the pool (In Pool + buffer) at or before this cycle's Out Pool takes it - earliest-returned first, any route */
   const free=used.filter(u=>u.freeAt<=c.out);let u=free.sort((a,b)=>a.freeAt-b.freeAt||used.indexOf(a)-used.indexOf(b))[0];
   if(!u){const plate=pool.length?pool.shift():null;u={plate:plate||('Short '+(++shortN)),short:!plate,freeAt:-1e9,lastRoute:null,cycles:[],vt};used.push(u);}
   c.unit=u.plate;c.unitShort=!!u.short;u.cycles.push(c);u.freeAt=c.inPool+p.turnaround;u.lastRoute=c.route;});
  used.forEach(u=>units[u.plate]=u);});
 return units;}
/* D1-D4 driver chaining, independent from units; duty <= 12h, rest >= 8h; handover at pool */
function chainDrivers(cycles,p){
 const list=cycles.slice().sort((a,b)=>a.out-b.out||a.route.localeCompare(b.route)||a.cycle-b.cycle);
 const slots=[];const lastDriverOfUnit={};
 const fits=(s,c)=>s.busyUntil<=c.out&&(c.inPool-s.start)<=p.dutyMax;
 list.forEach(c=>{let s=null;
  if(c.pinDriver){s=slots.find(x=>x.id===c.pinDriver);if(!s){s={id:c.pinDriver,start:c.out-p.reportLead,end:c.inPool,busyUntil:-1e9,cycles:[]};slots.push(s);}
   const newDuty=Math.max(c.inPool,s.end)-Math.min(s.start,c.out-p.reportLead);if(newDuty>p.dutyMax||s.busyUntil>c.out)c.dutyBreach={slot:s.id,duty:newDuty,busy:s.busyUntil>c.out};}
  else{/* same rule as units, independent of the unit: the driver who returned to the pool earliest (and still fits duty) takes the next cycle that starts after that return */
   const cands=slots.filter(x=>fits(x,c)).sort((a,b)=>a.busyUntil-b.busyUntil||slots.indexOf(a)-slots.indexOf(b));s=cands[0]||null;
   if(!s){let n=slots.length+1;while(slots.find(x=>x.id==='D'+String(n).padStart(2,'0')))n++;s={id:'D'+String(n).padStart(2,'0'),start:c.out-p.reportLead,end:c.inPool,busyUntil:-1e9,cycles:[]};slots.push(s);}}
  if(!s.cycles.length)s.start=c.out-p.reportLead;
  s.start=Math.min(s.start,c.out-p.reportLead);s.end=Math.max(s.end,c.inPool);s.busyUntil=Math.max(s.busyUntil,c.inPool);s.cycles.push(c);c.driver=s.id;
  const prevD=lastDriverOfUnit[c.unit];if(prevD&&prevD!==s){c.handover=true;}lastDriverOfUnit[c.unit]=s;});
 slots.forEach(s=>{s.pinId=s.id;s.duty=s.end-s.start;s.rest=1440-s.duty;});
 slots.sort((a,b)=>a.id.localeCompare(b.id));
 return slots;}
function schedule(input){
 const p=Object.assign({},DEF,input.params||{});const win=input.window;const edits=input.edits||{};
 const routes=input.routes.map(r=>cycleTimes(r,win,p,edits[r.id]));
 const runnable=[];routes.forEach(r=>r.cycles.forEach(c=>{if(!c.outside)runnable.push(c);}));
 const units=chainUnits(runnable,input.alloc||{},p);
 const slots=chainDrivers(runnable,p);
 const all=[];routes.forEach(r=>r.cycles.forEach(c=>all.push(c)));
 const unitList=Object.values(units);
 const allocUnits=Object.values(input.alloc||{}).reduce((a,l)=>a+l.length,0);
 const dutyBreaches=slots.filter(s=>s.duty>p.dutyMax).length+all.filter(c=>c.dutyBreach).length;
 const restBreaches=slots.filter(s=>s.rest<p.restMin).length;
 const conflicts=all.filter(c=>c.conflict).length;
 const stats={cycles:all.length,runnable:runnable.length,units:unitList.length,unitsShort:unitList.filter(u=>u.short).length,allocUnits,drivers:slots.length,allocDrivers:input.allocDrivers||0,
  dutyBreaches,restBreaches,conflicts,outside:all.filter(c=>c.outside).length,infeasibleRoutes:routes.filter(r=>!r.feasible).map(r=>r.id),manual:all.reduce((a,c)=>a+c.manual,0)};
 return {routes,cycles:all,units:unitList,drivers:slots,stats,params:p};}
/* Peak overlap of unit busy intervals (U3) - used by tests to prove greedy is optimal */
function peak(cycles,turn){const ev=[];cycles.forEach(c=>{ev.push([c.out,1]);ev.push([c.inPool+turn,-1]);});ev.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let cur=0,mx=0;ev.forEach(e=>{cur+=e[1];mx=Math.max(mx,cur);});return mx;}
/* Find a unit that is really free for [out, inPool] in a computed schedule */
function freeUnit(sch,c,allPlates){const turn=sch.params.turnaround;
 const busy=p=>sch.cycles.some(x=>x!==c&&x.unit===p&&!x.outside&&x.out<c.inPool+turn&&c.out<x.inPool+turn);
 return allPlates.find(p=>!busy(p))||null;}
/* Suggest a driver slot where cycle c fits (duty and busy) */
function suggestSlot(sch,c){const p=sch.params;
 for(const s of sch.drivers){const others=s.cycles.filter(x=>x!==c);if(others.some(x=>x.out<c.inPool&&c.out<x.inPool))continue;const st=Math.min(c.out-p.reportLead,...others.map(x=>x.out-p.reportLead));const en=Math.max(c.inPool,...others.map(x=>x.inPool));if(en-st<=p.dutyMax)return {slot:s.id,pin:s.pinId,duty:en-st};}
 return {slot:'D'+String(sch.drivers.length+1).padStart(2,'0'),pin:'NEW',duty:c.inPool-c.out+p.reportLead};}
window.CHAIN={schedule,template,cycleTimes,chainUnits,chainDrivers,peak,freeUnit,suggestSlot,travel,handling,DEF};
})();
