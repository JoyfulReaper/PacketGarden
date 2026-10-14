// TEMPORARY PARITY CODE copied from production garden.js. Remove/consolidate during migration.
// Keep the production-equivalence tests when changing placement, saturation or lifecycle rules.
(function () {
  'use strict';
  const dimensions = Object.freeze({ width: 960, height: 600, cellSize: 30, columns: 32, rows: 20, capacity: 640 });
  const timings = Object.freeze({
    flower: { growingAfterMs: 15000, matureAfterMs: 45000, wiltingAfterMs: 180000, expiredAfterMs: 240000 },
    mushroom: { growingAfterMs: 12000, matureAfterMs: 40000, decayingAfterMs: 240000, expiredAfterMs: 300000 },
    broadleaf: { growingAfterMs: 20000, matureAfterMs: 60000, fadingAfterMs: 300000, expiredAfterMs: 360000 },
    vine: { growingAfterMs: 20000, matureAfterMs: 60000, dryingAfterMs: 480000, expiredAfterMs: 600000 },
    wirefern: { growingAfterMs: 18000, matureAfterMs: 50000, fadingAfterMs: 300000, expiredAfterMs: 360000 },
    redbloom: { wiltingAfterMs: 10000, expiredAfterMs: 30000 },
    weed: { growingAfterMs: 20000, matureAfterMs: 60000, fadingAfterMs: 300000, expiredAfterMs: 360000 },
    ghostbloom: { growingAfterMs: 15000, matureAfterMs: 45000, fadingAfterMs: 300000, expiredAfterMs: 360000 },
    crystalfungus: { growingAfterMs: 12000, matureAfterMs: 40000, fadingAfterMs: 360000, expiredAfterMs: 420000 },
    blackthorn: { growingAfterMs: 20000, matureAfterMs: 60000, fadingAfterMs: 600000, expiredAfterMs: 720000 }
  });
  const species = Object.keys(timings), protectedTypes = new Set(['ghostbloom', 'crystalfungus', 'blackthorn']);
  const weatherLevels = Object.freeze({
    quiet: { count: 0, speed: 0, darkening: 0, length: 0, opacity: 0, drift: 0, slant: 2 },
    drizzle: { count: 16, speed: 120, darkening: .04, length: 5, opacity: .18, drift: 0, slant: 2 },
    rain: { count: 48, speed: 260, darkening: .09, length: 8, opacity: .35, drift: 0, slant: 2 },
    heavy_rain: { count: 150, speed: 520, darkening: .18, length: 14, opacity: .48, drift: 60, slant: 5 },
    botnet_thunderstorm: { count: 260, speed: 700, darkening: .26, length: 18, opacity: .56, drift: 150, slant: 11 },
    botnet_hurricane: { count: 400, speed: 900, darkening: .34, length: 23, opacity: .62, drift: 360, slant: 25 }
  });
  // Production hue names/weighted vine concept, approximated with finite atlas tints.
  const palettes = {
    flower: [0xfff1cf, 0xffbed2, 0xaddbff, 0xffcd62, 0xd6ffff],
    mushroom: [0xffffff, 0xca9aff, 0x92ebcc, 0xffdc79, 0xb8ffff],
    broadleaf: [0xc99ddb, 0x9de3d0, 0xf2c27d, 0xeaa7c0, 0xe6b5ff],
    vine: [0x96ffec, 0xc6ff82, 0xffffff, 0xb4c58d, 0xe8ffff],
    wirefern: [0xbbffcc, 0x9bb89f, 0xb4ffff, 0xffca76, 0xe0ffee],
    redbloom: [0xffffff, 0xffb09e, 0xff9ee1, 0xffbf78, 0xffdd83],
    weed: [0xffffff, 0xdbff88, 0xffb884, 0xa0e4c1, 0xebff7d],
    ghostbloom: [0xffffff, 0xe9c7ff, 0xbdfce0, 0xffcddb, 0xf4ffff],
    crystalfungus: [0x9feaff, 0x92ffb9, 0xffb5d6, 0xffe285, 0xe9d0ff],
    blackthorn: [0xc7a8e2, 0xe099bc, 0x99b0e2, 0xb0d5af, 0xf6d487]
  };
  function normalizeGarden(event) {
    if (!event || !species.includes(event.specimenType) || !Number.isInteger(event.listenPort)
      || event.listenPort < 1 || event.listenPort > 65535 || !Number.isInteger(event.vigor) || event.vigor < 0 || event.vigor > 3) return null;
    return { specimenType: event.specimenType, listenPort: event.listenPort, vigor: event.vigor,
      sensor: typeof event.sensor === 'string' && event.sensor.length > 0 ? event.sensor.slice(0, 128) : null,
      seenCount: typeof event.seenCount === 'string' && /^\d+$/.test(event.seenCount) ? event.seenCount : null };
  }
  function normalizeWeather(event) {
    if (!event || !Object.hasOwn(weatherLevels, event.level) || typeof event.eventsPerMinute !== 'number' || !Number.isFinite(event.eventsPerMinute)) return null;
    return { level: event.level, eventsPerMinute: Math.min(1000000, Math.max(0, event.eventsPerMinute)) };
  }
  function stageAt(type, createdAt, now) {
    const t = timings[type], age = Math.max(0, now - createdAt);
    if (age >= t.expiredAfterMs) return 'expired';
    if (type === 'redbloom') return age < t.wiltingAfterMs ? 'mature' : 'fading';
    if (age < t.growingAfterMs) return 'sprout';
    if (age < t.matureAfterMs) return 'growing';
    return age < (t.wiltingAfterMs ?? t.decayingAfterMs ?? t.fadingAfterMs ?? t.dryingAfterMs) ? 'mature' : 'fading';
  }
  function colorVariant(type, vigor, roll) {
    if (roll < .01) return 4; // cosmetic only, never alters species or backend rarity
    if (type !== 'vine') return vigor;
    const commonRoll = (roll - .01) / .99;
    return commonRoll < .70 ? 0 : commonRoll < .85 ? 1 : commonRoll < .95 ? 2 : 3;
  }
  function weatherSettings(state) {
    const base = weatherLevels[state.level], intensity = Math.min(1, Math.log1p(state.eventsPerMinute) / Math.log1p(10000));
    return { count: state.eventsPerMinute > 0 ? Math.round(base.count * (.25 + .75 * intensity)) : 0,
      speed: base.speed * (.6 + .4 * intensity), drift: base.drift,
      opacity: base.opacity, length: base.length, slant: base.slant,
      darkening: intensity === 0 ? 0 : base.darkening * (.5 + .5 * intensity) };
  }
  function createModel(view, { now = Date.now, random = Math.random } = {}) {
    const specimens = [], byCell = new Map(); let nextId = 0, paused = false;
    const counts = { acceptedLive: 0, droppedSaturated: 0, lifecycleRemovals: 0, replacements: 0, pausedEvents: 0 };
    const removeAt = (index, expired = false) => {
      const [specimen] = specimens.splice(index, 1); byCell.delete(specimen.cell); view.remove(specimen, byCell);
      if (expired) counts.lifecycleRemovals++;
    };
    function tick(at = now()) {
      for (let i = specimens.length - 1; i >= 0; i--) {
        const specimen = specimens[i], stage = stageAt(specimen.type, specimen.createdAt, at);
        if (stage === 'expired') removeAt(i, true);
        else if (stage !== specimen.stage) { specimen.stage = stage; view.update(specimen, byCell); }
      }
    }
    function spawn(event, simulated = false, at = now()) {
      tick(at); // Production expires naturally before attempting full-grid competition.
      const empty = [];
      for (let cell = 0; cell < 640; cell++) if (!byCell.has(cell)) empty.push(cell);
      let victim = null, cell;
      if (!empty.length) {
        for (let i = 0; i < specimens.length; i++) {
          const candidate = specimens[i];
          if (protectedTypes.has(candidate.type) || candidate.vigor >= event.vigor) continue;
          if (victim === null || candidate.vigor < specimens[victim].vigor
            || (candidate.vigor === specimens[victim].vigor && candidate.createdAt < specimens[victim].createdAt)) victim = i;
        }
        if (victim === null) { if (!simulated) counts.droppedSaturated++; return null; }
        cell = specimens[victim].cell;
      } else {
        const adjacent = [], nearby = [], same = specimens.filter(p => p.type === event.specimenType);
        for (const candidate of empty) {
          const column = candidate % 32, row = Math.floor(candidate / 32); let distance = Infinity;
          for (const specimen of same) distance = Math.min(distance, Math.max(Math.abs(column - specimen.column), Math.abs(row - specimen.row)));
          if (distance === 1) adjacent.push(candidate); else if (distance === 2) nearby.push(candidate);
        }
        const preferAdjacent = random() < .9, preferred = preferAdjacent ? adjacent : nearby, alternate = preferAdjacent ? nearby : adjacent;
        const candidates = preferred.length ? preferred : alternate.length ? alternate : empty;
        cell = candidates[Math.floor(random() * candidates.length)];
      }
      const specimen = { id: ++nextId, type: event.specimenType, vigor: event.vigor, cell,
        column: cell % 32, row: Math.floor(cell / 32), createdAt: at, stage: stageAt(event.specimenType, at, at),
        colorVariant: colorVariant(event.specimenType, event.vigor, random()),
        origin: { kind: simulated ? 'simulated' : 'live', listenPort: event.listenPort, sensor: event.sensor, seenCount: event.seenCount } };
      if (victim === null) specimens.push(specimen);
      else { const old = specimens[victim]; byCell.delete(old.cell); view.remove(old, byCell); specimens[victim] = specimen; counts.replacements++; }
      byCell.set(cell, specimen); view.add(specimen, byCell); return specimen;
    }
    return { specimens, byCell, counts, tick,
      accept(raw) { const event = normalizeGarden(raw); if (!event) return null;
        if (paused) { counts.pausedEvents++; return null; }
        const specimen = spawn(event); if (specimen) counts.acceptedLive++; return specimen; },
      setPaused(value) { paused = value; },
      clear() { for (let i = specimens.length - 1; i >= 0; i--) removeAt(i); },
      seed() {
        this.clear();
        // A seeded dense test scene uses real timing rules, with age offsets for lifecycle churn.
        for (let cell = 0; cell < 640; cell++) {
          const type = species[cell % species.length], vigor = Math.floor(cell / species.length) % 4;
          const at = now(), age = type === 'redbloom' ? cell % 8000 : timings[type].matureAfterMs + cell % 1000;
          const specimen = { id: ++nextId, type, vigor, cell, column: cell % 32, row: Math.floor(cell / 32), createdAt: at - age,
            stage: stageAt(type, at - age, at), colorVariant: colorVariant(type, vigor, random()),
            origin: { kind: 'simulated', listenPort: null, sensor: null, seenCount: null } };
          specimens.push(specimen); byCell.set(cell, specimen); view.add(specimen, byCell);
        }
      }
    };
  }
  function connectStream(Source, model, onWeather, onStatus) {
    const stream = new Source('/api/garden/events');
    stream.onopen = () => onStatus('connected'); stream.onerror = () => onStatus('disconnected/reconnecting');
    stream.addEventListener('garden', message => { try { model.accept(JSON.parse(message.data)); } catch { /* malformed frames never stop the stream */ } });
    stream.addEventListener('weather', message => { try { const state = normalizeWeather(JSON.parse(message.data)); if (state) onWeather(state); } catch { /* preserve last good weather */ } });
    return stream;
  }
  const api = { dimensions, timings, species, palettes, stageAt, normalizeGarden, normalizeWeather, colorVariant, weatherLevels, weatherSettings, createModel, connectStream };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenPixiLiveCore = api;
})();
