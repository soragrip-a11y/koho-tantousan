import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {STORES,dayKey,recordVisit,countVisits,readVisits} from '../dist/demo/stores/model.js';
import {POST_KEY,validatePost,loadPosts,savePosts,postStatus} from '../dist/demo/stores/post-model.js';

const sample={id:'demo',storeId:'nakatomi',title:'架空の見本',text:'販売情報ではありません',end:'2026-10-26T00:00:00Z',state:'active',image:''};
test('local post save/reload preserves text and validates blank/long/invalid values',()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(k,v)=>{assert.equal(k,POST_KEY);raw=v;}};
 savePosts(storage,[sample]);assert.deepEqual(loadPosts(storage,[]),[sample]);
 for(const change of [{title:' '},{text:' '},{title:'あ'.repeat(41)},{text:'あ'.repeat(181)},{end:'bad'},{image:'https://example.com/private.jpg'},{image:'data:image/svg+xml;base64,abc'}])assert.throws(()=>validatePost({...sample,...change}));
 assert.throws(()=>savePosts({setItem:()=>{throw Error('quota');}},[sample]));
 assert.throws(()=>loadPosts({getItem:()=>'{'},[]));
});
test('soldout and ended notices are independent and no audit data is retained',()=>{
 const data=savePosts({setItem:()=>{}},[{...sample,state:'soldout',events:['PRIVATE']},{...sample,id:'second'}]);
 assert.equal(postStatus(data[0]),'soldout');assert.equal(postStatus(data[1],0),'active');
 assert.equal(postStatus(data[1],Date.parse(sample.end)),'ended');assert.ok(!('events' in data[0]));
});
test('daily own visit limit is independent by store and changes at Japan midnight',()=>{
 const now=Date.parse('2026-10-25T14:59:59Z');let result=recordVisit({},'nakatomi',now);
 for(let i=0;i<20;i++)result=recordVisit(result.ledger,'nakatomi',now);
 assert.equal(result.added,false);assert.equal(countVisits(result.ledger,'nakatomi',now),1);
 assert.equal(recordVisit(result.ledger,'b',now).added,true);
 assert.equal(recordVisit(result.ledger,'nakatomi',now+1000).added,true);
 assert.equal(dayKey(now+1000),'2026-10-26');
 assert.throws(()=>readVisits({getItem:()=>'{'}));
 assert.equal(STORES[0].name,'セブンイレブン君津中富店');
});
test('connected store has anonymous-only customer UI and a restricted backend origin',()=>{
 const root=new URL('../dist/demo/stores/',import.meta.url);
 assert.ok(!readdirSync(root).some(name=>/sql|audit|private|staff-members/i.test(name)));
 const html=readFileSync(new URL('index.html',root),'utf8'),customer=readFileSync(new URL('customer.js',root),'utf8'),staff=readFileSync(new URL('staff.html',root),'utf8');
 assert.match(html,/noindex,nofollow,noarchive/);assert.match(html,/connect-src https:\/\/rnedesemnameergeksuo.supabase.co;/);assert.match(html,/form-action 'none'/);
 assert.match(html,/src="\.\/customer.js\?v=20261027-1"/);assert.doesNotMatch(html,/<a\b|staff\.html|post-ui|app\.js|id="reset"/);
 assert.doesNotMatch(customer,/owner-local-only|events:|fetch\(|XMLHttpRequest|sendBeacon|mountPostUI|data-edit|<a\b|<input|<form|<textarea|staff\.html|post-ui\.js/);
 assert.match(staff,/お店が公開設定のときは、お客さんにも表示されます/);assert.match(staff,/写真は「投稿する」「再投稿する」を押すと送信されます/);
 assert.doesNotMatch(customer,/listStaff|loadPosts|sampleNotices|POST_KEY/);
 const config=readFileSync(new URL('connection.js',root),'utf8');
 assert.match(config,/staff=false/);assert.match(config,/persistSession:staff/);assert.match(config,/detectSessionInUrl:false/);
 assert.doesNotMatch(config,/service_role|sb_secret_/);
 assert.doesNotMatch(readFileSync(new URL('../dist/sitemap.xml',import.meta.url),'utf8'),/demo\/stores/);
});

test('shared posting explanations never promise device-only or unpublished storage',()=>{
 const root=new URL('../dist/demo/stores/',import.meta.url);
 for(const file of ['staff.html','app.js','post-ui.js','edit-ui.js']){
  const source=readFileSync(new URL(file,root),'utf8');
  assert.doesNotMatch(source,/一般公開は停止中|このスマホだけに残ります|ほかの人には送られません|公開開始までは/);
  assert.match(source,/お店が公開設定のときは/);
 }
});
