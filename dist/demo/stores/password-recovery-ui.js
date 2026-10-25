export const RECOVERY_URL='https://local-koho.com/demo/stores/password-recovery.html';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function consumeRecoveryLink(location,history){
 const raw=new URLSearchParams(location.hash.slice(1)),hasLink=!!location.hash||new URLSearchParams(location.search).has('code')||new URLSearchParams(location.search).has('error');
 // Remove all credentials and untrusted return URLs before any request or rendering.
 if(location.hash||location.search)history.replaceState(null,'',location.pathname);
 if(!hasLink)return null;
 if(raw.get('type')!=='recovery'||!raw.get('access_token')||!raw.get('refresh_token')||raw.has('error'))return {invalid:true};
 return {access_token:raw.get('access_token'),refresh_token:raw.get('refresh_token')};
}
export function mountRecovery({app,client,link,confirm=window.confirm.bind(window)}){
 let busy=false,disposed=false,authorized=false,completed=false,cooldownUntil=0;
 const $=s=>app.querySelector(s);
 const status=text=>{if(!disposed)$('[role=status]').textContent=text;};
 function shell(content){app.innerHTML='<section class="easy-shell">'+content+'<p role="status" aria-live="polite"></p><p><a href="./staff.html">店員さんのログインへ戻る</a></p></section>';}
 function request(){authorized=false;shell('<h1>パスワードを忘れたとき</h1><p>登録済みのメールアドレスを入力してください。</p><form id="request"><label class="easy-label">メール<input name="email" type="email" autocomplete="username" required maxlength="254"></label><button class="easy-primary">再設定メールを送る</button></form>');
 $('#request').onsubmit=async event=>{event.preventDefault();if(busy||disposed)return;if(Date.now()<cooldownUntil){status('少し待ってから、もう一度お試しください。');return;}busy=true;const form=event.currentTarget,button=form.querySelector('button'),email=form.elements.email.value.trim();button.disabled=true;cooldownUntil=Date.now()+60000;
 try{const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_URL});if(error)throw Error();status('登録と送信条件を満たす場合、メールが届きます。迷惑メールも確認してください。届かない場合は責任者へ連絡してください。');}
 catch{status('メール送信を完了できませんでした。時間をおいて再試行するか、責任者へ連絡してください。');}
 finally{busy=false;if(!disposed)button.disabled=false;}};
 }
 async function accept(){shell('<h1>リンクを確認しています</h1>');let tokens=link;link=null;
 try{if(tokens?.invalid)throw Error();const {error}=await client.auth.setSession(tokens);tokens=null;if(error)throw Error();const result=await client.auth.getUser();if(result.error||!result.data?.user?.email)throw Error();const permission=await client.rpc('koho_can_manage',{p_store_id:'nakatomi'});if(permission.error||permission.data!==true)throw Error();if(disposed)return;authorized=true;change(result.data.user.email);}
 catch{tokens=null;authorized=false;try{await client.auth.signOut({scope:'local'});}catch{}if(disposed)return;request();status('リンクが無効・期限切れ、または店舗の権限を確認できませんでした。再設定メールを取り直すか、責任者へ連絡してください。');}
 }
 function change(email){shell('<h1>新しいパスワード</h1><p>対象：'+esc(email)+'</p><p>12文字以上で入力してください。閉じると確認し直しになります。</p><form id="change"><label class="easy-label">新しいパスワード<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><label class="easy-label">もう一度入力<input name="repeat" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><button class="easy-primary">パスワードを変更する</button></form>');
 $('#change').onsubmit=async event=>{event.preventDefault();if(busy||completed||!authorized||disposed)return;const form=event.currentTarget;let password=form.elements.password.value;if(password.length<12||password!==form.elements.repeat.value){password='';status('12文字以上の同じパスワードを2回入力してください。');return;}if(!confirm('表示されたアカウントのパスワードを変更しますか？')){password='';return;}busy=true;form.querySelector('button').disabled=true;form.elements.password.value='';form.elements.repeat.value='';
 try{const {error}=await client.auth.updateUser({password});password='';if(error)throw Error();completed=true;authorized=false;try{await client.auth.signOut({scope:'local'});}catch{}if(disposed)return;shell('<h1>変更しました</h1><p>店員さんのログイン画面から、新しいパスワードで入り直してください。</p>');}
 catch{password='';status('変更を確認できませんでした。新しいパスワードでログインできるか確認してください。入れない場合は再設定メールを取り直してください。');if(!disposed)form.querySelector('button').disabled=false;}
 finally{busy=false;}};
 }
 if(link)void accept();else request();
 return ()=>{disposed=true;authorized=false;link=null;app.replaceChildren();};
}
