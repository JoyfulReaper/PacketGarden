const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const handlers = new Map();
const elements = new Map();
function makeElement(selector) {
  const element = {
    hidden: selector === '#specimen-card',
    textContent: '',
    style: {},
    offsetWidth: 280,
    offsetHeight: 240,
    addEventListener(name, handler) { handlers.set(`${selector}:${name}`, handler); }
  };
  elements.set(selector, element);
  return element;
}
for (const selector of [
  '#specimen-card', '#specimen-card-close', '#specimen-card-title', '#specimen-source',
  '#specimen-sensor', '#specimen-port', '#specimen-seen-count', '#specimen-vigor',
  '#specimen-color', '#specimen-age'
]) makeElement(selector);

const canvasHandlers = {};
const canvas = {
  addEventListener(name, handler) { canvasHandlers[name] = handler; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 992, height: 632 }; }
};
const sourceHandlers = {};
const gardenEventSource = {
  addEventListener(name, handler) { sourceHandlers[name] = handler; }
};
let intervalHandler = null;
let now = 10_000;
const gardenState = { specimens: [] };
const speciesConfig = new Map([
  ['flower', { singular: 'flower' }],
  ['broadleaf', { singular: 'broad-leaf plant' }],
  ['redbloom', { singular: 'red bloom' }]
]);

const sandbox = {
  document: { querySelector: selector => elements.get(selector) },
  canvas,
  gardenEventSource,
  gardenState,
  speciesConfig,
  gardenWidth: 960,
  gardenHeight: 600,
  margin: 16,
  cellSize: 30,
  Date: { now: () => now },
  Number,
  Math,
  window: {
    innerWidth: 1200,
    innerHeight: 800,
    addEventListener(name, handler) { handlers.set(`window:${name}`, handler); },
    setInterval(handler, delay) { intervalHandler = handler; assert.equal(delay, 1000); return 1; }
  },
  spawnSpecimen(type, grassEventType = null, vigor = 0) {
    const specimen = {
      type,
      column: gardenState.specimens.length,
      row: 0,
      createdAt: now,
      vigor
    };
    gardenState.specimens.push(specimen);
    return specimen;
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('wwwroot/garden-inspect.js', 'utf8'), sandbox);
const run = code => vm.runInContext(code, sandbox);

assert.equal(typeof canvasHandlers.click, 'function');
assert.equal(typeof sourceHandlers.garden, 'function');
assert.equal(typeof intervalHandler, 'function');

// Fake growth gets explicit simulated provenance instead of invented network metadata.
const fake = run("spawnSpecimen('flower', 'dns', 0)");
assert.equal(fake.origin.kind, 'simulated');
assert.equal(fake.origin.eventType, 'dns');
assert.equal(fake.origin.sensor, undefined);

// Real growth remains unattributed until the backend garden frame's inspection listener runs.
now += 10;
const real = run("spawnSpecimen('broadleaf', null, 3)");
real.broadleafVariant = 'rainbow';
assert.equal(real.origin, undefined);
sourceHandlers.garden({ data: JSON.stringify({
  specimenType: 'broadleaf',
  listenPort: 445,
  vigor: 3,
  sensor: '<b>wurstcase-public</b>',
  seenCount: '18446744073709551615',
  remoteAddress: 'must-not-be-retained',
  remotePort: 54321
}) });
assert.equal(real.origin.kind, 'tcpnoise');
assert.equal(real.origin.sensor, '<b>wurstcase-public</b>');
assert.equal(real.origin.listenPort, 445);
assert.equal(real.origin.seenCount, '18446744073709551615');
assert.equal(JSON.stringify(real.origin).includes('must-not-be-retained'), false);
assert.equal(JSON.stringify(real.origin).includes('54321'), false);

// Canvas transform: a 992x632 box yields scale 1 and 16px margins.
// Real specimen is column 1, row 0, so its cell center is x=61,y=31.
canvasHandlers.click({ clientX: 61, clientY: 31 });
assert.equal(elements.get('#specimen-card').hidden, false);
assert.equal(elements.get('#specimen-card-title').textContent, 'Broad-leaf plant');
assert.equal(elements.get('#specimen-source').textContent, 'Live TCPNoise');
assert.equal(elements.get('#specimen-sensor').textContent, '<b>wurstcase-public</b>', 'sensor uses textContent rather than HTML');
assert.equal(elements.get('#specimen-port').textContent, '445');
assert.equal(elements.get('#specimen-seen-count').textContent, '18446744073709551615', 'full UInt64 count stays exact');
assert.equal(elements.get('#specimen-vigor').textContent, '3 — persistent');
assert.equal(elements.get('#specimen-color').textContent, 'Rainbow');
assert.equal(elements.get('#specimen-age').textContent, '0s');
assert.match(elements.get('#specimen-card').style.left, /px$/);
assert.match(elements.get('#specimen-card').style.top, /px$/);

now += 65_000;
intervalHandler();
assert.equal(elements.get('#specimen-age').textContent, '1m 5s');

// Empty soil closes the card.
canvasHandlers.click({ clientX: 500, clientY: 500 });
assert.equal(elements.get('#specimen-card').hidden, true);

// Fake card is clearly labeled and has no made-up port/count.
canvasHandlers.click({ clientX: 31, clientY: 31 });
assert.equal(elements.get('#specimen-source').textContent, 'Simulated DNS');
assert.equal(elements.get('#specimen-sensor').textContent, 'Development controls');
assert.equal(elements.get('#specimen-port').textContent, '—');
assert.equal(elements.get('#specimen-seen-count').textContent, '—');
handlers.get('window:keydown')({ key: 'Escape' });
assert.equal(elements.get('#specimen-card').hidden, true);

// Close button works.
canvasHandlers.click({ clientX: 61, clientY: 31 });
handlers.get('#specimen-card-close:click')();
assert.equal(elements.get('#specimen-card').hidden, true);

// If the selected object expires or is replaced, the open card closes on the next age tick.
canvasHandlers.click({ clientX: 61, clientY: 31 });
gardenState.specimens = gardenState.specimens.filter(specimen => specimen !== real);
intervalHandler();
assert.equal(elements.get('#specimen-card').hidden, true);

// Invalid inspection extras never prevent the specimen itself from remaining usable.
now += 10;
const noExtras = run("spawnSpecimen('redbloom', null, 1)");
sourceHandlers.garden({ data: JSON.stringify({ specimenType: 'redbloom', listenPort: 22, vigor: 1, sensor: 42, seenCount: 10 }) });
assert.equal(noExtras.origin.kind, 'tcpnoise');
assert.equal(noExtras.origin.sensor, null);
assert.equal(noExtras.origin.seenCount, null);

console.log('PASS: specimen inspection preserves exact TCPNoise provenance, hit-tests cells, labels fake growth, and closes safely.');
