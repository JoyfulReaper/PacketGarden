(function () {
  'use strict';
  // Presentation seeds never consume the model's random stream. Five restrained
  // colors retain the model's variant identity without its luminous wire palette.
  const vineColors = [0x7eaa91, 0x9ba96d, 0xb0b17b, 0x829069, 0xb7c5aa];
  function vineNoise(seed) {
    let n = Math.imul(seed ^ 0x45d9f3b, 0x45d9f3b); n = Math.imul(n ^ n >>> 16, 0x45d9f3b);
    return ((n ^ n >>> 16) >>> 0) / 4294967296;
  }
  function vineOffset(specimen) {
    const seed = specimen.row * 32 + specimen.column;
    return { x: (vineNoise(seed + 11) - .5) * 8, y: (vineNoise(seed + 47) - .5) * 7 };
  }
  function vineTile(P, vigor, variant, stage) {
    const g = new P.Graphics(), color = vineColors[variant], seed = vigor * 19 + variant * 71;
    const lean = (vineNoise(seed) - .5) * 9, top = -20 - vigor * 1.5;
    g.moveTo(0, -1).bezierCurveTo(-9, -9, 9 + lean, -13, lean, top)
      .stroke({ color: 0x657851, width: 1.7 });
    g.moveTo(0, -1).bezierCurveTo(-9, -9, 9 + lean, -13, lean, top)
      .stroke({ color, width: .9 });
    // One lateral branch and one open curl, baked once into the existing tile.
    const side = variant % 2 ? -1 : 1;
    g.moveTo(-1, -9).bezierCurveTo(side * 6, -8, side * 15, -18, side * 10, -20)
      .bezierCurveTo(side * 6, -23, side * 4, -17, side * 8, -17)
      .stroke({ color, width: .8, alpha: .8 });
    for (let i = 0; i < 4 + vigor; i++) {
      const y = -5 - i * 2.6, x = Math.sin(i * 1.7 + variant) * 3 + lean * i / 10;
      const direction = i % 2 ? -1 : 1, length = 3.2 + vineNoise(seed + i + 3) * 2.4;
      const tipX = x + direction * length, tipY = y - 3;
      g.moveTo(x, y).quadraticCurveTo(x + direction * 1.5, y - 4, tipX, tipY)
        .quadraticCurveTo(x + direction * length, y + 1, x, y).fill({ color, alpha: i % 3 ? .9 : .65 });
    }
    g.scale.set(stage === 'sprout' ? .42 : stage === 'growing' ? .72 : stage === 'fading' ? .66 : 1);
    g.alpha = stage === 'fading' ? .55 : 1;
    return g;
  }
  // Artwork is rooted at (0,0), with a one-pixel inset inside the existing 32px
  // tile at (16,29). These paths are rasterized once, never in the live ticker.
  function foliageTile(P, type, vigor, variant, stage) {
    const g = new P.Graphics(), lean = (variant - 2) * .35;
    const shade = (color, amount) => [16, 8, 0].reduce((result, shift) => result | Math.min(255, Math.round((color >> shift & 255) * amount)) << shift, 0);
    const leaf = (x, y, length, width, angle, color) => {
      const point = (along, across) => [x + Math.cos(angle) * along - Math.sin(angle) * across, y + Math.sin(angle) * along + Math.cos(angle) * across];
      g.moveTo(x, y).bezierCurveTo(...point(length * .2, -width), ...point(length * .75, -width * .8), ...point(length, 0))
        .bezierCurveTo(...point(length * .7, width * .65), ...point(length * .25, width), x, y).fill(color);
      g.moveTo(x, y).lineTo(...point(length * .75, 0)).stroke({ color: shade(color, 1.28), width: .4, alpha: .45 });
    };
    if (type === 'broadleaf') {
      const color = [0x729357, 0x608c68, 0x829b59, 0x568476, 0x8fada0][variant];
      g.ellipse(0, -1, 8, 1.4).fill({ color: 0x28351f, alpha: .16 });
      g.moveTo(0, 0).bezierCurveTo(-2, -7, 3, -16, lean, -24).stroke({ color: 0x657847, width: 1.3 });
      const leaves = [[-.5,-7,13,4.5,-2.78], [.5,-8,13,4.6,-.35], [-.5,-13,12.5,4.2,-2.35],
        [1,-14,12,4,-.85], [lean,-18,8.2,3.5,-1.65], [-1,-6,9,3.8,-2], [.8,-7,9,3.5,-.9], [0,-11,10,3.5,-1.7]];
      for (let i = 0; i < 5 + vigor; i++) {
        const [x, y, length, width, angle] = leaves[i];
        g.moveTo(0, y + 3).lineTo(x, y).stroke({ color: 0x6d8050, width: .7 });
        leaf(x, y, length - (variant % 2) * .5, width, angle + lean * .08, shade(color, [.79, .95, .86, 1.08][i % 4]));
      }
    } else if (type === 'blackthorn') {
      const color = [0x4d3459, 0x5e354a, 0x3e465a, 0x3f5149, 0x67506c][variant];
      // A bare, crooked woody crown and unequal forks distinguish it from vines.
      const wood = () => g.moveTo(-3, 0).bezierCurveTo(7, -8, -7, -18, 3 + lean, -26)
        .moveTo(-1, -12).bezierCurveTo(-9, -14, -4, -20, -12, -22)
        .moveTo(1, -9).bezierCurveTo(9, -12, 7, -19, 11, -20);
      wood().stroke({ color: 0x281f2d, width: 2.5 });
      wood().stroke({ color: 0x886d85, width: .65, alpha: .7 });
      const thorns = [[-1,-4,1], [-1,-11,-1], [0,-18,1], [2,-24,-1], [-8,-17,-1], [8,-14,1], [-5,-14,-1], [7,-17,1]];
      for (let i = 0; i < 5 + vigor; i++) {
        const [x, y, side] = thorns[i];
        g.poly([x - .7, y + 1, x + side * 3.6, y - 3, x + .7, y - .5]).fill(0xa28a9b);
      }
      for (let i = 0; i < 2 + vigor; i++) {
        const side = i % 2 ? 1 : -1, x = side * (4 + i % 3), y = -10 - i * 3;
        leaf(x, y, 4.2 + i % 2, 1.8, side < 0 ? -2.6 : -.6, shade(color, i % 2 ? 1.12 : .88));
      }
    } else if (type === 'weed') {
      const color = [0x678a46, 0x75974e, 0x577b43, 0x5e8b6c, 0x91a965][variant];
      g.moveTo(0, 0).bezierCurveTo(-1, -7, 2, -14, lean, -23).stroke({ color: 0x71814b, width: 1.2 });
      const fans = [[lean,-18,8.8,-Math.PI / 2], [-4.8,-11,8.1,-1.9], [4.4,-9,7.8,-1.1], [1,-4,6.8,-1.6]];
      for (let fan = 0; fan < 3 + (vigor > 1 ? 1 : 0); fan++) {
        const [x, y, length, tilt] = fans[fan], fingers = vigor < 2 ? 5 : 7, middle = (fingers - 1) / 2;
        g.moveTo(0, y + 3).quadraticCurveTo(x * .4, y + 2, x, y).stroke({ color: 0x6b844b, width: .7 });
        for (let i = 0; i < fingers; i++) {
          const angle = tilt + (i - middle) * (2.3 / (fingers - 1)) + lean * .06;
          const size = length * (1 - Math.abs(i - middle) * .08), width = size * .17, points = [x, y];
          // Shallow teeth survive the 2x bake without adding a forest of outlines.
          const edge = [[.12,.25],[.22,.85],[.30,.55],[.40,1],[.48,.65],[.60,.9],[.68,.5],[.80,.5],[.87,.2]];
          const point = (along, across) => points.push(x + Math.cos(angle) * along - Math.sin(angle) * across, y + Math.sin(angle) * along + Math.cos(angle) * across);
          for (const [along, across] of edge) point(along * size, -across * width);
          point(size, 0);
          for (const [along, across] of edge.slice().reverse()) point(along * size, across * width);
          g.poly(points).fill(shade(color, i === middle ? 1.08 : .84 + i % 3 * .06));
          if (i === middle) g.moveTo(x, y).lineTo(x + Math.cos(angle) * size * .8, y + Math.sin(angle) * size * .8)
            .stroke({ color: 0xa8b67d, width: .35, alpha: .45 });
        }
      }
    }
    g.scale.set(stage === 'sprout' ? .42 : stage === 'growing' ? .72 : stage === 'fading' ? .66 : 1);
    g.alpha = stage === 'fading' ? .55 : 1;
    return g;
  }
  function makeLiveAtlas(P, renderer, shared, core) {
    const extras = [];
    for (let vigor = 0; vigor <= 3; vigor++) {
      extras.push([`redbloom-star:${vigor}`, g => {
        g.moveTo(32, 58).lineTo(32, 32).stroke({ color: 0x78874a, width: 2 });
        const points = [];
        for (let i = 0; i < 12 + vigor * 2; i++) {
          const angle = i / (12 + vigor * 2) * Math.PI * 2 - Math.PI / 2, radius = i % 2 ? 5 : 13 + vigor;
          points.push(32 + Math.cos(angle) * radius, 31 + Math.sin(angle) * radius);
        }
        g.poly(points).fill(0xe02f50).stroke({ color: 0xff9cb0, width: 1 }); g.circle(32, 31, 3).fill(0xffd7a1);
      }]);
      extras.push([`crystalfungus:${vigor}`, g => {
        for (let i = 0; i < 2 + vigor; i++) {
          const x = 18 + i * 7, y = 40 + i % 2 * 6;
          g.poly([x - 6, y, x, y - 19 - vigor, x + 6, y, x + 3, 57, x - 3, 57]).fill(0xe5faff)
            .stroke({ color: 0x83cee0, width: 1 });
          g.moveTo(x, y - 19 - vigor).lineTo(x, 54).stroke({ color: 0xffffff, width: 1 });
        }
      }]);
      extras.push([`blackthorn:${vigor}`, g => {
        g.moveTo(21, 57).bezierCurveTo(48, 45, 17, 35, 42, 18).stroke({ color: 0xbda8d1, width: 5 });
        g.moveTo(21, 57).bezierCurveTo(48, 45, 17, 35, 42, 18).stroke({ color: 0x281c39, width: 3 });
        for (let i = 0; i < 4 + vigor; i++) {
          const y = 52 - i * 5, x = 31 + i % 2 * 4, side = i % 2 ? -1 : 1;
          g.poly([x, y + 2, x + side * 10, y - 6, x + side * 3, y]).fill(0xdfb0d9);
        }
      }]);
    }
    const base = shared.makeAtlas(P, renderer, extras), sheet = new P.Container(), keys = [], artTiles = [];
    const enlargement = { flower: 1.12, mushroom: 1.16, wirefern: 1.16, crystalfungus: 1.12, ghostbloom: 1.10 };
    function tile(key, object) {
      const index = keys.length; object.position.set(index % 32 * 32 + 16, Math.floor(index / 32) * 32 + 29);
      sheet.addChild(object); keys.push(key);
    }
    for (const type of core.species) for (let vigor = 0; vigor <= 3; vigor++) for (let variant = 0; variant < 5; variant++) {
      for (const stage of type === 'redbloom' ? ['mature', 'fading'] : ['sprout', 'growing', 'mature', 'fading']) {
        if (type === 'vine') {
          const object = vineTile(P, vigor, variant, stage); artTiles.push(object);
          tile(`${type}:${stage}:${vigor}:${variant}`, object); continue;
        }
        if (type === 'broadleaf' || type === 'blackthorn' || type === 'weed') {
          const object = foliageTile(P, type, vigor, variant, stage); artTiles.push(object);
          tile(`${type}:${stage}:${vigor}:${variant}`, object); continue;
        }
        const object = new P.Sprite(base.frames.get(`${type === 'redbloom' ? 'redbloom-star' : type}:${vigor}`)); object.anchor.set(.5, .9);
        // The longest base mushroom stem reaches y=63; enlargement needs a
        // slightly higher bake origin to leave a clear bottom texel in its slot.
        if (type === 'mushroom') object.anchor.set(.5, .94);
        object.scale.set((stage === 'sprout' ? .21 : stage === 'growing' ? .36 : stage === 'fading' ? .33 : .5) * (enlargement[type] ?? 1));
        object.tint = core.palettes[type][variant]; object.alpha = stage === 'fading' ? .55 : 1;
        tile(`${type}:${stage}:${vigor}:${variant}`, object);
      }
    }
    for (const key of ['rain', 'probe']) { const object = new P.Sprite(base.frames.get(key)); object.anchor.set(.5, .9); object.scale.set(.5); tile(key, object); }
    // One finite cached tile. Coordinates match Canvas's compact rooted ochre plant.
    const mutation = new P.Graphics();
    mutation.moveTo(-4, -2).lineTo(0, -5).lineTo(4, -2).moveTo(0, -5).lineTo(0, -21).stroke({ color: 0x94704c, width: 1.5 });
    for (const [x, y, angle, color] of [[-4, 2, .5, 0xaab557], [4, -1, -.5, 0xc2b66a], [-3, -5, .4, 0x8e9e46]]) {
      const points = [];
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8, dx = Math.cos(a) * 4.5, dy = Math.sin(a) * 2.2;
        points.push(x + dx * Math.cos(angle) - dy * Math.sin(angle), y - 12 + dx * Math.sin(angle) + dy * Math.cos(angle));
      }
      mutation.poly(points).fill(color);
    }
    mutation.circle(0, -21, 1.5).fill(0xd8c782).rect(2, -22, 1.5, 1.5).fill({ color: 0xf9efbb, alpha: .5 });
    tile('collectible_weed', mutation);
    const atlas = renderer.generateTexture({ target: sheet, frame: new P.Rectangle(0, 0, 1024, Math.ceil(keys.length / 32) * 32), resolution: 2 });
    // Pixi's destroy({children:true}) does not destroy a child's owned Graphics
    // context. Release these one-time artwork paths explicitly after rasterization.
    for (const object of artTiles) object.destroy();
    sheet.destroy({ children: true });
    for (const frame of base.frames.values()) frame.destroy(false); base.atlas.destroy(true);
    const frames = new Map(keys.map((key, i) => [key, new P.Texture({ source: atlas.source,
      frame: new P.Rectangle(i % 32 * 32, Math.floor(i / 32) * 32, 32, 32) })]));
    return { frames, atlas };
  }
  function createView(P, app, frames, core, shared) {
    const { width, height, cellSize, columns, rows } = core.dimensions;
    const root = new P.Container(); root.eventMode = 'none'; app.stage.addChild(root);
    const soil = new P.Graphics().rect(0, 0, width, height).fill(0x555436), grid = new P.Graphics();
    for (let x = 0; x <= width; x += cellSize) grid.moveTo(x, 0).lineTo(x, height);
    for (let y = 0; y <= height; y += cellSize) grid.moveTo(0, y).lineTo(width, y);
    grid.stroke({ color: 0xb4ac72, alpha: .10, width: 1 });
    const darkening = new P.Sprite(P.Texture.WHITE); darkening.width = width; darkening.height = height; darkening.tint = 0x000000; darkening.alpha = 0;
    const grassLayer = new P.Container(), puddleLayer = new P.Container();
    const links = new P.Container(), plants = new P.Container();
    const dropLayer = new P.Container(), curiosityLayer = new P.Container();
    const rain = new P.ParticleContainer({ dynamicProperties: { position: true, rotation: false, vertex: false, color: false }, boundsArea: new P.Rectangle(-40, -40, 1040, 680) });
    const probe = new P.Sprite(frames.get('probe')); probe.anchor.set(.5); probe.position.set(12, 10);
    const clip = new P.Graphics().rect(0, 0, width, height).fill(0xffffff);
    root.addChild(soil, grid, darkening, grassLayer, puddleLayer, links, plants, dropLayer, curiosityLayer, rain, probe, clip); root.mask = clip;
    const byId = new Map(), vineLinks = new Map(), halfCurvesById = new Map(), mutationViews = new Map(); let connectionHalves = 0;
    const counters = { created: 0, destroyed: 0, stageUpdates: 0, vineNeighborChecks: 0 };
    let particles = [], settings = core.weatherSettings({ level: 'quiet', eventsPerMinute: 0 }), lastWeatherKey = '';
    const eligible = specimen => specimen?.type === 'vine' && specimen.stage !== 'sprout';
    function refreshVine(specimen, byCell) {
      const graphic = vineLinks.get(specimen.id); if (!graphic) return;
      connectionHalves -= halfCurvesById.get(specimen.id) ?? 0;
      halfCurvesById.set(specimen.id, 0); graphic.clear(); if (!eligible(specimen)) return;
      let halves = 0;
      const color = vineColors[specimen.colorVariant], own = vineOffset(specimen);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        counters.vineNeighborChecks++;
        const column = specimen.column + dx, row = specimen.row + dy;
        if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
        const neighbor = byCell.get(row * columns + column); if (!eligible(neighbor)) continue;
        const cell = specimen.row * columns + specimen.column, otherCell = row * columns + column;
        const first = cell < otherCell, seed = Math.min(cell, otherCell) * 641 + Math.max(cell, otherCell);
        // Thin only the drawn network, symmetrically at both ends. Diagonals are
        // occasional tendrils rather than an X in every occupied square.
        if (vineNoise(seed) > (dx && dy ? .12 : .52)) continue;
        const other = vineOffset(neighbor), x = dx * cellSize + other.x - own.x, y = dy * cellSize + other.y - own.y;
        const length = Math.hypot(x, y), nx = -y / length, ny = x / length;
        const bend = (vineNoise(seed + 701) - .5) * 12 * (first ? 1 : -1);
        const midX = x / 2 + nx * bend, midY = y / 2 + ny * bend;
        const curl = (vineNoise(seed + 1409) - .5) * 13;
        // Canonical pair seed gives both halves the same midpoint and tangent.
        graphic.moveTo(0, 0).bezierCurveTo(x * .18 + nx * curl, y * .18 + ny * curl,
          midX - x * .18, midY - y * .18, midX, midY)
          .stroke({ color, width: (specimen.stage === 'mature' ? 1.05 : .8) + specimen.vigor * .12,
            alpha: specimen.stage === 'fading' ? .24 : .65 });
        halves++;
      }
      halfCurvesById.set(specimen.id, halves); connectionHalves += halves;
    }
    function refreshNeighborhood(specimen, byCell) {
      refreshVine(specimen, byCell);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const column = specimen.column + dx, row = specimen.row + dy;
        if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
        const neighbor = byCell.get(row * columns + column);
        if (neighbor?.type === 'vine') refreshVine(neighbor, byCell);
      }
    }
    const texture = specimen => frames.get(specimen.mutation ? 'collectible_weed' : `${specimen.type}:${specimen.stage}:${specimen.vigor}:${specimen.colorVariant}`);
    const specimenScale = { flower: 1.4, mushroom: 1.4, broadleaf: 1.35, wirefern: 1.4, weed: 1.4,
      redbloom: 1.25, ghostbloom: 1.3, crystalfungus: 1.3, blackthorn: 1.25 };
    function sizeSpecimen(specimen, sprite) {
      if (specimen.type === 'vine' && !specimen.mutation) return; // Preserve mirrored vines and their connection roots.
      // Scale the existing 2x cached tile, keeping its rooted anchor and stage
      // proportions. A top-row limit avoids crowding the second row to fit tall heads.
      const scale = specimen.mutation ? 1 : Math.min(specimenScale[specimen.type] ?? 1, specimen.row === 0 ? 1.1 : Infinity);
      sprite.scale.set(scale);
      const x = (specimen.column + .5) * cellSize, y = (specimen.row + .5) * cellSize + 12;
      if (specimen.mutation) { sprite.position.set(x, y); return; }
      const w = sprite.texture.frame.width * scale, h = sprite.texture.frame.height * scale;
      // Only visual edge insets change; the entire quad stays inside the garden
      // mask, including transparent padding. Logical picking still uses the cell.
      sprite.position.set(Math.max(w * .5 + .5, Math.min(width - w * .5 - .5, x)),
        Math.max(h * .9 + .5, Math.min(height - h * .1 - .5, y)));
    }
    return { root, byId, vineLinks, mutationViews, counters, grassLayer, puddleLayer, dropLayer, curiosityLayer,
      add(specimen, byCell) {
        const sprite = new P.Sprite(texture(specimen)); sprite.anchor.set(.5, .9);
        sprite.position.set((specimen.column + .5) * cellSize, (specimen.row + .5) * cellSize + 12);
        sizeSpecimen(specimen, sprite);
        plants.addChild(sprite); byId.set(specimen.id, sprite); counters.created++;
        if (specimen.mutation) mutationViews.set(specimen.id, { specimen, sprite });
        if (specimen.type === 'vine') {
          const offset = vineOffset(specimen), seed = specimen.row * columns + specimen.column;
          sprite.position.set(sprite.position.x + offset.x, sprite.position.y + offset.y);
          sprite.rotation = (vineNoise(seed + 83) - .5) * .5;
          sprite.scale.set(vineNoise(seed + 127) < .5 ? -1 : 1, 1);
          const graphic = new P.Graphics(); graphic.position.set((specimen.column + .5) * cellSize + offset.x, (specimen.row + .5) * cellSize + offset.y);
          links.addChild(graphic); vineLinks.set(specimen.id, graphic); refreshNeighborhood(specimen, byCell);
        }
      },
      update(specimen, byCell) { byId.get(specimen.id).texture = texture(specimen); counters.stageUpdates++;
        sizeSpecimen(specimen, byId.get(specimen.id));
        if (specimen.mutation) mutationViews.set(specimen.id, { specimen, sprite: byId.get(specimen.id) });
        if (specimen.type === 'vine') refreshNeighborhood(specimen, byCell); },
      remove(specimen, byCell) {
        const sprite = byId.get(specimen.id); sprite.destroy(); byId.delete(specimen.id); counters.destroyed++;
        mutationViews.delete(specimen.id);
        const graphic = vineLinks.get(specimen.id);
        if (graphic) {
          connectionHalves -= halfCurvesById.get(specimen.id) ?? 0; halfCurvesById.delete(specimen.id);
          graphic.destroy(); vineLinks.delete(specimen.id); refreshNeighborhood(specimen, byCell);
        }
      },
      setWeather(state) {
        const key = `${state.level}:${state.eventsPerMinute}`; if (key === lastWeatherKey) return;
        lastWeatherKey = key; settings = core.weatherSettings(state); darkening.alpha = settings.darkening;
        rain.removeParticles(); particles = [];
        const random = shared.seededRandom(7357);
        for (let i = 0; i < settings.count; i++) {
          const particle = new P.Particle({ texture: frames.get('rain'), x: random() * width, y: random() * height,
            anchorX: .5, anchorY: .5, rotation: -Math.atan2(settings.slant, settings.length || 1),
            alpha: settings.opacity, scaleX: 1, scaleY: settings.length / 10 });
          particles.push(particle); rain.addParticle(particle);
        }
        rain.update();
      },
      animate(seconds, elapsed, at = Date.now()) {
        for (const { specimen, sprite } of mutationViews.values()) {
          // Only the <=3 active views move; expired ones stay invisible until the logical removal.
          sprite.visible = at < specimen.mutation.expiresAt;
          const phase = (at - specimen.mutation.createdAt) / 800;
          sprite.rotation = Math.sin(phase) * .012; sprite.alpha = .94 + Math.sin(phase) * .06;
        }
        for (const particle of particles) { particle.x = (particle.x + settings.drift * elapsed) % 1040; particle.y = (particle.y + settings.speed * elapsed) % 680; }
        probe.x = 12 + (Math.sin(seconds * Math.PI / 4 - Math.PI / 2) + 1) / 2 * 936;
      },
      setProbes(value) { probe.visible = value; },
      snapshot() {
        return { sprites: byId.size, mutationViews: mutationViews.size, vineViews: vineLinks.size, connectionHalves, particles: particles.length,
          displayObjects: 14 + byId.size + vineLinks.size + grassLayer.children.length + puddleLayer.children.length
            + dropLayer.children.length + curiosityLayer.children.length, textures: frames.size, counters: { ...counters } }; },
      destroy() { root.destroy({ children: true }); byId.clear(); mutationViews.clear(); vineLinks.clear(); halfCurvesById.clear(); connectionHalves = 0; particles = []; }
    };
  }
  async function start() {
    const P = window.PIXI, shared = window.PacketGardenPixi, core = window.PacketGardenPixiLiveCore;
    const ecologyCore = window.PacketGardenEcology, ecologyPresentation = window.PacketGardenPixiEcology;
    const ambientCore = window.PacketGardenAmbient, ambientPresentation = window.PacketGardenPixiAmbient;
    const interaction = window.PacketGardenInteraction;
    const sound = typeof gardenSound === 'undefined' ? null : gardenSound;
    const viewElement = document.querySelector('#view'), hud = document.querySelector('#hud'), connection = document.querySelector('#connection');
    const app = new P.Application();
    await app.init({ width: 960, height: 600, preference: 'webgl', powerPreference: 'high-performance', antialias: false,
      backgroundColor: 0x151c16, backgroundAlpha: 1, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoStart: false });
    viewElement.appendChild(app.canvas);
    const cache = makeLiveAtlas(P, app.renderer, shared, core), view = createView(P, app, cache.frames, core, shared);
    const stormPresentation = window.PacketGardenPixiStorm, stormView = stormPresentation.createView(P, app.renderer, view.root);
    // Separate random stream: effects never consume placement/ecology randomness.
    const stormSeed = window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
    const storm = stormPresentation.createModel({random:shared.seededRandom(stormSeed),onChange:stormView.change,
      onThunder:level => sound?.maybePlayThunderSound(level)});
    const lightningToggle = document.querySelector('#lightning-enabled');
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');let lightningEnabled = true;
    const updateLightning = () => {
      const reduced = reducedMotion?.matches ?? false;
      if(lightningToggle){lightningToggle.disabled=reduced;lightningToggle.checked=lightningEnabled&&!reduced;
        lightningToggle.title=reduced?'Suppressed by reduced-motion preference':'Rare atmospheric storm illumination';}
      storm.configure({enabled:lightningEnabled,reducedMotion:reduced,hidden:document.hidden});
    };
    lightningToggle?.addEventListener('change',event=>{lightningEnabled=event.target.checked;updateLightning();});
    reducedMotion?.addEventListener?.('change',updateLightning);updateLightning();
    const ambientCache = ambientPresentation.makeAmbientAtlas(P, app.renderer);
    const ambientView = ambientPresentation.createAmbientView(P, view.curiosityLayer, view.dropLayer, ambientCache.frames);
    const ambient = ambientCore.createAmbientModel({ getSpecimens: () => model.specimens,
      onChange(change) { ambientView.change(change, Date.now()); } });
    // Both factories start empty. Bind ecology before startup grass or live input.
    let ui, ecology = null;
    const model = core.createModel(view, { onAdded: source => ecology?.removeGrassCell(source.column, source.row), onLive: source => {
      ambient.acceptLiveSpecimen(source); sound?.maybePlayGrowthSound(source.type);
    },
      onRemoved: source => { ambient.cancelSource(source); ui?.removed(source); }, onActivity: () => ui?.activity() });
    ui = window.PacketGardenPixiUi.createUi({ document, window, garden: model, ambient, colorName: core.colorName,
      getGrassCells: () => ecology.grassCells,
      onCollected: () => sound?.maybePlayCollectionSound() });
    const gnomePresentation = window.PacketGardenPixiGnomes;
    const gnomeCache = gnomePresentation.makeGnomeAtlas(P, app.renderer);
    // This existing world layer is above specimens and below rain. No idle group.
    const gnomeView = gnomePresentation.createGnomeView(P, view.curiosityLayer, gnomeCache.frames, () => reducedMotion?.matches ?? false);
    let simulatedWinner = null, nextSimulatedWinner = 'green';
    const gnomes = window.PacketGardenGnomes.createModel({ garden:model, getSpecimens: () => model.specimens,
      getReducedMotion: () => reducedMotion?.matches ?? false,
      random: () => simulatedWinner ? simulatedWinner === 'green' ? .25 : .75 : Math.random(),
      onChange(change) { gnomeView.change(change); if (!change.incident) simulatedWinner = null; },
      onCue: stage => sound?.maybePlayGnomeSound(stage) });
    document.querySelector('#trigger-gnomes')?.addEventListener('click', () => {
      const status = document.querySelector('#gnome-test-status');
      if (gnomes.incident) { if(status)status.textContent='An incident is already active.';return; }
      simulatedWinner = nextSimulatedWinner;
      if (gnomes.start(Date.now())) {
        if(status)status.textContent=`Simulated incident · ${simulatedWinner} will win. No network event.`;
        nextSimulatedWinner = simulatedWinner === 'green' ? 'red' : 'green';gnomeView.animate(Date.now());
      } else { simulatedWinner=null;if(status)status.textContent='Requires at least 30 living specimens. Seed a garden or wait for live growth.'; }
    });
    document.querySelector('#trigger-landscaping')?.addEventListener('click', () => {
      const status = document.querySelector('#landscaping-test-status');
      if (gnomes.incident) { status.textContent='An incident is already active.'; return; }
      if (Date.now() < gnomes.lastLandscapingAt + window.PacketGardenGnomes.landscapingConfig.cooldownMs) {
        status.textContent='Seven-minute landscaping cooldown is active.'; return;
      }
      // Explicit local fixture: no SSE events, fabricated provenance, activity or accepted-growth counts.
      if (!gnomes.landscapingEligible()) model.seedLandscaping();
      status.textContent = gnomes.startLandscaping() ? 'Simulated landscaping · real local vine removals, no network event.'
        : 'Seven-minute landscaping cooldown is active.';
      gnomeView.animate(Date.now());
    });
    const clickGarden = event => {
      const point = interaction.pointFromClient(event.clientX, event.clientY, app.canvas.getBoundingClientRect(), app.renderer.screen,
        { scale: view.root.scale.x, x: view.root.position.x, y: view.root.position.y });
      ui.click(point, { x: event.clientX, y: event.clientY });
    };
    app.canvas.addEventListener('click', clickGarden);
    const ecologyCache = ecologyPresentation.makeEcologyAtlas(P, app.renderer);
    const ecologyView = ecologyPresentation.createEcologyView(P, view.grassLayer, view.puddleLayer, ecologyCache.frames);
    ecology = ecologyCore.createEcologyModel({ isCellOccupied: (column, row) => model.byCell.has(row * core.dimensions.columns + column),
      onChange(change) {
        ecologyView.change(change, Date.now());
        if (change.kind === 'grass-removed') ui.grassRemoved(change.item);
      } });
    // Production begins with five distributed grass seeds; real TCPNoise never gains grass influence.
    for (let i = 0; i < 5; i++) { const cell = i * 128 + Math.floor(Math.random() * 128); ecology.influenceGrassCell(cell % 32, Math.floor(cell / 32)); }
    // The default garden omits development controls and timing collection entirely.
    const measurements = hud ? shared.frameWindow() : null;
    const sourceControl = document.querySelector('#weather-source'), levelControl = document.querySelector('#weather-level');
    const weatherStatus = document.querySelector('#weather-status'); let latestWeather = null, status = 'connecting';
    const minuteStat = document.querySelector('#network-events-minute'), hourStat = document.querySelector('#network-events-hour');
    const rateFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
    const countFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
    function updateNetworkActivity(state) {
      if (minuteStat) minuteStat.textContent = state.hasSnapshot ? rateFormat.format(state.eventsPerMinute) : 'Waiting…';
      if (hourStat) hourStat.textContent = !state.hasSnapshot ? 'Waiting…'
        : state.eventsLastHour === null ? 'Unavailable' : countFormat.format(state.eventsLastHour);
    }
    updateNetworkActivity({ hasSnapshot: false });
    let currentWeather = { level: 'quiet', eventsPerMinute: 0 };
    function updateWeather() {
      const live = !sourceControl || sourceControl.value === 'live';
      if (levelControl) levelControl.disabled = live;
      currentWeather = live ? latestWeather ?? { level: 'quiet', eventsPerMinute: 0 } : { level: levelControl.value, eventsPerMinute: 10000 };
      view.setWeather(currentWeather);
      storm.configure({level:currentWeather.level});
      ecology.updateWeatherEligibility(currentWeather.level);
      weatherStatus.textContent = live ? `Live weather ${latestWeather ? currentWeather.level : status}` : 'Manual weather · 10000 events/min test intensity';
    }
    const stream = core.connectStream(EventSource, model, state => { latestWeather = state; updateNetworkActivity(state); if (!sourceControl || sourceControl.value === 'live') updateWeather(); }, value => {
      status = value; connection.textContent = value; if (!sourceControl || sourceControl.value === 'live') updateWeather();
    });
    sourceControl?.addEventListener('change', updateWeather); levelControl?.addEventListener('change', updateWeather); updateWeather();
    document.querySelector('#trigger-lightning')?.addEventListener('click',()=>{
      const status=document.querySelector('#lightning-test-status');
      const started=sourceControl?.value==='manual' && storm.trigger();
      if(status)status.textContent=started?'Simulated atmospheric lightning; optional thunder follows.'
        :'Requires manual thunderstorm/hurricane, enabled lightning, no reduced motion and no active sequence.';
    });
    let ambientSeedVariant = 0;
    const seedAmbient = () => ambientPresentation.seedAmbient(ambient, Date.now(), ambientSeedVariant++ % 4);
    document.querySelector('#seed-ambient')?.addEventListener('click', seedAmbient);
    document.querySelector('#seed-mutations')?.addEventListener('click', () => model.seedMutations());
    document.querySelector('#seed-pending-mutations')?.addEventListener('click', () => model.seedMutations(true));
    let interactionSeedVariant = 0;
    document.querySelector('#seed-interaction')?.addEventListener('click', () => {
      const source = model.seedInteraction(), at = Date.now(); ecology.clear();
      const point = { x: (source.column + .5) * 30, y: (source.row + .5) * 30 };
      const item = { ...point, createdAt: at, expiresAt: at + ambientCore.curiosityConfig.lifetimeMs, phase: 0 };
      ambient.seed({ curiosities: [{ ...item, type: ambientCore.curiosityTypes[interactionSeedVariant++ % 4], origin: point, direction: 1 }],
        drops: [{ ...item, type: 'amanita_muscaria' }] });
    });
    document.querySelector('#clear')?.addEventListener('click', () => { model.clear(); ecology.clear(); ambient.clear(); gnomes.clear(); gnomes.resetCadence(); storm.reset(); });
    document.querySelector('#seed')?.addEventListener('click', () => {
      model.seed(); ecologyPresentation.seedDenseEcology(ecology, Date.now(), document.querySelector('#seed-puddles').checked);
      seedAmbient();
    });
    document.querySelector('#pause')?.addEventListener('change', event => model.setPaused(event.target.checked));
    const updateProbes = () => { const value = document.querySelector('#probes')?.checked ?? false; view.setProbes(value); document.body.classList.toggle('probes-off', !value); };
    document.querySelector('#probes')?.addEventListener('change', updateProbes); updateProbes();
    const resize = () => { const box = viewElement.getBoundingClientRect(); app.renderer.resize(Math.max(1, Math.round(box.width)), Math.max(1, Math.round(box.height)), Math.min(window.devicePixelRatio || 1, 2));
      const fit = shared.contain(app.renderer.screen.width, app.renderer.screen.height); view.root.scale.set(fit.scale); view.root.position.set(fit.x, fit.y); ui.position(); };
    const observer = new ResizeObserver(resize); observer.observe(viewElement); window.addEventListener('resize', resize); resize();
    let lastTick = null, nextLogicalAt = 0, lastHud = -Infinity, seconds = 0;
    document.querySelector('#reset')?.addEventListener('click', () => { measurements?.reset(); lastTick = null; lastHud = -Infinity; });
    function updateHud() {
      if (!hud) return;
      const data = measurements.snapshot(), counts = view.snapshot(), ec = ecologyView.snapshot(), ac = ambientView.snapshot(), mc = model.mutations.snapshot(), simulated = model.specimens.filter(p => p.origin.kind === 'simulated').length;
      hud.textContent = [`Pixi ${P.VERSION} · ${P.RendererType?.[app.renderer.type] || app.renderer.constructor.name} · native ticker`,
        `FPS current ${data.currentFps.toFixed(1)} · recent avg ${data.averageFps.toFixed(1)} · session avg ${data.sessionAverageFps.toFixed(1)}`,
        `Frame ms recent avg ${data.averageMs.toFixed(2)} / worst ${data.worstMs.toFixed(2)} · session worst ${data.sessionWorstMs.toFixed(2)}`,
        `Gaps >50ms ${data.over50} / >300ms ${data.over300} · frames ${data.frames} · measured ${(data.elapsedMs / 1000).toFixed(1)}s · samples ${data.size}/${data.capacity}`,
        `Specimens ${model.specimens.length}/640 · simulated/test ${simulated} · live ${model.specimens.length - simulated}`,
        `Accepted live ${model.counts.acceptedLive} · saturated drops ${model.counts.droppedSaturated} · replacements ${model.counts.replacements} · lifecycle removals ${model.counts.lifecycleRemovals} · paused callbacks ${model.counts.pausedEvents}`,
        `Vine half-curves ${counts.connectionHalves} · vine views ${counts.vineViews} · rain particles ${counts.particles} · ${currentWeather.level} / ${currentWeather.eventsPerMinute} events/min`,
        `Display objects ${counts.displayObjects + gnomeView.views.size + 3} · sprite views ${counts.sprites} · atlas frames ${counts.textures} · created/destroyed ${counts.counters.created}/${counts.counters.destroyed} · stage updates ${counts.counters.stageUpdates}`,
        `Gnomes ${gnomes.actors.length}/4 · ${gnomes.incident?.type ?? 'idle'} / ${gnomes.incident?.phase ?? 'idle'} · 14 cached frames / 1 GPU source`,
        `Grass ${ecology.grassCells.length}/640 · views ${ec.grassViews} · added/removed/refreshed ${ec.ecologyCounters.grassAdded}/${ec.ecologyCounters.grassRemoved}/${ec.ecologyCounters.grassRefreshed} · transform updates ${ec.ecologyCounters.grassVisualUpdates}`,
        `Puddles ${ecology.puddles.length}/8 · views ${ec.puddleViews} · added/removed/refreshed ${ec.ecologyCounters.puddleAdded}/${ec.ecologyCounters.puddleRemoved}/${ec.ecologyCounters.puddleRefreshed}`,
        `Ecology atlas: grass ${ec.grassTextures} + puddle ${ec.puddleTextures} frames · 1 GPU source`,
        `Curiosities ${ambient.curiosities.length}/3 · views ${ac.curiosityViews} · created/expired ${ambient.counts.curiositiesCreated}/${ambient.counts.curiositiesExpired}`,
        `Amanita ${ambient.drops.length}/3 · views ${ac.dropViews} · pending ${ambient.pendingDrops.size} · scheduled/activated/cancelled/expired ${ambient.counts.dropsScheduled}/${ambient.counts.dropsActivated}/${ambient.counts.dropsCancelled}/${ambient.counts.dropsExpired} · cap skips ${ambient.counts.dropsCapSkipped}`,
        `Ambient atlas: ${ac.ambientTextures} frames · 1 GPU source · unified logical click priority`,
        `Mutations ${mc.active}/3 · pending ${mc.pending} · views ${counts.mutationViews} · activations ${mc.activations} · cap skips ${mc.capSkips} · cancellations ${mc.cancellations} · expiries ${mc.expiries} · 1 cached frame in specimen atlas`,
        `Logical 960×600 · presentation ${app.renderer.screen.width.toFixed(0)}×${app.renderer.screen.height.toFixed(0)} · backing ${app.canvas.width}×${app.canvas.height}`,
        'Local transient CPU/ticker intervals; not GPU completion. Dense/ambient seeding is local simulated state; temporary visitors expire normally.'
      ].join('\n');
    }
    app.ticker.maxFPS = 0;
    app.ticker.add(ticker => {
      const now = ticker.lastTime, elapsed = lastTick === null ? 0 : now - lastTick;
      if (elapsed > 0) { measurements?.add(elapsed); seconds += elapsed / 1000; } lastTick = now;
      if (Date.now() >= nextLogicalAt) {
        const at = Date.now(); model.tick(); ecology.tick(at); ecologyView.tick(at);
        ambient.tick(at, { hidden: document.hidden });
        gnomes.tick(at, undefined, document.hidden);
        storm.tick(at);
        ui.tick(at);
        nextLogicalAt = Date.now() + 250;
      } // one scheduler, never replay missed ticks
      ecologyView.animate(Date.now());
      ambientView.animate(Date.now());
      if (gnomes.incident) { gnomes.advance(Date.now());gnomeView.animate(Date.now()); }
      if (storm.active) stormView.animate(storm.active,Date.now());
      view.animate(seconds, elapsed / 1000); if (hud && now - lastHud >= 500) { lastHud = now; updateHud(); }
    });
    document.addEventListener('visibilitychange', () => {
      document.body.classList.toggle('page-hidden', document.hidden);
      const at = Date.now(); ecology.resetCadence(at);
      gnomes.resetCadence(at);
      if (document.hidden) gnomes.suspend(at);
      storm.configure({hidden:document.hidden},at);
      if (document.hidden) app.stop(); else {
        model.tick(); ecology.tick(at); ecologyView.tick(at); ecologyView.animate(at);
        ambient.tick(at, { hidden: false }); ambientView.animate(at);
        gnomes.advance(at);gnomeView.animate(at);
        ui.tick(at);
        nextLogicalAt = at + 250; lastTick = null; app.start();
      }
    });
    window.addEventListener('pagehide', event => {
      gnomes.suspend();storm.configure({hidden:true});app.stop(); stream.close(); if (event.persisted) return;
      observer.disconnect(); window.removeEventListener('resize', resize); ambient.clear(); ambientView.destroy(); ambientCache.destroy();
      gnomes.clear();gnomeView.destroy();gnomeCache.destroy();
      reducedMotion?.removeEventListener?.('change',updateLightning);storm.destroy();stormView.destroy();
      app.canvas.removeEventListener('click', clickGarden); ui.destroy();
      ecology.clear(); ecologyView.destroy(); view.destroy(); ecologyCache.destroy();
      for (const frame of cache.frames.values()) frame.destroy(false); cache.atlas.destroy(true); app.destroy(true);
    });
    window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
    updateHud(); if (!document.hidden) app.start();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { makeLiveAtlas, createView };
  else start().catch(error => {
    const status = document.querySelector('#hud') ?? document.querySelector('#connection');
    status.textContent = `Garden initialization failed: ${error.message}`;
    console.error(error);
  });
})();
