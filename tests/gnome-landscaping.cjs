// Real shared model and both production adapters; synthetic clocks, no sleeps.
const assert = require('node:assert/strict'), fs = require('node:fs');
const core = require('../wwwroot/garden-core.js'), G = require('../wwwroot/garden-gnomes.js');
const C = G.landscapingConfig;
function fixture(vines=32,total=50) {
  let at=100000;
  const removals=[];
  const garden=core.createGardenModel({now:()=>at,onChange:e=>{if(e.kind==='removed')removals.push(e);}});
  const fill=(v=vines,n=total)=>garden.seed(Array.from({length:n},(_,i)=>({type:i<v?'vine':'broadleaf',
    column:i%32,row:Math.floor(i/32),createdAt:at-65000,colorVariant:'aqua'})),at);
  fill();removals.length=0;
  const model=G.createModel({garden,now:()=>at,getSpecimens:()=>garden.specimens});
  const tick=(ms,hidden=false)=>{at+=ms;model.tick(at,()=>.99,hidden);};
  const finish=()=>{for(let i=0;i<60&&model.incident;i++)tick(250);};
  return {garden,model,removals,fill,tick,finish,get at(){return at;},set at(value){at=value;}};
}
assert.equal(C.cooldownMs,7*60000);
for(const [v,n,eligible] of [[19,40,false],[20,51,false],[20,50,true],[21,50,true],[20,49,true]]) {
  const f=fixture(v,n);assert.equal(f.model.landscapingEligible(),eligible,`${v}/${n}`);
}
{
  const f=fixture(20,51);f.garden.specimens.at(-1).createdAt=f.at-360000;
  assert(f.model.landscapingEligible(),'expired non-vines leave the denominator');
  f.garden.specimens[0].createdAt=f.at-600000;assert(!f.model.landscapingEligible(),'expiry boundary excludes vine');
}
for(const change of [p=>p.colorVariant='silvervine',p=>p.colorVariant=4,p=>p.mutation={expiresAt:999999},
  p=>p.pendingMutation={},p=>p.type='blackthorn',p=>p.type='ghostbloom',p=>p.type='crystalfungus',p=>p.type='weed']) {
  const f=fixture(20,20);change(f.garden.specimens[0]);assert(!f.model.landscapingEligible());
}
{
  const f=fixture(40,50), p=f.garden.specimens[0];f.garden.byCell.set(p.cell,{...p});
  assert(!f.model.landscapingCandidates().includes(p),'occupancy must match identity');
}
for(const [v,expected] of [[20,5],[22,6],[32,8],[100,8]]) {
  const f=fixture(v,v),before=f.garden.specimens.slice();assert(f.model.startLandscaping(f.at,()=>.5));
  assert.equal(f.model.actors.length,2);assert.equal(f.model.incident.targets.length,expected);
  assert.equal(new Set(f.model.incident.targets.map(t=>t.specimen)).size,expected);
  const targets=f.model.incident.targets.map(t=>t.specimen);
  assert(!f.model.start(f.at),'landscaping blocks dispute');assert(!f.model.startLandscaping(f.at));
  f.model.advance(f.at+750);assert.equal(f.removals.length,0,'RAF never removes a plant');
  f.tick(749);assert.equal(f.removals.length,0);f.tick(1);assert.equal(f.removals.length,1);
  assert.equal(f.model.actors[0].state,'snip');assert.equal(f.model.incident.phase,'snip');
  f.model.tick(f.at);f.model.advance(f.at);assert.equal(f.removals.length,1,'one-time snip');
  f.tick(499);assert.equal(f.model.incident.index,0);f.tick(1);assert.equal(f.model.incident.index,1);
  f.finish();assert.equal(f.model.incident,null);assert.equal(f.model.actors.length,0);
  assert.deepEqual(f.removals.map(e=>e.specimen),targets,'only the original route is removed sequentially');
  assert(f.removals.every(e=>e.reason==='landscaped'));
  assert.equal(f.garden.specimens.length,before.length-expected);assert.equal(f.garden.byCell.size,before.length-expected);
  for(const p of targets)assert(!f.garden.byCell.has(p.cell),'normal growth can reuse freed cell');
  const started=100000;
  f.at=started+C.cooldownMs-1;f.fill();assert(!f.model.startLandscaping(f.at));
  f.model.clear();assert(!f.model.startLandscaping(f.at),'clear does not reset cooldown');
  f.at++;assert(f.model.startLandscaping(f.at,()=>.5),'cooldown boundary inclusive');
}
// Revalidate every captured identity field and eligibility at the scheduled action.
for(const invalidate of [
  (f,p)=>p.id++, (f,p)=>p.createdAt++, (f,p)=>p.cell++, (f,p)=>p.column++, (f,p)=>p.row++,
  (f,p)=>p.createdAt=f.at-600000, (f,p)=>p.colorVariant=4, (f,p)=>p.colorVariant='silvervine',
  (f,p)=>p.type='blackthorn', (f,p)=>p.type='flower', (f,p)=>p.mutation={expiresAt:999999},
  (f,p)=>p.pendingMutation={}, (f,p)=>f.garden.remove(p,'collected'),
  (f,p)=>{const replacement={...p};f.garden.byCell.set(p.cell,replacement);
    f.garden.specimens.splice(f.garden.specimens.indexOf(p),1,replacement);}
]) {
  const f=fixture();f.model.startLandscaping(f.at,()=>0);
  const target=f.model.incident.targets[0].specimen;invalidate(f,target);f.removals.length=0;
  f.tick(750);assert.equal(f.removals.length,0,'stale/ineligible target is skipped');
  assert.equal(f.model.incident.snipped,true);f.tick(250);assert.equal(f.removals.length,0);
  f.finish();assert.equal(f.removals.length,7,'no replacement target chosen');
}
{
  const f=fixture();assert(f.model.start(f.at,()=>.5));
  assert(!f.model.startLandscaping(f.at),'dispute blocks landscaping');f.model.clear();
  f.at+=45000;let calls=0;f.model.tick(f.at,()=>{calls++;return calls===1?.5:.1;});
  assert.equal(f.model.incident,null,'10% boundary is excluded');
  f.at+=45000;calls=0;f.model.tick(f.at,()=>{calls++;return calls===1?.5:.0999;});
  assert.equal(f.model.incident.type,'gnome_landscaping');
  f.tick(500,true);assert.equal(f.model.incident,null);assert.equal(f.removals.length,0);
  assert.equal(f.model.actors.length,0);f.at+=1000000;f.model.tick(f.at,()=>.99);
  assert.equal(f.removals.length,0,'no hidden action backlog');
}
{
  const f=fixture();f.model.startLandscaping(f.at);f.tick(C.maxTickGapMs+1);
  assert.equal(f.model.incident,null);assert.equal(f.removals.length,0,'long tick gap cancels safely');
}
{
  const f=fixture();f.model.startLandscaping(f.at,()=>0);f.tick(1400);
  assert.equal(f.model.incident.index,0);assert.equal(f.removals.length,1);
  f.tick(499);assert.equal(f.model.incident.index,0,'late snip still gets its full visible hold');
  f.tick(1);assert.equal(f.model.incident.index,1);
}
{
  const f=fixture(),p=f.garden.specimens[0];p.createdAt=f.at-599500;
  f.model.startLandscaping(f.at,()=>0);f.tick(750);
  assert.equal(f.removals.length,0,'target expires naturally without changing captured identity');
  assert(f.garden.specimens.includes(p),'landscaping leaves expiry cleanup to the garden');
}
{
  const f=fixture(640,640);f.model.startLandscaping(f.at,()=>0);f.tick(750);
  const cell=f.removals[0].specimen.cell;
  const added=f.garden.addSpecimen('vine',0,f.at).specimen;
  assert.equal(added.cell,cell,'ordinary growth takes the freed cell');
  f.finish();assert(f.garden.specimens.includes(added),'new growth is never added to the fixed route');
}
{
  const f=fixture();let reduced=true;
  const m=G.createModel({garden:f.garden,getSpecimens:()=>f.garden.specimens,now:()=>f.at,getReducedMotion:()=>reduced});
  m.startLandscaping(f.at);const worker=m.actors[0];
  assert.equal(worker.x,worker.targetX);const pose=G.appearance(worker,f.at,true);
  assert.equal(pose.step,0);assert.equal(pose.rotation,0);assert.equal(pose.bounce,0);
  reduced=false;m.advance(f.at+375);assert.notEqual(worker.x,worker.targetX);
  m.suspend(f.at+400);assert.equal(m.actors.length,0);
}
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-gnomes.js','utf8'),/setInterval|setTimeout|requestAnimationFrame|EventSource|document\./);

async function adapters() {
  const {start}=require('./pixi-default.cjs');
  const h=require('./pixi-live.cjs'),V=require('../wwwroot/pixi-live-gnomes.js');
  const layer=new h.P.Container(),baseline=h.textureCount(),cache=V.makeGnomeAtlas(h.P,h.renderer);
  const view=V.createGnomeView(h.P,layer,cache.frames),allocated=h.generated();
  const f=fixture();
  const m=G.createModel({garden:f.garden,getSpecimens:()=>f.garden.specimens,now:()=>f.at,onChange:view.change});
  for(let i=0;i<25;i++) {
    f.at+=C.cooldownMs;f.fill();assert(m.startLandscaping(f.at,()=>.5));
    const sprites=[...view.views.values()];assert.equal(sprites.length,2);
    for(let frame=0;frame<900&&m.incident;frame++) {
      f.at+=1000/60;if(frame%15===0)m.tick(f.at);m.advance(f.at);view.animate(f.at);
      assert([...view.views.values()].every(s=>sprites.includes(s)));
    }
    assert.equal(m.incident,null);assert.equal(layer.children.length,0);assert.equal(view.views.size,0);
    assert(sprites.every(s=>!h.live.has(s)));assert.equal(h.textureCount(),baseline+29);assert.equal(h.generated(),allocated);
  }
  view.destroy();cache.destroy();layer.destroy();assert.equal(h.textureCount(),baseline);
  for(const page of ['index.html','pixi-live.html'])for(const reduced of [false,true]) {
    const pixi=await start(false,{captureModel:true,reduced,pageHtml:fs.readFileSync('wwwroot/'+page,'utf8')});
    pixi.model.seedLandscaping();
    const recent=JSON.stringify(pixi.model.recentEvents),counts=JSON.stringify(pixi.model.counts);
    assert(pixi.gnomes.startLandscaping(100000,()=>.5));
    const target=pixi.gnomes.incident.targets[0].specimen;
    // Inspection must close synchronously with the exact removal in Pixi.
    const root=pixi.app.stage.children[0],sprite=root.children[6].children[pixi.model.specimens.indexOf(target)];
    const r=pixi.app.canvas.getBoundingClientRect();
    pixi.app.canvas.handlers.get('click')({clientX:r.left+root.position.x+sprite.position.x*root.scale.x,
      clientY:r.top+root.position.y+(sprite.position.y-12)*root.scale.y});
    assert.equal(pixi.element('#specimen-card').hidden,false);
    for(let i=0;i<44;i++) {
      pixi.frame(250);
      if(i===2) {
        assert.equal(pixi.element('#specimen-card').hidden,true);
      }
    }
    assert.equal(pixi.model.specimens.length,42);assert.equal(pixi.gnomes.incident,null);
    assert.equal(root.children[8].children.length,0);assert.equal(root.children[6].children.length,42);
    assert.equal(root.children[5].children.length,24,'vine rendering links track removals');
    assert.equal(JSON.stringify(pixi.model.counts),counts);assert.equal(JSON.stringify(pixi.model.recentEvents),recent);
    pixi.advance(C.cooldownMs);pixi.model.seedLandscaping();assert(pixi.gnomes.startLandscaping());
    pixi.doc.hidden=true;pixi.docHandlers.get('visibilitychange')();assert.equal(pixi.gnomes.actors.length,0);
    assert.equal(root.children[8].children.length,0);pixi.advance(60000);pixi.doc.hidden=false;pixi.docHandlers.get('visibilitychange')();
    assert.equal(pixi.model.specimens.length,50);assert.equal(pixi.gnomes.incident,null);
    if(page==='pixi-live.html') {
      pixi.advance(C.cooldownMs);pixi.model.clear();const button=pixi.element('#trigger-landscaping');
      button.handlers.get('click')();assert.equal(pixi.gnomes.incident.type,'gnome_landscaping');
      assert.equal(pixi.model.recentEvents.length,0);pixi.gnomes.clear();
      const snapshot=JSON.stringify(pixi.model.specimens);button.handlers.get('click')();
      assert.match(pixi.element('#landscaping-test-status').textContent,/cooldown/);
      assert.equal(JSON.stringify(pixi.model.specimens),snapshot);
    } else assert.equal(pixi.element('#trigger-landscaping'),null);
    pixi.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(pixi.errors,[]);
  }
}
adapters().then(()=>console.log('PASS: landscaping thresholds/cooldown/chance, capped fixed route, safe sequential removals, exclusions, mutual exclusion, hidden/reduced motion, Pixi lifecycle coverage, diagnostic trigger and 25 incidents without leaked objects/textures.'))
  .catch(error=>{console.error(error);process.exitCode=1;});
