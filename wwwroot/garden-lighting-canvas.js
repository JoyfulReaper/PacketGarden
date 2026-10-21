// Canvas uses the same surface light as Pixi, without repainting cached ecology.
const gardenLightingSurface=window.PacketGardenLightingView.createSurface(document,document.querySelector('.garden-stage'));
const gardenLighting=window.PacketGardenLighting.createModel();
function updateGardenLighting(at=Date.now(),force=false,weatherChanged=false) {
  if(document.hidden)return;
  const sampled=gardenLighting.tick(at,{force});
  if(sampled||force||weatherChanged)gardenLightingSurface.apply(gardenLighting.state,weatherSoilDarkening());
}
updateGardenLighting(Date.now(),true);
function restoreGardenLighting(event) {
  if(event.persisted)updateGardenLighting(Date.now(),true);
}
function disposeGardenLighting() {
  gardenLighting.destroy();gardenLightingSurface.destroy();
  window.removeEventListener?.('pageshow',restoreGardenLighting);
}
window.addEventListener('pageshow',restoreGardenLighting);
