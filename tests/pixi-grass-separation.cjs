// Exercise actual shared ecology and Pixi event ownership, without GPU claims.
const assert = require('node:assert/strict'), fs = require('node:fs');
const h = require('./pixi-live.cjs'), core = require('../wwwroot/pixi-live-core.js');
const ecology = require('../wwwroot/garden-ecology.js'), art = require('../wwwroot/pixi-live-ecology.js');
const shared = require('../wwwroot/pixi-stress.js'), { createView } = require('../wwwroot/pixi-live.js');
const beforeObjects = h.live.size, beforeTextures = h.textureCount(), beforeBakes = h.generated();
const atlas = art.makeEcologyAtlas(h.P, h.renderer), stage = new h.P.Container();
const view = createView(h.P, { stage }, h.cache.frames, core, shared);
let at = 5000000, ev, model;
model = core.createModel(view, { now: () => at, random: () => 0, competitionRandom:()=>0, bloomRandom: () => 0, vineBloomRandom: () => 0,
  onAdded: p => ground.specimenAdded(p.column, p.row) });
ev = art.createEcologyView(h.P, view.grassLayer, view.puddleLayer, atlas.frames, {
  getSpecimen: (column, row) => model.byCell.get(row * 32 + column), getPlantSprite: p => view.byId.get(p.id), shadowLayer: view.contactLayer
});
view.setGroundCover(ev);
const ground = ecology.createEcologyModel({ now: () => at, random: () => 0,
  isCellOccupied: (column, row) => model.byCell.has(row * 32 + column), onChange: c => ev.change(c, at) });
const grass = (column, row, age = 60000) => ({ column, row, createdAt: at - age, lastInfluencedAt: at - age });
const source = fs.readFileSync('wwwroot/pixi-live-ecology.js', 'utf8');
assert.doesNotMatch(source, /Math\.random|setTimeout|setInterval|new .*Filter|\.filters\s*=/);
for (const color of [[91,151,64],[144,137,74],[133,105,67],[112,93,69]]) {
  const tint = art.grassTint(color), channels = [tint >> 16 & 255, tint >> 8 & 255, tint & 255];
  assert(channels[1] < color[1]);
  assert(Math.max(...channels) - Math.min(...channels) < Math.max(...color) - Math.min(...color));
  if (color[0] > color[1]) assert(channels[0] > channels[1], 'brown aging remains brown');
}
ground.seed({ grassCells: [grass(0,0), grass(1,0)] });
const open = ev.grassViews.get(0).sprite.texture;
const first = model.addSpecimen('broadleaf', 0).specimen;
assert.equal(ground.grassCells.length, 1); assert.equal(ev.shadowViews.size, 0, 'OFF retains removal');
model.clear(); ground.clear(); ground.setAllowGrassUnderPlants(true);
assert.equal(ground.grassCells.length, 0, 'ON never fills cells');
ground.seed({ grassCells: [grass(0,0), grass(1,0)] });
const sprite = ev.grassViews.get(0).sprite, openNeighbor = ev.grassViews.get(1).sprite;
const plant = model.addSpecimen('broadleaf', 0).specimen, parent = view.byId.get(plant.id), shadow = ev.shadowViews.get(plant.id);
assert.equal(ground.grassCells.length, 2); assert.equal(ev.grassViews.get(0).sprite, sprite);
assert.notEqual(sprite.texture, open); assert.equal(sprite.alpha, openNeighbor.alpha, 'no transparency change');
assert.equal(ev.shadowViews.size, 1); assert.equal(shadow.eventMode, 'none');
assert.deepEqual([shadow.position.x,shadow.position.y],[parent.position.x,parent.position.y]);
assert.equal(view.root.children.indexOf(view.contactLayer), 5); assert(view.root.children.indexOf(view.grassLayer) < 5);
const shelter = sprite.texture;
at += 60000; model.tick(at); assert.equal(ev.shadowViews.get(plant.id), shadow); assert.equal(shadow.scale.x, parent.scale.x);
ground.influenceGrassCell(0,0,at); assert.equal(sprite.texture, shelter); assert.equal(ev.shadowViews.get(plant.id),shadow);
model.remove(plant); assert.equal(sprite.texture,open); assert(!h.live.has(shadow)); assert.equal(ev.shadowViews.size,0);
const second = model.addSpecimen('vine', 0).specimen, secondShadow = ev.shadowViews.get(second.id);
assert.notEqual(secondShadow,shadow); assert.equal(sprite.texture,shelter);
for (const age of [0,10000,30000,1200000,1450000,1700000,1950000]) {
  ground.grassCells = [grass(0,0,age), grass(1,0,age)];
  const a=ev.grassViews.get(0).sprite,b=ev.grassViews.get(1).sprite,state=ecology.grassVisualState(ground.grassCells[0],at);
  assert.equal(a.tint,art.grassTint(state.color)); assert.equal(a.alpha,b.alpha); assert.equal(a.scale.x,b.scale.x);
}
const neighbor = ev.grassViews.get(1).sprite, neighborState = JSON.stringify(ground.grassCells[1]);
ground.setAllowGrassUnderPlants(false); assert.equal(ev.shadowViews.size,0); assert.equal(ground.grassCells.length,1);
assert.equal(ev.grassViews.get(1).sprite,neighbor);assert.equal(JSON.stringify(ground.grassCells[0]),neighborState);
ground.setAllowGrassUnderPlants(true);assert.equal(ev.shadowViews.size,0);
ground.influenceGrassCell(second.column,second.row,at);assert.equal(ev.shadowViews.size,1);
ground.removeExpiredGrass(at+2100000);assert.equal(ev.shadowViews.size,0);assert.equal(ev.grassViews.size,0);
model.clear();
// Full field + exact replacement, bounded repeated clears, no recurring bakes.
for (let cycle=0;cycle<8;cycle++) {
  model.seedBroadleafBlooms(true);
  ground.seed({grassCells:Array.from({length:640},(_,i)=>grass(i%32,Math.floor(i/32)))});
  assert.equal(ev.shadowViews.size,640); assert.equal(view.bloomViews.size,640);
  assert.equal(view.snapshot().contactShadows,640); const objects=h.live.size;
  const replaced=model.specimens[0], oldShadow=ev.shadowViews.get(replaced.id);
  // All fixture vigors must be weaker to force ordinary exact-cell replacement.
  for(const p of model.specimens)p.vigor=0;
  const result=model.addSpecimen('flower',1);
  assert(result.replaced); assert(!h.live.has(oldShadow)); assert.equal(ev.shadowViews.size,640);
  assert.equal(ev.shadowViews.has(replaced.id),false); assert(ev.shadowViews.has(result.specimen.id));
  for(let i=0;i<120;i++){ev.tick(at+i*16);ev.animate(at+i*16);view.animate(i/60,1/60,at);}
  assert.equal(h.generated(),beforeBakes+1); assert.equal(h.textureCount(),beforeTextures+29);assert(h.live.size<=objects);
  at += 360000; model.tick(at); assert.equal(ev.shadowViews.size,0,'plant expiry removes shadows and restores open grass');
  assert([...ev.grassViews.values()].every(r=>!r.specimen&&r.sprite.texture===atlas.frames.get(`grass:${require('../wwwroot/garden-grass.js').variantFor(r.cell)}`)));
  model.clear(); ground.clear(); assert.equal(view.snapshot().displayObjects,14);
}
// Direct view teardown also releases ground objects if callers omit clear.
model.seedVineBlooms('dense');ground.seed({grassCells:Array.from({length:640},(_,i)=>grass(i%32,Math.floor(i/32)))});
view.destroy();assert.equal(ev.shadowViews.size,0);assert.equal(ev.grassViews.size,0);ev.destroy();stage.destroy();atlas.destroy();
assert.equal(h.live.size,beforeObjects);assert.equal(h.textureCount(),beforeTextures);

const {start}=require('./pixi-default.cjs');
(async()=>{
  for(const page of ['index.html','pixi-live.html']) {
    const g=await start(false,{pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8'),captureModel:true});
    const checkbox=g.element('#allow-grass-under-plants');checkbox.checked=true;checkbox.handlers.get('change')({target:checkbox});
    g.model.seedBroadleafBlooms(true);g.ecology.seed({grassCells:Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:g.context.Date.now()-60000,lastInfluencedAt:g.context.Date.now()}))});
    assert.equal(g.view.snapshot().contactShadows,640);
    const shadowSprites=g.view.contactLayer.children.filter(s=>s instanceof h.P.Sprite);
    g.media.matches=true;g.media.handlers.get('change')?.();g.frame(250);assert.equal(g.view.snapshot().contactShadows,640);
    g.doc.hidden=true;g.docHandlers.get('visibilitychange')();g.advance(600001);g.doc.hidden=false;g.docHandlers.get('visibilitychange')();
    assert.equal(g.view.snapshot().contactShadows,0);assert(shadowSprites.every(s=>!h.live.has(s)));
    g.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(g.errors,[]);
  }
  console.log('PASS: subdued age colors; feathered occupied frames; exact-cell shade/shadow birth, refresh, removal, replacement, expiry, checkbox, 640 bounds, repeated reset, hidden/reduced motion and direct teardown; unchanged shared ecology and random streams.');
})().catch(error=>{console.error(error);process.exitCode=1;});
