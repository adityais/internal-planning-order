/* Background engines that must advance on any open page: vendor waterfall timers (Order Assignment FR-11..15),
   exception SLA escalation (Readiness FR-32), Pending Dealing auto re-check (Dealing FR-7). */
(function(){
'use strict';
const VENDOR_SLA_DEFAULT=30;const vendorSla=()=>(window.DOM&&DOM.params().waterfallMin)||VENDOR_SLA_DEFAULT;/* per vendor: no response in 30 min -> the waterfall moves to the next vendor automatically; no order-level assignment SLA */
/* ---------- Dealing match (Customer Rate, per drop) ---------- */
/* Order Capture feedback (2026-10-19): the route of an order is a chain of stops (Pool, Pick Up, Drop Off, Transit). Only Pick Up and Drop Off
   points are billable: consecutive points in the SAME city do not make a new leg (Additional Charges), each leg between two different cities
   needs a rate (Rate List is city based). Orders without o.stops (seed) are read as Pick Up origin + Drop Off drops. */
function stopsOf(o){if(o.stops&&o.stops.length)return o.stops;const s=[];if(o.origin&&(o.origin.loc||o.origin.city))s.push({type:'Pick Up',loc:o.origin.loc||'',city:o.origin.city||''});(o.drops||[]).forEach(d=>{if(d.loc||d.city)s.push({type:'Drop Off',loc:d.loc||'',city:d.city||''});});return s;}
function legsOf(o){const seq=[];stopsOf(o).filter(s=>s.type==='Pick Up'||s.type==='Drop Off').forEach(s=>{const c=s.city||'';if(!c)return;const l=seq[seq.length-1];if(l&&MD.sameCity(l.city,c))return;seq.push({city:c,loc:s.loc||''});});
 if(seq.length===1)return [{from:seq[0].city,to:seq[0].city,fromLoc:seq[0].loc,toLoc:seq[0].loc}];
 const out=[];for(let i=1;i<seq.length;i++)out.push({from:seq[i-1].city,to:seq[i].city,fromLoc:seq[i-1].loc,toLoc:seq[i].loc});return out;}
function match(o){const pr=MD.project(o.project);if(!pr)return {status:'No rate',legs:[],drops:[]};const now=STORE.now();
 const legs=legsOf(o).map(l=>{const c=(pr.rates||[]).filter(r=>MD.sameCity(r.origin,l.from)&&MD.sameCity(r.dest,l.to));
  const exact=c.filter(r=>r.kategori===o.unitCategory&&(!o.body||r.karoseri===o.body||MD.karMatch(r.karoseri,o.body)));const list=exact.length?exact:c.filter(r=>r.kategori===o.unitCategory);
  const best=list.slice().sort((a,b)=>a.harga-b.harga)[0]||null;return {from:l.from,to:l.to,fromLoc:l.fromLoc,toLoc:l.toLoc,city:l.to,loc:l.toLoc,rate:best,options:list};});
 if(!legs.length||legs.some(l=>!l.rate))return {status:'No rate',legs,drops:legs,checkedAt:now};
 const pick=legs.map(l=>l.rate);
 return {status:'Matched',legs,drops:legs,price:pick.reduce((a,r)=>a+r.harga,0),basis:pick[0].basis,lead:Math.max(...pick.map(r=>r.lead)),eta:pick.every(r=>!r.lead)?'Same day':'H+'+Math.max(...pick.map(r=>r.lead)),charges:pick.map(r=>r.charges).filter(Boolean).join(', '),checkedAt:now,project:pr.name};}
/* ---------- waterfall ---------- */
function candidates(o){const md=MD.get();const out=[];const seen=new Set();
 const pri=md.priority.filter(r=>r.kategori===o.unitCategory&&r.origin===o.origin.city&&r.dest===(o.drops[0]||{}).city);
 const best=pri.filter(r=>r.karoseri===o.body).concat(pri.filter(r=>r.karoseri!==o.body));
 (best[0]?best[0].vendors:[]).forEach(v=>{if(seen.has(v.v))return;seen.add(v.v);out.push({vendor:v.v,group:1,rate:+v.h,priorityId:best[0].priorityId});});
 md.vendorRates.filter(r=>r.kategori===o.unitCategory&&r.origin===o.origin.city&&r.dest===(o.drops[0]||{}).city&&!seen.has(r.vendor)).sort((a,b)=>a.harga-b.harga).forEach(r=>{if(seen.has(r.vendor))return;seen.add(r.vendor);out.push({vendor:r.vendor,group:2,rate:r.harga});});
 out.forEach((c,i)=>{c.rank=i+1;c.status='Queued';});return out;}
function save(o){if(o.status==='Ready to Assign'){if(!o.readyAt)o.readyAt=STORE.now();}else delete o.readyAt;STORE.upsert('orders',o);}
function live(wf){return wf.candidates.findIndex(c=>c.status==='Sent');}
function sendNext(o,from){const wf=o.waterfall;const i=wf.candidates.findIndex(c=>c.status==='Queued');
 if(i<0){if(wf.covered<wf.qty){o.status='Unfulfilled';wf.exhaustedAt=from;STORE.notify({kind:'Action Required',to:['planner','plannerlead'],title:'Unfulfilled: '+o.id,link:'order-detail.html?id='+o.id+'&tab=assignment'});STORE.audit({action:'Waterfall exhausted',obj:o.id,type:'Assignment',actor:'System',role:''});}return null;}
 const c=wf.candidates[i];c.status='Sent';c.sentAt=from;c.deadline=from+vendorSla()*60000;c.offerQty=wf.qty-wf.covered;return c;}
function blast(o,by){o.waterfall={lockedAt:STORE.now(),qty:o.qty||1,covered:0,candidates:candidates(o),paused:false,stopped:false,log:[]};o.status='Assigning';o.assignment=Object.assign(o.assignment||{},{path:'Vendor',blastAt:STORE.now()});
 sendNext(o,STORE.now());STORE.audit({action:'Blast to vendors',detail:o.waterfall.candidates.length+' candidates locked',obj:o.id,type:'Assignment'});save(o);return o;}
function finishIfCovered(o,now){const wf=o.waterfall;if(wf.covered>=wf.qty){wf.candidates.forEach(c=>{if(c.status==='Queued'||c.status==='Sent')c.status='Closed';});
  const sel=wf.candidates.filter(c=>c.status==='Selected');o.status='Assigned';o.assignment=Object.assign(o.assignment||{},{path:'Vendor',vendor:sel[0].vendor,vendors:sel.map(s=>({vendor:s.vendor,qty:s.qty,rate:s.rate})),price:sel[0].rate,assignedAt:now,rank:sel[0].rank});
  STORE.notify({kind:'Info',to:['planner','plannerlead'],title:'Auto-assigned '+sel[0].vendor+' ('+o.id+')',link:'order-detail.html?id='+o.id+'&tab=assignment'});return true;}return false;}
function respond(o,idx,accept,qty,by){const wf=o.waterfall;const c=wf.candidates[idx];const now=STORE.now();
 if(c.status==='No Response'){c.status='Late Response';c.lateAt=now;c.lateAccept=accept;c.qty=qty;STORE.audit({action:'Late response recorded',detail:c.vendor,obj:o.id,type:'Assignment'});save(o);return 'late';}
 c.respAt=now;
 if(!accept){c.status='Not Ready';STORE.audit({action:'Vendor declined',detail:c.vendor,obj:o.id,type:'Assignment'});sendNext(o,now);save(o);return 'rejected';}
 const q=Math.max(1,Math.min(qty||c.offerQty||1,wf.qty-wf.covered));c.status='Selected';c.qty=q;wf.covered+=q;
 STORE.audit({action:'Vendor accepted',detail:c.vendor+', '+q+' unit',obj:o.id,type:'Assignment'});
 if(!finishIfCovered(o,now))sendNext(o,now);save(o);return wf.covered>=wf.qty?'assigned':'partial';}
function skip(o){const wf=o.waterfall;const i=live(wf);if(i<0)return;wf.candidates[i].status='Skipped';wf.candidates[i].respAt=STORE.now();STORE.audit({action:'Skipped vendor',detail:wf.candidates[i].vendor,obj:o.id,type:'Assignment'});sendNext(o,STORE.now());save(o);}
function pause(o){const wf=o.waterfall;const i=live(wf);if(wf.paused){wf.paused=false;if(i>=0)wf.candidates[i].deadline=STORE.now()+(wf.remain||0);STORE.audit({action:'Resumed waterfall',obj:o.id,type:'Assignment'});}
 else{wf.paused=true;if(i>=0)wf.remain=Math.max(0,wf.candidates[i].deadline-STORE.now());STORE.audit({action:'Paused waterfall',obj:o.id,type:'Assignment'});}save(o);}
function stop(o){const wf=o.waterfall;wf.stopped=true;wf.candidates.forEach(c=>{if(c.status==='Sent'||c.status==='Queued')c.status='Closed';});o.status='Ready to Assign';STORE.audit({action:'Stopped waterfall',obj:o.id,type:'Assignment'});save(o);}
function override(o,idx,reason){const wf=o.waterfall;const c=wf.candidates[idx];const now=STORE.now();
 wf.candidates.forEach(x=>{if(x.status==='Selected'&&x!==c){x.status='Closed';wf.covered-=x.qty||0;}});
 c.status='Selected';c.outOfOrder=true;c.qty=wf.qty-wf.covered;c.respAt=now;wf.covered=wf.qty;wf.override={vendor:c.vendor,reason,by:STORE.me().n,at:now};finishIfCovered(o,now);o.assignment.outOfOrder=true;
 STORE.audit({action:'Override vendor',detail:c.vendor+': '+reason,obj:o.id,type:'Assignment'});save(o);}
/* ---------- tick ---------- */
let busy=false;
function tick(){if(busy)return;busy=true;try{const now=STORE.now();
 /* waterfall timers */
 let changed=false;const orders=STORE.get('orders');
 orders.forEach(o=>{const wf=o.waterfall;if(!wf||wf.paused||wf.stopped||o.status!=='Assigning'&&o.status!=='Re-sourcing')return;
  let guard=0;let i=live(wf);while(i>=0&&wf.candidates[i].deadline<=now&&guard++<20){const c=wf.candidates[i];c.status='No Response';c.respAt=c.deadline;changed=true;
   STORE.audit({action:'No response',detail:c.vendor,obj:o.id,type:'Assignment',actor:'System',role:''});const n=sendNext(o,c.deadline);i=n?live(wf):-1;}});
 /* pending dealing: automatic re-check every 5 demo minutes (no manual Re-check); a rate found moves the order to Ready to Assign and notifies (order.js) */
 if(window.ORD&&ORD.autoRecheck)ORD.autoRecheck(now);
 if(changed)STORE.set('orders',orders);
 /* exception SLA: escalate to OpsLog Dept Head; expire at departure */
 const ex=STORE.get('exceptions');let ec=false;
 ex.forEach(e=>{if(e.decision)return;const t=STORE.byId('trips',e.tripId);if(!t)return;
  if(!e.escalated&&now>=e.deadline){e.escalated=true;e.escalatedAt=now;ec=true;STORE.notify({kind:'Action Required',to:['opslog'],title:'PM did not decide: '+e.tripId,link:'exceptions.html?id='+e.id});STORE.audit({action:'Escalated to OpsLog Dept Head',obj:e.tripId,type:'Status',actor:'System',role:''});}
  if(!e.expired&&now>=STORE.ts(t.date,t.out)){e.expired=true;ec=true;STORE.audit({action:'No decision by departure, stays Not Ready',obj:e.tripId,type:'Status',actor:'System',role:''});}});
 if(ec)STORE.set('exceptions',ex);
 /* readiness requests: SLA breach flag */
 const rq=STORE.get('requests');let rc=false;rq.forEach(r=>{if(r.status==='Open'&&!r.breached&&now>r.deadline){r.breached=true;rc=true;}});if(rc)STORE.set('requests',rq);
 }catch(e){console.error(e);}finally{busy=false;}}
window.WATER={candidates,blast,respond,skip,pause,stop,override,tick,live,match,stopsOf,legsOf,get VENDOR_SLA(){return vendorSla();}};
})();
