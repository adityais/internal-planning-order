/* Shared components: C6 dialog, C7 drawer, C8 toast/banner, C5 table, C15 form helpers, C4 countdown ticker. */
(function(){
'use strict';
const {ic,esc}=UI;
function $(s,r){return (r||document).querySelector(s);}function $$(s,r){return Array.from((r||document).querySelectorAll(s));}
function h(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;}
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const layers=[];
function trap(el,e){if(e.key!=='Tab')return;const f=$$(FOCUSABLE,el).filter(x=>x.offsetParent!==null);if(!f.length)return;const a=f[0],b=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus();}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();}}
document.addEventListener('keydown',e=>{const top=layers[layers.length-1];if(!top)return;if(e.key==='Escape'){e.preventDefault();top.close();}else trap(top.el,e);});
function btnHtml(b,i){return '<button type="button" class="btn '+(b.kind||'')+(b.size?' '+b.size:'')+'" data-bi="'+i+'"'+(b.disabled?' disabled':'')+(b.title?' title="'+esc(b.title)+'"':'')+(b.style?' style="'+b.style+'"':'')+'>'+(b.icon?ic(b.icon):'')+esc(b.label)+'</button>';}
function layer(kind,o){
 const prev=document.activeElement;const w=o.width||(kind==='drawer'?480:520);
 if(kind==='dialog'){layers.filter(l=>l.kind==='dialog').forEach(l=>l.close(true));}
 const scrim=h('<div class="scrim'+(kind==='drawer'?' scr-drawer':'')+'"></div>');
 const id='L'+Math.random().toString(36).slice(2,8);
 const el=h('<'+(kind==='drawer'?'aside':'div')+' class="'+kind+(o.cls?' '+o.cls:'')+'" role="'+(o.alert?'alertdialog':'dialog')+'" aria-modal="true" aria-labelledby="'+id+'" style="width:'+w+'px"></'+(kind==='drawer'?'aside':'div')+'>');
 el.innerHTML='<div class="hd"><div class="u-min-width-0 col">'+(o.pre||'')+'<h2 id="'+id+'">'+esc(o.title)+'</h2>'+(o.sub?'<span class="sm mut">'+o.sub+'</span>':'')+'</div><span class="sp"></span>'+(o.chip||'')+'<button type="button" class="iconbtn" data-x aria-label="Close">'+ic('x')+'</button></div>'+
  (o.top||'')+'<div class="bd'+(kind==='dialog'?' col dialog-gap':'')+'"'+(o.bodyStyle?' style="'+o.bodyStyle+'"':'')+'></div>'+(o.foot===false?'':'<div class="ft">'+(o.footLeft||'')+'<span class="sp"></span></div>');
 const bd=$('.bd',el);if(typeof o.body==='string')bd.innerHTML=o.body;else if(o.body)bd.appendChild(o.body);
 const L={el,kind,closed:false,body:bd,close(silent){if(L.closed)return;L.closed=true;scrim.remove();el.remove();const i=layers.indexOf(L);if(i>=0)layers.splice(i,1);if(o.onClose&&!silent)o.onClose();if(prev&&prev.focus&&document.contains(prev))try{prev.focus();}catch(e){}},
  setButtons(btns){const ft=$('.ft',el);if(!ft)return;$$('[data-bi]',ft).forEach(x=>x.remove());ft.insertAdjacentHTML('beforeend',(btns||[]).map(btnHtml).join(''));$$('[data-bi]',ft).forEach(x=>x.onclick=()=>{const b=btns[+x.dataset.bi];if(b.onClick){/* QA-005: one action per click burst (double click never runs a handler twice) */if(x.dataset.busy)return;x.dataset.busy='1';let r;try{r=b.onClick(L,el);}finally{if(r===false)delete x.dataset.busy;else setTimeout(()=>{delete x.dataset.busy;},400);}if(r!==false&&!b.keep)L.close();}else L.close();});},
  q:s=>$(s,el),qa:s=>$$(s,el)};
 const btns=o.buttons||(o.foot===false?null:[{label:'Close'}]);if(btns)L.setButtons(btns);
 scrim.onclick=()=>{if(!o.modalLock)L.close();};$('[data-x]',el).onclick=()=>L.close();
 document.body.appendChild(scrim);document.body.appendChild(el);layers.push(L);
 if(o.onOpen)o.onOpen(L,el);
 setTimeout(()=>{const f=el.querySelector('[autofocus]')||$$(FOCUSABLE,$('.bd',el))[0]||$('[data-x]',el);if(f)f.focus();},20);
 TICK.now();return L;}
const DLG={open:o=>layer('dialog',o),drawer:o=>layer('drawer',o),layers,
 /* confirm with optional required reason (Required-reason pattern: primary stays enabled; errors inline + summary) */
 confirm(o){return new Promise(res=>{const rid='r'+Math.random().toString(36).slice(2,7);
  const body=(o.body?'<div>'+o.body+'</div>':'')+(o.reason?'<div class="field"><label for="'+rid+'">'+(o.reasonLabel||'Reason')+' <span class="req">*</span></label>'+(o.reasonOptions?'<select class="select" id="'+rid+'"><option value="">Select</option>'+o.reasonOptions.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select>':'<textarea class="textarea" rows="3" id="'+rid+'" placeholder="'+esc(o.placeholder||'')+'"></textarea>')+'<div class="errtxt" hidden id="'+rid+'e">'+ic('x-circle','s12')+'<span>Required</span></div></div>'+(o.reasonOptions&&o.reasonOptions.indexOf('Other')>=0?'<div class="field" hidden id="'+rid+'w"><label for="'+rid+'n">Note <span class="req">*</span></label><input class="input" id="'+rid+'n"><div class="errtxt" hidden id="'+rid+'ne">'+ic('x-circle','s12')+'<span>Required for Other</span></div></div>':''):'')+(o.extra||'');
  const L=layer('dialog',{title:o.title,sub:o.sub,body,width:o.width||460,alert:!!o.danger,chip:o.chip,onClose:()=>res(null),
   buttons:[{label:o.cancel||'Cancel',onClick:()=>{res(null);}},{label:o.ok||'Confirm',kind:o.danger?'danger':'primary',icon:o.icon,onClick:(L,el)=>{let r=true;
    if(o.reason){const f=el.querySelector('#'+rid);const v=(f.value||'').trim();const min=o.minLen||1;const e=el.querySelector('#'+rid+'e');
     if(v.length<min){f.classList.add('err');e.hidden=false;e.querySelector('span').textContent=v?('Min '+min+' characters'):'Required';f.setAttribute('aria-invalid','true');f.setAttribute('aria-describedby',rid+'e');f.focus();return false;}r=v;
     /* QA-P02: reason Other always needs a note (same rule as Skip dates) */const nf=el.querySelector('#'+rid+'n');if(nf&&v==='Other'){const nv=nf.value.trim();if(!nv){nf.classList.add('err');el.querySelector('#'+rid+'ne').hidden=false;nf.focus();return false;}r='Other: '+nv;}}
    if(o.validate){const m=o.validate(el);if(m===false)return false;}
    L.closed=true;scrim_cleanup(L);res(r);return true;}}]});
  const rs=L.el.querySelector('#'+rid),rw=L.el.querySelector('#'+rid+'w');if(rs&&rw)rs.addEventListener('change',()=>{rw.hidden=rs.value!=='Other';});});}};
function scrim_cleanup(L){/* close without firing onClose */const i=layers.indexOf(L);L.el.previousElementSibling&&L.el.previousElementSibling.classList.contains('scrim')&&L.el.previousElementSibling.remove();L.el.remove();if(i>=0)layers.splice(i,1);}
/* ---------- toast (bottom-right, 5s / 8s with action, max 3) and banner ---------- */
function toast(msg,o){o=o||{};let box=$('#toasts');if(!box){box=h('<div id="toasts" class="toasts" role="status" aria-live="polite"></div>');document.body.appendChild(box);}
 const t=h('<div class="toast '+(o.tone||'')+'">'+ic(o.tone==='err'?'x-circle':o.tone==='warn'?'alert':'check-circle')+'<span>'+esc(msg)+'</span>'+(o.action?'<button type="button" class="btn sm ghost">'+esc(o.action.label)+'</button>':'')+'<button type="button" class="iconbtn" aria-label="Dismiss">'+ic('x')+'</button></div>');
 if(o.action)t.querySelector('.btn').onclick=()=>{o.action.fn();t.remove();};t.querySelector('.iconbtn').onclick=()=>t.remove();
 box.appendChild(t);while(box.children.length>3)box.firstElementChild.remove();setTimeout(()=>t.remove(),o.ms||(o.action?8000:5000));return t;}
function banner(tone,text,o){o=o||{};const icon={info:'info',warn:'alert',err:'x-circle',ok:'check-circle',mute:'info'}[tone];return '<div class="banner '+tone+(o.sm?' sm':'')+'" role="'+(tone==='err'?'alert':'status')+'"'+(o.id?' id="'+o.id+'"':'')+'>'+ic(icon)+'<div>'+text+'</div>'+(o.acts?'<div class="acts">'+o.acts+'</div>':'')+'</div>';}
/* ---------- countdown ticker (1/s; announce only at 15 and 5 min) ---------- */
const TICK={fns:[],add(fn){this.fns.push(fn);},now(){paint();}};
let live=null;const announced={};
function paint(){const n=STORE.now();
 $$('[data-deadline]').forEach(e=>{const dl=+e.dataset.deadline;const ms=dl-n;const tone=UI.cdTone(ms);const lg=e.dataset.lg;
  const cls='cd'+(tone?' '+tone:'')+(ms<=0?' over':'')+(lg?' lg':'');if(e.className!==cls)e.className=cls;
  const lbl=e.dataset.lbl;const txt=ms<=0?(e.dataset.over||'Overdue'):UI.cdText(ms);
  e.innerHTML=ic(tone==='crit'?'timer':'clock')+'<span>'+txt+'</span>'+(lbl&&ms>0?'<small>'+esc(lbl)+'</small>':'');
  const m=Math.floor(ms/60000);if(m===15||m===5){const k=dl+':'+m;if(!announced[k]){announced[k]=1;if(!live){live=h('<div class="sr" aria-live="assertive"></div>');document.body.appendChild(live);}live.textContent=m+' minutes left';}}});
 $$('[data-clock]').forEach(e=>{const d=new Date(n);e.textContent=UI.fdt(n);});
 TICK.fns.forEach(f=>{try{f(n);}catch(e){console.error(e);}});}
setInterval(()=>{try{WATER.tick();}catch(e){}paint();},1000);
/* ---------- form helpers ---------- */
function field(label,control,o){o=o||{};return '<div class="field'+(o.cls?' '+o.cls:'')+'"'+(o.style?' style="'+o.style+'"':'')+'><label'+(o.for?' for="'+o.for+'"':'')+'>'+esc(label)+(o.req?' <span class="req" aria-hidden="true">*</span>':'')+'</label>'+control+(o.hint?'<div class="hint">'+o.hint+'</div>':'')+'<div class="errtxt" hidden'+(o.for?' id="'+o.for+'-e"':'')+'>'+ic('x-circle','s12')+'<span></span></div></div>';}
function setErr(input,msg){const f=input.closest('.field');const e=f&&f.querySelector('.errtxt');if(msg){input.classList.add('err');input.setAttribute('aria-invalid','true');if(e){e.hidden=false;e.querySelector('span').textContent=msg;if(e.id)input.setAttribute('aria-describedby',e.id);}}else{input.classList.remove('err');input.removeAttribute('aria-invalid');if(e)e.hidden=true;}return !msg;}
function opts(list,sel,ph){return (ph!=null?'<option value="">'+esc(ph)+'</option>':'')+list.map(x=>{const v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return '<option value="'+esc(v)+'"'+(String(v)===String(sel)?' selected':'')+'>'+esc(l)+'</option>';}).join('');}
/* currency input "Rp 75.000" (dot thousands) and HH:MM mask */
document.addEventListener('input',e=>{const t=e.target;if(t.matches&&t.matches('[data-rp]')){const v=UI.parseRp(t.value);t.value=v?v.toLocaleString('id-ID'):'';}
 if(t.matches&&t.matches('[data-hm]')){let v=t.value.replace(/[^0-9]/g,'').slice(0,4);if(v.length>2)v=v.slice(0,2)+':'+v.slice(2);t.value=v;}});
/* segmented controls and tabs: arrow keys move */
document.addEventListener('keydown',e=>{const t=e.target;if(!t.closest)return;const g=t.closest('.seg,.tabs');if(!g||!/Arrow(Left|Right)/.test(e.key)||t.tagName!=='BUTTON')return;const b=$$('button:not([disabled])',g);const i=b.indexOf(t);if(i<0)return;const n=b[(i+(e.key==='ArrowRight'?1:-1)+b.length)%b.length];n.focus();n.click();e.preventDefault();});
/* ---------- C5 data table (Foundation v2: THE shared table helper) ----------
   Every list in Planning & Order uses C.table(host,opts). One component gives: per-column search (substring, case-insensitive),
   click-to-sort headers (natural / numeric), STATUS columns that match EXACTLY (typing "Allocated" never returns "Non Allocated";
   the filter is a select built from the data), pagination of 10 (opts.paged:false for pages that want none), empty state
   "No matching results" while filtered, and the uniform View / Edit / Delete icon actions (opts.actions).
   opts: {key, cols, rows|()=>rows, label, minw, pageSize, paged, select, single (radio, pick one), selectable, onSelect, onRow, rowCls, state, empty:{text,action,fn},
          actions:{view:fn(row),edit:fn(row),del:fn(row),can:(kind,row)=>bool,name:row=>string}, sort, dir, clearAll, after}
   col:  {k, h, text(row) [filter+sort value], render(row), sortv(row), status:true (exact match + select filter), match:'exact'|'prefix',
          filter:'select'+opts:[...], noFilter, sortable:false, cls, w, ell}                                                                */
const normT=v=>String(v==null?'':v).trim().replace(/\s+/g,' ').toLowerCase();
const isStatusCol=c=>c.status===true||c.k==='status';
function natCmp(A,B){const ea=A==null||A==='',eb=B==null||B==='';if(ea||eb)return ea&&eb?0:ea?1:-1;if(typeof A==='number'&&typeof B==='number')return A-B;if(A instanceof Date&&B instanceof Date)return A-B;
 return String(A).localeCompare(String(B),'en',{numeric:true,sensitivity:'base'});}
function table(host,o){
 const S=host._tbl||(host._tbl={sort:o.sort||null,dir:o.dir||1,f:{},page:1,sel:new Set()});
 S.o=o;
 const colVal=(c,x)=>c.text?c.text(x):(x[c.k]==null?'':x[c.k]);
 function hit(v,q,c){const vv=normT(v),qq=normT(q);if(!qq)return true;
  if(isStatusCol(c))return vv.indexOf(qq)===0||vv.split(' ').some(w=>w.indexOf(qq)===0)||(' '+vv).indexOf(' '+qq)>=0;if(c.match==='exact'||c.filter==='select')return vv.indexOf(qq)===0;/* status: typed from the start, so 'allocated' does not find 'non allocated' */
  if(c.match==='prefix')return vv.indexOf(qq)===0;
  if(c.starts)return vv.split(' ').some(w=>w.indexOf(qq)===0)||vv.indexOf(qq)===0;
  return vv.indexOf(qq)>=0;}
 const rowsRaw=()=>{const r=typeof o.rows==='function'?o.rows():o.rows;return (r||[]).slice();};
 /* default order for every table: newest on top (last changed / created time, else the running number of the ID); a header click overrides it. order:'keep' / select pickers keep the page's own order */
 const tsOf=x=>{const v=x.updatedAt!=null?x.updatedAt:x.createdAt!=null?x.createdAt:x.at!=null?x.at:x.requestedAt!=null?x.requestedAt:x.created;const n=typeof v==='number'?v:Date.parse(v);return isNaN(n)?null:n;};
 const seqOf=x=>{const m=/^[A-Za-z]{1,6}-?[A-Za-z]?(\d+)$/.exec(String(o.key&&x[o.key]!=null?x[o.key]:''));return m?+m[1]:null;};
 function newestFirst(r){if(r.length<2)return r;const ts=r.map(tsOf),sq=r.map(seqOf);const byTs=ts.some(v=>v!=null),bySq=sq.every(v=>v!=null);if(!byTs&&!bySq)return r;
  return r.map((x,i)=>({x,i,t:ts[i],q:sq[i]})).sort((a,b)=>byTs?((b.t||0)-(a.t||0)||(b.q||0)-(a.q||0)||a.i-b.i):((b.q-a.q)||a.i-b.i)).map(z=>z.x);}
 function rowsAll(){let r=rowsRaw();
  Object.keys(S.f).forEach(k=>{const q=String(S.f[k]||'').trim();if(!q)return;const c=o.cols.find(c=>c.k===k)||{k};r=r.filter(x=>hit(colVal(c,x),q,c));});
  if(S.sort){const c=o.cols.find(c=>c.k===S.sort);if(c){const val=x=>c.sortv?c.sortv(x):colVal(c,x);r.sort((a,b)=>natCmp(val(a),val(b))*S.dir);}}
  if(!S.sort&&o.order!=='keep'&&!o.select)r=newestFirst(r);
  return r;}
 /* options of a select filter: given list, else the distinct values currently in the data (status columns) */
 function optsOf(c){if(c.opts)return c.opts;const set=[];rowsRaw().forEach(x=>{const v=String(colVal(c,x)==null?'':colVal(c,x)).trim();if(v&&set.indexOf(v)<0)set.push(v);});return set.sort(natCmp);}
 const cols=()=>{let C_=o.cols;if(o.actions&&!C_.some(c=>c.k==='_act')){C_=C_.concat([{k:'_act',h:'Action',cls:'act',sortable:false,noFilter:true,render:r=>{const a=o.actions;const can=k=>typeof a[k]==='function'&&(!a.can||a.can(k,r));const f={view:can('view'),edit:can('edit'),del:can('del')};(a.defs||[]).forEach(d=>{f[d[0]]=can(d[0]);});return UI.actions(f,{id:o.key?r[o.key]:'',name:a.name?a.name(r):'',labels:a.labels,defs:a.defs});}}]);}return C_;};
 function render(){
  const C=cols();const ps=o.pageSize||10;const all=o.state?[]:rowsAll();const total=all.length;const pages=Math.max(1,Math.ceil(total/ps));if(S.page>pages)S.page=pages;
  const view=o.paged===false?all:all.slice((S.page-1)*ps,S.page*ps);
  let t='<div class="tbl-scroll"><table'+(o.minw?' style="min-width:'+o.minw+'px"':'')+(o.label?' aria-label="'+esc(o.label)+'"':'')+'><thead><tr>';
  if(o.select)t+='<th class="selc" scope="col">'+(o.single?'':'<input type="checkbox" class="cbx" data-all aria-label="Select all on page">')+'</th>';
  C.forEach((c,i)=>{const s=S.sort===c.k;t+='<th scope="col" class="'+(c.cls||'')+(c.sortable===false?'':' sortable')+'"'+(c.w?' style="width:'+c.w+'px;min-width:'+c.w+'px"':'')+(s?' aria-sort="'+(S.dir>0?'ascending':'descending')+'"':'')+'>'+(c.sortable===false||c.k==='_act'?esc(c.h):'<button type="button" class="thbtn" data-sort="'+c.k+'">'+esc(c.h)+'<span class="si">'+ic(s?(S.dir>0?'up':'down'):'sort','s12')+'</span></button>')+'</th>';});
  t+='</tr>';
  if(o.filters!==false){t+='<tr class="colfilter">'+(o.select?'<td class="selc"></td>':'')+C.map(c=>{const no=c.noFilter||c.k==='_act';
   if(no)return '<td class="'+(c.cls||'')+'">'+(c.k==='_act'&&o.clearAll?'<button type="button" class="btn sm colclr" data-clearall>Clear</button>':'')+'</td>';
   return '<td class="'+(c.cls||'')+'"><input type="search" data-f="'+c.k+'" value="'+esc(S.f[c.k]||'')+'" aria-label="Search '+esc(c.h)+'"></td>';}).join('')+'</tr>';}
  t+='</thead><tbody>';
  const span=C.length+(o.select?1:0);
  if(o.state==='loading')t+=Array.from({length:6}).map(()=>'<tr class="skr">'+(o.select?'<td></td>':'')+C.map(()=>'<td><span class="u-height-14-width-80 sk"></span></td>').join('')+'</tr>').join('');
  else if(o.state==='error')t+='<tr><td colspan="'+span+'"><div class="tbl-msg">'+ic('x-circle')+'<b>'+esc(o.errorText||'Could not load data')+'</b><button type="button" class="btn sm" data-retry>'+ic('refresh')+'Retry</button></div></td></tr>';
  else if(!total){const anyF=Object.values(S.f).some(v=>v&&String(v).trim());t+='<tr><td colspan="'+span+'"><div class="tbl-msg">'+(anyF?'<b>No matching results</b><button type="button" class="btn sm" data-clear>Clear filters</button>':'<b>'+esc((o.empty&&o.empty.text)||'No data yet')+'</b>'+(o.empty&&o.empty.action?'<button type="button" class="btn sm primary" data-empty>'+esc(o.empty.action)+'</button>':''))+'</div></td></tr>';}
  else view.forEach(r=>{const k=o.key?r[o.key]:'';const sel=S.sel.has(k);t+='<tr'+(o.rowCls?' class="'+(o.rowCls(r)||'')+(sel?' sel':'')+'"':(sel?' class="sel"':''))+' data-k="'+esc(k)+'"'+(o.onRow?' tabindex="0"':'')+'>'+(o.select?'<td class="selc"><input type="'+(o.single?'radio" name="sel-'+esc(o.key||'k'):'checkbox')+'" class="cbx" data-sel="'+esc(k)+'"'+(sel?' checked':'')+(o.selectable&&!o.selectable(r)?' disabled':'')+' aria-label="Select row"></td>':'')+
   C.map(c=>{const v=c.render?c.render(r):esc(colVal(c,r));const tt=c.title?c.title(r):(c.ell?colVal(c,r):null);return '<td class="'+(c.cls||'')+(c.ell?' ell':'')+'"'+(tt?' title="'+esc(tt)+'"':'')+(c.ell?' style="max-width:'+(c.w||220)+'px"':'')+'>'+(v==null||v===''?'<span class="mut">-</span>':v)+'</td>';}).join('')+'</tr>';});
  t+='</tbody></table></div>';
  if(o.paged!==false){const a=total?((S.page-1)*ps+1):0,b=Math.min(total,S.page*ps);
   let pg='';const win=[];for(let i=1;i<=pages;i++){if(i===1||i===pages||Math.abs(i-S.page)<=1)win.push(i);else if(win[win.length-1]!=='...')win.push('...');}
   pg=win.map(i=>i==='...'?'<span class="mut">...</span>':'<button type="button" class="pgbtn'+(i===S.page?' on':'')+'" data-pg="'+i+'"'+(i===S.page?' aria-current="page"':'')+'>'+i+'</button>').join('');
   t+='<div class="pager"><span class="tnum">'+(o.showing?'Showing '+a+'–'+b+' of '+total:a+'-'+b+' of '+total)+'</span>'+(o.select&&S.sel.size?'<span class="tx">'+S.sel.size+' selected</span>':'')+'<span class="sp"></span><button type="button" class="pgbtn" data-pg="'+(S.page-1)+'"'+(S.page<=1?' disabled':'')+' aria-label="Previous page">'+ic('left')+'</button>'+pg+'<button type="button" class="pgbtn" data-pg="'+(S.page+1)+'"'+(S.page>=pages?' disabled':'')+' aria-label="Next page">'+ic('right')+'</button></div>';}
  const ae=document.activeElement;const focusF=ae&&ae.dataset&&ae.dataset.f&&host.contains(ae)?ae.dataset.f:null;const caret=focusF&&ae.selectionStart!=null?ae.selectionStart:0;
  const _sc0=o.keepScroll?host.querySelector('.tbl-scroll'):null;const _sTop=_sc0?_sc0.scrollTop:0;
  host.innerHTML=t;
  if(focusF){const f=host.querySelector('[data-f="'+focusF+'"]');if(f){f.focus();try{f.setSelectionRange(caret,caret);}catch(e){}}}
  $$('[data-sort]',host).forEach(b=>b.onclick=()=>{if(S.sort===b.dataset.sort){if(o.sort3&&S.dir<0){S.sort=null;S.dir=1;}else S.dir=-S.dir;}else{S.sort=b.dataset.sort;S.dir=1;}render();});
  $$('[data-f]',host).forEach(i=>{const ev=i.tagName==='SELECT'?'onchange':'oninput';i[ev]=()=>{S.f[i.dataset.f]=i.value;S.page=1;render();};});
  if(o.onFilter)o.onFilter(S.f);
  $$('[data-pg]',host).forEach(b=>b.onclick=()=>{S.page=+b.dataset.pg;render();});
  const cl=$('[data-clear]',host);if(cl)cl.onclick=()=>{S.f={};render();};
  const ca=$('[data-clearall]',host);if(ca)ca.onclick=()=>{S.f={};S.page=1;render();};
  const em=$('[data-empty]',host);if(em&&o.empty.fn)em.onclick=o.empty.fn;
  const rt=$('[data-retry]',host);if(rt&&o.onRetry)rt.onclick=o.onRetry;
  if(o.actions)UI.wireActions(host,(kind,id)=>{const row=rowsRaw().find(r=>String(r[o.key])===String(id));if(row&&typeof o.actions[kind]==='function')o.actions[kind](row,id);});
  $$('[data-sel]',host).forEach(c=>c.onchange=()=>{if(o.single)S.sel.clear();c.checked?S.sel.add(c.dataset.sel):S.sel.delete(c.dataset.sel);if(o.onSelect)o.onSelect(S.sel);render();});
  const all_=$('[data-all]',host);if(all_){all_.checked=view.length&&view.every(r=>S.sel.has(r[o.key]));all_.onchange=()=>{view.forEach(r=>{if(o.selectable&&!o.selectable(r))return;all_.checked?S.sel.add(r[o.key]):S.sel.delete(r[o.key]);});if(o.onSelect)o.onSelect(S.sel);render();};}
  if(o.onRow)$$('tbody tr[data-k]',host).forEach(tr=>{tr.onclick=e=>{if(e.target.closest('button,a,input,select,label'))return;o.onRow(tr.dataset.k);};tr.onkeydown=e=>{if(e.key==='Enter'&&e.target===tr)o.onRow(tr.dataset.k);};});
  if(o.after)o.after(host);
  if(o.keepScroll&&_sTop){const _sc1=host.querySelector('.tbl-scroll');if(_sc1)_sc1.scrollTop=_sTop;}
  TICK.now();}
 S.render=render;S.filtered=()=>rowsAll();S.pageRows=()=>{const ps=o.pageSize||10;return rowsAll().slice((S.page-1)*ps,S.page*ps);};
 render();return S;}
/* Date fields: every native date input is shown as "Wed, 14 Oct 2026" (value stays ISO). The real input sits on top, transparent,
   so ids, .value, change events, validation and keyboard all keep working. */
function enhanceDates(root){$$('input[type=date].input:not([data-enh])',root||document).forEach(inp=>{inp.dataset.enh='1';const w=document.createElement('span');w.className='dateinp';
 if(inp.style.width){w.style.width=inp.style.width;inp.style.width='';}inp.parentNode.insertBefore(w,inp);const lab=document.createElement('span');lab.className='dv';w.appendChild(lab);w.insertAdjacentHTML('beforeend',ic('calendar'));w.appendChild(inp);
 const upd=()=>{lab.textContent=inp.value?UI.fdate(inp.value,{dow:1}):'dd/mm/yyyy';lab.classList.toggle('ph',!inp.value);w.classList.toggle('dis',inp.disabled);w.classList.toggle('err',inp.classList.contains('err'));};
 upd();inp.addEventListener('input',upd);inp.addEventListener('change',upd);inp.addEventListener('click',()=>{try{inp.showPicker();}catch(e){}});new MutationObserver(upd).observe(inp,{attributes:true,attributeFilter:['class','disabled','value']});});}
function startDateEnhancer(){enhanceDates(document);new MutationObserver(ms=>{for(const m of ms){if(m.addedNodes.length){enhanceDates(document);break;}}}).observe(document.body,{childList:true,subtree:true});}
if(document.body)startDateEnhancer();else document.addEventListener('DOMContentLoaded',startDateEnhancer);
window.C={$,$$,h,DLG,toast,banner,TICK,field,setErr,opts,table,enhanceDates,natCmp,normT};
})();

/* tables inside dialogs (import errors, validation results): a search box per column, added to every table.fltr */
(function(){function enh(t){if(t.dataset.f)return;t.dataset.f='1';const hr=t.querySelector('thead tr');if(!hr)return;const fr=document.createElement('tr');fr.className='fltrow';
 [].forEach.call(hr.children,(th,i)=>{const c=document.createElement('th');c.innerHTML='<input class="input sm" data-fc="'+i+'" aria-label="Filter '+(th.textContent||'').replace(/"/g,'')+'" placeholder="Search">';fr.appendChild(c);});hr.parentNode.appendChild(fr);
 fr.addEventListener('input',()=>{const q=[].map.call(fr.querySelectorAll('input'),x=>x.value.trim().toLowerCase());[].forEach.call(t.tBodies[0].rows,r=>{r.hidden=q.some((v,i)=>v&&String(r.cells[i]?r.cells[i].textContent:'').toLowerCase().indexOf(v)<0);});});}
 function scan(){document.querySelectorAll('table.fltr').forEach(enh);}
 new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});})();