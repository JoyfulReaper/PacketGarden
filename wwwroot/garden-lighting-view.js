// One composited surface transform; all cached pixels/geometry and UI hit targets survive.
(function () {
  'use strict';
  const core=typeof module!=='undefined'&&module.exports?require('./garden-lighting.js'):window.PacketGardenLighting;
  function createSurface(document,target) {
    const matrix=document.querySelector('#garden-light-matrix');let key='',updates=0,disposed=false;
    const identity=core.compose(core.atHour(12)).join(' ');
    return {apply(state,weatherDarkening=0) {
      if(disposed||!state)return false;
      const value=core.compose(state,weatherDarkening).join(' ');
      if(value===key)return false;
      key=value;updates++;matrix.setAttribute('values',value);
      target.style??={};target.style.filter=value===identity?'none':'url(#garden-local-light)';
      return true;
    },snapshot(){return {updates,filter:key};},destroy(){disposed=true;target.style??={};target.style.filter='none';}};
  }
  function bindControls(document,model,refresh) {
    const mode=document.querySelector('#lighting-mode'),hour=document.querySelector('#lighting-hour'),status=document.querySelector('#lighting-status');
    const toggle=document.querySelector('#day-night-enabled');
    const show=()=>{if(toggle)toggle.checked=model.enabled;
      if(mode)mode.disabled=!model.enabled;if(hour)hour.disabled=!model.enabled;
      if(!mode||!hour||!status)return;
      if(!model.enabled){status.textContent='Day/night cycle off · Daylight';return;}
      const s=model.snapshot();if(s.hour===null){status.textContent='Local lighting waits until visible.';return;}
      status.textContent=`${s.mode==='live'?'Live local':'Simulated'} · ${s.phase} · ${s.hour.toFixed(2)}h`;
      mode.value=model.mode;hour.value=String(s.hour);};
    const select=()=>{model.setMode(mode.value);refresh();show();};
    const slide=()=>{model.setHour(Number(hour.value));refresh();show();};
    const change=()=>{model.setEnabled(toggle.checked);refresh();show();};
    toggle?.addEventListener('change',change);mode?.addEventListener('change',select);hour?.addEventListener('input',slide);show();
    return {refresh:show,destroy(){toggle?.removeEventListener?.('change',change);mode?.removeEventListener?.('change',select);hour?.removeEventListener?.('input',slide);}};
  }
  const api={createSurface,bindControls};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenLightingView=api;
})();
