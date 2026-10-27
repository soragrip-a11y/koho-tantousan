import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {formatJapanDate} from '../dist/demo/stores/ui-format.js';
import {mountRegistration,registrationExplanation} from '../dist/demo/stores/registration-ui.js';
const tick=()=>new Promise(r=>setImmediate(r));
function setup(rows=[]){
 const {document}=parseHTML('<div id="app"></div>');const app=document.querySelector('#app');
 const calls=[];const client={deviceSession:{hasSession:true},auth:{getUser:async()=>({data:{user:{email_confirmed_at:'fixture'}}})},rpc:async(name,args)=>{calls.push({name,args});return{data:name==='koho_list_staff_requests'?rows:null}}};
 const stop=mountRegistration({app,client,owner:true,confirm:()=>false});return{app,calls,stop};
}
test('JST deadline handles day/year rollover independently of host timezone',()=>{
 assert.equal(formatJapanDate('2026-12-31T15:05:00Z'),'2027年1月1日(金) 00:05（日本時間）');
 for(const value of [null,'invalid'])assert.equal(formatJapanDate(value),'日時を確認できません');
});
test('approved and pending explanations describe their actual state',()=>{
 assert.doesNotMatch(registrationExplanation({state:'active'}),/申請を送|承認をお待ち/);
 assert.match(registrationExplanation({state:'pending',expires_at:'2026-11-01T23:00:00Z'}),/承認をお待ち.*11月2日.*日本時間/);
});
test('approval cards escape email, show JST, separate actions and keep one compact refresh',async()=>{
 const s=setup([{id:'fixture',email:'long.<script>@example.invalid',expires_at:'2026-11-01T23:27:22Z'}]);await tick();
 assert.equal(s.app.querySelector('script'),null);
 assert.equal(s.app.querySelector('.applicant-email').textContent,'long.<script>@example.invalid');
 assert.match(s.app.querySelector('.deadline').textContent,/2026年11月2日.*08:27.*日本時間/);
 assert.equal(s.app.querySelectorAll('.registration-tools #refresh').length,1);
 assert.equal(s.app.querySelector('.request-actions').querySelectorAll('button').length,2);
 s.app.querySelector('[data-approve=yes]').click();await tick();
 assert.equal(s.calls.filter(c=>c.name==='koho_decide_staff_request').length,0,'cancel must not approve');s.stop();
});
test('empty owner screen has clear empty state and retains refresh/logout',async()=>{
 const s=setup();await tick();assert.match(s.app.querySelector('.empty').textContent,/申請はありません/);
 assert.equal(s.app.querySelectorAll('#refresh').length,1);assert.ok(s.app.querySelector('#logout'));s.stop();
});
test('registration entry separates account navigation and identifies required fields',()=>{
 const {document}=parseHTML('<div id="app"></div>');const app=document.querySelector('#app');
 const stop=mountRegistration({app,client:{},confirm:()=>false});app.querySelector('#login').click();
 assert.equal(app.querySelector('form').getAttribute('aria-describedby'),'registration-status');
 assert.ok(app.querySelector('input[type=password]').hasAttribute('required'));
 assert.ok(app.querySelector('.account-links a'));assert.equal(app.querySelectorAll('#refresh').length,0);stop();
});
