// Shared rules: exact constants, frozen pre-extraction results and boundary behavior.
const assert = require('node:assert/strict'), fs = require('node:fs');
const E = require('../wwwroot/garden-ecology.js');
assert.deepEqual(E.grassConfig, { influenceChances: { dns: .45, http: .65 }, secondCellChance: .35, sameCellChance: .5,
  influenceRadius: 1, growingAfterMs: 10000, matureAfterMs: 30000, fadingAfterMs: 1200000,
  dyingAfterMs: 1620000, deadAfterMs: 1920000, expiredAfterMs: 2100000,
  spreadEveryMs: 4000, spreadChance: .7, fadingSeedChance: .4, maxSpreadAttempts: 6, maxFadingSeedChecksPerTick: 6,
  initialSeeds:12, reseedEveryMs:60000, maxMaintenanceSeeds:3, sparseHealthyRatio:.1, strandedHealthyRatio:.75 });
for (const test of require('./fixtures/production-ecology.json').cases) {
  let i = 0;
  const model = E.createEcologyModel({ random: () => test.rolls[i++ % test.rolls.length] });
  for (let n = 0; n < 80; n++) model.influenceGrass(n % 3 === 0 ? 'http' : 'dns', { column: n % 32, row: Math.floor(n / 32) }, 1000 + n);
  const influence=cells=>cells.filter(c=>c.createdAt<40000).map(({fadeSeedAttemptedAt,...cell})=>cell);
  assert.deepEqual(influence(model.grassCells),influence(test.cells),'network influence retains its historical random order, coordinates and timestamps');
}
const make = (rolls = [.99]) => { let i = 0; return E.createEcologyModel({ now: () => 0, random: () => rolls[Math.min(i++, rolls.length - 1)] }); };
for (const [event, chance] of [['dns',.45],['http',.65]]) {
  for (const [roll, expected] of [[chance,0],[chance-1e-10,1]]) {
    const m = make([roll,.49,.35]); m.influenceGrass(event, { column: 0, row: 0 }, 100);
    assert.equal(m.grassCells.length, expected);
  }
}
const ineligible = E.createEcologyModel({ random: () => { throw Error('ineligible events must not roll'); } });
for (const event of ['tcpnoise','flower','broadleaf','wirefern','ssh','gopher','port22-probe','80','443']) ineligible.influenceGrass(event,{column:10,row:10},100);
assert.equal(ineligible.grassCells.length,0);
const same = make([0,.499999,.35]); same.influenceGrass('dns',{column:0,row:0},100);
assert.deepEqual(same.grassCells.map(c=>[c.column,c.row]),[[0,0]]);
const neighbor = make([0,.5,0,.35]); neighbor.influenceGrass('http',{column:0,row:0},100);
assert.deepEqual(neighbor.grassCells.map(c=>[c.column,c.row]),[[1,0]], 'same-cell equality chooses a neighbor without wrapping');
const second = make([0,0,.349999,0]); second.influenceGrass('dns',{column:0,row:0},100);
assert.deepEqual(second.grassCells.map(c=>[c.column,c.row]),[[0,0],[1,0]]);
const c = second.grassCells[0]; assert.equal(second.influenceGrassCell(0,0,200),c);
assert.equal(c.createdAt,100); assert.equal(c.lastInfluencedAt,200); assert.equal(second.grassCells.length,2);
for (const [x,y] of [[-1,0],[32,0],[0,-1],[0,20],[.5,0]]) assert.equal(second.influenceGrassCell(x,y,200),null);
for (let row=0;row<20;row++) for (let col=0;col<32;col++) second.influenceGrassCell(col,row,300);
assert.equal(second.grassCells.length,640); assert.equal(new Set(second.grassCells.map(c=>c.row*32+c.column)).size,640);
for (const age of [29999,30000]) {
  const m = make([0]); m.influenceGrassCell(10,10,0); m.tickGrass(age);
  assert.equal(m.grassCells.length,age===30000?2:1);
}
for (const roll of [.699999,.7]) {
  const m=make([roll,0,0]); m.influenceGrassCell(10,10,0);m.tickGrass(30000);
  assert.equal(m.grassCells.length,roll<.7?2:1);
}
const cadence=make([0]);cadence.influenceGrassCell(10,10,0);cadence.tickGrass(30000);
const count=cadence.grassCells.length;cadence.tickGrass(33999);assert.equal(cadence.grassCells.length,count);
cadence.tickGrass(34000);assert.equal(cadence.grassCells.length,count+1);
cadence.tickGrass(300000);const afterPause=cadence.grassCells.length;cadence.tickGrass(300000);assert.equal(cadence.grassCells.length,afterPause);
assert.equal(cadence.nextGrassSpreadAt,304000);
const removed=[];const expiry=E.createEcologyModel({random:()=>.99,onChange:c=>{if(c.kind==='grass-removed')removed.push(c.item)}});
const old=expiry.influenceGrassCell(0,0,0),young=expiry.influenceGrassCell(1,0,1);
expiry.tickGrass(2100000);assert.deepEqual(removed,[old]);assert.deepEqual(expiry.grassCells,[young]);
const hidden=make([0]);hidden.influenceGrassCell(0,0,0);hidden.resetCadence(100000);hidden.tick(100000);
assert.equal(hidden.grassCells.length,1);assert.equal(hidden.nextGrassSpreadAt,104000);
hidden.tick(200000,{hidden:true});assert.equal(hidden.grassCells.length,1);assert.equal(hidden.nextGrassSpreadAt,204000);
for(const [age,stage,growth] of [[0,'sprout',.18],[10000,'growing',.3],[30000,'mature',1],[1200000,'fading',1],[1620000,'dying',1],[1920000,'dead',1],[2100000,'expired',1]]) {
  const v=E.grassVisualState({createdAt:0,lastInfluencedAt:0},age);assert.equal(v.stage,stage);assert.equal(v.growth,growth);
}
const grass={createdAt:0,lastInfluencedAt:0};assert.equal(E.nextGrassVisualChangeAt(grass,30000),1200000);
for(const [at,color] of [[30000,[91,151,64]],[1620000,[144,137,74]],[1920000,[133,105,67]],[2100000,[112,93,69]]]) {
  assert.deepEqual(E.grassVisualState(grass,at).color,color,'richer healthy green retains the established yellow/brown/dead anchors');
}
assert.equal(E.nextGrassVisualChangeAt(grass,1200000),1201000);
for(const roll of [.399999,.4]) {
  const m=make([roll,0,0]);m.influenceGrassCell(10,10,0);m.tickGrass(1200000);
  assert.equal(m.grassCells.length,roll<.4?2:1,'fading cells have one final seed roll and no normal spread attempt');
  assert.equal(m.grassCells[0].fadeSeedAttemptedAt,0);
}
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-ecology.js','utf8'),/setTimeout|setInterval|PIXI|CanvasRenderingContext2D|document\.|localStorage|sessionStorage/);
require('./grass-ecology.cjs');
console.log('PASS: tuned grass config/influence/placement/refresh/identity/grid/cadence/expiry/visual math; historical influence oracle; shared ownership; no per-cell timers.');
