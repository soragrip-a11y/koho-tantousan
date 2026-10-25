// Only safe, actionable messages reach the UI; never display provider payloads.
export function accessError(error,stage='auth'){
 const code=error?.code,status=error?.status;
 if(stage==='auth'&&code==='invalid_credentials')return 'メールアドレスまたはパスワードが一致しません。入力を確認してください。';
 if(stage==='auth'&&code==='email_not_confirmed')return 'メールアドレスの確認が完了していません。責任者へ連絡してください。';
 if(status===429||String(code||'').startsWith('over_'))return '操作回数の制限に達しました。続けて操作せず、時間をおいてください。';
 if(code==='STORE_DENIED'||code==='42501')return 'この店舗を操作する権限がありません。責任者へ連絡してください。';
 if(stage==='permission')return '店舗の権限を確認できませんでした。通信を確認して、もう一度ログインしてください。';
 if(stage==='list')return 'お知らせの一覧を取得できませんでした。通信を確認して読み直してください。';
 return 'ログイン先と通信できませんでした。通信を確認して、もう一度お試しください。';
}
