// Browser-only broadleaf color variants. Backend rarity/species semantics stay unchanged.
const broadleafVariantConfig = {
  rainbowChance: 0.01,
  common: [
    { name: "plum", leaves: ["#8d6f9f", "#6f567f"], vein: "#c4a9d3" },
    { name: "teal", leaves: ["#5c9a8a", "#46786e"], vein: "#a6d2c6" },
    { name: "amber", leaves: ["#b68b45", "#8f6b35"], vein: "#e0be78" },
    { name: "rose", leaves: ["#a96f85", "#845468"], vein: "#ddb0bf" }
  ],
  rainbow: ["#e05d5d", "#e58b4a", "#d9c94f", "#76ad59", "#4fae9a", "#5f86c9", "#8b68c7", "#d66fa5"]
};

function broadleafCommonVariantForVigor(vigor) {
  const normalizedVigor = Number.isInteger(vigor) ? Math.min(3, Math.max(0, vigor)) : 0;
  return broadleafVariantConfig.common[normalizedVigor].name;
}

function chooseBroadleafVariant(vigor, isFakeHttp = false, roll = Math.random()) {
  const normalizedRoll = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 0.5;
  if (normalizedRoll < broadleafVariantConfig.rainbowChance) return "rainbow";
  if (!isFakeHttp) return broadleafCommonVariantForVigor(vigor);

  // Fake HTTP has no seenCount/vigor signal, so distribute it across the same common palettes.
  const commonRoll = (normalizedRoll - broadleafVariantConfig.rainbowChance)
    / (1 - broadleafVariantConfig.rainbowChance);
  const index = Math.min(
    broadleafVariantConfig.common.length - 1,
    Math.floor(commonRoll * broadleafVariantConfig.common.length)
  );
  return broadleafVariantConfig.common[index].name;
}

function drawBroadleafVariant(specimen, now) {
  const vigor = specimen.vigor ?? 0;
  const ageMs = Math.max(0, now - specimen.createdAt);
  if (ageMs >= broadleafTimings.expiredAfterMs) return;
  const stage = ageMs < broadleafTimings.growingAfterMs ? "sprout"
    : ageMs < broadleafTimings.matureAfterMs ? "growing"
    : ageMs < broadleafTimings.fadingAfterMs ? "mature" : "fading";
  const fading = stage === "fading";
  const size = stage === "sprout" ? 0.4 : stage === "growing" ? 0.7 : fading ? 0.7 : 1;
  const leafCount = (stage === "sprout" ? 2 : stage === "growing" ? 4 : 6) + Math.floor(vigor * 2 / 3);
  const variant = specimen.broadleafVariant ?? broadleafCommonVariantForVigor(vigor);
  const palette = broadleafVariantConfig.common.find(entry => entry.name === variant)
    ?? broadleafVariantConfig.common[0];

  context.save();
  context.translate((specimen.column + 0.5) * cellSize, (specimen.row + 0.5) * cellSize);
  context.scale(size, size);

  for (let leaf = 0; leaf < leafCount; leaf++) {
    const angle = leaf * Math.PI * 2 / leafCount - Math.PI / 4;
    context.save();
    context.rotate(angle);
    context.fillStyle = fading ? "#8f7a76"
      : variant === "rainbow" ? broadleafVariantConfig.rainbow[leaf % broadleafVariantConfig.rainbow.length]
      : palette.leaves[leaf % palette.leaves.length];
    context.beginPath();
    context.ellipse(6, 0, 7 + vigor * 0.3, 4 + vigor * 0.4, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = fading ? "#b29b92" : variant === "rainbow" ? "#f3e7bf" : palette.vein;
    context.lineWidth = 1 + vigor * 0.2;
    context.beginPath();
    context.moveTo(1, 0);
    context.lineTo(11, 0);
    context.stroke();
    context.restore();
  }
  context.restore();
}

const spawnSpecimenWithoutBroadleafVariants = spawnSpecimen;
spawnSpecimen = function spawnSpecimenWithBroadleafVariants(specimenType, grassEventType = null, vigor = 0, onCreated = null) {
  const specimen = spawnSpecimenWithoutBroadleafVariants(specimenType, grassEventType, vigor, onCreated);
  if (!specimen || specimenType !== "broadleaf") return specimen;

  specimen.broadleafVariant = chooseBroadleafVariant(vigor, grassEventType === "http");
  // Core spawn renders before returning; repaint once so the selected persistent palette appears immediately.
  drawGarden();
  return specimen;
};

speciesConfig.get("broadleaf").render = drawBroadleafVariant;
