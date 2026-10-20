const assert = require('node:assert/strict');
const h = require('./pixi-live.cjs'), core = require('../wwwroot/pixi-live-core.js');
const { createView } = require('../wwwroot/pixi-live.js'), shared = require('../wwwroot/pixi-stress.js');
let geometry = 0;
class Graphics extends h.P.Graphics {
  constructor() { super(); this.curves = []; }
  clear() { geometry++; this.curves = []; return super.clear(); }
  moveTo(x, y) { this.start = [x, y]; return this; }
  bezierCurveTo(...points) { this.points = points; return this; }
  stroke(style) { geometry++; this.curves.push({ start: this.start, points: this.points, style }); return super.stroke(); }
}
const view = createView({ ...h.P, Graphics }, { stage: new h.P.Container() }, h.cache.frames, core, shared);
const specimens = Array.from({ length: 640 }, (_, cell) => ({ id: cell, type: 'vine', column: cell % 32,
  row: Math.floor(cell / 32), vigor: cell % 4, colorVariant: cell % 5, stage: 'mature' }));
const byCell = new Map(specimens.map(p => [p.id, p])), original = JSON.stringify(specimens);
for (const p of specimens) view.add(p, byCell);
assert.equal(JSON.stringify(specimens), original, 'art never changes logical specimens');
const snapshot = () => [...view.vineLinks].map(([id, g]) => [id, JSON.stringify(g.curves)]).sort((a,b) => a[0]-b[0]);
const first = snapshot(), ends = new Map(); let diagonals = 0;
for (const [id, g] of view.vineLinks) {
  assert(g.curves.length <= 8);
  for (const curve of g.curves) {
    assert.deepEqual(curve.start, [0, 0]); assert.equal(curve.points.length, 6);
    assert(curve.points.every(Number.isFinite)); assert(curve.style.width <= 1.411);
    assert(curve.style.alpha <= .65);
    const [cx, cy, , , x, y] = curve.points;
    if (Math.abs(x) > 6 && Math.abs(y) > 6) diagonals++;
    const key = [x + g.position.x, y + g.position.y].map(n => n.toFixed(5)).join(',');
    const pair = ends.get(key) ?? []; pair.push({ id, g, curve }); ends.set(key, pair);
    assert(Number.isFinite(cx + cy));
  }
}
assert(view.snapshot().connectionHalves > 1000 && view.snapshot().connectionHalves < 2000, 'dense visual links are bounded and thinned');
assert(diagonals < view.snapshot().connectionHalves / 2, 'diagonals no longer dominate');
for (const pair of ends.values()) {
  assert.equal(pair.length, 2, 'both halves meet at one shared point');
  const [a, b] = pair, p = specimens[a.id], q = specimens[b.id];
  assert(Math.abs(p.column-q.column) <= 1 && Math.abs(p.row-q.row) <= 1, 'no edge wrapping');
  const tangent = ({curve}) => [curve.points[4]-curve.points[2], curve.points[5]-curve.points[3]];
  const ta = tangent(a), tb = tangent(b);
  assert(Math.abs(ta[0]+tb[0]) < 1e-9 && Math.abs(ta[1]+tb[1]) < 1e-9, 'halves have a continuous tangent');
}
const calls = geometry, checks = view.counters.vineNeighborChecks;
for (let i=0; i<120; i++) view.animate(i/60, 1/60);
assert.equal(geometry, calls); assert.equal(view.counters.vineNeighborChecks, checks);
const target = specimens[200], sprite = view.byId.get(target.id), graphic = view.vineLinks.get(target.id);
target.stage = 'sprout'; view.update(target, byCell); assert.equal(graphic.curves.length, 0);
target.stage = 'fading'; view.update(target, byCell);
assert(graphic.curves.every(c => c.style.alpha === .24)); assert.equal(view.byId.get(target.id), sprite);
target.stage = 'mature';
for (const p of specimens) { byCell.delete(p.id); view.remove(p, byCell); }
assert.equal(view.snapshot().connectionHalves, 0); assert.equal(view.vineLinks.size, 0); assert.equal(view.byId.size, 0);
assert(!h.live.has(sprite) && !h.live.has(graphic));
// Same cells reproduce exactly, even when specimens arrive in reverse order.
for (const p of specimens) byCell.set(p.id, p);
for (const p of specimens.slice().reverse()) view.add(p, byCell);
assert.deepEqual(snapshot(), first);
assert(new Set([...view.byId.values()].map(s => s.rotation)).size > 100);
assert(new Set([...view.byId.values()].map(s => s.scale.x)).size === 2);
view.destroy();
console.log('PASS: deterministic restrained vine art, sparse symmetric continuous curves, stage refresh/cleanup, no per-frame geometry or neighbor work.');
