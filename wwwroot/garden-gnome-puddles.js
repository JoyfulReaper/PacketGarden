// Bounded, renderer-neutral water entries. Called only by the gnome logical tick.
(function () {
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const ecology=common?require('./garden-ecology.js'):window.PacketGardenEcology;
  const art=common?require('./garden-puddle-art.js'):window.PacketGardenPuddleArt;
  const config=Object.freeze({chance:.2,durationMs:1000,minSize:8,minOpacity:.12,maxTickGapMs:1500,
    maxSegment:1140,footY:11,maxActors:4,maxPuddles:8});
  function seededRandom(seed) {
    if(seed===undefined)seed=globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0]??(Date.now()^0x77657467);
    return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  // Sample the actual opaque body contour ONCE, then contract toward its center.
  // This deliberately excludes the translucent shore and irregular outer lobes.
  const interiors=art.variants.map(layers=>{
    const points=[];let from;
    for(const [method,...p] of layers[2].path){
      if(method==='moveTo'){from=p;continue;}
      for(let i=1;i<=6;i++){
        const t=i/6,u=1-t;
        points.push([(u*u*from[0]+2*u*t*p[0]+t*t*p[2]-32)*.55,
          (u*u*from[1]+2*u*t*p[1]+t*t*p[3]-32)*.55]);
      }
      from=p.slice(2);
    }
    return points;
  });
  function inside(point,polygon) {
    let hit=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if((a[1]>point.y)!==(b[1]>point.y)&&point.x<(b[0]-a[0])*(point.y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  }
  const cross=(x,y,u,v)=>x*v-y*u;
  function intervals(a,b,polygon) {
    const dx=b.x-a.x,dy=b.y-a.y,cuts=[0,1],ranges=[];
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const p=polygon[j],q=polygon[i],ex=q[0]-p[0],ey=q[1]-p[1],den=cross(dx,dy,ex,ey);
      if(Math.abs(den)<1e-9)continue;
      const t=cross(p[0]-a.x,p[1]-a.y,ex,ey)/den,u=cross(p[0]-a.x,p[1]-a.y,dx,dy)/den;
      if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
    }
    cuts.sort((a,b)=>a-b);
    for(let i=1;i<cuts.length;i++){
      if(cuts[i]-cuts[i-1]<1e-8)continue;
      const middle=(cuts[i]+cuts[i-1])/2;
      if(inside({x:a.x+dx*middle,y:a.y+dy*middle},polygon))ranges.push([cuts[i-1],cuts[i]]);
    }
    return ranges;
  }
  function waterState(p,at) {
    if(!p||!['x','y','seed','size','maxSize','createdAt','lastRefreshedAt'].every(k=>Number.isFinite(p[k]))
      ||p.createdAt>at||p.lastRefreshedAt>at||p.size<0||p.maxSize<=0)return null;
    const state=ecology.puddleVisualState(p,at);
    return state.size>=config.minSize&&state.opacity>=config.minOpacity?state:null;
  }
  function local(point,p,state) {
    const x=(point.x-p.x)*art.referenceSize/state.size,y=(point.y-p.y)*art.referenceSize/state.size,a=p.seed*Math.PI*2;
    return {x:x*Math.cos(a)+y*Math.sin(a),y:-x*Math.sin(a)+y*Math.cos(a)};
  }
  function pathEntry(from,to,p,at) {
    const state=waterState(p,at);if(!state)return false;
    const polygon=interiors[art.variantFor(p)],a=local(from,p,state),b=local(to,p,state);
    return !inside(a,polygon)&&intervals(a,b,polygon).length>0;
  }
  function createModel({getPuddles=()=>[],random=seededRandom()}={}) {
    const records=new Map();let demo=new WeakSet();
    function prune(actors) {
      for(const [actor] of records)if(!actors.includes(actor)){
        delete actor.puddleMishap;delete actor.puddleMishapOccurred;records.delete(actor);
      }
    }
    function suspend() {for(const [actor] of records){delete actor.puddleMishap;}records.clear();demo=new WeakSet();}
    function clear(actors=[...records.keys()]) {for(const actor of actors){delete actor.puddleMishap;delete actor.puddleMishapOccurred;}suspend();}
    function removed(puddle) {
      for(const [actor,record] of records){record.water.delete(puddle);record.inside.delete(puddle);
        if(actor.puddleMishap?.puddle===puddle)delete actor.puddleMishap;}
    }
    function tick(actors,at) {
      prune(actors);
      const puddles=getPuddles().slice(0,config.maxPuddles),water=new Set(puddles);
      for(const actor of actors.slice(0,config.maxActors)){
        const point={x:actor.x,y:actor.y+config.footY},previous=records.get(actor),ranges=[],occupied=new Set();
        const gap=previous?at-previous.at:Infinity,dx=point.x-(previous?.x??point.x),dy=point.y-(previous?.y??point.y);
        const moving=gap>0&&gap<=config.maxTickGapMs&&dx*dx+dy*dy>1e-6&&dx*dx+dy*dy<=config.maxSegment**2;
        const reaction=actor.puddleMishap;
        if(reaction&&(previous&&(gap<0||gap>config.maxTickGapMs)||at>=reaction.until
          ||!water.has(reaction.puddle)||!waterState(reaction.puddle,at)))delete actor.puddleMishap;
        for(const p of puddles){
          const state=waterState(p,at);if(!state)continue;
          if(inside(local(point,p,state),interiors[art.variantFor(p)]))occupied.add(p);
          if(moving&&!actor.puddleMishapOccurred)for(const [start,end] of intervals(local(previous,p,state),local(point,p,state),interiors[art.variantFor(p)]))ranges.push({start,end,p});
        }
        // Merge overlapping pools into continuous water entries. Moving between
        // overlapping patches never grants another roll while boots remain wet.
        ranges.sort((a,b)=>a.start-b.start);const entries=[];
        for(const range of ranges){const last=entries.at(-1);
          if(last&&range.start<=last.end+1e-8){last.end=Math.max(last.end,range.end);last.puddles.add(range.p);}
          else entries.push({...range,puddles:new Set([range.p])});}
        for(let index=0;index<entries.length;index++){
          const {start,p,puddles:joined}=entries[index];
          if(start<=1e-8||actor.puddleMishapOccurred||!previous.water.has(p))continue;
          // A shrinking shore must not manufacture a new entry when both
          // logical samples still put these same boots in the same water.
          if(index===0&&[...joined].some(p=>previous.inside.has(p)))continue;
          const simulated=demo.has(actor);demo.delete(actor);
          if((simulated?0:random())<config.chance&&getPuddles().includes(p)&&waterState(p,at)){
            actor.puddleMishapOccurred=true;actor.puddleMishap={puddle:p,startedAt:at,until:at+config.durationMs,simulated};
          }
        }
        records.set(actor,{...point,at,water,inside:occupied});
      }
    }
    return {tick,clear,suspend,prune,removed,armDemo(actor){demo.add(actor);},get trackedActors(){return records.size;}};
  }
  // Same finite line artwork in both adapters; local to the gnome's ground anchor.
  const splashArt=Object.freeze({color:0xb8d2cd,width:1.1,lines:Object.freeze([
    [-7,10,-4,12],[-4,12,3,12],[3,12,7,10],[-6,8,-3,7],[2,7,6,8],
    [-5,7,-7,4],[0,6,0,3],[5,7,7,4]
  ].map(Object.freeze))});
  function reactionState(actor,at,reduced=false) {
    const event=actor.puddleMishap,age=event?at-event.startedAt:-1;
    if(age<0||age>=config.durationMs)return null;
    const progress=age/config.durationMs;
    return {alpha:1-progress*.8,rotation:reduced?0:Math.sin(progress*Math.PI*2)*.16,
      bounce:reduced?0:-Math.sin(progress*Math.PI)*2};
  }
  const api={config,interiors,inside,pathEntry,waterState,seededRandom,createModel,splashArt,reactionState};
  if(common)module.exports=api;else window.PacketGardenGnomePuddles=api;
})();
