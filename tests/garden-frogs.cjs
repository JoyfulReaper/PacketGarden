const assert=require('node:assert/strict'),fs=require('node:fs');
const F=require('../wwwroot/garden-frogs.js'),E=require('../wwwroot/garden-ecology.js'),I=require('../wwwroot/garden-interaction.js');
const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs'),V=require('../wwwroot/pixi-live-ambient.js');
function fixture(random=()=>.5){
  let at=100000;const changes=[],puddles=[{x:480,y:300,size:18,maxSize:24,createdAt:at-20000,lastRefreshedAt:at-20000,seed:.3}];
  const model=F.createModel({now:()=>at,random,getPuddles:()=>puddles,onChange:c=>changes.push(c)});
  const tick=(duration=250)=>{for(let elapsed=0;elapsed<duration;){const step=Math.min(250,duration-elapsed);elapsed+=step;at+=step;model.tick(at);}};
  return {model,puddles,changes,tick,get at(){return at},set at(value){at=value}};
}
for(const roll of [0,.149999,.15,.150001,.999999]){
  let calls=0;const f=fixture(()=>{calls++;return calls===1?roll:.5});f.tick(44999);assert.equal(calls,0);
  f.tick(1);assert.equal(f.model.counts.checks,1);assert.equal(f.model.frogs.length,roll<.15?1:0);
  assert.equal(calls,roll<.15?12:1,'one chance roll, at most one visit and fixed planning draws');
  const before=calls;for(let n=0;n<8;n++)f.model.tick(f.at);assert.equal(calls,before);
  assert.equal(f.model.nextCheckAt,f.at+45000);
}
for(const change of [p=>{p.size=0;p.maxSize=0},p=>{p.size=1;p.maxSize=1},p=>p.lastRefreshedAt=-999999,
  p=>p.createdAt=145001,p=>p.x=NaN,p=>p.maxSize=NaN,p=>p.lastRefreshedAt=145001]){
  const f=fixture(()=>{throw Error('ineligible water rolled')});change(f.puddles[0]);f.tick(45000);
  assert.equal(f.model.counts.checks,0);assert.equal(f.model.frogs.length,0);
}
{
  const f=fixture(()=>{throw Error('weather cannot establish water')});f.puddles.length=0;f.tick(45000);assert.equal(f.model.frogs.length,0);
}
{
  const f=fixture(),p=f.puddles[0];assert(F.usableWater(p,f.at));
  const elapsed=E.puddleConfig.drainDelayAfterLastRefreshMs+E.puddleConfig.drainDurationMs*(1-F.config.minWaterOpacity/.38);
  p.lastRefreshedAt=f.at-elapsed;assert(Math.abs(E.puddleVisualState(p,f.at).opacity-.12)<1e-12);
  p.lastRefreshedAt+=.001;assert(F.usableWater(p,f.at));p.lastRefreshedAt-=.002;assert(!F.usableWater(p,f.at));
}
for(const hops of [2,3]){
  const f=fixture(()=>hops===2?.1:.9),frog=f.model.spawnSimulated();assert.equal(frog.hopAges.length,hops);assert.equal(frog.puddle,f.puddles[0]);
  const untouched=JSON.stringify(f.puddles);assert(F.visualState(frog,f.at+2000).frame.endsWith(':sit'));
  const mid=F.visualState(frog,f.at+10325),reduced=F.visualState(frog,f.at+10325,true);
  assert(mid.hopping);assert(mid.frame.endsWith(':hop'));assert(!reduced.hopping);assert(reduced.frame.endsWith(':sit'));
  assert.equal(reduced.x,frog.points[1].x);assert.equal(reduced.y,frog.points[1].y);
  for(let age=0;age<60000;age+=50)for(const motion of [false,true]){
    const pose=F.visualState(frog,f.at+age,motion);assert(pose.x>=F.config.padding&&pose.x<=960-F.config.padding);
    assert(pose.y>=F.config.padding-3&&pose.y<=600-F.config.padding);assert(pose.alpha>=0&&pose.alpha<=1);
  }
  assert.notEqual(F.visualState(frog,f.at+18000).direction,F.visualState(frog,f.at+21000).direction,'occasional glance');
  assert.equal(JSON.stringify(f.puddles),untouched);
}
for(const operation of ['remove','replace','dry']){
  const f=fixture(),frog=f.model.spawnSimulated(),p=f.puddles[0];f.tick(500);
  if(operation==='remove')f.puddles.length=0;
  if(operation==='replace')f.puddles[0]={...p};
  if(operation==='dry')p.lastRefreshedAt=f.at-510000;
  f.tick(250);assert.equal(frog.leaveAt,f.at);f.tick(750);
  assert.equal(f.model.frogs[0],frog);assert.equal(F.visualState(frog,f.at).alpha,.5);
  f.tick(750);assert.equal(f.model.frogs.length,0);assert.equal(f.changes.filter(c=>c.kind==='frog-removed').length,1);
}
{
  let calls=0;const f=fixture(()=>{calls++;return .5});const first=f.model.spawnSimulated(),second=f.model.spawnSimulated();
  const before=calls;assert.equal(f.model.spawnSimulated(),null);assert.equal(calls,before);f.tick(45000);assert.equal(calls,before,'cap uses no eligibility roll');
  f.tick(14999);assert(f.model.frogs.includes(first)&&f.model.frogs.includes(second));f.tick(1);assert.equal(f.model.frogs.length,0);
  assert.equal(f.model.counts.spawned,2);assert.equal(f.model.counts.removed,2);
}
for(const gap of ['hidden','suspended']){
  let calls=0;const f=fixture(()=>{calls++;return 0});f.model.spawnSimulated();const before=calls;
  if(gap==='hidden')f.model.setHidden(true,f.at);f.at+=450000;
  if(gap==='hidden')f.model.setHidden(false,f.at);else f.model.tick(f.at);
  f.puddles[0].lastRefreshedAt=f.at;
  assert.equal(f.model.frogs.length,0);assert.equal(calls,before);assert.equal(f.model.nextCheckAt,f.at+45000);
  f.model.tick(f.at);f.tick(44999);assert.equal(calls,before);f.tick(1);assert.equal(f.model.counts.checks,1);
}
const a=F.seededRandom(123),b=F.seededRandom(123);for(let n=0;n<40;n++)assert.equal(a(),b());
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-frogs.js','utf8'),/Math\.random|setTimeout|setInterval|requestAnimationFrame|EventSource|document\.|fetch\(/);
const state={specimens:[],curiosities:[],drops:[],frogs:null};assert.equal(I.resolve({x:480,y:300},state),null,'absent wildlife cannot enter click priority');

(async()=>{
  for(const reduced of [false,true]){
    const p=await start(false,{captureModel:true,reduced,frogRandom:F.seededRandom(313)});
    const water={x:480,y:300,size:18,maxSize:24,createdAt:80000,lastRefreshedAt:80000,seed:.3};
    p.ecology.seed({puddles:[water]});
    const beforeStats=JSON.stringify(p.model.counts),recent=JSON.stringify(p.model.recentEvents),waterJson=JSON.stringify(p.ecology.puddles);
    // The same renderer-neutral path data is consumed by both actual presentation adapters.
    const canvasEquivalent=F.createModel({now:()=>100000,random:F.seededRandom(313),getPuddles:()=>[water]});
    const pf=p.frogs.spawnSimulated(),cf=canvasEquivalent.spawnSimulated();assert.deepEqual(JSON.parse(JSON.stringify(pf.points)),cf.points);
    p.frogs.spawnSimulated();assert.equal(p.frogs.frogs.length,2);
    const root=p.app.stage.children[0],sprites=root.children[7].children.slice();assert.equal(sprites.length,2);
    for(let n=0;n<45;n++){p.frame(250);}
    assert(sprites.every(s=>root.children[7].children.includes(s)));assert.equal(p.frogs.frogs[0],pf);
    assert.equal(JSON.stringify(p.model.counts),beforeStats);assert.equal(JSON.stringify(p.model.recentEvents),recent);assert.equal(JSON.stringify(p.ecology.puddles),waterJson);
    assert.equal(p.ambient.drops.length,0);assert.equal(p.ambient.curiosities.length,0);assert.equal(p.gnomes.actors.length,0);
    p.doc.hidden=true;p.docHandlers.get('visibilitychange')();
    p.advance(100000);p.doc.hidden=false;p.docHandlers.get('visibilitychange')();
    p.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(p.errors,[]);assert.equal(p.element('#trigger-frog'),null);
  }
  const baseline=h.textureCount(),live=h.live.size,bakes=h.generated(),atlas=V.makeAmbientAtlas(h.P,h.renderer),layer=new h.P.Container();
  const view=V.createFrogView(h.P,layer,atlas.frames),f=fixture(F.seededRandom(111));
  const model=F.createModel({now:()=>f.at,random:()=>.5,getPuddles:()=>f.puddles,onChange:c=>view.change(c,f.at)});
  assert.equal(atlas.frames.size,13);
  for(let cycle=0;cycle<30;cycle++){
    f.puddles[0].lastRefreshedAt=f.at;const frogs=[model.spawnSimulated(),model.spawnSimulated()];assert(frogs.every(Boolean));
    const sprites=[...view.views.values()];assert.equal(view.views.size,2);assert.deepEqual(layer.children,sprites,'same frog draw order as Canvas');
    for(let age=0;age<60000;age+=250){f.at+=250;model.tick(f.at);view.animate(f.at);assert.equal(h.generated(),bakes+1);}
    assert.equal(view.views.size,0);assert.equal(layer.children.length,0);assert(sprites.every(s=>!h.live.has(s)));
    assert.equal(h.textureCount(),baseline+13);
  }
  model.clear();view.destroy();layer.destroy();atlas.destroy();assert.equal(h.textureCount(),baseline);assert.equal(h.live.size,live);
  const dev=await start(false,{captureModel:true,pageHtml:fs.readFileSync('wwwroot/pixi-live.html','utf8')});
  const stats=JSON.stringify(dev.model.counts),activity=JSON.stringify(dev.model.recentEvents),button=dev.element('#trigger-frog');
  button.handlers.get('click')();button.handlers.get('click')();button.handlers.get('click')();assert.equal(dev.frogs.frogs.length,2);assert.equal(dev.ecology.puddles.length,1);
  assert.equal(JSON.stringify(dev.model.counts),stats);assert.equal(JSON.stringify(dev.model.recentEvents),activity);
  dev.winHandlers.get('pagehide')({persisted:false});
  console.log('PASS: frog .15 boundaries/wet visual water/exact puddle/2 cap/60s paths/no hidden catch-up/bounds/quiet-weather independence, shared-model/Pixi integration, independent RNG and 30 atlas/Sprite cleanup cycles.');
})().catch(e=>{console.error(e);process.exitCode=1});
