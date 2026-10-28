// Native Pixi 8.22 / same WebGL renderer; frozen before-card and current-art review.
if(!process.argv.includes('--run'))console.log('SKIP: specimen preview Chrome review; pass --run [--baseline].');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),baseline=process.argv.includes('--baseline'),out=path.join(root,'artifacts/specimen-preview',baseline?'before':'after');await fs.mkdir(out,{recursive:true});
  const old=new Map();if(baseline)for(const file of ['index.html','pixi-live.html','garden-ui.css','pixi-live-ui.js','pixi-live.js'])old.set(file,execFileSync('git',['show',`84693b8:wwwroot/${file}`],{cwd:root}));
  const capture=`{
    const f=window.__preview={apps:0,streams:0,bakes:[],outputs:[],targets:[],copies:[],extractMs:[],renderMs:[],maxCopySprites:0,delay:false,pending:[]};
    const Source=EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.streams++;}};
    for(const [global,key,method] of [['PacketGardenCore','garden','createGardenModel'],['PacketGardenPixiLiveCore','model','createModel'],
      ['PacketGardenEcology','ecology','createEcologyModel'],['PacketGardenPixiUi','ui','createUi'],['PacketGardenWirefernSpores','emissions','createEmissionModel']]){
      const create=window[global][method];window[global][method]=(...args)=>{if(key==='model'){f.view=args[0];args[1]={...args[1],competitionRandom:()=>f.competitionRoll??.99,terrainRandom:()=>.99,sporeRandom:()=>.9,poppyRandom:()=>.99};}
        const result=create(...args);f[key]??=result;return result;};
    }
    if(window.PacketGardenSpecimenPreview){const api=PacketGardenSpecimenPreview,create=api.createPreview;api.createPreview=options=>f.preview=create({...options,render:source=>{
      const at=performance.now(),result=api.renderSprite({...options,source});f.renderMs.push(performance.now()-at);if(result)f.outputs.push(result.canvas);
      if(f.delay)return new Promise(resolve=>f.pending.push(()=>resolve(result)));return result;
    }});}
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.apps++;f.app=this;return init.apply(this,args).then(value=>{
      const bake=this.renderer.generateTexture.bind(this.renderer);this.renderer.generateTexture=options=>{const t=bake(options);f.bakes.push(t.source);return t;};
      const generate=this.renderer.textureGenerator.generateTexture.bind(this.renderer.textureGenerator);let extracting=false;
      this.renderer.textureGenerator.generateTexture=options=>{const t=generate(options);if(extracting)f.targets.push({texture:t,source:t.source,width:t.source.pixelWidth,height:t.source.pixelHeight});return t;};
      const extract=this.renderer.extract.canvas.bind(this.renderer.extract);this.renderer.extract.canvas=options=>{
        const source=f.ui.inspected&&f.view.byId.get(f.ui.inspected.id),copy=options.target.children[0];
        if(!source||copy===source||source.parent===options.target||options.target.parent)throw Error('Live Sprite detached or reused');
        function same(a,b,root=false){
          for(const k of ['texture','tint','alpha','rotation','visible','renderable'])if(a[k]!==b[k])throw Error('Preview mismatch '+k);
          for(const k of ['anchor','scale','skew','pivot'])if(a[k].x!==b[k].x||a[k].y!==b[k].y)throw Error('Preview transform '+k);
          if(!root&&(a.position.x!==b.position.x||a.position.y!==b.position.y))throw Error('Preview child position');
          if(a.children.length!==b.children.filter(c=>c instanceof PIXI.Sprite).length)throw Error('Preview decorations missing');
          a.children.forEach((child,i)=>same(child,b.children[i]));
        }
        same(copy,source,true);let count=0;const tally=n=>{count++;n.children.forEach(tally);};tally(copy);f.maxCopySprites=Math.max(f.maxCopySprites,count);
        f.copies.push(options.target);extracting=true;const at=performance.now();
        try{return extract(options);}finally{extracting=false;f.extractMs.push(performance.now()-at);}
      };return value;
    });};
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='__preview.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=old.get(file)??await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__preview.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(e){res.writeHead(404);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const errors=[],report={baseline,scenes:[],resources:[]};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});report.browser=browser.version();
    for(const [name,route] of [['homepage','/'],['diagnostic','/pixi-live.html']]){
      const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.stack));
      await page.addInitScript(()=>{window.__previewNow=1800000000000;Date.now=()=>__previewNow;let seed=19;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
      await page.goto(`http://127.0.0.1:${server.address().port}${route}`);await page.waitForFunction(()=>window.__preview?.app?.ticker?.started&&__preview.ui);
      await page.evaluate(()=>__preview.app.stop());await page.locator('#view').scrollIntoViewIfNeeded();
      const seed=async(type='broadleaf',age=65000,traits={})=>page.evaluate(({type,age,traits})=>{
        const f=__preview;f.ui.close();f.model.clear();f.ecology.clear();
        const entry={type,vigor:3,column:16,row:10,createdAt:Date.now()-age,broadleafBloom:null,vineBloom:null,wirefernSpores:null,
          origin:{kind:'simulated',eventType:'seed',sensor:'local',seenCount:'18446744073709551615'},...traits};
        const color=traits.colorVariant??2;f.garden.seed([entry]);entry.colorVariant=color;f.view.update(entry,f.model.byCell);f.view.animate(0,.016,Date.now());
        f.source=entry;f.live=f.view.byId.get(entry.id);f.original=JSON.stringify(entry);f.originalParent=f.live.parent;f.originalChildren=[...f.live.children];
        f.originalPose=JSON.stringify([f.live.position.x,f.live.position.y,f.live.scale.x,f.live.scale.y,f.live.anchor.x,f.live.anchor.y,f.live.rotation,f.live.tint,f.live.alpha]);
        f.app.render();
      },{type,age,traits});
      const select=async()=>{
        await page.evaluate(()=>{const f=__preview;f.ui.inspect(f.source,{x:700,y:190});});
        if(!baseline)await page.waitForFunction(()=>__preview.preview.snapshot().active===1&&!__preview.preview.snapshot().running);
      };
      const shot=async scene=>{
        await page.evaluate(()=>__preview.app.render()); // Paused fixtures must show the current source in the garden too.
        const state=await page.evaluate(()=>{const f=__preview,card=document.querySelector('#specimen-card'),preview=document.querySelector('#specimen-preview'),image=preview?.querySelector('canvas');
          return{title:document.querySelector('#specimen-card-title').textContent,plants:f.model.specimens.length,accepted:f.model.counts.acceptedLive,recent:f.model.recentEvents.length,
            score:document.querySelector('#garden-score').textContent,card:[card.getBoundingClientRect().width,card.getBoundingClientRect().height],
            preview:image?[image.width,image.height]:null,alt:image?.getAttribute('aria-label'),overlays:f.live.children.length,
            sourceStable:JSON.stringify(f.source)===f.original,parentStable:f.live.parent===f.originalParent,childrenStable:f.live.children.every((c,i)=>c===f.originalChildren[i]),
            poseStable:JSON.stringify([f.live.position.x,f.live.position.y,f.live.scale.x,f.live.scale.y,f.live.anchor.x,f.live.anchor.y,f.live.rotation,f.live.tint,f.live.alpha])===f.originalPose};});
        assert.equal(state.accepted,0);assert.equal(state.recent,0);assert.equal(state.score,'Score: 0');assert(state.sourceStable&&state.parentStable&&state.childrenStable&&state.poseStable);
        if(!baseline){assert.deepEqual(state.preview,[320,320]);assert.match(state.alt,/Enlarged preview of/);}
        await page.screenshot({path:path.join(out,`${name}-${scene}.png`)});report.scenes.push({page:name,scene,...state});
      };
      await seed();await select();await shot('mature-card');
      if(!baseline){
        const count=await page.evaluate(()=>__preview.preview.snapshot().renders);
        await page.evaluate(()=>{const f=__preview;for(let i=0;i<50;i++){__previewNow+=1000;f.ui.tick(Date.now());f.ui.inspect(f.source,{x:700,y:190});}});
        assert.equal(await page.evaluate(()=>__preview.preview.snapshot().renders),count,'age-only and repeated selections do not extract');
        await seed('flower',1000);await select();
        for(const age of [20000,65000,190000]){
          const previous=await page.evaluate(()=>__preview.preview.snapshot().renders);
          await page.evaluate(age=>{const f=__preview;__previewNow+=1000;f.source.createdAt=Date.now()-age;f.model.tick(Date.now());f.ui.tick(Date.now());},age);
          await page.waitForFunction(previous=>__preview.preview.snapshot().renders===previous+1&&__preview.preview.snapshot().active===1,previous);
          assert(await page.evaluate(()=>__preview.ui.inspected===__preview.source),'growth refresh preserves exact selection');
        }
        for(const [scene,type,age,traits] of [
          ['sprout','flower',1000,{}],['growing','flower',20000,{}],['fading','flower',190000,{}],
          ['broadleaf-blossoms','broadleaf',65000,{broadleafBloom:{color:4,arrangement:2}}],
          ['rainbow-broadleaf','broadleaf',65000,{colorVariant:4,broadleafBloom:{color:2,arrangement:1}}],
          ['vine-blossoms','vine',65000,{vineBloom:{color:1,layout:1}}],
          ['wirefern-sori','wirefern',65000,{wirefernSpores:{color:0,layout:2}}],
          ['afterglow-wirefern','wirefern',65000,{colorVariant:4,wirefernSpores:{color:2,layout:1}}],
          ['rare-crystal','crystalfungus',65000,{colorVariant:4}],['rare-ghostbloom','ghostbloom',65000,{}],['rare-blackthorn','blackthorn',65000,{}],
          ['stillbloom','stillbloom',120000,{}],['stillbloom-growing','stillbloom',45000,{}],['stillbloom-fading','stillbloom',1100000,{}]
        ]){await seed(type,age,traits);await select();await shot(scene);}
        // Trigger true pending -> active mutations while the card stays on the exact source.
        await seed('vine',65000);await page.evaluate(()=>{const f=__preview;f.model.poppies.force(f.source);f.model.tick(Date.now());f.live=f.view.byId.get(f.source.id);
          f.original=JSON.stringify(f.source);f.originalPose=JSON.stringify([f.live.position.x,f.live.position.y,f.live.scale.x,f.live.scale.y,f.live.anchor.x,f.live.anchor.y,f.live.rotation,f.live.tint,f.live.alpha]);});
        await select();await shot('opium-poppy');
        await seed('redbloom',1000);await select();
        await page.evaluate(()=>{const f=__preview;f.model.mutations.scheduleMutation(f.source,'collectible_weed',Date.now()-3000);f.model.tick(Date.now());f.view.animate(0,.016,Date.now());__previewNow+=1000;f.ui.tick(Date.now());
          f.original=JSON.stringify(f.source);f.originalPose=JSON.stringify([f.live.position.x,f.live.position.y,f.live.scale.x,f.live.scale.y,f.live.anchor.x,f.live.anchor.y,f.live.rotation,f.live.tint,f.live.alpha]);});
        await page.waitForFunction(()=>__preview.preview.snapshot().active===1&&!__preview.preview.snapshot().running);await shot('collectible-weed');
        const weedRenders=await page.evaluate(()=>__preview.preview.snapshot().renders);
        await page.evaluate(()=>{const f=__preview;for(let i=0;i<5;i++){__previewNow+=1000;f.view.animate(0,.016,Date.now());f.ui.tick(Date.now());}});
        assert.equal(await page.evaluate(()=>__preview.preview.snapshot().renders),weedRenders,'mutation bob does not continuously extract');
        // One real input click (not the direct diagnostic inspect method).
        await seed('wirefern',65000,{wirefernSpores:{color:1,layout:0}});
        const client=await page.evaluate(()=>{const f=__preview,r=f.app.canvas.getBoundingClientRect(),p=f.source;return{x:r.left+(f.view.root.position.x+(p.column+.5)*30*f.view.root.scale.x)*r.width/f.app.renderer.screen.width,
          y:r.top+(f.view.root.position.y+(p.row+.5)*30*f.view.root.scale.y)*r.height/f.app.renderer.screen.height};});
        await page.mouse.click(client.x,client.y);await page.waitForFunction(()=>__preview.ui.inspected===__preview.source&&__preview.preview.snapshot().active===1);
        await page.evaluate(()=>{const f=__preview;f.emissions.preview(f.source,Date.now());f.view.setWeather({level:'rain',eventsPerMinute:1000});});
        const noExternal=await page.evaluate(()=>__preview.preview.snapshot().renders);await page.evaluate(()=>{__preview.ui.tick(Date.now()+1000);});
        assert.equal(await page.evaluate(()=>__preview.preview.snapshot().renders),noExternal,'cloud/rain are not intrinsic specimen children');
        // Stillbloom meaningfully quantizes gradual scale/alpha instead of every age update.
        await seed('stillbloom',30000);await select();const quiet=await page.evaluate(()=>__preview.preview.snapshot().renders);
        await page.evaluate(()=>{__previewNow+=1000;__preview.model.tick(Date.now());__preview.ui.tick(Date.now());});await page.evaluate(()=>Promise.resolve());
        assert.equal(await page.evaluate(()=>__preview.preview.snapshot().renders),quiet);
        await page.evaluate(()=>{__previewNow+=10000;__preview.model.tick(Date.now());__preview.ui.tick(Date.now());});
        await page.waitForFunction(n=>__preview.preview.snapshot().renders>n,quiet);
        // Async old extraction must never publish after the user selects a newer source.
        await seed('flower',65000);await page.evaluate(()=>{__preview.delay=true;__preview.ui.inspect(__preview.source,{x:700,y:190});});
        await page.waitForFunction(()=>__preview.pending.length===1);
        await page.evaluate(()=>{const f=__preview;f.other=f.model.addSpecimen('mushroom',2,Date.now(),{kind:'simulated'}).specimen;
          f.ui.inspect(f.other,{x:700,y:190});f.pending[0]();});
        await page.waitForFunction(()=>__preview.pending.length===2);assert.equal(await page.locator('#specimen-preview canvas').count(),0);
        await page.evaluate(()=>__preview.pending[1]());await page.waitForFunction(()=>__preview.preview.snapshot().active===1);
        assert.match(await page.locator('#specimen-preview canvas').getAttribute('aria-label'),/Mushroom/);assert.equal(await page.evaluate(()=>__preview.outputs.at(-2).width),0);
        await page.evaluate(()=>{__preview.delay=false;__preview.ui.close();});
        // Exact source removal and same-cell replacement close synchronously.
        for(const reason of ['expired','collected','gnome-heist','replaced','cleared']){
          await seed();await select();await page.evaluate(reason=>{const f=__preview;if(reason==='cleared')f.model.clear();else f.model.remove(f.source,reason);},reason);
          assert(await page.locator('#specimen-card').isHidden());assert.equal(await page.locator('#specimen-preview canvas').count(),0);
        }
        await page.evaluate(()=>{const f=__preview;f.model.seedCompetition('3');f.source=f.model.specimens[0];f.live=f.view.byId.get(f.source.id);f.ui.inspect(f.source,{x:700,y:190});});
        await page.waitForFunction(()=>__preview.preview.snapshot().active===1);
        await page.evaluate(()=>{const f=__preview,old=f.source;f.competitionRoll=0;const replacement=f.model.addSpecimen('flower',0,Date.now(),{kind:'simulated'});
          if(replacement?.replaced!==old||replacement.specimen.cell!==old.cell)throw Error('Same-cell replacement fixture');f.competitionRoll=.99;});
        assert(await page.locator('#specimen-card').isHidden());assert.equal(await page.locator('#specimen-preview canvas').count(),0);
        // Grass receives no plant preview, and Escape/close/hidden release the bitmap.
        await seed();await select();await page.evaluate(()=>{const f=__preview;f.ecology.seed({grassCells:[{column:30,row:18,createdAt:Date.now()-65000,lastInfluencedAt:Date.now()}]});f.ui.click({x:915,y:555},{x:700,y:190});});
        assert.equal(await page.locator('#specimen-card-title').textContent(),'Wild grass');assert(await page.locator('#specimen-preview').isHidden());
        await seed();await select();await page.keyboard.press('Escape');assert(await page.locator('#specimen-card').isHidden());
        await select();await page.locator('#specimen-card-close').click();assert(await page.locator('#specimen-card').isHidden());
        await select();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
        assert.equal(await page.locator('#specimen-preview canvas').count(),0);
        await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__preview.app.stop();});
        await page.waitForFunction(()=>__preview.preview.snapshot().active===1);
        // Mobile near both viewport edges; short landscape scrolls details while close remains visible.
        await page.setViewportSize({width:390,height:844});await seed('broadleaf',65000,{broadleafBloom:{color:3,arrangement:2}});await select();
        await page.evaluate(()=>__preview.ui.inspect(__preview.source,{x:389,y:843}));await shot('mobile-edge');
        for(const size of [{width:320,height:420},{width:390,height:260}]){
          await page.setViewportSize(size);await page.evaluate(()=>__preview.ui.position());
          const fit=await page.evaluate(()=>{const card=document.querySelector('#specimen-card'),close=document.querySelector('#specimen-card-close'),body=card.querySelector('.specimen-card-content');body.scrollTop=10000;
            const r=card.getBoundingClientRect(),b=close.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,closeTop:b.top,closeBottom:b.bottom,scroll:body.scrollHeight>body.clientHeight};});
          assert(fit.left>=0&&fit.top>=0&&fit.right<=size.width&&fit.bottom<=size.height);assert(fit.closeTop>=0&&fit.closeBottom<=size.height);if(size.height===260)assert(fit.scroll);
        }
        await shot('mobile-short-scroll');await page.locator('#specimen-card-close').click();
        await page.setViewportSize({width:1280,height:960});
        await seed('wirefern',65000,{wirefernSpores:{color:1,layout:2}});
        for(let i=0;i<30;i++){await select();await page.evaluate(()=>__preview.ui.close());}
        const resources=await page.evaluate(()=>{const f=__preview;return{apps:f.apps,streams:f.streams,bakes:f.bakes.length,frames:f.view.snapshot().textures,
          preview:f.preview.snapshot(),targets:f.targets.length,targetsReleased:f.targets.every(t=>t.texture.destroyed&&t.source.destroyed),copiesReleased:f.copies.every(c=>c.destroyed),
          canvasesReleased:f.outputs.every(c=>c.width===0&&c.height===0),maxTargetPixels:Math.max(...f.targets.map(t=>t.width*t.height)),
          maxCopySprites:f.maxCopySprites,meanRenderMs:f.renderMs.reduce((s,n)=>s+n,0)/f.renderMs.length,maxRenderMs:Math.max(...f.renderMs),
          meanExtractMs:f.extractMs.reduce((s,n)=>s+n,0)/f.extractMs.length,maxExtractMs:Math.max(...f.extractMs),score:document.querySelector('#garden-score').textContent};});
        assert.equal(resources.apps,1);assert.equal(resources.streams,1);assert.equal(resources.bakes,5);assert.equal(resources.frames,832);
        assert(resources.targetsReleased&&resources.copiesReleased&&resources.canvasesReleased);assert.equal(resources.preview.active,0);assert(resources.maxTargetPixels<=264*264);report.resources.push({page:name,...resources});
        await select();
      }
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      if(!baseline)assert(await page.evaluate(()=>__preview.preview.snapshot().active===0&&__preview.outputs.every(c=>c.width===0)&&__preview.bakes.every(b=>b.destroyed)));
      await page.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2));
    if(!baseline)await fs.writeFile(path.join(root,'artifacts/specimen-preview/index.html'),`<!doctype html><meta charset="utf-8"><title>Specimen inspection preview</title><style>body{background:#182219;color:#eee;font:16px system-ui;margin:24px}img{max-width:none}figure{overflow:auto;margin:12px 0}summary{cursor:pointer;padding:12px}a{color:#e2d39b}</style>
      <h1>Enlarged exact-specimen inspection</h1><p>Browser screenshots at normal CSS scale. The preview is 160px desktop / 120px mobile, with a 320px bitmap. <a href="after/review.json">Resources and timing</a></p>
      ${['homepage','diagnostic'].map(page=>`<h2>${page}</h2><details><summary>Before</summary><figure><img src="before/${page}-mature-card.png"></figure></details>${report.scenes.filter(s=>s.page===page).map(s=>`<details ${s.scene==='broadleaf-blossoms'?'open':''}><summary>${s.scene}</summary><figure><img src="after/${page}-${s.scene}.png" alt="${s.scene}"></figure></details>`).join('')}`).join('')}`);
    console.log('PASS: exact live Sprite/overlay/transform preview, before/after native UI, stages/rare/blooms/sori/poppy/weed/Stillbloom, no age/bob redraw, stale async/removal/grass/hidden/mobile/teardown, repeated ownership and latency:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
