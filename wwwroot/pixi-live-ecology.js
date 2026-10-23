// Pixi-only ecology presentation: finite textures, persistent views and local dev fixtures.
(function () {
  'use strict';
  const ecologyCore = typeof module !== 'undefined' && module.exports ? require('./garden-ecology.js') : window.PacketGardenEcology;
  const grassArt = typeof module !== 'undefined' && module.exports ? require('./garden-grass.js') : window.PacketGardenGrassArt;
  const puddleArt = typeof module !== 'undefined' && module.exports ? require('./garden-puddle-art.js') : window.PacketGardenPuddleArt;
  const grassKey = cell => cell.row * 32 + cell.column;
  const grassVariants = grassArt.variants.length;
  const grassVariant = grassArt.variantFor;
  // Presentation only. Retain the shared age palette, gently bringing it toward
  // its luminance before dimming it; never change coverage or lifecycle alpha.
  function grassTint(color) {
    const luminance = color[0] * .2126 + color[1] * .7152 + color[2] * .0722;
    const rgb = color.map(channel => Math.round((channel * .82 + luminance * .18) * .91));
    return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
  }
  function shelterShade(color, blade) {
    const p = blade.path, x = (p[0] + p[4] + p[8]) / 3, y = (p[1] + p[5] + p[9]) / 3;
    // A soft, slightly irregular oval across the leaves, with unchanged outer
    // blades. Shading whole existing leaves preserves their ink and soil gaps.
    const distance = Math.hypot((x - 32) / 21, (y - 34) / 23);
    const t = Math.max(0, 1 - distance), weight = t * t * (3 - 2 * t);
    const rgb = [color >> 16 & 255, color >> 8 & 255, color & 255];
    const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    const shaded = rgb.map(channel => Math.round((channel * (1 - .2 * weight) + luminance * .2 * weight) * (1 - .30 * weight)));
    return (shaded[0] << 16) | (shaded[1] << 8) | shaded[2];
  }
  function makeEcologyAtlas(P, renderer) {
    const sheet = new P.Container(), keys = [], grassPatches = [];
    function tile(key, patch) {
      const index = keys.length;
      patch.position.set(index % 16 * 64, Math.floor(index / 16) * 64);
      sheet.addChild(patch); grassPatches.push(patch); keys.push(key);
    }
    function grassPatch(variant, sheltered) {
      const patch = new P.Graphics();
      for (let shade = 0; shade < grassArt.shades.length; shade++) {
        for (const blade of grassArt.variants[variant]) {
          if (blade.shade !== shade) continue;
          const p = blade.path;
          patch.moveTo(p[0], p[1]).quadraticCurveTo(p[2], p[3], p[4], p[5])
            .quadraticCurveTo(p[6], p[7], p[8], p[9]).lineTo(p[0], p[1]);
          if (sheltered) patch.fill({ color: shelterShade(grassArt.shades[shade], blade), alpha: grassArt.baseOpacity ?? .6 });
        }
        if (!sheltered) patch.fill({ color: grassArt.shades[shade], alpha: grassArt.baseOpacity ?? .6 });
      }
      return patch;
    }
    for (let variant = 0; variant < grassVariants; variant++) tile(`grass:${variant}`, grassPatch(variant, false));
    // Same finite contours, colors and flattened alpha as the Canvas tiles.
    for (let variant=0;variant<puddleArt.variants.length;variant++) {
      const water = new P.Graphics();
      for (const layer of puddleArt.variants[variant]) {
        for (const [method,...args] of layer.path) water[method](...args);
        const start=layer.path[0];water.lineTo(start[1],start[2]);
        water.fill({color:layer.color,alpha:layer.alpha});
      }
      tile(`puddle:${variant}`, water);
    }
    for (let variant = 0; variant < grassVariants; variant++) tile(`grass-sheltered:${variant}`, grassPatch(variant, true));
    // Restrained contact footprint, feathered with cached translucent contours.
    // No filter, shader, extra source or recurring geometry is required.
    const shadow = new P.Graphics();
    for (let ring = 8; ring >= 1; ring--) shadow.ellipse(32, 32, 2 + ring * .85, .6 + ring * .25)
      .fill({ color: 0x17271d, alpha: .025 });
    tile('plant-contact', shadow);
    const atlas = renderer.generateTexture({ target: sheet, frame: new P.Rectangle(0, 0, 1024, Math.ceil(keys.length / 16) * 64), resolution: 2 });
    // Release owned construction contexts explicitly; shared atlas frames survive.
    for (const patch of grassPatches) patch.destroy();
    sheet.destroy({ children: true });
    const frames = new Map(keys.map((key, i) => {
      const x = i % 16 * 64, y = Math.floor(i / 16) * 64;
      // Trim the contact quad to its tiny footprint instead of submitting 64px
      // of transparent padding for every overlapping plant.
      const frame = key === 'plant-contact' ? new P.Rectangle(x + 21, y + 28, 22, 8) : new P.Rectangle(x, y, 64, 64);
      return [key, new P.Texture({ source: atlas.source, frame })];
    }));
    return { frames, atlas, destroy() { for (const frame of frames.values()) frame.destroy(false); atlas.destroy(true); } };
  }
  function createEcologyView(P, grassLayer, puddleLayer, frames, { getSpecimen = () => null, getPlantSprite = () => null, shadowLayer = null } = {}) {
    const grassViews = new Map(), puddleViews = new Map(), shadowViews = new Map();
    let nextGrassScanAt = Infinity;
    const counters = { grassAdded: 0, grassRemoved: 0, grassRefreshed: 0, grassVisualUpdates: 0, puddleAdded: 0, puddleRemoved: 0, puddleRefreshed: 0 };
    function removeShadow(record) {
      if (record.shadow) { record.shadow.destroy(); shadowViews.delete(record.specimen.id); record.shadow = null; }
    }
    function updateOccupancy(record) {
      const specimen = getSpecimen(record.cell.column, record.cell.row), parent = specimen && getPlantSprite(specimen);
      if (record.specimen !== specimen) { removeShadow(record); record.specimen = specimen; }
      record.sprite.texture = frames.get(`${specimen ? 'grass-sheltered' : 'grass'}:${grassVariant(record.cell)}`);
      if (!parent || !shadowLayer) { removeShadow(record); return; }
      if (!record.shadow) {
        const sprite = new P.Sprite(frames.get('plant-contact')); sprite.anchor.set(.5); sprite.eventMode = 'none';
        // Before vine Graphics, after grass/water, and always before plants.
        shadowLayer.addChildAt(sprite, 0); record.shadow = sprite; shadowViews.set(specimen.id, sprite);
      }
      const stageScale = specimen.mutation ? 1 : specimen.stage === 'sprout' ? .42 : specimen.stage === 'growing' ? .72 : specimen.stage === 'fading' ? .66 : 1;
      record.shadow.position.set(parent.position.x, parent.position.y);
      record.shadow.scale.set(Math.abs(parent.scale.x) * stageScale, Math.abs(parent.scale.y) * stageScale);
      record.shadow.alpha = record.sprite.alpha * (specimen.stage === 'fading' ? .65 : 1);
    }
    function updateGrass(cell, record, at) {
      const state = ecologyCore.grassVisualState(cell, at), sprite = record.sprite;
      sprite.scale.set(state.growth * (1 - state.decline * .65));
      sprite.tint = grassTint(state.color);
      sprite.alpha = state.opacity / .6; // shared lifecycle ratio over baked groundcover opacity
      updateOccupancy(record);
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
        const record = grassViews.get(grassKey(item)); record.cell = item;
        updateGrass(item, record, at); counters.grassRefreshed++;
      } else if (kind === 'grass-removed') {
        const record = grassViews.get(grassKey(item)); removeShadow(record);
        record.sprite.destroy(); grassViews.delete(grassKey(item)); counters.grassRemoved++;
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
    return { grassViews, puddleViews, shadowViews, counters, change,
      specimenChanged(specimen) { const record = grassViews.get(grassKey(specimen)); if (record) updateOccupancy(record); },
      tick(at) {
        if (at < nextGrassScanAt) return;
        nextGrassScanAt = Infinity;
        for (const record of grassViews.values()) {
          if (at >= record.nextAt) updateGrass(record.cell, record, at);
          nextGrassScanAt = Math.min(nextGrassScanAt, record.nextAt);
        }
      },
      animate(at) { for (const [puddle, sprite] of puddleViews) updatePuddle(puddle, sprite, at); },
      snapshot() { return { grassViews: grassViews.size, shadowViews: shadowViews.size, puddleViews: puddleViews.size, grassTextures: grassVariants * 2, shadowTextures: 1, puddleTextures: puddleArt.variants.length, ecologyCounters: { ...counters } }; },
      destroy() { for (const record of grassViews.values()) { removeShadow(record); record.sprite.destroy(); } for (const sprite of puddleViews.values()) sprite.destroy(); grassViews.clear(); puddleViews.clear(); }
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
  const api = { makeEcologyAtlas, createEcologyView, seedDenseEcology, grassTint };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenPixiEcology = api;
})();
