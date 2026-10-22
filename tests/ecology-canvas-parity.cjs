const assert=require('node:assert/strict'),createGarden=require('./browser-garden.cjs');
const garden=createGarden();
for(const test of require('./fixtures/production-ecology-art.json').cases){
  garden.sandbox.fixtureItem={...test.item};garden.drawing.length=0;
  if(test.kind==='grass')garden.run(`drawGrass(fixtureItem,${test.at})`);
  else garden.run(`gardenState.puddles=[fixtureItem];drawGardenPuddles(${test.at})`);
  if(test.kind==='puddle')assert.deepEqual(JSON.parse(JSON.stringify(garden.drawing)),test.commands,`unchanged reviewed puddle at ${test.at}ms`);
  else if(test.at>=2100000)assert.equal(garden.drawing.length,0,'expired grass is invisible');
  else {
    const art=require('../wwwroot/garden-grass.js'),state=require('../wwwroot/garden-ecology.js').grassVisualState(test.item,test.at);
    const commands=JSON.parse(JSON.stringify(garden.drawing));
    assert.equal(commands.filter(c=>c[0]==='fill').length,4,'four finite shade paths');
    assert(commands.filter(c=>c[0]==='quadraticCurveTo').length>=120,'dense foliage from shared recipes');
    assert.deepEqual(commands.find(c=>c[0]==='scale').slice(1),Array(2).fill(state.growth*(1-state.decline*.65)));
    assert.equal(commands.find(c=>c[0]==='globalAlpha')[1],state.opacity/.6*art.baseOpacity);
  }
}
console.log('PASS: shared dense grass shade paths/lifecycle transforms and unchanged reviewed puddle commands across growth/fade/color/drain/expiry boundaries.');
