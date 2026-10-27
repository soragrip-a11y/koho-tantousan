import {watchCustomer} from './customer-refresh.js?v=20261027-2';
import {publicPosts,scheduleLabel,NO_EXPIRY_NOTE} from './schedule.js?v=20261027-4';
import {createStoreClient} from './connection.js?v=20261025-9';
import {createNoticeRepository} from './notice-repository.js?v=20261027-2';
import {noticeMedia} from './notice-view.js?v=20261027-2';
import './press-feedback.js';
// Anonymous public RPC only. Never reads local demo posts or a staff session.
import {STORES,VISIT_KEY,dayKey,readVisits,recordVisit} from './model.js?v=20261025-13';
import {postStatus} from './post-model.js?v=20261027-2';
const area=document.querySelector('#customer-content'),store=STORES[0];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(s));
const repository=createNoticeRepository(createStoreClient());
let posts=[],unavailable=false,pending=false,last='',loading=false,readError=false,checkedAt=null;
async function read(){
 if(loading)return;loading=true;render();
 try{const next=await repository.listPublic();
  for(const p of next){p.image='';if(p.imagePath)try{p.image=await new Promise(async(resolve,reject)=>{try{const blob=await repository.downloadPhoto(p.imagePath),reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);}catch(e){reject(e);}});}catch{p.photoFailed=true;}}
  posts=next;readError=false;checkedAt=new Date();
 }catch{posts=[];readError=true;checkedAt=null;}finally{loading=false;render();}
}
function done(){try{return readVisits(localStorage)[store.id+':'+dayKey()]===true;}catch{unavailable=true;return false;}}
function signature(){return posts.map(p=>postStatus(p)).join()+dayKey();}
function render(){
  const visited=done();
  const cards=publicPosts(posts).map(p=>{
    const state=postStatus(p),labels={active:'お知らせ',soldout:'終了しました',ended:'終了しました'};
    return '<article class="card">'+noticeMedia(p,state)+'<div class="card-body">'+(p.photoFailed?'<p role="status">写真を読み込めませんでした。右上の「更新」で読み直せます。</p>':'')+'<span class="badge '+(state==='active'?'':'off')+'">'+labels[state]+'</span><h2>'+esc(p.title)+'</h2><p class="deadline">'+esc(scheduleLabel(p))+'</p><p>'+esc(p.text)+'</p>'+(!p.end?'<small class="expiry-note">'+NO_EXPIRY_NOTE+'</small>':'')+'</div></article>';
  }).join('');
  area.innerHTML='<section class="store-head"><div><p class="store-context">お店のお知らせ</p><h1>'+esc(store.name)+'</h1></div><div id="refresh-area"></div></section><section class="cards">'+(cards||'<p class="empty">'+(loading?'お知らせを読み込んでいます。':readError?'お知らせを読み込めませんでした。':'現在、一般公開中のお知らせはありません。')+'</p>')+'<section class="visit-panel"><h2>いいね</h2><button id="visit" '+(visited||pending||unavailable?'disabled':'')+'>'+(visited?'今日はいいね済み':'いいね（デモ）')+'</button><p>この端末内だけのデモです。お店には届かず、集計されません。1日1回、日本時間0時にリセットします。</p></section></section>';
  document.querySelector('#refresh-area').innerHTML='<button id="refresh" class="quiet" '+(loading?'disabled':'')+'>更新</button><p class="refresh-status" role="status" aria-live="polite" aria-atomic="true">'+(loading?'更新中…':readError?'更新できませんでした。「更新」を押して、もう一度お試しください。':checkedAt?'確認時刻：'+date(checkedAt):'')+'</p>';
  document.querySelector('#visit').onclick=visit;
  document.querySelector('#refresh').onclick=read;
  document.querySelector('#notice').textContent=unavailable?'ブラウザーの保存を利用できないため「いいね」を停止しています。':'';
  last=signature();
}
async function visit(){
  if(pending)return;pending=true;document.querySelector('#visit').disabled=true;
  try{
    const update=()=>{const next=recordVisit(readVisits(localStorage),store.id);if(next.added)localStorage.setItem(VISIT_KEY,JSON.stringify(next.ledger));};
    if(navigator.locks)await navigator.locks.request(VISIT_KEY,update);else update();
  }catch{unavailable=true;}finally{pending=false;render();}
}
// Every hash, including old #post and invalid routes, remains this customer page.
window.addEventListener('hashchange',()=>{read();render();});
window.addEventListener('storage',e=>{if(e.key===null||[VISIT_KEY].includes(e.key)){read();render();}});
watchCustomer({document,window,read,render,signature});
read();render();
