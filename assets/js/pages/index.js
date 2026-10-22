/* Launcher: module map with live counts, persona, demo clock, reset. */
(function(){
const {ic,esc}=UI;const {$,$$}=C;
SHELL.mount({module:'planning',title:'Planning & Order Management',crumb:'MDI LOGISTIC',actions:'<a class="btn" href="foundations.html">'+ic('layers')+'Foundations</a><a class="btn" href="tests/selftest.html">'+ic('check-circle')+'Self-test</a>'});
function counts(){const o=STORE.get('orders'),t=STORE.get('trips'),today=STORE.today();const n=f=>o.filter(f).length;
 return {project:DOM.plans().filter(p=>p.status==='Pending PM').length+' PM Assignment',alloc:UI.plural(STORE.get('resourceRequests').filter(r=>r.status==='Open').length,'open request'),
  milkrun:STORE.get('milkrunPlans').length+' plans',trips:t.filter(x=>x.type==='MR'&&x.date===UI.addDays(today,1)).length+' trips H+1',
  dispatch:t.filter(x=>x.type==='DT'&&x.date===UI.addDays(today,1)).length+' trips H+1',readiness:t.filter(x=>x.date===today).length+' trips today',
  inbox:n(x=>ORD.capStatus(x)==='Draft')+' drafts, '+n(x=>['Ready to Assign','Assigning','Re-sourcing','Unfulfilled'].indexOf(x.status)>=0)+' to assign',
  tariff:STORE.get('tollTariff').length+' rows',exc:STORE.get('exceptions').filter(x=>!x.decision).length+' pending'};}
const M=[
 ['Setup',[['project-planning.html','Project Planning','project'],['allocation.html','Resource Allocation','alloc'],['milkrun-ref.html','Milkrun Reference','mref']]],
 ['Milkrun',[['milkrun-list.html','Milkrun Planning','milkrun'],['milkrun-step5.html?plan=MP-2026-0047','Schedule & Chaining','milkrun',''],['trips.html','Daily Trip Plan','trips']]],
 ['Direct Delivery',[['dispatch.html','Trip Management','dispatch'],['convert.html','Convert to Trip','dispatch','']]],
 ['Daily Ops',[['readiness-tablet.html','Field Ops check-in','readiness',''],['exceptions.html','Exception approval','readiness','exc'],['exceptions-phone.html','PM inbox (phone)','readiness','']]],
 ['Order & Delivery',[['order-inbox.html','Order Management','inbox']]],
 ['Admin',[['admin.html#params','Planning Config','params']]]];
function paint(){const pe=STORE.me();const md=MD.get();const live=Object.entries(md.src).filter(e=>e[1]).map(e=>e[0]);const cn=counts();
  $('#content').innerHTML='<div class="u-grid-template-columns-2fr-1fr-align-items-start grid2"><div class="stack">'+M.map(s=>{const items=s[1].filter(p=>SHELL.allowed(p[2]));if(!items.length)return '';return '<section><h2 class="sect mb2">'+s[0]+'</h2><div class="tiles">'+
  items.map(p=>{const ck=p.length>3?p[3]:p[2];return '<a class="pick tile" href="'+p[0]+'"><b>'+p[1]+'</b>'+(ck&&cn[ck]?'<span class="sm mut tnum">'+cn[ck]+'</span>':'')+'</a>';}).join('')+'</div></section>';}).join('')+'</div>'+
  '<div class="stack"><div class="panel"><div class="panel-hd"><h3>Demo</h3></div><div class="body col gap3"><div class="row"><span class="mut">Now</span><span class="sp"></span><b class="tnum" data-clock></b></div>'+
  '<div class="row gap2 wrap"><button type="button" class="btn" id="j15">+15 min</button><button type="button" class="btn" id="j60">+1 hour</button><button type="button" class="btn" id="ff">'+ic('fast')+'x60</button></div>'+
  '<div class="row"><span class="mut">Role</span><span class="sp"></span><b>'+esc(pe.label)+'</b></div>'+
  '<button type="button" class="btn danger-o" id="rs">'+ic('refresh')+'Reset demo data</button></div></div>'+
  '<div class="panel"><div class="panel-hd"><h3>Master Data</h3><span class="sp"></span>'+UI.status(live.length?'Live':'Snapshot',live.length?'green':'slate')+'</div><div class="body col gap2">'+(live.length?'<div class="row wrap gap1">'+live.map(k=>UI.tag(k,'slate')).join('')+'</div>':'')+'<a class="btn" href="'+MD.MDPATH+'vehicle.html">'+ic('external')+'Open Master Data</a></div></div></div></div>';
 $('#j15').onclick=()=>{STORE.jump(15);C.toast('Clock +15 min');};$('#j60').onclick=()=>{STORE.jump(60);C.toast('Clock +1 hour');};
 $('#ff').onclick=()=>{const s=STORE.clock().speed>1?1:60;STORE.setSpeed(s);C.toast(s>1?'Fast-forward x60 on':'Real time');};
 $('#rs').onclick=async()=>{const ok=await C.DLG.confirm({title:'Reset demo data',body:'All Planning and Order changes are cleared.',ok:'Reset',danger:true});if(ok){STORE.reset();location.reload();}};}
paint();['orders','trips','exceptions','projectPlans','resourceRequests','tollTariff'].forEach(e=>STORE.subscribe(e,()=>{if(!C.DLG.layers.length)paint();}));
})();
