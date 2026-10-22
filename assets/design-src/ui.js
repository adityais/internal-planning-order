/* MODA TMS Planning - shared UI helpers for the round-1 mockups (icons, chips, shell). */
(function(){
const P = {
 'check':'<path d="M20 6 9 17l-5-5"/>',
 'check-circle':'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
 'x':'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
 'x-circle':'<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
 'clock':'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
 'alert':'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
 'ban':'<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
 'swap':'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
 'flag':'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
 'truck':'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
 'user':'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 'shield':'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
 'thermo':'<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
 'pulse':'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
 'phone-app':'<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
 'helmet':'<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M14 6a6 6 0 0 1 6 6v3"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><rect x="2" y="15" width="20" height="4" rx="1"/>',
 'clip-check':'<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
 'wrench':'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
 'file':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
 'sheet':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
 'archive':'<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
 'download':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
 'up':'<path d="m18 15-6-6-6 6"/>','down':'<path d="m6 9 6 6 6-6"/>','right':'<path d="m9 18 6-6-6-6"/>','left':'<path d="m15 18-6-6 6-6"/>',
 'search':'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 'bell':'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
 'plus':'<path d="M5 12h14"/><path d="M12 5v14"/>','minus':'<path d="M5 12h14"/>',
 'filter':'<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
 'history':'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
 'cash':'<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
 'lock':'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
 'info':'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
 'calendar':'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
 'pin':'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
 'package':'<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
 'layers':'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
 'arrow':'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
 'more':'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
 'eye':'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
 'pencil':'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
 'trash':'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
 'refresh':'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
 'send':'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
 'home':'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
 'sliders':'<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
 'grid':'<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
 'list':'<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
 'table':'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M12 3v18"/>',
 'phone':'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
 'chat':'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
 'timer':'<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
 'route':'<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
 'merge':'<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
 'split':'<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>',
 'undo':'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
 'clip':'<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
 'activity':'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
 'pause':'<rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/>',
 'skip':'<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
 'stop':'<rect width="18" height="18" x="3" y="3" rx="2"/>',
 'zap':'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
 'building':'<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
 'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
 'moon':'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
 'gantt':'<path d="M3 3v18h18"/><rect x="7" y="6" width="6" height="3" rx="1"/><rect x="10" y="12" width="8" height="3" rx="1"/>',
 'inbox':'<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
 'id':'<path d="M16 10h2"/><path d="M16 14h2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect x="2" y="5" width="20" height="14" rx="2"/>',
 'gauge':'<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
 'shuffle':'<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
 'camera':'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
 'target':'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
 'banknote':'<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
 'play':'<polygon points="6 3 20 12 6 21 6 3"/>',
 'upload':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
 'copy':'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
 'cal-x':'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m14 14-4 4"/><path d="m10 14 4 4"/>'
};
function ic(n,c){return '<svg class="ic'+(c?' '+c:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(P[n]||'')+'</svg>';}
function hy(root){ (root||document).querySelectorAll('i[data-i]').forEach(e=>{const t=document.createElement('span');t.innerHTML=ic(e.dataset.i,e.className.replace('ic','').trim());e.replaceWith(t.firstChild);});}

/* ---------- status chips ---------- */
const ST={
 ready:['check-circle','Ready'], waiting:['clock','Waiting Check'], atrisk:['alert','At Risk'],
 pred:['cal-x','Predicted Not Ready'], notready:['x-circle','Not Ready'], replacing:['swap','Replacing'],
 exreq:['flag','Exception Requested'], withex:['check-circle','With Exception'], skipped:['ban','Skipped / Cancelled']
};
function st(k,o){o=o||{};const d=ST[k];const lg=o.lg?' lg':'';
 if(k==='withex')return '<span class="st withex'+lg+'"><span class="a">'+ic('check-circle')+(o.label||'Ready')+'</span><span class="b">'+ic('flag')+'</span></span>';
 return '<span class="st '+k+lg+'">'+ic(d[0])+(o.label||d[1])+'</span>';}
function tag(t,tone,icon,extra){return '<span class="tag '+(tone||'slate')+(extra?' '+extra:'')+'">'+(icon?ic(icon):'')+t+'</span>';}
function code(c,tone){return '<span class="tag code '+(tone||'slate')+'">'+c+'</span>';}
function wf(t,k){return '<span class="wf'+(k?' '+k:'')+'">'+t+'</span>';}
function cd(v,tone,lbl,o){o=o||{};return '<span class="cd '+(tone||'')+(o.lg?' lg':'')+'">'+ic(tone==='crit'?'timer':'clock')+v+(lbl?'<small>'+lbl+'</small>':'')+'</span>';}
function lh(){return '<span class="lh" title="Planned 31h, rest included">'+ic('route')+'Long-haul</span>';}
function exflag(t){return '<span class="exflag">'+ic('flag')+(t||'Exception')+'</span>';}
function duty(h,m,o){o=o||{};const lim=12*60,v=h*60+m;const pct=Math.min(100,v/lim*100);const cls=v>lim?'bad':(v>=11*60?'warn':'');
 return '<div class="duty '+cls+'"><div class="t"><span>'+(v>lim?ic('x-circle','s12'):'')+' Duty '+h+'h '+String(m).padStart(2,'0')+'m</span><span>/ 12h</span></div><div class="tr"><i style="width:'+pct+'%"></i></div></div>';}
function rest(h,m,min){min=min||8;const ok=(h*60+m)>=min*60;return '<span class="rest '+(ok?'ok':'bad')+'">'+ic(ok?'check':'x-circle','s12')+'Rest '+h+'h '+String(m).padStart(2,'0')+'m <span class="mut" style="font-weight:500">(min '+min+'h)</span></span>';}
function chk(on,dis){return '<span class="cb'+(on?' on':'')+(dis?' dis':'')+'">'+(on?ic('check'):'')+'</span>';}
function rdo(on){return '<span class="rd'+(on?' on':'')+'"></span>';}
function sw(on,l){return '<span class="sw'+(on?' on':'')+'"><i></i>'+(l||'')+'</span>';}
function avatar(n,c){const p=n.split(' ');return '<span class="avatar'+(c?' '+c:'')+'">'+(p[0][0]+(p[1]?p[1][0]:'')).toUpperCase()+'</span>';}
function rp(n){return 'Rp '+Math.round(n).toLocaleString('id-ID');}
function hm(min){min=Math.round(min);const h=Math.floor(min/60),m=min%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
function q(k,d){return new URLSearchParams(location.search).get(k)||d;}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ---------- navigation & personas ---------- */
const TOP=[['timeline','Timeline'],['master','Master Data'],['planning','Planning'],['order','Order & Delivery'],['monitor','Monitoring & Report']];
const PLAN_NAV=[
 ['Setup',[['project','Project Planning','file'],['alloc','Resource Allocation','users'],['mref','Milkrun Reference','layers']]],
 ['Milkrun',[['milkrun','Milkrun Planning','gantt'],['trips','Daily Trip Plan','calendar']]],
 ['Direct Delivery',[['dispatch','Trip Management','truck']]],
 ['Daily Ops',[['readiness','Readiness Board','clip-check']]],
 ['Admin',[['templates','Document Templates','sheet'],['tariff','Toll Tariff','cash']]]
];
const ORDER_NAV=[[null,[['inbox','Order Management','inbox'],['dealing','Pending Dealing','clock'],['assign','Assignment Queue','route']]]];
const PERSONAS={
 planner:{n:'Rina Kusumawati',r:'Planner',label:'Planner',all:true}, plannerlead:{n:'Rina Kusumawati',r:'Planner Lead',label:'Planner Lead',all:true},
 pm:{n:'Hendra Wijaya',r:'Project Manager',label:'PM',allow:['project','alloc','milkrun','trips','dispatch','readiness']},
 opslog:{n:'Bambang Suryadi',r:'OpsLog Dept Head',label:'OpsLog Dept Head',allow:['project','readiness','inbox','dealing','assign']},
 fieldops:{n:'Yusuf Hidayat',r:'Field Ops, Shift Day',label:'Field Ops',allow:['readiness','trips','inbox']},
 ccr:{n:'Dewi Anggraini',r:'CCR',label:'CCR',allow:['readiness','trips','dispatch','inbox']},
 vm:{n:'Sri Wahyuni',r:'Vehicle Management',label:'Vehicle Management',allow:['readiness']},dm:{n:'Agus Pratama',r:'Driver Management',label:'Driver Management',allow:['readiness']},
 supply:{n:'Teguh Prakoso',r:'Supply Management',label:'Supply Mgmt / Sales',allow:['alloc','dealing']}
};
const MENU=['planner','pm','opslog','fieldops','ccr','vm','dm','supply'];
function sidebar(module,active,persona,rail,badges){
 badges=badges||{};const pe=PERSONAS[persona]||PERSONAS.planner;
 const def=module==='order'?ORDER_NAV:PLAN_NAV;let h='<aside class="side'+(rail?' rail':'')+'" aria-label="Section navigation">';
 def.forEach(sec=>{const items=sec[1].filter(i=>pe.all||(pe.allow||[]).includes(i[0]));if(!items.length)return;
  if(sec[0]&&!rail)h+='<div class="sec">'+sec[0]+'</div>';else if(sec[0]&&rail)h+='<div style="height:12px"></div>';
  h+='<nav>'+items.map(i=>'<a href="#" class="'+(i[0]===active?'on':'')+'" title="'+i[1]+'">'+ic(i[2])+(rail?'':'<span>'+i[1]+'</span>')+(badges[i[0]]?'<span class="cnt">'+badges[i[0]]+'</span>':'')+'</a>').join('')+'</nav>';});
 if(module==='planning'&&pe.all)h+='<div class="foot"><nav style="padding:0"><a href="#" title="Planning Parameters">'+ic('sliders')+(rail?'':'<span>Planning Parameters</span>')+'</a></nav></div>';
 return h+'</aside>';}
function personaMenu(cur){return '<div style="position:fixed;top:52px;right:92px;width:268px;background:#fff;color:var(--text);border-radius:12px;box-shadow:var(--e-menu);border:1px solid var(--line);z-index:70;padding:8px">'+
 '<div class="sect" style="padding:6px 8px">View as</div>'+MENU.map(k=>'<div class="row" style="padding:8px;border-radius:9px;'+(k===cur?'background:var(--navy-s)':'')+'">'+avatar(PERSONAS[k].n)+'<div class="col" style="line-height:1.25"><b style="font-size:13px">'+PERSONAS[k].label+'</b><span class="sm mut">'+PERSONAS[k].n+'</span></div>'+(k===cur?'<span style="margin-left:auto;color:var(--navy)">'+ic('check')+'</span>':'')+'</div>').join('')+'</div>';}

function mount(o){
 const persona=o.persona||'planner',pe=PERSONAS[persona];const rail=o.device==='tablet';
 document.title=(o.title||'Planning')+' - MODA TMS';
 if(q('fit'))document.body.classList.add('fit');
 let h='<div class="app"><header class="appbar"><div class="logo"><div class="mk">M</div><div class="nm">MODA TMS</div></div>';
 h+='<nav class="topnav" aria-label="Modules">'+TOP.map(t=>'<a href="#" class="'+(t[0]===o.module?'on':'')+'">'+t[1]+'</a>').join('')+'</nav><div class="sp"></div>';
 h+='<div class="viewas" title="Prototype-only persona switcher">'+ic('eye')+'<span><small>View as</small><br>'+pe.label+'</span>'+ic('down','s12')+'</div>';
 h+='<button class="abtn" aria-label="Inbox">'+ic('bell')+(o.bell!==0?'<span class="badge">'+(o.bell||3)+'</span>':'')+'</button>';
 if(!rail)h+='<div class="whoami"><b>'+pe.n+'</b><small>'+pe.r+'</small></div>';
 h+=avatar(pe.n).replace('class="avatar"','class="avatar" style="background:#fff"')+'</header>';
 h+='<div class="workspace" style="'+(rail?'grid-template-columns:72px minmax(0,1fr)':'')+'">'+sidebar(o.module,o.active,persona,rail,o.badges)+'<main class="main">';
 h+='<div class="pagehead"><div class="col">'+(o.crumb?'<div class="crumb">'+o.crumb+'</div>':'')+'<h1>'+o.title+'</h1></div>'+(o.meta?'<div class="meta">'+o.meta+'</div>':'')+'<div class="sp"></div>'+(o.actions||'')+'</div>';
 h+='<div class="content" '+(o.contentStyle?'style="'+o.contentStyle+'"':'')+'>'+(o.content||'')+'</div></main></div></div>'+(o.overlay||'')+(o.personaOpen?personaMenu(persona):'');
 document.body.innerHTML=h;hy();
 const done=()=>{let n=0;document.querySelectorAll('.main,.dialog,.drawer,.ovl').forEach(e=>{n+=(e.innerText||'').trim().split(/\s+/).filter(Boolean).length});document.documentElement.setAttribute('data-w',n);const a=document.querySelector('.app');document.documentElement.setAttribute('data-h',Math.ceil(a.getBoundingClientRect().height));};
 requestAnimationFrame(()=>{done();setTimeout(done,300);});
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(done);
}
window.UI={ic,hy,st,tag,code,wf,cd,lh,exflag,duty,rest,chk,rdo,sw,avatar,rp,hm,q,esc,mount,P,PERSONAS,personaMenu,ST,sidebar,MENU};
})();


