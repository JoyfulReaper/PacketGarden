// Cached Canvas-style gnomes; the shared model owns all incident rules.
(function () {
  'use strict';
  const common = typeof module !== 'undefined' && module.exports;
  const core = common ? require('./garden-gnomes.js') : window.PacketGardenGnomes;
  function makeGnomeAtlas(P, renderer) {
    const sheet = new P.Container(), keys = [];
    for (const side of ['green','red']) for (const battle of [false,true]) for (const step of [-1,0,1]) {
      const g = new P.Graphics();
      // Same rooted silhouette, dimensions and palette as garden-actors.js.
      g.moveTo(14,24).lineTo(13+step,29).moveTo(18,24).lineTo(19-step,29).stroke({color:0x433c32,width:2});
      g.ellipse(16,20,5,5).fill(side==='green'?0x73805b:0x91664d);
      g.circle(16,15,3.2).fill(0xe0bd92);
      g.poly([13,17,20,17,16,24]).fill(0xe6e1cf);
      g.poly([11,12,17,2,22,12]).fill(side==='green'?0x4b9554:0xc54a49);
      if (battle) g.moveTo(20,20).lineTo(26,13-step*2).stroke({color:0xb5ad87,width:1.5});
      g.position.set(keys.length*32,0);sheet.addChild(g);keys.push(`${side}:${battle}:${step}`);
    }
    const atlas = renderer.generateTexture({target:sheet,frame:new P.Rectangle(0,0,keys.length*32,32),resolution:2});
    sheet.destroy({children:true});
    const frames = new Map(keys.map((key,i)=>[key,new P.Texture({source:atlas.source,frame:new P.Rectangle(i*32,0,32,32)})]));
    return {frames,atlas,destroy(){for(const frame of frames.values())frame.destroy(false);atlas.destroy(true);}};
  }
  function createGnomeView(P, layer, frames) {
    const views = new Map();let group = null;
    function change({actors}) {
      for (const [actor,sprite] of views) if (!actors.includes(actor)) { sprite.destroy();views.delete(actor); }
      if (!actors.length) { if(group)group.destroy();group=null;return; }
      if (!group) {group=new P.Container();group.eventMode='none';layer.addChild(group);}
      for (const actor of actors) if(!views.has(actor)) {
        const sprite=new P.Sprite(frames.get(`${actor.side}:false:0`));sprite.anchor.set(.5,18/32);
        group.addChild(sprite);views.set(actor,sprite);
      }
    }
    function animate(at) {
      for(const [actor,sprite] of views) {
        const pose=core.appearance(actor,at),step=pose.step<-.33?-1:pose.step>.33?1:0;
        sprite.texture=frames.get(`${actor.side}:${pose.battle}:${step}`);
        sprite.position.set(actor.x+pose.shove,actor.y+pose.bounce);sprite.rotation=pose.rotation;sprite.alpha=pose.alpha;
      }
    }
    return {views,change,animate,snapshot(){return {sprites:views.size,containers:group?1:0,textures:frames.size};},
      destroy(){change({actors:[]});}};
  }
  const api={makeGnomeAtlas,createGnomeView};
  if(common)module.exports=api;else window.PacketGardenPixiGnomes=api;
})();
