// Actual page-owned preview and cleanup; shared synthesis uses controlled devices.
const assert=require('node:assert/strict'),fs=require('node:fs'),{start}=require('./pixi-default.cjs'),audio=require('./audio-context.cjs');
(async()=>{
  for(const page of ['index.html','pixi-live.html']){
    const a=audio(),g=await start(false,{pageHtml:fs.readFileSync('wwwroot/'+page,'utf8'),captureModel:true,AudioContext:a.AudioContext});
    const button=g.element('#preview-gnome-sound');
    if(page==='index.html'){assert.equal(button,null);g.winHandlers.get('pagehide')({persisted:false});continue;}
    const preview=()=>button.handlers.get('click')(),status=()=>g.element('#gnome-sound-status').textContent;
    const snapshot=()=>JSON.stringify([g.model.specimens,g.model.counts,g.model.recentEvents,g.ecology.grassCells,g.ecology.puddles,g.gnomes.actors,g.ambient.drops,g.element('#garden-score').textContent]);
    const original=snapshot();preview();assert.match(status(),/disabled/);assert.equal(a.state.contexts.length,0);assert.equal(a.state.resumes,0);
    await g.element('#sound-toggle').handlers.get('click')();const resumes=a.state.resumes;
    preview();assert.match(status(),/Playing/);assert.equal(a.state.oscillators.length,2);preview();assert.match(status(),/already playing/);assert.equal(a.state.oscillators.length,2);
    for(const node of a.state.oscillators)node.onended();assert.equal(snapshot(),original);
    const volume=value=>{g.element('#sound-volume').value=String(value);g.element('#sound-volume').handlers.get('input')();};
    volume(0);preview();assert.match(status(),/Volume is 0/);assert.equal(a.state.oscillators.length,2);
    volume(12);a.state.contexts[0].state='suspended';preview();assert.match(status(),/suspended/);assert.equal(a.state.resumes,resumes);assert.equal(a.state.oscillators.length,2);
    a.state.contexts[0].state='running';preview();g.doc.hidden=true;g.docHandlers.get('visibilitychange')();
    assert(a.state.oscillators.every(n=>n.disconnected));preview();assert.match(status(),/hidden/);
    const voices=a.state.oscillators.length;g.doc.hidden=false;g.docHandlers.get('visibilitychange')();assert.equal(a.state.oscillators.length,voices,'visibility resume never repeats the cue');
    preview();assert.equal(a.state.oscillators.length,voices+2);
    const late=button.handlers.get('click');g.winHandlers.get('pagehide')({persisted:false});assert.equal(button.handlers.size,0);
    assert(a.state.oscillators.every(n=>n.disconnected));assert(a.state.filters.every(n=>n.disconnected));late();assert.equal(a.state.oscillators.length,voices+2);
    assert.equal(a.state.contexts.length,1);assert.equal(a.state.resumes,resumes);assert.deepEqual(g.errors,[]);
  }
  const failed=audio({failConstructor:true}),g=await start(false,{pageHtml:fs.readFileSync('wwwroot/pixi-live.html','utf8'),captureModel:true,AudioContext:failed.AudioContext});
  await g.element('#sound-toggle').handlers.get('click')();g.element('#preview-gnome-sound').handlers.get('click')();assert.match(g.element('#gnome-sound-status').textContent,/unavailable/);
  g.winHandlers.get('pagehide')({persisted:false});assert.deepEqual(g.errors,[]);
  console.log('PASS: diagnostic-only production-sound preview, explicit enable, disabled/muted/suspended/unavailable/hidden/busy reports, zero garden/score/event effects, no automatic context/resume, hide/pagehide and late-input cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
