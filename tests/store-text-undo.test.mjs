import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {createTextUndo} from '../dist/demo/stores/text-undo.js';
import {mountPostUI} from '../dist/demo/stores/post-ui.js';
test('text undo retains exactly the last same-store text, never photo or timing',()=>{
 const u=createTextUndo('nakatomi');assert.equal(u.peek(),null);
 u.remember({storeId:'nakatomi',text:'first',image:'private-photo',end:'old-date'});
 assert.equal(u.peek(),'first');assert.equal(u.remember({storeId:'other',text:'foreign'}),false);assert.equal(u.peek(),'first');
 u.remember({storeId:'nakatomi',text:'second'});assert.equal(u.peek(),'second');
 u.clear();assert.equal(u.peek(),null);assert.equal(createTextUndo('nakatomi').peek(),null);
});
test('restored text opens an unpublished new draft without photo or expired schedule',()=>{
 const {document,window}=parseHTML('<div id="app"></div>');globalThis.window=window;window.scrollTo=()=>{};
 const app=document.querySelector('#app');let saves=0;
 const stop=mountPostUI({app,initialText:'<script>example</script>',onSave:()=>{saves++;},onExit:()=>{}});
 assert.equal(app.querySelector('#words').value,'<script>example</script>');assert.equal(app.querySelector('script'),null);
 assert.equal(app.querySelector('img'),null);assert.equal(saves,0);assert.equal(app.dataset.step,'2');stop();
});
test('successful delete enables one text restore; logout and account change clear it',async()=>{
 const {document,window}=parseHTML('<div id="app"></div>');globalThis.document=document;globalThis.window=window;window.scrollTo=()=>{};globalThis.confirm=()=>true;
 let source=fs.readFileSync(new URL('../dist/demo/stores/app.js',import.meta.url),'utf8');
 source=source.replace(/mountSharedStaff\(document.querySelector\("#app"\),createStoreClient\(\{staff:true\}\)\);/,'');
 source=source.replace(/from '(\.\/[^']+)'/g,(_,s)=>'from '+JSON.stringify(new URL('../dist/demo/stores/'+s.slice(2),import.meta.url).href));
 source=source.replace("import './press-feedback.js';",'');
 const {mountSharedStaff}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 let authCallback;const calls=[];let rows=[{id:'test',store_id:'nakatomi',title:'fixture',body:'restore me',state:'active',version:1,image_path:null,expires_at:null}];
 const client={deviceSession:{hasSession:true},auth:{getUser:async()=>({data:{user:{id:'u1'}}}),signOut:async()=>({}),onAuthStateChange:fn=>{authCallback=fn;return{data:{subscription:{unsubscribe(){}}}};}},rpc:async(name)=>{calls.push(name);if(name==='koho_can_manage')return{data:true};if(name==='koho_list_staff_notices')return{data:rows};if(name==='koho_prepare_delete'){rows=[];return{data:{done:true,retained_count:0}};}return{data:false};}};
 const app=document.querySelector('#app');const stop=mountSharedStaff(app,client);authCallback('INITIAL_SESSION',{user:{id:'u1'}});const tick=()=>new Promise(r=>setTimeout(r,0));await tick();await tick();
 app.querySelector('[data-edit]').click();app.querySelector('#withdraw').click();await tick();await tick();
 assert.ok(app.querySelector('#restore-text'));const before=calls.length;app.querySelector('#restore-text').click();
 assert.equal(app.querySelector('#words').value,'restore me');assert.equal(calls.length,before);assert.equal(app.querySelector('img'),null);
 authCallback('SIGNED_IN',{user:{id:'u2'}});assert.equal(app.querySelector('#words'),null);assert.doesNotMatch(app.textContent,/restore me/);
 authCallback('SIGNED_OUT',null);assert.equal(app.querySelector('#restore-text'),null);assert.doesNotMatch(app.textContent,/restore me/);stop();
});
