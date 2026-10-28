// Real production browser -> ASP.NET -> shared NuGet client -> controlled local Gateway double.
if(!process.argv.includes('--run'))console.log('SKIP: garden visit Chrome/ASP.NET integration; pass --run with installed Chrome/Playwright.');
else run().catch(error=>{console.error(error);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),fs=require('node:fs/promises'),{spawn,execFileSync}=require('node:child_process'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/garden-visits');await fs.mkdir(out,{recursive:true});
  execFileSync('dotnet',['build','PacketGarden.slnx','--no-restore','-p:BaseOutputPath='+path.join(out,'build')+path.sep],{cwd:root,windowsHide:true,stdio:'pipe'});
  const events=[];let gatewayMode=202,logs='',browser,host;
  const gateway=http.createServer(async(req,res)=>{
    if(req.url==='/snapshot'){res.setHeader('Content-Type','application/json');res.end('{"level":"quiet","eventsPerMinute":0}');return;}
    let body='';for await(const chunk of req)body+=chunk;
    events.push({method:req.method,url:req.url,headers:req.headers,body:JSON.parse(body)});
    if(gatewayMode==='timeout'){setTimeout(()=>res.destroy(),4000).unref();return;}
    res.writeHead(gatewayMode,{'Content-Type':'application/json'});res.end(gatewayMode===202?'{}':'{"error":"private-gateway-test-marker"}');
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  const reserve=http.createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
  const hostOrigin=`http://127.0.0.1:${port}`,key='local-test-only-not-a-real-secret-000000',gatewayUrl=`http://127.0.0.1:${gateway.address().port}/`;
  // A local transparent proxy can really sever an SSE transport, exercising the
  // browser's own EventSource retry against the actual ASP.NET stream.
  const streams=new Set();
  const proxy=http.createServer((req,res)=>{
    const upstream=http.request(hostOrigin+req.url,{method:req.method,headers:req.headers},response=>{
      res.writeHead(response.statusCode,response.headers);response.pipe(res);
    });
    if(req.url==='/api/garden/events'){streams.add(res);res.on('close',()=>streams.delete(res));}
    res.on('close',()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(upstream);
  });
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${proxy.address().port}`;
  const wait=async predicate=>{const end=Date.now()+15000;while(!predicate()){assert(Date.now()<end,'Timed out');await new Promise(r=>setTimeout(r,25));}};
  try{
    host=spawn('dotnet',[path.join(out,'build/Debug/net10.0/PacketGarden.dll'),'--urls',hostOrigin],{cwd:root,windowsHide:true,env:{...process.env,Nats__Url:'',Weather__SnapshotUrl:gatewayUrl+'snapshot',MissionControl__Enabled:'true',MissionControl__BaseUrl:gatewayUrl,MissionControl__ApiKey:key,MissionControl__TimeoutMilliseconds:'100',MissionControl__CloudflareAccessClientId:'',MissionControl__CloudflareAccessClientSecret:''}});
    host.stdout.on('data',d=>logs+=d);host.stderr.on('data',d=>logs+=d);host.on('error',e=>logs+=e.message);
    await wait(()=>logs.includes('Now listening on:'));assert.equal(host.exitCode,null);
    const html=await (await fetch(origin)).text();assert(!html.includes(key)&&!html.includes(gatewayUrl));assert.equal(events.length,0,'static HTML requests do not publish');
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true});
    const errors=[],report={browser:browser.version(),scenarios:[]};
    async function pageFor(flags={}){
      const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));
      await page.addInitScript(flags=>{
        const f=window.__visit={...flags,attempts:[],responses:[],streamOpens:0};
        Object.defineProperty(document,'hidden',{configurable:true,get:()=>Boolean(f.hidden)});
        const send=window.fetch;window.fetch=(url,options)=>{
          if(url==='/api/garden/visit'){f.attempts.push({url,options});if(f.rejectFetch)return Promise.reject(Error('offline test'));}
          return send(url,options).then(response=>{if(url==='/api/garden/visit')f.responses.push(response.status);return response;});
        };
        const Source=window.EventSource;window.EventSource=class extends Source{constructor(...args){super(...args);f.source=this;this.addEventListener('open',()=>f.streamOpens++);}};
      },flags);
      await page.route('**/pixi-live.js?*',async route=>{
        const response=await route.fetch();const body=await response.text();
        await route.fulfill({response,body:`{
          const f=window.__visit,create=PacketGardenVisits.createPageNotifier;PacketGardenVisits.createPageNotifier=(...args)=>f.notifier=create(...args);
          const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;
            if(f.failInit)return Promise.reject(Error('WebGL unavailable (visit test)'));
            return init.apply(this,args).then(value=>f.delayInit?new Promise(resolve=>{f.finishInit=()=>resolve(value);}):value);
          };
          const model=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(...args)=>f.model=model(...args);
        }\n`+body});
      });return page;
    }
    async function visibleVisit(route='/',flags={}){
      const before=events.length,page=await pageFor(flags);await page.goto(origin+route);
      if(flags.failInit){await page.waitForSelector('[data-initialization-failed]');assert.equal(await page.evaluate(()=>__visit.attempts.length),0);}
      else{
        await page.waitForFunction(()=>__visit.app?.ticker?.started);
        await page.waitForFunction(()=>__visit.attempts.length===1);
        await page.evaluate(()=>{for(let i=0;i<30;i++){__visit.notifier.initialized();__visit.notifier.visible();}});
        if(!flags.rejectFetch){await page.waitForFunction(()=>__visit.responses.length===1);await wait(()=>events.length===before+1);assert.deepEqual(await page.evaluate(()=>__visit.responses),[204]);}
        assert.equal(await page.evaluate(()=>__visit.attempts.length),1);
        const sent=await page.evaluate(()=>__visit.attempts[0]);assert.equal(sent.url,'/api/garden/visit');assert.equal(sent.options.credentials,'omit');assert.equal(sent.options.referrerPolicy,'no-referrer');assert(!('body'in sent.options)&&!('headers'in sent.options));
        assert.equal(await page.locator('#garden-score').textContent(),'Score: 0');
        assert.equal(await page.evaluate(()=>__visit.model.counts.acceptedLive),0);
      }
      report.scenarios.push({route,...flags,attempts:await page.evaluate(()=>__visit.attempts.length)});return page;
    }
    const first=await visibleVisit();await first.waitForFunction(()=>__visit.streamOpens===1);
    for(const stream of streams)stream.destroy();
    await first.waitForFunction(()=>__visit.streamOpens>=2,{},{timeout:15000});
    await first.evaluate(()=>{__visit.source.dispatchEvent(new MessageEvent('weather',{data:JSON.stringify({level:'rain',eventsPerMinute:10})}));__visit.notifier.initialized();});
    assert.equal(events.length,1);assert.equal(await first.evaluate(()=>__visit.attempts.length),1,'SSE reconnect and weather never send visits');
    await first.reload();await first.waitForFunction(()=>__visit.responses.length===1);await wait(()=>events.length===2);
    const second=await visibleVisit('/index.html');assert.equal(events.length,3,'reload and another tab are separate visits');await second.close();await first.close();
    const hidden=await pageFor({hidden:true,delayInit:true});const count=events.length;await hidden.goto(origin);
    await hidden.waitForFunction(()=>Boolean(__visit.finishInit));assert.equal(await hidden.evaluate(()=>__visit.attempts.length),0);
    await hidden.evaluate(()=>__visit.finishInit());await hidden.waitForFunction(()=>Boolean(__visit.model));
    assert.equal(await hidden.evaluate(()=>__visit.attempts.length),0,'completed hidden startup still waits');assert.equal(events.length,count);
    await hidden.evaluate(()=>{__visit.hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
    await hidden.waitForFunction(()=>__visit.responses.length===1);assert.equal(events.length,count+1);await hidden.close();
    const aborted=await pageFor({hidden:true,delayInit:true});const abortedCount=events.length;await aborted.goto(origin);
    await aborted.waitForFunction(()=>Boolean(__visit.finishInit));await aborted.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));__visit.finishInit();});
    await new Promise(r=>setTimeout(r,100));assert.equal(events.length,abortedCount);assert.equal(await aborted.evaluate(()=>__visit.attempts.length),0);await aborted.close();
    for(const route of ['/pixi-live.html','/pixi-stress.html','/about.html']){
      const before=events.length,page=await pageFor();await page.goto(origin+route);if(route==='/pixi-live.html')await page.waitForFunction(()=>__visit.app?.ticker?.started);
      assert.equal(await page.evaluate(()=>__visit.attempts.length),0);assert.equal(events.length,before);await page.close();
    }
    await (await visibleVisit('/',{failInit:true})).close();
    for(const mode of [401,503,'timeout']){gatewayMode=mode;await (await visibleVisit()).close();}
    await (await visibleVisit('/',{rejectFetch:true})).close();
    const ids=new Set();for(const event of events){
      assert.equal(event.method,'POST');assert.equal(event.url,'/api/events');assert.equal(event.headers['x-mission-control-key'],key);
      for(const h of ['referer','cookie','user-agent','origin','sec-fetch-site','x-forwarded-for'])assert(!event.headers[h],'Visitor header forwarded: '+h);
      assert.equal(event.body.eventType,'packetgarden.garden.visited');assert.equal(event.body.schemaVersion,1);
      assert.deepEqual(event.body.payload,{message:'Someone visited the garden!'});assert.equal(event.body.correlationId,null);
      assert.match(event.body.eventId,/^[a-f0-9-]{36}$/);assert(!ids.has(event.body.eventId));ids.add(event.body.eventId);assert.match(event.body.occurredAt,/(?:Z|\+00:00)$/);
      assert.deepEqual(Object.keys(event.body).sort(),['correlationId','eventId','eventType','occurredAt','payload','schemaVersion']);
    }
    assert.deepEqual(errors,[]);assert(!logs.includes(key)&&!logs.includes('private-gateway-test-marker'));
    report.events=events.map(e=>({eventId:e.body.eventId,eventType:e.body.eventType,schemaVersion:e.body.schemaVersion,payload:e.body.payload}));
    await fs.writeFile(path.join(out,'browser-review.json'),JSON.stringify(report,null,2));
    console.log('PASS: Chrome -> actual ASP.NET -> shared 0.0.3 client -> local Gateway double; exact envelope, production/root/index/reload/tab, duplicate callbacks, actual SSE reconnect/weather, hidden/deferred/aborted/failed init, diagnostic/stress exclusions, 401/503/timeout/fetch failure, no visitor metadata or secrets, Score: 0.');
  }finally{await browser?.close();host?.kill();proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));gateway.closeAllConnections();await new Promise(resolve=>gateway.close(resolve));}
}
