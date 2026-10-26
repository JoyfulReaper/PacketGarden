// Actual Pixi entry points, shared synthesis and real model/UI paths with fake devices/time.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {start}=require('./pixi-default.cjs'),createAudioContext=require('./audio-context.cjs');
const html=file=>fs.readFileSync(`wwwroot/${file}`,'utf8');
const outputGain=value=>2*value**1.25;
async function setup(page,options={}) {
  const audio=createAudioContext(options);
  const g=await start(false,{pageHtml:html(page),AudioContext:options.supported===false?undefined:audio.AudioContext,captureModel:true});
  assert.deepEqual(g.errors,[]);assert(g.app.active);
  return {...g,...audio,emit:(name,data)=>g.sources[0].handlers.get(name)({data:typeof data==='string'?data:JSON.stringify(data)}),
    toggle:()=>g.element('#sound-toggle').handlers.get('click')(),
    volume:value=>{g.element('#sound-volume').value=String(value);g.element('#sound-volume').handlers.get('input')();},
    grow:(type='flower',vigor=0)=>g.sources[0].handlers.get('garden')({data:JSON.stringify({specimenType:type,
      listenPort:type==='redbloom'?22:type==='weed'?420:type==='wirefern'?23:53,vigor})})};
}
function click(g,point) {
  const root=g.app.stage.children[0],r=g.app.canvas.getBoundingClientRect(),screen=g.app.renderer.screen;
  g.app.canvas.handlers.get('click')({clientX:r.left+(root.position.x+point.x*root.scale.x)*r.width/screen.width,
    clientY:r.top+(root.position.y+point.y*root.scale.y)*r.height/screen.height});
}
const center=p=>({x:(p.column+.5)*30,y:(p.row+.5)*30});
async function check(page) {
  const g=await setup(page),s=g.state,voices=()=>s.oscillators.length;
  assert.equal(g.element('#sound-toggle').textContent,'Sound: Off');assert.equal(g.element('#sound-volume').value,'12');
  g.grow();assert.equal(s.contexts.length,0);assert.equal(g.model.specimens.length,1);
  await g.toggle();assert.equal(s.contexts.length,1);assert.equal(s.gains[0].gain.value,outputGain(.12));
  assert.equal(s.compressors.length,1);
  g.volume(25);assert.equal(s.gains[0].gain.value,outputGain(.25));g.model.clear();
  for(const [type,frequency,wave,count] of [['flower',660,'sine',1],['mushroom',180,'triangle',1],['broadleaf',262,'triangle',1],
    ['vine',220,'triangle',2],['wirefern',220,'triangle',2],['redbloom',440,'sine',2],['weed',146,'triangle',2],
    ['ghostbloom',784,'sine',3],['crystalfungus',1046,'sine',3],['blackthorn',196,'triangle',6]]) {
    g.advance(1000);const before=voices();g.grow(type);
    assert.equal(voices()-before,count,type);assert.equal(s.oscillators[before].frequency.value,frequency*.98);
    assert.equal(s.oscillators[before].type,wave);
  }
  g.advance(1000);g.grow();let count=voices();g.advance(399);g.grow();assert.equal(voices(),count);
  g.advance(1);g.grow();assert.equal(voices(),++count,'400ms ordinary boundary');
  g.advance(1);g.grow('ghostbloom');count+=3;assert.equal(voices(),count,'rare bypasses ordinary cooldown');
  g.advance(899);g.grow('crystalfungus');assert.equal(voices(),count);
  g.advance(1);g.grow('crystalfungus');count+=3;assert.equal(voices(),count,'900ms rare boundary');
  for(const bad of ['{','null','{}',{specimenType:'nope',listenPort:53,vigor:0}]) g.emit('garden',bad);
  g.model.setPaused(true);g.advance(1000);g.grow();g.model.setPaused(false);assert.equal(voices(),count);
  g.sources[0].onerror();g.sources[0].onopen();g.emit('weather',{level:'botnet_hurricane',eventsPerMinute:10000,eventsLastHour:4000});
  assert.equal(voices(),count,'invalid/paused/reconnect/weather are silent');
  g.model.seed();assert.equal(voices(),count,'dense seeding is silent');g.model.specimens.forEach(p=>p.vigor=3);
  g.grow('ghostbloom',3);assert.equal(voices(),count,'saturated dropped event is silent');
  g.model.specimens.find(p=>p.type==='flower').vigor=0;g.grow('weed',1);
  count+=2;assert.equal(voices(),count,'successful replacement uses ordinary weed tone');assert.equal(g.model.counts.replacements,1);
  for(let i=0;i<120;i++)g.frame(1000/60);
  assert.equal(voices(),count,'ticker/aging/animation never requests audio');
  g.winHandlers.get('resize')();g.observer.callback();assert.equal(voices(),count,'resize is silent');
  if(g.element('#seed')) {
    for(const id of ['#seed','#seed-ambient','#seed-mutations','#seed-pending-mutations','#seed-interaction'])g.element(id).handlers.get('click')();
    assert.equal(voices(),count,'all development fixture buttons are silent');
    const point=center(g.model.specimens[0]);
    click(g,point);assert.equal(voices(),++count);assert.match(g.element('#collection-message').textContent,/You caught a ladybug/);
    click(g,point);assert.equal(voices(),++count);assert.match(g.element('#collection-message').textContent,/Amanita muscaria/);
    const remove=g.model.remove;g.model.remove=()=>null;click(g,point);assert.equal(voices(),count,'failed removal is silent');g.model.remove=remove;
    click(g,point);assert.equal(voices(),++count);assert.match(g.element('#collection-message').textContent,/You collected some weed/);
    click(g,point);assert.equal(voices(),count,'already collected object is silent');
    click(g,center(g.model.specimens[0]));assert.equal(voices(),count,'ordinary inspection is silent');
    assert.equal(g.element('#specimen-card').hidden,false);assert.equal(g.element('#garden-score').textContent,'Score: 0');
    assert.equal(s.oscillators.at(-1).frequency.value,392);assert.equal(s.oscillators.at(-1).stopTime,.09);
    assert.equal(s.gains.at(-1).gain.events.find(e=>e[0]==='linear')[1],.045,'unchanged quiet collection envelope');
  }
  await g.toggle();assert.equal(s.gains[0].gain.value,0,'Off immediately mutes scheduled nodes');g.advance(1000);g.grow();assert.equal(voices(),count);
  g.volume(50);assert.equal(s.gains[0].gain.value,0);await g.toggle();assert.equal(s.gains[0].gain.value,outputGain(.5));
  g.volume(0);g.advance(1000);g.grow('blackthorn');assert.equal(voices(),count,'zero volume schedules no tones');
  if(g.element('#seed-interaction')) {
    g.element('#seed-interaction').handlers.get('click')();click(g,center(g.model.specimens[0]));
    assert.match(g.element('#collection-message').textContent,/You collected a snail/);assert.equal(voices(),count,'zero-volume collection still succeeds silently');
  }
  for(let i=0;i<10;i++)await g.toggle();assert.equal(s.contexts.length,1,'rapid toggles reuse one context');
  assert(s.oscillators.every(o=>o.stopTime>o.startTime&&o.stopTime<=.6));
  s.oscillators[0].onended();assert(s.oscillators[0].disconnected&&s.gains[2].disconnected);
  assert.deepEqual(g.errors,[]);g.winHandlers.get('pagehide')({persisted:false});
  for(const options of [{supported:false},{failConstructor:true},{failResume:true},{failPlayback:true}]) {
    const failed=await setup(page,options);await failed.toggle();failed.grow();
    assert.equal(failed.model.specimens.length,1);assert.equal(failed.element('#sound-toggle').textContent,'Sound unavailable');
    failed.advance(1000);failed.grow('ghostbloom');assert.equal(failed.model.specimens.length,2);assert.deepEqual(failed.errors,[]);
    // A failing collection device cannot undo successful removal or its message.
    if(options.failPlayback&&failed.element('#seed-interaction')) {
      failed.state.failPlayback=false;await failed.toggle();
      failed.element('#seed-interaction').handlers.get('click')();failed.state.failPlayback=true;
      click(failed,center(failed.model.specimens[0]));assert.match(failed.element('#collection-message').textContent,/You caught/);
      assert.equal(failed.app.stage.children[0].children[8].children.length,0);
    }
    failed.winHandlers.get('pagehide')({persisted:false});
  }
  const pending=await setup(page,{deferredResume:true});const enabling=pending.toggle();pending.grow();
  assert.equal(pending.state.oscillators.length,0);await pending.toggle();pending.state.finishResume();await enabling;
  assert.equal(pending.state.gains[0].gain.value,0);assert.equal(pending.state.contexts.length,1);
  assert.equal(pending.element('#sound-toggle').textContent,'Sound: Off');pending.winHandlers.get('pagehide')({persisted:false});
}
(async()=>{
  for(const page of ['index.html','pixi-live.html'])await check(page);
  const noControls=html('index.html').replace(/<button id="sound-toggle"[^>]*>[^<]*<\/button>/,'').replace(/<input id="sound-volume"[^>]*>/,'');
  const g=await start(false,{pageHtml:noControls});assert(g.app.active);assert.deepEqual(g.errors,[]);g.winHandlers.get('pagehide')({persisted:false});
  console.log('PASS: both Pixi entry points retain existing sound identities/volume/cooldowns; one opt-in context, successful growth/replacement/collections only, silent fixtures/inspection/ticker/resize, failure/race/zero/missing-controls safety.');
})().catch(error=>{console.error(error);process.exitCode=1;});
