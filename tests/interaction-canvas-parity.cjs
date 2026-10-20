// Frozen against cf2a3de before extracting interaction helpers.
const assert=require('node:assert/strict'),fs=require('node:fs'),createGarden=require('./browser-garden.cjs');
function capture(){
  const g=createGarden(),states=[];
  g.run(`gardenState.specimens=[{type:'redbloom',column:15,row:10,vigor:2,createdAt:Date.now(),colorVariant:'crimson',origin:{kind:'tcpnoise',listenPort:22,sensor:'<b>safe text</b>',seenCount:'12'}}];
    gardenState.specimens[0].mutation={type:'collectible_weed',createdAt:Date.now(),expiresAt:Date.now()+20000};
    gardenState.drops=[{type:'amanita_muscaria',x:465,y:315,phase:0,createdAt:Date.now(),expiresAt:Date.now()+20000}];
    gardenState.curiosities=['ladybug','snail','moth','shiny_pebble'].map(type=>({type,x:465,y:315,origin:{x:465,y:315},phase:0,direction:1,createdAt:Date.now(),expiresAt:Date.now()+20000})); drawGarden()`);
  const sample=()=>states.push({specimens:g.run('JSON.stringify(gardenState.specimens)'),
    curiosities:g.run('gardenState.curiosities.map(c=>c.type).join(",")'),drops:g.run('gardenState.drops.length'),
    message:g.element('#collection-message').textContent,messageHidden:g.element('#collection-message').hidden,
    cardHidden:g.element('#specimen-card').hidden,title:g.element('#specimen-card-title').textContent,
    fields:Object.fromEntries(['source','sensor','port','seen-count','vigor','color','age','mutation'].map(k=>[k,g.element('#specimen-'+k).textContent])),
    score:g.element('#garden-score').textContent});
  // Outside mutation radius still inspects the cell, with an active label.
  g.click(479,329);sample();g.element('#specimen-card-close').handlers.get('click')[0]();sample();
  for(let i=0;i<6;i++){g.click(465,315);sample();}
  g.click(465,315);sample();g.clock.now+=2000;g.tick();sample();
  g.run('handleGardenEvent({type:"http"})');const p=g.run('gardenState.specimens[0]');g.click((p.column+.5)*30,(p.row+.5)*30);sample();
  g.click(-1,0);sample();
  return states;
}
const path='tests/fixtures/interaction-canvas-cf2a3de.json',actual=capture();
assert.deepEqual(actual,JSON.parse(fs.readFileSync(path,'utf8')));
console.log('PASS: frozen Canvas overlap priority/exact collection, messages, active label, cell inspection, close/empty/outside, simulated fields and zero score.');
