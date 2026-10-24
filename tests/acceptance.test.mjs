import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContract} from '../dist/contract-core.js';
import {contractSections} from '../dist/contract-pdf.js';
import {fixture} from './fixture.mjs';
test('missing, legacy and unknown request classifications never default to general business',()=>{
 for(const requestCategory of [undefined,'','unknown'])assert.throws(()=>validateContract(fixture({requestCategory})),/依頼区分/);
});
test('all political categories, plans and requested document types produce only a review sheet',()=>{
 for(const requestCategory of ['political','election'])for(const plan of ['standard','companion','premium','single'])for(const documentType of ['contract','estimate','invoice']){
  const d=fixture({requestCategory,plan,documentType,expertRecord:'専門家に相談済みという入力だけでは承認しない',scopeAttachment:'撮影・編集のみ。企画・投稿・広告は除外。'});
  const c=contractSections(d),text=JSON.stringify(c.sections);
  assert.equal(c.type,'review');assert.equal(c.terms.length,0);assert.equal(c.calculation.reviewOnly,true);
  assert.match(c.documentTitle,/受託未確定/);assert.match(text,/未確認/);assert.match(text,/裁量/);
  assert.doesNotMatch(text,/指定契約期間の確定総額|今回の請求額|プラン：|甲 署名|月額80,000/);
 }
});
test('review sheets accept blanks as unknown, require purpose and acknowledgment, and reject overlong fields',()=>{
 assert.equal(contractSections({requestCategory:'election',contractDate:'2026-10-24',purpose:'確認用',reviewed:true}).type,'review');
 for(const patch of [{purpose:''},{reviewed:false},{instructionOwner:'長'.repeat(2001)}])assert.throws(()=>validateContract(fixture({requestCategory:'political',...patch})));
});
test('general documents retain quoted prices and carry the political and AI policies',()=>{
 for(const documentType of ['contract','estimate','invoice']){
  const c=contractSections(fixture({documentType}));assert.notEqual(c.type,'review');assert.equal(c.calculation.total,30000);
  const text=JSON.stringify(c.sections);assert.match(text,/外部AI/);assert.match(text,/必要な許可/);assert.match(text,/通常の企画・SNS運用プランをそのまま適用しません/);
 }
});
