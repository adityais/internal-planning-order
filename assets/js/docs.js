/* C11 Documents: real PDF (pdf.js) and Excel (SheetJS) built from store data, versioning with Superseded,
   distribution log (recorded manually, TMS sends nothing in Phase 1), correction upload, ZIP per batch. */
(function(){
'use strict';
const {ic,esc,tag}=UI;const {$,$$,DLG,toast}=C;
/* ---------- tiny ZIP writer (stored, no compression) ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
async function zip(files){const enc=new TextEncoder();const parts=[],central=[];let off=0;
 for(const f of files){const data=new Uint8Array(await f.blob.arrayBuffer());const name=enc.encode(f.name);const crc=crc32(data);
  const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint32(14,crc,true);lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);lh.setUint16(26,name.length,true);
  parts.push(new Uint8Array(lh.buffer),name,data);
  const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint32(16,crc,true);ch.setUint32(20,data.length,true);ch.setUint32(24,data.length,true);ch.setUint16(28,name.length,true);ch.setUint32(42,off,true);
  central.push(new Uint8Array(ch.buffer),name);off+=30+name.length+data.length;}
 const csize=central.reduce((a,b)=>a+b.length,0);const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,csize,true);end.setUint32(16,off,true);
 return new Blob(parts.concat(central,[new Uint8Array(end.buffer)]),{type:'application/zip'});}
/* ---------- content builders ---------- */
function planOf(d){return STORE.byId('milkrunPlans',d.planId)||STORE.get('milkrunPlans').find(p=>p.key===d.scope);}
function drvName(id){const d=MD.driver(id);return d?d.name:'-';}
function content(d){const gen=UI.fdt(d.generatedAt||STORE.now());const base={title:d.type,version:'v'+d.version,status:d.status,superseded:d.status==='Superseded',generated:gen};
 if(['PUTS','Controller Check Sheet','Truck Information','Driver Check Sheet'].indexOf(d.type)>=0&&d.scope!=='daily'){
  const plan=planOf(d);const sch=plan&&DOM.planSchedule(plan,'wd');if(!sch)return Object.assign(base,{sub:d.scope,sections:[{text:'Plan data not available'}]});
  const routes=d.route==='All routes'?sch.routes:sch.routes.filter(r=>r.id===d.route);
  /* D81: plan documents show slots (Unit A, Driver A); Route Group shows Category and Karoseri separately */
  const vh=id=>((sch.routesIn||[]).find(x=>x.id===id)||{}).vehicle||{};const rt=r=>r.id+' '+r.name+' | Category '+(vh(r.id).chassis||'-')+' | Karoseri '+(vh(r.id).body||'-');
  const meta=[['Plan',plan.key],['Project',sch.project.name],['Period',UI.fdate(plan.period[0])+' - '+UI.fdate(plan.period[1])],['Day group','Mon - Thu']].concat(d.route==='All routes'?[]:[['Category',vh(d.route).chassis||'-'],['Karoseri',vh(d.route).body||'-']]);
  const fn=d.type.replace(/ /g,'')+'-'+(d.route==='All routes'?'ALL':d.route)+'-'+sch.project.code+'-'+plan.period[0].slice(0,7)+'-v'+d.version;
  if(d.type==='PUTS'){const r=routes[0];const rows=(plan.matrix||[]).filter(m=>m.route===r.id);
   return Object.assign(base,{fn,title:'Pick Up Time Schedule',sub:r.id+' '+r.name,meta,sections:[
    {title:'Suppliers',head:['Supplier','Vendor site','Dock','Part category','Vol/day (m3)','Cycles'],widths:[3,1.2,1,1.4,1,0.8],rows:rows.map(m=>[m.supplier,m.site||'-',m.dock||'-',m.partCat||'-',UI.num(m.volDay,1),r.cycles.length])},
    {title:'Schedule',head:['Cycle','Out Pool'].concat(r.cycles[0].stops.map(s=>s.loc.replace(/^PT /,'').slice(0,18)+' IN/OUT'),['In Pool','Unit']),rows:r.cycles.map(c=>['Cycle '+c.cycle,UI.hm(c.out)].concat(c.stops.map(s=>UI.hm(s.in)+' / '+UI.hm(s.out)),[UI.hm(c.inPool),c.slotUnit||'-']))}]});}
  if(d.type==='Controller Check Sheet'){const sec=[];routes.forEach(r=>sec.push({title:rt(r),head:['Cycle','Unit','Driver','Out Pool Plan','Act'].concat(r.cycles[0].stops.map((s,i)=>'Stop '+(i+1)+' Plan'),['Act','In Pool Plan','Act']),rows:r.cycles.map(c=>['Cycle '+c.cycle,c.slotUnit||'-',c.slotDriver||'-',UI.hm(c.out),''].concat(c.stops.map(s=>UI.hm(s.in)),['',UI.hm(c.inPool),'']))}));
   sec.unshift({title:'Summary vs previous period',head:['Item','This period','Previous','+/-'],rows:[['Cycles',sch.stats.cycles,sch.stats.cycles-2,'+2'],['Units',sch.stats.units,sch.stats.units-1,'+1'],['Driver slots',sch.stats.drivers,sch.stats.drivers-2,'+2']]});
   return Object.assign(base,{fn,meta,sub:'Plan / Act per stop',sections:sec});}
  if(d.type==='Truck Information'){const r=routes[0];const units={};r.cycles.forEach(c=>{(units[c.slotUnit]=units[c.slotUnit]||[]).push(c);});
   return Object.assign(base,{fn,sub:r.id+' '+r.name,meta,sections:[{head:['Unit slot','Category','Karoseri','Cycles','First Out Pool','Last In Pool','Driver slots'],rows:Object.keys(units).sort((a,b)=>a.length-b.length||a.localeCompare(b)).map(u=>{const cs=units[u];return [u,vh(r.id).chassis||'',vh(r.id).body||'',cs.map(c=>c.cycle).join(', '),UI.hm(cs[0].out),UI.hm(cs[cs.length-1].inPool),[...new Set(cs.map(c=>c.slotDriver))].join(', ')];})}]});}
  if(d.type==='Driver Check Sheet'){const sec=routes.map(r=>({title:rt(r),head:['Cycle','Driver slot','Unit slot','Report','Out Pool','In Pool','Handover','Signature'],rows:r.cycles.map(c=>['Cycle '+c.cycle,c.slotDriver||'-',c.slotUnit||'-',UI.hm(c.out-60),UI.hm(c.out),UI.hm(c.inPool),c.handover?'Yes':'',''])}));
   return Object.assign(base,{fn,meta,sub:'Monthly, per route x cycle x driver slot',sections:sec});}}
 if(d.type==='Driver Check Sheet'&&d.scope==='daily'){const t=STORE.byId('trips',d.tripId);if(!t)return Object.assign(base,{sections:[{text:'Trip not found'}]});
  const pl=STORE.get('milkrunPlans').find(p=>p.id===t.planId);const sch=pl&&DOM.planSchedule(pl,t.dg);const c=sch&&sch.cycles.find(x=>x.route===t.route&&x.cycle===t.cycle);
  return Object.assign(base,{fn:'DCS-'+t.id+'-v'+d.version,title:'Driver Check Sheet',sub:t.routeName+' cycle '+t.cycle+', '+UI.fdate(t.date,{dow:1}),meta:[['Trip',t.id],['Driver',drvName(t.driver)],['Unit',t.unit||'-'],['Report',UI.hm(t.out-60)]],
   sections:[{title:'Stops',head:['Stop','Planned IN','Planned OUT','Actual IN','Actual OUT','Remark'],rows:(c?c.stops:[]).map(s=>[s.loc,UI.hm(s.in),UI.hm(s.out),'','',''])},{title:'Checks',head:['Item','OK','NOK','Note'],rows:[['Tenko','','',''],['P2H Out','','',''],['Documents (STNK, KIR, SIM)','','',''],['E-toll balance','','','']]}],sign:['Driver','Field Ops','Customer']});}
 if(d.type==='Daily Dispatch Plan'){const ts=STORE.get('trips').filter(t=>t.type==='DT'&&t.date===d.date&&t.status!=='Cancelled');
  return Object.assign(base,{fn:'DDP-'+d.date.replace(/-/g,'')+'-v'+d.version,title:'Daily Dispatch Plan',sub:UI.fdate(d.date,{dow:1})+', Pool Cibitung',meta:[['Date',UI.fdate(d.date)],['Trips',String(ts.length)],['Own Asset / Dedicated',String(ts.filter(t=>!t.vendor).length)],['Vendor',String(ts.filter(t=>t.vendor).length)]],
   sections:[{head:['Trip','Orders','Customer','Route','Departure','Unit','Driver','Vendor'],widths:[1.3,1.6,1.4,2.4,0.8,1,1.3,1.4],rows:ts.sort((a,b)=>a.out-b.out).map(t=>{const o=STORE.byId('orders',t.orders[0]);return [t.id,t.orders.join(', '),o?o.customer.replace(/^PT /,''):'',(t.stops||[]).map(s=>s.loc.split(' ').slice(0,2).join(' ')).join(' > '),UI.hm(t.out),t.unit||'-',t.vendor?t.vendorDriver:drvName(t.driver),t.vendor||''];})}]});}
 if(d.type==='SPPB'||d.type==='SPK'){const t=STORE.byId('trips',d.tripId)||{};const o=STORE.byId('orders',(t.orders||[])[0])||{};
  return Object.assign(base,{fn:d.type+'-'+(t.id||'')+'-v'+d.version,title:d.type==='SPPB'?'Surat Perintah Pengambilan Barang':'Surat Perintah Kerja',sub:t.vendor||'',meta:[['Trip',t.id||'-'],['Vendor',t.vendor||'-'],['Plate',t.unit||'-'],['Driver',t.vendorDriver||'-']],
   sections:[{head:['Order','Customer','Pickup','Drop','Load','Vendor Rate'],rows:(t.orders||[]).map(id=>{const x=STORE.byId('orders',id)||{};return [id,x.customer||'',x.origin?x.origin.loc:'',(x.drops||[]).map(d=>d.loc).join(', '),UI.num(x.m3,1)+' m3',STORE.me().noAmounts?'Set':UI.rp(t.vendorRate||0)];})}],sign:['MODA Planner','Vendor']});}
 return Object.assign(base,{sections:[{text:d.type}]});}
function filename(d,ext){const c=content(d);return (c.fn||(d.type.replace(/ /g,'')+'-'+(d.route||d.scope)+'-v'+d.version))+(d.status==='Superseded'?'-SUPERSEDED':'')+'.'+ext;}
function pdfBlob(d){return PDF.doc(Object.assign({footer:'MODA TMS'},content(d)));}
function excel(d){const c=content(d);const sheets=(c.sections||[]).filter(s=>s.head).map((s,i)=>({name:(s.title||'Sheet'+(i+1)).slice(0,28),aoa:[s.head].concat(s.rows)}));
 if(c.meta)sheets.unshift({name:'Info',aoa:[['Document',c.title],['Version',c.version],['Status',d.status]].concat(c.meta)});IO.writeBook(sheets,filename(d,'xlsx'));toast('Downloading '+filename(d,'xlsx'));log(d,'Downloaded Excel');}
function downloadPdf(d){const n=filename(d,'pdf');IO.download(pdfBlob(d),n);toast('Downloading '+n);log(d,'Downloaded PDF');}
function log(d,a){STORE.audit({action:a+' '+d.type+(d.route&&d.route!=='All routes'?' '+d.route:'')+' v'+d.version,obj:d.scope==='daily'?d.tripId:d.scope,type:'Documents'});}
function preview(d){const url=URL.createObjectURL(pdfBlob(d));DLG.open({title:d.type+(d.route?' '+d.route:''),sub:'v'+d.version+' &middot; '+d.status,width:900,body:'<iframe class="pdfframe" title="Preview" src="'+url+'"></iframe>',onClose:()=>URL.revokeObjectURL(url),buttons:[{label:'Close'},{label:'PDF',kind:'primary',icon:'download',onClick:()=>{downloadPdf(d);return false;}}]});}
function logDialog(d,onDone){const recips=['PT Akashi Wahana Indonesia','PT Yutaka Manufacturing Indonesia','PT Astra Daihatsu Motor','CCR Pool Cibitung','Field Ops Pool Cibitung'];
 const body=C.field('Document','<div class="input">'+esc(d.type+' '+(d.route||'')+' v'+d.version)+'</div>')+C.field('Recipient','<input class="input" id="lgR" list="lgRL" value="'+esc(recips[0])+'"><datalist id="lgRL">'+recips.map(r=>'<option value="'+esc(r)+'">').join('')+'</datalist>',{req:1,for:'lgR'})+
  '<div class="grid2">'+C.field('Channel','<select class="select" id="lgC">'+C.opts(['WhatsApp','Email','Printed','Phone'],'WhatsApp')+'</select>')+C.field('Sent at','<input class="input" id="lgT" data-hm value="'+UI.ftime(STORE.now())+'">',{req:1,for:'lgT'})+'</div>'+
  '<div class="field"><label>Status</label><div class="seg" role="radiogroup">'+['Sent','Confirmed','Revision requested'].map((s,i)=>'<button type="button" class="'+(i===0?'on':'')+'" data-ls="'+s+'">'+s+'</button>').join('')+'</div></div>';
 DLG.open({title:'Log distribution',width:440,body,onOpen(L){$$('[data-ls]',L.el).forEach(b=>b.onclick=()=>$$('[data-ls]',L.el).forEach(x=>x.classList.toggle('on',x===b)));},
  buttons:[{label:'Cancel'},{label:'Save',kind:'primary',onClick(L,el){const r=$('#lgR',el).value.trim(),t=UI.parseHM($('#lgT',el).value);let ok=C.setErr($('#lgR',el),r?'':'Required');ok=C.setErr($('#lgT',el),t!=null?'':'Use HH:MM')&&ok;if(!ok)return false;
   const st=$('[data-ls].on',el).dataset.ls;const all=STORE.get('documents');const x=all.find(y=>y.id===d.id);x.dist=x.dist||[];x.dist.push({to:r,channel:$('#lgC',el).value,at:STORE.ts(STORE.today(),t),status:st,by:STORE.me().n});STORE.set('documents',all);
   log(d,'Logged '+st+' to '+r);if(st==='Revision requested')STORE.notify({kind:'Action Required',to:['planner','plannerlead'],title:'Revision requested: '+d.type+' '+(d.route||''),link:'milkrun-list.html'});toast('Distribution logged');if(onDone)onDone();}}]});}
function correction(d,onDone){DLG.open({title:'Upload correction',sub:esc(d.type+' '+(d.route||'')+' v'+d.version),width:460,body:'<label class="drop" tabindex="0">'+ic('upload')+'<b>Drop Excel or browse</b><span class="sm mut">.xlsx</span><input type="file" id="cf" accept=".xlsx" hidden></label><div id="cfn" class="sm mut"></div>',
  onOpen(L){$('#cf',L.el).onchange=e=>{const f=e.target.files[0];$('#cfn',L.el).textContent=f?f.name:'';};$('.drop',L.el).onkeydown=e=>{if(e.key==='Enter')$('#cf',L.el).click();};},
  buttons:[{label:'Cancel'},{label:'Upload',kind:'primary',onClick(L,el){const f=$('#cf',el).files[0];if(!f){toast('Choose a file',{tone:'warn'});return false;}
   const all=STORE.get('documents');const x=all.find(y=>y.id===d.id);x.status='Corrected';x.correction={file:f.name,at:STORE.now(),by:STORE.me().n};STORE.set('documents',all);log(d,'Uploaded correction '+f.name+' for');toast('Correction saved');if(onDone)onDone();}}]});}
/* regenerate: previous versions of matching docs become Superseded, new rows generated */
function regenerate(match,make){const all=STORE.get('documents');let v=0;all.forEach(d=>{if(match(d)){v=Math.max(v,d.version);if(d.status!=='Superseded')d.status='Superseded';}});
 const rows=make(v+1);rows.forEach(r=>all.push(Object.assign({id:'DOC-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),status:'Generated',dist:[],generatedAt:STORE.now(),version:v+1},r)));STORE.set('documents',all);return rows;}
/* ---------- panel ---------- */
function distTag(dist){const l=(dist||[]).slice(-1)[0];if(!l)return tag('Not logged','dash');return ({Confirmed:tag('Confirmed','green','check'),Sent:tag('Sent','navy','send'),'Revision requested':tag('Revision requested','amber','alert')})[l.status]+'<span class="u-margin-left-8 sm mut">'+esc(l.to.replace(/^PT /,'').slice(0,22))+', '+UI.ftime(l.at)+'</span>';}
function panel(host,o){let open=false;
 function render(){const docs=STORE.get('documents').filter(o.filter);const cur=docs.filter(d=>d.status!=='Superseded'),prev=docs.filter(d=>d.status==='Superseded');const canEdit=STORE.can('plan')||STORE.persona()==='ccr';
  const types=[...new Set(cur.map(d=>d.type))];
  let h='<div class="panel"><div class="panel-hd"><h3>Documents</h3>'+(o.tag?tag(esc(o.tag),'slate'):'')+'<span class="sp"></span>'+(cur.length?'<button type="button" class="btn sm" data-zip>'+ic('archive')+'ZIP</button>':'')+'</div>';
  /* r2-3: no system narration banner; distribution stays a manual log */
  if(!cur.length){h+='<div class="empty"><b>No documents yet</b>'+(o.emptyText?'<span class="sm mut">'+esc(o.emptyText)+'</span>':'')+'</div></div>';host.innerHTML=h;return;}
  h+='<div class="tbl-scroll"><table class="u-min-width-880"><thead><tr><th scope="col">Document</th><th scope="col">Version</th><th scope="col">Status</th><th scope="col" title="Logged by hand">Distribution</th><th scope="col" class="act">Actions</th></tr></thead><tbody>';
  const xl=t=>t==='PUTS'||t==='Controller Check Sheet'||t==='Daily Dispatch Plan';
  types.forEach(t=>{const list=cur.filter(d=>d.type===t);h+='<tr><td colspan="5" class="grprow">'+esc(t)+(list.length>1&&list[0].route&&list[0].route!=='All routes'?' <span class="mut fw5">by route</span>':'')+'</td></tr>';
   list.forEach(d=>{h+='<tr><td class="u-padding-left-s6"><b>'+esc(d.routeName?d.route+' '+d.routeName:d.route||'')+'</b>'+(d.reprint?' '+tag('Reprint','amber','alert'):'')+'</td><td class="tnum">v'+d.version+'</td><td>'+UI.ps(d.status)+'</td><td>'+distTag(d.dist)+'</td>'+
    '<td class="act"><div class="u-justify-content-flex-end-gap-4 row"><button type="button" class="btn sm ghost" data-pv="'+d.id+'" aria-label="Preview" title="Preview">'+ic('eye')+'</button><button type="button" class="btn sm" data-pdf="'+d.id+'">'+ic('download')+'PDF</button>'+(xl(d.type)?'<button type="button" class="btn sm" data-xl="'+d.id+'">'+ic('sheet')+'Excel</button>':'')+
    (canEdit&&xl(d.type)?'<button type="button" class="btn sm ghost" data-cor="'+d.id+'" aria-label="Upload correction" title="Upload correction">'+ic('pencil')+'</button>':'')+(canEdit?'<button type="button" class="btn sm ghost" data-log="'+d.id+'" aria-label="Log distribution" title="Log distribution">'+ic('send')+'</button>':'')+'</div></td></tr>';});});
  h+='</tbody></table></div>';
  if(prev.length){h+='<div class="prevv"><button type="button" class="row lnkrow" data-prev aria-expanded="'+open+'"><span class="mut">'+ic(open?'down':'right')+'</span><b>Previous versions</b>'+tag(UI.plural(prev.length,'file'),'slate','ban')+'</button>';
   if(open)h+='<table class="mt2"><tbody>'+prev.map(d=>'<tr><td class="u-padding-left-s5"><span class="strike">'+esc(d.type+' '+(d.routeName?d.route+' '+d.routeName:d.route||''))+'</span></td><td class="tnum">v'+d.version+'</td><td>'+UI.ps('Superseded')+'</td><td class="act"><button type="button" class="btn sm" data-pdf="'+d.id+'">'+ic('download')+'PDF</button></td></tr>').join('')+'</tbody></table>';h+='</div>';}
  host.innerHTML=h+'</div>';
  const get=id=>STORE.byId('documents',id);
  $$('[data-pv]',host).forEach(b=>b.onclick=()=>preview(get(b.dataset.pv)));$$('[data-pdf]',host).forEach(b=>b.onclick=()=>downloadPdf(get(b.dataset.pdf)));$$('[data-xl]',host).forEach(b=>b.onclick=()=>excel(get(b.dataset.xl)));
  $$('[data-log]',host).forEach(b=>b.onclick=()=>logDialog(get(b.dataset.log),render));$$('[data-cor]',host).forEach(b=>b.onclick=()=>correction(get(b.dataset.cor),render));
  const pv=$('[data-prev]',host);if(pv)pv.onclick=()=>{open=!open;render();};
  const z=$('[data-zip]',host);if(z)z.onclick=async()=>{const files=cur.map(d=>({name:filename(d,'pdf'),blob:pdfBlob(d)}));const n=(o.zipName||'Documents')+'_'+UI.stamp(STORE.now())+'.zip';IO.download(await zip(files),n);toast('Downloading '+n);STORE.audit({action:'Downloaded ZIP',detail:files.length+' files',obj:o.zipName||'',type:'Documents'});};}
 render();const un=STORE.subscribe('documents',render);o.render=render;return o;}
window.DOCS={panel,content,pdfBlob,downloadPdf,excel,preview,logDialog,regenerate,zip,filename};
})();
