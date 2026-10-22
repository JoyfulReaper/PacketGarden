// Cached grass artwork/ownership and unchanged shared lifecycle transforms.
// Real pixel margins, soil gaps and protected artwork use the --grass browser fixture.
const assert = require('node:assert/strict'), h = require('./pixi-live.cjs');
const ecology = require('../wwwroot/garden-ecology.js'), presentation = require('../wwwroot/pixi-live-ecology.js');
const startTextures = h.textureCount(), startObjects = h.live.size;
let geometry = 0, tiles, generated = 0, sourceDestroyed = false; const releasedFrames = [];
class Graphics extends h.P.Graphics {
  constructor() { super(); this.commands = []; }
  destroy(options) { this.destroyArgument = options; super.destroy(options); }
}
for (const method of ['ellipse','poly','moveTo','lineTo','quadraticCurveTo','fill','stroke']) Graphics.prototype[method] = function(...args) {
  geometry++; this.commands.push([method,...args]); return this;
};
class Texture extends h.P.Texture { destroy(source) { releasedFrames.push(source); super.destroy(source); } }
const originalRandom = Math.random; let atlas;
try {
  Math.random = () => { throw new Error('Artwork must not consume ecology randomness'); };
  atlas = presentation.makeEcologyAtlas({ ...h.P, Graphics, Texture }, { generateTexture(options) {
    generated++; assert.deepEqual([options.frame.width,options.frame.height,options.resolution],[1024,64,2]);
    tiles = options.target.children.slice(); return { source:{}, destroy(source) { sourceDestroyed=source; } };
  } });
} finally { Math.random = originalRandom; }
assert.equal(atlas.frames.size,16); assert.equal(new Set([...atlas.frames.values()].map(frame=>frame.source)).size,1);
assert.equal(h.live.size,startObjects,'all construction display objects released');
const shapes = new Set();
for (let i=0;i<12;i++) {
  const tile=tiles[i], commands=tile.commands; assert(tile instanceof Graphics);
  assert.equal(tile.destroyArgument,undefined,'owned grass context released with destroy()');
  assert(!commands.some(c=>c[0]==='ellipse'),'no carpet blobs');
  const blades=commands.filter(c=>c[0]==='fill'); assert.equal(blades.length,4,'four batched shade groups per patch');
  assert(blades.every(c=>c[1].alpha===.94),'opaque leafy underlayer, with shared lifecycle fading');
  assert(commands.filter(c=>c[0]==='quadraticCurveTo').length>=blades.length*2,'tapered curved blades');
  assert(commands.filter(c=>c[0]==='quadraticCurveTo').length>=120,'substantial leafy groundcover, separate from upright blades');
  assert.equal(commands.filter(c=>c[0]==='stroke').length,0,'shade variation uses surfaces, without needle-like highlight lines');
  for (const command of commands) for (const arg of command.slice(1)) if (typeof arg==='number') assert(Number.isFinite(arg));
  shapes.add(JSON.stringify(commands));
}
assert.equal(shapes.size,12,'finite distinct grass variants');
const grassLayer=new h.P.Container(), puddleLayer=new h.P.Container();
const view=presentation.createEcologyView(h.P,grassLayer,puddleLayer,atlas.frames), at=5000000;
const cells=Array.from({length:640},(_,cell)=>Object.freeze({column:cell%32,row:Math.floor(cell/32),createdAt:at-60000,lastInfluencedAt:at}));
const commandsAfterBaking=geometry;
for (const cell of cells) view.change({kind:'grass-added',item:cell},at);
const textures=[...view.grassViews.values()].map(record=>record.sprite.texture);
assert.equal(new Set(textures).size,12); assert.equal(view.grassViews.size,640);
let diagonalMatches=0;
for(let row=1;row<20;row++)for(let column=0;column<31;column++)if(textures[row*32+column]===textures[(row-1)*32+column+1])diagonalMatches++;
assert(diagonalMatches<120,'variant selection breaks the former repeated anti-diagonals');
for(let i=0;i<640;i++) {
  const sprite=view.grassViews.get(i).sprite;
  assert.deepEqual([sprite.position.x,sprite.position.y],[(i%32+.5)*30,(Math.floor(i/32)+.5)*30]);
}
const updates=view.counters.grassVisualUpdates;
for(let frame=0;frame<120;frame++){view.tick(at+frame*16);view.animate(at+frame*16);}
assert.equal(view.counters.grassVisualUpdates,updates);assert.equal(geometry,commandsAfterBaking);
for (const cell of cells) view.change({kind:'grass-removed',item:cell},at);
for (const cell of cells) view.change({kind:'grass-added',item:cell},at);
assert.deepEqual([...view.grassViews.values()].map(record=>record.sprite.texture),textures,'stable variants through clear/refill');
// Shared state remains the sole source for growth, tint, shrink, opacity and deadlines.
const cell=cells[0], sprite=view.grassViews.get(0).sprite;
for (const age of [0,1000,10000,20000,30000,60000,1200000,1400000,1620000,1920000,2099999]) {
  const sample=Object.freeze({...cell,createdAt:at-age,lastInfluencedAt:at-age}), state=ecology.grassVisualState(sample,at);
  view.change({kind:'grass-refreshed',item:sample},at);
  assert.equal(view.grassViews.get(0).sprite,sprite); assert.equal(sprite.texture,textures[0]);
  assert.equal(sprite.scale.x,state.growth*(1-state.decline*.65));
  assert.equal(sprite.tint,(state.color[0]<<16)|(state.color[1]<<8)|state.color[2]); assert.equal(sprite.alpha,state.opacity/.6);
  assert.equal(view.grassViews.get(0).nextAt,ecology.nextGrassVisualChangeAt(sample,at));
}
assert.equal(geometry,commandsAfterBaking);assert.equal(generated,1);assert.equal(h.textureCount(),startTextures+16);
view.destroy();grassLayer.destroy();puddleLayer.destroy();atlas.destroy();
assert.equal(h.textureCount(),startTextures);assert.equal(h.live.size,startObjects);
assert.deepEqual(releasedFrames,Array(16).fill(false));assert.equal(sourceDestroyed,true);
console.log('PASS: 12 finite curved tuft variants, no blobs/model RNG, stable non-diagonal selection, exact lifecycle transforms/deadlines, zero recurring geometry/textures, view/frame/source cleanup.');
