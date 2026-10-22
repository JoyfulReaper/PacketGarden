// Actual production instrumentation and fake performance clocks, without sleeps.
const assert=require('node:assert/strict'),fs=require('node:fs');
const createGarden=require('./browser-garden.cjs');
const snapshot=garden=>JSON.parse(garden.run('JSON.stringify(gardenPerf.snapshot())'));
const state=garden=>garden.run('JSON.stringify([gardenState,weatherState])');
const tick=(garden,ms=250)=>{garden.clock.now+=ms;garden.tick()};
const weather=garden=>garden.run('Object.assign(weatherState,{level:"botnet_hurricane",eventsPerMinute:10000});updateWeatherAnimation()');
let observers=0,callback,observed,disconnected=0;
class Observer {
  static supportedEntryTypes=['longtask'];
  constructor(handler){observers++;callback=handler}
  observe(options){observed=options}
  disconnect(){disconnected++}
}
for(const search of ['', '?perf=0','?perf=11','?debugPerf=1','?x=perf=1']){
  const off=createGarden({search,PerformanceObserver:Observer});
  assert.equal(off.run('gardenPerf'),null);assert.equal(off.element('#garden-perf').hidden,true);
  assert.equal(off.element('#garden-perf').textContent,'');assert.equal(off.intervals.length,2);
}
assert.equal(observers,0,'disabled mode constructs no observer');
const garden=createGarden({search:'?perf=1',PerformanceObserver:Observer});
assert.equal(observers,1);assert.equal(observed.type,'longtask');assert.equal(observed.buffered,false);
assert.equal(garden.element('#garden-perf').hidden,false);assert.equal(garden.intervals.length,2);
assert.equal(snapshot(garden).counts.baseRebuilds,1);assert(snapshot(garden).lastReasons.includes('initial'));
callback({getEntries:()=>[{duration:61,name:'DO_NOT_RETAIN',attribution:'DO_NOT_RETAIN'},{duration:85}]});
assert.equal(snapshot(garden).counts.longTasks,2);assert.equal(snapshot(garden).counts.longestLongTask,85);
assert(!JSON.stringify(snapshot(garden)).includes('DO_NOT_RETAIN'));
for(const PerformanceObserver of [undefined,class {static supportedEntryTypes=[];constructor(){throw new Error('unsupported')}},class {static supportedEntryTypes=['longtask'];constructor(){throw new Error('unavailable')}}]){
  const optional=createGarden({search:'?perf=1',PerformanceObserver});
  assert.equal(snapshot(optional).longTaskSupported,false,'unsupported/failed observer does not break profiling');
  tick(optional);assert.match(optional.element('#garden-perf').textContent,/Long tasks unsupported/);
}
assert(createGarden({search:'?x=1&perf=1&y=2'}).run('gardenPerf'));

// Profiling changes neither drawing commands nor ecology, source behavior, or FPS.
const normal=createGarden(), enabled=createGarden({search:'?perf=1'});
for(const check of [normal,enabled]){
  check.emit(3389,'vine',2);check.emit(23,'wirefern',3);check.forceRoll(0);check.emit();
  check.run('createFirstSeenCuriosity(gardenState.specimens[0],()=>.875); scheduleLooseDrop(gardenState.specimens[1],"amanita_muscaria",()=>.5,Date.now()-5000);updateLooseDrops()');
  weather(check);check.clock.now+=3000;check.tick();
  check.drawing.length=0;check.run('drawGarden()');
}
assert.equal(state(enabled),state(normal));assert.deepEqual(enabled.drawing,normal.drawing);
assert.equal(enabled.sources.length,1);assert.equal(enabled.sources[0].handlers.get('garden').length,1);
assert.equal(enabled.run('gardenBaseContext===gardenOverlayContext'),false);
assert.equal(enabled.run('rendererConfig.animationFps'),30);
assert.equal(enabled.run('rendererConfig.continuousVisualRefreshMs'),1000);
enabled.run('gardenPerf.reset()');normal.drawing.length=enabled.drawing.length=0;
let paintCount=0;const start=enabled.clock.now;
for(let i=1;i<=120;i++){
  for(const check of [normal,enabled])check.frame(start+i*1000/120);
  assert.deepEqual(enabled.drawing,normal.drawing);assert(enabled.drawing.every(call=>call.surface==='overlay'));
  paintCount+=enabled.drawing.filter(call=>call[0]==='clearRect').length;
  assert(!enabled.drawing.some(call=>call[0]==='drawImage'));
  normal.drawing.length=enabled.drawing.length=0;
}
const frames=snapshot(enabled);
assert.equal(paintCount,30);assert.equal(frames.counts.overlayPaints,30);assert.equal(frames.counts.baseRebuilds,0);
assert.equal(frames.counts.fpsSkips,90,'intentional 120Hz opportunities skipped by unchanged 30FPS cap');
assert.equal(frames.counts.rainStreaks,12000);assert.equal(frames.overlay.rainStreaks.last,400);
assert.equal(frames.counts.panelUpdates,0,'no diagnostics DOM updates from RAF');
assert.equal(state(enabled),state(normal));

// Positive durations from an injected monotonic clock prove every timing bucket is exercised.
let measuredTime=0;garden.sandbox.performance.now=()=>measuredTime+=1;
garden.run(`gardenState.specimens=Array.from({length:640},(_,i)=>({type:i%3===0?'vine':i%3===1?'wirefern':'broadleaf',column:i%columns,row:Math.floor(i/columns),createdAt:Date.now()-60000,vigor:i%4}));
 gardenState.grassCells=Array.from({length:640},(_,i)=>({column:i%columns,row:Math.floor(i/columns),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}));
 for(let i=0;i<8;i++)createStormPuddle(Date.now(),()=>.5);
 for(let i=0;i<3;i++){createFirstSeenCuriosity(gardenState.specimens[i],()=>.875);scheduleLooseDrop(gardenState.specimens[i],'amanita_muscaria',()=>.5,Date.now()-5000)}updateLooseDrops();
 gardenState.specimens[10].mutation={type:'collectible_weed',createdAt:Date.now(),expiresAt:Date.now()+20000};
 startGnomeIncident(Date.now(),()=>.5);gardenPerf.reset();drawGarden()`);
const measured=snapshot(garden);
for(const key of ['total','setup','soil','grass','puddles','specimens','vines','wireferns','otherSpecies','lookup'])assert(measured.base[key].last>0,`${key} base timing`);
for(const key of ['total','setup','mutations','actors','curiosities','drops','rain'])assert(measured.overlay[key].last>0,`${key} overlay timing`);
assert.equal(measured.counts.baseRebuilds,1);assert.equal(measured.counts.vineLookupBuilds,1);
assert.equal(measured.counts.vinesRendered,214);assert.equal(measured.counts.wirefernsRendered,212,'one wirefern is in the independent mutation layer');
assert.equal(measured.counts.vineNeighborChecks,214*8);
assert.equal(measured.counts.baseOver16,1);assert.equal(measured.counts.baseOver33,1);
assert.equal(measured.counts.longestBase,measured.base.total.last);
assert.deepEqual(measured.lastReasons,['state-change']);
garden.sandbox.performance.now=()=>measuredTime+=10;
garden.run('drawGardenOverlay(true)');
assert.equal(snapshot(garden).counts.overlayOver16,1);assert.equal(snapshot(garden).counts.overlayOver33,1);
assert.equal(snapshot(garden).counts.longestOverlay,snapshot(garden).overlay.total.max);

// Reasons preserve overlapping invalidations and isolate deadline-only visual work.
garden.sandbox.performance.now=()=>garden.clock.now;
garden.run('gardenState.grassCells[0].createdAt=Date.now();drawGarden();gardenPerf.reset()');tick(garden,1000);
let data=snapshot(garden);assert.deepEqual(data.lastReasons,['visual-deadline']);
assert.equal(data.counts.deadlineOnlyRebuilds,1);assert.equal(data.samples.deadlineOnly,1);
garden.run('gardenEcology.removeGrassCell(31,19)');tick(garden,1000);
data=snapshot(garden);assert(data.lastReasons.includes('grass-change'));assert(data.lastReasons.includes('visual-deadline'));
assert.equal(data.counts.deadlineOnlyRebuilds,1,'mixed causes are not counted as solely deadline refresh');
garden.run('refreshStormPuddle(gardenState.puddles[0],Date.now())');tick(garden);
assert(snapshot(garden).lastReasons.includes('puddle-change'));
garden.run('Object.assign(weatherState,{level:"rain",eventsPerMinute:500});updateWeatherAnimation()');
assert(snapshot(garden).lastReasons.includes('weather-soil'));
const expiredSource=garden.run('gardenState.specimens[0]');garden.sandbox.expiredSource=expiredSource;
garden.run('expiredSource.createdAt=Date.now()-600000');tick(garden);
assert(snapshot(garden).lastReasons.includes('specimen-change'));

// All DOM work is one bounded text replacement at 2Hz on the existing tick.
const panel=createGarden({search:'?perf=1'});panel.run('gardenPerf.reset()');
let textWrites=0,textValue=panel.element('#garden-perf').textContent;
Object.defineProperty(panel.element('#garden-perf'),'textContent',{get:()=>textValue,set:value=>{textWrites++;textValue=value}});
const before=panel.run('gardenPerf.snapshot().counts.baseRebuilds');
panel.tick();panel.tick();assert.equal(textWrites,1);
for(let i=0;i<20;i++)tick(panel,100);
assert.equal(textWrites,5);assert.equal(snapshot(panel).counts.panelUpdates,5);
assert.equal(snapshot(panel).counts.baseRebuilds-before,2,'only growing grass deadlines, no panel invalidation');
assert.match(textValue,/last 120 samples/);assert.match(textValue,/Canvas CSS/);assert.match(textValue,/not proof of GC/);assert.match(textValue,/Longest RAF gap/);
panel.run('gardenState.grassCells=[];drawGarden();gardenPerf.reset()');
for(let i=0;i<8;i++)tick(panel);
assert.equal(snapshot(panel).counts.baseRebuilds,0,'empty quiet diagnostics do not cause renders');

// Actual layout/backing work only; duplicate resizes do not resize or repaint again.
const resize=createGarden({search:'?perf=1'});resize.emit(23,'wirefern');resize.run('gardenPerf.reset()');
const resizeState=state(resize);let reads=0;const rect=resize.element('canvas').getBoundingClientRect;
resize.element('canvas').getBoundingClientRect=()=>{reads++;return rect()};
resize.resize({left:120,top:90,width:390,height:740});data=snapshot(resize);
assert.equal(data.counts.baseRebuilds,1);assert.equal(data.counts.backingResizes,2);assert.equal(data.counts.backingWrites,4);
assert.equal(data.counts.layoutReads,reads);assert.deepEqual(data.lastReasons,['resize']);
resize.resize({left:120,top:90,width:390,height:740});data=snapshot(resize);
assert.equal(data.counts.baseRebuilds,1);assert.equal(data.counts.backingResizes,2);assert.equal(data.counts.layoutReads,reads);
assert.equal(state(resize),resizeState);
const specimen=resize.run('gardenState.specimens[0]');resize.click((specimen.column+.5)*30,(specimen.row+.5)*30);
assert.equal(resize.element('#specimen-card-title').textContent,'Wirefern');assert.equal(snapshot(resize).counts.layoutReads,reads);

// Hidden pages stop frames/text and reconcile once; suspension is not a giant RAF-gap sample.
weather(resize);resize.frame(resize.clock.now+40);resize.run('gardenPerf.reset()');resize.setHidden(true);
const hiddenState=state(resize);resize.drawing.length=0;tick(resize,5000);
assert.equal(resize.frames.size,0);assert.equal(resize.drawing.length,0);assert.equal(snapshot(resize).counts.panelUpdates,0);
resize.setHidden(false);assert.equal(resize.frames.size,1);assert.equal(snapshot(resize).counts.baseRebuilds,1);
assert.equal(snapshot(resize).counts.overlayPaints,1);assert(snapshot(resize).lastReasons.includes('resume'));
resize.frame(resize.clock.now+40);assert.equal(snapshot(resize).counts.rafGapsOver50,0);
assert.equal(state(resize),hiddenState);
resize.frame(resize.clock.now+80);assert.equal(snapshot(resize).counts.rafGapsOver50,1,'a live long RAF gap is a clue');
resize.run('gardenPerf.reset();gardenPerf.raf(performance.now())');
resize.clock.now+=50;resize.run('drawGarden()');resize.clock.now+=50;resize.run('gardenPerf.raf(performance.now())');
assert.equal(snapshot(resize).counts.rafGapsWithBase,1,'a base completion in the gap is recorded as association only');
resize.run('gardenPerf.reset();gardenPerf.raf(performance.now())');
const earlierFrameTimestamp=resize.clock.now+60;
resize.clock.now+=80;resize.run('drawGarden()');resize.clock.now+=20;
resize.run(`gardenPerf.raf(${earlierFrameTimestamp})`);
assert.equal(snapshot(resize).counts.rafGapsWithBase,1,'RAF frame timestamps may precede base completion; observed callbacks share the timing clock');

// Ring buffers overwrite in place, with no event/provenance fields or bitmap operations.
const bounded=createGarden({search:'?perf=1'});bounded.emit(23,'wirefern');weather(bounded);bounded.run('gardenPerf.reset()');
const boundedState=state(bounded);
for(let i=0;i<500;i++){
  bounded.run('drawGarden();gardenPerf.raf(performance.now());gardenPerf.updatePanel()');bounded.drawing.length=0;
}
data=snapshot(bounded);assert.equal(data.samples.base,120);assert.equal(data.samples.overlay,120);assert.equal(data.samples.rafGaps,120);
assert.equal(data.counts.baseRebuilds,500);assert.equal(data.counts.overlayPaints,500);
assert.equal(data.counts.panelUpdates,1);assert.equal(state(bounded),boundedState);
bounded.run('gardenState.grassCells[0].lastInfluencedAt=Date.now()-grassConfig.fadingAfterMs;drawGarden()');
// Fill the deadline-only ring independently of natural additions/spread.
bounded.run('gardenEcology.tickGrass=at=>gardenEcology.removeExpiredGrass(at)');
for(let i=0;i<130;i++)tick(bounded,1000);assert.equal(snapshot(bounded).samples.deadlineOnly,120);
assert(!JSON.stringify(data).includes('garden-test'),'diagnostics contain no safe provenance either');
const source=fs.readFileSync('wwwroot/garden-perf.js','utf8');
assert(!/setInterval|setTimeout|requestAnimationFrame|drawImage|localStorage|sessionStorage|fetch\(|sendBeacon/.test(source));
// Keep the existing dense storm guarantees while profiling is enabled, for both species.
for(const type of ['vine','wirefern']){
  const dense=createGarden({search:'?perf=1'});
  dense.run(`gardenState.specimens=Array.from({length:640},(_,i)=>({type:'${type}',column:i%columns,row:Math.floor(i/columns),createdAt:Date.now()-60000,vigor:i%4}));
    gardenState.grassCells=Array.from({length:640},(_,i)=>({column:i%columns,row:Math.floor(i/columns),createdAt:Date.now()-60000,lastInfluencedAt:Date.now()}));
    for(let i=0;i<8;i++)createStormPuddle(Date.now(),()=>.5);drawGarden()`);
  weather(dense);
  dense.run('for(let i=0;i<3;i++){createFirstSeenCuriosity(gardenState.specimens[i],()=>.875);scheduleLooseDrop(gardenState.specimens[i],"amanita_muscaria",()=>.5,Date.now()-5000)}updateLooseDrops();startGnomeIncident(Date.now(),()=>.5);gardenPerf.reset()');
  const denseStart=dense.clock.now;let bitmapCopies=0,waterTiles=0;
  for(let frame=1;frame<=120;frame++){
    dense.drawing.length=0;dense.frame(denseStart+frame*1000/120);if(frame%30===0)dense.tick();
    bitmapCopies+=dense.drawing.filter(call=>call[0]==='drawImage'&&call.surface==='overlay').length;
    waterTiles+=dense.drawing.filter(call=>call[0]==='drawImage'&&call.surface==='base').length;
  }
  const work=snapshot(dense);
  assert.equal(work.counts.baseRebuilds,1);assert.equal(work.counts.overlayPaints,30);assert.equal(bitmapCopies,0);
  assert.equal(waterTiles,8,'finite puddle tiles only submit on the single cached-base deadline');
  assert.equal(work.counts.vineLookupBuilds,1);assert.equal(work.counts.vineNeighborChecks,type==='vine'?5120:0);
  assert.equal(type==='vine'?work.counts.vinesRendered:work.counts.wirefernsRendered,640);
}
garden.windowHandlers.get('pagehide')[0]();assert.equal(disconnected,1);
console.log('PASS: opt-in/local diagnostics; unchanged ecology/weather/canvases/FPS/hits/hidden behavior; all timing buckets, reasons/deadline-only refresh, next deadline, vine/wire/rain counters, exact layout/resize counts, optional long-task clues, 120-sample bounds, 2Hz single panel updates, no new timers/bitmap copies.');
