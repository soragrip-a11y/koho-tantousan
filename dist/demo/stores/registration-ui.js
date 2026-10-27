import {rememberMarkup} from './device-session.js?v=20261026-23';
import {submitWithNotification,retryNotification} from './notification-client.js?v=20261026-22';
import {watchApproval} from './approval-refresh.js?v=20261026-21';
import {formatJapanDate} from './ui-format.js?v=20261027-1';
export const CALLBACK='https://local-koho.com/demo/stores/staff-register.html';
export function registrationExplanation(state){
 if(state.state==='active')return '中富店の投稿画面を利用できます。';
 if(state.state==='pending')return '責任者の承認をお待ちください。'+(state.expires_at?'申請期限：'+formatJapanDate(state.expires_at):'申請は7日間有効です。');
 if(state.state==='expired')return '申請の有効期限が過ぎました。必要な場合は、もう一度申請してください。';
 if(state.state==='rejected')return '確認が必要な場合は責任者へ連絡してください。再申請には時間を置く必要があります。';
 if(state.state==='approved')return '承認状況と投稿権限が一致していません。責任者へ確認してください。';
 return '中富店で投稿するための利用申請を送ります。責任者の承認後に投稿できるようになります。';
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function consumeSignup(location,history){
 const hash=location.hash,search=location.search;
 const p=new URLSearchParams(hash.slice(1)),query=new URLSearchParams(search);
 if(hash||search)history.replaceState(null,'',location.pathname);
 if(!hash&&!query.has('error')&&!query.has('error_code')&&!query.has('code'))return null;
 if(p.get('type')!=='signup'||!p.get('access_token')||!p.get('refresh_token')||p.has('error')||p.has('error_code')||query.has('error')||query.has('error_code'))return {invalid:true};
 return {access_token:p.get('access_token'),refresh_token:p.get('refresh_token')};
}
// Capture and clear callback credentials before SDK initialization.
// Callback sessions stay isolated until explicit same-tab continuation.
export function prepareRegistration({location,history,createClient,url,key,fetch}){
 const link=consumeSignup(location,history);
 const client=createClient(url,key,{auth:{detectSessionInUrl:false,persistSession:false,autoRefreshToken:true},deviceMemoryOnly:Boolean(link),...(fetch?{global:{fetch}}:{})});
 return {client,link};
}
export function mountRegistration({app,client,owner=false,link=null,confirm=window.confirm.bind(window)}){
 let busy=false,cooldown=0,stopWatch=null,stopNotice=null;
 const $=s=>app.querySelector(s);
 const status=s=>{$('[role=status]').textContent=s;};
 const shell=s=>{stopWatch?.();stopWatch=null;stopNotice?.();stopNotice=null;app.innerHTML='<section class="easy-shell"><p class="store-context">君津中富店</p><h1>'+(owner?'申請の承認':'店員さんの登録')+'</h1>'+s+'<p id="registration-status" role="status" aria-live="polite" aria-atomic="true"></p><div class="account-links"><a href="./staff.html">店員さんのログインへ戻る</a></div></section>';};
 function compactRefresh(){const b=$('#refresh');if(!b)return;b.textContent='更新';b.classList.add('registration-refresh');const bar=app.ownerDocument.createElement('div');bar.className='registration-tools';bar.append(b);$('.easy-shell').prepend(bar);}
 async function rpc(name,args){const r=await client.rpc(name,args);if(r.error)throw Error();return r.data;}
 async function action(fn){if(busy)return;busy=true;app.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch{status('処理を確認できませんでした。通信を確認し、状況を読み直してください。');}finally{busy=false;app.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function entry(){shell('<p>'+(owner?'承認を担当する方のアカウントでログインしてください。':'登録済みの方はログイン。初めての方は新規登録してください。')+'</p><button id="login" class="easy-primary">ログイン</button>'+(!owner?'<button id="signup" class="easy-secondary">新規登録</button>':''));$('#login').onclick=()=>form(false);if(!owner)$('#signup').onclick=()=>form(true);}
 function form(signup){shell('<h2>'+ (signup?'新規登録':'ログイン')+'</h2><form aria-describedby="registration-status"><p class="required-note">メールアドレス・パスワードは必須です。</p><label class="easy-label">メールアドレス<input name="email" type="email" required maxlength="254" autocomplete="username"></label><label class="easy-label">パスワード'+(signup?'（8文字以上）':'')+'<input name="password" type="password" '+(signup?'minlength="8"':'')+' maxlength="128" required autocomplete="'+(signup?'new-password':'current-password')+'"></label>'+(signup?'<label class="easy-label">同じパスワードをもう一度<input name="repeat" type="password" minlength="8" maxlength="128" required autocomplete="new-password"></label><p>メールの確認後に、中富店の利用を申請します。承認されるまで投稿はできません。</p>':'')+(!signup?rememberMarkup:'')+'<button class="easy-primary">'+(signup?'確認メールを送る':'ログイン')+'</button></form><button id="back" class="easy-cancel">登録メニューへ戻る</button>');$('#back').onclick=entry;
 $('form').onsubmit=e=>{e.preventDefault();if(busy)return;const f=e.currentTarget,email=f.elements.email.value.trim();let password=f.elements.password.value;
 if(signup&&(password.length<8||password!==f.elements.repeat.value)){status('8文字以上の同じパスワードを2回入力してください。');return;}
 if(signup&&Date.now()<cooldown){status('少し待ってからお試しください。');return;}
 void action(async()=>{f.elements.password.value='';if(signup)f.elements.repeat.value='';try{if(signup){cooldown=Date.now()+60000;const r=await client.auth.signUp({email,password,options:{emailRedirectTo:CALLBACK}});if(r.error)throw Error();await client.auth.signOut({scope:'local'});shell('<h2>メールを確認してください</h2><p>送信条件を満たす場合、確認メールが届きます。メールのリンクを開いてから、この画面で申請してください。届かない場合は責任者へ連絡してください。</p><button id="back" class="easy-secondary">ログインへ</button>');$('#back').onclick=()=>form(false);}else{client.deviceSession?.choose(f.elements.remember.checked);const r=await client.auth.signInWithPassword({email,password});if(r.error)throw Error();await load();}}finally{password='';}});};
 }
 async function load(){const r=await client.auth.getUser();if(r.error||!r.data?.user?.email_confirmed_at)throw Error();if(owner)return approvals();const state=await rpc('koho_my_staff_request');shell('<h2>'+esc(({active:'承認済みです',none:'メールを確認できました',pending:'承認待ちです',expired:'申請の期限が切れました',rejected:'今回は承認されませんでした',approved:'権限を確認してください'})[state.state]||'状態を確認してください')+'</h2><p>'+esc(registrationExplanation(state))+'</p>'+(['none','expired','rejected'].includes(state.state)?'<button id="request" class="easy-primary">中富店の利用を申請する</button>':'')+'<button id="refresh" class="easy-secondary">更新</button><button id="logout" class="easy-cancel">ログアウト（保持を解除）</button>');compactRefresh();if(state.state==='pending'&&app.ownerDocument.defaultView?.setTimeout)stopWatch=watchApproval({window:app.ownerDocument.defaultView,check:async()=>{if(busy)return 'pending';return (await rpc('koho_my_staff_request')).state;},onChange:()=>action(load),onError:()=>status('最新の承認状況を取得できません。「更新」で読み直せます。')});if(state.state==='pending'&&app.ownerDocument.defaultView?.setTimeout)stopNotice=retryNotification({client,window:app.ownerDocument.defaultView,onPending:()=>status('申請は保存されています。通知の確認待ちです。')});if(state.state==='active'){const a=app.ownerDocument.createElement('a');a.href='./staff.html';a.className='easy-primary';a.textContent='投稿画面へ進む';a.onclick=e=>{try{client.deviceSession?.continueInTab();}catch{e.preventDefault();status('ログイン状態を引き継げません。投稿画面でログインしてください。');}};app.querySelector('#logout').before(a);app.querySelector('.account-links').hidden=true;}if($('#request'))$('#request').onclick=()=>action(async()=>{if(!confirm('君津中富店の利用を申請しますか？'))return;const result=await submitWithNotification(client);await load();if(result.error)status('通信結果を確認できませんでした。表示された申請状況を確認してください。');});$('#refresh').onclick=()=>action(load);$('#logout').onclick=()=>action(async()=>{await client.auth.signOut({scope:'local'});entry();});}
 async function approvals(){const rows=await rpc('koho_list_staff_requests');shell('<p>本人と中富店への所属を確認してから承認してください。他店舗や承認者の権限は付きません。</p><p class="request-count">承認待ち：'+rows.length+'件</p>'+(rows.length?'':'<p class="empty">承認待ちの申請はありません。</p>')+rows.map(r=>'<article class="card request-card"><div class="card-body"><span class="badge">承認待ち</span><h2 class="applicant-email">'+esc(r.email)+'</h2><p class="deadline">申請期限：'+esc(formatJapanDate(r.expires_at))+'</p><div class="request-actions"><button class="easy-primary" data-id="'+esc(r.id)+'" data-approve="yes">中富店の利用を承認</button><button class="easy-cancel" data-id="'+esc(r.id)+'" data-approve="no">承認しない</button></div></div></article>').join('')+'<button id="refresh" class="easy-secondary">更新</button><button id="logout" class="easy-cancel">ログアウト</button>');compactRefresh();for(const b of app.querySelectorAll('[data-id]'))b.onclick=()=>action(async()=>{const approve=b.dataset.approve==='yes';const row=rows.find(r=>r.id===b.dataset.id);if(!confirm(row.email+' の中富店利用を'+(approve?'承認':'拒否')+'しますか？'))return;await rpc('koho_decide_staff_request',{p_id:row.id,p_approve:approve});await approvals();});$('#refresh').onclick=()=>action(approvals);$('#logout').onclick=()=>action(async()=>{await client.auth.signOut({scope:'local'});entry();});}
 entry();if(!link&&client.deviceSession?.hasSession)void action(load);if(link)void action(async()=>{let tokens=link;link=null;if(tokens.invalid)throw Error();const r=await client.auth.setSession(tokens);tokens=null;if(r.error)throw Error();await load();});
 return ()=>{stopWatch?.();stopWatch=null;stopNotice?.();stopNotice=null;};
}
