import {createClient} from './supabase-client.js?v=20261025-9';
import {createDeviceSession,SESSION_KEY} from './device-session.js?v=20261026-23';
import {mountLineEntry} from './mount-line-entry.mjs';
// Remains OFF until explicit deployment approval and reviewed DB migration.
const LINE_RELEASE_ENABLED=true;
const APPLICATION_RELEASE_ENABLED=false;
let disk,tabStorage;try{disk=localStorage;tabStorage=sessionStorage;}catch{}
let dispose;
async function initialize(){dispose?.();dispose=await mountLineEntry({enabled:LINE_RELEASE_ENABLED,applicationEnabled:APPLICATION_RELEASE_ENABLED,document,location,history,navigate:p=>location.assign(p),clientOptions:{
 createClient,createDeviceSession,sessionKey:SESSION_KEY,disk,tabStorage,
 projectUrl:'https://rnedesemnameergeksuo.supabase.co',publishableKey:'sb_publishable_1cvATE0gIUh8qonNQPQtxg_ednp29if'
}});}
const failed=()=>{
 document.getElementById('status').textContent='ログイン画面を準備できませんでした。時間をおいて開き直してください。';
 document.getElementById('request').hidden=true;
};
initialize().catch(failed);
addEventListener('pagehide',()=>dispose?.());
addEventListener('pageshow',event=>{if(event.persisted)initialize().catch(failed);});
