/* Exception request dialog + PM approval body (desktop + phone). Copy diet applied. */
(function(){
const {st,tag,code,cd,ic,avatar,chk,rdo}=UI;
function approvalBody(o){o=o||{};const fb=o.fallback;
 return '<div class="col" style="gap:16px">'+
 (fb?'<div class="banner warn sm">'+ic('alert')+'<div>PM did not decide. Escalated to you.</div></div>':'')+
 '<div class="panel" style="background:var(--thead)"><div class="body col" style="gap:8px;padding:12px"><div class="row"><span class="sect">'+(fb?'Departure':'Due 06:19')+'</span><span class="sp"></span></div>'+(fb?'<div class="row">'+cd('56 min','crit','left',{lg:1})+'</div>':'<div class="row" style="gap:12px">'+cd('07:00','warn','left',{lg:1})+'<div style="flex:1"><div class="sla"><i style="width:53%"></i></div></div></div>')+'</div></div>'+
 '<dl class="kv"><dt>Project</dt><dd>Boga Rasa</dd><dt>Route</dt><dd>Cikarang DC to Bandung</dd><dt>Departure</dt><dd class="tnum">07:15</dd><dt>Driver</dt><dd>Fajar Nugroho '+tag('Fit','green','check')+'</dd><dt>Unit</dt><dd><b class="plate">B 9356 KYT</b> '+tag('P2H Fail','red','x-circle')+'</dd></dl>'+
 '<div><div class="sect" style="margin-bottom:8px">Reason</div><div class="panel"><div class="body col" style="gap:8px;padding:12px"><div class="row">'+tag('P2H Critical','amber')+'<b>Brake pedal travel</b></div><div class="sm"><b>Note</b> Pedal long, holds pressure. VM checked 06:08.</div><div class="sm"><b>Mitigation</b> 60 km/h, workshop after drop 2.</div></div></div></div>'+
 '<div class="row" style="gap:8px"><span class="tag line">'+ic('clip')+'IMG_0604.jpg</span></div>'+
 '<div class="field"><label>Comment'+(o.err?' <span class="req">*</span>':'')+'</label><div class="textarea'+(o.err?' err':'')+'" style="height:64px"></div>'+(o.err?'<div class="errtxt">'+ic('x-circle','s12')+'Required to reject</div>':'')+'</div></div>';}
function approvalFoot(o){o=o||{};const m=o.phone;return '<button class="btn '+(m?'xl':'lg')+' danger-o" style="flex:1">'+ic('x')+'Reject</button><button class="btn '+(m?'xl':'lg')+' primary" style="flex:1">'+ic('check')+(o.fallback?'Approve as fallback':'Approve')+'</button>';}

function excDialog(o){o=o||{};const p2h=o.v==='p2h'||o.v==='val';const val=o.v==='val';
 const reasons=p2h?[['P2H Critical','Brake pedal travel NOK']]:[['Late attendance','Present 06:21'],['Driver Apps off','Tenko 06:24']];
 let h='<div class="scrim"></div><div class="dialog" style="width:620px"><div class="hd"><div class="col"><h2>Request exception</h2><span class="sm mut">'+(p2h?'Boga Rasa, 07:15':'R08 cycle 1, 06:45')+'</span></div><span class="sp"></span>'+st('notready')+'<button class="iconbtn" aria-label="Close">'+ic('x')+'</button></div><div class="bd col" style="gap:16px">';
 if(val)h+='<div class="banner err sm">'+ic('x-circle')+'<div>3 fields need attention</div></div>';
 h+='<div><div class="lbl" style="margin-bottom:8px">Reason</div>'+reasons.map(r=>'<div class="row" style="padding:10px 12px;border:1px solid var(--navy);background:var(--navy-s);border-radius:9px;margin-bottom:6px">'+chk(1)+'<b>'+r[0]+'</b><span class="sm mut">'+r[1]+'</span></div>').join('')+'<div class="row" style="margin-top:4px;color:var(--navy);font-weight:600;font-size:13px">'+ic('plus')+'Add reason</div></div>';
 if(p2h){h+='<div class="field"><label>Failed item <span class="req">*</span></label><div class="select" style="'+(val?'border-color:var(--red)':'')+'">'+(val?'<span class="faint">Select</span>':'<span><b>Brake pedal travel</b> '+tag('Critical','red')+'</span>')+ic('down')+'</div>'+(val?'<div class="errtxt">'+ic('x-circle','s12')+'Required</div>':'')+'</div>'+
  '<div class="field"><label>Mitigation <span class="req">*</span></label><div class="textarea'+(val?' err':'')+'" style="height:64px">'+(val?'Drive slow':'60 km/h, workshop after drop 2. VM checked brake line.')+'</div>'+(val?'<div class="errtxt">'+ic('x-circle','s12')+'6 / 10</div>':'')+'</div>';}
 h+='<div class="field"><label>Note <span class="req">*</span></label><div class="textarea'+(val?' err':'')+'" style="height:64px">'+(val?'':(p2h?'Pedal long, holds pressure. Customer needs delivery by 11:00.':'Stuck at Cikarang toll. Fit at Tenko 06:24.'))+'</div>'+(val?'<div class="errtxt">'+ic('x-circle','s12')+'Required</div>':'')+'</div>'+
  '<div class="row" style="gap:8px"><div class="btn">'+ic('camera')+'Photo</div><div class="btn">'+ic('clip')+'File</div>'+(p2h&&!val?'<span class="tag line">'+ic('clip')+'IMG_0604.jpg</span>':'')+'</div>'+
  '<div class="banner info sm">'+ic('clock')+'<div>PM decides by '+(p2h?'06:19':'06:34')+'</div></div></div>'+
  '<div class="ft"><span class="sp"></span><button class="btn">Cancel</button><button class="btn primary">'+ic('send')+'Send</button></div></div>';
 return h;}
window.EXC={approvalBody,approvalFoot,excDialog};
})();
