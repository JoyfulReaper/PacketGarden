// Finite cached artwork and lifecycle-scale contracts. Actual ink bounds/pixels
// are checked separately by the optional installed-Chrome --plants fixture.
const assert = require('node:assert/strict'), vm = require('node:vm'), { execFileSync } = require('node:child_process');
const h = require('./pixi-live.cjs'), core = require('../wwwroot/pixi-live-core.js'), shared = require('../wwwroot/pixi-stress.js');
const current = require('../wwwroot/pixi-live.js'), previous = { exports: {} };
vm.runInNewContext(execFileSync('git', ['show', '916e7b969ea9218478202593088f6e9de614df26:wwwroot/pixi-live.js'], { encoding: 'utf8' }), { module: previous });
const countBefore = h.textureCount(), objectsBefore = h.live.size;
class Graphics extends h.P.Graphics {
  constructor() { super(); this.commands = []; }
  destroy(options) { this.destroyArgument = options; super.destroy(options); }
}
for (const method of ['rect','roundRect','circle','ellipse','poly','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','fill','stroke']) {
  Graphics.prototype[method] = function(...args) { this.commands.push([method, ...args]); return this; };
}
const P = { ...h.P, Graphics }, keys = [];
for (const type of core.eventSpecies) for (let vigor=0; vigor<4; vigor++) for (let variant=0; variant<5; variant++)
  for (const stage of type==='redbloom'?['mature','fading']:['sprout','growing','mature','fading']) keys.push(`${type}:${stage}:${vigor}:${variant}`);
keys.push('rain','probe','collectible_weed',...['sprout','growing','mature','fading'].map(stage=>'stillbloom:'+stage));
for(let arrangement=0;arrangement<3;arrangement++)for(let color=0;color<5;color++)keys.push(`broadleaf-bloom:${color}:${arrangement}`);
for(let vigor=0;vigor<4;vigor++)for(let variant=0;variant<5;variant++)for(let layout=0;layout<2;layout++)keys.push(`vine-bloom:${vigor}:${variant}:${layout}`);
keys.push('vine-bloom-link');
function capture(make,legacy=false) {
  let tiles; const dimensions = [];
  const cache = make(P, { generateTexture(options) {
    dimensions.push([options.frame.width, options.frame.height, options.resolution]);
    if (options.frame.width===1024) tiles = options.target.children.map((object,index) => ({ key:keys[index], object,
      graphic:object instanceof Graphics, commands:object.commands?JSON.parse(JSON.stringify(object.commands)):undefined, scale:[object.scale.x,object.scale.y],
      position:[object.position.x,object.position.y], anchor:object.anchor?[object.anchor.x,object.anchor.y]:undefined, tint:object.tint, alpha:object.alpha }));
    return { source:{}, destroy(){} };
  } }, shared,legacy?{...core,species:core.eventSpecies}:core);
  assert.equal(cache.frames.size,legacy?763:828); assert.equal(new Set([...cache.frames.values()].map(t=>t.source)).size,1);
  for (const frame of cache.frames.values()) frame.destroy(false); cache.atlas.destroy(true);
  return { tiles, dimensions };
}
const before = capture(previous.exports.makeLiveAtlas,true), after = capture(current.makeLiveAtlas);
assert.deepEqual(before.dimensions, [[512,448,2],[1024,768,2]]);
assert.deepEqual(after.dimensions, [[512,448,2],[1024,832,2]]);
const redesigned = new Set(['broadleaf','blackthorn','weed']);
const enlargement = { flower:1.12, mushroom:1.16, wirefern:1.16, crystalfungus:1.12, ghostbloom:1.10 };
const protectedTypes = new Set(['vine','redbloom','rain','probe','collectible_weed']);
for (let i=0; i<keys.length; i++) {
  const a=after.tiles[i], b=before.tiles[i], [type,stage,vigor]=a.key.split(':');
  if(type==='vine-bloom'||type==='vine-bloom-link'){
    assert(a.graphic);assert.equal(a.object.destroyArgument,undefined);
    const count=type==='vine-bloom-link'?1:Number(a.key.split(':')[3])===0?2:4;
    assert.equal(a.commands.filter(c=>c[0]==='circle').length,count*2);
    for(const [kind,x,y,radius] of a.commands)if(kind==='circle')assert(x-radius>=-15&&x+radius<=15&&y-radius>=-28&&y+radius<=2);
    continue;
  }
  if(type==='broadleaf-bloom'){
    assert(a.graphic);assert.equal(a.object.destroyArgument,undefined);
    assert.equal(a.commands.filter(c=>c[0]==='circle').length,(Number(vigor)+1)*17,'bounded petals, highlights and centers');
    for(const [kind,x,y,radius] of a.commands)if(kind==='circle'){
      assert(x-radius>=-15&&x+radius<=15&&y-radius>=-28&&y+radius<=2,'blossoms remain inside the cached tile');
    }
    continue;
  }
  if(type==='stillbloom'){
    assert(a.graphic);assert.equal(a.object.destroyArgument,undefined);
    for(const [kind,...args] of a.commands){
      if(kind==='circle'||kind==='ellipse'){
        const [x,y,rx,ry=rx]=args;assert(x-rx>=-15&&x+rx<=15&&y-ry>=-28&&y+ry<=2,'Stillbloom halo/ellipse stays within clear atlas margins');
      } else if(['moveTo','lineTo','quadraticCurveTo','bezierCurveTo'].includes(kind)){
        for(let j=0;j<args.length;j+=2)assert(args[j]>=-15&&args[j]<=15&&args[j+1]>=-28&&args[j+1]<=2,'Stillbloom path hull stays inside its own frame');
      }
    }
    continue;
  }
  assert.deepEqual(a.position,b.position,'atlas slots/root positions remain fixed');
  assert.equal(a.alpha,b.alpha,'fading opacity remains fixed');
  if (protectedTypes.has(type)) {
    for (const property of ['commands','scale','anchor','tint','graphic']) assert.deepEqual(a[property],b[property],`${a.key} ${property} unchanged`);
  } else if (redesigned.has(type)) {
    assert(a.graphic); assert.equal(a.object.destroyArgument,undefined,'owned construction contexts released via destroy()');
    assert.equal(a.scale[0],stage==='sprout'?.42:stage==='growing'?.72:stage==='fading'?.66:1);
    if(type==='weed') {
      const fans=a.commands.filter(c=>c[0]==='poly');
      assert.equal(fans.length,(3+(Number(vigor)>1?1:0))*(Number(vigor)<2?5:7));
      assert(fans.every(c=>c[1].length===40&&c[1].every(Number.isFinite)),'bounded serrated palmate leaflets');
    } else if(type==='blackthorn') assert.equal(a.commands.filter(c=>c[0]==='poly').length,5+Number(vigor),'bounded pointed thorns');
    else assert(a.commands.filter(c=>c[0]==='bezierCurveTo').length>=11,'layered curved leaves');
  } else {
    assert(!a.graphic); assert.equal(a.scale[0],b.scale[0]*enlargement[type]); assert.equal(a.tint,b.tint);
    assert.deepEqual(a.anchor,type==='mushroom'?[.5,.94]:b.anchor,'mushroom bake origin preserves bottom margin');
  }
}
assert.equal(after.tiles.filter(t=>t.graphic&&t.key!=='collectible_weed').length,385);
assert.equal(h.textureCount(),countBefore); assert.equal(h.live.size,objectsBefore,'construction display objects released');
console.log('PASS: bounded Phase 2B artwork/leaflets/thorns, exact scale factors and stage differences, unchanged vine/redbloom/collectible commands, atlas cardinality/dimensions/ownership.');
