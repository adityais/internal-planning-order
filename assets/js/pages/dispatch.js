/* Trip Management (Direct Delivery), simplified.
   ONE table, one row = one trip. Every unit of an own-asset order gets its trip (and Trip ID) as soon as the board opens: Qty 2 = 2 rows, never merged.
   Tabs and statuses are the three stages: Trip Confirmation > Trip Assignment > Ready to Depart (= Published).
   View and Edit open the same page, dispatch-detail.html (dispatch-detail.js); the Publish button of a trip is at the bottom of that page. There is no bulk publish.
   Shared trip logic: ddlib.js (DDL). The previous board is kept as dispatch.old.js (not loaded). */
(function(){
const {ic,esc,tag,hm}=UI;const {$,$$,DLG,toast,banner}=C;
const can=STORE.can('plan')||STORE.can('tripEdit');const isVendor=STORE.persona()==='vendor';const canNp=can||STORE.can('supply')||isVendor;
if(!SHELL.mount({module:'order',id:'dispatch',active:'dispatch',title:'Trip Management',crumb:'Order & Delivery',actions:'<button type="button" class="btn" id="hist">'+ic('history')+'History</button>'}))return;
/* Transporter POV: the same board, only its own trips, from Trip Assignment on (it sends plate and driver there) */
let fProj='all',tab=UI.q('tab','all');if(tab==='ready'||tab==='pub')tab='depart';if(tab==='need')tab='all';
const ownOrders=()=>STORE.get('orders').filter(o=>o.assignment&&(o.assignment.path==='Own'||o.assignment.path==='Dedicated')&&['Assigned','Planned','Converted'].indexOf(o.status)>=0&&(fProj==='all'||o.project===fProj));
/* Vendor orders: Assigned to a vendor, the vendor trip appears once plate and driver are in */
const vendorOrders=()=>STORE.get('orders').filter(o=>o.assignment&&o.assignment.path==='Vendor'&&['Assigned','Planned'].indexOf(o.status)>=0&&!o.assignment.trip&&(fProj==='all'||o.project===fProj));
const trips=()=>STORE.get('trips').filter(t=>t.type==='DT'&&!/Cancelled|Skipped/.test(t.status)&&(fProj==='all'||t.project===fProj));
/* order units that still have no trip (only read-only roles see these: for the Planner the trips are created when the board opens) */
function openSlots(){const T=trips().filter(t=>!t.vendor);const out=[];ownOrders().forEach(o=>{const cov=T.filter(t=>t.orders.indexOf(o.id)>=0).length;const q=o.qty||1;for(let i=cov;i<q;i++)out.push({o,slot:i+1,slots:q});});return out;}
const ord=id=>STORE.byId('orders',id);
const {tripCost,statusOf,TONE}=DDL;
/* View and Edit are the same page (dispatch-detail.html); Edit opens it straight in edit mode. A row without a trip yet is addressed by order + unit number. */
const go=(r,edit)=>{location.href='dispatch-detail.html?'+(r.t?'trip='+encodeURIComponent(r.t.id):'order='+encodeURIComponent(r.o.id)+'&slot='+(r.slot||1)+'&slots='+(r.slots||1))+'&date='+((r.t&&r.t.date)||r.o.date||'')+'&from='+tab+(edit?'&edit=1':'');};
/* ---------------- rows: one row = one trip ---------------- */
const dash=v=>v?esc(v):'<span class="mut">-</span>';
const TOLL={none:'Non',mixed:'Mix',full:'Full'};
const TYPE_TONE={'Pick Up':'pick','Drop Off':'drop',Transit:'transit',Pool:'pool'};
function mk(r){const t=r.t,o=r.o||{},a=o.assignment||{};
 r.id=t?t.id:'S|'+o.id+'|'+(r.slot||1);
 r.tripId=t?t.id:'';
 r.orderTxt=(t?t.orders.join(', '):o.id)+(r.slot?' ('+r.slot+'/'+r.slots+')':'');
 r.orderTs=o.createdAt||0;r.orderDT=o.createdAt?UI.fdt(o.createdAt):'';
 r.customer=o.customer||'';
 r.project=o.projectName||(ORD.project(o)||{}).name||'';
 const d0=t?t.date:o.date,m0=t?t.out:UI.parseHM((o.window||[''])[0]);
 r.tripKey=d0+' '+String(m0||0).padStart(5,'0');r.tripDT=d0?UI.fdate(d0)+' '+hm(m0||0):'';
 r.locs=(t?t.orders.map(ord).filter(Boolean):[o]).reduce((acc,x)=>acc.concat(ORD.stopsOf(x)),[]).map(s=>({type:s.type,name:s.loc||'-'}));r.nloc=r.locs.length;
 r.ptype=o.ptype||(ORD.project(o)||{}).ptype||'';r.fulfill=o.id?ORD.fulfillment(o)||'':'';
 r.cat=o.unitCategory||(t&&t.chassis)||'';r.kar=o.body||'';
 r.assignedTo=r.kind==='vendor'?'Transporter':'Own Asset';r.transporter=r.kind==='vendor'?((t&&t.vendor)||a.vendor||((a.vendors||[])[0]||{}).vendor||''):'';
 r.plate=t?(t.unit||''):'';
 r.drv=r.kind==='vendor'?((t&&t.vendorDriver)||''):(t&&t.driver?(MD.driver(t.driver)||{}).name||'':'');
 r.via=r.kind==='vendor'&&t?(t.nopolVia||''):'';
 r.toll=r.kind==='own'&&t&&t.toll&&t.toll.cond?TOLL[t.toll.cond]:'';
 r.status=statusOf(t,r.kind==='vendor');
 r.grp=r.status==='Ready to Depart'||r.status==='Converted'?'depart':r.status==='Trip Assignment'?'asg':'conf';
 r.ujNum=r.kind==='own'&&t?DOM.cost(tripCost(t,t.unit)).total:null;
 r.uj=r.ujNum==null?'':STORE.me().noAmounts?'Set':UI.rp(r.ujNum);
 return r;}
function rowsAll(){const T=trips();const rows=[];
 T.filter(t=>!t.vendor).forEach(t=>{const o=ord(t.orders[0]);const q=o?(o.qty||1):1;let slot=0;
  if(q>1&&t.orders.length===1){const sib=T.filter(x=>!x.vendor&&x.orders.length===1&&x.orders[0]===o.id).sort((a,b)=>a.id.localeCompare(b.id));slot=sib.findIndex(x=>x.id===t.id)+1;}
  rows.push(mk({kind:'own',t,o,slot,slots:slot?q:0}));});
 openSlots().forEach(s=>rows.push(mk({kind:'own',t:null,o:s.o,slot:s.slots>1?s.slot:0,slots:s.slots>1?s.slots:0})));
 T.filter(t=>t.vendor).forEach(t=>rows.push(mk({kind:'vendor',t,o:ord(t.orders[0])})));

 const mine=isVendor?rows.filter(r=>r.kind==='vendor'&&r.o&&VENDOR.isMine(r.o,VENDOR.me())&&r.status!=='Trip Confirmation'):rows;
 return mine.filter(r=>!r.o||!r.o.id||ORD.visible(r.o)).sort((a,b)=>a.tripKey.localeCompare(b.tripKey)||String(a.orderTxt).localeCompare(String(b.orderTxt)));}
/* ---------------- page ---------------- */
const TABS=isVendor?[['all','All'],['asg','Trip Assignment'],['depart','Ready to Depart']]:[['all','All'],['conf','Trip Confirmation'],['asg','Trip Assignment'],['depart','Ready to Depart']];
const EXP=new Set();
const COLS_ALL=[
 {k:'status',h:'Status',status:true,render:r=>UI.status(r.status,TONE[r.status])+(r.t&&r.t.changed&&r.status==='Ready to Depart'?'<div class="xs mut">Changed, publish again</div>':'')},
 {k:'tripId',h:'Trip ID',render:r=>r.tripId?'<span class="mono">'+esc(r.tripId)+'</span>':'<span class="mut">-</span>'},
 {k:'orderTxt',h:'Order ID',render:r=>'<span class="mono">'+esc(r.orderTxt)+'</span>'},
 {k:'orderDT',h:'Order Date & Time',sortv:r=>r.orderTs,w:150},
 {k:'customer',h:'Customer Name',ell:1,w:180},
 {k:'project',h:'Customer Project',ell:1,w:190},
 {k:'tripDT',h:'Trip Date & Time',sortv:r=>r.tripKey,w:170},
 {k:'nloc',h:'Location',sortv:r=>r.nloc,text:r=>r.nloc+' Location',render:r=>'<button type="button" class="lnk" data-exp="'+esc(r.id)+'" aria-expanded="'+EXP.has(r.id)+'">'+r.nloc+' Location '+ic(EXP.has(r.id)?'up':'down','s12')+'</button>'},
 {k:'ptype',h:'Project Type',render:r=>dash(r.ptype)},{k:'fulfill',h:'Fulfillment by Ownership',render:r=>dash(r.fulfill)},
 {k:'assignedTo',h:'Assigned To'},{k:'transporter',h:'Transporter',ell:1,w:170,render:r=>dash(r.transporter)},
 {k:'plate',h:'Unit',render:r=>r.plate?'<b class="plate">'+esc(r.plate)+'</b>'+(r.via?'<div class="xs mut">via '+esc(r.via)+'</div>':''):'<span class="mut">-</span>'},
 {k:'drv',h:'Driver',render:r=>dash(r.drv)},
 {k:'cat',h:'Unit Category'},{k:'kar',h:'Unit Karoseri'},
 {k:'uj',h:'Total Uang Jalan',cls:'num',sortv:r=>r.ujNum==null?-1:r.ujNum,render:r=>r.uj?'<span class="tnum">'+esc(r.uj)+'</span>':'<span class="mut">-</span>'},
 {k:'toll',h:'Toll',render:r=>dash(r.toll)}];
const COLS=isVendor?COLS_ALL.filter(c=>['uj','toll','assignedTo','transporter','ptype','fulfill'].indexOf(c.k)<0):COLS_ALL;
let ROWS=[],TBL=null;
/* the expandable list of locations under a row, same look as the location chips of the Order list */
function paintExp(host){$$('tbody tr[data-k]',host).forEach(tr=>{const b=tr.querySelector('[data-exp]');if(!b)return;const k=b.dataset.exp;b.onclick=()=>{EXP.has(k)?EXP.delete(k):EXP.add(k);TBL.render();};
 if(!EXP.has(k))return;const r=ROWS.find(x=>x.id===k);if(!r)return;const x=document.createElement('tr');x.className='exprow';
 x.innerHTML='<td colspan="'+tr.children.length+'" style="background:var(--bg-soft,#f8fafc)"><div class="row gap2 wrap" style="padding:10px 6px">'+r.locs.map((l,i)=>'<div style="display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:8px 14px;background:#fff"><span style="width:26px;height:26px;border-radius:50%;background:#e0e7ff;color:var(--navy,#2E3192);display:inline-flex;align-items:center;justify-content:center;font-weight:600;font-size:12px">'+(i+1)+'</span><div class="col"><span class="od-type od-t-'+(TYPE_TONE[l.type]||'pool')+'" style="align-self:flex-start">'+esc(l.type)+'</span><span class="sm">'+esc(l.name)+'</span></div></div>').join('')+'</div></td>';tr.after(x);});}
function refresh(){ROWS=rowsAll();
 const n=g=>ROWS.filter(r=>g==='all'||r.grp===g).length;
 $('#tabsHost').innerHTML=PL.tabs(TABS.map(x=>[x[0],x[1],n(x[0])]),tab);
 $$('[data-tab]',$('#tabsHost')).forEach(b=>b.onclick=()=>{tab=b.dataset.tab;history.replaceState(null,'','?tab='+tab);refresh();});
 if(TBL)TBL.render();}
const render=refresh;
function layout(){ASSIGNQ.sweep();[...new Set(STORE.get('orders').filter(o=>o.assignment&&/Own|Dedicated|Vendor/.test(o.assignment.path)).map(o=>o.date))].forEach(d=>DDL.syncTrips(d));
 $('#content').innerHTML='<div id="tabsHost"></div><div class="panel mt3" id="tbl"></div>';

 TBL=C.table($('#tbl'),{key:'id',label:'Trip Management',minw:isVendor?1500:2700,rows:()=>ROWS.filter(r=>tab==='all'||r.grp===tab),cols:COLS,after:paintExp,
  actions:{view:r=>go(r,false),edit:r=>go(r,true),name:r=>r.orderTxt,
   can:(a,r)=>a==='view'||(a==='edit'&&(r.kind==='own'?can&&(!r.t||r.t.status!=='Converted'):canNp&&!!r.t&&r.status==='Trip Assignment'))},
  empty:{text:'No trips yet'}});
 refresh();}
$('#hist').onclick=()=>PANELS.history({obj:['DT-'],title:'Trip Management',types:['Dispatch']});
layout();
['trips','orders'].forEach(e=>STORE.subscribe(e,(x,s)=>{if(s==='remote'&&!DLG.layers.length)refresh();}));
})();
