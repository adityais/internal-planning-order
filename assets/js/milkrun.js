/* Milkrun shared logic for list / wizard / step 5 / trips: plan CRUD, preconditions, matrix + order parsing,
   route result (C6-C11), checklist, publish / revise, documents, schedule export. */
(function(){
'use strict';
const {esc}=UI;
const all=()=>STORE.get('milkrunPlans');
const byId=id=>all().find(p=>p.id===id);
function save(p,action,detail,type){const a=all();const i=a.findIndex(x=>x.id===p.id);p.updatedAt=STORE.now();p.updatedBy=STORE.me().n;if(i>=0)a[i]=p;else a.unshift(p);STORE.set('milkrunPlans',a);if(action)STORE.audit({action,detail,obj:p.key,type:type||'Status'});return p;}
function newId(){const n=Math.max(...all().map(p=>+p.key.split('-')[2]||0))+1;return 'MP-2026-'+String(n).padStart(4,'0');}
/* D89: plans use a selectable start-end range, so every list/crumb/export shows the actual range */
function rangeLabel(p){const a=p.period&&p.period[0],b=p.period&&p.period[1];if(!a)return '-';
 const da=new Date(a+'T00:00:00'),db=new Date((b||a)+'T00:00:00');
 if(da.getMonth()===db.getMonth()&&da.getFullYear()===db.getFullYear())return da.getDate()+'–'+db.getDate()+' '+UI.MON[db.getMonth()]+' '+db.getFullYear();
 return UI.fdate(a,{noYear:1})+' – '+UI.fdate(b);}
function operatingDays(pr,period){let n=0,d=period[0];while(d<=period[1]){if(DOM.operating(pr,d))n++;d=UI.addDays(d,1);}return n;}
/* C6-C11 per route */
function result(p,dg){const pa=DOM.params();return DOM.planRoutes(p,dg||'wd').map(r=>{const eff=r.volCycle/r.cap*100;return {id:r.id,name:r.name,veh:r.vehicle.chassis+' '+r.vehicle.body,cap:r.cap,volDay:r.volDay,tco:r.volIncl,cycles:r.cycles,base:r.baseCycles,volCycle:r.volCycle,liq:r.volCycle*pa.liqVol,eff,exceeds:eff>100,suppliers:r.stops.map(s=>s.loc)};});}
function stats(p){if(!p.matrix||!p.matrix.length)return null;try{const s=DOM.planSchedule(p,'wd');if(!s)return null;const r=result(p);return {routes:r.length,eff:r.reduce((a,x)=>a+x.eff,0)/r.length,units:s.stats.units,drivers:s.stats.drivers,allocUnits:s.stats.allocUnits,allocDrivers:s.stats.allocDrivers,sch:s};}catch(e){console.warn(e);return null;}}
function dayGroups(p){const pr=MD.project(p.projectId);return DOM.DG.map(d=>({id:d[0],label:d[1],hours:DOM.hours(pr,d[0]),disabled:!DOM.hours(pr,d[0]),same:d[0]==='fri'&&!(pr.hours&&pr.hours.fri)}));}
/* FR-4 precondition */
function precondition(projectId,period,key){const pr=MD.project(projectId);const issues=[];if(!pr)return [{t:'Select a Customer Project'}];
 const pp=STORE.get('projectPlans').find(x=>x.projectId===projectId);
 if(!pp||!pp.pm)issues.push({t:'No PM assigned',href:'project-planning.html'+(pp?'?id='+pp.id:'')});
 if(pr.status!=='Active')issues.push({t:'Customer Project not Active',href:MD.MDPATH+'customer-rate.html'});
 const ref=DOM.refOf(projectId);if(!ref||!ref.routeGroups.length||!ref.parts.length)issues.push({t:'No active Milkrun Reference',href:'milkrun-ref.html?project='+projectId});
 if(!pr.hours||!(pr.hours.wd||pr.hours.fri||pr.hours.we))issues.push({t:'Operating hours not set: '+(pr.hoursLoc||pr.name),href:MD.MDPATH+'customer.html'});
 if(period&&period[0]){const ov=covering(projectId,period,key);if(ov)issues.push({t:ov.key+' covers this period and will be Closed when this plan is published.',href:'milkrun-wizard.html?plan='+ov.id+'&step=6',warn:true});}
 return issues;}
/* QA-004 (PM rule): one active plan (Scheduled / Published) per project + period; a revised plan is a new plan and closes the one it revised on publish */
function covering(projectId,period,key){if(!period||!period[0])return null;const pr=MD.project(projectId);const same=x=>x.projectId===projectId||(pr&&MD.project(x.projectId)===pr);
 return all().find(x=>same(x)&&x.key!==key&&(x.status==='Scheduled'||x.status==='Published')&&x.period[0]<=period[1]&&x.period[1]>=period[0])||null;}
/* D89: every same-project Scheduled/Published plan whose period intersects will be Closed by this publish. Draft,
   Calculated, non-overlapping, future and other-project plans are never in this list. */
function closing(p){if(!p)return [];const pr=MD.project(p.projectId);const same=x=>x.projectId===p.projectId||(pr&&MD.project(x.projectId)===pr);
 return all().filter(x=>x.id!==p.id&&same(x)&&(x.status==='Scheduled'||x.status==='Published')&&x.period[0]<=p.period[1]&&x.period[1]>=p.period[0]);}
/* §12.3: cycle/time/slot changes invalidate a previously signalled readiness; the plan must be reviewed again. */
function invalidate(p,reason){if(!p||p.status!=='Scheduled')return false;p.status='Calculated';p.readyStale={at:STORE.now(),reason:reason||'Schedule changed',by:STORE.me().n};return true;}
/* FR-6/7 Volume Matrix (variant A): one sheet per Route Group */
function parseMatrix(wb,p){const ref=DOM.refOf(p.projectId,p);const rows=[],errors=[];const sheets=[];
 wb.SheetNames.forEach(sn=>{const g=ref.routeGroups.find(x=>sn.trim().toUpperCase().indexOf(x.id)===0);
  if(!g){errors.push({sheet:sn,row:'-',field:'Sheet',value:sn,reason:'Not a Route Group in the plan Reference Snapshot',level:'error'});return;}
  const aoa=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:true,defval:''});const hi=aoa.findIndex(r=>r.some(c=>/supplier/i.test(String(c)))&&r.some(c=>/vendor site/i.test(String(c))));
  if(hi<0){errors.push({sheet:sn,row:1,field:'Header',value:'',reason:'SUPPLIER and VENDOR SITE headers not found',level:'error'});return;}
  const H=aoa[hi].map(x=>IO.normH(x));const col=n=>H.findIndex(h=>h===n||h.indexOf(n)===0);
  const cS=col('supplier'),cV=col('vendor site'),cD=H.findIndex(h=>/shop|dock/.test(h)),cP=col('part category'),cVol=H.findIndex(h=>/vol.*day/.test(h)),cI=col('cycle issue'),cT=H.map((h,i)=>/^(no )?trip ?\d+/.test(h)?i:-1).filter(i=>i>=0),cTot=col('total cycle'),cSt=col('milkrun start');
  let n=0;sheets.push(g.id);
  for(let i=hi+1;i<aoa.length;i++){const r=aoa[i];if(r.some(c=>/volume total/i.test(String(c))))break;if(r.every(c=>String(c).trim()===''))continue;
   const sup=String(r[cS]||'').trim();const vol=IO.toNum(r[cVol]);const rowNo=i+1;
   const memb=g.stops.find(s=>s.loc.toLowerCase()===sup.toLowerCase()||s.loc.toLowerCase().replace(/^pt /,'')===sup.toLowerCase().replace(/^pt /,''));
   let bad=false;if(!sup){errors.push({sheet:sn,row:rowNo,field:'Supplier',value:'(empty)',reason:'Required',level:'error'});bad=true;}
   else if(!memb){errors.push({sheet:sn,row:rowNo,field:'Supplier',value:sup,reason:'Not a member of '+g.id,level:'error'});bad=true;}
   if(vol==null||isNaN(vol)||vol<=0){errors.push({sheet:sn,row:rowNo,field:'Vol/Day',value:String(r[cVol]),reason:'Must be more than 0',level:'error'});bad=true;}
   const st=cSt>=0?IO.toDate(r[cSt]):null;if(st&&st!=='INVALID'&&(st<p.period[0]||st>p.period[1]))errors.push({sheet:sn,row:rowNo,field:'Milkrun Start',value:st,reason:'Outside period',level:'warn'});
   const trips=cT.map(c=>String(r[c]).trim()!==''&&String(r[c]).trim()!=='0'?1:0);
   rows.push({route:g.id,supplier:memb?memb.loc:sup,site:cV>=0?String(r[cV]):'',dock:cD>=0?String(r[cD]):'',partCat:cP>=0?String(r[cP]):'',volDay:vol>0?vol:0,cycleIssue:cI>=0?String(r[cI]):'',trips,start:st&&st!=='INVALID'?st:'',total:cTot>=0?IO.toNum(r[cTot]):null,_err:bad,_sheet:sn,_row:rowNo});n++;}
  if(!n)errors.push({sheet:sn,row:'-',field:'Rows',value:'',reason:'No supplier rows',level:'error'});});
 ref.routeGroups.forEach(g=>{if(sheets.indexOf(g.id)<0)errors.push({sheet:g.id,row:'-',field:'Sheet',value:'',reason:'Missing sheet for '+g.id,level:'warn'});});
 return {rows,errors,sheets};}
function matrixTemplate(p){const ref=DOM.refOf(p.projectId,p);const sheets=ref.routeGroups.map(g=>{const N=Math.max(1,...(p.matrix||[]).filter(m=>m.route===g.id).map(m=>(m.trips||[]).length),5);
  const head=['SUPPLIER','VENDOR SITE','SHOP/DOCK','PART CATEGORY','VOL/DAY','CYCLE ISSUE'].concat(Array.from({length:N},(x,i)=>'TRIP '+(i+1)),['TOTAL CYCLE','MILKRUN START']);
  const rows=g.stops.map((s,i)=>{const m=(p.matrix||[]).find(x=>x.route===g.id&&x.supplier===s.loc)||{};const vol=m.volDay||(8+i*2);return [s.loc,m.site||'Plant '+(1+i%2),m.dock||'Dock '+(i+1),m.partCat||'Body',vol,''].concat(Array.from({length:N},(x,k)=>m.trips?(m.trips[k]?1:''):1),[N,p.period[0]]);});
  return {name:g.id+' '+g.name,aoa:[head].concat(rows,[['VOLUME TOTAL','','','',rows.reduce((a,r)=>a+(+r[4]||0),0)]])};});
 IO.writeBook(sheets,'Volume_Matrix_'+(MD.project(p.projectId)||{}).code+'_'+p.period[0].slice(0,7)+'.xlsx');}
/* FR-9..13 Order data (variant B) */
function parseOrders(wb,p){const ref=DOM.refOf(p.projectId,p);const aoa=IO.sheetRows(wb);
 return IO.validate(aoa,[{k:'model',h:'Model',req:1,ref:x=>ref.boms.some(b=>b.model===x),refMsg:'Model not in BOM (Reference Snapshot)'},{k:'katashiki',h:'Katashiki Suffix'},{k:'modelName',h:'Model Name'},{k:'month',h:'Month',req:1,type:'num',min:1,max:12},{k:'year',h:'Year',req:1,type:'num',min:2025},{k:'qty',h:'Qty',req:1,type:'num',min:1}],{key:r=>r.model,keyLabel:'Model'});}
/* C1-C5 order x BOM -> supplier volume per operating day */
function volumeFromOrders(p){const ref=DOM.refOf(p.projectId,p);const pr=MD.project(p.projectId);const opDays=operatingDays(pr,p.period)||1;const sup={},parts=[];
 (p.orders||[]).filter(o=>!o.excluded).forEach(o=>ref.boms.filter(b=>b.model===o.model).forEach(b=>{const pt=ref.parts.find(x=>x.partNo===b.partNo);if(!pt){parts.push({partNo:b.partNo,model:o.model,err:'Master Data Not Found'});return;}
  const req=o.qty*b.qty;const vpu=pt.boxVol/pt.capBox;const ship=req*vpu;parts.push({partNo:pt.partNo,name:pt.name,supplier:pt.supplier,req,vpu,ship});sup[pt.supplier]=(sup[pt.supplier]||0)+ship;}));
 const matrix=[];ref.routeGroups.forEach(g=>g.stops.forEach(s=>matrix.push({route:g.id,supplier:s.loc,volDay:+((sup[s.loc]||0)/opDays).toFixed(2),trips:[]})));
 const orphan=Object.keys(sup).filter(s=>!ref.routeGroups.some(g=>g.stops.some(x=>x.loc===s)));
 return {matrix,parts,opDays,orphan,supplierVol:sup};}
/* step 6 checklist (FR-28/29) */
function checklist(p){const s=stats(p);const r=result(p);const issues=[];
 const sch=s&&s.sch;const infeasible=sch?sch.stats.infeasibleRoutes:[];const conflicts=sch?sch.stats.conflicts+sch.stats.dutyBreaches+sch.stats.restBreaches:0;
 const exceeds=r.filter(x=>x.exceeds&&!(p.overrides&&p.overrides[x.id]));
 const short=s?Math.max(0,s.units-s.allocUnits)+Math.max(0,s.drivers-s.allocDrivers):0;
 const tollBad=r.filter(x=>{const t=(p.toll||{})[x.id];if(!t||!t.cond)return true;if(t.cond==='none')return false;return DOM.tollEval(t,'CDD',p.period[0]).missing;});
 const manual=sch?sch.stats.manual:0;
 return [{k:'Routes scheduled',ok:!!sch&&!infeasible.length,d:infeasible.length?infeasible.join(', ')+' outside window':''},{k:'No conflicts',ok:conflicts===0,d:conflicts?UI.plural(conflicts,'conflict'):''},{k:'Exceeds resolved',ok:!exceeds.length,d:exceeds.map(x=>x.id).join(', ')},
  {k:'Short acknowledged',ok:!short||!!p.shortAck,d:short?'Short '+short:''},{k:'Toll setup',ok:!tollBad.length,d:tollBad.length?tollBad.map(x=>x.id).join(', ')+' needs gate pairs':''},{k:UI.plural(manual,'manual edit'),ok:true,info:true}]
  .concat(p.readyStale?[{k:'Schedule revalidated',ok:false,d:'Changed after the last review ('+((p.readyStale&&p.readyStale.reason)||'schedule changed')+'). Revalidate the schedule before Publish.',href:'milkrun-step5.html?plan='+p.id}]:[])
  .concat((()=>{const cv=p.status==='Published'||p.status==='Superseded'||p.status==='Closed'?null:covering(p.projectId,p.period,p.key);return cv?[{k:'Replaces '+cv.key,ok:true,info:true,d:cv.key+' covers this period and will be Closed on publish',href:'milkrun-wizard.html?plan='+cv.id+'&step=6'}]:[];})());}
function docsFor(p,ver){const ref=DOM.refOf(p.projectId,p);const out=[];
 ref.routeGroups.forEach(g=>out.push({type:'PUTS',scope:p.key,planId:p.id,route:g.id,routeName:g.name}));out.push({type:'Controller Check Sheet',scope:p.key,planId:p.id,route:'All routes'});
 ref.routeGroups.forEach(g=>out.push({type:'Truck Information',scope:p.key,planId:p.id,route:g.id,routeName:g.name}));out.push({type:'Driver Check Sheet',scope:p.key,planId:p.id,route:'All routes'});return out;}
/* D89 publish handler: authorization + readiness rechecked here (UI gates alone are not enough), then every
   Scheduled / Published plan of the SAME Customer Project whose period intersects is closed immediately.
   Draft, Calculated, non-overlapping, future and other-project plans are untouched; generated trips are never
   mutated. */
function publish(p){if(!p)return null;
 if(['Draft','Scheduled','Calculated'].indexOf(p.status)<0){C.toast('Only Draft or Scheduled plans can be published',{tone:'err'});return null;}
 if(!STORE.can('publishMilkrun')){C.toast('Only PM can publish a Milkrun plan',{tone:'err'});return null;}
 const blockers=checklist(p).filter(c=>!c.ok&&!c.info);
 if(blockers.length){C.toast('Cannot publish: '+blockers.map(b=>b.k).join(', '),{tone:'err'});return null;}
 const pr=MD.project(p.projectId);
 const same=x=>x.projectId===p.projectId||(pr&&MD.project(x.projectId)===pr);
 const a=all();const closed=[];
 a.forEach(x=>{if(x.id===p.id||!same(x))return;if(['Scheduled','Published'].indexOf(x.status)<0)return;
  if(!(x.period[0]<=p.period[1]&&x.period[1]>=p.period[0]))return;
  const from=x.status;
  x.status='Closed';x.closedBy=p.id;x.closedAt=STORE.now();x.closeReason='Closed by publish of '+p.key;
  x.disposition=from;closed.push(x.key);});
 STORE.set('milkrunPlans',a);
 p.status='Published';delete p.readyStale;if(p.refSnap)p.refSnap.frozen=true;p.publishedBy=STORE.me().n;p.publishedAt=STORE.now();p.effective=p.revisionOf?(p.effective||UI.addDays(STORE.today(),1)):p.period[0];
 save(p,'Published','Effective '+UI.fdate(p.effective)+(closed.length?'; closed '+closed.join(', '):''));
 DOCS.regenerate(d=>d.scope===p.key&&d.scope!=='daily',()=>docsFor(p));
 STORE.notify({kind:'Info',to:['planner','plannerlead','ccr'],title:p.key+' published',link:'milkrun-step5.html?plan='+p.id});return p;}
/* FR-47: Draft / Scheduled only. Replaces the plan snapshot with the current Reference and recalculates (variant B volumes are rebuilt from the orders). */
function refreshRef(p){if(['Draft','Scheduled'].indexOf(p.status)<0)return false;p.refSnap=REF.snapshot(p.project);if(p.inputType==='B'&&(p.orders||[]).length)p.matrix=volumeFromOrders(p).matrix;save(p,'Reference snapshot refreshed','From Reference of '+UI.fdt(STORE.now()));return true;}
/* Revise = a new plan with its own unique Plan ID (no plan versions); publishing it closes the plan it revised (same project + overlapping period). */
function revise(p){const n=JSON.parse(JSON.stringify(p));n.id=n.key=newId();n.revisionOf=p.key;n.status='Draft';if(n.refSnap)n.refSnap.frozen=false;n.step=5;n.effective=UI.addDays(STORE.today(),1);delete n.publishedAt;delete n.publishedBy;delete n.readyStale;n.shortAck=false;save(n,'Revised from '+p.key,n.key+' created as Draft');return n;}
function exportSchedule(p){const sheets=[];dayGroups(p).filter(d=>!d.disabled).forEach(d=>{const s=DOM.planSchedule(p,d.id);if(!s)return;const maxS=Math.max(...s.cycles.map(c=>c.stops.length));
  sheets.push({name:d.label.replace(/[^A-Za-z]/g,''),aoa:[['Route','Cycle','Shift','Out Pool'].concat(Array.from({length:maxS},(x,i)=>['Stop '+(i+1),'IN','OUT']).flat(),['In Pool','Unit','Driver slot','Manual','Outside window'])].concat(s.cycles.map(c=>[c.route,c.cycle,c.shift,UI.hm(c.out)].concat(Array.from({length:maxS},(x,i)=>c.stops[i]?[c.stops[i].loc,UI.hm(c.stops[i].in),UI.hm(c.stops[i].out)]:['','','']).flat(),[UI.hm(c.inPool),c.unit||'',c.driver||'',c.manual?'Yes':'',c.outside?'Yes':''])))});});
 const n='Route_Schedule_'+p.key+'_'+UI.stamp(STORE.now())+'.xlsx';IO.writeBook(sheets,n);C.toast('Downloading '+n);STORE.audit({action:'Exported route schedule',obj:p.key,type:'Export'});}
/* driver slot -> real driver name (allocation order: FR-17 stable by Allocation ID ascending) */
function slotNames(p){const pr=MD.project(p.projectId);const seq=a=>{const m=/(\d+)\s*$/.exec(String((a&&a.id)||''));return m?+m[1]:0;};
 const al=DOM.allocDrivers(pr.code).sort((a,b)=>(a.role===b.role?0:a.role==='Default'?-1:1)||(seq(a)-seq(b)));return s=>{const i=parseInt(String(s).replace(/\D/g,''),10)-1;const a=al[i];return a?(MD.driver(a.driver)||{}).name:'';};}
window.MR={covering,closing,all,byId,save,newId,rangeLabel,operatingDays,result,stats,dayGroups,precondition,parseMatrix,matrixTemplate,parseOrders,volumeFromOrders,checklist,docsFor,publish,revise,refreshRef,invalidate,exportSchedule,slotNames};
})();
