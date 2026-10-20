const assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../wwwroot/garden-ecology.js');
assert.deepEqual(E.puddleConfig,{maxPuddles:8,checkEveryMs:15000,refreshChance:.6,nearbySpawnChance:.7,
  initialSize:10,initialMaxSize:18,maxSize:36,growthPerRefresh:4,growthDurationMs:15000,edgePadding:60,
  drainDelayAfterLastRefreshMs:30000,drainDurationMs:480000});
assert.deepEqual([...E.puddleFormationChances],[['heavy_rain',.35],['botnet_thunderstorm',.6],['botnet_hurricane',.85]]);
for(const level of ['quiet','drizzle','rain']){
  const m=E.createEcologyModel({now:()=>0,random:()=>{throw Error('ineligible weather rolled')}});
  m.updateWeatherEligibility(level,0);m.tick(1e6);assert.equal(m.puddles.length,0);
}
for(const [level,chance] of E.puddleFormationChances)for(const roll of [chance-1e-10,chance]){
  const m=E.createEcologyModel({now:()=>0,random:()=>roll});m.updateWeatherEligibility(level,0);
  m.tickPuddles(14999);assert.equal(m.puddles.length,0);m.tickPuddles(15000);assert.equal(m.puddles.length,roll<chance?1:0);
}
const changes=[],m=E.createEcologyModel({now:()=>0,random:()=>0,onChange:c=>changes.push(c)});
m.updateWeatherEligibility('heavy_rain',100);assert.equal(m.nextPuddleCheckAt,15100);
m.updateWeatherEligibility('heavy_rain',200);m.updateWeatherEligibility('botnet_hurricane',300);assert.equal(m.nextPuddleCheckAt,15100);
m.tickPuddles(1e6);assert.equal(m.puddles.length,1);assert.equal(m.nextPuddleCheckAt,1015000);
m.tickPuddles(1e6);assert.equal(m.puddles.length,1);assert.equal(changes.length,1);
m.updateWeatherEligibility('rain',1e6+10);assert.equal(m.nextPuddleCheckAt,1015010);
m.updateWeatherEligibility('heavy_rain',1e6+20);assert.equal(m.nextPuddleCheckAt,1015020);
const p=m.puddles[0],visual=at=>E.puddleVisualState(p,at);
assert.deepEqual(Object.keys(p).sort(),['createdAt','lastRefreshedAt','maxSize','seed','size','x','y']);
assert.equal(visual(1e6).size,10);assert.equal(visual(1007500).size,14);assert.equal(visual(1015000).size,18);
assert.equal(visual(1030000).opacity,.38);assert.equal(visual(1270000).size,18*Math.sqrt(.5));assert.equal(visual(1270000).opacity,.19);
const before=visual(1270000).size;m.refreshStormPuddle(p,1270000);assert.equal(p.size,before);assert.equal(visual(1270000).size,before);assert.equal(p.maxSize,22);
for(let i=0;i<10;i++)m.refreshStormPuddle(p,1270000+i);assert.equal(p.maxSize,36);assert.equal(m.puddles[0],p);
// Fresh-vs-nearby equality and 24–48 distance before clamping.
for(const chance of [.699999,.7])for(const distanceRoll of [0,.999999]){
  const n=E.createEcologyModel({now:()=>0});const a=n.createStormPuddle(0,()=>.5);
  const rolls=[chance,0,0,distanceRoll,.4];let i=0;const b=n.createStormPuddle(0,()=>rolls[i++]);
  if(chance<.7)assert(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-(24+distanceRoll*24))<1e-9);
  else assert.equal(b.x,60,'nearby equality chooses fresh bounded position');
  assert(b.x>=60&&b.x<=900&&b.y>=60&&b.y<=540);
}
for(const roll of [.599999,.6]){
  const n=E.createEcologyModel({now:()=>0});n.updateWeatherEligibility('heavy_rain',0);n.createStormPuddle(0,()=>.5);
  let i=0;const rolls=[0,roll,.9,.5,.5,.5];n.tickPuddles(15000,()=>rolls[i++]??.5);
  assert.equal(n.puddles.length,roll<.6?1:2);
}
const cap=E.createEcologyModel({now:()=>0,random:()=>0});cap.updateWeatherEligibility('botnet_hurricane',0);
for(let i=0;i<8;i++)cap.createStormPuddle(0,()=>.5);assert.equal(cap.createStormPuddle(0),null);
const ids=cap.puddles.slice();cap.tickPuddles(15000);assert.deepEqual(cap.puddles,ids);assert.equal(ids[0].lastRefreshedAt,15000);
const expiry=E.createEcologyModel({now:()=>0,onChange:c=>changes.push(c)}),old=expiry.createStormPuddle(0),young=expiry.createStormPuddle(1);
expiry.removeExpiredPuddles(510000);assert.deepEqual(expiry.puddles,[young]);assert.equal(changes.at(-1).item,old);
const hidden=E.createEcologyModel({now:()=>0,random:()=>{throw Error('hidden/resume rolled')}});hidden.updateWeatherEligibility('botnet_hurricane',0);
hidden.tick(1e6,{hidden:true});assert.equal(hidden.nextPuddleCheckAt,1015000);hidden.resetCadence(2e6);hidden.tick(2e6);assert.equal(hidden.nextPuddleCheckAt,2015000);
hidden.updateWeatherEligibility('heavy_rain',2e6+5);assert.equal(hidden.nextPuddleCheckAt,2015000);
const original=hidden.grassCells;assert.throws(()=>hidden.seed({grassCells:[{column:32,row:0,createdAt:0,lastInfluencedAt:0}]}));assert.equal(hidden.grassCells,original);
assert.throws(()=>hidden.seed({puddles:Array(9).fill(p)}));
assert.throws(()=>hidden.seed({puddles:[p,p]}));
const source=fs.readFileSync('wwwroot/garden-ecology.js','utf8');assert.doesNotMatch(source,/setTimeout|setInterval|document\.|PIXI|CanvasRenderingContext2D/);
for(const html of ['index','pixi-live'])assert.match(fs.readFileSync(`wwwroot/${html}.html`,'utf8'),/src="garden-ecology\.js\?v=.+"/);
assert.match(fs.readFileSync('wwwroot/garden.js','utf8'),/gardenEcologyCore.createEcologyModel/);
assert.match(fs.readFileSync('wwwroot/pixi-live.js','utf8'),/ecologyCore.createEcologyModel/);
console.log('PASS: shared puddle constants/chances/cadence/transitions/no replay/spawn/refresh/drain/sqrt/identity/expiry/cap; atomic seed validation; shared renderer imports; no timers.');
