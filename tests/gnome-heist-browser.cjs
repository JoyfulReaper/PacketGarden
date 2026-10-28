// Native WebGL at the real 960x600 garden scale. No synthetic incoming SSE observations.
if(!process.argv.includes('--run'))console.log('SKIP: gnome heist Chrome review; pass --run.');
else run().catch(error=>{console.error(error);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
  const {chromium}=require('playwright'),root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),out=path.join(root,'artifacts/gnome-heist');
  await fs.mkdir(out,{recursive:true});
  const capture=`{
    const f=window.__heist={bakes:[],geometry:0,streams:0,contexts:[]};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenPixiLiveCore','model','createModel'],
      ['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface'],
      ['PacketGardenGnomes','gnomes','createModel'],['PacketGardenPixiGnomes','gnomeView','createGnomeView'],['PacketGardenPixiGnomes','gnomeCache','makeGnomeAtlas'],
      ['PacketGardenAmbient','ambient','createAmbientModel']]){
      const create=window[global][method];window[global][method]=(...args)=>{
        if(key==='model'){f.view=args[0];args[1]={...args[1],sporeRandom:()=>.9};}
        if(key==='gnomes')args[0]={...args[0],random:()=>.5,puddleRandom:()=>.99};
        const value=create(...args);f[key]??=value;return value;
      };
    }
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const bake=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const t=bake(options);
        f.bakes.push({width:options.frame.width,height:options.frame.height,source:t.source});return t;};return value;
    });};
    const Graphics=PIXI.Graphics;PIXI.Graphics=class extends Graphics{constructor(...args){super(...args);f.contexts.push(this.context);}};
    for(const key of ['clear','moveTo','bezierCurveTo','circle','stroke','fill']){const fn=Graphics.prototype[key];Graphics.prototype[key]=function(...args){f.geometry++;return fn.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__heist.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__heist.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const errors=[],report={scenes:[],resources:[],cpu:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__heistNow=1800000000000;Date.now=()=>__heistNow;let seed=137;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>window.__heist?.app?.ticker?.started&&__heist.gnomes);
      await page.evaluate(()=>{__heist.app.stop();const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      if(name==='diagnostic')await page.locator('#probes').uncheck();
      assert.deepEqual(await page.evaluate(()=>[__heist.app.renderer.screen.width,__heist.app.renderer.screen.height]),[960,600]);
      const seed=async({grass=false,night=false,rain=false,dense=false}={})=>page.evaluate(({grass,night,rain,dense})=>{
        const f=__heist;f.gnomes.clear();f.ambient.clear();f.ecology.clear();f.model.seedHeist();f.ecology.setAllowGrassUnderPlants(true);
        if(dense){const entries=Array.from({length:640},(_,i)=>({type:i===332?'mushroom':'broadleaf',vigor:i===332?3:0,colorVariant:0,
          column:i%32,row:Math.floor(i/32),createdAt:Date.now()-65000,origin:{kind:'simulated',eventType:'heist-fixture'}}));
          f.garden.seed(entries);for(const p of f.model.specimens){p.colorVariant=p.vigor;f.view.update(p,f.model.byCell);}}
        f.source=f.model.specimens.find(p=>p.type==='mushroom'&&p.vigor===3);f.source??=f.model.specimens.find(p=>p.type==='mushroom');
        f.originalSprite=f.view.byId.get(f.source.id);f.originalTexture=f.originalSprite.texture;f.originalScale=f.originalSprite.scale.x;
        f.cell=f.source.cell;f.originalCount=f.model.specimens.length;f.beforeCounts={...f.model.counts};f.recent=JSON.stringify(f.model.recentEvents);
        if(grass)f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}))});
        f.ecology.resetCadence(Date.now());f.view.setWeather({level:rain?'rain':'quiet',eventsPerMinute:rain?1000:0});
        f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,rain?.07:0);
        f.app.render();
      },{grass,night,rain,dense});
      const start=()=>page.evaluate(()=>{
        const f=__heist,pool=f.gnomes.heistCandidates(),index=pool.indexOf(f.source);f.startedAt=Date.now();
        if(!f.gnomes.startHeist(Date.now(),()=>index/pool.length,true))throw Error('Heist did not start');
        f.gnomeView.animate(Date.now());f.geometryAtStart=f.geometry;f.app.render();
      });
      const step=ms=>page.evaluate(ms=>{
        const f=__heist,end=Date.now()+ms;
        while(Date.now()<end){__heistNow=Math.min(end,__heistNow+250);f.model.tick(Date.now());f.gnomes.tick(Date.now(),()=>.99);
          f.gnomes.advance(Date.now());f.gnomeView.animate(Date.now());f.view.animate(0,.016,Date.now());}
        f.app.render();
      },ms);
      const shot=async scene=>{
        const state=await page.evaluate(()=>{const f=__heist;return{plants:f.model.specimens.length,originalCount:f.originalCount,
          occupied:f.model.byCell.has(f.cell),sourcePresent:f.model.specimens.includes(f.source),originalView:f.view.byId.has(f.source.id),
          actors:f.gnomeView.views.size,carry:Boolean(f.gnomeView.carried),phase:f.gnomes.incident?.phase??'departed',
          accepted:f.model.counts.acceptedLive,rainParticles:f.view.snapshot().particles,heistRemovals:f.model.counts.heistRemovals-f.beforeCounts.heistRemovals,
          score:document.querySelector('#garden-score').textContent,recentStable:JSON.stringify(f.model.recentEvents)===f.recent,
          carriedTexture:!f.gnomeView.carried||f.gnomeView.carried.texture===f.originalTexture,
          carriedScale:!f.gnomeView.carried||f.gnomeView.carried.scale.x===f.originalScale};});
        assert.equal(state.accepted,0);assert.equal(state.score,'Score: 0');assert(state.recentStable&&state.carriedTexture&&state.carriedScale);
        if(scene==='rain')assert(state.rainParticles>0,'actual cached rain is present');
        if(state.phase==='approach'){assert(state.occupied&&state.sourcePresent&&state.originalView);assert.equal(state.plants,state.originalCount);assert.equal(state.heistRemovals,0);}
        else{assert(!state.occupied&&!state.sourcePresent&&!state.originalView);assert.equal(state.plants,state.originalCount-1);assert.equal(state.heistRemovals,1);}
        await page.locator('#view canvas').screenshot({path:path.join(out,`${name}-${scene}.png`)});report.scenes.push({page:name,scene,...state});
      };
      await seed();await start();await shot('01-arrival');await step(1500);await shot('02-approach-occupied');
      await step(1500);await shot('03-pickup');assert(await page.evaluate(()=>__heist.originalSprite.destroyed));
      await step(3500);await shot('04-empty-cell-getaway');await step(6000);await shot('05-edge');await step(1500);await shot('06-departed');
      for(const [scene,options] of [['night',{night:true,grass:true}],['dense-grass',{grass:true}],['rain',{grass:true,rain:true}],['dense-640',{dense:true,grass:true}]]){
        await seed(options);await start();await step(6500);await shot(scene);
      }
      await seed({grass:true});await start();await step(6500);
      await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='';el.style.height='';});await page.setViewportSize({width:390,height:844});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>__heist.app.render());await shot('mobile');
      await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await seed({grass:true});await start();await step(6500);await shot('reduced-motion');
      assert.equal(await page.evaluate(()=>__heist.gnomeView.carried.rotation),0);
      await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      // Exercise the public centralized click path on a thief over a carried mushroom.
      await seed();await start();await step(4500);
      const point=await page.evaluate(()=>{const f=__heist,a=f.gnomes.actors[0],pose=PacketGardenGnomes.presentation(a,Date.now()),r=f.app.canvas.getBoundingClientRect(),s=f.app.renderer.screen;
        return{x:r.left+(f.view.root.position.x+pose.x*f.view.root.scale.x)*r.width/s.width,
          y:r.top+(f.view.root.position.y+pose.y*f.view.root.scale.y)*r.height/s.height};});
      await page.mouse.click(point.x,point.y);await page.mouse.click(point.x,point.y);
      assert.equal(await page.evaluate(()=>__heist.ambient.drops.filter(d=>d.type==='gnome_underpants').length),1);
      await shot('underpants');await step(9500);assert.equal(await page.evaluate(()=>__heist.gnomes.incident),null);
      // Hidden cancellation in approach, pickup and getaway, plus logical/render stalls.
      for(const age of [1500,3250,6500])for(const mode of ['hidden','logical-gap','render-gap']){
        await seed();await start();await step(age);
        const result=await page.evaluate(({mode,age})=>{const f=__heist,sprites=[...f.gnomeView.views.values(),f.gnomeView.carried].filter(Boolean),before=f.model.specimens.length;
          if(mode==='hidden'){
            Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__heistNow+=120000;
            Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;f.app.stop();
          }else{__heistNow+=1501;if(mode==='logical-gap')f.gnomes.tick(Date.now());else f.gnomes.advance(Date.now());}
          return{active:Boolean(f.gnomes.incident),views:f.gnomeView.views.size,carry:Boolean(f.gnomeView.carried),
            destroyed:sprites.every(s=>s.destroyed),before,after:f.model.specimens.length,next:f.gnomes.nextCheckAt-Date.now(),sourcePresent:f.model.specimens.includes(f.source)};
        },{mode,age});
        assert(!result.active&&!result.views&&!result.carry&&result.destroyed);assert.equal(result.before,result.after);
        assert.equal(result.sourcePresent,age<3000);assert.equal(result.next,45000);
      }
      // Failed identity on true authoritative removal and the diagnostic same-cell fixture replacement.
      for(const mode of ['remove','replace']){
        await seed();await start();await page.evaluate(mode=>{const f=__heist;if(mode==='replace')f.model.replaceHeistTarget(f.source);else f.model.remove(f.source,'test-before-pickup');},mode);
        await step(3000);assert(await page.evaluate(()=>__heist.gnomes.incident.aborted&&!__heist.gnomeView.carried));
        assert.equal(await page.evaluate(()=>__heist.model.counts.heistRemovals-__heist.beforeCounts.heistRemovals),0);await step(2000);
      }
      await seed({dense:true});
      const cpu=await page.evaluate(()=>{
        const f=__heist,results=[];for(const mode of ['idle','dispute','heist']){
          f.gnomes.clear();f.gnomes.resetCadence(Date.now());if(mode==='heist')f.gnomes.startHeist(Date.now(),()=>0);else if(mode==='dispute')f.gnomes.start(Date.now(),()=>.5);
          if(mode==='heist')for(let i=0;i<16;i++){__heistNow+=250;f.gnomes.tick(Date.now(),()=>.99);}f.gnomeView.animate(Date.now());
          const geometry=f.geometry,animate=[],submit=[];
          for(let i=0;i<120;i++){
            if(mode==='heist'){__heistNow+=8;f.gnomes.tick(Date.now(),()=>.99);}
            const at=Date.now()+i*2,start=performance.now();if(f.gnomes.incident){f.gnomes.advance(at);f.gnomeView.animate(at);}animate.push(performance.now()-start);
            const render=performance.now();f.app.render();submit.push(performance.now()-render);
          }
          if(f.geometry!==geometry)throw Error('Recurring geometry');const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
          results.push({mode,meanAnimateMs:mean(animate),meanSubmitMs:mean(submit),actors:f.gnomeView.views.size,carried:Boolean(f.gnomeView.carried)});
        }
        f.gnomes.clear();return results;
      });report.cpu.push({page:name,samples:cpu});
      const logicalCpu=await page.evaluate(()=>{
        const f=__heist,selection=[],pickup=[];
        for(let pass=0;pass<20;pass++){
          f.gnomes.clear();f.garden.seed(Array.from({length:640},(_,i)=>({type:i===332?'mushroom':'broadleaf',vigor:0,colorVariant:0,
            column:i%32,row:Math.floor(i/32),createdAt:Date.now()-65000,origin:{kind:'simulated',eventType:'heist-fixture'}})));
          for(const p of f.model.specimens){p.colorVariant=0;f.view.update(p,f.model.byCell);}
          f.gnomes.resetCadence(Date.now());__heistNow+=45000;
          let start=performance.now();f.gnomes.tick(Date.now(),()=>0);selection.push(performance.now()-start);
          if(f.gnomes.incident?.type!=='gnome_heist')throw Error('Selection benchmark');
          for(let i=0;i<2;i++){__heistNow+=1000;f.gnomes.tick(Date.now());}__heistNow+=1000;
          start=performance.now();f.gnomes.tick(Date.now());pickup.push(performance.now()-start);
          if(f.gnomes.incident.removals!==1)throw Error('Pickup benchmark');
        }
        f.gnomes.clear();const stats=a=>({meanMs:a.reduce((s,n)=>s+n,0)/a.length,maxMs:Math.max(...a)});
        return{selection:stats(selection),pickup:stats(pickup),samples:selection.length};
      });report.cpu.at(-1).logical=logicalCpu;
      await seed();
      const resources=await page.evaluate(()=>{
        const f=__heist,bakes=f.bakes.length,geometry=f.geometry,frames=f.gnomeCache.frames.size,contexts=f.contexts.length;
        for(let cycle=0;cycle<40;cycle++){
          f.gnomes.clear();f.model.seedHeist();f.gnomes.startHeist(Date.now(),()=>.5,true);
          for(let n=0;n<12;n++){__heistNow+=250;f.gnomes.tick(Date.now(),()=>.99);f.gnomeView.animate(Date.now());}
          const sprites=[...f.gnomeView.views.values(),f.gnomeView.carried];if(sprites.length!==3||!sprites[2])throw Error('Missing carried art');
          f.gnomes.clear();if(!sprites.every(s=>s.destroyed)||f.gnomeView.carried||f.gnomeView.views.size)throw Error('Leaked heist views');
        }
        // Lifecycle fixtures may rebuild unrelated shadow geometry; the heist's own context/texture ownership stays fixed.
        return{frames,bakes,bakesAfter:f.bakes.length,contexts,contextsAfter:f.contexts.length,streams:f.streams,
          specimenFrames:f.view.snapshot().textures,gnomeSourceCount:new Set([...f.gnomeCache.frames.values()].map(t=>t.source)).size,
          gnomeBacking:[f.gnomeCache.atlas.source.pixelWidth,f.gnomeCache.atlas.source.pixelHeight],geometryDelta:f.geometry-geometry,
          layers:f.view.curiosityLayer.children.length};
      });assert.equal(resources.frames,26);assert.equal(resources.specimenFrames,832);assert.equal(resources.bakes,5);assert.equal(resources.bakesAfter,5);
      assert.equal(resources.contextsAfter,resources.contexts);assert.equal(resources.streams,1);assert.equal(resources.gnomeSourceCount,1);
      assert.deepEqual(resources.gnomeBacking,[2080,64]);assert.equal(resources.layers,0);report.resources.push({page:name,...resources});
      if(name==='diagnostic'){
        await page.locator('#seed-heist').click();await page.locator('#trigger-heist').click();
        assert.equal(await page.evaluate(()=>__heist.gnomes.incident.type),'gnome_heist');await page.locator('#remove-heist-target').click();await step(3000);
        assert(await page.evaluate(()=>__heist.gnomes.incident.aborted));
      }else assert.equal(await page.locator('#trigger-heist').count(),0);
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      assert(await page.evaluate(()=>!__heist.gnomeView.carried&&!__heist.gnomeView.views.size&&__heist.bakes.every(b=>b.source.destroyed)));await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2));
    await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Great Gnome Mushroom Heist</title>
      <style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#e2d39b}figure{margin:12px 0;overflow:auto}img{max-width:none}summary{cursor:pointer;padding:12px}</style>
      <h1>The Great Gnome Mushroom Heist</h1><p>Desktop garden captures are actual 960×600, with no camera enlargement. Target: mushroom at column 18, row 10. Two gnomes remove the real specimen and carry its cached artwork to the nearest edge. Mobile uses the normal fitted garden.</p><p><a href="review.json">State/resource/CPU assertions</a></p>
      ${['homepage','diagnostic'].map(page=>`<h2>${page}</h2>${report.scenes.filter(s=>s.page===page).map(s=>`<details ${s.scene==='04-empty-cell-getaway'?'open':''}><summary>${s.scene} · plants ${s.plants}/${s.originalCount} · occupied ${s.occupied} · ${s.phase}</summary><figure><img src="${page}-${s.scene}.png" alt="${s.scene}"></figure></details>`).join('')}`).join('')}`);
    console.log('PASS: native 960x600 heist sequence/real empty cell/cached original art, environment/mobile/reduced/click/hidden/stall/replacement, 80 Sprite cleanup cycles, CPU and atlas costs:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
