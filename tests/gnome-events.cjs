// Deterministic ambient-event checks with synthetic time and frame callbacks.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');

function createGarden() {
  const clock={now:0};
  const frames=new Map(), intervals=new Map(), windowHandlers=new Map(), drawing=[];
  let nextFrame=0;
  const elements=new Map(), sources=[];
  const context=new Proxy({}, {get:(_,method)=>(...args)=>drawing.push([method,...args]),
    set:(_,name,value)=>{drawing.push([name,value]);return true;}});
  const element=selector=>{
    if(!elements.has(selector)) elements.set(selector,{
      value:selector==='#weather-source'?'live':selector==='#weather-level'?'quiet':selector==='#sound-volume'?'12':'1200',
      handlers:{},addEventListener(name,handler){this.handlers[name]=handler;},setAttribute(){},
      getContext:()=>context,getBoundingClientRect:()=>({width:960,height:600})
    });
    return elements.get(selector);
  };
  class Source {
    constructor(){this.handlers={};sources.push(this);}
    addEventListener(name,handler){this.handlers[name]=handler;}
  }
  const sandbox={Date:{now:()=>clock.now},performance:{now:()=>clock.now},Math:Object.create(Math),
    document:{querySelector:element},EventSource:Source,ResizeObserver:class{observe(){}},
    window:{addEventListener(name,handler){windowHandlers.set(name,handler);},
      setInterval(handler,delay){intervals.set(intervals.size+1,{handler,delay});},setTimeout(){},clearTimeout(){},
      requestAnimationFrame(handler){frames.set(++nextFrame,handler);return nextFrame;},
      cancelAnimationFrame(id){frames.delete(id);}}
  };
  sandbox.Math.random=()=>0;
  vm.createContext(sandbox);
  for(const file of ['garden-audio.js','garden.js','garden-grass.js','garden-actors.js'])
    vm.runInContext(fs.readFileSync('wwwroot/'+file,'utf8'),sandbox);
  const run=code=>vm.runInContext(code,sandbox);
  const fill=count=>run(`gardenState.specimens=Array.from({length:${count}},(_,i)=>({type:'broadleaf',column:i%columns,row:Math.floor(i/columns),createdAt:Date.now(),vigor:0}))`);
  const advance=(age,roll=0)=>{
    clock.now=age;
    run(`updateAmbientEvents(${age},()=>${roll})`);
  };
  return {clock,frames,intervals,windowHandlers,drawing,sandbox,sources,element,run,fill,advance};
}

const garden=createGarden(), {run,clock,frames,intervals}=garden;
assert.equal(run('gardenState.actors.length'),0); assert.equal(run('gnomeIncident'),null);
assert.equal(frames.size,0,'no idle actor animation');
assert.equal(intervals.size,1,'scheduler reuses the existing garden interval');
assert.equal(run('ambientEventConfig.checkEveryMs'),45000);
assert.equal(run('ambientEventConfig.incidentChance'),0.02);
garden.fill(29); garden.advance(45000);
assert.equal(run('gnomeIncident'),null,'below thirty living specimens is ineligible');
assert.equal(run('nextAmbientCheckAt'),90000);
clock.now=90000; garden.fill(30); garden.advance(90000,0.02);
assert.equal(run('gnomeIncident'),null,'2% boundary is exclusive');
garden.advance(90001,0); assert.equal(run('gnomeIncident'),null,'cadence prevents an extra roll');
const specimenSnapshot=run('JSON.stringify(gardenState.specimens)');
const grassSnapshot=run('JSON.stringify(gardenState.grassCells)');
const weatherSnapshot=run('JSON.stringify(weatherState)');
garden.advance(135000,0);
assert.equal(run('gnomeIncident.type'),'gnome_incident');
assert.equal(run('gardenState.actors.length'),4);
assert.equal(run('gardenState.actors.filter(a=>a.side==="red").length'),2);
assert.equal(run('gardenState.actors.filter(a=>a.side==="green").length'),2);
assert(run('Math.min(...gardenState.actors.filter(a=>a.side==="red").map(a=>a.x))-Math.max(...gardenState.actors.filter(a=>a.side==="green").map(a=>a.x))>=gardenWidth/3'),'teams start well apart');
assert(run('gardenState.actors.every(a=>a.x>0&&a.x<gardenWidth&&a.y>0&&a.y<gardenHeight)'));
assert.equal(frames.size,1);
assert.equal(run('startGnomeIncident(135000,()=>0)'),false,'only one incident at a time');
assert.equal(run('gardenState.actors.length'),4);

const cues=[]; garden.sandbox.recordCue=stage=>cues.push(stage);
run('gardenSound.maybePlayGnomeSound=recordCue');
garden.advance(136500);
assert(run('gardenState.actors.every(a=>a.state==="approach"&&a.x!==a.startX&&a.x!==a.targetX)'));
garden.advance(138000);
assert(run('gardenState.actors.every(a=>a.state==="battle")'));
assert.deepEqual(cues,['battle']); garden.advance(138500); assert.deepEqual(cues,['battle'],'battle cue only once');
garden.advance(142000,0);
assert.equal(run('gnomeIncident.winner'),'green');
assert.equal(run('gardenState.actors.filter(a=>a.state==="celebrate").length'),2);
assert.equal(run('gardenState.actors.filter(a=>a.state==="flee").length'),2);
assert.deepEqual(cues,['battle','victory']);
garden.advance(142500,0.9); assert.equal(run('gnomeIncident.winner'),'green','winner never rerolls');
assert(run('gardenState.actors.filter(a=>a.state==="flee").every(a=>Math.abs(a.x-a.targetX)>0)'));
garden.advance(144000);
assert.equal(run('gardenState.actors.length'),2,'losers leave before winners');
assert(run('gardenState.actors.every(a=>a.side==="green"&&a.state==="celebrate")'));
garden.advance(146999); assert.equal(run('gardenState.actors.length'),2);
garden.advance(147000);
assert.equal(run('gardenState.actors.length'),0); assert.equal(run('gnomeIncident'),null);
assert.equal(frames.size,0,'completion cancels the active actor frame');
assert.equal(intervals.size,1,'no per-actor timers were introduced');
assert.equal(run('JSON.stringify(gardenState.specimens)'),specimenSnapshot,'actors never change specimens');
assert.equal(run('JSON.stringify(gardenState.grassCells)'),grassSnapshot,'actors never change grass');
assert.equal(run('JSON.stringify(weatherState)'),weatherSnapshot,'actors never change weather');
garden.advance(179999); assert.equal(run('gnomeIncident'),null);
clock.now=180000; garden.fill(30); garden.advance(180000,0);
garden.advance(187000,0.9); assert.equal(run('gnomeIncident.winner'),'red','another incident can choose the other winner');
garden.advance(192000); assert.equal(frames.size,0);

// Pauses consume at most one fresh check, and completed hidden incidents stay silent.
const paused=createGarden(); paused.clock.now=10000000; paused.fill(30);
let rolls=0; paused.sandbox.roll=()=>{rolls++;return 0.99;};
paused.run('updateAmbientEvents(Date.now(),roll)');
for(let i=0;i<10;i++) paused.run('updateAmbientEvents(Date.now(),roll)');
assert.equal(rolls,1,'no catch-up roll burst');
assert.equal(paused.run('nextAmbientCheckAt'),10045000);
assert.equal(paused.frames.size,0);
paused.clock.now=10045000; paused.run('updateAmbientEvents(Date.now(),roll)'); assert.equal(rolls,2);
const hidden=createGarden(); hidden.fill(30); hidden.advance(45000,0);
const hiddenCues=[]; hidden.sandbox.recordCue=stage=>hiddenCues.push(stage);
hidden.run('gardenSound.maybePlayGnomeSound=recordCue'); hidden.advance(1000000);
assert.equal(hidden.run('gardenState.actors.length'),0); assert.equal(hidden.frames.size,0);
assert.equal(hiddenCues.length,0,'no stale battle/victory audio after a paused incident');
const expired=createGarden(); expired.clock.now=45000; expired.fill(30);
expired.run('gardenState.specimens[0].createdAt=Date.now()-360000'); expired.advance(45000,0);
assert.equal(expired.run('gnomeIncident'),null,'expired specimens do not count toward eligibility');
assert.equal(expired.run('gardenState.specimens.length'),30,'eligibility never performs specimen updates');

// Actors consume world coordinates, never grid slots; malformed SSE is unrelated.
const full=createGarden(); full.fill(640); full.advance(45000,0);
assert.equal(full.run('gardenState.specimens.length'),640); assert.equal(full.run('gardenState.actors.length'),4);
full.run("spawnSpecimen('flower',null,3)");
assert.equal(full.run('gardenState.specimens.length'),640,'normal saturation rules remain independent');
assert.equal(full.run('gardenState.actors.length'),4);
const space=createGarden(); space.fill(30); space.advance(45000,0);
space.run('nextGrassSpreadAt=1000000'); space.run("spawnSpecimen('flower',null,0)");
assert.equal(space.run('gardenState.specimens.length'),31,'actors do not consume free specimen cells');
const malformed=createGarden(); malformed.fill(29);
malformed.sources[0].handlers.garden({data:'{'});
malformed.sources[0].handlers.garden({data:JSON.stringify({specimenType:'redbloom',listenPort:22})});
malformed.advance(45000,0); assert.equal(malformed.run('gnomeIncident'),null);

// Rendering remains in the garden transform, ahead of rain, across all stages.
const rendered=createGarden(); rendered.fill(30); rendered.advance(45000,0);
for(const age of [45000,48000,52000,53500]) {
  rendered.advance(age,0); rendered.drawing.length=0; rendered.run(`drawGardenActors(${age})`);
  assert(rendered.drawing.some(([method])=>method==='fill'));
  assert.equal(rendered.drawing.filter(([method])=>method==='save').length,rendered.drawing.filter(([method])=>method==='restore').length);
  assert(rendered.drawing.every(([, ...args])=>args.every(value=>typeof value!=='number'||Number.isFinite(value))));
}
const layers=[]; rendered.sandbox.mark=layer=>layers.push(layer);
rendered.run('drawGrass=()=>mark("grass"); speciesConfig.get("broadleaf").render=()=>mark("specimen"); drawGardenActors=()=>mark("actor"); drawRain=()=>mark("rain"); drawGarden()');
assert(layers.indexOf('grass')<layers.indexOf('specimen')&&layers.lastIndexOf('specimen')<layers.indexOf('actor')&&layers.indexOf('actor')<layers.indexOf('rain'));
const positions=space.run('JSON.stringify(gardenState.actors.map(a=>[a.x,a.y]))');
space.element('canvas').getBoundingClientRect=()=>({width:480,height:300}); space.run('drawGarden()');
assert.equal(space.run('JSON.stringify(gardenState.actors.map(a=>[a.x,a.y]))'),positions,'resizing does not change world positions');
space.clock.now=space.run('gnomeIncident.createdAt')+12000;
const [frame,callback]=space.frames.entries().next().value; space.frames.delete(frame); callback();
assert.equal(space.frames.size,0,'last animation callback schedules no successor');
assert.equal(space.run('gnomeIncident'),null);
full.windowHandlers.get('pagehide')(); assert.equal(full.frames.size,0,'page departure cancels actor animation');
const reload=createGarden(); assert.equal(reload.run('gardenState.actors.length'),0); assert.equal(reload.frames.size,0);
const tick=createGarden(); tick.clock.now=45000; tick.fill(30);
tick.intervals.get(1).handler();
assert.equal(tick.run('gardenState.actors.length'),4,'existing update tick drives ambient eligibility');
tick.clock.now=57000; tick.intervals.get(1).handler();
assert.equal(tick.run('gardenState.actors.length'),0);
assert.equal(tick.frames.size,0,'existing update tick also clears a completed incident');
console.log('PASS: gnome eligibility/cadence/chance, one four-actor incident, separated teams, deterministic stages/winners, early loser exit, cleanup/reload/pause handling, occupancy/grass/weather/SSE independence, render order/resize.');
