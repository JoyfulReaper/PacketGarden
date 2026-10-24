// Browser-local, event-driven presentation. No device/context is needed while off.
function createGardenSound({ window, toggle = null, volumeControl = null }) {
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
  // Wirefern keeps the existing vine-family pluck rather than new synthesis.
  sounds.set("wirefern", sounds.get("vine"));
  const ordinaryCooldownMs = 400;
  const rareCooldownMs = 900;
  // Keep species timbres/envelopes; output gain supplies usable full-volume range.
  const ordinaryPeak = 0.38;
  const rarePeak = 0.26;
  const overtonePeak = 0.07;
  let audio = null;
  let master = null;
  let thunderBuffer = null;
  let enabled = false;
  let unavailable = false;
  let volume = Number(volumeControl?.value ?? 12) / 100;
  let activation = 0;
  let lastOrdinaryAt = -Infinity;
  let lastRareAt = -Infinity;
  let thunder = null;
  let arrival = null;

  function stopThunder() { thunder?.cancel(); }

  function updateToggle(unavailable = false) {
    if (!toggle) return;
    toggle.textContent = unavailable ? "Sound unavailable" : enabled ? "Sound: On" : "Sound: Off";
    toggle.setAttribute("aria-pressed", String(enabled));
  }

  function applyVolume() {
    // +6dB at full volume, with a gentle curve retaining useful quiet settings.
    if (master) master.gain.setValueAtTime(enabled ? 2 * volume ** 1.25 : 0, audio.currentTime);
  }

  function reportUnavailable() {
    stopThunder();
    arrival?.cancel();
    enabled = false;
    unavailable = true;
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
      // One shared compressor controls overlapping peaks after the volume gain.
      const compressor = audio.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-6,audio.currentTime);
      compressor.knee.setValueAtTime(6,audio.currentTime);
      compressor.ratio.setValueAtTime(12,audio.currentTime);
      compressor.attack.setValueAtTime(.003,audio.currentTime);
      compressor.release.setValueAtTime(.18,audio.currentTime);
      // Leave output headroom for the compressor's makeup gain / attack transient.
      const output=audio.createGain();output.gain.setValueAtTime(.75,audio.currentTime);
      gain.connect(compressor);compressor.connect(output);output.connect(audio.destination);
      master = gain;
    }
    if (audio.state !== "running") await audio.resume();
  }

  async function setSoundEnabled(value) {
    enabled = Boolean(value);
    unavailable = false;
    if (!enabled) { stopThunder(); arrival?.cancel(); }
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
    if (volume === 0) { stopThunder(); arrival?.cancel(); }
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
    // Preview and incident dispatch share this gate. Neither can initialize or
    // resume a context, and hidden pages never schedule a gnome cue.
    if (!enabled) return unavailable ? 'unavailable' : 'disabled';
    if (window.document?.hidden) return 'hidden';
    if (volume === 0) return 'muted';
    if (!audio || audio.state === 'closed') return 'unavailable';
    if (audio?.state !== 'running') return 'suspended';
    if (stage === 'arrival') return playGnomeArrival();
    if (stage !== "battle" && stage !== "victory") return 'ignored';
    try {
      // A couple of tiny cues, substantially below the tuned growth envelopes.
      const notes = stage === "battle" ? [880] : [523, 659, 784];
      notes.forEach((frequency, index) =>
        playTone(frequency, "sine", 0.12, audio.currentTime + index * 0.07, 0.045));
      return 'played';
    } catch { reportUnavailable(); return 'unavailable'; }
  }

  function playGnomeArrival() {
    if (arrival) return 'busy'; // A second diagnostic start cannot pile up scheduled voices.
    const nodes=[];
    const release=node=>{
      if(node.done)return;node.done=true;
      for(const resource of [node.oscillator,node.filter,node.envelope])try{resource?.disconnect();}catch{/* Device may be gone. */}
      if(nodes.every(item=>item.done)&&arrival===sequence)arrival=null;
    };
    const sequence={cancel(){
      for(const node of nodes){
        if(node.done)continue;
        try{if(node.started)node.oscillator.stop(audio.currentTime);}catch{/* Device may be gone. */}
        release(node);
      }
      if(arrival===sequence)arrival=null;
    }};
    arrival=sequence;
    try {
      const start=audio.currentTime;
      // Keep the fundamental audible. The former bandpass removed its body;
      // a modest formant peak brings out nasal harmonics without cutting it.
      // A held vowel and softer buzzing tail make a musical "gnooo-mz", not speech.
      for(let index=0;index<2;index++) {
        const node={done:false,started:false};nodes.push(node);
        node.oscillator=audio.createOscillator();node.filter=audio.createBiquadFilter();node.envelope=audio.createGain();
        const at=start+(index?.30:0),duration=index?.24:.40;
        node.oscillator.type=index?'sawtooth':'triangle';
        node.oscillator.frequency.setValueAtTime(index?164:196,at);
        if(!index) {
          node.oscillator.frequency.exponentialRampToValueAtTime(246,at+.055);
          node.oscillator.frequency.exponentialRampToValueAtTime(210,at+.14);
        }
        node.oscillator.frequency.exponentialRampToValueAtTime(index?108:164,at+duration);
        node.filter.type=index?'lowpass':'peaking';node.filter.Q.setValueAtTime(index?.65:1.3,at);
        node.filter.frequency.setValueAtTime(index?950:710,at);
        node.filter.frequency.exponentialRampToValueAtTime(index?390:500,at+duration);
        if(!index)node.filter.gain.setValueAtTime(9,at);
        node.envelope.gain.setValueAtTime(0,at);
        node.envelope.gain.linearRampToValueAtTime(index?.045:.13,at+.012);
        node.envelope.gain.linearRampToValueAtTime(index?.035:.115,at+(index?.10:.12));
        node.envelope.gain.linearRampToValueAtTime(index?.018:.075,at+(index?.17:.26));
        node.envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
        node.oscillator.connect(node.filter);node.filter.connect(node.envelope);node.envelope.connect(master);
        node.oscillator.onended=()=>release(node);
        node.oscillator.start(at);node.started=true;node.oscillator.stop(at+duration+.01);
      }
      return 'played';
    } catch { sequence.cancel();reportUnavailable(); return 'unavailable'; }
  }

  function maybePlayCollectionSound() {
    if (!enabled || volume === 0 || audio?.state !== "running") return;
    try {
      playTone(392, "triangle", 0.08, audio.currentTime, 0.045);
    } catch { reportUnavailable(); }
  }

  function maybePlayThunderSound(level) {
    if (!enabled || volume === 0 || audio?.state !== "running" || thunder ||
        (level !== "botnet_thunderstorm" && level !== "botnet_hurricane")) return null;
    const nodes = [], filters = [], hurricane = level === "botnet_hurricane", duration = hurricane ? 2 : 1.8;
    const disconnectFilters = () => { for(const filter of filters)try{filter.disconnect();}catch{/* Device may be gone. */} };
    const release = node => {
      if (node.done) return;
      node.done = true;
      try { node.oscillator.disconnect();node.envelope.disconnect(); } catch { /* Device may be gone. */ }
      if (nodes.every(item => item.done)) { disconnectFilters();if(thunder===sequence)thunder=null; }
    };
    const sequence = { cancel() {
      for (const node of nodes) {
        if (node.done) continue;
        try { if (node.started) node.oscillator.stop(audio.currentTime); } catch { /* Device may be gone. */ }
        release(node);
      }
      disconnectFilters();
      if (thunder === sequence) thunder = null;
    }};
    thunder = sequence;
    try {
      // One finite cached noise buffer adds audible midrange on small speakers.
      // Local deterministic noise never draws from the garden's random stream.
      if(!thunderBuffer) {
        thunderBuffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*2.1),audio.sampleRate);
        const data=thunderBuffer.getChannelData(0);let seed=0x7a39bc12;
        for(let i=0;i<data.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed>>>0)/2147483648-1;}
      }
      const start=audio.currentTime;
      for(let index=0;index<2;index++) {
        const node = { oscillator:index===0?audio.createBufferSource():audio.createOscillator(), envelope:null, started:false, done:false };
        nodes.push(node);
        node.envelope=audio.createGain();
        if(index===0) {
          node.oscillator.buffer=thunderBuffer;
          const filter=audio.createBiquadFilter();filters.push(filter);filter.type='lowpass';
          filter.Q.setValueAtTime(.7,start);
          filter.frequency.setValueAtTime(hurricane?850:1200,start);
          filter.frequency.exponentialRampToValueAtTime(hurricane?260:380,start+duration);
          node.oscillator.connect(filter);filter.connect(node.envelope);
        } else {
          node.oscillator.type='triangle';const frequency=hurricane?72:96;
          node.oscillator.frequency.setValueAtTime(frequency,start);
          node.oscillator.frequency.exponentialRampToValueAtTime(frequency*.65,start+duration);
          node.oscillator.connect(node.envelope);
        }
        node.envelope.gain.setValueAtTime(0,start);
        node.envelope.gain.linearRampToValueAtTime(index===0?.95:.16,start+.035);
        node.envelope.gain.exponentialRampToValueAtTime(index===0?.25:.07,start+.38);
        node.envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
        node.envelope.connect(master);
        node.oscillator.onended = () => release(node);
        node.oscillator.start(start);node.started=true;node.oscillator.stop(start+duration+.01);
      }
      return () => sequence.cancel();
    } catch { sequence.cancel();reportUnavailable();return null; }
  }

  toggle?.addEventListener("click", () => setSoundEnabled(!enabled));
  volumeControl?.addEventListener("input", () => setSoundVolume(volumeControl.value));
  updateToggle();
  return { maybePlayGrowthSound, maybePlayGnomeSound, maybePlayCollectionSound, maybePlayThunderSound,
    cancelGnomeArrival() { arrival?.cancel(); } };
}

// Both page types bind the same controls to one local controller. Context creation
// stays inside the explicit enable handler, never inside growth or rendering.
window.PacketGardenAudio = { create: createGardenSound };
const gardenSound = createGardenSound({ window, toggle: document.querySelector("#sound-toggle"),
  volumeControl: document.querySelector("#sound-volume") });
