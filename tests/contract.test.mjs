
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{parseHTML}from'linkedom';
import{calculate,periodEnd,validateContract,clean,DEFAULT_PROVIDER}from'../dist/contract-core.js';import{contractSections}from'../dist/contract-pdf.js';import{fixture}from'./fixture.mjs';
test('three monthly plans charge the approved inclusive amount and bundled filming once',()=>{
 for(const [plan,shorts,longs,total,shoots]of [['standard',6,0,30000,0],['companion',6,0,80000,2],['premium',8,2,120000,2]]){const c=calculate(fixture({plan,shorts,longs}));assert.equal(c.total,total);assert.equal(c.includedShoots,shoots);assert.equal(c.rows.length,1);}
});
test('trial requires three shorts and distinguishes first filming from normal filming',()=>{
 assert.equal(calculate(fixture({plan:'single',shorts:3,shootHalf:1})).total,30000);
 assert.equal(calculate(fixture({plan:'single',shorts:4,shootHalf:0})).total,20000);
 assert.equal(calculate(fixture({shootHalf:1})).total,47000);
 for(const d of [{plan:'single',shorts:2},{plan:'single',shorts:3,longs:1},{plan:'single',shootHalf:2},{plan:'single',tiktok:1}])assert.throws(()=>calculate(fixture(d)));
});
test('TikTok and recurring additions multiply by months; transport is charged once',()=>{
 const c=calculate(fixture({plan:'companion',months:3,tiktok:1,extras:[{label:'交通費・駐車場代',amount:3000,timing:'once'}]}));
 assert.equal(c.recurring,95000);assert.equal(c.first,98000);assert.equal(c.total,288000);
 const later=calculate(fixture({plan:'companion',months:3,tiktok:1,documentType:'invoice',invoiceMonth:2,extras:[{label:'交通費',amount:3000,timing:'once'}]}));assert.equal(later.invoiceTotal,95000);assert.equal(later.invoiceRows.length,2);
});
test('unapproved legacy unit prices never silently price extra work',()=>{
 for(const d of [{shorts:7},{longs:1},{plan:'companion',shootHalf:1},{shoot4:1},{shoot7:1}])assert.throws(()=>calculate(fixture(d)));
 const c=calculate(fixture({plan:'premium',shorts:9,longs:3,months:2,shootHalf:1,extraShortUnit:6000,extraLongUnit:20000,extraShootUnit:18000,extras:[{label:'交通費',amount:2000,timing:'once'}]}));
 assert.equal(c.recurring,164000);assert.equal(c.total,330000);assert.equal(c.first,166000);assert.equal(c.includedShoots,2);
});
test('no automatic renewal or premium two-month minimum is imposed',()=>{
 assert.equal(calculate(fixture({plan:'premium',shorts:8,longs:2,months:1})).total,120000);
 for(const x of [{months:0},{shorts:5},{plan:'premium',shorts:8,longs:1}])assert.throws(()=>calculate(fixture(x)));
 const text=JSON.stringify(contractSections(fixture()));assert.doesNotMatch(text,/1か月ごとに自動更新|満了14日前|最低2か月/);assert.match(text,/自動更新は設定しない/);
});
test('invalid numeric values and empty extra descriptions fail closed',()=>{
 for(const shorts of ['',-1,1.5,'1e2','0x10',NaN,Infinity,101])assert.throws(()=>calculate(fixture({shorts})));
 assert.throws(()=>calculate(fixture({extras:[{label:'',amount:3000,timing:'once'}]})));
});
test('month end and leap-year periods remain correct',()=>{
 assert.equal(periodEnd('2026-11-01',2),'2026-12-31');assert.equal(periodEnd('2026-01-31',1),'2026-02-28');assert.equal(periodEnd('2028-01-31',1),'2028-02-29');assert.equal(periodEnd('2026-12-15',2),'2027-02-14');assert.throws(()=>periodEnd('2026-02-30',1));
});
test('required parties, dates, approval and invoice due dates are validated',()=>{
 for(const d of [{customer:''},{customerEmail:'bad'},{reviewed:false},{contractDate:'2026-12-01'},{plan:'single',end:'2026-10-31'},{documentType:'invoice',paymentDue:''},{documentType:'invoice',invoiceMonth:2},{documentType:'invoice',paymentDue:'2026-10-01'}])assert.throws(()=>validateContract(fixture(d)));
});
test('signed contract clause snapshot matches current published terms exactly',()=>{
 const content=contractSections(fixture());const {document}=parseHTML(readFileSync(new URL('../dist/terms.html',import.meta.url),'utf8'));
 const clauses=[...document.querySelectorAll('.prose-section')].map(x=>({title:x.querySelector('h2').textContent,text:[...x.querySelectorAll('p')].map(p=>p.textContent).join('')}));
 assert.deepEqual(content.terms,clauses);assert.equal(clauses.length,12);
 const text=JSON.stringify(content);assert.match(text,/30,000円/);assert.doesNotMatch(text,/55,000円|100,000円|各動画2回|4時間まで|7時間まで|ショート3,000/);
});
test('invoice and estimate use the same calculation without charging all months up front',()=>{
 const d=fixture({plan:'companion',months:3,tiktok:1,extras:[{label:'初回交通費',amount:3000,timing:'once'}]});
 const quote=contractSections({...d,documentType:'estimate'}),bill=contractSections({...d,documentType:'invoice',invoiceMonth:2,paymentDue:'2026-12-31'});
 assert.equal(quote.calculation.total,288000);assert.equal(bill.calculation.invoiceTotal,95000);assert.match(JSON.stringify(bill.sections),/今回の請求額：95,000円/);assert.doesNotMatch(JSON.stringify(bill.sections),/288,000円/);assert.equal(bill.terms.length,0);
});
test('all documents retain payment conditions and free error correction',()=>{
 for(const plan of ['standard','companion','premium','single']){const d=fixture({plan,shorts:plan==='premium'?8:6,longs:plan==='premium'?2:0});const text=JSON.stringify(contractSections(d).sections);assert.match(text,/初月・単発は着手前、月額契約の2か月目以降は当月末払い/);assert.match(text,/過失修正は回数に数えず無料/);assert.match(text,/交通費は全プラン別途/);}
});
test('control characters are cleaned and provider address remains fillable later',()=>{
 assert.equal(clean('  <img src=x>\u0000\u202e  '),'<img src=x>');assert.equal(DEFAULT_PROVIDER.providerAddress,'');
 assert.match(JSON.stringify(contractSections(fixture({providerAddress:''})).sections),/住所：_{32}（契約時に記入）/);
});
