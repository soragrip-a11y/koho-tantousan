import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedWorkflow} from '../dist/demo/stores/shared-workflow.js';
test('shared workflow gates access, waits for saves, retries same request and preserves edit identity',async()=>{
 let saved=[],uploads=0,fail=true,release;
 const repo={signIn:async(e,p)=>{if(p!=='test')throw Error();},signOut:async()=>{},listStaff:async()=>[],uploadPhoto:async()=>{uploads++;return 'nakatomi/photo.jpg';},save:async op=>{saved.push(op);if(fail)throw Error('offline');await new Promise(r=>release=r);return {id:op.p_id};}};
 const flow=createSharedWorkflow(repo);
 await assert.rejects(flow.list());assert.throws(()=>flow.save('publish',null,{}));
 await assert.rejects(flow.login('fake@example.invalid','wrong'));
 await flow.login('fake@example.invalid','test');
 const draft={title:'test',text:'sample',image:'data:image/jpeg;base64,YQ=='};
 await assert.rejects(flow.save('publish',null,draft));
 assert.equal(uploads,1);fail=false;
 const first=flow.save('publish',null,{...draft,id:'new-ui-id',end:'new-ui-time'}),second=flow.save('publish',null,draft);
 assert.equal(first,second);release();await first;
 assert.equal(saved[0].p_request_id,saved[1].p_request_id);assert.equal(saved[0].p_id,saved[1].p_id);assert.equal(uploads,1);
 const existing={id:saved[0].p_id,version:2,image:draft.image,imagePath:'nakatomi/photo.jpg'};
 const edit=flow.save('publish',existing,{...draft,text:'edited'});release();await edit;
 assert.equal(saved[2].p_id,existing.id);assert.equal(saved[2].p_expected_version,2);assert.equal(uploads,1);
 const remove=flow.save('publish',existing,{...draft,image:''});release();await remove;assert.equal(saved[3].p_image_path,null);
 for(const action of ['end','withdraw']){const p=flow.save(action,existing);release();await p;assert.equal(saved.at(-1).p_action,action);}
 await flow.logout();await assert.rejects(flow.list());
});

