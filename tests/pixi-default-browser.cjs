// Optional real-Chrome/pixel regression. Uses an already available Playwright runtime;
// installs nothing and adds no application dependencies. Run with --run (see PIXI-LIVE.md).
// --unversioned is a negative control: it must reproduce the black cached-script homepage.
if (!process.argv.includes('--run')) {
  console.log('SKIP: optional Chrome cache/pixel test; pass --run with Playwright available.');
} else {
  run().catch(error => { console.error(error); process.exitCode = 1; });
}

async function run() {
  const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs/promises');
  const path = require('node:path'), {execFileSync} = require('node:child_process'), {inflateSync} = require('node:zlib');
  const {chromium} = require('playwright');
  const root = path.resolve(__dirname, '..'), assets = path.join(root, 'wwwroot');
  const checkpoint = '61090b7529b275e849b7fbad4e5fd3dcbead9d59';
  const legacy = new Map(['pixi-live.js','pixi-live.css'].map(file => [file,
    execFileSync('git', ['show', `${checkpoint}:wwwroot/${file}`], {cwd:root})]));
  const unversioned = process.argv.includes('--unversioned');
  const output = path.join(root, 'artifacts', unversioned ? 'homepage-negative' : 'homepage-browser');
  await fs.mkdir(output, {recursive:true});
  let promoted = false, connections = 0;
  const streams = new Set(), requests = [];
  const capture = `window.__gardenAudioContexts = []; window.__gardenAudioTones = []; window.__gardenAudioGains = [];
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) { super(...args); window.__gardenAudioContexts.push(this); }
      createOscillator() { const node = super.createOscillator(); window.__gardenAudioTones.push(node); return node; }
      createGain() { const node = super.createGain(); node.testSchedules = [];
        const set = node.gain.setValueAtTime.bind(node.gain);
        node.gain.setValueAtTime = (value, time) => { node.testSchedules.push({value,time}); return set(value,time); };
        window.__gardenAudioGains.push(node); return node; }
    };
    const createGnomes = PacketGardenGnomes.createModel;
    PacketGardenGnomes.createModel = (...args) => (window.__gardenTestGnomes = createGnomes(...args));
    const createStorm = PacketGardenPixiStorm.createModel;
    PacketGardenPixiStorm.createModel = (...args) => (window.__gardenTestStorm = createStorm(...args));
    const init = PIXI.Application.prototype.init;
    PIXI.Application.prototype.init = function(...args) {
      window.__gardenTestApp = this; window.__gardenTestPaints = 0;
      const render = this.render;
      window.__gardenTestRenderMs = [];
      this.render = function(...args) { const at = performance.now(); window.__gardenTestPaints++;
        const value = render.apply(this,args); if (window.__gardenTestRenderMs.length < 240) window.__gardenTestRenderMs.push(performance.now()-at); return value; };
      if (new URLSearchParams(location.search).has('fail-init')) return Promise.reject(new Error('WebGL unavailable (test)'));
      return init.apply(this,args);
    };`;
  // A test-only HTTP origin reproduces normal browser caching. Playwright routing
  // would disable HTTP caching and miss this bug. No production server code is changed.
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost'), file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      requests.push({url:req.url, promoted});
      if (file === 'favicon.ico') { res.writeHead(204); res.end(); return; }
      if (file === '__capture.js') { res.setHeader('Content-Type','text/javascript'); res.end(capture); return; }
      if (file === 'api/garden/events') {
        connections++; streams.add(res); res.on('close', () => streams.delete(res));
        res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
        res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"eventsLastHour":null,"hasSnapshot":false}\n\n'); return;
      }
      if (!promoted && legacy.has(file)) {
        res.writeHead(200, {'Content-Type':file.endsWith('.js') ? 'text/javascript' : 'text/css',
          'Last-Modified':new Date(Date.now()-5*86400000).toUTCString(), ETag:'"phase1a"'});
        res.end(legacy.get(file)); return;
      }
      const absolute = path.resolve(assets, file);
      if (!absolute.startsWith(assets + path.sep)) { res.writeHead(404); res.end(); return; }
      let body = await fs.readFile(absolute);
      if (file.endsWith('.html')) {
        let html = body.toString();
        // Warm the checkpoint's original unversioned URLs, even when the current
        // diagnostic page has acquired a newer artwork asset version.
        if (!promoted && file === 'pixi-live.html') html = html.replace(/(pixi-live\.(?:js|css))\?v=[^"\s]+/g,'$1');
        if (unversioned && file === 'index.html') html = html.replace(/(pixi-live\.(?:js|css))\?v=[^"\s]+/g,'$1');
        // Capture the actual application without changing its scheduling or drawing.
        html = html.replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,
          '<script src="/__capture.js" defer></script>\n$1');
        body = Buffer.from(html);
      }
      res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'text/css');
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL || 'chrome', headless:true,
      ignoreDefaultArgs:['--autoplay-policy=no-user-gesture-required'],args:['--autoplay-policy=user-gesture-required']});
    const context = await browser.newContext({viewport:{width:1280,height:900}, deviceScaleFactor:2});
    context.setDefaultTimeout(15000);
    const warm = await context.newPage();
    await warm.goto(origin + '/pixi-live.html');
    await warm.waitForFunction(() => window.__gardenTestPaints > 2);
    await warm.getByRole('button',{name:'Seed dense garden + ecology (local simulated)',exact:true}).click();
    await warm.waitForFunction(() => window.__gardenTestApp.stage.children[0].children[6].children.length === 640);
    await warm.close();
    promoted = true;
    const broadcast = event => { for (const stream of streams) stream.write(`event: garden\ndata: ${JSON.stringify(event)}\n\n`); };
    const weather = data => { for (const stream of streams) stream.write(`event: weather\ndata: ${JSON.stringify(data)}\n\n`); };
    for (const route of ['/','/index.html']) {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(String(error.stack)));
      await page.goto(origin + route);
      console.log(`Checking cached upgrade at ${route}`);
      await page.waitForSelector('#view canvas');
      // Even an unstarted app creates a canvas: wait for a compositor screenshot,
      // then inspect its pixels, rather than treating canvas presence as success.
      const shot = await page.locator('#view canvas').screenshot({path:path.join(output,route === '/' ? 'root.png' : 'index.png')});
      const pixels = png(shot), soil = soilPixels(pixels);
      const state = await page.evaluate(() => {
        const app = window.__gardenTestApp, root = app.stage.children[0], canvas = app.canvas, rect = canvas.getBoundingClientRect();
        return {paints:window.__gardenTestPaints, started:app.ticker.started,
          backing:[canvas.width,canvas.height], css:[rect.width,rect.height],
          scale:[root.scale.x,root.scale.y], position:[root.position.x,root.position.y],
          scene:root.children.map(child => ({visible:child.visible,alpha:child.alpha})),
          soilInstructions:root.children[0].context.instructions.length, gridInstructions:root.children[1].context.instructions.length};
      });
      await fs.writeFile(path.join(output,route === '/' ? 'root.json' : 'index.json'),JSON.stringify({state,soil,errors,requests},null,2));
      assert(soil.coverage > .7 && soil.grid > .005, `blank/incorrect garden pixels: ${JSON.stringify(soil)}; errors: ${errors.join('; ')}`);
      assert(state.started && state.paints > 0); assert(state.soilInstructions && state.gridInstructions);
      assert([...state.scale,...state.position].every(Number.isFinite)); assert(state.scale.every(n => n > 0));
      assert(state.css.every(n => n > 0) && state.backing.every(n => n > 0)); assert.deepEqual(errors,[]);
      assert.equal(await page.locator('#network-events-minute').textContent(),'Waiting…');
      assert.equal(await page.locator('#network-events-hour').textContent(),'Waiting…');
      weather({level:'quiet',eventsPerMinute:29.8,eventsLastHour:4321,hasSnapshot:true});
      await page.waitForFunction(() => document.querySelector('#network-events-hour').textContent === new Intl.NumberFormat().format(4321));
      assert.equal(await page.locator('#network-events-minute').textContent(),await page.evaluate(() => new Intl.NumberFormat(undefined,{maximumFractionDigits:1}).format(29.8)));
      weather({level:'quiet',eventsPerMinute:29.8,eventsLastHour:4322,hasSnapshot:true});
      await page.waitForFunction(() => document.querySelector('#network-events-hour').textContent === new Intl.NumberFormat().format(4322));
      assert.equal(await page.locator('#garden-score').textContent(),'Score: 0');
      assert.equal(await page.locator('#sound-toggle').textContent(),'Sound: Off');
      assert.equal(await page.locator('#sound-volume').inputValue(),'12');
      assert.equal(await page.evaluate(() => __gardenAudioContexts.length),0,'no context before enable gesture');
      await page.getByRole('button',{name:'Sound: Off',exact:true}).click();
      await page.waitForFunction(() => __gardenAudioContexts.length === 1 && __gardenAudioContexts[0].state === 'running');
      // Native AudioParam.value can retain a rendered quantum's value while the
      // graph is inactive. Check the actual scheduled target, not that stale getter.
      await page.waitForFunction(() => __gardenAudioGains[0].testSchedules.at(-1).value===.12);
      broadcast({specimenType:'flower',listenPort:53,vigor:2,sensor:'browser-fixture',seenCount:'12'});
      await page.waitForFunction(() => window.__gardenTestApp.stage.children[0].children[6].children.length === 1);
      await page.waitForFunction(() => __gardenAudioTones.length === 1);
      await page.waitForFunction(before => window.__gardenTestPaints > before+2,state.paints);
      const point = await specimenPoint(page);
      const grown = png(await page.locator('#view canvas').screenshot());
      let changed = 0;
      for (let y = Math.max(0,point.pixelY-12); y < Math.min(grown.height,point.pixelY+12); y++) {
        for (let x = Math.max(0,point.pixelX-12); x < Math.min(grown.width,point.pixelX+12); x++) {
          if (Math.abs(grown.data[(y*grown.width+x)*grown.channels+1]-pixels.data[(y*pixels.width+x)*pixels.channels+1]) > 5) changed++;
        }
      }
      assert(changed > 5, 'SSE insertion must change displayed specimen pixels');
      for (const viewport of [{width:320,height:700},{width:390,height:844},{width:1280,height:900}]) {
        await page.setViewportSize(viewport);
        await page.waitForFunction(() => {
          const app=window.__gardenTestApp,r=document.querySelector('#view').getBoundingClientRect();
          return app.renderer.screen.width===Math.round(r.width) && app.renderer.screen.height===Math.round(r.height);
        });
        const hit = await specimenPoint(page); await page.mouse.click(hit.x,hit.y);
        await page.getByRole('heading',{name:'Flower',exact:true}).waitFor();
        assert.equal(await page.locator('#specimen-sensor').textContent(),'browser-fixture');
        await page.getByRole('button',{name:'Close specimen information'}).click();
        assert(soilPixels(png(await page.locator('#view canvas').screenshot())).coverage > .7);
        assert(await page.locator('.network-activity').isVisible());
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow from activity section');
        if (viewport.width === 320) await page.screenshot({path:path.join(output,route === '/' ? 'root-small-stats.png' : 'index-small-stats.png')});
      }
      const beforeReconnect = connections;
      assert.equal(await page.evaluate(() => __gardenAudioTones.length),1,'inspection and resizing are silent');
      await page.getByRole('button',{name:'Sound: On',exact:true}).click();
      assert.equal(await page.evaluate(() => __gardenAudioGains[0].testSchedules.at(-1).value),0,'Off immediately schedules master mute');
      for (const stream of streams) stream.destroy();
      await page.waitForFunction(() => document.querySelector('#connection').textContent === 'disconnected/reconnecting');
      await page.waitForFunction(() => document.querySelector('#connection').textContent === 'connected',null,{timeout:15000});
      assert(connections > beforeReconnect);
      weather({level:'quiet',eventsPerMinute:0});
      await page.waitForFunction(() => document.querySelector('#network-events-hour').textContent === 'Unavailable');
      assert.equal(await page.locator('#network-events-minute').textContent(),'0');
      weather({level:'quiet',eventsPerMinute:0,eventsLastHour:0});
      await page.waitForFunction(() => document.querySelector('#network-events-hour').textContent === '0');
      broadcast({specimenType:'flower',listenPort:53,vigor:0,sensor:'reconnected',seenCount:'2'});
      await page.waitForFunction(() => window.__gardenTestApp.stage.children[0].children[6].children.length === 2);
      assert.equal(await page.evaluate(() => __gardenAudioTones.length),1,'muted growth and reconnect are silent');
      weather({level:'botnet_thunderstorm',eventsPerMinute:10000,eventsLastHour:4323});
      await page.waitForFunction(()=>__gardenTestStorm.nextAt<Infinity);
      assert.equal(await page.locator('#trigger-lightning').count(),0,'no production forced trigger');
      const deadline=await page.evaluate(()=>__gardenTestStorm.nextAt);
      weather({level:'botnet_thunderstorm',eventsPerMinute:10000,eventsLastHour:4324});
      await page.waitForFunction(()=>document.querySelector('#network-events-hour').textContent===new Intl.NumberFormat().format(4324));
      assert.equal(await page.evaluate(()=>__gardenTestStorm.nextAt),deadline,'hour-only update does not reschedule lightning');
      await page.evaluate(()=>__gardenTestStorm.trigger());await page.waitForFunction(()=>__gardenTestApp.stage.children[0].children.at(-1).alpha>0);
      await page.locator('#lightning-enabled').uncheck();assert.equal(await page.evaluate(()=>__gardenTestStorm.active),null);
      await page.locator('#lightning-enabled').check();await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>document.querySelector('#lightning-enabled').disabled);
      assert.equal(await page.evaluate(()=>__gardenTestStorm.trigger()),false);await page.emulateMedia({reducedMotion:'no-preference'});
      await page.waitForFunction(()=>!document.querySelector('#lightning-enabled').disabled);
      assert.deepEqual(errors,[]); await page.close();
    }
    assert(requests.some(r => r.promoted && /^\/pixi-live\.js\?v=/.test(r.url)));
    assert(requests.some(r => r.promoted && /^\/pixi-live\.css\?v=/.test(r.url)));
    const diagnostic = await context.newPage();
    const diagnosticErrors=[]; diagnostic.on('pageerror',error=>diagnosticErrors.push(String(error.stack)));
    await diagnostic.goto(origin + '/pixi-live.html');
    assert.equal(await diagnostic.evaluate(() => __gardenAudioContexts.length),0);
    await diagnostic.getByRole('button',{name:'Sound: Off',exact:true}).click();
    await diagnostic.waitForFunction(() => __gardenAudioContexts.length === 1 && __gardenAudioContexts[0].state === 'running');
    await diagnostic.getByRole('slider',{name:'Growth sound volume'}).fill('25');
    await diagnostic.waitForFunction(() => __gardenAudioGains[0].testSchedules.at(-1).value===.25);
    await diagnostic.getByLabel('Weather source',{exact:true}).selectOption('manual');
    await diagnostic.getByLabel('Manual weather',{exact:true}).selectOption('botnet_hurricane');
    await diagnostic.getByRole('button',{name:'Seed dense garden + ecology (local simulated)',exact:true}).click();
    await diagnostic.waitForFunction(() => document.querySelector('#hud').textContent.includes('Specimens 640/640') && document.querySelector('#hud').textContent.includes('rain particles 400'));
    assert.equal(await diagnostic.evaluate(() => __gardenAudioTones.length),0,'native dense fixture seeding is silent');
    const soundOn=await sample(diagnostic);
    await diagnostic.getByRole('button',{name:'Sound: On',exact:true}).click();
    const soundOff=await sample(diagnostic);
    await diagnostic.getByRole('button',{name:'Sound: Off',exact:true}).click();
    const soundOnAgain=await sample(diagnostic);
    const timing={scene:'640 mixed specimens + dense ecology + manual hurricane; no incoming growth',soundOn,soundOff,soundOnAgain};
    await fs.writeFile(path.join(output,'audio-timing.json'),JSON.stringify(timing,null,2)); console.log(JSON.stringify(timing));
    assert.equal(await diagnostic.evaluate(() => __gardenAudioContexts.length),1);
    await diagnostic.getByRole('button',{name:'Seed overlap fixture (local simulated)',exact:true}).click();
    for(const [layer,message] of [[8,'You caught a ladybug. +0 points'],[7,'You found Amanita muscaria. +0 points'],[6,'You collected some weed. +0 points']]) {
      const point=await diagnostic.evaluate(index=>{
        const app=__gardenTestApp,root=app.stage.children[0],sprite=root.children[index].children[0],r=app.canvas.getBoundingClientRect();
        return {x:r.left+(root.position.x+sprite.position.x*root.scale.x)*r.width/app.renderer.screen.width,
          y:r.top+(root.position.y+(sprite.position.y-(index===6?12:0))*root.scale.y)*r.height/app.renderer.screen.height};
      },layer);
      await diagnostic.mouse.click(point.x,point.y);
      await diagnostic.waitForFunction(text=>document.querySelector('#collection-message').textContent===text,message);
    }
    assert.equal(await diagnostic.evaluate(() => __gardenAudioTones.length),3,'one quiet tone per successful collection');
    assert.equal(await diagnostic.locator('#garden-score').textContent(),'Score: 0');
    await checkGnomes(diagnostic,broadcast);
    await checkStorm(diagnostic);
    await diagnostic.setViewportSize({width:320,height:700});
    await diagnostic.waitForFunction(()=>__gardenTestApp.renderer.screen.width===Math.round(document.querySelector('#view').getBoundingClientRect().width));
    assert(await diagnostic.locator('#sound-toggle').isVisible()); assert(await diagnostic.locator('#sound-volume').isVisible());
    await diagnostic.screenshot({path:path.join(output,'diagnostic-audio-small.png')});
    assert(await diagnostic.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'diagnostic audio controls fit narrow viewport');
    assert.deepEqual(diagnosticErrors,[]);
    await diagnostic.close();
    const canvas = await context.newPage(); await canvas.goto(origin + '/canvas.html');
    await canvas.getByRole('button',{name:'Generate fake DNS event',exact:true}).click();
    assert.match(await canvas.locator('#garden-status').textContent(),/1 flower/); await canvas.close();
    const stress = await context.newPage(); await stress.goto(origin + '/pixi-stress.html');
    await stress.waitForFunction(() => document.querySelector('#hud').textContent.includes('WEBGL'));
    await stress.getByRole('combobox',{name:'Scene',exact:true}).selectOption('vines'); await stress.close();
    const unsupported = await context.newPage();
    await unsupported.goto(origin + '/?fail-init=1');
    await unsupported.waitForFunction(() => document.querySelector('#connection').textContent.startsWith('Garden initialization failed:'));
    assert(await unsupported.locator('#connection').isVisible());
    assert(await unsupported.getByRole('link',{name:'Canvas garden',exact:true}).isVisible());
    await unsupported.close();
    console.log('PASS: real Chrome HTTP-cache upgrade, root/index pixels/SSE/stats/resize/reconnect, user-gesture-only native audio activation/volume/mute, silent inspection/dense fixtures, three collection cues, 320px controls, diagnostic/Canvas/stress pages.');
  } finally {
    if (browser) await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }

  async function specimenPoint(page) {
    return page.evaluate(() => {
      const app=window.__gardenTestApp,root=app.stage.children[0],sprite=root.children[6].children[0],r=app.canvas.getBoundingClientRect();
      const x=root.position.x+sprite.position.x*root.scale.x,y=root.position.y+(sprite.position.y-12)*root.scale.y;
      return {x:r.left+x*r.width/app.renderer.screen.width,y:r.top+y*r.height/app.renderer.screen.height,
        pixelX:Math.round(x*app.canvas.width/app.renderer.screen.width),pixelY:Math.round(y*app.canvas.height/app.renderer.screen.height)};
    });
  }
  async function sample(page) {
    return page.evaluate(()=>new Promise(resolve=>{
      const app=__gardenTestApp,intervals=[];let last=null;__gardenTestRenderMs=[];
      const tones=__gardenAudioTones.length;
      const tick=t=>{if(last!==null)intervals.push(t.lastTime-last);last=t.lastTime;if(intervals.length<120)return;
        app.ticker.remove(tick);
        const stats=values=>({average:values.reduce((a,b)=>a+b,0)/values.length,worst:Math.max(...values)});
        resolve({frameMs:stats(intervals),cpuSubmissionMs:stats(__gardenTestRenderMs),frames:intervals.length,
          newAudioNodes:__gardenAudioTones.length-tones});};app.ticker.add(tick);
    }));
  }
  async function checkGnomes(page,broadcast) {
    const trigger=()=>page.getByRole('button',{name:'Trigger Gnome Incident (simulated)',exact:true}).click();
    const quiet=()=>page.getByLabel('Manual weather',{exact:true}).selectOption('quiet');
    const clear=()=>page.getByRole('button',{name:'Clear garden',exact:true}).click();
    const tones=()=>page.evaluate(()=>__gardenAudioTones.length);
    async function age(ms) {
      await page.evaluate(age=>{
        const m=__gardenTestGnomes,createdAt=Date.now()-age;
        m.incident.createdAt=createdAt;for(const actor of m.actors)actor.createdAt=createdAt;m.advance(Date.now());
      },ms);
      const paints=await page.evaluate(()=>__gardenTestPaints);
      await page.waitForFunction(n=>__gardenTestPaints>n+1,paints);
    }
    const actors=()=>page.evaluate(()=>({count:__gardenTestGnomes.actors.length,phase:__gardenTestGnomes.incident?.phase??'idle',
      winner:__gardenTestGnomes.incident?.winner??null}));
    const objects=()=>page.evaluate(()=>{
      const count=n=>1+(n.children??[]).reduce((total,child)=>total+count(child),0);return count(__gardenTestApp.stage);
    });
    const resize=async(width,height)=>{await page.setViewportSize({width,height});await page.waitForFunction(()=>
      __gardenTestApp.renderer.screen.width===Math.round(document.querySelector('#view').getBoundingClientRect().width));};
    await clear();await trigger();assert.equal((await actors()).count,0,'dev trigger preserves minimum thirty');
    assert.match(await page.locator('#gnome-test-status').textContent(),/Requires at least 30/);
    await page.getByRole('button',{name:'Sound: On',exact:true}).click();
    for(let i=0;i<30;i++)broadcast({specimenType:'broadleaf',listenPort:443,vigor:0});
    await page.waitForFunction(()=>__gardenTestApp.stage.children[0].children[6].children.length===30);
    await quiet();await page.evaluate(()=>__gardenTestGnomes.resetCadence());
    const quietIdle=await sample(page),idleObjects=await objects(),mutedTones=await tones();
    await trigger();assert.deepEqual(await actors(),{count:4,phase:'approach',winner:null});
    await trigger();assert.equal((await actors()).count,4,'no overlapping incident');
    assert.equal(await objects(),idleObjects+5,'four sprites plus one transient group');
    const quietActive=await sample(page);
    await page.locator('#view canvas').screenshot({path:path.join(output,'gnomes-quiet-approach.png')});
    const targets=await page.evaluate(()=>__gardenTestGnomes.actors.map(a=>[a.startX,a.startY,a.targetX,a.targetY]));
    await resize(720,700);assert.deepEqual(await page.evaluate(()=>__gardenTestGnomes.actors.map(a=>[a.startX,a.startY,a.targetX,a.targetY])),targets);
    await resize(1280,900);
    await age(4000);assert.equal((await actors()).phase,'battle');
    await page.locator('#view canvas').screenshot({path:path.join(output,'gnomes-battle.png')});
    await age(7500);assert.deepEqual(await actors(),{count:4,phase:'result',winner:'green'});
    await age(10000);assert.equal((await actors()).count,2);
    await page.locator('#view canvas').screenshot({path:path.join(output,'gnomes-green-celebrate.png')});
    await age(12000);assert.deepEqual(await actors(),{count:0,phase:'idle',winner:null});assert.equal(await objects(),idleObjects);
    assert.equal(await tones(),mutedTones,'Off suppresses gnome cues');
    await page.getByRole('button',{name:'Sound: Off',exact:true}).click();
    await trigger();await age(4000);assert.equal(await tones(),mutedTones+1,'one existing battle cue');
    await age(4500);assert.equal(await tones(),mutedTones+1);
    await age(7500);assert.equal((await actors()).winner,'red');assert.equal(await tones(),mutedTones+4,'existing three-tone victory cue');
    await age(10000);await age(12000);assert.equal(await tones(),mutedTones+4);
    assert.equal(await page.evaluate(()=>__gardenAudioContexts.length),1,'gnomes reuse shared context');
    await trigger();await clear();assert.equal((await actors()).count,0,'garden clear releases actors');
    await page.getByRole('button',{name:'Sound: On',exact:true}).click();
    await page.getByRole('button',{name:'Seed dense garden + ecology (local simulated)',exact:true}).click();
    await page.getByLabel('Manual weather',{exact:true}).selectOption('botnet_hurricane');
    await page.evaluate(()=>__gardenTestGnomes.resetCadence());
    const hurricaneIdle=await sample(page),denseObjects=await objects();
    await trigger();const hurricaneActive=await sample(page);assert.equal(await objects(),denseObjects+5);
    await age(4000);await page.locator('#view canvas').screenshot({path:path.join(output,'gnomes-hurricane-battle.png')});
    await age(12000);assert.equal(await objects(),denseObjects);
    await page.getByRole('button',{name:'Sound: Off',exact:true}).click();
    await trigger();const beforeHidden=await tones();
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
      __gardenTestGnomes.incident.createdAt=Date.now()-20000;});
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
    assert.equal((await actors()).count,0);assert.equal(await tones(),beforeHidden,'suspended completion does not replay cues');
    const results={quietIdle,quietActive,hurricaneIdle,hurricaneActive,extraDisplayObjects:5,atlasFrames:12,
      atlasBacking:[768,64],estimatedAtlasRgbaBytes:768*64*4};
    await fs.writeFile(path.join(output,'gnome-timing.json'),JSON.stringify(results,null,2));console.log('Gnome timing:',JSON.stringify(results));
  }
  async function checkStorm(page) {
    const weather=level=>page.getByLabel('Manual weather',{exact:true}).selectOption(level);
    const trigger=()=>page.getByRole('button',{name:'Trigger Lightning (simulated)',exact:true}).click();
    const active=()=>page.evaluate(()=>Boolean(__gardenTestStorm.active));
    await page.getByRole('button',{name:'Sound: On',exact:true}).click();
    await weather('heavy_rain');await trigger();assert.equal(await active(),false,'heavy rain never illuminates');
    await weather('quiet');const quiet=await sample(page),results={quiet};
    const average=shot=>{let total=0;for(let i=0;i<shot.width*shot.height;i++)total+=shot.data[i*shot.channels]+shot.data[i*shot.channels+1]+shot.data[i*shot.channels+2];return total/(shot.width*shot.height*3);};
    for(const level of ['botnet_thunderstorm','botnet_hurricane']) {
      await weather(level);await page.evaluate(()=>__gardenTestGnomes.resetCadence());
      const before=png(await page.locator('#view canvas').screenshot({path:path.join(output,`${level}-inactive.png`)}));
      const idle=await sample(page);await trigger();assert(await active());
      const moving=await sample(page);assert.equal(await page.evaluate(()=>__gardenTestApp.stage.children[0].children.at(-1).texture.source.width),256);
      // A second normal sequence provides a screenshot near its single smooth peak.
      await page.evaluate(()=>__gardenTestStorm.reset());await trigger();
      await page.waitForFunction(()=>Date.now()-__gardenTestStorm.active.createdAt>=950);
      const after=png(await page.locator('#view canvas').screenshot({path:path.join(output,`${level}-glow.png`)}));
      const brightening=average(after)-average(before);assert(brightening>.1,'cached cloud glow must change displayed pixels');
      results[level]={idle,active:moving,meanPixelBrightening:brightening};
      await page.evaluate(()=>__gardenTestStorm.reset());
    }
    await page.getByRole('button',{name:'Sound: Off',exact:true}).click();
    const tones=await page.evaluate(()=>__gardenAudioTones.length);await trigger();
    await page.waitForFunction(n=>__gardenAudioTones.length===n+2,tones);
    assert.equal(await page.evaluate(()=>__gardenAudioContexts.length),1);
    assert.deepEqual(await page.evaluate(()=>__gardenAudioTones.slice(-2).map(n=>n.frequency.value>0)),[true,true]);
    await weather('heavy_rain');assert.equal(await active(),false);
    await weather('botnet_thunderstorm');await trigger();const noReplay=await page.evaluate(()=>__gardenAudioTones.length);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await active(),false);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
    assert.equal(await page.evaluate(()=>__gardenAudioTones.length),noReplay);assert(await page.evaluate(()=>__gardenTestStorm.nextAt>Date.now()+59000));
    await page.emulateMedia({reducedMotion:'reduce'});await trigger();assert.equal(await active(),false);
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.querySelector('#lightning-enabled').disabled);
    await page.locator('#lightning-enabled').uncheck();await trigger();assert.equal(await active(),false);await page.locator('#lightning-enabled').check();
    results.resources={sprites:1,cachedTextures:1,backing:[256,128],estimatedRgbaBytes:256*128*4,extraRenderLoops:0};
    await fs.writeFile(path.join(output,'storm-timing.json'),JSON.stringify(results,null,2));console.log('Storm timing:',JSON.stringify(results));
  }
  // Chromium screenshot PNG decoder using only Node built-ins (8-bit RGB/RGBA).
  function png(bytes) {
    let width,height,channels; const chunks=[];
    for (let at=8;at<bytes.length;) {
      const size=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),body=bytes.subarray(at+8,at+8+size); at+=size+12;
      if(type==='IHDR'){width=body.readUInt32BE(0);height=body.readUInt32BE(4);assert.equal(body[8],8);channels=body[9]===2?3:body[9]===6?4:0;assert(channels);assert.equal(body[12],0);}
      if(type==='IDAT')chunks.push(body);
    }
    const scan=inflateSync(Buffer.concat(chunks)),stride=width*channels,data=Buffer.alloc(stride*height);let source=0;
    const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
    for(let y=0;y<height;y++){
      const filter=scan[source++];assert(filter<=4);
      for(let x=0;x<stride;x++){
        const at=y*stride+x,a=x>=channels?data[at-channels]:0,b=y?data[at-stride]:0,c=y&&x>=channels?data[at-stride-channels]:0;
        data[at]=(scan[source++]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;
      }
    }
    return {width,height,channels,data};
  }
  function soilPixels(image) {
    const scale=Math.min(image.width/960,image.height/600),left=(image.width-960*scale)/2,top=(image.height-600*scale)/2;
    let total=0,soil=0,grid=0;
    for(let y=Math.floor(top+150*scale);y<top+450*scale;y++)for(let x=Math.floor(left+240*scale);x<left+720*scale;x++){
      const at=(y*image.width+x)*image.channels,r=image.data[at],g=image.data[at+1],b=image.data[at+2];total++;
      if(r>=40&&r<=115&&g>=40&&g<=115&&b>=20&&b<=85&&r>=g-2&&g>b+10){soil++;if(r+g+b>228)grid++;}
    }
    return {coverage:soil/total,grid:grid/total};
  }
}
