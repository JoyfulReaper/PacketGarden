// Cached Canvas-style gnomes; the shared model owns all incident rules.
(function () {
  'use strict';
  const common = typeof module !== 'undefined' && module.exports;
  const core = common ? require('./garden-gnomes.js') : window.PacketGardenGnomes;
  function makeGnomeAtlas(P, renderer) {
    const sheet = new P.Container(), keys = [];
    const poses = [];
    for (const side of ['green','red']) for (const battle of [false,true]) for (const step of [-1,0,1])
      poses.push({side,battle,step,key:`${side}:${battle}:${step}`});
    for (const closed of [false,true]) poses.push({side:'green',battle:false,step:0,clippers:true,closed,key:`clippers:${closed}`});
    for (const side of ['green','red']) poses.push({side,battle:false,step:0,sack:true,key:`sack:${side}`});
    for (const side of ['green','red']) {
      poses.push({side,battle:false,step:0,surprised:true,key:`surprise:${side}`});
      poses.push({side,battle:false,step:0,surprised:true,sack:true,key:`surprise:sack:${side}`});
      poses.push({side,battle:false,step:0,carry:true,key:`carry:${side}`});
      poses.push({side,battle:false,step:0,carry:true,surprised:true,key:`surprise:carry:${side}`});
    }
    poses.push({side:'green',battle:false,step:0,clippers:true,closed:true,surprised:true,key:'surprise:clippers'});
    for (const {side,battle,step,clippers,closed,sack,carry,surprised,key} of poses) {
      const g = new P.Graphics();
      // Same rooted silhouette, dimensions and palette as garden-actors.js.
      g.moveTo(14,24).lineTo(13+step,29).moveTo(18,24).lineTo(19-step,29).stroke({color:0x433c32,width:2});
      g.ellipse(16,20,5,5).fill(side==='green'?0x73805b:0x91664d);
      g.circle(16,15,3.2).fill(0xe0bd92);
      g.poly([13,17,20,17,16,24]).fill(0xe6e1cf);
      g.poly([11,12,17,2,22,12]).fill(side==='green'?0x4b9554:0xc54a49);
      if (battle) g.moveTo(20,20).lineTo(26,13-step*2).stroke({color:0xb5ad87,width:1.5});
      if (carry) {
        const direction=side==='green'?1:-1;
        g.moveTo(16+direction*4,21).lineTo(16+direction*11,18).stroke({color:side==='green'?0x73805b:0x91664d,width:2});
        g.circle(16+direction*11,18,1.4).fill(0xe0bd92);
      }
      if (clippers) {
        for (const [x,y,endX,endY] of core.clipperLines(closed)) g.moveTo(x+16,y+18).lineTo(endX+16,endY+18);
        g.stroke({color:0xd3d8c5,width:1.6});
      }
      if (sack) {
        g.poly(core.sackArt.body.map((v,i)=>v+(i%2?18:16))).fill(0x96734d);
        for(const [x,y,endX,endY] of core.sackArt.lines)g.moveTo(x+16,y+18).lineTo(endX+16,endY+18);
        g.stroke({color:0x604e35,width:1});
        g.rect(14,14,2,1).rect(18,14,2,1).fill(0x433c32);
      }
      if (surprised) {
        g.moveTo(26,4).lineTo(26,9).stroke({color:0xf2efe3,width:1.4});g.circle(26,11.5,.8).fill(0xf2efe3);
      }
      g.position.set(keys.length*40,0);sheet.addChild(g);keys.push(key);
    }
    const splash=new P.Graphics(),art=(common?require('./garden-gnome-puddles.js'):window.PacketGardenGnomePuddles).splashArt;
    for(const [x,y,endX,endY] of art.lines)splash.moveTo(x+16,y+18).lineTo(endX+16,endY+18);
    splash.stroke({color:art.color,width:art.width});splash.position.set(keys.length*40,0);sheet.addChild(splash);keys.push('puddle:splash');
    const atlas = renderer.generateTexture({target:sheet,frame:new P.Rectangle(0,0,keys.length*40,32),resolution:2});
    for(const patch of [...sheet.children])patch.destroy(); // Release owned construction contexts, including the ripple.
    sheet.destroy({children:true});
    const frames = new Map(keys.map((key,i)=>[key,new P.Texture({source:atlas.source,frame:new P.Rectangle(i*40,0,40,32)})]));
    return {frames,atlas,destroy(){for(const frame of frames.values())frame.destroy(false);atlas.destroy(true);}};
  }
  function createGnomeView(P, layer, frames, getReducedMotion = () => false, mushroomVisual = () => null) {
    const views = new Map(),splashes=new Map();let group = null, incident = null, carried = null;
    function change({actors,incident:nextIncident=null}) {
      incident=nextIncident;
      if(carried && !incident?.carried){carried.destroy();carried=null;}
      for (const [actor,sprite] of views) if (!actors.includes(actor)) { sprite.destroy();views.delete(actor); }
      for (const [actor,sprite] of splashes) if (!actors.includes(actor)||!actor.puddleMishap) { sprite.destroy();splashes.delete(actor); }
      if (!actors.length) { if(group)group.destroy();group=null;return; }
      if (!group) {group=new P.Container();group.eventMode='none';layer.addChild(group);}
      if(incident?.carried && !carried){
        const art=mushroomVisual(incident.carried);
        if(art){carried=new P.Sprite(art.texture);carried.anchor.set(.5,.9);carried.scale.set(art.scale);
          carried.eventMode='none';group.addChild(carried);}
      }
      for (const actor of actors) if(!views.has(actor)) {
        const sprite=new P.Sprite(frames.get(`${actor.side}:false:0`));sprite.anchor.set(16/40,18/32);
        group.addChild(sprite);views.set(actor,sprite);
      }
    }
    function animate(at) {
      for(const [actor,sprite] of views) {
        const pose=core.presentation(actor,at,getReducedMotion()),step=pose.step<-.33?-1:pose.step>.33?1:0;
        const key=pose.surprised ? pose.mushroom ? `surprise:carry:${actor.side}` : pose.sack ? `surprise:sack:${actor.side}` : pose.clippers ? 'surprise:clippers' : `surprise:${actor.side}`
          : pose.mushroom ? `carry:${actor.side}` : pose.sack ? `sack:${actor.side}` : pose.clippers ? `clippers:${pose.closed}` : `${actor.side}:${pose.battle}:${step}`;
        sprite.texture=frames.get(key);
        sprite.position.set(pose.x,pose.y);sprite.rotation=pose.rotation;sprite.alpha=pose.alpha;
        if(pose.water){
          if(!splashes.has(actor)){const splash=new P.Sprite(frames.get('puddle:splash'));splash.anchor.set(16/40,18/32);
            splash.eventMode='none';group.addChildAt(splash,0);splashes.set(actor,splash);}
          const splash=splashes.get(actor);splash.position.set(actor.x,actor.y);splash.alpha=pose.water.alpha*pose.alpha;
        }else if(splashes.has(actor)){splashes.get(actor).destroy();splashes.delete(actor);}
      }
      if(carried && views.size===2){
        const actors=[...views.keys()],wobble=getReducedMotion()?0:Math.sin((at-incident.pickupAt)/170);
        carried.position.set((actors[0].x+actors[1].x)/2,(actors[0].y+actors[1].y)/2+4+wobble*.6);
        carried.rotation=wobble*.035;
      }
    }
    return {views,splashes,change,animate,get carried(){return carried;},snapshot(){return {sprites:views.size,carried:carried?1:0,splashes:splashes.size,containers:group?1:0,textures:frames.size};},
      destroy(){change({actors:[]});}};
  }
  const api={makeGnomeAtlas,createGnomeView};
  if(common)module.exports=api;else window.PacketGardenPixiGnomes=api;
})();
