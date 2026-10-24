// Actual Pixi collection and the unchanged renderer-neutral mutation rules.
const assert=require('node:assert/strict'),page=require('./pixi-page.cjs'),h=require('./pixi-live.cjs');
(async()=>{const g=await page({random:()=>.5});
  g.emit('garden',{specimenType:'redbloom',listenPort:22,vigor:2,sensor:'source',seenCount:'12'});
  const p=g.model.specimens[0],sprite=g.view.byId.get(p.id),identity=JSON.stringify([p.cell,p.vigor,p.createdAt,p.origin]);
  assert.equal(g.model.mutations.maybeSchedulePort22Mutation(p,.05),false);
  assert(g.model.mutations.maybeSchedulePort22Mutation(p,.049999));assert(!p.mutation);
  g.frame(2999);assert(!p.mutation);g.frame(1);g.model.tick(g.now());assert(p.mutation);assert.equal(g.view.byId.get(p.id),sprite);
  assert.equal(JSON.stringify([p.cell,p.vigor,p.createdAt,p.origin]),identity);assert.equal(g.model.byCell.get(p.cell),p);
  const before=JSON.stringify(g.model.counts);g.click(page.center(p));
  assert.equal(g.model.specimens.length,0);assert.equal(g.model.byCell.size,0);assert(!h.live.has(sprite));
  assert.equal(g.element('#collection-message').textContent,'You collected some weed. +0 points');assert.equal(JSON.stringify(g.model.counts),before);
  assert.equal(g.element('#garden-score').textContent,'Score: 0');g.frame(2000);assert(g.element('#collection-message').hidden);
  const sources=[];for(let i=0;i<4;i++){g.emit('garden',{specimenType:'redbloom',listenPort:22,vigor:0});const source=g.model.specimens.at(-1);sources.push(source);g.model.mutations.maybeSchedulePort22Mutation(source,0);}
  g.frame(3000);assert.equal(g.view.mutationViews.size,3);assert(!sources[3].mutation&&!sources[3].pendingMutation);
  g.click(page.center(sources[0]));g.frame(250);assert(!sources[3].mutation,'cap skips never retry');
  g.frame(20000);assert.equal(g.view.mutationViews.size,0);assert.equal(g.model.mutations.snapshot().active,0);
  g.close();assert.deepEqual(g.errors,[]);console.log('PASS: .05 boundary, exact parent/cell/vigor/provenance and Sprite, three-second mutation/cap/no-retry, collection hit, message/static score, lifetime and cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
