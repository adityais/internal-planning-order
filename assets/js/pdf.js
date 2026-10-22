/* Minimal client-side PDF writer (no dependency, works offline): Helvetica text, rectangles, lines,
   paged tables, title block, version stamp and "SUPERSEDED" watermark. PDF.doc(spec) -> Blob. */
(function(){
'use strict';
const W_REG=0.52,W_BOLD=0.57;
function clean(s){return String(s==null?'':s).replace(/[→]/g,'->').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^\x20-\x7e]/g,'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function width(s,size,bold){return String(s).length*size*(bold?W_BOLD:W_REG);}
function fit(s,size,w,bold){s=String(s==null?'':s);if(width(s,size,bold)<=w)return s;while(s.length>1&&width(s+'...',size,bold)>w)s=s.slice(0,-1);return s+'...';}
/* QA-P08: table cells wrap onto extra lines instead of cutting with '...' (the PDF is the document sent out) */
function wrap(s,size,w){s=String(s==null?'':s);if(width(s,size)<=w)return [s];const words=s.split(/(?<=[ ,>\/])/);const out=[];let cur='';words.forEach(wd=>{if(width(cur+wd,size)<=w||!cur){cur+=wd;}else{out.push(cur.trimEnd());cur=wd.trimStart();}while(width(cur,size)>w&&cur.length>1){let k=cur.length;while(k>1&&width(cur.slice(0,k),size)>w)k--;out.push(cur.slice(0,k));cur=cur.slice(k);}});if(cur)out.push(cur.trimEnd());return out;}
function rgb(hex){const n=parseInt(hex.slice(1),16);return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255].map(x=>x.toFixed(3)).join(' ');}
function Writer(o){this.W=o.landscape?842:595;this.H=o.landscape?595:842;this.pages=[];this.cur=null;this.o=o;}
Writer.prototype.page=function(){this.cur=[];this.pages.push(this.cur);if(this.o.watermark)this.wm(this.o.watermark);};
Writer.prototype.text=function(x,y,s,o){o=o||{};const sz=o.size||9;this.cur.push('BT /'+(o.bold?'F2':'F1')+' '+sz+' Tf '+rgb(o.color||'#232a3a')+' rg 1 0 0 1 '+x.toFixed(2)+' '+(this.H-y).toFixed(2)+' Tm ('+clean(s)+') Tj ET');};
Writer.prototype.rect=function(x,y,w,h,fill,stroke){this.cur.push((fill?rgb(fill)+' rg ':'')+(stroke?rgb(stroke)+' RG 0.6 w ':'')+x.toFixed(2)+' '+(this.H-y-h).toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re '+(fill&&stroke?'B':fill?'f':'S'));};
Writer.prototype.line=function(x1,y1,x2,y2,c){this.cur.push(rgb(c||'#e4e7ef')+' RG 0.6 w '+x1+' '+(this.H-y1)+' m '+x2+' '+(this.H-y2)+' l S');};
Writer.prototype.wm=function(t){const c=Math.cos(Math.PI/6),s=Math.sin(Math.PI/6);this.cur.push('q BT /F2 64 Tf 0.85 0.85 0.88 rg '+c.toFixed(3)+' '+s.toFixed(3)+' '+(-s).toFixed(3)+' '+c.toFixed(3)+' '+(this.W*0.18).toFixed(1)+' '+(this.H*0.25).toFixed(1)+' Tm ('+clean(t)+') Tj ET Q');};
Writer.prototype.build=function(){const objs=[];const add=s=>{objs.push(s);return objs.length;};
 const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');const f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const pagesId=objs.length+1;objs.push(null);const kids=[];
 this.pages.forEach(p=>{const content=p.join('\n');const cid=add('<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream');kids.push(add('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+this.W+' '+this.H+'] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+cid+' 0 R >>'));});
 objs[pagesId-1]='<< /Type /Pages /Kids ['+kids.map(k=>k+' 0 R').join(' ')+'] /Count '+kids.length+' >>';
 const cat=add('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');const info=add('<< /Title ('+clean(this.o.title||'Document')+') /Producer (MODA TMS Planning prototype) >>');
 let out='%PDF-1.4\n';const off=[];objs.forEach((o,i)=>{off.push(out.length);out+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
 const xref=out.length;out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root '+cat+' 0 R /Info '+info+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return new Blob([out],{type:'application/pdf'});};
/* spec: {title, sub, meta:[[k,v]...], version, status, superseded, landscape, sections:[{title, head:[], rows:[[]], widths:[]} | {text}] } */
function doc(spec){const w=new Writer({landscape:spec.landscape!==false,title:spec.title,watermark:spec.superseded?'SUPERSEDED':null});
 const M=36;let y=0;const W=w.W-2*M;
 const header=()=>{w.page();w.rect(0,0,w.W,6,'#2E3192');w.text(M,34,'MODA TMS',{bold:true,size:10,color:'#2E3192'});w.text(M,54,spec.title,{bold:true,size:15});
  if(spec.sub)w.text(M,70,spec.sub,{size:9,color:'#5f6675'});
  const stamp=(spec.version?'Version '+spec.version:'')+(spec.status?'  |  '+spec.status:'');const sw=width(stamp,9,true);w.rect(w.W-M-sw-16,26,sw+16,20,spec.superseded?'#eceff3':'#ecedf9');w.text(w.W-M-sw-8,40,stamp,{bold:true,size:9,color:spec.superseded?'#4a5262':'#2E3192'});
  w.text(w.W-M-width('Generated '+spec.generated,8),60,'Generated '+(spec.generated||''),{size:8,color:'#5f6675'});
  y=84;w.line(M,y,w.W-M,y);y+=14;};
 const footer=(n)=>{w.text(M,w.H-20,(spec.footer||spec.title)+'  -  page '+n,{size:7,color:'#6b7382'});};
 header();let pn=1;
 if(spec.meta&&spec.meta.length){const colW=W/Math.min(4,spec.meta.length);spec.meta.forEach((m,i)=>{const cx=M+(i%4)*colW,cy=y+Math.floor(i/4)*28;w.text(cx,cy,m[0],{size:7,color:'#5f6675'});w.text(cx,cy+12,fit(m[1],9,colW-8,true),{size:9,bold:true});});y+=Math.ceil(spec.meta.length/4)*28+8;}
 (spec.sections||[]).forEach(sec=>{
  const need=()=>{if(y>w.H-60){footer(pn++);header();return true;}return false;};
  if(sec.text){need();w.text(M,y,sec.text,{size:9});y+=16;return;}
  need();if(sec.title){w.text(M,y+4,sec.title,{bold:true,size:10});y+=16;}
  const ws=sec.widths||sec.head.map(()=>1);const tot=ws.reduce((a,b)=>a+b,0);const cw=ws.map(x=>x/tot*W);const rh=16;
  const head=()=>{w.rect(M,y,W,rh,'#f6f7fb');let x=M;sec.head.forEach((hh,i)=>{w.text(x+4,y+11,fit(String(hh).toUpperCase(),7,cw[i]-8,true),{size:7,bold:true,color:'#5f6675'});x+=cw[i];});y+=rh;};
  head();
  sec.rows.forEach((r,ri)=>{if(y>w.H-50){footer(pn++);header();head();}if(r._group){w.rect(M,y,W,rh,'#eef0f5');w.text(M+4,y+11,fit(r._group,8,W-8,true),{size:8,bold:true});y+=rh;return;}
   const lines=r.map((c,i)=>wrap(c,8,cw[i]-8));const n=Math.max(1,...lines.map(l=>l.length));const h=rh+(n-1)*10;if(n>1&&y+h>w.H-50){footer(pn++);header();head();}
   let x=M;lines.forEach((ls,i)=>{ls.forEach((s,k)=>w.text(x+4,y+11+k*10,s,{size:8}));x+=cw[i];});w.line(M,y+h,M+W,y+h,'#eef0f5');y+=h;});
  y+=14;});
 if(spec.sign){if(y>w.H-90){footer(pn++);header();}y+=10;const sw=W/spec.sign.length;spec.sign.forEach((s,i)=>{w.text(M+i*sw,y,s,{size:8,color:'#5f6675'});w.line(M+i*sw,y+40,M+i*sw+sw-24,y+40,'#9aa2b1');});}
 footer(pn);return w.build();}
window.PDF={doc,Writer};
})();
