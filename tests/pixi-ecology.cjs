// Instrumented real view controllers; no GPU/FPS assertions.
const assert=require('node:assert/strict'),fs=require('node:fs');
const harness=require('./pixi-live.cjs'),{P,renderer,cache,live}=harness;
const E=require('../wwwroot/garden-ecology.js'),presentation=require('../wwwroot/pixi-live-ecology.js');
const liveCore=require('../wwwroot/pixi-live-core.js'),shared=require('../wwwroot/pixi-stress.js');
const {createView}=require('../wwwroot/pixi-live.js');
const startTextures=harness.textureCount(),startGenerated=harness.generated();
const atlas=presentation.makeEcologyAtlas(P,renderer);assert.equal(atlas.frames.size,16);
assert.equal(new Set([...atlas.frames.values()].map(t=>t.source)).size,1);
const view=createView(P,{stage:new P.Container()},cache.frames,liveCore,shared);
const ev=presentation.createEcologyView(P,view.grassLayer,view.puddleLayer,atlas.frames);
let now=100000;
const m=E.createEcologyModel({now:()=>now,random:()=>.99,onChange:change=>ev.change(change,now)});
const grass=m.influenceGrassCell(0,0,now),other=m.influenceGrassCell(1,0,now);
const first=ev.grassViews.get(0).sprite,second=ev.grassViews.get(1).sprite;
now++;m.influenceGrassCell(0,0,now);assert.equal(ev.grassViews.get(0).sprite,first);assert.equal(ev.counters.grassRefreshed,1);
now=other.lastInfluencedAt+2100000;m.removeExpiredGrass(now);
assert.equal(ev.grassViews.get(0).sprite,first);assert(!live.has(second));assert.equal(ev.grassViews.size,1);
const a=m.createStormPuddle(now),b=m.createStormPuddle(now+1),av=ev.puddleViews.get(a),bv=ev.puddleViews.get(b);
now+=100000;m.refreshStormPuddle(a,now);assert.equal(ev.puddleViews.get(a),av);
now=b.lastRefreshedAt+510000;m.removeExpiredPuddles(now);assert(!live.has(bv));assert.equal(ev.puddleViews.get(a),av);
m.clear();assert.equal(ev.grassViews.size,0);assert.equal(ev.puddleViews.size,0);
const model=liveCore.createModel(view,{now:()=>now,random:()=>.5,bloomRandom:()=>0,vineBloomRandom:()=>.9});model.seed();
for(let cycle=0;cycle<10;cycle++){
  presentation.seedDenseEcology(m,now);assert.equal(m.grassCells.length,640);assert.equal(ev.grassViews.size,640);assert.equal(ev.puddleViews.size,8);
  const grassViews=new Map([...ev.grassViews].map(([k,r])=>[k,r.sprite])),specimenViews=new Map(view.byId),puddleViews=new Map(ev.puddleViews);
  for(const level of Object.keys(liveCore.weatherLevels)) {view.setWeather({level,eventsPerMinute:10000});m.updateWeatherEligibility(level,now);}
  for(const [k,s] of grassViews)assert.equal(ev.grassViews.get(k).sprite,s);
  for(const [k,s] of specimenViews)assert.equal(view.byId.get(k),s);
  for(const [k,s] of puddleViews)assert.equal(ev.puddleViews.get(k),s);
  for(const p of m.puddles)m.refreshStormPuddle(p,now);
  for(const [k,s] of puddleViews)assert.equal(ev.puddleViews.get(k),s);
  assert.equal(harness.textureCount(),startTextures+16);assert.equal(harness.generated(),startGenerated+1);
  assert.equal(view.bloomViews.size,64);
  assert.equal(view.snapshot().displayObjects,1366+64);
  m.clear();assert.equal(ev.grassViews.size,0);assert.equal(ev.puddleViews.size,0);
}
// Healthy mature grass has no visual transform work until its first fading boundary.
for(let i=0;i<640;i++)m.influenceGrassCell(i%32,Math.floor(i/32),now-60000);
const updates=ev.counters.grassVisualUpdates;
for(let at=now;at<now+30000;at+=250)ev.tick(at);
assert.equal(ev.counters.grassVisualUpdates,updates);assert.equal(ev.grassViews.size,640);
// Young and fading transforms are bounded by the shared 1s deadline, independent of RAF.
m.clear();m.influenceGrassCell(0,0,now);const before=ev.counters.grassVisualUpdates;
for(let at=now;at<now+1000;at+=10){ev.tick(at);ev.animate(at);}assert.equal(ev.counters.grassVisualUpdates,before);
ev.tick(now+1000);assert.equal(ev.counters.grassVisualUpdates,before+1);
presentation.seedDenseEcology(m,now,false);assert.equal(m.puddles.length,0);assert.equal(ev.puddleViews.size,0);
model.clear();m.clear();assert.equal(view.snapshot().displayObjects,14);
ev.destroy();view.destroy();atlas.destroy();assert.equal(harness.textureCount(),startTextures);
const script=fs.readFileSync('wwwroot/pixi-live.js','utf8'),ec=fs.readFileSync('wwwroot/pixi-live-ecology.js','utf8');
assert.doesNotMatch(ec,/EventSource|fetch\(|setTimeout|setInterval|localStorage|sessionStorage/);
assert.match(script,/ecology.resetCadence\(at\)/);assert.match(script,/ecology.tick\(at\)/);
assert.equal((fs.readFileSync('wwwroot/pixi-live-core.js','utf8').match(/new Source/g)||[]).length,1);
assert.doesNotMatch(fs.readFileSync('wwwroot/canvas.html','utf8'),/pixi/i);
console.log('PASS: persistent grass/puddle identity/exact removal; 640+8 ownership; 16 fixed frames/one source across repeated births; static grass deadlines; unchanged weather ownership; local seed/clear; shared lifecycle/visibility; production isolation.');
