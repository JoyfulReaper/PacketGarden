const assert=require('node:assert/strict'),fs=require('node:fs');
const Core=require('../wwwroot/garden-core.js'),G=require('../wwwroot/garden-gnomes.js'),I=require('../wwwroot/garden-interaction.js');
const C=G.campfireConfig;
function fixture({count=35,logs=1,mushrooms=0,remaining=3600000,reduced=false,simulated=true,full=false}={}){
  let at=5000000,gnomes,onBurn=()=>{};const changes=[],cues=[],pants=[];
  const garden=Core.createGardenModel({now:()=>at,random:()=>0,terrainRandom:()=>0,competitionRandom:()=>.99,onChange:c=>{
    changes.push(c);if(c.kind==='terrain-removed'){gnomes?.terrainRemoved(c.terrain,at);if(c.reason==='gnome-campfire')onBurn();}
  }});
  const logCells=Array.from({length:logs},(_,i)=>330+i*2),used=new Set(logCells);
  const entries=logCells.map(cell=>({type:'blackthorn',vigor:1,column:cell%32,row:Math.floor(cell/32),
    createdAt:at-Core.timings.blackthorn.expiredAfterMs-Core.terrainConfig.lifetimeMs+remaining,
    origin:{kind:simulated?'simulated':'tcpnoise',eventType:'log-fixture'}}));
  for(let cell=0,i=0;cell<640&&i<(full?640-logs:count);cell++)if(!used.has(cell)){
    entries.push({type:full?'ghostbloom':i<mushrooms?'mushroom':'broadleaf',vigor:i%4,colorVariant:0,column:cell%32,row:Math.floor(cell/32),
      createdAt:at-65000,origin:{kind:simulated?'simulated':'tcpnoise',eventType:'campfire-fixture'}});i++;
  }
  garden.seed(entries);garden.forceLogFixture();garden.tick(at);const original=[...garden.terrain.logs];
  gnomes=G.createModel({garden,getSpecimens:()=>garden.specimens,now:()=>at,random:()=>.99,getReducedMotion:()=>reduced,
    puddleRandom:()=>.99,onCue:c=>cues.push(c),onUnderpantsAttempt:p=>pants.push(p)});
  const step=ms=>{while(ms>0){const dt=Math.min(250,ms);at+=dt;garden.tick(at);gnomes.tick(at);ms-=dt;}};
  return{garden,gnomes,changes,cues,pants,original,step,get at(){return at},jump(ms){at+=ms;},setOnBurn(fn){onBurn=fn;},
    removed:()=>changes.filter(c=>c.kind==='terrain-removed'),start(roll=()=>0){return gnomes.startCampfire(at,roll);}};
}
assert.deepEqual(C,{incidentShare:.4,gatherAfterMs:2500,igniteAfterMs:4000,charAfterMs:15000,consumeAfterMs:17000,finishedAfterMs:21000,maxTickGapMs:1500,maxActors:3});
// Existing base/heist draws stay first and unchanged. Campfire only takes ordinary-dispute outcomes.
for(const [rolls,expected,draws] of [
  [[.02],'idle',1],[[.019999,.299999,0],'gnome_heist',3],
  [[.019999,.3,.399999,0,0],'gnome_campfire',5],[[.019999,.3,.4,0,0],'gnome_incident',5]
]){
  const f=fixture({mushrooms:4});let index=0;f.jump(45000);f.gnomes.tick(f.at,()=>{assert(index<rolls.length);return rolls[index++];});
  assert.equal(f.gnomes.incident?.type??'idle',expected);assert.equal(index,draws);assert.equal(f.gnomes.nextCheckAt,f.at+45000);
}
{
  const f=fixture({mushrooms:4,logs:0});let n=0;f.jump(45000);f.gnomes.tick(f.at,()=>[.019999,.3,.5,.5][n++]);
  assert.equal(f.gnomes.incident.type,'gnome_incident');assert.equal(n,4,'no log branch draw without a candidate');
}
{
  const f=fixture();let n=0;f.jump(45000);f.gnomes.tick(f.at,()=>[.019999,.399999,0,.5][n++]);
  assert.equal(f.gnomes.incident.type,'gnome_campfire');assert.equal(n,4);assert.equal(f.gnomes.actors.length,3);
}
for(const options of [{logs:0},{count:29},{remaining:0}]){const f=fixture(options);assert.equal(f.start(),false);}
{
  const f=fixture({logs:6});assert(f.gnomes.startCampfire(f.at,()=>.999));assert.equal(f.gnomes.incident.target.log,f.original.at(-1));
  assert.equal(f.gnomes.actors.length,3);assert(!f.start());assert(!f.gnomes.startHeist(f.at));assert(!f.gnomes.start(f.at));
}
{
  const f=fixture({simulated:false});assert.equal(f.gnomes.startCampfire(f.at,()=>0,true),false);assert(f.start());assert.equal(f.gnomes.actors.length,2);
}
{
  const f=fixture({full:true}),log=f.original[0],before=JSON.stringify(f.garden.specimens),changes=f.changes.length;
  const originalRemove=f.garden.terrain.remove;let calls=0;
  f.garden.terrain.remove=(p,reason)=>{assert.equal(p,log);assert.equal(reason,'gnome-campfire');calls++;return originalRemove(p,reason);};
  assert(f.start());assert.deepEqual(f.cues,['arrival']);f.step(2499);assert.equal(f.gnomes.incident.phase,'approach');
  f.step(1);assert.equal(f.gnomes.incident.phase,'gather');f.step(1499);assert.equal(f.gnomes.incident.phase,'gather');
  f.step(1);assert.equal(f.gnomes.incident.phase,'burning');f.step(11000);assert(f.gnomes.incident.charred);
  f.step(1999);assert.equal(f.garden.freeCellCount(),0);assert.equal(f.garden.terrain.byCell.get(log.cell),log);
  assert.equal(f.garden.addSpecimen('flower',0),null,'blocked saturation has no replaceable residents');
  f.step(1);assert.equal(calls,1);assert.equal(f.garden.freeCellCount(),1);assert.equal(f.gnomes.incident.phase,'departure');
  assert.equal(f.gnomes.incident.removals,1);assert.equal(f.gnomes.incident.target,null);assert.equal(f.garden.terrain.logs.length,0);
  assert.equal(originalRemove(log),false);assert.equal(JSON.stringify(f.garden.specimens),before);
  const planted=f.garden.addSpecimen('flower',0).specimen;assert.equal(planted.cell,log.cell,'ordinary placement uses genuinely freed cell');
  f.step(4000);assert.equal(f.gnomes.incident,null);assert.equal(f.gnomes.actors.length,0);assert.equal(calls,1);
  assert.deepEqual(f.changes.slice(changes).filter(c=>c.kind==='terrain-removed').map(c=>c.reason),['gnome-campfire']);
  assert(!f.start(),'consumed log cannot burn again');
}
// Exact object/list/map identity and every captured coordinate/time are revalidated.
for(const age of [1000,8000,16750])for(const key of ['id','cell','column','row','createdAt','expiresAt','object','list','map']){
  const f=fixture(),log=f.original[0];f.start();f.step(age);
  if(key==='object'){const other=Object.freeze({...log});f.garden.terrain.logs.splice(0,1,other);f.garden.terrain.byCell.set(log.cell,other);}
  else if(key==='list')f.garden.terrain.logs.splice(0,1);
  else if(key==='map')f.garden.terrain.byCell.delete(log.cell);
  else f.gnomes.incident.target[key]++;
  f.step(250);assert.equal(f.gnomes.incident,null,key);assert.equal(f.removed().length,0);assert.equal(f.gnomes.actors.length,0);
}
for(const remaining of [4000,17000]){
  const f=fixture({remaining});f.start();f.step(remaining);assert.equal(f.gnomes.incident,null);
  assert.deepEqual(f.removed().map(c=>c.reason),['expired']);assert(!f.garden.terrain.isBlocked(f.original[0].cell));
}
{
  const f=fixture({remaining:4000});f.start();f.step(3750);f.jump(250);f.gnomes.tick(f.at);
  assert.equal(f.gnomes.incident,null);assert.equal(f.removed().length,0,'gnomes never burn unswept expired terrain');f.garden.tick(f.at);assert.equal(f.removed()[0].reason,'expired');
}
for(const age of [1500,8000,18000])for(const mode of ['hidden','tick-gap','render-gap','backwards']){
  const f=fixture(),log=f.original[0];f.start();f.step(age);const removed=f.removed().length;
  if(mode==='hidden'){f.gnomes.suspend(f.at);f.jump(120000);f.gnomes.resetCadence(f.at);}
  else{f.jump(mode==='backwards'?-1:1501);if(mode==='render-gap')f.gnomes.advance(f.at);else f.gnomes.tick(f.at);}
  assert.equal(f.gnomes.incident,null);assert.equal(f.gnomes.actors.length,0);assert.equal(f.removed().length,removed);
  assert.equal(f.gnomes.nextCheckAt,f.at+45000);assert.equal(f.garden.terrain.isBlocked(log.cell),age<17000);
}
{
  const f=fixture();f.start();f.step(2500);f.jump(1500);f.gnomes.tick(f.at);assert.equal(f.gnomes.incident.phase,'burning','exact allowed gap boundary');
}
for(const age of [1000,8000]){
  const f=fixture(),log=f.original[0];f.start();f.step(age);const target=f.gnomes.incident;
  f.garden.terrain.remove(log,'test-external');assert.equal(f.gnomes.incident,null);assert.equal(target.target,null);f.step(20000);
  assert.deepEqual(f.removed().map(c=>c.reason),['test-external']);
}
{
  const f=fixture();f.start();f.setOnBurn(()=>f.gnomes.clear());f.step(17000);assert.equal(f.gnomes.incident,null);assert.equal(f.removed().length,1,'synchronous lifecycle observers can clear safely');
}
{
  const f=fixture();f.start();f.garden.terrain.remove=()=>false;f.step(17000);assert.equal(f.gnomes.incident,null);assert.equal(f.garden.terrain.logs.length,1,'failed removal never claims consumption');
}
{
  const f=fixture({reduced:true});f.start();const actor=f.gnomes.actors[0],start=actor.x;
  f.step(2000);assert.equal(actor.x,start);f.step(500);assert.equal(actor.x,actor.targetX);f.step(1500);
  for(const a of f.gnomes.actors)G.presentation(a,f.at,true);
  assert.equal(I.resolve({x:actor.x,y:actor.y},{specimens:f.garden.specimens,curiosities:[],drops:[],gnomes:f.gnomes},f.at).kind,'gnome');
  assert(f.gnomes.click(actor,f.at));assert(f.gnomes.click(actor,f.at));assert.equal(f.pants.length,1);
  f.step(13000);assert.equal(f.gnomes.incident.phase,'departure');assert.equal(f.gnomes.actors[0],actor);
  G.presentation(actor,f.at,true);assert(f.gnomes.click(actor,f.at));assert.equal(f.pants.length,1);f.step(4000);assert(!f.gnomes.click(actor,f.at));
}
for(const name of ['garden-gnomes','pixi-live-gnomes'])assert.doesNotMatch(fs.readFileSync(`wwwroot/${name}.js`,'utf8'),/setTimeout|setInterval|requestAnimationFrame|EventSource|fetch\(/);
console.log('PASS: exact 2%/unchanged 30% heist/40% campfire branches, candidates/count/single incident, all identity fields and lifetime revalidation, authoritative one-time removal/real full-garden occupancy/regrowth, hidden/stall/backwards safety, synchronous observers, reduced motion and existing click priority/underpants.');

// Actual startup/view ownership: repeated cached fire/char frames, all cleanup paths, no artwork or event churn.
(async()=>{
  const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
  for(const page of ['index.html','pixi-live.html']){
    const f=await start(false,{pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8'),captureModel:true,random:()=>.5});
    const beforeTextures=h.textureCount(),beforeBakes=h.generated();
    for(let pass=0;pass<30;pass++){
      f.gnomes.clear();const log=f.model.seedCampfire(),source=f.view.terrainViews.get(log),originalTexture=source.texture;
      const counts={...f.model.counts},recent=JSON.stringify(f.model.recentEvents);
      f.gnomes.resetCadence();assert(f.gnomes.startCampfire(f.context.Date.now(),()=>pass%2?.75:0));
      for(let i=0;i<60;i++)f.frame(250);
      const group=f.app.stage.children[0].children[8].children[0],sprites=[...group.children];
      assert(sprites.some(s=>s.tint===0x312a25));assert.equal(source.texture,originalTexture);assert.equal(source.tint,undefined,'real terrain Sprite unchanged');
      if(pass%3===0){f.doc.hidden=true;f.docHandlers.get('visibilitychange')();f.doc.hidden=false;f.docHandlers.get('visibilitychange')();}
      else if(pass%3===1)f.model.terrain.remove(log,'test-remove');
      else for(let i=0;i<24;i++)f.frame(250);
      assert.equal(f.gnomes.incident,null);assert.equal(f.app.stage.children[0].children[8].children.length,0);
      assert(sprites.every(s=>!h.live.has(s)));assert.equal(h.textureCount(),beforeTextures);assert.equal(h.generated(),beforeBakes);
      assert.deepEqual({...f.model.counts},counts);assert.equal(JSON.stringify(f.model.recentEvents),recent);assert.equal(f.element('#garden-score').textContent,'Score: 0');
      assert.equal(source.texture,originalTexture);
    }
    assert.deepEqual(f.errors,[]);f.winHandlers.get('pagehide')({persisted:false});
  }
  console.log('PASS: both real entry points, actual terrain Sprite/atlas ownership, 60 fire+char cancellation/consumption cleanup cycles, no extra bakes/textures, no fabricated counts/activity or score, preserved source appearance and teardown.');
})().catch(e=>{console.error(e);process.exitCode=1;});
