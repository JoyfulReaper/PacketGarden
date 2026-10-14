// Exact production species/color/SSE/render paths with fake time; no timing benchmarks.
const assert = require('node:assert/strict');
const createGarden = require('./browser-garden.cjs');
const garden = createGarden(), run = garden.run;
const json = expression => run(`JSON.stringify(${expression})`);
const methods = (trace, name) => trace.filter(call => call[0] === name);
assert.equal(run('speciesConfig.has("wirefern")'),true);
assert.equal(json('wirefernTimings'),JSON.stringify({growingAfterMs:18000,matureAfterMs:50000,fadingAfterMs:300000,expiredAfterMs:360000}));
assert.equal(run('speciesConfig.get("wirefern").singular'),'wirefern');
assert.equal(run('speciesConfig.get("wirefern").plural'),'wireferns');
assert.equal(run('protectedSpecimenTypes.has("wirefern")'),false,'ordinary unprotected species');
assert.equal(json('speciesColorVariants.get("wirefern").common.map(color=>color.name)'), '["phosphor","moss","cyan","amber"]');
assert.equal(run('speciesColorVariants.get("wirefern").rare.name'),'afterglow');
assert.equal(run('speciesColorVariants.get("wirefern").rareChance'),0.01);
for(const [vigor,color] of ['phosphor','moss','cyan','amber'].entries()) {
  assert.equal(run(`chooseSpeciesColorVariant('wirefern',${vigor},false,.5)`),color);
  assert.equal(run(`chooseSpeciesColorVariant('wirefern',${vigor},false,.009999)`),'afterglow');
  assert.equal(run(`chooseSpeciesColorVariant('wirefern',${vigor},false,.01)`),color);
  assert.equal(run(`chooseSpeciesColorVariant('wirefern',0,true,${.01+.99*(vigor+.5)/4})`),color);
}
assert.equal(run('commonSpeciesColorVariant("wirefern",undefined)'),'phosphor');

// Draw the actual procedural species with randomness and connectivity poisoned.
garden.sandbox.Math.random=()=>{throw new Error('rendering must not reroll color or connect neighbors')};
run('const priorWireLookup=buildVineCellLookup, priorWireNeighbor=vineNeighborAt; buildVineCellLookup=()=>{throw new Error("wirefern used vine lookup")}; vineNeighborAt=()=>{throw new Error("wirefern used neighbors")}');
function trace(vigor,age,colored=false,color='phosphor') {
  garden.drawing.length=0;
  run(`${colored?'speciesConfig.get("wirefern").render':'drawWirefern'}({type:'wirefern',column:4,row:3,createdAt:0,vigor:${vigor},colorVariant:'${color}'},${age})`);
  return [...garden.drawing];
}
let previousTips=0,previousLines=0,previousWidth=0;
for(const vigor of [0,1,2,3]){
  const drawing=trace(vigor,50000), tips=methods(drawing,'fillRect').length, lines=methods(drawing,'lineTo').length;
  assert(tips>previousTips && lines>previousLines,'each vigor level adds bounded fronds and terminal tips');
  const width=methods(drawing,'lineWidth')[0][1];assert(width>previousWidth && width<=1.71);
  previousTips=tips;previousLines=lines;previousWidth=width;
  assert.equal(tips,2*(3+vigor)+1);assert(lines<=56,'bounded branch work');
  assert.deepEqual(methods(drawing,'translate').map(call=>Array.from(call)),[['translate',135,105]]);
  assert.deepEqual(methods(drawing,'scale').map(call=>Array.from(call)),[['scale',1,1]],'vigor does not zoom specimen');
  for(const call of drawing){
    if(['moveTo','lineTo'].includes(call[0]))assert(Math.abs(call[1])<=14&&Math.abs(call[2])<=14);
    if(call[0]==='fillRect')assert(call[1]>=-14&&call[2]>=-14&&call[1]+call[3]<=14&&call[2]+call[4]<=14);
  }
  assert.equal(methods(drawing,'bezierCurveTo').length,0,'no sprawling vine connectors');
  assert.equal(methods(drawing,'ellipse').length,0,'fronds are not copies of broad leaves');
  assert.equal(methods(drawing,'save').length,methods(drawing,'restore').length);
  assert.deepEqual(trace(vigor,50000),drawing,'stable procedural art at the same age');
}
for(const [age,size] of [[0,.4],[17999,.4],[18000,.7],[49999,.7],[50000,1],[299999,1],[300000,.65],[359999,.65]]){
  const drawing=trace(3,age);
  assert.equal(methods(drawing,'scale')[0][1],size);
  assert(drawing.some(call=>call[0]==='strokeStyle'&&call[1]===(age>=300000?'#827b52':'#65b975')));
}
assert.equal(trace(3,360000).length,0);
assert.equal(trace(0,50000).some(call=>call[0]==='shadowBlur'),false,'default phosphor has no extra glow work');
const glowing=trace(3,50000,true,'afterglow');
assert(glowing.some(call=>call[0]==='shadowColor'&&call[1]==='#caffec'));
assert(glowing.some(call=>call[0]==='shadowBlur'&&call[1]===7),'existing bounded rare cosmetic glow');
assert(glowing.some(call=>call[0]==='filter'&&call[1].includes('brightness(1.4)')));
run('buildVineCellLookup=priorWireLookup;vineNeighborAt=priorWireNeighbor');garden.sandbox.Math.random=()=>.5;

// The existing SSE trusts backend species, attaches exact provenance, and uses generic UI paths.
const grassBefore=json('gardenState.grassCells');
garden.sources[0].emit({specimenType:'wirefern',listenPort:23,vigor:3,sensor:'wirefern-test',seenCount:'12'});
const source=run('gardenState.specimens[0]'), original=json('gardenState.specimens[0]');
assert.equal(source.type,'wirefern');assert.equal(source.colorVariant,'amber');
assert.equal(json('gardenState.grassCells'),grassBefore);
assert.match(garden.element('#garden-status').textContent,/1 wirefern(?:,|$)/);
assert.match(garden.element('canvas').attributes['aria-label'],/1 wirefern(?:,|$)/);
assert.equal(run('gardenState.recentEvents[0].specimenType'),'wirefern');
assert.match(garden.element('#recent-event-0').textContent,/:23 · wirefern · seen 12/);
assert.equal(run('pendingLooseDrops.size'),0);assert.equal(run('gardenState.drops.length'),0);
assert.equal(source.pendingMutation,undefined);assert.equal(source.mutation,undefined);
garden.click((source.column+.5)*30,(source.row+.5)*30);
for(const [selector,text] of [['#specimen-card-title','Wirefern'],['#specimen-source','Live TCPNoise'],['#specimen-sensor','wirefern-test'],['#specimen-port','23'],['#specimen-seen-count','12'],['#specimen-vigor','3 — persistent'],['#specimen-color','Amber'],['#specimen-age','0s'],['#specimen-mutation','None']])assert.equal(garden.element(selector).textContent,text);
garden.sources[0].emit({specimenType:'wirefern',listenPort:2323,vigor:0,sensor:'wirefern-test',seenCount:'1'});
assert.equal(run('gardenState.specimens[1].colorVariant'),'phosphor');
assert.equal(run('gardenState.curiosities.length'),1,'generic first-seen effect retained');
assert.equal(run('gardenState.curiosities[0].origin.x'),run('(gardenState.specimens[1].column+.5)*cellSize'));
assert.equal(json('gardenState.grassCells'),grassBefore);
assert.equal(run('pendingLooseDrops.size'),0);assert.match(garden.element('#garden-status').textContent,/2 wireferns/);
garden.element('#fake-ssh').handlers.get('click')[0]();assert.equal(run('gardenState.specimens.at(-1).type'),'vine');
garden.sources[0].emit({specimenType:'vine',listenPort:3389,vigor:0});
garden.sources[0].emit({specimenType:'vine',listenPort:5900,vigor:0});assert.equal(run('gardenState.specimens.at(-1).type'),'vine');
// Lifecycle and resize never reroll the exact wirefern's scheme.
garden.sandbox.stableWirefern=source;
for(const age of [0,18000,50000,300000,359999])run(`speciesConfig.get('wirefern').render(stableWirefern,stableWirefern.createdAt+${age})`);
garden.resize({left:120,top:90,width:390,height:740});assert.equal(json('stableWirefern'),original);
garden.click((source.column+.5)*30,(source.row+.5)*30);assert.equal(garden.element('#specimen-card-title').textContent,'Wirefern');
run('gardenState.specimens[0].createdAt=Date.now()-360000');garden.tick();
garden.intervals.find(timer=>timer.delay===1000).handler();
assert.equal(run('gardenState.specimens.includes(stableWirefern)'),false);assert.equal(garden.element('#specimen-card').hidden,true);

// Normal clustering and full-grid strength use existing rules, with no special protection.
const full=createGarden();full.fill(0);full.emit(23,'wirefern',1);
assert.equal(full.run('gardenState.specimens[0].type'),'wirefern');
full.run('gardenState.specimens.forEach((item,i)=>{if(i)item.vigor=3})');
full.emit(443,'broadleaf',1);assert.equal(full.run('gardenState.specimens[0].type'),'wirefern','equal vigor cannot displace');
full.emit(443,'broadleaf',2);assert.equal(full.run('gardenState.specimens[0].type'),'broadleaf','stronger growth can displace wirefern');
const clustered=createGarden();clustered.emit(23,'wirefern');clustered.emit(2323,'wirefern');
assert.equal(clustered.run('Math.max(Math.abs(gardenState.specimens[0].column-gardenState.specimens[1].column),Math.abs(gardenState.specimens[0].row-gardenState.specimens[1].row))'),1);

// Wireferns never enter the vine-only map, including when they touch mature vines.
run('gardenState.specimens=[{type:"wirefern",column:0,row:0,createdAt:Date.now()-60000,vigor:3},{type:"vine",column:1,row:0,createdAt:Date.now()-60000,vigor:0},{type:"wirefern",column:2,row:0,createdAt:Date.now()-60000,vigor:0}]');
assert.equal(run('buildVineCellLookup(Date.now()).size'),1);
assert.equal(run('buildVineCellLookup(Date.now()).has(0)'),false);
assert.equal(run('buildVineCellLookup(Date.now()).has(2)'),false);

// Dense actual renderer: one base rebuild, 640 wires, zero per-wire neighbor work.
const dense=createGarden();let bases=0,wires=0,neighbors=0,lookups=0;
dense.sandbox.countWireBase=()=>bases++;dense.sandbox.countWire=()=>wires++;
dense.sandbox.countWireNeighbor=()=>neighbors++;dense.sandbox.countWireLookup=()=>lookups++;
dense.run(`gardenState.specimens=Array.from({length:640},(_,i)=>({type:'wirefern',column:i%columns,row:Math.floor(i/columns),createdAt:Date.now()-60000,vigor:i%4,colorVariant:commonSpeciesColorVariant('wirefern',i%4)}));
  const wireBase=rebuildGardenBase;rebuildGardenBase=now=>{countWireBase();return wireBase(now)};
  const wireRender=speciesConfig.get('wirefern').render;speciesConfig.get('wirefern').render=(specimen,now)=>{countWire();wireRender(specimen,now)};
  const wireNeighbor=vineNeighborAt;vineNeighborAt=(...args)=>{countWireNeighbor();return wireNeighbor(...args)};
  const wireLookup=buildVineCellLookup;buildVineCellLookup=now=>{countWireLookup();return wireLookup(now)};drawGarden()`);
assert.equal(bases,1);assert.equal(wires,640);assert.equal(neighbors,0);
assert.equal(lookups,1,'only the existing shared base lookup pass, no per-wire lookup');
assert.equal(dense.run('buildVineCellLookup(Date.now()).size'),0);
assert.equal(dense.frames.size,0,'ordinary wireferns request no RAF');
assert(!dense.drawing.some(call=>call.surface==='overlay'&&call[0]==='lineTo'),'wirefern strokes belong exclusively to base');
dense.run('Object.assign(weatherState,{level:"botnet_hurricane",eventsPerMinute:10000});updateWeatherAnimation()');
bases=wires=neighbors=lookups=0;
const before=dense.run('JSON.stringify(gardenState.specimens)'), start=dense.clock.now;
let overlays=0,copies=0;
for(let frame=1;frame<=120;frame++){
  dense.drawing.length=0;dense.frame(start+frame*1000/120);
  assert(dense.drawing.every(call=>call.surface==='overlay'));
  overlays+=methods(dense.drawing,'clearRect').length;copies+=methods(dense.drawing,'drawImage').length;
}
assert.equal(overlays,30);assert.equal(bases,0);assert.equal(wires,0);assert.equal(neighbors,0);assert.equal(lookups,0);assert.equal(copies,0);
assert.equal(dense.run('JSON.stringify(gardenState.specimens)'),before);
assert.equal(garden.intervals.length,2,'no new timer');
console.log('PASS: wirefern species/lifecycle/compact segmented fronds/vigor 0–3/persistent phosphor-moss-cyan-amber palettes/1% afterglow/base-only rendering/SSE/inspection/status/activity/curiosity/grass/fake SSH/clustering/competition/expiry/resize. Dense 640 wireferns -> 1 base rebuild, 640 renders, 0 vine neighbor checks; 120 storm RAF callbacks -> 30 overlay paints, 0 base rebuilds, 0 bitmap copies.');
