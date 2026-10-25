import test from 'node:test';
import assert from 'node:assert/strict';
import {createNoticeRepository} from '../dist/demo/stores/notice-repository.js';
import {accessError} from '../dist/demo/stores/access-errors.js';
test('login separates credentials, transport, membership denial and membership transport without leaking payloads',async()=>{
 for(const [authError,rpcData,rpcError,expected] of [
  [{code:'invalid_credentials',message:'PRIVATE'},true,null,'一致しません'],
  [{status:429,message:'PRIVATE'},true,null,'制限'],
  [null,false,null,'権限がありません'],
  [null,null,{code:'NETWORK',message:'PRIVATE'},'権限を確認できません']]){
  const repo=createNoticeRepository({auth:{signInWithPassword:async()=>({error:authError}),signOut:async()=>{}},rpc:async()=>({data:rpcData,error:rpcError})});
  await assert.rejects(repo.signIn('dummy@example.invalid','dummy'),e=>e.message.includes(expected)&&!e.message.includes('PRIVATE'));
 }
 const repo=createNoticeRepository({auth:{signInWithPassword:async()=>{throw Error('PRIVATE');}}});
 await assert.rejects(repo.signIn('dummy','dummy'),/通信/);
 assert.match(accessError({},'list'),/一覧/);
});
