// Production script order, synthetic clock, and deterministic rolls; no sleeps.
const assert = require('node:assert/strict');
const createGarden = require('./browser-garden.cjs');

const garden = createGarden(), { run, element, clock, sources } = garden;
const row = index => element(`#recent-event-${index}`);
assert.equal(sources.length, 1);
assert.equal(sources[0].url, '/api/garden/events');
assert.equal(sources[0].handlers.get('garden').length, 1, 'one authoritative live listener');
assert.equal(run('gardenState.recentEvents.length'), 0);
assert.equal(garden.intervals.length, 2, 'existing garden and inspection timers only');
for (let i = 0; i < 3; i++) {
  assert.equal(row(i).hidden, true);
  assert.equal(row(i).textContent, '');
}

// Two same-type/same-vigor frames at the exact same time must retain distinct origins.
const originsAtFirstDraw = [], originsAtSound = [];
garden.sandbox.onFirstDraw = specimen => originsAtFirstDraw.push(JSON.stringify(specimen.origin));
garden.sandbox.onSound = () => originsAtSound.push(run('JSON.stringify(gardenState.specimens.at(-1).origin)'));
run('speciesConfig.get("broadleaf").render = specimen => { if(!specimen.observed) {onFirstDraw(specimen); specimen.observed=true;} }; gardenSound.maybePlayGrowthSound=onSound');
const safeFrame = {
  specimenType: 'broadleaf', listenPort: 443, vigor: 1,
  sensor: '<b>first-sensor</b>', seenCount: '18446744073709551615',
  remoteAddress: 'secret-endpoint', remotePort: 12345, banner: 'private-banner', payload: 'private-payload'
};
const grassBefore = run('JSON.stringify(gardenState.grassCells)');
sources[0].emit(safeFrame);
sources[0].emit({ ...safeFrame, sensor: 'second-sensor', listenPort: 445, seenCount: '1' });
const first = run('gardenState.specimens[0]'), second = run('gardenState.specimens[1]');
assert.equal(first.createdAt, second.createdAt);
assert.equal(first.origin.sensor, '<b>first-sensor</b>');
assert.equal(first.origin.listenPort, 443);
assert.equal(first.origin.seenCount, '18446744073709551615', 'UInt64 never parsed to Number');
assert.equal(second.origin.sensor, 'second-sensor');
assert.equal(second.origin.listenPort, 445);
assert.equal(second.origin.seenCount, '1', 'exact first-seen value remains available for a later slice');
assert.equal(originsAtFirstDraw.length, 2);
assert.deepEqual(originsAtFirstDraw.map(JSON.parse), [JSON.parse(JSON.stringify(first.origin)), JSON.parse(JSON.stringify(second.origin))], 'provenance precedes first rendering');
assert.deepEqual(originsAtSound.map(JSON.parse), originsAtFirstDraw.map(JSON.parse), 'provenance precedes sound');
assert.equal(run('gardenState.specimens.length'), 2);
assert.equal(run('JSON.stringify(gardenState.grassCells)'), JSON.stringify(JSON.parse(grassBefore).filter(g=>![first,second].some(p=>p.column===g.column&&p.row===g.row))), 'live growth only removes destination grass');
assert.equal(run('gardenState.recentEvents.length'), 2);
assert.deepEqual(Object.keys(run('gardenState.recentEvents[1]')).sort(),
  ['kind', 'listenPort', 'outcome', 'receivedAt', 'seenCount', 'sensor', 'specimenType'], 'only normalized display fields are retained');
assert.equal(row(0).textContent, 'second-sensor · :445 · broadleaf · seen 1 · now');
assert.equal(row(1).textContent, '<b>first-sensor</b> · :443 · broadleaf · seen 18446744073709551615 · now', 'textContent, never HTML');
assert(!run('JSON.stringify(gardenState)').match(/secret-endpoint|12345|private-banner|private-payload/));
assert.equal(run('gardenState.specimens.filter(specimen=>specimen.mutation).length'), 0, 'no first-seen critter or other new effect');
garden.click((first.column + 0.5) * 30, (first.row + 0.5) * 30);
assert.equal(element('#specimen-sensor').textContent, '<b>first-sensor</b>');
assert.equal(element('#specimen-seen-count').textContent, '18446744073709551615');
garden.click((second.column + 0.5) * 30, (second.row + 0.5) * 30);
assert.equal(element('#specimen-sensor').textContent, 'second-sensor');

sources[0].emit({ specimenType: 'flower', listenPort: 25, vigor: 0 });
const missing = run('gardenState.specimens.at(-1)');
assert.equal(missing.origin.sensor, null); assert.equal(missing.origin.seenCount, null);
assert.equal(row(0).textContent, ':25 · flower · now');
sources[0].emit({ specimenType: 'vine', listenPort: 3389, vigor: 2, sensor: { raw: 'not-display-data' }, seenCount: 12 });
const malformedExtras = run('gardenState.specimens.at(-1)');
assert.equal(malformedExtras.origin.sensor, null); assert.equal(malformedExtras.origin.seenCount, null);
assert.equal(run('gardenState.recentEvents.length'), 3, 'four events retain only newest three');
assert.equal(row(0).textContent, ':3389 · vine · now');
assert.equal(row(1).textContent, ':25 · flower · now');
assert.equal(row(2).textContent, 'second-sensor · :445 · broadleaf · seen 1 · now');
assert(!run('JSON.stringify(gardenState)').includes('not-display-data'));
sources[0].emit({ specimenType: 'flower', listenPort: 53, vigor: 0, sensor: '', seenCount: '1e6' });
assert.equal(row(0).textContent, ':53 · flower · now');
const snapshot = run('JSON.stringify(gardenState)');
for (const invalid of ['{', 'null', {}, { specimenType: 'unknown', listenPort: 22, vigor: 0 },
  { specimenType: 'redbloom', listenPort: 0, vigor: 0 }, { specimenType: 'flower', listenPort: 65536, vigor: 0 },
  { specimenType: 'flower', listenPort: 53.5, vigor: 0 }, { specimenType: 'flower', listenPort: 53 },
  { specimenType: 'flower', listenPort: 53, vigor: 4 }]) sources[0].emit(invalid);
assert.equal(run('JSON.stringify(gardenState)'), snapshot, 'invalid required fields add no growth or recent row');

// Explicit result and exact replacement provenance, without count or age heuristics.
const full = createGarden(); full.fill(0);
const replaced = full.run('handleLiveGardenEvent({specimenType:"redbloom",listenPort:22,vigor:3,sensor:"replacement",seenCount:"17"})');
assert.equal(replaced.outcome, 'replaced');
assert.equal(replaced.specimen, full.run('gardenState.specimens[0]'));
assert.equal(replaced.specimen.origin.sensor, 'replacement');
assert.equal(full.run('gardenState.specimens.length'), 640);
assert.equal(full.element('#recent-event-0').textContent, 'replacement · :22 · redbloom · seen 17 · now');
full.fill(3);
full.run('gardenState.specimens = gardenState.specimens.map((s,i)=>i===639 ? {type:"redbloom",column:31,row:19,createdAt:Date.now(),vigor:3} : s)');
const unattributed = full.run('gardenState.specimens[639]');
const beforeDrop = full.run('JSON.stringify(gardenState.specimens)');
const dropped = full.run('handleLiveGardenEvent({specimenType:"redbloom",listenPort:22,vigor:3,sensor:"dropped-sensor",seenCount:"100"})');
assert.equal(dropped.outcome, 'dropped'); assert.equal(dropped.specimen, null);
assert.equal(unattributed.origin, undefined, 'dropped event cannot attribute a fresh matching specimen');
assert.equal(full.run('JSON.stringify(gardenState.specimens)'), beforeDrop);
assert.equal(full.element('#recent-event-0').textContent, 'dropped-sensor · :22 · redbloom · seen 100 · now · no growth');
assert.equal(full.run('gardenState.specimens.filter(specimen=>specimen.mutation).length'), 0);
const spawned = garden.run('handleLiveGardenEvent({specimenType:"flower",listenPort:53,vigor:0,seenCount:"2"})');
assert.equal(spawned.outcome, 'spawned'); assert.equal(spawned.specimen, garden.run('gardenState.specimens.at(-1)'));
assert.equal(garden.run('handleLiveGardenEvent({specimenType:"flower",listenPort:53})'), null);

// Fake controls and their shared automatic-traffic path carry only simulated data.
element('#fake-http').handlers.get('click')[0]();
assert.equal(row(0).textContent, 'Simulated HTTP · broadleaf · now');
const fake = run('gardenState.recentEvents[0]');
assert.equal(fake.kind, 'simulated');
for (const field of ['sensor', 'listenPort', 'seenCount']) assert.equal(Object.hasOwn(fake, field), false);
assert.equal(run('gardenState.specimens.at(-1).origin.eventType'), 'http');
run('handleGardenEvent({type:"gopher"})');
assert.equal(row(0).textContent, 'Simulated Gopher · mushroom · now');
full.element('#fake-http').handlers.get('click')[0]();
assert.equal(full.element('#recent-event-0').textContent, 'Simulated HTTP · broadleaf · now · no growth');

// Relative ages share the existing tick, including an otherwise empty garden.
const aged = createGarden(); aged.emit(443, 'broadleaf');
const received = aged.run('gardenState.recentEvents[0].receivedAt');
aged.run('gardenState.specimens=[]; gardenState.grassCells=[]');
for (const [elapsed, suffix] of [[0, 'now'], [3000, '3s'], [18000, '18s'], [60000, '1m'], [120000, '2m']]) {
  aged.clock.now = received + elapsed; aged.tick();
  assert(aged.element('#recent-event-0').textContent.endsWith(` · ${suffix}`));
}
assert.equal(aged.intervals.length, 2, 'no per-row timers');
const reload = createGarden(); assert.equal(reload.run('gardenState.recentEvents.length'), 0);

// Recording/rendering/aging recent rows own no ecology, actor, or collectible state.
const independent = createGarden(); independent.fill(0); independent.forceRoll(0); independent.emit(22, 'redbloom', 3);
independent.clock.now += 3000; independent.tick();
independent.run('startGnomeIncident(Date.now(),()=>0.5)');
const ecosystem = () => independent.run('JSON.stringify([gardenState.specimens,gardenState.grassCells,gardenState.actors,gnomeIncident,weatherState])');
const ecosystemBefore = ecosystem();
independent.run('recordRecentGardenEvent({kind:"simulated",eventType:"gopher",specimenType:"mushroom",receivedAt:Date.now(),outcome:"dropped"}); renderRecentActivity(Date.now()+30000); updateRecentActivity(Date.now()+60000)');
assert.equal(ecosystem(), ecosystemBefore);
assert.equal(independent.run('gardenState.specimens.length'), 640);
assert.equal(independent.run('gardenState.specimens.filter(specimen=>specimen.mutation).length'), 1);
assert.equal(independent.run('gardenState.actors.length'), 4);

console.log('PASS: one atomic live path, exact spawn/replacement provenance, rapid twins, safe optional fields, dropped events, bounded newest-first activity, simulated events, shared relative-age updates, and ecology/actors/collectibles independence.');
