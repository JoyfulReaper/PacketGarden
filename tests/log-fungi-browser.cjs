if(!process.argv.includes('--run'))console.log('SKIP: fungal Chrome lifecycle/pixels; pass --run.');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),out=path.join(root,'artifacts/log-fungi');await fs.mkdir(out,{recursive:true});
  const capture=`{
    const f=window.__fungi={apps:0,streams:0,bakes:[],geometry:0,rolls:[],decisions:0,removed:[]};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenPixiLiveCore','model','createModel'],
      ['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenPixiEcology','ground','createEcologyView'],
      ['PacketGardenGnomes','gnomes','createModel'],['PacketGardenPixiGnomes','gnomeView','createGnomeView'],
      ['PacketGardenLogSnails','snails','createModel'],['PacketGardenPixiAmbient','snailView','createLogSnailView'],
      ['PacketGardenAmbient','ambient','createAmbientModel'],['PacketGardenFrogs','frogs','createModel'],
      ['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface']]){
      const create=window[global][method];window[global][method]=(...args)=>{
        if(key==='garden'){const change=args[0].onChange;args[0]={...args[0],fungalRandom:()=>{f.decisions++;return f.rolls.length?f.rolls.shift():0;},onChange:c=>{if(c.kind==='terrain-removed')f.removed.push({log:c.terrain,reason:c.reason});change(c);}};}
        if(key==='model'){f.view=args[0];args[1]={...args[1],random:()=>.5,competitionRandom:()=>.99,terrainRandom:()=>0,sporeRandom:()=>.9,bloomRandom:()=>.9};}
        if(key==='gnomes'||key==='snails')args[0]={...args[0],random:()=>.99,puddleRandom:()=>.99};
        const value=create(...args);f[key]??=value;return value;
      };
    }
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;f.apps++;return init.apply(this,args).then(value=>{
      const bake=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const t=bake(options);f.bakes.push({source:t.source,width:options.frame.width,height:options.frame.height,resolution:options.resolution});return t;};return value;
    });};
    for(const key of ['moveTo','poly','rect','circle']){const fn=PIXI.Graphics.prototype[key];PIXI.Graphics.prototype[key]=function(...args){f.geometry++;return fn.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(': fungal fixture transport, no telemetry\n\n');return;}
    if(file==='api/garden/visit'){res.writeHead(204);res.end();return;}
    if(file==='__fungi.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep))throw Error('path');
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__fungi.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],report={scenes:[],performance:[],resources:[],lifecycle:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__fungalNow=1800000000000;Date.now=()=>__fungalNow;});
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>window.__fungi?.app?.ticker?.started&&__fungi.snails);
      await page.evaluate(()=>{__fungi.app.stop();const v=document.querySelector('#view');v.style.width='960px';v.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const seed=options=>page.evaluate(({age=0,roll=0,count=1,mixed=false,dense=false,night=false}={})=>{
        const f=__fungi;f.gnomes.clear();f.snails.clear();f.ambient.clear();f.frogs.clear();f.ecology.clear();f.removed=[];
        f.rolls=Array.from({length:count},(_,i)=>mixed&&i%2?.99:roll);
        const entries=Array.from({length:count},(_,i)=>({type:'blackthorn',vigor:i%3,column:10+i*2,row:10,createdAt:Date.now()-age-720000,origin:{kind:'simulated',eventType:'log-fixture'}}));
        for(let cell=0,i=0;cell<640&&i<(dense?640-count:35);cell++)if(!entries.some(p=>p.row*32+p.column===cell)){
          entries.push({type:'broadleaf',vigor:cell%4,column:cell%32,row:Math.floor(cell/32),createdAt:Date.now()-65000,origin:{kind:'simulated',eventType:'fungal-fixture'}});i++;
        }
        f.garden.seed(entries,Date.now()-age-1);f.removed=[];f.garden.forceLogFixture();f.model.tick(Date.now());f.log=f.model.terrain.logs[0];
        f.view.setWeather({level:'quiet',eventsPerMinute:0});f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);f.app.render();
      },options??{});
      const jump=ms=>page.evaluate(ms=>{__fungalNow+=ms;__fungi.model.tick(Date.now());__fungi.app.render();},ms);
      const step=ms=>page.evaluate(ms=>{const f=__fungi,end=Date.now()+ms;while(Date.now()<end){__fungalNow=Math.min(end,Date.now()+250);f.model.tick(Date.now());f.snails.tick(Date.now());f.gnomes.tick(Date.now(),()=>.99);f.gnomeView.animate(Date.now());f.snailView.animate(Date.now());}f.app.render();},ms);
      const state=()=>page.evaluate(()=>{const f=__fungi;return{logs:f.model.terrain.logs.length,records:f.model.fungi.records.size,views:f.view.snapshot().fungalViews,stages:[...f.model.fungi.records.values()].map(r=>r.stage),removed:f.removed.map(r=>r.reason),score:document.querySelector('#garden-score').textContent,accepted:f.model.counts.acceptedLive,recent:f.model.recentEvents.length};});
      const shot=async scene=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{__fungi.app.render();resolve();})));const s=await state();assert.equal(s.score,'Score: 0');assert.equal(s.accepted,0);assert.equal(s.recent,0);report.scenes.push({page:name,scene,...s});await page.locator('#view').screenshot({path:path.join(out,`${name}-${scene}.png`)});};
      for(const roll of [.349999999,.35]){await seed({roll});await jump(600000);assert.equal((await state()).views,roll<.35?1:0);}
      await seed();await shot('original');await jump(599999);assert.equal((await state()).views,0);await jump(1);assert.deepEqual((await state()).stages,['early']);await shot('early');
      const original=await page.evaluateHandle(()=>__fungi.view.terrainViews.get(__fungi.log).fungi);
      await jump(600000);assert.deepEqual((await state()).stages,['mature']);assert(await page.evaluate(s=>s===__fungi.view.terrainViews.get(__fungi.log).fungi,original));await shot('mature');
      await jump(1200000);assert.deepEqual((await state()).stages,['weathered']);await shot('weathered');
      await jump(600000-1);assert.equal((await state()).logs,1);await jump(1);assert.deepEqual((await state()).removed,['fungal-decay']);assert.equal((await state()).views,0);
      assert(await page.evaluate(s=>s.destroyed,original));await shot('decomposed');await original.dispose();
      const occupancy=await page.evaluate(()=>{const f=__fungi,l=f.log;return{blocked:f.model.isCellOccupied(l.column,l.row),grassBefore:f.ecology.grassCells.length,created:!!f.ecology.influenceGrassCell(l.column,l.row,Date.now()),plant:f.model.byCell.has(l.cell)};});
      assert.deepEqual(occupancy,{blocked:false,grassBefore:0,created:true,plant:false});
      await seed({roll:.35});await jump(3599999);assert.equal((await state()).logs,1);await jump(1);assert.deepEqual((await state()).removed,['expired']);
      await seed({age:1200000,count:6,mixed:true});assert.equal((await state()).views,3);await shot('mixed');
      await seed({age:2400000,night:true});await shot('night');
      await page.evaluate(()=>{const f=__fungi;f.view.setWeather({level:'botnet_thunderstorm',eventsPerMinute:10000});f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,.3);f.app.render();});await shot('storm');
      await seed({age:1200000,count:6,dense:true});await shot('dense');
      await seed({age:1200000});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const v=document.querySelector('#view');v.style.width='';v.style.height='';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>__fungi.app.render());
      await page.screenshot({path:path.join(out,`${name}-mobile.png`)});report.scenes.push({page:name,scene:'mobile',...await state()});
      await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>{const v=document.querySelector('#view');v.style.width='960px';v.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await seed({age:1200000});assert(await page.evaluate(()=>__fungi.gnomes.startCampfire(Date.now(),()=>0)));await step(6000);await shot('campfire');await step(11000);
      assert.deepEqual((await state()).removed,['gnome-campfire']);assert.equal((await state()).views,0);
      await seed({age:3000000-12000});assert(await page.evaluate(()=>__fungi.gnomes.startCampfire(Date.now(),()=>0)));await step(12000);
      assert.deepEqual((await state()).removed,['fungal-decay']);assert(await page.evaluate(()=>__fungi.gnomes.incident===null));
      await seed({age:3000000-1000});assert(await page.evaluate(()=>!!__fungi.snails.spawnSimulated()));await step(1000);
      assert(await page.evaluate(()=>__fungi.snails.snails[0].source===null));await step(3000);assert.equal(await page.evaluate(()=>__fungi.snailView.views.size),0);
      for(const mode of ['map','list','replacement','retained-id','createdAt']){
        await seed({age:2400000});const valid=await page.evaluate(mode=>{const f=__fungi,l=f.log,r=f.model.fungi.records.get(l),t=f.model.terrain;
          if(mode==='map')t.byCell.delete(l.cell);if(mode==='list')t.logs.splice(0,1);if(mode==='replacement'){const other=Object.freeze({...l});t.logs.splice(0,1,other);t.byCell.set(l.cell,other);}
          if(mode==='retained-id')r.id++;if(mode==='createdAt')r.createdAt++;
          f.model.fungi.tick(l.createdAt+3000000);const result=f.removed.length===0&&f.model.fungi.records.size===0&&!f.view.terrainViews.get(l).fungi;
          // Repair adversarial collection corruption before resetting the fixture.
          t.logs.splice(0,t.logs.length,l);t.byCell.set(l.cell,l);t.remove(l,'fixture-repair');return result;
        },mode);assert(valid,mode);
      }
      await seed({age:2400000});const backwards=await page.evaluate(()=>{const f=__fungi,l=f.log,decisions=f.decisions;
        f.model.fungi.tick(NaN);if(f.model.fungi.records.get(l).stage!=='weathered')return false;
        __fungalNow=l.createdAt-1;f.model.tick(Date.now());return !f.view.terrainViews.get(l).fungi&&f.decisions===decisions&&f.model.terrain.logs.includes(l);
      });assert(backwards);await jump(600001);assert.equal((await state()).views,1);
      await seed();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__fungalNow+=3100000;Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
      assert.deepEqual((await state()).removed,['fungal-decay']);assert.equal((await state()).records,0);
      await seed();await jump(4000000);assert.deepEqual((await state()).removed,['expired']);
      report.lifecycle.push({page:name,chance:true,boundaries:true,identity:true,clock:true,campfire:true,snails:true,occupancy:true,resume:true});
      const cpu=[];
      for(const colonized of [false,true]){
        await seed({age:1200000,count:6,roll:colonized?0:.99,dense:true});
        cpu.push(await page.evaluate(colonized=>{const f=__fungi;const measure=(fn,n)=>{const a=[];for(let block=0;block<12;block++){const start=performance.now();for(let i=0;i<n;i++)fn();a.push((performance.now()-start)/n);}a.sort((x,y)=>x-y);return{medianMs:a[6],p95Ms:a[11]};};
          return{colonized,records:f.model.fungi.records.size,childSprites:f.view.snapshot().fungalViews,
            fungalLogical:measure(()=>f.model.fungi.tick(Date.now()),1000),animate:measure(()=>f.view.animate(1,.016,Date.now()),100),render:measure(()=>f.app.render(),5)};
        },colonized));
      }
      await seed({count:6});const stageCost=await page.evaluate(()=>{const f=__fungi,n=1000,at=Date.now();let total=0;
        for(let i=0;i<n;i++){f.model.fungi.tick(at);const start=performance.now();f.model.fungi.tick(at+600000);total+=performance.now()-start;}
        const createSixMs=total/n;total=0;
        for(let i=0;i<n;i++){f.model.fungi.tick(at+600000);const start=performance.now();f.model.fungi.tick(at+1200000);total+=performance.now()-start;}
        return{createSixMs,changeSixMs:total/n,samples:n};});
      report.performance.push({page:name,cpu,stageCost});
      await seed({age:1200000,count:6});const resources=await page.evaluate(()=>{const f=__fungi,bakes=f.bakes.length,geometry=f.geometry,owned=[];f.model.clear();
        const count=()=>{let n=0;const visit=o=>{n++;for(const c of o.children??[])visit(c);};visit(f.app.stage);return n;},before=count();
        for(let i=0;i<100;i++){f.model.seedFungi(1200000,true,6);owned.push(...[...f.view.terrainViews.values()].map(s=>s.fungi));f.model.clear();}
        const bake=f.bakes[1];return{apps:f.apps,streams:f.streams,bakes,bakesAfter:f.bakes.length,geometryDelta:f.geometry-geometry,objectsBefore:before,objectsAfter:count(),released:owned.every(s=>s.destroyed),spritesReleased:owned.length,
          frames:f.view.snapshot().textures,atlas:[bake.width,bake.height,bake.source.pixelWidth,bake.source.pixelHeight],sources:new Set(f.bakes.map(b=>b.source)).size,records:f.model.fungi.records.size};
      });
      assert.equal(resources.apps,1);assert.equal(resources.streams,1);assert.equal(resources.bakes,5);assert.equal(resources.bakesAfter,5);assert.equal(resources.geometryDelta,0);
      assert.equal(resources.objectsBefore,resources.objectsAfter);assert(resources.released);assert.equal(resources.records,0);assert.equal(resources.frames,841);assert.deepEqual(resources.atlas,[1024,864,2048,1728]);report.resources.push({page:name,...resources});
      if(name==='diagnostic'){
        for(const [id,views] of [['seed-log-fungi-none',0],['seed-log-fungi',0],['preview-log-fungi-early',1],['preview-log-fungi-mature',1],['preview-log-fungi-weathered',1]]){
          await page.locator('#'+id).click();assert.equal((await state()).views,views);
        }
        await page.locator('#decay-log-fungi').click();assert.equal((await state()).logs,0);await page.locator('#occupancy-log-fungi').click();assert.match(await page.locator('#log-fungi-status').textContent(),/actual grass true/);
        await page.locator('#burn-log-fungi').click();assert(await page.evaluate(()=>!!__fungi.gnomes.incident));await page.locator('#remove-log-fungi').click();assert(await page.evaluate(()=>!__fungi.gnomes.incident));
        await page.locator('#clear-log-fungi').click();assert.equal((await state()).records,0);
      }else assert.equal(await page.locator('#seed-log-fungi').count(),0);
      await seed({age:1200000,count:6});await page.evaluate(()=>{__fungi.owned=[...__fungi.view.terrainViews.values()].map(s=>s.fungi);dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));});
      assert(await page.evaluate(()=>__fungi.owned.every(s=>s.destroyed)&&!__fungi.model.fungi.records.size&&__fungi.bakes.every(b=>b.source.destroyed)));await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2));
    const scenes=['original','early','mature','weathered','mixed','campfire','decomposed','night','storm','mobile','dense'];
    await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Attached shelf fungi review</title><style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#e2d39b}figure{overflow:auto;margin:12px 0}summary{padding:12px;cursor:pointer}</style><h1>Attached shelf fungi</h1><p>Actual garden scale. Local simulated terrain; no fabricated telemetry. <a href="review.json">Timing and resource measurements</a></p>${['homepage','diagnostic'].map(name=>`<h2>${name}</h2>${scenes.map(scene=>`<details ${scene==='mature'?'open':''}><summary>${scene}</summary><figure><img src="${name}-${scene}.png" alt="${name} ${scene}"></figure></details>`).join('')}`).join('')}`);
    console.log('PASS: Chrome fungal lifecycle, real terrain/Sprite ownership, gnome and snail compatibility, identity and occupancy, clocks/resume, controls, pixels, cleanup and timings:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
