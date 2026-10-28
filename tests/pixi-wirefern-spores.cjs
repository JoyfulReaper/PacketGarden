const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const S = require('../wwwroot/pixi-wirefern-spores.js'), C = require('../wwwroot/pixi-live-core.js');
const shared = require('../wwwroot/pixi-stress.js'), G = require('../wwwroot/garden-core.js');
const { createView } = require('../wwwroot/pixi-live.js'), h = require('./pixi-live.cjs'), page = require('./pixi-page.cjs');
assert.equal(S.chance, .25); assert.equal(S.layouts.length, 3);
for (const [roll, success] of [[0, true], [.24999999999, true], [.25, false], [.99999, false], [-1, false], [NaN, false]]) {
  const p = { type: 'wirefern' }; let calls = 0; const draw = () => { calls++; return roll; }, trait = S.assign(p, draw);
  assert.equal(Boolean(trait), success); for (let i = 0; i < 50; i++) assert.equal(S.assign(p, draw), trait);
  assert.equal(calls, 1); assert(!Object.keys(p).includes('wirefernSpores')); if (trait) assert(Object.isFrozen(trait));
}
const bins = Array(9).fill(0); let successes = 0;
for (let i = 0; i < 36000; i++) { const trait = S.assign({ type: 'wirefern' }, () => (i + .5) / 36000);
  if (trait) { bins[trait.layout * 3 + trait.color]++; successes++; } }
assert.equal(successes, 9000); assert.deepEqual(bins, Array(9).fill(1000));
for (const type of G.species.filter(t => t !== 'wirefern')) assert.equal(S.assign({ type }, () => { throw Error('unrelated roll'); }), null);
assert.throws(() => S.assign({ type: 'wirefern', wirefernSpores: { color: 3, layout: 0 } }), /Invalid wirefern/);
const context = { window: {}, Uint32Array, Date, performance, Math: Object.create(Math), crypto: { getRandomValues(a) { a[0] = 93; return a; } } };
context.Math.random = () => { throw Error('shared RNG consumed'); };
vm.runInNewContext(fs.readFileSync('wwwroot/pixi-wirefern-spores.js', 'utf8'), context);
for (let i = 0; i < 100; i++) context.window.PacketGardenWirefernSpores.assign({ type: 'wirefern' });
const event = (type = 'wirefern', vigor = 1) => ({ specimenType: type, vigor, listenPort: 23, sensor: 'source', seenCount: '18446744073709551615' });
function trace(sporeRandom) {
  let placement = 0, broadleaf = 0, vine = 0, poppy = 0;
  const m = C.createModel({ add() {}, update() {}, remove() {} }, { now: () => 100000, sporeRandom,
    random: () => { placement++; return .5; }, bloomRandom: () => { broadleaf++; return .1; },
    vineBloomRandom: () => { vine++; return .1; }, poppyRandom: () => { poppy++; return .9; } });
  for (let i = 0; i < 120; i++) m.accept(event(['wirefern', 'broadleaf', 'vine', 'weed', 'mushroom'][i % 5], i % 4));
  return { placement, broadleaf, vine, poppy, data: JSON.stringify(m.specimens), counts: m.counts, recent: m.recentEvents,
    blooms: m.specimens.map(p => [p.broadleafBloom, p.vineBloom]) };
}
assert.deepEqual(trace(() => 0), trace(() => .9));
for (let vigor = 0; vigor < 4; vigor++) { assert.equal(C.colorVariant('wirefern', vigor, .009999), 4); assert.equal(C.colorVariant('wirefern', vigor, .01), vigor); }
// Probe the actual shared stress atlas, not a duplicate rendering recipe.
class Graphics extends h.P.Graphics {
  constructor() { super(); this.segments = []; }
  moveTo(x, y) { this.last = [x, y]; return this; }
  lineTo(x, y) { if (this.last) this.segments.push([...this.last, x, y]); this.last = [x, y]; return this; }
}
let baseArt;
const original = shared.makeAtlas({ ...h.P, Graphics }, { generateTexture(options) { baseArt = [...options.target.children]; return { source: {}, destroy() {} }; } });
for (let vigor = 0; vigor < 4; vigor++) for (let layout = 0; layout < 3; layout++) for (const site of S.sites(layout)) {
  const raw = [site.x / .58 + 32, site.y / .58 + 57.6], segments = baseArt[16 + vigor].segments;
  assert(segments.some(([x1, y1, x2, y2]) => {
    const cross = (raw[0] - x1) * (y2 - y1) - (raw[1] - y1) * (x2 - x1);
    return Math.abs(cross) < 1e-9 && raw[0] >= Math.min(x1, x2) && raw[0] <= Math.max(x1, x2)
      && raw[1] >= Math.min(y1, y2) && raw[1] <= Math.max(y1, y2);
  }), 'every dot is on a real angular frond at every vigor');
}
for (const t of original.frames.values()) t.destroy(false); original.atlas.destroy(true);
let at = 100000, rolls = 0;
const stage = new h.P.Container(), view = createView(h.P, { stage }, h.cache.frames, C, shared);
const model = C.createModel(view, { now: () => at, random: () => .5, sporeRandom: () => { rolls++; return .02; } });
model.accept({}); model.setPaused(true); model.accept(event()); model.setPaused(false); assert.equal(rolls, 0);
const p = model.accept({ ...event(), wirefernSpores: null }), parent = view.byId.get(p.id), before = { ...p }, trait = p.wirefernSpores;
assert(trait, 'raw event cannot force a trait'); assert.equal(rolls, 1);
for (const age of [17999, 18000, 49999]) { at = p.createdAt + age; model.tick(); assert.equal(view.sporeViews.size, 0); }
at++; model.tick(); const overlay = view.sporeViews.get(p.id);
assert.equal(overlay.parent, parent); assert.equal(overlay.tint, S.tints[trait.color]); assert.equal(overlay.eventMode, 'none');
assert.equal(overlay.position.y, .2); assert.equal(overlay.anchor.y, 29 / 32); assert.equal(overlay.scale.x, 1);
for (const key of Object.keys(before).filter(k => k !== 'stage')) assert.equal(p[key], before[key]);
for (let i = 0; i < 100; i++) { model.tick(); view.update(p, model.byCell); view.animate(i, .016, at); }
assert.equal(p.wirefernSpores, trait); assert.equal(rolls, 1); assert.equal(view.sporeViews.get(p.id), overlay);
at = p.createdAt + 299999; model.tick(); assert.equal(overlay.alpha, 1);
at++; model.tick(); assert.equal(view.sporeViews.get(p.id), overlay); assert.equal(overlay.alpha, .55); assert.equal(overlay.scale.x, .66);
assert.notEqual(overlay.tint, S.tints[trait.color]);
at = p.createdAt + 359999; model.tick(); assert(model.specimens.includes(p)); at++; model.tick();
assert.equal(view.sporeViews.size, 0); assert(!h.live.has(overlay)); assert(!h.live.has(parent));
model.seedWirefernSpores('combinations'); assert.equal(view.sporeViews.size, 180);
assert.equal(new Set(model.specimens.map(p => [p.vigor, p.colorVariant, p.wirefernSpores.color, p.wirefernSpores.layout].join(':'))).size, 180);
for (const p of model.specimens) assert.equal(view.sporeViews.get(p.id).tint, S.tints[p.wirefernSpores.color]);
model.seedWirefernSpores('replacement'); const victim = model.specimens[303], owned = view.sporeViews.get(victim.id);
const replacement = model.replaceWirefernSporeFixture(); assert.equal(replacement.replaced, victim); assert.equal(replacement.specimen.cell, victim.cell);
assert(!h.live.has(owned)); assert(!view.sporeViews.has(victim.id)); assert.equal(view.sporeViews.size, 639);
const count = rolls; assert.equal(model.acceptEvent(event('wirefern', 0)).outcome, 'dropped'); assert.equal(rolls, count);
const textures = h.textureCount(), bakes = h.generated(), nodes = h.live.size;
for (let i = 0; i < 10; i++) { model.seedWirefernSpores('dense'); assert.equal(view.sporeViews.size, 640);
  model.clear(); assert.equal(view.sporeViews.size, 0); assert.equal(model.byCell.size, 0); }
assert.equal(h.textureCount(), textures); assert.equal(h.generated(), bakes); assert(h.live.size < nodes);
model.seedWirefernSpores('dense'); const sprites = [...view.sporeViews.values()]; view.destroy(); stage.destroy();
assert(sprites.every(s => !h.live.has(s))); assert.equal(view.sporeViews.size, 0);
assert.doesNotMatch(fs.readFileSync('wwwroot/pixi-wirefern-spores.js', 'utf8'), /setTimeout|setInterval|requestAnimationFrame|Math\.random/);
(async () => {
  for (const name of ['index.html', 'pixi-live.html']) for (const reduced of [false, true]) {
    const g = await page({ page: name, reduced, random: () => .5, sporeRandom: () => 0 });
    g.emit('garden', event()); const fern = g.model.specimens[0], sprite = g.view.byId.get(fern.id), counts = JSON.stringify([g.model.counts, g.model.recentEvents]);
    g.hidden(true); g.advance(50000); g.hidden(false); assert.equal(g.view.sporeViews.size, 1); assert.equal(g.view.byId.get(fern.id), sprite);
    g.click(page.center(fern)); assert.equal(g.element('#specimen-card-title').textContent, 'Wirefern'); assert.equal(g.element('#specimen-port').textContent, '23');
    assert.equal(g.element('#garden-score').textContent, 'Score: 0'); assert.equal(JSON.stringify([g.model.counts, g.model.recentEvents]), counts);
    g.hidden(true); g.advance(310000); g.hidden(false); assert.equal(g.view.sporeViews.size, 0); assert.equal(g.model.specimens.length, 0);
    if (name === 'index.html') assert.equal(g.element('#seed-wirefern-spores-dense'), null);
    else for (const mode of ['stages', 'combinations', 'mixed', 'dense', 'expiry', 'replacement']) {
      g.element(`#seed-wirefern-spores-${mode}`).handlers.get('click')(); assert(g.model.specimens.every(p => p.origin.kind === 'simulated'));
      if (mode === 'stages') assert.equal(g.view.sporeViews.size, 18);
      if (mode === 'combinations') assert.equal(g.view.sporeViews.size, 180);
      if (mode === 'dense') assert.equal(g.view.sporeViews.size, 640);
      if (mode === 'expiry') { g.advance(1000); g.model.tick(); assert.equal(g.view.sporeViews.size, 0); }
      if (mode === 'replacement') { const id = g.model.specimens[303].id; g.element('#replace-wirefern-spores').handlers.get('click')(); assert(!g.view.sporeViews.has(id)); }
    }
    g.model.seedWirefernSpores('dense'); g.close(); assert.equal(g.view.sporeViews.size, 0); assert.deepEqual(g.errors, []);
  }
  console.log('PASS: 25%/single stable independent trait, nine uniform pairs, actual shared-frond alignment/all 180 combinations, afterglow, 50s/5m/6m, exact ownership/replacement, 640 overlays/reset/cache bounds, hidden/reduced-motion and no SSE/score/provenance changes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
