/* Generates every sample import file into ../test-data (POST to serve.ps1). Open tests/make-test-data.html while serve.ps1 runs. */
(async function(){
STORE.ensure();
const F={};const csv=a=>a.map(r=>r.map(c=>{c=c==null?'':String(c);return /[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c;}).join(',')).join('\r\n');
const xl=sheets=>{const wb=XLSX.utils.book_new();sheets.forEach(s=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s.aoa),s.name.slice(0,31)));return new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})]);};
/* Bulk Order files (one row per location, rows with the same Order Ref = one order) built from Master Data: a customer with registered locations, its Pool, Pick Up and a second registered location. */
const LCA=MD.get().dd.locations.filter(x=>x.status==='Active');const CUST=[...new Set(MD.activeProjects().filter(p=>p.ptype!=='Milkrun').map(p=>p.customer))].find(c=>LCA.filter(l=>(l.customers||[]).indexOf(c)>=0&&l.type!=='Pool').length>=2);
const PJ=MD.activeProjects().find(p=>p.customer===CUST&&p.ptype!=='Milkrun'&&p.rates.length)||MD.activeProjects().find(p=>p.customer===CUST&&p.ptype!=='Milkrun');const REG=LCA.filter(l=>(l.customers||[]).indexOf(CUST)>=0&&l.type!=='Pool');
const POOL=LCA.find(l=>l.type==='Pool').name;const PU=(REG.find(l=>l.type==='Pick Up')||REG[0]).name;const DO_=(REG.find(l=>l.name!==PU)).name;const R0=PJ.rates[0]||{kategori:'CDD',karoseri:'Wingbox'};const TD=STORE.today();
const OH=['Order Ref','Plan ID','Customer Name','Project Name','Delivery Start Date','Delivery Start Time','Location Type','Location','Address','City','Latitude','Longitude','Est. Arrival Date','Est. Arrival Time','Handling Time (min)','No DO','Qty Unit','Unit Category','Karoseri','Tonase','Volume','Special Handling Note'];
const PLAN=(DOM.allPlans().find(p=>p.project===PJ.code)||{}).id;
/* row builder: head = [date,time,qty,cat,kar,ton,vol,note] only on the first row of an order */
const RW=(ref,head,type,loc,etaD,etaT,h,dos,extra)=>{const H=head||[];return [ref,head?PLAN:'',head?PJ.customer:'',head?PJ.name:'',H[0]||'',H[1]||'',type,loc,'','','','',etaD,etaT,h,dos,H[2]||'',H[3]||'',H[4]||'',H[5]||'',H[6]||'',H[7]||''].concat(extra||[]);};
const v=[OH];for(let i=0;i<20;i++){const date=UI.addDays(TD,2+i%10),time=UI.pad(5+Math.floor(i/10))+':'+UI.pad((i%10)*5);
 v.push(RW('ORD-'+(i+1),[date,time,1,R0.kategori,R0.karoseri,(2+i%6)+'.5',10+i%9,i%3?'':'Fragile'],'Pool',POOL,date,'06:00','',''));
 v.push(RW('ORD-'+(i+1),null,'Pick Up',PU,date,'07:30',30,'DO-'+i+'A, DO-'+i+'B'));v.push(RW('ORD-'+(i+1),null,'Drop Off',DO_,date,'13:00',45,'DO-'+i+'A'));}
F['bulk_order_valid.csv']=csv(v);
const big=[OH];for(let i=0;i<500;i++){const date=UI.addDays(TD,2+Math.floor(i/25)),time=UI.pad(5+Math.floor((i%25)/2))+':'+((i%25)%2?'30':'00');big.push(RW('B'+i,[date,time,1,R0.kategori,R0.karoseri,'3.5',12,''],'Pick Up',PU,date,time,20,''));big.push(RW('B'+i,null,'Drop Off',DO_,date,'15:00',20,'DO-'+i));}
F['bulk_order_1000_rows.csv']=csv(big);
const D1=UI.addDays(TD,3),D2=UI.addDays(TD,4);const o2=(ref,d,t,c,k,loc2)=>[RW(ref,[d,t,1,c,k,'4','9',''],'Pick Up',PU,d,'07:00',20,'DO-1'),RW(ref,null,'Drop Off',loc2,d,'12:00',20,'')];
const mixd=[OH.concat(['Catatan Tambahan'])].concat(o2('M1',D1,'18:00',R0.kategori,R0.karoseri,DO_).map(r=>r.concat(['extra column'])),
 [RW('M2',[D1,'08:00',1,R0.kategori,R0.karoseri,'',''],'Pick Up',PU,'','','',''),RW('M2',null,'Drop Off',DO_,'','','','')].map(r=>r.concat([''])),
 o2('M3',D1,'09:00',R0.kategori,R0.karoseri,'Lokasi Tidak Ada').map(r=>r.concat([''])),o2('M4',D1,'25:99',R0.kategori,R0.karoseri,DO_).map(r=>r.concat([''])),
 [OH.map(()=>'').concat([''])],o2('M5',D2,'09:00','Roket',R0.karoseri,DO_).map(r=>r.concat([''])),
 [RW('M6',[D2,'10:00',0,R0.kategori,R0.karoseri,'4','9',''],'Pick Up',PU,D2,'09:00',20,'').concat([''])],o2('M7','2020-01-01','10:00',R0.kategori,R0.karoseri,DO_).map(r=>r.concat([''])),
 o2('M8',D2,'11:00',R0.kategori,R0.karoseri,DO_).map(r=>r.concat([''])),
 [RW('N1',[D2,'12:00',1,R0.kategori,R0.karoseri,'4','9',''],'Pick Up','Gudang Baru Bekasi',D2,'13:00',20,'DO-N1'),RW('N1',null,'Drop Off',DO_,D2,'17:00',20,'')].map(r=>{r[8]='Jl. Raya Bekasi No. 1';r[9]='Bekasi';r[10]='-6.2349';r[11]='106.9896';return r.concat(['']);})).reduce((a,x)=>a.concat(Array.isArray(x[0])?x:[x]),[]);
F['bulk_order_mixed.csv']=csv(mixd);
F['bulk_order_wrong_headers.csv']=csv([['Project','Tanggal','Jam','Asal','Tujuan','Unit'],[PJ.name,TD,'07:00',PU,DO_,R0.kategori]]);F['bulk_order_empty.csv']=csv([OH]);
F['bulk_order_idr_dates.xlsx']=xl([{name:'Orders',aoa:[OH,RW('X1',['46314',0.3125,1,R0.kategori,R0.karoseri,'9,5','1.250,5',''],'Pick Up',PU,'46314',0.3541667,'30','DO-9'),RW('X1',null,'Drop Off',DO_,'46314',0.5,'45','')]}]);const TH=['Entry Gate','Exit Gate','Golongan','Tariff','Effective Date','Source','Reference'];
F['toll_tariff_valid.csv']=csv([TH,['Cikarang Utama','Karawang Barat','Gol II','Rp 64.000','2026-11-01','BPJT','SK 14/2026'],['Cikarang Utama','Karawang Barat','Gol III','Rp 64.000','2026-11-01','BPJT','SK 14/2026'],['Cikunir','Tanjung Priok','Gol II','31.500','2026-11-01','Jasa Marga','JM 11/2026'],['Karawang Timur','Cikampek','Gol II','45.000','2026-10-20','Jasa Marga','JM 10/2026']]);
F['toll_tariff_mixed.csv']=csv([TH,['Cikarang Utama','Karawang Barat','Gol II','Rp 66.000','2026-12-01','BPJT','SK 15/2026'],['Gerbang Fiktif','Karawang Barat','Gol II','50000','2026-12-01','BPJT',''],['Cibitung','Cibitung','Gol I','10000','2026-12-01','BPJT',''],['Cibitung','Sunter','Gol 6','10000','2026-12-01','BPJT',''],['Cibitung','Sunter','Gol II','abc','2026-12-01','BPJT',''],['Cikarang Utama','Karawang Barat','Gol II','62000','2026-10-01','BPJT','duplicate of existing']]);
F['toll_tariff_wrong_headers.csv']=csv([['Gerbang Masuk','Gerbang Keluar','Gol','Tarif'],['Cibitung','Sunter','Gol II','54000']]);
const sup=MD.get().suppliers;const PH=['Part No','Part Name','Supplier','Supplier Code','Vendor Site','Dock','Part Category','Box m3','Cap per Box'];
const pv=[PH];for(let i=0;i<30;i++)pv.push(['NP-'+(70000+i),'Bracket '+i,sup[i%24],'S'+String(i%24+1).padStart(3,'0'),'Plant 1','Dock '+(1+i%4),'Body',(0.04+(i%5)/100).toFixed(2),12]);F['milkrun_part_valid.csv']=csv(pv);
F['milkrun_part_mixed.csv']=csv([PH,['NP-80001','Panel A',sup[1],'S002','Plant 1','Dock 1','Body','0.05','10'],['NP-80002','Panel B','PT Supplier Baru','S099','Plant 1','Dock 1','Body','0.05','10'],['NP-80003','Panel C',sup[2],'S003','Plant 1','Dock 1','Body','0','10'],['NP-80001','Panel A dup',sup[1],'S002','Plant 1','Dock 1','Body','0.05','10'],['','Panel E',sup[3],'S004','Plant 1','Dock 1','Body','0.05','x']]);
F['milkrun_part_wrong_headers.csv']=csv([['Kode Part','Nama','Pemasok'],['NP-1','Panel',sup[1]]]);
const ODH=['Model','Katashiki Suffix','Model Name','Month','Year','Qty'];
F['order_data_tam_nov2026.csv']=csv([ODH,['F653RV-GMDFJ','F653RV','Avanza 1.5 G',11,2026,2500],['F654RV-GMDFJ','F654RV','Veloz 1.5 Q',11,2026,1700],['B401RS-GMQFJ','B401RS','Rush 1.5 S',11,2026,1600],['W101RE-GMDFJ','W101RE','Raize 1.0 T',11,2026,2000]]);
F['order_data_tam_errors.csv']=csv([ODH,['F653RV-GMDFJ','F653RV','Avanza 1.5 G',11,2026,2500],['X999-UNKNOWN','X999','Model Baru',11,2026,300],['F654RV-GMDFJ','F654RV','Veloz 1.5 Q',11,2026,0]]);
const p=MR.byId('MP-2026-0047');const ref=DOM.refOf(p.projectId,p);
const mx=ref.routeGroups.map(g=>{const rows=p.matrix.filter(x=>x.route===g.id);const N=Math.max(...rows.map(r=>r.trips.length));return {name:g.id+' '+g.name,aoa:[['ADM-SAP VOLUME MATRIX DEC 2026'],[],['SUPPLIER','VENDOR SITE','SHOP/DOCK','PART CATEGORY','VOL/DAY','CYCLE ISSUE'].concat(Array.from({length:N},(x,i)=>'TRIP '+(i+1)),['TOTAL CYCLE','MILKRUN START'])].concat(rows.map(r=>[r.supplier,r.site,r.dock,r.partCat,r.volDay,''].concat(r.trips.map(t=>t?1:''),[N,'2026-12-01']))).concat([['VOLUME TOTAL','','','',rows.reduce((a,r)=>a+r.volDay,0)]])};});
F['volume_matrix_adm_dec2026.xlsx']=xl(mx);
const bad=JSON.parse(JSON.stringify(mx));bad[0].aoa[3][0]='PT Supplier Bukan Anggota';bad[1].aoa[4][4]=0;bad[2].aoa[3][bad[2].aoa[3].length-1]='2027-01-15';bad.push({name:'R99 Unknown',aoa:[['SUPPLIER','VENDOR SITE'],['PT X','Plant 1']]});F['volume_matrix_errors.xlsx']=xl(bad);
F['template_puts_ok.xlsx']=xl([{name:'PUTS',aoa:[['PICK UP TIME SCHEDULE'],['Plan','{{plan_id}}','Version','{{version}}'],['Route','{{route}}','{{route_name}}'],['Supplier','{{supplier}}','Dock','{{dock}}'],['Cycle','{{cycle}}','Out Pool','{{out_pool}}','In Pool','{{in_pool}}']]}]);
F['template_puts_bad_placeholder.xlsx']=xl([{name:'PUTS',aoa:[['PICK UP TIME SCHEDULE'],['Plan','{{plan_id}}','Version','{{version}}'],['Route','{{route_code}}','{{route_name}}'],['Supplier','{{supplier}}','PIC','{{supplier_pic}}']]}]);
const out=[];for(const k of Object.keys(F)){const body=typeof F[k]==='string'?new Blob(['﻿'+F[k]],{type:'text/csv'}):F[k];const r=await fetch('../test-data/'+k,{method:'POST',body});out.push(k+' '+r.status);}
document.body.insertAdjacentHTML('beforeend','<pre>'+out.join('\n')+'</pre>');window.DONE=out;
})();
