const canvas = document.querySelector("canvas");
let context = canvas.getContext("2d");
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

function normalizeLiveGardenEvent(event) {
  if (typeof event?.specimenType !== "string" || !speciesConfig.has(event.specimenType)
    || !Number.isInteger(event.listenPort) || event.listenPort < 1 || event.listenPort > 65535
    || !Number.isInteger(event.vigor) || event.vigor < 0 || event.vigor > 3) return null;
  // Whitelist the current browser contract; never retain the raw frame.
  return {
    specimenType: event.specimenType,
    listenPort: event.listenPort,
    vigor: event.vigor,
    sensor: typeof event.sensor === "string" && event.sensor.length > 0 ? event.sensor : null,
    seenCount: typeof event.seenCount === "string" && /^\d+$/.test(event.seenCount) ? event.seenCount : null
  };
}

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
  if (weatherSoilDarkening() !== lastBaseSoilDarkening) gardenBaseDirty = true;
  paintGardenBase();
  drawGardenOverlay(true);
  syncWeatherAnimation();
}

function animateWeather(frameTime = performance.now()) {
  weatherAnimationFrame = null;
  if (document.hidden) return;
  const now = Date.now();
  if (gardenState.actors.length && typeof advanceGnomeIncident === "function") advanceGnomeIncident(now);
  drawGardenOverlay(false, now, frameTime);
  syncWeatherAnimation();
}

function syncWeatherAnimation() {
  const needed = !document.hidden && gardenView !== null && ((weatherState.level !== "quiet" && weatherState.eventsPerMinute > 0)
    || animatedSpecimens.length > 0 || gardenState.curiosities.length > 0 || gardenState.drops.length > 0 || gardenState.actors.length > 0);
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
const gardenWidth = 960;
const gardenHeight = 600;
const cellSize = 30;
const margin = 16;
const columns = gardenWidth / cellSize;
const rows = gardenHeight / cellSize;

// Lifecycle thresholds, measured from each specimen's creation.
const flowerTimings = {
  growingAfterMs: 15_000,
  matureAfterMs: 45_000,
  wiltingAfterMs: 180_000,
  expiredAfterMs: 240_000
};
const mushroomTimings = {
  growingAfterMs: 12_000,
  matureAfterMs: 40_000,
  decayingAfterMs: 240_000,
  expiredAfterMs: 300_000
};
const broadleafTimings = {
  growingAfterMs: 20_000,
  matureAfterMs: 60_000,
  fadingAfterMs: 300_000,
  expiredAfterMs: 360_000
};
const vineTimings = {
  growingAfterMs: 20_000,
  matureAfterMs: 60_000,
  dryingAfterMs: 480_000,
  expiredAfterMs: 600_000
};
const redbloomTimings = {
  wiltingAfterMs: 10_000,
  expiredAfterMs: 30_000
};
// TCPNoise variants use the same placement/expiry loop: 6, 6, 7, and 12 minutes.
const weedTimings = { growingAfterMs: 20_000, matureAfterMs: 60_000, fadingAfterMs: 300_000, expiredAfterMs: 360_000 };
const ghostbloomTimings = { growingAfterMs: 15_000, matureAfterMs: 45_000, fadingAfterMs: 300_000, expiredAfterMs: 360_000 };
const crystalfungusTimings = { growingAfterMs: 12_000, matureAfterMs: 40_000, fadingAfterMs: 360_000, expiredAfterMs: 420_000 };
const blackthornTimings = { growingAfterMs: 20_000, matureAfterMs: 60_000, fadingAfterMs: 600_000, expiredAfterMs: 720_000 };
const updateEveryMs = 250;

const grassConfig = {
  influenceChances: { dns: 0.45, http: 0.65 },
  secondCellChance: 0.35,
  sameCellChance: 0.5,
  influenceRadius: 1,
  growingAfterMs: 10_000,
  matureAfterMs: 30_000,
  fadingAfterMs: 20 * 60_000,
  dyingAfterMs: 27 * 60_000,
  deadAfterMs: 32 * 60_000,
  expiredAfterMs: 35 * 60_000,
  spreadEveryMs: 5_000,
  spreadChance: 0.35
};
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
  ["redbloom", { timings: redbloomTimings, render: drawRedbloom, singular: "red bloom", plural: "red blooms" }],
  ["weed", { timings: weedTimings, render: drawWeed, plural: "weeds" }],
  ["ghostbloom", { timings: ghostbloomTimings, render: drawGhostbloom, plural: "ghostblooms" }],
  ["crystalfungus", { timings: crystalfungusTimings, render: drawCrystalfungus, singular: "crystal fungus", plural: "crystal fungi" }],
  ["blackthorn", { timings: blackthornTimings, render: drawBlackthorn, plural: "blackthorns" }]
]);

/** @typedef {{ type: "dns" | "gopher" | "http" | "ssh" | "port22-probe" }} GardenEvent */
const gardenState = { specimens: [], grassCells: [], puddles: [], actors: [], curiosities: [], drops: [], recentEvents: [] };
const protectedSpecimenTypes = new Set(["ghostbloom", "crystalfungus", "blackthorn"]);

// Called only at saturation, after expiry. Equal vigor never churns the garden.
function findReplacementCandidate(incomingVigor) {
  let victimIndex = null;
  for (let index = 0; index < gardenState.specimens.length; index++) {
    const specimen = gardenState.specimens[index];
    const vigor = specimen.vigor ?? 0;
    if (protectedSpecimenTypes.has(specimen.type) || vigor >= incomingVigor) continue;
    const victim = victimIndex === null ? null : gardenState.specimens[victimIndex];
    if (victim === null || vigor < (victim.vigor ?? 0)
      || (vigor === (victim.vigor ?? 0) && specimen.createdAt < victim.createdAt)) {
      victimIndex = index;
    }
  }
  // Exact ties retain the first array entry, without consuming randomness.
  return victimIndex;
}

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

  const occupiedCells = new Set(
    gardenState.specimens.map(specimen => specimen.row * columns + specimen.column)
  );
  const emptyCells = [];
  for (let cell = 0; cell < columns * rows; cell++) {
    if (!occupiedCells.has(cell)) emptyCells.push(cell);
  }
  let replacementIndex = null;
  let cell;
  if (emptyCells.length === 0) {
    replacementIndex = findReplacementCandidate(vigor);
    if (replacementIndex === null) return;
    const victim = gardenState.specimens[replacementIndex];
    cell = victim.row * columns + victim.column;
  } else {
    const adjacentCells = [];
    const nearbyCells = [];
    const sameSpecies = gardenState.specimens.filter(specimen => specimen.type === specimenType);
    for (const cell of emptyCells) {
      const column = cell % columns;
      const row = Math.floor(cell / columns);
      let distance = Infinity;
      for (const specimen of sameSpecies) {
        // Diagonals count as neighbors; coordinate distances never wrap at edges.
        distance = Math.min(distance, Math.max(
          Math.abs(column - specimen.column),
          Math.abs(row - specimen.row)
        ));
      }
      if (distance === 1) adjacentCells.push(cell);
      else if (distance === 2) nearbyCells.push(cell);
    }

    // Mostly extend a patch, with occasional small gaps rather than distant seeds.
    const preferAdjacent = Math.random() < 0.9;
    const preferredCells = preferAdjacent ? adjacentCells : nearbyCells;
    const alternateCells = preferAdjacent ? nearbyCells : adjacentCells;
    const candidates = preferredCells.length > 0 ? preferredCells
      : alternateCells.length > 0 ? alternateCells : emptyCells;
    cell = candidates[Math.floor(Math.random() * candidates.length)];
  }
  const specimen = {
    type: specimenType,
    column: cell % columns,
    row: Math.floor(cell / columns),
    createdAt: Date.now(),
    vigor
  };
  if (replacementIndex === null) gardenState.specimens.push(specimen);
  else gardenState.specimens[replacementIndex] = specimen;
  if (onCreated) onCreated(specimen, replacementIndex === null ? "spawned" : "replaced");
  if (grassEventType) influenceGrass(grassEventType, specimen);

  updateGardenStatus();
  drawGarden();
  gardenSound.maybePlayGrowthSound(specimenType);
  return specimen;
}

function influenceGrass(eventType, specimen, now = Date.now()) {
  const chance = grassConfig.influenceChances[eventType] ?? 0;
  if (chance === 0 || Math.random() >= chance) return;

  let column = specimen.column;
  let row = specimen.row;
  const neighbors = grassNeighbors(column, row);
  if (Math.random() >= grassConfig.sameCellChance) {
    if (neighbors.length > 0) {
      const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      column = neighbor.column;
      row = neighbor.row;
    }
  }

  influenceGrassCell(column, row, now);
  if (Math.random() < grassConfig.secondCellChance) {
    const otherNeighbors = neighbors.filter(cell => cell.column !== column || cell.row !== row);
    if (otherNeighbors.length > 0) {
      const second = otherNeighbors[Math.floor(Math.random() * otherNeighbors.length)];
      influenceGrassCell(second.column, second.row, now);
    }
  }
}

function grassNeighbors(column, row) {
  const neighbors = [];
  for (let dy = -grassConfig.influenceRadius; dy <= grassConfig.influenceRadius; dy++) {
    for (let dx = -grassConfig.influenceRadius; dx <= grassConfig.influenceRadius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const neighborColumn = column + dx;
      const neighborRow = row + dy;
      if (neighborColumn >= 0 && neighborColumn < columns && neighborRow >= 0 && neighborRow < rows) {
        neighbors.push({ column: neighborColumn, row: neighborRow });
      }
    }
  }
  return neighbors;
}

function influenceGrassCell(column, row, now) {
  const grass = gardenState.grassCells.find(cell => cell.column === column && cell.row === row);
  if (grass) {
    if (grass.lastInfluencedAt !== now) {
      grass.lastInfluencedAt = now;
      gardenBaseDirty = true;
    }
  } else {
    gardenState.grassCells.push({ column, row, createdAt: now, lastInfluencedAt: now });
    gardenBaseDirty = true;
  }
}

function spreadGrass(now) {
  if (now < nextGrassSpreadAt) return;
  // One attempt for the whole garden, with no catch-up bursts after a paused tab.
  nextGrassSpreadAt = now + grassConfig.spreadEveryMs;
  if (Math.random() >= grassConfig.spreadChance) return;

  const occupied = new Set(gardenState.grassCells.map(cell => cell.row * columns + cell.column));
  const candidates = [];
  for (const grass of gardenState.grassCells) {
    if (now - grass.createdAt < grassConfig.matureAfterMs
      || now - grass.lastInfluencedAt >= grassConfig.fadingAfterMs) continue;
    const neighbors = grassNeighbors(grass.column, grass.row).filter(
      cell => !occupied.has(cell.row * columns + cell.column)
    );
    if (neighbors.length > 0) candidates.push(neighbors);
  }
  if (candidates.length === 0) return;
  const neighbors = candidates[Math.floor(Math.random() * candidates.length)];
  const target = neighbors[Math.floor(Math.random() * neighbors.length)];
  influenceGrassCell(target.column, target.row, now);
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
  const remaining = gardenState.specimens.filter(specimen => {
    if (specimen.mutation) return now < specimen.mutation.expiresAt;
    const expiresAfterMs = speciesConfig.get(specimen.type).timings.expiredAfterMs;
    return now - specimen.createdAt < expiresAfterMs;
  });
  if (remaining.length !== gardenState.specimens.length) {
    gardenState.specimens = remaining;
    gardenBaseDirty = true;
    updateGardenStatus();
  }
  if (typeof updateSpecimenMutations === "function" && updateSpecimenMutations(now)) gardenBaseDirty = true;
  const grassCount = gardenState.grassCells.length;
  gardenState.grassCells = gardenState.grassCells.filter(
    grass => now - grass.lastInfluencedAt < grassConfig.expiredAfterMs
  );
  if (gardenState.grassCells.length !== grassCount) gardenBaseDirty = true;
  const remainingGrassCount = gardenState.grassCells.length;
  if (gardenState.grassCells.length > 0) spreadGrass(now);
  if (gardenState.grassCells.length !== remainingGrassCount) gardenBaseDirty = true;
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
  const ageMs = Math.max(0, now - specimen.createdAt);
  if (ageMs >= flowerTimings.expiredAfterMs) return;
  const stage = ageMs < flowerTimings.growingAfterMs ? "sprout"
    : ageMs < flowerTimings.matureAfterMs ? "growing"
    : ageMs < flowerTimings.wiltingAfterMs ? "mature" : "wilting";
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

function drawMushroom(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  const ageMs = Math.max(0, now - specimen.createdAt);
  if (ageMs >= mushroomTimings.expiredAfterMs) return;
  const stage = ageMs < mushroomTimings.growingAfterMs ? "sprout"
    : ageMs < mushroomTimings.matureAfterMs ? "growing"
    : ageMs < mushroomTimings.decayingAfterMs ? "mature" : "decaying";
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
  const ageMs = Math.max(0, now - specimen.createdAt);
  if (ageMs >= broadleafTimings.expiredAfterMs) return;
  const stage = ageMs < broadleafTimings.growingAfterMs ? "sprout"
    : ageMs < broadleafTimings.matureAfterMs ? "growing"
    : ageMs < broadleafTimings.fadingAfterMs ? "mature" : "fading";
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
  const ageMs = Math.max(0, now - specimen.createdAt);
  if (ageMs >= vineTimings.expiredAfterMs) return;
  const stage = ageMs < vineTimings.growingAfterMs ? "sprout"
    : ageMs < vineTimings.matureAfterMs ? "growing"
    : ageMs < vineTimings.dryingAfterMs ? "mature" : "drying";
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

// Shared drawing setup for the four variants; no rarity decisions in the browser.
function drawVariant(specimen, now, paint) {
  const timings = speciesConfig.get(specimen.type).timings;
  const age = Math.max(0, now - specimen.createdAt);
  if (age >= timings.expiredAfterMs) return;
  const fading = age >= timings.fadingAfterMs;
  const size = age < timings.growingAfterMs ? 0.4 : age < timings.matureAfterMs ? 0.7 : fading ? 0.65 : 1;
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
  const ageMs = Math.max(0, now - specimen.createdAt);
  if (ageMs >= redbloomTimings.expiredAfterMs) return;
  const wilting = ageMs >= redbloomTimings.wiltingAfterMs;

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
  const ageMs = Math.max(0, now - grass.createdAt);
  const idleMs = Math.max(0, now - grass.lastInfluencedAt);
  if (idleMs >= grassConfig.expiredAfterMs) return;
  const growing = Math.min(1, ageMs / grassConfig.growingAfterMs);
  const expansion = Math.min(1, Math.max(0,
    (ageMs - grassConfig.growingAfterMs) / (grassConfig.matureAfterMs - grassConfig.growingAfterMs)));
  const growth = 0.18 + growing * 0.12 + expansion * 0.7;
  const decline = Math.min(1, Math.max(0,
    (idleMs - grassConfig.fadingAfterMs) / (grassConfig.expiredAfterMs - grassConfig.fadingAfterMs)));
  // Green -> yellow -> brown -> dead turf; interpolate rather than jumping colors.
  const colors = [[86, 127, 71], [144, 137, 74], [133, 105, 67], [112, 93, 69]];
  const thresholds = [grassConfig.fadingAfterMs, grassConfig.dyingAfterMs,
    grassConfig.deadAfterMs, grassConfig.expiredAfterMs];
  const colorStage = idleMs < thresholds[1] ? 0 : idleMs < thresholds[2] ? 1 : 2;
  const colorProgress = Math.min(1, Math.max(0,
    (idleMs - thresholds[colorStage]) / (thresholds[colorStage + 1] - thresholds[colorStage])));
  const color = colors[colorStage].map((channel, index) => Math.round(
    channel + (colors[colorStage + 1][index] - channel) * colorProgress));
  const x = (grass.column + 0.5) * cellSize;
  const y = (grass.row + 0.5) * cellSize;

  context.save();
  // Clip to the garden boundary, not individual tiles, so neighboring patches can merge.
  context.beginPath();
  context.rect(3, 3, gardenWidth - 6, gardenHeight - 6);
  context.clip();
  context.fillStyle = `rgb(${color.join(", ")})`;
  context.globalAlpha = 0.6 * (1 - 0.65 * decline);
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
const rendererConfig = { animationFps: 30, maxPixelRatio: 2, slowVisualRefreshMs: 1_000 };
const gardenBaseCanvas = canvas;
const gardenBaseContext = context;
const gardenOverlayCanvas = document.querySelector("#garden-overlay");
const gardenOverlayContext = gardenOverlayCanvas.getContext("2d");
let gardenBaseDirty = true;
let gardenOverlayDirty = false;
let gardenView = null;
let lastOverlayAt = -Infinity;
let nextBaseVisualAt = 0;
let lastBaseSoilDarkening = null;
let vineCellLookup = null;
const animatedSpecimens = [];

function buildVineCellLookup(now) {
  const lookup = new Map();
  for (const specimen of gardenState.specimens) {
    if (specimen.type !== "vine") continue;
    const age = now - specimen.createdAt;
    if (age >= vineTimings.growingAfterMs && age < vineTimings.expiredAfterMs) {
      lookup.set(specimen.row * columns + specimen.column, specimen);
    }
  }
  return lookup;
}

function vineNeighborAt(lookup, column, row) {
  if (column < 0 || column >= columns || row < 0 || row >= rows) return null;
  return lookup.get(row * columns + column) ?? null;
}

function resizeCanvasBacking(target, width, height) {
  if (target.width !== width) target.width = width;
  if (target.height !== height) target.height = height;
}

function rebuildGardenBase(now) {
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

    for (const grass of gardenState.grassCells) {
      drawGrass(grass, now);
    }
    if (typeof drawGardenPuddles === "function") drawGardenPuddles(now);
    animatedSpecimens.length = 0;
    for (const specimen of gardenState.specimens) {
      if (specimen.mutation && typeof drawSpecimenMutation === "function") {
        animatedSpecimens.push(specimen);
      } else {
        speciesConfig.get(specimen.type).render(specimen, now);
      }
    }
  } finally {
    context = visibleContext;
    vineCellLookup = null;
  }
  if (previousAnimated.length !== animatedSpecimens.length
    || previousAnimated.some((specimen, index) => specimen !== animatedSpecimens[index])) gardenOverlayDirty = true;
  gardenBaseDirty = false;
  nextBaseVisualAt = now + rendererConfig.slowVisualRefreshMs;
  lastBaseSoilDarkening = weatherSoilDarkening();
  return true;
}

function paintGardenBase(now = Date.now()) {
  if (document.hidden || !gardenBaseDirty) return false;
  return rebuildGardenBase(now);
}

function drawGardenOverlay(force = false, now = Date.now(), frameTime = performance.now()) {
  if (document.hidden) return false;
  // All dynamic objects and weather share the same scheduler and FPS budget.
  if (!force && frameTime - lastOverlayAt + 0.001 < 1000 / rendererConfig.animationFps) return false;
  if (!gardenView) return false;
  lastOverlayAt = frameTime;
  const previousContext = context;
  context = gardenOverlayContext;
  try {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, gardenOverlayCanvas.width, gardenOverlayCanvas.height);
    const { pixelRatio, scale, offsetX, offsetY } = gardenView;
    context.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, offsetX * pixelRatio, offsetY * pixelRatio);
    for (const specimen of animatedSpecimens) drawSpecimenMutation(specimen, now);
    if (typeof drawGardenActors === "function") drawGardenActors(now);
    if (typeof drawLooseDrops === "function") drawLooseDrops(now);
    if (typeof drawFirstSeenCuriosities === "function") drawFirstSeenCuriosities(now);
    drawRain(now);
  } finally {
    context = previousContext;
  }
  gardenOverlayDirty = false;
  return true;
}

// Actual ecology changes repaint immediately. Routine logical ticks do not call this.
function drawGarden() {
  gardenBaseDirty = true;
  paintGardenBase();
  drawGardenOverlay(true);
  syncWeatherAnimation();
}

function resizeGarden() {
  if (document.hidden) { gardenBaseDirty = true; return; }
  const { width, height } = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, rendererConfig.maxPixelRatio);
  // Window resize and ResizeObserver can report the same change; rebuild once.
  if (!gardenView || width !== gardenView.width || height !== gardenView.height
    || pixelRatio !== gardenView.pixelRatio) drawGarden();
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
  if (typeof resetPuddleFormationClock === "function" && resetPuddleFormationClock(Date.now())) gardenBaseDirty = true;
  if (document.hidden) syncWeatherAnimation();
  else {
    if (typeof updateFirstSeenCuriosities === "function") updateFirstSeenCuriosities(Date.now());
    updateGarden();
    if (typeof updateLooseDrops === "function") updateLooseDrops(Date.now());
    if (typeof advanceGnomeIncident === "function") advanceGnomeIncident(Date.now(), undefined, false);
    drawGarden(); // Refresh once at current time, never replay missed frames.
  }
});
window.addEventListener("pagehide", () => {
  if (weatherAnimationFrame !== null) window.cancelAnimationFrame(weatherAnimationFrame);
  weatherAnimationFrame = null;
  if (typeof finishGnomeIncident === "function") finishGnomeIncident(false);
});
drawGarden();

// Logical cleanup stays at 250 ms; otherwise age-driven ecology paints at most once a second.
window.setInterval(() => {
  const now = Date.now();
  if (typeof updateGardenPuddles === "function" && updateGardenPuddles(now)) gardenBaseDirty = true;
  if (typeof updateFirstSeenCuriosities === "function" && updateFirstSeenCuriosities(now)) gardenOverlayDirty = true;
  if (typeof updateCollectionMessage === "function") updateCollectionMessage(now);
  updateGarden(now);
  if (typeof updateLooseDrops === "function" && updateLooseDrops(now)) gardenOverlayDirty = true;
  if (now >= nextBaseVisualAt && (gardenState.specimens.length || gardenState.grassCells.length || gardenState.puddles.length)) {
    gardenBaseDirty = true;
  }
  paintGardenBase(now);
  if (typeof updateAmbientEvents === "function") updateAmbientEvents(now);
  if (gardenOverlayDirty) drawGardenOverlay(true, now);
  syncWeatherAnimation();
  if (typeof updateRecentActivity === "function") updateRecentActivity(now);
}, updateEveryMs);
