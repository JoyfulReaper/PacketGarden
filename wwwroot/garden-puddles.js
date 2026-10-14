// Temporary weather residue only: no occupancy, provenance, damage, or collection.
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
let puddleStormActive = puddleFormationChances.has(weatherState.level);
let nextPuddleCheckAt = Date.now() + puddleConfig.checkEveryMs;

function puddleVisualState(puddle, now = Date.now()) {
  const elapsed = Math.max(0, now - puddle.lastRefreshedAt);
  const growth = Math.min(1, elapsed / puddleConfig.growthDurationMs);
  const wetness = Math.max(0, 1 - Math.max(0, elapsed - puddleConfig.drainDelayAfterLastRefreshMs) / puddleConfig.drainDurationMs);
  return {
    size: (puddle.size + (puddle.maxSize - puddle.size) * growth) * Math.sqrt(wetness),
    opacity: 0.38 * wetness
  };
}

function removeExpiredPuddles(now) {
  const lifetime = puddleConfig.drainDelayAfterLastRefreshMs + puddleConfig.drainDurationMs;
  const active = gardenState.puddles.filter(puddle => now - puddle.lastRefreshedAt < lifetime);
  if (active.length === gardenState.puddles.length) return false;
  gardenState.puddles = active;
  return true;
}

// Only a change in eligibility resets the cadence; same-level live polls do not postpone it.
function updatePuddleWeather(now = Date.now()) {
  const severe = puddleFormationChances.has(weatherState.level);
  if (severe === puddleStormActive) return;
  puddleStormActive = severe;
  nextPuddleCheckAt = now + puddleConfig.checkEveryMs;
}

function resetPuddleFormationClock(now = Date.now()) {
  puddleStormActive = puddleFormationChances.has(weatherState.level);
  nextPuddleCheckAt = now + puddleConfig.checkEveryMs;
  return removeExpiredPuddles(now);
}

function createStormPuddle(now, random = Math.random) {
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
  return puddle;
}

function refreshStormPuddle(puddle, now) {
  // Start from its current visible size so refreshing drained water does not jump in size.
  puddle.size = puddleVisualState(puddle, now).size;
  puddle.maxSize = Math.min(puddleConfig.maxSize, puddle.maxSize + puddleConfig.growthPerRefresh);
  puddle.lastRefreshedAt = now;
}

// One attempt at most on the existing garden tick, even after a long pause.
function updateGardenPuddles(now = Date.now(), random = Math.random) {
  const removed = removeExpiredPuddles(now);
  updatePuddleWeather(now);
  if (document.hidden) {
    nextPuddleCheckAt = now + puddleConfig.checkEveryMs;
    return removed;
  }
  if (!puddleStormActive || now < nextPuddleCheckAt) return removed;
  nextPuddleCheckAt = now + puddleConfig.checkEveryMs;
  if (random() >= puddleFormationChances.get(weatherState.level)) return removed;
  if (gardenState.puddles.length
    && (gardenState.puddles.length >= puddleConfig.maxPuddles || random() < puddleConfig.refreshChance)) {
    refreshStormPuddle(gardenState.puddles[Math.floor(random() * gardenState.puddles.length)], now);
  } else {
    createStormPuddle(now, random);
  }
  return true;
}

const puddleEllipses = [[0, 0, 1, 0.65], [-0.4, 0.16, 0.7, 0.5], [0.38, -0.18, 0.72, 0.48]];

// Cached terrain: grass below, specimens above. Shape is stable; only slow drainage changes it.
function drawGardenPuddles(now) {
  for (const puddle of gardenState.puddles) {
    const { size, opacity } = puddleVisualState(puddle, now);
    if (size <= 0 || opacity <= 0) continue;
    context.save();
    context.translate(puddle.x, puddle.y);
    context.rotate(puddle.seed * Math.PI * 2);
    context.fillStyle = `rgba(73, 117, 121, ${opacity})`;
    context.strokeStyle = `rgba(37, 63, 70, ${opacity * 0.6})`;
    context.lineWidth = 1.2;
    context.beginPath();
    for (const [x, y, rx, ry] of puddleEllipses) {
      context.moveTo((x + rx) * size, y * size);
      context.ellipse(x * size, y * size, rx * size, ry * size, 0, 0, Math.PI * 2);
    }
    context.fill(); context.stroke();
    context.strokeStyle = `rgba(178, 201, 192, ${opacity * 0.5})`;
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(-size * 0.1, -size * 0.13, size * 0.65, size * 0.33, 0, Math.PI * 1.1, Math.PI * 1.7);
    context.stroke();
    context.restore();
  }
}
