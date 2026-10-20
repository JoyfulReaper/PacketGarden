const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../wwwroot/pixi-live-storm.js'),h=require('./pixi-live.cjs');
const {start}=require('./pixi-default.cjs'),audio=require('./audio-context.cjs');
let at=0,draws=0,thunders=0,cancelled=0,changes=[];
const m=S.createModel({now:()=>at,random:()=>{draws++;return .5;},onChange:event=>changes.push(event),onThunder:()=>{thunders++;return()=>cancelled++;}});
for(const level of ['quiet','drizzle','rain','heavy_rain','hurricane','bogus']) {
  m.configure({level});assert.equal(m.nextAt,Infinity);assert.equal(m.trigger(),false);
}
m.configure({level:'botnet_thunderstorm'});assert.equal(m.nextAt,105000);
const scheduled=m.nextAt,before=draws;m.configure({level:'botnet_thunderstorm',eventsLastHour:999});assert.equal(m.nextAt,scheduled);assert.equal(draws,before);
for(at=250;at<105000;at+=250)m.tick();assert.equal(m.active,null);m.tick();assert(m.active);assert.equal(m.trigger(),false);
const event=m.active;assert.equal(event.thunderAt-at,1050);assert.equal(event.expiresAt-at,3500);
assert.equal(S.boltAlpha(event,at),0);assert.equal(S.boltAlpha(event,at+10),.9);assert.equal(S.boltAlpha(event,at+650),0);
for(let ms=0;ms<=650;ms++)assert(S.boltAlpha(event,at+ms)>=0&&S.boltAlpha(event,at+ms)<=.9);
for(let ms=61;ms<650;ms++)assert(S.boltAlpha(event,at+ms)<S.boltAlpha(event,at+ms-1),'one fading strike without strobing');
let seed=1234;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),shapes=new Set(),branches=new Set();
for(let n=0;n<1000;n++) {
  const strike=S.makeStrike(random);shapes.add(JSON.stringify(strike));branches.add(strike.branches.length);
  assert.equal(strike.points.length,11);assert.equal(strike.points[0].y,0);
  assert(strike.points.at(-1).y>=270&&strike.points.at(-1).y<=510);
  for(const path of [strike.points,...strike.branches])for(let i=1;i<path.length;i++) {
    assert(path[i].x>=20&&path[i].x<=940);assert(path[i].y>path[i-1].y&&path[i].y<=600);
  }
  assert(strike.branches.every(path=>path.length===4));
}
assert.equal(shapes.size,1000);assert.deepEqual([...branches].sort(),[0,1,2,3]);
at+=1000;m.tick();assert.equal(thunders,0);at+=250;m.tick();assert.equal(thunders,1);at+=250;m.tick();assert.equal(thunders,1);
m.configure({level:'heavy_rain'});assert.equal(m.active,null);assert.equal(cancelled,1,'weather change cancels playing thunder');assert.equal(m.nextAt,Infinity);
for(const patch of [{enabled:false},{reducedMotion:true},{hidden:true}]) {
  m.configure({level:'botnet_hurricane',enabled:true,reducedMotion:false,hidden:false});m.trigger();
  m.configure(patch);assert.equal(m.active,null);assert.equal(m.nextAt,Infinity);assert.equal(m.trigger(),false);
}
m.configure({enabled:true,reducedMotion:false,hidden:false});assert.equal(m.nextAt-at,82500);m.trigger();assert.equal(m.active.peakAlpha,1);
at+=100000;m.tick();assert.equal(m.active,null);assert.equal(thunders,1,'suspended pending thunder never replays');assert.equal(m.nextAt,at+82500);
m.trigger();const late=m.active.thunderAt+301;at=late;m.tick();assert.equal(thunders,1,'late audio is dropped without catch-up');
at=m.active.expiresAt;m.tick();assert.equal(m.active,null);assert(m.nextAt>at);
const next=m.nextAt;at=next+10000;m.tick();assert.equal(m.active,null,'missed idle deadline does not flash on resume');assert.equal(m.nextAt,at+82500);
m.trigger();m.destroy();assert.equal(m.active,null);assert.equal(m.trigger(),false);assert.equal(m.nextAt,Infinity);
let alternating=0;const varied=S.createModel({random:()=>alternating++%2,now:()=>0});
varied.configure({level:'botnet_thunderstorm'});assert.equal(varied.nextAt,60000);varied.reset();assert.equal(varied.nextAt,150000);varied.destroy();
assert.doesNotMatch(fs.readFileSync('wwwroot/pixi-live-storm.js','utf8'),/Math\.random|setTimeout|setInterval|requestAnimationFrame|EventSource|fetch\(/);
const root=new h.P.Container(),generated=h.generated(),beforeObjects=h.live.size,view=S.createView(h.P,h.renderer,root),overlay=view.overlay;
assert.equal(h.generated(),generated);assert.equal(h.live.size,beforeObjects+3);assert.equal(root.children.length,1);assert(!overlay.visible);
const visual={...event,createdAt:0};view.change(visual);
assert.equal(view.bolt.context.instructions.length,3*(1+visual.branches.length));
const geometry=JSON.stringify(view.bolt.context.instructions);
view.animate(visual,50);assert.equal(view.bolt.alpha,.9);assert(view.flash.alpha>0&&view.flash.alpha<=.035);
view.animate(visual,650);assert(!overlay.visible);
for(let cycle=0;cycle<20;cycle++){for(let ms=0;ms<3500;ms+=16)view.animate(visual,ms);
  assert.equal(JSON.stringify(view.bolt.context.instructions),geometry,'ticker never rebuilds paths');
  view.change(null);assert.equal(view.bolt.context.instructions.length,0);view.change(visual);}
assert.equal(h.generated(),generated);assert.equal(root.children[0],overlay);assert.equal(h.live.size,beforeObjects+3);
view.destroy();assert.equal(h.live.size,beforeObjects);assert.equal(root.children.length,0);root.destroy();
function soundHarness(options={}) {
  const a=audio(options),nodes=new Map();
  const element=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='#sound-volume'?'12':'',handlers:{},setAttribute(){},addEventListener(k,fn){this.handlers[k]=fn;}});return nodes.get(id);};
  const context={window:{AudioContext:options.supported===false?undefined:a.AudioContext},document:{querySelector:element},performance:{now:()=>0},Math};
  vm.createContext(context);vm.runInContext(fs.readFileSync('wwwroot/garden-audio.js','utf8'),context);
  return {...a,element,sound:vm.runInContext('gardenSound',context),toggle:()=>element('#sound-toggle').handlers.click(),
    volume:value=>{element('#sound-volume').value=String(value);element('#sound-volume').handlers.input();}};
}
(async()=>{
  const a=soundHarness();assert.equal(a.sound.maybePlayThunderSound('botnet_thunderstorm'),null);assert.equal(a.state.contexts.length,0);
  await a.toggle();const cancel=a.sound.maybePlayThunderSound('botnet_thunderstorm');
  assert.equal(a.state.contexts.length,1);assert.equal(a.state.oscillators.length,1);assert.equal(a.state.oscillators[0].frequency.value,96);
  assert.equal(a.state.sources.length,1);assert.equal(a.state.sources[0].stopTime,1.81);
  assert.equal(a.state.filters[0].frequency.value,1200);assert.equal(a.state.buffers.length,1);
  assert(a.state.buffers[0].getChannelData(0).some(v=>Math.abs(v)>.5),'finite noise contains signal');
  assert.equal(a.sound.maybePlayThunderSound('botnet_hurricane'),null,'one thunder voice pair maximum');
  a.sound.maybePlayGrowthSound('flower',0,.5);assert.equal(a.state.oscillators.length,2,'growth still plays independently');
  cancel();assert(a.state.oscillators[0].disconnected&&a.state.sources[0].disconnected&&a.state.filters[0].disconnected);
  assert(!a.state.oscillators[1].disconnected,'cancel only stops thunder');
  a.sound.maybePlayThunderSound('botnet_hurricane');assert.equal(a.state.oscillators.at(-1).frequency.value,72);
  assert.equal(a.state.sources.at(-1).stopTime,2.01);assert.equal(a.state.filters.at(-1).frequency.value,850);
  assert.equal(a.state.buffers.length,1,'noise buffer is cached across strikes');a.volume(0);
  assert(a.state.oscillators.at(-1).disconnected&&a.state.sources.at(-1).disconnected);assert.equal(a.sound.maybePlayThunderSound('botnet_hurricane'),null);
  a.volume(25);a.sound.maybePlayThunderSound('botnet_hurricane');await a.toggle();assert(a.state.sources.at(-1).disconnected);
  await a.toggle();for(const level of ['quiet','rain','heavy_rain'])assert.equal(a.sound.maybePlayThunderSound(level),null);
  a.sound.maybePlayThunderSound('botnet_thunderstorm');a.state.oscillators.at(-1).onended();a.state.sources.at(-1).onended();
  assert(a.sound.maybePlayThunderSound('botnet_hurricane'),'natural endings release thunder ownership');
  for(const options of [{supported:false},{failConstructor:true},{failResume:true},{failPlayback:true}]) {
    const failed=soundHarness(options);await failed.toggle();assert.doesNotThrow(()=>failed.sound.maybePlayThunderSound('botnet_hurricane'));
    assert.equal(failed.element('#sound-toggle').textContent,'Sound unavailable');
  }
  for(const page of ['index.html','pixi-live.html']) {
    const device=audio(),g=await start(false,{pageHtml:fs.readFileSync(`wwwroot/${page}`,'utf8'),AudioContext:device.AudioContext,captureModel:true});
    assert.deepEqual(g.errors,[]);assert(g.app.active);const storm=g.storm,root=g.app.stage.children[0],sprite=root.children.at(-1);
    const emit=data=>g.sources[0].handlers.get('weather')({data:JSON.stringify(data)});
    emit({level:'heavy_rain',eventsPerMinute:10000});assert.equal(storm.nextAt,Infinity);assert(!sprite.visible);
    emit({level:'botnet_thunderstorm',eventsPerMinute:10000,eventsLastHour:100});const nextAt=storm.nextAt,particles=root.children[9].particleChildren.slice();
    let gardenDraws=0;const random=g.context.Math.random;g.context.Math.random=()=>{gardenDraws++;return random();};
    emit({level:'botnet_thunderstorm',eventsPerMinute:10000,eventsLastHour:101});assert.equal(storm.nextAt,nextAt);assert.equal(gardenDraws,0);
    particles.forEach((p,i)=>assert.equal(root.children[9].particleChildren[i],p));
    const forced=g.element('#trigger-lightning');if(forced){forced.handlers.get('click')();assert.equal(storm.active,null,'live source cannot be forced');
      g.element('#weather-source').value='manual';g.element('#weather-source').handlers.get('change')();
      g.element('#weather-level').value='botnet_thunderstorm';g.element('#weather-level').handlers.get('change')();forced.handlers.get('click')();}
    else storm.trigger();
    assert(storm.active);g.frame(50);assert(sprite.visible&&sprite.children[1].alpha>0);assert.equal(device.state.contexts.length,0);
    const toggle=g.element('#lightning-enabled');toggle.checked=false;toggle.handlers.get('change')({target:toggle});
    assert.equal(storm.active,null);assert(!sprite.visible);assert.equal(storm.trigger(),false);
    toggle.checked=true;toggle.handlers.get('change')({target:toggle});await g.element('#sound-toggle').handlers.get('click')();storm.trigger();
    for(let i=0;i<6;i++)g.frame(250);assert.equal(device.state.oscillators.length,1);assert.equal(device.state.sources.length,1);
    g.frame(250);assert.equal(device.state.sources.length,1);
    g.doc.hidden=true;g.docHandlers.get('visibilitychange')();assert.equal(storm.active,null);assert(device.state.oscillators.every(n=>n.disconnected));
    g.advance(120000);g.doc.hidden=false;g.docHandlers.get('visibilitychange')();assert(storm.nextAt>g.context.Date.now());
    assert.equal(device.state.oscillators.length,1);assert(device.state.sources.every(n=>n.disconnected));storm.trigger();g.media.matches=true;g.media.handlers.get('change')();
    assert.equal(storm.active,null);assert(toggle.disabled);assert(!toggle.checked);assert.equal(storm.trigger(),false);
    g.media.matches=false;g.media.handlers.get('change')();assert(!toggle.disabled);assert(toggle.checked);storm.trigger();
    for(let i=0;i<6;i++)g.frame(250);assert.equal(device.state.oscillators.length,2);assert.equal(device.state.sources.length,2);
    if(forced){g.element('#weather-level').value='heavy_rain';g.element('#weather-level').handlers.get('change')();}
    else emit({level:'heavy_rain',eventsPerMinute:10000});
    assert.equal(storm.active,null);assert(device.state.oscillators.every(n=>n.disconnected));assert.equal(device.state.contexts.length,1);
    g.winHandlers.get('pagehide')({persisted:false});assert.equal(storm.trigger(),false);assert(!h.live.has(sprite));assert.equal(g.media.handlers.size,0);assert.deepEqual(g.errors,[]);
  }
  const reduced=await start(false,{reduced:true,captureModel:true});
  reduced.sources[0].handlers.get('weather')({data:JSON.stringify({level:'botnet_hurricane',eventsPerMinute:10000})});
  assert.equal(reduced.storm.nextAt,Infinity);assert(reduced.element('#lightning-enabled').disabled);assert(!reduced.element('#lightning-enabled').checked);
  reduced.winHandlers.get('pagehide')({persisted:false});
  console.log('PASS: eligible irregular storms, bounded varied top-edge bolts/branches, fast single fade/minimal wash, three persistent display objects/no textures/no per-frame geometry, cached filtered noise + body thunder, gain/mute/cancellation/failure, both pages/manual trigger/hour-only/reduced motion/hidden cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
