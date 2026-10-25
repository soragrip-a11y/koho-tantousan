// The server issues the exact photo list. No arbitrary path or SQL storage deletion.
export function createDeleteOperation(client){
 let running=null;
 async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw Object.assign(Error('削除は完了していません。写真が残っている場合があります。再度「削除する」を押して続けてください。'),{cause:error});return data;}
 return function removeNotice(notice){
  if(running)return running;
  running=(async()=>{
   const plan=await rpc('koho_prepare_delete',{p_id:notice.id,p_expected_version:notice.version,p_request_id:crypto.randomUUID()});
   if(!plan.done){
    for(let i=0;i<plan.paths.length;i+=100){
     const {error}=await client.storage.from('koho-notice-images').remove(plan.paths.slice(i,i+100));
     if(error)throw Error('写真の削除が完了していません。もう一度「削除する」を押して続けてください。');
    }
    return rpc('koho_finish_delete',{p_id:notice.id});
   }
   return plan;
  })().finally(()=>{running=null;});
  return running;
 };
}
export const DELETE_CONFIRMATION='この投稿と、この投稿だけが使う関連写真（以前の写真も含む）を削除します。この画面では元に戻せません。ほかの投稿が参照する写真と、非公開の操作記録（文章・写真の保存先情報）は残ります。削除しますか？';
