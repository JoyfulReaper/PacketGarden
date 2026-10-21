// Passive puddle wildlife. One bounded logical model; no weather, occupancy or interaction rules.
(function () {
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const ecology=common?require('./garden-ecology.js'):window.PacketGardenEcology;
  const core=common?require('./garden-core.js'):window.PacketGardenCore;
  const {width,height}=core.dimensions;
  const config=Object.freeze({checkEveryMs:45000,chance:.15,maxActive:2,lifetimeMs:60000,
    departureMs:1500,hopMs:650,maxTickGapMs:1500,minWaterSize:8,minWaterOpacity:.12,padding:12});
  function seededRandom(seed) {
    if(seed===undefined){const crypto=globalThis.crypto;seed=crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()^0x6f726f67;}
    return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  const clampPoint=(x,y)=>({x:Math.max(config.padding,Math.min(width-config.padding,x)),y:Math.max(config.padding,Math.min(height-config.padding,y))});
  function waterVisible(puddle,at) {
    if(!puddle || !['x','y','createdAt','lastRefreshedAt','size','maxSize'].every(k=>Number.isFinite(puddle[k]))
      || puddle.createdAt>at || puddle.lastRefreshedAt>at || puddle.x<0 || puddle.x>width || puddle.y<0 || puddle.y>height) return null;
    const state=ecology.puddleVisualState(puddle,at);
    return Number.isFinite(state.size)&&state.size>0&&Number.isFinite(state.opacity)&&state.opacity>0?state:null;
  }
  function usableWater(puddle,at) {
    const state=waterVisible(puddle,at);
    return Boolean(state&&state.size>=config.minWaterSize&&state.opacity>=config.minWaterOpacity);
  }
  function visitPosition(frog,at,reducedMotion) {
    const age=Math.max(0,at-frog.createdAt);let point=frog.points[0],hopping=false,direction=frog.direction;
    for(let i=0;i<frog.hopAges.length;i++) {
      const elapsed=age-frog.hopAges[i];if(elapsed<0)break;
      const from=frog.points[i],to=frog.points[i+1],progress=reducedMotion?1:Math.min(1,elapsed/config.hopMs);
      direction=to.x<from.x?-1:1;hopping=!reducedMotion&&progress<1;
      point={x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress-(hopping?Math.sin(progress*Math.PI)*3:0)};
    }
    if(!hopping&&((age>=18000&&age<20000)||(age>=37000&&age<39000)))direction=-direction;
    return {...point,hopping,direction};
  }
  function visualState(frog,at=Date.now(),reducedMotion=false) {
    const leaveAt=frog.leaveAt??frog.expiresAt-config.departureMs;
    let pose=visitPosition(frog,Math.min(at,leaveAt),reducedMotion),alpha=Math.min(1,Math.max(0,(at-frog.createdAt)/600));
    if(at>=leaveAt) {
      const progress=Math.min(1,(at-leaveAt)/config.departureMs),from=frog.leaveFrom??visitPosition(frog,leaveAt,reducedMotion);
      const to=frog.leaveTo??clampPoint(from.x+frog.direction*10,from.y+5);
      pose={x:from.x+(reducedMotion?0:(to.x-from.x)*progress),y:from.y+(reducedMotion?0:(to.y-from.y)*progress),direction:frog.direction,hopping:false};
      alpha=1-progress;
    }
    return {...pose,alpha,frame:`frog:${frog.variant}:${pose.hopping?'hop':'sit'}`};
  }
  function createModel({now=Date.now,random=seededRandom(),getPuddles=()=>[],onChange=()=>{}}={}) {
    const frogs=[];let nextId=0,nextCheckAt=now()+config.checkEveryMs,lastTickAt=now(),hidden=false;
    const counts={checks:0,spawned:0,removed:0};
    const notify=(kind,item,reason)=>onChange({kind,item,reason});
    function eligiblePuddles(at=now()){return getPuddles().filter(p=>usableWater(p,at));}
    function remove(frog,reason) {
      const index=frogs.indexOf(frog);if(index<0)return false;
      frogs.splice(index,1);counts.removed++;notify('frog-removed',frog,reason);return true;
    }
    function clear(at=now(),reason='cleared'){while(frogs.length)remove(frogs[frogs.length-1],reason);nextCheckAt=at+config.checkEveryMs;lastTickAt=at;}
    function setHidden(value,at=now()){hidden=value;clear(at,value?'hidden':'resumed');}
    function spawn(at=now(),simulated=false,candidates=eligiblePuddles(at)) {
      if(hidden||frogs.length>=config.maxActive||!candidates.length)return null;
      const puddle=candidates[Math.floor(random()*candidates.length)];
      // Keep the exact shared reference; lookalike replacement water never inherits a visitor.
      if(!getPuddles().includes(puddle)||!usableWater(puddle,at))return null;
      const water=ecology.puddleVisualState(puddle,at),radius=Math.min(24,water.size+5);
      let angle=random()*Math.PI*2;
      const points=[clampPoint(puddle.x+Math.cos(angle)*radius,puddle.y+Math.sin(angle)*radius*.65)];
      const hopAges=random()<.5?[10000,28000]:[10000,28000,46000];
      for(const age of hopAges){angle+=(random()<.5?-1:1)*(.35+random()*.3);points.push(clampPoint(puddle.x+Math.cos(angle)*radius,puddle.y+Math.sin(angle)*radius*.65));}
      const frog={id:++nextId,puddle,createdAt:at,expiresAt:at+config.lifetimeMs,variant:Math.floor(random()*3),direction:random()<.5?-1:1,
        points,hopAges,leaveAt:null,leaveFrom:null,leaveTo:null,simulated};
      frogs.push(frog);counts.spawned++;notify('frog-added',frog,simulated?'simulated':'puddle-wildlife');return frog;
    }
    function tick(at=now(),{hidden:isHidden=hidden}={}) {
      if(isHidden){setHidden(true,at);return;}
      if(hidden){setHidden(false,at);return;}
      if(at<lastTickAt||at-lastTickAt>config.maxTickGapMs){clear(at,'suspended');return;}
      lastTickAt=at;const puddles=getPuddles();
      for(const frog of [...frogs]) {
        if(frog.leaveAt===null&&(!puddles.includes(frog.puddle)||!waterVisible(frog.puddle,at))) {
          const position=visualState(frog,at);
          frog.leaveAt=Math.min(at,frog.expiresAt-config.departureMs);frog.leaveFrom=position;
          frog.leaveTo=clampPoint(position.x+frog.direction*10,position.y+5);
        }
        if(at>=Math.min(frog.expiresAt,(frog.leaveAt??Infinity)+config.departureMs))remove(frog,'departed');
      }
      if(at<nextCheckAt)return;
      nextCheckAt=at+config.checkEveryMs;
      if(frogs.length>=config.maxActive)return;
      const candidates=eligiblePuddles(at);if(!candidates.length)return;
      counts.checks++;if(random()<config.chance)spawn(at,false,candidates);
    }
    return {frogs,counts,eligiblePuddles,tick,clear,setHidden,spawnSimulated:(at=now())=>spawn(at,true),
      get nextCheckAt(){return nextCheckAt;}};
  }
  // Finite shared art recipes: three earthy palettes, sitting and extended-leg hop poses.
  const palettes=[0x718746,0x8a8e4d,0x547e62],frames=new Map();
  for(let variant=0;variant<3;variant++)for(const pose of ['sit','hop']) {
    const color=palettes[variant],hop=pose==='hop';
    frames.set(`frog:${variant}:${pose}`,Object.freeze([
      ['ellipse',-5,hop?4:3,hop?3:2.5,hop?1.1:2.3,0x40563b],['ellipse',5,hop?4:3,hop?3:2.5,hop?1.1:2.3,0x40563b],
      ['ellipse',0,0,hop?6:5.5,hop?3.1:4,color],['ellipse',0,2.1,3.4,1.6,0xb1bb7c],
      ['circle',-3,-3,2,color],['circle',3,-3,2,color],['circle',-3,-3.2,1.2,0xeee9c7],['circle',3,-3.2,1.2,0xeee9c7],
      ['circle',-2.6,-3.3,.65,0x28372c],['circle',3.4,-3.3,.65,0x28372c],
      ['circle',-2,-.2,.7,0x40563b],['circle',1,-.8,.8,0x40563b],['circle',3,1,.55,0x40563b],
      ['line',-1.8,1,1.8,1,0x40563b,.65]
    ].map(Object.freeze)));
  }
  const api={config,seededRandom,usableWater,waterVisible,visualState,createModel,frames};
  if(common)module.exports=api;else window.PacketGardenFrogs=api;
})();
