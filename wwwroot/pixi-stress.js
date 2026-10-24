/* Isolated synthetic rendering spike. Does not load or mutate production garden state. */
(function () {
  'use strict';
  const config = Object.freeze({ width: 960, height: 600, columns: 32, rows: 20,
    capacity: 640, puddles: 8, sampleCapacity: 240, maxResolution: 2 });
  const species = ['flower', 'mushroom', 'broadleaf', 'vine', 'wirefern', 'redbloom', 'weed', 'ghostbloom'];
  const weather = Object.freeze({
    quiet: { count: 0, speed: 0, drift: 0, alpha: 0 },
    drizzle: { count: 16, speed: 180, drift: -25, alpha: .25 },
    rain: { count: 48, speed: 300, drift: -60, alpha: .35 },
    heavy: { count: 150, speed: 450, drift: -120, alpha: .45 },
    thunderstorm: { count: 260, speed: 580, drift: -180, alpha: .55 },
    hurricane: { count: 400, speed: 760, drift: -280, alpha: .65 }
  });
  function seededRandom(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function contain(width, height) {
    const scale = Math.min(width / config.width, height / config.height);
    return { scale, x: (width - config.width * scale) / 2, y: (height - config.height * scale) / 2 };
  }
  function sceneModel(mode) {
    if (!['empty', 'sparse', 'mixed', 'vines', 'wireferns'].includes(mode)) throw new Error('Unknown scene');
    const random = seededRandom(0x7061636b);
    const count = mode === 'empty' ? 0 : mode === 'sparse' ? 50 : config.capacity;
    const grassCount = mode === 'empty' ? 0 : mode === 'sparse' ? 100 : config.capacity;
    const cells = Array.from({ length: config.capacity }, (_, i) => i);
    // Deterministic scatter for sparse mode, dense modes still occupy every cell.
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const specimens = cells.slice(0, count).map((cell, i) => ({ cell,
      type: mode === 'vines' ? 'vine' : mode === 'wireferns' ? 'wirefern' : species[i % species.length],
      vigor: Math.floor(random() * 4), jitterX: (random() - .5) * 5, jitterY: (random() - .5) * 5 }));
    const grass = cells.slice(0, grassCount).map(cell => ({ cell, variant: Math.floor(random() * 4) }));
    const vines = new Set(specimens.filter(p => p.type === 'vine').map(p => p.cell));
    const connections = [];
    for (const cell of vines) {
      if (cell % config.columns < config.columns - 1 && vines.has(cell + 1)) connections.push([cell, cell + 1]);
      if (cell + config.columns < config.capacity && vines.has(cell + config.columns)) connections.push([cell, cell + config.columns]);
    }
    return { specimens, grass, connections, puddles: count ? config.puddles : 0, actors: count ? 8 : 0 };
  }
  function frameWindow(capacity = config.sampleCapacity) {
    const samples = new Float64Array(capacity);
    let cursor = 0, size = 0, frames = 0, total = 0, worst = 0, over50 = 0, over300 = 0;
    return {
      add(ms) {
        if (!(ms > 0 && Number.isFinite(ms))) return;
        samples[cursor] = ms; cursor = (cursor + 1) % capacity; size = Math.min(size + 1, capacity);
        frames++; total += ms; worst = Math.max(worst, ms); over50 += Number(ms > 50); over300 += Number(ms > 300);
      },
      snapshot() {
        let sum = 0, maximum = 0;
        for (let i = 0; i < size; i++) { sum += samples[i]; maximum = Math.max(maximum, samples[i]); }
        return { currentFps: size ? 1000 / samples[(cursor + capacity - 1) % capacity] : 0,
          averageFps: sum ? size * 1000 / sum : 0, averageMs: size ? sum / size : 0,
          worstMs: maximum, sessionAverageFps: total ? frames * 1000 / total : 0,
          sessionWorstMs: worst, over50, over300, frames, elapsedMs: total, size, capacity };
      },
      reset() { samples.fill(0); cursor = size = frames = total = worst = over50 = over300 = 0; }
    };
  }
  const cellPosition = cell => ({ x: (cell % config.columns + .5) * 30, y: (Math.floor(cell / config.columns) + .5) * 30 });

  // All procedural art is built once into one shared GPU atlas. Every cell reuses a frame.
  // No Graphics construction, texture generation, or neighbor search occurs in the ticker.
  function makeAtlas(P, renderer, extraTiles = []) {
    const sheet = new P.Container(), keys = [];
    const line = (g, points, color, width = 2) => {
      g.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
      g.stroke({ color, width });
    };
    function tile(key, draw) {
      const index = keys.length, g = new P.Graphics();
      g.position.set(index % 8 * 64, Math.floor(index / 8) * 64);
      draw(g); sheet.addChild(g); keys.push(key);
    }
    for (const type of species) for (let vigor = 0; vigor <= 3; vigor++) tile(`${type}:${vigor}`, g => {
      const top = 30 - vigor * 3, stem = type === 'weed' ? 0x997936 : 0x63774a;
      line(g, [32, 59, 31, top], stem, 2);
      if (type === 'flower' || type === 'redbloom' || type === 'ghostbloom') {
        const petal = type === 'redbloom' ? 0xd04a50 : type === 'ghostbloom' ? 0xd8eff6 : 0xe0b567;
        if (type === 'ghostbloom') g.circle(31, top, 14).fill({ color: 0xbcecff, alpha: .10 });
        for (let i = 0; i < 5 + vigor; i++) {
          const angle = i / (5 + vigor) * Math.PI * 2;
          g.circle(31 + Math.cos(angle) * 7, top + Math.sin(angle) * 7, 5).fill(petal);
        }
        g.circle(31, top, 4).fill(type === 'redbloom' ? 0x642b37 : 0xf1dda5);
        g.ellipse(25, 47, 7, 3).fill(0x83924c);
      } else if (type === 'mushroom') {
        g.roundRect(29, top + 7, 6, 26, 2).fill(0xdecaa2);
        g.ellipse(32, top + 7, 13 + vigor, 9).fill(0xa16e6a);
        for (let i = 0; i <= vigor; i++) g.circle(25 + i * 5, top + 4 + i % 2 * 3, 2).fill(0xeadfc9);
      } else if (type === 'broadleaf') {
        for (let i = 0; i < 4 + vigor; i++) {
          const side = i % 2 ? -1 : 1, y = 49 - i * 5;
          line(g, [32, y + 3, 32 + side * 9, y], stem);
          g.ellipse(32 + side * 9, y - 2, 9, 5).fill(i % 2 ? 0x839653 : 0x537a47);
        }
      } else if (type === 'vine') {
        g.moveTo(30, 59).bezierCurveTo(48, 48, 16, 37, 36, top - 3).stroke({ color: 0x77964c, width: 3 });
        for (let i = 0; i < 4 + vigor; i++) g.ellipse(i % 2 ? 25 : 38, 49 - i * 5, 6, 3).fill(0x90a555);
      } else if (type === 'wirefern') {
        for (let i = 0; i < 4 + vigor; i++) {
          const y = 51 - i * 5, reach = 11 - i * .7;
          line(g, [32 - reach, y - 7, 32 - reach, y - 2, 32, y + 2, 32 + reach, y - 2, 32 + reach, y - 7], 0x8cc0b7, 1.5);
          g.circle(32 + reach, y - 7, 1.4).fill(0xd0dfb7);
        }
      } else {
        for (let i = 0; i < 4 + vigor; i++) {
          const side = i % 2 ? -1 : 1, y = 51 - i * 5;
          line(g, [32, y + 5, 32 + side * (9 + i % 3), y - 3, 32 + side * 5, y - 8], i % 2 ? 0xaaa84b : 0xc1a146, 2);
          g.poly([32 + side * 8, y - 3, 32 + side * 15, y - 7, 32 + side * 12, y + 1]).fill(0x9c873f);
        }
      }
    });
    for (let variant = 0; variant < 4; variant++) tile(`grass:${variant}`, g => {
      const random = seededRandom(variant + 17);
      for (let i = 0; i < 18; i++) {
        const x = 9 + random() * 46, y = 36 + random() * 21;
        line(g, [x, y, x + (random() - .5) * 10, y - 6 - random() * 15], [0x61764c, 0x7b8b50, 0x435a38][i % 3], 1.4);
      }
    });
    tile('puddle', g => {
      g.ellipse(32, 35, 28, 14).fill({ color: 0x6b9daa, alpha: .40 });
      g.ellipse(27, 32, 16, 5).fill({ color: 0xacc4bb, alpha: .16 });
    });
    tile('ladybug', g => { g.ellipse(32, 34, 7, 9).fill(0xc94d46); line(g, [32, 25, 32, 43], 0x272e26, 1); g.circle(32, 24, 4).fill(0x272e26); g.circle(28, 32, 2).fill(0x272e26); g.circle(36, 37, 2).fill(0x272e26); });
    tile('snail', g => { g.roundRect(18, 39, 29, 6, 3).fill(0xb8a879); g.circle(31, 33, 10).fill(0x9b7350); g.circle(31, 33, 5).stroke({ color: 0xd1ac77, width: 2 }); line(g, [43, 40, 45, 30], 0xb8a879); });
    tile('moth', g => { g.ellipse(25, 30, 8, 12).fill(0xc4d1c4); g.ellipse(39, 30, 8, 12).fill(0xdde1c6); line(g, [32, 23, 32, 43], 0x778576, 3); });
    tile('drop', g => { g.roundRect(29, 35, 6, 15, 2).fill(0xe7d8ad); g.ellipse(32, 34, 12, 7).fill(0xd96752); g.circle(27, 32, 2).fill(0xffedd2); g.circle(36, 35, 2).fill(0xffedd2); });
    tile('gnome', g => { g.roundRect(24, 32, 16, 19, 3).fill(0x719399); g.circle(32, 29, 7).fill(0xe2bf99); g.poly([20, 26, 32, 7, 43, 26]).fill(0xb34c47); g.poly([25, 33, 32, 43, 39, 33]).fill(0xe6dfc9); });
    tile('rain', g => g.rect(31, 8, 1.4, 20).fill(0xb9d6dc));
    tile('probe', g => g.rect(26, 26, 12, 12).fill(0x52ff80));
    for (const [key, draw] of extraTiles) tile(key, draw);
    const atlas = renderer.generateTexture({ target: sheet, frame: new P.Rectangle(0, 0, 512, Math.ceil(keys.length / 8) * 64), resolution: 2 });
    sheet.destroy({ children: true });
    const frames = new Map(keys.map((key, i) => [key, new P.Texture({ source: atlas.source,
      frame: new P.Rectangle(i % 8 * 64, Math.floor(i / 8) * 64, 64, 64) })]));
    return { frames, atlas };
  }

  function createScene(P, app, textures) {
    const root = new P.Container(); root.eventMode = 'none'; app.stage.addChild(root);
    const soil = new P.Graphics().rect(0, 0, config.width, config.height).fill(0x343d29);
    const random = seededRandom(8192);
    for (let i = 0; i < 1200; i++) soil.circle(random() * 960, random() * 600, .3 + random()).fill({ color: 0xaca279, alpha: .17 });
    const grassLayer = new P.Container(), puddleLayer = new P.Container(), links = new P.Graphics();
    const plantLayer = new P.Container(), actorLayer = new P.Container();
    const rainLayer = new P.ParticleContainer({ dynamicProperties: { position: true, rotation: false, vertex: false, color: false },
      boundsArea: new P.Rectangle(-40, -40, 1040, 680) });
    const probe = new P.Sprite(textures.get('probe')); probe.anchor.set(.5); probe.position.set(20, 10);
    const clip = new P.Graphics().rect(0, 0, config.width, config.height).fill(0xffffff);
    root.addChild(soil, grassLayer, puddleLayer, links, plantLayer, actorLayer, rainLayer, probe, clip);
    root.mask = clip; // Keep rain inside the logical scene, including letterboxed presentations.
    let model, mode = 'mixed', weatherMode = 'hurricane', actors = [], rain = [];
    const sprite = (key, layer, x, y, scale = 1) => {
      const object = new P.Sprite(textures.get(key)); object.anchor.set(.5, .9);
      object.position.set(x, y); object.scale.set(scale); layer.addChild(object); return object;
    };
    function setMode(value) {
      model = sceneModel(value); mode = value;
      for (const layer of [grassLayer, puddleLayer, plantLayer, actorLayer]) {
        for (const child of layer.removeChildren()) child.destroy(); // shared textures are retained
      }
      links.clear(); actors = [];
      for (const patch of model.grass) { const pos = cellPosition(patch.cell); sprite(`grass:${patch.variant}`, grassLayer, pos.x, pos.y + 11, .65); }
      for (let i = 0; i < model.puddles; i++) sprite('puddle', puddleLayer, 95 + i % 4 * 248, 115 + Math.floor(i / 4) * 340, 1.15);
      for (const [a, b] of model.connections) {
        const from = cellPosition(a), to = cellPosition(b);
        links.moveTo(from.x, from.y).bezierCurveTo(from.x + 5, from.y - 12, to.x - 5, to.y + 8, to.x, to.y)
          .stroke({ color: 0x7b954f, width: 1.5, alpha: .7 });
      }
      for (const plant of model.specimens) {
        const pos = cellPosition(plant.cell);
        sprite(`${plant.type}:${plant.vigor}`, plantLayer, pos.x + plant.jitterX, pos.y + 12 + plant.jitterY, .65 + plant.vigor * .045);
      }
      const types = ['ladybug', 'snail', 'moth', 'drop', 'drop', 'gnome', 'gnome', 'moth'];
      for (let i = 0; i < model.actors; i++) actors.push(sprite(types[i], actorLayer, 70 + i * 110, 300, .8));
    }
    function setWeather(value) {
      const settings = weather[value]; if (!settings) throw new Error('Unknown weather');
      weatherMode = value; rainLayer.removeParticles(); rain = [];
      const random = seededRandom(7357);
      const rotation = Math.atan2(-settings.drift, settings.speed || 1);
      for (let i = 0; i < settings.count; i++) {
        const particle = new P.Particle({ texture: textures.get('rain'), x: random() * 960, y: random() * 600,
          anchorX: .5, anchorY: .5, rotation, alpha: settings.alpha, scaleX: 1, scaleY: .6 + random() * .8 });
        rainLayer.addParticle(particle); rain.push(particle);
      }
      rainLayer.update();
    }
    function animate(seconds, elapsedSeconds) {
      const settings = weather[weatherMode];
      // Use actual ticker elapsed time, not clamped deltaMS, so frame stalls cannot be concealed.
      for (const particle of rain) {
        particle.x = ((particle.x + settings.drift * elapsedSeconds) % 1040 + 1040) % 1040;
        particle.y = (particle.y + settings.speed * elapsedSeconds) % 680;
      }
      for (let i = 0; i < actors.length; i++) {
        const actor = actors[i]; actor.x = 70 + i * 110 + Math.sin(seconds * (.25 + i * .03) + i) * 38;
        actor.y = 300 + Math.sin(seconds * .6 + i * 2) * (i % 3 === 2 ? 90 : 12);
        actor.rotation = Math.sin(seconds * 2 + i) * .12;
      }
      probe.x = 12 + (Math.sin(seconds * Math.PI / 4 - Math.PI / 2) + 1) / 2 * 936;
    }
    return { root, setMode, setWeather, animate,
      setProbes(visible) { probe.visible = visible; },
      resize(width, height) { const fit = contain(width, height); root.scale.set(fit.scale); root.position.set(fit.x, fit.y); return fit; },
      snapshot() { return { mode, weather: weatherMode, specimens: plantLayer.children.length, grass: grassLayer.children.length,
        puddles: puddleLayer.children.length, actors: actorLayer.children.length, connections: model.connections.length,
        particles: rainLayer.particleChildren.length, sprites: plantLayer.children.length + grassLayer.children.length + puddleLayer.children.length + actorLayer.children.length + Number(probe.visible),
        sceneChildren: root.children.length, textures: textures.size }; },
      destroy() { root.destroy({ children: true }); rain = []; actors = []; }
    };
  }
  // Page-level callbacks must become inert before any Pixi resource is released.
  // Shared by the stress page and the live garden; no rendering/scheduling rules.
  function pageLifetime(stop) {
    let disposed=false;
    const listeners=[],resources=[];
    const guard=callback=>function(...args){if(!disposed)return callback.apply(this,args);};
    const own=release=>{if(disposed)release();else resources.push(release);};
    function listen(target,type,callback) {
      if(disposed||!target?.addEventListener)return;
      const handler=guard(callback);target.addEventListener(type,handler);
      listeners.push(()=>target.removeEventListener?.(type,handler));
    }
    function dispose() {
      if(disposed)return;
      disposed=true;
      const errors=[];
      const release=callback=>{try{callback();}catch(error){errors.push(error);}};
      while(listeners.length)release(listeners.pop());
      release(stop);
      while(resources.length)release(resources.pop());
      if(errors.length)throw new AggregateError(errors,'Pixi teardown failed');
    }
    return {guard,own,listen,dispose,get disposed(){return disposed;}};
  }
  async function start() {
    let stop=()=>{},resume=()=>{},cached=false;
    const lifetime=pageLifetime(()=>stop()),{guard,own,listen,dispose}=lifetime;
    listen(window,'pagehide',event=>{
      if(event.persisted){cached=true;stop();}else dispose();
    });
    // The synthetic stress scene retains its resources in bfcache, as before.
    listen(window,'pageshow',event=>{if(event.persisted){cached=false;resume();}});
    try {
    const P = window.PIXI, view = document.querySelector('#view'), hud = document.querySelector('#hud');
    const app = new P.Application();
    // One opaque surface avoids full-size alpha compositing. Cached art already has smooth
    // edges at 2x atlas resolution; MSAA is unnecessary. DPR cap bounds fill rate on HiDPI.
    try {await app.init({ width: 960, height: 600, preference: ['webgl'], powerPreference: 'high-performance',
      backgroundColor: 0x151c16, backgroundAlpha: 1, antialias: false, autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, config.maxResolution), autoStart: false });
    }catch(error){own(()=>app.stage.destroy({children:true}));throw error;}
    own(()=>app.destroy(true));if(lifetime.disposed)return;
    stop=()=>app.stop();
    view.appendChild(app.canvas);
    const { frames: textures, atlas } = makeAtlas(P, app.renderer);
    own(()=>{for(const texture of textures.values())texture.destroy(false);atlas.destroy(true);});
    const scene = createScene(P, app, textures), measurements = frameWindow();
    own(()=>scene.destroy());
    const sceneControl = document.querySelector('#scene'), weatherControl = document.querySelector('#weather');
    let lastTick = null, lastHud = -Infinity, animationSeconds = 0;
    const reset = () => { measurements.reset(); lastTick = null; lastHud = -Infinity; };
    const updateMode = () => { scene.setMode(sceneControl.value); reset(); };
    const updateWeather = () => { scene.setWeather(weatherControl.value); reset(); };
    const updateTarget = () => { app.ticker.maxFPS = document.querySelector('#target').value === '60' ? 60 : 0; reset(); };
    const updateProbes = () => {
      const visible = document.querySelector('#probes').checked;
      document.body.classList.toggle('probes-off', !visible); scene.setProbes(visible);
    };
    listen(sceneControl,'change',updateMode);listen(weatherControl,'change',updateWeather);
    listen(document.querySelector('#target'),'change',updateTarget);
    listen(document.querySelector('#probes'),'change',updateProbes);
    listen(document.querySelector('#reset'),'click',reset);
    updateMode(); updateWeather(); updateTarget(); updateProbes();
    const resize = guard(() => {
      const box = view.getBoundingClientRect(), width = Math.max(1, Math.round(box.width)), height = Math.max(1, Math.round(box.height));
      app.renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, config.maxResolution));
      scene.resize(width, height);
    });
    const observer = new ResizeObserver(resize);own(()=>observer.disconnect());observer.observe(view);listen(window,'resize',resize);resize();
    const rendererName = P.RendererType?.[app.renderer.type] || app.renderer.constructor.name;
    function updateHud() {
      const data = measurements.snapshot(), counts = scene.snapshot();
      hud.textContent = [
        `Pixi ${P.VERSION} · ${rendererName} · target ${document.querySelector('#target').value}`,
        `FPS current ${data.currentFps.toFixed(1)} · recent avg ${data.averageFps.toFixed(1)} · session avg ${data.sessionAverageFps.toFixed(1)}`,
        `Frame ms recent avg ${data.averageMs.toFixed(2)} / worst ${data.worstMs.toFixed(2)} · session worst ${data.sessionWorstMs.toFixed(2)}`,
        `Gaps >50ms ${data.over50} / >300ms ${data.over300} · frames ${data.frames} · measured ${(data.elapsedMs / 1000).toFixed(1)}s · samples ${data.size}/${data.capacity}`,
        `${counts.mode} + ${counts.weather} · specimens ${counts.specimens} · grass ${counts.grass} · puddles ${counts.puddles} · actors ${counts.actors}`,
        `Sprites ${counts.sprites} · rain particles ${counts.particles} · vine connections ${counts.connections} · atlas frames ${counts.textures}`,
        `Logical 960×600 · presentation ${app.renderer.screen.width.toFixed(0)}×${app.renderer.screen.height.toFixed(0)} · backing ${app.canvas.width}×${app.canvas.height} · DPR ${app.renderer.resolution.toFixed(2)}`,
        'CPU/ticker intervals only; no GPU completion measurement. Local, transient metrics.'
      ].join('\n');
    }
    const tick=guard(ticker => {
      if(cached||document.hidden)return;
      const now = ticker.lastTime, elapsed = lastTick === null ? 0 : now - lastTick;
      if (elapsed > 0) { measurements.add(elapsed); animationSeconds += elapsed / 1000; }
      lastTick = now; scene.animate(animationSeconds, elapsed / 1000);
      if (now - lastHud >= 500) { lastHud = now; updateHud(); }
    });
    app.ticker.add(tick);own(()=>app.ticker.remove(tick));
    resume=()=>{if(!document.hidden&&!cached){lastTick=null;app.start();}};
    listen(document,'visibilitychange', () => {
      if(cached)return;
      document.body.classList.toggle('page-hidden', document.hidden);
      if(document.hidden)app.stop();else resume();
    });
    updateHud();resume();
    }catch(error){
      try{dispose();}catch(cleanupError){throw new AggregateError([error,cleanupError],'Pixi initialization and teardown failed');}
      throw error;
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { config, weather, sceneModel, seededRandom, contain, frameWindow, makeAtlas, createScene, pageLifetime };
  else {
    window.PacketGardenPixi = { config, contain, seededRandom, frameWindow, makeAtlas, pageLifetime };
    if (!document.currentScript?.hasAttribute('data-pixi-library')) start().catch(error => {
      const view = document.querySelector('#view');
      view.textContent = 'PacketGarden requires WebGL to display the garden. Try a browser with WebGL enabled.';
      view.setAttribute('role', 'alert');
      document.querySelector('#hud').textContent = `Pixi initialization failed: ${error.message}. Production garden is unchanged.`; console.error(error);
    });
  }
})();
