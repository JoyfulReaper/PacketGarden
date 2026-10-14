// Structural renderer checks with synthetic RAF/time; no wall-clock benchmarks or sleeps.
const assert = require('node:assert/strict');
const createGarden = require('./browser-garden.cjs');

function instrument(garden) {
  const work = { base: 0, species: 0, grass: 0, overlay: 0, mutation: 0, water: 0 };
  for (const name of Object.keys(work)) garden.sandbox['count' + name] = () => work[name]++;
  garden.run(`
    const originalBase = rebuildGardenBase;
    rebuildGardenBase = now => { countbase(); return originalBase(now); };
    for (const config of speciesConfig.values()) {
      const render = config.render;
      config.render = (specimen,now) => { countspecies(); render(specimen,now); };
    }
    const originalGrass = drawGrass;
    drawGrass = (grass,now) => { countgrass(); originalGrass(grass,now); };
    const originalRain = drawRain;
    drawRain = now => { countoverlay(); originalRain(now); };
    const originalMutation = drawSpecimenMutation;
    drawSpecimenMutation = (specimen,now) => { countmutation(); return originalMutation(specimen,now); };
    const originalWater = drawGardenPuddles;
    drawGardenPuddles = now => { countwater(); return originalWater(now); };
  `);
  work.reset = () => { for (const name of ['base','species','grass','overlay','mutation','water']) work[name] = 0; };
  return work;
}
const weather = (garden, level, eventsPerMinute = 10000) =>
  garden.run(`Object.assign(weatherState,{level:'${level}',eventsPerMinute:${eventsPerMinute}}); updateWeatherAnimation()`);
const advanceFrames = (garden, start, count, hz = 120, tick = false) => {
  for (let frame = 1; frame <= count; frame++) {
    garden.frame(start + frame * 1000 / hz);
    if (tick && frame % (hz / 4) === 0) garden.tick();
    garden.drawing.length = 0;
  }
};

const garden = createGarden(), work = instrument(garden);
assert.equal(garden.frames.size, 0, 'quiet has no idle animation');
assert.equal(garden.run('rendererConfig.animationFps'), 30);
assert.equal(garden.run('rendererConfig.maxPixelRatio'), 2);
garden.emit(443, 'broadleaf');
assert(work.base > 0 && work.species > 0, 'spawn refreshes ecology immediately');
weather(garden, 'rain'); assert.equal(garden.frames.size, 1);
work.reset();
let boundsReads = 0;
const rect = garden.element('canvas').getBoundingClientRect;
garden.element('canvas').getBoundingClientRect = () => { boundsReads++; return rect(); };
let backingWrites = 0;
for (const target of [garden.element('canvas'), garden.run('gardenBaseCanvas')]) {
  for (const property of ['width','height']) {
    let value = target[property];
    Object.defineProperty(target, property, { get: () => value, set: next => { backingWrites++; value = next; } });
  }
}
const unchanged = garden.run('JSON.stringify(gardenState)');
advanceFrames(garden, garden.clock.now, 120);
assert.equal(work.overlay, 30, '120 callbacks at 120 Hz paint 30 animated frames');
assert.equal(work.base, 0); assert.equal(work.species, 0); assert.equal(work.grass, 0);
assert.equal(boundsReads, 0, 'RAF reuses presentation geometry instead of reading layout');
assert.equal(backingWrites, 0, 'RAF never resets/reallocates backing stores');
assert.equal(garden.run('JSON.stringify(gardenState)'), unchanged, 'rendering never updates ecology');
const cache = garden.run('gardenBaseCanvas');
assert.notEqual(cache, garden.element('canvas'));
work.reset(); advanceFrames(garden, garden.clock.now, 144, 144);
assert(work.overlay >= 28 && work.overlay <= 30, '144 Hz is also bounded near 30 FPS');
assert.equal(work.base, 0);
work.reset(); advanceFrames(garden, garden.clock.now, 60, 60);
assert.equal(work.overlay, 30, '60 Hz display paints alternate frames');
const quantized = createGarden(); quantized.sandbox.Date.now = () => Math.floor(quantized.clock.now);
weather(quantized, 'rain'); const quantizedWork = instrument(quantized);
advanceFrames(quantized, quantized.clock.now, 60, 60);
assert.equal(quantizedWork.overlay, 30, 'FPS scheduling uses precise RAF time, not integer Date.now');

// Soil/rain changes are immediate; the weather configuration and original rain renderer are preserved.
for (const level of ['drizzle','rain','heavy_rain','botnet_thunderstorm','botnet_hurricane']) {
  work.reset(); weather(garden, level);
  assert.equal(work.base, 1); assert.equal(work.overlay, 1);
  assert.equal(garden.frames.size, 1);
  assert.equal(garden.run('weatherState.level'), level);
  assert(garden.run('gardenBaseCanvas') === cache, 'same cache canvas across weather changes');
}
weather(garden, 'rain', 0); assert.equal(garden.frames.size, 0, 'zero intensity has no weather loop');
weather(garden, 'quiet'); assert.equal(garden.frames.size, 0, 'quiet cancels cleanly');
weather(garden, 'rain');
work.reset(); garden.setHidden(true);
assert.equal(garden.frames.size, 0, 'hidden cancels scheduled weather');
const hiddenState = garden.run('JSON.stringify(weatherState)');
garden.clock.now += 5000; garden.tick();
assert.equal(work.base, 0); assert.equal(work.overlay, 0, 'hidden tick never paints');
garden.setHidden(false);
assert.equal(work.base, 1); assert.equal(work.overlay, 1, 'one current refresh on resume');
assert.equal(garden.frames.size, 1);
assert.equal(garden.run('JSON.stringify(weatherState)'), hiddenState);
work.reset(); garden.frame(garden.clock.now + 100000);
assert.equal(work.overlay, 1, 'stalled tab paints once without catch-up');
assert.equal(work.base, 0);

// Resize and DPR rebuild only when needed, preserving exact logical hit geometry and state.
const stateBeforeResize = garden.run('JSON.stringify(gardenState)');
garden.sandbox.window.devicePixelRatio = 4;
work.reset(); garden.resize({ left: 120, top: 90, width: 390, height: 740 });
assert.equal(work.base, 1);
assert.equal(garden.element('canvas').width, 780); assert.equal(cache.width, 780);
assert.equal(garden.element('canvas').height, 1480); assert.equal(cache.height, 1480);
assert.equal(garden.run('gardenView.pixelRatio'), 2);
assert.equal(garden.run('JSON.stringify(gardenState)'), stateBeforeResize);
work.reset(); garden.resize({ left: 120, top: 90, width: 390, height: 740 });
assert.equal(work.base, 0, 'duplicate resize notifications reuse the rebuilt scene');
const specimen = garden.run('gardenState.specimens[0]');
garden.click((specimen.column + 0.5) * 30, (specimen.row + 0.5) * 30);
assert.equal(garden.element('#specimen-card').hidden, false);
assert.equal(garden.element('#specimen-sensor').textContent, 'garden-test');
backingWrites = 0; work.reset(); garden.run('drawGarden()');
assert.equal(backingWrites, 0, 'same-size ecology refresh preserves backing allocations');
garden.sandbox.window.devicePixelRatio = 1; garden.run('drawGarden()');
assert.equal(garden.element('canvas').width, 390, 'ordinary DPR stays native');
garden.resize({ left: 0, top: 0, width: 0, height: 0 });
assert.equal(garden.frames.size, 0, 'zero-sized canvas pauses rendering');
garden.resize({ left: 0, top: 0, width: 992, height: 632 });
assert.equal(garden.frames.size, 1, 'resize restores animation');

// Lifecycle/grass refresh continues on the existing bounded tick, including final expiry.
const aging = createGarden(), ageWork = instrument(aging);
aging.emit(443, 'broadleaf');
aging.drawing.length = 0; aging.tick();
const initialGrassSizes = aging.drawing.filter(([method]) => method === 'ellipse').map(call => call[3]);
aging.clock.now += 250; ageWork.reset(); aging.drawing.length = 0; aging.tick();
assert.equal(ageWork.base, 1);
assert.notDeepEqual(aging.drawing.filter(([method]) => method === 'ellipse').map(call => call[3]), initialGrassSizes, 'grass visible growth progresses');
aging.clock.now += 45000; ageWork.reset(); aging.tick();
assert.equal(ageWork.base, 1); assert(ageWork.species > 0, 'specimen age stages still render');
aging.run('gardenState.grassCells=[]; gardenState.specimens[0].createdAt=Date.now()-360000');
ageWork.reset(); aging.tick();
assert.equal(aging.run('gardenState.specimens.length'), 0);
assert.equal(ageWork.base, 1, 'final removal refreshes empty scene');

// Mutations animate in quiet weather without redrawing ordinary specimens or affecting activity.
const mutated = createGarden(), mutationWork = instrument(mutated);
mutated.forceRoll(0); mutated.emit();
const originalRecent = mutated.run('JSON.stringify(gardenState.recentEvents)');
mutated.clock.now += 3000; mutationWork.reset(); mutated.tick();
assert.equal(mutationWork.base, 1); assert.equal(mutationWork.species, 0);
assert.equal(mutationWork.mutation, 1); assert.equal(mutated.frames.size, 1);
mutationWork.reset(); advanceFrames(mutated, mutated.clock.now, 120);
assert.equal(mutationWork.base, 0); assert.equal(mutationWork.species, 0); assert.equal(mutationWork.mutation, 30);
const plant = mutated.run('gardenState.specimens[0]');
mutated.resize({ left: 75, top: 35, width: 480, height: 700 }); mutationWork.reset();
mutated.click((plant.column + 0.5) * 30, (plant.row + 0.5) * 30);
assert.equal(mutated.run('gardenState.specimens.length'), 0);
assert.equal(mutated.element('#specimen-card').hidden, true);
assert.equal(mutationWork.base, 1); assert.equal(mutated.frames.size, 0, 'last mutation stops its quiet animation');
assert.equal(mutated.element('#collection-message').textContent, 'You collected some weed. +0 points');
assert.equal(mutated.element('#garden-score').textContent, 'Score: 0');
assert.equal(mutated.run('JSON.stringify(gardenState.recentEvents)'), originalRecent);
const toggle = mutated.element('#show-recent-activity');
for (const checked of [false, true]) {
  toggle.checked = checked; toggle.handlers.get('change')[0]();
  assert.equal(mutated.element('#recent-activity').hidden, !checked);
}

// Actors use only the shared animated compositor, including simultaneous rain.
const actors = createGarden(); actors.fill(0); actors.run('drawGarden()');
const actorWork = instrument(actors);
actors.run('startGnomeIncident(Date.now(),()=>0.5)'); weather(actors, 'rain'); actorWork.reset();
const actorStart = actors.run('JSON.stringify(gardenState.actors)');
advanceFrames(actors, actors.clock.now, 120);
assert.equal(actorWork.base, 0); assert.equal(actorWork.species, 0);
assert.equal(actorWork.overlay, 30, 'two RAF loops share one 30 FPS budget');
assert.notEqual(actors.run('JSON.stringify(gardenState.actors)'), actorStart, 'gnomes keep moving');
actors.setHidden(true); assert.equal(actors.frames.size, 0, 'hidden pauses actor and weather RAF');
actors.clock.now += 1000; actors.setHidden(false); assert.equal(actors.frames.size, 2, 'both resume with one callback each');
actorWork.reset(); actors.run('finishGnomeIncident()');
assert.equal(actorWork.base, 0, 'actor cleanup never invalidates ecology');

// Dense mature vines and grass: count actual production renderer calls, not elapsed wall time.
const dense = createGarden();
dense.run('gardenState.specimens=Array.from({length:640},(_,i)=>({type:"vine",column:i%columns,row:Math.floor(i/columns),createdAt:Date.now()-120000,vigor:i%4})); gardenState.grassCells=Array.from({length:640},(_,i)=>({column:i%columns,row:Math.floor(i/columns),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()})); drawGarden()');
weather(dense, 'botnet_hurricane');
dense.run('for(let i=0;i<8;i++) createStormPuddle(Date.now(),()=>0.5); drawGarden()');
const denseWork = instrument(dense), denseState = dense.run('JSON.stringify(gardenState)');
advanceFrames(dense, dense.clock.now, 120, 120, true);
assert.equal(denseWork.base, 4);
assert.equal(denseWork.water,4, 'eight water patches still draw only in four cached scene refreshes');
assert.equal(denseWork.species, 2560); assert.equal(denseWork.grass, 2560);
assert(denseWork.overlay >= 28 && denseWork.overlay <= 34);
assert.equal(dense.run('JSON.stringify(gardenState)'), denseState, 'dense rendering changes no ecology');
const stressReport = `${denseWork.base} base rebuilds, ${denseWork.species} specimen renders, ${denseWork.grass} grass renders, ${denseWork.overlay} overlay paints`;
// High-rate dropped traffic must not turn every weather frame into a base rebuild again.
denseWork.reset();
const beforeDroppedTraffic = dense.run('JSON.stringify([gardenState.specimens,gardenState.grassCells])');
const droppedStart = dense.clock.now;
for (let frame = 1; frame <= 120; frame++) {
  dense.frame(droppedStart + frame * 1000 / 120); dense.emit(); dense.drawing.length = 0;
}
assert.equal(denseWork.base, 0); assert.equal(denseWork.species, 0);
assert.equal(denseWork.water,0, 'dropped traffic/animated rain never redraw standing water');
assert.equal(dense.run('JSON.stringify([gardenState.specimens,gardenState.grassCells])'), beforeDroppedTraffic);
assert(dense.run('gardenState.recentEvents.every(event=>event.outcome==="dropped")'));
console.log(`PASS: dense garden + 8 water patches: 120 RAF callbacks + 4 lifecycle ticks -> ${stressReport}, 4 water passes; another 120 dropped events cause zero extra base rebuilds. FPS/cache/invalidation/hidden/DPR/resize/hits/mutations/actors/activity checks passed.`);
