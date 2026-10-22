/* Readiness Board (desktop): Board (Check-in / Trips / Table), Requests, Exceptions, Reports. Derived readiness, live. */
(function(){
const {ic,esc,tag,st,ps,hm}=UI;const {$,$$,DLG,toast,banner}=C;
if(!SHELL.mount({module:'planning',id:'readiness',active:'readiness',title:'Readiness Board',crumb:'Daily Ops',meta:'<span data-clock></span> WIB',actions:'<button type="button" class="btn" id="hist">'+ic('history')+'History</button><button type="button" class="btn" id="exp">'+ic('download')+'Export</button>'}))return;
let tab=UI.q('tab','board'),view=UI.q('view','trips'),sel=UI.q('sel',null);
const F={date:STORE.today(),shift:'all',project:'all',source:'all',q:''};let chkSel=null;
function trips(){return STORE.get('trips').filter(t=>t.date===F.date&&(F.shift==='all'||(F.shift==='Day'?(t.out>=360&&t.out<1080):(t.out<360||t.out>=1080)))&&(F.project==='all'||t.project===F.project)&&(F.source==='all'||(F.source==='Vendor'?!!t.vendor:!t.vendor))
 &&(!F.q||(t.id+' '+READY.drvName(t)+' '+(t.unit||'')+' '+READY.routeLabel(t)).toLowerCase().indexOf(F.q.toLowerCase())>=0));}
function rank(s){return {notready:0,exreq:1,replacing:2,pred:3,atrisk:4,waiting:5,withex:6,ready:7,skipped:9}[s];}
function counts(){const r=STORE.get('requests').filter(x=>x.status==='Open').length;const e=STORE.get('exceptions').filter(x=>!x.decision).length;return {r,e};}
function render(){const c=counts();
  if(!ROLES.canTab('readiness',tab))tab='board';
 $('#content').innerHTML=PL.tabs([['board','Board'],['requests','Requests',c.r],['exceptions','Exceptions',c.e,1],['reports','Reports']].filter(t=>ROLES.canTab('readiness',t[0])),tab)+'<div id="tb" class="mt4"></div>';
 $$('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;history.replaceState(null,'','?tab='+tab);render();});
 ({board,requests,exceptions,reports})[tab]($('#tb'));}
/* ---------- Customer Project date context (read-only) ----------
   Project Start and Project Valid come from the same Customer Project record Project Planning reads.
   Resource Readiness never stores, types or repairs them. The last successful read is kept so a source
   change is shown as stale instead of silently mixing an old range with a new calculation. */
const SRC={};
function readProj(code){const pr=MD.project(code);return pr?{id:pr.id,code:pr.code||code,name:pr.name,customer:pr.customer,start:pr.start||null,validity:pr.validity||null,status:pr.status||null}:null;}
function pinfo(){const codes=F.project==='all'?[...new Set(STORE.get('trips').filter(t=>t.date===F.date).map(t=>t.project))].sort():[F.project];
 if(!codes.length)return '';
 if(F.project==='all'){const cards=codes.map(c=>{const live=readProj(c);if(!live)return '<div class="pinfocard"><b>'+esc(c)+'</b><span class="sm mut">Project dates unavailable</span></div>';
   const bad=live.start&&live.validity&&live.validity<live.start;
   return '<button type="button" class="pinfocard" data-pinfo-proj="'+esc(c)+'"><span class="row gap2"><b>'+esc(c)+'</b><span class="sp"></span><span class="sm mut">View</span>'+ic('right','s12')+'</span><span class="sm mut">'+esc(live.name||'')+'</span><span class="sm pinforow">'+ic('calendar','s12')+'<span class="pinfodate">'+(live.start?UI.fdate(live.start):'Not supplied')+'</span><span class="mut">&rarr;</span><span class="pinfodate">'+(live.validity?UI.fdate(live.validity):'Not supplied')+'</span></span>'+(bad?tag('Invalid range','red','alert'):'')+'</button>';}).join('');
  return '<div class="panel pinfo"><div class="panel-hd"><h3>Project Information</h3>'+tag('Customer Project','slate','link')+'<span class="sp"></span></div><div class="body"><div class="pinfogrid">'+cards+'</div></div></div>';}
 const code=codes[0];const live=readProj(code);
 if(!live)return '<div class="panel pinfo"><div class="panel-hd"><h3>Project Information</h3>'+tag('Customer Project','slate','link')+'</div><div class="body">'+banner('err','<b>Project dates unavailable</b> - the Customer Project record for '+esc(code)+' could not be read.',{sm:1,acts:'<button type="button" class="btn sm" id="pinfoRetry">'+ic('refresh')+'Retry</button>'})+'</div></div>';
 if(!SRC[code])SRC[code]={start:live.start,validity:live.validity,at:STORE.now()};
 const src=SRC[code];const start=src.start,val=src.validity;
 const stale=src.start!==live.start||src.validity!==live.validity;
 const invalid=!!(start&&val&&val<start);
 const outside=!invalid&&!!(start&&val)&&(F.date<start||F.date>val);
 const expired=!!val&&val<STORE.today();
 let h='<div class="panel pinfo"><div class="panel-hd"><h3>Project Information</h3>'+tag('Customer Project','slate','link')+(stale?tag('Stale','amber','clock'):'')+'<span class="sp"></span><a class="sm" href="project-planning.html">Open Project Planning</a></div><div class="body"><dl class="kv2">'+
  '<dt>Customer Project</dt><dd><b>'+esc(code)+'</b> <span class="mut">'+esc(live.name||'')+'</span>'+(live.customer?'<div class="sm mut">'+esc(live.customer)+'</div>':'')+'</dd>'+
  '<dt>Project Start</dt><dd class="pinfodate">'+(start?UI.fdate(start):'<span class="mut">Not supplied</span>')+'</dd>'+
  '<dt>Project Valid</dt><dd class="pinfodate">'+(val?UI.fdate(val):'<span class="mut">Not supplied</span>')+(invalid?tag('Invalid range','red','alert'):expired?tag('Expired','red','clock'):'')+'</dd>'+
  '<dt>Source status</dt><dd>'+(live.status?tag(esc(live.status),live.status==='Active'?'green':'slate',live.status==='Active'?'check':'ban'):'<span class="mut">Not supplied</span>')+'</dd></dl>';
 if(invalid)h+=banner('err','<b>Project dates are invalid in Customer Project</b>',{sm:1});
 if(stale)h+=banner('warn','<b>Project dates changed in Customer Project</b>',{sm:1,acts:'<button type="button" class="btn sm" id="pinfoR">'+ic('refresh')+'Refresh</button>'});
 if(outside){const why=F.date<start?'before Project Start '+UI.fdate(start):'after Project Valid '+UI.fdate(val);
  h+=banner('warn','<b>Calculation period is outside project validity</b> ('+esc(why)+')',{sm:1});}
 h+='</div></div>';return h;}
function filters(){const projects=[...new Set(STORE.get('trips').filter(t=>t.date===F.date).map(t=>t.project))];
 return pinfo()+'<div class="u-gap-8 row wrap mt3"><input type="date" class="u-width-170 input" id="fd" value="'+F.date+'" aria-label="Date"><select class="u-width-120 select" id="fs" aria-label="Shift">'+C.opts([['all','Shift: All'],['Day','Shift: Day'],['Night','Shift: Night']],F.shift)+'</select>'+
 '<select class="u-width-150 select" id="fp" aria-label="Project">'+C.opts([['all','Project: All']].concat(projects.map(p=>[p,p])),F.project)+'</select><select class="u-width-130 select" id="fo" aria-label="Source">'+C.opts([['all','Source: All'],['Own','Source: Own Asset'],['Vendor','Source: Transporter']],F.source)+'</select>'+
 '<div class="u-width-200 inputwrap"><span class="pre">'+ic('search','s12')+'</span><input class="input" id="fq" placeholder="Search" value="'+esc(F.q)+'" aria-label="Search"></div><span class="sp"></span>'+PL.seg([['checkin','Check-in','','user'],['trips','Trips','','grid'],['table','Table','','table']],view,'data-view',{label:'View'})+'</div>';}
function board(B){if(UI.q('state')==='loading'){B.innerHTML=filters()+'<div class="mt3">'+PL.skel(6)+'</div>';return;}
 if(UI.q('state')==='error'){B.innerHTML=filters()+'<div class="mt3">'+banner('err','<b>Unit status feed stale since 05:40</b>',{acts:'<button type="button" class="btn sm" onclick="location.href=\'readiness.html\'">'+ic('refresh')+'Retry</button>'})+'</div>';}
 else B.innerHTML=filters();
 const list=trips();const ev={};list.forEach(t=>ev[t.id]=DOM.evaluate(t));
 B.insertAdjacentHTML('beforeend','<div class="mt3" id="sum">'+READY.summary(Object.values(ev),sel)+'</div><div class="mt4" id="vw"></div>');
 const shown=list.filter(t=>!sel||READY.bucket(ev[t.id].state)===sel).sort((a,b)=>rank(ev[a.id].state)-rank(ev[b.id].state)||a.out-b.out);
 const V=$('#vw');
 if(!list.length||UI.q('state')==='empty'){V.innerHTML=PL.empty('No trips on '+UI.fdate(F.date,{noYear:1}),'Open Daily Trip Plan','gotrips');const g=$('#gotrips');if(g)g.onclick=()=>location.href='trips.html';}
 else if(view==='trips'){V.innerHTML=shown.length?'<div class="rcards">'+shown.map(t=>READY.card(t,{ev:ev[t.id]})).join('')+'</div>':'<div class="panel"><div class="tbl-msg"><b>No results</b><button type="button" class="btn sm" id="clr">Clear filter</button></div></div>';READY.wireCards(V,render);const c=$('#clr');if(c)c.onclick=()=>{sel=null;F.q='';render();};}
 else if(view==='table'){C.table(V,{key:'id',minw:1100,label:'Readiness',rows:()=>shown,cols:[{k:'st',h:'Readiness',cls:'stc',w:190,text:t=>ev[t.id].state,sortv:t=>rank(ev[t.id].state),render:t=>st(ev[t.id].state)+'<div class="mt1">'+UI.wfa(t.status)+'</div>'},
   {k:'trip',h:'Trip',text:t=>READY.projName(t)+' '+READY.routeLabel(t),render:t=>'<b>'+esc(READY.projName(t))+'</b><div class="sm mut">'+esc(READY.routeLabel(t))+'</div>'},{k:'dep',h:'Departure',sortv:t=>t.out,text:t=>hm(t.out),render:t=>'<b class="tnum">'+hm(t.out)+'</b><div class="mt1">'+(ev[t.id].state==='skipped'?'':UI.cd(STORE.ts(t.date,t.out),'left'))+'</div>'},
   {k:'drv',h:'Driver',text:t=>READY.drvName(t),render:t=>'<div>'+esc(READY.drvName(t))+(t.driver&&t.slotDriver?' <span class="xs mut">'+esc(t.slotDriver)+'</span>':'')+'</div><div class="row gap1 mt1">'+(t.slotDriver&&!t.driver&&!t.vendor?tag('Unresolved','amber','clock'):READY.attTag(ev[t.id].driver.att)+READY.tenkoTag(ev[t.id].driver.tenko))+'</div>'},
   {k:'duty',h:'Duty',noFilter:1,sortable:false,render:t=>t.longhaul?tag('Duty exempt','navy'):ev[t.id].driver.duty&&ev[t.id].driver.duty.duty?UI.duty(ev[t.id].driver.duty.duty):'-'},
   {k:'unit',h:'Unit',text:t=>t.unit||t.slotUnit||'',render:t=>(t.unit?'<b class="plate">'+esc(t.unit)+'</b>'+(t.slotUnit?' <span class="xs mut">'+esc(t.slotUnit)+'</span>':''):'<b>'+esc(t.slotUnit||'-')+'</b>')+'<div class="row gap1 mt1">'+(t.slotUnit&&!t.unit&&!t.vendor?tag('Unresolved','amber','clock'):(t.vendor?'':READY.p2hTag(ev[t.id].unit.p2h)))+'</div>'},
   {k:'_act',h:'Action',cls:'act',sortable:false,render:t=>{const s=ev[t.id].state;return s==='notready'&&STORE.can('plan')?'<button type="button" class="btn sm primary" data-rep="'+t.id+'">Replace</button>':'<button type="button" class="btn sm" data-open="'+t.id+'">Open</button>';}}],
   after:h=>{READY.wireCards(h,render);$$('[data-open]',h).forEach(b=>b.onclick=()=>openCard(b.dataset.open));}});}
 else checkin(V,list);
 $('#fd').onchange=e=>{F.date=e.target.value;render();};$('#fs').onchange=e=>{F.shift=e.target.value;render();};$('#fp').onchange=e=>{F.project=e.target.value;render();};$('#fo').onchange=e=>{F.source=e.target.value;render();};
 $('#fq').oninput=e=>{F.q=e.target.value;clearTimeout(window._fq);window._fq=setTimeout(()=>{render();const q=$('#fq');q.focus();q.setSelectionRange(q.value.length,q.value.length);},250);};
 $$('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render();});$$('[data-sum]').forEach(b=>b.onclick=()=>{sel=sel===b.dataset.sum?null:b.dataset.sum;render();});}
function openCard(id){const t=STORE.byId('trips',id);const L=DLG.open({title:t.id,sub:esc(READY.routeLabel(t)),width:520,body:READY.card(t),buttons:[{label:'Close',kind:'primary'}]});READY.wireCards(L.el,()=>{L.close();render();});}
/* desktop check-in = queue + sheet (same component as the tablet) */
function checkin(V,list){const q=list.filter(t=>!t.vendor&&t.driver&&!/Skipped|Cancelled|Released/.test(t.status)).sort((a,b)=>a.out-b.out);const seen=new Set();const drv=q.filter(t=>!seen.has(t.driver)&&seen.add(t.driver));
 if(!chkSel||!drv.find(t=>t.id===chkSel))chkSel=(drv[0]||{}).id;
 V.innerHTML='<div class="u-grid-template-columns-380-mm-align-items-start grid2"><div class="u-max-height-640-overflow-auto panel">'+drv.map(t=>{const ck=DOM.check('drv',t.driver,t.date)||{},uk=DOM.check('unit',t.unit,t.date)||{};
  const chip=(l,v,bad)=>v?tag(l,bad?'red':'green',bad?'x':'check'):tag(l,'slate');
  return '<button type="button" class="u-border-radius-0-padding-s3-s4-border-bot-54992 mi'+(t.id===chkSel?' on':'')+'" data-ck="'+t.id+'">'+UI.avatar(READY.drvName(t))+'<div class="u-gap-4-text-align-left-flex-1 col"><b>'+esc(READY.drvName(t))+'</b><span class="sm mut">'+esc((t.type==='MR'?t.route+'-'+t.cycle:t.id)+' · '+hm(t.out))+'</span><span class="row wrap gap1">'+chip('Attendance',ck.att,ck.att&&!/Present|Late/.test(ck.att.v))+chip('Tenko',ck.tenko,ck.tenko&&ck.tenko.result==='Unfit')+chip('P2H',uk.p2h,uk.p2h&&uk.p2h.result==='Fail')+'</span></div>'+ic('right')+'</button>';}).join('')+'</div><div class="panel"><div class="body" id="sheet"></div></div></div>';
 $$('[data-ck]',V).forEach(b=>b.onclick=()=>{chkSel=b.dataset.ck;render();});
 if(chkSel)READY.sheet($('#sheet'),STORE.byId('trips',chkSel),{onSaved:()=>render(),onStep:()=>{}});}
/* ---------------- Requests ---------------- */
function requests(B){const vm=STORE.can('respond');
 B.innerHTML='<div class="panel" id="rt"></div>';
 C.table($('#rt'),{key:'id',minw:1000,label:'Requests',rows:()=>STORE.get('requests').slice().sort((a,b)=>(a.status==='Open'?0:1)-(b.status==='Open'?0:1)||b.at-a.at),cols:[{k:'status',h:'Status',cls:'stc',status:true,text:r=>r.status,render:r=>ps(r.status)+(r.breached&&r.status==='Open'?' '+UI.status('SLA breached','red'):'')},{k:'id',h:'Request ID'},{k:'type',h:'Type'},{k:'tripId',h:'Trip ID'},{k:'to',h:'To'},{k:'need',h:'Needed at',sortv:r=>r.neededAt,text:r=>UI.ftime(r.neededAt)},
  {k:'sla',h:'SLA',noFilter:1,sortable:false,render:r=>r.status==='Open'?UI.cd(r.deadline,'left'):'<span class="sm mut">'+esc(r.response||'')+'</span>'},{k:'by',h:'Requested by'}],
   actions:{view:r=>respond(r.id,false),edit:r=>respond(r.id,true),can:(k,r)=>k==='view'||(k==='edit'&&vm&&r.status==='Open'),name:r=>r.id},
   empty:{text:'No requests'}});}
function respond(id,edit){const r=STORE.byId('requests',id);const t=STORE.byId('trips',r.tripId)||{};let mode='replace';
 const cands=r.type==='Driver'?MD.get().drivers.filter(d=>d.group==='POOL'&&!DOM.onLeave(d.id,t.date)).slice(0,12).map(d=>[d.id,d.name+'  ('+UI.dur(DOM.dutyWith(d.id,t).duty)+')']):MD.get().vehicles.filter(v=>v.group==='POOL'&&v.opStatus==='Available').slice(0,12).map(v=>[v.plate,v.plate+'  '+v.chassis+' · '+v.body]);
 DLG.open({title:edit?'Respond':r.id,sub:esc(r.type+' for '+r.tripId+', needed '+UI.ftime(r.neededAt)),width:480,body:(edit?PL.seg([['replace','Send replacement'],['none','Not available']],mode,'data-rm')+'<div id="rmb" class="mt3">'+C.field(r.type,'<select class="select" id="rc">'+C.opts(cands,'','Select')+'</select>',{req:1,for:'rc'})+'</div>'+C.field('Note','<input class="input" id="rn">'):'<dl class="kv2"><dt>Status</dt><dd>'+esc(r.status)+'</dd><dt>Note</dt><dd>'+esc(r.note||'-')+'</dd><dt>Response</dt><dd>'+esc(r.response||'-')+'</dd><dt>By</dt><dd>'+esc(r.respondedBy||'-')+'</dd></dl>'),
  onOpen(L){$$('[data-rm]',L.el).forEach(b=>b.onclick=()=>{mode=b.dataset.rm;$$('[data-rm]',L.el).forEach(x=>x.classList.toggle('on',x===b));$('#rmb',L.el).hidden=mode!=='replace';});},
  buttons:edit?[{label:'Cancel'},{label:'Send',kind:'primary',onClick(L,el){const rs=STORE.get('requests');const x=rs.find(y=>y.id===id);
   if(mode==='replace'){const v=$('#rc',el).value;if(!C.setErr($('#rc',el),v?'':'Required'))return false;x.status='Answered';x.response=(r.type==='Driver'?(MD.driver(v)||{}).name:v)+' available';READY.assign(t,r.type==='Driver'?'driver':'unit',v,'Replacement from '+(r.type==='Driver'?'DM':'VM'));}
   else{x.status='Answered';x.response='Not available';STORE.notify({kind:'Action Required',to:['planner','plannerlead'],title:'No replacement for '+r.tripId,link:'readiness.html'});const all=STORE.get('trips');const tt=all.find(y=>y.id===r.tripId);if(tt){tt.replacing=false;STORE.set('trips',all);}}
   x.respondedBy=STORE.me().n;x.respondedAt=STORE.now();x.note2=$('#rn',el).value;STORE.set('requests',rs);STORE.audit({action:'Responded '+id,detail:x.response,obj:r.tripId,type:'Status'});toast('Response sent');render();}}]:[{label:'Close',kind:'primary'}]});}
/* ---------------- Exceptions ---------------- */
function exceptions(B){B.innerHTML='<div class="panel" id="et"></div>';
 C.table($('#et'),{key:'id',minw:1000,label:'Exceptions',rows:()=>STORE.get('exceptions').slice().sort((a,b)=>(!a.decision?0:1)-(!b.decision?0:1)||b.requestedAt-a.requestedAt),
  cols:[{k:'status',h:'Status',cls:'stc',status:true,text:x=>x.decision||(x.expired?'No decision':x.escalated?'Escalated':'Exception Requested'),render:x=>x.decision==='Approved'?UI.status('Approved','green'):x.decision==='Rejected'?UI.status('Rejected','red'):x.expired?UI.status('No decision','slate'):x.escalated?UI.status('Escalated','amber'):st('exreq')},{k:'id',h:'Exception ID'},{k:'tripId',h:'Trip ID'},
   {k:'r',h:'Reason',text:x=>x.reasons.map(r=>r.label).join(', ')},{k:'req',h:'Requested',text:x=>x.requester+' '+UI.ftime(x.requestedAt)},{k:'sla',h:'Decision',noFilter:1,sortable:false,render:x=>x.decision?esc(x.decidedBy)+' '+UI.ftime(x.decidedAt):UI.cd(x.deadline,'left')}],actions:{view:x=>{location.href='exceptions.html?id='+x.id;},edit:x=>{location.href='exceptions.html?id='+x.id;},can:(k,x)=>k==='view'||(k==='edit'&&READY.canDecide(x)),name:x=>x.id},empty:{text:'No exceptions'}});}
/* ---------------- Reports ---------------- */
let rep='daily';
function reports(B){const list=STORE.get('trips').filter(t=>t.date===F.date);const ev=list.map(t=>({t,e:DOM.evaluate(t)}));const n=s=>ev.filter(x=>x.e.state===s).length;const active=ev.filter(x=>x.e.state!=='skipped');
 const reasons={};ev.forEach(x=>(x.e.state==='notready'||x.e.state==='exreq'||x.e.state==='withex'||x.e.state==='pred')&&x.e.reasons.forEach(r=>{if(r.label)reasons[r.label]=(reasons[r.label]||0)+1;}));
 const repl=STORE.get('auditLog').filter(a=>/^Replaced/.test(a.action)&&UI.iso(new Date(a.ts))===F.date).length;
 B.innerHTML='<div class="row gap2">'+PL.seg([['daily','Daily Readiness'],['handover','Handover']],rep,'data-rep_')+'<input type="date" class="u-width-170 input" id="rd" value="'+F.date+'"><span class="sp"></span><button type="button" class="btn" id="rx">'+ic('download')+'Export</button></div><div id="rb" class="mt3"></div>';
 if(rep==='daily')$('#rb').innerHTML=PL.stats([{k:'Trips',v:active.length},{k:'Ready',v:n('ready')+n('withex'),tone:'ok'},{k:'Not Ready',v:n('notready'),tone:n('notready')?'bad':''},{k:'Replacements',v:repl},{k:'Skipped',v:n('skipped')},{k:'Exceptions',v:STORE.get('exceptions').filter(x=>(STORE.byId('trips',x.tripId)||{}).date===F.date).length}])+
  '<div class="panel mt3"><div class="panel-hd"><h3>Not Ready by reason</h3></div><div class="body bars">'+(Object.keys(reasons).length?Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(r=>PL.bar(r[0],r[1],Math.max(...Object.values(reasons)),{lw:160}).replace(' / '+Math.max(...Object.values(reasons)),'')).join(''):'<span class="mut">None</span>')+'</div></div>';
 else{const rows=active.filter(x=>!x.t.vendor).sort((a,b)=>a.t.out-b.t.out);$('#rb').innerHTML='<div class="panel" id="ht"></div>';C.table($('#ht'),{key:'id',label:'Handover',rows:rows.map(x=>Object.assign({id:x.t.id,_t:x.t,_e:x.e})),cols:[{k:'status',h:'Readiness',cls:'stc',status:true,text:r=>UI.ST[r._e.state][1],render:r=>st(r._e.state)},{k:'id',h:'Trip ID'},{k:'dep',h:'Departure',text:r=>hm(r._t.out)},{k:'u',h:'Unit',text:r=>r._t.unit||''},{k:'d',h:'Driver',text:r=>READY.drvName(r._t)},{k:'n',h:'Note',text:r=>(r._e.reasons.find(x=>x.label)||{}).label||''}]});}
 $$('[data-rep_]').forEach(b=>b.onclick=()=>{rep=b.dataset.rep_;render();});$('#rd').onchange=e=>{F.date=e.target.value;render();};
 $('#rx').onclick=()=>{const name=IO.fname(rep==='daily'?'Daily_Readiness':'Handover','xlsx');IO.writeBook([{name:'Trips',aoa:[['Trip','Date','Departure','Project','Unit','Driver','Readiness','Reasons']].concat(ev.map(x=>[x.t.id,x.t.date,hm(x.t.out),x.t.project,x.t.unit||'',READY.drvName(x.t),x.e.state,x.e.reasons.map(r=>r.label||r).join(', ')]))},{name:'Reasons',aoa:[['Reason','Trips']].concat(Object.entries(reasons))}],name);toast('Downloading '+name);};}
($('#hist')||{}).onclick=()=>PANELS.history({obj:'TS-'+F.date.replace(/-/g,''),title:'Readiness '+UI.fdate(F.date,{noYear:1})});
$('#exp').onclick=()=>{const list=trips();IO.exportDialog({title:'Readiness '+UI.fdate(F.date),name:'Readiness_'+F.date,rows:()=>list,cols:[{h:'Trip',v:t=>t.id},{h:'Departure',v:t=>hm(t.out)},{h:'Project',v:t=>t.project},{h:'Route',v:t=>READY.routeLabel(t)},{h:'Driver',v:t=>READY.drvName(t)},{h:'Unit slot',v:t=>t.slotUnit||''},{h:'Unit',v:t=>t.unit||''},{h:'Readiness',v:t=>DOM.evaluate(t).state},{h:'Workflow',v:t=>t.status},{h:'Reasons',v:t=>DOM.evaluate(t).reasons.map(r=>r.label||r).join(', ')}]});};
/* Project Information actions: pick a project from the all-projects context, refresh a stale read, retry an
   unavailable source. Nothing here edits Customer Project. */
document.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;
 const card=t.closest('[data-pinfo-proj]');if(card){F.project=card.dataset.pinfoProj;render();return;}
 if(t.closest('#pinfoR')){const live=readProj(F.project);if(live)SRC[F.project]={start:live.start,validity:live.validity,at:STORE.now()};toast('Project dates refreshed');render();return;}
 if(t.closest('#pinfoRetry')){MD.refresh();const live=readProj(F.project);if(live)SRC[F.project]={start:live.start,validity:live.validity,at:STORE.now()};toast(live?'Project dates reloaded':'Customer Project still unavailable',live?{}:{tone:'warn'});render();}});
window.addEventListener('md-change',()=>{if(!DLG.layers.length)render();});
render();
/* live: re-render when another tab (Field Ops tablet, PM) changes data */
['readiness','trips','exceptions','requests','leave','unitStatus','maintenance'].forEach(e=>STORE.subscribe(e,(x,src)=>{if(src==='remote'&&!DLG.layers.length)render();}));
})();
