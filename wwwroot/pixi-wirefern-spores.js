// Pixi-only, source-owned sori. No garden, ecology or drop rules.
(function () {
  'use strict';
  const core = typeof module !== 'undefined' && module.exports ? require('./garden-core.js') : window.PacketGardenCore;
  const chance = .25;
  const colors = Object.freeze(['Copper', 'Golden ochre', 'Phosphor cyan']);
  const tints = Object.freeze([0xd49a6a, 0xdfca8c, 0xaddbd5]);
  // The lower four stress-atlas fronds are identical for every vigor (4–7 fronds).
  const layouts = Object.freeze([
    [[1, -1], [1, 1]], [[0, -1], [1, 1], [3, -1]], [[0, -1], [1, 1], [2, -1], [3, 1]]
  ].map(layout => Object.freeze(layout.map(Object.freeze))));
  function createRandom() {
    const entropy = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(entropy);
    else entropy[0] = (Date.now() ^ Math.floor((globalThis.performance?.now?.() ?? 0) * 1000) ^ 0x50a1fe42) >>> 0;
    let seed = entropy[0];
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  const random = createRandom();
  const valid = trait => trait === null || (Number.isInteger(trait?.color) && trait.color >= 0 && trait.color < 3
    && Number.isInteger(trait.layout) && trait.layout >= 0 && trait.layout < layouts.length);
  function assign(specimen, draw = random) {
    if (specimen.type !== 'wirefern') return null;
    if (Object.hasOwn(specimen, 'wirefernSpores')) {
      if (!valid(specimen.wirefernSpores)) throw Error('Invalid wirefern spore fixture');
      return specimen.wirefernSpores;
    }
    // One sample selects the gate and nine equally likely color/layout pairs.
    const roll = draw(), variant = Math.floor(roll / chance * 9);
    const trait = roll >= 0 && roll < chance ? Object.freeze({ color: variant % 3, layout: Math.floor(variant / 3) }) : null;
    Object.defineProperty(specimen, 'wirefernSpores', { value: trait }); return trait;
  }
  function sites(layout) {
    return layouts[layout].flatMap(([frond, side]) => {
      const y = 51 - frond * 5, reach = 11 - frond * .7;
      // The actual diagonal (32,y+2) -> (32+side*reach,y-2), transformed by
      // the live base bake's 64px frame, (.5,.9) anchor and .5*1.16 scale.
      return [.26, .59, .92].map(t => ({ frond, side, t,
        x: side * reach * t * .58, y: (y + 2 - 4 * t - 57.6) * .58 }));
    });
  }
  function tile(P, layout) {
    const g = new P.Graphics();
    for (const { x, y } of sites(layout)) {
      g.circle(x, y, 1).fill(0x273b32); // Broader dark rims separate sori from cyan foliage.
      g.circle(x, y, .73).fill(0xffffff);
    }
    return g;
  }
  function active(p) {
    return p?.type === 'wirefern' && !p.mutation && p.wirefernSpores
      && (p.stage === 'mature' || p.stage === 'fading');
  }
  function style(sprite, specimen) {
    const fading = specimen.stage === 'fading', color = tints[specimen.wirefernSpores.color];
    sprite.scale.set(fading ? .66 : 1); sprite.alpha = fading ? .55 : 1;
    sprite.tint = fading ? [16, 8, 0].reduce((result, shift) => result |
      Math.round((color >> shift & 255) * .65 + (0xa99f87 >> shift & 255) * .35) << shift, 0) : color;
    // The base bakes at y=29; the live parent anchor is .9*32=28.8.
    // Keep this .2px offset constant while shrinking about the true bake origin.
    sprite.position.set(0, .2);
  }
  function fixtureEntries(at, mode = 'stages') {
    const dense = mode === 'dense' || mode === 'replacement';
    const count = dense ? 640 : mode === 'mixed' ? 100 : mode === 'combinations' ? 180 : 45;
    return Array.from({ length: count }, (_, i) => {
      const column = dense ? i % 32 : mode === 'mixed' ? 6 + i % 20 : mode === 'combinations' ? 2 + i % 30 : 4 + i % 9 * 3;
      const row = dense ? Math.floor(i / 32) : mode === 'mixed' ? 7 + Math.floor(i / 20) : mode === 'combinations' ? 3 + Math.floor(i / 30) * 2 : 3 + Math.floor(i / 9) * 3;
      const type = mode === 'mixed' && i % 4 === 0 ? ['broadleaf', 'vine', 'flower'][Math.floor(i / 4) % 3] : 'wirefern';
      const age = mode === 'expiry' ? 359000 : mode === 'stages' ? [51000, 1000, 30000, 51000, 310000][Math.floor(i / 9)] : 51000;
      return { type, column, row, vigor: mode === 'replacement' ? (i === 303 ? 0 : 3) : Math.floor(i / 9) % 4,
        colorVariant: mode === 'combinations' ? Math.floor(i / 36) : i % 5, createdAt: at - age,
        wirefernSpores: type !== 'wirefern' || mode === 'stages' && i < 9 || mode === 'mixed' && i % 3 === 0 ? null
          : Object.freeze({ color: i % 3, layout: Math.floor(i / 3) % 3 }),
        origin: { kind: 'simulated', eventType: 'wirefern-spore-fixture' } };
    });
  }
  const emissionConfig = Object.freeze({ everyMs: 30000, chance: .75, lifetimeMs: 3000,
    reducedLifetimeMs: 1000, maxActive: 2, maxTickGapMs: 1500 });
  function createEmissionRandom() {
    const entropy = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(entropy);
    else entropy[0] = (Date.now() ^ Math.floor((globalThis.performance?.now?.() ?? 0) * 1000) ^ 0x41b0c10d) >>> 0;
    let seed = entropy[0];
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  const emissionRandom = createEmissionRandom();
  function eligible(p, at) {
    return Boolean(p?.type === 'wirefern' && p.wirefernSpores && valid(p.wirefernSpores)
      && core.lifecycleStage(p, at) === 'mature');
  }
  function createEmissionModel({ now = Date.now, random = emissionRandom, getSpecimens = () => [], hasSource,
    getReducedMotion = () => false, onChange = () => {} } = {}) {
    const clouds = [], counts = { checks: 0, rolls: 0, emitted: 0, capSkips: 0, removed: 0 };
    let nextAt = now() + emissionConfig.everyMs, lastAt = now(), hidden = false, disposed = false, nextId = 0;
    const present = source => hasSource ? hasSource(source) : getSpecimens().includes(source);
    function remove(cloud, reason) {
      const i = clouds.indexOf(cloud); if (i < 0) return;
      clouds.splice(i, 1); counts.removed++; onChange({ kind: 'removed', cloud, reason });
    }
    function clear(reason = 'cleared') { while (clouds.length) remove(clouds[clouds.length - 1], reason); }
    function resetCadence(at = now()) { nextAt = at + emissionConfig.everyMs; lastAt = at; }
    function prune(at) {
      for (let i = clouds.length - 1; i >= 0; i--) {
        const cloud = clouds[i], p = cloud.source;
        if (at >= cloud.expiresAt || !present(p) || !eligible(p, at)
          || p.id !== cloud.sourceId || p.cell !== cloud.sourceCell || p.createdAt !== cloud.sourceCreatedAt) remove(cloud, 'expired-or-source');
      }
    }
    function emit(source, at) {
      if (disposed || hidden || !present(source) || !eligible(source, at)) return null;
      prune(at);
      if (clouds.length >= emissionConfig.maxActive) { counts.capSkips++; return null; }
      const reduced = Boolean(getReducedMotion()), id = ++nextId;
      const cloud = { id, source, sourceId: source.id, sourceCell: source.cell, sourceCreatedAt: source.createdAt,
        color: source.wirefernSpores.color, direction: id % 2 ? 1 : -1, reduced, createdAt: at,
        expiresAt: at + (reduced ? emissionConfig.reducedLifetimeMs : emissionConfig.lifetimeMs) };
      clouds.push(cloud); counts.emitted++; onChange({ kind: 'added', cloud }); return cloud;
    }
    function tick(at = now()) {
      if (disposed) return;
      if (hidden) { resetCadence(at); return; }
      if (at < lastAt || at - lastAt > emissionConfig.maxTickGapMs) { clear('logical-gap'); resetCadence(at); return; }
      lastAt = at; prune(at);
      if (at < nextAt) return;
      nextAt = at + emissionConfig.everyMs; counts.checks++;
      // The only full eligibility scan. Active-cloud validation above touches at most two sources.
      const pool = getSpecimens().filter(p => eligible(p, at) && (!hasSource || hasSource(p)));
      if (!pool.length) return;
      const roll = random(); counts.rolls++;
      if (!Number.isFinite(roll) || roll < 0 || roll >= emissionConfig.chance) return;
      const index = Math.floor(random() * pool.length);
      if (index >= 0 && index < pool.length) emit(pool[index], at);
    }
    return { clouds, counts, tick, clear, resetCadence,
      removed(source) { for (let i = clouds.length - 1; i >= 0; i--) if (clouds[i].source === source) remove(clouds[i], 'source-removed'); },
      setHidden(value, at = now()) { hidden = value; clear('visibility'); resetCadence(at); },
      motionChanged(at = now()) { clear('motion'); resetCadence(at); },
      preview(source, at = now()) { return source?.origin?.kind === 'simulated' ? emit(source, at) : null; },
      snapshot() { return { ...counts, active: clouds.length, nextAt, hidden }; },
      destroy() { if (disposed) return; disposed = true; clear('destroyed'); }
    };
  }
  const cloudPoints = Object.freeze([[-8,2,1.15],[-5,-4,1.05],[-2,3,1.25],[0,-7,1.05],[3,-1,1.25],[5,5,1],[7,-5,1.1],[9,1,1.05]].map(Object.freeze));
  function cloudTile(P) {
    const g = new P.Graphics();
    for (const [x, y, r] of cloudPoints) {
      g.circle(x, y - 12, r + .8).fill({ color: 0xffffff, alpha: .18 });
      g.circle(x, y - 12, r).fill({ color: 0xffffff, alpha: .95 });
    }
    return g;
  }
  const cloudTints = Object.freeze([0xf1c59b, 0xf4e0aa, 0xd1f3e8]);
  function cloudPose(cloud, at) {
    const t = Math.max(0, Math.min(1, (at - cloud.createdAt) / (cloud.expiresAt - cloud.createdAt)));
    return cloud.reduced ? { x: 0, y: 0, scaleX: .85, scaleY: .85, alpha: .8 * (1 - t) }
      : { x: cloud.direction * (4 * t + 2 * t * t), y: -18 * t,
        scaleX: .85 + .35 * t, scaleY: .75 + .35 * t, alpha: .95 * (1 - t * t) };
  }
  function upperFrond(vigor) { return { x: 0, y: (51 - (3 + vigor) * 5 - 2 - 57.6) * .58 + .2 }; }
  const api = { chance, colors, tints, layouts, random, createRandom, assign, sites, tile, active, style, fixtureEntries,
    emissionConfig, createEmissionRandom, eligible, createEmissionModel, cloudPoints, cloudTile, cloudTints, cloudPose, upperFrond };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.PacketGardenWirefernSpores = api;
})();
