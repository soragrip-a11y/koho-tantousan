// New enquiries only. Historical tariff calculations stay in edit-pricing.js.
export const CURRENT_EDIT_VERSION='2026-11-06-trial';
export const TRIAL_SCOPE='初回限定・動画1本のお試し価格です。完成尺、素材量、編集内容、修正回数、撮影の有無、納期・追加費用は事前相談し、書面で確認します。通常編集と同一の内容を保証するものではありません。';
export const CURRENT_EDIT_SERVICES=Object.freeze({
 short:{name:'通常ショート編集',price:11000,scope:'通常ショート編集1本11,000円（税込）、完成30秒以内。基本編集はカット・テロップ・BGM・SE・色と音量の調整。超過尺・素材量・詳細は事前相談。撮影費別。修正は1回無料、2回目以降1回3,300円（税込）。制作側のミスは回数に含めません。'},
 long:{name:'通常ロング編集',price:27500,scope:'通常ロング編集1本27,500円（税込）、完成7分以内、素材30分以内・1カメラ、サムネイル1枚付き。基本編集はカット・テロップ・BGM・SE・色と音量の調整。超過尺、高度なアニメーションや再撮影は別途見積もり。撮影費別。修正は1回無料、2回目以降1回3,300円（税込）。制作側のミスは回数に含めません。'},
 trialshort:{name:'初回お試しショート編集',price:5000,scope:TRIAL_SCOPE},
 triallong:{name:'初回お試しロング編集',price:15000,scope:TRIAL_SCOPE}
});
export const isTrial=service=>['trialshort','triallong'].includes(service);
export function currentEditPrice(service,seconds){
 const item=CURRENT_EDIT_SERVICES[service];if(!item)throw Error('編集サービスを確認してください。');
 if(!/^\d+$/.test(String(seconds))||!Number.isSafeInteger(Number(seconds))||Number(seconds)<1)throw Error('合意する完成尺を1秒以上の整数で入力してください。');
 if(!isTrial(service)&&Number(seconds)>(service==='short'?30:420))throw Error('通常料金の完成尺を超えます。個別見積もりの書面で条件・総額を確認してください。');
 return item.price;
}
