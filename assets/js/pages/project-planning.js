/* Project Planning (DEV-B, feedback 2026-10-19): list with tabs (PM Assignment ...), View Detail (Overview / Rate List / Resource), Fulfillment by Ownership with Save,
   readiness checklist (PM Assignment, Fulfillment by Ownership Type, Vehicle Resource, Driver Resource), auto close / auto re-open.
   Plans come from ACTIVE Master Data Customer Projects only; one table helper (per-column search + sort, status exact), View / Edit icon actions,
   status as plain coloured text, no descriptive copy, access from roles.js. Shared logic: assets/js/pplan.js (window.PP). */
(function(){
const {ic,esc}=UI;const {$,$$,DLG,toast}=C;
const PMS=['Hendra Wijaya','Maria Goretti','I Gede Wirawan'];
const id=UI.q('id');
const plans=()=>PP.plans();
const proj=PP.proj,pname=PP.pname,dash=PP.dash;
const fmtRp=n=>n==null||n===''?'-':UI.rp(n);
function save(p,action,detail){const all=STORE.get('projectPlans');const i=all.findIndex(x=>x.id===p.id);p.updatedAt=STORE.now();all[i]=p;STORE.set('projectPlans',all);if(action)STORE.audit({action,detail,obj:p.id,type:'Status'});}
/* the PM of a project edits it; the OpsLog Dept Head only assigns / re-assigns the PM (roles.js) */
const myPlan=p=>STORE.can('editProject')&&(!p.pm||p.pm===STORE.me().n);
const canEdit=p=>p.status!=='Closed'&&myPlan(p);
const canOpen=p=>p.status!=='Closed'&&(STORE.can('assignPm')||myPlan(p));
const allocOf=p=>STORE.get('allocations').filter(a=>a.project===p.project);
/* ---------- PM assignment (OpsLog Dept Head only) ---------- */
function assignPm(p,re){let sel=p.pm||PMS[0];const count=n=>plans().filter(x=>x.pm===n&&x.status!=='Closed').length;
 DLG.open({title:re?'Reassign PM':'Assign PM',sub:esc(proj(p).customer),width:480,body:C.field('Project Manager','<select class="select" id="pmS">'+C.opts(PMS,sel)+'</select>',{req:1,for:'pmS'})+'<div class="u-padding-s1 panel" id="pmL"></div>'+(re?C.field('Reason','<textarea class="textarea" rows="3" id="pmR"></textarea>',{req:1,for:'pmR'}):''),
  onOpen(L){const r=()=>{$('#pmL',L.el).innerHTML=PMS.map(n=>'<button type="button" class="mi'+(n===sel?' on':'')+'" data-n="'+esc(n)+'">'+UI.avatar(n)+'<b class="u-flex-1-text-align-left sm">'+esc(n)+'</b><span class="xs mut">'+UI.plural(count(n),'project')+'</span></button>').join('');$$('[data-n]',L.el).forEach(b=>b.onclick=()=>{sel=b.dataset.n;$('#pmS',L.el).value=sel;r();});};r();$('#pmS',L.el).onchange=e=>{sel=e.target.value;r();};},
  buttons:[{label:'Cancel'},{label:re?'Reassign':'Assign',kind:'primary',onClick(L,el){let reason='';if(re){reason=$('#pmR',el).value.trim();if(!C.setErr($('#pmR',el),reason?'':'Reason required'))return false;}
   const all=STORE.get('projectPlans');const cur=all.find(x=>x.id===p.id);const old=cur.pm;cur.pm=sel;cur.status=PP.derive(cur);save(cur,re?'Reassigned PM':'Assigned PM',(old?old+' to ':'')+sel+(reason?', '+reason:''));
   STORE.notify({kind:'Action Required',to:['pm'],title:'You are PM of '+cur.id,link:'project-planning.html?id='+cur.id});toast((re?'Reassigned ':'Assigned ')+sel);render();}}]});}
/* Re-open = the Customer Project is active again (FR-13). Allocations are not restored. Also happens automatically (PP.autoSync). */
function reopen(p){if(!PP.isLive(p)){toast('Customer Project is not active in Master Data',{tone:'warn'});return;}
 DLG.confirm({title:'Re-open plan',sub:esc(p.id),reason:true,ok:'Re-open',icon:'refresh'}).then(r=>{if(!r)return;const cur=plans().find(x=>x.id===p.id);cur.status=cur.pm?'In Planning':'Pending PM';cur.reopened={by:STORE.me().n,at:STORE.now(),reason:r};delete cur.closedAuto;save(cur,'Re-opened plan',r);PP.sync();toast('Plan re-opened');render();});}
/* ---------------- list ---------------- */
const LTABS=[['all','All'],['pm','PM Assignment'],['planning','In Planning'],['ready','Ready'],['closed','Closed']];
const inTab=(t,s)=>t==='all'||(t==='pm'&&s==='Pending PM')||(t==='planning'&&(s==='In Planning'||s==='PM Assigned'))||(t==='ready'&&s==='Ready')||(t==='closed'&&s==='Closed');
let ltab=null;
function list(){
 if(!SHELL.mount({module:'planning',id:'project',active:'project',title:'Project Planning',crumb:'Setup',actions:'<button type="button" class="btn" id="hist">'+ic('history')+'History</button>'}))return;
 PP.autoSync();
 const tabs=LTABS.filter(t=>ROLES.canTab('project',t[0]));
 const st0=UI.q('status');const want=st0?(/^pending/i.test(st0)||/^assigned|PM Assigned|PM Assignment/i.test(st0)?'pm':null):null;
 if(!ltab||!tabs.some(t=>t[0]===ltab))ltab=UI.q('tab')&&tabs.some(t=>t[0]===UI.q('tab'))?UI.q('tab'):(want&&tabs.some(t=>t[0]===want)?want:(STORE.can('assignPm')&&tabs.some(t=>t[0]==='pm')?'pm':'all'));
 const all=()=>plans();
 $('#content').innerHTML=PL.tabs(tabs.map(t=>[t[0],t[1],all().filter(p=>inTab(t[0],p.status)).length]),ltab)+'<div class="panel mt3" id="tbl"></div>';
 $$('[data-tab]').forEach(b=>b.onclick=()=>{ltab=b.dataset.tab;history.replaceState(null,'','?tab='+ltab);list();window.scrollTo(0,0);});
 const T=C.table($('#tbl'),{key:'id',minw:1700,label:'Project plans',rows:()=>all().filter(p=>inTab(ltab,p.status)),
  cols:[{k:'status',h:'Status',cls:'stc',w:130,status:true,text:p=>PP.statLabel(p.status),render:p=>PP.statHtml(p.status)},
   {k:'id',h:'Plan ID',w:90},
   {k:'cust',h:'Customer Name',ell:1,w:200,text:p=>proj(p).customer},
   {k:'ref',h:'Project Ref Number',text:p=>proj(p).refno||p.project},
   {k:'proj',h:'Project Name',ell:1,w:220,text:p=>pname(p)},
   {k:'biz',h:'Moda Business Line',text:p=>proj(p).bizline||'-'},
   {k:'type',h:'Project Type',text:p=>proj(p).ptype||'-'},
   {k:'ful',h:'Fulfillment by Ownership',text:p=>PP.modeLabel(p)},
   {k:'sl',h:'Service Level',text:p=>proj(p).svclevel||'-'},
   {k:'pm',h:'Project Manager',text:p=>p.pm||'-'},
   {k:'start',h:'Start Project',sortv:p=>proj(p).start||'',text:p=>proj(p).start?UI.fdate(proj(p).start):'-'},
   {k:'end',h:'End Validity',sortv:p=>proj(p).validity||p.validUntil||'',text:p=>(proj(p).validity||p.validUntil)?UI.fdate(proj(p).validity||p.validUntil):'-'}],
  actions:{view:p=>{location.href='?id='+p.id;},edit:p=>{location.href='?id='+p.id+'&edit=1';},can:(k,p)=>k==='view'||(k==='edit'&&canOpen(p)),name:p=>p.id},
  empty:{text:'No project plans'}});
 if(st0&&want===ltab&&/^(pending|pm assign)/i.test(st0)){T.f.status='PM Assignment';T.render();}
 ($('#hist')||{}).onclick=()=>PANELS.history({obj:'PP-',title:'Project Planning'});
 if(UI.q('state')==='loading'){T.o.state='loading';T.render();}
}
/* Fulfillment by Ownership: saved with the Save button. Allocations that no longer fit are released first (after a confirm). */
function saveMode(p,m){if(!p.pm){toast('Assign a PM first',{tone:'warn'});return;}if(p.status==='Closed')return;
 const misfit=allocOf(p).filter(a=>a.kind==='unit'&&a.status!=='Released'&&((m==='Own Asset'&&a.source==='Vendor')||(m==='Vendor'&&a.source!=='Vendor')));
 const apply=()=>{const all=STORE.get('projectPlans');const cur=all.find(x=>x.id===p.id);const was=cur.mode;cur.reasons=[];cur.note='';
  if(misfit.length){const al=STORE.get('allocations');misfit.forEach(f=>{const x=al.find(y=>y.id===f.id);if(x){x.status='Released';x.validTo=STORE.today();x.releaseReason='Fulfillment by Ownership changed to '+m;}});STORE.set('allocations',al);}
  cur.mode=m;cur.status=PP.derive(cur);save(cur,'Fulfillment by Ownership',(was&&was!=='Per order'?UI.own(was)+' to ':'')+UI.own(m)+(misfit.length?', released '+misfit.length+' allocation(s)':''));
  toast('Saved');render();};
 if(!misfit.length)return apply();
 DLG.confirm({title:'Change to '+UI.own(m),sub:esc(p.id),body:C.banner('warn','These allocations no longer fit '+esc(UI.own(m))+' and will be released:',{sm:1})+'<ul class="mt3">'+misfit.map(a=>'<li>'+esc(a.plate||'Pending')+' <span class="sm mut">'+esc(UI.own(a.source)+(a.vendor?', '+a.vendor:''))+'</span></li>').join('')+'</ul>',ok:'Release and change',danger:true,icon:'alert'}).then(r=>{if(r)apply();else render();});}
/* ---------------- detail ---------------- */
function hoursTable(pr){const h=pr.hours;if(!h)return '<span class="mut">-</span>';
 const f=a=>a?esc(a[0]+' - '+a[1]):'<span class="mut">-</span>';
 return '<div class="tbl-scroll"><table class="mptbl"><thead><tr><th>Weekdays</th><th>Friday</th><th>Weekend</th></tr></thead><tbody><tr><td>'+f(h.wd)+'</td><td>'+f(h.fri||h.wd)+'</td><td>'+f(h.we)+'</td></tr></tbody></table></div>';}
function manpowerPanel(pr){const mp=MD.manpower(pr);
 const rows=mp.state==='unavailable'?'<tr><td colspan="2"><span class="mut">-</span></td></tr>':!mp.roles.length?'<tr><td colspan="2"><span class="mut">-</span></td></tr>':mp.roles.map(r=>'<tr><td>'+esc(r.label)+'</td><td class="num">'+(r.qty==null?'<span class="mut">-</span>':esc(String(r.qty)))+'</td></tr>').join('');
 return '<div class="tbl-scroll"><table class="mptbl"><thead><tr><th>Role</th><th class="num">Quantity</th></tr></thead><tbody>'+rows+'</tbody></table></div>';}
function slaTable(pr){const c=MD.customer(pr.customer);const s=(c&&c.slas)||[];if(!s.length)return '<span class="mut">-</span>';return '<div class="tbl-scroll"><table class="mptbl"><thead><tr><th>Region</th><th>Delivery Note SLA</th></tr></thead><tbody>'+s.map(x=>'<tr><td>'+esc(x.region||'-')+'</td><td>'+esc(x.sla==null?'-':x.sla)+'</td></tr>').join('')+'</tbody></table></div>';}
let tab=UI.q('tab','overview');let subk='unit';let draftMode=null;
/* View is read-only; Edit (?edit=1, from the Edit icon or the Edit button) is where the Dept Head assigns / re-assigns the PM and the PM saves Fulfillment by Ownership */
const editMode=UI.q('edit')==='1';
function detail(){const p=plans().find(x=>x.id===id);if(!p){location.href='project-planning.html';return;}
 const pr=proj(p);const closed=p.status==='Closed';const can=canEdit(p);const oc=PP.onCall(p);const ed=editMode&&!closed&&canOpen(p);
 const acts=(ed?'':'<button type="button" class="btn" id="hist">'+ic('history')+'History</button>')+(closed&&(STORE.can('assignPm')||myPlan(p))?'<button type="button" class="btn primary" id="reopen">'+ic('refresh')+'Re-open plan</button>':'')+(ed&&STORE.can('assignPm')&&!p.pm?'<button type="button" class="btn primary" id="asg">Assign PM</button>':'')+(!ed&&!closed&&canOpen(p)?'<a class="btn" id="edt" href="?id='+encodeURIComponent(p.id)+'&edit=1">'+ic('edit')+'Edit</a>':'');
 if(!SHELL.mount({module:'planning',id:'project',active:'project',title:pname(p),crumb:'<a href="project-planning.html">Project Planning</a>',actions:acts}))return;
 PP.autoSync();const p2=plans().find(x=>x.id===id)||p;
 const cl=PP.checklist(p2);
 const T=[['overview','Overview']].concat(ROLES.canTab('project','rates')?[['rates','Rate List']]:[],!oc&&ROLES.canTab('project','resource')?[['resource','Resource']]:[]);if(!T.some(x=>x[0]===tab))tab='overview';
 const link=(c,i)=>{if(c[1]||closed)return '';if(!oc&&i>=2&&ROLES.canView('alloc'))return '<span class="sp"></span><a class="iconbtn" aria-label="Open Resource Allocation" href="allocation.html?project='+encodeURIComponent(p.project)+'">'+ic('right')+'</a>';return '';};
 $('#content').innerHTML=PL.tabs(T,tab)+'<div class="u-grid-template-columns-mm-300-align-items-start grid2 mt4"><div class="stack" id="main_"></div><div class="panel"><div class="panel-hd"><h3>Readiness</h3><span class="tx">'+cl.filter(x=>x[1]).length+' / '+cl.length+'</span></div><div class="body col gap3">'+
  cl.map((c,i)=>'<div class="row gap2" style="color:'+(c[1]?'var(--green-t)':'var(--muted)')+'">'+ic(c[1]?'check-circle':'clock')+'<span class="u-color-text">'+c[0]+'</span>'+link(c,i)+'</div>').join('')+'</div></div></div>';
 const M=$('#main_');
 if(tab==='overview'){
  const nt=PP.notesOf(pr);const cust=MD.customer(pr.customer)||{};
  const can_pm=STORE.can('assignPm')&&ed;
  if(draftMode==null)draftMode=PP.modeOf(p2);
  M.innerHTML='<div class="panel"><div class="panel-hd"><h3>Overview</h3><span class="sp"></span>'+PP.statHtml(p2.status)+(closed&&p2.closedAuto?' <span class="mut">(automatically)</span>':'')+'</div><div class="body"><dl class="kv2 pp-kv">'+
   '<dt>Project Manager</dt><dd class="row gap2">'+(p2.pm?UI.avatar(p2.pm)+'<span class="u-flex-1">'+esc(p2.pm)+'</span>'+(can_pm?'<button type="button" class="btn sm" id="reasg">Reassign</button>':''):'<span class="u-flex-1 mut">-</span>'+(can_pm?'<button type="button" class="btn sm primary" id="asg2">Assign PM</button>':''))+'</dd>'+
   [['Plan ID',p2.id],['Customer Name',pr.customer],['Project Ref Number',pr.refno||p2.project],['Project Name',pr.name],['Moda Business Line',dash(pr.bizline)],['Project Type',dash(pr.ptype)],['Service Level',dash(pr.svclevel)],['Start Project',pr.start?UI.fdate(pr.start):'-'],['End Validity',pr.validity?UI.fdate(pr.validity):'-']].map(x=>'<dt>'+x[0]+'</dt><dd>'+esc(x[1])+'</dd>').join('')+
   '<dt>Customer Operating Hours</dt><dd>'+hoursTable(pr)+'</dd><dt>Commodity</dt><dd>'+((pr.commodity||[]).length?esc(pr.commodity.join(', ')):'-')+'</dd><dt>Manpower Requirement</dt><dd>'+manpowerPanel(pr)+'</dd>'+
   '<dt>Delivery Note SLA</dt><dd>'+slaTable(pr)+'</dd><dt>Claim T&amp;C</dt><dd>'+esc(dash(pr.claimtnc||cust.claimtnc))+'</dd><dt>Procedure Billing</dt><dd>'+esc(dash(pr.billingproc||cust.billingproc))+'</dd>'+
   (nt.length?'<dt>Notes</dt><dd>'+nt.map(x=>'<div><span class="mut">'+esc(x[0])+':</span> '+esc(x[1])+'</div>').join('')+'</dd>':'')+
   '</dl>'+(oc?'':'<section class="pp-sec" aria-labelledby="ppFh"><h4 id="ppFh">Fulfillment by Ownership</h4><div class="field pp-fld"><select class="select pp-sel" id="modeSel" aria-label="Fulfillment by Ownership"'+(ed&&can&&p2.pm?'':' disabled')+'>'+C.opts(PP.MODE_OPTS,draftMode,'Select')+'</select><div class="errtxt" hidden id="modeSel-e">'+ic('x-circle','s12')+'<span></span></div></div></section>')+'</div>'+(oc||!ed||!can?'':'<div class="pp-save"><a class="btn" id="cancelEdit" href="?id='+encodeURIComponent(p.id)+'">Cancel</a><button type="button" class="btn primary" id="saveBtn"'+(p2.pm&&draftMode!==PP.modeOf(p2)?'':' disabled')+'>Save</button></div>')+'</div>';}
 if(tab==='rates'){const rl=MD.rateList(pr);const fixed=[];if(rl.fixcost!=null)fixed.push(['Fixed Cost',fmtRp(rl.fixcost)]);if(pr.pricebasis&&rl.fixcost!=null)fixed.push(['Price Basis',pr.pricebasis]);if(pr.ptype==='Milkrun'&&rl.volcost!=null)fixed.push(['Milkrun Cost per Volume Delivered',fmtRp(rl.volcost)+' per m³']);
  M.innerHTML=(fixed.length?'<div class="panel"><div class="panel-hd"><h3>Fixed Cost</h3></div><div class="body"><dl class="kv2 pp-kv">'+fixed.map(x=>'<dt>'+x[0]+'</dt><dd>'+esc(x[1])+'</dd>').join('')+'</dl></div></div>':'')+'<div class="panel"><div class="panel-hd"><h3>Rate List</h3></div><div id="rt"></div></div>';
  C.table($('#rt'),{key:'_i',rows:()=>rl.rows.map((r,i)=>Object.assign({_i:String(i)},r)),label:'Rate list',minw:900,cols:[{k:'cat',h:'Unit Category',text:r=>r.kategori||'-'},{k:'kar',h:'Karoseri',text:r=>r.karoseri||'-'},{k:'ton',h:'Tonase',cls:'num',text:r=>r.tonase==null?'-':r.tonase},{k:'vol',h:'Volume',cls:'num',text:r=>r.kubikasi==null?'-':r.kubikasi},{k:'org',h:'Origin',ell:1,w:220,text:r=>r.origin||'-'},{k:'dst',h:'Destination',ell:1,w:220,text:r=>r.dest||'-'},{k:'price',h:'Harga',cls:'num',sortv:r=>r.harga,text:r=>fmtRp(r.harga)}],empty:{text:'No rates'}});}
 if(tab==='resource'){
  M.innerHTML='<div class="panel"><div class="panel-hd"><h3>Resource</h3><span class="sp"></span>'+(ROLES.canView('alloc')?'<a class="btn sm" href="allocation.html?project='+encodeURIComponent(p.project)+'">'+ic('users')+'Resource Allocation</a>':'')+'</div><div class="body">'+PL.seg([['unit','Unit'],['driver','Driver']],subk,'data-sub',{label:'Resource kind'})+'</div><div id="rt"></div></div>';
  const u=subk==='unit';
  C.table($('#rt'),{key:u?'allocId':'allocId',rows:()=>u?PP.unitRows(p2):PP.driverRows(p2),label:u?'Units':'Drivers',minw:u?1200:1100,cols:u?PP.unitCols():PP.driverCols(),empty:{text:u?'No units allocated':'No drivers allocated'}});}
 /* wire */
 $$('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;history.replaceState(null,'','?id='+id+'&tab='+tab);detail();window.scrollTo(0,0);});
 $$('[data-sub]').forEach(b=>b.onclick=()=>{subk=b.dataset.sub;detail();});
 ($('#hist')||{}).onclick=()=>PANELS.history({obj:p.id,title:p.id});
 const ro=$('#reopen');if(ro)ro.onclick=()=>reopen(plans().find(x=>x.id===id));
 [$('#asg'),$('#asg2')].forEach(b=>{if(b)b.onclick=()=>assignPm(plans().find(x=>x.id===id));});
 const ra=$('#reasg');if(ra)ra.onclick=()=>assignPm(plans().find(x=>x.id===id),true);
 const ms=$('#modeSel'),sv=$('#saveBtn');
 if(ms)ms.onchange=()=>{draftMode=ms.value;C.setErr(ms,'');if(sv)sv.disabled=!(can&&p2.pm&&draftMode!==PP.modeOf(p2));};
 if(sv)sv.onclick=()=>{const cur=plans().find(x=>x.id===id);if(!draftMode){C.setErr(ms,'Select Fulfillment by Ownership');return;}if(draftMode===PP.modeOf(cur)){toast('No changes');return;}saveMode(cur,draftMode);};
}
function render(){draftMode=null;id?detail():list();}
STORE.subscribe('projectPlans',(e,src)=>{if(src==='remote')render();});
STORE.subscribe('allocations',(e,src)=>{if(src==='remote'&&id)render();});
window.addEventListener('md-change',()=>{if(window.PP&&STORE)render();});
render();
})();
