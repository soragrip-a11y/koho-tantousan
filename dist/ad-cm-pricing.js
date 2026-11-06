export const LEGACY_AD_CM=Object.freeze({name:'SNS広告CM制作',price:55000,scope:"構成1案、支給資料の確認、基本的なAI画像素材制作・基本アニメーション、テロップ、AIナレーション、BGM・効果音、縦動画1本の完成MP4納品、修正2回まで、広告利用を前提とした素材利用条件の確認を含みます。",exclusions:"撮影、複雑なアニメーション、大量の素材生成、構成確定後の大幅変更、3回目以降の修正、別サイズ・別パターン、外注ナレーター、有料素材、広告出稿費・広告運用は別見積もりです。"});
export const AD_CM_VERSION='20261106';
export const AD_CM=Object.freeze({"name":"アニメーションCM","price":33000,"scope":"30秒以内のアニメーションCMを単発で制作します。制作内容・納品形式・修正条件・追加費用は契約時に相談し、総額と範囲を確認します。","exclusions":"実写の月額パックとは別メニューです。30秒を超える制作や追加条件は要相談。広告出稿・広告運用等は含むと決めず、個別に確認します。"});
export function adCmPrice(seconds){if(!/^\d+$/.test(String(seconds))||Number(seconds)<1||Number(seconds)>30)throw Error('アニメーションCMは完成30秒以内が基本です。超過は個別相談です。');return AD_CM.price;}
