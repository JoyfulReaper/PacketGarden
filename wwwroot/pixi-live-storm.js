// Pixi-only atmospheric presentation. No garden RNG, ecology, network or timers.
(function () {
  'use strict';
  const profiles = Object.freeze({
    botnet_thunderstorm: Object.freeze({ minGapMs:60000, maxGapMs:150000, peakAlpha:.90, flashAlpha:.035, strokeScale:1 }),
    botnet_hurricane: Object.freeze({ minGapMs:45000, maxGapMs:120000, peakAlpha:1, flashAlpha:.05, strokeScale:1.2 })
  });
  const config = Object.freeze({ boltMs:650, flashMs:140, sequenceMs:3500, thunderMinMs:800, thunderMaxMs:1300,
    maxThunderLatenessMs:300, suspensionGapMs:2000 });
  // Bounded world-space paths, generated once per strike using only presentation RNG.
  function makeStrike(random) {
    const origin=192+random()*576, drift=(random()-.5)*180, endY=270+random()*240;
    const steps=Array.from({length:10},()=>.6+random()*.9),total=steps.reduce((a,b)=>a+b,0);let y=0;
    const points=[{x:origin,y:0}];
    for(let i=1;i<=10;i++) {
      y+=steps[i-1];points.push({x:Math.max(70,Math.min(890,origin+drift*i/10+(i%2?1:-1)*(8+random()*33))),y:endY*y/total});
    }
    const branches=[];
    const count=random()<.65?1+Math.floor(random()*3):0;
    for(let b=0;b<count;b++) {
      const start=points[2+b*2],direction=random()<.5?-1:1,path=[start];
      for(let i=1;i<=3;i++)path.push({x:Math.max(20,Math.min(940,path[i-1].x+direction*(12+random()*22))),y:path[i-1].y+12+random()*12});
      branches.push(path);
    }
    return {points,branches};
  }
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
        expiresAt:at+config.sequenceMs, thundered:false, ...profile, ...makeStrike(random) };
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
  function boltAlpha(event,at) {
    const age=at-event.createdAt;
    if(age<=0 || age>=config.boltMs)return 0;
    // Fast attack, readable hold, one continuous fade; no repeated flashing.
    const envelope=age<10?age/10:age<60?1:((config.boltMs-age)/(config.boltMs-60))**2;
    return event.peakAlpha*envelope;
  }
  function createView(P,renderer,root) {
    const overlay=new P.Container(),flash=new P.Graphics(),bolt=new P.Graphics();
    overlay.eventMode='none';overlay.visible=false;
    flash.rect(0,0,960,600).fill(0xb7d5ec);flash.blendMode='screen';bolt.blendMode='screen';
    overlay.addChild(flash,bolt);root.addChild(overlay);
    function path(points,width,color,alpha) {
      bolt.moveTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++)bolt.lineTo(points[i].x,points[i].y);
      bolt.stroke({width,color,alpha,cap:'round',join:'round'});
    }
    return { overlay,bolt,flash,
      change(event) {
        overlay.visible=false;bolt.clear();flash.alpha=0;bolt.alpha=0;
        if(!event)return;
        for(const [width,color,alpha] of [[9,0x83b9ec,.12],[3.6,0xb3dcff,.65],[1.6,0xf1f8ff,1]]) {
          path(event.points,width*event.strokeScale,color,alpha);
          for(const branch of event.branches)path(branch,width*event.strokeScale*.55,color,alpha*.7);
        }
      },
      animate(event,at) {
        bolt.alpha=boltAlpha(event,at);
        const age=at-event.createdAt;
        flash.alpha=age>0&&age<config.flashMs?event.flashAlpha*Math.sin(Math.PI*age/config.flashMs):0;
        overlay.visible=bolt.alpha>0||flash.alpha>0;
      },
      destroy(){overlay.destroy({children:true});} };
  }
  const api={profiles,config,createModel,makeStrike,boltAlpha,createView};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenPixiStorm=api;
})();
