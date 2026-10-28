const assert=require('node:assert/strict'),fs=require('node:fs');
const G=require('../wwwroot/garden-gnomes.js'),V=require('../wwwroot/pixi-live-gnomes.js'),h=require('./pixi-live.cjs');
const {start}=require('./pixi-default.cjs'),audio=require('./audio-context.cjs');
let at=100000;
const layer=new h.P.Container(),before=h.textureCount(),generated=h.generated(),cache=V.makeGnomeAtlas(h.P,h.renderer);
assert.equal(cache.frames.size,26);assert.equal(new Set([...cache.frames.values()].map(t=>t.source)).size,1);
assert.equal(h.textureCount(),before+26);assert.equal(h.generated(),generated+1);
const view=V.createGnomeView(h.P,layer,cache.frames),specimens=Array.from({length:30},()=>({type:'broadleaf',createdAt:at}));
const model=G.createModel({now:()=>at,getSpecimens:()=>specimens,onChange:view.change});
assert.equal(layer.children.length,0,'inactive incidents allocate no display objects');
for(let incident=0;incident<20;incident++) {
  assert(model.start(at,()=>.5));assert.equal(view.views.size,4);assert.equal(layer.children.length,1);const sprites=[...view.views.values()];
  for(let frame=0;frame<720;frame++) {
    const now=at+frame*1000/60;model.advance(now,()=>incident%2?.9:.1);view.animate(now);
    assert([...view.views.values()].every(s=>sprites.includes(s)));assert([...view.views.values()].every(s=>Number.isFinite(s.position.x)&&Number.isFinite(s.position.y)));
  }
  model.advance(at+12000);assert.equal(view.views.size,0);assert.equal(layer.children.length,0);
  assert(sprites.every(s=>!h.live.has(s)));assert.equal(h.textureCount(),before+26);assert.equal(h.generated(),generated+1);
}
model.start(at,()=>.5);view.destroy();assert.equal(layer.children.length,0);model.clear();layer.destroy();cache.destroy();assert.equal(h.textureCount(),before);
assert.doesNotMatch(fs.readFileSync('wwwroot/pixi-live-gnomes.js','utf8'),/setTimeout|setInterval|requestAnimationFrame|EventSource|fetch\(/);
(async()=>{
  for(const page of ['index.html','pixi-live.html']) {
    const a=audio(),g=await start(false,{pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8'),AudioContext:a.AudioContext,captureModel:true});
    assert.deepEqual(g.errors,[]);const root=g.app.stage.children[0],visitors=root.children[8];
    // Capture the actual model at construction, not a second simulation.
    // start() exposes factory captures for this focused integration test.
    const gn=g.gnomes;
    assert(gn,'entry-point model captured');assert.equal(visitors.children.length,0);
    const fixture=g.element('#trigger-gnomes');
    if(fixture){fixture.handlers.get('click')();assert.match(g.element('#gnome-test-status').textContent,/Requires/);assert.equal(gn.incident,null);}
    for(let i=0;i<30;i++)g.model.accept({specimenType:'broadleaf',listenPort:443,vigor:0});
    const snapshot=JSON.stringify(g.model.specimens),recent=JSON.stringify(g.model.recentEvents),grass=root.children[3];
    g.frame(45000);assert.equal(gn.actors.length,4,'normal 2% eligibility works on both entry points');assert.equal(visitors.children.length,1);
    assert.equal(a.state.contexts.length,0,'muted gnomes never initialize audio');
    const positions=gn.actors.map(p=>[p.x,p.y]);g.winHandlers.get('resize')();assert.deepEqual(gn.actors.map(p=>[p.x,p.y]),positions);
    await g.element('#sound-toggle').handlers.get('click')();
    g.frame(3000);assert.equal(a.state.oscillators.length,1,'battle cue once');g.frame(1000);assert.equal(a.state.oscillators.length,1);
    g.frame(3000);assert.equal(a.state.oscillators.length,4,'victory cue once');g.frame(2000);assert.equal(gn.actors.length,2);g.frame(3000);
    assert.equal(gn.incident,null);assert.equal(visitors.children.length,0);assert.equal(a.state.oscillators.length,4);
    // Logical time changes normal stage fields, but cells/provenance/counts and Recent remain independent.
    assert.equal(g.model.specimens.length,30);assert.equal(JSON.stringify(g.model.recentEvents),recent);assert.equal(root.children[3],grass);
    const footprint=list=>JSON.stringify(list.map(p=>[p.id,p.type,p.cell,p.createdAt,p.origin]));assert.equal(footprint(g.model.specimens),footprint(JSON.parse(snapshot)));
    for(const expected of ['green','red'])if(fixture) {
      fixture.handlers.get('click')();g.frame(7000);assert.equal(gn.incident.winner,expected);g.frame(5000);assert.equal(visitors.children.length,0);
    }
    const slider=g.element('#sound-volume'),beforeZero=a.state.oscillators.length;slider.value='0';slider.handlers.get('input')();
    gn.start();gn.advance(g.context.Date.now()+3000);gn.advance(g.context.Date.now()+7000);
    assert.equal(a.state.oscillators.length,beforeZero,'zero-volume incidents remain silent');gn.clear();slider.value='12';slider.handlers.get('input')();
    gn.start();g.doc.hidden=true;g.docHandlers.get('visibilitychange')();const tones=a.state.oscillators.length;
    g.advance(120000);g.doc.hidden=false;g.docHandlers.get('visibilitychange')();
    assert.equal(gn.incident,null);assert.equal(a.state.oscillators.length,tones,'hidden completed incident has no stale cues');
    assert.equal(gn.nextCheckAt, g.context.Date.now()+45000);g.frame(1000);assert.equal(gn.incident,null,'resume has no replay');
    for(let i=0;i<30;i++)g.model.accept({specimenType:'broadleaf',listenPort:443,vigor:0});gn.start();
    if(g.element('#clear')) {g.element('#clear').handlers.get('click')();assert.equal(gn.incident,null);assert.equal(visitors.children.length,0);}
    g.winHandlers.get('pagehide')({persisted:false});assert.equal(gn.incident,null);assert.equal(gn.actors.length,0);assert.deepEqual(g.errors,[]);
  }
  const a=audio({failPlayback:true}),failed=await start(false,{AudioContext:a.AudioContext,captureModel:true});
  for(let i=0;i<30;i++)failed.model.accept({specimenType:'broadleaf',listenPort:443,vigor:0});
  await failed.element('#sound-toggle').handlers.get('click')();failed.gnomes.start();
  assert.doesNotThrow(()=>failed.gnomes.advance(failed.context.Date.now()+3000));assert.equal(failed.element('#sound-toggle').textContent,'Sound unavailable');
  assert.doesNotThrow(()=>failed.gnomes.advance(failed.context.Date.now()+7000));assert.equal(failed.gnomes.incident.phase,'result');
  assert.equal(failed.model.specimens.length,30);assert(failed.app.active);assert.equal(a.state.contexts.length,1);
  failed.winHandlers.get('pagehide')({persisted:false});
  console.log('PASS: cached 26-frame gnome atlas/one source, 4 sprites + 1 transient group, 20 incidents without new textures/geometry, both Pixi pages/normal cadence, dev winners, cues, mute, resize, hidden completion, clear/teardown and garden independence.');
})().catch(error=>{console.error(error);process.exitCode=1;});
