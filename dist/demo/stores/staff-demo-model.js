// Synthetic in-memory model. No user identity, persistence or network adapter.
export const samples=Object.freeze({bread:{label:'パンの見本',src:'./demo-bread.svg'},drink:{label:'飲みものの見本',src:'./demo-drink.svg'},none:{label:'写真なし',src:''}});
export const initialDraft=()=>({title:'今日のおすすめ',text:'焼きたてパンが並びました。\nお近くにお越しの際は、ぜひお立ち寄りください。',photo:'bread'});
export function validateDraft(draft){
 if(typeof draft.title!=='string'||!draft.title.trim()||draft.title.length>40)throw Error('見出しを1〜40文字で入力してください。');
 if(typeof draft.text!=='string'||!draft.text.trim()||draft.text.length>180)throw Error('本文を1〜180文字で入力してください。');
 if(!Object.hasOwn(samples,draft.photo))throw Error('見本の写真を選び直してください。');
 return {title:draft.title.trim(),text:draft.text.trim(),photo:draft.photo};
}
export function createDemo(){let posts=[],next=1;return Object.freeze({
 list:()=>posts.map(p=>({...p})),
 save(draft,id=null){const valid=validateDraft(draft);if(id!==null){const old=posts.find(p=>p.id===id);if(!old)throw Error('デモの投稿が見つかりません。');Object.assign(old,valid,{state:'active'});return {...old};}if(posts.length>=5)throw Error('体験デモは5件までです。編集するか、デモを最初からやり直してください。');const p={...valid,id:next++,state:'active'};posts.unshift(p);return {...p};},
 end(id){const p=posts.find(p=>p.id===id);if(!p)throw Error('デモの投稿が見つかりません。');p.state='ended';},
 reset(){posts=[];next=1;}
});}
