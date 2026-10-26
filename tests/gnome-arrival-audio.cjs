const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../wwwroot/garden-core.js'),G=require('../wwwroot/garden-gnomes.js'),audio=require('./audio-context.cjs');
function sound(options={}){
  const a=audio(options),elements=new Map(),element=id=>{
    if(!elements.has(id))elements.set(id,{value:'12',handlers:{},setAttribute(){},addEventListener(k,fn){this.handlers[k]=fn;}});
    return elements.get(id);
  };
  const document={querySelector:element,hidden:false};
  const sandbox={window:{AudioContext:a.AudioContext,document},document};vm.createContext(sandbox);
  if(options.failFilter)a.AudioContext.prototype.createBiquadFilter=()=>{throw Error('Filter unavailable');};
  vm.runInContext(fs.readFileSync('wwwroot/garden-audio.js','utf8'),sandbox);
  return {...a,run:code=>vm.runInContext(code,sandbox),toggle:()=>element('#sound-toggle').handlers.click(),
    volume:value=>{element('#sound-volume').value=String(value);element('#sound-volume').handlers.input();},hidden:value=>{document.hidden=value;}};
}
for(const mode of ['dispute','vine','overcrowding','weed_harvest']){
  let at=100000;const cues=[],garden=core.createGardenModel({now:()=>at});
  const fill=(type,count)=>garden.seed(Array.from({length:count},(_,i)=>({type,column:i%32,row:Math.floor(i/32),createdAt:at-65000,colorVariant:0})),at);
  const m=G.createModel({garden,getSpecimens:()=>garden.specimens,now:()=>at,onCue:stage=>cues.push(stage)});
  const start=()=>mode==='dispute'?m.start(at,()=>.5):m.startLandscaping(at,()=>.5,mode);
  assert(!start());assert.deepEqual(cues,[],'failed eligibility is silent');
  fill(mode==='vine'?'vine':mode==='weed_harvest'?'weed':'broadleaf',mode==='overcrowding'?640:40);
  assert(start());assert.deepEqual(cues,['arrival']);assert(!start());
  for(let n=0;n<4;n++){at+=250;m.tick(at,()=>.99);m.advance(at);}
  m.suspend(at);m.resetCadence(at);m.advance(at);assert.deepEqual(cues,['arrival'],'ticks/updates/resume never arrive again');m.clear();
  if(mode!=='dispute'){assert(!start(),'shared cooldown');assert.deepEqual(cues,['arrival']);}
}
{
  let at=100000;const cues=[],specimens=Array.from({length:30},()=>({type:'broadleaf',createdAt:at}));
  const m=G.createModel({now:()=>at,getSpecimens:()=>specimens,onCue:stage=>cues.push(stage)});
  at+=45000;m.tick(at,()=>.02);assert.deepEqual(cues,[],'failed probability');m.start(at,()=>.5);
  m.advance(at+3000);m.advance(at+4000);m.advance(at+7000);m.advance(at+8000);assert.deepEqual(cues,['arrival','battle','victory']);
}
(async()=>{
  const s=sound(),st=s.state,play=()=>s.run("gardenSound.maybePlayGnomeSound('arrival')");
  assert.equal(play(),'disabled');assert.equal(st.contexts.length,0);assert.equal(st.resumes,0);
  await s.toggle();assert.equal(st.contexts.length,1);assert.equal(st.resumes,1);
  s.volume(0);assert.equal(play(),'muted');assert.equal(st.oscillators.length,0);s.volume(12);
  const baselineGains=st.gains.length;
  for(let incident=0;incident<100;incident++){
    const n=st.oscillators.length,f=st.filters.length,g=st.gains.length;assert.equal(play(),'played');assert.equal(play(),'busy');
    assert.equal(st.oscillators.length,n+2,'duplicate overlap is bounded');assert.equal(st.filters.length,f+2);
    const voices=st.oscillators.slice(n),filters=st.filters.slice(f),envelopes=st.gains.slice(g);
    assert.equal(voices[0].type,'triangle');assert.equal(voices[1].type,'sawtooth');
    assert.equal(voices[1].stopTime,.55);assert.equal(filters[0].type,'peaking');assert.equal(filters[0].gain.value,9);
    assert.equal(envelopes[0].gain.events.filter(v=>v[0]==='linear').length,3,'held vowel and gentle decay');
    assert(envelopes.every(e=>e.gain.events.find(v=>v[0]==='linear')[1]<=.13));
    voices[0].onended();play();assert.equal(st.oscillators.length,n+2,'partially ended sequence still guards overlap');
    voices[1].onended();assert([...voices,...filters,...envelopes].every(n=>n.disconnected));
    st.contexts[0].currentTime=0;
  }
  assert.equal(st.oscillators.filter(n=>!n.disconnected).length,0);assert.equal(st.filters.filter(n=>!n.disconnected).length,0);
  assert.equal(st.gains.filter(n=>!n.disconnected).length,baselineGains);assert.equal(st.contexts.length,1);
  play();s.volume(0);assert(st.oscillators.every(n=>n.disconnected));assert(st.filters.every(n=>n.disconnected));
  s.volume(12);play();await s.toggle();assert(st.oscillators.every(n=>n.disconnected));play();
  assert.equal(st.resumes,1,'cue never resumes context');
  s.hidden(true);await s.toggle();assert.equal(play(),'hidden');s.hidden(false);
  assert.equal(play(),'played');s.run('gardenSound.cancelGnomeArrival()');assert(st.oscillators.every(n=>n.disconnected));
  const failure=sound({failPlayback:true});await failure.toggle();assert.doesNotThrow(()=>failure.run("gardenSound.maybePlayGnomeSound('arrival')"));
  assert.equal(failure.state.resumes,1);assert(failure.state.gains.slice(3).every(n=>n.disconnected));
  const unavailable=sound({failResume:true});await unavailable.toggle();unavailable.run("gardenSound.maybePlayGnomeSound('arrival')");assert.equal(unavailable.state.oscillators.length,0);
  const partial=sound({failFilter:true});await partial.toggle();partial.run("gardenSound.maybePlayGnomeSound('arrival')");
  assert(partial.state.oscillators.every(n=>n.disconnected),'partially constructed voices are released');
  const suspended=sound();await suspended.toggle();suspended.state.contexts[0].state='suspended';
  assert.equal(suspended.run("gardenSound.maybePlayGnomeSound('arrival')"),'suspended');assert.equal(suspended.state.resumes,1);assert.equal(suspended.state.oscillators.length,0);
  assert.doesNotMatch(fs.readFileSync('wwwroot/garden-audio.js','utf8'),/speechSynthesis|SpeechSynthesisUtterance|fetch\(|setTimeout|setInterval/);
  console.log('PASS: all four successful incident arrivals, failures/ticks/resume/cooldown silence, original phase cues, Off/mute/autoplay/hidden/device status, two voices/filters over .55s, 100 cycles and cancellation with zero remaining transient nodes.');
})().catch(e=>{console.error(e);process.exitCode=1});
