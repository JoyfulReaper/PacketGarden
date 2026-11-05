const assert=require('node:assert/strict');
const G=require('../wwwroot/garden-core.js'),B=require('../wwwroot/garden-traffic-blooms.js'),C=require('../wwwroot/pixi-live-core.js');
const event={specimenType:'flower',vigor:0,listenPort:53,sensor:'real',seenCount:'42'};
function fixture({roll=0,selection=0,competition=.99}={}){
  let at=100000,calls=0,competitionCalls=0,randomCalls=0,live=0,activity=0;
  const changes=[],m=C.createModel({add(){},update(){},remove(){},influenceChange:c=>changes.push(c)},
    {now:()=>at,random:()=>{randomCalls++;return .5;},competitionRandom:()=>{competitionCalls++;return competition;},
      influenceRandom:()=>calls++%2?selection:roll,onLive:()=>live++,onActivity:()=>activity++});
  m.seedTrafficBlooms();
  return {m,changes,setTime:t=>at=t,advance:ms=>{at+=ms;m.tick(at);},get at(){return at;},get calls(){return calls;},
    get competitionCalls(){return competitionCalls;},get randomCalls(){return randomCalls;},get live(){return live;},get activity(){return activity;}};
}
for(const [roll,expected] of [[0,1],[.199999999,1],[.2,0],[1,0],[-.1,0],[NaN,0]]){
  const f=fixture({roll}),before=f.randomCalls,result=f.m.acceptEvent(event);
  assert.equal(result.outcome,'dropped');assert.equal(f.m.influences.active.size,expected);assert.equal(f.randomCalls,before);
  assert.equal(f.competitionCalls,2);assert.equal(f.calls,expected?2:1);
  assert.equal(f.m.counts.acceptedLive,0);assert.equal(f.m.counts.droppedSaturated,1);assert.equal(f.m.counts.replacements,0);
  assert.equal(f.m.counts.lifecycleRemovals,0);assert.equal(f.live,0);assert.equal(f.activity,1);assert.equal(f.m.recentEvents[0].outcome,'dropped');
}
{
  const f=fixture({competition:0});assert.equal(f.m.acceptEvent(event).outcome,'replaced');assert.equal(f.calls,0);
  assert.equal(f.m.competitionSnapshot().remainingMs,15000);assert.equal(f.m.counts.acceptedLive,1);
  f.m.acceptEvent(event);assert.equal(f.competitionCalls,2);assert.equal(f.m.influences.active.size,1);
}
{
  const f=fixture();f.m.remove(f.m.specimens[0]);assert.equal(f.m.acceptEvent(event).outcome,'spawned');assert.equal(f.calls,0);
  f.m.clear();assert.equal(f.m.acceptEvent(event).outcome,'spawned');assert.equal(f.calls,0);
}
for(const type of ['mushroom','broadleaf','vine','weed','redbloom','wirefern','ghostbloom']){
  const f=fixture();assert.equal(f.m.acceptEvent({...event,specimenType:type}).outcome,'dropped');assert.equal(f.calls,0);
}
{
  const f=fixture();f.m.setPaused(true);assert.equal(f.m.acceptEvent(event).outcome,'paused');assert.equal(f.calls,0);
  assert.equal(f.m.acceptEvent({}).outcome,'invalid');f.m.setPaused(false);
  const p=f.m.specimens[0],before=JSON.stringify(p);f.m.acceptEvent(event);assert.equal(JSON.stringify(p),before);
  for(let i=0;i<100;i++)f.m.acceptEvent(event);assert.equal(f.calls,2);assert.equal(f.m.influences.active.size,1);
  f.advance(2000);assert.equal([...f.m.influences.active.values()][0].stage,'open');f.advance(3000);f.advance(3000);
  assert.equal([...f.m.influences.active.values()][0].stage,'fade');f.advance(4000);assert.equal(f.m.influences.active.size,0);
  assert.equal(f.m.influences.counts.completed,1);assert.equal(JSON.stringify(p),before);
  f.m.acceptEvent(event);assert.equal(f.calls,2);f.advance(3000);f.m.acceptEvent(event);assert.equal(f.calls,4);
}
// Uniform selection across the eligible set, including the last interval.
for(const selection of [0,.1,.5,.999999]){
  const f=fixture({selection});f.m.acceptEvent(event);assert.equal([...f.m.influences.active.keys()][0],f.m.specimens[Math.floor(selection*640)]);
}
for(const property of ['mutation','pendingMutation','poppyMutation','protected','special','temporaryBloom','trafficBloom']){
  const f=fixture();for(const p of f.m.specimens)p[property]=property==='mutation'?{expiresAt:200000}:property==='pendingMutation'?{type:'collectible_weed',activateAt:200000}:true;
  f.m.acceptEvent(event);assert.equal(f.calls,0,property);assert.equal(f.m.influences.active.size,0);
}
for(const age of [0,20000,180000]){
  const f=fixture();for(const p of f.m.specimens)p.createdAt=f.at-age;
  f.m.acceptEvent(event);assert.equal(f.calls,0,'only mature');
}
for(const key of ['id','type','cell','column','row','createdAt']){
  const f=fixture();f.m.acceptEvent(event);const p=[...f.m.influences.active.keys()][0];p[key]=key==='type'?'broadleaf':p[key]+1;
  f.m.tick();assert.equal(f.m.influences.active.size,0,key);
}
{
  const f=fixture();f.m.acceptEvent(event);const p=[...f.m.influences.active.keys()][0];
  f.m.byCell.set(p.cell,{...p});f.m.tick();assert.equal(f.m.influences.active.size,0);
}
for(const action of ['remove','clear','reseed','hidden','stall','backwards','fade','expiry','destroy']){
  const f=fixture();f.m.acceptEvent(event);const p=[...f.m.influences.active.keys()][0];
  if(action==='remove')f.m.remove(p);if(action==='clear')f.m.clear();if(action==='reseed')f.m.seedTrafficBlooms();
  if(action==='hidden'){f.m.influences.setHidden(true);f.m.acceptEvent(event);f.advance(20000);f.m.influences.setHidden(false);}
  if(action==='stall')f.advance(5001);if(action==='backwards')f.advance(-1);
  if(action==='fade'||action==='expiry'){p.createdAt=f.at-(action==='fade'?180000:240000);f.m.tick();}
  if(action==='destroy')f.m.destroy();
  assert.equal(f.m.influences.active.size,0,action);assert.equal(f.m.influences.counts.cancelled,1,action);
}
{
  const f=fixture();for(const p of f.m.specimens.slice(0,4))f.m.influences.preview(p);assert.equal(f.m.influences.active.size,3);
  f.m.acceptEvent(event);assert.equal(f.calls,0);assert.equal(f.m.influences.preview(f.m.specimens[0]),null);
  f.m.influences.setReducedMotion(true);assert.equal(f.m.influences.snapshot().reducedMotion,true);
}
{
  const f=fixture();f.m.influences.preview(f.m.specimens[0],9000);const r=[...f.m.influences.active.values()][0];
  assert.equal(r.alpha,.7124999999999999);f.advance(1000);assert.equal(r.alpha,.475);
  f.m.influences.setReducedMotion(true);assert.equal(r.alpha,.35);f.advance(1000);assert.equal(r.alpha,.35);
}
// Capture identity BEFORE RNG, then revalidate after a malicious injected draw.
for(const key of ['id','type','cell','column','row','createdAt','occupancy']){
  let at=100000,n=0;const m=G.createGardenModel({now:()=>at,random:()=>0,competitionRandom:()=>.99});
  m.seed(Array.from({length:640},(_,cell)=>({type:'flower',vigor:0,column:cell%32,row:Math.floor(cell/32),createdAt:35000})),at);
  const b=B.createModel({garden:m,now:()=>at,random:()=>{if(n++===1){const p=m.specimens[0];if(key==='occupancy')m.byCell.set(0,{...p});else p[key]=key==='type'?'weed':p[key]+1;}return 0;}});
  assert.equal(b.consider(event),null,key);
}
// A reserved or phantom map entry cannot manufacture a full garden.
{
  const m=G.createGardenModel();m.byCell.set(999,{});assert.equal(m.isSaturated(),false);
}
{
  const f=fixture();f.m.specimens[0].colorVariant=4;const before=JSON.stringify(f.m.specimens[0]);
  f.m.acceptEvent(event);assert.equal(f.m.influences.active.size,1);assert.equal(JSON.stringify(f.m.specimens[0]),before);
}
// Terrain can fill a real cell; corrupt or duplicate plant occupancy cannot.
{
  const at=1000000,m=G.createGardenModel({now:()=>at,random:()=>0,terrainRandom:()=>0,competitionRandom:()=>.99});
  m.seed([{type:'blackthorn',vigor:0,column:0,row:0,createdAt:at-G.timings.blackthorn.expiredAfterMs,
    origin:{kind:'simulated',eventType:'log-fixture'}},...Array.from({length:639},(_,i)=>({type:'flower',vigor:0,column:(i+1)%32,row:Math.floor((i+1)/32),createdAt:at-65000}))],at-1);
  m.forceLogFixture();m.tick(at);assert.equal(m.terrain.logs.length,1);assert(m.isSaturated());
  const b=B.createModel({garden:m,now:()=>at,random:()=>0});assert(b.consider(event));b.clear();
  const p=m.specimens[0];m.byCell.set(p.cell,{...p});assert.equal(m.isSaturated(),false);assert.equal(b.consider(event),null);
}
// Removal/replacement has no retained source, including when a new occupant uses the same cell.
{
  const f=fixture();f.m.acceptEvent(event);const p=[...f.m.influences.active.keys()][0],replacement=f.m.replaceTrafficBloom(p);
  assert.equal(replacement.cell,p.cell);assert.notEqual(replacement.id,p.id);assert.equal(f.m.influences.active.size,0);
  for(let i=0;i<10;i++)f.advance(1000);assert.equal(f.m.influences.active.size,0);
}
console.log('PASS: traffic blooms odds, independent RNG, placement/competition precedence, saturation, eligibility, identity, uniform choice, caps/cooldowns, lifecycle, clocks, hidden, accounting and no replay.');
