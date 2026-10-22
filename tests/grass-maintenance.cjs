// Recovery depends on healthy turf and reachable open soil, never network events.
const assert=require('node:assert/strict'),E=require('../wwwroot/garden-ecology.js');
const key=c=>c.row*32+c.column;
{
  const occupied=new Set(Array.from({length:640},(_,i)=>i)),changes=[];
  const m=E.createEcologyModel({now:()=>0,random:()=>.99,isCellOccupied:(x,y)=>occupied.has(y*32+x),onChange:e=>changes.push(e)});
  m.tickGrass(60000);assert.equal(m.grassCells.length,0);
  occupied.delete(639);m.tickGrass(119999);assert.equal(m.grassCells.length,0);
  m.tickGrass(120000);assert.deepEqual(m.grassCells.map(key),[639]);
  assert.deepEqual(changes.map(c=>c.kind),['grass-added']);
  for(let at=120250;at<=240000;at+=250)m.tickGrass(at);
  assert.equal(m.grassCells.length,1,'one free cell neither blocks recovery nor permits duplicates');
}
{
  // Twelve healthy patches are enough normally, but these are stranded behind
  // specimens. Maintenance can establish a separate reachable generation.
  const occupied=new Set(Array.from({length:4*32},(_,i)=>i));
  const m=E.createEcologyModel({now:()=>0,random:()=>0,isCellOccupied:(x,y)=>occupied.has(y*32+x)});
  for(let x=0;x<12;x++){occupied.delete(32+x);m.influenceGrassCell(x,1,0);}
  const parents=m.grassCells.slice();m.tickGrass(60000);
  assert.equal(m.grassCells.length,15);assert(m.grassCells.slice(12).every(c=>c.row>=4));
  assert(parents.every(c=>c.createdAt===0&&c.lastInfluencedAt===0),'maintenance never rejuvenates existing turf');
  const count=m.grassCells.length;m.tickGrass(60000);m.tickGrass(60001);assert.equal(m.grassCells.length,count);
}
{
  let draws=0;const m=E.createEcologyModel({now:()=>0,random:()=>{draws++;return .99;}});
  for(let i=0;i<100;i++)m.influenceGrassCell(i%32,Math.floor(i/32),0);
  m.nextGrassSpreadAt=Infinity;m.tickGrass(60000);m.tickGrass(120000);
  assert.equal(draws,0,'healthy spreading turf disables maintenance');assert.equal(m.grassCells.length,100);
  // A dense, mature stand has no per-minute maintenance roll even when isolated.
  for(let i=100;i<640;i++)m.influenceGrassCell(i%32,Math.floor(i/32),0);
  m.tickGrass(180000);assert.equal(draws,0);assert.equal(m.grassCells.length,640);
}
{
  const m=E.createEcologyModel({now:()=>0,random:()=>.999999});
  m.influenceGrassCell(0,0,-E.grassConfig.dyingAfterMs);m.nextGrassSpreadAt=Infinity;
  m.tickGrass(60000);assert.equal(m.grassCells.length,4,'old non-spreading grass is not a healthy population');
  assert.equal(m.grassCells[0].lastInfluencedAt,-E.grassConfig.dyingAfterMs);
}
{
  let blocked=true,rolls=0;const m=E.createEcologyModel({now:()=>0,random:()=>{rolls++;return 0;},isCellOccupied:(x,y)=>blocked&&(x!==1||y!==1)});
  const parent=m.influenceGrassCell(1,1,0);m.spreadGrass(1200000);m.spreadGrass(1204000);
  assert.equal(rolls,0);assert.equal(parent.fadeSeedAttemptedAt,undefined,'no seed chance wasted on occupied soil');
  blocked=false;m.spreadGrass(1208000);assert.equal(rolls,2);assert.equal(m.grassCells.length,2);
  assert.equal(parent.fadeSeedAttemptedAt,0);assert.equal(parent.lastInfluencedAt,0);
  m.spreadGrass(1212000);assert.equal(rolls,2,'one successful opportunity per influence cycle');
}
{
  let rolls=0,checks=0;const m=E.createEcologyModel({now:()=>0,random:()=>{rolls++;return 0;},isCellOccupied:()=>{checks++;return false;}});
  for(let at=250;at<60000;at+=250)m.tickGrass(at);assert.equal(checks,0,'no census before its deadline');
  m.tickGrass(60000);assert.equal(checks,643);assert.equal(rolls,3);
  m.tickGrass(60000);assert.equal(checks,643);
  m.clearGrass();m.tickGrass(120000,true);assert.equal(rolls,3);
  m.resetCadence(3600000);m.tickGrass(3600000);assert.equal(rolls,3);
  m.tickGrass(3660000);assert.equal(rolls,6);
  m.clearGrass();m.tickGrass(7200000);assert.equal(rolls,6,'missed minute windows are discarded');
  m.tickGrass(7260000);assert.equal(rolls,9);
}
console.log('PASS: one-cell/full-to-free recovery, isolated/stranded/aging turf, healthy suppression, capped census/seeds, identity/parent aging, deadlines and hidden/stalled scheduling.');
