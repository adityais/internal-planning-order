/* DEV-B core for Project Planning, Resource Allocation and Resource Requests (window.PP).
   One place for: plan status / readiness checklist / auto close + auto re-open, requested units / drivers, the shared unit + driver
   column definitions (Master Data fields), unit ordering + auto-select, and the searchable Plan ID / Customer / Project picker.
   Data comes from Master Data (MD.*) and the store; nothing is typed here. */
(function(){
'use strict';
const {esc,ic}=UI;
const dash=v=>v==null||v===''?'-':v;
const plans=()=>DOM.plans();
const proj=p=>MD.project(p.projectId)||{name:p.project,ptype:'-',customer:'-',rates:[]};
const pname=p=>proj(p).name||p.project;
const onCall=p=>proj(p).ptype==='On Call';
const MODES=['Own Asset','Vendor','Mix'];/* stored values; shown as Own Asset / Transporter / Mix (UI.own) */
const MODE_OPTS=MODES.map(m=>[m,UI.own(m)]);
/* Fulfillment by Ownership of a plan: Own Asset / Vendor / Mix only. On Call projects have none (stored 'Per order' is ignored). */
const modeOf=p=>!p||onCall(p)?'':(MODES.indexOf(p.mode)>=0?p.mode:'');
/* Fulfillment by Ownership as shown everywhere: Own Asset / Transporter / Mix for a Dedicated plan; an On Call project has none ('-') */
const modeLabel=p=>!p||onCall(p)?'-':(UI.own(modeOf(p))||'-');
const srcOf=m=>m==='Vendor'?['Vendor']:m==='Mix'?['Own','Vendor']:m==='Own Asset'?['Own']:[];
/* ---------- status (stored value -> shown label) ---------- */
const NO_PM='Pending PM';/* stored value of a plan without a PM; it reads 'PM Assignment'. Once a PM is assigned the plan moves on to In Planning ('PM Assigned' is the stored value of that first step) */
const STAT={'Pending PM':['PM Assignment','amber'],'PM Assigned':['In Planning','navy'],'In Planning':['In Planning','navy'],'Ready':['Ready','green'],'Closed':['Closed','slate']};
const statLabel=s=>(STAT[s]||[s])[0];
const statHtml=s=>UI.status(statLabel(s),(STAT[s]||[])[1]);
/* ---------- allocations / requirement ---------- */
const allocOf=(p,kind)=>STORE.get('allocations').filter(a=>a.project===p.project&&a.status==='Active'&&(!kind||a.kind===kind));
const vkey=v=>v?UI.typeKey(v.chassis,v.body):'';
const crewDrivers=p=>{const o=MD.crew(proj(p));return o&&o.driver?o.driver:1;};
/* Requested Unit rows: Category, Karoseri, Tonase, Volume, Required, Allocated.
   Required = one unit per Rate List row (project + customer rates), grouped per Category + Karoseri + Tonase + Volume (PM decision 2026-10-20).
   A manual override (plan.reqOverride = {"Category Karoseri|ton|vol": n}) wins. */
function reqUnits(p){if(!p||onCall(p))return [];const pr=proj(p);const rl=MD.rateList(pr).rows;const g={},list=[];
 rl.forEach(r=>{const cat=r.kategori,kar=MD.karGroup(r.karoseri);const k=[cat,kar,r.tonase,r.kubikasi].join('|');if(!g[k]){g[k]={key:k,cat,kar,ton:r.tonase==null?null:r.tonase,vol:r.kubikasi==null?null:r.kubikasi,n:0};list.push(g[k]);}g[k].n++;});
 const ov=p.reqOverride||{};const al=allocOf(p,'unit').map(a=>MD.vehicle(a.plate)).filter(Boolean);
 return list.map(x=>({key:x.key,cat:x.cat,kar:x.kar,ton:x.ton,vol:x.vol,req:ov[x.key]!=null?ov[x.key]:x.n,alloc:al.filter(v=>matchNeed(v,x)).length})).sort((a,b)=>a.cat.localeCompare(b.cat)||a.kar.localeCompare(b.kar)||(+a.ton||0)-(+b.ton||0));}
/* Requested Driver: units required x quantity of the Driver role in the Customer Project manpower (plan.reqDriversOverride wins).
   License / Certification show what was asked for in the last Request Driver (plan.driverSpec), "-" otherwise. */
function reqDrivers(p){if(!p||onCall(p))return [];const al=allocOf(p,'driver').length;const sp=p.driverSpec||{};
 const n=p.reqDriversOverride!=null?p.reqDriversOverride:reqUnits(p).reduce((s,r)=>s+r.req,0)*crewDrivers(p);
 return n>0?[{lic:sp.lic||'-',cert:sp.cert||'-',req:n,alloc:al}]:[];}
/* picklists of Master Data Driver: License Type (sim) and Certification (certif) */
const LICENSES=['SIM A','SIM B1','SIM B2','SIM B1 General','SIM B2 General'],CERTS=['SIO','B3','DDT','Vaccine'];
/* ---------- readiness checklist (PM Assignment, Fulfillment by Ownership Type, Vehicle Resource, Driver Resource) ---------- */
function checklist(p){const closed=p.status==='Closed';
 if(onCall(p))return [['PM Assignment',!closed&&!!p.pm]];
 if(closed)return [['PM Assignment',false],['Fulfillment by Ownership Type',false],['Vehicle Resource',false],['Driver Resource',false]];
 const ru=reqUnits(p),rd=reqDrivers(p);
 return [['PM Assignment',!!p.pm],['Fulfillment by Ownership Type',!!modeOf(p)],['Vehicle Resource',ru.length>0&&ru.every(r=>r.alloc>=r.req)],['Driver Resource',rd.length>0&&rd.every(r=>r.alloc>=r.req)]];}
/* status follows the data: no PM = PM Assignment, PM only = In Planning, checklist complete = Ready, otherwise In Planning (On Call: Ready once a PM is assigned) */
function derive(p){if(p.status==='Closed')return 'Closed';if(!p.pm)return 'Pending PM';if(onCall(p))return 'Ready';if(!modeOf(p))return 'PM Assigned';return checklist(p).every(o=>o[1])?'Ready':'In Planning';}
function sync(){const all=STORE.get('projectPlans');let ch=false;all.forEach(p=>{if(p.fixture)return;const s=derive(p);if(s!==p.status){p.status=s;p.updatedAt=STORE.now();ch=true;}});if(ch)STORE.set('projectPlans',all);return ch;}
/* Auto close / auto re-open (FR-12 / FR-13): the plan follows its Master Data Customer Project. Inactive or past validity -> Closed automatically
   and allocations released; the project active again (still valid) -> re-opened automatically, allocations are not restored. */
function autoSync(){const all=STORE.get('projectPlans');const today=STORE.today();let ch=false,al=null;
 all.forEach(p=>{if(p.fixture)return;const pr=MD.project(p.projectId);if(!pr)return;const live=pr.status!=='Inactive'&&(!pr.validity||pr.validity>=today);
  if(!live&&p.status!=='Closed'){p.status='Closed';p.closedAuto=true;p.closedAt=STORE.now();p.updatedAt=STORE.now();ch=true;al=al||STORE.get('allocations');let n=0;
   al.forEach(a=>{if(a.project===p.project&&a.status!=='Released'){a.status='Released';a.validTo=today;a.releaseReason='Plan closed automatically';n++;}});
   STORE.audit({actor:'System',role:'System',action:'Closed automatically',detail:pr.status==='Inactive'?'Customer Project is Inactive':'Customer Project validity ended '+pr.validity,obj:p.id,type:'Status'});}
  else if(live&&p.status==='Closed'&&p.closedAuto){p.status=p.pm?'PM Assigned':'Pending PM';p.reopened={by:'System',at:STORE.now(),reason:'Customer Project is active again'};delete p.closedAuto;p.updatedAt=STORE.now();ch=true;
   STORE.audit({actor:'System',role:'System',action:'Re-opened automatically',detail:'Customer Project is active again; allocations are not restored',obj:p.id,type:'Status'});}});
 if(al)STORE.set('allocations',al);if(ch)STORE.set('projectPlans',all);sync();return ch;}
const isLive=p=>{const pr=MD.project(p.projectId);return !!pr&&pr.status!=='Inactive'&&(!pr.validity||pr.validity>=STORE.today());};
/* Notes of the customer and of the customer project (only the ones that are filled) */
function notesOf(pr){const o=MD.customer(pr.customer);const rows=[];if(o&&o.notes)rows.push(['Customer',o.notes]);if(pr.notes)rows.push(['Customer Project',pr.notes]);return rows;}
/* ---------- Master Data columns, one definition for every unit / driver table ---------- */
const vendorOf=r=>r.own==='vendor'?(r.vendor||'-'):'-';
function unitCols(o){o=o||{};const c=[{k:'plate',h:'License Plate',w:130,text:r=>r.plate||'-'},{k:'own',h:'Ownership',w:110,text:r=>UI.own(r.ownership)||'-'},{k:'vendor',h:'Vendor',w:180,text:vendorOf},{k:'biz',h:'Business Line',w:130,text:r=>r.bizline||'-'},{k:'cat',h:'Unit Category',w:110,text:r=>r.chassis||'-'},{k:'kar',h:'Karoseri',w:160,text:r=>r.karoseri||'-'},{k:'liq',h:'Liq Vol',w:80,cls:'num',text:r=>r.m3==null?'-':r.m3},{k:'ship',h:'Shipping Vol',w:105,cls:'num',text:r=>r.shipvol==null?'-':r.shipvol},{k:'ton',h:'Tonase',w:85,cls:'num',text:r=>r.ton==null?'-':r.ton},{k:'notes',h:'Notes',w:190,ell:1,text:r=>r.notes||'-'}];
 return (o.pre||[]).concat(c);}
function driverCols(o){o=o||{};const c=[{k:'name',h:'Driver Name',w:170,text:r=>r.name||'-'},{k:'own',h:'Ownership',w:110,text:r=>UI.own(r.ownership)||'-'},{k:'vendor',h:'Vendor',w:180,text:vendorOf},{k:'phone',h:'Phone Number',w:140,text:r=>r.phone||'-'},{k:'lic',h:'License Acquired',w:170,text:r=>(r.licenses||[]).join(', ')||'-'},{k:'cert',h:'Certification Acquired',w:190,text:r=>(r.certs||[]).join(', ')||'-'}];
 if(o.notes!==false)c.push({k:'notes',h:'Notes',w:190,ell:1,text:r=>r.notes||'-'});return (o.pre||[]).concat(c);}
/* allocated resources of a plan as Master Data rows (Active allocations only; released ones are history) */
function unitRows(p){return allocOf(p,'unit').map(a=>{const v=MD.vehicle(a.plate);return Object.assign({},v||{plate:a.plate,chassis:'',karoseri:'',own:a.source==='Vendor'?'vendor':'own',ownership:a.source==='Vendor'?'Transporter':'Internal',vendor:a.vendor||''},{allocId:a.id,alloc:a});});}
function driverRows(p){return allocOf(p,'driver').map(a=>{const d=MD.driver(a.driver);return Object.assign({},d||{name:a.driver},{allocId:a.id,alloc:a});});}
/* ---------- unit ordering + auto-select (Request flow) ---------- */
function matchNeed(v,n){return v.chassis===n.cat&&MD.karMatch(v.karoseri,n.kar)&&(n.ton==null||+v.ton===+n.ton)&&(n.vol==null||+v.m3===+n.vol);}
const matchNeed_old=(v,n)=>v.chassis===n.cat&&MD.karMatch(v.karoseri,n.kar)&&(n.ton==null||+v.ton===+n.ton)&&(n.vol==null||+v.m3===+n.vol);
/* Own asset first, then the units that match a requested Category + Karoseri + Tonase + Volume (in request order), then License Plate A-Z */
function orderUnits(list,needs){return list.map(v=>Object.assign({},v,{_m:(needs||[]).findIndex(n=>matchNeed(v,n))})).sort((a,b)=>(a.own==='own'?0:1)-(b.own==='own'?0:1)||(a._m<0?1e9:a._m)-(b._m<0?1e9:b._m)||String(a.plate).localeCompare(String(b.plate)));}
/* pick as many units as each request needs, matching only; a unit that matches nothing is never picked */
function autoSelect(list,needs,ok){const pick=[],used=new Set();(needs||[]).forEach(n=>{let o=n.n;list.forEach(v=>{if(o<=0||used.has(v.plate)||(ok&&!ok(v)))return;if(matchNeed(v,n)){used.add(v.plate);pick.push(v.plate);o--;}});});return pick;}
/* a drivers list: own first, then name A-Z; with optional licence / certification wanted */
const hasAll=(have,want)=>!want||!want.length||want.every(w=>(have||[]).some(h=>String(h).toLowerCase()===String(w).toLowerCase()));
function orderDrivers(list){return list.slice().sort((a,b)=>(a.own==='own'?0:1)-(b.own==='own'?0:1)||String(a.name).localeCompare(String(b.name)));}
function autoSelectDrivers(list,n,want,ok){const pick=[];list.forEach(d=>{if(pick.length>=n||(ok&&!ok(d)))return;if(hasAll(d.licenses,want.lic)&&hasAll(d.certs,want.cert))pick.push(d.id);});return pick;}
/* ---------- table: 10 rows in view, scroll inside the table (no pagination) ---------- */
function fit(host,n){const so=host.querySelector('.tbl-scroll');if(!so)return;so.classList.add('ra-sc');const trs=so.querySelectorAll('thead tr');let hh=0;trs.forEach(t=>hh+=t.offsetHeight);const r=so.querySelector('tbody tr[data-k]');const rh=r?r.offsetHeight:41;
 so.style.setProperty('--ra-h1',(trs[0]?trs[0].offsetHeight:40)+'px');so.style.maxHeight=(hh+rh*(n||10)+2)+'px';}
/* ---------- searchable dropdown ---------- */
let cid=0;
/* o: {id,label,placeholder,options:()=>[{v,t}],value,onPick(v|null)}  -> {html,wire(root),set(v)} */
function combo(o){const id=o.id||('cb'+(++cid));let val=o.value==null?'':o.value;let root=null,open=false,act=-1,typed=false;
 const optsAll=()=>o.options();const textOf=v=>{const x=optsAll().find(y=>y.v===v);return x?x.t:'';};
 const html=()=>'<div class="field ra-cb" data-cb="'+id+'"><label for="'+id+'">'+esc(o.label)+'</label><div class="ra-cin"><input id="'+id+'" class="input" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="'+id+'-l" autocomplete="off" placeholder="'+esc(o.placeholder||'Search')+'" value="'+esc(textOf(val))+'"><button type="button" class="ra-x iconbtn" data-x aria-label="Clear '+esc(o.label)+'"'+(val?'':' hidden')+'>'+ic('x','s12')+'</button><button type="button" class="ra-dd iconbtn" data-dd tabindex="-1" aria-label="Show '+esc(o.label)+' list">'+ic('down','s12')+'</button></div><ul class="ra-list" id="'+id+'-l" role="listbox" hidden></ul></div>';
 function shown(){const q=C.normT(root.querySelector('input').value);const all=optsAll();return typed&&q?all.filter(x=>C.normT(x.t).indexOf(q)>=0):all;}
 function paint(){const ul=root.querySelector('.ra-list');const l=shown();ul.innerHTML=l.length?l.map((x,i)=>'<li role="option" data-v="'+esc(x.v)+'" class="'+(x.v===val?'sel ':'')+(i===act?'act':'')+'" aria-selected="'+(x.v===val)+'">'+esc(x.t)+'</li>').join(''):'<li class="none" aria-disabled="true">No matching results</li>';
  ul.querySelectorAll('li[data-v]').forEach(li=>li.onmousedown=e=>{e.preventDefault();pick(li.dataset.v);});}
 function setOpen(b){open=b;const ul=root.querySelector('.ra-list');ul.hidden=!b;root.querySelector('input').setAttribute('aria-expanded',String(b));if(b){act=-1;paint();}}
 function pick(v){val=v;typed=false;root.querySelector('input').value=textOf(v);root.querySelector('[data-x]').hidden=!v;setOpen(false);o.onPick(v||null);}
 function wire(r){root=r.querySelector('[data-cb="'+id+'"]');const inp=root.querySelector('input');
  inp.onfocus=()=>{typed=false;setOpen(true);inp.select();};inp.onclick=()=>{if(!open){typed=false;setOpen(true);}};
  inp.oninput=()=>{typed=true;act=0;if(!open)setOpen(true);paint();};
  inp.onblur=()=>{setTimeout(()=>{if(!root.contains(document.activeElement)){inp.value=textOf(val);typed=false;setOpen(false);}},120);};
  inp.onkeydown=e=>{const l=shown();if(e.key==='ArrowDown'){e.preventDefault();if(!open)setOpen(true);act=Math.min(l.length-1,act+1);paint();}else if(e.key==='ArrowUp'){e.preventDefault();act=Math.max(0,act-1);paint();}
   else if(e.key==='Enter'){if(open&&l[Math.max(act,0)]){e.preventDefault();pick(l[Math.max(act,0)].v);}}else if(e.key==='Escape'){if(open){e.stopPropagation();inp.value=textOf(val);typed=false;setOpen(false);}}};
  root.querySelector('[data-dd]').onmousedown=e=>{e.preventDefault();if(open)setOpen(false);else{inp.focus();typed=false;setOpen(true);}};
  root.querySelector('[data-x]').onclick=()=>{val='';typed=false;inp.value='';root.querySelector('[data-x]').hidden=true;setOpen(false);o.onPick(null);inp.focus();};}
 function set(v){val=v||'';if(root){root.querySelector('input').value=textOf(val);root.querySelector('[data-x]').hidden=!val;if(open)paint();}}
 return {html,wire,set,get:()=>val,id};}
/* Plan ID / Customer Name / Project Name: three searchable dropdowns that fill each other.
   o: {plans:[plan], value:planId, ids:{plan,cust,proj}, onChange(planId|null)}  -> {html,wire(root),set(planId)} */
function projectPicker(o){const list=()=>o.plans();const cust=p=>proj(p).customer||'-';
 let st={plan:o.value||'',cust:'',proj:''};const fill=id=>{const p=list().find(x=>x.id===id);st={plan:p?p.id:'',cust:p?cust(p):'',proj:p?p.id:''};};if(st.plan)fill(st.plan);
 let cbP,cbC,cbJ;
 let fc='';/* customer chosen in the Customer dropdown limits the Plan ID / Project options; a plan or project picked first only fills the customer */
  const scoped=()=>list().filter(p=>!fc||cust(p)===fc);
 const sync_=()=>{cbP.set(st.plan);cbC.set(st.cust);cbJ.set(st.proj);};
 const emit=()=>o.onChange(st.plan||null);
 cbP=combo({id:(o.ids||{}).plan||'pkPlan',label:'Plan ID',placeholder:'Search Plan ID',value:st.plan,options:()=>scoped().map(p=>({v:p.id,t:p.id})),onPick:v=>{if(v)fill(v);else{st.plan='';st.proj='';}sync_();emit();}});
 cbC=combo({id:(o.ids||{}).cust||'pkCust',label:'Customer Name',placeholder:'Search Customer Name',value:st.cust,options:()=>[...new Set(list().map(cust))].sort().map(o=>({v:o,t:o})),onPick:v=>{if(!v){st={plan:'',cust:'',proj:''};fc='';}else{fc=v;st.cust=v;const ps=list().filter(p=>cust(p)===v);const our=ps.find(p=>p.id===st.plan);if(our){}else if(ps.length===1)fill(ps[0].id);else{st.plan='';st.proj='';}}sync_();emit();}});
 cbJ=combo({id:(o.ids||{}).proj||'pkProj',label:'Project Name',placeholder:'Search Project Name',value:st.proj,options:()=>scoped().map(p=>({v:p.id,t:pname(p)})),onPick:v=>{if(v)fill(v);else{st.plan='';st.proj='';}sync_();emit();}});
 return {html:()=>'<div class="ra-picker">'+cbP.html()+cbC.html()+cbJ.html()+'</div>',wire:r=>{cbP.wire(r);cbC.wire(r);cbJ.wire(r);},set:id=>{fill(id);sync_();},state:()=>st};}
window.PP={MODE_OPTS,LICENSES,CERTS,dash,plans,proj,pname,onCall,MODES,modeOf,modeLabel,srcOf,STAT,statLabel,statHtml,allocOf,reqUnits,reqDrivers,checklist,derive,sync,autoSync,isLive,notesOf,unitCols,driverCols,unitRows,driverRows,matchNeed,orderUnits,autoSelect,orderDrivers,autoSelectDrivers,hasAll,fit,combo,projectPicker,vkey};
})();
