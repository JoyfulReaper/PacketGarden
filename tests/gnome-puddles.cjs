const assert=require('node:assert/strict'),fs=require('node:fs');
const W=require('../wwwroot/garden-gnome-puddles.js'),G=require('../wwwroot/garden-gnomes.js');
const E=require('../wwwroot/garden-ecology.js'),A=require('../wwwroot/garden-puddle-art.js'),Core=require('../wwwroot/garden-core.js');
const GV=require('../wwwroot/pixi-live-gnomes.js'),h=require('./pixi-live.cjs');
const puddle=(seed=0)=>({x:480,y:300,seed,size:18,maxSize:18,createdAt:0,lastRefreshedAt:0});
const world=(x,y,p)=>{const a=p.seed*2*Math.PI,s=p.size/18;return {x:p.x+(x*Math.cos(a)-y*Math.sin(a))*s,y:p.y+(x*Math.sin(a)+y*Math.cos(a))*s};};
// Every sampled collision shore is safely inside the actual illustrated body,
// including concave/irregular variants. Test geometry, not an ellipse surrogate.
for(let variant=0;variant<4;variant++){
  const body=[];let from;
  for(const [method,...p] of A.variants[variant][2].path){if(method==='moveTo'){from=p;continue;}
    for(let i=1;i<=60;i++){const t=i/60,u=1-t;body.push([u*u*from[0]+2*u*t*p[0]+t*t*p[2]-32,u*u*from[1]+2*u*t*p[1]+t*t*p[3]-32]);}from=p.slice(2);}
  for(const point of W.interiors[variant]){
    assert(W.inside({x:point[0],y:point[1]},body),'collision polygon excludes the dry shore');
    assert(Math.min(...body.map(([x,y])=>Math.hypot(point[0]-x,point[1]-y)))>1,'conservative water margin');
  }
  const p=puddle(variant/4);assert(W.pathEntry(world(-30,0,p),world(30,0,p),p,0),'crosses with both endpoints on dry soil');
  assert(!W.pathEntry(world(-30,10,p),world(30,10,p),p,0),'outer water/shoreline never triggers');
  assert(!W.pathEntry(world(0,0,p),world(1,0,p),p,0),'remaining in water is not entry');
}
for(const size of [7.999999,8,8.000001])assert.equal(Boolean(W.waterState({...puddle(),size,maxSize:size},0)),size>=8);
const opacityBoundary=30000+480000*(1-.12/.38);
assert(W.waterState(puddle(),opacityBoundary-.001));assert(!W.waterState(puddle(),opacityBoundary+.001));
for(const at of [510000,999999])assert(!W.waterState(puddle(),at));
for(const bad of [null,{...puddle(),seed:NaN},{...puddle(),lastRefreshedAt:1},{...puddle(),maxSize:0}])assert(!W.waterState(bad,0));
function walk(roll=.2,water=[puddle()]){
  let calls=0;const a={x:450,y:289,createdAt:0,side:'green',state:'approach'},m=W.createModel({getPuddles:()=>water,random:()=>{calls++;return roll;}});
  m.tick([a],0);const move=(x,at)=>{a.x=x;m.tick([a],at);};
  return {a,m,move,water,get calls(){return calls;}};
}
for(const roll of [.199999,.2,.999999]){
  const f=walk(roll);f.move(480,250);assert.equal(f.calls,1);assert.equal(Boolean(f.a.puddleMishap),roll<.2);
  f.move(481,500);f.move(479,750);f.m.tick([f.a],750);assert.equal(f.calls,1,'no repeated rolls while inside or on duplicate ticks');
  f.move(510,1000);f.move(480,1250);assert.equal(f.calls,roll<.2?1:2,'failure allows a later fresh entry; success is once per actor');
}
{
  const f=walk(.2,[puddle(),{...puddle(),x:483}]);f.move(520,250);assert.equal(f.calls,1,'overlapping pools are one continuous entry');
  const other=walk(.2,[{...puddle(),x:465},{...puddle(),x:510}]);other.move(540,250);assert.equal(other.calls,2,'two disjoint water entries, one roll each');
}
{
  const f=walk(.2),p=f.water[0];let edge=0;
  for(let x=0;x<15;x+=.001)if(W.inside({x,y:0},W.interiors[0]))edge=x;
  f.move(p.x+edge-.00001,250);assert.equal(f.calls,1);p.size=p.maxSize=17.99;
  f.move(f.a.x-.02,500);assert.equal(f.calls,1,'draining water cannot reroll while consecutive foot samples remain inside');
}
{
  const f=walk(0);f.move(510,250);assert.equal(f.calls,1);assert(f.a.puddleMishap);
  assert(W.reactionState(f.a,250));assert(W.reactionState(f.a,1249));assert.equal(W.reactionState(f.a,1250),null);
  const reduced=W.reactionState(f.a,500,true);assert.equal(reduced.rotation,0);assert.equal(reduced.bounce,0);
  const old=f.water[0];f.water.splice(0,1,{...old});f.m.tick([f.a],500);assert.equal(f.a.puddleMishap,undefined,'lookalike water cannot retain reaction ownership');
  f.m.clear([f.a]);assert.equal(f.m.trackedActors,0);assert.equal(f.a.puddleMishapOccurred,undefined);
}
{
  const f=walk(0);f.move(480,250);f.m.removed(f.water[0]);assert.equal(f.a.puddleMishap,undefined,'removal notification clears reaction immediately');
  assert(f.a.puddleMishapOccurred,'removal does not grant a second success');f.m.suspend();assert.equal(f.m.trackedActors,0);
  f.move(450,500);f.move(480,750);assert.equal(f.calls,1,'suspension preserves the one-success limit');
}
for(const gap of [-1,1501,600000]){
  const f=walk(0);f.move(510,gap);assert.equal(f.calls,0,'no missed crossing after clock reset/suspension');
}
{
  const f=walk(0);f.move(480,250);assert(f.a.puddleMishap);f.move(481,100);assert.equal(f.a.puddleMishap,undefined,'a clock reversal cannot revive an old reaction');
  const original=Math.random;
  try{Math.random=()=>{throw Error('mishaps consumed a shared random stream');};
    const f=walk();const m=W.createModel({getPuddles:()=>f.water});m.tick([f.a],0);f.a.x=510;m.tick([f.a],250);
  }finally{Math.random=original;}
}
{
  const f=walk(0);f.water.length=0;f.move(510,250);assert.equal(f.calls,0);
  f.water.push(puddle());f.move(480,500);assert.equal(f.calls,0,'new water establishes occupancy without inventing a past entry');
}
{
  const f=walk(0);const old=f.water[0];f.water[0]={...old};f.move(480,250);assert.equal(f.calls,0,'exact replacement is baselined, never inherited by cell');
  const a={x:450,y:289},p=puddle();let water=[p];const m=W.createModel({getPuddles:()=>water,random:()=>{water=[];return 0;}});
  m.tick([a],0);a.x=510;m.tick([a],250);assert.equal(a.puddleMishap,undefined,'revalidate identity after the roll');
}
// Full incident traces compare gameplay with/without wet feet, including all
// three landscaping modes, underpants attempts and renderer-only advance calls.
function incident(mode,wet,reduced=false){
  let at=100000,rolls=0,underpants=0;const removed=[],garden=Core.createGardenModel({now:()=>at,onChange:e=>{if(e.kind==='removed')removed.push(e.specimen.id);}});
  const types=mode==='weed_harvest'?Array(5).fill('weed'):mode==='overcrowding'?Array.from({length:640},()=> 'broadleaf'):Array(40).fill('vine');
  garden.seed(types.map((type,i)=>({type,column:mode==='overcrowding'?i%32:8+i%16,row:mode==='overcrowding'?Math.floor(i/32):4+Math.floor(i/16),
    createdAt:at-65000,colorVariant:0})),at);
  let water=[];const g=G.createModel({garden,getSpecimens:()=>garden.specimens,getPuddles:()=>water,now:()=>at,
    getReducedMotion:()=>reduced,puddleRandom:()=>{rolls++;return 0;},onUnderpantsAttempt:()=>underpants++});
  assert(mode==='fight'?g.start(at,()=>.51):g.startLandscaping(at,()=>.51,mode));
  const actor=g.actors[0],p={...puddle(),x:(actor.startX+actor.targetX)/2,y:(actor.startY+actor.targetY)/2+11,size:10,maxSize:10,createdAt:at,lastRefreshedAt:at};
  if(wet)water=[p];g.tick(at,()=>.51);const trace=[];let reacted=false;
  for(let n=0;n<200&&g.incident;n++){
    at+=250;g.tick(at,()=>.51);
    const count=rolls;for(let frame=0;frame<6;frame++)g.advance(at,()=>.51);assert.equal(rolls,count,'render advances never check water');
    if(actor.puddleMishap)reacted=true;
    for(const a of g.actors){G.presentation(a,at,reduced);if(n===1){g.click(a,at);g.click(a,at);}}
    trace.push([g.incident?.phase,g.incident?.removals,...g.actors.map(a=>[a.x,a.y,a.state])]);
  }
  assert.equal(g.actors.length,0);assert.equal(actor.puddleMishap,undefined);
  return {trace,removed,underpants,reacted,rolls};
}
for(const mode of ['fight','vine','overcrowding','weed_harvest']){
  const dry=incident(mode,false),wet=incident(mode,true);assert(wet.reacted,`${mode} has a valid moving entry`);
  assert.deepEqual(wet.trace,dry.trace);assert.deepEqual(wet.removed,dry.removed);assert.equal(wet.underpants,dry.underpants);
  incident(mode,true,true);
}
// One extra atlas tile/source unchanged; at most four temporary ripple Sprites.
const objects=h.live.size,textures=h.textureCount(),bakes=h.generated(),layer=new h.P.Container();
let released=0;
class Graphics extends h.P.Graphics{
  constructor(){super();this.lines=[];}
  moveTo(x,y){this.lines.push(['moveTo',x,y]);return this;}
  lineTo(x,y){this.lines.push(['lineTo',x,y]);return this;}
  destroy(options){released++;super.destroy(options);}
}
const cache=GV.makeGnomeAtlas({...h.P,Graphics},{generateTexture(options){
  assert.deepEqual(options.target.children.at(-1).lines,W.splashArt.lines.flatMap(([x,y,endX,endY])=>[['moveTo',x+16,y+18],['lineTo',endX+16,endY+18]]),'identical shared splash artwork in the atlas');
  return h.renderer.generateTexture(options);
}}),view=GV.createGnomeView(h.P,layer,cache.frames);
assert.equal(released,26,'every temporary gnome/ripple Graphics context is released after baking');
assert.equal(cache.frames.size,26);assert.equal(new Set([...cache.frames.values()].map(t=>t.source)).size,1);
for(let cycle=0;cycle<30;cycle++){
  const water=[puddle()],actors=Array.from({length:4},(_,i)=>({x:450,y:289,createdAt:0,side:i%2?'red':'green',state:'approach'}));
  const m=W.createModel({getPuddles:()=>water,random:()=>0});view.change({actors});m.tick(actors,0);
  for(const a of actors)a.x=480;m.tick(actors,250);view.animate(250);assert.equal(view.splashes.size,4);
  const sprites=[...view.views.values(),...view.splashes.values()];
  for(let frame=0;frame<60;frame++)view.animate(250+frame*16);
  m.tick(actors,1250);view.animate(1250);assert.equal(view.splashes.size,0);m.clear(actors);view.change({actors:[]});
  assert(sprites.every(s=>!h.live.has(s)));assert.equal(layer.children.length,0);assert.equal(h.textureCount(),textures+26);assert.equal(h.generated(),bakes+1);
}
view.destroy();cache.destroy();layer.destroy();assert.equal(h.live.size,objects);assert.equal(h.textureCount(),textures);
assert(!fs.readFileSync('wwwroot/index.html','utf8').includes('trigger-gnome-puddle'));
for(const name of ['garden-gnome-puddles','garden-gnomes','pixi-live-gnomes'])assert.doesNotMatch(fs.readFileSync(`wwwroot/${name}.js`,'utf8'),/setTimeout|setInterval|requestAnimationFrame|EventSource|fetch\(/);
console.log('PASS: organic interior/segment/union entries, exact wetness and 20% boundaries, debouncing/one success/identity/RNG isolation, no hidden replay, all incident/action/click traces, shared state and 30 bounded Pixi resource cycles.');
