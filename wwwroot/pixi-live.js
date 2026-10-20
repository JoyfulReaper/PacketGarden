(function () {
  'use strict';
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
    const base = shared.makeAtlas(P, renderer, extras), sheet = new P.Container(), keys = [];
    function tile(key, object) {
      const index = keys.length; object.position.set(index % 32 * 32 + 16, Math.floor(index / 32) * 32 + 29);
      sheet.addChild(object); keys.push(key);
    }
    for (const type of core.species) for (let vigor = 0; vigor <= 3; vigor++) for (let variant = 0; variant < 5; variant++) {
      for (const stage of type === 'redbloom' ? ['mature', 'fading'] : ['sprout', 'growing', 'mature', 'fading']) {
        const object = new P.Sprite(base.frames.get(`${type === 'redbloom' ? 'redbloom-star' : type}:${vigor}`)); object.anchor.set(.5, .9);
        object.scale.set(stage === 'sprout' ? .21 : stage === 'growing' ? .36 : stage === 'fading' ? .33 : .5);
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
      const color = core.palettes.vine[specimen.colorVariant];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        counters.vineNeighborChecks++;
        const column = specimen.column + dx, row = specimen.row + dy;
        if (column < 0 || column >= columns || row < 0 || row >= rows || !eligible(byCell.get(row * columns + column))) continue;
        const x = dx * cellSize / 2, y = dy * cellSize / 2, bend = (specimen.column + specimen.row) % 2 === 0 ? 3 : -3;
        graphic.moveTo(0, 0).quadraticCurveTo(x / 2 - dy * bend, y / 2 + dx * bend, x, y)
          .stroke({ color, width: (specimen.stage === 'fading' ? 1 : specimen.stage === 'mature' ? 2.5 : 1.5) + specimen.vigor * .4,
            alpha: specimen.stage === 'fading' ? .55 : 1 });
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
    return { root, byId, vineLinks, mutationViews, counters, grassLayer, puddleLayer, dropLayer, curiosityLayer,
      add(specimen, byCell) {
        const sprite = new P.Sprite(texture(specimen)); sprite.anchor.set(.5, .9);
        sprite.position.set((specimen.column + .5) * cellSize, (specimen.row + .5) * cellSize + 12);
        plants.addChild(sprite); byId.set(specimen.id, sprite); counters.created++;
        if (specimen.mutation) mutationViews.set(specimen.id, { specimen, sprite });
        if (specimen.type === 'vine') {
          const graphic = new P.Graphics(); graphic.position.set((specimen.column + .5) * cellSize, (specimen.row + .5) * cellSize);
          links.addChild(graphic); vineLinks.set(specimen.id, graphic); refreshNeighborhood(specimen, byCell);
        }
      },
      update(specimen, byCell) { byId.get(specimen.id).texture = texture(specimen); counters.stageUpdates++;
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
    const viewElement = document.querySelector('#view'), hud = document.querySelector('#hud'), connection = document.querySelector('#connection');
    const app = new P.Application();
    await app.init({ width: 960, height: 600, preference: 'webgl', powerPreference: 'high-performance', antialias: false,
      backgroundColor: 0x151c16, backgroundAlpha: 1, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoStart: false });
    viewElement.appendChild(app.canvas);
    const cache = makeLiveAtlas(P, app.renderer, shared, core), view = createView(P, app, cache.frames, core, shared);
    const ambientCache = ambientPresentation.makeAmbientAtlas(P, app.renderer);
    const ambientView = ambientPresentation.createAmbientView(P, view.curiosityLayer, view.dropLayer, ambientCache.frames);
    const ambient = ambientCore.createAmbientModel({ getSpecimens: () => model.specimens,
      onChange(change) { ambientView.change(change, Date.now()); } });
    let ui;
    const model = core.createModel(view, { onLive: source => ambient.acceptLiveSpecimen(source),
      onRemoved: source => { ambient.cancelSource(source); ui?.removed(source); }, onActivity: () => ui?.activity() });
    ui = window.PacketGardenPixiUi.createUi({ document, window, garden: model, ambient, colorName: core.colorName });
    const clickGarden = event => {
      const point = interaction.pointFromClient(event.clientX, event.clientY, app.canvas.getBoundingClientRect(), app.renderer.screen,
        { scale: view.root.scale.x, x: view.root.position.x, y: view.root.position.y });
      ui.click(point, { x: event.clientX, y: event.clientY });
    };
    app.canvas.addEventListener('click', clickGarden);
    const ecologyCache = ecologyPresentation.makeEcologyAtlas(P, app.renderer);
    const ecologyView = ecologyPresentation.createEcologyView(P, view.grassLayer, view.puddleLayer, ecologyCache.frames);
    const ecology = ecologyCore.createEcologyModel({ onChange(change) { ecologyView.change(change, Date.now()); } });
    // Production begins with five distributed grass seeds; real TCPNoise never gains grass influence.
    for (let i = 0; i < 5; i++) { const cell = i * 128 + Math.floor(Math.random() * 128); ecology.influenceGrassCell(cell % 32, Math.floor(cell / 32)); }
    // The default garden omits development controls and timing collection entirely.
    const measurements = hud ? shared.frameWindow() : null;
    const sourceControl = document.querySelector('#weather-source'), levelControl = document.querySelector('#weather-level');
    const weatherStatus = document.querySelector('#weather-status'); let latestWeather = null, status = 'connecting';
    let currentWeather = { level: 'quiet', eventsPerMinute: 0 };
    function updateWeather() {
      const live = !sourceControl || sourceControl.value === 'live';
      if (levelControl) levelControl.disabled = live;
      currentWeather = live ? latestWeather ?? { level: 'quiet', eventsPerMinute: 0 } : { level: levelControl.value, eventsPerMinute: 10000 };
      view.setWeather(currentWeather);
      ecology.updateWeatherEligibility(currentWeather.level);
      weatherStatus.textContent = live ? `Live weather ${latestWeather ? currentWeather.level : status}` : 'Manual weather · 10000 events/min test intensity';
    }
    const stream = core.connectStream(EventSource, model, state => { latestWeather = state; if (!sourceControl || sourceControl.value === 'live') updateWeather(); }, value => {
      status = value; connection.textContent = value; if (!sourceControl || sourceControl.value === 'live') updateWeather();
    });
    sourceControl?.addEventListener('change', updateWeather); levelControl?.addEventListener('change', updateWeather); updateWeather();
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
    document.querySelector('#clear')?.addEventListener('click', () => { model.clear(); ecology.clear(); ambient.clear(); });
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
        `Display objects ${counts.displayObjects} · sprite views ${counts.sprites} · atlas frames ${counts.textures} · created/destroyed ${counts.counters.created}/${counts.counters.destroyed} · stage updates ${counts.counters.stageUpdates}`,
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
        ui.tick(at);
        nextLogicalAt = Date.now() + 250;
      } // one scheduler, never replay missed ticks
      ecologyView.animate(Date.now());
      ambientView.animate(Date.now());
      view.animate(seconds, elapsed / 1000); if (hud && now - lastHud >= 500) { lastHud = now; updateHud(); }
    });
    document.addEventListener('visibilitychange', () => {
      document.body.classList.toggle('page-hidden', document.hidden);
      const at = Date.now(); ecology.resetCadence(at);
      if (document.hidden) app.stop(); else {
        model.tick(); ecology.tick(at); ecologyView.tick(at); ecologyView.animate(at);
        ambient.tick(at, { hidden: false }); ambientView.animate(at);
        ui.tick(at);
        nextLogicalAt = at + 250; lastTick = null; app.start();
      }
    });
    window.addEventListener('pagehide', event => {
      app.stop(); stream.close(); if (event.persisted) return;
      observer.disconnect(); window.removeEventListener('resize', resize); ambient.clear(); ambientView.destroy(); ambientCache.destroy();
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
