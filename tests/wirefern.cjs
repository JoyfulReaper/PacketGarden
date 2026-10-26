// Renderer-neutral wirefern rules and actual Pixi artwork/interaction ownership.
const assert=require('node:assert/strict'),page=require('./pixi-page.cjs'),C=require('../wwwroot/garden-core.js'),P=require('../wwwroot/pixi-live-core.js');
assert.deepEqual(C.timings.wirefern,{growingAfterMs:18000,matureAfterMs:50000,fadingAfterMs:300000,expiredAfterMs:360000});assert.equal(C.isProtected('wirefern'),false);
for(const [age,stage] of [[0,'sprout'],[18000,'growing'],[50000,'mature'],[300000,'fading'],[360000,'expired']])assert.equal(C.stageAt('wirefern',0,age),stage);
for(let vigor=0;vigor<4;vigor++){assert.equal(P.colorVariant('wirefern',vigor,.009999),4);assert.equal(P.colorVariant('wirefern',vigor,.01),vigor);}
(async()=>{const g=await page({random:()=>.5});for(const port of [23,2323])g.emit('garden',{specimenType:'wirefern',vigor:3,listenPort:port,sensor:'fern',seenCount:'12'});
  const first=g.model.specimens[0],parent=g.view.byId.get(first.id),frames=[];assert.equal(g.view.vineLinks.size,0);
  for(const age of [0,18000,50000,300000]){g.advance(first.createdAt+age-g.now());g.model.tick();frames.push(parent.texture);assert.equal(g.view.byId.get(first.id),parent);}
  assert.equal(new Set(frames).size,4);g.click(page.center(first));assert.equal(g.element('#specimen-card-title').textContent,'Wirefern');assert.equal(g.element('#specimen-port').textContent,'23');
  g.advance(first.createdAt+360000-g.now());g.model.tick();assert.equal(g.view.byId.size,0);assert(g.element('#specimen-card').hidden);
  g.close();assert.deepEqual(g.errors,[]);console.log('PASS: wirefern exact lifecycle/ordinary protection/color boundary, ports23/2323 provenance, four cached stages on exact parent, no vine links, inspection and expiry.');
})().catch(e=>{console.error(e);process.exitCode=1;});
