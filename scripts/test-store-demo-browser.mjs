// Optional manual QA dependency: npm install --no-save --package-lock=false playwright
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep))throw Error();const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/demo/stores/`;
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('tmp/store-demo',{recursive:true});
try{
 for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:844});for(const route of ['line','shops','store','manage']){await page.goto(base+'#'+route);await page.waitForSelector('h1');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} ${route} overflow`);await page.screenshot({path:`tmp/store-demo/${width}-${route}.png`,fullPage:true});if(route==='store'&&width===390){const box=await page.locator('.deadline').first().boundingBox();assert.ok(box.y+box.height<700,'first deadline in first screen');}}}
 await page.setViewportSize({width:390,height:844});await page.goto(base+'#manage');
 await page.locator('#submit').click();assert.equal(await page.locator('.card').count(),2,'blank rejected');
 await page.locator('#title').fill('あ'.repeat(60));assert.equal((await page.locator('#title').inputValue()).length,40);
 await page.locator('#text').fill('文'.repeat(200));assert.equal((await page.locator('#text').inputValue()).length,180);
 await page.locator('#title').fill('テスト写真');await page.locator('#text').fill('<script>alert(1)</script>文字として表示');
 const png=await page.screenshot();await page.locator('#photo').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.querySelector('#preview').hidden&&!document.querySelector('#submit').disabled);
 await page.locator('#submit').click();assert.equal(await page.locator('.card').count(),3);
 await page.reload();assert.equal(await page.locator('.card').count(),3);assert.ok((await page.locator('.picture').first().getAttribute('src')).startsWith('data:image/jpeg'));
 await page.locator('[data-action=soldout]').first().click();assert.equal(await page.locator('.badge').first().textContent(),'売り切れ');assert.equal(await page.locator('.badge').nth(1).textContent(),'掲載中の見本');
 await page.locator('[data-action=edit]').first().click();await page.locator('#title').fill('編集後');await page.locator('#submit').click();assert.equal(await page.locator('.badge').first().textContent(),'売り切れ');
 await page.locator('[data-action=ended]').first().click();assert.equal(await page.locator('.badge').first().textContent(),'掲載終了');
 await page.locator('[data-action=hidden]').first().click();await page.goto(base+'#store');assert.equal(await page.locator('.card').count(),2);
 await page.goto(base+'#manage');await page.locator('[data-action=edit]').nth(1).click();await page.locator('#end').fill('2020-01-01T12:00');await page.locator('#submit').click();await page.goto(base+'#store');assert.equal(await page.locator('.badge').first().textContent(),'掲載終了');
 // Expiration changes while the page remains open.
 await page.evaluate(()=>{const k='koho-store-demo-v1',a=JSON.parse(localStorage.getItem(k));a[1].end=new Date(Date.now()+1200).toISOString();a[1].state='active';localStorage.setItem(k,JSON.stringify(a))});await page.reload();await page.waitForFunction(()=>document.querySelector('.badge')?.textContent==='掲載終了',{},{timeout:5000});
 await page.goto(base+'#line');await page.locator('.menu-main').click();await page.locator('.shop-link').click();assert.equal(new URL(page.url()).hash,'#store');await page.goBack();assert.equal(new URL(page.url()).hash,'#shops');await page.locator('.shop-link').click();await page.locator('nav a[href="#store"]').click();assert.equal(await page.locator('.card').count(),2);
 await page.goto(base+'#manage');await page.locator('#photo').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('broken')});await page.waitForFunction(()=>document.querySelector('#form-message').textContent.includes('読み込めません'));
 await page.locator('#photo').setInputFiles({name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(2100000)});assert.ok((await page.locator('#form-message').textContent()).includes('2MB'));
 page.once('dialog',d=>d.accept());await page.locator('#reset').click();assert.equal(await page.locator('.card').count(),2);await page.reload();assert.equal(await page.locator('.badge').first().textContent(),'掲載中の見本');
 assert.deepEqual(errors,[]);
 // Code-generated LINE image, exactly the standard large template size.
 await page.setViewportSize({width:2500,height:1686});await page.goto(base+'rich-menu.svg');await page.screenshot({path:'dist/demo/stores/rich-menu.png'});
 await writeFile('tmp/store-demo/results.json',JSON.stringify({passed:true,widths:[320,390,430,1280],checks:['all routes/no overflow','first viewport deadline','blank/long fields','photo persist/reload','broken/oversize photo','independent soldout/end/hide','edit preserves state','live expiry','repeat click/back','reset/reload','no browser exceptions']},null,2));
 console.log('Store demo browser QA passed; screenshots and results in tmp/store-demo.');
}finally{await browser.close();server.close();}
