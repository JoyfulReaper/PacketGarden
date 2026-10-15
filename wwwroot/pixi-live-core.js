// Pixi presentation, dev controls and transport adapter for the shared logical garden.
(function () {
  'use strict';
  const garden = typeof module !== 'undefined' && module.exports ? require('./garden-core.js') : window.PacketGardenCore;
  const { dimensions, timings, species, normalizeGarden, stageAt } = garden;
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
  function normalizeWeather(event) {
    if (!event || !Object.hasOwn(weatherLevels, event.level) || typeof event.eventsPerMinute !== 'number' || !Number.isFinite(event.eventsPerMinute)) return null;
    return { level: event.level, eventsPerMinute: Math.min(1000000, Math.max(0, event.eventsPerMinute)) };
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
  function createModel(view, { now = Date.now, random = Math.random, onLive = () => {}, onRemoved = () => {} } = {}) {
    let paused = false;
    const counts = { acceptedLive: 0, droppedSaturated: 0, lifecycleRemovals: 0, replacements: 0, pausedEvents: 0 };
    const model = garden.createGardenModel({ now, random, onChange(change) {
      const { kind, specimen, reason } = change;
      if (kind === 'added') {
        specimen.colorVariant = colorVariant(specimen.type, specimen.vigor, random());
        view.add(specimen, model.byCell);
        if (reason === 'replaced') counts.replacements++;
      } else if (kind === 'updated') view.update(specimen, model.byCell);
      else if (kind === 'removed') { view.remove(specimen, model.byCell); onRemoved(specimen); if (reason === 'expired') counts.lifecycleRemovals++; }
      else if (kind === 'dropped') counts.droppedSaturated++;
    }});
    return { specimens: model.specimens, byCell: model.byCell, counts, tick: model.tick, clear: model.clear,
      accept(raw) {
        const event = normalizeGarden(raw); if (!event) return null;
        if (paused) { counts.pausedEvents++; return null; }
        const result = model.addEvent(event);
        if (!result) return null;
        counts.acceptedLive++; onLive(result.specimen); return result.specimen;
      },
      setPaused(value) { paused = value; },
      seed() {
        const at = now();
        model.seed(Array.from({ length: dimensions.capacity }, (_, cell) => {
          const type = species[cell % species.length], vigor = Math.floor(cell / species.length) % 4;
          const age = type === 'redbloom' ? cell % 8000 : timings[type].matureAfterMs + cell % 1000;
          return { type, vigor, column: cell % dimensions.columns, row: Math.floor(cell / dimensions.columns), createdAt: at - age,
            origin: { kind: 'simulated', listenPort: null, sensor: null, seenCount: null } };
        }), at);
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
