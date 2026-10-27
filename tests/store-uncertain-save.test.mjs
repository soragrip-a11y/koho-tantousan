import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNoticeRepository} from '../dist/demo/stores/notice-repository.js';
import {createSharedWorkflow} from '../dist/demo/stores/shared-workflow.js';
test('lost save response retries original operation, uploads once, and does not claim unsaved',async()=>{
 let first=true,uploads=0;const persisted=new Map(),requests=[];
 const repo=createNoticeRepository({auth:{signInWithPassword:async()=>({})},rpc:async(name,p)=>{
  if(name==='koho_can_manage')return {data:true};
  requests.push(p);if(!persisted.has(p.p_id))persisted.set(p.p_id,{id:p.p_id,version:1,body:p.p_body,image_path:p.p_image_path});
  if(first){first=false;return {error:{code:'NETWORK'}};}return {data:persisted.get(p.p_id)};
 },storage:{from:()=>({upload:async()=>{uploads++;return {};}})}});
 const flow=createSharedWorkflow(repo);await flow.login('synthetic@example.invalid','unused');
 const draft={title:'synthetic',text:'local only',image:'data:image/jpeg;base64,YQ=='};
 await assert.rejects(flow.save('publish',null,draft),e=>e.message.includes('結果を確認できません')&&!e.message.includes('完了していません'));
 const result=await flow.save('publish',null,{...draft,id:'regenerated-ui-id',end:'regenerated-ui-time'});
 assert.equal(result.version,1);assert.equal(persisted.size,1);assert.equal(uploads,1);assert.equal(requests[0].p_request_id,requests[1].p_request_id);
 const source=readFileSync(new URL('../dist/demo/stores/post-ui.js',import.meta.url),'utf8');
 assert.match(source,/写真や文章を変えず/);assert.doesNotMatch(source,/写真を外して、もう一度/);
});
