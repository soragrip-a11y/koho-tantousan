import {createStoreClient} from './connection.js?v=20261025-9';
import {createDeleteOperation} from './delete-operation.js?v=20261025-10';
import {createNoticeRepository} from './notice-repository.js?v=20261025-17';
import {createSharedWorkflow} from './shared-workflow.js?v=20261025-17';
import {mountPostUI} from './post-ui.js?v=20261025-12';
import {mountEditUI} from './edit-ui.js?v=20261025-12';
import {noticeMedia} from './notice-view.js?v=20261025-13';
import {postStatus} from './post-model.js?v=20261025-10';
import './press-feedback.js';
import {accessError} from './access-errors.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dataUrl=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
// In-memory login only. No browser-local demo posts are read or migrated.
export function mountSharedStaff(app,client){
 const repo=createNoticeRepository(client),flow=createSharedWorkflow(repo),removeNotice=createDeleteOperation(client);
 let cleanup=null,rows=[],busy=false,session=false,disposed=false,epoch=0;
 function clear(){cleanup?.();cleanup=null;app.innerHTML='';}
 function message(text){app.querySelector('[role="alert"]')?.replaceChildren(document.createTextNode(text));}
 function login(){epoch++;clear();app.classList.add('easy-post');rows=[];session=false;
  app.innerHTML='<section class="easy-shell"><h1>店員さんのログイン</h1><p>投稿は共有保存されます。お店が公開設定のときは、お客さんにも表示されます。</p><form><label class="easy-label">メール<input name="email" type="email" autocomplete="username" required></label><label class="easy-label">パスワード<input name="password" type="password" autocomplete="current-password" required></label><button class="easy-primary">ログイン</button></form><p role="alert"></p><p><a href="./password-recovery.html">パスワードを忘れたとき</a></p></section>';
  app.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const form=e.currentTarget;form.querySelector('button').disabled=true;
   const email=form.elements.email.value,password=form.elements.password.value;form.elements.password.value='';
   try{await flow.login(email,password);session=true;await preview();}catch(error){login();message(error.message||accessError(error));}finally{busy=false;form.querySelector('button').disabled=false;}};
 }
 async function preview(){
  if(disposed||!session)return;
  const currentEpoch=epoch;
  let next;
  try{next=await flow.list();}catch(error){
   if(disposed||!session||currentEpoch!==epoch)return;
   clear();app.innerHTML='<section class="easy-shell"><h1>お知らせを確認できません</h1><p role="alert">'+esc(accessError(error,'list'))+'</p><button id="retry-list" class="easy-primary">一覧を読み直す</button><button id="return-login" class="easy-cancel">ログイン画面へ戻る</button></section>';
   app.querySelector('#retry-list').onclick=async e=>{e.currentTarget.disabled=true;await preview();};
   app.querySelector('#return-login').onclick=async()=>{try{await flow.logout();}finally{login();}};return;
  }
  let photoFailed=false;
  for(const p of next){p.image='';if(p.imagePath)try{p.image=await dataUrl(await repo.downloadPhoto(p.imagePath));}catch{p.photoFailed=true;photoFailed=true;}}
  if(disposed||!session||currentEpoch!==epoch)return;
  rows=next;clear();app.classList.add('easy-post');
  app.innerHTML='<section class="easy-shell"><h1>店員さんの確認画面</h1><p>お店が公開設定のときは、投稿がお客さんにも表示されます。取り下げ済み・削除未完了のお知らせは店員さんだけに表示します。</p><button id="new" class="easy-primary">新規投稿</button><p role="alert"></p></section>'+rows.map(p=>'<article class="card">'+noticeMedia(p,postStatus(p))+'<div class="card-body"><h2>'+esc(p.title)+'</h2><p>'+esc(p.text)+'</p><p>'+esc(({active:'掲載中',soldout:'終了しました',ended:'掲載期限終了',withdrawn:'取り下げ済み（旧データ）',deleting:'削除未完了'})[postStatus(p)])+'</p></div><button class="easy-primary" data-edit="'+esc(p.id)+'">このお知らせを変更</button></article>').join('')+'<section class="easy-shell"><button id="logout" class="easy-cancel">ログアウト</button></section>';
  app.querySelector('#new').onclick=()=>edit(null,false);
  if(photoFailed)message('一部の写真を読み込めませんでした。文章は表示しています。写真が読めない投稿の書き直しは、読み直してから行えます。');
  app.querySelector('#logout').onclick=async()=>{session=false;rows=[];clear();try{await flow.logout();}finally{login();}};
  for(const b of app.querySelectorAll('[data-edit]'))b.onclick=()=>edit(rows.find(p=>p.id===b.dataset.edit),false);
 }
 function edit(existing,rewrite){
  if(rewrite&&existing?.photoFailed){clear();app.innerHTML='<section class="easy-shell"><p role="alert">写真を読み込めないため、書き直しはまだできません。元の投稿は変更していません。</p><button id="retry-photo" class="easy-primary">一覧と写真を読み直す</button></section>';app.querySelector('#retry-photo').onclick=async e=>{e.currentTarget.disabled=true;await preview();};return;}
  clear();
  async function deletePost(){
   if(busy)return false;busy=true;
   try{const result=await removeNotice(existing);try{await preview();message('投稿を削除しました。非公開の操作記録（文章・写真の保存先情報）は残ります。'+(result.retained_count?'ほかの投稿が参照する写真は削除対象外です。':''));}catch{clear();app.innerHTML='<section class="easy-shell"><p>投稿の削除は完了しました。非公開の操作記録は残ります。画面の更新ができませんでした。</p><button id="reload-deleted" class="easy-primary">一覧を読み直す</button><p role="alert"></p></section>';app.querySelector('#reload-deleted').onclick=()=>preview().catch(()=>message('まだ読み込めません。時間をおいて再度お試しください。'));}}
   catch(error){try{await preview();}catch{edit({...existing,state:'deleting',image:''},false);}message(error.message||'削除は完了していません。もう一度確認してください。');}
   finally{busy=false;}return true;
  }
  async function save(action,draft){if(busy)return false;busy=true;
   try{await flow.save(action,existing,draft);}catch{busy=false;return false;}
   try{await preview();}catch{clear();app.innerHTML='<section class="easy-shell"><p>保存は完了しました。表示の更新ができませんでした。</p><button class="easy-primary" id="retry-view">保存内容を読み直す</button><p role="alert"></p></section>';app.querySelector('#retry-view').onclick=()=>preview().catch(()=>message('まだ読み込めません。時間をおいて再度お試しください。'));}finally{busy=false;}
   return true;}
  cleanup=(rewrite?mountEditUI:mountPostUI)({app,existing,onEdit:()=>edit(existing,true),onSave:p=>save('publish',p),onState:(_,s)=>s==='deleted'?deletePost():save('end'),onExit:()=>preview().catch(()=>message('読み込めませんでした。'))});
 }
 const auth=client.auth.onAuthStateChange?.(event=>{if(event==='SIGNED_OUT'){session=false;rows=[];login();}});
 login();
 return ()=>{disposed=true;session=false;rows=[];cleanup?.();auth?.data?.subscription?.unsubscribe();app.innerHTML='';};
}

mountSharedStaff(document.querySelector("#app"),createStoreClient());
