// Native Chrome OfflineAudioContext: render the production graph, not oscillator mocks.
if(!process.argv.includes('--run'))console.log('SKIP: gnome arrival native signal/browser checks; pass --run [--baseline].');
else run().catch(e=>{console.error(e);process.exitCode=1;});
async function run(){
  const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
  const root=path.resolve(__dirname,'..'),assets=path.join(root,'wwwroot'),baseline=process.argv.includes('--baseline'),revision='509ebe8';
  const before=execFileSync('git',['show',revision+':wwwroot/garden-audio.js'],{cwd:root,encoding:'utf8'}),current=await fs.readFile(path.join(assets,'garden-audio.js'),'utf8');
  const output=path.join(root,'artifacts/gnome-arrival',baseline?'before':'after');await fs.mkdir(output,{recursive:true});
  const requestedAudio=[];
  const capture=`{
    const f=window.__gnomeAudio??={contexts:[],cues:[],calls:[]};
    const garden=PacketGardenCore.createGardenModel;PacketGardenCore.createGardenModel=(...args)=>{const m=garden(...args);f.garden??=m;return m;};
    const gnomes=PacketGardenGnomes.createModel;PacketGardenGnomes.createModel=options=>{const m=gnomes({...options,onCue(stage){f.cues.push(stage);options.onCue(stage);}});f.gnomes=m;return m;};
    const model=PacketGardenPixiLiveCore.createModel;PacketGardenPixiLiveCore.createModel=(...args)=>(f.model=model(...args));
    const ecology=PacketGardenEcology.createEcologyModel;PacketGardenEcology.createEcologyModel=(...args)=>(f.ecology=ecology(...args));
    const init=PIXI.Application.prototype.init;PIXI.Application.prototype.init=function(...args){f.app=this;return init.apply(this,args);};
    const play=gardenSound.maybePlayGnomeSound;gardenSound.maybePlayGnomeSound=stage=>{const result=play(stage);f.calls.push({stage,result,state:f.contexts[0]?.state??'none'});return result;};
  }`;
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost'),file=url.pathname.slice(1)||'index.html';
    if(file==='__gnome-capture.js'){res.setHeader('Content-Type','text/javascript');res.end(capture);return;}
    if(file==='__audio-warm.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><script src="garden-audio.js?v=frog-gnome-ack-1"></script>');return;}
    if(file==='garden-audio.js'){requestedAudio.push(req.url);res.setHeader('Content-Type','text/javascript');res.setHeader('Cache-Control','public, max-age=31536000');res.end(url.searchParams.get('v')==='frog-gnome-ack-1'?before:current);return;}
    if(file==='api/garden/events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('event: weather\ndata: {"level":"quiet","eventsPerMinute":0,"hasSnapshot":false}\n\n');return;}
    if(file==='favicon.ico'){res.writeHead(204);res.end();return;}
    const absolute=path.resolve(assets,file);if(!absolute.startsWith(assets+path.sep)){res.writeHead(404);res.end();return;}
    let body=await fs.readFile(absolute);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace(/(<script src="pixi-live\.js(?:\?[^"]*)?" defer)/,'<script src="/__gnome-capture.js" defer></script>$1'));
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(body);
  }catch{res.writeHead(404);res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  const report={baseline,revision,offline:[]};
  function measure(encoded,sampleRate){const pcm=Buffer.from(encoded,'base64'),samples=pcm.length/4;let peak=0,sum=0,first=-1,last=-1,clipped=0;
    for(let i=0;i<samples;i++){const n=pcm.readFloatLE(i*4),a=Math.abs(n);peak=Math.max(peak,a);sum+=n*n;if(a>1e-6){if(first<0)first=i;last=i;}if(a>=.99)clipped++;}
    return {sampleRate,peak,rms:Math.sqrt(sum/samples),peakDb:20*Math.log10(peak||1e-12),rmsDb:20*Math.log10(Math.sqrt(sum/samples)||1e-12),activeMs:first<0?0:(last-first+1)*1000/sampleRate,clippedSamples:clipped,pcm};}
  async function save(name,data,sampleRate=48000){const {pcm,...metrics}=measure(data,sampleRate),samples=pcm.length/4,wav=Buffer.alloc(44+samples*2);
    wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
    wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);
    for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,pcm.readFloatLE(i*4)))*32767),44+i*2);
    await fs.writeFile(path.join(output,name+'.wav'),wav);return metrics;
  }
  async function nativeChecks(){
    const page=await browser.newPage({viewport:{width:1280,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));
    await page.addInitScript(()=>{
      window.__gnomeNow=1800000000000;Date.now=()=>__gnomeNow;
      const f=window.__gnomeAudio={contexts:[],oscillators:[],live:new Set(),maxLive:0,resumes:0,cues:[],calls:[],recording:null};
      const connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);
        if(destination===this.context.destination&&!(this instanceof ScriptProcessorNode)){
          // Test-only post-mix PCM tap; original speaker destination stays connected.
          const tap=this.context.createScriptProcessor(2048,1,1);tap.onaudioprocess=e=>{if(f.recording)f.recording.push(new Float32Array(e.inputBuffer.getChannelData(0)));};
          connect.call(this,tap);connect.call(tap,destination);
        }return result;
      };
      const track=node=>{f.live.add(node);f.maxLive=Math.max(f.maxLive,f.live.size);const disconnect=node.disconnect;
        node.disconnect=function(...args){f.live.delete(this);return disconnect.apply(this,args);};return node;};
      const Context=AudioContext;window.AudioContext=class extends Context{
        constructor(...args){super(...args);f.contexts.push(this);}
        resume(...args){f.resumes++;return super.resume(...args);}
        createOscillator(){const node=track(super.createOscillator());f.oscillators.push(node);return node;}
        createGain(){return track(super.createGain());}createBiquadFilter(){return track(super.createBiquadFilter());}
        createDynamicsCompressor(){return track(super.createDynamicsCompressor());}
      };
    });
    const origin=`http://127.0.0.1:${server.address().port}`;
    await page.goto(origin+'/__audio-warm.html');assert.equal(await page.evaluate(()=>PacketGardenAudio.create.toString().includes("'peaking'")),false);
    await page.goto(origin+'/pixi-live.html');await page.waitForFunction(()=>window.__gnomeAudio?.app?.ticker?.started&&__gnomeAudio.gnomes);
    await page.evaluate(()=>__gnomeAudio.app.stop());assert.equal(await page.evaluate(()=>__gnomeAudio.contexts.length),0);
    assert.equal(await page.evaluate(()=>PacketGardenAudio.create.toString().includes("'peaking'")),true,'new query bypasses the cached old synthesis');
    const preview=page.getByRole('button',{name:'Preview gnome sound',exact:true}),status=page.locator('#gnome-sound-status');
    await preview.click();assert.match(await status.textContent(),/disabled/);assert.equal(await page.evaluate(()=>__gnomeAudio.contexts.length),0);
    await page.getByRole('button',{name:'Sound: Off',exact:true}).click();await page.waitForFunction(()=>__gnomeAudio.contexts[0]?.state==='running');
    const stable=await page.evaluate(()=>({nodes:__gnomeAudio.live.size,resumes:__gnomeAudio.resumes}));assert.equal(stable.nodes,3);
    const snapshot=()=>page.evaluate(()=>JSON.stringify([__gnomeAudio.garden.specimens,__gnomeAudio.model.counts,__gnomeAudio.model.recentEvents,__gnomeAudio.ecology.grassCells,__gnomeAudio.ecology.puddles,__gnomeAudio.gnomes.incident,document.querySelector('#garden-score').textContent]));
    const recording=()=>page.evaluate(()=>{__gnomeAudio.recording=[];});
    const collect=async name=>{
      await page.waitForFunction(()=>__gnomeAudio.recording.length>=18&&__gnomeAudio.live.size===3);
      const encoded=await page.evaluate(()=>{const blocks=__gnomeAudio.recording;__gnomeAudio.recording=null;const samples=new Float32Array(blocks.reduce((n,b)=>n+b.length,0));let offset=0;
        for(const block of blocks){samples.set(block,offset);offset+=block.length;}const bytes=new Uint8Array(samples.buffer);let binary='';
        for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);});
      const sampleRate=await page.evaluate(()=>__gnomeAudio.contexts[0].sampleRate);
      const metrics=await save(name,encoded,sampleRate);assert.equal(metrics.clippedSamples,0);return metrics;
    };
    report.native=[];
    for(const [mode,id] of [['dispute','#trigger-gnomes'],['vine','#trigger-landscaping'],['overcrowding','#trigger-overcrowding'],['weed_harvest','#trigger-weed-harvest']]){
      await page.evaluate(mode=>{const f=__gnomeAudio;__gnomeNow+=420000;f.gnomes.clear();f.garden.clear();f.ecology.clear();
        const type=mode==='vine'?'vine':mode==='weed_harvest'?'weed':'broadleaf';
        f.garden.seed(Array.from({length:mode==='overcrowding'?640:40},(_,i)=>({type,column:i%32,row:Math.floor(i/32),vigor:0,colorVariant:0,createdAt:Date.now()-65000,origin:{kind:'simulated',eventType:'arrival-audio-test'}})));
        f.cues=[];f.calls=[];},mode);
      const voices=await page.evaluate(()=>__gnomeAudio.oscillators.length);await recording();await page.locator(id).click();await page.locator(id).click();
      await page.evaluate(()=>{const f=__gnomeAudio;f.gnomes.tick(Date.now());f.gnomes.advance(Date.now());f.gnomes.advance(Date.now());});
      const metrics=await collect('native-'+mode+'-12');assert(metrics.peak>.01&&metrics.rms>.002);
      const route=await page.evaluate(()=>({cues:__gnomeAudio.cues,calls:__gnomeAudio.calls,voices:__gnomeAudio.oscillators.length,resumes:__gnomeAudio.resumes}));
      assert.deepEqual(route.cues,['arrival']);assert.equal(route.calls.length,1);assert.equal(route.calls[0].result,'played');assert.equal(route.voices,voices+2);assert.equal(route.resumes,stable.resumes);
      report.native.push({mode,...metrics,...route});
    }
    await page.evaluate(()=>{__gnomeAudio.gnomes.clear();__gnomeAudio.calls=[];});
    report.previews=[];
    for(const volume of [12,3,100]){
      await page.locator('#sound-volume').fill(String(volume));const state=await snapshot(),voices=await page.evaluate(()=>__gnomeAudio.oscillators.length);
      await recording();await preview.click();assert.match(await status.textContent(),/Playing/);await preview.click();assert.match(await status.textContent(),/already playing/);
      const metrics=await collect('native-preview-'+volume);assert(metrics.peak>(volume===3?.001:.01));assert.equal(await snapshot(),state);
      assert.equal(await page.evaluate(()=>__gnomeAudio.oscillators.length),voices+2);report.previews.push({volume,...metrics});
    }
    await page.locator('#sound-volume').fill('0');let voices=await page.evaluate(()=>__gnomeAudio.oscillators.length);await recording();await preview.click();
    assert.match(await status.textContent(),/Volume is 0/);assert.equal((await collect('native-muted')).peak,0);assert.equal(await page.evaluate(()=>__gnomeAudio.oscillators.length),voices);
    await page.locator('#sound-volume').fill('12');await page.evaluate(()=>__gnomeAudio.contexts[0].suspend());await preview.click();assert.match(await status.textContent(),/suspended/);
    assert.equal(await page.evaluate(()=>__gnomeAudio.resumes),stable.resumes);assert.equal(await page.evaluate(()=>__gnomeAudio.oscillators.length),voices);
    await page.getByRole('button',{name:'Sound: On',exact:true}).click();await preview.click();assert.match(await status.textContent(),/disabled/);
    await page.getByRole('button',{name:'Sound: Off',exact:true}).click();await page.waitForFunction(()=>__gnomeAudio.contexts[0].state==='running');
    const resumes=await page.evaluate(()=>__gnomeAudio.resumes);assert.equal(resumes,stable.resumes+1);
    await preview.click();await page.getByRole('button',{name:'Sound: On',exact:true}).click();await page.waitForFunction(()=>__gnomeAudio.live.size===3);
    await preview.click();assert.match(await status.textContent(),/disabled/);await page.getByRole('button',{name:'Sound: Off',exact:true}).click();
    await preview.click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForFunction(()=>__gnomeAudio.live.size===3);voices=await page.evaluate(()=>__gnomeAudio.oscillators.length);
    await page.evaluate(()=>document.querySelector('#preview-gnome-sound').click());assert.match(await status.textContent(),/hidden/);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;__gnomeAudio.app.stop();});
    assert.equal(await page.evaluate(()=>__gnomeAudio.oscillators.length),voices);
    await page.setViewportSize({width:390,height:844});
    report.mobile=await page.evaluate(()=>{const button=document.querySelector('#preview-gnome-sound').getBoundingClientRect();return {viewport:innerWidth,buttonWidth:button.width};});
    assert(report.mobile.buttonWidth<report.mobile.viewport-32);
    await page.locator('.pixi-sound-controls').screenshot({path:path.join(output,'preview-controls-mobile.png')});
    await preview.click();await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));await page.waitForFunction(()=>__gnomeAudio.live.size===3);
    voices=await page.evaluate(()=>__gnomeAudio.oscillators.length);await page.evaluate(()=>document.querySelector('#preview-gnome-sound').click());assert.equal(await page.evaluate(()=>__gnomeAudio.oscillators.length),voices);
    report.cleanup=await page.evaluate(()=>({contexts:__gnomeAudio.contexts.length,resumes:__gnomeAudio.resumes,remainingNodes:__gnomeAudio.live.size,maxNodes:__gnomeAudio.maxLive}));
    assert.equal(report.cleanup.contexts,1);assert.equal(report.cleanup.resumes,resumes);assert.equal(report.cleanup.maxNodes,9);
    report.cache={requestedAudio};assert(requestedAudio.some(u=>u.includes('v=frog-gnome-ack-1')));assert(requestedAudio.some(u=>u.includes('v=gnome-arrival-2')));
    await page.evaluate(()=>__gnomeAudio.contexts[0].close());await page.close();assert.deepEqual(errors,[]);
    const homepage=await browser.newPage();await homepage.goto(origin+'/');await homepage.waitForSelector('#view canvas');assert.equal(await homepage.locator('#preview-gnome-sound').count(),0);await homepage.close();
  }
  try{
    browser=await chromium.launch({channel:process.env.PACKETGARDEN_BROWSER_CHANNEL||'chrome',headless:true,ignoreDefaultArgs:['--autoplay-policy=no-user-gesture-required'],args:['--autoplay-policy=user-gesture-required']});
    report.browser=browser.version();const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/about.html`);
    for(const sample of [{name:'arrival-12',volume:12},{name:'arrival-3',volume:3},{name:'arrival-100',volume:100},{name:'arrival-unfiltered-12',volume:12,bypass:true},{name:'flower-12',volume:12,flower:true},{name:'arrival-0',volume:0},{name:'mixed-100',volume:100,mixed:true}]){
      const rendered=await page.evaluate(async({source,volume,bypass,flower,mixed})=>{
        if(bypass)source=source.replace('node.oscillator.connect(node.filter);node.filter.connect(node.envelope);','node.oscillator.connect(node.envelope);');
        const factory=Function('window','document',source+';return createGardenSound;')({},{querySelector:()=>null});
        const context=new OfflineAudioContext(1,mixed?144000:48000,48000);
        // Offline rendering has no user gesture/running phase. Only that gate is
        // adapted; oscillators, filters, envelopes, compressor and output are native.
        const proxy=new Proxy(context,{get(target,key){if(key==='state')return 'running';const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
        let click;const sound=factory({window:{AudioContext:class{constructor(){return proxy;}}},
          toggle:{addEventListener(_,fn){click=fn;},setAttribute(){}},volumeControl:{value:String(volume),addEventListener(){}}});
        await click();if(flower)sound.maybePlayGrowthSound('flower',0,.5);else sound.maybePlayGnomeSound('arrival');
        if(mixed){sound.maybePlayGrowthSound('blackthorn',0,.5);sound.maybePlayCollectionSound();sound.maybePlayGnomeSound('victory');sound.maybePlayThunderSound('botnet_hurricane');}
        const buffer=await context.startRendering(),bytes=new Uint8Array(buffer.getChannelData(0).buffer);let binary='';
        for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);
      },{source:baseline?before:current,...sample});
      const metrics=await save(sample.name,rendered);report.offline.push({...sample,...metrics});assert.equal(metrics.clippedSamples,0);
      if(sample.volume)assert(metrics.peak>1e-4);else assert.equal(metrics.peak,0);
    }
    if(!baseline){
      const arrival=report.offline.find(s=>s.name==='arrival-12'),flower=report.offline.find(s=>s.name==='flower-12');
      assert(arrival.rms>.002&&arrival.peak>.01,'default-volume arrival must not regress to effectively quiet output');
      assert(arrival.peak<flower.peak*2,'arrival transient remains comparable to the ordinary garden sound');
      assert(arrival.activeMs>=350&&arrival.activeMs<=650);assert(report.offline.find(s=>s.name==='arrival-100').peak<.5);
      const previous=JSON.parse(await fs.readFile(path.join(output,'../before/signal.json'),'utf8')).offline.find(s=>s.name==='arrival-12');
      report.improvement={peakDb:arrival.peakDb-previous.peakDb,rmsDb:arrival.rmsDb-previous.rmsDb};assert(report.improvement.rmsDb>15);
    }
    await page.close();
    if(!baseline&&!process.argv.includes('--offline-only'))await nativeChecks();
    await fs.writeFile(path.join(output,'signal.json'),JSON.stringify(report,null,2));console.log('PASS: native offline production signal, filter isolation, default/low/high/mute and flower reference:',JSON.stringify(report));
  }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
