import test from 'node:test';import assert from 'node:assert/strict';
import {CURRENT_EDIT_VERSION,currentEditPrice} from '../dist/current-edit-pricing.js';
import {documentPrice,documentContent,validateDocument} from '../dist/one-off-core.js';
import {oneFixture} from './one-off-fixture.mjs';
const data=(o={})=>oneFixture({pricingVersion:CURRENT_EDIT_VERSION,service:'short',seconds:'30',amount:'11000',...o});
test('current regular edits have approved caps and do not extrapolate old increments',()=>{
 assert.equal(currentEditPrice('short',30),11000);assert.equal(currentEditPrice('long',420),27500);
 for(const [service,seconds] of [['short',31],['long',421]])assert.throws(()=>currentEditPrice(service,seconds),/個別見積もり/);
 assert.equal(documentPrice(data()),11000);assert.equal(documentPrice(data({service:'long',seconds:420})),27500);
});
test('trials require initial-use confirmation and preserve individually agreed scope',()=>{
 for(const [service,amount] of [['trialshort',5000],['triallong',15000]]){
 const d=data({service,amount,seconds:45,scope:'個別合意した範囲'});assert.throws(()=>validateDocument(d),/初回限定/);
 const content=documentContent({...d,firstTimeConfirmed:true,documentType:'contract'}),s=JSON.stringify(content);
 assert.match(s,/初回限定の適用を確認済み/);assert.match(s,/同一の内容を保証するものではありません/);assert.match(s,/個別合意した範囲/);assert.doesNotMatch(s,/17,000円|初稿後30日/);
 }
});
test('previous quote versions keep their prices and editing terms',()=>{
 const d=oneFixture({pricingVersion:'2026-11-01',service:'long',seconds:600,amount:30000});
 assert.equal(documentPrice(d),30000);const text=JSON.stringify(documentContent(d));assert.match(text,/要点字幕/);assert.doesNotMatch(text,/27,500円|初回限定/);
 assert.equal(documentPrice(oneFixture()),3000);
});
test('current non-video documents do not acquire a legacy tariff label or old shooting cancellation fee',()=>{
 const content=documentContent(data({service:'repair',amount:3000,documentType:'contract'}));const text=JSON.stringify(content);
 assert.doesNotMatch(text,/旧料金データ|17,000円/);assert.equal(documentPrice(data({service:'repair'})),3000);
});
