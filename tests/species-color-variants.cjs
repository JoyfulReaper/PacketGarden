// Pixi palette probabilities and lifetime stability; no legacy art wrappers.
const assert=require('node:assert/strict'),P=require('../wwwroot/pixi-live-core.js'),page=require('./pixi-page.cjs');
for(const type of P.eventSpecies){assert.equal(P.palettes[type].length,5);for(let vigor=0;vigor<4;vigor++){
  assert.equal(P.colorVariant(type,vigor,.009999999),4);assert.notEqual(P.colorVariant(type,vigor,.01),4);
  if(type!=='vine')for(const roll of [.01,.5,.999999])assert.equal(P.colorVariant(type,vigor,roll),vigor);
}}
const counts=Array(5).fill(0);for(let i=0;i<100000;i++)counts[P.colorVariant('vine',0,(i+.5)/100000)]++;
assert.deepEqual(counts,[69300,14850,9900,4950,1000]);
(async()=>{const g=await page({random:()=>.009});for(const type of P.eventSpecies)g.emit('garden',{specimenType:type,vigor:2,listenPort:type==='redbloom'?22:80});
  const states=g.model.specimens.map(p=>[p,p.colorVariant]);assert(states.every(([,color])=>color===4));
  g.frame(65000);for(const [p,color] of states)if(g.model.specimens.includes(p))assert.equal(p.colorVariant,color);
  g.close();assert.deepEqual(g.errors,[]);console.log('PASS: all Pixi five-palette/1% rare boundaries, exact weighted vine partition, vigor-independent vine hue and lifetime-stable palettes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
