/* Vendor side of Order & Delivery (shared by Order Management, Order Detail, Trip Management, Daily Availability).
   - which vendor won an order, and "is it mine" for the Vendor role
   - Nopol & driver of a vendor unit comes in two ways, both end in the same place (assignment + vendor trip on the Trip Management lane):
       1. WhatsApp: the vendor replies in the group, the message is read automatically (demo: paste / edit the reply, the system parses plate, driver, phone)
       2. Trip Management: someone types it in the Transporter lane
     Once it is in, the vendor only has to look at the Trip Management.
   One-time data, not Master Data (FR 03 FR-14). */
(function(){
'use strict';
const {esc}=UI;const {$,DLG,toast}=C;
const PLATE=/\b([A-Z]{1,2})\s?(\d{1,4})\s?([A-Z]{1,3})\b/;
const PHONE=/(\+?62|0)\s?8[\d\s-]{7,13}\d/;
const me=()=>STORE.me().vendor||'';
/* the vendor(s) an order went to: dedicated vendor (automatic), blast winner, or the picked reported unit */
function vendorsOf(o){const a=o.assignment||{};if(a.path!=='Vendor')return [];const s=new Set();if(a.vendor)s.add(a.vendor);(a.vendors||[]).forEach(v=>s.add(v.vendor));(a.units||[]).forEach(u=>{if(u.vendor)s.add(u.vendor);});return [...s];}
const isMine=(o,v)=>vendorsOf(o).indexOf(v||me())>=0;
const pending=o=>{const a=o.assignment||{};return a.path==='Vendor'&&['Assigned','Planned'].indexOf(o.status)>=0&&!a.plate&&!(a.units||[]).length;};
/* Dispatch lane trip for a vendor unit (plate + driver are known once the vendor confirms) */
function trip(o,plate,driver,vendor,via){const a=o.assignment||{};
 const t={id:'DT-'+o.date.replace(/-/g,'')+'-'+String(STORE.get('trips').filter(x=>x.type==='DT'&&x.date===o.date).reduce((m,x)=>Math.max(m,+x.id.slice(-4)),0)+1).padStart(4,'0'),type:'DT',date:o.date,project:o.project,projectId:(MD.project(o.project)||{}).id,orders:[o.id],stops:[{loc:o.origin.loc,kind:'pick',eta:UI.parseHM(o.window[0])}].concat(o.drops.map(dd=>({loc:dd.loc,kind:'drop',city:dd.city,eta:UI.parseHM(o.window[0])+180}))),unit:plate,driver:null,out:UI.parseHM(o.window[0]),inPool:UI.parseHM(o.window[0])+360,durMin:360,status:'Published',vendor:vendor||a.vendor,vendorDriver:driver,vendorConf:'Awaiting vendor',vendorRate:a.price,nopolVia:via||'Trip Management',sl:o.sl,toll:null,additions:[]};
 STORE.upsert('trips',t);return t;}
/* write Nopol + driver onto the order and open its vendor trip */
function setNopol(o,plate,driver,phone,via){const a=o.assignment;
 /* the Trip Management already made one Draft trip per unit: fill the first one that has no plate yet */
 const open=window.DDL?STORE.get('trips').find(x=>x.type==='DT'&&x.vendor&&x.orders.indexOf(o.id)>=0&&!x.unit&&!/Cancelled|Skipped/.test(x.status)):null;
 if(open)return window.DDL.fillVendorTrip(open,plate,driver,phone,via||'Trip Management');a.plate=plate;a.driverName=driver;a.driverPhone=phone||'';a.nopolAt=STORE.now();a.nopolVia=via;
 a.units=[{plate,cat:o.unitCategory||'',kar:o.body||'',vendor:a.vendor,driverName:driver,phone:phone||''}];
 const t=trip(o,plate,driver,a.vendor,via);a.trip=t.id;ORD.save(o,'Nopol and driver ('+via+')',plate+', '+driver+(phone?', '+phone:''));return t;}
const normPlate=p=>{const m=String(p||'').toUpperCase().match(PLATE);return m?m[1]+' '+m[2]+' '+m[3]:'';};
/* WhatsApp text -> plate / driver / phone. "B 9811 SJL, Ujang Suherman, 0812-3456-7890" or any order / line breaks */
function parseWA(text){const t=String(text||'');const up=t.toUpperCase();const pm=up.match(PLATE);const plate=pm?pm[1]+' '+pm[2]+' '+pm[3]:'';
 const ph=t.match(PHONE);const phone=ph?ph[0].replace(/\s+/g,' ').trim():'';
 let rest=t;if(pm)rest=rest.replace(new RegExp(pm[0].replace(/\s/g,'\\s?'),'i'),' ');if(ph)rest=rest.replace(ph[0],' ');
 rest=rest.replace(/\b(nopol|plat|no\.?|driver|supir|sopir|nama|hp|telp|tlp|wa|unit|siap|ready|pak|bu)\b[:.]?/gi,' ').replace(/[^A-Za-z\s.']/g,' ').replace(/\s+/g,' ').trim();
 const driver=rest.split(' ').filter(w=>w.length>1).slice(0,3).map(w=>w[0].toUpperCase()+w.slice(1).toLowerCase()).join(' ');
 return {plate,driver,phone};}
function nopolDialog(o,done){const a=o.assignment||{};
 DLG.open({title:'Input Nopol & Driver',sub:esc((a.vendor||'')+' &middot; '+o.id),width:480,body:'<div class="grid2">'+C.field('Plate','<input class="input" id="pl" placeholder="B 1234 XYZ">',{req:1,for:'pl'})+C.field('Driver','<input class="input" id="dn">',{req:1,for:'dn'})+C.field('Phone','<input class="input" id="dp" placeholder="+62">')+'</div><div class="hint mt2">Typed on the Trip Management. If the vendor replies in WhatsApp this is filled in automatically.</div>',
  buttons:[{label:'Cancel'},{label:'Save',kind:'primary',onClick(L,el){const p=normPlate($('#pl',el).value),d=$('#dn',el).value.trim();let ok=C.setErr($('#pl',el),p?'':'Use format B 1234 XYZ');ok=C.setErr($('#dn',el),d?'':'Required')&&ok;if(!ok)return false;
   const t=setNopol(o,p,d,$('#dp',el).value.trim(),'Trip Management');toast('Saved, vendor trip '+t.id);if(done)done();}}]});}
function waDialog(o,done){const a=o.assignment||{};const ex=((a.vendor||'PT')).replace(/^PT /,'');
 DLG.open({title:'WhatsApp reply from vendor',sub:esc((a.vendor||'')+' &middot; '+o.id+' (demo)'),width:520,
  body:'<div class="hint mb2">The vendor answers the offer in the WhatsApp group. The reply is read automatically: plate, driver name and phone are picked from the text.</div>'+C.field('Vendor reply','<textarea class="textarea" rows="3" id="wam" placeholder="e.g. Siap pak. B 9811 SJL, Ujang Suherman, 0812-3456-7890">B 9811 SJL, Ujang Suherman, 0812-3456-7890</textarea>',{req:1,for:'wam'})+'<div class="panel mt3"><div class="body" id="wap"></div></div>',
  buttons:[{label:'Cancel'},{label:'Receive reply',kind:'primary',onClick(L,el){const r=parseWA($('#wam',el).value);const miss=!r.plate?'No plate found (format B 1234 XYZ)':!r.driver?'No driver name found':'';if(miss){$('#wap',el).innerHTML='<span class="errtxt">'+esc(miss)+'</span>';return false;}
   const t=setNopol(o,r.plate,r.driver,r.phone,'WhatsApp');toast('Read from WhatsApp, vendor trip '+t.id);if(done)done();}}],
  onOpen:(L,el)=>{const upd=()=>{const r=parseWA($('#wam',el).value);$('#wap',el).innerHTML='<div class="grid2"><div><div class="xs mut">Plate</div><b>'+esc(r.plate||'-')+'</b></div><div><div class="xs mut">Driver</div><b>'+esc(r.driver||'-')+'</b></div><div><div class="xs mut">Phone</div><b>'+esc(r.phone||'-')+'</b></div></div>';};$('#wam',el).addEventListener('input',upd);upd();}});
 /* DLG.open may not call onOpen: draw the preview right after it is in the DOM */
 setTimeout(()=>{const el=document.querySelector('#wam');if(el&&!document.querySelector('#wap').innerHTML){el.dispatchEvent(new Event('input'));}},60);}
const via=o=>{const a=o.assignment||{};return a.nopolVia||'';};
window.VENDOR={me,vendorsOf,isMine,pending,trip,setNopol,nopolDialog,waDialog,parseWA,via};
})();
