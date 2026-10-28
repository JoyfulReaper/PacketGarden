// Authoritative renderer-neutral browser garden rules. No scheduler or presentation dependencies.
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
    blackthorn: { growingAfterMs: 20000, matureAfterMs: 60000, fadingAfterMs: 600000, expiredAfterMs: 720000 },
    stillbloom: { growingAfterMs: 30000, matureAfterMs: 90000, fadingAfterMs: 1020000, expiredAfterMs: 1200000 }
  });
  const species = Object.keys(timings), eventSpecies = species.filter(type => type !== 'stillbloom'), protectedTypes = new Set(['ghostbloom', 'crystalfungus', 'blackthorn', 'stillbloom']);

  for (const timing of Object.values(timings)) Object.freeze(timing);
  Object.freeze(species);
  Object.freeze(eventSpecies);
  function normalizeGarden(event) {
    if (!event || !eventSpecies.includes(event.specimenType) || !Number.isInteger(event.listenPort)
      || event.listenPort < 1 || event.listenPort > 65535 || !Number.isInteger(event.vigor) || event.vigor < 0 || event.vigor > 3) return null;
    return { specimenType: event.specimenType, listenPort: event.listenPort, vigor: event.vigor,
      sensor: typeof event.sensor === 'string' && event.sensor.length > 0 ? event.sensor.slice(0, 128) : null,
      seenCount: typeof event.seenCount === 'string' && /^\d+$/.test(event.seenCount) ? event.seenCount : null };
  }
  function stageAt(type, createdAt, now) {
    const t = timings[type], age = Math.max(0, now - createdAt);
    if (age >= t.expiredAfterMs) return 'expired';
    if (type === 'redbloom') return age < t.wiltingAfterMs ? 'mature' : 'fading';
    if (age < t.growingAfterMs) return 'sprout';
    if (age < t.matureAfterMs) return 'growing';
    return age < (t.wiltingAfterMs ?? t.decayingAfterMs ?? t.fadingAfterMs ?? t.dryingAfterMs) ? 'mature' : 'fading';
  }

  function lifecycleStage(specimen, at) {
    // Existing collectible mutations own the specimen until their absolute expiry.
    if (specimen.mutation) return at < specimen.mutation.expiresAt ? 'mutation' : 'expired';
    return stageAt(specimen.type, specimen.createdAt, at);
  }
  function nextChangeAt(specimen, at) {
    if (specimen.mutation) return specimen.mutation.expiresAt > at ? specimen.mutation.expiresAt : null;
    let next = Infinity;
    const timing = timings[specimen.type];
    if(at>=specimen.createdAt+timing.expiredAfterMs)return null;
    if (specimen.type === 'stillbloom' && (at < specimen.createdAt + timing.matureAfterMs || at >= specimen.createdAt + timing.fadingAfterMs)) next = at + 1000;
    for (const name in timing) {
      const boundary = specimen.createdAt + timing[name];
      if (boundary > at) next = Math.min(next, boundary);
    }
    return Number.isFinite(next) ? next : null;
  }
  const terrainConfig = Object.freeze({ chance:.30, maxLogs:6, lifetimeMs:3600000, variants:3 });
  const competitionConfig=Object.freeze({base:.25,vigorStep:.15,ageBonus:.15,min:.05,max:.85,cooldownMs:15000});
  function createCompetitionRandom(){
    const entropy=new Uint32Array(1);
    if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(entropy);
    else entropy[0]=(Date.now()^Math.floor((globalThis.performance?.now?.()??0)*1000)^0xc04f3717)>>>0;
    let seed=entropy[0];return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  const residentAgeFraction=(resident,at)=>Math.max(0,Math.min(1,(at-resident.createdAt)/timings[resident.type].expiredAfterMs));
  function replacementChance(resident,incomingVigor,at){
    const c=competitionConfig;return Math.max(c.min,Math.min(c.max,c.base+c.vigorStep*((resident.vigor??0)-incomingVigor)+c.ageBonus*residentAgeFraction(resident,at)));
  }
  function createTerrainRandom() {
    const entropy=new Uint32Array(1);
    if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(entropy);
    else entropy[0]=(Date.now()^Math.floor((globalThis.performance?.now?.()??0)*1000)^0x10b1ac7d)>>>0;
    let seed=entropy[0];return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  // Separate, bounded terrain occupancy. No source reference is retained by a log.
  function createTerrainModel({now=Date.now,random=createTerrainRandom(),isCellOccupied=()=>false,onChange=()=>{}}={}) {
    const logs=[],byCell=new Map(),attempted=new WeakSet();let nextId=0,disposed=false;
    const counts={attempts:0,created:0,chanceSkipped:0,capSkipped:0,elapsedSkipped:0,forced:0,removed:0};
    function remove(log,reason='removed'){
      const index=logs.indexOf(log);if(index<0)return false;
      logs.splice(index,1);if(byCell.get(log.cell)===log)byCell.delete(log.cell);
      counts.removed++;onChange({kind:'terrain-removed',terrain:log,reason});return true;
    }
    function tick(at=now()){for(let i=logs.length-1;i>=0;i--)if(at>=logs[i].expiresAt)remove(logs[i],'expired');}
    function naturalExpiry(source,original,at=now(),forceFixture=false){
      if(disposed||!source||!original||attempted.has(source)||original.type!=='blackthorn'||source.mutation||source.pendingMutation
        || !Number.isFinite(at)||!Number.isFinite(original.createdAt)
        || !['type','id','cell','column','row','createdAt'].every(k=>source[k]===original[k])
        || !Number.isInteger(original.column)||original.column<0||original.column>=dimensions.columns
        || !Number.isInteger(original.row)||original.row<0||original.row>=dimensions.rows
        || original.cell!==original.row*dimensions.columns+original.column
        || at<original.createdAt+timings.blackthorn.expiredAfterMs||isCellOccupied(original.cell)||byCell.has(original.cell))return null;
      attempted.add(source);counts.attempts++;
      const forced=forceFixture&&source.origin?.kind==='simulated'&&source.origin.eventType==='log-fixture';
      if(forced)counts.forced++;
      const roll=forced?(source.vigor%terrainConfig.variants+.5)*terrainConfig.chance/terrainConfig.variants:random();
      if(!Number.isFinite(roll)||roll<0||roll>=terrainConfig.chance){counts.chanceSkipped++;return null;}
      const createdAt=original.createdAt+timings.blackthorn.expiredAfterMs,expiresAt=createdAt+terrainConfig.lifetimeMs;
      // Absolute decay never gives an overdue hidden/stalled expiry a fresh hour.
      if(at>=expiresAt){counts.elapsedSkipped++;return null;}
      tick(at);
      if(logs.length>=terrainConfig.maxLogs){counts.capSkipped++;return null;}
      const log=Object.freeze({type:'fallen_log',id:++nextId,cell:original.cell,column:original.column,row:original.row,
        createdAt,expiresAt,simulated:source.origin?.kind==='simulated',variant:Math.min(terrainConfig.variants-1,Math.floor(roll/terrainConfig.chance*terrainConfig.variants))});
      logs.push(log);byCell.set(log.cell,log);counts.created++;onChange({kind:'terrain-added',terrain:log,reason:'natural-blackthorn-expiry'});return log;
    }
    function clear(){while(logs.length)remove(logs.at(-1),'cleared');}
    return {logs,byCell,counts,naturalExpiry,tick,clear,remove,isBlocked:cell=>byCell.has(cell),
      snapshot(){return{...counts,active:logs.length,blockedCells:byCell.size};},destroy(){disposed=true;clear();}};
  }
  function createGardenModel({ now = Date.now, random = Math.random, competitionRandom=createCompetitionRandom(), terrainRandom, onChange = () => {} } = {}) {
    const specimens = [], byCell = new Map(),reservedCells=new Set(); let nextId = 0,nextReplacementAt=-Infinity,lastAttempt=null,lastCompetitionOutcome=null;
    const identities = new WeakMap(), visualTimes = new WeakMap(), originals=new WeakMap(),forcedLogFixtures=new WeakSet();
    const terrain=createTerrainModel({now,random:terrainRandom,isCellOccupied:cell=>byCell.has(cell)||reservedCells.has(cell),onChange});
    function identify(specimen) {
      if (!identities.has(specimen)) identities.set(specimen, ++nextId);
      specimen.id = identities.get(specimen);
      if(specimen.type==='blackthorn')originals.set(specimen,Object.freeze({type:specimen.type,id:specimen.id,
        cell:specimen.row*dimensions.columns+specimen.column,column:specimen.column,row:specimen.row,createdAt:specimen.createdAt}));
      if(specimen.type==='stillbloom')visualTimes.set(specimen, specimen.createdAt);
    }
    const notify = (kind, specimen, reason, previousStage) => onChange({ kind, specimen, reason, previousStage });
    function remove(specimen, reason = 'removed') {
      const index = specimens.indexOf(specimen);
      if (index < 0) return false;
      specimens.splice(index, 1);
      const originalCell=originals.get(specimen)?.cell??specimen.cell;
      if(byCell.get(originalCell)===specimen)byCell.delete(originalCell);
      if(specimen.cell!==originalCell&&byCell.get(specimen.cell)===specimen)byCell.delete(specimen.cell);
      notify('removed', specimen, reason); return true;
    }
    function tick(at = now()) {
      terrain.tick(at);
      let removed = 0, updated = 0;
      for (let i = specimens.length - 1; i >= 0; i--) {
        const specimen = specimens[i], stage = lifecycleStage(specimen, at);
        if (stage === 'expired') {
          const original=originals.get(specimen),owned=original && byCell.get(original.cell)===specimen;
          remove(specimen, 'expired'); removed++;
          if(owned)terrain.naturalExpiry(specimen,original,at,forcedLogFixtures.has(specimen));
        }
        else if (stage !== specimen.stage || (specimen.type === 'stillbloom' && at >= (nextChangeAt(specimen, visualTimes.get(specimen)) ?? Infinity))) {
          const previous = specimen.stage; specimen.stage = stage;
          if(specimen.type==='stillbloom')visualTimes.set(specimen, at);
          notify('updated', specimen, stage===previous?'visual':'stage', previous); updated++;
        }
      }
      return { removed, updated };
    }
    function replacementEligible(p,at){
      return !protectedTypes.has(p.type)&&!p.mutation&&!p.pendingMutation
        && !['pending','active'].includes(p.poppyMutation?.state)
        && Number.isInteger(p.column)&&p.column>=0&&p.column<dimensions.columns&&Number.isInteger(p.row)&&p.row>=0&&p.row<dimensions.rows
        && byCell.get(p.cell)===p&&!terrain.isBlocked(p.cell)&&!reservedCells.has(p.cell)
        && p.cell===p.row*dimensions.columns+p.column&&lifecycleStage(p,at)!=='expired';
    }
    function replacementCandidates(at=now()){return specimens.filter(p=>replacementEligible(p,at));}
    function chooseReplacement(incomingVigor,at){
      const candidates=[];
      for(let index=0;index<specimens.length;index++){
        const p=specimens[index];if(replacementEligible(p,at))candidates.push({specimen:p,index,
          id:p.id,type:p.type,cell:p.cell,column:p.column,row:p.row,createdAt:p.createdAt,vigor:p.vigor??0});
      }
      if(!candidates.length){lastCompetitionOutcome='no-candidates';return null;}
      const selection=competitionRandom();
      if(!Number.isFinite(selection)||selection<0||selection>=1){lastCompetitionOutcome='invalid-selection';return null;}
      const target=candidates[Math.floor(selection*candidates.length)],p=target.specimen;
      const chance=replacementChance(target,incomingVigor,at),roll=competitionRandom();
      const exact=at>=nextReplacementAt&&byCell.size+terrain.byCell.size+reservedCells.size===dimensions.capacity
        && specimens[target.index]===p&&byCell.get(target.cell)===p
        && ['id','type','cell','column','row','createdAt'].every(key=>p[key]===target[key])&&(p.vigor??0)===target.vigor
        && replacementEligible(p,at);
      const success=exact&&Number.isFinite(roll)&&roll>=0&&roll<chance;
      lastAttempt=Object.freeze({at,cell:target.cell,residentVigor:target.vigor,incomingVigor,
        ageFraction:residentAgeFraction(target,at),chance,roll,success});
      lastCompetitionOutcome=success?'replaced':exact?'failed':'stale';return success?target:null;
    }
    function addSpecimen(type, vigor = 0, at = now(), origin = null) {
      if (!species.includes(type) || !Number.isInteger(vigor) || vigor < 0 || vigor > 3) return null;
      tick(at);
      if (type === 'stillbloom' && specimens.filter(p => p.type === type).length >= 2) return null;
      const empty = [];
      for (let cell = 0; cell < dimensions.capacity; cell++) if (!byCell.has(cell) && !terrain.isBlocked(cell)&&!reservedCells.has(cell)) empty.push(cell);
      let target = null, cell;
      if (!empty.length) {
        if (type === 'stillbloom') return null; // Ambient quiet growth never competes or counts as dropped input.
        lastAttempt=null;
        if(at<nextReplacementAt){lastCompetitionOutcome='cooldown';notify('dropped',null,'saturated');return null;}
        target=chooseReplacement(vigor,at);
        if(!target){notify('dropped',null,'saturated');return null;}
        cell=target.cell;
      } else {
        lastCompetitionOutcome='free-cell';
        const adjacent = [], nearby = [], same = specimens.filter(p => p.type === type);
        for (const candidate of empty) {
          const column = candidate % dimensions.columns, row = Math.floor(candidate / dimensions.columns);
          let distance = Infinity;
          for (const specimen of same) distance = Math.min(distance,
            Math.max(Math.abs(column - specimen.column), Math.abs(row - specimen.row)));
          if (distance === 1) adjacent.push(candidate); else if (distance === 2) nearby.push(candidate);
        }
        const preferAdjacent = random() < .9, preferred = preferAdjacent ? adjacent : nearby, alternate = preferAdjacent ? nearby : adjacent;
        const candidates = preferred.length ? preferred : alternate.length ? alternate : empty;
        cell = candidates[Math.floor(random() * candidates.length)];
      }
      const specimen = { type, vigor, cell, column: cell % dimensions.columns,
        row: Math.floor(cell / dimensions.columns), createdAt: at, stage: stageAt(type, at, at) };
      identify(specimen);
      if (origin) specimen.origin = origin;
      const replaced = target?.specimen??null;
      if (replaced) {
        // Reserve the destination across normal removal callbacks, including nested incoming growth.
        nextReplacementAt=at+competitionConfig.cooldownMs;reservedCells.add(cell);
        try{
          remove(replaced,'replaced');specimens.splice(Math.min(target.index,specimens.length),0,specimen);byCell.set(cell,specimen);
        }finally{reservedCells.delete(cell);}
      } else specimens.push(specimen);
      byCell.set(cell, specimen); notify('added', specimen, replaced ? 'replaced' : 'spawned');
      return { specimen, replaced };
    }
    function addEvent(raw, at = now()) {
      const event = normalizeGarden(raw);
      if (!event) return null;
      return addSpecimen(event.specimenType, event.vigor, at,
        { kind: 'tcpnoise', listenPort: event.listenPort, sensor: event.sensor, seenCount: event.seenCount });
    }
    function clear() {
      for (let i = specimens.length - 1; i >= 0; i--) remove(specimens[i], 'cleared');
      terrain.clear();
      // Ids are monotonic across clear so stale UI references cannot alias a new specimen.
    }
    function seed(entries, at = now()) {
      // Explicit local fixture/dev import, never an SSE path. Validate atomically before clearing.
      const cells = new Set();let stillblooms=0;
      for (const entry of entries) {
        const { column, row, type, createdAt, vigor = 0 } = entry;
        const cell = row * dimensions.columns + column;
        if (!species.includes(type) || !Number.isInteger(column) || !Number.isInteger(row)
          || column < 0 || column >= dimensions.columns || row < 0 || row >= dimensions.rows
          || !Number.isFinite(createdAt) || !Number.isInteger(vigor) || vigor < 0 || vigor > 3 || cells.has(cell)) throw new Error('Invalid garden seed');
        cells.add(cell);
        if(type==='stillbloom'&&at-createdAt<timings.stillbloom.expiredAfterMs&&++stillblooms>2)throw new Error('Stillbloom cap exceeded');
      }
      const entriesCopy = Array.from(entries);
      clear();
      for (const specimen of entriesCopy) {
        identify(specimen); specimen.cell = specimen.row * dimensions.columns + specimen.column;
        specimen.stage = lifecycleStage(specimen, at);
        specimens.push(specimen); byCell.set(specimen.cell, specimen); notify('added', specimen, 'seeded');
      }
    }
    function getCell(column, row) {
      if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || column >= dimensions.columns || row < 0 || row >= dimensions.rows) return null;
      return byCell.get(row * dimensions.columns + column) ?? null;
    }
    function getNeighbors(column, row) {
      const neighbors = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const specimen = getCell(column + dx, row + dy); if (specimen) neighbors.push(specimen);
      }
      return neighbors;
    }
    const model = { specimens, byCell, terrain, addSpecimen, addEvent, tick, clear, seed, remove, getCell, getNeighbors,replacementCandidates,
      competitionSnapshot(at=now()){return{cooldownUntil:Number.isFinite(nextReplacementAt)?nextReplacementAt:null,
        remainingMs:Math.max(0,nextReplacementAt-at),outcome:lastCompetitionOutcome,lastAttempt};},
      forceLogFixture(){let count=0;for(const p of specimens)if(p.type==='blackthorn'&&p.origin?.kind==='simulated'&&p.origin.eventType==='log-fixture'){forcedLogFixtures.add(p);count++;}return count;},
      freeCellCount:()=>dimensions.capacity-byCell.size-terrain.byCell.size-reservedCells.size,
      isCellOccupied:(column,row)=>byCell.has(row*dimensions.columns+column)||terrain.isBlocked(row*dimensions.columns+column)||reservedCells.has(row*dimensions.columns+column),
      destroy(){clear();terrain.destroy();} };
    return model;
  }
  const api = { dimensions, timings, species, eventSpecies, isProtected: type => protectedTypes.has(type), normalizeGarden, stageAt, lifecycleStage, nextChangeAt,
    terrainConfig,createTerrainRandom,createTerrainModel,competitionConfig,createCompetitionRandom,residentAgeFraction,replacementChance,createGardenModel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenCore = api;
})();
