// Canvas presentation only; the shared frog model owns visits, paths and departure.
const frogReducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
function drawGardenFrogs(at) {
  for(const frog of gardenFrogs.frogs) {
    const pose=window.PacketGardenFrogs.visualState(frog,at,frogReducedMotion?.matches??false);
    if(pose.alpha<=0)continue;
    context.save();context.translate(pose.x,pose.y);context.scale(pose.direction,1);context.globalAlpha=pose.alpha;
    for(const [shape,x,y,a,b,color,width] of window.PacketGardenFrogs.frames.get(pose.frame)) {
      context.beginPath();
      if(shape==='line') {context.moveTo(x,y);context.lineTo(a,b);context.strokeStyle=`#${color.toString(16).padStart(6,'0')}`;context.lineWidth=width;context.stroke();}
      else {const shade=shape==='circle'?b:color;context.fillStyle=`#${shade.toString(16).padStart(6,'0')}`;
        if(shape==='circle')context.arc(x,y,a,0,Math.PI*2);else context.ellipse(x,y,a,b,0,0,Math.PI*2);context.fill();}
    }
    context.restore();
  }
}
