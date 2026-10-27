import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {parseHTML} from 'linkedom';
import {mountDemo} from '../dist/demo/stores/staff-demo.js';import {initialDraft,validateDraft} from '../dist/demo/stores/staff-demo-model.js';
const read=n=>readFileSync(new URL('../dist/demo/stores/'+n,import.meta.url),'utf8');
test('photo-only demo has no samples or prefilled post and rejects posting without a photo',()=>{
 const {document}=parseHTML('<main></main>'),root=document.querySelector('main');const stop=mountDemo(root);
 assert.equal(root.querySelectorAll('input[type=radio]').length,0);assert.equal(root.querySelectorAll('img').length,0);assert.equal(root.querySelector('#demo-title').value,'');assert.equal(root.querySelector('#demo-text').value,'');
 root.querySelector('#demo-form').onsubmit({preventDefault(){}});assert.equal(root.querySelector('#demo-publish'),null);assert.match(root.querySelector('[role=alert]').textContent,/写真/);
 for(const photo of ['bread','drink','none'])assert.throws(()=>validateDraft({...initialDraft(),photo,title:'x',text:'x'}));
 assert.doesNotMatch(read('staff-demo.js')+read('staff-demo-model.js')+read('staff-demo.html')+read('demo-photo.js'),/demo-bread|demo-drink|samples|SAMPLE BAKERY|見本|写真なし/);stop();
});
test('date layout shared by real and demo keeps touch sizing and does not clip overflow',()=>{
 for(const name of ['staff.html','staff-demo.html'])assert.match(read(name),/schedule-layout\.css\?v=20261027-3/);
 const css=read('schedule-layout.css');assert.match(css,/min-inline-size:0/);assert.match(css,/-webkit-appearance:none/);assert.match(css,/::-webkit-date-and-time-value/);assert.match(css,/min-height:48px/);assert.doesNotMatch(css,/overflow\s*:|clip|text-overflow|font-size\s*:\s*(?:1[0-5]|[0-9])px/);
});
