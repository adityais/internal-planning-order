/* Page-level shared helpers (stepper, stat block, tabs, misc). */
(function(){
'use strict';
const {ic,esc}=UI;
function stepper(steps,a,o){o=o||{};return '<nav class="stepper" aria-label="Steps">'+steps.map((s,i)=>{const cls='step '+(i<a?'done':i===a?'on':'');const inner='<span class="n">'+(i<a?ic('check'):i+1)+'</span><span>'+esc(s)+(o.sub&&o.sub[i]?'<span class="u-display-block-font-weight-500 xs mut">'+esc(o.sub[i])+'</span>':'')+'</span>';
 return (o.href&&o.href[i]?'<a class="u-text-decoration-none '+cls+'" href="'+o.href[i]+'"'+(i===a?' aria-current="step"':'')+'>'+inner+'</a>':'<div class="'+cls+'"'+(i===a?' aria-current="step"':'')+'>'+inner+'</div>')+(i<steps.length-1?'<div class="stepline'+(i<a?' done':'')+'"></div>':'');}).join('')+'</nav>';}
document.addEventListener('click',e=>{const x=e.target.closest&&e.target.closest('.statblock [data-href]');if(x)location.href=x.dataset.href;});
function stats(items){return '<div class="statblock">'+items.map(s=>'<div'+(s.id?' id="'+s.id+'"':'')+(s.href?' data-href="'+s.href+'" role="link" tabindex="0" style="cursor:pointer"':'')+'><div class="k">'+(s.icon?ic(s.icon,'s12'):'')+esc(s.k)+'</div><div class="v'+(s.tone?' '+s.tone:'')+'">'+s.v+'</div>'+(s.d?'<div class="d">'+s.d+'</div>':'')+'</div>').join('')+'</div>';}
function tabs(items,active,attr){attr=attr||'data-tab';return '<div class="tabs" role="tablist">'+items.map(t=>'<button type="button" role="tab" aria-selected="'+(t[0]===active)+'" class="'+(t[0]===active?'on':'')+'" '+attr+'="'+t[0]+'">'+esc(t[1])+(t[2]!=null&&t[2]!==''?' <span class="cnt'+(t[3]?'':' n')+'">'+t[2]+'</span>':'')+'</button>').join('')+'</div>';}
function seg(items,active,attr,o){o=o||{};return '<div class="seg'+(o.t44?' t44':'')+(o.choice?' choice':'')+'" role="radiogroup"'+(o.label?' aria-label="'+esc(o.label)+'"':'')+'>'+items.map(t=>'<button type="button" role="radio" aria-checked="'+(t[0]===active)+'" class="'+(t[0]===active?'on':'')+'" '+(attr||'data-seg')+'="'+t[0]+'"'+(t[2]?' disabled title="'+esc(t[2])+'"':'')+'>'+(t[3]?ic(t[3],'s12'):'')+esc(t[1])+'</button>').join('')+'</div>';}
function hash(){return (location.hash||'').replace('#','');}
function bar(label,a,b,o){o=o||{};const p=b?Math.min(100,a/b*100):0;return '<div class="barrow" style="grid-template-columns:'+(o.lw||(o.type?160:96))+'px 1fr 84px"><span class="u-color-text k">'+(o.type?UI.typeChips(label):esc(label))+'</span><div class="tr'+(o.short?' over':o.hi?' hi':'')+'"><i style="width:'+p+'%"></i></div><span class="v">'+a+' / '+b+'</span></div>';}
function empty(text,btn,id){return '<div class="panel"><div class="empty"><b>'+esc(text)+'</b>'+(btn?'<button type="button" class="btn primary"'+(id?' id="'+id+'"':'')+'>'+esc(btn)+'</button>':'')+'</div></div>';}
function skel(n){return '<div class="panel"><div class="u-gap-10 body col">'+Array.from({length:n||8}).map(()=>'<div class="u-gap-12 row"><span class="u-height-28-width-120 sk"></span><span class="u-height-28-flex-1 sk"></span><span class="u-height-28-width-100 sk"></span></div>').join('')+'</div></div>';}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}
/* Adit: one entity per value. Customer select, then Project select filtered by that customer.
   list: [{v (value), customer, name}]; o: {idC, idP, cls, auto (pick the first project when the customer changes), dis, phC, phP (placeholder option text; default "Select customer"/"Select project")} */
function cpSel(list,val,o){const cur=list.find(x=>x.v===val);const cust=o.cust!=null?o.cust:(cur?cur.customer:'');const custs=[...new Set(list.map(x=>x.customer))].sort();
 const a='<select class="select '+(o.clsC||'')+'" id="'+o.idC+'" aria-label="Customer"'+(o.dis?' disabled':'')+'>'+C.opts(custs,cust,cust?null:(o.phC||'Select customer'))+'</select>',b='<select class="select '+(o.clsP||'')+'" id="'+o.idP+'" aria-label="Project"'+(o.dis?' disabled':'')+'>'+C.opts(list.filter(x=>x.customer===cust).map(x=>[x.v,x.name]),val,cur?null:(o.phP||'Select project'))+'</select>';return o.parts?[a,b]:a+b;}
function cpWire(root,list,o,onPick){const c=root.querySelector('#'+o.idC),p=root.querySelector('#'+o.idP);if(!c||!p)return;
 c.onchange=()=>{const ps=list.filter(x=>x.customer===c.value);const pick=(o.auto||ps.length===1)&&ps[0]?ps[0].v:'';p.innerHTML=C.opts(ps.map(x=>[x.v,x.name]),pick,pick?null:(o.phP||'Select project'));onPick(pick||null,c.value);};
 p.onchange=()=>onPick(p.value||null,c.value);}
window.PL={stepper,stats,tabs,seg,hash,bar,empty,skel,delay,cpSel,cpWire};
})();
