const assert=require('node:assert/strict'),fs=require('node:fs');
const A=require('../wwwroot/garden-ambient.js'),G=require('../wwwroot/garden-core.js');
assert.deepEqual(A.curiosityConfig,{maxActive:3,lifetimeMs:20000,hitRadius:9,placementPadding:14});
assert.deepEqual(A.curiosityTypes,['ladybug','snail','moth','shiny_pebble']);
assert.deepEqual(A.dropConfig,{amanitaDropChance:.01,delayMs:5000,maxActiveDrops:5,lifetimeMs:20000,hitRadius:9,placementPadding:14});
for(const test of require('./fixtures/production-ambient.json').cases){
  const source={...test.source},living=[source];let i=0;
  const ambient=A.createAmbientModel({now:()=>100000,random:()=>test.rolls[i++],getSpecimens:()=>living});
  let item;
  if(test.kind==='curiosity')item=ambient.createFirstSeenCuriosity(source);
  else{
    ambient.scheduleLooseDrop(source,'amanita_muscaria');assert.deepEqual(ambient.pendingDrops.get(source),test.pending);
    ambient.tick(104999);assert.equal(ambient.drops.length,0);ambient.tick(105000);item=ambient.drops[0];
  }
  assert.deepEqual(item,test.item,'matches original production fields/placement/random order');
  assert.equal(i,test.kind==='curiosity'?4:3,'no activation-time placement reroll');
  const identity=ambient.idFor(item);
  for(const sample of test.samples){
    assert.deepEqual((test.kind==='curiosity'?A.curiosityPosition:A.looseDropPosition)(item,sample.at),sample.position);
    assert.equal(ambient.idFor(item),identity);
  }
}
let now=100000,rolls=[],calls=0;
const specimens=G.createGardenModel({now:()=>now,random:()=>.5,competitionRandom:()=>0});
const changes=[],a=A.createAmbientModel({now:()=>now,random:()=>{calls++;return rolls.shift()??.5},getSpecimens:()=>specimens.specimens,onChange:c=>changes.push(c)});
const live=(type='flower',seenCount='1')=>specimens.addEvent({specimenType:type,seenCount,listenPort:53,vigor:0}).specimen;
for(const seen of ['2','01',null,'1.0',1]){a.acceptLiveSpecimen(live('flower',seen));assert.equal(a.curiosities.length,0);}
const fake=specimens.addSpecimen('mushroom',0).specimen;a.acceptLiveSpecimen(fake);assert.equal(a.pendingDrops.size,0);assert.equal(a.curiosities.length,0);
a.acceptLiveSpecimen(null);a.acceptLiveSpecimen({...live(),origin:{kind:'tcpnoise',seenCount:'1'}});assert.equal(a.curiosities.length,0,'nonliving/reference copy cannot trigger');
for(let i=0;i<4;i++)a.acceptLiveSpecimen(live());assert.equal(a.curiosities.length,3);const before=calls;
a.acceptLiveSpecimen(live());assert.equal(calls,before,'cap skip does not roll or queue');
const exact=a.curiosities[1],others=a.curiosities.filter(c=>c!==exact);assert(a.removeCuriosity(exact));assert.deepEqual(a.curiosities,others);
a.tick(now+1);assert.equal(a.curiosities.length,2,'no retry after slot opens');
const oldIds=a.curiosities.map(a.idFor);a.tick(now+20000);assert.equal(a.curiosities.length,0);
a.acceptLiveSpecimen(live());assert(a.idFor(a.curiosities[0])>Math.max(...oldIds));a.clear();
// Production live ordering: chance, drop angle/radius/phase, then curiosity type/angle/radius/phase.
rolls=[.009999,.125,.25,.375,.875,.625,.75,.875];calls=0;
const mushroom=live('mushroom');a.acceptLiveSpecimen(mushroom);assert.equal(calls,8);assert.equal(a.curiosities[0].type,'shiny_pebble');
assert.equal(a.pendingDrops.size,1);const pending={...a.pendingDrops.get(mushroom)},sourceState=JSON.stringify(mushroom);
assert(!a.maybeScheduleAmanita(mushroom,0,()=>{throw Error('duplicate pending rerolled placement')}));
const duplicateRollCalls=calls;
now+=4999;a.tick(now);assert.equal(a.drops.length,0);assert.equal(calls,duplicateRollCalls);
now++;a.tick(now);const drop=a.drops[0];assert.equal(drop.x,pending.x);assert.equal(drop.y,pending.y);assert.equal(drop.phase,pending.phase);
assert.equal(drop.createdAt,now);assert.equal(a.pendingDrops.size,0);assert.equal(JSON.stringify(mushroom),sourceState);
assert.deepEqual(Object.keys(drop).sort(),['type','createdAt','expiresAt','x','y','phase'].sort());
assert.equal(a.idFor(drop),changes.find(c=>c.kind==='drop-added'&&c.item===drop).id);
specimens.remove(mushroom);a.tick(now);assert.equal(a.drops[0],drop,'active drop is independent of source');
now+=19999;a.tick(now);assert(a.drops.includes(drop));now++;a.tick(now);assert(!a.drops.includes(drop));
for(const roll of [0,.009999,.01,.5,-1,NaN,Infinity]){
  a.clear();const s=live('mushroom','2');assert.equal(a.maybeScheduleAmanita(s,roll,()=>.5),Number.isFinite(roll)&&roll>=0&&roll<.01);
}
// Exact references cancel on expiry, explicit removal, clear, and same-cell replacement.
for(const operation of ['expiry','remove','clear','replace']){
  a.clear();specimens.clear();now=100000;
  const s=live('mushroom','2');a.maybeScheduleAmanita(s,0,()=>.5);
  if(operation==='expiry')s.createdAt=now-300000;
  if(operation==='remove')specimens.remove(s);
  if(operation==='clear')specimens.clear();
  if(operation==='replace'){
    specimens.seed(Array.from({length:640},(_,i)=>i===s.cell?s:{type:'ghostbloom',column:i%32,row:Math.floor(i/32),createdAt:now,vigor:3}));
    const replacement=specimens.addSpecimen('flower',1).specimen;assert.equal(replacement.cell,s.cell);assert.notEqual(replacement,s);
  }
  now+=5000;a.tick(now);assert.equal(a.pendingDrops.size,0);assert.equal(a.drops.length,0);
}
// Hidden due attempts retain their original location, activate once at resume, and consume cap skips.
a.clear();specimens.clear();now=100000;
for(let i=0;i<8;i++)a.maybeScheduleAmanita(live('mushroom','2'),0,()=>.5);
assert.equal(a.pendingDrops.size,8);now+=6000;a.tick(now,{hidden:true});assert.equal(a.drops.length,0);assert.equal(a.pendingDrops.size,8);
now+=1000;a.tick(now,{hidden:false});assert.equal(a.drops.length,5);assert.equal(a.pendingDrops.size,0);assert(a.drops.every(d=>d.createdAt===now));
a.removeDrop(a.drops[0]);a.tick(now+1);assert.equal(a.drops.length,4);assert.equal(a.pendingDrops.size,0);
const nextDrop=a.drops[0],remainingDrops=a.drops.slice(1);a.removeDrop(nextDrop);assert.deepEqual(a.drops,remainingDrops);
now+=20000;a.tick(now,{hidden:true});assert.equal(a.drops.length,0);
a.clear();a.maybeScheduleAmanita(live('mushroom','2'),0,()=>.5);specimens.clear();a.tick(now,{hidden:true});assert.equal(a.pendingDrops.size,0);
assert.throws(()=>a.seed({curiosities:Array(4).fill({})}));
// Even the all-successful-roll extreme keeps one pending entry per living specimen.
a.clear();now=100000;specimens.seed(Array.from({length:640},(_,i)=>({type:'mushroom',column:i%32,row:Math.floor(i/32),
  createdAt:now,vigor:0,origin:{kind:'tcpnoise'}})));
for(const source of specimens.specimens)assert(a.maybeScheduleAmanita(source,0,()=>.5));
assert.equal(a.pendingDrops.size,640);
for(const source of specimens.specimens)assert.equal(a.maybeScheduleAmanita(source,0,()=>.5),false);
assert.equal(a.pendingDrops.size,640);specimens.clear();a.tick(now,{hidden:true});assert.equal(a.pendingDrops.size,0);
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-ambient.js','utf8'),/document\.|CanvasRenderingContext2D|PIXI|setTimeout|setInterval|localStorage|sessionStorage/);
for(const page of ['index','pixi-live'])assert.match(fs.readFileSync(`wwwroot/${page}.html`,'utf8'),/src="garden-ambient.js\?v=opium-pods-1"/);
assert.match(fs.readFileSync('wwwroot/pixi-live.js','utf8'),/ambient.acceptLiveSpecimen/);
console.log('PASS: shared ambient exact production state/position oracle; eligible live success/caps/probabilities/RNG order; stable ids; five-second exact-source pending, hidden/cap/no retry, expiry/clear/replacement; independent bounded objects; shared consumers/no timers.');
