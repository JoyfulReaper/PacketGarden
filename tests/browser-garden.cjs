// Full browser-script integration with injected clock/rolls; no sleeps or audio device.
const fs = require('node:fs'), vm = require('node:vm');

function createGarden() {
  const clock = { now: 10_000 }, elements = new Map(), intervals = [], frames = new Map(), drawing = [];
  let nextFrame = 0;
  let rect = { left: 40, top: 70, width: 992, height: 632 };
  const context = new Proxy({}, {
    get: (_, method) => (...args) => drawing.push([method, ...args]),
    set: (_, name, value) => { drawing.push([name, value]); return true; }
  });
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      hidden: selector === '#specimen-card' || selector === '#collection-message',
      textContent: '', style: {}, offsetWidth: 280, offsetHeight: 240,
      value: selector === '#weather-source' ? 'live' : selector === '#weather-level' ? 'quiet'
        : selector === '#sound-volume' ? '12' : '1200',
      handlers: new Map(), attributes: {},
      addEventListener(name, handler) {
        if (!this.handlers.has(name)) this.handlers.set(name, []);
        this.handlers.get(name).push(handler);
      },
      setAttribute(name, value) { this.attributes[name] = value; },
      getContext: () => context, getBoundingClientRect: () => rect
    });
    return elements.get(selector);
  };
  const sources = [];
  class Source {
    constructor(url) { this.url = url; this.handlers = new Map(); sources.push(this); }
    addEventListener(name, handler) {
      if (!this.handlers.has(name)) this.handlers.set(name, []);
      this.handlers.get(name).push(handler);
    }
    emit(event) {
      for (const handler of this.handlers.get('garden')) {
        handler({ data: typeof event === 'string' ? event : JSON.stringify(event) });
      }
    }
  }
  let audioContexts = 0;
  const sandbox = {
    Date: { now: () => clock.now }, performance: { now: () => clock.now }, Math: Object.create(Math),
    document: { querySelector: element }, EventSource: Source, ResizeObserver: class { observe() {} },
    window: {
      innerWidth: 1200, innerHeight: 900, devicePixelRatio: 2, addEventListener() {},
      setInterval(handler, delay) { intervals.push({ handler, delay }); return intervals.length; },
      setTimeout() { throw new Error('Browser features must reuse the existing tick'); }, clearTimeout() {},
      requestAnimationFrame(handler) { frames.set(++nextFrame, handler); return nextFrame; },
      cancelAnimationFrame(id) { frames.delete(id); },
      AudioContext: class { constructor() { audioContexts++; throw new Error('Audio must stay off'); } }
    }
  };
  sandbox.Math.random = () => 0.5;
  vm.createContext(sandbox);
  // Exercise the exact production load order, including color/inspection wrappers.
  const scripts = [...fs.readFileSync('wwwroot/index.html', 'utf8').matchAll(/<script src="([^"]+)" defer><\/script>/g)];
  for (const [, file] of scripts) vm.runInContext(fs.readFileSync('wwwroot/' + file, 'utf8'), sandbox);
  const run = code => vm.runInContext(code, sandbox);
  run('const originalCollectibleSpawn = maybeSpawnPort22Collectible');
  const forceRoll = roll => run(`maybeSpawnPort22Collectible = specimen => originalCollectibleSpawn(specimen, ${roll}, () => 0.5)`);
  const emit = (port = 22, type = 'redbloom', vigor = 0) => {
    clock.now++;
    sources[0].emit({ specimenType: type, listenPort: port, vigor, sensor: 'garden-test', seenCount: '12' });
  };
  const tick = () => intervals.find(item => item.delay === 250).handler();
  const click = (x, y) => {
    const scale = Math.min(rect.width / 992, rect.height / 632);
    const clientX = rect.left + (rect.width - 960 * scale) / 2 + x * scale;
    const clientY = rect.top + (rect.height - 600 * scale) / 2 + y * scale;
    for (const handler of element('canvas').handlers.get('click')) handler({ clientX, clientY });
  };
  const fill = vigor => run(`gardenState.specimens = Array.from({length:640}, (_,i) =>
    ({type:'broadleaf',column:i%columns,row:Math.floor(i/columns),createdAt:Date.now(),vigor:${vigor}}))`);
  return { run, element, sources, clock, intervals, frames, drawing, sandbox, forceRoll, emit, tick, click, fill,
    resize(value) { rect = value; }, audioContexts: () => audioContexts };
}

module.exports = createGarden;
