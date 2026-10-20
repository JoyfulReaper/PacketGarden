// Optional reproducible vine-art comparison with installed Chrome/available Playwright.
// No packages are installed. --baseline serves the unchanged a7e391c renderer.
// Example: node tests/pixi-vine-art-browser.cjs --run --baseline --seconds=20
if (!process.argv.includes('--run')) console.log('SKIP: optional vine-art browser fixture; pass --run.');
else run().catch(error => { console.error(error); process.exitCode = 1; });

async function run() {
  const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
  const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),baseline=process.argv.includes('--baseline');
  const seconds=Number(process.argv.find(arg=>arg.startsWith('--seconds='))?.split('=')[1]??20);
  assert(seconds>=5&&seconds<=60);
  const label=process.argv.find(arg=>arg.startsWith('--label='))?.split('=')[1]??(baseline?'before':'after');
  const sceneNames=['vines-quiet','vines-hurricane','mixed-hurricane'];
  const onlyScene=process.argv.find(arg=>arg.startsWith('--scene='))?.split('=')[1];
  assert(!onlyScene||sceneNames.includes(onlyScene));
  assert(/^[a-z0-9-]+$/.test(label));
  const output=path.join(root,'artifacts','vine-art',label);await fs.mkdir(output,{recursive:true});
  const oldRenderer=baseline?execFileSync('git',['show','a7e391cf0f8a614d763d6fa86f9f474d4a2dd075:wwwroot/pixi-live.js'],{cwd:root}):null;
  const capture=`
    const fixture=window.__vineFixture={paints:[],gaps:[],geometry:0,textures:0,atlases:[],last:null};
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
          if(options.frame.width===1024)fixture.vineContexts=options.target.children.filter(child=>child instanceof PIXI.Graphics).slice(0,80).map(child=>child.context);
          return generate(options);};
        return result;
      });
    };
    for(const name of ['clear','stroke']){const original=PIXI.Graphics.prototype[name];
      PIXI.Graphics.prototype[name]=function(...args){fixture.geometry++;return original.apply(this,args);};}
    for(const [api,name,key] of [[PacketGardenCore,'createGardenModel','garden'],[PacketGardenEcology,'createEcologyModel','ecology']]){
      const original=api[name];api[name]=function(...args){const model=original(...args);fixture[key]=model;return model;};}
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
      let body=file==='pixi-live.js'&&oldRenderer?oldRenderer:await fs.readFile(absolute);
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
    const results=[];
    for(const scene of onlyScene?[onlyScene]:sceneNames){
      const hurricane=scene.endsWith('hurricane');
      for(const stream of streams)stream.write(`event: weather\ndata: ${JSON.stringify({level:hurricane?'botnet_hurricane':'quiet',eventsPerMinute:hurricane?10000:0})}\n\n`);
      const fixture=await page.evaluate(scene=>{
        const f=window.__vineFixture,at=Date.now(),mixed=scene.startsWith('mixed');window.__resetVineRandom();
        const start=performance.now();
        f.garden.seed(Array.from({length:640},(_,cell)=>({type:mixed?PacketGardenCore.species[cell%10]:'vine',
          column:cell%32,row:Math.floor(cell/32),vigor:cell%4,createdAt:at-(mixed&&cell%10===5?5000:120000),origin:{kind:'simulated',eventType:'vine-art-fixture'}})),at);
        f.ecology.seed({grassCells:Array.from({length:640},(_,cell)=>({column:cell%32,row:Math.floor(cell/32),createdAt:at-60000,lastInfluencedAt:at})),
          puddles:Array.from({length:8},(_,i)=>({x:150+i%4*210,y:180+Math.floor(i/4)*240,seed:i/8,size:18,maxSize:18,createdAt:at-20000,lastRefreshedAt:at}))});
        return {buildMs:performance.now()-start,positions:f.garden.specimens.map(p=>[p.type,p.column,p.row,p.vigor,p.colorVariant])};
      },scene);
      await page.waitForTimeout(1000);
      await page.locator('#view canvas').screenshot({path:path.join(output,`${scene}.png`)});
      await page.evaluate(()=>{const f=window.__vineFixture;f.paints=[];f.gaps=[];f.last=null;f.geometry=0;f.textures=0;});
      console.log(`Measuring ${label}: ${scene} for ${seconds}s`);
      await page.waitForTimeout(seconds*1000);
      const data=await page.evaluate(()=>{
        const f=window.__vineFixture,root=f.app.stage.children[0];
        const stats=values=>{const sorted=values.slice().sort((a,b)=>a-b);return {n:values.length,avg:values.reduce((a,b)=>a+b,0)/values.length,
          p95:sorted[Math.floor((sorted.length-1)*.95)],p99:sorted[Math.floor((sorted.length-1)*.99)],max:sorted.at(-1),over50:values.filter(v=>v>50).length,over300:values.filter(v=>v>300).length};};
        const count=node=>1+(node.children?.reduce((total,child)=>total+count(child),0)??0);
        return {submission:stats(f.paints),interval:stats(f.gaps),objects:count(f.app.stage),
          vineViews:root.children[5].children.length,linkStrokes:root.children[5].children.reduce((n,g)=>n+g.context.instructions.length,0),
          particles:root.children[9].particleChildren.length,geometryDuringFrames:f.geometry,texturesDuringFrames:f.textures,atlases:f.atlases,
          releasedVineContexts:f.vineContexts?.filter(context=>context.destroyed).length??0,
          positions:f.garden.specimens.map(p=>[p.type,p.column,p.row,p.vigor,p.colorVariant])};
      });
      assert.deepEqual(data.positions,fixture.positions);assert.equal(data.geometryDuringFrames,0);assert.equal(data.texturesDuringFrames,0);
      assert.equal(data.objects,scene.startsWith('mixed')?1366:1942);assert.equal(data.particles,hurricane?400:0);
      if(!baseline)assert.equal(data.releasedVineContexts,80,'all temporary vine Graphics contexts released after baking');
      results.push({scene,...fixture,...data});assert.deepEqual(errors,[]);
      await fs.writeFile(path.join(output,'measurements.json'),JSON.stringify({baseline,seconds,results,errors},null,2));
      console.log(JSON.stringify({scene,objects:data.objects,linkStrokes:data.linkStrokes,interval:data.interval,submission:data.submission}));
    }
    if(!baseline){
      const before=await fs.readFile(path.join(root,'artifacts','vine-art','before','measurements.json'),'utf8').then(JSON.parse).catch(()=>null);
      if(before)for(const result of results){
        const previous=before.results.find(item=>item.scene===result.scene);assert(previous,'baseline scene exists');
        assert.deepEqual(result.positions,previous.positions,'before/after fixture positions, variants and vigor match');
        assert.equal(result.objects,previous.objects);assert.deepEqual(result.atlases,previous.atlases);
        const oldPixels=await fs.readFile(path.join(root,'artifacts','vine-art','before',`${result.scene}.png`));
        const newPixels=await fs.readFile(path.join(output,`${result.scene}.png`));assert(!oldPixels.equals(newPixels),'art visibly changes the fixture');
      }
    }
  }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
