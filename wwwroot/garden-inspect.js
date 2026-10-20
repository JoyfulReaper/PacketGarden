const specimenCard = document.querySelector("#specimen-card");
const specimenCardClose = document.querySelector("#specimen-card-close");
const specimenCardTitle = document.querySelector("#specimen-card-title");
const specimenCardFields = {
  source: document.querySelector("#specimen-source"),
  sensor: document.querySelector("#specimen-sensor"),
  port: document.querySelector("#specimen-port"),
  seenCount: document.querySelector("#specimen-seen-count"),
  vigor: document.querySelector("#specimen-vigor"),
  color: document.querySelector("#specimen-color"),
  age: document.querySelector("#specimen-age"),
  mutation: document.querySelector("#specimen-mutation")
};
let inspectedSpecimen = null;

const vigorNames = window.PacketGardenUiCore.vigorNames;

function specimenDisplayName(specimen) {
  const config = speciesConfig.get(specimen.type);
  const name = config?.singular ?? specimen.type;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function specimenColorName(specimen) {
  const name = specimen.broadleafVariant ?? specimen.colorVariant;
  if (!name) return "Default";
  return name.charAt(0).toUpperCase() + name.slice(1).replaceAll("-", " ");
}

function formatSpecimenAge(ageMs) {
  return window.PacketGardenUiCore.formatAge(ageMs);
}

function positionSpecimenCard(clientX, clientY) {
  const gap = 12;
  const width = specimenCard.offsetWidth || 280;
  const height = specimenCard.offsetHeight || 240;
  const maxLeft = Math.max(gap, window.innerWidth - width - gap);
  const maxTop = Math.max(gap, window.innerHeight - height - gap);
  specimenCard.style.left = `${Math.min(maxLeft, Math.max(gap, clientX + gap))}px`;
  specimenCard.style.top = `${Math.min(maxTop, Math.max(gap, clientY + gap))}px`;
}

function renderSpecimenCard(specimen, clientX = null, clientY = null) {
  if (!specimen || !gardenState.specimens.includes(specimen)) {
    closeSpecimenCard();
    return;
  }

  const info = window.PacketGardenUiCore.inspection(specimen, Date.now(), { colorName: specimenColorName(specimen), sourceNames: fakeSourceNames });
  specimenCardTitle.textContent = specimenDisplayName(specimen);
  for (const key of Object.keys(specimenCardFields)) specimenCardFields[key].textContent = info[key];
  inspectedSpecimen = specimen;
  specimenCard.hidden = false;

  if (Number.isFinite(clientX) && Number.isFinite(clientY)) positionSpecimenCard(clientX, clientY);
}

function closeSpecimenCard() {
  inspectedSpecimen = null;
  specimenCard.hidden = true;
}

function gardenPointFromClient(clientX, clientY) {
  if (typeof gardenPerf !== "undefined") gardenPerf?.count("layoutReads");
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(
    rect.width / (gardenWidth + margin * 2),
    rect.height / (gardenHeight + margin * 2)
  );
  if (!Number.isFinite(scale) || scale <= 0) return null;

  const offsetX = (rect.width - gardenWidth * scale) / 2;
  const offsetY = (rect.height - gardenHeight * scale) / 2;
  const x = (clientX - rect.left - offsetX) / scale;
  const y = (clientY - rect.top - offsetY) / scale;
  if (x < 0 || x >= gardenWidth || y < 0 || y >= gardenHeight) return null;
  return { x, y };
}

function specimenAtGardenPoint(point) {
  return window.PacketGardenInteraction.specimenAt(point, gardenState.specimens);
}

function specimenAtCanvasPoint(clientX, clientY) {
  return specimenAtGardenPoint(gardenPointFromClient(clientX, clientY));
}

canvas.addEventListener("click", event => {
  const point = gardenPointFromClient(event.clientX, event.clientY);
  const hit = window.PacketGardenInteraction.resolve(point, gardenState);
  if (hit?.kind === "curiosity") {
    collectFirstSeenCuriosity(hit.object);
    return;
  }
  if (hit?.kind === "drop") {
    collectLooseDrop(hit.object);
    return;
  }
  if (hit?.kind === "mutation") {
    collectSpecimenMutation(hit.specimen);
    return;
  }
  if (!hit) {
    closeSpecimenCard();
    return;
  }
  renderSpecimenCard(hit.specimen, event.clientX, event.clientY);
});

specimenCardClose.addEventListener("click", closeSpecimenCard);
window.addEventListener("keydown", event => {
  if (event.key === "Escape") closeSpecimenCard();
});

// Fake controls have no TCPNoise provenance; label them explicitly instead of inventing it.
const spawnSpecimenWithoutInspection = spawnSpecimen;
spawnSpecimen = function spawnSpecimenWithInspection(specimenType, grassEventType = null, vigor = 0, onCreated = null) {
  const specimen = spawnSpecimenWithoutInspection(specimenType, grassEventType, vigor, onCreated);
  if (specimen && grassEventType !== null) {
    specimen.origin = { kind: "simulated", eventType: grassEventType };
  }
  return specimen;
};

// Keep age useful while open and close if the selected specimen expires or is displaced.
window.setInterval(() => {
  if (specimenCard.hidden || !inspectedSpecimen) return;
  if (!gardenState.specimens.includes(inspectedSpecimen)) {
    closeSpecimenCard();
    return;
  }
  specimenCardFields.age.textContent = formatSpecimenAge(Date.now() - inspectedSpecimen.createdAt);
  specimenCardFields.mutation.textContent = typeof specimenMutationLabel === "function"
    ? specimenMutationLabel(inspectedSpecimen) : "None";
}, 1_000);
