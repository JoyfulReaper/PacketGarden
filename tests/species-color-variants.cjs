const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const drawing = [];
const context = new Proxy({}, {
  get: (_, method) => (...args) => drawing.push([method, ...args]),
  set: (_, property, value) => { drawing.push([property, value]); return true; }
});
const state = { redraws: 0, renders: [], spawns: [] };
const types = ['flower','mushroom','vine','wirefern','redbloom','weed','ghostbloom','crystalfungus','blackthorn'];
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
  assert.equal(run(`chooseSpeciesColorVariant('${type}', 3, false, 0.01)`), type === 'vine' ? 'aqua' : common[3], `${type} boundary common`);
  assert.deepEqual(
    [0,1,2,3].map(v => run(`commonSpeciesColorVariant('${type}', ${v})`)),
    type === 'vine' ? ['aqua','aqua','aqua','aqua'] : Array.from(common),
    `${type} keeps its intended common fallback`
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

// Vine hue alone is a weighted cosmetic exception after the same 1% rare roll.
assert.deepEqual(Array.from(run("speciesColorVariants.get('vine').commonWeights")), [70,15,10,5]);
const boundaries = [0.01, 0.01 + 0.99 * 70 / 100, 0.01 + 0.99 * 85 / 100, 0.01 + 0.99 * 95 / 100, 1];
for (const isFake of [false,true]) {
  for (const vigor of [0,1,2,3]) {
    assert.equal(run(`chooseSpeciesColorVariant('vine',${vigor},${isFake},0.009999999)`), 'silvervine');
    for (const [index,name] of ['aqua','lime','chartreuse','olive'].entries()) {
      assert.equal(run(`chooseSpeciesColorVariant('vine',${vigor},${isFake},${boundaries[index]})`), name, 'inclusive start boundary');
      assert.equal(run(`chooseSpeciesColorVariant('vine',${vigor},${isFake},${boundaries[index+1]-1e-10})`), name, 'exclusive end boundary');
    }
    assert.equal(run(`chooseSpeciesColorVariant('vine',${vigor},${isFake},1)`), 'olive');
  }
}
sandbox.Math.random = () => 0.8;
const persistentVine = run("spawnSpecimen('vine',null,3)");
assert.equal(persistentVine.colorVariant, 'lime'); assert.equal(persistentVine.vigor, 3);
sandbox.Math.random = () => { throw new Error('vine drawing must not reroll'); };
for (const age of [1000,20000,60000,300000]) {
  sandbox.stableVine = persistentVine;
  run(`speciesConfig.get('vine').render(stableVine,${age})`);
  assert.equal(persistentVine.colorVariant, 'lime');
}

// Exercise real fake/live spawns and vine fullness, beyond the color-only fixture.
const createGarden = require('./browser-garden.cjs');
const garden = createGarden();
garden.sandbox.Math.random = () => 0.5;
garden.emit(3389,'vine',0); garden.emit(3389,'vine',3);
garden.run("handleGardenEvent({type:'ssh'})");
const vines = garden.run('gardenState.specimens.slice()');
assert(vines.every(specimen => specimen.colorVariant === 'aqua'));
assert.deepEqual(Array.from(vines, specimen => specimen.vigor), [0,3,0]);
const renderVigor = specimen => {
  garden.sandbox.testVine = specimen;
  garden.run('gardenState.specimens=[testVine]; testVine.createdAt=Date.now()-65000');
  garden.drawing.length = 0;
  garden.run("speciesConfig.get('vine').render(testVine,Date.now())");
  return { widths:garden.drawing.filter(command=>command[0]==='lineWidth').map(command=>command[1]),
    leaves:garden.drawing.filter(command=>command[0]==='ellipse').length };
};
const sparse = renderVigor(vines[0]), full = renderVigor(vines[1]);
assert(Math.max(...full.widths) > Math.max(...sparse.widths), 'vigor still thickens aqua vines');
assert(full.leaves > sparse.leaves, 'vigor still adds detail to aqua vines');
garden.sandbox.Math.random = () => { throw new Error('redraw must not choose color again'); };
garden.run('drawGarden(); drawGarden()');
assert.equal(vines[1].colorVariant, 'aqua'); assert.equal(vines[1].vigor, 3);

console.log('PASS: persistent vigor/fake colors and 1% rare schemes; vine weighted 70/15/10/5 aqua/lime/chartreuse/olive boundaries, fake/live hue independence, stable colors, and preserved vigor fullness.');
