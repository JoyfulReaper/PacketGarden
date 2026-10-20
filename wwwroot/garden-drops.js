// Canvas-only drawing, hit helpers and collection feedback around the shared model.
const looseDropConfig = window.PacketGardenAmbient.dropConfig;
const looseDropTypes = new Map([
  ["amanita_muscaria", { render: drawAmanitaDrop, message: window.PacketGardenUiCore.messages.amanita_muscaria }]
]);
const pendingLooseDrops = gardenAmbient.pendingDrops;
function isLooseDropSourceAlive(specimen, now, living = null) { return gardenAmbient.isSourceAlive(specimen, now, living); }
function prunePendingLooseDrops(now, living = new Set(gardenState.specimens)) { gardenAmbient.prunePendingDrops(now, living); }
function scheduleLooseDrop(specimen, type, random = Math.random, now = Date.now()) { return gardenAmbient.scheduleLooseDrop(specimen, type, random, now); }
function maybeScheduleAmanitaDrop(specimen, roll, random = Math.random, now = Date.now()) { return gardenAmbient.maybeScheduleAmanita(specimen, roll, random, now); }
function activateLooseDrop(specimen, now = Date.now(), living = null) { return gardenAmbient.activateLooseDrop(specimen, now, living, document.hidden); }
function updateLooseDrops(now = Date.now()) { return gardenAmbient.tickDrops(now, { hidden: document.hidden }); }
function looseDropPosition(drop, now = Date.now()) { return window.PacketGardenAmbient.looseDropPosition(drop, now); }

function looseDropAt(point, now = Date.now()) {
  return window.PacketGardenInteraction.looseDropAt(point, gardenState.drops, now);
}

function collectLooseDrop(drop, now = Date.now()) {
  const index = gardenState.drops.indexOf(drop);
  if (index < 0 || now >= drop.expiresAt) return false;
  gardenAmbient.removeDrop(drop, "collected");
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
