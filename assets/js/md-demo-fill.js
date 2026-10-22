/* PLACEHOLDER DEMO DATA - not Master Data.
   The Master Data seed rows leave some fields empty although the Master Data forms have them (Customer Project: manpower, commodity, Service Level;
   Customer: Claim T&C, Procedure Billing, Delivery Note SLA per region) and it has too few Vehicles / Drivers for a demo list of 10 rows.
   md.js uses this overlay ONLY where Master Data (live localStorage `moda_md_*` or md-snapshot.js) has no value: a real Master Data value always wins.
   Extra vehicles / drivers are appended with demo:true, unique plates / names, and never replace a Master Data row. Delete this file (and its script tags) to remove it. */
(function(){
'use strict';
const CUST_COMMODITY=[[/Coca-Cola|Sosro|Dairy|Pangan|Snack|Unggas/i,['Food & Beverage']],[/Tractors/i,['Heavy Equipment Parts']],[/Herbal|Medika/i,['Pharmaceutical','Herbal']],[/Semen/i,['Building Material']],[/Pakan|Agro/i,['Animal Feed','Agro Products']],[/Retail/i,['Consumer Goods']],[/Prima Cipta|Multi Industri|Cemerlang|Lokon/i,['General Cargo']]];
const commodity=c=>{const m=CUST_COMMODITY.find(x=>x[0].test(c||''));return m?m[1].slice():['General Cargo'];};
const hash=s=>{let h=5381;s=String(s);for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h;};
function customer(name){return {claimtnc:'Klaim kerusakan atau kehilangan diajukan maksimal 7 hari setelah barang diterima, dilampiri berita acara dan foto',billingproc:'Invoice dikirim paling lambat tanggal 5 bulan berikutnya dengan POD asli dan rekap trip',slas:[{region:'Jabodetabek',sla:'1 day'},{region:'Jawa',sla:'3 days'},{region:'Luar Jawa',sla:'7 days'}]};}
/* project: {manpower:[{role,qty}], commodity:[...], svclevel} from the rates of the Customer Project */
function project(r){const big=(r.rates||[]).some(x=>/Tronton|Trailer/i.test(x.kategori||''));const mp=[{role:'Driver',qty:1},{role:'Helper',qty:1}];if(big)mp.push({role:'Additional Driver',qty:1});
 return {manpower:mp,commodity:commodity(r.customer),svclevel:hash(r.refno||r.project)%4===0?'Express':'Regular'};}
/* ---- extra vehicles (25): Category / Karoseri / tonase / volume match the Rate Lists of Master Data ---- */
const V=[['Tronton','Hydraulic Wing Box','20','42','Hino','FM 260 JD','30T',[1,1,1,0,0,0,0]],['CDD','Hydraulic Wing Box','8','22','Mitsubishi','Canter FE 74','5T',[1,1,1,0,0,0]],['Fuso','Hydraulic Wing Box','15','32','Mitsubishi','Fuso FN 62','10T',[1,0,0,0]],['Trailer','Flat Deck','24','60','Hino','SS 1K','40T',[1,0,0]],['CDE','Box Besi','4','12','Isuzu','Elf NMR 71','3T',[1,1,0,0,0]]];
const VENDORS=['PT Sinar Jaya Logistik','PT Cahaya Transport','PT Trans Nusantara Jaya','PT Armada Prima Logistik','PT Lintas Jawa Ekspres','PT Garda Logistik Indonesia','PT Cepat Tanggap Cargo'];
const BIZ=['MODA Logistics','MODA Logistics','MODA Logistics','MODA Rent','MODA Hub'];
const LET='ABCDEFGHJKLMNPRSTUVWXYZ';
function vehicles(){const out=[];let k=0;V.forEach(v=>v[7].forEach(own=>{k++;const lt=LET[(k*7)%LET.length]+LET[(k*5+3)%LET.length]+LET[(k*3+1)%LET.length];const pre=own?'B':['D','L','AD','F','E'][k%5];
 out.push({plat:pre+' '+(7100+k*13)+' '+lt,vin:'MHD'+String(910000+k*37),kepemilikan:own?'Internal':'Transporter',kategori:v[0],karoseri:v[1],merk:v[4],type:v[5].split(' ')[0],model:v[5],vclass:v[6],kapasitas:v[2],kubikasi:v[3],bizline:BIZ[k%BIZ.length],vendor:own?'—':VENDORS[k%VENDORS.length],maintloc:own?'Pondok Ungu':'—',status:{t:'Active',c:'green'},notes:k%4===0?'Unit demo, kondisi baik':'',demo:true});}));return out;}
/* ---- extra drivers (30) ---- */
const NAMES=['Anwar Sanusi','Bagas Prakoso','Candra Wijaya','Darmawan Putra','Edi Suryanto','Farid Maulana','Galih Pratomo','Hasan Basri','Imron Rosadi','Jaka Pamungkas','Kusnadi Hartono','Lukman Hakim','Mulyadi Saputro','Nur Cholis','Oky Firmansyah','Purwanto Adi','Qomar Zaman','Rahmat Hidayat','Sutrisno Wibowo','Tarmizi Lubis','Ujang Sudrajat','Vicky Ramadhan','Wahyudi Santoso','Yoga Pranata','Zainal Arifin','Agung Nugroho','Bayu Setiawan','Cecep Supriadi','Dodi Kurnia','Eko Prabowo'];
const SIMS=['SIM B2 General','SIM B1 General','SIM B2','SIM B1','SIM A'];
const CERTS=['SIO (2027-06-01)','DDT (2027-01-15)','B3 (2027-03-20)','Vaccine (2027-02-10)','SIO (2027-08-09), DDT (2027-04-04)','B3 (2027-05-30), Vaccine (2027-01-01)','DDT (2027-07-07), B3 (2027-09-09)',''];
function drivers(){return NAMES.map((n,i)=>{const inh=i%5<2;return {nama:n,ktpno:'3275'+String(100000000000+i*7919).slice(0,12),telp:'+62 8'+(11+i%9)+'-'+String(2000+i*61).padStart(4,'0')+'-'+String(3000+i*83).padStart(4,'0'),kepemilikan:inh?'In House':'Outsource',vendor:inh?'—':VENDORS[i%VENDORS.length],sim:SIMS[i%SIMS.length],certif:CERTS[(i*3)%CERTS.length],tier:['Regular','Excellence','New'][i%3],status:{t:'Active',c:'green'},notes:i%6===0?'Driver demo':'',demo:true};});}
window.MD_DEMO={customer,project,vehicles:vehicles(),drivers:drivers()};
})();
