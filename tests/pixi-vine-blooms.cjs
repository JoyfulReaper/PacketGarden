const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const V=require('../wwwroot/pixi-vine-blooms.js'),B=require('../wwwroot/pixi-broadleaf-blooms.js');
const core=require('../wwwroot/pixi-live-core.js'),shared=require('../wwwroot/pixi-stress.js');
const h=require('./pixi-live.cjs'),{createView}=require('../wwwroot/pixi-live.js'),{start}=require('./pixi-default.cjs');
assert.equal(V.chance,.15);assert.deepEqual(V.colors,['Soft pink','Lavender','Pale yellow','White']);
for(const [roll,success] of [[0,true],[.149999999,true],[.15,false],[.9999,false]]){
  const p={type:'vine'};let calls=0;const draw=()=>{calls++;return roll;},trait=V.assign(p,draw);
  assert.equal(Boolean(trait),success);for(let i=0;i<100;i++)assert.equal(V.assign(p,draw),trait);
  assert.equal(calls,1);assert(!Object.keys(p).includes('vineBloom'));if(trait)assert(Object.isFrozen(trait));
}
let wins=0;const colors=[0,0,0,0],layouts=[0,0];
for(let i=0;i<40000;i++){const trait=V.assign({type:'vine'},()=>(i+.5)/40000);if(trait){wins++;colors[trait.color]++;layouts[trait.layout]++;}}
assert.equal(wins,6000);assert.deepEqual(colors,[1500,1500,1500,1500]);assert.deepEqual(layouts,[3000,3000]);
assert.equal(V.assign({type:'broadleaf'},()=>{throw Error('wrong random stream');}),null);
const context={window:{},Uint32Array,Date,Math:Object.create(Math),crypto:{getRandomValues(a){a[0]=781;return a;}}};
context.Math.random=()=>{throw Error('gameplay randomness consumed');};vm.runInNewContext(fs.readFileSync('wwwroot/pixi-vine-blooms.js','utf8'),context);
for(let i=0;i<100;i++)context.window.PacketGardenVineBlooms.assign({type:'vine'});
const event=(type='vine',vigor=0)=>({specimenType:type,listenPort:3389,vigor,sensor:'vine-bloom-test',seenCount:'12'});
function trace(vineBloomRandom){let calls=0,broadleafCalls=0;const m=core.createModel({add(){},update(){},remove(){}},{now:()=>100000,
  random:()=>{calls++;return .5;},bloomRandom:()=>{broadleafCalls++;return .08;},vineBloomRandom});
  for(let i=0;i<100;i++)m.acceptEvent(event(i%3?'vine':'broadleaf',i%4));return {m,calls,broadleafCalls};}
const a=trace(()=>0),b=trace(()=>.9);assert.equal(a.calls,b.calls);assert.equal(a.broadleafCalls,b.broadleafCalls);
assert.equal(JSON.stringify(a.m.specimens),JSON.stringify(b.m.specimens));assert.deepEqual(a.m.counts,b.m.counts);assert.deepEqual(a.m.recentEvents,b.m.recentEvents);
assert.deepEqual(a.m.specimens.filter(p=>p.type==='broadleaf').map(p=>p.broadleafBloom),b.m.specimens.filter(p=>p.type==='broadleaf').map(p=>p.broadleafBloom));
assert.equal(B.chance,.2);assert.equal(core.colorVariant('vine',3,.009999),4);assert.equal(core.colorVariant('vine',3,.01),0);
const objects=h.live.size,textures=h.textureCount(),bakes=h.generated();let geometry=0;
class Graphics extends h.P.Graphics{
  constructor(){super();this.curves=[];}
  destroy(options){this.destroyOptions=options;return super.destroy(options);}
  clear(){geometry++;this.curves=[];return super.clear();}
  moveTo(x,y){this.begin=[x,y];return this;}
  bezierCurveTo(...points){this.points=points;return this;}
  stroke(style){geometry++;this.curves.push({start:this.begin,points:this.points,style});return super.stroke();}
}
const P={...h.P,Graphics},stage=new h.P.Container(),view=createView(P,{stage},h.cache.frames,core,shared);
let at=100000,rolls=0;const model=core.createModel(view,{now:()=>at,random:()=>.5,poppyRandom:()=>.9,vineBloomRandom:()=>{rolls++;return .01;}});
const p=model.acceptEvent({...event(),vineBloom:null}).specimen,trait=p.vineBloom,parent=view.byId.get(p.id);
assert(trait,'network payload cannot override cosmetics');assert.equal(view.vineBloomViews.size,0);
at=p.createdAt+20000;model.tick();assert.equal(view.vineBloomViews.size,0);
at=p.createdAt+59999;model.tick();assert.equal(view.vineBloomViews.size,0);
at++;model.tick();const flowers=view.vineBloomViews.get(p.id);assert.equal(flowers.parent,parent);assert.equal(flowers.eventMode,'none');
assert.equal(flowers.alpha,1);assert.equal(view.vineBloomLinks.size,0,'isolated vine still flowers');
const previewStage=new h.P.Container(),preview=createView(P,{stage:previewStage},h.cache.frames,core,shared);
preview.add(p,model.byCell);assert.equal(preview.vineBloomViews.get(p.id).texture,flowers.texture);
const previewGraphic=preview.vineLinks.get(p.id);preview.destroy();previewStage.destroy();
assert.equal(previewGraphic.destroyOptions.context,true);assert.equal(previewGraphic.destroyOptions.children,true);
for(let i=0;i<100;i++){view.update(p,model.byCell);view.animate(i,.016,at);}assert.equal(rolls,1);assert.equal(p.vineBloom,trait);
at=p.createdAt+480000;model.tick();assert.equal(view.vineBloomViews.get(p.id),flowers);assert.equal(flowers.scale.x,.66);assert.equal(flowers.alpha,.55);
at=p.createdAt+600000;model.tick();assert.equal(view.vineBloomViews.size,0);assert(!h.live.has(parent));assert(!h.live.has(flowers));
model.seedVineBlooms('dense');assert.equal(model.byCell.size,640);assert.equal(view.vineBloomViews.size,640);
assert(view.vineBloomLinks.size>0&&view.vineBloomLinks.size<=640);assert.equal(new Set([...view.vineBloomLinks.values()].map(r=>r.key)).size,view.vineBloomLinks.size);
assert.equal(view.bloomViews.size,0);const specimens=model.specimens.slice(),byCell=model.byCell;
for(const source of specimens){
  const body=view.vineBloomViews.get(source.id),silver=source.colorVariant===4;
  assert.equal(body.parent,view.byId.get(source.id));assert.equal(body.tint,V.tints[source.vineBloom.color]);
  if(silver)assert.equal(view.byId.get(source.id).texture,h.cache.frames.get(`vine:mature:${source.vigor}:4`));
}
function auditConnections(){
  const keys=new Set();
  for(const [id,record] of view.vineBloomLinks){
    const source=model.specimens.find(p=>p.id===id),neighbor=model.specimens.find(p=>p.id===record.neighborId);
    assert(source&&neighbor);assert(source.cell<neighbor.cell,'one canonical half owns each decoration');
    assert(V.active(source));assert(!keys.has(record.key));keys.add(record.key);
    const graphic=view.vineLinks.get(id);assert.equal(record.sprite.parent,graphic);assert.equal(graphic.children.length,1);
    assert(graphic.curves.some(c=>JSON.stringify([0,0,...c.points])===JSON.stringify(record.curve)),'flower samples an actual rendered curve');
    const position=V.point(record.curve,record.t);assert.equal(record.sprite.position.x,position.x);assert.equal(record.sprite.position.y,position.y);
    const count=source.vineBloom.layout===0?2:4;assert(count+1<=5);
  }
}
auditConnections();
// Compare every existing curve with committed broadleaf-only rendering. All
// eligibility/thinning/positions/controls/styles must be byte-for-byte identical.
const baseline={exports:{}};vm.runInNewContext(execFileSync('git',['show','4f7b359:wwwroot/pixi-live.js'],{encoding:'utf8'}),
  {module:baseline,require:createRequire(path.resolve('wwwroot/pixi-live.js')),Date});
const oldStage=new h.P.Container(),old=baseline.exports.createView(P,{stage:oldStage},h.cache.frames,core,shared);
for(const source of specimens)old.add(source,byCell);
for(const [id,graphic] of view.vineLinks)assert.equal(JSON.stringify(graphic.curves),JSON.stringify(old.vineLinks.get(id).curves));
assert.equal(view.snapshot().connectionHalves,old.snapshot().connectionHalves);old.destroy();oldStage.destroy();
const holder=[...view.vineBloomLinks.entries()][0],owner=model.specimens.find(p=>p.id===holder[0]),neighbor=model.specimens.find(p=>p.id===holder[1].neighborId),lostKey=holder[1].key;
const ownerTrait=owner.vineBloom,oldConnectionSprite=holder[1].sprite;
model.remove(neighbor);assert(!h.live.has(oldConnectionSprite));assert(![...view.vineBloomLinks.values()].some(r=>r.key===lostKey));auditConnections();
// Reintroducing a real neighbor refreshes local curves/decorations, with no new roll on the owner.
const newcomer=model.addSpecimen('vine',0,at).specimen;assert.equal(view.vineBloomLinks.get(owner.id)?.key===lostKey,false,'sprout has no connecting tendril');
at+=20000;model.tick();assert.equal(owner.vineBloom,ownerTrait);assert.equal(view.vineBloomLinks.get(owner.id).key,lostKey);
assert.equal(view.vineBloomLinks.get(owner.id).neighborId,newcomer.id);auditConnections();
const matureLink=view.vineBloomLinks.get(owner.id).sprite;
at=owner.createdAt+480000;model.tick();assert.equal(view.vineBloomLinks.get(owner.id).sprite,matureLink);
assert.equal(matureLink.alpha,.38);assert.equal(matureLink.scale.x,.66);assert.equal(owner.vineBloom,ownerTrait);auditConnections();
const beforeRender=geometry,checks=view.counters.vineNeighborChecks;
for(let i=0;i<1000;i++)view.animate(i/60,1/60,at);assert.equal(geometry,beforeRender);assert.equal(view.counters.vineNeighborChecks,checks);
const victim=model.specimens.find(p=>p.vigor===0),victimBody=view.vineBloomViews.get(victim.id),victimLink=view.vineBloomLinks.get(victim.id)?.sprite;
const replace=model.acceptEvent(event('broadleaf',3));assert.equal(replace.outcome,'replaced');assert(!h.live.has(victimBody));if(victimLink)assert(!h.live.has(victimLink));auditConnections();
model.clear();assert.equal(view.vineBloomViews.size,0);assert.equal(view.vineBloomLinks.size,0);
for(let i=0;i<5;i++){model.seedVineBlooms('dense');model.clear();}
assert.equal(h.textureCount(),textures);assert.equal(h.generated(),bakes);view.destroy();stage.destroy();assert.equal(h.live.size,objects);
(async()=>{
  for(const page of ['index.html','pixi-live.html'])for(const reduced of [false,true]){
    const g=await start(false,{pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8'),captureModel:true,reduced});assert.deepEqual(g.errors,[]);
    if(page==='index.html')assert.equal(g.element('#seed-vine-bloom-dense'),null);
    else{
      g.element('#seed-vine-bloom-stages').handlers.get('click')();assert.equal(g.model.specimens.length,20);assert.equal(g.view.vineBloomViews.size,8);assert.equal(g.ecology.grassCells.length,640);
      g.element('#seed-vine-bloom-connections').handlers.get('click')();assert(g.view.vineBloomLinks.size>0);
      g.element('#seed-vine-bloom-dense').handlers.get('click')();assert.equal(g.view.vineBloomViews.size,640);assert.equal(g.model.byCell.size,640);
      const pose=[...g.view.vineBloomViews.values()].map(s=>[s.scale.x,s.alpha,s.tint]);for(let i=0;i<10;i++)g.view.animate(i,.016,g.context.Date.now());
      assert.deepEqual([...g.view.vineBloomViews.values()].map(s=>[s.scale.x,s.alpha,s.tint]),pose);
      assert.equal(g.element('#garden-score').textContent,'Score: 0');assert.equal(g.model.counts.acceptedLive,0);
      g.doc.hidden=true;g.docHandlers.get('visibilitychange')();g.advance(600001);g.doc.hidden=false;g.docHandlers.get('visibilitychange')();
      assert.equal(g.view.vineBloomViews.size,0);assert.equal(g.view.vineBloomLinks.size,0);
    }
    g.winHandlers.get('pagehide')({persisted:false});assert.equal(g.view.vineBloomViews.size,0);assert.equal(g.view.vineBloomLinks.size,0);assert.deepEqual(g.errors,[]);
  }
  console.log('PASS: exact 15% stable/independent vine traits, silvervine, maturity/fade/expiry/replacement, unchanged canonical curves, bounded unique on-curve decorations, neighbor refresh, 640-parent ownership, no per-frame work, broadleaf/network/score isolation and hidden/reduced-motion cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
