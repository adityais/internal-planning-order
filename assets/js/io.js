/* C16 Import / Export (real files via vendored SheetJS mini). */
(function(){
'use strict';
const {ic,esc}=UI;const {$,$$,DLG,toast,banner}=C;
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
function fname(base,ext){return base.replace(/\s+/g,'_')+'_'+UI.stamp(STORE.now())+'.'+ext;}
function writeBook(sheets,name,type){type=type||'xlsx';const wb=XLSX.utils.book_new();sheets.forEach(s=>{const ws=XLSX.utils.aoa_to_sheet(s.aoa);ws['!cols']=(s.aoa[0]||[]).map((h,i)=>({wch:Math.min(40,Math.max(10,...s.aoa.slice(0,60).map(r=>String(r[i]==null?'':r[i]).length+2)))}));XLSX.utils.book_append_sheet(wb,ws,(s.name||'Sheet1').slice(0,31));});
 if(type==='csv'){const csv=XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);download(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}),name);return;}
 const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});download(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name);}
/* ---------- Export dialog: format, scope, visible columns ---------- */
function exportDialog(o){
 const noAmt=STORE.me().noAmounts;const cols=o.cols.filter(c=>!(c.money&&noAmt));
 const scopes=[['all-filtered','All filtered'],['page','This page'],['all','All']];if(o.selected&&o.selected().length)scopes.unshift(['selected','Selected ('+o.selected().length+')']);
 const body='<div class="field"><label>Format</label><div class="seg" role="radiogroup" aria-label="Format">'+(o.formats||['XLSX','CSV']).map((f,i)=>'<button type="button" role="radio" aria-checked="'+(i===0)+'" class="'+(i===0?'on':'')+'" data-fmt="'+f+'">'+f+'</button>').join('')+'</div></div>'+
  '<div class="field"><label for="exScope">Scope</label><select class="select" id="exScope">'+C.opts(scopes,o.defaultScope||'all-filtered')+'</select></div>'+
  '<div class="field"><label>Columns</label><div class="u-gap-s2 grid2">'+cols.map((c,i)=>'<label class="chkrow"><input type="checkbox" class="cbx" data-col="'+i+'" checked>'+esc(c.h)+'</label>').join('')+'</div></div>';
 DLG.open({title:'Export',sub:o.title,body,width:480,onOpen(L){$$('[data-fmt]',L.el).forEach(b=>b.onclick=()=>{$$('[data-fmt]',L.el).forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b);});});},
  buttons:[{label:'Cancel'},{label:'Export',kind:'primary',icon:'download',onClick(L,el){const fmt=$('[data-fmt].on',el).dataset.fmt;const sc=$('#exScope',el).value;
   const use=cols.filter((c,i)=>$('[data-col="'+i+'"]',el).checked);if(!use.length){toast('Pick at least one column',{tone:'warn'});return false;}
   let rows=sc==='selected'?o.selected():sc==='page'?(o.page?o.page():o.rows()):sc==='all'?(o.all?o.all():o.rows()):o.rows();
   if(fmt==='PDF'&&o.pdf){o.pdf(rows,use);return;}
   const aoa=[use.map(c=>c.h)].concat(rows.map(r=>use.map(c=>{const v=c.v(r);return v==null?'':v;})));
   const name=fname(o.name,fmt==='CSV'?'csv':'xlsx');writeBook([{name:o.sheet||o.name,aoa}],name,fmt==='CSV'?'csv':'xlsx');
   toast('Downloading '+name);STORE.audit({action:'Exported '+o.name,detail:rows.length+' rows, '+fmt,type:'Export',obj:o.obj||o.name});}}]});}
/* ---------- parsing helpers ---------- */
function normH(s){return String(s==null?'':s).trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function toNum(v){if(v==null||v==='')return null;if(typeof v==='number')return v;let s=String(v).trim().replace(/^rp\.?\s*/i,'');
 if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'').replace(',','.');else if(/^-?\d+,\d+$/.test(s)&&s.indexOf('.')<0)s=s.replace(',','.');else s=s.replace(/,(?=\d{3}\b)/g,'');
 const n=Number(s);return isNaN(n)?NaN:n;}
function realDate(s){if(s==='INVALID'||!s)return s;const d=new Date(s+'T00:00:00');return isNaN(d)||UI.iso(d)!==s?'INVALID':s;}
function toDate(v){return realDate(toDate0(v));}
function toDate0(v){if(v==null||v==='')return null;if(typeof v==='number'){const d=new Date(Math.round((v-25569)*86400000));return UI.iso(new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));}
 const s=String(v).trim();let m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);if(m)return m[1]+'-'+UI.pad(m[2])+'-'+UI.pad(m[3]);
 m=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s);if(m)return m[3]+'-'+UI.pad(m[2])+'-'+UI.pad(m[1]);
 m=/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(s);if(m){const i=UI.MON.findIndex(x=>x.toLowerCase()===m[2].toLowerCase());if(i>=0)return m[3]+'-'+UI.pad(i+1)+'-'+UI.pad(m[1]);}
 return 'INVALID';}
function toTime(v){if(v==null||v==='')return null;if(typeof v==='number'&&v<1){const m=Math.round(v*1440);return UI.pad(Math.floor(m/60))+':'+UI.pad(m%60);}const t=UI.parseHM(String(v).trim());return t==null||t>=1440?'INVALID':UI.hm(t,{noDay:1});}
/* CSV cells stay text (raw) so toNum decides the decimal convention: "9,5" = 9.5, "1.250.000,5" = 1250000.5, "9.5" = 9.5 (QA-001) */
async function readFile(file){const buf=await file.arrayBuffer();const csv=/\.(csv|txt)$/i.test(file.name||'');const wb=XLSX.read(buf,{type:'array',raw:csv,cellDates:false});return wb;}
function sheetRows(wb,name){const ws=wb.Sheets[name||wb.SheetNames[0]];if(!ws)return [];return XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});}
/* validate rows against a header spec. Returns {records, errors:[{row,field,value,reason}], missing[], extra[], blank} */
function validate(aoa,spec,o){o=o||{};const head=(aoa[0]||[]).map(normH);const idx={};const missing=[];
 spec.forEach(s=>{const names=[s.h].concat(s.alias||[]).map(normH);const i=head.findIndex(x=>names.indexOf(x)>=0);if(i>=0)idx[s.k]=i;else if(s.req)missing.push(s.h);});
 const known=new Set(Object.values(idx));const extra=(aoa[0]||[]).filter((h,i)=>!known.has(i)&&String(h).trim()).map(String);
 const records=[],errors=[];let blank=0;const keys=new Set(o.existing||[]);
 if(missing.length)return {records,errors,missing,extra,blank,total:Math.max(0,aoa.length-1)};
 aoa.slice(1).forEach((r,ri)=>{const rowNo=ri+2;if(r.every(c=>String(c).trim()===''))return blank++;const rec={_row:rowNo};let bad=false;
  spec.forEach(s=>{let v=idx[s.k]!=null?r[idx[s.k]]:'';if(typeof v==='string')v=v.trim();const err=reason=>{errors.push({row:rowNo,field:s.h,value:v===''?'(empty)':String(v),reason});bad=true;};
   if(v===''||v==null){if(s.req)err('Required');rec[s.k]=s.def!=null?s.def:null;return;}
   if(s.type==='num'||s.type==='rp'){const n=toNum(v);if(isNaN(n))return err('Not a number');if(s.min!=null&&n<s.min)return err(s.min===0?'Must be 0 or more':'Must be at least '+s.min);if(s.max!=null&&n>s.max)return err('Max '+s.max);rec[s.k]=n;}
   else if(s.type==='date'){const d=toDate(v);if(d==='INVALID')return err('Invalid date');rec[s.k]=d;}
   else if(s.type==='time'){const t=toTime(v);if(t==='INVALID')return err('Use HH:MM');rec[s.k]=t;}
   else if(s.type==='enum'){const m=s.opts.find(x=>x.toLowerCase()===String(v).toLowerCase());if(!m)return err('Use '+s.opts.join(' / '));rec[s.k]=m;}
   else rec[s.k]=String(v);
   if(s.ref&&!s.ref(rec[s.k],rec))return err(s.refMsg||'Not found in Master Data');});
  if(!bad&&o.key){const k=o.key(rec);if(keys.has(k)){errors.push({row:rowNo,field:o.keyLabel||'Row',value:k,reason:'Duplicate'});bad=true;}else keys.add(k);}
  if(!bad&&o.check){const m=o.check(rec);if(m){errors.push({row:rowNo,field:m.field||'Row',value:m.value||'',reason:m.reason});bad=true;}}
  if(!bad)records.push(rec);});
 return {records,errors,missing,extra,blank,total:aoa.length-1-blank};}
/* ---------- 4-step import dialog ---------- */
function importDialog(o){
 let step=0,res=null,fileName='';const max=o.maxRows||1000;
 const L=DLG.open({title:o.title||'Import',sub:o.sub,width:o.width||720,body:'<div id="impBody"></div>',buttons:[]});
 const steps=['Prepare','Upload','Validate','Result'];
 function stepper(){return '<div class="u-padding-s2-s3 stepper">'+steps.map((s,i)=>'<div class="step '+(i<step?'done':i===step?'on':'')+'"><span class="n">'+(i<step?ic('check'):i+1)+'</span>'+s+'</div>'+(i<steps.length-1?'<div class="stepline'+(i<step?' done':'')+'"></div>':'')).join('')+'</div>';}
 function render(){const b=$('#impBody',L.el);let h=stepper()+'<div class="mt4">';
  if(step===0){h+='<div class="row wrap gap2"><button type="button" class="btn" id="tplBtn">'+ic('download')+'Download template</button><span class="sm mut">XLSX or CSV, max '+max.toLocaleString('id-ID')+' rows'+(o.allOrNothing?', all rows must be valid':'')+'</span></div>'+
   '<div class="mt3"><div class="lbl mb2">Required columns</div><div class="row wrap gap1">'+o.spec.filter(s=>s.req).map(s=>UI.tag(esc(s.h),'slate')).join('')+'</div></div>'+(o.spec.some(s=>!s.req)?'<div class="mt3"><div class="lbl mb2">Optional</div><div class="row wrap gap1">'+o.spec.filter(s=>!s.req).map(s=>UI.tag(esc(s.h),'line')).join('')+'</div></div>':'');
   L.setButtons([{label:'Cancel'},{label:'Next',kind:'primary',keep:true,onClick:()=>{step=1;render();}}]);}
  if(step===1){h+='<label class="drop" id="dz" tabindex="0">'+ic('upload')+'<b>Drop file or browse</b><span class="sm mut">.xlsx, .csv</span><input type="file" id="fi" accept=".xlsx,.xls,.csv" hidden></label><div id="ferr" class="mt2"></div>';
   L.setButtons([{label:'Back',keep:true,onClick:()=>{step=0;render();}}]);}
  if(step===2){const r=res;const vc=r.records.length,ec=new Set(r.errors.map(e=>e.row)).size;
   h+='<div class="row gap2 wrap"><span class="tag line">'+ic('file')+esc(fileName)+'</span>'+UI.tag(vc+' valid','green','check')+(ec?UI.tag(ec+' with errors','red','x-circle'):'')+(r.blank?UI.tag(r.blank+' blank skipped','slate'):'')+(r.extra.length?UI.tag(r.extra.length+' extra columns ignored','slate','info','',r.extra.join(', ')):'')+'</div>';
   if(r.missing.length)h+='<div class="mt3">'+banner('err','Wrong headers. Missing: <b>'+esc(r.missing.join(', '))+'</b>')+'</div>';
   else if(!r.total)h+='<div class="mt3">'+banner('err','File has no data rows')+'</div>';
   else if(r.tooMany)h+='<div class="mt3">'+banner('err','Max '+max.toLocaleString('id-ID')+' rows')+'</div>';
   else if(r.errors.length){h+='<div class="mt3">'+(o.allOrNothing?banner('err','Fix all errors to import'):banner('warn',vc+' rows can be imported'))+'</div><div class="panel mt3"><div class="u-max-height-280-overflow-auto tbl-scroll"><table class="fltr"><thead><tr><th>Row</th><th>Field</th><th>Value</th><th>Error</th></tr></thead><tbody>'+
     r.errors.slice(0,200).map(e=>'<tr><td class="tnum">'+e.row+'</td><td>'+esc(e.field)+'</td><td class="u-max-width-180 ell" title="'+esc(e.value)+'">'+esc(e.value)+'</td><td><span class="errtxt">'+ic('x-circle','s12')+esc(e.reason)+'</span></td></tr>').join('')+'</tbody></table></div></div>';}
   else h+='<div class="mt3">'+banner('ok','All rows valid')+'</div>';
   if(o.preview&&vc&&!r.missing.length)h+='<div class="mt3">'+o.preview(r.records)+'</div>';
   const can=vc>0&&!r.missing.length&&!r.tooMany&&!(o.allOrNothing&&r.errors.length);
   L.setButtons([{label:'Back',keep:true,onClick:()=>{step=1;render();}}].concat(r.errors.length?[{label:'Download error report',icon:'download',keep:true,onClick:()=>{const name=fname((o.name||'Import')+'_errors','xlsx');writeBook([{name:'Errors',aoa:[['Row','Field','Value','Error']].concat(r.errors.map(e=>[e.row,e.field,e.value,e.reason]))}],name);toast('Downloading '+name);}}]:[]).concat([{label:o.allOrNothing?'Import':'Import '+vc+' valid',kind:'primary',disabled:!can,keep:true,onClick:()=>{const n=o.onImport(r.records,r)||vc;res.imported=n;step=3;render();}}]));}
  if(step===3){h+='<div class="u-padding-s6 empty">'+ic('check-circle','s24')+'<b>'+res.imported+' rows imported</b>'+(res.errors.length&&!o.allOrNothing?'<span class="sm mut">'+new Set(res.errors.map(e=>e.row)).size+' rows skipped</span>':'')+'</div>';L.setButtons([{label:'Done',kind:'primary'}]);}
  b.innerHTML=h+'</div>';
  if(step===0)$('#tplBtn',L.el).onclick=()=>{template(o);};
  if(step===1){const dz=$('#dz',L.el),fi=$('#fi',L.el);dz.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click();}};
   dz.ondragover=e=>{e.preventDefault();dz.classList.add('over');};dz.ondragleave=()=>dz.classList.remove('over');dz.ondrop=e=>{e.preventDefault();dz.classList.remove('over');if(e.dataTransfer.files[0])take(e.dataTransfer.files[0]);};
   fi.onchange=()=>{if(fi.files[0])take(fi.files[0]);};}}
 async function take(file){fileName=file.name;const fe=$('#ferr',L.el);
  if(!/\.(xlsx|xls|csv)$/i.test(file.name)){fe.innerHTML=banner('err','Use .xlsx or .csv');return;}
  try{const wb=await readFile(file);let aoa=sheetRows(wb,o.sheet&&wb.SheetNames.indexOf(o.sheet)>=0?o.sheet:null);
   if(o.custom){res=o.custom(wb,file);}
   else{res=validate(aoa,o.spec,{key:o.key,keyLabel:o.keyLabel,existing:o.existing?o.existing():[],check:o.check});res.tooMany=res.total>max;}
   step=2;render();}catch(e){console.warn(e);fe.innerHTML=banner('err','File could not be read');}}
 render();return L;}
function template(o){const head=o.spec.map(s=>s.h);const name=(o.templateName||(o.name||'Import')+'_template')+'.xlsx';
 const sheets=[{name:o.sheet||'Data',aoa:[head].concat(o.sample?[o.spec.map(s=>o.sample[s.k]!=null?o.sample[s.k]:'')]:[])}];if(o.extraSheets)o.extraSheets.forEach(s=>sheets.push(s));writeBook(sheets,name);toast('Downloading '+name);}
window.IO={download,fname,writeBook,exportDialog,importDialog,template,validate,readFile,sheetRows,toNum,toDate,toTime,normH};
})();

/* ================= Milkrun Reference import / export (IO.ref) - D88 =================
   Template columns = form fields. Import is PARTIAL: valid rows are saved as "Import #n", invalid and duplicate rows are reported and never overwrite. */
(function(){
'use strict';
const lc=REF.lc;const {toast}=C;
/* [key, header, required, aliases] */
const COLS={
 part:[['project','Project',1],['partNo','Part Number',1],['name','Part Name',1],['pnNoColor','PN No Color'],['supCode','Supplier Code',1],['pnInduk','PN Induk'],['capBox','Cap/Box',1],['boxVol','Box Vol (m3)',1,['Box Vol','Box Vol (m³)']],['p','P (pending unit)',1,['P','P (mm)']],['l','L (pending unit)',1,['L','L (mm)']],['t','T (pending unit)',1,['T','T (mm)']],['price','Price']],
 bom:[['project','Project',1],['model','Model Code',1],['partNo','Part Number',1],['qty','Qty/unit',1,['Qty per Unit','Qty']],['category','Category',1],['supplier','Supplier']],
 route:[['project','Project',1],['routeCode','Route Code',0,['Route ID','Route Code (pending contract)']],['name','Route Name',1,['Route Group']],['comp','Composition',1],['chassis','Category',1],['body','Karoseri',1],['cap','Capacity',1,['Capacity (m3)']],['liqVol','Liq Vol/FB',1,['Liq Vol','Liq Vol (m3)']],['shippingVol','Shipping Volume (pending contract)',0,['Shipping Volume']],['heijunka','Heijunka Interval'],['notes','Notes']]};
const EXAMPLE={part:['EXAMPLE','TS-00001-A0','Bracket Rear Lamp','TS-00001','S001','No',12,0.045,300,200,150,45000],bom:['EXAMPLE','F000RV-GMDFJ','TS-00001-A0',2,'PIO',''],route:['EXAMPLE','','Route Example','PL-CBT, S001, S002, ADM-SNT','CDD','Box',22,3,4.5,120,'']};
const LAB=k=>{const o={};COLS[k].forEach(c=>o[c[0]]=c[1]);o.pool='Pool';return o;};
const label={part:'Part',bom:'BOM',route:'Route Group'};
function fmt(kind,e){const L=LAB(kind);return Object.keys(e).filter(k=>e[k]&&typeof e[k]==='string').map(k=>{const lb=L[k]||k,m=e[k];if(m==='Required')return lb+' is required';if(m==='Must be a number')return lb+' must be a number';return lc(m).indexOf(lc(lb))>=0?m:lb+': '+m;});}
function template(kind){const name='Milkrun_Reference_'+label[kind].replace(/\s+/g,'')+'_template.xlsx';IO.writeBook([{name:label[kind],aoa:[COLS[kind].map(c=>c[1]),EXAMPLE[kind]]}],name);toast('Downloading '+name);}
function headers(kind,aoa){const raw=(aoa[0]||[]).map(S);const head=raw.map(IO.normH);const idx={},missing=[],legacy=[];COLS[kind].forEach(c=>{const names=[c[1]].concat(c[3]||[]).map(IO.normH);const i=head.findIndex(h=>names.indexOf(h)>=0);if(i>=0){idx[c[0]]=i;if(IO.normH(c[1])!==head[i]&&raw[i])legacy.push({from:raw[i],to:c[1]});}else if(c[2])missing.push(c[1]);});return {idx,missing,legacy};}
const S=v=>String(v==null?'':v).trim();
/* number cell: "0.045" and "0,045" are both decimals (IO.toNum would read 0.045 as Indonesian thousands); idr=1 keeps "45.000" as thousands */
const N=(v,idr)=>{const s=S(v);if(s==='')return null;if(!idr&&/^-?\d+\.\d+$/.test(s))return Number(s);return IO.toNum(v);};
const pick=(list,v)=>list.find(x=>lc(x)===lc(v))||S(v);
const projOf=v=>{const p=REF.projects().find(x=>lc(x.code)===lc(v));return p?p.code:S(v);};
function toPart(g){const l=MD.locByCode(g.supCode);const yn=S(g.pnInduk);return {project:projOf(g.project),partNo:S(g.partNo),name:S(g.name),pnNoColor:S(g.pnNoColor),supCode:l?l.code:S(g.supCode),supplier:l?l.name:'',pnInduk:yn?pick(['Yes','No'],yn):'No',capBox:N(g.capBox),boxVol:N(g.boxVol),p:N(g.p),l:N(g.l),t:N(g.t),price:N(g.price,1)};}
function toRoute(g){const pre={};const codes=S(g.comp).split(',').map(S).filter(Boolean);const names=[];let pool='Pool Cibitung';
 codes.forEach(c=>{const l=MD.locByCode(c);if(!l)pre.comp='Location code '+c+' not found';else names.push(l);});
 if(!pre.comp){if(names.length&&names[0].type==='Pool'){pool=names[0].name;names.shift();}if(names.length&&names[names.length-1].type==='Pool')names.pop();}
 const ch=S(g.chassis),bd=S(g.body);if(ch&&UI.CATS.indexOf(pick(UI.CATS,ch))<0)pre.chassis='Category must be one of '+UI.CATS.join(' / ');if(bd&&UI.KAROS.indexOf(pick(UI.KAROS,bd))<0)pre.body='Karoseri must be one of '+UI.KAROS.join(' / ');
 return {rec:{project:projOf(g.project),routeCode:S(g.routeCode),name:S(g.name),pool,comp:names.map(l=>l.name),chassis:pick(UI.CATS,ch),body:pick(UI.KAROS,bd),cap:N(g.cap),liqVol:N(g.liqVol),shippingVol:N(g.shippingVol),heijunka:N(g.heijunka),notes:S(g.notes),stagger:0},pre};}
/* parse an array-of-arrays (first row = headers) into {records, validRows, failed:[{row,text}], missing, total} */
function parse(kind,aoa,fileName){const out={kind,file:fileName||'',missing:[],legacy:[],total:0,records:[],validRows:0,failed:[],blank:0};const H=headers(kind,aoa);out.missing=H.missing;out.legacy=H.legacy;if(H.missing.length)return out;
 const rows=[];aoa.slice(1).forEach((r,i)=>{if(r.every(c=>S(c)===''))return out.blank++;const g={};Object.keys(H.idx).forEach(k=>g[k]=r[H.idx[k]]);if(lc(g.project)==='example')return;rows.push({n:i+2,g});});out.total=rows.length;
 const fail=(n,e)=>out.failed.push({row:n,text:'Row '+n+': '+fmt(kind,e).join('; ')});
 if(kind==='part'){const extra=[];rows.forEach(({n,g})=>{const rec=toPart(g);const e=REF.validate('part',rec,{extra});if(REF.hasErr(e))fail(n,e);else{extra.push(rec);out.records.push(rec);}});out.validRows=out.records.length;}
 if(kind==='route'){const extra=[];rows.forEach(({n,g})=>{const x=toRoute(g);const e=REF.validate('route',x.rec,{extra});if(x.pre.comp)delete e.comp;Object.assign(e,x.pre);if(REF.hasErr(e))fail(n,e);else{extra.push(x.rec);out.records.push(x.rec);}});out.validRows=out.records.length;}
 if(kind==='bom'){const seen={},by={};rows.forEach(({n,g})=>{const line={partNo:S(g.partNo),qty:N(g.qty),category:S(g.category).toUpperCase()};const rec={project:projOf(g.project),model:S(g.model),lines:[line]};
  const e=REF.validate('bom',rec,{});const flat=Object.assign({},e);delete flat.lines;delete flat.linesMin;if(e.lines)Object.assign(flat,e.lines[0]);
  const sk=lc(rec.project)+'|'+lc(rec.model)+'|'+lc(line.partNo);if(!flat.partNo&&seen[sk])flat.partNo='Part already in this BOM';
  if(REF.hasErr(flat)){fail(n,flat);return;}seen[sk]=1;const bk=lc(rec.project)+'|'+lc(rec.model);if(!by[bk]){by[bk]={project:rec.project,model:rec.model,lines:[]};out.records.push(by[bk]);}by[bk].lines.push(line);out.validRows++;});}
 return out;}
async function parseFile(kind,file){const wb=await IO.readFile(file);return parse(kind,IO.sheetRows(wb),file.name);}
/* save the valid rows as "Import #n" (global running number) and log it */
function commit(kind,res){const n=REF.nextImport();const batch='Import #'+n;
 if(kind==='route'){const extra=[];res.records.forEach(r=>{r.id=REF.routeId(r.project,extra);REF.build(r,null);extra.push(r);});}
 REF.putMany(kind,res.records,batch);
 const projs=[...new Set(res.records.map(r=>r.project))].join(', ');const log=(STORE.get('refImports')||[]).slice();
 log.push({n,kind,project:projs,file:res.file,valid:res.validRows,failed:res.failed.length,by:STORE.me().n,at:STORE.now()});STORE.set('refImports',log);
 STORE.audit({action:'Imported '+label[kind]+' (Import #'+n+')',detail:res.validRows+' valid rows, '+res.failed.length+' failed',obj:projs,type:'Reference'});return n;}
/* export = template columns; composition is expanded to Location codes (Pool at both ends) */
function exportAoa(kind,rows){const head=COLS[kind].map(c=>c[1]).concat('Batch');const body=[];
 if(kind==='part')rows.forEach(r=>body.push([r.project,r.partNo,r.name,r.pnNoColor,r.supCode,r.pnInduk,r.capBox,r.boxVol,r.p,r.l,r.t,r.price==null?'':r.price,r.batch||'']));
 if(kind==='bom')rows.forEach(b=>(b.lines||[]).forEach(l=>{const p=REF.rows('part',b.project).find(x=>lc(x.partNo)===lc(l.partNo));body.push([b.project,b.model,l.partNo,l.qty,l.category,p?p.supplier:'',b.batch||'']);}));
 if(kind==='route')rows.forEach(r=>body.push([r.project,r.routeCode||'',r.name,REF.comp(r).join(', '),r.chassis,r.body,r.cap,r.liqVol,r.shippingVol==null?'':r.shippingVol,r.heijunka==null?'':r.heijunka,r.notes||'',r.batch||'']));
 return [head].concat(body);}
function exportCsv(kind,rows){const aoa=exportAoa(kind,rows);const name=IO.fname('Milkrun_Reference_'+label[kind].replace(/\s+/g,''),'csv');IO.writeBook([{name:label[kind],aoa}],name,'csv');toast('Downloading '+name);STORE.audit({action:'Exported Milkrun Reference '+label[kind],detail:rows.length+' rows, CSV',type:'Export',obj:'Milkrun Reference'});return aoa;}
IO.ref={COLS,label,template,parse,parseFile,commit,exportAoa,exportCsv,fmt,num:N};
})();

/* ================= Order Capture (DEV-C): Export without format / scope choices, Bulk Order (template + upload, validate, import at once) =================
   IO.exportSimple: "Data Filtered" (filtered result or all data) + column picker, always .xlsx.
   IO.bulkDialog:   Download Template above an upload area (same as Master Data); the file is validated and the valid orders go straight into the store. */
(function(){
'use strict';
const {ic,esc}=UI;const {$,$$,DLG,toast,banner}=C;const {fname,writeBook,sheetRows,readFile}=IO;
function exportSimple(o){const noAmt=STORE.me().noAmounts;const cols=o.cols.filter(c=>!(c.money&&noAmt));const nF=o.list().length,nA=o.all().length;
 const body='<div class="field"><label for="exDf">Data Filtered</label><select class="select" id="exDf">'+C.opts([['filtered','Filtered data ('+nF+')'],['all','All data ('+nA+')']],'filtered')+'</select></div>'+
  '<div class="field"><label>Columns</label><div class="oc-cols">'+cols.map((c,i)=>'<label class="chkrow"><input type="checkbox" class="cbx" data-col="'+i+'" checked>'+esc(c.h)+'</label>').join('')+'</div></div>';
 return DLG.open({title:'Export',sub:o.title,body,width:560,buttons:[{label:'Cancel'},{label:'Export',kind:'primary',icon:'download',onClick(L,el){
  const use=cols.filter((c,i)=>$('[data-col="'+i+'"]',el).checked);if(!use.length){toast('Pick at least one column',{tone:'warn'});return false;}
  const list=$('#exDf',el).value==='all'?o.all():o.list();const rows=o.expand?[].concat.apply([],list.map(o.expand)):list;
  if(!rows.length){toast('Nothing to export',{tone:'warn'});return false;}
  const aoa=[use.map(c=>c.h)].concat(rows.map(r=>use.map(c=>{const v=c.v(r);return v==null?'':v;})));const name=fname(o.name,'xlsx');
  writeBook([{name:o.sheet||o.name,aoa}],name,'xlsx');toast('Downloading '+name);STORE.audit({action:'Exported '+o.name,detail:list.length+' orders, '+rows.length+' rows',type:'Export',obj:o.obj||o.name});}}]});}
function bulkDialog(o){let done=false;
 const L=DLG.open({title:o.title||'Bulk Order',width:o.width||680,body:'<div id="bkBody"></div>',buttons:[]});
 const aoaOf=wb=>sheetRows(wb,o.sheet&&wb.SheetNames.indexOf(o.sheet)>=0?o.sheet:null);
 function home(msg){$('#bkBody',L.el).innerHTML='<div class="oc-tmpl"><div><b>Template</b></div><button type="button" class="btn" id="bkTpl">'+ic('download')+'Download Template</button></div>'+
   '<label class="drop" id="bkDz" tabindex="0">'+ic('upload')+'<b>Drag &amp; drop file here</b><span class="sm mut">or click to choose a file (.xlsx or .csv)</span><input type="file" id="bkFi" accept=".xlsx,.xls,.csv" hidden></label><div id="bkMsg" class="mt3">'+(msg||'')+'</div>';
  L.setButtons([{label:'Close'}]);
  $('#bkTpl',L.el).onclick=()=>{const name=(o.templateName||'Bulk_Order_template')+'.xlsx';writeBook([{name:o.sheet||'Orders',aoa:o.template()}],name);toast('Downloading '+name);};
  const dz=$('#bkDz',L.el),fi=$('#bkFi',L.el);dz.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click();}};
  dz.ondragover=e=>{e.preventDefault();dz.classList.add('over');};dz.ondragleave=()=>dz.classList.remove('over');dz.ondrop=e=>{e.preventDefault();dz.classList.remove('over');if(e.dataTransfer.files[0])take(e.dataTransfer.files[0]);};
  fi.onchange=()=>{if(fi.files[0])take(fi.files[0]);};}
 async function take(file){const msg=$('#bkMsg',L.el);
  if(!/\.(xlsx|xls|csv)$/i.test(file.name)){msg.innerHTML=banner('err','Use .xlsx or .csv');return;}
  let res;try{const wb=await readFile(file);res=o.parse(aoaOf(wb),o.maxRows);}catch(e){console.warn(e);msg.innerHTML=banner('err','File could not be read');return;}
  if(res.missing.length){msg.innerHTML=banner('err','Wrong headers. Missing: <b>'+esc(res.missing.join(', '))+'</b>');return;}
  if(res.tooMany){msg.innerHTML=banner('err','Max '+o.maxRows.toLocaleString('id-ID')+' rows');return;}
  if(!res.rows){msg.innerHTML=banner('err','File has no data rows');return;}
  let made=[];if(res.orders.length)made=o.commit(res.orders)||[];result(res,made,file.name);}
 function result(res,made,fileName){const bad=new Set(res.errors.map(e=>e.row)).size;
  let h='<div class="row gap2 wrap"><span class="tx">'+esc(fileName)+'</span>'+(made.length?UI.status(made.length+' orders imported','green'):'')+(res.failedOrders?UI.status(res.failedOrders+' orders with errors, not imported','red'):'')+(res.blank?'<span class="sm mut">'+res.blank+' blank rows skipped</span>':'')+(res.extra.length?'<span class="sm mut" title="'+esc(res.extra.join(', '))+'">'+res.extra.length+' extra columns ignored</span>':'')+'</div>';
  if(res.errors.length)h+='<div class="panel mt3"><div class="u-max-height-280-overflow-auto tbl-scroll"><table class="fltr"><thead><tr><th>Row</th><th>Field</th><th>Value</th><th>Error</th></tr></thead><tbody>'+res.errors.slice(0,200).map(e=>'<tr><td class="tnum">'+e.row+'</td><td>'+esc(e.field)+'</td><td class="u-max-width-180 ell" title="'+esc(e.value)+'">'+esc(e.value)+'</td><td><span class="errtxt">'+ic('x-circle','s12')+esc(e.reason)+'</span></td></tr>').join('')+'</tbody></table></div></div>';
  $('#bkBody',L.el).innerHTML=h;
  L.setButtons((res.errors.length?[{label:'Download error report',icon:'download',keep:true,onClick:()=>{const name=fname((o.name||'Bulk_Order')+'_errors','xlsx');writeBook([{name:'Errors',aoa:[['Row','Field','Value','Error']].concat(res.errors.map(e=>[e.row,e.field,e.value,e.reason]))}],name);toast('Downloading '+name);return false;}}]:[]).concat([{label:'Upload another file',keep:true,onClick:()=>{home();return false;}},{label:'Done',kind:'primary',onClick:()=>{if(o.onDone)o.onDone(made);}}]));
  if(made.length&&o.onImported)o.onImported(made);}
 home();return L;}
IO.exportSimple=exportSimple;IO.bulkDialog=bulkDialog;
})();