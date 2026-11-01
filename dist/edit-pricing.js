export const EDIT_PRICE_VERSION='2026-11-01';
export const SHORT_SCOPE='支給素材10分以内、カット・字幕・音量調整、修正1回。撮影・企画は別途。素材超過や複雑な編集は事前見積もりです。';
export const LONG_SCOPE='支給素材合計30分以内・カメラ1台。カット・要点字幕・BGM・基本音量／色調整・サムネイル1枚・修正1回を含みます。';
export const EDIT_EXCLUSIONS='全文字幕、複数カメラ、大量素材、複雑な図解や演出、大幅な構成変更は別見積もり。企画・台本・撮影・投稿運用、企業広告・PRの作り込みも別見積もりです。制作側のミスによる修正は有償回数に数えません。';
export function editPrice(service,seconds){
 if(!['short','long'].includes(service))throw Error('編集サービスの種別を選択してください。');
 if(!/^\d+$/.test(String(seconds))||!Number.isSafeInteger(Number(seconds))||Number(seconds)<1)throw Error('完成尺を1秒以上の整数で入力してください。');
 const n=Number(seconds),price=service==='short'?Math.ceil(n/30)*5000:30000+Math.ceil(Math.max(0,n-600)/300)*10000;
 if(!Number.isSafeInteger(price)||price>10000000)throw Error('計算可能な金額を超えています。個別にご相談ください。');
 return price;
}
