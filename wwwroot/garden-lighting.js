// Browser-local atmospheric light only. No ecology, renderer, network or scheduler ownership.
(function () {
  'use strict';
  const config = Object.freeze({ sampleEveryMs:30000, precision:512 });
  const presets = Object.freeze({ dawn:6, day:12, golden:18, dusk:20, night:0 });
  const anchors = [
    [0,'night',[.70,.78,1],[.008,.003,.065],1],
    [5,'night',[.70,.78,1],[.008,.003,.065],1],
    [6,'dawn',[.91,.96,1],[.012,.018,.032],.25],
    [9,'day',[1,1,1],[0,0,0],0],
    [16,'day',[1,1,1],[0,0,0],0],
    [18,'golden',[1.025,.965,.88],[.018,.008,0],0],
    [20,'dusk',[.85,.82,.98],[.025,.008,.048],.55],
    [22,'night',[.70,.78,1],[.008,.003,.065],1],
    [24,'night',[.70,.78,1],[.008,.003,.065],1]
  ];
  function localHour(at = Date.now()) {
    const date = new Date(at);
    return date.getHours()+date.getMinutes()/60+date.getSeconds()/3600+date.getMilliseconds()/3600000;
  }
  function atHour(value) {
    const hour = ((value%24)+24)%24;
    const index = anchors.findIndex((entry,i) => i<anchors.length-1 && hour>=entry[0] && hour<anchors[i+1][0]);
    const a=anchors[index],b=anchors[index+1],x=(hour-a[0])/(b[0]-a[0]),t=x*x*(3-2*x);
    const mix=(a,b)=>a+(b-a)*t;
    return {hour,phase:a[1],rgb:a[2].map((v,i)=>mix(v,b[2][i])),bias:a[3].map((v,i)=>mix(v,b[3][i])),night:mix(a[4],b[4])};
  }
  function compose(state, weatherDarkening = 0) {
    // Weather already darkens soil. A small night-only lift prevents crushing it;
    // rain and the existing bounded lightning also pass through this same light.
    const lift = Math.min(.34,Math.max(0,weatherDarkening))*state.night*.22;
    const rgb=state.rgb.map(v=>v+(1-v)*lift),bias=state.bias;
    return [rgb[0],0,0,0,bias[0], 0,rgb[1],0,0,bias[1], 0,0,rgb[2],0,bias[2], 0,0,0,1,0]
      .map(v=>Math.round(v*config.precision)/config.precision);
  }
  function createModel({now=Date.now,getLocalHour=localHour,onChange=()=>{}}={}) {
    let mode='live',enabled=true,hour=12,state=null,key='',lastSampleAt=null,disposed=false,samples=0,changes=0;
    const needsSample=at=>!disposed&&enabled&&(lastSampleAt===null||Math.abs(at-lastSampleAt)>=config.sampleEveryMs);
    function tick(at=now(),{hidden=false,force=false}={}) {
      if(disposed||hidden)return false;
      // Absolute difference also notices a backwards clock adjustment. No missed samples replay.
      if(!force && !needsSample(at))return false;
      lastSampleAt=at;samples++;
      state=atHour(!enabled?12:mode==='live'?getLocalHour(at):mode==='hour'?hour:presets[mode]);
      const next=compose(state).join(',');
      if(next!==key) {key=next;changes++;onChange(state);}
      return true; // Sampled; the surface adapter independently skips identical matrices.
    }
    function setMode(value,at=now()) {
      if(value!=='live'&&value!=='hour'&&!Object.hasOwn(presets,value))return false;
      mode=value;tick(at,{force:true});return true;
    }
    function setHour(value,at=now()) {
      if(!Number.isFinite(value)||value<0||value>24)return false;
      hour=value;mode='hour';tick(at,{force:true});return true;
    }
    function setEnabled(value,at=now()) {
      if(disposed||typeof value!=='boolean'||value===enabled)return false;
      enabled=value;tick(at,{force:true});return true;
    }
    return {tick,setMode,setHour,setEnabled,needsSample,get state(){return state;},get mode(){return mode;},get enabled(){return enabled;},
      snapshot(){return {mode,enabled,hour:state?.hour??null,phase:state?.phase??null,samples,changes,lastSampleAt};},
      destroy(){disposed=true;}};
  }
  const api={config,presets,localHour,atHour,compose,createModel};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenLighting=api;
})();
