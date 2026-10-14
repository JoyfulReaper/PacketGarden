// Browser-path checks with controlled DOM, EventSource, clock, and random values.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const elements = new Map(), sources = [], timeouts = new Map(); let nextTimeout = 0;
const context = new Proxy({}, { get: () => () => {}, set: () => true });
const element = selector => {
  if (!elements.has(selector)) elements.set(selector, {
    value: selector === '#weather-source' ? 'manual' : selector === '#weather-level' ? 'quiet' : '1200',
    handlers: {}, addEventListener(name, handler) { this.handlers[name] = handler; },
    getContext: () => context, getBoundingClientRect: () => ({ width: 960, height: 600 }), setAttribute() {}
  });
  return elements.get(selector);
};
class Source {
  constructor(url) { this.url = url; this.handlers = {}; sources.push(this); }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  emit(name, data) { this.handlers[name]({ data: typeof data === 'string' ? data : JSON.stringify(data) }); }
}
const sandbox = { Date: { now: () => 1000 }, Math: Object.create(Math), EventSource: Source,
  document: { querySelector: element }, ResizeObserver: class { observe() {} },
  window: { addEventListener() {}, setInterval() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
    setTimeout(handler) { timeouts.set(++nextTimeout, handler); return nextTimeout; }, clearTimeout(id) { timeouts.delete(id); } }
};
sandbox.Math.random = () => 0;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('wwwroot/garden.js', 'utf8'), sandbox);
const run = code => vm.runInContext(code, sandbox);
const reset = () => run('gardenState.specimens=[]; gardenState.grassCells=[]; nextGrassSpreadAt=1000000;');
assert.equal(sources.length, 1); assert.equal(sources[0].url, '/api/garden/events');
const source = sources[0];
for (const [port, type] of [[443,'broadleaf'],[22,'vine'],[5432,'mushroom'],[42069,'flower'],[53,'flower'],[70,'mushroom'],[65535,'flower']]) {
  reset(); source.emit('garden', { type:'port-hit',port });
  assert.equal(run('gardenState.specimens.length'), 1);
  assert.equal(run('gardenState.specimens[0].type'), type);
  assert.equal(run('gardenState.grassCells.length > 0'), ['flower','broadleaf'].includes(type));
}
const inventory = [21,22,23,80,443,445,2323,3389,5432,6379,8080,9200,420,42069,25,2222,5900,8443];
for (const port of inventory) assert(['flower','broadleaf','vine','mushroom'].includes(run(`resolveSpecimenType({type:'port-hit',port:${port}})`)));
for (let port=1;port<=65535;port++) assert.notEqual(run(`resolveSpecimenType({type:'port-hit',port:${port}})`), 'redbloom');
reset();
for (const bad of ['{','null',{type:'port-hit',port:0},{type:'port-hit',port:65536},{type:'port-hit',port:443.5},{type:'port-hit',port:'443'},{type:'dns'}]) source.emit('garden', bad);
assert.equal(run('gardenState.specimens.length'),0);
for (const [event,type] of [['dns','flower'],['http','broadleaf'],['ssh','vine'],['gopher','mushroom'],['failed-auth','redbloom']]) {
  element(`#fake-${event}`).handlers.click(); assert.equal(run('gardenState.specimens.at(-1).type'),type);
}
for(const [type,chance] of [['flower',.45],['broadleaf',.65]]) {
  reset(); sandbox.Math.random=()=>chance;
  run(`influenceGrass('${type}',{column:10,row:10})`); assert.equal(run('gardenState.grassCells.length'),0);
  sandbox.Math.random=()=>chance-.01;
  run(`influenceGrass('${type}',{column:10,row:10})`); assert(run('gardenState.grassCells.length')>0);
  const count=run('gardenState.grassCells.length'); run('gardenState.grassCells.forEach(g=>g.lastInfluencedAt=0)');
  run(`influenceGrass('${type}',{column:10,row:10})`); assert.equal(run('gardenState.grassCells.length'),count);
  assert.equal(run('gardenState.grassCells[0].lastInfluencedAt'),1000);
}
source.onopen(); source.emit('weather',{level:'rain',eventsPerMinute:29.8});
assert.equal(run('weatherState.level'),'quiet');
element('#weather-source').value='live'; element('#weather-source').handlers.change();
assert.equal(run('weatherState.level'),'rain'); assert(element('#weather-level').disabled);
source.emit('weather',{level:'drizzle',eventsPerMinute:12}); assert.equal(run('weatherState.level'),'drizzle');
element('#weather-source').value='manual'; element('#weather-source').handlers.change();
element('#weather-level').value='heavy_rain'; element('#weather-level').handlers.change();
source.emit('weather',{level:'quiet',eventsPerMinute:0}); assert.equal(run('weatherState.level'),'heavy_rain');
element('#weather-source').value='live'; element('#weather-source').handlers.change(); assert.equal(run('weatherState.level'),'quiet');
const state=JSON.stringify(run('gardenState')); source.onerror(); assert.equal(element('#weather-status').textContent,'Live weather disconnected'); source.onopen();
assert.equal(JSON.stringify(run('gardenState')),state); assert.equal(sources.length,1);
reset(); sandbox.Math.random=()=>0;
element('#automatic-traffic').handlers.click(); const callback=timeouts.values().next().value; timeouts.clear(); callback();
assert.equal(run('gardenState.specimens.length'),1); element('#automatic-traffic').handlers.click(); assert.equal(timeouts.size,0);
console.log('PASS: all ports/fallback, single-event growth, validation, fake buttons/traffic, grass probabilities/refresh, Manual/Live switching, one SSE connection, reconnect state retention.');
