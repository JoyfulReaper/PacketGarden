// Installed Chrome/Playwright only. No package installation or runtime dependencies.
if(!process.argv.includes('--run'))console.log('SKIP: vine bloom Chrome review; pass --run [--baseline].');
else run().catch(error=>{console.error(error);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
  const {execFileSync}=require('node:child_process'),{chromium}=require('playwright'),V=require('../wwwroot/pixi-vine-blooms.js');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),baseline=process.argv.includes('--baseline');
  const output=path.join(root,'artifacts/vine-blooms',baseline?'before':'after');await fs.mkdir(output,{recursive:true});
  const checkpoint=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),old=new Map();
  if(baseline)for(const file of ['index.html','pixi-live.html','pixi-live-core.js','pixi-live.js'])old.set(file,execFileSync('git',['show',`${checkpoint}:wwwroot/${file}`],{cwd:root}));
  const capture=`{
    const f=window.__vine={bakes:[],geometry:0,streams:0,contexts:[]};
    const NativeSource=EventSource;window.EventSource=class extends NativeSource{constructor(...args){super(...args);f.streams++;}};
    const create=PacketGardenCore.createGardenModel;PacketGardenCore.createGardenModel=(...args)=>{const m=create(...args);f.garden??=m;return m;};
    const model=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(...args)=>{f.view=args[0];return f.model=model(...args);};
    const ecology=PacketGardenEcology.createEcologyModel;PacketGardenEcology.createEcologyModel=(...args)=>(f.ecology=ecology(...args));
    const light=PacketGardenLighting.createModel;PacketGardenLighting.createModel=(...args)=>(f.light=light(...args));
    const surface=PacketGardenLightingView.createSurface;PacketGardenLightingView.createSurface=(...args)=>(f.surface=surface(...args));
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const generate=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{
        const start=performance.now(),texture=generate(options);f.bakes.push({width:options.frame.width,height:options.frame.height,ms:performance.now()-start,source:texture.source});return texture;};return value;
    });};
    for(const name of ['clear','moveTo','bezierCurveTo','circle','fill','stroke']){const original=PIXI.Graphics.prototype[name];PIXI.Graphics.prototype[name]=function(...args){f.geometry++;return original.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__vine.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=old.get(file)??await fs.readFile(absolute);
    if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__vine.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(error){res.writeHead(404);res.end(String(error));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const errors=[],report={baseline,checkpoint,scenes:[],resources:[],timing:[],refresh:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',error=>errors.push(error.stack));
      await page.addInitScript(()=>{
        window.__vineNow=1800000000000;Date.now=()=>__vineNow;let seed=137;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        window.__vineTimers=0;const interval=setInterval;window.setInterval=(...args)=>{__vineTimers++;return interval(...args);};
      });
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>window.__vine?.app?.ticker?.started&&__vine.ecology);
      await page.evaluate(()=>__vine.app.stop());if(name==='diagnostic')await page.locator('#probes').uncheck();
      const render=()=>page.evaluate(()=>{window.__vineFrame=(window.__vineFrame??performance.now())+1000;__vine.app.ticker.update(__vineFrame);__vine.app.render();});
      const seed=async(entries,night=false,grass=true)=>{
        await page.evaluate(({entries,night,grass})=>{
          const f=__vine,foliage=entries.map(p=>p.colorVariant);
          for(const g of f.view.vineLinks.values())f.contexts.push(g.context);
          f.garden.clear();f.ecology.clear();f.ecology.setAllowGrassUnderPlants(true);
          document.querySelector('#allow-grass-under-plants').checked=true;f.garden.seed(entries);
          for(let i=0;i<entries.length;i++){entries[i].colorVariant=foliage[i];f.view.update(entries[i],f.garden.byCell);}
          if(grass)f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}))});
          f.ecology.resetCadence(Date.now());f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);
        },{entries,night,grass});await render();
      };
      const captureScene=async(scene,plants,body,connected=false)=>{
        const state=await page.evaluate(()=>({plants:__vine.garden.specimens.length,groups:__vine.view.vineBloomViews?.size??0,connections:__vine.view.vineBloomLinks?.size??0,
          halves:__vine.view.snapshot().connectionHalves,grass:__vine.ecology.grassCells.length,score:document.querySelector('#garden-score').textContent,accepted:__vine.model.counts.acceptedLive}));
        assert.equal(state.plants,plants);assert.equal(state.groups,baseline?0:body);assert.equal(state.score,'Score: 0');assert.equal(state.accepted,0);
        if(!baseline&&connected)assert(state.connections>0);assert(state.connections<=640);
        await page.locator('#view canvas').screenshot({path:path.join(output,`${name}-${scene}.png`)});report.scenes.push({page:name,scene,...state});
      };
      const at=1800000000000,colors=Array.from({length:4},(_,i)=>({type:'vine',column:7+i*6,row:10,vigor:i,colorVariant:i===3?4:i,createdAt:at-65000,
        vineBloom:{color:i,layout:i%2},origin:{kind:'simulated',eventType:'vine-bloom-review'}}));
      if(!baseline&&name==='diagnostic')for(const [id,count] of [['#seed-vine-bloom-stages',8],['#seed-vine-bloom-connections',28],['#seed-vine-bloom-dense',640]]){
        await page.locator(id).click();assert.equal(await page.evaluate(()=>__vine.view.vineBloomViews.size),count);
      }
      await seed(colors);await captureScene('four-colors-day',4,4);
      await seed([{...colors[3],column:16}]);await captureScene('isolated',1,1);
      await seed(V.fixtureEntries(at,'stages'));await captureScene('all-stages',20,8);
      await seed(V.fixtureEntries(at,'connected'));await captureScene('connected-mixed-grass',33,28,true);
      await seed(V.fixtureEntries(at,'connected'),true);await captureScene('connected-night',33,28,true);
      await seed(V.fixtureEntries(at,'connected').map(p=>({...p,createdAt:at-500000})));await captureScene('fading-grass',33,28,true);
      await seed(colors.map(p=>({...p,createdAt:at-59999})));await captureScene('before-maturity',4,0);
      await page.evaluate(()=>{__vineNow++;__vine.garden.tick(Date.now());});await render();await captureScene('after-maturity',4,4);
      for(const night of [false,true]){
        await seed(V.fixtureEntries(at,'dense'),night);await captureScene(night?'full-grass-night':'full-grass-day',640,640,true);
        if(!night){
          const timing=await page.evaluate(async()=>{
            const submissions=[],intervals=[];let last;const geometry=__vine.geometry;
            for(let i=0;i<90;i++){await new Promise(resolve=>requestAnimationFrame(resolve));const start=performance.now();if(last!==undefined)intervals.push(start-last);last=start;__vine.app.render();submissions.push(performance.now()-start);}
            if(__vine.geometry!==geometry)throw Error('Per-frame Graphics rebuilding');
            const mean=a=>a.reduce((sum,n)=>sum+n,0)/a.length;return {meanSubmitMs:mean(submissions),maxSubmitMs:Math.max(...submissions),meanFrameMs:mean(intervals)};
          });report.timing.push({page:name,...timing});
          report.refresh.push({page:name,...await page.evaluate(()=>{
            const times=[],geometry=__vine.geometry,checks=__vine.view.counters.vineNeighborChecks;
            for(let i=0;i<3;i++){const start=performance.now();for(const p of __vine.garden.specimens)__vine.view.update(p,__vine.garden.byCell);times.push(performance.now()-start);}
            return {passes:3,parentsPerPass:640,meanPassMs:times.reduce((a,b)=>a+b,0)/3,geometryCommands:__vine.geometry-geometry,neighborChecks:__vine.view.counters.vineNeighborChecks-checks};
          })});
        }
      }
      const resources=await page.evaluate(()=>({bakes:__vine.bakes.length,timers:__vineTimers,dimensions:__vine.bakes.map(b=>[b.width,b.height]),
        frames:__vine.view.snapshot().textures,displayObjects:__vine.view.snapshot().displayObjects,groups:__vine.view.vineBloomViews?.size??0,connections:__vine.view.vineBloomLinks?.size??0,streams:__vine.streams}));
      if(!baseline){assert.equal(resources.frames,828);assert.deepEqual(resources.dimensions[1],[1024,832]);assert.equal(resources.groups,640);}
      assert.equal(resources.streams,1);const bakes=resources.bakes;
      for(let i=0;i<3;i++)await seed(V.fixtureEntries(at,'dense'));
      assert.equal(await page.evaluate(()=>__vine.bakes.length),bakes);assert.equal(await page.evaluate(()=>__vineTimers),resources.timers);report.resources.push({page:name,...resources});
      if(!baseline){
        const removed=await page.evaluate(()=>{
          const [id,record]=__vine.view.vineBloomLinks.entries().next().value;const target=__vine.garden.specimens.find(p=>p.id===record.neighborId),key=record.key;
          const sprite=record.sprite,context=__vine.view.vineLinks.get(target.id).context;
          __vine.garden.remove(target);if(!sprite.destroyed||!context.destroyed)throw Error('Lost-edge ownership not released');return {id,key};
        });assert.equal(await page.evaluate(key=>[...__vine.view.vineBloomLinks.values()].some(r=>r.key===key),removed.key),false);
        assert(await page.evaluate(()=>new Set([...__vine.view.vineBloomLinks.values()].map(r=>r.key)).size===__vine.view.vineBloomLinks.size));
        await page.emulateMedia({reducedMotion:'reduce'});const pose=await page.evaluate(()=>[...__vine.view.vineBloomViews.values()].map(s=>[s.scale.x,s.alpha,s.tint]));
        for(let i=0;i<5;i++)await render();assert.deepEqual(await page.evaluate(()=>[...__vine.view.vineBloomViews.values()].map(s=>[s.scale.x,s.alpha,s.tint])),pose);
        await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await render();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#view canvas').screenshot({path:path.join(output,`${name}-full-mobile.png`)});
        await page.evaluate(()=>{for(const g of __vine.view.vineLinks.values())__vine.contexts.push(g.context);
          Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__vineNow+=600001;
          Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__vine.app.stop();});
        assert.equal(await page.evaluate(()=>__vine.view.vineBloomViews.size+__vine.view.vineBloomLinks.size),0);assert.equal(await page.evaluate(()=>__vine.garden.specimens.length),0);
        const fresh=await page.evaluate(()=>Date.now());await seed(V.fixtureEntries(fresh,'dense'));
        await page.evaluate(()=>{for(const g of __vine.view.vineLinks.values())__vine.contexts.push(g.context);});
      }
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      if(!baseline)assert.equal(await page.evaluate(()=>__vine.contexts.every(context=>context.destroyed)),true,'owned link contexts released on removal and direct page teardown');
      assert.equal(await page.evaluate(()=>__vine.view.byId.size),0);assert.equal(await page.evaluate(()=>__vine.bakes.every(b=>b.source.destroyed)),true);await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2));console.log('PASS: Chrome vine bloom captures, canonical connection cleanup, full grass/garden bounds, reduced motion/hidden/SSE ownership, resource/CPU/refresh measurements:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
