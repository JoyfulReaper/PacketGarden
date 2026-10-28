// Run the real default-page script order with strict DOM lookup and injected Pixi/SSE.
// These checks cover integration and ownership, not GPU presentation or FPS.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const h = require('./pixi-live.cjs');
const read = file => fs.readFileSync(`wwwroot/${file}`, 'utf8');
const html = read('index.html');
const scripts = [...html.matchAll(/<script src="([^"]+)" defer(?: data-pixi-library)?><\/script>/g)].map(match => match[1]);
const diagnosticScripts = [...read('pixi-live.html').matchAll(/<script src="([^"]+)" defer(?: data-pixi-library)?><\/script>/g)].map(match => match[1]);
const assetPath = url => url.split('?')[0];
assert.deepEqual(scripts.map(assetPath), diagnosticScripts.map(assetPath).filter(name=>!['garden-stillbloom-dev.js','garden-gnome-puddles-dev.js'].includes(name)), 'both pages use the same renderer and model order; simulations are diagnostic-only');
assert.match(html, /href="pixi-live\.css\?v=[^"]+"/, 'new homepage must bypass cached pre-promotion layout');
assert(scripts.some(url => /^pixi-live\.js\?v=.+/.test(url)), 'new homepage must bypass cached diagnostic-only startup');
assert(scripts.some(url => /^pixi-live-core\.js\?v=.+/.test(url)), 'weather normalizer must bypass cached code that drops hourly data');
for (const id of ['hud','seed','clear','seed-ambient','seed-mutations','seed-pending-mutations','seed-interaction','seed-puddles','pause','probes','probe-track','reset','weather-source','weather-level','automatic-traffic']) {
  assert(!html.includes(`id="${id}"`), `default page has no ${id} development control`);
}
assert.match(html, /href="about.html"/); assert.doesNotMatch(html, /href="canvas.html"/);
assert.match(read('about.html'), /href="index.html"/);
assert.match(read('canvas.html'), /http-equiv="refresh" content="0; url=\/"/);
assert(!scripts.includes('garden.js'));
for (const id of ['seed-broadleaf-blooms','seed-dense-broadleaf-blooms','trigger-stillbloom','stillbloom-test-status','trigger-gnomes','gnome-test-status','trigger-landscaping','trigger-overcrowding','landscaping-test-status','trigger-lightning','lightning-test-status','lighting-mode','lighting-hour','lighting-status']) assert(!html.includes(`id="${id}"`),'simulation is diagnostic-only');
for(const id of ['seed-vine-bloom-stages','seed-vine-bloom-connections','seed-vine-bloom-dense'])assert(!html.includes(`id="${id}"`),'vine fixtures are diagnostic-only');
for(const id of ['preview-gnome-sound','gnome-sound-status'])assert(!html.includes(`id="${id}"`),'audio preview is diagnostic-only');
for (const pageScripts of [scripts, diagnosticScripts]) for (const file of ['garden-audio','pixi-live-ui','pixi-live'])
  assert(pageScripts.some(url => new RegExp(`^${file}\\.js\\?v=.+`).test(url)),`${file} integration must bypass stale cached scripts`);

async function start(failInit = false, { pageHtml = html, AudioContext, captureModel = false, reduced = false, random = () => 0, competitionRandom = () => .99, terrainRandom = () => .99, frogRandom = () => .99, poppyRandom, podRandom, sporeRandom = () => .9, emissionRandom = () => .99 } = {}) {
  let now = 100000, app, observer,stillbloom;
  const pageScripts = [...pageHtml.matchAll(/<script src="([^"]+)" defer(?: data-pixi-library)?><\/script>/g)].map(match => match[1]);
  let model, garden, ambient, frogs, gnomes, storm, ecology, lighting, lightingSurface, gardenView, emissions;
  const media={matches:reduced,handlers:new Map(),addEventListener:(name,fn)=>media.handlers.set(name,fn),removeEventListener:name=>media.handlers.delete(name)};
  const elements = new Map(), docHandlers = new Map(), winHandlers = new Map(), sources = [], errors = [];
  for (const [, id] of pageHtml.matchAll(/id="([^"]+)"/g)) elements.set(`#${id}`, {
    textContent: id === 'garden-score' ? 'Score: 0' : '', hidden: ['#specimen-card','#collection-message'].includes(`#${id}`), checked: true,
    value: id === 'sound-volume' ? '12' : id === 'weather-source' ? 'live' : 'quiet', attributes: {},
    style: {}, handlers: new Map(), children: [], offsetWidth: 280, offsetHeight: 240,
    appendChild(child) { this.children.push(child); },
    getBoundingClientRect: () => ({left:40,top:70,width:1218,height:650}),
    addEventListener(name, handler) { this.handlers.set(name, handler); },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeEventListener(name) { this.handlers.delete(name); }
  });
  const element = id => elements.get(id) ?? null;
  class Application {
    constructor() {
      app = this; this.stage = new h.P.Container(); this.active = false;
      this.canvas = {width:1218,height:650,handlers:new Map(),
        getBoundingClientRect: () => ({left:40,top:70,width:1218,height:650}),
        addEventListener(name, fn) { this.handlers.set(name, fn); }, removeEventListener(name) { this.handlers.delete(name); }};
      this.renderer = {...h.renderer, screen:{width:1218,height:650}, resize:(w,v,dpr) => {
        this.renderer.screen = {width:w,height:v}; this.canvas.width = w*dpr; this.canvas.height = v*dpr;
      }};
      this.ticker = {add:fn => this.frame = fn,remove:fn=>{if(this.frame===fn)this.frame=null;}};
    }
    async init(options) { this.options = options; if (failInit) throw new Error('WebGL unavailable'); }
    start() { this.active = true; } stop() { this.active = false; }
    destroy() { this.stage.destroy({children:true}); }
  }
  class Source {
    constructor(url) { this.url = url; this.handlers = new Map(); sources.push(this); }
    addEventListener(name, fn) { this.handlers.set(name, fn); } close() { this.closed = true; }
  }
  const doc = {hidden:false, querySelector:element, currentScript:null,
    body:{classList:{toggle(){}}}, addEventListener:(name, fn) => docHandlers.set(name, fn)};
  const context = {document:doc, Date:class extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}, performance:{now:() => now}, Math:Object.assign(Object.create(Math), {random:() => random()}),
    EventSource:Source, console:{error:error => errors.push(error)},
    ResizeObserver:class {constructor(fn){observer=this;this.callback=fn;} observe(){} disconnect(){this.disconnected=true;}},
    window:{document:doc,PIXI:{...h.P,Application},AudioContext,matchMedia:()=>media,devicePixelRatio:1,innerWidth:1280,innerHeight:900,
      addEventListener:(name,fn) => winHandlers.set(name,fn), removeEventListener:name => winHandlers.delete(name)}};
  vm.createContext(context);
  for (const script of pageScripts.filter(name => !name.startsWith('vendor/'))) {
    doc.currentScript = {hasAttribute:name => name === 'data-pixi-library' && assetPath(script) === 'pixi-stress.js'};
    vm.runInContext(read(assetPath(script)), context, {filename:script});
    if (assetPath(script) === 'pixi-stress.js' && !element('#hud')) context.window.PacketGardenPixi.frameWindow = () => { throw new Error('No default-page timing collection'); };
    if (assetPath(script) === 'garden-core.js' && captureModel) {
      const create = context.window.PacketGardenCore.createGardenModel;
      context.window.PacketGardenCore.createGardenModel = (...args) => { const value=create(...args); garden ??= value; return value; };
    }
    if (assetPath(script) === 'pixi-wirefern-spores.js') {
      const create = context.window.PacketGardenWirefernSpores.createEmissionModel;
      context.window.PacketGardenWirefernSpores.createEmissionModel = options => (emissions = create({ ...options, random: emissionRandom }));
    }
    if (assetPath(script) === 'pixi-live-core.js') {
      const create = context.window.PacketGardenPixiLiveCore.createModel;
      context.window.PacketGardenPixiLiveCore.createModel = (view,options) => { gardenView=view;model = create(view,{...options,competitionRandom,terrainRandom,sporeRandom,...(poppyRandom?{poppyRandom}:{})}); return model; };
    }
    if (assetPath(script) === 'garden-ecology.js' && captureModel) {
      const create = context.window.PacketGardenEcology.createEcologyModel;
      context.window.PacketGardenEcology.createEcologyModel = (...args) => { ecology = create(...args); return ecology; };
    }
    if (assetPath(script) === 'garden-ambient.js' && captureModel) {
      const create=context.window.PacketGardenAmbient.createAmbientModel;
      context.window.PacketGardenAmbient.createAmbientModel=options=>(ambient=create({...options,...(podRandom?{podRandom}:{})}));
    }
    if(assetPath(script)==='garden-frogs.js'){
      const create=context.window.PacketGardenFrogs.createModel;
      context.window.PacketGardenFrogs.createModel=options=>(frogs=create({...options,random:frogRandom}));
    }
    if(assetPath(script)==='garden-stillbloom.js'&&captureModel){
      const create=context.window.PacketGardenStillbloom.createModel;
      context.window.PacketGardenStillbloom.createModel=(...args)=>{const model=create(...args);stillbloom??=model;return model;};
    }
    if (assetPath(script) === 'garden-gnomes.js' && captureModel) {
      const create = context.window.PacketGardenGnomes.createModel;
      context.window.PacketGardenGnomes.createModel = (...args) => { gnomes = create(...args); return gnomes; };
    }
    if (assetPath(script) === 'garden-lighting.js' && captureModel) {
      const create=context.window.PacketGardenLighting.createModel;
      context.window.PacketGardenLighting.createModel=(...args)=>(lighting=create(...args));
    }
    if (assetPath(script) === 'garden-lighting-view.js' && captureModel) {
      const create=context.window.PacketGardenLightingView.createSurface;
      context.window.PacketGardenLightingView.createSurface=(...args)=>(lightingSurface=create(...args));
    }
    if (assetPath(script) === 'pixi-live-storm.js' && captureModel) {
      const create = context.window.PacketGardenPixiStorm.createModel;
      context.window.PacketGardenPixiStorm.createModel = (...args) => { storm = create(...args); return storm; };
    }
  }
  await new Promise(resolve => setImmediate(resolve));
  return {app,doc,context,sources,errors,element,docHandlers,winHandlers,get observer(){return observer;},
    get model(){return model;},get garden(){return garden;},get ambient(){return ambient;},get frogs(){return frogs;},get stillbloom(){return stillbloom;},get gnomes(){return gnomes;},get storm(){return storm;},get ecology(){return ecology;},get lighting(){return lighting;},get lightingSurface(){return lightingSurface;},get view(){return gardenView;},get emissions(){return emissions;},media, advance(ms) { now += ms; }, frame(ms) { now += ms; app.frame({lastTime:now}); }};
}

async function checkDefault() {
  const g = await start();
  assert.deepEqual(g.errors, []); assert(g.app.active); assert.deepEqual(Array.from(g.app.options.preference), ['webgl']);
  assert.equal(g.sources.length, 1); assert.equal(g.sources[0].url, '/api/garden/events');
  assert.equal(g.element('#view').children.length, 1);
  const source = g.sources[0], root = g.app.stage.children[0], plants = root.children[6];
  const emit = (name, data) => source.handlers.get(name)({data:JSON.stringify(data)});
  const stats = () => ['#network-events-minute','#network-events-hour'].map(id => g.element(id).textContent);
  assert.deepEqual(stats(), ['Waiting…','Waiting…']);
  emit('weather', {level:'quiet',eventsPerMinute:0,eventsLastHour:null,hasSnapshot:false});
  assert.deepEqual(stats(), ['Waiting…','Waiting…'], 'fallback is not a measurement');
  emit('weather', {level:'rain',eventsPerMinute:29.8,eventsLastHour:4321,hasSnapshot:true});
  assert.deepEqual(stats(), [new Intl.NumberFormat(undefined,{maximumFractionDigits:1}).format(29.8),new Intl.NumberFormat().format(4321)]);
  const rain = root.children[9].particleChildren.slice();
  emit('weather', {level:'rain',eventsPerMinute:29.8,eventsLastHour:4322,hasSnapshot:true});
  assert.equal(g.element('#network-events-hour').textContent,new Intl.NumberFormat().format(4322));
  assert.equal(root.children[9].particleChildren.length,rain.length);
  rain.forEach((particle,i) => assert.equal(root.children[9].particleChildren[i],particle,'hourly-only changes preserve particle identity'));
  source.onerror(); assert.equal(g.element('#connection').textContent,'disconnected/reconnecting');
  assert.equal(g.element('#network-events-hour').textContent,new Intl.NumberFormat().format(4322),'disconnect retains last measurement');
  emit('weather', {level:'quiet',eventsPerMinute:0});
  assert.deepEqual(stats(), ['0','Unavailable'],'legacy snapshot has a known rate but no fabricated hourly count');
  emit('weather', {level:'quiet',eventsPerMinute:0,eventsLastHour:0});
  assert.deepEqual(stats(), ['0','0']);
  emit('weather', {level:'quiet',eventsPerMinute:0,eventsLastHour:-1});
  assert.deepEqual(stats(), ['0','Unavailable']);
  source.handlers.get('weather')({data:'bad'}); assert.deepEqual(stats(), ['0','Unavailable']);
  assert.equal(plants.children.length,0,'aggregate traffic creates no specimens');
  source.onopen(); assert.equal(g.element('#connection').textContent, 'connected');
  source.onerror(); assert.equal(g.element('#connection').textContent, 'disconnected/reconnecting');
  source.onopen();
  g.frame(5000); assert.equal(plants.children.length, 0, 'no automatic simulated specimens');
  assert.equal(root.children[3].children.length, 12, 'shared twelve distributed initial grass seeds');
  assert.equal(root.children[10].visible, false, 'no green probe');
  for (const level of ['quiet','rain','botnet_hurricane']) {
    emit('weather', {level,eventsPerMinute:10000});
    assert.match(g.element('#weather-status').textContent, new RegExp(level));
    assert.equal(root.children[9].particleChildren.length, level === 'quiet' ? 0 : level === 'rain' ? 48 : 400);
  }
  const hit = (x,y) => {
    const r = g.app.canvas.getBoundingClientRect(), screen = g.app.renderer.screen;
    g.app.canvas.handlers.get('click')({clientX:r.left+(root.position.x+x*root.scale.x)*r.width/screen.width,
      clientY:r.top+(root.position.y+y*root.scale.y)*r.height/screen.height});
  };
  emit('garden', {specimenType:'flower',listenPort:53,vigor:2,sensor:'live-test',seenCount:'18446744073709551615'});
  assert.equal(plants.children.length, 1); const flower = plants.children[0];
  for (const [width,height,dpr] of [[1600,600,1],[390,740,2],[1218,650,1]]) {
    g.element('#view').getBoundingClientRect = () => ({width,height});
    g.context.window.devicePixelRatio = dpr; g.winHandlers.get('resize')(); g.observer.callback();
    assert.equal(g.app.canvas.width, width*dpr); assert.equal(plants.children[0], flower);
    hit(flower.position.x, flower.position.y-12);
    assert.equal(g.element('#specimen-card').hidden, false);
    assert.equal(g.element('#specimen-sensor').textContent, 'live-test');
    assert.equal(g.element('#specimen-seen-count').textContent, '18446744073709551615');
  }
  g.winHandlers.get('keydown')({key:'Escape'}); assert.equal(g.element('#specimen-card').hidden, true);
  const toggle = g.element('#show-recent-activity'); toggle.checked = false; toggle.handlers.get('change')();
  assert.equal(g.element('#recent-activity').hidden,true); toggle.checked = true; toggle.handlers.get('change')();
  assert.equal(g.element('#recent-activity').hidden,false);
  assert.match(g.element('#recent-event-0').textContent, /live-test/);
  emit('garden', {specimenType:'redbloom',listenPort:22,vigor:0}); g.frame(3000);
  const mutation = plants.children[1]; hit(mutation.position.x, mutation.position.y-12);
  assert.equal(g.element('#collection-message').textContent, 'You collected some weed. +0 points');
  assert.equal(plants.children.length, 1);
  emit('garden', {specimenType:'mushroom',listenPort:70,vigor:0,seenCount:'1'}); g.frame(5000);
  const visitor = root.children[8].children[0]; hit(visitor.position.x,visitor.position.y);
  assert.equal(g.element('#collection-message').textContent,'You caught a ladybug. +0 points');
  const drop = root.children[7].children[0]; hit(drop.position.x,drop.position.y);
  assert.equal(g.element('#collection-message').textContent,'You found Amanita muscaria. +0 points');
  assert.equal(plants.children.length, 2, 'Amanita collection preserves its mushroom');
  g.doc.hidden = true; g.docHandlers.get('visibilitychange')(); assert.equal(g.app.active,false);
  g.advance(600000); g.doc.hidden = false; g.docHandlers.get('visibilitychange')();
  assert(g.app.active); assert.equal(plants.children.length,0,'resume reconciles expiry');
  assert.deepEqual(g.errors, []);
  g.winHandlers.get('pagehide')({persisted:false});
  assert(source.closed); assert(!g.app.active); assert(g.observer.disconnected); assert.equal(g.app.canvas.handlers.size,0);
  const failed = await start(true);
  assert.match(failed.element('#connection').textContent,/Garden initialization failed: WebGL unavailable/);
  assert.equal(failed.sources.length,0); assert.equal(failed.errors.length,1);
  assert.match(failed.element('#view').textContent,/PacketGarden requires WebGL/);
  assert.equal(failed.element('#view').attributes.role,'alert');
  console.log('PASS: default Pixi strict DOM/load order, no dev controls/metrics/fake traffic/probe, one SSE, weather/reconnect, inspection/collections, resize/DPR, visibility/expiry, teardown and visible WebGL failure.');
}
module.exports = { start };
if (require.main === module) checkDefault().catch(error => { console.error(error); process.exitCode = 1; });
