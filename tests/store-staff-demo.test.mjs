import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {createDemo,initialDraft,validateDraft} from '../dist/demo/stores/staff-demo-model.js';
import {mountDemo} from '../dist/demo/stores/staff-demo.js';
const read=p=>readFileSync(new URL('../dist/demo/stores/'+p,import.meta.url),'utf8');
test('demo has isolated memory, bounded input, edit/end/reset and no imported real records',()=>{
 const a=createDemo(),b=createDemo();assert.deepEqual(a.list(),[]);const saved=a.save(initialDraft());assert.equal(b.list().length,0);
 const copy=a.list();copy[0].title='mutated';assert.notEqual(a.list()[0].title,'mutated');
 a.end(saved.id);assert.equal(a.list()[0].state,'ended');a.save({...initialDraft(),text:'Changed'},saved.id);assert.equal(a.list().length,1);assert.equal(a.list()[0].state,'active');
 for(const draft of [{...initialDraft(),title:' '},{...initialDraft(),text:'a'.repeat(181)},{...initialDraft(),photo:'https://example.invalid/private'}])assert.throws(()=>validateDraft(draft));
 for(let i=0;i<4;i++)a.save(initialDraft());assert.throws(()=>a.save(initialDraft()),/5件/);a.reset();assert.deepEqual(a.list(),[]);
});
test('demo input escapes markup; preview, save, edit, end and cancelled reset work without network',()=>{
 const originalFetch=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('network forbidden');};
 try{const {document}=parseHTML('<div id="demo"></div>'),root=document.querySelector('#demo');const stop=mountDemo(root),$=s=>root.querySelector(s);
 $('#demo-title').value='<img src=x onerror=alert(1)>';$('#demo-text').value='Synthetic text <script>bad()</script>';
 $('#demo-form').onsubmit({preventDefault(){}});assert.ok($('#demo-publish'));assert.equal(root.querySelectorAll('script').length,0);assert.match($('.demo-card h3').textContent,/<img/);
 $('#demo-publish').click();assert.match($('.demo-status').textContent,/本番には公開されません/);assert.equal(root.querySelectorAll('[data-edit]').length,1);
 $('[data-edit]').click();$('#demo-text').value='Edited';$('#demo-form').onsubmit({preventDefault(){}});$('#demo-publish').click();assert.equal(root.querySelectorAll('[data-edit]').length,1);assert.match($('.demo-body').textContent,/Edited/);
 $('[data-end]').click();assert.ok($('[data-end]').disabled);assert.match($('.demo-badge').textContent,/終了/);
 $('#demo-reset').click();$('#reset-no').click();assert.equal(root.querySelectorAll('[data-edit]').length,1);$('#demo-reset').click();$('#reset-yes').click();assert.equal(root.querySelectorAll('[data-edit]').length,0);assert.equal(calls,0);stop();
 }finally{globalThis.fetch=originalFetch;}
});
test('standalone demo denies connections/forms; only bundled assets and explicit application link',()=>{
 const html=read('staff-demo.html'),js=read('staff-demo.js')+read('staff-demo-model.js')+read('demo-photo.js')+read('schedule.js');
 assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);assert.match(html,/href="\.\/staff-register.html"/);assert.match(html,/登録不要/);
 assert.doesNotMatch(html+js,/supabase|resend|connection\.js|localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|WebSocket|fetch\(|createStoreClient|notify-staff/i);
 const imports=[...js.matchAll(/from ['"]([^'"]+)['"]/g)].map(x=>x[1]);assert.ok(imports.every(p=>/^\.\/(schedule|staff-demo-model|demo-photo)\.js\?v=20261027-2$/.test(p)));assert.match(html,/img-src 'self' data:/);assert.match(js,/capture="environment"/);
});
