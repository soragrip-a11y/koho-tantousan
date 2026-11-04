import test from 'node:test';
import assert from 'node:assert/strict';
import {AD_CM,adCmPrice} from '../dist/ad-cm-pricing.js';
import {documentPrice,documentContent,validateDocument,inquiryText} from '../dist/one-off-core.js';
import {oneFixture} from './one-off-fixture.mjs';
import {readFileSync} from 'node:fs';
test('ad CM has its own scope and quote floor without applying short-edit increments',()=>{
 for(const seconds of [1,15,30])assert.equal(adCmPrice(seconds),55000);
 for(const seconds of [0,-1,31,60,1.5,'',NaN])assert.throws(()=>adCmPrice(seconds));
 const d=oneFixture({service:'adcm',seconds:'30',amount:'55000',revisions:'2',scope:AD_CM.scope,exclusions:AD_CM.exclusions});
 assert.equal(documentPrice(d),55000);
 const text=JSON.stringify(documentContent(d));
 for(const term of ['SNS広告CM制作','55,000円','修正2回','MP4','広告出稿費・広告運用'])assert.ok(text.includes(term));
 assert.ok(!text.includes('旧料金データ'));
 assert.throws(()=>validateDocument({...d,amount:'5000'}));
 assert.equal(documentPrice(oneFixture()),3000);
 assert.match(inquiryText({...d,description:'広告CMの相談',name:'見本',reply:'sample@example.com',privacy:true,inquiryOnly:true}),/SNS広告CM制作/);
});
test('public menu and document source agree on new price and exclusions',()=>{
 for(const name of ['pricing.html','one-off.html']){
  const html=readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
  assert.ok(html.includes('30秒以内 55,000円（税込）〜'));
  assert.ok(html.includes(AD_CM.exclusions));
 }
});
