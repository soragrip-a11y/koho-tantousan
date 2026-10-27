import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';
import {createNoticeLikes,likeMarkup} from '../dist/demo/stores/notice-likes.js';
const id='00000000-0000-4000-8000-000000000001';
function setup(){let row={notice_id:id,liked:false,revision:0},lost=false,writes=0,resolve;const disk=new Map();const locks={request:async(_,fn)=>fn()};const storage={getItem:k=>disk.get(k),setItem:(k,v)=>disk.set(k,v)};
 const client={rpc:async(name,args)=>{if(name==='koho_my_notice_likes')return{data:[{...row}]};writes++;if(row.revision===args.p_expected_revision){row={notice_id:id,liked:args.p_liked,revision:row.revision+1};}if(lost){lost=false;return{error:{}};}return{data:{...row,accepted:true}};}};
 const likes=createNoticeLikes(client,{storage,locks,randomUUID:()=>id});return {likes,lose:()=>lost=true,writes:()=>writes,row:()=>row};}
test('same pending click is coalesced, next click cancels without accumulating count',async()=>{const s=setup();await s.likes.refresh('nakatomi');const a=s.likes.toggle('nakatomi',id),b=s.likes.toggle('nakatomi',id);assert.equal(a,b);await a;assert.equal(s.writes(),1);assert.equal(s.likes.state(id).liked,true);await s.likes.toggle('nakatomi',id);assert.equal(s.likes.state(id).liked,false);});
test('lost write response retries same desired state rather than flipping again',async()=>{const s=setup();await s.likes.refresh('nakatomi');s.lose();await assert.rejects(()=>s.likes.toggle('nakatomi',id));assert.equal(s.row().liked,true);await s.likes.toggle('nakatomi',id);assert.equal(s.likes.state(id).liked,true);assert.equal(s.row().revision,1);});
test('no persistent browser storage or cross-tab lock fails closed',async()=>{const s=createNoticeLikes({rpc:()=>{throw Error('must not call');}});await assert.rejects(()=>s.refresh('nakatomi'));});
test('heart has no public count, has accessible label and pressed state',()=>{const {document}=parseHTML(likeMarkup(id,{liked:true,revision:8}));const b=document.querySelector('button');assert.equal(b.getAttribute('aria-pressed'),'true');assert.equal(b.getAttribute('aria-label'),'いいねを取り消す');assert.equal(b.textContent,'♥');assert.doesNotMatch(document.toString(),/件数|like_count/);assert.equal(likeMarkup('<script>',null),'');});
test('two tabs share browser identity and serialize toggles instead of adding duplicates',async()=>{
 const map=new Map(),tails=new Map(),seen=[];let row={notice_id:id,liked:false,revision:0};
 const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},locks={request(key,fn){const next=(tails.get(key)||Promise.resolve()).then(fn);tails.set(key,next.catch(()=>{}));return next;}};
 const client={rpc:async(name,a)=>{seen.push(a.p_browser_id);if(name==='koho_my_notice_likes')return{data:[{...row}]};assert.equal(a.p_expected_revision,row.revision);row={notice_id:id,liked:a.p_liked,revision:row.revision+1};return{data:{...row,accepted:true}};}};
 const a=createNoticeLikes(client,{storage,locks,randomUUID:()=>id}),b=createNoticeLikes(client,{storage,locks,randomUUID:()=>{throw Error('identity must be reused');}});
 await a.refresh('nakatomi');await b.refresh('nakatomi');await Promise.all([a.toggle('nakatomi',id),b.toggle('nakatomi',id)]);
 assert.equal(row.liked,false);assert.equal(row.revision,2);assert.equal(new Set(seen).size,1);
});
test('a post removed from public results cannot call write endpoint',async()=>{
 let writes=0;const m=new Map();const likes=createNoticeLikes({rpc:async n=>{if(n==='koho_set_notice_like')writes++;return{data:[]};}},{storage:{getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)},locks:{request:async(_,f)=>f()},randomUUID:()=>id});
 await assert.rejects(()=>likes.toggle('nakatomi',id));assert.equal(writes,0);
});
