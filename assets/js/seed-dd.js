  /* Demo seed part 2: Direct Delivery orders and trips, today's readiness scenario, exceptions, documents, inbox.
   Foundation v2: every project, route, rate, unit category, vehicle, driver and location below comes from Master Data (MD adapter).
   Symbolic keys (DED, OC, EXP, LH ...) only pick WHICH Master Data Customer Project / rate a demo order uses; the Reference No. is the
   lookup, with a safe fallback to the first active Direct Delivery project when Master Data was edited. Nothing about a customer,
   route, price, plate or driver is typed here. */
(function(){
'use strict';
const at=(d,hhmm)=>SEED.at(d,hhmm);const TODAY='2026-10-14',TOM='2026-10-15';const T0=at(TODAY,'10:58');
function S(e,v){STORE.set(e,v,true);return v;}
/* key -> [Customer Project Reference No., index of the rate (route + Category + Karoseri) used by the demo orders] */
const K={DED:['UT/PKS/2026/0114',0],DED2:['UT/PKS/2026/0114',1],OC:['RSI/SPK/2025/006',0],OC2:['UMS/SPK/2025/008',0],EXP:['APS/SPK/2025/014',0],LH:['CCA-LOG-2026-011',1],LH0:['CCA-LOG-2026-011',0],PCS:['PCS/PKS/2025/001',0],BER:['SAP/PKS/2025/002',0],MUS:['MHI/SPK/2025/009',0],PTS:['PTS/PKS/2025/003',0]};
function proj(ref){const ps=MD.activeProjects().filter(p=>p.ptype!=='Milkrun');return ps.find(p=>p.refno===ref)||ps.find(p=>p.rates.length)||ps[0];}
/* location for a city: a Master Data location in that city (registered to the customer first, right type first), else the city name itself */
function placeOf(city,customer,types){const L=MD.get().dd.locations.filter(l=>l.status==='Active'&&MD.sameCity(l.city,city));const ok=l=>!types||types.indexOf(l.type)>=0;
 const hit=L.find(l=>ok(l)&&(l.customers||[]).indexOf(customer)>=0)||L.find(l=>ok(l)&&!(l.customers||[]).length)||L.find(ok);return hit?hit.name:MD.cityShort(city);}
function routeOf(key){const k=K[key]||K.DED;const pr=proj(k[0]);const r=pr.rates[k[1]]||pr.rates[0]||{origin:'',dest:'',kategori:'CDD',karoseri:'Wingbox',harga:0,lead:0,basis:'per_trip'};
 return {pr,rate:r,origin:{loc:placeOf(r.origin,pr.customer,['Pick Up','Pool']),city:r.origin},dest:{loc:placeOf(r.dest,pr.customer,['Drop Off','Transit']),city:r.dest},unitCategory:r.kategori,body:r.karoseri};}
/* another destination of the same customer project that has NO rate (-> Pending Dealing demos) */
function noRateDest(key){const k=K[key]||K.DED;const pr=proj(k[0]);const have=pr.rates.map(x=>MD.cityKey(x.dest));const c=['Kota Surabaya, Jawa Timur','Kota Semarang, Jawa Tengah','Kota Bandung, Jawa Barat','Kota Denpasar, Bali'].find(x=>have.indexOf(MD.cityKey(x))<0)||'Kota Denpasar, Bali';return {loc:placeOf(c,pr.customer,['Drop Off','Transit']),city:c};}
/* real Master Data resources used by the demo trips (Active only) */
function V(pl){return pl;}
let ON=0;
function order(o){const key=K[o.project]?o.project:'DED';const rt=routeOf(key);const pr=rt.pr;ON++;
 const drops=o.drops||[{loc:rt.dest.loc,city:rt.dest.city,m3:o.m3,ton:o.ton!=null?o.ton:+((o.m3||0)*0.18).toFixed(1)}];
 const row=Object.assign({id:'ORD-'+o.date.replace(/-/g,'')+'-'+String(ON).padStart(4,'0'),source:'Manual',customer:pr.customer,project:pr.code,projectName:pr.name,sl:pr.sl,ptype:pr.ptype,
  date:o.date,window:o.window||['07:00','09:00'],origin:{loc:rt.origin.loc,city:rt.origin.city},drops,unitCategory:rt.unitCategory,body:rt.body,qty:1,m3:drops.reduce((a,d)=>a+(+d.m3||0),0),ton:drops.reduce((a,d)=>a+(+d.ton||0),0),
  createdAt:o.createdAt||(T0-(90+ON*7)*60000),projectConfirmed:o.status!=='Draft',createdBy:'Rina Kusumawati',history:[]},o,{project:pr.code});
 row.dealing=o.dealing||WATER.match(row);if(row.dealing.status==='Select rate')row.dealing.status='Matched';row.dealing.checkedAt=T0-3600000;delete row.di;return row;}
function build(trips){
 ON=0;/* deterministic order numbers on every reseed */const md=MD.get();const p=DOM.params();
 const orders=[];const R=MD.rng(42);
 const allocU=code=>STORE.get('allocations').filter(a=>a.project===code&&a.kind==='unit'&&a.status==='Active');
 const allocD=code=>STORE.get('allocations').filter(a=>a.project===code&&a.kind==='driver'&&a.status==='Active');
 /* ---- pool for 15 Oct: Assigned Own/Dedicated, not yet Planned ---- */
 const mix=[['DED',14],['OC',8],['EXP',3]];/* a small, readable set for 15 Oct */
 mix.forEach(([k,n])=>{for(let i=0;i<n;i++){const h=5+Math.floor(R()*10);const m3=+(3+R()*9).toFixed(1);const ton=+(m3*0.18).toFixed(1);
  orders.push(order({project:k,date:TOM,m3,ton,window:[UI.pad(h)+':00',UI.pad(h+2)+':00'],status:'Assigned',assignment:{path:k==='DED'?'Dedicated':'Own',assignedAt:at(TODAY,'08:'+UI.pad(10+i%40)),by:'Rina Kusumawati'},source:['WhatsApp','Manual','Import'][i%3]}));}});
 /* combine demo pair: 8 + 10 m3, same project, same destination */
 orders[0].m3=8;orders[0].drops[0].m3=8;orders[0].ton=1.4;orders[0].drops[0].ton=1.4;orders[0].window=['06:00','08:00'];
 orders[4].m3=10;orders[4].drops[0].m3=10;orders[4].ton=1.8;orders[4].drops[0].ton=1.8;orders[4].window=['06:00','08:00'];orders[4].drops[0].loc=orders[0].drops[0].loc;orders[4].drops[0].city=orders[0].drops[0].city;
 /* late orders (assigned after publish) */
 [10,16,22].forEach(i=>{orders[i].late=true;orders[i].assignment.assignedAt=at(TODAY,'10:20');});
 /* ---- trips: real Master Data units and drivers (Active). Tomorrow and today use different drivers so rest / duty stay clean. ---- */
 const dd=[];let tn=0;
 const un=pl=>pl;const dr=(nm,vendor)=>{const d=md.dd.drivers.find(x=>x.name===nm&&x.status==='Active'&&(!vendor||x.vendor===vendor));return d?d.id:null;};
 const vh=pl=>md.dd.vehicles.find(v=>v.plate===pl&&v.status==='Active')||md.dd.vehicles.find(v=>v.status==='Active');
 function mkTrip(date,ords,unit,driver,out,o){tn++;const v=MD.vehicle(unit)||{chassis:ords[0].unitCategory,body:ords[0].body};const first=ords[0];
  const stops=[{loc:first.origin.loc,kind:'pick',order:first.id}].concat(ords.map(x=>({loc:x.drops[0].loc,kind:'drop',order:x.id,city:x.drops[0].city})));
  const pr=MD.project(first.project);const tt=DOM.ddTimes({out,chassis:v.chassis,stops,longhaul:!!(pr&&pr.longhaul)});
  const t=Object.assign({id:'DT-'+date.replace(/-/g,'')+'-'+String(o&&o.n||tn).padStart(4,'0'),type:'DT',date,project:first.project,projectId:pr.id,orders:ords.map(x=>x.id),stops:tt.stops,unit,driver,out,inPool:tt.end,durMin:tt.durMin,km:tt.km,longhaul:tt.longhaul,sl:first.sl,status:'Published',version:1,
   toll:{cond:'mixed',pairs:[{entry:'Cikarang Barat',exit:'Pasteur',status:'confirmed'}]},additions:[],chassis:v.chassis},o||{});
  ords.forEach(x=>{x.status=t.status==='Converted'?'Converted':'Planned';x.trip=t.id;});return t;}
 const tom=orders.filter(o=>o.date===TOM);
 const bg=tom.filter(o=>o.ptype==='Dedicated'),sh=tom.filter(o=>o.project===proj(K.OC[0]).code),ex=tom.filter(o=>o.project===proj(K.EXP[0]).code);
 dd.push(mkTrip(TOM,[bg[1]],'B 9012 UTG',dr('Suparman'),6*60,{n:1}));dd.push(mkTrip(TOM,[bg[5]],'B 7204 LXC',dr('Anwar Sanusi'),6*60,{n:6}));/* FTL: one order, one trip */
 dd.push(mkTrip(TOM,[bg[2]],'B 8834 XTA',dr('Rudi Hermawan'),6*60+30,{n:2,toll:{cond:'mixed',pairs:[{entry:'Cikarang Utama',exit:'Karawang Barat',status:'confirmed'}]}}));
 dd.push(mkTrip(TOM,[bg[7]],'B 7217 UCF',dr('Farid Maulana'),7*60,{n:7,toll:{cond:'mixed',pairs:[{entry:'Cikarang Barat',exit:'Pasteur',status:'confirmed'}]}}));dd.push(mkTrip(TOM,[bg[3]],'B 1123 VWX',dr('Ahmad Fauzi'),7*60,{n:3,toll:{cond:'full',pairs:[{entry:'Cikarang Utama',exit:'Karawang Barat',status:'confirmed'},{entry:'Karawang Barat',exit:'Cikampek',status:'confirmed'},{entry:'Cikampek',exit:'Kalikangkung',status:'suggested'}]}}));
 dd.push(mkTrip(TOM,[sh[0]],'D 4521 QR',dr('Wawan Setiadi'),8*60,{n:4,toll:{cond:'mixed',pairs:[{entry:'Cikunir',exit:'Tanjung Priok',status:'confirmed'}]}}));
 dd.push(mkTrip(TOM,[ex[0]],'AD 2379 DER',dr('Budiman Saputra'),9*60,{n:5,toll:{cond:'none',pairs:[]}}));
 /* added after publish (draft change) + toll gates missing blocks publish */
 dd.push(mkTrip(TOM,[bg[9]],'D 6690 YZA',dr('Tono Sugiarto'),10*60,{n:9,status:'Planned',version:null,toll:{cond:'mixed',pairs:[{entry:'Cikarang Barat',exit:'Pasteur',status:'confirmed'}]}}));
 /* long-haul: Customer Project with the longest route (CCA Dedicated, Bekasi to Surabaya) */
 const lhO=order({project:'LH',date:TOM,m3:38,ton:12,window:['05:00','06:00'],status:'Assigned',assignment:{path:'Dedicated'}});orders.push(lhO);
 dd.push(mkTrip(TOM,[lhO],'D 5541 KLM',dr('Slamet Wijaya','PT Garda Logistik Indonesia'),5*60+30,{n:12,toll:{cond:'full',pairs:[{entry:'Cikarang Barat',exit:'Cikampek',status:'confirmed'},{entry:'Cikampek',exit:'Kalikangkung',status:'confirmed'},{entry:'Kalikangkung',exit:'Semarang Banyumanik',status:'confirmed'}]}}));
 /* ---- today's trips (14 Oct), published v1, with readiness scenario ---- */
 const todayO=[];const mkO=(k,m3,win,o)=>{const x=order(Object.assign({project:k,date:TODAY,m3,ton:+(m3*0.18).toFixed(1),window:win,status:'Assigned',assignment:{path:k==='DED'?'Dedicated':'Own'}},o||{}));orders.push(x);todayO.push(x);return x;};
 const tA=[ // n, project key, m3, out, unit, driver
  [2,'DED',12,'11:20','B 9012 UTG',dr('Joko Santoso','PT Sinar Jaya Logistik')],[4,'DED',9,'11:40','B 8834 XTA',dr('Slamet Wijaya','PT Armada Prima Logistik')],[5,'OC',6,'12:10','D 4521 QR',dr('Dedi Kurniawan','PT Karya Angkutan Sejahtera')],
  [7,'DED',14,'11:55','B 1123 VWX',dr('Yanto Prasetyo')],[11,'OC',5,'14:00','D 9012 KLM',dr('Herman Susanto')],[13,'LH',36,'15:00','D 6690 YZA',dr('Iwan Kurnia')],
  [8,'EXP',3,'13:10','AD 2379 DER',dr('Rizal Maulana')]];
 const todayTrips=tA.map(r=>{const o=mkO(r[1],r[2],[r[3],r[3]]);return mkTrip(TODAY,[o],r[4],r[5],UI.parseHM(r[3]),{n:r[0],toll:r[1]==='LH'?{cond:'full',pairs:[{entry:'Cikarang Barat',exit:'Cikampek',status:'confirmed'},{entry:'Cikampek',exit:'Kalikangkung',status:'confirmed'}]}:{cond:'mixed',pairs:[{entry:'Cikarang Utama',exit:'Karawang Barat',status:'confirmed'}]}});});
 /* vendor lane trips today (from Order Assignment): vendor plate + driver are typed once per order, not Master Data */
 const vend=[[21,'PT Sinar Jaya Logistik','B 9811 SJL','Ujang Suherman','12:30','Awaiting vendor'],[22,'PT Cepat Tanggap Cargo','B 9902 CTC','Asep Gunawan','11:50','Confirmed'],[23,'PT Bintang Timur Logistik','B 9744 BTL','Dadang Sudrajat','13:30','Not confirmed']];
 vend.forEach(v=>{const o=mkO('DED',11,[v[4],v[4]],{assignment:{path:'Vendor',vendor:v[1],plate:v[2],driverName:v[3],price:2380000}});const t=mkTrip(TODAY,[o],v[2],null,UI.parseHM(v[4]),{n:v[0],vendor:v[1],vendorDriver:v[3],vendorConf:v[5],toll:null,vendorRate:2380000});todayTrips.push(t);});
 const allDD=dd.concat(todayTrips);
 /* ---- inbox / dealing / assignment orders ---- */
 const D2='2026-10-16';
 const nr=k=>[Object.assign({m3:0,ton:0},noRateDest(k))];
 const inbox=[
  {project:'OC',date:TOM,m3:6,status:'Draft',source:'WhatsApp',conf:{customer:0.96,date:0.92,dest:0.58,m3:0.41},wa:[['UT Ops','Pagi pak, besok kirim 1 Tronton, muatan kira2 6 kubik','09:41'],['UT Ops','Jam 8 sudah siap','09:42']]},
  {project:'DED',date:TOM,m3:9,status:'Draft',source:'WhatsApp',conf:{customer:0.98,date:0.95,dest:0.93,m3:0.88},wa:[['UT Logistik','Order besok: Bandung 9 kubik, loading jam 7','10:02']],dupOf:true,window:['07:00','09:00']},
  {project:'DED',date:TOM,m3:9,status:'Draft',source:'Manual',window:['07:00','09:00']},
  {project:'OC',date:D2,m3:12,status:'Need Clarification',source:'WhatsApp',conf:{dest:0.52},question:'Drop address?',wa:[['UT Ops','Lusa kirim 12 kubik','08:15']]},
  {project:'DED',date:D2,m3:7,status:'Need Clarification',source:'WhatsApp',question:'Two drops or one?',wa:[['UT Logistik','Dua titik bisa gabung?','08:50']]},
  {project:'OC',date:TOM,drops:(()=>{const d=nr('OC');d[0].m3=15;d[0].ton=3;return d;})(),status:'Pending Dealing',source:'WhatsApp',salesTag:'Tagged 09:20'},
  {project:'DED',date:TOM,drops:(()=>{const d=nr('DED');d[0].m3=20;d[0].ton=4;return d;})(),status:'Pending Dealing',source:'Manual',salesTag:''},
  {project:'EXP',date:D2,drops:(()=>{const d=nr('EXP');d[0].m3=10;d[0].ton=2;return d;})(),status:'Pending Dealing',source:'Import',recheckAt:T0+4*60000,dealing:{status:'No rate',checkedAt:T0-5400000}},
  {project:'EXP',date:TOM,drops:(()=>{const d=nr('EXP');d[0].m3=4;d[0].ton=0.8;return d;})(),status:'Pending Dealing',source:'WhatsApp',salesTag:'Tagged 10:05'},
  {project:'DED',date:TOM,m3:16,status:'Ready to Assign',source:'Manual',qty:1},
  {project:'PCS',date:TOM,m3:60,ton:14,status:'Ready to Assign',source:'WhatsApp',qty:1},
  {project:'LH',date:D2,m3:38,status:'Ready to Assign',source:'Import'},
  {project:'LH0',date:TOM,m3:120,ton:30,status:'Assigning',source:'Manual',qty:1,wf:'waiting'},
  {project:'DED',date:TOM,m3:15,ton:3,status:'Assigning',source:'WhatsApp',qty:1,wf:'waiting'},
  {project:'DED',date:TOM,m3:12,status:'Assigned',source:'Manual',wf:'auto'},
  {project:'DED',date:TOM,m3:10,status:'Unfulfilled',source:'WhatsApp',wf:'exhausted'},
  {project:'LH0',date:TOM,m3:40,ton:10,status:'Re-sourcing',source:'Manual',wf:'resourcing'},
  {project:'PCS',date:TOM,m3:40,ton:9,status:'Submitted',source:'Manual',qty:1},
  /* more routes, units and pickup times in the Assignment Queue */
  {project:'BER',date:TOM,m3:24,ton:5,status:'Ready to Assign',source:'Import',qty:1,window:['05:30','07:30']},
  {project:'PTS',date:TOM,m3:18,ton:4.2,status:'Ready to Assign',source:'WhatsApp',qty:1,window:['17:30','19:30']},
  {project:'MUS',date:D2,m3:6,ton:1.1,status:'Ready to Assign',source:'Manual',qty:1,window:['18:00','20:00']},
  {project:'OC2',date:D2,m3:80,ton:20,status:'Ready to Assign',source:'Import',qty:1,window:['06:00','08:00']}];
 const IW=['07:00','08:30','08:30','10:30','13:00','09:15','14:00','11:45','07:30','06:30','15:00','10:00','13:30','11:00','09:00','16:00','12:30','14:30'];
 inbox.forEach((x,i)=>{const w0=IW[i%IW.length];const o=order(Object.assign({window:[w0,UI.hm(UI.parseHM(w0)+120)],createdAt:T0-(60-i*3)*60000},x));if(!/Draft|Need/.test(o.status))o.submittedAt=T0-(26-i)*60000;
  /* own-path SLA starts when the order became Ready to Assign (after dealing); seeded so the demo opens with time left */
  if(o.status==='Ready to Assign')o.readyAt=T0-(3+i%6)*60000;if(x.conf)o.confidence=x.conf;if(x.wa)o.wa=x.wa;delete o.conf;
  if(x.status==='Pending Dealing'&&!x.dealing&&o.dealing.status==='Matched')o.dealing={status:'No rate',checkedAt:T0-3600000};
  orders.push(o);});
 /* duplicate pair */
 const dupA=orders.find(o=>o.dupOf===true);const dupB=orders.filter(o=>o.status==='Draft'&&o.source==='Manual')[0];if(dupA&&dupB){dupA.duplicate=dupB.id;dupB.duplicate=dupA.id;delete dupA.dupOf;}
 /* vendor waterfalls (snapshot locked at blast) */
 orders.filter(o=>o.wf).forEach(o=>{o.waterfall=WF_SEED(o,o.wf);o.assignment={path:'Vendor',blastAt:o.waterfall.lockedAt};if(o.wf==='auto'){const s=o.waterfall.candidates.find(c=>c.status==='Selected');o.assignment.vendor=s.vendor;o.assignment.price=s.rate;o.assignment.assignedAt=s.respAt;}delete o.wf;});
 /* demo: every order needs 1 unit, except ONE already assigned order that needs 2 units (1 order = 1 customer, 2 units = 2 trips) */

 /* every order assigned to Own Asset / Dedicated carries the unit and driver it went to: from its trip when it is planned, else the next matching unit / driver of its project (Dedicated) or of the own pool (On Call). An order that needs 2 units gets 2. */
 {const allocs=STORE.get('allocations');const veh=md.dd.vehicles.filter(v=>v.status==='Active'&&v.own==='own');const drvs=md.dd.drivers.filter(d=>d.status==='Active'&&d.own==='own');const dn=id=>(md.dd.drivers.find(d=>d.id===id)||{}).name||id;const rr={};
  const ap=new Set(allocs.filter(a=>a.kind==='unit'&&a.status==='Active').map(a=>a.plate)),ad=new Set(allocs.filter(a=>a.kind==='driver'&&a.status==='Active').map(a=>a.driver));
  /* the one order that needs 2 units: an assigned On Call order served by the own pool whose Unit Category has 2 free own units */
  {const two=orders.find(o=>o.status==='Assigned'&&!o.trip&&o.date===TOM&&o.assignment&&o.assignment.path==='Own'&&veh.filter(v=>v.chassis===o.unitCategory&&!ap.has(v.plate)).length>=2);if(two)two.qty=2;}
  orders.filter(o=>(o.status==='Assigned'||o.status==='Planned'||o.status==='Converted')&&o.assignment&&o.assignment.path!=='Vendor'&&!(o.assignment.units||[]).length).forEach(o=>{
   const t=o.trip?allDD.find(x=>x.id===o.trip):null;const ded=o.ptype==='Dedicated';const units=[];const usedU=new Set(),usedD=new Set();
   for(let n=0;n<(o.qty||1);n++){let plate,driver;
    if(t&&t.unit&&n===0){plate=t.unit;driver=t.driver;}
    else{let us=veh.filter(v=>v.chassis===o.unitCategory&&(ded?allocs.some(a=>a.project===o.project&&a.kind==='unit'&&a.plate===v.plate&&a.status==='Active'):!ap.has(v.plate)));
     if(!us.length)us=veh.filter(v=>v.chassis===o.unitCategory);if(!us.length)us=veh;
     {const bu=new Set(allDD.filter(x=>x.date===o.date&&x.unit).map(x=>x.unit));const fu=us.filter(v=>!bu.has(v.plate));if(fu.length)us=fu;}/* prefer units that are not on another trip that day */
     let ds=ded?allocs.filter(a=>a.project===o.project&&a.kind==='driver'&&a.status==='Active').map(a=>a.driver):drvs.filter(d=>!ad.has(d.id)).map(d=>d.id);if(!ds.length)ds=drvs.map(d=>d.id);
     {const bd=new Set(allDD.filter(x=>x.date===o.date&&x.driver).map(x=>x.driver));const fd=ds.filter(d=>!bd.has(d));if(fd.length)ds=fd;}
     {const f1=us.filter(v=>!usedU.has(v.plate));if(f1.length)us=f1;const f2=ds.filter(d=>!usedD.has(d));if(f2.length)ds=f2;}/* the units / drivers of one order are all different */
     const k=(ded?o.project:'pool')+'|'+o.unitCategory;rr[k]=(rr[k]||0)+1;const i=rr[k]-1;plate=us[i%us.length].plate;driver=ds[i%ds.length];}
    driver=driver||drvs[0].id;usedU.add(plate);usedD.add(driver);const v=md.dd.vehicles.find(x=>x.plate===plate)||{};
    units.push({plate,cat:v.chassis||o.unitCategory||'',kar:v.karoseri||o.body||'',driverId:driver,driverName:dn(driver)});}
   o.assignment.units=units;o.assignment.driverName=units[0].driverName;});}
 /* vendor daily availability (vendors report it themselves, twice a day, on Order & Delivery > Daily Availability): plate, category, karoseri, tonase, volume, driver, phone, last city. One-time data, not Master Data.
    For each On Call order some of the vendors that quote its route report a unit + driver; PT Sinar Jaya Logistik (the Vendor demo role) has reports for the next days. Tronton has no report on 16 Oct so the Blast path can be shown. */
 {const DN=['Agus Salim','Bagus Hartono','Cecep Mulyana','Dani Permana','Eko Prasetyo','Fajar Nugroho','Gunawan Aji','Hasan Basri','Imam Santoso','Jaja Miharja','Kusnadi Putra','Lukman Hakim'];const KAR={CDD:'Wingbox',CDE:'Box',Fuso:'Wingbox',Tronton:'Wingbox'};const SPEC={CDD:[8,22],CDE:[5,16],Fuso:[15,32],Tronton:[24,45]};const CITY=['Jakarta','Bekasi','Bogor','Bandung','Semarang','Surabaya','Cirebon','Karawang'];const rows=[];let n=0;const seen=new Set();
  const add=(date,vendor,cat,ci,loc)=>{const key=date+'|'+vendor+'|'+cat;if(seen.has(key))return;seen.add(key);n++;const sp=SPEC[cat]||[8,22];
   rows.push({id:'VA-'+n,date,vendor,cat,kar:KAR[cat]||'Wingbox',ton:sp[0],m3:sp[1],plate:'B '+(7100+n*13)+' '+['VAA','VAB','VAC'][n%3],driverName:DN[(ci+n)%DN.length],phone:'+62 812-'+String(3000+n*37).slice(-4)+'-'+String(5100+n*53).slice(-4),lastLoc:loc||CITY[(n+ci)%CITY.length],reportedAt:at(date>TODAY?TODAY:date,'06:30')});};
  orders.filter(o=>o.ptype==='On Call'&&o.unitCategory!=='Tronton').forEach(o=>{let k=0;WATER.candidates(o).forEach((c,ci)=>{if(ci%2===1&&k>=(o.qty||1))return;k++;add(o.date,c.vendor,o.unitCategory,ci,ci%3===2?undefined:String((o.origin||{}).city||(o.origin||{}).loc||'').replace(/^(Kota|Kab\.) /,'').split(',')[0]||undefined);/* most reports are in the order's origin city, some are elsewhere (they are filtered out) */});});
  [TODAY,TOM,'2026-10-16'].forEach(dt=>['CDD','Fuso','Tronton'].forEach((cat,ci)=>{if(dt==='2026-10-16'&&cat==='Tronton')return;add(dt,'PT Sinar Jaya Logistik',cat,ci);}));
  S('vendorAvail',rows);}
 /* demo: more own CDD Wingbox units and own drivers allocated to the Dedicated demo project (UT), so the Trip Management has available ones to show. Not Master Data. */
 {const code='UT/PKS/2026/0114';const al=STORE.get('allocations');const have=new Set(al.filter(a=>a.project===code).map(a=>a.plate||a.driver));const dd0=MD.get().dd;const add=[];let n=1;
  dd0.vehicles.filter(v=>v.own==='own'&&v.status==='Active'&&v.chassis==='CDD'&&v.body==='Wingbox'&&!have.has(v.plate)&&!al.some(a=>a.kind==='unit'&&a.status==='Active'&&a.source!=='Vendor'&&a.plate===v.plate)).forEach(v=>add.push({id:'AL-D'+(n++),kind:'unit',project:code,plate:v.plate,role:'Default',source:'Own',status:'Active',validFrom:'2026-10-01',validTo:'2026-12-31',vendor:'',vendorDriver:''}));
  dd0.drivers.filter(x=>x.own==='own'&&x.status==='Active'&&!have.has(x.id)&&!al.some(a=>a.kind==='driver'&&a.status==='Active'&&a.driver===x.id)).slice(0,8).forEach(x=>add.push({id:'AL-D'+(n++),kind:'driver',project:code,driver:x.id,role:'Default',source:'Own',status:'Active',validFrom:'2026-10-01',validTo:'2026-12-31'}));
  S('allocations',al.concat(add));}
/* UT Dedicated pool: the Requested Unit / Driver rows follow what is allocated (Required = Allocated); other plans keep an intentional shortage so Request is demonstrable */
{const code='UT/PKS/2026/0114';const pls=STORE.get('projectPlans');const ut=pls.find(p=>p.project===code);if(ut){const pr=MD.project(ut.projectId);const al=STORE.get('allocations').filter(a=>a.project===code&&a.status==='Active');const veh=al.filter(a=>a.kind==='unit').map(a=>MD.vehicle(a.plate)).filter(Boolean);const g={};MD.rateList(pr).rows.forEach(r=>{const kar=MD.karGroup(r.karoseri);const k=[r.kategori,kar,r.tonase,r.kubikasi].join('|');if(!g[k])g[k]={cat:r.kategori,kar,ton:r.tonase,vol:r.kubikasi,n:0};g[k].n++;});
 const ov={};Object.keys(g).forEach(k=>{const x=g[k];const m=veh.filter(v=>v.chassis===x.cat&&MD.karMatch(v.karoseri,x.kar)&&(x.ton==null||+v.ton===+x.ton)&&(x.vol==null||+v.m3===+x.vol)).length;ov[k]=Math.max(x.n,m);});ut.reqOverride=ov;ut.reqDriversOverride=Math.max(1,al.filter(a=>a.kind==='driver').length);S('projectPlans',pls);}}
  /* DPI (Own Asset, In Planning, PM Hendra): one unit and one driver short, so Request Unit / Request Driver can be simulated with Own Asset; PP-0002 / PP-0006 (Transporter) are short too */
  {const pls=STORE.get('projectPlans');const dp=pls.find(p=>(MD.project(p.projectId)||{}).refno==='DPI/PKS/2025/005');if(dp){const pr=MD.project(dp.projectId);const g={};MD.rateList(pr).rows.forEach(r=>{const kar=MD.karGroup(r.karoseri);const k=[r.kategori,kar,r.tonase,r.kubikasi].join('|');g[k]=(g[k]||0)+1;});const ks=Object.keys(g);const al=STORE.get('allocations').filter(a=>a.project===dp.project&&a.status==='Active');const ov={};ks.forEach((k,i)=>{ov[k]=g[k]+(i===0?1:0);});dp.reqOverride=ov;dp.reqDriversOverride=Math.max(2,al.filter(a=>a.kind==='driver').length+1);S('projectPlans',pls);}}
  /* PTS (Dedicated, Own Asset): one own unit + one own driver allocated, so its Dedicated Own Asset orders are assigned automatically (plate and driver later on the Trip Management); the plan still needs one more of each (Request demo) */
  {const pls=STORE.get('projectPlans');const pp=pls.find(p=>p.project==='PTS/PKS/2025/003');const dd0=MD.get().dd;if(pp){const pr=MD.project(pp.projectId);const rl=MD.rateList(pr).rows;const r0=rl[0];const al=STORE.get('allocations');const usedP=new Set(al.filter(a=>a.status==='Active'&&a.kind==='unit').map(a=>a.plate)),usedD=new Set(al.filter(a=>a.status==='Active'&&a.kind==='driver').map(a=>a.driver));
   const v=r0&&dd0.vehicles.find(x=>x.own==='own'&&x.status==='Active'&&!usedP.has(x.plate)&&x.chassis===r0.kategori&&MD.karMatch(r0.karoseri,x.karoseri));const dr=dd0.drivers.find(x=>x.own==='own'&&x.status==='Active'&&!usedD.has(x.id));
   if(v&&dr){const n0=Math.max(0,...al.map(a=>+(String(a.id).split('-')[1])||0));al.push({id:'AL-'+String(n0+1).padStart(4,'0'),project:pp.project,kind:'unit',plate:v.plate,source:'Own',vendor:'',status:'Active',validFrom:'2026-10-01',validTo:'2026-12-31',role:'Default'},{id:'AL-'+String(n0+2).padStart(4,'0'),project:pp.project,kind:'driver',driver:dr.id,source:'Own',status:'Active',validFrom:'2026-10-01',validTo:'2026-12-31',role:'Default'});S('allocations',al);
    const g={};rl.forEach(r=>{const k=[r.kategori,MD.karGroup(r.karoseri),r.tonase,r.kubikasi].join('|');g[k]=(g[k]||0)+1;});const ov={};Object.keys(g).forEach((k,i)=>{ov[k]=g[k]+(i===0?1:0);});pp.reqOverride=ov;pp.reqDriversOverride=2;S('projectPlans',pls);}}}
 /* demo: four On Call orders of 15 Oct were won by a Transporter (waterfall), so the Trip Management has Transporter trips to show. Not Master Data. */
 {const os=orders;const V=[['PT Sinar Jaya Logistik',2400000],['PT Cahaya Transport',2550000],['PT Rukun Sentosa',2700000],['PT Sinar Jaya Logistik',2400000]];
  os.filter(o=>o.assignment&&o.assignment.path==='Own'&&o.ptype==='On Call'&&o.status==='Assigned'&&!o.trip).forEach((o,i)=>{o.assignment={path:'Vendor',vendor:V[i%V.length][0],vendors:[{vendor:V[i%V.length][0],qty:o.qty||1}],price:V[i%V.length][1],assignedAt:at(TODAY,'09:'+UI.pad(10+i*7)),by:'System',auto:true};});}
 /* demo: the latest Tenko of each own driver and the latest P2H of each own unit (shown on the Trip Management). Not Master Data. */
 {const d=MD.get().dd;const rd=STORE.get('readiness')||[];const add=[];
  d.drivers.filter(x=>x.own==='own'&&x.status==='Active').forEach((x,i)=>{const day=i%3===0?'2026-10-13':'2026-10-14';const hh=['05:40','06:10','06:35','19:20'][i%4];const unfit=x.name==='Vicky Ramadhan';const note=x.name==='Lukman Hakim';
   add.push({key:'drv:'+x.id+':'+day,by:'Yusuf Hidayat',tenko:{at:at(day,hh),result:unfit?'Unfit':note?'Fit with note':'Fit',sys:unfit?152:112+(i%5)*3,dia:unfit?96:72+(i%4)*3,temp:+(36.4+(i%3)/10).toFixed(1),app:'Yes',ppe:[]}});});
  d.vehicles.filter(v=>v.own==='own'&&v.status==='Active').forEach((v,i)=>{const day=i%2?'2026-10-13':'2026-10-14';const bad=(v.plate==='B 3345 PQR'||v.plate==='B 7386 TYY');add.push({key:'unit:'+v.plate+':'+day,by:'Yusuf Hidayat',p2h:{at:at(day,'0'+(5+i%3)+':'+(10+(i%4)*10)),result:bad?'Fail':'Pass',nok:bad?['Brake','Lights']:[]}});});
  window.__demoChecks=add;/* merged into the readiness records below */}
 /* demo history for idle time: when each own unit and driver last finished a trip (before the trips on the board). Not Master Data.
    Two drivers of the UT project were still on duty the evening before (idle under 8h): one with room left, one that would go over 12h. */
 {const d=MD.get().dd;const ENDS=[['2026-10-12','17:40'],['2026-10-12','21:15'],['2026-10-13','09:30'],['2026-10-13','14:05'],['2026-10-13','18:50'],['2026-10-13','22:10'],['2026-10-14','06:20']];const tm=h=>{const p=h.split(':');return +p[0]*60+ +p[1];};const rows=[];
  d.vehicles.filter(v=>v.own==='own'&&v.status==='Active').forEach((v,i)=>{const e=ENDS[(i*3+1)%ENDS.length];rows.push({id:'H-U'+i,kind:'unit',key:v.plate,date:e[0],min:tm(e[1])});});
  d.drivers.filter(x=>x.own==='own'&&x.status==='Active').forEach((x,i)=>{const e=ENDS[(i*2+2)%ENDS.length];rows.push({id:'H-D'+i,kind:'driver',key:x.id,date:e[0],min:tm(e[1])});});
  const utD=STORE.get('allocations').filter(a=>a.project==='UT/PKS/2026/0114'&&a.kind==='driver'&&a.source!=='Vendor').map(a=>a.driver);
  [['Galih Pratomo','19:30','22:30'],['Kusnadi Hartono','13:00','23:00']].forEach(([nm,s0,e0])=>{const k=(d.drivers.find(x=>x.name===nm)||{}).id;if(!k)return;const r=rows.find(x=>x.kind==='driver'&&x.key===k);if(r)Object.assign(r,{date:'2026-10-14',min:tm(e0),sDate:'2026-10-14',sMin:tm(s0)});});
  S('ddHistory',rows);}
/* On Call orders assigned to a Transporter took their unit from what that vendor reported in Daily Availability: plate, driver and phone come from the availability row (no invented ones; a missing row is added to the vendor's report), and the row is taken */
  /* On Call is always sourced from a Transporter: the On Call orders that already have a seeded trip are Transporter trips too */
  {const VL=[['PT Sinar Jaya Logistik',2400000],['PT Cahaya Transport',2550000],['PT Rukun Sentosa',2700000]];let k=0;orders.filter(o=>o.ptype==='On Call'&&o.trip&&o.assignment&&o.assignment.path!=='Vendor').forEach(o=>{const v=VL[k++%VL.length];o.assignment={path:'Vendor',vendor:v[0],vendors:[{vendor:v[0],qty:o.qty||1}],price:v[1],assignedAt:o.assignment.assignedAt||at(TODAY,'09:15'),by:'System',auto:true};const t=allDD.concat(trips).find(x=>x.id===o.trip);if(t)Object.assign(t,{vendor:v[0],vendorConf:'Confirmed',vendorRate:v[1],toll:null,driver:null});});}
  {const va=STORE.get('vendorAvail')||[];let noAv=0;orders.filter(o=>o.ptype==='On Call'&&(o.status==='Assigned'||o.status==='Planned')&&o.assignment&&o.assignment.path==='Vendor'&&!(o.assignment.units||[]).length).forEach((o,ix)=>{const a=o.assignment;const ven=a.vendor||((a.vendors||[])[0]||{}).vendor;if(!ven)return;
   /* three Transporter orders have no Daily Availability yet: the vendor still has to send plate and driver (shown on the Trip Management as waiting for the vendor) */
   if(ix%3===2&&noAv<3&&!o.trip){noAv++;a.vendor=ven;a.noAvail=true;return;}
   let row=va.find(r=>r.date===o.date&&r.vendor===ven&&r.cat===o.unitCategory&&!r.takenBy);
   if(!row){const base=va.find(r=>r.vendor===ven&&r.cat===o.unitCategory)||va.find(r=>r.cat===o.unitCategory)||va[0];if(!base)return;const n=va.length+1;row=Object.assign({},base,{id:'VA-'+n,date:o.date,vendor:ven,cat:o.unitCategory,plate:'B '+(7100+n*13)+' VAD',lastLoc:String((o.origin||{}).city||'').replace(/^(Kota|Kab\.) /,'').split(',')[0]||base.lastLoc});delete row.takenBy;va.push(row);}
   row.takenBy=o.id;a.vendor=ven;a.plate=row.plate;a.driverName=row.driverName;a.driverPhone=row.phone;a.nopolVia='Daily Availability';a.nopolAt=a.assignedAt||T0;a.units=[{plate:row.plate,cat:row.cat,kar:row.kar,vendor:ven,driverName:row.driverName,phone:row.phone}];const tt=o.trip&&allDD.concat(trips).find(x=>x.id===o.trip);if(tt)Object.assign(tt,{unit:row.plate,vendorDriver:row.driverName,vendorPhone:row.phone,nopolVia:'Daily Availability'});});S('vendorAvail',va);}
 /* a second Dedicated Own Asset order on the same day as ORD-20261015-0056: the one allocated unit / driver is already taken, so it is the Own Asset exception (Allocation not enough) */
  {const src=orders.find(o=>o.id==='ORD-20261015-0056');if(src&&!orders.some(o=>o.id==='ORD-20261015-0120')){const c=JSON.parse(JSON.stringify(src));Object.assign(c,{id:'ORD-20261015-0120',status:'Ready to Assign',createdAt:(src.createdAt||0)+60000});delete c.assignment;delete c.trip;delete c.waterfall;delete c.parent;orders.push(c);}}
  /* Dedicated orders are never sourced by a vendor waterfall / blast (Own Asset and Transporter go to the allocated resources automatically, Mix by a source decision): clear any waterfall state; blast is only for On Call */
  orders.filter(o=>o.ptype!=='On Call'&&o.waterfall).forEach(o=>{delete o.waterfall;if(['Assigning','Unfulfilled','Re-sourcing'].indexOf(o.status)>=0){o.status='Ready to Assign';delete o.assignment;}if(o.assignment&&o.assignment.path==='Vendor')o.assignment.auto=true;});
  S('orders',orders);
 /* ---- trips ---- */
 const all=trips.concat(allDD);S('trips',all);
 /* dispatch plans: version snapshots for diff */
 const snap=ts=>ts.map(t=>({id:t.id,unit:t.unit,driver:t.driver,orders:t.orders.slice(),out:t.out}));
 S('dispatchPlans',[{id:'DP-20261014',date:TODAY,version:1,status:'Published',publishedAt:at('2026-10-13','15:20'),publishedBy:'Rina Kusumawati',trips:snap(allDD.filter(t=>t.date===TODAY&&!t.vendor))},
  {id:'DP-20261015',date:TOM,version:1,status:'Published',publishedAt:at(TODAY,'09:30'),publishedBy:'Rina Kusumawati',trips:snap(dd.filter(t=>t.version===1).map(t=>t.id==='DT-20261015-0003'?Object.assign({},t,{out:t.out-30}):t))}]);
 scenario(all);
 const ocP=proj(K.OC[0]),dedP=proj(K.DED[0]),lhP=proj(K.LH[0]),ptsP=proj(K.PTS[0]),expP=proj(K.EXP[0]);const rk=(p,i)=>{const r=p.rates[i]||p.rates[0]||{};return UI.typeKey(r.kategori||'CDD',MD.karGroup(r.karoseri)||'Wingbox');};
 S('capacityForecasts',[{id:'FC-1',project:ocP.code,utype:rk(ocP,0),date:'2026-10-17',value:9,by:'Andri Saputra',at:at('2026-10-13','11:00')}]);
 S('resourceRequests',[
  {id:'RR-2026-0034',project:(STORE.get('projectPlans').find(p=>p.id==='PP-0002')||{}).project||dedP.code,utype:'Driver',qty:1,from:'2026-10-17',to:'2026-10-31',reason:'Extra driver for the weekend run',ownership:'Outsource',license:'SIM B2',cert:'',status:'Open',to_:'Supply Mgmt',by:'Hendra Wijaya',at:at('2026-10-13','11:00'),updates:[]},
  {id:'RR-2026-0033',project:lhP.code,utype:'Driver',qty:1,from:'2026-10-17',to:'2026-10-31',reason:'Second driver for the Surabaya run',ownership:'Internal',license:'',cert:'',status:'Open',to_:'Driver Mgmt',by:'Hendra Wijaya',at:at('2026-10-13','09:30'),updates:[]},
  {id:'RR-2026-0032',project:dedP.code,utype:rk(dedP,0),qty:1,from:'2026-10-17',to:'2026-10-31',reason:'Own unit for the weekend',ownership:'Internal',status:'Open',to_:'Vehicle Mgmt',by:'Hendra Wijaya',at:at('2026-10-13','09:00'),updates:[]},
  {id:'RR-2026-0031',project:dedP.code,utype:rk(dedP,1),qty:1,from:'2026-10-17',to:'2026-10-31',reason:'Weekend peak',ownership:'Transporter',status:'Open',to_:'Supply Mgmt',by:'Hendra Wijaya',at:at('2026-10-12','10:00'),updates:[]},
  {id:'RR-2026-0029',project:lhP.code,utype:rk(lhP,1),qty:1,from:'2026-10-01',to:'2026-10-31',reason:'Second unit for Surabaya run',ownership:'Transporter',status:'Fulfilled',to_:'Supply Mgmt',by:'Hendra Wijaya',at:at('2026-09-25','09:00'),updates:[{at:at('2026-09-27','15:00'),by:'Teguh Prakoso',text:'D 5541 KLM allocated'}]},
  {id:'RR-2026-0027',project:ptsP.code,utype:rk(ptsP,0),qty:1,from:'2026-09-15',to:'2026-09-30',reason:'Trial route',ownership:'Transporter',status:'Cancelled',to_:'Supply Mgmt',by:'I Gede Wirawan',at:at('2026-09-10','09:00'),updates:[]}]);
 S('templates',[['PUTS','Default','PUTS_default_v3.xlsx','2026-08-01'],['PUTS','ADM-SAP','PUTS_ADM_v2.xlsx','2026-09-20'],['Controller Check Sheet','Default','CCS_default_v2.xlsx','2026-08-01'],['Truck Information','Default','TruckInfo_v1.xlsx','2026-08-01'],['Driver Check Sheet','Default','DCS_default_v4.xlsx','2026-09-01'],['Daily Dispatch Plan','Default','DDP_default_v1.xlsx','2026-09-10'],['SPPB','Default','SPPB_v1.xlsx','2026-09-10'],['SPK','Default','SPK_v1.xlsx','2026-09-10']].map((r,i)=>({id:'TPL-'+(i+1),type:r[0],scope:r[1],file:r[2],updated:r[3],by:'Rina Kusumawati',placeholders:['{{plan_id}}','{{route}}','{{cycle}}','{{unit}}','{{driver}}','{{out_pool}}'],status:'Active'})));
 docs(all);
 inboxSeed();
}
/* waterfall snapshot seeds */
function WF_SEED(o,kind){const md=MD.get();const lock=T0-(kind==='waiting'?6:kind==='partial'?70:kind==='auto'?50:kind==='resourcing'?40:130)*60000;
 const c=WATER.candidates(o);c.forEach((x,i)=>{x.status='Queued';});
 const wf={lockedAt:lock,qty:o.qty||1,covered:0,candidates:c,paused:false,stopped:false,log:[]};
 const send=(i,t)=>{c[i].status='Sent';c[i].sentAt=t;c[i].deadline=t+30*60000;};
 if(kind==='waiting'){send(0,lock);}
 if(kind==='partial'){c[0].status='No Response';c[0].sentAt=lock;c[0].respAt=lock+30*60000;c[1].status='Selected';c[1].qty=2;c[1].sentAt=lock+30*60000;c[1].respAt=lock+62*60000;wf.covered=2;send(2,lock+62*60000);c[2].deadline=T0+52*60000;c[2].sentAt=T0-8*60000;}
 if(kind==='auto'){c[0].status='Selected';c[0].qty=1;c[0].sentAt=lock;c[0].respAt=lock+11*60000;wf.covered=1;c.slice(1).forEach(x=>x.status='Closed');}
 if(kind==='exhausted'){c.forEach((x,i)=>{x.status=i===c.length-1?'Not Ready':'No Response';x.sentAt=lock+i*30*60000;x.respAt=x.sentAt+30*60000;});if(c[0])c[0].late=true,c[0].status='Late Response',c[0].lateAt=T0-5*60000;wf.escalatedAt=T0-15*60000;}
 if(kind==='resourcing'){c[0].status='Not Ready';c[0].note='Not confirmed at report time';c[0].sentAt=lock;c[0].respAt=lock+20*60000;send(1,T0-4*60000);c[1].deadline=T0+56*60000;}
 return wf;}
/* ---- readiness scenario for today ---- */
function scenario(all){const p=DOM.params();const md=MD.get();const R=[],L=[],U=[],X=[],RQ=[],M=[];
 const now=10*60+58;
 const ck=(drv,plate,date,o)=>{if(drv)R.push({key:DOM.rkey('drv',drv,date),att:o.att,tenko:o.tenko,by:'Yusuf Hidayat'});if(plate&&o.p2h)R.push({key:DOM.rkey('unit',plate,date),p2h:o.p2h,by:'Yusuf Hidayat'});};
 const cap=(m,k)=>Math.min(SEED.at(TODAY,UI.hm(m)),T0-k*60000);const fit=(t,o)=>({att:{v:'Present',at:cap(t.out-60-(o&&o.early||2),14)},tenko:{sys:118,dia:78,temp:36.5,app:'Yes',ppe:['Uniform & ID','Helmet with chin strap','Safety shoes & socks','Vest','Gloves'],result:'Fit',at:cap(t.out-50,9)},p2h:{result:'Pass',nok:[],at:cap(t.out-45,6)}});
 const mr=all.filter(t=>t.type==='MR'&&t.date===TODAY&&t.out>=now).sort((a,b)=>a.out-b.out);
 const done=new Set();
 const use=(i,fn)=>{const t=mr[i];if(!t||done.has(t.driver))return;done.add(t.driver);fn(t);};
 use(0,t=>{const f=fit(t);ck(t.driver,t.unit,TODAY,f);});
 use(1,t=>{ck(t.driver,t.unit,TODAY,{att:{v:'Present',at:SEED.at(TODAY,UI.hm(t.out-55))},tenko:{sys:150,dia:95,temp:36.6,app:'Yes',ppe:['Uniform & ID','Helmet with chin strap','Safety shoes & socks','Vest','Gloves'],result:'Unfit',at:cap(t.out-45,10)},p2h:{result:'Pass',nok:[],at:cap(t.out-40,7)}});});
 use(2,t=>{const f=fit(t);ck(t.driver,t.unit,TODAY,f);});
 use(3,t=>{L.push({id:'LV-1',driver:t.driver,type:'Sick',from:TODAY,to:TODAY,note:'Called in 09:40',by:'Sri Wahyuni',at:SEED.at(TODAY,'09:40'),fallback:true});t.replacing=true;RQ.push({id:'RQ-2026-0102',type:'Driver',tripId:t.id,to:'Driver Management',neededAt:SEED.at(TODAY,UI.hm(t.out-60)),deadline:SEED.at(TODAY,'10:58')+22*60000,status:'Open',by:'Rina Kusumawati',at:SEED.at(TODAY,'10:50'),note:'Driver sick'});});
 use(4,t=>{ck(t.driver,null,TODAY,{att:{v:'Unreachable',at:SEED.at(TODAY,'10:40')}});});
 use(5,t=>{const f=fit(t);ck(t.driver,t.unit,TODAY,{att:f.att});});
 use(mr.length-4,t=>{L.push({id:'LV-2',driver:t.driver,type:'Leave',from:TODAY,to:'2026-10-16',note:'Family event',by:'Sri Wahyuni',at:SEED.at('2026-10-12','09:00'),fallback:true});});
 const skip=mr[mr.length-1];if(skip){skip.status='Skipped';skip.skipReason='No backup';}
 /* direct delivery today */
 const dt=id=>all.find(t=>t.id===id);
 let t=dt('DT-20261014-0004');if(t){const f=fit(t);f.tenko.app='No';f.tenko.result='Fit with note';ck(t.driver,t.unit,TODAY,f);X.push({id:'EXC-2026-0018',tripId:t.id,reasons:[{code:'DRV-APP',label:'Driver Apps off',detail:'Tenko '+UI.hm(t.out-50)}],note:'Phone battery, app restored on route',requester:'Rina Kusumawati',requestedAt:T0-34*60000,deadline:T0-19*60000,approver:'Hendra Wijaya',decision:'Approved',decidedBy:'Hendra Wijaya',decidedAt:T0-17*60000,comment:'OK, confirm app active before drop 1'});}
 t=dt('DT-20261014-0007');if(t){const f=fit(t);f.p2h={result:'Fail',nok:['Brake pedal travel'],at:T0-25*60000};ck(t.driver,t.unit,TODAY,f);
  X.push({id:'EXC-2026-0019',tripId:t.id,reasons:[{code:'P2H-CRIT',label:'P2H Critical',detail:'Brake pedal travel NOK'}],failedItem:'Brake pedal travel',mitigation:'60 km/h, workshop after drop 2. VM checked brake line.',note:'Pedal long, holds pressure. Customer needs delivery by 15:00.',attachment:'IMG_0604.jpg',requester:'Rina Kusumawati',requestedAt:T0-8*60000,deadline:Math.min(T0+7*60000,SEED.at(TODAY,UI.hm(t.out-5))),approver:'Hendra Wijaya',decision:null});
  M.push({id:'MR-2026-0051',plate:t.unit,date:TODAY,tripId:t.id,items:['Brake pedal travel'],severity:'Critical',status:'Open',by:'Yusuf Hidayat',at:T0-25*60000});}
 /* Not Ready but overridable (P2H Critical, no exception yet): reaches the Request exception dialog as Planner */
 t=dt('DT-20261014-0008');if(t){const f=fit(t);f.p2h={result:'Fail',nok:['Headlights high/low beam'],at:T0-12*60000};ck(t.driver,t.unit,TODAY,f);M.push({id:'MR-2026-0052',plate:t.unit,date:TODAY,tripId:t.id,items:['Headlights high/low beam'],severity:'Critical',status:'Open',by:'Yusuf Hidayat',at:T0-12*60000});}
 t=dt('DT-20261014-0011');if(t){L.push({id:'LV-3',driver:t.driver,type:'Leave',from:TODAY,to:TODAY,note:'Approved leave',by:'Sri Wahyuni',at:SEED.at('2026-10-10','09:00'),fallback:true});}
 t=dt('DT-20261014-0002');if(t)ck(t.driver,t.unit,TODAY,fit(t));
 t=dt('DT-20261014-0005');if(t){const f=fit(t);ck(t.driver,t.unit,TODAY,{att:f.att,tenko:f.tenko});}
 /* H-1: driver on leave tomorrow -> Predicted Not Ready on H-1 board */
 const tm=all.filter(x=>x.type==='MR'&&x.date==='2026-10-15'&&x.driver).sort((a,b)=>a.out-b.out);if(tm[6])L.push({id:'LV-4',driver:tm[6].driver,type:'Leave',from:'2026-10-15',to:'2026-10-15',note:'Wedding',by:'Sri Wahyuni',at:SEED.at('2026-10-11','09:00'),fallback:true});
 M.push({id:'MR-2026-0047',plate:md.vehicles[66].plate,date:'2026-10-10',items:['Headlights high/low beam'],severity:'Minor',status:'Closed',by:'Yusuf Hidayat',at:SEED.at('2026-10-10','06:10'),closedBy:'Sri Wahyuni',closedAt:SEED.at('2026-10-10','15:00'),closeNote:'Bulb replaced'});
 RQ.push({id:'RQ-2026-0099',type:'Unit',tripId:mr[2]?mr[2].id:'',to:'Vehicle Management',neededAt:SEED.at(TODAY,'08:00'),deadline:SEED.at(TODAY,'08:30'),status:'Answered',by:'Rina Kusumawati',at:SEED.at(TODAY,'07:55'),response:'Unit B 9047 KYV available',respondedBy:'Sri Wahyuni',respondedAt:SEED.at(TODAY,'08:12')});
 U.push({id:'US-1',plate:md.vehicles[70].plate,status:'Not Available',from:'2026-10-12',to:'2026-10-18',note:'Gearbox overhaul',by:'Sri Wahyuni',at:SEED.at('2026-10-12','08:00'),fallback:true});
 S('readiness',R.concat((window.__demoChecks||[]).filter(a=>!R.some(r=>r.key===a.key))));S('leave',L);S('unitStatus',U);S('exceptions',X);S('requests',RQ);S('maintenance',M);
 STORE.set('trips',all,true);}
/* ---- documents ---- */
function docs(all){const D=[];let n=0;const add=o=>D.push(Object.assign({id:'DOC-'+String(++n).padStart(4,'0'),status:'Generated',dist:[],generatedAt:SEED.at(TODAY,'08:58')},o));
 const ref=SEED.admRef();
 [1,2].forEach(v=>{const st=v===1?'Superseded':'Generated';const g=v===1?SEED.at('2026-09-29','15:12'):SEED.at(TODAY,'08:58');const plan='MP-2026-0050';
  ref.routeGroups.forEach(r=>add({type:'PUTS',scope:'MP-2026-0050',planId:plan,version:v,route:r.id,routeName:r.name,status:st,generatedAt:g}));
  add({type:'Controller Check Sheet',scope:'MP-2026-0050',planId:plan,version:v,route:'All routes',status:st,generatedAt:g});
  ref.routeGroups.forEach(r=>add({type:'Truck Information',scope:'MP-2026-0050',planId:plan,version:v,route:r.id,routeName:r.name,status:st,generatedAt:g}));
  add({type:'Driver Check Sheet',scope:'MP-2026-0050',planId:plan,version:v,route:'All routes',status:st,generatedAt:g});});
 const d=D.filter(x=>x.version===2);d[0].dist=[{to:'PT Akashi Wahana Indonesia',channel:'WhatsApp',at:SEED.at(TODAY,'09:05'),status:'Confirmed',by:'Dewi Anggraini'}];
 d[2].status='Corrected';d[2].dist=[{to:'PT Yutaka Manufacturing Indonesia',channel:'Email',at:SEED.at(TODAY,'09:12'),status:'Sent',by:'Dewi Anggraini'}];
 d[4].dist=[{to:'PT Showa Indonesia',channel:'WhatsApp',at:SEED.at(TODAY,'09:40'),status:'Revision requested',by:'Dewi Anggraini'}];
 all.filter(t=>t.type==='MR'&&t.date===TODAY&&t.project==='ADM-SAP').forEach(t=>add({type:'Driver Check Sheet',scope:'daily',tripId:t.id,date:TODAY,version:1,route:t.route,routeName:t.routeName+' cycle '+t.cycle,generatedAt:SEED.at('2026-10-13','15:40')}));
 add({type:'Daily Dispatch Plan',scope:'DP-20261014',date:TODAY,version:1,route:'All trips',generatedAt:SEED.at('2026-10-13','15:20')});
 add({type:'Daily Dispatch Plan',scope:'DP-20261015',date:'2026-10-15',version:1,route:'All trips',generatedAt:SEED.at(TODAY,'09:30')});
 S('documents',D);}
function inboxSeed(){const N=[
  {kind:'Action Required',to:['pm'],title:'Exception request DT-20261014-0007',link:'exceptions.html?id=EXC-2026-0019',ts:T0-8*60000},
  {kind:'Action Required',to:['dm'],title:'Driver replacement request',link:'readiness.html?tab=requests',ts:T0-8*60000},
  {kind:'Action Required',to:['planner'],title:'Trip Not Ready: Tenko Unfit',link:'readiness.html',ts:T0-12*60000},
  {kind:'Action Required',to:['opslog'],title:'3 projects need a PM',link:'project-planning.html?id='+((STORE.get('projectPlans').find(p=>!p.pm&&!p.fixture)||{}).id||'PP-0003'),ts:T0-3600000},
  {kind:'Action Required',to:['sales'],title:'Orders need a rate',link:'order-detail.html?id='+((STORE.get('orders').find(o=>o.status==='Pending Dealing')||{}).id||''),ts:T0-30*60000},
  {kind:'Action Required',to:['planner'],title:'Allocation not enough: order needs action',link:'order-detail.html?id='+((STORE.get('orders').find(o=>o.status==='Ready to Assign'&&o.ptype!=='On Call'&&o.assignment==null)||STORE.get('orders').find(o=>o.status==='Ready to Assign')||{}).id||'')+'&tab=assignment',ts:T0-15*60000},
  {kind:'Action Required',to:['supply'],title:'Resource request RR-2026-0031',link:'resource-requests.html?request=RR-2026-0031',ts:T0-86400000},
  {kind:'Info',to:['planner','ccr','fieldops'],title:'MP-2026-0050 published',link:'milkrun-step5.html?plan=MP-2026-0050',ts:T0-2*3600000},
  {kind:'Info',to:['fieldops','ccr'],title:'Daily Dispatch Plan 15 Oct v1',link:{default:'dispatch-detail.html?trip='+((STORE.get('trips').find(t=>t.type==='DT'&&t.status==='Published')||{}).id||''),fieldops:'readiness-tablet.html'},ts:SEED.at(TODAY,'09:30')},
 {kind:'Action Required',to:['vm'],title:'Resource request RR-2026-0032',link:'resource-requests.html?request=RR-2026-0032',ts:T0-3*3600000},
 {kind:'Action Required',to:['dm'],title:'Resource request RR-2026-0033',link:'resource-requests.html?request=RR-2026-0033',ts:T0-3*3600000}];
 STORE.set('notifications',N.map((n,i)=>Object.assign({id:'NT-'+i,read:false},n)),true);
 STORE.set('auditLog',[
  {id:'AU-1',ts:SEED.at(TODAY,'08:58'),actor:'Hendra Wijaya',role:'PM',action:'Published',obj:'MP-2026-0050',type:'Status'},
  {id:'AU-2',ts:SEED.at(TODAY,'08:31'),actor:'Rina Kusumawati',role:'Planner',action:'Out Pool R05 cycle 3',detail:'08:00 to 08:10',obj:'MP-2026-0050',type:'Schedule'},
  {id:'AU-3',ts:SEED.at(TODAY,'08:31'),actor:'System',role:'',action:'Chaining recalculated',obj:'MP-2026-0050',type:'Schedule'},
  {id:'AU-4',ts:SEED.at(TODAY,'09:12'),actor:'Dewi Anggraini',role:'CCR',action:'Sent PUTS R03 v2',detail:'Email',obj:'MP-2026-0050',type:'Documents'},
  {id:'AU-5',ts:SEED.at('2026-10-12','14:20'),actor:'Rina Kusumawati',role:'Planner',action:'Added TKBM, R03 cycle 2',detail:'Rp 75.000',obj:'MP-2026-0050',type:'Cost'},
  {id:'AU-6',ts:SEED.at(TODAY,'09:30'),actor:'Rina Kusumawati',role:'Planner',action:'Published Dispatch Plan v1',obj:'DP-20261015',type:'Status'},
  {id:'AU-7',ts:T0-8*60000,actor:'Rina Kusumawati',role:'Planner',action:'Requested exception',detail:'P2H Critical',obj:'DT-20261014-0007',type:'Status'},
  {id:'AU-8',ts:T0-17*60000,actor:'Hendra Wijaya',role:'PM',action:'Approved exception',detail:'Driver Apps off',obj:'DT-20261014-0004',type:'Status'}].concat(wfAudit()),true);}
/* assignment audit for seeded waterfalls (blast, responses, assignment) */
function wfAudit(){const out=[];let n=0;STORE.get('orders').filter(o=>o.waterfall).forEach(o=>{const w=o.waterfall;out.push({id:'AU-W'+(++n),ts:w.lockedAt,actor:'Rina Kusumawati',role:'Planner',action:'Blast to vendors',detail:w.candidates.length+' candidates locked',obj:o.id,type:'Assignment'});w.candidates.forEach(c=>{if(c.respAt||c.status==='No Response'){const act={Selected:'Vendor accepted','Not Ready':'Vendor declined','No Response':'No response','Late Response':'Late response recorded',Ready:'Vendor accepted'}[c.status];if(act)out.push({id:'AU-W'+(++n),ts:c.respAt||(c.deadline||w.lockedAt),actor:c.status==='No Response'?'System':'Rina Kusumawati',role:c.status==='No Response'?'':'Planner',action:act,detail:c.vendor,obj:o.id,type:'Assignment'});}});if(o.assignment&&o.assignment.vendor&&o.status==='Assigned')out.push({id:'AU-W'+(++n),ts:o.assignment.assignedAt||w.lockedAt,actor:'System',role:'',action:'Assigned to '+o.assignment.vendor,obj:o.id,type:'Assignment'});});return out;}
window.SEED_DD=build;
})();
