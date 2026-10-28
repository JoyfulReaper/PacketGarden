// Best-effort page-load signal. No identities, storage, timers, retries or garden events.
(function(){
  'use strict';
  function createNotifier({production,isVisible,send}){
    let ready=false,attempted=false,disposed=false;
    function notify(){
      if(disposed||!production||!ready||attempted||!isVisible())return;
      attempted=true;
      try{Promise.resolve(send()).catch(()=>{});}catch{} // Includes synchronous fetch failures.
    }
    return{initialized(){ready=true;notify();},visible:notify,destroy(){disposed=true;}};
  }
  const request=Object.freeze({method:'POST',mode:'same-origin',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error'});
  function createPageNotifier(document){
    return createNotifier({production:document.body.hasAttribute?.('data-production-garden')===true,
      isVisible:()=>!document.hidden,send:()=>fetch('/api/garden/visit',request)});
  }
  const api={createNotifier,createPageNotifier,request};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenVisits=api;
})();
