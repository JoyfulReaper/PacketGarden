const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const F=require('../wwwroot/garden-log-fungi.js'),Core=require('../wwwroot/garden-core.js');
const G=require('../wwwroot/garden-gnomes.js'),S=require('../wwwroot/garden-log-snails.js'),E=require('../wwwroot/garden-ecology.js');
const minute=60000;
function fixture({roll=0,age=0,count=1,full=false,live=false}={}){
  let at=9000000,rolls=0,gnomes,snails,placement=0,competition=0,terrainRolls=0;
  const changes=[];
  const garden=Core.createGardenModel({now:()=>at,random:()=>{placement++;return .5;},competitionRandom:()=>{competition++;return .99;},terrainRandom:()=>{terrainRolls++;return 0;},fungalRandom:()=>{rolls++;return roll;},onChange:c=>{
    changes.push(c);if(c.kind==='terrain-removed'){gnomes?.terrainRemoved(c.terrain,at);snails?.sourceRemoved(c.terrain,at);}
  }});
  function seed(){const entries=Array.from({length:count},(_,i)=>({type:'blackthorn',vigor:i%3,column:10+i*2,row:10,createdAt:at-age-720000,origin:{kind:live?'tcpnoise':'simulated',eventType:'log-fixture'}}));
    for(let cell=0,i=0;cell<640&&i<(full?640-count:35);cell++)if(!entries.some(p=>p.row*32+p.column===cell)){entries.push({type:'broadleaf',vigor:1,column:cell%32,row:Math.floor(cell/32),createdAt:at-65000,origin:{kind:'simulated'}});i++;}
    garden.seed(entries,at-age-1);garden.forceLogFixture();garden.tick(at);
  }
  seed();const ecology=E.createEcologyModel({now:()=>at,random:()=>.99,isCellOccupied:garden.isCellOccupied});
  gnomes=G.createModel({now:()=>at,garden,getSpecimens:()=>garden.specimens,random:()=>.99,puddleRandom:()=>.99});
  snails=S.createModel({now:()=>at,getTerrain:()=>garden.terrain,getEcology:()=>ecology,random:()=>0});
  return{garden,ecology,gnomes,snails,changes,seed,get at(){return at},set at(t){at=t},get rolls(){return rolls},
    streams:()=>[placement,competition,terrainRolls],tick(ms=0){at+=ms;garden.tick(at);snails.tick(at);gnomes.tick(at,()=>.99);},
    removed:()=>changes.filter(c=>c.kind==='terrain-removed')};
}
for(const roll of [0,.349999999,.35,.999999,-1,NaN,Infinity]){
  const f=fixture({roll,live:true}),log=f.garden.terrain.logs[0];assert(log);assert(Object.isFrozen(log));
  assert.equal(f.rolls,1);assert.equal(f.garden.fungi.records.get(log).colonized,roll>=0&&roll<.35);
  const streams=f.streams();for(let i=0;i<20;i++)f.tick(250);assert.equal(f.rolls,1);assert.deepEqual(f.streams(),streams);
  assert(!f.garden.fungi.sourceAdded(log,f.at));assert.equal(f.rolls,1);f.garden.fungi.clear();assert(!f.garden.fungi.sourceAdded(log,f.at));assert.equal(f.rolls,1);
}
{
  const context={module:{exports:{}},Uint32Array,Date,Math:Object.create(Math),crypto:{getRandomValues:a=>{a[0]=22;return a;}}};
  context.Math.random=()=>{throw Error('shared RNG');};vm.runInNewContext(fs.readFileSync('wwwroot/garden-log-fungi.js','utf8'),context);
  const a=context.module.exports.seededRandom(42),b=F.seededRandom(42);for(let i=0;i<100;i++)assert.equal(a(),b());
}
{
  const f=fixture(),log=f.garden.terrain.logs[0],record=f.garden.fungi.records.get(log),start=log.createdAt;
  const boundaries=[[0,'hidden'],[10*minute-1,'hidden'],[10*minute,'early'],[20*minute-1,'early'],[20*minute,'mature'],[40*minute-1,'mature'],[40*minute,'weathered'],[50*minute-1,'weathered']];
  for(const [age,stage] of boundaries){f.at=start+age;f.garden.tick();assert.equal(record.stage,stage);assert(f.garden.isCellOccupied(log.column,log.row));}
  let calls=0;const remove=f.garden.terrain.remove;f.garden.terrain.remove=(item,reason)=>{assert.equal(item,log);assert.equal(reason,'fungal-decay');calls++;return remove(item,reason);};
  f.at=start+50*minute;f.garden.tick();assert.equal(calls,1);assert.equal(f.garden.fungi.records.size,0);assert.equal(f.garden.terrain.logs.length,0);
  assert(!f.garden.isCellOccupied(log.column,log.row));assert(!f.garden.byCell.has(log.cell));assert.equal(f.ecology.grassCells.length,0);
  assert(f.ecology.influenceGrassCell(log.column,log.row,f.at));f.garden.tick();assert.equal(calls,1);assert.equal(f.removed().length,1);
}
{
  const f=fixture({roll:.35}),log=f.garden.terrain.logs[0];f.at=log.createdAt+60*minute-1;f.garden.tick();assert.equal(f.garden.terrain.logs[0],log);
  f.tick(1);assert.equal(f.removed()[0].reason,'expired');assert.equal(f.garden.fungi.records.size,0);assert.equal(Core.terrainConfig.lifetimeMs,60*minute);
}
for(const age of [20*minute,50*minute,59*minute,60*minute,200*minute]){
  const f=fixture(),log=f.garden.terrain.logs[0];f.at=log.createdAt+age;f.garden.tick();
  if(age<50*minute)assert.equal(f.garden.fungi.records.get(log).stage,'mature');
  else{assert.equal(f.garden.terrain.logs.length,0);assert.equal(f.removed()[0].reason,age>=60*minute?'expired':'fungal-decay');}
  assert.equal(f.rolls,1);
}
// Catch-up creation uses the original blackthorn timestamp, including already-overdue fungi.
for(const age of [10*minute,20*minute,40*minute,50*minute,60*minute]){
  const f=fixture({age});assert.equal(f.garden.terrain.logs.length,age>=50*minute?0:1);
  assert.equal(f.rolls,age>=60*minute?0:1);
}
for(const key of ['id','cell','column','row','createdAt','expiresAt','variant','object','map','list']){
  const f=fixture(),log=f.garden.terrain.logs[0],r=f.garden.fungi.records.get(log),t=f.garden.terrain;
  if(key==='object'){const other=Object.freeze({...log});t.logs.splice(0,1,other);t.byCell.set(log.cell,other);}
  else if(key==='map')t.byCell.set(log.cell,Object.freeze({...log}));
  else if(key==='list')t.logs.splice(0,1);
  else r[key]++;
  f.at=log.createdAt+50*minute;f.garden.fungi.tick();assert.equal(f.removed().length,0,key);assert.equal(f.garden.fungi.records.size,0,key);
}
{
  const f=fixture(),log=f.garden.terrain.logs[0],r=f.garden.fungi.records.get(log);
  f.at=log.createdAt+40*minute;f.garden.tick();assert.equal(r.stage,'weathered');
  for(const at of [NaN,Infinity,-Infinity]){f.garden.fungi.tick(at);assert.equal(r.stage,'weathered');assert.equal(f.rolls,1);}
  f.at=log.createdAt-1;f.garden.fungi.tick();assert.equal(r.stage,'hidden');assert.equal(f.garden.terrain.logs[0],log);
  f.at=log.createdAt+10*minute;f.garden.tick();assert.equal(r.stage,'early');assert.equal(f.rolls,1);
  f.at=log.createdAt+50*minute;f.garden.tick();f.at=log.createdAt;f.garden.tick();assert.equal(f.garden.terrain.logs.length,0);
}
for(const reason of ['gnome-campfire','removed','cleared']){
  const f=fixture({age:20*minute}),log=f.garden.terrain.logs[0];f.garden.terrain.remove(log,reason);assert.equal(f.garden.fungi.records.size,0);
  f.at+=50*minute;f.garden.tick();assert.equal(f.removed().length,1);assert.equal(f.removed()[0].reason,reason);
}
{
  const f=fixture({age:49*minute,full:true}),log=f.garden.terrain.logs[0];assert.equal(f.garden.freeCellCount(),0);
  f.tick(minute);assert.equal(f.garden.freeCellCount(),1);assert.equal(f.ecology.grassCells.length,0);
  const result=f.garden.addSpecimen('flower',0,f.at);assert.equal(result.specimen.cell,log.cell);assert.equal(f.streams()[1],0);
}
// Synchronous decoration observers cannot duplicate decay or remove a replacement.
for(const replace of [false,true]){
  const f=fixture({roll:.99}),log=f.garden.terrain.logs[0];let nested=false;
  const model=F.createModel({now:()=>f.at,random:()=>0,getTerrain:()=>f.garden.terrain,onChange:c=>{
    if(c.stage==='hidden'&&!nested){nested=true;model.tick(log.createdAt+50*minute);
      if(replace){f.garden.terrain.remove(log,'observer');f.seed();}}
  }});
  model.sourceAdded(log,f.at);model.tick(log.createdAt+20*minute);model.tick(log.createdAt+50*minute);
  assert.equal(f.removed().filter(c=>c.terrain===log).length,1);assert.equal(f.removed()[0].reason,replace?'observer':'fungal-decay');
  if(replace)assert.notEqual(f.garden.terrain.logs[0],log);assert.equal(model.records.size,0);
}
for(const interrupted of [false,true]){
  const f=fixture({age:interrupted?50*minute-12000:20*minute}),log=f.garden.terrain.logs[0];assert(f.gnomes.startCampfire(f.at,()=>0));
  for(let i=0;i<84;i++)f.tick(250);
  assert.equal(f.removed().length,1);assert.equal(f.removed()[0].reason,interrupted?'fungal-decay':'gnome-campfire');assert.equal(f.garden.fungi.records.size,0);
  if(interrupted)assert.equal(f.gnomes.incident,null);assert(!f.garden.terrain.isBlocked(log.cell));
}
{
  const f=fixture({age:50*minute-1000}),s=f.snails.spawnSimulated();assert(s);f.tick(750);assert(s.source);f.tick(250);
  assert.equal(s.source,null);assert.equal(s.leaveAt,f.at);for(let i=0;i<12;i++)f.tick(250);assert.equal(f.snails.snails.length,0);assert.equal(s.grazed,0);
}
{
  const f=fixture({count:6,age:20*minute,full:true});assert.equal(f.garden.fungi.records.size,6);assert.equal(f.garden.freeCellCount(),0);
  const log=f.garden.terrain.logs[0];assert.equal(f.ecology.influenceGrassCell(log.column,log.row,f.at),null);
  assert.equal(f.garden.addSpecimen('flower',0,f.at),null);assert.equal(f.rolls,6);
  f.garden.clear();assert.equal(f.garden.fungi.records.size,0);f.seed();assert.equal(f.garden.fungi.records.size,6);assert.equal(f.rolls,12);
  f.garden.destroy();assert.equal(f.garden.fungi.records.size,0);assert.equal(f.garden.terrain.logs.length,0);
}
{
  let calls=0;const f=fixture(),model=F.createModel({random:()=>{calls++;return 0;},getTerrain:()=>f.garden.terrain});
  for(const source of [null,{},f.garden.specimens[0],{type:'mushroom'}, {...f.garden.terrain.logs[0]}])assert.equal(model.sourceAdded(source,f.at),false);
  assert.equal(calls,0);model.destroy();assert.equal(model.sourceAdded(f.garden.terrain.logs[0],f.at),false);
}
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-log-fungi.js','utf8'),/Math\.random|setTimeout|setInterval|requestAnimationFrame|fetch\(|EventSource/);
assert(!Core.species.includes('log-fungi'));assert.equal(F.frameKeys.length,9);
console.log('PASS: fungal chance/one decision/independent RNG/real creation, exact boundaries/absolute stalls/backwards/invalid clocks, immutable identity/stale references, authoritative 50m versus 60m decay, occupancy/grass, campfire burn/interruption, snail departure, six-cap/clear/replacement/teardown.');

(async()=>{
  const page=require('./pixi-page.cjs'),h=require('./pixi-live.cjs');
  for(const name of ['index.html','pixi-live.html']){
    const f=await page({page:name}),start=f.now();f.model.seedFungi(20*minute,true,6);
    const sprites=[...f.view.terrainViews.values()],children=sprites.map(s=>s.fungi),textures=h.textureCount(),bakes=h.generated();assert(children.every(Boolean));
    const before=JSON.stringify([f.model.counts,f.model.recentEvents,f.ambient.counts]);
    for(let i=0;i<40;i++)f.frame(250);assert.deepEqual(sprites.map(s=>s.fungi),children);assert.equal(h.textureCount(),textures);assert.equal(h.generated(),bakes);
    assert.equal(JSON.stringify([f.model.counts,f.model.recentEvents,f.ambient.counts]),before);assert.equal(f.element('#garden-score').textContent,'Score: 0');assert.equal(f.sources.length,1);
    f.hidden(true);f.advance(30*minute);f.hidden(false);assert.equal(f.model.fungi.records.size,0);assert.equal(f.view.terrainViews.size,0);assert(children.every(s=>!h.live.has(s)));
    for(let i=0;i<30;i++){f.model.seedFungi(40*minute,true,6);const owned=[...f.view.terrainViews.values()].map(s=>s.fungi);f.model.clear();assert(owned.every(s=>!h.live.has(s)));assert.equal(f.model.fungi.records.size,0);}
    assert.equal(h.textureCount(),textures);assert.equal(h.generated(),bakes);
    f.model.seedFungi(10*minute,true);f.close();assert.equal(f.model.fungi.records.size,0);assert.equal(f.view.terrainViews.size,0);assert.deepEqual(f.errors,[]);
    assert(f.now()>start);
  }
  console.log('PASS: actual entry points/hidden resume, one child per real log, 360 Sprite cleanup cycles, no texture/bake/event/score drift, shared texture ownership and page teardown.');
})().catch(e=>{console.error(e);process.exitCode=1;});
