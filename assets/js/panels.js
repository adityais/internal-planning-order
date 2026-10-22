/* Shared panels: C9 Cost panel, C10 Toll editor, C12 History drawer (interactive, store-driven). */
(function(){
'use strict';
const {ic,esc,tag,rp}=UI;const {$,$$,DLG,toast}=C;
function tip(t){return '<span class="tip" title="'+esc(t)+'" tabindex="0" aria-label="'+esc(t)+'">?</span>';}
function slChip(sl){return UI.sl(sl);}
function srcTag(s,eff){return ({table:tag('Table, eff. '+UI.fdate(eff||'2026-10-01'),'slate','list'),manual:'',unavail:tag('Tariff unavailable','amber','alert'),sug:tag('Suggested','dash','pin')})[s]||'';}
function mode(o){if(o.forceMode)return o.forceMode;if(o.vendor)return 'vendor';if(STORE.me().noAmounts)return 'hidden';if(o.editable&&STORE.can('plan'))return 'planner';return 'view';}
const ADD_COMP=['TKBM','Uang geser','Parkir khusus','Overnight','Security fee','Other'];
const MAN_REASON=['Cash lane, receipt kept','Tariff not in table yet','Route detour','Other'];
/* chip "UJ 843.500" with breakdown title */
function costChip(o){const m=mode(o);if(m==='vendor')return '<span class="tag line">'+ic('truck')+'Vendor Rate</span>';if(m==='hidden')return '<span class="tag slate">'+ic('lock')+'UJ set</span>';
 const c=DOM.cost(o.input);return '<span class="u-height-24 tag navy tnum" title="Recommended '+UI.num(c.recTotal)+' + additions '+UI.num(c.addTotal)+'">'+ic('banknote')+'UJ <b>'+UI.num(c.total)+'</b></span>';}
/* ---------- C9 Cost panel ---------- */
function cost(host,o){
 function render(){const m=mode(o);const input=o.input();
  if(m==='vendor'){host.innerHTML='<div class="panel"><div class="panel-hd"><h3>'+esc(o.scope)+'</h3><span class="sp"></span>'+tag('Vendor','line','truck')+'</div><div class="body"><div class="row"><b>Vendor Rate</b><span class="sp"></span>'+(STORE.can('vendorRate')?'<b class="tnum">'+rp(o.vendorRate||0)+'</b>':tag('Set','green','check'))+'</div></div></div>';return;}
   const c=DOM.cost(input);const H=m==='hidden';const set=tag('Set','green','check');const canAdd=m==='planner'&&o.onAdd;
   let h='<div class="panel costp"><div class="panel-hd"><h3>'+esc(o.scope)+'</h3>'+slChip(c.sl)+'<span class="sp"></span>'+(H?tag('Hidden','slate'):'')+(canAdd?'<button type="button" class="btn sm" data-add>'+ic('plus')+'Add</button>':'')+'</div><div class="body">';
   h+='<table class="ctbl"><thead><tr><th>Component</th><th>Detail</th><th class="num">Amount</th></tr></thead><tbody>';
   c.rec.forEach(r=>{let basis=esc(r.basis||''),amt=H?set:rp(r.amt);
    if(r.k==='Tol'){const t=r.toll;if(!t||t.cond==='none'||!t.cond){basis=t&&!t.cond?'<span class="errtxt">Toll not set</span>':'Non toll';amt=H?set:'<span class="mut">-</span>';}
     else{basis=(t.cond==='full'?'Full':'Mixed')+', '+esc(t.gol||'Toll class not mapped')+(t.missing&&!H?' <span class="errtxt">Gate pairs missing</span>':'');}}
    if(r.miss&&!H&&r.k!=='Tol')amt='<span class="amb">No rate in master</span>';
    if(!H&&r.k!=='Tol'){if(m==='planner'&&o.onOverride)amt='<div class="inputwrap"><span class="pre">Rp</span><input class="input rp" data-ov="'+r.k+'" data-rp inputmode="numeric" value="'+(r.miss&&!r.edited?'':UI.num(r.amt))+'" aria-label="'+r.k+' amount"></div>'+(r.edited?'<div class="xs mut ovnote">Recommended '+rp(r.auto)+' <span class="faint">&middot;</span> <button type="button" class="lnk" data-ovr="'+r.k+'">Reset</button></div>':'');else if(r.edited)amt=rp(r.amt)+'<div class="xs mut">Edited</div>';}
    h+='<tr><td class="ck">'+r.k+'</td><td class="cb_">'+basis+'</td><td class="num ca">'+amt+'</td></tr>';
    if(r.k==='Tol'&&!H&&r.toll&&r.toll.cond&&r.toll.cond!=='none')r.toll.pairs.forEach(p=>{if(p.state==='missing')return;
     h+='<tr class="pairrow"><td></td><td class="cb_">'+esc(p.entry)+' <span class="faint">&rarr;</span> '+esc(p.exit)+'</td><td class="num ca tnum">'+(p.state==='unavail'?(m==='planner'&&o.onToll?'<button type="button" class="lnk amber" data-man="'+p.i+'">Enter amount</button>':'<span class="amb">Unavailable</span>'):p.amt!=null?rp(p.amt):'-')+'</td></tr>';});});
   if(H)c.adds.length&&(h+='<tr><td class="ck">Additions</td><td class="cb_">'+UI.plural(c.adds.length,'addition')+'</td><td class="num ca">'+set+'</td></tr>');
   else c.adds.forEach((a,i)=>{const own=m==='planner'&&o.onRemove&&(a.scope===o.addScope);h+='<tr><td class="ck">'+esc(a.comp)+'</td><td class="cb_">'+esc(a.auto?(a.reason||'Customer project price'):(a.scope==='plan'?'Plan':'Trip'))+'</td><td class="num ca tnum">'+(own&&o.onEditAdd?'<div class="inputwrap"><span class="pre">Rp</span><input class="input rp" data-ea="'+i+'" data-rp inputmode="numeric" value="'+(a.amt?UI.num(a.amt):'')+'" aria-label="'+esc(a.comp)+' amount"></div>':rp(a.amt))+(own?' <button type="button" class="iconbtn" data-rm="'+i+'" aria-label="Remove '+esc(a.comp)+'">'+ic('trash')+'</button>':'')+'</td></tr>';});
   h+='<tr class="totrow"><td class="ck"><b>Total Uang Jalan</b></td><td></td><td class="num ca">'+(H?set:'<b class="tnum">'+rp(c.total)+'</b>')+'</td></tr></tbody></table>';
   if(o._adding)h+='<div class="addform"><select class="select" id="adC" aria-label="Component">'+C.opts(ADD_COMP,'',null)+'</select><div class="inputwrap"><span class="pre">Rp</span><input class="input rp" id="adA" data-rp inputmode="numeric" aria-label="Amount" placeholder="0"></div><div class="u-gap-4 row"><button type="button" class="btn sm primary" id="adS">Save</button><button type="button" class="btn sm ghost" id="adX">Cancel</button></div></div>';
   h+=(o.noInc?'':'<table class="ctbl mt3"><thead><tr><th>Incentive</th><th>Detail</th><th class="num">Amount</th></tr></thead><tbody>'+c.inc.map(r=>'<tr><td class="ck">'+esc(r.k)+'</td><td class="cb_">'+esc(r.basis)+'</td><td class="num ca">'+(H?set:r.noRate?'<span class="amb">No rate in master</span>':rp(r.amt))+'</td></tr>').join('')+'</tbody></table>')+'</div></div>';
  host.innerHTML=h;
  const ad=$('[data-add]',host);if(ad)ad.onclick=()=>{o._adding=true;render();$('#adC',host).focus();};
  $$('[data-rm]',host).forEach(b=>b.onclick=()=>{const a=c.adds[+b.dataset.rm];o.onRemove(a);toast('Removed '+a.comp,{action:{label:'Undo',fn:()=>{o.onAdd(a);}}});});
  const sv=$('#adS',host);if(sv){sv.onclick=()=>{const comp=$('#adC',host).value,amt=UI.parseRp($('#adA',host).value);let okk=true;
    if(!amt){$('#adA',host).classList.add('err');okk=false;}if(!okk)return;
    o._adding=false;o.onAdd({comp,amt,by:STORE.me().n,at:STORE.now(),scope:o.addScope});toast('Added '+comp);};
   $('#adX',host).onclick=()=>{o._adding=false;render();};}
  $$('[data-ov]',host).forEach(i=>i.onchange=()=>o.onOverride(i.dataset.ov,UI.parseRp(i.value)||0));$$('[data-ovr]',host).forEach(b=>b.onclick=()=>o.onOverride(b.dataset.ovr,null));$$('[data-ea]',host).forEach(i=>i.onchange=()=>o.onEditAdd(c.adds[+i.dataset.ea],UI.parseRp(i.value)||0));
  $$('[data-man]',host).forEach(b=>b.onclick=()=>manualDialog(input.toll,+b.dataset.man,o.onToll));}
 o.render=render;render();return o;}
function manualDialog(toll,i,onToll){const p=toll.pairs[i];
  DLG.open({title:'Toll amount',sub:esc(p.entry)+' &rarr; '+esc(p.exit),width:420,body:C.field('Amount','<div class="inputwrap"><span class="pre">Rp</span><input class="input rp" id="mA" data-rp inputmode="numeric"></div>',{req:1,for:'mA'}),
   buttons:[{label:'Cancel'},{label:'Save',kind:'primary',onClick(L,el){const a=UI.parseRp($('#mA',el).value);if(!C.setErr($('#mA',el),a?'':'Required'))return false;
    const t=JSON.parse(JSON.stringify(toll));Object.assign(t.pairs[i],{manual:a,useManual:true});onToll(t);STORE.audit({action:'Toll amount '+p.entry+' to '+p.exit,detail:UI.rp(a),type:'Cost'});toast('Toll amount saved');}}]});}
/* ---------- C10 Toll editor ---------- */
function toll(host,o){
 function render(){const T=o.toll()||{cond:null,pairs:[]};const ed=o.editable&&STORE.can('plan');const H=STORE.me().noAmounts;
  const ev=DOM.tollEval(T,o.chassis(),o.date());const gates=(function(){const n=STORE.get('tollGates').filter(g=>g.status!=='Inactive').map(g=>g.name);STORE.get('tollTariff').forEach(r=>{n.push(r.entry,r.exit);});return n.filter((x,i)=>x&&n.indexOf(x)===i).sort();})();
  const idx=T.cond==='none'?0:T.cond==='mixed'?1:T.cond==='full'?2:-1;
  let h='<div class="panel tolled"><div class="panel-hd"><h3>'+esc(o.scope)+'</h3><div class="seg" role="radiogroup" aria-label="Toll condition">'+['No toll','Mixed','Full'].map((x,i)=>'<button type="button" role="radio" aria-checked="'+(i===idx)+'" class="'+(i===idx?'on':'')+'" data-cond="'+['none','mixed','full'][i]+'"'+(ed?'':' disabled')+'>'+x+'</button>').join('')+'</div><span class="sp"></span>'+(T.cond&&T.cond!=='none'?tag(esc(ev.gol||'Toll class not mapped'),ev.gol?'slate':'amber',ev.gol?null:'alert'):'')+'</div>';
  if(o.help)h+='<div class="body" style="padding-bottom:0"><div class="hint">'+o.help+'</div></div>';
  if(!T.cond){h+='<div class="body"><span class="errtxt">'+ic('x-circle','s12')+'Select a toll condition</span></div></div>';host.innerHTML=h;wire(T,ed);return;}
  if(T.cond==='none'){h+='<div class="body"><span class="mut">Toll 0</span></div></div>';host.innerHTML=h;wire(T,ed);return;}
  h+='<div class="u-padding-top-s2 body">';
  const rows=T.pairs.length?T.pairs:[{entry:'',exit:''}];
  rows.forEach((p,i)=>{const e=ev.pairs[i]||{state:'missing'};const miss=e.state==='missing'||e.state==='same';
   const sel=(k,ph)=>ed?'<select class="select'+(miss&&!p[k]?' err':'')+'" data-pair="'+i+'" data-k="'+k+'" aria-label="'+ph+'">'+C.opts(gates,p[k],ph)+'</select>':'<div class="input">'+(esc(p[k])||'<span class="faint">'+ph+'</span>')+'</div>';
   h+='<div class="tpair"><div class="tp1">'+sel('entry','Entry gate')+'<span class="faint">'+ic('arrow','s12')+'</span>'+sel('exit','Exit gate')+'<div class="ra tnum">'+(H?'':e.amt!=null&&e.state!=='suggested'?'<b>'+rp(e.amt)+'</b>':e.state==='suggested'&&e.amt!=null?'<span class="mut">'+rp(e.amt)+'</span>':'')+'</div>'+(ed?'<button type="button" class="iconbtn" data-rmp="'+i+'" aria-label="Remove pair">'+ic('trash')+'</button>':'<span></span>')+'</div>';
   if(e.state==='suggested')h+='<div class="u-gap-s2-padding-0-0-s2 row">'+srcTag('sug')+(ed?'<button type="button" class="btn sm" data-conf="'+i+'">Confirm</button>':'')+'</div>';
   if(miss&&(T.pairs.length||o.showErr))h+='<div class="u-padding-0-0-6 errtxt">'+ic('x-circle','s12')+(e.state==='same'?'Entry and exit must differ':'Select both gates')+'</div>';
   if(e.state==='unavail'||(e.state==='manual')){h+='<div class="u-padding-0-0-6-gap-6 row">'+srcTag(e.state==='manual'?'manual':'unavail')+(e.state==='manual'&&DOM.tariff(p.entry,p.exit,ev.gol,o.date())&&ed?'<button type="button" class="lnk" data-usetbl="'+i+'">Use table tariff</button>':'')+'</div>';
    if(ed&&!H)h+='<div class="tman"><div class="inputwrap"><span class="pre">Rp</span><input class="input rp" data-man="'+i+'" data-rp inputmode="numeric" value="'+(p.manual?UI.num(p.manual):'')+'" aria-label="Manual amount"></div></div>';}});
  h+='<div class="u-margin-top-s2 row">'+(ed?'<button type="button" class="btn sm" data-addp>'+ic('plus')+'Add pair</button>':'')+'<span class="sp"></span><span class="sm mut">Per '+(o.per||'trip')+'</span>'+(H?tag('Set','green','check'):'<b class="tnum fs16">'+rp(ev.total)+'</b>')+(H?'':ev.src==='table'?'<span class="sm mut">(price from '+UI.fdate(ev.eff||'2026-10-01')+')</span>':srcTag(ev.src,ev.eff))+'</div></div></div>';
  host.innerHTML=h;wire(T,ed);}
 function upd(T,msg){o.onChange(T);if(msg)STORE.audit({action:msg,type:'Cost',obj:o.obj||''});render();}
 function wire(T,ed){if(!ed)return;const cp=()=>JSON.parse(JSON.stringify(T));
  $$('[data-cond]',host).forEach(b=>b.onclick=()=>{const t=cp();t.cond=b.dataset.cond;if(t.cond!=='none'&&!t.pairs)t.pairs=[];upd(t,'Toll condition '+b.textContent);});
  $$('select[data-pair]',host).forEach(s=>s.onchange=()=>{const t=cp();const i=+s.dataset.pair;if(!t.pairs[i])t.pairs[i]={entry:'',exit:'',status:'confirmed'};t.pairs[i][s.dataset.k]=s.value;t.pairs[i].status='confirmed';delete t.pairs[i].manual;delete t.pairs[i].useManual;upd(t,'Toll gate '+s.value);});
  $$('[data-rmp]',host).forEach(b=>b.onclick=()=>{const t=cp();t.pairs.splice(+b.dataset.rmp,1);upd(t,'Removed toll pair');});
  $$('[data-conf]',host).forEach(b=>b.onclick=()=>{const t=cp();t.pairs[+b.dataset.conf].status='confirmed';upd(t,'Confirmed suggested toll pair');toast('Pair confirmed');});
  $$('[data-usetbl]',host).forEach(b=>b.onclick=()=>{const t=cp();const p=t.pairs[+b.dataset.usetbl];delete p.manual;delete p.reason;p.useManual=false;upd(t,'Use table tariff');});
  const ap=$('[data-addp]',host);if(ap)ap.onclick=()=>{const t=cp();t.pairs=t.pairs||[];t.pairs.push({entry:'',exit:'',status:'confirmed'});o.onChange(t);render();const s=$$('select[data-k="entry"]',host);if(s.length)s[s.length-1].focus();};
  $$('[data-man]',host).forEach(i=>i.onchange=()=>{const t=cp();const p=t.pairs[+i.dataset.man];p.manual=UI.parseRp(i.value)||null;p.useManual=true;upd(t,p.manual?'Toll amount '+UI.rp(p.manual):'Cleared toll amount');});
  $$('[data-mr]',host).forEach(s=>s.onchange=()=>{const t=cp();t.pairs[+s.dataset.mr].reason=s.value;upd(t);});}
 o.render=render;render();return o;}
/* ---------- C12 History drawer ---------- */
function history(o){const objs=[].concat(o.obj);let filt='All';
 const vmine=()=>{if(STORE.persona()!=='vendor')return null;const me=VENDOR.me();const ids=new Set();STORE.get('orders').forEach(r=>{if(VENDOR.isMine(r,me))ids.add(r.id);});STORE.get('trips').forEach(t=>{if((t.stopOrder||[]).some(i=>ids.has(i)))ids.add(t.id);});return {me,ids};};
 const ev=()=>{const vm=vmine();return STORE.get('auditLog').filter(a=>objs.some(x=>a.obj===x||(a.obj||'').indexOf(x)===0)).filter(a=>!vm||(vm.ids.has(a.obj)&&(!/declin|no response|waterfall|offer|sales|rate/i.test((a.action||'')+' '+(a.detail||''))||((a.action||'')+(a.detail||'')).indexOf(vm.me)>=0))).sort((a,b)=>b.ts-a.ts);};
 const types=['All','Status','Schedule','Cost','Documents'].concat(o.types||[]);
 /* PM §12.1: the Reference Snapshot panel is hidden from Plan Info, but its metadata and the guarded
    Refresh action stay available in this history context (reproducibility + Draft/Scheduled safeguard). */
 const sn=o.snapshot?'<div class="panel mb3" id="hsnap"><div class="body"><div class="snapbar">'+ic('layers')+'<div><div class="k">Reference Snapshot</div><div class="v">'+(o.snapshot.frozen?'Frozen, taken ':'Taken ')+UI.fdt(o.snapshot.at)+'</div></div><div><div class="k">Content</div><div class="v">'+UI.plural(o.snapshot.parts.length,'part')+', '+UI.plural(o.snapshot.models.length,'BOM')+', '+UI.plural(o.snapshot.routeGroups.length,'route group')+'</div></div><span class="sp"></span>'+(o.canRefresh?'<button type="button" class="btn sm" id="hrefr">'+ic('refresh')+'Refresh from Reference</button>':'')+'</div></div></div>':'';
 const L=DLG.drawer({title:o.drawerTitle||'History',sub:esc(o.title||objs[0]),width:480,foot:false,top:'<div class="u-padding-s3-s5-border-bottom-1-solid-line-gap-s2 row wrap" id="hfil"></div>',body:sn+'<div id="hlist"></div>'});
 function render(){const all=ev();$('#hfil',L.el).innerHTML=types.map(t=>'<button type="button" class="fchip'+(t===filt?' on':'')+'" data-t="'+t+'" aria-pressed="'+(t===filt)+'">'+t+'</button>').join('')+'<span class="sp"></span><button type="button" class="btn sm" id="hexp">'+ic('download')+'Export</button>';
  const list=all.filter(a=>filt==='All'||a.type===filt);
  $('#hlist',L.el).innerHTML=list.length?list.map((e,i)=>'<div class="hrow">'+(e.actor==='System'?'<span class="avatar sys">'+ic('gauge')+'</span>':UI.avatar(e.actor))+'<div><b>'+esc(e.action)+'</b>'+(e.detail?'<div class="sm mut mt1">'+esc(e.detail)+'</div>':'')+(e.before!=null?'<div class="sm mt1"><span class="mut">'+esc(e.before)+'</span> &rarr; '+esc(e.after)+'</div>':'')+'<div class="sm mut mt1">'+esc(e.actor)+(e.role?' ('+esc(e.role)+')':'')+' &middot; '+UI.fdt(e.ts)+' WIB</div></div></div>').join(''):'<div class="empty"><b>No events</b></div>';
  $$('[data-t]',L.el).forEach(b=>b.onclick=()=>{filt=b.dataset.t;render();});
  $('#hexp',L.el).onclick=()=>{const name=IO.fname('History_'+objs[0],'xlsx');IO.writeBook([{name:'History',aoa:[['Time','Actor','Role','Type','Event','Detail','Object']].concat(list.map(e=>[UI.fdt(e.ts),e.actor,e.role||'',e.type||'',e.action,e.detail||'',e.obj||'']))}],name);toast('Downloading '+name);};}
 const hr=$('#hrefr',L.el);if(hr)hr.onclick=()=>{L.close();if(o.onRefresh)o.onRefresh();};
 render();return L;}
window.PANELS={cost,costChip,toll,history,tip,srcTag,slChip,mode,manualDialog,ADD_COMP,MAN_REASON};
})();
