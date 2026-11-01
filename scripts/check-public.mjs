import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export function inspect(root){
 const errors=[];let links=0,syntax=0;
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);if(e.isSymbolicLink()){errors.push('Symlink: '+p);return [];}return e.isDirectory()?walk(p):[p];});
 if(!fs.existsSync(root))return {errors:['Missing asset directory'],files:0,links,syntax};
 const files=walk(root),names=new Set(files.map(f=>path.relative(root,f).replaceAll('\\','/')));
 for(const p of ['index.html','services.html','works.html','contact.html','cooperation.html','_redirects','_headers','assets/service-logo.png','demo/stores/index.html','demo/stores/line-client.mjs','demo/stores/line-flow.mjs','demo/stores/line-screen.mjs','demo/stores/mount-line-entry.mjs','demo/stores/staff-line-bootstrap.mjs','demo/stores/staff-line.html'])if(!names.has(p))errors.push('Missing required file: '+p);
 if(new Set([...names].map(x=>x.toLowerCase())).size!==names.size)errors.push('Case-colliding paths');
 if(files.length>20000)errors.push('Asset count exceeds free-plan limit');
 for(const f of files){
  const rel=path.relative(root,f),size=fs.statSync(f).size;
  if(size>25*1024*1024)errors.push('Oversized asset: '+rel);
  if(/(?:^|[\\/])(?:\.env(?:\..*)?|\.git|id_rsa|.*\.(?:pem|key|sql|map))$/i.test(rel))errors.push('Sensitive filename: '+rel);
  if(!/\.(?:html|js|mjs|css|json|txt|svg)$/.test(f)&&!/^_/.test(path.basename(f)))continue;
  const s=fs.readFileSync(f,'utf8');
  const secret= /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/.test(s);
  let privilegedJWT=false;for(const m of s.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)){try{if(JSON.parse(Buffer.from(m[1],'base64url')).role==='service_role')privilegedJWT=true;}catch{}}
  if(secret||privilegedJWT)errors.push('Possible credential in '+rel); // Never print matched values.
  if(/\.(?:js|mjs)$/.test(f)){syntax++;if(spawnSync(process.execPath,['--check',f],{stdio:'ignore'}).status!==0)errors.push('Invalid JavaScript: '+rel);}
  if(f.endsWith('.html'))for(const m of s.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)){
   const u=m[1];if(/^(?:[a-z]+:|\/\/|#)/i.test(u))continue;
   let p;try{p=decodeURIComponent(u.split(/[?#]/)[0]);}catch{errors.push('Invalid URL in '+rel);continue;}if(!p)continue;
   const target=path.resolve(p.startsWith('/')?root:path.dirname(f),p.replace(/^\//,''));const relative=path.relative(path.resolve(root),target);
   links++;if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.existsSync(target))errors.push('Missing/outside local reference: '+rel+' -> '+p);
  }
 }
 return {files:files.length,links,syntax,errors};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const result=inspect(path.resolve(process.argv[2]||'dist'));console.log(JSON.stringify(result,null,2));process.exitCode=result.errors.length?1:0;}
