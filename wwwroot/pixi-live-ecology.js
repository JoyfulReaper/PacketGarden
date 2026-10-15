// Pixi-only ecology presentation: finite textures, persistent views and local dev fixtures.
(function () {
  'use strict';
  const ecologyCore = typeof module !== 'undefined' && module.exports ? require('./garden-ecology.js') : window.PacketGardenEcology;
  const grassKey = cell => cell.row * 32 + cell.column;
  const grassVariants = 12;
  function makeEcologyAtlas(P, renderer) {
    const sheet = new P.Container(), keys = [];
    for (let variant = 0; variant < grassVariants; variant++) {
      const patch = new P.Container(), seed = variant * 37;
      for (let blob = 0; blob < 9; blob++) {
        const angle = (seed % 17) * .37 + blob * 2.4, rx = 10 + (seed + blob * 3) % 3;
        const shape = new P.Graphics().ellipse(0, 0, rx, rx * (.78 + ((seed + blob) % 3) * .06)).fill({ color: 0xffffff, alpha: .6 });
        shape.position.set(32 + (blob % 3 - 1) * 8 + Math.cos(angle) * 1.5,
          32 + (Math.floor(blob / 3) - 1) * 8 + Math.sin(angle) * 1.5);
        shape.rotation = angle + .4; patch.addChild(shape);
      }
      const blades = new P.Graphics();
      for (let blade = 0; blade < 7; blade++) {
        const x = 32 + (seed + blade * 7) % 21 - 10, y = 32 + (seed + blade * 11) % 21 - 10;
        const lean = (variant + blade) % 3 - 1, height = 3 + (variant * 3 + blade * 2) % 4;
        blades.moveTo(x, y).quadraticCurveTo(x + lean, y - height / 2, x + lean * 2, y - height);
      }
      blades.stroke({ color: 0xffffff, alpha: .45, width: 1 }); patch.addChild(blades);
      patch.position.set(variant * 64, 0); sheet.addChild(patch); keys.push(`grass:${variant}`);
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
        const key = grassKey(item), sprite = new P.Sprite(frames.get(`grass:${(item.column * 37 + item.row * 61) % grassVariants}`));
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
