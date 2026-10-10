import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculate,periodEnd,renewalDeadline,validateContract,clean} from '../dist/contract-core.js';
import {contractSections} from '../dist/contract-pdf.js';
import {fixture} from './fixture.mjs';

test('published plans and bundled quantities are not charged twice',()=>{
  assert.equal(calculate(fixture()).total,55000);
  const p=calculate(fixture({plan:'premium',shorts:'8',longs:'2',months:'2'}));
  assert.equal(p.total,300000);assert.equal(p.first,150000);assert.equal(p.rows.length,1);
});
test('single prices match all four published shooting combinations',()=>{
  for(const [shorts,longs,shoot4,shoot7,total] of [[1,0,1,0,30000],[1,0,0,1,40000],[0,1,1,0,40000],[0,1,0,1,50000]])
    assert.equal(calculate(fixture({plan:'single',shorts,longs,shoot4,shoot7})).total,total);
});
test('premium extension and expenses use the same additional-fee rows without double counting',()=>{
  const d=fixture({plan:'premium',shorts:9,longs:3,months:2,includedHours:7,shoot4:1,extras:[{label:'特殊編集',amount:5000,timing:'once'},{label:'初回撮影の交通費・駐車場代',amount:2000,timing:'once'}]});
  const c=calculate(d);assert.equal(c.recurring,208000);assert.equal(c.first,215000);assert.equal(c.total,423000);
  assert.equal(c.rows.filter(r=>r.label.includes('交通費')).length,1);
});
test('recurring fees multiply by months; one-time amounts do not',()=>{
  const d=fixture({months:3,extras:[{label:'追加A',amount:1000,timing:'monthly'},{label:'追加B',amount:2500,timing:'once'}]});
  assert.equal(calculate(d).total,170500);
});
test('removed fields are not required or rendered as empty values',()=>{
  const c=contractSections(fixture());
  const text=JSON.stringify(c.sections);
  assert.equal(c.calculation.total,55000);
  assert.ok(!/undefined|null|発生なし・請求なし|承認担当者/.test(text));
  assert.ok(text.includes('業務の実施前に双方で確認・合意'));
  assert.ok(text.includes('未確定額は上記総額に含めない'));
});
test('monthly minimums and non-interchangeable bundles are enforced',()=>{
  for(const overrides of [{months:0},{plan:'premium',months:1,shorts:8,longs:2},{shorts:5},{plan:'premium',months:2,shorts:8,longs:1}]) assert.throws(()=>calculate(fixture(overrides)));
});
test('empty orders and invalid numeric inputs fail closed',()=>{
  assert.throws(()=>calculate(fixture({plan:'single',shorts:0})));
  for(const shorts of ['',-1,1.5,'1e2','0x10',NaN,Infinity,101])assert.throws(()=>calculate(fixture({shorts})));
  assert.throws(()=>calculate(fixture({extras:[{label:'',amount:3000,timing:'once'}]})));
});
test('month-end, leap-year, cross-year and cancellation dates',()=>{
  assert.equal(periodEnd('2026-11-01',2),'2026-12-31');
  assert.equal(periodEnd('2026-01-31',1),'2026-02-28');
  assert.equal(periodEnd('2028-01-31',1),'2028-02-29');
  assert.equal(periodEnd('2026-12-15',2),'2027-02-14');
  assert.equal(renewalDeadline('2026-12-31'),'2026-12-17');
  assert.throws(()=>periodEnd('2026-02-30',1));
});
test('missing parties, invalid dates, email and consent are rejected',()=>{
  for(const override of [{customer:''},{providerAddress:''},{customerEmail:'bad'},{reviewed:false},{contractDate:'2026-12-01'},{plan:'single',end:'2026-10-31'}])assert.throws(()=>validateContract(fixture(override)));
});
test('all contract inputs and all service clauses are included in PDF content',()=>{
  const d=fixture();const c=contractSections(d);const text=JSON.stringify(c.sections);
  for(const key of ['customer','customerSigner','customerAddress','customerEmail','providerAddress','payer','purpose','usage','notes'])assert.ok(text.includes(d[key]));
  const terms=readFileSync(new URL('../dist/terms.html',import.meta.url),'utf8');
  assert.equal(c.terms.length,12);
  for(const t of c.terms){assert.ok(terms.includes(t.title));assert.ok(terms.includes(t.text));}
  assert.ok(text.includes('55,000円'));assert.ok(text.includes('2026-11-30'));
});
test('control characters are removed without interpreting HTML-like user input',()=>{
  assert.equal(clean('  <img src=x>\u0000\u202e  '),'<img src=x>');
  const text=JSON.stringify(contractSections(fixture({customer:'<script>山田</script>'})).sections);
  assert.ok(text.includes('<script>山田</script>'));
});
