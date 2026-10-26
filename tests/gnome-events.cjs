// Supported Pixi page tick/input ownership around the shared incident model.
const assert=require('node:assert/strict'),page=require('./pixi-page.cjs');
(async()=>{for(const reduced of [false,true]){const g=await page({reduced,random:()=>0});
  g.garden.seed(Array.from({length:30},(_,i)=>({type:'broadleaf',column:i%32,row:Math.floor(i/32),vigor:0,createdAt:g.now()})));
  const before=JSON.stringify([g.model.counts,g.model.recentEvents]),cells=[...g.model.byCell.keys()];
  for(let i=0;i<179;i++)g.frame(250);assert.equal(g.gnomes.actors.length,0);g.frame(250);assert.equal(g.gnomes.actors.length,4);
  const actors=g.gnomes.actors.slice(),objects=g.view.curiosityLayer.children[0].children.slice();assert.equal(objects.length,4);assert.equal(g.view.root.children.indexOf(g.view.curiosityLayer),8);
  for(let i=0;i<48;i++)g.frame(250);assert.equal(g.gnomes.actors.length,0);assert.equal(g.view.curiosityLayer.children.length,0);
  assert.equal(g.gnomes.incident,null);assert.deepEqual([...g.model.byCell.keys()],cells);assert.equal(JSON.stringify([g.model.counts,g.model.recentEvents]),before);
  assert(g.gnomes.start(g.now(),()=>.5));g.frame(250);g.hidden(true);assert.equal(g.app.active,false);
  g.advance(60000);g.hidden(false);assert.equal(g.gnomes.incident,null);assert.equal(g.view.curiosityLayer.children.length,0);
  g.close();assert.deepEqual(g.errors,[]);
}console.log('PASS: actual Pixi 45-second eligibility check, four-actor 12-second incident, render layer, normal/reduced poses, occupancy/stat independence, hidden cancellation and page teardown.');})().catch(e=>{console.error(e);process.exitCode=1;});
