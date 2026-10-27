import {watchCustomer} from './customer-refresh.js?v=20261027-2';
import {publicPosts,scheduleLabel,NO_EXPIRY_NOTE} from './schedule.js?v=20261027-4';
import {createStoreClient} from './connection.js?v=20261025-9';
import {createNoticeRepository} from './notice-repository.js?v=20261027-2';
import {noticeMedia} from './notice-view.js?v=20261027-2';
import './press-feedback.js';
// Anonymous public RPC only. Never reads local demo posts or a staff session.
import {STORES} from './model.js?v=20261025-13';
import {postStatus} from './post-model.js?v=20261027-2';
const area=document.querySelector('#customer-content'),store=STORES[0];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(s));
const client=createStoreClient(),repository=createNoticeRepository(client);
let posts=[],last='',loading=false,readError=false,checkedAt=null;
async function read(){
 if(loading)return;loading=true;render();
 try{const next=await repository.listPublic();
  for(const p of next){p.image='';if(p.imagePath)try{p.image=await new Promise(async(resolve,reject)=>{try{const blob=await repository.downloadPhoto(p.imagePath),reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);}catch(e){reject(e);}});}catch{p.photoFailed=true;}}
  posts=next;readError=false;checkedAt=new Date();
 }catch{posts=[];readError=true;checkedAt=null;}finally{loading=false;render();}
}
function signature(){return posts.map(p=>postStatus(p)).join();}
function render(){
  const cards=publicPosts(posts).map(p=>{
    const state=postStatus(p),labels={active:'お知らせ',soldout:'終了しました',ended:'終了しました'};
    return '<article class="card">'+noticeMedia(p,state)+'<div class="card-body">'+(p.photoFailed?'<p role="status">写真を読み込めませんでした。右上の「更新」で読み直せます。</p>':'')+'<span class="badge '+(state==='active'?'':'off')+'">'+labels[state]+'</span><h2>'+esc(p.title)+'</h2><p class="deadline">'+esc(scheduleLabel(p))+'</p><p>'+esc(p.text)+'</p>'+(!p.end?'<small class="expiry-note">'+NO_EXPIRY_NOTE+'</small>':'')+'</div></article>';
  }).join('');
  area.innerHTML='<section class="store-head"><div><p class="store-context">お店のお知らせ</p><h1>'+esc(store.name)+'</h1></div><div id="refresh-area"></div></section><section class="cards">'+(cards||'<p class="empty">'+(loading?'お知らせを読み込んでいます。':readError?'お知らせを読み込めませんでした。':'現在、一般公開中のお知らせはありません。')+'</p>')+'</section>';
  document.querySelector('#refresh-area').innerHTML='<button id="refresh" class="quiet" '+(loading?'disabled':'')+'>更新</button><p class="refresh-status" role="status" aria-live="polite" aria-atomic="true">'+(loading?'更新中…':readError?'更新できませんでした。「更新」を押して、もう一度お試しください。':checkedAt?'確認時刻：'+date(checkedAt):'')+'</p>';
  for(const b of area.querySelectorAll('[data-like]'))b.onclick=async()=>{
   const id=b.dataset.like;if(likes.busy(id))return;b.disabled=true;
   const status=area.querySelector('[data-like-status="'+id+'"]');status.textContent='確認しています…';
   let feedback='';try{await likes.toggle(store.id,id);}catch(error){feedback=error.message;}
   render();const current=area.querySelector('[data-like="'+id+'"]');
   if(current){area.querySelector('[data-like-status="'+id+'"]').textContent=feedback;current.focus();}
  };
  document.querySelector('#refresh').onclick=read;
  document.querySelector('#notice').textContent=likeError;
  last=signature();
}
// Every hash, including old #post and invalid routes, remains this customer page.
window.addEventListener('hashchange',()=>{read();render();});

watchCustomer({document,window,read,render,signature});
read();render();
