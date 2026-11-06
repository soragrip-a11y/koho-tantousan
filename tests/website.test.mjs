import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const read=file=>readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
function setupContact(){
 const {document,window}=parseHTML(read('contact.html'));
 const form=document.querySelector('#contact-form');let valid=true,copied='';
 form.reportValidity=()=>valid;
 const location={href:''};
 class FormData {get(key){return document.querySelector(`[name="${key}"]`).value||'';}}
 vm.runInNewContext(read('script.js'),{document,location,FormData,navigator:{clipboard:{writeText:async text=>{copied=text;}}}});
 return {document,window,form,location,copied:()=>copied,invalid:()=>{valid=false;}};
}
test('inquiry controls are disabled until the local-only script is ready',()=>{
 const {document}=parseHTML(read('contact.html'));
 const fields=document.querySelector('#contact-fields');assert.ok(fields.hasAttribute('disabled'));
 for(const el of document.querySelectorAll('#contact-form input,#contact-form select,#contact-form textarea,#contact-form button'))assert.equal(el.closest('fieldset'),fields);
 assert.match(document.querySelector('noscript').textContent,/JavaScript/);
 assert.equal(setupContact().document.querySelector('#contact-fields').disabled,false);
});
test('inquiry submission prevents network form navigation and prepares encoded mail only',()=>{
 const h=setupContact();h.document.querySelector('#name').value='検証 & テスト';h.document.querySelector('#message').value='送信しない動作検証\n改行';
 const event=new h.window.Event('submit',{bubbles:true,cancelable:true});h.form.dispatchEvent(event);
 assert.equal(event.defaultPrevented,true);assert.match(h.location.href,/^mailto:/);
 const query=new URLSearchParams(h.location.href.split('?')[1]);assert.match(query.get('body'),/検証 & テスト/);assert.match(query.get('body'),/送信しない動作検証\n改行/);
});
test('invalid inquiry does not open mail or copy contents',async()=>{
 const h=setupContact();h.invalid();h.form.dispatchEvent(new h.window.Event('submit',{bubbles:true,cancelable:true}));
 h.document.querySelector('#copy-inquiry').click();await new Promise(setImmediate);
 assert.equal(h.location.href,'');assert.equal(h.copied(),'');
});
test('copy inquiry keeps the page in place and includes the prepared content',async()=>{
 const h=setupContact();h.document.querySelector('#name').value='検証用';h.document.querySelector('#message').value='送信しません';
 h.document.querySelector('#copy-inquiry').click();await new Promise(setImmediate);
 assert.match(h.copied(),/送信しません/);assert.equal(h.location.href,'');assert.match(h.document.querySelector('#form-status').textContent,/コピーしました/);
});
test('contact navigation identifies its current page',()=>{
 const {document}=parseHTML(read('contact.html'));
 assert.match(document.querySelector('#navigation [aria-current="page"]').getAttribute('href'),/^contact\.html/);
});
test('contract fields expose their quantity, shooting, and period explanations',()=>{
 const {document}=parseHTML(read('contract.html'));
 for(const id of ['shorts','longs','shootHalf','months','start','end']){
  const hint=document.querySelector('#'+id).getAttribute('aria-describedby');assert.ok(hint,id);assert.ok(document.getElementById(hint),hint);
 }
});
test('homepage identifies the maker and offers direct work and consultation routes',()=>{
 const {document}=parseHTML(read('index.html'));
 assert.match(document.querySelector('h1').textContent,/須永空和.*広報担当さん/);
 const links=[...document.querySelectorAll('.home-actions a')].map(a=>a.getAttribute('href'));
 assert.deepEqual(links,['works.html','https://line.me/R/ti/p/%40699bksee']);
 assert.match(document.querySelector('.intro-value').textContent,/何をどう発信するかの相談/);
});
test('all local website links, assets and fragment targets exist',()=>{
 for(const file of readdirSync(new URL('../dist/',import.meta.url)).filter(x=>x.endsWith('.html'))){
  const {document}=parseHTML(read(file));const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);assert.equal(new Set(ids).size,ids.length,file);
  for(const el of document.querySelectorAll('[href],[src]')){const href=el.getAttribute('href')||el.getAttribute('src');if(!href||/^(https?:|mailto:|tel:|data:|blob:)/.test(href))continue;
   const target=new URL(href,'https://local-koho.com/'+file);const path=target.pathname.slice(1)||'index.html';assert.ok(existsSync(new URL('../dist/'+path,import.meta.url)),`${file}: ${href}`);
   if(target.hash&&path.endsWith('.html')){const other=parseHTML(read(path)).document;assert.ok(other.getElementById(decodeURIComponent(target.hash.slice(1))),`${file}: ${href}`);}
  }
 }
});

test('general audience leads, with political experience retained as a secondary specialty',()=>{
 const {document}=parseHTML(read('index.html'));
 assert.match(document.querySelector('.intro-copy').textContent,/お店や人/);
 assert.match(document.querySelector('.about-short').textContent,/県議会議員/);
 assert.ok(document.querySelector('a[href="political-guide.html"]'));
 for(const file of readdirSync(new URL('../dist/',import.meta.url)).filter(x=>x.endsWith('.html'))){const {document:page}=parseHTML(read(file));if(page.querySelector('footer'))assert.doesNotMatch(page.querySelector('footer').textContent,/地方議員向け/);}
});
test('official LINE destination stays verified and contact wording has a reply window',()=>{
 for(const file of ['index.html','contact.html','pricing.html']){
  const {document}=parseHTML(read(file));const band=document.querySelector('.contact-band,.home-contact');
  assert.match(band.textContent,/順次、原則2営業日以内/);
  const links=[...document.querySelectorAll('a[href*="line.me"]')];assert.ok(links.length);
  for(const a of links)assert.equal(a.getAttribute('href'),'https://line.me/R/ti/p/%40699bksee');
 }
});
test('homepage retains genuine works and sends purpose cards directly to useful detail',()=>{
 const {document}=parseHTML(read('index.html'));
 assert.deepEqual([...document.querySelectorAll('a[href]')].map(x=>x.getAttribute('href')).filter(x=>/youtube\.com|youtu\.be/.test(x)),['https://youtu.be/lGHOQvbA8BQ','https://www.youtube.com/watch?v=YCXll8IjTB8']);
 for(const id of ['photo-video','sns','web-line'])assert.ok(document.querySelector('#'+id+' .card-links a'));
 assert.doesNotMatch(document.querySelector('#price').textContent,/月6本|30,000/);assert.match(document.querySelector('#price').textContent,/初回お試し/);assert.match(document.querySelector('#price').textContent,/15,000/);
 assert.match(document.querySelector('#price').textContent,/30秒以内/);
});
test('published prices and new document guidance agree',()=>{
 const {document}=parseHTML(read('pricing.html'));
 const heads=[...document.querySelectorAll('.mini-price-table thead th')].map(x=>x.textContent);
 assert.equal(heads.length,5);
 for(const [i,p]of [[1,'55,000円'],[2,'88,000円'],[3,'132,000円'],[4,'165,000円']])assert.ok(heads[i].includes(p));
 for(const term of ['翌々月末','3,300円','前月末','月6本','33,000円'])assert.ok(document.body.textContent.includes(term));
 assert.doesNotMatch(document.querySelector('.mini-price-table').textContent,/80,000|120,000/);
});

test('homepage has no autoplay or campaign video with an unconfirmed participant limit',()=>{const {document}=parseHTML(read('index.html'));assert.equal(document.querySelectorAll('iframe').length,0);assert.doesNotMatch(document.body.textContent,/20人限定/);});
test('active pages and FAQ do not advertise retired video tariffs',()=>{
 for(const file of readdirSync(new URL('../dist/',import.meta.url)).filter(x=>x.endsWith('.html')&&!x.startsWith('google'))){
 const {document}=parseHTML(read(file));const text=document.body.textContent;
 if(file==='expenses-guide.html'){assert.match(text,/旧料金による架空の履歴例/);continue;}
 assert.doesNotMatch(text,/月額スタンダード|ショート動画 月6本|以後30秒ごとに5,000円|ロング標準編集は10分以内30,000円/,file);
 }
 const {document}=parseHTML(read('index.html'));const faq=[...document.querySelectorAll('details')].map(x=>x.textContent).join(' ');
 for(const term of ['初回お試し','15,000円','27,500円','翌々月末','3,300円','2,750円','20円','最低2か月','前月末','媒体ごとに1投稿'])assert.ok(faq.includes(term),term);
});
