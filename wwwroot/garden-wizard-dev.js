// Local diagnostic controls. Real model objects, no fabricated telemetry.
(function(){
  'use strict';
  function bind({document,garden,ecology,gnomes,ambient,frogs,snails,setReducedMotion,now=Date.now}){
    const cleanup=[];let grassCell=null;
    const status=text=>{const el=document.querySelector('#wizard-status');if(el)el.textContent=text;};
    const listen=(id,event,fn)=>{const el=document.querySelector('#'+id);if(el){el.addEventListener(event,fn);cleanup.push(()=>el.removeEventListener(event,fn));}};
    function seed(several=false){gnomes.clear();snails?.clear();ambient.clear();frogs?.clear();ecology.clear();garden.seedWizard(several);gnomes.resetCadence();grassCell=null;
      status(`Simulated ${several?'four protected mature specimens':'mature ghostbloom'} plus ordinary companions. No network event.`);}
    function start(at=now()){
      const started=gnomes.startWizard(at,()=>0,true),g=gnomes.incident?.grass;grassCell=g?{column:g.column,row:g.row}:null;
      status(started?'Simulated wizard visit: one selected rare specimen, at most one grass attempt at 5s.':'Requires 30 living plants, a mature simulated protected target, and no active incident.');return started;
    }
    listen('seed-wizard','click',()=>seed());listen('seed-wizards','click',()=>seed(true));listen('trigger-wizard','click',()=>start());
    listen('preview-wizard-cast','click',()=>{seed();const at=now(),born=at-5500;if(start(born))for(let t=born+250;t<=at;t+=250)gnomes.tick(t,()=>.99);
      status('Simulated cast preview: real 250ms fixture ticks performed one authoritative grass attempt. Inspect its original coordinates.');});
    listen('inspect-wizard-grass','click',()=>{const p=grassCell&&ecology.grassCells.find(g=>g.column===grassCell.column&&g.row===grassCell.row);
      status(grassCell?`Chosen grass cell ${grassCell.column},${grassCell.row}: ${p?`actual patch; created ${p.createdAt}, last influence ${p.lastInfluencedAt}`:'no patch'}. No alternate cell selected.`:'Trigger a visit first; a completely blocked neighborhood has no grass target.');});
    const target=()=>gnomes.incident?.type==='gnome_wizard'?gnomes.incident.target?.specimen:null;
    listen('remove-wizard-target','click',()=>{const p=target();status(p?.origin?.kind==='simulated'&&garden.remove(p,'simulated-wizard-removal')?'Exact simulated target removed; wizard cancelled.':'Trigger a simulated wizard first.');});
    listen('replace-wizard-target','click',()=>{const p=target();status(p&&garden.replaceWizardFixture(p)?'Actual simulated target replaced in its cell with a fresh object/id; wizard cancelled.':'Use a fully simulated wizard fixture before replacing its target.');});
    listen('block-wizard-grass','click',()=>{
      if(!grassCell||!target()||!garden.specimens.every(p=>p.origin?.eventType==='wizard-fixture')){status('Trigger the wizard fixture before blocking its original grass cell.');return;}
      // Fill actual free cells through ordinary placement, stopping at the selected one.
      let added=0;while(!garden.isCellOccupied(grassCell.column,grassCell.row)&&added<640){if(!garden.addSpecimen('broadleaf',0,now(),{kind:'simulated',eventType:'wizard-fixture'}))break;added++;}
      status(`Original cell occupied through ${added} actual placements. Grass rules at cast time determine whether it is blocked.`);
    });
    for(const mode of ['hidden','stalled'])listen('cancel-wizard-'+mode,'click',()=>{
      if(mode==='hidden')gnomes.suspend(now());else gnomes.tick(now()+1501,()=>.99);
      gnomes.resetCadence(now());status('Wizard cancelled; references/effects released, fresh 45s cadence, no replayed cast.');
    });
    listen('wizard-reduced-motion','change',event=>setReducedMotion(event.target.checked));
    listen('clear-wizard','click',()=>{gnomes.clear();garden.clear();ecology.clear();ambient.clear();frogs?.clear();snails?.clear();grassCell=null;status('Wizard fixture cleared.');});
    return{destroy(){grassCell=null;for(const fn of cleanup.splice(0))fn();}};
  }
  const api={bind};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenWizardDev=api;
})();
