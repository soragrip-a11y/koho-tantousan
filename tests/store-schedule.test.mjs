import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {fromJapanInput,lifecycle,publicPosts,validateSchedule,NO_EXPIRY_NOTE} from '../dist/demo/stores/schedule.js';
import {mountPostUI} from '../dist/demo/stores/post-ui.js';
import {createSharedWorkflow} from '../dist/demo/stores/shared-workflow.js';
import {watchCustomer} from '../dist/demo/stores/customer-refresh.js';
import {mountDemo} from '../dist/demo/stores/staff-demo.js';
import {mountEditUI} from '../dist/demo/stores/edit-ui.js';
test('Japan schedule crosses midnight; exact start/end, no expiry and legacy expiry',()=>{
 const start=fromJapanInput('2026-12-31T23:00'),end=fromJapanInput('2027-01-01T01:00');
 assert.equal(start,'2026-12-31T14:00:00.000Z');assert.equal(end,'2026-12-31T16:00:00.000Z');
 for(const value of ['2026-02-30T15:00','2026-01-01T24:00',''])assert.throws(()=>fromJapanInput(value));
 assert.throws(()=>validateSchedule({start,end:start}));assert.throws(()=>validateSchedule({start:end,end:start}));
 const p={id:'sale',state:'active',start,end};
 assert.equal(lifecycle(p,Date.parse(start)-1),'scheduled');assert.equal(lifecycle(p,Date.parse(start)),'active');assert.equal(lifecycle(p,Date.parse(end)),'ended');
 assert.equal(lifecycle({...p,state:'soldout'},Date.parse(start)),'soldout');
 assert.equal(lifecycle({state:'active',end:null},Date.parse(end)+1e12),'active');
 assert.equal(lifecycle({state:'active',end},Date.parse(end)),'ended');
 assert.deepEqual(publicPosts([p],Date.parse(start)-1),[]);
 assert.deepEqual(publicPosts([{id:'old',state:'ended',end},{id:'live',state:'active',end:null}],Date.parse(end)).map(p=>p.id),['live','old']);
});
test('real post form defaults to unlimited, previews JST and repeated click submits once',async()=>{
 const {document,window}=parseHTML('<div id="app"></div>');const original=globalThis.window;window.scrollTo=()=>{};globalThis.window=window;
 try{const app=document.querySelector('#app');let calls=0,release;const stop=mountPostUI({app,onSave:async p=>{calls++;assert.equal(p.end,null);assert.equal(p.start,null);await new Promise(r=>release=r);return true;}});
 app.querySelector('#next').click();app.querySelector('#words').value='新商品';app.querySelector('#next').click();
 assert.match(app.textContent,/時間指定なし・終了期限なし/);const button=app.querySelector('#publish');button.onclick();button.onclick();assert.equal(calls,1);release();stop();
 }finally{globalThis.window=original;}
});
test('schedule participates in retry identity, same schedule deduplicates after uncertain save',async()=>{
 let fail=true;const ops=[];const flow=createSharedWorkflow({signIn:async()=>{},save:async op=>{ops.push(op);if(fail)throw Error('lost response');return {};}});await flow.login('fixture','unused');
 const draft={title:'Sale',text:'Sample',start:fromJapanInput('2027-01-01T15:00'),end:fromJapanInput('2027-01-01T19:00')};
 await assert.rejects(flow.save('publish',null,draft));fail=false;await flow.save('publish',null,draft);assert.equal(ops[0].p_request_id,ops[1].p_request_id);assert.equal(ops[0].p_starts_at,draft.start);
 await flow.save('publish',null,{...draft,end:fromJapanInput('2027-01-01T20:00')});assert.notEqual(ops[1].p_request_id,ops[2].p_request_id);assert.equal(NO_EXPIRY_NOTE,'すでに終了している場合があります');
});
test('open customer page refreshes boundaries, polls only when visible, resumes immediately and disposes',()=>{
 const doc=new EventTarget(),win=new EventTarget(),timers=new Map();let now=0,reads=0,paints=0;doc.hidden=false;
 const p={state:'active',start:new Date(1000).toISOString(),end:new Date(2000).toISOString()};
 const stop=watchCustomer({document:doc,window:win,read:()=>reads++,render:()=>paints++,signature:()=>lifecycle(p,now),setInterval:(f,ms)=>{timers.set(ms,f);return ms;},clearInterval:id=>timers.delete(id)});
 now=1000;timers.get(1000)();assert.equal(paints,1);timers.get(1000)();assert.equal(paints,1);timers.get(30000)();assert.equal(reads,1);
 doc.hidden=true;timers.get(30000)();assert.equal(reads,1);now=2000;doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(reads,2);assert.equal(paints,2);
 win.dispatchEvent(new Event('pageshow'));assert.equal(reads,3);stop();win.dispatchEvent(new Event('focus'));assert.equal(reads,3);assert.equal(timers.size,0);
});
test('synthetic demo shares lifecycle; future hidden, exact bounds and unlimited footer without backend',async()=>{
 const {document}=parseHTML('<div id="demo"></div>'),root=document.querySelector('#demo');const stop=mountDemo(root,{readPhoto:async()=>'data:image/jpeg;base64,YQ=='}),$=s=>root.querySelector(s);
 await $('#demo-library').onchange({target:{files:[{}]}});$('#demo-title').value='Test';$('#demo-text').value='Synthetic';
 // linkedom select value is derived from the selected option.
 const select=$('#schedule-mode');for(const o of select.querySelectorAll('option'))o.selected=o.value==='timed';
 $('#schedule-start').value='2099-01-01T15:00';$('#schedule-end').value='2099-01-01T19:00';$('#demo-form').onsubmit({preventDefault(){}});$('#demo-publish').click();
 assert.equal(root.querySelectorAll('.demo-customer article').length,0);$('#clock-start').click();assert.equal(root.querySelectorAll('.demo-customer article').length,1);assert.equal(root.querySelectorAll('.demo-customer .demo-ended-overlay').length,0);
 $('#clock-end').click();assert.equal(root.querySelectorAll('.demo-customer .demo-ended-overlay').length,1);
 await $('#demo-library').onchange({target:{files:[{}]}});$('#demo-title').value='Unlimited';$('#demo-text').value='Synthetic';$('#demo-form').onsubmit({preventDefault(){}});$('#demo-publish').click();assert.match($('.demo-customer').textContent,/すでに終了している場合があります/);stop();
});
test('real edit preserves existing expiry, rejects reversed dates and can explicitly remove expiry',async()=>{
 const {document}=parseHTML('<div id="app"></div>'),app=document.querySelector('#app');const original=globalThis.confirm;globalThis.confirm=()=>true;
 try{const existing={id:'fixture',text:'Existing',state:'active',publishedAt:'2026-10-28T06:00:00Z',end:'2026-10-28T10:00:00Z'};let saved;
 const stop=mountEditUI({app,existing,onSave:async p=>{saved=p;return true;}});
 assert.equal(app.querySelector('#schedule-start').value,'2026-10-28T15:00');assert.equal(app.querySelector('#schedule-end').value,'2026-10-28T19:00');
 app.querySelector('#schedule-end').value='2026-10-28T14:00';await app.querySelector('#publish').onclick();assert.equal(saved,undefined);assert.match(app.querySelector('[role=alert]').textContent,/終了は開始より後/);
 const select=app.querySelector('#schedule-mode');for(const o of select.querySelectorAll('option'))o.selected=false;select.querySelector('option[value=none]').selected=true;await app.querySelector('#publish').onclick();assert.equal(saved.end,null);assert.equal(saved.start,null);assert.equal(saved.id,existing.id);stop();
 }finally{globalThis.confirm=original;}
});
