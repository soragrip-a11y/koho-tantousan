const KEY='koho-notice-likes-browser-v1';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createNoticeLikes(client,{storage,locks,randomUUID=()=>crypto.randomUUID()}={}){
 let browserId,states=new Map();const pending=new Map(),uncertain=new Map();
 async function identity(){
  if(browserId)return browserId;
  if(!storage||!locks)throw Error('このブラウザーではいいねを保存できません。');
  browserId=await locks.request(KEY,()=>{let id=storage.getItem(KEY);if(!uuid.test(id||'')){id=randomUUID();storage.setItem(KEY,id);if(storage.getItem(KEY)!==id)throw Error('保存できません。');}return id;});
  return browserId;
 }
 async function rpc(name,args){const r=await client.rpc(name,args);if(r.error)throw Error('通信結果を確認できません。もう一度押すと同じ操作を確認します。');return r.data;}
 return {
  state(id){return states.get(id)||null;},
  busy(id){return pending.has(id);},
  async refresh(storeId){const id=await identity();const rows=await rpc('koho_my_notice_likes',{p_store_id:storeId,p_browser_id:id});states=new Map(rows.map(r=>[r.notice_id,(states.get(r.notice_id)?.revision>r.revision?states.get(r.notice_id):{liked:r.liked,revision:r.revision})]));return states;},
  toggle(storeId,noticeId){
   if(pending.has(noticeId))return pending.get(noticeId);
   const promise=(async()=>{
    const id=await identity();
    return locks.request(KEY+':'+storeId+':'+noticeId,async()=>{
     let operation=uncertain.get(noticeId);
     if(!operation){
      const rows=await rpc('koho_my_notice_likes',{p_store_id:storeId,p_browser_id:id});const current=rows.find(r=>r.notice_id===noticeId);
      if(!current){states.delete(noticeId);throw Error('この投稿には今はいいねできません。更新してください。');}
      operation={p_store_id:storeId,p_notice_id:noticeId,p_browser_id:id,p_liked:!current.liked,p_expected_revision:current.revision};
      uncertain.set(noticeId,operation);
     }
     const result=await rpc('koho_set_notice_like',operation);
     states.set(noticeId,{liked:result.liked,revision:result.revision});uncertain.delete(noticeId);
     if(!result.accepted)throw Error('ほかの画面で状態が変わりました。現在の状態を表示しました。');
     return result.liked;
    });
   })().finally(()=>pending.delete(noticeId));
   pending.set(noticeId,promise);return promise;
  }
 };
}
export function likeMarkup(id,state,busy=false){
 // IDs originate from the server; restrict before interpolating an attribute.
 if(!/^[0-9a-f-]{36}$/i.test(id))return '';
 return '<button type="button" class="notice-heart" data-like="'+id+'" aria-label="'+(state?.liked?'いいねを取り消す':'いいねする')+'" aria-pressed="'+Boolean(state?.liked)+'" '+(!state||busy?'disabled':'')+'><svg class="heart-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></button><p class="like-status" data-like-status="'+id+'" role="status" aria-live="polite"></p>';
}
