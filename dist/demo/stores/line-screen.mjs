// Candidate adapter: no client is created here. Production integration is gated.
export function describeStatus(result) {
  const state = result?.state;
  return ({
    pending: {text:'申請を受け付けました。承認されると投稿画面へ移動します。', request:false, poll:true},
    active: {text:'利用できます。投稿画面へ移動します。', request:false, poll:false},
    approved: {text:'利用権限を確認できません。管理者へお問い合わせください。', request:false, poll:false},
    rejected: {text:'今回は承認されませんでした。再申請について管理者へご確認ください。', request:false, poll:false},
    expired: {text:'申請の期限が切れました。もう一度申請してください。', request:true, poll:false},
    none: {text:'店員名を入力して利用を申請してください。', request:true, poll:false},
    separate_identity_required: {text:'このログイン情報ではLINEの新規申請に進めません。管理者へお問い合わせください。', request:false, poll:false},
    identity_changed: {text:'申請時のLINE情報を確認できません。管理者へお問い合わせください。', request:false, poll:false},
    stopped: {text:'利用が停止されています。管理者へお問い合わせください。', request:false, poll:false}
  })[state] ?? {text:'利用状況を確認できません。時間をおいて再確認してください。', request:false, poll:false};
}

export function approvalLabel(row) {
  // Render with textContent, never innerHTML. Name is a label, not identity.
  return row.identity_kind === 'line'
    ? `${row.staff_name || '名前未設定'}（LINEから申請）`
    : `${row.email || 'メール情報なし'}（メールから申請）`;
}

export function createScreen({flow, render, schedule=setTimeout, cancel=clearTimeout}) {
  let timer, disposed=false, checking=false, epoch=0, submitting=false;
  const stopTimer=()=>{if(timer!==undefined)cancel(timer);timer=undefined;};
  function show(result) {
    if(disposed || result?.cancelled)return;
    stopTimer();
    render({...describeStatus(result),busy:false});
    if(describeStatus(result).poll)timer=schedule(()=>refresh(),15000);
  }
  async function refresh() {
    if(disposed || checking)return;
    stopTimer(); checking=true; const ticket=epoch;
    try {const result=await flow.status();if(ticket===epoch)show(result);}
    catch {if(ticket===epoch && !disposed)render({text:'確認できませんでした。再確認を押してください。',request:false,poll:false,busy:false});}
    finally {checking=false;}
  }
  return {
    refresh,
    async callback(link) {
      const ticket=epoch;
      try {const result=await flow.callback(link);if(ticket===epoch)show(result);}
      catch {if(ticket===epoch && !disposed)render({text:'ログインを確認できませんでした。LINEログインからやり直してください。',request:false,busy:false});}
    },
    async submit(name) {
      if(disposed || submitting)return;
      submitting=true;stopTimer();const ticket=epoch;
      render({text:'申請を保存しています。',request:false,busy:true});
      try {
        const result=await flow.request(name);
        if(ticket!==epoch || disposed)return;
        if(result?.uncertain)render({text:'保存結果を確認できませんでした。再申請せず、再確認を押してください。',request:false,busy:false});
        else show(result);
      } catch {if(ticket===epoch && !disposed)render({text:'申請できませんでした。入力内容と利用状況を再確認してください。',request:false,busy:false});}
      finally{submitting=false;}
    },
    async logout() {
      epoch++;stopTimer();
      try {await flow.logout();if(!disposed)render({text:'ログアウトしました。',request:false,busy:false});}
      catch {if(!disposed)render({text:'ログアウトを確認できませんでした。もう一度ログアウトしてください。',request:false,busy:false});}
    },
    dispose(){disposed=true;epoch++;stopTimer();}
  };
}
