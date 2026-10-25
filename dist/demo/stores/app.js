import {createStoreClient} from './connection.js?v=20261025-9';
import {createNoticeRepository} from './notice-repository.js?v=20261025-9';
import {createSharedWorkflow} from './shared-workflow.js?v=20261025-9';
import {mountPostUI} from './post-ui.js?v=20261025-9';
import {mountEditUI} from './edit-ui.js?v=20261025-9';
import {noticeMedia} from './notice-view.js';
import {postStatus} from './post-model.js';
import './press-feedback.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dataUrl=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
// In-memory login only. No browser-local demo posts are read or migrated.
export function mountSharedStaff(app,client){
 const repo=createNoticeRepository(client),flow=createSharedWorkflow(repo);
 let cleanup=null,rows=[],busy=false,session=false,disposed=false,epoch=0;
 function clear(){cleanup?.();cleanup=null;app.innerHTML='';}
 function message(text){app.querySelector('[role="alert"]')?.replaceChildren(document.createTextNode(text));}
 function login(){epoch++;clear();app.classList.add('easy-post');rows=[];session=false;
  app.innerHTML='<section class="easy-shell"><h1>店員さんのログイン</h1><p>共有保存の接続確認用です。一般公開は停止中です。</p><form><label class="easy-label">メール<input name="email" type="email" autocomplete="username" required></label><label class="easy-label">パスワード<input name="password" type="password" autocomplete="current-password" required></label><button class="easy-primary">ログイン</button></form><p role="alert"></p></section>';
  app.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const form=e.currentTarget;form.querySelector('button').disabled=true;
   const email=form.elements.email.value,password=form.elements.password.value;form.elements.password.value='';
   try{await flow.login(email,password);session=true;await preview();}catch{login();message('ログインまたは権限確認ができませんでした。');}finally{busy=false;form.querySelector('button').disabled=false;}};
 }
 async function preview(){
  if(disposed||!session)return;
  const currentEpoch=epoch;
  const next=await flow.list();
  for(const p of next)p.image=p.imagePath?await dataUrl(await repo.downloadPhoto(p.imagePath)):'';
  if(disposed||!session||currentEpoch!==epoch)return;
  rows=next;clear();app.classList.add('easy-post');
  app.innerHTML='<section class="easy-shell"><h1>店員さんの確認画面</h1><p>一般公開は停止中です。取り下げたお知らせも店員さんだけに表示します。</p><button id="new" class="easy-primary">新しく載せる</button><button id="reload" class="easy-secondary">最新の内容を確認</button><button id="logout" class="easy-cancel">ログアウト</button><p role="alert"></p></section>'+rows.map(p=>'<article class="card"><div class="card-body"><h2>'+esc(p.title)+'</h2><p>'+esc(p.text)+'</p><p>'+esc(({active:'掲載中',soldout:'終了しました',ended:'掲載期限終了',withdrawn:'取り下げ済み'})[postStatus(p)])+'</p></div>'+noticeMedia(p,postStatus(p))+'<button class="easy-primary" data-edit="'+esc(p.id)+'">このお知らせを変更</button></article>').join('');
  app.querySelector('#new').onclick=()=>edit(null,false);
  app.querySelector('#reload').onclick=()=>preview().catch(()=>message('読み込めませんでした。'));
  app.querySelector('#logout').onclick=async()=>{session=false;rows=[];clear();try{await flow.logout();}finally{login();}};
  for(const b of app.querySelectorAll('[data-edit]'))b.onclick=()=>edit(rows.find(p=>p.id===b.dataset.edit),false);
 }
 function edit(existing,rewrite){clear();
  async function save(action,draft){if(busy)return false;busy=true;
   try{await flow.save(action,existing,draft);}catch{busy=false;return false;}
   try{await preview();}catch{clear();app.innerHTML='<section class="easy-shell"><p>保存は完了しました。表示の更新ができませんでした。</p><button class="easy-primary" id="retry-view">保存内容を読み直す</button><p role="alert"></p></section>';app.querySelector('#retry-view').onclick=()=>preview().catch(()=>message('まだ読み込めません。時間をおいて再度お試しください。'));}finally{busy=false;}
   return true;}
  cleanup=(rewrite?mountEditUI:mountPostUI)({app,existing,onEdit:()=>edit(existing,true),onSave:p=>save('publish',p),onState:(_,s)=>save(s==='soldout'?'end':'withdraw'),onExit:()=>preview().catch(()=>message('読み込めませんでした。'))});
 }
 const auth=client.auth.onAuthStateChange?.(event=>{if(event==='SIGNED_OUT'){session=false;rows=[];login();}});
 login();
 return ()=>{disposed=true;session=false;rows=[];cleanup?.();auth?.data?.subscription?.unsubscribe();app.innerHTML='';};
}

mountSharedStaff(document.querySelector("#app"),createStoreClient());
