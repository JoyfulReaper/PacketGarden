// Deterministic weather-residue integration: production scripts, no sleeps or extra timers.
const assert = require('node:assert/strict');
const createGarden = require('./browser-garden.cjs');
const count = garden => garden.run('gardenState.puddles.length');
const json = (garden, expression) => garden.run(`JSON.stringify(${expression})`);
const weather = (garden, level, eventsPerMinute = 10000) =>
  garden.run(`Object.assign(weatherState,{level:'${level}',eventsPerMinute:${eventsPerMinute}}); updateWeatherAnimation()`);
function update(garden, rolls = [0]) {
  garden.sandbox.puddleRandom = () => rolls.length > 1 ? rolls.shift() : rolls[0];
  return garden.run('updateGardenPuddles(Date.now(),puddleRandom)');
}
function due(garden, rolls = [0]) {
  garden.clock.now = garden.run('nextPuddleCheckAt');
  return update(garden, rolls);
}
function visual(garden, puddle, now = garden.clock.now) {
  garden.sandbox.testPuddle = puddle;
  return garden.run(`puddleVisualState(testPuddle,${now})`);
}
const garden = createGarden();
assert.equal(count(garden), 0);
assert.equal(garden.intervals.length, 2, 'only existing ecology and inspection ticks');
assert.equal(garden.sources.length, 1);
assert.equal(garden.sources[0].handlers.get('garden').length, 1);
assert.equal(garden.sources[0].handlers.get('weather').length, 1);
assert.equal(garden.run('puddleConfig.checkEveryMs'), 15000);
assert.equal(garden.run('puddleConfig.maxPuddles'), 8);
assert.equal(garden.run('puddleConfig.drainDelayAfterLastRefreshMs'), 30000);
assert.equal(garden.run('puddleConfig.drainDurationMs'), 480000);

for (const level of ['quiet','drizzle','rain']) {
  const check = createGarden(); weather(check, level);
  check.clock.now += 1000000;
  check.sandbox.puddleRandom = () => { throw new Error('nonsevere weather must never roll'); };
  assert.equal(check.run('updateGardenPuddles(Date.now(),puddleRandom)'), false);
  assert.equal(count(check), 0);
}
// Exact per-level action boundaries, with no hidden dependence on intensity.
for (const [level,chance] of [['heavy_rain',0.35],['botnet_thunderstorm',0.60],['botnet_hurricane',0.85]]) {
  for (const [roll,expected] of [[chance-1e-10,1],[chance,0],[0.999,0]]) {
    const check = createGarden(); weather(check, level);
    assert.equal(check.run(`puddleFormationChances.get('${level}')`), chance);
    const next = check.run('nextPuddleCheckAt'); check.clock.now = next - 1;
    assert.equal(update(check, [0]), false, 'first formation waits the configured cadence');
    check.clock.now = next; update(check, [roll,0.2,0.3,0.4]);
    assert.equal(count(check), expected, `${level} roll ${roll}`);
    assert.equal(check.run('nextPuddleCheckAt'), next + 15000);
    const before = json(check, 'gardenState.puddles');
    check.clock.now += 14999; update(check, [0]);
    assert.equal(json(check, 'gardenState.puddles'), before, 'no per-frame or per-tick extra attempt');
  }
}
const zero = createGarden(); weather(zero,'heavy_rain',0); due(zero); assert.equal(count(zero),1, 'eligibility follows applied level');
const stalled = createGarden(); weather(stalled,'botnet_hurricane');
let randomCalls = 0; stalled.sandbox.puddleRandom = () => { randomCalls++; return 0; };
stalled.clock.now += 300000;
stalled.run('updateGardenPuddles(Date.now(),puddleRandom)');
assert.equal(count(stalled), 1); assert.equal(randomCalls, 4, 'one action roll and one spawn, not missed-check replay');
stalled.run('updateGardenPuddles(Date.now(),puddleRandom)'); assert.equal(randomCalls,4);
assert.equal(stalled.run('nextPuddleCheckAt'), stalled.clock.now + 15000);

// Same-eligibility weather polls/intensity changes preserve a running formation cadence.
const polls = createGarden(); weather(polls,'heavy_rain');
const scheduled = polls.run('nextPuddleCheckAt'); polls.clock.now += 10000;
weather(polls,'heavy_rain',8000); assert.equal(polls.run('nextPuddleCheckAt'),scheduled);
weather(polls,'botnet_hurricane'); assert.equal(polls.run('nextPuddleCheckAt'),scheduled);
due(polls); assert.equal(count(polls),1);
const manual = createGarden();
manual.element('#weather-source').value = 'manual'; manual.element('#weather-source').handlers.get('change')[0]();
manual.sources[0].handlers.get('weather')[0]({data:JSON.stringify({level:'botnet_hurricane',eventsPerMinute:10000})});
assert.equal(manual.run('latestLiveWeather.level'),'botnet_hurricane');
assert.equal(manual.run('weatherState.level'),'quiet'); manual.clock.now += 20000; update(manual);
assert.equal(count(manual),0, 'stale live state cannot form water while Manual has quiet applied');
manual.element('#weather-level').value='heavy_rain'; manual.element('#weather-level').handlers.get('change')[0]();
due(manual); assert.equal(count(manual),1, 'manual severe weather shares the same residue path');
manual.element('#weather-level').value='rain'; manual.element('#weather-level').handlers.get('change')[0]();
const lastRefresh = manual.run('gardenState.puddles[0].lastRefreshedAt');
manual.clock.now += 60000; update(manual);
assert.equal(manual.run('gardenState.puddles[0].lastRefreshedAt'),lastRefresh, 'ordinary rain does not refresh');
manual.element('#weather-source').value='live'; manual.element('#weather-source').handlers.get('change')[0]();
assert.equal(manual.run('weatherState.level'),'botnet_hurricane');
due(manual); assert(manual.run('gardenState.puddles[0].lastRefreshedAt') > lastRefresh);

// Location, occupancy, provenance, ecology, and event/score boundaries.
garden.emit(443,'broadleaf',3);
garden.forceRoll(0); garden.emit(22,'redbloom',0); garden.clock.now += 3000; garden.tick();
garden.run('createFirstSeenCuriosity(gardenState.specimens[0],()=>0.125)');
const otherState = json(garden, '[gardenState.specimens,gardenState.grassCells,gardenState.actors,gardenState.curiosities,gardenState.recentEvents]');
const score = garden.element('#garden-score').textContent;
weather(garden,'heavy_rain'); due(garden,[0,0,0,0.2]);
assert.equal(count(garden),1);
assert.equal(json(garden,'[gardenState.specimens,gardenState.grassCells,gardenState.actors,gardenState.curiosities,gardenState.recentEvents]'),otherState);
assert.equal(garden.element('#garden-score').textContent,score);
const coexist = createGarden(); coexist.fill(0); coexist.forceRoll(0); coexist.emit(22,'redbloom',1);
coexist.clock.now += 3000; coexist.tick();
coexist.run('createFirstSeenCuriosity(gardenState.specimens[0],()=>0.125); startGnomeIncident(Date.now(),()=>0.5)');
const coexistBefore = json(coexist,'[gardenState.specimens,gardenState.actors,gardenState.curiosities,gnomeIncident]');
weather(coexist,'botnet_hurricane'); due(coexist);
assert.equal(count(coexist),1);
assert.equal(json(coexist,'[gardenState.specimens,gardenState.actors,gardenState.curiosities,gnomeIncident]'),coexistBefore,
  'forming water preserves active mutation, gnome actors/incident, and curiosity state');
const patch = garden.run('gardenState.puddles[0]');
assert.deepEqual(Object.keys(patch).sort(),['createdAt','lastRefreshedAt','maxSize','seed','size','x','y']);
assert.equal(visual(garden,patch).size,10);
assert.equal(visual(garden,patch,patch.createdAt+15000).size,18, 'new patch grows continuously');
assert(visual(garden,patch,patch.createdAt+7500).size > 10 && visual(garden,patch,patch.createdAt+7500).size < 18);
for (const roll of [0,0.999999]) {
  const edge = createGarden(); weather(edge,'botnet_hurricane'); due(edge,[0,roll,roll,0.25]);
  const item = edge.run('gardenState.puddles[0]');
  assert(item.x >= 60 && item.x <= 900 && item.y >= 60 && item.y <= 540, 'entire maximum footprint stays inside soil border');
  for (let index = 0; index < 15; index++) due(edge,[0,0,0]);
  assert.equal(item.maxSize,36); assert(visual(edge,item).size <= 36);
  assert(item.x-36*1.5 > 3 && item.x+36*1.5 < 957);
  assert(item.y-36*1.5 > 3 && item.y+36*1.5 < 597);
}
const pool = createGarden(); weather(pool,'botnet_hurricane'); due(pool,[0,0.5,0.5,0.2]);
const first = pool.run('gardenState.puddles[0]');
due(pool,[0,0.6,0,0,0,0,0.3]);
assert.equal(count(pool),2, 'refresh boundary can create another patch');
const neighbor = pool.run('gardenState.puddles[1]');
assert.equal(Math.hypot(neighbor.x-first.x,neighbor.y-first.y),24, 'new water often joins a nearby pool');
due(pool,[0,0.599999,0]); assert.equal(count(pool),2, 'usually refresh/grow instead of scattering');
for (let index = 2; index < 8; index++) due(pool,[0,0.9,0.9,0.3,0.3,0.3]);
assert.equal(count(pool),8);
const identities = Array.from(pool.run('gardenState.puddles'));
const refreshBefore = first.lastRefreshedAt; due(pool,[0,0]);
assert.equal(count(pool),8); assert.equal(pool.run('gardenState.puddles[0]'),first);
assert(first.lastRefreshedAt > refreshBefore, 'successful capped attempt refreshes existing water');
assert(Array.from(pool.run('gardenState.puddles')).every((item,index)=>item===identities[index]));

// Drainage is continuous and purely derived; refresh restores life without a size jump.
const drain = createGarden(); weather(drain,'heavy_rain'); due(drain);
const draining = drain.run('gardenState.puddles[0]'); weather(drain,'quiet');
const fullVisual = visual(drain,draining,draining.lastRefreshedAt+30000);
const halfVisual = visual(drain,draining,draining.lastRefreshedAt+270000);
assert(halfVisual.size < fullVisual.size && halfVisual.opacity < fullVisual.opacity);
const stableState = JSON.stringify(draining);
for (let elapsed=30000; elapsed<=510000; elapsed+=10000) visual(drain,draining,draining.lastRefreshedAt+elapsed);
assert.equal(JSON.stringify(draining),stableState, 'time progression never mutates size per frame');
assert.equal(visual(drain,draining,draining.lastRefreshedAt+510000).size,0);
drain.clock.now = draining.lastRefreshedAt+240000;
weather(drain,'botnet_thunderstorm'); drain.clock.now = drain.run('nextPuddleCheckAt');
const beforeRefresh = visual(drain,draining);
update(drain,[0,0,0]);
assert.equal(visual(drain,draining).size,beforeRefresh.size, 'refresh starts at current visual size');
assert.equal(visual(drain,draining).opacity,fullVisual.opacity, 'wetness restored');
assert.equal(draining.lastRefreshedAt,drain.clock.now);
weather(drain,'rain');
drain.run('gardenState.specimens=[]; gardenState.grassCells=[]');
drain.clock.now = draining.lastRefreshedAt+509999; drain.tick(); assert.equal(count(drain),1);
drain.clock.now++; drain.tick(); assert.equal(count(drain),0, 'existing tick removes the final drained terrain patch');
assert.equal(drain.element('#collection-message').hidden,true); assert.equal(drain.element('#garden-score').textContent,'Score: 0');
assert.equal(drain.run('gardenState.recentEvents.length'),0);

// Click routing remains specimen/curiosity/mutation-owned, not puddle-owned.
const clicks = createGarden(); clicks.emit(443,'flower',0);
const specimen = clicks.run('gardenState.specimens[0]');
weather(clicks,'heavy_rain'); due(clicks);
const clickPuddle = clicks.run('gardenState.puddles[0]');
clickPuddle.x=(specimen.column+0.5)*30; clickPuddle.y=(specimen.row+0.5)*30;
clicks.click(clickPuddle.x,clickPuddle.y);
assert.equal(clicks.element('#specimen-card').hidden,false); assert.equal(count(clicks),1);
assert.equal(clicks.element('#collection-message').hidden,true, 'water has no collection message');
clicks.click(100,100); assert.equal(clicks.element('#specimen-card').hidden,true);
assert.equal(count(clicks),1); assert.equal(clicks.element('canvas').handlers.get('click').length,1);

// Hidden ticks never roll; restore expires water and starts a fresh cadence without replay.
const hidden = createGarden(); weather(hidden,'botnet_hurricane'); due(hidden);
hidden.run('gardenState.specimens=[]; gardenState.grassCells=[]');
hidden.setHidden(true);
hidden.sandbox.Math.random = () => { throw new Error('hidden/resume must not roll formation'); };
hidden.clock.now += 600000; hidden.tick(); assert.equal(count(hidden),0);
hidden.setHidden(false); hidden.tick(); assert.equal(count(hidden),0);
assert.equal(hidden.run('nextPuddleCheckAt'),hidden.clock.now+15000);
hidden.sandbox.Math.random=()=>0; hidden.clock.now+=14999; hidden.tick(); assert.equal(count(hidden),0);
hidden.clock.now++; hidden.tick(); assert.equal(count(hidden),1, 'only a future resumed check can form water');
const suspended = createGarden(); weather(suspended,'botnet_hurricane'); due(suspended);
suspended.setHidden(true); suspended.clock.now += 600000; suspended.setHidden(false);
assert.equal(count(suspended),0, 'restore discards expired water even without intervening hidden ticks');
const resize = createGarden(); weather(resize,'heavy_rain'); due(resize);
const stateBeforeResize = json(resize,'gardenState.puddles');
resize.resize({left:80,top:90,width:390,height:740}); assert.equal(json(resize,'gardenState.puddles'),stateBeforeResize);
assert.equal(resize.intervals.length,2, 'no dedicated puddle timers after growth/expiry/resize');

// Actual layer order and cached context, not just a drawing-function unit test.
const layers = createGarden(); layers.emit(443,'flower'); weather(layers,'heavy_rain'); due(layers);
const order = []; layers.sandbox.recordLayer = name => order.push(name);
layers.run(`
  const grassBeforeWater=drawGrass;
  drawGrass=(grass,now)=>{recordLayer('grass'); grassBeforeWater(grass,now)};
  const waterBeforeLayerTest=drawGardenPuddles;
  drawGardenPuddles=now=>{
    if(context!==gardenBaseContext) throw new Error('water must use cached base context');
    recordLayer('water'); waterBeforeLayerTest(now);
  };
  for(const config of speciesConfig.values()) {
    const render=config.render; config.render=(specimen,now)=>{recordLayer('specimen'); render(specimen,now)};
  }
  const rainBeforeLayerTest=drawRain;
  drawRain=now=>{recordLayer('rain'); rainBeforeLayerTest(now)};
  drawGarden();
`);
assert(order.indexOf('grass') < order.indexOf('water'));
assert(order.indexOf('water') < order.indexOf('specimen'));
assert(order.indexOf('specimen') < order.indexOf('rain'));
order.length=0;
const start = layers.clock.now;
for (let index=1; index<=120; index++) { layers.frame(start+index*1000/120); layers.drawing.length=0; }
assert.equal(order.filter(name=>name==='rain').length,30);
assert(!order.includes('water') && !order.includes('grass') && !order.includes('specimen'), 'RAF does not redraw cached water/ecology');
layers.run('drawGarden()'); order.length=0;
for(let index=0;index<3;index++){layers.clock.now+=250;layers.tick()}
assert.equal(order.filter(name=>name==='water').length,0,'water does not repaint on unchanged quarter-second ticks');
layers.clock.now+=250;layers.tick();assert.equal(order.filter(name=>name==='water').length,1,'drainage ages at the one-second visual cadence');

console.log('PASS: severe-only 15s cadence and 35/60/85% boundaries, cap8/nearby pools/60% refresh, smooth bounded growth and 30s+8min drainage, applied Manual/Live weather, hidden/no catch-up, state/occupancy/provenance/grass/activity/score/click isolation, resize/no timers, cached grass-water-specimen order. Water+rain: 120 RAF callbacks -> 30 overlay paints, zero water/ecology redraws.');
