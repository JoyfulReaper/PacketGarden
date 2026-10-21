// Page lifetime ownership: failed releases still clean up and report errors.
const assert=require('node:assert/strict');
const {pageLifetime}=require('../wwwroot/pixi-stress.js');
const order=[],handlers=new Map();
const target={addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:(name,fn)=>{
  assert.equal(handlers.get(name),fn);handlers.delete(name);order.push('unlisten');
}};
const owner=pageLifetime(()=>order.push('stop'));
let deliveries=0;
owner.listen(target,'visibilitychange',()=>deliveries++);
const queued=handlers.get('visibilitychange');queued();assert.equal(deliveries,1);
owner.own(()=>order.push('renderer'));
owner.own(()=>{order.push('view');queued();assert(owner.disposed);});
owner.dispose();owner.dispose();queued();
assert.equal(deliveries,1);assert.equal(handlers.size,0);
assert.deepEqual(order,['unlisten','stop','view','renderer']);
owner.listen(target,'resize',()=>{throw Error('must not register after disposal');});
assert.equal(handlers.size,0);
owner.own(()=>order.push('late-init'));
assert.equal(order.at(-1),'late-init','resource acquired after pagehide releases immediately');
const first=new Error('stop failure'),second=new Error('view failure'),released=[];
const failure=pageLifetime(()=>{throw first;});
failure.own(()=>released.push('renderer'));failure.own(()=>{throw second;});
assert.throws(()=>failure.dispose(),error=>{
  assert(error instanceof AggregateError);assert.deepEqual(error.errors,[first,second]);return true;
});
failure.dispose();assert.deepEqual(released,['renderer'],'cleanup continues after an error, exactly once');
const callbackFailure=pageLifetime(()=>{}),sentinel=new Error('callback failure');
assert.throws(callbackFailure.guard(()=>{throw sentinel;}),error=>error===sentinel,'live callback errors propagate');
console.log('PASS: Pixi page ownership, invalidation before cleanup, reverse release order, idempotence, late initialization and surfaced cleanup/callback failures.');
