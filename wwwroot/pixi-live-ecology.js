// Pixi-only ecology presentation: finite textures, persistent views and local dev fixtures.
(function () {
  'use strict';
  const ecologyCore = typeof module !== 'undefined' && module.exports ? require('./garden-ecology.js') : window.PacketGardenEcology;
  const grassArt = typeof module !== 'undefined' && module.exports ? require('./garden-grass.js') : window.PacketGardenGrassArt;
  const puddleArt = typeof module !== 'undefined' && module.exports ? require('./garden-puddle-art.js') : window.PacketGardenPuddleArt;
  const grassKey = cell => cell.row * 32 + cell.column;
  const grassVariants = grassArt.variants.length;
  const grassVariant = grassArt.variantFor;
  function makeEcologyAtlas(P, renderer) {
    const sheet = new P.Container(), keys = [], grassPatches = [];
    for (let variant = 0; variant < grassVariants; variant++) {
      const patch = new P.Graphics();
      for (let shade = 0; shade < grassArt.shades.length; shade++) {
        for (const blade of grassArt.variants[variant]) {
          if (blade.shade !== shade) continue;
          const p = blade.path;
          patch.moveTo(p[0], p[1]).quadraticCurveTo(p[2], p[3], p[4], p[5])
            .quadraticCurveTo(p[6], p[7], p[8], p[9]).lineTo(p[0], p[1]);
        }
        patch.fill({ color: grassArt.shades[shade], alpha: grassArt.baseOpacity ?? .6 });
      }
      patch.position.set(variant * 64, 0); sheet.addChild(patch); grassPatches.push(patch); keys.push(`grass:${variant}`);
    }
    // Same finite contours, colors and flattened alpha as the Canvas tiles.
    for (let variant=0;variant<puddleArt.variants.length;variant++) {
      const water = new P.Graphics();
      for (const layer of puddleArt.variants[variant]) {
        for (const [method,...args] of layer.path) water[method](...args);
        const start=layer.path[0];water.lineTo(start[1],start[2]);
        water.fill({color:layer.color,alpha:layer.alpha});
      }
      water.position.set((grassVariants+variant)*64,0);sheet.addChild(water);grassPatches.push(water);keys.push(`puddle:${variant}`);
    }
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
      sprite.alpha = state.opacity / .6; // shared lifecycle ratio over baked groundcover opacity
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
        const sprite = new P.Sprite(frames.get(`puddle:${puddleArt.variantFor(item)}`)); sprite.anchor.set(.5); sprite.position.set(item.x, item.y);
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
      sprite.scale.set(state.size / puddleArt.referenceSize); sprite.alpha = puddleArt.opacityFor(state.opacity);
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
      snapshot() { return { grassViews: grassViews.size, puddleViews: puddleViews.size, grassTextures: grassVariants, puddleTextures: puddleArt.variants.length, ecologyCounters: { ...counters } }; },
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
