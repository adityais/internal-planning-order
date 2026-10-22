/* Planning Config (parameters, toll class, config). Document Templates moved to Milkrun Reference > Document Templates tab (milkrun-ref.js). Maintenance reports and Driver / Unit status entries are not part of this prototype. */
(function(){
const {ic,esc,tag,ps}=UI;const {$,$$,DLG,toast,banner}=C;
let sec='params';if(location.hash==='#templates'){location.replace('milkrun-ref.html?tab=tpl');return;}/* old deep link */
function mount(){return SHELL.mount({module:'planning',id:sec,active:sec,title:'Planning Config',crumb:'',actions:'<button type="button" class="btn" id="hist">'+ic('history')+'History</button><span id="cfgAct" class="row gap2"></span>'});}
function render(){if(!mount())return;$('#content').innerHTML=SHELL.cfgTabs(sec)+'<div id="ab" class="mt4"></div>';
 ($('#hist')||{}).onclick=()=>PANELS.history({obj:['Templates','Parameters'],title:'Planning Config',types:['Admin']});
 ({params})[sec]($('#ab'));}
/* ---------------- Planning Config: one page, one column of sections (no inner tabs) ---------------- */
const SECTIONS=[
 ['Driver duty',[['dutyMax','Max driver duty','h',1,24],['restMin','Idle that resets the duty','h',1,24],['reportLead','Report lead before departure','min',0,180]]],
 ['Route',[['avgSpeed','Default speed','km/h',10,100],['roadFactor','Road factor','',1,2],['turnaround','Unit turnaround buffer','min',0,120]]],
 ['Order and assignment',[['waterfallMin','Vendor response time (per vendor, waterfall)','min',5,240],['allowOrderWithoutDealing','Allow order without dealing','toggle'],['availExpiry','Daily availability expiry (vendor data removed after)','h',1,168]]],
 ['Driver check (Tenko)',[['tenkoSys','Max systolic','mmHg',90,180],['tenkoDia','Max diastolic','mmHg',50,120],['tempMin','Min temperature','C',34,37],['tempMax','Max temperature','C',36,39]]],
 ['Milkrun',[['minGapWd','Min travel gap Mon - Thu','min',0,60],['minGapFri','Min travel gap Friday','min',0,60],['addTco','Extra TCO','%',0,50],['liqVol','Liquid volume factor','',0.5,1]]]];
const CHASSIS=['Blindvan','Hiace','CDE','CDD','Fuso','Tronton','Trailer'];
const TOLLGOL=['Gol I','Gol II','Gol III','Gol IV','Gol V'];
function params(B){const lead=STORE.can('paramsEdit');let edit=lead&&UI.q('edit')==='1';
 const draw=()=>{const p=DOM.params();const cfg=STORE.get('config')||{};
  const val=(f)=>{const k=f[0],u=f[2];
   if(f[2]==='toggle')return edit?'<label class="row gap2"><input type="checkbox" class="cbx" data-cfg="'+k+'"'+(cfg[k]?' checked':'')+'><span class="sm">'+(cfg[k]?'On':'Off')+'</span></label>':'<b>'+(cfg[k]?'On':'Off')+'</b>';
   if(f[2]==='time')return edit?'<div class="field"><input class="input tnum" style="width:110px;text-align:right" data-hm data-p="'+k+'" value="'+esc(p[k])+'"></div>':'<b class="tnum">'+esc(p[k])+'</b>';
   return edit?'<div class="field"><div class="row gap2"><input class="input tnum" style="width:110px;text-align:right" data-p="'+k+'" value="'+p[k]+'" inputmode="decimal" aria-label="'+esc(f[1])+'"><span class="sm mut" style="width:44px">'+u+'</span></div><div class="errtxt" hidden>'+ic('x-circle','s12')+'<span></span></div></div>':'<b class="tnum">'+p[k]+(u?' '+u:'')+'</b>';};
  const sect=(name,rows)=>'<div class="panel"><div class="panel-hd"><h3>'+name+'</h3></div><div class="body">'+rows+'</div></div>';
  const line=(label,v)=>'<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line2)"><span class="u-flex-1">'+label+'</span>'+v+'</div>';
  const chassis=sect('Category',
   '<table><thead><tr><th>Category</th><th class="num">Speed (km/h)</th><th>Toll class</th></tr></thead><tbody>'+CHASSIS.map(c=>{const sp=(p.speedOverride&&p.speedOverride[c])||p.avgSpeed;const gol=c==='Trailer'?'Gol V':(p.tollClass||{})[c];
    return '<tr><td><b>'+c+'</b></td><td class="num">'+(edit?'<div class="field"><input class="input tnum" style="width:90px;text-align:right" data-so="'+c+'" value="'+sp+'" inputmode="decimal" aria-label="Speed '+c+'"><div class="errtxt" hidden>'+ic('x-circle','s12')+'<span></span></div></div>':'<span class="tnum">'+sp+'</span>')+'</td><td>'+(edit&&c!=='Trailer'?'<select class="select" style="width:130px" data-tc="'+c+'">'+C.opts(TOLLGOL,gol)+'</select>':esc(gol||'-'))+'</td></tr>';}).join('')+'</tbody></table>');
  $('#cfgAct').innerHTML=lead?(edit?'<button type="button" class="btn" id="pc">Cancel</button><button type="button" class="btn primary" id="ps">Save</button>':'<button type="button" class="btn primary" id="pe">'+ic('pencil')+'Edit</button>'):'';B.innerHTML='<div>'+(lead?'':'<div class="row mb3">'+tag('View only','slate')+'</div>')+'<div class="stack">'+
   SECTIONS.slice(0,2).map(s=>sect(s[0],s[1].map(f=>line(f[1],val(f))).join(''))).join('')+chassis+SECTIONS.slice(2).map(s=>sect(s[0],s[1].map(f=>line(f[1],val(f))).join(''))).join('')+'</div></div>';
  const pe=$('#pe');if(pe)pe.onclick=()=>{edit=true;draw();};const pc=$('#pc');if(pc)pc.onclick=()=>{edit=false;draw();};
  const ps_=$('#ps');if(ps_)ps_.onclick=()=>{const np=Object.assign({},STORE.get('params'));const nc=Object.assign({},STORE.get('config'));let bad=0;const changes=[];
   SECTIONS.forEach(s=>s[1].forEach(f=>{if(f[2]==='toggle'){const c=$('[data-cfg="'+f[0]+'"]');if(c&&nc[f[0]]!==c.checked){changes.push(f[1]+' '+(c.checked?'On':'Off'));nc[f[0]]=c.checked;}return;}
    if(f[2]==='time'){const co=$('[data-p="'+f[0]+'"]');if(UI.parseHM(co.value)==null){co.classList.add('err');bad++;}else if(co.value!==p[f[0]]){changes.push(f[1]+' '+p[f[0]]+' to '+co.value);np[f[0]]=co.value;}return;}
    const i=$('[data-p="'+f[0]+'"]');const v=IO.toNum(i.value);const msg=v==null||isNaN(v)?'Required':v<f[3]?'Min '+f[3]:v>f[4]?'Max '+f[4]:'';if(!C.setErr(i,msg))bad++;else if(v!==p[f[0]]){changes.push(f[1]+' '+p[f[0]]+' to '+v);np[f[0]]=v;}}));
   const so=Object.assign({},p.speedOverride||{});$$('[data-so]').forEach(i=>{const v=IO.toNum(i.value);if(!C.setErr(i,v==null||isNaN(v)||v<10||v>100?'10 - 100':''))bad++;else if(v!==((p.speedOverride||{})[i.dataset.so]||p.avgSpeed)){changes.push('Speed '+i.dataset.so+' '+v);so[i.dataset.so]=v;}});np.speedOverride=so;
   const tc=Object.assign({},p.tollClass||{});$$('[data-tc]').forEach(s=>{if(s.value!==tc[s.dataset.tc]){changes.push('Toll class '+s.dataset.tc+' '+s.value);tc[s.dataset.tc]=s.value;}});np.tollClass=tc;
   if(bad){toast(UI.plural(bad,'field')+' need attention',{tone:'err'});return;}STORE.set('params',np);STORE.set('config',nc);STORE.audit({action:'Planning Config saved',detail:changes.join('; ')||'No change',obj:'Parameters',type:'Admin'});toast('Planning Config saved');edit=false;draw();};};draw();}
render();
})();
