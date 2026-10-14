// Browser-only decoration: the source stays intact and no event data enters a drop.
const looseDropConfig = {
  amanitaDropChance: 0.01,
  delayMs: 5_000,
  maxActiveDrops: 3,
  lifetimeMs: 20_000,
  hitRadius: 9,
  placementPadding: 14
};
const looseDropTypes = new Map([
  ["amanita_muscaria", { render: drawAmanitaDrop, message: "You found Amanita muscaria. +0 points" }]
]);
// At most one pending attempt per exact living source; never modify its fields.
const pendingLooseDrops = new Map();

function isLooseDropSourceAlive(specimen, now, living = null) {
  const timings = speciesConfig.get(specimen?.type)?.timings;
  return Boolean(timings && (living ? living.has(specimen) : gardenState.specimens.includes(specimen))
    && now - specimen.createdAt < timings.expiredAfterMs
    && (!specimen.mutation || now < specimen.mutation.expiresAt));
}

function prunePendingLooseDrops(now, living = new Set(gardenState.specimens)) {
  for (const specimen of pendingLooseDrops.keys()) {
    if (!isLooseDropSourceAlive(specimen, now, living)) pendingLooseDrops.delete(specimen);
  }
}

function scheduleLooseDrop(specimen, type, random = Math.random, now = Date.now()) {
  if (!looseDropTypes.has(type) || !isLooseDropSourceAlive(specimen, now)) return false;
  prunePendingLooseDrops(now);
  if (pendingLooseDrops.has(specimen)) return false;
  const x = (specimen.column + 0.5) * cellSize, y = (specimen.row + 0.5) * cellSize;
  const angle = random() * Math.PI * 2, radius = 18 + random() * 4;
  let dx = Math.cos(angle) * radius, dy = Math.sin(angle) * radius;
  const padding = looseDropConfig.placementPadding;
  // Reflect outward offsets at the edges, keeping the tiny drop beside its source.
  if (x + dx < padding || x + dx > gardenWidth - padding) dx = -dx;
  if (y + dy < padding || y + dy > gardenHeight - padding) dy = -dy;
  pendingLooseDrops.set(specimen, {
    type, activateAt: now + looseDropConfig.delayMs,
    x: x + dx, y: y + dy, phase: random() * Math.PI * 2
  });
  return true;
}

function maybeScheduleAmanitaDrop(specimen, roll, random = Math.random, now = Date.now()) {
  if (specimen?.type !== "mushroom" || specimen.origin?.kind !== "tcpnoise"
    || !isLooseDropSourceAlive(specimen, now)) return false;
  roll ??= random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= looseDropConfig.amanitaDropChance) return false;
  return scheduleLooseDrop(specimen, "amanita_muscaria", random, now);
}

function activateLooseDrop(specimen, now = Date.now(), living = null) {
  const pending = pendingLooseDrops.get(specimen);
  if (!pending || now < pending.activateAt || document.hidden) return null;
  // Consume every due attempt, including cap skips; never retry or queue it.
  pendingLooseDrops.delete(specimen);
  if (!isLooseDropSourceAlive(specimen, now, living)
    || gardenState.drops.length >= looseDropConfig.maxActiveDrops) return null;
  const drop = {
    type: pending.type, createdAt: now, expiresAt: now + looseDropConfig.lifetimeMs,
    x: pending.x, y: pending.y, phase: pending.phase
  };
  gardenState.drops.push(drop);
  return drop;
}

// One current-time pass on the existing tick/resume, with no missed-frame replay.
function updateLooseDrops(now = Date.now()) {
  const active = gardenState.drops.filter(drop => now < drop.expiresAt);
  let changed = active.length !== gardenState.drops.length;
  if (changed) gardenState.drops = active;
  if (pendingLooseDrops.size) {
    const living = new Set(gardenState.specimens);
    prunePendingLooseDrops(now, living);
    if (!document.hidden) {
      for (const specimen of pendingLooseDrops.keys()) {
        if (activateLooseDrop(specimen, now, living)) changed = true;
      }
    }
  }
  return changed;
}

function looseDropPosition(drop, now = Date.now()) {
  return { x: drop.x, y: drop.y + Math.sin((now - drop.createdAt) / 1400 + drop.phase) * 0.6 };
}

function looseDropAt(point, now = Date.now()) {
  if (!point) return null;
  for (let index = gardenState.drops.length - 1; index >= 0; index--) {
    const drop = gardenState.drops[index];
    if (now >= drop.expiresAt) continue;
    const position = looseDropPosition(drop, now);
    if (Math.hypot(point.x - position.x, point.y - position.y) <= looseDropConfig.hitRadius) return drop;
  }
  return null;
}

function collectLooseDrop(drop, now = Date.now()) {
  const index = gardenState.drops.indexOf(drop);
  if (index < 0 || now >= drop.expiresAt) return false;
  gardenState.drops.splice(index, 1);
  showCollectionMessage(looseDropTypes.get(drop.type).message, now);
  drawGardenOverlay(true, now);
  syncWeatherAnimation();
  gardenSound.maybePlayCollectionSound();
  return true;
}

function drawLooseDrops(now) {
  for (const drop of gardenState.drops) {
    if (now >= drop.expiresAt) continue;
    const position = looseDropPosition(drop, now);
    context.save();
    context.translate(position.x, position.y);
    looseDropTypes.get(drop.type).render(drop, now);
    context.restore();
  }
}

const amanitaDropSpots = [[-3, -3.5], [0, -4.5], [3, -3.5], [-1.5, -1.7], [2, -1.7]];
function drawAmanitaDrop() {
  context.fillStyle = "#ede4cd";
  context.fillRect(-1.3, -1, 2.6, 6);
  context.fillStyle = "#d84739";
  context.beginPath();
  context.ellipse(0, -2.5, 6, 3.5, 0, Math.PI, Math.PI * 2);
  context.quadraticCurveTo(6, -0.5, 0, -0.5);
  context.quadraticCurveTo(-6, -0.5, -6, -2.5);
  context.closePath(); context.fill();
  context.fillStyle = "#fff2dd";
  for (const [x, y] of amanitaDropSpots) {
    context.beginPath(); context.arc(x, y, 0.7, 0, Math.PI * 2); context.fill();
  }
}
