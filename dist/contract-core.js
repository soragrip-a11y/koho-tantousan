export const DEFAULT_PROVIDER = Object.freeze({ provider: 'ソラグリップ（広報担当さん）', providerSigner: '須永 空和', providerEmail: 'sora.grip@gmail.com', providerAddress: '' });
// All amounts are tax-inclusive. Quoted additions must be explicitly entered.
export const PRICES = Object.freeze({standard:30000,companion:80000,premium:120000,trialShort:5000,standardShoot:17000,trialShoot:15000,tiktok:15000});
export const PLANS = Object.freeze({
 standard:{name:'スタンダード',short:6,long:0,months:1,includedShoots:0,scope:'ショート月6本の編集・完成データ納品のみ。企画相談・投稿代行・タイトル説明文・月次分析は含まない。素材持ち込みは要相談。'},
 companion:{name:'伴走型',short:6,long:0,months:1,includedShoots:2,scope:'ショート月6本、現地半日撮影を月2回、企画相談、YouTube投稿代行、タイトル・説明文、月次振り返り・改善提案。公開内容・日時は事前にお客様が確認する。'},
 premium:{name:'プレミアム',short:8,long:2,months:1,includedShoots:2,scope:'ショート月8本＋ロング月2本、現地半日撮影を月2回、企画相談、YouTube投稿代行、タイトル・説明文、月次振り返り・改善提案。公開内容・日時は事前にお客様が確認する。'},
 single:{name:'初回お試し',short:3,long:0,months:0,includedShoots:0,scope:'初回限定。ショート1本5,000円（税込）、3本からの編集・納品。初回半日撮影は別途15,000円（税込）。投稿代行・運用支援は本料金に含まない。'}
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
 const p=PLANS[data.plan];if(!p)throw new Error('プランを選択してください。');
 const monthly=data.plan!=='single';
 const months=monthly?integer(data.months,'契約月数',60):1;
 if(monthly&&months<1)throw new Error('合意した契約月数を1以上で入力してください。最低利用期間や自動更新を設定するものではありません。');
 const shorts=integer(data.shorts,'ショート本数',100),longs=integer(data.longs,'ロング本数',100);
 if(shorts<p.short||longs<p.long)throw new Error(monthly?'標準本数の変更・交換は個別相談です。':'初回お試しはショート3本からです。');
 if(!monthly&&longs)throw new Error('初回お試しの対象はショートです。ロングの単発制作は個別見積もりをご相談ください。');
 if(Number(data.shoot4)||Number(data.shoot7))throw new Error('旧撮影区分は使用できません。新しいフォームで入力してください。');
 const shootHalf=integer(data.shootHalf??0,'別料金の半日撮影回数',31);
 if(!monthly&&shootHalf>1)throw new Error('初回お試しの撮影価格は初回の半日撮影1回に適用します。追加撮影は個別にご相談ください。');
 const tiktok=integer(data.tiktok??0,'TikTokオプション',1);
 if(!monthly&&tiktok)throw new Error('TikTokは月額オプションです。初回お試しへの追加は個別にご相談ください。');
 const rows=[],add=(label,qty,unit,timing)=>{if(qty)rows.push({label,qty,unit,amount:qty*unit,timing});};
 const quote=(v,label)=>{if(v===undefined||v==='')throw new Error(label+'の合意済み単価（税込）を入力してください。');return integer(v,label);};
 const frequency=monthly?'monthly':'once';
 if(monthly)add(p.name+'基本料金',1,PRICES[data.plan],'monthly');
 if(monthly&&shorts>p.short)add('追加ショート（60秒以内・個別見積）',shorts-p.short,quote(data.extraShortUnit,'追加ショート'),'monthly');
 if(monthly&&longs>p.long)add('追加ロング（10分以内・個別見積）',longs-p.long,quote(data.extraLongUnit,'追加ロング'),'monthly');
 if(!monthly)add('初回お試しショート（60秒以内）',shorts,PRICES.trialShort,'once');
 if(shootHalf)add(monthly?'別料金の半日撮影（現地3時間）':'初回お試し半日撮影（現地3時間）',shootHalf,!monthly?PRICES.trialShoot:data.plan==='standard'?PRICES.standardShoot:quote(data.extraShootUnit,'追加撮影'),frequency);
 if(tiktok)add('TikTok同一動画の投稿代行のみ',1,PRICES.tiktok,'monthly');
 for(const extra of data.extras||[]){
  const amount=integer(extra.amount,'追加費用の金額');
  if(!['once','monthly'].includes(extra.timing))throw new Error('追加費用の課金単位を選択してください。');
  if(amount&&!clean(extra.label))throw new Error('追加費用の内容を入力してください。');
  if(amount)add(clean(extra.label),1,amount,monthly?extra.timing:'once');
 }
 const recurring=rows.filter(r=>r.timing==='monthly').reduce((a,r)=>a+r.amount,0),oneTime=rows.filter(r=>r.timing==='once').reduce((a,r)=>a+r.amount,0);
 const total=recurring*months+oneTime;
 const invoiceMonth=monthly&&data.documentType==='invoice'?integer(data.invoiceMonth??1,'請求対象月',60):1;
 if(invoiceMonth<1||invoiceMonth>months)throw new Error('請求対象月は契約期間内の月番号にしてください。');
 const invoiceRows=rows.filter(r=>r.timing==='monthly'||invoiceMonth===1);
 return {plan:p,monthly,months,shorts,longs,shootHalf,includedShoots:p.includedShoots,tiktok,rows,recurring,oneTime,total,first:recurring+oneTime,invoiceMonth,invoiceRows,invoiceTotal:invoiceRows.reduce((a,r)=>a+r.amount,0)};
}
export function validateContract(data) {
  if (!['general','political','election'].includes(data.requestCategory)) throw new Error('依頼区分を選択してください。旧データも自動で一般事業には分類しません。');
  if (data.requestCategory !== 'general') {
    for (const v of Object.values(data)) if (typeof v === 'string' && v.length > 2000) throw new Error('入力は2,000文字以内にしてください。');
    dateValue(data.contractDate);
    if (!clean(data.purpose)) throw new Error('発信目的・制作内容を入力してください。');
    if (!data.reviewed) throw new Error('受託前確認票であり受託確定ではないことを確認してください。');
    return {reviewOnly:true};
  }
  const required = ['customer','customerSigner','customerAddress','customerEmail','provider','providerSigner','providerEmail','payer','purpose','usage'];
  for (const k of required) if (!clean(data[k])) throw new Error('契約者・受託者・制作条件の必須項目をすべて入力してください。');
  for (const [k,v] of Object.entries(data)) if (typeof v === 'string' && v.length > 2000) throw new Error('入力が長すぎます。2,000文字以内にしてください。');
  for (const k of ['customerEmail','providerEmail']) if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[k])) throw new Error('有効なメールアドレスを入力してください。');
  const result = calculate(data);
  dateValue(data.contractDate); dateValue(data.start);
  if(!['contract','estimate','invoice'].includes(data.documentType||'contract'))throw new Error('書類の種類を選択してください。');
  if(data.documentType==='invoice'){dateValue(data.paymentDue);if(data.paymentDue<data.contractDate)throw new Error('支払期限は書類作成日以降にしてください。');}

  const end = result.monthly ? periodEnd(data.start, result.months) : data.end;
  dateValue(end);
  if (end < data.start) throw new Error('終了日は開始日以降にしてください。');
  if ((data.documentType||'contract')==='contract' && data.contractDate > data.start) throw new Error('契約日は開始日以前にしてください。');
  if (!['no','separate'].includes(data.portfolio)) throw new Error('実績掲載の扱いを選択してください。');
  if (!data.reviewed) throw new Error('入力内容と利用条件を確認してください。');
  return {...result,end};
}
