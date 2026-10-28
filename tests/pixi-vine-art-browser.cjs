// Current Pixi artwork/connection stress. Historical Canvas comparisons are retired.
if(!process.argv.includes('--run'))console.log('SKIP: current Pixi artwork Chrome regression; pass --run.');
else run().catch(error=>{console.error(error);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
  const {chromium}=require('playwright'),root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot');
  const output=path.join(root,'artifacts/retire-canvas/artwork');await fs.mkdir(output,{recursive:true});
  const seconds=Number(process.argv.find(a=>a.startsWith('--seconds='))?.slice(10)??5);assert(seconds>=5&&seconds<=60);
  const capture=`{
    const f=window.__art={bakes:[],geometry:0};
    const create=PacketGardenCore.createGardenModel;PacketGardenCore.createGardenModel=(...args)=>{const m=create(...args);f.garden??=m;return m;};
    const model=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(...args)=>{f.view=args[0];return f.model=model(...args);};
    const ecology=PacketGardenEcology.createEcologyModel;PacketGardenEcology.createEcologyModel=(...args)=>(f.ecology=ecology(...args));
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(result=>{
      const generate=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const texture=generate(options);f.bakes.push(texture.source);return texture;};return result;});};
    for(const name of ['clear','moveTo','bezierCurveTo','fill','stroke']){const original=PIXI.Graphics.prototype[name];PIXI.Graphics.prototype[name]=function(...args){f.geometry++;return original.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__art.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__art.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch{res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],report=[];
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});
    const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.stack));
    await page.addInitScript(()=>{window.__artNow=1800000000000;Date.now=()=>__artNow;});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.__art?.app?.ticker?.started&&__art.ecology);await page.evaluate(()=>__art.app.stop());
    for(const scene of ['broadleaf','vine','mixed','hurricane']){
      await page.evaluate(scene=>{
        const f=__art,at=Date.now();f.garden.clear();f.ecology.clear();f.ecology.setAllowGrassUnderPlants(true);
        const types=PacketGardenCore.eventSpecies;
        f.garden.seed(Array.from({length:640},(_,i)=>{const type=['mixed','hurricane'].includes(scene)?types[i%types.length]:scene;
          return {type,column:i%32,row:Math.floor(i/32),vigor:i%4,colorVariant:i%5,createdAt:at-(type==='redbloom'?3000:65000),
            broadleafBloom:type==='broadleaf'?{color:i%5,arrangement:i%3}:null,vineBloom:type==='vine'?{color:i%4,layout:i%2}:null,
            origin:{kind:'simulated',eventType:'artwork-regression'}};}));
        f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:at-60000,lastInfluencedAt:at}))});
        f.ecology.resetCadence(at);f.view.setWeather({level:scene==='hurricane'?'botnet_hurricane':'quiet',eventsPerMinute:scene==='hurricane'?10000:0});
        f.geometry=0;
      },scene);
      const data=await page.evaluate(async seconds=>{
        const f=__art,bakes=f.bakes.length,times=[],start=performance.now();
        while(performance.now()-start<seconds*1000){await new Promise(resolve=>requestAnimationFrame(resolve));const at=performance.now();f.view.animate(at/1000,1/60,Date.now());f.app.render();times.push(performance.now()-at);}
        if(f.geometry!==0||f.bakes.length!==bakes)throw Error('Recurring artwork/texture generation');
        return {...f.view.snapshot(),grass:f.ecology.grassCells.length,plants:f.garden.specimens.length,bakes,frames:times.length,
          meanSubmitMs:times.reduce((a,b)=>a+b,0)/times.length,accepted:f.model.counts.acceptedLive};
      },seconds);
      assert.equal(data.plants,640);assert.equal(data.grass,640);assert.equal(data.contactShadows,640);assert.equal(data.bakes,5);assert.equal(data.textures,832);assert.equal(data.accepted,0);
      assert.equal(data.particles,scene==='hurricane'?400:0);if(scene==='vine')assert(data.connectionHalves>0);
      if(scene==='broadleaf')assert.equal(data.bloomViews,640);if(scene==='vine')assert.equal(data.vineBloomViews,640);
      await page.locator('#view canvas').screenshot({path:path.join(output,scene+'.png')});report.push({scene,...data});
    }
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__artNow+=720001;
      Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__art.app.stop();});
    assert.equal(await page.evaluate(()=>__art.view.byId.size),0);assert.equal(await page.evaluate(()=>__art.view.snapshot().contactShadows),0);
    await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));assert.equal(await page.evaluate(()=>__art.bakes.every(s=>s.destroyed)),true);
    await page.close();assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2));
    console.log('PASS: current Pixi full broadleaf/vine/mixed/hurricane artwork, blooms/connections/640 shadows, no recurring geometry/textures, hidden expiry and source cleanup.');
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
