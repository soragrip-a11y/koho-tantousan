import test from 'node:test';
import assert from 'node:assert/strict';
import {AD_CM,adCmPrice} from '../dist/ad-cm-pricing.js';
import {documentPrice,documentContent,validateDocument,inquiryText} from '../dist/one-off-core.js';
import {oneFixture} from './one-off-fixture.mjs';
import {readFileSync} from 'node:fs';
test('ad CM has its own scope and quote floor without applying short-edit increments',()=>{
 for(const seconds of [1,15,30])assert.equal(adCmPrice(seconds),33000);
 for(const seconds of [0,-1,31,60,1.5,'',NaN])assert.throws(()=>adCmPrice(seconds));
 const d=oneFixture({service:'adcm',adCmVersion:'20261106',seconds:'30',amount:'33000',revisions:'2',scope:AD_CM.scope,exclusions:AD_CM.exclusions});
 assert.equal(documentPrice(d),33000);
 const text=JSON.stringify(documentContent(d));
 for(const term of ['アニメーションCM','33,000円','契約時に相談','広告出稿・広告運用'])assert.ok(text.includes(term));
 assert.ok(!text.includes('旧料金データ'));
 assert.throws(()=>validateDocument({...d,amount:'5000'}));
 assert.equal(documentPrice(oneFixture()),3000);
 assert.match(inquiryText({...d,description:'広告CMの相談',name:'見本',reply:'sample@example.com',privacy:true,inquiryOnly:true}),/アニメーションCM/);
});
test('public menu and document source agree on new price and exclusions',()=>{
 for(const name of ['pricing.html','one-off.html']){
  const html=readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
  assert.ok(html.includes('30秒以内 33,000円（税込）〜'));
  assert.ok(html.includes(AD_CM.exclusions));
 }
});
