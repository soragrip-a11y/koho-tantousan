import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {parseHTML} from 'linkedom';
import {calculate,validateContract} from '../dist/contract-core.js';import {contractSections} from '../dist/contract-pdf.js';import {MONTHLY_TERMS} from '../dist/monthly-pricing.js';import {documentPrice,documentContent} from '../dist/one-off-core.js';import {fixture} from './fixture.mjs';import {oneFixture} from './one-off-fixture.mjs';
const f=(o={})=>fixture({plan:'monthly55000',months:2,shorts:3,longs:0,shootHalf:2,...o});
test('equivalent mixes retain pack price; no double charging filming',()=>{
 for(const o of [{shorts:5,shootHalf:0},{shorts:0,longs:2,shootHalf:0},{shorts:3,shootHalf:2}]){const c=calculate(f(o));assert.equal(c.recurring,55000);assert.equal(c.allocation,55000);assert.equal(c.rows.length,1);}
 assert.throws(()=>calculate(f({shorts:4})),/制作枠を超え/);
 assert.throws(()=>calculate(f({shorts:1.5})));assert.throws(()=>calculate(f({tiktok:1})),/旧プラン/);
});
test('premium has 132k production allocation, not 165k',()=>{
 const c=calculate(f({plan:'monthly165000',shorts:12,shootHalf:0}));assert.equal(c.recurring,165000);assert.equal(c.allocation,132000);assert.throws(()=>calculate(f({plan:'monthly165000',shorts:13,shootHalf:0})),/制作枠/);
 for(const term of ['Instagram','YouTube','TikTok','媒体ごとに1投稿','3投稿分'])assert.ok(c.plan.scope.includes(term));
});
test('new invoices separate period total and first-month extras',()=>{
 const d=f({months:3,documentType:'invoice',invoiceMonth:2,paymentDue:'2026-11-30',extras:[{label:'初回交通費',amount:2000,timing:'once'}]});const c=validateContract(d);assert.equal(c.total,167000);assert.equal(c.invoiceTotal,55000);assert.doesNotMatch(JSON.stringify(contractSections(d)),/当月末払い|現地3時間/);
});
test('new conditions agree with public page and do not inherit legacy scope',()=>{
 const {document}=parseHTML(readFileSync(new URL('../dist/terms.html',import.meta.url),'utf8'));const text=document.body.textContent;
 for(const t of MONTHLY_TERMS)assert.ok(text.includes(t.text));
 const content=contractSections(f());assert.deepEqual(content.terms,MONTHLY_TERMS);
 const all=JSON.stringify(content);for(const term of ['翌々月末','当月限り','3,300円','前月末','契約時'])assert.ok(all.includes(term));assert.doesNotMatch(all,/初稿後30日|現地3時間|当月末払い/);
});
test('previous monthly and CM agreements retain their historical amounts',()=>{
 assert.equal(calculate(fixture()).recurring,30000);
 const old=oneFixture({service:'adcm',seconds:30,amount:55000,revisions:2});assert.equal(documentPrice(old),55000);assert.match(JSON.stringify(documentContent(old)),/修正2回/);
 const current={...old,adCmVersion:'20261106',amount:33000,revisions:1};assert.equal(documentPrice(current),33000);assert.doesNotMatch(JSON.stringify(documentContent(current)),/修正2回まで|55,000円/);
});

test('new monthly agreements require two initial months and renew monthly',()=>{assert.throws(()=>calculate(f({months:1})),/最低2か月/);const c=calculate(f({months:2}));assert.equal(c.total,110000);const text=JSON.stringify(contractSections(f()));assert.match(text,/1か月ごとの自動更新/);assert.match(text,/通知期限/);});
