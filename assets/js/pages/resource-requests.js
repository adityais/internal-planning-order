/* Resource Requests (FR-24): cross-project list of resource requests.
   Supply processes Open unit requests (Fulfilled FR-23 / Reject FR-15); PM & Planner are read-only.
   Request creation stays on Resource Allocation (Requested Unit panel, FR-11); this page owns the list,
   detail and the two Supply actions. Everything is driven by request.project, never by a page-level project.
   The domain helpers below mirror Resource Allocation on purpose: the two pages are separate documents. */
(function(){
'use strict';
const {ic,esc,tag,ps}=UI;const {$,$$,DLG,toast,banner}=C;
if(!SHELL.mount({module:'planning',id:'requests',active:'requests',title:'Resource Requests',crumb:'Setup',actions:'<button type="button" class="btn" id="hist">'+ic('history')+'History</button>'}))return;
/* who may fulfil / reject (roles.js): Supply Management = vendor units, Vehicle Management = own units (Driver Management handles own drivers, not built here) */
/* Supply Management processes every Open request (Vendor and Own units); Vehicle Management only the own ones */
const isDrv=r=>r.utype==='Driver';
/* which side owns the request: Own Asset (VM for units, DM for drivers) or Transporter (Supply); 'Mix' / empty ownership follows the plan: Own Asset or Vendor, a Mix plan with no choice can be handled by either side */
const sideOf=r=>{const o=UI.own(r.ownership);if(o==='Own Asset')return 'own';if(o==='Transporter')return 'vendor';const m=(planOf(r.project)||{}).mode;return m==='Own Asset'?'own':m==='Vendor'?'vendor':'both';};
const permsOf=r=>{const s=sideOf(r);const own=isDrv(r)?'ownDriver':'ownUnit';return s==='own'?[own]:s==='vendor'?['vendorUnit']:[own,'vendorUnit'];};
const ownTxt=r=>{const o=UI.own(r.ownership);if(o==='Own Asset'||o==='Transporter')return o;const s=sideOf(r);return s==='own'?'Own Asset':s==='vendor'?'Transporter':'Mix';};
const canAct=r=>permsOf(r).some(p=>STORE.can(p));
const roleName=r=>{const s=sideOf(r);const mine=permsOf(r).filter(p=>STORE.can(p))[0];return mine==='vendorUnit'||(s==='vendor')?'Supply':isDrv(r)?'Driver Management':'Vehicle Management';};
const srcOf=r=>{const s=sideOf(r);return s==='own'?['Own']:s==='vendor'?['Vendor']:['Own','Vendor'];};
/* ---- domain helpers (same semantics as Resource Allocation) ---- */
const planOf=c=>DOM.plans().find(p=>p.project===c);
const projOf=c=>{const p=planOf(c);return (p&&MD.project(p.projectId))||{};};
const pname=c=>projOf(c).name||c;
const custOf=c=>projOf(c).customer||'-';
const isClosed=c=>{const p=planOf(c);return !!(p&&p.status==='Closed');};
const modeSrc=m=>m==='Vendor'?['Vendor']:m==='Mix'?['Own','Vendor']:m==='Own Asset'?['Own']:[];
const overlaps=(a,from,to)=>a.validFrom<=to&&a.validTo>=from;
const usedIn=(plate,from,to)=>STORE.get('allocations').filter(a=>a.kind==='unit'&&a.plate===plate&&a.status!=='Released'&&overlaps(a,from,to));
const maint=(plate,from,to)=>{const v=MD.vehicle(plate);if(v&&v.opStatus!=='Available')return true;return !!STORE.get('unitStatus').find(s=>s.plate===plate&&s.from<=to&&(!s.to||s.to>=from));};
/* FR-24: Category + Karoseri stay two separate fields; a Driver request has no Karoseri ("-") */
const catOf=r=>r.utype==='Driver'?'Driver':UI.splitType(r.utype).cat;
const karOf=r=>r.utype==='Driver'?'':UI.splitType(r.utype).kar;
/* ---- list state: column-header filters only (B2). The only free-text search is Request ID. ---- */
const baseAll=()=>STORE.get('resourceRequests').filter(r=>planOf(r.project)&&!isClosed(r.project));
/* two tabs: Unit (Supply + VM act) and Driver (DM acts, Supply on Transporter drivers); a role only gets the tabs it may see */
const TABS=[['unit','Unit'],['driver','Driver']].filter(t=>ROLES.canTab('requests',t[0]));
let tab=UI.q('tab');{const rq=STORE.byId('resourceRequests',UI.q('request')||'');if(rq)tab=isDrv(rq)?'driver':'unit';}if(!TABS.some(t=>t[0]===tab))tab=(TABS[0]||['unit'])[0];
const base=()=>baseAll().filter(r=>tab==='driver'?isDrv(r):!isDrv(r));
/* FR-24: default Open first, then terminal; Requested at newest, Request ID as tie-break (before pagination) */
function defSort(a,b){const oa=a.status==='Open'?0:1,ob=b.status==='Open'?0:1;if(oa!==ob)return oa-ob;const ta=a.at||0,tb=b.at||0;if(ta!==tb)return tb-ta;return String(a.id).localeCompare(String(b.id));}
const uniq=a=>[...new Set(a.filter(Boolean))].sort();
const custList=()=>uniq(base().map(r=>custOf(r.project))).filter(x=>x!=='-');
const projList=()=>uniq(base().map(r=>pname(r.project)));
const catList=()=>uniq(base().map(catOf));
const karList=()=>uniq(base().map(karOf));
let TBL=null;
const count=()=>{const e=$('#rfn');if(e)e.textContent=UI.plural(TBL?TBL.filtered().length:base().length,'request');};
/* FR-24: Supply gets inline Fulfilled / Reject on Open UNIT requests; terminal & Driver requests and PM/Planner get View */
const canReject=r=>canAct(r)&&r.status==='Open'&&!isClosed(r.project);
const canProc=canReject;
/* FR-24/B2: one filter model - free-text column header filters (no dropdown chrome).
   Status stays first, Action last. */
function cols(){const head=[{k:'id',h:'Request ID',w:150,text:r=>r.id},{k:'plan',h:'Plan ID',w:95,text:r=>(planOf(r.project)||{}).id||'-'},{k:'cust',h:'Customer Name',w:180,text:r=>custOf(r.project)},{k:'proj',h:'Project Name',w:190,text:r=>pname(r.project)},{k:'own',h:'Ownership',w:110,text:r=>ownTxt(r)}];
 const mid=tab==='driver'?[{k:'lic',h:'License',w:130,text:r=>r.license||'-'},{k:'cert',h:'Certification',w:150,text:r=>r.cert||'-'}]:[{k:'cat',h:'Category',w:110,text:r=>catOf(r)},{k:'kar',h:'Karoseri',w:130,text:r=>karOf(r)}];
 const tail=[{k:'qty',h:'Number',cls:'num',w:80,text:r=>r.qty,render:r=>r.qty},{k:'period',h:'From - To',w:190,sortv:r=>r.from,text:r=>UI.fdate(r.from,{noYear:1})+' - '+UI.fdate(r.to,{noYear:1})},{k:'reason',h:'Reason',w:200,ell:1,text:r=>r.reason||'-'},{k:'by',h:'Requested By',w:170,text:r=>r.by||''},{k:'at',h:'Requested At',w:170,sortv:r=>r.at,text:r=>UI.fdt(r.at)},{k:'status',h:'Status',cls:'stc',w:130,status:true,text:r=>r.status,render:r=>ps(r.status)}];
 const st=tail.pop();return [st].concat(head,mid,tail);}function drawTable(){TBL=C.table($('#tbl'),{key:'id',minw:1200,label:tab==='driver'?'Driver requests':'Unit requests',rows:()=>base().sort(defSort),cols:cols(),empty:{text:tab==='driver'?'No driver requests':'No unit requests'},actions:{defs:[['view','eye','View',''],['fulfill','check','Fulfill','ok'],['reject','ban','Reject','del']],view:r=>update(r.id),fulfill:r=>fulfill(r.id),reject:r=>reject(r.id),can:(k,r)=>k==='view'||(k==='fulfill'&&canProc(r))||(k==='reject'&&canReject(r)),name:r=>r.id}});
 count();}
/* actions re-render the rows but never reset the user's header filters or page */
function refresh(){if(TBL)TBL.render();drawTabs();count();}
function render(){
 $('#content').innerHTML='<div id="rtabs"></div><div class="row gap2 wrap mt2"><span class="sm mut" id="rfn"></span></div><div class="panel mt2" id="tbl"></div>';
  drawTabs();drawTable();}
function drawTabs(){const n=k=>baseAll().filter(r=>k==='driver'?isDrv(r):!isDrv(r)).length;$('#rtabs').innerHTML=PL.tabs(TABS.map(t=>[t[0],t[1],n(t[0])]),tab);$$('[data-tab]',$('#rtabs')).forEach(b=>b.onclick=()=>{tab=b.dataset.tab;history.replaceState(null,'','?tab='+tab);render();});}
/* FR-15/FR-23: Fulfilled = pick exactly Qty Active plates matching Category + Karoseri and the SAVED
   Fulfillment Mode, then save allocations + request status in one atomic step (OQ-RA-1). One failing row
   cancels the whole save; the request stays Open and no allocation is created or changed.
   Detail FR-23 5: one NEW Active allocation per plate - no pending/plate-null row, no poolOrder. */
function fulfill(id){const r=STORE.byId('resourceRequests',id);if(!r)return;if(r.utype==='Driver')return fulfillDriver(id);
 const rp=planOf(r.project)||{};
 const src=srcOf(r);const ft=UI.splitType(r.utype);
 const known=UI.CATS.indexOf(ft.cat)>=0&&!!ft.kar&&UI.KAROS.indexOf(ft.kar)>=0;
 const srcLabel=src.length?src.join(' + '):'-';
 const cust=custOf(r.project);
 const modeOk=v=>v.own==='vendor'?src.indexOf('Vendor')>=0:src.indexOf('Own')>=0;
 const info=v=>{const hit=usedIn(v.plate,r.from,r.to)[0];return {dis:hit?(hit.project===r.project?'Already allocated to this project':'Allocated to '+pname(hit.project)):'',maint:maint(v.plate,r.from,r.to)};};
 /* the request as a match target: Category + Karoseri + the Tonase / Volume of that Requested Unit row of the plan */
 const rrow=(rp.project?PP.reqUnits(rp):[]).find(x=>x.cat===ft.cat&&MD.karGroup(x.kar)===MD.karGroup(ft.kar))||{};
 const need={cat:ft.cat,kar:ft.kar,ton:rrow.ton==null?null:rrow.ton,vol:rrow.vol==null?null:rrow.vol,n:r.qty};
 /* own asset first, then the units that match Category + Karoseri + Tonase + Volume, then License Plate A-Z */
 const cands=()=>PP.orderUnits(MD.get().dd.vehicles.filter(v=>v.plate&&v.status==='Active'&&v.chassis===ft.cat&&v.body===ft.kar&&modeOk(v)&&src.indexOf(v.own==='vendor'?'Vendor':'Own')>=0).map(v=>Object.assign({},v,{_i:info(v)})).filter(v=>!v._i.dis),[need]);
 let TBL=null,L=null,auto=false;
 const mkBtns=()=>[{label:'Cancel'},{label:'Fulfilled',kind:'primary',icon:'check',disabled:!TBL||TBL.sel.size!==r.qty,onClick(l,el){
  const sel=[...TBL.sel];const errs=[];
  if(!canAct(r))errs.push('Your role cannot fulfil this request');
  if(!known)errs.push('Request combination "'+r.utype+'" is not mapped to a Category + Karoseri in Master Data');
  if(!src.length)errs.push('Fulfillment Mode is not saved for '+pname(r.project));
  const rows=STORE.get('resourceRequests');const x=rows.find(y=>y.id===id);
  if(!x||x.status!=='Open')errs.push('Request is no longer Open');
  if(rp.status==='Closed')errs.push('Project plan is Closed');
  if(rp.validUntil&&r.to>rp.validUntil)errs.push('Request period is outside the project validity');
  if(sel.length!==r.qty)errs.push('Select exactly '+r.qty+' plate'+(r.qty===1?'':'s'));
  if(new Set(sel).size!==sel.length)errs.push('Duplicate plates selected');
  const all=STORE.get('allocations');
  sel.forEach(pl=>{const v=MD.vehicle(pl);
   if(!v||v.status!=='Active'){errs.push(pl+': not an Active Vehicle in Master Data');return;}
   if(v.chassis!==ft.cat||v.body!==ft.kar){errs.push(pl+': '+v.chassis+' '+v.body+' does not match '+ft.cat+' + '+ft.kar);return;}
   if(!modeOk(v)){errs.push(pl+': ownership is not allowed by the saved Fulfillment Mode');return;}
   const hit=all.find(a=>a.kind==='unit'&&a.plate===pl&&a.status!=='Released'&&overlaps(a,r.from,r.to));
   if(hit)errs.push(pl+': '+(hit.project===r.project?'already allocated to this project':'allocated to '+pname(hit.project)));});
  if(errs.length){$('#fErr',el).innerHTML=banner('err','<b>Nothing saved</b><div class="sm">'+errs.map(esc).join('<br>')+'</div>');return false;}
  const links=[];
  sel.forEach(pl=>{const v=MD.vehicle(pl);
   const nid='AL-'+String(Math.max(0,...all.map(a=>+(a.id.split('-')[1])||0))+1).padStart(4,'0');
   all.push({id:nid,project:r.project,kind:'unit',plate:pl,source:v.own==='vendor'?'Vendor':'Own',vendor:v.own==='vendor'?(v.vendor||''):'',status:'Active',validFrom:r.from,validTo:r.to,role:'Default',requestId:r.id});
   links.push({plate:pl,allocation:nid});});
  x.status='Fulfilled';x.fulfillment=links;x.resolvedBy=STORE.me().n;x.resolvedAt=STORE.now();
  x.updates.push({by:STORE.me().n,at:STORE.now(),text:'Fulfilled: '+sel.join(', '),action:'Fulfilled'});
  STORE.set('allocations',all);STORE.set('resourceRequests',rows);
  STORE.audit({action:'Request '+id+' Fulfilled',detail:links.map(f=>f.allocation+' '+f.plate).join('; '),obj:r.project,type:'Allocation'});
  STORE.notify({kind:'Info',to:['pm','planner'],title:id+' Fulfilled '+sel.length+' x '+ft.cat+' '+ft.kar+': '+sel.join(', ')+' ('+UI.fdate(r.from,{noYear:1})+' - '+UI.fdate(r.to,{noYear:1})+')',link:'resource-requests.html?request='+id});
  toast(id+' fulfilled');refresh();}}];
 const upd=n=>{const e=$('#fSel',L.el);if(e){e.textContent='Selected '+n+' / '+r.qty;}L.setButtons(mkBtns());};
 const draw=()=>{TBL=C.table($('#ful',L.el),{key:'plate',label:'Vehicles',minw:1000,rows:cands,select:1,selectable:v=>!v._i.dis,keepScroll:1,after:h=>PP.fit(h,10),
  cols:[{k:'plate',h:'License Plate',w:190,render:v=>esc(v.plate)+(v._i.dis?'<div class="xs mut">'+esc(v._i.dis)+'</div>':'')+(v._i.maint?'<div class="xs mut">Maintenance</div>':'')},
   {k:'own',h:'Ownership',w:110,text:v=>UI.own(v.ownership)},
   {k:'vendor',h:'Vendor',w:180,text:v=>v.vendor||'-'},
   {k:'biz',h:'Business Line',w:140,text:v=>v.bizline||'-'},
   {k:'cat',h:'Unit Category',w:110,text:v=>v.chassis},
   {k:'kar',h:'Karoseri',w:160,text:v=>v.karoseri},
   {k:'liq',h:'Liq Vol',w:80,cls:'num',text:v=>v.m3},
   {k:'ship',h:'Shipping Vol',w:100,cls:'num',text:v=>v.shipvol==null?'-':v.shipvol},
   {k:'ton',h:'Tonase',w:80,cls:'num',text:v=>v.ton},
   {k:'notes',h:'Notes',w:180,ell:1,text:v=>v.notes||'-'}],paged:false,
  empty:{text:'No active vehicles match '+ft.cat+' + '+ft.kar+' for '+srcLabel},onSelect:sel=>upd(sel.size)});
  /* auto-select: as many matching units as the request needs (match only), once */
  if(!auto){auto=true;PP.autoSelect(cands(),[need],v=>!v._i.dis).forEach(pl=>TBL.sel.add(pl));TBL.render();}
  upd(TBL.sel.size);};
 DLG.open({cls:'ra-dlg',title:'Fulfill request',sub:esc(r.id),width:1100,
  body:'<div class="ra-info"><div><span class="k">Customer Name</span><b>'+esc(cust)+'</b></div><div><span class="k">Project Name</span><b>'+esc(pname(r.project))+'</b></div><div><span class="k">Unit Category</span><b>'+esc(ft.cat||'-')+'</b></div><div><span class="k">Karoseri</span><b>'+esc(ft.kar||'-')+'</b></div><div><span class="k">Qty</span><b>'+r.qty+'</b></div><div><span class="k">From - To</span><b>'+UI.fdate(r.from)+' - '+UI.fdate(r.to)+'</b></div><div><span class="k">Requested by</span><b>'+esc(r.by)+', '+UI.fdt(r.at)+'</b></div><div><span class="k">Reason</span><b>'+esc(r.reason)+'</b></div></div>'+
   '<div id="fErr"></div>'+(src.length?'':banner('warn','Fulfillment by Ownership is not set in Project Planning',{sm:1}))+
   (known?'':banner('warn','Combination "'+esc(r.utype)+'" is not mapped in Master Data',{sm:1}))+
   '<div class="ra-bar"><span class="ra-count" id="fSel">Selected 0 / '+r.qty+'</span></div>'+
   (known&&src.length?'<div id="ful"></div>':''),
  footLeft:'<a class="btn sm" href="'+MD.MDPATH+'vehicle.html" target="_blank" rel="noopener">'+ic('external')+'Open Master Data Vehicle</a>',
  buttons:mkBtns(),
  onOpen(l,el){L=l;if(!known||!src.length)return;draw();}});}
/* Fulfill a Driver request: pick exactly Qty Active drivers allowed by the saved Fulfillment Mode and the request Ownership (Own Asset / Transporter / Mix),
   free for the whole period; License / Certification asked for are matched first. One new Active driver allocation per driver, saved with the request status in one step. */
function fulfillDriver(id){const r=STORE.byId('resourceRequests',id);if(!r)return;
 const rp=planOf(r.project)||{};const src=srcOf(r);const srcLabel=src.length?src.join(' + '):'-';
 const ownOk=(own,isOwn)=>!own||own==='Mix'||(own==='Internal'||own==='In House')&&isOwn||(own==='Transporter'||own==='Outsource')&&!isOwn;
 const want={lic:r.license?[r.license]:[],cert:r.cert?[r.cert]:[]};
 const used=d=>STORE.get('allocations').filter(a=>a.kind==='driver'&&a.driver===d.id&&a.status!=='Released'&&overlaps(a,r.from,r.to))[0];
 const cands=()=>MD.get().dd.drivers.filter(d=>d.status==='Active'&&src.indexOf(d.own==='vendor'?'Vendor':'Own')>=0&&ownOk(r.ownership,d.own==='own')).map(d=>{const hit=used(d);return Object.assign({},d,{_dis:hit?(hit.project===r.project?'Already allocated to this project':'Allocated to '+pname(hit.project)):'',_m:PP.hasAll(d.licenses,want.lic)&&PP.hasAll(d.certs,want.cert)?0:1});}).filter(d=>!d._dis).sort((a,b)=>(a.own==='own'?0:1)-(b.own==='own'?0:1)||a._m-b._m||String(a.name).localeCompare(String(b.name)));
 let TBL=null,L=null,auto=false;
 const mkBtns=()=>[{label:'Cancel'},{label:'Fulfilled',kind:'primary',icon:'check',disabled:!TBL||TBL.sel.size!==r.qty,onClick(l,el){
  const sel=[...TBL.sel];const errs=[];
  if(!canAct(r))errs.push('Your role cannot fulfil this request');
  if(!src.length)errs.push('Fulfillment Mode is not saved for '+pname(r.project));
  const rows=STORE.get('resourceRequests');const x=rows.find(y=>y.id===id);
  if(!x||x.status!=='Open')errs.push('Request is no longer Open');
  if(rp.status==='Closed')errs.push('Project plan is Closed');
  if(rp.validUntil&&r.to>rp.validUntil)errs.push('Request period is outside the project validity');
  if(sel.length!==r.qty)errs.push('Select exactly '+r.qty+' driver'+(r.qty===1?'':'s'));
  const all=STORE.get('allocations');
  sel.forEach(did=>{const d=MD.driver(did);
   if(!d||d.status!=='Active'){errs.push(did+': not an Active driver in Master Data');return;}
   if(src.indexOf(d.own==='vendor'?'Vendor':'Own')<0||!ownOk(r.ownership,d.own==='own')){errs.push(d.name+': ownership does not match the request');return;}
   const hit=all.find(a=>a.kind==='driver'&&a.driver===did&&a.status!=='Released'&&overlaps(a,r.from,r.to));
   if(hit)errs.push(d.name+': '+(hit.project===r.project?'already allocated to this project':'allocated to '+pname(hit.project)));});
  if(errs.length){$('#fErr',el).innerHTML=banner('err','<b>Nothing saved</b><div class="sm">'+errs.map(esc).join('<br>')+'</div>');return false;}
  const links=[];
  sel.forEach(did=>{const d=MD.driver(did);
   const nid='AL-'+String(Math.max(0,...all.map(a=>+(String(a.id).split('-')[1])||0))+1).padStart(4,'0');
   all.push({id:nid,project:r.project,kind:'driver',driver:did,source:d.own==='vendor'?'Vendor':'Own',status:'Active',validFrom:r.from,validTo:r.to,role:'Default',requestId:r.id});
   links.push({driver:did,name:d.name,allocation:nid});});
  x.status='Fulfilled';x.fulfillment=links;x.resolvedBy=STORE.me().n;x.resolvedAt=STORE.now();
  x.updates.push({by:STORE.me().n,at:STORE.now(),text:'Fulfilled: '+links.map(f=>f.name).join(', '),action:'Fulfilled'});
  STORE.set('allocations',all);STORE.set('resourceRequests',rows);
  STORE.audit({action:'Request '+id+' Fulfilled',detail:links.map(f=>f.allocation+' '+f.name).join('; '),obj:r.project,type:'Allocation'});
  STORE.notify({kind:'Info',to:['pm','planner'],title:id+' Fulfilled '+links.length+' driver: '+links.map(f=>f.name).join(', ')+' ('+UI.fdate(r.from,{noYear:1})+' - '+UI.fdate(r.to,{noYear:1})+')',link:'resource-requests.html?request='+id});
  toast(id+' fulfilled');refresh();}}];
 const upd=n=>{const e=$('#fSel',L.el);if(e){e.textContent='Selected '+n+' / '+r.qty;}L.setButtons(mkBtns());};
 const draw=()=>{TBL=C.table($('#ful',L.el),{key:'id',label:'Drivers',minw:900,rows:cands,select:1,selectable:d=>!d._dis,keepScroll:1,after:h=>PP.fit(h,10),
  cols:PP.driverCols({notes:false}),paged:false,
  empty:{text:'No active drivers match '+(UI.own(r.ownership)||'-')+' for '+srcLabel},onSelect:sel=>upd(sel.size)});
  if(!auto){auto=true;PP.autoSelectDrivers(cands(),r.qty,want,d=>!d._dis).forEach(i=>TBL.sel.add(i));TBL.render();}
  upd(TBL.sel.size);};
 DLG.open({cls:'ra-dlg',title:'Fulfill request',sub:esc(r.id),width:1100,
  body:'<div class="ra-info"><div><span class="k">Customer Name</span><b>'+esc(custOf(r.project))+'</b></div><div><span class="k">Project Name</span><b>'+esc(pname(r.project))+'</b></div><div><span class="k">Ownership</span><b>'+esc(UI.own(r.ownership)||'-')+'</b></div><div><span class="k">License</span><b>'+esc(r.license||'-')+'</b></div><div><span class="k">Certification</span><b>'+esc(r.cert||'-')+'</b></div><div><span class="k">Qty</span><b>'+r.qty+'</b></div><div><span class="k">From - To</span><b>'+UI.fdate(r.from)+' - '+UI.fdate(r.to)+'</b></div><div><span class="k">Reason</span><b>'+esc(r.reason)+'</b></div></div>'+
   '<div id="fErr"></div>'+(src.length?'':banner('warn','Fulfillment by Ownership is not set in Project Planning',{sm:1}))+
   '<div class="ra-bar"><span class="ra-count" id="fSel">Selected 0 / '+r.qty+'</span></div>'+(src.length?'<div id="ful"></div>':''),
  buttons:mkBtns(),
  onOpen(l,el){L=l;if(!src.length)return;draw();}});}
/* FR-15/AC 18 (OQ-RA-2): Reject saves Cancelled with a mandatory reason, shown as "Rejected by <role>" */
function reject(id){const r=STORE.byId('resourceRequests',id);if(!r)return;
 DLG.confirm({title:'Reject request',sub:esc(r.id),width:480,danger:true,ok:'Reject',reason:true,reasonLabel:'Reason',
  body:'<dl class="kv2"><dt>Category</dt><dd>'+esc(catOf(r))+'</dd><dt>Karoseri</dt><dd>'+esc(karOf(r)||'-')+'</dd><dt>Qty</dt><dd>'+r.qty+'</dd><dt>Period</dt><dd>'+UI.fdate(r.from)+' - '+UI.fdate(r.to)+'</dd></dl>'}).then(v=>{if(!v)return;
  if(!canAct(r)){toast('Your role cannot reject this request',{tone:'warn'});return;}
  const rows=STORE.get('resourceRequests');const x=rows.find(y=>y.id===id);
  if(!x||x.status!=='Open'){toast('Request is no longer Open',{tone:'warn'});return;}
  if(isClosed(x.project)){toast('Project is closed - the request is read-only',{tone:'warn'});return;}
  x.status='Cancelled';x.resolvedBy=STORE.me().n;x.resolvedAt=STORE.now();x.updates.push({by:STORE.me().n,at:STORE.now(),text:v,action:'Rejected by '+roleName(r)});
  STORE.set('resourceRequests',rows);
  STORE.audit({action:'Request '+id+' Rejected by '+roleName(r),detail:v,obj:x.project,type:'Allocation'});
  STORE.notify({kind:'Info',to:['pm','planner'],title:id+' Rejected by '+roleName(r)+': '+v,link:'resource-requests.html?request='+id});
  toast('Request rejected');refresh();});}
/* read-only detail (FR-15/FR-22): Fulfilled shows its plates / allocations / vendor + history.
   A closed-project request is View-only with a "Project closed" notice; Fulfilled/Reject are not offered. */
function update(id){const r=STORE.byId('resourceRequests',id);if(!r){toast('Request not found',{tone:'warn'});return;}
 const links=r.fulfillment||[];const closed=isClosed(r.project);
 const body=(closed?banner('warn','<b>Project closed</b> - this request is read-only.',{sm:1}):'')+
  '<dl class="kv2"><dt>Request ID</dt><dd>'+esc(r.id)+'</dd><dt>Customer / Project</dt><dd>'+esc(custOf(r.project))+' / '+esc(pname(r.project))+'</dd><dt>Category</dt><dd>'+esc(catOf(r))+'</dd><dt>Karoseri</dt><dd>'+esc(karOf(r)||'-')+'</dd>'+(r.utype==='Driver'?'<dt>License</dt><dd>'+esc(r.license||'-')+'</dd><dt>Certification</dt><dd>'+esc(r.cert||'-')+'</dd>':'')+'<dt>Ownership</dt><dd>'+esc(ownTxt(r))+'</dd><dt>Quantity</dt><dd>'+r.qty+'</dd><dt>Period</dt><dd>'+UI.fdate(r.from)+' - '+UI.fdate(r.to)+'</dd><dt>Reason</dt><dd>'+esc(r.reason)+'</dd><dt>Requested</dt><dd>'+esc(r.by)+', '+UI.fdt(r.at)+'</dd>'+
  (links.length?'<dt>Fulfilled</dt><dd>'+links.map(f=>{if(f.driver)return '<a class="mono" href="allocation.html?project='+encodeURIComponent(r.project)+'">'+esc(f.allocation)+'</a> <b>'+esc(f.name||f.driver)+'</b>';const v=f.plate?MD.vehicle(f.plate):null;const vend=v&&v.own==='vendor'?(v.vendor||'-'):'Own Asset';
   return '<a class="mono" href="allocation.html?project='+encodeURIComponent(r.project)+'">'+esc(f.allocation)+'</a> <b class="plate">'+esc(f.plate)+'</b> '+esc(vend)+' <a class="sm" href="'+MD.MDPATH+'vehicle.html" target="_blank" rel="noopener">'+ic('external','s12')+'Vehicle</a>';}).join('<br>')+'</dd>':'')+
  (r.resolvedBy?'<dt>Resolved by</dt><dd>'+esc(r.resolvedBy)+', '+UI.fdt(r.resolvedAt)+'</dd>':'')+'</dl>'+
  (r.updates.length?'<div class="u-gap-s2 stack">'+r.updates.map(u=>'<div class="sm">'+(u.action?tag(esc(u.action),/^Rejected/.test(u.action)?'red':'green',/^Rejected/.test(u.action)?'ban':'check')+' ':'')+'<b>'+esc(u.by)+'</b> <span class="mut">'+UI.fdt(u.at)+'</span><div>'+esc(u.text)+'</div></div>').join('')+'</div>':'');
 const btns=canProc(r)
  ?[{label:'Close'},{label:'Reject',kind:'danger',onClick(){reject(r.id);}},{label:'Fulfilled',kind:'primary',icon:'check',onClick(){fulfill(r.id);}}]
  :[{label:'Close',kind:'primary'}];
 DLG.open({title:r.id,sub:esc(r.status),width:520,body,buttons:btns});}
/* FR-24 detail 2: ?project= pre-filters the Project header filter; ?request= opens that request's detail */
render();
($('#hist')||{}).onclick=()=>PANELS.history({obj:uniq(base().map(r=>r.project)),title:'Resource Requests',types:['Allocation']});
const qp=UI.q('project');if(qp){const pn=pname(qp);if(projList().indexOf(pn)>=0){TBL.f.proj=pn;TBL.page=1;TBL.render();count();}}
const rid=UI.q('request');if(rid&&STORE.byId('resourceRequests',rid))update(rid);
STORE.subscribe('resourceRequests',(e,s)=>{if(s==='remote')refresh();});
STORE.subscribe('allocations',(e,s)=>{if(s==='remote')refresh();});
})();
