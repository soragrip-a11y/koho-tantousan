export const KEY = 'koho-store-demo-v1';
export function seed(now = Date.now()) {
 return [{id:'sample-1',title:'焼きたてパンのお得なセット',text:'お好きなパンを楽しむセットの掲載例です。写真・価格・内容をお店で更新できます。',end:new Date(now+86400000).toISOString(),state:'active',image:''},{id:'sample-2',title:'夕方のお惣菜のお知らせ',text:'もう一つのお知らせの見本です。それぞれ個別に終了できます。',end:new Date(now+172800000).toISOString(),state:'active',image:''}];
}
export function status(item, now=Date.now()) { return item.state==='hidden'?'hidden': item.state==='soldout'?'soldout':item.state==='ended'||Date.parse(item.end)<=now?'ended':'active'; }
export function validate(item){
 if(!item.title.trim()||item.title.trim().length>40)throw Error('見出しは1〜40文字で入力してください。');
 if(!item.text.trim()||item.text.trim().length>180)throw Error('本文は1〜180文字で入力してください。');
 if(!Number.isFinite(Date.parse(item.end)))throw Error('掲載終了日時を入力してください。');
 if(!['active','soldout','ended','hidden'].includes(item.state))throw Error('状態が不正です。');
 return {...item,title:item.title.trim(),text:item.text.trim()};
}
// Replace this adapter with an authenticated API in production; never trust a client store ID.
export class LocalRepository {
 constructor(storage){this.storage=storage;}
 load(){const raw=this.storage.getItem(KEY); if(!raw){const data=seed();this.save(data);return data;} const data=JSON.parse(raw); if(!Array.isArray(data)||data.length>30)throw Error('保存データを読めません。リセットしてください。'); return data.map(validate);}
 save(items){this.storage.setItem(KEY,JSON.stringify(items));}
 reset(){const data=seed();this.save(data);return data;}
}
