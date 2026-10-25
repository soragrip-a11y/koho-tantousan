import {consumeRecoveryLink,mountRecovery} from './password-recovery-ui.js?v=20261025-18';
let generation=0,dispose=null,client=null;
async function start(){
 // Consume the callback synchronously, before SDK initialization or any await.
 // A mail app may reuse this tab and change only its fragment: modules do not rerun then.
 const link=consumeRecoveryLink(window.location,window.history),current=++generation;
 dispose?.();dispose=null;
 client?.auth.stopAutoRefresh();client=null;
 const {createStoreClient}=await import('./connection.js?v=20261025-9');
 if(current!==generation)return;
 client=createStoreClient();
 dispose=mountRecovery({app:document.querySelector('#app'),client,link});
}
window.addEventListener('hashchange',()=>{if(window.location.hash)void start();});
void start();
