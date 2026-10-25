import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDeleteOperation,DELETE_CONFIRMATION} from '../dist/demo/stores/delete-operation.js';
test('delete adapter waits for Storage and server completion; repeat clicks and retries are safe',async()=>{
 let mode='storage-failure',finish=0,release,removes=0;
 const client={
  rpc:async name=>name==='koho_prepare_delete'?{data:{done:mode==='already-done',paths:['old.jpg','current.jpg'],retained_count:1}}:mode==='finish-failure'?{error:{code:'incomplete'}}:(finish++,{data:{done:true}}),
  storage:{from:bucket=>{
   assert.equal(bucket,'koho-notice-images');
   return {remove:async paths=>{
    assert.deepEqual(paths,['old.jpg','current.jpg']);removes++;
    if(mode==='storage-failure')return {error:{}};
    if(mode==='wait')await new Promise(r=>release=r);
    return {};
   }};
  }}
 };
 const remove=createDeleteOperation(client),post={id:'dummy-id',version:3};
 await assert.rejects(remove(post),/写真/);assert.equal(finish,0);
 mode='finish-failure';await assert.rejects(remove(post),/完了していません/);assert.equal(finish,0);
 mode='wait';const a=remove(post),b=remove(post);assert.equal(a,b);await new Promise(r=>setTimeout(r,0));release();assert.equal((await a).done,true);assert.equal(finish,1);
 mode='already-done';assert.equal((await remove(post)).done,true);assert.equal(removes,3);assert.equal(finish,1);
});
test('deletion UI retains end action, confirms target and explains retained private text/image paths',()=>{
 const ui=readFileSync(new URL('../dist/demo/stores/post-ui.js',import.meta.url),'utf8');
 assert.match(ui,/終了にする/);assert.match(ui,/削除する/);assert.doesNotMatch(ui,/>取り下げる</);
 assert.match(ui,/confirm\('対象：'\+existing.text/);
 assert.match(DELETE_CONFIRMATION,/元に戻せません/);assert.match(DELETE_CONFIRMATION,/文章・写真の保存先情報/);
 const operation=readFileSync(new URL('../dist/demo/stores/delete-operation.js',import.meta.url),'utf8');
 assert.match(operation,/\.remove\(/);assert.doesNotMatch(operation,/service_role|sb_secret_|fetch\(/);
});
