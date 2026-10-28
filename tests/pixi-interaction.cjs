const assert=require('node:assert/strict'),fs=require('node:fs');
const h=require('./pixi-live.cjs'),core=require('../wwwroot/pixi-live-core.js'),{createView}=require('../wwwroot/pixi-live.js');
const shared=require('../wwwroot/pixi-stress.js'),A=require('../wwwroot/garden-ambient.js'),AV=require('../wwwroot/pixi-live-ambient.js');
const {createUi}=require('../wwwroot/pixi-live-ui.js'),T=require('../wwwroot/garden-ui-core.js');
let at=100000,ui,rolls=0;
const nodes=new Map(),windowHandlers=new Map();
const element=id=>{if(!nodes.has(id))nodes.set(id,{textContent:id==='garden-score'?'Score: 0':'',hidden:id==='specimen-card'||id==='collection-message',
  checked:true,style:{},offsetWidth:280,offsetHeight:240,handlers:new Map(),
  addEventListener(k,fn){this.handlers.set(k,fn)},removeEventListener(k){this.handlers.delete(k)},
  set innerHTML(value){throw Error('UI must use textContent')}});return nodes.get(id)};
const doc={querySelector:selector=>element(selector.slice(1))};
const win={innerWidth:1280,innerHeight:1000,addEventListener:(k,fn)=>windowHandlers.set(k,fn),removeEventListener:k=>windowHandlers.delete(k),
  get localStorage(){throw Error('No persistence')},get sessionStorage(){throw Error('No persistence')}};
const view=createView(h.P,{stage:new h.P.Container()},h.cache.frames,core,shared);
const cache=AV.makeAmbientAtlas(h.P,h.renderer),av=AV.createAmbientView(h.P,view.curiosityLayer,view.dropLayer,cache.frames);
const ambient=A.createAmbientModel({now:()=>at,random:()=>.5,getSpecimens:()=>garden.specimens,onChange:c=>av.change(c,at)});
const garden=core.createModel(view,{now:()=>at,random:()=>{rolls++;return .5},competitionRandom:()=>0,onRemoved:p=>{ambient.cancelSource(p);ui?.removed(p)},onActivity:()=>ui?.activity(at)});
ui=createUi({document:doc,window:win,garden,ambient,colorName:core.colorName,now:()=>at});
const score=()=>assert.equal(element('garden-score').textContent,'Score: 0');
const center=p=>({x:(p.column+.5)*30,y:(p.row+.5)*30});
const click=p=>{const result=ui.click(p,{x:500,y:500},at);score();return result};
const event=(sensor='safe',vigor=0)=>({specimenType:'broadleaf',listenPort:443,vigor,sensor,seenCount:'18446744073709551615',
  remoteIp:'SECRET_IP',remotePort:12345,payload:'SECRET_PAYLOAD',banner:'SECRET_BANNER',credentials:'SECRET_CREDENTIALS'});
garden.seed();assert.equal(garden.recentEvents.length,0);assert.equal(element('recent-activity').hidden,false);score();
const ordinary=garden.specimens[0],beforeLive=h.live.size,created=view.counters.created,destroyed=view.counters.destroyed,beforeRolls=rolls;
assert.equal(click(center(ordinary)).kind,'specimen');assert.equal(ui.inspected,ordinary);
assert.equal(element('specimen-source').textContent,'Simulated garden seed');assert.equal(element('specimen-sensor').textContent,'Development controls');
assert.equal(element('specimen-port').textContent,'—');assert.equal(element('specimen-seen-count').textContent,'—');
assert.equal(element('specimen-vigor').textContent,`${ordinary.vigor} — ${T.vigorNames[ordinary.vigor]}`);
const color=element('specimen-color').textContent;assert.match(color,/^Pixi /);
for(let i=0;i<10;i++){ui.inspect(ordinary,{x:500,y:500},at);ui.tick(at)}
assert.equal(element('specimen-color').textContent,color);assert.equal(rolls,beforeRolls);assert.equal(h.live.size,beforeLive);
element('specimen-card-close').handlers.get('click')();assert.equal(ui.inspected,null);assert.equal(h.live.size,beforeLive);
assert.equal(view.counters.created,created);assert.equal(view.counters.destroyed,destroyed);
click(center(ordinary));click(null);assert.equal(ui.inspected,ordinary,'outside/letterbox click has no action');
ui.close();garden.seedMutations(true);const pending=garden.specimens.find(p=>p.pendingMutation);
assert.equal(click(center(pending)).kind,'specimen');assert.equal(element('specimen-mutation').textContent,'None');
at+=3000;garden.tick();ui.tick(at);assert.equal(element('specimen-mutation').textContent,'Collectible weed');
const source=pending,point=center(source),sourceSprite=view.byId.get(source.id),mushroom=garden.specimens.find(p=>p.type==='mushroom');
const mushroomBefore=JSON.stringify(mushroom),otherSprites=new Map(view.byId),textures=h.textureCount(),generated=h.generated();
const visitor=type=>({type,x:point.x,y:point.y,origin:point,phase:0,direction:1,createdAt:at,expiresAt:at+20000});
ambient.seed({curiosities:['ladybug','snail','shiny_pebble'].map(visitor),drops:[visitor('amanita_muscaria'),visitor('amanita_muscaria')]});
const bottom=ambient.curiosities[0],top=ambient.curiosities[2],dropTop=ambient.drops[1],dropBottom=ambient.drops[0];
const layerOther=[...av.curiosityViews.values()].find(v=>v.item===bottom).sprite;
const textCases=[['curiosity','You found a rock. +0 points'],['curiosity','You collected a snail. It seems annoyed. +0 points'],['curiosity','You caught a ladybug. +0 points'],
  ['drop','You found Amanita muscaria. +0 points'],['drop','You found Amanita muscaria. +0 points'],['mutation','You collected some weed. +0 points']];
for(const [index,[kind,message]] of textCases.entries()){
  const countBefore=h.live.size,hit=click(point);assert.equal(hit.kind,kind);assert.equal(h.live.size,countBefore-1,'only exact collected Sprite is destroyed');
  assert.equal(element('collection-message').textContent,message);assert.equal(element('collection-message').hidden,false);
  assert.equal(garden.recentEvents.length,0,'collection creates no network activity');
  if(index===0){assert.equal(hit.object,top);assert.equal(ambient.curiosities[0],bottom);assert(h.live.has(layerOther));}
  if(index===3){assert.equal(hit.object,dropTop);assert.equal(ambient.drops[0],dropBottom);}
  if(index<5)assert.equal(ui.inspected,source,'ambient collection leaves source inspection intact');
}
assert.equal(ui.inspected,null);assert.equal(element('specimen-card').hidden,true);assert(!garden.specimens.includes(source));assert(!garden.byCell.has(source.cell));
assert(!view.byId.has(source.id));assert(!h.live.has(sourceSprite));assert.equal(JSON.stringify(mushroom),mushroomBefore);
for(const [id,sprite]of otherSprites)if(id!==source.id)assert.equal(view.byId.get(id),sprite);
assert.equal(h.textureCount(),textures);assert.equal(h.generated(),generated);
// Fourth visitor type, replacement-message deadline and exact expiry without a timer.
ambient.seed({curiosities:[visitor('moth')]});click(A.curiosityPosition(ambient.curiosities[0],at));
assert.equal(element('collection-message').textContent,'You caught a moth. +0 points');
at+=1999;ui.tick(at);assert.equal(element('collection-message').hidden,false);at++;ui.tick(at);
assert.equal(element('collection-message').hidden,true);assert.equal(element('collection-message').textContent,'');
ui.showMessage('earlier',at);at+=1000;ui.showMessage('later',at);at+=1000;ui.tick(at);assert.equal(element('collection-message').textContent,'later');
at+=1000;ui.tick(at);assert.equal(element('collection-message').hidden,true);
// Empty soil closes. Age refresh and removal/clear/replacement track the exact reference, never its cell.
click(center(ordinary));click(source ? point:{x:900,y:590});assert.equal(ui.inspected,null);
ui.inspect(ordinary,{x:1279,y:999});at+=65000;ui.tick(at);assert.equal(element('specimen-age').textContent,T.formatAge(at-ordinary.createdAt));
win.innerWidth=390;win.innerHeight=844;ui.position();assert.equal(element('specimen-card').style.left,'98px');assert.equal(element('specimen-card').style.top,'592px');
windowHandlers.get('keydown')({key:'Escape'});assert.equal(ui.inspected,null);score();
garden.seed();const victim=garden.specimens[0];garden.specimens.forEach(p=>p.vigor=3);victim.vigor=0;ui.inspect(victim,{x:0,y:0});
const replacement=garden.acceptEvent(event('replacement',1));assert.equal(replacement.outcome,'replaced');assert.equal(replacement.specimen.cell,victim.cell);assert.notEqual(replacement.specimen.id,victim.id);assert.equal(ui.inspected,null);
assert.equal(garden.recentEvents[0].outcome,'replaced');
garden.specimens.forEach(p=>p.vigor=3);
assert.equal(garden.acceptEvent(event('drop',3)).outcome,'dropped');assert.match(element('recent-event-0').textContent,/no growth$/);
garden.clear();assert.equal(garden.acceptEvent(event('<b>safe literal text</b>',2)).outcome,'spawned');
const real=garden.specimens[0];click(center(real));assert.equal(element('specimen-source').textContent,'Live TCPNoise');
assert.equal(element('specimen-sensor').textContent,'<b>safe literal text</b>');assert.equal(element('specimen-port').textContent,'443');assert.equal(element('specimen-seen-count').textContent,'18446744073709551615');
assert.equal(garden.recentEvents.length,3);assert.equal(garden.recentEvents[0].sensor,'<b>safe literal text</b>');
const snapshot=JSON.stringify(garden.recentEvents);garden.setPaused(true);assert.equal(garden.acceptEvent(event('paused')).outcome,'paused');garden.setPaused(false);
for(const invalid of [null,{},event('bad','2'),{specimenType:'unknown',listenPort:22,vigor:0}])assert.equal(garden.acceptEvent(invalid).outcome,'invalid');
assert.equal(JSON.stringify(garden.recentEvents),snapshot);
element('show-recent-activity').checked=false;element('show-recent-activity').handlers.get('change')();assert.equal(element('recent-activity').hidden,true);
garden.accept(event('hidden'));assert.equal(garden.recentEvents.length,3);assert.equal(garden.recentEvents[0].sensor,'hidden');
element('show-recent-activity').checked=true;element('show-recent-activity').handlers.get('change')();assert.equal(element('recent-activity').hidden,false);
const recent=JSON.stringify(garden.recentEvents);garden.seed();assert.equal(JSON.stringify(garden.recentEvents),recent,'bulk fixture does not become network activity');assert.equal(ui.inspected,null,'clear/refill closes immediately');
T.appendRecent(garden.recentEvents,{kind:'simulated',eventType:'http',specimenType:'broadleaf',receivedAt:at,outcome:'spawned'});ui.activity(at);
assert.equal(element('recent-event-0').textContent,'Simulated HTTP · broadleaf · now');
const expired=garden.specimens.find(p=>p.type==='redbloom');ui.inspect(expired,{x:0,y:0});at=expired.createdAt+30000;garden.tick();assert.equal(ui.inspected,null);
for(const secret of ['SECRET_IP','SECRET_PAYLOAD','SECRET_BANNER','SECRET_CREDENTIALS','remoteIp','remotePort']){
  assert(!JSON.stringify(garden.recentEvents).includes(secret));assert(!JSON.stringify(garden.specimens).includes(secret));assert(!JSON.stringify([...nodes.values()].map(n=>n.textContent)).includes(secret));
}
score();ui.destroy();assert.equal(windowHandlers.size,0);assert.equal(element('specimen-card-close').handlers.size,0);
ambient.clear();garden.clear();av.destroy();view.destroy();cache.destroy();
for(const file of ['pixi-live-ui.js','garden-ui-core.js'])assert.doesNotMatch(fs.readFileSync('wwwroot/'+file,'utf8'),/setTimeout|setInterval|localStorage|sessionStorage|AudioContext|gardenSound|garden-score/);
assert.match(fs.readFileSync('wwwroot/pixi-live.html','utf8'),/garden-audio\.js\?v=.+/);
console.log('PASS: exact priority/removal/Sprite ownership, all six messages/2s replacement, inspection/fallbacks/palette/age/close/stale cell/clear, safe bounded Recent spawn/replacement/drop/invalid/paused/toggle, zero score, constant caches, no audio implementation in UI or new timers.');
