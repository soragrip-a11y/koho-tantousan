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
 assert.equal(STORES[0].name,'セブンイレブン中富店');
});
test('published demo has no actual audit data, owner backend or network writes',()=>{
 const root=new URL('../dist/demo/stores/',import.meta.url);
 assert.deepEqual(readdirSync(root).sort(),['app.js','index.html','model.js','post-model.js','post-ui.js','placeholder.svg','rich-menu.png','rich-menu.svg','style.css'].sort());
 const html=readFileSync(new URL('index.html',root),'utf8'),app=readFileSync(new URL('app.js',root),'utf8');
 assert.match(html,/noindex, nofollow, noarchive/);assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);
 assert.doesNotMatch(app,/owner-local-only|events:|fetch\(|XMLHttpRequest|sendBeacon|six-menu|#store\/[bcde]/);
 assert.match(app,/本番管理画面やログイン機能ではありません/);assert.match(app,/他の人への公開・送信はありません/);
 assert.doesNotMatch(readFileSync(new URL('../dist/sitemap.xml',import.meta.url),'utf8'),/demo\/stores/);
});
