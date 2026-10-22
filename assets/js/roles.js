/* Foundation v2 - ONE central role -> access map (window.ROLES). No other file lists which role may open a page, a tab or an action.
   Source: "Aktor & Peran" of every FR file (Planning/Direct Delivery 01-04, Order Management 01-05), Planning Overview s5, Order Management Overview s5,
   plus the PM feedback (Resource Allocation = Planner, PM, Supply only; PM Assignment = OpsLog Dept Head only).
   API:  ROLES.LIST                        roles shown in the role switcher
         ROLES.canView(pageId[,role])      may this role open the page / sidebar item?
         ROLES.canTab(pageId,tabId[,role]) may this role see this tab inside the page? (true when the tab is not restricted)
         ROLES.can(action[,role])          may this role run this action? (buttons, dialogs, row icons)
         ROLES.first(area[,role])          first page of 'planning' | 'order' the role may open (top-nav target)
         ROLES.PAGE / ROLES.TAB / ROLES.ACTION   the raw tables (edit here only)                                              */
(function(){
'use strict';
const LIST=[
 {key:'planner',  n:'Rina Kusumawati', r:'Planner',            label:'Planner'},
 {key:'pm',       n:'Hendra Wijaya',   r:'Project Manager',    label:'Project Manager'},
 {key:'opslog',   n:'Bambang Suryadi', r:'OpsLog Dept Head',   label:'OpsLog Dept Head'},
 {key:'supply',   n:'Teguh Prakoso',   r:'Supply Management',  label:'Supply Management'},
 {key:'sales',    n:'Andri Saputra',   r:'Sales',              label:'Sales'},
 {key:'ccr',      n:'Dewi Anggraini',  r:'CCR',                label:'CCR',                noAmounts:true},
 {key:'fieldops', n:'Yusuf Hidayat',   r:'Field Ops, Shift Day', label:'Field Ops',        noAmounts:true,device:'tablet'},
 {key:'vm',       n:'Sri Wahyuni',     r:'Vehicle Management', label:'Vehicle Management'},
 {key:'dm',       n:'Agus Pratama',    r:'Driver Management',  label:'Driver Management'},
 {key:'vendor',   n:'Dedi Hartono',    r:'Vendor, PT Sinar Jaya Logistik', label:'Vendor', vendor:'PT Sinar Jaya Logistik'}/* vendor POV: only Master Data and Order & Delivery (its assigned orders, its lane on the Trip Management, Daily Availability) */
];
/* ---- who may open which page (sidebar item) ---- */
const PAGE={
 /* Planning > Setup */
 project:  ['opslog','pm','planner','supply','vm','dm','sales'],       /* Overview s5: OpsLog assigns PM, PM edits own project, Planner / Supply view */
 alloc:    ['planner','pm','supply','opslog','vm','dm'],       /* Resource Allocation: Planner, PM, Supply, Dept Head; VM / DM view only */
 requests: ['planner','pm','supply','vm','dm','opslog'],         /* FR-24: PM / Planner read-only; Supply (vendor unit), VM (own unit), DM (own driver) process */
 mref:     ['planner','pm','opslog'],                         /* Milkrun Reference (Planning-owned setup) */
 /* Planning > Milkrun */
 milkrun:  ['planner','pm','opslog','fieldops','ccr'],
 trips:    ['planner','pm','opslog','fieldops','ccr'],
 /* Planning > Direct Delivery */
 dispatch: ['planner','pm','opslog','ccr','sales','vendor','supply','fieldops'],          /* Trip Management: Planner creates / publishes, Supply and OpsLog edit, PM / CCR / Sales / Field Ops view, Vendor edits its own trips */
 /* Planning > Daily Ops */
 readiness:['planner','pm','opslog','fieldops','ccr','vm','dm'],
 /* Planning > Admin */
 templates:['planner','opslog'],
 tariff:   ['planner','opslog'],
 params:   ['planner','pm','opslog'],                         /* Overview s5: parameters can be changed by PM and Planner */
 /* Order & Delivery */
 inbox:    ['planner','pm','sales','opslog','supply','ccr','fieldops','vendor'],/* CCR / Field Ops: view-only, Assigned tab only (Order Monitoring removed); Order Management = ONE page with tabs All | Dealing Pending | Ready to Assign | Assigning | Assigned (PM feedback 2026-10-19, one table filtered by status); who sees which tab: TAB 'inbox.*' below */
 vendoravail: ['vendor'],                         /* Daily Availability: the vendor reports its available units + drivers (plate, driver, last city) */
 convert: ['planner','pm','supply','ccr','opslog']           /* Convert: Planner converts, Supply sends SPPB / SPK, PM / CCR view */
};
/* ---- tabs inside a page that only some of the page's roles may see (anything not listed is open to every role that can open the page) ---- */
const TAB={
 'requests.unit':       ['planner','pm','opslog','supply','vm'],           /* Resource Requests > Unit: Supply (Transporter) and VM (Own Asset) act, Planner / PM / Dept Head view */
 'requests.driver':     ['planner','pm','opslog','supply','dm'],           /* Resource Requests > Driver: DM (Own Asset) acts; Supply acts on Transporter driver requests */
 'readiness.requests':  ['planner','pm','fieldops','vm','dm','opslog'],
 'readiness.exceptions':['planner','pm','opslog','fieldops','ccr'],
 'readiness.reports':   ['planner','pm','opslog','ccr','vm','dm'],
 'inbox.all':           ['planner','pm','sales','opslog','ccr'],                  /* All: Planner edit / submit, PM view */
 'inbox.dealing':       ['planner','pm','sales','opslog','ccr'],   /* Dealing: Sales action, OpsLog override (P2), Planner / PM view */
 'inbox.assignment':    ['planner','pm','sales','supply','opslog','ccr'],/* Assignment: Planner, Supply action, PM view / override, OpsLog view */
 'inbox.assigning':     ['planner','pm','sales','supply','opslog','ccr'],/* Assigning: vendor waterfall running (incl. Re-sourcing) */
 'inbox.assigned':      ['planner','pm','sales','supply','opslog','ccr','fieldops','vendor'],/* Assigned: already in the Trip Management (Own / Dedicated pool, Vendor lane) */
 'assignment.own':      ['planner','pm','opslog'],
 'assignment.vendor':   ['planner','pm','supply','opslog'],
 'project.resource':    ['planner','pm','opslog','supply','vm','dm','sales'],
 'project.rates':       ['pm','opslog','sales'],           /* Rate List (customer prices): PM, Dept Head and Sales; not for Supply (same rule as customerPrice) */
 'project.pm':          ['planner','pm','opslog'],           /* list tab "PM Assignment" */
 'mref.tpl':            ['planner','opslog'],           /* Milkrun Reference > Document Templates (moved from Planning Config); same roles as PAGE.templates */
 'admin.params':        ['planner','pm','opslog']
};
/* ---- who may run which action ---- */
const ACTION={
 tripEdit:['planner','supply','opslog','pm'],           /* Trip Management: edit / confirm a trip (Planner, Supply, Dept Head); the Vendor edits its own trips separately */
 plan:['planner','opslog','pm'],                     /* Dispatch Plan create / combine / publish, exception request, cost additions, Daily Trip Plan generate */
 publishMilkrun:['pm','opslog'], publishDispatch:['planner','opslog','pm'],
 approve:['pm','opslog'], approveFallback:['opslog'],
 assignPm:['opslog'],                  /* Assign / Reassign PM: OpsLog Dept Head only */
 editProject:['pm','opslog'],                   /* Fulfillment by Ownership Type, Long-haul: the PM of the project */
 allocEdit:['pm','planner','opslog'],                     /* Add / replace / release unit and driver: PM (Planner views) */
 allocRequest:['pm','planner','opslog'],                  /* Create Resource Request from Requested Unit / Driver */
 vendorUnit:['supply','opslog'],                /* Fulfil / reject a vendor unit request */
 ownUnit:['vm','opslog'], ownDriver:['dm','opslog'], /* Fulfil / reject an own unit (VM) / own driver (DM) request */
 amounts:['planner','pm','opslog','supply','vm','dm','sales'],
 customerPrice:['planner','pm','sales','opslog'],
 vendorRate:['opslog','pm','supply'], /* the rate a transporter charges: Dept Head, PM and Supply only (not Planner, Sales, CCR, Field Ops, VM, DM, nor the vendor itself) */ /* Supply sees orders without the customer price */
 params:['planner','pm','opslog'], paramsEdit:['planner','pm','opslog'],
 checkin:['fieldops','planner','opslog'], leave:['dm','planner','opslog'], unitStatus:['vm','planner','opslog'], respond:['vm','dm','opslog'], override:['opslog','pm'],
 order:['planner','opslog','pm'],                    /* Order Capture: create / edit / submit / import */
 dealingPick:['planner','opslog','pm'], dealingSales:['sales','opslog','pm'],
 supply:['supply','planner','opslog','pm'],
 convert:['planner','opslog','pm'], sppb:['supply','opslog','pm'],
 tariff:['planner','opslog']
};
const alias=r=>r==='plannerlead'?'planner':r;
const cur=()=>{try{return alias(window.STORE?STORE.persona():'planner');}catch(e){return 'planner';}};
const norm=r=>alias(r||cur());
const canView=(id,role)=>(PAGE[id]||[]).indexOf(norm(role))>=0;
const canTab=(page,tab,role)=>{const k=page+'.'+tab;return !TAB[k]||TAB[k].indexOf(norm(role))>=0;};
const can=(a,role)=>(ACTION[a]||[]).indexOf(norm(role))>=0;
const AREA={planning:['project','alloc','requests','mref','milkrun','trips','templates','tariff','params'],order:['inbox','dispatch','vendoravail']};/* readiness is hidden for now (see SHOW_READINESS in shell.js) */
const first=(area,role)=>(AREA[area]||[]).find(id=>canView(id,role))||null;
/* STORE.PERSONAS is generated from here (legacy shape used by shell, docs, panels ...) */
const NAVIDS=AREA.planning.concat(AREA.order,['convert']);
const PERSONAS={};
LIST.forEach(p=>{PERSONAS[p.key]=Object.assign({},p,{allow:NAVIDS.filter(id=>PAGE[id].indexOf(p.key)>=0)});});
PERSONAS.plannerlead=Object.assign({},PERSONAS.planner,{r:'Planner',label:'Planner',lead:true}); /* legacy key, not offered in the switcher */
window.ROLES={LIST,PAGE,TAB,ACTION,AREA,PERSONAS,MENU:LIST.map(p=>p.key),canView,canTab,can,first,norm};
})();
