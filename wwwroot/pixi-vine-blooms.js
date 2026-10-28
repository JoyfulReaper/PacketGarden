// Separate Pixi-only vine cosmetics; never draw from gameplay or broadleaf RNG.
(function () {
  'use strict';
  const chance=.15;
  const colors=Object.freeze(['Soft pink','Lavender','Pale yellow','White']);
  const tints=Object.freeze([0xe8b8c8,0xc9bcdf,0xefdda2,0xf1eee3]);
  function createRandom() {
    const entropy=new Uint32Array(1);
    if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(entropy);
    else entropy[0]=(Date.now()^Math.floor((globalThis.performance?.now?.()??0)*1000)^0x19e15eed)>>>0;
    let seed=entropy[0];
    return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  const random=createRandom();
  function assign(specimen,draw=random) {
    if(specimen.type!=='vine')return null;
    if(Object.hasOwn(specimen,'vineBloom')){
      const trait=specimen.vineBloom;
      if(trait!==null&&(!Number.isInteger(trait?.color)||trait.color<0||trait.color>3
        ||!Number.isInteger(trait.layout)||trait.layout<0||trait.layout>1))throw Error('Invalid vine bloom fixture');
      return trait;
    }
    const roll=draw(),variant=Math.floor(roll/chance*8);
    const trait=roll>=0&&roll<chance?Object.freeze({color:variant%4,layout:Math.floor(variant/4)}):null;
    Object.defineProperty(specimen,'vineBloom',{value:trait});return trait;
  }
  function point(curve,t) {
    const u=1-t,[x0,y0,x1,y1,x2,y2,x3,y3]=curve;
    return {x:u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3,
      y:u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3};
  }
  function flower(g,x,y,size=1,angle=0) {
    // Slim pointed petals distinguish these from the broadleaf's rounded clusters.
    for(let i=0;i<5;i++){
      const a=angle+i*Math.PI*2/5-Math.PI/2;
      const p=(along,across)=>[x+(Math.cos(a)*along-Math.sin(a)*across)*size,
        y+(Math.sin(a)*along+Math.cos(a)*across)*size];
      g.moveTo(x,y).quadraticCurveTo(...p(1.05,-1),...p(3.05,0))
        .quadraticCurveTo(...p(1.05,1),x,y).fill(0xf7f5eb);
    }
    g.circle(x,y,.9*size).fill(0x705b40).circle(x-.12*size,y-.16*size,.4*size).fill(0xe0cf91);
  }
  function group(P,shape,layout) {
    const g=new P.Graphics(),{lean,top,side}=shape;
    const main=[0,-1,-9,-9,9+lean,-13,lean,top];
    const branch=[-1,-9,side*6,-8,side*15,-18,side*10,-20];
    const curl=[side*10,-20,side*6,-23,side*4,-17,side*8,-17];
    const sites=layout===0?[[main,.77],[curl,.6]]:[[main,.35],[main,.88],[branch,.5],[curl,.72]];
    sites.forEach(([curve,t],i)=>{
      const at=point(curve,t),size=.77+(i%3)*.07;
      g.moveTo(at.x,at.y).quadraticCurveTo(at.x+.5,at.y-.6,at.x+.25,at.y-1.1).stroke({color:0x718469,width:.45});
      flower(g,at.x+.25,at.y-1.1,size,(i%2)*.24);
    });
    return g;
  }
  function linkTile(P) { const g=new P.Graphics();flower(g,0,-1,.78,.18);return g; }
  function active(specimen) {
    return specimen?.type==='vine'&&!specimen.mutation&&specimen.poppyMutation?.state!=='active'&&specimen.vineBloom
      &&(specimen.stage==='mature'||specimen.stage==='fading');
  }
  function style(sprite,specimen,link=false) {
    const fading=specimen.stage==='fading',color=tints[specimen.vineBloom.color];
    sprite.scale.set(fading?.66:1);sprite.alpha=fading?(link?.38:.55):1;
    sprite.tint=fading?[16,8,0].reduce((result,shift)=>result|
      Math.round((color>>shift&255)*.65+(0xb4a99a>>shift&255)*.35)<<shift,0):color;
  }
  function fixtureEntries(at,mode='stages') {
    const dense=mode==='dense',connected=mode==='connected',count=dense?640:connected?33:20;
    return Array.from({length:count},(_,i)=>{
      const row=Math.floor(i/4),isolated=connected&&i===32;
      const age=dense||connected?65000:[65000,10000,40000,65000,500000][row];
      return {type:'vine',column:dense?i%32:connected?(isolated?3:10+i%8):5+(i%4)*7,
        row:dense?Math.floor(i/32):connected?(isolated?15:6+Math.floor(i/8)):3+row*3,
        vigor:i%4,colorVariant:(i+row)%5,createdAt:at-age,
        vineBloom:(!dense&&!connected&&row===0)||(connected&&i%7===0&&!isolated)?null:Object.freeze({color:i%4,layout:row%2}),
        origin:{kind:'simulated',eventType:'vine-bloom-fixture'}};
    });
  }
  const api={chance,colors,tints,createRandom,random,assign,point,flower,group,linkTile,active,style,fixtureEntries};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenVineBlooms=api;
})();
