const assert=require('node:assert/strict'),S=require('../wwwroot/garden-log-snails.js'),G=require('../wwwroot/garden-core.js'),E=require('../wwwroot/garden-ecology.js'),F=require('../wwwroot/garden-frogs.js');
function fixture(logs=1){
  let at=10000000,draw=()=>.99,calls=0,s;
  const garden=G.createGardenModel({now:()=>at,random:()=>0,terrainRandom:()=>0,fungalRandom:()=>.99,
    onChange:c=>{if(c.kind==='terrain-removed')s?.sourceRemoved(c.terrain,at);}});
  garden.seed(Array.from({length:logs},(_,i)=>({type:'blackthorn',vigor:0,column:16+i*4,row:10,createdAt:at-G.timings.blackthorn.expiredAfterMs-60000,origin:{kind:'simulated',eventType:'log-fixture'}})));
  garden.forceLogFixture();garden.tick(at);
  const ecology=E.createEcologyModel({now:()=>at,random:()=>.99,isCellOccupied:garden.isCellOccupied});
  s=S.createModel({now:()=>at,random:()=>{calls++;return draw();},getTerrain:()=>garden.terrain,getEcology:()=>ecology});
  return {garden,ecology,s,get at(){return at;},get calls(){return calls;},setDraw:fn=>draw=fn,
    step(ms){const end=at+ms;while(at<end){at=Math.min(end,at+250);garden.tick(at);s.tick(at);}},
    jump(ms){at+=ms;s.tick(at);},
    water({distance=50,size=20,maxSize=size,opacity,age=15000}={}){
      const checkAt=at+45000,elapsed=opacity===undefined?age:30000+480000*(1-opacity/.38);
      const source=garden.terrain.logs[0],originX=source?(source.column+.5)*30:495;
      const p={x:originX+distance,y:315,size,maxSize,seed:.5,createdAt:checkAt-elapsed-1000000,lastRefreshedAt:checkAt-elapsed,simulated:true};
      ecology.seed({puddles:[p]});return p;
    },
    check(roll,selection=0){let n=0;draw=()=>n++===0?selection:n===2?roll:0;this.step(45000);return s.snails[0]??null;}
  };
}
assert.equal(F.waterVisible,E.visiblePuddleState,'frogs use the identical shared visibility validator');
for(const wet of [false,true])for(const roll of [0,.249999999,.25,.499999999,.5,.99,NaN,-.1]){
  const f=fixture();if(wet)f.water();const s=f.check(roll);
  assert.equal(Boolean(s),Number.isFinite(roll)&&roll>=0&&roll<(wet?.5:.25));
  assert.equal(f.s.lastCheck.chance,wet?.5:.25);assert.equal(f.s.counts.checks,1);
  assert.equal(f.calls,s?5:2,'one log selection, one chance roll, at most one route');
  const calls=f.calls;for(let i=0;i<10;i++)f.s.tick(f.at);assert.equal(f.calls,calls);
}
for(const [distance,wet] of [[0,true],[99.999,true],[100,true],[100.000001,false],[101,false]]){
  const f=fixture();f.water({distance});f.check(.375);assert.equal(f.s.lastCheck.wet,wet);
}
for(const [size,wet] of [[7.999,false],[8,true],[8.001,true]]){
  const f=fixture();f.water({size});f.check(.375);assert.equal(f.s.lastCheck.wet,wet);
}
for(const opacity of [.119999,.120001,.2]){
  const f=fixture();f.water({opacity});f.check(.375);assert.equal(f.s.lastCheck.wet,opacity>=.12);
}
for(const key of ['x','y','createdAt','lastRefreshedAt','size','maxSize']){
  const f=fixture(),p=f.water();p[key]=NaN;f.check(.375);assert.equal(f.s.lastCheck.chance,.25,key);
}
for(const change of [p=>p.x=-1,p=>p.y=601,p=>p.createdAt=Infinity,p=>p.lastRefreshedAt=10045001,p=>p.createdAt=p.lastRefreshedAt+1,p=>p.size=-1,p=>p.maxSize=-1]){
  const f=fixture(),p=f.water();change(p);f.check(.375);assert.equal(f.s.lastCheck.chance,.25);
}
{
  const f=fixture();f.water({size:0,maxSize:20});assert(f.check(.375),'wetness uses current visual size, including water grown from zero');
}
for(const mode of ['drained','removed','lookalike','never-added']){
  const f=fixture(),p=f.water();
  if(mode==='drained')p.lastRefreshedAt=f.at-600000;
  else f.ecology.clearPuddles();
  // A detached lookalike or stale original cannot influence the current model.
  if(mode==='lookalike'){const copy={...p,x:900};f.ecology.seed({puddles:[copy]});}
  f.check(.375);assert.equal(f.s.lastCheck.chance,.25,mode);assert.equal(f.s.snails.length,0);
}
{
  const f=fixture();f.water({age:180000});f.ecology.updateWeatherEligibility('quiet',f.at);
  const before=JSON.stringify(f.ecology.puddles);const s=f.check(.375);assert(s,'draining water still qualifies after weather ends');
  assert.equal(JSON.stringify(f.ecology.puddles),before);f.ecology.clearPuddles();f.step(1000);assert.equal(s.leaveAt,null,'drying does not end a visit');
}
{
  const f=fixture(),p=f.water({opacity:.120001}),s=f.check(.375);assert(s);f.step(1000);
  assert(E.puddleVisualState(p,f.at).opacity<.12);assert.equal(s.leaveAt,null,'crossing the wet threshold only changes future chances');
}
{
  const f=fixture(0);f.water();f.step(45000);assert.equal(f.calls,0);assert.equal(f.s.snails.length,0);
}
// Uniform log selection is independent of local wetness, and a dry choice never switches to the wet log.
for(const [selection,wet] of [[0,true],[.499999,true],[.5,false],[.999999,false]]){
  const f=fixture(2);f.water({distance:50});const log=f.garden.terrain.logs[Math.floor(selection*2)],s=f.check(.375,selection);
  assert.equal(f.s.lastCheck.logId,log.id);assert.equal(f.s.lastCheck.wet,wet);assert.equal(Boolean(s),wet);
}
for(const phase of [0,1,2,4])for(const mode of ['removed','replaced','hidden-resumed','cleared']){
  const f=fixture(2),old=f.garden.terrain.logs[0];f.water();let calls=0;
  f.setDraw(()=>{const index=calls++;if(index===phase){
    if(mode==='removed')f.garden.terrain.remove(old);
    if(mode==='replaced'){const copy={...old};f.garden.terrain.logs[0]=copy;f.garden.terrain.byCell.set(old.cell,copy);}
    if(mode==='hidden-resumed'){f.s.setHidden(true,f.at);f.s.setHidden(false,f.at);}
    if(mode==='cleared')f.s.clear(f.at);
  }return 0;});
  f.step(45000);assert.equal(f.s.snails.length,0,`${phase}/${mode}`);assert.equal(f.s.counts.spawned,0);assert(calls<=5);
}
for(const phase of [1,2,4]){
  const f=fixture();f.water();let calls=0;f.setDraw(()=>{if(calls++===phase)f.ecology.clearPuddles();return calls===2?.375:0;});
  f.step(45000);assert.equal(f.s.snails.length,0,'removed wet source consumes the attempt');
}
{
  const f=fixture();f.water();f.check(0);f.step(1000);f.s.spawnSimulated();const calls=f.calls;
  f.step(44000);assert.equal(f.s.snails.length,2);assert.equal(f.calls,calls,'cap skips selection and wetness work');
}
for(const mode of ['hidden','stalled','backwards','reseed']){
  const f=fixture();f.water();const s=f.check(0);f.step(1000);
  if(mode==='hidden'){f.s.setHidden(true);f.jump(60000);f.s.setHidden(false,f.at);}
  if(mode==='stalled')f.jump(1501);if(mode==='backwards')f.jump(-1);
  if(mode==='reseed'){f.garden.clear();f.step(3000);}
  assert.equal(f.s.snails.length,0);assert.equal(s.source,null);assert(s.grazes.every(x=>x===null));
  const checks=f.s.counts.checks;f.step(1000);assert.equal(f.s.counts.checks,checks);
}
console.log('PASS: rain-responsive snails dry/wet boundaries, current local puddle thresholds/identity/drainage, uniform log choice, one consumed attempt, reentrant log/water/visibility cleanup, cap/no replay, shared frog validation and unchanged water.');
