// Exact visitor ownership and both real page input adapters, with deterministic time.
const assert=require('node:assert/strict'),F=require('../wwwroot/garden-frogs.js'),I=require('../wwwroot/garden-interaction.js');
const T=require('../wwwroot/garden-ui-core.js'),{start}=require('./pixi-default.cjs');
assert.equal(T.frogMessage,'The frog ignores you +0 points');assert(!Object.hasOwn(T.messages,'frog'));
function fixture(){
  let at=100000;const water={x:480,y:300,size:18,maxSize:24,seed:.3,createdAt:at,lastRefreshedAt:at};
  const model=F.createModel({now:()=>at,random:F.seededRandom(731),getPuddles:()=>[water]});
  return {model,step(ms){while(ms>0){const delta=Math.min(ms,250);at+=delta;model.tick(at);ms-=delta;}},get at(){return at;}};
}
{
  const f=fixture(),m=f.model,frog=m.spawnSimulated();assert.equal(m.hitAt(frog.points[0],f.at),null,'fully faded entrance');
  f.step(600);const snapshot=JSON.stringify(frog),counts=JSON.stringify(m.counts),pose=F.visualState(frog,f.at);
  assert.equal(m.hitAt(pose,f.at),frog);assert(m.click(frog,f.at));assert(!m.click(frog,f.at));
  assert.equal(JSON.stringify(frog),snapshot);assert.equal(JSON.stringify(m.counts),counts);assert(m.frogs.includes(frog));
  assert(!m.click({...frog},f.at));const second=m.spawnSimulated();f.step(600);assert(m.click(second,f.at));
  m.frogs.splice(m.frogs.indexOf(second),1);assert(!m.click(second,f.at));
  // Use a long explicit path to distinguish interpolated and discrete reduced-motion positions.
  frog.points=[{x:400,y:300},{x:450,y:300},{x:470,y:300}];frog.hopAges=[10000,28000];
  f.step(9125);const moving=F.visualState(frog,f.at),still=F.visualState(frog,f.at,true);
  assert(moving.hopping);assert.equal(m.hitAt(moving,f.at),frog);assert.equal(m.hitAt(still,f.at,true),frog);
  assert.equal(m.hitAt(frog.points[0],f.at),null);assert.equal(m.hitAt(moving,f.at,true),null);
  const specimen={column:Math.floor(moving.x/30),row:Math.floor(moving.y/30),mutation:{type:'collectible_weed',expiresAt:f.at+20000}};
  const state={frogs:m,specimens:[specimen]};assert.equal(I.resolve(moving,state,f.at).kind,'frog');
  const drop={type:'amanita_muscaria',x:moving.x,y:moving.y,phase:0,createdAt:f.at,expiresAt:f.at+20000};
  state.drops=[drop];assert.equal(I.resolve(moving,state,f.at).kind,'drop');
  state.curiosities=[{...drop,type:'shiny_pebble'}];assert.equal(I.resolve(moving,state,f.at).kind,'curiosity');
  state.gnomes={hitAt:()=>({})};assert.equal(I.resolve(moving,state,f.at).kind,'gnome');
  f.step(59000-(f.at-frog.createdAt));assert(F.visualState(frog,f.at).alpha>0);assert.equal(m.hitAt(F.visualState(frog,f.at),f.at),frog);
  f.step(1000);assert(!m.frogs.includes(frog));assert(!m.click(frog,f.at));assert.equal(m.hitAt(F.visualState(frog,f.at),f.at),null);
}
for(const hidden of [false,true]){
  const f=fixture(),frog=f.model.spawnSimulated();f.step(600);
  if(hidden)f.model.setHidden(true,f.at);
  assert(!f.model.click(frog,f.at+1501));assert.equal(f.model.hitAt(F.visualState(frog,f.at+1501),f.at+1501),null);
  f.model.tick(f.at+1501);assert.equal(f.model.frogs.length,0);
}
(async()=>{
  for(const reduced of [false,true]){
    const p=await start(false,{captureModel:true,reduced});
    const water={x:480,y:300,size:18,maxSize:24,createdAt:100000,lastRefreshedAt:100000,seed:.3};
    p.ecology.seed({puddles:[water]});
    const frog=p.frogs.spawnSimulated();
    const pClick=point=>{const root=p.app.stage.children[0],r=p.app.canvas.getBoundingClientRect(),s=p.app.renderer.screen;
      p.app.canvas.handlers.get('click')({clientX:r.left+(root.position.x+point.x*root.scale.x)*r.width/s.width,
        clientY:r.top+(root.position.y+point.y*root.scale.y)*r.height/s.height});};
    const baseline=JSON.stringify([p.model.counts,p.model.recentEvents,p.ambient.drops,p.frogs.counts]);
    // Exercise actual scaled central listeners while hopping, without stopping normal presentation.
    for(let n=0;n<42;n++){p.frame(250);}
    const before=JSON.stringify(frog),pose=F.visualState(frog,p.context.Date.now(),reduced);
    pClick(pose);
    for(const g of [p])assert.equal(g.element('#collection-message').textContent,T.frogMessage);
    assert.equal(JSON.stringify(frog),before);assert(p.frogs.frogs.includes(frog));
    for(let n=0;n<6;n++){p.frame(250);}
    const later=F.visualState(frog,p.context.Date.now(),reduced);pClick(later);
    for(let n=0;n<2;n++){p.frame(250);}
    for(const g of [p]){assert.equal(g.element('#collection-message').hidden,true,'repeat did not renew deadline');assert.equal(g.element('#garden-score').textContent,'Score: 0');assert.equal(g.element('#specimen-card').hidden,true);}
    assert.equal(JSON.stringify([p.model.counts,p.model.recentEvents,p.ambient.drops,p.frogs.counts]),baseline);
    p.doc.hidden=true;p.docHandlers.get('visibilitychange')();assert.equal(p.frogs.frogs.length,0);
    p.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(p.errors,[]);
  }
  console.log('PASS: exact once-only frog acknowledgment, unchanged paths/model, hop/reduced/departure/stale/hidden hit safety, priority and actual Pixi scaled clicks, unchanged message deadline/score/activity/resources.');
})().catch(e=>{console.error(e);process.exitCode=1});
