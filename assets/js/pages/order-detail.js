/* Order Detail (View): Order Information, Project Information, Dealing (Registered / Not). History = the same History button as every other page.
   Edit opens the same popup as New Order; Delete = Cancel with a reason (the order stays as Cancelled). Duplicate compare and "review needed" stay as notices. */
(function(){
const {ic,esc}=UI;const {$,$$,DLG,toast,banner}=C;
const id=UI.q('id');try{ASSIGNQ.sweep();}catch(e){}const o0=(function(){const x=ORD.byId(id);if(x&&!ORD.visible(x))return null;return x&&STORE.persona()==='vendor'&&!VENDOR.isMine(x,VENDOR.me())?null:x;})();
if(!o0){if(SHELL.mount({module:'order',id:'inbox',active:'inbox',title:'Order',crumb:'<a href="order-inbox.html">Order Management</a>'}))$('#content').innerHTML='<div class="panel"><div class="empty"><b>'+(id?'Order '+esc(id)+' not found':'No order selected')+'</b><a class="btn ghost" href="order-inbox.html">'+ic('left')+'Back to Order Management</a></div></div>';return;}
const can=STORE.can('order');
const cur=()=>ORD.byId(id)||o0;
const editable=o=>can&&['Converted','Dropped','Cancelled'].indexOf(o.status)<0;
/* two tabs, one view: Order Information | Assignment (Assignment only for an order that is in assignment and a role that may see it) */
let dtab=UI.q('tab','info');let editing=UI.q('edit')==='1';
/* opened straight into Edit (row Edit in the Order Management): Cancel / Save go back to that Inbox tab; Edit pressed on this page returns to the view */
const fromList=editing,fromTab=UI.q('from');
/* Dedicated Own Asset / Transporter orders are assigned automatically: no Assignment tab once assigned, it only shows for the exception (allocation not enough) */
const autoKind=o=>{const k=ASSIGNQ.kindOf(o);return k==='ded-own'||k==='ded-vendor';};
const asgTo=o=>{const a=o.assignment||{};if(['Assigned','Planned','Converted'].indexOf(o.status)<0||!a.path)return '';return a.path==='Vendor'?'Transporter'+(a.vendor&&STORE.persona()!=='vendor'?' ('+a.vendor+')':''):'Own Asset';};
const hasAsg=o=>ORD.inAssignment(o)&&ROLES.canTab('inbox','assignment')&&!(autoKind(o)&&['Assigned','Planned','Converted'].indexOf(o.status)>=0);
const inboxTab=o=>o.status==='Pending Dealing'?'dealing':ASSIGNQ.inQueue(o)?(o.status==='Assigned'||o.status==='Planned'?'assigned':o.status==='Assigning'||o.status==='Re-sourcing'||o.status==='Unfulfilled'?'assigning':'assignment'):'all';
function render(){const o=cur();const pi=ORD.projInfo(o);const plan=ORD.planId(o);const st=ORD.stopsOf(o);const reg=ORD.dealingOk(o);const miss=ORD.missingText(o);
 const sta=ORD.statusText(o);const asg=hasAsg(o);if(dtab!=='assignment'||!asg)dtab='info';
 if(!SHELL.mount({module:'order',id:'inbox',active:'inbox',title:o.id,crumb:'<a href="order-inbox.html?tab='+inboxTab(o)+'">Order Management</a>',
  actions:(editing?'':'<button type="button" class="btn" id="hist">'+ic('history')+'History</button>')+(DEALING.pending(o)&&DEALING.isSales()?'<button type="button" class="btn" id="addrate">'+ic('external')+'Add rate</button>':'')+(DEALING.pending(o)&&DEALING.canAllow()?'<button type="button" class="btn primary" id="allow">'+ic('check')+'Allow</button>':'')+(editable(o)&&!editing?'<button type="button" class="btn" id="edit">'+ic('edit')+'Edit</button>':'')+(can&&['Converted','Dropped','Cancelled'].indexOf(o.status)<0?'<button type="button" class="btn danger-o" id="del">'+ic('trash')+'Delete</button>':'')}))return;
 if(editing&&!editable(o))editing=false;
 if(editing){const back=()=>{if(fromList){location.href='order-inbox.html?tab='+(fromTab||inboxTab(o));return;}editing=false;history.replaceState(null,'','?id='+o.id+(dtab==='info'?'':'&tab='+dtab));render();};
  $('#content').innerHTML='<div class="panel"><div class="panel-hd"><h3>Edit Order</h3></div><div class="body" id="eform"></div></div>';
  ORD.openForm({order:o,host:$('#eform'),onDone:back,onCancel:back});wire(o);return;}
 const dup=o.duplicate&&!o.dupResolved?banner('warn','Possible duplicate of <b>'+esc(o.duplicate)+'</b>',{acts:can?'<button type="button" class="btn sm" id="cmp">Compare</button>':''}):'';
 const rev=o.reviewNeeded?banner('warn','Order changed after assignment',{acts:can?'<button type="button" class="btn sm" id="rvd">Mark reviewed</button>':''}):'';
 const clr=o.question&&o.status==='Need Clarification'?banner('info','<b>Clarification:</b> '+esc(o.question),{acts:can?'<button type="button" class="btn sm" id="ans">Mark answered</button>':''}):'';
 const kv=(k,v)=>'<dt>'+k+'</dt><dd>'+(v==null||v===''?'<span class="mut">-</span>':v)+'</dd>';
 const dash=v=>v==null||v===''||v===0?'':v;
 const tabs=asg?PL.tabs([['info','Order Information'],['assignment','Assignment']],dtab):'';
 if(dtab==='assignment'){$('#content').innerHTML=tabs+'<div class="mt3" id="asg"></div>';ASSIGNQ.bench($('#asg'),o.id,render);wire(o);return;}
 /* Order Information view: same five sections as the New Order form (Customer & Project, Delivery Date, Locations, Unit Information, Special Handling / Note) */
 const fld=(l,v,cls)=>'<div class="od-f'+(cls?' '+cls:'')+'"><span class="od-l">'+l+'</span><span class="od-v">'+(v==null||v===''?'<span class="mut">-</span>':v)+'</span></div>';
 const sec=(t,b,r)=>'<div class="panel od-sec"><div class="panel-hd"><h3>'+t+'</h3>'+(r?'<span class="sp"></span>'+r:'')+'</div><div class="body">'+b+'</div></div>';
 const pj=ORD.project(o)||{};
 const TONE={'Pick Up':'pick','Drop Off':'drop',Transit:'transit',Pool:'pool'};
 const stopCard=(s,i)=>{const has=s.lat!==''&&s.lat!=null&&s.lng!==''&&s.lng!=null;const map=has?'<button type="button" class="btn sm od-mapbtn" data-omap="'+i+'" aria-expanded="false" aria-label="View location '+(i+1)+' on map">'+ic('pin')+'Maps</button>':'';
  const eta=s.eta?esc((s.etaDate?UI.fdate(s.etaDate)+' ':'')+s.eta):'';
  return '<li class="od-stop"><span class="od-n">'+(i+1)+'</span><div class="od-card">'+
   '<div class="od-top"><span class="od-type od-t-'+(TONE[s.type]||'pool')+'">'+esc(s.type)+'</span><b class="od-name">'+esc(s.loc||'-')+'</b>'+'</div>'+
   '<div class="od-addr">'+(s.addr?esc(s.addr):'<span class="mut">No address</span>')+'</div>'+
   '<div class="od-meta">'+fld('City / Regency',esc(ORD.city(s.city||'')))+fld('Coordinates','<span class="od-coord"><span class="tnum">'+(has?esc(s.lat+', '+s.lng):'-')+'</span>'+map+'</span>')+fld('Est. Arrival',eta)+fld('Handling Time',s.handling==null?'':esc(s.handling+' min'))+'</div>'+
   (has?'<div class="od-mapbox" data-omapbox="'+i+'" data-lat="'+esc(s.lat)+'" data-lng="'+esc(s.lng)+'" hidden></div>':'')+
   '<div class="od-do"><span class="od-l">No DO</span>'+(s.dos&&s.dos.length?s.dos.map(d=>'<span class="oc-chip od-chip">'+esc(d)+'</span>').join(''):'<span class="mut">-</span>')+'</div></div></li>';};
 const cnt=t=>st.filter(s=>s.type===t).length;
 const stopSum=st.length?UI.plural(st.length,'location')+' &middot; '+cnt('Pick Up')+' Pick Up &middot; '+cnt('Drop Off')+' Drop Off'+(cnt('Transit')?' &middot; '+cnt('Transit')+' Transit':'')+(cnt('Pool')?' &middot; '+cnt('Pool')+' Pool':''):'';
  const isV=STORE.persona()==='vendor';
 $('#content').innerHTML=tabs+'<div class="stack'+(asg?' mt3':'')+'">'+dup+rev+clr+
  '<div class="panel od-strip"><div class="body">'+fld('Order ID',esc(o.id))+fld('Status',UI.status(sta))+fld('Source',esc(o.source))+fld('Order Date & Time',esc(UI.fdt(o.createdAt)))+'</div></div>'+
  sec('Customer &amp; Project','<div class="od-grid">'+fld('Plan ID',esc(plan))+fld('Customer Name',esc(o.customer))+fld('Customer Project',esc(o.projectName||pj.name))+fld('Business Line',esc(pj.bizline))+fld('Project Type',esc(o.ptype||pj.ptype))+fld('Fulfillment by Ownership',esc(ORD.fulfillment(o)))+(asgTo(o)?fld('Assigned To',esc(asgTo(o))):'')+'</div>')+
  sec('Delivery Date','<div class="od-grid">'+fld('Delivery Start Date',esc(UI.fdate(o.date,{dow:1})))+fld('Delivery Start Time',esc((o.window||[])[0]||''))+'</div>')+
  sec('Locations',st.length?'<ol class="od-stops">'+st.map(stopCard).join('')+'</ol>':'<div class="mut">No location</div>',stopSum?'<span class="sm mut">'+stopSum+'</span>':'')+
  sec('Unit Information','<div class="od-grid od-g5">'+fld('Qty Unit',esc(UI.plural(o.qty||1,'unit')))+fld('Unit Category',esc(o.unitCategory))+fld('Karoseri',esc(o.body))+fld('Tonase',dash(o.ton)?esc(UI.num(o.ton,2)+' ton'):'')+fld('Volume',dash(o.m3)?esc(UI.num(o.m3,2)+' m3'):'')+'</div>')+
  sec('Special Handling / Note',o.note?'<div class="od-note">'+esc(o.note)+'</div>':'<span class="mut">No special handling</span>')+
  '<div class="panel"><div class="panel-hd"><h3>Project Information</h3></div><div class="body"><dl class="kv2 oc-kv">'+kv('Customer PIC Name',esc(pi.pic))+kv('Customer PIC Phone Number',esc(pi.phone))+kv('Service Level',esc(pi.sl))+kv('Commodity',esc(pi.commodity))+kv('Claim T&amp;C',esc(pi.claim))+kv('Delivery Note SLA'+(pi.region?' ('+esc(pi.region)+')':''),esc(pi.sla))+'</dl></div></div>'+
  '<div class="panel"><div class="panel-hd"><h3>Dealing</h3></div><div class="body"><dl class="kv2 oc-kv">'+kv('Dealing',reg?UI.status('Registered','green'):UI.status('Not Registered','red'))+kv('Route Without Rate',esc(DEALING.noRateCol.text(o)))+(ORD.inAssignment(o)?kv('Offers',esc(ASSIGNQ.cols.find(c=>c.k==='off').text(o))):'')+'</dl></div></div></div>';
 $$('[data-omap]').forEach(b=>b.onclick=()=>{const i=b.dataset.omap;const box=$('[data-omapbox="'+i+'"]');const open=box.hidden;box.hidden=!open;b.setAttribute('aria-expanded',String(open));b.classList.toggle('on',open);b.lastChild.textContent=open?'Hide map':'Maps';
  if(open&&!box._init){box._init=true;ORD.loadLeaflet().then(L=>{const p=[+box.dataset.lat,+box.dataset.lng];const m=L.map(box,{attributionControl:false}).setView(p,16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(m);L.marker(p).addTo(m);setTimeout(()=>m.invalidateSize(),80);}).catch(()=>{box.innerHTML='<div class="mut sm u-padding-s4">Map needs internet.</div>';});}});
 if(isV)$$('.panel-hd h3').forEach(h=>{if(h.textContent==='Dealing')h.closest('.panel').remove();});/* vendors do not see the dealing check */
 wire(o);}
function wire(o){const g=s=>$(s);
 $$('[data-tab]').forEach(b=>b.onclick=()=>{dtab=b.dataset.tab;history.replaceState(null,'','?id='+o.id+(dtab==='info'?'':'&tab='+dtab));render();});
 
 g('#hist').onclick=()=>PANELS.history({obj:o.id,title:o.id,types:['Order','Dealing','Assignment']});
 if(g('#edit'))g('#edit').onclick=()=>{editing=true;history.replaceState(null,'','?id='+o.id+'&edit=1');render();};
 if(g('#addrate'))g('#addrate').onclick=()=>DEALING.addRate();
 if(g('#allow'))g('#allow').onclick=()=>DEALING.allow(cur(),render);
 if(g('#del'))g('#del').onclick=()=>ORD.drop(cur(),render);
 if(g('#cmp'))g('#cmp').onclick=compare;
 if(g('#ans'))g('#ans').onclick=()=>{const x=cur();x.status='Draft';x.answered=STORE.now();ORD.save(x,'Clarification answered');toast('Marked answered');render();};
 if(g('#rvd'))g('#rvd').onclick=()=>{const x=cur();x.reviewNeeded=false;ORD.save(x,'Change reviewed');render();};}
function compare(){const o=cur();const b=ORD.byId(o.duplicate);if(!b)return;const rows=[['Customer Name',o.customer,b.customer],['Project Name',o.projectName||o.project,b.projectName||b.project],['Delivery Start',ORD.pickup(o),ORD.pickup(b)],['Route',ORD.route(o),ORD.route(b)],['Volume',UI.num(o.m3,1)+' m3',UI.num(b.m3,1)+' m3'],['Source',o.source,b.source]];
 DLG.open({title:'Possible duplicate',width:640,body:'<table><thead><tr><th></th><th>'+o.id+' (this)</th><th>'+b.id+'</th></tr></thead><tbody>'+rows.map(r=>'<tr><td class="mut">'+r[0]+'</td><td'+(r[1]!==r[2]?' class="hl"':'')+'>'+esc(r[1])+'</td><td'+(r[1]!==r[2]?' class="hl"':'')+'>'+esc(r[2])+'</td></tr>').join('')+'</tbody></table>',
  buttons:[{label:'Cancel'},{label:'Cancel this order',kind:'danger-o',onClick(){const x=ORD.byId(id);x.status='Dropped';x.dropReason='Duplicate of '+b.id;x.dupResolved=true;b.dupResolved=true;ORD.save(b);ORD.save(x,'Cancelled as duplicate',b.id);toast('Cancelled');render();}},
   {label:'Keep both',onClick(){const x=ORD.byId(id);x.dupResolved=true;b.dupResolved=true;ORD.save(b);ORD.save(x,'Kept both',b.id);render();}},
   {label:'Merge',kind:'primary',onClick(){const x=ORD.byId(id);b.wa=(b.wa||[]).concat(x.wa||[]);b.dupResolved=true;b.mergedFrom=x.id;x.status='Dropped';x.dropReason='Merged into '+b.id;x.dupResolved=true;ORD.save(b,'Merged '+x.id);ORD.save(x,'Merged into '+b.id);toast('Merged into '+b.id);location.href='order-detail.html?id='+b.id;}}]});}
render();
STORE.subscribe('orders',(e,s)=>{if((s==='remote'||dtab==='assignment')&&!DLG.layers.length&&!editing)render();});
})();
