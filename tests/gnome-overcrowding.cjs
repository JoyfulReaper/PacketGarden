// Overcrowding extends the actual shared incident, with deterministic clocks and target draws.
const assert=require('node:assert/strict'),fs=require('node:fs');
const core=require('../wwwroot/garden-core.js'),G=require('../wwwroot/garden-gnomes.js');
const C=G.overcrowdingConfig,L=G.landscapingConfig;
const seeded=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function fixture(count=640,type=()=> 'broadleaf') {
  let at=100000;const removals=[];
  const garden=core.createGardenModel({now:()=>at,random:()=>.5,onChange:e=>{if(e.reason==='landscaped')removals.push(e.specimen);}});
  const fill=(n=count,choose=type)=>garden.seed(Array.from({length:n},(_,i)=>({type:choose(i),column:i%32,
    row:Math.floor(i/32),createdAt:at,colorVariant:0})),at);
  fill();const model=G.createModel({garden,now:()=>at,getSpecimens:()=>garden.specimens});
  const tick=(ms=250,hidden=false)=>{at+=ms;model.tick(at,()=>.99,hidden);};
  const start=(roll=seeded(412))=>model.startLandscaping(at,roll,'overcrowding');
  const finish=(step=250,after=()=>{})=>{for(let i=0;i<200&&model.incident;i++){tick(step);after();}assert.equal(model.incident,null);};
  return {garden,model,removals,fill,tick,start,finish,get at(){return at;},set at(value){at=value;}};
}
assert.equal(C.incidentChance,.25);assert.equal(C.freeCells,32);assert.equal(C.maxRemovals,32);
for(const n of [639,640]) {
  const f=fixture(n);assert.equal(f.model.landscapingEligible(f.at,null,'overcrowding'),n===640);
  assert.equal(f.start(),n===640);
}
{
  const f=fixture();f.garden.byCell.delete(0);
  assert(!f.start(),'640 array entries cannot substitute for 640 occupied cells');
}
// One landscaping chance per deadline, regardless of vine eligibility; dispute keeps its own roll.
for(const allVines of [false,true])for(const chance of [.25,.250001,.999999,.249999,0]) {
  const f=fixture(640,()=>allVines?'vine':'broadleaf');let calls=0;
  const roll=()=>++calls===1?.5:calls===2?chance:.5;
  f.at+=44999;f.model.tick(f.at,roll);assert.equal(calls,0);
  f.at++;f.model.tick(f.at,roll);
  const success=chance<.25;
  assert.equal(f.model.incident?.mode??null,success?'overcrowding':null);
  assert.equal(calls,success?2+C.maxTargets:2,'one dispute roll, one relief roll, then target draws only on success');
  for(let i=0;i<10;i++)f.model.tick(f.at,()=>{throw Error('extra check');});
  if(!success) {
    assert.equal(f.model.lastLandscapingAt,-Infinity,'failure does not consume cooldown');
    f.at+=45000;let next=0;f.model.tick(f.at,()=>++next===1?.5:.249999);
    assert.equal(f.model.incident.mode,'overcrowding','next scheduled check can succeed');
  }
}
{
  const f=fixture(639,()=> 'vine');f.at+=45000;let calls=0;
  f.model.tick(f.at,()=>++calls===1?.5:.0999);
  assert.equal(f.model.incident.mode,'vine','639 cells still allow the original vine roll');
  assert.equal(calls,3,'dispute, vine chance, first route target');
}
{
  const f=fixture(640,()=> 'ghostbloom');f.at+=45000;let calls=0;
  f.model.tick(f.at,()=>++calls===1?.5:0);
  assert.equal(calls,2);assert.equal(f.model.incident,null);assert.equal(f.model.lastLandscapingAt,-Infinity);
}
for(const first of ['vine','overcrowding']) {
  const f=fixture(640,()=> 'vine');assert(f.model.startLandscaping(f.at,()=>.5,first));
  const arrival=f.at;f.model.clear();f.at=arrival+L.cooldownMs-1;f.fill();
  assert(!f.model.startLandscaping(f.at,()=>.5,first==='vine'?'overcrowding':'vine'));
  f.model.resetCadence(f.at-45000);let rolls=0;f.model.tick(f.at,()=>{rolls++;return .99;});
  assert.equal(rolls,1,'cooldown permits only the separate dispute roll');
  assert.equal(f.model.lastLandscapingAt,arrival);f.at++;
  assert(f.model.startLandscaping(f.at,()=>.5,first==='vine'?'overcrowding':'vine'),'shared inclusive seven-minute boundary');
}
const ordinary=['flower','mushroom','broadleaf','vine','wirefern','redbloom','weed'];
{
  const f=fixture(640,i=>ordinary[i%ordinary.length]);
  const protectedPlants=f.garden.specimens.slice(0,15);
  const changes=[p=>p.type='ghostbloom',p=>p.type='crystalfungus',p=>p.type='blackthorn',
    p=>p.mutation={expiresAt:f.at+20000},p=>p.pendingMutation={},p=>p.colorVariant=4,
    p=>{p.type='flower';p.colorVariant='moonflower';},p=>{p.type='mushroom';p.colorVariant='bioluminescent';},
    p=>{p.type='broadleaf';p.broadleafVariant='rainbow';},p=>{p.type='vine';p.colorVariant='silvervine';},
    p=>{p.type='wirefern';p.colorVariant='afterglow';},p=>{p.type='redbloom';p.colorVariant='solar';},
    p=>{p.type='weed';p.colorVariant='toxic';},p=>p.createdAt=f.at-600000,p=>p.createdAt=f.at+1];
  changes.forEach((change,i)=>change(protectedPlants[i]));
  assert(f.start());const targets=f.model.incident.targets.map(t=>t.specimen);
  assert.equal(new Set(targets).size,C.maxTargets);assert(targets.every(p=>!protectedPlants.includes(p)));
  assert.deepEqual([...new Set(targets.map(p=>p.type))].sort(),ordinary.slice().sort(),'all ordinary species participate');
  const second=fixture(640,i=>ordinary[i%ordinary.length]);second.start(seeded(99));
  assert.notDeepEqual(targets.map(p=>p.cell),second.model.incident.targets.map(t=>t.cell),'seed changes random selection');
  f.finish();assert.equal(f.removals.length,32);assert.equal(f.garden.byCell.size,608);
}
{
  const f=fixture();f.start();f.model.advance(f.at+750);assert.equal(f.removals.length,0,'animation cannot remove');
  f.tick(749);assert.equal(f.removals.length,0);f.tick(1);assert.equal(f.removals.length,1);
  f.model.tick(f.at);assert.equal(f.removals.length,1);assert.equal(f.model.incident.removals,1);
  f.finish();assert.equal(f.removals.length,32);assert.equal(f.garden.byCell.size,608);
}
for(const freeAfterCut of [false,true]) {
  const f=fixture();f.start();if(freeAfterCut)f.tick(750);
  const selected=new Set(f.model.incident.targets.map(t=>t.specimen));
  for(const p of f.garden.specimens.filter(p=>!selected.has(p)).slice(0,freeAfterCut?31:32))f.garden.remove(p);
  f.finish();assert.equal(f.removals.length,freeAfterCut?1:0,'external removals satisfy free-space goal');
  assert.equal(f.garden.byCell.size,608);
}
{
  const f=fixture();f.start();const added=[];
  f.finish(250,()=>{while(f.garden.byCell.size<640)added.push(f.garden.addSpecimen('broadleaf',0,f.at).specimen);});
  assert.equal(f.removals.length,32);assert.equal(f.garden.byCell.size,640,'refilling can defeat best-effort relief');
  assert(added.every(p=>f.garden.specimens.includes(p)),'new arrivals are never chased');
}
{
  const f=fixture(640,i=>i<2?'weed':'ghostbloom');f.start();f.finish();
  assert.equal(f.removals.length,2,'no eligible sampled targets remain');
}
for(const invalidate of [p=>p.id++,p=>p.cell++,p=>p.column++,p=>p.row++,p=>p.createdAt++,
  p=>p.colorVariant=4,p=>p.colorVariant='moonflower',p=>p.type='blackthorn',
  p=>p.mutation={expiresAt:999999},p=>p.pendingMutation={},
  (p,f)=>f.garden.remove(p,'collected'),(p,f)=>{
    const replacement={...p};f.garden.byCell.set(p.cell,replacement);
    f.garden.specimens.splice(f.garden.specimens.indexOf(p),1,replacement);
  }]) {
  const f=fixture();f.start();const p=f.model.incident.targets[0].specimen;invalidate(p,f);
  f.tick(750);assert.equal(f.removals.length,0,'invalid first target is never cut');
  f.finish();assert(!f.removals.includes(p));assert(f.removals.length<=32);
}
{
  const f=fixture(640,()=> 'flower');f.garden.specimens[0].createdAt=f.at-239500;f.start(()=>0);
  f.tick(750);assert.equal(f.removals.length,0,'lifetime is rechecked without identity changes');
}
{
  const f=fixture();f.start();for(const t of f.model.incident.targets)t.specimen.colorVariant=4;
  f.finish();assert.equal(f.removals.length,0);assert(f.at-100000<3000,'ineligible route exits promptly');
}
{
  const f=fixture();f.start();f.finish(1400);
  assert(f.removals.length>0&&f.removals.length<32);assert(f.at-100000<=C.maxDurationMs+1400,'slow work obeys duration ceiling');
}
{
  const f=fixture();f.model.tick(f.at+45000,()=>{throw Error('hidden roll');},true);
  f.start();assert(!f.model.start(f.at));f.tick(250,true);assert.equal(f.model.actors.length,0);
  assert.equal(f.removals.length,0);f.at+=1000000;f.model.suspend(f.at);f.model.tick(f.at,()=>{throw Error('resume roll');});
  assert.equal(f.model.incident,null);f.fill();assert(f.model.start(f.at,()=>.5));assert(!f.start());
}

async function adapters() {
  const h=require('./pixi-live.cjs'),V=require('../wwwroot/pixi-live-gnomes.js');
  const {start}=require('./pixi-default.cjs');
  const layer=new h.P.Container(),baseline=h.textureCount(),cache=V.makeGnomeAtlas(h.P,h.renderer);
  const view=V.createGnomeView(h.P,layer,cache.frames),built=h.generated();
  const f=fixture(),m=G.createModel({garden:f.garden,now:()=>f.at,getSpecimens:()=>f.garden.specimens,onChange:view.change});
  for(let i=0;i<20;i++) {
    f.at+=L.cooldownMs;f.fill();assert(m.startLandscaping(f.at,seeded(i),'overcrowding'));
    const sprites=[...view.views.values()];assert.equal(sprites.length,2);
    for(let frame=0;frame<200&&m.incident;frame++) {f.at+=250;m.tick(f.at);m.advance(f.at);view.animate(f.at);}
    assert.equal(m.incident,null);assert.equal(view.views.size,0);assert.equal(layer.children.length,0);
    assert(sprites.every(s=>!h.live.has(s)));assert.equal(h.textureCount(),baseline+22);assert.equal(h.generated(),built);
  }
  view.destroy();cache.destroy();layer.destroy();assert.equal(h.textureCount(),baseline);
  for(const page of ['index.html','pixi-live.html'])for(const reduced of [false,true]) {
    const liveBefore=h.live.size,texturesBefore=h.textureCount();
    const pixi=await start(false,{captureModel:true,reduced,pageHtml:fs.readFileSync('wwwroot/'+page,'utf8')});
    pixi.model.seedLandscaping('overcrowding');
    const counts=JSON.stringify(pixi.model.counts),recent=JSON.stringify(pixi.model.recentEvents);
    assert(pixi.gnomes.startLandscaping(100000,()=>.5,'overcrowding'));
    const target=pixi.gnomes.incident.targets[0].specimen;
    const root=pixi.app.stage.children[0],sprite=root.children[6].children[pixi.model.specimens.indexOf(target)];
    const rect=pixi.app.canvas.getBoundingClientRect();
    pixi.app.canvas.handlers.get('click')({clientX:rect.left+root.position.x+sprite.position.x*root.scale.x,
      clientY:rect.top+root.position.y+(sprite.position.y-12)*root.scale.y});
    assert.equal(pixi.element('#specimen-card').hidden,false);
    for(let i=0;i<164;i++) {
      pixi.frame(250);
      if(i===2) {assert.equal(pixi.element('#specimen-card').hidden,true);}
    }
    assert.equal(pixi.model.specimens.length,608);assert.equal(root.children[6].children.length,608);
    assert.equal(root.children[5].children.length,pixi.model.specimens.filter(p=>p.type==='vine').length);
    assert.equal(pixi.gnomes.incident,null);assert.equal(root.children[8].children.length,0);
    assert.equal(JSON.stringify(pixi.model.counts),counts);assert.equal(JSON.stringify(pixi.model.recentEvents),recent);
    pixi.advance(L.cooldownMs);pixi.model.clear();
    if(page==='pixi-live.html') {
      pixi.element('#trigger-overcrowding').handlers.get('click')();
      assert.equal(pixi.gnomes.incident.mode,'overcrowding');assert.equal(pixi.model.specimens.length,640);
      pixi.element('#trigger-landscaping').handlers.get('click')();assert.match(pixi.element('#landscaping-test-status').textContent,/already active/);
      pixi.gnomes.clear();pixi.element('#trigger-landscaping').handlers.get('click')();
      assert.match(pixi.element('#landscaping-test-status').textContent,/cooldown/);
    } else {assert.equal(pixi.element('#trigger-overcrowding'),null);pixi.model.seedLandscaping('overcrowding');pixi.gnomes.startLandscaping(undefined,undefined,'overcrowding');}
    pixi.doc.hidden=true;pixi.docHandlers.get('visibilitychange')();assert.equal(pixi.gnomes.actors.length,0);
    assert.equal(root.children[8].children.length,0);pixi.advance(60000);pixi.doc.hidden=false;pixi.docHandlers.get('visibilitychange')();
    assert.equal(pixi.gnomes.incident,null);assert.equal(pixi.model.specimens.length,640);
    pixi.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(pixi.errors,[]);
    assert.equal(h.textureCount(),texturesBefore);assert.equal(h.live.size,liveBefore,'page teardown restores object baseline');
  }
}
adapters().then(()=>console.log('PASS: overcrowding exact capacity/probability/cadence/priority/shared cooldown, random ordinary exclusions, free-space/removal/duration limits and refill, stale identities, hidden/mutual exclusion, Pixi inspection/cleanup, diagnostics and 20 resource-stable incidents.'))
  .catch(error=>{console.error(error);process.exitCode=1;});
