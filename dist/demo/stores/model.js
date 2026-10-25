// Public demo data only. Never add owner records, private posts or credentials.
export const STORES = Object.freeze([
  { id: 'nakatomi', name: 'セブンイレブン君津中富店' },
  { id: 'b', name: 'B店' }, { id: 'c', name: 'C店' },
  { id: 'd', name: 'D店' }, { id: 'e', name: 'E店' },
]);
export const VISIT_KEY = 'koho-visit-demo-v2';
export const START_KEY = 'koho-public-sample-start-v2';
const DAY = 86400000;
export const dayKey = (now = Date.now()) => new Date(now + 9 * 3600000).toISOString().slice(0, 10);
export const recentDays = (now = Date.now()) => Array.from({ length: 7 }, (_, i) => dayKey(now - i * DAY));
export function countVisits(ledger, storeId, now = Date.now()) {
  return recentDays(now).filter(day => ledger[storeId + ':' + day] === true).length;
}
export function recordVisit(ledger, storeId, now = Date.now()) {
  if (!STORES.some(store => store.id === storeId)) throw Error('店舗を確認できません。');
  const key = storeId + ':' + dayKey(now);
  if (ledger[key] === true) return { ledger, added: false };
  return { ledger: { ...ledger, [key]: true }, added: true };
}
export function readVisits(storage) {
  const raw = JSON.parse(storage.getItem(VISIT_KEY) || '{}');
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') throw Error('保存データを確認できません。');
  return Object.fromEntries(Object.entries(raw).filter(([key, value]) => value === true && /^(nakatomi|[bcde]):\d{4}-\d{2}-\d{2}$/.test(key)));
}
export function sampleNotices(storeId, start) {
  return [
    { id: storeId + '-1', title: 'お得情報の掲載見本', text: 'ここに、お店が確認した写真と短いお知らせを掲載できます。現在の販売・特売情報ではありません。', end: new Date(start + DAY).toISOString() },
    { id: storeId + '-2', title: 'もう一つのお知らせの見本', text: '複数のお知らせを、それぞれの期限で掲載する画面例です。商品・価格・在庫の情報はサンプルにも設定していません。', end: new Date(start + 2 * DAY).toISOString() },
  ];
}
export const status = (item, now = Date.now()) => Date.parse(item.end) <= now ? 'ended' : 'active';
