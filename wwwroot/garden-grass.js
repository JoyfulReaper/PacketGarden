// Population-aware grass reproduction policy. Loaded after garden.js so it can
// refine the core grass lifecycle without changing specimen or weather behavior.
Object.assign(grassConfig, {
  spreadEveryMs: 4_000,
  spreadChance: 0.5,
  fadingSeedChance: 0.4,
  maxSpreadAttempts: 4,
  maxFadingSeedChecksPerTick: 6
});

function grassSpreadAttemptCount(activeCount) {
  if (activeCount <= 0) return 0;
  if (activeCount <= 12) return 1;
  if (activeCount <= 24) return 2;
  if (activeCount <= 48) return 3;
  return grassConfig.maxSpreadAttempts;
}

function emptyGrassNeighbors(grass, occupied) {
  return grassNeighbors(grass.column, grass.row).filter(
    cell => !occupied.has(cell.row * columns + cell.column)
  );
}

function seedGrassNeighbor(grass, occupied, now) {
  const neighbors = emptyGrassNeighbors(grass, occupied);
  if (neighbors.length === 0) return false;
  const target = neighbors[Math.floor(Math.random() * neighbors.length)];
  influenceGrassCell(target.column, target.row, now);
  occupied.add(target.row * columns + target.column);
  return true;
}

spreadGrass = function spreadGrassPopulationAware(now) {
  if (now < nextGrassSpreadAt) return;
  nextGrassSpreadAt = now + grassConfig.spreadEveryMs;

  const occupied = new Set(
    gardenState.grassCells.map(cell => cell.row * columns + cell.column)
  );

  // Give aging turf one final bounded seed opportunity per influence cycle.
  // Storing the lastInfluencedAt value avoids changing the core grass object
  // shape and automatically grants a new opportunity after later rejuvenation.
  let fadingChecks = 0;
  for (const grass of gardenState.grassCells) {
    if (fadingChecks >= grassConfig.maxFadingSeedChecksPerTick) break;
    const idleMs = now - grass.lastInfluencedAt;
    if (idleMs < grassConfig.fadingAfterMs) continue;
    if (grass.fadeSeedAttemptedAt === grass.lastInfluencedAt) continue;

    grass.fadeSeedAttemptedAt = grass.lastInfluencedAt;
    fadingChecks++;
    if (Math.random() < grassConfig.fadingSeedChance) {
      seedGrassNeighbor(grass, occupied, now);
    }
  }

  const active = gardenState.grassCells.filter(grass => {
    const ageMs = now - grass.createdAt;
    const idleMs = now - grass.lastInfluencedAt;
    return ageMs >= grassConfig.matureAfterMs
      && idleMs < grassConfig.fadingAfterMs
      && emptyGrassNeighbors(grass, occupied).length > 0;
  });

  const attempts = grassSpreadAttemptCount(active.length);
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (Math.random() >= grassConfig.spreadChance) continue;
    const candidates = active.filter(grass => emptyGrassNeighbors(grass, occupied).length > 0);
    if (candidates.length === 0) break;
    const parent = candidates[Math.floor(Math.random() * candidates.length)];
    seedGrassNeighbor(parent, occupied, now);
  }
};
