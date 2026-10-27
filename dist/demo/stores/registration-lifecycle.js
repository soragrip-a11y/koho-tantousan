import {prepareRegistration,mountRegistration} from './registration-ui.js?v=20261027-1';

// New callbacks can arrive in a tab that is already open. Each generation owns
// its DOM and memory-only client, so a late response cannot replace a newer UI.
export function startRegistration({window,app,createClient,url,key,fetch,owner=false,confirm}){
 let client=null,dispose=null;
 function start(){
  dispose?.();
  client?.auth.stopAutoRefresh?.();
  const prepared=prepareRegistration({location:window.location,history:window.history,createClient,url,key,fetch});
  client=prepared.client;
  const root=app.ownerDocument.createElement('div');
  app.replaceChildren(root);
  dispose=mountRegistration({app:root,...prepared,owner,confirm:confirm??window.confirm.bind(window)});
 }
 const onHash=()=>{if(window.location.hash)start();};
 const onPop=()=>{if(!window.location.hash)start();};
 window.addEventListener('hashchange',onHash);
 window.addEventListener('popstate',onPop);
 start();
 return ()=>{dispose?.();window.removeEventListener('hashchange',onHash);window.removeEventListener('popstate',onPop);client?.auth.stopAutoRefresh?.();app.replaceChildren();};
}
