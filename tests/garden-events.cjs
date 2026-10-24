// Actual Pixi page SSE, weather, placement and lifecycle integration.
const assert=require('node:assert/strict'),page=require('./pixi-page.cjs'),C=require('../wwwroot/pixi-live-core.js');
(async()=>{for(const route of ['index.html','pixi-live.html']){
  const g=await page({page:route,random:()=>.5}),source=g.sources[0];
  assert.equal(g.sources.length,1);assert.equal(source.url,'/api/garden/events');
  assert.deepEqual([...source.handlers.keys()],['garden','weather']);source.onopen();assert.match(g.element('#connection').textContent,/connected/i);
  const grass=JSON.stringify(g.ecology.grassCells);
  for(const [i,type] of C.eventSpecies.entries())g.emit('garden',{specimenType:type,listenPort:type==='redbloom'?22:80,vigor:i%4,sensor:'safe',seenCount:'2',remoteIp:'secret'});
  assert.equal(g.model.specimens.length,10);assert.equal(g.model.counts.acceptedLive,10);
  assert(g.model.specimens.every(p=>p.origin.kind==='tcpnoise'&&!('remoteIp'in p.origin)));
  assert(g.ecology.grassCells.every(c=>c.lastInfluencedAt<=g.now()),'real growth never refreshes grass');
  for(const data of ['{','null',{}, {specimenType:'nope',vigor:0,listenPort:80},{specimenType:'flower',vigor:4,listenPort:80}])g.emit('garden',data);
  assert.equal(g.model.counts.acceptedLive,10);assert.equal(g.errors.length,0);
  source.onerror();assert.match(g.element('#connection').textContent,/reconnect/i);source.onopen();assert.equal(g.sources.length,1);
  g.emit('weather',{level:'rain',eventsPerMinute:29.8,eventsLastHour:4321,hasSnapshot:true});
  if(route==='index.html')assert.equal(g.element('#network-events-hour').textContent,'4,321');
  const before=g.view.snapshot();g.emit('weather','{');g.emit('weather',{level:'invalid',eventsPerMinute:0});
  assert.deepEqual(g.view.snapshot(),before,'invalid weather preserves the rendered state');
  for(const level of Object.keys(C.weatherLevels))g.emit('weather',{level,eventsPerMinute:10000,hasSnapshot:true});
  if(route==='pixi-live.html'){
    const mode=g.element('#weather-source'),level=g.element('#weather-level');mode.value='manual';mode.handlers.get('change')();
    level.value='quiet';level.handlers.get('change')();assert.equal(g.view.snapshot().particles,0);
    g.emit('weather',{level:'botnet_hurricane',eventsPerMinute:10000,hasSnapshot:true});assert.equal(g.view.snapshot().particles,0);
    mode.value='live';mode.handlers.get('change')();assert.equal(g.view.snapshot().particles,400);
    g.model.setPaused(true);g.emit('garden',{specimenType:'flower',vigor:0,listenPort:53});assert.equal(g.model.counts.acceptedLive,10);g.model.setPaused(false);
  }
  g.model.seed();for(const p of g.model.specimens)p.vigor=3;
  const stable=JSON.stringify(g.model.specimens);g.emit('garden',{specimenType:'flower',vigor:3,listenPort:53});assert.equal(JSON.stringify(g.model.specimens),stable);
  const victim=g.model.specimens.find(p=>p.type==='flower');victim.vigor=0;
  g.emit('garden',{specimenType:'wirefern',vigor:1,listenPort:23});assert.equal(g.model.byCell.get(victim.cell).type,'wirefern');assert.equal(g.model.counts.replacements,1);
  g.hidden(true);g.advance(720001);g.hidden(false);assert.equal(g.model.specimens.length,0);assert.equal(g.view.byId.size,0);
  g.close();assert(source.closed);assert.deepEqual(g.errors,[]);
}console.log('PASS: Pixi SSE safe fields/invalid frames/reconnect, ten species, live/manual weather, pause/saturation/replacement, hidden lifecycles and cleanup.');})().catch(e=>{console.error(e);process.exitCode=1;});
