/* MODA TMS Planning - single data layer (window.STORE).
   localStorage, key prefix moda_pl_, seed version moda_pl__seedver. Pages never keep their own copy.
   API: get(entity) / set(entity,rows) / upsert(entity,row,key) / remove(entity,id,key) / byId(entity,id,key)
        subscribe(entity|'*',fn) / audit(event) / notify(n) / reset() / now() / setSpeed(x) / persona() */
(function(){
'use strict';
const PFX='moda_pl_',VER_KEY=PFX+'_seedver',SEED_VERSION=63;
const DEMO_START=new Date(2026,9,14,10,58,0).getTime(); /* Wed 14 Oct 2026 10:58 WIB */
let cache={};const subs={};
function lsGet(k){try{const v=localStorage.getItem(PFX+k);return v==null?undefined:JSON.parse(v);}catch(e){return undefined;}}
function lsSet(k,v){try{localStorage.setItem(PFX+k,JSON.stringify(v));}catch(e){console.warn('Storage full',k);}}
function fire(entity,src){(subs[entity]||[]).concat(subs['*']||[]).forEach(fn=>{try{fn(entity,src);}catch(e){console.error(e);}});}
function get(entity){if(!(entity in cache)){const v=lsGet(entity);cache[entity]=v===undefined?(SEEDED_DEFAULTS[entity]!==undefined?JSON.parse(JSON.stringify(SEEDED_DEFAULTS[entity])):[]):v;}return cache[entity];}
function set(entity,rows,silent){cache[entity]=rows;lsSet(entity,rows);if(!silent)fire(entity,'local');return rows;}
function byId(entity,id,key){key=key||'id';return (get(entity)||[]).find(r=>r[key]===id);}
function upsert(entity,row,key){key=key||'id';const rows=get(entity);const i=rows.findIndex(r=>r[key]===row[key]);if(i>=0)rows[i]=row;else rows.push(row);return set(entity,rows),row;}
function patch(entity,id,fields,key){const r=byId(entity,id,key);if(!r)return null;Object.assign(r,fields);set(entity,get(entity));return r;}
function remove(entity,id,key){key=key||'id';set(entity,get(entity).filter(r=>r[key]!==id));}
function subscribe(entity,fn){(subs[entity]=subs[entity]||[]).push(fn);return ()=>{subs[entity]=subs[entity].filter(f=>f!==fn);};}
/* cross-tab sync */
window.addEventListener('storage',e=>{if(!e.key||e.key.indexOf(PFX)!==0)return;const ent=e.key.slice(PFX.length);if(ent==='_seedver'){cache={};fire('*','remote');return;}delete cache[ent];fire(ent,'remote');});
/* ---------- demo clock ---------- */
function clock(){let c=get('clock');if(!c||!c.anchorDemo){c={anchorDemo:DEMO_START,anchorReal:Date.now(),speed:1};set('clock',c,true);}return c;}
function now(){const c=clock();return c.anchorDemo+(Date.now()-c.anchorReal)*c.speed;}
function setSpeed(s){const n=now();set('clock',{anchorDemo:n,anchorReal:Date.now(),speed:s});}
function jump(min){const c=clock();set('clock',{anchorDemo:now()+min*60000,anchorReal:Date.now(),speed:c.speed});}
function today(){return UI.iso(new Date(now()));}
/* minutes since midnight of a date -> timestamp */
function ts(date,min){const d=new Date(date+'T00:00:00');return d.getTime()+min*60000;}
function nowMin(date){return (now()-new Date(date+'T00:00:00').getTime())/60000;}
/* ---------- persona ---------- */
/* Foundation v2: personas, menu and the capability matrix live in roles.js (ROLES). This file only exposes them. */
const PERSONAS=ROLES.PERSONAS,MENU=ROLES.MENU,CAN=ROLES.ACTION;let pageAs=null;/* page-only persona (Field Ops tablet), never persisted */
function asPersona(k){pageAs=PERSONAS[k]?k:null;}
function persona(){if(pageAs)return pageAs;const k=get('persona');return PERSONAS[k]?k:'planner';}
function me(){const k=persona();return Object.assign({key:k},PERSONAS[k]);}
function setPersona(k){set('persona',k);}
/* capability matrix: actions hidden for roles that can never do them */
function can(a){return ROLES.can(a,persona());}
/* ---------- audit & notifications ---------- */
function audit(ev){const m=me();const row=Object.assign({id:UI.uid('AU'),ts:now(),actor:ev.actor||m.n,role:ev.role!=null?ev.role:m.r,type:'Status'},ev);const a=get('auditLog');a.unshift(row);if(a.length>1500)a.length=1500;set('auditLog',a);return row;}
function notify(n){const row=Object.assign({id:UI.uid('NT'),ts:now(),read:false,kind:'Info'},n);const a=get('notifications');a.unshift(row);if(a.length>300)a.length=300;set('notifications',a);return row;}
function seq(name,prefix,pad){const s=get('seq');s[name]=(s[name]||0)+1;set('seq',s,true);return prefix+String(s[name]).padStart(pad||4,'0');}
/* ---------- seed / reset ---------- */
const SEEDED_DEFAULTS={seq:{},persona:'planner',config:{},params:{},clock:{}};
function clearAll(){const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf(PFX)===0)ks.push(k);}ks.forEach(k=>localStorage.removeItem(k));cache={};}
function seedNow(){clearAll();const data=window.SEED?window.SEED.build():{};Object.keys(data).forEach(k=>lsSet(k,data[k]));localStorage.setItem(VER_KEY,String(SEED_VERSION));cache={};}
function ensure(){let v=0;try{v=parseInt(localStorage.getItem(VER_KEY)||'0',10);}catch(e){}if(v!==SEED_VERSION)seedNow();}
function reset(){seedNow();fire('*','reset');}
window.STORE={get,set,byId,upsert,patch,remove,subscribe,audit,notify,seq,reset,ensure,now,setSpeed,jump,clock,today,ts,nowMin,persona,me,setPersona,asPersona,PERSONAS,MENU,can,CAN,DEMO_START,PFX};
})();
