// Canvas presentation adapter for the shared, renderer-neutral Gnome Incident.
const ambientEventConfig = window.PacketGardenGnomes.config;
const gnomeReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const gardenGnomes = window.PacketGardenGnomes.createModel({
  garden: gardenModel,
  getSpecimens: () => gardenState.specimens,
  getReducedMotion: () => gnomeReducedMotion?.matches ?? false,
  onCue: stage => gardenSound.maybePlayGnomeSound(stage)
});
let nextAmbientCheckAt = gardenGnomes.nextCheckAt;
let gnomeIncident = null;
function syncGnomeState() {
  gardenState.actors = gardenGnomes.actors;
  gnomeIncident = gardenGnomes.incident;
  nextAmbientCheckAt = gardenGnomes.nextCheckAt;
}
function livingSpecimenCount(now) { return gardenGnomes.livingCount(now); }
document.addEventListener("visibilitychange", () => {
  if (document.hidden) gardenGnomes.suspend(Date.now()); else gardenGnomes.resetCadence(Date.now());
  syncGnomeState();
});
function startGnomeIncident(now, random = Math.random) {
  if (!gardenGnomes.start(now, random)) return false;
  syncGnomeState(); drawGardenOverlay(true, now); syncWeatherAnimation(); return true;
}
function finishGnomeIncident(repaint = true) {
  gardenGnomes.clear(); syncGnomeState();
  if (repaint) { drawGardenOverlay(true); syncWeatherAnimation(); }
}
function advanceGnomeIncident(now, random = Math.random, repaintCompletion = true) {
  const active = gardenGnomes.incident;
  gardenGnomes.advance(now, random); syncGnomeState();
  if (active && !gnomeIncident && repaintCompletion) { drawGardenOverlay(true, now); syncWeatherAnimation(); }
}
function updateAmbientEvents(now, random = Math.random) {
  const active = gardenGnomes.incident;
  gardenGnomes.tick(now, random, Boolean(document.hidden)); syncGnomeState();
  if (Boolean(active) !== Boolean(gnomeIncident)) { drawGardenOverlay(true, now); syncWeatherAnimation(); }
}
function drawGardenActors(now) {
  for (const actor of gardenState.actors) {
    const { step, battle, bounce, shove, rotation, alpha, clippers, closed } = window.PacketGardenGnomes.appearance(actor, now, gnomeReducedMotion?.matches);
    context.save();
    context.translate(actor.x + shove, actor.y + bounce);
    if (battle) context.rotate(rotation);
    if (actor.state === "flee") {
      context.globalAlpha = alpha;
    }
    context.strokeStyle = "#433c32";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-2, 6);
    context.lineTo(-3 + step, 11);
    context.moveTo(2, 6);
    context.lineTo(3 - step, 11);
    context.stroke();
    context.fillStyle = actor.side === "green" ? "#73805b" : "#91664d";
    context.beginPath();
    context.ellipse(0, 2, 5, 5, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e0bd92";
    context.beginPath();
    context.arc(0, -3, 3.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e6e1cf";
    context.beginPath();
    context.moveTo(-3, -1);
    context.lineTo(4, -1);
    context.lineTo(0, 6);
    context.closePath();
    context.fill();
    context.fillStyle = actor.side === "green" ? "#4b9554" : "#c54a49";
    context.beginPath();
    context.moveTo(-5, -6);
    context.lineTo(1, -16);
    context.lineTo(6, -6);
    context.closePath();
    context.fill();
    if (battle) {
      context.strokeStyle = "#b5ad87";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(4, 2);
      context.lineTo(10, -5 - step * 2);
      context.stroke();
    }
    if (clippers) {
      context.strokeStyle = '#d3d8c5'; context.lineWidth = 1.6; context.beginPath();
      for (const [x,y,endX,endY] of window.PacketGardenGnomes.clipperLines(closed)) {
        context.moveTo(x,y); context.lineTo(endX,endY);
      }
      context.stroke();
    }
    context.restore();
  }
}
