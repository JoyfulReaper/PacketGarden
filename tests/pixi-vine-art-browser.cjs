// Optional reproducible vine-art comparison with installed Chrome/available Playwright.
// No packages are installed. --baseline serves the unchanged a7e391c renderer.
// Example: node tests/pixi-vine-art-browser.cjs --run --baseline --seconds=20
// --plants compares Phase 2B against the committed vine renderer, including small views.
// --grass compares Phase 2C against the committed plant renderer and ecology atlas.
// --fuller-grass compares the small fullness pass against d91b7a1, preserving older artifacts.
// --green-grass compares this shared-art/recovery slice against HEAD, including Canvas/night.
// --size compares specimen presentation scale against the committed tufted-grass garden.
if (!process.argv.includes('--run')) console.log('SKIP: optional vine-art browser fixture; pass --run.');
else run().catch(error => { console.error(error); process.exitCode = 1; });

async function run() {
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
  const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),baseline=process.argv.includes('--baseline'),plants=process.argv.includes('--plants');
  const greenGrass=process.argv.includes('--green-grass');
  const fullerGrass=process.argv.includes('--fuller-grass')||greenGrass,grassArt=process.argv.includes('--grass')||fullerGrass;assert(!(plants&&grassArt));
  const sizeArt=process.argv.includes('--size');assert(!sizeArt||!plants&&!grassArt);
  const seconds=Number(process.argv.find(arg=>arg.startsWith('--seconds='))?.split('=')[1]??20);
  assert(seconds>=5&&seconds<=60);
  const label=process.argv.find(arg=>arg.startsWith('--label='))?.split('=')[1]??(baseline?'before':'after');
  const sceneNames=greenGrass?['grass-sparse','grass-young','grass-moderate','grass-mature','grass-fading','mixed-grass','grass-night','mixed-grass-hurricane']:sizeArt?['size-sparse','size-dense','size-hurricane']:grassArt?['grass-sparse','grass-young','grass-mature','grass-fading','mixed-grass','mixed-grass-hurricane']:
    plants?['broadleaf','blackthorn','weed','mixed','mixed-hurricane']:['vines-quiet','vines-hurricane','mixed-hurricane'];
  const onlyScene=process.argv.find(arg=>arg.startsWith('--scene='))?.split('=')[1];
  assert(!onlyScene||sceneNames.includes(onlyScene));
  assert(/^[a-z0-9-]+$/.test(label));
  const artifactRoot=path.join(root,'artifacts',greenGrass?'grass-green':fullerGrass?'grass-fullness':sizeArt?'plant-size':grassArt?'grass-art':plants?'plant-art':'vine-art');
  const output=path.join(artifactRoot,label);await fs.mkdir(output,{recursive:true});
  const checkpoint=greenGrass?(process.argv.find(arg=>arg.startsWith('--checkpoint='))?.slice(13)??execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()):fullerGrass?'d91b7a1':sizeArt?'8b60c29b44546d27a71a06766ae392aee555210c':grassArt?'a90c779b5b8875aa446a780d3b6fef7562e0d62d':plants?'916e7b969ea9218478202593088f6e9de614df26':'a7e391cf0f8a614d763d6fa86f9f474d4a2dd075';
  assert(/^[a-f0-9]{7,40}$/.test(checkpoint));
  const oldRenderer=baseline?execFileSync('git',['show',checkpoint+':wwwroot/pixi-live.js'],{cwd:root}):null;
  const oldEcology=baseline&&grassArt?execFileSync('git',['show',checkpoint+':wwwroot/pixi-live-ecology.js'],{cwd:root}):null;
  const capture=`
    const fixture=window.__vineFixture={paints:[],gaps:[],geometry:0,textures:0,atlases:[],last:null};
    if(${greenGrass}){const create=PacketGardenLighting.createModel;PacketGardenLighting.createModel=options=>(fixture.lighting=create({...options,getLocalHour:()=>12}));}
    if(${greenGrass}){const create=PacketGardenLightingView.createSurface;PacketGardenLightingView.createSurface=(...args)=>(fixture.lightSurface=create(...args));}
    const init=PIXI.Application.prototype.init;
    PIXI.Application.prototype.init=function(...args){
      fixture.app=this;
      const render=this.render;
      this.render=function(...args){const at=performance.now();const result=render.apply(this,args);
        if(fixture.paints.length<5000)fixture.paints.push(performance.now()-at);
        if(fixture.last!==null&&fixture.gaps.length<5000)fixture.gaps.push(at-fixture.last);fixture.last=at;return result;};
      return init.apply(this,args).then(result=>{
        const generate=this.renderer.generateTexture.bind(this.renderer);
        this.renderer.generateTexture=options=>{fixture.textures++;fixture.atlases.push([options.frame.width,options.frame.height,options.resolution]);
          if(options.frame.width===1024){
            fixture.vineContexts=options.target.children.slice(240,320).filter(child=>child instanceof PIXI.Graphics).map(child=>child.context);
            fixture.artContexts=options.target.children.slice(0,760).filter(child=>child instanceof PIXI.Graphics).map(child=>child.context);
          }
          if(options.frame.width===832){
            fixture.grassContexts=[];
            const visit=node=>{if(node instanceof PIXI.Graphics)fixture.grassContexts.push(node.context);for(const child of node.children??[])visit(child);};
            for(const child of options.target.children.slice(0,12))visit(child);
            fixture.grassBounds=options.target.children.slice(0,12).map((child,index)=>{
              const b=child.getBounds();return {x:b.minX-index*64,y:b.minY,width:b.maxX-b.minX,height:b.maxY-b.minY};});
          }
          const atlas=generate(options);
          if(options.frame.width===1024){
            fixture.atlasPng=this.renderer.extract.canvas(atlas).toDataURL();
            fixture.tileBounds=options.target.children.map((child,index)=>{
              const b=child.getBounds();return {index,graphics:child instanceof PIXI.Graphics,
                x:b.minX-index%32*32,y:b.minY-Math.floor(index/32)*32,width:b.maxX-b.minX,height:b.maxY-b.minY};
            });
          }
          if(options.frame.width===832)fixture.ecologyPng=this.renderer.extract.canvas(atlas).toDataURL();
          return atlas;};
        return result;
      });
    };
    for(const name of ${greenGrass}?['clear','stroke','fill','moveTo','quadraticCurveTo']:['clear','stroke']){const original=PIXI.Graphics.prototype[name];
      PIXI.Graphics.prototype[name]=function(...args){fixture.geometry++;return original.apply(this,args);};}
    for(const [api,name,key] of [[PacketGardenCore,'createGardenModel','garden'],[PacketGardenEcology,'createEcologyModel','ecology']]){
      const original=api[name];api[name]=function(...args){const model=original(...args);fixture[key]=model;return model;};}
    if(${sizeArt}){
      const create=PacketGardenPixiUi.createUi;
      PacketGardenPixiUi.createUi=function(...args){const ui=create(...args),click=ui.click;
        ui.click=function(...input){const hit=click(...input);fixture.lastHit=hit;return hit;};return ui;};
    }
  `;
  const streams=new Set();
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost'),file=url.pathname==='/'?'index.html':url.pathname.slice(1);
      if(file==='__vine-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
      if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
      if(file==='api/garden/events'){streams.add(res);res.on('close',()=>streams.delete(res));
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
        res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0}\n\n');return;}
      const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
      let body=file==='pixi-live.js'&&oldRenderer?oldRenderer:file==='pixi-live-ecology.js'&&oldEcology?oldEcology:baseline&&greenGrass&&['garden.js','garden-ecology.js'].includes(file)?execFileSync('git',['show',checkpoint+':wwwroot/'+file],{cwd:root}):await fs.readFile(absolute);
      if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,
        '<script src="/__vine-fixture.js" defer></script>$1'));
      res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});
    const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});page.setDefaultTimeout(15000);
    const errors=[];page.on('pageerror',error=>errors.push(String(error.stack)));
    await page.addInitScript(()=>{Date.now=()=>1800000000000;let random=1234;
      window.__resetVineRandom=()=>{random=1234;};Math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(()=>window.__vineFixture?.app?.ticker?.started);
    const atlas=await page.evaluate(()=>({png:window.__vineFixture.atlasPng,bounds:window.__vineFixture.tileBounds}));
    await fs.writeFile(path.join(output,'atlas.png'),Buffer.from(atlas.png.split(',')[1],'base64'));
    await fs.writeFile(path.join(output,'tile-bounds.json'),JSON.stringify(atlas.bounds,null,2));
    if(grassArt||sizeArt){
      const ecologyAtlas=await page.evaluate(()=>({png:window.__vineFixture.ecologyPng,bounds:window.__vineFixture.grassBounds}));
      await fs.writeFile(path.join(output,'ecology-atlas.png'),Buffer.from(ecologyAtlas.png.split(',')[1],'base64'));
      await fs.writeFile(path.join(output,'grass-bounds.json'),JSON.stringify(ecologyAtlas.bounds,null,2));
    }
    const results=[];
    for(const scene of onlyScene?[onlyScene]:sceneNames){
      const hurricane=scene.endsWith('hurricane');
      for(const stream of streams)stream.write(`event: weather\ndata: ${JSON.stringify({level:hurricane?'botnet_hurricane':'quiet',eventsPerMinute:hurricane?10000:0})}\n\n`);
      const fixture=await page.evaluate(({scene,plants,grassArt,sizeArt,greenGrass})=>{
        const f=window.__vineFixture,at=Date.now(),mixed=scene.startsWith('mixed');window.__resetVineRandom();
        if(greenGrass){f.lighting.setMode(scene==='grass-night'?'night':'day');f.lightSurface.apply(f.lighting.state);}
        const start=performance.now();
        f.garden.seed(Array.from({length:greenGrass?(mixed?160:0):grassArt&&!mixed?0:sizeArt&&scene==='size-sparse'?96:640},(_,index)=>{
          const cell=greenGrass?(index*73+7)%640:sizeArt&&scene==='size-sparse'?(index*73+7)%640:index;
          const type=mixed||sizeArt?PacketGardenCore.species[index%10]:plants?scene:'vine',timing=PacketGardenCore.timings[type];
          const stage=sizeArt?Math.floor(index/10)%8:Math.floor(cell/32)%8,age=grassArt?(type==='redbloom'?5000:timing.matureAfterMs+1000):!plants&&!sizeArt?(mixed&&cell%10===5?5000:120000):type==='redbloom'?5000:
            stage===0?1000:stage===1?timing.growingAfterMs+1000:stage===7?timing.expiredAfterMs-1000:timing.matureAfterMs+1000;
          return {type,column:cell%32,row:Math.floor(cell/32),vigor:plants||sizeArt?Math.floor(index/8)%4:cell%4,createdAt:at-age,
            origin:{kind:'simulated',eventType:'art-fixture'}};
        }),at);
        const grass=sizeArt?(scene==='size-sparse'?32:640):plants&&scene!=='mixed-hurricane'?0:640,puddles=sizeArt?(scene.endsWith('hurricane')?8:0):grass?8:0;
        let cells=Array.from({length:grass},(_,cell)=>({column:cell%32,row:Math.floor(cell/32),createdAt:at-60000,lastInfluencedAt:at}));
        if(grassArt){
          if(greenGrass&&['grass-moderate','grass-mature','grass-night','mixed-grass','mixed-grass-hurricane'].includes(scene))cells=cells.filter(cell=>(cell.column*13+cell.row*7)%10<(scene==='grass-moderate'?4:8));
          if(scene==='grass-sparse')cells=Array.from({length:32},(_,i)=>{const cell=(i*73+17)%640;return {column:cell%32,row:Math.floor(cell/32),createdAt:at-60000,lastInfluencedAt:at};});
          if(scene==='grass-young')cells=cells.filter(cell=>Math.min(...[[6,6],[16,10],[25,14]].map(([x,y])=>Math.hypot(cell.column-x,cell.row-y)))<4.5).map(cell=>{
            const distance=Math.min(...[[6,6],[16,10],[25,14]].map(([x,y])=>Math.hypot(cell.column-x,cell.row-y)));
            return {...cell,createdAt:at-(distance<1.5?60000:1000+(4.5-distance)/4.5*27000)};});
          if(scene==='grass-fading')cells=cells.map((cell,i)=>{const idle=(21+i%14)*60000;return {...cell,createdAt:at-idle-60000,lastInfluencedAt:at-idle};});
          if(greenGrass&&scene==='grass-sparse')cells=cells.map(cell=>({...cell,createdAt:at-18000}));
        }
        const waterCount=grassArt?(scene.endsWith('hurricane')?8:0):puddles;
        f.ecology.seed({grassCells:cells,puddles:Array.from({length:waterCount},(_,i)=>({x:150+i%4*210,y:180+Math.floor(i/4)*240,seed:i/8,size:18,maxSize:18,createdAt:at-20000,lastRefreshedAt:at}))});
        if(greenGrass)cells=f.ecology.grassCells;
        if(grassArt||sizeArt)f.ecology.resetCadence(at);
        return {buildMs:performance.now()-start,grass:cells.length,puddles:waterCount,
          grassState:grassArt||sizeArt?cells.map(c=>[c.column,c.row,c.createdAt,c.lastInfluencedAt]):undefined,
          positions:f.garden.specimens.map(p=>[p.type,p.column,p.row,p.vigor,p.colorVariant,...(plants||grassArt||sizeArt?[p.stage]:[])])};
      },{scene,plants,grassArt,sizeArt,greenGrass});
      await page.waitForTimeout(1000);
      await page.locator('#view canvas').screenshot({path:path.join(output,`${scene}.png`)});
      let canvasPaint;
      if(canvas){const state=await page.evaluate(()=>({specimens:__vineFixture.garden.specimens,grassCells:__vineFixture.ecology.grassCells,puddles:__vineFixture.ecology.puddles}));
        await canvas.evaluate(({state,scene,hurricane})=>{gardenModel.seed(state.specimens);gardenEcology.seed(state);gardenEcology.resetCadence();
          gardenLighting.setMode(scene==='grass-night'?'night':'day');updateGardenLighting(Date.now(),true);
          weatherState.source='manual';weatherState.level=hurricane?'botnet_hurricane':'quiet';weatherState.eventsPerMinute=hurricane?10000:0;drawGarden();},{state,scene,hurricane});
        await canvas.locator('.garden-stage').screenshot({path:path.join(output,`${scene}-canvas.png`)});
        canvasPaint=await canvas.evaluate(()=>{const samples=[];for(let i=0;i<12;i++){const start=performance.now();drawGarden();samples.push(performance.now()-start);}return {meanMs:samples.reduce((a,b)=>a+b)/samples.length,worstMs:Math.max(...samples),forcedPaints:samples.length};});}
      const layouts=[];
      const checkSize=async(viewport)=>{
        const layout=await page.evaluate(()=>{
          const f=window.__vineFixture,root=f.app.stage.children[0],sprites=root.children[6].children;
          const {width,height}=f.app.renderer.screen;
          return {viewport:[innerWidth,innerHeight],canvas:[width,height],scale:root.scale.x,
            bands:{top:root.position.y,bottom:height-root.position.y-600*root.scale.y,left:root.position.x,right:width-root.position.x-960*root.scale.x},
            specimens:f.garden.specimens.map((p,i)=>{const s=sprites[i],w=s.texture.frame.width*Math.abs(s.scale.x),h=s.texture.frame.height*Math.abs(s.scale.y);
              return {type:p.type,stage:p.stage,row:p.row,column:p.column,scale:Math.abs(s.scale.x),
                bounds:[s.position.x-w*s.anchor.x,s.position.y-h*s.anchor.y,s.position.x+w*(1-s.anchor.x),s.position.y+h*(1-s.anchor.y)]};})};
        });
        if(!baseline)for(const p of layout.specimens)if(p.type!=='vine')assert(p.bounds[0]>=0&&p.bounds[1]>=0&&p.bounds[2]<=960&&p.bounds[3]<=600,'scaled sprite stays inside garden');
        // Logical cell centers remain the picking contract even where art overlaps.
        const chosen=await page.evaluate(()=>window.__vineFixture.garden.specimens.filter(p=>p.type!=='vine').filter((p,i)=>i%13===0).slice(0,8)
          .map(p=>({id:p.id,column:p.column,row:p.row,type:p.type,age:Math.max(0,Date.now()-p.createdAt)})));
        for(const p of chosen){
          const point=await page.evaluate(p=>{const f=window.__vineFixture,r=f.app.stage.children[0],box=f.app.canvas.getBoundingClientRect();
            return {x:box.left+r.position.x+(p.column+.5)*30*r.scale.x,y:box.top+r.position.y+(p.row+.5)*30*r.scale.y};},p);
          await page.mouse.click(point.x,point.y);await page.locator('#specimen-card').waitFor({state:'visible'});
          const title=await page.locator('#specimen-card-title').textContent();
          const expected=await page.evaluate(type=>PacketGardenUiCore.inspection({type,createdAt:Date.now()},Date.now()).title,p.type);
          assert.equal(title,expected,'inspection resolves exact logical species');
          assert.equal(await page.evaluate(()=>window.__vineFixture.lastHit?.specimen?.id),p.id,'inspection resolves exact specimen');
          await page.getByRole('button',{name:'Close specimen information'}).click();
        }
        layouts.push(layout);
      };
      if(sizeArt)await checkSize();
      if(plants||grassArt||sizeArt){
        await page.setViewportSize({width:720,height:700});await page.waitForTimeout(200);
        await page.locator('#view canvas').screenshot({path:path.join(output,`${scene}-small.png`)});
        if(sizeArt){
          await checkSize();
          if(scene==='size-sparse'){
            await page.setViewportSize({width:720,height:1000});await page.waitForTimeout(200);
            await page.locator('#view canvas').screenshot({path:path.join(output,`${scene}-tall.png`)});await checkSize();
          }
        }
        await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(200);
      }
      if(sizeArt)await fs.writeFile(path.join(output,`${scene}-layout.json`),JSON.stringify(layouts,null,2));
      await page.evaluate(()=>{const f=window.__vineFixture;f.paints=[];f.gaps=[];f.last=null;f.geometry=0;f.textures=0;});
      console.log(`Measuring ${label}: ${scene} for ${seconds}s`);
      await page.waitForTimeout(seconds*1000);
      const data=await page.evaluate(({plants,grassArt,sizeArt})=>{
        const f=window.__vineFixture,root=f.app.stage.children[0];
        const stats=values=>{const sorted=values.slice().sort((a,b)=>a-b);return {n:values.length,avg:values.reduce((a,b)=>a+b,0)/values.length,
          p95:sorted[Math.floor((sorted.length-1)*.95)],p99:sorted[Math.floor((sorted.length-1)*.99)],max:sorted.at(-1),over50:values.filter(v=>v>50).length,over300:values.filter(v=>v>300).length};};
        const count=node=>1+(node.children?.reduce((total,child)=>total+count(child),0)??0);
        return {submission:stats(f.paints),interval:stats(f.gaps),objects:count(f.app.stage),
          vineViews:root.children[5].children.length,linkStrokes:root.children[5].children.reduce((n,g)=>n+g.context.instructions.length,0),
          particles:root.children[9].particleChildren.length,geometryDuringFrames:f.geometry,texturesDuringFrames:f.textures,atlases:f.atlases,
          releasedVineContexts:f.vineContexts?.filter(context=>context.destroyed).length??0,
          releasedArtContexts:f.artContexts?.filter(context=>context.destroyed).length??0,
          releasedGrassContexts:f.grassContexts?.filter(context=>context.destroyed).length??0,
          grassState:grassArt||sizeArt?f.ecology.grassCells.map(c=>[c.column,c.row,c.createdAt,c.lastInfluencedAt]):undefined,
          positions:f.garden.specimens.map(p=>[p.type,p.column,p.row,p.vigor,p.colorVariant,...(plants||grassArt||sizeArt?[p.stage]:[])])};
      },{plants,grassArt,sizeArt});
      assert.deepEqual(data.positions,fixture.positions);assert.equal(data.geometryDuringFrames,0);assert.equal(data.texturesDuringFrames,0);
      const vineCount=fixture.positions.filter(p=>p[0]==='vine').length;
      assert.equal(data.objects,14+(fullerGrass?3:0)+fixture.positions.length+vineCount+fixture.grass+fixture.puddles);assert.equal(data.particles,hurricane?400:0);
      if(grassArt||sizeArt)assert.deepEqual(data.grassState,fixture.grassState);
      if(!baseline){
        assert.equal(data.releasedVineContexts,80,'temporary vine Graphics contexts released after baking');
        assert.equal(data.releasedArtContexts,320,'all new construction contexts released');
        if(grassArt||sizeArt)assert.equal(data.releasedGrassContexts,12,'all temporary grass contexts released');
      }
      results.push({scene,...fixture,...data,canvasPaint});assert.deepEqual(errors,[]);
      await fs.writeFile(path.join(output,'measurements.json'),JSON.stringify({baseline,checkpoint,seconds,browser:browser.version(),results,errors},null,2));
      console.log(JSON.stringify({scene,objects:data.objects,linkStrokes:data.linkStrokes,interval:data.interval,submission:data.submission,canvasPaint}));
    }
    if(sizeArt&&!baseline){
      const sharp=require('sharp');
      for(const name of ['atlas.png','ecology-atlas.png']){
        const before=await sharp(path.join(artifactRoot,'before',name)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
        const after=await sharp(path.join(output,name)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
        assert.deepEqual(after.info,before.info);assert(after.data.equals(before.data),'cached artwork and ecology pixels unchanged');
      }
    }
    if(grassArt&&!baseline){
      const sharp=require('sharp');
      const raw=async(label,name)=>sharp(path.join(artifactRoot,label,name)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const beforePlants=await raw('before','atlas.png'),afterPlants=await raw(label,'atlas.png');
      assert.deepEqual(afterPlants.info,beforePlants.info);assert(afterPlants.data.equals(beforePlants.data),'all specimen/mutation/rain/probe atlas pixels unchanged');
      const old=await raw('before','ecology-atlas.png'),now=await raw(label,'ecology-atlas.png');
      assert.deepEqual(now.info,old.info);assert.equal(now.info.width,1664);assert.equal(now.info.height,128);
      const coverage={before:[],after:[]};
      for(let tile=0;tile<13;tile++){
        let ink=0,oldInk=0,edge=0,different=false;
        for(let y=0;y<128;y++)for(let x=0;x<128;x++){
          const pixel=(y*1664+tile*128+x)*4,alpha=now.data[pixel+3];
          ink+=Number(alpha>0);oldInk+=Number(old.data[pixel+3]>0);
          if(!x||!y||x===127||y===127)edge+=alpha;
          for(let channel=0;channel<4;channel++)if(now.data[pixel+channel]!==old.data[pixel+channel])different=true;
        }
        assert(ink>0,'nonblank ecology frame');
        if(tile===12)assert(!different,'puddle pixels remain identical');
        else {
          assert(different);assert.equal(edge,0,'grass has transparent atlas margins');
          assert(ink/16384>.01&&ink/16384<(greenGrass?.4:.18),'bounded blade coverage, not a solid carpet');
          if(!fullerGrass)assert(ink<oldInk/2,'soil gaps come from transparent artwork');
          coverage.before.push(oldInk/16384);coverage.after.push(ink/16384);
        }
      }
      if(fullerGrass){const sum=values=>values.reduce((a,b)=>a+b,0),ratio=sum(coverage.after)/sum(coverage.before);
        assert(ratio>1.08&&ratio<(greenGrass?15:1.6),'bounded increase in transparent blade coverage');coverage.ratio=ratio;}
      const bounds=JSON.parse(await fs.readFile(path.join(output,'grass-bounds.json'),'utf8'));
      for(const b of bounds)assert(b.x>=1&&b.y>=1&&b.x+b.width<=63&&b.y+b.height<=63,'grass paths stay inside tiles');
      await fs.writeFile(path.join(output,'atlas-pixel-checks.json'),JSON.stringify(coverage,null,2));
      console.log('PASS: all specimen/mutation/rain/probe and puddle pixels unchanged; 12 bounded nonblank grass frames with clear borders and soil gaps.');
      if(greenGrass&&!onlyScene){
        const sheet=await browser.newPage({viewport:{width:1640,height:900}}),figures=[];
        for(const scene of sceneNames){for(const [version,suffix] of [['before',''],['after',''],['before','-canvas'],['after','-canvas']]){
          const bytes=await fs.readFile(path.join(artifactRoot,version,scene+suffix+'.png'));
          figures.push(`<figure style="margin:0"><figcaption>${scene} · ${suffix?'Canvas':'Pixi'} ${version}</figcaption><img style="display:block;width:100%" src="data:image/png;base64,${bytes.toString('base64')}"></figure>`);
        }}
        await sheet.setContent(`<body style="margin:0;padding:12px;background:#17201b;color:#d4ded3;font:13px system-ui;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${figures.join('')}</body>`);
        await sheet.screenshot({path:path.join(artifactRoot,'comparison.png'),fullPage:true});await sheet.close();
      }
    }
    if(plants&&!baseline){
      const sharp=require('sharp'),beforePath=path.join(artifactRoot,'before','atlas.png'),afterPath=path.join(output,'atlas.png');
      const previous=await sharp(beforePath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const current=await sharp(afterPath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      assert.deepEqual(current.info,previous.info);assert.equal(current.info.width,2048);assert.equal(current.info.height,1536);
      const types=['flower','mushroom','broadleaf','vine','wirefern','redbloom','weed','ghostbloom','crystalfungus','blackthorn'];
      const keys=[];for(const type of types)for(let vigor=0;vigor<4;vigor++)for(let variant=0;variant<5;variant++)
        for(const stage of type==='redbloom'?['mature','fading']:['sprout','growing','mature','fading'])keys.push(`${type}:${stage}:${vigor}:${variant}`);
      keys.push('rain','probe','collectible_weed');assert.equal(keys.length,763);
      const unchanged=new Set(['vine','redbloom','rain','probe','collectible_weed']);
      for(let index=0;index<keys.length;index++){
        const x=index%32*64,y=Math.floor(index/32)*64,key=keys[index];let different=false,ink=0,edge=0;
        for(let row=0;row<64;row++)for(let column=0;column<64;column++){
          const pixel=((y+row)*2048+x+column)*4,alpha=current.data[pixel+3];ink+=Number(alpha>0);
          if(!row||!column||row===63||column===63)edge+=alpha;
          for(let channel=0;channel<4;channel++)if(previous.data[pixel+channel]!==current.data[pixel+channel])different=true;
        }
        assert(ink>0,key+' is not blank');
        if(unchanged.has(key.split(':')[0]))assert(!different,key+' must remain pixel-identical');
        else { assert(different,key+' artwork/scale changes');assert.equal(edge,0,key+' must have a clear atlas margin'); }
      }
      const redesigned=new Set(['broadleaf','weed','blackthorn']);
      for(const bounds of atlas.bounds)if(redesigned.has(keys[bounds.index]?.split(':')[0])){
        assert(bounds.graphics);assert(bounds.x>=.5&&bounds.y>=.5&&bounds.x+bounds.width<=31.5&&bounds.y+bounds.height<=31.5,
          keys[bounds.index]+' geometry escapes its tile');
      }
      console.log('PASS: 763 nonblank atlas tiles; vines/redbloom/rain/probe/collectible pixels unchanged; all edited tiles have clear margins and bounded geometry.');
    }
    if(!baseline){
      const before=await fs.readFile(path.join(artifactRoot,'before','measurements.json'),'utf8').then(JSON.parse).catch(()=>null);
      if(before)for(const result of results){
        const previous=before.results.find(item=>item.scene===result.scene);assert(previous,'baseline scene exists');
        assert.deepEqual(result.positions,previous.positions,'before/after fixture positions, variants and vigor match');
        if(grassArt||sizeArt)assert.deepEqual(result.grassState,previous.grassState,'before/after grass timestamps and cells match');
        assert.equal(result.objects,previous.objects);assert.deepEqual(result.atlases,previous.atlases);
        if(sizeArt){
          const oldLayouts=JSON.parse(await fs.readFile(path.join(artifactRoot,'before',`${result.scene}-layout.json`),'utf8'));
          const newLayouts=JSON.parse(await fs.readFile(path.join(output,`${result.scene}-layout.json`),'utf8'));
          assert.deepEqual(newLayouts.map(({viewport,canvas,scale,bands})=>({viewport,canvas,scale,bands})),
            oldLayouts.map(({viewport,canvas,scale,bands})=>({viewport,canvas,scale,bands})),'garden dimensions/contain letterboxing unchanged');
        }
        const oldPixels=await fs.readFile(path.join(artifactRoot,'before',`${result.scene}.png`));
        const newPixels=await fs.readFile(path.join(output,`${result.scene}.png`));assert(!oldPixels.equals(newPixels),'art visibly changes the fixture');
      }
    }
  }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
