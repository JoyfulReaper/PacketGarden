// Optional real Chrome review; uses existing bundled Playwright, no project dependencies.
// node tests/grass-under-plants-browser.cjs --run [--baseline]
if (!process.argv.includes('--run')) console.log('SKIP: grass under plants Chrome review; pass --run with Playwright/Chrome available.');
else run().catch(error=>{console.error(error);process.exitCode=1;});
async function run() {
  const assert=require('node:assert/strict'), http=require('node:http'), fs=require('node:fs/promises');
  const path=require('node:path'), {execFileSync}=require('node:child_process'), {chromium}=require('playwright');
  const baseline=process.argv.includes('--baseline'), root=path.resolve(__dirname,'..'), assets=path.join(root,'wwwroot');
  const output=path.join(root,'artifacts/grass-under-plants',baseline?'before':'after');await fs.mkdir(output,{recursive:true});
  const checkpoint=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(), old=new Map();
  if(baseline)for(const name of ['index.html','pixi-live.html','garden-ecology.js','pixi-live.js'])
    old.set(name,execFileSync('git',['show',`${checkpoint}:wwwroot/${name}`],{cwd:root}));
  const capture=`{
    const f=window.__under={bakes:0,geometry:0};
    for(const [api,key] of [[PacketGardenCore,'garden'],[PacketGardenEcology,'ecology']]){
      const name=key==='garden'?'createGardenModel':'createEcologyModel', create=api[name];
      api[name]=(...args)=>{const model=create(...args);f[key]??=model;return model;};
    }
    if(window.PIXI){
      const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
        const generate=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=(...args)=>{f.bakes++;return generate(...args);};return value;
      });};
      for(const name of ['moveTo','quadraticCurveTo','fill']){const original=PIXI.Graphics.prototype[name];
        PIXI.Graphics.prototype[name]=function(...args){f.geometry++;return original.apply(this,args);};}
    }
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__under.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=old.get(file)??await fs.readFile(absolute);
    if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="(?:garden|pixi-live)\.js(?:\?[^"]*)?" defer)/,'<script src="/__under.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(error){res.writeHead(404);res.end(String(error));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const errors=[],report={baseline,checkpoint,scenes:[],resources:[],mobile:[]};
  try {
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});
    report.browser=browser.version();
    for(const [name,url,pixi] of [['homepage','/',true],['diagnostic','/pixi-live.html',true]]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});
      page.on('pageerror',error=>errors.push(error.stack));
      await page.addInitScript(()=>{
        window.__underNow=1800000000000;Date.now=()=>__underNow;let seed=19;
        Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        window.__underTimers=0;const interval=window.setInterval;window.setInterval=(...args)=>{__underTimers++;return interval(...args);};

      });
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);
      await page.waitForFunction(pixi=>window.__under?.ecology && (!pixi || __under.app?.ticker?.started),pixi);
      await page.evaluate(()=>__under.app.stop());
      if(name==='diagnostic')await page.locator('#probes').uncheck();
      await page.getByLabel('Day/night cycle',{exact:true}).uncheck();
      const checkbox=page.getByRole('checkbox',{name:'Allow grass under plants',exact:true});
      if(!baseline){assert.equal(await checkbox.isChecked(),false);assert.equal(await page.evaluate(()=>__under.ecology.allowGrassUnderPlants),false);}
      const paint=()=>page.evaluate(pixi=>{
        {
          window.__underFrame=(window.__underFrame??performance.now())+1000;
          __under.app.ticker.update(__underFrame);__under.app.render();
        }
      },pixi);
      const counts=()=>page.evaluate(()=>({plants:__under.garden.byCell.size,grass:__under.ecology.grassCells.length,
        unique:new Set(__under.ecology.grassCells.map(g=>g.row*32+g.column)).size}));
      for(const [scene,amount] of [['mixed',96],['dense',640]]){
        if(!baseline)await checkbox.uncheck();
        await page.evaluate(amount=>{
          const f=__under, at=Date.now(),types=['flower','mushroom','broadleaf','vine','wirefern','weed'];
          f.garden.clear();f.ecology.clear();f.ecology.resetCadence(at);
          f.garden.seed(Array.from({length:amount},(_,i)=>({type:types[i%types.length],column:amount===640?i%32:2+(i%24),
            row:amount===640?Math.floor(i/32):2+Math.floor(i/24)*4,createdAt:at-65000,vigor:i%4,colorVariant:0,
            origin:{kind:'simulated',eventType:'grass-under-plants-review'}})));
          f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:at-60000,lastInfluencedAt:at}))});
        },amount);
        await paint();const off=await counts();assert.equal(off.plants,amount);assert.equal(off.grass,640-amount);
        await page.screenshot({path:path.join(output,`${name}-${scene}-off.png`),fullPage:true});
        report.scenes.push({page:name,scene,enabled:false,...off});
        if(baseline)continue;
        const state=await page.evaluate(()=>JSON.stringify(__under.garden.specimens));
        await checkbox.check();assert.deepEqual(await counts(),off,'ON does not fill cells');
        // Coverage fixture is explicit; the Node suite separately proves natural establishment.
        await page.evaluate(()=>__under.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}))}));
        await paint();const on=await counts();assert.equal(on.grass,640);assert.equal(on.unique,640);
        assert.equal(await page.evaluate(()=>JSON.stringify(__under.garden.specimens)),state);
        await page.screenshot({path:path.join(output,`${name}-${scene}-on.png`),fullPage:true});
        const surface=page.locator('#view canvas');
        await surface.screenshot({path:path.join(output,`${name}-${scene}-on-garden.png`)});
        report.scenes.push({page:name,scene,enabled:true,...on});
        const resources=await page.evaluate(()=>({bakes:__under.bakes,geometry:__under.geometry,paths:__underPaths,timers:__underTimers}));
        for(let i=0;i<5;i++){await checkbox.uncheck();assert.deepEqual(await counts(),off);await checkbox.check();}
        assert.deepEqual(await page.evaluate(()=>({bakes:__under.bakes,geometry:__under.geometry,paths:__underPaths,timers:__underTimers})),resources);
        report.resources.push({page:name,scene,...resources,maxGrassSprites:pixi?640:0});
        // Empty the lawn: hidden ticks do not reseed, visible maintenance resumes normally.
        await page.evaluate(()=>{__under.ecology.clearGrass();__under.ecology.tick(Date.now()+60000,{hidden:true});});
        assert.equal((await counts()).grass,0);
        await page.evaluate(()=>__under.ecology.tick(Date.now()+120000));assert.equal((await counts()).grass,3);
      }
      if(!baseline){
        await page.setViewportSize({width:390,height:844});await paint();
        // The test stops Pixi's ticker; let its existing ResizeObserver resize
        // the framebuffer before submitting the screenshot's single frame.
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await paint();
        await checkbox.scrollIntoViewIfNeeded();
        assert(await checkbox.isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile has no horizontal overflow');
        await checkbox.focus();await page.keyboard.press('Space');assert.equal(await checkbox.isChecked(),false);
        await page.keyboard.press('Space');assert.equal(await checkbox.isChecked(),true);
        await page.evaluate(()=>scrollTo(0,0));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await paint();
        report.mobile.push({page:name,...await page.evaluate(()=>({scrollY,
          header:document.querySelector('header').getBoundingClientRect().toJSON(),
          checkbox:document.querySelector('#allow-grass-under-plants').getBoundingClientRect().toJSON()}))});
        await page.screenshot({path:path.join(output,`${name}-mobile.png`),fullPage:true});
        await page.reload();await page.waitForFunction(()=>window.__under?.ecology);
        assert.equal(await checkbox.isChecked(),false);assert.equal(await page.evaluate(()=>__under.ecology.allowGrassUnderPlants),false);
      }
      await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2));
    console.log('PASS: Chrome grass under plants screenshots, 96/640 mixed plants, shared occupancy/640 unique grass, session reset, keyboard/mobile, hidden maintenance and stable caches/timers:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
