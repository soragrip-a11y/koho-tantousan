export const MONTHLY_VERSION='20261106';
export const EDITING_SCOPE='基本編集はカット・テロップ・BGM・SE・色と音量の調整。ロングは素材30分以内・1カメラ、サムネイル1枚付き。高度なアニメーションや再撮影は別途見積もりです。';
export const MONTHLY_SCOPE='実写動画の制作枠を、ショート編集1本11,000円（30秒以内）、ロング編集1本27,500円（7分以内）、撮影1回11,000円（4時間想定）の基準で同額範囲内で組み替えられます。超過尺・日程は契約時に相談します。'+EDITING_SCOPE;
export const PREMIUM_SCOPE='月1回の企画打ち合わせ、投稿計画、月6本までの投稿代行、タイトル・説明文作成、月1回の簡易レポートを含みます。コメント・DM返信と広告運用は別途。対象はInstagram・YouTube・TikTokの3媒体です。月6本までの投稿代行は媒体ごとに1投稿と数えます。同じ動画を3媒体へ投稿すると3投稿分です。';
export const NEW_PLANS=Object.freeze(Object.fromEntries([55000,88000,132000,165000].map(price=>['monthly'+price,{name:price===165000?'プレミアム165,000円':'実写月額'+price.toLocaleString('ja-JP')+'円',price,budget:Math.min(price,132000),short:0,long:0,months:2,includedShoots:0,scope:MONTHLY_SCOPE+(price===165000?PREMIUM_SCOPE:'企画立案・SNS運用代行の追加は個別相談です。')}])));
export const MONTHLY_TERMS=[
 {title:'新しい実写月額パック',text:'税込月額55,000円・88,000円・132,000円・165,000円。165,000円は132,000円と同じ制作内容に企画立案・SNS運用代行を加えます。'+MONTHLY_SCOPE},
 {title:'プレミアムの運用',text:PREMIUM_SCOPE},
 {title:'毎月の無料特典',text:'毎月、通常の制作枠に加えてショート1本または撮影1回を無料で選べます。当月のみ利用可能で、繰越はできません。無料特典の撮影は4時間まで。4時間を超えた分は1時間ごとに2,750円（税込）です。1時間未満の端数の扱いは契約時に相談します。'},
 {title:'有料枠の繰越',text:'有料の未使用枠は追加料金なしで対象月の翌々月末まで繰越可能です。4月分は6月末まで。繰越残額は撮影・編集のどちらにも使え、残額を超える分のみ別途請求します。無料特典とは別に管理します。解約時は有効な繰越枠を契約終了日まで利用でき、終了後は失効します。返金の扱いは契約内容に応じて別途明記し、一律に返金しないとするものではありません。適用法令と個別契約を確認します。制作側都合の遅延等の細部は契約時に相談します。'},
 {title:'打ち合わせ・撮影・修正',text:'打ち合わせ無料。撮影1回は4時間想定。千葉県内の移動時間による追加請求はありません。交通費は別途です。車の交通費は往復走行距離×1kmあたり20円（税込）、高速代・駐車場代は実費です。修正は1回無料、2回目以降は1回3,300円（税込）。制作側のミスは修正回数に含めません。'},
 {title:'月額のお支払い',text:'月額契約は最低2か月、その後は1か月ごとの自動更新です。更新・解約の通知期限や手続きは契約時に相談して書面で確認します。当月分を前月末までに前払いします。初月の支払日は契約時に別途決定します。追加費用の支払期限・支払方法・銀行休業日の扱いは契約時に相談します。'},
 {title:'個別条件・既存契約',text:'制作本数の組合せ、編集の詳細、素材量、納期、キャンセル、権利・保管、運用の細部等は契約時に相談し、業務開始前に書面で確認します。既存の締結済み契約・発行済み見積書の金額と条件は変更しません。'}
];
export function calculateMonthly(data,integer,clean){
 const plan=NEW_PLANS[data.plan],months=integer(data.months,'契約月数',60);
 if(months<2)throw Error('月額契約は最低2か月です。初回契約月数は2以上にしてください。');
 const shorts=integer(data.shorts,'ショート本数',100),longs=integer(data.longs,'ロング本数',100),shootHalf=integer(data.shootHalf??0,'撮影回数',100);
 // Quantities describe the regular paid allocation only. Benefits and carryover
 // are settled separately by month, never multiplied across the whole contract.
 const allocation=shorts*11000+longs*27500+shootHalf*11000;
 if(allocation>plan.budget)throw Error('通常の制作枠を超えています。無料特典・有効な繰越残額の利用と超過分は月ごとに確認し、別明細で合意してください。');
 if(Number(data.tiktok)||Number(data.shoot4)||Number(data.shoot7))throw Error('旧プランのオプションは新料金へ自動適用できません。');
 const rows=[{label:plan.name+'基本料金',qty:1,unit:plan.price,amount:plan.price,timing:'monthly'}];
 for(const extra of data.extras||[]){const amount=integer(extra.amount,'追加費用');if(!['once','monthly'].includes(extra.timing))throw Error('課金単位を確認してください。');if(amount&&!clean(extra.label))throw Error('追加費用の内容を入力してください。');if(amount)rows.push({label:clean(extra.label),qty:1,unit:amount,amount,timing:extra.timing});}
 const recurring=rows.filter(x=>x.timing==='monthly').reduce((n,x)=>n+x.amount,0),oneTime=rows.filter(x=>x.timing==='once').reduce((n,x)=>n+x.amount,0);
 const invoiceMonth=data.documentType==='invoice'?integer(data.invoiceMonth??1,'請求対象月',60):1;
 if(invoiceMonth<1||invoiceMonth>months)throw Error('請求対象月は契約期間内にしてください。');
 const invoiceRows=rows.filter(x=>x.timing==='monthly'||invoiceMonth===1);
 return {plan,monthly:true,newMonthly:true,months,shorts,longs,shootHalf,includedShoots:0,tiktok:0,allocation,unallocated:plan.budget-allocation,rows,recurring,oneTime,total:recurring*months+oneTime,first:recurring+oneTime,invoiceMonth,invoiceRows,invoiceTotal:invoiceRows.reduce((n,x)=>n+x.amount,0)};
}
