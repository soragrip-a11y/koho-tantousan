// Deploy beside existing /demo/stores/connection.js ONLY after approval.
import {createStoreClient} from './connection.js?v=20261026-23';
import {createQueueOnlyTest} from './scheduler-test-controller.mjs';
const EXPECTED_TEST_USER_ID = '0f3799be-ff3b-4458-a713-25dcf4cacd44'; // Confirmed dedicated account. This guardrail does not replace server authorization.
const status = document.querySelector('#status');
const login = document.querySelector('#login');
const loginButton = document.querySelector('#login-button');
const submit = document.querySelector('#submit');
// This page never consumes URL credentials or callback sessions.
if (location.search || location.hash) {
  history.replaceState(null, '', location.pathname);
  status.textContent = 'このページはメール確認リンクを受け付けません。通常の確認を完了してから開いてください。';
} else if (EXPECTED_TEST_USER_ID) {
  const client = createStoreClient({staff:true,memoryOnly:true});
  const test = createQueueOnlyTest(client, EXPECTED_TEST_USER_ID);
  loginButton.disabled = false;
  status.textContent = 'テスト用アカウントでログインしてください。ログイン情報はこのページのメモリ内だけで保持します。';
  login.addEventListener('submit', async event => {
    event.preventDefault();
    loginButton.disabled = true;
    submit.disabled = true;
    let password = document.querySelector('#password').value;
    document.querySelector('#password').value = '';
    try {
      const email = document.querySelector('#email').value.trim();
      const result = await client.auth.signInWithPassword({email,password});
      if (result.error) throw Error();
      await test.eligible();
      login.hidden = true;
      submit.disabled = false;
      status.textContent = '新規申請が可能です。下のボタンで申請1件を保存します。';
    } catch {
      status.textContent = '対象アカウント・メール確認・申請状態を確認できませんでした。申請は送信していません。';
      loginButton.disabled = false;
    } finally { password = ''; }
  });
  submit.addEventListener('click', async () => {
    if (submit.disabled || !confirm('テスト申請を1件保存し、定期処理から設定済みの責任者宛てに通知1通を送りますか？')) return;
    submit.disabled = true;
    try {
      await test.submit();
      status.textContent = '申請を保存しました。画面を閉じて構いません。配送と重複防止は担当の確認をお待ちください。';
    } catch {
      status.textContent = '処理結果の確認が必要です。もう一度申請せず、担当の確認をお待ちください。';
    }
  });
}
