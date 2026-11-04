const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const A = require('../wwwroot/garden-ambient.js'), C = require('../wwwroot/pixi-live-core.js');
const M = require('../wwwroot/garden-mutations.js'), I = require('../wwwroot/garden-interaction.js');
const V = require('../wwwroot/pixi-live-ambient.js'), UI = require('../wwwroot/garden-ui-core.js');
const h = require('./pixi-live.cjs'), page = require('./pixi-page.cjs');
const message = 'You collected an opium pod. +0 points';
const event = type => ({ specimenType: type ?? 'vine', listenPort: 3389, vigor: 1, sensor: 'pod-test', seenCount: '18446744073709551615' });
function setup({ podRoll = 0, poppyRoll = 0, palette = .5 } = {}) {
  let at = 100000, podCalls = 0, gameplay = 0, ambientCalls = 0, transitions = 0, poppyCalls = 0;
  let model;
  const ambient = A.createAmbientModel({ now: () => at, getSpecimens: () => model.specimens,
    random: () => { ambientCalls++; return .5; }, podRandom: () => { podCalls++; return podRoll; } });
  model = C.createModel({ add() {}, update() {}, remove() {} }, { now: () => at,
    random: () => { gameplay++; return palette; }, bloomRandom: () => .9, vineBloomRandom: () => .9,
    poppyRandom: () => { poppyCalls++; return poppyRoll; },
    onPoppyActivated(p, t) { transitions++; ambient.acceptPoppyActivation(p, t); },
    onRemoved: p => ambient.cancelSource(p), onLive: p => ambient.acceptLiveSpecimen(p) });
  return { model, ambient, get at() { return at; }, set at(t) { at = t; },
    get draws() { return { podCalls, gameplay, ambientCalls, transitions, poppyCalls }; },
    tick(t = at) { at = t; model.tick(at); ambient.tick(at); },
    advance(ms) { const until = at + ms; while (at < until) this.tick(Math.min(until, at + 250)); },
    live(type) { return model.accept(event(type)); } };
}
assert.deepEqual(A.dropTypes.opium_pod, { sourceType: 'vine', chance: .2, delayMs: 3000, maxTickGapMs: 1500 });
assert.equal(UI.collectionMessage('opium_pod'), message);
for (const roll of [0, .19999999999, .2, .200000001, .999999, -1, NaN, Infinity]) {
  const f = setup({ podRoll: roll }), p = f.live(); assert.equal(f.draws.podCalls, 0);
  f.tick(p.createdAt + 59999); assert.equal(f.draws.podCalls, 0); f.tick(p.createdAt + 60000);
  const success = roll >= 0 && roll < .2;
  assert.equal(f.ambient.pendingDrops.size, success ? 1 : 0); assert.equal(f.draws.podCalls, success ? 3 : 1);
  for (let i = 0; i < 20; i++) { f.ambient.acceptPoppyActivation(p, f.at); f.model.tick(); UI.inspection(p, f.at); }
  assert.equal(f.draws.podCalls, success ? 3 : 1); assert.equal(f.draws.transitions, 1);
  if (success) { f.advance(2999); assert.equal(f.ambient.drops.length, 0); f.advance(1); assert.equal(f.ambient.drops[0].type, 'opium_pod'); }
  f.ambient.clear(); f.ambient.acceptPoppyActivation(p, f.at); assert.equal(f.ambient.pendingDrops.size, 0);
  assert.equal(f.ambient.scheduleLooseDrop(p, 'opium_pod', () => { throw Error('retry placement'); }, f.at), false);
}
for (const options of [{ poppyRoll: .005 }, { palette: .009 }]) {
  const f = setup(options), p = f.live(); f.tick(p.createdAt + 60000); assert.equal(f.draws.podCalls, 0);
}
{
  const f = setup({ podRoll: .2 }); const vines = Array.from({ length: 3 }, () => f.live());
  f.tick(vines[0].createdAt + 60000); assert.equal(f.draws.transitions, 2); assert.equal(f.draws.podCalls, 2);
  assert.equal(vines[2].poppyMutation.state, 'cap-skipped'); f.model.remove(vines[0]); f.advance(4000); assert.equal(f.draws.podCalls, 2);
}
// Stream isolation includes placement, poppy selection, vine flowers and Amanita/bud decisions.
function trace(podRoll) {
  const f = setup({ podRoll }); const p = f.live(); f.live('weed'); f.live('mushroom');
  f.tick(p.createdAt + 60000); f.advance(3000);
  return { draws: { ...f.draws, podCalls: undefined }, specimens: JSON.stringify(f.model.specimens),
    counts: f.model.counts, recent: f.model.recentEvents, traits: f.model.specimens.map(p => p.vineBloom) };
}
assert.deepEqual(trace(0), trace(.2));
{
  const f = setup(), p = f.model.seedPoppies('pods'), before = f.draws.ambientCalls;
  assert(f.ambient.scheduleLooseDrop(p, 'opium_pod', undefined, f.at));
  assert.equal(f.draws.ambientCalls, before); assert.equal(f.draws.podCalls, 2, 'direct fixture placement also uses the pod stream');
}
const context = { window: { PacketGardenCore: require('../wwwroot/garden-core.js') }, Uint32Array, Date, performance, Math: Object.create(Math),
  crypto: { getRandomValues(a) { a[0] = 17; return a; } } };
context.Math.random = () => { throw Error('ambient/gameplay RNG consumed'); };
vm.runInNewContext(fs.readFileSync('wwwroot/garden-ambient.js', 'utf8'), context);
const rng = context.window.PacketGardenAmbient.createOpiumPodRandom(); for (let i = 0; i < 100; i++) assert(rng() >= 0);
{
  const f = setup(), p = f.live(), identity = { ...p };
  f.tick(p.createdAt + 60000); f.advance(3000); const pod = f.ambient.drops[0], created = pod.createdAt;
  const statistics = JSON.stringify([f.model.counts, f.model.recentEvents]);
  assert.equal(pod.expiresAt, created + 20000); assert(!Object.values(pod).includes(p));
  for (const key of Object.keys(identity).filter(k => k !== 'stage')) assert.equal(p[key], identity[key]);
  assert.equal(I.resolve({ x: pod.x, y: pod.y }, { specimens: [p], drops: [pod] }, f.at).kind, 'drop');
  assert.equal(I.resolve(page.center(p), { specimens: [p], drops: [pod] }, f.at).kind, 'specimen');
  f.model.remove(p); assert.equal(f.ambient.drops[0], pod); f.tick(created + 19999); assert.equal(f.ambient.drops[0], pod);
  f.tick(created + 20000); assert.equal(f.ambient.drops.length, 0); assert.equal(JSON.stringify([f.model.counts, f.model.recentEvents]), statistics);
}
for (const change of ['remove', 'copy', 'id', 'createdAt', 'cell', 'column', 'row', 'type', 'trait', 'inactive', 'silver']) {
  const f = setup(), p = f.live(); f.tick(p.createdAt + 60000);
  if (change === 'remove') f.model.remove(p);
  else if (change === 'copy') f.model.specimens.splice(0, 1, { ...p });
  else if (change === 'type') p.type = 'weed';
  else if (change === 'trait') Object.defineProperty(p, 'poppyMutation', { value: { state: 'active' }, configurable: true });
  else if (change === 'inactive') p.poppyMutation.state = 'cap-skipped';
  else if (change === 'silver') p.colorVariant = 4;
  else p[change]++;
  f.advance(3000); assert.equal(f.ambient.pendingDrops.size, 0, change); assert.equal(f.ambient.drops.length, 0, change);
}
{
  const f = setup(), p = f.model.seedPoppies('replacement');
  assert(f.ambient.scheduleLooseDrop(p, 'opium_pod', () => .5, f.at));
  assert.equal(f.model.replacePoppyFixture().replaced, p); assert.equal(f.ambient.pendingDrops.size, 0);
  const expiring = f.model.seedPoppies('expiry'); assert(f.ambient.scheduleLooseDrop(expiring, 'opium_pod', () => .5, f.at));
  f.advance(3000); assert.equal(f.ambient.drops.length, 0); assert.equal(f.ambient.pendingDrops.size, 0);
}
const entry = (type, at, i = 0) => ({ type, createdAt: at, expiresAt: at + 20000, x: 200 + i * 30, y: 300, phase: 0 });
{
  const f = setup(), p = f.live(); f.at = p.createdAt + 60000;
  const types = ['amanita_muscaria', 'ditch_weed_bud', 'gnome_underpants', 'opium_pod', 'amanita_muscaria'];
  f.ambient.seed({ drops: types.map((t, i) => entry(t, f.at, i)) }); const original = f.ambient.drops.slice();
  f.tick(); f.advance(3000); assert.deepEqual(f.ambient.drops, original); assert.equal(f.ambient.counts.dropsCapSkipped, 1);
  assert.equal(f.ambient.pendingDrops.size, 0); f.ambient.removeDrop(original[0], 'collected');
  f.advance(1000); f.ambient.acceptPoppyActivation(p); assert.equal(f.ambient.drops.length, 4); assert.equal(f.ambient.pendingDrops.size, 0);
}
for (const mechanism of ['hidden', 'gap', 'maturity hidden', 'maturity gap']) {
  const f = setup(), p = f.live();
  if (mechanism.startsWith('maturity')) {
    f.ambient.setHidden(mechanism === 'maturity hidden', f.at); f.at = p.createdAt + 65000;
    f.ambient.setHidden(false, f.at); f.tick(); f.advance(3000);
  } else {
    f.tick(p.createdAt + 60000); if (mechanism === 'hidden') f.ambient.setHidden(true, f.at);
    f.at += 3000; f.ambient.setHidden(false, f.at); f.tick();
  }
  assert.equal(f.ambient.drops.length, 0, mechanism); assert.equal(f.ambient.pendingDrops.size, 0, mechanism);
  f.ambient.acceptPoppyActivation(p, f.at); assert.equal(f.ambient.pendingDrops.size, 0, 'missed attempts consumed');
}
// Brief hiding before a future deadline does not cancel it; a significant deadline gap does.
{
  const f = setup(), p = f.live(); f.tick(p.createdAt + 60000); f.ambient.setHidden(true, f.at);
  f.at += 500; f.ambient.setHidden(false, f.at); f.tick(); f.advance(2500); assert.equal(f.ambient.drops.length, 1);
}
// Edge placement stays in bounds and clear of the parent's inspection center.
for (const [column, row] of [[0, 0], [31, 0], [0, 19], [31, 19]]) {
  const p = { type: 'vine', id: 1, cell: row * 32 + column, column, row, createdAt: 0, colorVariant: 0,
    origin: { kind: 'tcpnoise' }, poppyMutation: { state: 'active' } };
  const a = A.createAmbientModel({ now: () => 60000, podRandom: () => 0, getSpecimens: () => [p] });
  assert(a.acceptPoppyActivation(p)); const pending = a.pendingDrops.get(p);
  assert(pending.x >= 14 && pending.x <= 946 && pending.y >= 14 && pending.y <= 586);
  assert(Math.hypot(pending.x - page.center(p).x, pending.y - page.center(p).y) > 18);
}
// Existing loose-drop Sprite/cache ownership, static artwork and repeated resets.
{
  const textures = h.textureCount(), bakes = h.generated(), objects = h.live.size;
  const cache = V.makeAmbientAtlas(h.P, h.renderer), cl = new h.P.Container(), dl = new h.P.Container();
  const view = V.createAmbientView(h.P, cl, dl, cache.frames), a = A.createAmbientModel({ onChange: c => view.change(c, 100000) });
  assert.equal(cache.frames.size, 23); assert(cache.frames.has('opium_pod'));
  for (let i = 0; i < 25; i++) {
    a.seed({ drops: ['amanita_muscaria', 'ditch_weed_bud', 'gnome_underpants', 'opium_pod'].map((t, n) => entry(t, 100000, n)) });
    const pod = a.drops[3], sprite = view.dropViews.get(a.idFor(pod)).sprite;
    for (let j = 0; j < 120; j++) view.animate(100000 + j * 16);
    assert.equal(sprite.position.x, pod.x); assert.equal(sprite.position.y, pod.y); assert.equal(sprite.texture, cache.frames.get('opium_pod'));
    a.removeDrop(pod, 'collected'); assert(!h.live.has(sprite)); a.tick(120000); assert.equal(view.dropViews.size, 0);
  }
  assert.equal(h.generated(), bakes + 1); a.clear(); view.destroy(); cl.destroy(); dl.destroy(); cache.destroy();
  assert.equal(h.textureCount(), textures); assert.equal(h.live.size, objects);
}
(async () => {
  for (const name of ['index.html', 'pixi-live.html']) {
    const g = await page({ page: name, random: () => .5, poppyRandom: () => 0, podRandom: () => 0 });
    if (name === 'index.html') assert.equal(g.element('#seed-opium-active'), null);
    else {
      for (const mode of ['pending', 'active', 'mixed', 'cap', 'cancel', 'hidden', 'expiry', 'reset']) {
        g.element(`#seed-opium-${mode}`).handlers.get('click')();
        assert(g.model.specimens.every(p => p.origin.kind === 'simulated')); assert.equal(g.model.counts.acceptedLive, 0);
        if (mode === 'cap') { for (let i = 0; i < 12; i++) g.frame(250); assert.equal(g.ambient.drops.length, 5); assert.equal(g.ambient.pendingDrops.size, 0); }
        if (mode === 'cancel' || mode === 'hidden') assert.equal(g.ambient.pendingDrops.size, 0);
        if (mode === 'expiry') { g.frame(1000); assert.equal(g.ambient.drops.length, 0); }
      }
      g.element('#seed-opium-active').handlers.get('click')();
    }
    if (name === 'index.html') {
      g.emit('garden', event()); assert.equal(g.ambient.pendingDrops.size, 0);
      g.frame(60000); assert.equal(g.ambient.pendingDrops.size, 1);
      for (let i = 0; i < 12; i++) g.frame(250);
      assert.equal(g.ambient.drops[0].type, 'opium_pod'); assert.equal(g.model.counts.acceptedLive, 1);
    }
    const p = g.model.specimens.find(p => p.poppyMutation?.state === 'active'), pod = g.ambient.drops.find(d => d.type === 'opium_pod');
    const before = JSON.stringify([g.model.counts, g.model.recentEvents, g.model.specimens]), identity = p;
    g.click(page.center(p)); assert.equal(g.element('#specimen-card').hidden, false); assert.match(g.element('#specimen-card-title').textContent, /Opium poppy/);
    g.click(pod); assert.equal(g.element('#collection-message').textContent, message); assert(g.model.specimens.includes(identity));
    assert.equal(JSON.stringify([g.model.counts, g.model.recentEvents, g.model.specimens]), before); assert.equal(g.element('#garden-score').textContent, 'Score: 0');
    const source = g.model.seedPoppies('pods'); g.ambient.scheduleLooseDrop(source, 'opium_pod', () => .5, g.now());
    g.hidden(true); g.advance(3000); g.hidden(false); assert.equal(g.ambient.pendingDrops.size, 0); assert.equal(g.ambient.drops.length, 0);
    g.close(); assert.equal(g.ambient.pendingDrops.size, 0); assert.deepEqual(g.errors, []);
  }
  console.log('PASS: opium 20%/one activation decision, separate streams, exact parent/delay/lifetimes/shared cap, no hidden/gap catch-up, canonical identity/provenance/counts, inspect/collect priority, mixed drops and static bounded Pixi/page ownership.');
})().catch(error => { console.error(error); process.exitCode = 1; });
