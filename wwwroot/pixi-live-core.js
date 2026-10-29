// Pixi presentation, dev controls and transport adapter for the shared logical garden.
(function () {
  'use strict';
  const garden = typeof module !== 'undefined' && module.exports ? require('./garden-core.js') : window.PacketGardenCore;
  const mutationCore = typeof module !== 'undefined' && module.exports ? require('./garden-mutations.js') : window.PacketGardenMutations;
  const uiCore = typeof module !== 'undefined' && module.exports ? require('./garden-ui-core.js') : window.PacketGardenUiCore;
  const blooms = typeof module !== 'undefined' && module.exports ? require('./pixi-broadleaf-blooms.js') : window.PacketGardenBroadleafBlooms;
  const vineBlooms = typeof module !== 'undefined' && module.exports ? require('./pixi-vine-blooms.js') : window.PacketGardenVineBlooms;
  const spores = typeof module !== 'undefined' && module.exports ? require('./pixi-wirefern-spores.js') : window.PacketGardenWirefernSpores;
  const { dimensions, timings, species, eventSpecies, normalizeGarden, stageAt } = garden;
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
    return { level: event.level, eventsPerMinute: Math.min(1000000, Math.max(0, event.eventsPerMinute)),
      eventsLastHour: Number.isSafeInteger(event.eventsLastHour) && event.eventsLastHour >= 0 ? event.eventsLastHour : null,
      hasSnapshot: event.hasSnapshot !== false,
      telemetryHealthy:event.hasSnapshot===true&&event.telemetryHealthy===true,
      freshUntil:Number.isSafeInteger(event.freshUntil)?event.freshUntil:null,
      telemetryGeneration:Number.isSafeInteger(event.telemetryGeneration)&&event.telemetryGeneration>0?event.telemetryGeneration:null };
  }
  function colorVariant(type, vigor, roll) {
    if (roll < .01) return 4; // cosmetic only, never alters species or backend rarity
    if (type !== 'vine') return vigor;
    const commonRoll = (roll - .01) / .99;
    return commonRoll < .70 ? 0 : commonRoll < .85 ? 1 : commonRoll < .95 ? 2 : 3;
  }
  const paletteNames = {
    flower: ['cream','blush','sky','marigold','moonflower'], mushroom: ['rust','violet','teal','gold','bioluminescent'],
    broadleaf: ['lavender','mint','amber','rose','orchid'], vine: ['aqua','lime','chartreuse','olive','silvervine'],
    wirefern: ['phosphor','moss','cyan','amber','afterglow'], redbloom: ['crimson','scarlet','magenta','ember','solar'],
    weed: ['mustard','lime','rust','bluegreen','toxic'], ghostbloom: ['ice','violet','mint','rose','spectral'],
    crystalfungus: ['cyan','emerald','rose','gold','aurora'], blackthorn: ['lavender','rose','periwinkle','sage','gold']
  };
  const colorName = specimen => `Pixi ${paletteNames[specimen.type]?.[specimen.colorVariant] ?? 'default'}`;
  function weatherSettings(state) {
    const base = weatherLevels[state.level], intensity = Math.min(1, Math.log1p(state.eventsPerMinute) / Math.log1p(10000));
    return { count: state.eventsPerMinute > 0 ? Math.round(base.count * (.25 + .75 * intensity)) : 0,
      speed: base.speed * (.6 + .4 * intensity), drift: base.drift,
      opacity: base.opacity, length: base.length, slant: base.slant,
      darkening: intensity === 0 ? 0 : base.darkening * (.5 + .5 * intensity) };
  }
  function createModel(view, { now = Date.now, random = Math.random, competitionRandom, terrainRandom, bloomRandom = blooms.random, vineBloomRandom = vineBlooms.random, sporeRandom = spores.random, poppyRandom, onTerrainChange = () => {}, onPoppyActivated = () => {}, onAdded = () => {}, onLive = () => {}, onRemoved = () => {}, onActivity = () => {} } = {}) {
    let paused = false;
    const recentEvents = [];
    const counts = { acceptedLive: 0, droppedSaturated: 0, lifecycleRemovals: 0, replacements: 0, pausedEvents: 0, heistRemovals: 0 };
    const model = garden.createGardenModel({ now, random, competitionRandom, terrainRandom, onChange(change) {
      const { kind, specimen, reason } = change;
      if(kind==='terrain-added'||kind==='terrain-removed'){view.terrainChange?.(change);onTerrainChange(change);return;}
      if (kind === 'added') {
        onAdded(specimen); // Placement succeeded; clear its soil before presenting the plant.
        specimen.colorVariant = specimen.type === 'stillbloom' ? 0 : colorVariant(specimen.type, specimen.vigor, random());
        blooms.assign(specimen, bloomRandom);
        vineBlooms.assign(specimen,vineBloomRandom);
        spores.assign(specimen, sporeRandom);
        view.add(specimen, model.byCell);
        if (reason === 'replaced') counts.replacements++;
      } else if (kind === 'updated') view.update(specimen, model.byCell);
      else if (kind === 'removed') { mutations.removed(specimen, reason); poppies.removed(specimen); view.remove(specimen, model.byCell); onRemoved(specimen); if (reason === 'expired') counts.lifecycleRemovals++; if(reason==='gnome-heist')counts.heistRemovals++; }
      else if (kind === 'dropped') counts.droppedSaturated++;
    }});
    const mutations = mutationCore.createMutationModel({ garden: model, now, random });
    const poppies = mutationCore.createPoppyModel({ garden: model, now, random: poppyRandom,
      onChange(specimen, at) { view.update(specimen, model.byCell); onPoppyActivated(specimen, at); } });
    function tick(at = now()) {
      model.tick(at);
      if (mutations.tick(at)) model.tick(at); // Publish the mutation stage on the existing specimen view.
      poppies.tick(at);
    }
    function acceptEvent(raw) {
      const event = normalizeGarden(raw); if (!event) return { outcome: 'invalid', specimen: null };
      if (paused) { counts.pausedEvents++; return { outcome: 'paused', specimen: null }; }
      const at = now(); tick(at); // Reconcile due mutations before incoming growth competes for a cell.
      // Already normalized once; construct the safe provenance without retaining the raw frame.
      const result = model.addSpecimen(event.specimenType, event.vigor, at,
        { kind: 'tcpnoise', sensor: event.sensor, listenPort: event.listenPort, seenCount: event.seenCount });
      const outcome = result ? result.replaced ? 'replaced' : 'spawned' : 'dropped';
      const entry = uiCore.appendRecent(recentEvents, { kind: 'tcpnoise', ...event, receivedAt: at, outcome });
      onActivity(entry);
      if (result) { counts.acceptedLive++; mutations.maybeSchedulePort22Mutation(result.specimen); poppies.consider(result.specimen); onLive(result.specimen); }
      return { outcome, specimen: result?.specimen ?? null };
    }
    return { specimens: model.specimens, byCell: model.byCell, terrain:model.terrain, freeCellCount:model.freeCellCount,
      isCellOccupied:model.isCellOccupied,competitionSnapshot:model.competitionSnapshot, counts, mutations, poppies, recentEvents, tick,
      clear: model.clear, remove: model.remove, addSpecimen:model.addSpecimen, acceptEvent, accept: raw => acceptEvent(raw).specimen,
      setPaused(value) { paused = value; },
      seedCompetition(mode='mixed',old=false){
        const at=now();model.seed(Array.from({length:dimensions.capacity},(_,cell)=>({type:'broadleaf',
          vigor:mode==='mixed'?Math.floor(cell%32/8):Number(mode),column:cell%32,row:Math.floor(cell/32),
          createdAt:at-timings.broadleaf.expiredAfterMs*(old?.8:.1),origin:{kind:'simulated',eventType:'competition-fixture'}})),at);
      },
      seedLogs(mode='aging') {
        const at=now(),count=mode==='cap'?8:1,full=mode==='full',dense=mode==='dense';
        const cells=Array.from({length:count},(_,i)=>10*dimensions.columns+10+i*2),used=new Set(cells);
        const entries=cells.map((cell,i)=>({type:'blackthorn',vigor:i%4,column:cell%32,row:Math.floor(cell/32),
          createdAt:at-garden.timings.blackthorn.expiredAfterMs+2000,colorVariant:i%5,origin:{kind:'simulated',eventType:'log-fixture'}}));
        for(let cell=0;cell<640;cell++)if(!used.has(cell)&&(full||dense && cell%3===0))entries.push({type:'broadleaf',vigor:2,
          column:cell%32,row:Math.floor(cell/32),createdAt:at-65000,origin:{kind:'simulated',eventType:'log-fixture'}});
        model.seed(entries,at);for(const p of entries){p.colorVariant=p.vigor;view.update(p,model.byCell);}return entries[0];
      },
      forceLogFixture(at=now()) {
        // Explicit simulated fixture only; the normal expiry/occupancy/removal path still runs.
        const count=model.forceLogFixture();model.tick(at);return count;
      },
      seedCampfire() {
        const at=now(),thorn={type:'blackthorn',vigor:1,column:16,row:10,createdAt:at-garden.timings.blackthorn.expiredAfterMs,
          origin:{kind:'simulated',eventType:'log-fixture'}};
        model.seed([thorn,...Array.from({length:35},(_,i)=>({type:'broadleaf',vigor:i%4,column:5+i%22,row:13+Math.floor(i/22),
          createdAt:at-65000,origin:{kind:'simulated',eventType:'campfire-fixture'}}))],at-1);
        model.forceLogFixture();model.tick(at);
        return model.terrain.logs[0]??null;
      },
      seedHeist() {
        const at=now();
        model.seed(Array.from({length:35},(_,i)=>({type:i<4?'mushroom':'broadleaf',vigor:i%4,
          column:i<4?12+i*2:7+(i-4)%18,row:i<4?10:13+Math.floor((i-4)/18),createdAt:at-65000,
          origin:{kind:'simulated',eventType:'heist-fixture'}})),at);
        for(const p of model.specimens){p.colorVariant=p.vigor;view.update(p,model.byCell);}
      },
      replaceHeistTarget(target) {
        // Explicit all-simulated dev fixture only. Reimport through normal lifecycle notifications.
        if(!model.specimens.includes(target) || !model.specimens.every(p=>p.origin?.kind==='simulated' && p.origin.eventType==='heist-fixture'))return null;
        const replacement={type:'mushroom',vigor:3,colorVariant:3,column:target.column,row:target.row,createdAt:now()-65000,
          origin:{kind:'simulated',eventType:'heist-fixture'}};
        const entries=model.specimens.map(p=>p===target?replacement:p),colors=entries.map(p=>p.colorVariant);
        model.seed(entries);
        entries.forEach((p,i)=>{p.colorVariant=colors[i];view.update(p,model.byCell);});return replacement;
      },
      seedWirefernSpores(mode = 'stages') {
        const entries = spores.fixtureEntries(now(), mode), foliage = entries.map(p => p.colorVariant);
        model.seed(entries);
        for (let i = 0; i < entries.length; i++) { entries[i].colorVariant = foliage[i]; view.update(entries[i], model.byCell); }
      },
      replaceWirefernSporeFixture() {
        if (model.specimens.length !== dimensions.capacity || !model.specimens.every(p => p.origin?.kind === 'simulated'
          && p.origin.eventType === 'wirefern-spore-fixture')) return null;
        const source=model.byCell.get(303);if(!source)return null;
        model.remove(source,'simulated-wirefern-replacement');
        const result=model.addSpecimen('wirefern',3,now(),{kind:'simulated',eventType:'wirefern-spore-fixture'});
        return result?{...result,replaced:source}:null;
      },
      seedPoppies(mode = 'mature') {
        const at = now(), age = { before: 59000, mature: 60000, fading: 480000, expiry: 599000, pods: 65000 }[mode] ?? 60000;
        const entries = Array.from({ length: 35 }, (_, i) => ({ type: 'vine', vigor: i % 4,
          column: 12 + i % 7, row: 7 + Math.floor(i / 7), createdAt: at - (i === 17 ? age : 65000),
          vineBloom: mode === 'flowers' || mode === 'connections' ? { color: i % 4, layout: i % 2 } : null,
          origin: { kind: 'simulated', eventType: 'poppy-fixture' } }));
        if (mode === 'replacement') {
          for (const p of entries) p.vigor = 3;
          entries[17].vigor = 0;
          const occupied = new Set(entries.map(p => p.row * dimensions.columns + p.column));
          for (let cell = 0; cell < dimensions.capacity; cell++) if (!occupied.has(cell)) entries.push({
            type: 'broadleaf', vigor: 3, column: cell % dimensions.columns, row: Math.floor(cell / dimensions.columns),
            createdAt: at - 65000, origin: { kind: 'simulated', eventType: 'poppy-fixture' } });
        }
        model.seed(entries, at);
        for (const p of model.specimens) { p.colorVariant = p.vigor; view.update(p, model.byCell); }
        const source = model.specimens[17]; poppies.force(source); tick(at); return source;
      },
      replacePoppyFixture() {
        if (model.specimens.length !== dimensions.capacity || !model.specimens.every(p => p.origin?.kind === 'simulated'
          && p.origin.eventType === 'poppy-fixture')) return null;
        const source=model.specimens.find(p=>p.poppyMutation);if(!source)return null;
        // Explicit simulated removal previews cleanup; active/pending poppies are protected from competition.
        model.remove(source,'simulated-poppy-replacement');
        const result=model.addSpecimen('vine',3,now(),{kind:'simulated',eventType:'poppy-replacement'});
        return result?{...result,replaced:source}:null;
      },
      seedVineBlooms(mode='stages') {
        const entries=vineBlooms.fixtureEntries(now(),mode),foliage=entries.map(p=>p.colorVariant);
        model.seed(entries);
        for(let i=0;i<model.specimens.length;i++){
          model.specimens[i].colorVariant=foliage[i];view.update(model.specimens[i],model.byCell);
        }
      },
      seedBroadleafBlooms(dense = false) {
        const entries = blooms.fixtureEntries(now(), dense), foliage = entries.map(p => p.colorVariant);
        model.seed(entries);
        for (let i = 0; i < model.specimens.length; i++) {
          model.specimens[i].colorVariant = foliage[i]; view.update(model.specimens[i], model.byCell);
        }
      },
      seedWeedBuds() {
        const at = now();
        model.seed(['weed','weed','mushroom'].map((type,i) => ({ type, vigor:1, column:12+i*5,
          row:10, createdAt:at-65000, origin:{kind:'simulated',eventType:'weed-bud-test'} })),at);
      },
      seedLandscaping(mode = 'vine') {
        const at = now();
        if (mode === 'weed_harvest') {
          model.seed(Array.from({length:5},(_,i)=>({type:'weed',vigor:1,column:12+i*2,row:10,createdAt:at-65000,
            colorVariant:0,origin:{kind:'simulated',eventType:'weed-harvest-test'}})),at);
          for(const p of model.specimens){p.colorVariant=0;view.update(p,model.byCell);}return;
        }
        const full = mode === 'overcrowding', ordinary = ['flower','mushroom','broadleaf','vine','wirefern','weed'];
        model.seed(Array.from({length:full?dimensions.capacity:50}, (_,i) => ({ type:full?ordinary[i%ordinary.length]:i<32?'vine':'broadleaf', vigor:0,
          column:full?i%dimensions.columns:10+i%10, row:full?Math.floor(i/dimensions.columns):6+Math.floor(i/10), createdAt:at-65000,
          origin:{kind:'simulated',eventType:'landscaping-test'} })), at);
        for (const p of model.specimens) if (full || p.type === 'vine') {
          p.colorVariant = 0; view.update(p, model.byCell); // Diagnostic fixture is deliberately ordinary.
        }
      },
      seedInteraction() {
        const at = now();
        model.seed([
          { type: 'redbloom', column: 15, row: 10, vigor: 2, createdAt: at - 20000, origin: { kind: 'simulated', eventType: 'interaction-test' } },
          { type: 'mushroom', column: 19, row: 10, vigor: 1, createdAt: at - 60000, origin: { kind: 'simulated', eventType: 'interaction-test' } }
        ], at);
        const source = model.specimens[0];
        mutations.scheduleMutation(source, 'collectible_weed', at - mutationCore.config.mutationDelayMs); tick(at);
        return source;
      },
      seedMutations(pending = false) {
        // Explicit local fixtures, independent of SSE, its provenance gate and probability.
        const at = now(), sources = model.specimens.filter(p => p.type === 'redbloom' && p.origin?.kind === 'simulated'
          && !p.mutation && !p.pendingMutation).slice(0, pending ? 4 : 3);
        while (sources.length < (pending ? 4 : 3)) {
          const result = model.addSpecimen('redbloom', 3, at, { kind: 'simulated', eventType: 'mutation-test' });
          if (!result) break;
          sources.push(result.specimen);
        }
        for (const source of sources) {
          // Prepare age before scheduling so the active fixture demonstrably outlives normal expiry.
          source.createdAt = at - 20000;
          mutations.scheduleMutation(source, 'collectible_weed', pending ? at : at - mutationCore.config.mutationDelayMs);
        }
        tick(at);
      },
      seed() {
        const at = now();
        model.seed(Array.from({ length: dimensions.capacity }, (_, cell) => {
          const type = eventSpecies[cell % eventSpecies.length], vigor = Math.floor(cell / eventSpecies.length) % 4;
          const age = type === 'redbloom' ? cell % 8000 : timings[type].matureAfterMs + cell % 1000;
          return { type, vigor, column: cell % dimensions.columns, row: Math.floor(cell / dimensions.columns), createdAt: at - age,
            origin: { kind: 'simulated', eventType: 'seed', listenPort: null, sensor: null, seenCount: null } };
        }), at);
      }
    };
  }
  function connectStream(Source, model, onWeather, onStatus, onInvalidWeather = () => {}) {
    const stream = new Source('/api/garden/events');
    let closed=false;const close=stream.close.bind(stream);
    stream.onopen = () => {if(!closed)onStatus('connected');}; stream.onerror = () => {if(!closed)onStatus('disconnected/reconnecting');};
    const garden=message=>{if(closed)return;try { model.accept(JSON.parse(message.data)); } catch { /* malformed frames never stop the stream */ } };
    const weather=message=>{if(closed)return;try { const state = normalizeWeather(JSON.parse(message.data)); if (state) onWeather(state); else onInvalidWeather(); } catch { onInvalidWeather(); /* preserve last good rendered weather */ } };
    stream.addEventListener('garden',garden);stream.addEventListener('weather',weather);
    stream.close=()=>{
      if(closed)return;closed=true;
      stream.removeEventListener?.('garden',garden);stream.removeEventListener?.('weather',weather);
      stream.onopen=stream.onerror=null;close();
    };
    return stream;
  }
  const api = { dimensions, timings, species, eventSpecies, palettes, stageAt, normalizeGarden, normalizeWeather, colorVariant, colorName, weatherLevels, weatherSettings, createModel, connectStream };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenPixiLiveCore = api;
})();
