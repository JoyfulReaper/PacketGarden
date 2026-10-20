// Placement/grass integration, deterministic clocks and rolls; no renderer-only masking.
const assert=require('node:assert/strict'),fs=require('node:fs');
const G=require('../wwwroot/garden-core.js'),E=require('../wwwroot/garden-ecology.js');
const P=require('../wwwroot/pixi-live-core.js'),{start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
const canvas=require('./browser-garden.cjs');
let at=0,ecology,notifications=[];
const garden=G.createGardenModel({now:()=>at,random:()=>0,onChange:c=>{
  if(c.kind==='added')ecology.removeGrassCell(c.specimen.column,c.specimen.row);
  notifications.push(c.kind);
}});
ecology=E.createEcologyModel({now:()=>at,random:()=>0,isCellOccupied:(x,y)=>garden.byCell.has(y*32+x),onChange:c=>notifications.push(c.kind)});
const allGrass=()=>Array.from({length:640},(_,i)=>({column:i%32,row:Math.floor(i/32),createdAt:at-60000,lastInfluencedAt:at}));
ecology.seed({grassCells:allGrass()});const neighbors=ecology.grassCells.slice(1),removed=ecology.grassCells[0];notifications=[];
const result=garden.addSpecimen('flower');assert.equal(result.specimen.cell,0);
assert.deepEqual(notifications,['grass-removed','added']);assert.deepEqual(ecology.grassCells,neighbors);
assert(!ecology.grassCells.includes(removed));assert.equal(ecology.removeGrassCell(0,0),null);
const entries=Array.from({length:640},(_,i)=>({type:'flower',column:i%32,row:Math.floor(i/32),vigor:i===5?0:3,createdAt:at}));
garden.seed(entries);assert.equal(ecology.grassCells.length,0,'seeded specimens clear grass too');
// Deliberately import legacy overlapping grass to exercise saturation/replacement recovery.
ecology.grassCells=[{column:5,row:0,createdAt:0,lastInfluencedAt:0},{column:6,row:0,createdAt:0,lastInfluencedAt:0}];
const unchanged=JSON.stringify(ecology.grassCells);notifications=[];
assert.equal(garden.addSpecimen('flower',0),null);assert.equal(garden.addEvent({}),null);assert.equal(garden.addSpecimen('bogus'),null);
assert.equal(JSON.stringify(ecology.grassCells),unchanged);assert.deepEqual(notifications,['dropped']);
assert.equal(garden.addSpecimen('broadleaf',1).specimen.cell,5);assert.equal(ecology.grassCells.length,1);assert.equal(ecology.grassCells[0].column,6);
garden.clear();ecology.clear();at=0;
const blockers=[];for(let y=0;y<=2;y++)for(let x=0;x<=2;x++)if(x!==1||y!==1)blockers.push({column:x,row:y,type:x===0&&y===0?'redbloom':'flower',createdAt:0});
garden.seed(blockers);const parent=ecology.influenceGrassCell(1,1,-60000);parent.lastInfluencedAt=0;
ecology.spreadGrass(0);assert.equal(ecology.grassCells.length,1,'all occupied neighbors blocked');
at=30000;garden.tick();assert.equal(ecology.grassCells.length,1,'expiry never synthesizes grass');
ecology.spreadGrass(at);assert.equal(ecology.grassCells.length,2);assert.equal(ecology.grassCells[1].column,0);assert.equal(ecology.grassCells[1].row,0);
assert.equal(ecology.grassCells[1].createdAt,at);assert.equal(parent.lastInfluencedAt,0);
for(const type of ['dns','http']) {
  const rolls=[0,0,0,0];let i=0;
  const m=E.createEcologyModel({random:()=>rolls[i++],isCellOccupied:(x,y)=>x===0&&y===0});
  m.influenceGrass(type,{column:0,row:0},100);
  assert.equal(i,4,'blocked same-cell influence adds no rolls/retry');assert.deepEqual(m.grassCells.map(c=>[c.column,c.row]),[[1,0]]);
  assert.equal(m.influenceGrassCell(0,0,200),null);m.seed({grassCells:[{column:0,row:0,createdAt:0,lastInfluencedAt:0}]});assert.equal(m.grassCells.length,0);
}
let rolls=0;const fading=E.createEcologyModel({random:()=>{rolls++;return 0;},isCellOccupied:(x,y)=>x!==1||y!==1});
fading.influenceGrassCell(1,1,0);fading.spreadGrass(1200000);assert.equal(fading.grassCells.length,1);assert.equal(rolls,1,'one final-seed roll, no occupied-child retry');
// Actual Canvas path: notification dirties the base, and first presentation sees cleared soil.
const c=canvas();c.sandbox.Math.random=()=>0;
c.run('gardenModel.clear();gardenEcology.clear();influenceGrassCell(0,0,Date.now());influenceGrassCell(1,0,Date.now());const neighborGrass=gardenState.grassCells[1];const originalDraw=drawGarden;let paintCount=0;drawGarden=function(...args){paintCount++;if(gardenState.grassCells.some(g=>g.column===0&&g.row===0))throw Error("grass remained at first plant paint");return originalDraw(...args)}');
c.emit(53,'flower',0);assert.equal(c.run('gardenState.specimens[0].cell'),0);assert.equal(c.run('gardenState.grassCells.length'),1);
assert.equal(c.run('gardenState.grassCells[0]===neighborGrass'),true);assert.equal(c.run('paintCount'),2,'existing color adapter redraws both see cleared soil');
c.run('gardenModel.clear();gardenEcology.clear();nextGrassSpreadAt=Date.now()+100000');
c.run('influenceGrassCell(0,0,Date.now());influenceGrassCell(1,0,Date.now())');
c.run("spawnSpecimen('flower','dns')");assert.equal(c.run('gardenState.grassCells.some(g=>g.column===0&&g.row===0)'),false);
c.fill(3);c.run('gardenState.specimens[0].vigor=0;gardenState.grassCells=[{column:0,row:0,createdAt:Date.now(),lastInfluencedAt:Date.now()},{column:1,row:0,createdAt:Date.now(),lastInfluencedAt:Date.now()}]');
const legacy=c.run('JSON.stringify(gardenState.grassCells)');c.emit(53,'flower',0);
assert.equal(c.run('JSON.stringify(gardenState.grassCells)'),legacy,'Canvas dropped growth leaves legacy grass untouched');
c.emit(53,'flower',1);assert.equal(c.run('gardenState.grassCells.length'),1);assert.equal(c.run('gardenState.grassCells[0].column'),1);
(async()=>{
  for(const page of ['index.html','pixi-live.html']) {
    const g=await start(false,{pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8'),captureModel:true});
    const now=g.context.Date.now(),root=g.app.stage.children[0];g.model.clear();g.ecology.seed({grassCells:[{column:0,row:0,createdAt:now-60000,lastInfluencedAt:now},{column:1,row:0,createdAt:now-60000,lastInfluencedAt:now}]});
    const target=root.children[3].children[0],neighbor=root.children[3].children[1],generated=h.generated(),textures=h.textureCount();
    const rect=g.app.canvas.getBoundingClientRect(),screen=g.app.renderer.screen;
    g.app.canvas.handlers.get('click')({clientX:rect.left+(root.position.x+15*root.scale.x)*rect.width/screen.width,
      clientY:rect.top+(root.position.y+15*root.scale.y)*rect.height/screen.height});
    assert.equal(g.element('#specimen-card-title').textContent,'Wild grass');assert(!g.element('#specimen-card').hidden);
    let beforeView=false;const remove=g.ecology.removeGrassCell;
    g.ecology.removeGrassCell=(...args)=>{const result=remove(...args);assert.equal(root.children[6].children.length,0);beforeView=true;return result;};
    const accepted=g.model.acceptEvent({specimenType:'flower',listenPort:53,vigor:0});assert.equal(accepted.specimen.cell,0);assert(beforeView);
    assert(g.element('#specimen-card').hidden,'grass-removed closes inspection synchronously, before a UI tick');
    assert(!h.live.has(target));assert(h.live.has(neighbor));assert.equal(g.ecology.grassCells.length,1);assert.equal(root.children[6].children.length,1);
    g.ecology.removeGrassCell=remove;
    g.model.seed();assert.equal(g.ecology.grassCells.length,0);
    const victim=g.model.specimens[0];for(const p of g.model.specimens)p.vigor=3;victim.vigor=0;
    // Simulate an old overlapping fixture using the documented legacy import path.
    g.model.byCell.delete(victim.cell);g.ecology.seed({grassCells:[{column:victim.column,row:victim.row,createdAt:now-60000,lastInfluencedAt:now}]});g.model.byCell.set(victim.cell,victim);
    const sprite=root.children[3].children[0],snapshot=JSON.stringify(g.ecology.grassCells);
    g.model.setPaused(true);assert.equal(g.model.acceptEvent({specimenType:'flower',listenPort:53,vigor:3}).outcome,'paused');g.model.setPaused(false);
    assert.equal(g.model.acceptEvent({}).outcome,'invalid');assert.equal(g.model.acceptEvent({specimenType:'flower',listenPort:53,vigor:0}).outcome,'dropped');
    assert.equal(JSON.stringify(g.ecology.grassCells),snapshot);assert(h.live.has(sprite));
    assert.equal(g.model.acceptEvent({specimenType:'flower',listenPort:53,vigor:1}).outcome,'replaced');assert(!h.live.has(sprite));assert.equal(g.ecology.grassCells.length,0);
    g.model.clear();
    for(let cycle=0;cycle<20;cycle++){
      g.ecology.influenceGrassCell(0,0,now);const sprite=root.children[3].children[0];
      g.model.acceptEvent({specimenType:'flower',listenPort:53,vigor:0});assert(!h.live.has(sprite));assert.equal(root.children[3].children.length,0);g.model.clear();
    }
    assert.equal(h.generated(),generated);assert.equal(h.textureCount(),textures);
    if(page==='pixi-live.html'){g.element('#seed').handlers.get('click')();assert.equal(g.model.specimens.length,640);assert.equal(g.ecology.grassCells.length,0);assert.equal(root.children[3].children.length,0);}
    g.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(g.errors,[]);
  }
  console.log('PASS: selected-cell clearing before Canvas paint/Pixi add, neighbor identity, replacement, invalid/paused/dropped isolation, occupied influence/spread and unchanged rolls, natural reclaim after expiry, dense fixture policy and repeated Sprite/atlas cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
