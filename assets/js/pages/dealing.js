/* Dealing helpers for the Order Management (was the Pending Dealing page). The Order Management tabs share ONE table; this file gives it the "Route Without Rate" column
   and the two Dealing actions that live in the Order Detail header while an order is Pending Dealing: Add rate (Sales) and Allow without dealing (OpsLog override, only when Config allows).
   No manual Re-check and no Tag Sales button: the system re-checks by itself (every 5 min, when Master Data changes, when the page opens), tags Sales automatically
   (History only) and moves the order to Ready to Assign with a bell notification + toast as soon as every route has a rate. A cancelled order shows as Cancelled. */
(function(){
const {esc}=UI;const {DLG,toast}=C;
const isSales=()=>STORE.can('dealingSales');const canPlan=()=>STORE.can('order');
const cfg=()=>STORE.get('config')||{};const canAllow=()=>STORE.can('override')&&!!cfg().allowOrderWithoutDealing;
const pending=o=>o.status==='Pending Dealing';
const rows=()=>STORE.get('orders').filter(pending).sort((a,b)=>(a.pendingSince||a.createdAt)-(b.pendingSince||b.createdAt));
const noRateCol={k:'norate',h:'Route Without Rate',ell:1,w:240,text:o=>(pending(o)&&ORD.missingText(o))||'-'};
const canEdit=()=>canPlan()||isSales()||canAllow();
const addRate=()=>{window.open(MD.MDPATH+'customer-rate.html','_blank');};
function allow(o,done){DLG.confirm({title:'Allow without dealing',sub:esc(o.id+' · '+ORD.route(o)),reason:true,ok:'Allow',icon:'check'}).then(r=>{if(!r)return;const x=ORD.byId(o.id);x.dealing=Object.assign(x.dealing||{},{status:'Override',override:{reason:r,by:STORE.me().n,at:STORE.now()}});x.status='Ready to Assign';ORD.save(x,'Allowed without dealing',r);STORE.notify({kind:'Info',to:['sales'],title:'Allowed without dealing: '+x.id,link:'order-detail.html?id='+x.id});toast('Allowed');if(done)done();});}
window.DEALING={pending,rows,noRateCol,canEdit,isSales,canAllow,addRate,allow};
})();
