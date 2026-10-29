// Log wildlife, deliberately separate from the collectible first-seen snail.
(function(){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const core=common?require('./garden-core.js'):window.PacketGardenCore;
  const ecologyCore=common?require('./garden-ecology.js'):window.PacketGardenEcology;
  const config=Object.freeze({checkEveryMs:45000,chance:.25,maxActive:2,lifetimeMs:75000,departureMs:3000,
    maxTickGapMs:1500,maxGrazes:2,grazeAges:Object.freeze([25000,53000]),radiusCells:1.5,padding:12});
  const ring=Object.freeze([[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]].map(Object.freeze));
  const walks=Object.freeze([[2000,22000],[28000,50000],[56000,72000]].map(Object.freeze));
  function seededRandom(seed){
    seed??=globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0]??(Date.now()^0x736e6169);
    return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  function positionAt(snail,at,reduced=false){
    const age=Math.max(0,at-snail.createdAt);let point=snail.points[0],direction=snail.direction,heading=snail.heading,moving=false;
    for(let i=0;i<walks.length;i++){
      const [start,end]=walks[i];if(age<start)break;
      const from=snail.points[i],to=snail.points[i+1];let t=Math.min(1,(age-start)/(end-start));
      if(from.x!==to.x||from.y!==to.y){heading=Math.atan2(to.y-from.y,to.x-from.x);direction=Math.cos(heading)<-1e-6?-1:1;}
      moving=!reduced&&t<1&&(from.x!==to.x||from.y!==to.y);
      if(reduced)t=Math.floor(t*4)/4;
      point={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};
    }
    return{x:point.x,y:point.y,direction,heading,moving};
  }
  function visualState(snail,at=Date.now(),reduced=false){
    const leaveAt=snail.leaveAt??snail.expiresAt-config.departureMs;
    let pose=positionAt(snail,Math.min(at,leaveAt),reduced),alpha=Math.min(1,Math.max(0,(at-snail.createdAt)/700));
    if(at>=leaveAt){
      const progress=Math.min(1,Math.max(0,(at-leaveAt)/config.departureMs)),from=snail.leaveFrom??positionAt(snail,leaveAt,reduced);
      const endX=Math.max(config.padding,Math.min(core.dimensions.width-config.padding,from.x+Math.cos(from.heading)*4));
      const endY=Math.max(config.padding,Math.min(core.dimensions.height-config.padding,from.y+Math.sin(from.heading)*4));
      pose={x:from.x+(reduced?0:(endX-from.x)*progress),y:from.y+(reduced?0:(endY-from.y)*progress),direction:from.direction,heading:from.heading,moving:false};alpha=(snail.leaveAlpha??1)*(1-progress);
    }
    const nibbling=snail.nibbledAt!==null&&at>=snail.nibbledAt&&at<snail.nibbledAt+1400&&at<leaveAt;
    const frame=nibbling?'nibble':pose.moving?`crawl${Math.floor((at-snail.createdAt)/1400)%2}`:'crawl0';
    return{...pose,alpha,rotation:pose.heading-(pose.direction<0?Math.PI:0),frame:`log-snail:${snail.variant}:${frame}`,
      stretch:reduced||!pose.moving?1:1+Math.sin((at-snail.createdAt)/1800)*.015,
      bodyY:reduced||!pose.moving?0:Math.sin((at-snail.createdAt)/2100)*.15};
  }
  function createModel({now=Date.now,random=seededRandom(),getTerrain=()=>null,getEcology=()=>null,
    getReducedMotion=()=>false,onChange=()=>{}}={}){
    const snails=[],acknowledged=new WeakSet();let nextId=0,lastTickAt=now(),nextCheckAt=now()+config.checkEveryMs,hidden=false;
    const counts={checks:0,spawned:0,removed:0,attempts:0,grazed:0,skipped:0};
    const notify=(kind,item,reason)=>onChange({kind,item,reason});
    function eligibleLog(log,at){
      const terrain=getTerrain();
      return Boolean(log?.type==='fallen_log'&&Number.isInteger(log.id)&&log.id>0
        &&Number.isInteger(log.column)&&log.column>=0&&log.column<core.dimensions.columns
        &&Number.isInteger(log.row)&&log.row>=0&&log.row<core.dimensions.rows&&log.cell===log.row*core.dimensions.columns+log.column
        &&Number.isFinite(log.createdAt)&&Number.isFinite(log.expiresAt)&&at>=log.createdAt&&at<log.expiresAt
        &&terrain?.byCell.get(log.cell)===log&&terrain.logs.includes(log));
    }
    const eligibleLogs=(at=now(),simulatedOnly=false)=>(getTerrain()?.logs??[]).filter(log=>eligibleLog(log,at)&&(!simulatedOnly||log.simulated));
    function validSource(snail,at){const t=snail.source,log=t?.log;return Boolean(log&&['id','cell','column','row','createdAt','expiresAt'].every(k=>t[k]===log[k])&&eligibleLog(log,at));}
    const release=snail=>{snail.source=null;snail.grazes.fill(null);};
    function remove(snail,reason){const index=snails.indexOf(snail);if(index<0)return false;snails.splice(index,1);release(snail);counts.removed++;notify('log-snail-removed',snail,reason);return true;}
    function clear(at=now(),reason='cleared'){while(snails.length)remove(snails.at(-1),reason);lastTickAt=at;nextCheckAt=at+config.checkEveryMs;}
    function safeClock(at){if(at<lastTickAt||at-lastTickAt>config.maxTickGapMs){clear(at,'suspended');return false;}return true;}
    function depart(snail,at,reason){
      if(snail.leaveAt!==null)return;
      const leaveAt=Math.min(at,snail.expiresAt-config.departureMs);
      snail.leaveFrom=positionAt(snail,leaveAt,getReducedMotion());snail.leaveAlpha=Math.min(1,Math.max(0,(leaveAt-snail.createdAt)/700));snail.leaveAt=leaveAt;release(snail);notify('log-snail-updated',snail,reason);
    }
    function sourceRemoved(log,at=now()){for(const snail of snails)if(snail.source?.log===log)depart(snail,at,'source-removed');}
    function grassEligible(p,column,row,at,origin){
      return p&&p.column===column&&p.row===row&&Number.isFinite(p.createdAt)&&Number.isFinite(p.lastInfluencedAt)
        &&at>=p.createdAt&&Math.hypot(column-origin.column,row-origin.row)>0
        &&Math.hypot(column-origin.column,row-origin.row)<=config.radiusCells
        &&ecologyCore.grassVisualState(p,at).stage!=='expired';
    }
    function spawn(at=now(),simulatedOnly=false,candidates=eligibleLogs(at,simulatedOnly)){
      if(hidden||snails.length>=config.maxActive||!candidates.length)return null;
      const log=candidates[Math.floor(random()*candidates.length)];if(!eligibleLog(log,at)||simulatedOnly&&!log.simulated)return null;
      const origin={column:log.column,row:log.row},valid=ring.map(([dx,dy],index)=>({index,column:log.column+dx,row:log.row+dy}))
        .filter(p=>p.column>=0&&p.column<32&&p.row>=0&&p.row<20);
      let index=valid[Math.floor(random()*valid.length)]?.index;if(index===undefined)return null;
      let direction=random()<.5?-1:1;const points=[];
      for(let i=0;i<4;i++){
        const p=valid.find(p=>p.index===index);points.push({x:(p.column+.5)*30,y:(p.row+.5)*30,column:p.column,row:p.row});
        let next=(index+direction+8)%8;if(!valid.some(p=>p.index===next)){direction=-direction;next=(index+direction+8)%8;}
        index=valid.some(p=>p.index===next)?next:index;
      }
      // Only two future pause cells are selected, once, from the real ecology.
      const grass=getEcology()?.grassCells??[],grazes=points.slice(1,3).map(p=>{
        const patch=grass.find(g=>g.column===p.column&&g.row===p.row);
        return grassEligible(patch,p.column,p.row,at,origin)?{patch,column:p.column,row:p.row}:null;
      });
      const snail={id:++nextId,type:'log-snail',source:{log,id:log.id,cell:log.cell,column:log.column,row:log.row,createdAt:log.createdAt,expiresAt:log.expiresAt},
        origin,points,grazes,nextGraze:0,attempts:0,grazed:0,nibbledAt:null,variant:Math.min(2,Math.floor(random()*3)),
        heading:Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x),direction:Math.sign(points[1].x-points[0].x)||1,
        createdAt:at,expiresAt:at+config.lifetimeMs,leaveAt:null,leaveFrom:null,leaveAlpha:null,simulated:simulatedOnly};
      snails.push(snail);counts.spawned++;notify('log-snail-added',snail,simulatedOnly?'simulated':'log-wildlife');return snail;
    }
    function graze(snail,at){
      if(!snails.includes(snail)||snail.leaveAt!==null||!validSource(snail,at))return;
      while(snail.nextGraze<config.maxGrazes&&at>=snail.createdAt+config.grazeAges[snail.nextGraze]){
        const index=snail.nextGraze++,target=snail.grazes[index];snail.grazes[index]=null;snail.attempts++;counts.attempts++;
        const ecology=getEcology(),patch=target?.patch;
        // Consume a stale/missing attempt. Never substitute the current cell occupant.
        if(!target||!validSource(snail,at)||!ecology?.grassCells.includes(patch)
          ||ecology.grassCells.find(g=>g.column===target.column&&g.row===target.row)!==patch
          ||!grassEligible(patch,target.column,target.row,at,snail.origin)){counts.skipped++;continue;}
        if(ecology.removeGrassCell(target.column,target.row)===patch){snail.grazed++;counts.grazed++;snail.nibbledAt=at;if(snails.includes(snail))notify('log-snail-updated',snail,'grazed');}
        else counts.skipped++;
        if(!snails.includes(snail)||snail.leaveAt!==null)break; // Removal observers may clear/depart synchronously.
      }
    }
    function advance(at=now()){
      if(hidden||!safeClock(at))return;
      for(const snail of [...snails]){
        if(at>=Math.min(snail.expiresAt,(snail.leaveAt??Infinity)+config.departureMs)){remove(snail,'departed');continue;}
        if(snail.leaveAt===null&&!validSource(snail,at))depart(snail,at,'source-invalid');
        if(snail.leaveAt===null&&at>=snail.expiresAt-config.departureMs)depart(snail,at,'visit-complete');
      }
    }
    function tick(at=now()){
      if(hidden||!safeClock(at))return;lastTickAt=at;advance(at);
      for(const snail of [...snails])graze(snail,at);
      if(at<nextCheckAt)return;nextCheckAt=at+config.checkEveryMs;
      if(snails.length>=config.maxActive)return;const candidates=eligibleLogs(at);if(!candidates.length)return;
      counts.checks++;if(random()<config.chance)spawn(at,false,candidates);
    }
    function clickable(snail,at){return !hidden&&at>=lastTickAt&&at-lastTickAt<=config.maxTickGapMs&&snails.includes(snail)
      &&at>=snail.createdAt&&at<snail.expiresAt&&(snail.leaveAt!==null||validSource(snail,at))&&visualState(snail,at).alpha>0;}
    return{snails,counts,eligibleLogs,sourceRemoved,tick,advance,clear,
      setHidden(value,at=now()){hidden=value;clear(at,value?'hidden':'resumed');},
      spawnSimulated(at=now()){if(!safeClock(at))lastTickAt=at;return spawn(at,true);},
      hitAt(point,at=now(),reduced=false){if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
        for(let i=snails.length-1;i>=0;i--){const s=snails[i];if(!clickable(s,at))continue;const p=visualState(s,at,reduced),dx=point.x-p.x,dy=point.y-p.y-p.bodyY;
          const x=dx*Math.cos(p.rotation)+dy*Math.sin(p.rotation),y=-dx*Math.sin(p.rotation)+dy*Math.cos(p.rotation);if((x/8)**2+(y/6)**2<=1)return s;}return null;},
      click(snail,at=now()){if(!clickable(snail,at)||acknowledged.has(snail))return false;acknowledged.add(snail);return true;},
      get nextCheckAt(){return nextCheckAt;}};
  }
  const frameKeys=Object.freeze(Array.from({length:3},(_,i)=>['crawl0','crawl1','nibble'].map(p=>`log-snail:${i}:${p}`)).flat());
  function draw(P,key,g=new P.Graphics()){
    const [,variant,pose]=key.split(':'),nibble=pose==='nibble',stretch=pose==='crawl1'?.5:0,shell=[0x937247,0x77804d,0xa17b59][Number(variant)];
    g.ellipse(16,20,6,1).fill({color:0x263324,alpha:.22});g.ellipse(16+stretch,18.5,6+stretch,1.5).fill(0xc4bf99);
    g.ellipse(20.5+stretch,nibble?19:17.5,2,1.8).fill(0xd2cdaa);
    g.moveTo(21,17).lineTo(22,nibble?15:12).moveTo(21,17).lineTo(24,nibble?16:13).stroke({color:0xc4bf99,width:.7});
    g.circle(22,nibble?15:12,.45).circle(24,nibble?16:13,.45).fill(0x48503a);
    g.circle(14,15,4).fill(shell).stroke({color:0x514632,width:.6});
    for(let i=0;i<=24;i++){const a=i/24*Math.PI*4,r=2.8*(1-i/29),x=14+Math.cos(a)*r,y=15+Math.sin(a)*r;if(i===0)g.moveTo(x,y);else g.lineTo(x,y);}
    g.stroke({color:0x4c4631,width:.65});g.ellipse(12.5,12.5,1.1,.5).fill({color:0xd4c398,alpha:.5});return g;
  }
  const api={config,seededRandom,positionAt,visualState,createModel,frameKeys,draw};
  if(common)module.exports=api;else window.PacketGardenLogSnails=api;
})();
