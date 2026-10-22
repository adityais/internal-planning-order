/* Foundations: live shared components (status system, countdown, duty/rest, cost panel, toll editor, documents, history). */
(function(){
const {ic,esc,st,tag,wf}=UI;const {$,$$}=C;
if(!SHELL.mount({module:'planning',title:'Foundations',crumb:'Prototype',actions:'<button type="button" class="btn" id="hist">'+ic('history')+'History</button>'}))return;
const now=STORE.now();
const plan=()=>STORE.get('milkrunPlans').find(p=>p.id==='MP-2026-0050');
const content=$('#content');
content.innerHTML='<div class="showcase">'+
 '<div class="tabs" role="tablist" id="ftabs"><button type="button" class="on" data-t="status">Status system</button><button type="button" data-t="cost">Cost panel</button><button type="button" data-t="docs">Documents</button><button type="button" data-t="icons">Icons</button></div><div id="fbody" class="mt4"></div></div>';
function status(){const S=['ready','waiting','atrisk','pred','notready','replacing','exreq','withex','skipped'];const shapes=['Solid','Solid','Solid','Dashed','Solid','Solid','Double outline','Split','Strike-through'];
 let h='<h2>Trip readiness</h2><div class="panel"><table><thead><tr><th scope="col">Chip</th><th scope="col">Shape</th><th scope="col">Grayscale</th></tr></thead><tbody>'+S.map((k,i)=>'<tr><td>'+st(k)+'</td><td>'+shapes[i]+'</td><td class="u-filter-grayscale-1">'+st(k)+'</td></tr>').join('')+'</tbody></table></div>';
 h+='<h2>Workflow and order status</h2><div class="panel"><div class="body col gap3">'+
  '<div class="row wrap gap2"><span class="u-width-140 sect">Milkrun</span>'+['Planned','Confirmed','Released','Skipped'].map(x=>UI.wfa(x)).join('')+'</div>'+
  '<div class="row wrap gap2"><span class="u-width-140 sect">Direct Delivery</span>'+['Draft','Planned','Published','Converted','Cancelled'].map(x=>UI.wfa(x)).join('')+'</div>'+
  '<div class="row wrap gap2"><span class="u-width-140 sect">Order</span>'+['Ready to Assign','Assigning','Assigned','Unfulfilled','Dropped'].map(UI.os).join('')+'</div>'+
  '<div class="row wrap gap2"><span class="u-width-140 sect">Plan, document</span>'+['Draft','Scheduled','Published','Superseded','Generated','Corrected'].map(UI.ps).join('')+'</div></div></div>';
 h+='<h2>Countdown</h2><div class="panel"><div class="body row wrap gap4">'+UI.cd(now+108*60000,'left')+UI.cd(now+42*60000,'left')+UI.cd(now+12*60000+40000,'left')+'<div class="u-width-240">'+UI.cd(now+7*60000,'left',{lg:1})+'<div class="sla mt2"><i class="u-width-53"></i></div></div></div></div>';
 h+='<h2>Duty and rest</h2><div class="panel"><div class="u-align-items-flex-start-gap-s5 body row wrap gap5"><div class="u-width-150">'+UI.duty(590)+'</div><div class="u-width-150">'+UI.duty(700)+'</div><div class="u-width-150">'+UI.duty(785)+'</div><div class="col gap2">'+UI.rest(580)+UI.rest(360)+'</div>'+
  '<div class="u-width-380 col"><div class="pick"><span class="avatar">DK</span><b class="u-flex-1">Dedi Kurniawan</b><div class="u-width-130">'+UI.duty(380)+'</div></div><div class="pick dis"><span class="avatar">EP</span><b class="u-flex-1">Eko Prasetyo</b>'+tag('On leave','slate')+'</div><div class="pick dis"><span class="avatar">JS</span><b class="u-flex-1">Joko Susilo</b>'+tag('Over 12h','red')+'</div></div></div></div>';
 h+='<h2>Badges</h2><div class="panel"><div class="body row wrap gap2">'+UI.lh()+UI.exflag('Driver Apps')+'<span class="late">'+ic('clock','s12')+'Late order</span><span class="late">'+ic('alert','s12')+'Late change</span>'+UI.sl('Express')+UI.sl('Regular')+'</div></div>';
 $('#fbody').innerHTML=h;C.TICK.now();}
function cost(){const p=plan();const sch=DOM.planSchedule(p,'wd');const c=sch.cycles.find(x=>x.route==='R03'&&x.cycle===2);const r=sch.routes.find(x=>x.id==='R03');
 const input=()=>{const pl=plan();return Object.assign({},(function(){const cc=DOM.cycleCost(pl,sch,c,'2026-10-15');return {};})(),{chassis:'CDD',body:'Box',sl:'Regular',ptype:'Milkrun',project:sch.project.name,km:r.km,loadedKm:r.loadedKm,emptyKm:r.emptyKm,durationMin:c.inPool-c.out,stops:3,crew:sch.project.manpower,toll:pl.toll.R03,date:'2026-10-15',additions:(pl.additions['R03-2']||[]).map(a=>Object.assign({scope:'plan'},a))});};
 const save=fn=>{const all=STORE.get('milkrunPlans');const pl=all.find(x=>x.id==='MP-2026-0050');fn(pl);pl.updatedAt=STORE.now();STORE.set('milkrunPlans',all);};
 $('#fbody').innerHTML='<div class="u-align-items-start grid3"><div><div class="sect mb2">Planner</div><div id="cp1"></div></div><div><div class="sect mb2">PM view</div><div id="cp2"></div><div class="sect mb2 mt4">Direct Delivery, Express</div><div id="cp4"></div></div><div><div class="sect mb2">Field Ops, CCR</div><div id="cp3"></div><div class="sect mb2 mt4">Vendor trip</div><div id="cp5"></div></div></div><h2>Toll editor (R03, live from Toll Tariff)</h2><div class="u-max-width-640" id="te"></div>';
 const onAdd=a=>{save(pl=>{(pl.additions['R03-2']=pl.additions['R03-2']||[]).push({comp:a.comp,amt:a.amt,reason:a.reason,by:a.by,at:a.at});});STORE.audit({action:'Added '+a.comp+', R03 cycle 2',detail:UI.rp(a.amt),obj:'MP-2026-0050',type:'Cost'});};
 const onRemove=a=>{save(pl=>{pl.additions['R03-2']=(pl.additions['R03-2']||[]).filter(x=>!(x.comp===a.comp&&x.amt===a.amt&&x.reason===a.reason));});STORE.audit({action:'Removed '+a.comp+', R03 cycle 2',obj:'MP-2026-0050',type:'Cost'});};
 const onToll=t=>save(pl=>{pl.toll.R03=t;});
 const P1=PANELS.cost($('#cp1'),{scope:'R03 cycle 2',input,editable:true,addScope:'plan',onAdd,onRemove,onToll});
 const P2=PANELS.cost($('#cp2'),{scope:'R03 cycle 2',input,forceMode:'view'});
 const P3=PANELS.cost($('#cp3'),{scope:'R03 cycle 2',input,forceMode:'hidden'});
 PANELS.cost($('#cp4'),{scope:'DT-20261014-0008',input:()=>({chassis:'CDE',body:'Box',sl:'Express',ptype:'On Call',km:65,loadedKm:40,emptyKm:25,durationMin:300,stops:2,crew:{driver:1,helper:1},toll:{cond:'none',pairs:[]},date:'2026-10-14',additions:[]}),forceMode:'view'});
 PANELS.cost($('#cp5'),{scope:'DT-20261014-0021',input,vendor:true,vendorRate:2380000});
 PANELS.toll($('#te'),{scope:'R03 Toll',toll:()=>plan().toll.R03,chassis:()=>'CDD',date:()=>'2026-10-15',editable:true,per:'cycle',obj:'MP-2026-0050',onChange:t=>onToll(t)});
 STORE.subscribe('milkrunPlans',()=>{if($('#cp1')){P1.render();P2.render();P3.render();}});}
function docs(){$('#fbody').innerHTML='<div id="dp"></div>';DOCS.panel($('#dp'),{filter:d=>d.scope==='MP-2026-0050',tag:'MP-2026-0050',zipName:'MP-2026-0050'});}
function icons(){$('#fbody').innerHTML='<div class="panel"><div class="u-display-grid-grid-template-columns-repea-52170 body">'+Object.keys(UI.P).map(k=>'<div class="u-align-items-center-gap-4 col">'+ic(k,'s20')+'<span class="xs mut">'+k+'</span></div>').join('')+'</div></div>';}
const R={status,cost,docs,icons};
$$('#ftabs button').forEach(b=>b.onclick=()=>{$$('#ftabs button').forEach(x=>x.classList.toggle('on',x===b));R[b.dataset.t]();});
const t0=UI.q('tab','status');$$('#ftabs button').forEach(x=>x.classList.toggle('on',x.dataset.t===t0));(R[t0]||status)();
($('#hist')||{}).onclick=()=>PANELS.history({obj:'MP-2026-0050',title:'MP-2026-0050'});
})();
