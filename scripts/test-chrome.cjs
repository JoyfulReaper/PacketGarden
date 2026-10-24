// Uses installed Chrome/Playwright. No downloads or new dependencies.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
try{require.resolve('playwright');}catch{throw Error('Make the already installed Playwright runtime available through NODE_PATH before running test:chrome.');}
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/retire-canvas/chrome');fs.mkdirSync(out,{recursive:true});
const jobs=[['pixi-default-browser.cjs'],['grass-lush-browser.cjs'],['grass-under-plants-browser.cjs'],['pixi-broadleaf-blooms-browser.cjs'],['pixi-vine-blooms-browser.cjs'],['pixi-grass-separation-browser.cjs','--baseline'],['pixi-grass-separation-browser.cjs'],['pixi-vine-art-browser.cjs'],['canvas-retirement-browser.cjs']];
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7),file=path.join(out,'results.json');
const results=only&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
for(const [name,...args] of jobs){const id=name+(args.length?'-baseline':'');if(only&&!id.includes(only))continue;
  console.log('RUN: '+id);const start=Date.now(),r=spawnSync(process.execPath,[path.join('tests',name),'--run',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:900000,
    env:{...process.env,PACKETGARDEN_BROWSER_OUTPUT:'artifacts/retire-canvas/chrome/default'}});
  const log=(r.stdout??'')+(r.stderr??'')+(r.error?.stack??'');fs.writeFileSync(path.join(out,id+'.log'),log);
  const result={test:id,status:r.status===0?'passed':'failed',exitCode:r.status,elapsedSeconds:(Date.now()-start)/1000};
  const index=results.findIndex(v=>v.test===id);if(index<0)results.push(result);else results[index]=result;
  fs.writeFileSync(file,JSON.stringify(results,null,2));console.log(result.status.toUpperCase()+': '+id);if(r.status!==0)console.log(log.slice(-5000));
}
console.log(JSON.stringify(results));process.exitCode=results.some(r=>r.status==='failed')?1:0;
