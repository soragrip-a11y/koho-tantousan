import {prepareChange} from './notice-repository.js?v=20261025-17';
// No credentials, persistent session, localStorage or automatic demo fallback.
export function createSharedWorkflow(repository){
 let authorized=false,pending=null,inflight=null;
 const requireStaff=()=>{if(!authorized)throw Error('ログインが必要です。');};
 return {
  async login(email,password){authorized=false;await repository.signIn(email,password);authorized=true;},
  async logout(){authorized=false;pending=null;await repository.signOut();},
  async list(){requireStaff();return repository.listStaff();},
  save(action,existing,draft={}){
   requireStaff();
   if(inflight)return inflight;
   // UI-generated timestamps/temporary IDs change on retry; only persisted input defines an edit.
   const signature=JSON.stringify([action,existing?.id,existing?.version,draft.title,draft.text,draft.image]);
   inflight=(async()=>{
    if(pending?.signature!==signature){
     let imagePath=existing?.imagePath??null;
     if(action==='publish'){
      if(!draft.image)imagePath=null;
      else if(draft.image!==existing?.image){
       if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(draft.image))throw Error('画像形式が不正です。');
       const bytes=Uint8Array.from(atob(draft.image.split(',')[1]),c=>c.charCodeAt(0));
       imagePath=await repository.uploadPhoto(new Blob([bytes],{type:'image/jpeg'}));
      }
     }
     pending={signature,operation:prepareChange(action,existing,{...draft,imagePath})};
    }
    const saved=await repository.save(pending.operation);
    pending=null;return saved;
   })().finally(()=>{inflight=null;});
   return inflight;
  }
 };
}
