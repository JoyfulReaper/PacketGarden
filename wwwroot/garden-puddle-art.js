// Finite water artwork for the Pixi ecology atlas and shared wetness contours.
// Coordinates use a 64px tile, centered at (32,32), with logical size 18.
(function () {
  'use strict';
  const tileSize = 64, resolution = 2, referenceSize = 18;
  const shores = [
    [[-20,2],[-18,-4],[-11,-6],[-7,-12],[1,-11],[6,-6],[15,-7],[20,-1],[16,5],[8,6],[2,11],[-7,10],[-12,5],[-18,7]],
    [[-19,-2],[-14,-9],[-5,-11],[1,-8],[5,-3],[13,-6],[20,-2],[18,5],[11,10],[3,9],[-2,5],[-11,8],[-18,5]],
    [[-20,0],[-15,-5],[-9,-4],[-7,-10],[1,-12],[8,-9],[10,-4],[18,-3],[20,3],[14,8],[6,7],[0,11],[-9,9],[-12,4],[-18,5]],
    [[-19,1],[-17,-6],[-9,-10],[-2,-8],[4,-11],[11,-7],[12,-2],[19,1],[16,7],[8,10],[1,6],[-5,10],[-14,8],[-14,3]]
  ];
  // Shore, body, shallows, sky: subdued teal, blue-green and slate variations.
  const palettes = [
    [0x476267,0x668e96,0x83a9aa,0xb2c7bd],
    [0x466461,0x638e89,0x87aaa0,0xbacabd],
    [0x4b626d,0x708e9e,0x91abb6,0xc1ceca],
    [0x48676b,0x65969a,0x89b0ac,0xb8cec2]
  ];
  // Each contour is one closed quadratic path; no intersecting ellipse outlines.
  function contour(points, scale = 1, dx = 0, dy = 0) {
    const p = points.map(([x,y]) => [32 + x * scale + dx,32 + y * scale + dy]);
    const last = p[p.length - 1], first = p[0];
    return [['moveTo',(last[0]+first[0])/2,(last[1]+first[1])/2],...p.map(([x,y],i) => {
      const next=p[(i+1)%p.length];return ['quadraticCurveTo',x,y,(x+next[0])/2,(y+next[1])/2];
    })];
  }
  const variants = shores.map((shore, i) => {
    const [edge,body,shallows,sky] = palettes[i];
    const patch = (points,color,alpha,scale=1,dx=0,dy=0) => ({color,alpha,path:contour(points,scale,dx,dy)});
    const layers = [
      patch(shore,edge,.22),
      patch(shore,edge,.38,.97),
      patch(shore,body,.88,.92,0,-.2),
      // Offset, broken color fields suggest shallow water and reflected open sky.
      patch(shore,shallows,.34,.73,-.7,-.8),
      patch([[-13,-2],[-10,-6],[-4,-7],[1,-5],[7,-6],[12,-3],[7,-1],[0,-2],[-5,0]],sky,.28,1,i%2*.8,-.4),
      patch([[-12,4],[-7,3],[-3,5],[2,4],[5,6],[0,8],[-6,7]],shallows,.34),
      // A pair of submerged silt/pebble marks, kept softer than the shoreline.
      patch([[-10,2],[-8,1],[-7,2],[-9,3]],edge,.30,1,i-1,0),
      patch([[7,3],[9,2],[11,3],[9,4]],sky,.25,1,0,i%2)
    ];
    // Short stepped sky slivers, rather than a glossy continuous rim.
    layers.push({color:sky,alpha:.60,path:[['moveTo',23,27],['lineTo',26,26],['lineTo',30,26],['lineTo',29,26.7],['lineTo',25,27.4],['lineTo',23,27]]});
    if(i%2===0) layers.push({color:0xd8ded0,alpha:.72,path:[['moveTo',38,29],['lineTo',39,28],['lineTo',40,29],['lineTo',39,30],['lineTo',38,29]]});
    return layers;
  });
  // Pure selection: refresh, drainage and drawing never consume a random stream.
  function variantFor(puddle) {
    return Math.min(variants.length - 1, Math.floor((puddle.seed - Math.floor(puddle.seed)) * variants.length));
  }
  // Artwork normalizes the existing .38 maximum to wetness; the model contract
  // remains untouched. Its exact sqrt radius / linear fade still drive both views.
  const opacityFor = opacity => Math.max(0,Math.min(1,opacity/.38));
  const api = {tileSize,resolution,referenceSize,variants,variantFor,opacityFor};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window === 'undefined' ? globalThis : window).PacketGardenPuddleArt = api;
})();
