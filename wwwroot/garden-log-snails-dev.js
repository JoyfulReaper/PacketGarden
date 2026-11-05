// Diagnostic page only. Fixtures use real terrain creation and authoritative ecology.
(function(){
  'use strict';
  function bind({document,garden,ecology,snails,gnomes,frogs,ambient,setReducedMotion,now=Date.now}){
    let rainScenario=null,fixturePuddle=null;
    const cleanup=[],status=text=>{const el=document.querySelector('#log-snail-status');if(el)el.textContent=text;};
    const listen=(id,event,fn)=>{const el=document.querySelector('#'+id);if(el){el.addEventListener(event,fn);cleanup.push(()=>el.removeEventListener(event,fn));}};
    function seed(age=0){snails.clear();gnomes.clear();frogs?.clear();ambient.clear();ecology.clear();const log=garden.seedCampfire(age);gnomes.resetCadence();return log;}
    function grass(log){if(!log?.simulated)return 0;let added=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&ecology.influenceGrassCell(log.column+dx,log.row+dy,now()-65000))added++;
      return added;
    }
    listen('seed-log-snails','click',()=>{seed();status('Actual simulated log from natural blackthorn expiry. Seed surrounding grass, then spawn one or two noncollectible snails.');});
    listen('seed-log-snail-grass','click',()=>{const log=snails.eligibleLogs(now(),true)[0];status(log?`${grass(log)} surrounding actual grass cells seeded through ecology. Existing visitors keep their original grass selections.`:'Seed a simulated fallen log first.');});
    for(const count of [1,2])listen(`spawn-log-snails-${count}`,'click',()=>{let created=0;for(let i=0;i<count;i++)if(snails.spawnSimulated(now()))created++;
      status(`${created} simulated log-snail arrivals; active ${snails.snails.length}/2. Grass slots occur at 25s and 53s. No network event.`);});
    listen('preview-log-snail-graze','click',()=>{
      const at=now(),log=seed(30000);grass(log);
      const start=at-24500,snail=snails.spawnSimulated(start);
      if(snail)for(let t=start+250;t<=at;t+=250)snails.tick(t);
      status(snail?'Simulated visit aged with bounded 250ms fixture ticks; first real nibble is due in 0.5s. Only the two originally selected patches can be eaten.':'Could not create the simulated grazing preview.');
    });
    listen('remove-log-snail-source','click',()=>{const log=snails.snails.find(s=>s.source?.log.simulated)?.source.log??snails.eligibleLogs(now(),true)[0];
      status(log&&garden.terrain.remove(log,'simulated-log-snail-removal')?'Actual source log removed; visitors fade over 3s and cannot graze.':'No simulated source log available.');});
    listen('log-snail-reduced-motion','change',event=>setReducedMotion(event.target.checked));
    for(const mode of ['hidden','stalled'])listen(`cancel-log-snails-${mode}`,'click',()=>{
      if(mode==='hidden'){snails.setHidden(true,now());snails.setHidden(false,now());}else{snails.tick(now()+1501);snails.clear(now());}
      status('Log-snail visits and references cleared, fresh 45s check, no missed spawn/grazing replay. Other garden models keep their normal clocks.');
    });
    listen('clear-log-snails','click',()=>{snails.clear();status('Log-snail wildlife cleared; terrain, grass and collectible curiosities remain.');});
    listen('seed-snail-rain','click',()=>{
      rainScenario=document.querySelector('#snail-rain-scenario').value;
      let log=seed(60000);
      if(rainScenario==='mixed'){garden.seedFungi(60000,false,2);log=snails.eligibleLogs(now(),true)[0];}
      grass(log);fixturePuddle=null;
      if(rainScenario!=='dry'){
        const elapsed=rainScenario==='drained'?510000:rainScenario==='barely'?30000+480000*(1-.1201/.38):15000;
        const x=(log.column+.5)*30+(rainScenario==='mixed'?(log.column>snails.eligibleLogs(now(),true)[1].column?75:-75):rainScenario==='far'?101:50);
        ecology.seed({grassCells:ecology.grassCells,puddles:[{x,y:(log.row+.5)*30,size:20,maxSize:24,seed:.719,
          createdAt:now()-elapsed-15000,lastRefreshedAt:now()-elapsed,simulated:true}]});
        fixturePuddle=ecology.puddles[0];
      }
      setReducedMotion(rainScenario==='reduced');const reduced=document.querySelector('#log-snail-reduced-motion');if(reduced)reduced.checked=rainScenario==='reduced';
      status(`Simulated ${rainScenario} scenario ready. Run one check; a 0.375 roll distinguishes wet 50% from dry 25%.`);
    });
    listen('check-snail-rain','click',()=>{
      if(!rainScenario){status('Seed a rain-response scenario first.');return;}
      if(rainScenario==='removed'&&fixturePuddle&&ecology.puddles.includes(fixturePuddle))ecology.clearPuddles();
      if(rainScenario==='hidden'){
        snails.setHidden(true,now());snails.checkSimulated(now(),()=>0);snails.setHidden(false,now());
        snails.tick(now()+1501);snails.clear(now());status('Hidden and stalled attempts cancelled; no spawn or catch-up.');return;
      }
      const selection=Number(document.querySelector('#snail-rain-log').value),roll=Number(document.querySelector('#snail-rain-roll').value);let calls=0;
      const log=snails.eligibleLogs(now(),true)[selection<.5?0:snails.eligibleLogs(now(),true).length-1];
      snails.checkSimulated(now(),()=>{
        const index=calls++;
        if(index===1&&rainScenario==='removed-log'&&log)garden.terrain.remove(log,'simulated-snail-before-spawn');
        return index===0?selection:index===1?roll:0;
      });refresh();
    });
    function refresh(){
      const el=document.querySelector('#snail-rain-status');if(!el)return;
      const c=snails.lastCheck;
      el.textContent=c?`Chosen log ${c.logId??'invalid'}: ${c.chance===null?'no roll':c.chance*100+'%'} — ${c.reason}; ${c.outcome}. Active ${snails.snails.length}/2.`:'No scheduled selection yet. Wetness is checked only for the selected log.';
    }
    return{refresh,destroy(){rainScenario=null;fixturePuddle=null;for(const fn of cleanup.splice(0))fn();}};
  }
  const api={bind};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenLogSnailsDev=api;
})();
