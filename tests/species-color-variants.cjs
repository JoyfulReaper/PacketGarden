const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const drawing = [];
const context = new Proxy({}, {
  get: (_, method) => (...args) => drawing.push([method, ...args]),
  set: (_, property, value) => { drawing.push([property, value]); return true; }
});
const state = { redraws: 0, renders: [], spawns: [] };
const types = ['flower','mushroom','vine','redbloom','weed','ghostbloom','crystalfungus','blackthorn'];
const speciesConfig = new Map(types.map(type => [type, {
  render(specimen, now) {
    state.renders.push([type, specimen.colorVariant, now]);
    context.fillStyle = '#base';
    context.fill();
  }
}]));
const sandbox = {
  Math: Object.create(Math),
  context,
  speciesConfig,
  drawGarden() { state.redraws++; },
  spawnSpecimen(type, grassEventType = null, vigor = 0) {
    const specimen = { type, vigor, grassEventType, createdAt: 1000, column: 0, row: 0 };
    state.spawns.push(specimen);
    return specimen;
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('wwwroot/garden-species-colors.js','utf8'), sandbox);
const run = code => vm.runInContext(code, sandbox);

for (const type of types) {
  const common = run(`speciesColorVariants.get('${type}').common.map(v => v.name)`);
  const rare = run(`speciesColorVariants.get('${type}').rare.name`);
  assert.equal(common.length, 4, `${type} has four common palettes`);
  assert.equal(run(`chooseSpeciesColorVariant('${type}', 3, false, 0.0099)`), rare, `${type} 1% rare`);
  assert.equal(run(`chooseSpeciesColorVariant('${type}', 3, false, 0.01)`), common[3], `${type} boundary common`);
  assert.deepEqual(
    [0,1,2,3].map(v => run(`commonSpeciesColorVariant('${type}', ${v})`)),
    Array.from(common),
    `${type} vigor maps common palettes`
  );
  assert.equal(run(`chooseSpeciesColorVariant('${type}', 0, true, 0.02)`), common[0]);
  assert.equal(run(`chooseSpeciesColorVariant('${type}', 0, true, 0.99)`), common[3]);
}

sandbox.Math.random = () => 0.5;
for (const [index,type] of types.entries()) {
  const specimen = run(`spawnSpecimen('${type}', null, ${index % 4})`);
  assert.equal(specimen.colorVariant, run(`commonSpeciesColorVariant('${type}', ${index % 4})`));
}
assert.equal(state.redraws, types.length);

sandbox.Math.random = () => 0;
const rare = run(`spawnSpecimen('mushroom', null, 0)`);
assert.equal(rare.colorVariant, run(`speciesColorVariants.get('mushroom').rare.name`));

drawing.length = 0;
sandbox.Math.random = () => { throw new Error('render must not reroll color'); };
run(`speciesConfig.get('mushroom').render({type:'mushroom',vigor:0,colorVariant:'bioluminescent'}, 1000)`);
assert(drawing.some(([prop,value]) => prop === 'filter' && String(value).includes('saturate(2)')));
assert(drawing.some(([prop,value]) => prop === 'shadowColor' && value === '#79f6ff'));
assert(drawing.some(([prop,value]) => prop === 'shadowBlur' && value === 7));
assert.equal(state.renders.at(-1)[1], 'bioluminescent');

drawing.length = 0;
run(`speciesConfig.get('flower').render({type:'flower',vigor:2,colorVariant:'sky'}, 1000)`);
assert(drawing.some(([prop,value]) => prop === 'filter' && String(value).includes('hue-rotate(115deg)')));
assert(!drawing.some(([prop]) => prop === 'shadowColor'), 'common variants do not glow');

console.log('PASS: persistent vigor/fake color variants and 1% rare schemes cover all non-broadleaf species.');
