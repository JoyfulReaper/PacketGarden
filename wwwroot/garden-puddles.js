// Canvas presentation adapter for the shared weather-residue model.
const { puddleConfig, puddleFormationChances, puddleVisualState } = gardenEcologyCore;
// Main ellipse radius steps of 0.5 logical px (offset/rotated edges move <0.58 px),
// or 0.02 fill-opacity changes. No change to the interpolation used by drawing.
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
