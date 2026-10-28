const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const M = require('../wwwroot/garden-mutations.js'), G = require('../wwwroot/garden-gnomes.js');
const core = require('../wwwroot/pixi-live-core.js'), garden = require('../wwwroot/garden-core.js');
const V = require('../wwwroot/pixi-vine-blooms.js'), UI = require('../wwwroot/garden-ui-core.js');
const I = require('../wwwroot/garden-interaction.js'), h = require('./pixi-live.cjs');
const { createView } = require('../wwwroot/pixi-live.js'), shared = require('../wwwroot/pixi-stress.js');
const event = (type = 'vine', vigor = 1) => ({ specimenType: type, vigor, listenPort: 3389, sensor: 'real sensor', seenCount: '18446744073709551615' });
function fixture(roll = 0, palette = .5) {
  let at = 1000000, draws = 0, geometry = 0;
  class Graphics extends h.P.Graphics { clear() { geometry++; return super.clear(); } }
  const stage = new h.P.Container(), view = createView({ ...h.P, Graphics }, { stage }, h.cache.frames, core, shared);
  const model = core.createModel(view, { now: () => at, random: () => palette, vineBloomRandom: () => 0,
    poppyRandom: () => { draws++; return roll; } });
  return { model, view, get draws() { return draws; }, get geometry() { return geometry; },
    get at() { return at; }, set at(t) { at = t; }, tick(t) { at = t; model.tick(at); },
    destroy() { model.clear(); view.destroy(); stage.destroy(); } };
}
assert.deepEqual(M.poppyConfig, { chance: .005, maxActive: 2 });
for (const [roll, selected] of [[0, true], [.004999999999, true], [.005, false], [.999999, false], [-1, false], [NaN, false]]) {
  const f = fixture(roll), p = f.model.accept(event());
  assert.equal(Boolean(p.poppyMutation), selected);
  for (let i = 0; i < 20; i++) { f.model.poppies.consider(p); f.model.poppies.snapshot(); UI.inspection(p, f.at); f.model.tick(); }
  assert.equal(f.draws, 1); assert(!Object.keys(p).includes('poppyMutation'));
  f.tick(p.createdAt + 60000); assert.equal(M.isPoppyActive(p, f.at), selected);
  f.destroy(); assert.equal(p.poppyMutation, undefined);
  assert.equal(f.model.poppies.consider(p), false);
}
{
  const f = fixture(); f.model.accept({}); f.model.setPaused(true); f.model.accept(event()); f.model.setPaused(false);
  f.model.addSpecimen('vine', 0, f.at, { kind: 'simulated' }); f.model.seed();
  assert.equal(f.draws, 0);
  for (const p of f.model.specimens) p.vigor = 3;
  assert.equal(f.model.acceptEvent(event('vine', 0)).outcome, 'dropped'); assert.equal(f.draws, 0);
  const victim = f.model.specimens.find(p => !garden.isProtected(p.type)); victim.vigor = 0;
  assert.equal(f.model.acceptEvent(event('vine', 3)).outcome, 'replaced'); assert.equal(f.draws, 1);
  f.destroy();
  const silver = fixture(0, .009); const p = silver.model.accept(event()); assert.equal(p.colorVariant, 4);
  assert.equal(silver.draws, 0); assert.equal(p.poppyMutation, undefined); silver.destroy();
}
// Neither entropy setup nor cosmetic selection calls Math.random.
const context = { window: { PacketGardenCore: garden }, Uint32Array, Date, performance, Math: Object.create(Math),
  crypto: { getRandomValues(a) { a[0] = 19; return a; } } };
context.Math.random = () => { throw Error('gameplay random consumed'); };
vm.runInNewContext(fs.readFileSync('wwwroot/garden-mutations.js', 'utf8'), context);
const rng = context.window.PacketGardenMutations.createPoppyRandom(); for (let i = 0; i < 100; i++) assert(rng() >= 0);
function trace(roll) {
  let calls = 0, blooms = 0, vines = 0;
  const m = core.createModel({ add() {}, update() {}, remove() {} }, { now: () => 1000000, random: () => { calls++; return .5; },
    bloomRandom: () => { blooms++; return .1; }, vineBloomRandom: () => { vines++; return .1; }, poppyRandom: () => roll });
  for (let i = 0; i < 120; i++) m.accept(event(i % 3 === 0 ? 'broadleaf' : 'vine', i % 4));
  return { calls, blooms, vines, specimens: JSON.stringify(m.specimens), counts: m.counts, recent: m.recentEvents,
    traits: m.specimens.map(p => [p.vineBloom, p.broadleafBloom]) };
}
assert.deepEqual(trace(0), trace(.9));
{
  const f = fixture(), p = f.model.accept(event()), original = { ...p }, sprite = f.view.byId.get(p.id), trait = p.vineBloom;
  const counts = { ...f.model.counts }, recent = JSON.stringify(f.model.recentEvents), texture = sprite.texture;
  for (const age of [19999, 20000, 59999]) { f.tick(p.createdAt + age); assert(!M.isPoppyActive(p, f.at)); }
  assert.notEqual(sprite.texture, texture); f.tick(p.createdAt + 60000);
  assert(M.isPoppyActive(p, f.at)); assert.equal(f.view.byId.get(p.id), sprite);
  assert.equal(sprite.texture, h.cache.frames.get('opium-poppy:mature')); assert.equal(f.view.vineBloomViews.has(p.id), false);
  assert.equal(f.view.vineBloomLinks.has(p.id), false); assert.equal(f.view.vineLinks.get(p.id).context.instructions.length, 0);
  for (const key of Object.keys(original).filter(k => k !== 'stage')) assert.equal(p[key], original[key], key);
  assert.equal(p.type, 'vine'); assert.equal(p.vineBloom, trait); assert.equal(p.mutation, undefined);
  assert.deepEqual(f.model.counts, counts); assert.equal(JSON.stringify(f.model.recentEvents), recent);
  const info = UI.inspection(p, f.at); assert.match(info.title, /Opium poppy.*original vine/); assert.match(info.mutation, /not collectible/);
  assert.equal(info.source, 'Live TCPNoise'); assert.equal(info.seenCount, event().seenCount); assert.equal(info.port, '3389');
  assert.equal(I.resolve({ x: (p.column + .5) * 30, y: (p.row + .5) * 30 }, { specimens: [p] }, f.at)?.kind, 'specimen');
  const gnomes = G.createModel({ garden: f.model, getSpecimens: () => f.model.specimens, now: () => f.at });
  assert.equal(gnomes.landscapingCandidates().includes(p), false); assert.equal(gnomes.landscapingCandidates(f.at, 'overcrowding').includes(p), false);
  f.tick(p.createdAt + 479999); assert.equal(sprite.texture, h.cache.frames.get('opium-poppy:mature'));
  f.tick(p.createdAt + 480000); assert.equal(sprite.texture, h.cache.frames.get('opium-poppy:fading'));
  const geometry = f.geometry, bakes = h.generated(), textures = h.textureCount();
  for (let i = 0; i < 1000; i++) f.view.animate(i, .016, f.at);
  assert.equal(f.geometry, geometry); assert.equal(h.generated(), bakes); assert.equal(h.textureCount(), textures); assert.equal(f.draws, 1);
  f.tick(p.createdAt + 599999); assert(f.model.specimens.includes(p));
  f.tick(p.createdAt + 600000); assert(!f.model.specimens.includes(p)); assert(!h.live.has(sprite)); assert.equal(p.poppyMutation, undefined);
  f.destroy();
}
{
  const f = fixture(), plants = Array.from({ length: 3 }, () => f.model.accept(event()));
  f.tick(plants[0].createdAt + 60000); assert.equal(f.model.poppies.snapshot().active, 2); assert.equal(f.model.poppies.snapshot().capSkips, 1);
  assert.equal(plants[2].poppyMutation.state, 'cap-skipped'); f.model.remove(plants[0]);
  for (let i = 0; i < 30; i++) f.model.tick(); assert.equal(f.model.poppies.snapshot().active, 1); assert.equal(f.draws, 3);
  assert.equal(plants[2].poppyMutation.state, 'cap-skipped');
  const later = f.model.accept(event()); f.tick(later.createdAt + 60000); assert(M.isPoppyActive(later, f.at)); f.destroy();
}
// Both mutation systems retain independent caps and lifetimes when present together.
{
  const f = fixture(0, .04), vines = [f.model.accept(event()), f.model.accept(event())];
  f.tick(vines[0].createdAt + 60000);
  const reds = Array.from({ length: 3 }, () => f.model.accept({ ...event('redbloom'), listenPort: 22 }));
  assert(reds.every(p => p.pendingMutation)); f.tick(f.at + 3000);
  assert.equal(f.model.mutations.snapshot().active, 3); assert.equal(f.model.poppies.snapshot().active, 2);
  f.model.remove(reds[0], 'collected'); f.tick(reds[1].mutation.expiresAt);
  assert.equal(f.model.mutations.snapshot().active, 0); assert.equal(f.model.poppies.snapshot().active, 2);
  assert(vines.every(p => f.model.specimens.includes(p))); f.destroy();
}
// Dense real neighbor decorations: both halves detach and every retained blossom still owns a real edge.
{
  const f = fixture(); f.model.seedVineBlooms('dense');
  const [ownerId, record] = f.view.vineBloomLinks.entries().next().value;
  const owner = f.model.specimens.find(p => p.id === ownerId), neighbor = f.model.specimens.find(p => p.id === record.neighborId);
  neighbor.colorVariant = 0; const lost = record.sprite, lostKey = record.key;
  f.model.poppies.force(neighbor); f.model.tick(); assert(!h.live.has(lost));
  assert(![...f.view.vineBloomLinks.values()].some(r => r.key === lostKey)); assert.equal(f.view.vineBloomViews.has(neighbor.id), false);
  assert.equal(f.view.vineLinks.get(neighbor.id).context.instructions.length, 0); assert(V.active(owner));
  for (const r of f.view.vineBloomLinks.values()) assert.notEqual(r.neighborId, neighbor.id);
  const p = f.model.seedPoppies('replacement'), oldSprite = f.view.byId.get(p.id), cell = p.cell;
  const replacement = f.model.replacePoppyFixture(); assert.equal(replacement.replaced, p); assert.equal(replacement.specimen.cell, cell);
  assert(!h.live.has(oldSprite)); assert.equal(p.poppyMutation, undefined); assert.equal(f.model.counts.acceptedLive, 0);
  const textures = h.textureCount(), bakes = h.generated();
  for (let i = 0; i < 8; i++) { f.model.seedPoppies(); f.model.clear(); assert.equal(f.model.poppies.snapshot().active, 0); assert.equal(f.view.vineBloomLinks.size, 0); }
  assert.equal(h.textureCount(), textures); assert.equal(h.generated(), bakes); f.destroy();
}
// Actual page hidden/resume reconciliation, inspection click, diagnostic controls, teardown.
(async () => {
  const page = require('./pixi-page.cjs');
  for (const name of ['index.html', 'pixi-live.html']) {
    const g = await page({ page: name });
    if (name === 'index.html') assert.equal(g.element('#seed-poppy-mature'), null);
    else for (const mode of ['before', 'mature', 'fading', 'flowers', 'grass', 'connections', 'expiry', 'replacement']) {
      g.element(`#seed-poppy-${mode}`).handlers.get('click')();
      assert.equal(g.model.poppies.snapshot().active, mode === 'before' ? 0 : 1);
    }
    const source = g.model.seedPoppies('before'), sprite = g.view.byId.get(source.id);
    g.hidden(true); g.advance(1000); g.hidden(false);
    assert.equal(g.model.poppies.snapshot().active, 1); assert.equal(g.view.byId.get(source.id), sprite);
    g.click(page.center(source)); assert.equal(g.element('#specimen-card').hidden, false);
    assert.match(g.element('#specimen-card-title').textContent, /Opium poppy/);
    assert.equal(g.element('#collection-message').hidden, true); assert.equal(g.element('#garden-score').textContent, 'Score: 0');
    assert.equal(g.model.counts.acceptedLive, 0); const activations = g.model.poppies.counts.activations;
    g.hidden(true); g.advance(600001); g.hidden(false);
    assert.equal(g.model.specimens.length, 0); assert.equal(g.model.poppies.snapshot().active, 0);
    assert.equal(g.model.poppies.counts.activations, activations); assert.equal(g.element('#specimen-card').hidden, true);
    g.model.seedPoppies('before'); g.hidden(true); g.advance(600001); g.hidden(false);
    assert.equal(g.model.poppies.counts.activations, activations, 'expired hidden candidates never activate');
    g.model.seedPoppies(); g.close(); assert.equal(g.view.byId.size, 0); assert.equal(g.model.specimens.length, 0); assert.deepEqual(g.errors, []);
  }
  console.log('PASS: independent exact .5% poppy rolls, consumed failures/cap skips, canonical identity/lifetimes/provenance, gnomes, inspect-only clicks, actual neighbor cleanup, hidden reconciliation, replacement and bounded atlas/reset/page ownership.');
})().catch(error => { console.error(error); process.exitCode = 1; });
