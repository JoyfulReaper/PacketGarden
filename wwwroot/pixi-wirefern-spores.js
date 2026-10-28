// Pixi-only, source-owned sori. No garden, ecology or drop rules.
(function () {
  'use strict';
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
      return [.40, .64, .88].map(t => ({ frond, side, t,
        x: side * reach * t * .58, y: (y + 2 - 4 * t - 57.6) * .58 }));
    });
  }
  function tile(P, layout) {
    const g = new P.Graphics();
    for (const { x, y } of sites(layout)) {
      g.circle(x, y, .77).fill(0x34443c); // Dark rims preserve contrast on cyan foliage.
      g.circle(x, y, .53).fill(0xffffff);
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
  const api = { chance, colors, tints, layouts, random, createRandom, assign, sites, tile, active, style, fixtureEntries };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.PacketGardenWirefernSpores = api;
})();
