const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const S = require('../wwwroot/pixi-wirefern-spores.js'), G = require('../wwwroot/garden-core.js');
const C = require('../wwwroot/pixi-live-core.js'), shared = require('../wwwroot/pixi-stress.js');
const h = require('./pixi-live.cjs'), { createView } = require('../wwwroot/pixi-live.js'), page = require('./pixi-page.cjs');
const fern = (id = 1) => ({ id, type: 'wirefern', cell: id, column: id, row: 10, vigor: id % 4, createdAt: 0,
  wirefernSpores: Object.freeze({ color: id % 3, layout: id % 3 }), origin: { kind: 'simulated' } });
function fixture(roll = 0, sources = [fern()], reduced = false) {
  let at = 50000, calls = 0, scans = 0;
  const changes = [], model = S.createEmissionModel({ now: () => at, random: () => { calls++; return roll; },
    getSpecimens: () => { scans++; return sources; }, hasSource: p => sources.includes(p), getReducedMotion: () => reduced,
    onChange: change => changes.push(change) });
  return { model, sources, changes, get at() { return at; }, get calls() { return calls; }, get scans() { return scans; },
    advance(ms) { const end = at + ms; while (at < end) { at = Math.min(end, at + 250); model.tick(at); } },
    jump(ms) { at += ms; model.tick(at); } };
}
assert.equal(S.chance, .25); assert.equal(S.colors.length, 3); assert.equal(S.layouts.length, 3);
assert.deepEqual(S.emissionConfig, { everyMs: 30000, chance: .75, lifetimeMs: 3000, reducedLifetimeMs: 1000, maxActive: 2, maxTickGapMs: 1500 });
for (const [age, yes] of [[0, false], [18000, false], [49999, false], [50000, true], [299999, true], [300000, false], [360000, false]])
  assert.equal(S.eligible(fern(), age), yes);
for (const p of [{ ...fern(), type: 'vine' }, { ...fern(), wirefernSpores: null }, { ...fern(), mutation: { expiresAt: 90000 } }]) assert.equal(S.eligible(p, 50000), false);
for (const [roll, yes] of [[0, true], [.749999999, true], [.75, false], [.99999, false], [-1, false], [NaN, false]]) {
  const f = fixture(roll), snapshot = JSON.stringify(f.sources); f.advance(29999);
  assert.equal(f.calls, 0); assert.equal(f.scans, 0); f.advance(1);
  assert.equal(f.model.clouds.length, yes ? 1 : 0); assert.equal(f.calls, yes ? 2 : 1); assert.equal(f.scans, 1);
  for (let i = 0; i < 100; i++) f.model.tick(f.at);
  assert.equal(f.scans, 1); assert.equal(f.model.counts.checks, 1); assert.equal(JSON.stringify(f.sources), snapshot);
  f.advance(29999); assert.equal(f.model.counts.checks, 1); f.advance(1); assert.equal(f.model.counts.checks, 2);
}
for (const sources of [[], [{ ...fern(), wirefernSpores: null }], [{ ...fern(), createdAt: 60000 }]]) {
  const f = fixture(0, sources); f.advance(30000); assert.equal(f.calls, 0); assert.equal(f.model.clouds.length, 0);
}
{
  const f = fixture(.6, [fern(1), fern(2), fern(3)]); f.advance(30000);
  assert.equal(f.model.clouds[0].source, f.sources[1], 'one source chosen uniformly from the current pool');
  f.advance(2999); assert.equal(f.model.clouds.length, 1); f.advance(1); assert.equal(f.model.clouds.length, 0);
}
{
  const f = fixture(0, [fern(1), fern(2)]); f.advance(29000);
  assert(f.model.preview(f.sources[0], f.at)); assert(f.model.preview(f.sources[1], f.at));
  assert.equal(f.model.preview(f.sources[0], f.at), null); assert.equal(f.model.clouds.length, 2);
  f.advance(1000); assert.equal(f.calls, 2); assert.equal(f.model.counts.checks, 1);
  f.advance(3000); assert.equal(f.model.clouds.length, 0); assert.equal(f.model.counts.checks, 1, 'cap attempts never queue');
  assert.equal(f.model.preview({ ...fern(), origin: { kind: 'tcpnoise' } }, f.at), null, 'forced previews never mutate live traffic');
}
for (const action of ['removed', 'replaced', 'fading', 'expired', 'hidden', 'gap', 'backward', 'motion']) {
  const f = fixture(), source = f.sources[0]; f.model.preview(source, f.at);
  if (action === 'removed') { f.sources.pop(); f.model.removed(source); }
  else if (action === 'replaced') { f.sources[0] = { ...source }; f.advance(250); }
  else if (action === 'fading' || action === 'expired') { source.createdAt = f.at - (action === 'fading' ? 300000 : 360000); f.advance(250); }
  else if (action === 'hidden') { f.model.setHidden(true, f.at); f.jump(100000); f.model.setHidden(false, f.at); }
  else if (action === 'gap') f.jump(5000);
  else if (action === 'backward') f.jump(-1000);
  else f.model.motionChanged(f.at);
  assert.equal(f.model.clouds.length, 0, action);
  if (['hidden', 'gap', 'backward', 'motion'].includes(action)) { const checks = f.model.counts.checks; f.advance(29999); assert.equal(f.model.counts.checks, checks); }
}
{
  const f = fixture(); f.jump(120000); assert.equal(f.calls, 0); assert.equal(f.scans, 0);
  f.advance(29999); assert.equal(f.calls, 0); f.advance(1); assert.equal(f.model.clouds.length, 1); assert.equal(f.model.counts.checks, 1);
}
{
  const f = fixture(0, [fern()], true), cloud = f.model.preview(f.sources[0], f.at);
  const a = S.cloudPose(cloud, f.at), b = S.cloudPose(cloud, f.at + 500);
  assert.equal(cloud.expiresAt - cloud.createdAt, 1000);
  assert.deepEqual([a.x, a.y, a.scaleX, a.scaleY], [b.x, b.y, b.scaleX, b.scaleY]); assert(b.alpha < a.alpha);
  f.advance(1000); assert.equal(f.model.clouds.length, 0);
}
const context = { window: { PacketGardenCore: G }, Uint32Array, Date, performance, Math: Object.create(Math), crypto: { getRandomValues(a) { a[0] = 181; return a; } } };
context.Math.random = () => { throw Error('shared randomness consumed'); };
vm.runInNewContext(fs.readFileSync('wwwroot/pixi-wirefern-spores.js', 'utf8'), context);
const traitRng = context.window.PacketGardenWirefernSpores.createRandom(), emissionRng = context.window.PacketGardenWirefernSpores.createEmissionRandom();
for (let i = 0; i < 100; i++) emissionRng();
assert.equal(traitRng(), context.window.PacketGardenWirefernSpores.createRandom()(), 'emissions never advance trait selection');
let at = 100000, game, emitter, geometry = 0;
class Graphics extends h.P.Graphics { constructor() { super(); geometry++; } }
const stage = new h.P.Container(), view = createView({ ...h.P, Graphics }, { stage }, h.cache.frames, C, shared);
game = C.createModel(view, { now: () => at, random: () => .5, onRemoved: p => emitter?.removed(p) });
emitter = S.createEmissionModel({ now: () => at, getSpecimens: () => game.specimens, hasSource: p => game.byCell.get(p.cell) === p, onChange: view.cloudChange });
game.seedWirefernSpores('replacement'); const source = game.specimens[303], originalParent = view.byId.get(source.id);
const cloud = emitter.preview(source, at), record = view.cloudViews.get(cloud), sprite = record.sprite, beforeGeometry = geometry;
assert.equal(sprite.texture, h.cache.frames.get('wirefern-cloud')); assert.equal(sprite.eventMode, 'none');
view.animate(0, .016, at + 1500); assert(sprite.position.y < record.y); assert(sprite.scale.x > .7); assert(sprite.alpha < .85);
for (let i = 0; i < 1000; i++) view.animate(i, .016, at + 1500); assert.equal(geometry, beforeGeometry);
assert.equal(view.byId.get(source.id), originalParent);
game.replaceWirefernSporeFixture(); assert.equal(view.cloudViews.size, 0); assert(!h.live.has(sprite)); assert.equal(emitter.clouds.length, 0);
const textures = h.textureCount(), bakes = h.generated();
for (let i = 0; i < 30; i++) { const p = game.specimens[0]; emitter.preview(p, at); emitter.preview(p, at);
  assert.equal(view.cloudViews.size, 2); const sprites = [...view.cloudViews.values()].map(r => r.sprite); emitter.clear(); assert(sprites.every(s => !h.live.has(s))); }
assert.equal(h.textureCount(), textures); assert.equal(h.generated(), bakes); assert.equal(geometry, beforeGeometry);
game.clear(); emitter.destroy(); assert.equal(emitter.preview(source, at), null); view.destroy(); stage.destroy();
assert.doesNotMatch(fs.readFileSync('wwwroot/pixi-wirefern-spores.js', 'utf8'), /setTimeout|setInterval|requestAnimationFrame|ParticleContainer|Math\.random/);
(async () => {
  for (const name of ['index.html', 'pixi-live.html']) {
    const g = await page({ page: name, random: () => .5, sporeRandom: () => 0, emissionRandom: () => 0 });
    g.emit('garden', { specimenType: 'wirefern', vigor: 2, listenPort: 23, sensor: 'truthful', seenCount: '12' });
    const parent = g.model.specimens[0], identity = JSON.stringify(parent), counts = JSON.stringify([g.model.counts, g.model.recentEvents]);
    for (let i = 0; i < 240; i++) g.frame(250);
    assert.equal(g.emissions.clouds.length, 1); assert.equal(g.view.cloudViews.size, 1); assert.equal(g.emissions.counts.rolls, 1);
    assert.equal(JSON.stringify([g.model.counts, g.model.recentEvents]), counts); assert.equal(parent.origin.sensor, 'truthful');
    assert.equal(parent.createdAt, 100000); assert.equal(parent.type, 'wirefern'); assert.equal(g.element('#garden-score').textContent, 'Score: 0');
    g.hidden(true); assert.equal(g.view.cloudViews.size, 0); g.advance(120000); g.hidden(false);
    assert.equal(g.emissions.clouds.length, 0); const checks = g.emissions.counts.checks;
    for (let i = 0; i < 119; i++) g.frame(250); assert.equal(g.emissions.counts.checks, checks); g.frame(250);
    assert.equal(g.emissions.counts.checks, checks + 1); assert.equal(g.emissions.clouds.length, 1);
    g.media.matches = true; g.media.handlers.get('change')(); assert.equal(g.view.cloudViews.size, 0);
    if (name === 'index.html') assert.equal(g.element('#trigger-wirefern-cloud'), null);
    else {
      g.element('#seed-wirefern-spores-mature').handlers.get('click')();
      for (let color = 0; color < 3; color++) { g.element('#clear-wirefern-clouds').handlers.get('click')();
        g.element('#wirefern-cloud-color').value = String(color); g.element('#trigger-wirefern-cloud').handlers.get('click')();
        assert.equal(g.emissions.clouds[0].color, color); assert.equal(g.emissions.clouds[0].reduced, true); }
      g.element('#remove-wirefern-cloud-source').handlers.get('click')(); assert.equal(g.emissions.clouds.length, 0);
      g.element('#wirefern-cloud-motion').value = 'reduced'; g.element('#wirefern-cloud-motion').handlers.get('change')({ target: { value: 'reduced' } });
    }
    g.close(); assert.equal(g.view.cloudViews.size, 0); assert.equal(g.emissions.clouds.length, 0); assert.deepEqual(g.errors, []);
  }
  console.log('PASS: wirefern cloud 30s/75%/one-current-source, independent RNG, exact eligibility/cap/no catch-up, hidden/motion/source cleanup, static reduced pose, cached two-Sprite ownership, real page scheduler and unchanged network/score/specimens.');
})().catch(error => { console.error(error); process.exitCode = 1; });
