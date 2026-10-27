import {validDemoPhoto} from './demo-photo.js?v=20261027-3';
import {validateSchedule} from './schedule.js?v=20261027-2';
// Synthetic in-memory model. No user identity, persistence or network adapter.
export const initialDraft=()=>({title:'',text:'',photo:'local',image:'',start:null,end:null});
export function validateDraft(draft){
 if(draft.photo!=='local'||!validDemoPhoto(draft.image))throw Error('写真を撮るか、端末の写真を選んでください。');
 if(typeof draft.title!=='string'||!draft.title.trim()||draft.title.length>40)throw Error('見出しを1〜40文字で入力してください。');
 if(typeof draft.text!=='string'||!draft.text.trim()||draft.text.length>180)throw Error('本文を1〜180文字で入力してください。');
 return {title:draft.title.trim(),text:draft.text.trim(),photo:draft.photo,image:draft.photo==='local'?draft.image:'',...validateSchedule(draft)};
}
export function createDemo(){let posts=[],next=1;return Object.freeze({
 list:()=>posts.map(p=>({...p})),
 save(draft,id=null){const valid=validateDraft(draft);if(id!==null){const old=posts.find(p=>p.id===id);if(!old)throw Error('デモの投稿が見つかりません。');Object.assign(old,valid,{state:'active'});return {...old};}if(posts.length>=5)throw Error('体験デモは5件までです。編集するか、デモを最初からやり直してください。');const p={...valid,id:next++,state:'active'};posts.unshift(p);return {...p};},
 end(id){const p=posts.find(p=>p.id===id);if(!p)throw Error('デモの投稿が見つかりません。');p.state='ended';},
 reset(){posts=[];next=1;}
});}
