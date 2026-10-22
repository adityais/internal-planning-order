/* Daily Availability (Vendor role): the vendor reports, once or twice a day, the units and drivers it can give for a day.
   Fields: plate, unit category, karoseri, tonase, volume, driver, phone, last location (city). One-time data, not Master Data.
   The report shows up in the Order Management (On Call > Transporter) next to the vendor's rate, grouped per vendor. */
(function(){
const {ic,esc}=UI;const {$,$$,DLG,toast}=C;
if(!SHELL.mount({module:'order',id:'vendoravail',active:'vendoravail',title:'Daily Availability',crumb:'Order & Delivery',actions:'<button type="button" class="btn primary" id="add">'+ic('plus')+'Add availability</button>'}))return;
const vendor=VENDOR.me();
const mine=()=>DOM.availRows().filter(r=>r.vendor===vendor).sort((a,b)=>b.date.localeCompare(a.date)||String(a.plate).localeCompare(String(b.plate)));
/* a reported unit is "Assigned" once an order of that day took its plate */
function usedBy(r){const o=STORE.get('orders').find(x=>x.date===r.date&&x.assignment&&x.assignment.path==='Vendor'&&(x.assignment.plate===r.plate||(x.assignment.units||[]).some(u=>u.plate===r.plate)));return o?o.id:'';}
const cities=()=>[...new Set(MD.get().dd.locations.map(l=>ORD.city(l.city||'')).filter(Boolean).concat(['Jakarta','Bekasi','Bogor','Bandung','Semarang','Surabaya','Cirebon','Karawang']))].sort();
const num=v=>{const x=IO.toNum(v);return x;};
function form(r){const e=r||{};const kar=UI.KAROS.indexOf(e.kar)<0&&e.kar?UI.KAROS.concat([e.kar]):UI.KAROS;const cat=UI.CATS.indexOf(e.cat)<0&&e.cat?UI.CATS.concat([e.cat]):UI.CATS;
 const mv=MD.get().dd.vehicles.filter(v=>v.own==='vendor'&&v.vendor===vendor);const md=MD.get().dd.drivers.filter(d=>d.own==='vendor'&&d.vendor===vendor);
 DLG.open({title:r?'Edit availability':'Add availability',sub:esc(vendor),width:620,
  body:'<datalist id="dl-pl">'+mv.map(v=>'<option value="'+esc(v.plate)+'"></option>').join('')+'</datalist><datalist id="dl-dr">'+md.map(d=>'<option value="'+esc(d.name)+'"></option>').join('')+'</datalist><datalist id="dl-ct">'+cities().map(c=>'<option value="'+esc(c)+'"></option>').join('')+'</datalist>'+
   '<div class="grid2">'+C.field('Date','<input class="input" type="date" id="f-date" value="'+esc(e.date||UI.addDays(STORE.today(),1))+'">',{req:1,for:'f-date'})+C.field('Plate','<input class="input" id="f-pl" list="dl-pl" placeholder="B 1234 XYZ" value="'+esc(e.plate||'')+'">',{req:1,for:'f-pl'})+
   C.field('Unit Category','<select class="select" id="f-cat">'+C.opts(cat,e.cat||'','Select')+'</select>',{req:1,for:'f-cat'})+C.field('Karoseri','<select class="select" id="f-kar">'+C.opts(kar,e.kar||'','Select')+'</select>',{req:1,for:'f-kar'})+
   C.field('Tonase (ton)','<input class="input" id="f-ton" inputmode="decimal" value="'+esc(e.ton==null?'':e.ton)+'">',{req:1,for:'f-ton'})+C.field('Volume (m3)','<input class="input" id="f-m3" inputmode="decimal" value="'+esc(e.m3==null?'':e.m3)+'">',{req:1,for:'f-m3'})+
   C.field('Driver','<input class="input" id="f-dn" list="dl-dr" value="'+esc(e.driverName||'')+'">',{req:1,for:'f-dn'})+C.field('Phone','<input class="input" id="f-ph" inputmode="tel" placeholder="+62 812-0000-0000" value="'+esc(e.phone||'')+'">',{req:1,for:'f-ph'})+
   C.field('Last Location (city)','<input class="input" id="f-lc" list="dl-ct" placeholder="e.g. Bekasi" value="'+esc(e.lastLoc||'')+'">',{req:1,for:'f-lc'})+'</div>',
  buttons:[{label:'Cancel'},{label:r?'Save':'Add',kind:'primary',onClick(L,el){const g=id=>$('#'+id,el);const v=id=>g(id).value.trim();
   const plate=String(v('f-pl')).toUpperCase().replace(/\s+/g,' ');const ton=num(v('f-ton')),m3=num(v('f-m3'));let ok=true;const chk=(id,msg)=>{if(!C.setErr(g(id),msg||''))ok=false;};
   chk('f-date',v('f-date')?'':'Required');chk('f-pl',plate?(/^[A-Z]{1,2} \d{1,4} [A-Z]{1,3}$/.test(plate)?'':'Use format B 1234 XYZ'):'Required');chk('f-cat',g('f-cat').value?'':'Required');chk('f-kar',g('f-kar').value?'':'Required');
   chk('f-ton',v('f-ton')?(isNaN(ton)?'Enter a number':ton<=0?'Must be above 0':''):'Required');chk('f-m3',v('f-m3')?(isNaN(m3)?'Enter a number':m3<=0?'Must be above 0':''):'Required');chk('f-dn',v('f-dn')?'':'Required');chk('f-ph',!v('f-ph')?'Required':(/^\+?[0-9][0-9 ()-]*$/.test(v('f-ph'))&&v('f-ph').replace(/\D/g,'').length>=8&&v('f-ph').replace(/\D/g,'').length<=15)?'':'Use a phone number, 8 to 15 digits');chk('f-lc',!v('f-lc')?'Required':/[A-Za-z]/.test(v('f-lc'))?'':'Enter a city name');
   if(!ok)return false;
   const dup=(STORE.get('vendorAvail')||[]).find(x=>x.vendor===vendor&&x.date===v('f-date')&&x.plate===plate&&(!r||x.id!==r.id));if(dup){C.setErr(g('f-pl'),'This plate is already reported for that date');return false;}
   const all=STORE.get('vendorAvail')||[];const row=Object.assign({},r||{},{id:r?r.id:'VA-'+(all.reduce((m,x)=>Math.max(m,+String(x.id).replace(/\D/g,'')||0),0)+1),date:v('f-date'),vendor,cat:g('f-cat').value,kar:g('f-kar').value,ton,m3,plate,driverName:v('f-dn'),phone:v('f-ph'),lastLoc:v('f-lc'),reportedAt:STORE.now()});
   STORE.upsert('vendorAvail',row);STORE.audit({action:r?'Edited availability':'Added availability',detail:plate+', '+row.driverName+', '+row.date,obj:row.id,type:'Availability'});toast(r?'Availability updated':'Availability added');T.render();}}]});}
function del(r){DLG.confirm({title:'Remove availability',sub:esc(r.plate+', '+UI.fdate(r.date,{noYear:1})),body:'The unit is no longer offered for that day.',ok:'Remove',danger:true}).then(ok=>{if(!ok)return;STORE.remove('vendorAvail',r.id);toast('Removed '+r.plate);T.render();});}
$('#content').innerHTML='<div class="panel" id="tbl"></div>';
const rows=()=>mine().map(r=>Object.assign({},r,{used:usedBy(r)}));
const T=C.table($('#tbl'),{key:'id',label:'Daily Availability',minw:1500,rows,empty:{text:'Nothing reported yet',action:'Add availability',fn:()=>form()},
 actions:{edit:r=>form(r),del:r=>del(r),can:(a,r)=>(a==='edit'||a==='del')&&!r.used,name:r=>r.plate},
 cols:[{k:'date',h:'Date',sortv:r=>r.date,text:r=>UI.fdate(r.date,{noYear:1})},{k:'plate',h:'Plate',render:r=>'<b class="plate">'+esc(r.plate)+'</b>'},{k:'cat',h:'Unit Category'},{k:'kar',h:'Karoseri'},
  {k:'ton',h:'Tonase (ton)',cls:'num',text:r=>r.ton==null?'':UI.num(r.ton,1)},{k:'m3',h:'Volume (m3)',cls:'num',text:r=>r.m3==null?'':UI.num(r.m3,1)},{k:'driverName',h:'Driver'},{k:'phone',h:'Phone'},{k:'lastLoc',h:'Last Location'},
  {k:'reportedAt',h:'Last Update',sortv:r=>r.reportedAt,text:r=>r.reportedAt?UI.fdt(r.reportedAt):''},
  {k:'status',h:'Status',status:true,text:r=>r.used?'Assigned':'Available',render:r=>r.used?UI.status('Assigned','green')+' <span class="sm mut">'+esc(r.used)+'</span>':UI.status('Available','slate')}]});
$('#add').onclick=()=>form();
STORE.subscribe('vendorAvail',()=>{if(DLG.layers.length)return;T.render();});STORE.subscribe('orders',()=>{if(DLG.layers.length)return;T.render();});
})();
