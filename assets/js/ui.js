/* MODA TMS Planning - UI primitives: icon sprite, chips, formatters (from Design/src/assets/ui.js, refactored). */
(function(){
'use strict';
/* error collector for the self-test runner */
window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));const _ce=console.error;console.error=function(){window.__errs.push([].map.call(arguments,String).join(' '));return _ce.apply(console,arguments);};
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
 /* eye / edit / trash are the Master Data IC paths verbatim, so the row actions look identical in both prototypes */
 'eye':'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 'edit':'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>',
 'pencil':'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
 'trash':'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
 'refresh':'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
 'send':'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
 'home':'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
 'gear':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
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
 'cal-x':'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m14 14-4 4"/><path d="m10 14 4 4"/>',
 'fast':'<polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/>',
 'external':'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
 'sort':'<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>'
};
function ic(n,c){return '<svg class="ic'+(c?' '+c:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(P[n]||'')+'</svg>';}
function esc(s){return s==null?'':String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ---------- readiness chip (9 states, unique icon + outline shape) ---------- */
const ST={ready:['check-circle','Ready'],waiting:['clock','Waiting Check'],atrisk:['alert','At Risk'],pred:['cal-x','Predicted Not Ready'],notready:['x-circle','Not Ready'],replacing:['swap','Replacing'],exreq:['flag','Exception Requested'],withex:['check-circle','With Exception'],skipped:['ban','Skipped / Cancelled'],na:['minus','-']};
/* ===== Foundation v2: STATUS is the only coloured text. No icon, no pill, no background (Master Data cellText). =====
   UI.status(label[,tone]) -> <span class="stx green">Label</span>. Tone comes from one dictionary (STT) unless given.
   Everything that is not a status (Project Type, Fulfillment Type, Service Level, Category, Karoseri ...) is plain text. */
const STT={
 'Active':'green','Ready':'green','Published':'green','Assigned':'green','Converted':'green','Generated':'green','Fulfilled':'green','Answered':'green','Confirmed':'green','Covered':'green','Allocated':'green','Registered':'green','Approved':'green','Matched':'green','Released':'green','Completed':'green','Fit':'green','Pass':'green','Present':'green','With Exception':'green','Done':'green',
 'Pending':'amber','Pending PM':'amber','Need Clarification':'amber','Pending Dealing':'amber','Assigning':'amber','Re-sourcing':'amber','Waiting Check':'amber','At Risk':'amber','Open':'amber','Corrected':'amber','Exception Requested':'amber','Awaiting vendor':'amber','Select rate':'amber','Review needed':'amber','Waiting Approval':'amber','Predicted Not Ready':'amber','Fit with note':'amber','Late':'amber',
 'Not Ready':'red','Unfulfilled':'red','Short':'red','Rejected':'red','Unfit':'red','Fail':'red','Expired':'red','Not confirmed':'red','No rate':'red','Failed':'red','Duplicate':'red','Absent':'red','Unreachable':'red',
 'In Planning':'navy','PM Assigned':'navy','Planned':'navy','Scheduled':'navy','Calculated':'navy','Submitted':'navy','Ready to Assign':'navy','Replacing':'navy',
 'Draft':'slate','Closed':'slate','Inactive':'slate','Superseded':'slate','Cancelled':'slate','Dropped':'slate','Skipped':'slate','Skipped / Cancelled':'slate','Not allocated':'slate','Non Allocated':'slate','Waiting':'slate'};
function status(t,tone,title){const s=t==null?'':String(t);if(!s||s==='-')return '<span class="mut">-</span>';const k=tone||STT[s]||'slate';return '<span class="stx '+k+'"'+(title?' title="'+esc(title)+'"':'')+'>'+esc(s)+'</span>';}
/* readiness state key -> coloured text (same 9 states, no icon, no pill) */
const STK={ready:'green',waiting:'amber',atrisk:'amber',pred:'amber',notready:'red',replacing:'navy',exreq:'amber',withex:'green',skipped:'slate'};
function st(k,o){o=o||{};if(k==='na')return '<span class="mut">-</span>';const d=ST[k]||ST.waiting;const lbl=k==='withex'?'With Exception':(o.label||d[1]);return status(lbl,STK[k]||'slate',o.title||null);}
/* legacy chip helpers kept so every caller keeps working: they now render plain text (tag, code, lh, sl)
   or status text (ps, os, wf, wfa, exflag). The icon / extra arguments are ignored. */
function tag(t,tone,icon,extra,title){return '<span class="tx"'+(title?' title="'+esc(title)+'"':'')+'>'+t+'</span>';}
function code(c){return '<span class="tx">'+esc(c)+'</span>';}
function wf(t){return status(t);}
function wfa(t){return status(t);}
function os(s){return status(s);}
function ps(s){return status(s);}
function lh(t){return '<span class="tx" title="'+esc(t||'Long-haul trip, 4h rest included in ETA, excluded from 12h duty')+'">Long-haul</span>';}
function exflag(t,title){return status(t||'Exception','amber',title);}
function chk(on,dis){return '<span class="cb'+(on?' on':'')+(dis?' dis':'')+'">'+(on?ic('check'):'')+'</span>';}
function avatar(n,c){n=n||'?';const p=String(n).replace(/^PT /,'').split(' ');return '<span class="avatar'+(c?' '+c:'')+'" aria-hidden="true">'+esc((p[0][0]+(p[1]?p[1][0]:'')).toUpperCase())+'</span>';}
function sl(s){return '<span class="tx">'+esc(s||'-')+'</span>';}
/* ===== Row actions (Master Data pattern): icon-only View / Edit / Delete, same order, same icons, tooltip + aria-label =====
   UI.actions({view:true,edit:true,del:true}[,{id:'AL-0001',name:'Allocation AL-0001'}]) -> html for one table cell.
   A kind that is false/absent renders an invisible placeholder so the icons stay aligned from row to row.
   Wiring: C.table({actions:{view:fn(row),edit:fn(row),del:fn(row),can:(kind,row)=>bool}}) or UI.wireActions(root,fn(kind,id)). */
const ACT_DEF=[['view','eye','View',''],['edit','edit','Edit',''],['del','trash','Delete','del']];
function actions(o,meta){o=o||{};meta=meta||{};const nm=meta.name?' '+esc(meta.name):'';
 return '<span class="acts">'+(meta.defs||ACT_DEF).map(d=>o[d[0]]?'<button type="button" class="iconbtn '+d[3]+'" data-a="'+d[0]+'" data-id="'+esc(meta.id==null?'':meta.id)+'" title="'+((meta.labels||{})[d[0]]||d[2])+'" aria-label="'+((meta.labels||{})[d[0]]||d[2])+nm+'">'+ic(d[1])+'</button>':'<span class="iconbtn ph" aria-hidden="true"></span>').join('')+'</span>';}
/* ===== Ownership wording, one dictionary for every page: units MODA owns = Own Asset, units from a vendor = Transporter, both = Mix.
   Stored values stay as they are (Own, Internal, In House, Vendor, Outsource ...); only what is shown goes through UI.own(). The company name of a transporter is shown as Vendor. ===== */
const OWN_LBL={Own:'Own Asset',Dedicated:'Own Asset','Own Asset':'Own Asset',Internal:'Own Asset','In House':'Own Asset',Vendor:'Transporter',Transporter:'Transporter',Outsource:'Transporter',Mix:'Mix'};
function own(v){return OWN_LBL[v]||v||'';}
function wireActions(root,fn){(root||document).querySelectorAll('button[data-a]').forEach(b=>{if(b.dataset.w)return;b.dataset.w='1';b.addEventListener('click',e=>{e.stopPropagation();fn(b.dataset.a,b.dataset.id,b);});});}

/* ---------- formatters ---------- */
function rp(n){return 'Rp '+Math.round(n||0).toLocaleString('id-ID');}
function num(n,d){return Number(n||0).toLocaleString('id-ID',{minimumFractionDigits:d||0,maximumFractionDigits:d==null?2:d});}
function m3(n){return num(n,1)+' m3';}
function pad(n){return String(n).padStart(2,'0');}
/* minutes from midnight -> HH:MM, "(+1)" when next day */
function hm(min,o){if(min==null||isNaN(min))return '-';min=Math.round(min);let d=Math.floor(min/1440);let m=((min%1440)+1440)%1440;return pad(Math.floor(m/60))+':'+pad(m%60)+(d>0&&!(o&&o.noDay)?' (+1)':'');}
function parseHM(s){const m=/^(\d{1,2})[:.](\d{2})$/.exec(String(s||'').trim());if(!m)return null;const h=+m[1],mi=+m[2];if(h>47||mi>59)return null;return h*60+mi;}
function dur(min){min=Math.max(0,Math.round(min));const h=Math.floor(min/60),m=min%60;return h+'h '+pad(m)+'m';}
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function dt(d){d=d instanceof Date?d:new Date(d);return d;}
function fdate(d,o){d=typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(d+'T00:00:00'):dt(d);if(isNaN(d))return '-';return (o&&o.dow?DOW[d.getDay()]+', ':'')+d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear();}
function ftime(ts){return fdt(ts);}/* a timestamp always shows its date too: 23 October 2026 22:33 */
function fdt(ts){const d=dt(ts);if(isNaN(d))return '-';return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes());}
function iso(d){d=dt(d);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function addDays(s,n){const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return iso(d);}
function dayGroup(s){const w=new Date(s+'T00:00:00').getDay();return w===5?'fri':(w===0||w===6)?'we':'wd';}
function stamp(ts){const d=dt(ts);return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'_'+pad(d.getHours())+pad(d.getMinutes());}
function q(k,d){try{return new URLSearchParams(location.search).get(k)||d;}catch(e){return d;}}
function uid(p){return (p||'ID')+'-'+Date.now().toString(36).toUpperCase()+Math.floor(Math.random()*1296).toString(36).toUpperCase();}
function parseRp(s){if(typeof s==='number')return s;const v=String(s||'').replace(/[^0-9]/g,'');return v?parseInt(v,10):0;}
function plural(n,w,ws){return n+' '+(n===1?w:(ws||w+'s'));}

/* duty meter / rest chip computed from minutes */
function duty(min,o){o=o||{};if(o.exempt)return '<span class="tag navy">'+ic('route')+'Duty exempt</span>';const lim=720;const pct=Math.min(100,min/lim*100);const cls=min>lim?'bad':(min>=660?'warn':'');
 return '<div class="duty '+cls+'" role="meter" aria-valuemin="0" aria-valuemax="720" aria-valuenow="'+Math.round(min)+'" aria-label="Duty '+dur(min)+' of 12h"><div class="t"><span>'+(min>lim?ic('x-circle','s12'):'')+' Duty '+dur(min)+'</span><span>/ 12h</span></div><div class="tr"><i style="width:'+pct+'%"></i></div></div>';}
function rest(min,minH){minH=minH||8;const ok=min>=minH*60;return '<span class="rest '+(ok?'ok':'bad')+'">'+ic(ok?'check':'x-circle','s12')+'Rest '+dur(min)+' <span class="mut fw5">(min '+minH+'h)</span></span>';}
/* countdown chip from a deadline (ms). Tone thresholds 60 / 15 min. */
function cdTone(ms){const m=ms/60000;return m<15?'crit':m<=60?'warn':'';}
function cdText(ms){if(ms<=0)return '00:00';const s=Math.floor(ms/1000),m=Math.floor(s/60);if(m<15)return pad(m)+':'+pad(s%60);if(m<=60)return m+' min';return Math.floor(m/60)+'h '+pad(m%60)+'m';}
function cd(deadline,lbl,o){o=o||{};return '<span class="cd" role="timer" data-deadline="'+deadline+'"'+(lbl!=null?' data-lbl="'+esc(lbl)+'"':'')+(o.lg?' data-lg="1"':'')+'></span>';}
/* Unit type = two separate fields (Master Data lists): Category (chassis) + Karoseri (body). Internal match key = "Category Karoseri". */
const CATS=['CDE','CDD','Fuso','Tronton','Trailer','Blindvan','Hiace'],KAROS=['Wingbox','Bak Terbuka','Box','Flatbed','Long','Reguler','Car Towing'];
function splitType(k){k=String(k||'').trim();const c=CATS.find(x=>k===x||k.indexOf(x+' ')===0)||k.split(' ')[0]||'';return {cat:c,kar:k.slice(c.length).trim()};}
const typeKey=(c,k)=>(c+' '+k).trim();
function typeChips(k){const t=splitType(k);return '<span class="tx">'+esc((t.cat+' '+t.kar).trim()||'-')+'</span>';}
window.UI={own,CATS,KAROS,splitType,typeKey,typeChips,P,ic,esc,status,STT,actions,wireActions,st,tag,code,wf,wfa,os,ps,lh,exflag,chk,avatar,sl,rp,num,m3,hm,parseHM,dur,fdate,ftime,fdt,iso,addDays,dayGroup,stamp,q,uid,parseRp,plural,pad,duty,rest,cd,cdTone,cdText,ST,MON,DOW};
})();
