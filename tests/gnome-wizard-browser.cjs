if(!process.argv.includes('--run'))console.log('SKIP: Wandering Wizard real Chrome checks; pass --run.');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),out=path.join(root,'artifacts/gnome-wizard');await fs.mkdir(out,{recursive:true});
  const capture=`{
    const f=window.__wizard={apps:0,streams:0,bakes:[],geometry:0,contexts:[],reduced:false,influences:[]};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenPixiLiveCore','model','createModel'],
      ['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenPixiEcology','ground','createEcologyView'],
      ['PacketGardenGnomes','gnomes','createModel'],['PacketGardenPixiGnomes','view','createGnomeView'],['PacketGardenPixiGnomes','cache','makeGnomeAtlas'],
      ['PacketGardenAmbient','ambient','createAmbientModel'],['PacketGardenFrogs','frogs','createModel'],['PacketGardenLogSnails','snails','createModel'],
      ['PacketGardenLighting','light','createModel'],['PacketGardenLightingView','surface','createSurface']]){
      const create=window[global][method];window[global][method]=(...args)=>{
        if(key==='model'){f.gardenView=args[0];args[1]={...args[1],random:()=>.5,competitionRandom:()=>.99,sporeRandom:()=>.9,bloomRandom:()=>.9};}
        if(key==='gnomes'){const reduced=args[0].getReducedMotion;args[0]={...args[0],random:()=>.99,puddleRandom:()=>.99,getReducedMotion:()=>f.reduced||reduced()};}
        if(key==='view'){const reduced=args[3];args[3]=()=>f.reduced||reduced();}
        const value=create(...args);f[key]??=value;
        if(key==='ecology'){const influence=value.influenceGrassCell;value.influenceGrassCell=(column,row,at)=>{f.influences.push({column,row,at});return influence(column,row,at);};}
        return value;
      };
    }
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;f.apps++;return init.apply(this,args).then(value=>{
      const bake=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const t=bake(options);f.bakes.push({source:t.source,width:options.frame.width,height:options.frame.height});return t;};return value;
    });};
    const Graphics=PIXI.Graphics;PIXI.Graphics=class extends Graphics{constructor(...args){super(...args);f.contexts.push(this.context);}};
    for(const key of ['moveTo','poly','rect','circle','stroke']){const fn=Graphics.prototype[key];Graphics.prototype[key]=function(...args){f.geometry++;return fn.apply(this,args);};}
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(': local wizard fixtures, no network events\n\n');return;}
    if(file==='api/garden/visit'||file==='favicon.ico'){res.writeHead(204);res.end();return;}
    if(file==='__wizard.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep))throw Error('path');
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__wizard.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],report={scenes:[],checks:[],resources:[],performance:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,url] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__wizardNow=1800000000000;Date.now=()=>__wizardNow;});
      await page.goto(`http://127.0.0.1:${server.address().port}${url}`);await page.waitForFunction(()=>window.__wizard?.app?.ticker?.started&&__wizard.snails);
      await page.evaluate(()=>{__wizard.app.stop();const v=document.querySelector('#view');v.style.width='960px';v.style.height='600px';});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const seed=options=>page.evaluate(({several=false,night=false,reduced=false,grass=false}={})=>{
        const f=__wizard;f.gnomes.clear();f.snails.clear();f.ambient.clear();f.frogs.clear();f.ecology.clear();f.reduced=reduced;f.ecology.setAllowGrassUnderPlants(false);
        f.target=f.model.seedWizard(several);f.gnomes.resetCadence();if(grass)f.ecology.influenceGrassCell(15,9,Date.now()-65000);
        f.influences=[];f.before=JSON.stringify(f.model.specimens);f.counts=JSON.stringify([f.model.counts,f.model.recentEvents]);f.art=f.gardenView.byId.get(f.target.id).texture;
        f.gardenView.setWeather({level:'quiet',eventsPerMinute:0});f.light.setMode(night?'night':'day');f.light.tick(Date.now(),{force:true});f.surface.apply(f.light.state,0);f.app.render();
      },options??{});
      const start=()=>page.evaluate(()=>{const f=__wizard;if(!f.gnomes.startWizard(Date.now(),()=>0,true))throw Error('No wizard');f.current=f.gnomes.incident;f.selected=f.current.grass?{column:f.current.grass.column,row:f.current.grass.row}:null;f.view.animate(Date.now());f.app.render();});
      const step=ms=>page.evaluate(ms=>{const f=__wizard,end=Date.now()+ms;while(Date.now()<end){__wizardNow=Math.min(end,Date.now()+250);f.model.tick(Date.now());f.gnomes.tick(Date.now(),()=>.99);f.ground.tick(Date.now());f.view.animate(Date.now());}f.app.render();},ms);
      const state=()=>page.evaluate(()=>{const f=__wizard,c=f.gnomes.incident;return{phase:c?.phase??'idle',actors:f.gnomes.actors.length,spells:f.view.spells.length,attempted:c?.attempted??false,influenced:c?.influenced??false,influences:f.influences.length,grass:f.ecology.grassCells.length,
        traitsStable:JSON.stringify(f.model.specimens)===f.before,artStable:f.gardenView.byId.get(f.target.id)?.texture===f.art,countsStable:JSON.stringify([f.model.counts,f.model.recentEvents])===f.counts,score:document.querySelector('#garden-score').textContent};});
      const shot=async(scene,changed=false)=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{__wizard.app.render();resolve();})));const s=await state();assert(s.countsStable);assert.equal(s.score,'Score: 0');if(!changed){assert(s.traitsStable);assert(s.artStable);}report.scenes.push({page:name,scene,...s});await page.locator('#view').screenshot({path:path.join(out,`${name}-${scene}.png`)});};
      const click=async point=>{const p=await page.evaluate(point=>{const f=__wizard,root=f.gardenView.root,r=f.app.canvas.getBoundingClientRect(),screen=f.app.renderer.screen;return{x:r.left+(root.position.x+point.x*root.scale.x)*r.width/screen.width,y:r.top+(root.position.y+point.y*root.scale.y)*r.height/screen.height};},point);await page.mouse.click(p.x,p.y);};
      for(const [roll,expected] of [[.249999,'gnome_wizard'],[.25,'gnome_incident']]){
        await seed();const actual=await page.evaluate(roll=>{const f=__wizard;__wizardNow+=45000;let i=0;f.gnomes.tick(Date.now(),()=>[.019999,roll,roll<.25?0:.5,0,.5][i++]??.5);return f.gnomes.incident.type;},roll);assert.equal(actual,expected);
      }
      await seed();await start();await step(1000);await shot('arrival');await step(2000);await shot('inspecting');await step(1000);await shot('staff-raised');await step(1000);await shot('casting');
      assert.equal((await state()).influences,1);assert.equal((await state()).spells,2);
      const ownership=await page.evaluate(()=>{const f=__wizard,g=f.selected;return{actual:!!f.ecology.grassCells.find(p=>p.column===g.column&&p.row===g.row),view:f.ground.grassViews.has(g.row*32+g.column)};});assert(ownership.actual&&ownership.view);
      await step(3500);assert.equal((await state()).spells,0);await shot('resulting-grass');await step(5500);assert.equal((await state()).actors,0);
      await page.evaluate(()=>{__wizardNow+=60000;__wizard.model.tick(Date.now());__wizard.ground.tick(Date.now());__wizard.app.render();});await shot('established-grass');assert.equal((await state()).influences,1);
      await seed({grass:true});await start();const refresh=await page.evaluate(()=>{__wizard.patch=__wizard.gnomes.incident.grass.patch;return __wizard.patch.createdAt;});await step(5000);
      assert(await page.evaluate(created=>__wizard.ecology.grassCells.includes(__wizard.patch)&&__wizard.patch.createdAt===created&&__wizard.patch.lastInfluencedAt===Date.now(),refresh));assert.equal((await state()).influences,1);
      for(const action of ['missing','replaced','new','blocked','disallowed']){
        await seed({grass:action!=='new'});await start();await page.evaluate(action=>{const f=__wizard,g=f.gnomes.incident.grass;
          if(action==='missing'||action==='replaced'){f.ecology.removeGrassCell(g.column,g.row);if(action==='replaced')f.ecology.influenceGrassCell(g.column,g.row,Date.now());}
          if(action==='new')f.ecology.influenceGrassCell(g.column,g.row,Date.now());
          if(action==='blocked'||action==='disallowed'){if(action==='disallowed')f.ecology.setAllowGrassUnderPlants(true);while(!f.model.isCellOccupied(g.column,g.row))if(!f.model.addSpecimen('broadleaf',0,Date.now(),{kind:'simulated'}))throw Error('No blocking placement');f.ecology.setAllowGrassUnderPlants(false);}
          f.influences=[];
        },action);await step(5000);assert.equal((await state()).influences,0,action);assert((await state()).attempted);assert.equal((await state()).spells,2);await step(8000);assert.equal((await state()).influences,0);
      }
      for(const field of ['id','type','cell','column','row','createdAt']){
        await seed();await start();assert(await page.evaluate(field=>{const f=__wizard,c=f.current;c.target[field]=field==='type'?'blackthorn':c.target[field]+1;f.gnomes.tick(Date.now(),()=>.99);return !f.gnomes.incident&&!c.target&&!c.grass&&!c.ecology&&!f.view.views.size;},field));
      }
      await seed();await start();await step(3000);await page.evaluate(()=>__wizard.model.remove(__wizard.target,'simulated-wizard-removal'));await shot('target-missing',true);assert.equal((await state()).actors,0);assert.equal((await state()).influences,0);
      await seed();await start();assert(await page.evaluate(()=>{const f=__wizard,p=f.model.replaceWizardFixture(f.target);return p&&p.cell===f.target.cell&&p.id!==f.target.id&&!f.gnomes.incident&&!f.current.target;}));await step(5000);assert.equal((await state()).influences,0);
      await seed();await start();assert(await page.evaluate(()=>{const f=__wizard;__wizardNow+=PacketGardenCore.timings.ghostbloom.expiredAfterMs;f.model.tick(Date.now());return !f.model.specimens.includes(f.target)&&!f.gnomes.incident&&!f.current.target&&!f.current.grass&&!f.current.ecology&&!f.influences.length;}));
      for(const mode of ['hidden','stalled','render-stalled','backwards']){
        await seed();await start();await step(4000);assert(await page.evaluate(mode=>{const f=__wizard,c=f.current;
          if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));__wizardNow+=10000;Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));}
          else{__wizardNow+=mode==='backwards'?-1:1501;if(mode==='render-stalled')f.gnomes.advance(Date.now());else f.gnomes.tick(Date.now(),()=>.99);}
          return !f.gnomes.incident&&!c.target&&!c.grass&&!c.ecology&&!f.influences.length&&!f.view.spells.length;
        },mode));
      }
      await seed();await start();await step(3500);const pose=await page.evaluate(()=>{const a=__wizard.gnomes.actors[0],s=__wizard.view.views.get(a);return{x:s.x,y:s.y};});
      await click(pose);await click(pose);assert.equal(await page.evaluate(()=>__wizard.ambient.drops.filter(d=>d.type==='gnome_underpants').length),1);assert(await page.locator('#collection-message').isHidden());
      await click(await page.evaluate(()=>({x:(__wizard.target.column+.5)*30,y:(__wizard.target.row+.5)*30})));assert(await page.locator('#specimen-card').isVisible());await page.locator('#specimen-card-close').click();
      for(const [scene,options] of [['night',{night:true}],['reduced-motion',{reduced:true}],['several-targets',{several:true}]]){
        await seed(options);await start();await step(5500);await shot(scene);
        if(options.reduced)assert(await page.evaluate(()=>{const f=__wizard,s=f.view.views.values().next().value,pose=()=>JSON.stringify([s.texture.frame.x,s.x,s.y,s.rotation,...f.view.spells.map(p=>[p.x,p.y,p.alpha])]);const before=pose();for(let i=0;i<30;i++){f.gnomes.advance(Date.now()+i*10);f.view.animate(Date.now()+i*10);}return pose()===before;}));
      }
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const v=document.querySelector('#view');v.style.width='';v.style.height='';});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await seed();await start();await step(5500);await page.locator('#view').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`${name}-mobile.png`)});report.scenes.push({page:name,scene:'mobile',...await state()});
      await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>{const v=document.querySelector('#view');v.style.width='960px';v.style.height='600px';});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const samples=[];
      for(const active of [false,true]){await seed();if(active){await start();await step(5500);}samples.push(await page.evaluate(active=>{const f=__wizard,measure=(fn,n)=>{const values=[];for(let block=0;block<12;block++){const start=performance.now();for(let i=0;i<n;i++)fn();values.push((performance.now()-start)/n);}values.sort((a,b)=>a-b);return{medianMs:values[6],p95Ms:values[11]};};return{active,views:f.view.views.size,spells:f.view.spells.length,animate:measure(()=>f.view.animate(Date.now()),1000),advanceAndAnimate:measure(()=>{f.gnomes.advance(Date.now());f.view.animate(Date.now());},1000),logical:measure(()=>f.gnomes.tick(Date.now(),()=>.99),1000),renderSubmit:measure(()=>f.app.render(),20)};},active));}
      report.performance.push({page:name,samples});
      await seed();const resources=await page.evaluate(()=>{const f=__wizard,bakes=f.bakes.length,geometry=f.geometry,contexts=f.contexts.length,owned=[];f.model.clear();f.ecology.clear();
        const count=()=>{let n=0;const visit=o=>{n++;for(const c of o.children??[])visit(c);};visit(f.app.stage);return n;},before=count();
        for(let cycle=0;cycle<100;cycle++){
          f.model.seedWizard();f.gnomes.startWizard(Date.now()-5000,()=>0,true);f.gnomes.tick(Date.now()-4000,()=>.99);f.gnomes.tick(Date.now()-3000,()=>.99);f.gnomes.tick(Date.now()-2000,()=>.99);f.gnomes.tick(Date.now()-1000,()=>.99);f.gnomes.tick(Date.now(),()=>.99);f.view.animate(Date.now());
          owned.push(...f.view.views.values(),...f.view.spells);f.gnomes.clear();f.model.clear();f.ecology.clear();
        }
        return{apps:f.apps,streams:f.streams,bakes,bakesAfter:f.bakes.length,geometryDelta:f.geometry-geometry,contextsDelta:f.contexts.length-contexts,objectsBefore:before,objectsAfter:count(),released:owned.every(s=>s.destroyed),spritesReleased:owned.length,frames:f.cache.frames.size,
          backing:[f.cache.atlas.source.pixelWidth,f.cache.atlas.source.pixelHeight],sources:new Set([...f.cache.frames.values()].map(t=>t.source)).size,views:f.view.views.size,spells:f.view.spells.length};
      });
      console.log('Wizard resource measurements:',JSON.stringify(resources));
      assert.equal(resources.apps,1);assert.equal(resources.streams,1);assert.equal(resources.bakes,5);assert.equal(resources.bakesAfter,5);assert.equal(resources.geometryDelta,0);assert.equal(resources.contextsDelta,0);assert.equal(resources.objectsBefore,resources.objectsAfter);assert(resources.released);assert.equal(resources.spritesReleased,300);assert.equal(resources.frames,39);assert.deepEqual(resources.backing,[3120,64]);assert.equal(resources.sources,1);report.resources.push({page:name,...resources});
      if(name==='diagnostic'){
        await page.locator('#seed-wizard').click();await page.evaluate(()=>{__wizard.influences=[];});await page.locator('#trigger-wizard').click();assert.equal((await state()).actors,1);await page.locator('#block-wizard-grass').click();await step(5000);assert.equal((await state()).influences,0);
        await page.locator('#preview-wizard-cast').click();assert.equal((await state()).spells,2);await page.locator('#inspect-wizard-grass').click();assert.match(await page.locator('#wizard-status').textContent(),/actual patch/);
        for(const id of ['remove-wizard-target','replace-wizard-target','cancel-wizard-hidden','cancel-wizard-stalled']){await page.locator('#seed-wizard').click();await page.locator('#trigger-wizard').click();await page.locator('#'+id).click();assert.equal((await state()).actors,0);}
        await page.locator('#seed-wizards').click();assert.equal(await page.evaluate(()=>__wizard.gnomes.wizardCandidates().length),4);await page.locator('#wizard-reduced-motion').check();await page.locator('#clear-wizard').click();assert.equal((await state()).actors,0);
      }else assert.equal(await page.locator('#trigger-wizard').count(),0);
      report.checks.push({page:name,odds:true,grass:true,identity:true,cancellation:true,underpants:true,inspection:true,reduced:true,diagnostics:name==='diagnostic'});
      await seed();await start();await step(5500);await page.evaluate(()=>{const f=__wizard;f.owned=[...f.view.views.values(),...f.view.spells];dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));});
      assert(await page.evaluate(()=>!__wizard.gnomes.incident&&!__wizard.current.target&&!__wizard.current.grass&&!__wizard.current.ecology&&__wizard.owned.every(s=>s.destroyed)&&__wizard.bakes.every(t=>t.source.destroyed)));await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2));
    const scenes=['arrival','inspecting','staff-raised','casting','resulting-grass','established-grass','target-missing','night','reduced-motion','several-targets','mobile'];
    await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Wandering Wizard Gnome</title><style>body{font:16px system-ui;background:#182219;color:#eee;margin:24px}a{color:#d4c9ed}figure{overflow:auto;margin:12px 0}summary{padding:12px;cursor:pointer}</style><h1>Wandering Wizard Gnome</h1><p>Actual 960×600 garden scale. Local simulated fixtures. <a href="review.json">Measurements and assertions</a></p>${['homepage','diagnostic'].map(name=>`<h2>${name}</h2>${scenes.map(scene=>`<details ${scene==='casting'?'open':''}><summary>${scene}</summary><figure><img src="${name}-${scene}.png" alt="${name} ${scene}"></figure></details>`).join('')}`).join('')}`);
    console.log('PASS: real Chrome wizard lifecycle, exact protected identity and artwork, one authoritative grass influence/refresh, stale/blocked skips, clocks/hidden/callback cleanup, native underpants and separate rare inspection, reduced motion, diagnostics and bounded resources:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
