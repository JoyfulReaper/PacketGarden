// Quiet is an upstream assertion, never a local traffic heuristic or rendering fallback.
(function () {
  'use strict';
  const gardenCore = typeof module !== 'undefined' && module.exports ? require('./garden-core.js') : window.PacketGardenCore;
  // Upstream leases last 30s; allow 5s timestamp skew so small clock offsets
  // cannot restart qualification at every otherwise healthy renewal.
  const config = Object.freeze({ qualifyMs:600000, checkEveryMs:180000, chance:.10, maxLiving:2, maxTickGapMs:1500, leaseMaxMs:35000 });
  function normalizeTelemetry(frame) {
    return { level:frame?.level, hasSnapshot:frame?.hasSnapshot === true, telemetryHealthy:frame?.telemetryHealthy === true,
      freshUntil:Number.isSafeInteger(frame?.freshUntil)?frame.freshUntil:null,
      telemetryGeneration:Number.isSafeInteger(frame?.telemetryGeneration)&&frame.telemetryGeneration>0?frame.telemetryGeneration:null };
  }
  function visual(specimen, at) {
    const age=Math.max(0,at-specimen.createdAt),t=gardenCore.timings.stillbloom;
    const fade=Math.min(1,Math.max(0,(age-t.fadingAfterMs)/(t.expiredAfterMs-t.fadingAfterMs)));
    return { scale:(.32+.68*Math.min(1,age/t.matureAfterMs))*(1-.12*fade),alpha:1-.85*fade,fade };
  }
  function createModel({garden,now=Date.now,random=Math.random,onSpawn=()=>{}}) {
    let weather=null,connected=false,live=true,hidden=false,quietSince=null,nextCheckAt=null,lastTickAt=null,generation=null,disposed=false;
    const reset=()=>{quietSince=null;nextCheckAt=null;};
    function verified(at) {
      return !disposed&&!hidden&&connected&&live&&weather?.level==='quiet'&&weather.hasSnapshot&&weather.telemetryHealthy
        && weather.telemetryGeneration!==null && weather.freshUntil>at && weather.freshUntil<=at+config.leaseMaxMs;
    }
    function reconcile(at) {
      if(!verified(at)){reset();return false;}
      if(quietSince===null){quietSince=at;nextCheckAt=at+config.qualifyMs;}
      return true;
    }
    function setWeather(frame,at=now()) {
      if(!verified(at))reset(); // Renewal must not bridge an already expired certificate between ticks.
      const next=normalizeTelemetry(frame);
      if(next.telemetryGeneration!==generation)reset();
      generation=next.telemetryGeneration;weather=next;reconcile(at);
    }
    function configure(options={},at=now()) {
      if('connected' in options){if(!options.connected)weather=null;connected=Boolean(options.connected);}
      if('live' in options)live=Boolean(options.live);
      if('hidden' in options){if(hidden!==Boolean(options.hidden)){reset();lastTickAt=null;}hidden=Boolean(options.hidden);}
      reconcile(at);
    }
    function living(at=now()) {return garden.specimens.filter(p=>p.type==='stillbloom'&&gardenCore.lifecycleStage(p,at)!=='expired').length;}
    function spawn(at,simulated=false) {
      if(disposed||hidden||living(at)>=config.maxLiving||garden.byCell.size>=gardenCore.dimensions.capacity)return null;
      const result=garden.addSpecimen('stillbloom',0,at,simulated?{kind:'simulated',eventType:'stillbloom-test'}:{kind:'quiet'});
      if(result)onSpawn(result.specimen);return result?.specimen??null;
    }
    function tick(at=now()) {
      const stalled=lastTickAt!==null&&(at<lastTickAt||at-lastTickAt>config.maxTickGapMs);lastTickAt=at;
      if(stalled)reset();
      if(!reconcile(at)||at<nextCheckAt)return null;
      nextCheckAt=at+config.checkEveryMs;
      if(living(at)>=config.maxLiving||garden.byCell.size>=gardenCore.dimensions.capacity)return null;
      return random()<config.chance?spawn(at):null;
    }
    return {setWeather,configure,tick,reset,verified,living,spawnSimulated(at=now()){return spawn(at,true);},
      snapshot(at=now()){return {verified:verified(at),quietSince,nextCheckAt,quietMs:quietSince===null?0:Math.max(0,at-quietSince),living:living(at)};},
      destroy(){disposed=true;reset();weather=null;}};
  }
  const api={config,normalizeTelemetry,visual,createModel};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenStillbloom=api;
})();
