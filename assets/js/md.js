/* MODA TMS Planning - Master Data adapter (Foundation v2).
   SOURCE OF TRUTH = the Master Data prototype ("Grand Design UI/Master Data/Combined with P2H, Cost, Location/*.html").
   - Live data: localStorage `moda_md_<module>` (written by the MD pages after any change).
   - Fallback (module never touched in this browser): assets/js/md-snapshot.js, EXTRACTED automatically from the MD pages by
     tools/make-md-snapshot.ps1 (re-run it whenever the MD seed changes). Nothing in this file is typed MD data.
   Planning never writes Master Data. Records marked src:'md' come from Master Data; src:'plan' are the Milkrun demo fixtures
   (ADM-SAP / TAM-PIO, their fleet, drivers and supplier locations) that Master Data does not hold. Direct Delivery and Order pages
   read src:'md' only (MD.get().dd.*). Operating hours come from the Customer Warehouse Operating Hours (Weekdays / Friday / Weekend). */
(function(){
'use strict';
const SNAP=window.MD_SNAPSHOT||{rows:{},O:{}};
const DEMO=window.MD_DEMO||null;/* placeholder overlay (md-demo-fill.js): used only where Master Data has no value */
/* deterministic PRNG so the generated Milkrun fixture fleet is identical on every load */
function rng(seed){let s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function h36(s){let h=5381;s=String(s);for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36).toUpperCase().padStart(6,'0').slice(0,6);}
const FIRST=['Slamet','Agus','Budi','Wahyu','Fajar','Teguh','Joko','Eko','Ahmad','Dedi','Rudi','Hendra','Bambang','Yusuf','Dimas','Rizki','Arif','Andi','Bayu','Hadi','Iwan','Sugeng','Supri','Tono','Wawan','Yanto','Asep','Ujang','Dadang','Cecep','Nanang','Herman','Gilang','Rendi','Fikri','Ilham','Aris','Doni','Hari','Imam'];
const LAST=['Riyadi','Pratama','Santoso','Hidayat','Nugroho','Wibowo','Susilo','Prasetyo','Fauzi','Kurniawan','Hermawan','Setiawan','Saputra','Gunawan','Firmansyah','Ramadhan','Wijaya','Siregar','Nasution','Hakim','Purnomo','Sutrisno','Maulana','Rahman','Syahputra','Lubis','Kusuma','Hartono','Suharto','Permana'];
const LET='ABCDEFGHJKLMNPRSTUVWXYZ';
function plates(n,seed){const r=rng(seed),set=new Set(),out=[];while(out.length<n){const p='B '+(9000+Math.floor(r()*999))+' '+LET[Math.floor(r()*LET.length)]+LET[Math.floor(r()*LET.length)]+LET[Math.floor(r()*LET.length)];if(!set.has(p)){set.add(p);out.push(p);}}return out;}
function names(n,seed,taken){const r=rng(seed),out=[];let g=0;while(out.length<n&&g<5000){g++;const nm=FIRST[Math.floor(r()*FIRST.length)]+' '+LAST[Math.floor(r()*LAST.length)];if(!taken.has(nm)){taken.add(nm);out.push(nm);}}return out;}

/* ------------ Karoseri mapping (ONE place; assumption logged in BUILD-LOG "Foundation v2") ------------
   Customer Project Rate List / Order use the BODY TYPE list (Wingbox, Box, Flatbed, Bak Terbuka, ...); Vehicle uses the
   VEHICLE KAROSERI list (Hydraulic Wing Box, Box Besi, Flat Deck, ...). Requested (rate / order) and allocated (vehicle)
   are matched through the canonical body type. Vehicle.body = canonical group, Vehicle.karoseri = the raw Master Data value. */
const KAR_GROUPS=[
 ['Wingbox',['Hydraulic Wing Box','Terpaulin Wing Box']],
 ['Box',['Box Besi','Box Aluminium','Steel Box']],
 ['Flatbed',['Flat Deck']],
 ['Bak Terbuka',['Bak Besi','Bak Besi (3 Way)','Bak Besi (5 Way)']],
 ['Car Towing',['Towing Car','Car Carrier','Double Carrier']],
 ['Reguler',['Blind Van','Microbus','Minibus','Pick Up']]
 /* 'Long' has no vehicle karoseri in Master Data: it only matches itself. Refrigerator, tanker, tractor head, logging, Lasah Type
    are not in the body type list: they only match themselves. */];
function karGroup(k){k=String(k||'').trim();if(!k)return '';const g=KAR_GROUPS.find(x=>x[0].toLowerCase()===k.toLowerCase()||x[1].some(v=>v.toLowerCase()===k.toLowerCase()));return g?g[0]:k;}
const karMatch=(a,b)=>!!a&&!!b&&karGroup(a).toLowerCase()===karGroup(b).toLowerCase();
const typeKeyOf=(cat,kar)=>(String(cat||'').trim()+' '+karGroup(kar)).trim();

/* ------------ location helpers: same city written differently in Location (kota + provinsi) and Rate (Kota X, Provinsi) ------------ */
function cityKey(s){return String(s||'').toLowerCase().replace(/^\s*(kota|kab\.?|kabupaten)\s+/,'').replace(/\s*,\s*/g,', ').replace(/\s+/g,' ').trim();}
const sameCity=(a,b)=>!!a&&!!b&&cityKey(a)===cityKey(b);
const cityShort=s=>String(s||'').replace(/^(Kota|Kab\.) /,'').split(',')[0];
/* centroids for cities that Master Data Location does not cover (needed only to estimate route time / km) */
const GEO={'jakarta timur':[-6.225,106.9],'jakarta barat':[-6.168,106.759],'jakarta utara':[-6.138,106.863],'jakarta selatan':[-6.261,106.81],'jakarta pusat':[-6.186,106.834],'bandung':[-6.9175,107.6191],'semarang':[-6.9667,110.4167],'surabaya':[-7.2575,112.7521],'bekasi':[-6.2383,106.9756],'bogor':[-6.595,106.8166],'denpasar':[-8.65,115.2167],'medan':[3.5952,98.6722],'tangerang':[-6.1783,106.63],'depok':[-6.4025,106.7942],'karawang':[-6.3227,107.3376],'cilegon':[-6.0025,106.0111],'palembang':[-2.9761,104.7754],'surakarta':[-7.5666,110.8283],'yogyakarta':[-7.7956,110.3695],'malang':[-7.9666,112.6326],'cirebon':[-6.7063,108.557],'cikarang':[-6.3,107.15]};
function geoPlace(name){const k=cityKey(String(name||'').split(',')[0]);const g=GEO[k];if(!g)return null;return {name:cityShort(name),type:'City',city:cityShort(name),lat:g[0],lng:g[1],fixht:30,buffer:10,addht:0,src:'geo',customers:[]};}

/* ------------ Milkrun fixtures (NOT in Master Data): ADM-SAP / TAM-PIO projects, their fleet, drivers, suppliers ------------ */
const CUSTOMERS=[
 {id:'C-ADM',name:'PT Astra Daihatsu Motor',short:'ADM',city:'Sunter, Jakarta Utara',src:'plan',status:'Active'},
 {id:'C-TAM',name:'PT Toyota-Astra Motor',short:'TAM',city:'Sunter, Jakarta Utara',src:'plan',status:'Active'}
];
const PROJECTS=[
 {id:'CP-ADM-SAP',code:'ADM-SAP',name:'ADM-SAP Sunter',customer:'PT Astra Daihatsu Motor',ptype:'Milkrun',bizline:'MODA Logistics',sl:'Regular',svclevel:'Regular',manpower:{driver:1,addDriver:0,helper:1},pool:'Pool Cibitung',
  hours:{wd:['07:00','22:00'],fri:['07:00','21:00'],we:null},hoursLoc:'ADM Sunter Plant',area:'Jabodetabek',start:'2025-04-01',validity:'2027-03-31',status:'Active'},
 {id:'CP-TAM-PIO',code:'TAM-PIO',name:'TAM-PIO Karawang',customer:'PT Toyota-Astra Motor',ptype:'Milkrun',bizline:'MODA Logistics',sl:'Regular',svclevel:'Regular',manpower:{driver:1,addDriver:0,helper:1},pool:'Pool Cibitung',
  hours:{wd:['06:00','18:00'],fri:null,we:['07:00','15:00']},hoursLoc:'TAM PIO Karawang',area:'Jabodetabek',start:'2025-02-01',validity:'2027-01-31',status:'Active'}
];
/* Locations used by the Milkrun fixtures: pool, the two customer plants, Milkrun suppliers. handling min = fixed + buffer */
const LOC=[
 ['Pool Cibitung','Pool','Kab. Bekasi, Jawa Barat',-6.2600,107.0860,0,0],
 ['ADM Sunter Plant','Drop Off','Kota Jakarta Utara, DKI Jakarta',-6.1440,106.8790,30,15],
 ['TAM PIO Karawang','Drop Off','Kab. Karawang, Jawa Barat',-6.3510,107.3210,30,10]
];
const SUPPLIERS=['PT Akashi Wahana Indonesia','PT Yutaka Manufacturing Indonesia','PT Gemala Kempa','PT Inti Ganda Perdana','PT Aisin Indonesia','PT Denso Indonesia','PT Kayaba Indonesia','PT FCC Indonesia','PT Showa Indonesia','PT GS Battery','PT Astra Otoparts Nusametal','PT Musashi Auto Parts','PT Mitsuba Indonesia','PT Sugity Creatives','PT Toyota Boshoku Indonesia','PT Fuji Technica Indonesia','PT Indonesia Stanley Electric','PT Dharma Polimetal','PT Suzuki Indomobil Parts','PT Hi-Lex Indonesia','PT Tokai Rubber Indonesia','PT Asahimas Flat Glass','PT Bridgestone Tire Indonesia','PT Selamat Sempurna'];
const SUPCITY=['Kab. Bekasi, Jawa Barat','Kab. Karawang, Jawa Barat','Kab. Bogor, Jawa Barat','Kota Jakarta Timur, DKI Jakarta'];

/* Toll gates and Toll Tariff (owner Planner). Gol I base; II,III = 1.5x ; IV,V = 2x */
const GATES=['Cikarang Utama','Cikarang Barat','Cibitung','Bekasi Timur','Bekasi Barat','Karawang Barat','Karawang Timur','Cikampek','Kalihurip Utama','Kalikangkung','Cikunir','Pondok Gede Timur','Cakung','Rorotan','Tanjung Priok','Sunter','Cawang','Cileungsi','Gunung Putri','Jatiasih','Pasteur','Cileunyi','Padalarang','Semarang Banyumanik'];
const PAIRS=[ /* entry, exit, gol I tariff, effective */
 ['Cikarang Utama','Karawang Barat',41500,'2026-10-01'],['Karawang Barat','Cikampek',83000,'2026-10-01'],
 ['Cibitung','Sunter',36000,'2026-10-01'],['Cikunir','Tanjung Priok',21000,'2026-10-01'],
 ['Bekasi Timur','Cawang',14500,'2026-10-01'],['Cikarang Barat','Pasteur',115000,'2026-10-01'],
 ['Cileungsi','Jatiasih',13000,'2026-10-01'],['Cikampek','Kalikangkung',412000,'2026-10-01']];
function tariffs(){const rows=[];let n=1;const f=[1,1.5,1.5,2,2],G=['Gol I','Gol II','Gol III','Gol IV','Gol V'];
 PAIRS.forEach(p=>G.forEach((g,i)=>{rows.push({id:'TT-'+String(n++).padStart(3,'0'),entry:p[0],exit:p[1],gol:g,tariff:i===0?p[2]:Math.floor(p[2]*f[i]/1000)*1000,eff:p[3]});}));
 /* older version of one pair proves "latest effective <= date wins" */
 rows.push({id:'TT-'+String(n++).padStart(3,'0'),entry:'Cikarang Utama',exit:'Karawang Barat',gol:'Gol II',tariff:58500,eff:'2025-10-01'});
 /* future-dated row proves "effective date <= trip date" */
 rows.push({id:'TT-'+String(n++).padStart(3,'0'),entry:'Cibitung',exit:'Sunter',gol:'Gol II',tariff:58000,eff:'2026-10-20'});
 /* Gol II for Cikunir -> Tanjung Priok intentionally removed: "Tariff unavailable" */
 return rows.filter(r=>!(r.entry==='Cikunir'&&r.gol==='Gol II'));}
/* Karawang Timur -> Cikampek and Cakung -> Rorotan have no rows at all (Tariff unavailable) */

/* ---------- Milkrun fixture fleet / drivers (src:'plan'): ADM-SAP, TAM-PIO and a replacement pool ---------- */
function fleet(){
 const out=[];const pl=plates(130,7);let k=0;
 const add=(n,chassis,body,ton,m3,group)=>{for(let i=0;i<n;i++){const p=pl[k++];out.push({plate:p,chassis,body,karoseri:body,ton,m3,shipvol:null,notes:'',own:'own',ownership:'Internal',vendor:'',group,status:'Active',opStatus:'Available',stnkExp:'2027-0'+(1+k%9)+'-15',kirExp:'2027-0'+(1+(k*3)%9)+'-20',brand:chassis==='Fuso'?'Mitsubishi Fuso':'Hino',branch:['Cikarang','Pondok Ungu','IPPI Karawang','IKP Karawang'][k%4],src:'plan'});}};
 add(28,'CDD','Box',8,22,'ADM-SAP');add(12,'Fuso','Box',12,32,'ADM-SAP');
 add(10,'CDE','Box',4,12,'TAM-PIO');add(4,'CDD','Box',8,22,'TAM-PIO');
 add(10,'CDD','Box',8,22,'POOL');add(14,'CDD','Box',8,22,'POOL');add(4,'Fuso','Box',12,32,'POOL');add(3,'CDE','Box',4,12,'POOL');add(2,'Tronton','Wingbox',20,42,'POOL');add(2,'Blindvan','Reguler',1,4,'POOL');
 /* Vehicle Business Line: most units run under MODA Logistics; every 4th pool unit is MODA Rent */
 out.forEach((v,i)=>{v.bizline=(v.group==='POOL'&&i%4===0)?'MODA Rent':'MODA Logistics';});
 out[66].kirExp='2026-10-19';           /* KIR expiring in 5 days: At Risk */
 out[70].opStatus='Maintenance';         /* pool unit in maintenance */
 out[71].stnkExp='2026-10-10';           /* STNK expired: Not Ready, no exception */
 return out;}
function drivers(taken0){
 const taken=new Set(['Rina Kusumawati','Hendra Wijaya','Bambang Suryadi','Yusuf Hidayat','Dewi Anggraini','Sri Wahyuni','Teguh Prakoso','Andri Saputra'].concat(Array.from(taken0||[])));
 const fixed=['Slamet Riyadi','Agus Pratama','Budi Santoso','Wahyu Hidayat','Fajar Nugroho','Teguh Wibowo','Joko Susilo','Eko Prasetyo','Ahmad Fauzy','Dedi Kurniadi'];
 fixed.forEach(n=>taken.add(n));
 const nm=fixed.concat(names(128,11,taken));const out=[];
 nm.forEach((n,i)=>{const grp=i<64?'ADM-SAP':i<82?'TAM-PIO':'POOL';
  out.push({id:'DRV-'+String(1001+i),name:n,phone:'+62 81'+(2+i%7)+'-'+String(1000+i*37%9000).padStart(4,'0')+'-'+String(2000+i*53%8000).padStart(4,'0'),sim:i%5===0?'SIM B2 General':'SIM B1 General',licenses:[i%5===0?'SIM B2 General':'SIM B1 General'],certs:[],notes:'',ownership:'In House',own:'own',vendor:'',simExp:'2028-0'+(1+i%9)+'-01',group:grp,role:i%9===8?'Helper':'Driver',status:'Active',src:'plan'});});
 out[3].simExp='2026-10-05';  /* expired SIM (non-overridable) for demo */
 return out;}

/* ---------- Customer Project Customer-level helpers ---------- */
const act=r=>{const t=r&&r.status&&(r.status.t||r.status);return !t||t==='Active';};
const stT=r=>(r&&r.status&&(r.status.t||r.status))||'Active';
const num=v=>(v===''||v==null||isNaN(+v))?null:+v;
/* Warehouse Operating Hours of the Customer -> {wd,fri,we}; null = no hours for that day group (Friday null = same as weekdays) */
function hoursOf(c){if(!c)return null;const g=(a,b)=>c[a]&&c[b]?[c[a],c[b]]:null;const wd=g('whWdOpen','whWdClose');if(!wd&&!g('whFriOpen','whFriClose')&&!g('whWeOpen','whWeClose'))return null;return {wd,fri:g('whFriOpen','whFriClose'),we:g('whWeOpen','whWeClose')};}
const listOf=s=>String(s==null?'':s).split(',').map(x=>x.trim()).filter(Boolean);
const certNames=s=>listOf(String(s||'').replace(/\([^)]*\)/g,'')).filter(Boolean);
/* Manpower from the Customer Project record: [{role,qty}] (MD form) */
function mpOf(r){const m=r.manpower;if(Array.isArray(m))return m.map(x=>({role:x.role||x.label||x.roleId||'',qty:x.qty!=null?x.qty:x.quantity}));return null;}

/* ---------- live read ---------- */
function ls(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null;}catch(e){return null;}}
function mdRows(k){const live=ls('moda_md_'+k);return Array.isArray(live)?{rows:live,live:true}:{rows:(SNAP.rows&&SNAP.rows[k])||[],live:false};}
let CACHE=null;
function build(){
 const src={};
 /* ---- Customer ---- */
 const cust=mdRows('customer');src.customer=cust.live;
 const custMd=cust.rows.filter(r=>r.nama).map(r=>({id:'C-'+h36(r.nama),name:r.nama,short:r.nama.replace(/^PT\.? /,''),city:r.kota||'',pic:r.pic||'',telp:r.telp||'',hours:hoursOf(r),claimtnc:r.claimtnc||(DEMO?DEMO.customer(r.nama).claimtnc:''),billingproc:r.billingproc||(DEMO?DEMO.customer(r.nama).billingproc:''),slas:Array.isArray(r.slas)&&r.slas.length?r.slas:(DEMO?DEMO.customer(r.nama).slas:[]),notes:r.notes||'',validity:r.validity||null,status:stT(r),src:'md'}));
 const customers=custMd.concat(CUSTOMERS);
 const custByName={};customers.forEach(c=>{custByName[c.name]=c;});
 /* ---- Customer Project ---- */
 const cr=mdRows('custrate');src.custrate=cr.live;const usedCode={};
 const projMd=cr.rows.filter(r=>r.project).map(r=>{const c=custByName[r.customer];const dp=DEMO?DEMO.project(r):{};let code=r.refno||r.project;if(usedCode[code])code=code+' ('+(c?c.short:r.customer)+')';usedCode[code]=1;
  const rates=(r.rates||[]).map(x=>({origin:x.origin,dest:x.dest,kategori:x.kategori,karoseri:x.karoseri,tonase:num(x.tonase),kubikasi:num(x.kubikasi),harga:+x.harga||0,lead:+x.lead||0,basis:x.basis||'per_trip'}));
  const dests=rates.map(x=>x.dest).join(' ');const area=/Sumatera|Aceh|Lampung|Riau|Jambi|Bengkulu|Bali|Kalimantan|Sulawesi|Papua|Maluku|Nusa Tenggara/.test(dests)?'Outside Java':'Jawa';
  return {id:'CP-'+h36((r.customer||'')+'|'+(r.refno||r.project)),code,name:r.project,refno:r.refno||'',customer:r.customer||'',ptype:r.ptype||'',bizline:r.bizline||'',svclevel:r.svclevel||dp.svclevel||'',sl:r.svclevel||dp.svclevel||'Regular',commodity:(Array.isArray(r.commodity)?r.commodity:listOf(r.commodity)).length?(Array.isArray(r.commodity)?r.commodity:listOf(r.commodity)):(dp.commodity||[]),
   manpower:(mpOf(r)&&mpOf(r).length)?mpOf(r):(dp.manpower||mpOf(r)),start:r.date||null,validity:r.validity||null,status:stT(r),rates,fixcost:num(r.fixcost),volcost:r.volcost||null,pricebasis:r.pricebasis||'',claimtnc:r.claimtnc||'',billingproc:r.billingproc||'',notes:r.notes||'',charges:(Array.isArray(r.charges)?r.charges:[]).map(c=>({type:c.ctype||c.type||'',amount:+c.amount||0,basis:c.basis||'',remarks:c.remarks||''})).filter(c=>c.type),
   hours:c?c.hours:null,hoursLoc:'',area,pool:null,src:'md'};});
 /* MODA Rent is unit rental only (no delivery): its customer projects are not part of Planning or Orders */
 const projects=projMd.filter(p=>p.bizline!=='MODA Rent').concat(PROJECTS.map(p=>Object.assign({src:'plan',rates:[],commodity:[]},p)));
 /* ---- Location ---- */
 const loc=mdRows('location');src.location=loc.live;
 const locMd=loc.rows.filter(r=>r.nama).map(r=>({name:r.nama,type:r.tipe||'',zona:r.zona||'',city:((r.kota||'')+(r.provinsi?', '+r.provinsi:'')),cityKey:cityKey((r.kota||'')+', '+(r.provinsi||'')),address:r.alamat||'',lat:+r.alamatLat,lng:+r.alamatLng,fixht:+r.fixht||0,buffer:+r.heijunka||0,addht:+r.addht||0,addunit:r.addunit||'',pic:r.pic||'',telp:r.telp||'',notes:r.catatan||'',customers:String(r.customers||'').split(/,\s*(?=PT\.?\s|CV\s|UD\s)/).map(s=>s.trim()).filter(Boolean),status:stT(r),src:'md'}));
 const locations=LOC.map(l=>({name:l[0],type:l[1],city:l[2],lat:l[3],lng:l[4],fixht:l[5],buffer:l[6],addht:0,customers:[],src:'plan',status:'Active'}));
 SUPPLIERS.forEach((s,i)=>locations.push({name:s,type:'Pick Up',city:SUPCITY[i%4],lat:-6.25-((i*37)%40)/200,lng:106.95+((i*53)%60)/150,fixht:10,buffer:5,addht:0,customers:[],src:'plan',status:'Active'}));
 locMd.forEach(l=>{if(!locations.find(x=>x.name===l.name))locations.push(l);});
 /* Location Code + Owner Type (CR-B): used by Milkrun Reference composition and Part Supplier Code */
 const LOCCODE={'Pool Cibitung':'PL-CBT','ADM Sunter Plant':'ADM-SNT','TAM PIO Karawang':'TAM-K'};const usedLC={};
 locations.forEach(l=>{const si=SUPPLIERS.indexOf(l.name);const base=LOCCODE[l.name]||(si>=0?'S'+String(si+1).padStart(3,'0'):l.name.split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,5));let c=base,k=1;while(usedLC[c])c=base+(++k);usedLC[c]=1;l.code=c;l.owner=l.type==='Pool'?'Internal':si>=0?'Supplier':'Customer';});
 const poolMd=locMd.find(l=>l.type==='Pool'&&l.status==='Active');
 projects.forEach(p=>{if(p.src==='md')p.pool=poolMd?poolMd.name:'Pool Cibitung';});
 /* ---- Vehicle / Driver ---- */
 const veh=mdRows('vehicle'),drv=mdRows('driver');src.vehicle=veh.live;src.driver=drv.live;
 const vehMd=veh.rows.filter(r=>r.plat).map(r=>{const internal=r.kepemilikan==='Internal';return {plate:r.plat,chassis:r.kategori,body:karGroup(r.karoseri),karoseri:r.karoseri||'',ton:+r.kapasitas||0,m3:+r.kubikasi||0,shipvol:num(r.shipvol),notes:r.notes||'',own:internal?'own':'vendor',ownership:r.kepemilikan||'',vendor:r.vendor&&r.vendor!=='—'?r.vendor:'',group:internal?'POOL':'',status:stT(r),opStatus:'Available',stnkExp:r.stnkexp||'2027-06-30',kirExp:r.kirexp||'2027-06-30',brand:r.merk||'',branch:r.maintloc&&r.maintloc!=='—'?r.maintloc:'',bizline:r.bizline||'',src:'md'};});
 const drvMd=[];const dseen={};drv.rows.filter(r=>r.nama).forEach(r=>{let id='DRV-'+h36(r.nama+'|'+(r.telp||'')+'|'+(r.vendor||''));while(dseen[id])id+='x';dseen[id]=1;const inh=r.kepemilikan==='In House';
  drvMd.push({id,name:r.nama,phone:r.telp||'',sim:r.sim||'',licenses:listOf(r.sim),certs:certNames(r.certif),certifRaw:r.certif||'',notes:r.notes||'',ownership:r.kepemilikan||'',own:inh?'own':'vendor',vendor:r.vendor&&r.vendor!=='—'?r.vendor:'',simExp:'2028-01-01',group:inh?'POOL':'VENDOR',role:'Driver',status:stT(r),tier:r.tier||'',src:'md'});});
 if(DEMO){const dn=new Set(drvMd.map(d=>d.name));DEMO.drivers.filter(r=>!dn.has(r.nama)).forEach(r=>{let id='DRV-'+h36(r.nama+'|'+r.telp+'|'+(r.vendor||''));while(dseen[id])id+='x';dseen[id]=1;const inh=r.kepemilikan==='In House';
  drvMd.push({id,name:r.nama,phone:r.telp,sim:r.sim,licenses:listOf(r.sim),certs:certNames(r.certif),certifRaw:r.certif||'',notes:r.notes||'',ownership:r.kepemilikan,own:inh?'own':'vendor',vendor:inh?'':r.vendor,simExp:'2028-01-01',group:inh?'POOL':'VENDOR',role:'Driver',status:'Active',tier:r.tier||'',src:'md',demo:true});});}
 if(DEMO){const have=new Set(vehMd.map(v=>v.plate));DEMO.vehicles.filter(r=>!have.has(r.plat)).forEach(r=>{const internal=r.kepemilikan==='Internal';vehMd.push({plate:r.plat,chassis:r.kategori,body:karGroup(r.karoseri),karoseri:r.karoseri,ton:+r.kapasitas||0,m3:+r.kubikasi||0,shipvol:null,notes:r.notes||'',own:internal?'own':'vendor',ownership:r.kepemilikan,vendor:internal?'':r.vendor,group:internal?'POOL':'',status:'Active',opStatus:'Available',stnkExp:'2027-06-30',kirExp:'2027-06-30',brand:r.merk||'',branch:'',bizline:r.bizline||'',src:'md',demo:true});});}
 const mdPl=new Set(vehMd.map(v=>v.plate));
 const vehiclesU=fleet().filter(v=>!mdPl.has(v.plate)).concat(vehMd);
 const drivers_=drivers(drvMd.map(d=>d.name)).concat(drvMd);
 /* ---- Vendor, rates, priority, costs ---- */
 const vend=mdRows('vendor');src.vendor=vend.live;
 const vendors=vend.rows.filter(r=>r.nama).map(r=>({name:r.nama,type:r.type,status:stT(r)}));
 const pr=mdRows('priority');src.priority=pr.live;
 const vr=mdRows('vendrate');src.vendrate=vr.live;
 const vendorRates=[];vr.rows.filter(act).forEach(d=>(d.rates||[]).forEach(x=>vendorRates.push({vendor:d.vendor,dealing:d.dealing,ptype:d.ptype,origin:x.origin,dest:x.dest,kategori:x.kategori,karoseri:x.karoseri,harga:+x.harga,lead:+x.lead||0,validity:d.validity})));
 const tc={};['tc_bbm','tc_mel','tc_parkir','tc_makan'].forEach(k=>{const m=mdRows(k);src[k]=m.live;tc[k]=m.rows.filter(act);});
 const inc=mdRows('incentive');src.incentive=inc.live;
 const p2h=mdRows('p2h');src.p2h=p2h.live;
 /* P2H items for the Field Ops check: P2H OUT checklist(s); severity Critical when mandatory flag set */
 const items=[];p2h.rows.filter(act).filter(r=>r.tipe==='P2H OUT'||r.tipe==='P2H IN').forEach(r=>(r.checklist||[]).forEach(s=>(s.items||[]).forEach(it=>{if(!items.find(x=>x.n===it.n))items.push({n:it.n,sev:it.w?'Critical':'Minor',section:s.name});})));
 if(!items.find(x=>x.n==='Brake pedal travel'))items.unshift({n:'Brake pedal travel',sev:'Critical',section:'Brake & Steering'});
 let fuel=ls('moda_md_fuelprice');fuel=(fuel&&fuel.prices)||{Solar:6800,Bensin:10000};
 /* Customer Rate list for dealing: rates of Active Customer Projects (own rows, never invented) */
 const custRates=[];projects.filter(p=>p.src==='md'&&p.status==='Active').forEach(p=>p.rates.forEach(x=>custRates.push({project:p.name,projectId:p.id,origin:x.origin,dest:x.dest,kategori:x.kategori,karoseri:x.karoseri,tonase:x.tonase,kubikasi:x.kubikasi,harga:x.harga,lead:x.lead,basis:x.basis,charges:'',src:'md'})));
 const dd={projects:projects.filter(p=>p.src==='md'),vehicles:vehiclesU.filter(v=>v.src==='md'),drivers:drivers_.filter(d=>d.src==='md'),locations:locations.filter(l=>l.src==='md'),customers:custMd};
 CACHE={customers,projects,custRates,vehicles:vehiclesU,drivers:drivers_,locations,vendors,priority:pr.rows,vendorRates,tc,incentive:inc.rows.filter(act),p2hItems:items.slice(0,24),fuel,gates:GATES.slice(),tollTariffSeed:tariffs(),src,suppliers:SUPPLIERS.slice(),dd,O:SNAP.O||{},snapshotAt:SNAP.generatedAt||null,mdPool:poolMd?poolMd.name:'Pool Cibitung'};
 return CACHE;}
function get(){return CACHE||build();}
function refresh(){CACHE=null;return get();}
window.addEventListener('storage',e=>{if(e.key&&(e.key.indexOf('moda_md_')===0||e.key==='modaCfgOverrides')){CACHE=null;window.dispatchEvent(new CustomEvent('md-change'));}});
const MDPATH='../../Master Data/Combined with P2H, Cost, Location/';
/* ---------- Rate List of a Customer Project (PM decision 2026-10-19) ----------
   = rates of the Customer Project + rates of the OTHER projects of the same customer, de-duplicated on
   origin + destination + Category + Karoseri (the project's own row wins). Each row says where it comes from. */
function rateList(pr){if(!pr)return {fixcost:null,volcost:null,rows:[]};const seen=new Set();const rows=[];const k=x=>[cityKey(x.origin),cityKey(x.dest),String(x.kategori).toLowerCase(),karGroup(x.karoseri).toLowerCase()].join('|');
 const add=(x,level)=>{const key=k(x);if(seen.has(key))return;seen.add(key);rows.push(Object.assign({},x,{level}));};
 (pr.rates||[]).forEach(x=>add(x,'Customer Project'));
 get().projects.filter(p=>p.src==='md'&&p.customer===pr.customer&&p.id!==pr.id&&p.status==='Active').forEach(p=>(p.rates||[]).forEach(x=>add(x,'Customer')));
 return {fixcost:pr.fixcost,volcost:pr.volcost,rows};}
/* crew {driver,addDriver,helper,krani} for cost / incentive calculations from either manpower shape */
function crew(pr){const m=pr&&pr.manpower;if(!m)return {driver:1,addDriver:0,helper:0};
 if(Array.isArray(m)){const q=name=>(m.find(x=>String(x.role).toLowerCase()===name)||{}).qty;return {driver:+q('driver')||1,addDriver:+q('additional driver')||0,helper:+q('helper')||0,krani:+q('krani')||0};}
 return {driver:m.driver!=null?m.driver:1,addDriver:m.addDriver||0,helper:m.helper||0,krani:m.krani||0};}
/* ---------- Customer Project manpower: prototype role adapter ----------
   Project Planning renders a repeatable role/quantity list, not four fixed fields. The source of truth is
   the Customer Project manpower collection ([{role,qty}]); Planning never edits it. Legacy fixed keys of the Milkrun fixtures are
   mapped only here. A missing role is "Not supplied", never 0; a supplied 0 stays 0. */
const MP_ROLES=[['driver','Driver'],['addDriver','Additional Driver'],['helper','Helper'],['krani','Krani']];
const MP_LABEL={};MP_ROLES.forEach(r=>MP_LABEL[r[0]]=r[1]);
const MP_BYLABEL={};MP_ROLES.forEach(r=>MP_BYLABEL[r[1].toLowerCase()]=r[0]);
function manpower(pr){
 const out={source:'Customer Project',state:'empty',roles:[],issues:[]};
 if(!pr)return Object.assign(out,{state:'unavailable',issues:['Customer Project not found']});
 const mp=pr.manpower;
 if(mp==null)return out;
 const add=(id,label,qty,unit,known)=>{out.roles.push({roleId:id,label:label||id,qty:qty==null||qty===''?null:Number(qty),unit:unit||null,known:known!==false,source:'Customer Project'});
  if(known===false)out.issues.push('Unknown configured role "'+(label||id)+'" ('+id+') - Configuration mapping needs review');};
 if(Array.isArray(mp))mp.forEach((r,i)=>{const lbl=r.role||r.label||r.roleId||r.id||('role-'+(i+1));const id=MP_BYLABEL[String(lbl).toLowerCase()]||String(r.roleId||r.id||lbl);add(id,MP_LABEL[id]||lbl,r.qty!=null?r.qty:r.quantity,r.unit,!!MP_LABEL[id]);});
 else MP_ROLES.forEach(([k,label])=>{if(Object.prototype.hasOwnProperty.call(mp,k))add(k,label,mp[k],null,true);});
 if(!Array.isArray(mp))Object.keys(mp).forEach(k=>{if(!MP_LABEL[k])add(k,k,mp[k],null,false);});
 out.state=out.roles.length?'populated':'empty';
 return out;}
const locByName=n=>{const L=get().locations.find(l=>l.name===n);return L||geoPlace(n)||null;};
window.MD={get,refresh,rng,MDPATH,manpower,rateList,crew,karGroup,karMatch,typeKeyOf,KAR_GROUPS,cityKey,sameCity,cityShort,hoursOf,
 project:id=>get().projects.find(p=>p.id===id||p.code===id||p.name===id),
 vehicle:pl=>get().vehicles.find(v=>v.plate===pl),
 driver:id=>get().drivers.find(d=>d.id===id||d.name===id),
 customer:n=>get().customers.find(c=>c.name===n||c.id===n),
 location:locByName,
 /* locations registered to a customer in Master Data Location (the "Customers" field), optionally of one type */
 customerLocations:(name,type)=>get().locations.filter(l=>l.src==='md'&&l.status==='Active'&&(l.customers||[]).indexOf(name)>=0&&(!type||l.type===type||(Array.isArray(type)&&type.indexOf(l.type)>=0))),
 /* Active Customer Projects form Project Plans (Master Data status Active only) */
 activeProjects:()=>get().dd.projects.filter(p=>p.status==='Active'),
 pool:()=>get().mdPool,
 locByCode:c=>get().locations.find(l=>String(l.code).toLowerCase()===String(c).trim().toLowerCase()),
 liveCount:()=>Object.values(get().src).filter(Boolean).length};
})();

/* ================= Milkrun Reference data layer (window.REF) - D88 =================
   Part / BOM / Route Group per Customer Project, ONE current state (no versions). Stores: refParts, refBoms, refRoutes, refImports.
   Every row carries Updated by / at and Batch ("Manual" or "Import #n"). Milkrun plans copy a snapshot (plan.refSnap) at creation,
   freeze it at Publish and only update it through "Refresh from Reference". Pure data + validation; rendering lives in pages/milkrun-ref.js. */
(function(){
'use strict';
const lc=s=>String(s==null?'':s).trim().toLowerCase();
const RK={part:{ent:'refParts',label:'Part'},bom:{ent:'refBoms',label:'BOM'},route:{ent:'refRoutes',label:'Route Group'}};
const KEY={part:r=>lc(r.project)+'|'+lc(r.partNo),bom:r=>lc(r.project)+'|'+lc(r.model),route:r=>lc(r.project)+'|'+lc(r.name)};
const NAME={part:r=>r.partNo,bom:r=>r.model,route:r=>r.name};
const clone=x=>JSON.parse(JSON.stringify(x));
const rows=(kind,proj)=>{const a=STORE.get(RK[kind].ent)||[];return proj?a.filter(r=>r.project===proj):a;};
const projects=()=>MD.get().projects.filter(p=>p.ptype==='Milkrun'&&p.src==='plan');
const code=x=>{const p=MD.project(x);return p?p.code:x;};
const variant=c=>c==='TAM-PIO'?'B':'A';
const locs=()=>MD.get().locations;
const active=l=>l&&l.status!=='Inactive';
const supLocs=()=>locs().filter(l=>l.owner==='Supplier'&&l.type==='Pick Up'&&active(l));
const custLocs=()=>locs().filter(l=>l.owner==='Customer'&&l.type==='Drop Off'&&l.src==='plan'&&active(l));
const poolLocs=()=>locs().filter(l=>l.type==='Pool'&&active(l));
const codeOf=n=>{const l=MD.location(n);return l?l.code:n;};
function stamp(rec,batch){rec.updatedBy=STORE.me().n;rec.updatedAt=STORE.now();rec.batch=rec.batch||batch||'Manual';return rec;}
function text(kind,r){if(kind==='part')return r.name+', '+r.capBox+'/box, '+r.boxVol+' m3, '+r.supCode;if(kind==='bom')return (r.lines||[]).map(l=>l.partNo+' x'+l.qty+' '+l.category).join('; ');return comp(r).join(' > ')+', '+r.chassis+' '+r.body+', '+r.cap+' m3';}
function comp(r){const pl=codeOf(r.pool||'Pool Cibitung');return [pl].concat((r.comp||[]).map(codeOf),[pl]);}
/* Display label for a Route Group: user-entered Route Code + Route Name. The generated internal id is never
   presented as a Route Code (Route Code/Name stay prototype-only until the production contract is approved). */
function routeLabel(g){if(!g)return '';return [String(g.routeCode||'').trim(),String(g.name||'').trim()].filter(Boolean).join(' · ');}
function put(kind,rec,o){o=o||{};const a=STORE.get(RK[kind].ent).slice();const k=KEY[kind](o.old||rec);const i=a.findIndex(x=>KEY[kind](x)===k);stamp(rec,o.batch);if(i>=0)a[i]=rec;else a.push(rec);STORE.set(RK[kind].ent,a);
 if(!o.noAudit)STORE.audit({action:(o.old?'Edited ':'Added ')+RK[kind].label+' '+NAME[kind](rec),before:o.old?text(kind,o.old):undefined,after:text(kind,rec),obj:rec.project,type:'Reference'});return rec;}
/* bulk write for import (one store write, no per-row audit) */
function putMany(kind,recs,batch){const a=STORE.get(RK[kind].ent).slice();const idx={};a.forEach((x,i)=>idx[KEY[kind](x)]=i);recs.forEach(rec=>{stamp(rec,batch);const k=KEY[kind](rec);if(idx[k]!=null)a[idx[k]]=rec;else{idx[k]=a.length;a.push(rec);}});STORE.set(RK[kind].ent,a);}
/* Route Group id (R01 / T01 ...): prefix per Project, next free number; engine, matrix sheets and trips key on it */
function routeId(project,extra){const pre=project==='ADM-SAP'?'R':project==='TAM-PIO'?'T':String(project||'R')[0].toUpperCase();const all=rows('route',project).concat(extra||[]);let n=all.reduce((a,g)=>Math.max(a,parseInt(String(g.id||'').replace(/\D/g,''),10)||0),0)+1;return pre+String(n).padStart(2,'0');}
function drop(kind,rec){const k=KEY[kind](rec);STORE.set(RK[kind].ent,STORE.get(RK[kind].ent).filter(x=>KEY[kind](x)!==k));STORE.audit({action:'Deleted '+RK[kind].label+' '+NAME[kind](rec),before:text(kind,rec),obj:rec.project,type:'Reference'});}
function nextImport(){return (STORE.get('refImports')||[]).reduce((a,x)=>Math.max(a,x.n),0)+1;}
/* route geometry: Pool > suppliers > Customer > Pool. Legs keep their km when the same leg existed before, else straight-line x road factor */
function build(rec,old){const pool=rec.pool||'Pool Cibitung';const prev={};
 if(old&&old.stops){let f=old.pool||'Pool Cibitung';old.stops.forEach(s=>{prev[f+'>'+s.loc]=s.km;f=s.loc;});prev[f+'>'+old.cust]=old.custKm;prev[old.cust+'>'+(old.pool||'Pool Cibitung')]=old.returnKm;}
 const km=(a,b)=>prev[a+'>'+b]!=null?prev[a+'>'+b]:DOM.legKm(a,b);const c=rec.comp||[];const sup=c.slice(0,-1),cust=c[c.length-1];let f=pool;
 rec.stops=sup.map(s=>{const o={loc:s,km:km(f,s)};f=s;return o;});rec.cust=cust;rec.custKm=cust?km(f,cust):0;rec.returnKm=cust?km(cust,pool):0;return rec;}
/* ---------- validation: same rules for the form (per field) and import (per row) ---------- */
const isNum=v=>typeof v==='number'&&!isNaN(v);
function nchk(e,f,v,o){o=o||{};if(v==null||v===''){if(!o.opt)e[f]='Required';return;}if(!isNum(v)){e[f]='Must be a number';return;}if(o.gt!=null&&!(v>o.gt))e[f]=(o.label||'Value')+' must be more than '+o.gt;else if(o.min!=null&&v<o.min)e[f]=(o.label||'Value')+' must be '+o.min+' or more';}
function dup(kind,r,o){if(o&&o.orig&&KEY[kind](o.orig)===KEY[kind](r))return false;const k=KEY[kind](r);return rows(kind).concat((o&&o.extra)||[]).some(x=>KEY[kind](x)===k);}
function projErr(e,r){if(!r.project)e.project='Required';else if(!projects().some(p=>p.code===r.project))e.project='Project not found';}
function vPart(r,o){const e={};projErr(e,r);
 if(!String(r.partNo||'').trim())e.partNo='Required';else if(dup('part',r,o))e.partNo='Part Number already exists in this project';
 if(!String(r.name||'').trim())e.name='Required';
 if(!r.supCode)e.supCode='Required';else{const l=MD.locByCode(r.supCode);if(!l||l.type!=='Pick Up'||l.owner!=='Supplier'||!active(l))e.supCode='Supplier Code not found';}
 if(r.pnInduk&&['Yes','No'].indexOf(r.pnInduk)<0)e.pnInduk='Use Yes or No';
 nchk(e,'capBox',r.capBox,{gt:0,label:'Cap/Box'});nchk(e,'boxVol',r.boxVol,{gt:0,label:'Box Vol'});nchk(e,'p',r.p,{gt:0,label:'P'});nchk(e,'l',r.l,{gt:0,label:'L'});nchk(e,'t',r.t,{gt:0,label:'T'});nchk(e,'price',r.price,{opt:1,min:0,label:'Price'});return e;}
function vBom(r,o){const e={};projErr(e,r);
 if(!String(r.model||'').trim())e.model='Required';else if(dup('bom',r,o))e.model='Model Code already exists in this project';
 const parts=(o&&o.parts)||rows('part',r.project);const L=r.lines||[];const seen={};let bad=false;
 e.lines=L.map(l=>{const x={};const pn=String(l.partNo||'').trim();
  if(!pn)x.partNo='Required';else if(!parts.some(p=>lc(p.partNo)===lc(pn)))x.partNo='Part Number not found';else if(seen[lc(pn)])x.partNo='Part already in this BOM';seen[lc(pn)]=1;
  nchk(x,'qty',l.qty,{gt:0,label:'Qty'});if(['PIO','TCO'].indexOf(l.category)<0)x.category='Required';if(Object.keys(x).length)bad=true;return x;});
 if(!L.length){e.linesMin='Add at least 1 Part';bad=true;}if(!bad)delete e.lines;return e;}
function vRoute(r,o){const e={};projErr(e,r);
 if(!String(r.name||'').trim())e.name='Required';else if(dup('route',r,o))e.name='Route Name already exists in this project';
 if(!r.pool||!poolLocs().some(l=>l.name===r.pool))e.pool='Pool not found';
 const c=r.comp||[];
 if(!c.length)e.comp='Select at least 1 Supplier';else{const L=c.map(n=>MD.location(n));const bad=c.filter((n,i)=>!L[i]||!active(L[i]));
  if(bad.length)e.comp='Location invalid or inactive: '+bad.join(', ');
  else{const cust=L[L.length-1];const mid=L.slice(0,-1);
   if(!cust||cust.owner!=='Customer')e.comp='Customer must be the last stop before Pool';
   else if(!mid.length)e.comp='Select at least 1 Supplier before the Customer';
   else if(mid.some(l=>l.owner!=='Supplier'))e.comp='Only Supplier locations are allowed before the Customer';
   else if(variant(r.project)==='B'){const others=rows('route',r.project).concat((o&&o.extra)||[]).filter(x=>!(o&&o.orig&&KEY.route(o.orig)===KEY.route(x))&&KEY.route(x)!==KEY.route(r));
    for(const l of mid){const x=others.find(g=>(g.comp||[]).indexOf(l.name)>=0);if(x){e.comp='Supplier '+l.code+' is already in Route Group '+x.name;break;}}}}}
 if(UI.CATS.indexOf(r.chassis)<0)e.chassis='Required';if(UI.KAROS.indexOf(r.body)<0)e.body='Required';
 nchk(e,'cap',r.cap,{gt:0,label:'Capacity'});nchk(e,'liqVol',r.liqVol,{gt:0,label:'Liq Vol/FB'});
 if(!e.liqVol&&!e.cap&&isNum(r.liqVol)&&isNum(r.cap)&&r.liqVol>r.cap)e.liqVol='Liq Vol/FB must not exceed Capacity';
 /* Shipping Volume: prototype-bounded field. Numeric shape only - no relationship to Liq Vol, Capacity,
    Volume Matrix or Vehicle Shipping Volume is applied because the production contract is pending. */
 nchk(e,'shipVol',r.shippingVol,{opt:1,min:0,label:'Shipping Volume'});
 nchk(e,'heijunka',r.heijunka,{opt:1,min:0,label:'Heijunka'});return e;}
const VAL={part:vPart,bom:vBom,route:vRoute};
const hasErr=e=>Object.keys(e).some(k=>k!=='lines'||(e.lines||[]).some(x=>Object.keys(x).length));
/* ---------- delete protection (FR-9) ---------- */
function used(kind,rec){const out=[];
 if(kind==='part')rows('bom',rec.project).forEach(b=>{if((b.lines||[]).some(l=>lc(l.partNo)===lc(rec.partNo)))out.push('Used by BOM '+b.model);});
 else STORE.get('milkrunPlans').filter(p=>p.project===rec.project&&['Draft','Scheduled','Published'].indexOf(p.status)>=0).forEach(p=>{const s=p.refSnap||{};
  const hit=kind==='bom'?(s.boms||[]).some(b=>lc(b.model)===lc(rec.model))||(p.orders||[]).some(o=>lc(o.model)===lc(rec.model)):(s.routeGroups||[]).some(g=>lc(g.name)===lc(rec.name));if(hit)out.push('Used by active Milkrun Plan '+p.id+' ('+p.status+')');});
 return out;}
/* ---------- view / snapshot ---------- */
function view(c){c=code(c);const pr=MD.project(c);if(!pr)return null;const bomRecs=rows('bom',c);const boms=[];bomRecs.forEach(b=>(b.lines||[]).forEach(l=>boms.push({model:b.model,partNo:l.partNo,qty:l.qty,category:l.category})));
 return {project:c,projectId:pr.id,parts:clone(rows('part',c)),boms,routeGroups:clone(rows('route',c)),models:[...new Set(bomRecs.map(b=>b.model))]};}
function hash(v){const s=JSON.stringify([v.parts.map(p=>[p.partNo,p.name,p.supCode,p.capBox,p.boxVol,p.pnInduk,p.price,p.p,p.l,p.t]).sort(),v.boms.map(b=>[b.model,b.partNo,b.qty,b.category]).sort(),v.routeGroups.map(g=>[g.routeCode,g.name,g.pool,g.comp,g.chassis,g.body,g.cap,g.liqVol,g.shippingVol,g.heijunka,g.stagger,(g.stops||[]).map(x=>x.km),g.custKm,g.returnKm]).sort()]);let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return String(h);}
function snapshot(c,o){const v=view(c);if(!v)return null;o=o||{};v.at=o.at||STORE.now();v.by=o.by||STORE.me().n;v.frozen=false;v.hash=hash(v);return v;}
function changed(plan){if(!plan||!plan.refSnap)return false;const v=view(plan.project||plan.projectId);return !!v&&hash(v)!==plan.refSnap.hash;}
/* ---------- Reference Check (FR-8) ---------- */
function check(c){const v=view(c);const out=[];if(!v)return out;
 v.parts.forEach(p=>{const l=MD.locByCode(p.supCode);if(!l||l.type!=='Pick Up'||!active(l))out.push({kind:'part',item:p.partNo,msg:'Supplier Code '+p.supCode+' is not a valid Pick Up location'});});
 rows('bom',c).forEach(b=>(b.lines||[]).forEach(l=>{if(!v.parts.some(p=>lc(p.partNo)===lc(l.partNo)))out.push({kind:'bom',item:b.model,msg:'Part '+l.partNo+' is missing from Part'});}));
 const seen={};v.routeGroups.forEach(g=>{const c2=g.comp||[];if(!c2.length||c2.slice(0,-1).length<1)out.push({kind:'route',item:g.name,msg:'No Supplier in composition'});
  c2.forEach(n=>{const l=MD.location(n);if(!l||!active(l))out.push({kind:'route',item:g.name,msg:'Location '+n+' is invalid or inactive'});});
  if(variant(c)==='B')c2.slice(0,-1).forEach(n=>{if(seen[n]&&seen[n]!==g.name)out.push({kind:'route',item:g.name,msg:codeOf(n)+' is also in '+seen[n]});seen[n]=seen[n]||g.name;});});
 return out;}
window.REF={RK,KEY,NAME,rows,projects,code,variant,supLocs,custLocs,poolLocs,codeOf,comp,routeLabel,stamp,put,putMany,routeId,drop,text,nextImport,build,validate:(k,r,o)=>VAL[k](r,o),hasErr,used,view,hash,snapshot,changed,check,clone,lc,isNum};
})();
