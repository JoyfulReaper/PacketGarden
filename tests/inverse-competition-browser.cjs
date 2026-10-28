if(!process.argv.includes('--run'))console.log('SKIP: inverse competition Chrome checks; pass --run.');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),out=path.join(root,'artifacts/inverse-vigor');await fs.mkdir(out,{recursive:true});
  const capture=`{
    const f=window.__competition={calls:0,selection:0,roll:.99,bakes:0};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.stream=this;}};
    const create=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(view,options)=>{f.view=view;return f.model=create(view,{...options,
      competitionRandom:()=>f.calls++%2?f.roll:f.selection,terrainRandom:()=>.99,sporeRandom:()=>.99,poppyRandom:()=>.99});};
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const bake=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=(...args)=>{f.bakes++;return bake(...args);};return value;});};
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__competition.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__competition.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],report=[];
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});
    for(const [name,route] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__competitionNow=1800000000000;Date.now=()=>__competitionNow;let seed=19;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
      await page.goto(`http://127.0.0.1:${server.address().port}${route}`);await page.waitForFunction(()=>window.__competition?.app?.ticker?.started&&__competition.stream);
      await page.evaluate(()=>{const f=__competition;f.app.stop();f.model.seedCompetition('mixed',true);const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));if(name==='diagnostic')await page.locator('#probes').uncheck();
      assert.deepEqual(await page.evaluate(()=>[__competition.app.renderer.screen.width,__competition.app.renderer.screen.height]),[960,600]);
      await page.evaluate(()=>__competition.app.render());await page.locator('#view canvas').screenshot({path:path.join(out,name+'-four-vigor-fixture.png')});
      assert.deepEqual(await page.evaluate(()=>[...new Set(__competition.model.specimens.map(p=>p.vigor))].sort()),[0,1,2,3]);
      const emit=async(vigor,delta=0)=>page.evaluate(({vigor,delta})=>{__competitionNow+=delta;__competition.stream.dispatchEvent(new MessageEvent('garden',{
        data:JSON.stringify({specimenType:'flower',listenPort:80,vigor,sensor:'browser-test',seenCount:'18446744073709551615'})}));},{vigor,delta});
      await page.evaluate(()=>{const f=__competition,p=f.model.specimens[31];f.source=p;f.oldSprite=f.view.byId.get(p.id);f.selection=31.5/640;
        f.chance=PacketGardenCore.replacementChance(p,0,Date.now());f.roll=f.chance;});
      await emit(0);assert.equal(await page.evaluate(()=>__competition.model.counts.replacements),0);assert.equal(await page.evaluate(()=>__competition.calls),2);
      assert.equal(await page.evaluate(()=>__competition.model.competitionSnapshot().cooldownUntil),null);
      await page.evaluate(()=>__competition.roll=__competition.chance-1e-10);await emit(0);
      assert(await page.evaluate(()=>__competition.oldSprite.destroyed));assert.equal(await page.evaluate(()=>__competition.model.byCell.get(31).vigor),0);
      assert.equal(await page.evaluate(()=>__competition.model.counts.replacements),1);assert.equal(await page.evaluate(()=>__competition.model.counts.acceptedLive),1);
      assert.equal(await page.evaluate(()=>__competition.calls),4);
      for(let i=0;i<100;i++)await emit(i%4);assert.equal(await page.evaluate(()=>__competition.calls),4);
      await page.evaluate(()=>__competition.model.specimens[100].createdAt=Date.now()-PacketGardenCore.timings.broadleaf.expiredAfterMs+1000);
      await emit(2,1000);assert.equal(await page.evaluate(()=>__competition.calls),4);assert.equal(await page.evaluate(()=>__competition.model.counts.lifecycleRemovals),1);
      assert.equal(await page.evaluate(()=>__competition.model.specimens.length),640);
      await emit(0,13999);assert.equal(await page.evaluate(()=>__competition.calls),4);
      await page.evaluate(()=>{__competition.roll=0;__competition.selection=0;});await emit(3,1);
      assert.equal(await page.evaluate(()=>__competition.calls),6);assert.equal(await page.evaluate(()=>__competition.model.counts.replacements),2);
      const stats=await page.evaluate(()=>{const f=__competition;return{plants:f.model.specimens.length,unique:new Set(f.model.specimens.map(p=>p.cell)).size,
        calls:f.calls,accepted:f.model.counts.acceptedLive,replacements:f.model.counts.replacements,lifecycle:f.model.counts.lifecycleRemovals,
        chance:f.chance,seenCount:f.model.byCell.get(0).origin.seenCount,bakes:f.bakes,frames:f.view.snapshot().textures,score:document.querySelector('#garden-score').textContent};});
      assert.equal(stats.plants,640);assert.equal(stats.unique,640);assert.equal(stats.accepted,3);assert.equal(stats.chance,.82);assert.equal(stats.seenCount,'18446744073709551615');
      assert.equal(stats.bakes,5);assert.equal(stats.frames,832);assert.equal(stats.score,'Score: 0');report.push({page:name,...stats});
      await page.evaluate(()=>{const f=__competition;Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__competitionNow+=3600000;
        Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;f.app.stop();});
      assert.equal(await page.evaluate(()=>__competition.calls),6);assert.equal(await page.evaluate(()=>__competition.model.competitionSnapshot().remainingMs),0);
      if(name==='diagnostic'){
        const before=await page.evaluate(()=>JSON.stringify([__competition.model.counts.acceptedLive,__competition.model.recentEvents]));
        await page.locator('#competition-residents').selectOption('mixed');await page.locator('#competition-old').check();await page.locator('#seed-competition').click();
        await page.locator('#competition-incoming').selectOption('0');await page.locator('#try-competition').click();assert.match(await page.locator('#competition-status').textContent(),/15s cooldown/);
        await page.locator('#try-competition').click();assert.match(await page.locator('#competition-status').textContent(),/skipped during cooldown/);
        assert.equal(await page.evaluate(()=>JSON.stringify([__competition.model.counts.acceptedLive,__competition.model.recentEvents])),before);
      }else assert.equal(await page.locator('#seed-competition').count(),0);
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));assert.equal(await page.evaluate(()=>__competition.view.byId.size),0);await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2));
    console.log('PASS: both Chrome pages, four-vigor fixtures, exact 82% boundary, real SSE/drop/free-expiry/cooldown/provenance, 640 capacity, cached artwork unchanged, hidden no replay and diagnostic-only controls:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
