import { STORES, VISIT_KEY, START_KEY, dayKey, readVisits, recordVisit, sampleNotices } from './model.js';
import { POST_KEY, validPhoto, loadPosts, savePosts, postStatus } from './post-model.js';

const app=document.querySelector('#app');
const store=STORES[0];
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
const localDate=value=>{const d=new Date(value);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
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
  return '<article class="card"><div class="card-body"><span class="badge '+(state==='active'?'':'off')+'">'+labels[state]+'</span><h2>'+esc(post.title)+'</h2><p class="deadline">掲載期限：'+date(post.end)+'（日本時間）</p><p>'+esc(post.text)+'</p></div><img class="picture" src="'+(validPhoto(post.image)?post.image:'./placeholder.svg')+'" alt="投稿体験デモの写真。実際の販売情報ではありません"></article>';
}
function render(){
  photoToken++;reading=false;
  const route=location.hash==='#post'?'post':location.hash==='#store/nakatomi'?'store':'line';
  app.dataset.route=route;
  if(route==='line'&&!['','#line'].includes(location.hash))history.replaceState(null,'','#line');
  if(route==='line'){
    app.innerHTML='<section class="phone single-entry"><p class="eyebrow">LINEの入口イメージ / 提案デモ</p><h1>店舗情報へ、ひと押し。</h1><div class="menu two-menu"><a class="button" href="#store/nakatomi"><strong>セブンイレブン<br>中富店</strong><small>店舗情報のデモ →</small></a><a class="button work-button" href="../../one-off.html"><strong>お仕事の依頼</strong><small>広報担当さんへ →</small></a></div><p class="muted">公式の店舗ページではありません。情報はサンプルです。</p></section><section class="demo-start"><h2>オーナーさまへの実演はこちら</h2><p>① 写真と文章を入れる → ② 保存 → ③ 客向けプレビューで確認</p><a class="button" href="#post">写真と文章の投稿体験をはじめる</a><p class="note">架空データ専用の投稿体験です。同じスマホ・同じブラウザー内にだけ保存されます。他の人への公開・送信はありません。本番管理画面やログイン機能ではありません。</p></section>';
  }else if(route==='store'){
    const done=visited();
    app.innerHTML='<section class="store-head"><p class="eyebrow">お客さま向けプレビュー / 提案デモ</p><h1>'+esc(store.name)+'</h1><p>公式の店舗ページではありません。実際の販売情報ではありません。</p><a href="#post">写真と文章の投稿体験へ戻る →</a></section><section class="cards">'+posts.map(card).join('')+'<section class="visit-panel"><h2>「行ったよ」を体験</h2><button id="visit" '+(done||storageError||pending?'disabled':'')+'>'+(done?'今日は受付済み':'行ったよ（デモ）')+'</button><p id="visit-message" role="status"></p><p class="muted">このブラウザー内で1日1回（日本時間0時更新）の簡易デモです。実人数・来店証明・全利用者集計ではありません。順位はありません。</p></section><p class="note">この画面の入力内容は同じブラウザー内のサンプルです。他のスマホやLINE内ブラウザー、別のブラウザーには共有されません。在庫保証はありません。</p><a href="#line">← 入口へ戻る</a></section>';
    document.querySelector('#visit').onclick=submitVisit;
  }else renderForm();
  if(storageError)announce('ブラウザー保存を確認できません。必要なら下の「デモをリセット」をお試しください。');
  renderedSignature=posts.map(p=>postStatus(p)).join()+dayKey();
}
function renderForm(){
  const existing=posts.find(p=>p.id===editing);
  let committed=false;
  photo=existing?.image||'';
  app.innerHTML='<p class="eyebrow">写真と文章 / 投稿体験デモ</p><h1>中富店の情報を<br>このスマホで試す</h1><p class="note">架空の文章・写真だけでお試しください。本番の管理画面ではなく、認証もありません。保存先は同じブラウザー内だけ。他の人へ公開・送信されません。実際の履歴・利用者データは扱いません。</p><form class="form" id="editor"><h2>'+(existing?'サンプルを編集':'① 写真と文章を入れる')+'</h2><label for="photo">写真（任意・JPEG / PNG / WebP・2MBまで）</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp"><small>最大960pxに縮小してこのブラウザーだけに保存します。</small><img id="preview" class="preview" alt="選択したデモ写真" '+(photo?'src="'+photo+'"':'hidden')+'><button id="remove-photo" type="button" class="quiet">写真を外す</button><label for="title">見出し（必須・40文字まで）</label><input id="title" required maxlength="40" placeholder="例：お知らせの掲載見本" value="'+esc(existing?.title||'')+'"><label for="text">文章（必須・180文字まで）</label><textarea id="text" required maxlength="180" placeholder="実演用の短い文章を入れてください">'+esc(existing?.text||'')+'</textarea><label for="end">掲載終了日時（必須）</label><input id="end" type="datetime-local" required value="'+localDate(existing?.end||new Date(Date.now()+86400000).toISOString())+'"><small>入力は端末の時刻帯。客向け表示は日本時間です。過去の日時は終了表示になります。</small><p id="form-message" class="error" role="alert"></p><button id="save" type="submit">② 保存して客向けプレビューを見る</button></form><p><a href="#store/nakatomi">③ 保存済みの客向けプレビューを開く →</a></p><h2>このブラウザーのサンプル</h2><p>実際の管理履歴はありません。以下はサンプル表示の切り替えです。</p>'+posts.map(p=>'<article class="card"><div class="card-body"><h3>'+esc(p.title)+'</h3><p>'+({active:'表示中',soldout:'売り切れ',ended:'終了'}[p.state])+'</p><div class="actions"><button data-edit="'+esc(p.id)+'">文章・写真を編集</button>'+['soldout','ended','active'].map((s,i)=>'<button class="quiet" data-state="'+s+'" data-id="'+esc(p.id)+'" '+(p.state===s?'disabled':'')+'>'+['売り切れの表示を試す','終了の表示を試す','表示中に戻す'][i]+'</button>').join('')+'</div></div></article>').join('')+'<a href="#line">← 入口へ戻る</a>';
  document.querySelector('#photo').onchange=readPhoto;
  document.querySelector('#remove-photo').onclick=()=>{photoToken++;reading=false;photo='';document.querySelector('#photo').value='';document.querySelector('#preview').hidden=true;document.querySelector('#save').disabled=false;};
  document.querySelector('#editor').onsubmit=e=>{
    e.preventDefault();if(reading||committed)return;
    try{
      const next={id:existing?.id||crypto.randomUUID(),storeId:store.id,title:document.querySelector('#title').value,text:document.querySelector('#text').value,end:new Date(document.querySelector('#end').value).toISOString(),state:existing?.state||'active',image:photo};
      if(persist(existing?posts.map(p=>p.id===existing.id?next:p):[next,...posts])){
        committed=true;
        editing=null;location.hash='store/nakatomi';announce('このブラウザーに保存しました。他の人には公開・送信されていません。');
      }
    }catch(error){document.querySelector('#form-message').textContent=error.message;}
  };
}
async function readPhoto(event){
  const file=event.target.files[0];if(!file)return;
  const token=++photoToken,message=document.querySelector('#form-message');
  message.textContent='';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){message.textContent='JPEG / PNG / WebPの2MB以下を選んでください。';event.target.value='';return;}
  reading=true;document.querySelector('#save').disabled=true;
  try{
    const bitmap=await createImageBitmap(file);
    if(token!==photoToken){bitmap.close();return;}
    if(bitmap.width*bitmap.height>24000000){bitmap.close();throw Error();}
    const canvas=document.createElement('canvas'),scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    photo=canvas.toDataURL('image/jpeg',.8);
    document.querySelector('#preview').src=photo;document.querySelector('#preview').hidden=false;
  }catch{if(message.isConnected)message.textContent='写真を読み込めません。別の写真を選んでください。';}
  finally{if(token===photoToken){reading=false;const button=document.querySelector('#save');if(button)button.disabled=false;}}
}
app.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||reading)return;
  if(button.dataset.edit){editing=button.dataset.edit;render();document.querySelector('#photo').focus();}
  if(button.dataset.state){if(persist(posts.map(p=>p.id===button.dataset.id?{...p,state:button.dataset.state}:p))){editing=null;render();announce('このブラウザー内のサンプル表示を変更しました。');}}
});
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
window.addEventListener('hashchange',()=>{editing=null;render();window.scrollTo(0,0);});
window.addEventListener('storage',event=>{if([POST_KEY,VISIT_KEY].includes(event.key)&&location.hash!=='#post'){try{posts=loadPosts(localStorage,defaults());render();}catch{announce('保存内容を読み込めません。');}}});
setInterval(()=>{if(location.hash==='#store/nakatomi'&&renderedSignature!==posts.map(p=>postStatus(p)).join()+dayKey())render();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&location.hash==='#store/nakatomi')render();});
render();
