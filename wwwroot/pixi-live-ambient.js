// Finite Pixi artwork and persistent views for shared ambient objects. No lifecycle rules.
(function () {
  'use strict';
  const ambientCore = typeof module !== 'undefined' && module.exports ? require('./garden-ambient.js') : window.PacketGardenAmbient;
  const frogCore = typeof module !== 'undefined' && module.exports ? require('./garden-frogs.js') : window.PacketGardenFrogs;
  const snailCore = typeof module !== 'undefined' && module.exports ? require('./garden-log-snails.js') : window.PacketGardenLogSnails;
  function makeAmbientAtlas(P, renderer) {
    const sheet = new P.Container(), keys = [...ambientCore.curiosityTypes, ...Object.keys(ambientCore.dropTypes), ...(frogCore?.frames.keys()??[]),...(snailCore?.frameKeys??[])];
    for (const [i, type] of keys.entries()) {
      const g = new P.Graphics();
      if(type.startsWith('log-snail:'))snailCore.draw(P,type,g);
      else if (type.startsWith('frog:')) {
        for(const [shape,x,y,a,b,color,width] of frogCore.frames.get(type)) {
          if(shape==='line')g.moveTo(x+16,y+16).lineTo(a+16,b+16).stroke({color,width});
          else if(shape==='circle')g.circle(x+16,y+16,a).fill(b);
          else g.ellipse(x+16,y+16,a,b).fill(color);
        }
      } else if (type === 'ladybug') {
        for (const y of [-2,0,2]) g.moveTo(11,16+y).lineTo(21,16+y);
        g.stroke({color:0x292725,width:1});g.circle(16,12.5,2).fill(0x292725);
        g.ellipse(16,16,3.5,4).fill(0xd35243);g.moveTo(16,13).lineTo(16,20).stroke({color:0x292725,width:1});
        for (const x of [-1.8,1.8]) for (const y of [-1,1.5]) g.circle(16+x,16+y,.7).fill(0x292725);
      } else if (type === 'snail') {
        g.ellipse(16,18.5,6,1.7).fill(0xb5ab83);
        g.moveTo(20,18).lineTo(21,14).moveTo(20,18).lineTo(23,15).stroke({color:0xb5ab83,width:1});
        g.circle(14.5,16,3.7).fill(0xb38359);
        for (let j=0;j<=32;j++) { const a=j/32*Math.PI*4,r=2.5*(1-j/38),x=14.5+Math.cos(a)*r,y=16+Math.sin(a)*r;
          if(j===0)g.moveTo(x,y);else g.lineTo(x,y); }
        g.stroke({color:0x674b39,width:1});
      } else if (type === 'moth') {
        g.ellipse(13,16,3.5,3).ellipse(19,16,3.5,3).fill(0xe2e3d1);
        g.moveTo(16,13).lineTo(16,19).stroke({color:0x928f77,width:1.2});
        g.moveTo(14,12).lineTo(16,14).lineTo(18,12).stroke({color:0x928f77,width:.7});
      } else if (type === 'shiny_pebble') {
        g.poly([12,18,13,14,17,13,20,16,19,19]).fill(0xa9aaa1);
        g.moveTo(14,15).lineTo(17,14).lineTo(18,16).stroke({color:0xcecec0,width:1});
      } else if (type === 'gnome_underpants') {
        const art=ambientCore.underpantsArt;
        g.poly(art.body.map((v,i)=>v+16)).fill(0xf2efe3).stroke({color:0xa5aba0,width:1});
        for(const [x,y,endX,endY] of art.lines)g.moveTo(x+16,y+16).lineTo(endX+16,endY+16);
        g.stroke({color:0xa5aba0,width:1});
      } else if (type === 'opium_pod') {
        // Sage seed capsule with a flat, scalloped crown; static and distinct from a leaf bud.
        g.ellipse(16, 21, 5.5, 1.3).fill({ color: 0x293729, alpha: .28 });
        g.moveTo(16, 19).quadraticCurveTo(17, 21, 16, 23).stroke({ color: 0x8f9e70, width: 1.4 });
        g.ellipse(16, 15, 4.5, 5.7).fill(0x4e6955).stroke({ color: 0xb1bc8f, width: .8 });
        g.ellipse(15, 14.6, 3, 4.3).fill(0x91a783);
        g.moveTo(17.5, 11.8).quadraticCurveTo(19, 16, 16.8, 19).stroke({ color: 0x71866b, width: .8 });
        g.ellipse(14.2, 13.3, .8, 2).fill({ color: 0xd0d7b0, alpha: .7 });
        g.poly([11.2,9.4,13.2,9,13.5,7.5,15.4,8.7,17,7.6,18,9,20.5,9.5,18.8,11,13.5,11])
          .fill(0xa3b08a).stroke({ color: 0x526c56, width: .7 });
        g.moveTo(13.5, 9.7).lineTo(18, 9.7).stroke({ color: 0xd3d8b4, width: .65 });
      } else if (type === 'ditch_weed_bud') {
        g.ellipse(16,16,4.5,5).fill(0x39462b);
        for (const [color,x,y,cx,cy,tx,ty,ex,ey] of ambientCore.weedBudLeaves) {
          g.moveTo(16+x,16+y).quadraticCurveTo(16+cx,16+cy,16+tx,16+ty)
            .quadraticCurveTo(16+ex,16+ey,16+x,16+y).fill(color);
        }
      } else {
        g.rect(14.7,15,2.6,6).fill(0xede4cd);
        g.moveTo(10,13.5).bezierCurveTo(10,8.8,22,8.8,22,13.5)
          .quadraticCurveTo(22,15.5,16,15.5).quadraticCurveTo(10,15.5,10,13.5).fill(0xd84739);
        for(const [x,y] of [[-3,-3.5],[0,-4.5],[3,-3.5],[-1.5,-1.7],[2,-1.7]])g.circle(16+x,16+y,.7).fill(0xfff2dd);
      }
      g.position.set(i*32,0); sheet.addChild(g);
    }
    const atlas = renderer.generateTexture({target:sheet,frame:new P.Rectangle(0,0,keys.length*32,32),resolution:2});
    for (const graphic of [...sheet.children]) graphic.destroy({ context: true });
    sheet.destroy({children:true});
    const frames = new Map(keys.map((key,i)=>[key,new P.Texture({source:atlas.source,frame:new P.Rectangle(i*32,0,32,32)})]));
    return {frames,atlas,destroy(){for(const frame of frames.values())frame.destroy(false);atlas.destroy(true);}};
  }
  function createAmbientView(P, curiosityLayer, dropLayer, frames) {
    const curiosityViews = new Map(), dropViews = new Map();
    function transform(item,sprite,at,curiosity) {
      const position = curiosity ? ambientCore.curiosityPosition(item,at) : ambientCore.looseDropPosition(item,at);
      sprite.position.set(position.x,position.y);
      if(curiosity) {
        const appearance=ambientCore.curiosityAppearance(item,at);
        sprite.rotation=appearance.rotation;
        sprite.scale.set(item.type==='snail'?item.direction:item.type==='moth'?appearance.flutter:1,1);
      }
    }
    return {curiosityViews,dropViews,
      change({kind,item,id},at) {
        const curiosity=kind.startsWith('curiosity-'),views=curiosity?curiosityViews:dropViews;
        if(kind.endsWith('-added')) {
          const sprite=new P.Sprite(frames.get(item.type));sprite.anchor.set(.5);
          (curiosity?curiosityLayer:dropLayer).addChild(sprite);views.set(id,{item,sprite});transform(item,sprite,at,curiosity);
        } else if(kind.endsWith('-removed')) {views.get(id).sprite.destroy();views.delete(id);}
      },
      animate(at) {
        for(const {item,sprite} of curiosityViews.values())transform(item,sprite,at,true);
        for(const {item,sprite} of dropViews.values())transform(item,sprite,at,false);
      },
      snapshot(){return {curiosityViews:curiosityViews.size,dropViews:dropViews.size,ambientTextures:frames.size};},
      destroy(){for(const {sprite} of curiosityViews.values())sprite.destroy();for(const {sprite} of dropViews.values())sprite.destroy();curiosityViews.clear();dropViews.clear();}
    };
  }
  function seedAmbient(model,at,variant=0) {
    model.seed({curiosities:Array.from({length:3},(_,i)=>({type:ambientCore.curiosityTypes[(i+variant)%4],
      createdAt:at,expiresAt:at+ambientCore.curiosityConfig.lifetimeMs,origin:{x:195+i*270,y:255},x:195+i*270,y:235,phase:i*.7,direction:i%2?-1:1})),
    drops:Array.from({length:3},(_,i)=>({type:'amanita_muscaria',createdAt:at,expiresAt:at+ambientCore.dropConfig.lifetimeMs,
      x:285+i*240,y:355,phase:i*.7}))});
  }
  function seedWeedBuds(model, at) {
    // Three shared slots: a nearby bud, then a partially overlapping Amanita/bud pair.
    model.seed({drops:['ditch_weed_bud','amanita_muscaria','ditch_weed_bud'].map((type,i) => ({
      type, createdAt:at, expiresAt:at+ambientCore.dropConfig.lifetimeMs,
      x:[395,545,551][i], y:315, phase:0
    }))});
  }
  function createFrogView(P,layer,frames,getReducedMotion=()=>false) {
    const views=new Map();
    function transform(frog,sprite,at) {
      const pose=frogCore.visualState(frog,at,getReducedMotion());
      sprite.texture=frames.get(pose.frame);sprite.position.set(pose.x,pose.y);sprite.scale.set(pose.direction,1);sprite.alpha=pose.alpha;
    }
    return {views,change({kind,item},at=Date.now()) {
      if(kind==='frog-added'){const sprite=new P.Sprite(frames.get(`frog:${item.variant}:sit`));sprite.anchor.set(.5);sprite.eventMode='none';
        layer.addChildAt(sprite,views.size);views.set(item,sprite);transform(item,sprite,at);}
      else if(kind==='frog-removed'){views.get(item)?.destroy();views.delete(item);}
    },animate(at){for(const [frog,sprite] of views)transform(frog,sprite,at);},
    destroy(){for(const sprite of views.values())sprite.destroy();views.clear();}};
  }
  function createLogSnailView(P,layer,frames,getReducedMotion=()=>false){
    const views=new Map();
    function transform(snail,sprite,at){const p=snailCore.visualState(snail,at,getReducedMotion());
      sprite.texture=frames.get(p.frame);sprite.position.set(p.x,p.y+p.bodyY);sprite.scale.set(p.direction*p.stretch,1);sprite.rotation=p.rotation;sprite.alpha=p.alpha;}
    return{views,change({kind,item},at){
      if(kind==='log-snail-added'){const sprite=new P.Sprite(frames.get(`log-snail:${item.variant}:crawl0`));sprite.anchor.set(.5);sprite.eventMode='none';layer.addChildAt(sprite,0);views.set(item,sprite);transform(item,sprite,at);}
      else if(kind==='log-snail-removed'){views.get(item)?.destroy();views.delete(item);}
      else if(views.has(item))transform(item,views.get(item),at);
    },animate(at){for(const [snail,sprite] of views)transform(snail,sprite,at);},
      destroy(){for(const sprite of views.values())sprite.destroy();views.clear();}};
  }
  const api={makeAmbientAtlas,createAmbientView,createFrogView,createLogSnailView,seedAmbient,seedWeedBuds};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenPixiAmbient=api;
})();
