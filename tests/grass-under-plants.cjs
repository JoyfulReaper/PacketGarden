// Deterministic shared rules plus actual shared/Pixi wiring, ownership and order.
const assert = require('node:assert/strict'), fs = require('node:fs');
const E = require('../wwwroot/garden-ecology.js'), G = require('../wwwroot/garden-core.js');
const  {start} = require('./pixi-default.cjs'), h = require('./pixi-live.cjs');
const cell = (column, row, at = 0) => ({column, row, createdAt: at - 60000, lastInfluencedAt: at});
const lawn = at => Array.from({length:640}, (_, i) => cell(i % 32, Math.floor(i / 32), at));
function fixture(occupied = () => true) {
  let at = 0, rolls = 0; const changes = [];
  const ecology = E.createEcologyModel({now:()=>at, random:()=>{rolls++;return 0;},
    isCellOccupied:occupied, onChange:change=>changes.push(change)});
  return {ecology, changes, at(value){at=value;}, rolls:()=>rolls};
}
// Every ingress obeys OFF; enabling itself seeds nothing and consumes no rolls.
for (const enabled of [false, true]) {
  const f = fixture(), m = f.ecology;
  assert.equal(m.allowGrassUnderPlants, false);
  m.setAllowGrassUnderPlants(enabled); assert.equal(m.grassCells.length, 0); assert.equal(f.rolls(), 0);
  m.seedInitialGrass(); assert.equal(m.grassCells.length, enabled ? 12 : 0);
  m.clearGrass(); m.tickGrass(60000); assert.equal(m.grassCells.length, enabled ? 3 : 0, 'maintenance recovery');
  m.clearGrass(); m.influenceGrass('dns', {column:0,row:0}, 100);
  assert.equal(m.grassCells.length, enabled ? 2 : 0, 'direct influence');
  m.seed({grassCells:[cell(0,0)]}); assert.equal(m.grassCells.length, enabled ? 1 : 0, 'fixture import');
  m.grassCells = lawn(0); assert.equal(m.grassCells.length, enabled ? 640 : 0, 'validated fixture assignment');
  const before = JSON.stringify(m.grassCells);
  assert.throws(()=>m.seed({grassCells:[cell(0,0),cell(0,0)]}), /Invalid grass seed/);
  assert.throws(()=>{m.grassCells=[cell(0,0),cell(0,0)];}, /Invalid grass seed/);
  assert.equal(JSON.stringify(m.grassCells), before, 'invalid fixtures are atomic');
}
// All eight neighbors occupied: OFF blocks spread, ON immediately permits the next normal attempt.
const f = fixture((x,y)=>x!==1 || y!==1), m = f.ecology;
m.seed({grassCells:[cell(1,1)]}); m.spreadGrass(0); assert.equal(m.grassCells.length,1);
const parent = m.grassCells[0], rolls = f.rolls();
m.setAllowGrassUnderPlants(true); assert.equal(m.grassCells.length,1); assert.equal(f.rolls(),rolls);
m.spreadGrass(4000); assert.equal(m.grassCells.length,2); assert.equal(parent.lastInfluencedAt,0);
const overlap = m.grassCells[1]; assert.equal(m.influenceGrassCell(overlap.column,overlap.row,5000),overlap);
assert.equal(overlap.lastInfluencedAt,5000); assert.equal(m.grassCells.length,2);
f.changes.length=0; m.setAllowGrassUnderPlants(false);
assert.deepEqual(m.grassCells,[parent]); assert.deepEqual(f.changes.map(c=>c.item),[overlap]);
m.setAllowGrassUnderPlants(true); assert.deepEqual(m.grassCells,[parent]);
m.spreadGrass(8000); assert.equal(m.grassCells.length,2,'natural regrowth after re-enable');
// Full specimen grid, real shared placement/replacement, unchanged plants and bounded unique grass.
let at=0, ecology;
const garden=G.createGardenModel({now:()=>at,random:()=>0,competitionRandom:()=>0,onChange:c=>{
  if(c.kind==='added')ecology.specimenAdded(c.specimen.column,c.specimen.row);
}});
ecology=E.createEcologyModel({now:()=>at,random:()=>0,isCellOccupied:(x,y)=>garden.byCell.has(y*32+x)});
ecology.influenceGrassCell(0,0); garden.addSpecimen('flower'); assert.equal(ecology.grassCells.length,0);
garden.clear(); ecology.setAllowGrassUnderPlants(true); const turf=ecology.influenceGrassCell(0,0);
garden.addSpecimen('flower'); assert.equal(ecology.grassCells[0],turf,'spawning preserves turf identity');
garden.seed(Array.from({length:640},(_,i)=>({type:i%2?'vine':'flower',column:i%32,row:Math.floor(i/32),vigor:0,createdAt:0})));
const original=JSON.stringify(garden.specimens); ecology.clearGrass(); ecology.seedInitialGrass();
for(at=4000;at<=1100000 && ecology.grassCells.length<640;at+=4000) ecology.tickGrass(at);
assert.equal(ecology.grassCells.length,640,'normal spread can cover even a full plant garden');
assert.equal(new Set(ecology.grassCells.map(g=>g.row*32+g.column)).size,640);
assert.equal(JSON.stringify(garden.specimens),original,'grass never mutates specimens');
const first=ecology.grassCells[0]; for(const p of garden.specimens)p.createdAt=at;
assert(garden.addSpecimen('broadleaf',1).replaced); assert(ecology.grassCells.includes(first),'replacement preserves turf');
for(const g of ecology.grassCells)ecology.influenceGrassCell(g.column,g.row,at);
assert.equal(ecology.grassCells.length,640,'refresh never duplicates cells');
ecology.setAllowGrassUnderPlants(false); assert.equal(ecology.grassCells.length,0); assert.equal(garden.byCell.size,640);
// Growth/aging/expiry and hidden cadence stay active under specimens, without catch-up.
const hidden=fixture().ecology; hidden.setAllowGrassUnderPlants(true); hidden.seed({grassCells:[cell(0,0)]});
assert.equal(E.grassVisualState(hidden.grassCells[0],1200000).stage,'fading');
hidden.tick(1200000,{hidden:true}); assert.equal(hidden.grassCells.length,1);
hidden.tick(1200001); assert.equal(hidden.grassCells.length,1,'no resume catch-up');
hidden.tick(2100000,{hidden:true}); assert.equal(hidden.grassCells.length,0,'hidden expiry');
hidden.clear(); assert.equal(hidden.grassCells.length,0);
assert.equal(fixture().ecology.allowGrassUnderPlants,false,'new sessions default OFF');

(async()=>{
  for(const page of ['index.html','pixi-live.html']) {
    const html=fs.readFileSync(`wwwroot/${page}`,'utf8');
    assert.match(html,/<label><input id="allow-grass-under-plants" type="checkbox" autocomplete="off"> Allow grass under plants<\/label>/);
    const g=await start(false,{pageHtml:html,captureModel:true}), checkbox=g.element('#allow-grass-under-plants');
    const set=checked=>{checkbox.checked=checked;checkbox.handlers.get('change')({target:checkbox});};
    assert.equal(checkbox.checked,false);assert.equal(g.ecology.allowGrassUnderPlants,false);
    const root=g.app.stage.children[0], grass=root.children[3], plants=root.children[6], now=g.context.Date.now();
    g.model.clear();g.ecology.clear();set(true);assert.equal(grass.children.length,0);
    g.ecology.seed({grassCells:[cell(0,0,now),cell(1,0,now)]});const ground=grass.children[0];
    g.model.acceptEvent({specimenType:'flower',listenPort:53,vigor:0});assert.equal(grass.children[0],ground);assert.equal(plants.children.length,1);
    assert(root.children.indexOf(grass)<root.children.indexOf(plants));
    // Inspection keeps specimens ahead of the coexisting grass.
    const rect=g.app.canvas.getBoundingClientRect(),screen=g.app.renderer.screen;
    g.app.canvas.handlers.get('click')({clientX:rect.left+(root.position.x+15*root.scale.x)*rect.width/screen.width,
      clientY:rect.top+(root.position.y+15*root.scale.y)*rect.height/screen.height});
    assert.notEqual(g.element('#specimen-card-title').textContent,'Wild grass');
    const neighbor=grass.children[1], bakes=h.generated(), textures=h.textureCount();
    set(false);assert.equal(grass.children.length,1);assert.equal(grass.children[0],neighbor);assert(!h.live.has(ground));
    set(true);assert.equal(grass.children.length,1);g.ecology.spreadGrass(now+4000);assert.equal(grass.children.length,2);
    for(let i=0;i<15;i++){g.ecology.influenceGrassCell(0,0,now);set(false);set(true);}
    assert.equal(h.generated(),bakes);assert.equal(h.textureCount(),textures,'toggles reuse existing atlas');
    if(page==='pixi-live.html'){
      g.element('#seed').handlers.get('click')();assert.equal(g.model.byCell.size,640);assert.equal(g.ecology.grassCells.length,640);
      assert.equal(grass.children.length,640);set(false);assert.equal(grass.children.length,0);assert.equal(plants.children.length,640);
    }
    set(true);g.doc.hidden=true;g.docHandlers.get('visibilitychange')();assert.equal(g.app.active,false);
    g.doc.hidden=false;g.docHandlers.get('visibilitychange')();assert.equal(g.ecology.allowGrassUnderPlants,true);
    const late=checkbox.handlers.get('change');g.winHandlers.get('pagehide')({persisted:false});
    assert.equal(checkbox.handlers.size,0);late({target:{checked:false}});assert.equal(g.ecology.allowGrassUnderPlants,true,'late input is guarded');
    assert.equal(grass.children.length,0);assert.deepEqual(g.errors,[]);
  }
  console.log('PASS: grass under plants OFF/ON ingress, spread/regrowth, spawn/replacement, 640+640 capacity/uniqueness, atomic fixtures, aging/hidden expiry, shared/Pixi layering, inspection, session defaults and teardown/atlas reuse.');
})().catch(error=>{console.error(error);process.exitCode=1;});
