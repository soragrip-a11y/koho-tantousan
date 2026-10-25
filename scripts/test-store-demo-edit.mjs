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
async function posts(){return staff.evaluate(()=>JSON.parse(localStorage.getItem('koho-post-experience-v3')));}
async function actions(){await staff.locator('[data-edit-post]').first().tap();await staff.waitForSelector('#rewrite');}
async function edit(){await actions();await staff.locator('#rewrite').tap();await staff.waitForSelector('#words');assert.ok(staff.url().includes('#edit/'));}
async function repost(){staff.once('dialog',d=>d.accept());await staff.locator('#publish').tap();await staff.waitForSelector('.staff-preview-note');}
try{
 await customer.goto(base);await readonly();
 await staffRoute();await staff.locator('#next').tap();await staff.locator('#words').fill('編集前のサンプル本文');await staff.locator('#next').tap();await staff.locator('#publish').tap();await staff.waitForSelector('.staff-preview-note');
 const id=(await posts())[0].id,count=(await posts()).length;
 await actions();staff.once('dialog',d=>d.accept());await staff.locator('#soldout').tap();await staff.waitForSelector('.staff-preview-note');
 await customer.waitForSelector('.soldout-cover');assert.equal(await customer.locator('.soldout-cover').count(),1);assert.equal(await staff.locator('.soldout-cover').count(),1);
 assert.equal(await customer.locator('.card').last().locator('.soldout-cover').count(),0);
 assert.equal(await customer.locator('.soldout-cover').getAttribute('aria-label'),'売り切れのため終了');
 assert.equal(await customer.locator('.soldout-cover strong').textContent(),'終了しました');assert.equal(await staff.locator('.soldout-cover strong').textContent(),'終了しました');assert.equal(await customer.locator('.soldout-cross').count(),0);
 for(const width of [320,390,430]){await customer.setViewportSize({width,height:844});assert.ok(await customer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await customer.screenshot({path:'tmp/store-demo-separated/soldout-no-photo-'+width+'.png',fullPage:true});}
 await customer.setViewportSize({width:390,height:844});await customer.screenshot({path:'tmp/store-demo-separated/soldout-no-photo.png',fullPage:true});
 await edit();assert.equal(await staff.locator('#words').inputValue(),'編集前のサンプル本文');assert.ok(await staff.locator('#remove-photo').isDisabled());
 await staff.locator('#words').fill('キャンセルされる本文');staff.once('dialog',d=>d.dismiss());await staff.locator('#cancel').tap();assert.equal(await staff.locator('#words').inputValue(),'キャンセルされる本文');
 staff.once('dialog',d=>d.accept());await staff.locator('#cancel').tap();await staff.waitForSelector('.staff-preview-note');assert.equal((await posts())[0].text,'編集前のサンプル本文');
 await edit();await staff.locator('#words').fill('');await staff.locator('#publish').tap();assert.ok((await staff.locator('#easy-error').textContent()).includes('文章'));await staff.locator('#words').fill('文'.repeat(200));assert.equal((await staff.locator('#words').inputValue()).length,180);await staff.locator('#words').fill('書き直したサンプル本文');
 staff.once('dialog',d=>{assert.ok(d.message().includes('掲載中に戻しますか'));return d.dismiss();});await staff.locator('#publish').tap();assert.equal((await posts())[0].state,'soldout');
 await staff.clock.setFixedTime(new Date('2026-10-25T15:00:01Z'));
 staff.once('dialog',d=>d.accept());await staff.locator('#publish').evaluate(button=>{for(let i=0;i<10;i++)button.click();});await staff.waitForSelector('.staff-preview-note');
 assert.equal((await posts()).length,count);assert.equal((await posts())[0].id,id);assert.equal((await posts())[0].end,'2026-10-26T15:00:01.000Z');
 await customer.waitForFunction(()=>document.querySelector('.card')?.textContent.includes('書き直したサンプル本文'));assert.equal(await customer.locator('.soldout-cover').count(),0);
 await edit();await staff.locator('#words').fill('写真を変更したサンプル本文');
 await staff.locator('#library').setInputFiles({name:'demo.png',mimeType:'image/png',buffer:await customer.screenshot()});await staff.waitForSelector('.easy-photo');
 assert.equal(await staff.locator('#words').inputValue(),'写真を変更したサンプル本文');
 for(const width of [320,390,430]){await staff.setViewportSize({width,height:844});await controlAppearance(staff);await staff.screenshot({path:'tmp/store-demo-separated/editor-'+width+'.png',fullPage:true});}
 await repost();assert.ok((await posts())[0].image.startsWith('data:image/jpeg'));
 await customer.waitForFunction(()=>document.querySelector('.picture')?.getAttribute('src').startsWith('data:image/jpeg'));
 await actions();staff.once('dialog',d=>d.accept());await staff.locator('#soldout').tap();await staff.waitForSelector('.staff-preview-note');await customer.waitForSelector('.soldout-cover');
 for(const width of [320,390,430]){await customer.setViewportSize({width,height:844});assert.ok(await customer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await customer.screenshot({path:'tmp/store-demo-separated/soldout-photo-'+width+'.png',fullPage:true});}
 await customer.reload();await customer.waitForSelector('.soldout-cover');
 await edit();await staff.reload();await staff.waitForSelector('#words');assert.ok(await staff.locator('.easy-photo').isVisible());
 await staff.locator('#remove-photo').tap();assert.equal(await staff.locator('.easy-photo').count(),0);await staff.locator('#words').fill('写真を消したサンプル本文');await repost();
 assert.equal((await posts())[0].image,'');assert.equal((await posts()).length,count);
 await actions();staff.once('dialog',d=>d.accept());await staff.locator('#withdraw').tap();await staff.waitForSelector('.staff-preview-note');
 await staff.goto(base+'staff.html#edit/'+encodeURIComponent(id));await staff.waitForSelector('#words');assert.equal(await staff.locator('#words').inputValue(),'写真を消したサンプル本文');await repost();assert.equal((await posts())[0].state,'active');assert.equal((await posts()).length,count);
 await edit();await staff.locator('#words').fill('戻るで捨てる本文');await staff.goBack();await staff.waitForSelector('#rewrite');assert.equal((await posts())[0].text,'写真を消したサンプル本文');
 await staff.goto(base+'staff.html#edit/missing');await staff.waitForSelector('h1');assert.equal(await staff.locator('#publish').count(),0);
 await staff.evaluate(()=>{const key='koho-post-experience-v3',saved=JSON.parse(localStorage.getItem(key));saved[0].end='2020-01-01T00:00:00.000Z';localStorage.setItem(key,JSON.stringify(saved));});
 await customer.waitForFunction(()=>document.querySelector('.badge')?.textContent==='掲載終了の表示例');assert.equal(await customer.locator('.soldout-cover').count(),0);assert.equal(await customer.locator('.card').count(),count);await readonly();
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 console.log('EDIT PASS: same ID, no duplicates, photo replace/remove, text, cancel/back/reload, soldout overlays per post, withdrawn reactivation, 24h/date boundary, mobile and separate-tab reflection');
}finally{await browser.close();server.close();}
