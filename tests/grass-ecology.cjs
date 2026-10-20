const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const ecology = require("../wwwroot/garden-ecology.js");
const sandbox = { grassConfig: ecology.grassConfig, nextGrassSpreadAt: 0, Math: Object.create(Math) };
const model = ecology.createEcologyModel({ random: () => sandbox.Math.random() });
sandbox.gardenState = model;
sandbox.grassSpreadAttemptCount = model.grassSpreadAttemptCount;
sandbox.spreadGrass = now => { model.nextGrassSpreadAt = sandbox.nextGrassSpreadAt; model.spreadGrass(now); sandbox.nextGrassSpreadAt = model.nextGrassSpreadAt; };
sandbox.Math.random = () => 0;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('wwwroot/garden-grass.js', 'utf8'), sandbox);
const run = code => vm.runInContext(code, sandbox);

assert.equal(sandbox.grassConfig.spreadEveryMs, 4_000);
assert.equal(sandbox.grassConfig.spreadChance, 0.5);
assert.equal(sandbox.grassConfig.fadingSeedChance, 0.4);
assert.equal(sandbox.grassConfig.maxSpreadAttempts, 4);
assert.equal(sandbox.grassConfig.maxFadingSeedChecksPerTick, 6);

for (const [count, attempts] of [[0,0],[1,1],[12,1],[13,2],[24,2],[25,3],[48,3],[49,4],[640,4]]) {
  assert.equal(run(`grassSpreadAttemptCount(${count})`), attempts, `spread attempts for ${count} active cells`);
}

// A healthy mature patch gets a natural spread chance without refreshing the parent.
sandbox.gardenState.grassCells = [{ column: 10, row: 10, createdAt: 0, lastInfluencedAt: 35_000 }];
sandbox.nextGrassSpreadAt = 0;
sandbox.Math.random = () => 0;
sandbox.spreadGrass(40_000);
assert.equal(sandbox.gardenState.grassCells.length, 2);
assert.equal(sandbox.gardenState.grassCells[0].createdAt, 0);
assert.equal(sandbox.gardenState.grassCells[0].lastInfluencedAt, 35_000, 'spreading does not rejuvenate parent');
assert.equal(sandbox.gardenState.grassCells[1].createdAt, 40_000, 'child starts a new generation');

// Thirteen healthy mature cells earn two attempts; successful attempts do not queue beyond the tick.
sandbox.gardenState.grassCells = Array.from({ length: 13 }, (_, column) => ({
  column,
  row: 10,
  createdAt: 0,
  lastInfluencedAt: 35_000
}));
sandbox.nextGrassSpreadAt = 0;
sandbox.Math.random = () => 0;
sandbox.spreadGrass(40_000);
assert.equal(sandbox.gardenState.grassCells.length, 15, 'population band grants two successful attempts');
const afterFirstTick = sandbox.gardenState.grassCells.length;
sandbox.spreadGrass(40_000);
assert.equal(sandbox.gardenState.grassCells.length, afterFirstTick, 'same tick does not catch up or burst');

// Fading turf receives one seed opportunity per influence cycle.
const fadingAt = sandbox.grassConfig.fadingAfterMs;
sandbox.gardenState.grassCells = [{ column: 10, row: 10, createdAt: 0, lastInfluencedAt: 0 }];
sandbox.nextGrassSpreadAt = 0;
sandbox.Math.random = () => 0;
sandbox.spreadGrass(fadingAt);
assert.equal(sandbox.gardenState.grassCells.length, 2, 'fading turf can leave one younger neighbor');
assert.equal(sandbox.gardenState.grassCells[0].fadeSeedAttemptedAt, 0);
sandbox.spreadGrass(fadingAt + 4_000);
assert.equal(sandbox.gardenState.grassCells.length, 2, 'same fade cycle does not seed twice');

// A later traffic refresh changes lastInfluencedAt, so a future fade earns another chance.
sandbox.gardenState.grassCells[0].lastInfluencedAt = 10_000;
sandbox.nextGrassSpreadAt = 0;
sandbox.spreadGrass(fadingAt + 10_000);
assert.equal(sandbox.gardenState.grassCells[0].fadeSeedAttemptedAt, 10_000);
assert.equal(sandbox.gardenState.grassCells.length, 3, 'rejuvenated turf can seed again on a later fade');

// Failed final-seed rolls are consumed rather than retried forever.
sandbox.gardenState.grassCells = [{ column: 10, row: 10, createdAt: 0, lastInfluencedAt: 0 }];
sandbox.nextGrassSpreadAt = 0;
sandbox.Math.random = () => 0.99;
sandbox.spreadGrass(fadingAt);
assert.equal(sandbox.gardenState.grassCells.length, 1);
assert.equal(sandbox.gardenState.grassCells[0].fadeSeedAttemptedAt, 0);
sandbox.spreadGrass(fadingAt + 4_000);
assert.equal(sandbox.gardenState.grassCells.length, 1, 'failed fade opportunity is not retried');

// Synchronized old turf is smoothed across ticks instead of checking every cell at once.
sandbox.gardenState.grassCells = Array.from({ length: 10 }, (_, index) => ({
  column: index * 2,
  row: 10,
  createdAt: 0,
  lastInfluencedAt: 0
}));
sandbox.nextGrassSpreadAt = 0;
sandbox.Math.random = () => 0.99;
sandbox.spreadGrass(fadingAt);
assert.equal(sandbox.gardenState.grassCells.filter(cell => cell.fadeSeedAttemptedAt === 0).length, 6);
sandbox.spreadGrass(fadingAt + 4_000);
assert.equal(sandbox.gardenState.grassCells.filter(cell => cell.fadeSeedAttemptedAt === 0).length, 10);

console.log('PASS: grass spread scales with healthy population, aging turf gets one bounded seed chance, parents still age naturally.');
