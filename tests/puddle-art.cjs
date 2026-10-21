// Artwork-only contract: finite shared geometry, stable selection, cached views,
// exact ecology radius/fade/identity and complete ownership under repeated churn.
const assert=require('node:assert/strict'),fs=require('node:fs');
const art=require('../wwwroot/garden-puddle-art.js'),E=require('../wwwroot/garden-ecology.js');
const h=require('./pixi-live.cjs'),presentation=require('../wwwroot/pixi-live-ecology.js'),createGarden=require('./browser-garden.cjs');
assert.equal(art.variants.length,4);assert.equal(new Set(art.variants.map(JSON.stringify)).size,4);
assert.deepEqual([0,.249999,.25,.499999,.5,.749999,.75,.999999].map(seed=>art.variantFor({seed})),[0,0,1,1,2,2,3,3]);
for(const layers of art.variants){
  assert(layers.length>=9&&layers.length<=10);
  for(const layer of layers){
    assert(layer.alpha>0&&layer.alpha<1);assert.equal(layer.path[0][0],'moveTo');
    for(const [method,...coords] of layer.path){
      assert(['moveTo','lineTo','quadraticCurveTo'].includes(method),'no ellipse outlines, gradients, filters or particles');
      assert(coords.every(n=>Number.isFinite(n)&&n>=10&&n<=54),'transparent tile margins at any rotation');
    }
  }
}
const objects=h.live.size,textures=h.textureCount(),generated=h.generated();let geometry=0,tiles;
class Graphics extends h.P.Graphics{constructor(){super();this.commands=[];}destroy(options){this.released=true;this.releaseOptions=options;super.destroy(options);}}
for(const method of ['moveTo','lineTo','quadraticCurveTo','fill'])Graphics.prototype[method]=function(...args){geometry++;this.commands.push([method,...args]);return this;};
const originalRandom=Math.random;let atlas;
try{
  Math.random=()=>{throw new Error('Water artwork must not consume placement/weather/rarity RNG');};
  atlas=presentation.makeEcologyAtlas({...h.P,Graphics},{generateTexture(options){
    tiles=options.target.children.slice();assert.deepEqual([options.frame.width,options.frame.height,options.resolution],[1024,64,2]);
    return h.renderer.generateTexture(options);
  }});
}finally{Math.random=originalRandom;}
assert.equal(tiles.length,16);assert.equal(atlas.frames.size,16);assert.equal(h.live.size,objects);
assert(tiles.every(t=>t.released&&t.releaseOptions===undefined),'all sixteen temporary Graphics contexts explicitly released');
for(let i=0;i<4;i++){
  const commands=[],context={beginPath(){},closePath(){commands.push(['lineTo',...start]);},
    fill(){commands.push(['fill',{color:parseInt(this.fillStyle.slice(1),16),alpha:this.globalAlpha}]);}};
  let start;
  for(const method of ['moveTo','lineTo','quadraticCurveTo'])context[method]=(...args)=>{if(method==='moveTo')start=args;commands.push([method,...args]);};
  art.paintCanvas(context,i);assert.deepEqual(tiles[12+i].commands,commands,'Canvas and atlas submit identical closed paths, colors and alpha');
}
const grass=new h.P.Container(),water=new h.P.Container(),view=presentation.createEcologyView(h.P,grass,water,atlas.frames);
let at=1000000;const model=E.createEcologyModel({now:()=>at,random:()=>.99,onChange:e=>view.change(e,at)});
const baked=geometry;
for(let cycle=0;cycle<30;cycle++){
  const start=at,puddles=Array.from({length:8},(_,i)=>({x:150+i%4*210,y:180+Math.floor(i/4)*240,seed:i/8,size:10,maxSize:18,createdAt:start,lastRefreshedAt:start}));
  model.seed({puddles});const sprites=puddles.map(p=>view.puddleViews.get(p)),frames=sprites.map(s=>s.texture),before=JSON.stringify(puddles);
  assert.equal(water.children.length,8);assert.equal(new Set(frames).size,4);
  for(const age of [0,7500,15000,30000,270000,500000,509999,510000]){
    view.animate(start+age);
    for(let i=0;i<8;i++){
      const p=puddles[i],s=sprites[i],state=E.puddleVisualState(p,start+age);
      assert.equal(s.texture,frames[i]);assert.equal(s.scale.x,state.size/18);assert.equal(s.alpha,art.opacityFor(state.opacity));
      assert.equal(s.rotation,p.seed*2*Math.PI);assert.equal(view.puddleViews.get(p),s);
    }
  }
  assert.equal(JSON.stringify(puddles),before,'presentation never changes any puddle data');
  at=start+100000;for(const p of puddles)model.refreshStormPuddle(p,at);
  assert(puddles.every((p,i)=>view.puddleViews.get(p)===sprites[i]&&sprites[i].texture===frames[i]));
  at+=510000;model.removeExpiredPuddles(at);assert.equal(view.puddleViews.size,0);assert.equal(water.children.length,0);
  assert(sprites.every(s=>!h.live.has(s)));assert.equal(h.textureCount(),textures+16);assert.equal(h.generated(),generated+1);
}
assert.equal(geometry,baked,'zero geometry submissions after the startup bake');
view.destroy();grass.destroy();water.destroy();atlas.destroy();assert.equal(h.live.size,objects);assert.equal(h.textureCount(),textures);
const canvas=createGarden(),reduced=createGarden({reduced:true});
for(const garden of [canvas,reduced]){
  assert.equal(garden.run('puddleTiles.length'),4);assert(garden.run('puddleTiles.every(tile=>tile.width===128&&tile.height===128)'));
  garden.run('gardenEcology.clear();gardenState.puddles=[0,.25,.5,.75].map(seed=>({x:480,y:300,seed,size:36,maxSize:36,createdAt:Date.now(),lastRefreshedAt:Date.now()}))');
  garden.drawing.length=0;garden.run('drawGardenPuddles(Date.now())');const commands=garden.drawing.slice(),tiles=commands.filter(c=>c[0]==='drawImage').map(c=>c[1]);
  assert.equal(new Set(tiles).size,4);assert(!commands.some(c=>c[0]==='quadraticCurveTo'),'Canvas only copies finite tiles on a base repaint');
  for(let i=0;i<30;i++){garden.drawing.length=0;garden.run('drawGardenPuddles(Date.now())');assert.deepEqual(garden.drawing,commands);}
  garden.setHidden(true);garden.clock.now+=600000;garden.setHidden(false);
  assert.equal(garden.run('gardenState.puddles.length'),0);assert.equal(garden.run('puddleTiles.length'),4);
  assert.equal(garden.intervals.length,2);
}
assert.equal(art.opacityFor(.38),1);assert.equal(art.opacityFor(.19),.5);assert.equal(art.opacityFor(0),0);
for(const file of ['garden-puddle-art.js','garden-puddles.js','pixi-live-ecology.js']){
  const source=fs.readFileSync('wwwroot/'+file,'utf8');assert.doesNotMatch(source,/setInterval|setTimeout|requestAnimationFrame|new Source|fetch\(|\.filters\s*=/);
  if(file==='garden-puddle-art.js')assert.doesNotMatch(source,/Math\.random/);
}
console.log('PASS: four shared organic water variants, no RNG, identical bake commands, bounded margins, stable exact puddle transforms/references, 30 refresh/expiry cycles, finite Canvas tiles, reduced/hidden behavior, zero runtime geometry/texture growth and full cleanup.');
