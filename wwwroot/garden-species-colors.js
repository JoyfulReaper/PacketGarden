// Browser-only color variants for every species except broadleaf, which has its own leaf-level palettes.
const speciesColorVariants = new Map([
  ["flower", {
    rareChance: 0.01,
    common: [
      { name: "cream", filter: "none" },
      { name: "blush", filter: "hue-rotate(315deg) saturate(1.25) brightness(1.05)" },
      { name: "sky", filter: "hue-rotate(115deg) saturate(1.3) brightness(1.08)" },
      { name: "marigold", filter: "hue-rotate(25deg) saturate(1.35) brightness(1.06)" }
    ],
    rare: { name: "moonflower", filter: "hue-rotate(145deg) saturate(1.8) brightness(1.3)", glow: "#c9f7ff" }
  }],
  ["mushroom", {
    rareChance: 0.01,
    common: [
      { name: "rust", filter: "none" },
      { name: "violet", filter: "hue-rotate(245deg) saturate(1.25) brightness(1.03)" },
      { name: "teal", filter: "hue-rotate(115deg) saturate(1.25) brightness(1.05)" },
      { name: "gold", filter: "hue-rotate(35deg) saturate(1.35) brightness(1.08)" }
    ],
    rare: { name: "bioluminescent", filter: "hue-rotate(135deg) saturate(2) brightness(1.35)", glow: "#79f6ff" }
  }],
  ["vine", {
    rareChance: 0.01,
    common: [
      { name: "chartreuse", filter: "none" },
      { name: "lime", filter: "hue-rotate(-18deg) saturate(1.25) brightness(1.08)" },
      { name: "aqua", filter: "hue-rotate(75deg) saturate(1.25) brightness(1.08)" },
      { name: "goldvine", filter: "hue-rotate(-55deg) saturate(1.35) brightness(1.08)" }
    ],
    rare: { name: "silvervine", filter: "grayscale(0.75) sepia(0.12) hue-rotate(155deg) saturate(1.5) brightness(1.35)", glow: "#e7fbff" }
  }],
  ["redbloom", {
    rareChance: 0.01,
    common: [
      { name: "crimson", filter: "none" },
      { name: "scarlet", filter: "hue-rotate(-12deg) saturate(1.3) brightness(1.05)" },
      { name: "magenta", filter: "hue-rotate(28deg) saturate(1.35) brightness(1.03)" },
      { name: "ember", filter: "hue-rotate(-28deg) saturate(1.45) brightness(1.12)" }
    ],
    // Keep the rare scheme in the red/orange family so port-22 growth stays recognizable.
    rare: { name: "solar", filter: "hue-rotate(-20deg) saturate(2) brightness(1.35)", glow: "#ffd36a" }
  }],
  ["weed", {
    rareChance: 0.01,
    common: [
      { name: "mustard", filter: "none" },
      { name: "lime", filter: "hue-rotate(45deg) saturate(1.3) brightness(1.05)" },
      { name: "rust", filter: "hue-rotate(-40deg) saturate(1.25) brightness(1.02)" },
      { name: "bluegreen", filter: "hue-rotate(105deg) saturate(1.25) brightness(1.05)" }
    ],
    rare: { name: "toxic", filter: "hue-rotate(55deg) saturate(2.2) brightness(1.25)", glow: "#c9ff57" }
  }],
  ["ghostbloom", {
    rareChance: 0.01,
    common: [
      { name: "ice", filter: "none" },
      { name: "violet", filter: "hue-rotate(65deg) saturate(1.25) brightness(1.02)" },
      { name: "mint", filter: "hue-rotate(-55deg) saturate(1.15) brightness(1.05)" },
      { name: "rose", filter: "hue-rotate(155deg) saturate(1.2) brightness(1.05)" }
    ],
    rare: { name: "spectral", filter: "saturate(0.65) brightness(1.55)", glow: "#e8ffff" }
  }],
  ["crystalfungus", {
    rareChance: 0.01,
    common: [
      { name: "cyan", filter: "none" },
      { name: "emerald", filter: "hue-rotate(-45deg) saturate(1.25) brightness(1.03)" },
      { name: "rose", filter: "hue-rotate(125deg) saturate(1.3) brightness(1.03)" },
      { name: "gold", filter: "hue-rotate(205deg) saturate(1.25) brightness(1.1)" }
    ],
    rare: { name: "aurora", filter: "hue-rotate(55deg) saturate(2) brightness(1.35)", glow: "#e1c7ff" }
  }],
  ["blackthorn", {
    rareChance: 0.01,
    common: [
      { name: "night", filter: "none" },
      { name: "blood", filter: "hue-rotate(300deg) saturate(1.4) brightness(1.02)" },
      { name: "blueblack", filter: "hue-rotate(75deg) saturate(1.3) brightness(1.05)" },
      { name: "poison", filter: "hue-rotate(150deg) saturate(1.35) brightness(1.03)" }
    ],
    rare: { name: "gilded", filter: "sepia(0.55) hue-rotate(345deg) saturate(1.8) brightness(1.25)", glow: "#ffd77a" }
  }]
]);

function commonSpeciesColorVariant(specimenType, vigor) {
  const config = speciesColorVariants.get(specimenType);
  if (!config) return null;
  const normalizedVigor = Number.isInteger(vigor) ? Math.min(3, Math.max(0, vigor)) : 0;
  return config.common[normalizedVigor].name;
}

function chooseSpeciesColorVariant(specimenType, vigor, isFake = false, roll = Math.random()) {
  const config = speciesColorVariants.get(specimenType);
  if (!config) return null;
  const normalizedRoll = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 0.5;
  if (normalizedRoll < config.rareChance) return config.rare.name;
  if (!isFake) return commonSpeciesColorVariant(specimenType, vigor);

  // Fake events have no recurrence signal, so distribute them across the same common palettes.
  const commonRoll = (normalizedRoll - config.rareChance) / (1 - config.rareChance);
  const index = Math.min(config.common.length - 1, Math.floor(commonRoll * config.common.length));
  return config.common[index].name;
}

function findSpeciesColor(specimenType, variantName) {
  const config = speciesColorVariants.get(specimenType);
  if (!config) return null;
  if (config.rare.name === variantName) return { ...config.rare, rare: true };
  return config.common.find(variant => variant.name === variantName)
    ?? config.common[0];
}

for (const [specimenType] of speciesColorVariants) {
  const species = speciesConfig.get(specimenType);
  if (!species) continue;
  const originalRender = species.render;
  species.render = function drawColorVariant(specimen, now) {
    const variantName = specimen.colorVariant ?? commonSpeciesColorVariant(specimenType, specimen.vigor ?? 0);
    const variant = findSpeciesColor(specimenType, variantName);
    context.save();
    context.filter = variant?.filter ?? "none";
    if (variant?.rare && variant.glow) {
      context.shadowColor = variant.glow;
      context.shadowBlur = 7;
    }
    originalRender(specimen, now);
    context.restore();
  };
}

const spawnSpecimenWithoutSpeciesColors = spawnSpecimen;
spawnSpecimen = function spawnSpecimenWithSpeciesColors(specimenType, grassEventType = null, vigor = 0) {
  const specimen = spawnSpecimenWithoutSpeciesColors(specimenType, grassEventType, vigor);
  if (!specimen || !speciesColorVariants.has(specimenType)) return specimen;

  specimen.colorVariant = chooseSpeciesColorVariant(specimenType, vigor, grassEventType !== null);
  // Core spawn renders before returning; repaint once so the persistent palette appears immediately.
  drawGarden();
  return specimen;
};
