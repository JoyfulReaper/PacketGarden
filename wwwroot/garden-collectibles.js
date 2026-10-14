// A secondary live-growth curiosity. These objects own no cells or provenance.
const collectibleConfig = {
  port22WeedChance: 0.05,
  maxActive: 3,
  lifetimeMs: 20_000,
  messageDurationMs: 2_000,
  offsetRadius: 10,
  hitRadius: 9,
  visualInset: 10
};
const collectionMessage = document.querySelector("#collection-message");
let collectionMessageUntil = 0;

// Driven by the existing garden tick, including when no specimens remain.
function updateCollectibles(now = Date.now()) {
  const remaining = gardenState.collectibles.filter(item => now < item.expiresAt);
  let changed = remaining.length !== gardenState.collectibles.length;
  if (changed) gardenState.collectibles = remaining;
  if (collectionMessageUntil && now >= collectionMessageUntil) {
    collectionMessage.textContent = "";
    collectionMessage.hidden = true;
    collectionMessageUntil = 0;
    changed = true;
  }
  return changed;
}

// Called only after a successful live port-22 redbloom spawn. Roll/time seams
// keep checks deterministic; fake controls never enter this path.
function maybeSpawnPort22Collectible(specimen, roll, random = Math.random, now = Date.now()) {
  if (specimen?.type !== "redbloom" || !gardenState.specimens.includes(specimen)) return null;
  updateCollectibles(now);
  if (gardenState.collectibles.length >= collectibleConfig.maxActive) return null;
  roll ??= random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= collectibleConfig.port22WeedChance) return null;

  const inset = collectibleConfig.visualInset;
  const offset = () => (random() * 2 - 1) * collectibleConfig.offsetRadius;
  const item = {
    type: "weed_sprig",
    x: Math.max(inset, Math.min(gardenWidth - inset, (specimen.column + 0.5) * cellSize + offset())),
    y: Math.max(inset, Math.min(gardenHeight - inset, (specimen.row + 0.5) * cellSize + offset())),
    createdAt: now,
    expiresAt: now + collectibleConfig.lifetimeMs
  };
  gardenState.collectibles.push(item);
  drawGarden();
  return item;
}

function collectibleAtGardenPoint(point, now = Date.now()) {
  if (!point) return null;
  // Topmost sprig wins if two overlap. A little extra hit area includes the idle bob.
  return [...gardenState.collectibles].reverse().find(item => now < item.expiresAt
    && Math.hypot(point.x - item.x, point.y - item.y) <= collectibleConfig.hitRadius) ?? null;
}

function collectCollectible(item, now = Date.now()) {
  const index = gardenState.collectibles.indexOf(item);
  if (index < 0 || now >= item.expiresAt) return false;
  gardenState.collectibles.splice(index, 1);
  collectionMessage.textContent = "You collected some weed.";
  collectionMessage.hidden = false;
  collectionMessageUntil = now + collectibleConfig.messageDurationMs;
  drawGarden();
  gardenSound.maybePlayCollectionSound();
  return true;
}

function drawGardenCollectibles(now) {
  for (const item of gardenState.collectibles) {
    if (now >= item.expiresAt) continue;
    const phase = (now - item.createdAt) / 800;
    context.save();
    context.translate(item.x, item.y + Math.sin(phase) * 0.7);
    // A loose, sideways bundle with a tied brown stem, not an upright weed plant.
    context.strokeStyle = "#9d7950";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(-6, 4);
    context.lineTo(5, -3);
    context.stroke();
    for (const [x, y, angle, color] of [
      [-2, 0, -0.7, "#b2b75c"], [2, -2, -0.3, "#899449"], [2, 2, 0.4, "#c1b16b"]
    ]) {
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.fillStyle = color;
      context.beginPath();
      context.ellipse(0, 0, 4, 1.8, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    context.strokeStyle = "#dbcaa0";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(-3, 1);
    context.lineTo(-1, 3);
    context.stroke();
    context.fillStyle = `rgba(243, 230, 179, ${0.2 + (Math.sin(phase) + 1) * 0.2})`;
    context.fillRect(5, -5, 1.5, 1.5);
    context.restore();
  }
}
