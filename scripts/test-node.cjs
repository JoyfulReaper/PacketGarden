// Run every remaining Node suite without installing dependencies.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/retire-canvas/node');fs.mkdirSync(output,{recursive:true});
const helpers=new Set(['audio-context.cjs','pixi-page.cjs']),results=[];
for(const name of fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.cjs')&&!helpers.has(n)).sort()){
  const r=spawnSync(process.execPath,[path.join('tests',name)],{cwd:root,encoding:'utf8',windowsHide:true,timeout:180000});
  const log=(r.stdout??'')+(r.stderr??'')+(r.error?.stack??'');fs.writeFileSync(path.join(output,name+'.log'),log);
  const status=r.status===0?/^SKIP:/.test(log)?'skipped':'passed':'failed';results.push({test:name,status,exitCode:r.status});
  console.log(status.toUpperCase()+': '+name);if(status==='failed')console.log(log.slice(-4000));
}
fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results.reduce((s,r)=>(s[r.status]++,s),{passed:0,skipped:0,failed:0})));
process.exitCode=results.some(r=>r.status==='failed')?1:0;
