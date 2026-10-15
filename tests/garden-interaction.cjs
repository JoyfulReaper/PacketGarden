const assert=require('node:assert/strict'),fs=require('node:fs');
const I=require('../wwwroot/garden-interaction.js'),A=require('../wwwroot/garden-ambient.js'),M=require('../wwwroot/garden-mutations.js');
const T=require('../wwwroot/garden-ui-core.js'),P=require('../wwwroot/pixi-stress.js');
const at=100000,point={x:465,y:315};
const specimen={type:'redbloom',column:15,row:10,createdAt:at,vigor:2,mutation:{type:'collectible_weed',createdAt:at,expiresAt:at+20000}};
const visitor=type=>({type,x:465,y:315,origin:point,createdAt:at,expiresAt:at+20000,phase:0,direction:1});
const drop={...visitor('amanita_muscaria')},bottom=visitor('shiny_pebble'),top=visitor('shiny_pebble');
const state={specimens:[specimen],curiosities:[bottom,top],drops:[drop]};
assert.equal(I.resolve(point,state,at).object,top,'newest curiosity beats drops, active mutation and cell inspection');
state.curiosities.pop();assert.equal(I.resolve(point,state,at).object,bottom);
state.curiosities=[];assert.equal(I.resolve(point,state,at).object,drop,'drop beats mutation/inspection');
state.drops.push({...drop});assert.equal(I.resolve(point,state,at).object,state.drops[1],'newest drop first');
state.drops=[];assert.equal(I.resolve(point,state,at).kind,'mutation');
assert.equal(I.resolve({x:477,y:315},state,at).kind,'mutation','inclusive 12px radius');
assert.equal(I.resolve({x:477.001,y:315},state,at).kind,'specimen','outside radius still inspects the occupied cell');
delete specimen.mutation;specimen.pendingMutation={type:'collectible_weed',activateAt:at+3000};
assert.equal(I.resolve(point,state,at).kind,'specimen');assert.equal(I.resolve({x:900,y:590},state,at),null);
for(const type of A.curiosityTypes){const item=visitor(type);for(const elapsed of [0,500,19000]){
  const p=A.curiosityPosition(item,at+elapsed);assert.equal(I.curiosityAt(p,[item],at+elapsed),item);
  assert.equal(I.curiosityAt({x:p.x+9,y:p.y},[item],at+elapsed),item);
  assert.equal(I.curiosityAt({x:p.x+9.001,y:p.y},[item],at+elapsed),null);
}assert.equal(I.curiosityAt(point,[item],item.expiresAt),null);}
for(const elapsed of [0,500,19000]){const p=A.looseDropPosition(drop,at+elapsed);assert.equal(I.looseDropAt(p,[drop],at+elapsed),drop);assert.equal(I.looseDropAt({x:p.x+9.001,y:p.y},[drop],at+elapsed),null);}
assert.equal(I.looseDropAt(point,[drop],drop.expiresAt),null);
// Presentation matrices include CSS scaling, contain offsets and independent backing resolution.
for(const [width,height] of [[960,600],[1920,1200],[1600,600],[960,1000],[390,740]])for(const dpr of [1,2])for(const cssScale of [1,.5]){
  const presentation={width,height,backingWidth:width*dpr,backingHeight:height*dpr},fit=P.contain(width,height);
  const rect={left:80,top:120,width:width*cssScale,height:height*cssScale};
  const client=p=>({x:rect.left+(fit.x+p.x*fit.scale)*cssScale,y:rect.top+(fit.y+p.y*fit.scale)*cssScale});
  for(const logical of [{x:.001,y:.001},{x:480,y:300},{x:959.999,y:599.999}]){
    const c=client(logical),actual=I.pointFromClient(c.x,c.y,rect,presentation,fit);assert(actual);
    assert(Math.abs(actual.x-logical.x)<1e-8);assert(Math.abs(actual.y-logical.y)<1e-8);
  }
  for(const logical of [{x:-.001,y:300},{x:960.001,y:300},{x:480,y:-.001},{x:480,y:600.001}]){
    const c=client(logical);assert.equal(I.pointFromClient(c.x,c.y,rect,presentation,fit),null);
  }
}
for(const p of [null,{x:NaN,y:0},{x:960,y:0},{x:0,y:600},{x:-1,y:0}])assert.equal(I.resolve(p,state,at),null);
assert.equal(I.pointFromClient(960,300,{left:0,top:0,width:960,height:600},{width:960,height:600},{x:0,y:0,scale:1}),null);
assert.equal(I.pointFromClient(0,0,{width:0,height:600},{width:960,height:600},{scale:1}),null);
assert.deepEqual([0,59000,60000,65000,120000].map(T.formatAge),['0s','59s','1m','1m 5s','2m']);
const info=T.inspection({...specimen,origin:{kind:'tcpnoise',sensor:null,listenPort:22,seenCount:null}},at);
assert.equal(info.source,'Live TCPNoise');assert.equal(info.sensor,'Not supplied');assert.equal(info.seenCount,'—');assert.equal(info.port,'22');assert.equal(info.vigor,'2 — frequent');
assert.equal(info.mutation,'None');assert.equal(info.age,'0s');
const fake=T.inspection({...specimen,origin:{kind:'simulated',eventType:'http'}},at);
assert.equal(fake.source,'Simulated HTTP');assert.equal(fake.sensor,'Development controls');assert.equal(fake.port,'—');
assert.equal(M.mutationLabel({...specimen,mutation:{type:'collectible_weed',expiresAt:at+1}},at),'Collectible weed');
for(const name of ['garden-interaction','garden-ui-core'])assert.doesNotMatch(fs.readFileSync(`wwwroot/${name}.js`,'utf8'),/CanvasRenderingContext2D|PIXI|document\.|setTimeout|setInterval|localStorage|sessionStorage/);
console.log('PASS: shared priority/newest/exact movement/radii/pending/cell geometry/expiry; desktop/wide/tall/mobile/CSS scale/DPR/edges; shared inspection/age/message formatting without UI or timers.');
