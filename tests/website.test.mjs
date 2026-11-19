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
test('homepage identifies the maker, shows both faces and offers consultation routes',()=>{
 const {document}=parseHTML(read('index.html'));
 assert.match(document.body.textContent,/須永空和/);
 assert.match(document.querySelector('#world-a h1').textContent,/広報担当さん/);
 assert.match(document.querySelector('#world-b h1').textContent,/AI千葉PR大使/);
 assert.deepEqual([...document.querySelectorAll('.switch [data-go]')].map(b=>b.getAttribute('data-go')),['a','b']);
 const hrefs=[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'));
 for(const h of ['works.html','blog.html','privacy.html','mailto:sora.grip@gmail.com','https://line.me/R/ti/p/%40699bksee'])assert.ok(hrefs.includes(h),h);
 assert.ok(document.querySelectorAll('[data-consult]').length>=4);
 assert.doesNotMatch(document.body.textContent,/公認されました|任命されました|県内一|最強|No\.?1/);
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

test('general audience leads on the homepage, and the political guide stays reachable from the site',()=>{
 const {document}=parseHTML(read('index.html'));
 const a=document.querySelector('#world-a'),b=document.querySelector('#world-b');
 assert.ok(a.compareDocumentPosition(b)&4,'広報担当さんの面が先');
 assert.match(a.querySelector('.k-hero').textContent,/お店/);
 assert.ok(existsSync(new URL('../dist/political-guide.html',import.meta.url)));
 const others=readdirSync(new URL('../dist/',import.meta.url)).filter(x=>x.endsWith('.html')&&x!=='index.html'&&x!=='political-guide.html');
 assert.ok(others.some(f=>read(f).includes('href="political-guide.html')),'political-guide.html への導線');
 for(const file of readdirSync(new URL('../dist/',import.meta.url)).filter(x=>x.endsWith('.html'))){const {document:page}=parseHTML(read(file));if(page.querySelector('footer'))assert.doesNotMatch(page.querySelector('footer').textContent,/地方議員向け/);}
});
test('official LINE destination stays verified and contact wording has a reply window',()=>{
 for(const file of ['index.html','contact.html','pricing.html']){
  const {document}=parseHTML(read(file));
  const links=[...document.querySelectorAll('a[href*="line.me"]')];assert.ok(links.length,file);
  for(const a of links)assert.equal(a.getAttribute('href'),'https://line.me/R/ti/p/%40699bksee');
  if(file==='index.html')continue; // 新トップは相談メモ（送信なし）から公式LINE・contact.htmlへ案内する。返信目安の文言は contact / pricing で保持
  const band=document.querySelector('.contact-band,.home-contact');
  assert.match(band.textContent,/順次、原則2営業日以内/);
 }
});
test('genuine works stay on the works page, and the homepage shows only confirmed prices',()=>{
 const works=read('works.html');
 for(const id of ['lGHOQvbA8BQ','YCXll8IjTB8'])assert.match(works,new RegExp('href="https://(?:youtu\\.be/|www\\.youtube\\.com/watch\\?v=)'+id+'"'),id);
 const {document}=parseHTML(read('index.html'));
 assert.ok(document.querySelector('#world-a a[href="works.html"]'));
 const plans=document.querySelector('#koho-plans').textContent;
 for(const t of ['55,000円','88,000円','132,000円','165,000円','税込','月4本','月8本','月12本','半日撮影','ロング動画','17,000円','交通費は別途'])assert.ok(plans.includes(t),t);
 assert.equal(document.querySelectorAll('#koho-plans .k-plan-list li').length,4);
 assert.ok(document.querySelector('#koho-plans [data-consult="a"]'));
 assert.doesNotMatch(plans,/制作枠|繰越|最低2か月|翌々月末|毎月、ショート1本または撮影1回が無料/);
 for(const old of ['pricing.html','one-off.html','contract.html','terms.html','contact.html'])assert.equal(document.querySelector(`a[href^="${old}"]`),null,old);
 const ai=document.querySelector('#world-b').textContent;
 assert.doesNotMatch(ai,/55,000|88,000|132,000|165,000|月額パック|10,000|先着/);
 assert.match(document.querySelector('#ai-price').textContent,/33,000/);
 assert.doesNotMatch(document.body.textContent,/月額スタンダード|80,000|120,000/);
});
test('homepage keeps legacy anchors and labels placeholder media honestly',()=>{
 const {document}=parseHTML(read('index.html'));
 assert.ok(document.getElementById('service'),'index.html#service（名刺・下層ページからのリンク先）');
 assert.equal(document.querySelector('meta[name="robots"][content*="noindex"]'),null);
 const badges=[...document.querySelectorAll('#world-b .fbadge,#world-b .badge,#world-b .tagf')];assert.ok(badges.length>=4);
 for(const b of badges)assert.match(b.textContent,/演出案|演出デモ|素材/);
 for(const c of document.querySelectorAll('#world-a .k-frame .k-cap'))assert.match(c.textContent,/素材待ち/);
 const offer=document.querySelector('#koho-top .k-subscription');assert.ok(offer);
 assert.equal(document.querySelector('#koho-top [data-media="kohoHero"]'),null);
 assert.match(offer.textContent,/月33,000円/);assert.match(offer.textContent,/1か月で卒業OK/);
 assert.equal(offer.querySelector('button').getAttribute('data-consult'),'a');
 assert.equal(document.querySelectorAll('video[autoplay]:not([muted]),audio[autoplay]').length,0);
});
test('published prices and new document guidance agree',()=>{
 const {document}=parseHTML(read('pricing.html'));
 const heads=[...document.querySelectorAll('.k-plan-list li')].map(x=>x.textContent);
 assert.equal(heads.length,4);
 for(const [i,p]of [[0,'55,000円'],[1,'88,000円'],[2,'132,000円'],[3,'165,000円']])assert.ok(heads[i].includes(p));
 for(const term of ['翌々月末','3,300円','前月末','月6本'])assert.ok(document.body.textContent.includes(term));
 assert.doesNotMatch(document.querySelector('.k-plan-list').textContent,/80,000|120,000/);
});

test('homepage has no autoplay or campaign video with an unconfirmed participant limit',()=>{const {document}=parseHTML(read('index.html'));assert.equal(document.querySelectorAll('iframe').length,0);assert.doesNotMatch(document.body.textContent,/20人限定/);});
test('active pages and FAQ do not advertise retired video tariffs',()=>{
 for(const file of readdirSync(new URL('../dist/',import.meta.url)).filter(x=>x.endsWith('.html')&&!x.startsWith('google'))){
 const {document}=parseHTML(read(file));const text=document.body.textContent;
 if(file==='expenses-guide.html'){assert.match(text,/旧料金による架空の履歴例/);continue;}
 assert.doesNotMatch(text,/月額スタンダード|ショート動画 月6本|以後30秒ごとに5,000円|ロング標準編集は10分以内30,000円/,file);
 }
 // 旧トップのFAQにあった条件は、新トップでは料金ページを正本として保持する
 const {document}=parseHTML(read('pricing.html'));const pricing=document.body.textContent;
 for(const term of ['27,500円','翌々月末','3,300円','2,750円','20円','最低2か月','前月末','媒体ごとに1投稿'])assert.ok(pricing.includes(term),term);
});

test('pricing display is monthly-only while legacy anchors survive',()=>{const {document}=parseHTML(read('pricing.html'));assert.doesNotMatch(document.querySelector('main').textContent,/ちょこっと|アニメーションCM|初回お試し/);for(const id of ['monthly','sns-ad-cm','business-help'])assert.ok(document.getElementById(id));});

test('contact keeps inquiry functionality without retired one-off promotions',()=>{
 const {document}=parseHTML(read('contact.html'));
 assert.ok(document.querySelector('#contact-form'));
 assert.ok(document.querySelector('#client-line'));
 assert.equal(document.querySelector('a[href^="contract.html"]'),null);
 assert.doesNotMatch(document.body.textContent,/ONE-OFF SUPPORT|初回お試し|Web・SNSの小修正/);
});
test('retained pages common navigation leads to current plans instead of retired terms',()=>{
 for(const file of readdirSync(new URL('../dist/',import.meta.url)).filter(f=>f.endsWith('.html'))){
  const {document}=parseHTML(read(file));
  for(const a of document.querySelectorAll('nav a,footer a'))assert.doesNotMatch(a.getAttribute('href')||'',/^(?:\.\/)?(?:pricing|terms|contract|one-off)\.html/,file);
 }
});
