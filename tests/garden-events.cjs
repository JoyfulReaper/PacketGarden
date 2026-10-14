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

for (const [port, type] of [[443,'broadleaf'],[22,'vine'],[5432,'mushroom'],[42069,'flower'],[65535,'flower']]) {
  reset(); sandbox.Math.random = () => 0;
  source.emit('garden', { specimenType:type, listenPort:port });
  assert.equal(run('gardenState.specimens.length'), 1);
  assert.equal(run('gardenState.specimens[0].type'), type);
  assert.equal(run('gardenState.grassCells.length'), 0, 'real TCPNoise growth must not seed grass');
}

reset(); sandbox.Math.random = () => 0;
source.emit('garden', { specimenType:'vine', listenPort:22 });
source.emit('garden', { specimenType:'vine', listenPort:22 });
assert.equal(run('gardenState.specimens.length'), 2);
assert.equal(run('Math.max(Math.abs(gardenState.specimens[0].column-gardenState.specimens[1].column), Math.abs(gardenState.specimens[0].row-gardenState.specimens[1].row))'), 1);

reset();
for (const bad of ['{','null',{specimenType:'nope',listenPort:443},{specimenType:'broadleaf',listenPort:0},
  {specimenType:'broadleaf',listenPort:65536},{specimenType:'broadleaf',listenPort:443.5},
  {specimenType:'broadleaf',listenPort:'443'},{type:'port-hit',port:443}]) source.emit('garden', bad);
assert.equal(run('gardenState.specimens.length'),0);

for (const [event,type,grass] of [['dns','flower',true],['http','broadleaf',true],['ssh','vine',false],['gopher','mushroom',false],['failed-auth','redbloom',false]]) {
  reset(); sandbox.Math.random = () => 0;
  element(`#fake-${event}`).handlers.click();
  assert.equal(run('gardenState.specimens.length'), 1);
  assert.equal(run('gardenState.specimens[0].type'),type);
  assert.equal(run('gardenState.grassCells.length > 0'), grass);
}

for(const [eventType,chance] of [['dns',.45],['http',.65]]) {
  reset(); sandbox.Math.random=()=>chance;
  run(`influenceGrass('${eventType}',{column:10,row:10})`); assert.equal(run('gardenState.grassCells.length'),0);
  sandbox.Math.random=()=>chance-.01;
  run(`influenceGrass('${eventType}',{column:10,row:10})`); assert(run('gardenState.grassCells.length')>0);
  const count=run('gardenState.grassCells.length'); run('gardenState.grassCells.forEach(g=>g.lastInfluencedAt=0)');
  run(`influenceGrass('${eventType}',{column:10,row:10})`); assert.equal(run('gardenState.grassCells.length'),count);
  assert.equal(run('gardenState.grassCells[0].lastInfluencedAt'),1000);
}
reset(); sandbox.Math.random=()=>0;
run("influenceGrass('flower',{column:10,row:10}); influenceGrass('broadleaf',{column:11,row:10});");
assert.equal(run('gardenState.grassCells.length'), 0, 'species names alone must not trigger grass');

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
assert.equal(run('gardenState.specimens.length'),1); assert(run('gardenState.grassCells.length')>0);
element('#automatic-traffic').handlers.click(); assert.equal(timeouts.size,0);
console.log('PASS: normalized growth, shared clustering, validation, fake controls/traffic, DNS/HTTP-only grass, Manual/Live switching, one SSE connection, reconnect state retention.');
