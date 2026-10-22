/* Dispatch Detail: ONE page for View and Edit of a trip, same layout in both (Edit only makes the fields editable).
   Own Asset: Order Information, 1 Route (calculated first), 2 Unit & Driver (longest idle first, duty and rest shown), 3 Uang Jalan (toll + cost).
   Transporter: Order Information, Plate & Driver (WhatsApp reply read automatically, or typed, or picked from what the vendor registered). No UJ, toll or incentive.
   Three stages, one after the other: 1 Trip Confirmation (check route, distance, toll and uang jalan > Confirm), 2 Trip Assignment (unit and driver > Dispatch), 3 Ready to Depart. Unit & Driver stays locked until the trip is confirmed; Uang Jalan can only be changed in stage 1. Shared logic: ddlib.js. */
(function(){
const {ic,esc,hm}=UI;const {$,$$,DLG,toast,banner}=C;
const {rebuild,unitsFor,driversFor,save,tripCost,ensureTrip,slotOf,statusOf,TONE,lastTrip,endTxt,idleTxt,idleVal,unitOf}=DDL;
const can=STORE.can('plan')||STORE.can('tripEdit'),canNp=can||STORE.can('supply')||STORE.persona()==='vendor';
const ord=id=>STORE.byId('orders',id);
const cityShort=c=>String(c||'').replace(/^(Kota|Kab\.) /,'').split(',')[0];
let tid=UI.q('trip'),oid=UI.q('order');const slot0=+UI.q('slot',1)||1,slots0=+UI.q('slots',1)||1;
let fromList=UI.q('edit')==='1';let editing=fromList;
const t00=tid?STORE.byId('trips',tid):null;const o0=t00?ord(t00.orders[0]):ord(oid);
const bdate=UI.q('date',(t00||o0||{}).date||'');const btab=UI.q('from','all');
const boardUrl='dispatch.html?date='+bdate+'&tab='+btab;const crumb='<a href="'+boardUrl+'">Trip Management</a>';
if(!o0||(STORE.persona()==='vendor'&&!VENDOR.isMine(o0))){if(SHELL.mount({module:'order',id:'dispatch',active:'dispatch',title:'Trip',crumb}))$('#content').innerHTML='<div class="panel"><div class="empty"><b>Trip not found</b><a class="btn ghost" href="'+boardUrl+'">'+ic('left')+'Back to Trip Management</a></div></div>';return;}
const vendor=t00?!!t00.vendor:!!(o0.assignment&&o0.assignment.path==='Vendor');
/* Own Asset order without a trip yet: View shows the same sections from a preview (route calculated, nothing saved); Edit creates the trip */
let tmp=null;const makeTmp=()=>{const x={id:'',type:'DT',date:o0.date,status:'Draft',version:null,toll:null,additions:[],stopOrder:[o0.id]};rebuild(x,[o0]);x.toll=DDL.defaultToll(x);return x;};
const cur=()=>tid?STORE.byId('trips',tid):(vendor?null:(tmp||(tmp=makeTmp())));
let st=null;
const kv=(k,v)=>'<dt>'+k+'</dt><dd>'+(v===''||v==null?'<span class="mut">-</span>':v)+'</dd>';
const urlFor=()=>'?trip='+encodeURIComponent(tid)+'&date='+bdate+'&from='+btab+(fromList?'&edit=1':'');
/* ---------- pickers (own asset): same columns in view and edit, view shows only the chosen row ---------- */
/* the units and drivers behind 3. Unit & Driver: Dedicated = only what is allocated to the project; available first, then the longest idle */
function uRows(t){const os=t.orders.map(ord).filter(Boolean);const x=os[0];const cat=x.unitCategory;
 const match=u=>(u.v.chassis===cat||(cat==='CDE'&&u.v.chassis==='CDD'))&&(!x.body||MD.karMatch(x.body,u.v.body));
 return unitsFor(os,t).map(u=>{const lt=lastTrip('unit',u.v.plate,t);return {plate:u.v.plate,cat:u.v.chassis+' '+u.v.body,ton:u.v.ton,m3:u.v.m3,last:endTxt(lt),idle:idleTxt(lt),idleNum:idleVal(lt),p2h:(function(){const c=DDL.latestCheck('unit',u.v.plate,'p2h',t.date);return c?(c.result==='Pass'?'OK':'NOK'):'';})(),why:u.why||(!match(u)?'Other type':u.l.over?'Over capacity':'')};})
  .sort((a,b)=>(!!a.why)-(!!b.why)||b.idleNum-a.idleNum);}
function dRows(t){return driversFor(t).filter(c=>c.d.own!=='vendor').map(c=>{const lt=lastTrip('driver',c.d.id,t);const tk=DDL.latestCheck('drv',c.d.id,'tenko',t.date);return {id:c.d.id,name:c.d.name,phone:c.d.phone||'',lic:c.d.sim||'',last:endTxt(lt),idle:idleTxt(lt),idleNum:idleVal(lt),dw:c.dw,duty:c.dw.exempt?0:c.dw.duty,tenko:tk?{res:tk.result,when:UI.fdt(tk.at)}:null,why:c.why||(tk&&tk.result==='Unfit'?'Unfit':'')};})
  .sort((a,b)=>(!!a.why)-(!!b.why)||b.idleNum-a.idleNum);}
/* duty of the period that holds this trip: grey = already worked (idle under 8h), navy = this trip, red when over 12h */
function dutyBar(dw){if(dw.exempt)return '<span class="mut">-</span>';const lim=720,w=v=>Math.max(0,Math.min(100,v/lim*100));const over=dw.duty>lim;const A='#94a3b8',B=over?'var(--red-t,#b91c1c)':'var(--navy,#2E3192)';
 return '<div style="width:170px"><div style="display:flex;height:8px;border-radius:4px;background:var(--line2);overflow:hidden"><i style="width:'+w(dw.prior)+'%;background:'+A+'"></i><i style="width:'+w(dw.mine)+'%;background:'+B+'"></i></div><div class="xs mt1 tnum"><b'+(over?' class="errtxt"':'')+'>'+UI.dur(dw.duty)+'</b> / 12h</div></div>';}
const availCol={k:'why',h:'Availability',render:r=>r.why?'<span class="errtxt">'+esc(r.why)+'</span>':'<span class="mut">Available</span>',text:r=>r.why||'Available'};
/* the two tables, with the same column filters and sorting as every other table */
function drawTbls(t,ed){const U=uRows(t).filter(r=>!r.why||(st&&r.plate===st.unit)),D=dRows(t).filter(r=>!r.why||(st&&r.id===st.driver));/* only what is available; the unit / driver already chosen stays visible */
 C.table($('#pu'),{key:'plate',label:'Units',paged:false,rows:()=>U,cols:[
  {k:'_s',h:'',sortable:false,noFilter:true,w:44,render:r=>'<input type="radio" class="cbx" name="pu" value="'+esc(r.plate)+'"'+(r.plate===st.unit?' checked':'')+(ed&&!r.why?'':' disabled')+' aria-label="Select '+esc(r.plate)+'">'},
  {k:'plate',h:'Plate',render:r=>'<b class="plate">'+esc(r.plate)+'</b>'},{k:'cat',h:'Category / Karoseri'},
  {k:'ton',h:'Ton',cls:'num',text:r=>UI.num(r.ton,1)},{k:'m3',h:'M3',cls:'num',text:r=>UI.num(r.m3,1)},
  {k:'p2h',h:'P2H',render:r=>r.p2h?(r.p2h==='NOK'?'<b class="errtxt">NOK</b>':'OK'):'<span class="mut">-</span>'},{k:'last',h:'Last Trip Ended',sortv:r=>-r.idleNum},{k:'idle',h:'Idle',cls:'num',sortv:r=>r.idleNum},...(U.some(r=>r.why)?[availCol]:[])],empty:{text:'No available unit'}});
 C.table($('#pd'),{key:'id',label:'Drivers',order:'keep',paged:false,rows:()=>D,cols:[
  {k:'_s',h:'',sortable:false,noFilter:true,w:44,render:r=>'<input type="radio" class="cbx" name="pd" value="'+esc(r.id)+'"'+(r.id===st.driver?' checked':'')+(ed&&!r.why?'':' disabled')+' aria-label="Select '+esc(r.name)+'">'},
  {k:'name',h:'Driver Name',render:r=>'<b>'+esc(r.name)+'</b>'},{k:'phone',h:'Phone'},{k:'lic',h:'License'},
  {k:'tenko',h:'Latest Tenko',text:r=>r.tenko?r.tenko.res+' '+r.tenko.when:'',render:r=>r.tenko?'<span class="'+(r.tenko.res==='Unfit'?'errtxt':'')+'">'+esc(r.tenko.res)+'</span><div class="xs mut">'+esc(r.tenko.when)+'</div>':'<span class="mut">-</span>'},{k:'last',h:'Last Trip Ended',sortv:r=>-r.idleNum},{k:'idle',h:'Idle',cls:'num',sortv:r=>r.idleNum},
  {k:'duty',h:'Duty',sortv:r=>r.duty,text:r=>UI.dur(r.duty),render:r=>dutyBar(r.dw)},...(D.some(r=>r.why)?[availCol]:[])],empty:{text:'No available driver'}});}
/* Route: the same location cards as the Order (type, name, address, city, coordinates + Maps, Est. Arrival, handling, No DO), plus what the route calculation adds: planned ETA, km and rest */
function routeHtml(t){const fld=(l,v,cls)=>'<div class="od-f'+(cls?' '+cls:'')+'"><span class="od-l">'+l+'</span><span class="od-v">'+(v==null||v===''?'<span class="mut">-</span>':v)+'</span></div>';
 const TONEc={'Pick Up':'pick','Drop Off':'drop',Transit:'transit',Pool:'pool'};const used=new Set();let n=0;
 const cards=t.orders.map(ord).filter(Boolean).map(o=>ORD.stopsOf(o).map(s=>{const i=n++;const has=s.lat!==''&&s.lat!=null&&s.lng!==''&&s.lng!=null;const map=has?'<button type="button" class="btn sm od-mapbtn" data-omap="'+i+'" aria-expanded="false" aria-label="View location '+(i+1)+' on map">'+ic('pin')+'Maps</button>':'';
  const eta=s.eta?esc((s.etaDate?UI.fdate(s.etaDate)+' ':'')+s.eta):'';
  const kind=s.type==='Pick Up'?'pick':s.type==='Drop Off'?'drop':'';const ts=kind?t.stops.find((x,xi)=>x.kind===kind&&x.loc===s.loc&&!used.has(xi)&&used.add(xi)):null;
  return (i>0&&ts&&ts.km?'<li class="od-leg" aria-label="Distance from previous location"><span></span><b class="tnum">'+esc(UI.num(Math.round(ts.km)))+' km</b></li>':'')+'<li class="od-stop"><span class="od-n">'+(i+1)+'</span><div class="od-card"><div class="od-top"><span class="od-type od-t-'+(TONEc[s.type]||'pool')+'">'+esc(s.type)+'</span><b class="od-name">'+esc(s.loc||'-')+'</b>'+'</div>'+
   '<div class="od-addr">'+(s.addr?esc(s.addr):'<span class="mut">No address</span>')+'</div>'+
   '<div class="od-meta">'+fld('City / Regency',esc(ORD.city(s.city||'')))+fld('Coordinates','<span class="od-coord"><span class="tnum">'+(has?esc(s.lat+', '+s.lng):'-')+'</span>'+map+'</span>')+fld('Est. Arrival',eta)+fld('Handling Time',s.handling==null?'':esc(s.handling+' min'))+(kind?fld('Planned ETA',ts?'<b class="tnum">'+hm(ts.eta)+'</b>'+(ts.rest?' <span class="mut sm">&middot; rest '+ts.rest+' min after</span>':''):''):'')+'</div>'+
   (has?'<div class="od-mapbox" data-omapbox="'+i+'" data-lat="'+esc(s.lat)+'" data-lng="'+esc(s.lng)+'" hidden></div>':'')+
   '<div class="od-do"><span class="od-l">No DO</span>'+(s.dos&&s.dos.length?s.dos.map(d=>'<span class="oc-chip od-chip">'+esc(d)+'</span>').join(''):'<span class="mut">-</span>')+'</div></div></li>';}).join('')).join('');
 return '<ol class="od-stops">'+cards+'</ol><div class="od-total"><span class="od-l">Total Distance</span><b class="tnum">'+esc(UI.num(Math.round(DDL.routeKm(t))))+' km</b></div>';}
/* Distance & Time: the numbers the planner needs first, big, with the legs behind the total */
function distHtml(t,o){const legs=(t.stops||[]).map(s=>+s.km||0);const km=Math.round(DDL.routeKm(t));
 const names=t.stops.map(s=>s.loc||'-');
 return PL.stats([{k:'Total Distance',v:UI.num(km)+' km'},{k:'Duration',v:UI.dur(t.durMin||0)},{k:'Start',v:UI.fdate(o.date)+' '+hm(t.out)}])+
 '<div class="mt3">'+legs.slice(1).map((k,i)=>'<div class="row gap2" style="padding:6px 0;border-bottom:1px solid var(--line2)"><span class="u-flex-1">'+esc(names[i])+' <span class="faint">&rarr;</span> '+esc(names[i+1])+'</span><b class="tnum">'+UI.num(Math.round(k))+' km</b></div>').join('')+'</div>';}
/* the maps on the location cards */function wireMaps(){$$('[data-omap]').forEach(b=>b.onclick=()=>{const i=b.dataset.omap;const box=$('[data-omapbox="'+i+'"]');const open=box.hidden;box.hidden=!open;b.setAttribute('aria-expanded',String(open));b.classList.toggle('on',open);b.lastChild.textContent=open?'Hide map':'Maps';
  if(open&&!box._init){box._init=true;ORD.loadLeaflet().then(L=>{const p=[+box.dataset.lat,+box.dataset.lng];const m=L.map(box,{attributionControl:false}).setView(p,16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(m);L.marker(p).addTo(m);setTimeout(()=>m.invalidateSize(),80);}).catch(()=>{box.innerHTML='<div class="mut sm u-padding-s4">Map needs internet.</div>';});}});}
/* what must be settled before unit and driver can be assigned: route complete, toll set (UJ rates missing in Master Data only warn, they cannot be fixed here) */
function gates(t){const tl=t.toll;const ev=DOM.tollEval(tl,(unitOf(t)||{chassis:t.chassis||'CDD'}).chassis,t.date);
 const route=!!(t.stops&&t.stops.length>=2&&t.stops.every(s=>s.loc)&&(t.km||0)>0);const toll=t.vendor?true:!!(tl&&tl.cond&&(tl.cond==='none'||(!ev.missing&&!ev.unavail)));
 const miss=t.vendor?[]:DOM.cost(tripCost(t,st&&st.unit)).rec.filter(r=>r.miss&&r.k!=='Tol').map(r=>r.k);
 return {route,toll,miss,ok:route&&toll};}
/* 3. Unit & Driver: in Edit it opens only when route and toll are settled (flow: everything first, unit and driver last) */
function drawUD(){const t=cur();const host=$('#ud');if(!host||!t)return;const g=gates(t);
 if(statusOf(tid?t:null,false)==='Trip Confirmation'){host.innerHTML='<div class="mut sm">Locked until the trip is confirmed</div>';return;}
 if(editing&&!g.ok){host.innerHTML=banner('warn','Finish the route'+(g.toll?'':' and toll')+' first.',{sm:1});return;}
 if(!st.init){st.init=true;if(editing){if(!st.unit){const s=uRows(t).find(u=>!u.why);if(s)st.unit=s.plate;}if(!st.driver){const s=dRows(t).find(d=>!d.why);if(s)st.driver=s.id;}}}
 host.innerHTML='<div class="sect mb2">Unit</div><div id="pu" style="max-height:380px;overflow:auto"></div><div class="sect mt4 mb2">Driver</div><div id="pd" style="max-height:380px;overflow:auto"></div>';drawTbls(t,editing);}
/* 2. Plate & Driver of a Transporter trip: its registered units and drivers in the same tables as the planner's, or type them when not registered */
const PLATE_RE=/^([A-Z]{1,2})\s?(\d{1,4})\s?([A-Z]{1,3})$/;
function vRows(t){const o=ord(t.orders[0])||o0;const vn=t.vendor;const dd=MD.get().dd;
 const U=dd.vehicles.filter(v=>v.own==='vendor'&&v.vendor===vn&&v.status==='Active').map(v=>{const b=DOM.unitBusy(v.plate,t);const ok=(v.chassis===o.unitCategory||(o.unitCategory==='CDE'&&v.chassis==='CDD'))&&(!o.body||MD.karMatch(o.body,v.body));const lt=lastTrip('unit',v.plate,t);const c=DDL.latestCheck('unit',v.plate,'p2h',t.date);return {plate:v.plate,cat:v.chassis+' '+v.body,ton:v.ton,m3:v.m3,last:endTxt(lt),idle:idleTxt(lt),idleNum:idleVal(lt),p2h:c?(c.result==='Pass'?'OK':'NOK'):'',why:b?'On '+b.id.slice(-4):!ok?'Other type':''};}).sort((a,b)=>(!!a.why)-(!!b.why)||b.idleNum-a.idleNum||a.plate.localeCompare(b.plate));
 const D=dd.drivers.filter(d=>d.own==='vendor'&&d.vendor===vn&&d.status==='Active').map(d=>{const lt=lastTrip('driver',d.id,t);const tk=DDL.latestCheck('drv',d.id,'tenko',t.date);const dw=DOM.dutyWith(d.id,t);const lv=DOM.onLeave(d.id,t.date);return {id:d.id,name:d.name,phone:d.phone||'',lic:d.sim||'',last:endTxt(lt),idle:idleTxt(lt),idleNum:idleVal(lt),dw,duty:dw.exempt?0:dw.duty,tenko:tk?{res:tk.result,when:UI.fdt(tk.at)}:null,why:lv?'On leave':dw.busy?'Busy':!dw.exempt&&dw.duty>720?'Over 12h':d.simExp<t.date?'SIM expired':(tk&&tk.result==='Unfit'?'Unfit':'')};}).sort((a,b)=>(!!a.why)-(!!b.why)||b.idleNum-a.idleNum||a.name.localeCompare(b.name));
 return {U,D};}
/* On Call is sourced from a Transporter and its plate and driver already come from what the vendor reported (Daily Availability) or sent: nothing to choose, only shown */
const ocGiven=t=>{if(!t||!t.unit)return false;const o=ord(t.orders[0])||{};return o.ptype==='On Call'||(ORD.project(o)||{}).ptype==='On Call';};
function drawVendor(){const t=cur();const host=$('#vd');if(!host)return;
 if(ocGiven(t)){host.innerHTML='<dl class="kv2">'+kv('Plate','<b class="plate">'+esc(t.unit)+'</b>')+kv('Driver Name',esc(t.vendorDriver||''))+kv('Phone',esc(t.vendorPhone||''))+kv('Received via',esc(t.nopolVia||''))+'</dl>';return;}
 if(!t||statusOf(t,true)==='Trip Confirmation'){host.innerHTML='<div class="mut sm">Locked until the trip is confirmed</div>';return;}
 const {U:U0,D:D0}=vRows(t);if(!st.init){st.init=true;const d0=D0.find(x=>x.name===t.vendorDriver);if(d0)st.driver=d0.id;}
 /* only what is available (same as Own Asset); the unit / driver already chosen stays visible */
 const U=U0.filter(r=>!r.why||r.plate===(st.unit||t.unit)),D=D0.filter(r=>!r.why||r.id===st.driver);
 const typed=!!t.unit&&!U.some(u=>u.plate===t.unit);const dis=editing?'':' disabled';
 /* a unit / driver that is not registered is added ad hoc: the fields only show after "Add Adhoc" (or when the trip already carries one) */
 const adOpen=typed||!!st.adhoc;
 host.innerHTML='<div class="sect mb2">Unit</div><div id="vu" style="max-height:340px;overflow:auto' +(adOpen?';opacity:.55':'')+'"></div><div class="sect mt4 mb2">Driver</div><div id="vdr" style="max-height:340px;overflow:auto'+(adOpen?';opacity:.55':'')+'"></div>'+
  '<div class="mt4" id="adhoc">'+(adOpen?'<div class="row mb2"><div class="sect">Adhoc unit &amp; driver</div><span class="sp"></span>'+(editing&&!typed?'<button type="button" class="btn sm" id="adx">Cancel</button>':'')+'</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'+C.field('Plate','<input class="input" id="vpl" placeholder="B 1234 XYZ" value="'+esc(typed?t.unit:'')+'"'+dis+'>',{for:'vpl'})+C.field('Driver Name','<input class="input" id="vdn" value="'+esc(typed?t.vendorDriver||'':'')+'"'+dis+'>',{for:'vdn'})+C.field('Phone','<input class="input" id="vdp" placeholder="+62" value="'+esc(typed?t.vendorPhone||'':'')+'"'+dis+'>',{for:'vdp'})+'</div>':(editing?'<button type="button" class="btn" id="adh">'+ic('plus')+'Add Adhoc</button>':''))+'</div>';
 const adh=$('#adh',host);if(adh)adh.onclick=()=>{st.adhoc=true;st.unit='';st.driver='';drawVendor();const p=document.getElementById('vpl');if(p)p.focus();};const adx=$('#adx',host);if(adx)adx.onclick=()=>{st.adhoc=false;drawVendor();};
 const ed=editing&&!adOpen;/* adhoc chosen: the registered units / drivers above are only shown, not selectable */
 /* same columns as the Own Asset pickers (Unit & Driver of an Own Asset trip) */
 C.table($('#vu'),{key:'plate',label:'Available units',paged:false,rows:()=>U,cols:[
  {k:'_s',h:'',sortable:false,noFilter:true,w:44,render:r=>'<input type="radio" class="cbx" name="pu" value="'+esc(r.plate)+'"'+(r.plate===(st.unit||t.unit)?' checked':'')+(ed&&!r.why?'':' disabled')+' aria-label="Select '+esc(r.plate)+'">'},
  {k:'plate',h:'Plate',render:r=>'<b class="plate">'+esc(r.plate)+'</b>'},{k:'cat',h:'Category / Karoseri'},
  {k:'ton',h:'Ton',cls:'num',text:r=>UI.num(r.ton,1)},{k:'m3',h:'M3',cls:'num',text:r=>UI.num(r.m3,1)},
  {k:'p2h',h:'P2H',render:r=>r.p2h?(r.p2h==='NOK'?'<b class="errtxt">NOK</b>':'OK'):'<span class="mut">-</span>'},{k:'last',h:'Last Trip Ended',sortv:r=>-r.idleNum},{k:'idle',h:'Idle',cls:'num',sortv:r=>r.idleNum},...(U.some(r=>r.why)?[availCol]:[])],empty:{text:'No available unit for this transporter'}});
 C.table($('#vdr'),{key:'id',label:'Available drivers',order:'keep',paged:false,rows:()=>D,cols:[
  {k:'_s',h:'',sortable:false,noFilter:true,w:44,render:r=>'<input type="radio" class="cbx" name="pd" value="'+esc(r.id)+'"'+(r.id===st.driver?' checked':'')+(ed&&!r.why?'':' disabled')+' aria-label="Select '+esc(r.name)+'">'},
  {k:'name',h:'Driver Name',render:r=>'<b>'+esc(r.name)+'</b>'},{k:'phone',h:'Phone'},{k:'lic',h:'License'},
  {k:'tenko',h:'Latest Tenko',text:r=>r.tenko?r.tenko.res+' '+r.tenko.when:'',render:r=>r.tenko?'<span class="'+(r.tenko.res==='Unfit'?'errtxt':'')+'">'+esc(r.tenko.res)+'</span><div class="xs mut">'+esc(r.tenko.when)+'</div>':'<span class="mut">-</span>'},{k:'last',h:'Last Trip Ended',sortv:r=>-r.idleNum},{k:'idle',h:'Idle',cls:'num',sortv:r=>r.idleNum},
  {k:'duty',h:'Duty',sortv:r=>r.duty,text:r=>UI.dur(r.duty),render:r=>dutyBar(r.dw)},...(D.some(r=>r.why)?[availCol]:[])],empty:{text:'No available driver for this transporter'}});}
/* ---------- page ---------- */
/* Publish this trip (bottom of the page): needs unit, driver, route and toll; after the cut-off a reason is required */
function publishIt(){const t=cur();if(!t||!t.unit||!(t.vendor?t.vendorDriver:t.driver)){toast('Assign unit and driver first',{tone:'warn'});return;}const again=statusOf(t,!!t.vendor)==='Ready to Depart'&&!!t.changed;if(statusOf(t,!!t.vendor)!=='Trip Assignment'&&!again){toast(again?'Nothing changed since the last dispatch':'Confirm the trip first',{tone:'warn'});return;}const g=gates(t);if(!g.ok){toast('Finish the route and toll first',{tone:'warn'});return;}
  DDL.publishTrip(t);toast((again?'Dispatched again ':'Dispatched ')+t.id);st=null;render();}
/* Save stays on the page in view mode, so Publish (bottom of the page) is right there; Cancel goes back to where Edit came from */
/* Stage 1 > 2: everything checked (route and toll complete), the trip moves to Trip Assignment and opens straight in Edit to assign */
function confirmIt(){const t=cur();if(!t||!tid){toast('Open Edit first',{tone:'warn'});return;}const g=gates(t);if(!g.ok){toast('Finish the route and toll first',{tone:'warn'});return;}
 DDL.confirmTrip(t);toast('Confirmed '+t.id+', now Trip Assignment');fromList=false;editing=true;st=null;history.replaceState(null,'',urlFor());render();const u=document.getElementById('ud')||document.getElementById('vd');if(u)u.scrollIntoView();}
/* Stage 2 > 1: take the trip back to confirmation (uang jalan can be changed again) */
function reopenIt(){const t=cur();DDL.reopenTrip(t);toast(t.id+' is back in Trip Confirmation');editing=false;st=null;render();}
function afterSave(){fromList=false;editing=false;st=null;history.replaceState(null,'',urlFor());render();window.scrollTo(0,document.body.scrollHeight);}
function render(){let t=cur();const real=!!tid;const o=t?(ord(t.orders[0])||o0):o0;
 const vStatus=vendor?statusOf(real?t:null,true):'';
 const editable=vendor?(canNp&&real&&vStatus==='Trip Assignment'&&!ocGiven(t)):can&&(!real||t.status!=='Converted');if(editing&&!editable)editing=false;
 if(editing&&!vendor&&!real){t=ensureTrip(o0,slot0,slots0);tid=t.id;tmp=null;history.replaceState(null,'',urlFor());}
 const isReal=!!tid;
 if(t&&!st)st={unit:t.unit||'',driver:'',init:false};
 const status=statusOf(isReal?t:null,vendor);const sl=isReal&&t?slotOf(t):{slot:slots0>1?slot0:0,slots:slots0};const lab=sl.slot?' ('+sl.slot+'/'+sl.slots+')':'';
 const canConfirm=isReal&&can&&!editing&&status==='Trip Confirmation';const repub=!vendor&&isReal&&can&&!editing&&status==='Ready to Depart'&&!!t.changed;const canPub=repub||(isReal&&can&&!editing&&status==='Trip Assignment'&&!!t.unit&&(vendor?!!t.vendorDriver:!!t.driver));const pubLbl=repub?'Dispatch again':'Dispatch';const ujEdit=!vendor&&editing;const gt=isReal&&t?gates(t):{ok:true,route:true,toll:true}; if(!SHELL.mount({module:'order',id:'dispatch',active:'dispatch',title:(isReal&&t?t.id:o.id)+lab,crumb,
  actions:editing?'<button type="button" class="btn" id="cancel">Cancel</button><button type="button" class="btn" id="save">Save</button>'+(status==='Trip Confirmation'?'<button type="button" class="btn primary" id="savecon">Save &amp; Confirm</button>':status==='Trip Assignment'?'<button type="button" class="btn primary" id="savepub">Save &amp; Dispatch</button>':'')
   :(isReal?'<button type="button" class="btn" id="hist">'+ic('history')+'History</button>':'')+((can||canNp)?'<button type="button" class="btn" id="edit"'+(editable?'':' disabled')+'>'+ic('edit')+'Edit</button>':'')+(canConfirm?'<button type="button" class="btn primary" id="conTop">'+ic('check')+'Confirm Trip</button>':'')+(canPub?'<button type="button" class="btn primary" id="pubTop">'+ic('send')+pubLbl+'</button>':'')}))return;
 const pl=t?(t.unit||''):'';
 const info='<div class="panel"><div class="panel-hd"><h3>Order Information</h3></div><div class="body"><div class="grid2"><dl class="kv2">'+kv('Order ID',esc(o.id)+lab)+kv('Order Date',o.createdAt?UI.fdt(o.createdAt):'')+kv('Customer Name',esc(o.customer))+kv('Customer Project',esc(o.projectName||(ORD.project(o)||{}).name))+kv('Project Type',esc(o.ptype||(ORD.project(o)||{}).ptype||''))+kv('Fulfillment by Ownership',esc(ORD.fulfillment(o)))+kv('Route',esc(ORD.route(o)))+kv('Service Level',UI.sl(o.sl))+'</dl><dl class="kv2">'+kv('Status',UI.status(status,TONE[status]))+kv('Trip ID',isReal&&t?'<span class="mono">'+esc(t.id)+'</span>':'')+kv('Delivery Start Date',t?UI.fdate(o.date)+' '+hm(t.out):UI.fdate(o.date)+' '+esc((o.window||[''])[0]))+(STORE.persona()==='vendor'?'':kv('Assigned To',vendor?'Transporter':'Own Asset'))+(STORE.persona()==='vendor'?'':kv('Transporter',vendor?esc((t&&t.vendor)||(o.assignment||{}).vendor||(((o.assignment||{}).vendors||[])[0]||{}).vendor||''):''))+(vendor&&t&&t.nopolVia?kv('Received via',esc(t.nopolVia)):'')+(vendor&&t&&t.vendorRate&&STORE.can('vendorRate')?kv('Vendor Rate',UI.rp(t.vendorRate)):'')+kv('Unit Category',esc(o.unitCategory))+kv('Karoseri',esc(o.body))+kv('Tonase',o.ton==null?'':UI.num(o.ton,1)+' ton')+kv('Volume',o.m3==null?'':UI.num(o.m3,1)+' m3')+'</dl></div></div></div>';
 let h='<div class="stack">'+info;let after=null;
 if(!t){
  h+='<div class="panel"><div class="body"><div class="hint">Not planned yet.</div></div></div>';
 }else{
  h+='<div class="panel"><div class="panel-hd"><h3>1. Route</h3>'+(t.longhaul?UI.lh():'')+'</div><div class="body">'+routeHtml(t)+'</div></div>'+
   (vendor?'<div class="panel"><div class="panel-hd"><h3>2. Plate &amp; Driver</h3>'+'</div><div class="body" id="vd"></div></div>'
   :'<div><div class="sect mb2">2. Uang Jalan</div><div id="tl"></div><div id="cpx" class="mt3 ujpage"></div></div><div class="panel"><div class="panel-hd"><h3>3. Unit &amp; Driver</h3></div><div class="body" id="ud"></div></div>')+
   (isReal&&!editing&&((can&&status==='Trip Assignment')||canConfirm||canPub)?'<div class="panel"><div class="body row gap3"><span class="sp"></span>'+
    (can&&status==='Trip Assignment'?'<button type="button" class="btn" id="reopen">Back to Trip Confirmation</button>':'')+(canConfirm?'<button type="button" class="btn primary" id="con"'+(gt.ok?'':' disabled')+'>'+ic('check')+'Confirm Trip</button>':'')+(canPub?'<button type="button" class="btn primary" id="pub">'+ic('send')+pubLbl+'</button>':'')+'</div></div>':'');
 } h+='</div>';$('#content').innerHTML=h;
 /* header buttons */
 const g=id=>$('#'+id);
 if(g('hist'))g('hist').onclick=()=>PANELS.history({obj:t.id,title:t.id,types:['Dispatch']});
 if(g('edit'))g('edit').onclick=()=>{editing=true;st=null;render();};
 if(g('cancel'))g('cancel').onclick=()=>{if(fromList){location.href=boardUrl;return;}editing=false;st=null;render();};
 if(g('pub'))g('pub').onclick=publishIt;if(g('pubTop'))g('pubTop').onclick=publishIt;if(g('con'))g('con').onclick=confirmIt;if(g('conTop'))g('conTop').onclick=confirmIt;if(g('reopen'))g('reopen').onclick=reopenIt;
 if(vendor){
  if(t){drawVendor();wireMaps();}
  if(editing){
   $('#content').onchange=e=>{const n=e.target;if(n.name==='pu'||n.name==='pd'){if(n.name==='pu')st.unit=n.value;else st.driver=n.value;['vpl','vdn','vdp'].forEach(i=>{const x=document.getElementById(i);if(x)x.value='';});}};
   const saveV=pub=>{const tr=cur();const vplEl=document.getElementById('vpl');const tp=vplEl?(vplEl.value||'').trim().toUpperCase():'';let plate='',driver='',phone='';
    if(tp){const m=tp.match(PLATE_RE);plate=m?m[1]+' '+m[2]+' '+m[3]:'';driver=document.getElementById('vdn').value.trim();phone=document.getElementById('vdp').value.trim();let ok=C.setErr(document.getElementById('vpl'),plate?'':'Use format B 1234 XYZ');ok=C.setErr(document.getElementById('vdn'),driver?'':'Required')&&ok;if(!ok)return;}
    else{plate=st.unit;const d=MD.driver(st.driver);driver=d?d.name:'';phone=d?d.phone||'':'';if(!plate||!driver){toast('Choose a unit and a driver, or type them',{tone:'warn'});return;}}
    DDL.fillVendorTrip(tr,plate,driver,phone,'Trip Management',!pub);toast(pub?'Saved '+tr.id+', Ready to Depart':'Saved '+tr.id);afterSave();};
    g('save').onclick=()=>saveV(false);if(g('savepub'))g('savepub').onclick=()=>saveV(true);
  } else $('#content').onchange=null;
  return;} if(!t)return;
 /* own asset: toll + cost (editable only in edit mode) */
 const TP=PANELS.toll($('#tl'),{scope:'Toll',toll:()=>cur().toll,chassis:()=>(MD.vehicle(st.unit)||unitOf(cur())||{chassis:cur().chassis||'CDD'}).chassis,date:()=>cur().date,editable:ujEdit,per:'trip',obj:t.id,onChange:x=>{const tr=cur();tr.toll=x;if(tr.status==='Published')tr.changed=true;save(tr);CP.render();drawUD();}});
 const baseAdds=tr=>DDL.addsOf(tr,MD.project(tr.projectId)||{});/* additions not touched yet = the customer project's Additional Charges */
 const CP=PANELS.cost($('#cpx'),{scope:'Uang Jalan',vendor:false,noInc:true,editable:ujEdit,addScope:'trip',input:()=>tripCost(cur(),st.unit),
  onAdd:a=>{const tr=cur();const bs=baseAdds(tr);tr.addTouched=true;tr.additions=bs.concat([{comp:a.comp,amt:a.amt,reason:a.reason,by:a.by,at:a.at}]);if(tr.status==='Published')tr.changed=true;save(tr,'Added '+a.comp,UI.rp(a.amt));CP.render();},
  onRemove:a=>{const tr=cur();const bs=baseAdds(tr);tr.addTouched=true;tr.additions=bs.filter(x=>!(x.comp===a.comp&&x.amt===a.amt&&x.reason===a.reason));if(tr.status==='Published')tr.changed=true;save(tr,'Removed '+a.comp);CP.render();},
  onEditAdd:(a,amt)=>{const tr=cur();const bs=baseAdds(tr);tr.addTouched=true;tr.additions=bs.map(x=>x.comp===a.comp&&x.amt===a.amt&&x.reason===a.reason?Object.assign({},x,{amt}):x);if(tr.status==='Published')tr.changed=true;save(tr,'Edited '+a.comp,UI.rp(amt));CP.render();},
  onOverride:(k,v)=>{const tr=cur();tr.ujOverride=Object.assign({},tr.ujOverride);if(v==null)delete tr.ujOverride[k];else tr.ujOverride[k]=v;if(tr.status==='Published')tr.changed=true;save(tr,(v==null?'Reset ':'Edited ')+k,v==null?'':UI.rp(v));CP.render();},
  onToll:x=>{const tr=cur();tr.toll=x;save(tr);CP.render();}});
 drawUD();wireMaps();
 if(editing){
  $('#content').onchange=e=>{const n=e.target;if(n.name==='pu'){st.unit=n.value;CP.render();TP.render();}else if(n.name==='pd')st.driver=n.value;};
  const saveAssign=()=>{const x=cur();if(!gates(x).ok){toast('Finish the route and toll first',{tone:'warn'});return false;}const os=x.orders.map(ord).filter(Boolean);const bu=x.unit,bd=x.driver;x.unit=st.unit||null;x.driver=st.driver||null;rebuild(x,os);if(x.status==='Published'&&(bu!==x.unit||bd!==x.driver))x.changed=true;
   save(x,'Assigned '+x.id,'Unit '+(bu||'-')+' to '+(x.unit||'-')+', driver '+((MD.driver(bd)||{}).name||'-')+' to '+((MD.driver(x.driver)||{}).name||'-'));
   toast(x.unit&&x.driver?'Saved '+x.id:'Saved, unit or driver still missing',x.unit&&x.driver?undefined:{tone:'warn'});return true;};
  g('save').onclick=()=>{if(status==='Trip Confirmation'){toast('Saved');afterSave();return;}if(saveAssign())afterSave();};
  if(g('savecon'))g('savecon').onclick=()=>{if(!gates(cur()).ok){toast('Finish the route and toll first',{tone:'warn'});return;}afterSave();confirmIt();};
  if(g('savepub'))g('savepub').onclick=()=>{if(!saveAssign())return;afterSave();publishIt();};} else $('#content').onchange=null;}
render();
})();
