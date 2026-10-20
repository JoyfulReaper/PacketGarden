const assert=require('node:assert/strict'),createGarden=require('./browser-garden.cjs');
const garden=createGarden();
for(const test of require('./fixtures/production-ecology-art.json').cases){
  garden.sandbox.fixtureItem={...test.item};garden.drawing.length=0;
  if(test.kind==='grass')garden.run(`drawGrass(fixtureItem,${test.at})`);
  else garden.run(`gardenState.puddles=[fixtureItem];drawGardenPuddles(${test.at})`);
  assert.deepEqual(JSON.parse(JSON.stringify(garden.drawing)),test.commands,`original Canvas ${test.kind} artwork at ${test.at}ms`);
}
console.log('PASS: exact original Canvas grass and puddle drawing commands/styles across growth/fade/color/drain/expiry boundaries.');
