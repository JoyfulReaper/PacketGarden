const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

// Fixed logical dimensions; resizing changes only the presentation scale.
const gardenWidth = 960;
const gardenHeight = 600;
const cellSize = 30;
const margin = 16;

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
}

new ResizeObserver(drawGarden).observe(canvas);
window.addEventListener("resize", drawGarden);
drawGarden();
