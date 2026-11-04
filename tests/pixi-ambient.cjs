const assert=require('node:assert/strict'),fs=require('node:fs');
const h=require('./pixi-live.cjs'),A=require('../wwwroot/garden-ambient.js');
const V=require('../wwwroot/pixi-live-ambient.js'),C=require('../wwwroot/pixi-live-core.js');
const {P,renderer}=h,textureBefore=h.textureCount(),generatedBefore=h.generated();
const atlas=V.makeAmbientAtlas(P,renderer),curiosityLayer=new P.Container(),dropLayer=new P.Container();
assert.equal(atlas.frames.size,23);assert.equal(new Set([...atlas.frames.values()].map(t=>t.source)).size,1);
const view=V.createAmbientView(P,curiosityLayer,dropLayer,atlas.frames);let now=100000;
let model;const ambient=A.createAmbientModel({now:()=>now,random:()=>0,getSpecimens:()=>model.specimens,onChange:c=>view.change(c,now)});
model=C.createModel({add(){},update(){},remove(){}},{now:()=>now,random:()=>.5,competitionRandom:()=>0,onLive:s=>ambient.acceptLiveSpecimen(s),onRemoved:s=>ambient.cancelSource(s)});
const event=(type='flower',seenCount='1',vigor=0)=>({specimenType:type,listenPort:53,seenCount,vigor});
model.accept(event());assert.equal(view.curiosityViews.size,1);const item=ambient.curiosities[0],id=ambient.idFor(item),sprite=view.curiosityViews.get(id).sprite;
const texture=sprite.texture;view.animate(now+5000);assert.equal(view.curiosityViews.get(id).sprite,sprite);assert.equal(sprite.texture,texture);
model.accept(event());const survivor=ambient.curiosities[1],survivorSprite=view.curiosityViews.get(ambient.idFor(survivor)).sprite;
ambient.removeCuriosity(item);assert(!h.live.has(sprite));assert.equal(view.curiosityViews.get(ambient.idFor(survivor)).sprite,survivorSprite);
model.accept(event('mushroom','2'));assert.equal(ambient.pendingDrops.size,1);assert.equal(view.dropViews.size,0);now+=5000;model.tick();ambient.tick(now);
const drop=ambient.drops[0],dropSprite=view.dropViews.get(ambient.idFor(drop)).sprite;view.animate(now+1000);assert.equal(view.dropViews.get(ambient.idFor(drop)).sprite,dropSprite);
for(let cycle=0;cycle<10;cycle++){
  V.seedAmbient(ambient,now,cycle%4);assert.equal(view.curiosityViews.size,3);assert.equal(view.dropViews.size,3);
  const views=[...view.curiosityViews.values(),...view.dropViews.values()];
  for(let frame=0;frame<120;frame++)view.animate(now+frame*1000/60);
  assert.deepEqual([...view.curiosityViews.values(),...view.dropViews.values()],views);
  assert.equal(h.textureCount(),textureBefore+23);assert.equal(h.generated(),generatedBefore+1);
  const pebble=ambient.curiosities.find(c=>c.type==='shiny_pebble');
  if(pebble){const s=view.curiosityViews.get(ambient.idFor(pebble)).sprite;assert.equal(s.position.x,pebble.x);assert.equal(s.position.y,pebble.y);}
  ambient.clear();assert.equal(view.curiosityViews.size,0);assert.equal(view.dropViews.size,0);
}
for(let cycle=0;cycle<10;cycle++){
  ambient.seed({drops:Array.from({length:5},(_,i)=>({type:i%2?'amanita_muscaria':'ditch_weed_bud',
    createdAt:now,expiresAt:now+20000,x:100+i*100,y:300,phase:0}))});
  assert.equal(view.dropViews.size,5);assert.equal(dropLayer.children.length,5);
  assert.throws(()=>ambient.seed({drops:Array(6).fill(ambient.drops[0])}),/Invalid ambient seed/);
  assert.equal(view.dropViews.size,5,'invalid six-drop seed leaves existing five intact');
  ambient.tick(now+20000);assert.equal(view.dropViews.size,0);assert.equal(dropLayer.children.length,0);
  assert.equal(h.textureCount(),textureBefore+23);assert.equal(h.generated(),generatedBefore+1);
}
V.seedAmbient(ambient,now);const last=ambient.drops[2];ambient.drops[0].expiresAt=now;ambient.tick(now);
assert.equal(view.dropViews.size,2);assert(view.dropViews.has(ambient.idFor(last)));
now+=20000;ambient.tick(now);assert.equal(view.curiosityViews.size,0);assert.equal(view.dropViews.size,0);
model.seed();for(const s of model.specimens){s.type='ghostbloom';s.vigor=3;s.createdAt=now;}
assert.equal(view.curiosityViews.size,0);assert.equal(view.dropViews.size,0,'local specimen seed never triggers live ambient rules');
assert.equal(model.accept(event('mushroom','1',3)),null);assert.equal(ambient.pendingDrops.size,0);assert.equal(view.curiosityViews.size,0,'saturated live rejection creates no ambient object');
const source=model.specimens[17];source.type='mushroom';source.vigor=0;source.origin={kind:'tcpnoise'};
ambient.maybeScheduleAmanita(source,0,()=>.5,now);assert(ambient.pendingDrops.has(source));
const replacement=model.accept(event('flower','2',1));assert.equal(replacement.cell,source.cell);assert(!ambient.pendingDrops.has(source));
ambient.maybeScheduleAmanita(model.accept(event('mushroom','2',3)),0,()=>.5,now);model.clear();ambient.clear();assert.equal(ambient.pendingDrops.size,0);
view.destroy();curiosityLayer.destroy();dropLayer.destroy();atlas.destroy();assert.equal(h.textureCount(),textureBefore);
const sourceCode=fs.readFileSync('wwwroot/pixi-live-ambient.js','utf8');assert.doesNotMatch(sourceCode,/setTimeout|setInterval|EventSource|fetch\(|localStorage|sessionStorage/);
assert.doesNotMatch(fs.readFileSync('wwwroot/pixi-stress.html','utf8'),/ambient/);
console.log('PASS: persistent visitor/drop views, movement identity/exact removal, 3 visitor/5 drop caps, 23 fixed frames across repeated seed/expiry/clear, pebble static, exact-source replacement cancellation, teardown and page isolation.');
