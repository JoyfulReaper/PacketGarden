// Finite, renderer-neutral grass artwork. Recipes are built once, never on a frame.
(function () {
  'use strict';
  const shades = [0x809b75, 0xa7c58d, 0xcce2a8, 0x92b978];
  const baseOpacity=.94;
  const variants = Array.from({ length: 12 }, (_, variant) => {
    let seed = variant + 173;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const blades = [];
    // A low leafy mat, separate from the upright tufts. Jittered overlapping
    // lenses cover the tile edges without a rectangular silhouette or flat fill.
    for(let row=0;row<7;row++)for(let column=0;column<7;column++){
      const x=16.5+column*5.15+(random()-.5)*2.8,y=16.5+row*5.15+(random()-.5)*2.8;
      if(Math.pow(Math.abs(x-32)/19,4)+Math.pow(Math.abs(y-32)/19,4)>1.15)continue;
      const rx=3.7+random()*1.6,ry=2.4+random()*1.3,angle=(random()-.5)*1.8;
      const rotate=(dx,dy)=>[x+dx*Math.cos(angle)-dy*Math.sin(angle),y+dx*Math.sin(angle)+dy*Math.cos(angle)];
      blades.push({shade:(column+row+variant)%4,path:[...rotate(-rx,0),...rotate(0,-ry*2),...rotate(rx,0),...rotate(0,ry*2),...rotate(-rx,0)]});
    }
    // Irregular taller rosettes rise from the mat; no thin highlight needles.
    for (let tuft = 0; tuft < 4; tuft++) {
      const x=20+(tuft%2)*22+(random()-.5)*7,y=27+Math.floor(tuft/2)*18+(random()-.5)*7;
      const count=5+(variant+tuft)%3;
      for (let blade = 0; blade < count; blade++) {
        const bx = x + (random() - .5) * 5, by = y + (random() - .5) * 3;
        const lean=(blade/(count-1)-.5)*15+(random()-.5)*4;
        const height=7+random()*8,width=2+random()*1.8;
        blades.push({ shade: (blade + tuft + variant) % shades.length,
          path: [bx - width * .5, by, bx + lean * .1 - width, by - height * .62,
            bx + lean, by - height, bx + lean * .52 + width * .65, by - height * .36, bx + width * .5, by] });
      }
    }
    return blades;
  });
  function variantFor(cell) {
    const seed = Math.imul((cell.row * 32 + cell.column) ^ 0x45d9f3b, 0x45d9f3b);
    return ((seed ^ seed >>> 16) >>> 0) % variants.length;
  }
  function createPaths(Path) {
    if(typeof Path!=='function')return null;
    return variants.map(blades=>shades.map((_,shade)=>{
      const path=new Path();
      for(const blade of blades){if(blade.shade!==shade)continue;const p=blade.path;
        path.moveTo(p[0],p[1]);path.quadraticCurveTo(p[2],p[3],p[4],p[5]);
        path.quadraticCurveTo(p[6],p[7],p[8],p[9]);path.closePath();}
      return path;
    }));
  }
  const api = { shades, variants, variantFor, baseOpacity, createPaths };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window === 'undefined' ? globalThis : window).PacketGardenGrassArt = api;
})();
