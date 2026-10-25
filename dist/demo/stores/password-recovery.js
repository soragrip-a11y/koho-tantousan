import {consumeRecoveryLink,mountRecovery} from './password-recovery-ui.js?v=20261025-15';
const link=consumeRecoveryLink(window.location,window.history);
const {createStoreClient}=await import('./connection.js?v=20261025-9');
mountRecovery({app:document.querySelector('#app'),client:createStoreClient(),link});
