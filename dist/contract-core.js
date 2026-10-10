export const DEFAULT_PROVIDER = Object.freeze({ provider: 'ソラグリップ（広報担当さん）', providerSigner: '須永 空和', providerEmail: 'sora.grip@gmail.com', providerAddress: '千葉県君津市常代5-7-36' });
// All public service prices are tax-inclusive. Never add tax again.
export const PRICES = Object.freeze({ standard: 55000, premium: 150000, short: 8000, long: 18000, shoot4: 22000, shoot7: 32000, extension: 10000 });
export const PLANS = Object.freeze({
  standard: { name: 'スタンダード', short: 6, long: 0, months: 1, scope: '発信テーマの整理・構成提案・編集・タイトル・説明文案、月1回30分までのオンライン相談と簡単な振り返り。撮影・投稿はお客様。' },
  premium: { name: 'プレミアム', short: 8, long: 2, months: 2, scope: '月間企画・構成提案・編集・タイトル・説明文案、月1回の訪問撮影、YouTube 1チャンネルへの投稿・予約、月次レポート・改善提案、月1回60分までのオンライン相談。公開前にお客様の承認を得る。' },
  single: { name: '単発制作', short: 0, long: 0, months: 0, scope: '依頼動画の構成確認・編集・タイトル・説明文案。制作に必要な確認に対応。投稿はお客様。' }
});
export const yen = n => new Intl.NumberFormat('ja-JP').format(n) + '円';
export const clean = value => String(value ?? '').normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim();
export function integer(value, label, max = 10000000) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw new Error(`${label}は0〜${max}の整数で入力してください。`);
  return Number(value);
}
export function dateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('日付を入力してください。');
  const d = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== value || value < '2000-01-01' || value > '2100-12-31') throw new Error('日付は2000年〜2100年の有効な日付にしてください。');
  return d;
}
export const iso = d => d.toISOString().slice(0,10);
// Anniversary billing; if that day does not exist, the period ends at month-end.
export function periodEnd(start, months) {
  const d = dateValue(start), m = integer(months, '契約月数', 60);
  if (!m) throw new Error('契約月数は1以上にしてください。');
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m + 1, 0)).getUTCDate();
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, Math.min(d.getUTCDate() - 1, last))));
}
export function renewalDeadline(end) { const d = dateValue(end); d.setUTCDate(d.getUTCDate()-14); return iso(d); }
export function calculate(data) {
  const p = PLANS[data.plan];
  if (!p) throw new Error('プランを選択してください。');
  const monthly = data.plan !== 'single';
  const months = monthly ? integer(data.months, '契約月数', 60) : 1;
  if (monthly && months < p.months) throw new Error(`${p.name}は最低${p.months}か月です。`);
  const shorts = integer(data.shorts, 'ショート本数', 100), longs = integer(data.longs, 'ロング本数', 100);
  if (shorts < p.short || longs < p.long) throw new Error('プラン標準本数を下回る構成・動画の交換は個別見積もりです。無料相談からご連絡ください。');
  const shoot4 = integer(data.shoot4, '追加4時間撮影回数', 31), shoot7 = integer(data.shoot7, '追加7時間撮影回数', 31);
  if (!monthly && shorts + longs + shoot4 + shoot7 === 0) throw new Error('単発制作は動画または撮影を1件以上指定してください。');
  if (data.plan === 'premium' && !['4','7'].includes(String(data.includedHours))) throw new Error('プレミアムの撮影時間を選択してください。');
  const rows = [];
  const add = (label, qty, unit, timing) => { if (qty) rows.push({ label, qty, unit, amount: qty * unit, timing }); };
  const frequency = monthly ? 'monthly' : 'once';
  if (monthly) add(`${p.name}基本料金`, 1, PRICES[data.plan], 'monthly');
  add(monthly ? '追加ショート（1分以内）' : 'ショート（1分以内）', shorts-p.short, PRICES.short, frequency);
  add(monthly ? '追加ロング（10分以内）' : 'ロング（10分以内）', longs-p.long, PRICES.long, frequency);
  if (data.plan === 'premium' && String(data.includedHours) === '7') add('プラン内撮影の7時間への延長', 1, PRICES.extension, 'monthly');
  add('追加訪問撮影（4時間まで）', shoot4, PRICES.shoot4, frequency);
  add('追加訪問撮影（7時間まで）', shoot7, PRICES.shoot7, frequency);
  for (const extra of data.extras || []) {
    const amount = integer(extra.amount, '追加費用の金額');
    if (!['once', 'monthly'].includes(extra.timing)) throw new Error('追加費用の課金単位を選択してください。');
    if (amount && !clean(extra.label)) throw new Error('追加費用の内容を入力してください。');
    if (amount) add(clean(extra.label), 1, amount, monthly ? extra.timing : 'once');
  }
  const recurring = rows.filter(r=>r.timing==='monthly').reduce((s,r)=>s+r.amount,0);
  const oneTime = rows.filter(r=>r.timing==='once').reduce((s,r)=>s+r.amount,0);
  const total = recurring * months + oneTime;
  return {plan:p,monthly,months,shorts,longs,shoot4,shoot7,rows,recurring,oneTime,total,first:recurring+oneTime};
}
export function validateContract(data) {
  const required = ['customer','customerSigner','customerAddress','customerEmail','provider','providerSigner','providerAddress','providerEmail','payer','purpose','usage'];
  for (const k of required) if (!clean(data[k])) throw new Error('契約者・受託者・制作条件の必須項目をすべて入力してください。');
  for (const [k,v] of Object.entries(data)) if (typeof v === 'string' && v.length > 2000) throw new Error('入力が長すぎます。2,000文字以内にしてください。');
  for (const k of ['customerEmail','providerEmail']) if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[k])) throw new Error('有効なメールアドレスを入力してください。');
  const result = calculate(data);
  dateValue(data.contractDate); dateValue(data.start);
  const end = result.monthly ? periodEnd(data.start, result.months) : data.end;
  dateValue(end);
  if (end < data.start) throw new Error('終了日は開始日以降にしてください。');
  if (data.contractDate > data.start) throw new Error('契約日は開始日以前にしてください。');
  if (!['no','separate'].includes(data.portfolio)) throw new Error('実績掲載の扱いを選択してください。');
  if (!data.reviewed) throw new Error('入力内容と利用条件を確認してください。');
  return {...result,end};
}
