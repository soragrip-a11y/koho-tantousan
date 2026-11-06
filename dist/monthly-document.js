import {MONTHLY_TERMS} from './monthly-pricing.js?v=20261106';
import {ACCEPTANCE_POLICY,AI_POLICY} from './acceptance-policy.js?v=20261024';
export function monthlyDocument(d,c){
 const yen=n=>n.toLocaleString('ja-JP')+'円',type=d.documentType||'contract';
 const titles={contract:'実写月額パック 業務委託契約書',estimate:'実写月額パック 見積書',invoice:'実写月額パック 請求書'};
 const sections=[
 {title:'当事者・対象期間',paragraphs:['作成日：'+d.contractDate,'契約者：'+d.customer+'／署名者：'+d.customerSigner+'／宛名：'+d.payer,'住所：'+d.customerAddress+'／連絡先：'+d.customerEmail,'発行者：'+d.provider+'／担当：'+d.providerSigner+'／連絡先：'+d.providerEmail,'受託者住所：'+(d.providerAddress||'________________（契約時に記入）'),'期間：'+d.start+'〜'+c.end+'（'+c.months+'か月・更新は別途合意）']},
 {title:'制作と運用の範囲',paragraphs:[c.plan.name+'：'+c.plan.scope,'通常の有料枠の各月予定：ショート'+c.shorts+'本・ロング'+c.longs+'本・撮影'+c.shootHalf+'回。換算額'+yen(c.allocation)+'／制作枠'+yen(c.plan.budget)+'。未配分枠'+yen(c.unallocated)+'。無料特典・繰越枠の利用はこの本数に含めず月ごとに確認します。','毎月ショート1本または撮影1回の無料特典。当月限り・繰越不可。','有料未使用枠は翌々月末まで。解約時は有効な繰越枠を契約終了日まで利用でき、終了後は失効。返金は契約内容に応じて別途明記し、一律返金不可とはしません。適用法令と個別契約を確認します。繰越残額を撮影・編集に利用し、残額超過分のみ別途請求。利用元の月・有効期限・残額・特典利用を確認してから別明細を作成し、二重請求しません。','制作内容：'+d.purpose,'完成動画の利用範囲：'+d.usage,'実績掲載：'+(d.portfolio==='no'?'許可しない':'対象を別途確認して承認する'),'修正1回無料、2回目以降1回3,300円（税込）。制作側ミスは回数に含めません。交通費別途。車の交通費は往復走行距離×1kmあたり20円（税込）、高速代・駐車場代は実費です。千葉県内の移動時間は追加請求しません。']},
 {title:'料金明細（税込）',paragraphs:[...(type==='invoice'?['請求対象：契約開始から第'+c.invoiceMonth+'月分']:[]),...(type==='invoice'?c.invoiceRows:c.rows).map(r=>r.label+'：'+yen(r.amount)+(r.timing==='monthly'?'／月':'（第1月のみ）')),type==='invoice'?'今回請求額：'+yen(c.invoiceTotal):'指定期間の総額：'+yen(c.total)+'（月額'+yen(c.recurring)+'×'+c.months+'か月＋初回費用'+yen(c.oneTime)+'）','未確定の実費・追加作業は含みません。期間総額を一括前払いする意味ではありません。適格請求書ではありません。']},
 {title:'支払い・個別合意',paragraphs:['当月分を前月末までに前払い。初月の支払日は契約時に別途決定。',...(type==='invoice'?['支払期限：'+d.paymentDue,'振込先：'+(d.bankDetails||'別途確認')]:[]),'初月支払日、追加費用の期限、編集詳細・納期・契約終了時の精算等は契約時に相談し、実施前に書面で合意します。','個別の確認事項：'+(d.notes||'契約時に別途確認します。'),'既存契約・発行済み見積書は変更しません。PDF生成だけで契約・申込み・送信は行われません。']},
 {title:'受託条件・AI利用',paragraphs:[ACCEPTANCE_POLICY,AI_POLICY]}
 ];
 return {sections,terms:type==='contract'?MONTHLY_TERMS:[],termsNotice:'新規実写月額パック：2026年11月6日版。未決定の細部は契約時に相談し、双方の合意を記録します。既存契約へ遡及しません。',data:d,calculation:c,documentTitle:titles[type],type};
}
