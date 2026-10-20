// Deterministic structural/scene checks, deliberately no GPU timing assertions or sleeps.
const assert = require('node:assert/strict'), fs = require('node:fs');
const { config, weather, sceneModel, contain, frameWindow, makeAtlas, createScene } = require('../wwwroot/pixi-stress.js');
const read = file => fs.readFileSync(file, 'utf8');
const html = read('wwwroot/pixi-stress.html'), script = read('wwwroot/pixi-stress.js');
const index = read('wwwroot/canvas.html');
assert.match(index, /garden\.js/); assert.match(index, /garden-overlay/); assert.doesNotMatch(index, /pixi/i);
assert.match(html, /vendor\/pixi\/pixi\.min\.js/); assert.match(html, /pixi-stress\.js/);
assert.match(html, /value="mixed" selected/); assert.match(html, /value="hurricane" selected/);
assert.match(read('wwwroot/vendor/pixi/pixi.min.js'), /8\.22\.0/);
assert.match(read('wwwroot/vendor/pixi/LICENSE'), /MIT License/);
assert.match(read('wwwroot/vendor/pixi/THIRD-PARTY-NOTICES.txt'), /earcut/);
assert.match(read('wwwroot/vendor/pixi/THIRD-PARTY-NOTICES.txt'), /Vlad Shilov/);
assert.equal(JSON.parse(read('package.json')).devDependencies['pixi.js'], '8.22.0');
for (const file of ['Program.cs', 'GardenEvents.cs', 'TcpNoiseAdapter.cs', 'WeatherAdapter.cs']) assert.doesNotMatch(read(file), /pixi/i);
assert.doesNotMatch(script, /EventSource|fetch\(|localStorage|sessionStorage|setTimeout|setInterval|OffscreenCanvas/);
assert.match(script, /backgroundAlpha: 1/); assert.match(script, /preference: 'webgl'/);
assert.match(script, /ticker\.lastTime/); assert.match(script, /new ResizeObserver/);
assert.deepEqual([config.width, config.height, config.capacity], [960, 600, 640]);
assert.deepEqual(sceneModel('mixed'), sceneModel('mixed'));
for (const [mode, plants, grass] of [['empty', 0, 0], ['sparse', 50, 100], ['mixed', 640, 640], ['vines', 640, 640], ['wireferns', 640, 640]]) {
  const model = sceneModel(mode);
  assert.equal(model.specimens.length, plants); assert.equal(model.grass.length, grass);
  assert.equal(new Set(model.specimens.map(p => p.cell)).size, plants);
  assert.equal(model.puddles, plants ? 8 : 0); assert.equal(model.actors, plants ? 8 : 0);
  assert(model.specimens.every(p => p.vigor >= 0 && p.vigor <= 3));
}
assert.equal(new Set(sceneModel('mixed').specimens.map(p => p.type)).size, 8);
assert.equal(new Set(sceneModel('mixed').specimens.map(p => p.vigor)).size, 4);
assert.equal(sceneModel('vines').connections.length, 32 * 19 + 31 * 20);
assert.equal(sceneModel('wireferns').connections.length, 0);
assert.throws(() => sceneModel('unknown'));
for (const [level, count] of [['quiet', 0], ['drizzle', 16], ['rain', 48], ['heavy', 150], ['thunderstorm', 260], ['hurricane', 400]]) assert.equal(weather[level].count, count);
for (const [width, height] of [[960, 600], [300, 800], [1800, 500]]) {
  const fit = contain(width, height);
  assert.equal(960 * fit.scale / (600 * fit.scale), 1.6);
  assert(960 * fit.scale <= width && 600 * fit.scale <= height);
  assert(Math.abs(fit.x * 2 + 960 * fit.scale - width) < 1e-9);
  assert(Math.abs(fit.y * 2 + 600 * fit.scale - height) < 1e-9);
}
const timing = frameWindow();
for (let i = 0; i < 10000; i++) timing.add(1000 / 60);
let stats = timing.snapshot(); assert.equal(stats.size, 240); assert.equal(stats.capacity, 240);
assert(Math.abs(stats.averageFps - 60) < 1e-9);
timing.add(500); stats = timing.snapshot(); assert.equal(stats.sessionWorstMs, 500); assert.equal(stats.over300, 1);
for (let i = 0; i < 300; i++) timing.add(1000 / 60);
stats = timing.snapshot(); assert.equal(stats.sessionWorstMs, 500); assert(stats.worstMs < 17);
timing.add(NaN); timing.add(-1); assert.equal(timing.snapshot().frames, 10301);
timing.reset(); assert.equal(timing.snapshot().frames, 0); assert.equal(timing.snapshot().sessionWorstMs, 0);

// Minimal display-object doubles exercise real creation/replacement/destruction logic.
let live = new Set(), generated = 0;
const point = () => ({ x: 0, y: 0, set(x, y = x) { this.x = x; this.y = y; } });
class Container {
  constructor() { this.children = []; this.position = point(); this.scale = point(); this.visible = true; live.add(this); }
  addChild(...children) { this.children.push(...children); return children[0]; }
  removeChildren() { return this.children.splice(0); }
  destroy(options) { if (options?.children) for (const child of this.removeChildren()) child.destroy(options); live.delete(this); }
}
class Graphics extends Container {}
for (const method of ['rect', 'roundRect', 'circle', 'ellipse', 'poly', 'moveTo', 'lineTo', 'bezierCurveTo', 'stroke', 'fill', 'clear']) Graphics.prototype[method] = function () { return this; };
class Sprite extends Container { constructor(texture) { super(); this.texture = texture; this.anchor = point(); } }
class Particle { constructor(options) { Object.assign(this, options); } }
class ParticleContainer extends Container {
  constructor(options) { super(); this.options = options; this.particleChildren = []; }
  addParticle(particle) { this.particleChildren.push(particle); }
  removeParticles() { this.particleChildren.length = 0; }
  update() { this.updated = true; }
}
class Rectangle { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); } }
class Texture { constructor(options) { Object.assign(this, options); } }
const P = { Container, Graphics, Sprite, Particle, ParticleContainer, Rectangle, Texture };
const renderer = { generateTexture(options) { generated++; assert.equal(options.resolution, 2); return { source: {}, destroy() {} }; } };
const cache = makeAtlas(P, renderer); assert.equal(generated, 1); assert.equal(cache.frames.size, 44); assert.equal(live.size, 0);
assert.equal(new Set([...cache.frames.values()].map(t => t.source)).size, 1);
const app = { stage: new Container() }, scene = createScene(P, app, cache.frames);
scene.setMode('mixed'); scene.setWeather('hurricane');
assert.equal(scene.snapshot().sprites, 1297); assert.equal(scene.snapshot().particles, 400);
assert.equal(scene.snapshot().sceneChildren, 9);
const baseline = live.size, root = scene.root, oldPlants = root.children[4].children.slice();
for (let i = 0; i < 50; i++) {
  scene.setMode('empty'); assert.equal(scene.snapshot().specimens, 0); assert.equal(scene.snapshot().actors, 0);
  scene.setMode('vines'); assert.equal(scene.snapshot().connections, 1228);
  scene.setMode('wireferns'); scene.setMode('mixed'); assert.equal(live.size, baseline);
  for (const level of Object.keys(weather)) { scene.setWeather(level); assert.equal(scene.snapshot().particles, weather[level].count); }
}
assert(oldPlants.every(plant => !live.has(plant)), 'Old scene sprites were destroyed');
assert.equal(generated, 1, 'Mode switches reuse the atlas');
const before = scene.snapshot(), particle = root.children[6].particleChildren[0];
const oldY = particle.y;
scene.animate(1, 1 / 60); assert.notEqual(particle.y, oldY);
assert.deepEqual(scene.snapshot(), before); assert.equal(live.size, baseline);
scene.setProbes(false); assert.equal(scene.snapshot().sprites, 1296);
scene.resize(1200, 600); assert.equal(root.scale.x, root.scale.y); assert.equal(root.position.x, 120);
scene.destroy(); assert.equal(live.size, 1, 'Only app stage remains; shared textures survive scene cleanup');
console.log('Pixi stress checks passed: isolation, deterministic loads, texture reuse, bounded objects/particles/timings, contain resize.');
