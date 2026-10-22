/* Exception approval (desktop): list + 520px PM drawer with live SLA countdown; fallback approval for OpsLog Dept Head. */
(function(){
const {ic,esc,tag,st}=UI;const {$,$$,DLG,toast}=C;
if(!SHELL.mount({module:'planning',id:'readiness',active:'readiness',title:'Exception approval',crumb:'<a href="readiness.html">Readiness Board</a>',actions:'<a class="btn" href="exceptions-phone.html">'+ic('phone-app')+'Phone view</a><button type="button" class="btn" id="rep">'+ic('download')+'Exception Report</button>'}))return;
function list(){$('#content').innerHTML='<div class="panel" id="et"></div>';
 C.table($('#et'),{key:'id',minw:1000,label:'Exceptions',rows:()=>STORE.get('exceptions').slice().sort((a,b)=>(!a.decision?0:1)-(!b.decision?0:1)||b.requestedAt-a.requestedAt),onRow:id=>open(id),
  cols:[{k:'st',h:'Status',cls:'stc',text:x=>x.decision||'Pending',render:x=>x.decision==='Approved'?tag('Approved','green','check'):x.decision==='Rejected'?tag('Rejected','red','x'):READY.excLive(x).expired?tag('No decision','slate','clock'):READY.excLive(x).escalated?tag('Escalated','amber','alert'):st('exreq',{sm:1})},
   {k:'id',h:'Exception',render:x=>'<span class="mono">'+x.id+'</span>'},{k:'tripId',h:'Trip',render:x=>'<span class="mono sm">'+x.tripId+'</span>'},{k:'r',h:'Reason',text:x=>x.reasons.map(r=>r.label).join(', ')},{k:'req',h:'Requested',text:x=>x.requester+' '+UI.ftime(x.requestedAt)},
   {k:'sla',h:'Decision',noFilter:1,sortable:false,render:x=>x.decision?esc(x.decidedBy)+' '+UI.ftime(x.decidedAt):UI.cd(x.deadline,'left')},{k:'_act',h:'Action',cls:'act',sortable:false,render:x=>'<button type="button" class="btn sm'+(!x.decision?' primary':'')+'" data-o="'+x.id+'">Open</button>'}],
  empty:{text:'No exception requests'},after:h=>$$('[data-o]',h).forEach(b=>b.onclick=()=>open(b.dataset.o))});}
function open(id){const x=STORE.byId('exceptions',id);if(!x)return;const fb=READY.excLive(x).escalated&&STORE.can('approveFallback');const canDecide=READY.canDecide(x);
 const L=DLG.drawer({title:'Exception request',sub:esc(x.requester+', '+UI.ftime(x.requestedAt)),width:520,chip:st(x.decision==='Approved'?'withex':x.decision?'notready':'exreq'),body:READY.approvalBody(x,{readOnly:!canDecide}),onClose:()=>{history.replaceState(null,'','exceptions.html');list();},
  buttons:canDecide?[{label:'Reject',kind:'danger-o',icon:'x',size:'lg',style:'flex:1',onClick:(L,el)=>READY.decide(x,false,($('#cmt',el).value||'').trim(),el)},{label:fb?'Approve as fallback':'Approve',kind:'primary',icon:'check',size:'lg',style:'flex:1',onClick:(L,el)=>READY.decide(x,true,($('#cmt',el).value||'').trim(),el)}]:[{label:'Close',kind:'primary'}]});
 const ft=$('.ft',L.el);const sp=ft.querySelector('.sp');if(sp&&canDecide)sp.remove();
 history.replaceState(null,'','exceptions.html?id='+id);}
$('#rep').onclick=()=>{const ex=STORE.get('exceptions');const by={};ex.forEach(x=>x.reasons.forEach(r=>by[r.label]=(by[r.label]||0)+1));const name=IO.fname('Exception_Report','xlsx');
 IO.writeBook([{name:'Exceptions',aoa:[['Exception','Trip','Project','Reasons','Failed item','Requester','Requested','Decision','Decided by','Decided at','Fallback','Comment']].concat(ex.map(x=>{const t=STORE.byId('trips',x.tripId)||{};return [x.id,x.tripId,t.project||'',x.reasons.map(r=>r.label).join(', '),x.failedItem||'',x.requester,UI.fdt(x.requestedAt),x.decision||(x.expired?'No decision':'Pending'),x.decidedBy||'',x.decidedAt?UI.fdt(x.decidedAt):'',x.fallback?'Yes':'',x.comment||''];}))},{name:'By reason',aoa:[['Reason','Count']].concat(Object.entries(by))}],name);toast('Downloading '+name);};
list();const id=UI.q('id');if(id)open(id);
STORE.subscribe('exceptions',(e,s)=>{if(s==='remote'&&!DLG.layers.length)list();});
})();
