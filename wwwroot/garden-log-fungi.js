// Attached woodland decay, independent of specimens and their random streams.
(function(){
  'use strict';
  const config=Object.freeze({chance:.35,earlyMs:600000,matureMs:1200000,weatheredMs:2400000,decayMs:3000000,maxLogs:6});
  function seededRandom(seed){
    seed??=globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0]??(Date.now()^0x66756e67);
    return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  function stageAt(age){return age<config.earlyMs?'hidden':age<config.matureMs?'early':age<config.weatheredMs?'mature':'weathered';}
  function createModel({now=Date.now,random=seededRandom(),getTerrain=()=>null,onChange=()=>{}}={}){
    const records=new Map(),decided=new WeakSet();let disposed=false;
    const fields=['id','cell','column','row','createdAt','expiresAt','variant'];
    function valid(record,at){
      const log=record.log,t=getTerrain();
      return Number.isFinite(at)&&log?.type==='fallen_log'&&fields.every(k=>log[k]===record[k])
        &&Number.isInteger(log.id)&&log.id>0&&Number.isInteger(log.column)&&log.column>=0&&log.column<32
        &&Number.isInteger(log.row)&&log.row>=0&&log.row<20&&log.cell===log.row*32+log.column
        &&Number.isFinite(log.createdAt)&&Number.isFinite(log.expiresAt)&&at<log.expiresAt
        &&t?.byCell.get(log.cell)===log&&t.logs.includes(log);
    }
    function forget(log){const r=records.get(log);if(!r)return;records.delete(log);if(r.stage!=='hidden')onChange({kind:'terrain-fungi',terrain:log,stage:'hidden'});}
    function reconcile(r,at){
      if(!valid(r,at)){forget(r.log);return;}
      if(!r.colonized)return;
      const age=at-r.createdAt;
      if(age>=config.decayMs){
        // Release first: synchronous terrain observers may clear/re-enter this model.
        forget(r.log);if(valid(r,at))getTerrain().remove(r.log,'fungal-decay');return;
      }
      const stage=stageAt(age);if(stage===r.stage)return;r.stage=stage;
      onChange({kind:'terrain-fungi',terrain:r.log,stage});
    }
    function sourceAdded(log,at=now(),forced){
      if(disposed||!log||decided.has(log)||records.size>=config.maxLogs)return false;
      const r={log,...Object.fromEntries(fields.map(k=>[k,log[k]])),colonized:false,stage:'hidden'};
      if(!valid(r,at)||at<r.createdAt)return false;
      decided.add(log);const roll=random();
      r.colonized=log.simulated&&typeof forced==='boolean'?forced:Number.isFinite(roll)&&roll>=0&&roll<config.chance;
      records.set(log,r);reconcile(r,at);return true;
    }
    return {records,sourceAdded,sourceRemoved:forget,
      tick(at=now()){
        // Invalid clocks do not discard decisions or turn NaN into a visible stage.
        if(disposed||!Number.isFinite(at))return;
        for(const r of [...records.values()]){
          reconcile(r,at);
        }
      },
      clear(){for(const log of [...records.keys()])forget(log);},
      destroy(){this.clear();disposed=true;}
    };
  }
  const frameKeys=Object.freeze(['early','mature','weathered'].flatMap(stage=>[0,1,2].map(v=>`log-fungi:${v}:${stage}`)));
  function draw(P,variant,stage){
    const g=new P.Graphics(),bend=[0,1,-1][variant],weathered=stage==='weathered',early=stage==='early';
    const positions=[[-5,-5,1],[3,-7+bend,.85],[7,-3,.7],[-1,-3,.9],[5,-9+bend,.65]];
    for(let i=0;i<(early?2:weathered?5:3);i++){
      const [px,y,size]=positions[i],x=px+(variant===2?1:0),r=(early?1.8:3.1)*size;
      // Shallow fans attach along the bark; dark lips sit below cream growth rings.
      g.moveTo(x-r,y).quadraticCurveTo(x-r*1.1,y+2.7*size,x,y+2.6*size)
        .quadraticCurveTo(x+r*1.1,y+2.7*size,x+r,y).lineTo(x,y-.5).lineTo(x-r,y).fill(0x65503a);
      g.moveTo(x-r,y).quadraticCurveTo(x-r,y+1.8*size,x,y+1.8*size)
        .quadraticCurveTo(x+r,y+1.8*size,x+r,y).lineTo(x,y-.7).lineTo(x-r,y).fill(weathered?0xb7a17b:variant===1?0xc2a36a:0xd8c8a0);
      g.moveTo(x-r*.85,y+.4).quadraticCurveTo(x,y+2.2*size,x+r*.85,y+.4).stroke({color:weathered?0xd1c1a0:0xf0e3c5,width:.65});
      if(!early)g.moveTo(x-r*.5,y+.1).quadraticCurveTo(x,y+1.25*size,x+r*.5,y+.1).stroke({color:0x917344,width:.5});
    }
    return g;
  }
  const api={config,seededRandom,stageAt,createModel,frameKeys,draw};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenLogFungi=api;
})();
