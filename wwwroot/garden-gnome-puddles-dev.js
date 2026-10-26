// Explicit local fixture, loaded by the diagnostic page only (never by SSE).
(function () {
  'use strict';
  function trigger({gnomes,garden,ecology,at=Date.now()}) {
    if(gnomes.incident)return false;
    // Direct simulated placement changes neither accepted traffic nor activity.
    for(let n=gnomes.livingCount(at);n<30;n++)if(!garden.addSpecimen('broadleaf',0,at,{kind:'simulated',eventType:'gnome-puddle-test'}))return false;
    if(!gnomes.start(at,()=>.5))return false;
    const actor=gnomes.actors[0],puddle={x:(actor.startX+actor.targetX)/2,
      y:(actor.startY+actor.targetY)/2+11,seed:0,size:36,maxSize:36,createdAt:at-15000,lastRefreshedAt:at-15000};
    // One known pool makes the fixture reproducible even if real retained water
    // previously covered the departure point. This is an explicit local seed.
    ecology.seed({grassCells:ecology.grassCells,puddles:[puddle]});
    // Baseline the exact fixture water at the departure point. Only the next
    // geometrically valid moving entry is simulated; ordinary entries stay 20%.
    gnomes.tick(at);gnomes.simulatePuddleEntry(actor);return true;
  }
  function bind(options) {
    const button=options.document.querySelector('#trigger-gnome-puddle');
    let disposed=false;const click=()=>{
      if(disposed)return;
      const status=options.document.querySelector('#gnome-puddle-status');
      const started=trigger(options);
      if(status)status.textContent=started?'Simulated wet-boots demonstration · watch the approaching green gnome. No network event.'
        :'An incident is already active, or the local fixture could not start.';
    };
    button?.addEventListener('click',click);
    return {destroy(){disposed=true;button?.removeEventListener('click',click);}};
  }
  window.PacketGardenGnomePuddlesDev={trigger,bind};
})();
