// New dated samples and guidance only; never replace prior issued PDFs.
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {generateContract,renderDocument} from '../dist/contract-pdf.js';
import {ACCEPTANCE_POLICY,POLITICAL_DETAIL,AI_POLICY,REVIEW_FIELDS} from '../dist/acceptance-policy.js';
import {fixture} from '../tests/fixture.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
vm.runInThisContext(read('dist/vendor/pdf-lib-1.17.1.min.js'));
vm.runInThisContext(read('dist/vendor/fontkit-1.1.1.min.js'));
const deps={PDFLib:globalThis.PDFLib,fontkit:globalThis.fontkit,fontBytes:new Uint8Array(readFileSync(new URL('dist/assets/fonts/NotoSansJP-Regular.ttf',root)))};
const save=(name,bytes)=>writeFileSync(new URL('dist/downloads/'+name+'-20261024.pdf',root),bytes);
for(const [name,overrides] of Object.entries({standard:{},companion:{plan:'companion'},premium:{plan:'premium',shorts:8,longs:2},single:{plan:'single',shorts:3},estimate:{documentType:'estimate'},invoice:{documentType:'invoice',plan:'companion',months:3,invoiceMonth:2,contractDate:'2026-12-01',paymentDue:'2026-12-31'}})){
 await save('sample-'+name,await generateContract(fixture({contractDate:'2026-10-24',paymentDue:'2026-10-30',...overrides}),deps));
}
const policy={title:'全プラン・単発業務の受託条件',paragraphs:[ACCEPTANCE_POLICY,POLITICAL_DETAIL,AI_POLICY]};
const make=(title,sections)=>renderDocument({documentTitle:title,type:'review',sections,terms:[],data:{contractDate:'2026-10-24'}},deps);
await save('contract-checklist',await make('受託前の確認シート',[policy,{title:'依頼内容・確認記録',paragraphs:['発信目的：________________','依頼区分：一般事業／政治活動関係／選挙関係・判断未了',...Object.values(REVIEW_FIELDS).map(t=>t+'：________________'),'受託・実施は未確定。必要な確認後、個別の業務範囲・条件を書面で合意します。']} ]));
for(const [name,file,title]of [['election-guide','political-guide.html','発信と公職選挙法・受託前確認ガイド'],['document-guide','expenses-guide.html','請求書・領収書と業務記録の整え方']]){
 const doc=parseHTML(read('dist/'+file)).document;
 const sections=[policy];
 for(const el of doc.querySelectorAll('.prose-section')){
  const paragraphs=[];
  for(const node of el.querySelectorAll('p,li,tr')){
   if(node.closest('.download-card'))continue;
   const text=node.tagName==='TR'?[...node.querySelectorAll('th,td')].map(c=>c.textContent).join(' ／ '):node.textContent;
   const sources=[...node.querySelectorAll('a[href^="https://"]')].map(a=>a.getAttribute('href'));
   if(text.trim())paragraphs.push(text+(sources.length?'\n'+[...new Set(sources)].join('\n'):''));
  }
  if(paragraphs.length)sections.push({title:el.querySelector('h2')?.textContent||'確認事項',paragraphs});
 }
 await save(name,await make(title,sections));
}
console.log('Generated six new general-business samples and three dated policy guides; old PDFs preserved.');
