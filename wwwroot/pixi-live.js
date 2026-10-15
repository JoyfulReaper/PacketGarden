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
    const links = new P.Container(), plants = new P.Container();
    const rain = new P.ParticleContainer({ dynamicProperties: { position: true, rotation: false, vertex: false, color: false }, boundsArea: new P.Rectangle(-40, -40, 1040, 680) });
    const probe = new P.Sprite(frames.get('probe')); probe.anchor.set(.5); probe.position.set(12, 10);
    const clip = new P.Graphics().rect(0, 0, width, height).fill(0xffffff);
    root.addChild(soil, grid, darkening, links, plants, rain, probe, clip); root.mask = clip;
    const byId = new Map(), vineLinks = new Map(), halfCurvesById = new Map(); let connectionHalves = 0;
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
    const texture = specimen => frames.get(`${specimen.type}:${specimen.stage}:${specimen.vigor}:${specimen.colorVariant}`);
    return { root, byId, vineLinks, counters,
      add(specimen, byCell) {
        const sprite = new P.Sprite(texture(specimen)); sprite.anchor.set(.5, .9);
        sprite.position.set((specimen.column + .5) * cellSize, (specimen.row + .5) * cellSize + 12);
        plants.addChild(sprite); byId.set(specimen.id, sprite); counters.created++;
        if (specimen.type === 'vine') {
          const graphic = new P.Graphics(); graphic.position.set((specimen.column + .5) * cellSize, (specimen.row + .5) * cellSize);
          links.addChild(graphic); vineLinks.set(specimen.id, graphic); refreshNeighborhood(specimen, byCell);
        }
      },
      update(specimen, byCell) { byId.get(specimen.id).texture = texture(specimen); counters.stageUpdates++;
        if (specimen.type === 'vine') refreshNeighborhood(specimen, byCell); },
      remove(specimen, byCell) {
        const sprite = byId.get(specimen.id); sprite.destroy(); byId.delete(specimen.id); counters.destroyed++;
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
      animate(seconds, elapsed) {
        for (const particle of particles) { particle.x = (particle.x + settings.drift * elapsed) % 1040; particle.y = (particle.y + settings.speed * elapsed) % 680; }
        probe.x = 12 + (Math.sin(seconds * Math.PI / 4 - Math.PI / 2) + 1) / 2 * 936;
      },
      setProbes(value) { probe.visible = value; },
      snapshot() {
        return { sprites: byId.size, vineViews: vineLinks.size, connectionHalves, particles: particles.length,
          displayObjects: 10 + byId.size + vineLinks.size, textures: frames.size, counters: { ...counters } }; },
      destroy() { root.destroy({ children: true }); byId.clear(); vineLinks.clear(); halfCurvesById.clear(); connectionHalves = 0; particles = []; }
    };
  }
  async function start() {
    const P = window.PIXI, shared = window.PacketGardenPixi, core = window.PacketGardenPixiLiveCore;
    const viewElement = document.querySelector('#view'), hud = document.querySelector('#hud'), connection = document.querySelector('#connection');
    const app = new P.Application();
    await app.init({ width: 960, height: 600, preference: 'webgl', powerPreference: 'high-performance', antialias: false,
      backgroundColor: 0x151c16, backgroundAlpha: 1, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoStart: false });
    viewElement.appendChild(app.canvas);
    const cache = makeLiveAtlas(P, app.renderer, shared, core), view = createView(P, app, cache.frames, core, shared), model = core.createModel(view);
    const measurements = shared.frameWindow(), sourceControl = document.querySelector('#weather-source'), levelControl = document.querySelector('#weather-level');
    const weatherStatus = document.querySelector('#weather-status'); let latestWeather = null, status = 'connecting';
    let currentWeather = { level: 'quiet', eventsPerMinute: 0 };
    function updateWeather() {
      const live = sourceControl.value === 'live'; levelControl.disabled = live;
      currentWeather = live ? latestWeather ?? { level: 'quiet', eventsPerMinute: 0 } : { level: levelControl.value, eventsPerMinute: 10000 };
      view.setWeather(currentWeather);
      weatherStatus.textContent = live ? `Live weather ${latestWeather ? currentWeather.level : status}` : 'Manual weather · 10000 events/min test intensity';
    }
    const stream = core.connectStream(EventSource, model, state => { latestWeather = state; if (sourceControl.value === 'live') updateWeather(); }, value => {
      status = value; connection.textContent = value; if (sourceControl.value === 'live') updateWeather();
    });
    sourceControl.addEventListener('change', updateWeather); levelControl.addEventListener('change', updateWeather); updateWeather();
    document.querySelector('#clear').addEventListener('click', () => model.clear());
    document.querySelector('#seed').addEventListener('click', () => model.seed());
    document.querySelector('#pause').addEventListener('change', event => model.setPaused(event.target.checked));
    const updateProbes = () => { const value = document.querySelector('#probes').checked; view.setProbes(value); document.body.classList.toggle('probes-off', !value); };
    document.querySelector('#probes').addEventListener('change', updateProbes); updateProbes();
    const resize = () => { const box = viewElement.getBoundingClientRect(); app.renderer.resize(Math.max(1, Math.round(box.width)), Math.max(1, Math.round(box.height)), Math.min(window.devicePixelRatio || 1, 2));
      const fit = shared.contain(app.renderer.screen.width, app.renderer.screen.height); view.root.scale.set(fit.scale); view.root.position.set(fit.x, fit.y); };
    const observer = new ResizeObserver(resize); observer.observe(viewElement); window.addEventListener('resize', resize); resize();
    let lastTick = null, nextLogicalAt = 0, lastHud = -Infinity, seconds = 0;
    document.querySelector('#reset').addEventListener('click', () => { measurements.reset(); lastTick = null; lastHud = -Infinity; });
    function updateHud() {
      const data = measurements.snapshot(), counts = view.snapshot(), simulated = model.specimens.filter(p => p.origin.kind === 'simulated').length;
      hud.textContent = [`Pixi ${P.VERSION} · ${P.RendererType?.[app.renderer.type] || app.renderer.constructor.name} · native ticker`,
        `FPS current ${data.currentFps.toFixed(1)} · recent avg ${data.averageFps.toFixed(1)} · session avg ${data.sessionAverageFps.toFixed(1)}`,
        `Frame ms recent avg ${data.averageMs.toFixed(2)} / worst ${data.worstMs.toFixed(2)} · session worst ${data.sessionWorstMs.toFixed(2)}`,
        `Gaps >50ms ${data.over50} / >300ms ${data.over300} · frames ${data.frames} · measured ${(data.elapsedMs / 1000).toFixed(1)}s · samples ${data.size}/${data.capacity}`,
        `Specimens ${model.specimens.length}/640 · simulated/test ${simulated} · live ${model.specimens.length - simulated}`,
        `Accepted live ${model.counts.acceptedLive} · saturated drops ${model.counts.droppedSaturated} · replacements ${model.counts.replacements} · lifecycle removals ${model.counts.lifecycleRemovals} · paused callbacks ${model.counts.pausedEvents}`,
        `Vine half-curves ${counts.connectionHalves} · vine views ${counts.vineViews} · rain particles ${counts.particles} · ${currentWeather.level} / ${currentWeather.eventsPerMinute} events/min`,
        `Display objects ${counts.displayObjects} · sprite views ${counts.sprites} · atlas frames ${counts.textures} · created/destroyed ${counts.counters.created}/${counts.counters.destroyed} · stage updates ${counts.counters.stageUpdates}`,
        `Logical 960×600 · presentation ${app.renderer.screen.width.toFixed(0)}×${app.renderer.screen.height.toFixed(0)} · backing ${app.canvas.width}×${app.canvas.height}`,
        'Local transient CPU/ticker intervals; not GPU completion. No deferred ecology/UI systems loaded.'
      ].join('\n');
    }
    app.ticker.maxFPS = 0;
    app.ticker.add(ticker => {
      const now = ticker.lastTime, elapsed = lastTick === null ? 0 : now - lastTick;
      if (elapsed > 0) { measurements.add(elapsed); seconds += elapsed / 1000; } lastTick = now;
      if (Date.now() >= nextLogicalAt) { model.tick(); nextLogicalAt = Date.now() + 250; } // one scheduler, never replay missed ticks
      view.animate(seconds, elapsed / 1000); if (now - lastHud >= 500) { lastHud = now; updateHud(); }
    });
    document.addEventListener('visibilitychange', () => {
      document.body.classList.toggle('page-hidden', document.hidden);
      if (document.hidden) app.stop(); else { model.tick(); lastTick = null; app.start(); }
    });
    window.addEventListener('pagehide', event => {
      app.stop(); stream.close(); if (event.persisted) return;
      observer.disconnect(); window.removeEventListener('resize', resize); view.destroy();
      for (const frame of cache.frames.values()) frame.destroy(false); cache.atlas.destroy(true); app.destroy(true);
    });
    window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
    updateHud(); if (!document.hidden) app.start();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { makeLiveAtlas, createView };
  else start().catch(error => { document.querySelector('#hud').textContent = `Pixi live initialization failed: ${error.message}`; console.error(error); });
})();
