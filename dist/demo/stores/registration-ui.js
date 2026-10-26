export const CALLBACK='https://local-koho.com/demo/stores/staff-register.html';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function consumeSignup(location,history){
 const hash=location.hash,search=location.search;
 const p=new URLSearchParams(hash.slice(1)),query=new URLSearchParams(search);
 if(hash||search)history.replaceState(null,'',location.pathname);
 if(!hash&&!query.has('error')&&!query.has('error_code')&&!query.has('code'))return null;
 if(p.get('type')!=='signup'||!p.get('access_token')||!p.get('refresh_token')||p.has('error')||p.has('error_code')||query.has('error')||query.has('error_code'))return {invalid:true};
 return {access_token:p.get('access_token'),refresh_token:p.get('refresh_token')};
}
// Capture and clear credentials before initializing the real SDK. This candidate
// intentionally uses memory-only sessions; a reload requires an ordinary login.
export function prepareRegistration({location,history,createClient,url,key,fetch}){
 const link=consumeSignup(location,history);
 const client=createClient(url,key,{auth:{detectSessionInUrl:false,persistSession:false,autoRefreshToken:true},...(fetch?{global:{fetch}}:{})});
 return {client,link};
}
export function mountRegistration({app,client,owner=false,link=null,confirm=window.confirm.bind(window)}){
 let busy=false,cooldown=0;
 const $=s=>app.querySelector(s);
 const status=s=>{$('[role=status]').textContent=s;};
 const shell=s=>{app.innerHTML='<section class="easy-shell"><h1>君津中富店 '+(owner?'申請の承認':'店員さんの登録')+'</h1>'+s+'<p role="status" aria-live="polite"></p><a href="./staff.html">ログインへ戻る</a></section>';};
 async function rpc(name,args){const r=await client.rpc(name,args);if(r.error)throw Error();return r.data;}
 async function action(fn){if(busy)return;busy=true;app.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch{status('処理を確認できませんでした。通信を確認し、状況を読み直してください。');}finally{busy=false;app.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function entry(){shell('<p>登録済みの方はログイン。初めての方は新規登録してください。</p><button id="login" class="easy-primary">ログイン</button>'+(!owner?'<button id="signup" class="easy-secondary">新規登録</button>':''));$('#login').onclick=()=>form(false);if(!owner)$('#signup').onclick=()=>form(true);}
 function form(signup){shell('<h2>'+ (signup?'新規登録':'ログイン')+'</h2><form><label class="easy-label">メール<input name="email" type="email" required maxlength="254" autocomplete="username"></label><label class="easy-label">パスワード'+(signup?'（8文字以上）':'')+'<input name="password" type="password" '+(signup?'minlength="8"':'')+' maxlength="128" required autocomplete="'+(signup?'new-password':'current-password')+'"></label>'+(signup?'<label class="easy-label">同じパスワードをもう一度<input name="repeat" type="password" minlength="8" maxlength="128" required autocomplete="new-password"></label><p>メールの確認後に、中富店の利用を申請します。承認されるまで投稿はできません。</p>':'')+'<button class="easy-primary">'+(signup?'確認メールを送る':'ログイン')+'</button></form><button id="back" class="easy-cancel">戻る</button>');$('#back').onclick=entry;
 $('form').onsubmit=e=>{e.preventDefault();if(busy)return;const f=e.currentTarget,email=f.elements.email.value.trim();let password=f.elements.password.value;
 if(signup&&(password.length<8||password!==f.elements.repeat.value)){status('8文字以上の同じパスワードを2回入力してください。');return;}
 if(signup&&Date.now()<cooldown){status('少し待ってからお試しください。');return;}
 void action(async()=>{f.elements.password.value='';if(signup)f.elements.repeat.value='';try{if(signup){cooldown=Date.now()+60000;const r=await client.auth.signUp({email,password,options:{emailRedirectTo:CALLBACK}});if(r.error)throw Error();await client.auth.signOut({scope:'local'});shell('<h2>メールを確認してください</h2><p>送信条件を満たす場合、確認メールが届きます。メールのリンクを開いてから、この画面で申請してください。届かない場合は責任者へ連絡してください。</p><button id="back" class="easy-secondary">ログインへ</button>');$('#back').onclick=()=>form(false);}else{const r=await client.auth.signInWithPassword({email,password});if(r.error)throw Error();await load();}}finally{password='';}});};
 }
 async function load(){const r=await client.auth.getUser();if(r.error||!r.data?.user?.email_confirmed_at)throw Error();if(owner)return approvals();const state=await rpc('koho_my_staff_request');shell('<h2>'+esc(({active:'承認済みです',none:'メールを確認できました',pending:'承認待ちです',expired:'申請の期限が切れました',rejected:'今回は承認されませんでした',approved:'権限を確認してください'})[state.state]||'状態を確認してください')+'</h2><p>中富店の投稿権限だけを申請します。申請は7日間有効です。</p>'+(['none','expired','rejected'].includes(state.state)?'<button id="request" class="easy-primary">中富店の利用を申請する</button>':'')+'<button id="refresh" class="easy-secondary">状況を確認</button><button id="logout" class="easy-cancel">ログアウト</button>');if($('#request'))$('#request').onclick=()=>action(async()=>{if(!confirm('君津中富店の利用を申請しますか？'))return;await rpc('koho_request_staff');await load();});$('#refresh').onclick=()=>action(load);$('#logout').onclick=()=>action(async()=>{await client.auth.signOut({scope:'local'});entry();});}
 async function approvals(){const rows=await rpc('koho_list_staff_requests');shell('<p>本人と中富店への所属を確認してから承認してください。他店舗や承認者の権限は付きません。</p>'+rows.map(r=>'<article class="card"><div class="card-body"><h2>'+esc(r.email)+'</h2><p>期限：'+esc(r.expires_at)+'</p><button class="easy-primary" data-id="'+esc(r.id)+'" data-approve="yes">中富店の利用を承認</button><button class="easy-cancel" data-id="'+esc(r.id)+'" data-approve="no">承認しない</button></div></article>').join('')+'<button id="refresh" class="easy-secondary">状況を確認</button><button id="logout" class="easy-cancel">ログアウト</button>');for(const b of app.querySelectorAll('[data-id]'))b.onclick=()=>action(async()=>{const approve=b.dataset.approve==='yes';const row=rows.find(r=>r.id===b.dataset.id);if(!confirm(row.email+' の中富店利用を'+(approve?'承認':'拒否')+'しますか？'))return;await rpc('koho_decide_staff_request',{p_id:row.id,p_approve:approve});await approvals();});$('#refresh').onclick=()=>action(approvals);$('#logout').onclick=()=>action(async()=>{await client.auth.signOut({scope:'local'});entry();});}
 entry();if(link)void action(async()=>{let tokens=link;link=null;if(tokens.invalid)throw Error();const r=await client.auth.setSession(tokens);tokens=null;if(r.error)throw Error();await load();});
}
