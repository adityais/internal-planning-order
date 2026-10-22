/* Milkrun Plan List: status filter, actions per status, duplicate, cancel, delete, export. */
(function(){
const {ic,esc,tag,ps}=UI;const {$,$$,DLG,toast}=C;
const can=STORE.can('plan');
if(!SHELL.mount({module:'planning',id:'milkrun',active:'milkrun',title:'Milkrun Planning',crumb:'Milkrun',actions:'<button type="button" class="btn" id="exp">'+ic('download')+'Export</button>'+(can?'<a class="btn primary" href="milkrun-wizard.html">'+ic('plus')+'New plan</a>':'')}))return;
let filter=UI.q('status','All');const cache={};
const st=p=>cache[p.id+p.updatedAt]||(cache[p.id+p.updatedAt]=MR.stats(p));
const STEPS=['Plan Info','Volume & Matrix','Route Grouping','Result','Schedule & Chaining','Resource & Review'];
/* PM §11: only the meaningful operational states are visible. Calculated is the internal state written when a
   Scheduled plan is changed and needs revalidation, so it is presented and filtered as Draft (never as an
   implementation step); terminal states present as the single Archived badge Closed. */
const disp=p=>['Superseded','Cancelled','Closed'].indexOf(p.status)>=0?'Closed':p.status==='Calculated'?'Draft':p.status;
const isDraft=p=>p.status==='Draft'||p.status==='Calculated';
function view(p){return isDraft(p)?(p.step>=5?'milkrun-step5.html?plan='+p.id:'milkrun-wizard.html?plan='+p.id+'&step='+(p.step||1)):'milkrun-step5.html?plan='+p.id;}
function acts(p){const b=(a,i,l,h)=>h?'<a class="iconbtn" href="'+h+'" aria-label="'+l+' '+p.key+'" title="'+l+'">'+ic(i)+'</a>':'<button type="button" class="iconbtn" data-a="'+a+'" data-id="'+p.id+'" aria-label="'+l+' '+p.key+'" title="'+l+'">'+ic(i)+'</button>';
 const s=p.status;let h=b('','eye','View',view(p));
 if(isDraft(p)&&can)h+=b('','pencil','Open plan',view(p))+b('del','trash','Delete');
 if(s==='Scheduled')h+=(can?b('','pencil','Edit','milkrun-step5.html?plan='+p.id):'')+(can?b('dup','copy','Duplicate'):'')+b('dl','download','Download')+(can?b('cancel','ban','Cancel'):'');
 if(s==='Published'||s==='Closed'||s==='Superseded'||s==='Cancelled')h+=(can&&s!=='Cancelled'?b('dup','copy','Duplicate'):'')+b('dl','download','Download');
 return '<div class="u-justify-content-flex-end-gap-2 row">'+h+'</div>';}
function render(){const all=MR.all();const cnt=s=>all.filter(p=>p.status===s).length;
 $('#content').innerHTML=PL.seg([['All','All'],['Draft','Draft '+all.filter(isDraft).length],['Scheduled','Scheduled '+cnt('Scheduled')],['Published','Published '+cnt('Published')],['Archived','Archived '+(cnt('Superseded')+cnt('Cancelled')+cnt('Closed'))]],filter,'data-f',{label:'Status'})+'<div class="panel mt4" id="tbl"></div>';
 const T=C.table($('#tbl'),{key:'id',minw:1100,label:'Milkrun plans',rows:()=>MR.all().filter(p=>filter==='All'||(filter==='Archived'?/Superseded|Cancelled|Closed/.test(p.status):filter==='Draft'?isDraft(p):p.status===filter)).sort((a,b)=>b.period[0].localeCompare(a.period[0])||b.key.localeCompare(a.key)),
 cols:[{k:'status',h:'Status',cls:'stc',w:114,render:p=>ps(disp(p))},
   {k:'key',h:'Plan',render:p=>'<span class="mono">'+p.key+'</span>'},{k:'project',h:'Project'},{k:'period',h:'Period',sortv:p=>p.period[0],text:p=>MR.rangeLabel(p)},{k:'inputType',h:'Input'},
   {k:'routes',h:'Routes',cls:'num',text:p=>{const s=st(p);return s?s.routes:'';}},{k:'eff',h:'Efficiency',cls:'num',text:p=>{const s=st(p);return s?Math.round(s.eff)+'%':'';}},
   {k:'ud',h:'Units / Drivers',cls:'num',text:p=>{const s=st(p);return s?s.units+' / '+s.drivers:'';}},
   {k:'upd',h:'Updated',sortv:p=>p.updatedAt,text:p=>(p.updatedBy||'')+' '+UI.fdt(p.updatedAt),render:p=>'<span class="sm">'+esc(p.updatedBy||'')+'</span><div class="xs mut">'+UI.fdt(p.updatedAt)+'</div>'},
   {k:'_act',h:'Action',cls:'act',sortable:false,render:acts}],empty:{text:'No Milkrun plans yet',action:can?'New plan':null,fn:()=>location.href='milkrun-wizard.html'},
  after:h=>$$('[data-a]',h).forEach(b=>b.onclick=()=>act(b.dataset.a,MR.byId(b.dataset.id)))});
 $$('[data-f]').forEach(b=>b.onclick=()=>{filter=b.dataset.f;render();});
 $('#exp').onclick=()=>IO.exportDialog({title:'Milkrun plans',name:'Milkrun_Plans',rows:()=>T.filtered(),page:()=>T.pageRows(),all:()=>MR.all(),cols:[{h:'Status',v:p=>disp(p)},{h:'Plan',v:p=>p.key},{h:'Project',v:p=>p.project},{h:'Period',v:p=>MR.rangeLabel(p)},{h:'Start',v:p=>p.period[0]},{h:'End',v:p=>p.period[1]},{h:'Input',v:p=>p.inputType},{h:'Routes',v:p=>(st(p)||{}).routes||''},{h:'Efficiency %',v:p=>st(p)?Math.round(st(p).eff):''},{h:'Units',v:p=>(st(p)||{}).units||''},{h:'Drivers',v:p=>(st(p)||{}).drivers||''}]});
 if(UI.q('state')==='empty')$('#tbl').innerHTML=PL.empty('No Milkrun plans yet',can?'New plan':null,'np');}
function act(a,p){
 if(a==='dl')return MR.exportSchedule(p);
 if(a==='del')return DLG.confirm({title:'Delete '+p.key,body:'Draft is removed.',ok:'Delete',danger:true}).then(ok=>{if(!ok)return;STORE.set('milkrunPlans',MR.all().filter(x=>x.id!==p.id));STORE.audit({action:'Deleted draft',obj:p.key});toast(p.key+' deleted');render();});
 if(a==='cancel'){const trips=STORE.get('trips').some(t=>t.planId===p.id);if(trips){toast('Trips already generated',{tone:'err'});return;}
  return DLG.confirm({title:'Cancel '+p.key,sub:esc(p.name),reason:true,ok:'Cancel plan',danger:true}).then(r=>{if(!r)return;p.status='Cancelled';p.cancelReason=r;MR.save(p,'Cancelled',r);toast(p.key+' cancelled');render();});}
 if(a==='dup')return duplicate(p);}
function duplicate(p){let parsed=null;const d=new Date(p.period[0]+'T00:00:00');d.setMonth(d.getMonth()+1);const nm=UI.iso(d).slice(0,7);const ds=nm+'-01',de=lastDay(nm);
 DLG.open({title:'Duplicate '+p.key,sub:esc(p.name),width:520,body:'<div class="grid2">'+C.field('Start date','<input class="input" type="date" id="ds" value="'+ds+'">',{req:1,for:'ds'})+C.field('End date','<input class="input" type="date" id="de" value="'+de+'">',{req:1,for:'de'})+'</div>'+
  C.field('Name','<input class="input" id="dn" value="'+esc(p.project+' '+MR.rangeLabel({period:[ds,de]}))+'">',{req:1,for:'dn'})+
  C.field(p.inputType==='A'?'New Volume Matrix':'New order data','<label class="drop" tabindex="0" id="dz">'+ic('upload')+'<b>Drop file or browse</b><span class="sm mut">.xlsx</span><input type="file" id="df" accept=".xlsx,.csv" hidden></label><div id="dres" class="mt2"></div>',{req:1,for:'df'})+'<div class="hint">Saved as Draft</div>',
  onOpen(L){$('#dz',L.el).onkeydown=e=>{if(e.key==='Enter')$('#df',L.el).click();};$('#df',L.el).onchange=async e=>{const f=e.target.files[0];if(!f)return;const wb=await IO.readFile(f);const per=[$('#ds',L.el).value,$('#de',L.el).value];const tmp=Object.assign({},p,{period:per});
   parsed=p.inputType==='A'?MR.parseMatrix(wb,tmp):MR.parseOrders(wb,tmp);const errs=p.inputType==='A'?parsed.errors.filter(x=>x.level==='error').length:parsed.errors.length;
   $('#dres',L.el).innerHTML='<span class="tag line">'+ic('file')+esc(f.name)+'</span> '+(errs?tag(UI.plural(errs,'error')+', fix in step 2','amber','alert'):tag('Read','green','check'));parsed.file=f.name;};},
  buttons:[{label:'Cancel'},{label:'Duplicate',kind:'primary',icon:'copy',onClick(L,el){if(!parsed){const e=$('#dres',el);e.innerHTML='<span class="errtxt">'+ic('x-circle','s12')+'File required</span>';return false;}const nmv=$('#dn',el).value.trim();if(!C.setErr($('#dn',el),nmv?'':'Required'))return false;
   const a=$('#ds',el).value,b=$('#de',el).value;if(!C.setErr($('#ds',el),!a||!b?'Start and end date are required':a>b?'End date must be on or after the start date':''))return false;
   const n=JSON.parse(JSON.stringify(p));const key=MR.newId();Object.assign(n,{id:key,key,name:nmv,period:[a,b],status:'Draft',step:2,edits:{},additions:{},overrides:{},shortAck:false,effective:null,publishedAt:null,publishedBy:null,source:p.key,file:parsed.file});
   if(p.inputType==='A')n.matrix=parsed.rows;else n.orders=parsed.records.map((o,i)=>Object.assign({id:'OR-'+(i+1)},o));MR.save(n,'Duplicated from '+p.key);toast(key+' created as Draft');setTimeout(()=>location.href='milkrun-wizard.html?plan='+key+'&step=2',400);}}]});}
function lastDay(ym){const d=new Date(ym+'-01T00:00:00');d.setMonth(d.getMonth()+1);d.setDate(0);return UI.iso(d);}
render();STORE.subscribe('milkrunPlans',(e,s)=>{if(s==='remote')render();});
})();
