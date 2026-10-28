const assert=require('node:assert/strict'),fs=require('node:fs');
const {createNotifier,request}=require('../wwwroot/garden-visits.js');
const {start}=require('./pixi-default.cjs');
const html=fs.readFileSync('wwwroot/index.html','utf8'),diagnostic=fs.readFileSync('wwwroot/pixi-live.html','utf8');
assert.match(html,/<body[^>]*data-production-garden/);assert.doesNotMatch(diagnostic,/data-production-garden/);
for(const page of ['pixi-stress.html','about.html','canvas.html'])assert.doesNotMatch(fs.readFileSync('wwwroot/'+page,'utf8'),/data-production-garden/);
assert.deepEqual(request,{method:'POST',mode:'same-origin',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error'});
assert(!('body' in request));assert(!('headers' in request));
(async()=>{
  for(const production of [true,false]){
    let visible=false,calls=0;
    const n=createNotifier({production,isVisible:()=>visible,send(){calls++;return Promise.reject(Error('offline'));}});
    n.visible();assert.equal(calls,0);n.initialized();n.initialized();assert.equal(calls,0);
    visible=true;n.visible();for(let i=0;i<100;i++){n.visible();n.initialized();}assert.equal(calls,production?1:0);
    n.destroy();n.visible();n.initialized();assert.equal(calls,production?1:0);
  }
  {let calls=0;const n=createNotifier({production:true,isVisible:()=>true,send(){calls++;throw Error('sync');}});n.initialized();n.initialized();assert.equal(calls,1);}
  {let calls=0;const n=createNotifier({production:true,isVisible:()=>true,send(){calls++;}});n.destroy();n.initialized();assert.equal(calls,0);}
  for(const scenario of [{},{hidden:true},{fail:true},{pageHtml:diagnostic},{fetch:()=>Promise.reject(Error('network'))}]){
    const sent=[];const f=await start(scenario.fail,{...scenario,fetch:(...args)=>{sent.push(args);return scenario.fetch?.()??Promise.resolve();}});
    const production=scenario.pageHtml!==diagnostic&&!scenario.fail;
    assert.equal(sent.length,production&&!scenario.hidden?1:0);
    if(!scenario.fail){
      // Neither a reconnect, weather frame nor ongoing logical ticks creates visits.
      const s=f.sources[0];s.handlers.get('open')?.();s.handlers.get('error')?.();s.handlers.get('open')?.();
      s.handlers.get('weather')({data:JSON.stringify({level:'rain',eventsPerMinute:10})});
      for(let i=0;i<4;i++){f.doc.hidden=false;f.docHandlers.get('visibilitychange')();f.frame(1000);}
      assert.equal(sent.length,production?1:0);
      if(production){assert.equal(sent[0][0],'/api/garden/visit');assert.deepEqual(JSON.parse(JSON.stringify(sent[0][1])),request);}
      f.winHandlers.get('pagehide')({persisted:false});
    }else assert.equal(sent.length,0);
  }
  await Promise.resolve();console.log('PASS: production-only successful visible initialization, one attempt, hidden startup, duplicate callbacks, failure/diagnostic exclusions, SSE/weather independence, identifier-free request, no retries and teardown.');
})().catch(e=>{console.error(e);process.exitCode=1;});
