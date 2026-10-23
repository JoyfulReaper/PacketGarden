const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const B=require('../wwwroot/pixi-broadleaf-blooms.js'),G=require('../wwwroot/garden-core.js');
const core=require('../wwwroot/pixi-live-core.js'),shared=require('../wwwroot/pixi-stress.js');
const h=require('./pixi-live.cjs'),{createView}=require('../wwwroot/pixi-live.js'),{start}=require('./pixi-default.cjs');
const event={specimenType:'broadleaf',listenPort:443,vigor:0,sensor:'bloom-test',seenCount:'12'};
assert.equal(B.chance,.2);assert.deepEqual(B.colors,['Pink','Yellow','White','Purple','Blue']);
for(const [roll,success] of [[0,true],[.199999999,true],[.2,false],[.999999,false]]){
  const p={type:'broadleaf'};let calls=0;const draw=()=>{calls++;return roll;};
  const trait=B.assign(p,draw);assert.equal(Boolean(trait),success);
  for(let i=0;i<100;i++)assert.equal(B.assign(p,draw),trait);
  assert.equal(calls,1,'one draw, including stable failed decisions');
  assert.equal(Object.keys(p).includes('broadleafBloom'),false,'cosmetics stay out of ordinary serialized state');
}
let winners=0;const colors=[0,0,0,0,0],layouts=[0,0,0];
for(let i=0;i<10000;i++){const trait=B.assign({type:'broadleaf'},()=>(i+.5)/10000);if(trait){winners++;colors[trait.color]++;layouts[trait.arrangement]++;}}
assert.equal(winners,2000);assert.deepEqual(colors,[400,400,400,400,400]);assert(layouts.every(n=>n>=666&&n<=667));
assert.equal(B.assign({type:'flower'},()=>{throw Error('ineligible roll');}),null);
// The default PRNG must work even when the gameplay random function is forbidden.
const context={window:{},Uint32Array,Date,Math:Object.create(Math),crypto:{getRandomValues(values){values[0]=137;return values;}}};
context.Math.random=()=>{throw Error('gameplay RNG consumed');};vm.runInNewContext(fs.readFileSync('wwwroot/pixi-broadleaf-blooms.js','utf8'),context);
for(let i=0;i<100;i++)context.window.PacketGardenBroadleafBlooms.assign({type:'broadleaf'});
// Identical gameplay rolls yield identical placements, foliage, provenance, outcomes and counts.
function trace(bloomRandom){let calls=0,at=100000;const model=core.createModel({add(){},update(){},remove(){}},
  {now:()=>at,random:()=>{calls++;return .5;},bloomRandom});
  for(let i=0;i<70;i++)model.acceptEvent({...event,specimenType:i%3?'broadleaf':'flower',vigor:i%4});
  return {model,calls};}
const blooming=trace(()=>.01),plain=trace(()=>.9);
assert.equal(blooming.calls,plain.calls);assert.equal(JSON.stringify(blooming.model.specimens),JSON.stringify(plain.model.specimens));
assert.deepEqual(blooming.model.counts,plain.model.counts);assert.deepEqual(blooming.model.recentEvents,plain.model.recentEvents);
assert.equal(core.colorVariant('broadleaf',2,.0099999),4);assert.equal(core.colorVariant('broadleaf',2,.01),2);
const before=h.live.size,textures=h.textureCount(),bakes=h.generated(),stage=new h.P.Container();
const view=createView(h.P,{stage},h.cache.frames,core,shared);let at=100000,calls=0;
const model=core.createModel(view,{now:()=>at,random:()=>.5,bloomRandom:()=>{calls++;return .19999;}});
const p=model.acceptEvent({...event,broadleafBloom:null}).specimen,trait=p.broadleafBloom;
assert(trait,'network cannot supply the cosmetic outcome');assert.equal(calls,1);
const parent=view.byId.get(p.id);assert.equal(parent.children.length,0,'sprout');
at=p.createdAt+G.timings.broadleaf.growingAfterMs;model.tick();assert.equal(parent.children.length,0,'growing');
at=p.createdAt+G.timings.broadleaf.matureAfterMs-1;model.tick();assert.equal(view.bloomViews.size,0);
at++;model.tick();const blossom=view.bloomViews.get(p.id);
assert.equal(blossom.parent,parent);assert.equal(parent.children.length,1);assert.equal(blossom.eventMode,'none');
assert.equal(blossom.texture,h.cache.frames.get(`broadleaf-bloom:${trait.color}:${trait.arrangement}`));
assert.equal(blossom.alpha,1);assert.equal(blossom.scale.x,1);
for(let i=0;i<100;i++){view.update(p,model.byCell);view.animate(i,.016,at);}
assert.equal(calls,1);assert.equal(p.broadleafBloom,trait);assert.equal(view.bloomViews.get(p.id),blossom);
const previewStage=new h.P.Container(),preview=createView(h.P,{stage:previewStage},h.cache.frames,core,shared);
preview.add(p,model.byCell);assert.equal(preview.bloomViews.get(p.id).texture,blossom.texture);
assert.equal(p.broadleafBloom,trait);assert.equal(calls,1,'recreating presentation keeps the original decision');
preview.destroy();previewStage.destroy();
at=p.createdAt+G.timings.broadleaf.fadingAfterMs;model.tick();
assert.equal(view.bloomViews.get(p.id),blossom);assert.equal(blossom.alpha,.55);assert.equal(blossom.scale.x,.66);assert.notEqual(blossom.tint,0xffffff);
at=p.createdAt+G.timings.broadleaf.expiredAfterMs;model.tick();assert.equal(view.bloomViews.size,0);assert(!h.live.has(blossom));assert(!h.live.has(parent));
// Mature failed rolls never acquire an overlay; young successful rolls keep their outcome on hidden-style late reconciliation.
const failed=core.createModel(view,{now:()=>at,random:()=>.5,bloomRandom:()=>.2});
const q=failed.acceptEvent(event).specimen;at=q.createdAt+60000;failed.tick();assert.equal(view.bloomViews.size,0);failed.clear();
const r=model.acceptEvent(event).specimen;at=r.createdAt+320000;model.tick();assert.equal(view.bloomViews.size,1);assert.equal(view.bloomViews.get(r.id).alpha,.55);model.clear();
// All 640 parents bloom, all five foliage variants remain intact, no new textures or runtime Graphics.
model.seedBroadleafBlooms(true);assert.equal(model.specimens.length,640);assert.equal(view.byId.size,640);assert.equal(view.bloomViews.size,640);
assert.equal(view.snapshot().sprites,640);assert.equal(new Set(model.specimens.map(p=>p.cell)).size,640);
assert.deepEqual([...new Set(model.specimens.map(p=>p.colorVariant))].sort(),[0,1,2,3,4]);
const rare=model.specimens.find(p=>p.colorVariant===4);assert.equal(view.byId.get(rare.id).texture,h.cache.frames.get(`broadleaf:mature:${rare.vigor}:4`));
const victim=model.specimens[0],oldBloom=view.bloomViews.get(victim.id),oldParent=view.byId.get(victim.id);
assert.equal(model.acceptEvent({...event,specimenType:'flower',vigor:3}).outcome,'replaced');
assert(!h.live.has(oldBloom));assert(!h.live.has(oldParent));assert.equal(view.bloomViews.size,639);assert.equal(model.specimens.length,640);
for(let i=0;i<1000;i++)view.animate(i/60,1/60,at);
assert.equal(h.textureCount(),textures);assert.equal(h.generated(),bakes);
model.clear();assert.equal(view.bloomViews.size,0);assert.equal(view.byId.size,0);
for(let i=0;i<10;i++){model.seedBroadleafBlooms(true);model.clear();}
view.destroy();stage.destroy();assert.equal(h.live.size,before);assert.equal(h.textureCount(),textures);
assert(!fs.readFileSync('wwwroot/canvas.html','utf8').includes('pixi-broadleaf-blooms'),'Canvas does not load bloom code');
(async()=>{
  for(const page of ['index.html','pixi-live.html'])for(const reduced of [false,true]){
    const g=await start(false,{pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8'),captureModel:true,reduced});
    assert.deepEqual(g.errors,[]);assert.equal(g.sources.length,1);
    if(page==='index.html')assert.equal(g.element('#seed-broadleaf-blooms'),null);
    else{
      g.element('#seed-broadleaf-blooms').handlers.get('click')();
      assert.equal(g.model.specimens.length,25);assert.equal(g.view.bloomViews.size,10);assert.equal(g.ecology.grassCells.length,640);
      const specimen=g.model.specimens.find(p=>p.stage==='mature'&&p.broadleafBloom);
      const sprite=g.view.bloomViews.get(specimen.id),pose=[sprite.scale.x,sprite.alpha,sprite.rotation];
      for(let i=0;i<10;i++)g.view.animate(i,.016,g.context.Date.now());
      assert.deepEqual([sprite.scale.x,sprite.alpha,sprite.rotation],pose,'no motion in either mode');
      g.element('#seed-dense-broadleaf-blooms').handlers.get('click')();assert.equal(g.view.bloomViews.size,640);
      assert.equal(g.model.specimens.length,640);assert.equal(g.ecology.grassCells.length,640);
      assert.equal(g.element('#garden-score').textContent,'Score: 0');
      g.doc.hidden=true;g.docHandlers.get('visibilitychange')();g.advance(360001);
      g.doc.hidden=false;g.docHandlers.get('visibilitychange')();assert.equal(g.view.bloomViews.size,0);
    }
    g.winHandlers.get('pagehide')({persisted:false});assert.equal(g.view.bloomViews.size,0);assert.deepEqual(g.errors,[]);
  }
  console.log('PASS: 20%/one-draw stable cosmetics, five independent colors, lifecycle gates/fade/expiry, replacement/640-parent ownership, rare foliage compatibility, unchanged random/SSE/provenance/counts/score, diagnostic-only fixtures and reduced-motion/hidden teardown.');
})().catch(error=>{console.error(error);process.exitCode=1;});
