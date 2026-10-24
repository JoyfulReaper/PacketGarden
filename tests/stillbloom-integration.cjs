// Actual production scripts, one SSE, logical clocks and persistent rendering ownership.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
const quiet=at=>({level:'quiet',eventsPerMinute:9999,hasSnapshot:true,telemetryHealthy:true,freshUntil:at+30000,telemetryGeneration:1});
(async()=>{
  for(const reduced of [false,true]){
    const beforeObjects=h.live.size,beforeTextures=h.textureCount();
    const p=await start(false,{captureModel:true,reduced,random:()=>0});
    p.model.clear();p.ecology.clear();p.ecology.nextGrassSpreadAt=Infinity;
    const source=p.sources[0];source.onopen();
    function weather(frame){source.handlers.get('weather')({data:JSON.stringify(frame)});}
    weather(quiet(p.context.Date.now()));const startAt=p.context.Date.now();
    const counters=JSON.stringify(p.model.counts),recent=JSON.stringify(p.model.recentEvents);
    function advance(ms){const end=p.context.Date.now()+ms;while(p.context.Date.now()<end){const step=Math.min(250,end-p.context.Date.now());p.advance(step);
      if((p.context.Date.now()-startAt)%10000===0)weather(quiet(p.context.Date.now()));p.app.frame({lastTime:p.context.Date.now()});}}
    advance(599999);assert.equal(p.model.specimens.length,0);advance(1);
    assert.equal(p.model.specimens.length,1);
    const a=p.model.specimens[0];
    assert.equal(a.origin.kind,'quiet');assert.deepEqual(Object.keys(a.origin),['kind']);
    assert.equal(JSON.stringify(p.model.counts),counters);assert.equal(JSON.stringify(p.model.recentEvents),recent);
    assert.equal(p.app.stage.children[0].children[6].children.length,1);
    const textures=h.textureCount(),built=h.generated(),sprite=p.view.byId.get(a.id);
    advance(90000);assert.equal(a.stage,'mature');assert.equal(p.view.byId.get(a.id),sprite);
    assert.equal(h.generated(),built);assert.equal(h.textureCount(),textures);
    source.onerror();assert.equal(p.stillbloom.snapshot().quietSince,null);
    source.onopen();assert(!p.stillbloom.verified(p.context.Date.now()));
    weather(quiet(p.context.Date.now()));
    p.doc.hidden=true;p.docHandlers.get('visibilitychange')();p.advance(600000);
    p.doc.hidden=false;p.docHandlers.get('visibilitychange')();
    assert.equal(p.model.specimens.length,1,'resume never creates catch-up flowers');
    assert.equal(p.stillbloom.snapshot().quietSince,null,'expired upstream lease is not quiet on resume');
    // Day/night and manual weather affect presentation without becoming quiet evidence.
    if(reduced)p.lighting.setEnabled(false);else p.lighting.setMode('night');
    weather({...quiet(p.context.Date.now()),level:'rain'});assert.equal(p.stillbloom.snapshot().quietSince,null);
    assert.equal(p.model.specimens.length,1);
    p.model.clear();assert(!h.live.has(sprite));assert.equal(p.view.byId.size,0);
    const initial=h.live.size;
    for(let cycle=0;cycle<20;cycle++){
      const flower=p.stillbloom.spawnSimulated();assert(flower);const view=p.view.byId.get(flower.id);
      p.model.remove(flower,'expired');assert(!h.live.has(view));assert.equal(h.generated(),built);assert.equal(h.textureCount(),textures);assert.equal(h.live.size,initial);
    }
    p.winHandlers.get('pagehide')({persisted:false});
    assert.equal(h.live.size,beforeObjects);assert.equal(h.textureCount(),beforeTextures);assert.deepEqual(p.errors,[]);
  }
  for(const page of ['index.html'])assert(!fs.readFileSync('wwwroot/'+page,'utf8').includes('garden-stillbloom-dev.js'));
  console.log('PASS: actual Pixi organic-weather scheduling, no incoming counters/activity/provenance, cached lifecycle, disconnect/hidden/lighting independence, repeated growth/removal and complete teardown.');
})().catch(error=>{console.error(error);process.exitCode=1;});
