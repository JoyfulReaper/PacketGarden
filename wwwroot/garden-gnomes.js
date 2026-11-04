// Renderer-neutral gnomes. Landscaping and mushroom heists use authoritative removal.
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
  const heistConfig = Object.freeze({ incidentShare:.3, pickupAfterMs:3000, pickupHoldMs:1000,
    finishedAfterMs:14000, abortExitMs:2000, maxTickGapMs:1500 });
  const campfireConfig = Object.freeze({ incidentShare:.4, gatherAfterMs:2500, igniteAfterMs:4000,
    charAfterMs:15000, consumeAfterMs:17000, finishedAfterMs:21000, maxTickGapMs:1500, maxActors:3 });
  const wizardConfig = Object.freeze({incidentShare:.25,inspectAfterMs:3000,raiseAfterMs:4000,
    castAfterMs:5000,leaveAfterMs:8000,finishedAfterMs:14000,maxTickGapMs:1500});
  const wizardSpecies=Object.freeze(['ghostbloom','crystalfungus','blackthorn','stillbloom']);
  const funeralConfig=Object.freeze({incidentShare:.2,enterAfterMs:3000,pauseAfterMs:13000,
    leaveAfterMs:16000,finishedAfterMs:18000,maxTickGapMs:1500,maxActors:4});
  // Two bearers around the shared prop, then two followers in a single file.
  const funeralOffsets=Object.freeze([22,-22,-50,-76]);
  const reactionMs = 600, presentations = new WeakMap();
  // Canvas uses palette names (and a separate broadleaf field); Pixi uses index 4.
  const rareColors = new Set(['moonflower','bioluminescent','silvervine','afterglow','solar','toxic','rainbow']);
  const ordinarySpecimen = (p, at) => garden.species.includes(p.type) && !garden.isProtected(p.type)
    && !p.mutation && !p.pendingMutation && p.poppyMutation?.state !== 'active' && !rareColors.has(p.colorVariant) && p.colorVariant !== 4
    && !(p.type === 'broadleaf' && p.broadleafVariant === 'rainbow')
    && at >= p.createdAt && garden.lifecycleStage(p, at) !== 'expired';
  function createModel({ getSpecimens, garden: source, now = Date.now, random = Math.random,
    getPuddles = () => [], puddleRandom, getEcology = () => null,
    getReducedMotion = () => false, hasPendingBud = () => false, hasPendingCollectible = () => false,
    getHeistPosition = p => ({x:(p.column+.5)*garden.dimensions.cellSize,y:(p.row+.5)*garden.dimensions.cellSize+12}),
    onUnderpantsAttempt = () => {},
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
    const freeCells = () => source?.freeCellCount?.() ?? garden.dimensions.capacity - (source?.byCell.size ?? 0);
    const eligibleMushroom = (p, at) => p?.type === 'mushroom' && ordinarySpecimen(p, at)
      && garden.lifecycleStage(p, at) === 'mature' && !p.poppyMutation && !hasPendingCollectible(p) && !hasPendingBud(p)
      && Number.isInteger(p.column) && p.column >= 0 && p.column < garden.dimensions.columns
      && Number.isInteger(p.row) && p.row >= 0 && p.row < garden.dimensions.rows
      && p.cell === p.row*garden.dimensions.columns+p.column && occupiedBy(p);
    function heistCandidates(at = now(), simulatedOnly = false) {
      return getSpecimens().filter(p => eligibleMushroom(p, at) && (!simulatedOnly || p.origin?.kind === 'simulated'));
    }
    function startHeist(at = now(), roll = random, simulatedOnly = false, candidates = null) {
      if (suspended || incident || !source || livingCount(at) < config.minimumSpecimens) return false;
      candidates ??= heistCandidates(at, simulatedOnly);
      if (!candidates.length) return false;
      const p = candidates[Math.floor(roll()*candidates.length)];
      if (!p || !eligibleMushroom(p,at) || simulatedOnly && p.origin?.kind !== 'simulated') return false;
      const position = getHeistPosition(p);
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return false;
      const origin = {x:Math.max(0,Math.min(960,position.x)),y:Math.max(0,Math.min(600,position.y))};
      const exits = [{x:-36,y:origin.y},{x:996,y:origin.y},{x:origin.x,y:-36},{x:origin.x,y:636}];
      const exit = exits.reduce((a,b) => Math.hypot(b.x-origin.x,b.y-origin.y)<Math.hypot(a.x-origin.x,a.y-origin.y)?b:a);
      incident = {type:'gnome_heist',phase:'approach',createdAt:at,lastTickAt:at,removals:0,origin,exit,
        target:{specimen:p,id:p.id,cell:p.cell,column:p.column,row:p.row,createdAt:p.createdAt},
        carried:null,aborted:false};
      actors = ['green','red'].map((side,i) => ({type:'gnome',role:'thief',side,createdAt:at,state:'approach',
        startX:Math.max(7,Math.min(953,origin.x+(i?100:-100))),startY:origin.y-4,
        x:Math.max(7,Math.min(953,origin.x+(i?100:-100))),y:origin.y-4,
        targetX:origin.x+(i?18:-18),targetY:origin.y-4}));
      puddles.tick(actors,at);onCue('arrival');changed();return true;
    }
    function validHeistTarget(at) {
      const t=incident.target,p=t?.specimen;
      return p && p.id===t.id && p.cell===t.cell && p.column===t.column && p.row===t.row
        && p.createdAt===t.createdAt && getSpecimens().includes(p) && eligibleMushroom(p,at);
    }
    function cancelHeistGap(at) { clear();resetCadence(at); }
    function tickHeist(at) {
      const c=heistConfig;
      if(at<incident.lastTickAt || at-incident.lastTickAt>c.maxTickGapMs){cancelHeistGap(at);return;}
      incident.lastTickAt=at;
      if(at>=incident.createdAt+c.finishedAfterMs || incident.aborted && at>=incident.exitAt+c.abortExitMs){clear();return;}
      if(incident.phase==='approach' && at>=incident.createdAt+c.pickupAfterMs){
        // Only the logical tick can steal. Capture safe appearance values before normal removal/notifications.
        if(validHeistTarget(at)){
          const p=incident.target.specimen;
          const visual=Object.freeze({type:'mushroom',vigor:p.vigor,colorVariant:p.colorVariant,row:p.row});
          if(source.remove(p,'gnome-heist')){
            incident.carried=visual;incident.removals=1;incident.pickupAt=at;incident.phase='pickup';
          }
        }
        if(!incident.carried){incident.aborted=true;incident.phase='exit';incident.exitAt=at;}
        incident.target=null; // No removed specimen or raw provenance retained by the getaway.
        changed();
      }
    }
    function advanceHeist(at) {
      const c=heistConfig;
      if(at<incident.lastTickAt || at-incident.lastTickAt>c.maxTickGapMs){cancelHeistGap(at);return;}
      if(at>=incident.createdAt+c.finishedAfterMs || incident.aborted && at>=incident.exitAt+c.abortExitMs){clear();return;}
      const reduced=getReducedMotion(),age=Math.max(0,at-incident.createdAt);
      let progress=0;
      if(incident.aborted)progress=Math.max(0,Math.min(1,(at-incident.exitAt)/c.abortExitMs));
      else if(incident.carried){
        const leaveAt=incident.pickupAt+c.pickupHoldMs;
        progress=Math.max(0,Math.min(1,(at-leaveAt)/(incident.createdAt+c.finishedAfterMs-leaveAt)));
        incident.phase=at<leaveAt?'pickup':'getaway';
      }
      if(reduced)progress=Math.floor(progress*4)/4;
      for(const [i,actor] of actors.entries()){
        const side=i?18:-18;
        if(!incident.carried && !incident.aborted){
          const t=reduced?age<c.pickupAfterMs?0:1:Math.min(1,age/c.pickupAfterMs);
          actor.x=actor.startX+(actor.targetX-actor.startX)*t;actor.y=actor.targetY;
        }else{
          actor.x=incident.origin.x+(incident.exit.x-incident.origin.x)*progress+side;
          actor.y=incident.origin.y-4+(incident.exit.y-incident.origin.y)*progress;
        }
        actor.carryMushroom=Boolean(incident.carried);actor.state=incident.phase;
      }
    }
    function eligibleLog(log,at) {
      return log?.type==='fallen_log' && Number.isInteger(log.id) && log.id>0
        && Number.isInteger(log.column) && log.column>=0 && log.column<garden.dimensions.columns
        && Number.isInteger(log.row) && log.row>=0 && log.row<garden.dimensions.rows
        && log.cell===log.row*garden.dimensions.columns+log.column
        && Number.isFinite(log.createdAt) && Number.isFinite(log.expiresAt)
        && at>=log.createdAt && at<log.expiresAt && source?.terrain?.byCell.get(log.cell)===log
        && source.terrain.logs.includes(log) && !source.byCell.has(log.cell);
    }
    function campfireCandidates(at=now(),simulatedOnly=false) {
      return (source?.terrain?.logs??[]).filter(log=>eligibleLog(log,at)&&(!simulatedOnly||log.simulated));
    }
    function startCampfire(at=now(),roll=random,simulatedOnly=false,candidates=null) {
      if(suspended||incident||livingCount(at)<config.minimumSpecimens)return false;
      candidates??=campfireCandidates(at,simulatedOnly);if(!candidates.length)return false;
      const log=candidates[Math.floor(roll()*candidates.length)];
      if(!eligibleLog(log,at)||simulatedOnly&&!log.simulated)return false;
      const origin={x:(log.column+.5)*garden.dimensions.cellSize,y:(log.row+.5)*garden.dimensions.cellSize+6};
      const exits=[{x:-36,y:origin.y},{x:996,y:origin.y},{x:origin.x,y:-36},{x:origin.x,y:636}];
      const exit=exits.reduce((a,b)=>Math.hypot(b.x-origin.x,b.y-origin.y)<Math.hypot(a.x-origin.x,a.y-origin.y)?b:a);
      incident={type:'gnome_campfire',phase:'approach',createdAt:at,lastTickAt:at,origin,exit,removals:0,
        target:{log,id:log.id,cell:log.cell,column:log.column,row:log.row,createdAt:log.createdAt,expiresAt:log.expiresAt},
        charred:false,consumed:false,consuming:false};
      const count=roll()<.5?2:3;
      actors=Array.from({length:count},(_,i)=>{
        const dx=[-27,27,6][i],dy=[-7,-7,25][i],x=Math.max(7,Math.min(953,origin.x+(i===0?-115:115))),y=Math.max(18,Math.min(580,origin.y+(i===2?95:-20)));
        return{type:'gnome',role:'camper',side:i===1?'red':'green',createdAt:at,state:'approach',x,y,startX:x,startY:y,
          targetX:Math.max(7,Math.min(953,origin.x+dx)),targetY:Math.max(18,Math.min(580,origin.y+dy))};
      });
      puddles.tick(actors,at);onCue('arrival');changed();return true;
    }
    function validCampfireTarget(at) {
      const t=incident?.target,log=t?.log;
      return Boolean(log && ['id','cell','column','row','createdAt','expiresAt'].every(k=>log[k]===t[k]) && eligibleLog(log,at));
    }
    function cancelCampfire(at) {clear();resetCadence(at);}
    function campfireClock(at) {
      if(at<incident.lastTickAt || at-incident.lastTickAt>campfireConfig.maxTickGapMs){cancelCampfire(at);return false;}
      if(at>=incident.createdAt+campfireConfig.finishedAfterMs){clear();return false;}
      if(!incident.consumed && !validCampfireTarget(at)){cancelCampfire(at);return false;}
      return true;
    }
    function tickCampfire(at) {
      if(!campfireClock(at))return;
      const current=incident,c=campfireConfig,age=at-current.createdAt;current.lastTickAt=at;
      if(!current.consumed && age>=c.consumeAfterMs){
        // Normal terrain notifications own occupancy/Sprite removal. Guard synchronous
        // observers, then release the exact source before any later occupant can arrive.
        current.consuming=true;
        const removed=source.terrain.remove(current.target.log,'gnome-campfire');
        if(incident!==current)return;
        current.consuming=false;
        if(!removed){cancelCampfire(at);return;}
        current.target=null;current.consumed=true;current.removals=1;current.phase='departure';current.leaveAt=at;changed();
      }else if(!current.consumed){
        const phase=age<c.gatherAfterMs?'approach':age<c.igniteAfterMs?'gather':'burning',charred=age>=c.charAfterMs;
        if(phase!==current.phase||charred!==current.charred){current.phase=phase;current.charred=charred;changed();}
      }
    }
    function advanceCampfire(at) {
      if(!campfireClock(at))return;
      const c=campfireConfig,reduced=getReducedMotion(),age=at-incident.createdAt;
      let progress=incident.consumed?Math.min(1,(at-incident.leaveAt)/(incident.createdAt+c.finishedAfterMs-incident.leaveAt)):Math.min(1,age/c.gatherAfterMs);
      if(reduced)progress=incident.consumed?Math.floor(progress*4)/4:progress<1?0:1;
      for(const actor of actors){
        actor.x=incident.consumed?actor.targetX+(incident.exit.x-incident.origin.x)*progress:actor.startX+(actor.targetX-actor.startX)*progress;
        actor.y=incident.consumed?actor.targetY+(incident.exit.y-incident.origin.y)*progress:actor.startY+(actor.targetY-actor.startY)*progress;
        actor.state=incident.phase;
      }
    }
    function eligibleWizardTarget(p,at){
      return Boolean(Number.isFinite(at)&&p&&wizardSpecies.includes(p.type)&&Number.isInteger(p.id)&&p.id>0
        &&Number.isInteger(p.column)&&p.column>=0&&p.column<garden.dimensions.columns
        &&Number.isInteger(p.row)&&p.row>=0&&p.row<garden.dimensions.rows&&p.cell===p.row*garden.dimensions.columns+p.column
        &&Number.isFinite(p.createdAt)&&at>=p.createdAt&&garden.lifecycleStage(p,at)==='mature'
        &&getSpecimens().includes(p)&&source?.specimens?.includes(p)&&occupiedBy(p)&&!source.terrain?.isBlocked(p.cell));
    }
    function wizardCandidates(at=now(),simulatedOnly=false){
      return getSpecimens().filter(p=>eligibleWizardTarget(p,at)&&(!simulatedOnly||p.origin?.kind==='simulated'));
    }
    function validWizardTarget(current,at){
      const t=current.target,p=t?.specimen;
      return Boolean(p&&['id','type','cell','column','row','createdAt'].every(k=>p[k]===t[k])&&eligibleWizardTarget(p,at));
    }
    const grassCellAllowed=(ecology,column,row)=>Boolean(ecology&&typeof source?.isCellOccupied==='function'&&Number.isInteger(column)&&column>=0&&column<garden.dimensions.columns
      &&Number.isInteger(row)&&row>=0&&row<garden.dimensions.rows
      &&(ecology.allowGrassUnderPlants||!source.isCellOccupied(column,row)));
    function startWizard(at=now(),roll=random,simulatedOnly=false,candidates=null){
      if(suspended||incident||!Number.isFinite(at)||livingCount(at)<config.minimumSpecimens)return false;
      candidates??=wizardCandidates(at,simulatedOnly);if(!candidates.length)return false;
      const p=candidates[Math.floor(roll()*candidates.length)];
      if(!eligibleWizardTarget(p,at)||simulatedOnly&&p.origin?.kind!=='simulated')return false;
      const ecology=getEcology(),cells=[];
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&grassCellAllowed(ecology,p.column+dx,p.row+dy))cells.push({column:p.column+dx,row:p.row+dy});
      const selected=cells.length?cells[Math.floor(roll()*cells.length)]:null;
      const grass=selected?{...selected,patch:ecology.grassCells.find(g=>g.column===selected.column&&g.row===selected.row)??null}:null;
      const origin={x:(p.column+.5)*30,y:(p.row+.5)*30},side=p.column===0?1:-1;
      const targetX=origin.x+side*22,targetY=Math.max(18,Math.min(580,origin.y+4));
      incident={type:'gnome_wizard',phase:'approach',createdAt:at,lastTickAt:at,origin,
        target:{specimen:p,id:p.id,type:p.type,cell:p.cell,column:p.column,row:p.row,createdAt:p.createdAt},
        grass,ecology,attempted:false,influenced:false,castAt:null};
      actors=[{type:'gnome',role:'wizard',side:'wizard',createdAt:at,state:'approach',
        x:Math.max(7,Math.min(953,targetX+side*100)),y:Math.max(18,Math.min(580,targetY+25)),
        startX:Math.max(7,Math.min(953,targetX+side*100)),startY:Math.max(18,Math.min(580,targetY+25)),
        targetX,targetY,exitX:Math.max(7,Math.min(953,targetX+side*90)),exitY:Math.max(18,Math.min(580,targetY+55))}];
      puddles.tick(actors,at);onCue('arrival');changed();return true;
    }
    function cancelWizard(at){const clock=now(),safe=Number.isFinite(at)?at:Number.isFinite(clock)?clock:incident?.lastTickAt??0;clear();resetCadence(safe);}
    function wizardClock(at){
      if(!Number.isFinite(at)||at<incident.lastTickAt||at-incident.lastTickAt>wizardConfig.maxTickGapMs){cancelWizard(at);return false;}
      if(at>=incident.createdAt+wizardConfig.finishedAfterMs){clear();return false;}
      if(!validWizardTarget(incident,at)){cancelWizard(at);return false;}return true;
    }
    function tickWizard(at){
      if(!wizardClock(at))return;
      const current=incident,c=wizardConfig,age=at-current.createdAt;current.lastTickAt=at;
      if(age>=c.castAfterMs&&!current.attempted){
        // Consume/release before the authoritative callback, including failed casts.
        const target=current.grass,ecology=current.ecology;current.attempted=true;current.castAt=at;current.grass=null;current.ecology=null;
        if(target&&getEcology()===ecology&&grassCellAllowed(ecology,target.column,target.row)
          &&Math.max(Math.abs(target.column-current.target.column),Math.abs(target.row-current.target.row))===1
          &&(ecology.grassCells.find(g=>g.column===target.column&&g.row===target.row)??null)===target.patch
          &&validWizardTarget(current,at)&&incident===current){
          const patch=ecology.influenceGrassCell(target.column,target.row,at);
          if(incident!==current)return;current.influenced=Boolean(patch);
        }
      }
      const phase=age<c.inspectAfterMs?'approach':age<c.raiseAfterMs?'inspect':age<c.castAfterMs?'raise':age<c.leaveAfterMs?'cast':'departure';
      if(phase!==current.phase){current.phase=phase;changed();}
    }
    function advanceWizard(at){
      if(!wizardClock(at))return;
      const c=wizardConfig,actor=actors[0],age=at-incident.createdAt,reduced=getReducedMotion(),leaving=age>=c.leaveAfterMs;
      let progress=Math.max(0,Math.min(1,leaving?(age-c.leaveAfterMs)/(c.finishedAfterMs-c.leaveAfterMs):age/c.inspectAfterMs));
      if(reduced)progress=Math.floor(progress*4)/4;
      actor.x=leaving?actor.targetX+(actor.exitX-actor.targetX)*progress:actor.startX+(actor.targetX-actor.startX)*progress;
      actor.y=leaving?actor.targetY+(actor.exitY-actor.targetY)*progress:actor.startY+(actor.targetY-actor.startY)*progress;
      actor.state=leaving?'departure':age<c.inspectAfterMs?'approach':age<c.raiseAfterMs?'inspect':age<c.castAfterMs?'raise':incident.attempted?'cast':'raise';
    }
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
    function startFuneral(at=now(),roll=random){
      if(suspended||incident||!Number.isFinite(at)||livingCount(at)<config.minimumSpecimens)return false;
      const direction=roll()<.5?1:-1,y=180+roll()*210;
      if(!Number.isFinite(y)||y<180||y>390)return false;
      incident={type:'gnome_funeral',phase:'entering',createdAt:at,lastTickAt:at,lastObservedAt:at,
        route:{direction,y},alpha:1};
      actors=funeralOffsets.map((offset,i)=>({type:'gnome',role:i<2?'pallbearer':'mourner',
        side:i<2?(offset*direction>0?'red':'green'):i===2?'red':'green',
        createdAt:at,state:'entering',offset,x:0,y:0,alpha:1,bows:i===3}));
      advanceFuneral(at);puddles.tick(actors,at);onCue('arrival');changed();return true;
    }
    function cancelFuneral(at){const clock=now(),safe=Number.isFinite(at)?at:Number.isFinite(clock)?clock:incident?.lastTickAt??0;clear();resetCadence(safe);}
    function funeralClock(at){
      if(!Number.isFinite(at)||at<incident.lastObservedAt||at-incident.lastTickAt>funeralConfig.maxTickGapMs){cancelFuneral(at);return false;}
      if(at>=incident.createdAt+funeralConfig.finishedAfterMs){clear();return false;}
      incident.lastObservedAt=at;return true;
    }
    function advanceFuneral(at){
      if(!funeralClock(at))return;
      const c=funeralConfig,age=at-incident.createdAt,reduced=getReducedMotion();
      let progress,center;
      if(age<c.enterAfterMs){progress=age/c.enterAfterMs;center=-36+(116+36)*(reduced?Math.floor(progress*4)/4:progress);}
      else if(age<c.pauseAfterMs){progress=(age-c.enterAfterMs)/(c.pauseAfterMs-c.enterAfterMs);center=116+(740-116)*(reduced?Math.floor(progress*12)/12:progress);}
      else if(age<c.leaveAfterMs)center=740;
      else{progress=(age-c.leaveAfterMs)/(c.finishedAfterMs-c.leaveAfterMs);center=740+72*(reduced?Math.floor(progress*4)/4:progress);}
      const phase=age<c.enterAfterMs?'entering':age<c.pauseAfterMs?'marching':age<c.leaveAfterMs?'ceremony':'departure';
      // Fade together rather than rushing the entire formation off the far edge.
      incident.alpha=age<c.leaveAfterMs?1:Math.max(0,1-(age-c.leaveAfterMs)/(c.finishedAfterMs-c.leaveAfterMs));
      const {direction,y}=incident.route,origin=direction===1?center:garden.dimensions.width-center;
      for(const actor of actors){actor.x=origin+actor.offset*direction;actor.y=y+7;actor.alpha=incident.alpha;
        actor.state=phase==='ceremony'?(actor.bows?'bow':'pause'):phase;}
      if(phase!==incident.phase){incident.phase=phase;changed();}
    }
    function tickFuneral(at){if(!funeralClock(at))return;incident.lastTickAt=at;advanceFuneral(at);}
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
    function clear() { puddles.clear(actors);actors = [];if(incident?.type==='gnome_campfire'||incident?.type==='gnome_wizard')incident.target=null;
      if(incident?.type==='gnome_wizard'){incident.grass=null;incident.ecology=null;}
      if(incident?.type==='gnome_funeral')incident.route=null;incident = null; changed(); }
    function advance(at = now(), roll = random) {
      if (!incident) return;
      if (incident.type === 'gnome_heist') { advanceHeist(at); return; }
      if (incident.type === 'gnome_campfire') { advanceCampfire(at); return; }
      if (incident.type === 'gnome_wizard') { advanceWizard(at); return; }
      if (incident.type === 'gnome_funeral') { advanceFuneral(at); return; }
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
      if (incident?.type === 'gnome_landscaping' || incident?.type === 'gnome_heist' || incident?.type === 'gnome_campfire' || incident?.type === 'gnome_wizard' || incident?.type === 'gnome_funeral') clear();
      else changed(); // Release transient water presentation while a dispute is hidden.
    }
    function tick(at = now(), roll = random, hidden = false) {
      if (hidden) { suspend(at); return; }
      if (incident) {
        if (incident.type === 'gnome_landscaping') tickLandscaping(at);
        else if (incident.type === 'gnome_heist') tickHeist(at);
        else if (incident.type === 'gnome_campfire') tickCampfire(at);
        else if (incident.type === 'gnome_wizard') tickWizard(at);
        else if (incident.type === 'gnome_funeral') tickFuneral(at);
        advance(at, roll); if(!suspended)puddles.tick(actors,at);return;
      }
      if (at < nextCheckAt) return;
      resetCadence(at); // One fresh check, never replay missed intervals.
      if (livingCount(at) >= config.minimumSpecimens && roll() < config.incidentChance) {
        const mushrooms=heistCandidates(at);
        if(mushrooms.length && roll()<heistConfig.incidentShare) startHeist(at,roll,false,mushrooms);
        else {
          const logs=campfireCandidates(at);
          if(logs.length && roll()<campfireConfig.incidentShare)startCampfire(at,roll,false,logs);
          else {
            const rare=wizardCandidates(at);
            if(rare.length&&roll()<wizardConfig.incidentShare)startWizard(at,roll,false,rare);
            else if(roll()<funeralConfig.incidentShare)startFuneral(at,roll);
            else start(at,roll);
          }
        }
      }
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
      if (incident.type === 'gnome_heist' && (at<incident.lastTickAt || at-incident.lastTickAt>heistConfig.maxTickGapMs
        || at>=incident.createdAt+heistConfig.finishedAfterMs || incident.aborted && at>=incident.exitAt+heistConfig.abortExitMs)) return false;
      if(incident.type==='gnome_campfire' && (at<incident.lastTickAt || at-incident.lastTickAt>campfireConfig.maxTickGapMs
        || at>=incident.createdAt+campfireConfig.finishedAfterMs || !incident.consumed&&!validCampfireTarget(at)))return false;
      if(incident.type==='gnome_wizard'&&(!Number.isFinite(at)||at<incident.lastTickAt||at-incident.lastTickAt>wizardConfig.maxTickGapMs
        ||at>=incident.createdAt+wizardConfig.finishedAfterMs||!validWizardTarget(incident,at)))return false;
      if(incident.type==='gnome_funeral'&&(!Number.isFinite(at)||at<incident.lastObservedAt||at-incident.lastTickAt>funeralConfig.maxTickGapMs
        ||at>=incident.createdAt+funeralConfig.finishedAfterMs))return false;
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
    return { start, startLandscaping, landscapingEligible, landscapingCandidates, startHeist, heistCandidates, startCampfire, campfireCandidates, startWizard, wizardCandidates, startFuneral, advance, tick, clear, resetCadence, suspend, livingCount, hitAt, click,
      specimenRemoved(specimen,at=now(),reason){if(incident?.type==='gnome_funeral'&&reason==='cleared')cancelFuneral(at);else if(incident?.type==='gnome_wizard'&&incident.target?.specimen===specimen)cancelWizard(at);},
      terrainRemoved(log,at=now()){if(incident?.type==='gnome_campfire'&&incident.target?.log===log&&!incident.consuming)cancelCampfire(at);},
      puddleRemoved(puddle){puddles.removed(puddle);if(actors.length)changed();},
      simulatePuddleEntry(actor){if(!actors.includes(actor))return false;puddles.armDemo(actor);return true;},
      get lastLandscapingAt() { return lastLandscapingAt; },
      get actors() { return actors; }, get incident() { return incident; }, get nextCheckAt() { return nextCheckAt; } };
  }
  function appearance(actor, at, reducedMotion = false) {
    const water = (typeof module !== 'undefined' && module.exports ? require('./garden-gnome-puddles.js') : window.PacketGardenGnomePuddles).reactionState(actor,at,reducedMotion);
    const surprised = at < (actor.surprisedUntil ?? -Infinity) || Boolean(water);
    const still = reducedMotion || surprised || actor.carrySack || actor.role === 'supervisor' || actor.role === 'carrier'
      || actor.role==='wizard'&&actor.state!=='approach'&&actor.state!=='departure'
      || (actor.role==='pallbearer'||actor.role==='mourner')&&(actor.state==='bow'||actor.state==='pause')
      || actor.role==='camper'&&actor.state!=='approach'&&actor.state!=='departure';
    const procession=actor.role==='pallbearer'||actor.role==='mourner';
    const step = still ? 0 : Math.sin((at - actor.createdAt) / (procession?330:actor.role==='wizard'?240:90)), battle = actor.state === 'battle' && !surprised;
    return { step, battle, surprised, water, mushroom:Boolean(actor.carryMushroom), sack:actor.role === 'carrier' && !actor.handedOff || Boolean(actor.carrySack),
      bounce:water ? water.bounce : surprised && !reducedMotion ? -3 : actor.state === 'celebrate' ? -Math.abs(step) * 4 : 0,
      clippers:actor.role === 'worker' && !actor.carrySack, closed:surprised || actor.state === 'snip' && (reducedMotion || step > 0),
      shove:battle ? step * (actor.side === 'green' ? 2 : -2) : 0, rotation:water ? water.rotation : battle ? step * .12 : 0,
      alpha:procession?actor.alpha:actor.state === 'flee' ? Math.max(0,1-(at-actor.createdAt-config.resultAfterMs)/(config.losersGoneAfterMs-config.resultAfterMs)) : 1 };
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
  const api = { config, landscapingConfig, overcrowdingConfig, harvestConfig, heistConfig, campfireConfig, wizardConfig, wizardSpecies, funeralConfig, funeralOffsets, reactionMs, createModel, appearance, presentation, sackArt, clipperLines };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.PacketGardenGnomes = api;
})();
