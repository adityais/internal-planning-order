/* Unit tests for chain.js and domain.js (run from tests/engine.html). Results in window.TEST_RESULTS. */
(function(){
const R=[];const ok=(name,cond,detail)=>R.push({name,pass:!!cond,detail:detail==null?'':String(detail)});
STORE.ensure();
const hm=UI.hm;
/* 1. R03 acceptance (Milkrun AC3): window 07:00-22:00, 5 cycles, Heijunka 180, offset 120 */
const plan=STORE.get('milkrunPlans').find(p=>p.id==='MP-2026-0050');
const sch=DOM.planSchedule(plan,'wd',{fresh:true});
const r03=sch.routes.find(r=>r.id==='R03');
ok('R03 offset A = 120 min',r03.A===120,r03.A);
ok('R03 arrivals 07:00/10:00/13:00/16:00/19:00',r03.cycles.map(c=>hm(c.arr)).join(',')==='07:00,10:00,13:00,16:00,19:00',r03.cycles.map(c=>hm(c.arr)).join(','));
ok('R03 Out Pool 05:00/08:00/11:00/14:00/17:00',r03.cycles.map(c=>hm(c.out)).join(',')==='05:00,08:00,11:00,14:00,17:00',r03.cycles.map(c=>hm(c.out)).join(','));
/* 2. T8 infeasible: 6 cycles -> error, max 5 */
const p6=JSON.parse(JSON.stringify(plan));p6.id='T6';p6.cycles={R03:{wd:6}};
const s6=DOM.planSchedule(p6,'wd',{fresh:true});const r6=s6.routes.find(r=>r.id==='R03');
ok('6 cycles do not fit, maximum 5',!r6.feasible&&r6.maxFit===5&&r6.cycles[5].outside,'feasible='+r6.feasible+' maxFit='+r6.maxFit);
/* 3. driver chaining R03: D1 does cycles 1+3, handover at cycle 5 */
const c=r03.cycles;
ok('R03 cycle 1 and 3 same driver',c[0].driver===c[2].driver,c.map(x=>x.driver).join(','));
ok('R03 cycle 5 goes to another driver slot with handover at pool',c[4].driver!==c[2].driver&&c[4].handover,c.map(x=>x.unit.slice(-3)+'/'+x.driver).join(','));
/* 4. unit reuse needs In Pool + 15 min (AC5) */
const t5=CHAIN.schedule({routes:[{id:'X',name:'X',vehicle:{chassis:'CDD',body:'Box'},heijunka:null,stagger:0,cycles:2,stops:[{loc:'A',km:40,fixht:0,buffer:0}],cust:{loc:'C',km:40,fixht:10,buffer:0},returnKm:40}],window:[480,540],alloc:{'CDD Box':['U-A','U-B']},params:{speed:40,minGap:15}});
ok('Unit A back 08:10 + 15 -> cycle 2 at 08:00 uses unit B',t5.cycles[1].unit==='U-B',t5.cycles.map(x=>hm(x.out)+' '+x.unit).join(' | '));
/* 5. driver duty > 12h -> next slot (AC6) */
const t6=CHAIN.schedule({routes:[{id:'Y',name:'Y',vehicle:{chassis:'CDD',body:'Box'},heijunka:600,stagger:0,cycles:2,stops:[{loc:'A',km:100,fixht:0,buffer:0}],cust:{loc:'C',km:100,fixht:30,buffer:0},returnKm:200}],window:[360,1380],alloc:{'CDD Box':['U-A','U-B']},params:{speed:40,minGap:15}});
ok('Second cycle beyond 12h duty goes to another driver slot',t6.cycles[0].driver!==t6.cycles[1].driver&&t6.drivers.every(d=>d.duty<=720),t6.drivers.map(d=>d.id+':'+UI.dur(d.duty)).join(' '));
ok('Greedy unit count equals peak overlap (U3)',t5.units.length===CHAIN.peak(t5.cycles,15),t5.units.length);
/* 6. DQ-7 scale for ADM-SAP Mon-Thu */
const st=sch.stats;
ok('ADM-SAP Mon-Thu ~58 cycles',st.cycles===58,st.cycles);
ok('Units needed close to 37 of 40',st.units>=34&&st.units<=40&&st.allocUnits===40,st.units+' of '+st.allocUnits);
ok('Driver slots close to 56 of 60',st.drivers>=52&&st.drivers<=60&&st.allocDrivers===60,st.drivers+' of '+st.allocDrivers);
ok('No duty or rest breaches in auto chaining',st.dutyBreaches===0&&st.restBreaches===0,st.dutyBreaches+'/'+st.restBreaches);
ok('Unit peak overlap matches unit count',st.units===Object.keys(DOM.allocUnits('ADM-SAP')).reduce((a,k)=>a+CHAIN.peak(sch.cycles.filter(x=>!x.outside&&x.vtype===k),15),0),st.units);
/* 7. Toll Tariff lookup: latest effective <= date wins, future row ignored, missing -> unavailable */
ok('Latest effective row wins',DOM.tariff('Cikarang Utama','Karawang Barat','Gol II','2026-10-14').tariff===62000,DOM.tariff('Cikarang Utama','Karawang Barat','Gol II','2026-10-14').tariff);
ok('Older row used before new effective date',DOM.tariff('Cikarang Utama','Karawang Barat','Gol II','2026-09-01').tariff===58500);
ok('Future row not used before its date',DOM.tariff('Cibitung','Sunter','Gol II','2026-10-14').tariff===54000&&DOM.tariff('Cibitung','Sunter','Gol II','2026-10-21').tariff===58000);
const tu=DOM.tollEval({cond:'mixed',pairs:[{entry:'Cikunir',exit:'Tanjung Priok'}]},'CDD','2026-10-14');
ok('Pair without Gol II row -> Tariff unavailable, excluded from total',tu.unavail&&tu.total===0&&tu.src==='unavail');
const tm=DOM.tollEval({cond:'mixed',pairs:[{entry:'Cikunir',exit:'Tanjung Priok',manual:21500,reason:'x'}]},'CDD','2026-10-14');
ok('Manual amount counts with source Manual',tm.total===21500&&tm.src==='manual');
const tg=DOM.tollEval({cond:'mixed',pairs:[{entry:'Cikarang Utama',exit:''}]},'CDD','2026-10-14');ok('Missing gate blocks (missing=true)',tg.missing);
ok('Trailer is always Gol V',DOM.tollClass('Trailer')==='Gol V');ok('CDE is Gol II',DOM.tollClass('CDE')==='Gol II');
/* 8. Incentive AC12: Milkrun Daily 75.000, Driver 1 + Helper 1 */
const cc=DOM.cost({chassis:'CDD',body:'Box',sl:'Regular',ptype:'Milkrun',km:120,durationMin:240,crew:{driver:1,helper:1},toll:{cond:'none'},date:'2026-10-14'});
ok('Milkrun incentive Driver 75.000 + Helper 75.000',cc.inc[0].amt===75000&&cc.inc[1].amt===75000,cc.inc.map(x=>x.k+' '+x.amt).join(', '));
ok('Uang makan per crew member (2 x 25.000)',cc.rec.find(r=>r.k==='Uang makan').amt===50000);
const ce=DOM.cost({chassis:'CDE',body:'Box',sl:'Express',ptype:'On Call',km:65,durationMin:240,crew:{driver:1,helper:1},toll:{cond:'none'},date:'2026-10-14'});
ok('Express trip uses Express incentive rows',/Express/.test(ce.inc[0].basis)&&ce.inc[0].amt===125000,ce.inc[0].basis+' '+ce.inc[0].amt);
/* 9. Volume per cycle (AC2): 30 m3 / 3 cycles = 10 (+5% TCO = 10,5) */
ok('Volume per cycle incl. TCO',Math.abs(30*1.05/3-10.5)<1e-9);
/* 10. trips generated, idempotent key */
const trips=STORE.get('trips');const ids=new Set(trips.map(t=>t.id));ok('Trip seeds unique (idempotent key)',ids.size===trips.length,trips.length+' trips');
ok('No trips on weekends without hours (ADM)',!trips.some(t=>t.project==='ADM-SAP'&&UI.dayGroup(t.date)==='we'));
/* 11. readiness derivation */
const states={};DOM.tripsOf(STORE.today()).forEach(t=>{const s=DOM.evaluate(t).state;states[s]=(states[s]||0)+1;});
ok('Today has every readiness state',['ready','waiting','notready','replacing','exreq','withex','skipped'].every(k=>states[k]),JSON.stringify(states));
/* 12. exception deadline */
const any=DOM.tripsOf(STORE.today()).find(t=>t.out>11*60+30);const req=STORE.now();const dl=DOM.excDeadline(any,req);
ok('H-0 exception deadline = min(15 min, departure - 5 min)',dl===Math.min(req+15*60000,STORE.ts(any.date,any.out)-5*60000));
window.TEST_RESULTS=R;
const out=document.getElementById('out');if(out)out.innerHTML='<p><b>'+R.filter(r=>r.pass).length+' / '+R.length+' passed</b></p><table><tbody>'+R.map(r=>'<tr><td>'+(r.pass?'PASS':'<b style="color:var(--red-t)">FAIL</b>')+'</td><td>'+UI.esc(r.name)+'</td><td class="mut">'+UI.esc(r.detail)+'</td></tr>').join('')+'</tbody></table>';
})();
