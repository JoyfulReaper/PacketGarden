// Reproducible, traffic-free coverage experiment. The baseline is immutable.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const seeded=(seed=17)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function ecology(baseline=false){
  if(!baseline)return require('../wwwroot/garden-ecology.js');
  const Module=require('node:module'),{execFileSync}=require('node:child_process');
  const file=path.resolve('wwwroot/garden-ecology.js'),m=new Module(file,module);m.filename=file;m.paths=module.paths;
  m._compile(execFileSync('git',['show','f4d4e26:wwwroot/garden-ecology.js'],{encoding:'utf8'}),file);return m.exports;
}
function simulate(E,seed,{extinct=false,occupied=new Set(),minutes=40}={}){
  let additions=0;
  const model=E.createEcologyModel({now:()=>0,random:seeded(seed),isCellOccupied:(x,y)=>occupied.has(y*32+x),onChange:e=>{if(e.kind==='grass-added')additions++;}});
  if(!extinct)model.seedInitialGrass(0);
  const samples=[],states={};let maximumAdded=0;
  for(let at=250;at<=minutes*60000;at+=250){
    additions=0;model.tickGrass(at);maximumAdded=Math.max(maximumAdded,additions);
    if([2,5,10,15,20,40].includes(at/60000)){
      const healthy=model.grassCells.filter(c=>at-c.lastInfluencedAt<E.grassConfig.fadingAfterMs).length;
      samples.push({minute:at/60000,patches:model.grassCells.length,healthy,coverage:model.grassCells.length/(640-occupied.size)});
      states[at/60000]=model.grassCells.map(c=>({...c}));
    }
    assert(model.grassCells.length<=640-occupied.size);
    assert(model.grassCells.every(c=>!occupied.has(c.row*32+c.column)));
  }
  return {seed,samples,maximumAdded,states};
}
if(require.main===module){
  const baseline=process.argv.includes('--baseline'),E=ecology(baseline);
  const report={baseline,seeds:[11,82,193,421,901,1234,7301,9983],scenarios:{}};
  for(const [name,options] of Object.entries({quiet:{},extinction:{extinct:true},occupied:{occupied:new Set(Array.from({length:160},(_,i)=>(i*73+7)%640))}})){
    report.scenarios[name]=report.seeds.map(seed=>{const {states,...result}=simulate(E,seed,options);return result;});
  }
  const output=path.resolve('artifacts/grass-lush',baseline?'before':'after');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'coverage.json'),JSON.stringify(report,null,2));
  for(const [name,runs] of Object.entries(report.scenarios))console.log(name,[2,5,10,15,20,40].map(minute=>{
    const values=runs.map(run=>run.samples.find(s=>s.minute===minute).coverage*100);
    return `${minute}m ${Math.min(...values).toFixed(1)}–${Math.max(...values).toFixed(1)}%`;
  }).join('; '));
  if(!baseline){
    for(const run of report.scenarios.quiet){assert(run.samples.find(s=>s.minute===10).coverage>=.75);assert(run.maximumAdded<=E.grassConfig.maxSpreadAttempts+E.grassConfig.maxFadingSeedChecksPerTick+E.grassConfig.maxMaintenanceSeeds);}
  }
}
module.exports={seeded,ecology,simulate};
