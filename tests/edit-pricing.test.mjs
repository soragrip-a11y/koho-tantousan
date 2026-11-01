import test from 'node:test';import assert from 'node:assert/strict';
import {editPrice,EDIT_PRICE_VERSION} from '../dist/edit-pricing.js';
import {basePrice,documentPrice,documentContent,validateDocument} from '../dist/one-off-core.js';
import {oneFixture} from './one-off-fixture.mjs';
test('short and long use explicit service and inclusive duration boundaries',()=>{
 for(const [n,p] of [[1,5000],[30,5000],[31,10000],[60,10000],[61,15000],[90,15000],[91,20000]])assert.equal(editPrice('short',n),p);
 for(const [n,p] of [[30,30000],[600,30000],[601,40000],[900,40000],[901,50000],[1200,50000],[1201,60000]])assert.equal(editPrice('long',n),p);
 for(const n of [0,-1,1.5,'','1e3',NaN,Infinity,Number.MAX_SAFE_INTEGER])assert.throws(()=>editPrice('short',n));assert.throws(()=>editPrice('auto',60));
});
test('new quote/PDF uses shared tariff and does not silently replace the entered total',()=>{
 const d=oneFixture({pricingVersion:EDIT_PRICE_VERSION,service:'long',seconds:'601',amount:'45000'});
 assert.equal(basePrice(d),40000);assert.equal(validateDocument(d).amount,'45000');
 const t=JSON.stringify(documentContent(d));assert.match(t,/40,000円/);assert.match(t,/45,000円/);assert.match(t,/カメラ1台/);assert.match(t,/要点字幕/);assert.match(t,/企業広告/);assert.match(t,/過失による修正は回数に数えず無料/);
 assert.throws(()=>validateDocument({...d,amount:'39999'}));assert.equal(d.amount,'45000');
});
test('unversioned historical inputs retain original price without migration',()=>{
 const d=oneFixture();const before=JSON.stringify(d);assert.equal(documentPrice(d),3000);assert.doesNotThrow(()=>validateDocument(d));assert.match(JSON.stringify(documentContent(d)),/旧料金データ/);assert.equal(JSON.stringify(d),before);
 assert.equal(documentPrice({...d,pricingVersion:EDIT_PRICE_VERSION}),10000);
 assert.throws(()=>documentPrice({...d,pricingVersion:'unknown'}));
});
