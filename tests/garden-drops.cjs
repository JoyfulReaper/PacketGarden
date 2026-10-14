// Production browser path, fake time and injected rolls; no sleeps or device access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const createGarden = require('./browser-garden.cjs');
const count = garden => garden.run('gardenState.drops.length');
const pending = garden => garden.run('pendingLooseDrops.size');
const json = (garden, expression) => garden.run(`JSON.stringify(${expression})`);
const center = specimen => [(specimen.column + 0.5) * 30, (specimen.row + 0.5) * 30];
function force(garden, roll = 0) {
  garden.sandbox.dropRoll = roll;
  garden.run(`if (typeof originalAmanitaTrigger === 'undefined') var originalAmanitaTrigger = maybeScheduleAmanitaDrop;
    maybeScheduleAmanitaDrop = specimen => originalAmanitaTrigger(specimen, dropRoll, () => 0.5)`);
}
function live(garden, extra = {}) {
  garden.clock.now++;
  garden.sandbox.incoming = { specimenType: 'mushroom', listenPort: 70, vigor: 2,
    sensor: 'drop-test', seenCount: '12', ...extra };
  return garden.run('handleLiveGardenEvent(incoming)');
}
function step(garden, ms) { garden.clock.now += ms; garden.tick(); }
function position(garden, drop) {
  garden.sandbox.testDrop = drop;
  return garden.run('looseDropPosition(testDrop)');
}
function collect(garden, drop) {
  const point = position(garden, drop); garden.click(point.x, point.y);
}
function ready(garden = createGarden()) {
  force(garden); const result = live(garden); step(garden, 5000);
  return { garden, source: result.specimen, drop: garden.run('gardenState.drops[0]') };
}

const garden = createGarden();
assert.equal(garden.sources.length, 1);
assert.equal(garden.sources[0].url, '/api/garden/events');
assert.equal(garden.sources[0].handlers.get('garden').length, 1);
assert.equal(garden.element('canvas').handlers.get('click').length, 1);
assert.equal(garden.element('#garden-overlay').handlers.size, 0);
assert.equal(garden.intervals.length, 2);
assert.equal(garden.run('looseDropConfig.amanitaDropChance'), 0.01);
assert.equal(garden.run('looseDropConfig.delayMs'), 5000);
assert.equal(garden.run('looseDropConfig.maxActiveDrops'), 3);
assert.equal(garden.run('looseDropConfig.lifetimeMs'), 20000);
assert.equal(json(garden, 'Array.from(looseDropTypes.keys())'), '["amanita_muscaria"]');
assert.equal(count(garden), 0);
const sse = createGarden(); force(sse);
sse.sources[0].emit({specimenType:'mushroom',listenPort:21,vigor:0,seenCount:'12'});
assert.equal(pending(sse),1,'the existing SSE handler reaches the authoritative drop trigger');

// Only exact successful live mushrooms reach the probability seam, including replacements.
force(garden);
let supplied;
garden.sandbox.captureSource = specimen => { supplied = specimen; };
garden.run('const forcedAmanita = maybeScheduleAmanitaDrop; maybeScheduleAmanitaDrop = specimen => { captureSource(specimen); return forcedAmanita(specimen) }');
const first = live(garden), second = live(garden, { vigor: 3, seenCount: '18446744073709551615',
  remoteIp: 'EXCLUDED', remotePort: 12345, payload: 'EXCLUDED', banner: 'EXCLUDED', credentials: 'EXCLUDED' });
assert.equal(supplied, second.specimen);
assert.notEqual(first.specimen, second.specimen);
garden.sandbox.exactSource = second.specimen;
assert.equal(garden.run('pendingLooseDrops.has(exactSource)'), true);
assert.equal(pending(garden), 2);
const sourceBefore = JSON.stringify(second.specimen);
assert.equal(second.specimen.type, 'mushroom');
assert.equal(second.specimen.vigor, 3);
assert(second.specimen.colorVariant);
assert.equal(second.specimen.origin.seenCount, '18446744073709551615');
const unchangedEcology = json(garden, '[gardenState.specimens,gardenState.grassCells,gardenState.puddles,gardenState.recentEvents]');
const recentBefore = json(garden, 'gardenState.recentEvents');
step(garden, 4998); assert.equal(count(garden), 0, 'delay does not round early');
step(garden, 1); assert.equal(count(garden), 1, 'first source becomes due independently');
step(garden, 1); assert.equal(count(garden), 2);
assert.equal(pending(garden), 0);
assert.equal(JSON.stringify(second.specimen), sourceBefore, 'all source fields and ordinary lifecycle remain intact');
assert.equal(json(garden, '[gardenState.specimens,gardenState.grassCells,gardenState.puddles,gardenState.recentEvents]'), unchangedEcology);
assert.equal(garden.run('gardenState.specimens.length'), 2, 'no extra specimen cell');
assert(!json(garden, 'gardenState').includes('EXCLUDED'));
const drop = garden.run('gardenState.drops[1]');
assert.notEqual(drop, second.specimen);
assert.deepEqual(Object.keys(drop).sort(), ['createdAt','expiresAt','phase','type','x','y']);
assert.equal(drop.type, 'amanita_muscaria');
assert.equal(drop.createdAt, garden.clock.now);
assert.equal(drop.expiresAt - drop.createdAt, 20000);
assert(!('origin' in drop));
const independentSource = ready(), sourceRemoved = independentSource.garden;
sourceRemoved.run('gardenState.specimens=[];updateLooseDrops()');
assert.equal(count(sourceRemoved),1,'once active, the separate drop keeps its own lifetime');
const distance = Math.hypot(drop.x-center(second.specimen)[0],drop.y-center(second.specimen)[1]);
assert(distance >= 18 && distance <= 22, 'beside exact source, not under its center');

let attempts = 0;
const filtered = createGarden(); filtered.sandbox.attempt = () => attempts++;
filtered.run('maybeScheduleAmanitaDrop = specimen => { attempt(); return false }');
for (const type of ['flower','broadleaf','vine','redbloom','weed','ghostbloom','crystalfungus','blackthorn']) live(filtered,{specimenType:type});
assert.equal(attempts, 0, 'non-mushroom growth does not roll');
filtered.element('#fake-gopher').handlers.get('click')[0]();
assert.equal(attempts, 0, 'fake Gopher does not roll');
live(filtered); assert.equal(attempts, 1);
const full = createGarden(); force(full); full.fill(0);
const rejected = live(full, { vigor: 0 });
assert.equal(rejected.outcome, 'dropped'); assert.equal(rejected.specimen, null); assert.equal(pending(full), 0);
const replaced = live(full, { vigor: 1 });
assert.equal(replaced.outcome, 'replaced'); assert.equal(full.run('gardenState.specimens[0]'), replaced.specimen);
assert.equal(full.run('pendingLooseDrops.has(gardenState.specimens[0])'), true);
step(full, 5000); assert.equal(count(full), 1); assert.equal(full.run('gardenState.specimens.length'), 640);
for (const roll of [0, 0.009999, 0.01, 0.5, 1, -1, NaN, Infinity]) {
  const check = createGarden(); force(check, roll); live(check);
  assert.equal(pending(check), Number(roll >= 0 && roll < 0.01), `roll ${roll}`);
}
const direct = createGarden(); direct.run("handleGardenEvent({type:'gopher'})");
assert.equal(direct.run('maybeScheduleAmanitaDrop(gardenState.specimens[0],0)'), false);
assert.equal(direct.run('scheduleLooseDrop(gardenState.specimens[0],"unimplemented")'), false);
assert.equal(direct.run('scheduleLooseDrop({type:"mushroom"},"amanita_muscaria")'), false);
assert.equal(direct.run('scheduleLooseDrop(gardenState.specimens[0],"amanita_muscaria",()=>0.5)'), true, 'generic test seam works with fake source');
assert.equal(direct.run('scheduleLooseDrop(gardenState.specimens[0],"amanita_muscaria",()=>0.5)'), false, 'one pending attempt per exact reference');

// Chance is independent of metadata/weather/terrain; injected RNG supplies roll and placement.
for (const vigor of [0,1,2,3]) {
  const check = createGarden(); force(check);
  check.run('Object.assign(weatherState,{level:"botnet_hurricane",eventsPerMinute:10000}); updateWeatherAnimation(); createStormPuddle(Date.now(),()=>0.5)');
  live(check, { vigor, sensor: 'any-ygg-dn42', seenCount: '1' });
  assert.equal(pending(check), 1); assert.equal(check.run('gardenState.curiosities.length'),1);
}
let randomCalls = 0;
const injected = createGarden(); const injectedSource = live(injected).specimen;
injected.sandbox.injectedSource = injectedSource;
injected.sandbox.injectedRandom = () => { randomCalls++; return 0.005; };
assert.equal(injected.run('maybeScheduleAmanitaDrop(injectedSource,undefined,injectedRandom)'),true);
assert.equal(randomCalls,4,'one chance plus angle/radius/phase; no other inputs');

// Removal, ordinary expiry, and same-cell displacement cancel the exact pending source.
for (const remove of ['gardenState.specimens=[]', 'gardenState.specimens[0].createdAt=Date.now()-300000']) {
  const check = createGarden(); force(check); live(check); check.run(remove); step(check,5000);
  assert.equal(count(check),0); assert.equal(pending(check),0);
}
const displaced = createGarden(); displaced.fill(0); force(displaced);
const victim = live(displaced,{vigor:1}).specimen;
displaced.sandbox.victim = victim;
displaced.run('gardenState.specimens.forEach(item=>{if(item!==victim)item.vigor=3})');
live(displaced,{vigor:2,specimenType:'flower'}); step(displaced,5000);
assert.equal(count(displaced),0); assert.equal(pending(displaced),0);
assert.equal(displaced.run('gardenState.specimens.includes(victim)'),false);

// Global cap is checked at activation, all due candidates consumed with no retry.
const capped = createGarden(); force(capped);
for(let i=0;i<4;i++) live(capped);
assert.equal(pending(capped),4); step(capped,5000);
assert.equal(count(capped),3); assert.equal(pending(capped),0);
collect(capped,capped.run('gardenState.drops[0]')); assert.equal(count(capped),2);
step(capped,250); assert.equal(count(capped),2); assert.equal(pending(capped),0);
const cappedSources = json(capped,'gardenState.specimens'), cappedRecent = json(capped,'gardenState.recentEvents');
capped.clock.now = capped.run('gardenState.drops[0].expiresAt'); capped.tick();
assert.equal(count(capped),0); assert.equal(json(capped,'gardenState.specimens'),cappedSources);
assert.equal(json(capped,'gardenState.recentEvents'),cappedRecent);
assert.equal(capped.element('#collection-message').hidden,true,'expiry shows no message');
assert.equal(capped.element('#garden-score').textContent,'Score: 0');

// Corner/edge placement, deterministic sequences, and bobbing stay visible in 960x600.
for (const column of [0,31]) for (const row of [0,19]) for(const value of [0,0.125,0.25,0.5,0.75,0.999]) {
  const check=createGarden();
  check.run(`gardenState.specimens=[{type:'mushroom',column:${column},row:${row},createdAt:Date.now(),vigor:0}]; scheduleLooseDrop(gardenState.specimens[0],'amanita_muscaria',()=>${value})`);
  step(check,5000); const object=check.run('gardenState.drops[0]'), point=position(check,object);
  assert(point.x>=9&&point.x<=951&&point.y>=9&&point.y<=591);
  assert(Math.hypot(object.x-center(check.run('gardenState.specimens[0]'))[0],object.y-center(check.run('gardenState.specimens[0]'))[1])>=18-1e-8);
}
const places = [createGarden(),createGarden()];
for(const check of places){force(check);live(check);step(check,5000)}
assert.equal(json(places[0],'gardenState.drops'),json(places[1],'gardenState.drops'));

// Creation/animation/removal touch only the overlay, with no base bitmap copies.
const animated = createGarden(); force(animated);
for(let i=0;i<3;i++)live(animated);
animated.clock.now+=5000;
animated.run('drawGarden()'); // Account for unrelated slow specimen aging before isolated drop update.
animated.drawing.length=0;
assert.equal(animated.run('updateLooseDrops()'),true);
assert.equal(animated.run('gardenBaseDirty'),false);
animated.run('drawGardenOverlay(true); syncWeatherAnimation()');
assert(animated.drawing.length>0 && animated.drawing.every(call=>call.surface==='overlay'));
assert(animated.drawing.some(call=>call[0]==='fillStyle'&&call[1]==='#d84739'),'red cap on overlay');
assert(animated.drawing.some(call=>call[0]==='fillStyle'&&call[1]==='#fff2dd'),'white spots on overlay');
let baseRebuilds=0, dropRenders=0, overlayPaints=0, copies=0;
animated.sandbox.baseWork=()=>baseRebuilds++;
animated.sandbox.dropWork=()=>dropRenders++;
animated.run('const baseBeforeDrops=rebuildGardenBase; rebuildGardenBase=now=>{baseWork();return baseBeforeDrops(now)}; const amanitaRender=looseDropTypes.get("amanita_muscaria").render; looseDropTypes.get("amanita_muscaria").render=(drop,now)=>{dropWork();amanitaRender(drop,now)}');
const start=animated.clock.now;
for(let i=1;i<=120;i++){
  animated.drawing.length=0; animated.frame(start+i*1000/120);
  assert(animated.drawing.every(call=>call.surface==='overlay'));
  overlayPaints+=animated.drawing.filter(call=>call[0]==='clearRect').length;
  copies+=animated.drawing.filter(call=>call[0]==='drawImage').length;
}
assert.equal(overlayPaints,30);assert.equal(dropRenders,90);assert.equal(baseRebuilds,0);assert.equal(copies,0);
animated.drawing.length=0;collect(animated,animated.run('gardenState.drops[0]'));
assert.equal(baseRebuilds,0);assert(animated.drawing.every(call=>call.surface==='overlay'));
animated.clock.now=animated.run('gardenState.drops[0].expiresAt');
animated.run('updateLooseDrops(); drawGardenOverlay(true); syncWeatherAnimation()');
assert.equal(baseRebuilds,0);assert.equal(animated.frames.size,0,'quiet stops after last drop');

// Click collects only that exact drop, preserves source inspection/activity, and stays at zero.
const clicked=ready(), check=clicked.garden;
const beforeClick=json(check,'[gardenState.specimens,gardenState.grassCells,gardenState.puddles,gardenState.recentEvents]');
check.click(...center(clicked.source));assert.equal(check.element('#specimen-card').hidden,false);
assert.equal(check.element('#specimen-card-title').textContent,'Mushroom');
assert.equal(check.element('#specimen-mutation').textContent,'None');
collect(check,clicked.drop);assert.equal(count(check),0);
assert.equal(check.run('inspectedSpecimen'),clicked.source,'source card remains intact');
assert.equal(json(check,'[gardenState.specimens,gardenState.grassCells,gardenState.puddles,gardenState.recentEvents]'),beforeClick);
assert.equal(check.element('#collection-message').textContent,'You found Amanita muscaria. +0 points');
assert.equal(check.element('#garden-score').textContent,'Score: 0');assert.equal(check.audioContexts(),0,'Sound Off does not initialize audio');
check.sandbox.alreadyCollected=clicked.drop;
assert.equal(check.run('collectLooseDrop(alreadyCollected)'),false,'cannot collect twice');
step(check,2000);assert.equal(check.element('#collection-message').hidden,true);
check.click(900,590);assert.equal(check.element('#specimen-card').hidden,true,'empty closes');
let sounds=0; check.sandbox.collectionCue=()=>sounds++;check.run('gardenSound.maybePlayCollectionSound=collectionCue');
for(let i=0;i<8;i++){
  live(check);step(check,5000);collect(check,check.run('gardenState.drops[0]'));
  assert.equal(check.element('#garden-score').textContent,'Score: 0');
}
assert.equal(sounds,8,'existing optional sound path reused');
assert.equal(check.intervals.length,2,'no per-drop timers, even after repeated collections');

// Deterministic overlap order: curiosity, loose drop (newest first), mutation, inspection.
const overlap=ready(), shared=overlap.garden;
shared.sandbox.sharedDrop=overlap.drop; shared.sandbox.sharedSource=overlap.source;
shared.run(`sharedDrop.x=(sharedSource.column+.5)*cellSize; sharedDrop.y=(sharedSource.row+.5)*cellSize; sharedDrop.phase=0;
  createFirstSeenCuriosity(sharedSource,()=>.875); const visitor=gardenState.curiosities[0]; visitor.type='shiny_pebble';visitor.x=sharedDrop.x;visitor.y=sharedDrop.y`);
shared.click(...center(overlap.source));assert.equal(shared.run('gardenState.curiosities.length'),0);assert.equal(count(shared),1);
assert.equal(shared.element('#specimen-card').hidden,true);
shared.click(...center(overlap.source));assert.equal(count(shared),0);assert.equal(shared.run('gardenState.specimens[0]'),overlap.source);
assert.equal(shared.element('#specimen-card').hidden,true,'drop wins over inspection');
shared.click(...center(overlap.source));assert.equal(shared.element('#specimen-card').hidden,false);
const mixed=ready(), mix=mixed.garden; mix.forceRoll(0); mix.emit();step(mix,3000);
mix.run('const mutationSource=gardenState.specimens.at(-1); const overlappingDrop=gardenState.drops[0]; overlappingDrop.x=(mutationSource.column+.5)*cellSize; overlappingDrop.y=(mutationSource.row+.5)*cellSize; overlappingDrop.phase=-(Date.now()-overlappingDrop.createdAt)/1400');
const mutation=mix.run('mutationSource'), mutationBefore=JSON.stringify(mutation);
mix.click(...center(mutation));assert.equal(count(mix),0);assert.equal(JSON.stringify(mutation),mutationBefore);
assert.equal(mix.run('gardenState.specimens.includes(mutationSource)'),true,'drop wins over mutation');
mix.click(...center(mutation));assert.equal(mix.run('gardenState.specimens.includes(mutationSource)'),false);
assert.equal(mix.element('#collection-message').textContent,'You collected some weed. +0 points');
const newest=ready(), n=newest.garden;
n.run('gardenState.drops.push({...gardenState.drops[0]})');
const bottom=n.run('gardenState.drops[0]'),top=n.run('gardenState.drops[1]');collect(n,top);
assert.equal(count(n),1);assert.equal(n.run('gardenState.drops[0]'),bottom,'newest overlapping drop collected only');

// Independent caps and state, including gnome starts/finishes and existing terrain.
const independent=createGarden();force(independent);independent.fill(0);
independent.run('for(let i=0;i<3;i++)createFirstSeenCuriosity(gardenState.specimens[i],()=>.875); startGnomeIncident(Date.now(),()=>.5); for(let i=0;i<3;i++){gardenState.specimens[i].vigor=3; gardenState.specimens[i].mutation={type:"collectible_weed",createdAt:Date.now(),expiresAt:Date.now()+20000}} createStormPuddle(Date.now(),()=>.5)');
const coexist=json(independent,'[gardenState.actors,gardenState.curiosities,gardenState.puddles,gardenState.specimens.slice(0,3)]');
for(let i=0;i<3;i++)live(independent,{vigor:1,seenCount:'1'});
independent.clock.now+=5000;independent.run('updateLooseDrops()');assert.equal(count(independent),3);
assert.equal(json(independent,'[gardenState.actors,gardenState.curiosities,gardenState.puddles,gardenState.specimens.slice(0,3)]'),coexist);
collect(independent,independent.run('gardenState.drops[0]'));
assert.equal(json(independent,'[gardenState.actors,gardenState.curiosities,gardenState.puddles,gardenState.specimens.slice(0,3)]'),coexist);
independent.clock.now+=20000;independent.run('updateLooseDrops()');assert.equal(count(independent),0);
assert.equal(json(independent,'[gardenState.actors,gardenState.curiosities,gardenState.puddles,gardenState.specimens.slice(0,3)]'),coexist);
const gnomes=ready(), g=gnomes.garden;
g.run('for(let i=0;i<30;i++)gardenState.specimens.push({type:"flower",column:i,row:0,createdAt:Date.now(),vigor:0})');
const dropState=json(g,'gardenState.drops');g.run('startGnomeIncident(Date.now(),()=>.5); finishGnomeIncident()');
assert.equal(json(g,'gardenState.drops'),dropState,'gnome cleanup owns only actors');

// Resize preserves logical drop state/hits; expired drops cannot render or collect between ticks.
const resized=ready(), resize=resized.garden, dropBefore=json(resize,'gardenState.drops');
resize.resize({left:120,top:90,width:390,height:740});assert.equal(json(resize,'gardenState.drops'),dropBefore);
collect(resize,resized.drop);assert.equal(count(resize),0);
const expired=ready(), e=expired.garden;e.clock.now=expired.drop.expiresAt;e.drawing.length=0;
e.run('drawGardenOverlay(true)');assert(!e.drawing.some(call=>call[0]==='fillStyle'&&call[1]==='#d84739'));
e.sandbox.expiredDrop=expired.drop;assert.equal(e.run('collectLooseDrop(expiredDrop)'),false);
assert.equal(e.run('looseDropAt(looseDropPosition(expiredDrop))'),null);

// Hidden tabs paint nothing. Resume handles due attempts once, without a retry backlog.
const hidden=createGarden();force(hidden);for(let i=0;i<8;i++)live(hidden);
hidden.setHidden(true);hidden.drawing.length=0;step(hidden,6000);
assert.equal(count(hidden),0);assert.equal(hidden.frames.size,0);assert.equal(hidden.drawing.length,0);
hidden.setHidden(false);assert.equal(count(hidden),3);assert.equal(pending(hidden),0);assert.equal(hidden.frames.size,1);
assert.equal(hidden.drawing.filter(call=>call.surface==='overlay'&&call[0]==='clearRect').length,1,'one current overlay refresh');
collect(hidden,hidden.run('gardenState.drops[0]'));step(hidden,250);assert.equal(count(hidden),2,'cap skips never catch up');
hidden.setHidden(true);step(hidden,20000);assert.equal(count(hidden),0);hidden.drawing.length=0;hidden.setHidden(false);
assert.equal(count(hidden),0);assert.equal(hidden.frames.size,0,'expired active drops do not replay');
const goneHidden=createGarden();force(goneHidden);live(goneHidden);goneHidden.setHidden(true);goneHidden.clock.now+=300000;goneHidden.setHidden(false);
assert.equal(count(goneHidden),0);assert.equal(pending(goneHidden),0,'expired source while hidden cannot activate');
assert.equal(goneHidden.intervals.length,2);
const source=fs.readFileSync('wwwroot/garden-drops.js','utf8');
assert(!/setInterval|setTimeout|requestAnimationFrame|drawImage|localStorage|sessionStorage/.test(source));
assert.equal(json(garden,'gardenState.recentEvents'),recentBefore);
console.log('PASS: live Amanita trigger/1% boundaries/exact source/5s delay/cancellation/separate model/3 cap/no retry/20s expiry/placement/privacy/ecology/click priority/coexistence/resize/hidden/zero score/audio/no timers; 3 drops × 120 RAF callbacks -> 30 overlay paints, 90 tiny drop renders, 0 base rebuilds, 0 bitmap copies.');
