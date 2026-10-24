// Grass population policy on the real shared model and both application entry points.
const assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../wwwroot/garden-ecology.js'),G=require('../wwwroot/garden-core.js'),N=require('../wwwroot/garden-gnomes.js');
const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
const seeded=(seed=17)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const positions=m=>Array.from(m.grassCells,c=>[c.column,c.row,c.createdAt,c.lastInfluencedAt]);
for(const roll of [0,.5,.999999]) {
  const m=E.createEcologyModel({now:()=>0,random:()=>roll});m.seedInitialGrass(123);
  assert.equal(m.grassCells.length,12);
  for(let i=0;i<12;i++) {
    const c=m.grassCells[i],cell=c.row*32+c.column;
    assert(cell>=Math.floor(i*640/12)&&cell<Math.floor((i+1)*640/12),'one random seed in every distributed region');
    assert.equal(c.createdAt,123);assert.equal(c.lastInfluencedAt,123);
  }
}
{
  const occupied=new Set(Array.from({length:53},(_,i)=>i));occupied.add(53);
  const m=E.createEcologyModel({now:()=>0,random:()=>0,isCellOccupied:(x,y)=>occupied.has(y*32+x)});
  m.seedInitialGrass();assert.equal(m.grassCells.length,11,'a full region is skipped');
  assert(!m.grassCells.some(c=>occupied.has(c.row*32+c.column)));
  const before=positions(m);m.seedInitialGrass();assert.equal(m.grassCells.length,22,'existing seeds are never refreshed');
  assert.deepEqual(positions(m).slice(0,11),before);
}
for(const free of [0,1,7,8,640])for(const roll of [0,.25,.999999999]) {
  let calls=0;const changes=[];
  const m=E.createEcologyModel({now:()=>0,random:()=>{calls++;return roll;},isCellOccupied:(x,y)=>y*32+x>=free,onChange:e=>changes.push(e)});
  m.tickGrass(59999);assert.equal(calls,0);m.tickGrass(60000);
  const count=Math.min(free,3);
  assert.equal(calls,count,'no chance gate; at most three target draws');
  assert.equal(m.grassCells.length,count);assert.equal(changes.length,count);
  assert.equal(new Set(m.grassCells.map(c=>c.row*32+c.column)).size,count);
  for(const cell of m.grassCells){assert(cell.row*32+cell.column<free);assert.equal(cell.createdAt,60000);}
  const draws=calls;m.tickGrass(60000);m.tickGrass(60001);assert.equal(calls,draws,'no retry at the same deadline');
}
{
  let calls=0;const m=E.createEcologyModel({now:()=>0,random:()=>{calls++;return .99;}});
  m.influenceGrassCell(10,10,50000);m.nextGrassSpreadAt=1e9;m.tickGrass(60000);
  assert.equal(m.grassCells.length,4,'one isolated young survivor does not suppress maintenance');assert.equal(calls,3);
  m.grassCells[0].lastInfluencedAt=60000-E.grassConfig.deadAfterMs;m.tickGrass(120000);
  assert.equal(m.grassCells.length,7,'dry unexpired turf does not count as healthy');
  m.clearGrass();m.tickGrass(180000);assert.equal(calls,9);
}
{
  let calls=0;const m=E.createEcologyModel({now:()=>0,random:()=>{calls++;return 0;}});
  m.tickGrass(600000);assert.equal(calls,0,'missed minutes are discarded');
  m.tickGrass(659999);assert.equal(calls,0);m.tickGrass(660000);assert.equal(m.grassCells.length,3);
  m.clearGrass();m.tickGrass(720000,true);assert.equal(calls,3);
  m.resetCadence(3600000);m.tickGrass(3600000);m.tickGrass(3659999);assert.equal(calls,3);
  m.tickGrass(3660000);assert.equal(calls,6);assert.equal(m.grassCells.length,3);
}
{
  let occupancyChecks=0;
  const m=E.createEcologyModel({now:()=>0,random:()=>0,isCellOccupied:()=>++occupancyChecks>640});
  for(let at=250;at<60000;at+=250)m.tickGrass(at);
  assert.equal(occupancyChecks,0,'empty populations do not scan occupancy on every logical tick');
  m.tickGrass(60000);assert.equal(occupancyChecks,643);
  assert.equal(m.grassCells.length,0,'authoritative creation rechecks the selected cell, with no retry');
}
// Entire population expires, then the authoritative addition path creates one new generation.
{
  const m=E.createEcologyModel({now:()=>0,random:()=>0});m.influenceGrassCell(3,3,0);
  m.resetCadence(E.grassConfig.expiredAfterMs-60000);m.tickGrass(E.grassConfig.expiredAfterMs);
  assert.equal(m.grassCells.length,3);assert(m.grassCells.every(c=>c.createdAt===E.grassConfig.expiredAfterMs));
}
// Saturation clears every initial patch; actual expiry or gnome removals release soil.
for(const relief of ['expiry','gnomes']) {
  let at=0,ecology;
  const garden=G.createGardenModel({now:()=>at,onChange:e=>{if(e.kind==='added')ecology?.removeGrassCell(e.specimen.column,e.specimen.row);}});
  ecology=E.createEcologyModel({now:()=>at,random:()=>0,isCellOccupied:(x,y)=>garden.byCell.has(y*32+x)});
  ecology.seedInitialGrass();assert.equal(ecology.grassCells.length,12);
  garden.seed(Array.from({length:640},(_,i)=>({type:'broadleaf',column:i%32,row:Math.floor(i/32),createdAt:0,colorVariant:0})));
  assert.equal(ecology.grassCells.length,0);at=60000;ecology.tickGrass(at);assert.equal(ecology.grassCells.length,0);
  if(relief==='expiry'){at=G.timings.broadleaf.expiredAfterMs;garden.tick(at);}
  else {
    const crew=N.createModel({garden,now:()=>at,getSpecimens:()=>garden.specimens});assert(crew.startLandscaping(at,seeded(213),'overcrowding'));
    for(let i=0;i<200&&crew.incident;i++){at+=250;crew.tick(at,()=>.99);ecology.tickGrass(at);}
    assert.equal(crew.incident,null);assert.equal(garden.specimens.length,608);
  }
  ecology.resetCadence(at);at+=60000;ecology.tickGrass(at);assert.equal(ecology.grassCells.length,3);
  const parent=ecology.grassCells[0],birth=parent.createdAt;
  if(relief==='gnomes'){at=G.timings.broadleaf.expiredAfterMs;garden.tick(at);}
  for(let i=0;i<8;i++){at+=4000;ecology.tickGrass(at);}
  assert(ecology.grassCells.length>1,'normal spreading resumes');assert.equal(parent.lastInfluencedAt,birth,'no parent refresh');
  assert(ecology.grassCells.every(c=>!garden.byCell.has(c.row*32+c.column)));
}
// Fixed-seed quiet coverage, preserving the 4s cadence and natural parent aging.
const coverage=[];
for(const seed of [11,82,193]){
  const m=E.createEcologyModel({now:()=>0,random:seeded(seed)});m.seedInitialGrass();const counts=[];
  for(let at=250;at<=600000;at+=250){m.tickGrass(at);if(at%120000===0)counts.push(m.grassCells.length);}
  assert(counts[0]>12&&counts[4]>=480,'75% open-soil coverage by ten minutes');coverage.push(counts);
}
console.log('Grass coverage at 2/4/6/8/10 minutes (three fixed seeds):',JSON.stringify(coverage));
(async()=>{
  let pixiRoll=()=>0,referenceRoll=()=>0,referenceAt=100000;
  const beforeTextures=h.textureCount(),pixi=await start(false,{captureModel:true,random:()=>pixiRoll()});
  const reference=E.createEcologyModel({now:()=>referenceAt,random:()=>referenceRoll()});
  assert.equal(pixi.ecology.grassCells.length,12);
  const generated=h.generated(),textures=h.textureCount(),live=h.live.size;
  const reset=()=>{reference.clear();pixi.model.clear();pixi.ecology.clear();};
  for(let cycle=0;cycle<20;cycle++){
    reset();referenceRoll=seeded(cycle);pixiRoll=seeded(cycle);reference.resetCadence(referenceAt);pixi.ecology.resetCadence(pixi.context.Date.now());
    for(let i=0;i<240;i++){referenceAt+=250;reference.tick(referenceAt);pixi.frame(250);}
    assert.deepEqual(positions(reference),positions(pixi.ecology));assert(pixi.ecology.grassCells.length<=3);
    assert.equal(pixi.model.counts.acceptedLive,0);assert.equal(pixi.model.recentEvents.length,0);
    pixi.doc.hidden=true;pixi.docHandlers.get('visibilitychange')();referenceAt+=600000;reference.tick(referenceAt,{hidden:true});pixi.advance(600000);
    pixi.doc.hidden=false;pixi.docHandlers.get('visibilitychange')();assert.equal(reference.grassCells.length,pixi.ecology.grassCells.length);
    assert.equal(pixi.ecology.nextGrassReseedAt-pixi.context.Date.now(),60000);
    reset();assert.equal(pixi.app.stage.children[0].children[3].children.length,0);
    assert.equal(h.generated(),generated);assert.equal(h.textureCount(),textures);assert.equal(h.live.size,live-12);
  }
  assert.deepEqual(pixi.errors,[]);pixi.winHandlers.get('pagehide')({persisted:false});assert.equal(h.textureCount(),beforeTextures);
  for(const reduced of [true,false]){const g=await start(false,{captureModel:true,reduced});assert.equal(g.ecology.grassCells.length,12);g.winHandlers.get('pagehide')({persisted:false});}
  assert.doesNotMatch(fs.readFileSync('wwwroot/garden-grass.js','utf8'),/setInterval|setTimeout|requestAnimationFrame|Math.random/);
  console.log('PASS: distributed seeds, bounded recovery/free-space/cadence, expiry/gnome recovery, original aging, shared-model/Pixi parity, hidden resume, finite recipes and repeated cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
