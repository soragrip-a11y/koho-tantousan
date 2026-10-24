import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';
import {generateContract} from '../dist/contract-pdf.js';
import {fixture} from './fixture.mjs';
// Execute the exact vendored browser builds without a browser or a CDN.
vm.runInThisContext(readFileSync(new URL('../dist/vendor/pdf-lib-1.17.1.min.js',import.meta.url),'utf8'));
vm.runInThisContext(readFileSync(new URL('../dist/vendor/fontkit-1.1.1.min.js',import.meta.url),'utf8'));
const deps={PDFLib:globalThis.PDFLib,fontkit:globalThis.fontkit,fontBytes:new Uint8Array(readFileSync(new URL('../dist/assets/fonts/NotoSansJP-Regular.ttf',import.meta.url)))};
mkdirSync(new URL('../tmp/pdfs/',import.meta.url),{recursive:true});
const cases=[
 ['political-review',fixture({requestCategory:'political',scopeAttachment:'技術制作：具体的指示に基づく編集の検討。企画・投稿・広告は対象外。',instructionOwner:'指示者と意思決定者は確認中',expertRecord:'未確認'})],
 ['election-review-blank',{requestCategory:'election',contractDate:'2026-10-24',purpose:'確認用',reviewed:true}],
 ['political-review-long',fixture({requestCategory:'political',scopeAttachment:'技術制作・企画・投稿・広告・実費の境界を個別に確認する。'.repeat(55),expertRecord:'確認事項を記録し、未回答の点は受託前に照会する。'.repeat(60)})],
 ['standard',fixture({providerAddress:''})],
 ['companion',fixture({plan:'companion',months:3,tiktok:1,extras:[{label:'初回交通費',amount:3000,timing:'once'}]})],
 ['premium',fixture({plan:'premium',shorts:9,longs:3,months:2,shootHalf:1,extraShortUnit:6000,extraLongUnit:20000,extraShootUnit:18000,extras:[{label:'交通費',amount:2000,timing:'once'}]})],
 ['single',fixture({plan:'single',shorts:3,shootHalf:1})],
 ['estimate',fixture({plan:'companion',months:3,tiktok:1,documentType:'estimate',extras:[{label:'初回交通費',amount:3000,timing:'once'}]})],
 ['invoice',fixture({plan:'companion',months:3,tiktok:1,documentType:'invoice',invoiceMonth:2,paymentDue:'2026-12-31',extras:[{label:'初回交通費',amount:3000,timing:'once'}]})],
 ['long-text',fixture({purpose:'地域の取り組みと活動内容を丁寧に確認する。'.repeat(80),notes:'長い入力の改ページと見切れを確認するための検証文。'.repeat(60)})]
];
for(const [name,data] of cases){
  test(`PDF generation, embedded Japanese font and page structure: ${name}`,async()=>{
    const bytes=await generateContract(data,deps);assert.ok(bytes.byteLength>30000);
    const doc=await deps.PDFLib.PDFDocument.load(bytes);assert.ok(doc.getPageCount()>=1);assert.ok(doc.getPageCount()<16);
    for(const page of doc.getPages()){assert.equal(page.getWidth(),595.28);assert.equal(page.getHeight(),841.89);}
    writeFileSync(new URL(`../tmp/pdfs/${name}.pdf`,import.meta.url),bytes);
  });
}
test('unsupported glyphs produce an error instead of silent missing characters',async()=>{
  await assert.rejects(()=>generateContract(fixture({customer:'検証🦄'}),deps),/使用できない文字/);
});
