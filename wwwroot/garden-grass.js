// Finite, renderer-neutral grass artwork. Recipes are built once, never on a frame.
(function () {
  'use strict';
  const shades = [0x829b6c, 0xb3ce91, 0xd6e4ae, 0xa1bd7d];
  const variants = Array.from({ length: 12 }, (_, variant) => {
    let seed = variant + 173;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const blades = [];
    // Low, spreading groundcover merges with two or three taller overlapping fans.
    for (let tuft = 0; tuft < 5 + variant % 2; tuft++) {
      const low = tuft < 3;
      const x = low ? 16 + random() * 32 : 18 + (tuft - 3) * 13 + (random() - .5) * 6;
      const y = low ? 39 + random() * 12 : 25 + random() * 20;
      const count = low ? 4 : 6 + (variant + tuft) % 3;
      for (let blade = 0; blade < count; blade++) {
        const bx = x + (random() - .5) * 5, by = y + (random() - .5) * 3;
        const lean = (blade / (count - 1) - .5) * (low ? 15 : 17) + (random() - .5) * 4;
        const height = low ? 4 + random() * 5 : 9 + random() * 7;
        const width = (low ? 2.5 : 1.8) + random() * 1.8;
        blades.push({ shade: (blade + tuft + variant) % shades.length,
          path: [bx - width * .5, by, bx + lean * .1 - width, by - height * .62,
            bx + lean, by - height, bx + lean * .52 + width * .65, by - height * .36, bx + width * .5, by] });
      }
    }
    return blades;
  });
  function variantFor(cell) {
    const seed = Math.imul((cell.row * 32 + cell.column) ^ 0x45d9f3b, 0x45d9f3b);
    return ((seed ^ seed >>> 16) >>> 0) % variants.length;
  }
  const api = { shades, variants, variantFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window === 'undefined' ? globalThis : window).PacketGardenGrassArt = api;
})();
