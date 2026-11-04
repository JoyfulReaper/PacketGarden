const assert=require('node:assert/strict'),fs=require('node:fs');
const Core=require('../wwwroot/garden-core.js'),G=require('../wwwroot/garden-gnomes.js'),V=require('../wwwroot/pixi-live-gnomes.js'),I=require('../wwwroot/garden-interaction.js');
function fixture({count=35,mushrooms=0,rare=0,logs=0,reduced=false}={}){
  let at=9000000;const events=[],cues=[],pants=[];
  const garden=Core.createGardenModel({now:()=>at,random:()=>.5,competitionRandom:()=>.99,terrainRandom:()=>0,fungalRandom:()=>0,onChange:c=>events.push(c)});
  const entries=Array.from({length:count},(_,i)=>({type:i<mushrooms?'mushroom':i<mushrooms+rare?'ghostbloom':'broadleaf',vigor:i%4,column:i%32,row:13+Math.floor(i/32),createdAt:at-90000,origin:{kind:'simulated',eventType:'funeral-fixture'}}));
  for(let i=0;i<logs;i++)entries.push({type:'blackthorn',vigor:1,column:10+i*2,row:8,createdAt:at-720000,origin:{kind:'simulated',eventType:'log-fixture'}});
  garden.seed(entries);garden.forceLogFixture();garden.tick(at);events.length=0;
  const model=G.createModel({garden,now:()=>at,getSpecimens:()=>garden.specimens,random:()=>.99,puddleRandom:()=>.99,getReducedMotion:()=>reduced,
    getEcology:()=>{throw Error('A funeral must not read ecology');},onCue:c=>cues.push(c),onUnderpantsAttempt:p=>pants.push(p)});
  return{garden,model,events,cues,pants,get at(){return at},set at(value){at=value},step(ms){while(ms>0){const dt=Math.min(250,ms);at+=dt;model.tick(at,()=>.99);ms-=dt;}},start(roll=()=>.25){return model.startFuneral(at,roll)}};
}
assert.deepEqual(G.funeralConfig,{incidentShare:.2,enterAfterMs:3000,pauseAfterMs:13000,leaveAfterMs:16000,finishedAfterMs:18000,maxTickGapMs:1500,maxActors:4});
for(const [rolls,type] of [
  [[.02],null],[[.019999,.299999,0],'gnome_heist'],[[.019999,.3,.399999,0,0],'gnome_campfire'],
  [[.019999,.3,.4,.25,.199999,.25,.5],'gnome_funeral'],[[.019999,.3,.4,.25,.2,.5,.5],'gnome_incident']
]){
  const f=fixture({mushrooms:3,rare:1,logs:1});f.at+=45000;let calls=0;
  f.model.tick(f.at,()=>{assert(calls<rolls.length);return rolls[calls++];});assert.equal(f.model.incident?.type??null,type);assert.equal(calls,rolls.length);assert.equal(f.model.nextCheckAt,f.at+45000);
}
for(const chance of [0,.199999999,.2,.999999]){
  const f=fixture();f.at+=45000;let n=0;f.model.tick(f.at,()=>[.019999,chance,.5,.5][n++]);assert.equal(f.model.incident.type,chance<.2?'gnome_funeral':'gnome_incident');assert.equal(n,4);
}
for(const count of [29,30]){const f=fixture({count});assert.equal(f.start(),count===30);}
for(const reduced of [false,true])for(const direction of [.25,.75]){
  const f=fixture({logs:2,reduced}),before=JSON.stringify([f.garden.specimens,f.garden.terrain.logs,f.garden.terrain.snapshot(),f.garden.fungi.records.size]);
  assert(f.start(()=>direction));const c=f.model.incident,actors=f.model.actors.slice();assert.equal(actors.length,4);assert.equal(actors.filter(a=>a.role==='pallbearer').length,2);
  assert(!f.start());assert(!f.model.start());assert(!f.model.startCampfire());assert(!f.model.startWizard());assert(!f.model.startHeist());assert(!f.model.startLandscaping());
  for(let t=250;t<=17750;t+=250){
    f.step(250);assert.equal(f.model.actors.length,4);assert(f.model.actors.every(a=>actors.includes(a)));const [front,back]=actors;
    assert.equal(Math.abs(front.x-back.x),44);assert(actors.every(a=>a.y===front.y));
    assert(actors[2].x*c.route.direction<back.x*c.route.direction);assert(actors[3].x*c.route.direction<actors[2].x*c.route.direction);
    if(t>=3000)assert(actors.every(a=>a.x>=7&&a.x<=953&&a.y>=18&&a.y<=580));
    if(t===13000){f.pause=actors.map(a=>[a.x,a.y]);assert.equal(c.phase,'ceremony');assert.equal(actors.filter(a=>a.state==='bow').length,1);}
    if(t>13000&&t<16000)assert.deepEqual(actors.map(a=>[a.x,a.y]),f.pause);
    if(t>=16000){assert.equal(c.phase,'departure');assert(actors.every(a=>a.alpha<=1&&a.alpha>0));}
  }
  assert.deepEqual(f.cues,['arrival']);f.step(250);assert.equal(f.model.incident,null);assert.equal(c.route,null);assert.equal(f.model.actors.length,0);
  assert.equal(JSON.stringify([f.garden.specimens,f.garden.terrain.logs,f.garden.terrain.snapshot(),f.garden.fungi.records.size]),before);assert.equal(f.events.length,0);
}
for(const phase of [0,3000,13000,17000])for(const mode of ['hidden','gap','render-gap','backwards','visual-backwards','nan','clear']){
  const f=fixture();assert(f.start());f.step(phase);const c=f.model.incident;
  if(mode==='hidden')f.model.tick(f.at,()=>.99,true);
  else if(mode==='clear')f.model.clear();
  else if(mode==='visual-backwards'){f.model.advance(f.at+100);f.model.advance(f.at+99);}
  else if(mode==='nan')f.model.advance(NaN);
  else{f.at+=mode==='backwards'?-1:1501;if(mode==='render-gap')f.model.advance(f.at);else f.model.tick(f.at,()=>.99);}
  assert.equal(f.model.incident,null,`${phase}/${mode}`);assert.equal(c.route,null);assert.equal(f.model.actors.length,0);assert.equal(f.events.length,0);
  f.at+=20000;f.model.advance(f.at);assert.equal(f.model.incident,null);
}
{
  const f=fixture();assert(f.start());f.at+=1500;f.model.tick(f.at,()=>.99);assert(f.model.incident,'exact permitted tick gap');
  f.model.suspend();f.model.resetCadence();f.at+=44999;f.model.tick(f.at,()=>{throw Error('early replay')});assert.equal(f.model.incident,null);
}
{
  const f=fixture();assert(f.start());for(const p of [...f.garden.specimens])f.garden.remove(p,'expired');
  const removed=f.events.length;f.step(1000);assert.equal(f.model.actors.length,4,'unrelated plant loss cannot retarget or stop a decorative route');assert.equal(f.events.length,removed);f.model.clear();
}
// Real cached Sprite ownership, actual bearer transforms, normal clicks, a noncollectible prop.
{
  const h=require('./pixi-live.cjs'),layer=new h.P.Container(),objects=h.live.size,textures=h.textureCount(),cache=V.makeGnomeAtlas(h.P,h.renderer),view=V.createGnomeView(h.P,layer,cache.frames);
  assert.equal(cache.frames.size,39);assert.equal(new Set([...cache.frames.values()].map(t=>t.source)).size,1);const f=fixture();
  const m=G.createModel({garden:f.garden,getSpecimens:()=>f.garden.specimens,now:()=>f.at,puddleRandom:()=>.99,onChange:view.change,onUnderpantsAttempt:p=>f.pants.push(p)});
  const bakes=h.generated();assert(m.startFuneral(f.at,()=>.25));
  for(let i=0;i<24;i++){f.at+=250;m.tick(f.at);view.animate(f.at);}
  assert.equal(view.views.size,4);assert(view.stretcher);assert.equal(layer.children[0].children.length,5);assert.equal(view.stretcher.eventMode,'none');
  const check=()=>{const bearers=[...view.views].filter(([a])=>a.role==='pallbearer').map(([,s])=>s),p=view.stretcher;
    assert.equal(p.position.x,(bearers[0].position.x+bearers[1].position.x)/2);assert.equal(p.position.y,(bearers[0].position.y+bearers[1].position.y)/2-7);};
  check();const prop=view.stretcher;assert.equal(I.resolve({x:prop.position.x,y:prop.position.y-5},{gnomes:m},f.at),null);
  for(const actor of m.actors){const p=G.presentation(actor,f.at);assert.equal(m.hitAt(p,f.at),actor);assert(m.click(actor,f.at));assert(m.click(actor,f.at));}assert.equal(f.pants.length,4);view.animate(f.at);check();assert.equal(view.stretcher,prop);
  f.at+=250;m.tick(f.at);view.animate(f.at);check();const owned=[...view.views.values(),prop];m.clear();assert.equal(view.stretcher,null);assert(owned.every(s=>!h.live.has(s)));assert.equal(layer.children.length,0);
  assert.equal(h.generated(),bakes);assert.equal(h.textureCount(),textures+39);view.destroy();cache.destroy();assert.equal(h.live.size,objects);layer.destroy();assert.equal(h.textureCount(),textures);
}
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-funeral-dev.js','utf8'),/addSpecimen|remove\(|seed\(|EventSource|fetch\(/);
console.log('PASS: funeral exact odds/priority/fallback, one incident/four actors, both directions/formation/edges/ceremony/18s end, hidden/gaps/backwards/nonfinite clocks, normal underpants/noncollectible prop, unchanged garden/terrain/events, cached Sprite ownership and shared atlas.');
(async()=>{
  const page=require('./pixi-page.cjs'),h=require('./pixi-live.cjs');
  for(const name of ['index.html','pixi-live.html'])for(const reduced of [false,true]){
    const f=await page({page:name,reduced});f.model.seedWizard();const counts=JSON.stringify([f.model.counts,f.model.recentEvents]),before=JSON.stringify(f.model.specimens),textures=h.textureCount(),bakes=h.generated();
    assert(f.gnomes.startFuneral(f.now(),()=>.25));for(let n=0;n<52;n++)f.frame(250);
    assert.equal(f.gnomes.incident.phase,'ceremony');const group=f.view.curiosityLayer.children[0];assert.equal(group.children.length,5);const owned=group.children.slice();
    for(let n=0;n<20;n++)f.frame(250);assert.equal(f.gnomes.incident,null);assert(owned.every(s=>!h.live.has(s)));assert.equal(f.view.curiosityLayer.children.length,0);
    assert.equal(JSON.stringify(f.model.specimens),before);assert.equal(JSON.stringify([f.model.counts,f.model.recentEvents]),counts);assert.equal(f.element('#garden-score').textContent,'Score: 0');
    for(let n=0;n<30;n++){f.model.seedWizard();f.gnomes.startFuneral(f.now(),()=>.25);f.frame(250);const sprites=f.view.curiosityLayer.children[0].children.slice();f.gnomes.clear();assert(sprites.every(s=>!h.live.has(s)));}
    assert.equal(h.textureCount(),textures);assert.equal(h.generated(),bakes);f.model.seedWizard();f.gnomes.startFuneral(f.now(),()=>.25);f.hidden(true);f.advance(20000);f.hidden(false);assert.equal(f.gnomes.incident,null);
    f.model.seedWizard();f.gnomes.startFuneral(f.now(),()=>.25);const resetIncident=f.gnomes.incident;f.model.seedWizard();assert.equal(f.gnomes.incident,null);assert.equal(resetIncident.route,null);
    if(name==='pixi-live.html'){f.gnomes.startFuneral(f.now(),()=>.25);const ownedGroup=f.view.curiosityLayer.children[0];f.element('#seed').handlers.get('click')();assert.equal(f.gnomes.incident,null);assert(!h.live.has(ownedGroup));}
    f.gnomes.startFuneral(f.now(),()=>.25);const c=f.gnomes.incident;f.close();assert.equal(f.gnomes.incident,null);assert.equal(c.route,null);assert.deepEqual(f.errors,[]);
  }
  console.log('PASS: both entry points/motion settings, 120 repeated five-Sprite cleanups, stable bakes/textures, normal specimen/art/count/activity/score behavior, hidden and teardown.');
})().catch(e=>{console.error(e);process.exitCode=1;});
