// Browser-local, event-driven presentation. No device/context is needed while off.
const gardenSound = (() => {
  const toggle = document.querySelector("#sound-toggle");
  const volumeControl = document.querySelector("#sound-volume");
  const sounds = new Map([
    ["flower", { frequency: 660, wave: "sine", duration: 0.14 }],
    ["mushroom", { frequency: 180, wave: "triangle", duration: 0.12 }],
    ["broadleaf", { frequency: 262, wave: "triangle", duration: 0.2 }],
    ["vine", { frequency: 220, wave: "triangle", duration: 0.16, overtone: 3 }],
    ["redbloom", { frequency: 440, wave: "sine", duration: 0.12, overtone: 2 }],
    ["weed", { frequency: 146, wave: "triangle", duration: 0.1, overtone: 1.07 }],
    ["ghostbloom", { frequency: 784, wave: "sine", duration: 0.38, notes: [1, 1.25, 1.5] }],
    ["crystalfungus", { frequency: 1046, wave: "sine", duration: 0.22, notes: [1, 1.5, 2] }],
    ["blackthorn", { frequency: 196, wave: "triangle", duration: 0.24, notes: [1, 1.5, 2], overtone: 2 }]
  ]);
  const ordinaryCooldownMs = 400;
  const rareCooldownMs = 900;
  // Oscillator envelopes need substantially more headroom than the original
  // prototype. Keep the master slider linear while making 100% genuinely audible.
  const ordinaryPeak = 0.38;
  const rarePeak = 0.26;
  const overtonePeak = 0.07;
  let audio = null;
  let master = null;
  let enabled = false;
  let volume = Number(volumeControl.value) / 100;
  let activation = 0;
  let lastOrdinaryAt = -Infinity;
  let lastRareAt = -Infinity;

  function updateToggle(unavailable = false) {
    toggle.textContent = unavailable ? "Sound unavailable" : enabled ? "Sound: On" : "Sound: Off";
    toggle.setAttribute("aria-pressed", String(enabled));
  }

  function applyVolume() {
    if (master) master.gain.setValueAtTime(enabled ? volume : 0, audio.currentTime);
  }

  function reportUnavailable() {
    enabled = false;
    activation++;
    try { applyVolume(); } catch { /* Device may have become unavailable. */ }
    updateToggle(true);
  }

  async function ensureAudio() {
    if (!audio) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) throw new Error("Web Audio unavailable");
      audio = new AudioContext();
    }
    if (!master) {
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0, audio.currentTime);
      gain.connect(audio.destination);
      master = gain;
    }
    if (audio.state !== "running") await audio.resume();
  }

  async function setSoundEnabled(value) {
    enabled = Boolean(value);
    const request = ++activation;
    updateToggle();
    try {
      // Called only by the explicit enable gesture; growth never initializes audio.
      if (enabled) await ensureAudio();
      if (request === activation) applyVolume();
    } catch {
      if (request === activation) reportUnavailable();
    }
  }

  function setSoundVolume(value) {
    const numeric = Number(value);
    volume = Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) / 100 : 0;
    try { applyVolume(); } catch { reportUnavailable(); }
  }

  function playTone(frequency, wave, duration, start, peak) {
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(peak, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  function maybePlayGrowthSound(type, now, pitchRoll) {
    const sound = sounds.get(type);
    if (!enabled || volume === 0 || !sound || audio?.state !== "running") return;
    now ??= performance.now();
    const rare = Boolean(sound.notes);
    if (now - (rare ? lastRareAt : lastOrdinaryAt) < (rare ? rareCooldownMs : ordinaryCooldownMs)) return;
    // At most ±2% pitch variation; one shared variation per composed event.
    pitchRoll ??= Math.random();
    const pitch = 0.98 + Math.min(1, Math.max(0, Number.isFinite(pitchRoll) ? pitchRoll : 0.5)) * 0.04;
    try {
      const notes = sound.notes ?? [1];
      notes.forEach((ratio, index) => {
        const start = audio.currentTime + index * 0.1;
        const frequency = sound.frequency * ratio * pitch;
        playTone(frequency, sound.wave, sound.duration, start, rare ? rarePeak : ordinaryPeak);
        if (sound.overtone) playTone(frequency * sound.overtone, sound.wave, sound.duration * 0.75, start, overtonePeak);
      });
      // Rare chords can break through ordinary traffic, then leave a little space.
      lastOrdinaryAt = now;
      if (rare) lastRareAt = now;
    } catch { reportUnavailable(); }
  }

  function maybePlayGnomeSound(stage) {
    if (!enabled || volume === 0 || audio?.state !== "running") return;
    if (stage !== "battle" && stage !== "victory") return;
    try {
      // A couple of tiny cues, substantially below the tuned growth envelopes.
      const notes = stage === "battle" ? [880] : [523, 659, 784];
      notes.forEach((frequency, index) =>
        playTone(frequency, "sine", 0.12, audio.currentTime + index * 0.07, 0.045));
    } catch { reportUnavailable(); }
  }

  toggle.addEventListener("click", () => setSoundEnabled(!enabled));
  volumeControl.addEventListener("input", () => setSoundVolume(volumeControl.value));
  updateToggle();
  return { maybePlayGrowthSound, maybePlayGnomeSound };
})();
