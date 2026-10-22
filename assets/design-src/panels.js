/* Shared panels: Cost, Documents, History. Copy diet: labels only, no explanations. */
(function(){
const {ic,tag,rp,avatar}=UI;
function tip(t){return '<span class="tip" title="'+t+'">?</span>';}
function costChip(o){o=o||{};
 if(o.mode==='hidden')return '<span class="tag slate">'+ic('lock')+'UJ set</span>';
 if(o.mode==='vendor')return '<span class="tag line">'+ic('truck')+'Vendor Rate</span>';
 return '<span class="tag navy tnum" style="height:24px" title="Recommended + additions">'+ic('banknote')+'UJ <b>'+(o.tot||'843.500')+'</b></span>';}
/* Service Level chip (D70): Express = navy with bolt, Regular = quiet slate */
function slChip(sl,o){o=o||{};sl=sl||'Regular';return sl==='Express'?'<span class="tag navy">'+ic('zap')+'Express</span>':'<span class="tag slate">'+(o.edit?ic('pencil'):'')+'Regular</span>';}
/* Toll source tag (D68): Online is quiet, Cached / Manual / Unavailable are amber and never block */
function srcTag(s,d){return ({table:tag('Table, eff. '+(d||'01 Oct 2026'),'slate','list'),manual:tag('Manual','amber','pencil'),unavail:tag('Tariff unavailable','amber','alert'),sug:tag('Suggested','dash','pin')})[s]||'';}
const DEF_TOLL={cond:'mixed',cls:'Gol II',src:'table',pairs:[['Cikarang Utama','Karawang Barat',62000],['Karawang Barat','Cikampek',124000]]};
function tollTotal(t){return (t.pairs||[]).reduce((a,p)=>a+(p[2]||0),0);}
function costPanel(o){o=o||{};const m=o.mode||'planner';const T=o.toll||DEF_TOLL;const tolAmt=T.cond==='none'?0:(o.tolAmt!=null?o.tolAmt:tollTotal(T));
 const n=o.helpers==null?1:o.helpers;const crew=1+(o.addDriver?1:0)+n;const rec=o.rec||[['BBM','250 km',412500],['Tol',null,tolAmt],['Mel '+tip('Biaya jalan tak resmi (parkir, persimpangan)'),'Tier 200 - 300 km',25000],['Parkir','3 stops',40000],['Uang makan',crew+' crew',27500*crew]];
 const add=o.add||[['TKBM',75000,'Manual unloading at dock 3','plan'],['Uang geser',50000,'Starts before 05:30',o.trip?'trip':'plan']];
 const recTot=rec.reduce((a,r)=>a+r[2],0),addTot=add.reduce((a,r)=>a+r[1],0);
 const sl=o.sl||'Regular';
 let h='<div class="panel" style="'+(o.w?'width:'+o.w+'px':'')+'"><div class="panel-hd"><h3>'+(o.scope||'R03 cycle 2')+'</h3>'+(m==='vendor'?'':slChip(sl))+'<span class="sp"></span>'+(m==='vendor'?tag('Vendor','line','truck'):m==='hidden'?tag('Hidden','slate','lock'):tip('UJ = trip allowance. Incentive is read-only.'))+'</div><div class="body">';
 if(m==='vendor')return h+'<div class="row"><b>Vendor Rate</b><span class="sp"></span><b class="tnum">Rp 3.850.000</b></div></div></div>';
 h+='<div class="sect" style="margin-bottom:8px">UJ</div><table><tbody>';
 rec.forEach(r=>{const isTol=r[0]==='Tol';
  let basis=r[1];
  if(isTol){const cl=T.cond==='none'?'No toll':(T.cond==='full'?'Full':'Mixed')+', '+T.cls;basis='<span class="row" style="gap:6px;flex-wrap:wrap">'+cl+(T.cond==='none'||m==='hidden'?'':srcTag(T.src,T.days))+'</span>';}
  h+='<tr><td style="padding:8px 0;font-weight:600;width:30%;vertical-align:top">'+r[0]+'</td><td style="padding:8px 8px;color:var(--muted);font-size:12px;white-space:normal">'+basis+'</td><td class="num" style="padding:8px 0;width:28%;vertical-align:top">'+(m==='hidden'?tag('Set','green','check'):(isTol&&T.cond==='none'?'<span class="mut">-</span>':rp(r[2])))+'</td></tr>';
  if(isTol&&m!=='hidden'&&T.cond!=='none'&&o.pairs!==false){(T.pairs||[]).forEach(p=>{h+='<tr><td></td><td colspan="2" style="padding:0 0 6px 8px;font-size:12px;color:var(--muted)"><div class="row" style="gap:6px"><span class="ell" style="flex:1">'+p[0]+' <span class="faint">&rarr;</span> '+p[1]+'</span><span class="tnum">'+(p[2]==null?'<span style="color:var(--amber-t);font-weight:600">'+(m==='planner'&&!o.tolAmt?'<a style="text-decoration:underline">Enter manual</a>':'Unavailable')+'</span>':rp(p[2]).replace('Rp ',''))+'</span>'+(p[3]==='sug'?'<span class="faint" style="font-size:11px">Suggested</span>':'')+'</div></td></tr>';});}
 });
 h+='</tbody></table>';
 h+='<div class="sep"></div><div class="row" style="margin-bottom:8px"><div class="sect">Additions</div><span class="sp"></span>'+(m==='planner'?'<button class="btn sm">'+ic('plus')+'Add</button>':'')+'</div>';
 if(m==='hidden'){h+='<span class="tag slate">2 additions</span>';}
 else{ if(o.empty){h+='<div class="hint" style="padding:4px 0">None</div>';}
 else{add.forEach((a,i)=>{h+='<div style="display:grid;grid-template-columns:'+(m==='planner'?'1fr 120px 1.4fr 32px':'1fr 120px 1.4fr')+';gap:8px;align-items:center;padding:8px 0;'+(i?'border-top:1px solid var(--line2)':'')+'"><div><b>'+a[0]+'</b> '+(a[3]==='plan'?tag('Plan','navy'):tag('Trip','slate'))+'</div><div class="'+(m==='planner'?'input tnum':'tnum bb')+'" style="'+(m==='planner'?'display:flex;align-items:center;justify-content:flex-end':'text-align:right')+'">'+rp(a[1])+'</div><div class="sm mut">'+a[2]+'</div>'+(m==='planner'?'<button class="iconbtn" aria-label="Remove">'+ic('trash')+'</button>':'')+'</div>';});}}
 if(o.err)h+='<div class="errtxt" style="margin-top:8px">'+ic('x-circle','s12')+'Reason required</div>';
 h+='<div class="row" style="margin-top:12px;padding:12px;background:var(--navy-s);border-radius:9px"><b>Total UJ</b><span class="sp"></span>'+(m==='hidden'?tag('Set','green','check'):'<span class="bb tnum" style="font-size:18px">'+rp(recTot+(o.empty?0:addTot))+'</span>')+'</div>';
 const incBasis=o.incBasis||'Milkrun, daily + trip';const drv=o.drvInc==null?125000:o.drvInc;
 h+='<div class="sep"></div><div class="sect" style="margin-bottom:8px">Incentive</div><table><tbody><tr><td style="padding:6px 0;font-weight:600;width:30%">Driver</td><td style="padding:6px 8px;color:var(--muted);font-size:12px">'+incBasis+'</td><td class="num" style="padding:6px 0;width:28%">'+(m==='hidden'?tag('Set','green','check'):rp(drv))+'</td></tr>'+
  (o.addDriver?'<tr><td style="padding:6px 0;font-weight:600">Additional Driver</td><td style="padding:6px 8px;color:var(--muted);font-size:12px">Driver rate</td><td class="num" style="padding:6px 0">'+(m==='hidden'?tag('Set','green','check'):rp(drv))+'</td></tr>':'')+(n>0?'<tr><td style="padding:6px 0;font-weight:600">Helper'+(n>1?' &times;'+n:'')+'</td><td style="padding:6px 8px;color:var(--muted);font-size:12px">Driver rate'+(n>1?' &times; '+n:'')+'</td><td class="num" style="padding:6px 0">'+(m==='hidden'?tag('Set','green','check'):o.noRate?tag('No rate in master','amber','alert'):rp(drv*n))+'</td></tr>':'')+'</tbody></table></div></div>';return h;}

/* Toll setup editor (D68): Toll Condition + Entry -> Exit gate pairs. Used on Milkrun route, Dispatch trip. */
function tollEditor(o){o=o||{};const T=Object.assign({cond:'mixed',cls:'Gol II',src:'table',pairs:DEF_TOLL.pairs,per:'cycle',scope:'Toll'},o);
 const idx=T.cond==='none'?0:T.cond==='mixed'?1:2;
 const sel=(v,ph,err)=>'<div class="select" style="'+(err?'border-color:var(--red);background:#fffafa':'')+'">'+(v?'<span class="ell">'+v+'</span>':'<span class="faint">'+ph+'</span>')+ic('down')+'</div>';
 let h='<div class="panel" style="'+(T.w?'width:'+T.w+'px':'')+'"><div class="panel-hd"><h3>'+T.scope+'</h3><div class="seg" role="radiogroup" aria-label="Toll Condition">'+['No toll','Mixed','Full'].map((x,i)=>'<button class="'+(i===idx?'on':'')+'">'+x+'</button>').join('')+'</div><span class="sp"></span>'+(T.cond==='none'?'':'<span class="tag slate">'+T.cls+'</span>')+'</div>';
 if(T.cond==='none')return h+'<div class="body"><span class="mut">Toll 0</span></div></div>';
 h+='<div class="body" style="padding-top:8px">';
 (T.pairs.length?T.pairs:[[null,null,null]]).forEach((p,i)=>{const miss=!p[0]||!p[1];const un=p[2]==null&&!miss;
  h+='<div style="display:grid;grid-template-columns:minmax(0,1fr) 16px minmax(0,1fr) 84px 32px;gap:8px;align-items:center;padding:6px 0;'+(i?'border-top:1px solid var(--line2)':'')+'">'+sel(p[0],'Entry gate',miss)+'<span class="faint">'+ic('arrow','s12')+'</span>'+sel(p[1],'Exit gate',miss)+
   '<div class="row" style="justify-content:flex-end;gap:6px">'+(miss?'':(un?'':'<b class="tnum">'+rp(p[2]).replace('Rp ','')+'</b>'))+'</div><button class="iconbtn" aria-label="Remove pair">'+ic('trash')+'</button></div>'+
   (p[3]==='sug'&&!miss?'<div class="row" style="gap:8px;padding:0 0 8px">'+srcTag('sug')+'<button class="btn sm">Confirm</button></div>':'')+(miss&&T.err?'<div class="errtxt" style="padding:0 0 6px">'+ic('x-circle','s12')+'Select both gates</div>':'')+
   (un?'<div class="row" style="padding:0 0 6px">'+srcTag('unavail')+'</div><div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:8px;padding:0 0 8px"><div class="input tnum" style="justify-content:flex-end;display:flex"><span class="faint" style="margin-right:auto">Rp</span>'+(T.manualAmt||'')+'</div>'+sel(T.manualReason||'','Reason',false)+'</div>':'');});
 const tot=tollTotal(T);
 h+='<div class="row" style="margin-top:8px"><button class="btn sm">'+ic('plus')+'Add pair</button><span class="sp"></span><span class="sm mut">Per '+T.per+'</span><b class="tnum" style="font-size:16px">'+(rp(tot+(T.manualAmt?parseInt(String(T.manualAmt).replace(/\D/g,''),10):0)))+'</b>'+(T.src?srcTag(T.src,T.days):'')+'</div>';
 return h+'</div></div>';}
function docsPanel(o){o=o||{};
 const types=[['PUTS','Route Group',[['R01 Bekasi - Cikarang','v2','Generated','Confirmed','PT Akashi, 10:05',true],['R03 Karawang Barat','v2','Corrected','Sent','PT Yutaka, 10:12',true],['R05 Jababeka','v2','Generated','Revision','PT Gemala, 11:40',true]]],['Controller Check Sheet','',[['All routes','v2','Generated','','',true]]],['Truck Information','',[['R03 Karawang Barat','v2','Generated','','',false]]],['Driver Check Sheet','',[['R03 cycles 1-5','v2','Generated','Sent','Field Ops, 11:02',false]]]];
 let h='<div class="panel" style="'+(o.w?'width:'+o.w+'px':'')+'"><div class="panel-hd"><h3>Documents</h3>'+tag('MP-2026-0050','slate')+'<span class="sp"></span><button class="btn sm">'+ic('archive')+'ZIP</button></div>';
 h+='<div class="tbl-scroll"><table style="min-width:900px"><thead><tr><th>Document</th><th>Version</th><th>Status</th><th>Distribution</th><th class="act">Actions</th></tr></thead><tbody>';
 types.forEach(t=>{h+='<tr><td colspan="5" style="background:var(--thead);font-weight:700;padding:8px 16px">'+t[0]+(t[1]?' <span class="mut" style="font-weight:500">by '+t[1]+'</span>':'')+'</td></tr>';
  t[2].forEach(r=>{const dt=r[3]==='Confirmed'?tag('Confirmed','green','check'):r[3]==='Sent'?tag('Sent','navy','send'):r[3]==='Revision'?tag('Revision requested','amber','alert'):tag('Not logged','dash');
   h+='<tr><td style="padding-left:32px"><b>'+r[0]+'</b></td><td class="tnum">'+r[1]+'</td><td>'+(r[2]==='Corrected'?tag('Corrected','amber','pencil'):tag('Generated','green','check'))+'</td><td>'+dt+(r[4]?'<span class="sm mut" style="margin-left:8px">'+r[4]+'</span>':'')+'</td>'+
   '<td class="act"><div class="row" style="justify-content:flex-end;gap:4px"><button class="btn sm ghost" title="Preview" aria-label="Preview">'+ic('eye')+'</button><button class="btn sm">'+ic('download')+'PDF</button>'+(r[5]?'<button class="btn sm">'+ic('sheet')+'Excel</button>':'')+'<button class="btn sm ghost" title="Upload correction" aria-label="Upload correction">'+ic('pencil')+'</button><button class="btn sm ghost" title="Log distribution" aria-label="Log distribution">'+ic('send')+'</button></div></td></tr>';});});
 h+='</tbody></table></div>';
 h+='<div style="border-top:1px solid var(--line);padding:12px 16px"><div class="row"><span class="mut">'+ic(o.prev?'down':'right')+'</span><b>Previous versions</b>'+tag('v1, 7 files','slate','ban')+'</div>';
 if(o.prev){h+='<table style="margin-top:8px"><tbody><tr><td style="padding-left:24px"><span style="text-decoration:line-through">PUTS R03 Karawang Barat</span></td><td>v1</td><td>'+tag('Superseded','slate','ban')+'</td><td class="act"><button class="btn sm">'+ic('download')+'PDF</button></td></tr></tbody></table>';}
 h+='</div></div>';return h;}
function logDialog(){return '<div class="panel" style="width:420px"><div class="panel-hd"><h3>Log distribution</h3></div><div class="body col" style="gap:12px">'+
 '<div class="field"><label>Document</label><div class="select">PUTS R03 v2 '+ic('down')+'</div></div>'+
 '<div class="field"><label>Recipient</label><div class="select">PT Yutaka Manufacturing '+ic('down')+'</div></div>'+
 '<div class="row" style="gap:12px"><div class="field" style="flex:1"><label>Channel</label><div class="select">WhatsApp '+ic('down')+'</div></div><div class="field" style="flex:1"><label>Sent at</label><div class="input">14 Oct, 10.12</div></div></div>'+
 '<div class="field"><label>Status</label><div class="seg"><button class="on">Sent</button><button>Confirmed</button><button>Revision</button></div></div>'+
 '<div class="row"><span class="sp"></span><button class="btn">Cancel</button><button class="btn primary">Save</button></div></div></div>';}

function historyDrawer(o){o=o||{};
 const ev=[['Hendra Wijaya','PM','Published v2','','14 Oct 10:58','check-circle'],['Rina Kusumawati','Planner','Out Pool R05 cycle 3','08:00 to 08:10','14 Oct 10:31','pencil'],['System','','Chaining recalculated','','14 Oct 10:31','refresh'],['Rina Kusumawati','Planner','Sent PUTS R03 v2','WhatsApp','14 Oct 10:12','send'],['Rina Kusumawati','Planner','Added TKBM, R03 cycle 2','Rp 75.000','12 Oct 14:20','banknote']];
 let h='<aside class="drawer" style="width:480px"><div class="hd"><div class="col"><h2>History</h2><span class="sm mut">MP-2026-0050</span></div><span class="sp"></span><button class="iconbtn" aria-label="Close">'+ic('x')+'</button></div>';
 h+='<div style="padding:12px 24px;border-bottom:1px solid var(--line)" class="row wrap"><span class="fchip on">All</span><span class="fchip">Status</span><span class="fchip">Schedule</span><span class="fchip">Cost</span><span class="fchip">Documents</span><span class="sp"></span><button class="btn sm">'+ic('download')+'Export</button></div>';
 h+='<div class="bd" style="padding:0 24px">';
 ev.forEach((e,i)=>{h+='<div style="display:grid;grid-template-columns:32px 1fr;gap:12px;padding:16px 0;'+(i?'border-top:1px solid var(--line2)':'')+'">'+(e[0]==='System'?'<span class="avatar" style="background:var(--slate-s);color:var(--slate-t)">'+ic('gauge')+'</span>':avatar(e[0]))+
  '<div><b>'+e[2]+'</b>'+(e[3]?'<div class="sm mut" style="margin-top:2px">'+e[3]+'</div>':'')+'<div class="sm mut" style="margin-top:4px">'+e[0]+' &middot; '+e[4]+'</div></div></div>';});
 h+='</div></aside>';return h;}
window.PANELS={costPanel,costChip,docsPanel,logDialog,historyDrawer,tip,slChip,srcTag,tollEditor,DEF_TOLL};
})();


