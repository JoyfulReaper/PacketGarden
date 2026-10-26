// Applied Pixi live/manual weather drives the unchanged ecology model.
const assert=require('node:assert/strict'),page=require('./pixi-page.cjs'),E=require('../wwwroot/garden-ecology.js');
(async()=>{for(const route of ['index.html','pixi-live.html']){const g=await page({page:route,random:()=>0});
  g.emit('garden',{specimenType:'broadleaf',listenPort:80,vigor:2});
  const stable=JSON.stringify([g.model.specimens,g.model.counts,g.model.recentEvents,g.ecology.grassCells]);
  g.emit('weather',{level:'rain',eventsPerMinute:10000,hasSnapshot:true});g.advance(15000);g.ecology.tickPuddles(g.now());assert.equal(g.ecology.puddles.length,0);
  g.emit('weather',{level:'heavy_rain',eventsPerMinute:10000,hasSnapshot:true});const due=g.ecology.nextPuddleCheckAt;
  g.advance(10000);g.emit('weather',{level:'botnet_hurricane',eventsPerMinute:10000,hasSnapshot:true});assert.equal(g.ecology.nextPuddleCheckAt,due);
  g.advance(5000);g.ecology.tickPuddles(g.now());assert.equal(g.ecology.puddles.length,1);const puddle=g.ecology.puddles[0];
  assert.equal(E.puddleVisualState(puddle,puddle.createdAt).size,10);assert.equal(E.puddleVisualState(puddle,puddle.createdAt+15000).size,18);
  assert.equal(JSON.stringify([g.model.specimens,g.model.counts,g.model.recentEvents,g.ecology.grassCells]),stable);
  if(route==='pixi-live.html'){
    const mode=g.element('#weather-source'),level=g.element('#weather-level');mode.value='manual';mode.handlers.get('change')();level.value='quiet';level.handlers.get('change')();
    const refreshed=puddle.lastRefreshedAt;g.emit('weather',{level:'botnet_hurricane',eventsPerMinute:10000,hasSnapshot:true});
    g.advance(15000);g.ecology.tickPuddles(g.now());assert.equal(puddle.lastRefreshedAt,refreshed);
    mode.value='live';mode.handlers.get('change')();g.advance(15000);g.ecology.tickPuddles(g.now());assert(puddle.lastRefreshedAt>refreshed);
  }
  g.emit('weather',{level:'quiet',eventsPerMinute:0,hasSnapshot:true});const expiry=puddle.lastRefreshedAt+510000;
  g.advance(expiry-g.now());g.ecology.removeExpiredPuddles(g.now());assert.equal(g.ecology.puddles.length,0);
  const root=g.view.root;assert(root.children.indexOf(g.view.grassLayer)<root.children.indexOf(g.view.puddleLayer));assert(root.children.indexOf(g.view.puddleLayer)<6);
  g.hidden(true);g.advance(600000);g.hidden(false);assert.equal(g.ecology.puddles.length,0);assert.equal(g.element('#garden-score').textContent,'Score: 0');
  g.close();assert.deepEqual(g.errors,[]);
}console.log('PASS: applied live/manual storm eligibility/cadence, bounded shared growth/drain, no plant/grass/activity/score changes, grass-water-plant layering, hidden cleanup and one SSE.');})().catch(e=>{console.error(e);process.exitCode=1;});
