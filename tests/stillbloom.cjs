const assert=require('node:assert/strict'),fs=require('node:fs');
const G=require('../wwwroot/garden-core.js'),Q=require('../wwwroot/garden-stillbloom.js'),N=require('../wwwroot/garden-gnomes.js'),U=require('../wwwroot/garden-ui-core.js');
function fixture(roll=.1){
  let at=0,calls=0;const spawned=[];
  const garden=G.createGardenModel({now:()=>at,random:()=>.5});
  const model=Q.createModel({garden,now:()=>at,random:()=>{calls++;return roll;},onSpawn:p=>spawned.push(p)});
  const weather=(overrides={})=>model.setWeather({level:'quiet',hasSnapshot:true,telemetryHealthy:true,freshUntil:at+30000,telemetryGeneration:1,...overrides},at);
  const advance=(ms,renew=true)=>{const end=at+ms;while(at<end){at=Math.min(end,at+250);if(renew&&at%10000===0)weather();model.tick(at);}};
  model.configure({connected:true});weather();model.tick();
  return {garden,model,weather,advance,spawned,get at(){return at;},set at(value){at=value;},get calls(){return calls;}};
}
assert.deepEqual(Q.config,{qualifyMs:600000,checkEveryMs:180000,chance:.1,maxLiving:2,maxTickGapMs:1500,leaseMaxMs:35000});
for(const level of ['quiet','drizzle','rain','heavy_rain','botnet_thunderstorm','botnet_hurricane','Quiet',undefined]){
  const f=fixture();f.weather({level});assert.equal(Boolean(f.model.verified(f.at)),level==='quiet');
  if(level!=='quiet'){f.advance(600000,false);assert.equal(f.calls,0);assert.equal(f.model.snapshot().quietSince,null);}
}
for(const bad of [{hasSnapshot:false},{hasSnapshot:undefined},{telemetryHealthy:false},{telemetryHealthy:undefined},{freshUntil:null},{freshUntil:0},{freshUntil:35001},{telemetryGeneration:0}]){
  const f=fixture();f.weather(bad);assert(!f.model.verified(f.at));assert.equal(f.model.snapshot().quietSince,null);
}
{
  const f=fixture();f.weather({freshUntil:f.at+31000});assert(f.model.verified(f.at),'small positive server-clock skew does not reject healthy renewals');
}
for(const roll of [.099999999,.1,.100000001]){
  const f=fixture(roll);f.advance(599999);assert.equal(f.calls,0);f.advance(1);assert.equal(f.calls,1);
  assert.equal(f.spawned.length,roll<.1?1:0);f.model.tick(f.at);assert.equal(f.calls,1);
  f.advance(179999);assert.equal(f.calls,1);f.advance(1);assert.equal(f.calls,2);
  assert.equal(f.spawned.length,roll<.1?2:0);f.advance(180000);assert.equal(f.calls,roll<.1?2:3,'living cap consumes the deadline without rolling');
}
{
  const f=fixture(0);f.advance(599750);f.weather({level:'rain'});assert.equal(f.model.snapshot().quietSince,null);
  f.advance(250,false);assert.equal(f.calls,0);f.weather();const recovered=f.at;f.advance(599999);assert.equal(f.calls,0);f.advance(1);assert.equal(f.spawned.length,1);assert.equal(f.model.snapshot().quietSince,recovered);
  f.weather({telemetryHealthy:false,freshUntil:null});assert.equal(f.model.snapshot().quietSince,null);assert.equal(f.garden.specimens.length,1,'weather changes preserve flowers');
}
{
  const f=fixture(0);f.advance(590000);f.model.configure({connected:false});f.model.configure({connected:true});
  assert(!f.model.verified(f.at),'reconnect requires a new certificate, not cached quiet');f.weather();assert.equal(f.model.snapshot().quietSince,f.at);
  f.model.configure({live:false});f.advance(600000);assert.equal(f.calls,0);f.model.configure({live:true});assert.equal(f.model.snapshot().quietSince,f.at);
  f.advance(1000);f.weather({telemetryGeneration:2});assert.equal(f.model.snapshot().quietSince,f.at,'coalesced failure/recovery still breaks continuity');
}
{
  const f=fixture(0);f.advance(599750);f.model.configure({hidden:true});f.advance(600000);assert.equal(f.calls,0);
  f.model.configure({hidden:false});const resumed=f.at;f.model.tick();f.advance(599999);assert.equal(f.calls,0);f.advance(1);assert.equal(f.spawned.length,1);assert.equal(f.model.snapshot().quietSince,resumed);
}
{
  const f=fixture(0);f.advance(590000);f.at+=10000;f.weather();f.model.tick();assert.equal(f.calls,0,'unobserved logical stall never earns a catch-up roll');assert.equal(f.model.snapshot().quietSince,f.at);
  f.advance(30000,false);assert.equal(f.model.snapshot().quietSince,null,'exact upstream lease expiry resets quiet');
}
{
  const f=fixture();f.advance(10000);const before=f.model.snapshot().quietSince;
  f.at+=30000;f.weather();assert.equal(f.model.snapshot().quietSince,f.at,'a late same-generation renewal cannot bridge expiry between ticks');assert.notEqual(f.model.snapshot().quietSince,before);
}
{
  const f=fixture(0);f.advance(599750);f.garden.seed(Array.from({length:640},(_,i)=>({type:'broadleaf',column:i%32,row:Math.floor(i/32),vigor:0,createdAt:f.at})));
  f.garden.findReplacementCandidate=()=>{throw Error('ambient growth attempted replacement');};
  f.advance(250);assert.equal(f.calls,0);assert.equal(f.garden.specimens.length,640);
  f.garden.remove(f.garden.specimens[0]);f.advance(180000);assert.equal(f.spawned.length,1);assert.equal(f.garden.specimens.length,640);
}
{
  const f=fixture(0);for(let i=0;i<10;i++)f.model.spawnSimulated();assert.equal(f.garden.specimens.length,2);
  assert(G.isProtected('stillbloom'));assert.equal(G.normalizeGarden({specimenType:'stillbloom',listenPort:53,vigor:0}),null);
  const crew=N.createModel({garden:f.garden,getSpecimens:()=>f.garden.specimens,now:()=>f.at});
  assert.equal(crew.landscapingCandidates(f.at,'overcrowding').length,0);assert.equal(crew.landscapingCandidates(f.at,'vine').length,0);
  f.garden.specimens.forEach(p=>p.vigor=0);assert.equal(f.garden.findReplacementCandidate(3),null);
  const flower=f.garden.specimens[0],id=flower.id;
  for(const [age,stage] of [[0,'sprout'],[29999,'sprout'],[30000,'growing'],[89999,'growing'],[90000,'mature'],[1020000,'fading'],[1199999,'fading']]){
    f.garden.tick(age);assert.equal(f.garden.specimens[0].stage,stage);assert.equal(f.garden.specimens[0].id,id);
  }
  assert(Q.visual(flower,90000).alpha>Q.visual(flower,1100000).alpha);f.garden.tick(1200000);assert.equal(f.garden.specimens.length,0);
  const organic={...flower,origin:{kind:'quiet'}};assert.equal(U.inspection(organic,0).source,'Sustained quiet');
  for(const field of ['sensor','port','seenCount','vigor'])assert.equal(U.inspection(organic,0)[field],'—');
}
for(const name of ['garden-stillbloom.js','garden-stillbloom-dev.js'])assert.doesNotMatch(fs.readFileSync('wwwroot/'+name,'utf8'),/setInterval|setTimeout|requestAnimationFrame|EventSource|fetch\(|localStorage/);
console.log('PASS: exact verified quiet/health/lease/10m/.10/3m boundaries; no hidden/stalled/manual/reconnect credit, no retries, cap/free cells, competition/gnome exclusion, provenance and 20m lifecycle.');
