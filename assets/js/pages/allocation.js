/* Resource Allocation (DEV-B, feedback 2026-10-19). Only Planner (view), PM (edit) and Supply (view) open it (roles.js).
   - Project picker: three searchable dropdowns (Plan ID / Customer Name / Project Name) that fill each other (PP.projectPicker).
   - Project Information, Requested Unit / Requested Driver as tables with "Request All" and a per-row Request.
   - Allocation list for Units and Drivers (Master Data columns, no status, no readiness, no unit-driver mapping), Swap and Delete from the list.
   - Request Unit / Request Driver dialog: Ownership (locked to the Fulfillment by Ownership, free only for Mix), Category, Karoseri / License, Certification,
     Number, From - To, Reason, and the list of Active Master Data units / drivers: own asset first, then matching Category + Karoseri + Tonase + Volume, then
     License Plate A-Z, matching units auto-selected up to Number, selected counter, no pagination (10 rows in view). Selected units are allocated at once;
     what is still missing becomes a Resource Request for Supply / Vehicle Management. */
(function(){
const {ic,esc}=UI;const {$,$$,DLG,toast,banner}=C;
/* old ?tab=requests deep links open the cross-project Resource Requests page */
if(UI.q('tab')==='requests'){const q=UI.q('project');location.replace('resource-requests.html'+(q?'?project='+encodeURIComponent(q):''));return;}
if(!SHELL.mount({module:'planning',id:'alloc',active:'alloc',title:'Resource Allocation',crumb:'Setup',actions:'<button type="button" class="btn" id="hist">'+ic('history')+'History</button>'}))return;
PP.autoSync();
const allPlans=()=>DOM.plans();
/* every plan that has a PM (Pending PM plans are not selectable), not Closed / Cancelled, incl. In Planning; the PM sees only the plans assigned to him / her, every other role sees all of them */
const pickable=()=>allPlans().filter(p=>!!p.pm&&p.status!=='Closed'&&p.status!=='Cancelled'&&!PP.onCall(p)&&(STORE.persona()!=='pm'||p.pm===STORE.me().n));
let code=UI.q('project')||((UI.q('plan')&&(allPlans().find(p=>p.id===UI.q('plan'))||{}).project))||(pickable().find(p=>PP.modeOf(p))||pickable()[0]||{}).project||'';
if(code&&!allPlans().some(p=>p.project===code)){const x=allPlans().find(p=>p.id===code||MD.project(p.projectId)&&MD.project(p.projectId).name===code);code=x?x.project:'';}
let kind='unit';let PK=null;
const plan=()=>allPlans().find(p=>p.project===code)||null;
const proj=()=>{const p=plan();return p?PP.proj(p):{};};
const allocs=()=>STORE.get('allocations').filter(a=>a.project===code);
const mode=()=>PP.modeOf(plan());
const hasMode=()=>!!mode();
const canAlloc=()=>STORE.can('allocEdit')&&hasMode();
const canReq=()=>STORE.can('allocRequest')&&hasMode();
const today=()=>STORE.today();
const projEnd=()=>{const p=plan();return (p&&p.validUntil)||proj().validity||'2026-12-31';};
const nextAl=all=>'AL-'+String(Math.max(0,...all.map(a=>+(String(a.id).split('-')[1])||0))+1).padStart(4,'0');
const nextRr=rows=>'RR-2026-'+String(Math.max(30,...rows.map(r=>+(String(r.id).split('-')[2])||0))+1).padStart(4,'0');
/* Adit: inclusive date overlap (BR #7) - existing.From <= requested.To && existing.To >= requested.From */
const overlaps=(a,from,to)=>a.validFrom<=to&&a.validTo>=from;
function usedIn(plate,from,to,except){return STORE.get('allocations').filter(a=>a.kind==='unit'&&a.plate===plate&&a.status!=='Released'&&a.id!==except&&overlaps(a,from,to));}
function driverUsedIn(did,from,to,except){return STORE.get('allocations').filter(a=>a.kind==='driver'&&a.driver===did&&a.status!=='Released'&&a.id!==except&&overlaps(a,from,to));}
function pname(c){const pl=allPlans().find(x=>x.project===c);return pl?PP.pname(pl):c;}
/* operational warning (BR #17): Maintenance in the unit status log overlapping from..to; never a gate */
function maint(plate,from,to){const v=MD.vehicle(plate);if(v&&v.opStatus!=='Available')return true;return !!STORE.get('unitStatus').find(s=>s.plate===plate&&s.from<=to&&(!s.to||s.to>=from));}
function upcoming(a,from){return STORE.get('trips').filter(t=>t.date>=from&&(a.kind==='unit'?t.unit===a.plate:t.driver===a.driver)&&!/Released|Skipped|Cancelled|Converted/.test(t.status));}
function save(rows){STORE.set('allocations',rows);PP.sync();}
/* ---------- page ---------- */
function init(){
 $('#content').innerHTML='<div id="pk"></div><div id="raBody" class="stack mt4"></div>';
 const p=plan();
 PK=PP.projectPicker({plans:pickable,value:p&&pickable().some(x=>x.id===p.id)?p.id:'',onChange:id=>{const x=id&&allPlans().find(y=>y.id===id);code=x?x.project:'';history.replaceState(null,'',code?'?project='+encodeURIComponent(code):location.pathname);body();}});
 $('#pk').innerHTML=PK.html();PK.wire($('#pk'));body();}
/* Project Information: Plan ID, Customer Name, Project Ref Number, Project Name, Moda Business Line, Project Type, Fulfillment by Ownership, Notes */
function info(){const pp=plan(),pr=proj();const nt=PP.notesOf(pr);
 const kv=[['Plan ID',pp.id],['Customer Name',pr.customer],['Project Ref Number',pr.refno||pp.project],['Project Name',pr.name],['Moda Business Line',PP.dash(pr.bizline)],['Project Type',PP.dash(pr.ptype)],['Fulfillment by Ownership',PP.modeLabel(pp)]];
 return '<div class="panel"><div class="panel-hd"><h3>Project Information</h3></div><div class="body"><div class="ra-info">'+kv.map(x=>'<div><span class="k">'+x[0]+'</span><b>'+esc(x[1])+'</b></div>').join('')+(nt.length?'<div class="wide"><span class="k">Notes</span>'+nt.map(x=>'<b><span class="mut">'+esc(x[0])+':</span> '+esc(x[1])+'</b>').join('')+'</div>':'')+'</div></div></div>';}
function body(){const B=$('#raBody');const pp=plan();
 if(!pp){B.innerHTML=PL.empty('No project selected');return;}
 if(PP.onCall(pp)){B.innerHTML=info()+PL.empty('On Call projects have no Resource Allocation');return;}
 B.innerHTML=info()+PL.seg([['unit','Unit'],['driver','Driver']],kind,'data-kind',{label:'Resource kind'})+'<div id="reqP"></div><div class="panel" id="tbl"></div>';
 $$('[data-kind]',B).forEach(b=>b.onclick=()=>{kind=b.dataset.kind;body();});
 reqPanel();allocTable();}
/* ---------------- Requested Unit / Requested Driver ---------------- */
const thr=(h,c)=>'<th'+(c?' class="'+c+'"':'')+'>'+h+'</th>';
function reqPanel(){const pp=plan();const u=kind==='unit';const rows=u?PP.reqUnits(pp):PP.reqDrivers(pp);const short=rows.filter(r=>r.alloc<r.req);const can=canReq();
 const dis=!hasMode();
 const head='<div class="panel-hd"><h3>'+(u?'Requested Unit':'Requested Driver')+'</h3><span class="sp"></span>'+(STORE.can('allocRequest')&&short.length?'<button type="button" class="btn primary sm" id="reqAll"'+(dis?' disabled title="Set Fulfillment by Ownership in Project Planning" aria-disabled="true"':'')+'>Request All</button>':'')+'</div>';
 const act=(r,i)=>r.alloc>=r.req?UI.status('Covered','green'):(can?'<button type="button" class="btn sm" data-req="'+i+'">Request</button>':'');
 const ucols=[{k:'cat',h:'Unit Category'},{k:'kar',h:'Karoseri'},{k:'ton',h:'Tonase',cls:'num',text:r=>PP.dash(r.ton)},{k:'vol',h:'Volume',cls:'num',text:r=>PP.dash(r.vol)}];
 const dcols=[{k:'lic',h:'License'},{k:'cert',h:'Certification'}];
 const cols=(u?ucols:dcols).concat([{k:'req',h:'Required',cls:'num'},{k:'alloc',h:'Allocated',cls:'num'},{k:'_a',h:'Action',cls:'act-r',sortable:false,noFilter:true,render:r=>act(r,rows.indexOf(r))}]);
 $('#reqP').innerHTML='<div class="panel">'+head+'<div class="ra-req" id="reqT"></div></div>';
 C.table($('#reqT'),{key:'_i',label:u?'Requested Unit':'Requested Driver',paged:false,rows:()=>rows,cols:cols,empty:{text:'-'},after:h=>$$('[data-req]',h).forEach(b=>b.onclick=()=>{const r=rows[+b.dataset.req];const x=Object.assign({},r,{n:r.req-r.alloc});u?requestUnit([x]):requestDriver([x]);})});
 const ra=$('#reqAll');if(ra&&!dis)ra.onclick=()=>u?requestUnit(short.map(r=>Object.assign({},r,{n:r.req-r.alloc}))):requestDriver(short.map(r=>Object.assign({},r,{n:r.req-r.alloc})));}
/* ---------------- allocation list ---------------- */
function allocTable(){const pp=plan();const u=kind==='unit';const can=canAlloc();
 const tool=STORE.can('allocEdit')?'<div class="ra-tool"><span class="sp"></span><button type="button" class="btn primary" id="'+(u?'addU':'addD')+'"'+(hasMode()?'':' disabled title="Set Fulfillment by Ownership in Project Planning" aria-disabled="true"')+'>'+ic('plus')+(u?'Add Unit':'Add Driver')+'</button></div>':'';
 $('#tbl').insertAdjacentHTML('beforebegin',tool);
 const pre=[{k:'id',h:'Allocation ID',w:115,text:r=>r.allocId}];
 C.table($('#tbl'),{key:'allocId',minw:u?1250:1100,label:u?'Unit allocations':'Driver allocations',cols:u?PP.unitCols({pre}):PP.driverCols({pre,notes:false}),rows:()=>u?PP.unitRows(pp):PP.driverRows(pp),
  actions:{view:r=>viewAlloc(r.alloc),edit:r=>swap(r.alloc),del:r=>release(r.alloc),labels:{edit:'Swap',del:'Delete'},can:(k,r)=>k==='view'||can,name:r=>r.allocId},
  empty:{text:u?'No units allocated':'No drivers allocated'}});
 const b=$(u?'#addU':'#addD');if(b&&hasMode())b.onclick=()=>u?requestUnit(null,true):requestDriver(null,true);}
function viewAlloc(a){const v=a.plate&&MD.vehicle(a.plate);const d=a.kind==='driver'&&MD.driver(a.driver);const dts=UI.fdate(a.validFrom)+' - '+UI.fdate(a.validTo);
 const kv=a.kind==='unit'?[['Allocation ID',a.id],['License Plate',a.plate||'-'],['Ownership',UI.own(v?v.ownership:a.source)],['Vendor',(v&&v.own==='vendor'&&v.vendor)||(a.source==='Vendor'&&a.vendor)||'-'],['Business Line',(v&&v.bizline)||'-'],['Unit Category',v?v.chassis:'-'],['Karoseri',v?v.karoseri:'-'],['Liq Vol',v&&v.m3!=null?v.m3:'-'],['Shipping Vol',v&&v.shipvol!=null?v.shipvol:'-'],['Tonase',v&&v.ton!=null?v.ton:'-'],['Notes',(v&&v.notes)||'-'],['Period',dts]]
  :[['Allocation ID',a.id],['Driver Name',d?d.name:a.driver],['Ownership',UI.own(d?d.ownership:'-')||'-'],['Vendor',(d&&d.own==='vendor'&&d.vendor)||'-'],['Phone Number',(d&&d.phone)||'-'],['License Acquired',d?((d.licenses||[]).join(', ')||'-'):'-'],['Certification Acquired',d?((d.certs||[]).join(', ')||'-'):'-'],['Notes',(d&&d.notes)||'-'],['Period',dts]];
 DLG.open({title:a.kind==='unit'?'Unit allocation':'Driver allocation',sub:esc(a.id),width:520,body:'<dl class="kv2">'+kv.map(x=>'<dt>'+x[0]+'</dt><dd>'+esc(String(x[1]))+'</dd>').join('')+'</dl>'});}
/* ---------------- Swap and Delete ---------------- */
function swap(a){const u=a.kind==='unit';const src=PP.srcOf(mode());const pr=proj();
 const cur=u?MD.vehicle(a.plate):MD.driver(a.driver);
 const eff0=UI.addDays(today(),1);
 const candsFor=eff=>u?MD.get().dd.vehicles.filter(x=>x.plate&&x.plate!==a.plate&&x.status==='Active'&&src.indexOf(x.own==='vendor'?'Vendor':'Own')>=0&&(!pr.bizline||x.bizline===pr.bizline)&&(!cur||(x.chassis===cur.chassis&&MD.karMatch(x.karoseri,cur.karoseri)))&&!usedIn(x.plate,eff,a.validTo).length).sort((x,y)=>(x.own==='own'?0:1)-(y.own==='own'?0:1)||String(x.plate).localeCompare(String(y.plate)))
  :MD.get().dd.drivers.filter(x=>x.id!==a.driver&&x.status==='Active'&&src.indexOf(x.own==='vendor'?'Vendor':'Own')>=0&&!driverUsedIn(x.id,eff,a.validTo).length).sort((x,y)=>(x.own==='own'?0:1)-(y.own==='own'?0:1)||String(x.name).localeCompare(String(y.name)));
 let TBL=null;const nOf=()=>[...(TBL?TBL.sel:[])][0]||'';
 DLG.open({cls:'ra-dlg',title:u?'Swap unit':'Swap driver',sub:esc(a.id+' '+(u?a.plate||'':(cur||{}).name||'')),width:u?1100:1000,
  body:'<div class="ra-form">'+C.field('Effective','<input class="input" type="date" id="se" value="'+eff0+'" min="'+today()+'">',{req:1,for:'se'})+C.field('Reason','<textarea class="textarea" rows="2" id="sr"></textarea>',{req:1,for:'sr',cls:'s3'})+'</div><div id="qerr"></div><div id="swt" class="ra-fit"></div>',
  onOpen(L){L.el.style.maxWidth='96vw';const draw=()=>{const eff=$('#se',L.el).value||today();const host=$('#swt',L.el);host._tbl=null;
    TBL=C.table(host,{key:u?'plate':'id',label:u?'Available units':'Available drivers',minw:u?1000:900,rows:candsFor(eff),select:1,single:1,paged:false,keepScroll:1,after:h=>PP.fit(h,6),cols:u?PP.unitCols():PP.driverCols({notes:false}),empty:{text:u?'No available units':'No available drivers'}});};
   $('#se',L.el).onchange=draw;draw();},
  buttons:[{label:'Cancel'},{label:'Swap',kind:'primary',onClick(L,el){const nu=nOf(),eff=$('#se',el).value,r=$('#sr',el).value.trim();let ok=C.setErr($('#se',el),eff?'':'Required');$('#qerr',el).innerHTML=nu?'':banner('err',u?'Select a unit':'Select a driver');ok=!!nu&&ok;ok=C.setErr($('#sr',el),r?'':'Reason required')&&ok;if(!ok)return false;
   const all=STORE.get('allocations');const old=all.find(x=>x.id===a.id);old.status='Released';old.validTo=UI.addDays(eff,-1);old.releaseReason=r;
   const nid=nextAl(all);const row=u?{id:nid,project:code,kind:'unit',plate:nu,source:MD.vehicle(nu).own==='vendor'?'Vendor':old.source==='Vendor'?'Own':old.source,vendor:MD.vehicle(nu).own==='vendor'?(MD.vehicle(nu).vendor||''):'',status:'Active',validFrom:eff,validTo:a.validTo,role:old.role,replaces:old.id}
    :{id:nid,project:code,kind:'driver',driver:nu,source:(MD.driver(nu)||{}).own==='vendor'?'Vendor':'Own',status:'Active',validFrom:eff,validTo:a.validTo,role:old.role,replaces:old.id};
   all.push(row);save(all);
   const nm=u?nu:(MD.driver(nu)||{}).name,om=u?a.plate:(cur||{}).name;
   if(u){const trips=STORE.get('trips');let n=0;trips.forEach(t=>{if(t.date>=eff&&t.unit===a.plate&&!/Released|Skipped|Cancelled|Converted/.test(t.status)){t.flags=(t.flags||[]).filter(f=>f!=='Unit replaced').concat(['Unit replaced']);t.replanFrom=a.plate;n++;}});STORE.set('trips',trips);}
   STORE.audit({action:u?'Swapped unit':'Swapped driver',before:om,after:nm,detail:r+', from '+UI.fdate(eff),obj:code,type:'Allocation'});STORE.notify({kind:'Info',to:['pm','planner'],title:om+' swapped to '+nm,link:'allocation.html?project='+encodeURIComponent(code)});toast(om+' swapped to '+nm);body();}}]});}
function release(a){const n=upcoming(a,today()).length;const nm=a.plate||(MD.driver(a.driver)||{}).name||'';
 DLG.confirm({title:a.kind==='unit'?'Delete unit':'Delete driver',sub:esc(a.id+' '+nm),body:n?banner('warn',UI.plural(n,'upcoming trip')+' use this resource',{sm:1}):'',reason:true,ok:'Delete',danger:true}).then(r=>{if(!r)return;
  const all=STORE.get('allocations');const x=all.find(y=>y.id===a.id);x.status='Released';x.validTo=today();x.releaseReason=r;save(all);STORE.audit({action:'Deleted '+(a.kind==='unit'?'unit':'driver'),detail:nm+': '+r,obj:code,type:'Allocation'});
  toast('Deleted',{action:{label:'Undo',fn:()=>{const al=STORE.get('allocations');const y=al.find(z=>z.id===a.id);y.status='Active';y.validTo=a.validTo;save(al);body();}}});body();});}
/* ---------------- Request Unit / Request Driver ---------------- */
/* Ownership field: locked to the Fulfillment by Ownership (Own Asset / Transporter); only Mix may choose. Stored values stay Internal / Transporter / In House / Outsource, shown through UI.own() */
const unitOwn=()=>mode()==='Own Asset'?['Internal']:mode()==='Vendor'?['Transporter']:['Mix','Internal','Transporter'];
const driverOwn=()=>mode()==='Own Asset'?['In House']:mode()==='Vendor'?['Outsource']:['Mix','In House','Outsource'];
const ownOk=(own,isOwn)=>own==='Mix'||own==='Internal'&&isOwn||own==='Transporter'&&!isOwn||own==='In House'&&isOwn||own==='Outsource'&&!isOwn;
const unitTo=own=>own==='Internal'?['Vehicle Management',['vm']]:own==='Transporter'?['Supply Management',['supply']]:['Supply Management',['supply','vm']];
function requestUnit(rows,add){const ADD=!!add;const pp=plan(),pr=proj();const multi=!!rows&&rows.length>1;
 const reqAll=PP.reqUnits(pp);const shortRows=reqAll.filter(r=>r.alloc<r.req);
 const f0=(rows&&rows[0])||shortRows[0]&&Object.assign({},shortRows[0],{n:shortRows[0].req-shortRows[0].alloc})||(reqAll[0]&&Object.assign({},reqAll[0],{n:1}))||{cat:'CDD',kar:'Wingbox',ton:null,vol:null,n:1};
 const own=ADD&&mode()==='Mix'?['Mix']:unitOwn();const src=PP.srcOf(mode());const biz=pr.bizline||'';
 const cats=UI.CATS.slice(),kars=UI.KAROS.slice();if(cats.indexOf(f0.cat)<0)cats.push(f0.cat);if(kars.indexOf(f0.kar)<0)kars.push(f0.kar);
 const mkNeeds=el=>{if(multi)return rows.map((r,i)=>({cat:r.cat,kar:r.kar,ton:r.ton,vol:r.vol,n:Math.max(0,parseInt($('#qn'+i,el).value,10)||0)}));
  const cat=$('#qc',el).value,kar=$('#qk',el).value;const m=reqAll.find(r=>r.cat===cat&&MD.karGroup(r.kar)===MD.karGroup(kar));return [{cat,kar,ton:m?m.ton:null,vol:m?m.vol:null,n:ADD?(m?Math.max(0,m.req-m.alloc):0):Math.max(0,parseInt($('#qn',el).value,10)||0)}];};
 const period=el=>({f:$('#qf',el).value,t:$('#qt',el).value});
 const cands=el=>{const p=period(el);if(!p.f||!p.t||p.t<p.f)return [];const o=$('#qo',el).value;
  return MD.get().dd.vehicles.filter(v=>v.plate&&v.status==='Active'&&src.indexOf(v.own==='vendor'?'Vendor':'Own')>=0&&ownOk(o,v.own==='own')&&(!biz||v.bizline===biz)&&!usedIn(v.plate,p.f,p.t).length);};
 let TBL=null,LAY=null;
 const form=(multi?'<div class="ra-form">'+C.field('Ownership','<select class="select'+(own.length===1?' ra-lock':'')+'" id="qo"'+(own.length===1?' disabled':'')+'>'+C.opts(own.map(x=>[x,UI.own(x)]),own[0])+'</select>',{req:1,for:'qo'})+C.field('From','<input class="input" type="date" id="qf" value="'+today()+'" min="'+today()+'">',{req:1,for:'qf'})+C.field('To','<input class="input" type="date" id="qt" value="'+projEnd()+'">',{req:1,for:'qt'})+
   '<div class="s3"><div class="tbl-scroll"><table aria-label="Requested units"><thead><tr>'+thr('Unit Category')+thr('Karoseri')+thr('Tonase','num')+thr('Volume','num')+thr('Number','num')+'</tr></thead><tbody>'+rows.map((r,i)=>'<tr><td>'+esc(r.cat)+'</td><td>'+esc(r.kar)+'</td><td class="num">'+esc(PP.dash(r.ton))+'</td><td class="num">'+esc(PP.dash(r.vol))+'</td><td class="num"><input class="input" type="number" min="0" max="99" id="qn'+i+'" value="'+r.n+'" aria-label="Number '+esc(r.cat+' '+r.kar)+'" style="width:80px;text-align:right"></td></tr>').join('')+'</tbody></table></div></div>'
  :'<div class="ra-form">'+C.field('Ownership','<select class="select'+(own.length===1?' ra-lock':'')+'" id="qo"'+(own.length===1?' disabled':'')+'>'+C.opts(own.map(x=>[x,UI.own(x)]),own[0])+'</select>',{req:1,for:'qo'})+C.field('Unit Category','<select class="select" id="qc">'+C.opts(cats,f0.cat)+'</select>',{req:1,for:'qc'})+C.field('Karoseri','<select class="select" id="qk">'+C.opts(kars,f0.kar)+'</select>',{req:1,for:'qk'})+
   (ADD?'':C.field('Number','<input class="input" type="number" min="1" max="99" id="qn" value="'+Math.max(1,f0.n||1)+'">',{req:1,for:'qn'}))+C.field('From','<input class="input" type="date" id="qf" value="'+today()+'" min="'+today()+'">',{req:1,for:'qf',cls:'s2'})+C.field('To','<input class="input" type="date" id="qt" value="'+projEnd()+'">',{req:1,for:'qt',cls:'s2'}))+
  (ADD?'':C.field('Reason','<textarea class="textarea" rows="2" id="qr" autocomplete="off"></textarea>',{req:1,for:'qr',cls:'s3'}))+'</div>';
 LAY=DLG.open({cls:'ra-dlg',title:ADD?'Add Unit':'Request Unit',sub:esc(pp.id+' - '+PP.pname(pp)),width:ADD?1100:720,
  body:form+(ADD?'<div class="ra-bar"><span class="ra-count" id="qsel"></span></div>':'')+'<div id="qerr"></div>'+(ADD?'<div id="qtbl" class="ra-fit"></div>':''),
  onOpen(L,el){el.style.maxWidth='96vw';
   const upd=()=>{if(!ADD)return;const t=mkNeeds(el).reduce((s,n)=>s+n.n,0);$('#qsel',el).textContent='Selected '+(TBL?TBL.sel.size:0)+(ADD?'':' / '+t);};
   const draw=reselect=>{if(!ADD)return;const nd=mkNeeds(el);const p=period(el);const list=PP.orderUnits(cands(el),nd);const host=$('#qtbl',el);host._tbl=null;
    TBL=C.table(host,{key:'plate',label:'Available units',minw:1000,rows:list,select:1,paged:false,keepScroll:1,after:h=>PP.fit(h,ADD?6:10),onSelect:upd,
     cols:PP.unitCols().map(c=>c.k==='plate'?Object.assign({},c,{w:150,render:v=>esc(v.plate)+(p.f&&p.t&&maint(v.plate,p.f,p.t)?'<div class="xs mut">Maintenance</div>':'')}):c),empty:{text:'No available units'}});
    if(reselect){PP.autoSelect(list,nd).forEach(pl=>TBL.sel.add(pl));TBL.render();}upd();};
   draw(true);
   ['#qo','#qc','#qk','#qn','#qf','#qt'].forEach(s=>{const e=$(s,el);if(e){e.onchange=()=>draw(true);if(e.tagName==='INPUT'&&e.type==='number')e.oninput=()=>draw(true);}});
   if(multi)rows.forEach((r,i)=>{const e=$('#qn'+i,el);e.onchange=()=>draw(true);e.oninput=()=>draw(true);});},
  buttons:[{label:'Cancel'},{label:ADD?'Add':'Request',kind:'primary',onClick(L,el){
   const p=period(el);const nd=mkNeeds(el);const total=nd.reduce((s,n)=>s+n.n,0);const reason=ADD?'':$('#qr',el).value.trim();let ok=true;
   if(!multi&&!ADD){ok=C.setErr($('#qn',el),nd[0].n>=1&&nd[0].n<=99?'':(nd[0].n>99?'Max 99':'Min 1'))&&ok;}
   ok=C.setErr($('#qf',el),p.f?'':'Required')&&ok;ok=C.setErr($('#qt',el),p.t&&p.t>=p.f?'':'Must be after From')&&ok;ok=(ADD||C.setErr($('#qr',el),reason?'':'Reason required'))&&ok;
   if(!ok)return false;
   const sel=ADD?[...TBL.sel]:[];const errs=[];
   if(!ADD&&total<1)errs.push('Enter a Number of at least 1');if(ADD&&!sel.length)errs.push('Select at least 1 unit');
   if(!ADD&&sel.length>total)errs.push('Selected '+sel.length+' units, Number is '+total);
   const all=STORE.get('allocations');const own0=$('#qo',el).value;
   sel.forEach(pl=>{const v=MD.vehicle(pl);
    if(!v||v.status!=='Active'){errs.push(pl+': not an Active Vehicle in Master Data');return;}
    if(src.indexOf(v.own==='vendor'?'Vendor':'Own')<0){errs.push(pl+': ownership is not allowed by the Fulfillment by Ownership');return;}
    if(!ownOk(own0,v.own==='own')){errs.push(pl+': ownership does not match the request');return;}
    if(biz&&v.bizline!==biz){errs.push(pl+': Business Line '+(v.bizline||'-')+' does not match the project ('+biz+')');return;}
    const hit=all.find(a=>a.kind==='unit'&&a.plate===pl&&a.status!=='Released'&&overlaps(a,p.f,p.t));
    if(hit)errs.push(pl+': '+(hit.project===code?'already allocated to this project':'allocated to '+pname(hit.project)));});
   if(errs.length){$('#qerr',el).innerHTML=banner('err','<b>Nothing saved</b><div class="sm">'+errs.map(esc).join('<br>')+'</div>');return false;}
   /* units go to the first request they match (capacity left), else the first request with capacity left */
   const got=nd.map(()=>0);sel.forEach(pl=>{const v=MD.vehicle(pl);let i=nd.findIndex((n,k)=>got[k]<n.n&&PP.matchNeed(v,n));if(i<0)i=nd.findIndex((n,k)=>got[k]<n.n);if(i>=0)got[i]++;});
   const names=[];sel.forEach(pl=>{const v=MD.vehicle(pl);all.push({id:nextAl(all),project:code,kind:'unit',plate:pl,source:v.own==='vendor'?'Vendor':(pr.ptype==='Dedicated'?'Dedicated':'Own'),vendor:v.own==='vendor'?(v.vendor||''):'',status:'Active',validFrom:p.f,validTo:p.t,role:'Default',reason});names.push(pl);});
   if(names.length)save(all);
   const rr=STORE.get('resourceRequests');const made=[];const to=unitTo(own0);
   nd.forEach((n,i)=>{const rest=n.n-got[i];if(!ADD&&rest>0){const id=nextRr(rr);rr.unshift({id,project:code,utype:UI.typeKey(n.cat,n.kar),qty:rest,from:p.f,to:p.t,reason,ownership:own0,status:'Open',to_:to[0],by:STORE.me().n,at:STORE.now(),updates:[]});made.push(id);}});
   if(made.length){STORE.set('resourceRequests',rr);STORE.notify({kind:'Action Required',to:to[1],title:'Resource request '+made.join(', '),link:'resource-requests.html?request='+made[0]});}
   STORE.audit({action:ADD?'Add Unit':'Request Unit',detail:(names.length?'Allocated '+names.join(', '):'')+(names.length&&made.length?'; ':'')+(made.length?'Requested '+made.join(', '):''),obj:code,type:'Allocation'});
   toast((names.length?UI.plural(names.length,'unit')+' allocated':'')+(names.length&&made.length?', ':'')+(made.length?'request '+made.join(', ')+' sent':''),made.length?{action:{label:'Open Resource Requests',fn:()=>{location.href='resource-requests.html?request='+made[0];}}}:undefined);
   body();}}]});}
function requestDriver(rows,add){const ADD=!!add;const pp=plan(),pr=proj();const multi=!!rows&&rows.length>1;
 const reqAll=PP.reqDrivers(pp);const f0=(rows&&rows[0])||(reqAll[0]&&Object.assign({},reqAll[0],{n:Math.max(1,reqAll[0].req-reqAll[0].alloc)}))||{lic:'-',cert:'-',n:1};
 const own=ADD&&mode()==='Mix'?['Mix']:driverOwn();const src=PP.srcOf(mode());
 const md=MD.get().dd.drivers.filter(d=>d.status==='Active');
 const lics=PP.LICENSES,certs=PP.CERTS;
 const pick=(x,l)=>x&&x!=='-'&&l.indexOf(x)>=0?x:'';
 const wanted=el=>({lic:$('#dl',el).value?[$('#dl',el).value]:[],cert:$('#dc',el).value?[$('#dc',el).value]:[]});
 const period=el=>({f:$('#qf',el).value,t:$('#qt',el).value});
 const cands=el=>{const p=period(el);if(!p.f||!p.t||p.t<p.f)return [];const o=$('#qo',el).value;return md.filter(d=>src.indexOf(d.own==='vendor'?'Vendor':'Own')>=0&&ownOk(o,d.own==='own')&&!driverUsedIn(d.id,p.f,p.t).length);};
 let TBL=null,ELD=null;const num=()=>ADD?Math.max(0,reqAll[0]?reqAll[0].req-reqAll[0].alloc:0):Math.max(0,parseInt($('#qn',ELD).value,10)||0);
 const form='<div class="ra-form">'+C.field('Ownership','<select class="select'+(own.length===1?' ra-lock':'')+'" id="qo"'+(own.length===1?' disabled':'')+'>'+C.opts(own.map(x=>[x,UI.own(x)]),own[0])+'</select>',{req:1,for:'qo'})+
  C.field('License','<select class="select" id="dl">'+C.opts(lics,pick(f0.lic,lics),'Any')+'</select>',{for:'dl'})+C.field('Certification','<select class="select" id="dc">'+C.opts(certs,pick(f0.cert,certs),'Any')+'</select>',{for:'dc'})+
  (ADD?'':C.field('Number','<input class="input" type="number" min="1" max="99" id="qn" value="'+Math.max(1,multi?rows.reduce((s,r)=>s+r.n,0):(f0.n||1))+'">',{req:1,for:'qn'}))+C.field('From','<input class="input" type="date" id="qf" value="'+today()+'" min="'+today()+'">',{req:1,for:'qf',cls:'s2'})+C.field('To','<input class="input" type="date" id="qt" value="'+projEnd()+'">',{req:1,for:'qt',cls:'s2'})+
  (ADD?'':C.field('Reason','<textarea class="textarea" rows="2" id="qr" autocomplete="off"></textarea>',{req:1,for:'qr',cls:'s3'}))+'</div>';
 DLG.open({cls:'ra-dlg',title:ADD?'Add Driver':'Request Driver',sub:esc(pp.id+' - '+PP.pname(pp)),width:ADD?1000:720,body:form+(ADD?'<div class="ra-bar"><span class="ra-count" id="qsel"></span></div>':'')+'<div id="qerr"></div>'+(ADD?'<div id="qtbl"></div>':''),
  onOpen(L,el){el.style.maxWidth='96vw';
   ELD=el;
   const upd=()=>{if(!ADD)return;$('#qsel',el).textContent='Selected '+(TBL?TBL.sel.size:0)+(ADD?'':' / '+num());};
   const draw=reselect=>{if(!ADD)return;const w=wanted(el);const list=cands(el).map(d=>Object.assign({},d,{_m:PP.hasAll(d.licenses,w.lic)&&PP.hasAll(d.certs,w.cert)?0:1})).sort((a,b)=>(a.own==='own'?0:1)-(b.own==='own'?0:1)||a._m-b._m||String(a.name).localeCompare(String(b.name)));const host=$('#qtbl',el);host._tbl=null;
    TBL=C.table(host,{key:'id',label:'Available drivers',minw:900,rows:list,select:1,paged:false,keepScroll:1,after:h=>PP.fit(h,ADD?6:10),onSelect:upd,cols:PP.driverCols({notes:false}),empty:{text:'No available drivers'}});
    if(reselect){PP.autoSelectDrivers(list,num(),w).forEach(i=>TBL.sel.add(i));TBL.render();}upd();};
   draw(true);
   ['#qo','#dl','#dc','#qn','#qf','#qt'].forEach(s=>{const e=$(s,el);if(!e)return;e.onchange=()=>draw(true);if(e.type==='number')e.oninput=()=>draw(true);});},
  buttons:[{label:'Cancel'},{label:ADD?'Add':'Request',kind:'primary',onClick(L,el){
   const p=period(el);const n=num();const reason=ADD?'':$('#qr',el).value.trim();let ok=ADD||C.setErr($('#qn',el),n>=1&&n<=99?'':(n>99?'Max 99':'Min 1'));
   ok=C.setErr($('#qf',el),p.f?'':'Required')&&ok;ok=C.setErr($('#qt',el),p.t&&p.t>=p.f?'':'Must be after From')&&ok;ok=(ADD||C.setErr($('#qr',el),reason?'':'Reason required'))&&ok;if(!ok)return false;
   const sel=ADD?[...TBL.sel]:[];const errs=[];const all=STORE.get('allocations');const own0=$('#qo',el).value;
   if(ADD&&!sel.length)errs.push('Select at least 1 driver');if(!ADD&&sel.length>n)errs.push('Selected '+sel.length+' drivers, Number is '+n);
   sel.forEach(id=>{const d=MD.driver(id);
    if(!d||d.status!=='Active'){errs.push(id+': not an Active driver in Master Data');return;}
    if(src.indexOf(d.own==='vendor'?'Vendor':'Own')<0||!ownOk(own0,d.own==='own')){errs.push(d.name+': ownership does not match the request');return;}
    const hit=all.find(a=>a.kind==='driver'&&a.driver===id&&a.status!=='Released'&&overlaps(a,p.f,p.t));
    if(hit)errs.push(d.name+': '+(hit.project===code?'already allocated to this project':'allocated to '+pname(hit.project)));});
   if(errs.length){$('#qerr',el).innerHTML=banner('err','<b>Nothing saved</b><div class="sm">'+errs.map(esc).join('<br>')+'</div>');return false;}
   const names=[];sel.forEach(id=>{const d=MD.driver(id);all.push({id:nextAl(all),project:code,kind:'driver',driver:id,source:d.own==='vendor'?'Vendor':'Own',status:'Active',validFrom:p.f,validTo:p.t,role:'Default',reason});names.push(d.name);});
   if(names.length)save(all);
   const w0=wanted(el);if(w0.lic[0]||w0.cert[0]){const pl=STORE.get('projectPlans');const cp=pl.find(x=>x.id===pp.id);if(cp){cp.driverSpec={lic:w0.lic[0]||'',cert:w0.cert[0]||''};STORE.set('projectPlans',pl);}}
   const rest=n-sel.length;const made=[];const to=own0==='In House'?['Driver Management',['dm']]:own0==='Outsource'?['Supply Management',['supply']]:['Supply Management',['supply','dm']];
   if(!ADD&&rest>0){const rr=STORE.get('resourceRequests');const id=nextRr(rr);const w=wanted(el);rr.unshift({id,project:code,utype:'Driver',qty:rest,from:p.f,to:p.t,reason,ownership:own0,license:w.lic[0]||'',cert:w.cert[0]||'',status:'Open',to_:to[0],by:STORE.me().n,at:STORE.now(),updates:[]});STORE.set('resourceRequests',rr);made.push(id);STORE.notify({kind:'Action Required',to:to[1],title:'Resource request '+id,link:'resource-requests.html?request='+id});}
   STORE.audit({action:ADD?'Add Driver':'Request Driver',detail:(names.length?'Allocated '+names.join(', '):'')+(names.length&&made.length?'; ':'')+(made.length?'Requested '+made.join(', '):''),obj:code,type:'Allocation'});
   toast((names.length?UI.plural(names.length,'driver')+' allocated':'')+(names.length&&made.length?', ':'')+(made.length?'request '+made.join(', ')+' sent':''),made.length?{action:{label:'Open Resource Requests',fn:()=>{location.href='resource-requests.html?request='+made[0];}}}:undefined);
   body();}}]});}
($('#hist')||{}).onclick=()=>PANELS.history({obj:code||'Allocation',title:code?'Allocation '+code:'Resource Allocation',types:['Allocation']});
STORE.subscribe('allocations',(e,s)=>{if(s==='remote')body();});STORE.subscribe('resourceRequests',(e,s)=>{if(s==='remote')body();});STORE.subscribe('projectPlans',(e,s)=>{if(s==='remote')body();});
init();
})();
