// Bounded secondary reactions. The authoritative specimen is never modified.
(function () {
  'use strict';
  const garden=typeof module!=='undefined'&&module.exports?require('./garden-core.js'):window.PacketGardenCore;
  const config=Object.freeze({chance:.2,durationMs:12000,cooldownMs:15000,maxActive:3,maxTickGapMs:5000});
  function createRandom(){
    const entropy=new Uint32Array(1);
    if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(entropy);
    else entropy[0]=(Date.now()^Math.floor((globalThis.performance?.now?.()??0)*1000)^0xb100f3ed)>>>0;
    let seed=entropy[0];return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  const keys=['id','type','cell','column','row','createdAt'];
  function createModel({garden:model,now=Date.now,random=createRandom(),onChange=()=>{}}){
    const active=new Map(),counts={successful:0,cancelled:0,completed:0};
    let nextAt=-Infinity,lastAt=null,hidden=false,disposed=false,reducedMotion=false;
    const increment=key=>{counts[key]=Math.min(Number.MAX_SAFE_INTEGER,counts[key]+1);};
    function eligible(p,at,ignoreActive=false){
      return p?.type==='flower'&&p.stage==='mature'&&garden.lifecycleStage(p,at)==='mature'
        &&!p.mutation&&!p.pendingMutation&&!p.poppyMutation&&!p.protected&&!p.special
        &&!p.temporaryBloom&&!p.trafficBloom&&(ignoreActive||!active.has(p))
        &&Number.isInteger(p.id)&&Number.isFinite(p.createdAt)
        &&Number.isInteger(p.column)&&p.column>=0&&p.column<32&&Number.isInteger(p.row)&&p.row>=0&&p.row<20
        &&p.cell===p.row*32+p.column&&model.byCell.get(p.cell)===p&&model.specimens.includes(p)
        &&!model.terrain.isBlocked(p.cell);
    }
    function exact(record,at){
      const p=record.source;
      return keys.every(k=>p[k]===record[k])&&eligible(p,at,true);
    }
    function remove(p,reason='removed'){
      const record=active.get(p);if(!record)return false;
      active.delete(p);increment(reason==='completed'?'completed':'cancelled');onChange({kind:'removed',record,reason});return true;
    }
    function clear(reason='cleared'){for(const p of active.keys())remove(p,reason);}
    function opacity(record,at){return record.stage==='fade'?(reducedMotion?.35:Math.max(0,(record.expiresAt-at)/4000)*.95):.95;}
    function tick(at=now()){
      if(disposed)return false;
      if(!Number.isFinite(at)||lastAt!==null&&(at<lastAt||at-lastAt>config.maxTickGapMs)){
        clear('clock-discontinuity');lastAt=Number.isFinite(at)?at:null;
        nextAt=Number.isFinite(at)?at+config.cooldownMs:Infinity;return false;
      }
      lastAt=at;
      for(const [p,record] of active){
        if(!exact(record,at))remove(p,'source-changed');
        else if(at>=record.expiresAt)remove(p,'completed');
        else {
          const previous=record.stage,previousAlpha=record.alpha;record.stage=stageAt(record,at);record.alpha=opacity(record,at);
          if(record.stage!==previous||record.alpha!==previousAlpha)onChange({kind:'updated',record});
        }
      }
      return !hidden;
    }
    function start(p,at,age=0){
      const record={source:p,...Object.fromEntries(keys.map(k=>[k,p[k]])),created:at-age,expiresAt:at-age+config.durationMs};
      if(disposed||hidden||active.size>=config.maxActive||!eligible(p,at))return null;
      record.stage=stageAt(record,at);record.alpha=opacity(record,at);active.set(p,record);increment('successful');onChange({kind:'added',record});return record;
    }
    function consider(event,at=now(),draw=random){
      if(disposed||!tick(at)||event?.specimenType!=='flower'||at<nextAt||active.size>=config.maxActive||!model.isSaturated())return null;
      const candidates=model.specimens.filter(p=>eligible(p,at)).map(p=>({source:p,...Object.fromEntries(keys.map(k=>[k,p[k]]))}));if(!candidates.length)return null;
      const roll=draw();if(!Number.isFinite(roll)||roll<0||roll>=config.chance)return null;
      const selection=draw();if(!Number.isFinite(selection)||selection<0||selection>=1)return null;
      const original=candidates[Math.floor(selection*candidates.length)],p=original.source;
      // RNG injection and callbacks may mutate the garden. Never transfer to an occupant at the same cell.
      if(disposed||hidden||!model.isSaturated()||at<nextAt||active.size>=config.maxActive||!keys.every(k=>p[k]===original[k]))return null;
      if(!eligible(p,at))return null;
      nextAt=at+config.cooldownMs;return start(p,at);
    }
    return {active,counts,tick,consider,remove,clear,
      setHidden(value,at=now()){hidden=Boolean(value);if(hidden)clear('hidden');lastAt=at;},
      // Reduced motion keeps a discrete fading pose; normal opacity advances only on the logical tick.
      setReducedMotion(value){reducedMotion=Boolean(value);tick(now());},
      snapshot(){return {...counts,active:active.size,reducedMotion,cooldownUntil:Number.isFinite(nextAt)?nextAt:null};},
      // Explicit diagnostic preview only; never scheduled or reachable from event handling.
      preview(p,age=0,at=now()){
        if(disposed||hidden||active.size>=config.maxActive||p?.origin?.kind!=='simulated'||p.origin.eventType!=='traffic-bloom-fixture'
          ||!Number.isFinite(age)||age<0||age>=config.durationMs)return null;
        return start(p,at,age);
      },
      destroy(){disposed=true;clear('destroyed');}
    };
  }
  function stageAt(record,at){const age=at-record.created;return age<2000?'bud':age<8000?'open':'fade';}
  // Three finite white tiles are tinted with the source's complementary pastel palette.
  function tile(P,stage){
    const g=new P.Graphics(),x=7,y=-15;
    g.moveTo(2,-7).quadraticCurveTo(7,-10,x,y).stroke({color:0x82976c,width:.8});
    if(stage==='bud')g.ellipse(x,y,1.7,2.3).fill(0xfff7ed);
    else {
      for(const [dx,dy] of [[-2,-1],[1,-2],[2,1]])g.ellipse(x+dx,y+dy,2.1,1.8).fill(0xfff7ed);
      g.circle(x,y,1).fill(0xe7cc8b);
    }
    return g;
  }
  const tints=[0xf4d4df,0xf5dfbc,0xe0d7f4,0xf5d7df,0xd4e6f3];
  const api={config,createRandom,createModel,stageAt,tile,tints};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenTrafficBlooms=api;
})();
