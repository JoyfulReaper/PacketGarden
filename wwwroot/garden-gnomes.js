// Renderer-neutral ambient gnomes. Only landscaping changes the authoritative garden.
(function () {
  'use strict';
  const garden = typeof module !== 'undefined' && module.exports ? require('./garden-core.js') : window.PacketGardenCore;
  const config = Object.freeze({ checkEveryMs:45000, minimumSpecimens:30, incidentChance:.02,
    battleAfterMs:3000, resultAfterMs:7000, losersGoneAfterMs:9000, finishedAfterMs:12000 });
  const landscapingConfig = Object.freeze({ minimumVines:20, minimumShare:.4, incidentChance:.1,
    cooldownMs:420000, trimShare:.25, maxTargets:8, travelMs:750, snipMs:500, exitMs:750, maxTickGapMs:1500 });
  const overcrowdingConfig = Object.freeze({ incidentChance:.25, freeCells:32, maxRemovals:32,
    maxTargets:64, maxDurationMs:45000 });
  const harvestConfig = Object.freeze({ minimumWeeds:3, incidentChance:.05, maxTargets:3 });
  const reactionMs = 600, presentations = new WeakMap();
  // Canvas uses palette names (and a separate broadleaf field); Pixi uses index 4.
  const rareColors = new Set(['moonflower','bioluminescent','silvervine','afterglow','solar','toxic','rainbow']);
  const ordinarySpecimen = (p, at) => garden.species.includes(p.type) && !garden.isProtected(p.type)
    && !p.mutation && !p.pendingMutation && !rareColors.has(p.colorVariant) && p.colorVariant !== 4
    && !(p.type === 'broadleaf' && p.broadleafVariant === 'rainbow')
    && at >= p.createdAt && garden.lifecycleStage(p, at) !== 'expired';
  function createModel({ getSpecimens, garden: source, now = Date.now, random = Math.random,
    getPuddles = () => [], puddleRandom,
    getReducedMotion = () => false, hasPendingBud = () => false, onUnderpantsAttempt = () => {},
    onChange = () => {}, onCue = () => {} }) {
    let actors = [], incident = null, nextCheckAt = now() + config.checkEveryMs;
    let lastLandscapingAt = -Infinity, suspended = false;
    const puddles = (typeof module !== 'undefined' && module.exports ? require('./garden-gnome-puddles.js') : window.PacketGardenGnomePuddles)
      .createModel({getPuddles,random:puddleRandom});
    const eligibleTarget = (p, at, mode) => ordinarySpecimen(p, at) && (mode === 'overcrowding'
      || mode === 'vine' && p.type === 'vine'
      || mode === 'weed_harvest' && p.type === 'weed' && garden.lifecycleStage(p,at) === 'mature' && !hasPendingBud(p));
    const changed = () => {puddles.prune(actors);onChange({ actors, incident });};
    const livingCount = at => getSpecimens().filter(p => at >= p.createdAt && garden.lifecycleStage(p, at) !== 'expired').length;
    const occupiedBy = p => source?.byCell.get(p.cell) === p;
    const freeCells = () => garden.dimensions.capacity - (source?.byCell.size ?? 0);
    function landscapingCandidates(at = now(), mode = 'vine') {
      return getSpecimens().filter(p => eligibleTarget(p, at, mode) && occupiedBy(p));
    }
    function landscapingEligible(at = now(), candidates = null, mode = 'vine') {
      candidates ??= landscapingCandidates(at, mode);
      if (mode === 'overcrowding') return Boolean(source) && freeCells() === 0 && candidates.length > 0;
      if (mode === 'weed_harvest') return Boolean(source) && candidates.length >= harvestConfig.minimumWeeds;
      if (mode !== 'vine') return false;
      return Boolean(source) && candidates.length >= landscapingConfig.minimumVines
        && candidates.length >= livingCount(at) * landscapingConfig.minimumShare;
    }
    const point = target => ({ x:(target.column + .5) * garden.dimensions.cellSize - 10,
      y:(target.row + .5) * garden.dimensions.cellSize + 6 });
    function aim(at) {
      const worker = actors[0], destination = point(incident.targets[incident.index]);
      worker.startX = worker.x; worker.startY = worker.y;
      worker.targetX = destination.x; worker.targetY = destination.y;
      worker.state = 'approach'; incident.stepAt = at; incident.snipped = false; incident.phase = 'approach';
    }
    function startLandscaping(at = now(), roll = random, mode = 'vine') {
      if (incident || at < lastLandscapingAt + landscapingConfig.cooldownMs) return false;
      const candidates = landscapingCandidates(at, mode);
      if (!landscapingEligible(at, candidates, mode)) return false;
      const targets = [];
      if (mode === 'overcrowding') {
        // Bounded random sample without replacement. Never chase newly arriving plants.
        const count = Math.min(candidates.length, overcrowdingConfig.maxTargets);
        while (targets.length < count) targets.push(candidates.splice(Math.floor(roll()*candidates.length),1)[0]);
      } else {
        const count = mode === 'weed_harvest' ? 1 + Math.floor(roll()*harvestConfig.maxTargets)
          : Math.min(landscapingConfig.maxTargets, Math.round(candidates.length * landscapingConfig.trimShare));
        // Vine control retains its short nearest-neighbor route.
        targets.push(candidates.splice(Math.floor(roll() * candidates.length), 1)[0]);
        while (targets.length < count) {
          const previous = targets.at(-1);
          candidates.sort((a,b) => Math.hypot(a.column-previous.column,a.row-previous.row)
            - Math.hypot(b.column-previous.column,b.row-previous.row));
          targets.push(candidates.shift());
        }
      }
      incident = { type:'gnome_landscaping', mode, removals:0, createdAt:at, targets:targets.map(p => ({ specimen:p,
        id:p.id, cell:p.cell, column:p.column, row:p.row, createdAt:p.createdAt })), index:0, lastTickAt:at };
      lastLandscapingAt = at;
      const first = point(incident.targets[0]);
      actors = [{ type:'gnome', role:'worker', side:'green', x:Math.max(6,first.x-35), y:first.y, createdAt:at },
        { type:'gnome', role:mode === 'weed_harvest' ? 'carrier' : 'supervisor', side:'red', x:Math.min(948,first.x+24), y:Math.max(18,first.y-20),
          state:'supervise', createdAt:at }];
      aim(at); advanceLandscaping(at); puddles.tick(actors,at); onCue('arrival'); changed(); return true;
    }
    function advanceLandscaping(at) {
      const worker = actors[0], age = Math.max(0, at-incident.stepAt);
      const exiting = incident.phase === 'exit';
      const progress = getReducedMotion() ? 1 : Math.min(1,age/landscapingConfig.travelMs);
      worker.x = worker.startX + (worker.targetX-worker.startX)*progress;
      worker.y = worker.startY + (worker.targetY-worker.startY)*progress;
      worker.state = exiting ? 'exit' : incident.snipped ? 'snip' : 'approach';
      if (incident.mode === 'weed_harvest') {
        const carrier = actors[1];
        carrier.x = Math.min(948,worker.x+18); carrier.y = Math.max(18,worker.y-8);
        carrier.state = exiting ? 'exit' : 'supervise';
      }
    }
    function tickLandscaping(at) {
      const c = landscapingConfig;
      // A stalled logical clock never replays a backlog of destructive actions.
      if (at-incident.lastTickAt > c.maxTickGapMs) { clear(); return; }
      incident.lastTickAt = at;
      const age = at-incident.stepAt;
      if (incident.phase === 'exit') { if (age >= c.exitMs) clear(); return; }
      if (incident.mode === 'overcrowding') {
        if (at-incident.createdAt >= overcrowdingConfig.maxDurationMs) { clear(); return; }
        if (freeCells() >= overcrowdingConfig.freeCells || incident.removals >= overcrowdingConfig.maxRemovals) {
          // Finish the visible cut, but never remove another specimen after the goal is reached.
          if (!incident.snipped || at >= incident.snippedAt+c.snipMs) leaveLandscaping(at);
          return;
        }
      }
      if (!incident.snipped && age >= c.travelMs) {
        const target = incident.targets[incident.index], p = target.specimen;
        incident.snipped = true; incident.snippedAt = at; incident.phase = 'snip'; // Consume even an invalid target once.
        if (validTarget(target, at) && source.remove(p, 'landscaped')) incident.removals++;
      }
      if (incident.snipped && at >= incident.snippedAt+c.snipMs) {
        incident.index++;
        if (incident.mode === 'overcrowding') {
          // Skip stale sampled targets without queuing replacement cells or extra cuts.
          while (incident.index < incident.targets.length && !validTarget(incident.targets[incident.index],at)) incident.index++;
        }
        if (incident.index < incident.targets.length) aim(at);
        else leaveLandscaping(at);
      }
    }
    function validTarget(target, at) {
      const p = target.specimen;
      return p.id === target.id && p.cell === target.cell && p.column === target.column && p.row === target.row
        && p.createdAt === target.createdAt && occupiedBy(p) && getSpecimens().includes(p) && eligibleTarget(p, at, incident.mode);
    }
    function leaveLandscaping(at) {
      const worker = actors[0]; incident.phase = 'exit'; incident.stepAt = at;
      worker.startX = worker.x; worker.startY = worker.y;
      worker.targetX = Math.max(6,worker.x-30); worker.targetY = worker.y;
      if (incident.mode === 'weed_harvest') { worker.carrySack = true; actors[1].handedOff = true; }
    }
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
      puddles.tick(actors,at); onCue('arrival'); changed(); return true;
    }
    function clear() { puddles.clear(actors);actors = []; incident = null; changed(); }
    function advance(at = now(), roll = random) {
      if (!incident) return;
      if (incident.type === 'gnome_landscaping') { advanceLandscaping(at); return; }
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
    function resetCadence(at = now()) { suspended = false; puddles.suspend();nextCheckAt = at + config.checkEveryMs; }
    function suspend(at = now()) {
      resetCadence(at);
      suspended = true;
      if (incident?.type === 'gnome_landscaping') clear();
      else changed(); // Release transient water presentation while a dispute is hidden.
    }
    function tick(at = now(), roll = random, hidden = false) {
      if (hidden) { suspend(at); return; }
      if (incident) {
        if (incident.type === 'gnome_landscaping') tickLandscaping(at);
        advance(at, roll); if(!suspended)puddles.tick(actors,at);return;
      }
      if (at < nextCheckAt) return;
      resetCadence(at); // One fresh check, never replay missed intervals.
      if (livingCount(at) >= config.minimumSpecimens && roll() < config.incidentChance) start(at, roll);
      if (!incident && at >= lastLandscapingAt + landscapingConfig.cooldownMs) {
        if (source && freeCells() === 0) {
          // Exactly one overcrowding chance; a failed roll never falls through to vine control.
          if (roll() < overcrowdingConfig.incidentChance) startLandscaping(at, roll, 'overcrowding');
        } else {
          if (landscapingEligible(at) && roll() < landscapingConfig.incidentChance) startLandscaping(at, roll);
          if (!incident && landscapingEligible(at,null,'weed_harvest') && roll() < harvestConfig.incidentChance)
            startLandscaping(at,roll,'weed_harvest');
        }
      }
    }
    function clickable(actor, at) {
      if (suspended || !incident || !actors.includes(actor)) return false;
      if (incident.type === 'gnome_incident' && (at >= incident.createdAt+config.finishedAfterMs
        || actor.state === 'flee' && at >= incident.createdAt+config.losersGoneAfterMs)) return false;
      if (incident.type === 'gnome_landscaping' && (at-incident.lastTickAt > landscapingConfig.maxTickGapMs
        || incident.phase === 'exit' && at >= incident.stepAt+landscapingConfig.exitMs)) return false;
      return (presentations.get(actor)?.alpha ?? 0) > 0;
    }
    function hitAt(point, at = now()) {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
      for (let i=actors.length-1;i>=0;i--) {
        const actor=actors[i]; if (!clickable(actor,at)) continue;
        const pose=presentations.get(actor),dx=point.x-pose.x,dy=point.y-pose.y;
        const x=dx*Math.cos(pose.rotation)+dy*Math.sin(pose.rotation),y=-dx*Math.sin(pose.rotation)+dy*Math.cos(pose.rotation);
        if (x>=-7 && x<=7 && y>=-16 && y<=12) return actor;
      }
      return null;
    }
    function click(actor, at = now()) {
      if (!clickable(actor,at)) return false;
      if (!actor.underpantsAttempted) {
        actor.underpantsAttempted=true; actor.surprisedUntil=at+reactionMs;
        onUnderpantsAttempt(presentations.get(actor),at); // Consumed even when the shared drop cap is full.
        changed();
      }
      return true; // Repeated clicks still consume the click, never the plant underneath.
    }
    return { start, startLandscaping, landscapingEligible, landscapingCandidates, advance, tick, clear, resetCadence, suspend, livingCount, hitAt, click,
      puddleRemoved(puddle){puddles.removed(puddle);if(actors.length)changed();},
      simulatePuddleEntry(actor){if(!actors.includes(actor))return false;puddles.armDemo(actor);return true;},
      get lastLandscapingAt() { return lastLandscapingAt; },
      get actors() { return actors; }, get incident() { return incident; }, get nextCheckAt() { return nextCheckAt; } };
  }
  function appearance(actor, at, reducedMotion = false) {
    const water = (typeof module !== 'undefined' && module.exports ? require('./garden-gnome-puddles.js') : window.PacketGardenGnomePuddles).reactionState(actor,at,reducedMotion);
    const surprised = at < (actor.surprisedUntil ?? -Infinity) || Boolean(water);
    const still = reducedMotion || surprised || actor.carrySack || actor.role === 'supervisor' || actor.role === 'carrier';
    const step = still ? 0 : Math.sin((at - actor.createdAt) / 90), battle = actor.state === 'battle' && !surprised;
    return { step, battle, surprised, water, sack:actor.role === 'carrier' && !actor.handedOff || Boolean(actor.carrySack),
      bounce:water ? water.bounce : surprised && !reducedMotion ? -3 : actor.state === 'celebrate' ? -Math.abs(step) * 4 : 0,
      clippers:actor.role === 'worker' && !actor.carrySack, closed:surprised || actor.state === 'snip' && (reducedMotion || step > 0),
      shove:battle ? step * (actor.side === 'green' ? 2 : -2) : 0, rotation:water ? water.rotation : battle ? step * .12 : 0,
      alpha:actor.state === 'flee' ? Math.max(0,1-(at-actor.createdAt-config.resultAfterMs)/(config.losersGoneAfterMs-config.resultAfterMs)) : 1 };
  }
  function presentation(actor, at, reducedMotion = false) {
    const pose=appearance(actor,at,reducedMotion);
    pose.x=actor.x+pose.shove;pose.y=actor.y+pose.bounce;
    presentations.set(actor,pose);return pose;
  }
  const sackArt = Object.freeze({ body:Object.freeze([4,1, 6,-3, 10,-3, 13,2, 12,9, 5,9, 3,5]),
    lines:Object.freeze([[6,-3,10,-3],[5,0,11,0],[6,3,7,7],[10,2,11,6]].map(Object.freeze)) });
  // Local coordinates shared by both presentations; two small blades and handles.
  function clipperLines(closed) {
    const spread = closed ? 1 : 5;
    return [[3,4,10,-1],[3,-3,10,-1],[10,-1,19,-1-spread],[10,-1,19,-1+spread]];
  }
  const api = { config, landscapingConfig, overcrowdingConfig, harvestConfig, reactionMs, createModel, appearance, presentation, sackArt, clipperLines };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenGnomes = api;
})();
