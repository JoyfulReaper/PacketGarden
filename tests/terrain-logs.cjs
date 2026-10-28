const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Core=require('../wwwroot/garden-core.js'),G=require('../wwwroot/garden-gnomes.js'),E=require('../wwwroot/garden-ecology.js'),B=require('../wwwroot/garden-stillbloom.js');
const C=Core.terrainConfig;
function fixture({roll=0,count=1,full=false,age=719000,origin={kind:'tcpnoise',listenPort:22,sensor:'safe'},onChange=()=>{}}={}){
  let at=1000000,rolls=0;const changes=[];
  const garden=Core.createGardenModel({now:()=>at,random:()=>.5,terrainRandom:()=>{rolls++;return roll;},onChange:c=>{changes.push(c);onChange(c,garden);}});
  const entries=Array.from({length:full?640:count},(_,i)=>({type:i<count?'blackthorn':'broadleaf',vigor:1,colorVariant:0,
    column:i%32,row:Math.floor(i/32),createdAt:at-(i<count?age:65000),origin:{...origin}}));
  garden.seed(entries);changes.length=0;
  return {garden,entries,changes,get rolls(){return rolls},get at(){return at},tick(ms=1000){at+=ms;garden.tick(at);},set at(value){at=value}};
}
assert.deepEqual(C,{chance:.3,maxLogs:6,lifetimeMs:3600000,variants:3});
assert(!Core.species.includes('fallen_log'));assert.equal(Core.normalizeGarden({specimenType:'fallen_log',vigor:0,listenPort:22}),null);
for(const [roll,success] of [[0,true],[.09999,true],[.1,true],[.2,true],[.299999999,true],[.3,false],[.99999,false],[-1,false],[NaN,false]]){
  const f=fixture({roll}),p=f.entries[0],original={...p};f.tick(999);assert.equal(f.rolls,0);f.tick(1);
  assert.equal(f.rolls,1);assert.equal(f.garden.terrain.logs.length,success?1:0);assert.equal(f.garden.specimens.length,0);
  assert.equal(f.garden.byCell.size,0);assert.equal(f.garden.freeCellCount(),success?639:640);
  if(success){const log=f.garden.terrain.logs[0];assert(Object.isFrozen(log));
    assert.equal(log.cell,original.cell);assert.equal(log.column,original.column);assert.equal(log.row,original.row);
    assert.equal(log.createdAt,p.createdAt+720000);assert.equal(log.expiresAt,log.createdAt+3600000);
    assert(!('source' in log));assert(!('origin' in log));assert(!('specimen' in log));assert(!('vigor' in log));
    assert(f.garden.isCellOccupied(p.column,p.row));assert.equal(f.garden.getCell(p.column,p.row),null);
    p.id++;p.createdAt++;p.column++;p.cell++;p.type='flower';assert.equal(f.garden.terrain.logs[0],log,'source changes never alter terrain');
    f.at=log.expiresAt-1;f.garden.tick();assert.equal(f.garden.terrain.logs.length,1);f.tick(1);
    assert.equal(f.garden.terrain.logs.length,0);assert.equal(f.garden.freeCellCount(),640);
    f.at=log.createdAt;f.garden.tick();assert.equal(f.garden.terrain.logs.length,0,'backwards clocks never resurrect a removed log');
  }
  for(let i=0;i<10;i++)f.garden.tick(f.at);assert.equal(f.rolls,1,'exactly one attempt, no duplicate log or retry');
}
for(const reason of ['removed','cleared','landscaped','gnome-heist','collected','replaced','expired']){
  const f=fixture();assert(f.garden.remove(f.entries[0],reason));f.tick(1000000);assert.equal(f.rolls,0);assert.equal(f.garden.terrain.logs.length,0,'only natural tick expiry qualifies');
}
for(const type of Core.species.filter(t=>t!=='blackthorn')){
  const f=fixture(),p=f.entries[0];f.garden.seed([{...p,type,createdAt:f.at-Core.timings[type].expiredAfterMs}]);f.tick(0);assert.equal(f.rolls,0);
}
for(const invalidate of [p=>p.id++,p=>p.cell++,p=>p.column++,p=>p.row++,p=>p.createdAt--,
  p=>p.type='flower',p=>p.mutation={type:'collectible_weed',expiresAt:0},p=>p.pendingMutation={},
  (p,f)=>f.garden.byCell.set(p.cell,{...p})]){
  const f=fixture(),p=f.entries[0],cell=p.cell;invalidate(p,f);f.tick();assert.equal(f.rolls,0);assert.equal(f.garden.terrain.logs.length,0);
  if(f.garden.byCell.get(cell)===p)throw Error('Removed source left phantom occupancy');
}
{
  let replacement=null;
  const f=fixture({full:true,onChange(c,garden){if(c.kind==='removed'&&c.reason==='expired'&&c.specimen.type==='blackthorn')replacement=garden.addSpecimen('mushroom',2,1001000).specimen;}});
  f.tick();assert(replacement);assert.equal(f.garden.byCell.get(0),replacement);assert.equal(f.rolls,0);assert.equal(f.garden.terrain.logs.length,0,'occupied original cell cannot receive a log');
}
{
  const f=fixture({count:8});f.tick();assert.equal(f.rolls,8);assert.equal(f.garden.terrain.logs.length,6);assert.equal(f.garden.terrain.counts.capSkipped,2);
  const kept=f.garden.terrain.logs.slice();assert.equal(new Set(kept.map(l=>l.cell)).size,6);
  f.garden.terrain.remove(kept[0]);for(let i=0;i<10;i++)f.tick(250);assert.equal(f.rolls,8);assert.equal(f.garden.terrain.logs.length,5,'cap-skipped attempts are not queued');
  f.garden.clear();assert.equal(f.garden.terrain.logs.length,0);assert.equal(f.rolls,8);assert.equal(f.garden.terrain.byCell.size,0);
}
// Dense placement has 634 specimens and six blocking cells, still exactly 640 cells total.
for(const incoming of [0,1,2,3]){
  const f=fixture({count:6,full:true});f.tick();const logs=f.garden.terrain.logs.slice();
  assert.equal(f.garden.specimens.length,634);assert.equal(f.garden.freeCellCount(),0);
  const result=f.garden.addSpecimen('flower',incoming,f.at);assert.equal(Boolean(result),incoming>1);
  if(result){assert(result.replaced);assert(!logs.some(l=>l.cell===result.specimen.cell));assert.equal(f.garden.specimens.length,634);}
  for(const l of logs)assert(!f.garden.byCell.has(l.cell));assert.equal(f.garden.terrain.logs.length,6);
}
{
  const f=fixture({full:true});for(const p of f.entries.slice(1))p.type='ghostbloom';f.tick();
  assert.equal(f.garden.freeCellCount(),0);assert.equal(f.garden.addSpecimen('flower',3,f.at),null,'logs and protected specimens cannot be replaced');
  const log=f.garden.terrain.logs[0];f.garden.terrain.tick(log.expiresAt); // Reconcile terrain only to isolate normal free-cell placement.
  const p=f.garden.addSpecimen('flower',0,f.at).specimen;assert.equal(p.cell,log.cell);assert.equal(f.garden.specimens.length,640);
}
{
  const f=fixture({count:6});f.tick();const blocked=new Set(f.garden.terrain.byCell.keys());
  for(let i=0;i<634;i++)assert(!blocked.has(f.garden.addSpecimen('broadleaf',0,f.at).specimen.cell));
  assert.equal(f.garden.addSpecimen('broadleaf',0,f.at),null);assert.equal(f.garden.specimens.length+f.garden.terrain.logs.length,640);
}
for(const late of [1,59999,3599999,3600000,7200000]){
  const f=fixture();const expiredAt=f.entries[0].createdAt+720000;f.at=expiredAt+late;f.garden.tick();assert.equal(f.rolls,1);
  if(late<3600000){const l=f.garden.terrain.logs[0];assert.equal(l.createdAt,expiredAt);assert.equal(l.expiresAt,expiredAt+3600000);}
  else assert.equal(f.garden.terrain.logs.length,0,'no fresh hour after an entirely missed log lifetime');
}
{
  const f=fixture({full:true,count:6});f.tick();const gn=G.createModel({garden:f.garden,getSpecimens:()=>f.garden.specimens,now:()=>f.at});
  assert(gn.landscapingEligible(f.at,null,'overcrowding'),'blocked cells count toward full occupancy');
  assert(gn.startLandscaping(f.at,()=>0,'overcrowding'));
  for(let i=0;i<200&&gn.incident;i++){f.at+=250;gn.tick(f.at,()=>.99);}
  assert.equal(f.garden.freeCellCount(),32);assert.equal(f.garden.terrain.logs.length,6);assert.equal(f.garden.specimens.length,602);
}
{
  const f=fixture({full:true,count:6});f.tick();let rolls=0;
  const bloom=B.createModel({garden:f.garden,now:()=>f.at,random:()=>{rolls++;return 0;}});
  assert.equal(bloom.spawnSimulated(),null);assert.equal(rolls,0);assert.equal(f.garden.terrain.logs.length,6);
}
for(const under of [false,true]){
  const f=fixture();const ecology=E.createEcologyModel({now:()=>f.at,random:()=>0,isCellOccupied:f.garden.isCellOccupied});
  ecology.setAllowGrassUnderPlants(under);f.tick();ecology.seedInitialGrass(f.at);
  if(!under)assert(!ecology.grassCells.some(c=>f.garden.terrain.isBlocked(c.row*32+c.column)));
  assert.equal(f.garden.specimens.length,0);assert.equal(f.garden.terrain.logs.length,1);
}
{
  const f=fixture({roll:.99});assert.equal(f.garden.forceLogFixture(),0);f.tick();assert.equal(f.garden.terrain.logs.length,0);
  const sim=fixture({roll:.99,origin:{kind:'simulated',eventType:'log-fixture'}});assert.equal(sim.garden.forceLogFixture(),1);
  sim.tick(999);assert.equal(sim.garden.terrain.logs.length,0,'forced preview cannot bypass natural expiry');sim.tick(1);
  assert.equal(sim.garden.terrain.logs.length,1);assert.equal(sim.rolls,0);assert.equal(sim.garden.terrain.counts.forced,1);
}
// Dedicated randomness is crypto/clock seeded, never the placement/garden stream.
{
  const context={module:{exports:{}},require,Uint32Array,Date,performance,Math:Object.create(Math),crypto:{getRandomValues:a=>{a[0]=123;return a;}}};
  context.Math.random=()=>{throw Error('shared random draw')};vm.runInNewContext(fs.readFileSync('wwwroot/garden-core.js','utf8'),context);
  const draw=context.module.exports.createTerrainRandom();for(let i=0;i<20;i++)assert(draw()>=0&&draw()<1);
}
console.log('PASS: exact 30%/six logs/one hour, natural-only original identity/cell, consumed attempts, real placement/stronger replacement, protected cells, independent RNG, absolute hidden/gap decay, gnome and Stillbloom capacity, grass policy and no source retention.');

(async()=>{
  const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
  for(const page of ['index.html','pixi-live.html']){
    const f=await start(false,{captureModel:true,random:()=>.5,terrainRandom:()=>0,pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8')});
    const beforeTextures=h.textureCount(),beforeBakes=h.generated();
    f.sources[0].handlers.get('garden')({data:JSON.stringify({specimenType:'blackthorn',vigor:2,listenPort:22,sensor:'test',seenCount:'1'})});
    const source=f.model.specimens[0],cell=source.cell,sprite=f.view.byId.get(source.id),accepted=f.model.counts.acceptedLive,recent=JSON.stringify(f.model.recentEvents);
    f.frame(720000);assert.equal(f.model.terrain.logs.length,1);assert.equal(f.view.terrainViews.size,1);assert(!h.live.has(sprite));
    assert.equal(f.model.specimens.length,0);assert(!f.model.byCell.has(cell));assert.equal(f.model.counts.acceptedLive,accepted);assert.equal(JSON.stringify(f.model.recentEvents),recent);
    assert.equal(f.model.counts.lifecycleRemovals,1);assert.equal(f.element('#garden-score').textContent,'Score: 0');assert.equal(f.ambient.pendingDrops.size,0);
    const log=f.model.terrain.logs[0],art=f.view.terrainViews.get(log);assert.equal(art.eventMode,'none');
    for(let i=0;i<50;i++)f.frame(250);assert.equal(f.view.terrainViews.get(log),art);assert.equal(h.textureCount(),beforeTextures);assert.equal(h.generated(),beforeBakes);
    f.doc.hidden=true;f.docHandlers.get('visibilitychange')();f.advance(3600000);f.doc.hidden=false;f.docHandlers.get('visibilitychange')();
    assert.equal(f.model.terrain.logs.length,0);assert.equal(f.view.terrainViews.size,0);assert(!h.live.has(art));
    for(let cycle=0;cycle<30;cycle++){
      f.model.seedLogs('cap');assert.equal(f.model.forceLogFixture(),8);f.frame(2000);assert.equal(f.view.terrainViews.size,6);
      const sprites=[...f.view.terrainViews.values()];f.model.clear();assert.equal(f.view.terrainViews.size,0);assert(sprites.every(s=>!h.live.has(s)));
    }
    assert.equal(h.textureCount(),beforeTextures);assert.equal(h.generated(),beforeBakes);
    if(page==='pixi-live.html'){
      f.element('#seed-logs-full').handlers.get('click')();f.element('#force-log').handlers.get('click')();f.frame(2000);
      const cell=f.model.terrain.logs[0].cell;f.element('#test-log-growth').handlers.get('click')();assert(!f.model.byCell.has(cell));
      f.element('#decay-log-fixture').handlers.get('click')();assert.equal(f.model.terrain.logs.length,0);assert(f.model.byCell.has(cell));
    }else for(const id of ['seed-logs-aging','force-log','seed-logs-full','test-log-growth','decay-log-fixture'])assert.equal(f.element('#'+id),null);
    f.model.seedLogs();f.model.forceLogFixture();f.frame(2000);const remaining=[...f.view.terrainViews.values()];f.winHandlers.get('pagehide')({persisted:false});
    assert.equal(f.model.terrain.logs.length,0);assert.equal(f.view.terrainViews.size,0);assert(remaining.every(s=>!h.live.has(s)));assert.deepEqual(f.errors,[]);
  }
  console.log('PASS: both Pixi pages, real accepted blackthorn lifecycle without phantom events, cached terrain ownership, hidden absolute expiry, 60 repeated cap/clear cycles, blocked growth/decay/regrowth diagnostics and teardown.');
})().catch(error=>{console.error(error);process.exitCode=1;});
