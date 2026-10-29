// Candidate only. Supply existing public project config and existing device-session factory.
// This adapter neither configures a provider nor grants membership.
export function createLineClient({enabled=false,createClient,createDeviceSession,
  projectUrl,publishableKey,sessionKey,disk,tabStorage}) {
  if(!enabled)throw new Error('LINEログインは準備中です。');
  if(!tabStorage || !sessionKey)throw new Error('このブラウザーではログインを続けられません。');
  // Prove same-tab PKCE persistence is available before leaving for LINE.
  const probe=`${sessionKey}-storage-check`;
  try {tabStorage.setItem(probe,'ok');if(tabStorage.getItem(probe)!=='ok')throw Error();tabStorage.removeItem(probe);}
  catch {throw new Error('ブラウザーの保存機能が利用できません。別の通常ブラウザーで開いてください。');}
  const device=createDeviceSession(disk,{tabStorage});
  const storage=createLineProofStorage(device.storage,disk,sessionKey);
  const client=createClient(projectUrl,publishableKey,{auth:{
    flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,
    storage,storageKey:sessionKey
  }});
  client.deviceSession=device;
  const signOut=client.auth.signOut.bind(client.auth);
  client.auth.signOut=async(options={scope:'local'})=>{
    try{return await signOut(options);}finally{storage.clearProof();device.forget();}
  };
  return client;
}

// Only the single-use PKCE verifier crosses tabs of this origin. Sessions retain
// the existing explicit remember choice. Nothing is placed in URLs or logs.
export function createLineProofStorage(base,disk,sessionKey,now=Date.now){
 const verifierKey=sessionKey+'-code-verifier',bridgeKey=sessionKey+'-line-proof';
 const clearProof=()=>{try{disk?.removeItem(bridgeKey);}catch{};base.removeItem(verifierKey);};
 function readProof(){
  let raw;try{raw=disk?.getItem(bridgeKey);}catch{return null;}
  if(!raw)return null;
  try{
   const entry=JSON.parse(raw);
   if(typeof entry.value!=='string'||!Number.isFinite(entry.expires)||entry.expires<=now()||entry.expires>now()+600000){clearProof();return null;}
   return entry.value;
  }catch{clearProof();return null;}
 }
 readProof();
 return {
  clearProof,
  getItem(k){return k===verifierKey?readProof()??base.getItem(k):base.getItem(k);},
  setItem(k,v){
   base.setItem(k,v);
   if(k===verifierKey && disk)try{disk.setItem(bridgeKey,JSON.stringify({value:v,expires:now()+600000}));base.removeItem(k);}catch{}
  },
  removeItem(k){if(k===verifierKey)clearProof();else base.removeItem(k);}
 };
}
