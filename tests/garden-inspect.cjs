// Supported page inspection: real provenance, CSS/DPR transform and exact identity.
const assert=require('node:assert/strict'),page=require('./pixi-page.cjs');
(async()=>{for(const route of ['index.html','pixi-live.html']){const g=await page({page:route,random:()=>.5});
  g.emit('garden',{specimenType:'broadleaf',vigor:3,listenPort:445,sensor:'<b>safe text</b>',seenCount:'18446744073709551615'});
  const p=g.model.specimens[0];g.click(page.center(p));assert(!g.element('#specimen-card').hidden);
  assert.equal(g.element('#specimen-sensor').textContent,'<b>safe text</b>');assert.equal(g.element('#specimen-seen-count').textContent,'18446744073709551615');
  assert.equal(g.element('#specimen-port').textContent,'445');assert.match(g.element('#specimen-source').textContent,/TCPNoise/);
  g.frame(65000);assert.equal(g.element('#specimen-age').textContent,'1m 5s');
  g.winHandlers.get('keydown')({key:'Escape'});assert(g.element('#specimen-card').hidden);
  g.click(page.center(p));g.element('#specimen-card-close').handlers.get('click')();assert(g.element('#specimen-card').hidden);
  g.click(page.center(p));g.click({x:959,y:599});assert(g.element('#specimen-card').hidden);
  g.click(page.center(p));g.model.remove(p);assert(g.element('#specimen-card').hidden);
  g.garden.seed([{type:'flower',column:5,row:6,vigor:0,createdAt:g.now(),origin:{kind:'simulated',eventType:'dns'}}]);
  const fake=g.model.specimens[0];g.click(page.center(fake));assert.match(g.element('#specimen-source').textContent,/Simulated/);assert.equal(g.element('#specimen-port').textContent,'—');
  assert.equal(g.element('#specimen-seen-count').textContent,'—');g.frame(240000);assert(g.element('#specimen-card').hidden);
  g.close();assert.deepEqual(g.errors,[]);
}console.log('PASS: both Pixi pages inspect exact safe provenance, age, simulated labels, cell picking, empty/close/Escape, parent removal and lifecycle expiry.');})().catch(e=>{console.error(e);process.exitCode=1;});
