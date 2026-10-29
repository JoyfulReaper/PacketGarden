// Real WebGL, at the actual 960x600 garden scale. Controlled fixtures never invent network events.
if(!process.argv.includes('--run'))console.log('SKIP: campfire Chrome review; pass --run with installed Chrome/Playwright.');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),out=path.join(root,'artifacts/gnome-campfire');await fs.mkdir(out,{recursive:true});
  const capture=`{
    const f=window.__fire={apps:0,streams:0,bakes:[],contexts:[],geometry:0,reduced:false,removed:[]};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenPixiLiveCore','model','createModel'],
      ['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenGnomes','gnomes','createModel'],
      ['PacketGardenPixiGnomes','gnomeView','createGnomeView'],['PacketGardenPixiGnomes','cache','makeGnomeAtlas'],
      ['PacketGardenAmbient','ambient','createAmbientModel'],['PacketGardenPixiUi','ui','createUi'],
      ['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface']]){
      const create=window[global][method];window[global][method]=(...args)=>{
        if(key==='model'){
          f.view=args[0];const change=f.view.terrainChange;f.view.terrainChange=function(c){if(c.kind==='terrain-removed')f.removed.push({log:c.terrain,reason:c.reason,sprite:f.view.terrainViews.get(c.terrain)});return change.call(this,c);};
          args[1]={...args[1],competitionRandom:()=>.99,sporeRandom:()=>.9,bloomRandom:()=>.9};
        }
        if(key==='gnomes'){const reduced=args[0].getReducedMotion;args[0]={...args[0],random:()=>.5,puddleRandom:()=>.99,getReducedMotion:()=>f.reduced||reduced()};}
        if(key==='gnomeView'){const reduced=args[3];args[3]=()=>f.reduced||reduced();}
        const value=create(...args);f[key]??=value;return value;
      };
    }
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;f.apps++;return init.apply(this,args).then(value=>{
      const bake=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const t=bake(options);f.bakes.push(t.source);return t;};return value;
    });};
    const Graphics=PIXI.Graphics;PIXI.Graphics=class extends Graphics{constructor(...args){super(...args);f.contexts.push(this.context);}};
    for(const key of ['clear','moveTo','poly','rect','circle','stroke','fill']){const fn=Graphics.prototype[key];Graphics.prototype[key]=function(...args){f.geometry++;return fn.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__fire.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'||file==='api/garden/visit'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__fire.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],report={scenes:[],resources:[],cpu:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__fireNow=1800000000000;Date.now=()=>__fireNow;let seed=77;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>__fire?.app?.ticker?.started&&__fire.gnomes);
      await page.evaluate(()=>{__fire.app.stop();const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.deepEqual(await page.evaluate(()=>[__fire.app.renderer.screen.width,__fire.app.renderer.screen.height]),[960,600]);
      const seed=async(options={})=>page.evaluate(({grass=false,night=false,rain=false,reduced=false,full=false})=>{
        const f=__fire;f.gnomes.clear();f.ambient.clear();f.ecology.clear();f.reduced=reduced;
        if(full){f.model.seedLogs('full');f.model.forceLogFixture();__fireNow+=2000;f.model.tick(Date.now());}
        else f.model.seedCampfire();
        f.log=f.model.terrain.logs[0];if(!f.log)throw Error('No actual log');f.source=f.view.terrainViews.get(f.log);
        f.sourceTexture=f.source.texture;f.pose=JSON.stringify([f.source.tint,f.source.alpha,f.source.rotation,f.source.position.x,f.source.position.y]);
        f.cell=f.log.cell;f.beforeCounts=JSON.stringify(f.model.counts);f.beforeRecent=JSON.stringify(f.model.recentEvents);f.beforePlants=f.model.specimens.length;
        if(grass){f.ecology.setAllowGrassUnderPlants(true);f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-65000,lastInfluencedAt:Date.now()}))});}
        f.ecology.resetCadence(Date.now());f.gnomes.resetCadence(Date.now());f.view.setWeather({level:rain?'rain':'quiet',eventsPerMinute:rain?1000:0});
        f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,rain?.07:0);f.app.render();
      },options);
      const start=()=>page.evaluate(()=>{const f=__fire;f.startedAt=Date.now();if(!f.gnomes.startCampfire(Date.now(),()=>.5,true))throw Error('Campfire did not start');f.gnomeView.animate(Date.now());f.app.render();});
      const step=ms=>page.evaluate(ms=>{const f=__fire,end=Date.now()+ms;while(Date.now()<end){__fireNow=Math.min(end,__fireNow+250);f.model.tick(Date.now());f.gnomes.tick(Date.now(),()=>.99);f.gnomeView.animate(Date.now());f.view.animate(0,.016,Date.now());}f.app.render();},ms);
      const shot=async scene=>{
        const state=await page.evaluate(()=>{const f=__fire;return{phase:f.gnomes.incident?.phase??'idle',actors:f.gnomes.actors.length,fire:Boolean(f.gnomeView.fire),char:Boolean(f.gnomeView.char),
          blocked:f.model.terrain.isBlocked(f.cell),occupied:f.model.byCell.has(f.cell),free:f.model.freeCellCount(),plants:f.model.specimens.length,
          countsStable:JSON.stringify(f.model.counts)===f.beforeCounts,recentStable:JSON.stringify(f.model.recentEvents)===f.beforeRecent,accepted:f.model.counts.acceptedLive,
          poseStable:f.source.destroyed||JSON.stringify([f.source.tint,f.source.alpha,f.source.rotation,f.source.position.x,f.source.position.y])===f.pose,
          score:document.querySelector('#garden-score').textContent};});
        assert(state.countsStable&&state.recentStable&&state.poseStable);assert.equal(state.accepted,0);assert.equal(state.score,'Score: 0');
        await page.locator('#view').screenshot({path:path.join(out,`${name}-${scene}.png`)});report.scenes.push({page:name,scene,...state});
      };
      await seed();await start();await step(1000);await shot('approach');await step(2000);await shot('gathered');
      await step(3500);await shot('burning');assert(await page.evaluate(()=>__fire.model.terrain.byCell.get(__fire.cell)===__fire.log));
      await step(10000);await shot('charred');assert(await page.evaluate(()=>__fire.gnomeView.char.texture===__fire.sourceTexture&&!__fire.sourceTexture.destroyed));
      await step(500);await shot('burned-out-empty');assert(await page.evaluate(()=>!__fire.model.isCellOccupied(__fire.log.column,__fire.log.row)&&__fire.source.destroyed));
      await step(2500);await shot('departure');await step(1500);await shot('finished');
      for(const [scene,options] of [['night',{night:true}],['rain',{rain:true}],['night-rain-grass',{night:true,rain:true,grass:true}],['reduced-motion',{reduced:true}]]){
        await seed(options);await start();await step(6500);await shot(scene);
        if(options.reduced){const fire=await page.evaluate(()=>{const f=__fire,s=f.gnomeView.fire,t=s.texture,alpha=s.alpha;for(let i=0;i<60;i++)f.gnomeView.animate(Date.now()+i*10);return{same:s.texture===t&&s.alpha===alpha,alpha};});assert(fire.same);}
      }
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='';el.style.height='';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await seed();await start();await step(6500);await page.locator('#view').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(out,`${name}-mobile.png`)});
      await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      // Real click routing: the camper keeps the same one-attempt underpants behavior.
      await seed();await start();await step(4500);
      await page.locator('#view').scrollIntoViewIfNeeded();
      const point=await page.evaluate(()=>{const f=__fire,a=f.gnomes.actors[0],r=f.app.canvas.getBoundingClientRect();return{x:r.left+(f.view.root.position.x+a.x*f.view.root.scale.x)*r.width/f.app.renderer.screen.width,y:r.top+(f.view.root.position.y+a.y*f.view.root.scale.y)*r.height/f.app.renderer.screen.height};});
      await page.mouse.click(point.x,point.y);await page.mouse.click(point.x,point.y);
      assert(await page.evaluate(()=>__fire.gnomes.actors[0].underpantsAttempted&&__fire.ambient.drops.length===1&&!__fire.ui.inspected));
      // Exact-source removal cancels immediately, during approach and burning.
      for(const age of [1000,8000]){await seed();await start();await step(age);assert(await page.evaluate(()=>{const f=__fire,sprites=[...f.gnomeView.views.values(),f.gnomeView.fire,f.gnomeView.char].filter(Boolean);f.model.terrain.remove(f.log,'external-test');return!f.gnomes.incident&&!f.gnomeView.fire&&sprites.every(s=>s.destroyed);}));await step(20000);}
      // A new natural log in the same cell must never inherit an old fire.
      await seed({full:true});await start();await step(8000);
      await page.evaluate(()=>{const f=__fire;f.model.terrain.remove(f.log,'test-before-new-occupant');
        const entries=f.model.specimens.map(p=>({type:p.type,vigor:p.vigor,column:p.column,row:p.row,createdAt:p.createdAt,origin:p.origin}));
        entries.push({type:'blackthorn',vigor:1,column:f.log.column,row:f.log.row,createdAt:Date.now()-PacketGardenCore.timings.blackthorn.expiredAfterMs,origin:{kind:'simulated',eventType:'log-fixture'}});
        f.garden.seed(entries,Date.now()-1);f.model.forceLogFixture();f.other=f.model.terrain.logs[0];
        if(f.other===f.log||f.other.id===f.log.id)throw Error('Replacement fixture identity');});
      await step(20000);assert(await page.evaluate(()=>!__fire.gnomes.incident&&__fire.model.terrain.byCell.get(__fire.cell)===__fire.other));
      // Genuine freed-cell growth in a fully occupied garden uses ordinary placement.
      await seed({full:true});await start();await step(16999);assert.equal(await page.evaluate(()=>__fire.model.freeCellCount()),0);
      await step(1);assert.equal(await page.evaluate(()=>__fire.model.freeCellCount()),1);
      assert(await page.evaluate(()=>{const f=__fire,result=f.model.addSpecimen('flower',0,Date.now(),{kind:'simulated',eventType:'campfire-fixture'});return result.specimen.cell===f.cell&&f.model.specimens.length===640&&!f.model.terrain.isBlocked(f.cell);}));
      // Natural expiry during burning removes via expiry, never campfire.
      await seed();await page.evaluate(()=>{const f=__fire;__fireNow=f.log.expiresAt-5000;f.model.tick(Date.now());for(let i=0;i<35;i++)f.model.addSpecimen('broadleaf',0,Date.now(),{kind:'simulated',eventType:'campfire-fixture'});f.gnomes.resetCadence(Date.now());});
      await start();await step(5000);assert(await page.evaluate(()=>!__fire.gnomes.incident&&__fire.removed.at(-1).reason==='expired'&&!__fire.gnomeView.fire));
      for(const age of [1000,8000,18000])for(const mode of ['hidden','logical-stall','render-stall']){
        await seed();await start();await step(age);
        const result=await page.evaluate(mode=>{const f=__fire,sprites=[...f.gnomeView.views.values(),f.gnomeView.fire,f.gnomeView.char].filter(Boolean),blocked=f.model.terrain.isBlocked(f.cell);
          if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__fireNow+=120000;
            Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;f.app.stop();}
          else{__fireNow+=1501;if(mode==='logical-stall')f.gnomes.tick(Date.now());else f.gnomes.advance(Date.now());}
          return{active:Boolean(f.gnomes.incident),blocked,beforeAfter:f.model.terrain.isBlocked(f.cell),destroyed:sprites.every(s=>s.destroyed),next:f.gnomes.nextCheckAt-Date.now()};
        },mode);assert(!result.active&&result.destroyed);assert.equal(result.blocked,result.beforeAfter);assert.equal(result.next,45000);
      }
      await seed({full:true});
      const cpu=await page.evaluate(()=>{const f=__fire,results=[];for(const mode of ['idle','dispute','campfire']){
        f.gnomes.clear();if(mode==='dispute')f.gnomes.start(Date.now(),()=>.5);if(mode==='campfire'){
          f.gnomes.startCampfire(Date.now(),()=>.5);for(let i=0;i<24;i++){__fireNow+=250;f.gnomes.tick(Date.now(),()=>.99);}}
        const geometry=f.geometry,animate=[],render=[];for(let i=0;i<120;i++){
          __fireNow+=8;if(f.gnomes.incident)f.gnomes.tick(Date.now(),()=>.99);
          const at=performance.now();if(f.gnomes.incident){f.gnomes.advance(Date.now());f.gnomeView.animate(Date.now());}animate.push(performance.now()-at);
          const draw=performance.now();f.app.render();render.push(performance.now()-draw);}
        if(f.geometry!==geometry)throw Error('Per-frame geometry');const stats=a=>({meanMs:a.reduce((s,n)=>s+n,0)/a.length,maxMs:Math.max(...a)});
        results.push({mode,animate:stats(animate),submit:stats(render),sprites:f.gnomeView.snapshot()});
      }f.gnomes.clear();return results;});report.cpu.push({page:name,samples:cpu});
      const logical=await page.evaluate(()=>{const f=__fire,selection=[],burnout=[];
        for(let pass=0;pass<20;pass++){
          f.gnomes.clear();f.model.seedLogs('full');f.model.forceLogFixture();__fireNow+=2000;f.model.tick(Date.now());
          f.gnomes.resetCadence(Date.now());__fireNow+=45000;f.model.tick(Date.now());let index=0;
          let at=performance.now();f.gnomes.tick(Date.now(),()=>[0,.399999,.5,.5][index++]);selection.push(performance.now()-at);
          if(f.gnomes.incident?.type!=='gnome_campfire')throw Error('Full-garden selection probe');
          for(let i=0;i<67;i++){__fireNow+=250;f.model.tick(Date.now());f.gnomes.tick(Date.now(),()=>.99);f.gnomeView.animate(Date.now());}
          __fireNow+=250;f.model.tick(Date.now());at=performance.now();f.gnomes.tick(Date.now(),()=>.99);burnout.push(performance.now()-at);
          if(f.gnomes.incident?.removals!==1||f.model.freeCellCount()!==1)throw Error('Full-garden burnout probe');
        }
        f.gnomes.clear();const stats=a=>({meanMs:a.reduce((s,n)=>s+n,0)/a.length,maxMs:Math.max(...a)});
        return{samples:20,selection:stats(selection),burnout:stats(burnout)};
      });report.cpu.at(-1).logical=logical;
      await seed();
      const resources=await page.evaluate(()=>{const f=__fire,bakes=f.bakes.length,contexts=f.contexts.length;let released=0;
        for(let cycle=0;cycle<40;cycle++){
          f.gnomes.clear();f.model.seedCampfire();f.gnomes.startCampfire(Date.now(),()=>cycle%2?.75:0,true);
          for(let i=0;i<60;i++){__fireNow+=250;f.model.tick(Date.now());f.gnomes.tick(Date.now(),()=>.99);f.gnomeView.animate(Date.now());}
          const sprites=[...f.gnomeView.views.values(),f.gnomeView.fire,f.gnomeView.char];if(!sprites.at(-1)||!sprites.at(-2))throw Error('Missing fire/char');
          if(cycle%2)for(let i=0;i<24;i++){__fireNow+=250;f.model.tick(Date.now());f.gnomes.tick(Date.now(),()=>.99);f.gnomeView.animate(Date.now());}else f.gnomes.clear();
          if(!sprites.every(s=>s.destroyed)||f.gnomeView.views.size||f.gnomeView.fire||f.gnomeView.char)throw Error('Leaked campfire Sprite');released+=sprites.length;
        }
        return{apps:f.apps,streams:f.streams,bakes,bakesAfter:f.bakes.length,contexts,contextsAfter:f.contexts.length,released,frames:f.cache.frames.size,
          backing:[f.cache.atlas.source.pixelWidth,f.cache.atlas.source.pixelHeight],sources:new Set([...f.cache.frames.values()].map(t=>t.source)).size,specimenFrames:f.view.snapshot().textures,
          layers:f.view.curiosityLayer.children.length,score:document.querySelector('#garden-score').textContent,accepted:f.model.counts.acceptedLive,recent:f.model.recentEvents.length};
      });assert.equal(resources.apps,1);assert.equal(resources.streams,1);assert.equal(resources.bakes,5);assert.equal(resources.bakesAfter,5);assert.equal(resources.frames,29);
      assert.equal(resources.contextsAfter,resources.contexts);assert.deepEqual(resources.backing,[2320,64]);assert.equal(resources.sources,1);assert.equal(resources.specimenFrames,832);
      assert.equal(resources.layers,0);assert.equal(resources.accepted,0);assert.equal(resources.recent,0);assert.equal(resources.score,'Score: 0');report.resources.push({page:name,...resources});
      if(name==='diagnostic'){
        await page.locator('#seed-campfire').click();await page.locator('#trigger-campfire').click();await step(4500);await page.locator('#remove-campfire-during').click();assert(await page.evaluate(()=>!__fire.gnomes.incident));
        await page.locator('#seed-campfire').click();await page.locator('#trigger-campfire').click();await page.locator('#remove-campfire-before').click();assert(await page.evaluate(()=>!__fire.gnomes.incident));
        for(const mode of ['hidden','stalled']){await page.locator('#seed-campfire').click();await page.locator('#trigger-campfire').click();await page.locator(`#cancel-campfire-${mode}`).click();assert(await page.evaluate(()=>!__fire.gnomes.incident&&__fire.model.terrain.logs.length===1));}
        await page.locator('#seed-campfire').click();await page.locator('#campfire-reduced-motion').check();await page.locator('#trigger-campfire').click();await step(17000);await page.locator('#check-campfire-cell').click();assert.match(await page.locator('#campfire-status').textContent(),/blocked false, occupied false, free true/);
      }else for(const id of ['seed-campfire','trigger-campfire','campfire-reduced-motion'])assert.equal(await page.locator('#'+id).count(),0);
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      assert(await page.evaluate(()=>!__fire.gnomeView.fire&&!__fire.gnomeView.char&&!__fire.gnomeView.views.size&&__fire.bakes.every(source=>source.destroyed)));await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2));
    await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Great Gnome Campfire Incident</title><style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#e2d39b}img{max-width:none}figure{overflow:auto;margin:12px 0}summary{cursor:pointer;padding:12px}</style><h1>Great Gnome Campfire Incident</h1><p>Native 960×600 browser captures at CSS scale 1; mobile at 390×844. <a href="review.json">Timing and ownership</a></p>${['homepage','diagnostic'].map(name=>`<h2>${name}</h2>${['approach','gathered','burning','charred','burned-out-empty','departure','finished','night','rain','night-rain-grass','reduced-motion','mobile'].map(scene=>`<details ${scene==='burning'?'open':''}><summary>${scene}</summary><figure><img src="${name}-${scene}.png" alt="${scene}"></figure></details>`).join('')}`).join('')}`);
    console.log('PASS: actual-scale approach/gather/fire/char/exact terrain removal/departure, day/night/rain/grass/mobile/reduced art; real click/underpants, full occupancy/regrowth, natural expiry/same-cell replacement, hidden/stall safety, diagnostics, 80 repeated cleanup cycles, no geometry/bake churn or fabricated network activity:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
