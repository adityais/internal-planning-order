/* C1 App shell + C2 View-as persona switcher + bell inbox + demo clock (fast-forward) + Reset demo data. */
(function(){
'use strict';
const {ic,esc,avatar}=UI;const {$,$$,DLG,toast}=C;
const MDP=MD.MDPATH;
/* ONE top navigation shared with the Master Data prototype (same 5 items, same order, all real links). Targets are role aware:
   Planning / Order & Delivery open the first page the current role may use; Timeline and Monitoring & Report are not built yet and open the not-available page. */
const TOP=[['timeline','Timeline'],['master','Master Data'],['planning','Planning'],['order','Order & Delivery'],['monitor','Monitoring & Report']];
function topHref(id){if(id==='timeline')return 'not-available.html?m=Timeline';if(id==='master')return MDP+'customer.html';if(id==='monitor')return 'not-available.html?m=Monitoring%20%26%20Report';
 const f=ROLES.first(id);return f?hrefFor(f):null;}
const PLAN_NAV=[
 ['Setup',[['project','Project Planning','file','project-planning.html'],['alloc','Resource Allocation','users','allocation.html'],['requests','Resource Requests','inbox','resource-requests.html'],['mref','Milkrun Reference','layers','milkrun-ref.html']]],
 ['Milkrun',[['milkrun','Milkrun Planning','gantt','milkrun-list.html'],['trips','Daily Trip Plan','calendar','trips.html']]],
 ];
const SHOW_READINESS=false;/* Readiness Board is hidden for now; set to true to show it here under Order & Delivery */
const ORDER_NAV=[[null,[['inbox','Order Management','inbox','order-inbox.html'],['dispatch','Trip Management','truck','dispatch.html'],['vendoravail','Daily Availability','calendar','vendor-availability.html']].concat(SHOW_READINESS?[['readiness','Readiness Board','clip-check','readiness.html']]:[])]];
const ALL_IDS=ROLES.AREA.planning.concat(ROLES.AREA.order);
function allowed(id,pk){return ROLES.canView(id,pk||STORE.persona());}
function hrefFor(id){if(id==='readiness'&&STORE.persona()==='fieldops')return 'readiness-tablet.html';const all=PLAN_NAV.concat(ORDER_NAV);for(const s of all)for(const i of s[1])if(i[0]===id)return i[3];if(id==='params')return 'admin.html#params';if(id==='templates')return 'milkrun-ref.html?tab=tpl';if(id==='tariff')return 'tolltariff.html';return 'index.html';}
function firstAllowed(pk){const id=ALL_IDS.find(i=>allowed(i,pk));return id?hrefFor(id):'not-available.html?m=Planning';}
function badges(){const today=STORE.today();let nr=0;try{DOM.tripsOf(today).forEach(t=>{const s=DOM.evaluate(t).state;if(s==='notready'||s==='exreq'||s==='replacing')nr++;});}catch(e){}
 const aq=STORE.get('orders').filter(o=>o.status==='Unfulfilled'||o.status==='Ready to Assign').length;return {readiness:nr,assign:aq};}
/* a PM does not get notices about another PM's plan */
function mineNote(n,pk){if(pk!=='pm')return true;const m=String(linkOf(n,pk)).match(/project-planning\.html\?id=(PP-\d+)/);if(!m)return true;const p=DOM.allPlans().find(x=>x.id===m[1]);return !p||p.pm===STORE.me().n;}
function bellCount(){const pk=STORE.persona();return STORE.get('notifications').filter(n=>mineNote(n,pk)&&!n.read&&n.kind==='Action Required'&&(n.to||[]).indexOf(pk)>=0).length;}
function sidebar(o,rail){const pk=STORE.persona();const pe=STORE.PERSONAS[pk];const def=o.module==='order'?ORDER_NAV:PLAN_NAV;const b=badges();
 let h='<aside class="side'+(rail?' rail':'')+'" aria-label="Section navigation"><div class="side-scroll">';
 def.forEach(sec=>{const items=sec[1].filter(i=>allowed(i[0]));if(!items.length)return;
  if(sec[0]&&!rail)h+='<div class="sec">'+sec[0]+'</div>';else h+='<div class="railgap"></div>';/* no group heading (Order & Delivery) or rail: a gap so the first item does not touch the top bar */
  h+='<nav aria-label="'+esc(sec[0]||'Order & Delivery')+'">'+items.map(i=>'<a href="'+hrefFor(i[0])+'" class="'+(i[0]===o.active?'on':'')+'"'+(i[0]===o.active?' aria-current="page"':'')+' title="'+i[1]+'">'+ic(i[2])+(rail?'<span class="sr">'+i[1]+'</span>':'<span>'+i[1]+'</span>')+(b[i[0]]?'<span class="cnt" data-badge="'+i[0]+'">'+b[i[0]]+'</span>':'')+'</a>').join('')+'</nav>';});
 h+='</div><div class="foot">';
 if(o.module!=='order'&&allowed('params'))h+='<nav aria-label="Settings"><a href="admin.html#params" class="'+(['params','tariff'].indexOf(o.active)>=0?'on':'')+'" title="Planning Config">'+ic('gear')+(rail?'<span class="sr">Planning Config</span>':'<span>Planning Config</span>')+'</a></nav>';
 h+='<div class="demo'+(rail?' r':'')+'"><div class="u-gap-6 row">'+(rail?'':'<span class="xs mut">Demo</span>')+'<span class="tnum b sm" data-clock></span></div><div class="u-gap-4 row">'+
  '<button type="button" class="btn sm'+(STORE.clock().speed>1?' on-ff':'')+'" id="ffBtn" title="Fast-forward x60" aria-pressed="'+(STORE.clock().speed>1)+'">'+ic('fast')+(rail?'':'x60')+'</button>'+
  '<button type="button" class="btn sm ghost" id="resetBtn" title="Reset demo data">'+ic('refresh')+(rail?'':'Reset')+'</button></div></div></div></aside>';
 return h;}
function mount(o){try{if(window.ASSIGNQ&&ASSIGNQ.sweep)ASSIGNQ.sweep();}catch(e){console.warn(e);}
 STORE.ensure();SHELL.pageId=o.id||null;
 const pk=STORE.persona();const pe=STORE.PERSONAS[pk];const rail=pe.device==='tablet'||o.device==='tablet'||window.innerWidth<1180;
 document.title=(o.title||'Planning')+' - MDI LOGISTIC';
 document.body.classList.toggle('tablet',pe.device==='tablet'||o.device==='tablet');
 let h='<a class="skip-link" href="#main">Skip to content</a><div class="app'+(rail?' is-rail':'')+'"><header class="appbar"><a class="logo" href="index.html" aria-label="MDI LOGISTIC home"><div class="mk">M</div><div class="nm">MDI LOGISTIC</div></a>';
 h+='<nav class="topnav" aria-label="Modules">'+TOP.map(t=>{const href=topHref(t[0]);if(!href)return '';if(pk==='vendor'&&['timeline','monitor'].indexOf(t[0])>=0)return '';/* vendor POV: only Master Data and Order & Delivery */return '<a href="'+href+'" class="'+(t[0]===o.module?'on':'')+'"'+(t[0]===o.module?' aria-current="true"':'')+'>'+t[1]+'</a>';}).join('')+'</nav><div class="sp"></div>';
 /* role switcher: current role + person, one click to change (same role map drives nav, tabs and actions: roles.js) */
 h+='<button type="button" class="viewas" id="viewAs" aria-haspopup="menu" aria-expanded="false" title="Switch role">'+ic('users')+'<span class="va"><small>Role</small><b>'+esc(pe.label)+'</b></span>'+ic('down','s12')+'</button>';
 if(!rail)h+='<div class="whoami"><b>'+esc(pe.n)+'</b><small>'+esc(pe.r)+'</small></div>';
 h+=avatar(pe.n,'onnavy');
 const bc=bellCount();h+='<button type="button" class="abtn" id="bellBtn" aria-label="Inbox, '+bc+' action required" aria-haspopup="dialog">'+ic('bell')+(bc?'<span class="badge">'+bc+'</span>':'')+'</button></header>';
 h+='<div class="workspace">'+sidebar(o,rail)+'<main class="main" id="main" tabindex="-1">';
 h+='<div class="pagehead"><div class="u-min-width-0 col">'+(o.crumb?'<div class="crumb">'+o.crumb+'</div>':'')+'<h1>'+esc(o.title)+'</h1></div>'+(o.meta?'<div class="meta">'+o.meta+'</div>':'')+'<div class="sp"></div><div class="u-gap-s2 row wrap" id="headActions">'+(o.actions||'')+'</div></div>';
 h+='<div class="content" id="content"></div></main></div></div>';
 const keep=['#toasts'].map(s=>document.querySelector(s)).filter(Boolean);
 document.body.innerHTML=h;keep.forEach(k=>document.body.appendChild(k));
 if(o.id&&!allowed(o.id)){$('#content').innerHTML='<div class="panel"><div class="empty">'+ic('lock','s24')+'<b>'+esc(pe.label)+' has no access to this page</b><a class="btn primary" href="'+firstAllowed()+'">Open my workspace</a></div></div>';$('#headActions').innerHTML='';wire();return false;}
 wire();return true;}
function wire(){
 $('#viewAs').onclick=e=>{e.stopPropagation();personaMenu();};
 $('#bellBtn').onclick=e=>{e.stopPropagation();inbox();};
 $('#ffBtn').onclick=()=>{const s=STORE.clock().speed>1?1:60;STORE.setSpeed(s);toast(s>1?'Fast-forward x60 on':'Real time');refreshFoot();};
 $('#resetBtn').onclick=async()=>{const ok=await DLG.confirm({title:'Reset demo data',body:'All changes in Planning and Order are cleared. Master Data is not touched.',ok:'Reset',danger:true});if(ok){STORE.reset();location.reload();}};
 C.TICK.now();}
function refreshFoot(){const b=$('#ffBtn');if(!b)return;const on=STORE.clock().speed>1;b.classList.toggle('on-ff',on);b.setAttribute('aria-pressed',on);}
function personaMenu(){const ex=$('#pmenu');if(ex){ex.remove();$('#viewAs').setAttribute('aria-expanded','false');return;}
 const cur=STORE.persona();const m=C.h('<div class="menu pmenu" id="pmenu" role="menu" aria-label="Switch role"><div class="u-padding-6-8 sect">Switch role</div>'+
  STORE.MENU.map(k=>{const p=STORE.PERSONAS[k];return '<button type="button" role="menuitemradio" aria-checked="'+(k===cur)+'" class="mi'+(k===cur?' on':'')+'" data-p="'+k+'">'+avatar(p.n)+'<span class="u-line-height-1p25-text-align-left col"><b class="sm">'+esc(p.label)+'</b><span class="xs mut">'+esc(p.n)+'</span></span>'+(k===cur?'<span class="ck">'+ic('check')+'</span>':'')+'</button>';}).join('')+'</div>');
 document.body.appendChild(m);$('#viewAs').setAttribute('aria-expanded','true');m.querySelector('.mi').focus();
 $$('[data-p]',m).forEach(b=>b.onclick=()=>{const k=b.dataset.p;STORE.setPersona(k);STORE.audit({action:'View as '+STORE.PERSONAS[k].label,type:'Prototype',obj:'Shell'});
  const pg=document.body.dataset.page;const pe=STORE.PERSONAS[k];
  if(k==='fieldops'&&pg==='readiness')location.href='readiness-tablet.html';else if(k!=='fieldops'&&pg==='readiness-tablet')location.href='readiness.html';
  else if(SHELL.pageId&&!allowed(SHELL.pageId,k))location.href=firstAllowed(k);else location.reload();});
 m.addEventListener('keydown',e=>{const it=$$('.mi',m);const i=it.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();it[(i+1)%it.length].focus();}if(e.key==='ArrowUp'){e.preventDefault();it[(i-1+it.length)%it.length].focus();}if(e.key==='Escape'){m.remove();$('#viewAs').focus();}});
 setTimeout(()=>document.addEventListener('click',function c(e){if(!m.contains(e.target)){m.remove();$('#viewAs')&&$('#viewAs').setAttribute('aria-expanded','false');document.removeEventListener('click',c);}}),0);}
/* a notification link is a string, or {default, <role>: ...} when a role has to land on another page than the others */
function linkOf(n,pk){const l=n.link;return !l?'':typeof l==='object'?(l[pk]||l.default||''):l;}
function inbox(){const pk=STORE.persona();const list=STORE.get('notifications').filter(n=>(n.to||[]).indexOf(pk)>=0&&mineNote(n,pk));
 const body=list.length?list.map(n=>'<div class="inb'+(n.read?'':' unread')+'" data-nid="'+n.id+'" role="link" tabindex="0" style="cursor:pointer"><span class="avatar" style="background:'+(n.kind==='Action Required'?'var(--amber-s);color:var(--amber-t)':'var(--slate-s);color:var(--slate-t)')+'">'+ic(n.kind==='Action Required'?'alert':'info')+'</span><div class="u-min-width-0-flex-1 col"><b class="sm">'+esc(n.title)+'</b><span class="xs mut">'+esc(n.kind)+' &middot; '+UI.fdt(n.ts)+'</span></div><button type="button" class="btn sm" data-open aria-label="Open "'+esc(n.title)+'>Open</button></div>').join(''):'<div class="empty"><b>No messages</b></div>';
 const L=DLG.drawer({title:'Inbox',sub:list.filter(n=>!n.read).length+' unread',width:420,body,cls:'inboxdrawer',buttons:[{label:'Mark all read',onClick:()=>{const a=STORE.get('notifications');a.forEach(n=>{if((n.to||[]).indexOf(pk)>=0)n.read=true;});STORE.set('notifications',a);location.reload();}},{label:'Close',kind:'primary'}]});
 $$('[data-nid]',L.el).forEach(a=>{const go=()=>{const all=STORE.get('notifications');const n=all.find(x=>x.id===a.dataset.nid);if(!n)return;n.read=true;STORE.set('notifications',all);const lk=linkOf(n,pk);L.close();if(lk)location.href=lk;};a.onclick=go;a.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};});}
/* live refresh of badge counts */
STORE.subscribe('*',()=>{const b=badges();$$('[data-badge]').forEach(e=>{const v=b[e.dataset.badge];e.textContent=v;e.hidden=!v;});const bb=$('#bellBtn');if(bb){const n=bellCount();const s=bb.querySelector('.badge');if(n){if(s)s.textContent=n;else bb.insertAdjacentHTML('beforeend','<span class="badge">'+n+'</span>');}else if(s)s.remove();}refreshFoot();});
/* Planning Config tabs: Parameters | Toll Tariff (each is its own page, the tab bar links them; a tab shows only for roles that may open it) */
function cfgTabs(active){const T=[['params','Parameters','admin.html#params'],['tariff','Toll Tariff','tolltariff.html']].filter(t=>allowed(t[0]));return '<div class="tabs" role="tablist">'+T.map(t=>'<button type="button" role="tab" aria-selected="'+(t[0]===active)+'" class="'+(t[0]===active?'on':'')+'" data-cfg="'+t[2]+'">'+t[1]+'</button>').join('')+'</div>';}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cfg]');if(b)location.href=b.dataset.cfg;});
window.SHELL={linkOf,cfgTabs,mount,allowed,hrefFor,firstAllowed,topHref,TOP,PLAN_NAV,ORDER_NAV,pageId:null};
})();
