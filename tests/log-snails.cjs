const assert=require('node:assert/strict'),fs=require('node:fs');
const S=require('../wwwroot/garden-log-snails.js'),Core=require('../wwwroot/garden-core.js'),E=require('../wwwroot/garden-ecology.js'),G=require('../wwwroot/garden-gnomes.js');
const I=require('../wwwroot/garden-interaction.js'),T=require('../wwwroot/garden-ui-core.js'),A=require('../wwwroot/garden-ambient.js'),C=S.config;
function fixture({column=16,row=10,remaining=3600000,grass=true,logs=1}={}){
  let at=5000000,snails,draw=()=>.99,afterGrass=()=>{};const changes=[],removed=[];
  const garden=Core.createGardenModel({now:()=>at,random:()=>.5,terrainRandom:()=>0,onChange:c=>{changes.push(c);if(c.kind==='terrain-removed')snails?.sourceRemoved(c.terrain,at);}});
  garden.seed(Array.from({length:logs},(_,i)=>({type:'blackthorn',vigor:1,column:column-i,row,createdAt:at-Core.timings.blackthorn.expiredAfterMs-Core.terrainConfig.lifetimeMs+remaining,origin:{kind:'simulated',eventType:'log-fixture'}})));
  garden.forceLogFixture();garden.tick(at);
  const ecology=E.createEcologyModel({now:()=>at,isCellOccupied:garden.isCellOccupied,random:()=>.99,onChange:c=>{if(c.kind==='grass-removed'){removed.push(c.item);afterGrass();}}});
  if(grass)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)ecology.influenceGrassCell(column+dx,row+dy,at-65000);
  snails=S.createModel({now:()=>at,random:()=>draw(),getTerrain:()=>garden.terrain,getEcology:()=>ecology,onChange:c=>changes.push(c)});
  const step=ms=>{while(ms>0){const dt=Math.min(ms,250);at+=dt;garden.tick(at);snails.tick(at);ms-=dt;}};
  return{garden,ecology,snails,changes,removed,get at(){return at},step,jump(ms){at+=ms;},setDraw(fn){draw=fn;},afterGrass(fn){afterGrass=fn;},
    spawn(fn=()=>0){const before=draw;draw=fn;const snail=snails.spawnSimulated(at);draw=before;return snail;}};
}
assert.deepEqual(C,{checkEveryMs:45000,chance:.25,maxActive:2,lifetimeMs:75000,departureMs:3000,maxTickGapMs:1500,maxGrazes:2,grazeAges:[25000,53000],radiusCells:1.5,padding:12});
assert.equal(T.logSnailMessage,'The snail continues being a snail. +0 points');assert.equal(T.messages.snail,'You collected a snail. It seems annoyed. +0 points');
assert(!Core.species.includes('log-snail'));assert(!A.curiosityTypes.includes('log-snail'));assert(!Object.hasOwn(A.dropTypes,'log-snail'));
for(const roll of [0,.249999999,.25,.999999]){
  const f=fixture();f.setDraw(()=>roll);f.step(44999);assert.equal(f.snails.counts.checks,0);f.step(1);
  assert.equal(f.snails.counts.checks,1);assert.equal(f.snails.snails.length,roll<.25?1:0);assert.equal(f.snails.nextCheckAt,f.at+45000);
}
{
  const f=fixture({logs:0});let rolls=0;f.setDraw(()=>{rolls++;return 0;});f.step(45000);assert.equal(rolls,0);assert.equal(f.snails.snails.length,0);
}
{
  const f=fixture();const a=f.spawn(),b=f.spawn();assert(a&&b);assert.equal(f.spawn(),null);let rolls=0;f.setDraw(()=>{rolls++;return 0;});f.step(45000);assert.equal(rolls,0);assert.equal(f.snails.counts.checks,0);
  f.setDraw(()=>.99);f.step(30000);assert.equal(f.snails.snails.length,0);assert.equal(a.source,null);assert(a.grazes.every(g=>g===null));assert.equal(f.snails.counts.removed,2);
}
{
  const f=fixture({logs:2});const s=f.spawn(()=>.99);assert.equal(s.source.log,f.garden.terrain.logs.at(-1));assert.equal(f.snails.counts.spawned,1);
}
// Path points stay around the log, with bounded speed, deliberate pauses and heading.
for(const [column,row] of [[0,0],[31,0],[0,19],[31,19],[16,10]])for(const seed of [1,17,731]){
  const f=fixture({column,row}),s=f.spawn(S.seededRandom(seed));assert.equal(s.points.length,4);let previous=S.positionAt(s,f.at);
  for(let age=100;age<=72000;age+=100){const p=S.positionAt(s,s.createdAt+age);
    assert(p.x>=12&&p.x<=948&&p.y>=12&&p.y<=588);assert(Math.hypot(p.x-(column+.5)*30,p.y-(row+.5)*30)>=29.999);
    assert(Math.hypot(p.x-previous.x,p.y-previous.y)<=.188,'maximum crawl speed below 1.88px/s');
    if(p.moving){const dx=p.x-previous.x,dy=p.y-previous.y;if(dx||dy)assert(Math.abs(Math.atan2(dy,dx)-p.heading)<1e-8);}
    previous=p;
  }
  assert.deepEqual(S.positionAt(s,s.createdAt+22000),S.positionAt(s,s.createdAt+24000));
  const reduced=S.visualState(s,s.createdAt+13000,true);assert.equal(reduced.stretch,1);assert.equal(reduced.bodyY,0);assert(reduced.frame.endsWith('crawl0'));
}
{
  const f=fixture(),s=f.spawn(),targets=s.grazes.map(t=>t.patch),before=f.ecology.grassCells.length;let calls=0;
  const remove=f.ecology.removeGrassCell;f.ecology.removeGrassCell=(column,row)=>{const patch=f.ecology.grassCells.find(g=>g.column===column&&g.row===row);assert(targets.includes(patch));calls++;return remove(column,row);};
  f.step(24999);assert.equal(calls,0);f.step(1);assert.equal(calls,1);assert.equal(s.grazed,1);assert(!f.ecology.grassCells.includes(targets[0]));assert(S.visualState(s,f.at).frame.endsWith('nibble'));
  f.step(27999);assert.equal(calls,1);f.step(1);assert.equal(calls,2);assert.equal(s.grazed,2);assert.equal(s.attempts,2);assert.equal(f.ecology.grassCells.length,before-2);
  f.step(22000);assert.equal(calls,2);assert.equal(f.snails.snails.length,0);assert(s.grazes.every(t=>!t));assert.equal(s.source,null);
  // Only existing ecology can grow it again; wildlife does not refill any grass.
  const other=f.ecology.influenceGrassCell(targets[0].column,targets[0].row,f.at);assert.notEqual(other,targets[0]);
}
for(const mode of ['missing','replaced','moved','out-of-range','expired']){
  const f=fixture(),s=f.spawn(),target=s.grazes[0],old=target.patch;
  if(mode==='missing')f.ecology.removeGrassCell(target.column,target.row);
  if(mode==='replaced'){f.ecology.removeGrassCell(target.column,target.row);f.ecology.influenceGrassCell(target.column,target.row,f.at);}
  if(mode==='moved')old.column++;
  if(mode==='out-of-range'){old.column=0;target.column=0;}
  if(mode==='expired')old.lastInfluencedAt=f.at-E.grassConfig.expiredAfterMs;
  const before=f.removed.length;f.step(25000);assert.equal(s.attempts,1);assert.equal(s.grazed,0);assert.equal(f.removed.length,before);assert.equal(s.grazes[0],null);
  f.step(28000);assert(s.grazed<=1);assert.equal(s.attempts,2);
}
{
  const f=fixture({grass:false}),s=f.spawn();assert.deepEqual(s.grazes,[null,null]);f.step(53000);assert.equal(s.attempts,2);assert.equal(s.grazed,0);assert.equal(f.removed.length,0);
}
// Exact original log in list/map and every captured identity field are required.
for(const key of ['id','cell','column','row','createdAt','expiresAt','object','list','map']){
  const f=fixture(),s=f.spawn(),log=s.source.log;f.step(12000);
  if(key==='object'){const replacement=Object.freeze({...log});f.garden.terrain.logs.splice(0,1,replacement);f.garden.terrain.byCell.set(log.cell,replacement);}
  else if(key==='list')f.garden.terrain.logs.splice(0,1);
  else if(key==='map')f.garden.terrain.byCell.delete(log.cell);
  else s.source[key]++;
  f.step(250);assert.equal(s.source,null);assert.equal(s.leaveAt,f.at);assert(s.grazes.every(g=>g===null));f.step(3000);assert.equal(f.snails.snails.length,0);assert.equal(s.grazed,0);
}
for(const remaining of [24000,40000]){
  const f=fixture({remaining}),s=f.spawn();f.step(remaining);assert.equal(s.source,null);const before=f.removed.length;
  f.step(3000);assert.equal(f.snails.snails.length,0);assert.equal(f.removed.length,before);assert.equal(s.grazed,remaining<25000?0:1);
}
{
  const f=fixture(),s=f.spawn(),log=s.source.log;f.step(1000);f.garden.terrain.remove(log,'gnome-campfire');
  assert.equal(s.source,null);assert.equal(f.snails.snails.length,1);f.step(1500);assert(S.visualState(s,f.at).alpha>0&&S.visualState(s,f.at).alpha<1);f.step(1500);assert.equal(f.snails.snails.length,0);assert.equal(f.removed.length,0);
}
{
  const f=fixture(),s=f.spawn();assert.equal(S.visualState(s,f.at).alpha,0);f.garden.terrain.remove(s.source.log);
  assert.equal(S.visualState(s,f.at).alpha,0,'an invisible arrival must not flash into a full-opacity departure');f.step(3000);assert.equal(f.snails.snails.length,0);
}
{
  const f=fixture(),s=f.spawn();for(let i=0;i<35;i++)f.garden.addSpecimen('broadleaf',0,f.at,{kind:'simulated'});
  const gnomes=G.createModel({garden:f.garden,getSpecimens:()=>f.garden.specimens,now:()=>f.at,puddleRandom:()=>.99});assert(gnomes.startCampfire(f.at,()=>0));
  for(let i=0;i<68;i++){f.step(250);gnomes.tick(f.at,()=>.99);}
  assert.equal(gnomes.incident.removals,1);assert.equal(s.source,null);assert.equal(f.garden.terrain.logs.length,0);f.step(3000);assert.equal(f.snails.snails.length,0);assert.equal(s.grazed,0);
}
{
  const f=fixture(),s=f.spawn();f.garden.seed(Array.from({length:35},(_,i)=>({type:'broadleaf',vigor:0,column:i%32,row:15+Math.floor(i/32),createdAt:f.at-65000,origin:{kind:'simulated'}})));
  f.step(3000);assert.equal(f.snails.snails.length,0);assert.equal(s.grazed,0);
}
for(const mode of ['hidden','tick-gap','render-gap','backwards']){
  const f=fixture(),s=f.spawn();f.step(24999);const before=f.removed.length;
  if(mode==='hidden'){f.snails.setHidden(true,f.at);f.jump(300000);f.snails.setHidden(false,f.at);}
  else{f.jump(mode==='backwards'?-1:1501);if(mode==='tick-gap')f.snails.tick(f.at);else f.snails.advance(f.at);}
  assert.equal(f.snails.snails.length,0);assert.equal(s.source,null);assert.equal(f.removed.length,before);assert.equal(f.snails.nextCheckAt,f.at+45000);
  f.step(44999);assert.equal(f.snails.counts.checks,0);
}
{
  const f=fixture();f.spawn();f.step(23500);f.jump(1500);f.snails.tick(f.at);assert.equal(f.snails.snails[0].grazed,1,'exact allowed tick gap');
}
{
  const f=fixture(),s=f.spawn();f.afterGrass(()=>f.snails.clear(f.at));f.step(25000);assert.equal(f.snails.snails.length,0);assert.equal(s.source,null);assert.equal(f.removed.length,1,'synchronous removal observers can clear safely');
}
{
  const f=fixture(),s=f.spawn();f.step(1000);const pose=S.visualState(s,f.at),plant={type:'flower',column:Math.floor(pose.x/30),row:Math.floor(pose.y/30)};
  const state={specimens:[plant],logSnails:f.snails};assert.equal(I.resolve(pose,state,f.at).kind,'log-snail');assert(f.snails.click(s,f.at));assert(!f.snails.click(s,f.at));assert.equal(f.snails.snails[0],s);
  plant.mutation={type:'collectible_weed',expiresAt:f.at+10000};assert.equal(I.resolve(pose,state,f.at).kind,'mutation');delete plant.mutation;
  state.frogs={hitAt:()=>({})};assert.equal(I.resolve(pose,state,f.at).kind,'frog');state.drops=[{type:'amanita_muscaria',x:pose.x,y:pose.y,phase:0,createdAt:f.at,expiresAt:f.at+20000}];assert.equal(I.resolve(pose,state,f.at).kind,'drop');
  state.curiosities=[{...state.drops[0],type:'snail',direction:1}];assert.equal(I.resolve(pose,state,f.at).kind,'curiosity');state.gnomes={hitAt:()=>({})};assert.equal(I.resolve(pose,state,f.at).kind,'gnome');
  assert(!f.snails.click({...s},f.at));f.snails.clear();assert(!f.snails.click(s,f.at));
}
const r1=S.seededRandom(731),r2=S.seededRandom(731);assert.deepEqual(Array.from({length:100},r1),Array.from({length:100},r2));
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-log-snails.js','utf8'),/Math\.random|setTimeout|setInterval|requestAnimationFrame|EventSource|fetch\(/);
console.log('PASS: exact 25%/45s/one-arrival/two-cap/75s bounds, independent randomness, real-log ownership/identity, slow preplanned paths/heading/pauses/edges/reduced motion, exact grass objects/two actual removals/stale skips, source decay/campfire/clear, hidden/stalls/backwards, reentrant cleanup, click priority and unchanged collectible snail.');

(async()=>{
  const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
  for(const page of ['index.html','pixi-live.html'])for(const reduced of [false,true]){
    const f=await start(false,{pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8'),captureModel:true,reduced,snailRandom:()=>.01,random:()=>.5});
    f.model.seedCampfire();const log=f.model.terrain.logs[0];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)f.ecology.influenceGrassCell(log.column+dx,log.row+dy,f.context.Date.now()-65000);
    const s=f.logSnails.spawnSimulated();for(let i=0;i<4;i++)f.frame(250);
    const root=f.app.stage.children[0],drops=root.children[7],sprite=drops.children.find(p=>p.texture===drops.children[0].texture),bakes=h.generated(),textures=h.textureCount();
    const click=()=>{const pose=S.visualState(s,f.context.Date.now(),reduced),r=f.app.canvas.getBoundingClientRect(),screen=f.app.renderer.screen;
      f.app.canvas.handlers.get('click')({clientX:r.left+(root.position.x+pose.x*root.scale.x)*r.width/screen.width,clientY:r.top+(root.position.y+pose.y*root.scale.y)*r.height/screen.height});};
    const counts=JSON.stringify([f.model.counts,f.model.recentEvents,f.ambient.counts]);click();assert.equal(f.element('#collection-message').textContent,T.logSnailMessage);assert(f.logSnails.snails.includes(s));
    for(let i=0;i<6;i++)f.frame(250);click();for(let i=0;i<3;i++)f.frame(250);assert(f.element('#collection-message').hidden,'repeated snail clicks do not renew messages');
    assert.equal(JSON.stringify([f.model.counts,f.model.recentEvents,f.ambient.counts]),counts);assert.equal(f.element('#garden-score').textContent,'Score: 0');
    f.model.terrain.remove(log,'gnome-campfire');assert.equal(s.source,null);for(let i=0;i<12;i++)f.frame(250);assert(!h.live.has(sprite));assert.equal(f.logSnails.snails.length,0);
    assert.equal(h.generated(),bakes);assert.equal(h.textureCount(),textures);f.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(f.errors,[]);
  }
  assert(!fs.readFileSync('wwwroot/index.html','utf8').includes('garden-log-snails-dev'));assert(!fs.readFileSync('wwwroot/index.html','utf8').includes('seed-log-snails'));
  console.log('PASS: real Pixi entry points, scaled native clicks/one message/noncollection, reduced motion, source notification fades and Sprite cleanup, unchanged garden/activity/score/bakes/textures and teardown.');
})().catch(e=>{console.error(e);process.exitCode=1;});
