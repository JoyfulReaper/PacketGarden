const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const L=require('../wwwroot/garden-lighting.js'),V=require('../wwwroot/garden-lighting-view.js');
const near=(a,b,epsilon=1e-9)=>assert(Math.abs(a-b)<=epsilon,`${a} != ${b}`);
for(const [hour,phase] of [[0,'night'],[5,'night'],[6,'dawn'],[9,'day'],[12,'day'],[16,'day'],[18,'golden'],[20,'dusk'],[22,'night'],[24,'night']])
  assert.equal(L.atHour(hour).phase,phase);
for(const hour of [0,5,6,9,16,18,20,22,24]) {
  const a=L.atHour(hour-1e-5),b=L.atHour(hour+1e-5);
  a.rgb.forEach((v,i)=>near(v,b.rgb[i],1e-6));a.bias.forEach((v,i)=>near(v,b.bias[i],1e-6));
}
assert.deepEqual(L.atHour(24),L.atHour(0));assert.deepEqual(L.atHour(-1),L.atHour(23));
assert.deepEqual(L.atHour(12).rgb,[1,1,1]);assert.deepEqual(L.atHour(12).bias,[0,0,0]);
const midpoint=L.atHour(7.5);near(midpoint.rgb[0],(.91+1)/2);
const d=new Date(2026,9,20,18,30,15,500);near(L.localHour(d.getTime()),18+30/60+15/3600+500/3600000);
// Actual Date timezone interpretation, not fixed UTC or a stored offset.
const tzHour=tz=>Number(execFileSync(process.execPath,['-e',`process.stdout.write(String(require('./wwwroot/garden-lighting.js').localHour(Date.UTC(2026,0,1,12))))`],{env:{...process.env,TZ:tz},windowsHide:true}));
assert.equal(tzHour('UTC'),12);assert.equal(tzHour('America/New_York'),7);assert.equal(tzHour('Asia/Tokyo'),21);
let at=100000,hour=12,callbacks=0;
const m=L.createModel({now:()=>at,getLocalHour:()=>hour,onChange:()=>callbacks++});
assert(m.tick());assert.equal(callbacks,1);assert.equal(m.mode,'live');
at+=29999;hour=0;assert(!m.tick());assert.equal(m.state.phase,'day');
at++;assert(m.tick());assert.equal(m.state.phase,'night');
const samples=m.snapshot().samples;at+=1000000;assert(!m.tick(at,{hidden:true}));assert.equal(m.snapshot().samples,samples);
hour=18;m.tick(at,{force:true});assert.equal(m.state.phase,'golden');assert.equal(m.snapshot().samples,samples+1);
at-=3600000;hour=6;assert(m.tick());assert.equal(m.state.phase,'dawn','backwards clock is sampled immediately');
hour=20;at+=30000;m.tick();assert.equal(m.state.phase,'dusk','timezone/provider changes are read afresh');
for(const mode of Object.keys(L.presets)) {m.setMode(mode);near(m.state.hour,L.presets[mode]);}
assert(!m.setMode('bad'));assert(!m.setHour(NaN));assert(!m.setHour(24.01));assert(!m.setHour(-.01));
m.setHour(17.5);assert.equal(m.mode,'hour');near(m.state.hour,17.5);m.setHour(24);assert.equal(m.state.hour,0);
hour=7.2;m.setMode('live');near(m.state.hour,7.2);m.destroy();assert(!m.tick(at+30000));
{
  let hour=0,reads=0,at=0;
  const model=L.createModel({now:()=>at,getLocalHour:()=>{reads++;return hour;}});
  model.tick();assert.equal(model.enabled,true);assert.equal(model.state.phase,'night');
  assert(model.setEnabled(false));assert.equal(model.mode,'live');assert.equal(model.state.phase,'day');
  const samples=model.snapshot().samples,oldReads=reads;at+=3600000;hour=6;
  assert(!model.needsSample(at));assert(!model.tick());assert.equal(reads,oldReads);assert.equal(model.snapshot().samples,samples);
  assert(model.setEnabled(true));assert.equal(model.state.phase,'dawn','reenabling reads current local time immediately');
  model.setHour(18.5);model.setEnabled(false);model.setEnabled(true);assert.equal(model.state.hour,18.5,'diagnostic hour survives off/on');
  assert(!model.setEnabled('false'));model.destroy();assert(!model.setEnabled(false));
}

const matrix={setAttribute(name,value){this[name]=value;}},surface={style:{}},document={querySelector:()=>matrix};
const view=V.createSurface(document,surface);
view.apply(L.atHour(12));assert.equal(surface.style.filter,'none');
for(let i=0;i<100;i++)view.apply(L.atHour(12));assert.equal(view.snapshot().updates,1);
view.apply(L.atHour(0));assert.match(surface.style.filter,/garden-local-light/);assert.equal(matrix.values.split(' ').length,20);
const pixel=(rgb,matrix)=>rgb.map((v,i)=>Math.min(1,Math.max(0,v*matrix[i*6]+matrix[i*5+4])));
for(let hour=0;hour<24;hour+=.25)for(const weather of [0,.04,.09,.18,.26,.34]) {
  const state=L.atHour(hour),matrix=L.compose(state,weather);
  assert(matrix.every(Number.isFinite));assert.equal(matrix[18],1,'alpha stays untouched');
  const soil=pixel([.333*(1-weather),.329*(1-weather),.212*(1-weather)],matrix);
  assert(soil[0]*.2126+soil[1]*.7152+soil[2]*.0722>.16,'night storm soil retains readable luminance');
  const rain=pixel([.72,.8,.82],matrix);assert(Math.min(...rain)>.49,'rain remains legible');
  const flash=pixel([1,1,1],matrix);assert(flash.every(v=>v<=1),'lightning remains bounded');
}
assert.deepEqual(L.compose(L.atHour(12),.34),L.compose(L.atHour(12),0),'day/weather baseline unchanged');
assert(L.compose(L.atHour(0),.34)[0]>L.compose(L.atHour(0),0)[0],'night storm compensation avoids extra crushing');
view.destroy();assert.equal(surface.style.filter,'none');assert(!view.apply(L.atHour(0)));
for(const file of ['garden-lighting.js','garden-lighting-view.js'])
  assert.doesNotMatch(fs.readFileSync('wwwroot/'+file,'utf8'),/setTimeout|setInterval|requestAnimationFrame|EventSource|fetch\(|localStorage|Math.random/);
for(const page of ['index.html','pixi-live.html']) {
  const html=fs.readFileSync('wwwroot/'+page,'utf8');
  const values=html.match(/id="garden-light-matrix"[^>]*values="([^"]+)"/)[1].split(' ').map(Number);
  assert.deepEqual(values,L.compose(L.atHour(12)),'valid shared initial matrix');
  assert.equal(html.includes('id="lighting-mode"'),page==='pixi-live.html');
  assert.match(html,/id="day-night-enabled" type="checkbox" checked/);
}

async function adapters() {
  const {start}=require('./pixi-default.cjs'),h=require('./pixi-live.cjs');
  for(const reduced of [false,true])for(const page of ['index.html','pixi-live.html']) {
    const live=h.live.size,textures=h.textureCount();
    const g=await start(false,{captureModel:true,reduced,pageHtml:fs.readFileSync('wwwroot/'+page,'utf8')});
    assert.deepEqual(g.errors,[]);assert.equal(g.lighting.mode,'live');g.model.seedLandscaping('overcrowding');
    const planted=JSON.stringify(g.model.specimens),counts=JSON.stringify(g.model.counts),recent=JSON.stringify(g.model.recentEvents);
    const before=g.view.snapshot(),built=h.generated(),objects=h.live.size,textureCount=h.textureCount();
    const reference=L.createModel({now:()=>g.context.Date.now()});
    for(let i=0;i<120;i++) {
      const hour=i/5;g.lighting.setHour(hour);g.lightingSurface.apply(g.lighting.state);reference.setHour(hour);
      assert.equal(g.element('#garden-light-matrix').attributes.values,L.compose(reference.state).join(' '));
    }
    reference.destroy();assert.equal(h.generated(),built);assert.equal(h.live.size,objects);assert.equal(h.textureCount(),textureCount);
    assert.deepEqual(g.view.snapshot(),before);assert.equal(JSON.stringify(g.model.specimens),planted);
    assert.equal(JSON.stringify(g.model.counts),counts);assert.equal(JSON.stringify(g.model.recentEvents),recent);
    const toggle=g.element('#day-night-enabled');assert(toggle.checked);g.lighting.setMode('night');g.lightingSurface.apply(g.lighting.state);
    toggle.checked=false;toggle.handlers.get('change')();assert.equal(g.lighting.enabled,false);assert.equal(g.app.canvas.style.filter,'none');
    if(page==='pixi-live.html')assert(g.element('#lighting-mode').disabled&&g.element('#lighting-hour').disabled);
    toggle.checked=true;toggle.handlers.get('change')();assert.equal(g.lighting.state.phase,'night');assert.match(g.app.canvas.style.filter,/garden-local-light/);
    assert.equal(h.generated(),built);assert.equal(h.live.size,objects);
    const sampled=g.lighting.snapshot().samples;g.doc.hidden=true;g.docHandlers.get('visibilitychange')();g.advance(3600000);
    assert.equal(g.lighting.snapshot().samples,sampled);g.doc.hidden=false;g.docHandlers.get('visibilitychange')();assert.equal(g.lighting.snapshot().samples,sampled+1);
    if(page==='pixi-live.html') {
      const mode=g.element('#lighting-mode'),slider=g.element('#lighting-hour');mode.value='night';mode.handlers.get('change')();
      assert.equal(g.lighting.mode,'night');slider.value='18.5';slider.handlers.get('input')();assert.equal(g.lighting.mode,'hour');near(g.lighting.state.hour,18.5);
      mode.value='live';mode.handlers.get('change')();assert.equal(g.lighting.mode,'live');
    } else assert.equal(g.element('#lighting-mode'),null);
    let backTicks=0;const originalTick=g.model.tick;g.model.tick=(...args)=>{backTicks++;return originalTick(...args);};
    const sampledBefore=g.lighting.snapshot().samples;g.frame(-3600000);assert.equal(g.lighting.snapshot().samples,sampledBefore+1);assert.equal(backTicks,0);
    g.winHandlers.get('pagehide')({persisted:false});assert.equal(g.app.canvas.style.filter,'none');assert(!toggle.handlers.has('change'));
    const after=g.lighting.snapshot().samples;assert(!g.lighting.tick(g.context.Date.now()+30000));assert.equal(g.lighting.snapshot().samples,after);
    assert.equal(h.live.size,live);assert.equal(h.textureCount(),textures);assert.deepEqual(g.errors,[]);
  }
}
adapters().then(()=>console.log('PASS: local phases/smooth midnight/real timezones, diagnostic/live overrides, clock changes, bounded weather/bolt composition, hidden/reduced-motion parity, 640 specimens × 120 lighting changes with zero geometry/cache/model work, and teardown.'))
  .catch(error=>{console.error(error);process.exitCode=1;});
