import './press-feedback.js';
// Staff-only fictional practice surface. This module is not loaded by the customer page.
import {mountPostUI} from './post-ui.js?v=20261025-2';
import {STORES,START_KEY,VISIT_KEY,sampleNotices} from './model.js';
import {POST_KEY,validPhoto,loadPosts,savePosts,postStatus} from './post-model.js';
const app=document.querySelector('#app'),store=STORES[0];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s));
let start=Date.now(),posts=[],editing=null,cleanup=null,last='';
const announce=s=>document.querySelector('#notice').textContent=s;
function defaults(){return sampleNotices(store.id,start).slice(0,1).map(p=>({...p,storeId:store.id,state:'active',image:''}));}
try{
 localStorage.removeItem('koho-store-demo-v1');
 const saved=Number(localStorage.getItem(START_KEY));
 if(saved>0&&Number.isFinite(saved))start=saved;else localStorage.setItem(START_KEY,String(start));
 posts=loadPosts(localStorage,defaults());
}catch{posts=defaults();announce('保存内容を読めませんでした。練習用の見本を表示します。');}
function persist(next){try{posts=savePosts(localStorage,next);return true;}catch{announce('保存できませんでした。写真を外すか、ブラウザーの保存設定を確認してください。');return false;}}
function signature(){return posts.map(p=>postStatus(p)).join();}
function render(){
 if(cleanup){cleanup();cleanup=null;}
 const preview=location.hash==='#preview';
 app.dataset.route=preview?'preview':'post';
 if(!preview){
  const existing=posts.find(p=>p.id===editing);
  cleanup=mountPostUI({app,existing,
   onSave:next=>{if(!persist(existing?posts.map(p=>p.id===existing.id?next:p):[next,...posts]))return false;editing=null;location.hash='preview';announce('このスマホに載せました。ほかの人には送られていません。');return true;},
   onState:(id,state)=>{if(persist(posts.map(p=>p.id===id?{...p,state}:p))){editing=null;location.hash='preview';}},
   onExit:()=>{editing=null;location.hash='preview';}
  });
  return;
 }
 const cards=posts.filter(p=>postStatus(p)!=='withdrawn').map(p=>{
  const state=postStatus(p),labels={active:'サンプルのお知らせ',soldout:'売り切れの表示例',ended:'掲載終了の表示例'};
  return '<article class="card"><div class="card-body"><span class="badge '+(state==='active'?'':'off')+'">'+labels[state]+'</span><h2>'+esc(p.title)+'</h2><p class="deadline">掲載期限：'+date(p.end)+'（日本時間）</p><p>'+esc(p.text)+'</p></div><img class="picture" src="'+(validPhoto(p.image)?p.image:'./placeholder.svg')+'" alt="練習用の写真"><div class="card-body staff-controls"><p>店員さんの練習用ボタン</p><button class="store-post-button" data-edit-post="'+esc(p.id)+'">書き直す・売り切れ・取り下げ</button></div></article>';
 }).join('');
 app.innerHTML='<section class="staff-preview-note"><h1>店員さんの見え方確認</h1><p>ここは店員さんの練習画面です。<br>下の操作ボタンは、お客さん用ページには出ません。</p><a class="button store-post-button" href="#post">新しく載せる（練習）</a></section><section class="store-head"><p class="eyebrow">お店の情報の見本</p><h2>'+esc(store.name)+'</h2><p>公式の店舗ページではありません。実際の販売情報ではありません。</p></section><section class="cards">'+(cards||'<p class="empty">現在のお知らせはありません。</p>')+'</section>';
 last=signature();
}
app.addEventListener('click',event=>{const button=event.target.closest('[data-edit-post]');if(button){editing=button.dataset.editPost;location.hash='post';}});
document.querySelector('#reset').onclick=()=>{
 if(!confirm('練習の写真・文章・行ったよを消して、最初からやり直しますか？'))return;
 try{for(const key of [POST_KEY,START_KEY,VISIT_KEY,'koho-store-demo-v1'])localStorage.removeItem(key);start=Date.now();localStorage.setItem(START_KEY,String(start));posts=defaults();editing=null;if(location.hash==='#post')render();else location.hash='post';announce('練習用の見本に戻しました。');}catch{announce('やり直せませんでした。ブラウザーの保存設定を確認してください。');}
};
window.addEventListener('hashchange',()=>{if(location.hash!=='#post')editing=null;render();window.scrollTo(0,0);});
window.addEventListener('storage',event=>{if(event.key===POST_KEY&&location.hash==='#preview'){try{posts=loadPosts(localStorage,defaults());render();}catch{announce('保存内容を読み込めませんでした。');}}});
setInterval(()=>{if(location.hash==='#preview'&&last!==signature())render();},1000);
render();
