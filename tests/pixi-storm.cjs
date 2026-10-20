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
assert.equal(S.glowAlpha(event,at),0);assert.equal(S.glowAlpha(event,at+1100),.14);assert.equal(S.glowAlpha(event,at+2200),0);
for(let ms=0;ms<=2200;ms++)assert(S.glowAlpha(event,at+ms)>=0&&S.glowAlpha(event,at+ms)<=.14);
at+=1000;m.tick();assert.equal(thunders,0);at+=250;m.tick();assert.equal(thunders,1);at+=250;m.tick();assert.equal(thunders,1);
m.configure({level:'heavy_rain'});assert.equal(m.active,null);assert.equal(cancelled,1,'weather change cancels playing thunder');assert.equal(m.nextAt,Infinity);
for(const patch of [{enabled:false},{reducedMotion:true},{hidden:true}]) {
  m.configure({level:'botnet_hurricane',enabled:true,reducedMotion:false,hidden:false});m.trigger();
  m.configure(patch);assert.equal(m.active,null);assert.equal(m.nextAt,Infinity);assert.equal(m.trigger(),false);
}
m.configure({enabled:true,reducedMotion:false,hidden:false});assert.equal(m.nextAt-at,82500);m.trigger();assert.equal(m.active.peakAlpha,.20);
at+=100000;m.tick();assert.equal(m.active,null);assert.equal(thunders,1,'suspended pending thunder never replays');assert.equal(m.nextAt,at+82500);
m.trigger();const late=m.active.thunderAt+301;at=late;m.tick();assert.equal(thunders,1,'late audio is dropped without catch-up');
at=m.active.expiresAt;m.tick();assert.equal(m.active,null);assert(m.nextAt>at);
const next=m.nextAt;at=next+10000;m.tick();assert.equal(m.active,null,'missed idle deadline does not flash on resume');assert.equal(m.nextAt,at+82500);
m.trigger();m.destroy();assert.equal(m.active,null);assert.equal(m.trigger(),false);assert.equal(m.nextAt,Infinity);
let alternating=0;const varied=S.createModel({random:()=>alternating++%2,now:()=>0});
varied.configure({level:'botnet_thunderstorm'});assert.equal(varied.nextAt,60000);varied.reset();assert.equal(varied.nextAt,150000);varied.destroy();
assert.doesNotMatch(fs.readFileSync('wwwroot/pixi-live-storm.js','utf8'),/Math\.random|setTimeout|setInterval|requestAnimationFrame|EventSource|fetch\(/);
let textureDestroyed=false,textureOptions;
const renderer={generateTexture(options){textureOptions=options;const texture=h.renderer.generateTexture(options);
  return {...texture,destroy(source){assert.equal(source,true);textureDestroyed=true;}};}};
const root=new h.P.Container(),generated=h.generated(),view=S.createView(h.P,renderer,root),sprite=view.sprite;
assert.equal(h.generated(),generated+1);assert.equal(root.children.length,1);assert(!sprite.visible);
assert.deepEqual([textureOptions.frame.width,textureOptions.frame.height,textureOptions.resolution],[256,128,1]);
const visual={...event,createdAt:0};view.change(visual);
for(let cycle=0;cycle<20;cycle++){for(let ms=0;ms<3500;ms+=16) view.animate(visual,ms);view.change(null);view.change(visual);}
assert.equal(h.generated(),generated+1);assert.equal(root.children[0],sprite);assert(!textureDestroyed);
view.destroy();assert(textureDestroyed);assert.equal(root.children.length,0);root.destroy();
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
  assert.equal(a.state.contexts.length,1);assert.equal(a.state.oscillators.length,2);assert.deepEqual(a.state.oscillators.map(n=>n.frequency.value),[56,79]);
  assert(a.state.oscillators.every(n=>n.type==='triangle'&&n.stopTime===1.61));
  assert.equal(a.sound.maybePlayThunderSound('botnet_hurricane'),null,'one thunder voice pair maximum');
  a.sound.maybePlayGrowthSound('flower',0,.5);assert.equal(a.state.oscillators.length,3,'growth still plays independently');
  cancel();assert(a.state.oscillators.slice(0,2).every(n=>n.disconnected));assert(!a.state.oscillators[2].disconnected,'cancel only stops thunder');
  a.sound.maybePlayThunderSound('botnet_hurricane');assert.deepEqual(a.state.oscillators.slice(-2).map(n=>n.frequency.value),[40,58]);
  assert(a.state.oscillators.slice(-2).every(n=>n.stopTime===1.91));a.volume(0);
  assert(a.state.oscillators.slice(-2).every(n=>n.disconnected));assert.equal(a.sound.maybePlayThunderSound('botnet_hurricane'),null);
  a.volume(25);a.sound.maybePlayThunderSound('botnet_hurricane');await a.toggle();assert(a.state.oscillators.slice(-2).every(n=>n.disconnected));
  await a.toggle();for(const level of ['quiet','rain','heavy_rain'])assert.equal(a.sound.maybePlayThunderSound(level),null);
  a.sound.maybePlayThunderSound('botnet_thunderstorm');for(const node of a.state.oscillators.slice(-2))node.onended();
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
    assert(storm.active);g.frame(1100);assert(sprite.alpha>0&&sprite.alpha<=.14);assert.equal(device.state.contexts.length,0);
    const toggle=g.element('#lightning-enabled');toggle.checked=false;toggle.handlers.get('change')({target:toggle});
    assert.equal(storm.active,null);assert(!sprite.visible);assert.equal(storm.trigger(),false);
    toggle.checked=true;toggle.handlers.get('change')({target:toggle});await g.element('#sound-toggle').handlers.get('click')();storm.trigger();
    for(let i=0;i<6;i++)g.frame(250);assert.equal(device.state.oscillators.length,2);g.frame(250);assert.equal(device.state.oscillators.length,2);
    g.doc.hidden=true;g.docHandlers.get('visibilitychange')();assert.equal(storm.active,null);assert(device.state.oscillators.every(n=>n.disconnected));
    g.advance(120000);g.doc.hidden=false;g.docHandlers.get('visibilitychange')();assert(storm.nextAt>g.context.Date.now());
    assert.equal(device.state.oscillators.length,2);storm.trigger();g.media.matches=true;g.media.handlers.get('change')();
    assert.equal(storm.active,null);assert(toggle.disabled);assert(!toggle.checked);assert.equal(storm.trigger(),false);
    g.media.matches=false;g.media.handlers.get('change')();assert(!toggle.disabled);assert(toggle.checked);storm.trigger();
    for(let i=0;i<6;i++)g.frame(250);assert.equal(device.state.oscillators.length,4);
    if(forced){g.element('#weather-level').value='heavy_rain';g.element('#weather-level').handlers.get('change')();}
    else emit({level:'heavy_rain',eventsPerMinute:10000});
    assert.equal(storm.active,null);assert(device.state.oscillators.every(n=>n.disconnected));assert.equal(device.state.contexts.length,1);
    g.winHandlers.get('pagehide')({persisted:false});assert.equal(storm.trigger(),false);assert(!h.live.has(sprite));assert.equal(g.media.handlers.size,0);assert.deepEqual(g.errors,[]);
  }
  const reduced=await start(false,{reduced:true,captureModel:true});
  reduced.sources[0].handlers.get('weather')({data:JSON.stringify({level:'botnet_hurricane',eventsPerMinute:10000})});
  assert.equal(reduced.storm.nextAt,Infinity);assert(reduced.element('#lightning-enabled').disabled);assert(!reduced.element('#lightning-enabled').checked);
  reduced.winHandlers.get('pagehide')({persisted:false});
  console.log('PASS: storm-only irregular schedule/independent RNG/single sequence/smooth bounded glow, one cached Sprite/texture, delayed opt-in thunder/mute/zero/cancellation/failure, both entry points/manual trigger/hour-only stability/reduced motion/hidden cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
