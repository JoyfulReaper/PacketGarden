// Optional real-Chrome/pixel regression. Uses an already available Playwright runtime;
// installs nothing and adds no application dependencies. Run with --run (see PIXI-LIVE.md).
// --unversioned is a negative control: it must reproduce the black cached-script homepage.
if (!process.argv.includes('--run')) {
  console.log('SKIP: optional Chrome cache/pixel test; pass --run with Playwright available.');
} else {
  run().catch(error => { console.error(error); process.exitCode = 1; });
}

async function run() {
  const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs/promises');
  const path = require('node:path'), {execFileSync} = require('node:child_process'), {inflateSync} = require('node:zlib');
  const {chromium} = require('playwright');
  const root = path.resolve(__dirname, '..'), assets = path.join(root, 'wwwroot');
  const checkpoint = '61090b7529b275e849b7fbad4e5fd3dcbead9d59';
  const legacy = new Map(['pixi-live.js','pixi-live.css'].map(file => [file,
    execFileSync('git', ['show', `${checkpoint}:wwwroot/${file}`], {cwd:root})]));
  const unversioned = process.argv.includes('--unversioned');
  const output = path.join(root, 'artifacts', unversioned ? 'homepage-negative' : 'homepage-browser');
  await fs.mkdir(output, {recursive:true});
  let promoted = false, connections = 0;
  const streams = new Set(), requests = [];
  const capture = `const init = PIXI.Application.prototype.init;
    PIXI.Application.prototype.init = function(...args) {
      window.__gardenTestApp = this; window.__gardenTestPaints = 0;
      const render = this.render;
      this.render = function(...args) { window.__gardenTestPaints++; return render.apply(this,args); };
      if (new URLSearchParams(location.search).has('fail-init')) return Promise.reject(new Error('WebGL unavailable (test)'));
      return init.apply(this,args);
    };`;
  // A test-only HTTP origin reproduces normal browser caching. Playwright routing
  // would disable HTTP caching and miss this bug. No production server code is changed.
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost'), file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      requests.push({url:req.url, promoted});
      if (file === 'favicon.ico') { res.writeHead(204); res.end(); return; }
      if (file === '__capture.js') { res.setHeader('Content-Type','text/javascript'); res.end(capture); return; }
      if (file === 'api/garden/events') {
        connections++; streams.add(res); res.on('close', () => streams.delete(res));
        res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
        res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0}\n\n'); return;
      }
      if (!promoted && legacy.has(file)) {
        res.writeHead(200, {'Content-Type':file.endsWith('.js') ? 'text/javascript' : 'text/css',
          'Last-Modified':new Date(Date.now()-5*86400000).toUTCString(), ETag:'"phase1a"'});
        res.end(legacy.get(file)); return;
      }
      const absolute = path.resolve(assets, file);
      if (!absolute.startsWith(assets + path.sep)) { res.writeHead(404); res.end(); return; }
      let body = await fs.readFile(absolute);
      if (file.endsWith('.html')) {
        let html = body.toString();
        // Warm the checkpoint's original unversioned URLs, even when the current
        // diagnostic page has acquired a newer artwork asset version.
        if (!promoted && file === 'pixi-live.html') html = html.replace(/(pixi-live\.(?:js|css))\?v=[^"\s]+/g,'$1');
        if (unversioned && file === 'index.html') html = html.replace(/(pixi-live\.(?:js|css))\?v=[^"\s]+/g,'$1');
        // Capture the actual application without changing its scheduling or drawing.
        html = html.replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,
          '<script src="/__capture.js" defer></script>\n$1');
        body = Buffer.from(html);
      }
      res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'text/css');
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL || 'chrome', headless:true});
    const context = await browser.newContext({viewport:{width:1280,height:900}, deviceScaleFactor:2});
    context.setDefaultTimeout(15000);
    const warm = await context.newPage();
    await warm.goto(origin + '/pixi-live.html');
    await warm.waitForFunction(() => window.__gardenTestPaints > 2);
    await warm.getByRole('button',{name:'Seed dense garden + ecology (local simulated)',exact:true}).click();
    await warm.waitForFunction(() => window.__gardenTestApp.stage.children[0].children[6].children.length === 640);
    await warm.close();
    promoted = true;
    const broadcast = event => { for (const stream of streams) stream.write(`event: garden\ndata: ${JSON.stringify(event)}\n\n`); };
    for (const route of ['/','/index.html']) {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(String(error.stack)));
      await page.goto(origin + route);
      console.log(`Checking cached upgrade at ${route}`);
      await page.waitForSelector('#view canvas');
      // Even an unstarted app creates a canvas: wait for a compositor screenshot,
      // then inspect its pixels, rather than treating canvas presence as success.
      const shot = await page.locator('#view canvas').screenshot({path:path.join(output,route === '/' ? 'root.png' : 'index.png')});
      const pixels = png(shot), soil = soilPixels(pixels);
      const state = await page.evaluate(() => {
        const app = window.__gardenTestApp, root = app.stage.children[0], canvas = app.canvas, rect = canvas.getBoundingClientRect();
        return {paints:window.__gardenTestPaints, started:app.ticker.started,
          backing:[canvas.width,canvas.height], css:[rect.width,rect.height],
          scale:[root.scale.x,root.scale.y], position:[root.position.x,root.position.y],
          scene:root.children.map(child => ({visible:child.visible,alpha:child.alpha})),
          soilInstructions:root.children[0].context.instructions.length, gridInstructions:root.children[1].context.instructions.length};
      });
      await fs.writeFile(path.join(output,route === '/' ? 'root.json' : 'index.json'),JSON.stringify({state,soil,errors,requests},null,2));
      assert(soil.coverage > .7 && soil.grid > .005, `blank/incorrect garden pixels: ${JSON.stringify(soil)}; errors: ${errors.join('; ')}`);
      assert(state.started && state.paints > 0); assert(state.soilInstructions && state.gridInstructions);
      assert([...state.scale,...state.position].every(Number.isFinite)); assert(state.scale.every(n => n > 0));
      assert(state.css.every(n => n > 0) && state.backing.every(n => n > 0)); assert.deepEqual(errors,[]);
      broadcast({specimenType:'flower',listenPort:53,vigor:2,sensor:'browser-fixture',seenCount:'12'});
      await page.waitForFunction(() => window.__gardenTestApp.stage.children[0].children[6].children.length === 1);
      await page.waitForFunction(before => window.__gardenTestPaints > before+2,state.paints);
      const point = await specimenPoint(page);
      const grown = png(await page.locator('#view canvas').screenshot());
      let changed = 0;
      for (let y = Math.max(0,point.pixelY-12); y < Math.min(grown.height,point.pixelY+12); y++) {
        for (let x = Math.max(0,point.pixelX-12); x < Math.min(grown.width,point.pixelX+12); x++) {
          if (Math.abs(grown.data[(y*grown.width+x)*grown.channels+1]-pixels.data[(y*pixels.width+x)*pixels.channels+1]) > 5) changed++;
        }
      }
      assert(changed > 5, 'SSE insertion must change displayed specimen pixels');
      for (const viewport of [{width:390,height:844},{width:1280,height:900}]) {
        await page.setViewportSize(viewport);
        await page.waitForFunction(() => {
          const app=window.__gardenTestApp,r=document.querySelector('#view').getBoundingClientRect();
          return app.renderer.screen.width===Math.round(r.width) && app.renderer.screen.height===Math.round(r.height);
        });
        const hit = await specimenPoint(page); await page.mouse.click(hit.x,hit.y);
        await page.getByRole('heading',{name:'Flower',exact:true}).waitFor();
        assert.equal(await page.locator('#specimen-sensor').textContent(),'browser-fixture');
        await page.getByRole('button',{name:'Close specimen information'}).click();
        assert(soilPixels(png(await page.locator('#view canvas').screenshot())).coverage > .7);
      }
      const beforeReconnect = connections;
      for (const stream of streams) stream.destroy();
      await page.waitForFunction(() => document.querySelector('#connection').textContent === 'disconnected/reconnecting');
      await page.waitForFunction(() => document.querySelector('#connection').textContent === 'connected',null,{timeout:15000});
      assert(connections > beforeReconnect);
      broadcast({specimenType:'flower',listenPort:53,vigor:0,sensor:'reconnected',seenCount:'2'});
      await page.waitForFunction(() => window.__gardenTestApp.stage.children[0].children[6].children.length === 2);
      assert.deepEqual(errors,[]); await page.close();
    }
    assert(requests.some(r => r.promoted && /^\/pixi-live\.js\?v=/.test(r.url)));
    assert(requests.some(r => r.promoted && /^\/pixi-live\.css\?v=/.test(r.url)));
    const diagnostic = await context.newPage();
    await diagnostic.goto(origin + '/pixi-live.html');
    await diagnostic.getByLabel('Weather source',{exact:true}).selectOption('manual');
    await diagnostic.getByLabel('Manual weather',{exact:true}).selectOption('botnet_hurricane');
    await diagnostic.getByRole('button',{name:'Seed dense garden + ecology (local simulated)',exact:true}).click();
    await diagnostic.waitForFunction(() => document.querySelector('#hud').textContent.includes('Specimens 640/640') && document.querySelector('#hud').textContent.includes('rain particles 400'));
    await diagnostic.close();
    const canvas = await context.newPage(); await canvas.goto(origin + '/canvas.html');
    await canvas.getByRole('button',{name:'Generate fake DNS event',exact:true}).click();
    assert.match(await canvas.locator('#garden-status').textContent(),/1 flower/); await canvas.close();
    const stress = await context.newPage(); await stress.goto(origin + '/pixi-stress.html');
    await stress.waitForFunction(() => document.querySelector('#hud').textContent.includes('WEBGL'));
    await stress.getByRole('combobox',{name:'Scene',exact:true}).selectOption('vines'); await stress.close();
    const unsupported = await context.newPage();
    await unsupported.goto(origin + '/?fail-init=1');
    await unsupported.waitForFunction(() => document.querySelector('#connection').textContent.startsWith('Garden initialization failed:'));
    assert(await unsupported.locator('#connection').isVisible());
    assert(await unsupported.getByRole('link',{name:'Canvas garden',exact:true}).isVisible());
    await unsupported.close();
    console.log('PASS: real Chrome HTTP-cache upgrade, root/index soil+grid pixels before events, visible SSE growth, inspection, DPR 2/resizes/reconnection, retained diagnostic/Canvas/stress pages.');
  } finally {
    if (browser) await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }

  async function specimenPoint(page) {
    return page.evaluate(() => {
      const app=window.__gardenTestApp,root=app.stage.children[0],sprite=root.children[6].children[0],r=app.canvas.getBoundingClientRect();
      const x=root.position.x+sprite.position.x*root.scale.x,y=root.position.y+(sprite.position.y-12)*root.scale.y;
      return {x:r.left+x*r.width/app.renderer.screen.width,y:r.top+y*r.height/app.renderer.screen.height,
        pixelX:Math.round(x*app.canvas.width/app.renderer.screen.width),pixelY:Math.round(y*app.canvas.height/app.renderer.screen.height)};
    });
  }
  // Chromium screenshot PNG decoder using only Node built-ins (8-bit RGB/RGBA).
  function png(bytes) {
    let width,height,channels; const chunks=[];
    for (let at=8;at<bytes.length;) {
      const size=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),body=bytes.subarray(at+8,at+8+size); at+=size+12;
      if(type==='IHDR'){width=body.readUInt32BE(0);height=body.readUInt32BE(4);assert.equal(body[8],8);channels=body[9]===2?3:body[9]===6?4:0;assert(channels);assert.equal(body[12],0);}
      if(type==='IDAT')chunks.push(body);
    }
    const scan=inflateSync(Buffer.concat(chunks)),stride=width*channels,data=Buffer.alloc(stride*height);let source=0;
    const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
    for(let y=0;y<height;y++){
      const filter=scan[source++];assert(filter<=4);
      for(let x=0;x<stride;x++){
        const at=y*stride+x,a=x>=channels?data[at-channels]:0,b=y?data[at-stride]:0,c=y&&x>=channels?data[at-stride-channels]:0;
        data[at]=(scan[source++]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;
      }
    }
    return {width,height,channels,data};
  }
  function soilPixels(image) {
    const scale=Math.min(image.width/960,image.height/600),left=(image.width-960*scale)/2,top=(image.height-600*scale)/2;
    let total=0,soil=0,grid=0;
    for(let y=Math.floor(top+150*scale);y<top+450*scale;y++)for(let x=Math.floor(left+240*scale);x<left+720*scale;x++){
      const at=(y*image.width+x)*image.channels,r=image.data[at],g=image.data[at+1],b=image.data[at+2];total++;
      if(r>=40&&r<=115&&g>=40&&g<=115&&b>=20&&b<=85&&r>=g-2&&g>b+10){soil++;if(r+g+b>228)grid++;}
    }
    return {coverage:soil/total,grid:grid/total};
  }
}
