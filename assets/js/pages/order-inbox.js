/* Order Management: ONE page, ONE table, five tabs used only as a filter by status (like Project Planning): All | Dealing Pending | Ready to Assign | Assigning (+ Unfulfilled, Re-sourcing) | Assigned (+ Planned, = already on the Trip Management).
   Every tab shows the same columns (order columns + Fulfillment by Ownership + Unit Category, Karoseri, SLA, Offers, Route Without Rate); a column that does not apply yet is "-".
   Which tab a role sees: ROLES.TAB 'inbox.*'. The tab bodies are built once and kept, so column filters survive a tab switch.
   Row actions: View and Edit open the same Order Detail page (Edit = edit mode of the order form, or the Assignment tab for an order being assigned); New Order is a popup.
   Header: History, Export (.xlsx), Bulk Order (Excel), New Order. */
(function(){
const {ic,esc}=UI;const {$,$$,DLG,toast}=C;
const ALL=[['all','All'],['dealing','Dealing Pending'],['assignment','Ready to Assign'],['assigning','Assigning'],['assigned','Assigned']];
const TABS=ALL.filter(t=>ROLES.canTab('inbox',t[0]));
let tab=UI.q('tab','all');if(tab==='orders')tab='all';if(!TABS.some(t=>t[0]===tab))tab=(TABS[0]||[])[0]||'all';
if(!SHELL.mount({module:'order',id:'inbox',active:'inbox',title:'Order Management',crumb:'Order & Delivery'}))return;
const can=STORE.can('order');
const inst={};
const HIST='<button type="button" class="btn" id="hist">'+ic('history')+'History</button>';
const HEAD=HIST+'<button type="button" class="btn" id="exp">'+ic('download')+'Export</button>'+(can?'<button type="button" class="btn" id="bulk">'+ic('upload')+'Bulk Order</button><button type="button" class="btn primary" id="new">'+ic('plus')+'New Order</button>':'');
const ROWS={
 all:()=>STORE.get('orders').filter(ORD.visible).sort((a,b)=>b.createdAt-a.createdAt),
 dealing:()=>DEALING.rows().filter(ORD.visible),
 assignment:()=>ASSIGNQ.rows().filter(ORD.visible),
 assigning:()=>ASSIGNQ.assigningRows().filter(ORD.visible),
 assigned:()=>{const r=ASSIGNQ.assignedRows().filter(ORD.visible);return STORE.persona()==='vendor'?r.filter(o=>VENDOR.isMine(o)):r;}};/* vendor POV: only orders assigned to this vendor */
const EMPTY={all:'No orders yet',dealing:'No orders waiting for dealing',assignment:'No orders to assign',assigning:'No orders being assigned',assigned:'No assigned orders'};
const cols=()=>ORD.listCols().concat(ASSIGNQ.cols,['ccr','fieldops','vendor'].indexOf(STORE.persona())>=0?[]:[DEALING.noRateCol]);
/* order form orders: Draft | Ready to Assign | Cancelled (ORD.capStatus); anything later is only opened in the workbench */
const formEditable=o=>can&&ORD.capStatus(o)&&ORD.capStatus(o)!=='Cancelled';
/* same rule as the Order Detail Edit button */
const orderEditable=o=>can&&['Converted','Dropped','Cancelled'].indexOf(o.status)<0;
function makeTab(host,k){
 host.innerHTML='<div class="panel" id="tbl-'+k+'"></div>';let T=null;
 const fresh=()=>{drawStats();if(T)T.render();};
 /* Edit opens the same Order Detail page as View: in edit mode for the order form, on the Assignment tab for an order being assigned */
 const edit=o=>{location.href='order-detail.html?id='+o.id+(ASSIGNQ.inQueue(o)&&ASSIGNQ.canEdit(o)?'&tab=assignment':orderEditable(o)?'&edit=1&from='+k:'');};
 const canEdit=o=>orderEditable(o)||(DEALING.pending(o)?DEALING.canEdit():ASSIGNQ.inQueue(o)&&ASSIGNQ.canEdit(o));
 T=C.table($('#tbl-'+k,host),{key:'id',minw:2300,label:(ALL.find(t=>t[0]===k)||[])[1],rows:ROWS[k],cols:cols(),
  actions:{view:o=>{location.href='order-detail.html?id='+o.id;},edit,del:o=>ORD.drop(o,fresh),can:(a,o)=>a==='view'||(a==='edit'&&canEdit(o))||(a==='del'&&formEditable(o)),name:o=>o.id},
  empty:{text:EMPTY[k],action:k==='all'&&can?'New Order':null,fn:()=>ORD.newOrder(fresh)}});
 fresh();if(k===tab&&UI.q('status')&&T){T.f.status=UI.q('status');T.render();}
 const exp=k==='all'?()=>IO.exportSimple({title:'Orders',name:'Orders',sheet:'Orders',list:()=>T.filtered(),all:ROWS.all,expand:o=>ORD.exportRows([o]),cols:ORD.EXPORT_COLS,obj:'Order Management'})
  :k==='dealing'?()=>IO.exportSimple({title:'Dealing Pending',name:'Dealing_Pending',sheet:'Dealing Pending',list:()=>T.filtered(),all:ROWS.dealing,obj:'Dealing',cols:cols().map(c=>({h:c.h,v:o=>c.text?c.text(o):o[c.k]}))})
  :k==='assigning'?()=>IO.exportSimple({title:'Assigning',name:'Assigning',sheet:'Assigning',list:()=>T.filtered(),all:ROWS.assigning,obj:'Assignment',cols:ASSIGNQ.expCols})
  :k==='assigned'?()=>IO.exportSimple({title:'Assigned',name:'Assigned',sheet:'Assigned',list:()=>T.filtered(),all:ROWS.assigned,obj:'Assignment',cols:ASSIGNQ.expCols})
  :()=>IO.exportSimple({title:'Ready to Assign',name:'Ready_to_Assign',sheet:'Ready to Assign',list:()=>T.filtered(),all:ROWS.assignment,obj:'Assignment',cols:ASSIGNQ.expCols});
 return {T,refresh:fresh,exp,
  newOrder:()=>ORD.newOrder(fresh),
  bulk:()=>IO.bulkDialog({title:'Bulk Order',name:'Bulk_Order',templateName:'Bulk_Order_template',sheet:'Orders',maxRows:2000,template:ORD.bulk.template,parse:ORD.bulk.parse,commit:ORD.bulk.commit,onImported:()=>{fresh();refreshCounts();},onDone:fresh})};}
function build(k){const host=document.createElement('div');host.id='tb-'+k;host.hidden=k!==tab;$('#tabbody').appendChild(host);inst[k]=makeTab(host,k);return inst[k];}
function tabsHtml(){return PL.tabs(TABS.map(t=>[t[0],t[1],ROWS[t[0]]().length]),tab);}
/* assignment performance box: the same on every tab */
function drawStats(){const s=$('#aqstats');if(!s)return;if(STORE.persona()==='vendor'){s.innerHTML='';s.hidden=true;return;}ASSIGNQ.stats(s);}
function refreshCounts(){drawStats();const t=$('#tabsHost');if(t){t.innerHTML=tabsHtml();wireTabs();}}
function wireTabs(){$$('[data-tab]',$('#tabsHost')).forEach(b=>b.onclick=()=>show(b.dataset.tab));}
function wireHead(){const x=inst[tab];const g=id=>$('#'+id);
 if(g('hist'))g('hist').onclick=()=>PANELS.history({obj:'ORD-',title:'Order Management',types:['Order','Dealing','Assignment']});
 if(g('exp'))g('exp').onclick=()=>x&&x.exp&&x.exp();
 if(g('new'))g('new').onclick=()=>x.newOrder();if(g('bulk'))g('bulk').onclick=()=>x.bulk();}
function show(k){tab=k;history.replaceState(null,'','?tab='+k);$('#tabsHost').innerHTML=tabsHtml();wireTabs();
 TABS.forEach(t=>{const h=$('#tb-'+t[0]);if(h)h.hidden=t[0]!==k;});
 if(!inst[k])build(k);else if(inst[k].refresh)inst[k].refresh();
 $('#headActions').innerHTML=HEAD;wireHead();}
ORD.ensureTags();ORD.autoRecheck(STORE.now(),true);ASSIGNQ.sweep();/* dedicated orders with enough allocation are assigned automatically */
$('#content').innerHTML='<div id="aqstats"></div><div id="tabsHost" class="mt3"></div><div id="tabbody" class="mt3"></div>';
show(tab);
STORE.subscribe('orders',()=>{if(DLG.layers.length)return;refreshCounts();const x=inst[tab];if(x&&x.refresh)x.refresh();});
})();
