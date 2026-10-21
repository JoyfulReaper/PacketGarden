const assert=require('node:assert/strict'),fs=require('node:fs');
const G=require('../wwwroot/garden-core.js'),A=require('../wwwroot/garden-ambient.js');
const I=require('../wwwroot/garden-interaction.js'),V=require('../wwwroot/pixi-live-ambient.js');
const createCanvas=require('./browser-garden.cjs'),h=require('./pixi-live.cjs'),{start}=require('./pixi-default.cjs');
const message='You smoked some ditch weed. +0 points';
function setup(random=()=>0){
  let at=100000;const changes=[];
  const garden=G.createGardenModel({now:()=>at,random:()=>.5,onChange:c=>{if(c.kind==='removed')ambient.cancelSource(c.specimen)}});
  const ambient=A.createAmbientModel({now:()=>at,random,getSpecimens:()=>garden.specimens,onChange:c=>changes.push(c)});
  return {garden,ambient,changes,at:()=>at,time:value=>at=value,
    live(type='weed',port=420){return garden.addEvent({specimenType:type,listenPort:port,vigor:0,seenCount:'2'}).specimen}};
}
for(const roll of [0,.029999999,.03,.030000001,1,-1,NaN,Infinity]){
  let calls=0;const x=setup(()=>{calls++;return roll}),s=x.live();
  x.ambient.acceptLiveSpecimen(s);const yes=roll>=0&&roll<.03;
  assert.equal(x.ambient.pendingDrops.size,yes?1:0);assert.equal(calls,yes?4:1);
  for(let n=0;n<4;n++)x.ambient.acceptLiveSpecimen(s);
  assert.equal(calls,yes?4:1,'one creation roll, even after failure');
  x.time(160000);x.ambient.tick();x.ambient.clear();x.ambient.acceptLiveSpecimen(s);
  assert.equal(calls,yes?4:1,'activation/clear cannot reset original attempt');
}
for(const port of [1,22,53,420,42069,65000]){
  const x=setup(),s=x.live('weed',port);x.ambient.acceptLiveSpecimen(s);
  assert.equal(x.ambient.pendingDrops.get(s).activateAt,160000,'canonical weed has no port gate');
  assert(!s.pendingMutation&&!s.mutation);
}
for(const kind of ['fake','simulated',null]){
  const x=setup(()=>{throw Error('ineligible RNG')}),s=x.garden.addSpecimen('weed',0,100000,{kind}).specimen;
  x.ambient.acceptLiveSpecimen(s);assert.equal(x.ambient.pendingDrops.size,0);
}
for(const type of G.eventSpecies.filter(t=>t!=='weed'&&t!=='mushroom')){
  const x=setup(),s=x.live(type,22);x.ambient.acceptLiveSpecimen(s);assert.equal(x.ambient.pendingDrops.size,0);
}
for(const field of ['mutation','pendingMutation']){
  const x=setup(()=>{throw Error('mutated weed cannot roll')}),s=x.live();s[field]={type:'collectible_weed',expiresAt:200000};
  x.ambient.acceptLiveSpecimen(s);assert.equal(x.ambient.pendingDrops.size,0);
}
const timed=setup(),parent=timed.live(),before=JSON.stringify(parent);
timed.ambient.acceptLiveSpecimen(parent);timed.time(159999);timed.ambient.tick();assert.equal(timed.ambient.drops.length,0);
timed.time(160000);timed.ambient.tick();const bud=timed.ambient.drops[0],id=timed.ambient.idFor(bud);
assert.equal(bud.type,'ditch_weed_bud');assert.equal(bud.expiresAt,180000);assert.equal(JSON.stringify(parent),before);
timed.garden.remove(parent);assert.equal(timed.ambient.drops[0],bud,'active drop survives parent');
timed.ambient.tick(179999);assert.equal(timed.ambient.drops[0],bud);assert.equal(timed.ambient.idFor(bud),id);
timed.ambient.tick(180000);assert.equal(timed.ambient.drops.length,0);
assert.equal(timed.changes.filter(c=>c.kind==='drop-removed').length,1);
const once=setup(),onceParent=once.live();once.ambient.acceptLiveSpecimen(onceParent);once.ambient.tick(160000);once.ambient.clear();
assert.equal(once.ambient.scheduleLooseDrop(onceParent,'ditch_weed_bud',()=>{throw Error('second placement')},160000),false);
const mutatedRed=setup(()=>{throw Error('redbloom bud roll')}),red=mutatedRed.live('redbloom',22);
red.mutation={type:'collectible_weed',createdAt:100000,expiresAt:120000};mutatedRed.ambient.acceptLiveSpecimen(red);
assert.equal(mutatedRed.ambient.pendingDrops.size,0);
for(const action of ['remove','clear','replace','copy','createdAt','id','cell','column','row','type','mutation','expiry']){
  const x=setup(),s=x.live();x.ambient.acceptLiveSpecimen(s);
  if(action==='remove')x.garden.remove(s,'collected');
  else if(action==='clear')x.garden.clear();
  else if(action==='replace'||action==='copy'){
    x.garden.specimens.splice(0,1,{...s}); // Even with equal IDs/coordinates/time, exact reference must survive.
  } else if(action==='mutation')s.mutation={type:'collectible_weed',expiresAt:200000};
  else if(action==='type')s.type='redbloom';
  else if(action==='expiry')s.createdAt=-300000;
  else s[action]++;
  x.ambient.tick(160000);assert.equal(x.ambient.pendingDrops.size,0,action);assert.equal(x.ambient.drops.length,0,action);
}
// Six simultaneously due candidates of two types use one five-slot cap, with no eviction/retry.
const capped=setup();for(let i=0;i<3;i++)capped.ambient.acceptLiveSpecimen(capped.live());
capped.time(155000);for(let i=0;i<3;i++)capped.ambient.acceptLiveSpecimen(capped.live('mushroom',70));
capped.time(160000);capped.ambient.tick();assert.equal(capped.ambient.drops.length,5);
assert.deepEqual(capped.ambient.drops.map(d=>d.type),['ditch_weed_bud','ditch_weed_bud','ditch_weed_bud','amanita_muscaria','amanita_muscaria']);
assert.equal(capped.ambient.counts.dropsCapSkipped,1);assert.equal(capped.ambient.pendingDrops.size,0);
capped.ambient.removeDrop(capped.ambient.drops[0]);capped.ambient.tick(160250);assert.equal(capped.ambient.drops.length,4);
const budCap=setup(),waiting=budCap.live();budCap.ambient.acceptLiveSpecimen(waiting);budCap.time(154000);
for(let n=0;n<5;n++)budCap.ambient.acceptLiveSpecimen(budCap.live('mushroom',70));
budCap.ambient.tick(159000);assert.equal(budCap.ambient.drops.length,5);budCap.ambient.tick(160000);
assert.equal(budCap.ambient.counts.dropsCapSkipped,1);assert.equal(budCap.ambient.pendingDrops.size,0);
budCap.ambient.removeDrop(budCap.ambient.drops[0]);budCap.ambient.acceptLiveSpecimen(waiting);budCap.ambient.tick(160250);
assert.equal(budCap.ambient.drops.length,4,'bud cap skip is consumed permanently');
for(const mechanism of ['hidden ticks','stopped tab','late tick']){
  const x=setup();for(let n=0;n<8;n++)x.ambient.acceptLiveSpecimen(x.live());
  if(mechanism!=='late tick')x.ambient.setHidden(true,100000);
  if(mechanism==='hidden ticks')x.ambient.tick(160000,{hidden:true});
  if(mechanism!=='late tick')x.ambient.setHidden(false,160000);
  x.ambient.tick(162000);assert.equal(x.ambient.drops.length,0,mechanism);assert.equal(x.ambient.pendingDrops.size,0);
}
const early=setup();early.ambient.acceptLiveSpecimen(early.live());early.ambient.setHidden(true,100000);
early.ambient.setHidden(false,150000);early.ambient.tick(160000);assert.equal(early.ambient.drops.length,1,'future deadline remains valid');
const overlap={createdAt:100000,expiresAt:120000,x:375,y:315,phase:0};
const bottom={...overlap,type:'amanita_muscaria'},top={...overlap,type:'ditch_weed_bud'};
assert.equal(I.resolve({x:375,y:315},{drops:[bottom,top]},100000).object,top);
assert.equal(I.resolve({x:375,y:315},{drops:[bottom,top],curiosities:[{...top,type:'shiny_pebble'}]},100000).kind,'curiosity');
const canvas=createCanvas({reduced:true});canvas.sandbox.Math.random=()=>0;canvas.emit(53,'weed',1);
const s=canvas.run('gardenModel.specimens[0]');assert.equal(canvas.run('pendingLooseDrops.size'),1);
canvas.clock.now=s.createdAt+59999;canvas.tick();assert.equal(canvas.run('gardenState.drops.length'),0);
canvas.clock.now++;canvas.tick();assert.equal(canvas.run('gardenState.drops[0].type'),'ditch_weed_bud');
const state=canvas.run('JSON.stringify([gardenState.specimens,gardenState.grassCells,gardenState.puddles,gardenState.recentEvents])');
canvas.run('drawGarden()');canvas.drawing.length=0;canvas.run('drawGardenOverlay(true)');
assert(canvas.drawing.every(c=>c.surface==='overlay'));assert(canvas.drawing.some(c=>c[0]==='fillStyle'&&c[1]==='#a4b772'));
assert.equal(canvas.run('gardenBaseDirty'),false);
const drop=canvas.run('gardenState.drops[0]');canvas.click(drop.x,drop.y);
assert.equal(canvas.element('#collection-message').textContent,message);assert.equal(canvas.element('#garden-score').textContent,'Score: 0');
assert.equal(canvas.run('JSON.stringify([gardenState.specimens,gardenState.grassCells,gardenState.puddles,gardenState.recentEvents])'),state);
assert.equal(canvas.run('gardenModel.specimens[0]'),s);assert.equal(canvas.audioContexts(),0);
canvas.clock.now+=2000;canvas.tick();assert(canvas.element('#collection-message').hidden);
canvas.run(`gardenAmbient.seed({drops:['amanita_muscaria','ditch_weed_bud'].map(type=>({type,x:375,y:315,phase:0,createdAt:Date.now(),expiresAt:Date.now()+20000}))})`);
canvas.click(375,315);assert.equal(canvas.run('gardenState.drops.length'),1);assert.equal(canvas.run('gardenState.drops[0].type'),'amanita_muscaria');
assert.equal(canvas.element('#collection-message').textContent,message);canvas.click(375,315);assert.equal(canvas.run('gardenState.drops.length'),0);
assert.equal(canvas.element('#collection-message').textContent,'You found Amanita muscaria. +0 points');
const hiddenCanvas=createCanvas();hiddenCanvas.sandbox.Math.random=()=>0;hiddenCanvas.emit(420,'weed',1);hiddenCanvas.setHidden(true);
hiddenCanvas.clock.now+=60000;hiddenCanvas.setHidden(false);assert.equal(hiddenCanvas.run('gardenState.drops.length'),0);
assert.equal(hiddenCanvas.run('pendingLooseDrops.size'),0);
const textureBase=h.textureCount(),generatedBase=h.generated(),liveBase=h.live.size;
const cache=V.makeAmbientAtlas(h.P,h.renderer),cl=new h.P.Container(),dl=new h.P.Container(),view=V.createAmbientView(h.P,cl,dl,cache.frames);
const a=A.createAmbientModel({onChange:c=>view.change(c,100000)});const idle=h.live.size;
for(let cycle=0;cycle<30;cycle++){
  V.seedWeedBuds(a,100000);assert.equal(a.drops.length,3);assert.equal(view.dropViews.size,3);
  const first=a.drops[0],sprite=view.dropViews.get(a.idFor(first)).sprite;
  for(let i=0;i<60;i++)view.animate(100000+i*100);
  assert.equal(view.dropViews.get(a.idFor(first)).sprite,sprite);assert.equal(sprite.texture,cache.frames.get('ditch_weed_bud'));
  assert.equal(sprite.position.x,first.x);assert.equal(sprite.position.y,first.y,'bud remains still');
  a.removeDrop(first,'collected');assert(!h.live.has(sprite));a.tick(120000);assert.equal(view.dropViews.size,0);
  assert.equal(h.live.size,idle);assert.equal(h.textureCount(),textureBase+13);assert.equal(h.generated(),generatedBase+1);
}
a.clear();view.destroy();cl.destroy();dl.destroy();cache.destroy();assert.equal(h.textureCount(),textureBase);assert.equal(h.live.size,liveBase);
(async()=>{
  const p=await start(false,{captureModel:true,reduced:true,random:()=>0});
  const src=p.model.accept({specimenType:'weed',listenPort:65535,vigor:0,seenCount:'2'});
  assert.equal(p.ambient.pendingDrops.size,1);p.frame(59999);assert.equal(p.ambient.drops.length,0);
  p.frame(1);p.ambient.tick(160000);assert.equal(p.ambient.drops.length,1);
  const accepted=p.model.counts.acceptedLive,recent=JSON.stringify(p.model.recentEvents),count=p.model.specimens.length;
  const d=p.ambient.drops[0],root=p.app.stage.children[0],r=p.app.canvas.getBoundingClientRect(),screen=p.app.renderer.screen;
  p.app.canvas.handlers.get('click')({clientX:r.left+(root.position.x+d.x*root.scale.x)*r.width/screen.width,
    clientY:r.top+(root.position.y+d.y*root.scale.y)*r.height/screen.height});
  assert.equal(p.element('#collection-message').textContent,message);assert.equal(p.model.specimens[0],src);
  assert.equal(p.model.counts.acceptedLive,accepted);assert.equal(JSON.stringify(p.model.recentEvents),recent);assert.equal(p.model.specimens.length,count);
  assert.equal(p.element('#garden-score').textContent,'Score: 0');p.frame(2000);assert(p.element('#collection-message').hidden);
  p.model.accept({specimenType:'weed',listenPort:420,vigor:0});p.doc.hidden=true;p.docHandlers.get('visibilitychange')();
  p.advance(60000);p.doc.hidden=false;p.docHandlers.get('visibilitychange')();assert.equal(p.ambient.drops.length,0);assert.equal(p.ambient.pendingDrops.size,0);
  assert.equal(p.element('#seed-weed-buds'),null);p.winHandlers.get('pagehide')({persisted:false});
  const dev=await start(false,{captureModel:true,pageHtml:fs.readFileSync('wwwroot/pixi-live.html','utf8')});
  const statistics=JSON.stringify(dev.model.counts),history=JSON.stringify(dev.model.recentEvents);
  for(let i=0;i<5;i++){
    dev.element('#seed-weed-buds').handlers.get('click')();assert.equal(dev.ambient.drops.length,3);
    assert(dev.model.specimens.every(s=>s.origin.kind==='simulated'));
    assert.equal(dev.context.window.PacketGardenUiCore.inspection(dev.model.specimens[0],dev.model.specimens[0].createdAt).source,'Simulated weed bud fixture');
    assert.equal(dev.app.stage.children[0].children[7].children.length,3);
    dev.frame(20000);assert.equal(dev.ambient.drops.length,0);assert.equal(dev.app.stage.children[0].children[7].children.length,0);
  }
  assert.equal(JSON.stringify(dev.model.counts),statistics);assert.equal(JSON.stringify(dev.model.recentEvents),history);
  dev.winHandlers.get('pagehide')({persisted:false});
  console.log('PASS: bud 3% boundary/one roll/all live ports/maturity/exact parent/hidden/shared cap, overlay/collection/zero stats, Canvas-Pixi parity, 30 resource cycles, simulated diagnostics and teardown.');
})().catch(error=>{console.error(error);process.exitCode=1});
