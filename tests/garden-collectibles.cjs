// Full browser-script integration with injected clock/rolls; no sleeps or audio device.
const assert = require('node:assert/strict');
const createGarden = require('./browser-garden.cjs');

const garden = createGarden(), { run, element, clock } = garden;
assert.equal(run('gardenState.collectibles.length'), 0);
assert.equal(garden.sources.length, 1);
assert.equal(garden.sources[0].url, '/api/garden/events');
assert.equal(garden.intervals.length, 2, 'only the existing garden/inspection intervals');
assert.equal(element('canvas').handlers.get('click').length, 1, 'one explicit click router');
assert.equal(run('collectibleConfig.port22WeedChance'), 0.05);
assert.equal(run('collectibleConfig.lifetimeMs'), 20_000);
assert.equal(run('collectibleConfig.maxActive'), 3);

const grassBefore = run('JSON.stringify(gardenState.grassCells)');
garden.forceRoll(0.049999);
garden.emit();
const source = run('gardenState.specimens[0]'), sprig = run('gardenState.collectibles[0]');
assert.equal(source.type, 'redbloom');
assert.equal(source.origin.kind, 'tcpnoise');
assert.equal(source.origin.listenPort, 22);
assert.equal(source.origin.sensor, 'garden-test');
assert.equal(source.origin.seenCount, '12');
assert.equal(run('gardenState.specimens.length'), 1, 'secondary collectible is no specimen');
assert.equal(run('gardenState.collectibles.length'), 1, 'one event makes at most one');
assert.equal(run('JSON.stringify(gardenState.grassCells)'), grassBefore, 'no grass influence');
assert.deepEqual(Object.keys(sprig).sort(), ['createdAt', 'expiresAt', 'type', 'x', 'y']);
assert.equal(sprig.type, 'weed_sprig');
assert.equal(sprig.expiresAt - sprig.createdAt, 20_000);
assert(Math.hypot(sprig.x - (source.column + 0.5) * 30, sprig.y - (source.row + 0.5) * 30) <= Math.SQRT2 * 10);

garden.forceRoll(0.05); garden.emit();
assert.equal(run('gardenState.specimens.length'), 2, 'failed collectible roll still grows redbloom');
assert.equal(run('gardenState.collectibles.length'), 1, 'chance boundary excluded');
garden.forceRoll(0);
for (const [port, type] of [[2222, 'redbloom'], [443, 'flower'], [22, 'weed']]) garden.emit(port, type);
assert.equal(run('gardenState.collectibles.length'), 1, 'only live port-22 redbloom triggers');
for (const invalid of ['{', 'null', { specimenType: 'redbloom', listenPort: 22 },
  { specimenType: 'redbloom', listenPort: 22, vigor: 4 }]) garden.sources[0].emit(invalid);
assert.equal(run('gardenState.collectibles.length'), 1, 'malformed frames cannot trigger');
element('#fake-port22-probe').handlers.get('click')[0]();
assert.equal(run('gardenState.collectibles.length'), 1, 'fake redbloom never triggers');
garden.emit(); garden.emit(); garden.emit();
assert.equal(run('gardenState.collectibles.length'), 3, 'active cap; excess events have no backlog');
assert.equal(run('gardenState.specimens.length'), 9);

// Deterministic corner offsets cover full visual bounds and proximity.
const edges = createGarden();
for (const [column, row, offset] of [[0, 0, 0], [31, 19, 1], [0, 19, 0], [31, 0, 1]]) {
  edges.run(`gardenState.collectibles=[];
    gardenState.specimens=[{type:'redbloom',column:${column},row:${row},createdAt:Date.now(),vigor:0}];
    originalCollectibleSpawn(gardenState.specimens[0],0,()=>${offset})`);
  const item = edges.run('gardenState.collectibles[0]');
  assert(item.x >= 10 && item.x <= 950 && item.y >= 10 && item.y <= 590);
  assert(Math.hypot(item.x - (column + 0.5) * 30, item.y - (row + 0.5) * 30) <= Math.SQRT2 * 10);
  const position = JSON.stringify([item.x, item.y]);
  edges.resize({ left: 120, top: 90, width: 600, height: 750 }); edges.run('drawGarden()');
  assert.equal(JSON.stringify([item.x, item.y]), position, 'resize preserves logical position');
}

const full = createGarden(); full.forceRoll(0); full.fill(3);
full.emit(); full.emit(22, 'redbloom', 3);
assert.equal(full.run('gardenState.collectibles.length'), 0, 'dropped/equal vigor creates no collectible');
assert.equal(full.run('gardenState.specimens.length'), 640);
full.fill(0); full.emit(22, 'redbloom', 3);
assert.equal(full.run('gardenState.specimens.length'), 640, 'successful replacement uses one existing cell');
assert.equal(full.run('gardenState.collectibles.length'), 1, 'successful replacement can create collectible');
assert.equal(full.run('gardenState.specimens[0].type'), 'redbloom');
assert.equal(full.run('gardenState.collectibles[0].x'), 15, 'near exact replacement cell');

const freeCell = createGarden(); freeCell.forceRoll(0); freeCell.emit();
const freeSprig = freeCell.run('gardenState.collectibles[0]');
const sourceCell = freeCell.run('gardenState.specimens[0].row*columns+gardenState.specimens[0].column');
freeCell.run(`gardenState.specimens = Array.from({length:640},(_,i) =>
  ({type:'broadleaf',column:i%columns,row:Math.floor(i/columns),createdAt:Date.now(),vigor:3}))
  .filter(specimen => specimen.row*columns+specimen.column !== ${sourceCell})`);
const freeGrass = freeCell.run('JSON.stringify(gardenState.grassCells)');
freeCell.emit(443, 'flower');
assert.equal(freeCell.run('gardenState.specimens.length'), 640, 'sprig does not occupy the only free grid cell');
assert.equal(freeCell.run('gardenState.specimens.at(-1).row*columns+gardenState.specimens.at(-1).column'), sourceCell);
assert.equal(freeCell.run('gardenState.collectibles[0]'), freeSprig, 'source replacement does not move/remove sprig');
assert.equal(freeCell.run('JSON.stringify(gardenState.grassCells)'), freeGrass);

const clicked = createGarden(); clicked.forceRoll(0); clicked.emit();
const item = clicked.run('gardenState.collectibles[0]');
clicked.click(item.x + 10, item.y);
assert.equal(clicked.run('gardenState.collectibles.length'), 1, 'outside hit area does not collect');
assert.equal(clicked.element('#specimen-card').hidden, false, 'ordinary specimen hit opens card');
clicked.run('closeSpecimenCard()');
clicked.resize({ left: 130, top: 105, width: 620, height: 740 });
clicked.click(item.x, item.y);
assert.equal(clicked.run('gardenState.collectibles.length'), 0, 'scaled/letterboxed hit collects immediately');
assert.equal(clicked.element('#specimen-card').hidden, true, 'collectible wins over underlying inspection');
assert.equal(clicked.element('#collection-message').textContent, 'You collected some weed.');
assert.equal(clicked.element('#collection-message').hidden, false);
assert.equal(clicked.audioContexts(), 0, 'Sound Off collection never creates context');
assert.equal(clicked.run('gardenState.specimens.length'), 1, 'source redbloom survives collection');
clicked.click(item.x, item.y);
assert.equal(clicked.element('#specimen-card').hidden, false, 'source remains independently inspectable');
assert.equal(clicked.element('#specimen-sensor').textContent, 'garden-test');
clicked.click(800, 500);
assert.equal(clicked.element('#specimen-card').hidden, true, 'empty soil closes inspection');
clicked.clock.now += 1999; clicked.tick();
assert.equal(clicked.element('#collection-message').hidden, false);
clicked.clock.now++; clicked.tick();
assert.equal(clicked.element('#collection-message').hidden, true);
assert.equal(clicked.element('#collection-message').textContent, '');
assert.equal(clicked.run('collectCollectible(gardenState.collectibles[0])'), false, 'no duplicate collection');

const expired = createGarden(); expired.forceRoll(0); expired.emit();
expired.clock.now += 19_999; expired.tick();
assert.equal(expired.run('gardenState.collectibles.length'), 1);
expired.clock.now++; expired.tick();
assert.equal(expired.run('gardenState.collectibles.length'), 0, 'existing tick removes at lifetime boundary');
assert.equal(expired.element('#collection-message').hidden, true, 'silent expiry');
expired.tick(); assert.equal(expired.run('gardenState.collectibles.length'), 0, 'no catch-up collectibles');
// Collectibles expire and messages clear even with no other living garden objects.
const idle = createGarden(); idle.forceRoll(0); idle.emit();
idle.run('gardenState.specimens=[]; gardenState.grassCells=[]');
idle.clock.now += 20_000; idle.tick();
assert.equal(idle.run('gardenState.collectibles.length'), 0);
assert.equal(idle.run('maybeSpawnPort22Collectible({type:"redbloom",column:0,row:0},0)'), null, 'no dropped/detached source');
idle.emit();
const idleItem = idle.run('gardenState.collectibles[0]'); idle.click(idleItem.x, idleItem.y);
idle.run('gardenState.specimens=[]; gardenState.grassCells=[]'); idle.clock.now += 2000; idle.tick();
assert.equal(idle.element('#collection-message').hidden, true, 'message clears in empty garden');

const gnomes = createGarden(); gnomes.fill(0); gnomes.forceRoll(0); gnomes.emit(22, 'redbloom', 3);
const collectibleSnapshot = gnomes.run('JSON.stringify(gardenState.collectibles)');
assert.equal(gnomes.run('startGnomeIncident(Date.now(),()=>0.5)'), true);
assert.equal(gnomes.run('JSON.stringify(gardenState.collectibles)'), collectibleSnapshot, 'gnome start preserves sprig');
gnomes.run('finishGnomeIncident()');
assert.equal(gnomes.run('JSON.stringify(gardenState.collectibles)'), collectibleSnapshot, 'gnome cleanup preserves sprig');
gnomes.run('startGnomeIncident(Date.now(),()=>0.5)');
let actorSnapshot = gnomes.run('JSON.stringify([gardenState.actors,gnomeIncident])');
gnomes.run('collectCollectible(gardenState.collectibles[0])');
assert.equal(gnomes.run('JSON.stringify([gardenState.actors,gnomeIncident])'), actorSnapshot, 'collection leaves gnomes alone');
gnomes.emit(22, 'redbloom', 3);
actorSnapshot = gnomes.run('JSON.stringify([gardenState.actors,gnomeIncident])');
gnomes.run('updateCollectibles(Date.now()+20000)');
assert.equal(gnomes.run('JSON.stringify([gardenState.actors,gnomeIncident])'), actorSnapshot, 'expiry leaves incident/actors alone');

const rendered = createGarden(); rendered.forceRoll(0); rendered.emit();
rendered.drawing.length = 0; rendered.run('drawGardenCollectibles(Date.now()+1000)');
assert(rendered.drawing.some(([method]) => method === 'ellipse'), 'procedural leaf bundle');
assert.equal(rendered.drawing.filter(([method]) => method === 'save').length, rendered.drawing.filter(([method]) => method === 'restore').length);
assert(rendered.drawing.every(([, ...args]) => args.every(value => typeof value !== 'number' || Number.isFinite(value))));
const layers = []; rendered.sandbox.mark = layer => layers.push(layer);
rendered.run('gardenState.grassCells=[{column:0,row:0,createdAt:Date.now(),lastInfluencedAt:Date.now()}]');
rendered.run('drawGrass = () => mark("grass"); speciesConfig.get("redbloom").render = () => mark("specimen"); drawGardenCollectibles = () => mark("collectible"); drawGardenActors = () => mark("actor"); drawRain = () => mark("weather")');
rendered.run('drawGarden()');
assert.deepEqual(layers, ['grass', 'specimen', 'collectible', 'actor', 'weather']);

console.log('PASS: live port-22 secondary sprigs, bounded separate state, saturation, placement, expiry, shared scaled click routing/inspection, message, muted audio, and gnome coexistence.');
