// Canvas presentation adapter for the shared weather-residue model.
const { puddleConfig, puddleFormationChances, puddleVisualState } = gardenEcologyCore;
// Radius steps of 0.5 logical px (irregular/rotated shores move <0.66 px),
// or 0.02 model-opacity changes. No change to the interpolation or deadlines.
const puddleVisualThresholds = { size: 0.5, opacity: 0.02 };

let nextPuddleCheckAt = gardenEcology.nextPuddleCheckAt;
function nextPuddleVisualChangeAt(puddle, now) {
  const refreshed = puddle.lastRefreshedAt;
  const growthEnd = refreshed + puddleConfig.growthDurationMs;
  const drainStart = refreshed + puddleConfig.drainDelayAfterLastRefreshMs;
  const expiry = drainStart + puddleConfig.drainDurationMs;
  if (now >= expiry) return null;
  const growthSize = puddle.maxSize - puddle.size;
  if (now < growthEnd && growthSize > 0) {
    return Math.min(growthEnd, Math.max(now, refreshed)
      + puddleConfig.growthDurationMs * puddleVisualThresholds.size / growthSize);
  }
  const visual = puddleVisualState(puddle, now);
  // Invert the existing sqrt(wetness) radius and linear opacity, anchored to
  // what this rebuild actually drew. Any unrelated repaint safely resets that anchor.
  const targetSize = Math.max(0, visual.size - puddleVisualThresholds.size);
  const sizeAt = drainStart + puddleConfig.drainDurationMs * (1 - (targetSize / puddle.maxSize) ** 2);
  const fullOpacity = puddleVisualState(puddle, drainStart).opacity;
  const targetOpacity = Math.max(0, visual.opacity - puddleVisualThresholds.opacity);
  const opacityAt = drainStart + puddleConfig.drainDurationMs * (1 - targetOpacity / fullOpacity);
  return Math.min(expiry, sizeAt, opacityAt);
}


function updatePuddleWeather(now = Date.now()) {
  gardenEcology.nextPuddleCheckAt = nextPuddleCheckAt;
  gardenEcology.updateWeatherEligibility(weatherState.level, now); nextPuddleCheckAt = gardenEcology.nextPuddleCheckAt;
}
function resetPuddleFormationClock(now = Date.now()) {
  updatePuddleWeather(now);
  const removed = gardenEcology.resetPuddleFormationClock(now); nextPuddleCheckAt = gardenEcology.nextPuddleCheckAt; return removed;
}
function createStormPuddle(now, random = Math.random) { return gardenEcology.createStormPuddle(now, random); }
function refreshStormPuddle(puddle, now) { gardenEcology.refreshStormPuddle(puddle, now); }
function removeExpiredPuddles(now) { return gardenEcology.removeExpiredPuddles(now); }
function updateGardenPuddles(now = Date.now(), random = Math.random) {
  updatePuddleWeather(now);
  const changed = gardenEcology.tickPuddles(now, random, document.hidden);
  nextPuddleCheckAt = gardenEcology.nextPuddleCheckAt; return changed;
}

const puddleArt = window.PacketGardenPuddleArt;
// Four page-owned tiles, built once. Flattened alpha matches the atlas when
// fading; no shape construction or artwork regeneration on a terrain repaint.
const puddleTiles = puddleArt.variants.map((_, variant) => {
  const tile = document.createElement('canvas');
  tile.width = tile.height = puddleArt.tileSize * puddleArt.resolution;
  const brush = tile.getContext('2d');brush.scale(puddleArt.resolution,puddleArt.resolution);
  puddleArt.paintCanvas(brush,variant);return tile;
});

// Cached terrain: grass below, specimens above. Shape is stable; only slow drainage changes it.
function drawGardenPuddles(now) {
  for (const puddle of gardenState.puddles) {
    const { size, opacity } = puddleVisualState(puddle, now);
    if (size <= 0 || opacity <= 0) continue;
    context.save();
    context.translate(puddle.x, puddle.y);
    context.rotate(puddle.seed * Math.PI * 2);
    const extent = puddleArt.tileSize * size / puddleArt.referenceSize;
    context.globalAlpha = puddleArt.opacityFor(opacity);
    context.drawImage(puddleTiles[puddleArt.variantFor(puddle)],-extent/2,-extent/2,extent,extent);
    context.restore();
  }
}
