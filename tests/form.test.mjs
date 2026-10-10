// DOM integration checks. These do not simulate native browser layout or Safari downloads.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import * as core from '../dist/contract-core.js';
import {fixture} from './fixture.mjs';

function setup(){
  const {document,window}=parseHTML(readFileSync(new URL('../dist/contract.html',import.meta.url),'utf8'));
  const proto=window.HTMLSelectElement.prototype;
  Object.defineProperty(proto,'value',{configurable:true,get(){return [...this.options].find(o=>o.hasAttribute('selected'))?.getAttribute('value') ?? this.options[0]?.getAttribute('value') ?? '';},set(v){for(const o of this.options)o.toggleAttribute('selected',o.getAttribute('value')===String(v));}});
  for(const el of document.querySelectorAll('input[type=checkbox]'))el.checked=el.hasAttribute('checked');
  const form=document.querySelector('form');form.reportValidity=()=>true;
  let captured,revoked=0,downloads=0;
  document.querySelector('#pdf-download').click=()=>downloads++;
  const context=vm.createContext({document,console,Intl,Date,URL:{createObjectURL:()=> 'blob:pdf-test',revokeObjectURL:()=>revoked++},Blob,setTimeout,clearTimeout,Uint8Array,PDFLib:{},fontkit:{},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}),AbortController,...core,generateContract:async data=>{core.validateContract(data);captured=data;return new Uint8Array([37,80,68,70]);}});
  const source=readFileSync(new URL('../dist/contract.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(source,context);
  const el=id=>document.getElementById(id);
  const change=(id,v)=>{el(id).value=String(v);el(id).dispatchEvent(new window.Event('change',{bubbles:true}));};
  return {document,window,form,el,change,captured:()=>captured,revoked:()=>revoked,downloads:()=>downloads};
}
test('page connects all labels and controls; referenced local files exist',()=>{
  const {document}=setup(),ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const label of document.querySelectorAll('label[for]'))assert.ok(document.getElementById(label.htmlFor||label.getAttribute('for')));
  for(const el of document.querySelectorAll('[src],a[href],link[href]')){
    const href=el.getAttribute('src')||el.getAttribute('href');if(/^(https?:|mailto:|#|blob:)/.test(href))continue;
    assert.ok(existsSync(new URL('../dist/'+href.split(/[?#]/)[0],import.meta.url)),href);
  }
});
test('plan changes update bundles, periods and shooting without double counting',()=>{
  const h=setup();h.change('start','2026-11-01');h.change('plan','premium');
  assert.equal(h.el('months').value,'2');assert.equal(h.el('shorts').value,'8');assert.equal(h.el('longs').value,'2');
  assert.equal(h.el('end').value,'2026-12-31');assert.equal(h.el('summary-total').textContent,'300,000円');
  h.change('includedHours','7');assert.equal(h.el('summary-total').textContent,'320,000円');
  h.change('plan','single');assert.equal(h.el('summary-total').textContent,'8,000円');
  assert.equal(h.el('includedHours').disabled,true);assert.equal(h.el('end').readOnly,false);
});
test('additional fees, payer override and full form-to-download data flow',async()=>{
  const h=setup(),d=fixture();
  for(const [key,v] of Object.entries(d))if(typeof v==='string' && h.el(key))h.el(key).value=v;
  h.change('extraLabel0','初回撮影の交通費');h.change('extraAmount0','2000');
  h.el('payerSame').checked=false;h.change('payer','支払者テスト');
  h.el('reviewed').checked=true;
  assert.equal(h.el('summary-total').textContent,'57,000円');
  h.form.dispatchEvent(new h.window.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(setImmediate);
  assert.equal(h.captured().payer,'支払者テスト');for(const [key,value] of Object.entries(core.DEFAULT_PROVIDER))assert.equal(h.captured()[key],value);assert.equal(h.captured().extras[0].label,'初回撮影の交通費');
  assert.equal(h.captured().extras[0].amount,'2000');assert.equal(h.downloads(),1);assert.equal(h.el('pdf-result').hidden,false);
  h.change('shorts',7);assert.equal(h.el('pdf-result').hidden,true);assert.equal(h.revoked(),1);assert.equal(h.el('reviewed').checked,false);
});
test('invalid values block creation and show an actionable error',async()=>{
  const h=setup();h.el('reviewed').checked=true;
  h.form.dispatchEvent(new h.window.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(setImmediate);assert.equal(h.captured(),undefined);assert.equal(h.el('contract-error').hidden,false);
});

test('confirmation is plain text and removed fields cannot interrupt completion',()=>{
  const h=setup();
  assert.equal(h.el('reviewed').closest('label').querySelector('a'),null);
  for(const id of ['channel','schedule','travelMode','parkingMode','lodgingMode','approval-fields','summary-fixed','summary-later','summary-once','provider','providerSigner','providerAddress','providerEmail'])assert.equal(h.el(id),null);
});
test('numeric editing supports replacing zero, deletion, and single-digit values',()=>{
  const h=setup();
  for(const el of h.document.querySelectorAll('[data-numeric]')){
    assert.equal(el.type,'text');assert.equal(el.getAttribute('inputmode'),'numeric');
    el.value='0';el.dispatchEvent(new h.window.Event('focusin',{bubbles:true}));assert.equal(el.value,'');
    el.value='06';el.dispatchEvent(new h.window.Event('input',{bubbles:true}));assert.equal(el.value,'6');
    el.value='';el.dispatchEvent(new h.window.Event('input',{bubbles:true}));assert.equal(el.value,'');
    el.dispatchEvent(new h.window.Event('focusout',{bubbles:true}));assert.equal(el.value,el.getAttribute('min')==='0'?'0':'');
  }
});
