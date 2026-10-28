const assert = require('node:assert/strict'), fs = require('node:fs');
const core = require('../wwwroot/pixi-live-core.js'), shared = require('../wwwroot/pixi-stress.js');
const { makeLiveAtlas, createView } = require('../wwwroot/pixi-live.js');
const garden = require('../wwwroot/garden-core.js');
const read = file => fs.readFileSync(file, 'utf8');
assert.doesNotMatch(read('wwwroot/canvas.html'), /<script|<canvas/);
assert.match(read('wwwroot/pixi-stress.html'), /pixi-stress\.js/);
const html = read('wwwroot/pixi-live.html'), script = read('wwwroot/pixi-live.js'), modelScript = read('wwwroot/pixi-live-core.js');
assert.match(html, /data-pixi-library/); assert.match(html, /pixi-live-core\.js/); assert.match(html, /pixi-live\.js/);
assert.match(html, /src="garden-core\.js(?:\?[^"]*)?"/); assert.doesNotMatch(html, /src="garden\.js"/); assert.match(modelScript, /new Source\('\/api\/garden\/events'\)/);
assert.doesNotMatch(script + modelScript, /setTimeout|setInterval|localStorage|sessionStorage|fetch\(/);
assert.match(script, /backgroundAlpha: 1/); assert.match(script, /nextLogicalAt = Date\.now\(\) \+ 250/);
assert.deepEqual(Object.values(core.dimensions), [960,600,30,32,20,640]);
const event = (type = 'flower', vigor = 0, port = 80) => ({specimenType:type, vigor, listenPort:port, sensor:'test', seenCount:'18446744073709551615'});
for (const type of core.eventSpecies) assert(core.normalizeGarden(event(type)));
assert.equal(core.normalizeGarden(event("stillbloom")),null);
for (const invalid of [null, {}, event('unknown'), event('flower', -1), event('flower', 4), event('flower', 1.1), event('flower', '1'), event('flower', 1, 0), event('flower', 1, 65536), event('flower', 1, 80.5)]) assert.equal(core.normalizeGarden(invalid), null);
const safe = core.normalizeGarden({...event(), remoteIp:'secret', payload:'secret', banner:'secret', credentials:'secret', sensor:'x'.repeat(1000), seenCount:'bad'});
assert.deepEqual(Object.keys(safe), ['specimenType','listenPort','vigor','sensor','seenCount']); assert.equal(safe.sensor.length,128); assert.equal(safe.seenCount,null);
assert.equal(core.normalizeGarden(event()).seenCount,'18446744073709551615');
for (const invalid of [null, {}, {level:'bogus',eventsPerMinute:12}, {level:'rain',eventsPerMinute:NaN}, {level:'rain',eventsPerMinute:'12'}]) assert.equal(core.normalizeWeather(invalid),null);
assert.equal(core.normalizeWeather({level:'rain',eventsPerMinute:1e8}).eventsPerMinute,1e6);
assert.equal(core.normalizeWeather({level:'rain',eventsPerMinute:-1}).eventsPerMinute,0);
assert.deepEqual(core.normalizeWeather({level:'rain',eventsPerMinute:29.8,eventsLastHour:4321}),
  {level:'rain',eventsPerMinute:29.8,eventsLastHour:4321,hasSnapshot:true,telemetryHealthy:false,freshUntil:null,telemetryGeneration:null});
for (const hour of [undefined,null,-1,1.5,'4321',NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) {
  assert.equal(core.normalizeWeather({level:'rain',eventsPerMinute:29.8,eventsLastHour:hour}).eventsLastHour,null);
}
assert.equal(core.normalizeWeather({level:'quiet',eventsPerMinute:0,eventsLastHour:0}).eventsLastHour,0);
assert.equal(core.normalizeWeather({level:'quiet',eventsPerMinute:0,hasSnapshot:false}).hasSnapshot,false);
assert.equal(core.weatherSettings({level:'quiet',eventsPerMinute:10000}).count,0);
assert.equal(core.weatherSettings({level:'botnet_hurricane',eventsPerMinute:1e6}).count,400);
assert.equal(core.weatherSettings({level:'rain',eventsPerMinute:0}).darkening,0);
// Frozen pre-extraction placement traces are independent of the removed renderer.
assert.equal(core.timings,garden.timings);
const nullView = {add(){},update(){},remove(){}};
const order=['flower','mushroom','vine','broadleaf','wirefern','redbloom','weed','ghostbloom','crystalfungus','blackthorn'];
for(const {rolls,cells} of require('./fixtures/production-placement.json').cases){
  let index=0;const model=core.createModel(nullView,{now:()=>10000,random:()=>rolls[index++%rolls.length]});
  for(let i=0;i<cells.length;i++)assert.equal(model.accept(event(order[i%10],i%4)).cell,cells[i]);
}
const parity=core.createModel(nullView,{now:()=>10000,random:()=>.5});
for(let i=0;i<130;i++)assert(parity.accept(event(core.eventSpecies[i%10],i%4)));
assert.equal(new Set(parity.specimens.map(p=>p.cell)).size,130);
assert(parity.specimens.every(p=>p.column>=0&&p.column<32&&p.row>=0&&p.row<20));
assert.deepEqual([.009,.01,.7029,.703,.8514,.852,.9504,.951].map(roll=>core.colorVariant('vine',3,roll)),[4,0,0,1,1,2,2,3]);
let expiryNow=100000;
const expiryFirst=core.createModel(nullView,{now:()=>expiryNow,random:()=>.5});expiryFirst.seed();expiryNow+=30000;
assert(expiryFirst.accept(event('flower',0)), 'Natural expiry frees cells before equal-vigor competition');
assert.equal(expiryFirst.counts.lifecycleRemovals,64);assert.equal(expiryFirst.counts.replacements,0);assert.equal(expiryFirst.specimens.length,577);
for(const replaceable of ['weed','redbloom']) {
  const full=core.createModel(nullView,{now:()=>100000,random:()=>.5});full.seed();
  for(const specimen of full.specimens){specimen.type='ghostbloom';specimen.createdAt=100000;specimen.vigor=3;}
  full.specimens[17].type=replaceable;full.specimens[17].vigor=1;
  const incoming=full.accept(event('flower',2));assert.equal(incoming.cell,17);
}

// Real view controller with instrumented lightweight Pixi doubles, no GPU assertions.
let live = new Set(), generated=0, textureCount=0;
const point=()=>({x:0,y:0,set(x,y=x){this.x=x;this.y=y;}});
class Container {
  constructor(){this.children=[];this.position=point();this.scale=point();this.visible=true;live.add(this);}
  addChild(...children){for(const child of children){child.parent=this;this.children.push(child);}return children[0];}
  addChildAt(child,index){this.addChild(child);this.children.splice(this.children.indexOf(child),1);this.children.splice(index,0,child);return child;}
  removeChildren(){const children=this.children.splice(0);for(const child of children)child.parent=null;return children;}
  destroy(options){if(options?.children)for(const child of this.removeChildren())child.destroy(options);
    if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}live.delete(this);}
}
class Graphics extends Container {constructor(){super();this.context={instructions:[]};}clear(){this.context.instructions=[];return this;}stroke(){this.context.instructions.push('stroke');return this;}}
for(const method of ['rect','roundRect','circle','ellipse','poly','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','fill'])Graphics.prototype[method]=function(){return this;};
class Sprite extends Container{constructor(texture){super();this.texture=texture;this.anchor=point();}}
class Particle{constructor(options){Object.assign(this,options);}}
class ParticleContainer extends Container{constructor(){super();this.particleChildren=[];}addParticle(p){this.particleChildren.push(p);}removeParticles(){this.particleChildren=[];}update(){}}
class Rectangle{constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}}
class Texture{constructor(options){Object.assign(this,options);textureCount++;}destroy(){textureCount--;}}
Texture.WHITE={};
const P={Container,Graphics,Sprite,Particle,ParticleContainer,Rectangle,Texture};
const renderer={generateTexture(){generated++;return {source:{},destroy(){}};}};
const cache=makeLiveAtlas(P,renderer,shared,core); assert.equal(cache.frames.size,825);assert.equal(textureCount,825);assert.equal(live.size,0);
assert.equal(new Set([...cache.frames.values()].map(frame=>frame.source)).size,1);
let now=100000; const app={stage:new Container()}, view=createView(P,app,cache.frames,core,shared);
const model=core.createModel(view,{now:()=>now,random:()=>.5});
const first=model.accept(event()), firstSprite=view.byId.get(first.id); assert.equal(view.counters.created,1); assert.equal(view.byId.size,1);
const originalTexture=firstSprite.texture; now+=15000;model.tick(); assert.equal(view.byId.get(first.id),firstSprite);assert.notEqual(firstSprite.texture,originalTexture);assert.equal(view.counters.created,1);
const updates=view.counters.stageUpdates;model.tick();assert.equal(view.counters.stageUpdates,updates);
const color=first.colorVariant;now+=30000;model.tick();assert.equal(first.colorVariant,color);
now=first.createdAt+core.timings.flower.expiredAfterMs;model.tick();assert.equal(view.byId.size,0);assert(!live.has(firstSprite));assert.equal(model.counts.lifecycleRemovals,1);
model.seed();assert.equal(model.specimens.length,640);assert.equal(view.byId.size,640);assert.equal(model.byCell.size,640);
const beforeCreated=view.counters.created;assert.equal(model.accept(event('flower',0)),null);assert.equal(view.counters.created,beforeCreated);
let eligible=model.specimens.filter(p=>!['ghostbloom','crystalfungus','blackthorn'].includes(p.type)&&p.vigor<3);
const minimum=Math.min(...eligible.map(p=>p.vigor));eligible=eligible.filter(p=>p.vigor===minimum);
const oldest=eligible.reduce((a,b)=>a.createdAt<=b.createdAt?a:b), victimSprite=view.byId.get(oldest.id), others=new Map(view.byId);
const replacement=model.accept(event('weed',3));assert.equal(replacement.cell,oldest.cell);assert(!live.has(victimSprite));assert.equal(view.byId.size,640);
assert.equal(view.counters.created,beforeCreated+1);assert.equal(model.counts.replacements,1);
for(const [id,sprite] of others)if(id!==oldest.id)assert.equal(view.byId.get(id),sprite);
assert.equal(textureCount,825);assert.equal(generated,2);
const count=model.counts.acceptedLive;model.setPaused(true);assert.equal(model.accept(event('redbloom',3)),null);assert.equal(model.counts.acceptedLive,count);model.setPaused(false);
// Protected-only saturated grid cannot churn even at maximum incoming vigor.
for(const specimen of model.specimens)specimen.type='ghostbloom';assert.equal(model.accept(event('weed',3)),null);
model.clear();assert.equal(view.byId.size,0);assert.equal(view.vineLinks.size,0);assert.equal(model.byCell.size,0);
// Local vine curves connect only eligible adjacent cells, including diagonals; no wrapping.
const vines=core.createModel(view,{now:()=>now,random:()=>.5});
let a=vines.accept(event('vine')), b=vines.accept(event('vine'));
assert.equal(view.snapshot().connectionHalves,0);now+=20000;vines.tick();assert.equal(view.snapshot().connectionHalves,2);
const checks=view.counters.vineNeighborChecks;view.animate(3,.016);assert.equal(view.counters.vineNeighborChecks,checks);
const spriteA=view.byId.get(a.id);vines.accept(event('flower'));assert.equal(view.byId.get(a.id),spriteA);
now=a.createdAt+600000;vines.tick();assert.equal(view.vineLinks.size,0);assert.equal(view.snapshot().connectionHalves,0);
vines.clear();
// A synchronous event burst creates only successful views and keeps the same scene hierarchy.
const burstCreated=view.counters.created, fixedChildren=view.root.children.slice();
for(let i=0;i<1000;i++)model.accept(event('flower',0));
assert.equal(model.specimens.length,640);assert.equal(view.byId.size,640);assert.equal(view.counters.created,burstCreated+640);
assert.deepEqual(view.root.children,fixedChildren);assert.equal(textureCount,825);assert.equal(generated,2);model.clear();
for(let i=0;i<10;i++){model.seed();model.clear();assert.equal(view.byId.size,0);assert.equal(view.vineLinks.size,0);assert.equal(textureCount,825);}
view.setWeather({level:'botnet_hurricane',eventsPerMinute:10000});assert.equal(view.snapshot().particles,400);
const displayCount=live.size;for(let i=0;i<100;i++)for(const level of Object.keys(core.weatherLevels))view.setWeather({level,eventsPerMinute:10000});
assert.equal(view.snapshot().particles,400);assert.equal(live.size,displayCount);assert.equal(textureCount,825);
view.setWeather({level:'quiet',eventsPerMinute:10000});assert.equal(view.snapshot().particles,0);
for(const size of [[390,844],[1280,900]]){const fit=shared.contain(...size);assert.equal(960*fit.scale/(600*fit.scale),1.6);}
const samples=shared.frameWindow();for(let i=0;i<5000;i++)samples.add(17);assert.equal(samples.snapshot().size,240);
// Full named SSE dispatch: malformed input never closes or reopens the single source.
class Source{constructor(url){this.url=url;this.handlers={};this.closes=0;}
  addEventListener(name,handler){this.handlers[name]=handler;}
  removeEventListener(name,handler){if(this.handlers[name]===handler)delete this.handlers[name];}
  close(){this.closes++;}}
const streamModel=core.createModel(nullView,{now:()=>now,random:()=>.5});let appliedWeather=null,status='';
const stream=core.connectStream(Source,streamModel,state=>appliedWeather=state,value=>status=value);
assert.equal(stream.url,'/api/garden/events');stream.onopen();assert.equal(status,'connected');stream.onerror();assert.equal(status,'disconnected/reconnecting');
for(const data of ['bad','null','{}',JSON.stringify(event('bad'))])stream.handlers.garden({data});assert.equal(streamModel.specimens.length,0);
stream.handlers.garden({data:JSON.stringify({...event(),remoteIp:'secret'})});assert.equal(streamModel.specimens.length,1);assert.doesNotMatch(JSON.stringify(streamModel.specimens),/secret|remoteIp/);
streamModel.setPaused(true);stream.handlers.garden({data:JSON.stringify(event())});stream.handlers.weather({data:JSON.stringify({level:'rain',eventsPerMinute:100})});assert.equal(streamModel.specimens.length,1);assert.equal(appliedWeather.level,'rain');
stream.handlers.weather({data:'bad'});assert.equal(appliedWeather.level,'rain');
const queued={...stream.handlers,open:stream.onopen,error:stream.onerror};
stream.close();stream.close();assert.equal(stream.closes,1);assert.deepEqual(stream.handlers,{});
assert.equal(stream.onopen,null);assert.equal(stream.onerror,null);
streamModel.setPaused(false);
queued.open();assert.equal(status,'disconnected/reconnecting');
queued.error();queued.garden({data:JSON.stringify(event())});
queued.weather({data:JSON.stringify({level:'quiet',eventsPerMinute:0})});
assert.equal(status,'disconnected/reconnecting');assert.equal(appliedWeather.level,'rain');
assert.equal(streamModel.specimens.length,1,'closed transport ignores already queued frames');
const weedModel=core.createModel(nullView,{now:()=>now,random:()=>.5});
const weedStream=core.connectStream(Source,weedModel,()=>{},()=>{});
for(const port of [420,42069])for(const vigor of [0,1,2,3]) {
  const seenCount=String([1,2,4,10][vigor]);
  const specimenEvent={specimenType:'weed',listenPort:port,vigor,sensor:'public',seenCount};
  weedStream.handlers.garden({data:JSON.stringify(specimenEvent)});
  const specimen=weedModel.specimens.at(-1);
  assert.equal(specimen.type,'weed');assert.equal(specimen.vigor,vigor);
  assert.equal(specimen.origin.listenPort,port);assert.equal(specimen.origin.sensor,'public');assert.equal(specimen.origin.seenCount,seenCount);
  assert(!specimen.mutation && !specimen.pendingMutation,'ordinary port-mapped weed is not the port-22 collectible mutation');
}
view.destroy();assert.equal(live.size,1);assert.equal(textureCount,825);
console.log('PASS: Pixi live isolation/SSE/safe contract; production timing and placement parity; capacity/protected vigor competition; persistent views/local vine curves; bounded atlas/particles/timing; clear/seed/pause/lifecycle/resize.');
module.exports = { P, renderer, cache, live, textureCount: () => textureCount, generated: () => generated };
