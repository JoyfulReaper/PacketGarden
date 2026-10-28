// Real WebGL, native 960x600 review, frozen static-sori baseline. No synthetic SSE growth.
if (!process.argv.includes('--run')) console.log('SKIP: wirefern release Chrome review; pass --run [--baseline].');
else run().catch(error => { console.error(error); process.exitCode = 1; });
async function run() {
  const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs/promises'), path = require('node:path');
  const { execFileSync } = require('node:child_process'), { chromium } = require('playwright'), S = require('../wwwroot/pixi-wirefern-spores.js');
  const root = path.resolve(__dirname, '..'), assets = path.join(root, 'wwwroot'), baseline = process.argv.includes('--baseline'), checkpoint = '5c5746c';
  const output = path.join(root, 'artifacts/wirefern-release', baseline ? 'before' : 'after'); await fs.mkdir(output, { recursive: true });
  const old = new Map();
  if (baseline) for (const file of ['index.html', 'pixi-live.html', 'pixi-live-core.js', 'pixi-live.js', 'pixi-wirefern-spores.js'])
    old.set(file, execFileSync('git', ['show', `${checkpoint}:wwwroot/${file}`], { cwd: root }));
  const capture = `{
    const f=window.__release={bakes:[],contexts:[],geometry:0,streams:0};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface']]){
      const create=window[global][method];window[global][method]=(...args)=>{const value=create(...args);f[key]??=value;return value;};
    }
    const create=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(view,options)=>{f.view=view;return f.model=create(view,{...options,sporeRandom:()=>.9});};
    if(PacketGardenWirefernSpores.createEmissionModel){const emit=PacketGardenWirefernSpores.createEmissionModel;PacketGardenWirefernSpores.createEmissionModel=options=>(f.emissions=emit({...options,random:()=>f.checkSuccess?0:.99}));}
    for(const name of ['tile','cloudTile'])if(PacketGardenWirefernSpores[name]){const original=PacketGardenWirefernSpores[name];PacketGardenWirefernSpores[name]=(...args)=>{const g=original(...args);f.contexts.push(g.context);return g;};}
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const generate=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const start=performance.now(),t=generate(options);
        f.bakes.push({width:options.frame.width,height:options.frame.height,ms:performance.now()-start,source:t.source});return t;};return value;
    });};
    for(const name of ['clear','moveTo','bezierCurveTo','circle','stroke','fill']){const original=PIXI.Graphics.prototype[name];PIXI.Graphics.prototype[name]=function(...args){f.geometry++;return original.apply(this,args);};}
  }`;
  const server = http.createServer(async (req, res) => { try {
    const file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (file === '__release.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(capture); return; }
    if (file === 'api/garden/events') { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n'); return; }
    if (file === 'favicon.ico') { res.writeHead(204); res.end(); return; }
    const absolute = path.resolve(assets, file); if (!absolute.startsWith(assets + path.sep)) { res.writeHead(404); res.end(); return; }
    let body = old.get(file) ?? await fs.readFile(absolute);
    if (file.endsWith('.html')) body = Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/, '<script src="/__release.js" defer></script>$1'));
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(body);
  } catch (error) { res.writeHead(404); res.end(String(error)); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const errors = [], report = { baseline, checkpoint, scenes: [], resources: [], timing: [] };
  try {
    browser = await chromium.launch({ channel: process.env.PACKETGARDEN_BROWSER_CHANNEL || 'chrome', headless: true }); report.browser = browser.version();
    for (const [name, url] of [['homepage', '/'], ['diagnostic', '/pixi-live.html']]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 }); page.on('pageerror', e => errors.push(e.stack));
      await page.addInitScript(() => { window.__releaseNow = 1800000000000; Date.now = () => __releaseNow; let seed = 137;
        Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); });
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`); await page.waitForFunction(() => window.__release?.app?.ticker?.started && __release.ecology);
      await page.evaluate(() => { __release.app.stop(); const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px'; });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (name === 'diagnostic') await page.locator('#probes').uncheck();
      assert.deepEqual(await page.evaluate(()=>[__release.app.renderer.screen.width,__release.app.renderer.screen.height]),[960,600]);
      const seed = async (mode = 'single', { color = 0, grass = false, night = false, rain = false } = {}) => {
        const now = await page.evaluate(() => Date.now());
        const single = [13,16,19].map((column,i)=>({type:'wirefern',column,row:10,vigor:2,colorVariant:2,createdAt:now-65000,
          wirefernSpores:i===1?{color,layout:2}:null,origin:{kind:'simulated',eventType:'wirefern-spore-fixture'}}));
        const entries = mode === 'single' ? single : S.fixtureEntries(now,mode).map(p=>({...p,broadleafBloom:null,vineBloom:null}));
        await page.evaluate(({entries,grass,night,rain})=>{
          const f=__release,foliage=entries.map(p=>p.colorVariant);f.emissions?.clear();f.emissions?.resetCadence();f.garden.clear();f.ecology.clear();f.ecology.setAllowGrassUnderPlants(true);
          f.garden.seed(entries);entries.forEach((p,i)=>{p.colorVariant=foliage[i];f.view.update(p,f.garden.byCell);});
          f.source=entries.find(p=>p.column===16&&p.row===10&&p.wirefernSpores)??entries.find(p=>p.type==='wirefern'&&p.wirefernSpores);
          f.original=JSON.stringify([f.source,f.model.counts,f.model.recentEvents]);f.originalSprite=f.view.byId.get(f.source.id);
          if(grass)f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}))});
          f.ecology.resetCadence(Date.now());f.view.setWeather({level:rain?'rain':'quiet',eventsPerMinute:rain?1000:0});
          f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,rain?.07:0);f.app.render();
        },{entries,grass,night,rain});
      };
      const puff = async (offset=0) => page.evaluate(({offset,baseline})=>{
        const f=__release;if(!baseline){f.emissions.preview(f.source,Date.now());if(offset)__releaseNow+=offset;}
        f.view.animate(0,.016,Date.now());f.app.render();
      },{offset,baseline});
      const shot = async scene => {
        const state = await page.evaluate(()=>({plants:__release.model.specimens.length,clouds:__release.view.cloudViews?.size??0,
          score:document.querySelector('#garden-score').textContent,accepted:__release.model.counts.acceptedLive,
          sourceStable:JSON.stringify([__release.source,__release.model.counts,__release.model.recentEvents])===__release.original,
          spriteStable:__release.view.byId.get(__release.source.id)===__release.originalSprite}));
        assert.equal(state.score,'Score: 0');assert.equal(state.accepted,0);assert(state.sourceStable&&state.spriteStable);
        if(baseline)assert.equal(state.clouds,0);
        await page.locator('#view canvas').screenshot({path:path.join(output,`${name}-${scene}.png`)});report.scenes.push({page:name,scene,...state});
      };
      await seed('combinations');await shot('static-sori-actual-960');
      for(const [scene,offset] of [['cloud-appearance',0],['cloud-middle',1500],['cloud-near-end',2600]]){await seed('single');await puff(offset);await shot(scene);}
      for(const color of [0,1,2]){await seed('single',{color,grass:true});await puff(1000);await shot(`color-${color}-grass`);}
      await seed('mixed',{grass:true});await puff(1200);await shot('mixed-colony');
      await seed('single',{color:1,grass:true,night:true});await puff(1000);await shot('night');
      await seed('single',{color:2,grass:true,rain:true});await puff(1000);await shot('rain');
      await seed('single',{color:1,grass:true});await puff(1000);
      await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='';el.style.height='';});await page.setViewportSize({width:390,height:844});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>__release.app.render());await shot('mobile');
      await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await seed('dense',{grass:true});await puff(1500);await shot('dense-640');
      const resources=await page.evaluate(()=>({frames:__release.view.snapshot().textures,bakes:__release.bakes.length,
        dimensions:__release.bakes.map(b=>[b.width,b.height]),streams:__release.streams,sprites:__release.view.byId.size,
        clouds:__release.view.cloudViews?.size??0,contextsReleased:__release.contexts.every(c=>c.destroyed)}));
      assert.equal(resources.frames,baseline?828:829);assert.equal(resources.bakes,5);assert.equal(resources.streams,1);assert.equal(resources.sprites,640);
      assert.deepEqual(resources.dimensions[1],[1024,832]);assert(resources.contextsReleased);report.resources.push({page:name,...resources});
      for(const active of [0,1,2]){
        if(baseline&&active)continue;
        await page.evaluate(active=>{const f=__release;f.emissions?.clear();for(let i=0;i<active;i++)f.emissions.preview(f.source,Date.now());},active);
        const timing=await page.evaluate(async()=>{const f=__release,submit=[],animate=[],geometry=f.geometry;
          for(let i=0;i<90;i++){await new Promise(resolve=>requestAnimationFrame(resolve));let start=performance.now();f.view.animate(i/60,.016,Date.now()+i*2500/89);animate.push(performance.now()-start);
            start=performance.now();f.app.render();submit.push(performance.now()-start);}
          if(f.geometry!==geometry)throw Error('Recurring Graphics');const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
          return {meanAnimateMs:mean(animate),meanSubmitMs:mean(submit)};});
        report.timing.push({page:name,active,...timing});
      }
      if(!baseline){
        const checks=await page.evaluate(()=>{const f=__release,results=[],geometry=f.geometry;let now=Date.now();
          for(const success of [false,true]){f.checkSuccess=success;const times=[];
            for(let pass=0;pass<20;pass++){f.emissions.clear();f.emissions.resetCadence(now);for(let n=1;n<120;n++)f.emissions.tick(now+n*250);
              const start=performance.now();f.emissions.tick(now+30000);times.push(performance.now()-start);
              if(f.emissions.clouds.length!==(success?1:0))throw Error('Check benchmark outcome');}
            results.push({outcome:success?'emitted':'failed-roll',meanCheckMs:times.reduce((s,n)=>s+n,0)/times.length,maxCheckMs:Math.max(...times)});}
          f.checkSuccess=false;f.emissions.clear();f.emissions.resetCadence(Date.now());if(f.geometry!==geometry)throw Error('Emission geometry');return results;});
        for(const check of checks)report.timing.push({page:name,...check});
        for(let i=0;i<30;i++)await page.evaluate(()=>{const f=__release;f.emissions.preview(f.source,Date.now());f.emissions.preview(f.source,Date.now());
          if(f.view.cloudViews.size!==2)throw Error('Cloud cap');const sprites=[...f.view.cloudViews.values()].map(r=>r.sprite);f.emissions.clear();if(!sprites.every(s=>s.destroyed))throw Error('Sprite ownership');});
        assert.equal(await page.evaluate(()=>__release.bakes.length),resources.bakes);
        await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await seed('single',{grass:true});await puff();await shot('reduced-static');
        const pose=await page.evaluate(()=>{const f=__release,c=f.emissions.clouds[0],r=f.view.cloudViews.get(c);f.view.animate(0,.016,Date.now()+500);
          return {reduced:c.reduced,x:r.sprite.position.x-r.x,y:r.sprite.position.y-r.y,scale:r.sprite.scale.x,lifetime:c.expiresAt-c.createdAt};});
        assert.deepEqual(pose,{reduced:true,x:0,y:0,scale:.85,lifetime:1000});await page.emulateMedia({reducedMotion:'no-preference'});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.evaluate(()=>{const f=__release;f.emissions.clear();f.emissions.preview(f.source,Date.now());const cloud=f.emissions.clouds[0],sprite=f.view.cloudViews.get(cloud).sprite;
          f.model.remove(cloud.source);if(!sprite.destroyed||f.emissions.clouds.length)throw Error('Exact source cleanup');});
        await seed('single');await puff();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__releaseNow+=120000;
          Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__release.app.stop();});
        assert.equal(await page.evaluate(()=>__release.emissions.clouds.length+__release.view.cloudViews.size),0);
        assert.equal(await page.evaluate(()=>__release.emissions.snapshot().nextAt-Date.now()),30000);
        if(name==='diagnostic'){await page.locator('#wirefern-cloud-color').selectOption('2');await page.locator('#trigger-wirefern-cloud').click();
          assert.equal(await page.evaluate(()=>__release.emissions.clouds[0].color),2);await page.locator('#remove-wirefern-cloud-source').click();assert.equal(await page.evaluate(()=>__release.view.cloudViews.size),0);}
      }
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      assert.equal(await page.evaluate(()=>__release.view.byId.size),0);assert.equal(await page.evaluate(()=>__release.bakes.every(b=>b.source.destroyed)),true);await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2));
    if(!baseline)await fs.writeFile(path.join(root,'artifacts/wirefern-release/index.html'),`<!doctype html><meta charset="utf-8"><title>Wirefern release review</title>
      <style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#e2d39b}figure{margin:12px 0;overflow:auto}img{max-width:none}summary{cursor:pointer;padding:12px}</style>
      <h1>Visible sori and airborne releases</h1><p>Desktop captures are exactly 960×600, with no camera magnification. The single-source cloud rises from the center fern at column 16, row 10. Mobile uses the normal fitted garden.</p>
      <p><a href="before/review.json">Baseline resources/CPU</a> · <a href="after/review.json">Feature resources/CPU</a></p>
      ${['homepage','diagnostic'].map(page=>`<h2>${page}</h2>${['static-sori-actual-960','cloud-appearance','cloud-middle','cloud-near-end','color-0-grass','color-1-grass','color-2-grass','mixed-colony','night','rain','mobile','dense-640','reduced-static'].map((scene,i)=>`<details ${i===2?'open':''}><summary>${scene}</summary>${(scene==='reduced-static'?['after']:['before','after']).map(v=>`<figure><figcaption>${v}</figcaption><a href="${v}/${page}-${scene}.png"><img src="${v}/${page}-${scene}.png" alt="${page} ${v} ${scene}"></a></figure>`).join('')}</details>`).join('')}`).join('')}`);
    console.log('PASS: 960x600 static/cloud phases/colors/grass/night/rain/mobile/dense captures, two cached Sprite transforms, reduced/hidden/source/reset cleanup and CPU/check cost:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
