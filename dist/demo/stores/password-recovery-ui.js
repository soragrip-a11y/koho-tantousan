export const RECOVERY_URL='https://local-koho.com/demo/stores/password-recovery.html';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function consumeRecoveryLink(location,history){
 const raw=new URLSearchParams(location.hash.slice(1)),query=new URLSearchParams(location.search),hasLink=!!location.hash||['code','error','error_code','error_description'].some(key=>query.has(key));
 // Remove all credentials and untrusted return URLs before any request or rendering.
 if(location.hash||location.search)history.replaceState(null,'',location.pathname);
 if(!hasLink)return null;
 // Preserve only a safe classification, never provider descriptions or credentials.
 if(raw.get('error_code')==='otp_expired'||query.get('error_code')==='otp_expired')return {invalid:true,reason:'expired_or_used'};
 if(raw.has('error')||query.has('error')||raw.has('error_code')||query.has('error_code'))return {invalid:true,reason:'provider_rejected'};
 if(query.has('code'))return {invalid:true,reason:'unsupported_code'};
 if(raw.get('type')!=='recovery'||!raw.get('access_token')||!raw.get('refresh_token')||raw.has('error'))return {invalid:true};
 return {access_token:raw.get('access_token'),refresh_token:raw.get('refresh_token')};
}
export function recoveryLinkMessage(reason){
 if(reason==='expired_or_used')return 'このメールのリンクは使用済み、または期限切れです。すでに「新しいパスワード」の画面を開いている場合は、その画面に戻って変更を完了してください。メールのリンクを開き直しても続きには戻れません。変更画面が残っていない場合は、時間をおいて新しいメールを1回だけ申請してください。この画面ではパスワードを変更していません。';
 if(reason==='provider_rejected')return '認証サービスがこのリンクを受け付けませんでした。開いている変更画面があればそちらで続けてください。なければ責任者へ連絡してください。この画面ではパスワードを変更していません。';
 if(reason==='unsupported_code')return 'このリンクの形式には対応していません。責任者へ連絡してください。この画面ではパスワードを変更していません。';
 return '再設定に必要なリンク情報がありません。最新メールから一度だけ開き、そのまま同じ画面で変更してください。この画面ではパスワードを変更していません。';
}
export function mountRecovery({app,client,link,confirm=window.confirm.bind(window)}){
 let busy=false,disposed=false,authorized=false,completed=false,cooldownUntil=0;
 const $=s=>app.querySelector(s);
 const status=text=>{if(!disposed)$('[role=status]').textContent=text;};
 function shell(content){app.innerHTML='<section class="easy-shell">'+content+'<p role="status" aria-live="polite"></p><p><a href="./staff.html">店員さんのログインへ戻る</a></p></section>';}
 function request(){authorized=false;shell('<h1>パスワードを忘れたとき</h1><p>登録済みのメールアドレスを入力してください。</p><form id="request"><label class="easy-label">メール<input name="email" type="email" autocomplete="username" required maxlength="254"></label><button class="easy-primary">再設定メールを送る</button></form>');
 $('#request').elements.email.oninput=()=>{if(!busy)status('入力先を変更しました。まだ新しい申請はしていません。');};
 $('#request').onsubmit=async event=>{event.preventDefault();if(busy||disposed)return;if(Date.now()<cooldownUntil){status('続けて申請できません。まず受信箱の最新メールを確認してください。この画面の待ち時間が過ぎても、送信側の制限が続く場合があります。');return;}busy=true;const form=event.currentTarget,button=form.querySelector('button'),email=form.elements.email.value.trim();button.disabled=true;cooldownUntil=Date.now()+60000;
 form.elements.email.disabled=true;status('再設定メールを申請しています。パスワードはまだ変更されていません。');
 try{const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_URL});if(error)throw error;status('再設定メールの申請を受け付けました（'+new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())+' 日本時間）。到着やパスワード変更の完了を意味しません。最新のメールを開き、変更を最後まで行ってください。');}
 catch(error){status(error?.status===429||error?.code==='over_email_send_rate_limit'?'メール送信回数の上限に達したため、今回の申請では送信できませんでした。連続して申請せず、既に届いている最新メールを確認してください。無効な場合は時間をおいて申請してください。':error?.status?'メール送信を完了できませんでした。パスワードはまだ変更されていません。責任者へ連絡してください。':'通信が途切れ、メール申請の受付を確認できませんでした。重複申請せず、受信箱を確認してください。パスワード変更はまだ完了していません。');}
 finally{busy=false;if(!disposed){button.disabled=false;form.elements.email.disabled=false;}}};
 }
 async function accept(){shell('<h1>リンクを確認しています</h1>');let tokens=link;link=null;let reason='リンクの確認が完了していません。通信を確認してください。パスワードは変更していません。';
 try{if(tokens?.invalid){reason=recoveryLinkMessage(tokens.reason);throw Error();}const {error}=await client.auth.setSession(tokens);tokens=null;if(error){reason='リンクの認証を確認できませんでした。開いている変更画面があればそちらで続けてください。この画面ではパスワードを変更していません。';throw Error();}const result=await client.auth.getUser();if(result.error||!result.data?.user?.email)throw Error();reason='店舗の権限を確認できませんでした。通信を確認するか責任者へ連絡してください。パスワードは変更していません。';const permission=await client.rpc('koho_can_manage',{p_store_id:'nakatomi'});if(permission.error)throw Error();if(permission.data!==true){reason='この店舗を操作する権限がありません。責任者へ連絡してください。パスワードは変更していません。';throw Error();}if(disposed)return;authorized=true;change(result.data.user.email);}
 catch{tokens=null;authorized=false;try{await client.auth.signOut({scope:'local'});}catch{}if(disposed)return;request();status(reason);}
 finally{if(disposed)client.auth.stopAutoRefresh?.();}
 }
 function change(email){shell('<h1>新しいパスワード</h1><p>対象：'+esc(email)+'</p><p>8文字以上で入力してください。メールへ戻らず、この画面で変更を完了してください。再読み込みや画面を閉じる操作をすると、やり直しになります。</p><form id="change"><label class="easy-label">新しいパスワード<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><label class="easy-label">もう一度入力<input name="repeat" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><button class="easy-primary">パスワードを変更する</button></form>');
 $('#change').onsubmit=async event=>{event.preventDefault();if(busy||completed||!authorized||disposed)return;const form=event.currentTarget;let password=form.elements.password.value;if(password.length<8||password!==form.elements.repeat.value){password='';status('8文字以上の同じパスワードを2回入力してください。');return;}if(!confirm('表示されたアカウントのパスワードを変更しますか？')){password='';return;}busy=true;form.querySelector('button').disabled=true;form.elements.password.value='';form.elements.repeat.value='';
 try{const {error}=await client.auth.updateUser({password});password='';if(error)throw Error();completed=true;authorized=false;try{await client.auth.signOut({scope:'local'});}catch{}if(disposed)return;shell('<h1>変更しました</h1><p>店員さんのログイン画面から、新しいパスワードで入り直してください。</p>');}
 catch{password='';status('変更を確認できませんでした。新しいパスワードでログインできるか確認してください。入れない場合は再設定メールを取り直してください。');if(!disposed)form.querySelector('button').disabled=false;}
 finally{busy=false;}};
 }
 if(link)void accept();else request();
 return ()=>{disposed=true;authorized=false;link=null;client.auth.stopAutoRefresh?.();app.replaceChildren();};
}
