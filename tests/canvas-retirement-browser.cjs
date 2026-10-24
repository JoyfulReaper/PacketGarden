// Installed Chrome: supported pages, bookmarks, missing WebGL and failed libraries.
if(!process.argv.includes('--run'))console.log('SKIP: Canvas retirement Chrome checks; pass --run.');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
  const assets=path.resolve('wwwroot'),output=path.resolve('artifacts/retire-canvas/compatibility');await fs.mkdir(output,{recursive:true});
  const server=http.createServer(async(req,res)=>{try{
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const p=path.resolve(assets,file);if(!p.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    const body=await fs.readFile(p);res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch{res.writeHead(404);res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let browser;const report=[];
  try{
    for(const disabled of [false,true]){
      browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true,args:disabled?['--disable-webgl','--disable-webgl2']:[]});
      for(const route of ['/','/pixi-live.html','/pixi-stress.html']){
        const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],missing=[],scripts=[];
        page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
        page.on('request',r=>{if(r.resourceType()==='script')scripts.push(new URL(r.url()).pathname);});
        await page.goto(origin+route);
        if(disabled){
          await page.waitForFunction(()=>document.querySelector('#view').getAttribute('role')==='alert');
          assert.match(await page.locator('#view').textContent(),/PacketGarden requires WebGL to display the garden\. Try a browser with WebGL enabled\./);
          assert(await page.getByRole('alert').isVisible());
          assert.equal(await page.evaluate(()=>{const c=document.createElement('canvas');return Boolean(c.getContext('webgl2')||c.getContext('webgl'));}),false);
          await page.screenshot({path:path.join(output,(route==='/'?'homepage':route.slice(1).replace('.html',''))+'-webgl-disabled.png'),fullPage:true});
        }else{
          await page.waitForSelector('#view canvas');
          await page.waitForFunction(()=>!(document.querySelector('#connection')??document.querySelector('#hud')).textContent.includes('initialization failed'));
          assert.equal(await page.getByRole('alert').count(),0);
          await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));
            Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
            Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;
            dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));});
        }
        assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert(!scripts.some(s=>/\/(?:garden|garden-(?:actors|perf|inspect|broadleaf|species-colors|collectibles|curiosities|drops|puddles|activity|frogs-canvas|lighting-canvas))\.js$/.test(s)));
        report.push({route,disabled,scripts:scripts.length,errors:errors.length});await page.close();
      }
      if(!disabled){
        const page=await browser.newPage(),requests=[];page.on('request',r=>requests.push(r.url()));await page.goto(origin+'/canvas.html');await page.waitForURL(origin+'/');await page.waitForSelector('#view canvas');
        assert(!requests.some(u=>/\/garden\.js(?:\?|$)/.test(u)));await page.close();
        const broken=await browser.newPage(),errors=[];broken.on('pageerror',e=>errors.push(e.stack));await broken.route('**/vendor/pixi/pixi.min.js',r=>r.abort());
        await broken.goto(origin+'/');await broken.waitForFunction(()=>document.querySelector('#view').getAttribute('role')==='alert');assert(await broken.getByRole('alert').isVisible());assert.deepEqual(errors,[]);await broken.close();
        const about=await browser.newPage();await about.goto(origin+'/about.html');assert(await about.getByRole('heading',{name:'Browser support'}).isVisible());assert.equal(await about.locator('a[href="canvas.html"]').count(),0);await about.close();
      }
      await browser.close();browser=null;
    }
    await fs.writeFile(path.join(output,'review.json'),JSON.stringify(report,null,2));console.log('PASS: all three Pixi pages, no retired/missing scripts, bookmark redirect, native Chrome WebGL disabled, missing Pixi library, visible friendly errors and repeated pagehide/visibility cleanup.');
  }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
