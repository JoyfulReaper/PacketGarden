// Garden-side nonsense only: separate from network growth, occupancy, and grass.
const ambientEventConfig = {
  checkEveryMs: 45_000,
  minimumSpecimens: 30,
  incidentChance: 0.02,
  battleAfterMs: 3_000,
  resultAfterMs: 7_000,
  losersGoneAfterMs: 9_000,
  finishedAfterMs: 12_000
};
let nextAmbientCheckAt = Date.now() + ambientEventConfig.checkEveryMs;
let gnomeIncident = null;

function livingSpecimenCount(now) {
  return gardenState.specimens.filter(specimen =>
    now - specimen.createdAt < speciesConfig.get(specimen.type).timings.expiredAfterMs
  ).length;
}

function startGnomeIncident(now, random = Math.random) {
  if (gnomeIncident || livingSpecimenCount(now) < ambientEventConfig.minimumSpecimens) return false;
  const centerX = gardenWidth * (0.4 + random() * 0.2);
  const centerY = gardenHeight * (0.35 + random() * 0.3);
  gnomeIncident = { type: "gnome_incident", createdAt: now, phase: "approach", winner: null };
  for (const side of ["green", "red"]) {
    const direction = side === "green" ? -1 : 1;
    for (const offset of [-12, 12]) {
      const startX = centerX + direction * 180;
      const startY = centerY + direction * 40 + offset;
      gardenState.actors.push({
        type: "gnome", side, startX, startY, x: startX, y: startY,
        targetX: centerX + direction * 14, targetY: centerY + offset,
        state: "approach", createdAt: now
      });
    }
  }
  drawGardenOverlay(true, now);
  syncWeatherAnimation();
  return true;
}

function finishGnomeIncident(repaint = true) {
  gardenState.actors = [];
  gnomeIncident = null;
  if (repaint) {
    drawGardenOverlay(true);
    syncWeatherAnimation();
  }
}

function advanceGnomeIncident(now, random = Math.random, repaintCompletion = true) {
  if (!gnomeIncident) return;
  const age = Math.max(0, now - gnomeIncident.createdAt);
  if (age >= ambientEventConfig.finishedAfterMs) {
    finishGnomeIncident(repaintCompletion);
    return;
  }
  const phase = age < ambientEventConfig.battleAfterMs ? "approach"
    : age < ambientEventConfig.resultAfterMs ? "battle" : "result";
  if (phase === "battle" && gnomeIncident.phase !== "battle") gardenSound.maybePlayGnomeSound("battle");
  if (phase === "result" && gnomeIncident.winner === null) {
    gnomeIncident.winner = random() < 0.5 ? "green" : "red";
    gardenSound.maybePlayGnomeSound("victory");
  }
  gnomeIncident.phase = phase;
  if (age >= ambientEventConfig.losersGoneAfterMs) {
    gardenState.actors = gardenState.actors.filter(actor => actor.side === gnomeIncident.winner);
  }
  for (const actor of gardenState.actors) {
    if (phase === "approach") {
      const progress = age / ambientEventConfig.battleAfterMs;
      actor.x = actor.startX + (actor.targetX - actor.startX) * progress;
      actor.y = actor.startY + (actor.targetY - actor.startY) * progress;
      actor.state = "approach";
    } else {
      actor.x = actor.targetX;
      actor.y = actor.targetY;
      actor.state = phase === "battle" ? "battle" : actor.side === gnomeIncident.winner ? "celebrate" : "flee";
      if (actor.state === "flee") {
        const progress = (age - ambientEventConfig.resultAfterMs)
          / (ambientEventConfig.losersGoneAfterMs - ambientEventConfig.resultAfterMs);
        actor.x += (actor.startX - actor.targetX) * progress;
        actor.y += (actor.startY - actor.targetY) * progress;
      }
    }
  }
}

function updateAmbientEvents(now, random = Math.random) {
  if (gnomeIncident) {
    advanceGnomeIncident(now, random);
    return;
  }
  if (now < nextAmbientCheckAt) return;
  // One roll at most, even after a long pause. Never replay missed checks.
  nextAmbientCheckAt = now + ambientEventConfig.checkEveryMs;
  if (livingSpecimenCount(now) >= ambientEventConfig.minimumSpecimens && random() < ambientEventConfig.incidentChance) {
    startGnomeIncident(now, random);
  }
}

function drawGardenActors(now) {
  for (const actor of gardenState.actors) {
    const step = Math.sin((now - actor.createdAt) / 90);
    const battle = actor.state === "battle";
    const bounce = actor.state === "celebrate" ? -Math.abs(step) * 4 : 0;
    const shove = battle ? step * (actor.side === "green" ? 2 : -2) : 0;
    context.save();
    context.translate(actor.x + shove, actor.y + bounce);
    if (battle) context.rotate(step * 0.12);
    if (actor.state === "flee") {
      context.globalAlpha = Math.max(0, 1 - (now - actor.createdAt - ambientEventConfig.resultAfterMs)
        / (ambientEventConfig.losersGoneAfterMs - ambientEventConfig.resultAfterMs));
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
    context.restore();
  }
}
