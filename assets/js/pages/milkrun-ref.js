/* Milkrun Reference (D88): ONE current state per Customer Project. Tabs Part / BOM / Route Group, add / edit / delete one by one,
   partial Excel import (Import #n), Export CSV. No versions, no Effective Date, no Used lock, no diff. Pattern: Monthly Planning MDI (KB 10). */
(function(){
const {ic,esc,tag,ps}=UI;const {$,$$,DLG,toast,banner}=C;
if(!SHELL.mount({module:'planning',id:'mref',active:'mref',title:'Milkrun Reference',crumb:'Setup',actions:''}))return;
const can=STORE.can('plan');const K=REF.KEY,LB=IO.ref.label,lc=REF.lc;
const TABS=['part','bom','route','phys'].concat(ROLES.canView('templates')&&ROLES.canTab('mref','tpl')?['tpl']:[]);/* tpl = Document Templates (moved here from Planning Config) */
let tab=TABS.indexOf(UI.q('tab','part'))>=0?UI.q('tab','part'):'part';
let proj=UI.q('project','')?REF.code(UI.q('project','')):'';let q='';const ts={};
const find=(kind,k)=>REF.rows(kind).find(x=>K[kind](x)===k);
const DESC={part:'Parts supplied by the customer: packaging, dimensions and supplier. Turns quantities into volume per supplier.',bom:'Model Code with its parts, quantity per unit and PIO / TCO category. Turns order data into required parts.',route:'Supplier groups per route with vehicle type, capacity and Heijunka interval. Feeds Route Calculation and cycle time.',phys:'Read-only view over Master Data Location: identity, site data, handling time and route usage. Not a second master.',tpl:'Excel document templates with {{placeholders}} used to generate planning documents (PUTS, check sheets, dispatch plan, SPPB, SPK).'};
/* header filter/search field per tab (B2/M2: no separate tab-level search bar) */
const KC={part:'partNo',bom:'model',route:'name'};
const keyText={part:r=>r.partNo,bom:r=>r.model,route:r=>r.name};
/* ---------------- list ---------------- */
function render(){
 const cnt=k=>k==='phys'?MD.get().locations.length:k==='tpl'?(STORE.get('templates')||[]).length:REF.rows(k).filter(r=>!proj||r.project===proj).length;
 const note=tab==='phys'?banner('info','<b>Physical Logistics (Location-backed)</b> - a read-only view over Master Data Location, not a second master. Site/Dock, Truck Station, operating-hours override, Owner Type extensions and all dependent writes are <b>Pending CR-B / Location contract</b>.',{sm:1})
  :tab==='route'?banner('info','Shipping Volume is a bounded prototype field. Unit, source, scope and any relationship to Liq Vol, Capacity, Volume Matrix or Vehicle Shipping Volume are <b>Pending contract</b>.',{sm:1}):'';
 $('#content').innerHTML='<div class="refhead"><p class="desc" id="desc">'+esc(DESC[tab])+'</p><div class="row gap2 wrap">'+(tab==='tpl'?(can?'<button type="button" class="btn primary" id="up">'+ic('upload')+'Upload template</button>':''):tab==='phys'?'<button type="button" class="btn" id="exp">'+ic('download')+'Export CSV</button>':'<button type="button" class="btn" id="exp">'+ic('download')+'Export CSV</button>'+(can?'<button type="button" class="btn" id="imp">'+ic('upload')+'Import Excel</button><button type="button" class="btn primary" id="add">'+ic('plus')+'Add New</button>':''))+''+(tab==='tpl'?'':'<button type="button" class="btn" id="chk">'+ic('check-circle')+'Reference check</button>')+'</div></div>'+
  '<div class="mt4">'+PL.tabs([['part','Part',cnt('part')],['bom','BOM',cnt('bom')],['route','Route Group',cnt('route')],['phys','Physical Logistics',cnt('phys')]].concat(TABS.indexOf('tpl')>=0?[['tpl','Document Templates',cnt('tpl')]]:[]),tab)+'</div>'+
  (note?'<div class="mt4">'+note+'</div>':'')+
  '<div class="panel mt4 reftbl" id="tbl"></div>';
 $$('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;q='';render();});
 if(tab==='tpl'){const u=$('#up');if(u)u.onclick=()=>uploadTpl(null);table();return;}
 $('#exp').onclick=()=>{const s=ts[tab];const rows=(s?s.filtered():[]);
  if(tab==='phys'){if(!rows.length){toast('Nothing to export',{tone:'warn'});return;}exportPhys(rows);return;}
  const recs=rows.map(r=>find(tab,r._k)).filter(Boolean);if(!recs.length){toast('Nothing to export',{tone:'warn'});return;}IO.ref.exportCsv(tab,recs);};
 $('#chk').onclick=check;const im=$('#imp'),ad=$('#add');if(im)im.onclick=()=>importFlow(tab);if(ad)ad.onclick=()=>openForm(tab,null);
 table();}
/* Physical Logistics: a view over the existing Location entity (CR-B fields/writes stay pending) */
function exportPhys(rows){const aoa=[['Location','Location Code','Type','Owner Type','City / Province','Handling (min)','Route usage']].concat(rows.map(l=>[l.name,l.code||'',l.type||'',l.owner||'',l.city||'',(+l.fixht||0)+(+l.buffer||0),(l._u||[]).map(g=>g.routeCode||g.name).join(', ')]));
 const name=IO.fname('Physical_Logistics','csv');IO.writeBook([{name:'Physical Logistics',aoa}],name,'csv');toast('Downloading '+name);
 STORE.audit({action:'Exported Physical Logistics',detail:rows.length+' locations, CSV',type:'Export',obj:'Milkrun Reference'});}
function physTable(){const host=$('#tbl');
 const usage=n=>REF.rows('route').filter(g=>REF.comp(g).indexOf(n)>=0);
 const rows=()=>MD.get().locations.map(l=>Object.assign({},l,{_u:usage(l.name)}));
 const S=C.table(host,{key:'name',label:'Physical Logistics',minw:1150,rows,sort3:1,showing:1,
  cols:[{k:'name',h:'Location',render:l=>'<b>'+esc(l.name)+'</b>',text:l=>l.name},
   {k:'code',h:'Location Code',text:l=>l.code||'',render:l=>l.code?'<span class="mono">'+esc(l.code)+'</span>':''},
   {k:'type',h:'Type',text:l=>l.type||'',render:l=>tag(esc(l.type||'-'),'slate')},
   {k:'owner',h:'Owner Type',text:l=>l.owner||'',render:l=>tag(esc(l.owner||'-'),l.owner==='Supplier'?'amber':l.owner==='Customer'?'navy':'slate')},
   {k:'city',h:'City / Province',ell:1,w:220,text:l=>l.city||''},
   {k:'handling',h:'Handling (min)',cls:'num',text:l=>(+l.fixht||0)+(+l.buffer||0),render:l=>(+l.fixht||0)+(+l.buffer||0)},
   {k:'routes',h:'Route usage',text:l=>l._u.map(g=>g.routeCode||g.name).join(', '),render:l=>l._u.length?l._u.map(g=>esc(g.routeCode||g.name)).join('<br>'):'<span class="mut">Not in a route</span>'},
   {k:'pend',h:'CR-B fields',noFilter:1,sortable:false,render:l=>tag('Site / Dock pending','line')}],
  empty:{text:'No Location records'}});
 ts.phys=S;}
function table(){const host=$('#tbl');if(tab==='tpl'){if(ts.tpl)host._tbl=ts.tpl;tplTable();return;}if(tab==='phys'){if(ts.phys)host._tbl=ts.phys;physTable();return;}
 if(ts[tab])host._tbl=ts[tab];
 const kf=KC[tab],seedP=proj,seedQ=q;
 const rowsFn=()=>REF.rows(tab).map(r=>Object.assign({_k:K[tab](r)},r));
 /* M2: Project is one header control (free-text, exact match), not a second global filter row */
 const P={k:'project',h:'Project',cls:'nw',match:'exact'};
 const U={k:'updatedBy',h:'Updated by / at',cls:'upd nw',text:r=>r.updatedBy+' '+UI.fdt(r.updatedAt),sortv:r=>r.updatedAt,render:r=>esc(r.updatedBy)+'<span class="at">'+UI.fdt(r.updatedAt)+'</span>'};
 /* M3: Batch stays stored (Manual / Import #n) and is shown in Edit + audit + import result, not in the list */
 const A={k:'_act',h:'Action',cls:'act',sortable:false,render:r=>can?'<button type="button" class="iconbtn" data-ed="'+esc(r._k)+'" aria-label="Edit '+esc(keyText[tab](r))+'" title="Edit">'+ic('pencil')+'</button><button type="button" class="iconbtn" data-dl="'+esc(r._k)+'" aria-label="Delete '+esc(keyText[tab](r))+'" title="Delete">'+ic('trash')+'</button>':''};
 /* P / L / T are independent dimensions, each with its own free-text header filter. The unit label stays
    pending until the P/L/T contract is approved: no invented unit, no conversion, no composite value. */
 const cols={
  part:[P,{k:'partNo',h:'Part Number',render:x=>'<span class="mono">'+esc(x.partNo)+'</span>'},{k:'name',h:'Part Name',ell:1,w:110},{k:'pnNoColor',h:'PN No Color'},{k:'supCode',h:'Supplier Code'},{k:'pnInduk',h:'PN Induk'},{k:'capBox',h:'Cap/Box',cls:'num'},{k:'boxVol',h:'Box Vol (m³)',cls:'num',render:x=>UI.num(x.boxVol,3)},
    {k:'p',h:'P (pending unit)',cls:'num',text:x=>x.p==null?'':x.p,sortv:x=>x.p==null?-1:x.p,render:x=>x.p==null?'':UI.num(x.p,0)},
    {k:'l',h:'L (pending unit)',cls:'num',text:x=>x.l==null?'':x.l,sortv:x=>x.l==null?-1:x.l,render:x=>x.l==null?'':UI.num(x.l,0)},
    {k:'t',h:'T (pending unit)',cls:'num',text:x=>x.t==null?'':x.t,sortv:x=>x.t==null?-1:x.t,render:x=>x.t==null?'':UI.num(x.t,0)},{k:'price',h:'Price',cls:'num',text:x=>x.price==null?'':UI.num(x.price,0),sortv:x=>x.price==null?-1:x.price},U,A],
  bom:[P,{k:'model',h:'Model Code',render:x=>'<span class="mono">'+esc(x.model)+'</span>'},{k:'n',h:'Parts',cls:'num',text:x=>x.lines.length},{k:'partList',h:'Part Number x Qty (Category)',ell:1,w:260,text:x=>x.lines.map(l=>l.partNo+' x'+l.qty+' '+l.category).join(', ')},U,A],
  route:[P,
   /* Route Code + Route Name are separate user-entered prototype values; the generated internal id is
      never shown as a Route Code. Production persistence/uniqueness/import are pending contract. */
   {k:'routeCode',h:'Route Code',cls:'nw',text:x=>x.routeCode||'',render:x=>x.routeCode?'<span class="mono">'+esc(x.routeCode)+'</span>':''},
   {k:'name',h:'Route Name',ell:1,w:108,text:x=>x.name,render:x=>'<b>'+esc(x.name)+'</b>'},
   {k:'compo',h:'Composition',ell:1,w:128,text:x=>REF.comp(x).join(' > ')},{k:'nsup',h:'No. of Supplier',cls:'num',text:x=>(x.comp||[]).filter(n=>(MD.location(n)||{}).owner==='Supplier').length},
   {k:'chassis',h:'Category',cls:'nw',render:x=>tag(esc(x.chassis),'slate')},{k:'body',h:'Karoseri',cls:'nw',render:x=>tag(esc(x.body),'navy')},
   {k:'cap',h:'Capacity',cls:'num'},{k:'liqVol',h:'Liq Vol',cls:'num'},
   {k:'shippingVol',h:'Shipping Volume (pending contract)',cls:'num',w:110,text:x=>x.shippingVol==null?'':x.shippingVol,sortv:x=>x.shippingVol==null?-1:x.shippingVol,render:x=>x.shippingVol==null?'':UI.num(x.shippingVol,1)},
   {k:'heijunka',h:'Heijunka (min)',cls:'num',text:x=>x.heijunka==null?'':x.heijunka},U,A]};
 const S=C.table(host,{key:'_k',label:LB[tab],minw:1100,rows:rowsFn,cols:cols[tab],sort3:1,showing:1,
  onFilter:f=>{proj=f.project||'';q=f[kf]||'';},
  empty:{text:'No '+LB[tab]+' data yet',action:can?'Add New':null,fn:()=>openForm(tab,null)},
  after:h=>{$$('[data-ed]',h).forEach(b=>b.onclick=()=>{const r=find(tab,b.dataset.ed);if(r)openForm(tab,r);});$$('[data-dl]',h).forEach(b=>b.onclick=()=>{const r=find(tab,b.dataset.dl);if(r)del(tab,r);});}});
 /* deep link (?project=) and Reference check jump seed the same header controls */
 let seeded=false;if(seedP&&!S.f.project){S.f.project=seedP;seeded=true;}if(seedQ&&!S.f[kf]){S.f[kf]=seedQ;seeded=true;}
 if(seeded)S.render();
 ts[tab]=S;}
/* ---------------- Document Templates (moved from Planning Config; same table, upload flow and audit as before) ---------------- */
const PLACE=['{{plan_id}}','{{version}}','{{route}}','{{route_name}}','{{cycle}}','{{unit}}','{{driver}}','{{out_pool}}','{{in_pool}}','{{supplier}}','{{vendor_site}}','{{dock}}','{{vol_day}}','{{trip_id}}','{{date}}','{{customer}}','{{project}}','{{order_id}}','{{vendor}}','{{plate}}','{{report_time}}','{{stop_in}}','{{stop_out}}'];
function tplTable(){const host=$('#tbl');
 ts.tpl=C.table(host,{key:'id',label:'Document templates',rows:()=>STORE.get('templates'),cols:[{k:'status',h:'Status',cls:'stc',render:t=>ps(t.status)},{k:'type',h:'Document',render:t=>'<b>'+esc(t.type)+'</b>'},{k:'scope',h:'Scope',render:t=>t.scope==='Default'?tag('Default','slate'):tag(esc(t.scope),'navy')},{k:'file',h:'File',render:t=>'<span class="row gap1">'+ic('sheet','s12')+esc(t.file)+'</span>'},{k:'ph',h:'Placeholders',text:t=>String(t.placeholders.length),cls:'num'},{k:'updated',h:'Updated',sortv:t=>String(t.updated),text:t=>typeof t.updated==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.updated)?UI.fdate(t.updated):UI.fdt(t.updated)},{k:'by',h:'By'},
  ],
  actions:{view:t=>viewTpl(t),edit:t=>uploadTpl(t),del:t=>delTpl(t),can:(k,t)=>k==='view'||(can&&(k==='edit'||t.scope!=='Default')),name:t=>t.type+' '+t.scope}});}
function viewTpl(t){DLG.open({title:t.type,sub:esc(t.file),width:460,body:'<div class="row wrap gap1">'+t.placeholders.map(p=>tag(esc(p),'slate')).join('')+'</div>',buttons:[{label:'Close',kind:'primary'}]});}
function delTpl(t){DLG.confirm({title:'Delete template?',sub:esc(t.type+', '+t.scope),ok:'Delete',danger:true,body:esc(t.file)}).then(v=>{if(!v)return;STORE.set('templates',STORE.get('templates').filter(x=>x.id!==t.id));STORE.audit({action:'Deleted template '+t.type+' ('+t.scope+')',detail:t.file,obj:'Templates',type:'Admin'});toast('Template deleted');render();});}
function uploadTpl(t){let res=null,file=null;const projects=['Default'].concat(MD.get().projects.filter(p=>p.src==='plan').map(p=>p.code));
 const L=DLG.open({title:t?'Replace template':'Upload template',sub:t?esc(t.type+', '+t.scope):'',width:560,body:'<div class="grid2">'+C.field('Document','<select class="select" id="dt"'+(t?' disabled':'')+'>'+C.opts(['PUTS','Controller Check Sheet','Truck Information','Driver Check Sheet','Daily Dispatch Plan','SPPB','SPK'],t?t.type:'PUTS')+'</select>')+C.field('Scope','<select class="select" id="ds"'+(t?' disabled':'')+'>'+C.opts(projects,t?t.scope:'Default')+'</select>')+'</div><label class="drop" tabindex="0" id="dz">'+ic('upload')+'<b>Drop Excel or browse</b><span class="sm mut">.xlsx with {{placeholders}}</span><input type="file" id="df" accept=".xlsx" hidden></label><div id="dr"></div>',buttons:[]});
 const draw=()=>{const bad=res&&(res.unknown.length||(res.ext?1:0));$('#dr',L.el).innerHTML=!res?'':res.ext?'<div class="mt2">'+banner('err','<b>'+esc(file.name)+'</b> '+esc(res.ext)+'. Active template kept.',{sm:1})+'</div>':'<div class="row gap2 wrap mt2"><span class="tag line">'+ic('file')+esc(file.name)+'</span>'+tag(res.found.length+' placeholders','slate')+(bad?tag(res.unknown.length+' not mapped','red','x-circle'):tag('All mapped','green','check'))+'</div>'+(bad?'<div class="mt2">'+banner('err','Placeholders not mapped. Fix the file to save.',{sm:1})+'</div><table class="mt2 fltr"><thead><tr><th>Cell</th><th>Placeholder</th><th>Error</th></tr></thead><tbody>'+res.unknown.map(u=>'<tr><td class="mono">'+esc(u.cell)+'</td><td class="mono">'+esc(u.p)+'</td><td><span class="errtxt">'+ic('x-circle','s12')+'Not mapped</span></td></tr>').join('')+'</tbody></table>':'');
  L.setButtons([{label:'Cancel'},{label:'Save',kind:'primary',disabled:!res||bad>0,onClick(L2,el){const all=STORE.get('templates');const type=$('#dt',el).value,scope=$('#ds',el).value;let x=t?all.find(y=>y.id===t.id):all.find(y=>y.type===type&&y.scope===scope);
   if(!x){x={id:'TPL-'+(all.length+1),type,scope,status:'Active'};all.push(x);}Object.assign(x,{file:file.name,placeholders:res.found,updated:STORE.now(),by:STORE.me().n});STORE.set('templates',all);STORE.audit({action:'Uploaded template '+type+' ('+scope+')',detail:file.name,obj:'Templates',type:'Admin'});toast('Template saved');render();}}]);};
 const take=async f=>{if(!f)return;file=f;if(!/\.xlsx$/i.test(f.name||'')){res={found:[],unknown:[],ext:'is not an .xlsx file'};draw();return;}
  /* QA-N02: content check, a real workbook is a zip (PK) and must carry at least one {{placeholder}} */
  const sig=new Uint8Array(await f.slice(0,2).arrayBuffer());if(sig[0]!==0x50||sig[1]!==0x4b){res={found:[],unknown:[],ext:'is not a valid workbook'};draw();return;}try{const wb=await IO.readFile(f);const found=new Set(),unknown=[];wb.SheetNames.forEach(sn=>{const ws=wb.Sheets[sn];Object.keys(ws).filter(k=>k[0]!=='!').forEach(k=>{const v=String(ws[k].v||'');(v.match(/\{\{[^}]+\}\}/g)||[]).forEach(p=>{found.add(p);if(PLACE.indexOf(p)<0)unknown.push({cell:sn+'!'+k,p});});});});res={found:[...found],unknown};if(!found.size)res.ext='has no {{placeholders}}';}catch(e){res={found:[],unknown:[],ext:'could not be read'};}draw();};
 $('#df',L.el).onchange=e=>take(e.target.files[0]);const dz=$('#dz',L.el);dz.onkeydown=e=>{if(e.key==='Enter')$('#df',L.el).click();};dz.ondragover=e=>{e.preventDefault();dz.classList.add('over');};dz.ondrop=e=>{e.preventDefault();dz.classList.remove('over');take(e.dataTransfer.files[0]);};draw();}
/* ---------------- delete (FR-9 / FR-12) ---------------- */
function del(kind,rec){const why=REF.used(kind,rec);const lbl=REF.NAME[kind](rec);
 if(why.length){DLG.open({title:'Delete Master Data?',sub:esc(lbl),width:480,alert:true,body:banner('err','<b>This data cannot be deleted.</b><ul class="u-margin-4-0-0-padding-left-18">'+why.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>'),buttons:[{label:'Close',kind:'primary'}]});return;}
 DLG.confirm({title:'Delete Master Data?',body:'"'+esc(lbl)+'" will be permanently deleted.',ok:'Delete',danger:true}).then(ok=>{if(!ok)return;REF.drop(kind,rec);toast('Data deleted');render();});}
/* ---------------- add / edit forms (field = template column; Save disabled until valid) ---------------- */
const F=(id,label,ctl,o)=>C.field(label,ctl,Object.assign({req:1,for:id},o||{}));
const inp=(id,v,o)=>'<input class="input" id="'+id+'" value="'+esc(v==null?'':v)+'"'+(o&&o.dis?' disabled':'')+(o&&o.mode?' inputmode="'+o.mode+'"':'')+(o&&o.ro?' readonly':'')+'>';
const sel=(id,html,dis)=>'<select class="select" id="'+id+'"'+(dis?' disabled':'')+'>'+html+'</select>';
const fnum=v=>v==null?'':String(v).replace('.',',');
const projOpts=v=>C.opts(REF.projects().map(p=>[p.code,p.code+' - '+(p.name||p.code)]),v,'Select project');
const gv=(el,id)=>el.querySelector('#'+id).value;
const nv=(el,id,idr)=>IO.ref.num(gv(el,id),idr);
function paintKeys(el,e,keys,touched,all){keys.forEach(k=>{const i=el.querySelector('#f_'+k);if(i)C.setErr(i,(all||touched['f_'+k])?(e[k]||''):'');});}
function openForm(kind,orig){const edit=!!orig;const touched={};const def=proj||(REF.projects()[0]||{}).code;
 const B=kind==='part'?partForm(orig,def,edit):kind==='bom'?bomForm(orig,def,edit,touched):routeForm(orig,def,edit,touched);
 /* M3: Batch stays discoverable in the detail/edit context even though it is no longer a list column */
 const meta=edit?'<div class="refmeta"><span class="tag '+(orig.batch==='Manual'?'slate':'navy')+'">Batch: '+esc(orig.batch||'Manual')+'</span><span class="sm mut">Updated by '+esc(orig.updatedBy||'-')+', '+UI.fdt(orig.updatedAt)+'</span></div>':'';
 DLG.open({title:(edit?'Edit ':'Add ')+LB[kind],sub:edit?esc(REF.NAME[kind](orig)):'',width:B.w,
  body:meta+'<div class="refform" id="rf">'+B.html+'</div>',
  buttons:[{label:'Cancel'},{label:'Save',kind:'primary',disabled:true,onClick:(L,el)=>{const r=refresh(el,true);if(r.bad)return false;const rec=B.commit(r.rec);toast(edit?'Changes saved':'New data added');if(proj&&proj!==rec.project)proj=rec.project;render();}}],
  onOpen:(L,el)=>{const mark=ev=>{if(ev.target.id)touched[ev.target.id]=1;refresh(el);};el.addEventListener('input',mark);el.addEventListener('change',mark);el.addEventListener('focusout',mark);B.wire(el,()=>refresh(el));refresh(el);}});
 function refresh(el,all){const rec=B.read(el);const e=REF.validate(kind,rec,{orig});B.paint(el,e,touched,all);const bad=REF.hasErr(e);const sv=el.querySelector('.ft [data-bi="1"]');if(sv)sv.disabled=bad;return {rec,e,bad};}}
function partForm(o,def,edit){const v=o||{};
 const html=F('f_project','Project',sel('f_project',projOpts(v.project||def),edit))+F('f_partNo','Part Number',inp('f_partNo',v.partNo,{dis:edit}))+F('f_name','Part Name',inp('f_name',v.name),{cls:'span2'})+F('f_pnNoColor','PN No Color',inp('f_pnNoColor',v.pnNoColor),{req:0})+
  F('f_supCode','Supplier Code',sel('f_supCode',C.opts(REF.supLocs().map(l=>[l.code,l.code+' - '+l.name]),v.supCode,'Select supplier code')))+F('f_pnInduk','PN Induk',sel('f_pnInduk',C.opts(['No','Yes'],v.pnInduk||'No')),{req:0})+F('f_capBox','Cap/Box',inp('f_capBox',fnum(v.capBox),{mode:'decimal'}))+F('f_boxVol','Box Vol (m³)',inp('f_boxVol',fnum(v.boxVol),{mode:'decimal'}))+
  '<div class="span2 ptl">'+F('f_p','P (pending unit)',inp('f_p',fnum(v.p),{mode:'decimal'}))+F('f_l','L (pending unit)',inp('f_l',fnum(v.l),{mode:'decimal'}))+F('f_t','T (pending unit)',inp('f_t',fnum(v.t),{mode:'decimal'}))+'</div>'+''+F('f_price','Price (Rp, optional)',inp('f_price',v.price==null?'':v.price,{mode:'numeric'}),{req:0});
 const keys=['project','partNo','name','supCode','pnInduk','capBox','boxVol','p','l','t','price'];
 return {w:620,html,wire(){},read:el=>({project:gv(el,'f_project'),partNo:gv(el,'f_partNo').trim(),name:gv(el,'f_name').trim(),pnNoColor:gv(el,'f_pnNoColor').trim(),supCode:gv(el,'f_supCode'),supplier:(MD.locByCode(gv(el,'f_supCode'))||{}).name||'',pnInduk:gv(el,'f_pnInduk'),capBox:nv(el,'f_capBox'),boxVol:nv(el,'f_boxVol'),p:nv(el,'f_p'),l:nv(el,'f_l'),t:nv(el,'f_t'),price:nv(el,'f_price',1)}),
  paint:(el,e,t,all)=>paintKeys(el,e,keys,t,all),commit:rec=>REF.put('part',Object.assign({},o||{},rec),{old:o||undefined})};}
function bomForm(o,def,edit,touched){const v=o||{};let lines=(v.lines||[{partNo:'',qty:'',category:''}]).map(l=>({partNo:l.partNo,qty:fnum(l.qty),category:l.category}));let proj0=v.project||def;
 const html=F('f_project','Project',sel('f_project',projOpts(proj0),edit))+F('f_model','Model Code',inp('f_model',v.model,{dis:edit}))+
  '<div class="field span2"><label>Parts <span class="req" aria-hidden="true">*</span></label><div class="bomhead"><span>Part Number</span><span>Qty/unit</span><span>Category</span><span>Supplier</span><span></span></div><div id="bl"></div><div class="hint" id="bl-hint"></div><div class="errtxt" hidden id="bl-min">'+ic('x-circle','s12')+'<span></span></div><div class="mt2"><button type="button" class="btn sm" id="addln">'+ic('plus')+'Add Part</button></div></div>';
 const parts=()=>REF.rows('part',gv(document.querySelector('.dialog'),'f_project'));
 const supOf=pn=>{const p=parts().find(x=>lc(x.partNo)===lc(pn));return p?p.supplier:'';};
 function draw(el,cb){const P=parts();const opt=l=>C.opts(P.map(p=>[p.partNo,p.partNo+' - '+p.name]),l.partNo,'Select part');
  el.querySelector('#bl').innerHTML=lines.map((l,i)=>{const fe=(k,c)=>'<div class="field">'+c+'<div class="errtxt" hidden id="l'+i+'_'+k+'-e">'+ic('x-circle','s12')+'<span></span></div></div>';
   return '<div class="bomline">'+fe('partNo','<select class="select" id="l'+i+'_partNo" aria-label="Part Number">'+opt(l)+'</select>')+fe('qty','<input class="input" id="l'+i+'_qty" inputmode="decimal" aria-label="Qty/unit" value="'+esc(l.qty)+'">')+fe('category','<select class="select" id="l'+i+'_category" aria-label="Category">'+C.opts(['PIO','TCO'],l.category,'Select')+'</select>')+'<div class="sup" id="l'+i+'_sup">'+esc(supOf(l.partNo))+'</div><button type="button" class="iconbtn" data-rm="'+i+'" aria-label="Remove part"'+(lines.length<2?' disabled':'')+'>'+ic('trash')+'</button></div>';}).join('');
  el.querySelector('#bl-hint').innerHTML=P.length?'':ic('alert','s12')+' This project has no Part yet. Add Parts first.';
  $$('[data-rm]',el).forEach(b=>b.onclick=()=>{lines.splice(+b.dataset.rm,1);Object.keys(touched).forEach(k=>{if(/^l\d/.test(k))delete touched[k];});draw(el,cb);cb();});}
 return {w:760,html,
  wire(el,cb){draw(el,cb);
   el.querySelector('#addln').onclick=()=>{lines.push({partNo:'',qty:'',category:''});draw(el,cb);cb();};
   el.querySelector('#f_project').onchange=()=>{lines=lines.map(l=>({partNo:'',qty:l.qty,category:l.category}));draw(el,cb);cb();};
   el.querySelector('#bl').addEventListener('input',ev=>{const m=/^l(\d+)_(\w+)$/.exec(ev.target.id);if(m)lines[+m[1]][m[2]]=ev.target.value;});
   el.querySelector('#bl').addEventListener('change',ev=>{const m=/^l(\d+)_(\w+)$/.exec(ev.target.id);if(!m)return;lines[+m[1]][m[2]]=ev.target.value;if(m[2]==='partNo'){const s=el.querySelector('#l'+m[1]+'_sup');if(s)s.textContent=supOf(ev.target.value);}cb();});},
  read:el=>({project:gv(el,'f_project'),model:gv(el,'f_model').trim(),lines:lines.map(l=>({partNo:l.partNo,qty:IO.ref.num(l.qty),category:l.category}))}),
  paint(el,e,t,all){paintKeys(el,e,['project','model'],t,all);
   lines.forEach((l,i)=>['partNo','qty','category'].forEach(k=>{const x=el.querySelector('#l'+i+'_'+k);if(x)C.setErr(x,(all||t['l'+i+'_'+k])?((e.lines&&e.lines[i]&&e.lines[i][k])||''):'');}));
   const m=el.querySelector('#bl-min');m.hidden=!e.linesMin;if(e.linesMin)m.querySelector('span').textContent=e.linesMin;},
  commit:rec=>REF.put('bom',Object.assign({},o||{},rec),{old:o||undefined})};}
function routeForm(o,def,edit,touched){const v=o||{};let comp=(v.comp||[]).slice();let dragI=null;
 const html=F('f_project','Project',sel('f_project',projOpts(v.project||def),edit))+F('f_routeCode','Route Code',inp('f_routeCode',v.routeCode),{req:0})+F('f_name','Route Name',inp('f_name',v.name))+F('f_pool','Pool',sel('f_pool',C.opts(REF.poolLocs().map(l=>l.name),v.pool||'Pool Cibitung')))+F('f_nsup','Number of Supplier',inp('f_nsup','',{ro:1,dis:1}),{req:0})+
  '<div class="field span2"><label>Composition <span class="req" aria-hidden="true">*</span></label><div class="chipbox" id="f_comp" role="list" aria-label="Composition"></div><div class="row gap2 mt2 wrap"><select class="select chipadd" id="addloc" aria-label="Add location to composition"></select><span class="refpath" id="rp"></span></div><div class="errtxt" hidden id="f_comp-e">'+ic('x-circle','s12')+'<span></span></div></div>'+
  F('f_chassis','Category',sel('f_chassis',C.opts(UI.CATS,v.chassis,'Select category')))+F('f_body','Karoseri',sel('f_body',C.opts(UI.KAROS,v.body,'Select karoseri')))+F('f_cap','Capacity (m³)',inp('f_cap',fnum(v.cap),{mode:'decimal'}))+F('f_liqVol','Liq Vol/FB (m³)',inp('f_liqVol',fnum(v.liqVol),{mode:'decimal'}))+F('f_shipVol','Shipping Volume (pending contract)',inp('f_shipVol',fnum(v.shippingVol),{mode:'decimal'}),{req:0})+F('f_heijunka','Heijunka Interval (min, optional)',inp('f_heijunka',fnum(v.heijunka),{mode:'numeric'}),{req:0})+F('f_notes','Notes (optional)',inp('f_notes',v.notes),{req:0});
 const L=n=>MD.location(n)||{};
 function draw(el,cb,focusI){const box=el.querySelector('#f_comp');const pool=REF.codeOf(gv(el,'f_pool'));
  box.innerHTML='<span class="rchip pool" title="Pool (automatic)">'+esc(pool)+'</span>'+comp.map((n,i)=>'<span class="rchip'+(L(n).owner==='Customer'?' cust':'')+'" role="listitem" draggable="true" tabindex="0" data-ci="'+i+'" title="'+esc(n)+', '+esc(L(n).owner||'')+'. Drag or press Left / Right to reorder"><span>'+esc(L(n).code||n)+'</span><button type="button" class="x" data-cx="'+i+'" aria-label="Remove '+esc(L(n).code||n)+'">'+ic('x','s12')+'</button></span>').join('')+'<span class="rchip pool" title="Pool (automatic)">'+esc(pool)+'</span>';
  const free=REF.supLocs().concat(REF.custLocs()).filter(l=>comp.indexOf(l.name)<0);const og=(t,a)=>a.length?'<optgroup label="'+t+'">'+a.map(l=>'<option value="'+esc(l.name)+'">'+esc(l.code+' - '+l.name)+'</option>').join('')+'</optgroup>':'';
  el.querySelector('#addloc').innerHTML='<option value="">Add location</option>'+og('Supplier',free.filter(l=>l.owner==='Supplier'))+og('Customer',free.filter(l=>l.owner==='Customer'));
  el.querySelector('#f_nsup').value=comp.filter(n=>L(n).owner==='Supplier').length;el.querySelector('#rp').textContent=REF.comp({pool:gv(el,'f_pool'),comp}).join(' > ');
  $$('[data-cx]',box).forEach(b=>b.onclick=()=>{comp.splice(+b.dataset.cx,1);touched.f_comp=1;draw(el,cb);cb();});
  $$('[data-ci]',box).forEach(c=>{const i=+c.dataset.ci;
   c.ondragstart=e=>{dragI=i;c.classList.add('dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(i));}catch(x){}};
   c.ondragend=()=>{dragI=null;c.classList.remove('dragging');};
   c.ondragover=e=>{if(dragI==null)return;e.preventDefault();c.classList.add('over');};c.ondragleave=()=>c.classList.remove('over');
   c.ondrop=e=>{e.preventDefault();c.classList.remove('over');if(dragI==null||dragI===i)return;move(dragI,i);dragI=null;touched.f_comp=1;draw(el,cb,i);cb();};
   c.onkeydown=e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;const j=i+(e.key==='ArrowRight'?1:-1);if(j<0||j>=comp.length)return;e.preventDefault();move(i,j);touched.f_comp=1;draw(el,cb,j);cb();};});
  if(focusI!=null){const f=box.querySelector('[data-ci="'+focusI+'"]');if(f)f.focus();}}
 const move=(a,b)=>{comp.splice(b,0,comp.splice(a,1)[0]);};
 return {w:760,html,
  wire(el,cb){draw(el,cb);const a=el.querySelector('#addloc');a.onchange=()=>{if(!a.value)return;comp.push(a.value);touched.f_comp=1;draw(el,cb);cb();};el.querySelector('#f_pool').onchange=()=>{draw(el,cb);cb();};},
  read:el=>({project:gv(el,'f_project'),routeCode:gv(el,'f_routeCode').trim(),name:gv(el,'f_name').trim(),pool:gv(el,'f_pool'),comp:comp.slice(),chassis:gv(el,'f_chassis'),body:gv(el,'f_body'),cap:nv(el,'f_cap'),liqVol:nv(el,'f_liqVol'),shippingVol:nv(el,'f_shipVol'),heijunka:nv(el,'f_heijunka'),notes:gv(el,'f_notes').trim()}),
  paint(el,e,t,all){paintKeys(el,e,['project','routeCode','name','pool','chassis','body','cap','liqVol','shipVol','heijunka'],t,all);C.setErr(el.querySelector('#f_comp'),(all||t.f_comp)?(e.comp||''):'');},
  commit:rec=>{const base=Object.assign({},o||{},rec);if(!o){base.id=REF.routeId(rec.project);base.stagger=0;}REF.build(base,o);return REF.put('route',base,{old:o||undefined});}};}
/* ---------------- reference check (FR-8) ---------------- */
function check(){const list=proj?[proj]:REF.projects().map(p=>p.code);const items=[];list.forEach(c=>REF.check(c).forEach(i=>items.push(Object.assign({project:c},i))));
 DLG.open({title:'Reference check',sub:esc(proj||'All projects'),width:680,body:items.length?'<div class="tbl-scroll"><table class="refcheck"><thead><tr><th>Project</th><th>Type</th><th>Item</th><th>Issue</th><th></th></tr></thead><tbody>'+items.map((i,n)=>'<tr><td>'+esc(i.project)+'</td><td>'+esc(LB[i.kind])+'</td><td><b>'+esc(i.item)+'</b></td><td><span class="errtxt">'+esc(i.msg)+'</span></td><td class="act"><button type="button" class="btn sm" data-o="'+n+'">Open</button></td></tr>').join('')+'</tbody></table></div>':banner('ok','No missing or invalid reference found.'),
  onOpen(L,el){$$('[data-o]',el).forEach(b=>b.onclick=()=>{const i=items[+b.dataset.o];const s=ts[i.kind];if(s)s.f={project:i.project,[KC[i.kind]]:i.item};tab=i.kind;proj=i.project;q=i.item;L.close();render();});},buttons:[{label:'Close',kind:'primary'}]});}
/* ---------------- import: 3 steps, partial (FR-4) ---------------- */
function importFlow(kind){let step=1,res=null,n=0;
 const L=DLG.open({title:'Import '+LB[kind],sub:'Excel or CSV, partial import: only valid rows are saved',width:700,body:'<div id="ib"></div>',buttons:[]});
 const names=['Template and upload','Review','Result'];
 const stepper=()=>'<div class="refstep stepper">'+names.map((s,i)=>'<div class="step '+(i+1<step?'done':i+1===step?'on':'')+'"><span class="n">'+(i+1<step?ic('check'):i+1)+'</span>'+s+'</div>'+(i<names.length-1?'<div class="stepline'+(i+1<step?' done':'')+'"></div>':'')).join('')+'</div>';
 function draw(){const b=$('#ib',L.el);let h=stepper()+'<div class="mt4">';
  if(step===1){h+='<div class="row gap2 wrap"><button type="button" class="btn" id="tpl">'+ic('download')+'Download template</button><span class="sm mut">Columns are exactly the form fields. The example row is skipped.</span></div>'+
    '<div class="mt3"><div class="lbl mb2">Required columns</div><div class="row wrap gap1">'+IO.ref.COLS[kind].filter(c=>c[2]).map(c=>tag(esc(c[1]),'slate')).join('')+'</div></div>'+(IO.ref.COLS[kind].some(c=>!c[2])?'<div class="mt3"><div class="lbl mb2">Optional</div><div class="row wrap gap1">'+IO.ref.COLS[kind].filter(c=>!c[2]).map(c=>tag(esc(c[1]),'line')).join('')+'</div></div>':'')+
    '<label class="drop mt4" id="dz" tabindex="0">'+ic('upload')+'<b>Drop file or browse</b><span class="sm mut">.xlsx, .csv. Existing keys are reported as duplicates and never overwritten.</span><input type="file" id="fi" accept=".xlsx,.xls,.csv" hidden></label><div id="ferr" class="mt2"></div>';
   L.setButtons([{label:'Cancel'}]);}
  if(step===2){const ok=res.validRows,bad=res.failed.length;
   h+='<div class="row gap2 wrap"><span class="tag line">'+ic('file')+esc(res.file)+'</span>'+tag(ok+' valid','green','check')+tag(bad+' failed',bad?'red':'slate',bad?'x-circle':'check')+'</div>';
   if(res.legacy&&res.legacy.length)h+='<div class="mt3">'+banner('info','Legacy column names mapped to the current template: '+res.legacy.map(x=>'<b>'+esc(x.from)+'</b> → '+esc(x.to)).join('; '))+'. Values were read as-is, no unit conversion was applied.</div>';
   if(res.missing.length)h+='<div class="mt3">'+banner('err','Wrong headers. Missing: <b>'+esc(res.missing.join(', '))+'</b>')+'</div>';
   else if(!res.total)h+='<div class="mt3">'+banner('err','File has no data rows')+'</div>';
   else{h+='<div class="mt3 lbl mb2">Summary</div><div class="sm">'+ok+' valid / '+bad+' failed</div>';
    if(bad)h+='<div class="mt3 lbl mb2">Error Details</div><ul class="referr" id="errs">'+res.failed.slice(0,300).map(f=>'<li><b>'+esc(f.text.replace(/^(Row \d+:)(.*)$/,'$1'))+'</b>'+esc(f.text.replace(/^Row \d+:/,''))+'</li>').join('')+(res.failed.length>300?'<li>... '+(res.failed.length-300)+' more</li>':'')+'</ul>';}
   L.setButtons([{label:'Re-upload',keep:true,onClick:()=>{step=1;draw();}},{label:'Import '+ok+' Valid Rows',kind:'primary',disabled:!ok,keep:true,onClick:()=>{n=IO.ref.commit(kind,res);tab=kind;render();step=3;draw();}}]);}
  if(step===3){const bad=res.failed.length;h+='<div class="empty">'+ic('check-circle','s24')+'<b id="impdone">'+res.validRows+' records imported — Import #'+n+'</b>'+(bad?'<span class="sm mut">'+bad+' rows were not imported</span>':'')+'</div>';L.setButtons([{label:'Done',kind:'primary'}]);}
  b.innerHTML=h+'</div>';
  if(step===1){$('#tpl',L.el).onclick=()=>IO.ref.template(kind);const dz=$('#dz',L.el),fi=$('#fi',L.el);dz.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click();}};
   dz.ondragover=e=>{e.preventDefault();dz.classList.add('over');};dz.ondragleave=()=>dz.classList.remove('over');dz.ondrop=e=>{e.preventDefault();dz.classList.remove('over');if(e.dataTransfer.files[0])take(e.dataTransfer.files[0]);};fi.onchange=()=>{if(fi.files[0])take(fi.files[0]);};}}
 async function take(file){const fe=$('#ferr',L.el);if(!/\.(xlsx|xls|csv)$/i.test(file.name)){fe.innerHTML=banner('err','Use .xlsx or .csv');return;}
  try{res=await IO.ref.parseFile(kind,file);step=2;draw();}catch(e){console.warn(e);fe.innerHTML=banner('err','File could not be read');}}
 draw();return L;}
TABS.forEach(k=>{const rk=REF.RK[k];if(!rk)return;STORE.subscribe(rk.ent,(e,s)=>{if(s==='remote'||s==='reset')render();});});
render();
window.REFPAGE={importFlow,openForm,del,render,state:()=>({tab,proj,q})};
})();
