// Pointless garden drama, independent of rendering, network input and ecology.
(function () {
  'use strict';
  const garden = typeof module !== 'undefined' && module.exports ? require('./garden-core.js') : window.PacketGardenCore;
  const config = Object.freeze({ checkEveryMs:45000, minimumSpecimens:30, incidentChance:.02,
    battleAfterMs:3000, resultAfterMs:7000, losersGoneAfterMs:9000, finishedAfterMs:12000 });
  function createModel({ getSpecimens, now = Date.now, random = Math.random, onChange = () => {}, onCue = () => {} }) {
    let actors = [], incident = null, nextCheckAt = now() + config.checkEveryMs;
    const changed = () => onChange({ actors, incident });
    const livingCount = at => getSpecimens().filter(p => at - p.createdAt < garden.timings[p.type].expiredAfterMs).length;
    function start(at = now(), roll = random) {
      if (incident || livingCount(at) < config.minimumSpecimens) return false;
      const centerX = garden.dimensions.width * (.4 + roll() * .2);
      const centerY = garden.dimensions.height * (.35 + roll() * .3);
      incident = { type:'gnome_incident', createdAt:at, phase:'approach', winner:null };
      for (const side of ['green','red']) {
        const direction = side === 'green' ? -1 : 1;
        for (const offset of [-12,12]) {
          const startX = centerX + direction * 180, startY = centerY + direction * 40 + offset;
          actors.push({ type:'gnome', side, startX, startY, x:startX, y:startY,
            targetX:centerX + direction * 14, targetY:centerY + offset, state:'approach', createdAt:at });
        }
      }
      changed(); return true;
    }
    function clear() { actors = []; incident = null; changed(); }
    function advance(at = now(), roll = random) {
      if (!incident) return;
      const age = Math.max(0, at - incident.createdAt);
      // Completion precedes phase/audio handling, including a suspended page.
      if (age >= config.finishedAfterMs) { clear(); return; }
      const phase = age < config.battleAfterMs ? 'approach' : age < config.resultAfterMs ? 'battle' : 'result';
      if (phase === 'battle' && incident.phase !== 'battle') onCue('battle');
      if (phase === 'result' && incident.winner === null) {
        incident.winner = roll() < .5 ? 'green' : 'red'; onCue('victory');
      }
      incident.phase = phase;
      if (age >= config.losersGoneAfterMs && actors.length === 4) {
        actors = actors.filter(actor => actor.side === incident.winner); changed();
      }
      for (const actor of actors) {
        if (phase === 'approach') {
          const progress = age / config.battleAfterMs;
          actor.x = actor.startX + (actor.targetX - actor.startX) * progress;
          actor.y = actor.startY + (actor.targetY - actor.startY) * progress;
          actor.state = 'approach';
        } else {
          actor.x = actor.targetX; actor.y = actor.targetY;
          actor.state = phase === 'battle' ? 'battle' : actor.side === incident.winner ? 'celebrate' : 'flee';
          if (actor.state === 'flee') {
            const progress = (age - config.resultAfterMs) / (config.losersGoneAfterMs - config.resultAfterMs);
            actor.x += (actor.startX - actor.targetX) * progress;
            actor.y += (actor.startY - actor.targetY) * progress;
          }
        }
      }
    }
    function resetCadence(at = now()) { nextCheckAt = at + config.checkEveryMs; }
    function tick(at = now(), roll = random, hidden = false) {
      if (hidden) { resetCadence(at); return; }
      if (incident) { advance(at, roll); return; }
      if (at < nextCheckAt) return;
      resetCadence(at); // One fresh check, never replay missed intervals.
      if (livingCount(at) >= config.minimumSpecimens && roll() < config.incidentChance) start(at, roll);
    }
    return { start, advance, tick, clear, resetCadence, livingCount,
      get actors() { return actors; }, get incident() { return incident; }, get nextCheckAt() { return nextCheckAt; } };
  }
  function appearance(actor, at) {
    const step = Math.sin((at - actor.createdAt) / 90), battle = actor.state === 'battle';
    return { step, battle, bounce:actor.state === 'celebrate' ? -Math.abs(step) * 4 : 0,
      shove:battle ? step * (actor.side === 'green' ? 2 : -2) : 0, rotation:battle ? step * .12 : 0,
      alpha:actor.state === 'flee' ? Math.max(0,1-(at-actor.createdAt-config.resultAfterMs)/(config.losersGoneAfterMs-config.resultAfterMs)) : 1 };
  }
  const api = { config, createModel, appearance };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenGnomes = api;
})();
