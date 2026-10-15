// Execute the actual Pixi entry point, controls, transport and visibility callbacks.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const h=require('./pixi-live.cjs');
(async()=>{
  let now=100000,app;
  const elements=new Map(),documentHandlers=new Map(),windowHandlers=new Map(),sources=[];
  function element(id){
    if(!elements.has(id))elements.set(id,{value:id==='#weather-source'?'live':'quiet',checked:true,handlers:new Map(),textContent:'',
      appendChild(){},getBoundingClientRect:()=>({width:1218,height:650}),addEventListener(name,fn){this.handlers.set(name,fn)}});
    return elements.get(id);
  }
  class Application{
    constructor(){app=this;this.stage=new h.P.Container();this.canvas={width:1218,height:650};this.active=false;
      this.renderer={...h.renderer,screen:{width:1218,height:650},resize:(w,v)=>{this.renderer.screen={width:w,height:v}}};
      this.ticker={add:fn=>this.frame=fn};}
    async init(){}start(){this.active=true}stop(){this.active=false}destroy(){this.stage.destroy({children:true})}
  }
  class Source{constructor(url){this.url=url;this.handlers=new Map();sources.push(this)}addEventListener(name,fn){this.handlers.set(name,fn)}close(){this.closed=true}}
  const doc={hidden:false,querySelector:element,body:{classList:{toggle(){}}},addEventListener:(name,fn)=>documentHandlers.set(name,fn)};
  const context={Date:{now:()=>now},Math:Object.assign(Object.create(Math),{random:()=>0}),console,document:doc,
    EventSource:Source,ResizeObserver:class{observe(){}disconnect(){}},window:{PIXI:{...h.P,Application},
      PacketGardenPixi:require('../wwwroot/pixi-stress.js'),devicePixelRatio:1,addEventListener:(name,fn)=>windowHandlers.set(name,fn),removeEventListener(){}}};
  vm.createContext(context);
  for(const name of ['garden-core','garden-ecology','garden-ambient','pixi-live-core','pixi-live-ecology','pixi-live-ambient','pixi-live'])vm.runInContext(fs.readFileSync(`wwwroot/${name}.js`,'utf8'),context);
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
  assert.match(hud(),/Curiosities 3\/3 · views 3/);assert.match(hud(),/Amanita 3\/3 · views 3/);assert.match(hud(),/Display objects 1372/);
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
  click('#clear');frame(500);assert.match(hud(),/Display objects 14/);assert.match(hud(),/Curiosities 0\/3 · views 0/);assert.match(hud(),/Amanita 0\/3 · views 0 · pending 0/);
  windowHandlers.get('pagehide')({persisted:false});assert(sources[0].closed);assert.equal(app.active,false);
  console.log('PASS: actual Pixi startup/one SSE/controls/640+640+8+3+3/local clear/refill/weather ownership; ten-minute hidden ecology reconciliation; live Amanita stays pending while hidden and activates once on resume; ambient expiry/clear, no invented grass semantics, teardown.');
})().catch(error=>{console.error(error);process.exitCode=1});
