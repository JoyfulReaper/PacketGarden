// Installed Chrome/Playwright. Frozen pre-sori baseline; no simulated network growth.
if (!process.argv.includes('--run')) console.log('SKIP: wirefern sori Chrome review; pass --run [--baseline].');
else run().catch(error => { console.error(error); process.exitCode = 1; });
async function run() {
  const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs/promises'), path = require('node:path');
  const { execFileSync } = require('node:child_process'), { chromium } = require('playwright'), S = require('../wwwroot/pixi-wirefern-spores.js');
  const root = path.resolve(__dirname, '..'), assets = path.join(root, 'wwwroot'), baseline = process.argv.includes('--baseline'), checkpoint = '0719608';
  const output = path.join(root, 'artifacts/wirefern-spores', baseline ? 'before' : 'after'); await fs.mkdir(output, { recursive: true });
  const old = new Map();
  if (baseline) for (const file of ['index.html', 'pixi-live.html', 'pixi-live-core.js', 'pixi-live.js'])
    old.set(file, execFileSync('git', ['show', `${checkpoint}:wwwroot/${file}`], { cwd: root }));
  const capture = `{
    const f=window.__sori={bakes:[],contexts:[],geometry:0,streams:0};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface']]){
      const create=window[global][method];window[global][method]=(...args)=>{const value=create(...args);f[key]??=value;return value;};
    }
    const create=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(view,options)=>{f.view=view;return f.model=create(view,{...options,sporeRandom:()=>.9});};
    if(window.PacketGardenWirefernSpores){const tile=PacketGardenWirefernSpores.tile;PacketGardenWirefernSpores.tile=(...args)=>{const g=tile(...args);f.contexts.push(g.context);return g;};}
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const generate=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const start=performance.now(),t=generate(options);
        f.bakes.push({width:options.frame.width,height:options.frame.height,ms:performance.now()-start,source:t.source});return t;};return value;
    });};
    for(const name of ['clear','moveTo','bezierCurveTo','circle','stroke','fill']){const method=PIXI.Graphics.prototype[name];PIXI.Graphics.prototype[name]=function(...args){f.geometry++;return method.apply(this,args);};}
  }`;
  const server = http.createServer(async (req, res) => { try {
    const file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (file === '__sori.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(capture); return; }
    if (file === 'api/garden/events') { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n'); return; }
    if (file === 'favicon.ico') { res.writeHead(204); res.end(); return; }
    const absolute = path.resolve(assets, file); if (!absolute.startsWith(assets + path.sep)) { res.writeHead(404); res.end(); return; }
    let body = old.get(file) ?? await fs.readFile(absolute);
    if (file.endsWith('.html')) body = Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/, '<script src="/__sori.js" defer></script>$1'));
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(body);
  } catch (error) { res.writeHead(404); res.end(String(error)); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const errors = [], report = { baseline, checkpoint, scenes: [], resources: [], timing: [] };
  try {
    browser = await chromium.launch({ channel: process.env.PACKETGARDEN_BROWSER_CHANNEL || 'chrome', headless: true }); report.browser = browser.version();
    for (const [name, url] of [['homepage', '/'], ['diagnostic', '/pixi-live.html']]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 }); page.on('pageerror', e => errors.push(e.stack));
      await page.addInitScript(() => { window.__soriNow = 1800000000000; Date.now = () => __soriNow; let seed = 137;
        Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); });
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`); await page.waitForFunction(() => window.__sori?.app?.ticker?.started && __sori.ecology);
      await page.evaluate(() => __sori.app.stop()); if (name === 'diagnostic') await page.locator('#probes').uncheck();
      const at = 1800000000000;
      const entries = mode => S.fixtureEntries(at, mode).map(p => ({ ...p, broadleafBloom: null, vineBloom: null }));
      const seed = async (entries, grass = false, night = false) => page.evaluate(({ entries, grass, night }) => {
        const f=__sori,foliage=entries.map(p=>p.colorVariant);f.garden.clear();f.ecology.clear();f.ecology.setAllowGrassUnderPlants(true);f.garden.seed(entries);
        entries.forEach((p,i)=>{p.colorVariant=foliage[i];f.view.update(p,f.garden.byCell);});
        if(grass)f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}))});
        f.ecology.resetCadence(Date.now());f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);f.app.render();
      }, { entries, grass, night });
      const shot = async (scene, expected) => {
        const state=await page.evaluate(()=>({plants:__sori.garden.specimens.length,overlays:__sori.view.sporeViews?.size??0,
          accepted:__sori.model.counts.acceptedLive,score:document.querySelector('#garden-score').textContent}));
        assert.equal(state.overlays,baseline?0:expected);assert.equal(state.accepted,0);assert.equal(state.score,'Score: 0');
        await page.locator('#view canvas').screenshot({path:path.join(output,`${name}-${scene}.png`)});report.scenes.push({page:name,scene,...state});
      };
      const row = Array.from({length:9},(_,i)=>({type:'wirefern',column:4+i*3,row:10,vigor:i%4,colorVariant:2,createdAt:at-51000,
        wirefernSpores:{color:i%3,layout:Math.floor(i/3)},origin:{kind:'simulated',eventType:'wirefern-spore-fixture'}}));
      await seed(row.map(p=>({...p,wirefernSpores:null})));await shot('ordinary-no-sori',0);
      await seed(row);await shot('mature-actual-scale',9);
      // Review-only camera magnification. Production plant scales are unchanged.
      await page.evaluate(()=>{const f=__sori,r=f.view.root,p=f.view.byId.get(f.garden.specimens[4].id);f.camera=[r.scale.x,r.position.x,r.position.y];
        const scale=r.scale.x*5;r.scale.set(scale);r.position.set(f.app.renderer.screen.width/2-p.position.x*scale,f.app.renderer.screen.height/2-p.position.y*scale);f.app.render();});
      await shot('mature-closeup-5x-camera',9);
      await page.evaluate(()=>{const [scale,x,y]=__sori.camera;__sori.view.root.scale.set(scale);__sori.view.root.position.set(x,y);__sori.app.render();});
      await seed(entries('stages'));await shot('all-stages',18);
      await seed(entries('combinations'));await shot('all-180-combinations',180);
      const mixed=entries('mixed'),expected=mixed.filter(p=>p.type==='wirefern'&&p.wirefernSpores).length;
      await seed(mixed);await shot('mixed-colony',expected);await seed(mixed,true);await shot('dense-grass',expected);
      await seed(row,true,true);await shot('cyan-foliage-night',9);await seed(row.map(p=>({...p,createdAt:at-300000})),true);await shot('fading',9);
      await seed(mixed,true);await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.evaluate(()=>__sori.app.render());await shot('mobile',expected);await page.setViewportSize({width:1280,height:960});
      await seed(entries('dense'),true);await shot('full-640',640);
      report.timing.push({page:name,...await page.evaluate(async()=>{
        const submissions=[],intervals=[];let last;const geometry=__sori.geometry;
        for(let i=0;i<90;i++){await new Promise(resolve=>requestAnimationFrame(resolve));const start=performance.now();if(last!==undefined)intervals.push(start-last);last=start;
          __sori.app.render();submissions.push(performance.now()-start);}
        if(__sori.geometry!==geometry)throw Error('Recurring geometry');
        const start=performance.now();for(let i=0;i<1000;i++)__sori.model.tick(Date.now());const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
        return {meanSubmitMs:mean(submissions),meanFrameMs:mean(intervals),meanLogicalTickMs:(performance.now()-start)/1000};
      })});
      const resources=await page.evaluate(()=>({frames:__sori.view.snapshot().textures,overlays:__sori.view.sporeViews?.size??0,
        displayObjects:__sori.view.snapshot().displayObjects,specimenSprites:__sori.view.byId.size,streams:__sori.streams,bakes:__sori.bakes.length,
        dimensions:__sori.bakes.map(b=>[b.width,b.height]),constructionContextsReleased:__sori.contexts.every(c=>c.destroyed)}));
      assert.equal(resources.frames,baseline?825:828);assert.equal(resources.specimenSprites,640);assert.equal(resources.streams,1);assert.equal(resources.bakes,5);
      assert.deepEqual(resources.dimensions[1],[1024,832]);assert(resources.constructionContextsReleased);report.resources.push({page:name,...resources});
      const fadeMs=await page.evaluate(()=>{const start=performance.now();__soriNow+=249000;__sori.model.tick(Date.now());return performance.now()-start;});
      report.timing.at(-1).fullFadeTransitionMs=fadeMs;
      if(!baseline){
        assert.equal(await page.evaluate(()=>__sori.view.sporeViews.size),640);await page.emulateMedia({reducedMotion:'reduce'});
        const pose=await page.evaluate(()=>[...__sori.view.sporeViews.values()].map(s=>[s.position.x,s.position.y,s.scale.x,s.alpha,s.tint]));
        await page.evaluate(()=>{for(let i=0;i<1000;i++)__sori.view.animate(i,.016,Date.now());});
        assert.deepEqual(await page.evaluate(()=>[...__sori.view.sporeViews.values()].map(s=>[s.position.x,s.position.y,s.scale.x,s.alpha,s.tint])),pose);
        for(let i=0;i<15;i++){
          await seed(S.fixtureEntries(await page.evaluate(()=>Date.now()),'dense'),true);
          await page.evaluate(()=>{const sprites=[...__sori.view.sporeViews.values()];__sori.garden.clear();if(!sprites.every(s=>s.destroyed))throw Error('Spore Sprite leak');});
        }
        assert.equal(await page.evaluate(()=>__sori.bakes.length),resources.bakes);
        if(name==='diagnostic')for(const [mode,count] of [['stages',18],['combinations',180],['dense',640],['expiry',45],['replacement',640]]){
          await page.locator(`#seed-wirefern-spores-${mode}`).click();assert.equal(await page.evaluate(()=>__sori.view.sporeViews.size),count);
          if(mode==='replacement'){const id=await page.evaluate(()=>__sori.model.specimens[303].id);await page.locator('#replace-wirefern-spores').click();assert.equal(await page.evaluate(id=>__sori.view.sporeViews.has(id),id),false);}
        }
      }
      const now=await page.evaluate(()=>Date.now());await seed(S.fixtureEntries(now,'dense'),true);
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__soriNow+=360001;
        Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__sori.app.stop();});
      assert.equal(await page.evaluate(()=>__sori.garden.specimens.length),0);if(!baseline)assert.equal(await page.evaluate(()=>__sori.view.sporeViews.size),0);
      const fresh=await page.evaluate(()=>Date.now());await seed(S.fixtureEntries(fresh,'dense'),true);
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      assert.equal(await page.evaluate(()=>__sori.view.byId.size),0);assert.equal(await page.evaluate(()=>__sori.bakes.every(b=>b.source.destroyed)),true);await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2));
    if(!baseline)await fs.writeFile(path.join(root,'artifacts/wirefern-spores/index.html'),`<!doctype html><meta charset="utf-8"><title>Wirefern sori review</title>
      <style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#d7c193}figure{margin:12px 0;overflow:auto}img{max-width:none}summary{cursor:pointer;padding:12px}</style>
      <h1>Wirefern sori · before/after</h1><p>Native-size captures. Only the named close-up uses a 5× review camera; all other images use the ordinary whole-garden fit. Selection never changes foliage or fern size.</p>
      <p><a href="before/review.json">Baseline measurements</a> · <a href="after/review.json">Feature measurements</a></p>
      ${['homepage','diagnostic'].map(page=>`<h2>${page}</h2>${['ordinary-no-sori','mature-actual-scale','mature-closeup-5x-camera','all-stages','all-180-combinations','mixed-colony','dense-grass','cyan-foliage-night','fading','mobile','full-640'].map((scene,i)=>`<details ${i===1?'open':''}><summary>${scene}</summary>${['before','after'].map(v=>`<figure><figcaption>${v}</figcaption><a href="${v}/${page}-${scene}.png"><img src="${v}/${page}-${scene}.png" alt="${page} ${v} ${scene}"></a></figure>`).join('')}</details>`).join('')}`).join('')}`);
    console.log('PASS: wirefern sori before/after WebGL capture, actual scale/camera/colors/afterglow, 640-parent CPU/atlas/resource ownership, reduced motion/reset/hidden teardown:',JSON.stringify(report));
  } finally {await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
