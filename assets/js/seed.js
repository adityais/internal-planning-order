/* MODA TMS Planning - demo seed (runs on first load and on "Reset demo data").
   Static records first, then the Milkrun engine is run to produce trip seeds, so every number
   (cycles, units, driver slots, trips, readiness) is derived, not typed. */
(function(){
'use strict';
const T0=new Date(2026,9,14,10,58).getTime();
const at=(d,hhmm)=>{const [h,m]=hhmm.split(':').map(Number);const x=new Date(d+'T00:00:00');x.setHours(h,m,0,0);return x.getTime();};
const TODAY='2026-10-14';
function S(e,v){STORE.set(e,v,true);return v;}

/* ---------- Milkrun Reference (Part / BOM / Route Group, versioned) ---------- */
function admRef(){const sup=MD.get().suppliers;
 const g=(id,name,ch,body,cap,stops,custKm,ret,o)=>Object.assign({id,name,chassis:ch,body,cap,cust:'ADM Sunter Plant',stops:stops.map(s=>({loc:sup[s[0]],km:s[1]})),custKm,returnKm:ret,heijunka:null,stagger:0},o||{});
 const routes=[
  g('R01','Bekasi - Cikarang','CDD','Box',22,[[0,30],[3,25],[10,25]],33,146,{stagger:0,heijunka:120}),
  g('R02','Cikarang Barat','CDD','Box',22,[[4,40],[5,30]],53,147,{stagger:10,heijunka:120}),
  g('R03','Karawang Barat','CDD','Box',22,[[1,20],[2,20]],20,50,{heijunka:180}),
  g('R04','Bekasi Timur','CDD','Box',22,[[6,25],[7,20],[8,20]],40,121,{stagger:20,heijunka:150}),
  g('R05','Jababeka','Fuso','Box',32,[[9,45],[11,35]],59,164,{stagger:5,heijunka:120}),
  g('R06','Cileungsi','CDD','Box',22,[[12,40],[13,20]],50,127,{stagger:30,heijunka:150}),
  g('R07','Sunter - Pulogadung','Fuso','Box',32,[[14,40],[15,30],[16,30]],28,165,{stagger:15,heijunka:120}),
  g('R08','Cibitung','CDD','Box',22,[[17,30],[18,25]],45,136,{stagger:25,heijunka:150}),
  g('R09','Delta Silicon','CDD','Box',22,[[19,35],[20,30],[21,25]],30,147,{stagger:35,heijunka:120})];
 const PN=[['67001','Door Panel RH'],['67002','Door Panel LH'],['52021','Bracket Fr Bumper'],['82121','Wire Harness Engine'],['90105','Bolt Flange M8'],['11201','Cover Cylinder Head'],['67861','Weatherstrip Door Fr'],['16571','Hose Radiator Inlet'],['75551','Clip Moulding Roof'],['58395','Grommet Floor Pan'],['81551','Lamp Rear Combination RH'],['04465','Pad Kit Disc Brake Fr'],['15601','Element Oil Filter'],['42410','Hub Bearing Rr'],['76801','Garnish Back Door'],['87910','Mirror Outer RH'],['48510','Absorber Shock Fr'],['58510','Mat Floor Fr'],['12311','Insulator Engine Mtg'],['90916','Belt V-Ribbed'],['85315','Tank Washer Assy'],['55210','Insulator Dash Panel'],['53410','Hinge Hood LH'],['16595','Stay Radiator Upr'],['61111','Panel Side Outer RH'],['77001','Tank Fuel Sub-assy'],['33530','Lever Shift Assy']];
  const parts=[];routes.forEach(r=>r.stops.forEach((s,i)=>{for(let k=1;k<=3;k++)parts.push({partNo:PN[parts.length%PN.length][0]+'-'+['BZ','B0','BD','0K','BZ1','KK'][(parts.length*5)%6].slice(0,2)+String(10+((parts.length*37)%89)*10).padStart(3,'0'),name:PN[parts.length%PN.length][1],supplier:s.loc,supCode:'S'+String(sup.indexOf(s.loc)+1).padStart(3,'0'),site:'Plant '+(1+i%2),dock:'Dock '+(1+(parts.length%4)),category:['Body','Engine','Electrical','Chassis'][parts.length%4],boxVol:+(0.04+((parts.length*13)%9)/100).toFixed(2),capBox:[10,12,20,24][parts.length%4]});}));
 return {projectId:'CP-ADM-SAP',project:'ADM-SAP',parts,boms:[],routeGroups:routes,models:[]};}
function tamRef(){const sup=MD.get().suppliers;
 const routes=[['T01','Karawang Timur',[[22,18],[23,14]],16,30],['T02','Surya Cipta',[[18,22],[19,12]],20,34],['T03','KIIC',[[20,15],[21,18]],14,28],['T04','Kota Bukit Indah',[[16,25],[17,15]],22,40]].map((r,i)=>({id:r[0],name:r[1],chassis:'CDE',body:'Box',cap:12,cust:'TAM PIO Karawang',stops:r[2].map(s=>({loc:sup[s[0]],km:s[1]})),custKm:r[3],returnKm:r[4],heijunka:null,stagger:i*15}));
 const parts=[];routes.forEach(r=>r.stops.forEach((s,i)=>{for(let k=1;k<=4;k++)parts.push({partNo:'TP-'+r.id+'-'+(i+1)+k,name:['Clip','Grommet','Bracket','Hose'][k-1]+' '+r.id,supplier:s.loc,supCode:'S'+String(sup.indexOf(s.loc)+1).padStart(3,'0'),site:'Plant 1',dock:'Dock '+k,category:'Interior',boxVol:0.05+k*0.01,capBox:20});}));
 const models=[['F653RV-GMDFJ','Avanza 1.5 G'],['F654RV-GMDFJ','Veloz 1.5 Q'],['B401RS-GMQFJ','Rush 1.5 S'],['W101RE-GMDFJ','Raize 1.0 T']];
 const boms=[];models.forEach((m,mi)=>parts.forEach((p,pi)=>{if((pi+mi)%3!==2)boms.push({model:m[0],modelName:m[1],partNo:p.partNo,qty:1+((pi+mi)%3)});}));
 return {projectId:'CP-TAM-PIO',project:'TAM-PIO',models:models.map(m=>m[0]),parts,boms,routeGroups:routes};}
/* Reference seed (D88): flat per-entity rows, one state per Project, with Updated by/at, Batch and an Import #n history */
function refEntities(adm,tam){const U='Rina Kusumawati';const parts=[],boms=[],routes=[],imports=[];
 const addParts=(ref,batch,when)=>{const seen={};ref.parts.forEach((p,i)=>{if(seen[p.partNo])return;seen[p.partNo]=1;parts.push({project:ref.project,partNo:p.partNo,name:p.name,pnNoColor:p.partNo.split('-')[0],supCode:(MD.location(p.supplier)||{}).code||p.supCode,supplier:p.supplier,pnInduk:i%5===0?'Yes':'No',capBox:p.capBox,boxVol:p.boxVol,p:200+(i*37)%300,l:150+(i*53)%200,t:100+(i*29)%150,price:Math.round((5000+(i*1237)%90000)/100)*100,updatedBy:U,updatedAt:when,batch});});};
 const addRoutes=(ref,batch,when)=>{const SV=[4.5,6,3.2,5.5,7.2,4,6.8,5,3.6];
  ref.routeGroups.forEach((g,i)=>routes.push(Object.assign({},JSON.parse(JSON.stringify(g)),{project:ref.project,routeCode:'RT-'+g.id,pool:'Pool Cibitung',comp:g.stops.map(s=>s.loc).concat(g.cust),liqVol:+(g.cap*0.15).toFixed(1),shippingVol:SV[i%SV.length],notes:'',updatedBy:U,updatedAt:when,batch})));};
 addParts(adm,'Import #1',at('2026-06-01','09:30'));addRoutes(adm,'Import #2',at('2026-06-01','09:45'));
 const r09=routes.find(r=>r.id==='R09');r09.batch='Manual';r09.updatedAt=at('2026-08-15','11:20');const r03=routes.find(r=>r.id==='R03');r03.batch='Manual';r03.updatedAt=at('2026-09-28','14:05');
 addParts(tam,'Import #3',at('2026-09-01','10:00'));
 const byModel={};tam.boms.forEach((b,i)=>{(byModel[b.model]=byModel[b.model]||[]).push({partNo:b.partNo,qty:b.qty,category:i%2?'PIO':'TCO'});});
 Object.keys(byModel).forEach(m=>boms.push({project:'TAM-PIO',model:m,lines:byModel[m],updatedBy:U,updatedAt:at('2026-09-01','10:10'),batch:'Import #4'}));
 addRoutes(tam,'Import #5',at('2026-09-01','10:15'));
 const cnt=(arr,proj,b)=>arr.filter(x=>x.project===proj&&x.batch===b).length;
 imports.push({n:1,kind:'part',project:'ADM-SAP',file:'ADM_SAP_parts_2026-06.xlsx',valid:cnt(parts,'ADM-SAP','Import #1'),failed:2,by:U,at:at('2026-06-01','09:30')},
  {n:2,kind:'route',project:'ADM-SAP',file:'ADM_SAP_route_groups.xlsx',valid:cnt(routes,'ADM-SAP','Import #2'),failed:0,by:U,at:at('2026-06-01','09:45')},
  {n:3,kind:'part',project:'TAM-PIO',file:'TAM_PIO_parts_2026-09.xlsx',valid:cnt(parts,'TAM-PIO','Import #3'),failed:0,by:U,at:at('2026-09-01','10:00')},
  {n:4,kind:'bom',project:'TAM-PIO',file:'TAM_PIO_bom_2026-09.xlsx',valid:tam.boms.length,failed:3,by:U,at:at('2026-09-01','10:10')},
  {n:5,kind:'route',project:'TAM-PIO',file:'TAM_PIO_route_groups.xlsx',valid:cnt(routes,'TAM-PIO','Import #5'),failed:0,by:U,at:at('2026-09-01','10:15')});
 return {parts,boms,routes,imports};}
/* Volume Matrix rows (variant A): trips column filled per cycle */
function admMatrix(ref){const cyc={R01:7,R02:7,R03:5,R04:6,R05:7,R06:6,R07:7,R08:6,R09:7};const rows=[];
 ref.routeGroups.forEach(g=>{const N=cyc[g.id];const capT=g.cap*N*0.86;const share=g.stops.map((s,i)=>1+i*0.3);const tot=share.reduce((a,b)=>a+b,0);
  g.stops.forEach((s,i)=>{const vol=+(capT/1.05*share[i]/tot).toFixed(1);rows.push({route:g.id,supplier:s.loc,site:'Plant '+(1+i%2),dock:'Dock '+(i+1),partCat:['Body','Engine','Electrical'][i%3],volDay:vol,cycleIssue:'',trips:Array.from({length:N},()=>1),start:'2026-10-01'});});});
 return rows;}
function tamOrders(){return [['F653RV-GMDFJ','Avanza 1.5 G',2400],['F654RV-GMDFJ','Veloz 1.5 Q',1800],['B401RS-GMQFJ','Rush 1.5 S',1500],['W101RE-GMDFJ','Raize 1.0 T',2100]].map((m,i)=>({id:'OR-'+(i+1),model:m[0],katashiki:m[0].split('-')[0],modelName:m[1],month:10,year:2026,qty:m[2]}));}

/* ---------- Project plans, allocations (Foundation v2: built from Master Data) ----------
   Only ACTIVE Customer Projects of Master Data form a Project Plan (PP-0001, PP-0002 ... in Master Data order). Plan status / PM /
   fulfillment type / required units are Planning-owned demo state keyed by the project Reference No., so a reseed after a Master Data
   change still works: a project without an entry here simply starts as "Pending PM". The two Milkrun fixture projects (ADM-SAP, TAM-PIO)
   keep a hidden plan (fixture:true) because the Milkrun wizard needs one; Direct Delivery pages never list it. */
const PLAN_SPEC={
 'UT/PKS/2026/0114':{status:'Ready',pm:'Hendra Wijaya',mode:'Mix',required:{'CDD Wingbox':2,'Tronton Wingbox':3},drivers:4},
 'CCA-LOG-2026-011':{status:'In Planning',pm:'Hendra Wijaya',mode:'Vendor',required:{'Tronton Wingbox':2},drivers:2,longhaul:true},
 'APS/SPK/2025/014':{status:'Ready',pm:'Maria Goretti',mode:''},
 'SAP/PKS/2025/002':{status:'In Planning',pm:'Hendra Wijaya',mode:'Vendor',required:{'Tronton Wingbox':2},drivers:2},
 'NPM/PKS/2025/004':{status:'Closed',pm:'Maria Goretti',mode:'Own Asset',required:{'Tronton Wingbox':1},drivers:1},
 'RSI/SPK/2025/006':{status:'Ready',pm:'I Gede Wirawan',mode:''},
 'DPI/PKS/2025/005':{status:'In Planning',pm:'Hendra Wijaya',mode:'Own Asset',required:{'CDD Wingbox':2},drivers:2},
 'UMS/SPK/2025/008':{status:'Ready',pm:'Maria Goretti',mode:''},
 'PTS/PKS/2025/003':{status:'In Planning',pm:'I Gede Wirawan',mode:'Own Asset',required:{'CDE Box':2},drivers:2}
};
function projectPlans(){const md=MD.get();const pl=[];let n=1;
 const mk=(p,spec,o)=>pl.push(Object.assign({id:'PP-'+String(n++).padStart(4,'0'),projectId:p.id,project:p.code,status:spec.status,pm:spec.pm||'',mode:spec.mode||'',consider:[],note:'',longhaul:!!spec.longhaul,validUntil:p.validity,createdAt:at('2026-09-02','09:00'),updatedAt:at('2026-10-01','10:00'),reasons:[],history:[],required:spec.required||{},requiredDrivers:spec.drivers||0},o||{}));
 MD.activeProjects().forEach(p=>{const s=PLAN_SPEC[p.refno]||{status:'Pending PM',pm:'',mode:''};
  const expired=p.validity&&p.validity<TODAY;const spec=expired?Object.assign({},s,{status:'Closed'}):s;
  /* On Call has no resource allocation (resource is chosen per order) */
  if(p.ptype==='On Call'){spec.mode='';spec.required={};spec.drivers=0;}
  mk(p,spec,spec.status==='Closed'?{closedAuto:true,closedAt:at('2026-10-02','00:05')}:{});});
 /* hidden Milkrun fixture plans (not Master Data) */
 const fx=(code,req,drv)=>{const p=md.projects.find(x=>x.code===code);if(p)mk(p,{status:'Ready',pm:'Hendra Wijaya',mode:'Own Asset',required:req,drivers:drv},{fixture:true});};
 fx('ADM-SAP',{'CDD Box':28,'Fuso Box':12},60);fx('TAM-PIO',{'CDE Box':10,'CDD Box':4},18);
 return pl;}
function allocations(){const md=MD.get();const out=[];let n=1;
 const planOf=ref=>md.projects.find(p=>p.refno===ref);
 const unit=(proj,v,src,o)=>out.push(Object.assign({id:'AL-'+String(n++).padStart(4,'0'),project:proj,kind:'unit',plate:v.plate,source:src,vendor:v.vendor||'',status:'Active',validFrom:'2026-10-01',validTo:'2026-12-31',role:'Default'},o||{}));
 const drv=(proj,d,role,o)=>out.push(Object.assign({id:'AL-'+String(n++).padStart(4,'0'),project:proj,kind:'driver',driver:d.id,source:d.own==='own'?'Own':'Vendor',status:'Active',validFrom:'2026-10-01',validTo:'2026-12-31',role},o||{}));
 const V=pl=>md.vehicles.find(v=>v.plate===pl&&v.src==='md'&&v.status==='Active');
 const D=(nm,vendor)=>md.drivers.find(d=>d.src==='md'&&d.status==='Active'&&d.name===nm&&(!vendor||d.vendor===vendor));
 /* Milkrun fixtures: ADM-SAP, TAM-PIO */
 ['ADM-SAP','TAM-PIO'].forEach(g=>{md.vehicles.filter(v=>v.group===g).forEach(v=>unit(g,v,'Own'));});
 md.drivers.filter(d=>d.group==='ADM-SAP').slice(0,60).forEach((d,i)=>drv('ADM-SAP',d,i<56?'Default':'Backup'));
 md.drivers.filter(d=>d.group==='TAM-PIO').forEach((d,i)=>drv('TAM-PIO',d,i<14?'Default':'Backup'));
 ['ADM-SAP','TAM-PIO'].forEach(g=>{const bu=out.filter(a=>a.project===g&&a.kind==='unit'),bd=out.filter(a=>a.project===g&&a.kind==='driver'&&a.role==='Default');bu.forEach((u,i)=>{if(bd[i])u.defaultDriver=bd[i].driver;});});
 /* Direct Delivery: real Master Data vehicles / drivers (Active only), keyed by plate / driver name */
 const DD={
  'UT/PKS/2026/0114':{units:['B 9012 UTG','B 8834 XTA','B 3924 DR','D 6690 YZA'],drivers:[['Suparman'],['Rudi Hermawan'],['Ahmad Fauzi'],['Joko Santoso','PT Sinar Jaya Logistik']]},
  'CCA-LOG-2026-011':{units:['D 5541 KLM'],drivers:[['Slamet Wijaya','PT Garda Logistik Indonesia']]},
  'DPI/PKS/2025/005':{units:['B 1123 VWX'],drivers:[['Wawan Setiadi']]}
 };
 Object.keys(DD).forEach(ref=>{const p=planOf(ref);if(!p)return;const c=p.code;
  DD[ref].units.map(V).filter(Boolean).forEach((v,i)=>unit(c,v,v.own==='own'?'Own':'Vendor',{vendorDriver:v.own==='vendor'?((DD[ref].drivers[i]&&D(DD[ref].drivers[i][0],DD[ref].drivers[i][1])||{}).name||''):''}));
  DD[ref].drivers.map(x=>D(x[0],x[1])).filter(Boolean).forEach(d=>drv(c,d,'Default'));
  const bu=out.filter(a=>a.project===c&&a.kind==='unit'&&a.source==='Own'),bd=out.filter(a=>a.project===c&&a.kind==='driver'&&a.role==='Default'&&a.source==='Own');bu.forEach((u,i)=>{if(bd[i])u.defaultDriver=bd[i].driver;});});
 /* one Released row so the history of a release is visible */
 const uv=V('B 5567 UYT'),pu=planOf('PTS/PKS/2025/003');if(uv&&pu)unit(pu.code,uv,'Own',{status:'Released',validFrom:'2026-09-01',validTo:'2026-10-13',releaseReason:'Customer request'});
 return out;}
/* ---------- Milkrun plans ---------- */
function plans(adm,tam){const m=admMatrix(adm);
 const base={projectId:'CP-ADM-SAP',project:'ADM-SAP',inputType:'A',pool:'Pool Cibitung',matrix:m,cycles:{},edits:{},additions:{},overrides:{},step:6,
  toll:{R01:{cond:'mixed',pairs:[{entry:'Cikarang Utama',exit:'Karawang Barat',status:'confirmed'}]},R02:{cond:'full',pairs:[{entry:'Cikarang Barat',exit:'Pasteur',status:'confirmed'}]},
   R03:{cond:'mixed',pairs:[{entry:'Cikarang Utama',exit:'Karawang Barat',status:'confirmed'},{entry:'Karawang Barat',exit:'Cikampek',status:'confirmed'}]},
   R04:{cond:'mixed',pairs:[{entry:'Bekasi Timur',exit:'Cawang',status:'confirmed'}]},R05:{cond:'mixed',pairs:[{entry:'Cibitung',exit:'Sunter',status:'confirmed'}]},
   R06:{cond:'mixed',pairs:[{entry:'Cileungsi',exit:'Jatiasih',status:'confirmed'}]},R07:{cond:'mixed',pairs:[{entry:'Cikunir',exit:'Tanjung Priok',status:'confirmed',manual:21500,reason:'Cash lane, receipt kept',useManual:true}]},
   R08:{cond:'none',pairs:[]},R09:{cond:'mixed',pairs:[{entry:'Cikarang Utama',exit:'Karawang Barat',status:'confirmed'},{entry:'Karawang Timur',exit:'Cikampek',status:'confirmed'}]}},
  additions:{'R03-2':[{comp:'TKBM',amt:75000,reason:'Manual unloading at dock 3',by:'Rina Kusumawati',at:at('2026-10-12','14:20')},{comp:'Uang geser',amt:50000,reason:'Starts before 05:30',by:'Rina Kusumawati',at:at('2026-10-12','14:22')}]}};
 const P=(o)=>Object.assign(JSON.parse(JSON.stringify(base)),o);
 const list=[
  P({id:'MP-2026-0042',key:'MP-2026-0042',name:'ADM-SAP October 2026',period:['2026-10-01','2026-10-31'],status:'Closed',closedBy:'MP-2026-0050',publishedBy:'Hendra Wijaya',publishedAt:at('2026-09-29','15:10'),effective:'2026-10-01',updatedAt:at('2026-09-29','15:10'),updatedBy:'Rina Kusumawati'}),
  P({id:'MP-2026-0050',key:'MP-2026-0050',revisionOf:'MP-2026-0042',name:'ADM-SAP October 2026',period:['2026-10-01','2026-10-31'],status:'Published',publishedBy:'Hendra Wijaya',publishedAt:at(TODAY,'10:58')-60000*120,effective:'2026-10-15',updatedAt:at(TODAY,'08:58'),updatedBy:'Hendra Wijaya'}),
  P({id:'MP-2026-0047',key:'MP-2026-0047',name:'ADM-SAP November 2026',period:['2026-11-01','2026-11-30'],status:'Scheduled',step:6,updatedAt:at('2026-10-13','16:40'),updatedBy:'Rina Kusumawati',additions:{}}),
  P({id:'MP-2026-0048',key:'MP-2026-0048',name:'ADM-SAP December 2026',period:['2026-12-01','2026-12-31'],status:'Draft',step:2,updatedAt:at(TODAY,'09:12'),updatedBy:'Rina Kusumawati',matrix:[],additions:{}}),
  {id:'MP-2026-0044',key:'MP-2026-0044',name:'TAM-PIO October 2026',projectId:'CP-TAM-PIO',project:'TAM-PIO',inputType:'B',pool:'Pool Cibitung',orders:tamOrders(),matrix:tamMatrix(tam),period:['2026-10-01','2026-10-31'],status:'Published',step:6,cycles:{},edits:{},additions:{},overrides:{},
   toll:{T01:{cond:'none',pairs:[]},T02:{cond:'mixed',pairs:[{entry:'Karawang Barat',exit:'Cikampek',status:'confirmed'}]},T03:{cond:'none',pairs:[]},T04:{cond:'mixed',pairs:[{entry:'Karawang Barat',exit:'Cikampek',status:'confirmed'}]}},publishedBy:'Hendra Wijaya',publishedAt:at('2026-09-30','11:00'),effective:'2026-10-01',updatedAt:at('2026-09-30','11:00'),updatedBy:'Hendra Wijaya'},
  {id:'MP-2026-0049',key:'MP-2026-0049',name:'TAM-PIO November 2026',projectId:'CP-TAM-PIO',project:'TAM-PIO',inputType:'B',pool:'Pool Cibitung',orders:tamOrders().map(o=>Object.assign(o,{month:11})),matrix:[],period:['2026-11-01','2026-11-30'],status:'Draft',step:2,cycles:{},edits:{},additions:{},overrides:{},toll:{},updatedAt:at('2026-10-13','10:05'),updatedBy:'Rina Kusumawati'},
  {id:'MP-2026-0038',key:'MP-2026-0038',name:'ADM-SAP September 2026',projectId:'CP-ADM-SAP',project:'ADM-SAP',inputType:'A',pool:'Pool Cibitung',matrix:[],period:['2026-09-01','2026-09-30'],status:'Closed',step:6,cycles:{},edits:{},additions:{},overrides:{},toll:{},publishedBy:'Hendra Wijaya',publishedAt:at('2026-08-29','14:00'),updatedAt:at('2026-10-01','00:05'),updatedBy:'System'},
  {id:'MP-2026-0040',key:'MP-2026-0040',name:'TAM-PIO trial route',projectId:'CP-TAM-PIO',project:'TAM-PIO',inputType:'B',pool:'Pool Cibitung',matrix:[],period:['2026-10-01','2026-10-31'],status:'Cancelled',cancelReason:'Customer moved trial to November',step:3,cycles:{},edits:{},additions:{},overrides:{},toll:{},updatedAt:at('2026-09-20','09:00'),updatedBy:'Rina Kusumawati'}];
 return list;}
/* Variant B: C1-C5 order x BOM -> supplier volume/day -> matrix-like rows (no trip columns) */
function tamMatrix(tam){const v=tam;const ord=tamOrders();const opDays=22;const rows={};
 ord.forEach(o=>v.boms.filter(b=>b.model===o.model).forEach(b=>{const p=v.parts.find(x=>x.partNo===b.partNo);if(!p)return;const vol=o.qty*b.qty*(p.boxVol/p.capBox);rows[p.supplier]=(rows[p.supplier]||0)+vol;}));
 const out=[];v.routeGroups.forEach(g=>g.stops.forEach(s=>out.push({route:g.id,supplier:s.loc,volDay:+((rows[s.loc]||0)/opDays).toFixed(2),trips:[]})));return out;}

/* ---------- trips from the engine (Convert to Trip per Day FR-1..4) ---------- */
function genMilkrunTrips(plan,from,to,statusFor){
 const pr=MD.project(plan.projectId);const seq=a=>{const m=/(\d+)\s*$/.exec(String((a&&a.id)||''));return m?+m[1]:0;};
 const al=DOM.allocDrivers(pr.code).sort((a,b)=>(a.role===b.role?0:a.role==='Default'?-1:1)||(seq(a)-seq(b)));
 const out=[];let d=from;
 while(d<=to){const dg=UI.dayGroup(d);const sch=DOM.planSchedule(plan,dg);
  if(sch){const slotIdx={};sch.drivers.forEach((s,i)=>slotIdx[s.id]=i);const uOrd=[...new Set(sch.cycles.map(c=>c.slotUnitKey))].sort((a,b)=>a.length-b.length||a.localeCompare(b));
   sch.cycles.forEach(c=>{if(c.outside)return;const a=al[slotIdx[c.driver]];
    /* D81: slots resolve to a real unit / driver up to today; tomorrow is mixed (some slots Resolved, some Unresolved); later days stay Unresolved until H-1 */
    const tm=d===UI.addDays(TODAY,1);const uOk=d<=TODAY||(tm&&uOrd.indexOf(c.slotUnitKey)%3!==2),dOk=d<=TODAY||(tm&&slotIdx[c.driver]%4!==3);
    out.push({id:'TS-'+d.replace(/-/g,'')+'-'+c.route+'-'+c.cycle,type:'MR',src:plan.key,planId:plan.id,project:pr.code,projectId:pr.id,route:c.route,routeName:c.routeName,cycle:c.cycle,date:d,dg,out:c.out,inPool:c.inPool,unit:uOk&&c.unit&&!c.unitShort?c.unit:null,driver:dOk&&a?a.driver:null,slot:c.driver,slotUnit:c.slotUnit,slotDriver:c.slotDriver,slotUnitKey:c.slotUnitKey,slotDriverKey:c.slotDriverKey,vt:c.vtype,status:statusFor?statusFor(d,c):'Planned',flags:[]});});}
  d=UI.addDays(d,1);}
 return out;}
window.SEED={build,admRef,tamRef,admMatrix,genMilkrunTrips,at,TODAY};

function build(){
 const md=MD.refresh();
 const params=S('params',Object.assign({},DOM.PARAM_DEFAULT));
 S('reasonCodes',DOM.REASONS.slice());
 S('persona','planner');S('config',{allowOrderWithoutDealing:false,combineAcrossCustomer:false});
 S('clock',{anchorDemo:T0,anchorReal:Date.now(),speed:1});
 S('tollTariff',md.tollTariffSeed.map((r,i)=>Object.assign({status:'Active',by:'Rina Kusumawati',at:at('2026-09-'+String(12+(i%17)).padStart(2,'0'),String(8+(i%9)).padStart(2,'0')+':'+String((i*7)%60).padStart(2,'0'))},r,{ref:r.ref||(r.source==='Manual'?'Memo OPS/TOL/031/X/2026':r.eff>'2026-10-14'?'Kepmen PUPR 1311/KPTS/M/2026':r.source==='Jasa Marga'?'SK Dir JM 247/KPTS/2026':['Kepmen PUPR 1205/KPTS/M/2026','SK BPJT 112/KPTS/BPJT/2026','SK BPJT 098/KPTS/BPJT/2026'][i%3])})));
 S('tollGates',md.gates.map((g,i)=>({id:'TG-'+String(i+1).padStart(3,'0'),name:g,road:i<10?'Jakarta - Cikampek':i<17?'JORR':i<20?'Jagorawi':'Cipularang - Padaleunyi',status:'Active'})));
 const adm=admRef(),tam=tamRef();const re=refEntities(adm,tam);S('refParts',re.parts);S('refBoms',re.boms);S('refRoutes',re.routes);S('refImports',re.imports);
 S('projectPlans',projectPlans());
 S('allocations',allocations());
 const pl=S('milkrunPlans',plans(adm,tam));
 /* every seeded plan owns a Reference snapshot (D88): frozen once Published / Superseded / Closed */
 pl.forEach(p=>{p.refSnap=REF.snapshot(p.project,{at:p.publishedAt||p.updatedAt,by:p.publishedBy||p.updatedBy||'Rina Kusumawati'});if(['Published','Superseded','Closed'].indexOf(p.status)>=0)p.refSnap.frozen=true;});S('milkrunPlans',pl);
 S('leave',[]);S('unitStatus',[]);S('maintenance',[]);S('readiness',[]);S('exceptions',[]);S('requests',[]);S('trips',[]);
 /* Milkrun trip seeds: 13 Oct released, 14 Oct today, 15-31 Oct generated */
 const v1=pl.find(p=>p.id==='MP-2026-0042');const v2=pl.find(p=>p.id==='MP-2026-0050');const tamP=pl.find(p=>p.id==='MP-2026-0044');
 /* v2 differs from v1: R05 cycle 3 Out Pool +10 min (shows in Daily Trip Plan > Diff) */
 const s1=DOM.planSchedule(v1,'wd');const c53=s1.cycles.find(c=>c.route==='R05'&&c.cycle===3);v2.edits={wd:{R05:{3:{out:c53.out+10}}},fri:{R05:{3:{out:c53.out+10}}}};S('milkrunPlans',pl);
 const cur=v1;
 const nowMin=10*60+58;
 const stFn=(d,c)=>d<TODAY?'Released':d===TODAY?(c.out<nowMin?'Released':'Confirmed'):'Planned';
 let trips=genMilkrunTrips(cur,'2026-10-01','2026-10-31',stFn).concat(genMilkrunTrips(tamP,'2026-10-13','2026-10-20',stFn));
 trips.forEach(t=>{if(t.src===v1.key){t.src=v2.key;t.planId=v2.id;}});   /* trips belong to the live plan; schedule differs from it only by the R05 edit above */
 S('trips',trips);
 window.SEED_DD&&window.SEED_DD(trips);   /* direct delivery trips, orders, readiness scenario, documents */
 return collect();}
function collect(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf(STORE.PFX)===0&&k!==STORE.PFX+'_seedver'){try{out[k.slice(STORE.PFX.length)]=JSON.parse(localStorage.getItem(k));}catch(e){}}}return out;}
})();
