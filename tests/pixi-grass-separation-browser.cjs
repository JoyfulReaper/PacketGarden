// Installed Chrome/Playwright only; deterministic screenshots and actual WebGL ownership.
if (!process.argv.includes('--run')) console.log('SKIP: grass separation Chrome review; pass --run [--baseline].');
else run().catch(error => { console.error(error); process.exitCode=1; });
async function run() {
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
  const {execFileSync}=require('node:child_process'),{chromium}=require('playwright'),{createHash}=require('node:crypto');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),baseline=process.argv.includes('--baseline');
  const output=path.join(root,'artifacts/grass-separation',baseline?'before':'after');await fs.mkdir(output,{recursive:true});
  const checkpoint=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),old=new Map();
  if(baseline)for(const file of ['index.html','pixi-live.html','pixi-live-core.js','pixi-live.js','pixi-live-ecology.js'])old.set(file,execFileSync('git',['show',`${checkpoint}:wwwroot/${file}`],{cwd:root}));
  const capture=`{
    const f=window.__separation={bakes:[],geometry:0,streams:0,contexts:[]};
    const NativeSource=EventSource;window.EventSource=class extends NativeSource{constructor(...args){super(...args);f.streams++;}};
    const garden=PacketGardenCore.createGardenModel;PacketGardenCore.createGardenModel=(...args)=>{const m=garden(...args);f.garden??=m;return m;};
    const model=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(view,options)=>{f.view=view;return f.model=model(view,{...options,sporeRandom:()=>.9});};
    const ecology=PacketGardenEcology.createEcologyModel;PacketGardenEcology.createEcologyModel=(...args)=>(f.ecology=ecology(...args));
    const presentation=PacketGardenPixiEcology.createEcologyView;PacketGardenPixiEcology.createEcologyView=(...args)=>(f.ground=presentation(...args));
    const light=PacketGardenLighting.createModel;PacketGardenLighting.createModel=(...args)=>(f.light=light(...args));
    const surface=PacketGardenLightingView.createSurface;PacketGardenLightingView.createSurface=(...args)=>(f.surface=surface(...args));
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const generate=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{
        const start=performance.now(),texture=generate(options);f.bakes.push({width:options.frame.width,height:options.frame.height,ms:performance.now()-start,source:texture.source});return texture;};return value;});};
    for(const name of ['clear','moveTo','quadraticCurveTo','bezierCurveTo','ellipse','circle','fill','stroke']){const original=PIXI.Graphics.prototype[name];PIXI.Graphics.prototype[name]=function(...args){f.geometry++;return original.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__separation.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=old.get(file)??await fs.readFile(absolute);
    if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__separation.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(error){res.writeHead(404);res.end(String(error));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const errors=[],report={baseline,checkpoint,scenes:[],resources:[],timing:[],occupancy:[]};
  // Same explicit fixture traits, foliage and coordinates on BOTH versions.
  const at=1800000000000,types=['broadleaf','vine','flower','mushroom','wirefern','weed','ghostbloom','blackthorn','crystalfungus','redbloom'];
  const entry=(i,cell,type=types[i%types.length])=>({type,column:cell%32,row:Math.floor(cell/32),vigor:i%4,colorVariant:i%17===0?4:i%4,
    createdAt:at-(type==='redbloom'?3000:i%23===0?10000:65000),broadleafBloom:type==='broadleaf'&&i%3!==0?{color:i%5,arrangement:i%3}:null,
    vineBloom:type==='vine'&&i%3!==0?{color:i%4,layout:i%2}:null,origin:{kind:'simulated',eventType:'grass-separation-review'}});
  const mixed=Array.from({length:260},(_,i)=>entry(i,(i*73+7)%640));
  const broadleaf=Array.from({length:168},(_,i)=>entry(i,(Math.floor(i/24)+6)*32+i%24+4,'broadleaf'));
  const vines=Array.from({length:168},(_,i)=>entry(i,(Math.floor(i/24)+6)*32+i%24+4,'vine'));
  const sparse=Array.from({length:16},(_,i)=>entry(i,(Math.floor(i/8)*7+7)*32+(i%8)*3+4));
  const full=Array.from({length:640},(_,i)=>entry(i,i));
  try {
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]) {
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',error=>errors.push(error.stack));
      await page.addInitScript(()=>{
        window.__separationNow=1800000000000;Date.now=()=>__separationNow;let seed=137;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        window.__separationTimers=0;const interval=setInterval;window.setInterval=(...args)=>{__separationTimers++;return interval(...args);};
      });
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>window.__separation?.app?.ticker?.started&&__separation.ground);
      await page.evaluate(()=>__separation.app.stop());if(name==='diagnostic')await page.locator('#probes').uncheck();
      const render=()=>page.evaluate(()=>{window.__separationFrame=(window.__separationFrame??performance.now())+1000;__separation.app.ticker.update(__separationFrame);__separation.app.render();});
      const seed=async(entries,{enabled=true,night=false,grass=true,ages=false}={})=>{
        await page.evaluate(({entries,enabled,night,grass,ages})=>{
          const f=__separation,foliage=entries.map(p=>p.colorVariant);
          for(const g of f.view.vineLinks.values())f.contexts.push(g.context);
          f.garden.clear();f.ecology.clear();f.ecology.setAllowGrassUnderPlants(enabled);document.querySelector('#allow-grass-under-plants').checked=enabled;
          f.garden.seed(entries);for(let i=0;i<entries.length;i++){entries[i].colorVariant=foliage[i];f.view.update(entries[i],f.garden.byCell);}
          if(grass)f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>{
            const age=ages?[60000,1250000,1500000,1800000,2000000][Math.floor(i%32/7)%5]:60000;
            return {column:i%32,row:Math.floor(i/32),createdAt:Date.now()-age,lastInfluencedAt:Date.now()-age};})});
          f.ecology.resetCadence(Date.now());f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);
        },{entries,enabled,night,grass,ages});await render();
      };
      const shot=async(scene,entries,options={})=>{
        await seed(entries,options);const state=await page.evaluate(()=>({plants:__separation.garden.specimens.length,grass:__separation.ecology.grassCells.length,
          shadows:__separation.ground.shadowViews?.size??0,groups:__separation.view.bloomViews.size,vineBlooms:__separation.view.vineBloomViews.size,links:__separation.view.snapshot().connectionHalves,
          accepted:__separation.model.counts.acceptedLive,score:document.querySelector('#garden-score').textContent}));
        assert.equal(state.plants,entries.length);assert.equal(state.grass,options.grass===false?0:options.enabled===false?640-entries.length:640);
        if(!baseline)assert.equal(state.shadows,options.grass===false||options.enabled===false?0:entries.length);
        assert.equal(state.score,'Score: 0');assert.equal(state.accepted,0);
        await page.locator('#view canvas').screenshot({path:path.join(output,`${name}-${scene}.png`)});
        report.scenes.push({page:name,scene,fixtureHash:createHash('sha256').update(JSON.stringify({entries,options})).digest('hex'),...state});
      };
      await shot('mixed-off-day',mixed,{enabled:false});await shot('mixed-on-day',mixed);await shot('mixed-on-night',mixed,{night:true});
      await shot('dense-broadleaf',broadleaf);await shot('dense-vines',vines);await shot('sparse',sparse);await shot('aging-grass',mixed,{ages:true});
      await shot('full-off-day',full,{enabled:false});await shot('full-on-day',full);await shot('full-on-night',full,{night:true});
      // CPU submission uses real RAF. Frozen screenshot HUD gaps are not timings.
      report.timing.push({page:name,...await page.evaluate(async()=>{
        const submissions=[],intervals=[],geometry=__separation.geometry,bakes=__separation.bakes.length;let last;
        for(let i=0;i<120;i++){await new Promise(resolve=>requestAnimationFrame(resolve));const start=performance.now();if(last!==undefined)intervals.push(start-last);last=start;__separation.app.render();submissions.push(performance.now()-start);}
        if(__separation.geometry!==geometry||__separation.bakes.length!==bakes)throw Error('Recurring geometry/texture generation');
        const mean=a=>a.reduce((a,b)=>a+b,0)/a.length;return {samples:120,meanSubmitMs:mean(submissions),maxSubmitMs:Math.max(...submissions),meanFrameMs:mean(intervals)};
      })});
      report.occupancy.push({page:name,...await page.evaluate(()=>{
        const times=[];for(let i=0;i<3;i++){const start=performance.now();for(const p of __separation.garden.specimens)__separation.ground.specimenChanged?.(p);times.push(performance.now()-start);}
        return {passes:3,cellsPerPass:640,meanPassMs:times.reduce((a,b)=>a+b,0)/3};
      })});
      const resources=await page.evaluate(()=>({bakes:__separation.bakes.length,timers:__separationTimers,streams:__separation.streams,
        dimensions:__separation.bakes.map(b=>[b.width,b.height]),bakeMs:__separation.bakes.map(b=>b.ms),displayObjects:__separation.view.snapshot().displayObjects,
        shadows:__separation.ground.shadowViews?.size??0,ecologyFrames:__separation.ground.snapshot().grassTextures+__separation.ground.snapshot().puddleTextures+(__separation.ground.snapshot().shadowTextures??0)}));
      assert.equal(resources.bakes,5);assert.equal(resources.timers,0);assert.equal(resources.streams,1);report.resources.push({page:name,...resources});
      for(let i=0;i<4;i++)await seed(full);
      assert.equal(await page.evaluate(()=>__separation.bakes.length),resources.bakes);
      assert.equal(await page.evaluate(()=>__separation.view.snapshot().displayObjects),resources.displayObjects);
      if(!baseline) {
        // Real input, exact parent removal restores cached open texture; checkbox
        // removes only overlaps and re-enable creates nothing.
        await seed(sparse);await page.locator('#view canvas').scrollIntoViewIfNeeded();
        const bounds=await page.locator('#view canvas').boundingBox();
        const point=await page.evaluate(()=>{const p=__separation.garden.specimens[0],root=__separation.view.root,s=__separation.app.renderer.screen;return{x:(root.position.x+(p.column+.5)*30*root.scale.x)/s.width,y:(root.position.y+(p.row+.5)*30*root.scale.y)/s.height};});
        await page.mouse.click(bounds.x+point.x*bounds.width,bounds.y+point.y*bounds.height);
        await page.waitForFunction(()=>!document.querySelector('#specimen-card').hidden);assert.notEqual(await page.locator('#specimen-card-title').textContent(),'Wild grass');
        await page.evaluate(()=>{
          const f=__separation,p=f.garden.specimens[0],record=f.ground.grassViews.get(p.cell),sprite=record.sprite,shadow=f.ground.shadowViews.get(p.id);
          f.garden.remove(p);if(!shadow.destroyed||record.sprite!==sprite||record.specimen||f.ground.shadowViews.has(p.id))throw Error('Stale shade/shadow after removal');
        });
        await page.locator('#allow-grass-under-plants').uncheck();assert.equal(await page.evaluate(()=>__separation.ground.shadowViews.size),0);
        const count=await page.evaluate(()=>__separation.ecology.grassCells.length);await page.locator('#allow-grass-under-plants').check();
        assert.equal(await page.evaluate(()=>__separation.ecology.grassCells.length),count);assert.equal(await page.evaluate(()=>__separation.ground.shadowViews.size),0);
        await seed(mixed);await page.emulateMedia({reducedMotion:'reduce'});await render();
        await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await render();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#view canvas').screenshot({path:path.join(output,`${name}-mixed-mobile.png`)});
        await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await seed(mixed);await page.evaluate(()=>{
          const f=__separation;f.ecology.updateWeatherEligibility('botnet_hurricane',Date.now());f.view.setWeather({level:'botnet_hurricane',eventsPerMinute:10000});
          const p=f.ecology.createStormPuddle(Date.now());f.light.setMode('night');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,.34);
          if(!p||f.ground.shadowViews.size!==260)throw Error('Weather disturbed contact ownership');
        });await render();await page.locator('#view canvas').screenshot({path:path.join(output,`${name}-night-weather.png`)});
        await page.evaluate(()=>{
          Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__separationNow+=720001;
          Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__separation.app.stop();
        });assert.equal(await page.evaluate(()=>__separation.ground.shadowViews.size),0);
        // Fresh retained scene: direct page close must also release all shadows.
        await page.evaluate(()=>{const f=__separation;f.garden.seed(Array.from({length:640},(_,i)=>({type:'vine',column:i%32,row:Math.floor(i/32),createdAt:Date.now()-65000,vigor:i%4})));
          f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}))});
          f.heldShadows=[...f.ground.shadowViews.values()];for(const g of f.view.vineLinks.values())f.contexts.push(g.context);});
      }
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      assert.equal(await page.evaluate(()=>__separation.view.byId.size),0);assert.equal(await page.evaluate(()=>__separation.bakes.every(b=>b.source.destroyed)),true);
      if(!baseline){assert.equal(await page.evaluate(()=>__separation.heldShadows.every(s=>s.destroyed)),true);assert.equal(await page.evaluate(()=>__separation.ground.shadowViews.size+__separation.ground.grassViews.size),0);assert.equal(await page.evaluate(()=>__separation.contexts.every(c=>c.destroyed)),true);}
      await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2));
    if(!baseline) {
      const before=JSON.parse(await fs.readFile(path.join(output,'../before/review.json'),'utf8'));
      assert.deepEqual(report.scenes.map(({shadows,...scene})=>scene),before.scenes.map(({shadows,...scene})=>scene),'identical fixtures, plant/grass/bloom/connection counts and score');
      const sections=report.scenes.map(s=>{const file=`${s.page}-${s.scene}.png`;return `<section><h2>${s.page} · ${s.scene}</h2><p><button data-state="before">Before</button> <button data-state="after">After</button> · <a href="before/${file}">Before PNG</a> · <a href="after/${file}">After PNG</a></p><img data-file="${file}" src="after/${file}" alt="After: ${s.page} ${s.scene}"></section>`;}).join('');
      await fs.writeFile(path.join(output,'../comparison.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PacketGarden grass separation review</title><style>body{margin:24px;background:#19271f;color:#e2ebdb;font:16px system-ui}h1{font-size:24px}h2{font-size:19px}section{margin:32px 0}img{display:block;width:100%;max-width:1220px;height:auto}button{font:inherit;padding:6px 14px}a{color:#b8d9ce}</style><h1>Grass and plant separation · matching before/after</h1><p>Same deterministic layouts, normal garden scale. Use Before/After to compare without moving the scene. No gameplay changes. Baseline ${checkpoint}.</p>${sections}<script>for(const button of document.querySelectorAll('button'))button.onclick=()=>{const img=button.closest('section').querySelector('img');img.src=button.dataset.state+'/'+img.dataset.file;img.alt=button.textContent+': '+img.dataset.file;};</script>`);
    }
    console.log('PASS: deterministic normal-scale comparisons on both pages, occupancy/input/weather/hidden/reset/teardown checks; resources and CPU samples:',JSON.stringify(report));
  } finally { await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve)); }
}
