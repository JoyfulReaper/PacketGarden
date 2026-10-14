// Browser-path checks with controlled DOM, EventSource, clock, and random values.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('wwwroot/index.html', 'utf8');
const sourceOptions = html.match(/<select id="weather-source">([\s\S]*?)<\/select>/)[1];
const initialWeatherSource = sourceOptions.match(/<option value="([^"]+)" selected>/)[1];
const initialSoundVolume = html.match(/id="sound-volume"[^>]*value="([^"]+)"/)[1];
const elements = new Map(), sources = [], timeouts = new Map(); let nextTimeout = 0;
const animationFrames = new Map(); let nextFrame = 0;
const drawing = [];
const context = new Proxy({}, {
  get: (_, method) => (...args) => drawing.push([method, ...args]),
  set: (_, property, value) => { drawing.push([property, value]); return true; }
});
const element = selector => {
  if (!elements.has(selector)) elements.set(selector, {
    value: selector === '#weather-source' ? initialWeatherSource : selector === '#weather-level' ? 'quiet'
      : selector === '#sound-volume' ? initialSoundVolume : '1200',
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
  performance: { now: () => 1000 },
  document: { querySelector: element }, ResizeObserver: class { observe() {} },
  window: { addEventListener() {}, setInterval() {},
    requestAnimationFrame(handler) { animationFrames.set(++nextFrame,handler); return nextFrame; },
    cancelAnimationFrame(id) { animationFrames.delete(id); },
    setTimeout(handler) { timeouts.set(++nextTimeout, handler); return nextTimeout; }, clearTimeout(id) { timeouts.delete(id); } }
};
sandbox.Math.random = () => 0;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('wwwroot/garden-audio.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('wwwroot/garden.js', 'utf8'), sandbox);
const run = code => vm.runInContext(code, sandbox);
const reset = () => run('gardenState.specimens=[]; gardenState.grassCells=[]; nextGrassSpreadAt=1000000;');
assert.equal(sources.length, 1); assert.equal(sources[0].url, '/api/garden/events');
const source = sources[0];
assert.equal(element('#weather-source').value, 'live', 'HTML selects Live on initial load');
assert.equal(element('#weather-level').disabled, true, 'manual weather level starts disabled');
assert.equal(element('#weather-intensity').disabled, true, 'manual rate starts disabled');
assert.equal(element('#weather-status').textContent, 'Live weather connecting');
// Switching before any weather frame restores the live connection status.
element('#weather-source').value='manual'; element('#weather-source').handlers.change();
assert.equal(element('#weather-level').disabled, false);
assert.equal(element('#weather-intensity').disabled, false);
assert.equal(element('#weather-status').textContent, 'Manual weather');
source.onerror(); assert.equal(element('#weather-status').textContent, 'Manual weather');
element('#weather-source').value='live'; element('#weather-source').handlers.change();
assert.equal(element('#weather-level').disabled, true);
assert.equal(element('#weather-intensity').disabled, true);
assert.equal(element('#weather-status').textContent, 'Live weather disconnected');
source.onopen(); assert.equal(element('#weather-status').textContent, 'Live weather connected');
assert.equal(run('gardenState.grassCells.length'), 5, 'garden starts with exactly five grass seeds');
assert.equal(run('new Set(gardenState.grassCells.map(g => `${g.column},${g.row}`)).size'), 5, 'initial grass seeds are distinct');
assert.equal(run('JSON.stringify(gardenState.grassCells.map(g => [g.column, g.row]))'), '[[0,0],[0,4],[0,8],[0,12],[0,16]]');
assert(run('gardenState.grassCells.every(g => g.createdAt === 1000 && g.lastInfluencedAt === 1000)'));

for (const [port, type] of [[443,'broadleaf'],[22,'redbloom'],[2222,'vine'],[5432,'mushroom'],[42069,'flower'],[65535,'flower']]) {
  for (const vigor of [0, 1, 2, 3]) {
  reset(); sandbox.Math.random = () => 0;
  source.emit('garden', { specimenType:type, listenPort:port, vigor });
  assert.equal(run('gardenState.specimens.length'), 1);
  assert.equal(run('gardenState.specimens[0].type'), type);
  assert.equal(run('gardenState.specimens[0].vigor'), vigor, 'received vigor retained');
  assert.equal(run('gardenState.grassCells.length'), 0, 'real TCPNoise growth must not seed grass');
  }
}

for (const [type, expires, color] of [['weed',360000,'#bec04c'],['ghostbloom',360000,'#e2f6ff'],
  ['crystalfungus',420000,'#71dce4'],['blackthorn',720000,'#281c39']]) {
  reset(); sandbox.Math.random = () => 0;
  source.emit('garden', { specimenType:type, listenPort:443, vigor:0 });
  source.emit('garden', { specimenType:type, listenPort:443, vigor:3 });
  assert.equal(run('gardenState.specimens.length'), 2);
  assert(run(`gardenState.specimens.every(s => s.type === '${type}')`));
  assert.equal(run('Math.max(Math.abs(gardenState.specimens[0].column-gardenState.specimens[1].column), Math.abs(gardenState.specimens[0].row-gardenState.specimens[1].row))'), 1, 'variants share clustered placement');
  assert.equal(run('gardenState.grassCells.length'), 0, 'real variants never seed grass');
  run('influenceGrassCell(0, 0, 500)');
  source.emit('garden', { specimenType:type, listenPort:443, vigor:3 });
  assert.equal(run('gardenState.grassCells.length'), 1);
  assert.equal(run('gardenState.grassCells[0].lastInfluencedAt'), 500, 'real variants never refresh grass');
  assert.equal(run(`speciesConfig.get('${type}').timings.expiredAfterMs`), expires);
  const render = now => run(`speciesConfig.get('${type}').render(gardenState.specimens[0], ${now})`);
  for (const age of [0, run(`speciesConfig.get('${type}').timings.growingAfterMs`), 60000,
    run(`speciesConfig.get('${type}').timings.fadingAfterMs`), expires - 1]) {
    drawing.length = 0; render(1000 + age);
    assert(drawing.some(([method]) => method === 'fill' || method === 'stroke'), `${type} draws each living stage`);
    assert.equal(drawing.filter(([method]) => method === 'save').length,
      drawing.filter(([method]) => method === 'restore').length, 'Canvas state balanced');
    assert(drawing.every(([, ...args]) => args.every(value => typeof value !== 'number' || Number.isFinite(value))));
  }
  drawing.length = 0; render(61000);
  assert(drawing.some(([, value]) => value === color), `${type} uses its distinct mature palette`);
  drawing.length = 0; render(1000 + expires);
  assert.equal(drawing.length, 0, 'expired variant draws nothing');
  run(`updateGarden(${1000 + expires - 1})`); assert.equal(run('gardenState.specimens.length'), 3);
  run(`updateGarden(${1000 + expires})`); assert.equal(run('gardenState.specimens.length'), 0);
}

reset(); sandbox.Math.random = () => 0;
source.emit('garden', { specimenType:'vine', listenPort:2222, vigor:0 });
source.emit('garden', { specimenType:'vine', listenPort:2222, vigor:3 });
assert.equal(run('gardenState.specimens.length'), 2);
assert.equal(run('Math.max(Math.abs(gardenState.specimens[0].column-gardenState.specimens[1].column), Math.abs(gardenState.specimens[0].row-gardenState.specimens[1].row))'), 1);

reset();
for (const bad of ['{','null',{specimenType:'nope',listenPort:443,vigor:0},{specimenType:'broadleaf',listenPort:0,vigor:0},
  {specimenType:'broadleaf',listenPort:65536,vigor:0},{specimenType:'broadleaf',listenPort:443.5,vigor:0},
  {specimenType:'broadleaf',listenPort:'443',vigor:0},{type:'port-hit',port:443}]) source.emit('garden', bad);
source.emit('garden', {specimenType:'flower',listenPort:443});
for (const vigor of [-1,4,1.5,'2',null,true,{},[],NaN,Infinity])
  source.emit('garden', {specimenType:'flower',listenPort:443,vigor});
assert.equal(run('gardenState.specimens.length'),0);

for (const [event,type,grass] of [['dns','flower',true],['http','broadleaf',true],['ssh','vine',false],['gopher','mushroom',false],['port22-probe','redbloom',false]]) {
  reset(); sandbox.Math.random = () => 0;
  element(`#fake-${event}`).handlers.click();
  assert.equal(run('gardenState.specimens.length'), 1);
  assert.equal(run('gardenState.specimens[0].type'),type);
  assert.equal(run('gardenState.specimens[0].vigor'),0,'fake controls default to vigor 0');
  assert.equal(run('gardenState.grassCells.length > 0'), grass);
}

assert.match(html, /id="fake-port22-probe"[^>]*>Fake port 22 probe<\/button>/);
assert(!html.includes('fake-failed-auth'));
assert(!elements.has('#fake-failed-auth'), 'obsolete control is not bound');
assert(!run("eventSpecimenTypes.has('failed-auth')"));
assert(!run("fakeTrafficConfig.eventWeights.some(e => e.type === 'failed-auth')"));
reset();
run("handleGardenEvent({type:'failed-auth'})");
assert.equal(run('gardenState.specimens.length'), 0, 'obsolete fake event rejected');
assert.equal(run('gardenState.grassCells.length'), 0);

reset(); sandbox.Math.random = () => 0;
run('influenceGrassCell(0, 0, 500)');
source.emit('garden', {specimenType:'redbloom', listenPort:22, vigor:3});
element('#fake-port22-probe').handlers.click();
assert.equal(run('gardenState.specimens.length'), 2);
assert(run("gardenState.specimens.every(s => s.type === 'redbloom')"));
assert.equal(run('Math.max(Math.abs(gardenState.specimens[0].column-gardenState.specimens[1].column), Math.abs(gardenState.specimens[0].row-gardenState.specimens[1].row))'), 1, 'real/fake redblooms share clustering');
assert.equal(run('gardenState.grassCells.length'), 1);
assert.equal(run('gardenState.grassCells[0].lastInfluencedAt'), 500, 'real/fake port-22 growth never refreshes grass');
for (const age of [0, 9999, 10000, 29999, 30000]) {
  drawing.length = 0;
  run(`drawRedbloom(gardenState.specimens[0], ${1000 + age})`);
  assert.equal(drawing.length > 0, age < 30000, 'redbloom rendering retains its 30-second lifetime');
}
run('updateGarden(30999)'); assert.equal(run('gardenState.specimens.length'), 2);
run('updateGarden(31000)'); assert.equal(run('gardenState.specimens.length'), 0);

// The browser trusts the normalized species; it never derives a species from port 22.
reset(); source.emit('garden', {specimenType:'flower', listenPort:22, vigor:2});
assert.equal(run('gardenState.specimens[0].type'), 'flower');

// Deterministic Canvas command assertions, without pixel snapshots or extra random choices.
const trace = (type, vigor, age) => {
  drawing.length = 0;
  sandbox.Math.random = () => { throw new Error('Rendering must not reroll vigor'); };
  run(`speciesConfig.get('${type}').render({type:'${type}',column:0,row:0,createdAt:1000,vigor:${vigor}},${1000 + age})`);
  return drawing.map(command => [...command]);
};
const commands = (trace, method) => trace.filter(command => command[0] === method);
for (const type of run('Array.from(speciesConfig.keys())')) {
  reset();
  const timing = run(`speciesConfig.get('${type}').timings`);
  const mature = timing.matureAfterMs ?? 0;
  for (const vigor of [0, 3]) {
    for (const age of [0, timing.growingAfterMs ?? 0, mature,
      timing.fadingAfterMs ?? timing.wiltingAfterMs ?? timing.decayingAfterMs ?? timing.dryingAfterMs,
      timing.expiredAfterMs - 1]) {
      const painted = trace(type, vigor, age);
      assert(painted.some(([method]) => method === 'fill' || method === 'stroke'));
      assert.equal(commands(painted,'save').length, commands(painted,'restore').length, `${type} Canvas state balanced`);
      assert(painted.every(([, ...args]) => args.every(value => typeof value !== 'number' || Number.isFinite(value))));
      assert.deepEqual(trace(type, vigor, age), painted, `${type} vigor appearance stable`);
    }
    assert.equal(trace(type,vigor,timing.expiredAfterMs).length,0, `${type} vigor leaves expiry unchanged`);
  }
  const low = trace(type,0,mature), high = trace(type,3,mature);
  assert.notDeepEqual(high,low, `${type} high vigor visibly changes drawing details`);
  if (type !== 'crystalfungus') assert.deepEqual(commands(high,'scale'), commands(low,'scale'), 'vigor does not zoom the whole specimen');
  if (type === 'flower' || type === 'ghostbloom')
    assert(commands(high,type === 'flower' ? 'arc' : 'ellipse').length > commands(low,type === 'flower' ? 'arc' : 'ellipse').length, 'fuller petals');
  if (type === 'mushroom') {
    assert(commands(high,'arc').length > commands(low,'arc').length,'extra cap spots');
    assert(commands(high,'ellipse')[0][3] > commands(low,'ellipse')[0][3],'broader cap');
    assert(commands(high,'fillRect')[0][3] > commands(low,'fillRect')[0][3],'thicker stem');
  }
  if (type === 'broadleaf') {
    assert(commands(high,'ellipse').length > commands(low,'ellipse').length,'additional broadleaf leaves');
    assert(high.some(([,value])=>value==='#8d6f9f') && high.some(([,value])=>value==='#6f567f'),'plum palette preserved');
  }
  if (type === 'vine') assert(commands(high,'ellipse').length > commands(low,'ellipse').length,'extra vine leaf');
  if (type === 'redbloom' || type === 'weed') assert(commands(high,'lineTo').length > commands(low,'lineTo').length,'extra spikes/branches');
  if (type === 'crystalfungus' || type === 'blackthorn') assert(commands(high,'stroke').length > commands(low,'stroke').length,'extra facets/branches');
  if (type === 'ghostbloom') assert(commands(high,'arc')[0][3] <= 15,'halo radius stays bounded');
  sandbox.Math.random = () => 0;
  source.emit('garden',{specimenType:type,listenPort:type==='redbloom'?22:443,vigor:3});
  const before = run('JSON.stringify(gardenState.specimens[0])');
  run(`drawGarden(); updateGarden(${1000 + timing.expiredAfterMs - 1})`);
  assert.equal(run('JSON.stringify(gardenState.specimens[0])'),before,'vigor retained through redraw and aging');
  assert.equal(run('gardenState.grassCells.length'),0,'every real species at high vigor remains grass-free');
  run(`updateGarden(${1000 + timing.expiredAfterMs})`);
  assert.equal(run('gardenState.specimens.length'),0,'high vigor leaves lifecycle removal unchanged');
}
reset();
run("gardenState.specimens=[{type:'vine',column:0,row:0,createdAt:1000,vigor:3},{type:'vine',column:1,row:0,createdAt:1000,vigor:0}]");
assert.deepEqual(commands(trace('vine',0,60000),'quadraticCurveTo'),commands(trace('vine',3,60000),'quadraticCurveTo'),'vigor leaves vine connectivity geometry unchanged');
sandbox.Math.random = () => 0;

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

source.emit('weather',{level:'rain',eventsPerMinute:29.8});
assert.equal(run('weatherState.level'),'rain', 'first valid live frame applies automatically');
assert.equal(run('weatherState.eventsPerMinute'),29.8);
assert.equal(element('#weather-level').value,'rain');
assert.equal(element('#weather-intensity').value,'29.8');
source.emit('weather','{'); assert.equal(element('#weather-status').textContent,'Live weather update invalid');
source.emit('weather',{level:'drizzle',eventsPerMinute:12}); assert.equal(run('weatherState.level'),'drizzle');
assert.equal(element('#weather-status').textContent,'Live weather connected');
element('#weather-source').value='manual'; element('#weather-source').handlers.change();
assert.equal(element('#weather-level').disabled,false);
assert.equal(element('#weather-intensity').disabled,false);
assert.equal(element('#weather-status').textContent,'Manual weather');
element('#weather-level').value='heavy_rain'; element('#weather-level').handlers.change();
element('#weather-intensity').value='900'; element('#weather-intensity').handlers.input();
assert.equal(run('weatherState.eventsPerMinute'),900,'Manual rate override still works');
source.emit('weather','{'); assert.equal(element('#weather-status').textContent,'Manual weather');
source.emit('weather',{level:'quiet',eventsPerMinute:0}); assert.equal(run('weatherState.level'),'heavy_rain');
assert.equal(run('weatherState.eventsPerMinute'),900,'live updates do not replace Manual rate');
element('#weather-source').value='live'; element('#weather-source').handlers.change(); assert.equal(run('weatherState.level'),'quiet');
assert.equal(run('weatherState.eventsPerMinute'),0,'switching back immediately applies cached live rate');
assert.equal(element('#weather-level').disabled,true);
assert.equal(element('#weather-intensity').disabled,true);
assert.equal(element('#weather-status').textContent,'Live weather connected');
const state=JSON.stringify(run('gardenState')); source.onerror(); assert.equal(element('#weather-status').textContent,'Live weather disconnected'); source.onopen();
assert.equal(JSON.stringify(run('gardenState')),state); assert.equal(sources.length,1);

for (const [level, expected] of [
  ['quiet',{drops:0,speed:0,darkening:0,length:0,opacity:0}],
  ['drizzle',{drops:16,speed:120,darkening:0.04,length:5,opacity:0.18}],
  ['rain',{drops:48,speed:260,darkening:0.09,length:8,opacity:0.35}]
]) assert.deepEqual(JSON.parse(run(`JSON.stringify(weatherLevels.get('${level}'))`)),expected,'lower weather settings unchanged');
let previous = JSON.parse(run("JSON.stringify(weatherLevels.get('rain'))"));
for (const level of ['heavy_rain','botnet_thunderstorm','botnet_hurricane']) {
  const weather = JSON.parse(run(`JSON.stringify(weatherLevels.get('${level}'))`));
  for (const key of ['drops','speed','darkening','length','opacity']) assert(weather[key]>previous[key], `${level} increases ${key}`);
  assert(weather.drift>(previous.drift??0) && weather.slant>(previous.slant??2),'increasing wind-driven slant');
  run(`Object.assign(weatherState,{level:'${level}',eventsPerMinute:10000})`);
  drawing.length=0; run('drawRain(1000)');
  assert.equal(commands(drawing,'lineTo').length,weather.drops,'severe rain count not capped at old 256');
  const firstStart = commands(drawing,'moveTo')[0], firstEnd = commands(drawing,'lineTo')[0];
  assert.equal(firstEnd[1]-firstStart[1],weather.slant);
  drawing.length=0; run('drawRain(2000)');
  assert.equal(commands(drawing,'moveTo')[0][1]-firstStart[1],weather.drift,'rain moves horizontally over time');
  previous=weather;
}
assert(run("weatherLevels.get('heavy_rain').drops >= weatherLevels.get('rain').drops * 3"),'nonlinear jump into severe rain');
element('#weather-source').value='manual'; element('#weather-source').handlers.change();
element('#weather-intensity').value='10000'; element('#weather-intensity').handlers.input();
for (const level of ['heavy_rain','botnet_thunderstorm','botnet_hurricane']) {
  element('#weather-level').value=level; element('#weather-level').handlers.change();
  assert.equal(animationFrames.size,1,'weather changes keep one animation frame');
  const [id,callback]=animationFrames.entries().next().value; animationFrames.delete(id); callback();
  assert.equal(animationFrames.size,1,'animation schedules one successor');
}
element('#weather-intensity').value='0'; element('#weather-intensity').handlers.input();
assert.equal(animationFrames.size,0,'zero intensity cancels weather animation');
element('#weather-source').value='live'; element('#weather-source').handlers.change();
source.emit('weather',{level:'botnet_hurricane',eventsPerMinute:10000});
assert.equal(animationFrames.size,1,'live severe weather uses same bounded animation loop');
source.emit('weather',{level:'quiet',eventsPerMinute:0}); assert.equal(animationFrames.size,0);

reset(); sandbox.Math.random=()=>0;
element('#automatic-traffic').handlers.click(); const callback=timeouts.values().next().value; timeouts.clear(); callback();
assert.equal(run('gardenState.specimens.length'),1); assert(run('gardenState.grassCells.length')>0);
element('#automatic-traffic').handlers.click(); assert.equal(timeouts.size,0);
reset(); sandbox.Math.random=()=>0.99;
element('#automatic-traffic').handlers.click();
const probeCallback=timeouts.values().next().value; timeouts.clear(); probeCallback();
assert.equal(run('gardenState.specimens.length'),1);
assert.equal(run('gardenState.specimens[0].type'),'redbloom', 'weighted fake traffic now emits port22-probe');
assert.equal(run('gardenState.grassCells.length'),0);
element('#automatic-traffic').handlers.click(); assert.equal(timeouts.size,0);
console.log('PASS: five initial grass seeds, normalized growth/vigor validation, stable species-specific vigor details/lifecycles, shared clustering/connectivity, fake controls/traffic, DNS/HTTP-only grass, Manual/Live switching, one SSE connection, reconnect state retention.');
require('./garden-audio.cjs')().catch(error => { console.error(error); process.exitCode=1; });
