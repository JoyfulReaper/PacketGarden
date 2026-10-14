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
  age: document.querySelector("#specimen-age")
};
let inspectedSpecimen = null;

const fakeSourceNames = {
  dns: "Simulated DNS",
  gopher: "Simulated Gopher",
  http: "Simulated HTTP",
  ssh: "Simulated SSH",
  "port22-probe": "Simulated port 22 probe"
};
const vigorNames = ["one-off", "repeated", "frequent", "persistent"];

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
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
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

  const origin = specimen.origin ?? {};
  specimenCardTitle.textContent = specimenDisplayName(specimen);
  specimenCardFields.source.textContent = origin.kind === "tcpnoise"
    ? "Live TCPNoise" : fakeSourceNames[origin.eventType] ?? "Garden event";
  specimenCardFields.sensor.textContent = origin.sensor ?? (origin.kind === "tcpnoise" ? "Not supplied" : "Development controls");
  specimenCardFields.port.textContent = Number.isInteger(origin.listenPort) ? String(origin.listenPort) : "—";
  specimenCardFields.seenCount.textContent = origin.seenCount ?? "—";
  const vigor = specimen.vigor ?? 0;
  specimenCardFields.vigor.textContent = `${vigor} — ${vigorNames[vigor] ?? "unknown"}`;
  specimenCardFields.color.textContent = specimenColorName(specimen);
  specimenCardFields.age.textContent = formatSpecimenAge(Date.now() - specimen.createdAt);
  inspectedSpecimen = specimen;
  specimenCard.hidden = false;

  if (Number.isFinite(clientX) && Number.isFinite(clientY)) positionSpecimenCard(clientX, clientY);
}

function closeSpecimenCard() {
  inspectedSpecimen = null;
  specimenCard.hidden = true;
}

function specimenAtCanvasPoint(clientX, clientY) {
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

  const column = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  return gardenState.specimens.find(specimen => specimen.column === column && specimen.row === row) ?? null;
}

canvas.addEventListener("click", event => {
  const specimen = specimenAtCanvasPoint(event.clientX, event.clientY);
  if (!specimen) {
    closeSpecimenCard();
    return;
  }
  renderSpecimenCard(specimen, event.clientX, event.clientY);
});

specimenCardClose.addEventListener("click", closeSpecimenCard);
window.addEventListener("keydown", event => {
  if (event.key === "Escape") closeSpecimenCard();
});

// Fake controls have no TCPNoise provenance; label them explicitly instead of inventing it.
const spawnSpecimenWithoutInspection = spawnSpecimen;
spawnSpecimen = function spawnSpecimenWithInspection(specimenType, grassEventType = null, vigor = 0) {
  const specimen = spawnSpecimenWithoutInspection(specimenType, grassEventType, vigor);
  if (specimen && grassEventType !== null) {
    specimen.origin = { kind: "simulated", eventType: grassEventType };
  }
  return specimen;
};

// The core garden listener runs first and creates/replaces the specimen. This second listener
// attaches the extra provenance only to that fresh, still-unattributed specimen.
gardenEventSource.addEventListener("garden", message => {
  try {
    const event = JSON.parse(message.data);
    if (typeof event?.specimenType !== "string"
      || !Number.isInteger(event.listenPort) || event.listenPort < 1 || event.listenPort > 65535
      || !Number.isInteger(event.vigor) || event.vigor < 0 || event.vigor > 3) return;

    const now = Date.now();
    const specimen = [...gardenState.specimens].reverse().find(candidate =>
      candidate.origin === undefined
      && candidate.type === event.specimenType
      && (candidate.vigor ?? 0) === event.vigor
      && now - candidate.createdAt >= 0
      && now - candidate.createdAt < 2_000
    );
    if (!specimen) return;

    specimen.origin = {
      kind: "tcpnoise",
      sensor: typeof event.sensor === "string" && event.sensor.length > 0 ? event.sensor : null,
      listenPort: event.listenPort,
      seenCount: typeof event.seenCount === "string" && /^\d+$/.test(event.seenCount) ? event.seenCount : null
    };
  } catch {
    // Inspection metadata is optional; malformed frames must never affect the garden.
  }
});

// Keep age useful while open and close if the selected specimen expires or is displaced.
window.setInterval(() => {
  if (specimenCard.hidden || !inspectedSpecimen) return;
  if (!gardenState.specimens.includes(inspectedSpecimen)) {
    closeSpecimenCard();
    return;
  }
  specimenCardFields.age.textContent = formatSpecimenAge(Date.now() - inspectedSpecimen.createdAt);
}, 1_000);
