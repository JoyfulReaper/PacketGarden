const canvas = document.querySelector("canvas");
let context = canvas.getContext("2d");
const gardenPerf = typeof createGardenPerformanceDiagnostics === "function" ? createGardenPerformanceDiagnostics() : null;
const fakeDnsButton = document.querySelector("#fake-dns");
const fakeGopherButton = document.querySelector("#fake-gopher");
const fakeHttpButton = document.querySelector("#fake-http");
const fakeSshButton = document.querySelector("#fake-ssh");
const fakePort22ProbeButton = document.querySelector("#fake-port22-probe");
const automaticTrafficButton = document.querySelector("#automatic-traffic");
const gardenStatus = document.querySelector("#garden-status");
const weatherLevelControl = document.querySelector("#weather-level");
const weatherIntensityControl = document.querySelector("#weather-intensity");
const weatherSourceControl = document.querySelector("#weather-source");
const weatherStatus = document.querySelector("#weather-status");
let latestLiveWeather = null;
let liveConnectionStatus = "Live weather connecting";

function updateWeatherSource() {
  const live = weatherSourceControl.value === "live";
  weatherLevelControl.disabled = live;
  weatherIntensityControl.disabled = live;
  weatherStatus.textContent = live ? liveConnectionStatus : "Manual weather";
  if (live && latestLiveWeather) applyLiveWeather();
}

weatherSourceControl.addEventListener("change", updateWeatherSource);
updateWeatherSource();

function applyLiveWeather() {
  Object.assign(weatherState, latestLiveWeather);
  weatherLevelControl.value = weatherState.level;
  weatherIntensityControl.value = String(weatherState.eventsPerMinute);
  updateWeatherAnimation();
}

// One same-origin connection carries garden input even when weather is Manual.
const gardenEventSource = new EventSource("/api/garden/events");
gardenEventSource.onopen = () => {
  liveConnectionStatus = "Live weather connected";
  if (weatherSourceControl.value === "live") weatherStatus.textContent = liveConnectionStatus;
};
gardenEventSource.onerror = () => {
  liveConnectionStatus = "Live weather disconnected";
  if (weatherSourceControl.value === "live") weatherStatus.textContent = liveConnectionStatus;
};
gardenEventSource.addEventListener("weather", message => {
  try {
    const state = JSON.parse(message.data);
    if (!weatherLevels.has(state.level) || typeof state.eventsPerMinute !== "number" || !Number.isFinite(state.eventsPerMinute)) {
      throw new Error("Invalid weather state");
    }
    latestLiveWeather = { level: state.level, eventsPerMinute: Math.min(1_000_000, Math.max(0, state.eventsPerMinute)) };
    if (weatherSourceControl.value === "live") {
      weatherStatus.textContent = liveConnectionStatus;
      applyLiveWeather();
    }
  } catch {
    if (weatherSourceControl.value === "live") weatherStatus.textContent = "Live weather update invalid";
  }
});
gardenEventSource.addEventListener("garden", message => {
  try {
    handleLiveGardenEvent(JSON.parse(message.data));
  } catch { /* Ignore malformed frames; keep the stream and garden alive. */ }
});

function normalizeLiveGardenEvent(event) { return window.PacketGardenCore.normalizeGarden(event); }

function handleLiveGardenEvent(frame) {
  const event = normalizeLiveGardenEvent(frame);
  if (!event) return null;
  const receivedAt = Date.now();
  const result = { specimen: null, outcome: "dropped" };
  spawnSpecimen(event.specimenType, null, event.vigor, (specimen, outcome) => {
    // Attach directly at creation, before the first draw/sound or secondary effects.
    specimen.origin = { kind: "tcpnoise", sensor: event.sensor, listenPort: event.listenPort, seenCount: event.seenCount };
    result.specimen = specimen;
    result.outcome = outcome;
  });
  recordRecentGardenEvent({
    kind: "tcpnoise", specimenType: event.specimenType, listenPort: event.listenPort,
    sensor: event.sensor, seenCount: event.seenCount, receivedAt, outcome: result.outcome
  });
  if (result.specimen && event.listenPort === 22 && event.specimenType === "redbloom"
    && typeof maybeSchedulePort22Mutation === "function") {
    maybeSchedulePort22Mutation(result.specimen);
  }
  if (result.specimen?.type === "mushroom" && typeof maybeScheduleAmanitaDrop === "function") {
    maybeScheduleAmanitaDrop(result.specimen);
  }
  if (result.specimen && event.seenCount === "1" && typeof createFirstSeenCuriosity === "function") {
    createFirstSeenCuriosity(result.specimen);
  }
  return result;
}

const recentEventLimit = 3;
const fakeSourceNames = {
  dns: "Simulated DNS",
  gopher: "Simulated Gopher",
  http: "Simulated HTTP",
  ssh: "Simulated SSH",
  "port22-probe": "Simulated port 22 probe"
};

function recordRecentGardenEvent(entry) {
  gardenState.recentEvents.unshift(entry);
  gardenState.recentEvents.length = Math.min(gardenState.recentEvents.length, recentEventLimit);
  if (typeof renderRecentActivity === "function") renderRecentActivity();
}

const weatherState = { level: "quiet", eventsPerMinute: 1200 };
const weatherLevels = new Map([
  ["quiet", { drops: 0, speed: 0, darkening: 0, length: 0, opacity: 0 }],
  ["drizzle", { drops: 16, speed: 120, darkening: 0.04, length: 5, opacity: 0.18 }],
  ["rain", { drops: 48, speed: 260, darkening: 0.09, length: 8, opacity: 0.35 }],
  ["heavy_rain", { drops: 150, speed: 520, darkening: 0.18, length: 14, opacity: 0.48, drift: 60, slant: 5 }],
  ["botnet_thunderstorm", { drops: 260, speed: 700, darkening: 0.26, length: 18, opacity: 0.56, drift: 150, slant: 11 }],
  ["botnet_hurricane", { drops: 400, speed: 900, darkening: 0.34, length: 23, opacity: 0.62, drift: 360, slant: 25 }]
]);
let weatherAnimationFrame = null;

function weatherIntensity() {
  return Math.min(1, Math.log1p(weatherState.eventsPerMinute) / Math.log1p(10_000));
}

function updateWeatherAnimation() {
  if (typeof updatePuddleWeather === "function") updatePuddleWeather(Date.now());
  if (weatherSoilDarkening() !== lastBaseSoilDarkening) { gardenBaseDirty = true; gardenPerf?.reason("weather-soil"); }
  paintGardenBase();
  drawGardenOverlay(true);
  syncWeatherAnimation();
}

function animateWeather(frameTime = performance.now()) {
  weatherAnimationFrame = null;
  if (document.hidden) return;
  gardenPerf?.raf(frameTime);
  const now = Date.now();
  if (gardenState.actors.length && typeof advanceGnomeIncident === "function") advanceGnomeIncident(now);
  drawGardenOverlay(false, now, frameTime);
  syncWeatherAnimation();
}

function syncWeatherAnimation() {
  const needed = !document.hidden && gardenView !== null && ((weatherState.level !== "quiet" && weatherState.eventsPerMinute > 0)
    || animatedSpecimens.length > 0 || gardenState.curiosities.length > 0 || gardenState.drops.length > 0 || gardenState.actors.length > 0);
  if (!needed) gardenPerf?.pauseRaf();
  if (!needed && weatherAnimationFrame !== null) {
    window.cancelAnimationFrame(weatherAnimationFrame);
    weatherAnimationFrame = null;
  } else if (needed && weatherAnimationFrame === null) {
    weatherAnimationFrame = window.requestAnimationFrame(animateWeather);
  }
}

weatherLevelControl.addEventListener("change", () => {
  weatherState.level = weatherLevelControl.value;
  updateWeatherAnimation();
});
weatherIntensityControl.addEventListener("input", () => {
  weatherState.eventsPerMinute = Math.min(1_000_000, Math.max(0, Number(weatherIntensityControl.value) || 0));
  updateWeatherAnimation();
});

// Fixed logical dimensions; resizing changes only the presentation scale.
const gardenCore = window.PacketGardenCore;
const { width: gardenWidth, height: gardenHeight, cellSize } = gardenCore.dimensions;
const margin = 16;
const columns = gardenWidth / cellSize;
const rows = gardenHeight / cellSize;

// Lifecycle timing aliases remain for existing ecology/UI integrations.
const flowerTimings = gardenCore.timings.flower;
const mushroomTimings = gardenCore.timings.mushroom;
const broadleafTimings = gardenCore.timings.broadleaf;
const vineTimings = gardenCore.timings.vine;
const wirefernTimings = gardenCore.timings.wirefern;
const redbloomTimings = gardenCore.timings.redbloom;
const weedTimings = gardenCore.timings.weed;
const ghostbloomTimings = gardenCore.timings.ghostbloom;
const crystalfungusTimings = gardenCore.timings.crystalfungus;
const blackthornTimings = gardenCore.timings.blackthorn;
const updateEveryMs = 250;

const gardenEcologyCore = window.PacketGardenEcology;
const grassConfig = gardenEcologyCore.grassConfig;
let nextGrassSpreadAt = 0;
// Browser-only development traffic: about 30 events per minute at these defaults.
const fakeTrafficConfig = {
  minDelayMs: 1_200,
  maxDelayMs: 2_800,
  eventWeights: [
    { type: "dns", weight: 55 },
    { type: "http", weight: 28 },
    { type: "ssh", weight: 10 },
    { type: "gopher", weight: 5 },
    { type: "port22-probe", weight: 2 }
  ]
};
let automaticTrafficRunning = false;
let automaticTrafficTimeout = null;

const eventSpecimenTypes = new Map([
  ["dns", "flower"],
  ["gopher", "mushroom"],
  ["http", "broadleaf"],
  ["ssh", "vine"],
  ["port22-probe", "redbloom"]
]);
const speciesConfig = new Map([
  ["flower", { timings: flowerTimings, render: drawFlower, plural: "flowers" }],
  ["mushroom", { timings: mushroomTimings, render: drawMushroom, plural: "mushrooms" }],
  ["broadleaf", { timings: broadleafTimings, render: drawBroadleaf, singular: "broad-leaf plant", plural: "broad-leaf plants" }],
  ["vine", { timings: vineTimings, render: drawVine, plural: "vines" }],
  ["wirefern", { timings: wirefernTimings, render: drawWirefern, singular: "wirefern", plural: "wireferns" }],
  ["redbloom", { timings: redbloomTimings, render: drawRedbloom, singular: "red bloom", plural: "red blooms" }],
  ["weed", { timings: weedTimings, render: drawWeed, plural: "weeds" }],
  ["ghostbloom", { timings: ghostbloomTimings, render: drawGhostbloom, plural: "ghostblooms" }],
  ["crystalfungus", { timings: crystalfungusTimings, render: drawCrystalfungus, singular: "crystal fungus", plural: "crystal fungi" }],
  ["blackthorn", { timings: blackthornTimings, render: drawBlackthorn, plural: "blackthorns" }]
]);

/** @typedef {{ type: "dns" | "gopher" | "http" | "ssh" | "port22-probe" }} GardenEvent */
const gardenModel = gardenCore.createGardenModel({ now: () => Date.now(), random: () => Math.random() });
const gardenEcology = gardenEcologyCore.createEcologyModel({ now: () => Date.now(), random: () => Math.random(), onChange({ kind }) {
  gardenBaseDirty = true; gardenPerf?.reason(kind.startsWith('grass-') ? 'grass-change' : 'puddle-change');
}});
// Keep object references used by inspection and ecology; fixture assignment goes through the model too.
const gardenState = {
  get specimens() { return gardenModel.specimens; },
  set specimens(entries) { gardenModel.seed(entries); },
  get grassCells() { return gardenEcology.grassCells; },
  set grassCells(entries) { gardenEcology.grassCells = entries; },
  get puddles() { return gardenEcology.puddles; },
  set puddles(entries) { gardenEcology.puddles = entries; },
  actors: [], curiosities: [], drops: [], recentEvents: []
};

/** @param {GardenEvent} event */
function handleGardenEvent(event) {
  const specimenType = eventSpecimenTypes.get(event.type);
  if (!specimenType) return;
  const receivedAt = Date.now();
  const result = { specimen: null, outcome: "dropped" };
  spawnSpecimen(specimenType, event.type, 0, (specimen, outcome) => {
    result.specimen = specimen;
    result.outcome = outcome;
  });
  recordRecentGardenEvent({ kind: "simulated", eventType: event.type, specimenType, receivedAt, outcome: result.outcome });
  return result;
}

// Existing callers still receive the specimen; live handling can observe the exact placement outcome.
function spawnSpecimen(specimenType, grassEventType = null, vigor = 0, onCreated = null) {
  if (!speciesConfig.has(specimenType)) return;

  updateGarden();

  const result = gardenModel.addSpecimen(specimenType, vigor);
  if (!result) return;
  const { specimen, replaced } = result;
  if (onCreated) onCreated(specimen, replaced ? "replaced" : "spawned");
  if (grassEventType) influenceGrass(grassEventType, specimen);

  updateGardenStatus();
  drawGarden("specimen-change");
  gardenSound.maybePlayGrowthSound(specimenType);
  return specimen;
}

function influenceGrass(eventType, specimen, now = Date.now()) { gardenEcology.influenceGrass(eventType, specimen, now); }
function influenceGrassCell(column, row, now) { return gardenEcology.influenceGrassCell(column, row, now); }
function spreadGrass(now) {
  gardenEcology.nextGrassSpreadAt = nextGrassSpreadAt;
  gardenEcology.spreadGrass(now); nextGrassSpreadAt = gardenEcology.nextGrassSpreadAt;
}

function updateGardenStatus() {
  const count = gardenState.specimens.length;
  const description = Array.from(speciesConfig, ([type, config]) => {
    const speciesCount = gardenState.specimens.filter(specimen => specimen.type === type).length;
    return `${speciesCount} ${speciesCount === 1 ? config.singular ?? type : config.plural}`;
  }).join(", ");
  gardenStatus.textContent = count === columns * rows
    ? `${description}. Garden full — stronger growth may displace weaker plants`
    : description;
  canvas.setAttribute("aria-label", `Rectangular soil garden with a subtle square grid and ${description}`);
  fakeDnsButton.disabled = count === columns * rows;
  fakeGopherButton.disabled = count === columns * rows;
  fakeHttpButton.disabled = count === columns * rows;
  fakeSshButton.disabled = count === columns * rows;
  fakePort22ProbeButton.disabled = count === columns * rows;
}

function updateGarden(now = Date.now()) {
  const changes = gardenModel.tick(now);
  if (changes.removed) {
    gardenBaseDirty = true;
    gardenPerf?.reason("specimen-change");
    updateGardenStatus();
  }
  if (typeof updateSpecimenMutations === "function" && updateSpecimenMutations(now)) { gardenBaseDirty = true; gardenPerf?.reason("specimen-change"); }
  gardenEcology.removeExpiredGrass(now);
  if (gardenState.grassCells.length) spreadGrass(now);
}

fakeDnsButton.addEventListener("click", () => {
  /** @type {GardenEvent} */
  const event = { type: "dns" };
  handleGardenEvent(event);
});

fakeGopherButton.addEventListener("click", () => {
  /** @type {GardenEvent} */
  const event = { type: "gopher" };
  handleGardenEvent(event);
});

fakeHttpButton.addEventListener("click", () => {
  /** @type {GardenEvent} */
  const event = { type: "http" };
  handleGardenEvent(event);
});

fakeSshButton.addEventListener("click", () => {
  /** @type {GardenEvent} */
  const event = { type: "ssh" };
  handleGardenEvent(event);
});

fakePort22ProbeButton.addEventListener("click", () => {
  /** @type {GardenEvent} */
  const event = { type: "port22-probe" };
  handleGardenEvent(event);
});

function scheduleAutomaticEvent() {
  if (!automaticTrafficRunning) return;
  const delayMs = fakeTrafficConfig.minDelayMs
    + Math.random() * (fakeTrafficConfig.maxDelayMs - fakeTrafficConfig.minDelayMs);
  automaticTrafficTimeout = window.setTimeout(() => {
    automaticTrafficTimeout = null;
    if (!automaticTrafficRunning) return;

    const totalWeight = fakeTrafficConfig.eventWeights.reduce((total, entry) => total + entry.weight, 0);
    let choice = Math.random() * totalWeight;
    for (const entry of fakeTrafficConfig.eventWeights) {
      if (choice < entry.weight) {
        /** @type {GardenEvent} */
        const event = { type: entry.type };
        handleGardenEvent(event);
        break;
      }
      choice -= entry.weight;
    }
    scheduleAutomaticEvent();
  }, delayMs);
}

automaticTrafficButton.addEventListener("click", () => {
  automaticTrafficRunning = !automaticTrafficRunning;
  if (automaticTrafficRunning) {
    scheduleAutomaticEvent();
  } else {
    window.clearTimeout(automaticTrafficTimeout);
    automaticTrafficTimeout = null;
  }
  automaticTrafficButton.textContent = automaticTrafficRunning
    ? "Stop automatic fake traffic" : "Start automatic fake traffic";
  automaticTrafficButton.setAttribute("aria-pressed", String(automaticTrafficRunning));
});

function drawFlower(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  const x = (specimen.column + 0.5) * cellSize;
  const y = (specimen.row + 0.5) * cellSize;
  const logicalStage = gardenCore.stageAt(specimen.type, specimen.createdAt, now);
  if (logicalStage === "expired") return;
  const stage = logicalStage === "fading" ? "wilting" : logicalStage;
  const wilting = stage === "wilting";
  const leafSize = stage === "sprout" ? 0.4 : stage === "growing" ? 0.75 : wilting ? 0.65 : 1;

  context.fillStyle = wilting ? "#88764f" : "#75935b";
  context.beginPath();
  context.ellipse(x - 5 * leafSize, y + 5 * leafSize, (7 + vigor * 0.4) * leafSize, (3 + vigor * 0.3) * leafSize, -Math.PI / 4, 0, Math.PI * 2);
  context.ellipse(x + 5 * leafSize, y + 5 * leafSize, (7 + vigor * 0.4) * leafSize, (3 + vigor * 0.3) * leafSize, Math.PI / 4, 0, Math.PI * 2);
  context.fill();

  if (stage === "sprout") return;
  if (stage === "growing") {
    context.fillStyle = "#a6b777";
    context.beginPath();
    context.arc(x, y, 3, 0, Math.PI * 2);
    context.fill();
    return;
  }

  const bloomSize = wilting ? 0.65 : 1;
  const bloomY = y + (wilting ? 3 : 0);
  context.fillStyle = wilting ? "#ab997b" : "#eedec3";
  const petalCount = 5 + Math.floor(vigor / 2);
  for (let petal = 0; petal < petalCount; petal++) {
    const angle = petal * Math.PI * 2 / petalCount - Math.PI / 2;
    context.beginPath();
    context.arc(x + Math.cos(angle) * 5 * bloomSize, bloomY + Math.sin(angle) * 5 * bloomSize, (4 + vigor * 0.35) * bloomSize, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = wilting ? "#8c784e" : "#d6aa4e";
  context.beginPath();
  context.arc(x, bloomY, 3 * bloomSize, 0, Math.PI * 2);
  context.fill();
}

// Compact upright fronds; no neighbor lookups, connections, or per-frame motion.
function drawWirefern(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  const stage = gardenCore.stageAt(specimen.type, specimen.createdAt, now);
  const frondPairs = stage === "sprout" ? 1 + Math.floor(vigor / 2)
    : stage === "growing" ? 2 + vigor : 3 + vigor;
  drawVariant(specimen, now, fading => {
    context.strokeStyle = fading ? "#827b52" : "#65b975";
    context.lineWidth = 1.1 + vigor * 0.2;
    context.beginPath();
    context.moveTo(-3, 12); context.lineTo(0, 9); context.lineTo(3, 12);
    // Slightly offset short segments keep the central wire-like stem organic.
    context.moveTo(0, 10);
    for (let segment = 0; segment < 5; segment++) {
      context.lineTo(segment % 2 ? -0.4 : 0.4, 6 - segment * 4);
    }
    context.lineTo(0, -12);
    for (let pair = 0; pair < frondPairs; pair++) {
      const y = frondPairs === 1 ? 0 : 5 - pair * 14 / (frondPairs - 1);
      const reach = 7 + pair % 2 * 2;
      for (let side = -1; side <= 1; side += 2) {
        context.moveTo(0, y);
        context.lineTo(side * 3, y - 0.5);
        context.lineTo(side * reach, y - 3);
        context.lineTo(side * (reach + 2), y - 2);
        if (vigor >= 2) {
          context.moveTo(side * (reach - 2), y - 2);
          context.lineTo(side * (reach - 1), y - 5);
        }
      }
    }
    context.stroke();
    context.fillStyle = fading ? "#ad9e6f" : "#b5df9b";
    // Tiny phosphor-like terminal tips, rather than broad leaves or vine curls.
    for (let pair = 0; pair < frondPairs; pair++) {
      const y = frondPairs === 1 ? 0 : 5 - pair * 14 / (frondPairs - 1);
      const reach = 9 + pair % 2 * 2;
      context.fillRect(-reach - 0.6, y - 2.6, 1.2, 1.2);
      context.fillRect(reach - 0.6, y - 2.6, 1.2, 1.2);
    }
    context.fillRect(-0.7, -12.7, 1.4, 1.4);
  });
}

function drawMushroom(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  const logicalStage = gardenCore.stageAt(specimen.type, specimen.createdAt, now);
  if (logicalStage === "expired") return;
  const stage = logicalStage === "fading" ? "decaying" : logicalStage;
  const decaying = stage === "decaying";
  const size = stage === "sprout" ? 0.4 : stage === "growing" ? 0.7 : decaying ? 0.65 : 1;

  context.save();
  context.translate((specimen.column + 0.5) * cellSize, (specimen.row + 0.5) * cellSize);
  context.scale(size, size);

  context.fillStyle = decaying ? "#93816b" : "#d9c9a6";
  context.fillRect(-2 - vigor * 0.4, 2, 4 + vigor * 0.8, 8);
  context.fillStyle = decaying ? "#76614f" : "#b86b48";
  context.beginPath();
  context.ellipse(0, 0, 10 + vigor * 0.6, decaying ? 4 : 8, 0, 0, Math.PI * 2);
  context.fill();

  if (stage !== "sprout") {
    context.fillStyle = decaying ? "#99866c" : "#f0dfb9";
    context.beginPath();
    context.arc(-4, -2, 2, 0, Math.PI * 2);
    context.arc(4, -1, 1.5, 0, Math.PI * 2);
    context.fill();
    for (let spot = 0; spot < vigor; spot++) {
      context.beginPath();
      context.arc(-5 + spot * 5, -5 + spot % 2, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawBroadleaf(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  const stage = gardenCore.stageAt(specimen.type, specimen.createdAt, now);
  if (stage === "expired") return;
  const fading = stage === "fading";
  const size = stage === "sprout" ? 0.4 : stage === "growing" ? 0.7 : fading ? 0.7 : 1;
  const leafCount = (stage === "sprout" ? 2 : stage === "growing" ? 4 : 6) + Math.floor(vigor * 2 / 3);

  context.save();
  context.translate((specimen.column + 0.5) * cellSize, (specimen.row + 0.5) * cellSize);
  context.scale(size, size);

  for (let leaf = 0; leaf < leafCount; leaf++) {
    const angle = leaf * Math.PI * 2 / leafCount - Math.PI / 4;
    context.save();
    context.rotate(angle);
    context.fillStyle = fading ? "#8f7a76" : leaf % 2 === 0 ? "#8d6f9f" : "#6f567f";
    context.beginPath();
    context.ellipse(6, 0, 7 + vigor * 0.3, 4 + vigor * 0.4, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = fading ? "#b29b92" : "#c4a9d3";
    context.lineWidth = 1 + vigor * 0.2;
    context.beginPath();
    context.moveTo(1, 0);
    context.lineTo(11, 0);
    context.stroke();
    context.restore();
  }
  context.restore();
}

function drawVine(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  const logicalStage = gardenCore.stageAt(specimen.type, specimen.createdAt, now);
  if (logicalStage === "expired") return;
  const stage = logicalStage === "fading" ? "drying" : logicalStage;
  const drying = stage === "drying";
  const size = stage === "sprout" ? 0.4 : stage === "growing" ? 0.7 : drying ? 0.55 : 1;

  context.save();
  context.translate((specimen.column + 0.5) * cellSize, (specimen.row + 0.5) * cellSize);
  context.strokeStyle = drying ? "#857454" : "#a8b84f";
  context.lineWidth = (drying ? 1 : stage === "mature" ? 2.5 : 1.5) + vigor * 0.4;
  context.lineCap = "round";

  if (stage !== "sprout") {
    // Base rendering shares one lookup; direct drawing helpers can build a current one.
    const lookup = vineCellLookup ?? buildVineCellLookup(now);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx === 0 && dy === 0) || !vineNeighborAt(lookup, specimen.column + dx, specimen.row + dy)) continue;
        // Each cell draws half the connection. Both halves meet at the same midpoint.
        const endX = dx * cellSize / 2;
        const endY = dy * cellSize / 2;
        const bend = (specimen.column + specimen.row) % 2 === 0 ? 3 : -3;
        context.beginPath();
        context.moveTo(0, 0);
        context.quadraticCurveTo(endX / 2 - dy * bend, endY / 2 + dx * bend, endX, endY);
        context.stroke();
      }
    }
  }

  context.beginPath();
  context.moveTo(-8 * size, 6 * size);
  context.bezierCurveTo(-9 * size, -3 * size, 8 * size, 4 * size, 8 * size, -7 * size);
  context.stroke();

  context.fillStyle = drying ? "#8c8056" : "#c0cf57";
  context.beginPath();
  context.ellipse(-5 * size, 4 * size, (4 + vigor * 0.3) * size, (1.8 + vigor * 0.2) * size, -Math.PI / 4, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(6 * size, -4 * size, (4 + vigor * 0.3) * size, (1.8 + vigor * 0.2) * size, Math.PI / 4, 0, Math.PI * 2);
  context.fill();
  if (vigor >= 2 && stage !== "sprout") {
    context.beginPath();
    context.ellipse(size, size, 4 * size, 2.2 * size, -Math.PI / 3, 0, Math.PI * 2);
    context.fill();
  }

  if (stage !== "sprout") {
    context.fillStyle = drying ? "#a08b67" : "#d5c96a";
    context.beginPath();
    context.moveTo(-4 * size, 1 * size);
    context.lineTo((-8 - vigor * 0.4) * size, (-4 - vigor * 0.4) * size);
    context.lineTo(-1 * size, 0);
    context.closePath();
    context.moveTo(3 * size, -1 * size);
    context.lineTo((8 + vigor * 0.4) * size, (3 + vigor * 0.4) * size);
    context.lineTo(5 * size, -3 * size);
    context.closePath();
    context.fill();
  }
  context.restore();
}

// Shared lifecycle drawing setup; no species rarity decisions in the browser.
function drawVariant(specimen, now, paint) {
  const stage = gardenCore.stageAt(specimen.type, specimen.createdAt, now);
  if (stage === "expired") return;
  const fading = stage === "fading";
  const size = stage === "sprout" ? 0.4 : stage === "growing" ? 0.7 : fading ? 0.65 : 1;
  context.save();
  context.translate((specimen.column + 0.5) * cellSize, (specimen.row + 0.5) * cellSize);
  context.scale(size, size);
  paint(fading);
  context.restore();
}

function drawWeed(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  drawVariant(specimen, now, fading => {
    context.strokeStyle = fading ? "#856343" : "#a88c39";
    context.lineWidth = 1.8 + vigor * 0.2;
    context.beginPath();
    context.moveTo(-2, 11);
    context.lineTo(1, 3);
    context.lineTo(-3, -4);
    context.lineTo(0, -12);
    context.moveTo(1, 3);
    context.lineTo(9, -2);
    context.lineTo(7, -8);
    context.moveTo(-1, 7);
    context.lineTo(-10, 1);
    for (let branch = 0; branch < vigor; branch++) {
      const direction = branch % 2 === 0 ? 1 : -1;
      const y = -7 + branch * 5;
      context.moveTo(0, y);
      context.lineTo(10 * direction, y - 3);
      context.lineTo(11 * direction, y - 6);
    }
    context.stroke();
    context.fillStyle = fading ? "#947345" : "#bec04c";
    // Uneven saw-toothed leaves, deliberately unlike turf blades or vine curls.
    const leaves = [[-3, -4, -1], [1, 3, 1], [-1, 7, -1]];
    leaves.push(...[[1, -6, 1], [-1, 1, -1], [2, 5, 1]].slice(0, vigor));
    for (const [x, y, direction] of leaves) {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 10 * direction, y - 6);
      context.lineTo(x + 7 * direction, y - 1);
      context.lineTo(x + 5 * direction, y - 3);
      context.lineTo(x + 4 * direction, y + 2);
      context.closePath();
      context.fill();
    }
    context.fillStyle = "#b18a4d";
    context.fillRect(-2, -13, 4, 3);
    context.fillRect(6, -9, 3, 3);
  });
}

function drawGhostbloom(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  drawVariant(specimen, now, fading => {
    context.strokeStyle = fading ? "#71818a" : "#8fc9d8";
    context.lineWidth = 1.5 + vigor * 0.2;
    context.beginPath();
    context.moveTo(0, 10);
    context.lineTo(0, -1);
    context.stroke();
    // Translucent halo and narrow star petals, rather than the cream flower's discs.
    context.fillStyle = fading ? "rgba(150,180,200,0.06)" : `rgba(157,222,255,${0.18 + vigor * 0.03})`;
    context.beginPath();
    context.arc(0, -2, 13 + vigor * 0.4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = fading ? "#92a7b5" : "#e2f6ff";
    const petals = 6 + vigor;
    for (let petal = 0; petal < petals; petal++) {
      context.save();
      context.translate(0, -2);
      context.rotate(petal * Math.PI * 2 / petals);
      context.beginPath();
      context.ellipse(0, -5, 2.5 + vigor * 0.15, 6 + vigor * 0.2, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    context.fillStyle = fading ? "#b3c4cb" : "#ffffff";
    context.beginPath();
    context.arc(0, -2, 2.5, 0, Math.PI * 2);
    context.fill();
  });
}

function drawCrystalfungus(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  drawVariant(specimen, now, fading => {
    context.fillStyle = fading ? "#796c88" : "#9977cc";
    context.fillRect(-2, 2, 4, 9);
    for (const [x, y, size] of [[-7, 3, 0.65 + vigor * 0.03], [7, 4, 0.55 + vigor * 0.03], [0, 0, 1]]) {
      context.save();
      context.translate(x, y);
      context.scale(size, size);
      context.fillStyle = fading ? "#647f89" : "#71dce4";
      context.beginPath();
      context.moveTo(0, -12);
      context.lineTo(10, -2);
      context.lineTo(7, 4);
      context.lineTo(-7, 4);
      context.lineTo(-10, -2);
      context.closePath();
      context.fill();
      context.fillStyle = fading ? "#7e728d" : "#9e83e6";
      context.beginPath();
      context.moveTo(0, -12);
      context.lineTo(7, 4);
      context.lineTo(-2, 2);
      context.closePath();
      context.fill();
      context.strokeStyle = fading ? "#9aabb4" : "#c8ffff";
      context.lineWidth = 1 + vigor * 0.2;
      context.beginPath();
      context.moveTo(-10, -2);
      context.lineTo(0, -12);
      context.lineTo(10, -2);
      context.stroke();
      for (let facet = 0; facet < vigor; facet++) {
        context.beginPath();
        context.moveTo(0, -12);
        context.lineTo(-7 + facet * 7, 4);
        context.stroke();
      }
      context.restore();
    }
  });
}

function drawBlackthorn(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  drawVariant(specimen, now, fading => {
    // A pale edge keeps the near-black stem legible on soil.
    for (const [color, width] of [[fading ? "#756374" : "#a17eb2", 4], [fading ? "#51424e" : "#281c39", 2.5]]) {
      context.strokeStyle = color;
      context.lineWidth = width + vigor * 0.3;
      context.beginPath();
      context.moveTo(-10, 9);
      context.bezierCurveTo(9, 8, -9, -8, 10, -10);
      context.stroke();
    }
    for (let branch = 0; branch < vigor; branch++) {
      const direction = branch % 2 === 0 ? 1 : -1;
      const y = 5 - branch * 5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(8 * direction, y - 3);
      context.lineTo(11 * direction, y - 6);
      context.stroke();
    }
    context.fillStyle = fading ? "#a38996" : "#e4a1d6";
    const thorns = [[-5, 7, -1], [0, 2, 1], [0, -4, -1], [5, -8, 1]];
    thorns.push(...[[0, 8, 1], [-5, -2, -1], [4, 0, 1]].slice(0, vigor));
    for (const [x, y, direction] of thorns) {
      context.beginPath();
      context.moveTo(x, y + 2);
      context.lineTo(x + 7 * direction, y - 5);
      context.lineTo(x + 2 * direction, y + 3);
      context.closePath();
      context.fill();
    }
  });
}

function drawRedbloom(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  const stage = gardenCore.stageAt(specimen.type, specimen.createdAt, now);
  if (stage === "expired") return;
  const wilting = stage === "fading";

  context.save();
  context.translate((specimen.column + 0.5) * cellSize, (specimen.row + 0.5) * cellSize);
  context.strokeStyle = wilting ? "#897052" : "#6d8445";
  context.lineWidth = 2 + vigor * 0.4;
  context.beginPath();
  context.moveTo(0, 10);
  context.quadraticCurveTo(wilting ? 7 : 1, 5, wilting ? 3 : 0, wilting ? 4 : 0);
  context.stroke();

  context.translate(wilting ? 3 : 0, wilting ? 4 : 0);
  context.scale(wilting ? 0.65 : 1, wilting ? 0.45 : 1);
  context.rotate(wilting ? Math.PI / 7 : 0);
  context.fillStyle = wilting ? "#90404b" : "#d52c4a";
  context.strokeStyle = wilting ? "#b56864" : "#f27785";
  context.lineWidth = 1;
  context.beginPath();
  const points = 12 + vigor * 2;
  for (let point = 0; point < points; point++) {
    const angle = point * Math.PI * 2 / points - Math.PI / 2;
    const radius = point % 2 === 0 ? 10 + vigor * 0.5 : 4 + vigor * 0.2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = wilting ? "#8b6653" : "#ffd0a0";
  context.beginPath();
  context.arc(0, 0, 2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawGrass(grass, now) {
  const { growth, decline, color, opacity, stage } = gardenEcologyCore.grassVisualState(grass, now);
  if (stage === 'expired') return;
  const x = (grass.column + 0.5) * cellSize;
  const y = (grass.row + 0.5) * cellSize;

  context.save();
  // Clip to the garden boundary, not individual tiles, so neighboring patches can merge.
  context.beginPath();
  context.rect(3, 3, gardenWidth - 6, gardenHeight - 6);
  context.clip();
  context.fillStyle = `rgb(${color.join(", ")})`;
  context.globalAlpha = opacity;
  context.beginPath();
  const seed = grass.column * 37 + grass.row * 61;
  for (let blob = 0; blob < 9; blob++) {
    const angle = (seed % 17) * 0.37 + blob * 2.4;
    const blobX = x + ((blob % 3 - 1) * 8 + Math.cos(angle) * 1.5) * growth;
    const blobY = y + ((Math.floor(blob / 3) - 1) * 8 + Math.sin(angle) * 1.5) * growth;
    const radiusX = (10 + (seed + blob * 3) % 3) * growth * (1 - decline * 0.65);
    const radiusY = radiusX * (0.78 + ((seed + blob) % 3) * 0.06);
    const rotation = angle + 0.4;
    context.moveTo(blobX + Math.cos(rotation) * radiusX, blobY + Math.sin(rotation) * radiusX);
    context.ellipse(blobX, blobY, radiusX, radiusY, rotation, 0, Math.PI * 2);
  }
  // One fill keeps overlapping blobs translucent enough to retain soil/grid detail.
  context.fill();

  context.strokeStyle = decline > 0 ? "#a08d60" : "#738254";
  context.globalAlpha = 0.45 * (1 - 0.8 * decline);
  context.lineWidth = 1;
  context.beginPath();
  const blades = 7;
  for (let blade = 0; blade < blades; blade++) {
    // Stable cell-based variation keeps tufts irregular without flickering on redraw.
    const baseX = x + ((seed + blade * 7) % 21 - 10) * growth;
    const baseY = y + ((seed + blade * 11) % 21 - 10) * growth;
    const lean = (grass.column + grass.row + blade) % 3 - 1;
    const height = (3 + (grass.column * 3 + grass.row + blade * 2) % 4) * growth * (1 - decline * 0.6);
    context.moveTo(baseX, baseY);
    context.quadraticCurveTo(baseX + lean, baseY - height / 2, baseX + lean * 2, baseY - height);
  }
  context.stroke();
  context.restore();
}

function weatherSoilDarkening() {
  const intensity = weatherIntensity();
  const weather = weatherLevels.get(weatherState.level);
  return intensity === 0 ? 0 : weather.darkening * (0.5 + intensity * 0.5);
}

function drawWeatherSoil() {
  const darkening = weatherSoilDarkening();
  if (darkening === 0) return;
  context.save();
  context.fillStyle = "#172c28";
  context.globalAlpha = darkening;
  context.fillRect(0, 0, gardenWidth, gardenHeight);
  context.restore();
}

function drawRain(now) {
  const intensity = weatherIntensity();
  const weather = weatherLevels.get(weatherState.level);
  if (weather.drops === 0 || intensity === 0) return;
  const drops = Math.min(400, Math.round(weather.drops * (0.25 + intensity * 0.75)));
  gardenPerf?.rain(drops);
  const speed = weather.speed * (0.6 + intensity * 0.4);

  context.save();
  context.beginPath();
  context.rect(3, 3, gardenWidth - 6, gardenHeight - 6);
  context.clip();
  context.strokeStyle = "#b7cdd0";
  context.globalAlpha = weather.opacity;
  context.lineWidth = 1;
  context.beginPath();
  for (let drop = 0; drop < drops; drop++) {
    // Fixed seeds plus elapsed time animate a bounded layer without particle/ecology state.
    const x = (drop * 137.508 + (drop % 7) * 19 + now / 1000 * (weather.drift ?? 0)) % gardenWidth;
    const y = (drop * 127.7 + now / 1000 * speed * (0.85 + (drop % 5) * 0.05))
      % (gardenHeight + 30) - 15;
    context.moveTo(x, y);
    context.lineTo(x + (weather.slant ?? 2), y + weather.length);
  }
  context.stroke();
  context.restore();
}

// The browser composites a persistent ecology canvas and a transparent animation canvas.
const rendererConfig = { animationFps: 30, maxPixelRatio: 2, continuousVisualRefreshMs: 1_000 };
const gardenBaseCanvas = canvas;
const gardenBaseContext = context;
const gardenOverlayCanvas = document.querySelector("#garden-overlay");
const gardenOverlayContext = gardenOverlayCanvas.getContext("2d");
let gardenBaseDirty = true;
let gardenOverlayDirty = false;
let gardenView = null;
let lastOverlayAt = -Infinity;
let nextBaseVisualAt = null;
let lastBaseSoilDarkening = null;
let vineCellLookup = null;
const animatedSpecimens = [];

// Current specimen renderers use discrete stages, including vine connectivity at growing.
// Active mutations render entirely on the overlay and are removed by logical cleanup.
function nextSpecimenVisualChangeAt(specimen, now) {
  if (specimen.mutation) return null;
  return gardenCore.nextChangeAt(specimen, now);
}

function nextGrassVisualChangeAt(grass, now) {
  return gardenEcologyCore.nextGrassVisualChangeAt(grass, now, rendererConfig.continuousVisualRefreshMs);
}

// Recompute only with a rebuilt base. The 250 ms logical tick reads this one stored deadline.
function computeNextBaseVisualChangeAt(now) {
  let next = Infinity;
  for (const specimen of gardenState.specimens) next = Math.min(next, nextSpecimenVisualChangeAt(specimen, now) ?? Infinity);
  for (const grass of gardenState.grassCells) next = Math.min(next, nextGrassVisualChangeAt(grass, now) ?? Infinity);
  if (typeof nextPuddleVisualChangeAt === "function") {
    for (const puddle of gardenState.puddles) next = Math.min(next, nextPuddleVisualChangeAt(puddle, now) ?? Infinity);
  }
  return Number.isFinite(next) ? next : null;
}

function invalidateDueBaseVisual(now) {
  if (nextBaseVisualAt !== null && now >= nextBaseVisualAt) {
    gardenBaseDirty = true;
    gardenPerf?.reason("visual-deadline");
  }
}

function buildVineCellLookup(now) {
  const startedAt = gardenPerf ? performance.now() : 0;
  gardenPerf?.count("vineLookupBuilds");
  const lookup = new Map();
  for (const specimen of gardenState.specimens) {
    if (specimen.type !== "vine") continue;
    const stage = gardenCore.stageAt(specimen.type, specimen.createdAt, now);
    if (stage !== "sprout" && stage !== "expired") {
      lookup.set(specimen.row * columns + specimen.column, specimen);
    }
  }
  gardenPerf?.lookup(startedAt);
  return lookup;
}

function vineNeighborAt(lookup, column, row) {
  gardenPerf?.count("vineNeighborChecks");
  if (column < 0 || column >= columns || row < 0 || row >= rows) return null;
  return lookup.get(row * columns + column) ?? null;
}

function resizeCanvasBacking(target, width, height) {
  if (gardenPerf && (target.width !== width || target.height !== height)) {
    gardenPerf.count("backingResizes");
    gardenPerf.count("backingWrites", Number(target.width !== width) + Number(target.height !== height));
  }
  if (target.width !== width) target.width = width;
  if (target.height !== height) target.height = height;
}

function rebuildGardenBase(now) {
  gardenPerf?.begin("base");
  gardenPerf?.count("layoutReads");
  const { width, height } = canvas.getBoundingClientRect();
  if (width <= 0 || height <= 0) { gardenView = null; return false; }

  const pixelRatio = Math.min(window.devicePixelRatio || 1, rendererConfig.maxPixelRatio);
  const pixelWidth = Math.round(width * pixelRatio);
  const pixelHeight = Math.round(height * pixelRatio);
  resizeCanvasBacking(gardenBaseCanvas, pixelWidth, pixelHeight);
  resizeCanvasBacking(gardenOverlayCanvas, pixelWidth, pixelHeight);

  const scale = Math.min(
    width / (gardenWidth + margin * 2),
    height / (gardenHeight + margin * 2)
  );
  gardenView = { width, height, pixelRatio, scale, offsetX: (width - gardenWidth * scale) / 2,
    offsetY: (height - gardenHeight * scale) / 2 };
  const visibleContext = context;
  context = gardenBaseContext;
  vineCellLookup = buildVineCellLookup(now);
  const previousAnimated = animatedSpecimens.slice();
  try {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.translate(gardenView.offsetX, gardenView.offsetY);
    context.scale(scale, scale);
    gardenPerf?.mark("base", "setup");

    context.fillStyle = "#685b45";
    context.fillRect(0, 0, gardenWidth, gardenHeight);

    drawWeatherSoil();

    context.beginPath();
    for (let x = cellSize; x < gardenWidth; x += cellSize) {
      context.moveTo(x, 0);
      context.lineTo(x, gardenHeight);
    }
    for (let y = cellSize; y < gardenHeight; y += cellSize) {
      context.moveTo(0, y);
      context.lineTo(gardenWidth, y);
    }
    context.strokeStyle = "rgba(225, 214, 183, 0.09)";
    context.lineWidth = 1;
    context.stroke();

    context.strokeStyle = "#9a9871";
    context.lineWidth = 6;
    context.strokeRect(0, 0, gardenWidth, gardenHeight);
    gardenPerf?.mark("base", "soil");

    for (const grass of gardenState.grassCells) {
      drawGrass(grass, now);
    }
    gardenPerf?.mark("base", "grass");
    if (typeof drawGardenPuddles === "function") drawGardenPuddles(now);
    gardenPerf?.mark("base", "puddles");
    animatedSpecimens.length = 0;
    for (const specimen of gardenState.specimens) {
      if (specimen.mutation && typeof drawSpecimenMutation === "function") {
        animatedSpecimens.push(specimen);
      } else {
        const startedAt = gardenPerf ? performance.now() : 0;
        speciesConfig.get(specimen.type).render(specimen, now);
        gardenPerf?.specimen(specimen.type, startedAt);
      }
    }
    gardenPerf?.mark("base", "specimens");
  } finally {
    context = visibleContext;
    vineCellLookup = null;
  }
  if (previousAnimated.length !== animatedSpecimens.length
    || previousAnimated.some((specimen, index) => specimen !== animatedSpecimens[index])) gardenOverlayDirty = true;
  gardenBaseDirty = false;
  nextBaseVisualAt = computeNextBaseVisualChangeAt(now);
  lastBaseSoilDarkening = weatherSoilDarkening();
  gardenPerf?.end("base");
  return true;
}

function paintGardenBase(now = Date.now()) {
  if (document.hidden || !gardenBaseDirty) return false;
  return rebuildGardenBase(now);
}

function drawGardenOverlay(force = false, now = Date.now(), frameTime = performance.now()) {
  if (document.hidden) return false;
  // All dynamic objects and weather share the same scheduler and FPS budget.
  if (!force && frameTime - lastOverlayAt + 0.001 < 1000 / rendererConfig.animationFps) { gardenPerf?.count("fpsSkips"); return false; }
  if (!gardenView) return false;
  gardenPerf?.begin("overlay", force);
  lastOverlayAt = frameTime;
  const previousContext = context;
  context = gardenOverlayContext;
  try {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, gardenOverlayCanvas.width, gardenOverlayCanvas.height);
    const { pixelRatio, scale, offsetX, offsetY } = gardenView;
    context.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, offsetX * pixelRatio, offsetY * pixelRatio);
    gardenPerf?.mark("overlay", "setup");
    for (const specimen of animatedSpecimens) drawSpecimenMutation(specimen, now);
    gardenPerf?.mark("overlay", "mutations");
    if (typeof drawGardenActors === "function") drawGardenActors(now);
    gardenPerf?.mark("overlay", "actors");
    if (typeof drawLooseDrops === "function") drawLooseDrops(now);
    gardenPerf?.mark("overlay", "drops");
    if (typeof drawFirstSeenCuriosities === "function") drawFirstSeenCuriosities(now);
    gardenPerf?.mark("overlay", "curiosities");
    drawRain(now);
    gardenPerf?.mark("overlay", "rain");
  } finally {
    context = previousContext;
  }
  gardenOverlayDirty = false;
  gardenPerf?.end("overlay");
  return true;
}

// Actual ecology changes repaint immediately. Routine logical ticks do not call this.
function drawGarden(reason = "state-change") {
  gardenPerf?.reason(reason);
  gardenBaseDirty = true;
  paintGardenBase();
  drawGardenOverlay(true);
  syncWeatherAnimation();
}

function resizeGarden() {
  if (document.hidden) { gardenBaseDirty = true; gardenPerf?.reason("resize"); return; }
  gardenPerf?.count("layoutReads");
  const { width, height } = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, rendererConfig.maxPixelRatio);
  // Window resize and ResizeObserver can report the same change; rebuild once.
  if (!gardenView || width !== gardenView.width || height !== gardenView.height
    || pixelRatio !== gardenView.pixelRatio) drawGarden("resize");
}

function seedInitialGrass(count = 5, now = Date.now()) {
  const totalCells = columns * rows;
  const seeds = Math.min(count, totalCells);
  for (let seed = 0; seed < seeds; seed++) {
    const start = Math.floor(seed * totalCells / seeds);
    const end = Math.floor((seed + 1) * totalCells / seeds);
    const cell = start + Math.floor(Math.random() * (end - start));
    influenceGrassCell(cell % columns, Math.floor(cell / columns), now);
  }
}

seedInitialGrass();
new ResizeObserver(resizeGarden).observe(canvas);
window.addEventListener("resize", resizeGarden);
document.addEventListener("visibilitychange", () => {
  if (typeof resetPuddleFormationClock === "function" && resetPuddleFormationClock(Date.now())) { gardenBaseDirty = true; gardenPerf?.reason("puddle-change"); }
  if (document.hidden) syncWeatherAnimation();
  else {
    if (typeof updateFirstSeenCuriosities === "function") updateFirstSeenCuriosities(Date.now());
    updateGarden();
    if (typeof updateLooseDrops === "function") updateLooseDrops(Date.now());
    if (typeof advanceGnomeIncident === "function") advanceGnomeIncident(Date.now(), undefined, false);
    const now = Date.now();
    invalidateDueBaseVisual(now);
    if (gardenBaseDirty) { gardenPerf?.reason("resume"); paintGardenBase(now); }
    drawGardenOverlay(true, now);
    syncWeatherAnimation(); // Resume current state once, never replay missed visual frames.
  }
});
window.addEventListener("pagehide", () => {
  gardenPerf?.dispose();
  if (weatherAnimationFrame !== null) window.cancelAnimationFrame(weatherAnimationFrame);
  weatherAnimationFrame = null;
  if (typeof finishGnomeIncident === "function") finishGnomeIncident(false);
});
drawGarden("initial");

// Logical cleanup stays at 250 ms; visual work wakes only for state changes or one aggregate deadline.
window.setInterval(() => {
  const now = Date.now();
  if (typeof updateGardenPuddles === "function" && updateGardenPuddles(now)) { gardenBaseDirty = true; gardenPerf?.reason("puddle-change"); }
  if (typeof updateFirstSeenCuriosities === "function" && updateFirstSeenCuriosities(now)) gardenOverlayDirty = true;
  if (typeof updateCollectionMessage === "function") updateCollectionMessage(now);
  updateGarden(now);
  if (typeof updateLooseDrops === "function" && updateLooseDrops(now)) gardenOverlayDirty = true;
  invalidateDueBaseVisual(now);
  paintGardenBase(now);
  if (typeof updateAmbientEvents === "function") updateAmbientEvents(now);
  if (gardenOverlayDirty) drawGardenOverlay(true, now);
  syncWeatherAnimation();
  if (typeof updateRecentActivity === "function") updateRecentActivity(now);
  gardenPerf?.updatePanel();
}, updateEveryMs);
