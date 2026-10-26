export const SESSION_KEY='koho-staff-session-v1',CHOICE_KEY='koho-staff-remember-v1';
export const rememberMarkup='<label class="remember-device"><input name="remember" type="checkbox"> この端末でログインを保持</label><p class="remember-help">自分だけが使う端末で選んでください。共用端末では選ばないでください。保持中も再ログインが必要になる場合があります。</p>';
export function createDeviceSession(disk,{memoryOnly=false,tabStorage}={}){
 const memory=new Map();let enabled=false;
 try{enabled=!memoryOnly&&!tabStorage?.getItem(SESSION_KEY)&&disk?.getItem(CHOICE_KEY)==='yes';}catch{}
 const allowed=()=>{try{return enabled&&disk?.getItem(CHOICE_KEY)==='yes';}catch{return false;}};
 const own=k=>k===SESSION_KEY||k.startsWith(SESSION_KEY+'-');
 function clearOwned(storage){try{for(let i=(storage?.length||0)-1;i>=0;i--){const k=storage.key(i);if(k&&own(k))storage.removeItem(k);}}catch{}}
 function forget(){enabled=false;memory.clear();clearOwned(tabStorage);clearOwned(disk);try{disk?.removeItem(CHOICE_KEY);}catch{}}
 return {
  get remembered(){return allowed();},
  get hasSession(){try{return Boolean(allowed()?disk.getItem(SESSION_KEY):!memoryOnly&&tabStorage?.getItem(SESSION_KEY));}catch{return false;}},
  // Explicit same-tab continuation after an isolated email callback. No URL tokens.
  continueInTab(){if(!memoryOnly)return;const value=memory.get(SESSION_KEY);if(!value||!tabStorage)throw Error('Session continuity unavailable');clearOwned(tabStorage);tabStorage.setItem(SESSION_KEY,value);},
  choose(value){forget();if(value){try{disk.setItem(CHOICE_KEY,'yes');enabled=true;}catch{throw Error('この端末ではログインを保持できません。チェックを外してログインしてください。');}}},
  forget,
  storage:{getItem(k){if(!own(k))return null;try{return allowed()?disk.getItem(k):(!memoryOnly?tabStorage?.getItem(k):null)??memory.get(k)??null;}catch{return null;}},setItem(k,v){if(!own(k))return;if(allowed()){disk.setItem(k,v);}else if(!memoryOnly&&tabStorage){tabStorage.setItem(k,v);}else memory.set(k,v);},removeItem(k){memory.delete(k);try{if(own(k)){if(allowed())disk?.removeItem(k);else if(!memoryOnly)tabStorage?.removeItem(k);}}catch{}}}
 };
}
