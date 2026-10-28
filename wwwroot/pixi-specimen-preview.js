// On-demand intrinsic specimen art, borrowed from the live Sprite tree/atlas.
(function(){
  'use strict';
  const config=Object.freeze({size:160,pixels:320,padding:16,sourceExtent:64,resolution:4,maxSprites:8,stillbloomStep:.05});
  function copyTree(P,source){
    let count=0;
    function copy(node,root=false){
      if(!(node instanceof P.Sprite))return null;
      if(++count>config.maxSprites)throw Error('Specimen preview Sprite limit');
      const sprite=new P.Sprite(node.texture);
      try{
        sprite.anchor.set(node.anchor.x,node.anchor.y);sprite.position.set(root?0:node.position.x,root?0:node.position.y);
        sprite.scale.set(node.scale.x,node.scale.y);sprite.rotation=node.rotation??0;sprite.alpha=node.alpha??1;sprite.tint=node.tint??0xffffff;
        sprite.visible=node.visible!==false;sprite.renderable=node.renderable!==false;sprite.eventMode='none';
        if(node.skew&&sprite.skew)sprite.skew.set(node.skew.x,node.skew.y);
        if(node.pivot&&sprite.pivot)sprite.pivot.set(node.pivot.x,node.pivot.y);
        if(node.blendMode)sprite.blendMode=node.blendMode;
        for(const child of node.children??[]){const item=copy(child);if(item)sprite.addChild(item);}
        return sprite;
      }catch(error){sprite.destroy({children:true,texture:false,textureSource:false});throw error;}
    }
    return copy(source,true);
  }
  function alphaBounds(data,width,height){
    let left=width,top=height,right=-1,bottom=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
    return right<left?null:{x:left,y:top,width:right-left+1,height:bottom-top+1};
  }
  function releaseCanvas(canvas){if(canvas){canvas.width=0;canvas.height=0;}}
  function renderSprite({P,renderer,source,document}){
    const group=new P.Container();let scratch=null,output=null;
    try{
      const copy=copyTree(P,source);if(!copy)return null;group.addChild(copy);
      let bounds=group.getLocalBounds(),extent=Math.max(bounds.width,bounds.height);
      if(!Number.isFinite(extent)||extent<=0)return null;
      if(extent>config.sourceExtent){const factor=config.sourceExtent/extent;copy.scale.set(copy.scale.x*factor,copy.scale.y*factor);bounds=group.getLocalBounds();}
      const x=Math.floor(bounds.minX),y=Math.floor(bounds.minY);
      const frame=new P.Rectangle(x-1,y-1,Math.ceil(bounds.maxX)-x+2,Math.ceil(bounds.maxY)-y+2);
      // Pixi 8.22 ExtractSystem.canvas renders, reads back, and destroys its owned RenderTexture/source.
      scratch=renderer.extract.canvas({target:group,frame,resolution:config.resolution,clearColor:[0,0,0,0],antialias:false});
      const pixels=scratch.getContext('2d',{willReadFrequently:true}).getImageData(0,0,scratch.width,scratch.height);
      const art=alphaBounds(pixels.data,scratch.width,scratch.height);if(!art)return null;
      output=document.createElement('canvas');output.width=config.pixels;output.height=config.pixels;
      const fit=(config.pixels-2*config.padding)/Math.max(art.width,art.height),width=art.width*fit,height=art.height*fit;
      output.getContext('2d').drawImage(scratch,art.x,art.y,art.width,art.height,(config.pixels-width)/2,(config.pixels-height)/2,width,height);
      const canvas=output;output=null;return {canvas,dispose(){releaseCanvas(canvas);}};
    }finally{
      group.destroy({children:true,texture:false,textureSource:false});releaseCanvas(scratch);releaseCanvas(output);
    }
  }
  function createSignature(P){
    const ids=new WeakMap();let next=0;
    const id=value=>{if(!ids.has(value))ids.set(value,++next);return ids.get(value);};
    return (source,specimen)=>{
      const values=[];let count=0;
      function visit(node,root=false){
        if(!(node instanceof P.Sprite))return;
        if(++count>config.maxSprites)throw Error('Specimen preview Sprite limit');
        const quiet=root&&specimen.type==='stillbloom',animated=root&&Boolean(specimen.mutation);
        const meaningful=value=>quiet?Math.round(value/config.stillbloomStep):value;
        values.push(id(node),id(node.texture),node.anchor.x,node.anchor.y,root?0:node.position.x,root?0:node.position.y,
          meaningful(node.scale.x),meaningful(node.scale.y),animated?0:node.rotation??0,
          animated?1:meaningful(node.alpha??1),node.tint??0xffffff,node.visible!==false,node.renderable!==false,
          node.skew?.x??0,node.skew?.y??0,node.pivot?.x??0,node.pivot?.y??0,node.blendMode??'normal');
        for(const child of node.children??[])visit(child);values.push('/');
      }
      visit(source,true);return values.join('|');
    };
  }
  function createPreview({P,renderer,getSprite,document,host,render=source=>renderSprite({P,renderer,source,document}),clock=()=>performance.now()}){
    const signature=createSignature(P),counts={renders:0,discarded:0,errors:0,totalMs:0,maxMs:0};
    let selected=null,label='',key=null,epoch=0,desired=null,running=false,scheduled=false,hidden=false,disposed=false,owned=null;
    const release=()=>{host.replaceChildren();if(owned){owned.dispose();owned=null;}};
    function schedule(){if(scheduled||running||disposed||hidden||!desired)return;scheduled=true;Promise.resolve().then(pump);}
    async function pump(){
      scheduled=false;if(running||disposed||hidden||!desired)return;
      const job=desired;desired=null;running=true;let result=null;
      try{
        const start=clock(),work=render(job.sprite);job.sprite=null;result=await work;
        const ms=clock()-start;counts.renders++;counts.totalMs+=ms;counts.maxMs=Math.max(counts.maxMs,ms);
        if(job.epoch!==epoch||disposed||hidden||!selected){counts.discarded++;return;}
        const source=getSprite(selected);
        if(!source||source.destroyed||signature(source,selected)!==job.key){counts.discarded++;key=null;refresh(selected,label);return;}
        if(!result){host.hidden=true;return;}
        release();owned=result;result=null;
        owned.canvas.setAttribute('role','img');owned.canvas.setAttribute('aria-label',label);
        host.replaceChildren(owned.canvas);host.hidden=false;
      }catch{counts.errors++;if(job.epoch===epoch&&!disposed){release();host.hidden=true;}}
      finally{job.sprite=null;if(result)result.dispose();running=false;schedule();}
    }
    function refresh(specimen,description=label){
      if(disposed)return;label=description;
      if(hidden){selected=specimen;return;}
      const source=specimen&&getSprite(specimen);
      if(!source||source.destroyed){clear();return;}
      const next=signature(source,specimen);
      if(selected===specimen&&key===next){if(owned)owned.canvas.setAttribute('aria-label',label);return;}
      selected=specimen;key=next;epoch++;release();host.hidden=false;
      desired={epoch,sprite:source,key:next};schedule();
    }
    function clear(){epoch++;selected=null;key=null;desired=null;release();host.hidden=true;}
    return{refresh,clear,setHidden(value){if(disposed||hidden===value)return;hidden=value;epoch++;desired=null;key=null;release();host.hidden=true;
        if(!hidden&&selected)refresh(selected,label);},
      snapshot(){return{...counts,running,queued:Boolean(desired),active:owned?1:0};},
      destroy(){if(disposed)return;disposed=true;clear();}};
  }
  const api={config,copyTree,alphaBounds,renderSprite,createSignature,createPreview};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PacketGardenSpecimenPreview=api;
})();
