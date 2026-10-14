const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const sandbox = {
  grassConfig: {
    matureAfterMs: 30_000,
    fadingAfterMs: 20 * 60_000,
    spreadEveryMs: 5_000,
    spreadChance: 0.35
  },
  gardenState: { grassCells: [] },
  columns: 32,
  nextGrassSpreadAt: 0,
  Math: Object.create(Math)
};

sandbox.grassNeighbors = (column, row) => {
  const neighbors = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const neighborColumn = column + dx;
      const neighborRow = row + dy;
      if (neighborColumn >= 0 && neighborColumn < 32 && neighborRow >= 0 && neighborRow < 20) {
        neighbors.push({ column: neighborColumn, row: neighborRow });
      }
    }
  }
  return neighbors;
};

sandbox.influenceGrassCell = (column, row, now) => {
  const existing = sandbox.gardenState.grassCells.find(
    cell => cell.column === column && cell.row === row
  );
  if (existing) existing.lastInfluencedAt = now;
  else sandbox.gardenState.grassCells.push({ column, row, createdAt: now, lastInfluencedAt: now });
};

sandbox.spreadGrass = () => { throw new Error('original spreadGrass should be replaced'); };
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
