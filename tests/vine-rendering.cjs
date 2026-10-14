// Compare local lookup rendering with the previous all-specimen adjacency rules.
const assert = require('node:assert/strict');
const createGarden = require('./browser-garden.cjs');
const garden = createGarden();
const now = garden.clock.now;
const specimen = (column,row,age,type='vine',vigor=0) =>
  ({type,column,row,createdAt:now-age,vigor,colorVariant:'aqua'});
const specimens = [
  specimen(0,0,60000), specimen(1,0,20000), specimen(1,1,500000,'vine',3),
  specimen(0,1,19999), specimen(31,0,60000), specimen(31,19,60000),
  specimen(30,18,20000), specimen(31,18,60000,'flower'), specimen(30,19,600000),
  specimen(0,19,60000), specimen(20,10,60000), specimen(20,11,600000),
  specimen(20,9,19999), specimen(19,10,599999)
];
garden.sandbox.testSpecimens=specimens;
garden.run('gardenState.specimens=testSpecimens; gardenState.grassCells=[]');
const sort = curves => curves.map(curve=>JSON.stringify(curve)).sort();
function previousConnections(root) {
  const age=now-root.createdAt;
  if(age<20000 || age>=600000) return [];
  return specimens.filter(neighbor => neighbor!==root && neighbor.type==='vine'
    && now-neighbor.createdAt>=20000 && now-neighbor.createdAt<600000
    && Math.max(Math.abs(neighbor.column-root.column),Math.abs(neighbor.row-root.row))===1)
    .map(neighbor=>{
      const dx=neighbor.column-root.column, dy=neighbor.row-root.row;
      const endX=dx*15,endY=dy*15,bend=(root.column+root.row)%2===0?3:-3;
      return [endX/2-dy*bend,endY/2+dx*bend,endX,endY];
    });
}
for(const root of specimens.filter(specimen=>specimen.type==='vine')) {
  garden.sandbox.testVine=root; garden.drawing.length=0;
  garden.run('drawVine(testVine,Date.now())');
  const actual=garden.drawing.filter(command=>command[0]==='quadraticCurveTo').map(command=>command.slice(1));
  assert.deepEqual(sort(actual),sort(previousConnections(root)), `connections at ${root.column},${root.row}`);
  assert.equal(garden.run('vineCellLookup'),null, 'direct helper does not retain a stale spatial cache');
}
assert.equal(previousConnections(specimens[0]).length,2,'orthogonal and diagonal eligible neighbors');
assert.equal(previousConnections(specimens[4]).length,0,'no row wrapping at garden edges');
assert.equal(previousConnections(specimens[3]).length,0,'sprouts do not connect');
assert.equal(previousConnections(specimens[8]).length,0,'expired vines do not connect');
assert.equal(previousConnections(specimens[10]).length,1,'expired/sprout neighbors are excluded');

// Build once per actual scene render, and inspect at most eight cells per eligible vine.
const dense=createGarden();
dense.run(`gardenState.specimens=Array.from({length:640},(_,i)=>({type:'vine',column:i%columns,row:Math.floor(i/columns),
  createdAt:Date.now()-60000,vigor:i%4,colorVariant:'aqua'})); gardenState.grassCells=[]`);
const before=dense.run('JSON.stringify(gardenState.specimens)');
let builds=0,checks=0,insideVine=false;
dense.sandbox.recordBuild=()=>builds++;
dense.sandbox.recordCheck=()=>checks++;
dense.sandbox.enterVine=()=>{insideVine=true}; dense.sandbox.leaveVine=()=>{insideVine=false};
dense.sandbox.visitSpecimen=()=>{assert(!insideVine,'rendering a vine must not iterate the whole specimen array')};
dense.run(`
  const lookupBeforeTest=buildVineCellLookup;
  buildVineCellLookup=now=>{recordBuild();return lookupBeforeTest(now)};
  const neighborBeforeTest=vineNeighborAt;
  vineNeighborAt=(lookup,column,row)=>{recordCheck();return neighborBeforeTest(lookup,column,row)};
  const vineBeforeTest=speciesConfig.get('vine').render;
  speciesConfig.get('vine').render=(specimen,now)=>{enterVine();try{vineBeforeTest(specimen,now)}finally{leaveVine()}};
  gardenState.specimens[Symbol.iterator]=function*(){for(let i=0;i<this.length;i++){visitSpecimen();yield this[i]}};
  drawGarden();
`);
assert.equal(builds,1); assert.equal(checks,640*8);
assert.equal(dense.run('vineCellLookup'),null, 'lookup is temporary to this rebuild');
assert.equal(dense.run('JSON.stringify(gardenState.specimens)'),before, 'rendering preserves vigor/hue/cells/timestamps');
const baseConnections=dense.drawing.filter(command=>command.surface==='base' && command[0]==='quadraticCurveTo');
assert(baseConnections.length>4000, 'dense connections remain visible instead of being omitted');
builds=0;checks=0;dense.run("Object.assign(weatherState,{level:'botnet_hurricane',eventsPerMinute:10000});updateWeatherAnimation()");
assert.equal(builds,1);
builds=0;checks=0;
const start=dense.clock.now;
for(let i=1;i<=120;i++){dense.frame(start+i*1000/120);dense.drawing.length=0}
assert.equal(builds,0);assert.equal(checks,0,'dynamic weather never discovers vine neighbors');
console.log('PASS: vine orthogonal/diagonal half-curves, midpoint bends, lifecycle boundaries and edge non-wrapping match previous rules. Dense 640-vine base: one lookup build, 5120 local checks, no per-vine collection scans; weather RAF performs zero neighbor work.');
