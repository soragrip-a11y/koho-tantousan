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
 for(const id of ['shorts','longs','shoot4','shoot7','months','start','end']){
  const hint=document.querySelector('#'+id).getAttribute('aria-describedby');assert.ok(hint,id);assert.ok(document.getElementById(hint),hint);
 }
});
test('homepage section numbers remain sequential',()=>{
 const {document}=parseHTML(read('index.html'));
 assert.deepEqual([...document.querySelectorAll('main .section .eyebrow')].map(x=>x.textContent).filter(x=>/^\d{2} \/ (SERVICE|WORKS|PLAN|FLOW|FAQ)$/.test(x)),['01 / SERVICE','02 / WORKS','03 / PLAN','04 / FLOW','05 / FAQ']);
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
