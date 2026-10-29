// Installed Chrome/Playwright only; simulated fixtures, real WebGL/input/ownership.
if (!process.argv.includes('--run')) console.log('SKIP: opium pod Chrome review; pass --run [--baseline].');
else run().catch(error => { console.error(error); process.exitCode = 1; });
async function run() {
  const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs/promises'), path = require('node:path');
  const { execFileSync } = require('node:child_process'), { chromium } = require('playwright');
  const root = path.resolve(__dirname, '..'), assets = path.join(root, 'wwwroot'), baseline = process.argv.includes('--baseline');
  const output = path.join(root, 'artifacts/opium-pods', baseline ? 'before' : 'after'); await fs.mkdir(output, { recursive: true });
  const checkpoint = '0e691c3', old = new Map();
  if (baseline) for (const file of ['index.html', 'pixi-live.html', 'garden-ambient.js', 'garden-mutations.js', 'garden-ui-core.js', 'pixi-live-ambient.js', 'pixi-live-core.js', 'pixi-live.js'])
    old.set(file, execFileSync('git', ['show', `${checkpoint}:wwwroot/${file}`], { cwd: root }));
  const capture = `{
    const f=window.__pods={bakes:[],contexts:[],geometry:0,streams:0};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface']]){
      const create=window[global][method];window[global][method]=(...args)=>{const value=create(...args);f[key]??=value;return value;};
    }
    const model=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(view,options)=>{f.view=view;return f.model=model(view,{...options,poppyRandom:()=>.9});};
    const ambient=PacketGardenAmbient.createAmbientModel;PacketGardenAmbient.createAmbientModel=options=>(f.ambient=ambient({...options,podRandom:()=>.9}));
    const av=PacketGardenPixiAmbient.createAmbientView;PacketGardenPixiAmbient.createAmbientView=(...args)=>(f.av=av(...args));
    const atlas=PacketGardenPixiAmbient.makeAmbientAtlas;PacketGardenPixiAmbient.makeAmbientAtlas=(P,...args)=>{
      class Graphics extends P.Graphics{constructor(...args){super(...args);f.contexts.push(this.context);}}
      return f.cache=atlas({...P,Graphics},...args);
    };
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const generate=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const start=performance.now(),t=generate(options);
        f.bakes.push({width:options.frame.width,height:options.frame.height,ms:performance.now()-start,source:t.source});return t;};return value;
    });};
    for(const name of ['clear','moveTo','bezierCurveTo','stroke','fill']){const original=PIXI.Graphics.prototype[name];PIXI.Graphics.prototype[name]=function(...args){f.geometry++;return original.apply(this,args);};}
  }`;
  const server = http.createServer(async (req, res) => { try {
    const file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (file === '__pods.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(capture); return; }
    if (file === 'api/garden/events') { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n'); return; }
    if (file === 'favicon.ico') { res.writeHead(204); res.end(); return; }
    const absolute = path.resolve(assets, file); if (!absolute.startsWith(assets + path.sep)) { res.writeHead(404); res.end(); return; }
    let body = old.get(file) ?? await fs.readFile(absolute);
    if (file.endsWith('.html')) body = Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/, '<script src="/__pods.js" defer></script>$1'));
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(body);
  } catch (error) { res.writeHead(404); res.end(String(error)); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const errors = [], report = { baseline, checkpoint, scenes: [], resources: [], timing: [] };
  try {
    browser = await chromium.launch({ channel: process.env.PACKETGARDEN_BROWSER_CHANNEL || 'chrome', headless: true }); report.browser = browser.version();
    for (const [name, url] of [['homepage', '/'], ['diagnostic', '/pixi-live.html']]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 }); page.on('pageerror', e => errors.push(e.stack));
      await page.addInitScript(() => { window.__podNow = 1800000000000; Date.now = () => __podNow; let seed = 137;
        Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); });
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`); await page.waitForFunction(() => window.__pods?.app?.ticker?.started && __pods.ecology);
      await page.evaluate(() => __pods.app.stop()); if (name === 'diagnostic') await page.locator('#probes').uncheck();
      const seed = async (grass = false, night = false, mixed = false, full = false) => page.evaluate(({ grass, night, mixed, full, baseline }) => {
        const f = __pods, at = Date.now(); f.ambient.clear(); f.ecology.clear(); f.ecology.setAllowGrassUnderPlants(true);
        if (full) { f.model.seedVineBlooms('dense'); f.source = f.model.specimens[303]; f.source.colorVariant = 0;
          f.model.poppies.force(f.source); f.model.tick(at); }
        else f.source = f.model.seedPoppies('pods');
        f.sprite = f.view.byId.get(f.source.id);
        if (grass) f.ecology.seed({ grassCells: Array.from({ length: 640 }, (_, i) => ({ column: i % 32, row: Math.floor(i / 32), createdAt: at - 60000, lastInfluencedAt: at })) });
        f.ecology.resetCadence(at);
        const types = full ? ['amanita_muscaria','ditch_weed_bud','gnome_underpants','amanita_muscaria',baseline?'ditch_weed_bud':'opium_pod']
          : mixed ? ['amanita_muscaria','ditch_weed_bud','gnome_underpants',...(baseline?[]:['opium_pod'])] : [];
        if (types.length) f.ambient.seed({ drops: types.map((type, i) => ({ type, createdAt: at, expiresAt: at + 20000, x: 350 + i * 30, y: 315, phase: 0 })) });
        else if (!baseline) {
          if (!f.ambient.scheduleLooseDrop(f.source,'opium_pod',()=>.5,at)) throw Error('Simulated pod fixture failed');
          const pending=f.ambient.pendingDrops.get(f.source);pending.activateAt=at;f.ambient.activateLooseDrop(f.source,at);
        }
        f.light.setMode(night?'night':'day');f.light.tick(at,{force:true});f.surface.apply(f.light.state,0);f.av.animate(at);f.app.render();
      }, { grass, night, mixed, full, baseline });
      const shot = async scene => {
        const state = await page.evaluate(() => ({ specimens: __pods.model.specimens.length, drops: __pods.ambient.drops.length,
          podCount: __pods.ambient.drops.filter(d => d.type === 'opium_pod').length, score: document.querySelector('#garden-score').textContent,
          accepted: __pods.model.counts.acceptedLive, spriteIdentity: __pods.view.byId.get(__pods.source.id) === __pods.sprite }));
        assert.equal(state.podCount, baseline ? 0 : 1); assert.equal(state.score, 'Score: 0'); assert.equal(state.accepted, 0); assert(state.spriteIdentity);
        await page.locator('#view canvas').screenshot({ path: path.join(output, `${name}-${scene}.png`) }); report.scenes.push({ page: name, scene, ...state });
      };
      await seed(); await shot('poppy-and-pod-day'); await seed(true); await shot('dense-grass-day');
      await seed(true, true); await shot('dense-grass-night'); await seed(true, false, true); await shot('mixed-drops');
      await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(() => __pods.app.render()); await shot('mobile');
      await page.setViewportSize({ width: 1280, height: 960 });
      const click = async target => { await page.locator('#view canvas').scrollIntoViewIfNeeded(); const point = await page.evaluate(target => {
        const f=__pods,p=target==='pod'?f.ambient.drops.find(d=>d.type==='opium_pod'):{x:(f.source.column+.5)*30,y:(f.source.row+.5)*30};
        const r=f.app.canvas.getBoundingClientRect(),s=f.app.renderer.screen,root=f.view.root;
        return {x:r.left+(root.position.x+p.x*root.scale.x)*r.width/s.width,y:r.top+(root.position.y+p.y*root.scale.y)*r.height/s.height};
      }, target); await page.mouse.click(point.x, point.y); };
      if (!baseline) {
        await seed(true); await click('parent'); assert.match(await page.locator('#specimen-card-title').textContent(), /Opium poppy/);
        const identity = await page.evaluate(() => JSON.stringify([__pods.source,__pods.model.counts,__pods.model.recentEvents]));
        await click('pod'); assert.equal(await page.locator('#collection-message').textContent(), 'You collected an opium pod. +0 points');
        assert.equal(await page.evaluate(() => JSON.stringify([__pods.source,__pods.model.counts,__pods.model.recentEvents])), identity);
        assert.equal(await page.evaluate(() => __pods.model.specimens.includes(__pods.source)), true);
        await seed(true); await page.evaluate(() => { __pods.ambient.clear(); __pods.ambient.scheduleLooseDrop(__pods.source,'opium_pod',()=>.5,Date.now());
          Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__podNow+=3000;
          Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__pods.app.stop(); });
        assert.equal(await page.evaluate(() => __pods.ambient.pendingDrops.size + __pods.ambient.drops.length), 0);
        if (name === 'diagnostic') for (const mode of ['pending','active','mixed','cap','cancel','hidden','expiry','reset']) {
          await page.locator(`#seed-opium-${mode}`).click(); assert.equal(await page.evaluate(() => __pods.model.counts.acceptedLive), 0);
        }
      }
      await seed(true, false, true, true);
      const resources = await page.evaluate(() => ({ frames: __pods.cache.frames.size, sourceCount: new Set([...__pods.cache.frames.values()].map(t=>t.source)).size,
        dimensions: __pods.bakes.map(b=>[b.width,b.height]), bakes: __pods.bakes.length, streams: __pods.streams,
        podSprites: [...__pods.av.dropViews.values()].filter(r=>r.item.type==='opium_pod').length, dropSprites: __pods.av.dropViews.size,
        constructionContextsReleased: __pods.contexts.every(c=>c.destroyed) }));
      assert.equal(resources.frames, baseline ? 13 : 23); assert.equal(resources.bakes, 5); assert.equal(resources.streams, 1); assert.equal(resources.sourceCount, 1);
      assert.deepEqual(resources.dimensions[2], [baseline ? 416 : 736, 32]); if (!baseline) assert(resources.constructionContextsReleased);
      report.resources.push({ page: name, ...resources });
      report.timing.push({ page: name, ...await page.evaluate(async () => {
        const times = [], intervals = []; let last; const geometry=__pods.geometry;
        for(let i=0;i<90;i++){await new Promise(resolve=>requestAnimationFrame(resolve));const start=performance.now();if(last!==undefined)intervals.push(start-last);last=start;
          __pods.av.animate(Date.now());__pods.app.render();times.push(performance.now()-start);}
        if(__pods.geometry!==geometry)throw Error('Recurring geometry');
        const start=performance.now();for(let i=0;i<1000;i++)__pods.ambient.tick(Date.now());
        const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;return {meanSubmitMs:mean(times),meanFrameMs:mean(intervals),meanAmbientTickMs:(performance.now()-start)/1000};
      }) });
      if (!baseline) for (let i = 0; i < 20; i++) {
        await seed(true, false, true); assert.equal(await page.evaluate(() => __pods.bakes.length), resources.bakes);
        await page.evaluate(() => { const sprites=[...__pods.av.dropViews.values()].map(r=>r.sprite);__pods.ambient.clear();
          if(!sprites.every(s=>s.destroyed))throw Error('Drop Sprite leak'); });
      }
      await seed(true); await page.evaluate(() => { __podNow+=20000;__pods.ambient.tick(Date.now()); });
      assert.equal(await page.evaluate(() => __pods.av.dropViews.size), 0);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      assert.equal(await page.evaluate(() => __pods.av.dropViews.size + __pods.ambient.pendingDrops.size), 0);
      assert.equal(await page.evaluate(() => __pods.bakes.every(b=>b.source.destroyed)), true); await page.close();
    }
    assert.deepEqual(errors, []); await fs.writeFile(path.join(output, 'review.json'), JSON.stringify(report, null, 2));
    if (!baseline) await fs.writeFile(path.join(root,'artifacts/opium-pods/index.html'), `<!doctype html><meta charset="utf-8"><title>Opium pod review</title>
      <style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#c4dbb5}figure{margin:12px 0;overflow:auto}img{max-width:none}summary{cursor:pointer;padding:12px}</style>
      <h1>Loose opium pods · local simulated fixtures</h1><p>Original-size captures. The capsule appears beside the center poppy. Collection leaves the parent unchanged. Mobile uses the fitted whole garden.</p>
      <p><a href="before/review.json">Baseline resources/CPU</a> · <a href="after/review.json">Feature resources/CPU</a></p>
      ${['homepage','diagnostic'].map(page=>`<h2>${page}</h2>${['poppy-and-pod-day','dense-grass-day','dense-grass-night','mixed-drops','mobile'].map((scene,i)=>`<details ${i===0?'open':''}><summary>${scene}</summary><figure><a href="after/${page}-${scene}.png"><img src="after/${page}-${scene}.png" alt="${page} ${scene}"></a></figure></details>`).join('')}`).join('')}`);
    console.log('PASS: pod WebGL screenshots/input, shared atlas/cap/expiry/hidden/reset ownership and CPU:', JSON.stringify(report));
  } finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
