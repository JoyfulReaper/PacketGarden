// Supported pages form a closed dependency graph; old bookmarks load no renderer.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve('wwwroot'),removed=['garden.js','garden-activity.js','garden-actors.js','garden-broadleaf.js','garden-collectibles.js','garden-curiosities.js','garden-drops.js','garden-frogs-canvas.js','garden-inspect.js','garden-lighting-canvas.js','garden-perf.js','garden-puddles.js','garden-species-colors.js'];
for(const file of removed)assert(!fs.existsSync(path.join(root,file)),file+' is retired');
for(const file of ['index.html','pixi-live.html','pixi-stress.html','about.html']) {
  const html=fs.readFileSync(path.join(root,file),'utf8');assert.doesNotMatch(html,/href="canvas.html"|garden-overlay|garden-perf/);
  for(const [,ref] of html.matchAll(/(?:src|href)="([^"#?]+)(?:[^"#]*)?"/g)){
    if(/^(?:https?:|#)/.test(ref))continue;
    const name=ref==='/'?'index.html':ref.replace(/^\//,'');assert(fs.existsSync(path.join(root,name)),file+' → '+ref);
    assert(!removed.includes(name),'no retired assets are referenced');
  }
}
const redirect=fs.readFileSync(path.join(root,'canvas.html'),'utf8');assert.match(redirect,/<meta http-equiv="refresh" content="0; url=\/">/);
assert.match(redirect,/<a href="\/">/);assert.doesNotMatch(redirect,/<script|<canvas|stylesheet/);
for(const file of ['garden-core.js','garden-ecology.js','garden-ambient.js','garden-gnomes.js','garden-frogs.js','garden-interaction.js','garden-lighting.js','garden-audio.js','garden-mutations.js','garden-stillbloom.js']){
  assert(fs.existsSync(path.join(root,file)));assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('src="'+file));
}
for(const file of ['pixi-live.js','pixi-stress.js'])assert.match(fs.readFileSync(path.join(root,file),'utf8'),/PacketGarden requires WebGL to display the garden\. Try a browser with WebGL enabled\./);
assert.doesNotMatch(fs.readFileSync(path.join(root,'garden.css'),'utf8'),/garden-perf|garden-overlay|\.garden-stage|weather-intensity|weather-controls/);
console.log('PASS: Canvas-only files absent, closed supported-page script/style/navigation graph, shared dependencies retained, script-free bookmark redirect and friendly WebGL failure on all Pixi entry points.');
