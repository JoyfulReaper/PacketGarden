if(!process.argv.includes('--run'))console.log('SKIP: traffic-fed blooms Chrome checks; pass --run.');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
  const assets=path.resolve('wwwroot'),out=path.resolve('artifacts/traffic-blooms');await fs.mkdir(out,{recursive:true});
  const capture=`{
    const f=window.__traffic={roll:0,selection:0,draws:0,competitionDraws:0,bakes:[],geometry:0,streams:0};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...a){super(...a);f.stream=this;f.streams++;}};
    for(const [name,key] of [['PacketGardenCore','garden'],['PacketGardenPixiLiveCore','model'],['PacketGardenEcology','ecology'],['PacketGardenLighting','light']]){
      const method=key==='garden'?'createGardenModel':key==='ecology'?'createEcologyModel':'createModel',create=window[name][method];
      window[name][method]=(...a)=>{if(key==='model'){f.view=a[0];a[1]={...a[1],random:()=>.5,competitionRandom:()=>{f.competitionDraws++;return .99;},
        influenceRandom:()=>f.draws++%2?f.selection:f.roll};}const result=create(...a);f[key]??=result;return result;};
    }
    const surface=PacketGardenLightingView.createSurface;PacketGardenLightingView.createSurface=(...a)=>(f.surface=surface(...a));
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...a){f.app=this;return init.apply(this,a).then(v=>{
      const bake=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=o=>{const t=bake(o);f.bakes.push({width:o.frame.width,height:o.frame.height,source:t.source});return t;};return v;});};
    for(const name of ['circle','ellipse','moveTo','fill']){const original=PIXI.Graphics.prototype[name];PIXI.Graphics.prototype[name]=function(...a){f.geometry++;return original.apply(this,a);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(name==='__traffic.js'){res.setHeader('Content-Type','text/javascript');return res.end(capture);}
    if(name==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(name==='favicon.ico'||name==='api/garden/visit'){res.writeHead(204);return res.end();}
    const file=path.resolve(assets,name);if(!file.startsWith(assets+path.sep)){res.writeHead(404);return res.end();}
    let body=await fs.readFile(file);if(name.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__traffic.js" defer></script>$1'));
    res.setHeader('Content-Type',name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report=[],errors=[];
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__trafficNow=1800000000000;Date.now=()=>__trafficNow;});
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>window.__traffic?.app?.ticker?.started&&__traffic.stream);
      await page.evaluate(()=>{const f=__traffic;f.app.stop();f.ecology.clear();document.querySelector('#view').style.width='960px';document.querySelector('#view').style.height='600px';});
      if(name==='diagnostic')await page.locator('#probes').uncheck();
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      assert.deepEqual(await page.evaluate(()=>[__traffic.app.renderer.screen.width,__traffic.app.renderer.screen.height]),[960,600]);
      const snap=async(label)=>{await page.evaluate(()=>__traffic.app.render());await page.locator('#view canvas').screenshot({path:path.join(out,`${name}-${label}.png`)});};
      const emit=()=>page.evaluate(()=>__traffic.stream.dispatchEvent(new MessageEvent('garden',{data:JSON.stringify({specimenType:'flower',listenPort:53,vigor:0,sensor:'test',seenCount:'42'})})));
      const advance=ms=>page.evaluate(ms=>{__trafficNow+=ms;__traffic.model.tick();},ms);
      await page.evaluate(()=>{const f=__traffic;f.model.seedTrafficBlooms(false);f.light.setMode('day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);});await snap('ordinary-mature');
      // Production entry point: real EventSource listener, normal rejection accounting, independent RNG.
      await page.evaluate(()=>{__traffic.model.seedTrafficBlooms();__traffic.source=__traffic.model.specimens[333];__traffic.selection=333.5/640;__traffic.before=JSON.stringify(__traffic.source);});
      await emit();assert.equal(await page.evaluate(()=>__traffic.model.influences.active.size),1);
      const selectionMs=await page.evaluate(()=>{
        if(!__traffic.garden.isSaturated()||__traffic.garden.specimens.length!==640)throw Error('Benchmark requires the authoritative full garden');
        const start=performance.now();for(let i=0;i<300;i++){
          const b=PacketGardenTrafficBlooms.createModel({garden:__traffic.garden,now:Date.now,random:()=>0});b.consider({specimenType:'flower'});b.destroy();
        }return (performance.now()-start)/300;
      });
      assert.equal(await page.evaluate(()=>JSON.stringify(__traffic.source)===__traffic.before),true);
      assert.deepEqual(await page.evaluate(()=>[__traffic.model.counts.acceptedLive,__traffic.model.counts.replacements,__traffic.model.counts.droppedSaturated,__traffic.model.recentEvents.length,__traffic.model.recentEvents[0].outcome]),[0,0,1,1,'dropped']);
      await snap('dense-early-bud');await advance(2000);await snap('dense-full-bloom');await advance(3000);await advance(3000);await snap('dense-fading');await advance(4000);
      assert.equal(await page.evaluate(()=>__traffic.view.influenceViews.size),0);await emit();assert.equal(await page.evaluate(()=>__traffic.draws),2);
      await advance(3000);await page.evaluate(()=>{__traffic.roll=.2;__traffic.draws=0;});await emit();assert.equal(await page.evaluate(()=>__traffic.view.influenceViews.size),0);
      // Preview stages are explicitly simulated, bounded, and never activity entries.
      await page.evaluate(()=>{const f=__traffic;f.model.seedTrafficBlooms(false);f.model.specimens.forEach((p,i)=>f.model.influences.preview(p,[0,4000,10000][i]));});await snap('several-stages-day');
      await page.evaluate(()=>{const f=__traffic;f.light.setMode('night');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);});await snap('several-stages-night');
      const resources=await page.evaluate(()=>{
        const f=__traffic,bakes=f.bakes.length,geometry=f.geometry,sprites=[...f.view.influenceViews.values()],before=f.view.snapshot().displayObjects;
        const at=performance.now();for(let i=0;i<2000;i++)f.view.animate(0,0,Date.now());const perFrame=(performance.now()-at)/2000;
        const logicalStart=performance.now();for(let i=0;i<2000;i++)f.model.influences.tick();const logicalTickMs=(performance.now()-logicalStart)/2000;
        const start=performance.now();for(let i=0;i<200;i++){f.model.influences.clear();f.model.specimens.forEach(p=>f.model.influences.preview(p));}const cleanupMs=(performance.now()-start)/200;
        f.model.influences.clear();
        return {frames:f.view.snapshot().textures,bakes,bakesAfter:f.bakes.length,geometryDelta:f.geometry-geometry,perFrameMs:perFrame,logicalTickMs,cleanupCycleMs:cleanupMs,
          released:sprites.every(s=>s.destroyed),objectDelta:before-f.view.snapshot().displayObjects,streams:f.streams,atlas:f.bakes[1]&&[f.bakes[1].width,f.bakes[1].height]};
      });
      assert.equal(resources.frames,844);assert.equal(resources.bakes,5);assert.equal(resources.bakesAfter,5);assert.equal(resources.geometryDelta,0);assert(resources.released);assert.equal(resources.objectDelta,3);assert.equal(resources.streams,1);
      assert.deepEqual(resources.atlas,[1024,864]);
      await page.evaluate(()=>{const f=__traffic;f.model.seedTrafficBlooms(false);f.model.influences.preview(f.model.specimens[0]);f.savedSprite=[...f.view.influenceViews.values()][0];f.model.remove(f.model.specimens[0]);});
      assert(await page.evaluate(()=>__traffic.savedSprite.destroyed&&__traffic.view.influenceViews.size===0));
      await page.evaluate(()=>{const f=__traffic;f.model.influences.preview(f.model.specimens[0]);f.savedSprite=[...f.view.influenceViews.values()][0];f.model.seedTrafficBlooms(false);});
      assert(await page.evaluate(()=>__traffic.savedSprite.destroyed&&__traffic.view.influenceViews.size===0));
      await page.evaluate(()=>{const f=__traffic;f.model.influences.preview(f.model.specimens[0]);Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      assert.equal(await page.evaluate(()=>__traffic.view.influenceViews.size),0);
      await page.evaluate(()=>{__trafficNow+=60000;Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));__traffic.app.stop();delete document.hidden;});
      assert.equal(await page.evaluate(()=>__traffic.view.influenceViews.size),0);
      await page.evaluate(()=>{const f=__traffic;f.model.influences.preview(f.model.specimens[0]);});await advance(-1000);assert.equal(await page.evaluate(()=>__traffic.view.influenceViews.size),0);
      await page.evaluate(()=>{const f=__traffic;f.model.influences.preview(f.model.specimens[0]);});await advance(5001);assert.equal(await page.evaluate(()=>__traffic.view.influenceViews.size),0);
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.evaluate(()=>{const f=__traffic;f.model.seedTrafficBlooms(false);f.model.specimens.forEach((p,i)=>f.model.influences.preview(p,[0,4000,10000][i]));});
      await snap('reduced-motion');assert.equal(await page.evaluate(()=>__traffic.model.influences.snapshot().reducedMotion),true);
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const s=document.querySelector('#view').style;s.width='100%';s.height='';});
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await snap('mobile');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no horizontal overflow');
      await page.evaluate(()=>__traffic.model.influences.clear());await snap('after-cleanup');
      assert.equal(await page.locator('#garden-score').textContent(),'Score: 0');
      if(name==='diagnostic'){
        const activity=await page.evaluate(()=>JSON.stringify([__traffic.model.recentEvents,__traffic.model.counts.acceptedLive]));
        for(const id of ['seed-traffic-blooms','fail-traffic-bloom','pass-traffic-bloom','remove-traffic-bloom','preview-traffic-blooms','replace-traffic-bloom','cap-traffic-blooms','cooldown-traffic-blooms','hide-traffic-blooms','preview-traffic-blooms','stall-traffic-blooms'])await page.locator('#'+id).click();
        assert.equal(await page.evaluate(()=>JSON.stringify([__traffic.model.recentEvents,__traffic.model.counts.acceptedLive])),activity);
        await page.locator('#traffic-bloom-reduced').check();
      }else assert.equal(await page.locator('#seed-traffic-blooms').count(),0);
      report.push({page:name,selectionMs,...resources});await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      assert.equal(await page.evaluate(()=>__traffic.view.influenceViews.size),0);assert.equal(await page.evaluate(()=>__traffic.model.influences.active.size),0);await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify({browser:browser.version(),report},null,2));console.log('PASS: traffic blooms both Chrome pages, SSE adapter/accounting, cached states, identity/removal/replacement, hidden/stall/clock cleanup, reduced motion, mobile, 200 cleanup cycles, score and resource bounds',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
