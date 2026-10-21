// Loaded only by /pixi-live.html. Virtual telemetry never touches the organic scheduler.
(function(){
  'use strict';
  function bind({document,organic,garden}) {
    const status=document.querySelector('#stillbloom-test-status'),scenario=document.querySelector('#stillbloom-scenario'),roll=document.querySelector('#stillbloom-roll');
    let at=0,level='quiet',healthy=true,connected=true,generation=1,checks=0,last='No simulation yet.';
    const sandbox=window.PacketGardenCore.createGardenModel({now:()=>at,random:()=>.5});
    const simulation=window.PacketGardenStillbloom.createModel({garden:sandbox,now:()=>at,random:()=>{checks++;return Number(roll.value);}});
    function weather(){simulation.setWeather({level,hasSnapshot:true,telemetryHealthy:healthy,freshUntil:healthy?at+30000:null,telemetryGeneration:generation},at);}
    function reset(){at=0;generation++;checks=0;sandbox.clear();simulation.reset();simulation.configure({connected,live:true},at);weather();simulation.tick(at);}
    function refresh(){const s=simulation.snapshot(at),live=organic.snapshot();status.textContent=`Organic: ${live.verified?'verified quiet':'not qualified'} · ${Math.floor(live.quietMs/1000)}s · ${live.living}/2. Simulation: ${Math.floor(s.quietMs/1000)}s verified quiet · ${s.living}/2 · ${checks} rolls. ${last}`;}
    function advance(ms){const end=at+ms;while(at<end){at=Math.min(end,at+250);if(at%10000===0&&connected&&healthy)weather();sandbox.tick(at);simulation.tick(at);}refresh();}
    const handlers=[];let disposed=false;
    function on(id,event,fn){const node=document.querySelector(id),handler=(...args)=>{if(!disposed)fn(...args);};node.addEventListener(event,handler);handlers.push(()=>node.removeEventListener?.(event,handler));}
    on('#stillbloom-scenario','change',()=>{level=scenario.value==='rain'?'rain':'quiet';healthy=!['stale','disconnected'].includes(scenario.value);connected=scenario.value!=='disconnected';generation++;simulation.configure({connected},at);weather();last=`Simulated ${scenario.value}; organic telemetry unchanged.`;refresh();});
    on('#stillbloom-qualify','click',()=>{level='quiet';healthy=true;connected=true;reset();last='Virtual 10-minute qualification; chosen roll applies at the boundary.';advance(600000);});
    on('#stillbloom-check','click',()=>{last=`Virtual roll ${roll.value}; < 0.10 succeeds.`;advance(180000);});
    on('#trigger-stillbloom','click',()=>{last=organic.spawnSimulated()?'Simulated flower placed; no network event.':'No placement: two living flowers or no free cell.';refresh();});
    reset();refresh();
    return {refresh,destroy(){if(disposed)return;disposed=true;handlers.forEach(fn=>fn());simulation.destroy();sandbox.clear();}};
  }
  window.PacketGardenStillbloomDev={bind};
})();
