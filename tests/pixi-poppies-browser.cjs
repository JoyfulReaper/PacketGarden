// Real WebGL, installed Chrome/Playwright; fixtures never inject network growth.
if (!process.argv.includes('--run')) console.log('SKIP: poppy Chrome review; pass --run [--baseline].');
else run().catch(error => { console.error(error); process.exitCode = 1; });
async function run() {
  const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs/promises'), path = require('node:path');
  const { execFileSync } = require('node:child_process'), { chromium } = require('playwright');
  const root = path.resolve(__dirname, '..'), assets = path.join(root, 'wwwroot'), baseline = process.argv.includes('--baseline');
  const output = path.join(root, 'artifacts/poppies', baseline ? 'before' : 'after'); await fs.mkdir(output, { recursive: true });
  const old = new Map(), checkpoint = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (baseline) for (const file of ['index.html', 'pixi-live.html', 'garden-mutations.js', 'garden-gnomes.js', 'garden-ui-core.js', 'pixi-live-core.js', 'pixi-live.js', 'pixi-vine-blooms.js'])
    old.set(file, execFileSync('git', ['show', `${checkpoint}:wwwroot/${file}`], { cwd: root }));
  const capture = `{
    const f=window.__poppy={bakes:[],geometry:0,streams:0,contexts:[]};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface']]){
      const create=window[global][method];window[global][method]=(...args)=>{const value=create(...args);f[key]??=value;return value;};
    }
    const model=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(view,options)=>{f.view=view;return f.model=model(view,{...options,poppyRandom:()=>.9});};
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const generate=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const start=performance.now(),t=generate(options);
        f.bakes.push({width:options.frame.width,height:options.frame.height,ms:performance.now()-start,source:t.source});return t;};return value;
    });};
    for(const name of ['clear','moveTo','bezierCurveTo','stroke','fill']){const original=PIXI.Graphics.prototype[name];PIXI.Graphics.prototype[name]=function(...args){
      f.geometry++;if(name==='clear')this.__curves=[];if(name==='moveTo')this.__start=args;if(name==='bezierCurveTo')this.__end=args.slice(-2);
      if(name==='stroke'&&this.__end&&this.__start?.[0]===0&&this.__start?.[1]===0)(this.__curves??=[]).push(this.__end);return original.apply(this,args);};}
  }`;
  const server = http.createServer(async (req, res) => { try {
    const file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (file === '__poppy.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(capture); return; }
    if (file === 'api/garden/events') { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n'); return; }
    if (file === 'favicon.ico') { res.writeHead(204); res.end(); return; }
    const absolute = path.resolve(assets, file); if (!absolute.startsWith(assets + path.sep)) { res.writeHead(404); res.end(); return; }
    let body = old.get(file) ?? await fs.readFile(absolute);
    if (file.endsWith('.html')) body = Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/, '<script src="/__poppy.js" defer></script>$1'));
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(body);
  } catch (error) { res.writeHead(404); res.end(String(error)); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const errors = [], report = { baseline, checkpoint, scenes: [], resources: [], timing: [] };
  try {
    browser = await chromium.launch({ channel: process.env.PACKETGARDEN_BROWSER_CHANNEL || 'chrome', headless: true }); report.browser = browser.version();
    for (const [name, url] of [['homepage', '/'], ['diagnostic', '/pixi-live.html']]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 }); page.on('pageerror', e => errors.push(e.stack));
      await page.addInitScript(() => { window.__poppyNow = 1800000000000; Date.now = () => __poppyNow;
        let seed = 137; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); });
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`); await page.waitForFunction(() => window.__poppy?.app?.ticker?.started && __poppy.ecology);
      await page.evaluate(() => __poppy.app.stop()); if (name === 'diagnostic') await page.locator('#probes').uncheck();
      const seed = async (age = 60000, flowers = false, grass = false, night = false, dense = false) => page.evaluate(({ age, flowers, grass, night, dense }) => {
        const f = __poppy, at = Date.now(); for (const g of f.view.vineLinks.values()) f.contexts.push(g.context);
        f.garden.clear(); f.ecology.clear(); f.ecology.setAllowGrassUnderPlants(true);
        const entries = Array.from({ length: dense ? 640 : 35 }, (_, i) => ({ type: 'vine', vigor: i % 4,
          column: dense ? i % 32 : 12 + i % 7, row: dense ? Math.floor(i / 32) : 7 + Math.floor(i / 7), createdAt: at - (i === 17 ? age : 65000),
          vineBloom: flowers ? { color: i % 4, layout: i % 2 } : null, origin: { kind: 'simulated', eventType: 'poppy-fixture' } }));
        f.garden.seed(entries, at); for (const p of entries) { p.colorVariant = p.vigor; f.view.update(p, f.garden.byCell); }
        f.source = entries[17]; f.originalSprite = f.view.byId.get(f.source.id); f.identity = [f.source.id, f.source.cell, f.source.createdAt, f.source.origin, f.source.vigor];
        f.model.poppies?.force(f.source); f.model.tick(at);
        if (grass) f.ecology.seed({ grassCells: Array.from({ length: 640 }, (_, i) => ({ column: i % 32, row: Math.floor(i / 32), createdAt: at - 60000, lastInfluencedAt: at })) });
        f.ecology.resetCadence(at); f.light.setMode(night ? 'night' : 'day'); f.light.tick(at, { force: true }); f.surface.apply(f.light.state, 0); f.app.render();
      }, { age, flowers, grass, night, dense });
      const shot = async scene => {
        const state = await page.evaluate(() => { const f = __poppy, p = f.source; return { plants: f.garden.specimens.length,
          active: f.model.poppies?.snapshot().active ?? 0, spriteIdentity: f.view.byId.get(p.id) === f.originalSprite,
          identity: [p.id, p.cell, p.createdAt, p.origin, p.vigor], original: f.identity, halves: f.view.snapshot().connectionHalves,
          blooms: f.view.vineBloomViews.size, grass: f.ecology.grassCells.length, accepted: f.model.counts.acceptedLive,
          score: document.querySelector('#garden-score').textContent }; });
        assert(state.spriteIdentity); assert.deepEqual(state.identity, state.original); assert.equal(state.accepted, 0); assert.equal(state.score, 'Score: 0');
        assert.equal(state.active, baseline || scene === 'before-transformation' ? 0 : 1);
        await page.locator('#view canvas').screenshot({ path: path.join(output, `${name}-${scene}.png`) }); report.scenes.push({ page: name, scene, ...state });
      };
      await seed(59000); await shot('before-transformation');
      await page.evaluate(() => { __poppyNow += 1000; __poppy.model.tick(Date.now()); __poppy.app.render(); }); await shot('newly-mature');
      await seed(180000); await shot('mature-vines');
      await seed(180000, true); await shot('flowering-vines');
      // Every remaining half-tendril must meet its partner; no dangling neighbor art.
      const endpoints = await page.evaluate(() => {
        const ends = new Map(); for (const g of __poppy.view.vineLinks.values()) for (const [x, y] of g.__curves ?? []) {
          const key = [x + g.position.x, y + g.position.y].map(n => n.toFixed(5)).join(','); ends.set(key, (ends.get(key) ?? 0) + 1);
        } return [...ends.values()];
      }); assert(endpoints.length > 0); assert(endpoints.every(n => n === 2));
      if (!baseline) assert.equal(await page.evaluate(() => __poppy.view.vineBloomViews.has(__poppy.source.id)), false);
      await seed(180000, true, true); await shot('dense-grass');
      await seed(180000, true, true, true); await shot('night');
      await seed(480000, true, true); await shot('fading');
      await seed(180000, true, true); await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(() => __poppy.app.render()); await shot('mobile');
      await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      await seed(180000, true, true, false, true);
      const resources = await page.evaluate(() => ({ frames: __poppy.view.snapshot().textures, sprites: __poppy.view.byId.size,
        displayObjects: __poppy.view.snapshot().displayObjects, streams: __poppy.streams, bakes: __poppy.bakes.length,
        dimensions: __poppy.bakes.map(b => [b.width, b.height]), bakeMs: __poppy.bakes.map(b => b.ms) }));
      assert.equal(resources.frames, baseline ? 823 : 825); assert.equal(resources.sprites, 640); assert.equal(resources.streams, 1);
      assert.deepEqual(resources.dimensions[1], [1024, 832]); report.resources.push({ page: name, ...resources });
      report.timing.push({ page: name, ...await page.evaluate(async () => {
        const submit = [], intervals = []; let last; const geometry = __poppy.geometry;
        for (let i = 0; i < 90; i++) { await new Promise(resolve => requestAnimationFrame(resolve)); const start = performance.now();
          if (last !== undefined) intervals.push(start - last); last = start; __poppy.app.render(); submit.push(performance.now() - start); }
        if (__poppy.geometry !== geometry) throw Error('Per-frame geometry');
        const start = performance.now(); for (let i = 0; i < 1000; i++) __poppy.model.tick(Date.now());
        const mean = a => a.reduce((s, n) => s + n, 0) / a.length;
        return { meanSubmitMs: mean(submit), meanFrameMs: mean(intervals), meanLogicalTickMs: (performance.now() - start) / 1000 };
      }) });
      for (let i = 0; i < 3; i++) await seed(60000, true, true);
      assert.equal(await page.evaluate(() => __poppy.bakes.length), resources.bakes);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
        __poppyNow += 600001; Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange'));
        delete document.hidden; __poppy.app.stop(); });
      assert.equal(await page.evaluate(() => __poppy.garden.specimens.length), 0);
      if (!baseline) {
        await seed(599999, true); await page.evaluate(() => { __poppyNow++; __poppy.model.tick(Date.now()); });
        assert.equal(await page.evaluate(() => __poppy.view.byId.has(__poppy.source.id)), false);
        if (name === 'diagnostic') {
          await page.locator('#seed-poppy-replacement').click(); const id = await page.evaluate(() => __poppy.model.specimens.find(p => p.poppyMutation?.state === 'active').id);
          await page.locator('#replace-poppy').click(); assert.equal(await page.evaluate(id => __poppy.view.byId.has(id), id), false);
        }
      }
      await seed(60000, true, true); await page.evaluate(() => { for (const g of __poppy.view.vineLinks.values()) __poppy.contexts.push(g.context);
        dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); });
      assert.equal(await page.evaluate(() => __poppy.view.byId.size), 0);
      assert.equal(await page.evaluate(() => __poppy.bakes.every(b => b.source.destroyed) && __poppy.contexts.every(c => c.destroyed)), true);
      await page.close();
    }
    assert.deepEqual(errors, []); await fs.writeFile(path.join(output, 'review.json'), JSON.stringify(report, null, 2));
    if (!baseline) {
      const scenes = ['before-transformation', 'newly-mature', 'mature-vines', 'flowering-vines', 'dense-grass', 'night', 'fading', 'mobile'];
      const gallery = `<!doctype html><meta charset="utf-8"><title>PacketGarden poppy review</title>
        <style>body{font:16px system-ui;background:#182219;color:#ede6dd;margin:24px}a{color:#d4b1cf}figure{margin:16px 0;overflow:auto}img{display:block;max-width:none}summary{cursor:pointer;padding:12px}figcaption{margin-bottom:8px}</style>
        <h1>Vine → opium poppy</h1><p>Local simulated fixtures. Original-size garden captures; the poppy is in column 15, row 9 (zero-based). Before and newly mature preserve the exact original vine and Sprite. Mobile details are small at the whole-garden fit.</p>
        <p><a href="before/review.json">Main baseline measurements</a> · <a href="after/review.json">Working tree measurements</a></p>
        ${['homepage', 'diagnostic'].map(page => `<h2>${page}</h2>${scenes.map((scene, i) => `<details ${i === 1 ? 'open' : ''}><summary>${scene}</summary>
          ${['before', 'after'].map(version => `<figure><figcaption>${version === 'before' ? 'Main baseline: ordinary vine' : 'Working tree'} · <a href="${version}/${page}-${scene}.png">Original PNG</a></figcaption><img src="${version}/${page}-${scene}.png" alt="${page} ${version} ${scene}"></figure>`).join('')}</details>`).join('')}`).join('')}`;
      await fs.writeFile(path.join(root, 'artifacts/poppies/index.html'), gallery);
    }
    console.log('PASS: poppy normal-scale WebGL captures, identity, symmetric tendrils, hidden/expiry/replacement/atlas teardown and CPU/resource review:', JSON.stringify(report));
  } finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
