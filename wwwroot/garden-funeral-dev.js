// Diagnostic-only controls. Starting a funeral never plants or removes anything.
(function(){
  'use strict';
  function bind({document,gnomes,view,setReducedMotion,now=Date.now}){
    const cleanup=[],status=text=>{const el=document.querySelector('#funeral-status');if(el)el.textContent=text;};
    const listen=(id,fn)=>{const el=document.querySelector('#'+id);if(el){el.addEventListener('click',fn);cleanup.push(()=>el.removeEventListener('click',fn));}};
    function trigger(){const started=gnomes.startFuneral(now(),()=>.25);
      status(started?'Funeral procession preview: four gnomes, one shared leaf/stretcher, 18 seconds. Nobody has died.':
        'Requires 30 living specimens and no active gnome incident. Use the existing garden seed control if needed.');return started;
    }
    listen('trigger-funeral',trigger);
    for(const reduced of [false,true])listen(`preview-funeral-${reduced?'reduced':'normal'}`,()=>{
      if(gnomes.incident?.type==='gnome_funeral')gnomes.clear();setReducedMotion(reduced);trigger();
    });
    for(const mode of ['hidden','stalled'])listen(`cancel-funeral-${mode}`,()=>{
      if(gnomes.incident?.type!=='gnome_funeral'){status('Trigger a funeral procession first.');return;}
      if(mode==='hidden')gnomes.suspend(now());else gnomes.tick(now()+1501,()=>.99);
      gnomes.resetCadence(now());status('Funeral cancelled; prop and actors released, fresh 45s cadence, no replay.');
    });
    listen('cleanup-funeral',()=>{
      if(gnomes.incident?.type==='gnome_funeral'){
        const owned=[...view.views.values(),view.stretcher].filter(Boolean);gnomes.clear();gnomes.resetCadence(now());
        status(`Cleanup verified: ${owned.length} temporary Sprites destroyed ${owned.every(s=>s.destroyed)}; actors ${view.views.size}, prop ${view.stretcher?1:0}. Shared atlas retained.`);
      }else status(`No funeral active. Retained funeral props: ${view.stretcher?1:0}.`);
    });
    return{destroy(){for(const fn of cleanup.splice(0))fn();}};
  }
  const api={bind};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenFuneralDev=api;
})();
