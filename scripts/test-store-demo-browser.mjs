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
   if(hash==='store/nakatomi'&&width===390){const box=await page.locator('.deadline').first().boundingBox();assert.ok(box.y+box.height<750);}
  }
 }
 await page.setViewportSize({width:390,height:844});await route('line');
 assert.equal(await page.locator('.two-menu a').count(),2);
 assert.equal(await page.locator('.two-menu a').last().getAttribute('href'),'../../one-off.html');
 await page.locator('.two-menu a').first().click();await page.waitForSelector('#visit');await page.goBack();
 await route('post');await page.locator('#save').click();assert.equal(await page.locator('#editor').count(),1);
 await page.locator('#title').fill('あ'.repeat(60));assert.equal((await page.locator('#title').inputValue()).length,40);
 await page.locator('#text').fill('文'.repeat(200));assert.equal((await page.locator('#text').inputValue()).length,180);
 await page.locator('#title').fill('写真と文章の実演');await page.locator('#text').fill('これは架空の投稿体験です。<script>悪意の文字も本文として表示</script>');
 await page.locator('#photo').setInputFiles({name:'demo.png',mimeType:'image/png',buffer:await page.screenshot()});
 await page.waitForFunction(()=>!document.querySelector('#preview').hidden&&!document.querySelector('#save').disabled);
 await page.locator('#editor').evaluate(f=>{for(let i=0;i<10;i++)f.requestSubmit();});await page.waitForFunction(()=>document.querySelector('#app').dataset.route==='store');
 assert.equal(await page.locator('.card').count(),2);assert.equal(await page.locator('.card h2').first().textContent(),'写真と文章の実演');
 assert.ok((await page.locator('.picture').first().getAttribute('src')).startsWith('data:image/jpeg'));
 await page.reload();assert.equal(await page.locator('.card').count(),2);
 await page.screenshot({path:'tmp/store-demo-v3/390-posted-preview.png',fullPage:true});
 // A separate browser has no submitted photo or text.
 const other=await browser.newContext();const isolated=await other.newPage();await isolated.goto(base+'#store/nakatomi');
 assert.equal(await isolated.locator('.card').count(),1);assert.ok(!(await isolated.locator('body').textContent()).includes('写真と文章の実演'));await other.close();
 await route('post');await page.locator('[data-state=soldout]').first().click();
 await route('store/nakatomi');assert.equal(await page.locator('.badge').first().textContent(),'売り切れの表示例');
 await route('post');await page.locator('[data-edit]').first().click();await page.locator('#title').fill('編集した見本');await page.locator('#save').click();
 await page.waitForSelector('#visit');assert.equal(await page.locator('.badge').first().textContent(),'売り切れの表示例');
 await route('post');await page.locator('[data-state=ended]').first().click();await route('store/nakatomi');assert.equal(await page.locator('.badge').first().textContent(),'掲載終了の表示例');
 await page.locator('#visit').evaluate(b=>{for(let i=0;i<20;i++)b.click();});await page.waitForFunction(()=>document.querySelector('#visit').textContent.includes('受付済み'));
 await page.reload();assert.equal(await page.locator('#visit').isDisabled(),true);
 await route('post');await page.locator('#photo').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('broken')});
 await page.waitForFunction(()=>document.querySelector('#form-message').textContent.includes('読み込めません'));
 await page.locator('#photo').setInputFiles({name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(2100000)});
 assert.ok((await page.locator('#form-message').textContent()).includes('2MB'));
 page.once('dialog',d=>d.accept());await page.locator('#reset').click();await page.waitForFunction(()=>document.querySelector('#app').dataset.route==='line');
 await route('store/nakatomi');await page.reload();assert.equal(await page.locator('.card').count(),1);assert.equal(await page.locator('#visit').isDisabled(),false);
 assert.equal(await page.evaluate(()=>localStorage.getItem('koho-post-experience-v3')),null);
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
 assert.equal((await page.request.get(base+'owner-preview/index.html')).status(),404);
 await page.setViewportSize({width:2500,height:843});await page.goto(base+'rich-menu.svg');await page.screenshot({path:'dist/demo/stores/rich-menu.png'});
 console.log('PASS: post photo/text -> preview, reload, separate browser isolation, reset, states, mobile widths, no network writes, two links.');
}finally{await browser.close();server.close();}
