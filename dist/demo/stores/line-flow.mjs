// Unpublished candidate. Requires separately approved provider and RPC deployment.
export const LINE_PROVIDER = 'custom:line';
export const LINE_CALLBACK = 'https://local-koho.com/demo/stores/staff-line.html';
export function consumeOAuthCode(location, history) {
  const query = new URLSearchParams(location.search);
  const codes = query.getAll('code');
  const failed = query.has('error') || query.has('error_code') || Boolean(location.hash);
  if (location.search || location.hash) history.replaceState(null, '', location.pathname);
  if (failed || codes.length > 1 || (codes.length === 1 && !codes[0])) return {invalid:true};
  return codes.length ? {code:codes[0]} : null;
}
export function normalizeStaffName(value) {
  const name = String(value ?? '').trim();
  if (!name || [...name].length > 60 || /[\u0000-\u001f\u007f]/u.test(name)) throw new Error('店員名を1〜60文字で入力してください。');
  return name;
}
export function createLineFlow({client, navigate, configured=false}) {
  let busy=false, generation=0;
  async function exclusive(work) {
    if (busy) return {busy:true};
    busy=true;
    try { return await work(); } finally { busy=false; }
  }
  async function status() {
    const ticket=generation;
    const user=await client.auth.getUser();
    if(user.error || !user.data?.user?.id) throw new Error('ログインし直してください。');
    // This RPC must enforce identity and membership on the server, never trust UI metadata.
    const result=await client.rpc('koho_my_line_staff_request');
    if(result.error) throw new Error('承認状況を確認できません。');
    if(ticket!==generation) return {cancelled:true};
    if(result.data?.state==='active') navigate('./staff.html');
    return result.data;
  }
  return {
    status,
    invalidate:()=>{generation++;},
    start:()=>exclusive(async()=>{
      if(!configured) throw new Error('LINEログインは準備中です。');
      const r=await client.auth.signInWithOAuth({provider:LINE_PROVIDER,options:{redirectTo:LINE_CALLBACK,scopes:'openid profile'}});
      if(r.error) throw new Error('LINEログインを開始できません。');
      return {started:true};
    }),
    callback:link=>exclusive(async()=>{
      const ticket=generation;
      if(!link || link.invalid || !link.code) throw new Error('ログインを最初からやり直してください。');
      const r=await client.auth.exchangeCodeForSession(link.code);
      if(ticket!==generation)return {cancelled:true};
      if(r.error) throw new Error('ログインを確認できません。');
      return status();
    }),
    request:name=>exclusive(async()=>{
      const ticket=generation;
      const staffName=normalizeStaffName(name);
      let r;
      try {r=await client.rpc('koho_request_line_staff',{p_staff_name:staffName});}
      catch {return {uncertain:true};}
      if(ticket!==generation)return {cancelled:true};
      // Do not retry a mutation whose outcome is uncertain. Read status before user retries.
      if(r.error) return {uncertain:true};
      return status();
    }),
    logout:async()=>{
      generation++;
      const r=await client.auth.signOut({scope:'local'});
      if(r?.error) throw new Error('ログアウトを完了できません。');
      return {signedOut:true};
    }
  };
}
