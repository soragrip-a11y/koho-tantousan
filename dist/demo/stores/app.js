import {mountPostUI} from './post-ui.js';
import { STORES, VISIT_KEY, START_KEY, dayKey, readVisits, recordVisit, sampleNotices } from './model.js';
import { POST_KEY, validPhoto, loadPosts, savePosts, postStatus } from './post-model.js';

const app=document.querySelector('#app');
const store=STORES[0];
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
const localDate=value=>{const d=new Date(value);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
let cleanupUI=null;
let start=Date.now(),posts=[],editing=null,photo='',reading=false,photoToken=0,pending=false,storageError=false,renderedSignature='';
const announce=text=>document.querySelector('#notice').textContent=text;
function defaults(){return sampleNotices(store.id,start).slice(0,1).map(p=>({...p,storeId:store.id,state:'active',image:''}));}
try {
  localStorage.removeItem('koho-store-demo-v1');
  const saved=Number(localStorage.getItem(START_KEY));
  if(saved>0&&Number.isFinite(saved))start=saved;
  else localStorage.setItem(START_KEY,String(start));
  posts=loadPosts(localStorage,defaults());
} catch {posts=defaults();storageError=true;}
function persist(next){
  try {posts=savePosts(localStorage,next);storageError=false;return true;}
  catch(error){const message='保存できませんでした。'+error.message+' 写真の容量やブラウザーの保存設定を確認してください。';announce(message);const field=document.querySelector('#form-message');if(field)field.textContent=message;return false;}
}
function visited(){try{return readVisits(localStorage)[store.id+':'+dayKey()]===true;}catch{storageError=true;return false;}}
function card(post){
  const state=postStatus(post),labels={active:'このスマホのサンプル',soldout:'売り切れの表示例',ended:'掲載終了の表示例'};
  return '<article class="card"><div class="card-body"><span class="badge '+(state==='active'?'':'off')+'">'+labels[state]+'</span><h2>'+esc(post.title)+'</h2><p class="deadline">掲載期限：'+date(post.end)+'（日本時間）</p><p>'+esc(post.text)+'</p></div><img class="picture" src="'+(validPhoto(post.image)?post.image:'./placeholder.svg')+'" alt="投稿体験デモの写真。実際の販売情報ではありません"><div class="card-body"><button class="store-post-button" data-edit-post="'+esc(post.id)+'">このお知らせを変更</button></div></article>';
}
function render(){
  if(cleanupUI){cleanupUI();cleanupUI=null;}
  photoToken++;reading=false;
  const route=location.hash==='#post'?'post':location.hash==='#store/nakatomi'?'store':'line';
  app.dataset.route=route;
  if(route==='line'&&!['','#line'].includes(location.hash))history.replaceState(null,'','#line');
  if(route==='line'){
    app.innerHTML='<section class="phone single-entry"><p class="eyebrow">LINEの入口イメージ / 提案デモ</p><h1>店舗情報へ、ひと押し。</h1><div class="menu two-menu"><a class="button" href="#store/nakatomi"><strong>セブンイレブン<br>中富店</strong><small>店舗情報のデモ →</small></a><a class="button work-button" href="../../one-off.html"><strong>お仕事の依頼</strong><small>広報担当さんへ →</small></a></div><p class="muted">公式の店舗ページではありません。情報はサンプルです。</p></section><section class="demo-start"><h2>オーナーさまへの実演はこちら</h2><p>① 写真と文章を入れる → ② 保存 → ③ 客向けプレビューで確認</p><a class="button" href="#post">写真と文章の投稿体験をはじめる</a><p class="note">架空データ専用の投稿体験です。同じスマホ・同じブラウザー内にだけ保存されます。他の人への公開・送信はありません。本番管理画面やログイン機能ではありません。</p></section>';
  }else if(route==='store'){
    const done=visited();
    app.innerHTML='<section class="store-head"><p class="eyebrow">お客さま向けプレビュー / 提案デモ</p><h1>'+esc(store.name)+'</h1><p>公式の店舗ページではありません。実際の販売情報ではありません。</p><a class="button store-post-button" href="#post">新しく載せる（練習） →</a></section><section class="cards">'+(posts.filter(p=>postStatus(p)!=='withdrawn').map(card).join('')||'<p>現在のお知らせはありません。</p>')+'<section class="visit-panel"><h2>「行ったよ」を体験</h2><button id="visit" '+(done||storageError||pending?'disabled':'')+'>'+(done?'今日は受付済み':'行ったよ（デモ）')+'</button><p id="visit-message" role="status"></p><p class="muted">このブラウザー内で1日1回（日本時間0時更新）の簡易デモです。実人数・来店証明・全利用者集計ではありません。順位はありません。</p></section><p class="note">この画面の入力内容は同じブラウザー内のサンプルです。他のスマホやLINE内ブラウザー、別のブラウザーには共有されません。在庫保証はありません。</p><a href="#line">← 入口へ戻る</a></section>';
    document.querySelector('#visit').onclick=submitVisit;
  }else renderForm();
  if(storageError)announce('ブラウザー保存を確認できません。必要なら下の「デモをリセット」をお試しください。');
  renderedSignature=posts.map(p=>postStatus(p)).join()+dayKey();
}
function renderForm(){
  const existing=posts.find(p=>p.id===editing);
  cleanupUI=mountPostUI({app,existing,
    onSave:next=>{if(!persist(existing?posts.map(p=>p.id===existing.id?next:p):[next,...posts]))return false;editing=null;location.hash='store/nakatomi';announce('このスマホに載せました。ほかの人には送られていません。');return true;},
    onState:(id,state)=>{if(persist(posts.map(p=>p.id===id?{...p,state}:p))){editing=null;location.hash='store/nakatomi';}},
    onExit:()=>{editing=null;location.hash='store/nakatomi';}
  });
}
app.addEventListener('click',event=>{const button=event.target.closest('[data-edit-post]');if(button){editing=button.dataset.editPost;location.hash='post';}});
async function submitVisit(){
  if(pending)return;pending=true;document.querySelector('#visit').disabled=true;
  try{
    const persistVisit=()=>{const result=recordVisit(readVisits(localStorage),store.id);if(result.added)localStorage.setItem(VISIT_KEY,JSON.stringify(result.ledger));};
    if(navigator.locks)await navigator.locks.request(VISIT_KEY,persistVisit);else persistVisit();
  }catch{storageError=true;}
  finally{pending=false;render();}
}
document.querySelector('#reset').onclick=()=>{
  if(!confirm('このブラウザーの投稿体験の写真・文章・行ったよを消して、初期サンプルに戻しますか？'))return;
  try{
    for(const key of [POST_KEY,VISIT_KEY,START_KEY,'koho-store-demo-v1'])localStorage.removeItem(key);
    start=Date.now();localStorage.setItem(START_KEY,String(start));posts=defaults();editing=null;storageError=false;photo='';
    if(location.hash==='#line')render();else location.hash='line';
    announce('デモを初期サンプルに戻しました。');
  }catch{announce('リセットできません。ブラウザーの保存設定を確認してください。');}
};
window.addEventListener('hashchange',()=>{if(location.hash!=='#post')editing=null;render();window.scrollTo(0,0);});
window.addEventListener('storage',event=>{if([POST_KEY,VISIT_KEY].includes(event.key)&&location.hash!=='#post'){try{posts=loadPosts(localStorage,defaults());render();}catch{announce('保存内容を読み込めません。');}}});
setInterval(()=>{if(location.hash==='#store/nakatomi'&&renderedSignature!==posts.map(p=>postStatus(p)).join()+dayKey())render();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&location.hash==='#store/nakatomi')render();});
render();
