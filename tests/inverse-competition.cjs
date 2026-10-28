const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Core=require('../wwwroot/garden-core.js'),C=Core.competitionConfig;
function fixture({incoming=0,resident=3,age=0,selection=0,roll=0,all=false,onChange=()=>{}}={}){
  let at=1000000,calls=0,placementCalls=0;const changes=[];
  const garden=Core.createGardenModel({now:()=>at,random:()=>{placementCalls++;return .5;},terrainRandom:()=>.99,
    competitionRandom:()=>calls++%2?roll:selection,onChange:c=>{changes.push(c);onChange(c,garden,at);}});
  garden.seed(Array.from({length:640},(_,i)=>({type:all||i===317?'broadleaf':'ghostbloom',vigor:resident,column:i%32,row:Math.floor(i/32),
    createdAt:at-(all||i===317?age*360000:0),origin:{kind:'simulated',eventType:'competition-test'}})));
  changes.length=0;const attempt=(v=incoming)=>garden.addSpecimen('flower',v,at,{kind:'tcpnoise',listenPort:80,seenCount:'18446744073709551615'});
  return{garden,changes,attempt,get calls(){return calls},get placementCalls(){return placementCalls},get at(){return at},
    set at(v){at=v},set roll(v){roll=v},set selection(v){selection=v}};
}
assert.deepEqual(C,{base:.25,vigorStep:.15,ageBonus:.15,min:.05,max:.85,cooldownMs:15000});
for(let resident=0;resident<4;resident++)for(let incoming=0;incoming<4;incoming++)for(const age of [0,.5,.99]){
  const expected=Math.max(.05,Math.min(.85,.25+.15*(resident-incoming)+.15*age));
  for(const [roll,yes] of [[0,true],[expected-1e-10,true],[expected,false],[.999999,false]]){
    const f=fixture({resident,incoming,age,roll}),original=f.garden.specimens[317];
    const result=f.attempt();assert.equal(Boolean(result),yes,`${incoming}/${resident}, age ${age}, roll ${roll}`);
    assert.equal(f.calls,2);assert.equal(f.placementCalls,0,'competition never consumes placement/cosmetic stream');
    assert.equal(f.garden.specimens.length,640);assert.equal(f.garden.byCell.size,640);assert.equal(new Set(f.garden.specimens.map(p=>p.cell)).size,640);
    assert(Math.abs(f.garden.competitionSnapshot().lastAttempt.chance-expected)<1e-12);
    if(yes){assert.equal(result.replaced,original);assert.equal(result.specimen.cell,317);assert.notEqual(result.specimen.id,original.id);
      assert.equal(result.specimen.origin.seenCount,'18446744073709551615');
      assert.deepEqual(f.changes.map(c=>[c.kind,c.reason]),[['removed','replaced'],['added','replaced']]);
    }else{assert.equal(f.garden.byCell.get(317),original);assert.equal(f.garden.competitionSnapshot().cooldownUntil,null);assert.deepEqual(f.changes.map(c=>c.kind),['dropped']);}
  }
}
assert.equal(Core.replacementChance({type:'flower',vigor:3,createdAt:0},0,0),.7);
assert.equal(Core.replacementChance({type:'flower',vigor:0,createdAt:0},3,0),.05);
assert.equal(Core.replacementChance({type:'flower',vigor:2,createdAt:0},2,0),.25);
assert.equal(Core.replacementChance({type:'flower',vigor:3,createdAt:0},0,9999999),.85);
assert.equal(Core.residentAgeFraction({type:'flower',createdAt:10},0),0);
assert.equal(Core.residentAgeFraction({type:'flower',createdAt:0},9999999),1);
// Uniform candidate selection across every vigor/age tier; no weakest/oldest ranking.
for(const cell of [0,1,17,319,639]){
  const f=fixture({all:true,selection:(cell+.5)/640});
  f.garden.specimens.forEach((p,i)=>{p.vigor=i%4;p.createdAt=f.at-(i%2?200000:1000);});
  assert.equal(f.attempt().replaced.cell,cell);assert.equal(f.calls,2);
}
for(const protect of [p=>p.type='blackthorn',p=>p.type='ghostbloom',p=>p.type='crystalfungus',p=>p.type='stillbloom',
  p=>p.mutation={type:'collectible_weed',expiresAt:2000000},p=>p.pendingMutation={},p=>p.poppyMutation={state:'pending'},p=>p.poppyMutation={state:'active'}]){
  const f=fixture(),p=f.garden.specimens[317];protect(p);assert.equal(f.garden.replacementCandidates().length,0);
  assert.equal(f.attempt(),null);assert.equal(f.calls,0);assert.equal(f.garden.byCell.get(317),p);
}
for(const state of ['cap-skipped',undefined]){
  const f=fixture();f.garden.specimens[317].poppyMutation=state?{state}:null;assert(f.attempt(),'unsuccessful poppy selection is not an active/pending mutation');
}
{
  const f=fixture();assert(f.attempt());const deadline=f.at+15000;
  for(let i=0;i<1000;i++)assert.equal(f.attempt(),null);assert.equal(f.calls,2);assert.equal(f.garden.competitionSnapshot().cooldownUntil,deadline);
  f.at=deadline-1;assert.equal(f.attempt(),null);assert.equal(f.calls,2);f.at=deadline;assert(f.attempt());assert.equal(f.calls,4);
  const next=f.at+15000;f.garden.clear();f.garden.seed(Array.from({length:640},(_,i)=>({type:'broadleaf',vigor:0,column:i%32,row:Math.floor(i/32),createdAt:f.at})));
  assert.equal(f.attempt(),null);assert.equal(f.calls,4);assert.equal(f.garden.competitionSnapshot().cooldownUntil,next,'clear/reseed cannot bypass global cooldown');
}
{
  const f=fixture({roll:.99});assert.equal(f.attempt(),null);f.at+=14999;assert.equal(f.attempt(),null);assert.equal(f.calls,4);
  assert.equal(f.garden.competitionSnapshot().cooldownUntil,null);f.roll=0;assert(f.attempt());const deadline=f.at+15000;
  f.at=deadline;f.roll=.99;assert.equal(f.attempt(),null);assert.equal(f.garden.competitionSnapshot().cooldownUntil,deadline);
  f.roll=0;assert(f.attempt(),'failure neither starts nor extends the cooldown');
}
{
  const f=fixture({all:true});assert(f.attempt());const deadline=f.at+15000;
  const due=f.garden.specimens[17];due.createdAt=f.at-359999;
  f.at++;const calls=f.calls;const result=f.attempt();assert(result);assert.equal(result.replaced,null);assert.equal(result.specimen.cell,17);
  assert.equal(f.calls,calls);assert.equal(f.garden.competitionSnapshot().cooldownUntil,deadline);
  assert(f.changes.some(c=>c.kind==='removed'&&c.reason==='expired'&&c.specimen===due));
  f.garden.remove(f.garden.specimens[31],'landscaped');assert(f.attempt());assert.equal(f.calls,calls,'forced vacancy also bypasses competition');
}
{
  const f=fixture({all:true});for(let i=0;i<10000;i++)f.attempt(i%4);
  assert.equal(f.changes.filter(c=>c.kind==='removed').length,1);assert.equal(f.calls,2);assert.equal(f.garden.specimens.length,640);
  f.at+=15000;assert(f.attempt());assert.equal(f.calls,4);f.garden.tick(f.at+7200000);assert.equal(f.calls,4,'ticks never roll or replay missed opportunities');
  f.at+=7200000;assert(f.attempt());assert.equal(f.calls,4,'hidden/long-gap natural vacancies use ordinary placement');
}
// Random callbacks cannot substitute another object or alter a captured identity/protection mid-attempt.
for(const invalidate of [(p,g)=>p.id++,(p,g)=>p.cell++,(p,g)=>p.column++,(p,g)=>p.row++,(p,g)=>p.createdAt++,
  (p,g)=>p.vigor=0,(p,g)=>p.type='ghostbloom',(p,g)=>p.pendingMutation={},(p,g)=>g.remove(p),
  (p,g)=>g.byCell.set(p.cell,{...p}),(p,g)=>g.remove(g.specimens.at(-1))]){
  let calls=0,at=1000000;const garden=Core.createGardenModel({now:()=>at,competitionRandom:()=>{if(++calls===2)invalidate(garden.specimens[0],garden);return 0;}});
  garden.seed(Array.from({length:640},(_,i)=>({type:'broadleaf',vigor:3,column:i%32,row:Math.floor(i/32),createdAt:at})));
  assert.equal(garden.addSpecimen('flower',0),null);assert.equal(garden.competitionSnapshot().cooldownUntil,null);
}
{
  let nested=null,removals=0;
  const f=fixture({all:true,onChange(c,garden,at){if(c.kind==='removed'&&c.reason==='replaced'){
    removals++;assert.equal(garden.freeCellCount(),0,'destination reserved during removal notifications');nested=garden.addSpecimen('mushroom',0,at);
  }}});assert(f.attempt());assert.equal(nested,null);assert.equal(removals,1);assert.equal(f.garden.specimens.length,640);assert.equal(f.calls,2);
}
// Competition entropy is separate from placement, terrain and all visual streams.
{
  const context={module:{exports:{}},require,Uint32Array,Date,performance,Math:Object.create(Math),crypto:{getRandomValues:a=>{a[0]=42;return a;}}};
  context.Math.random=()=>{throw Error('shared randomness consumed')};vm.runInNewContext(fs.readFileSync('wwwroot/garden-core.js','utf8'),context);
  const draw=context.module.exports.createCompetitionRandom();for(let i=0;i<100;i++){const x=draw();assert(x>=0&&x<1);}
}
console.log('PASS: exact inverse formula/all vigor pairs/age clamps/probability boundaries, uniform eligibility, mutations/protected species, independent stream, exact identity and authoritative callbacks, 15s cooldown/free expiry, 10000-event burst and no replay.');

(async()=>{
  const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
  for(const route of ['index.html','pixi-live.html']){
    let roll=0,calls=0;const f=await start(false,{captureModel:true,random:()=>.5,poppyRandom:()=>.99,competitionRandom:()=>{calls++;return roll;},pageHtml:fs.readFileSync('wwwroot/'+route,'utf8')});
    f.model.seedCompetition('3');const old=f.model.specimens[0],sprite=f.view.byId.get(old.id),textureCount=h.textureCount(),bakes=h.generated();
    const emit=v=>f.sources[0].handlers.get('garden')({data:JSON.stringify({specimenType:'flower',listenPort:80,vigor:v,seenCount:'18446744073709551615',sensor:'safe'})});
    emit(0);assert.equal(f.model.specimens.length,640);assert(!h.live.has(sprite));assert.equal(f.model.byCell.get(old.cell).type,'flower');
    assert.equal(f.model.counts.acceptedLive,1);assert.equal(f.model.counts.replacements,1);assert.equal(f.model.counts.lifecycleRemovals,0);assert.equal(calls,2);
    const last=f.model.recentEvents.at(-1);assert.equal(last.outcome,'replaced');assert.equal(f.model.byCell.get(old.cell).origin.seenCount,'18446744073709551615');
    emit(0);assert.equal(f.model.counts.acceptedLive,1);assert.equal(f.model.counts.droppedSaturated,1);assert.equal(calls,2);
    f.advance(15000);roll=.99;emit(0);assert.equal(calls,4);assert.equal(f.model.counts.replacements,1);
    roll=0;emit(3);assert.equal(calls,6);assert.equal(f.model.counts.replacements,2);assert.equal(f.model.counts.acceptedLive,2);
    assert.equal(f.element('#garden-score').textContent,'Score: 0');assert.equal(h.textureCount(),textureCount);assert.equal(h.generated(),bakes);
    if(route==='pixi-live.html'){
      f.element('#competition-residents').value='mixed';f.element('#competition-old').checked=true;f.element('#seed-competition').handlers.get('click')();
      assert.equal(new Set(f.model.specimens.map(p=>p.vigor)).size,4);f.element('#competition-incoming').value='0';
      f.element('#try-competition').handlers.get('click')();assert.match(f.element('#competition-status').textContent,/cooldown/);
    }else for(const id of ['seed-competition','competition-residents','competition-incoming','try-competition'])assert.equal(f.element('#'+id),null);
    f.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(f.errors,[]);
  }
  console.log('PASS: both page adapters, real SSE success/drop provenance/statistics, exact original Sprite cleanup, no new textures/artwork, diagnostic four-vigor fixture and shared cooldown, Score: 0.');
})().catch(e=>{console.error(e);process.exitCode=1;});
