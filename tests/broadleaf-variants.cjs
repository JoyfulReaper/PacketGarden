const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const drawing = [];
const context = new Proxy({}, {
  get: (_, method) => (...args) => drawing.push([method, ...args]),
  set: (_, property, value) => { drawing.push([property, value]); return true; }
});
const state = { redraws: 0, spawns: [] };
const sandbox = {
  Math: Object.create(Math),
  context,
  cellSize: 30,
  broadleafTimings: {
    growingAfterMs: 20_000,
    matureAfterMs: 60_000,
    fadingAfterMs: 300_000,
    expiredAfterMs: 360_000
  },
  speciesConfig: new Map([["broadleaf", { render() { throw new Error('old renderer used'); } }]]),
  drawGarden() { state.redraws++; },
  spawnSpecimen(type, grassEventType = null, vigor = 0) {
    const specimen = { type, column: 1, row: 2, createdAt: 1_000, vigor, grassEventType };
    state.spawns.push(specimen);
    return specimen;
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('wwwroot/garden-broadleaf.js', 'utf8'), sandbox);
const run = code => vm.runInContext(code, sandbox);

assert.deepEqual(
  [0, 1, 2, 3].map(vigor => run(`broadleafCommonVariantForVigor(${vigor})`)),
  ['plum', 'teal', 'amber', 'rose'],
  'real broadleaf common palette follows coarse vigor/seenCount'
);
assert.equal(run('chooseBroadleafVariant(3, false, 0.0099)'), 'rainbow', '1% roll yields rainbow');
assert.equal(run('chooseBroadleafVariant(3, false, 0.01)'), 'rose', 'rainbow boundary is exclusive');
assert.equal(run('chooseBroadleafVariant(1, false, 0.75)'), 'teal', 'ordinary real roll does not change vigor palette');
assert.equal(run('chooseBroadleafVariant(0, true, 0.02)'), 'plum');
assert.equal(run('chooseBroadleafVariant(0, true, 0.99)'), 'rose', 'fake HTTP spans common palettes');

sandbox.Math.random = () => 0.5;
const real = run("spawnSpecimen('broadleaf', null, 2)");
assert.equal(real.broadleafVariant, 'amber');
assert.equal(state.redraws, 1, 'broadleaf selection repaints immediately');
const flower = run("spawnSpecimen('flower', null, 3)");
assert.equal(flower.broadleafVariant, undefined, 'other species are untouched');
assert.equal(state.redraws, 1);

sandbox.Math.random = () => 0;
const rainbow = run("spawnSpecimen('broadleaf', null, 0)");
assert.equal(rainbow.broadleafVariant, 'rainbow');

drawing.length = 0;
sandbox.Math.random = () => { throw new Error('render must not reroll variant'); };
run("speciesConfig.get('broadleaf').render({type:'broadleaf',column:0,row:0,createdAt:1000,vigor:3,broadleafVariant:'rainbow'}, 61000)");
const rainbowFills = drawing.filter(([property]) => property === 'fillStyle').map(([, value]) => value);
const rainbowColors = run('broadleafVariantConfig.rainbow.slice()');
assert(new Set(rainbowFills.filter(value => rainbowColors.includes(value))).size >= 6,
  'rainbow broadleaf visibly uses many leaf colors');
assert(drawing.some(([, value]) => value === '#f3e7bf'), 'rainbow uses a light vein');

for (const [variant, colors] of [
  ['plum', ['#8d6f9f', '#6f567f']],
  ['teal', ['#5c9a8a', '#46786e']],
  ['amber', ['#b68b45', '#8f6b35']],
  ['rose', ['#a96f85', '#845468']]
]) {
  drawing.length = 0;
  run(`speciesConfig.get('broadleaf').render({type:'broadleaf',column:0,row:0,createdAt:1000,vigor:3,broadleafVariant:'${variant}'}, 61000)`);
  const fills = drawing.filter(([property]) => property === 'fillStyle').map(([, value]) => value);
  assert(colors.every(color => fills.includes(color)), `${variant} palette renders both leaf colors`);
}

drawing.length = 0;
run("speciesConfig.get('broadleaf').render({type:'broadleaf',column:0,row:0,createdAt:1000,vigor:3,broadleafVariant:'rainbow'}, 301000)");
assert(drawing.some(([, value]) => value === '#8f7a76'), 'rainbow broadleaf still fades through normal lifecycle');
assert(!drawing.some(([, value]) => value === '#e05d5d'), 'fading does not stay neon');

console.log('PASS: broadleaf palettes follow vigor, fake HTTP varies common colors, and 1% rainbow mutations persist without rerolling.');
