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
const premium=fixture({plan:'premium',shorts:9,longs:3,months:2,includedHours:7,shoot4:1,extras:[{label:'特殊編集',amount:5000,timing:'once'},{label:'交通費・駐車場代',amount:2000,timing:'once'}]});
for(const [name,data] of [['standard',fixture()],['premium',premium],['single',fixture({plan:'single',shorts:1,shoot4:1})],['long-text',fixture({purpose:'地域の取り組みと活動内容を丁寧に確認する。'.repeat(80),notes:'長い入力の改ページと見切れを確認するための検証文。'.repeat(60)})]]){
  test(`PDF generation, embedded Japanese font and page structure: ${name}`,async()=>{
    const bytes=await generateContract(data,deps);assert.ok(bytes.byteLength>30000);
    const doc=await deps.PDFLib.PDFDocument.load(bytes);assert.ok(doc.getPageCount()>=4);assert.ok(doc.getPageCount()<16);
    for(const page of doc.getPages()){assert.equal(page.getWidth(),595.28);assert.equal(page.getHeight(),841.89);}
    writeFileSync(new URL(`../tmp/pdfs/${name}.pdf`,import.meta.url),bytes);
  });
}
test('unsupported glyphs produce an error instead of silent missing characters',async()=>{
  await assert.rejects(()=>generateContract(fixture({customer:'検証🦄'}),deps),/使用できない文字/);
});
