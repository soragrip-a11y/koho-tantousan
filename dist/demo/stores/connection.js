import {createClient} from './supabase-client.js?v=20261025-9';
import {createDeviceSession,SESSION_KEY} from './device-session.js?v=20261026-23';
// Intentionally public browser key. Authorization is enforced by server-side rules.
export const PROJECT_URL='https://rnedesemnameergeksuo.supabase.co';
export function createStoreClient({staff=false,memoryOnly=false}={}){
 let disk,tabStorage;try{if(staff){disk=globalThis.localStorage;tabStorage=globalThis.sessionStorage;}}catch{}
 const device=staff?createDeviceSession(disk,{memoryOnly,tabStorage}):null;
 const client=createClient(PROJECT_URL,'sb_publishable_1cvATE0gIUh8qonNQPQtxg_ednp29if',{
  auth:{persistSession:staff,autoRefreshToken:true,detectSessionInUrl:false,...(device?{storage:device.storage,storageKey:SESSION_KEY}:{})},
 });
 if(device){client.deviceSession=device;const signOut=client.auth.signOut.bind(client.auth);client.auth.signOut=async(options={scope:'local'})=>{try{return await signOut(options);}finally{if(!memoryOnly||device.remembered)device.forget();}};}
 return client;
}
