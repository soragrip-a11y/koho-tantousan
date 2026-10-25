import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {STORES,dayKey,recordVisit,countVisits,readVisits,sampleNotices,status} from '../dist/demo/stores/model.js';

test('one self-report per store per Japan calendar day, independent stores',()=>{
  const now=Date.parse('2026-10-25T14:59:59Z');
  let result=recordVisit({},'nakatomi',now);
  for(let i=0;i<20;i++)result=recordVisit(result.ledger,'nakatomi',now);
  assert.equal(result.added,false);
  assert.equal(countVisits(result.ledger,'nakatomi',now),1);
  result=recordVisit(result.ledger,'b',now);
  assert.equal(countVisits(result.ledger,'b',now),1);
  result=recordVisit(result.ledger,'nakatomi',now+1000);
  assert.equal(result.added,true);
  assert.equal(dayKey(now),'2026-10-25');
  assert.equal(dayKey(now+1000),'2026-10-26');
  assert.equal(countVisits(result.ledger,'nakatomi',now+1000),2);
  assert.throws(()=>recordVisit({},'unknown',now));
});
test('last seven calendar days include today and exclude day eight and future',()=>{
  const now=Date.parse('2026-10-25T03:00:00Z');let ledger={};
  for(let i=-1;i<=8;i++)ledger=recordVisit(ledger,'b',now-i*86400000).ledger;
  assert.equal(countVisits(ledger,'b',now),7);
});
test('reload preserves own reports; corrupted data fails without inventing counts',()=>{
  const ledger=recordVisit({},'c').ledger;
  assert.deepEqual(readVisits({getItem:()=>JSON.stringify(ledger)}),ledger);
  assert.throws(()=>readVisits({getItem:()=>'{'}));
  assert.throws(()=>readVisits({getItem:()=> '[]'}));
  assert.deepEqual(readVisits({getItem:()=>JSON.stringify({secret:'private','b:2026-10-25':true})}),{'b:2026-10-25':true});
});
test('sample deadlines and names do not fabricate sale data',()=>{
  assert.equal(STORES.length,5);assert.equal(STORES[0].name,'セブンイレブン中富店');
  const item=sampleNotices('b',0)[0];
  assert.equal(status(item,86399999),'active');assert.equal(status(item,86400000),'ended');
  assert.ok(item.text.includes('販売・特売情報ではありません'));
});
test('public bundle excludes owner tools and records, remains noindex and isolated',()=>{
  const root=new URL('../dist/demo/stores/',import.meta.url);
  assert.deepEqual(readdirSync(root).sort(),['app.js','index.html','model.js','placeholder.svg','rich-menu.png','rich-menu.svg','style.css'].sort());
  const html=readFileSync(new URL('index.html',root),'utf8');
  const app=readFileSync(new URL('app.js',root),'utf8');
  const model=readFileSync(new URL('model.js',root),'utf8');
  assert.match(html,/noindex, nofollow, noarchive/);
  for(const source of [html,app,model])assert.doesNotMatch(source,/owner-preview|owner-local-only|renderManage|id="editor"|data-action="edit"|events:|savePost/);
  assert.doesNotMatch(readFileSync(new URL('../dist/sitemap.xml',import.meta.url),'utf8'),/demo\/stores/);
  assert.match(app,/removeItem\('koho-store-demo-v1'\)/);
  assert.match(app,/one-off\.html/);
});
