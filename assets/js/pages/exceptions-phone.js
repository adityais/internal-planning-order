/* PM approval on phone (390 wide): Inbox list -> approval screen with fixed 48px action bar. */
(function(){
const {ic,esc,tag,st}=UI;const {$,$$,toast}=C;
STORE.ensure();document.title='Approval - MODA TMS';document.body.classList.add('phone');
let id=UI.q('id');
function bar(title,back,right){return '<header class="u-padding-0-s4-gap-s3 appbar">'+(back?'<a class="u-background-none abtn" href="'+back+'" aria-label="Back">'+ic('left')+'</a>':'<div class="logo"><div class="mk">M</div></div>')+'<b class="u-flex-1-font-size-16">'+esc(title)+'</b>'+(right||'')+'</header>';}
function bell(){const n=STORE.get('notifications').filter(m=>!m.read&&m.kind==='Action Required'&&(m.to||[]).indexOf(STORE.persona())>=0).length;return '<span class="u-background-none abtn" aria-label="'+n+' action required">'+ic('bell')+(n?'<span class="badge">'+n+'</span>':'')+'</span>';}
function inbox(){const pk=STORE.persona();const list=STORE.get('notifications').filter(n=>(n.to||[]).indexOf(pk)>=0);const ex=STORE.get('exceptions').filter(x=>!x.decision&&!x.expired);
 document.body.innerHTML='<div class="phone">'+bar('Inbox',null,bell())+'<div class="u-padding-s3-s4 row gap2">'+tag('View as '+esc(STORE.me().label),'line','eye')+'<span class="sp"></span><a class="btn sm" href="exceptions.html">Desktop</a></div><div class="u-flex-1">'+
  ex.map(x=>{const t=STORE.byId('trips',x.tripId)||{};return '<a href="?id='+x.id+'" class="u-padding-s3-s4-text-decoration-none-color-49821 inb"><span class="u-background-amber-s-color-amber-t avatar">'+ic('flag')+'</span><div class="u-flex-1-min-width-0 col"><b class="sm">Exception '+esc(x.tripId)+'</b><span class="xs mut">'+esc(x.reasons.map(r=>r.label).join(', '))+'</span></div>'+UI.cd(READY.excLive(x).escalated?STORE.ts(t.date,t.out):x.deadline,'left')+'</a>';}).join('')+
  list.filter(n=>n.link.indexOf('exceptions')<0).map(n=>'<a href="'+esc(n.link)+'" class="u-padding-s3-s4-text-decoration-none-color-93420 inb'+(n.read?'':' unread')+'"><span class="u-background-slate-s-color-slate-t avatar">'+ic(n.kind==='Action Required'?'alert':'info')+'</span><div class="u-flex-1-min-width-0 col"><b class="sm">'+esc(n.title)+'</b><span class="xs mut">'+esc(n.kind)+' &middot; '+UI.ftime(n.ts)+'</span></div><span class="btn sm">Open</span></a>').join('')+(ex.length||list.length?'':'<div class="empty"><b>No messages</b></div>')+'</div></div>';C.TICK.now();}
function detail(){const x=STORE.byId('exceptions',id);if(!x){id=null;return inbox();}const t=STORE.byId('trips',x.tripId);const fb=READY.excLive(x).escalated&&STORE.can('approveFallback');const can=READY.canDecide(x);
 document.body.innerHTML='<div class="phone">'+bar('Exception request','exceptions-phone.html',bell())+'<div class="u-padding-s2-s4-border-bottom-1-solid-line row">'+st(x.decision==='Approved'?'withex':x.decision?'notready':'exreq',{sm:1})+'</div><div class="u-flex-1-padding-s4" id="pb">'+READY.approvalBody(x,{phone:1,readOnly:!can})+'</div>'+
  (can?'<div class="pbar"><button type="button" class="u-flex-1 btn xl danger-o" id="rj">'+ic('x')+'Reject</button><button type="button" class="u-flex-1 btn xl primary" id="ap">'+ic('check')+(fb?'Approve as fallback':'Approve')+'</button></div>':'')+'</div>';
 C.TICK.now();if(can){$('#rj').onclick=()=>{if(READY.decide(x,false,($('#cmt').value||'').trim(),document.body))detail();};$('#ap').onclick=()=>{if(READY.decide(x,true,($('#cmt').value||'').trim(),document.body))detail();};}}
(id?detail:inbox)();
STORE.subscribe('exceptions',(e,s)=>{if(s==='remote')(id?detail:inbox)();});
})();
