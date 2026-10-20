// Authoritative temporary visitors and loose drops. Rendering and collection UI stay in adapters.
(function () {
  'use strict';
  const core = typeof module !== 'undefined' && module.exports ? require('./garden-core.js') : window.PacketGardenCore;
  const { width, height, cellSize } = core.dimensions;
  const curiosityConfig = { maxActive: 3, lifetimeMs: 20_000, hitRadius: 9, placementPadding: 14 };
  const curiosityTypes = Object.freeze(['ladybug', 'snail', 'moth', 'shiny_pebble']);
  const dropConfig = { amanitaDropChance: .01, delayMs: 5_000, maxActiveDrops: 3,
    lifetimeMs: 20_000, hitRadius: 9, placementPadding: 14 };

  function curiosityPosition(curiosity, now = Date.now()) {
    const elapsed = Math.max(0, Math.min(now - curiosity.createdAt, curiosityConfig.lifetimeMs));
    let dx = 0, dy = 0;
    if (curiosity.type === 'ladybug') {
      dx = Math.sin(elapsed / 1800 + curiosity.phase) * 3;
      dy = Math.sin(elapsed / 2600 + curiosity.phase) * 2;
    } else if (curiosity.type === 'snail') dx = curiosity.direction * elapsed / curiosityConfig.lifetimeMs * 6;
    else if (curiosity.type === 'moth') {
      dx = Math.sin(elapsed / 900 + curiosity.phase) * 4;
      dy = Math.sin(elapsed / 600 + curiosity.phase) * 3;
    }
    return { x: curiosity.x + dx, y: curiosity.y + dy };
  }
  function looseDropPosition(drop, now = Date.now()) {
    return { x: drop.x, y: drop.y + Math.sin((now - drop.createdAt) / 1400 + drop.phase) * .6 };
  }
  function curiosityAppearance(item, now) {
    const age = now - item.createdAt;
    return { rotation: item.type === 'ladybug' ? Math.sin(age / 1800 + item.phase) * .2 : 0,
      flutter: .55 + (Math.sin(age / 90 + item.phase) + 1) * .225,
      glint: Math.max(0, (Math.sin(age / 1100 + item.phase) - .92) / .08) };
  }

  function createAmbientModel({ now = Date.now, random = Math.random, getSpecimens = () => [], onChange = () => {} } = {}) {
    let curiosities = [], drops = [], nextId = 0;
    const pendingDrops = new Map(), identities = new WeakMap();
    const counts = { curiositiesCreated: 0, curiositiesExpired: 0, dropsScheduled: 0,
      dropsActivated: 0, dropsCancelled: 0, dropsCapSkipped: 0, dropsExpired: 0 };
    function idFor(item) { if (!identities.has(item)) identities.set(item, ++nextId); return identities.get(item); }
    function notify(kind, item, reason) { onChange({ kind, item, id: idFor(item), reason }); }
    // The original seams require ordinary species lifetime; drops also check mutation expiry.
    // Use shared specimen timing/stage queries, retaining those exact source checks.
    function isSourceAlive(specimen, at, living = null, checkMutation = true) {
      return Boolean(core.timings[specimen?.type]
        && (living ? living.has(specimen) : getSpecimens().includes(specimen))
        && core.stageAt(specimen.type, specimen.createdAt, at) !== 'expired'
        && (!checkMutation || !specimen.mutation || at < specimen.mutation.expiresAt));
    }
    function removeCuriosity(item, reason = 'removed') {
      const index = curiosities.indexOf(item); if (index < 0) return false;
      curiosities.splice(index, 1); if (reason === 'expired') counts.curiositiesExpired++;
      notify('curiosity-removed', item, reason); return true;
    }
    function removeDrop(item, reason = 'removed') {
      const index = drops.indexOf(item); if (index < 0) return false;
      drops.splice(index, 1); if (reason === 'expired') counts.dropsExpired++;
      notify('drop-removed', item, reason); return true;
    }
    function expireCuriosities(at = now()) {
      let changed = false;
      for (let i = curiosities.length - 1; i >= 0; i--) if (at >= curiosities[i].expiresAt) {
        removeCuriosity(curiosities[i], 'expired'); changed = true;
      }
      return changed;
    }
    function createFirstSeenCuriosity(specimen, rng = random, at = now()) {
      // Explicit creation seam for Canvas and local tests; live eligibility is enforced below.
      if (!isSourceAlive(specimen, at, null, false)) return null;
      expireCuriosities(at);
      if (curiosities.length >= curiosityConfig.maxActive) return null;
      const type = curiosityTypes[Math.floor(rng() * curiosityTypes.length)];
      const origin = { x: (specimen.column + .5) * cellSize, y: (specimen.row + .5) * cellSize };
      const angle = rng() * Math.PI * 2, radius = 18 + rng() * 4;
      let dx = Math.cos(angle) * radius, dy = Math.sin(angle) * radius;
      const padding = curiosityConfig.placementPadding;
      if (origin.x + dx < padding || origin.x + dx > width - padding) dx = -dx;
      if (origin.y + dy < padding || origin.y + dy > height - padding) dy = -dy;
      const item = { type, createdAt: at, expiresAt: at + curiosityConfig.lifetimeMs, origin,
        x: origin.x + dx, y: origin.y + dy, phase: rng() * Math.PI * 2, direction: Math.cos(angle) < 0 ? -1 : 1 };
      curiosities.push(item); counts.curiositiesCreated++; notify('curiosity-added', item, 'created'); return item;
    }
    function cancelSource(specimen) {
      if (!pendingDrops.delete(specimen)) return false;
      counts.dropsCancelled++; return true;
    }
    function prunePendingDrops(at = now(), living = new Set(getSpecimens())) {
      for (const specimen of pendingDrops.keys()) if (!isSourceAlive(specimen, at, living)) cancelSource(specimen);
    }
    function scheduleLooseDrop(specimen, type, rng = random, at = now()) {
      if (type !== 'amanita_muscaria' || !isSourceAlive(specimen, at)) return false;
      prunePendingDrops(at);
      if (pendingDrops.has(specimen)) return false;
      const x = (specimen.column + .5) * cellSize, y = (specimen.row + .5) * cellSize;
      const angle = rng() * Math.PI * 2, radius = 18 + rng() * 4;
      let dx = Math.cos(angle) * radius, dy = Math.sin(angle) * radius;
      const padding = dropConfig.placementPadding;
      if (x + dx < padding || x + dx > width - padding) dx = -dx;
      if (y + dy < padding || y + dy > height - padding) dy = -dy;
      pendingDrops.set(specimen, { type, activateAt: at + dropConfig.delayMs,
        x: x + dx, y: y + dy, phase: rng() * Math.PI * 2 });
      counts.dropsScheduled++; return true;
    }
    function maybeScheduleAmanita(specimen, roll, rng = random, at = now()) {
      if (specimen?.type !== 'mushroom' || specimen.origin?.kind !== 'tcpnoise' || !isSourceAlive(specimen, at)) return false;
      roll ??= rng();
      if (!Number.isFinite(roll) || roll < 0 || roll >= dropConfig.amanitaDropChance) return false;
      return scheduleLooseDrop(specimen, 'amanita_muscaria', rng, at);
    }
    function acceptLiveSpecimen(specimen, at = now(), {
      scheduleAmanita = source => maybeScheduleAmanita(source, undefined, random, at),
      createCuriosity = source => createFirstSeenCuriosity(source, random, at)
    } = {}) {
      if (specimen?.origin?.kind !== 'tcpnoise' || !isSourceAlive(specimen, at, null, false)) return;
      // Keep the production order: mushroom drop roll/placement before curiosity type/placement.
      if (specimen.type === 'mushroom') scheduleAmanita(specimen);
      if (specimen.origin.seenCount === '1') createCuriosity(specimen);
    }
    function activateLooseDrop(specimen, at = now(), living = null, hidden = false) {
      const pending = pendingDrops.get(specimen);
      if (!pending || at < pending.activateAt || hidden) return null;
      pendingDrops.delete(specimen);
      if (!isSourceAlive(specimen, at, living)) { counts.dropsCancelled++; return null; }
      if (drops.length >= dropConfig.maxActiveDrops) { counts.dropsCapSkipped++; return null; }
      const item = { type: pending.type, createdAt: at, expiresAt: at + dropConfig.lifetimeMs,
        x: pending.x, y: pending.y, phase: pending.phase };
      drops.push(item); counts.dropsActivated++; notify('drop-added', item, 'activated'); return item;
    }
    function tickDrops(at = now(), { hidden = false, living = null } = {}) {
      let changed = false;
      for (let i = drops.length - 1; i >= 0; i--) if (at >= drops[i].expiresAt) {
        removeDrop(drops[i], 'expired'); changed = true;
      }
      if (pendingDrops.size) {
        living ??= new Set(getSpecimens()); prunePendingDrops(at, living);
        if (!hidden) for (const specimen of pendingDrops.keys()) if (activateLooseDrop(specimen, at, living)) changed = true;
      }
      return changed;
    }
    function clear() {
      for (const source of pendingDrops.keys()) cancelSource(source);
      while (curiosities.length) removeCuriosity(curiosities[curiosities.length - 1], 'cleared');
      while (drops.length) removeDrop(drops[drops.length - 1], 'cleared');
    }
    function seed({ curiosities: visitors = [], drops: dropEntries = [] }) {
      // Local dev import only. Clone known logical fields; never import network data.
      if (visitors.length > curiosityConfig.maxActive || dropEntries.length > dropConfig.maxActiveDrops) throw Error('Invalid ambient seed');
      const valid = (item, lifetime) => ['createdAt','expiresAt','x','y','phase'].every(key => Number.isFinite(item[key]))
        && item.x >= 9 && item.x <= width - 9 && item.y >= 9 && item.y <= height - 9
        && item.expiresAt - item.createdAt === lifetime;
      for (const item of visitors) if (!valid(item, curiosityConfig.lifetimeMs) || !curiosityTypes.includes(item.type)
        || !Number.isFinite(item.origin?.x) || !Number.isFinite(item.origin?.y) || ![-1,1].includes(item.direction)) throw Error('Invalid curiosity seed');
      for (const item of dropEntries) if (!valid(item, dropConfig.lifetimeMs) || item.type !== 'amanita_muscaria') throw Error('Invalid drop seed');
      clear();
      for (const { type, createdAt, expiresAt, origin, x, y, phase, direction } of visitors) {
        const item = { type, createdAt, expiresAt, origin: { x: origin.x, y: origin.y }, x, y, phase, direction };
        curiosities.push(item); counts.curiositiesCreated++; notify('curiosity-added', item, 'simulated');
      }
      for (const { type, createdAt, expiresAt, x, y, phase } of dropEntries) {
        const item = { type, createdAt, expiresAt, x, y, phase };
        drops.push(item); counts.dropsActivated++; notify('drop-added', item, 'simulated');
      }
    }
    return { get curiosities() { return curiosities; }, set curiosities(entries) { curiosities = entries; },
      get drops() { return drops; }, set drops(entries) { drops = entries; }, // legacy Canvas fixture access
      pendingDrops, counts, idFor, isSourceAlive, createFirstSeenCuriosity, acceptLiveSpecimen,
      expireCuriosities, removeCuriosity, removeDrop, cancelSource, prunePendingDrops,
      scheduleLooseDrop, maybeScheduleAmanita, activateLooseDrop, tickDrops, clear, seed,
      tick(at = now(), options) { const visitors = expireCuriosities(at); return tickDrops(at, options) || visitors; }
    };
  }
  const api = { curiosityConfig, curiosityTypes, dropConfig, curiosityPosition, curiosityAppearance, looseDropPosition, createAmbientModel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenAmbient = api;
})();
