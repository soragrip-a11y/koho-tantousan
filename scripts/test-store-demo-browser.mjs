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
try{
 for(const width of [320,390,430,1280]){
  await customer.setViewportSize({width,height:844});await staff.setViewportSize({width,height:844});
  await customer.goto(base);await readonly();assert.ok(await customer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await customer.screenshot({path:'tmp/store-demo-separated/customer-'+width+'.png',fullPage:true});
  for(const route of ['post','preview']){await staffRoute(route);assert.ok(await staff.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await staff.screenshot({path:'tmp/store-demo-separated/staff-'+route+'-'+width+'.png',fullPage:true});}
 }
 await customer.setViewportSize({width:390,height:844});await staff.setViewportSize({width:390,height:844});
 for(const hash of ['#post','#preview','#line','#store/nakatomi','#store/b','#unknown']){await customer.goto(base+hash);await readonly();await customer.reload();await readonly();}
 await customer.goBack();await readonly();await customer.goForward();await readonly();
 assert.ok(customerRequests.every(url=>!url.endsWith('/app.js')&&!url.endsWith('/post-ui.js')&&!url.includes('staff.html')));
 await staffRoute();
 const sizes=await staff.locator('.easy-post button').evaluateAll(bs=>bs.map(b=>({height:b.getBoundingClientRect().height,font:parseFloat(getComputedStyle(b).fontSize)})));
 assert.ok(sizes.every(s=>s.height>=68&&s.font>=22));
 assert.equal(await staff.locator('input[type=datetime-local]').count(),0);
 assert.equal(await staff.locator('#camera').getAttribute('capture'),'environment');
 await staff.locator('#library').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:await customer.screenshot()});await staff.waitForSelector('.easy-photo');
 await staff.locator('#next').click();await staff.locator('#next').click();assert.ok((await staff.locator('#easy-error').textContent()).includes('文章'));
 await staff.locator('#words').fill('文'.repeat(200));assert.equal((await staff.locator('#words').inputValue()).length,180);
 await staff.locator('#words').fill('入口を分けた写真と文章の練習です。販売情報ではありません。');
 await staff.locator('#back').click();await staff.locator('#next').click();assert.ok((await staff.locator('#words').inputValue()).includes('入口'));
 await staff.locator('#next').click();await staff.locator('#publish').evaluate(b=>{for(let i=0;i<10;i++)b.click();});
 await staff.waitForSelector('.staff-preview-note');assert.equal(await staff.locator('.card').count(),2);
 assert.ok(staff.url().includes('staff.html#preview'));
 await customer.reload();await readonly();assert.equal(await customer.locator('.card').count(),2);assert.ok((await customer.locator('.picture').first().getAttribute('src')).startsWith('data:image/jpeg'));
 await customer.screenshot({path:'tmp/store-demo-separated/customer-posted-390.png',fullPage:true});
 const other=await browser.newContext();const isolated=await other.newPage();await isolated.goto(base);await isolated.waitForSelector('.card');assert.equal(await isolated.locator('.card').count(),1);await other.close();
 await staff.locator('[data-edit-post]').first().click();await staff.waitForSelector('#soldout');
 staff.once('dialog',d=>d.dismiss());await staff.locator('#soldout').click();assert.equal(await staff.locator('#app').getAttribute('data-step'),'actions');
 staff.once('dialog',d=>d.accept());await staff.locator('#soldout').click();await staff.waitForSelector('.staff-preview-note');
 await customer.reload();await readonly();assert.equal(await customer.locator('.badge').first().textContent(),'売り切れの表示例');
 await staff.locator('[data-edit-post]').first().click();await staff.waitForSelector('#withdraw');staff.once('dialog',d=>d.accept());await staff.locator('#withdraw').click();await staff.waitForSelector('.staff-preview-note');
 await customer.reload();await readonly();assert.equal(await customer.locator('.card').count(),1);
 await staffRoute();await staff.locator('#next').click();await staff.locator('#words').fill('写真なしの練習');staff.once('dialog',d=>d.dismiss());await staff.locator('#cancel').click();assert.equal(await staff.locator('#words').inputValue(),'写真なしの練習');
 await staff.locator('#next').click();await staff.locator('#publish').click();await staff.waitForSelector('.staff-preview-note');
 await customer.reload();await readonly();assert.equal(await customer.locator('.card').count(),2);
 await customer.locator('#visit').evaluate(b=>{for(let i=0;i<20;i++)b.click();});await customer.waitForFunction(()=>document.querySelector('#visit').textContent.includes('受付済み'));await customer.reload();await readonly();assert.ok(await customer.locator('#visit').isDisabled());
 await staffRoute();await staff.locator('#library').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('broken')});await staff.waitForFunction(()=>document.querySelector('#easy-error').textContent.includes('読み込めません'));
 staff.once('dialog',d=>d.accept());await staff.locator('#cancel').click();await staff.waitForSelector('.staff-preview-note');
 staff.once('dialog',d=>d.accept());await staff.locator('#reset').click();await staff.waitForSelector('#choose-photo');
 await customer.reload();await readonly();assert.equal(await customer.locator('.card').count(),1);assert.equal(await customer.locator('#visit').isDisabled(),false);
 assert.equal((await customer.request.get(base+'owner-preview/index.html')).status(),404);
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
 console.log('PASS: separate customer/staff files, zero customer operation links, initial/old/invalid hash/back/forward/reload safe, mobile, photo/text/customer reflection, optional photo/cancel/soldout/withdraw/reset, local-only data, no writes.');
}finally{await browser.close();server.close();}
