// Shared storage adapter. All authorization is enforced by server-side RPC and RLS.
const STORE='nakatomi',BUCKET='koho-notice-images';
const allowedActions=new Set(['publish','end','withdraw']);
function failure(error){
  const message=error?.code==='40001'?'別の変更が保存されています。再読み込みして確認してください。':'保存先に接続できませんでした。保存は完了していません。';
  return Object.assign(new Error(message),{code:error?.code||'BACKEND_ERROR'});
}
function notice(row){
  return {id:row.id,storeId:row.store_id,title:row.title,text:row.body,
    imagePath:row.image_path,end:row.expires_at,publishedAt:row.published_at,
    state:row.state,version:row.version};
}
// Keep the operation object through retries. New edits get new request IDs.
export function prepareChange(action,existing,draft={}){
  if(!allowedActions.has(action)||(!existing&&action!=='publish'))throw Error('invalid action');
  return Object.freeze({p_id:existing?.id||crypto.randomUUID(),p_action:action,
    p_expected_version:existing?.version||0,p_request_id:crypto.randomUUID(),
    p_title:action==='publish'?draft.title:null,p_body:action==='publish'?draft.text:null,
    p_image_path:action==='publish'?(draft.imagePath??null):null});
}
export function createNoticeRepository(client){
  async function rpc(name,parameters){
    const {data,error}=await client.rpc(name,parameters);
    if(error)throw failure(error);
    return data;
  }
  return Object.freeze({
    async listPublic(){return (await rpc('koho_list_notices',{p_store_id:STORE})).map(notice);},
    async listStaff(){return (await rpc('koho_list_staff_notices',{p_store_id:STORE})).map(notice);},
    async signIn(email,password){
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error)throw new Error('ログインできませんでした。');
      try{if(!await rpc('koho_can_manage',{p_store_id:STORE}))throw new Error('この店舗の操作権限がありません。');}
      catch(error){await client.auth.signOut({scope:'local'});throw error;}
    },
    async signOut(){const {error}=await client.auth.signOut();if(error)throw failure(error);},
    async save(operation){return notice(await rpc('koho_change_notice',operation));},
    async uploadPhoto(jpeg){
      if(jpeg.type!=='image/jpeg'||jpeg.size>2097152||jpeg.size===0)throw new Error('写真の形式かサイズを確認してください。');
      const path=STORE+'/'+crypto.randomUUID()+'.jpg';
      const {error}=await client.storage.from(BUCKET).upload(path,jpeg,{contentType:'image/jpeg',upsert:false});
      if(error)throw failure(error);
      return path;
    },
    async downloadPhoto(path){
      const {data,error}=await client.storage.from(BUCKET).download(path);
      if(error)throw failure(error);
      return data; // Blob -> temporary object URL; revoke when the card is disposed.
    }
  });
}

// Browser-only preparation; same limits as the demo, JPEG re-encoding removes EXIF.
export async function normalizePhoto(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('unsupported image');
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width*bitmap.height>50000000)throw Error('image too large');
    const canvas=document.createElement('canvas'),scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));
    if(!blob||blob.size>2097152)throw Error('image conversion failed');
    return blob;
  }finally{bitmap.close();}
}
