// Source-provided count one earns a tiny visitor, not a claim of global uniqueness.
// Separate from specimen cells, mutations, and the gnome-owned actor array.
const firstSeenCuriosityConfig = window.PacketGardenAmbient.curiosityConfig;
const firstSeenCuriosityTypes = new Map([
  ["ladybug", { render: drawCuriosityLadybug, message: window.PacketGardenUiCore.messages.ladybug }],
  ["snail", { render: drawCuriositySnail, message: window.PacketGardenUiCore.messages.snail }],
  ["moth", { render: drawCuriosityMoth, message: window.PacketGardenUiCore.messages.moth }],
  ["shiny_pebble", { render: drawCuriosityPebble, message: window.PacketGardenUiCore.messages.shiny_pebble }]
]);
const firstSeenCuriosityPool = Array.from(firstSeenCuriosityTypes.keys());

// Canvas repainting stays here; logical creation/expiry/movement is shared.
function createFirstSeenCuriosity(specimen, random = Math.random, now = Date.now()) {
  const item = gardenAmbient.createFirstSeenCuriosity(specimen, random, now);
  if (item) { drawGardenOverlay(true, now); syncWeatherAnimation(); }
  return item;
}
function updateFirstSeenCuriosities(now = Date.now()) { return gardenAmbient.expireCuriosities(now); }
function firstSeenCuriosityPosition(item, now = Date.now()) { return window.PacketGardenAmbient.curiosityPosition(item, now); }

function firstSeenCuriosityAt(point, now = Date.now()) {
  return window.PacketGardenInteraction.curiosityAt(point, gardenState.curiosities, now);
}

function collectFirstSeenCuriosity(curiosity, now = Date.now()) {
  const index = gardenState.curiosities.indexOf(curiosity);
  if (index < 0 || now >= curiosity.expiresAt) return false;
  gardenAmbient.removeCuriosity(curiosity, "collected");
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
  context.rotate(window.PacketGardenAmbient.curiosityAppearance(curiosity, now).rotation);
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
  const flutter = window.PacketGardenAmbient.curiosityAppearance(curiosity, now).flutter;
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
  const glint = window.PacketGardenAmbient.curiosityAppearance(curiosity, now).glint;
  if (glint > 0) {
    context.strokeStyle = `rgba(249, 246, 211, ${glint})`;
    context.beginPath(); context.moveTo(1, -4); context.lineTo(1, 0);
    context.moveTo(-1, -2); context.lineTo(3, -2); context.stroke();
  }
}
