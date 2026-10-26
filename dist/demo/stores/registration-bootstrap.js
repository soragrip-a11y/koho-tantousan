// NOT deployed. Uses the existing approved connection adapter without embedding
// credentials or changing its memory-only session and refresh settings.
import {createStoreClient} from './connection.js';
import {startRegistration} from './registration-lifecycle.js?v=20261026-21';
startRegistration({window,app:document.querySelector('#app'),owner:document.body.dataset.owner==='true',createClient:()=>createStoreClient()});
