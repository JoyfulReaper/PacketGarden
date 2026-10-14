const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const fakeDnsButton = document.querySelector("#fake-dns");
const fakeGopherButton = document.querySelector("#fake-gopher");
const fakeHttpButton = document.querySelector("#fake-http");
const fakeSshButton = document.querySelector("#fake-ssh");
const gardenStatus = document.querySelector("#garden-status");

// Fixed logical dimensions; resizing changes only the presentation scale.
const gardenWidth = 960;
const gardenHeight = 600;
const cellSize = 30;
const margin = 16;
const columns = gardenWidth / cellSize;
const rows = gardenHeight / cellSize;

// Short development timings, measured from each specimen's creation.
const flowerTimings = {
  growingAfterMs: 5_000,
  matureAfterMs: 12_000,
  wiltingAfterMs: 25_000,
  expiredAfterMs: 35_000
};
const mushroomTimings = {
  growingAfterMs: 4_000,
  matureAfterMs: 10_000,
  decayingAfterMs: 30_000,
  expiredAfterMs: 42_000
};
const broadleafTimings = {
  growingAfterMs: 6_000,
  matureAfterMs: 14_000,
  fadingAfterMs: 38_000,
  expiredAfterMs: 50_000
};
const vineTimings = {
  growingAfterMs: 5_000,
  matureAfterMs: 12_000,
  dryingAfterMs: 45_000,
  expiredAfterMs: 60_000
};
const updateEveryMs = 250;

const eventSpecimenTypes = new Map([
  ["dns", "flower"],
  ["gopher", "mushroom"],
  ["http", "broadleaf"],
  ["ssh", "vine"]
]);
const speciesConfig = new Map([
  ["flower", { timings: flowerTimings, render: drawFlower, plural: "flowers" }],
  ["mushroom", { timings: mushroomTimings, render: drawMushroom, plural: "mushrooms" }],
  ["broadleaf", { timings: broadleafTimings, render: drawBroadleaf, singular: "broad-leaf plant", plural: "broad-leaf plants" }],
  ["vine", { timings: vineTimings, render: drawVine, plural: "vines" }]
]);

/** @typedef {{ type: "dns" | "gopher" | "http" | "ssh" }} GardenEvent */
const gardenState = { specimens: [] };

/** @param {GardenEvent} event */
function handleGardenEvent(event) {
  const specimenType = eventSpecimenTypes.get(event.type);
  if (!specimenType) return;

  updateGarden();

  const occupiedCells = new Set(
    gardenState.specimens.map(specimen => specimen.row * columns + specimen.column)
  );
  const emptyCells = [];
  for (let cell = 0; cell < columns * rows; cell++) {
    if (!occupiedCells.has(cell)) emptyCells.push(cell);
  }
  if (emptyCells.length === 0) return;

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
  const cell = candidates[Math.floor(Math.random() * candidates.length)];
  gardenState.specimens.push({
    type: specimenType,
    column: cell % columns,
    row: Math.floor(cell / columns),
    createdAt: Date.now()
  });

  updateGardenStatus();
  drawGarden();
}

function updateGardenStatus() {
  const count = gardenState.specimens.length;
  const description = Array.from(speciesConfig, ([type, config]) => {
    const speciesCount = gardenState.specimens.filter(specimen => specimen.type === type).length;
    return `${speciesCount} ${speciesCount === 1 ? config.singular ?? type : config.plural}`;
  }).join(", ");
  gardenStatus.textContent = description;
  canvas.setAttribute("aria-label", `Rectangular soil garden with a subtle square grid and ${description}`);
  fakeDnsButton.disabled = count === columns * rows;
  fakeGopherButton.disabled = count === columns * rows;
  fakeHttpButton.disabled = count === columns * rows;
  fakeSshButton.disabled = count === columns * rows;
}

function updateGarden(now = Date.now()) {
  const remaining = gardenState.specimens.filter(specimen => {
    const expiresAfterMs = speciesConfig.get(specimen.type).timings.expiredAfterMs;
    return now - specimen.createdAt < expiresAfterMs;
  });
  if (remaining.length !== gardenState.specimens.length) {
    gardenState.specimens = remaining;
    updateGardenStatus();
  }
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

function drawFlower(specimen, now) {
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
  context.ellipse(x - 5 * leafSize, y + 5 * leafSize, 7 * leafSize, 3 * leafSize, -Math.PI / 4, 0, Math.PI * 2);
  context.ellipse(x + 5 * leafSize, y + 5 * leafSize, 7 * leafSize, 3 * leafSize, Math.PI / 4, 0, Math.PI * 2);
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
  for (let petal = 0; petal < 5; petal++) {
    const angle = petal * Math.PI * 2 / 5 - Math.PI / 2;
    context.beginPath();
    context.arc(x + Math.cos(angle) * 5 * bloomSize, bloomY + Math.sin(angle) * 5 * bloomSize, 4 * bloomSize, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = wilting ? "#8c784e" : "#d6aa4e";
  context.beginPath();
  context.arc(x, bloomY, 3 * bloomSize, 0, Math.PI * 2);
  context.fill();
}

function drawMushroom(specimen, now) {
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
  context.fillRect(-2, 2, 4, 8);
  context.fillStyle = decaying ? "#76614f" : "#b86b48";
  context.beginPath();
  context.ellipse(0, 0, 10, decaying ? 4 : 8, 0, 0, Math.PI * 2);
  context.fill();

  if (stage !== "sprout") {
    context.fillStyle = decaying ? "#99866c" : "#f0dfb9";
    context.beginPath();
    context.arc(-4, -2, 2, 0, Math.PI * 2);
    context.arc(4, -1, 1.5, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawBroadleaf(specimen, now) {
  const ageMs = Math.max(0, now - specimen.createdAt);
  if (ageMs >= broadleafTimings.expiredAfterMs) return;
  const stage = ageMs < broadleafTimings.growingAfterMs ? "sprout"
    : ageMs < broadleafTimings.matureAfterMs ? "growing"
    : ageMs < broadleafTimings.fadingAfterMs ? "mature" : "fading";
  const fading = stage === "fading";
  const size = stage === "sprout" ? 0.4 : stage === "growing" ? 0.7 : fading ? 0.7 : 1;
  const leafCount = stage === "sprout" ? 2 : stage === "growing" ? 4 : 6;

  context.save();
  context.translate((specimen.column + 0.5) * cellSize, (specimen.row + 0.5) * cellSize);
  context.scale(size, size);

  for (let leaf = 0; leaf < leafCount; leaf++) {
    const angle = leaf * Math.PI * 2 / leafCount - Math.PI / 4;
    context.save();
    context.rotate(angle);
    context.fillStyle = fading ? "#8d8653" : leaf % 2 === 0 ? "#6e9a56" : "#527c44";
    context.beginPath();
    context.ellipse(6, 0, 7, 4, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = fading ? "#a59a67" : "#9bbb76";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(1, 0);
    context.lineTo(11, 0);
    context.stroke();
    context.restore();
  }
  context.restore();
}

function drawVine(specimen, now) {
  const ageMs = Math.max(0, now - specimen.createdAt);
  if (ageMs >= vineTimings.expiredAfterMs) return;
  const stage = ageMs < vineTimings.growingAfterMs ? "sprout"
    : ageMs < vineTimings.matureAfterMs ? "growing"
    : ageMs < vineTimings.dryingAfterMs ? "mature" : "drying";
  const drying = stage === "drying";
  const size = stage === "sprout" ? 0.4 : stage === "growing" ? 0.7 : drying ? 0.55 : 1;

  context.save();
  context.translate((specimen.column + 0.5) * cellSize, (specimen.row + 0.5) * cellSize);
  context.strokeStyle = drying ? "#857454" : "#527943";
  context.lineWidth = drying ? 1 : stage === "mature" ? 2.5 : 1.5;
  context.lineCap = "round";

  if (stage !== "sprout") {
    for (const neighbor of gardenState.specimens) {
      if (neighbor === specimen || neighbor.type !== "vine") continue;
      const neighborAge = now - neighbor.createdAt;
      if (neighborAge < vineTimings.growingAfterMs || neighborAge >= vineTimings.expiredAfterMs) continue;
      const dx = neighbor.column - specimen.column;
      const dy = neighbor.row - specimen.row;
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== 1) continue;

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

  context.beginPath();
  context.moveTo(-8 * size, 6 * size);
  context.bezierCurveTo(-9 * size, -3 * size, 8 * size, 4 * size, 8 * size, -7 * size);
  context.stroke();

  context.fillStyle = drying ? "#8c8056" : "#78934e";
  context.beginPath();
  context.ellipse(-5 * size, 4 * size, 4 * size, 1.8 * size, -Math.PI / 4, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(6 * size, -4 * size, 4 * size, 1.8 * size, Math.PI / 4, 0, Math.PI * 2);
  context.fill();

  if (stage !== "sprout") {
    context.fillStyle = drying ? "#a08b67" : "#c3b080";
    context.beginPath();
    context.moveTo(-4 * size, 1 * size);
    context.lineTo(-8 * size, -4 * size);
    context.lineTo(-1 * size, 0);
    context.closePath();
    context.moveTo(3 * size, -1 * size);
    context.lineTo(8 * size, 3 * size);
    context.lineTo(5 * size, -3 * size);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawGarden() {
  const { width, height } = canvas.getBoundingClientRect();
  if (width <= 0 || height <= 0) return;

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const scale = Math.min(
    width / (gardenWidth + margin * 2),
    height / (gardenHeight + margin * 2)
  );
  context.translate(
    (width - gardenWidth * scale) / 2,
    (height - gardenHeight * scale) / 2
  );
  context.scale(scale, scale);

  context.fillStyle = "#685b45";
  context.fillRect(0, 0, gardenWidth, gardenHeight);

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

  const now = Date.now();
  for (const specimen of gardenState.specimens) {
    speciesConfig.get(specimen.type).render(specimen, now);
  }
}

new ResizeObserver(drawGarden).observe(canvas);
window.addEventListener("resize", drawGarden);
drawGarden();

// Clean up before drawing, including the tick that removes the final specimen.
window.setInterval(() => {
  if (gardenState.specimens.length > 0) {
    updateGarden();
    drawGarden();
  }
}, updateEveryMs);
