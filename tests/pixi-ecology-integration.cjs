// Execute the actual Pixi entry point, controls, transport and visibility callbacks.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const h=require('./pixi-live.cjs');
(async()=>{
  let now=100000,app;
  const elements=new Map(),documentHandlers=new Map(),windowHandlers=new Map(),sources=[],canvasRegistrations=[];
  function element(id){
    if(!elements.has(id))elements.set(id,{value:id==='#weather-source'?'live':'quiet',checked:true,handlers:new Map(),textContent:id==='#garden-score'?'Score: 0':'',
      hidden:true,style:{},appendChild(){},getBoundingClientRect:()=>({left:40,top:70,width:1218,height:650}),addEventListener(name,fn){this.handlers.set(name,fn);if(id==='#test-canvas')canvasRegistrations.push(name)},removeEventListener(name){this.handlers.delete(name)}});
    return elements.get(id);
  }
  class Application{
    constructor(){app=this;this.stage=new h.P.Container();this.canvas={...element('#test-canvas'),width:1218,height:650};this.active=false;
      this.renderer={...h.renderer,screen:{width:1218,height:650},resize:(w,v,dpr)=>{this.renderer.screen={width:w,height:v};this.canvas.width=w*dpr;this.canvas.height=v*dpr}};
      this.ticker={add:fn=>this.frame=fn};}
    async init(){}start(){this.active=true}stop(){this.active=false}destroy(){this.stage.destroy({children:true})}
  }
  class Source{constructor(url){this.url=url;this.handlers=new Map();sources.push(this)}addEventListener(name,fn){this.handlers.set(name,fn)}close(){this.closed=true}}
  const doc={hidden:false,querySelector:element,body:{classList:{toggle(){}}},addEventListener:(name,fn)=>documentHandlers.set(name,fn)};
  const context={Date:{now:()=>now},Math:Object.assign(Object.create(Math),{random:()=>0}),console,document:doc,
    EventSource:Source,ResizeObserver:class{observe(){}disconnect(){}},window:{PIXI:{...h.P,Application},
      PacketGardenPixi:require('../wwwroot/pixi-stress.js'),devicePixelRatio:1,innerWidth:1280,innerHeight:1000,addEventListener:(name,fn)=>windowHandlers.set(name,fn),removeEventListener(name){windowHandlers.delete(name)}}};
  vm.createContext(context);
  for(const name of ['garden-core','garden-gnomes','garden-mutations','garden-ecology','garden-ambient','garden-interaction','garden-ui-core','pixi-live-ui','pixi-live-core','pixi-live-ecology','pixi-live-ambient','pixi-live-gnomes','pixi-live-storm','pixi-live'])vm.runInContext(fs.readFileSync(`wwwroot/${name}.js`,'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(sources.length,1);assert.equal(sources[0].url,'/api/garden/events');assert(app.active);
  const emit=(name,data)=>sources[0].handlers.get(name)({data:JSON.stringify(data)});
  const control=(id,value)=>{element(id).value=value;element(id).handlers.get('change')()};
  const click=id=>element(id).handlers.get('click')();
  const frame=ms=>{now+=ms;app.frame({lastTime:now});return element('#hud').textContent};
  const hud=()=>element('#hud').textContent;
  emit('weather',{level:'rain',eventsPerMinute:25});frame(500);assert.match(hud(),/rain \/ 25 events/);
  control('#weather-source','manual');control('#weather-level','botnet_hurricane');click('#seed');frame(500);
  assert.match(hud(),/Specimens 640\/640/);assert.match(hud(),/Grass 640\/640 · views 640/);assert.match(hud(),/Puddles 8\/8 · views 8/);
  assert.match(hud(),/Curiosities 3\/3 · views 3/);assert.match(hud(),/Amanita 3\/3 · views 3/);assert.match(hud(),/Display objects 1373/);
  const root=app.stage.children[0],grass=root.children[3].children.slice(),plants=root.children[6].children.slice();
  emit('weather',{level:'quiet',eventsPerMinute:0});frame(500);assert.match(hud(),/rain particles 400/);
  control('#weather-source','live');frame(500);assert.match(hud(),/quiet \/ 0 events/);
  assert.deepEqual(root.children[3].children,grass);assert.deepEqual(root.children[6].children,plants);
  const visitors=root.children[8].children.slice(),drops=root.children[7].children.slice();
  control('#weather-source','manual');control('#weather-level','rain');frame(500);
  assert.deepEqual(root.children[8].children,visitors);assert.deepEqual(root.children[7].children,drops);
  control('#weather-source','manual');control('#weather-level','botnet_hurricane');click('#seed');frame(500);
  // Ten hidden minutes: actual registered entry-point callbacks, no missed-tick loop.
  doc.hidden=true;documentHandlers.get('visibilitychange')();assert.equal(app.active,false);now+=600000;
  doc.hidden=false;documentHandlers.get('visibilitychange')();assert(app.active);frame(1);
  assert.match(hud(),/Puddles 0\/8 · views 0/,'expired water removed on resume without formation');
  assert.match(hud(),/Curiosities 0\/3 · views 0/);assert.match(hud(),/Amanita 0\/3 · views 0/);
  frame(14998);assert.match(hud(),/Puddles 0\/8 · views 0/);
  frame(501);assert.match(hud(),/Puddles 1\/8 · views 1/,'one future formation attempt, no catch-up burst');
  click('#clear');frame(500);assert.match(hud(),/Grass 0\/640 · views 0/);assert.match(hud(),/Puddles 0\/8 · views 0/);
  emit('garden',{specimenType:'flower',vigor:0,listenPort:53});frame(500);assert.match(hud(),/Specimens 1\/640/);assert.match(hud(),/Grass 0\/640/,'actual SSE types do not gain fake DNS grass semantics');
  emit('garden',{specimenType:'mushroom',vigor:0,listenPort:70,seenCount:'1'});frame(500);
  assert.match(hud(),/Curiosities 1\/3 · views 1/);assert.match(hud(),/Amanita 0\/3 · views 0 · pending 1/);
  doc.hidden=true;documentHandlers.get('visibilitychange')();now+=6000;assert.equal(root.children[7].children.length,0);
  doc.hidden=false;documentHandlers.get('visibilitychange')();frame(500);
  assert.match(hud(),/Amanita 1\/3 · views 1 · pending 0/,'due live source activates once on resume, never while hidden');
  frame(20000);assert.match(hud(),/Curiosities 0\/3 · views 0/);assert.match(hud(),/Amanita 0\/3 · views 0/);
  click('#seed-ambient');frame(500);assert.match(hud(),/Curiosities 3\/3 · views 3/);assert.match(hud(),/Amanita 3\/3 · views 3/);
  click('#clear');frame(500);assert.match(hud(),/Display objects 15/);assert.match(hud(),/Curiosities 0\/3 · views 0/);assert.match(hud(),/Amanita 0\/3 · views 0 · pending 0/);
  // Actual controls and scheduler: invisible pending, cap consumption, absolute lifetime, no duplicate view.
  click('#seed-pending-mutations');frame(500);assert.match(hud(),/Mutations 0\/3 · pending 4 · views 0/);
  const mutationSprites=root.children[6].children.slice(),normal=mutationSprites.map(p=>p.texture);
  frame(2499);assert.deepEqual(root.children[6].children,mutationSprites);assert.deepEqual(mutationSprites.map(p=>p.texture),normal);
  frame(1);frame(500);assert.match(hud(),/Mutations 3\/3 · pending 0 · views 3/);assert.match(hud(),/cap skips 1/);
  assert.deepEqual(root.children[6].children,mutationSprites);assert.equal(new Set(mutationSprites.slice(0,3).map(p=>p.texture)).size,1);
  frame(6500);assert.match(hud(),/Mutations 3\/3 · pending 0 · views 3/,'active sources outlive seeded ordinary expiry');
  frame(12999);assert.match(hud(),/Mutations 3\/3 · pending 0 · views 3/);frame(501);
  assert.match(hud(),/Mutations 0\/3 · pending 0 · views 0/);assert.match(hud(),/expiries 3/);
  click('#seed');click('#seed-mutations');frame(500);assert.match(hud(),/Mutations 3\/3 · pending 0 · views 3/);assert.match(hud(),/Display objects 1373/);
  click('#clear');frame(500);assert.match(hud(),/Mutations 0\/3 · pending 0 · views 0/);assert.match(hud(),/Display objects 15/);
  emit('garden',{specimenType:'redbloom',listenPort:22,vigor:0});frame(500);assert.match(hud(),/Mutations 0\/3 · pending 1 · views 0/);
  doc.hidden=true;documentHandlers.get('visibilitychange')();now+=30000;
  doc.hidden=false;documentHandlers.get('visibilitychange')();frame(500);
  assert.match(hud(),/Mutations 0\/3 · pending 0 · views 0/);assert.match(hud(),/cancellations 1/,'expired hidden source cannot activate');
  // Exercise the registered surface listener, not just a parallel test implementation.
  assert.deepEqual(canvasRegistrations,['click']);assert.equal(app.canvas.handlers.size,1);
  const hit=(x,y)=>{
    const r=app.canvas.getBoundingClientRect(),screen=app.renderer.screen;
    app.canvas.handlers.get('click')({clientX:r.left+(root.position.x+x*root.scale.x)*r.width/screen.width,
      clientY:r.top+(root.position.y+y*root.scale.y)*r.height/screen.height});
  };
  click('#clear');click('#seed');frame(500);
  const allSprites=root.children[6].children.slice(),createdViews=h.live.size;
  hit(15,15);assert.equal(element('#specimen-card').hidden,false);assert.equal(element('#specimen-card-title').textContent,'Flower');
  assert.equal(element('#specimen-source').textContent,'Simulated garden seed');assert.equal(element('#specimen-sensor').textContent,'Development controls');
  assert.equal(element('#specimen-port').textContent,'—');assert.match(element('#specimen-color').textContent,/^Pixi /);
  assert.deepEqual(root.children[6].children,allSprites);assert.equal(h.live.size,createdViews,'inspection creates no scene object');
  click('#specimen-card-close');assert.equal(element('#specimen-card').hidden,true);assert.equal(h.live.size,createdViews);
  click('#seed-pending-mutations');frame(500);hit(165,15);assert.equal(element('#specimen-mutation').textContent,'None');
  frame(3000);hit(165,15);assert.equal(element('#specimen-card').hidden,true);assert.equal(element('#collection-message').textContent,'You collected some weed. +0 points');
  click('#seed-ambient');frame(500);
  let ambientBefore=root.children[8].children.length,curiosity=root.children[8].children[0];hit(curiosity.position.x,curiosity.position.y);
  assert.equal(root.children[8].children.length,ambientBefore-1);assert.equal(root.children[7].children.length,3);
  const loose=root.children[7].children[0];hit(loose.position.x,loose.position.y);assert.equal(root.children[7].children.length,2);
  assert.equal(element('#collection-message').textContent,'You found Amanita muscaria. +0 points');assert.equal(element('#garden-score').textContent,'Score: 0');
  hit(15,15);assert.equal(element('#specimen-card').hidden,false);
  const stable=root.children[6].children.slice();
  for(const [width,height,dpr]of [[1600,600,1],[390,740,2],[1218,650,1]]){
    element('#view').getBoundingClientRect=()=>({width,height});
    app.canvas.getBoundingClientRect=()=>({left:80,top:120,width:width*.75,height:height*.75});
    context.window.devicePixelRatio=dpr;windowHandlers.get('resize')();
    hit(15,15);assert.equal(element('#specimen-card-title').textContent,'Flower');
    hit(-1,300);assert.equal(element('#specimen-card').hidden,false,'letterbox click has no action');
    assert.deepEqual(root.children[6].children,stable);assert.deepEqual(canvasRegistrations,['click']);
  }
  click('#clear');assert.equal(element('#specimen-card').hidden,true);frame(2000);assert.equal(element('#collection-message').hidden,true);
  const recentBefore=element('#recent-event-0').textContent;emit('garden',{specimenType:'flower',vigor:0,listenPort:53,sensor:'entry-point'});
  assert.match(element('#recent-event-0').textContent,/entry-point · :53 · flower/);assert.notEqual(element('#recent-event-0').textContent,recentBefore);
  element('#show-recent-activity').checked=false;element('#show-recent-activity').handlers.get('change')();assert.equal(element('#recent-activity').hidden,true);
  element('#show-recent-activity').checked=true;element('#show-recent-activity').handlers.get('change')();assert.equal(element('#recent-activity').hidden,false);
  for(const message of ['You caught a ladybug. +0 points','You collected a snail. It seems annoyed. +0 points','You caught a moth. +0 points','You found a rock. +0 points']){
    click('#seed-interaction');frame(500);
    hit(479,329);assert.equal(element('#specimen-mutation').textContent,'Collectible weed');
    hit(465,315);assert.equal(element('#collection-message').textContent,message);assert.equal(root.children[7].children.length,1);assert.equal(root.children[6].children.length,2);
    hit(465,315);assert.equal(element('#collection-message').textContent,'You found Amanita muscaria. +0 points');assert.equal(root.children[6].children.length,2);
    hit(465,315);assert.equal(element('#collection-message').textContent,'You collected some weed. +0 points');assert.equal(root.children[6].children.length,1);assert.equal(element('#specimen-card').hidden,true);
    hit(585,315);assert.equal(element('#specimen-card-title').textContent,'Mushroom');assert.equal(element('#specimen-source').textContent,'Simulated interaction fixture');
    hit(465,315);assert.equal(element('#specimen-card').hidden,true);
  }
  assert.equal(sources.length,1);
  windowHandlers.get('pagehide')({persisted:false});assert(sources[0].closed);assert.equal(app.active,false);assert.equal(app.canvas.handlers.size,0);
  console.log('PASS: actual Pixi startup/one SSE/controls/640+640+8+3+3/local clear/refill/weather ownership; ten-minute hidden ecology reconciliation; live Amanita stays pending while hidden and activates once on resume; ambient expiry/clear, no invented grass semantics, teardown.');
})().catch(error=>{console.error(error);process.exitCode=1});
