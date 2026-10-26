// First-seen visitors through supported Pixi SSE, model and click adapters.
const assert=require('node:assert/strict'),page=require('./pixi-page.cjs'),A=require('../wwwroot/garden-ambient.js'),T=require('../wwwroot/garden-ui-core.js');
(async()=>{const g=await page({random:()=>.5});
  for(const seenCount of ['01','2','1.0',null])g.emit('garden',{specimenType:'flower',listenPort:53,vigor:0,seenCount});
  assert.equal(g.ambient.curiosities.length,0);
  for(let i=0;i<4;i++)g.emit('garden',{specimenType:'flower',listenPort:53,vigor:0,seenCount:'1'});
  assert.equal(g.ambient.curiosities.length,3);assert.equal(g.model.counts.acceptedLive,8);
  const parentState=JSON.stringify(g.model.specimens),countState=JSON.stringify(g.model.counts),recent=JSON.stringify(g.model.recentEvents);
  const visitor=g.ambient.curiosities[0],point=A.curiosityPosition(visitor,g.now());g.click(point);
  assert.equal(g.ambient.curiosities.length,2);assert.equal(g.element('#collection-message').textContent,T.collectionMessage(visitor.type));
  assert.equal(JSON.stringify(g.model.specimens),parentState);assert.equal(JSON.stringify(g.model.counts),countState);assert.equal(JSON.stringify(g.model.recentEvents),recent);
  g.frame(20000);assert.equal(g.ambient.curiosities.length,0);
  for(const type of A.curiosityTypes){const item={type,x:400,y:300,origin:{x:400,y:300},phase:0,direction:1,createdAt:g.now(),expiresAt:g.now()+20000};
    g.ambient.seed({curiosities:[item]});g.click(A.curiosityPosition(item,g.now()));assert.equal(g.element('#collection-message').textContent,T.collectionMessage(type));assert.equal(g.ambient.curiosities.length,0);}
  assert.equal(g.element('#garden-score').textContent,'Score: 0');g.close();assert.deepEqual(g.errors,[]);
  console.log('PASS: exact first-seen qualification, cap3/no retry, all four visitors, actual scaled clicks, parent/stat/activity independence, expiry and zero score.');
})().catch(e=>{console.error(e);process.exitCode=1;});
