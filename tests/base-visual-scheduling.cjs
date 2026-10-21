// Aggregate visual deadlines using actual renderers and fake clocks. No sleeps.
const assert=require('node:assert/strict'),fs=require('node:fs');
const createGarden=require('./browser-garden.cjs');
function instrument(garden){
  const work={base:0,lookup:0,neighbor:0,compute:0,layouts:0};
  for(const key of Object.keys(work))garden.sandbox['visualCount'+key]=()=>work[key]++;
  garden.run(`const visualBase=rebuildGardenBase;rebuildGardenBase=now=>{visualCountbase();return visualBase(now)};
    const visualLookup=buildVineCellLookup;buildVineCellLookup=now=>{visualCountlookup();return visualLookup(now)};
    const visualNeighbor=vineNeighborAt;vineNeighborAt=(...args)=>{visualCountneighbor();return visualNeighbor(...args)};
    const visualCompute=computeNextBaseVisualChangeAt;computeNextBaseVisualChangeAt=now=>{visualCountcompute();return visualCompute(now)};`);
  const rect=garden.element('canvas').getBoundingClientRect;
  garden.element('canvas').getBoundingClientRect=()=>{work.layouts++;return rect()};
  work.reset=()=>{for(const key of Object.keys(work))if(typeof work[key]==='number')work[key]=0};
  return work;
}
const tick=(garden,ms=250)=>{garden.clock.now+=ms;garden.tick()};
const state=garden=>garden.run('JSON.stringify(gardenState)');
const perf=garden=>JSON.parse(garden.run('JSON.stringify(gardenPerf.snapshot())'));
function setup(garden,type='mixed'){
  garden.run(`const stableTypes=['flower','mushroom','broadleaf','vine','wirefern','weed','ghostbloom','crystalfungus','blackthorn'];
    gardenState.specimens=Array.from({length:640},(_,i)=>{
      const type='${type}'==='mixed'?stableTypes[i%stableTypes.length]:'${type}';
      return {type,column:i%columns,row:Math.floor(i/columns),createdAt:Date.now()-speciesConfig.get(type).timings.matureAfterMs-1000,vigor:i%4};
    });
    gardenState.grassCells=Array.from({length:640},(_,i)=>({column:i%columns,row:Math.floor(i/columns),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}));
    gardenState.puddles=[];drawGarden()`);
}
for(const type of ['mixed','vine','wirefern'])for(const storm of [false,true]){
  const garden=createGarden({search:'?perf=1'});setup(garden,type);
  if(storm)garden.run('Object.assign(weatherState,{level:"botnet_hurricane",eventsPerMinute:10000});updateWeatherAnimation();nextPuddleCheckAt=Date.now()+600000');
  const before=state(garden),start=garden.clock.now,work=instrument(garden);
  assert(garden.run('nextBaseVisualAt')>start+30000,'only a real future stage transition is pending');
  let copies=0,overlays=0;
  for(let frame=1;frame<=3600;frame++){
    garden.drawing.length=0;garden.frame(start+frame*1000/120);
    if(frame%30===0)garden.tick();
    copies+=garden.drawing.filter(call=>call[0]==='drawImage').length;
    overlays+=garden.drawing.filter(call=>call.surface==='overlay'&&call[0]==='clearRect').length;
  }
  assert.equal(work.base,0,`${type} ${storm?'hurricane':'quiet'}: zero rebuilds during 30s`);
  assert.equal(work.lookup,0);assert.equal(work.neighbor,0);assert.equal(work.compute,0,'no repeated deadline scans on logical ticks');
  assert.equal(work.layouts,0,'RAF and idle logical ticks add no layout reads');assert.equal(copies,0);
  assert.equal(overlays,storm?900:0,'unchanged 30FPS overlay cap');assert.equal(state(garden),before);
  assert.equal(garden.intervals.length,2);assert.equal(garden.element('#garden-score').textContent,'Score: 0');
}

// Every specimen renderer was audited as stage-based. Between boundaries it is static.
const species=createGarden(),work=instrument(species);
species.run('gardenState.grassCells=[]');
for(const type of species.run('Array.from(speciesConfig.keys()).filter(type=>type!=="stillbloom")')){
  const timings=species.run(`speciesConfig.get('${type}').timings`),times=Object.values(timings).sort((a,b)=>a-b);
  species.run(`gardenState.specimens=[{type:'${type}',column:4,row:3,createdAt:Date.now(),vigor:3}];drawGarden()`);
  const specimen=species.run('gardenState.specimens[0]'),created=specimen.createdAt;
  assert.equal(species.run('nextBaseVisualAt'),created+times[0]);
  for(let index=0;index<times.length;index++){
    const boundary=created+times[index];work.reset();species.clock.now=boundary-1;species.tick();assert.equal(work.base,0);
    species.drawing.length=0;species.clock.now=boundary;species.tick();assert.equal(work.base,1,`${type} exact boundary ${times[index]}`);
    if(index===times.length-1){assert.equal(species.run('gardenState.specimens.length'),0);assert.equal(species.run('nextBaseVisualAt'),null)}
    else assert.equal(species.run('nextBaseVisualAt'),created+times[index+1]);
  }
  work.reset();tick(species,1000);assert.equal(work.base,0,'no endless repaint after expiry');
}
// Compare scheduled species drawing with the same-age direct rendering, including color wrappers.
const equivalent=createGarden();equivalent.run('gardenState.grassCells=[]');
for(const type of equivalent.run('Array.from(speciesConfig.keys())')){
  equivalent.run(`gardenState.specimens=[{type:'${type}',column:4,row:3,createdAt:Date.now(),vigor:2,colorVariant:commonSpeciesColorVariant('${type}',2),broadleafVariant:'amber'}];drawGarden()`);
  const object=equivalent.run('gardenState.specimens[0]');equivalent.sandbox.compareSpecimen=object;
  equivalent.sandbox.originalAgeRender=equivalent.run(`speciesConfig.get('${type}').render`);
  const ages=Array.from(Object.values(equivalent.run(`speciesConfig.get('${type}').timings`))).filter(age=>age<equivalent.run(`speciesConfig.get('${type}').timings.expiredAfterMs`));
  for(const age of ages){
    equivalent.clock.now=object.createdAt+age;equivalent.drawing.length=0;
    equivalent.run(`speciesConfig.get('${type}').render(compareSpecimen,Date.now())`);
    const direct=equivalent.drawing.map(call=>Array.from(call));equivalent.sandbox.captureSameAge=()=>{};
    equivalent.run(`speciesConfig.get('${type}').render=(specimen,now)=>{captureSameAge();originalAgeRender(specimen,now)}`);
    let scheduled;
    equivalent.sandbox.captureSameAge=()=>{equivalent.drawing.length=0};
    equivalent.run('gardenBaseDirty=true;paintGardenBase()');scheduled=equivalent.drawing.map(call=>Array.from(call));
    assert.deepEqual(scheduled,direct,'scheduler preserves exact age/geometry/palette drawing');
    equivalent.run(`speciesConfig.get('${type}').render=originalAgeRender`);
  }
}

// Grass interpolation runs only while growing/fading. Stable mature turf does not paint.
const grass=createGarden({search:'?perf=1'}),grassWork=instrument(grass);
grass.run('gardenState.specimens=[];gardenState.grassCells=[{column:0,row:0,createdAt:Date.now(),lastInfluencedAt:Date.now()}];drawGarden()');
const born=grass.clock.now;
for(let second=1;second<=30;second++){
  grassWork.reset();grass.drawing.length=0;tick(grass,1000);assert.equal(grassWork.base,1);
  assert(grass.drawing.some(call=>call[0]==='quadraticCurveTo'),'growing grass remains visible');
}
assert.equal(grass.run('nextBaseVisualAt'),born+1200000);
grassWork.reset();for(let i=0;i<120;i++)tick(grass);assert.equal(grassWork.base,0);
grass.run('gardenState.grassCells[0].lastInfluencedAt=Date.now()-grassConfig.fadingAfterMs+4000;drawGarden()');
grassWork.reset();tick(grass,3999);assert.equal(grassWork.base,0);tick(grass,1);assert.equal(grassWork.base,1);
const fadeTrace=JSON.stringify(grass.drawing);grass.drawing.length=0;tick(grass,1000);
assert.notEqual(JSON.stringify(grass.drawing),fadeTrace);assert.equal(grass.run('nextBaseVisualAt'),grass.clock.now+1000);
grass.run('influenceGrassCell(0,0,Date.now())');grassWork.reset();grass.tick();assert.equal(grassWork.base,1);
assert.equal(grass.run('nextBaseVisualAt'),grass.clock.now+1200000,'reinfluence reschedules the stable mature fade');
grass.run('gardenState.grassCells[0].lastInfluencedAt=Date.now()-grassConfig.expiredAfterMs');grassWork.reset();grass.tick();
assert.equal(grassWork.base,1);assert.equal(grass.run('nextBaseVisualAt'),null);assert.equal(grass.run('gardenState.grassCells.length'),0);

// Meaningful puddle steps are analytic, deterministic, monotonic and anchored to each rebuild.
const puddles=createGarden({search:'?perf=1'}),waterWork=instrument(puddles);
puddles.run('gardenState.specimens=[];gardenState.grassCells=[]; const water=createStormPuddle(Date.now(),()=>.5);water.size=water.maxSize=36;drawGarden()');
const water=puddles.run('water'),waterStart=puddles.clock.now;
assert.equal(puddles.run('puddleVisualThresholds.size'),.5);assert.equal(puddles.run('puddleVisualThresholds.opacity'),.02);
const firstDeadline=puddles.run('nextBaseVisualAt');assert(firstDeadline>waterStart+30000);
waterWork.reset();for(let i=0;i<120;i++)tick(puddles);assert.equal(waterWork.base,0,'hold period is visually static');
assert.equal(puddles.run('nextBaseVisualAt'),firstDeadline);
puddles.sandbox.testWater=water;
const beforeWater=puddles.run('puddleVisualState(testWater,Date.now())');
waterWork.reset();puddles.clock.now=firstDeadline-1;puddles.tick();assert.equal(waterWork.base,0);
const beforeDue=puddles.run('puddleVisualState(testWater,Date.now())');assert(beforeWater.size-beforeDue.size<.5);
puddles.clock.now=Math.ceil(firstDeadline);puddles.drawing.length=0;puddles.tick();assert.equal(waterWork.base,1);
const afterWater=puddles.run('puddleVisualState(testWater,Date.now())');assert(Math.abs(36-afterWater.size-.5)<.001);
assert(puddles.drawing.some(call=>call[0]==='drawImage'&&call[4]>0),'cached water tile is redrawn at the existing deadline');
assert.equal(state(puddles).includes('testWater'),false);
let previous=afterWater.size,drainRebuilds=1;
while(puddles.run('gardenState.puddles.length')){
  const due=puddles.run('nextBaseVisualAt');assert(due!==null&&due>puddles.clock.now);
  waterWork.reset();puddles.clock.now=Math.ceil(due);puddles.tick();assert.equal(waterWork.base,1);drainRebuilds++;
  const size=puddles.run('puddleVisualState(testWater,Date.now()).size');assert(size<=previous);previous=size;
}
assert(drainRebuilds<100,'36px drain takes meaningful steps, not 480 one-second paints');
assert.equal(puddles.run('nextBaseVisualAt'),null);assert.equal(puddles.intervals.length,2);
const opacity=createGarden();opacity.run('gardenState.grassCells=[];const tiny=createStormPuddle(Date.now(),()=>.5);tiny.size=tiny.maxSize=1;drawGarden()');
assert(Math.abs(opacity.run('nextBaseVisualAt-Date.now()')-(30000+480000*.02/.38))<.001,'opacity bounds small-radius changes');
const growing=createGarden(),growWork=instrument(growing);growing.run('gardenState.grassCells=[];createStormPuddle(Date.now(),()=>.5);drawGarden()');
assert.equal(growing.run('nextBaseVisualAt-Date.now()'),937.5);growWork.reset();tick(growing,750);assert.equal(growWork.base,0);tick(growing,250);assert.equal(growWork.base,1);
const eight=createGarden();eight.run('gardenState.grassCells=[];for(let i=0;i<8;i++){const p=createStormPuddle(Date.now(),()=>.5);p.size=p.maxSize=36}drawGarden()');
assert.equal(eight.run('nextBaseVisualAt-Date.now()'),firstDeadline-waterStart,'eight identical puddles share one deadline');
const drainingEight=createGarden(),eightWork=instrument(drainingEight);
drainingEight.run('gardenState.grassCells=[];for(let i=0;i<8;i++){const p=createStormPuddle(Date.now(),()=>.5);p.size=p.maxSize=20+i;p.lastRefreshedAt=Date.now()-30000-i*5000}drawGarden()');
assert.equal(drainingEight.run('nextBaseVisualAt'),drainingEight.run('Math.min(...gardenState.puddles.map(p=>nextPuddleVisualChangeAt(p,Date.now())))'));
eightWork.reset();for(let i=0;i<240;i++)tick(drainingEight);
assert(eightWork.base>0&&eightWork.base<10,'eight asynchronous drains share a few meaningful paints, not 60 per-second paints');
assert.equal(eightWork.compute,eightWork.base);assert.equal(drainingEight.intervals.length,2);

// Multiple visual sources pick the earliest; earlier state changes repaint and recompute at once.
const mixed=createGarden(),mixedWork=instrument(mixed);
mixed.run('gardenState.grassCells=[];gardenState.specimens=[{type:"wirefern",column:0,row:0,createdAt:Date.now()-14000,vigor:0}];const mixWater=createStormPuddle(Date.now(),()=>.5);mixWater.size=16.5;mixWater.maxSize=18;mixWater.lastRefreshedAt=Date.now()-2000;gardenState.grassCells=[{column:1,row:0,createdAt:Date.now()-60000,lastInfluencedAt:Date.now()-grassConfig.fadingAfterMs+11000}];drawGarden()');
assert.equal(mixed.run('nextBaseVisualAt-Date.now()'),4000);mixedWork.reset();tick(mixed,4000);assert.equal(mixedWork.base,1);
assert.equal(mixed.run('nextBaseVisualAt-Date.now()'),5000,'puddle threshold reanchors to the just-rendered current size');
const oldDeadline=mixed.run('nextBaseVisualAt');mixed.emit(23,'wirefern',3);assert(mixedWork.base>1);
assert(mixed.run('nextBaseVisualAt')>=oldDeadline,'a real paint resets the threshold anchor safely');
mixedWork.reset();mixed.run('refreshStormPuddle(mixWater,Date.now())');mixed.tick();assert.equal(mixedWork.base,1);
assert(mixed.run('nextBaseVisualAt')>mixed.clock.now);
mixedWork.reset();mixed.resize({left:120,top:90,width:390,height:740});assert.equal(mixedWork.base,1);
mixedWork.reset();mixed.run('Object.assign(weatherState,{level:"rain",eventsPerMinute:500});updateWeatherAnimation()');assert.equal(mixedWork.base,1);
mixedWork.reset();mixed.run('updateWeatherAnimation()');assert.equal(mixedWork.base,0,'same soil state changes only overlay');
const early=createGarden(),earlyWork=instrument(early);
early.run('gardenState.grassCells=[];gardenState.specimens=[{type:"broadleaf",column:0,row:0,createdAt:Date.now()-61000,vigor:0}];drawGarden()');
const laterDeadline=early.run('nextBaseVisualAt');earlyWork.reset();tick(early,2000);assert.equal(earlyWork.base,0);
early.emit(23,'wirefern',2);assert(earlyWork.base>0,'state arrival before the deadline repaints immediately');
assert.equal(early.run('nextBaseVisualAt'),early.clock.now+18000);assert(early.run('nextBaseVisualAt')<laterDeadline);
const earlySource=early.run('gardenState.specimens.at(-1)'),origin=JSON.stringify(earlySource.origin),recent=early.run('JSON.stringify(gardenState.recentEvents)');
early.click((earlySource.column+.5)*30,(earlySource.row+.5)*30);assert.equal(early.element('#specimen-card-title').textContent,'Wirefern');
tick(early,18000);assert.equal(JSON.stringify(earlySource.origin),origin);assert.equal(early.run('JSON.stringify(gardenState.recentEvents)'),recent);
assert.equal(early.element('#garden-score').textContent,'Score: 0');
early.run('gardenState.specimens.at(-1).createdAt=Date.now()-360000');early.tick();
assert.equal(early.run('nextBaseVisualAt'),laterDeadline,'removing the earliest source removes its stale deadline');
early.intervals.find(timer=>timer.delay===1000).handler();assert.equal(early.element('#specimen-card').hidden,true);

// Vine connectivity changes exactly at growing, and removals erase connections immediately.
const vines=createGarden(),vineWork=instrument(vines);
vines.run('gardenState.grassCells=[];gardenState.specimens=[{type:"vine",column:0,row:0,createdAt:Date.now()-60000,vigor:0},{type:"vine",column:1,row:0,createdAt:Date.now()-19000,vigor:0}];drawGarden()');
assert.equal(vines.run('nextBaseVisualAt-Date.now()'),1000);vineWork.reset();tick(vines,999);assert.equal(vineWork.base,0);tick(vines,1);
assert.equal(vineWork.base,1);assert.equal(vines.run('buildVineCellLookup(Date.now()).size'),2);
vines.run('gardenState.specimens[1].createdAt=Date.now()-600000');vineWork.reset();vines.tick();assert.equal(vineWork.base,1);assert.equal(vines.run('buildVineCellLookup(Date.now()).size'),1);

// Hidden static scenes resume without a base paint; missed transitions reconcile once, never replay.
const hidden=createGarden({search:'?perf=1'});setup(hidden,'wirefern');const hiddenWork=instrument(hidden);
hidden.setHidden(true);tick(hidden,20000);assert.equal(hiddenWork.base,0);hidden.setHidden(false);assert.equal(hiddenWork.base,0);
hidden.setHidden(true);tick(hidden,250000);hiddenWork.reset();hidden.setHidden(false);assert.equal(hiddenWork.base,1);
assert(hidden.run('nextBaseVisualAt')>hidden.clock.now);assert.equal(hiddenWork.compute,1);
hidden.setHidden(true);tick(hidden,120000);hiddenWork.reset();hidden.setHidden(false);assert.equal(hiddenWork.base,1,'expiry/current grass once, not catch-up steps');
assert.equal(hidden.run('gardenState.specimens.length'),0);
const empty=createGarden({search:'?perf=1'});empty.run('gardenState.grassCells=[];drawGarden();gardenPerf.reset()');
assert.equal(empty.run('nextBaseVisualAt'),null);empty.tick();assert.equal(perf(empty).nextBaseVisualAt,null);
assert.match(empty.element('#garden-perf').textContent,/Next visual: none/);
const core=fs.readFileSync('wwwroot/garden.js','utf8'),terrain=fs.readFileSync('wwwroot/garden-puddles.js','utf8');
assert(!core.includes('slowVisualRefreshMs'));assert(!core.includes('slow-visual-refresh'));
assert(!/setTimeout|setInterval/.test(core.slice(core.indexOf('function nextSpecimenVisualChangeAt'),core.indexOf('function buildVineCellLookup'))));
assert(!/setTimeout|setInterval/.test(terrain));
console.log(`PASS: 640 mature mixed/vines/wireferns × quiet/hurricane × 30s -> zero recurring base rebuilds, deadline scans, layouts, lookup/neighbor work, or bitmap copies; storm remains 900 overlay paints. Stage visuals/continuous grass/analytic puddle thresholds (${drainRebuilds} paints across a 36px eight-minute drain)/earliest deadline/state changes/connectivity/hidden/expiry/inspection/score preserved.`);
