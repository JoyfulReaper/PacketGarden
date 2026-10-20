// Production parity oracle: numeric timings and placement traces captured before extraction (c92ed92).
const assert = require('node:assert/strict'), fs = require('node:fs');
const core = require('../wwwroot/garden-core.js'), createCanvas = require('./browser-garden.cjs');
const fixture = require('./fixtures/production-placement.json');
const event = (specimenType = 'flower', vigor = 0) => ({ specimenType, vigor, listenPort: 53, sensor: 'test', seenCount: '18446744073709551615' });
const expected = {
  flower: [15000,45000,180000,240000], mushroom: [12000,40000,240000,300000],
  broadleaf: [20000,60000,300000,360000], vine: [20000,60000,480000,600000],
  wirefern: [18000,50000,300000,360000], redbloom: [10000,30000],
  weed: [20000,60000,300000,360000], ghostbloom: [15000,45000,300000,360000],
  crystalfungus: [12000,40000,360000,420000], blackthorn: [20000,60000,600000,720000]
};
assert.deepEqual(core.dimensions, {width:960,height:600,cellSize:30,columns:32,rows:20,capacity:640});
for (const [type, boundaries] of Object.entries(expected)) {
  assert.deepEqual(Object.values(core.timings[type]), boundaries);
  assert(Object.isFrozen(core.timings[type]));
  const stages = type === 'redbloom' ? ['mature','fading','expired'] : ['sprout','growing','mature','fading','expired'];
  let now = 100000; const changes = [];
  const model = core.createGardenModel({now:()=>now,random:()=>.5,onChange:c=>changes.push(c)});
  const { specimen } = model.addEvent(event(type, 3)); const id = specimen.id;
  assert.equal(changes[0].kind,'added'); assert.equal(changes[0].specimen.origin.seenCount,event().seenCount);
  assert.equal(core.stageAt(type,now,now-1),stages[0]);
  assert.equal(specimen.stage,stages[0]);
  changes.length = 0;
  boundaries.forEach((boundary, index) => {
    now = specimen.createdAt + boundary - 1; model.tick();
    assert.equal(specimen.stage,stages[index]); assert.equal(changes.length,index);
    assert.equal(core.nextChangeAt(specimen,now),now+1);
    now++; model.tick();
    assert.equal(core.stageAt(type,specimen.createdAt,now),stages[index+1]);
    assert.equal(changes.length,index+1);
    const change = changes.at(-1);
    assert.equal(change.specimen,specimen); assert.equal(specimen.id,id);
    if (stages[index+1] === 'expired') {
      assert.equal(change.kind,'removed'); assert.equal(change.reason,'expired');
      assert.equal(model.specimens.length,0); assert.equal(model.byCell.size,0);
    } else {
      assert.equal(change.kind,'updated'); assert.equal(change.previousStage,stages[index]);
      assert.equal(specimen.stage,stages[index+1]); assert.equal(model.getCell(specimen.column,specimen.row),specimen);
    }
    model.tick(); assert.equal(changes.length,index+1,'unchanged logical ticks do not notify');
  });
  assert.equal(core.nextChangeAt(specimen,now),null);
}
// Compare both consumers with frozen pre-refactor outcomes, not each other alone.
const order = ['flower','mushroom','vine','broadleaf','wirefern','redbloom','weed','ghostbloom','crystalfungus','blackthorn'];
for (const {rolls,cells} of fixture.cases) {
  const canvas = createCanvas();
  canvas.run(`Math.random=(()=>{const rolls=${JSON.stringify(rolls)};let i=0;return ()=>rolls[i++%rolls.length]})()`);
  let r = 0; const random = () => rolls[r++ % rolls.length];
  // Production consumes one palette roll after each successful spawn; it remains presentation-owned.
  const model = core.createGardenModel({now:()=>canvas.clock.now,random,onChange:c=>{if(c.kind==='added')random();}});
  for (let i=0;i<cells.length;i++) {
    const type=order[i%order.length];
    assert.equal(model.addEvent(event(type,i%4)).specimen.cell,cells[i]);
    const specimen=canvas.run(`spawnSpecimen('${type}',null,${i%4})`);
    assert.equal(specimen.row*32+specimen.column,cells[i]);
  }
}
let now = 100000; const changes = [];
const model = core.createGardenModel({now:()=>now,random:()=>.95,onChange:c=>changes.push(c)});
for(let i=0;i<640;i++) assert(model.addEvent(event()));
assert.equal(model.specimens.length,640); assert.equal(model.byCell.size,640);
assert.equal(new Set(model.specimens.map(s=>s.cell)).size,640);
assert(model.specimens.every(s=>s.column>=0&&s.column<32&&s.row>=0&&s.row<20));
assert.equal(new Set(model.specimens.map(s=>s.id)).size,640);
const fullSnapshot=JSON.stringify(model.specimens); changes.length=0;
assert.equal(model.addEvent(event()),null); assert.equal(JSON.stringify(model.specimens),fullSnapshot);
assert.deepEqual(changes.map(c=>c.kind),['dropped']);
const full = (type='ghostbloom',vigor=3) => {
  model.seed(Array.from({length:640},(_,cell)=>({type,vigor,column:cell%32,row:Math.floor(cell/32),createdAt:now})));
  changes.length=0;
};
// Protected species are excluded even when weaker/older than every normal occupant.
for(const type of ['ghostbloom','crystalfungus','blackthorn']) {
  full(type,0); assert.equal(model.addEvent(event('weed',3)),null);
  assert.equal(model.specimens.length,640); assert.equal(changes.length,1);
}
for(const type of ['flower','mushroom','broadleaf','vine','wirefern','weed','redbloom']) {
  full(); const victim=model.specimens[17]; victim.type=type;victim.vigor=1;
  model.tick(); changes.length=0;
  assert.equal(model.addEvent(event('flower',1)),null,'equal vigor cannot churn');
  assert.equal(model.addEvent(event('flower',0)),null,'lower vigor cannot churn');
  changes.length=0;
  const result=model.addEvent(event('flower',2));
  assert.equal(result.replaced,victim); assert.equal(result.specimen.cell,17);
  assert.notEqual(result.specimen.id,victim.id); assert.equal(model.getCell(17,0),result.specimen);
  assert.equal(model.specimens[17],result.specimen,'replacement retains production ordering');
  assert.deepEqual(changes.map(c=>[c.kind,c.reason]),[['removed','replaced'],['added','replaced']]);
  assert.equal(model.specimens.length,640); assert.equal(model.byCell.size,640);
}
full('flower',2);
model.specimens[4].vigor=0;model.specimens[4].createdAt=now-100;
model.specimens[8].vigor=0;model.specimens[8].createdAt=now-200;
model.specimens[11].vigor=0;model.specimens[11].createdAt=now-200;
model.specimens[0].createdAt=now-1000; // Older but higher vigor loses to the minimum.
assert.equal(model.addEvent(event('weed',3)).specimen.cell,8,'oldest minimum, then first array entry on exact ties');
assert.equal(model.addEvent(event('weed',3)).specimen.cell,11);
assert.equal(model.addEvent(event('weed',3)).specimen.cell,4);
full(); const expired=model.specimens[23];expired.createdAt=now-360000;
model.findReplacementCandidate=()=>{throw Error('Expiry must precede saturation selection');};
const incoming=model.addEvent(event('flower',0));
assert.equal(incoming.replaced,null);assert.equal(incoming.specimen.cell,23);
assert.equal(changes[0].specimen,expired);assert.equal(changes[0].reason,'expired');
assert.deepEqual(changes.map(c=>c.kind),['removed','added']);
// Mutation lifetime overrides normal expiry but does not alter identity/protection/vigor.
model.clear(); const mutation=model.addEvent(event('redbloom',2)).specimen;
mutation.mutation={expiresAt:now+45000}; const mutationId=mutation.id;
now+=30000; model.tick(); assert.equal(model.specimens[0],mutation);assert.equal(mutation.stage,'mutation');assert.equal(mutation.id,mutationId);
now+=15000;model.tick();assert.equal(model.specimens.length,0);
// Local neighbors include diagonals; row ends never connect to the next row's beginning.
model.seed([{type:'vine',vigor:0,column:31,row:0,createdAt:now},{type:'vine',vigor:0,column:0,row:1,createdAt:now},
  {type:'vine',vigor:0,column:30,row:1,createdAt:now}]);
assert.deepEqual(model.getNeighbors(31,0),[model.getCell(30,1)]);
assert.equal(model.getCell(32,0),null);assert.equal(model.getCell(-1,1),null);assert.equal(model.getCell(0,20),null);
const same=model.specimens[0], sameId=same.id;model.seed(model.specimens);assert.equal(same.id,sameId);
const beforeInvalid=JSON.stringify(model.specimens);
for(const entries of [[{...same,column:32}],[{...same,row:-1}],[{...same},{...same}]]) assert.throws(()=>model.seed(entries));
assert.equal(JSON.stringify(model.specimens),beforeInvalid,'invalid fixture import is atomic');
changes.length=0;model.clear();assert.equal(model.specimens.length,0);assert.equal(model.byCell.size,0);
assert.equal(changes.length,3);assert(changes.every(c=>c.reason==='cleared'));
model.clear();assert.equal(changes.length,3);
assert(model.addEvent(event()).specimen.id>sameId,'clear never recycles identities');
assert.equal(model.remove(same),false,'stale specimen cannot remove a new occupant');
const safe=core.normalizeGarden({...event(),sensor:'x'.repeat(200),payload:'secret',remoteIp:'secret',banner:'secret',credentials:'secret'});
assert.deepEqual(Object.keys(safe),['specimenType','listenPort','vigor','sensor','seenCount']);assert.equal(safe.sensor.length,128);
for(const invalid of [null,{},event('unknown'),event('flower',1.1),{...event(),listenPort:0}]) assert.equal(model.addEvent(invalid),null);
const read=p=>fs.readFileSync(p,'utf8'), source=read('wwwroot/garden-core.js'), live=read('wwwroot/pixi-live-core.js');
assert.doesNotMatch(source,/setTimeout|setInterval|requestAnimationFrame|document\.|PIXI|CanvasRenderingContext2D|localStorage|sessionStorage/);
assert.doesNotMatch(live,/function stageAt|const timings\s*=|candidate\.vigor|victimIndex|preferAdjacent|protectedTypes/);
assert.match(live,/garden\.createGardenModel/);assert.match(read('wwwroot/garden.js'),/gardenCore\.createGardenModel/);
for(const page of ['index','pixi-live']) assert.match(read(`wwwroot/${page}.html`),/src="garden-core\.js"/);
assert.doesNotMatch(read('wwwroot/canvas.html'),/pixi/i);
assert.match(live,/new Source\('\/api\/garden\/events'\)/);
assert.match(read('wwwroot/garden.js'),/new EventSource\("\/api\/garden\/events"\)/);
console.log('PASS: frozen production placement oracle; exact ten-species lifecycle boundaries/identity; 640 bounded unique cells; strict vigor/minimum/oldest/protected/weed/redbloom/reused-cell/drop parity; expiry first; mutations; clear/refill; local neighbors; safe fields; shared imports; no timers or duplicated Pixi rules.');
