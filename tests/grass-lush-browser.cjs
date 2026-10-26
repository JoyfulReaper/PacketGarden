// Real renderer captures and submission/ownership probes. No installed dependencies.
if(!process.argv.includes('--run'))console.log('SKIP: grass lawn visual/performance review; pass --run with installed Playwright/Chrome.');
else run().catch(error=>{console.error(error);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
  const {execFileSync}=require('node:child_process'),{chromium}=require('playwright'),{ecology,simulate,seeded}=require('./grass-coverage.cjs');
  const baseline=process.argv.includes('--baseline'),root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot');
  const output=path.join(root,'artifacts/grass-lush',baseline?'before':'after');await fs.mkdir(output,{recursive:true});
  const old=new Map(baseline?['garden-ecology.js','garden-grass.js','pixi-live-ecology.js'].map(file=>[file,execFileSync('git',['show','f4d4e26:wwwroot/'+file],{cwd:root})]):[]);
  const capture=`{
    const f=window.__lawn={bakes:[],geometry:0,renders:[],contexts:[]};
    for(const [api,name,key] of [[PacketGardenCore,'createGardenModel','garden'],[PacketGardenEcology,'createEcologyModel','ecology'],
      [PacketGardenGnomes,'createModel','gnomes'],[PacketGardenFrogs,'createModel','frogs'],[PacketGardenAmbient,'createAmbientModel','ambient']]){
      const create=api[name];api[name]=(...args)=>{if(key==='frogs')args[0]={...args[0],random:PacketGardenFrogs.seededRandom(731)};const model=create(...args);f[key]??=model;return model;};
    }
    const createLight=PacketGardenLighting.createModel;PacketGardenLighting.createModel=(...args)=>(f.lighting=createLight(...args));
    const init=PIXI.Application.prototype.init;
    PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args).then(value=>{
      const generate=this.renderer.generateTexture.bind(this.renderer);
      this.renderer.generateTexture=options=>{const start=performance.now(),texture=generate(options);
        f.bakes.push({width:texture.source.pixelWidth,height:texture.source.pixelHeight,ms:performance.now()-start,source:texture.source});
        if(options.frame.width===1024&&options.frame.height<=128)f.ecologyTexture=texture;
        if(options.frame.width===1024&&options.frame.height<=128)for(const node of options.target.children)if(node instanceof PIXI.Graphics)f.contexts.push(node.context);
        return texture;};return value;
    });};
    for(const name of ['moveTo','quadraticCurveTo','fill']){const original=PIXI.Graphics.prototype[name];
      PIXI.Graphics.prototype[name]=function(...args){f.geometry++;return original.apply(this,args);};}
    const createView=PacketGardenPixiEcology.createEcologyView;PacketGardenPixiEcology.createEcologyView=(...args)=>(f.view=createView(...args));
    const createGnomeView=PacketGardenPixiGnomes.createGnomeView;PacketGardenPixiGnomes.createGnomeView=(...args)=>(f.gnomeView=createGnomeView(...args));
    const createFrogView=PacketGardenPixiAmbient.createFrogView;PacketGardenPixiAmbient.createFrogView=(...args)=>(f.frogView=createFrogView(...args));
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost'),file=url.pathname.slice(1)||'index.html';
    if(file==='__lawn.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=old.get(file)??await fs.readFile(absolute);
    if(file==='pixi-live.html')body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__lawn.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch(error){res.writeHead(404);res.end(String(error));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const E=ecology(baseline),natural=simulate(E,11),recovery=simulate(E,11,{extinct:true}),initial=E.createEcologyModel({now:()=>0,random:seeded(11)});initial.seedInitialGrass();
  const now=1800000000000,cell=(column,row)=>({column,row,createdAt:now-60000,lastInfluencedAt:now-60000});
  const translate=(cells,minute)=>cells.map(c=>({...c,createdAt:now-minute*60000+c.createdAt,lastInfluencedAt:now-minute*60000+c.lastInfluencedAt}));
  const dense=Array.from({length:640},(_,i)=>cell(i%32,Math.floor(i/32)));
  const scenes=[
    {name:'single-tile',cells:[cell(16,10)]},
    {name:'five-by-five',cells:Array.from({length:25},(_,i)=>cell(13+i%5,7+Math.floor(i/5)))},
    {name:'sparse-start',cells:translate(initial.grassCells,0)},
    {name:'natural-5m',cells:translate(natural.states[5],5)},
    {name:'natural-10m',cells:translate(natural.states[10],10)},
    {name:'recovered-15m',cells:translate(recovery.states[15],15)},
    {name:'recovered-40m',cells:translate(recovery.states[40],40)},
    {name:'mixed-day',cells:dense,mixed:true},{name:'mixed-night',cells:dense,mixed:true,night:true},
    {name:'wildlife-day',cells:dense,wildlife:true},{name:'wildlife-night',cells:dense,wildlife:true,night:true}
  ];
  let browser;const errors=[],report={baseline,scenes:[],resources:{}};
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});
    for(const pixi of [true]){
      const kind='pixi',page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
      page.on('pageerror',error=>errors.push(String(error.stack)));
      await page.addInitScript(()=>{window.__lawnNow=1800000000000;Date.now=()=>window.__lawnNow;let seed=11;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        window.__lawnPaths=0;window.__lawnPathCommands=0;const Path=Path2D;
        window.Path2D=class extends Path{constructor(...args){super(...args);__lawnPaths++;}
          moveTo(...args){__lawnPathCommands++;return super.moveTo(...args);}
          quadraticCurveTo(...args){__lawnPathCommands++;return super.quadraticCurveTo(...args);}
          closePath(){__lawnPathCommands++;return super.closePath();}};
      });
      await page.goto(origin+('/pixi-live.html'));
      {await page.waitForFunction(()=>window.__lawn?.app?.ticker?.started);await page.locator('#probes').uncheck();await page.evaluate(()=>__lawn.app.stop());
        report.artwork=await page.evaluate(()=>{
          const canvas=__lawn.app.renderer.extract.canvas(__lawn.ecologyTexture),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
          return Array.from({length:12},(_,variant)=>{let green=0;for(let y=34;y<94;y++)for(let x=34;x<94;x++)if(data[(y*canvas.width+variant*128+x)*4+3]>128)green++;return green/3600;});
        });
      }
      await page.getByLabel('Day/night cycle',{exact:true}).uncheck();
      for(const scene of scenes){
        const counts=await page.evaluate(({pixi,scene,now})=>{
          const f=__lawn;
          f.gnomes.clear();f.frogs.clear();f.ambient.clear();f.garden.clear();f.ecology.clear();
          f.lighting.setEnabled(true);f.lighting.setMode(scene.night?'night':'day');
          const amount=scene.wildlife?32:scene.mixed?40:0;
          const entries=Array.from({length:amount},(_,i)=>({type:i%2?'mushroom':'flower',column:scene.wildlife?i:2+(i%10)*3,row:scene.wildlife?4:2+Math.floor(i/10)*5,createdAt:now-120000,vigor:0,colorVariant:0,origin:{kind:'simulated',eventType:'grass-visual-review'}}));
          f.garden.seed(entries);
          f.ecology.seed({grassCells:scene.cells.map(c=>({...c})),puddles:scene.wildlife?[{x:480,y:300,seed:.7199,size:24,maxSize:24,createdAt:now-60000,lastRefreshedAt:now}]:[]});
          f.ecology.resetCadence(now);
          if(scene.wildlife){f.frogs.spawnSimulated(now);f.frogs.spawnSimulated(now);for(const frog of f.frogs.frogs)frog.createdAt-=2000;f.gnomes.start(now,()=>.25);f.gnomes.advance(now+1800);}
          {f.view.tick(now);f.view.animate(now);f.gnomeView.animate(now+1800);f.frogView.animate(now);f.app.render();}
          return {grass:f.ecology.grassCells.length,specimens:f.garden.specimens.length,frogs:f.frogs.frogs.length,gnomes:f.gnomes.actors.length};
        },{pixi,scene,now});
        await page.evaluate(()=>{const mode=document.querySelector('#lighting-mode');mode.value=__lawn.lighting.mode;mode.dispatchEvent(new Event('change'));});
        await page.locator('#view canvas').screenshot({path:path.join(output,`${kind}-${scene.name}.png`)});
        if(scene.name==='single-tile'||scene.name==='five-by-five'){
          const crop=await page.locator('#view canvas').first().evaluate((node,{single})=>{
            const box=node.getBoundingClientRect(),scale=Math.min(box.width/960,box.height/600),left=box.x+(box.width-960*scale)/2,top=box.y+(box.height-600*scale)/2;
            return {x:left+(single?16:13)*30*scale,y:top+(single?10:7)*30*scale,width:(single?30:150)*scale,height:(single?30:150)*scale};
          },{single:scene.name==='single-tile'});
          await page.screenshot({path:path.join(output,`${kind}-${scene.name}-normal.png`),clip:crop});
        }
        report.scenes.push({kind,name:scene.name,...counts});
      }
      report.resources[kind]=await page.evaluate(pixi=>{
        const times=[];
        {const f=__lawn,bakes=f.bakes.length,geometry=f.geometry;
          for(let i=0;i<120;i++){const at=performance.now();f.app.render();times.push(performance.now()-at);}
          const cycles=[];for(let i=0;i<20;i++){const sprites=[...f.view.grassViews.values()].map(r=>r.sprite);f.ecology.clearGrass();cycles.push({remaining:f.view.grassViews.size,destroyed:sprites.every(s=>s.destroyed)});
            f.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}))});}
          const atlas=f.bakes.find(b=>b.width===2048&&b.height<=256),result={meanMs:times.reduce((a,b)=>a+b,0)/times.length,worstMs:Math.max(...times),bakes,
            ecologyBakeMs:atlas.ms,liveAtlasSources:f.bakes.filter(b=>!b.source.destroyed).length,
            ecologyAtlas:{width:atlas.width,height:atlas.height,rgbaBytes:atlas.width*atlas.height*4},grassSprites:f.view.grassViews.size,cycles,
            recurringGeometry:f.geometry-geometry,additionalBakes:f.bakes.length-bakes,constructionContextsDestroyed:f.contexts.every(c=>c.destroyed)};
          const root=f.app.stage;window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));
          return {...result,stageDestroyed:root.destroyed,sourcesDestroyed:f.bakes.every(b=>b.source.destroyed),remainingGrass:f.view.grassViews.size};
        }
      },pixi);
      await page.close();assert.deepEqual(errors,[]);
    }
    const r=report.resources.pixi;assert.equal(r.additionalBakes,0);assert.equal(r.recurringGeometry,0);assert(r.constructionContextsDestroyed);
    assert(r.cycles.every(c=>c.remaining===0&&c.destroyed));assert(r.stageDestroyed&&r.sourcesDestroyed);assert.equal(r.remainingGrass,0);
    assert.deepEqual(r.ecologyAtlas,{width:2048,height:baseline?128:256,rgbaBytes:baseline?1048576:2097152});assert(r.grassSprites<=640);
    if(!baseline){
      assert(report.artwork.every(coverage=>coverage>=.85&&coverage<=.98),'mature patches retain dense foliage with small irregular soil gaps');}
    await fs.writeFile(path.join(output,'rendering.json'),JSON.stringify(report,null,2));
    // A review sheet uses the actual screenshots; tiles remain available at native size.
    const sheet=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
    const cards=[];for(const scene of scenes){const pictures=[];for(const label of ['before','after'])for(const kind of ['pixi']){
      try{const bytes=await fs.readFile(path.join(root,'artifacts/grass-lush',label,`${kind}-${scene.name}.png`));pictures.push(`<figure><figcaption>${label} · ${kind}</figcaption><img src="data:image/png;base64,${bytes.toString('base64')}"></figure>`);}catch{}
    }cards.push(`<section><h2>${scene.name}</h2><div>${pictures.join('')}</div></section>`);}
    await sheet.setContent(`<html><head><style>body{margin:0;padding:14px;background:#172019;color:#dbe6d5;font:14px sans-serif}h2{font-size:18px;margin:12px 0 6px}section>div{display:flex;gap:10px}figure{margin:0;width:380px}img{width:100%;display:block}figcaption{padding:4px}</style></head><body>${cards.join('')}</body></html>`);
    await sheet.screenshot({path:path.join(output,'comparison.png'),fullPage:true});await sheet.close();
    console.log('PASS: lawn before/after Pixi captures, natural snapshots, wildlife/lighting, atlas/Sprite/CPU and 20 cleanup cycles:',JSON.stringify(report.resources));
  }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));assert.deepEqual(errors,[]);}
}
