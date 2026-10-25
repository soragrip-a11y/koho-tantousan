import { STORES, VISIT_KEY, START_KEY, dayKey, readVisits, recordVisit, sampleNotices, status } from './model.js';

const app = document.querySelector('#app');
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
let start = Date.now();
let storageError = false;
let renderedSignature = '';
let pending = false;
try {
  // Never read or publish the former owner-demo data.
  localStorage.removeItem('koho-store-demo-v1');
  const saved = Number(localStorage.getItem(START_KEY));
  if (saved > 0 && Number.isFinite(saved)) start = saved;
  else localStorage.setItem(START_KEY, String(start));
} catch { storageError = true; }

const currentStore = () => STORES.find(store => location.hash === '#store/' + store.id);
function visitState(store) {
  try { return readVisits(localStorage)[store.id + ':' + dayKey()] === true; }
  catch { storageError = true; return false; }
}
function signature() {
  const store = currentStore();
  return location.hash + ':' + dayKey() + ':' + (store ? sampleNotices(store.id, start).map(x => status(x)).join() + visitState(store) : '');
}
function card(item) {
  const ended = status(item) === 'ended';
  return '<article class="card"><div class="card-body"><span class="badge ' + (ended ? 'off' : '') + '">' +
    (ended ? '掲載終了の表示例' : 'サンプル表示') + '</span><h2>' + esc(item.title) +
    '</h2><p class="deadline">サンプル期限：' + date(item.end) + '（日本時間）</p><p>' + esc(item.text) +
    '</p></div><img class="picture" src="./placeholder.svg" alt="掲載画像のプレースホルダー。商品写真ではありません"></article>';
}
function render() {
  const store = currentStore();
  app.dataset.route = store ? store.id : 'line';
  if (!store && !['', '#line', '#shops'].includes(location.hash)) {
    // Legacy management URLs have no privileged UI or data source.
    history.replaceState(null, '', '#line');
  }
  if (!store) {
    app.innerHTML = '<div class="layout landing"><section class="intro"><p class="eyebrow">LOCAL INFORMATION / PROPOSAL DEMO</p>' +
      '<h1>お店の情報へ、<br>ひと押しで。</h1><p>店舗ボタンから、そのお店のお知らせに直接進む提案デモです。</p>' +
      '<p class="note">店舗名は提案のための表示です。店舗の公式ページではなく、掲載承認や実際の販売情報を示すものではありません。B〜E店は架空です。</p>' +
      '<p>並び順はオーナーが週1回確認し、手動で編成する想定です。このデモが自動でLINEを並べ替えることはありません。</p></section>' +
      '<section class="phone" aria-label="6分割リッチメニューのデモ"><strong>広報担当さん</strong><div class="chat">気になるお店を選んでください。店舗情報へ直接つながります。</div><div class="menu six-menu">' +
      STORES.map(s => '<a class="button store-button" aria-label="' + esc(s.name) + 'の提案デモ" href="#store/' + s.id + '"><strong>' + (s.id === 'nakatomi' ? '<span>セブン</span><span>イレブン</span><span>中富店</span>' : esc(s.name)) + '</strong><small>提案デモ →</small></a>').join('') +
      '<a class="button work-button" href="../../one-off.html"><strong><span>お仕事の</span><span>依頼</span></strong><small>広報担当さんへ</small></a></div><p class="muted">店舗向け提案デモ / 情報はサンプル</p></section></div>';
  } else {
    const visited = visitState(store);
    app.innerHTML = '<section class="store-head"><p class="eyebrow">SHOP INFORMATION / PROPOSAL DEMO</p><h1>' + esc(store.name) +
      '</h1><p>店舗向け提案デモ · 公式の店舗ページではありません</p></section><div class="store-layout"><section class="cards" aria-label="サンプルのお知らせ">' +
      sampleNotices(store.id, start).map(card).join('') +
      '<section class="visit-panel"><h2>「行ったよ」を体験</h2><p>来店の自己申告ボタンのサンプルです。</p><button id="visit" ' +
      (visited || storageError || pending ? 'disabled' : '') + '>' + (visited ? '今日は受付済み' : '行ったよ（デモ）') +
      '</button><p id="visit-message" role="status">' + (visited ? 'このブラウザーでは、この店舗の本日分を受付済みです。' : '') +
      '</p><p class="muted">店舗ごとに1日1回、日本時間0時で日付が変わります。このブラウザー内だけの簡易制限で、実人数・来店証明・全利用者の集計ではありません。保存の削除や別ブラウザーで回避できるため、不正防止機能ではありません。</p></section></section>' +
      '<aside><p class="note">情報はサンプルです。実際の商品・特売・在庫は案内していません。在庫保証はありません。表示期限を過ぎると終了表示に変わります。</p><a href="#line">← メニューへ戻る</a></aside></div>';
    document.querySelector('#visit').addEventListener('click', submitVisit);
  }
  document.querySelector('#notice').textContent = storageError ? 'ブラウザーに保存できないため「行ったよ」の体験を停止しています。保存設定を確認してください。' : '';
  renderedSignature = signature();
}

async function submitVisit() {
  const store = currentStore();
  if (!store || pending) return;
  pending = true;
  document.querySelector('#visit').disabled = true;
  let result;
  const persist = () => {
    result = recordVisit(readVisits(localStorage), store.id);
    if (result.added) localStorage.setItem(VISIT_KEY, JSON.stringify(result.ledger));
  };
  try {
    // Cooperating same-origin tabs serialize their read/write. This is not authentication.
    if (navigator.locks) await navigator.locks.request(VISIT_KEY, persist);
    else persist();
  } catch { storageError = true; }
  finally { pending = false; render(); }
  if (currentStore()?.id === store.id && result && !storageError) {
    document.querySelector('#visit-message').textContent = result.added ? 'このブラウザーに記録しました。実際の来店記録ではありません。' : 'この店舗の本日分は受付済みです。';
  }
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
window.addEventListener('storage', e => { if (e.key === VISIT_KEY) render(); });
setInterval(() => { if (signature() !== renderedSignature) render(); }, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
render();
