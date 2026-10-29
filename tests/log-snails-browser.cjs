if(!process.argv.includes('--run'))console.log('SKIP: log-snail Chrome review; pass --run with installed Chrome/Playwright.');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),out=path.join(root,'artifacts/log-snails');await fs.mkdir(out,{recursive:true});
  const capture=`{
    const f=window.__snail={apps:0,streams:0,bakes:[],contexts:[],geometry:0,rolls:[],rngCalls:0,reduced:false,grassRemoved:[]};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenPixiLiveCore','model','createModel'],
      ['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenPixiEcology','ground','createEcologyView'],
      ['PacketGardenLogSnails','snails','createModel'],['PacketGardenPixiAmbient','snailView','createLogSnailView'],['PacketGardenPixiAmbient','cache','makeAmbientAtlas'],
      ['PacketGardenGnomes','gnomes','createModel'],['PacketGardenPixiGnomes','gnomeView','createGnomeView'],['PacketGardenFrogs','frogs','createModel'],
      ['PacketGardenAmbient','ambient','createAmbientModel'],['PacketGardenPixiUi','ui','createUi'],['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface']]){
      const create=window[global][method];window[global][method]=(...args)=>{
        if(key==='model'){f.view=args[0];args[1]={...args[1],competitionRandom:()=>.99,sporeRandom:()=>.9,bloomRandom:()=>.9};}
        if(key==='ecology'){const change=args[0].onChange;args[0]={...args[0],onChange(c){if(c.kind==='grass-removed')f.grassRemoved.push(c.item);change(c);}};}
        if(key==='gnomes')args[0]={...args[0],random:()=>.99,puddleRandom:()=>.99};
        if(key==='snails'){const reduced=args[0].getReducedMotion;args[0]={...args[0],random:()=>{f.rngCalls++;return f.rolls.length?f.rolls.shift():.99;},getReducedMotion:()=>f.reduced||reduced()};}
        if(key==='snailView'){const reduced=args[3];args[3]=()=>f.reduced||reduced();}
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
    if(file==='__snail.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'||file==='api/garden/visit'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__snail.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],report={scenes:[],resources:[],cpu:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__snailNow=1800000000000;Date.now=()=>__snailNow;let seed=733;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>__snail?.app?.ticker?.started&&__snail.snails);
      await page.evaluate(()=>{__snail.app.stop();const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const seed=async({night=false,reduced=false,grass=true,full=false}={})=>page.evaluate(({night,reduced,grass,full})=>{
        const f=__snail;f.snails.clear();f.gnomes.clear();f.frogs.clear();f.ambient.clear();f.ecology.clear();f.reduced=reduced;
        if(full){f.model.seedLogs('full');f.model.forceLogFixture();__snailNow+=2000;f.model.tick(Date.now());}else f.model.seedCampfire();
        f.log=f.model.terrain.logs[0];if(!f.log)throw Error('No real log');f.ecology.setAllowGrassUnderPlants(true);
        if(grass)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)f.ecology.influenceGrassCell(f.log.column+dx,f.log.row+dy,Date.now()-65000);
        f.snails.clear();f.beforeCounts=JSON.stringify(f.model.counts);f.beforeRecent=JSON.stringify(f.model.recentEvents);f.beforeGrass=f.ecology.grassCells.length;f.grassRemoved=[];
        f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);f.app.render();
      },{night,reduced,grass,full});
      const spawn=async(variant=0,second=false)=>page.evaluate(({variant,second})=>{const f=__snail;f.rolls=[0,second?.25:0,.75,variant/3+.01];const s=f.snails.spawnSimulated();if(!s)throw Error('Spawn rejected');if(!second)f.focus=s;f.snailView.animate(Date.now());f.app.render();return s.id;},{variant,second});
      const step=ms=>page.evaluate(ms=>{const f=__snail,end=Date.now()+ms;while(Date.now()<end){__snailNow=Math.min(end,__snailNow+250);f.model.tick(Date.now());f.snails.tick(Date.now());f.gnomes.tick(Date.now(),()=>.99);f.gnomeView.animate(Date.now());f.snails.advance(Date.now());f.snailView.animate(Date.now());f.ground.tick(Date.now());f.ui.tick(Date.now());}f.app.render();},ms);
      const shot=async scene=>{const state=await page.evaluate(()=>{const f=__snail,s=f.focus;return{active:f.snails.snails.length,views:f.snailView.views.size,grass:f.ecology.grassCells.length,beforeGrass:f.beforeGrass,
        attempts:s.attempts,grazed:s.grazed,departing:s.leaveAt!==null,sourceReleased:s.source===null,frame:PacketGardenLogSnails.visualState(s,Date.now(),f.reduced).frame,
        countsStable:JSON.stringify(f.model.counts)===f.beforeCounts,recentStable:JSON.stringify(f.model.recentEvents)===f.beforeRecent,score:document.querySelector('#garden-score').textContent};});
        assert(state.countsStable&&state.recentStable);assert.equal(state.score,'Score: 0');assert(state.attempts<=2&&state.grazed<=2);await page.locator('#view').screenshot({path:path.join(out,`${name}-${scene}.png`)});report.scenes.push({page:name,scene,...state});};
      await seed();await spawn();await step(12000);await shot('crawling');await step(12000);await shot('paused');
      const selected=await page.evaluate(()=>__snail.focus.grazes[0].patch&&__snail.ecology.grassCells.includes(__snail.focus.grazes[0].patch));assert(selected);
      await step(1000);await shot('grazing');assert.equal(await page.evaluate(()=>__snail.ecology.grassCells.length),7);
      await step(28000);await shot('second-graze');assert.equal(await page.evaluate(()=>__snail.focus.grazed),2);assert.equal(await page.evaluate(()=>__snail.ecology.grassCells.length),6);
      await step(20000);await shot('departure');await step(2000);await shot('departed');assert.equal(await page.evaluate(()=>__snail.snailView.views.size),0);
      for(const [scene,options,variant] of [['night',{night:true},1],['olive',{},1],['russet',{},2],['reduced-motion',{reduced:true},0],['no-grass',{grass:false},0]]){
        await seed(options);await spawn(variant);await step(12000);await shot(scene);
        if(options.reduced){const stable=await page.evaluate(()=>{const f=__snail,s=f.focus,sprite=f.snailView.views.get(s),a=JSON.stringify([sprite.position.x,sprite.position.y,sprite.texture.uid,sprite.scale.x,sprite.rotation]);for(let i=0;i<60;i++)f.snailView.animate(Date.now()+i);return JSON.stringify([sprite.position.x,sprite.position.y,sprite.texture.uid,sprite.scale.x,sprite.rotation])===a;});assert(stable);}
      }
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='';el.style.height='';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await seed();await spawn();await step(12000);await page.locator('#view').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`${name}-mobile.png`)});
      await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      // Real canvas input, one acknowledgment and no collection or message extension.
      await seed();await spawn();await step(1000);await page.locator('#view').scrollIntoViewIfNeeded();
      const click=async()=>{const point=await page.evaluate(()=>{const f=__snail,p=PacketGardenLogSnails.visualState(f.focus,Date.now(),f.reduced),r=f.app.canvas.getBoundingClientRect();return{x:r.left+(f.view.root.position.x+p.x*f.view.root.scale.x)*r.width/f.app.renderer.screen.width,y:r.top+(f.view.root.position.y+p.y*f.view.root.scale.y)*r.height/f.app.renderer.screen.height};});await page.mouse.click(point.x,point.y);};
      await click();assert.equal(await page.locator('#collection-message').textContent(),'The snail continues being a snail. +0 points');assert.equal(await page.evaluate(()=>__snail.snails.snails.length),1);
      await step(1500);await click();await step(750);assert(await page.locator('#collection-message').isHidden());
      await page.evaluate(()=>{const f=__snail,p=PacketGardenLogSnails.visualState(f.focus,Date.now());f.ambient.seed({curiosities:[{type:'snail',x:p.x,y:p.y,origin:{x:p.x,y:p.y},phase:0,direction:1,createdAt:Date.now(),expiresAt:Date.now()+20000}],drops:[]});});
      await click();assert.equal(await page.locator('#collection-message').textContent(),'You collected a snail. It seems annoyed. +0 points');assert.equal(await page.evaluate(()=>__snail.ambient.curiosities.length),0);assert.equal(await page.evaluate(()=>__snail.snails.snails.length),1);
      // A newly grown grass object in the same cell is not the selected patch.
      await seed();await spawn();await page.evaluate(()=>{const f=__snail,t=f.focus.grazes[0];f.ecology.removeGrassCell(t.column,t.row);f.replacement=f.ecology.influenceGrassCell(t.column,t.row,Date.now());});
      await step(25000);assert(await page.evaluate(()=>__snail.focus.attempts===1&&__snail.focus.grazed===0&&__snail.ecology.grassCells.includes(__snail.replacement)));
      // Actual campfire removal notification starts fade; grazing cannot occur afterward.
      await seed();await spawn();await page.evaluate(()=>{if(!__snail.gnomes.startCampfire(Date.now(),()=>.5,true))throw Error('Campfire fixture');});await step(17000);
      assert(await page.evaluate(()=>__snail.gnomes.incident.removals===1&&__snail.focus.source===null&&__snail.focus.grazes.every(t=>t===null)));await step(3000);assert.equal(await page.evaluate(()=>__snail.snails.snails.length),0);
      // Real natural expiry, using a source constructed with its immutable original timestamps.
      await seed();await page.evaluate(()=>{const f=__snail,born=Date.now()-PacketGardenCore.terrainConfig.lifetimeMs+24000,entries=f.model.specimens.map(p=>({type:p.type,column:p.column,row:p.row,vigor:p.vigor,createdAt:p.createdAt,origin:p.origin}));
        entries.push({type:'blackthorn',vigor:1,column:16,row:10,createdAt:born-PacketGardenCore.timings.blackthorn.expiredAfterMs,origin:{kind:'simulated',eventType:'log-fixture'}});f.garden.seed(entries,born-1);f.model.forceLogFixture();f.log=f.model.terrain.logs[0];});
      await spawn();await step(24000);assert(await page.evaluate(()=>__snail.focus.source===null&&__snail.focus.grazed===0));await step(3000);assert.equal(await page.evaluate(()=>__snail.snails.snails.length),0);
      // Same-cell new log never inherits the old visitor.
      await seed();await spawn();await step(1000);await page.evaluate(()=>{const f=__snail,old=f.log;f.model.terrain.remove(old,'test-replacement');f.model.seedCampfire();f.other=f.model.terrain.logs[0];if(f.other===old||f.other.id===old.id||f.other.cell!==old.cell)throw Error('Log identity fixture');});await step(3000);
      assert(await page.evaluate(()=>!__snail.snails.snails.length&&__snail.focus.source===null&&__snail.model.terrain.logs.includes(__snail.other)));
      for(const mode of ['hidden','logical-stall','render-stall','backwards']){
        await seed();await spawn();await step(24000);const state=await page.evaluate(mode=>{const f=__snail,s=f.focus,sprite=f.snailView.views.get(s),grass=f.ecology.grassCells.length;
          if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__snailNow+=300000;
            Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;f.app.stop();}
          else{__snailNow+=mode==='backwards'?-1:1501;if(mode==='logical-stall')f.snails.tick(Date.now());else f.snails.advance(Date.now());}
          return{count:f.snails.snails.length,released:s.source===null&&s.grazes.every(t=>!t),destroyed:sprite.destroyed,grazed:s.grazed,next:f.snails.nextCheckAt-Date.now()};
        },mode);assert.equal(state.count,0);assert(state.released&&state.destroyed);assert.equal(state.grazed,0);assert.equal(state.next,45000);
      }
      // Shared authoritative grass removal closes exact grass inspection too.
      await seed();await spawn();await page.evaluate(()=>{const f=__snail,t=f.focus.grazes[0];f.ui.click({x:(t.column+.5)*30,y:(t.row+.5)*30},{x:700,y:190});if(!f.ui.inspectedGrass)throw Error('Grass inspection');});await step(25000);assert(await page.locator('#specimen-card').isHidden());
      // Two wildlife visitors do not consume specimen capacity or add network activity.
      await seed({full:true});await spawn();await spawn(1,true);assert(await page.evaluate(()=>__snail.model.specimens.length===639&&__snail.model.freeCellCount()===0&&__snail.snails.snails.length===2));
      const cpu=await page.evaluate(()=>{const f=__snail,results=[];for(const mode of ['two-snails','idle']){
        if(mode==='idle')f.snails.clear();const geometry=f.geometry,animation=[],submission=[];
        for(let i=0;i<180;i++){__snailNow+=8;if(i%25===0)f.snails.tick(Date.now());let at=performance.now();f.snails.advance(Date.now());f.snailView.animate(Date.now());animation.push(performance.now()-at);at=performance.now();f.app.render();submission.push(performance.now()-at);}
        if(f.geometry!==geometry)throw Error('Per-frame geometry');const stats=a=>({meanMs:a.reduce((s,n)=>s+n,0)/a.length,maxMs:Math.max(...a)});results.push({mode,animation:stats(animation),submission:stats(submission)});
      }return results;});report.cpu.push({page:name,samples:cpu});
      await seed();
      const resources=await page.evaluate(()=>{const f=__snail,bakes=f.bakes.length,contexts=f.contexts.length;let released=0,visits=0;
        for(let cycle=0;cycle<40;cycle++){
          f.snails.clear();f.gnomes.clear();f.ambient.clear();f.ecology.clear();f.model.seedCampfire();const log=f.model.terrain.logs[0];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)f.ecology.influenceGrassCell(log.column+dx,log.row+dy,Date.now()-65000);
          const objects=[];for(let i=0;i<2;i++){f.rolls=[0,i/4,.75,(cycle%3)/3+.01];const s=f.snails.spawnSimulated();objects.push([s,f.snailView.views.get(s)]);visits++;}
          for(let i=0;i<(cycle%2?300:100);i++){__snailNow+=250;f.model.tick(Date.now());f.snails.tick(Date.now());f.snailView.animate(Date.now());}
          f.snails.clear();for(const [s,sprite] of objects){if(!sprite.destroyed||s.source||s.grazes.some(Boolean)||s.grazed>2)throw Error('Wildlife cleanup');released++;}
          if(f.snailView.views.size||f.snails.snails.length)throw Error('Retained wildlife');
        }
        return{apps:f.apps,streams:f.streams,bakes,bakesAfter:f.bakes.length,contexts,contextsAfter:f.contexts.length,visits,released,
          frames:f.cache.frames.size,backing:[f.cache.atlas.source.pixelWidth,f.cache.atlas.source.pixelHeight],sources:new Set([...f.cache.frames.values()].map(t=>t.source)).size,
          specimenFrames:f.view.snapshot().textures,views:f.snailView.views.size,accepted:f.model.counts.acceptedLive,recent:f.model.recentEvents.length,score:document.querySelector('#garden-score').textContent};
      });assert.equal(resources.apps,1);assert.equal(resources.streams,1);assert.equal(resources.bakes,5);assert.equal(resources.bakesAfter,5);assert.equal(resources.contextsAfter,resources.contexts);
      assert.equal(resources.frames,23);assert.deepEqual(resources.backing,[1472,64]);assert.equal(resources.sources,1);assert.equal(resources.specimenFrames,832);assert.equal(resources.views,0);assert.equal(resources.accepted,0);assert.equal(resources.recent,0);assert.equal(resources.score,'Score: 0');report.resources.push({page:name,...resources});
      if(name==='diagnostic'){
        await page.locator('#seed-log-snails').click();await page.locator('#seed-log-snail-grass').click();await page.locator('#spawn-log-snails-2').click();assert.equal(await page.evaluate(()=>__snail.snails.snails.length),2);
        await page.locator('#clear-log-snails').click();assert.equal(await page.evaluate(()=>__snail.snailView.views.size),0);
        await page.locator('#preview-log-snail-graze').click();await step(500);assert(await page.evaluate(()=>__snail.snails.snails[0].grazed===1));
        await page.locator('#log-snail-reduced-motion').check();await page.locator('#remove-log-snail-source').click();assert(await page.evaluate(()=>__snail.snails.snails[0].source===null));await step(3000);
        for(const mode of ['hidden','stalled']){await page.locator('#seed-log-snails').click();await page.locator('#spawn-log-snails-1').click();await page.locator(`#cancel-log-snails-${mode}`).click();assert.equal(await page.evaluate(()=>__snail.snailView.views.size),0);}
      }else assert.equal(await page.locator('#seed-log-snails').count(),0);
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      assert(await page.evaluate(()=>!__snail.snailView.views.size&&!__snail.snails.snails.length&&__snail.bakes.every(s=>s.destroyed)));await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2));
    const scenes=['crawling','paused','grazing','second-graze','departure','departed','night','olive','russet','reduced-motion','no-grass','mobile'];
    await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Log-dwelling garden snails</title><style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#e2d39b}img{max-width:none}figure{overflow:auto;margin:12px 0}summary{cursor:pointer;padding:12px}</style><h1>Log-dwelling garden snails</h1><p>Actual 960×600 garden captures; 390×844 mobile viewport. <a href="review.json">Timing, grazing and ownership</a></p>${['homepage','diagnostic'].map(name=>`<h2>${name}</h2>${scenes.map(scene=>`<details ${scene==='grazing'?'open':''}><summary>${scene}</summary><figure><img src="${name}-${scene}.png" alt="${scene}"></figure></details>`).join('')}`).join('')}`);
    console.log('PASS: real Pixi snail crawl/pause/graze/departure/night/mobile/reduced captures; exact ecology removals/stale skips, campfire/expiry/new-log identity, hidden/stall safety, real one-time clicks and unchanged collectible snail, diagnostics, 160 Sprite/visit cleanup cycles, no bakes/geometry/activity/SSE/score changes:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
