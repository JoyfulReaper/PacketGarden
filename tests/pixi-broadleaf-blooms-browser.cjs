// Optional installed Chrome/Playwright review. No packages or project dependencies added.
if(!process.argv.includes('--run'))console.log('SKIP: Pixi broadleaf bloom Chrome review; pass --run [--baseline].');
else run().catch(error=>{console.error(error);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
  const {execFileSync}=require('node:child_process'),{chromium}=require('playwright'),B=require('../wwwroot/pixi-broadleaf-blooms.js');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),baseline=process.argv.includes('--baseline');
  const output=path.join(root,'artifacts/broadleaf-blooms',baseline?'before':'after');await fs.mkdir(output,{recursive:true});
  const checkpoint=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),old=new Map();
  if(baseline)for(const file of ['index.html','pixi-live.html','pixi-live-core.js','pixi-live.js'])old.set(file,execFileSync('git',['show',`${checkpoint}:wwwroot/${file}`],{cwd:root}));
  const capture=`{
    const f=window.__bloom={bakes:[],geometry:0};
    const create=PacketGardenCore.createGardenModel;PacketGardenCore.createGardenModel=(...args)=>{const m=create(...args);f.garden??=m;return m;};
    const model=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(...args)=>{f.view=args[0];return f.model=model(...args);};
    const ecology=PacketGardenEcology.createEcologyModel;PacketGardenEcology.createEcologyModel=(...args)=>(f.ecology=ecology(...args));
    const light=PacketGardenLighting.createModel;PacketGardenLighting.createModel=(...args)=>(f.light=light(...args));
    const surface=PacketGardenLightingView.createSurface;PacketGardenLightingView.createSurface=(...args)=>(f.surface=surface(...args));
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const generate=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{
        const at=performance.now(),texture=generate(options);f.bakes.push({width:options.frame.width,height:options.frame.height,ms:performance.now()-at,texture,source:texture.source});return texture;};return value;
    });};
    for(const name of ['moveTo','bezierCurveTo','circle','fill']){const method=PIXI.Graphics.prototype[name];PIXI.Graphics.prototype[name]=function(...args){f.geometry++;return method.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__bloom.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=old.get(file)??await fs.readFile(absolute);
    if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__bloom.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(error){res.writeHead(404);res.end(String(error));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const errors=[],report={baseline,checkpoint,scenes:[],resources:[],timing:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',error=>errors.push(error.stack));
      await page.addInitScript(()=>{
        window.__bloomNow=1800000000000;Date.now=()=>__bloomNow;let seed=91;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        window.__bloomTimers=0;const interval=setInterval;window.setInterval=(...args)=>{__bloomTimers++;return interval(...args);};
      });
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>window.__bloom?.app?.ticker?.started&&__bloom.ecology);
      await page.evaluate(()=>__bloom.app.stop());if(name==='diagnostic')await page.locator('#probes').uncheck();
      const render=()=>page.evaluate(()=>{window.__bloomFrame=(window.__bloomFrame??performance.now())+1000;__bloom.app.ticker.update(__bloomFrame);__bloom.app.render();});
      const seed=async(entries,night=false,grass=true)=>{
        await page.evaluate(({entries,night,grass})=>{
          const f=__bloom,foliage=entries.map(p=>p.colorVariant);f.garden.clear();f.ecology.clear();f.ecology.setAllowGrassUnderPlants(true);
          document.querySelector('#allow-grass-under-plants').checked=true;
          f.garden.seed(entries);for(let i=0;i<entries.length;i++){entries[i].colorVariant=foliage[i];f.view.update(entries[i],f.garden.byCell);}
          if(grass)f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}))});
          f.ecology.resetCadence(Date.now());f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);
        },{entries,night,grass});await render();
      };
      const captureScene=async(scene,expected)=>{
        const state=await page.evaluate(()=>({plants:__bloom.garden.specimens.length,blooms:__bloom.view.bloomViews?.size??0,
          grass:__bloom.ecology.grassCells.length,colors:[...new Set(__bloom.garden.specimens.filter(p=>p.broadleafBloom).map(p=>p.broadleafBloom.color))],score:document.querySelector('#garden-score').textContent}));
        assert.equal(state.plants,expected.plants);assert.equal(state.blooms,baseline?0:expected.blooms);assert.equal(state.score,'Score: 0');
        if(!baseline&&expected.blooms)assert.deepEqual(state.colors.sort(),[0,1,2,3,4]);
        await page.locator('#view canvas').screenshot({path:path.join(output,`${name}-${scene}.png`)});report.scenes.push({page:name,scene,...state});
      };
      const at=1800000000000,stages=B.fixtureEntries(at),colors=Array.from({length:15},(_,i)=>({type:'broadleaf',column:8+i%5*4,row:6+Math.floor(i/5)*4,
        vigor:i%4,colorVariant:i%5,createdAt:at-65000,broadleafBloom:{color:i%5,arrangement:Math.floor(i/5)},origin:{kind:'simulated',eventType:'bloom-review'}}));
      if(!baseline&&name==='diagnostic'){
        await page.locator('#seed-broadleaf-blooms').click();assert.equal(await page.evaluate(()=>__bloom.view.bloomViews.size),10);
        await page.locator('#seed-dense-broadleaf-blooms').click();assert.equal(await page.evaluate(()=>__bloom.view.bloomViews.size),640);
      }
      await seed(stages);await captureScene('all-stages-grass-day',{plants:25,blooms:10});
      await seed(colors);await captureScene('five-colors-grass-day',{plants:15,blooms:15});
      await seed(colors,true,false);await captureScene('sparse-night',{plants:15,blooms:15});
      const young=colors.map(p=>({...p,createdAt:at-59999}));await seed(young);await captureScene('before-maturity',{plants:15,blooms:0});
      await page.evaluate(()=>{__bloomNow++;__bloom.garden.tick(Date.now());});await render();await captureScene('after-maturity',{plants:15,blooms:15});
      for(const night of [false,true]){
        await seed(B.fixtureEntries(at,true),night);await captureScene(night?'full-grass-night':'full-grass-day',{plants:640,blooms:640});
        if(!night){
          const timing=await page.evaluate(async()=>{
            const submissions=[],intervals=[];let last;
            for(let i=0;i<90;i++){await new Promise(resolve=>requestAnimationFrame(resolve));const start=performance.now();if(last!==undefined)intervals.push(start-last);last=start;__bloom.app.render();submissions.push(performance.now()-start);}
            const mean=a=>a.reduce((sum,n)=>sum+n,0)/a.length;return {meanSubmitMs:mean(submissions),maxSubmitMs:Math.max(...submissions),meanFrameMs:mean(intervals)};
          });report.timing.push({page:name,scene:'full-grass-day',...timing});
        }
      }
      const resources=await page.evaluate(()=>({geometry:__bloom.geometry,bakes:__bloom.bakes.length,timers:__bloomTimers,
        dimensions:__bloom.bakes.map(b=>[b.width,b.height]),frames:__bloom.view.snapshot().textures,overlays:__bloom.view.bloomViews?.size??0}));
      if(!baseline){assert.equal(resources.frames,829);assert.equal(resources.overlays,640);assert.deepEqual(resources.dimensions[1],[1024,832]);}
      for(let i=0;i<5;i++)await seed(B.fixtureEntries(at,true));
      assert.deepEqual(await page.evaluate(()=>({geometry:__bloom.geometry,bakes:__bloom.bakes.length,timers:__bloomTimers})),
        {geometry:resources.geometry,bakes:resources.bakes,timers:resources.timers},'fixtures never rebuild artwork');
      report.resources.push({page:name,...resources});
      if(!baseline){
        await page.emulateMedia({reducedMotion:'reduce'});const pose=await page.evaluate(()=>[...__bloom.view.bloomViews.values()].map(s=>[s.scale.x,s.alpha,s.rotation]));
        for(let i=0;i<5;i++)await render();assert.deepEqual(await page.evaluate(()=>[...__bloom.view.bloomViews.values()].map(s=>[s.scale.x,s.alpha,s.rotation])),pose);
        await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await render();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await page.locator('#view canvas').screenshot({path:path.join(output,`${name}-full-mobile.png`)});
        await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__bloomNow+=360001;
          Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__bloom.app.stop();});
        assert.equal(await page.evaluate(()=>__bloom.view.bloomViews.size),0);assert.equal(await page.evaluate(()=>__bloom.garden.specimens.length),0);
      }
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      assert.equal(await page.evaluate(()=>__bloom.view.byId.size),0);
      assert.equal(await page.evaluate(()=>__bloom.bakes.every(b=>b.source.destroyed)),true,'all generated texture sources released');
      await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2));
    console.log('PASS: Chrome bloom captures/lifecycle/fixtures, 640 parents and overlays, stable textures/geometry, hidden/expiry/reduced-motion cleanup:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
