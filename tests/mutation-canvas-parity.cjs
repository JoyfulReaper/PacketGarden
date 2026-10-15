// Frozen against 934089d before extracting the rules. Canvas commands and RNG order are intentional.
const assert = require('node:assert/strict'), fs = require('node:fs');
const createGarden = require('./browser-garden.cjs');
function capture() {
  const g = createGarden(), samples = [];
  g.run('Math.random=(()=>{const rolls=[.5,.25,.75,.02,.5,.5,.5,.5];let i=0;return()=>rolls[i++%rolls.length]})()');
  g.emit();
  const source = g.run('gardenState.specimens[0]');
  const sample = () => {
    g.drawing.length = 0;
    g.run('drawSpecimenMutation(gardenState.specimens[0],Date.now()) || speciesConfig.get("redbloom").render(gardenState.specimens[0],Date.now())');
    samples.push({state:JSON.parse(g.run('JSON.stringify(gardenState.specimens)')), commands:JSON.parse(JSON.stringify(g.drawing))});
  };
  sample(); g.clock.now += 2999; g.tick(); sample(); g.clock.now++; g.tick(); sample();
  for (const delta of [200,600,800,7000,10000]) { g.clock.now += delta; g.tick(); sample(); }
  g.click((source.column+.5)*30,(source.row+.5)*30);
  return {samples, after:g.run('JSON.stringify([gardenState.specimens,gardenState.recentEvents])'),
    message:g.element('#collection-message').textContent, score:g.element('#garden-score').textContent};
}
const actual=capture(), path='tests/fixtures/mutation-canvas-934089d.json';
assert.deepEqual(actual,JSON.parse(fs.readFileSync(path,'utf8')));
console.log('PASS: frozen pre-extraction mutation state, Canvas commands, palette/RNG sequence, inspection/collection message and static score.');
