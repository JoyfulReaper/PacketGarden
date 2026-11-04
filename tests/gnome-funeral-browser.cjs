if(!process.argv.includes('--run'))console.log('SKIP: Great Gnome Funeral Procession Chrome review; pass --run.');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),out=path.join(root,'artifacts/gnome-funeral');await fs.mkdir(out,{recursive:true});
  const capture=`{
    const f=window.__funeral={apps:0,streams:0,bakes:[],geometry:0,contexts:[],reduced:false,cues:[]};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenPixiLiveCore','model','createModel'],
      ['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenGnomes','gnomes','createModel'],['PacketGardenPixiGnomes','view','createGnomeView'],['PacketGardenPixiGnomes','cache','makeGnomeAtlas'],
      ['PacketGardenAmbient','ambient','createAmbientModel'],['PacketGardenFrogs','frogs','createModel'],['PacketGardenLogSnails','snails','createModel'],['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface']]){
      const create=window[global][method];window[global][method]=(...args)=>{
        if(key==='model'){f.gardenView=args[0];args[1]={...args[1],random:()=>.5,competitionRandom:()=>.99,sporeRandom:()=>.9,bloomRandom:()=>.9};}
        if(key==='gnomes'){const reduced=args[0].getReducedMotion,cue=args[0].onCue;args[0]={...args[0],random:()=>.99,puddleRandom:()=>.99,getReducedMotion:()=>f.reduced||reduced(),onCue:s=>{f.cues.push(s);cue(s);}};}
        if(key==='view'){const reduced=args[3];args[3]=()=>f.reduced||reduced();}
        const value=create(...args);f[key]??=value;return value;
      };
    }
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;f.apps++;return init.apply(this,args).then(value=>{
      const bake=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const t=bake(options);f.bakes.push(t.source);return t;};return value;
    });};
    const Graphics=PIXI.Graphics;PIXI.Graphics=class extends Graphics{constructor(...args){super(...args);f.contexts.push(this.context);}};
    for(const key of ['moveTo','poly','rect','circle','stroke']){const fn=Graphics.prototype[key];Graphics.prototype[key]=function(...args){f.geometry++;return fn.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(': funeral fixtures; no fabricated traffic\n\n');return;}
    if(file==='api/garden/visit'||file==='favicon.ico'){res.writeHead(204);res.end();return;}
    if(file==='__funeral.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep))throw Error('path');
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__funeral.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],report={scenes:[],checks:[],resources:[],performance:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__funeralNow=1800000000000;Date.now=()=>__funeralNow;const Native=window.AudioContext;window.__funeralAudio={contexts:[],sources:0};
        window.AudioContext=class extends Native{constructor(...args){super(...args);__funeralAudio.contexts.push(this);}createBufferSource(){__funeralAudio.sources++;return super.createBufferSource();}createOscillator(){__funeralAudio.sources++;return super.createOscillator();}};});
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>window.__funeral?.app?.ticker?.started&&__funeral.snails);
      await page.evaluate(()=>{__funeral.app.stop();const v=document.querySelector('#view');v.style.width='960px';v.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const seed=options=>page.evaluate(({night=false,reduced=false}={})=>{const f=__funeral;f.gnomes.clear();f.ambient.clear();f.frogs.clear();f.snails.clear();f.ecology.clear();f.reduced=reduced;
        f.model.seedFungi(1200000,true,2);f.gnomes.resetCadence();f.cues=[];
        f.before=JSON.stringify([f.model.specimens,f.model.terrain.logs,f.model.terrain.snapshot(),f.model.fungi.records.size,f.ecology.grassCells,f.model.counts,f.model.recentEvents]);
        f.gardenView.setWeather({level:'quiet',eventsPerMinute:0});f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);f.app.render();
      },options??{});
      const start=(roll=.25)=>page.evaluate(roll=>{const f=__funeral;if(!f.gnomes.startFuneral(Date.now(),()=>roll))throw Error('No funeral');f.current=f.gnomes.incident;f.view.animate(Date.now());f.app.render();},roll);
      const step=ms=>page.evaluate(ms=>{const f=__funeral,end=Date.now()+ms;while(Date.now()<end){__funeralNow=Math.min(end,Date.now()+250);f.model.tick(Date.now());f.gnomes.tick(Date.now(),()=>.99);f.view.animate(Date.now());}f.app.render();},ms);
      const state=()=>page.evaluate(()=>{const f=__funeral,p=f.view.stretcher;return{phase:f.gnomes.incident?.phase??'idle',actors:f.view.views.size,props:p?1:0,alpha:p?.alpha??0,
        unchanged:JSON.stringify([f.model.specimens,f.model.terrain.logs,f.model.terrain.snapshot(),f.model.fungi.records.size,f.ecology.grassCells,f.model.counts,f.model.recentEvents])===f.before,
        attached:!p||(()=>{const b=[...f.view.views].filter(([a])=>a.role==='pallbearer').map(([,s])=>s);return b.length===2&&Math.abs(p.x-(b[0].x+b[1].x)/2)<1e-6&&Math.abs(p.y-(b[0].y+b[1].y)/2+7)<1e-6;})(),score:document.querySelector('#garden-score').textContent};});
      const shot=async scene=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{__funeral.app.render();resolve();})));const s=await state();assert(s.unchanged&&s.attached);assert.equal(s.score,'Score: 0');report.scenes.push({page:name,scene,...s});await page.locator('#view').screenshot({path:path.join(out,`${name}-${scene}.png`)});};
      const click=async point=>{await page.locator('#view').scrollIntoViewIfNeeded();const p=await page.evaluate(point=>{const f=__funeral,r=f.app.canvas.getBoundingClientRect(),root=f.gardenView.root;return{x:r.left+(root.position.x+point.x*root.scale.x)*r.width/f.app.renderer.screen.width,y:r.top+(root.position.y+point.y*root.scale.y)*r.height/f.app.renderer.screen.height};},point);await page.mouse.click(p.x,p.y);};
      for(const [base,share,expected] of [[.02,0,null],[.019999,.199999,'gnome_funeral'],[.019999,.2,'gnome_incident']]){
        await seed();assert.equal(await page.evaluate(({base,share})=>{const f=__funeral;f.model.terrain.clear();__funeralNow+=45000;let n=0;f.gnomes.tick(Date.now(),()=>[base,share,.5,.5][n++]);return f.gnomes.incident?.type??null;},{base,share}),expected);
      }
      await seed();await start();await step(1500);await shot('entering');await step(4500);await shot('marching');assert.equal((await state()).actors,4);assert.equal((await state()).props,1);
      const prop=await page.evaluateHandle(()=>__funeral.view.stretcher);await step(3000);await shot('day');await step(4000);await shot('ceremony');
      const pause=await page.evaluate(()=>[...__funeral.view.views.values()].map(s=>[s.x,s.y]));await step(2750);assert.deepEqual(await page.evaluate(()=>[...__funeral.view.views.values()].map(s=>[s.x,s.y])),pause);
      await step(1250);await shot('departure');assert((await state()).alpha>0&&(await state()).alpha<1);await step(1000);await shot('finished');assert(await page.evaluate(s=>s.destroyed,prop));await prop.dispose();
      assert.deepEqual(await page.evaluate(()=>__funeral.cues),['arrival']);assert.equal(await page.evaluate(()=>__funeralAudio.contexts.length),0);
      for(const [scene,options,roll] of [['night',{night:true},.25],['reduced-motion',{reduced:true},.25],['right-to-left',{},.75]]){
        await seed(options);await start(roll);await step(6000);await shot(scene);
        if(options.reduced)assert(await page.evaluate(()=>{const f=__funeral,p=f.view.stretcher,before=JSON.stringify([p.x,p.y,p.rotation,p.texture.frame.x,...[...f.view.views.values()].map(s=>[s.x,s.y,s.texture.frame.x])]);for(let i=0;i<12;i++){f.gnomes.advance(Date.now()+i*10);f.view.animate(Date.now()+i*10);}return before===JSON.stringify([p.x,p.y,p.rotation,p.texture.frame.x,...[...f.view.views.values()].map(s=>[s.x,s.y,s.texture.frame.x])]);}));
      }
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const v=document.querySelector('#view');v.style.width='';v.style.height='';});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await seed();await start();await step(6000);await page.locator('#view').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`${name}-mobile.png`)});report.scenes.push({page:name,scene:'mobile',...await state()});
      await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>{const v=document.querySelector('#view');v.style.width='960px';v.style.height='600px';});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      for(const mode of ['hidden','stalled','render-stalled','backwards','visual-backwards','clear']){
        await seed();await start();await step(6000);assert(await page.evaluate(mode=>{const f=__funeral,c=f.current,owned=[...f.view.views.values(),f.view.stretcher];
          if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__funeralNow+=45000;Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));}
          else if(mode==='clear')f.gnomes.clear();else if(mode==='visual-backwards'){f.gnomes.advance(Date.now()+100);f.gnomes.advance(Date.now()+99);}
          else{__funeralNow+=mode==='backwards'?-1:1501;if(mode==='render-stalled')f.gnomes.advance(Date.now());else f.gnomes.tick(Date.now(),()=>.99);}
          return !f.gnomes.incident&&!c.route&&!f.view.stretcher&&!f.view.views.size&&owned.every(s=>s.destroyed);
        },mode));
      }
      await seed();await start();await step(6000);const leaf=await page.evaluate(()=>({x:__funeral.view.stretcher.x,y:__funeral.view.stretcher.y-4}));await click(leaf);assert.equal(await page.evaluate(()=>__funeral.ambient.drops.length),0);
      const points=await page.evaluate(()=>[...__funeral.view.views.values()].map(s=>({x:s.x,y:s.y})));for(const p of points){await click(p);await click(p);}
      assert.equal(await page.evaluate(()=>__funeral.ambient.drops.length),4);assert(await page.locator('#collection-message').isHidden());assert((await state()).unchanged);assert((await state()).attached);
      const samples=[];for(const active of [false,true]){await seed();if(active){await start();await step(6000);}samples.push(await page.evaluate(active=>{const f=__funeral,measure=(fn,n)=>{const a=[];for(let k=0;k<12;k++){const t=performance.now();for(let i=0;i<n;i++)fn();a.push((performance.now()-t)/n);}a.sort((a,b)=>a-b);return{medianMs:a[6],p95Ms:a[11]};};return{active,actors:f.view.views.size,prop:f.view.stretcher?1:0,visual:measure(()=>{f.gnomes.advance(Date.now());f.view.animate(Date.now());},1000),logical:measure(()=>f.gnomes.tick(Date.now(),()=>.99),1000),renderSubmit:measure(()=>f.app.render(),20)};},active));}report.performance.push({page:name,samples});
      await seed();const resources=await page.evaluate(()=>{const f=__funeral,bakes=f.bakes.length,geometry=f.geometry,contexts=f.contexts.length,owned=[];
        const count=()=>{let n=0;const visit=o=>{n++;for(const c of o.children??[])visit(c);};visit(f.app.stage);return n;},before=count();
        for(let cycle=0;cycle<100;cycle++){const at=Date.now();f.gnomes.startFuneral(at-6000,()=>.25);for(let t=at-5000;t<=at;t+=1000)f.gnomes.tick(t,()=>.99);f.view.animate(at);owned.push(...f.view.views.values(),f.view.stretcher);f.gnomes.clear();}
        return{apps:f.apps,streams:f.streams,bakes,bakesAfter:f.bakes.length,geometryDelta:f.geometry-geometry,contextsDelta:f.contexts.length-contexts,objectsBefore:before,objectsAfter:count(),spritesReleased:owned.length,released:owned.every(s=>s.destroyed),frames:f.cache.frames.size,backing:[f.cache.atlas.source.pixelWidth,f.cache.atlas.source.pixelHeight],sources:new Set([...f.cache.frames.values()].map(t=>t.source)).size,atlasRetained:!f.cache.atlas.source.destroyed,actors:f.view.views.size,prop:f.view.stretcher?1:0};
      });
      assert.equal(resources.apps,1);assert.equal(resources.streams,1);assert.equal(resources.bakes,5);assert.equal(resources.bakesAfter,5);assert.equal(resources.geometryDelta,0);assert.equal(resources.contextsDelta,0);assert.equal(resources.objectsBefore,resources.objectsAfter);assert(resources.released&&resources.atlasRetained);assert.equal(resources.spritesReleased,500);assert.equal(resources.frames,39);assert.deepEqual(resources.backing,[3120,64]);assert.equal(resources.sources,1);report.resources.push({page:name,...resources});assert((await state()).unchanged);
      if(name==='diagnostic'){
        for(const id of ['trigger-funeral','preview-funeral-normal','preview-funeral-reduced']){await seed();await page.locator('#'+id).click();assert.equal((await state()).actors,4);assert.equal((await state()).props,1);}
        for(const id of ['cancel-funeral-hidden','cancel-funeral-stalled','cleanup-funeral']){await seed();await page.locator('#trigger-funeral').click();await page.locator('#'+id).click();assert.equal((await state()).props,0);assert.equal((await state()).actors,0);}
        assert.match(await page.locator('#funeral-status').textContent(),/destroyed true/);
        await seed();await start();await page.locator('#seed').click();assert.equal((await state()).actors,0);assert.equal((await state()).props,0);
        await seed();await start();await page.locator('#clear').click();assert.equal((await state()).actors,0);assert.equal((await state()).props,0);
      }else assert.equal(await page.locator('#trigger-funeral').count(),0);
      // Explicit gesture uses the existing arrival cue; there are no additional ceremonial cues.
      await seed();assert.equal(await page.evaluate(()=>__funeralAudio.contexts.length),0);await page.locator('#sound-toggle').click();await page.waitForFunction(()=>__funeralAudio.contexts[0]?.state==='running');await start();await step(18000);
      assert.deepEqual(await page.evaluate(()=>__funeral.cues),['arrival']);assert.equal(await page.evaluate(()=>__funeralAudio.contexts.length),1);assert(await page.evaluate(()=>__funeralAudio.sources>0));await page.locator('#sound-toggle').click();
      report.checks.push({page:name,odds:true,formation:true,propAttachment:true,ceremony:true,cancellation:true,reduced:true,underpants:true,leafNotCollectible:true,unchangedGarden:true,audio:true,diagnostics:name==='diagnostic'});
      await seed();await start();await step(6000);await page.evaluate(()=>{const f=__funeral;f.owned=[...f.view.views.values(),f.view.stretcher];dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));});
      assert(await page.evaluate(()=>!__funeral.gnomes.incident&&!__funeral.current.route&&!__funeral.view.stretcher&&__funeral.owned.every(s=>s.destroyed)&&__funeral.bakes.every(t=>t.destroyed)));await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2));const scenes=['entering','marching','ceremony','departure','finished','day','night','reduced-motion','right-to-left','mobile'];
    await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Great Gnome Funeral Procession</title><style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#d8c7a0}figure{overflow:auto;margin:12px 0}summary{padding:12px;cursor:pointer}</style><h1>Great Gnome Funeral Procession</h1><p>Actual 960×600 garden scale. Nobody has died. <a href="review.json">Measurements and assertions</a></p>${['homepage','diagnostic'].map(name=>`<h2>${name}</h2>${scenes.map(scene=>`<details ${scene==='marching'?'open':''}><summary>${scene}</summary><figure><img src="${name}-${scene}.png" alt="${name} ${scene}"></figure></details>`).join('')}`).join('')}`);
    console.log('PASS: real Chrome funeral path/formation/prop attachment/ceremony/fade, reduced motion, one underpants attempt per gnome/noncollectible leaf, unchanged specimens/terrain/fungi/ecology/stats/score, hidden/stall/backwards/reset/teardown, original arrival audio and bounded ownership:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
