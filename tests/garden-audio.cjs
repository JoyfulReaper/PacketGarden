// Web Audio scheduling checks; no device, real-time sleeps, or audible playback required.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const outputGain = value => 2 * value ** 1.25;

function createGarden(options = {}) {
  const {state,AudioContext}=require('./audio-context.cjs')(options),elements=new Map();
  const volume=fs.readFileSync('wwwroot/index.html','utf8').match(/id="sound-volume"[^>]*value="([^"]+)"/)[1];
  const element=selector=>{if(!elements.has(selector))elements.set(selector,{value:volume,handlers:{},attributes:{},
    addEventListener(name,handler){this.handlers[name]=handler;},setAttribute(name,value){this.attributes[name]=value;}});return elements.get(selector);};
  const sandbox={document:{querySelector:element},window:{},performance:{now:()=>state.now},Math:Object.create(Math)};
  if(options.supported!==false)sandbox.window.AudioContext=AudioContext;sandbox.Math.random=()=>.5;
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync('wwwroot/garden-audio.js','utf8'),sandbox);
  const run=code=>vm.runInContext(code,sandbox),core=require('../wwwroot/garden-core.js'),pixi=require('../wwwroot/pixi-live-core.js');
  const model=core.createGardenModel({now:()=>state.now,random:()=>.5});
  sandbox.columns=32;sandbox.rows=20;sandbox.gardenState={};
  Object.defineProperty(sandbox.gardenState,'specimens',{get:()=>model.specimens,set:entries=>model.seed(entries)});
  class Source {constructor(){this.handlers={};}addEventListener(name,fn){this.handlers[name]=fn;}close(){}
    emit(data){this.handlers.garden({data:typeof data==='string'?data:JSON.stringify(data)});}}
  const source=pixi.connectStream(Source,{accept(raw){const result=model.addEvent(raw);if(result)run('gardenSound.maybePlayGrowthSound('+JSON.stringify(result.specimen.type)+')');}},()=>{},()=>{});
  const grow=(type,time=state.now)=>{state.now=time;source.emit({specimenType:type,listenPort:type==='redbloom'?22:443,vigor:0});};
  return {state,element,run,grow,source,toggle:()=>element('#sound-toggle').handlers.click()};
}

module.exports=async function checkAudio() {
  const garden=createGarden(), {state,element,run,grow}=garden;
  assert.equal(element('#sound-toggle').textContent,'Sound: Off');
  assert.equal(element('#sound-toggle').attributes['aria-pressed'],'false');
  assert.equal(state.contexts.length,0,'loading does not create AudioContext');
  assert.equal(Number(element('#sound-volume').value),12,'low default volume');
  grow('flower'); assert.equal(state.contexts.length,0,'muted growth never initializes audio');
  await garden.toggle();
  assert.equal(state.contexts.length,1); assert.equal(state.resumes,1);
  assert.equal(element('#sound-toggle').textContent,'Sound: On');
  const master=state.gains[0]; assert.equal(master.gain.value,outputGain(.12));
  assert.equal(state.compressors.length,1);assert.equal(state.compressors[0].threshold.value,-6);
  assert.equal(state.compressors[0].ratio.value,12);
  assert.equal(state.gains[1].gain.value,.75,'post-compressor output headroom');
  element('#sound-volume').value='25'; element('#sound-volume').handlers.input();
  assert.equal(master.gain.value,outputGain(.25)); assert.equal(state.contexts.length,1,'volume reuses context');

  grow('flower',0); assert.equal(state.oscillators.length,1,'ordinary flower has one pluck');
  const specimens=run('gardenState.specimens.length');
  grow('flower',399); assert.equal(state.oscillators.length,1,'ordinary cooldown suppresses audio');
  assert.equal(run('gardenState.specimens.length'),specimens+1,'cooldown does not suppress growth');
  grow('flower',400); assert.equal(state.oscillators.length,2,'ordinary boundary is inclusive');
  grow('ghostbloom',401); assert.equal(state.oscillators.length,5,'rare flourish breaks ordinary cooldown');
  assert.deepEqual(state.oscillators.slice(-3).map(o=>o.startTime),[0,0.1,0.2],'one composed rare chime');
  grow('crystalfungus',1300); assert.equal(state.oscillators.length,5,'rare cooldown is independent');
  grow('crystalfungus',1301); assert.equal(state.oscillators.length,8,'rare boundary is inclusive');
  grow('weed',1701); assert.equal(state.oscillators.length,10,'weed uses one rough pluck with overtone');
  assert(state.oscillators.slice(-2).every(o=>o.startTime===0),'weed is not a rare chime');
  grow('redbloom',2101); assert.equal(state.oscillators.length,12,'redbloom has a knock/ping identity');
  assert(state.oscillators.slice(-2).every(o=>o.startTime===0),'redbloom is not a random rare flourish');
  grow('blackthorn',2201); assert.equal(state.oscillators.length,18,'blackthorn rare chime includes overtone');
  assert.deepEqual([...new Set(state.oscillators.slice(-6).map(o=>o.startTime))],[0,0.1,0.2]);
  assert(state.oscillators.every(o=>Number.isFinite(o.stopTime) && o.stopTime>o.startTime && o.stopTime<=0.6),'all tones stop promptly');
  const oscillator=state.oscillators[0], envelope=state.gains[2];
  oscillator.onended(); assert(oscillator.disconnected && envelope.disconnected,'ended nodes disconnect');

  const count=state.oscillators.length;
  for (const bad of ['{','null',{specimenType:'nope',listenPort:443,vigor:0},
    {specimenType:'flower',listenPort:0,vigor:0},{specimenType:'flower',listenPort:443}]) garden.source.emit(bad);
  assert.equal(state.oscillators.length,count,'malformed frames never request sound');
  garden.source.handlers.weather({data:JSON.stringify({level:'botnet_hurricane',eventsPerMinute:10000})});
  assert.equal(state.oscillators.length,count,'weather never requests ambience');
  await garden.toggle(); assert.equal(master.gain.value,0,'Off immediately mutes scheduled tones');
  grow('ghostbloom',5000); assert.equal(state.oscillators.length,count,'Off suppresses future sounds');
  element('#sound-volume').value='50'; element('#sound-volume').handlers.input();
  assert.equal(master.gain.value,0,'volume adjustment stays muted while Off');
  await garden.toggle(); assert.equal(master.gain.value,outputGain(.5)); assert.equal(state.contexts.length,1);
  assert.equal(state.resumes,1,'running context reused');
  state.contexts[0].state='suspended'; await garden.toggle(); await garden.toggle();
  assert.equal(state.resumes,2,'explicit re-enable resumes suspended context');
  element('#sound-volume').value='0'; element('#sound-volume').handlers.input();
  grow('flower',6000); assert.equal(state.oscillators.length,count,'zero volume schedules no sounds');
  element('#sound-volume').value='200'; element('#sound-volume').handlers.input(); assert.equal(master.gain.value,2,'full volume has +6dB headroom');
  for(const value of [1,5,12,25,50,100]) {
    element('#sound-volume').value=String(value);element('#sound-volume').handlers.input();
    assert.equal(master.gain.value,outputGain(value/100));
  }
  element('#sound-volume').value='invalid'; element('#sound-volume').handlers.input(); assert.equal(master.gain.value,0);

  // Existing ordinary identities remain; wirefern shares vine. Bursts have no backlog or lost specimens.
  const ordinary=createGarden(); await ordinary.toggle();
  for (const [index,type] of ['flower','mushroom','broadleaf','vine','redbloom','weed','wirefern'].entries()) ordinary.grow(type,index*400);
  const frequencies=ordinary.state.oscillators.map(o=>o.frequency.value);
  assert(frequencies.includes(660) && frequencies.includes(180) && frequencies.includes(262) && frequencies.includes(220) && frequencies.includes(440) && frequencies.includes(146));
  assert.deepEqual(ordinary.state.oscillators.slice(-2).map(o=>o.frequency.value),[220,660],'wirefern reuses the existing vine-family identity');
  assert.doesNotThrow(() => ordinary.run('window.PacketGardenAudio.create({window}).maybePlayCollectionSound()'), 'missing optional sound controls are safe and muted');
  const burst=createGarden(); await burst.toggle();
  for(let event=0;event<30;event++) burst.grow('flower',event*10);
  assert.equal(burst.run('gardenState.specimens.length'),30);
  assert.equal(burst.state.oscillators.length,1,'burst produces one immediate sound and no queue');
  burst.grow('flower',400);
  assert.equal(burst.state.oscillators.length,2,'subsequent growth uses the shared sound path');
  burst.run('gardenState.specimens=Array.from({length:columns*rows},(_,i)=>({type:"flower",column:i%columns,row:Math.floor(i/columns),createdAt:400,vigor:0}))');
  burst.grow('ghostbloom',1000); assert.equal(burst.state.oscillators.length,2,'vigor-0 growth at capacity cannot play a spawn sound');
  burst.source.emit({specimenType:'flower',listenPort:5432,vigor:3});
  assert.equal(burst.state.oscillators.length,3,'successful forced replacement uses ordinary synthesis');
  assert.equal(burst.run('gardenState.specimens.length'),640);
  burst.state.now=1100;
  burst.source.emit({specimenType:'ghostbloom',listenPort:443,vigor:3});
  assert.equal(burst.state.oscillators.length,6,'rare forced replacement can break ordinary cooldown');
  burst.source.emit({specimenType:'flower',listenPort:5432,vigor:3});
  assert.equal(burst.state.oscillators.length,6,'replacement still obeys ordinary cooldown');
  burst.state.now=1200;
  burst.source.emit({specimenType:'blackthorn',listenPort:443,vigor:3});
  assert.equal(burst.state.oscillators.length,6,'replacement still obeys independent rare cooldown');
  for(const roll of [0,1,-1,2,NaN]) {
    const pitches=createGarden(); await pitches.toggle();
    pitches.run(`gardenSound.maybePlayGrowthSound('flower',0,${roll})`);
    const frequency=pitches.state.oscillators[0].frequency.value;
    assert(frequency>=660*0.98 && frequency<=660*1.02,'pitch variation stays bounded');
  }

  for (const options of [{supported:false},{failConstructor:true},{failResume:true},{failPlayback:true}]) {
    const failing=createGarden(options); await failing.toggle();
    assert.doesNotThrow(()=>failing.grow('flower'));
    assert.equal(failing.run('gardenState.specimens.length'),1,'audio failure never blocks growth');
    assert.equal(failing.element('#sound-toggle').textContent,'Sound unavailable');
    failing.grow('ghostbloom',1000);
    assert.equal(failing.run('gardenState.specimens.length'),2);
  }
  const pending=createGarden({deferredResume:true});
  const enabling=pending.toggle(); pending.grow('flower');
  assert.equal(pending.state.oscillators.length,0,'growth does not wait/queue during initialization');
  await pending.toggle(); pending.state.finishResume(); await enabling;
  assert.equal(pending.element('#sound-toggle').textContent,'Sound: Off');
  assert.equal(pending.state.gains[0].gain.value,0,'late resume cannot override explicit Off');
  const collection=createGarden();
  collection.run('gardenSound.maybePlayCollectionSound()');
  assert.equal(collection.state.contexts.length,0,'muted collection never creates audio');
  await collection.toggle();
  collection.run('gardenSound.maybePlayCollectionSound()');
  assert.equal(collection.state.contexts.length,1,'collection reuses the existing AudioContext');
  assert.equal(collection.state.oscillators.length,1,'one tiny collection pluck');
  assert.equal(collection.state.oscillators[0].stopTime,0.09,'collection sound is short');
  assert.equal(collection.state.gains[0].gain.value,outputGain(.12),'collection shares the master volume');
  assert.equal(collection.state.gains[2].gain.events.find(event=>event[0]==='linear')[1],0.045,'quiet envelope');
  collection.element('#sound-volume').value='25'; collection.element('#sound-volume').handlers.input();
  assert.equal(collection.state.gains[0].gain.value,outputGain(.25));
  await collection.toggle(); collection.run('gardenSound.maybePlayCollectionSound()');
  assert.equal(collection.state.oscillators.length,1,'Off suppresses collection sound');
  await collection.toggle();
  collection.element('#sound-volume').value='0'; collection.element('#sound-volume').handlers.input();
  collection.run('gardenSound.maybePlayCollectionSound()');
  assert.equal(collection.state.oscillators.length,1,'zero volume suppresses collection sound');
  const collectionFailure=createGarden({failPlayback:true}); await collectionFailure.toggle();
  assert.doesNotThrow(()=>collectionFailure.run('gardenSound.maybePlayCollectionSound()'));
  const gnomes=createGarden();
  gnomes.run("gardenSound.maybePlayGnomeSound('battle'); gardenSound.maybePlayGnomeSound('victory')");
  assert.equal(gnomes.state.contexts.length,0,'muted gnomes never create audio');
  await gnomes.toggle();
  gnomes.run("gardenSound.maybePlayGnomeSound('battle'); gardenSound.maybePlayGnomeSound('victory')");
  assert.equal(gnomes.state.contexts.length,1,'gnomes share the growth AudioContext');
  assert.equal(gnomes.state.oscillators.length,4,'one ting and a three-note victory trill');
  assert.equal(gnomes.state.gains[0].gain.value,outputGain(.12),'gnomes share the master volume');
  assert(gnomes.state.gains.slice(2).every(gain=>gain.gain.events.find(event=>event[0]==='linear')[1]===0.045),'ambient cues stay below growth envelopes');
  await gnomes.toggle();
  gnomes.run("gardenSound.maybePlayGnomeSound('battle'); gardenSound.maybePlayGnomeSound('victory')");
  assert.equal(gnomes.state.oscillators.length,4,'Sound Off suppresses every gnome cue');
  const gnomeFailure=createGarden({failPlayback:true}); await gnomeFailure.toggle();
  assert.doesNotThrow(()=>gnomeFailure.run("gardenSound.maybePlayGnomeSound('battle')"));
  gnomeFailure.grow('flower'); assert.equal(gnomeFailure.run('gardenState.specimens.length'),1);
  console.log('PASS: stronger severe weather; Web Audio opt-in, volume, all species identities, rare/ordinary cooldowns, burst/shared growth, bounded pitch, cleanup, failure/race isolation.');
};

if (require.main === module) module.exports().catch(error => { console.error(error); process.exitCode=1; });
