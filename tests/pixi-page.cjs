// Actual page/model/input adapter with a synthetic clock and injected Pixi/SSE.
const fs=require('node:fs'),{start}=require('./pixi-default.cjs');
module.exports=async function page(options={}) {
  const g=await start(false,{captureModel:true,...options,pageHtml:fs.readFileSync('wwwroot/'+(options.page??'index.html'),'utf8')});
  return {...g,now:()=>g.context.Date.now(),emit:(name,data)=>g.sources[0].handlers.get(name)({data:typeof data==='string'?data:JSON.stringify(data)}),
    click(point){const root=g.view.root,rect=g.app.canvas.getBoundingClientRect(),screen=g.app.renderer.screen;
      g.app.canvas.handlers.get('click')({clientX:rect.left+(root.position.x+point.x*root.scale.x)*rect.width/screen.width,
        clientY:rect.top+(root.position.y+point.y*root.scale.y)*rect.height/screen.height});},
    hidden(value){g.doc.hidden=value;g.docHandlers.get('visibilitychange')();},
    close(){g.winHandlers.get('pagehide')({persisted:false});}
  };
};
module.exports.center=p=>({x:(p.column+.5)*30,y:(p.row+.5)*30});
