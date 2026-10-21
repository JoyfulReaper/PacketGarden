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
  const puddleBaseline=process.argv.includes('--puddle-baseline');
  const puddleCheckpoint='ab1919ce100f3073bfe5aa07bd0c826a54df29da';
  const oldPuddleArt=new Map(puddleBaseline?['garden-puddles.js','pixi-live-ecology.js'].map(file=>[file,
    execFileSync('git',['show',`${puddleCheckpoint}:wwwroot/${file}`],{cwd:root})]):[]);
  const output = path.resolve(root, process.env.PACKETGARDEN_BROWSER_OUTPUT || path.join('artifacts', unversioned ? 'homepage-negative' : 'homepage-browser'));
  await fs.mkdir(output, {recursive:true});
  let promoted = false, connections = 0;
  const streams = new Set(), requests = [];
  const capture = `window.__gardenAudioContexts = []; window.__gardenAudioTones = []; window.__gardenAudioGains = [];window.__gardenAudioSources=[];
    // Test-only PCM tap after the actual output mix. Original destination stays connected.
    const nativeConnect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination,...args) {
      const result = nativeConnect.call(this,destination,...args);
      if (destination === this.context.destination && !(this instanceof ScriptProcessorNode)) {
        const tap = this.context.createScriptProcessor(2048,1,1);
        tap.onaudioprocess = event => {
          if (window.__gardenAudioRecording) __gardenAudioRecording.push(Array.from(event.inputBuffer.getChannelData(0)));
        };
        nativeConnect.call(this,tap);nativeConnect.call(tap,destination);
      }
      return result;
    };
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) { super(...args); window.__gardenAudioContexts.push(this); }
      createOscillator() { const node = super.createOscillator(); window.__gardenAudioTones.push(node); return node; }
      createBufferSource() { const node=super.createBufferSource();window.__gardenAudioSources.push(node);return node; }
      createGain() { const node = super.createGain(); node.testSchedules = [];
        const set = node.gain.setValueAtTime.bind(node.gain);
        node.gain.setValueAtTime = (value, time) => { node.testSchedules.push({value,time}); return set(value,time); };
        window.__gardenAudioGains.push(node); return node; }
    };
    const createGnomes = PacketGardenGnomes.createModel;
    const createLighting=PacketGardenLighting.createModel,createSurface=PacketGardenLightingView.createSurface;
    PacketGardenLighting.createModel=options=>(window.__gardenTestLighting=createLighting({...options,
      getLocalHour:new URLSearchParams(location.search).has('live-lighting')?PacketGardenLighting.localHour:()=>12}));
    PacketGardenLightingView.createSurface=(...args)=>(window.__gardenTestLightingSurface=createSurface(...args));
    const createGarden=PacketGardenCore.createGardenModel,createEcology=PacketGardenEcology.createEcologyModel;
    const createStillbloom=PacketGardenStillbloom.createModel;
    PacketGardenStillbloom.createModel=(...args)=>{const model=createStillbloom(...args);window.__gardenTestStillbloom??=model;return model;};
    PacketGardenCore.createGardenModel=(...args)=>{const garden=createGarden(...args);window.__gardenTestGarden??=garden;return garden;};
    PacketGardenEcology.createEcologyModel=(...args)=>(window.__gardenTestEcology=createEcology(...args));
    const makeEcologyAtlas=PacketGardenPixiEcology.makeEcologyAtlas,createEcologyView=PacketGardenPixiEcology.createEcologyView;
    window.__gardenEcologyBakes=0;
    PacketGardenPixiEcology.makeEcologyAtlas=(...args)=>{const at=performance.now();window.__gardenEcologyBakes++;
      const atlas=window.__gardenTestEcologyAtlas=makeEcologyAtlas(...args);window.__gardenEcologyBakeMs=performance.now()-at;return atlas;};
    PacketGardenPixiEcology.createEcologyView=(...args)=>(window.__gardenTestEcologyView=createEcologyView(...args));
    const createAmbient=PacketGardenAmbient.createAmbientModel;
    PacketGardenAmbient.createAmbientModel=(...args)=>(window.__gardenTestAmbient=createAmbient(...args));
    const makeAmbientAtlas=PacketGardenPixiAmbient.makeAmbientAtlas,createAmbientView=PacketGardenPixiAmbient.createAmbientView;
    window.__gardenAmbientBakes=0;
    PacketGardenPixiAmbient.makeAmbientAtlas=(...args)=>{window.__gardenAmbientBakes++;return window.__gardenTestAmbientAtlas=makeAmbientAtlas(...args);};
    PacketGardenPixiAmbient.createAmbientView=(...args)=>(window.__gardenTestAmbientView=createAmbientView(...args));
    if(window.PacketGardenFrogs){
      const createFrogs=PacketGardenFrogs.createModel,frogRandom=PacketGardenFrogs.seededRandom(731),createFrogView=PacketGardenPixiAmbient.createFrogView;
      // Isolate unrelated regression fixtures from chance; diagnostic planning uses its own fixed stream.
      PacketGardenFrogs.createModel=options=>(window.__gardenTestFrogs=createFrogs({...options,
        random:()=>window.__frogPlanning||new URLSearchParams(location.search).has('puddle-art')?frogRandom():.99}));
      PacketGardenPixiAmbient.createFrogView=(...args)=>(window.__gardenTestFrogView=createFrogView(...args));
    }
    const createGnomeView=PacketGardenPixiGnomes.createGnomeView,makeGnomeAtlas=PacketGardenPixiGnomes.makeGnomeAtlas;
    window.__gardenGnomeBakes=0;
    PacketGardenPixiGnomes.makeGnomeAtlas=(...args)=>{window.__gardenGnomeBakes++;return window.__gardenTestGnomeAtlas=makeGnomeAtlas(...args);};
    PacketGardenPixiGnomes.createGnomeView=(...args)=>(window.__gardenTestGnomeView=createGnomeView(...args));
    PacketGardenGnomes.createModel = options => (window.__gardenTestGnomes = createGnomes({...options,puddleRandom:()=>.99}));
    const createStorm = PacketGardenPixiStorm.createModel;
    PacketGardenPixiStorm.createModel = options => (window.__gardenTestStorm = createStorm({...options,random:PacketGardenPixi.seededRandom(77332)}));
    const createStormView = PacketGardenPixiStorm.createView;
    window.__gardenStrikeBuildMs=[];
    PacketGardenPixiStorm.createView = (...args) => {
      const view=createStormView(...args),change=view.change;
      view.change=event=>{const start=performance.now();change(event);if(event)__gardenStrikeBuildMs.push(performance.now()-start);};
      return window.__gardenTestStormView=view;
    };
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
      if(file==='__puddle-canvas.js'){res.setHeader('Content-Type','text/javascript');res.end(`{
        const create=PacketGardenFrogs.createModel,random=PacketGardenFrogs.seededRandom(731);
        PacketGardenFrogs.createModel=options=>create({...options,random});
      }`);return;}
      if (file === '__capture.js') { res.setHeader('Content-Type','text/javascript');
        // The historical warm atlas only knows network species. New ambient art
        // is tested after promotion; it must not break the cache regression setup.
        res.end((promoted?'':'PacketGardenPixiLiveCore.species=PacketGardenPixiLiveCore.eventSpecies;\n')+capture);return; }
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
      let body = oldPuddleArt.get(file) ?? await fs.readFile(absolute);
      if (file.endsWith('.html')) {
        let html = body.toString();
        // Warm the checkpoint's original unversioned URLs, even when the current
        // diagnostic page has acquired a newer artwork asset version.
        if (!promoted && file === 'pixi-live.html') html = html.replace(/(pixi-live\.(?:js|css))\?v=[^"\s]+/g,'$1');
        if (unversioned && file === 'index.html') html = html.replace(/(pixi-live\.(?:js|css))\?v=[^"\s]+/g,'$1');
        // Capture the actual application without changing its scheduling or drawing.
        html = html.replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,
          '<script src="/__capture.js" defer></script>\n$1');
        if(file==='canvas.html'&&url.searchParams.has('puddle-art'))html=html.replace(/(<script src="garden\.js(?:\?[^"]*)?" defer)/,
          '<script src="/__puddle-canvas.js" defer></script>\n$1');
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
    if(process.argv.includes('--gnome-puddles-only')){promoted=true;await checkGnomePuddles();return;}
    if(process.argv.includes('--puddle-art-only')){promoted=true;await checkPuddleArt();return;}
    if(process.argv.includes('--frogs-only')){promoted=true;await checkFrogs();return;}
    if(process.argv.includes('--gnome-harvest-only')){promoted=true;await checkHarvest();return;}
    if(process.argv.includes('--weed-bud-only')){
      promoted=true;const page=await context.newPage();await page.goto(origin+'/pixi-live.html');
      await page.waitForFunction(()=>window.__gardenTestAmbient);await checkWeedBuds(page);await page.close();return;
    }
    if(process.argv.includes('--stillbloom-only')){
      promoted=true;const page=await context.newPage();await page.goto(origin+'/pixi-live.html');
      await page.waitForFunction(()=>window.__gardenTestStillbloom);await checkStillbloom(page);await page.close();return;
    }
    const warm = await context.newPage();
    await warm.goto(origin + '/pixi-live.html');
    await warm.waitForFunction(() => window.__gardenTestPaints > 2);
    await warm.getByRole('button',{name:'Seed dense garden + ecology (local simulated)',exact:true}).click();
    await warm.waitForFunction(() => window.__gardenTestApp.stage.children[0].children[6].children.length === 640);
    await warm.close();
    promoted = true;
    if(process.argv.includes('--lighting-only')) {
      const page=await context.newPage();await page.goto(origin+'/pixi-live.html');
      await page.waitForFunction(()=>window.__gardenTestLighting?.state);await checkLighting(page);await page.close();return;
    }
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
      await checkGrass(page,route==='/'?'root':'index');
      await page.getByRole('button',{name:'Sound: Off',exact:true}).click();
      await page.waitForFunction(() => __gardenAudioContexts.length === 1 && __gardenAudioContexts[0].state === 'running');
      // Native AudioParam.value can retain a rendered quantum's value while the
      // graph is inactive. Check the actual scheduled target, not that stale getter.
      await page.waitForFunction(() => __gardenAudioGains[0].testSchedules.at(-1).value===2*.12**1.25);
      await page.evaluate(()=>{const at=Date.now();__gardenTestEcology.seed({grassCells:Array.from({length:640},(_,cell)=>({column:cell%32,row:Math.floor(cell/32),createdAt:at-60000,lastInfluencedAt:at}))});__gardenTestEcology.resetCadence();});
      const grassBeforeGrowth=await sample(page);
      broadcast({specimenType:'flower',listenPort:53,vigor:2,sensor:'browser-fixture',seenCount:'12'});
      await page.waitForFunction(() => window.__gardenTestApp.stage.children[0].children[6].children.length === 1);
      await page.waitForFunction(() => __gardenAudioTones.length === 1);
      assert.equal(await page.evaluate(()=>__gardenTestEcology.grassCells.length),639,'SSE growth clears exactly one grass cell');
      assert(await page.evaluate(()=>{const p=__gardenTestGarden.specimens[0];return !__gardenTestEcology.grassCells.some(g=>g.column===p.column&&g.row===p.row)&&__gardenTestApp.stage.children[0].children[3].children.length===639;}));
      const grassAfterGrowth=await sample(page);
      await fs.writeFile(path.join(output,route==='/'?'root-grass-clearing-timing.json':'index-grass-clearing-timing.json'),JSON.stringify({grassBeforeGrowth,grassAfterGrowth},null,2));
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
        // This fixture now has 639 fuller grass patches. Keep visible-soil
        // checks without requiring the former sparse artwork's bare area.
        const resizedSoil=soilPixels(png(await page.locator('#view canvas').screenshot()));
        assert(resizedSoil.coverage > .35,JSON.stringify(resizedSoil));
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
    await diagnostic.waitForFunction(()=>__gardenTestApp.ticker.started);
    await checkGrass(diagnostic,'diagnostic');
    assert.equal(await diagnostic.evaluate(() => __gardenAudioContexts.length),0);
    await diagnostic.getByRole('button',{name:'Sound: Off',exact:true}).click();
    await diagnostic.waitForFunction(() => __gardenAudioContexts.length === 1 && __gardenAudioContexts[0].state === 'running');
    await diagnostic.getByRole('slider',{name:'Growth sound volume'}).fill('25');
    await diagnostic.waitForFunction(() => __gardenAudioGains[0].testSchedules.at(-1).value===2*.25**1.25);
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
    const timing={scene:'640 mixed specimens + puddles + manual hurricane; occupied cells have no grass; no incoming growth',soundOn,soundOff,soundOnAgain};
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
    await checkLandscaping(diagnostic);
    await checkOvercrowding(diagnostic);
    await checkLighting(diagnostic);
    await checkStillbloom(diagnostic);
    await checkWeedBuds(diagnostic);
    await checkHarvest();
    await checkFrogs();
    await checkPuddleArt();
    await checkGnomePuddles();
    await diagnostic.setViewportSize({width:320,height:700});
    await diagnostic.waitForFunction(()=>__gardenTestApp.renderer.screen.width===Math.round(document.querySelector('#view').getBoundingClientRect().width));
    assert(await diagnostic.locator('#sound-toggle').isVisible()); assert(await diagnostic.locator('#sound-volume').isVisible());
    await diagnostic.screenshot({path:path.join(output,'diagnostic-audio-small.png')});
    assert(await diagnostic.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'diagnostic audio controls fit narrow viewport');
    assert.deepEqual(diagnosticErrors,[]);
    await diagnostic.close();
    const canvas = await context.newPage(); await canvas.goto(origin + '/canvas.html');
    await canvas.getByRole('button',{name:'Generate fake DNS event',exact:true}).click();
    assert.match(await canvas.locator('#garden-status').textContent(),/1 flower/);
    await checkCanvasLandscaping(canvas); await checkCanvasOvercrowding(canvas); await canvas.close();
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

  async function checkGnomePuddles() {
    const errors=[],resources={};let at=Date.UTC(2026,9,21,12);
    for(const pixi of [true,false]){
      const kind=pixi?'pixi':'canvas',page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});
      page.on('pageerror',e=>errors.push(String(e.stack)));await page.clock.setFixedTime(at);await page.goto(origin+(pixi?'/pixi-live.html':'/canvas.html'));
      if(pixi){await page.waitForFunction(()=>window.__gardenTestGnomes);await page.locator('#probes').uncheck();}
      else await page.addScriptTag({url:origin+'/garden-gnome-puddles-dev.js'});
      await page.getByLabel('Weather source',{exact:true}).selectOption('manual');
      for(const scene of ['day','night','storm','reduced']){
        await page.emulateMedia({reducedMotion:scene==='reduced'?'reduce':'no-preference'});
        if(pixi){await page.locator('#lighting-mode').selectOption(scene==='night'?'night':'day');await page.getByLabel('Manual weather',{exact:true}).selectOption(scene==='storm'?'botnet_hurricane':'quiet');}
        else{await page.getByLabel('Events/min',{exact:true}).fill('10000');await page.getByLabel('Events/min',{exact:true}).dispatchEvent('change');await page.getByLabel('Weather',{exact:true}).selectOption(scene==='storm'?'botnet_hurricane':'quiet');}
        await page.evaluate(({pixi,scene})=>{
          const g=pixi?__gardenTestGnomes:gardenGnomes,e=pixi?__gardenTestEcology:gardenEcology;
          g.clear();e.clear();if(pixi)__gardenTestAmbient.clear();else gardenAmbient.clear();
          // Same harmless local plants in both renderers; no accepted traffic.
          const garden=pixi?__gardenTestGarden:gardenModel;
          garden.seed(Array.from({length:30},(_,i)=>({type:'broadleaf',column:1+i,row:4,createdAt:Date.now()-65000,colorVariant:0,origin:{kind:'simulated',eventType:'puddle-mishap-capture'}})));
          if(!pixi){gardenLighting.setMode(scene==='night'?'night':'day');updateGardenLighting(Date.now(),true);}
        },{pixi,scene});
        if(pixi)await page.locator('#trigger-gnome-puddle').click();
        else await page.evaluate(()=>{PacketGardenGnomePuddlesDev.trigger({gnomes:gardenGnomes,garden:gardenModel,ecology:gardenEcology});syncGnomeState();drawGarden();});
        for(let n=0;n<6;n++){at+=250;await page.clock.setFixedTime(at);await page.evaluate(pixi=>{
          (pixi?__gardenTestGnomes:gardenGnomes).tick(Date.now());if(!pixi){syncGnomeState();drawGardenOverlay(true);}
        },pixi);}
        if(pixi){const paints=await page.evaluate(()=>__gardenTestPaints);await page.waitForFunction(n=>__gardenTestPaints>n+1,paints);}
        const state=await page.evaluate(pixi=>{
          const g=pixi?__gardenTestGnomes:gardenGnomes,a=g.actors[0],pose=PacketGardenGnomes.presentation(a,Date.now(),matchMedia('(prefers-reduced-motion: reduce)').matches);
          return {reacted:Boolean(a.puddleMishap),water:pose.water,underpants:a.underpantsAttempted??false};
        },pixi);assert(state.reacted);assert.equal(state.underpants,false);
        if(scene==='reduced'){assert.equal(state.water.rotation,0);assert.equal(state.water.bounce,0);}
        await page.locator(pixi?'#view canvas':'.garden-stage').screenshot({path:path.join(output,`gnome-puddle-${kind}-${scene}.png`)});
        // Click the actual displayed gnome. The new reaction never consumes an
        // underpants attempt, and repeated hits still create just one drop.
        const point=await page.evaluate(pixi=>{
          const g=pixi?__gardenTestGnomes:gardenGnomes,a=g.actors[0],p=PacketGardenGnomes.presentation(a,Date.now());
          if(pixi){const root=__gardenTestApp.stage.children[0],box=__gardenTestApp.canvas.getBoundingClientRect();return {x:box.left+root.position.x+p.x*root.scale.x,y:box.top+root.position.y+p.y*root.scale.y};}
          const box=canvas.getBoundingClientRect();return {x:box.left+gardenView.offsetX+p.x*gardenView.scale,y:box.top+gardenView.offsetY+p.y*gardenView.scale};
        },pixi);
        await page.mouse.click(point.x,point.y);await page.mouse.click(point.x,point.y);
        assert.equal(await page.evaluate(pixi=>(pixi?__gardenTestAmbient:gardenAmbient).drops.length,pixi),1);
        // Both adapters receive hidden immediately, without missed entries on resume.
        await page.evaluate(pixi=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
          const g=pixi?__gardenTestGnomes:gardenGnomes;if(g.actors[0]?.puddleMishap)throw Error('hidden reaction retained');
          if(pixi&&__gardenTestGnomeView.splashes.size)throw Error('hidden ripple Sprite retained');
          Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;g.clear();
        },pixi);
        if(pixi)assert.equal(await page.evaluate(()=>__gardenTestGnomeView.splashes.size),0);
      }
      if(pixi)resources.cycles=await page.evaluate(()=>{
        const cycles=[],g=__gardenTestGnomes,v=__gardenTestGnomeView,e=__gardenTestEcology;
        for(let cycle=0;cycle<25;cycle++){
          const at=Date.now()+cycle*20000;PacketGardenGnomePuddlesDev.trigger({gnomes:g,garden:__gardenTestGarden,ecology:e,at});
          for(let age=250;age<=1500;age+=250)g.tick(at+age);v.animate(at+1500);
          const sprites=[...v.views.values(),...v.splashes.values()],active=v.splashes.size;
          g.clear();v.animate(at+1500);cycles.push({active,gnomes:v.views.size,splashes:v.splashes.size,destroyed:sprites.every(s=>s.destroyed)});
        }
        return {cycles,frames:__gardenTestGnomeAtlas.frames.size,bakes:__gardenGnomeBakes,
          backing:[__gardenTestGnomeAtlas.atlas.source.pixelWidth,__gardenTestGnomeAtlas.atlas.source.pixelHeight],sources:new Set([...__gardenTestGnomeAtlas.frames.values()].map(t=>t.source)).size};
      });
      assert.deepEqual(errors,[]);page.removeAllListeners('pageerror');await page.close();
    }
    assert(resources.cycles.cycles.every(c=>c.active===1&&c.gnomes===0&&c.splashes===0&&c.destroyed));assert.equal(resources.cycles.frames,22);assert.equal(resources.cycles.bakes,1);assert.equal(resources.cycles.sources,1);
    // Isolated native-clock submission probes. Frozen fixtures above measure
    // pixels/state only; these repeated calls compare the same four actors.
    const perf=await browser.newPage();await perf.goto(origin+'/pixi-live.html');await perf.waitForFunction(()=>window.__gardenTestGnomes);
    resources.pixiCpu=await perf.evaluate(()=>{
      PacketGardenGnomePuddlesDev.trigger({gnomes:__gardenTestGnomes,garden:__gardenTestGarden,ecology:__gardenTestEcology});
      const g=__gardenTestGnomes,v=__gardenTestGnomeView,at=Date.now();
      const sample=wet=>{for(const actor of g.actors){if(wet)actor.puddleMishap={startedAt:at,until:at+1000};else delete actor.puddleMishap;}
        v.animate(at+250);const times=[];for(let n=0;n<240;n++){const start=performance.now();v.animate(at+250);__gardenTestApp.render();times.push(performance.now()-start);}
        return {averageMs:times.reduce((a,b)=>a+b,0)/times.length,worstMs:Math.max(...times),sprites:v.views.size,splashes:v.splashes.size};};
      sample(false);sample(true); // Warm both paths before measuring submission.
      const baseline=sample(false),fourReactions=sample(true);g.clear();return {baseline,fourReactions};
    });await perf.close();
    const cp=await browser.newPage();await cp.goto(origin+'/canvas.html');
    resources.canvasCpu=await cp.evaluate(()=>{
      gardenModel.seed(Array.from({length:30},(_,i)=>({type:'broadleaf',column:i,row:4,createdAt:Date.now()})));gardenGnomes.start(Date.now(),()=>.5);syncGnomeState();const at=Date.now();
      const sample=wet=>{for(const a of gardenGnomes.actors){if(wet)a.puddleMishap={startedAt:at,until:at+1000};else delete a.puddleMishap;}
        const times=[];for(let n=0;n<240;n++){const start=performance.now();drawGardenOverlay(true,at+250);times.push(performance.now()-start);}
        return {averageMs:times.reduce((a,b)=>a+b,0)/times.length,worstMs:Math.max(...times)};};
      sample(false);sample(true);
      const baseline=sample(false),fourReactions=sample(true);gardenGnomes.clear();return {baseline,fourReactions};
    });await cp.close();
    const logical=await browser.newPage();await logical.goto(origin+'/pixi-live.html');await logical.waitForFunction(()=>window.__gardenTestGnomes);
    resources.logicalCpu=await logical.evaluate(()=>{
      const at=Date.now(),water=Array.from({length:8},(_,i)=>({x:480+i%4*8,y:300+Math.floor(i/4)*10,seed:i/8,size:36,maxSize:36,createdAt:at,lastRefreshedAt:at}));
      const actors=Array.from({length:4},(_,i)=>({x:440,y:289+i})),m=PacketGardenGnomePuddles.createModel({getPuddles:()=>water,random:()=>.99}),times=[];
      m.tick(actors,at);for(let n=0;n<240;n++){for(const a of actors)a.x=n%2?440:540;const start=performance.now();m.tick(actors,at+(n+1)*250);times.push(performance.now()-start);}
      const tracked=m.trackedActors;m.clear(actors);return {averageMs:times.reduce((a,b)=>a+b,0)/times.length,worstMs:Math.max(...times),samples:times.length,actors:4,puddles:8,trackedAfterClear:m.trackedActors,tracked};
    });await logical.close();
    await fs.writeFile(path.join(output,'gnome-puddle-resources.json'),JSON.stringify(resources,null,2));
    await fs.writeFile(path.join(output,'gnome-puddles.html'),`<!doctype html><meta charset="utf-8"><title>Gnome puddle mishaps</title><style>body{background:#19271f;color:#dfebdb;font:16px system-ui}img{width:100%;max-width:1000px}figure{display:inline-block;width:47%}</style><h1>Gnome puddle mishaps</h1>${['day','night','storm','reduced'].map(scene=>`<h2>${scene}</h2>${['canvas','pixi'].map(kind=>`<figure><figcaption>${kind}</figcaption><a href="gnome-puddle-${kind}-${scene}.png"><img src="gnome-puddle-${kind}-${scene}.png"></a></figure>`).join('')}`).join('')}<p><a href="gnome-puddle-resources.json">Resource and CPU measurements</a></p>`);
    console.log('PASS: Chrome deterministic puddle mishap fixture, Canvas/Pixi day/night/storm/reduced captures, real underpants clicks/hidden cleanup, 25 resource cycles and isolated CPU probes:',JSON.stringify(resources));
  }

  async function checkPuddleArt() {
    const at=Date.UTC(2026,9,21,12),errors=[],report={};
    // Exactly the same authoritative objects, clocks, seeds and locations before/after artwork changes.
    async function scene(page,pixi,name) {
      await page.evaluate(({pixi,name,at})=>{
        const ecology=pixi?__gardenTestEcology:gardenEcology,frogs=pixi?__gardenTestFrogs:gardenFrogs;
        frogs.clear(at);const large=name!=='small',age=name==='drained'?500000:large?20000:0;
        const pool=(x,y,seed)=>({x,y,seed,size:large?36:10,maxSize:large?36:18,createdAt:at-age,lastRefreshedAt:at-age});
        const puddles=name==='overlap'?[pool(448,300,.03),pool(480,304,.29),pool(511,294,.56)]:
          name==='frogs'?[pool(460,300,.29)]:[.03,.29,.56,.83].map((seed,i)=>pool(270+i*140,300,seed));
        const grassCells=name==='grass'?Array.from({length:128},(_,i)=>({column:6+i%20,row:7+Math.floor(i/20),createdAt:at-60000,lastInfluencedAt:at})):[];
        ecology.seed({puddles,grassCells});
        if(name==='frogs'){frogs.spawnSimulated(at-1000);frogs.spawnSimulated(at-1000);frogs.tick(at);}
        if(!pixi){gardenLighting.setMode(name==='night'?'night':'day');updateGardenLighting(at,true);drawGarden();drawGardenOverlay(true);}
      },{pixi,name,at});
      if(pixi){await page.locator('#lighting-mode').selectOption(name==='night'?'night':'day');
        await page.getByLabel('Manual weather',{exact:true}).selectOption(name==='hurricane'?'botnet_hurricane':'quiet');
        const n=await page.evaluate(()=>__gardenTestPaints);await page.waitForFunction(n=>__gardenTestPaints>n+1,n);
      }else {await page.getByLabel('Events/min',{exact:true}).fill('10000');await page.getByLabel('Events/min',{exact:true}).dispatchEvent('change');
        await page.getByLabel('Weather',{exact:true}).selectOption(name==='hurricane'?'botnet_hurricane':'quiet');
        await page.waitForTimeout(100);}
    }
    for(const pixi of [true,false]){
      const kind=pixi?'pixi':'canvas',page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});
      page.on('pageerror',e=>errors.push(String(e.stack)));await page.clock.setFixedTime(at);await page.goto(origin+(pixi?'/pixi-live.html':'/canvas.html')+'?puddle-art=1');
      if(pixi){await page.waitForFunction(()=>window.__gardenTestEcologyView);await page.locator('#probes').uncheck();}
      await page.getByLabel('Weather source',{exact:true}).selectOption('manual');
      for(const name of ['small','large','overlap','grass','frogs','night','hurricane','drained']){
        await scene(page,pixi,name);
        await page.locator(pixi?'#view canvas':'.garden-stage').screenshot({path:path.join(output,`puddles-${kind}-${name}.png`)});
      }
      if(pixi){
        const png=await page.evaluate(()=>__gardenTestApp.renderer.extract.canvas(__gardenTestEcologyAtlas.atlas).toDataURL());
        await fs.writeFile(path.join(output,'ecology-atlas.png'),Buffer.from(png.split(',')[1],'base64'));
      }else{
        const pngs=await page.evaluate(()=>typeof puddleTiles==='undefined'?[]:puddleTiles.map(tile=>tile.toDataURL()));
        for(let i=0;i<pngs.length;i++)await fs.writeFile(path.join(output,`canvas-tile-${i}.png`),Buffer.from(pngs[i].split(',')[1],'base64'));
      }
      if(pixi)report.resources=await page.evaluate(()=>{
        const ecology=__gardenTestEcology,view=__gardenTestEcologyView,atlas=__gardenTestEcologyAtlas,cycles=[];
        for(let n=0;n<20;n++){
          const now=Date.now();PacketGardenPixiEcology.seedDenseEcology(ecology,now);const sprites=[...view.puddleViews.values()];
          const frames=sprites.map(s=>s.texture);for(const p of ecology.puddles)ecology.refreshStormPuddle(p,now+1000);
          view.animate(now+30000);const stable=sprites.every((s,i)=>s===view.puddleViews.get(ecology.puddles[i])&&s.texture===frames[i]);
          ecology.clear();cycles.push({stable,remaining:view.puddleViews.size,destroyed:sprites.every(s=>s.destroyed)});
        }
        return {cycles,bakes:__gardenEcologyBakes,bakeMs:__gardenEcologyBakeMs,frames:atlas.frames.size,
          backing:[atlas.atlas.source.pixelWidth,atlas.atlas.source.pixelHeight],sources:new Set([...atlas.frames.values()].map(t=>t.source)).size};
      });
      // Assert live scene/cycle errors before closing. Both baseline and current
      // app have a separate page-close visibility/ticker race after pagehide.
      assert.deepEqual(errors,[]);page.removeAllListeners('pageerror');await page.close();
    }
    assert(report.resources.cycles.every(c=>c.stable&&c.remaining===0&&c.destroyed));assert.equal(report.resources.bakes,1);assert.equal(report.resources.sources,1);
    assert.equal(report.resources.frames,puddleBaseline?13:16);assert.deepEqual(report.resources.backing,puddleBaseline?[1664,128]:[2048,128]);
    const sharp=require('sharp');
    if(!puddleBaseline){
      report.pixelParity=[];
      for(let i=0;i<4;i++){
        const gpu=await sharp(path.join(output,'ecology-atlas.png')).extract({left:(12+i)*128,top:0,width:128,height:128}).ensureAlpha().raw().toBuffer();
        const cpu=await sharp(path.join(output,`canvas-tile-${i}.png`)).ensureAlpha().raw().toBuffer();let error=0,edge=0;
        for(let p=0;p<gpu.length;p+=4){for(let c=0;c<3;c++)error+=Math.abs(gpu[p+c]*gpu[p+3]/255-cpu[p+c]*cpu[p+3]/255);
          error+=Math.abs(gpu[p+3]-cpu[p+3]);const x=p/4%128,y=Math.floor(p/4/128);if(!x||!y||x===127||y===127)edge+=gpu[p+3];}
        const average=error/gpu.length;assert(average<3,'recognizably matching premultiplied Canvas/Pixi artwork');assert.equal(edge,0,'transparent atlas margins');report.pixelParity.push(average);
      }
      const oldAtlas=path.join(output,'..','before','ecology-atlas.png');
      try{const old=await sharp(oldAtlas).extract({left:0,top:0,width:1536,height:128}).raw().toBuffer();
        const current=await sharp(path.join(output,'ecology-atlas.png')).extract({left:0,top:0,width:1536,height:128}).raw().toBuffer();
        assert(old.equals(current),'all twelve grass frames remain pixel-identical');report.grassPixelsUnchanged=true;
      }catch(e){if(e.code==='ENOENT'||/Input file is missing/.test(e.message))report.grassPixelsUnchanged='baseline not present';else throw e;}
    }
    // Native clocks for CPU measurements; screenshot clocks deliberately freeze drainage.
    const perf=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});await perf.goto(origin+'/pixi-live.html');
    await perf.waitForFunction(()=>window.__gardenTestEcologyView);await perf.locator('#probes').uncheck();
    await perf.evaluate(()=>PacketGardenPixiEcology.seedDenseEcology(__gardenTestEcology,Date.now()));report.pixi=await sample(perf,120);await perf.close();
    const cp=await browser.newPage();await cp.goto(origin+'/canvas.html');
    report.canvas=await cp.evaluate(()=>{
      const at=Date.now(),puddles=Array.from({length:8},(_,i)=>({x:150+i%4*210,y:180+Math.floor(i/4)*240,seed:i/8,size:36,maxSize:36,createdAt:at,lastRefreshedAt:at}));
      gardenEcology.seed({puddles});const times=[];for(let i=0;i<240;i++){gardenBaseDirty=true;const start=performance.now();paintGardenBase(at);times.push(performance.now()-start);}
      return {paints:times.length,averageMs:times.reduce((a,b)=>a+b,0)/times.length,worstMs:Math.max(...times)};
    });await cp.close();assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(output,'puddle-resources.json'),JSON.stringify(report,null,2));
    const scenes=['small','large','overlap','grass','frogs','night','hurricane','drained'];
    await fs.writeFile(path.join(output,'..','comparison.html'),`<!doctype html><meta charset="utf-8"><title>PacketGarden puddle artwork comparison</title>
      <style>body{background:#1c2922;color:#e1e9d9;font:16px system-ui;margin:24px}section{margin-bottom:32px}h2{font-size:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}img{width:100%}figure{margin:0}a{color:#b9d6d0}</style>
      <h1>Storm puddles: before / after</h1><p>Identical local simulated puddles, seeds, positions, clocks and viewport. No network growth or ecology changes. Full captures retain normal garden scale.</p>
      ${['pixi','canvas'].flatMap(kind=>scenes.map(scene=>`<section><h2>${kind}: ${scene}</h2><div class="pair">${['before','after'].map(phase=>`<figure><figcaption>${phase}</figcaption><a href="${phase}/puddles-${kind}-${scene}.png"><img src="${phase}/puddles-${kind}-${scene}.png"></a></figure>`).join('')}</div></section>`)).join('')}
      <p>Measurements: <a href="before/puddle-resources.json">before</a> / <a href="after/puddle-resources.json">after</a>. CPU submission measures do not measure GPU completion.</p>`);
    console.log('PASS: matching Canvas/Pixi puddle scenes (small/mature/overlap/grass/frogs/night/hurricane/drained), stable frames and 20 cleanup cycles:',JSON.stringify(report));
  }

  async function checkFrogs() {
    const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2}),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));let at=Date.UTC(2026,9,21,12);
    await page.clock.setFixedTime(at);await page.goto(origin+'/pixi-live.html');await page.waitForFunction(()=>window.__gardenTestFrogs);
    await page.locator('#probes').uncheck();await page.locator('#lighting-mode').selectOption('day');
    await page.evaluate(()=>window.__frogPlanning=true);
    await page.locator('#trigger-frog').click();await page.locator('#trigger-frog').click();await page.locator('#trigger-frog').click();
    await page.evaluate(()=>window.__frogPlanning=false);
    assert.equal(await page.evaluate(()=>__gardenTestFrogs.frogs.length),2);assert.equal(await page.evaluate(()=>__gardenTestEcology.puddles.length),1);
    const paint=async()=>{const n=await page.evaluate(()=>__gardenTestPaints);await page.waitForFunction(n=>__gardenTestPaints>n+1,n);};
    async function advance(ms){for(let elapsed=0;elapsed<ms;){const step=Math.min(250,ms-elapsed);elapsed+=step;at+=step;
      await page.clock.setFixedTime(at);await page.evaluate(()=>__gardenTestFrogs.tick(Date.now()));}await paint();}
    await advance(1000);
    await page.locator('#view canvas').screenshot({path:path.join(output,'frogs-pixi-day-sitting.png')});
    await advance(9325);
    assert(await page.evaluate(()=>__gardenTestFrogs.frogs.every(f=>PacketGardenFrogs.visualState(f,Date.now()).hopping)));
    await page.locator('#view canvas').screenshot({path:path.join(output,'frogs-pixi-day-hopping.png')});
    await page.locator('#lighting-mode').selectOption('night');await page.locator('#view canvas').screenshot({path:path.join(output,'frogs-pixi-night.png')});
    await page.getByLabel('Weather source',{exact:true}).selectOption('manual');await page.getByLabel('Manual weather',{exact:true}).selectOption('rain');
    await page.locator('#view canvas').screenshot({path:path.join(output,'frogs-pixi-rain.png')});
    await page.emulateMedia({reducedMotion:'reduce'});await paint();
    assert(await page.evaluate(()=>[...__gardenTestFrogView.views].every(([frog,sprite])=>sprite.texture===__gardenTestAmbientAtlas.frames.get(`frog:${frog.variant}:sit`))));
    await page.locator('#view canvas').screenshot({path:path.join(output,'frogs-pixi-reduced.png')});await page.emulateMedia({reducedMotion:'no-preference'});
    const baseline=await page.evaluate(()=>({specimens:__gardenTestGarden.specimens.length,drops:__gardenTestAmbient.drops.length,
      curiosities:__gardenTestAmbient.curiosities.length,gnomes:__gardenTestGnomes.actors.length}));
    assert.deepEqual(baseline,{specimens:0,drops:0,curiosities:0,gnomes:0});assert.equal(await page.locator('#garden-score').textContent(),'Score: 0');
    await advance(49675);assert.equal(await page.evaluate(()=>__gardenTestFrogs.frogs.length),0);assert.equal(await page.evaluate(()=>__gardenTestFrogView.views.size),0);
    // Same-pixel water replacement is a new puddle and causes a brief departure.
    await page.evaluate(()=>window.__frogPlanning=true);await page.locator('#trigger-frog').click();await page.evaluate(()=>window.__frogPlanning=false);
    await advance(1000);await page.evaluate(()=>{const p=__gardenTestEcology.puddles[0];__gardenTestEcology.seed({puddles:[{...p}]});});await advance(250);
    assert(await page.evaluate(()=>__gardenTestFrogs.frogs[0].leaveAt!==null));await advance(1500);assert.equal(await page.evaluate(()=>__gardenTestFrogView.views.size),0);
    const resources=await page.evaluate(()=>{
      const frogs=__gardenTestFrogs,view=__gardenTestFrogView,states=[];
      for(let n=0;n<20;n++){
        frogs.clear();const start=Date.now()+n*70000;__gardenTestEcology.seed({puddles:[{x:480,y:300,size:18,maxSize:24,createdAt:start,lastRefreshedAt:start,seed:.3}]});
        frogs.clear(start);frogs.spawnSimulated(start);frogs.spawnSimulated(start);const sprites=[...view.views.values()];
        for(let age=250;age<=60000;age+=250){frogs.tick(start+age);view.animate(start+age);}
        states.push({views:view.views.size,destroyed:sprites.every(s=>s.destroyed)});
      }
      const atlas=__gardenTestAmbientAtlas;
      return {states,frames:atlas.frames.size,bakes:__gardenAmbientBakes,backing:[atlas.atlas.source.pixelWidth,atlas.atlas.source.pixelHeight],
        sources:new Set([...atlas.frames.values()].map(t=>t.source)).size};
    });assert(resources.states.every(s=>s.views===0&&s.destroyed));assert.equal(resources.frames,13);assert.equal(resources.bakes,1);assert.equal(resources.sources,1);
    const canvas=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});await canvas.clock.setFixedTime(at);await canvas.goto(origin+'/canvas.html');
    await canvas.evaluate(()=>{gardenEcology.clear();const at=Date.now();gardenEcology.seed({puddles:[{x:480,y:300,size:18,maxSize:24,createdAt:at,lastRefreshedAt:at,seed:.3}]});
      gardenFrogs.spawnSimulated();gardenFrogs.spawnSimulated();gardenLighting.setMode('day');updateGardenLighting(at,true);drawGarden();});
    const canvasStart=at;
    const canvasAdvance=async(ms)=>{for(let elapsed=0;elapsed<ms;){const step=Math.min(250,ms-elapsed);elapsed+=step;at+=step;await canvas.clock.setFixedTime(at);
      await canvas.evaluate(()=>gardenFrogs.tick(Date.now()));}await canvas.evaluate(()=>drawGardenOverlay(true));};
    await canvasAdvance(1000);await canvas.locator('.garden-stage').screenshot({path:path.join(output,'frogs-canvas-day-sitting.png')});
    await canvasAdvance(9325);await canvas.locator('.garden-stage').screenshot({path:path.join(output,'frogs-canvas-day-hopping.png')});
    await canvas.evaluate(()=>{gardenLighting.setMode('night');updateGardenLighting(Date.now(),true);drawGardenOverlay(true);});
    await canvas.locator('.garden-stage').screenshot({path:path.join(output,'frogs-canvas-night.png')});
    await canvas.getByLabel('Weather source',{exact:true}).selectOption('manual');await canvas.getByLabel('Weather',{exact:true}).selectOption('rain');
    await canvas.locator('.garden-stage').screenshot({path:path.join(output,'frogs-canvas-rain.png')});
    await canvasAdvance(canvasStart+60000-at);assert.equal(await canvas.evaluate(()=>gardenFrogs.frogs.length),0);
    assert.equal(await canvas.locator('#garden-score').textContent(),'Score: 0');await canvas.close();
    assert.deepEqual(errors,[]);await page.close();
    // CPU/ticker probes use fresh native clocks, separate from deterministic screenshot clocks.
    const perf=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});await perf.goto(origin+'/pixi-live.html');await perf.waitForFunction(()=>window.__gardenTestFrogs);
    await perf.locator('#probes').uncheck();const idle=await sample(perf,60);
    await perf.evaluate(()=>window.__frogPlanning=true);await perf.locator('#trigger-frog').click();await perf.locator('#trigger-frog').click();await perf.evaluate(()=>window.__frogPlanning=false);
    const sitting=await sample(perf,60);await perf.waitForFunction(()=>__gardenTestFrogs.frogs.some(f=>PacketGardenFrogs.visualState(f,Date.now()).hopping));const hopping=await sample(perf,60);
    await perf.getByLabel('Weather source',{exact:true}).selectOption('manual');await perf.getByLabel('Manual weather',{exact:true}).selectOption('rain');const rain=await sample(perf,60);await perf.close();
    const cp=await browser.newPage();await cp.goto(origin+'/canvas.html');
    const canvasCpu=await cp.evaluate(()=>{
      gardenEcology.seed({puddles:[{x:480,y:300,size:18,maxSize:24,createdAt:Date.now(),lastRefreshedAt:Date.now(),seed:.3}]});gardenFrogs.spawnSimulated();gardenFrogs.spawnSimulated();
      const drawFrogs=drawGardenFrogs;
      const probe=()=>{const samples=[];for(let i=0;i<120;i++){const start=performance.now();drawGardenOverlay(true);samples.push(performance.now()-start);}
        return {averageMs:samples.reduce((sum,n)=>sum+n,0)/samples.length,worstMs:Math.max(...samples),paints:samples.length};};
      try{drawGardenFrogs=()=>{};const baseline=probe();drawGardenFrogs=drawFrogs;return {baseline,twoFrogs:probe()};}finally{drawGardenFrogs=drawFrogs;}
    });await cp.close();const report={idle,sitting,hopping,rain,canvasCpu,resources};
    await fs.writeFile(path.join(output,'frog-resources.json'),JSON.stringify(report,null,2));console.log('PASS: Chrome frog diagnostics/two-cap/sit-hop/reduced/natural expiry/exact water replacement, Canvas-Pixi day/night/rain captures and 20 cleanup cycles:',JSON.stringify(report));
  }

  async function checkHarvest() {
    const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2}),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));let at=Date.UTC(2026,9,21,12);
    await page.clock.setFixedTime(at);await page.goto(origin+'/pixi-live.html');await page.waitForFunction(()=>window.__gardenTestGnomeView);
    await page.locator('#probes').uncheck();await page.locator('#trigger-weed-harvest').click();
    assert.equal(await page.evaluate(()=>__gardenTestGnomes.incident.mode),'weed_harvest');
    const paint=async()=>{const n=await page.evaluate(()=>__gardenTestPaints);await page.waitForFunction(n=>__gardenTestPaints>n+1,n);};
    at+=750;await page.clock.setFixedTime(at);await paint();
    assert.equal(await page.evaluate(()=>__gardenTestGnomes.incident.removals),1);
    await page.locator('#view canvas').screenshot({path:path.join(output,'harvest-pixi-day.png')});
    const actorPoint=async(index=0)=>page.evaluate(index=>{const actor=__gardenTestGnomes.actors[index],sprite=__gardenTestGnomeView.views.get(actor),app=__gardenTestApp,
      root=app.stage.children[0],r=app.canvas.getBoundingClientRect();return {x:r.left+(root.x+sprite.x*root.scale.x)*r.width/app.renderer.screen.width,
        y:r.top+(root.y+(sprite.y-3)*root.scale.y)*r.height/app.renderer.screen.height};},index);
    let point=await actorPoint();await page.mouse.click(point.x,point.y);await paint();
    assert.equal(await page.evaluate(()=>__gardenTestAmbient.drops.length),1);assert(await page.evaluate(()=>__gardenTestGnomes.actors[0].underpantsAttempted));
    await page.locator('#view canvas').screenshot({path:path.join(output,'harvest-pixi-surprise.png')});
    point=await actorPoint();await page.mouse.click(point.x,point.y);assert.equal(await page.evaluate(()=>__gardenTestAmbient.drops.length),1);
    point=await actorPoint(1);await page.mouse.click(point.x,point.y);assert.equal(await page.evaluate(()=>__gardenTestAmbient.drops.length),2);
    await page.locator('#lighting-mode').selectOption('night');await paint();
    await page.locator('#view canvas').screenshot({path:path.join(output,'harvest-pixi-night-sack.png')});
    // Finish on normal logical deadlines; underpants remain after both volunteers depart.
    for(let i=0;i<18;i++){at+=250;await page.clock.setFixedTime(at);await paint();}
    assert.equal(await page.evaluate(()=>__gardenTestGnomes.actors.length),0);
    assert.equal(await page.evaluate(()=>__gardenTestAmbient.drops.length),2);
    await page.locator('#view canvas').screenshot({path:path.join(output,'underpants-pixi-departed.png')});
    await page.locator('#seed-gnome-drops').click();assert.equal(await page.evaluate(()=>__gardenTestAmbient.drops.length),5);
    await page.locator('#lighting-mode').selectOption('day');await paint();
    await page.locator('#view canvas').screenshot({path:path.join(output,'underpants-pixi-mixed-day.png')});
    await page.locator('#lighting-mode').selectOption('night');await paint();
    await page.locator('#view canvas').screenshot({path:path.join(output,'underpants-pixi-mixed-night.png')});
    const dropPoint=async()=>page.evaluate(()=>{const d=__gardenTestAmbient.drops.find(d=>d.type==='gnome_underpants'),app=__gardenTestApp,root=app.stage.children[0],r=app.canvas.getBoundingClientRect();
      return {x:r.left+(root.x+d.x*root.scale.x)*r.width/app.renderer.screen.width,y:r.top+(root.y+d.y*root.scale.y)*r.height/app.renderer.screen.height};});
    for(const [roll,message] of [['0.799999',"You stole a gnome's underpants. +0 points"],['0.8','Collected underpants +1, annoyed gnome -1']]){
      await page.locator('#underpants-message-roll').selectOption(roll);const p=await dropPoint();await page.mouse.click(p.x,p.y);
      assert.equal(await page.locator('#collection-message').textContent(),message);assert.equal(await page.locator('#garden-score').textContent(),'Score: 0');
    }
    const resources=await page.evaluate(()=>{
      const g=__gardenTestGnomes,a=__gardenTestAmbient,gv=__gardenTestGnomeView,av=__gardenTestAmbientView,states=[];
      for(let i=0;i<20;i++){
        g.clear();a.clear();const time=Date.now()+(i+1)*420000;
        __gardenTestGarden.seed(Array.from({length:5},(_,i)=>({type:'weed',vigor:0,column:12+i*2,row:10,createdAt:time-65000,origin:{kind:'simulated',eventType:'weed-harvest-test'}})),time);
        g.startLandscaping(time,()=>.5,'weed_harvest');gv.animate(time);
        for(const actor of g.actors)g.click(actor,time);
        const sprites=[...gv.views.values(),...av.dropViews.values()].map(v=>v.sprite??v);
        g.clear();a.tick(time+20000);states.push({gnomes:gv.views.size,drops:av.dropViews.size,destroyed:sprites.every(s=>s.destroyed)});
      }
      return {states,gnomeFrames:__gardenTestGnomeAtlas.frames.size,ambientFrames:__gardenTestAmbientAtlas.frames.size,
        gnomeBakes:__gardenGnomeBakes,ambientBakes:__gardenAmbientBakes,
        gnomeBacking:[__gardenTestGnomeAtlas.atlas.source.pixelWidth,__gardenTestGnomeAtlas.atlas.source.pixelHeight]};
    });
    assert(resources.states.every(s=>s.gnomes===0&&s.drops===0&&s.destroyed));assert.equal(resources.gnomeFrames,22);assert.equal(resources.ambientFrames,13);
    assert.equal(resources.gnomeBakes,1);assert.equal(resources.ambientBakes,1);
    const canvas=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});await canvas.clock.setFixedTime(at);await canvas.goto(origin+'/canvas.html');
    await canvas.evaluate(()=>{gardenModel.clear();gardenEcology.clear();const at=Date.now();gardenModel.seed(Array.from({length:5},(_,i)=>({type:'weed',vigor:0,column:12+i*2,row:10,createdAt:at-65000,
      origin:{kind:'simulated',eventType:'weed-harvest-test'}})));gardenGnomes.startLandscaping(at,()=>.999,'weed_harvest');syncGnomeState();drawGarden();});
    at+=750;await canvas.clock.setFixedTime(at);await canvas.waitForFunction(()=>gardenGnomes.incident.removals===1);
    await canvas.locator('.garden-stage').screenshot({path:path.join(output,'harvest-canvas-day.png')});
    await canvas.evaluate(()=>{const a=gardenGnomes.actors[0];gardenGnomes.click(a);gardenLighting.setMode('night');updateGardenLighting(Date.now(),true);drawGardenOverlay(true);});
    await canvas.locator('.garden-stage').screenshot({path:path.join(output,'harvest-canvas-surprise-night.png')});
    await canvas.evaluate(()=>{gardenGnomes.clear();syncGnomeState();gardenAmbient.seed({drops:['amanita_muscaria','ditch_weed_bud','gnome_underpants'].map((type,i)=>({type,x:395+i*70,y:315,phase:0,createdAt:Date.now(),expiresAt:Date.now()+20000}))});drawGardenOverlay(true);});
    await canvas.locator('.garden-stage').screenshot({path:path.join(output,'underpants-canvas-mixed-night.png')});
    await canvas.evaluate(()=>{gardenLighting.setMode('day');updateGardenLighting(Date.now(),true);drawGardenOverlay(true);});
    await canvas.locator('.garden-stage').screenshot({path:path.join(output,'underpants-canvas-mixed-day.png')});
    assert.equal(await canvas.locator('#garden-score').textContent(),'Score: 0');await canvas.close();
    assert.deepEqual(errors,[]);await page.close();await fs.writeFile(path.join(output,'gnome-harvest-resources.json'),JSON.stringify(resources,null,2));
    console.log('PASS: Chrome weed-harvest trigger/cuts/sacks, actual gnome clicks/one attempt, independent underpants, both 80/20 messages, day/night Canvas-Pixi captures and 20 cleanup cycles:',JSON.stringify(resources));
  }

  async function checkWeedBuds(page) {
    await page.reload();await page.waitForFunction(()=>window.__gardenTestAmbientView);
    const errors=[];page.on('pageerror',error=>errors.push(String(error)));
    await page.locator('#probes').uncheck();await page.locator('#seed-weed-buds').click();
    assert.equal(await page.evaluate(()=>__gardenTestAmbient.drops.length),3);
    assert(await page.evaluate(()=>__gardenTestGarden.specimens.every(p=>p.origin.kind==='simulated')));
    const fixture=scene=>{
      const at=Date.now(),origin={kind:'simulated',eventType:'weed-bud-test'};
      return {plants:['weed','weed','mushroom'].slice(0,scene==='nearby'||scene==='grass'?1:3).map((type,i)=>({
        type,vigor:1,column:12+i*5,row:10,createdAt:at-65000,origin})),
      grassCells:scene==='nearby'?[]:[13,14,18,19].map(column=>({column,row:10,createdAt:at-60000,lastInfluencedAt:at})),
      drops:['ditch_weed_bud','amanita_muscaria','ditch_weed_bud'].slice(0,scene==='nearby'||scene==='grass'?1:3).map((type,i)=>({
        type,createdAt:at,expiresAt:at+20000,x:[395,545,551][i],y:315,phase:0}))};
    };
    await page.evaluate(()=>__gardenTestApp.stop());
    for(const scene of ['nearby','grass','mixed','night']){
      await page.evaluate(data=>{__gardenTestGarden.seed(data.plants);__gardenTestEcology.seed({grassCells:data.grassCells});
        __gardenTestAmbient.seed({drops:data.drops});__gardenTestLighting.setMode(data.scene==='night'?'night':'day');
        __gardenTestLighting.tick(Date.now(),true);__gardenTestApp.render();},{...fixture(scene),scene});
      await page.locator('#view canvas').screenshot({path:path.join(output,`weed-bud-pixi-${scene}.png`)});
    }
    // Newest overlapping bud alone is collected, with its Amanita neighbor and both weeds intact.
    const point=await page.evaluate(()=>{const app=__gardenTestApp,root=app.stage.children[0],r=app.canvas.getBoundingClientRect(),d=__gardenTestAmbient.drops[2];
      return {x:r.left+(root.position.x+d.x*root.scale.x)*r.width/app.renderer.screen.width,
        y:r.top+(root.position.y+d.y*root.scale.y)*r.height/app.renderer.screen.height};});
    await page.mouse.click(point.x,point.y);
    assert.equal(await page.locator('#collection-message').textContent(),'You smoked some ditch weed. +0 points');
    assert.equal(await page.evaluate(()=>__gardenTestAmbient.drops.length),2);
    assert.equal(await page.evaluate(()=>__gardenTestGarden.specimens.length),3);
    assert.equal(await page.locator('#garden-score').textContent(),'Score: 0');
    const resources=await page.evaluate(()=>{
      const ambient=__gardenTestAmbient,view=__gardenTestAmbientView;
      const states=[];for(let cycle=0;cycle<20;cycle++){
        PacketGardenPixiAmbient.seedWeedBuds(ambient,Date.now());
        const removed=[...view.dropViews.values()].map(v=>v.sprite);
        ambient.removeDrop(ambient.drops[0],'collected');ambient.tick(Date.now()+20000);
        states.push({views:view.dropViews.size,destroyed:removed.every(s=>s.destroyed)});
      }
      const atlas=__gardenTestAmbientAtlas;
      return {cycles:states,frames:atlas.frames.size,bakes:__gardenAmbientBakes,
        backing:[atlas.atlas.source.pixelWidth,atlas.atlas.source.pixelHeight],gpuSources:new Set([...atlas.frames.values()].map(t=>t.source)).size};
    });
    assert(resources.cycles.every(s=>s.views===0&&s.destroyed));assert.equal(resources.frames,13);assert.equal(resources.bakes,1);assert.equal(resources.gpuSources,1);
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#seed-weed-buds').click();
    const positions=await page.evaluate(()=>{const v=__gardenTestAmbientView;v.animate(Date.now());const a=[...v.dropViews.values()].filter(v=>v.item.type==='ditch_weed_bud').map(v=>[v.sprite.x,v.sprite.y]);
      v.animate(Date.now()+10000);return [a,[...v.dropViews.values()].filter(v=>v.item.type==='ditch_weed_bud').map(v=>[v.sprite.x,v.sprite.y])];});
    assert.deepEqual(positions[0],positions[1]);await page.emulateMedia({reducedMotion:'no-preference'});
    const canvas=await page.context().newPage();await canvas.goto(origin+'/canvas.html');
    for(const scene of ['nearby','grass','mixed','night']){
      await canvas.evaluate(data=>{gardenModel.seed(data.plants);gardenEcology.seed({grassCells:data.grassCells});gardenAmbient.seed({drops:data.drops});
        gardenLighting.setMode(data.scene==='night'?'night':'day');updateGardenLighting(Date.now(),true);drawGarden();},{...fixture(scene),scene});
      await canvas.locator('.garden-stage').screenshot({path:path.join(output,`weed-bud-canvas-${scene}.png`)});
    }
    await canvas.evaluate(()=>{gardenAmbient.clear();drawGardenOverlay(true);syncWeatherAnimation();});
    assert.equal(await canvas.evaluate(()=>gardenAmbient.drops.length),0);await canvas.close();
    await page.locator('#clear').click();await page.evaluate(()=>__gardenTestApp.start());assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(output,'weed-bud-resources.json'),JSON.stringify(resources,null,2));
    console.log('PASS: Chrome bud diagnostics/mixed overlap/collection, eight Canvas-Pixi day/grass/mixed/night screenshots, reduced motion, 20 resource cycles:',JSON.stringify(resources));
  }

  async function checkStillbloom(page) {
    await page.reload();await page.waitForFunction(()=>window.__gardenTestStillbloom);
    const errors=[];page.on('pageerror',error=>errors.push(String(error)));
    await page.locator('#probes').uncheck();await page.locator('#clear').click();
    await page.locator('#stillbloom-roll').selectOption('0.1');await page.locator('#stillbloom-qualify').click();
    assert.match(await page.locator('#stillbloom-test-status').textContent(),/Simulation: 600s verified quiet · 0\/2 · 1 rolls/);
    await page.locator('#stillbloom-scenario').selectOption('stale');assert.match(await page.locator('#stillbloom-test-status').textContent(),/Simulation: 0s/);
    await page.locator('#stillbloom-roll').selectOption('0.099999');await page.locator('#stillbloom-qualify').click();
    assert.match(await page.locator('#stillbloom-test-status').textContent(),/Simulation: 600s verified quiet · 1\/2 · 1 rolls/);
    await page.locator('#stillbloom-check').click();assert.match(await page.locator('#stillbloom-test-status').textContent(),/2\/2 · 2 rolls/);
    assert.equal(await page.evaluate(()=>__gardenTestGarden.specimens.length),0,'virtual telemetry never touches the organic garden');
    await page.locator('#trigger-stillbloom').click();await page.locator('#trigger-stillbloom').click();await page.locator('#trigger-stillbloom').click();
    assert.equal(await page.evaluate(()=>__gardenTestGarden.specimens.length),2);assert.match(await page.locator('#stillbloom-test-status').textContent(),/No placement/);
    const saved=await page.evaluate(()=>JSON.stringify(__gardenTestGarden.specimens.map(p=>p.origin)));
    assert(!saved.includes('tcpnoise'));assert(saved.includes('simulated'));
    const buildCounts=await page.evaluate(()=>({objects:__gardenTestApp.stage.children[0].children[6].children.length,frames:document.querySelector('#hud').textContent.match(/atlas frames (\d+)/)?.[1]}));
    assert.equal(buildCounts.objects,2);assert.equal(buildCounts.frames,'767');
    const metrics={resources:buildCounts,day:await sample(page)};
    // Fixed fixtures use the real model, existing cached artwork and surface light.
    const fixture=async(age,mixed=false)=>page.evaluate(({age,mixed})=>{
      __gardenTestApp.stop();const at=Date.now();__gardenTestGarden.clear();__gardenTestEcology.clear();
      const plants=mixed?Array.from({length:140},(_,i)=>({type:PacketGardenCore.eventSpecies[i%10],column:(i*73+7)%640%32,row:Math.floor((i*73+7)%640/32),vigor:i%4,createdAt:at-(i%10===5?3000:65000),origin:{kind:'simulated',eventType:'stillbloom-comparison'}})).filter(p=>p.column!==16||p.row!==10):[];
      __gardenTestGarden.seed([...plants,{type:'stillbloom',vigor:0,column:16,row:10,createdAt:at-age,origin:{kind:'simulated',eventType:'stillbloom-test'}}],at);
      __gardenTestGarden.tick(at+1000);__gardenTestApp.render();return 336;
    },{age,mixed});
    for(const [name,age,mixed,phase] of [['young-day',12000,false,'day'],['growing-day',45000,false,'day'],['mature-day',120000,false,'day'],['mature-night',120000,false,'night'],['mixed-day',120000,true,'day'],['mixed-night',120000,true,'night'],['fading-night',1110000,true,'night']]){
      await fixture(age,mixed);await page.locator('#lighting-mode').selectOption(phase);
      await page.locator('#view canvas').screenshot({path:path.join(output,`stillbloom-${name}.png`)});
    }
    await page.getByLabel('Weather source',{exact:true}).selectOption('manual');await page.getByLabel('Manual weather',{exact:true}).selectOption('rain');
    const count=await page.evaluate(()=>__gardenTestGarden.specimens.filter(p=>p.type==='stillbloom').length);assert.equal(count,1);
    await page.locator('#view canvas').screenshot({path:path.join(output,'stillbloom-quiet-to-rain.png')});
    await page.evaluate(()=>{__gardenTestApp.start();});metrics.nightRain=await sample(page);
    await page.locator('#clear').click();assert.equal(await page.evaluate(()=>__gardenTestApp.stage.children[0].children[6].children.length),0);
    // Real Canvas counterpart, including inspection and normal removal.
    const canvas=await page.context().newPage();await canvas.goto(origin+'/canvas.html');
    for(const phase of ['day','night']){
      await canvas.evaluate(phase=>{gardenModel.clear();gardenEcology.clear();const at=Date.now();gardenModel.seed([{type:'stillbloom',vigor:0,column:16,row:10,createdAt:at-120000,origin:{kind:'quiet'}}]);gardenLighting.setMode(phase);updateGardenLighting(Date.now(),true);drawGarden();},phase);
      await canvas.locator('.garden-stage').screenshot({path:path.join(output,`stillbloom-canvas-${phase}.png`)});
    }
    await canvas.evaluate(()=>{renderSpecimenCard(gardenModel.specimens[0],100,100);});assert.equal(await canvas.locator('#specimen-source').textContent(),'Sustained quiet');
    await canvas.close();assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(output,'stillbloom-resources.json'),JSON.stringify(metrics,null,2));
    console.log('PASS: Chrome Stillbloom diagnostics/boundaries/cap, cached poses/day/night/mixed/fade/rain, Canvas origin and cleanup:',JSON.stringify(metrics));
  }

  async function checkGrass(page,label) {
    const originalViewport=page.viewportSize();
    await page.evaluate(()=>{__gardenTestGarden.clear();__gardenTestEcology.seed({grassCells:[{column:12,row:9,createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}]});__gardenTestEcology.resetCadence();});
    const click=async(column=12,row=9)=>{
      await page.locator('#view canvas').scrollIntoViewIfNeeded();
      const point=await page.evaluate(({column,row})=>{const app=__gardenTestApp,root=app.stage.children[0],box=app.canvas.getBoundingClientRect();
        return {x:box.left+(root.position.x+(column+.5)*30*root.scale.x)*box.width/app.renderer.screen.width,
          y:box.top+(root.position.y+(row+.5)*30*root.scale.y)*box.height/app.renderer.screen.height};},{column,row});
      await page.mouse.click(point.x,point.y);
    };
    for(const viewport of [originalViewport,{width:320,height:700}]) {
      await page.setViewportSize(viewport);await page.waitForFunction(()=>__gardenTestApp.renderer.screen.width===Math.round(document.querySelector('#view').getBoundingClientRect().width));
      await click();await page.getByRole('heading',{name:'Wild grass',exact:true}).waitFor();
      assert.equal(await page.locator('#grass-state').textContent(),'Mature');assert(await page.locator('#grass-details').isVisible());
      assert(!(await page.locator('#specimen-details').isVisible()));
      assert.match(await page.locator('#grass-details').textContent(),/Not a collectible plant specimen/);
      const card=await page.locator('#specimen-card').boundingBox();assert(card.x>=0&&card.x+card.width<=viewport.width);
      assert(card.y>=0&&card.y+card.height<=viewport.height);
      await page.screenshot({path:path.join(output,`${label}-grass-card-${viewport.width}.png`)});
      await page.getByRole('button',{name:'Close specimen information'}).click();
    }
    // Pick exposed soil above the floating card, rather than clicking through it.
    await click();await click(1,1);assert(!(await page.locator('#specimen-card').isVisible()),'bare soil does not inspect grass');
    await click();
    const transition=await page.evaluate(()=>{const oldGrass=__gardenTestApp.stage.children[0].children[3].children.find(s=>s.position.x===375&&s.position.y===285);
      __gardenTestGarden.seed([{type:'broadleaf',column:12,row:9,vigor:0,createdAt:Date.now()}]);
      return {grass:__gardenTestEcology.grassCells.length,cardClosed:document.querySelector('#specimen-card').hidden,destroyed:oldGrass.destroyed,
        specimens:__gardenTestApp.stage.children[0].children[6].children.length};});
    assert.deepEqual(transition,{grass:0,cardClosed:true,destroyed:true,specimens:1},'grass and card clear in the same operation as plant presentation');
    await click();await page.getByRole('heading',{name:'Broad-leaf plant',exact:true}).waitFor();
    assert(await page.locator('#specimen-details').isVisible());assert(!(await page.locator('#grass-details').isVisible()));
    assert.equal(await page.locator('#garden-score').textContent(),'Score: 0');assert.equal(await page.evaluate(()=>__gardenAudioContexts.length),0,'grass/specimen inspection stays silent');
    await page.getByRole('button',{name:'Close specimen information'}).click();
    await page.evaluate(()=>{__gardenTestGarden.clear();__gardenTestEcology.clear();});
    await page.setViewportSize(originalViewport);await page.waitForFunction(()=>__gardenTestApp.renderer.screen.width===Math.round(document.querySelector('#view').getBoundingClientRect().width));
  }
  async function specimenPoint(page) {
    return page.evaluate(() => {
      const app=window.__gardenTestApp,root=app.stage.children[0],sprite=root.children[6].children[0],r=app.canvas.getBoundingClientRect();
      const x=root.position.x+sprite.position.x*root.scale.x,y=root.position.y+(sprite.position.y-12)*root.scale.y;
      return {x:r.left+x*r.width/app.renderer.screen.width,y:r.top+y*r.height/app.renderer.screen.height,
        pixelX:Math.round(x*app.canvas.width/app.renderer.screen.width),pixelY:Math.round(y*app.canvas.height/app.renderer.screen.height)};
    });
  }
  async function sample(page,frames=120) {
    return page.evaluate(frames=>new Promise(resolve=>{
      const app=__gardenTestApp,intervals=[];let last=null;__gardenTestRenderMs=[];
      const tones=__gardenAudioTones.length;
      const tick=t=>{if(last!==null)intervals.push(t.lastTime-last);last=t.lastTime;if(intervals.length<frames)return;
        app.ticker.remove(tick);
        const stats=values=>({average:values.reduce((a,b)=>a+b,0)/values.length,worst:Math.max(...values)});
        resolve({frameMs:stats(intervals),cpuSubmissionMs:stats(__gardenTestRenderMs),frames:intervals.length,
          newAudioNodes:__gardenAudioTones.length-tones});};app.ticker.add(tick);
    }),frames);
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
    const results={quietIdle,quietActive,hurricaneIdle,hurricaneActive,extraDisplayObjects:5,atlasFrames:22,
      atlasBacking:[1760,64],estimatedAtlasRgbaBytes:1760*64*4};
    await fs.writeFile(path.join(output,'gnome-timing.json'),JSON.stringify(results,null,2));console.log('Gnome timing:',JSON.stringify(results));
  }
  async function checkLandscaping(page) {
    await page.reload();await page.waitForFunction(()=>window.__gardenTestGnomes);
    await page.locator('#trigger-landscaping').click();
    await page.waitForFunction(()=>__gardenTestGnomes.actors[0]?.state==='snip');
    await page.locator('#view canvas').screenshot({path:path.join(output,'landscaping-snip.png')});
    assert.equal(await page.evaluate(()=>__gardenTestGnomes.actors.length),2);
    assert.equal(await page.evaluate(()=>__gardenTestApp.stage.children[0].children[8].children[0].children.length),2);
    await page.waitForFunction(()=>!__gardenTestGnomes.incident);
    assert.equal(await page.evaluate(()=>__gardenTestGarden.specimens.length),42);
    assert.equal(await page.evaluate(()=>__gardenTestApp.stage.children[0].children[8].children.length),0);
    assert.equal(await page.locator('.recent-event').count(),0);
    await page.locator('#trigger-landscaping').click();
    assert.match(await page.locator('#landscaping-test-status').textContent(),/cooldown/);
    await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
    await page.waitForFunction(()=>window.__gardenTestGnomes);await page.locator('#trigger-landscaping').click();
    assert(await page.evaluate(()=>__gardenTestGnomes.actors[0].x===__gardenTestGnomes.actors[0].targetX));
    await page.waitForFunction(()=>__gardenTestGnomes.actors[0]?.state==='snip');
    assert(await page.evaluate(()=>PacketGardenGnomes.appearance(__gardenTestGnomes.actors[0],Date.now(),true).closed));
    await page.locator('#view canvas').screenshot({path:path.join(output,'landscaping-reduced.png')});
    const remaining=await page.evaluate(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
      return __gardenTestGarden.specimens.length;
    });
    assert.equal(await page.evaluate(()=>__gardenTestGnomes.actors.length),0);
    assert.equal(await page.evaluate(()=>__gardenTestApp.stage.children[0].children[8].children.length),0);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});
      document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
    await page.waitForFunction(()=>__gardenTestApp.ticker.started);
    assert.equal(await page.evaluate(()=>__gardenTestGarden.specimens.length),remaining);
    await page.emulateMedia({reducedMotion:'no-preference'});
    console.log('PASS: Chrome landscaping real-time sequential snips, two transient sprites, cleanup/cooldown, reduced motion, hidden cancellation and screenshots.');
  }
  async function checkLighting(page) {
    await page.reload();await page.waitForFunction(()=>window.__gardenTestLighting?.state);
    const errors=[];page.on('pageerror',error=>errors.push(String(error)));
    await page.getByLabel('Weather source',{exact:true}).selectOption('manual');
    await page.getByLabel('Manual weather',{exact:true}).selectOption('quiet');
    await page.locator('#probes').uncheck();
    await page.locator('#seed').click();
    const footprint=await page.evaluate(()=>JSON.stringify(__gardenTestGarden.specimens.map(p=>[p.id,p.cell,p.type,p.createdAt,p.origin])));
    const resources=()=>page.evaluate(()=>{
      const count=n=>1+(n.children??[]).reduce((v,c)=>v+count(c),0);
      return {objects:count(__gardenTestApp.stage),specimens:__gardenTestGarden.specimens.length,
        frames:document.querySelector('#hud').textContent.match(/atlas frames (\d+)/)?.[1],filter:__gardenTestApp.canvas.style.filter};
    });
    await page.locator('#lighting-mode').selectOption('day');const dayResources=await resources(),dayTiming=await sample(page);
    await page.locator('#lighting-mode').selectOption('night');const nightTiming=await sample(page),nightResources=await resources();
    await page.getByLabel('Day/night cycle',{exact:true}).uncheck();
    assert.equal(await page.evaluate(()=>__gardenTestApp.canvas.style.filter),'none');
    assert(await page.locator('#lighting-mode').isDisabled());assert(await page.locator('#lighting-hour').isDisabled());
    await page.getByLabel('Day/night cycle',{exact:true}).check();
    assert.equal(await page.evaluate(()=>__gardenTestLighting.state.phase),'night');
    assert.match(await page.evaluate(()=>__gardenTestApp.canvas.style.filter),/garden-local-light/);
    assert.equal(nightResources.objects,dayResources.objects);assert.equal(nightResources.frames,dayResources.frames);
    assert.equal(await page.evaluate(()=>JSON.stringify(__gardenTestGarden.specimens.map(p=>[p.id,p.cell,p.type,p.createdAt,p.origin]))),footprint);
    await page.evaluate(()=>{
      __gardenTestApp.stop();const at=Date.now(),types=PacketGardenCore.eventSpecies;
      __gardenTestGarden.seed(Array.from({length:240},(_,i)=>{const type=types[i%types.length];return {
        type,vigor:i%4,column:4+i%24,row:5+Math.floor(i/24),createdAt:at-(type==='redbloom'?3000:65000),
        origin:{kind:'simulated',eventType:'lighting-comparison'}};}),at);
      const grassCells=[];
      for(let i=0;i<640;i++)if(!__gardenTestGarden.byCell.has(i)&&i%7!==0)grassCells.push({column:i%32,row:Math.floor(i/32),createdAt:at-60000,lastInfluencedAt:at});
      __gardenTestEcology.seed({grassCells,puddles:[{x:180,y:180,size:18,maxSize:18,seed:.3,createdAt:at,lastRefreshedAt:at}]});
      __gardenTestApp.render();
    });
    const stable=await page.evaluate(()=>JSON.stringify(__gardenTestGarden.specimens));
    const shots={},metrics={dayTiming,nightTiming,dayResources,nightResources};
    const mean=shot=>{let r=0,g=0,b=0;for(let i=0;i<shot.width*shot.height;i++){r+=shot.data[i*shot.channels];g+=shot.data[i*shot.channels+1];b+=shot.data[i*shot.channels+2];}
      const n=shot.width*shot.height;return {r:r/n,g:g/n,b:b/n,luma:(r*.2126+g*.7152+b*.0722)/n};};
    for(const phase of ['dawn','day','golden','dusk','night']) {
      await page.locator('#lighting-mode').selectOption(phase);await page.evaluate(()=>__gardenTestApp.render());
      shots[phase]=await page.locator('#view canvas').screenshot({path:path.join(output,`lighting-${phase}.png`)});
      metrics[phase]=mean(png(shots[phase]));
    }
    assert(metrics.night.luma>metrics.day.luma*.6&&metrics.night.luma<metrics.day.luma*.95,'night stays readable while visibly cooler/dimmer');
    assert(metrics.golden.r/metrics.golden.b>metrics.day.r/metrics.day.b,'golden hour warms the existing colors');
    assert(metrics.night.b/metrics.night.r>metrics.day.b/metrics.day.r,'night adds a restrained cool ambience');
    assert.equal(await page.evaluate(()=>JSON.stringify(__gardenTestGarden.specimens)),stable,'same specimens at all five times');
    const hit=await page.evaluate(()=>{const app=__gardenTestApp,root=app.stage.children[0],sprite=root.children[6].children[0],r=app.canvas.getBoundingClientRect();
      return {x:r.left+(root.position.x+sprite.position.x*root.scale.x)*r.width/app.renderer.screen.width,
        y:r.top+(root.position.y+(sprite.position.y-12)*root.scale.y)*r.height/app.renderer.screen.height};});
    await page.mouse.click(hit.x,hit.y);assert(await page.locator('#specimen-card').isVisible(),'night CSS light preserves inspection hits');
    await page.keyboard.press('Escape');
    await page.locator('#lighting-hour').fill('17.35');assert.equal(await page.locator('#lighting-mode').inputValue(),'hour');
    assert.equal(await page.evaluate(()=>__gardenTestLighting.state.hour),17.35);
    await page.locator('#lighting-mode').selectOption('night');
    await page.getByLabel('Manual weather',{exact:true}).selectOption('botnet_hurricane');await page.evaluate(()=>__gardenTestApp.render());
    shots.storm=await page.locator('#view canvas').screenshot({path:path.join(output,'lighting-night-storm.png')});metrics.storm=mean(png(shots.storm));
    assert.equal(await page.evaluate(()=>__gardenTestApp.stage.children[0].children[9].particleChildren.length),400);
    await page.locator('#trigger-lightning').click();
    await page.evaluate(()=>{const event=__gardenTestStorm.active;__gardenTestStormView.animate(event,event.createdAt+55);__gardenTestApp.render();});
    const bolt=await page.locator('#view canvas').screenshot({path:path.join(output,'lighting-night-bolt.png')});metrics.bolt=mean(png(bolt));
    assert(metrics.bolt.luma>metrics.storm.luma&&metrics.bolt.luma-metrics.storm.luma<12,'night lightning remains visible and restrained');
    await page.evaluate(()=>__gardenTestStorm.reset());const filter=await page.evaluate(()=>__gardenTestApp.canvas.style.filter);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#lightning-enabled').disabled);
    assert.equal(await page.evaluate(()=>__gardenTestStorm.trigger()),false);
    assert.equal(await page.evaluate(()=>__gardenTestApp.canvas.style.filter),filter,'slow lighting is unchanged by reduced motion');
    await page.emulateMedia({reducedMotion:'no-preference'});
    const beforeHidden=await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));return __gardenTestLighting.snapshot().samples;});
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__gardenTestApp.stop();});
    assert.equal(await page.evaluate(()=>__gardenTestLighting.snapshot().samples),beforeHidden+1,'one immediate resume sample');
    const fixture=await page.evaluate(()=>({specimens:__gardenTestGarden.specimens,grass:__gardenTestEcology.grassCells}));
    const canvas=await page.context().newPage();await canvas.goto(origin+'/canvas.html');
    await canvas.evaluate(()=>{gardenLighting.setMode('night');updateGardenLighting(Date.now(),true);});
    await canvas.getByLabel('Day/night cycle',{exact:true}).uncheck();
    assert.equal(await canvas.locator('.garden-stage').evaluate(node=>node.style.filter),'none');
    await canvas.getByLabel('Day/night cycle',{exact:true}).check();
    assert.match(await canvas.locator('.garden-stage').evaluate(node=>node.style.filter),/garden-local-light/);
    await canvas.evaluate(fixture=>{gardenModel.seed(fixture.specimens);gardenEcology.seed({grassCells:fixture.grass,puddles:[]});drawGarden();},fixture);
    for(const phase of ['dawn','day','golden','dusk','night']) {
      await canvas.evaluate(phase=>{gardenLighting.setMode(phase);updateGardenLighting(Date.now(),true);},phase);
      await canvas.locator('canvas').first().screenshot({path:path.join(output,`lighting-canvas-${phase}.png`)});
      const matrix=await canvas.locator('#garden-light-matrix').getAttribute('values');
      const expected=await page.evaluate(phase=>PacketGardenLighting.compose(PacketGardenLighting.atHour(PacketGardenLighting.presets[phase])).join(' '),phase);
      assert.equal(matrix,expected,'Canvas and Pixi use the same color matrix');
    }
    await canvas.close();
    // A test-only sheet presents the actual captures; no regenerated artwork.
    const sheet=await page.context().newPage();await sheet.setViewportSize({width:1320,height:570});
    await sheet.setContent(`<html><body style="margin:0;padding:12px;background:#151c20;color:#dae2de;font:16px system-ui;display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${Object.entries(shots).map(([name,bytes])=>`<figure style="margin:0"><figcaption style="padding:4px">${name==='storm'?'Night · hurricane':name}</figcaption><img style="display:block;width:100%" src="data:image/png;base64,${bytes.toString('base64')}"></figure>`).join('')}</body></html>`);
    await sheet.screenshot({path:path.join(output,'lighting-comparison.png'),fullPage:true});await sheet.close();
    // Unmodified live mode under two real browser timezones; no public controls.
    for(const timezoneId of ['UTC','Asia/Tokyo']) {
      const liveContext=await browser.newContext({timezoneId,viewport:{width:960,height:720}}),livePage=await liveContext.newPage();
      await livePage.goto(origin+'/?live-lighting=1');await livePage.waitForFunction(()=>window.__gardenTestLighting?.state);
      const live=await livePage.evaluate(()=>({mode:__gardenTestLighting.mode,hour:__gardenTestLighting.state.hour,expected:PacketGardenLighting.localHour(Date.now())}));
      assert.equal(live.mode,'live');assert(Math.abs(live.hour-live.expected)<.01);assert.equal(await livePage.locator('#lighting-mode').count(),0);
      await livePage.getByLabel('Day/night cycle',{exact:true}).uncheck();
      assert.equal(await livePage.evaluate(()=>__gardenTestApp.canvas.style.filter),'none');
      await livePage.getByLabel('Day/night cycle',{exact:true}).check();
      assert.equal(await livePage.evaluate(()=>__gardenTestLighting.enabled),true);
      await liveContext.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'lighting-comparison.json'),JSON.stringify(metrics,null,2));
    console.log('PASS: Chrome five-phase/Canvas comparison, night rain/bolt, live browser timezones, reduced motion/resume and stable resources:',JSON.stringify(metrics));
    await page.reload();await page.waitForFunction(()=>window.__gardenTestLighting?.state);
  }
  async function checkOvercrowding(page) {
    await page.reload();await page.waitForFunction(()=>window.__gardenTestGnomes);
    await page.locator('#trigger-overcrowding').click();
    await page.evaluate(()=>{window.__overcrowdingAudit=__gardenTestGnomes.incident;});
    assert.equal(await page.evaluate(()=>__gardenTestGnomes.incident.mode),'overcrowding');
    assert.equal(await page.evaluate(()=>__gardenTestGarden.byCell.size),640);
    await page.waitForFunction(()=>__gardenTestGnomes.actors[0]?.state==='snip');
    await page.locator('#view canvas').screenshot({path:path.join(output,'overcrowding-snip.png')});
    await page.waitForFunction(()=>!__gardenTestGnomes.incident,null,{timeout:60000});
    const result=await page.evaluate(()=>({cuts:__overcrowdingAudit.removals,occupied:__gardenTestGarden.byCell.size,
      sprites:__gardenTestApp.stage.children[0].children[6].children.length}));
    assert(result.cuts>0&&result.cuts<=32);assert.equal(result.occupied,640-result.cuts);assert.equal(result.sprites,result.occupied);
    assert.equal(await page.evaluate(()=>__gardenTestApp.stage.children[0].children[8].children.length),0);
    assert.equal(await page.evaluate(()=>__gardenAudioContexts.length),0,'silent crew does not initialize audio');
    await page.locator('#trigger-landscaping').click();
    assert.match(await page.locator('#landscaping-test-status').textContent(),/cooldown/);
    await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
    await page.waitForFunction(()=>window.__gardenTestGnomes);await page.locator('#trigger-overcrowding').click();
    assert(await page.evaluate(()=>__gardenTestGnomes.actors[0].x===__gardenTestGnomes.actors[0].targetX));
    await page.waitForFunction(()=>__gardenTestGnomes.actors[0]?.state==='snip');
    const left=await page.evaluate(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
      return __gardenTestGarden.byCell.size;
    });
    assert.equal(await page.evaluate(()=>__gardenTestGnomes.actors.length),0);
    assert.equal(await page.evaluate(()=>__gardenTestApp.stage.children[0].children[8].children.length),0);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});
      document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
    assert.equal(await page.evaluate(()=>__gardenTestGarden.byCell.size),left);
    assert.equal(await page.evaluate(()=>__gardenTestGnomes.incident),null);
    await page.emulateMedia({reducedMotion:'no-preference'});
    console.log('PASS: Chrome overcrowding bounded best-effort cuts:',JSON.stringify(result),'shared cooldown, reduced motion, silent/hidden cleanup.');
  }
  async function checkCanvasOvercrowding(page) {
    await page.reload();await page.waitForFunction(()=>typeof gardenGnomes!=='undefined');
    await page.evaluate(()=>{
      const types=['flower','mushroom','broadleaf','vine','wirefern','weed'];
      gardenModel.seed(Array.from({length:640},(_,i)=>({type:types[i%types.length],column:i%32,
        row:Math.floor(i/32),createdAt:Date.now()-65000,colorVariant:0})));
      gardenGnomes.startLandscaping(Date.now(),undefined,'overcrowding');
      window.__canvasOvercrowdingAudit=gardenGnomes.incident;
    });
    await page.waitForFunction(()=>gardenGnomes.actors[0]?.state==='snip');
    await page.locator('canvas').first().screenshot({path:path.join(output,'overcrowding-canvas.png')});
    await page.waitForFunction(()=>!gardenGnomes.incident,null,{timeout:60000});
    const result=await page.evaluate(()=>({cuts:__canvasOvercrowdingAudit.removals,occupied:gardenModel.byCell.size}));
    assert(result.cuts>0&&result.cuts<=32);assert.equal(result.occupied,640-result.cuts);
    assert.equal(await page.evaluate(()=>gardenState.actors.length),0);
    assert.match(await page.locator('#garden-status').textContent(),/flower/);
    console.log('PASS: Chrome Canvas overcrowding bounded best-effort cuts:',JSON.stringify(result),'counts and actor cleanup.');
  }
  async function checkCanvasLandscaping(page) {
    await page.evaluate(()=>{
      gardenModel.seed(Array.from({length:50},(_,i)=>({type:i<32?'vine':'broadleaf',column:10+i%10,
        row:6+Math.floor(i/10),createdAt:Date.now()-65000,colorVariant:'aqua'})));
      gardenGnomes.startLandscaping(Date.now(),()=>.5);
    });
    await page.waitForFunction(()=>gardenGnomes.actors[0]?.state==='snip');
    await page.locator('canvas').first().screenshot({path:path.join(output,'landscaping-canvas.png')});
    await page.waitForFunction(()=>!gardenGnomes.incident);
    assert.equal(await page.evaluate(()=>gardenModel.specimens.length),42);
    assert.equal(await page.evaluate(()=>gardenState.actors.length),0);
    console.log('PASS: Chrome Canvas landscaping sequential snips, actual removal, freed occupancy and actor cleanup.');
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
      const moving=await sample(page);
      await page.evaluate(()=>__gardenTestStorm.reset());await trigger();const strikeWindow=await sample(page,24);
      // Freeze only the test screenshot at 55ms so the short bolt is reproducible.
      await page.evaluate(()=>__gardenTestStorm.reset());await trigger();
      const points=await page.evaluate(()=>{const app=__gardenTestApp,root=app.stage.children[0],event=__gardenTestStorm.active;
        app.stop();__gardenTestStormView.animate(event,event.createdAt+55);app.render();
        return event.points.map(p=>({x:(root.position.x+p.x*root.scale.x)*app.canvas.width/app.renderer.screen.width,
          y:(root.position.y+p.y*root.scale.y)*app.canvas.height/app.renderer.screen.height}));});
      const after=png(await page.locator('#view canvas').screenshot({path:path.join(output,`${level}-bolt.png`)}));
      let hits=0,total=0;
      for(let i=1;i<points.length;i++)for(const t of [.25,.5,.75]) {
        const x=Math.round(points[i-1].x*(1-t)+points[i].x*t),y=Math.round(points[i-1].y*(1-t)+points[i].y*t);let hit=false;
        for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const at=((y+dy)*after.width+x+dx)*after.channels;
          if(after.data[at]>180&&after.data[at+1]>185&&after.data[at+2]>195)hit=true;}
        if(hit)hits++;total++;
      }
      assert(hits/total>.8,'a pale jagged strike must actually appear along its rendered path');
      const brightening=average(after)-average(before);assert(brightening>0);
      results[level]={idle,active:moving,strikeWindow,meanPixelBrightening:brightening,boltPixelCoverage:hits/total};
      await page.evaluate(()=>{__gardenTestStorm.reset();__gardenTestApp.start();});
    }
    await page.getByRole('button',{name:'Sound: Off',exact:true}).click();
    const tones=await page.evaluate(()=>__gardenAudioTones.length),sources=await page.evaluate(()=>__gardenAudioSources.length);await trigger();
    await page.waitForFunction(n=>__gardenAudioTones.length===n+1,tones);
    assert.equal(await page.evaluate(()=>__gardenAudioContexts.length),1);
    assert.equal(await page.evaluate(()=>__gardenAudioSources.length),sources+1);
    await weather('heavy_rain');assert.equal(await active(),false);
    await weather('botnet_thunderstorm');await trigger();const noReplay=await page.evaluate(()=>__gardenAudioTones.length);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await active(),false);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
    assert.equal(await page.evaluate(()=>__gardenAudioTones.length),noReplay);assert(await page.evaluate(()=>__gardenTestStorm.nextAt>Date.now()+59000));
    await page.emulateMedia({reducedMotion:'reduce'});await trigger();assert.equal(await active(),false);
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.querySelector('#lightning-enabled').disabled);
    await page.locator('#lightning-enabled').uncheck();await trigger();assert.equal(await active(),false);await page.locator('#lightning-enabled').check();
    results.resources={displayObjects:3,cachedTextures:0,extraRenderLoops:0,maxPathPoints:23,
      strikeBuildMs:await page.evaluate(()=>__gardenStrikeBuildMs)};
    await fs.writeFile(path.join(output,'storm-timing.json'),JSON.stringify(results,null,2));console.log('Storm timing:',JSON.stringify(results));
    await page.getByRole('slider',{name:'Growth sound volume'}).fill('100');
    const audioResults={};
    for(const level of ['botnet_thunderstorm','botnet_hurricane']) {
      await weather(level);await page.evaluate(()=>{__gardenTestStorm.reset();window.__gardenAudioRecording=[];});
      await trigger();await page.waitForFunction(()=>__gardenTestStorm.active===null);
      audioResults[level]=await saveAudio(page,level);
      assert(audioResults[level].peak>.15&&audioResults[level].rms>.012,'thunder must reach meaningful rendered output amplitude');
      assert.equal(audioResults[level].clippedSamples,0);
    }
    await page.evaluate(()=>{window.__gardenAudioRecording=[];gardenSound.maybePlayGrowthSound('flower',performance.now(),.5);});
    await page.waitForFunction(()=>__gardenAudioRecording.length>=12);
    audioResults.flower=await saveAudio(page,'flower');
    assert(audioResults.flower.peak>.5,'full-volume garden output must be louder than the former .38 peak');
    assert.equal(audioResults.flower.clippedSamples,0);
    await page.evaluate(()=>{window.__gardenAudioRecording=[];gardenSound.maybePlayThunderSound('botnet_hurricane');
      gardenSound.maybePlayGrowthSound('blackthorn',performance.now()+2000,.5);gardenSound.maybePlayCollectionSound();gardenSound.maybePlayGnomeSound('victory');});
    await page.waitForFunction(()=>__gardenAudioRecording.length>=50);
    audioResults.mixed=await saveAudio(page,'mixed');assert.equal(audioResults.mixed.clippedSamples,0,'overlapping output must retain headroom');
    await page.getByRole('button',{name:'Sound: On',exact:true}).click();
    await page.evaluate(()=>{__gardenTestStorm.reset();window.__gardenAudioRecording=[];});await trigger();
    await page.waitForFunction(()=>__gardenTestStorm.active===null);
    audioResults.muted=await saveAudio(page,'muted',false);assert.equal(audioResults.muted.peak,0,'muted lightning renders silence');
    await fs.writeFile(path.join(output,'audio-output.json'),JSON.stringify(audioResults,null,2));console.log('Rendered audio:',JSON.stringify(audioResults));
  }
  async function saveAudio(page,name,expectSignal=true) {
    const capture=await page.evaluate(()=>{const samples=__gardenAudioRecording.flat();window.__gardenAudioRecording=null;
      return {samples,sampleRate:__gardenAudioContexts[0].sampleRate};});
    const bytes=Buffer.alloc(44+capture.samples.length*2),size=capture.samples.length*2;
    bytes.write('RIFF');bytes.writeUInt32LE(36+size,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);
    bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(capture.sampleRate,24);
    bytes.writeUInt32LE(capture.sampleRate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(size,40);
    let peak=0,sum=0,active=0,clipped=0;
    capture.samples.forEach((value,i)=>{peak=Math.max(peak,Math.abs(value));sum+=value*value;if(Math.abs(value)>.001)active++;if(Math.abs(value)>=.99)clipped++;
      bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+i*2);});
    await fs.writeFile(path.join(output,`${name}-output.wav`),bytes);
    if(expectSignal)assert(active>0,'actual output PCM must contain signal, not only scheduled nodes');
    return {peak,rms:Math.sqrt(sum/capture.samples.length),activeSamples:active,clippedSamples:clipped,sampleRate:capture.sampleRate};
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
