const assert=require('node:assert/strict'),fs=require('node:fs');
const h=require('./pixi-live.cjs'),core=require('../wwwroot/pixi-live-core.js'),shared=require('../wwwroot/pixi-stress.js');
const {createView}=require('../wwwroot/pixi-live.js');
const E=require('../wwwroot/garden-ecology.js'),EP=require('../wwwroot/pixi-live-ecology.js');
const A=require('../wwwroot/garden-ambient.js'),AP=require('../wwwroot/pixi-live-ambient.js');
let at=100000;
const app={stage:new h.P.Container()},v=createView(h.P,app,h.cache.frames,core,shared);
const ec=EP.makeEcologyAtlas(h.P,h.renderer),ev=EP.createEcologyView(h.P,v.grassLayer,v.puddleLayer,ec.frames);
const ecology=E.createEcologyModel({now:()=>at,random:()=>.5,onChange:c=>ev.change(c,at)});
const ac=AP.makeAmbientAtlas(h.P,h.renderer),av=AP.createAmbientView(h.P,v.curiosityLayer,v.dropLayer,ac.frames);
assert.equal(h.cache.frames.size+ec.frames.size+ac.frames.size,865);
assert.equal(new Set([...h.cache.frames.values(),...ec.frames.values(),...ac.frames.values()].map(t=>t.source)).size,3);
const ambient=A.createAmbientModel({now:()=>at,random:()=>0,getSpecimens:()=>model.specimens,onChange:c=>av.change(c,at)});
const model=core.createModel(v,{now:()=>at,random:()=>0,bloomRandom:()=>0,vineBloomRandom:()=>.9,onLive:p=>ambient.acceptLiveSpecimen(p),onRemoved:p=>ambient.cancelSource(p)});
model.seed();EP.seedDenseEcology(ecology,at,true);AP.seedAmbient(ambient,at);
assert.equal(v.bloomViews.size,64);assert.equal(v.snapshot().displayObjects,1372+64);
const grass=[...v.grassLayer.children],puddles=[...v.puddleLayer.children],visitors=[...v.curiosityLayer.children],drops=[...v.dropLayer.children];
const others=new Map(v.byId),created=v.counters.created,textures=h.textureCount(),generated=h.generated();
model.seedMutations(true);
const pending=model.specimens.filter(p=>p.pendingMutation),pendingSprites=pending.map(p=>v.byId.get(p.id));
assert.equal(pending.length,4);assert.equal(v.mutationViews.size,0);assert.equal(v.counters.created,created);
const identities=pending.map(p=>[p.id,p.cell,p.column,p.row,p.vigor,p.createdAt,p.origin]);
const before=pendingSprites.map(p=>p.texture);at+=2999;model.tick();assert.equal(v.mutationViews.size,0);
pendingSprites.forEach((p,i)=>assert.equal(p.texture,before[i]));
at++;model.tick();assert.equal(model.mutations.snapshot().active,3);assert.equal(model.mutations.snapshot().capSkips,1);
assert.equal(v.mutationViews.size,3);assert.equal(v.byId.size,640);assert.equal(v.counters.created,created);
for(const [i,p] of pending.entries()) {
  assert.equal(v.byId.get(p.id),pendingSprites[i]);assert.deepEqual([p.id,p.cell,p.column,p.row,p.vigor,p.createdAt,p.origin],identities[i]);
  assert.equal(pendingSprites[i].texture,i<3?h.cache.frames.get('collectible_weed'):before[i]);
}
for(const [id,sprite] of others)assert.equal(v.byId.get(id),sprite);
assert.equal(v.snapshot().displayObjects,1372+64,'activation adds neither Sprite nor cell');
assert.deepEqual(v.grassLayer.children,grass);assert.deepEqual(v.puddleLayer.children,puddles);
assert.deepEqual(v.curiosityLayer.children,visitors);assert.deepEqual(v.dropLayer.children,drops);
for(const level of Object.keys(core.weatherLevels))v.setWeather({level,eventsPerMinute:10000});
for(let i=0;i<1000;i++)v.animate(i/60,1/60,at+i);
assert.equal(h.textureCount(),textures);assert.equal(h.generated(),generated);assert.equal(v.mutationViews.size,3);
pendingSprites.slice(0,3).forEach(p=>assert.equal(p.texture,h.cache.frames.get('collectible_weed')));
at=identities[0][5]+30000;model.tick();assert.equal(v.mutationViews.size,3,'normal redbloom expiry cannot remove active mutation');
const expires=pending[0].mutation.expiresAt;at=expires-1;model.tick();assert.equal(v.byId.get(pending[0].id),pendingSprites[0]);
// A paint at the absolute boundary hides it, never restores the ordinary texture, even before a logical tick.
v.animate(1,.016,expires);assert.equal(pendingSprites[0].visible,false);assert.equal(pendingSprites[0].texture,h.cache.frames.get('collectible_weed'));
at=expires;const survivors=new Map(v.byId);model.tick();assert.equal(v.mutationViews.size,0);
for(const p of pending.slice(0,3)){assert(!v.byId.has(p.id));assert(!model.byCell.has(p.cell));assert(!h.live.has(survivors.get(p.id)));}
for(const [id,sprite] of survivors)if(!pending.some(p=>p.id===id))assert.equal(v.byId.get(id),sprite);
assert.equal(model.mutations.snapshot().expiries,3);
for(let i=0;i<10;i++){model.seed();model.seedMutations();assert.equal(v.mutationViews.size,3);model.clear();assert.equal(v.mutationViews.size,0);assert.equal(model.mutations.snapshot().pending,0);assert.equal(model.byCell.size,0);}
assert.equal(h.textureCount(),textures);assert.equal(h.generated(),generated);
// Real accepted events use the same rules; Amanita pending state remains independent.
const red=model.accept({specimenType:'redbloom',vigor:0,listenPort:22,seenCount:'1'});
const mushroom=model.accept({specimenType:'mushroom',vigor:0,listenPort:70,seenCount:'1'});
assert(red.pendingMutation);assert.equal(ambient.pendingDrops.size,1);assert(!mushroom.pendingMutation);
at+=3000;model.tick();assert(red.mutation);assert.equal(ambient.pendingDrops.size,1);
model.clear();assert.equal(ambient.pendingDrops.size,0);
const beforeActivation=model.mutations.snapshot().activations;
const due=model.accept({specimenType:'redbloom',vigor:0,listenPort:22});
at+=3000;
model.accept({specimenType:'flower',vigor:0,listenPort:80});
assert(due.mutation,'incoming events reconcile due mutations before placement');
assert.equal(model.mutations.snapshot().activations,beforeActivation+1);
model.clear();
ambient.clear();ecology.clear();av.destroy();ev.destroy();v.destroy();ac.destroy();ec.destroy();
assert.doesNotMatch(fs.readFileSync('wwwroot/pixi-live.js','utf8'),/setTimeout|setInterval|addEventListener\(['"]pointer|addEventListener\(['"]click['"],.*collect/);
console.log('PASS: pending stays ordinary, same Sprite/id/cell on activation, three cached mutation views, exact expiry/no flash, full dense 1436 objects including 64 broadleaf overlays and 865 frames/3 sources, weather/ecology/ambient isolation, clear/refill and independent real mutation/Amanita scheduling.');
