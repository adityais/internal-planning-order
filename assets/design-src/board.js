/* Readiness Board data + renderers, shared by readiness.html, readiness-tablet.html, exceptions.html */
(function(){
const {st,tag,code,wf,cd,lh,exflag,duty,rest,ic,avatar}=UI;
const T=[
 {id:'TS-20261014-R03-1',p:'MR',proj:'ADM-SAP',route:'R03 Karawang Barat, cycle 1',dep:'06:30',rep:'05:30',cd:['18 min','warn'],s:'ready',w:'Confirmed',
  d:{n:'Slamet Riyadi',att:['Present 05:31','green'],tk:['Fit 05:41','green'],duty:[9,50],ex:''},u:{pl:'B 9211 TXA',ty:'CDD Box',p2h:['Pass 05:44','green'],ops:['Available','green'],doc:['Docs valid','green']}},
 {id:'TS-20261014-R05-1',p:'MR',proj:'ADM-SAP',route:'R05 Jababeka, cycle 1',dep:'06:25',rep:'05:25',cd:['12:40','crit'],s:'notready',w:'Confirmed',rtext:'BP 150/95',lock:1,
  d:{n:'Agus Pratama',att:['Present 05:36','green'],tk:['Unfit 05:48','red'],duty:[10,10]},u:{pl:'B 9137 KYV',ty:'Fuso Box',p2h:['Pass 05:50','green'],ops:['Available','green'],doc:['Docs valid','green']}},
 {id:'TS-20261014-R03-2',p:'MR',proj:'ADM-SAP',route:'R03 Karawang Barat, cycle 2',dep:'08:00',rep:'07:00',cd:['1h 48m',''],s:'waiting',w:'Planned',
  d:{n:'Budi Santoso',att:['Not checked','slate'],tk:['Not checked','slate'],duty:[8,20]},u:{pl:'B 9618 TXB',ty:'CDD Box',p2h:['Not checked','slate'],ops:['Available','green'],doc:['Docs valid','green']}},
 {id:'TS-20261014-R02-3',p:'MR',proj:'TAM-PIO',route:'R02 Cikarang, cycle 3',dep:'06:45',rep:'05:45',cd:['33 min','warn'],s:'replacing',w:'Confirmed',cd2:['22 min','warn','DM reply'],
  d:{n:'Wahyu Hidayat',att:['Sick','red'],tk:['-','slate'],duty:[0,0],gone:1},u:{pl:'B 9047 KYV',ty:'CDE Box',p2h:['Pass 05:52','green'],ops:['Available','green'],doc:['Docs valid','green']}},
 {id:'DT-20261014-0007',p:'FMCG',proj:'Boga Rasa',route:'Cikarang DC to Bandung',dep:'07:15',rep:'06:15',cd:['1h 03m',''],s:'exreq',w:'Published',rtext:'Brake pedal travel',cd2:['07:00','warn','PM decision'],
  d:{n:'Fajar Nugroho',att:['Present 05:58','green'],tk:['Fit 06:05','green'],duty:[8,40]},u:{pl:'B 9356 KYT',ty:'CDD Box',p2h:['Fail 06:02','red'],ops:['Available','green'],doc:['Docs valid','green']}},
 {id:'DT-20261014-0004',p:'FMCG',proj:'Boga Rasa',route:'Cikarang DC to Bekasi',dep:'06:40',rep:'05:40',cd:['28 min','warn'],s:'withex',w:'Published',flag:'Driver Apps',rtext:'Approved 06:09',
  d:{n:'Teguh Wibowo',att:['Present 05:40','green'],tk:['Fit with note','amber'],duty:[7,30]},u:{pl:'B 9122 UYA',ty:'CDD Box',p2h:['Pass 05:55','green'],ops:['Available','green'],doc:['Docs valid','green']}},
 {id:'TS-20261014-R04-1',p:'MR',proj:'TAM-PIO',route:'R04 Bekasi, cycle 1',dep:'09:30',rep:'08:30',cd:['3h 18m',''],s:'atrisk',w:'Planned',
  d:{n:'Joko Susilo',att:['Not checked','slate'],tk:['Not checked','slate'],duty:[11,40]},u:{pl:'B 9273 KZA',ty:'CDE Box',p2h:['Not checked','slate'],ops:['Available','green'],doc:['KIR 19 Oct','amber']}},
 {id:'DT-20261014-0011',p:'FMCG',proj:'Sehat Bumi',route:'Jakarta Utara to Karawang',dep:'10:00',rep:'09:00',cd:['3h 48m',''],s:'pred',w:'Planned',
  d:{n:'Eko Prasetyo',att:['Leave','slate'],tk:['-','slate'],duty:[0,0],gone:1},u:{pl:'B 9310 KYU',ty:'CDD Box',p2h:['Not checked','slate'],ops:['Available','green'],doc:['Docs valid','green']}},
 {id:'TS-20261014-R06-2',p:'MR',proj:'TAM-PIO',route:'R06 Cileungsi, cycle 2',dep:'06:50',rep:'05:50',cd:['38 min','warn'],s:'skipped',w:'Skipped',rtext:'No backup',
  d:{n:'Unassigned',att:['-','slate'],tk:['-','slate'],duty:[0,0],gone:1},u:{pl:'-',ty:'CDE Box',p2h:['-','slate'],ops:['-','slate'],doc:['-','slate']}},
 {id:'DT-20261014-0013',p:'FMCG',proj:'Sehat Bumi',route:'Jakarta Utara to Surabaya',dep:'11:00',rep:'10:00',cd:['4h 48m',''],s:'waiting',w:'Published',lh:1,
  d:{n:'Ahmad Fauzi',att:['Not checked','slate'],tk:['Not checked','slate'],duty:[0,0],longhaul:1},u:{pl:'B 9455 SCA',ty:'Wingbox',p2h:['Not checked','slate'],ops:['Available','green'],doc:['Docs valid','green']}}
];
const tg=(a)=>tag(a[0],a[1],a[1]==='green'?'check':a[1]==='red'?'x-circle':a[1]==='amber'?'alert':null);
function card(t,o){o=o||{};const tab=o.tablet;const bt=tab?'btn lg':'btn sm';
 let a='';
 if(t.s==='notready')a='<button class="'+bt+' primary">'+ic('swap')+'Replace</button><button class="'+bt+'">Skip trip</button>'+(t.lock?'<span class="tag slate">'+ic('lock')+'No exception</span>':'<button class="'+bt+'">'+ic('flag')+'Request exception</button>');
 if(t.s==='replacing')a='<button class="'+bt+' primary">'+ic('users')+'Choose replacement</button>';
 if(t.s==='exreq')a='<span class="sm mut">Awaiting Hendra Wijaya</span>';
 if(t.s==='waiting'||t.s==='ready'||t.s==='atrisk')a='<button class="'+bt+'">'+ic('clip-check')+(t.s==='ready'?'View checks':'Open checks')+'</button>'+(t.s==='atrisk'?'<button class="'+bt+'">'+ic('swap')+'Suggest backup</button>':'');
 if(t.s==='pred')a='<button class="'+bt+' primary">'+ic('swap')+'Suggest backup</button>';
 const dh='<div class="col" style="gap:6px;min-width:0"><div class="sect row" style="gap:6px">'+ic('user','s12')+'Driver</div><div class="row" style="gap:8px">'+(t.d.gone?'':avatar(t.d.n))+'<b class="ell">'+t.d.n+'</b></div><div class="row wrap" style="gap:4px">'+(t.d.gone&&!t.d.att[0].match(/Sick|Leave/)?'':(t.d.att[0]==='Not checked'&&t.d.tk[0]==='Not checked'?tg(t.d.att):tg(t.d.att)+(t.d.tk[0]!=='-'?tg(t.d.tk):'')))+'</div>'+(t.d.duty[0]||t.d.duty[1]?(t.d.longhaul?'<span class="tag navy">'+ic('route')+'Duty exempt</span>':duty(t.d.duty[0],t.d.duty[1])):'')+'</div>';
 const uh='<div class="col" style="gap:6px;min-width:0"><div class="sect row" style="gap:6px">'+ic('truck','s12')+'Unit</div><div class="row" style="gap:8px"><b class="plate">'+t.u.pl+'</b><span class="sm mut">'+t.u.ty+'</span></div><div class="row wrap" style="gap:4px">'+(t.u.p2h[0]!=='-'?'<span title="P2H">'+tg(t.u.p2h).replace('>','>P2H ')+'</span>':'')+(t.u.ops[0]!=='-'?tg(t.u.ops):'')+(t.u.doc[0]!=='-'?tg(t.u.doc):'')+'</div></div>';
 return '<div class="panel" style="padding:0;'+(t.s==='notready'?'border-color:#e6b3b3;':'')+(t.s==='skipped'?'background:var(--rowh);':'')+'"><div class="row" style="padding:12px 16px 0;gap:8px;flex-wrap:wrap">'+st(t.s)+wf(t.w,t.w==='Published'?'pub':'')+(t.lh?lh():'')+(t.flag?exflag(t.flag):'')+'<span class="sp"></span>'+(t.s==='skipped'?'':cd(t.cd[0],t.cd[1],'left'))+'</div>'+
 '<div style="padding:8px 16px 0"><div class="row" style="gap:8px"><b>'+t.proj+'</b><span class="tag slate">'+(t.p==='MR'?'Milkrun':'Direct')+'</span></div><div class="sm mut ell">'+t.route+'</div><div class="row sm" style="margin-top:2px;gap:12px"><span class="mono mut">'+t.id+'</span><span class="tnum">Dep <b>'+t.dep+'</b> &middot; report '+t.rep+'</span></div></div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:12px 16px">'+dh+uh+'</div>'+
 ((t.reason||t.rtext)?'<div style="padding:0 16px 12px"><div class="row wrap" style="gap:6px;margin-bottom:4px">'+(t.reason||[]).map(r=>tag(r[0],r[1])).join('')+(t.cd2?cd(t.cd2[0],t.cd2[1],t.cd2[2]):'')+'</div><div class="sm" style="color:var(--text)">'+(t.rtext||'')+'</div></div>':'')+
 (a?'<div class="row wrap" style="padding:12px 16px;border-top:1px solid var(--line2);gap:8px">'+a+'</div>':'')+'</div>';}
function summary(sel){const S=[['ready','Ready',14],['waiting','Waiting Check',9],['notready','Not Ready',2],['replacing','Replacing',1],['exreq','Exception Requested',1],['withex','With Exception',1],['skipped','Skipped / Cancelled',1]];
 return '<div class="statblock">'+S.map(s=>'<div class="act'+(sel===s[0]?' sel':'')+'"><div class="k">'+st(s[0],{label:s[0]==='withex'?'With Exception':undefined}).replace('class="st ','class="st sm ')+'</div><div class="v" style="margin-top:6px">'+s[2]+'</div></div>').join('')+'</div>';}
function filters(o){o=o||{};return '<div class="row wrap" style="gap:8px;margin:12px 0"><div class="select" style="width:192px">'+ic('calendar')+'Wed, 14 Oct 2026'+ic('down')+'</div><div class="select" style="width:116px">Shift: Day'+ic('down')+'</div><div class="select" style="width:140px">Pool Cibitung'+ic('down')+'</div><div class="select" style="width:140px">Project: All'+ic('down')+'</div><div class="select" style="width:116px">Source: Own'+ic('down')+'</div>'+
 '<div class="input" style="width:200px;display:flex;align-items:center;gap:8px;color:var(--faint)">'+ic('search')+'Search</div><span class="sp"></span><div class="seg"><button class="'+(o.v==='checkin'?'on':'')+'">'+ic('user','s12')+'Check-in</button><button class="'+(o.v==='trips'||!o.v?'on':'')+'">'+ic('grid','s12')+'Trips</button><button class="'+(o.v==='table'?'on':'')+'">'+ic('table','s12')+'Table</button></div></div>';}
function tabs(a){return '<div class="tabs"><button class="'+(a==='board'||!a?'on':'')+'">Board</button><button>Requests <span class="cnt n">2</span></button><button class="'+(a==='exc'?'on':'')+'">Exceptions <span class="cnt">1</span></button><button>Reports</button></div>';}
function table(){return '<div class="panel"><div class="tbl-scroll"><table style="min-width:1040px"><thead><tr><th class="stc" style="width:190px">Readiness</th><th>Trip</th><th>Departure</th><th>Driver</th><th>Duty</th><th>Unit</th><th class="act" style="width:96px">Action</th></tr><tr class="colfilter"><td class="stc"><input placeholder="Search"></td><td><input placeholder="Search"></td><td><input placeholder="Search"></td><td><input placeholder="Search"></td><td></td><td><input placeholder="Search"></td><td class="act"></td></tr></thead><tbody>'+
 T.slice(0,10).map(t=>'<tr><td class="stc">'+st(t.s)+'<div style="margin-top:4px">'+wf(t.w,t.w==='Published'?'pub':'')+'</div></td><td><b>'+t.proj.split(',')[0]+'</b><div class="sm mut">'+t.route.split(',')[0]+'</div></td><td class="tnum"><b>'+t.dep+'</b><div style="margin-top:4px">'+(t.s==='skipped'?'':cd(t.cd[0],t.cd[1]))+'</div></td><td><div>'+t.d.n+'</div><div class="row" style="gap:4px;margin-top:4px">'+tg(t.d.att)+(t.d.tk[0]!=='-'?tg(t.d.tk):'')+'</div></td><td>'+(t.d.duty[0]||t.d.duty[1]?duty(t.d.duty[0],t.d.duty[1]):'-')+'</td><td><b class="plate">'+t.u.pl+'</b><div class="row" style="gap:4px;margin-top:4px">'+(t.u.p2h[0]!=='-'?'<span title="P2H">'+tg(t.u.p2h).replace('>','>P2H ')+'</span>':'')+(t.u.ops[0]!=='-'&&t.u.ops[1]!=='green'?tg(t.u.ops):'')+'</div></td><td class="act"><button class="btn sm">'+(t.s==='notready'?'Replace':'Open')+'</button></td></tr>').join('')+
 '</tbody></table></div><div class="pager"><span>1-10 of 29</span><span class="sp"></span><span class="pgbtn" style="opacity:.45">'+ic('left')+'</span><span class="pgbtn on">1</span><span class="pgbtn">2</span><span class="pgbtn">3</span><span class="pgbtn">'+ic('right')+'</span></div></div>';}function board(o){o=o||{};let c=tabs(o.tab)+filters(o)+summary(o.sel);
 if(o.v==='table')return c+'<div style="margin-top:12px">'+table()+'</div>';
 let sel=o.cards||T.slice(0,9);
 c+='<div style="display:grid;grid-template-columns:repeat('+(o.cols||3)+',minmax(0,1fr));gap:16px;margin-top:16px;align-items:start">'+sel.map(t=>card(t,o)).join('')+'</div>';return c;}
window.BOARD={T,card,summary,filters,tabs,board,table,tg};
})();






