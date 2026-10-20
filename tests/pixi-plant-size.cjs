// Presentation scale must not alter the atlas, logical cells, picking or mutations.
const assert=require('node:assert/strict'),h=require('./pixi-live.cjs');
const core=require('../wwwroot/pixi-live-core.js'),gardenCore=require('../wwwroot/garden-core.js');
const interaction=require('../wwwroot/garden-interaction.js'),shared=require('../wwwroot/pixi-stress.js');
const {createView}=require('../wwwroot/pixi-live.js');
const initialObjects=h.live.size,initialTextures=h.textureCount(),initialGenerated=h.generated();
const stage=new h.P.Container(),view=createView(h.P,{stage},h.cache.frames,core,shared);
let now=5000000;
const garden=gardenCore.createGardenModel({now:()=>now,onChange({kind,specimen}){
  if(kind==='added'){specimen.colorVariant=specimen.cell%5;view.add(specimen,garden.byCell);}
  if(kind==='updated')view.update(specimen,garden.byCell);
  if(kind==='removed')view.remove(specimen,garden.byCell);
}});
garden.seed(Array.from({length:640},(_,cell)=>{
  const type=core.species[cell%10],t=core.timings[type],s=Math.floor(cell/10)%4;
  const age=type==='redbloom'?(s%2?15000:5000):s===0?1000:s===1?t.growingAfterMs+1000:s===2?t.matureAfterMs+1000:t.expiredAfterMs-1000;
  return {type,column:cell%32,row:Math.floor(cell/32),vigor:Math.floor(cell/40)%4,createdAt:now-age};
}),now);
const sizes={flower:1.4,mushroom:1.4,broadleaf:1.35,wirefern:1.4,weed:1.4,redbloom:1.25,ghostbloom:1.3,crystalfungus:1.3,blackthorn:1.25};
const logicalBefore=JSON.stringify(garden.specimens);
for(const p of garden.specimens){
  const sprite=view.byId.get(p.id);
  assert.equal(sprite.texture,h.cache.frames.get(`${p.type}:${p.stage}:${p.vigor}:${p.colorVariant}`));
  assert.deepEqual([sprite.anchor.x,sprite.anchor.y],[.5,.9]);
  if(p.type==='vine')assert.equal(Math.abs(sprite.scale.x),1);
  else {
    const scale=Math.min(sizes[p.type],p.row===0?1.1:Infinity);
    assert.equal(sprite.scale.x,scale);assert.equal(sprite.scale.y,scale);
    const [x,y]=[sprite.position.x,sprite.position.y];
    assert(x-16*scale>=0&&x+16*scale<=960&&y-28.8*scale>=0&&y+3.2*scale<=600,'no garden-edge quad clipping');
    if(p.row>0&&p.row<19&&p.column>0&&p.column<31)assert.deepEqual([x,y],[(p.column+.5)*30,(p.row+.5)*30+12]);
  }
  const hit=interaction.resolve({x:(p.column+.5)*30,y:(p.row+.5)*30},{specimens:garden.specimens,curiosities:[],drops:[]},now);
  assert.equal(hit.specimen,p,'logical picking still resolves the exact specimen');
}
const created=view.counters.created,checks=view.counters.vineNeighborChecks;
for(let i=0;i<120;i++)view.animate(i/60,1/60,now);
assert.equal(view.counters.created,created);assert.equal(view.counters.vineNeighborChecks,checks);
assert.equal(JSON.stringify(garden.specimens),logicalBefore);
const growing=garden.specimens.find(p=>p.type==='flower'&&p.stage==='sprout'&&p.row>0),sprite=view.byId.get(growing.id);
const pose=[sprite.position.x,sprite.position.y,sprite.scale.x,sprite.scale.y];
now=growing.createdAt+core.timings.flower.matureAfterMs;garden.tick(now);
assert.equal(view.byId.get(growing.id),sprite);assert.equal(growing.stage,'mature');
assert.deepEqual([sprite.position.x,sprite.position.y,sprite.scale.x,sprite.scale.y],pose,'baked stage differences preserved without root jumps');
const source=garden.specimens.find(p=>p.type==='redbloom');
// Seed one replacement if the tick naturally expired every brief redbloom.
const active=source??garden.addSpecimen('redbloom',2,now).specimen;
active.mutation={type:'collectible_weed',createdAt:now,expiresAt:now+20000};active.stage='mutation';
view.update(active,garden.byCell);const mutation=view.byId.get(active.id);
assert.equal(mutation.texture,h.cache.frames.get('collectible_weed'));
assert.deepEqual([mutation.scale.x,mutation.scale.y],[1,1]);
assert.deepEqual([mutation.position.x,mutation.position.y],[(active.column+.5)*30,(active.row+.5)*30+12]);
assert.equal(h.textureCount(),initialTextures);assert.equal(h.generated(),initialGenerated);assert.equal(h.cache.frames.size,763);
view.destroy();stage.destroy();assert.equal(h.live.size,initialObjects);
console.log('PASS: larger cached Sprites, bounded edge presentation, stable stages/roots, unchanged logical picking/vines/mutation size, no new textures or recurring neighbor work.');
