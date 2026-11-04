const assert=require('node:assert/strict'),fs=require('node:fs');
const Core=require('../wwwroot/garden-core.js'),E=require('../wwwroot/garden-ecology.js'),G=require('../wwwroot/garden-gnomes.js'),I=require('../wwwroot/garden-interaction.js');
function fixture({type='ghostbloom',age=90000,count=35,rare=1,mushrooms=0,logs=0,grass=false,reduced=false,simulated=true}={}){
  let at=9000000,gnomes,afterGrass=()=>{};const changes=[],influences=[],pants=[];
  const garden=Core.createGardenModel({now:()=>at,random:()=>0,competitionRandom:()=>.99,terrainRandom:()=>0,fungalRandom:()=>.99,onChange:c=>{changes.push(c);if(c.kind==='removed')gnomes?.specimenRemoved(c.specimen,at);}});
  const entries=Array.from({length:rare},(_,i)=>({type,vigor:i%4,column:16+i*2,row:10,createdAt:at-age,origin:{kind:simulated?'simulated':'tcpnoise',eventType:'wizard-fixture'}}));
  for(let i=rare;i<count;i++)entries.push({type:i-rare<mushrooms?'mushroom':'broadleaf',vigor:1,column:(i-rare)%32,row:14+Math.floor((i-rare)/32),createdAt:at-65000,origin:{kind:'simulated',eventType:'wizard-fixture'}});
  for(let i=0;i<logs;i++)entries.push({type:'blackthorn',vigor:1,column:10+i*2,row:7,createdAt:at-720000,origin:{kind:'simulated',eventType:'log-fixture'}});
  garden.seed(entries);garden.forceLogFixture();garden.tick(at);
  const ecology=E.createEcologyModel({now:()=>at,isCellOccupied:garden.isCellOccupied,random:()=>.99,onChange:c=>{changes.push(c);if(c.kind==='grass-added'||c.kind==='grass-refreshed')afterGrass(c);}});
  if(grass)ecology.influenceGrassCell(15,9,at-65000);
  const influence=ecology.influenceGrassCell;ecology.influenceGrassCell=(column,row,t)=>{influences.push({column,row,at:t});return influence(column,row,t);};
  gnomes=G.createModel({garden,getSpecimens:()=>garden.specimens,getEcology:()=>ecology,now:()=>at,random:()=>.99,puddleRandom:()=>.99,getReducedMotion:()=>reduced,onUnderpantsAttempt:p=>pants.push(p)});
  return{garden,ecology,gnomes,changes,influences,pants,get at(){return at},set at(value){at=value},afterGrass(fn){afterGrass=fn},
    start(roll=()=>0,sim=false){return gnomes.startWizard(at,roll,sim)},step(ms){while(ms>0){const dt=Math.min(250,ms);at+=dt;garden.tick(at);gnomes.tick(at,()=>.99);ms-=dt;}}};
}
assert.equal(G.config.incidentChance,.02);assert.equal(G.heistConfig.incidentShare,.3);assert.equal(G.campfireConfig.incidentShare,.4);assert.equal(G.wizardConfig.incidentShare,.25);
// Original check, heist and campfire retain both priority and exact draw boundaries.
for(const [draws,type] of [
  [[.02],null],[[.019999,.299999,0],'gnome_heist'],
  [[.019999,.3,.399999,0,0],'gnome_campfire'],
  [[.019999,.3,.4,.249999,0,0],'gnome_wizard'],[[.019999,.3,.4,.25,.5,.5],'gnome_incident']
]){
  const f=fixture({mushrooms:3,logs:1});f.at+=45000;let n=0;
  f.gnomes.tick(f.at,()=>{assert(n<draws.length);return draws[n++];});assert.equal(f.gnomes.incident?.type??null,type);assert.equal(n,draws.length);
  assert.equal(f.gnomes.nextCheckAt,f.at+45000);f.gnomes.tick(f.at,()=>{throw Error('duplicate check')});
}
for(const [rare,draws,type] of [[0,[.019999,.5,.5],'gnome_incident'],[1,[.019999,.249999,0,0],'gnome_wizard'],[1,[.019999,.25,.5,.5],'gnome_incident']]){
  const f=fixture({rare});f.at+=45000;let n=0;f.gnomes.tick(f.at,()=>draws[n++]);assert.equal(n,draws.length);assert.equal(f.gnomes.incident.type,type);
}
for(const type of Core.species){const f=fixture({type});assert.equal(f.gnomes.wizardCandidates().length,G.wizardSpecies.includes(type)?1:0,type);}
for(const type of G.wizardSpecies){const t=Core.timings[type];for(const age of [0,t.matureAfterMs-1,t.matureAfterMs,t.fadingAfterMs-1,t.fadingAfterMs,t.expiredAfterMs]){
  const f=fixture({type,age});assert.equal(f.gnomes.wizardCandidates().length,age>=t.matureAfterMs&&age<t.fadingAfterMs?1:0,`${type}/${age}`);
}}
for(const n of [29,30]){const f=fixture({count:n});assert.equal(f.start(),n===30);}
for(const column of [0,16,31])for(const row of [0,10,19]){
  const f=fixture(),p=f.garden.specimens[0];f.garden.seed([{...p,column,row},...f.garden.specimens.slice(1)]);assert(f.start());const g=f.gnomes.incident.grass;
  assert(g.column>=0&&g.column<32&&g.row>=0&&g.row<20);assert.equal(Math.max(Math.abs(g.column-column),Math.abs(g.row-row)),1);
  f.step(14000);assert.equal(f.gnomes.incident,null);
}
{
  const f=fixture({rare:4});assert(f.start(()=>.999999));assert.equal(f.gnomes.incident.target.specimen,f.garden.specimens[3]);assert.equal(f.gnomes.actors.length,1);
  assert(!f.start());assert(!f.gnomes.start());assert(!f.gnomes.startHeist());assert(!f.gnomes.startCampfire());assert(!f.gnomes.startLandscaping());
}
{
  const f=fixture({simulated:false});assert(!f.start(()=>0,true));assert(f.start());
}
for(const action of [p=>p.id++,p=>p.type='crystalfungus',p=>p.cell++,p=>p.column++,p=>p.row++,p=>p.createdAt--,
  (p,f)=>f.garden.byCell.set(p.cell,{...p}),(p,f)=>f.garden.specimens.splice(0,1),(p,f)=>f.garden.remove(p,'removed'),
  (p,f)=>f.garden.seed([{...p},...f.garden.specimens.slice(1)])]){
  const f=fixture();assert(f.start());const c=f.gnomes.incident,p=c.target.specimen;action(p,f);f.gnomes.tick(f.at,()=>.99);
  assert.equal(f.gnomes.incident,null);assert.equal(c.target,null);assert.equal(c.grass,null);assert.equal(c.ecology,null);assert.equal(f.influences.length,0);
}
for(const grass of [false,true]){
  const f=fixture({grass}),snapshot=JSON.stringify(f.garden.specimens);assert(f.start());const c=f.gnomes.incident,selected=c.grass,patch=selected.patch;
  f.step(4999);assert.equal(f.influences.length,0);f.gnomes.advance(f.at+1);assert.equal(f.influences.length,0,'render cannot cast');f.step(1);
  assert.equal(f.influences.length,1);assert.deepEqual(f.influences[0],{column:selected.column,row:selected.row,at:f.at});assert(c.attempted&&c.influenced);assert.equal(c.grass,null);assert.equal(c.ecology,null);
  const actual=f.ecology.grassCells.find(g=>g.column===selected.column&&g.row===selected.row);assert(actual);assert.equal(actual.lastInfluencedAt,f.at);
  if(grass){assert.equal(actual,patch);assert.equal(actual.createdAt,patch.createdAt);assert.equal(f.ecology.grassCells.length,1);}
  f.step(9000);assert.equal(f.gnomes.incident,null);assert.equal(c.target,null);assert.equal(f.influences.length,1);assert.equal(JSON.stringify(f.garden.specimens),snapshot);
}
for(const mode of ['missing','replaced','moved','new-patch','blocked','coordinates','no-cell','allow-then-disallow']){
  const f=fixture({grass:!['new-patch','no-cell'].includes(mode)});
  if(mode==='no-cell')for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy){
    f.garden.seed([...f.garden.specimens,{type:'broadleaf',vigor:1,column:16+dx,row:10+dy,createdAt:f.at-65000,origin:{kind:'simulated'}}]);
  }
  if(mode==='allow-then-disallow')f.ecology.setAllowGrassUnderPlants(true);
  assert(f.start());const c=f.gnomes.incident,g=c.grass;
  if(mode==='missing'||mode==='replaced'){f.ecology.removeGrassCell(g.column,g.row);if(mode==='replaced')f.ecology.influenceGrassCell(g.column,g.row,f.at);}
  if(mode==='new-patch')f.ecology.influenceGrassCell(g.column,g.row,f.at);
  if(mode==='moved')g.patch.column++;
  if(mode==='blocked'||mode==='allow-then-disallow'){
    // Use real placement in every free cell up to the selected one; keep the target identity.
    while(!f.garden.isCellOccupied(g.column,g.row))assert(f.garden.addSpecimen('broadleaf',0,f.at,{kind:'simulated'}));
    if(mode==='allow-then-disallow')f.ecology.setAllowGrassUnderPlants(false);
  }
  if(mode==='coordinates')g.column=-1;
  const before=f.influences.length;f.step(5000);assert(c.attempted&&!c.influenced,mode);assert.equal(f.influences.length,before,mode);f.step(8000);assert.equal(f.influences.length,before,mode);
}
{
  const f=fixture();f.ecology.setAllowGrassUnderPlants(true);assert(f.start());const g=f.gnomes.incident.grass;
  while(!f.garden.isCellOccupied(g.column,g.row))assert(f.garden.addSpecimen('broadleaf',0,f.at,{kind:'simulated'}));
  f.step(5000);assert.equal(f.influences.length,1,'enabled ordinary under-plants policy is honored');
}
for(const mode of ['hidden','tick-gap','render-gap','backwards','nan','clear','expiry','fading']){
  const f=fixture({age:mode==='fading'?299000:90000});assert(f.start());const c=f.gnomes.incident;f.step(750);
  if(mode==='hidden')f.gnomes.tick(f.at,()=>.99,true);
  else if(mode==='clear')f.gnomes.clear();
  else if(mode==='expiry'){f.at+=Core.timings.ghostbloom.expiredAfterMs;f.garden.tick(f.at);}
  else if(mode==='fading')f.step(250);
  else{f.at+=mode==='backwards'?-1:1501;if(mode==='render-gap')f.gnomes.advance(f.at);else f.gnomes.tick(mode==='nan'?NaN:f.at,()=>.99);}
  assert.equal(f.gnomes.incident,null,mode);assert.equal(c.target,null);assert.equal(c.grass,null);assert.equal(c.ecology,null);assert.equal(f.influences.length,0);
  f.at+=10000;f.gnomes.advance(f.at);assert.equal(f.influences.length,0);
}
{
  const f=fixture();assert(f.start());f.step(3500);f.at+=1500;f.gnomes.tick(f.at,()=>.99);assert.equal(f.influences.length,1,'exact permitted gap');
}
{
  const f=fixture();assert(f.start());f.afterGrass(()=>{f.gnomes.tick(f.at,()=>.99);f.gnomes.clear();});f.step(5000);assert.equal(f.influences.length,1);assert.equal(f.gnomes.incident,null);
}
{
  const f=fixture();assert(f.start());f.step(3500);const a=f.gnomes.actors[0],pose=G.presentation(a,f.at),p=f.gnomes.incident.target.specimen;
  assert.equal(I.resolve({x:pose.x,y:pose.y},{gnomes:f.gnomes,specimens:f.garden.specimens},f.at).kind,'gnome');assert(f.gnomes.click(a,f.at));assert(f.gnomes.click(a,f.at));assert.equal(f.pants.length,1);
  assert.equal(I.resolve({x:(p.column+.5)*30,y:(p.row+.5)*30},{gnomes:f.gnomes,specimens:f.garden.specimens},f.at).kind,'specimen');
  f.step(1000);G.presentation(a,f.at);assert(f.gnomes.click(a,f.at));assert.equal(f.pants.length,1);f.gnomes.clear();assert(!f.gnomes.click(a,f.at));
}
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-gnomes.js','utf8'),/setTimeout|setInterval|requestAnimationFrame|EventSource|fetch\(/);
console.log('PASS: wizard exact scheduler/priority/25%/uniform targets, maturity/identity/occupancy, one actual grass addition/refresh and no retries, under-plants policy, callbacks/clocks/clear/target release, single actor/underpants and plant hit separation.');

(async()=>{
  const page=require('./pixi-page.cjs'),h=require('./pixi-live.cjs');
  for(const name of ['index.html','pixi-live.html'])for(const reduced of [false,true]){
    const f=await page({page:name,reduced}),s=f.model.seedWizard();assert(f.gnomes.startWizard(f.now(),()=>0,true));
    const modelBefore=JSON.stringify(f.model.specimens),counts=JSON.stringify([f.model.counts,f.model.recentEvents]),bakes=h.generated(),textures=h.textureCount(),source=f.view.byId.get(s.id),art=source.texture;
    for(let n=0;n<20;n++)f.frame(250);const group=f.view.curiosityLayer.children[0],wizard=group.children.find(o=>o.texture?.frame?.x>=29*40);
    assert(wizard);assert.equal(group.children.length,3);assert.equal(f.ecology.grassCells.length>=1,true);assert.equal(source.texture,art);
    assert.equal(JSON.stringify(f.model.specimens),modelBefore);assert.equal(JSON.stringify([f.model.counts,f.model.recentEvents]),counts);assert.equal(f.element('#garden-score').textContent,'Score: 0');
    const c=f.gnomes.incident;f.model.remove(s,'test');assert.equal(f.gnomes.incident,null);assert.equal(c.target,null);assert.equal(f.view.curiosityLayer.children.length,0);assert(!h.live.has(wizard));
    for(let i=0;i<30;i++){f.model.seedWizard();f.gnomes.startWizard(f.now(),()=>0,true);for(let j=0;j<20;j++)f.frame(250);const owned=[...f.view.curiosityLayer.children[0].children];f.gnomes.clear();assert(owned.every(o=>!h.live.has(o)));}
    assert.equal(h.generated(),bakes);assert.equal(h.textureCount(),textures);f.model.seedWizard();f.gnomes.startWizard(f.now(),()=>0,true);f.hidden(true);f.advance(10000);f.hidden(false);assert.equal(f.gnomes.incident,null);
    f.model.seedWizard();f.gnomes.startWizard(f.now(),()=>0,true);f.close();assert.equal(f.gnomes.incident,null);assert.deepEqual(f.errors,[]);
  }
  console.log('PASS: actual Pixi pages/reduced motion, unchanged protected Sprite/artwork/traits/stats/score, authoritative grass, immediate source callback and 120 incident cleanup cycles, stable atlas bakes/frames, hidden and teardown.');
})().catch(e=>{console.error(e);process.exitCode=1;});
