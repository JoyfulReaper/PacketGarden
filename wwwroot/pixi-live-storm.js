// Pixi-only atmospheric presentation. No garden RNG, ecology, network or timers.
(function () {
  'use strict';
  const profiles = Object.freeze({
    botnet_thunderstorm: Object.freeze({ minGapMs:60000, maxGapMs:150000, peakAlpha:.14, width:760, height:360 }),
    botnet_hurricane: Object.freeze({ minGapMs:45000, maxGapMs:120000, peakAlpha:.20, width:840, height:420 })
  });
  const config = Object.freeze({ glowMs:2200, sequenceMs:3500, thunderMinMs:800, thunderMaxMs:1300,
    maxThunderLatenessMs:300, suspensionGapMs:2000 });
  function createModel({ random, now = Date.now, onChange = () => {}, onThunder = () => {} }) {
    let state = { level:'quiet', enabled:true, reducedMotion:false, hidden:false };
    let active = null, nextAt = Infinity, lastTickAt = now(), cancelSound = null, disposed = false;
    const allowed = () => !disposed && Boolean(profiles[state.level]) && state.enabled && !state.reducedMotion && !state.hidden;
    const between = (min,max) => min + Math.round((max-min)*random());
    function schedule(at) { nextAt = allowed() ? at + between(profiles[state.level].minGapMs,profiles[state.level].maxGapMs) : Infinity; }
    function cancel() {
      cancelSound?.();cancelSound=null;
      if (active) { active=null;onChange(null); }
    }
    function configure(patch, at = now()) {
      if (disposed) return;
      const next = { ...state, ...patch };
      if (['level','enabled','reducedMotion','hidden'].every(key => next[key]===state[key])) return;
      state=next;cancel();schedule(at);lastTickAt=at;
    }
    function trigger(at = now()) {
      if (!allowed() || active) return false;
      const profile=profiles[state.level];
      active={ level:state.level, createdAt:at, thunderAt:at+between(config.thunderMinMs,config.thunderMaxMs),
        expiresAt:at+config.sequenceMs, thundered:false, x:960*(.3+random()*.4), y:600*(.2+random()*.3), ...profile };
      nextAt=Infinity;lastTickAt=at;onChange(active);return true;
    }
    function tick(at = now()) {
      if (!allowed()) return;
      const skipped=at-lastTickAt>config.suspensionGapMs;lastTickAt=at;
      if (skipped) { cancel();schedule(at);return; } // No catch-up glow or delayed rumble.
      if (!active) { if(at>=nextAt)trigger(at);return; }
      if (at>=active.expiresAt) { cancel();schedule(at);return; }
      if (!active.thundered && at>=active.thunderAt) {
        active.thundered=true;
        if (at-active.thunderAt<=config.maxThunderLatenessMs) cancelSound=onThunder(active.level)??null;
      }
    }
    function reset(at = now()) { cancel();schedule(at);lastTickAt=at; }
    return { configure,trigger,tick,reset,get active(){return active;},get nextAt(){return nextAt;},
      destroy(){cancel();disposed=true;nextAt=Infinity;} };
  }
  function glowAlpha(event,at) {
    const age=at-event.createdAt;
    return age<=0 || age>=config.glowMs ? 0 : event.peakAlpha*Math.sin(Math.PI*age/config.glowMs)**2;
  }
  function createView(P,renderer,root) {
    const cloud=new P.Graphics();
    for(let ring=16;ring>=1;ring--)cloud.ellipse(128,64,128*ring/16,64*ring/16).fill({color:0xc6dae0,alpha:.07});
    const texture=renderer.generateTexture({target:cloud,frame:new P.Rectangle(0,0,256,128),resolution:1});cloud.destroy();
    const sprite=new P.Sprite(texture);sprite.anchor.set(.5);sprite.eventMode='none';sprite.blendMode='screen';
    sprite.alpha=0;sprite.visible=false;root.addChild(sprite);
    return { sprite,
      change(event) { sprite.visible=Boolean(event);sprite.alpha=0;
        if(event){sprite.position.set(event.x,event.y);sprite.width=event.width;sprite.height=event.height;} },
      animate(event,at){sprite.alpha=glowAlpha(event,at);sprite.visible=sprite.alpha>0;},
      destroy(){sprite.destroy();texture.destroy(true);} };
  }
  const api={profiles,config,createModel,glowAlpha,createView};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenPixiStorm=api;
})();
