// Staff sessions use explicit device opt-in or same-tab continuity.
import {createStoreClient} from './connection.js?v=20261026-23';
import {startRegistration} from './registration-lifecycle.js?v=20261027-1';
startRegistration({window,app:document.querySelector('#app'),owner:document.body.dataset.owner==='true',createClient:(_u,_k,options)=>createStoreClient({staff:true,memoryOnly:options?.deviceMemoryOnly})});
