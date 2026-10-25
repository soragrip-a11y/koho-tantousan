import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port+'/demo/stores/';
const browser=await (process.env.TEST_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'msedge',headless:true}));
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const customer=await context.newPage(),staff=await context.newPage(),errors=[],writes=[],customerRequests=[];
for(const page of [customer,staff]){page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});}
customer.on('request',r=>customerRequests.push(r.url()));
await mkdir('tmp/store-demo-separated',{recursive:true});
async function readonly(){
 await customer.waitForSelector('#customer-content h1');
 assert.equal(await customer.locator('a,input,textarea,select,form,[data-edit-post],#reset').count(),0);
 assert.equal(await customer.locator('button').count(),1);
 assert.equal(await customer.locator('button').getAttribute('id'),'visit');
 assert.equal(await customer.locator('#app').count(),0);
}
async function staffRoute(hash='post'){await staff.goto(base+'staff.html#'+hash);await staff.waitForFunction(r=>document.querySelector('#app')?.dataset.route===r,hash==='preview'?'preview':'post');}
async function controlAppearance(page){
 const controls=await page.locator('button,a.button').evaluateAll(elements=>elements.filter(e=>e.getBoundingClientRect().width).map(e=>{
  const rect=e.getBoundingClientRect(),css=getComputedStyle(e);let clipped=false;
  for(let p=e.parentElement;p;p=p.parentElement){const pc=getComputedStyle(p),pr=p.getBoundingClientRect();if(['hidden','clip'].includes(pc.overflowY)&&rect.bottom+6>pr.bottom)clipped=true;}
  return {disabled:e.disabled===true,shadow:css.boxShadow,left:rect.left,right:rect.right,viewport:innerWidth,clipped};
 }));
 assert.ok(controls.every(c=>c.disabled?c.shadow==='none':c.shadow!=='none'));
 assert.ok(controls.every(c=>c.left>=9&&c.right<=c.viewport-9&&!c.clipped),'shadows have room and are not clipped');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
try{
 await staffRoute();await staff.locator('#next').tap();await staff.locator('#words').fill('最初の投稿');await staff.locator('#next').tap();await staff.locator('#publish').tap();await staff.waitForSelector('.staff-preview-note');
 await staff.locator('[data-edit-post]').first().tap();await staff.waitForSelector('#rewrite');
 const otherStaff=await context.newPage();await otherStaff.goto(base+'staff.html');await otherStaff.locator('#next').tap();await otherStaff.locator('#words').fill('別タブの投稿');await otherStaff.locator('#next').tap();await otherStaff.locator('#publish').tap();await otherStaff.waitForSelector('.staff-preview-note');
 staff.once('dialog',d=>d.accept());await staff.locator('#soldout').tap();await staff.waitForSelector('.staff-preview-note');
 const saved=await staff.evaluate(()=>JSON.parse(localStorage.getItem('koho-post-experience-v3')));
 
 assert.ok(saved.some(p=>p.text==='別タブの投稿'),'second tab post must survive first tab state change');

 await otherStaff.close();staff.once('dialog',d=>d.accept());await staff.locator('#reset').tap();await staff.waitForSelector('#next');
 await customer.goto(base);await readonly();
 await staffRoute();await staff.locator('#next').tap();await staff.locator('#words').fill('タッチ操作の投稿テスト');await staff.locator('#next').tap();await staff.locator('#publish').tap();await staff.waitForSelector('.staff-preview-note');
 await customer.waitForFunction(()=>document.querySelector('.card')?.textContent.includes('タッチ操作の投稿テスト'));
 await staff.locator('[data-edit-post]').first().tap();await staff.waitForSelector('#rewrite');await staff.locator('#rewrite').tap();await staff.waitForSelector('#next');await staff.locator('#next').tap();await staff.locator('#words').fill('書き直した本文');await staff.locator('#next').tap();await staff.locator('#publish').tap();await staff.waitForSelector('.staff-preview-note');
 await customer.waitForFunction(()=>document.querySelector('.card')?.textContent.includes('書き直した本文'));
 await staff.locator('[data-edit-post]').first().tap();
 await staff.evaluate(()=>{window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('test full','QuotaExceededError');};});
 staff.once('dialog',d=>d.accept());await staff.locator('#soldout').tap();
 assert.ok((await staff.locator('#easy-error').textContent()).includes('変更を保存できませんでした'));
 await staff.evaluate(()=>{Storage.prototype.setItem=window.savedSetItem;delete window.savedSetItem;});
 staff.once('dialog',d=>d.dismiss());await staff.locator('#soldout').tap();await staff.waitForSelector('#soldout');staff.once('dialog',d=>d.accept());await staff.locator('#soldout').tap();await staff.waitForSelector('.staff-preview-note');
 await customer.waitForFunction(()=>document.querySelector('.badge')?.textContent==='売り切れの表示例');
 await staff.locator('[data-edit-post]').first().tap();staff.once('dialog',d=>d.accept());await staff.locator('#withdraw').tap();await staff.waitForSelector('.staff-preview-note');
 await customer.waitForFunction(()=>document.querySelectorAll('.card').length===1);
 await customer.reload();await readonly();assert.equal(await customer.locator('.card').count(),1);
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);console.log('TOUCH PASS: create/edit/soldout/withdraw, concurrent tab preservation and already-open customer reflection');
}finally{await browser.close();server.close();}
