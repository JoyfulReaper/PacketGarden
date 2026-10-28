const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../wwwroot/pixi-specimen-preview.js'),h=require('./pixi-live.cjs'),C=require('../wwwroot/pixi-live-core.js'),shared=require('../wwwroot/pixi-stress.js');
const {createView}=require('../wwwroot/pixi-live.js');
const point=(x=0,y=x)=>({x,y,set(x,y=x){this.x=x;this.y=y;}});
assert.deepEqual(R.config,{size:160,pixels:320,padding:16,sourceExtent:64,resolution:4,maxSprites:8,stillbloomStep:.05});
{
  const pixels=new Uint8ClampedArray(10*8*4);pixels[(2*10+3)*4+3]=1;pixels[(6*10+8)*4+3]=255;
  assert.deepEqual(R.alphaBounds(pixels,10,8),{x:3,y:2,width:6,height:5});assert.equal(R.alphaBounds(new Uint8Array(8),2,1),null);
}
function sampleTree(){
  const p=new h.P.Sprite(h.cache.frames.get('wirefern:mature:3:4'));p.anchor.set(.5,.9);p.scale.set(-1.4,1.4);p.position.set(450,321);p.rotation=.2;p.alpha=.7;p.tint=0xabcdee;
  const child=new h.P.Sprite(h.cache.frames.get('wirefern-spores:2'));child.anchor.set(.5,29/32);child.position.set(1,.2);child.scale.set(.66);child.alpha=.55;child.tint=0xabc123;child.rotation=.07;p.addChild(child);
  const external=new h.P.Graphics();p.addChild(external);return p;
}
{
  const source=sampleTree(),before=h.live.size,textures=h.textureCount(),copy=R.copyTree(h.P,source);
  assert.equal(copy.texture,source.texture);assert.notEqual(copy,source);assert.equal(copy.children.length,1);
  assert.equal(copy.position.x,0);assert.equal(copy.position.y,0);assert.equal(copy.scale.x,-1.4);assert.equal(copy.rotation,.2);assert.equal(copy.tint,source.tint);assert.equal(copy.alpha,.7);
  const overlay=copy.children[0];for(const key of ['texture','alpha','tint','rotation'])assert.equal(overlay[key],source.children[0][key]);
  assert.equal(overlay.position.y,.2);assert.equal(overlay.anchor.y,29/32);assert.equal(overlay.scale.x,.66);
  copy.destroy({children:true,texture:false,textureSource:false});assert.equal(h.live.size,before);assert.equal(h.textureCount(),textures);
  source.destroy({children:true});
}
// Real live recipes and decoration ownership; copies borrow exactly their current frames, without art reconstruction.
{
  let at=100000;const stage=new h.P.Container(),view=createView(h.P,{stage},h.cache.frames,C,shared);
  const model=C.createModel(view,{now:()=>at,random:()=>.5,sporeRandom:()=>0,bloomRandom:()=>0,vineBloomRandom:()=>0,poppyRandom:()=>.99});
  const keys=[];
  for(const type of C.eventSpecies)for(const vigor of [0,1,2,3])for(const age of [0,C.timings[type].growingAfterMs??0,C.timings[type].matureAfterMs??0,(C.timings[type].expiredAfterMs-1000)]){
    model.clear();const p=model.addSpecimen(type,vigor,at,{kind:'simulated'}).specimen;p.createdAt=at-age;p.colorVariant=4;model.tick(at);view.update(p,model.byCell);
    const source=view.byId.get(p.id),copy=R.copyTree(h.P,source);keys.push(source.texture);
    assert.equal(copy.texture,source.texture);assert.equal(copy.children.length,source.children.length);
    assert.equal(copy.scale.x,source.scale.x);assert.equal(copy.scale.y,source.scale.y);
    for(let i=0;i<copy.children.length;i++){assert.equal(copy.children[i].texture,source.children[i].texture);assert.equal(copy.children[i].tint,source.children[i].tint);}
    copy.destroy({children:true,texture:false,textureSource:false});
  }
  model.clear();const poppy=model.seedPoppies('mature'),s=view.byId.get(poppy.id),copy=R.copyTree(h.P,s);assert.equal(copy.texture,h.cache.frames.get('opium-poppy:mature'));copy.destroy({children:true});
  model.seedMutations();const weed=model.specimens.find(p=>p.mutation),w=R.copyTree(h.P,view.byId.get(weed.id));assert.equal(w.texture,h.cache.frames.get('collectible_weed'));w.destroy({children:true});
  assert(keys.length>=40);model.clear();view.destroy();stage.destroy();
}
// The renderer uses only copies, a single bounded extraction, alpha trimming and proportional placement.
{
  const source=sampleTree(),objects=h.live.size,textures=h.textureCount(),requests=[];let disposed=0,draw=null;
  class Container extends h.P.Container{getLocalBounds(){return{minX:-22,maxX:23,minY:-40,maxY:5,width:45,height:45};}}
  const data=new Uint8ClampedArray(188*188*4);data[(10*188+20)*4+3]=255;data[(150*188+100)*4+3]=255;
  const scratch={width:188,height:188,getContext:()=>({getImageData:()=>({data})})};
  const canvas={width:0,height:0,getContext:()=>({drawImage(...args){draw=args;}})};
  const result=R.renderSprite({P:{...h.P,Container},source,renderer:{extract:{canvas(options){requests.push(options);return scratch;}}},document:{createElement:()=>canvas}});
  assert.equal(requests.length,1);assert.notEqual(requests[0].target,source);assert.equal(requests[0].resolution,4);assert.deepEqual(requests[0].clearColor,[0,0,0,0]);
  assert.equal(canvas.width,320);assert.equal(canvas.height,320);assert.equal(scratch.width,0);assert.equal(scratch.height,0);
  assert.equal(h.live.size,objects);assert.equal(h.textureCount(),textures);assert(Math.abs(draw[3]/draw[4]-draw[7]/draw[8])<1e-12);
  result.dispose();assert.equal(canvas.width,0);assert.equal(canvas.height,0);source.destroy({children:true});
}
{
  const source=sampleTree(),signature=R.createSignature(h.P),p={type:'wirefern'},key=signature(source,p);
  source.position.set(999,555);assert.equal(signature(source,p),key,'world movement is not intrinsic art');
  source.children[0].tint=0x123456;assert.notEqual(signature(source,p),key,'sori color change invalidates');
  p.type='stillbloom';source.scale.set(1);const quiet=signature(source,p);source.scale.set(1.001);assert.equal(signature(source,p),quiet);source.scale.set(1.06);assert.notEqual(signature(source,p),quiet);
  p.type='redbloom';p.mutation={};const mutation=signature(source,p);source.rotation=.012;source.alpha=.91;assert.equal(signature(source,p),mutation,'ambient mutation bob/glint does not trigger extraction');
  source.destroy({children:true});
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function controller(){
  const nodes=new Map(),pending=[],mounted=[];let disposed=0;
  const host={hidden:true,replaceChildren(...children){mounted.splice(0,mounted.length,...children);}};
  const make=type=>{const p={type},s=new h.P.Sprite(h.cache.frames.get('flower:mature:1:0'));s.scale.set(1);nodes.set(p,s);return p;};
  const preview=R.createPreview({P:h.P,host,getSprite:p=>nodes.get(p),render:source=>new Promise((resolve,reject)=>pending.push({source,resolve,reject})),clock:()=>0});
  const finish=index=>{const canvas={attributes:{},setAttribute(k,v){this.attributes[k]=v;}};pending[index].resolve({canvas,dispose(){disposed++;}});return canvas;};
  return{nodes,pending,mounted,host,make,preview,finish,get disposed(){return disposed},cleanup(){preview.destroy();for(const s of nodes.values())s.destroy({children:true});}};
}
(async()=>{
  {
    const f=controller(),a=f.make('flower'),b=f.make('wirefern'),c=f.make('vine');
    f.preview.refresh(a,'Enlarged preview of Flower');await flush();assert.equal(f.pending.length,1);
    for(let i=0;i<50;i++)f.preview.refresh(i%2?b:c,'Changed');f.preview.refresh(b,'Enlarged preview of Wirefern');
    assert.equal(f.pending.length,1,'one in-flight render, latest queued only');const old=f.finish(0);await flush();assert(!f.mounted.includes(old));assert.equal(f.disposed,1);assert.equal(f.pending.length,2);
    const current=f.finish(1);await flush();assert.equal(f.mounted[0],current);assert.equal(current.attributes['aria-label'],'Enlarged preview of Wirefern');
    for(let i=0;i<100;i++)f.preview.refresh(b,'Enlarged preview of Wirefern');await flush();assert.equal(f.pending.length,2,'age/repeated clicks never extract');
    f.nodes.get(b).tint=0x889977;f.preview.refresh(b);await flush();assert.equal(f.pending.length,3);f.preview.clear();f.finish(2);await flush();
    assert.equal(f.mounted.length,0);assert(f.host.hidden);assert.equal(f.preview.snapshot().active,0);f.cleanup();
  }
  {
    const f=controller(),p=f.make('stillbloom');f.preview.refresh(p,'Stillbloom');await flush();f.preview.setHidden(true);f.finish(0);await flush();assert.equal(f.mounted.length,0);
    f.preview.setHidden(false);await flush();assert.equal(f.pending.length,2);f.finish(1);await flush();assert.equal(f.mounted.length,1);
    f.nodes.get(p).texture=h.cache.frames.get('stillbloom:fading');f.preview.refresh(p);await flush();f.preview.destroy();f.finish(2);await flush();assert.equal(f.mounted.length,0);assert.equal(f.preview.snapshot().active,0);f.cleanup();
  }
  {
    const f=controller(),p=f.make('broadleaf');f.preview.refresh(p);await flush();f.pending[0].reject(Error('Extraction failed'));await flush();assert(f.host.hidden);assert.equal(f.preview.snapshot().errors,1);f.cleanup();
  }
  // The real UI keeps exact specimen/removal/grass/Escape semantics and drives only the preview adapter.
  {
    const {start}=require('./pixi-default.cjs'),UI=require('../wwwroot/pixi-live-ui.js');const f=await start(false,{captureModel:true,random:()=>.5});
    let renders=0,clears=0,destroys=0;const previews=[];
    const preview={refresh(p,label){renders++;previews.push([p,label]);},clear(){clears++;},destroy(){destroys++;},setHidden(){}};
    const ui=UI.createUi({document:f.doc,window:f.context.window,garden:f.model,ambient:f.ambient,colorName:C.colorName,preview,getGrassCells:()=>f.ecology.grassCells,now:()=>f.context.Date.now()});
    const p=f.model.addSpecimen('wirefern',3,f.context.Date.now(),{kind:'simulated'}).specimen;
    ui.inspect(p,{x:900,y:800});assert.equal(previews.at(-1)[0],p);assert.match(previews.at(-1)[1],/Enlarged preview of Wirefern/);
    ui.removed({...p});assert.equal(ui.inspected,p);ui.removed(p);assert.equal(ui.inspected,null);assert(clears);
    ui.inspect(p,{x:0,y:0});f.winHandlers.get('keydown')({key:'Escape'});assert.equal(ui.inspected,null);
    f.ecology.seed({grassCells:[{column:30,row:18,createdAt:f.context.Date.now()-60000,lastInfluencedAt:f.context.Date.now()}]});
    ui.inspect(p,{x:1,y:1});const previous=clears;ui.click({x:915,y:555},{x:20,y:20});assert(ui.inspectedGrass);assert(clears>previous);assert.equal(f.element('#specimen-card-title').textContent,'Wild grass');
    ui.destroy();assert.equal(destroys,1);f.winHandlers.get('pagehide')({persisted:false});
  }
  console.log('PASS: exact cached Sprite/overlay copies, stages/rare/poppy/weed art, bounded extraction/alpha crop/proportions and shared texture ownership; invalidation, Stillbloom steps, no age/bob redraw, coalesced async stale/close/hidden/destroy/error cleanup, exact UI identity/grass/Escape.');
})().catch(e=>{console.error(e);process.exitCode=1;});
