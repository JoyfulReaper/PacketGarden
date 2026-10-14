// Source-provided count one earns a tiny visitor, not a claim of global uniqueness.
// Separate from specimen cells, mutations, and the gnome-owned actor array.
const firstSeenCuriosityConfig = { maxActive: 3, lifetimeMs: 20_000, hitRadius: 9, placementPadding: 14 };
const firstSeenCuriosityTypes = new Map([
  ["ladybug", { render: drawCuriosityLadybug, message: "You caught a ladybug. +0 points" }],
  ["snail", { render: drawCuriositySnail, message: "You collected a snail. It seems annoyed. +0 points" }],
  ["moth", { render: drawCuriosityMoth, message: "You caught a moth. +0 points" }],
  ["shiny_pebble", { render: drawCuriosityPebble, message: "You found a rock. +0 points" }]
]);
const firstSeenCuriosityPool = Array.from(firstSeenCuriosityTypes.keys());

// The live handler supplies its exact successful result. Tests may call this seam directly.
function createFirstSeenCuriosity(specimen, random = Math.random, now = Date.now()) {
  if (!gardenState.specimens.includes(specimen)
    || now - specimen.createdAt >= speciesConfig.get(specimen.type).timings.expiredAfterMs) return null;
  updateFirstSeenCuriosities(now);
  if (gardenState.curiosities.length >= firstSeenCuriosityConfig.maxActive) return null;
  const type = firstSeenCuriosityPool[Math.floor(random() * firstSeenCuriosityPool.length)];
  const origin = { x: (specimen.column + 0.5) * cellSize, y: (specimen.row + 0.5) * cellSize };
  const angle = random() * Math.PI * 2;
  const radius = 18 + random() * 4;
  let dx = Math.cos(angle) * radius, dy = Math.sin(angle) * radius;
  const padding = firstSeenCuriosityConfig.placementPadding;
  // Reflect outward offsets at edges so the visitor stays visible beside its source.
  if (origin.x + dx < padding || origin.x + dx > gardenWidth - padding) dx = -dx;
  if (origin.y + dy < padding || origin.y + dy > gardenHeight - padding) dy = -dy;
  const curiosity = {
    type, createdAt: now, expiresAt: now + firstSeenCuriosityConfig.lifetimeMs, origin,
    x: origin.x + dx, y: origin.y + dy, phase: random() * Math.PI * 2,
    direction: Math.cos(angle) < 0 ? -1 : 1
  };
  gardenState.curiosities.push(curiosity);
  drawGardenOverlay(true, now);
  syncWeatherAnimation();
  return curiosity;
}

// Cleanup shares the garden's existing 250 ms tick. Nothing is queued or replayed.
function updateFirstSeenCuriosities(now = Date.now()) {
  const active = gardenState.curiosities.filter(curiosity => now < curiosity.expiresAt);
  if (active.length === gardenState.curiosities.length) return false;
  gardenState.curiosities = active;
  return true;
}

function firstSeenCuriosityPosition(curiosity, now = Date.now()) {
  const elapsed = Math.max(0, Math.min(now - curiosity.createdAt, firstSeenCuriosityConfig.lifetimeMs));
  let dx = 0, dy = 0;
  if (curiosity.type === "ladybug") {
    dx = Math.sin(elapsed / 1800 + curiosity.phase) * 3;
    dy = Math.sin(elapsed / 2600 + curiosity.phase) * 2;
  } else if (curiosity.type === "snail") {
    dx = curiosity.direction * elapsed / firstSeenCuriosityConfig.lifetimeMs * 6;
  } else if (curiosity.type === "moth") {
    dx = Math.sin(elapsed / 900 + curiosity.phase) * 4;
    dy = Math.sin(elapsed / 600 + curiosity.phase) * 3;
  }
  return { x: curiosity.x + dx, y: curiosity.y + dy };
}

function firstSeenCuriosityAt(point, now = Date.now()) {
  if (!point) return null;
  // Newest draws on top, so it also wins overlapping clicks.
  for (let index = gardenState.curiosities.length - 1; index >= 0; index--) {
    const curiosity = gardenState.curiosities[index];
    if (now >= curiosity.expiresAt) continue;
    const position = firstSeenCuriosityPosition(curiosity, now);
    if (Math.hypot(point.x - position.x, point.y - position.y) <= firstSeenCuriosityConfig.hitRadius) return curiosity;
  }
  return null;
}

function collectFirstSeenCuriosity(curiosity, now = Date.now()) {
  const index = gardenState.curiosities.indexOf(curiosity);
  if (index < 0 || now >= curiosity.expiresAt) return false;
  gardenState.curiosities.splice(index, 1);
  showCollectionMessage(firstSeenCuriosityTypes.get(curiosity.type).message, now);
  drawGardenOverlay(true, now);
  syncWeatherAnimation();
  gardenSound.maybePlayCollectionSound();
  return true;
}

function drawFirstSeenCuriosities(now) {
  for (const curiosity of gardenState.curiosities) {
    if (now >= curiosity.expiresAt) continue;
    const position = firstSeenCuriosityPosition(curiosity, now);
    context.save();
    context.translate(position.x, position.y);
    firstSeenCuriosityTypes.get(curiosity.type).render(curiosity, now);
    context.restore();
  }
}

function drawCuriosityLadybug(curiosity, now) {
  context.rotate(Math.sin((now - curiosity.createdAt) / 1800 + curiosity.phase) * 0.2);
  context.strokeStyle = "#292725";
  context.lineWidth = 1;
  context.beginPath();
  for (const y of [-2, 0, 2]) { context.moveTo(-5, y); context.lineTo(5, y); }
  context.stroke();
  context.fillStyle = "#292725";
  context.beginPath(); context.arc(0, -3.5, 2, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#d35243";
  context.beginPath(); context.ellipse(0, 0, 3.5, 4, 0, 0, Math.PI * 2); context.fill();
  context.beginPath(); context.moveTo(0, -3); context.lineTo(0, 4); context.stroke();
  context.fillStyle = "#292725";
  for (const x of [-1.8, 1.8]) {
    for (const y of [-1, 1.5]) { context.beginPath(); context.arc(x, y, 0.7, 0, Math.PI * 2); context.fill(); }
  }
}

function drawCuriositySnail(curiosity) {
  context.scale(curiosity.direction, 1);
  context.fillStyle = "#b5ab83";
  context.beginPath(); context.ellipse(0, 2.5, 6, 1.7, 0, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#b5ab83";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(4, 2); context.lineTo(5, -2); context.moveTo(4, 2); context.lineTo(7, -1); context.stroke();
  context.fillStyle = "#b38359";
  context.beginPath(); context.arc(-1.5, 0, 3.7, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#674b39";
  context.beginPath(); context.arc(-1.5, 0, 2.5, 0.2, Math.PI * 2);
  context.arc(-1.5, 0, 1.2, 0, Math.PI * 1.5); context.stroke();
}

function drawCuriosityMoth(curiosity, now) {
  const flutter = 0.55 + (Math.sin((now - curiosity.createdAt) / 90 + curiosity.phase) + 1) * 0.225;
  context.fillStyle = "#e2e3d1";
  context.beginPath();
  context.ellipse(-3 * flutter, 0, 3.5 * flutter, 3, -0.4, 0, Math.PI * 2);
  context.ellipse(3 * flutter, 0, 3.5 * flutter, 3, 0.4, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#928f77";
  context.lineWidth = 1.2;
  context.beginPath(); context.moveTo(0, -3); context.lineTo(0, 3); context.stroke();
  context.lineWidth = 0.7;
  context.beginPath(); context.moveTo(-2, -4); context.lineTo(0, -2); context.lineTo(2, -4); context.stroke();
}

function drawCuriosityPebble(curiosity, now) {
  context.fillStyle = "#a9aaa1";
  context.beginPath(); context.moveTo(-4, 2); context.lineTo(-3, -2); context.lineTo(1, -3);
  context.lineTo(4, 0); context.lineTo(3, 3); context.closePath(); context.fill();
  context.strokeStyle = "#cecec0";
  context.lineWidth = 1;
  context.beginPath(); context.moveTo(-2, -1); context.lineTo(1, -2); context.lineTo(2, 0); context.stroke();
  const glint = Math.sin((now - curiosity.createdAt) / 1100 + curiosity.phase);
  if (glint > 0.92) {
    context.strokeStyle = `rgba(249, 246, 211, ${(glint - 0.92) / 0.08})`;
    context.beginPath(); context.moveTo(1, -4); context.lineTo(1, 0);
    context.moveTo(-1, -2); context.lineTo(3, -2); context.stroke();
  }
}
