// Local simulated terrain only; no activity or network input.
(function(){
  'use strict';
  function bind({document,garden,ecology,gnomes,snails,ambient,frogs,now=Date.now}){
    const cleanup=[];let source=null;
    const status=text=>{const el=document.querySelector('#log-fungi-status');if(el)el.textContent=text;};
    const listen=(id,fn)=>{const el=document.querySelector('#'+id);if(el){el.addEventListener('click',fn);cleanup.push(()=>el.removeEventListener('click',fn));}};
    function seed(age,colonized){gnomes.clear();snails?.clear();ambient.clear();frogs?.clear();ecology.clear();source=garden.seedFungi(age,colonized);
      gnomes.resetCadence();status(`Simulated actual fallen log: ${colonized?'colonized':'ordinary'}, age ${age/60000}m. No telemetry generated.`);}
    listen('seed-log-fungi-none',()=>seed(0,false));listen('seed-log-fungi',()=>seed(0,true));
    for(const [stage,age] of [['early',600000],['mature',1200000],['weathered',2400000]])listen('preview-log-fungi-'+stage,()=>seed(age,true));
    listen('decay-log-fungi',()=>{
      if(!source?.simulated||garden.terrain.byCell.get(source.cell)!==source){status('Seed a simulated fungal log first.');return;}
      garden.tick(source.createdAt+3000000);status('Actual terrain reconciled at the 50m boundary; cell released through terrain.remove(log, fungal-decay).');
    });
    listen('burn-log-fungi',()=>{seed(1200000,true);const started=gnomes.startCampfire(now(),()=>0);status(started?'Simulated campfire started on the colonized log; original ignite/consume/depart mechanics.':'Campfire unavailable.');});
    listen('remove-log-fungi',()=>{status(source?.simulated&&garden.terrain.remove(source,'simulated-fungal-source-removal')?'Exact simulated source removed.':'No simulated source remains.');});
    listen('occupancy-log-fungi',()=>{if(!source){status('Seed a fixture first.');return;}
      const {cell,column,row}=source,blocked=garden.isCellOccupied(column,row);
      const patch=ecology.influenceGrassCell(column,row,now());
      status(`Cell ${cell}: terrain ${garden.terrain.isBlocked(cell)}, occupied ${blocked}, actual grass ${Boolean(patch)}. Ordinary ecology controls reclamation.`);
    });
    listen('clear-log-fungi',()=>{garden.clear();gnomes.clear();snails?.clear();ecology.clear();ambient.clear();frogs?.clear();source=null;status('Simulated terrain and fungal state reset.');});
    return{destroy(){source=null;for(const fn of cleanup.splice(0))fn();}};
  }
  const api={bind};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenLogFungiDev=api;
})();
