if(!process.argv.includes('--run'))console.log('SKIP: fallen-log Chrome review; pass --run.');
else run().catch(error=>{console.error(error);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
  const {chromium}=require('playwright'),root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),out=path.join(root,'artifacts/terrain-logs');
  await fs.mkdir(out,{recursive:true});
  const capture=`{
    const f=window.__logs={bakes:[],geometry:0,streams:0,terrainRoll:0};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenPixiLiveCore','model','createModel'],
      ['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenPixiEcology','ecologyView','createEcologyView'],
      ['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface'],['PacketGardenGnomes','gnomes','createModel']]){
      const create=window[global][method];window[global][method]=(...args)=>{
        if(key==='model'){f.view=args[0];args[1]={...args[1],competitionRandom:()=>.99,terrainRandom:()=>f.terrainRoll,sporeRandom:()=>.9};}
        if(key==='gnomes')args[0]={...args[0],random:()=>.99};
        const value=create(...args);f[key]??=value;return value;
      };
    }
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const bake=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const start=performance.now(),t=bake(options);
        f.bakes.push({width:options.frame.width,height:options.frame.height,ms:performance.now()-start,source:t.source});return t;};return value;
    });};
    for(const key of ['clear','moveTo','bezierCurveTo','circle','stroke','fill']){const fn=PIXI.Graphics.prototype[key];PIXI.Graphics.prototype[key]=function(...args){f.geometry++;return fn.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__logs.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__logs.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;const errors=[],report={scenes:[],resources:[],cpu:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__logsNow=1800000000000;Date.now=()=>__logsNow;let seed=137;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>window.__logs?.app?.ticker?.started&&__logs.ecology);
      await page.evaluate(()=>{__logs.app.stop();const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      if(name==='diagnostic')await page.locator('#probes').uncheck();
      assert.deepEqual(await page.evaluate(()=>[__logs.app.renderer.screen.width,__logs.app.renderer.screen.height]),[960,600]);
      const seed=async({grass=false,night=false,rain=false,dense=false,full=false,cap=false,variant=0}={})=>page.evaluate(options=>{
        const f=__logs,{grass,night,rain,dense,full,cap,variant}=options;f.gnomes.clear();f.model.clear();f.ecology.clear();f.terrainRoll=(variant+.5)*.1;
        const targets=cap?[330,332,334,336,338,340,342,344]:[336],used=new Set(targets);
        const entries=targets.map((cell,i)=>({type:'blackthorn',vigor:i%4,colorVariant:i%5,column:cell%32,row:Math.floor(cell/32),createdAt:Date.now()-718000,origin:{kind:'simulated',eventType:'log-fixture'}}));
        for(let cell=0;cell<640;cell++)if(!used.has(cell)&&(full||dense&&cell%3===0||!dense&&!full&&cell%32>=12&&cell%32<=20&&[8,12].includes(Math.floor(cell/32))))entries.push({
          type:['broadleaf','mushroom','wirefern','flower'][cell%4],vigor:2,colorVariant:cell%4,column:cell%32,row:Math.floor(cell/32),createdAt:Date.now()-65000,origin:{kind:'simulated',eventType:'log-fixture'}});
        const colors=entries.map(p=>p.colorVariant);f.garden.seed(entries);entries.forEach((p,i)=>{p.colorVariant=colors[i];f.view.update(p,f.model.byCell);});
        f.source=entries[0];f.cell=f.source.cell;f.originalSprite=f.view.byId.get(f.source.id);f.beforeCounts={...f.model.counts};f.recent=JSON.stringify(f.model.recentEvents);
        f.ecology.setAllowGrassUnderPlants(grass);
        if(grass)f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}))});
        f.ecology.resetCadence(Date.now());f.ecologyView.tick(Date.now());f.view.setWeather({level:rain?'rain':'quiet',eventsPerMinute:rain?1000:0});
        f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,rain?.07:0);f.app.render();
      },{grass,night,rain,dense,full,cap,variant});
      const jump=ms=>page.evaluate(ms=>{__logsNow+=ms;const f=__logs;f.model.tick(Date.now());f.ecology.tick(Date.now());f.ecologyView.tick(Date.now());f.view.animate(0,.016,Date.now());f.app.render();},ms);
      const shot=async scene=>{
        const state=await page.evaluate(()=>{const f=__logs;return{plants:f.model.specimens.length,blocked:f.model.terrain.logs.length,free:f.model.freeCellCount(),
          sourcePresent:f.model.specimens.includes(f.source),sourceView:f.view.byId.has(f.source.id),sourceCell:f.cell,
          logCell:f.model.terrain.byCell.has(f.cell),plantInSourceCell:f.model.byCell.has(f.cell),views:f.view.terrainViews.size,
          rainParticles:f.view.snapshot().particles,score:document.querySelector('#garden-score').textContent,
          accepted:f.model.counts.acceptedLive,recentStable:JSON.stringify(f.model.recentEvents)===f.recent};});
        assert.equal(state.accepted,0);assert.equal(state.score,'Score: 0');assert(state.recentStable);assert.equal(state.views,state.blocked);
        assert.equal(state.plants+state.blocked+state.free,640);if(scene==='rain')assert(state.rainParticles>0);
        await page.locator('#view canvas').screenshot({path:path.join(out,`${name}-${scene}.png`)});report.scenes.push({page:name,scene,...state});
      };
      await seed();await shot('01-before-expiry');await jump(2000);await shot('02-fallen-log');
      assert(await page.evaluate(()=>__logs.originalSprite.destroyed&&!__logs.model.byCell.has(__logs.cell)&&__logs.model.terrain.byCell.has(__logs.cell)));
      const original=await page.evaluate(()=>({expiresAt:__logs.model.terrain.logs[0].expiresAt,cell:__logs.cell}));
      await page.evaluate(()=>{const f=__logs,log=f.model.terrain.logs[0];f.source.createdAt++;f.source.cell++;f.source.type='flower';if(f.model.terrain.logs[0]!==log)throw Error('Source retained');});
      await jump(original.expiresAt-await page.evaluate(()=>Date.now())-1);assert.equal(await page.evaluate(()=>__logs.model.terrain.logs.length),1);
      await jump(1);await shot('03-decayed-free-cell');assert.equal(await page.evaluate(()=>__logs.model.terrain.logs.length),0);
      for(const [scene,options] of [['variant-0',{}],['variant-1',{variant:1}],['variant-2',{variant:2}],['night',{night:true,grass:true}],
        ['dense-grass',{grass:true}],['rain',{grass:true,rain:true}],['dense',{dense:true,grass:true}],['full-garden',{full:true,grass:true}],['six-log-cap',{cap:true,grass:true}]]){
        await seed(options);await jump(2000);await shot(scene);
      }
      assert.equal(await page.evaluate(()=>__logs.model.terrain.logs.length),6);assert.equal(await page.evaluate(()=>__logs.model.terrain.counts.capSkipped),2);
      await seed({grass:true});await jump(2000);
      await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='';el.style.height='';});await page.setViewportSize({width:390,height:844});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>__logs.app.render());await shot('mobile');
      await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>{const el=document.querySelector('#view');el.style.width='960px';el.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      // Actual production visibility path preserves active terrain, then reconciles its absolute expiry.
      await page.evaluate(()=>{const f=__logs;f.log=f.model.terrain.logs[0];f.logSprite=f.view.terrainViews.get(f.log);
        Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__logsNow+=60000;
        Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;f.app.stop();
        if(f.model.terrain.logs[0]!==f.log||f.view.terrainViews.get(f.log)!==f.logSprite)throw Error('Hidden log lost');});
      await page.evaluate(()=>{const f=__logs;Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__logsNow=f.log.expiresAt;
        Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;f.app.stop();
        if(f.model.terrain.logs.length||!f.logSprite.destroyed)throw Error('Overdue hidden log retained');});
      await seed({full:true});await jump(2000);
      const placement=await page.evaluate(()=>{const f=__logs,cell=f.cell,log=f.model.terrain.logs[0];
        for(const p of f.model.specimens)p.vigor=3;
        const failed=f.model.addSpecimen('flower',3,Date.now(),{kind:'simulated',eventType:'log-fixture'});
        if(failed||f.model.byCell.has(cell))throw Error('Blocked terrain admitted plant');
        f.model.terrain.tick(log.expiresAt);const result=f.model.addSpecimen('mushroom',0,Date.now(),{kind:'simulated',eventType:'log-fixture'});
        if(result?.specimen.cell!==cell)throw Error('Freed cell cannot regrow');return{blockedCell:cell,regrownCell:result.specimen.cell};});
      await shot('04-normal-regrowth');report.resources.push({page:name,placement});
      // Same 634 plants, zero versus six static terrain Sprites: animation, renderer submission and logical work.
      const cpu=[];
      for(const active of [0,6]){
        await seed({full:true,cap:true});
        await page.evaluate(active=>{const f=__logs;f.terrainRoll=active?0:.99;__logsNow+=2000;f.model.tick(Date.now());f.ecology.clear();
          while(f.model.specimens.length>634)f.model.remove(f.model.specimens.at(-1),'benchmark');
          while(f.model.specimens.length<634)f.model.addSpecimen('broadleaf',2,Date.now(),{kind:'simulated',eventType:'log-fixture'});f.app.render();},active);
        const timing=await page.evaluate(async()=>{const f=__logs,animate=[],submit=[],logical=[],geometry=f.geometry;
          for(let i=0;i<90;i++){await new Promise(resolve=>requestAnimationFrame(resolve));let start=performance.now();f.view.animate(i/60,.016,Date.now());animate.push(performance.now()-start);
            start=performance.now();f.app.render();submit.push(performance.now()-start);start=performance.now();f.model.tick(Date.now());logical.push(performance.now()-start);}
          if(geometry!==f.geometry)throw Error('Recurring terrain geometry');const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
          return{meanAnimateMs:mean(animate),meanSubmitMs:mean(submit),meanLogicalMs:mean(logical),logs:f.model.terrain.logs.length,plants:f.model.specimens.length};});
        assert.equal(timing.logs,active);assert.equal(timing.plants,634);cpu.push({active,...timing});
      }
      report.cpu.push({page:name,samples:cpu});
      await seed();
      const resources=await page.evaluate(()=>{const f=__logs;f.model.clear();const bakes=f.bakes.length,frames=f.view.snapshot().textures,geometry=f.geometry;
        for(let cycle=0;cycle<40;cycle++){f.model.seedLogs('cap');f.model.forceLogFixture();__logsNow+=2000;f.model.tick(Date.now());
          const sprites=[...f.view.terrainViews.values()];if(sprites.length!==6)throw Error('Log cap');f.model.clear();
          if(f.view.terrainViews.size||f.model.terrain.byCell.size||!sprites.every(s=>s.destroyed))throw Error('Log ownership');}
        return{bakes,bakesAfter:f.bakes.length,frames,streams:f.streams,geometryDelta:f.geometry-geometry,
          backing:[f.bakes[1].source.pixelWidth,f.bakes[1].source.pixelHeight],active:f.view.terrainViews.size};});
      assert.equal(resources.bakes,5);assert.equal(resources.bakesAfter,5);assert.equal(resources.frames,832);assert.equal(resources.streams,1);
      assert.equal(resources.geometryDelta,0);assert.equal(resources.active,0);assert.deepEqual(resources.backing,[2048,1664]);Object.assign(report.resources.at(-1),resources);
      if(name==='diagnostic'){
        await page.locator('#seed-logs-full').click();await page.locator('#force-log').click();await jump(2000);
        await page.locator('#test-log-growth').click();assert(await page.evaluate(()=>!__logs.model.byCell.has(__logs.model.terrain.logs[0].cell)));
        await page.locator('#decay-log-fixture').click();assert.equal(await page.evaluate(()=>__logs.model.terrain.logs.length),0);
      }else assert.equal(await page.locator('#force-log').count(),0);
      await seed();await jump(2000);await page.evaluate(()=>{__logs.lastSprites=[...__logs.view.terrainViews.values()];dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));});
      assert(await page.evaluate(()=>!__logs.model.terrain.logs.length&&!__logs.view.terrainViews.size&&__logs.lastSprites.every(s=>s.destroyed)&&__logs.bakes.every(b=>b.source.destroyed)));await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2));
    await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Fallen blackthorn logs</title>
      <style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#e2d39b}figure{margin:12px 0;overflow:auto}img{max-width:none}summary{cursor:pointer;padding:12px}</style>
      <h1>Fallen blackthorn logs</h1><p>Desktop garden captures are actual 960×600, without magnification. Standard target: column 16, row 10. Terrain blocks growth but is not a specimen. The hour-later soil scene reflects normal plant/grass expiry with no incoming traffic.</p><p><a href="review.json">State/resource/CPU checks</a></p>
      ${['homepage','diagnostic'].map(page=>`<h2>${page}</h2>${report.scenes.filter(s=>s.page===page).map(s=>`<details ${s.scene==='02-fallen-log'?'open':''}><summary>${s.scene} · plants ${s.plants} · blocked ${s.blocked} · free ${s.free}</summary><figure><img src="${page}-${s.scene}.png" alt="${s.scene}"></figure></details>`).join('')}`).join('')}`);
    console.log('PASS: actual 960x600 blackthorn/log/free-cell/regrowth, all variants/environments/full capacity, hidden absolute decay, no fake events, 80 six-log cleanup cycles, atlas and CPU:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
