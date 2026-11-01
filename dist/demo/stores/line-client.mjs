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
  const client=createClient(projectUrl,publishableKey,{auth:{
    flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,
    storage:device.storage,storageKey:sessionKey
  }});
  client.deviceSession=device;
  const signOut=client.auth.signOut.bind(client.auth);
  client.auth.signOut=async(options={scope:'local'})=>{
    try{return await signOut(options);}finally{device.forget();}
  };
  return client;
}
