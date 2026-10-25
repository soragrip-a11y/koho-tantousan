import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port+'/demo/stores/';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage(),errors=[],writes=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
await mkdir('tmp/store-demo-v3',{recursive:true});
const route=async hash=>{await page.goto(base+'#'+hash);await page.waitForFunction(r=>document.querySelector('#app')?.dataset.route===r,hash==='store/nakatomi'?'store':hash);};
try{
 for(const width of [320,390,430,1280]){
  await page.setViewportSize({width,height:844});
  for(const hash of ['line','post','store/nakatomi']){
   await route(hash);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+' '+hash);
   await page.screenshot({path:'tmp/store-demo-v3/'+width+'-'+hash.replace('/','-')+'.png',fullPage:true});
   if(hash==='post'){
    assert.equal(await page.locator('input[type=datetime-local]').count(),0);
    const sizes=await page.locator('.easy-post button').evaluateAll(bs=>bs.map(b=>({height:b.getBoundingClientRect().height,font:parseFloat(getComputedStyle(b).fontSize)})));
    assert.ok(sizes.every(s=>s.height>=68&&s.font>=22));
   }
  }
 }
 await page.setViewportSize({width:390,height:844});await route('line');
 assert.equal(await page.locator('.two-menu a').count(),2);
 assert.equal(await page.locator('.two-menu a').last().getAttribute('href'),'../../one-off.html');
 await page.locator('.two-menu a').first().click();await page.waitForSelector('#visit');await page.goBack();
 await route('post');
 assert.equal(await page.locator('#camera').getAttribute('capture'),'environment');
 assert.equal(await page.locator('#library').getAttribute('capture'),null);
 await page.locator('#library').setInputFiles({name:'demo.png',mimeType:'image/png',buffer:await page.screenshot()});
 await page.waitForSelector('.easy-photo');
 await page.locator('#next').click();assert.equal(await page.locator('#app').getAttribute('data-step'),'2');
 await page.locator('#next').click();assert.ok((await page.locator('#easy-error').textContent()).includes('文章'));
 await page.locator('#words').fill('文'.repeat(200));assert.equal((await page.locator('#words').inputValue()).length,180);
 await page.locator('#words').fill('写真とひとことの実演。実際の販売情報ではありません。');
 await page.locator('#back').click();await page.locator('#next').click();
 assert.ok((await page.locator('#words').inputValue()).includes('写真とひとこと'));
 await page.screenshot({path:'tmp/store-demo-v3/easy-step2-390.png',fullPage:true});
 await page.locator('#next').click();assert.equal(await page.locator('#app').getAttribute('data-step'),'3');
 await page.screenshot({path:'tmp/store-demo-v3/easy-step3-390.png',fullPage:true});
 await page.locator('#publish').evaluate(b=>{for(let i=0;i<10;i++)b.click();});
 await page.waitForFunction(()=>document.querySelector('#app').dataset.route==='store');
 assert.equal(await page.locator('.card').count(),2);
 assert.ok((await page.locator('.picture').first().getAttribute('src')).startsWith('data:image/jpeg'));
 await page.reload();assert.equal(await page.locator('.card').count(),2);
 const other=await browser.newContext();const isolated=await other.newPage();await isolated.goto(base+'#store/nakatomi');
 assert.equal(await isolated.locator('.card').count(),1);assert.ok(!(await isolated.locator('body').textContent()).includes('写真とひとこと'));await other.close();
 await page.locator('[data-edit-post]').first().click();await page.waitForSelector('#soldout');
 await page.screenshot({path:'tmp/store-demo-v3/easy-actions-390.png',fullPage:true});
 page.once('dialog',d=>d.dismiss());await page.locator('#soldout').click();assert.equal(await page.locator('#app').getAttribute('data-step'),'actions');
 page.once('dialog',d=>d.accept());await page.locator('#soldout').click();await page.waitForSelector('#visit');
 assert.equal(await page.locator('.badge').first().textContent(),'売り切れの表示例');
 await page.locator('[data-edit-post]').first().click();await page.waitForSelector('#withdraw');
 page.once('dialog',d=>d.accept());await page.locator('#withdraw').click();await page.waitForSelector('#visit');assert.equal(await page.locator('.card').count(),1);
 // Photo is optional; cancellation preserves existing samples.
 await route('post');await page.locator('#next').click();await page.locator('#words').fill('写真なしの練習');
 page.once('dialog',d=>d.dismiss());await page.locator('#cancel').click();assert.equal(await page.locator('#words').inputValue(),'写真なしの練習');
 await page.locator('#next').click();await page.locator('#publish').click();await page.waitForSelector('#visit');assert.equal(await page.locator('.card').count(),2);
 await page.locator('#visit').evaluate(b=>{for(let i=0;i<20;i++)b.click();});await page.waitForFunction(()=>document.querySelector('#visit').textContent.includes('受付済み'));
 await route('post');await page.locator('#library').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('broken')});
 await page.waitForFunction(()=>document.querySelector('#easy-error').textContent.includes('読み込めません'));
 await page.locator('#library').setInputFiles({name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(11000000)});
 assert.ok((await page.locator('#easy-error').textContent()).includes('10MB'));
 page.once('dialog',d=>d.accept());await page.locator('#cancel').click();await page.waitForSelector('#visit');
 page.once('dialog',d=>d.accept());await page.locator('#reset').click();await page.waitForFunction(()=>document.querySelector('#app').dataset.route==='line');
 await route('store/nakatomi');await page.reload();assert.equal(await page.locator('.card').count(),1);assert.equal(await page.locator('#visit').isDisabled(),false);
 assert.equal(await page.evaluate(()=>localStorage.getItem('koho-post-experience-v3')),null);
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
 assert.equal((await page.request.get(base+'owner-preview/index.html')).status(),404);
 await page.setViewportSize({width:2500,height:843});await page.goto(base+'rich-menu.svg');await page.screenshot({path:'dist/demo/stores/rich-menu.png'});
 console.log('PASS: easy three-step flow, large controls, camera/library choice, optional photo, back/cancel/confirmation, repeat save, soldout/withdraw, reload/isolation/reset, no network writes.');
}finally{await browser.close();server.close();}
