// Production browser scripts with injected time/randomness; no sleeps or per-item timers.
const assert = require('node:assert/strict');
const createGarden = require('./browser-garden.cjs');
const frame = (seenCount = '1', extra = {}) =>
  ({ specimenType: 'flower', listenPort: 53, vigor: 0, sensor: 'curiosity-test', seenCount, ...extra });
const count = garden => garden.run('gardenState.curiosities.length');
const snapshot = (garden, expression) => JSON.parse(garden.run(`JSON.stringify(${expression})`));
function live(garden, event = frame()) {
  garden.clock.now++;
  garden.sandbox.incoming = event;
  return garden.run('handleLiveGardenEvent(incoming)');
}
function direct(garden, typeIndex, specimen = garden.run('gardenState.specimens.at(-1)')) {
  garden.sandbox.testSpecimen = specimen;
  garden.sandbox.testRandom = () => (typeIndex + 0.5) / 4;
  return garden.run('createFirstSeenCuriosity(testSpecimen, testRandom)');
}
function position(garden, curiosity, now = garden.clock.now) {
  garden.sandbox.testCuriosity = curiosity;
  return garden.run(`firstSeenCuriosityPosition(testCuriosity, ${now})`);
}
const center = specimen => [(specimen.column + 0.5) * 30, (specimen.row + 0.5) * 30];

const garden = createGarden();
assert.equal(garden.sources.length, 1);
assert.equal(garden.sources[0].url, '/api/garden/events');
assert.equal(garden.sources[0].handlers.get('garden').length, 1);
assert.equal(garden.element('canvas').handlers.get('click').length, 1);
assert.equal(garden.intervals.length, 2, 'only the existing garden and inspection ticks');
assert.equal(garden.run('firstSeenCuriosityConfig.maxActive'), 3);
assert.equal(garden.run('firstSeenCuriosityConfig.lifetimeMs'), 20000);
assert.deepEqual(snapshot(garden, 'firstSeenCuriosityPool'), ['ladybug', 'snail', 'moth', 'shiny_pebble']);
assert.equal(count(garden), 0);

// Exact sanitized decimal-string semantics through the actual SSE listener.
for (const value of ['1', '2', null, '01', '1.0', '1e0', 1, 1.0, false, {}, [], 'bad', '', '18446744073709551615']) {
  const check = createGarden();
  check.sources[0].emit(frame(value));
  assert.equal(count(check), value === '1' ? 1 : 0, `exact count ${JSON.stringify(value)}`);
  if (value === '01') assert.equal(check.run('gardenState.specimens[0].origin.seenCount'), '01', 'sanitizer is unchanged');
}
const missing = createGarden(), missingFrame = frame(); delete missingFrame.seenCount;
missing.sources[0].emit(missingFrame); assert.equal(count(missing), 0);
for (const bad of ['{', 'null', frame('1', { listenPort: 0 }), frame('1', { vigor: 4 }), frame('1', { specimenType: 'snail' })]) {
  const check = createGarden(); check.sources[0].emit(bad); assert.equal(count(check), 0);
}

// The authoritative result is the helper's exact origin, despite previous same-age growth.
live(garden, frame('2'));
garden.run('const normalCreateCuriosity = createFirstSeenCuriosity');
let suppliedSpecimen;
garden.sandbox.captureOrigin = specimen => { suppliedSpecimen = specimen; };
garden.run('createFirstSeenCuriosity = specimen => { captureOrigin(specimen); return normalCreateCuriosity(specimen, () => 0.125); }');
const grassBefore = garden.run('JSON.stringify(gardenState.grassCells)');
const result = live(garden, frame('1', { remoteIp: 'EXCLUDED', remotePort: 32100, payload: 'EXCLUDED', banner: 'EXCLUDED', credentials: 'EXCLUDED' }));
assert.equal(result.outcome, 'spawned'); assert.equal(suppliedSpecimen, result.specimen);
const curiosity = garden.run('gardenState.curiosities[0]');
assert.deepEqual(JSON.parse(JSON.stringify(curiosity.origin)), { x: center(result.specimen)[0], y: center(result.specimen)[1] });
assert.equal(curiosity.type, 'ladybug'); assert.equal(curiosity.createdAt, garden.clock.now);
assert.equal(curiosity.expiresAt, garden.clock.now + 20000);
assert.equal(garden.run('gardenState.specimens.length'), 2, 'curiosity consumes no cell');
assert.equal(garden.run('JSON.stringify(gardenState.grassCells)'), grassBefore);
assert.deepEqual(JSON.parse(JSON.stringify(result.specimen.origin)),
  { kind: 'tcpnoise', sensor: 'curiosity-test', listenPort: 53, seenCount: '1' });
assert.deepEqual(Object.keys(curiosity).sort(), ['createdAt','direction','expiresAt','origin','phase','type','x','y']);
assert(!garden.run('JSON.stringify(gardenState)').includes('EXCLUDED'), 'no raw frame copied into browser state');
assert.equal(garden.run('gardenState.recentEvents.length'), 2, 'one row per original event only');
garden.click(...center(result.specimen));
assert.equal(garden.element('#specimen-card').hidden, false);
assert.equal(garden.element('#specimen-source').textContent, 'Live TCPNoise');
assert.equal(garden.element('#specimen-sensor').textContent, 'curiosity-test');
assert.equal(garden.element('#specimen-port').textContent, '53');
assert.equal(garden.element('#specimen-seen-count').textContent, '1');
assert.equal(garden.element('#specimen-vigor').textContent, '0 — one-off');
assert.equal(garden.element('#specimen-mutation').textContent, 'None');
assert(garden.element('#specimen-color').textContent);
assert.equal(garden.element('#specimen-age').textContent, '0s');

// Full-grid drops create no visitor; successful replacements use their precise new cell.
const full = createGarden(); full.fill(0);
const unchanged = full.run('JSON.stringify(gardenState.specimens)');
const dropped = live(full);
assert.equal(dropped.outcome, 'dropped'); assert.equal(dropped.specimen, null); assert.equal(count(full), 0);
assert.equal(full.run('JSON.stringify(gardenState.specimens)'), unchanged);
assert.match(full.element('#recent-event-0').textContent, /no growth/);
const replaced = live(full, frame('1', { vigor: 1 }));
assert.equal(replaced.outcome, 'replaced'); assert.equal(full.run('gardenState.specimens.length'), 640);
assert.equal(full.run('gardenState.specimens[0]'), replaced.specimen);
assert.deepEqual(snapshot(full, 'gardenState.curiosities[0].origin'), { x: 15, y: 15 });
const fake = createGarden(); fake.run("handleGardenEvent({type:'http'})");
assert.equal(count(fake), 0, 'fake controls have no normal curiosity trigger');
assert(direct(fake, 3), 'direct deterministic seam remains available to tests');

// All four procedural types: local movement, edge placement, and immutable derived positions.
for (const [index, type] of ['ladybug','snail','moth','shiny_pebble'].entries()) {
  const check = createGarden(); const source = live(check, frame('2')).specimen;
  const sourceBefore = JSON.stringify(source), grass = check.run('JSON.stringify(gardenState.grassCells)');
  for (const [column, row] of [[0,0],[31,0],[0,19],[31,19],[16,10]]) {
    source.column = column; source.row = row;
    for (const angle of [0, 0.125, 0.25, 0.5, 0.75, 0.875]) {
      check.run('gardenState.curiosities = []');
      const rolls = [(index + 0.5) / 4, angle, 0.999, 0.125];
      check.sandbox.testRandom = () => rolls.shift(); check.sandbox.testSpecimen = source;
      const item = check.run('createFirstSeenCuriosity(testSpecimen, testRandom)');
      assert.equal(item.type, type);
      assert(Math.hypot(item.x - item.origin.x, item.y - item.origin.y) >= 18, 'placed beside the exact specimen');
      const state = JSON.stringify(item);
      for (let elapsed = 0; elapsed <= 20000; elapsed += 250) {
        const p = position(check, item, item.createdAt + elapsed);
        assert(p.x >= 7 && p.x <= 953 && p.y >= 7 && p.y <= 593, `${type} including its tiny visual stays inside garden`);
        assert(Math.hypot(p.x - item.x, p.y - item.y) <= 6.001, `${type} travels at most six logical pixels`);
        if (type === 'shiny_pebble') assert.equal(JSON.stringify(p), JSON.stringify({ x:item.x, y:item.y }));
      }
      assert.equal(JSON.stringify(item), state, 'movement never mutates stored state');
      check.drawing.length = 0; check.run('drawFirstSeenCuriosities(Date.now())');
      assert(check.drawing.some(command => command[0] === 'fill'), `${type} is procedurally drawn`);
    }
  }
  source.column = JSON.parse(sourceBefore).column; source.row = JSON.parse(sourceBefore).row;
  assert.equal(JSON.stringify(source), sourceBefore, 'curiosity does not alter provenance/color/vigor/type');
  assert.equal(check.run('JSON.stringify(gardenState.grassCells)'), grass);
  assert.equal(check.run('gardenState.specimens.length'), 1);
}

// Cap-skipped events have no queue or delayed retry; collection/expiry free slots for later events.
const capped = createGarden();
for (let index = 0; index < 3; index++) live(capped);
const firstThree = capped.run('gardenState.curiosities.slice()');
const fourth = live(capped); assert(fourth.specimen); assert.equal(count(capped), 3);
assert(capped.run('gardenState.curiosities').every((item, index) => item === firstThree[index]));
capped.sandbox.testCuriosity = firstThree[0]; capped.run('collectFirstSeenCuriosity(testCuriosity)');
assert.equal(count(capped), 2);
capped.clock.now += 500; capped.tick(); assert.equal(count(capped), 2, 'no backlog after slot opens');
live(capped); assert.equal(count(capped), 3, 'a later event can occupy the slot');
capped.clock.now = Math.max(...capped.run('gardenState.curiosities').map(item => item.expiresAt));
capped.tick(); assert.equal(count(capped), 0, 'existing 250 ms update expires visitors');
capped.tick(); assert.equal(count(capped), 0, 'no catch-up spawns after expiry');
live(capped); assert.equal(count(capped), 1);
assert.equal(capped.intervals.length, 2, 'no new timers regardless of arrivals');
const standalone = createGarden(); live(standalone);
standalone.run('gardenState.specimens=[]; gardenState.grassCells=[]; drawGarden()');
standalone.clock.now += 20000; standalone.tick(); assert.equal(count(standalone), 0, 'cleanup still runs with no ecology');
assert.equal(standalone.frames.size, 0, 'final expiry stops quiet animation');

// Type-specific +0 messages, scaled moving-target clicks, no extra rows or hidden score.
const messages = [
  'You caught a ladybug. +0 points', 'You collected a snail. It seems annoyed. +0 points',
  'You caught a moth. +0 points', 'You found a rock. +0 points'
];
const clicks = createGarden();
for (let index = 0; index < messages.length; index++) {
  const source = live(clicks, frame('2')).specimen;
  const item = direct(clicks, index, source), sourceBefore = JSON.stringify(source);
  const recentBefore = clicks.run('JSON.stringify(gardenState.recentEvents)');
  assert.equal(count(clicks), 1);
  clicks.resize({ left:130, top:105, width:390, height:740 });
  clicks.clock.now += 3500;
  const p = position(clicks, item); clicks.click(p.x, p.y);
  assert.equal(count(clicks), 0);
  assert.equal(clicks.element('#specimen-card').hidden, true, 'visitor click wins over underlying specimen inspection');
  assert.equal(clicks.element('#collection-message').textContent, messages[index]);
  assert.equal(clicks.element('#collection-message').hidden, false);
  assert.equal(clicks.element('#garden-score').textContent, 'Score: 0');
  assert.equal(JSON.stringify(source), sourceBefore, 'collection leaves its source untouched');
  assert.equal(clicks.run('JSON.stringify(gardenState.recentEvents)'), recentBefore, 'collection has no Recent activity row');
  assert.equal(clicks.audioContexts(), 0, 'Sound Off does not initialize audio');
  clicks.clock.now += 2000; clicks.tick();
  assert.equal(clicks.element('#collection-message').hidden, true, 'existing two-second message lifetime');
  assert.equal(clicks.element('#garden-score').textContent, 'Score: 0', 'repeated collection remains pointless');
  assert.equal(clicks.run('typeof score'), 'undefined');
}
const priority = createGarden(); const prioritySource = live(priority, frame('2')).specimen;
const priorityItem = direct(priority, 3);
// Force a visual overlap to verify the deterministic routing explicitly.
[priorityItem.x, priorityItem.y] = center(prioritySource);
priority.click(...center(prioritySource)); assert.equal(count(priority), 0);
assert.equal(priority.element('#specimen-card').hidden, true);
priority.click(...center(prioritySource)); assert.equal(priority.element('#specimen-card').hidden, false);
const overlap = direct(priority, 3), top = direct(priority, 3);
[top.x, top.y] = [overlap.x, overlap.y]; priority.run('closeSpecimenCard()');
const overlapPosition = position(priority, top); priority.click(overlapPosition.x, overlapPosition.y);
assert.equal(priority.run('gardenState.curiosities[0]'), overlap, 'newest/topmost visitor wins overlapping hit');
priority.clock.now = overlap.expiresAt;
assert.equal(priority.run('firstSeenCuriosityAt(firstSeenCuriosityPosition(gardenState.curiosities[0]))'), null);
priority.sandbox.testCuriosity = overlap;
assert.equal(priority.run('collectFirstSeenCuriosity(testCuriosity)'), false, 'expired targets cannot collect before cleanup');

// Both three-item caps are separate, and curiosity clicks precede overlapping mutation clicks.
const mutations = createGarden(); mutations.forceRoll(0);
for (let index = 0; index < 3; index++) live(mutations, frame('1', { listenPort:22, specimenType:'redbloom' }));
assert.equal(count(mutations), 3);
mutations.clock.now += 3000; mutations.tick();
assert.equal(mutations.run('gardenState.specimens.filter(item=>item.mutation).length'), 3);
assert.equal(count(mutations), 3);
const mutated = mutations.run('gardenState.specimens[0]'), visitor = mutations.run('gardenState.curiosities[0]');
visitor.type = 'shiny_pebble'; [visitor.x, visitor.y] = center(mutated);
const recent = mutations.run('JSON.stringify(gardenState.recentEvents)');
mutations.click(...center(mutated)); assert.equal(count(mutations), 2);
assert.equal(mutations.run('gardenState.specimens[0]'), mutated, 'visitor collects before mutation');
assert(mutated.mutation); mutations.click(...center(mutated));
assert(!mutations.run('gardenState.specimens').includes(mutated)); assert.equal(count(mutations), 2);
assert.equal(mutations.run('JSON.stringify(gardenState.recentEvents)'), recent);
assert.equal(mutations.element('#garden-score').textContent, 'Score: 0');

// Gnome-owned actors and dedicated curiosities never erase each other.
const gnomes = createGarden(); gnomes.fill(0); live(gnomes, frame('1', { vigor:1 }));
const gnomeVisitor = gnomes.run('gardenState.curiosities[0]'), gnomeVisitorBefore = JSON.stringify(gnomeVisitor);
assert.equal(gnomes.run('startGnomeIncident(Date.now(),()=>0.5)'), true);
assert.equal(gnomes.run('gardenState.actors.length'), 4);
gnomes.run('advanceGnomeIncident(Date.now()+5000,()=>0.5); finishGnomeIncident()');
assert.equal(gnomes.run('gardenState.curiosities[0]'), gnomeVisitor);
assert.equal(JSON.stringify(gnomeVisitor), gnomeVisitorBefore, 'gnome cleanup neither erases nor resets visitors');
gnomes.run('startGnomeIncident(Date.now(),()=>0.5)');
const actorState = gnomes.run('JSON.stringify(gardenState.actors)'), incident = gnomes.run('gnomeIncident');
gnomes.sandbox.testCuriosity = gnomeVisitor; gnomes.run('collectFirstSeenCuriosity(testCuriosity)');
assert.equal(gnomes.run('JSON.stringify(gardenState.actors)'), actorState); assert.equal(gnomes.run('gnomeIncident'), incident);
direct(gnomes, 1); gnomes.clock.now += 20000;
gnomes.run('updateFirstSeenCuriosities(Date.now())');
assert.equal(gnomes.run('JSON.stringify(gardenState.actors)'), actorState); assert.equal(gnomes.run('gnomeIncident'), incident);

// Creation/removal and many moving overlays never invalidate the cached ecology scene.
const performanceGarden = createGarden(); live(performanceGarden, frame('2'));
let rebuilds = 0, paints = 0;
performanceGarden.sandbox.countBase = () => rebuilds++;
performanceGarden.sandbox.countPaint = () => paints++;
performanceGarden.run(`
  const baseBeforeCuriosities = rebuildGardenBase;
  rebuildGardenBase = now => { countBase(); return baseBeforeCuriosities(now); };
  const rainBeforeCuriosities = drawRain;
  drawRain = now => { countPaint(); rainBeforeCuriosities(now); };
`);
for (const index of [0,1,2]) direct(performanceGarden, index);
assert.equal(rebuilds, 0, 'creation only paints the overlay');
assert.equal(performanceGarden.frames.size, 1, 'quiet visitors share one compositor RAF');
const initialState = performanceGarden.run('JSON.stringify(gardenState)');
paints = 0; const start = performanceGarden.clock.now;
for (let frameIndex = 1; frameIndex <= 120; frameIndex++) {
  performanceGarden.frame(start + frameIndex * 1000 / 120); performanceGarden.drawing.length = 0;
}
assert.equal(paints, 30); assert.equal(rebuilds, 0);
assert.equal(performanceGarden.run('JSON.stringify(gardenState)'), initialState, 'RAF derives movement without state churn');
performanceGarden.run('collectFirstSeenCuriosity(gardenState.curiosities[0])'); assert.equal(rebuilds, 0);
performanceGarden.run("Object.assign(weatherState,{level:'rain',eventsPerMinute:10000}); updateWeatherAnimation()");
rebuilds = 0; paints = 0;
const rainStart = performanceGarden.clock.now;
for (let frameIndex = 1; frameIndex <= 120; frameIndex++) performanceGarden.frame(rainStart + frameIndex * 1000 / 120);
assert.equal(paints, 30); assert.equal(rebuilds, 0, 'rain and visitors share existing FPS/cache behavior');

// Hidden tabs cancel animation; resume removes expired visitors without replay or new spawns.
const hidden = createGarden(); live(hidden);
const hiddenVisitor = hidden.run('gardenState.curiosities[0]'), hiddenState = JSON.stringify(hiddenVisitor);
assert.equal(hidden.frames.size, 1); hidden.setHidden(true); assert.equal(hidden.frames.size, 0);
hidden.frame(hidden.clock.now + 1000); assert.equal(JSON.stringify(hiddenVisitor), hiddenState);
hidden.setHidden(false); assert.equal(count(hidden), 1); assert.equal(hidden.frames.size, 1);
hidden.setHidden(true); hidden.frame(hidden.clock.now + 30000); hidden.setHidden(false);
assert.equal(count(hidden), 0); assert.equal(hidden.frames.size, 0);
assert.equal(hidden.run('gardenState.recentEvents.length'), 1, 'resume adds no event or curiosity');
hidden.tick(); assert.equal(count(hidden), 0);
const resize = createGarden(); live(resize);
const resizeVisitor = resize.run('gardenState.curiosities[0]'), resizeState = JSON.stringify(resizeVisitor);
resize.resize({ left:110, top:95, width:480, height:300 });
assert.equal(JSON.stringify(resizeVisitor), resizeState, 'logical state survives resize');
const resizedPosition = position(resize, resizeVisitor); resize.click(resizedPosition.x, resizedPosition.y);
assert.equal(count(resize), 0); assert.equal(resize.element('#garden-score').textContent, 'Score: 0');

console.log('PASS: exact source-count-one live trigger, exact spawn/replacement origin, drops/fakes/privacy, all four tiny types, bounded placement/movement/cap/expiry/no backlog, scaled priority clicks/+0/muted sound/static score, activity/provenance, independent gnomes/mutations, hidden/resize. Three curiosities: 120 RAF callbacks -> 30 overlay paints, 0 ecology rebuilds.');
