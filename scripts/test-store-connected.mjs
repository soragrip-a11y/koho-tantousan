import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await (process.env.TEST_BROWSER==='webkit'?webkit.launch():chromium.launch({channel:'msedge'}));
const base='http://127.0.0.1:'+server.address().port+'/demo/stores/';
const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const token=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:'11111111-1111-4111-8111-111111111111',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.mock';
try{for(const width of [320,390,430,1280]){
 const context=await browser.newContext({viewport:{width,height:844},hasTouch:width<650,isMobile:width<650});
 const page=await context.newPage(),customer=await context.newPage(),rows=[],images=new Map(),jobs=new Map(),errors=[];let saves=0,fail=false,deleteFail=true,accept=true,fixturePublic=false,fixtureJpeg,publicFail=false,publicRequests=0;
 for(const p of [page,customer])p.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>localStorage.setItem('koho-post-experience-v3',JSON.stringify([{id:'private-legacy',image:'data:image/jpeg;base64,YQ==',text:'DO NOT MIGRATE'}])));
 await context.route('https://rnedesemnameergeksuo.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),p=req.headers()['content-type']?.includes('application/json')?(req.postDataJSON()??{}):{};
  const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname==='/auth/v1/token')return reply({access_token:token,refresh_token:'mock-refresh',expires_in:3600,token_type:'bearer',user:{id:'11111111-1111-4111-8111-111111111111',email:'dummy@example.invalid',aud:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}});
  if(url.pathname==='/auth/v1/logout')return reply({});
  if(url.pathname.includes('/storage/v1/object/')){
   if(req.method()==='DELETE'){if(deleteFail){deleteFail=false;return reply({error:'mock deletion failure'},403);}for(const name of p.prefixes)images.delete(name);return reply([]);}
   const key=url.pathname.split('koho-notice-images/')[1];
   if(req.method()==='POST'){images.set(key,fixtureJpeg);return reply({Key:key});}
   return route.fulfill({status:200,contentType:'image/jpeg',body:images.get(key)});
  }
  const name=url.pathname.split('/').at(-1);
  // Only a mocked response changes visibility; no real backend publication setting is changed.
  if(name==='koho_list_notices'){publicRequests++;await new Promise(r=>setTimeout(r,200));return reply(publicFail?{code:'mock read failure'}:fixturePublic?rows:[],publicFail?503:200);}
  if(!req.headers().authorization?.includes(token))return reply({code:'42501'},401);
  if(name==='koho_can_manage')return reply(true);
  if(name==='koho_list_staff_notices')return reply(rows);
  if(name==='koho_prepare_delete'){
   if(!jobs.has(p.p_id)){jobs.set(p.p_id,{id:p.p_id,done:false,paths:[...images.keys()],retained_count:0});const row=rows.find(r=>r.id===p.p_id);row.state='deleting';row.image_path=null;}
   return reply(jobs.get(p.p_id));
  }
  if(name==='koho_finish_delete'){
   if(images.size)return reply({code:'photos remain'},400);
   const job=jobs.get(p.p_id);if(!job.done){rows.splice(rows.findIndex(r=>r.id===p.p_id),1);job.done=true;}return reply(job);
  }
  if(name==='koho_change_notice'){
   await new Promise(r=>setTimeout(r,120));if(fail)return reply({code:'network'},503);
   let row=rows.find(r=>r.id===p.p_id);if(row?.request===p.p_request_id)return reply(row);
   if(!row){row={id:p.p_id,store_id:'nakatomi',version:0};rows.push(row);}
   Object.assign(row,p.p_action==='publish'?{title:p.p_title,body:p.p_body,image_path:p.p_image_path,state:'active',expires_at:new Date(Date.now()+86400000).toISOString()}:{state:p.p_action==='end'?'soldout':'withdrawn'});row.version++;row.request=p.p_request_id;saves++;return reply(row);
  }
  return reply({code:'unexpected'},404);
 });
 page.on('dialog',d=>accept?d.accept():d.dismiss());
 await page.goto(base+'staff.html');await page.waitForSelector('input[name=email]');
 assert.ok(await page.locator('form button').evaluate(b=>b.getBoundingClientRect().height>=80));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(width===390){await mkdir('tmp/connected',{recursive:true});await page.screenshot({path:'tmp/connected/login.png',fullPage:true});}
 await page.locator('input[name=email]').fill('dummy@example.invalid');await page.locator('input[name=password]').fill('dummy');await page.locator('form button').click();await page.waitForSelector('#new');assert.equal(images.size,0);assert.equal(await page.locator('#new').textContent(),'新規投稿');assert.equal(await page.locator('#reload').count(),0);
 await page.locator('#new').click();const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=32;c.getContext('2d').fillRect(0,0,32,32);return {png:c.toDataURL('image/png').split(',')[1],jpeg:c.toDataURL('image/jpeg').split(',')[1]};});
 fixtureJpeg=Buffer.from(fixture.jpeg,'base64');
 await page.locator('#library').setInputFiles({name:'dummy.png',mimeType:'image/png',buffer:Buffer.from(fixture.png,'base64')});await page.waitForSelector('.easy-photo');await page.locator('#next').click();await page.locator('#words').fill('架空のテスト投稿');await page.locator('#next').click();
 assert.ok(await page.locator('.easy-review').evaluate(e=>e.firstElementChild.tagName==='IMG'));
 fail=true;await page.locator('#publish').click();await page.waitForFunction(()=>!document.querySelector('#publish').disabled);assert.equal(saves,0);
 fail=false;await page.locator('#publish').click();await page.waitForSelector('[data-edit]');assert.equal(saves,1);assert.equal(images.size,1);assert.ok(await page.locator('#logout').evaluate(b=>b.getBoundingClientRect().height>=68 && !!(document.querySelector('article').compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390)await page.screenshot({path:'tmp/connected/staff-actions-v16.png',fullPage:true});
 fixturePublic=true;await customer.goto(base);await customer.waitForSelector('.card .picture');
 for(const p of [page,customer])assert.ok(await p.locator('.card').evaluate(c=>c.firstElementChild.classList.contains('notice-media')&&c.querySelector('.picture').getBoundingClientRect().bottom<=c.querySelector('.card-body').getBoundingClientRect().top+1));
 if(width===390)await customer.screenshot({path:'tmp/connected/photo-first.png',fullPage:true});
 await customer.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 assert.ok(await customer.locator('#refresh').evaluate(b=>{const r=b.getBoundingClientRect();return r.height>=48&&r.height<65&&r.width<150&&r.top>document.querySelector('.visit-panel').getBoundingClientRect().bottom&&b.closest('footer');}));
 assert.ok(await customer.locator('.card').evaluate(c=>c.getBoundingClientRect().top<220));
 const beforeRefresh=publicRequests;rows[0].body='更新されたお知らせ';
 await customer.locator('#refresh').evaluate(b=>{b.click();b.click();b.click();});
 await customer.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 assert.equal(publicRequests,beforeRefresh+1);assert.ok((await customer.locator('.card').textContent()).includes('更新されたお知らせ'));
 publicFail=true;await customer.locator('#refresh').click();await customer.waitForFunction(()=>!document.querySelector('#refresh').disabled);
 assert.equal(await customer.locator('.card').count(),0);assert.ok((await customer.locator('.refresh-status').textContent()).includes('更新できません'));
 publicFail=false;await customer.locator('#refresh').click();await customer.waitForSelector('.card');assert.ok((await customer.locator('.refresh-status').textContent()).includes('確認時刻'));
 assert.equal(await customer.locator('#refresh').count(),1);assert.ok(await customer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('[data-edit]').click();await page.locator('#soldout').click();await page.waitForSelector('.soldout-cover');await customer.reload();await customer.waitForSelector('.soldout-cover');assert.equal(await customer.locator('.card .picture').count(),1);
 await page.locator('[data-edit]').click();await page.locator('#rewrite').click();await page.locator('#remove-photo').click();await page.locator('#words').fill('編集した本文');await page.locator('#publish').click();await page.waitForSelector('[data-edit]');assert.equal(rows.length,1);assert.equal(rows[0].image_path,null);
 await customer.reload();await customer.waitForSelector('.card');for(const p of [page,customer]){assert.equal(await p.locator('.card .notice-media').count(),0);assert.ok(await p.locator('.card').evaluate(c=>c.firstElementChild.classList.contains('card-body')));}
 await page.locator('[data-edit]').click();await page.locator('#soldout').click();await page.waitForSelector('.soldout-cover');
 await customer.reload();await customer.waitForSelector('.soldout-cover');for(const p of [page,customer]){assert.equal(await p.locator('.card img').count(),0);assert.ok(await p.locator('.notice-media.no-photo').evaluate(e=>e.getBoundingClientRect().height<130));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 if(width===390)await customer.screenshot({path:'tmp/connected/no-photo-ended.png',fullPage:true});
 fixturePublic=false;
 await customer.goto(base+'#post');await customer.waitForSelector('.empty');await customer.waitForFunction(()=>!document.querySelector('#refresh').disabled);await customer.waitForSelector('#visit');assert.equal(await customer.locator('form,input,textarea,a,[data-edit]').count(),0);assert.equal(await customer.locator('.card').count(),0);
 await page.locator('[data-edit]').click();assert.equal(await page.locator('#withdraw').textContent(),'削除する');accept=false;await page.locator('#withdraw').click();assert.equal(jobs.size,0);
 accept=true;await page.locator('#withdraw').click();await page.waitForSelector('#new');assert.equal(rows[0].state,'deleting');assert.match(await page.locator('[role=alert]').textContent(),/削除が完了していません/);
 await page.locator('[data-edit]').click();assert.equal(await page.locator('#rewrite,#soldout').count(),0);await page.locator('#withdraw').click();await page.waitForSelector('#new');assert.equal(rows.length,0);assert.equal(images.size,0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.reload();await page.waitForSelector('input[name=password]');assert.equal(await page.locator('[data-edit]').count(),0);assert.equal(await page.locator('input[name=password]').inputValue(),'');
 assert.deepEqual(errors,[]);console.log(width+'px: photo-first staff/customer/confirmation, no-photo compact end, edit/delete regression and anonymous separation PASS');await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}

