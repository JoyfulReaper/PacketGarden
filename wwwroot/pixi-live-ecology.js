// Pixi-only ecology presentation: finite textures, persistent views and local dev fixtures.
(function () {
  'use strict';
  const ecologyCore = typeof module !== 'undefined' && module.exports ? require('./garden-ecology.js') : window.PacketGardenEcology;
  const grassKey = cell => cell.row * 32 + cell.column;
  const grassVariants = 12;
  function grassVariant(cell) {
    const seed = Math.imul(grassKey(cell) ^ 0x45d9f3b, 0x45d9f3b);
    return ((seed ^ seed >>> 16) >>> 0) % grassVariants;
  }
  function makeEcologyAtlas(P, renderer) {
    const sheet = new P.Container(), keys = [], grassPatches = [];
    for (let variant = 0; variant < grassVariants; variant++) {
      const patch = new P.Graphics(), bases = []; let seed = variant + 173;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      // Separated little fans leave transparent soil gaps even at 640 cells.
      // Neutral shades inherit the existing green -> straw -> brown tint.
      for (let tuft = 0; tuft < 2 + variant % 2; tuft++) {
        let x = 18 + random() * 28, y = 24 + random() * 26;
        for (let attempt = 0; attempt < 4 && bases.some(base => Math.hypot(base.x - x, base.y - y) < 8); attempt++) {
          x = 18 + random() * 28; y = 24 + random() * 26;
        }
        bases.push({ x, y });
        patch.moveTo(x - 2, y + .3).quadraticCurveTo(x, y + 1, x + 2, y - .2)
          .stroke({ color: 0x6c795b, alpha: .4, width: 1 });
        const blades = 5 + (variant + tuft) % 3;
        for (let blade = 0; blade < blades; blade++) {
          const bx = x + (random() - .5) * 3, by = y + (random() - .5) * 2;
          const lean = (blade / (blades - 1) - .5) * 10.5 + (random() - .5) * 5;
          const height = 6 + random() * 8, width = .65 + random() * .65;
          const tipX = bx + lean, tipY = by - height;
          patch.moveTo(bx - width * .5, by).quadraticCurveTo(bx + lean * .12 - width, by - height * .58, tipX, tipY)
            .quadraticCurveTo(bx + lean * .45 + width * .4, by - height * .42, bx + width * .5, by)
            .fill({ color: [0xc6d0bd, 0xdce2c9, 0xb0bfa4][blade % 3], alpha: .6 });
          if (blade % 2 === 0) patch.moveTo(tipX, tipY).quadraticCurveTo(bx + lean * .28, by - height * .62, bx + lean * .12, by - height * .3)
            .stroke({ color: 0xffffff, alpha: .5, width: .45 });
        }
      }
      patch.position.set(variant * 64, 0); sheet.addChild(patch); grassPatches.push(patch); keys.push(`grass:${variant}`);
    }
    // A unit-radius 36px pool, matching the three Canvas lobes and stable rotation.
    const water = new P.Graphics();
    for (const [x, y, rx, ry] of [[0, 0, 1, .65], [-.4, .16, .7, .5], [.38, -.18, .72, .48]]) {
      water.ellipse(32 + x * 18, 32 + y * 18, rx * 18, ry * 18);
    }
    water.fill(0x497579).stroke({ color: 0x253f46, alpha: .6, width: .6 });
    // Short highlight arc, baked once using a few points.
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (1.1 + i / 12 * .6), x = 32 - 1.8 + Math.cos(a) * 11.7, y = 32 - 2.34 + Math.sin(a) * 5.94;
      if (i === 0) water.moveTo(x, y); else water.lineTo(x, y);
    }
    water.stroke({ color: 0xb2c9c0, alpha: .5, width: .5 });
    water.position.set(grassVariants * 64, 0); sheet.addChild(water); keys.push('puddle');
    const atlas = renderer.generateTexture({ target: sheet, frame: new P.Rectangle(0, 0, keys.length * 64, 64), resolution: 2 });
    // Release owned construction contexts explicitly; shared atlas frames survive.
    for (const patch of grassPatches) patch.destroy();
    sheet.destroy({ children: true });
    const frames = new Map(keys.map((key, i) => [key, new P.Texture({ source: atlas.source, frame: new P.Rectangle(i * 64, 0, 64, 64) })]));
    return { frames, atlas, destroy() { for (const frame of frames.values()) frame.destroy(false); atlas.destroy(true); } };
  }
  function createEcologyView(P, grassLayer, puddleLayer, frames) {
    const grassViews = new Map(), puddleViews = new Map();
    let nextGrassScanAt = Infinity;
    const counters = { grassAdded: 0, grassRemoved: 0, grassRefreshed: 0, grassVisualUpdates: 0, puddleAdded: 0, puddleRemoved: 0, puddleRefreshed: 0 };
    function updateGrass(cell, record, at) {
      const state = ecologyCore.grassVisualState(cell, at), sprite = record.sprite;
      sprite.scale.set(state.growth * (1 - state.decline * .65));
      sprite.tint = (state.color[0] << 16) | (state.color[1] << 8) | state.color[2];
      sprite.alpha = state.opacity / .6; // patch fill already contains the .6 base opacity
      record.nextAt = ecologyCore.nextGrassVisualChangeAt(cell, at) ?? Infinity;
      nextGrassScanAt = Math.min(nextGrassScanAt, record.nextAt);
      counters.grassVisualUpdates++;
    }
    function change({ kind, item }, at) {
      if (kind === 'grass-added') {
        const key = grassKey(item), sprite = new P.Sprite(frames.get(`grass:${grassVariant(item)}`));
        sprite.anchor.set(.5); sprite.position.set((item.column + .5) * 30, (item.row + .5) * 30);
        grassLayer.addChild(sprite); const record = { sprite, cell: item, nextAt: 0 }; grassViews.set(key, record);
        updateGrass(item, record, at); counters.grassAdded++;
      } else if (kind === 'grass-refreshed') {
        updateGrass(item, grassViews.get(grassKey(item)), at); counters.grassRefreshed++;
      } else if (kind === 'grass-removed') {
        grassViews.get(grassKey(item)).sprite.destroy(); grassViews.delete(grassKey(item)); counters.grassRemoved++;
      } else if (kind === 'puddle-added') {
        const sprite = new P.Sprite(frames.get('puddle')); sprite.anchor.set(.5); sprite.position.set(item.x, item.y);
        sprite.rotation = item.seed * Math.PI * 2; puddleLayer.addChild(sprite); puddleViews.set(item, sprite); counters.puddleAdded++;
        updatePuddle(item, sprite, at);
      } else if (kind === 'puddle-refreshed') {
        updatePuddle(item, puddleViews.get(item), at); counters.puddleRefreshed++;
      } else if (kind === 'puddle-removed') {
        puddleViews.get(item).destroy(); puddleViews.delete(item); counters.puddleRemoved++;
      }
    }
    function updatePuddle(puddle, sprite, at) {
      const state = ecologyCore.puddleVisualState(puddle, at);
      sprite.scale.set(state.size / 18); sprite.alpha = state.opacity;
    }
    return { grassViews, puddleViews, counters, change,
      tick(at) {
        if (at < nextGrassScanAt) return;
        nextGrassScanAt = Infinity;
        for (const record of grassViews.values()) {
          if (at >= record.nextAt) updateGrass(record.cell, record, at);
          nextGrassScanAt = Math.min(nextGrassScanAt, record.nextAt);
        }
      },
      animate(at) { for (const [puddle, sprite] of puddleViews) updatePuddle(puddle, sprite, at); },
      snapshot() { return { grassViews: grassViews.size, puddleViews: puddleViews.size, grassTextures: grassVariants, puddleTextures: 1, ecologyCounters: { ...counters } }; },
      destroy() { for (const { sprite } of grassViews.values()) sprite.destroy(); for (const sprite of puddleViews.values()) sprite.destroy(); grassViews.clear(); puddleViews.clear(); }
    };
  }
  // Local simulated fixture import; never called by the stream or production Canvas.
  function seedDenseEcology(model, at, includePuddles = true) {
    const grassCells = Array.from({ length: 640 }, (_, i) => ({ column: i % 32, row: Math.floor(i / 32),
      createdAt: at - (i % 16 === 0 ? i % 30000 : 60000),
      lastInfluencedAt: at - (i % 11 === 0 ? ecologyCore.grassConfig.fadingAfterMs + i * 1000 : 0) }));
    const puddles = Array.from({ length: includePuddles ? 8 : 0 }, (_, i) => ({ x: 150 + i % 4 * 210, y: 180 + Math.floor(i / 4) * 240,
      seed: i / 8, size: 10, maxSize: 18, createdAt: at, lastRefreshedAt: at }));
    model.seed({ grassCells, puddles });
  }
  const api = { makeEcologyAtlas, createEcologyView, seedDenseEcology };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenPixiEcology = api;
})();
