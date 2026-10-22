/* Order & Delivery shared helpers (DEV-C, 2026-10-19 feedback):
   - capture status: Draft | Ready to Assign | Cancelled (internal workflow statuses stay as they are for Dealing / Assignment / Dispatch)
   - order = ordered stops (Pool | Pick Up | Drop Off | Transit), each with est. arrival, handling time and DO numbers
   - dealing runs automatically: no rate -> Draft (Pending Dealing internally) + Sales tagged automatically; rate found -> Ready to Assign + notification
   - New Order popup (searchable Plan ID / Customer Name / Project Name that fill each other), Bulk Order (Excel), export rows, region / project info.
   Legacy fields (origin, drops, window, m3, ton, qty) are always kept in sync from the stops so Dispatch / Convert / Monitoring keep working. */
(function(){
'use strict';
const {ic,esc}=UI;const {$,$$,DLG,toast}=C;
const TYPES=['Pool','Pick Up','Drop Off','Transit'];
const DRAFTISH=['Draft','Need Clarification','Pending Dealing','Submitted'];
const REASONS=['Customer cancelled','Unfulfilled','No rate agreed','Duplicate','No unit available','Other'];
function city(c){return String(c||'').replace(/^(Kota|Kab\.) /,'').split(',')[0];}
function cityOfLoc(n){return (MD.location(n)||{}).city||'';}
function route(o){const d=o.drops||[];return city((o.origin||{}).city||(o.origin||{}).loc)+' to '+city((d[0]||{}).city||(d[0]||{}).loc)+(d.length>1?', '+d.length+' drops':'');}
function cust(o){return (o.customer||'').replace(/^PT /,'').split(' ').slice(0,2).join(' ');}
function src(o){return esc(o.source||'-');}
function planId(o){const p=DOM.allPlans().find(x=>x.project===o.project);return p?p.id:'';}
function pickup(o){return UI.fdate(o.date,{noYear:1})+' '+((o.window||[])[0]||'');}
function byId(id){return STORE.byId('orders',id);}
function project(o){return o?(MD.project(o.project)||MD.project(o.projectName)||null):null;}
function markReady(o){if(o.status==='Ready to Assign'){if(!o.readyAt)o.readyAt=STORE.now();}else delete o.readyAt;}
/* every time an order is saved (new, edit, import, dealing) the Dedicated orders that are ready are re-evaluated: enough allocation = Assigned automatically */
let sweeping=false;
function save(o,action,detail){markReady(o);STORE.upsert('orders',o);if(action)STORE.audit({action,detail,obj:o.id,type:'Order'});if(!sweeping&&window.ASSIGNQ&&ASSIGNQ.sweep){sweeping=true;try{ASSIGNQ.sweep();}finally{sweeping=false;}}return o;}
function newId(date){const n=STORE.get('orders').filter(o=>o.date===date).reduce((a,o)=>Math.max(a,+o.id.slice(-4)),0)+1;return 'ORD-'+date.replace(/-/g,'')+'-'+String(n).padStart(4,'0');}
/* ---------- status ---------- */
function capStatus(o){const s=o.status;if(DRAFTISH.indexOf(s)>=0)return 'Draft';if(s==='Ready to Assign')return 'Ready to Assign';if(s==='Dropped'||s==='Cancelled')return 'Cancelled';return null;}
/* shown status: Planned = Assigned (it is on the Trip Management), Re-sourcing / Unfulfilled = Assigning (still being sourced); the stored status keeps its value */
const SHOW={Planned:'Assigned','Re-sourcing':'Assigning',Unfulfilled:'Assigning'};
function statusText(o){return capStatus(o)||SHOW[o.status]||o.status;}
/* Assigned / Planned with no plate or driver yet: plain gray text under the status */
function unitPending(o){if(['Assigned','Planned'].indexOf(o.status)<0)return false;const tr=STORE.get('trips').filter(t=>(t.orders||[]).indexOf(o.id)>=0);if(tr.length)return tr.some(t=>!t.unit||!(t.driver||t.vendorDriver));const a=o.assignment||{};return !a.plate&&!(a.units||[]).length;}
/* the gray pending text opens the trip where plate and driver are set (Trip Management), or the order when the role cannot open it */
function pendingHref(o){const tr=STORE.get('trips').find(t=>(t.orders||[]).indexOf(o.id)>=0&&(!t.unit||!(t.driver||t.vendorDriver)));return tr&&ROLES.canView('dispatch')?'dispatch-detail.html?trip='+encodeURIComponent(tr.id)+'&from=all':'order-detail.html?id='+encodeURIComponent(o.id);}
function statusCell(o){return UI.status(statusText(o))+(unitPending(o)?'<div class="xs"><a class="mut" href="'+esc(pendingHref(o))+'">Unit &amp; driver pending</a></div>':'');}
const inAssignment=o=>['Ready to Assign','Assigning','Re-sourcing','Unfulfilled','Assigned','Planned'].indexOf(o.status)>=0;
/* Leaflet (OpenStreetMap) is loaded from the CDN only when a map is opened */
let leafP=null;
function loadLeaflet(){if(window.L)return Promise.resolve(window.L);if(leafP)return leafP;
 leafP=new Promise((res,rej)=>{const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';document.head.appendChild(css);
  const js=document.createElement('script');js.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';js.onload=()=>res(window.L);js.onerror=()=>{leafP=null;rej(new Error('offline'));};document.head.appendChild(js);});return leafP;}
/* ---------- stops ---------- */
/* a stop carries its own address + lat/long: from Master Data (read only) or typed / found on the map (custom) */
const blankStop=t=>({type:t||'Pick Up',loc:'',city:'',addr:'',lat:'',lng:'',custom:false,etaDate:'',eta:'',handling:null,dos:[]});
const masterLoc=n=>n?(MD.get().dd.locations.find(l=>l.name===n)||null):null;
const numS=v=>v===''||v==null||isNaN(+v)?'':String(v);
/* every location has coordinates: Master Data location first, else the planning / city reference (orders created by import or older data carry only a place or city name) */
/* mandatory per location: Est. Arrival (date + time) and Handling (Pick Up / Drop Off). Orders that came without them get a planned value: first stop at the delivery start, next stops after handling + driving at 40 km/h (straight line x1.3), handling 30 min */
const km=(a,b)=>{if(a.lat===''||b.lat===''||a.lng===''||b.lng==='')return 25;const R=6371,r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lng-a.lng)*r;const h=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))*1.3;};
function fillPlan(o,out){let day=o.date||STORE.today();let t=UI.parseHM((o.window||[])[0]);if(t==null)t=480;let prev=null;
 out.forEach((s,i)=>{if((s.type==='Pick Up'||s.type==='Drop Off')&&s.handling==null)s.handling=30;
  if(s.eta&&UI.parseHM(s.eta)!=null){t=UI.parseHM(s.eta);if(s.etaDate)day=s.etaDate;else s.etaDate=day;}
  else{if(prev)t+=(prev.handling||0)+Math.round(km({lat:+prev.lat,lng:+prev.lng},{lat:+s.lat,lng:+s.lng})/40*60);
   while(t>=1440){t-=1440;day=UI.addDays(day,1);}s.eta=UI.hm(t);s.etaDate=day;}
  prev=s;});return out;}
function stopsOf(o){const s=WATER.stopsOf(o);const out=s.map(x=>{const m=masterLoc(x.loc);const ref=m||MD.location(x.loc)||MD.location(x.city)||null;const custom=x.custom!=null?!!x.custom:(!!x.loc&&!ref);const use=!custom&&ref;
 return {type:x.type,loc:x.loc||'',city:(use?ref.city:x.city)||x.city||cityOfLoc(x.loc),addr:(use?(ref.address||x.addr||(x.loc?x.loc+(ref.city?', '+ref.city:''):'')):x.addr)||'',lat:numS(use?ref.lat:x.lat),lng:numS(use?ref.lng:x.lng),custom,etaDate:x.etaDate||'',eta:x.eta||'',handling:x.handling==null||x.handling===''?null:x.handling,dos:(x.dos||[]).slice()};});return fillPlan(o,out);}
/* derive the legacy fields from stops + order level load */
function sync(o){const st=o.stops||[];const pk=st.find(s=>s.type==='Pick Up')||st.find(s=>s.type!=='Drop Off')||{};const dr=st.filter(s=>s.type==='Drop Off');
 o.origin={loc:pk.loc||'',city:pk.city||''};const vol=+o.m3||0,ton=+o.ton||0;const n=Math.max(1,dr.length);
 o.drops=(dr.length?dr:[{loc:'',city:''}]).map(d=>({loc:d.loc||'',city:d.city||'',m3:+(vol/n).toFixed(2),ton:+(ton/n).toFixed(2)}));
 o.m3=vol;o.ton=ton;if(!o.qty)o.qty=1;return o;}
/* ---------- dealing (automatic) ---------- */
function liveDealing(o){const frozen=o.dealing&&o.dealing.legs&&!capStatus(o);return frozen?o.dealing:WATER.match(o);}
function legText(l){return city(l.from)+' to '+city(l.to);}
function missingLegs(o){return (liveDealing(o).legs||[]).filter(l=>!l.rate);}
function missingText(o){return missingLegs(o).map(legText).join('; ');}
function dealingOk(o){if(o.dealing&&o.dealing.status==='Override')return true;const m=liveDealing(o);return m.status!=='No rate';}
/* Sales is tagged by the WhatsApp chatbot automatically: no button, no column. The tag is only visible in History. */
function tagSales(o,quiet){if(o.tagLogged)return;o.tagLogged=true;const had=!!o.salesTag;if(!had)o.salesTag='Tagged '+UI.ftime(STORE.now());const miss=missingText(o)||'no route';
 STORE.audit({action:'Sales tagged automatically (WhatsApp)',detail:miss,obj:o.id,type:'Dealing',actor:'System',role:''});
 if(!had&&!quiet)STORE.notify({kind:'Action Required',to:['sales'],title:'Add rate: '+o.id+', '+miss,link:'order-detail.html?id='+o.id});}
function runDealing(o,opt){opt=opt||{};const m=WATER.match(o);const now=STORE.now();o.dealing=m;
 if(m.status==='No rate'){if(o.status!=='Pending Dealing'||!o.pendingSince)o.pendingSince=now;o.status='Pending Dealing';o.recheckAt=now+5*60000;if(!opt.quiet)tagSales(o);else o.tagLogged=true;}
 else{o.status='Ready to Assign';delete o.recheckAt;}
 return m;}
function recheckOne(o){const m=WATER.match(o);const now=STORE.now();
 if(m.status==='No rate'){o.dealing=m;o.recheckAt=now+5*60000;return false;}
 o.dealing=Object.assign(m,{autoRecheck:now});o.status='Ready to Assign';delete o.recheckAt;markReady(o);return true;}
function notifyReady(list){list.forEach(o=>{STORE.notify({kind:'Action Required',to:['planner'],title:'Ready to Assign: '+o.id+' ('+route(o)+')',link:'order-detail.html?id='+o.id+'&tab=assignment'});
  STORE.notify({kind:'Info',to:['sales'],title:'Rate found for '+o.id+', order is Ready to Assign',link:'order-detail.html?id='+o.id});});
 if(['planner','pm','sales'].indexOf(STORE.persona())>=0)toast(list.length===1?list[0].id+' is Ready to Assign, rate found':list.length+' orders are Ready to Assign, rates found',{action:ROLES.canTab('inbox','assignment')?{label:'Open',fn:()=>{location.href='order-inbox.html?tab=assignment';}}:null});}
/* every 5 demo minutes (water.js tick), when Master Data changes (md-change) and when an order page opens */
function autoRecheck(now,force){const all=STORE.get('orders');const list=all.filter(o=>o.status==='Pending Dealing'&&(force||now>=(o.recheckAt||0)));if(!list.length)return [];
 const done=[];list.forEach(o=>{if(recheckOne(o))done.push(o);});STORE.set('orders',all);
 done.forEach(o=>STORE.audit({action:'Rate found, moved to Ready to Assign',detail:route(o),obj:o.id,type:'Dealing',actor:'System',role:''}));
 if(done.length)notifyReady(done);return done;}
function ensureTags(){const all=STORE.get('orders');const ps=all.filter(o=>o.status==='Pending Dealing'&&!o.tagLogged);if(!ps.length)return;ps.forEach(o=>tagSales(o));STORE.set('orders',all);}
window.addEventListener('md-change',()=>{try{autoRecheck(STORE.now(),true);}catch(e){console.error(e);}});
/* ---------- submit / cancel ---------- */
function submit(o){const pr=MD.project(o.project)||{};Object.assign(o,{customer:pr.customer||o.customer,projectName:pr.name||o.projectName,sl:pr.sl||o.sl,ptype:pr.ptype||o.ptype});
 const m=runDealing(o);o.submittedAt=STORE.now();o.submittedBy=STORE.me().n;
 save(o,'Submitted, dealing '+(m.status==='No rate'?'not registered':'registered'),m.status==='No rate'?'No rate for '+missingText(o):UI.rp(m.price));if(o.status==='Ready to Assign'&&window.ASSIGNQ&&ASSIGNQ.autoAssign)ASSIGNQ.autoAssign(o);return o;}
function drop(o,cb){DLG.confirm({title:'Cancel '+o.id,sub:esc(route(o)),reason:true,reasonOptions:REASONS,ok:'Cancel order',cancel:'Keep order',danger:true,body:o.status==='Assigned'||o.status==='Assigning'?'The assignment is cancelled.':''}).then(r=>{if(!r)return;
 o.status='Dropped';o.dropReason=r;if(o.waterfall){o.waterfall.stopped=true;o.waterfall.candidates.forEach(c=>{if(c.status==='Sent'||c.status==='Queued')c.status='Closed';});}save(o,'Cancelled',r);toast(o.id+' cancelled');if(cb)cb();});}
/* ---------- master data helpers ---------- */
function projectsDD(){return MD.get().projects.filter(p=>p.ptype!=='Milkrun'&&p.status==='Active'&&p.src==='md');}
/* eligible plans: a PM is assigned (Pending PM plans are not offered) and the plan is not Closed / Cancelled (In Planning and On Call plans are included) */
function pickList(){return projectsDD().map(p=>{const pl=DOM.plans().find(x=>x.project===p.code)||{};return {code:p.code,name:p.name,cust:p.customer,plan:pl.id||'',ok:!!pl.pm&&pl.status!=='Closed'&&pl.status!=='Cancelled'};}).filter(p=>p.plan&&p.ok);}
/* locations a customer may use: registered to the customer in Master Data Location; Pool = MODA pool locations; a customer without a registered location can pick any Master Data location */
function locNames(type,customer,cur){const all=MD.get().dd.locations.filter(l=>l.status==='Active');const reg=customer?all.filter(l=>(l.customers||[]).indexOf(customer)>=0):[];let L;
 if(type==='Pool')L=all.filter(l=>l.type==='Pool');else{const typed=reg.filter(l=>l.type===type);L=typed.length?typed:reg;}/* PM 2026-10-20: only locations registered to the customer; no fallback to all locations */
 const out=L.map(l=>l.name);if(cur&&out.indexOf(cur)<0)out.push(cur);return out;}
const hasReg=c=>!!c&&MD.get().dd.locations.some(l=>l.status==='Active'&&(l.customers||[]).indexOf(c)>=0);
function locs(type){return MD.get().dd.locations.filter(l=>l.status==='Active'&&(!type||l.type===type||(type==='Drop Off'&&l.type==='Transit'))).map(l=>l.name);}
/* region of the order (last Drop Off city) -> Customer Delivery Note Return SLA rows are per region */
function regionOf(o){const d=stopsOf(o).filter(s=>s.type==='Drop Off');const t=String((d[d.length-1]||{}).city||'').toLowerCase();if(!t)return '';
 if(/jakarta|bekasi|bogor|depok|tangerang/.test(t))return 'Jabodetabek';if(/jawa tengah/.test(t))return 'Jawa Tengah';if(/jawa timur/.test(t))return 'Jawa Timur';if(/bali|denpasar/.test(t))return 'Bali';
 if(/sumatera|aceh|lampung|riau|jambi|bengkulu|palembang|medan/.test(t))return 'Sumatera';return '';}
function projInfo(o){const pr=project(o)||{};const c=MD.customer(o.customer||pr.customer)||{};const reg=regionOf(o);const sla=(c.slas||[]).find(s=>reg&&String(s.region).toLowerCase()===reg.toLowerCase());
 return {pic:c.pic||'',phone:c.telp||'',sl:pr.svclevel||'',commodity:(pr.commodity||[]).join(', '),claim:pr.claimtnc||c.claimtnc||'',sla:sla?'H+'+sla.sla+' days':'',region:reg};}
/* ---------- order from the form state (no save) ---------- */
function toOrder(S,ex){const pr=MD.project(S.code)||{};const date=S.date||UI.addDays(STORE.today(),1);
 const o=ex||{id:newId(date),source:'Manual',createdAt:STORE.now(),createdBy:STORE.me().n,history:[],status:'Draft'};
 Object.assign(o,{customer:pr.customer||S.cust||o.customer||'',project:pr.code||'',projectConfirmed:!!pr.code,projectName:pr.name||'',sl:pr.sl,ptype:pr.ptype,date:S.date,window:[S.time||'',''],
  stops:S.stops.map(s=>({type:s.type,loc:s.loc,custom:!!s.custom,city:s.loc?((s.custom?s.city:cityOfLoc(s.loc))||s.city||''):'',addr:s.addr||'',lat:s.lat===''?'':+s.lat,lng:s.lng===''?'':+s.lng,etaDate:s.eta?(s.etaDate||''):'',eta:s.eta||'',handling:(s.type==='Pick Up'||s.type==='Drop Off')&&s.handling!==''&&s.handling!=null?+s.handling:null,dos:(s.dos||[]).slice()})),
  qty:Math.max(1,parseInt(S.qty,10)||1),unitCategory:S.cat,body:S.kar,m3:S.vol===''?0:IO.toNum(S.vol)||0,ton:S.ton===''?0:IO.toNum(S.ton)||0,note:S.note||''});
 if(!o.qty)o.qty=1;return sync(o);}
/* ---------- searchable dropdown (combobox): one column of values, type to filter ---------- */
function comboHtml(id,label,value,ph){return '<div class="oc-combo"><input type="text" class="input oc-cin" id="'+id+'" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="'+id+'-lb" aria-label="'+esc(label)+'" autocomplete="off" placeholder="'+esc(ph||'Search')+'" value="'+esc(value||'')+'"><span class="oc-cx" aria-hidden="true">'+ic('down','s12')+'</span><ul class="oc-lb" id="'+id+'-lb" role="listbox" hidden></ul></div>';}
/* o.free: typed text that matches no option is kept (a new location); o.noFocusOpen: the list does not open on the dialog's automatic first focus */
function wireCombo(root,id,optsFn,onPick,o){o=o||{};const inp=root.querySelector('#'+id),lb=root.querySelector('#'+id+'-lb');if(!inp)return null;let val=inp.value,act=-1,list=[],skip=!!o.noFocusOpen;
 const close=()=>{lb.hidden=true;inp.setAttribute('aria-expanded','false');act=-1;inp.removeAttribute('aria-activedescendant');};
 const mark=()=>{$$('li',lb).forEach((li,i)=>li.classList.toggle('on',i===act));const li=lb.children[act];if(li){inp.setAttribute('aria-activedescendant',li.id);li.scrollIntoView({block:'nearest'});}};
 const open=f=>{const all=optsFn();const q=C.normT(f);list=(q&&f!==val?all.filter(x=>C.normT(x).indexOf(q)>=0):all).slice(0,80);
  lb.innerHTML=list.length?list.map((x,i)=>'<li role="option" id="'+id+'-o'+i+'" data-v="'+esc(x)+'" aria-selected="'+(x===val)+'">'+esc(x)+'</li>').join(''):'<li class="oc-none" role="option" aria-disabled="true">No match</li>';lb.hidden=false;inp.setAttribute('aria-expanded','true');act=-1;};
 const pick=v=>{val=v;inp.value=v;close();onPick(v);};
 inp.addEventListener('focus',()=>{inp.select();if(skip){skip=false;return;}open('');});
 inp.addEventListener('click',()=>{if(lb.hidden)open('');});
 inp.addEventListener('input',()=>open(inp.value));
 inp.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(lb.hidden)open(inp.value===val?'':inp.value);if(!list.length)return;act=(act+(e.key==='ArrowDown'?1:-1)+list.length)%list.length;mark();}
  else if(e.key==='Enter'){if(!lb.hidden){e.preventDefault();e.stopPropagation();if(act>=0)pick(list[act]);else if(list.length===1)pick(list[0]);}}
  else if(e.key==='Escape'){if(!lb.hidden){e.stopPropagation();e.preventDefault();inp.value=val;close();}}});
 lb.addEventListener('mousedown',e=>{const li=e.target.closest('li[data-v]');if(li){e.preventDefault();pick(li.dataset.v);}});
 inp.addEventListener('blur',()=>{const t=C.normT(inp.value);if(!t){if(val)pick('');}else{const m=optsFn().find(x=>C.normT(x)===t);if(m&&m!==val)pick(m);else if(!m){if(o.free){const v=inp.value.trim();if(v!==val){val=v;inp.value=v;onPick(v);}}else inp.value=val;}}close();});
 return {set(v){val=v||'';inp.value=val;}};}
/* ---------- New / Edit Order popup ---------- */
function openForm(opt){opt=opt||{};const ex=opt.order||null;const PJ=pickList();const planOf=code=>(PJ.find(p=>p.code===code)||{}).plan||'';
 const submitted=ex&&['Draft','Need Clarification'].indexOf(ex.status)<0;
 const S=ex?{code:(PJ.find(p=>p.code===ex.project)||{}).code||'',cust:ex.customer||'',date:ex.date||'',time:(ex.window||[])[0]||'',stops:stopsOf(ex).map(x=>x.custom&&x.loc?Object.assign(x,{mapOpen:false}):x),qty:ex.qty||1,cat:ex.unitCategory||'',kar:ex.body||'',ton:ex.ton||'',vol:ex.m3||'',note:ex.note||''}
  :{code:'',cust:'',date:UI.addDays(STORE.today(),1),time:'',stops:[blankStop('Pick Up'),blankStop('Drop Off')],qty:1,cat:'',kar:'',ton:'',vol:'',note:''};
 if(!ex&&opt.pref)Object.assign(S,opt.pref);
 if(S.code&&!S.cust)S.cust=(PJ.find(p=>p.code===S.code)||{}).cust||'';
 /* opt.host = edit inside the Order Detail page (no popup); without it: popup (New Order) */
 const inline=!!opt.host;let L=null,root;if(inline){opt.host.innerHTML='<div class="oc-form" id="ocf"></div><div class="row gap2 mt4" id="ocb"></div>';root=$('#ocf',opt.host);}else{L=DLG.open({title:ex?'Edit order':'New order',sub:ex?esc(ex.id):'',width:880,body:'<div class="oc-form" id="ocf"></div>',buttons:[]});root=$('#ocf',L.el);}const H={};const close=()=>{if(L)L.close();};
 const row=code=>PJ.find(p=>p.code===code);
 let FC='';/* customer chosen in the Customer dropdown limits the Plan ID / Project options */
  const planOpts=()=>[...new Set(PJ.filter(p=>!FC||p.cust===FC).map(p=>p.plan))];
 const custOpts=()=>[...new Set(PJ.map(p=>p.cust))].sort();
 const projOpts=()=>[...new Set(PJ.filter(p=>!FC||p.cust===FC).map(p=>p.name))];
 function fillPicker(){const r=row(S.code)||{};const fe=$('#oc-ful',root);if(fe)fe.value=S.code?fulfillCode(S.code):'';H.plan.set(r.plan||'');H.cust.set(S.cust||'');H.proj.set(r.name||'');}
 function setCode(code){S.code=code||'';const r=row(S.code);if(r){S.cust=r.cust;if(FC&&FC!==r.cust)FC='';}fillPicker();drawStops();}
 function onCust(c){if(!c){FC='';S.cust='';S.code='';fillPicker();drawStops();return;}FC=c;S.cust=c;const r=row(S.code);if(r&&r.cust!==c)S.code='';if(!S.code){const ps=PJ.filter(p=>p.cust===c);if(ps.length===1)S.code=ps[0].code;}fillPicker();drawStops();}
 function html(){const kar=UI.KAROS.indexOf(S.kar)<0&&S.kar?UI.KAROS.concat([S.kar]):UI.KAROS;const cat=UI.CATS.indexOf(S.cat)<0&&S.cat?UI.CATS.concat([S.cat]):UI.CATS;
  const sec=(t,b)=>'<section class="oc-sec"><h4 class="oc-sec-t">'+t+'</h4>'+b+'</section>';
  root.innerHTML=sec('Customer &amp; Project','<div class="oc-grid3">'+C.field('Plan ID',comboHtml('oc-plan','Plan ID',planOf(S.code),'Search Plan ID'),{req:1})+C.field('Customer Name',comboHtml('oc-cust','Customer Name',S.cust,'Search customer'),{req:1})+C.field('Project Name',comboHtml('oc-proj','Project Name',(row(S.code)||{}).name,'Search project'),{req:1})+C.field('Fulfillment by Ownership','<input class="input" id="oc-ful" readonly aria-readonly="true" value="'+esc(S.code?fulfillCode(S.code):'')+'">',{for:'oc-ful'})+'</div>')+
   sec('Delivery Date','<div class="oc-grid2">'+C.field('Delivery Start Date','<input class="input" type="date" id="oc-date" value="'+esc(S.date)+'">',{req:1,for:'oc-date'})+C.field('Delivery Start Time','<input class="input" id="oc-time" data-hm placeholder="HH:MM" inputmode="numeric" value="'+esc(S.time)+'">',{req:1,for:'oc-time'})+'</div>')+
   sec('Locations','<div id="oc-stops" class="oc-stops"></div><div class="errtxt" id="oc-stops-e" hidden>'+ic('x-circle','s12')+'<span></span></div><div><button type="button" class="btn" id="oc-add">'+ic('plus')+'Add location</button></div>')+
   sec('Unit Information','<div class="oc-grid5">'+C.field('Qty Unit','<input class="input" id="oc-qty" inputmode="numeric" placeholder="1" value="'+esc(S.qty)+'">',{req:1,for:'oc-qty'})+C.field('Unit Category','<select class="select" id="oc-cat">'+C.opts(cat,S.cat,'Select')+'</select>',{req:1,for:'oc-cat'})+C.field('Karoseri','<select class="select" id="oc-kar">'+C.opts(kar,S.kar,'Select')+'</select>',{req:1,for:'oc-kar'})+
   C.field('Tonase','<input class="input" id="oc-ton" inputmode="decimal" placeholder="ton" value="'+esc(S.ton)+'">',{req:1,for:'oc-ton'})+C.field('Volume','<input class="input" id="oc-vol" inputmode="decimal" placeholder="m3" value="'+esc(S.vol)+'">',{req:1,for:'oc-vol'})+'</div>')+
   sec('Special Handling / Note',C.field('Special Handling Note','<textarea class="textarea" id="oc-note" rows="2" placeholder="Optional">'+esc(S.note)+'</textarea>',{for:'oc-note'}));
  H.plan=wireCombo(root,'oc-plan',planOpts,v=>{const r=PJ.find(p=>p.plan===v);setCode(r?r.code:'');},{noFocusOpen:true});
  H.cust=wireCombo(root,'oc-cust',custOpts,onCust);
  H.proj=wireCombo(root,'oc-proj',projOpts,v=>{const r=PJ.find(p=>p.name===v&&(!S.cust||p.cust===S.cust))||PJ.find(p=>p.name===v);setCode(r?r.code:'');});
  $('#oc-date',root).onchange=e=>{S.date=e.target.value;};$('#oc-time',root).oninput=e=>{S.time=e.target.value;};
  $('#oc-qty',root).oninput=e=>{S.qty=e.target.value.replace(/\D/g,'').slice(0,2);if(e.target.value!==S.qty)e.target.value=S.qty;};
  $('#oc-cat',root).onchange=e=>{S.cat=e.target.value;};$('#oc-kar',root).onchange=e=>{S.kar=e.target.value;};$('#oc-ton',root).oninput=e=>{S.ton=e.target.value;};$('#oc-vol',root).oninput=e=>{S.vol=e.target.value;};$('#oc-note',root).oninput=e=>{S.note=e.target.value;};
  $('#oc-add',root).onclick=()=>{S.stops.push(blankStop('Drop Off'));drawStops();const ds=$$('[data-det]',root);const f=ds.length&&ds[ds.length-1].querySelector('input');if(f)f.focus();};
  drawStops();}
 function stopHtml(s,i){const hasHt=s.type==='Pick Up'||s.type==='Drop Off';const n=S.stops.length;
  return '<div class="oc-stop" data-i="'+i+'"><span class="oc-n">'+(i+1)+'</span><div class="oc-hd2">'+
   C.field('Type','<select class="select" data-si="'+i+'" data-k="type" aria-label="Type of location '+(i+1)+'">'+C.opts(TYPES,s.type)+'</select>',{cls:'oc-ft',req:1})+
   C.field('Location Source','<select class="select" data-srcsel="'+i+'" aria-label="Location source '+(i+1)+'"><option value="existing"'+(s.custom?'':' selected')+'>Registered location</option><option value="new"'+(s.custom?' selected':'')+(s.type==='Pool'?' disabled':'')+'>New location</option></select>',{cls:'oc-fsw'})+
   '<span class="oc-sa"><button type="button" class="iconbtn" data-mv="'+i+':-1" aria-label="Move up"'+(i?'':' disabled')+'>'+ic('up')+'</button><button type="button" class="iconbtn" data-mv="'+i+':1" aria-label="Move down"'+(i<n-1?'':' disabled')+'>'+ic('down')+'</button><button type="button" class="iconbtn del" data-rm="'+i+'" aria-label="Remove location '+(i+1)+'"'+(n>1?'':' disabled')+'>'+ic('trash')+'</button></span></div>'+
   '<div class="oc-bd"><div class="oc-det" data-det="'+i+'">'+detHtml(s,i)+'</div>'+
    C.field('Est. Arrival Date','<input class="input" type="date" data-si="'+i+'" data-k="etaDate" aria-label="Est. arrival date '+(i+1)+'" value="'+esc(s.etaDate)+'">',{cls:'oc-s4',req:1})+
    C.field('Est. Arrival Time','<input class="input" data-hm inputmode="numeric" placeholder="HH:MM" data-si="'+i+'" data-k="eta" aria-label="Est. arrival time '+(i+1)+'" value="'+esc(s.eta)+'">',{cls:'oc-s4',req:1})+
    (hasHt?C.field('Handling (min)','<input class="input" inputmode="numeric" data-si="'+i+'" data-k="handling" aria-label="Handling time in minutes '+(i+1)+'" value="'+esc(s.handling==null?'':s.handling)+'">',{cls:'oc-s4',req:1}):'')+
    '<div class="field oc-fd oc-s12"><label>No DO</label><div class="oc-tags" data-do="'+i+'">'+(s.dos||[]).map((d,j)=>'<span class="oc-chip">'+esc(d)+'<button type="button" data-rmdo="'+i+':'+j+'" aria-label="Remove DO '+esc(d)+'">'+ic('x','s12')+'</button></span>').join('')+'<input class="oc-tagin" data-tag="'+i+'" placeholder="DO number" aria-label="Add DO number for location '+(i+1)+'"></div></div>'+
    '<div class="errtxt oc-se oc-s12" hidden>'+ic('x-circle','s12')+'<span></span></div></div></div>';}
 /* address / city / lat / long of a stop: read only when the location comes from Master Data, editable (typed or found on the map) for a new location */
 function detHtml(s,i){const ro=!s.custom;const open=ro?s.mapOpen===true:s.mapOpen!==false;
  /* existing: pick from the registered list (details appear read only); new: type the name and the details + map open straight away */
  const locIn=ro?C.field('Registered location',comboHtml('oc-loc'+i,'Location '+(i+1),s.loc,'Search a registered location'),{cls:'oc-s12',req:1})
   :C.field('Location name','<input class="input" data-si="'+i+'" data-k="loc" placeholder="e.g. Gudang Baru Cikarang" aria-label="Location name '+(i+1)+'" value="'+esc(s.loc)+'">',{cls:'oc-s12',req:1});
  if(ro&&!s.loc)return locIn;
  const ai='aria-label="Address of location '+(i+1)+'"';
  const addr=ro?'<input class="input" disabled '+ai+' value="'+esc(s.addr)+'">'
   :open?'<div class="oc-ms"><input class="input" data-si="'+i+'" data-k="addr" data-msearch="'+i+'" placeholder="Search address or place on the map" autocomplete="off" '+ai+' value="'+esc(s.addr)+'"><div class="oc-sug" data-sug="'+i+'" hidden></div></div>'
   :'<input class="input" data-si="'+i+'" data-k="addr" placeholder="Street, district" '+ai+' value="'+esc(s.addr)+'">';
  const gm=(s.lat!==''&&s.lat!=null&&s.lng!==''&&s.lng!=null&&!isNaN(+s.lat)&&!isNaN(+s.lng))?'https://www.google.com/maps?q='+encodeURIComponent(s.lat+','+s.lng):'';
  const pt=open?'Hide map':ro?'View on map':'Search by map';
  const pin=(ro&&!gm)?'':'<button type="button" class="iconbtn oc-pin'+(open?' on':'')+'" data-mapt="'+i+'" title="'+pt+'" aria-label="'+pt+'" aria-pressed="'+open+'">'+ic('pin')+'</button>';
  const f=(k,l,ph)=>ro?C.field(l,'<input class="input" disabled value="'+esc(s[k])+'">',{cls:'oc-s3',req:1}):C.field(l,'<input class="input" data-si="'+i+'" data-k="'+k+'" data-ll="'+i+'" inputmode="decimal" placeholder="'+ph+'" aria-label="'+l+' of location '+(i+1)+'" value="'+esc(s[k])+'">',{cls:'oc-s3',req:1});
  return locIn+
   C.field('Address','<div class="oc-arow">'+addr+pin+'</div>',{cls:'oc-s12',req:1})+
   (open?'<div class="oc-map oc-s12" data-map="'+i+'"></div>'+(ro?'':'<div class="fhint oc-s12">Pick a result, or click / drag the pin on the map. Address, city, latitude and longitude fill in.</div>'):'')+
   C.field('City / Regency',ro?'<input class="input" disabled value="'+esc(s.city)+'">':'<input class="input" data-si="'+i+'" data-k="city" placeholder="e.g. Bekasi" aria-label="City of location '+(i+1)+'" value="'+esc(s.city)+'">',{cls:'oc-s6',req:1})+
   f('lat','Latitude','-6.2088')+f('lng','Longitude','106.8456');}
 /* ----- new location: search by map (Leaflet + OpenStreetMap Nominatim, loaded only when the user opens the map) ----- */
 const MAPS={};const leaflet=loadLeaflet;
 const cityFrom=ad=>ad?(ad.city||ad.town||ad.county||ad.regency||ad.municipality||ad.state_district||''):'';
 function setPoint(i,lat,lng,addr,cty){const s=S.stops[i];if(!s)return;s.lat=(+lat).toFixed(6);s.lng=(+lng).toFixed(6);if(addr!=null)s.addr=addr;if(cty)s.city=cty;
  const d=$('[data-det="'+i+'"]',root);if(d){[['lat',s.lat],['lng',s.lng],['addr',s.addr],['city',s.city]].forEach(([k,v])=>{const e=$('[data-si="'+i+'"][data-k="'+k+'"]',d);if(e)e.value=v;});}}
 function reverse(i,lat,lng){fetch('https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=id&lat='+lat+'&lon='+lng).then(r=>r.json()).then(d=>{if(d&&d.display_name&&S.stops[i])setPoint(i,lat,lng,d.display_name,cityFrom(d.address));}).catch(()=>{});}
 function mountMap(i){const el=$('[data-map="'+i+'"]',root);if(!el||el._init)return;el._init=true;const s=S.stops[i];
  leaflet().then(L=>{if(!document.contains(el))return;const has=s.lat!==''&&s.lng!==''&&!isNaN(+s.lat)&&!isNaN(+s.lng);const map=L.map(el,{attributionControl:false}).setView(has?[+s.lat,+s.lng]:[-6.2,106.85],has?16:11);
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);const st={map,marker:null};
   st.place=(la,ln)=>{if(!st.marker){st.marker=L.marker([la,ln],{draggable:!!s.custom}).addTo(map);st.marker.on('dragend',()=>{const p=st.marker.getLatLng();setPoint(i,p.lat,p.lng);reverse(i,p.lat,p.lng);});}else st.marker.setLatLng([la,ln]);};
   if(has)st.place(+s.lat,+s.lng);if(s.custom)map.on('click',e=>{st.place(e.latlng.lat,e.latlng.lng);setPoint(i,e.latlng.lat,e.latlng.lng);reverse(i,e.latlng.lat,e.latlng.lng);});
   MAPS[i]=st;setTimeout(()=>map.invalidateSize(),80);
  }).catch(()=>{el.innerHTML='<div class="oc-map-off">Map needs internet. Search below still works when online; otherwise type the address, latitude and longitude.</div>';});}
 function suggest(i){const inp=$('[data-msearch="'+i+'"]',root),box=$('[data-sug="'+i+'"]',root);if(!inp||!box)return;const q=inp.value.trim();if(q.length<3){box.hidden=true;return;}
  fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=id&accept-language=id&limit=5&q='+encodeURIComponent(q)).then(r=>r.json()).then(a=>{
   if(!a||!a.length){box.innerHTML='<div class="oc-none">No result</div>';box.hidden=false;return;}
   box.innerHTML=a.map((x,j)=>'<div role="option" data-j="'+j+'">'+esc(x.display_name)+'</div>').join('');box.hidden=false;
   $$('div[data-j]',box).forEach(d=>d.onmousedown=e=>{e.preventDefault();const x=a[+d.dataset.j];box.hidden=true;setPoint(i,x.lat,x.lon,x.display_name,cityFrom(x.address));const st=MAPS[i];if(st){st.map.setView([+x.lat,+x.lon],16);st.place(+x.lat,+x.lon);}});
  }).catch(()=>{box.innerHTML='<div class="oc-none">Search needs internet</div>';box.hidden=false;});}
 function drawDet(i){const s=S.stops[i];const d=$('[data-det="'+i+'"]',root);if(!d)return;delete MAPS[i];d.innerHTML=detHtml(s,i);wireDet(i);}
 function wireDet(i){const d=$('[data-det="'+i+'"]',root);if(!d)return;const s=S.stops[i];
  $$('[data-si]',d).forEach(el=>{const k=el.dataset.k;el.oninput=()=>{s[k]=el.dataset.ll!=null?llClean(el.value):el.value;if(el.dataset.ll!=null&&el.value!==s[k])el.value=s[k];if(el.dataset.ll!=null&&s.lat!==''&&s.lng!==''&&!isNaN(+s.lat)&&!isNaN(+s.lng)){const st=MAPS[i];if(st){st.map.setView([+s.lat,+s.lng],16);st.place(+s.lat,+s.lng);}}};});
  const pb=$('[data-mapt="'+i+'"]',d);if(pb)pb.onclick=()=>{s.mapOpen=s.custom?s.mapOpen===false:!s.mapOpen;drawDet(i);};
  if(!s.custom)H['loc'+i]=wireCombo(d,'oc-loc'+i,()=>locNames(s.type,S.cust,s.loc),v=>onLoc(i,v));
  const ms=$('[data-msearch="'+i+'"]',d);if(ms){let t;ms.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>suggest(i),350);});ms.addEventListener('blur',()=>{const b=$('[data-sug="'+i+'"]',d);if(b)b.hidden=true;});}
  if(s.custom?s.mapOpen!==false:s.mapOpen===true)mountMap(i);}
 /* picked from the Master Data list: take its address, city, lat / long; typed text that is not in Master Data is a new location */
 function onLoc(i,v){const s=S.stops[i];const m=masterLoc(v);s.loc=v;
  if(m)Object.assign(s,{city:m.city||'',addr:m.address||'',lat:numS(m.lat),lng:numS(m.lng)});else Object.assign(s,{city:'',addr:'',lat:'',lng:''});
  drawDet(i);}
 function drawStops(){const h=$('#oc-stops',root);if(!h)return;h.innerHTML=S.stops.map(stopHtml).join('');
  S.stops.forEach((s,i)=>wireDet(i));
  $$('[data-srcsel]',h).forEach(b=>b.onchange=()=>{const s=S.stops[+b.dataset.srcsel];const neu=b.value==='new';if(!!s.custom===neu)return;Object.assign(s,{custom:neu,loc:'',city:'',addr:'',lat:'',lng:'',mapOpen:neu});drawStops();});
  $$('[data-si]',h).forEach(el=>{if(el.closest('[data-det]'))return;const i=+el.dataset.si,k=el.dataset.k;if(el.tagName==='SELECT')el.onchange=()=>{const s=S.stops[i];s.type=el.value;if(s.type!=='Pick Up'&&s.type!=='Drop Off')s.handling=null;const L0=masterLoc(s.loc);if(s.type==='Pool'&&(s.custom||(s.loc&&!(L0&&L0.type==='Pool')))){Object.assign(s,{custom:false,loc:'',city:'',addr:'',lat:'',lng:''});}drawStops();};else{el.oninput=()=>{S.stops[i][k]=el.value;};el.onchange=()=>{S.stops[i][k]=el.value;};}});
  $$('[data-mv]',h).forEach(b=>b.onclick=()=>{const [i,d]=b.dataset.mv.split(':').map(Number);const j=i+d;if(j<0||j>=S.stops.length)return;const t=S.stops[i];S.stops[i]=S.stops[j];S.stops[j]=t;drawStops();});
  $$('[data-rm]',h).forEach(b=>b.onclick=()=>{if(S.stops.length>1){S.stops.splice(+b.dataset.rm,1);drawStops();}});
  $$('[data-rmdo]',h).forEach(b=>b.onclick=()=>{const [i,j]=b.dataset.rmdo.split(':').map(Number);S.stops[i].dos.splice(j,1);drawStops();const t=$('[data-tag="'+i+'"]',h);if(t)t.focus();});
  $$('[data-tag]',h).forEach(inp=>{const i=+inp.dataset.tag;const add=()=>{const parts=inp.value.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);if(!parts.length)return false;parts.forEach(p=>{if(S.stops[i].dos.indexOf(p)<0)S.stops[i].dos.push(p);});drawStops();const t=$('[data-tag="'+i+'"]',h);if(t)t.focus();return true;};
   inp.onkeydown=e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();e.stopPropagation();add();}else if(e.key==='Backspace'&&!inp.value&&S.stops[i].dos.length){S.stops[i].dos.pop();drawStops();const t=$('[data-tag="'+i+'"]',h);if(t)t.focus();}};
   inp.onblur=()=>{if(inp.value.trim()){const parts=inp.value.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);parts.forEach(p=>{if(S.stops[i].dos.indexOf(p)<0)S.stops[i].dos.push(p);});inp.value='';const box=inp.closest('.oc-tags');box.querySelectorAll('.oc-chip').forEach(c=>c.remove());S.stops[i].dos.forEach((d,j)=>{const c=document.createElement('span');c.className='oc-chip';c.textContent=d;box.insertBefore(c,inp);});}};});}
 /* Lat/Long boxes take only a decimal number: digits, one leading minus, one dot */
 function llClean(v){v=String(v).replace(/[^\d.\-]/g,'');const neg=v[0]==='-';v=v.replace(/-/g,'');const i=v.indexOf('.');if(i>=0)v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');return ((neg?'-':'')+v).slice(0,12);}
 /* validation: returns number of problems and marks the fields */
 function check(strict){let n=0;const bad=(el,msg)=>{if(!C.setErr(el,msg||''))n++;};const q=s=>$(s,root);
  bad(q('#oc-proj'),S.code?'':'Select a project');bad(q('#oc-plan'),S.code?'':'Required');bad(q('#oc-cust'),S.cust?'':'Required');
  const today=STORE.today();bad(q('#oc-date'),strict?(!S.date?'Required':S.date<today?'Date in the past':''):'');
  bad(q('#oc-time'),S.time?(UI.parseHM(S.time)==null||UI.parseHM(S.time)>=1440?'Use HH:MM':''):(strict?'Required':''));
  bad(q('#oc-qty'),(()=>{const n=Number(S.qty);return S.qty===''||S.qty==null?(strict?'Required':''):(!Number.isInteger(n)||n<1?'Whole number, at least 1':'');})());
  bad(q('#oc-cat'),strict&&!S.cat?'Required':'');bad(q('#oc-kar'),strict&&!S.kar?'Required':'');
  [['ton','Tonase'],['vol','Volume']].forEach(([k,l])=>{const v=S[k];const x=v===''||v==null?null:IO.toNum(v);bad(q('#oc-'+k),v===''||v==null?(strict?'Required':''):(isNaN(x)||x<=0?'Must be a number above 0':''));});
  S.stops.forEach((s,i)=>{const el=$('.oc-stop[data-i="'+i+'"]',root);const li=$('#oc-loc'+i,root);let msg='';const hasHt=s.type==='Pick Up'||s.type==='Drop Off';
   const la=s.lat===''||s.lat==null?NaN:+s.lat,ln=s.lng===''||s.lng==null?NaN:+s.lng;
   /* every field of a location is mandatory on Submit except the DO numbers; coordinates are mandatory for every location */
   if(strict&&!s.loc)msg=s.custom?'Enter the location name':'Select a location';
   else if(s.loc&&s.custom&&strict&&!String(s.addr||'').trim())msg='New location: enter the address (or search by map)';
   else if(s.loc&&s.custom&&strict&&!String(s.city||'').trim())msg='New location: enter the city';
   else if(s.loc&&(strict||s.lat!==''||s.lng!=='')&&(isNaN(la)||isNaN(ln)))msg=s.custom?'New location: enter latitude and longitude (or search by map)':'This location has no coordinates in Master Data, add them there first';
   else if(s.loc&&!isNaN(la)&&!isNaN(ln)&&(la<-90||la>90||ln<-180||ln>180))msg='Latitude must be between -90 and 90, longitude between -180 and 180';
   else if(s.eta&&(UI.parseHM(s.eta)==null||UI.parseHM(s.eta)>=1440))msg='Est. arrival: use HH:MM';
   else if((strict||s.etaDate||s.eta)&&!s.etaDate&&!s.eta)msg='Est. arrival: enter the date and the time';
   else if(s.etaDate&&!s.eta)msg='Est. arrival: enter the time as well as the date';
   else if(s.eta&&!s.etaDate)msg='Est. arrival: enter the date as well as the time';
   else if(s.etaDate&&S.date&&s.etaDate<S.date)msg='Est. arrival is before the delivery start date';
   else if(strict&&hasHt&&(s.handling===''||s.handling==null))msg='Handling time is required';
   else if(s.handling!==''&&s.handling!=null&&(isNaN(+s.handling)||+s.handling<0||String(s.handling).trim()===''))msg='Handling time: whole minutes';
   const e=$('.oc-se',el);e.hidden=!msg;$('span',e).textContent=msg;if(li)li.classList.toggle('err',!!msg&&/^select a location/i.test(msg));if(msg)n++;});
  const se=$('#oc-stops-e',root);const m=strict&&!S.stops.length?'Add at least one location':'';se.hidden=!m;$('span',se).textContent=m;if(m)n++;
  return n;}
 function pull(){/* the HH:MM mask rewrites the value after the input event: read the final text from the fields */const t=$('#oc-time',root);if(t)S.time=t.value;$$('[data-si]',root).forEach(el=>{if(el.tagName!=='SELECT')S.stops[+el.dataset.si][el.dataset.k]=el.value;});S.stops.forEach(s=>{if(s.eta&&!s.etaDate&&S.date)s.etaDate=S.date;});}
 function finish(mode){pull();const n=check(mode==='submit');if(n){toast(UI.plural(n,'field')+' need attention',{tone:'err'});return false;}
  const was=ex?ex.status:null;const o=toOrder(S,ex?JSON.parse(JSON.stringify(ex)):null);
  if(mode==='draft'){if(!ex)o.status='Draft';save(o,ex?'Saved draft':'Created order (draft)');toast(o.id+' saved as Draft');}
  else if(was&&['Assigning','Assigned','Planned'].indexOf(was)>=0){o.reviewNeeded=true;save(o,'Revised','Order changed after assignment');STORE.notify({kind:'Action Required',to:['planner'],title:'Assigned order changed: '+o.id,link:'order-detail.html?id='+o.id});toast(o.id+' updated, review needed');}
  else{if(!ex)save(o,'Created order');submit(o);toast(o.id+(o.status==='Ready to Assign'?' is Ready to Assign':' saved as Draft, no rate for '+missingText(o)),{tone:o.status==='Ready to Assign'?'':'warn'});}
  if(opt.onDone)opt.onDone(o);return true;}
 const btns=[{label:'Cancel',onClick:()=>{if(opt.onCancel)opt.onCancel();}}];
 if(!submitted)btns.push({label:'Save draft',keep:true,onClick:()=>{if(finish('draft')){close();}return false;}});
 btns.push({label:submitted?'Save':'Submit',kind:'primary',keep:true,onClick:()=>{if(finish('submit')){close();}return false;}});
 if(inline){const bar=$('#ocb',opt.host);btns.forEach(x=>{const e=document.createElement('button');e.type='button';e.className='btn'+(x.kind?' '+x.kind:'');e.textContent=x.label;e.onclick=()=>x.onClick();bar.appendChild(e);});}else L.setButtons(btns);
 html();return L;}
function newOrder(onDone,pref){return openForm({onDone,pref});}
/* ================= Bulk Order (Excel): one row per location, rows with the same Order Ref are one order ================= */
const BH=['Order Ref','Plan ID','Customer Name','Project Name','Delivery Start Date','Delivery Start Time','Location Type','Location','Address','City','Latitude','Longitude','Est. Arrival Date','Est. Arrival Time','Handling Time (min)','No DO','Qty Unit','Unit Category','Karoseri','Tonase','Volume','Special Handling Note'];
const BREQ=['Order Ref','Delivery Start Date','Delivery Start Time','Location Type','Location','Est. Arrival Date','Est. Arrival Time','Qty Unit','Unit Category','Karoseri','Tonase','Volume'];const TYPE_MAP={pool:'Pool',pickup:'Pick Up',pick:'Pick Up',dropoff:'Drop Off',drop:'Drop Off',transit:'Transit'};
const typeOf=v=>TYPE_MAP[String(v).toLowerCase().replace(/[^a-z]/g,'')]||null;
const sigOf=(code,date,time,stops,cat,kar)=>[code,date,time,stops.map(s=>s.type+':'+s.loc).join('>'),cat,kar].join('|');
function bulkTemplate(){const pj=pickList()[0]||{name:'',plan:'',cust:''};const L=MD.get().dd.locations.filter(l=>l.status==='Active');const reg=L.filter(l=>(l.customers||[]).indexOf(pj.cust)>=0);const pool=L.find(l=>l.type==='Pool')||{name:''};
 const a=reg.find(l=>l.type==='Pick Up')||L.find(l=>l.type==='Pick Up')||{name:''};const b=reg.find(l=>l.type==='Drop Off')||reg.find(l=>l.type==='Transit')||L.find(l=>l.type==='Drop Off')||{name:''};
 const p=(MD.activeProjects().find(x=>x.name===pj.name)||{rates:[]});const r=p.rates[0]||{};const d=UI.addDays(STORE.today(),2);
 /* one row per location; the order columns are filled on the first row of the order only. Address, City, Latitude and Longitude are only for a location that is not registered yet (new location) */
 const row=(ref,type,loc,ad,ct,la,lo,etaD,etaT,ht,dos,first)=>[ref,first?pj.plan:'',first?pj.cust:'',first?pj.name:'',first?d:'',first?'07:00':'',type,loc,ad,ct,la,lo,etaD,etaT,ht,dos,first?1:'',first?(r.kategori||'CDD'):'',first?(r.karoseri||'Wingbox'):'',first?8:'',first?20:'',first?'':''];
 return [BH,row('A1','Pool',pool.name,'','','','',d,'06:00','','',true),row('A1','Pick Up',a.name,'','','','',d,'07:30',30,'DO-001, DO-002',false),row('A1','Drop Off',b.name,'','','','',d,'13:00',45,'DO-001',false)];}
function parseBulk(aoa,maxRows){const head=(aoa[0]||[]).map(IO.normH);const idx={};BH.forEach(h=>{const i=head.indexOf(IO.normH(h));if(i>=0)idx[h]=i;});
 const miss=BREQ.filter(h=>idx[h]==null);if(idx['Plan ID']==null&&idx['Project Name']==null)miss.push('Plan ID or Project Name');
 const known=new Set(Object.values(idx));const out={missing:miss,extra:(aoa[0]||[]).filter((h,i)=>!known.has(i)&&String(h).trim()).map(String),orders:[],errors:[],failedOrders:0,blank:0,rows:0,total:0,tooMany:false};
 if(miss.length)return out;
 const rows=[];aoa.slice(1).forEach((r,i)=>{if(r.every(c=>String(c).trim()===''))return out.blank++;rows.push({n:i+2,r});});out.rows=rows.length;if(maxRows&&rows.length>maxRows){out.tooMany=true;return out;}
 const g=(r,h)=>{const i=idx[h];if(i==null)return '';let v=r[i];if(typeof v==='string')v=v.trim();return v==null?'':v;};
 const groups=new Map();rows.forEach(x=>{const ref=String(g(x.r,'Order Ref')).trim();const k=ref||'__r'+x.n;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);});out.total=groups.size;
 const PJ=pickList();const plans=DOM.allPlans();const seen=new Set(STORE.get('orders').filter(o=>capStatus(o)!=='Cancelled').map(o=>{const s=stopsOf(o);return sigOf(o.project,o.date,(o.window||[])[0],s.filter(z=>z.type!=='Transit'||true).map(z=>({type:z.type,loc:z.loc})),o.unitCategory,o.body);}));
 groups.forEach((list,ref)=>{const errs=[];const E=(x,field,value,reason)=>errs.push({row:x.n,field,value:value===''||value==null?'(empty)':String(value),reason});const f0=list[0];
  const first=h=>{for(const x of list){const v=g(x.r,h);if(v!=='')return v;}return '';};
  if(ref.indexOf('__r')===0)E(f0,'Order Ref','','Required');
  let pr=null;const pid=first('Plan ID'),cn=first('Customer Name'),pn=first('Project Name');
  if(pid){const pl=plans.find(p=>p.id.toLowerCase()===String(pid).toLowerCase());pr=pl?PJ.find(p=>p.code===pl.project):null;if(!pr)E(f0,'Plan ID',pid,'Plan ID not found');}
  if(!pr&&!pid){const c=PJ.filter(p=>p.name.toLowerCase()===String(pn).toLowerCase()&&(!cn||p.cust.toLowerCase()===String(cn).toLowerCase()));pr=c[0]||null;if(!pn)E(f0,'Project Name','','Required (or Plan ID)');else if(!pr)E(f0,'Project Name',pn,'Project not found');}
  if(pr&&pid&&pn&&pr.name.toLowerCase()!==String(pn).toLowerCase())E(f0,'Project Name',pn,'Does not match Plan ID');
  if(pr&&cn&&pr.cust.toLowerCase()!==String(cn).toLowerCase())E(f0,'Customer Name',cn,'Does not match project');
  const dt=IO.toDate(first('Delivery Start Date'));if(first('Delivery Start Date')===''||dt==null)E(f0,'Delivery Start Date','','Required');else if(dt==='INVALID')E(f0,'Delivery Start Date',first('Delivery Start Date'),'Invalid date');else if(dt<STORE.today())E(f0,'Delivery Start Date',dt,'Date in the past');
  const tm=IO.toTime(first('Delivery Start Time'));if(first('Delivery Start Time')===''||tm==null)E(f0,'Delivery Start Time','','Required');else if(tm==='INVALID')E(f0,'Delivery Start Time',first('Delivery Start Time'),'Use HH:MM');
  const cat=UI.CATS.find(x=>x.toLowerCase()===String(first('Unit Category')).toLowerCase());if(!first('Unit Category'))E(f0,'Unit Category','','Required');else if(!cat)E(f0,'Unit Category',first('Unit Category'),'Use '+UI.CATS.join(' / '));
  const kar=UI.KAROS.find(x=>x.toLowerCase()===String(first('Karoseri')).toLowerCase());if(!first('Karoseri'))E(f0,'Karoseri','','Required');else if(!kar)E(f0,'Karoseri',first('Karoseri'),'Use '+UI.KAROS.join(' / '));
  const num=(h,req)=>{const v=first(h);if(v===''){if(req)E(f0,h,'','Required');return 0;}const n=IO.toNum(v);if(isNaN(n)||n<=0){E(f0,h,v,'Must be a number above 0');return 0;}return n;};const ton=num('Tonase',1),vol=num('Volume',1);let qty=num('Qty Unit',1);if(qty&&(qty%1||qty>99)){E(f0,'Qty Unit',first('Qty Unit'),'Whole number, 1 to 99');qty=0;}
  const stops=[];list.forEach(x=>{const ty=typeOf(g(x.r,'Location Type'));const ln=g(x.r,'Location');const s=blankStop(ty||'Pick Up');
   if(!ty)E(x,'Location Type',g(x.r,'Location Type'),g(x.r,'Location Type')===''?'Required':'Use '+TYPES.join(' / '));
   if(ln===''){E(x,'Location','','Required');}else{const l=MD.get().dd.locations.find(z=>z.status==='Active'&&z.name.toLowerCase()===String(ln).toLowerCase());
    if(!l){const ad=g(x.r,'Address'),ct=g(x.r,'City'),la=g(x.r,'Latitude'),lo=g(x.r,'Longitude');if(ty==='Pool')E(x,'Location',ln,'A Pool must be a registered location');else if(ad!==''&&ct!==''&&la!==''&&lo!==''&&!isNaN(IO.toNum(la))&&!isNaN(IO.toNum(lo))){Object.assign(s,{custom:true,loc:String(ln),city:String(ct),addr:String(ad),lat:String(IO.toNum(la)),lng:String(IO.toNum(lo))});}else E(x,'Location',ln,'Not in Master Data: fill Address, City, Latitude and Longitude for a new location');}else{s.loc=l.name;s.city=l.city;if(pr&&ty&&ty!=='Pool'&&(l.customers||[]).indexOf(pr.cust)<0)E(x,'Location',ln,'Not registered to '+pr.cust);}}
   const etd=g(x.r,'Est. Arrival Date'),ett=g(x.r,'Est. Arrival Time');{const d1=etd===''?null:IO.toDate(etd),t1=ett===''?null:IO.toTime(ett);if(etd===''||d1==null||d1==='INVALID')E(x,'Est. Arrival Date',etd,etd===''?'Required with Est. Arrival Time':'Invalid date');else if(ett===''||t1==null||t1==='INVALID')E(x,'Est. Arrival Time',ett,ett===''?'Required with Est. Arrival Date':'Use HH:MM');else{s.etaDate=d1;s.eta=t1;}}
   const ht=g(x.r,'Handling Time (min)');if(ht===''&&(ty==='Pick Up'||ty==='Drop Off'))E(x,'Handling Time (min)','','Required for Pick Up and Drop Off');else if(ht!==''){const n=IO.toNum(ht);if(isNaN(n)||n<0)E(x,'Handling Time (min)',ht,'Whole minutes');else if(ty==='Pick Up'||ty==='Drop Off')s.handling=Math.round(n);}
   s.dos=String(g(x.r,'No DO')).split(/[,;\n]/).map(z=>z.trim()).filter(Boolean);stops.push(s);});
  if(!stops.some(s=>s.type==='Pick Up')||!stops.some(s=>s.type==='Drop Off'))E(f0,'Location Type','','Needs at least one Pick Up and one Drop Off');
  if(!errs.length){const sig=sigOf(pr.code,dt,tm,stops.map(z=>({type:z.type,loc:z.loc})),cat,kar);if(seen.has(sig))E(f0,'Order Ref',ref,'Duplicate order');else seen.add(sig);}
  if(errs.length){out.errors=out.errors.concat(errs);out.failedOrders++;}
  else out.orders.push({ref,row:f0.n,S:{code:pr.code,cust:pr.cust,date:dt,time:tm,stops,qty,cat,kar,ton,vol,note:first('Special Handling Note')}});});
 return out;}
/* create every valid order in ONE write (fast for 1000 rows); dealing runs for each, Sales is tagged with one summary */
function commitBulk(orders){const all=STORE.get('orders');const next={};const idFor=date=>{if(next[date]==null)next[date]=all.filter(o=>o.date===date).reduce((a,o)=>Math.max(a,+o.id.slice(-4)),0);next[date]++;return 'ORD-'+date.replace(/-/g,'')+'-'+String(next[date]).padStart(4,'0');};
 const made=[];const me=STORE.me();const now=STORE.now();
 orders.forEach(x=>{const o=toOrder(x.S,{id:idFor(x.S.date),source:'Import',createdAt:now,createdBy:me.n,history:[],status:'Draft'});Object.assign(o,{submittedAt:now,submittedBy:me.n});runDealing(o,{quiet:true});markReady(o);made.push(o);});
 STORE.set('orders',all.concat(made));
 const a=STORE.get('auditLog');const rows=made.map(o=>({id:UI.uid('AU'),ts:now,actor:me.n,role:me.r,type:'Order',action:'Created order (Bulk Order)',detail:o.status==='Ready to Assign'?'Ready to Assign':'Draft, no rate',obj:o.id}));
 made.filter(o=>o.status==='Pending Dealing').forEach(o=>rows.push({id:UI.uid('AU'),ts:now,actor:'System',role:'',type:'Dealing',action:'Sales tagged automatically (WhatsApp)',detail:missingText(o),obj:o.id}));
 rows.push({id:UI.uid('AU'),ts:now,actor:me.n,role:me.r,type:'Order',action:'Bulk Order import',detail:made.length+' orders',obj:'Order Management'});
 STORE.set('auditLog',rows.reverse().concat(a).slice(0,1500));
 const pend=made.filter(o=>o.status==='Pending Dealing');
 if(pend.length)STORE.notify({kind:'Action Required',to:['sales'],title:'Add rate: '+pend.length+' imported orders have routes without a rate',link:'order-detail.html?id='+pend[0].id});
 return made;}
/* export: one row per location (order level columns repeat), same headers as the Bulk Order template so the file imports again */
function exportRows(list){const out=[];list.forEach(o=>{const st=stopsOf(o);(st.length?st:[blankStop('Pick Up')]).forEach((s,i)=>out.push({o,s,i}));});return out;}
const EXPORT_COLS=[
 {h:'Order Ref',v:x=>x.o.id},{h:'Plan ID',v:x=>planId(x.o)},{h:'Customer Name',v:x=>x.o.customer||''},{h:'Project Name',v:x=>x.o.projectName||(project(x.o)||{}).name||''},
 {h:'Delivery Start Date',v:x=>x.o.date},{h:'Delivery Start Time',v:x=>(x.o.window||[])[0]||''},
 {h:'Location Type',v:x=>x.s.type},{h:'Location',v:x=>x.s.loc},{h:'Address',v:x=>x.s.custom?(x.s.addr||''):''},{h:'City',v:x=>x.s.city||''},{h:'Latitude',v:x=>x.s.custom?(x.s.lat||''):''},{h:'Longitude',v:x=>x.s.custom?(x.s.lng||''):''},
 {h:'Est. Arrival Date',v:x=>x.s.etaDate||x.o.date||''},{h:'Est. Arrival Time',v:x=>x.s.eta||''},{h:'Handling Time (min)',v:x=>x.s.handling==null?'':x.s.handling},{h:'No DO',v:x=>(x.s.dos||[]).join(', ')},
 {h:'Qty Unit',v:x=>x.o.qty||1},{h:'Unit Category',v:x=>x.o.unitCategory||''},{h:'Karoseri',v:x=>x.o.body||''},{h:'Tonase',v:x=>x.o.ton||''},{h:'Volume',v:x=>x.o.m3||''},{h:'Special Handling Note',v:x=>x.o.note||''}];
/* ---------- list columns shared by Orders and Dealing (same columns, same style) ---------- */
function listCols(){const pr=o=>project(o)||{};return [
 {k:'status',h:'Status',cls:'stc',w:150,status:true,text:statusText,render:statusCell},
 {k:'id',h:'Order ID'},{k:'cust',h:'Customer Name',ell:1,w:190,text:o=>o.customer||''},{k:'plan',h:'Plan ID',text:planId},
 {k:'proj',h:'Customer Project',ell:1,w:200,text:o=>o.projectName||pr(o).name||''},{k:'biz',h:'Business Line',text:o=>pr(o).bizline||''},{k:'ptype',h:'Project Type',text:o=>o.ptype||pr(o).ptype||''},
 {k:'ful',h:'Fulfillment by Ownership',text:fulfillment},
 {k:'odate',h:'Order Date & Time',sortv:o=>o.createdAt,text:o=>UI.fdt(o.createdAt)},
 {k:'pick',h:'Delivery Start Date & Time',sortv:o=>o.date+' '+((o.window||[])[0]||''),text:o=>UI.fdate(o.date,{noYear:1})+' '+((o.window||[])[0]||'')},
 {k:'source',h:'Source',text:o=>o.source||''}];}
/* same value as Project Planning (PP.modeOf): the plan's mode, blank for On Call or when not set yet */
/* the Project Manager only sees the orders of the plans assigned to him / her */
function visible(o){if(STORE.persona()!=='pm')return true;const p=DOM.allPlans().find(x=>x.project===o.project);return !p||p.pm===STORE.me().n;}
function fulfillCode(code){const p=DOM.allPlans().find(x=>x.project===code);if(!p)return '-';const pr=MD.project(p.projectId)||{};if(pr.ptype==='On Call')return '-';return ['Own Asset','Vendor','Mix'].indexOf(p.mode)>=0?UI.own(p.mode):'-';}
function fulfillment(o){const p=DOM.allPlans().find(x=>x.project===o.project);if(!p)return '-';if((o.ptype||pr0(o).ptype)==='On Call')return '-';return ['Own Asset','Vendor','Mix'].indexOf(p.mode)>=0?UI.own(p.mode):'-';}
function pr0(o){return project(o)||{};}
/* ---------- assignment SLA, one rule for the Assignment tab, Workbench, Monitoring and Alerts ---------- */
window.ORD={visible,loadLeaflet,fulfillment,TYPES,REASONS,planId,project,city,route,cust,src,statusCell,statusText,capStatus,inAssignment,pickup,byId,save,newId,submit,drop,newOrder,openForm,locs,projectsDD,pickList,
 stopsOf,sync,blankStop,regionOf,projInfo,liveDealing,missingLegs,missingText,legText,dealingOk,runDealing,autoRecheck,ensureTags,tagSales,toOrder,
 bulk:{headers:BH,required:BREQ,template:bulkTemplate,parse:parseBulk,commit:commitBulk},exportRows,EXPORT_COLS,listCols};
})();
