const assert=require('node:assert/strict'),fs=require('node:fs');
const Core=require('../wwwroot/garden-core.js'),G=require('../wwwroot/garden-gnomes.js');
const A=require('../wwwroot/garden-ambient.js'),I=require('../wwwroot/garden-interaction.js'),T=require('../wwwroot/garden-ui-core.js');
const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
const GV=require('../wwwroot/pixi-live-gnomes.js'),AV=require('../wwwroot/pixi-live-ambient.js');
const ordinaryMessage="You stole a gnome's underpants. +0 points",rareMessage='Collected underpants +1, annoyed gnome -1';
function fixture(n=5,types=()=> 'weed',age=65000){
  let at=100000;const removals=[];
  const garden=Core.createGardenModel({now:()=>at,random:()=>.5,onChange:c=>{if(c.kind==='removed'){ambient.cancelSource(c.specimen);if(c.reason==='landscaped')removals.push(c.specimen)}}});
  const ambient=A.createAmbientModel({now:()=>at,random:()=>0,getSpecimens:()=>garden.specimens});
  const g=G.createModel({garden,getSpecimens:()=>garden.specimens,now:()=>at,
    hasPendingBud:p=>ambient.pendingDrops.get(p)?.type==='ditch_weed_bud',onUnderpantsAttempt:(point,time)=>ambient.dropGnomeUnderpants(point,time)});
  const fill=(count=n,choose=types)=>garden.seed(Array.from({length:count},(_,i)=>({type:choose(i),column:10+i%20,row:5+Math.floor(i/20),
    createdAt:at-age,vigor:0,colorVariant:0})),at);
  // Full fixtures use every grid cell.
  const full=()=>garden.seed(Array.from({length:640},(_,i)=>({type:i<5?'weed':'vine',column:i%32,row:Math.floor(i/32),createdAt:at-65000,vigor:0})),at);
  fill();const render=()=>g.actors.map(a=>G.presentation(a,at));
  const tick=(ms=250,hidden=false)=>{at+=ms;g.tick(at,()=>.99,hidden);render();ambient.tick(at,{hidden});};
  const finish=()=>{for(let n=0;n<100&&g.incident;n++)tick();assert.equal(g.incident,null)};
  return {garden,ambient,g,removals,fill,full,render,tick,finish,get at(){return at},set at(value){at=value}};
}
assert.equal(G.harvestConfig.incidentChance,.05);
for(const [n,age,yes] of [[2,60000,false],[3,59999,false],[3,60000,true],[3,299999,true],[3,300000,false],[3,360000,false]]){
  const f=fixture(n,()=> 'weed',age);assert.equal(f.g.landscapingEligible(f.at,null,'weed_harvest'),yes);
}
for(const change of [p=>p.type='redbloom',p=>p.type='ghostbloom',p=>p.type='crystalfungus',p=>p.type='stillbloom',
  p=>p.colorVariant=4,p=>p.colorVariant='toxic',p=>p.mutation={expiresAt:200000},p=>p.pendingMutation={},
  (p,f)=>f.ambient.pendingDrops.set(p,{type:'ditch_weed_bud'}), (p,f)=>f.garden.byCell.set(p.cell,{...p})]){
  const f=fixture(3);change(f.garden.specimens[0],f);assert(!f.g.landscapingEligible(f.at,null,'weed_harvest'));
}
for(const roll of [0,.049999,.05,.050001,.99]){
  const f=fixture();let calls=0;f.at+=44999;f.g.tick(f.at,()=>{throw Error('early roll')});f.at++;
  f.g.tick(f.at,()=>{calls++;return calls===1?roll:.5});assert.equal(f.g.incident?.mode??null,roll<.05?'weed_harvest':null);
  assert.equal(calls,roll<.05?3:1,'one eligibility roll, then count and route draws');
  f.g.tick(f.at,()=>{throw Error('duplicate check')});
  if(roll>=.05)assert.equal(f.g.lastLandscapingAt,-Infinity);
}
// Priority: fight, full-capacity check without fallthrough, vine success, then harvest.
{
  const f=fixture(30);f.at+=45000;let calls=0;f.g.tick(f.at,()=>{calls++;return 0});
  assert.equal(f.g.incident.type,'gnome_incident');assert.equal(calls,3);
}
{
  const f=fixture();f.full();f.at+=45000;let calls=0;f.g.tick(f.at,()=>++calls===1?.5:.25);
  assert.equal(f.g.incident,null);assert.equal(calls,2,'full garden never falls through to vine or weed rolls');
}
for(const vineRoll of [.099999,.1]){
  const f=fixture(25,i=>i<20?'vine':'weed');f.at+=45000;let calls=0;
  f.g.tick(f.at,()=>{calls++;return calls===1?vineRoll:.01});assert.equal(f.g.incident.mode,vineRoll<.1?'vine':'weed_harvest');
}
for(const first of ['vine','overcrowding','weed_harvest'])for(const second of ['vine','overcrowding','weed_harvest']){
  const f=fixture();f.full();assert(f.g.startLandscaping(f.at,()=>.5,first));f.g.clear();
  f.at+=G.landscapingConfig.cooldownMs-1;f.full();assert(!f.g.startLandscaping(f.at,()=>.5,second));f.at++;
  assert(f.g.startLandscaping(f.at,()=>.5,second));
}
for(const [random,count] of [[0,1],[.5,2],[.99999,3]]){
  const f=fixture();assert(f.g.startLandscaping(f.at,()=>random,'weed_harvest'));assert.equal(f.g.incident.targets.length,count);
  const selected=f.g.incident.targets.map(t=>t.specimen);assert.equal(new Set(selected).size,count);
  f.g.advance(f.at+750);assert.equal(f.removals.length,0);f.tick(749);assert.equal(f.removals.length,0);f.tick(1);
  assert.equal(f.removals.length,1);f.g.tick(f.at);assert.equal(f.removals.length,1);f.finish();
  assert.deepEqual(f.removals,selected);assert.equal(f.garden.byCell.size,5-count);
}
for(const invalidate of [(p,f)=>f.garden.remove(p,'collected'),p=>p.id++,p=>p.createdAt++,p=>p.colorVariant=4,
  p=>p.createdAt=99000,p=>p.type='vine',p=>p.pendingMutation={},
  (p,f)=>f.ambient.pendingDrops.set(p,{type:'ditch_weed_bud'}),
  (p,f)=>{const replacement={...p};f.garden.byCell.set(p.cell,replacement);f.garden.specimens.splice(f.garden.specimens.indexOf(p),1,replacement)}]){
  const f=fixture();f.g.startLandscaping(f.at,()=>0,'weed_harvest');const target=f.g.incident.targets[0].specimen;invalidate(target,f);
  f.tick(750);assert.equal(f.removals.length,0);assert.equal(f.g.incident.removals,0);
}
for(const suspended of [true,false]){
  const f=fixture();f.g.startLandscaping(f.at,()=>.5,'weed_harvest');if(suspended)f.tick(250,true);else f.tick(1501);
  assert.equal(f.g.incident,null);assert.equal(f.removals.length,0);assert.equal(f.g.actors.length,0);
}
{
  const f=fixture(3,()=> 'weed',59000),parent=f.garden.specimens[0];parent.origin={kind:'tcpnoise'};
  f.ambient.maybeScheduleWeedBud(parent,0,()=>.5,f.at);f.at+=1000;
  assert.equal(f.g.landscapingCandidates(f.at,'weed_harvest').length,2,'mature source remains protected until its pending bud activates');
  f.ambient.tick(f.at);const bud=f.ambient.drops[0];assert(bud);
  assert(f.g.startLandscaping(f.at,()=>0,'weed_harvest'));f.tick(750);
  assert(!f.garden.specimens.includes(parent));assert.equal(f.ambient.drops[0],bud,'already-active bud survives harvesting its former source');
}
for(const mode of ['fight','vine','overcrowding','weed_harvest']){
  const f=fixture();f.full();if(mode==='fight')f.g.start(f.at,()=>.5);else f.g.startLandscaping(f.at,()=>.5,mode);
  f.render();const actor=f.g.actors[0],pose=G.presentation(actor,f.at);
  const underlying={type:'broadleaf',column:Math.floor(pose.x/30),row:Math.floor(pose.y/30),createdAt:f.at};
  const item={type:'ditch_weed_bud',x:pose.x,y:pose.y,phase:0,createdAt:f.at,expiresAt:f.at+20000};
  const state={gnomes:f.g,specimens:[underlying],drops:[item],curiosities:[{...item,type:'shiny_pebble'}]};
  assert.equal(I.resolve(pose,state,f.at).kind,'gnome');assert(f.g.click(actor));assert(actor.underpantsAttempted);
  const drop=f.ambient.drops[0];assert.equal(drop.type,'gnome_underpants');assert.equal(drop.expiresAt,f.at+20000);
  assert(G.appearance(actor,f.at).surprised);assert.equal(G.appearance(actor,f.at,true).bounce,0);
  assert(!G.appearance(actor,f.at+600).surprised);for(let n=0;n<10;n++)f.g.click(actor);assert.equal(f.ambient.drops.length,1);
  f.g.clear();assert.equal(f.ambient.drops[0],drop);assert(!f.g.click(actor));assert.equal(f.g.hitAt(pose),null);
  f.ambient.tick(f.at+19999);assert.equal(f.ambient.drops.length,1);f.ambient.tick(f.at+20000);assert.equal(f.ambient.drops.length,0);
}
{
  const f=fixture(30);f.g.start(f.at,()=>.5);const actor=f.g.actors[0];
  assert(!f.g.click(actor),'unpainted actor cannot be clicked');
  for(const age of [500,3500,7500]){
    f.g.advance(f.at+age,()=>.1);for(const a of f.g.actors)G.presentation(a,f.at+age);
    const pose=G.presentation(actor,f.at+age);assert.equal(f.g.hitAt({x:pose.x,y:pose.y-3},f.at+age),actor,'animated position, shove, bounce and rotation');
  }
  f.g.suspend();assert(!f.g.click(actor));f.g.resetCadence();assert.equal(f.g.hitAt({x:actor.x,y:actor.y},f.at+12000),null);
}
{
  const f=fixture(30);f.g.start();f.render();f.ambient.seed({drops:Array.from({length:5},(_,i)=>({type:i%2?'ditch_weed_bud':'amanita_muscaria',x:100+i*30,y:100,phase:0,createdAt:f.at,expiresAt:f.at+20000}))});
  const actor=f.g.actors[0];assert(f.g.click(actor));assert.equal(f.ambient.drops.length,5);assert.equal(f.ambient.counts.dropsCapSkipped,1);
  f.ambient.removeDrop(f.ambient.drops[0]);assert(f.g.click(actor));assert.equal(f.ambient.drops.length,4,'full-cap attempt consumed permanently');
  const other=f.g.actors[1];assert(f.g.click(other));assert.equal(f.ambient.drops.length,5);assert.equal(f.ambient.drops.at(-1).type,'gnome_underpants');
}
for(const [roll,expected] of [[0,ordinaryMessage],[.799999,ordinaryMessage],[.8,rareMessage],[.999999,rareMessage]])assert.equal(T.collectionMessage('gnome_underpants',()=>roll),expected);
assert.equal(T.collectionMessage('ditch_weed_bud',()=>{throw Error('unexpected roll')}),T.messages.ditch_weed_bud);

(async()=>{
  for(const reduced of [false,true]){
    const p=await start(false,{captureModel:true,reduced,random:()=>.5});
    p.model.seedLandscaping('weed_harvest');
    const stats=JSON.stringify(p.model.counts),recent=JSON.stringify(p.model.recentEvents);
    p.gnomes.startLandscaping(100000,()=>.5,'weed_harvest');
    p.frame(250);
    const actor=p.gnomes.actors[0],pose=G.presentation(actor,p.context.Date.now(),reduced),root=p.app.stage.children[0],r=p.app.canvas.getBoundingClientRect();
    const hit=(x,y)=>p.app.canvas.handlers.get('click')({clientX:r.left+root.position.x+x*root.scale.x,clientY:r.top+root.position.y+y*root.scale.y});
    hit(pose.x,pose.y);
    assert.equal(p.ambient.drops.length,1);assert.equal(p.model.specimens.length,5);
    hit(pose.x,pose.y);assert.equal(p.ambient.drops.length,1);
    for(let n=0;n<20;n++){p.frame(250);}
    assert.equal(p.gnomes.incident,null);assert.equal(p.model.specimens.length,3);
    assert.equal(p.ambient.drops.length,1);
    assert.equal(JSON.stringify(p.model.counts),stats);assert.equal(JSON.stringify(p.model.recentEvents),recent);
    const drop=p.ambient.drops[0];hit(drop.x,drop.y);
    assert.equal(p.element('#collection-message').textContent,ordinaryMessage);
    assert.equal(p.element('#garden-score').textContent,'Score: 0');
    assert.equal(p.ambient.drops.length,0);
    p.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(p.errors,[]);
  }
  for(const id of ['trigger-weed-harvest','seed-gnome-drops','underpants-message-roll']){
    assert(!fs.readFileSync('wwwroot/index.html','utf8').includes(`id="${id}"`),'new diagnostics stay off the homepage');
  }
  const layer=new h.P.Container(),cl=new h.P.Container(),dl=new h.P.Container(),base=h.live.size,tex=h.textureCount();
  const gc=GV.makeGnomeAtlas(h.P,h.renderer),ac=AV.makeAmbientAtlas(h.P,h.renderer),gv=GV.createGnomeView(h.P,layer,gc.frames),av=AV.createAmbientView(h.P,cl,dl,ac.frames);
  assert.equal(gc.frames.size,26);assert.equal(ac.frames.size,14);const bakes=h.generated(),f=fixture(),m=G.createModel({garden:f.garden,getSpecimens:()=>f.garden.specimens,now:()=>f.at,onChange:gv.change,
    onUnderpantsAttempt:(point,at)=>ambient.dropGnomeUnderpants(point,at)}),ambient=A.createAmbientModel({onChange:c=>av.change(c,f.at)});
  for(let n=0;n<25;n++){
    f.fill();f.at+=420000;f.fill();assert(m.startLandscaping(f.at,()=>.5,'weed_harvest'));gv.animate(f.at);
    for(const actor of m.actors){m.click(actor,f.at);gv.animate(f.at);}assert.equal(av.dropViews.size,2);
    const sprites=[...gv.views.values(),...av.dropViews.values()].map(v=>v.sprite??v);
    m.clear();ambient.tick(f.at+20000);assert.equal(gv.views.size,0);assert.equal(av.dropViews.size,0);
    assert(sprites.every(s=>!h.live.has(s)));assert.equal(h.generated(),bakes);assert.equal(h.textureCount(),tex+40);
  }
  gv.destroy();av.destroy();gc.destroy();ac.destroy();assert.equal(h.live.size,base);assert.equal(h.textureCount(),tex);
  layer.destroy();cl.destroy();dl.destroy();
  const dev=await start(false,{captureModel:true,pageHtml:fs.readFileSync('wwwroot/pixi-live.html','utf8'),random:()=>.5});
  dev.element('#trigger-weed-harvest').handlers.get('click')();assert.equal(dev.gnomes.incident.mode,'weed_harvest');
  dev.element('#seed-gnome-drops').handlers.get('click')();assert.equal(dev.ambient.drops.length,5);
  assert(dev.model.specimens.every(p=>p.origin.kind==='simulated'));assert.equal(dev.model.recentEvents.length,0);assert.equal(dev.model.counts.acceptedLive,0);
  dev.winHandlers.get('pagehide')({persisted:false});
  console.log('PASS: harvest maturity/5%/priority/cooldown/1–3 cuts/pending-bud and identity safety, all gnome clicks/last-painted transforms/one cap-consumed attempt, 80/20 messages, Pixi integration and 25 resource cycles.');
})().catch(e=>{console.error(e);process.exitCode=1});
