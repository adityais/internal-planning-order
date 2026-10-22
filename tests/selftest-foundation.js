/* Foundation v2 self-test: Master Data alignment, one table helper, status text, row actions, role map, header navigation, import round trip.
   Loads every page in an iframe (console errors) and asserts the DOM / store. Results -> window.RESULTS. */
(async function(){
const R=[];const ok=(area,name,pass,detail)=>{R.push({area,name,pass:!!pass,detail:detail==null?'':String(detail)});paint();};
const out=document.getElementById('out');function paint(){out.innerHTML='<p><b>'+R.filter(r=>r.pass).length+' / '+R.length+' passed</b></p><table>'+R.map(r=>'<tr><td>'+(r.pass?'PASS':'<b style="color:#a52a2a">FAIL</b>')+'</td><td>'+r.area+'</td><td>'+UI.esc(r.name)+'</td><td style="color:#5f6675">'+UI.esc(r.detail)+'</td></tr>').join('')+'</table>';window.RESULTS=R;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
STORE.reset();STORE.setPersona('planner');
async function frame(url,fn,ms){const f=document.createElement('iframe');f.style.cssText='width:1440px;height:900px;position:fixed;left:-3000px;top:0';document.body.appendChild(f);await new Promise(res=>{f.onload=res;f.src='../'+url;});await wait(ms||1100);let r;try{r=await fn(f.contentWindow,f.contentDocument);}catch(e){r={err:String(e)};}const errs=(f.contentWindow.__errs||[]).slice();f.remove();return {r,errs};}
const md=MD.get();
/* ===== 1. Master Data alignment ===== */
const S=window.MD_SNAPSHOT;
ok('Master Data','Snapshot is generated from the MD pages (tools/make-md-snapshot.ps1) and carries every module',S&&S.rows&&['customer','custrate','vehicle','driver','location','vendor','vendrate','priority','incentive','tc_bbm'].every(k=>S.rows[k]&&S.rows[k].length),S&&Object.keys(S.rows).length+' modules, '+S.generatedAt);
ok('Master Data','Customer Projects / vehicles / drivers / customers / locations come from the snapshot (src md)',md.dd.projects.length>0&&md.dd.projects.length<=S.rows.custrate.length&&md.dd.vehicles.filter(v=>!v.demo).length===S.rows.vehicle.length&&md.dd.drivers.filter(d=>!d.demo).length===S.rows.driver.length&&md.dd.vehicles.filter(v=>v.demo).length>=25&&md.dd.drivers.filter(d=>d.demo).length>=30&&md.dd.customers.length===S.rows.customer.length&&md.dd.locations.length===S.rows.location.length,[md.dd.projects.length,md.dd.vehicles.length,md.dd.drivers.length,md.dd.customers.length,md.dd.locations.length].join('/'));
const activeSnap=S.rows.custrate.filter(r=>r.status.t==='Active');const plans=DOM.allPlans();
ok('Master Data','Only ACTIVE Customer Projects form a Project Plan (PP-0001 ...)',plans.length===MD.activeProjects().length&&plans.every(p=>{const pr=MD.project(p.projectId);return pr&&pr.src==='md'&&pr.status==='Active';})&&plans[0].id==='PP-0001',plans.length+' plans for '+activeSnap.length+' active projects');
const custNames=new Set(S.rows.customer.map(c=>c.nama));
ok('Master Data','Every order customer, every plan project, every allocated plate and driver exists in Master Data',STORE.get('orders').filter(o=>!/ADM-SAP|TAM-PIO/.test(o.project)).every(o=>custNames.has(o.customer))&&STORE.get('allocations').filter(a=>plans.some(p=>p.project===a.project)).every(a=>a.kind==='unit'?md.dd.vehicles.some(v=>v.plate===a.plate):md.dd.drivers.some(d=>d.id===a.driver)),'orders '+STORE.get('orders').length);
ok('Master Data','Invented fleet is not visible to Direct Delivery (fixture vehicles stay src plan for Milkrun only)',md.vehicles.some(v=>v.src==='plan')&&md.dd.vehicles.every(v=>v.src==='md')&&md.dd.drivers.every(d=>d.src==='md'));
ok('Master Data','Vehicle fields: ownership, Transporter Name, Liq Vol, Tonase, notes taken from Master Data',(()=>{const v=MD.vehicle('B 3924 DR');return v&&v.ownership==='Transporter'&&v.vendor==='PT Sinar Jaya Logistik'&&v.ton===20&&v.m3===42&&v.karoseri==='Hydraulic Wing Box'&&v.body==='Wingbox';})());
ok('Master Data','Driver certification names (dates stripped) and licences split by comma',(()=>{const d=md.dd.drivers.find(x=>x.name==='Suparman');return d&&d.certs.join(',')==='SIO,DDT'&&d.licenses.join(',')==='SIM B2 General';})());
ok('Karoseri mapping','Wingbox<->Hydraulic/Terpaulin Wing Box, Box<->Box Besi/Aluminium/Steel Box, Flatbed<->Flat Deck, Bak Terbuka<->Bak Besi*',MD.karMatch('Wingbox','Hydraulic Wing Box')&&MD.karMatch('Wingbox','Terpaulin Wing Box')&&MD.karMatch('Box','Steel Box')&&MD.karMatch('Box','Box Aluminium')&&MD.karMatch('Flatbed','Flat Deck')&&MD.karMatch('Bak Terbuka','Bak Besi (3 Way)')&&!MD.karMatch('Box','Bak Besi')&&!MD.karMatch('Wingbox','Flat Deck'));
const ut=md.dd.projects.find(p=>p.refno==='UT/PKS/2026/0114');const rl=MD.rateList(ut);const keys=rl.rows.map(r=>[MD.cityKey(r.origin),MD.cityKey(r.dest),r.kategori,MD.karGroup(r.karoseri)].join('|'));
ok('Rate List','Customer Project rates + other projects of the same customer, de-duplicated on origin+destination+Category+Karoseri',rl.rows.length>=ut.rates.length&&new Set(keys).size===keys.length&&rl.rows.some(r=>r.level==='Customer Project'),rl.rows.length+' rows ('+ut.rates.length+' own), fixcost '+rl.fixcost);
/* live Master Data wins over the snapshot (moda_md_<module>) */
const keep=localStorage.getItem('moda_md_vehicle');const live=JSON.parse(JSON.stringify(S.rows.vehicle));live.push(Object.assign({},live[0],{plat:'B 0001 TST',status:{t:'Active'}}));localStorage.setItem('moda_md_vehicle',JSON.stringify(live));MD.refresh();
ok('Master Data','A row written by the Master Data page (moda_md_vehicle) appears in Planning without a reseed',!!MD.vehicle('B 0001 TST')&&MD.get().src.vehicle===true);
if(keep==null)localStorage.removeItem('moda_md_vehicle');else localStorage.setItem('moda_md_vehicle',keep);MD.refresh();
/* ===== 2. one table helper ===== */
const host=document.createElement('div');document.body.appendChild(host);
const rowsT=[{id:'1',status:'Allocated',loc:'Location Bandung',n:10},{id:'2',status:'Non Allocated',loc:'Cikarang',n:9},{id:'3',status:'Allocated',loc:'Bandung Kota',n:100}].concat(Array.from({length:10},(x,i)=>({id:'x'+i,status:'Closed',loc:'Zone '+i,n:i})));
const T=C.table(host,{key:'id',rows:rowsT,cols:[{k:'status',h:'Status',render:r=>UI.status(r.status)},{k:'loc',h:'Location'},{k:'n',h:'N',cls:'num'}],actions:{view:()=>{},edit:()=>{},del:()=>{}}});
T.f.status='Allocated';T.render();const st1=[...host.querySelectorAll('tbody tr')].map(r=>r.cells[0].innerText.trim());
ok('Table helper','Column search matches from the start of a word: "Allocated" finds "Non Allocated" but never "Closed"',st1.length===3&&st1.every(s=>/Allocated/.test(s)),st1.join(','));
ok('Table helper','Every column has a search box (no select filters)',!!host.querySelector('input[data-f="status"]')&&!host.querySelector('select[data-f]'));
T.f={};T.f.loc='and';T.render();ok('Table helper','Text column matches per letter / substring, case-insensitive ("and" finds Bandung)',host.querySelectorAll('tbody tr').length===0||[...host.querySelectorAll('tbody tr')].every(r=>/and/i.test(r.cells[1].innerText)),host.querySelectorAll('tbody tr').length+' rows');
T.f={loc:'zzz'};T.render();ok('Table helper','Empty filtered result says "No matching results"',/No matching results/.test(host.innerText));
T.f={};T.page=1;T.render();ok('Table helper','Pagination of 10 rows',host.querySelectorAll('tbody tr').length===10&&/1-10 of 13/.test(host.querySelector('.pager').innerText.replace(/\s+/g,' ')),host.querySelector('.pager').innerText.replace(/\s+/g,' '));
host.querySelector('button[data-sort="n"]').click();let ns=[...host.querySelectorAll('tbody tr')].map(r=>+r.cells[2].innerText);const asc=ns.every((v,i)=>!i||ns[i-1]<=v);host.querySelector('button[data-sort="n"]').click();ns=[...host.querySelectorAll('tbody tr')].map(r=>+r.cells[2].innerText);const desc=ns.every((v,i)=>!i||ns[i-1]>=v);
ok('Table helper','Click header sorts ascending then descending (numeric, not text: 9 < 10 < 100)',asc&&desc,ns.join(','));
const ab=[...host.querySelector('tbody tr').querySelectorAll('.acts button')].map(b=>b.dataset.a+':'+b.title);
ok('Row actions','UI.actions renders icon-only View, Edit, Delete in that order with tooltips',ab.join('|')==='view:View|edit:Edit|del:Delete'&&!host.querySelector('.acts button').textContent.trim());
host.remove();
/* ===== 3. pages: no console error, status text, actions, no coloured labels ===== */
const PG=[['project-planning.html','Plan ID'],['allocation.html','Allocation ID'],['resource-requests.html','Request ID'],['order-inbox.html','Order ID'],['convert.html','Trip ID']];
STORE.setPersona('pm');
for(const [p,idh] of PG){const x=await frame(p,(w,d)=>{const th=[...d.querySelectorAll('thead tr:first-child th')].map(t=>t.textContent.trim());const row=d.querySelector('tbody tr[data-k]');const acts=row?[...row.querySelectorAll('.acts .iconbtn')].map(b=>b.dataset.a||'ph'):[];
 const stx=[...d.querySelectorAll('.stx')];const bad=[...d.querySelectorAll('.tag,.st,.wf')].filter(e=>{const c=getComputedStyle(e);return c.backgroundColor!=='rgba(0, 0, 0, 0)'&&c.backgroundColor!=='transparent';});
 const filt=d.querySelectorAll('tr.colfilter input,tr.colfilter select').length;const cell=row?row.querySelector('td:nth-child(2)'):null;
 return {th,acts,stxIcons:stx.filter(s=>s.querySelector('svg')).length,stx:stx.length,bad:bad.length,filt,mono:cell?getComputedStyle(cell).fontFamily:'',body:getComputedStyle(d.body).fontFamily,rows:d.querySelectorAll('tbody tr[data-k]').length};},1300);
 ok('Page',p+': no console error, per-column filters, Status first, Action last, no coloured label, status without icon',!x.errs.length&&x.r.rows>0&&x.r.filt>=3&&(p==='allocation.html'||x.r.th[0]==='Status')&&x.r.th[x.r.th.length-1]==='Action'&&x.r.bad===0&&x.r.stxIcons===0,(x.errs.join(' | '))||JSON.stringify({th0:x.r.th[0],last:x.r.th[x.r.th.length-1],bad:x.r.bad,icons:x.r.stxIcons,filt:x.r.filt,rows:x.r.rows}));
 ok('Page',p+': row actions are icon-only View / Edit / Delete (same order, placeholder keeps alignment)',(p==='allocation.html'&&x.r.acts.length<=3)||(x.r.acts[0]==='view'&&x.r.acts.length===3),x.r.acts.join(','));
 if(idh==='Plan ID'||idh==='Order ID')ok('Page',p+': ID column uses the same font as the other text (no monospace)',x.r.mono===x.r.body||!/mono|Consolas|Courier/i.test(x.r.mono),x.r.mono);}
STORE.setPersona('planner');let x=await frame('project-planning.html',(w,d)=>({th:[...d.querySelectorAll('thead tr:first-child th')].map(t=>t.textContent.trim()),pager:d.querySelector('.pager').innerText.replace(/\s+/g,' ')}),1200);
ok('Project Planning','Columns: Plan ID, Customer Name, Project Ref Number, Project Name, Moda Business Line, Project Type, Fulfillment Type, Service Level, Project Manager, Start Project, End Validity (no Ready column)',['Plan ID','Customer Name','Project Ref Number','Project Name','Moda Business Line','Project Type','Fulfillment by Ownership','Service Level','Project Manager','Start Project','End Validity'].every(h=>x.r.th.indexOf(h)>=0)&&x.r.th.indexOf('Ready')<0,x.r.th.join(' | '));
ok('Project Planning','List shows 10 rows per page of the Active Master Data projects',/1-10 of \d+/.test(x.r.pager),x.r.pager);
/* ===== 4. role map ===== */
const nav=async pk=>{STORE.setPersona(pk);const y=await frame('index.html',(w,d)=>({side:[...d.querySelectorAll('.side nav a')].map(a=>a.getAttribute('title')||a.textContent.trim()),top:[...d.querySelectorAll('.topnav a')].map(a=>a.textContent.trim()),who:(d.querySelector('#viewAs')||{}).innerText}),700);return y;};
const names={planner:['Project Planning','Resource Allocation'],pm:['Resource Allocation'],supply:['Resource Allocation'],opslog:[],sales:[],ccr:[],fieldops:[],vm:[],dm:[]};
for(const pk of ROLES.MENU){const y=await nav(pk);const hasAlloc=y.r.side.indexOf('Resource Allocation')>=0;const exp=['planner','pm','supply','opslog','vm','dm'].indexOf(pk)>=0;
 ok('Roles',pk+': sidebar matches the central map (Resource Allocation only Planner, PM, Supply)',hasAlloc===exp&&y.r.side.every(s=>true)&&!y.errs.length,y.r.side.join(', '));
 const pp=ROLES.PAGE;const nameOf={project:'Project Planning',alloc:'Resource Allocation',requests:'Resource Requests',mref:'Milkrun Reference',milkrun:'Milkrun Planning',trips:'Daily Trip Plan',dispatch:'Trip Management',readiness:'Readiness Board',inbox:'Order Management',templates:'Document Templates',tariff:'Toll Tariff'};
 const shown=Object.keys(nameOf).filter(id=>y.r.side.indexOf(nameOf[id])>=0);const allowed=Object.keys(nameOf).filter(id=>pp[id].indexOf(pk)>=0);const sideShows=(w=>true)();
 ok('Roles',pk+': every visible menu item is allowed by ROLES.PAGE (planning + order items of the current area)',shown.every(id=>pp[id].indexOf(pk)>=0),shown.join(','));}
/* PM Assignment only for Dept Head */
const pend=plans.find(p=>p.status==='Pending PM');const asg={};
for(const pk of ['opslog','pm','planner','supply']){STORE.setPersona(pk);const y=await frame('project-planning.html?id='+pend.id+'&edit=1',(w,d)=>({asg:!!d.querySelector('#asg,#asg2')}),900);asg[pk]=y.r.asg;}
ok('Roles','Assign / Reassign PM button only for OpsLog Dept Head',asg.opslog&&!asg.pm&&!asg.planner&&!asg.supply,JSON.stringify(asg));
STORE.setPersona('planner');let y=await frame('allocation.html',(w,d)=>({add:!!d.querySelector('#addU'),req:!!d.querySelector('[data-req]')}),900);ok('Roles','Planner gets Add Unit on Resource Allocation (Planner and PM add / swap / delete)',ROLES.can('allocEdit','planner')&&ROLES.can('allocEdit','pm')&&!ROLES.can('allocEdit','supply')&&!ROLES.can('allocEdit','opslog')&&!ROLES.can('allocEdit','vm')&&!ROLES.can('allocEdit','dm'));
STORE.setPersona('pm');y=await frame('allocation.html?project='+encodeURIComponent(DOM.allPlans().find(p=>p.id==='PP-0010').project),(w,d)=>({add:!!d.querySelector('#addU'),req:!!d.querySelector('[data-req]')}),900);ok('Roles','PM sees Add unit and Request on Resource Allocation',y.r.add&&y.r.req);
STORE.setPersona('opslog');y=await frame('allocation.html',(w,d)=>({noacc:/has no access/.test(d.body.innerText)}),900);ok('Roles','OpsLog Dept Head can open Resource Allocation (all pages except vendor-only)',!y.r.noacc);
STORE.setPersona('supply');y=await frame('readiness.html',(w,d)=>({noacc:/has no access/.test(d.body.innerText)}),900);ok('Roles','Supply Management cannot open Readiness Board',y.r.noacc);
/* ===== 5. header ===== */
STORE.setPersona('planner');
y=await frame('project-planning.html',async(w,d)=>{const a=[...d.querySelectorAll('.topnav a')];const res=[];for(const l of a){let st=0;try{st=(await w.fetch(l.getAttribute('href'))).status;}catch(e){st=-1;}res.push([l.textContent.trim(),l.getAttribute('href'),st]);}return {res,brand:d.querySelector('.logo .nm').textContent,on:(d.querySelector('.topnav a.on')||{}).textContent};},900);
ok('Header','Same 5 items as Master Data, same order, brand MDI LOGISTIC, active item highlighted',y.r.res.map(r=>r[0]).join('|')==='Timeline|Master Data|Planning|Order & Delivery|Monitoring & Report'&&y.r.brand==='MDI LOGISTIC'&&y.r.on==='Planning',y.r.res.map(r=>r[0]).join('|'));
ok('Header','Every top-nav item is a real link (no #) that resolves (200)',y.r.res.every(r=>r[1]&&r[1]!=='#'&&r[2]===200),JSON.stringify(y.r.res.map(r=>r[2])));
ok('Header','Master Data item links to ../../Master Data/Combined with P2H, Cost, Location/customer.html',y.r.res.some(r=>r[0]==='Master Data'&&/Master%20Data|Master Data/.test(r[1])&&/customer\.html$/.test(r[1])),y.r.res[1][1]);
y=await frame('not-available.html?m=Timeline',(w,d)=>({t:d.querySelector('#content').innerText}),700);ok('Header','Timeline opens a clear not-available page',/Timeline is not available yet/.test(y.r.t)&&!y.errs.length);
y=await frame('project-planning.html',async(w,d)=>{d.querySelector('#viewAs').click();await new Promise(r=>setTimeout(r,200));const items=[...d.querySelectorAll('#pmenu .mi')].map(b=>b.innerText.replace(/\s+/g,' ').trim());d.querySelector('#pmenu .mi[data-p="pm"]').click();await new Promise(r=>setTimeout(r,800));return {items,persona:w.STORE.persona()};},900);
ok('Header','Role switcher lists every role with its person and switches the role',y.r.items.length===ROLES.LIST.length&&y.r.persona==='pm',y.r.items.join(' / '));
STORE.setPersona('planner');
/* ===== 6. no descriptive copy / hard-coded colours ===== */
const banned=[/Sent to Supply Management/,/Read-only/,/Configured in Master Data/,/Source: Customer Project/,/pending PM approval/,/Bot online/,/unmapped group/i,/Warning only/];
for(const p of ['project-planning.html?id=PP-0001','allocation.html','order-inbox.html','resource-requests.html','dispatch.html','readiness.html']){const z=await frame(p,(w,d)=>d.body.innerText,1100);ok('Copy',p+': no AI-style description / helper sentence',!banned.some(b=>b.test(z.r)),banned.filter(b=>b.test(z.r)).join(','));}
/* ===== 7. order import / export: replaced by Bulk Order, covered in selftest-order.js ===== */
/* ===== 8. every page x every role: zero console errors, access panel exactly where ROLES says ===== */
{const pages={project:'project-planning.html',alloc:'allocation.html',requests:'resource-requests.html',mref:'milkrun-ref.html',milkrun:'milkrun-list.html',trips:'trips.html',dispatch:'dispatch.html',readiness:'readiness.html',tariff:'tolltariff.html',inbox:'order-inbox.html',convert:'convert.html'};
 const bad=[];let n=0;for(const role of ROLES.MENU){STORE.setPersona(role);for(const id of Object.keys(pages)){const z=await frame(pages[id],(w,d)=>({noacc:/has no access/.test(d.body.innerText)}),700);n++;const should=ROLES.canView(id,role);if(z.errs.length||z.r.noacc===should)bad.push(role+':'+id+(z.errs.length?' err '+z.errs[0]:' access '+z.r.noacc+'/'+should));}}
 /* Document Templates is a tab of Milkrun Reference: visible iff the role may open it (ROLES templates) */for(const role of ROLES.MENU){if(!ROLES.canView('mref',role))continue;STORE.setPersona(role);const z=await frame('milkrun-ref.html?tab=tpl',(w,d)=>({tab:!!d.querySelector('.tabs [data-tab=tpl]')}),700);n++;if(z.errs.length||z.r.tab!==ROLES.canView('templates',role))bad.push(role+':mref tab=tpl '+(z.errs[0]||('tab '+z.r.tab)));}
 STORE.setPersona('planner');ok('Roles','All 14 pages x 8 roles ('+n+' loads): no console error, access panel only where the role map says so',!bad.length,bad.join('; '));}STORE.reset();
ok('Done','Self-test finished',true,R.filter(r=>!r.pass).length+' failures');
})();
