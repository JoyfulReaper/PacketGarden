const assert = require('node:assert/strict'), fs = require('node:fs');
const G = require('../wwwroot/garden-core.js'), M = require('../wwwroot/garden-mutations.js');
function setup() {
  let at = 100000, rolls = 0, changes = [], mutations;
  const garden = G.createGardenModel({ now: () => at, random: () => .5, onChange(c) {
    if (c.kind === 'removed') mutations.removed(c.specimen, c.reason);
  }});
  mutations = M.createMutationModel({ garden, now: () => at, random: () => { rolls++; return 0; }, onChange: c => changes.push(c) });
  const add = (type = 'redbloom', port = 22, kind = 'tcpnoise', vigor = 0) => garden.addSpecimen(type, vigor, at,
    {kind, listenPort: port, sensor:'test', seenCount:'1'}).specimen;
  return { garden, mutations, add, changes, rolls: () => rolls, at: () => at,
    tick(delta = 0) { at += delta; garden.tick(at); mutations.tick(at); garden.tick(at); } };
}
const s = setup(), { garden: g, mutations: m } = s;
assert.deepEqual(M.config, { port22WeedChance:.05, mutationDelayMs:3000, maxActive:3, collectibleLifetimeMs:20000 });
for (const [type,port,kind] of [['weed',22,'tcpnoise'],['redbloom',2222,'tcpnoise'],['redbloom',22,'simulated'],['redbloom',22,'live']]) {
  assert.equal(m.maybeSchedulePort22Mutation(s.add(type,port,kind)),false);
}
assert.equal(s.rolls(),0,'ineligible sources consume no random roll');
assert.equal(m.maybeSchedulePort22Mutation({type:'redbloom',origin:{kind:'tcpnoise',listenPort:22}}),false);
const p = s.add(), identity = [p.id,p.cell,p.column,p.row,p.vigor,p.createdAt,p.origin];
for (const roll of [-1,NaN,Infinity,.05,.050001,1]) assert.equal(m.maybeSchedulePort22Mutation(p,roll),false);
assert(m.maybeSchedulePort22Mutation(p,.049999));
assert.deepEqual(p.pendingMutation,{type:'collectible_weed',activateAt:s.at()+3000});
assert.equal(m.scheduleMutation(p,'collectible_weed'),false); assert.equal(m.scheduleMutation(p,'opium'),false);
assert.equal(m.maybeSchedulePort22Mutation(p),false);assert.equal(s.rolls(),1,'duplicate keeps original qualification/random ordering');
assert.equal(M.mutationLabel(p,s.at()),'None');
const events = s.changes.length;s.tick(2999);assert.equal(s.changes.length,events);assert(!p.mutation);
s.tick(1);assert.deepEqual(p.mutation,{type:'collectible_weed',createdAt:s.at(),expiresAt:s.at()+20000});
assert.equal(p.pendingMutation,undefined);assert.equal(M.mutationLabel(p,s.at()),'Collectible weed');
assert.deepEqual([p.id,p.cell,p.column,p.row,p.vigor,p.createdAt,p.origin],identity);
assert.equal(g.byCell.get(p.cell),p);assert.equal(p.stage,'mutation');
s.tick(19999);assert(g.specimens.includes(p));s.tick(1);assert(!g.specimens.includes(p));assert(!g.byCell.has(p.cell));
assert.equal(m.snapshot().expiries,1);assert.equal(s.changes.at(-1).kind,'expired');

// Late activation obeys the absolute mutation lifetime through normal redbloom expiry.
const late=setup(), lp=late.add();late.mutations.maybeSchedulePort22Mutation(lp,0);late.tick(29000);
late.tick(1000);assert.equal(G.stageAt(lp.type,lp.createdAt,late.at()),'expired');assert(late.garden.specimens.includes(lp));
late.tick(18999);assert(late.garden.specimens.includes(lp));late.tick(1);assert.equal(late.garden.byCell.size,0);

for (const reason of ['removed','cleared','replaced','expired','collected']) {
  const c=setup(), old=c.add();c.mutations.maybeSchedulePort22Mutation(old,0);
  if(reason==='expired') c.tick(30000);
  else if(reason==='cleared') c.mutations.clear();
  else c.garden.remove(old,reason);
  assert.equal(old.pendingMutation,undefined);assert.equal(c.mutations.snapshot().pending,0);
  assert.equal(c.mutations.snapshot().cancellations,1);assert.equal(c.mutations.activateMutation(old,c.at()+3000),false);
  const replacement=c.add();assert.equal(c.mutations.activateMutation(old,c.at()+3000),false);assert(!replacement.pendingMutation);
  assert(!replacement.mutation);assert.equal(c.changes.at(-1).kind,'pending-cancelled');
}
// Actual saturated replacement, not just a simulated removal callback. Same-cell identity never aliases.
for (const active of [false,true]) {
  const c=setup();c.garden.seed(Array.from({length:640},(_,cell)=>({type:'broadleaf',vigor:3,column:cell%32,row:Math.floor(cell/32),createdAt:c.at()})));
  c.garden.specimens[0].vigor=0;
  const old=c.garden.addEvent({specimenType:'redbloom',listenPort:22,vigor:1}).specimen;
  c.mutations.maybeSchedulePort22Mutation(old,0);if(active)c.tick(3000);
  const cell=old.cell, newer=c.garden.addEvent({specimenType:'flower',listenPort:80,vigor:2}).specimen;
  assert.equal(newer.cell,cell);assert.notEqual(newer.id,old.id);assert.equal(c.garden.byCell.get(cell),newer);
  assert.equal(old.pendingMutation,undefined);c.tick(3000);assert(!newer.mutation);assert(!newer.pendingMutation);
  assert.equal(c.mutations.snapshot().active,0,'active mutation receives no new saturation protection');
}
const cap=setup(), candidates=Array.from({length:4},()=>cap.add());
for(const source of candidates)cap.mutations.maybeSchedulePort22Mutation(source,0);
cap.tick(3000);assert.equal(cap.mutations.snapshot().active,3);assert.equal(cap.mutations.snapshot().capSkips,1);
assert(candidates.every(p=>!p.pendingMutation));assert(!candidates[3].mutation);
cap.garden.remove(candidates[0],'collected');cap.tick();assert.equal(cap.mutations.snapshot().active,2);assert(!candidates[3].mutation);
const notices=cap.changes.length;cap.tick();assert.equal(cap.changes.length,notices,'no unchanged notifications/history');
cap.mutations.clear();assert.equal(cap.mutations.snapshot().active,0);assert.equal(cap.mutations.snapshot().pending,0);assert.equal(cap.garden.byCell.size,0);

// Shared hit boundary and actual collection removal, without a renderer harness.
const I=require('../wwwroot/garden-interaction.js'),hit=setup(),cp=hit.add();
hit.mutations.maybeSchedulePort22Mutation(cp,0);hit.tick(3000);
const point={x:(cp.column+.5)*30+12,y:(cp.row+.5)*30};
assert.equal(I.mutationHit(cp,point,hit.at()),true);
assert.equal(I.mutationHit(cp,{...point,x:point.x+.001},hit.at()),false);
assert(hit.garden.remove(cp,'collected'));assert.equal(hit.garden.byCell.has(cp.cell),false);assert.equal(hit.mutations.snapshot().active,0);
assert.doesNotMatch(fs.readFileSync('wwwroot/garden-mutations.js','utf8'),/document\.|CanvasRenderingContext2D|PIXI|setTimeout|setInterval|localStorage|sessionStorage|collection-message/);
console.log('PASS: shared mutation qualification/RNG/boundaries/identity, one pending marker, exact removal/replacement/clear cancellation, no retry, saturation parity, absolute lifetime/occupancy, shared radius/collection; no timers or presentation.');
