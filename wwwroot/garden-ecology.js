// Authoritative grass and weather-residue rules, shared by both garden renderers.
(function () {
  'use strict';
  const core = typeof module !== 'undefined' && module.exports ? require('./garden-core.js') : window.PacketGardenCore;
  const { columns, rows, width: gardenWidth, height: gardenHeight } = core.dimensions;
  const grassConfig = {
    influenceChances: { dns: 0.45, http: 0.65 },
    secondCellChance: 0.35,
    sameCellChance: 0.5,
    influenceRadius: 1,
    growingAfterMs: 10_000,
    matureAfterMs: 30_000,
    fadingAfterMs: 20 * 60_000,
    dyingAfterMs: 27 * 60_000,
    deadAfterMs: 32 * 60_000,
    expiredAfterMs: 35 * 60_000,
    spreadEveryMs: 4_000,
    spreadChance: 0.5,
    fadingSeedChance: 0.4,
    maxSpreadAttempts: 4,
    maxFadingSeedChecksPerTick: 6,
    initialSeeds: 12,
    reseedEveryMs: 60_000,
    reseedChance: 0.25,
    reseedMinFreeCells: 8
  };

  const puddleConfig = {
    maxPuddles: 8,
    checkEveryMs: 15_000,
    refreshChance: 0.6,
    nearbySpawnChance: 0.7,
    initialSize: 10,
    initialMaxSize: 18,
    maxSize: 36,
    growthPerRefresh: 4,
    growthDurationMs: 15_000,
    edgePadding: 60,
    drainDelayAfterLastRefreshMs: 30_000,
    drainDurationMs: 8 * 60_000
  };
  const puddleFormationChances = new Map([
    ["heavy_rain", 0.35], ["botnet_thunderstorm", 0.60], ["botnet_hurricane", 0.85]
  ]);

  function grassVisualState(grass, now) {
    const ageMs = Math.max(0, now - grass.createdAt);
    const idleMs = Math.max(0, now - grass.lastInfluencedAt);
  
    const growing = Math.min(1, ageMs / grassConfig.growingAfterMs);
    const expansion = Math.min(1, Math.max(0,
      (ageMs - grassConfig.growingAfterMs) / (grassConfig.matureAfterMs - grassConfig.growingAfterMs)));
    const growth = 0.18 + growing * 0.12 + expansion * 0.7;
    const decline = Math.min(1, Math.max(0,
      (idleMs - grassConfig.fadingAfterMs) / (grassConfig.expiredAfterMs - grassConfig.fadingAfterMs)));
    // Green -> yellow -> brown -> dead turf; interpolate rather than jumping colors.
    const colors = [[91, 151, 64], [144, 137, 74], [133, 105, 67], [112, 93, 69]];
    const thresholds = [grassConfig.fadingAfterMs, grassConfig.dyingAfterMs,
      grassConfig.deadAfterMs, grassConfig.expiredAfterMs];
    const colorStage = idleMs < thresholds[1] ? 0 : idleMs < thresholds[2] ? 1 : 2;
    const colorProgress = Math.min(1, Math.max(0,
      (idleMs - thresholds[colorStage]) / (thresholds[colorStage + 1] - thresholds[colorStage])));
    const color = colors[colorStage].map((channel, index) => Math.round(
      channel + (colors[colorStage + 1][index] - channel) * colorProgress));
    return { growth, expansion, decline, color, opacity: 0.6 * (1 - 0.65 * decline),
      stage: idleMs >= grassConfig.expiredAfterMs ? 'expired' : idleMs >= grassConfig.deadAfterMs ? 'dead'
        : idleMs >= grassConfig.dyingAfterMs ? 'dying' : idleMs >= grassConfig.fadingAfterMs ? 'fading'
        : ageMs < grassConfig.growingAfterMs ? 'sprout' : ageMs < grassConfig.matureAfterMs ? 'growing' : 'mature' };
  }
  function nextGrassVisualChangeAt(grass, now, continuousVisualRefreshMs = 1000) {
    const maturity = grass.createdAt + grassConfig.matureAfterMs;
    const fade = grass.lastInfluencedAt + grassConfig.fadingAfterMs;
    const expiry = grass.lastInfluencedAt + grassConfig.expiredAfterMs;
    if (now >= expiry) return null;
    let next = expiry;
    // Geometry interpolates through growth, and geometry/opacity/color interpolate through fade.
    if (now < maturity || now >= fade) next = Math.min(next, now + continuousVisualRefreshMs);
    for (const at of [grass.createdAt + grassConfig.growingAfterMs, maturity, fade,
      grass.lastInfluencedAt + grassConfig.dyingAfterMs, grass.lastInfluencedAt + grassConfig.deadAfterMs]) {
      if (at > now) next = Math.min(next, at);
    }
    return next;
  }


  function puddleVisualState(puddle, now = Date.now()) {
    const elapsed = Math.max(0, now - puddle.lastRefreshedAt);
    const growth = Math.min(1, elapsed / puddleConfig.growthDurationMs);
    const wetness = Math.max(0, 1 - Math.max(0, elapsed - puddleConfig.drainDelayAfterLastRefreshMs) / puddleConfig.drainDurationMs);
    return {
      size: (puddle.size + (puddle.maxSize - puddle.size) * growth) * Math.sqrt(wetness),
      opacity: 0.38 * wetness
    };
  }


  function createEcologyModel({ now: clock = Date.now, random: defaultRandom = Math.random, onChange = () => {}, weather = 'quiet', isCellOccupied = () => false } = {}) {
    const gardenState = { grassCells: [], puddles: [] };
    const random = () => defaultRandom();
    let nextGrassSpreadAt = 0, weatherLevel = weather;
    let nextGrassReseedAt = clock() + grassConfig.reseedEveryMs;
    let puddleStormActive = puddleFormationChances.has(weatherLevel);
    let nextPuddleCheckAt = clock() + puddleConfig.checkEveryMs;
    const notify = (kind, item) => onChange({ kind, item });
    function influenceGrass(eventType, specimen, now = clock()) {
      const chance = Object.hasOwn(grassConfig.influenceChances, eventType) ? grassConfig.influenceChances[eventType] : 0;
      if (chance === 0 || random() >= chance) return;

      let column = specimen.column;
      let row = specimen.row;
      const neighbors = grassNeighbors(column, row);
      if (random() >= grassConfig.sameCellChance) {
        if (neighbors.length > 0) {
          const neighbor = neighbors[Math.floor(random() * neighbors.length)];
          column = neighbor.column;
          row = neighbor.row;
        }
      }

      influenceGrassCell(column, row, now);
      if (random() < grassConfig.secondCellChance) {
        const otherNeighbors = neighbors.filter(cell => cell.column !== column || cell.row !== row);
        if (otherNeighbors.length > 0) {
          const second = otherNeighbors[Math.floor(random() * otherNeighbors.length)];
          influenceGrassCell(second.column, second.row, now);
        }
      }
    }

    function grassNeighbors(column, row) {
      const neighbors = [];
      for (let dy = -grassConfig.influenceRadius; dy <= grassConfig.influenceRadius; dy++) {
        for (let dx = -grassConfig.influenceRadius; dx <= grassConfig.influenceRadius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const neighborColumn = column + dx;
          const neighborRow = row + dy;
          if (neighborColumn >= 0 && neighborColumn < columns && neighborRow >= 0 && neighborRow < rows) {
            neighbors.push({ column: neighborColumn, row: neighborRow });
          }
        }
      }
      return neighbors;
    }

    function influenceGrassCell(column, row, now = clock()) {
      if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || column >= columns || row < 0 || row >= rows) return null;
      if (isCellOccupied(column, row)) return null;
      const grass = gardenState.grassCells.find(cell => cell.column === column && cell.row === row);
      if (grass) {
        if (grass.lastInfluencedAt !== now) {
          grass.lastInfluencedAt = now;
          notify('grass-refreshed', grass);
        }
        return grass;
      } else {
        const added = { column, row, createdAt: now, lastInfluencedAt: now };
        gardenState.grassCells.push(added);
        notify('grass-added', added);
        return added;
      }
    }

    function removeGrassCell(column, row) {
      const index = gardenState.grassCells.findIndex(cell => cell.column === column && cell.row === row);
      if (index < 0) return null;
      const [grass] = gardenState.grassCells.splice(index, 1);
      notify('grass-removed', grass); return grass;
    }

    function seedInitialGrass(at = clock()) {
      const total = columns * rows, count = grassConfig.initialSeeds;
      for (let region = 0; region < count; region++) {
        const start = Math.floor(region * total / count), end = Math.floor((region + 1) * total / count);
        const empty = [];
        for (let cell = start; cell < end; cell++) {
          if (!isCellOccupied(cell % columns, Math.floor(cell / columns))
            && !gardenState.grassCells.some(grass => grass.row * columns + grass.column === cell)) empty.push(cell);
        }
        if (!empty.length) continue;
        const cell = empty[Math.floor(random() * empty.length)];
        influenceGrassCell(cell % columns, Math.floor(cell / columns), at);
      }
    }

    function reseedGrass(at) {
      if (at < nextGrassReseedAt) return;
      const missedWindow = at >= nextGrassReseedAt + grassConfig.reseedEveryMs;
      nextGrassReseedAt = at + grassConfig.reseedEveryMs;
      if (missedWindow || gardenState.grassCells.length) return;
      // Only an empty population needs this bounded occupancy scan, once per minute.
      const empty = [];
      for (let cell = 0; cell < columns * rows; cell++) {
        if (!isCellOccupied(cell % columns, Math.floor(cell / columns))) empty.push(cell);
      }
      if (empty.length < grassConfig.reseedMinFreeCells || random() >= grassConfig.reseedChance) return;
      const cell = empty[Math.floor(random() * empty.length)];
      influenceGrassCell(cell % columns, Math.floor(cell / columns), at);
    }

    function grassSpreadAttemptCount(activeCount) {
      if (activeCount <= 0) return 0;
      if (activeCount <= 12) return 1;
      if (activeCount <= 24) return 2;
      if (activeCount <= 48) return 3;
      return grassConfig.maxSpreadAttempts;
    }

    function emptyGrassNeighbors(grass, occupied) {
      return grassNeighbors(grass.column, grass.row).filter(
        cell => !occupied.has(cell.row * columns + cell.column) && !isCellOccupied(cell.column, cell.row)
      );
    }

    function seedGrassNeighbor(grass, occupied, now) {
      const neighbors = emptyGrassNeighbors(grass, occupied);
      if (neighbors.length === 0) return false;
      const target = neighbors[Math.floor(random() * neighbors.length)];
      influenceGrassCell(target.column, target.row, now);
      occupied.add(target.row * columns + target.column);
      return true;
    }

    function spreadGrass(now) {
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
        if (random() < grassConfig.fadingSeedChance) {
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
        if (random() >= grassConfig.spreadChance) continue;
        const candidates = active.filter(grass => emptyGrassNeighbors(grass, occupied).length > 0);
        if (candidates.length === 0) break;
        const parent = candidates[Math.floor(random() * candidates.length)];
        seedGrassNeighbor(parent, occupied, now);
      }
    }
    function removeExpiredPuddles(now) {
      const lifetime = puddleConfig.drainDelayAfterLastRefreshMs + puddleConfig.drainDurationMs;
      const active = gardenState.puddles.filter(puddle => now - puddle.lastRefreshedAt < lifetime);
      if (active.length === gardenState.puddles.length) return false;
      for (const puddle of gardenState.puddles) if (!active.includes(puddle)) notify('puddle-removed', puddle);
      gardenState.puddles = active;
      return true;
    }

    // Only a change in eligibility resets the cadence; same-level live polls do not postpone it.
    function updatePuddleWeather(now = clock()) {
      const severe = puddleFormationChances.has(weatherLevel);
      if (severe === puddleStormActive) return;
      puddleStormActive = severe;
      nextPuddleCheckAt = now + puddleConfig.checkEveryMs;
    }

    function resetPuddleFormationClock(now = clock()) {
      puddleStormActive = puddleFormationChances.has(weatherLevel);
      nextPuddleCheckAt = now + puddleConfig.checkEveryMs;
      return removeExpiredPuddles(now);
    }

    function createStormPuddle(now, random = defaultRandom) {
      if (gardenState.puddles.length >= puddleConfig.maxPuddles) return null;
      const padding = puddleConfig.edgePadding;
      let x, y;
      if (gardenState.puddles.length && random() < puddleConfig.nearbySpawnChance) {
        const neighbor = gardenState.puddles[Math.floor(random() * gardenState.puddles.length)];
        const angle = random() * Math.PI * 2, distance = 24 + random() * 24;
        x = neighbor.x + Math.cos(angle) * distance;
        y = neighbor.y + Math.sin(angle) * distance;
      } else {
        x = padding + random() * (gardenWidth - padding * 2);
        y = padding + random() * (gardenHeight - padding * 2);
      }
      const puddle = {
        x: Math.min(gardenWidth - padding, Math.max(padding, x)),
        y: Math.min(gardenHeight - padding, Math.max(padding, y)),
        seed: random(), size: puddleConfig.initialSize, maxSize: puddleConfig.initialMaxSize,
        createdAt: now, lastRefreshedAt: now
      };
      gardenState.puddles.push(puddle);
      notify('puddle-added', puddle);
      return puddle;
    }

    function refreshStormPuddle(puddle, now) {
      // Start from its current visible size so refreshing drained water does not jump in size.
      puddle.size = puddleVisualState(puddle, now).size;
      puddle.maxSize = Math.min(puddleConfig.maxSize, puddle.maxSize + puddleConfig.growthPerRefresh);
      puddle.lastRefreshedAt = now;
      notify('puddle-refreshed', puddle);
    }

    // One attempt at most on the existing garden tick, even after a long pause.
    function tickPuddles(now = clock(), random = defaultRandom, hidden = false) {
      const removed = removeExpiredPuddles(now);
      updatePuddleWeather(now);
      if (hidden) {
        nextPuddleCheckAt = now + puddleConfig.checkEveryMs;
        return removed;
      }
      if (!puddleStormActive || now < nextPuddleCheckAt) return removed;
      nextPuddleCheckAt = now + puddleConfig.checkEveryMs;
      if (random() >= puddleFormationChances.get(weatherLevel)) return removed;
      if (gardenState.puddles.length
        && (gardenState.puddles.length >= puddleConfig.maxPuddles || random() < puddleConfig.refreshChance)) {
        refreshStormPuddle(gardenState.puddles[Math.floor(random() * gardenState.puddles.length)], now);
      } else {
        createStormPuddle(now, random);
      }
      return true;
    }


    function removeExpiredGrass(at = clock()) {
      gardenState.grassCells = gardenState.grassCells.filter(grass => {
        if (at - grass.lastInfluencedAt < grassConfig.expiredAfterMs) return true;
        notify('grass-removed', grass); return false;
      });
    }
    function tickGrass(at = clock(), hidden = false) {
      removeExpiredGrass(at);
      if (hidden) {
        nextGrassSpreadAt = at + grassConfig.spreadEveryMs;
        nextGrassReseedAt = at + grassConfig.reseedEveryMs;
      } else {
        if (gardenState.grassCells.length) spreadGrass(at);
        reseedGrass(at);
      }
    }
    function updateWeatherEligibility(level, at = clock()) { weatherLevel = level; updatePuddleWeather(at); }
    function resetCadence(at = clock()) {
      nextGrassSpreadAt = at + grassConfig.spreadEveryMs;
      nextGrassReseedAt = at + grassConfig.reseedEveryMs;
      resetPuddleFormationClock(at);
    }
    function clearGrass() { const cells = gardenState.grassCells; gardenState.grassCells = []; for (const cell of cells) notify('grass-removed', cell); }
    function clearPuddles() { const puddles = gardenState.puddles; gardenState.puddles = []; for (const puddle of puddles) notify('puddle-removed', puddle); }
    function seed({ grassCells = [], puddles = [] }) {
      // Validated local fixture import. Live input always goes through the rules above.
      const cells = new Set();
      for (const cell of grassCells) {
        const { column, row, createdAt, lastInfluencedAt } = cell, key = row * columns + column;
        if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || column >= columns || row < 0 || row >= rows
          || !Number.isFinite(createdAt) || !Number.isFinite(lastInfluencedAt) || cells.has(key)) throw new Error('Invalid grass seed');
        cells.add(key);
      }
      if (puddles.length > puddleConfig.maxPuddles || new Set(puddles).size !== puddles.length) throw new Error('Invalid puddle seed');
      for (const puddle of puddles) {
        if (!['x', 'y', 'seed', 'size', 'maxSize', 'createdAt', 'lastRefreshedAt'].every(key => Number.isFinite(puddle[key]))
          || puddle.x < puddleConfig.edgePadding || puddle.x > gardenWidth - puddleConfig.edgePadding
          || puddle.y < puddleConfig.edgePadding || puddle.y > gardenHeight - puddleConfig.edgePadding
          || puddle.size < 0 || puddle.maxSize < 0 || puddle.maxSize > puddleConfig.maxSize) throw new Error('Invalid puddle seed');
      }
      clearGrass(); clearPuddles();
      for (const cell of grassCells) {
        if (isCellOccupied(cell.column, cell.row)) continue;
        gardenState.grassCells.push(cell); notify('grass-added', cell);
      }
      for (const puddle of puddles) { gardenState.puddles.push(puddle); notify('puddle-added', puddle); }
    }
    return {
      get grassCells() { return gardenState.grassCells; },
      set grassCells(entries) { gardenState.grassCells = entries; }, // legacy Canvas fixture compatibility
      get puddles() { return gardenState.puddles; },
      set puddles(entries) { gardenState.puddles = entries; },
      get nextGrassSpreadAt() { return nextGrassSpreadAt; }, set nextGrassSpreadAt(at) { nextGrassSpreadAt = at; },
      get nextGrassReseedAt() { return nextGrassReseedAt; },
      get nextPuddleCheckAt() { return nextPuddleCheckAt; }, set nextPuddleCheckAt(at) { nextPuddleCheckAt = at; },
      influenceGrass, influenceGrassCell, removeGrassCell, seedInitialGrass, grassNeighbors, grassSpreadAttemptCount, spreadGrass, tickGrass, removeExpiredGrass, updateWeatherEligibility, tickPuddles,
      createStormPuddle, refreshStormPuddle, removeExpiredPuddles, resetPuddleFormationClock, resetCadence,
      seed, clearGrass, clearPuddles, clear() { clearGrass(); clearPuddles(); },
      tick(at = clock(), { hidden = false } = {}) { tickGrass(at, hidden); return tickPuddles(at, defaultRandom, hidden); }
    };
  }
  const api = { grassConfig, puddleConfig, puddleFormationChances, grassVisualState, puddleVisualState,
    nextGrassVisualChangeAt, createEcologyModel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenEcology = api;
})();
