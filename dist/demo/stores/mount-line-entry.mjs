import {consumeOAuthCode,createLineFlow} from './line-flow.mjs';
import {createLineClient} from './line-client.mjs';
import {createScreen} from './line-screen.mjs';
// Not imported by production. Explicit injected release flag defaults OFF.
export async function mountLineEntry({enabled=false,applicationEnabled=false,clientOptions,document,location,history,navigate}) {
  // Remove callback data before SDK initialization; never render or log it.
  const link=consumeOAuthCode(location,history);
  const $=id=>document.getElementById(id);
  if(!enabled){$('status').textContent='LINEログインは準備中です。';$('login').disabled=true;return ()=>{};}
  const client=createLineClient({...clientOptions,enabled:true});
  const flow=createLineFlow({client,navigate,configured:true});
  if(!applicationEnabled){
    $('request').hidden=true;$('refresh').hidden=true;
    $('login').onclick=async()=>{try{await flow.start();}catch{$('status').textContent='LINEログインを開始できませんでした。';}};
    $('logout').onclick=async()=>{try{await flow.logout();$('status').textContent='ログアウトしました。';}catch{$('status').textContent='ログアウトを確認できませんでした。';}};
    $('status').textContent='LINE接続の確認専用です。申請・通知・承認は行いません。';
    if(link){
      if(link.invalid || !link.code){$('status').textContent='LINEログインからやり直してください。';return ()=>flow.invalidate();}
      const result=await client.auth.exchangeCodeForSession(link.code);
      if(result.error){$('status').textContent='LINEログインを確認できませんでした。';return ()=>flow.invalidate();}
    }
    const verified=await client.auth.getUser();
    if(!verified.error && verified.data?.user?.identities?.some(i=>i.provider==='custom:line'))$('status').textContent='LINEとの接続を確認できました。申請はまだ保存していません。';
    return ()=>flow.invalidate();
  }
  const screen=createScreen({flow,render:view=>{
    $('status').textContent=view.text;$('request').hidden=!view.request;
    $('request').querySelector('button').disabled=Boolean(view.busy);
    $('refresh').disabled=Boolean(view.busy);
  }});
  $('login').onclick=async()=>{try{await flow.start();}catch{$('status').textContent='LINEログインを開始できませんでした。もう一度お試しください。';}};
  $('request').onsubmit=event=>{event.preventDefault();screen.submit($('name').value);};
  $('refresh').onclick=()=>screen.refresh();
  $('logout').onclick=()=>{$('name').value='';screen.logout();};
  const resume=()=>{if(!document.hidden)screen.refresh();};
  document.addEventListener('visibilitychange',resume);
  let initialUser;
  const {data}=client.auth.onAuthStateChange((_event,session)=>{
    const id=session?.user?.id;
    if(initialUser && id!==initialUser){
      flow.invalidate();
      screen.dispose();$('name').value='';$('request').hidden=true;
      $('status').textContent='ログイン状態が変わりました。ページを開き直してください。';
      $('refresh').disabled=true;$('login').disabled=true;
      $('request').onsubmit=event=>event.preventDefault();
    }
    if(id)initialUser=id;
  });
  if(link)await screen.callback(link);
  else {
    const {data:user,error}=await client.auth.getUser();
    if(!error && user?.user?.id)await screen.refresh();
  }
  return ()=>{flow.invalidate();screen.dispose();data?.subscription?.unsubscribe();document.removeEventListener('visibilitychange',resume);};
}
