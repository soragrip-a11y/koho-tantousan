// Optional QA dependency: npm install --no-save --package-lock=false playwright
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const server=createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep))throw Error();
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port+'/demo/stores/';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('tmp/store-demo-v2',{recursive:true});
try {
  for(const width of [320,390,430,1280]){
    await page.setViewportSize({width,height:844});
    for(const route of ['line','store/nakatomi','store/b','store/c','store/d','store/e']){
      await page.goto(base+'#'+route);await page.waitForFunction(id=>document.querySelector('#app')?.dataset.route===id,route.split('/')[1]||'line');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,width+' '+route+' overflow');
      if(route==='line'||route==='store/nakatomi')await page.screenshot({path:'tmp/store-demo-v2/'+width+'-'+route.replace('/','-')+'.png',fullPage:true});
      if(route==='store/nakatomi'&&width===390){const box=await page.locator('.deadline').first().boundingBox();assert.ok(box.y+box.height<750,'deadline in first screen');}
    }
  }
  // Six fixed targets: no intermediary list, work action is always bottom right.
  await page.goto(base+'#line');
  assert.equal(await page.locator('.six-menu a').count(),6);
  assert.equal(await page.locator('.six-menu a').last().getAttribute('href'),'../../one-off.html');
  for(const id of ['nakatomi','b','c','d','e']){
    await page.goto(base+'#line');await page.locator('a[href="#store/'+id+'"]').click();
    assert.equal(new URL(page.url()).hash,'#store/'+id);
    await page.waitForFunction(id=>document.querySelector('#app')?.dataset.route===id,id);
    assert.equal(await page.locator('.card').count(),2);
    await page.goBack();assert.equal(new URL(page.url()).hash,'#line');
  }
  await page.goto(base+'#store/nakatomi');await page.waitForSelector('#visit');
  await page.locator('#visit').evaluate(b=>{for(let i=0;i<20;i++)b.click();});
  await page.waitForFunction(()=>document.querySelector('#visit').textContent.includes('受付済み'));
  await page.reload();assert.equal(await page.locator('#visit').isDisabled(),true);
  assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('koho-visit-demo-v2'))).length),1);
  await page.goto(base+'#store/b');await page.waitForFunction(()=>document.querySelector('#app').dataset.route==='b');assert.equal(await page.locator('#visit').isDisabled(),false);
  const second=await context.newPage();await second.goto(base+'#store/b');
  await Promise.all([page.locator('#visit').evaluate(b=>b.click()),second.locator('#visit').evaluate(b=>b.click())]);
  await page.waitForFunction(()=>Object.keys(JSON.parse(localStorage.getItem('koho-visit-demo-v2'))).length===2);
  assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('koho-visit-demo-v2'))).length),2);
  await second.close();
  // Japan midnight, not device timezone; seven-day window is also covered in model tests.
  const clockContext=await browser.newContext();const clockPage=await clockContext.newPage();
  await clockPage.clock.install({time:new Date('2026-10-25T14:59:58Z')});
  await clockPage.goto(base+'#store/c');await clockPage.locator('#visit').click();
  await clockPage.waitForFunction(()=>document.querySelector('#visit').textContent.includes('受付済み'));
  await clockPage.clock.fastForward(3000);
  assert.equal(await clockPage.locator('#visit').isDisabled(),false);
  await clockPage.locator('#visit').click();
  await clockPage.waitForFunction(()=>Object.keys(JSON.parse(localStorage.getItem('koho-visit-demo-v2'))).length===2);
  assert.equal(await clockPage.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('koho-visit-demo-v2'))).length),2);
  await clockContext.close();
  // Previous local owner data must not be read, rendered, or transferred.
  await page.evaluate(()=>localStorage.setItem('koho-store-demo-v1',JSON.stringify([{title:'PRIVATE_CANARY_HISTORY',state:'hidden'}])));
  await page.goto(base+'#manage');await page.reload();
  assert.equal(await page.locator('#editor').count(),0);
  assert.ok(!(await page.locator('body').textContent()).includes('PRIVATE_CANARY_HISTORY'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('koho-store-demo-v1')),null);
  for(const target of ['owner-preview/index.html','admin.html','core.mjs']){
    assert.equal((await page.request.get(base+target)).status(),404);
  }
  await page.goto(base+'#line');assert.equal(await page.locator('.six-menu a').first().getAttribute('href'),'#store/nakatomi');
  // Corrupt storage stops the button instead of acknowledging a false save.
  await page.evaluate(()=>localStorage.setItem('koho-visit-demo-v2','{'));
  await page.goto(base+'#store/e');await page.reload();
  assert.equal(await page.locator('#visit').isDisabled(),true);
  assert.ok((await page.locator('#notice').textContent()).includes('停止'));
  assert.deepEqual(errors,[]);
  await page.setViewportSize({width:2500,height:1686});
  await page.goto(base+'rich-menu.svg');
  await page.screenshot({path:'dist/demo/stores/rich-menu.png'});
  await writeFile('tmp/store-demo-v2/results.json',JSON.stringify({passed:true,widths:[320,390,430,1280],checks:['six direct links','work bottom right','back/reload','rapid clicks','two tabs','Japan midnight','store independence','legacy owner data excluded','private endpoints absent','storage failure','no JS errors']},null,2));
  console.log('Public demo v2 browser QA passed.');
} finally {await browser.close();server.close();}
