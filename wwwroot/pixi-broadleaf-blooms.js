// Pixi-only cosmetic decisions/artwork. Never consume the garden's random stream.
(function () {
  'use strict';
  const chance = .20;
  const colors = Object.freeze(['Pink', 'Yellow', 'White', 'Purple', 'Blue']);
  const petals = [0xe4a2b7, 0xe6cf7c, 0xf0ecda, 0xb5a0d5, 0x92bed9];
  const arrangements = Object.freeze([
    [[-3, -18, 1]],
    [[-6, -13, .95], [6, -20, 1]],
    [[-7, -18, .92], [6, -12, 1], [1, -23, .85]]
  ].map(layout => Object.freeze(layout.map(point => Object.freeze(point)))));
  function createRandom() {
    const entropy = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(entropy);
    else entropy[0] = (Date.now() ^ Math.floor((globalThis.performance?.now?.() ?? 0) * 1000) ^ 0x6b10f3a5) >>> 0;
    let seed = entropy[0];
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  const random = createRandom();
  const valid = trait => trait === null || (Number.isInteger(trait?.color) && trait.color >= 0 && trait.color < colors.length
    && Number.isInteger(trait.arrangement) && trait.arrangement >= 0 && trait.arrangement < arrangements.length);
  function assign(specimen, draw = random) {
    if (specimen.type !== 'broadleaf') return null;
    if (Object.hasOwn(specimen, 'broadleafBloom')) {
      if (!valid(specimen.broadleafBloom)) throw new Error('Invalid broadleaf bloom fixture');
      return specimen.broadleafBloom;
    }
    // One uniform draw handles the 20% gate AND 15 equally likely color/layout
    // pairs within the successful interval. Neither foliage nor vigor enters it.
    const roll = draw(), variant = Math.floor(roll / chance * colors.length * arrangements.length);
    const trait = roll >= 0 && roll < chance
      ? Object.freeze({ color: variant % colors.length, arrangement: Math.floor(variant / colors.length) }) : null;
    Object.defineProperty(specimen, 'broadleafBloom', { value: trait });
    return trait;
  }
  function tile(P, color, arrangement) {
    const g = new P.Graphics();
    for (const [x, y, scale] of arrangements[arrangement]) {
      g.moveTo(x + .3, y + 3.5).lineTo(x, y).stroke({color:0x607c4b, width:.7});
      // Five rounded petals, a soft shadow rim and a tiny contrasting gold eye.
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 2 / 5 - Math.PI / 2;
        const cx = x + Math.cos(angle) * 1.8 * scale, cy = y + Math.sin(angle) * 1.8 * scale;
        g.circle(cx, cy + .25, 1.65 * scale).fill({color:0x4e6142, alpha:.35});
        g.circle(cx, cy, 1.45 * scale).fill(petals[color]);
        g.circle(cx - .3, cy - .4, .55 * scale).fill({color:0xfff9e5, alpha:.35});
      }
      g.circle(x, y, 1.25 * scale).fill(0x84613e);
      g.circle(x, y - .2, .85 * scale).fill(color === 1 ? 0xf7f0d2 : 0xe4ca73);
    }
    return g;
  }
  function fixtureEntries(at, dense = false) {
    return Array.from({length:dense ? 640 : 25}, (_, i) => {
      const group = Math.floor(i / 5), color = i % 5;
      const age = dense ? 65000 : [65000, 10000, 40000, 65000, 320000][group];
      return {type:'broadleaf', column:dense ? i % 32 : 5 + color * 5, row:dense ? Math.floor(i / 32) : 3 + group * 3,
        vigor:i % 4, colorVariant:group % 5, createdAt:at-age,
        broadleafBloom:group === 0 && !dense ? null : Object.freeze({color, arrangement:(i + group) % 3}),
        origin:{kind:'simulated', eventType:'broadleaf-bloom-fixture'}};
    });
  }
  const api = {chance, colors, arrangements, random, createRandom, assign, tile, fixtureEntries};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.PacketGardenBroadleafBlooms = api;
})();
