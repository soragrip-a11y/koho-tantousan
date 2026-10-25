import {createStoreClient} from './connection.js?v=20261025-9';
import {createNoticeRepository} from './notice-repository.js?v=20261025-9';
import {noticeMedia} from './notice-view.js?v=20261025-6';
import './press-feedback.js';
// Anonymous public RPC only. Never reads local demo posts or a staff session.
import {STORES,VISIT_KEY,dayKey,readVisits,recordVisit} from './model.js';
import {postStatus} from './post-model.js';
const area=document.querySelector('#customer-content'),store=STORES[0];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s));
const repository=createNoticeRepository(createStoreClient());
let posts=[],unavailable=false,pending=false,last='',loading=false,readError=false;
async function read(){
 if(loading)return;loading=true;
 try{const next=await repository.listPublic();
  for(const p of next)p.image=p.imagePath?await new Promise(async(resolve,reject)=>{try{const blob=await repository.downloadPhoto(p.imagePath),reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);}catch(e){reject(e);}}):'';
  posts=next;readError=false;
 }catch{posts=[];readError=true;}finally{loading=false;render();}
}
function done(){try{return readVisits(localStorage)[store.id+':'+dayKey()]===true;}catch{unavailable=true;return false;}}
function signature(){return posts.map(p=>postStatus(p)).join()+dayKey();}
function render(){
  const visited=done();
  const cards=posts.filter(p=>postStatus(p)!=='withdrawn').map(p=>{
    const state=postStatus(p),labels={active:'サンプルのお知らせ',soldout:'終了の表示例',ended:'掲載終了の表示例'};
    return '<article class="card"><div class="card-body"><span class="badge '+(state==='active'?'':'off')+'">'+labels[state]+'</span><h2>'+esc(p.title)+'</h2><p class="deadline">掲載期限：'+date(p.end)+'（日本時間）</p><p>'+esc(p.text)+'</p></div>'+noticeMedia(p,state)+'</article>';
  }).join('');
  area.innerHTML='<section class="store-head"><p class="eyebrow">お店の情報 / 提案デモ</p><h1>'+esc(store.name)+'</h1><p>公式の店舗ページではありません。<br>実際の販売情報ではありません。</p></section><section class="cards">'+(cards||'<p class="empty">'+(readError?'お知らせを読み込めませんでした。時間をおいて再度お開きください。':'現在、一般公開中のお知らせはありません。')+'</p>')+'<section class="visit-panel"><h2>「いいね」を体験</h2><button id="visit" '+(visited||pending||unavailable?'disabled':'')+'>'+(visited?'今日はいいね済み':'いいね（デモ）')+'</button><p>このブラウザー内で1日1回、日本時間0時で更新する簡易デモです。実人数・来店証明・全利用者の集計ではありません。</p></section><p class="note">情報はサンプルです。在庫を保証しません。「いいね」はこのブラウザー内だけのデモです。</p></section>';
  document.querySelector('#visit').onclick=visit;
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden){read();render();}});
function refreshSaved(){read();}
window.addEventListener('pageshow',refreshSaved);
window.addEventListener('focus',refreshSaved);
setInterval(()=>{if(last!==signature())render();},1000);
read();render();
