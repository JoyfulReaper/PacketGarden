const assert=require('node:assert/strict'),fs=require('node:fs');
const Core=require('../wwwroot/garden-core.js'),G=require('../wwwroot/garden-gnomes.js');
const A=require('../wwwroot/garden-ambient.js'),I=require('../wwwroot/garden-interaction.js');
const C=G.heistConfig;
function fixture({count=35,age=65000,reduced=false,pendingGuard=true}={}){
  let at=100000;const removals=[],cues=[];
  const garden=Core.createGardenModel({now:()=>at,random:()=>0,onChange:c=>{
    if(c.kind==='removed'){ambient.cancelSource(c.specimen);removals.push(c);}
  }});
  const ambient=A.createAmbientModel({now:()=>at,random:()=>0,getSpecimens:()=>garden.specimens});
  garden.seed(Array.from({length:count},(_,i)=>({type:i<4?'mushroom':'broadleaf',vigor:i%4,colorVariant:i%4,
    column:i%20+5,row:5+Math.floor(i/20),createdAt:at-age,origin:{kind:'tcpnoise',sensor:'safe',listenPort:80}})));
  const model=G.createModel({garden,getSpecimens:()=>garden.specimens,now:()=>at,getReducedMotion:()=>reduced,
    hasPendingCollectible:p=>pendingGuard&&ambient.pendingDrops.has(p),onCue:c=>cues.push(c),
    onUnderpantsAttempt:(point,time)=>ambient.dropGnomeUnderpants(point,time)});
  const tick=(ms=250,hidden=false)=>{at+=ms;model.tick(at,()=>.99,hidden);for(const a of model.actors)G.presentation(a,at,reduced);};
  const advance=ms=>{const end=at+ms;while(at<end)tick(Math.min(250,end-at));};
  return {garden,ambient,model,removals,cues,tick,advance,get at(){return at},set at(value){at=value}};
}
assert.deepEqual(C,{incidentShare:.3,pickupAfterMs:3000,pickupHoldMs:1000,finishedAfterMs:14000,abortExitMs:2000,maxTickGapMs:1500});
for(const [age,eligible] of [[0,false],[39999,false],[40000,true],[239999,true],[240000,false],[300000,false]]){
  const f=fixture({age});assert.equal(f.model.heistCandidates().length,eligible?4:0);
}
for(const invalidate of [p=>p.type='crystalfungus',p=>p.type='ghostbloom',p=>p.type='stillbloom',p=>p.type='vine',
  p=>p.colorVariant=4,p=>p.colorVariant='bioluminescent',p=>p.colorVariant='rainbow',p=>p.mutation={expiresAt:200000},
  p=>p.pendingMutation={},p=>p.poppyMutation={state:'active'},p=>p.poppyMutation={state:'pending'},p=>p.cell++,p=>p.column=-1,p=>p.row=20,
  (p,f)=>f.ambient.pendingDrops.set(p,{type:'amanita_muscaria'}),(p,f)=>f.garden.byCell.set(p.cell,{...p})]){
  const f=fixture(),p=f.garden.specimens[0];invalidate(p,f);assert(!f.model.heistCandidates().includes(p));
}
for(const ordinary of [.019999,.02,.99])for(const selection of [.299999,.3,.99]){
  const f=fixture();let calls=0;f.at+=44999;f.model.tick(f.at,()=>{throw Error('early check')});f.at++;
  f.model.tick(f.at,()=>[ordinary,selection,0,.5][calls++]??.5);
  assert.equal(f.model.incident?.type??null,ordinary<.02?(selection<.3?'gnome_heist':'gnome_incident'):null);
  assert.equal(calls,ordinary<.02?(selection<.3?3:4):1);
  f.model.tick(f.at,()=>{throw Error('duplicate check')});
  assert.equal(f.model.nextCheckAt,f.at+45000);assert.equal(f.model.lastLandscapingAt,-Infinity);
}
{
  const f=fixture();f.garden.specimens.forEach(p=>p.type='broadleaf');f.at+=45000;let rolls=0;
  f.model.tick(f.at,()=>{rolls++;return 0});assert.equal(f.model.incident.type,'gnome_incident');assert.equal(rolls,3,'no mushroom means no extra roll');
}
for(const n of [29,30]){const f=fixture({count:n});assert.equal(f.model.startHeist(),n>=30);}
for(const roll of [0,.249999,.25,.5,.999999]){
  const f=fixture(),candidates=f.model.heistCandidates();assert(f.model.startHeist(f.at,()=>roll));
  assert.equal(f.model.incident.target.specimen,candidates[Math.floor(roll*4)],'uniform source choice');
  assert.equal(f.model.actors.length,2);assert.deepEqual(f.model.actors.map(a=>a.side),['green','red']);
  assert(!f.model.start());assert(!f.model.startHeist());assert(!f.model.startLandscaping());
}
{
  const f=fixture();assert(!f.model.startHeist(f.at,()=>0,true),'dev force refuses live targets');
  f.garden.specimens[0].origin={kind:'simulated'};assert(f.model.startHeist(f.at,()=>0,true));
}
{
  const f=fixture();f.model.startHeist(f.at,()=>0);const t=f.model.incident.target,p=t.specimen,original=JSON.stringify(p),started=f.at;
  for(const ms of [1000,1000,999])f.tick(ms);
  f.model.advance(started+3000);assert.equal(f.removals.length,0,'animation never removes');
  f.tick(1);assert.equal(f.removals.length,1);assert.equal(f.removals[0].reason,'gnome-heist');assert.equal(f.removals[0].specimen,p);
  assert.equal(f.garden.specimens.length,34);assert.equal(f.garden.byCell.get(t.cell),undefined);
  assert.equal(JSON.stringify(p),original,'no provenance/trait rewriting');
  assert.equal(f.model.incident.target,null);assert.equal(f.model.incident.removals,1);
  assert.deepEqual(f.model.incident.carried,{type:'mushroom',vigor:p.vigor,colorVariant:p.colorVariant,row:p.row});
  assert(Object.isFrozen(f.model.incident.carried));assert(!('origin' in f.model.incident.carried));
  f.model.tick(f.at);assert.equal(f.removals.length,1);f.advance(1000);assert.equal(f.model.incident.phase,'getaway');
  const actors=f.model.actors;assert.equal(actors[1].x-actors[0].x,36);assert.equal(actors[0].y,actors[1].y);
  f.advance(9999);assert(f.model.incident);f.tick(1);assert.equal(f.model.incident,null);assert.equal(f.model.actors.length,0);
  assert(!f.garden.specimens.includes(p));assert(!f.garden.byCell.has(t.cell));assert.deepEqual(f.cues,['arrival']);
  // Fill the stolen cell through ordinary placement: the hole remains usable.
  while(f.garden.byCell.size<640)assert(f.garden.addSpecimen('broadleaf',3,f.at));
  assert(f.garden.byCell.has(t.cell));assert.notEqual(f.garden.byCell.get(t.cell),p);
}
// Revalidate every captured identity component, eligibility and new pending protection at pickup.
for(const invalidate of [p=>p.id++,p=>p.cell++,p=>p.column++,p=>p.row++,p=>p.createdAt++,p=>p.colorVariant=4,
  p=>p.type='crystalfungus',p=>p.createdAt=100000,p=>p.createdAt=-200000,p=>p.pendingMutation={},
  (p,f)=>f.ambient.pendingDrops.set(p,{type:'amanita_muscaria'}),
  (p,f)=>f.garden.remove(p,'external'),(p,f)=>{const entries=f.garden.specimens.map(s=>s===p?{...p}:s);f.garden.seed(entries);}]){
  const f=fixture();f.model.startHeist(f.at,()=>0);const p=f.model.incident.target.specimen;invalidate(p,f);
  f.removals.length=0;f.advance(3000);assert.equal(f.removals.length,0);assert(f.model.incident.aborted);
  assert.equal(f.model.incident.carried,null);f.advance(2000);assert.equal(f.model.incident,null);
}
// Exercise real stronger-vigor replacement in a saturated authoritative garden, not direct array/map edits.
{
  const f=fixture({count:30});
  const entries=Array.from({length:640},(_,i)=>({type:i===300?'mushroom':'broadleaf',vigor:i===300?0:3,
    column:i%32,row:Math.floor(i/32),createdAt:f.at-65000,colorVariant:0}));f.garden.seed(entries);f.removals.length=0;
  f.model.startHeist(f.at,()=>0);const target=f.model.incident.target.specimen;
  const result=f.garden.addSpecimen('mushroom',1,f.at,{kind:'tcpnoise',listenPort:80});assert.equal(result.replaced,target);
  result.specimen.createdAt=f.at-65000;assert(f.model.heistCandidates().includes(result.specimen));
  f.removals.length=0;f.advance(3000);assert.equal(f.removals.length,0);assert.equal(f.garden.byCell.get(target.cell),result.specimen);
}
// Even a pending attempt outside the guard is cancelled by the normal authoritative removal callback.
{
  const f=fixture({pendingGuard:false});f.model.startHeist(f.at,()=>0);const p=f.model.incident.target.specimen;
  f.ambient.pendingDrops.set(p,{type:'amanita_muscaria',activateAt:f.at+5000});f.advance(3000);
  assert(!f.ambient.pendingDrops.has(p));assert.equal(f.ambient.counts.dropsCancelled,1);f.ambient.tick(f.at+10000);assert.equal(f.ambient.drops.length,0);
}
for(const phaseAt of [0,2750,3000,3750,6000,13750])for(const mode of ['hidden','tick-gap','frame-gap','backwards','clear']){
  const f=fixture();f.model.startHeist(f.at,()=>0);const source=f.model.incident.target.specimen;f.advance(phaseAt);
  const removed=phaseAt>=3000;
  if(mode==='hidden')f.tick(250,true);
  else if(mode==='tick-gap')f.tick(1501);
  else if(mode==='frame-gap')f.model.advance(f.at+1501);
  else if(mode==='backwards')f.model.advance(f.at-1);
  else f.model.clear();
  assert.equal(f.model.incident,null);assert.equal(f.model.actors.length,0);
  assert.equal(f.garden.specimens.includes(source),!removed,'cancel never steals early or restores after pickup');
  f.model.resetCadence(f.at);f.model.tick(f.at,()=>{throw Error('resume replay')});
}
for(const reduced of [false,true]){
  const f=fixture({reduced});f.model.startHeist(f.at,()=>0);f.advance(5000);
  const pair=f.model.actors;for(const actor of pair){
    const pose=G.presentation(actor,f.at,reduced);assert.equal(I.resolve(pose,{gnomes:f.model},f.at).kind,'gnome');
    assert(f.model.click(actor));assert(f.model.click(actor));assert(actor.underpantsAttempted);
    if(reduced){assert.equal(pose.step,0);assert.equal(pose.rotation,0);assert.equal(pose.bounce,0);}
  }
  assert.equal(f.ambient.drops.length,2);assert(f.ambient.drops.every(d=>d.type==='gnome_underpants'));
  assert.equal(f.model.incident.removals,1);f.advance(9000);assert.equal(f.model.incident,null);
}
{
  const f=fixture();f.model.startHeist(f.at,()=>0);f.advance(4500);
  f.ambient.seed({drops:Array.from({length:5},(_,i)=>({type:'gnome_underpants',x:100+i*30,y:100,phase:0,createdAt:f.at,expiresAt:f.at+20000}))});
  const a=f.model.actors[0];assert(f.model.click(a));assert.equal(f.ambient.counts.dropsCapSkipped,1);
  f.ambient.removeDrop(f.ambient.drops[0]);assert(f.model.click(a));assert.equal(f.ambient.drops.length,4,'cap-skipped thief never retries');
  const middle={x:(f.model.actors[0].x+f.model.actors[1].x)/2,y:f.model.actors[0].y};
  assert.equal(f.model.hitAt(middle),null,'carried art is not a clickable gnome or collectible');
  assert.equal(f.model.incident.removals,1);
}
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-gnomes.js','utf8'),/PIXI|document\.|setInterval|setTimeout|requestAnimationFrame|EventSource/);
console.log('PASS: heist exact 2%/30% shared cadence, eligibility/protection/identity, authoritative single removal/freed cell, real replacement, pending cleanup, no restoration/catch-up, hidden/stall/reduced-motion and clickable thieves.');

(async()=>{
  const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs'),V=require('../wwwroot/pixi-live-gnomes.js');
  for(const page of ['index.html','pixi-live.html'])for(const reduced of [false,true]){
    const f=await start(false,{captureModel:true,reduced,random:()=>.5,pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8')});
    f.model.seedHeist();const beforeTextures=h.textureCount(),beforeBakes=h.generated(),counts={...f.model.counts},recent=JSON.stringify(f.model.recentEvents);
    const source=f.model.specimens[2],sprite=f.view.byId.get(source.id),oldTexture=sprite.texture,scale=sprite.scale.x;
    const root=f.view.root,r=f.app.canvas.getBoundingClientRect();
    f.app.canvas.handlers.get('click')({clientX:r.left+root.position.x+sprite.position.x*root.scale.x,
      clientY:r.top+root.position.y+(sprite.position.y-12)*root.scale.y});
    assert.equal(f.element('#specimen-card').hidden,false);
    assert(f.gnomes.startHeist(f.context.Date.now(),()=>.5,true));
    const visitor=f.view.curiosityLayer;assert.equal(visitor.children.length,1);
    for(let i=0;i<12;i++)f.frame(250);
    assert(!f.view.byId.has(source.id));assert(!h.live.has(sprite));assert(!f.model.byCell.has(source.cell));
    assert.equal(f.element('#specimen-card').hidden,true,'normal exact-source removal closes inspection synchronously');
    const group=visitor.children[0],carry=group.children.find(s=>s.texture===oldTexture);
    assert(carry);assert.equal(carry.scale.x,scale);assert.equal(carry.eventMode,'none');assert.equal(group.children.length,3);
    assert.equal(f.model.counts.heistRemovals,counts.heistRemovals+1);assert.equal(f.model.counts.acceptedLive,counts.acceptedLive);
    assert.equal(f.model.counts.lifecycleRemovals,counts.lifecycleRemovals);assert.equal(f.model.counts.replacements,counts.replacements);
    assert.equal(JSON.stringify(f.model.recentEvents),recent);assert.equal(f.element('#garden-score').textContent,'Score: 0');
    for(let i=0;i<44;i++)f.frame(250);assert.equal(visitor.children.length,0);assert(!h.live.has(carry));
    for(let cycle=0;cycle<20;cycle++){
      f.model.seedHeist();assert(f.gnomes.startHeist(f.context.Date.now(),()=>0,true));for(let i=0;i<12;i++)f.frame(250);
      assert.equal(visitor.children[0].children.length,3);f.gnomes.clear();assert.equal(visitor.children.length,0);
    }
    assert.equal(h.textureCount(),beforeTextures);assert.equal(h.generated(),beforeBakes);
    if(page==='pixi-live.html'){
      f.element('#seed-heist').handlers.get('click')();f.element('#trigger-heist').handlers.get('click')();
      const target=f.gnomes.incident.target.specimen;f.element('#replace-heist-target').handlers.get('click')();
      const replacement=f.model.byCell.get(target.cell);assert(replacement);assert.notEqual(replacement,target);
      for(let i=0;i<12;i++)f.frame(250);assert(f.gnomes.incident.aborted);assert.equal(f.model.byCell.get(target.cell),replacement);
      f.gnomes.clear();
      f.element('#seed-heist').handlers.get('click')();f.element('#trigger-heist').handlers.get('click')();
      const liveTarget=f.gnomes.incident.target.specimen;f.element('#suspend-heist').handlers.get('click')();
      assert.equal(f.gnomes.incident,null);assert(f.model.specimens.includes(liveTarget));
    }else for(const id of ['seed-heist','trigger-heist','remove-heist-target','replace-heist-target','suspend-heist','heist-reduced-motion'])assert.equal(f.element('#'+id),null);
    f.winHandlers.get('pagehide')({persisted:false});assert.equal(f.gnomes.incident,null);assert.equal(visitor.children.length,0);assert.deepEqual(f.errors,[]);
  }
  console.log('PASS: both pages, original Sprite/texture/scale and inspection lifecycle, exact heist stats/provenance/score, 80 repeated carry/actor cleanups without new bakes/textures and diagnostic replacement.');
})().catch(error=>{console.error(error);process.exitCode=1;});
