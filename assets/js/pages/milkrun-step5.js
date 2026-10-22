/* Milkrun Step 5: Schedule & Chaining. Engine-driven cycle table (inline edits, Manual cells, resets),
   unit/driver swaps with "Truck not possible" and "Duty > 12h" dialogs, infeasible window state,
   Route Toll editor, cost drawer per cycle, read-only Gantt (units by vehicle type, drivers by report band). */
(function(){
const {ic,esc,tag,ps,hm}=UI;const {$,$$,DLG,toast,banner}=C;
const STEPS=['Plan Info','Volume & Matrix','Route Grouping','Result','Schedule & Chaining','Resource & Review'];
const pid=UI.q('plan','MP-2026-0047');let p=MR.byId(pid);if(!p){location.href='milkrun-list.html';return;}
const ro=()=>!STORE.can('plan')||['Published','Superseded','Closed','Cancelled'].indexOf(p.status)>=0;
const dgs=MR.dayGroups(p);let dg=UI.q('dg',dgs.find(d=>!d.disabled).id);let route=UI.q('route',null);let sch=null;let gRoute='all';const collapsed={};
/* D81 + §12.4: Step 5 shows route-local slots only (Unit A, Driver A). The same label may appear on another
   Route Group; real plates and driver names are resolved per slot, per date at H-1 in Daily Trip Plan. */
const DL=(id,rt)=>rt&&sch&&sch.driverSlotByRoute&&sch.driverSlotByRoute[rt]?(sch.driverSlotByRoute[rt][id]||DOM.drvLabel(id)):DOM.drvLabel(id);
const SL=pl=>DOM.unitLabel(sch,pl);
function unitOpts(c){const list=sch.units.filter(u=>u.vt===c.vtype);return list.map(u=>'<option value="'+esc(u.plate)+'"'+(u.plate===c.unit?' selected':'')+'>'+esc(DOM.unitLabelFor(sch,c.route,u.plate))+'</option>').join('')+'<option value="__new">New slot</option>';}
function newPlate(vt){const used=new Set(sch.units.map(u=>u.plate));const free=(DOM.allocUnits(sch.project.code)[vt]||[]).find(x=>!used.has(x));if(free)return free;let n=1;while(used.has('Short '+n))n++;return 'Short '+n;}
const AX0=180,AX1=1560;/* 03:00 to 02:00 (+1); fit the 23 h axis at 1440, scroll horizontally below that */const PX=Math.max(36,Math.min(46,Math.floor((window.innerWidth-(window.innerWidth<1180?72:230)-48-222)/23)));const X=m=>(Math.max(AX0,Math.min(AX1,m))-AX0)/60*PX;const W=(AX1-AX0)/60*PX;
function mount(){const pub=ro();
 SHELL.mount({module:'planning',id:'milkrun',active:'milkrun',title:'Milkrun Plan '+p.key,crumb:'<a href="milkrun-list.html">Milkrun Planning</a> / '+esc(p.project+', '+MR.rangeLabel(p)),meta:ps(p.status)+' <span id="saved">'+(pub?p.status:'Draft saved '+(UI.iso(new Date(p.updatedAt))===STORE.today()?UI.ftime(p.updatedAt):UI.fdt(p.updatedAt)))+'</span>',
  actions:'<button type="button" class="btn" id="hist">'+ic('history')+'History</button>'+(pub?'<button type="button" class="btn" id="exs">'+ic('download')+'Schedule</button>'+(STORE.can('plan')&&p.status==='Published'?'<button type="button" class="btn" id="rev">'+ic('pencil')+'Revise</button>':''):'<button type="button" class="btn" id="sd">Save draft</button>')+'<a class="btn" href="milkrun-wizard.html?plan='+p.id+'&step=4">'+ic('left')+'Result</a><button type="button" class="btn primary" id="rr">Resource &amp; Review'+ic('right')+'</button>'});}
function save(action,detail,type,o){/* §12.3: a cycle/time/slot change invalidates the previously signalled readiness */
 if(!(o&&o.ready)&&type!=='Cost')MR.invalidate(p,action);
 p.updatedAt=STORE.now();MR.save(p,action,detail,type||'Schedule');p=MR.byId(pid);const s=$('#saved');if(s&&!ro())s.textContent='Draft saved '+(UI.iso(new Date(p.updatedAt))===STORE.today()?UI.ftime(p.updatedAt):UI.fdt(p.updatedAt));}
const E=()=>{p.edits=p.edits||{};p.edits[dg]=p.edits[dg]||{};return p.edits[dg];};
function setEdit(r,c,k,v){const e=E();e[r]=e[r]||{};e[r][c]=e[r][c]||{};if(v==null)delete e[r][c][k];else e[r][c][k]=v;if(!Object.keys(e[r][c]).length)delete e[r][c];}
function compute(){sch=DOM.planSchedule(p,dg,{fresh:true});if(!route||!sch.routes.find(r=>r.id===route))route=sch.routes[0].id;}
/* ---------------- page ---------------- */
async function render(loading){mount();wireHead();
 const pr=MD.project(p.projectId);
 let h=PL.stepper(STEPS,4,{href:STEPS.map((s,i)=>i===4?null:'milkrun-wizard.html?plan='+p.id+'&step='+(i+1))})+
  
  ''+
  '<div class="mt3" id="stats"></div><div class="row gap2 mt3">'+PL.seg(dgs.map(d=>[d.id,d.label+(d.disabled?' No hours':''),d.disabled?'No hours':null]),dg,'data-dg',{label:'Day group'})+'<span class="sm mut">'+(()=>{const w=DOM.win(pr,dg);return w?'Open '+hm(w[0])+' - '+hm(w[1]):''})()+'</span><span class="sp"></span>'+(ro()?'':'<button type="button" class="btn sm" id="resetAll">'+ic('undo')+'Reset all to calculated</button>')+'</div>'+
  '<div id="rtabs" class="mt3"></div><div id="rbody" class="stack mt3"></div><div id="gantt" class="mt4"></div>';
 $('#content').innerHTML=h;
 $$('[data-dg]').forEach(b=>b.onclick=()=>{if(b.disabled)return;dg=b.dataset.dg;history.replaceState(null,'','?plan='+p.id+'&dg='+dg);render(true);});
 const ra=$('#resetAll');if(ra)ra.onclick=()=>{const n=Object.keys(E()).length;if(!n){toast('No manual edits');return;}DLG.confirm({title:'Reset all to calculated',body:'Manual times, units and drivers in '+dgs.find(d=>d.id===dg).label+' are cleared.',ok:'Reset all'}).then(ok=>{if(!ok)return;p.edits[dg]={};save('Reset all to calculated');paint();});};
 if(loading||UI.q('state')==='loading'){await skeleton();if(UI.q('state')==='loading')return;}
 paint();}
async function skeleton(){const n=DOM.planRoutes(p,dg).length;$('#stats').innerHTML=PL.stats(['Cycles','Units','Drivers','Breaches','Out of window','Manual edits'].map(k=>({k,v:'--'})));
 $('#rbody').innerHTML='<div class="panel"><div class="body"><div class="row gap2 mb3"><span class="sm b" id="prog">Route 1 of '+n+'</span></div>'+PL.skel(6).replace('<div class="panel">','<div>')+'</div></div>';$('#gantt').innerHTML='<div class="panel"><div class="body"><span class="u-height-220 sk"></span></div></div>';
 for(let i=1;i<=n;i++){const pg=$('#prog');if(pg)pg.textContent='Route '+i+' of '+n;await PL.delay(UI.q('state')==='loading'?99999:90);}}
function paint(){compute();stats();tabs();routeBody();gantt();}
function stats(){const s=sch.stats;$('#stats').innerHTML=PL.stats([{k:'Cycles',v:s.cycles},{k:'Units',v:s.units+' <small class="mut fs12">/ '+s.allocUnits+'</small>',tone:s.units>s.allocUnits?'bad':''},{k:'Drivers',v:s.drivers+' <small class="mut">/ '+s.allocDrivers+'</small>',tone:s.drivers>s.allocDrivers?'bad':''},{k:'Breaches',v:s.dutyBreaches+s.restBreaches+s.conflicts,tone:s.dutyBreaches+s.restBreaches+s.conflicts?'bad':''},{k:'Out of window',v:s.outside,tone:s.outside?'bad':''},{k:'Manual edits',v:s.manual,tone:s.manual?'warn':''}]);
 const rr=$('#rr');if(rr){rr.disabled=s.outside>0;rr.title=s.outside?'Fix cycles outside the window':'';}}
function tabs(){$('#rtabs').innerHTML='<div class="u-overflow-x-auto-padding-bottom-4 row gap2" role="tablist" aria-label="Route groups">'+sch.routes.map(r=>{const bad=!r.feasible;const t=(p.toll||{})[r.id];const tb=!t||!t.cond||(t.cond!=='none'&&DOM.tollEval(t,'CDD',p.period[0]).missing);
 return '<button type="button" role="tab" aria-selected="'+(r.id===route)+'" class="pick'+(r.id===route?' on':'')+'" style="flex:none;min-width:150px;flex-direction:column;align-items:flex-start;gap:2px;margin:0;'+(bad?'border-color:var(--red)':'')+'" data-route="'+r.id+'"><b class="sm">'+esc(r.id+' '+r.name)+'</b><span class="xs mut row gap1">'+r.cycles.length+' cycles'+(bad?' '+tag('Window','red','x-circle'):'')+(tb?' '+tag('Toll','amber','alert'):'')+'</span></button>';}).join('')+'</div>';
 $$('[data-route]').forEach(b=>b.onclick=()=>{route=b.dataset.route;tabs();routeBody();gantt();});}
function routeBody(){const r=sch.routes.find(x=>x.id===route);const ri=sch.routesIn.find(x=>x.id===route);const pr=sch.project;const B=$('#rbody');const can=!ro();
 let h='';
 if(!r.feasible)h+=banner('err','<b>'+r.cycles.length+' cycles do not fit the operating window.</b> Maximum that fits: '+r.maxFitRaw+' cycles',{acts:can?'<button type="button" class="btn sm" id="setmax">Set to '+r.maxFitRaw+' cycles</button><a class="btn sm" href="milkrun-ref.html?project='+p.projectId+'&tab=route">Change vehicle type</a>':''});
 const t=(p.toll||{})[route];const tev=DOM.tollEval(t,ri.vehicle.chassis,p.period[0]);
 if(!t||!t.cond||(t.cond!=='none'&&tev.missing))h+=banner('err','<b>'+esc(route)+' Route Toll Setup needs confirmed Entry → Exit gate pairs before Publish.</b> Set the Toll Condition (No / Mixed / Full) here in Step 5. Customer Project Toll Configuration is not the Milkrun route setup.',{sm:1,acts:'<a class="btn sm" href="tolltariff.html">Toll Gate &amp; Tariff master</a>'});
 h+='<div id="toll"></div>';
 const stops=r.cycles[0].stops;
 h+='<div class="panel"><div class="panel-hd"><h3>'+esc(r.id+' '+r.name)+'</h3>'+UI.typeChips(ri.vehicle.chassis+' '+ri.vehicle.body)+tag(ri.heijunka?'Every '+ri.heijunka+' min':'Even spread','slate')+tag(UI.num(r.km)+' km','slate')+'</div><div class="tbl-scroll"><table class="cyc" style="min-width:'+(640+stops.length*110)+'px"><thead><tr><th class="u-width-130 stc">Cycle</th><th>Out Pool</th>'+
  stops.map((s,i)=>'<th>'+(s.kind==='cust'?esc((s.loc.split(' ')[0])+' '+(s.loc.split(' ')[1]||'')):'S'+(i+1)+' '+esc(s.loc.replace(/^PT /,'').split(' ')[0]))+'</th>').join('')+'<th>In Pool</th><th>Unit slot</th><th>Driver slot</th><th class="num">UJ total</th><th class="act">Action</th></tr></thead><tbody>'+
  r.cycles.map(c=>{const cost=DOM.cycleCost(p,sch,c);const ed=((E()[route]||{})[c.cycle])||{};const day=(((c.out%1440)+1440)%1440)>=360&&(((c.out%1440)+1440)%1440)<1080;
   const cell=(key,val,calc,editable)=>{const man=ed[key]!=null;return editable&&can?'<span class="timecell'+(man?' manual':'')+'"><input aria-label="'+key+' cycle '+c.cycle+'" data-c="'+c.cycle+'" data-k="'+key+'" value="'+hm(val,{noDay:1})+'"'+(man?' title="calculated '+hm(calc,{noDay:1})+'"':'')+'>'+(man?'<span class="dot manual" title="Manual"></span><button type="button" class="u-width-22-height-22 iconbtn" data-rc="'+c.cycle+'" data-rk="'+key+'" aria-label="Reset cell" title="Reset to '+hm(calc,{noDay:1})+'">'+ic('undo','s12')+'</button>':'')+'</span>':'<span class="tnum'+(man?' amb':'')+'"'+(man?' title="calculated '+hm(calc,{noDay:1})+'"':'')+'>'+hm(val)+'</span>';};
   return '<tr class="'+(c.outside?'outside':'')+'"><td class="stc"><b>Cycle '+c.cycle+'</b>'+(c.outside?'<div>'+tag('Outside window','red','x-circle')+'</div>':c.manual?'<div>'+tag('Manual','amber','pencil')+'</div>':'')+(c.conflict?'<div>'+tag('Truck conflict','red','x-circle')+'</div>':'')+(c.dutyBreach?'<div>'+tag('Over 12h','red','x-circle')+'</div>':'')+'</td>'+
    '<td><span class="row gap1"><span class="faint" title="'+(day?'Day shift':'Night shift')+'">'+ic(day?'sun':'moon','s12')+'</span>'+cell('out',c.out,c.outCalc,true)+'</span></td>'+
    c.stops.map((s,i)=>'<td class="tnum">'+(s.kind==='cust'?'<b>':'')+cell('s'+i,s.in,s.in,s.kind!=='cust')+' - '+hm(s.out,{noDay:1})+(s.kind==='cust'?'</b>':'')+(c.outside&&s.kind==='cust'?'<div class="errtxt">Closes '+hm(sch.window[1])+'</div>':'')+'</td>').join('')+
    '<td class="tnum">'+hm(c.inPool)+'</td>'+
    '<td>'+(can&&!c.outside?'<select class="u-height-30-width-124-font-weight-700 select" data-unit="'+c.cycle+'" aria-label="Unit slot cycle '+c.cycle+'">'+unitOpts(c)+'</select>':'<b>'+esc(c.slotUnit||'-')+'</b>')+(ed.unit?'<span class="dot manual" title="Manual"></span>':'')+'</td>'+
    '<td>'+(can&&!c.outside?'<select class="u-height-30-width-120 select" data-drv="'+c.cycle+'" aria-label="Driver slot cycle '+c.cycle+'">'+sch.drivers.map(d=>'<option value="'+d.id+'"'+(d.id===c.driver?' selected':'')+'>'+esc(DL(d.id,route))+'</option>').join('')+'<option value="NEW">New slot</option></select>':esc(c.slotDriver||'-'))+(c.handover?' <span title="Handover at pool" class="u-color-amber">&#9670;</span>':'')+(ed.driver?'<span class="dot manual" title="Manual"></span>':'')+'</td>'+
    '<td class="num b">'+(STORE.me().noAmounts?tag('Set','green','check'):UI.num(cost.total))+'</td><td class="act"><div class="u-gap-2-justify-content-flex-end row"><button type="button" class="iconbtn" data-cost="'+c.cycle+'" aria-label="Cost cycle '+c.cycle+'" title="Cost">'+ic('banknote')+'</button>'+(can&&c.manual?'<button type="button" class="iconbtn" data-rr="'+c.cycle+'" aria-label="Reset row" title="Reset row">'+ic('undo')+'</button>':'')+'</div></td></tr>';}).join('')+'</tbody></table></div></div>';
 B.innerHTML=h;
 PANELS.toll($('#toll'),{scope:'Route Toll Setup · '+route,help:'Per Route Group: Toll Condition (No / Mixed / Full) and confirmed Entry → Exit gate pairs. Tariff prices come from the Planning-owned <a href="tolltariff.html">Toll Gate &amp; Toll Tariff master</a>. Customer Project Toll Configuration is a commercial default for Direct Delivery, not this Milkrun setup.',toll:()=>(MR.byId(pid).toll||{})[route],chassis:()=>ri.vehicle.chassis,date:()=>p.period[0],editable:!ro(),per:'cycle',obj:p.key,onChange:t=>{p.toll=p.toll||{};p.toll[route]=t;save();stats();tabs();$$('#rbody td.num.b').forEach((td,i)=>{const c=r.cycles[i];if(c)td.textContent=UI.num(DOM.cycleCost(p,sch,c).total);});const bn=$('#rbody > .banner.err.sm');const ev=DOM.tollEval(t,ri.vehicle.chassis,p.period[0]);if(bn&&(t.cond==='none'||!ev.missing))bn.remove();}});
 const sm=$('#setmax');if(sm)sm.onclick=()=>{p.cycles=p.cycles||{};p.cycles[route]=Object.assign({},p.cycles[route],{[dg]:r.maxFitRaw});save('Set '+route+' to '+r.maxFitRaw+' cycles');toast(route+' set to '+r.maxFitRaw+' cycles');paint();};
 $$('input[data-k]').forEach(i=>{i.onkeydown=e=>{if(e.key==='Enter')i.blur();if(e.key==='Escape'){i.value=i.defaultValue;i.blur();}};i.onchange=()=>timeEdit(+i.dataset.c,i.dataset.k,i.value,i);});
 $$('[data-rc]').forEach(b=>b.onclick=()=>{setEdit(route,+b.dataset.rc,b.dataset.rk,null);save('Reset cell '+route+' cycle '+b.dataset.rc);paint();});
 $$('[data-rr]').forEach(b=>b.onclick=()=>{const e=E();if(e[route])delete e[route][+b.dataset.rr];save('Reset row '+route+' cycle '+b.dataset.rr);paint();});
 $$('[data-unit]').forEach(s=>s.onchange=()=>unitSwap(+s.dataset.unit,s.value));
 $$('[data-drv]').forEach(s=>s.onchange=()=>driverSwap(+s.dataset.drv,s.value));
 $$('[data-cost]').forEach(b=>b.onclick=()=>costDrawer(+b.dataset.cost));}
/* ---------------- edits with validation dialogs ---------------- */
function trial(mut){const s=DOM.planSchedule(p,dg,{fresh:true,extra:Math.random(),mutate:inp=>{const e=JSON.parse(JSON.stringify(inp.edits||{}));mut(e);inp.edits=e;}});return s;}
function timeEdit(cy,key,val,inp){const m=UI.parseHM(val);const c=sch.cycles.find(x=>x.route===route&&x.cycle===cy);
 if(m==null){inp.classList.add('err');toast('Use HH:MM',{tone:'err'});return;}
 /* QA-N05: same value is not an edit (no Manual flag) */if((key==='out'?c.out:(c.stops[+key.slice(1)]||{}).in)===m||(key==='out'?c.out:(c.stops[+key.slice(1)]||{}).in)===m+1440){inp.value=inp.defaultValue;return;}
 let v=m;if(key==='out'&&v<AX0-60&&c.out>=720)v+=1440;
 const keepUnit=c.unit&&!c.unitShort?c.unit:null;
 const s=trial(e=>{e[route]=e[route]||{};e[route][cy]=Object.assign({},e[route][cy]||{},{[key]:v},keepUnit?{unit:keepUnit}:{});});
 const nc=s.cycles.find(x=>x.route===route&&x.cycle===cy);
 if(key!=='out'){const i=+key.slice(1);const prevOut=i===0?c.out:c.stops[i-1].out;const leg=s.routes.find(r=>r.id===route).legs[i].travel;if(v<prevOut+leg){timeNotPossible('IN at '+c.stops[i].loc.replace(/^PT /,'')+' must be '+hm(prevOut+leg)+' or later',inp);return;}}
 if(nc.outside){const arrMax=sch.window[1]-(nc.stops[nc.stops.length-1].out-nc.stops[nc.stops.length-1].in);timeNotPossible('Customer arrival '+hm(nc.arr)+' is outside '+hm(sch.window[0])+' - '+hm(sch.window[1])+'. Latest arrival '+hm(arrMax),inp);return;}
 if(nc.conflict){return truckDialog(c,nc,key,v,inp);}
 if(nc.dutyBreach){return dutyDialog(nc,s,()=>commit());}
 commit();
 function commit(){setEdit(route,cy,key,v);save((key==='out'?'Out Pool ':'IN stop '+(+key.slice(1)+1)+' ')+route+' cycle '+cy,hm(key==='out'?c.out:c.stops[+key.slice(1)].in)+' to '+hm(v));paint();}}
function timeNotPossible(msg,inp){DLG.open({title:'Time not possible',width:440,alert:true,body:'<p class="u-margin-0">'+esc(msg)+'</p>',buttons:[{label:'OK',kind:'primary'}],onClose:()=>{inp.value=inp.defaultValue;inp.focus();}});}
function truckDialog(c,nc,key,v,inp,picked){const cf=nc.conflict;const who=picked||cf.plate;const allU=Object.values(DOM.allocUnits(sch.project.code)).flat().filter(u=>(MD.vehicle(u).chassis+' '+MD.vehicle(u).body)===c.vtype&&u!==cf.plate);
 const s2=trial(e=>{e[route]=e[route]||{};e[route][c.cycle]=Object.assign({},e[route][c.cycle]||{},{[key]:v});delete e[route][c.cycle].unit;});const free=CHAIN.freeUnit(s2,s2.cycles.find(x=>x.route===route&&x.cycle===c.cycle),allU);
 const shift=cf.freeAt-(key==='out'?v:nc.out);const newOut=(key==='out'?v:nc.out)+Math.max(0,shift);const newArr=nc.arr+Math.max(0,shift);
 DLG.open({title:'Truck not possible',sub:esc(route+' cycle '+c.cycle),width:500,alert:true,body:'<p class="u-margin-0"><b>'+esc(SL(cf.plate))+'</b> is on <b>'+esc(cf.holder)+'</b> and busy until '+hm(cf.freeAt-15)+'. Free at <b>'+hm(cf.freeAt)+'</b> (+15 min).</p>'+
  '<label class="pick on mt3"><input type="radio" name="tn" class="cbx" value="free" checked'+(free?'':' disabled')+'><div class="col"><b>Use a free unit</b><span class="sm mut">'+(free?esc(SL(free))+' is free':'No free unit')+'</span></div></label><label class="pick"><input type="radio" name="tn" class="cbx" value="keep"><div class="col"><b>Keep '+esc(SL(who))+' and move Out Pool</b><span class="sm mut">Out Pool '+hm(newOut)+', customer arrival '+hm(newArr)+'</span></div></label>',
  onOpen(L){$$('[name=tn]',L.el).forEach(r=>r.onchange=()=>$$('.pick',L.el).forEach(x=>x.classList.toggle('on',x.contains(r)&&r.checked)));if(!free){$$('[name=tn]',L.el)[1].checked=true;}},
  onClose:()=>{inp&&(inp.value=inp.defaultValue);},
  buttons:[{label:'Cancel'},{label:'Apply',kind:'primary',onClick(L,el){const o=$('[name=tn]:checked',el).value;
   if(o==='free'){setEdit(route,c.cycle,key,v);setEdit(route,c.cycle,'unit',free);save('Unit slot '+SL(free)+' for '+route+' cycle '+c.cycle,'Out Pool '+hm(v));}
   else{if(key==='out')setEdit(route,c.cycle,'out',newOut);else{setEdit(route,c.cycle,key,v+Math.max(0,shift));}setEdit(route,c.cycle,'unit',who);save('Kept '+SL(who)+', moved Out Pool '+route+' cycle '+c.cycle,'to '+hm(newOut));}
   inp=null;paint();}}]});}
function dutyDialog(nc,s,onOk){const b=nc.dutyBreach;const sg=CHAIN.suggestSlot(s,nc);
 DLG.open({title:'Duty > 12h',sub:esc(route+' cycle '+nc.cycle+', '+DL(b.slot,route)),width:460,alert:true,body:'<div class="row gap3"><div class="u-width-180">'+UI.duty(b.duty)+'</div>'+(b.busy?tag('Slot busy at this time','red','x-circle'):'')+'</div><p class="u-margin-0">Duty max 12h, rest min 8h. Cannot be overridden.</p>'+'<div class="pick on"><b>'+esc(DL(sg.slot,route))+'</b><span class="sm mut">'+(sg.pin==='NEW'?'New slot':'Fits duty and rest')+'</span><span class="sp"></span><div class="u-width-150">'+UI.duty(sg.duty)+'</div></div>',
  buttons:[{label:'Cancel',onClick:()=>{paint();}},{label:'Use suggested slot',kind:'primary',onClick(){setEdit(route,nc.cycle,'driver',sg.pin==='NEW'?null:sg.slot);save(DL(sg.slot,route)+' for '+route+' cycle '+nc.cycle);paint();}}]});}
function unitSwap(cy,plate){const c=sch.cycles.find(x=>x.route===route&&x.cycle===cy);if(plate==='__new')plate=newPlate(c.vtype);const s=trial(e=>{e[route]=e[route]||{};e[route][cy]=Object.assign({},e[route][cy]||{},{unit:plate});});const nc=s.cycles.find(x=>x.route===route&&x.cycle===cy);
 if(nc.conflict)return truckDialog(c,nc,'out',c.out,null,plate);setEdit(route,cy,'unit',plate);save('Unit slot '+route+' cycle '+cy,SL(c.unit)+' to '+SL(plate));paint();}
function driverSwap(cy,slot){if(slot==='NEW'){const n='D'+String(sch.drivers.length+1).padStart(2,'0');setEdit(route,cy,'driver',n);save('New '+DL(n)+' for '+route+' cycle '+cy);paint();return;}
 const s=trial(e=>{e[route]=e[route]||{};e[route][cy]=Object.assign({},e[route][cy]||{},{driver:slot});});const nc=s.cycles.find(x=>x.route===route&&x.cycle===cy);
 const sl=s.drivers.find(d=>d.id===slot);if(nc.dutyBreach||(sl&&sl.duty>720))return dutyDialog(Object.assign(nc,{dutyBreach:nc.dutyBreach||{slot,duty:sl.duty}}),s);
 setEdit(route,cy,'driver',slot);save('Driver slot '+route+' cycle '+cy,'to '+DL(slot,route));paint();}
function costDrawer(cy){const c=sch.cycles.find(x=>x.route===route&&x.cycle===cy);const ri=sch.routesIn.find(x=>x.id===route);const r=sch.routes.find(x=>x.id===route);const key=route+'-'+cy;
 const L=DLG.drawer({title:'Cost',sub:esc(route+' cycle '+cy+', inherited by every trip of this cycle'),width:600,body:'<div id="cpd"></div>',buttons:[{label:'Close',kind:'primary'}]});
 const PP=PANELS.cost($('#cpd',L.el),{scope:route+' cycle '+cy,editable:!ro(),addScope:'plan',input:()=>{const pl=MR.byId(pid);return {chassis:ri.vehicle.chassis,body:ri.vehicle.body,sl:sch.project.sl,ptype:'Milkrun',project:sch.project.name,km:r.km,loadedKm:r.loadedKm,emptyKm:r.emptyKm,durationMin:c.inPool-c.out,stops:ri.stops.length+1,crew:sch.project.manpower,toll:(pl.toll||{})[route],date:pl.period[0],additions:((pl.additions||{})[key]||[]).map(a=>Object.assign({scope:'plan'},a))};},
  onAdd:a=>{p.additions=p.additions||{};(p.additions[key]=p.additions[key]||[]).push({comp:a.comp,amt:a.amt,reason:a.reason,by:a.by,at:a.at});save('Added '+a.comp+', '+route+' cycle '+cy,UI.rp(a.amt),'Cost');PP.render();paint();},
  onRemove:a=>{p.additions[key]=(p.additions[key]||[]).filter(x=>!(x.comp===a.comp&&x.amt===a.amt&&x.reason===a.reason));save('Removed '+a.comp+', '+route+' cycle '+cy,'','Cost');PP.render();paint();},
  onToll:t=>{p.toll[route]=t;save('Manual toll '+route,'','Cost');PP.render();paint();}});
}
/* ---------------- Gantt ---------------- */
function gantt(){const G=$('#gantt');const sel=gRoute==='all'?null:gRoute;const w=sch.window;
 const axis='<div class="gt-axis" style="width:'+W+'px">'+Array.from({length:24},(x,i)=>{const m=AX0+i*60;return '<span style="left:'+X(m)+'px">'+UI.pad((m/60)%24)+(m>=1440?'<small class="mut">+1</small>':'')+'</span>';}).join('')+'</div>';
 const grid=Array.from({length:24},(x,i)=>'<div class="gt-grid" style="left:'+X(AX0+i*60)+'px"></div>').join('')+'<div class="gt-daybreak" style="left:'+X(1440)+'px" title="00:00 next day"></div>';
 const bar=(c,lab)=>{const on=c.route===route;const bad=c.conflict||c.dutyBreach;return '<div class="gt-bar'+(on?' sel':'')+(bad?' bad':'')+'" style="left:'+X(c.out)+'px;width:'+Math.max(6,X(c.inPool)-X(c.out))+'px" title="'+esc(c.route+' cycle '+c.cycle+' '+hm(c.out)+'-'+hm(c.inPool)+(bad?' conflict':''))+'">'+(bad?ic('x','s12'):'')+esc(lab||c.route+'-'+c.cycle)+'</div>';};
 const flt=c=>!sel||c.route===sel;
 let h='<div class="gantt"><div class="u-border-bottom-1-solid-line panel-hd"><h3>Chaining</h3><span class="sp"></span><div class="row gap2 sm mut"><span class="row gap1"><span class="u-display-inline-block-width-22-height-10-57801"></span>Conflict</span><span class="row gap1"><span class="u-display-inline-block-width-22-height-3-b-6146"></span>12h limit</span><span class="row gap1"><span class="u-position-static-display-inline-block-width-22 gt-rest"></span>Rest</span></div>'+
  '<select class="u-width-140-height-32 select" id="gRoute" aria-label="Route filter">'+C.opts([['all','Route: All']].concat(sch.routes.map(r=>[r.id,r.id])),gRoute)+'</select><button type="button" class="btn sm ghost" id="gColl">'+ic('down')+'Collapse all</button></div>'+
  '<div class="gt-scroll"><div style="width:'+(220+W)+'px"><div class="gt-head"><div class="gt-lab">'+esc(sch.window?'Open '+hm(w[0])+' - '+hm(w[1]):'')+'</div>'+axis+'</div>';
 /* window row with arrival diamonds of the selected route */
 const rsel=sch.routes.find(r=>r.id===route);
 h+='<div class="u-height-24 gt-row"><div class="gt-lab xs mut">ARRIVALS '+esc(route)+'</div><div class="gt-track" style="width:'+W+'px;height:24px">'+grid+'<div class="gt-win" style="left:'+X(w[0])+'px;width:'+(X(w[1])-X(w[0]))+'px"></div>'+rsel.cycles.map(c=>'<div class="gt-arr" style="left:'+X(c.arr)+'px" title="Arrival '+hm(c.arr)+'"></div>').join('')+'</div></div>';
 /* units by vehicle type */
 const types={};sch.units.forEach(u=>{(types[u.vt]=types[u.vt]||[]).push(u);});
 h+='<div class="u-padding-s2-s3 sect">Units</div>';
 Object.keys(types).forEach(vt=>{const list=types[vt].filter(u=>u.cycles.some(flt));const k='u:'+vt;const open=!collapsed[k];
  h+='<div class="gt-grp"><button type="button" class="gt-grph" data-gk="'+esc(k)+'" aria-expanded="'+open+'">'+ic(open?'down':'right','s12')+esc(vt)+' <span class="mut fw5">'+UI.plural(list.length,'unit')+'</span></button>';
  if(open)h+='<div class="gt-body">'+list.map((u,i)=>{const summ=esc(sch.unitSlot[u.plate]+': '+u.cycles.map(c=>c.route+' cycle '+c.cycle+' '+hm(c.out)+'-'+hm(c.inPool)+(c.conflict?' conflict':'')).join(', '));
   return '<div class="gt-row" tabindex="0" aria-label="'+summ+'"><div class="gt-lab"><b>'+esc(sch.unitSlot[u.plate])+'</b><span class="xs mut">'+UI.plural(u.cycles.length,'cycle')+'</span></div><div class="gt-track" style="width:'+W+'px">'+grid+u.cycles.filter(flt).map(c=>bar(c)+'<div class="gt-turn" style="left:'+X(c.inPool)+'px;width:'+(X(c.inPool+15)-X(c.inPool))+'px"></div>'+(c.handover?'<div class="gt-dia" style="left:'+X(c.out)+'px" title="Driver handover"></div>':'')).join('')+'</div></div>';}).join('')+'</div>';h+='</div>';});
 /* drivers by report band */
 const band=d=>d.start<360?'03:00 - 05:59':d.start<420?'06:00 - 06:59':'07:00+';const bands={};sch.drivers.forEach(d=>{(bands[band(d)]=bands[band(d)]||[]).push(d);});
 h+='<div class="u-padding-s2-s3 sect">Drivers</div>';
 ['03:00 - 05:59','06:00 - 06:59','07:00+'].filter(b=>bands[b]).forEach(b=>{const list=bands[b].filter(d=>d.cycles.some(flt));const k='d:'+b;const open=!collapsed[k];
  h+='<div class="gt-grp"><button type="button" class="gt-grph" data-gk="'+esc(k)+'" aria-expanded="'+open+'">'+ic(open?'down':'right','s12')+esc(b)+' <span class="mut fw5">'+UI.plural(list.length,'driver')+'</span></button>';
  if(open)h+='<div class="gt-body">'+list.map(d=>{const over=d.duty>720;const summ=esc(DL(d.id)+', duty '+UI.dur(d.duty)+': '+d.cycles.map(c=>c.route+' cycle '+c.cycle).join(', '));
   return '<div class="gt-row" tabindex="0" aria-label="'+summ+'"><div class="gt-lab"><b>'+esc(DL(d.id))+'</b><span class="sp"></span><span class="xs b'+(over?' amb':'')+'">'+(over?ic('x-circle','s12'):'')+UI.dur(d.duty)+'</span></div><div class="gt-track" style="width:'+W+'px">'+grid+
    '<div class="gt-duty'+(over?' bad':'')+'" style="left:'+X(d.start)+'px;width:'+(X(d.start+720)-X(d.start))+'px" title="12h limit from report '+hm(d.start)+'"></div>'+d.cycles.filter(flt).map(c=>bar(c)+(c.handover?'<div class="gt-dia" style="left:'+X(c.out)+'px" title="Handover"></div>':'')).join('')+
    '<div class="gt-rest" style="left:'+X(d.end)+'px;width:'+(X(d.end+480)-X(d.end))+'px" title="Rest 8h"></div></div></div>';}).join('')+'</div>';h+='</div>';});
 h+='</div></div></div>';G.innerHTML=h;
 $('#gRoute').onchange=e=>{gRoute=e.target.value;gantt();};
 $('#gColl').onclick=()=>{const keys=Object.keys(types).map(t=>'u:'+t).concat(Object.keys(bands).map(b=>'d:'+b));const all=keys.every(k=>collapsed[k]);keys.forEach(k=>collapsed[k]=!all);gantt();};
 $$('[data-gk]').forEach(b=>b.onclick=()=>{collapsed[b.dataset.gk]=!collapsed[b.dataset.gk];gantt();});}
function wireHead(){($('#hist')||{}).onclick=()=>PANELS.history({obj:p.key,title:p.key});
 const sd=$('#sd');if(sd)sd.onclick=()=>{p.step=Math.max(p.step||1,5);save('Saved draft');toast('Draft saved');};
 const ex=$('#exs');if(ex)ex.onclick=()=>MR.exportSchedule(p);
 const rv=$('#rev');if(rv)rv.onclick=()=>DLG.confirm({title:'Revise '+p.key,body:'Creates a new plan with its own Plan ID as Draft. '+p.key+' stays until the new plan is published, then it is Closed.',ok:'Create revised plan'}).then(ok=>{if(!ok)return;const n=MR.revise(p);location.href='milkrun-step5.html?plan='+n.id;});
 $('#rr').onclick=()=>{if(!ro()){const st=sch&&sch.stats;const ready=!!(st&&!st.outside&&!st.conflicts&&!st.dutyBreaches);if(ready){p.status='Scheduled';p.readyStale=null;}p.step=6;save('Schedule & Chaining done',null,null,{ready});}location.href='milkrun-wizard.html?plan='+p.id+'&step=6';};}
render(true);
STORE.subscribe('milkrunPlans',(e,s)=>{if(s==='remote'){p=MR.byId(pid);paint();}});
})();
