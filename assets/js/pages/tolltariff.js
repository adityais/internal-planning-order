/* Toll Tariff (owner Planner): Toll Tariff (gate pair x Golongan x effective date),
   filters incl. "in force on", effective-dates drawer (new date adds a row), add / edit, import with error rows, export.
   Every UJ toll lookup in the prototype (DOM.tariff) reads this table. */
(function(){
const {ic,esc,tag}=UI;const {$,$$,DLG,toast,banner}=C;
if(!SHELL.mount({module:'planning',id:'tariff',active:'tariff',title:'Planning Config',crumb:'',actions:'<button type="button" class="btn" id="hist">'+ic('history')+'History</button><button type="button" class="btn" id="exp">'+ic('download')+'Export</button>'+(STORE.can('tariff')?'<button type="button" class="btn" id="imp">'+ic('upload')+'Import</button><button type="button" class="btn" id="scr">'+ic('external')+'Scrape</button><button type="button" class="btn primary" id="add">'+ic('plus')+'Add</button>':'')}))return;
const can=STORE.can('tariff');const GOL=['Gol I','Gol II','Gol III','Gol IV','Gol V'];
let tab=UI.q('tab','tariff');const F={entry:'',exit:'',gol:'',on:UI.addDays(STORE.today(),1)};
const rows=()=>STORE.get('tollTariff');const gates=()=>STORE.get('tollGates');const gateNames=()=>{const n=[];gates().forEach(g=>n.push(g.name));rows().forEach(r=>{n.push(r.entry);n.push(r.exit);});return n.filter((x,i)=>x&&n.indexOf(x)===i).sort();};
function state(r){if(r.status==='Inactive')return 'Inactive';if(r.eff>F.on)return 'Scheduled';const cur=DOM.tariff(r.entry,r.exit,r.gol,F.on);return cur&&cur.id===r.id?'Active':'Inactive';}
function stChip(s){return s==='Active'?tag('Active','green','check'):s==='Scheduled'?tag('Scheduled','navy','calendar'):tag('Inactive','slate','ban');}
function render(){$('#content').innerHTML=SHELL.cfgTabs('tariff')+'<div id="tb" class="mt4"></div>';tariffTab($('#tb'));}
function tariffTab(B){
 B.innerHTML='<div class="panel" id="tbl"></div>';
 const T=C.table($('#tbl'),{key:'id',minw:1100,label:'Toll tariff',rows:()=>rows().slice().sort((a,b)=>(state(a)==='Active'?0:1)-(state(b)==='Active'?0:1)||a.entry.localeCompare(b.entry)||a.gol.localeCompare(b.gol)),
  cols:[{k:'status',h:'Status',cls:'stc',text:state,render:r=>stChip(state(r))},{k:'entry',h:'Entry gate',render:r=>'<b>'+esc(r.entry)+'</b>'},{k:'exit',h:'Exit gate'},{k:'gol',h:'Golongan',render:r=>tag(r.gol,'slate')},{k:'tariff',h:'Tariff',cls:'num',sortv:r=>r.tariff,text:r=>UI.num(r.tariff)},
   {k:'eff',h:'Effective',sortv:r=>r.eff,text:r=>UI.fdate(r.eff)},{k:'source',h:'Source',text:r=>r.source||'BPJT',render:r=>r.source==='Manual'?tag('Manual','amber','pencil'):esc(r.source||'BPJT')},{k:'ref',h:'Reference',text:r=>r.ref||''},
   {k:'upd',h:'Last Updated',w:175,sortv:r=>r.at||0,text:r=>r.at?UI.fdt(r.at):''}],
  actions:{view:r=>viewRow(r),edit:r=>edit(r),del:r=>del(r),can:(k,r)=>k==='view'||can,name:r=>r.entry+' to '+r.exit+', '+r.gol},empty:{text:'No tariff rows',action:can?'Add':null,fn:()=>edit(null)}});
 window._TT=T;}
function nextId(){return 'TT-'+String(Math.max(0,...rows().map(r=>+r.id.split('-')[1]||0))+1).padStart(3,'0');}
function edit(r,pre){const isNew=!r;r=r||Object.assign({entry:'',exit:'',gol:'Gol II',tariff:'',eff:UI.addDays(STORE.today(),1),source:'BPJT',ref:''},pre||{});const gn=gateNames();
 DLG.open({title:isNew?'Add toll tariff':'Edit toll tariff',sub:isNew?'':esc(r.entry+' to '+r.exit+', '+r.gol),width:520,body:'<div class="grid2">'+C.field('Entry gate','<input class="input" id="te" list="gl" autocomplete="off" value="'+esc(r.entry)+'"'+(isNew?'':' disabled')+'><datalist id="gl">'+gn.map(g=>'<option value="'+esc(g)+'">').join('')+'</datalist>',{req:1,for:'te'})+C.field('Exit gate','<input class="input" id="tx" list="gl" autocomplete="off" value="'+esc(r.exit)+'"'+(isNew?'':' disabled')+'>',{req:1,for:'tx'})+
  C.field('Golongan','<select class="select" id="tg"'+(isNew?'':' disabled')+'>'+C.opts(GOL,r.gol)+'</select>',{req:1})+C.field('Tariff','<div class="inputwrap"><span class="pre">Rp</span><input class="input rp" id="tt" data-rp value="'+(r.tariff?UI.num(r.tariff):'')+'"></div>',{req:1,for:'tt'})+
  C.field('Effective date','<input class="input" type="date" id="tf" value="'+r.eff+'"'+(isNew?'':' disabled')+'>',{req:1,for:'tf'})+C.field('Source','<select class="select" id="ts">'+C.opts(['BPJT','Jasa Marga','Manual'].concat(r.source&&['BPJT','Jasa Marga','Manual'].indexOf(r.source)<0?[r.source]:[]),r.source||'BPJT')+'</select>')+C.field('Reference','<input class="input" id="tr" value="'+esc(r.ref||'')+'">',{style:'grid-column:1/-1'})+'</div>',
  buttons:[{label:'Cancel'},{label:'Save',kind:'primary',onClick(L,el){const v={entry:$('#te',el).value.trim(),exit:$('#tx',el).value.trim(),gol:$('#tg',el).value,tariff:UI.parseRp($('#tt',el).value),eff:$('#tf',el).value,source:$('#ts',el).value,ref:$('#tr',el).value.trim()};
   let ok=C.setErr($('#te',el),v.entry?'':'Required');ok=C.setErr($('#tx',el),!v.exit?'Required':v.exit===v.entry?'Entry and exit must differ':'')&&ok;ok=C.setErr($('#tt',el),v.tariff>0?'':'Required')&&ok;ok=C.setErr($('#tf',el),v.eff?'':'Required')&&ok;
   if(!ok)return false;
   const all=rows();if(isNew){const c=upsert([v],'');toast(c.added?'Tariff added':c.updated?'Updated':'No changes');}
   else{const x=all.find(y=>y.id===r.id);const before=UI.rp(x.tariff);Object.assign(x,{tariff:v.tariff,source:v.source,ref:v.ref,by:STORE.me().n,at:STORE.now()});STORE.set('tollTariff',all);STORE.audit({action:'Edited toll tariff '+x.entry+' to '+x.exit+', '+x.gol,before,after:UI.rp(v.tariff),obj:'Toll Tariff',type:'Tariff'});toast('Tariff saved');}render();}}]});}
/* View = read-only details (incl. the effective dates of the pair), Delete = remove the row after a confirm */
function viewRow(r){const list=rows().filter(x=>x.entry===r.entry&&x.exit===r.exit&&x.gol===r.gol).sort((a,b)=>b.eff.localeCompare(a.eff));
 DLG.open({title:'Toll tariff',sub:esc(r.entry+' to '+r.exit+', '+r.gol),width:520,body:'<dl class="kv2"><dt>Entry gate</dt><dd>'+esc(r.entry)+'</dd><dt>Exit gate</dt><dd>'+esc(r.exit)+'</dd><dt>Golongan</dt><dd>'+esc(r.gol)+'</dd><dt>Tariff</dt><dd>'+UI.rp(r.tariff)+'</dd><dt>Effective</dt><dd>'+UI.fdate(r.eff)+'</dd><dt>Source</dt><dd>'+esc(r.source||'BPJT')+'</dd><dt>Reference</dt><dd>'+esc(r.ref||'-')+'</dd><dt>Last Updated</dt><dd>'+(r.at?UI.fdt(r.at):'-')+'</dd><dt>Updated by</dt><dd>'+esc(r.by||'-')+'</dd></dl>'+
  (list.length>1?'<div class="sect mt3 mb2">Effective dates</div>'+list.map(x=>'<div class="row gap3"><b>'+UI.fdate(x.eff)+'</b><span class="tnum">'+UI.rp(x.tariff)+'</span></div>').join(''):''),buttons:[{label:'Close',kind:'primary'}]});}
function del(r){DLG.confirm({title:'Delete toll tariff?',sub:esc(r.entry+' to '+r.exit+', '+r.gol),ok:'Delete',danger:true,body:UI.rp(r.tariff)+', effective '+UI.fdate(r.eff)}).then(v=>{if(!v)return;STORE.set('tollTariff',rows().filter(x=>x.id!==r.id));STORE.audit({action:'Deleted toll tariff '+r.entry+' to '+r.exit+', '+r.gol,detail:UI.rp(r.tariff)+' from '+UI.fdate(r.eff),obj:'Toll Tariff',type:'Tariff'});toast('Tariff deleted');render();});}function effDates(r){const list=()=>rows().filter(x=>x.entry===r.entry&&x.exit===r.exit&&x.gol===r.gol).sort((a,b)=>b.eff.localeCompare(a.eff));const cur=DOM.tariff(r.entry,r.exit,r.gol,F.on);
 const L=DLG.drawer({title:'Effective dates',sub:esc(r.entry+' to '+r.exit+', '+r.gol),width:480,body:(cur?'<div class="mt3">'+tag('In force on '+UI.fdate(F.on,{noYear:1})+': '+UI.rp(cur.tariff),'green','check')+'</div>':'<div class="mt3">'+tag('No tariff in force on '+UI.fdate(F.on,{noYear:1}),'amber','alert')+'</div>')+list().map(x=>'<div class="u-padding-s3-0-border-bottom-1-solid-line2 row gap3"><b class="u-width-110">'+UI.fdate(x.eff)+'</b><b class="u-width-110 tnum">'+UI.rp(x.tariff)+'</b><span class="u-flex-1 mut sm">'+esc((x.source||'BPJT')+(x.ref?', '+x.ref:''))+'</span>'+stChip(state(x))+'</div>').join('')+'',
  buttons:can?[{label:'New effective date',kind:'primary',icon:'plus',onClick(){setTimeout(()=>edit(null,{entry:r.entry,exit:r.exit,gol:r.gol,tariff:r.tariff}),50);}}]:[{label:'Close',kind:'primary'}]});}
/* ONE upsert rule for Add, bulk Upload and Scrape: key = Entry gate + Exit gate + Golongan. A key that exists is never duplicated: a different amount updates the row (Last Updated = now), an identical row is left untouched; a new key is added (Last Updated = now). Within one file the last occurrence wins. */
function upsert(list,src){const all=rows();const cnt={added:0,updated:0,unchanged:0};const today=STORE.today();const nid=()=>'TT-'+String(Math.max(0,...all.map(x=>+String(x.id).split('-')[1]||0))+1).padStart(3,'0');
 list.forEach(v=>{const same=all.filter(x=>x.entry===v.entry&&x.exit===v.exit&&x.gol===v.gol);const cur=same.filter(x=>x.status!=='Inactive'&&x.eff<=today).sort((a,b)=>b.eff.localeCompare(a.eff))[0]||same.sort((a,b)=>b.eff.localeCompare(a.eff))[0];
  if(!cur){all.push({id:nid(),entry:v.entry,exit:v.exit,gol:v.gol,tariff:v.tariff,eff:v.eff||today,source:v.source||src||'BPJT',ref:v.ref||'',status:'Active',by:STORE.me().n,at:STORE.now()});cnt.added++;STORE.audit({action:'Added toll tariff '+v.entry+' to '+v.exit+', '+v.gol,detail:UI.rp(v.tariff)+(src?' from '+src:''),obj:'Toll Tariff',type:'Tariff'});return;}
  if(cur.tariff===v.tariff){cnt.unchanged++;return;}
  const before=UI.rp(cur.tariff);Object.assign(cur,{tariff:v.tariff,eff:v.eff||cur.eff,source:v.source||src||cur.source,ref:v.ref!=null&&v.ref!==''?v.ref:cur.ref,by:STORE.me().n,at:STORE.now()});cnt.updated++;STORE.audit({action:'Updated toll tariff '+cur.entry+' to '+cur.exit+', '+cur.gol,before,after:UI.rp(v.tariff),detail:src?'from '+src:'',obj:'Toll Tariff',type:'Tariff'});});
 STORE.set('tollTariff',all);return cnt;}
const countText=c=>c.added+' added, '+c.updated+' updated, '+c.unchanged+' unchanged';
/* ---------------- Scrape: link or PDF -> Scrape -> data applied with the upsert rule -> toast with counts ---------------- */
/* the extracted list for a source: deterministic sample from the tariff seed (2 identical, 3 other amounts, 3 pairs that do not exist yet) */
function scrapeSample(){const today=STORE.today();const seed=(MD.get().tollTariffSeed||[]).filter(r=>r.status!=='Inactive'&&r.eff<=today);const best={};
 seed.forEach(r=>{const k=[r.entry,r.exit,r.gol].join('|');if(!best[k]||r.eff>best[k].eff)best[k]=r;});
 const base=Object.keys(best).sort().map(k=>best[k]);const out=[];
 base.slice(0,2).forEach(c=>out.push({entry:c.entry,exit:c.exit,gol:c.gol,tariff:c.tariff}));
 base.slice(2,5).forEach(c=>out.push({entry:c.entry,exit:c.exit,gol:c.gol,tariff:c.tariff+Math.max(1000,Math.round(c.tariff*0.06/500)*500)}));
 const gn=[...new Set(seed.map(r=>r.entry).concat(seed.map(r=>r.exit)))].sort();
 [[0,4,'Gol II',41500],[1,5,'Gol II',58000],[2,6,'Gol III',67500]].forEach(a=>{const e=gn[a[0]%gn.length],x=gn[a[1]%gn.length];if(e&&x&&e!==x&&!seed.some(r=>r.entry===e&&r.exit===x&&r.gol===a[2]))out.push({entry:e,exit:x,gol:a[2],tariff:a[3]});});
 return out;}
function scrape(){let kind='link',url='',file=null;
 DLG.open({title:'Scrape toll tariff',width:560,body:'<div id="scb"></div>',buttons:[{label:'Cancel'}],onOpen(L,el){form(L,el);}});
 function form(L,el){const B=$('#scb',el);B.innerHTML='<div class="grid2">'+C.field('Source','<select class="select" id="sck" aria-label="Source"><option value="link"'+(kind==='link'?' selected':'')+'>Link</option><option value="pdf"'+(kind==='pdf'?' selected':'')+'>PDF</option></select>',{req:1,for:'sck'})+
   (kind==='link'?C.field('Link','<input class="input" id="scu" type="url" placeholder="https://" autocomplete="off" value="'+esc(url)+'">',{req:1,for:'scu'}):C.field('PDF file','<input class="input" id="scf" type="file" accept="application/pdf,.pdf">',{req:1,for:'scf'}))+'</div>';
  $('#sck',el).onchange=e=>{kind=e.target.value;form(L,el);};
  L.setButtons([{label:'Cancel'},{label:'Scrape',kind:'primary',keep:true,onClick(){let ok=true;if(kind==='link'){url=($('#scu',el).value||'').trim();ok=C.setErr($('#scu',el),/^https?:\/\/\S+\.\S+/i.test(url)?'':'Enter a valid link');}else{file=($('#scf',el).files||[])[0]||null;ok=C.setErr($('#scf',el),file?(/\.pdf$/i.test(file.name)?'':'Choose a PDF file'):'Required');}if(!ok)return false;run(L,el);return false;}}]);}
 function run(L,el){const src=kind==='link'?url:file.name;$('#scb',el).innerHTML='<div class="empty" role="status" aria-live="polite"><b>Extracting tariff...</b></div>';L.setButtons([{label:'Cancel'}]);
  setTimeout(()=>{if(!document.body.contains(el))return;const c=upsert(scrapeSample(),src);toast(countText(c));L.close();render();},700);}}
window.TOLL={upsert,countText,spec:[{k:'entry',h:'Entry Gate',req:1},{k:'exit',h:'Exit Gate',req:1,ref:(x,r)=>x!==r.entry,refMsg:'Same as entry gate'},{k:'gol',h:'Golongan',req:1,type:'enum',opts:GOL},{k:'tariff',h:'Tariff',req:1,type:'rp',min:1},{k:'eff',h:'Effective Date',req:1,type:'date'},{k:'source',h:'Source'},{k:'ref',h:'Reference'}]};
const sc=$('#scr');if(sc)sc.onclick=scrape;($('#hist')||{}).onclick=()=>PANELS.history({obj:'Toll Tariff',title:'Toll Tariff',types:['Tariff']});
$('#exp').onclick=()=>IO.exportDialog({title:'Toll tariff',name:'Toll_Tariff',rows:()=>(window._TT?window._TT.filtered():rows()),page:()=>(window._TT?window._TT.pageRows():rows()),all:()=>rows(),cols:[{h:'Entry Gate',v:r=>r.entry},{h:'Exit Gate',v:r=>r.exit},{h:'Golongan',v:r=>r.gol},{h:'Tariff',v:r=>r.tariff},{h:'Effective Date',v:r=>r.eff},{h:'Source',v:r=>r.source||'BPJT'},{h:'Reference',v:r=>r.ref||''},{h:'Status',v:r=>state(r)}]});
const im=$('#imp');if(im)im.onclick=()=>{IO.importDialog({title:'Import toll tariff',name:'Toll_Tariff',templateName:'Toll_Tariff_template',sheet:'Tariff',maxRows:2000,
 spec:[{k:'entry',h:'Entry Gate',req:1},{k:'exit',h:'Exit Gate',req:1,ref:(x,r)=>x!==r.entry,refMsg:'Same as entry gate'},{k:'gol',h:'Golongan',req:1,type:'enum',opts:GOL},{k:'tariff',h:'Tariff',req:1,type:'rp',min:1},{k:'eff',h:'Effective Date',req:1,type:'date'},{k:'source',h:'Source'},{k:'ref',h:'Reference'}],
 sample:{entry:'Cikarang Utama',exit:'Karawang Barat',gol:'Gol II',tariff:'Rp 63.000',eff:'2026-11-01',source:'BPJT',ref:'SK 14/2026'},
 onImport:recs=>{const c=upsert(recs,'');STORE.audit({action:'Imported toll tariff',detail:countText(c),obj:'Toll Tariff',type:'Tariff'});toast(countText(c));render();return recs.length;}});};
const ad=$('#add');if(ad)ad.onclick=()=>edit(null);
render();STORE.subscribe('tollTariff',(e,s)=>{if(s==='remote')render();});
})();
