// Actual Pixi entry points: grass-only picking stays behind every existing hit.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
(async()=>{
  for(const page of ['index.html','pixi-live.html']) {
    const g=await start(false,{pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8'),captureModel:true});
    assert.deepEqual(g.errors,[]);const now=()=>g.context.Date.now(),root=g.app.stage.children[0];
    const cell={column:12,row:9,createdAt:now()-60000,lastInfluencedAt:now()};
    const click=(column=12,row=9)=>{
      const rect=g.app.canvas.getBoundingClientRect(),screen=g.app.renderer.screen;
      g.app.canvas.handlers.get('click')({clientX:rect.left+(root.position.x+(column+.5)*30*root.scale.x)*rect.width/screen.width,
        clientY:rect.top+(root.position.y+(row+.5)*30*root.scale.y)*rect.height/screen.height});
    };
    g.ecology.seed({grassCells:[cell]});g.ecology.resetCadence(now());const state=JSON.stringify(g.ecology.grassCells),objects=h.live.size,generated=h.generated();
    click();assert.equal(g.element('#specimen-card').hidden,false);assert.equal(g.element('#specimen-card-title').textContent,'Wild grass');
    assert.equal(g.element('#grass-state').textContent,'Mature');assert.equal(g.element('#specimen-details').hidden,true);
    assert.equal(g.element('#grass-details').hidden,false);assert.match(fs.readFileSync(`wwwroot/${page}`,'utf8'),/Not a collectible plant specimen/);
    assert.equal(JSON.stringify(g.ecology.grassCells),state);assert.equal(g.model.specimens.length,0);assert.equal(g.model.recentEvents.length,0);
    assert.equal(g.element('#sound-toggle').textContent,'Sound: Off');assert.equal(g.element('#garden-score').textContent,'Score: 0');
    for(let i=0;i<20;i++){click();g.frame(50);}assert.equal(h.live.size,objects);assert.equal(h.generated(),generated);
    g.element('#specimen-card-close').handlers.get('click')();assert(g.element('#specimen-card').hidden);
    click();g.winHandlers.get('keydown')({key:'Escape'});assert(g.element('#specimen-card').hidden);
    click();click(13,9);assert(g.element('#specimen-card').hidden,'bare soil closes without a false grass card');
    const seed=age=>{g.ecology.seed({grassCells:[{...cell,createdAt:now()-age,lastInfluencedAt:now()-age}]});g.ecology.resetCadence(now());};
    seed(1000);click();assert.equal(g.element('#grass-state').textContent,'Young');
    g.frame(9500);assert.equal(g.element('#grass-state').textContent,'Growing','open card follows existing lifecycle state');
    seed(15000);click();assert.equal(g.element('#grass-state').textContent,'Growing');
    seed(1200001);click();assert.equal(g.element('#grass-state').textContent,'Fading');
    seed(1620000);click();assert.equal(g.element('#grass-state').textContent,'Dying');
    seed(1920000);click();assert.equal(g.element('#grass-state').textContent,'Dry');
    seed(2100000);click();assert(g.element('#specimen-card').hidden,'expired grass cannot be inspected between ecology ticks');
    seed(60000);click();g.ecology.clearGrass();g.frame(250);assert(g.element('#specimen-card').hidden,'removal closes exact grass reference');
    seed(60000);click();seed(60000);g.frame(250);assert(g.element('#specimen-card').hidden,'replacement cell object closes stale card');
    click();g.model.seed();g.frame(250);
    assert(g.element('#specimen-card').hidden,'new occupant closes grass card');click();
    assert.equal(g.element('#specimen-card-title').textContent,'Flower');assert(!g.element('#specimen-details').hidden);
    assert(g.element('#grass-details').hidden,'specimen fields restore normally');
    g.model.clear();click();assert.equal(g.element('#specimen-card-title').textContent,'Wild grass');
    g.ecology.clearGrass();g.frame(250);assert(g.element('#specimen-card').hidden);
    g.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(g.errors,[]);
  }
  console.log('PASS: both Pixi pages inspect grass-only tiles/stages, specimen priority, bare soil, close/Escape, expiry/removal/replacement/occupancy, no ecology/activity/score/audio side effects or new display objects/textures.');
})().catch(error=>{console.error(error);process.exitCode=1;});
