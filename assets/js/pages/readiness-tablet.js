/* Readiness check-in for Field Ops (tablet 1024x768): queue of drivers / units due + 3-step sheet (Attendance, Tenko, Unit P2H). */
(function(){
const {ic,esc,tag,st,hm}=UI;const {$,$$,toast}=C;
STORE.asPersona('fieldops');/* this screen is the Field Ops tablet */
if(!SHELL.mount({module:'planning',id:'readiness',active:'readiness',title:'Readiness Board',crumb:'Daily Ops',meta:'<span data-clock></span> WIB',device:'tablet'}))return;
document.body.classList.add('tablet');
let view=UI.q('view','checkin'),list='drivers',selId=null;const date=STORE.today();
function due(){return STORE.get('trips').filter(t=>t.date===date&&!t.vendor&&!/Skipped|Cancelled|Released/.test(t.status)&&t.driver).sort((a,b)=>a.out-b.out);}
function render(){
 $('#content').innerHTML='<div class="row gap2">'+PL.seg([['checkin','Check-in','','user'],['trips','Trips','','grid'],['table','Table','','table']],view,'data-v',{t44:true,label:'View'})+'<span class="sp"></span><span class="tag line tchip">'+UI.fdate(date,{dow:1,noYear:1})+'</span><span class="tag line tchip">Day</span><button type="button" class="iconbtn t44" id="rf" aria-label="Refresh">'+ic('refresh')+'</button></div><div id="vb" class="mt3"></div>';
 $$('[data-v]').forEach(b=>b.onclick=()=>{view=b.dataset.v;render();});$('#rf').onclick=()=>{render();toast('Updated');};
 const V=$('#vb');
 if(view==='trips'){const ts=STORE.get('trips').filter(t=>t.date===date);const ev={};ts.forEach(t=>ev[t.id]=DOM.evaluate(t));
  V.innerHTML='<div class="u-grid-template-columns-repeat-2-mm rcards">'+ts.filter(t=>t.status!=='Released').sort((a,b)=>a.out-b.out).map(t=>READY.card(t,{ev:ev[t.id],tablet:true})).join('')+'</div>';READY.wireCards(V,render);return;}
 if(view==='table'){C.table(V,{key:'id',label:'Readiness',rows:()=>due(),cols:[{k:'s',h:'Readiness',cls:'stc',render:t=>st(DOM.evaluate(t).state)},{k:'trip',h:'Trip',text:t=>t.type==='MR'?t.route+'-'+t.cycle:t.id},{k:'dep',h:'Departure',text:t=>hm(t.out)},{k:'d',h:'Driver',text:t=>READY.drvName(t)},{k:'u',h:'Unit',text:t=>t.unit||''}]});return;}
 const q=due();const seen=new Set();const drivers=q.filter(t=>!seen.has(t.driver)&&seen.add(t.driver));const seenU=new Set();const units=q.filter(t=>t.unit&&!seenU.has(t.unit)&&seenU.add(t.unit));
 const L=list==='drivers'?drivers:units;if(!selId||!L.find(t=>t.id===selId))selId=(L[0]||{}).id;
 V.innerHTML='<div class="u-grid-template-columns-360-mm-align-items-start grid2"><div class="u-overflow-hidden panel"><div class="u-padding-s2">'+PL.seg([['drivers','Drivers '+drivers.length],['units','Units '+units.length]],list,'data-l',{t44:true,label:'Queue'})+'</div><div class="u-max-height-600-overflow-auto">'+
  L.map(t=>{const ck=DOM.check('drv',t.driver,date)||{},uk=DOM.check('unit',t.unit,date)||{};const ch=(l,v,bad)=>v?tag(l,bad?'red':'green',bad?'x':'check'):tag(l,'slate');
   const sub=(t.type==='MR'?t.route+'-'+t.cycle:t.id)+' · '+hm(t.out);
   return '<button type="button" class="mi'+(t.id===selId?' on':'')+'" style="border-radius:0;min-height:64px;padding:var(--s3) var(--s4);border-bottom:1px solid var(--line2);'+(t.id===selId?'box-shadow:inset 3px 0 0 var(--navy)':'')+'" data-s="'+t.id+'">'+(list==='drivers'?UI.avatar(READY.drvName(t)):'<span class="avatar">'+ic('truck')+'</span>')+'<div class="u-gap-4-text-align-left-flex-1 col"><b>'+esc(list==='drivers'?READY.drvName(t):t.unit)+'</b><span class="sm mut">'+esc(sub)+'</span><span class="row wrap gap1">'+(list==='drivers'?ch('Attendance',ck.att,ck.att&&!/Present|Late/.test(ck.att.v))+ch('Tenko',ck.tenko,ck.tenko&&ck.tenko.result==='Unfit'):'')+ch('P2H',uk.p2h,uk.p2h&&uk.p2h.result==='Fail')+'</span></div>'+ic('right')+'</button>';}).join('')+'</div></div><div class="panel"><div class="body" id="sheet"></div></div></div>';
 $$('[data-l]').forEach(b=>b.onclick=()=>{list=b.dataset.l;selId=null;render();});$$('[data-s]').forEach(b=>b.onclick=()=>{selId=b.dataset.s;render();});
 if(selId)READY.sheet($('#sheet'),STORE.byId('trips',selId),{tablet:true,step:list==='units'?2:0,onSaved:()=>{const i=L.findIndex(t=>t.id===selId);selId=(L[i+1]||L[0]).id;render();}});}
render();
['readiness','trips'].forEach(e=>STORE.subscribe(e,(x,src)=>{if(src==='remote'&&!C.DLG.layers.length)render();}));
})();
