const assert=require('node:assert/strict'),fs=require('node:fs');
const G=require('../wwwroot/garden-gnomes.js');
let at=0,rolls=0,value=.02,specimens=[],cues=[],changes=0;
const model=G.createModel({now:()=>at,getSpecimens:()=>specimens,random:()=>{rolls++;return value;},onCue:cue=>cues.push(cue),onChange:()=>changes++});
const fill=n=>{specimens=Array.from({length:n},()=>({type:'broadleaf',createdAt:at,vigor:0}));};
assert.deepEqual(G.config,{checkEveryMs:45000,minimumSpecimens:30,incidentChance:.02,battleAfterMs:3000,resultAfterMs:7000,losersGoneAfterMs:9000,finishedAfterMs:12000});
at=45000;fill(29);model.tick(at);assert.equal(rolls,0);assert.equal(model.incident,null);
at=90000;fill(30);specimens[0].createdAt=at-360000;model.tick(at);assert.equal(rolls,0,'expired specimen cannot make thirty');
at=135000;fill(30);model.tick(at);assert.equal(rolls,1);assert.equal(model.incident,null,'.02 is excluded');
model.tick(++at);assert.equal(rolls,1);
at=180000;value=.019999;const state=JSON.stringify(specimens);model.tick(at);assert.equal(rolls,4,'one chance and two position draws');
assert.equal(model.actors.length,4);assert.equal(model.start(at),false);assert.equal(rolls,4);
assert(model.actors.filter(a=>a.side==='green').every(a=>a.x<model.actors.find(a=>a.side==='red').x));
for(const age of [0,1500,2999]){model.advance(at+age);assert(model.actors.every(a=>a.state==='approach'));}
model.advance(at+3000);assert.deepEqual(cues,['arrival','battle']);model.advance(at+6999);assert.deepEqual(cues,['arrival','battle']);
let choices=0;model.advance(at+7000,()=>{choices++;return .499999;});
assert.equal(model.incident.winner,'green');assert.equal(choices,1);assert.deepEqual(cues,['arrival','battle','victory']);
const losers=model.actors.filter(a=>a.state==='flee');model.advance(at+8000,()=>{throw Error('winner rerolled');});
assert.equal(model.incident.winner,'green');assert(losers.every(a=>a.x===(a.targetX+a.startX)/2));
model.advance(at+8999);assert.equal(model.actors.length,4);model.advance(at+9000);assert.equal(model.actors.length,2);
assert(model.actors.every(a=>a.side==='green'&&a.state==='celebrate'));const memberships=changes;
model.advance(at+11999);assert.equal(changes,memberships,'membership does not rebuild per frame');
model.advance(at+12000);assert.equal(model.incident,null);assert.equal(model.actors.length,0);assert.equal(JSON.stringify(specimens),state);
for(const winnerRoll of [.5,.999999]) {
  fill(30);assert(model.start(at,()=>.5));model.advance(at+7000,()=>winnerRoll);assert.equal(model.incident.winner,'red');model.clear();
}
assert(model.start(at,()=>.5));cues=[];model.advance(at+12000);assert.deepEqual(cues,[],'expired suspended incident has no phase cues');
at=10000000;fill(30);value=.99;const before=rolls;model.tick(at);for(let i=0;i<20;i++)model.tick(at);
assert.equal(rolls,before+1,'no catch-up roll backlog');assert.equal(model.nextCheckAt,at+45000);
model.tick(at+90000,()=>{throw Error('hidden check rolled');},true);assert.equal(model.nextCheckAt,at+135000);
model.resetCadence(at+90000);assert.equal(model.incident,null);assert.equal(model.actors.length,0);
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-gnomes.js','utf8'),/document\.|PIXI|AudioContext|setInterval|setTimeout|requestAnimationFrame|EventSource/);
console.log('PASS: shared gnome exact eligibility/rolls/phases/positions/winner boundaries/cues, no overlap/catch-up/hidden rolls/stale sounds, specimen independence and no renderer/network/timers.');
