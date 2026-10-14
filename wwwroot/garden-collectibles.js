// Collectible mutations belong to their exact specimen. Loose drops are a future layer.
const specimenMutationConfig = {
  port22WeedChance: 0.05,
  mutationDelayMs: 3_000,
  maxActive: 3,
  collectibleLifetimeMs: 20_000,
  messageDurationMs: 2_000,
  hitRadius: 12
};
const specimenMutationTypes = new Map([
  ["collectible_weed", {
    label: "Collectible weed",
    render: drawCollectibleWeed,
    message: "You collected some weed. +0 points"
  }]
]);
const collectionMessage = document.querySelector("#collection-message");
let collectionMessageUntil = 0;

function updateCollectionMessage(now = Date.now()) {
  if (!collectionMessageUntil || now < collectionMessageUntil) return false;
  collectionMessage.textContent = "";
  collectionMessage.hidden = true;
  collectionMessageUntil = 0;
  return true;
}

function scheduleSpecimenMutation(specimen, type, now = Date.now()) {
  if (!gardenState.specimens.includes(specimen) || !specimenMutationTypes.has(type)
    || specimen.pendingMutation || specimen.mutation
    || now - specimen.createdAt >= speciesConfig.get(specimen.type).timings.expiredAfterMs) return false;
  specimen.pendingMutation = { type, activateAt: now + specimenMutationConfig.mutationDelayMs };
  return true;
}

function maybeSchedulePort22Mutation(specimen, roll, now = Date.now()) {
  if (specimen?.type !== "redbloom" || specimen.origin?.kind !== "tcpnoise"
    || specimen.origin.listenPort !== 22 || !gardenState.specimens.includes(specimen)) return false;
  roll ??= Math.random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= specimenMutationConfig.port22WeedChance) return false;
  return scheduleSpecimenMutation(specimen, "collectible_weed", now);
}

function activateSpecimenMutation(specimen, now = Date.now()) {
  const pending = specimen.pendingMutation;
  if (!pending || now < pending.activateAt || !gardenState.specimens.includes(specimen)) return false;
  // A due attempt is consumed even at the cap. There is no retry queue.
  delete specimen.pendingMutation;
  if (specimen.mutation || !specimenMutationTypes.has(pending.type)
    || now - specimen.createdAt >= speciesConfig.get(specimen.type).timings.expiredAfterMs) return false;
  const active = gardenState.specimens.filter(item => item.mutation && now < item.mutation.expiresAt).length;
  if (active >= specimenMutationConfig.maxActive) return false;
  specimen.mutation = {
    type: pending.type,
    createdAt: now,
    expiresAt: now + specimenMutationConfig.collectibleLifetimeMs
  };
  return true;
}

// Called by updateGarden after expired specimens are removed, before drawing.
function updateSpecimenMutations(now) {
  let changed = false;
  for (const specimen of gardenState.specimens) {
    if (activateSpecimenMutation(specimen, now)) changed = true;
  }
  return changed;
}

function specimenMutationLabel(specimen, now = Date.now()) {
  return specimen.mutation && now < specimen.mutation.expiresAt
    ? specimenMutationTypes.get(specimen.mutation.type)?.label ?? "None" : "None";
}

function isCollectibleMutationHit(specimen, point, now = Date.now()) {
  if (!point || !specimen.mutation || now >= specimen.mutation.expiresAt
    || !specimenMutationTypes.has(specimen.mutation.type)) return false;
  return Math.hypot(point.x - (specimen.column + 0.5) * cellSize,
    point.y - (specimen.row + 0.5) * cellSize) <= specimenMutationConfig.hitRadius;
}

function collectSpecimenMutation(specimen, now = Date.now()) {
  const index = gardenState.specimens.indexOf(specimen);
  const config = specimenMutationTypes.get(specimen?.mutation?.type);
  if (index < 0 || !config || now >= specimen.mutation.expiresAt) return false;
  gardenState.specimens.splice(index, 1);
  if (typeof inspectedSpecimen !== "undefined" && inspectedSpecimen === specimen) closeSpecimenCard();
  collectionMessage.textContent = config.message;
  collectionMessage.hidden = false;
  collectionMessageUntil = now + specimenMutationConfig.messageDurationMs;
  updateGardenStatus();
  drawGarden();
  gardenSound.maybePlayCollectionSound();
  return true;
}

function drawSpecimenMutation(specimen, now) {
  const config = specimenMutationTypes.get(specimen.mutation?.type);
  if (!config) return false;
  // Expired mutations never flash back into their original species between ticks.
  if (now < specimen.mutation.expiresAt) config.render(specimen, now);
  return true;
}

const collectibleWeedLeaves = [
  [-4, 2, 0.5, "#aab557"], [4, -1, -0.5, "#c2b66a"], [-3, -5, 0.4, "#8e9e46"]
];

function drawCollectibleWeed(specimen, now) {
  const phase = (now - specimen.mutation.createdAt) / 800;
  context.save();
  context.translate((specimen.column + 0.5) * cellSize, (specimen.row + 0.5) * cellSize);
  // A compact rooted plant with broad paired ochre leaves and a pale bud.
  context.strokeStyle = "#94704c";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-4, 10); context.lineTo(0, 7); context.lineTo(4, 10);
  context.moveTo(0, 7); context.lineTo(Math.sin(phase) * 0.4, -9);
  context.stroke();
  for (const [x, y, angle, color] of collectibleWeedLeaves) {
    context.fillStyle = color;
    context.beginPath();
    context.ellipse(x, y, 4.5, 2.2, angle, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "#d8c782";
  context.beginPath();
  context.arc(0, -9, 1.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = `rgba(249, 239, 187, ${0.2 + (Math.sin(phase) + 1) * 0.2})`;
  context.fillRect(2, -10, 1.5, 1.5);
  context.restore();
}
