import {createClient} from './supabase-client.js?v=20261025-9';
// Intentionally public browser key. Authorization is enforced by server-side rules.
export const PROJECT_URL='https://rnedesemnameergeksuo.supabase.co';
export function createStoreClient(){
 return createClient(PROJECT_URL,'sb_publishable_1cvATE0gIUh8qonNQPQtxg_ednp29if',{
  auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false},
 });
}
