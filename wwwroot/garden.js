const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const fakeDnsButton = document.querySelector("#fake-dns");
const gardenStatus = document.querySelector("#garden-status");

// Fixed logical dimensions; resizing changes only the presentation scale.
const gardenWidth = 960;
const gardenHeight = 600;
const cellSize = 30;
const margin = 16;
const columns = gardenWidth / cellSize;
const rows = gardenHeight / cellSize;

/** @typedef {{ type: "dns" }} GardenEvent */
const gardenState = { specimens: [] };

/** @param {GardenEvent} event */
function handleGardenEvent(event) {
  if (event.type !== "dns") return;

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
  for (const cell of emptyCells) {
    const column = cell % columns;
    const row = Math.floor(cell / columns);
    let distance = Infinity;
    for (const flower of gardenState.specimens) {
      // Diagonals count as neighbors; coordinate distances never wrap at edges.
      distance = Math.min(distance, Math.max(
        Math.abs(column - flower.column),
        Math.abs(row - flower.row)
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
    type: "flower",
    column: cell % columns,
    row: Math.floor(cell / columns)
  });

  const count = gardenState.specimens.length;
  const description = `${count} ${count === 1 ? "flower" : "flowers"}`;
  gardenStatus.textContent = description;
  canvas.setAttribute("aria-label", `Rectangular soil garden with a subtle square grid and ${description}`);
  fakeDnsButton.disabled = count === columns * rows;
  drawGarden();
}

fakeDnsButton.addEventListener("click", () => {
  /** @type {GardenEvent} */
  const event = { type: "dns" };
  handleGardenEvent(event);
});

function drawFlower(specimen) {
  const x = (specimen.column + 0.5) * cellSize;
  const y = (specimen.row + 0.5) * cellSize;

  context.fillStyle = "#75935b";
  context.beginPath();
  context.ellipse(x - 5, y + 5, 7, 3, -Math.PI / 4, 0, Math.PI * 2);
  context.ellipse(x + 5, y + 5, 7, 3, Math.PI / 4, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#eedec3";
  for (let petal = 0; petal < 5; petal++) {
    const angle = petal * Math.PI * 2 / 5 - Math.PI / 2;
    context.beginPath();
    context.arc(x + Math.cos(angle) * 5, y + Math.sin(angle) * 5, 4, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#d6aa4e";
  context.beginPath();
  context.arc(x, y, 3, 0, Math.PI * 2);
  context.fill();
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

  for (const specimen of gardenState.specimens) {
    drawFlower(specimen);
  }
}

new ResizeObserver(drawGarden).observe(canvas);
window.addEventListener("resize", drawGarden);
drawGarden();
