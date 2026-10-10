import { calculate, PLANS, clean, yen, periodEnd, validateContract } from './contract-core.js?v=20261010-simple';
import { generateContract } from './contract-pdf.js?v=20261010-simple';

const form = document.querySelector('#contract-form');
const $ = id => document.getElementById(id);
const value = id => clean($(id).value);
let pdfUrl, busy = false;
function show(id, visible) {
  $(id).hidden = !visible;
  $(id).querySelectorAll('input,select,textarea').forEach(el => el.disabled = !visible);
}
function collect() {
  const data = {};
  form.querySelectorAll('[name]').forEach(el => data[el.name] = el.hasAttribute('data-numeric') && el.value === '' && el.getAttribute('min') === '0' ? '0' : clean(el.value));
  data.payer = $('payerSame').checked ? data.customer : data.payer;
  data.reviewed = $('reviewed').checked;
  data.extras = [0,1,2].map(i=>({label:value('extraLabel'+i),amount:data['extraAmount'+i],timing:value('extraTiming'+i)}));
  return data;
}
function invalidatePDF() {
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  pdfUrl = null;
  $('pdf-result').hidden = true;
  $('pdf-download').removeAttribute('href'); $('pdf-open').removeAttribute('href');
  $('pdf-status').textContent = '';
}
function update() {
  const plan = PLANS[value('plan')], monthly = value('plan') !== 'single';
  show('months-wrap', monthly); show('included-shoot', value('plan') === 'premium');
  show('payer-fields', !$('payerSame').checked); $('payer').required = !$('payerSame').checked;
  $('end').readOnly = monthly; $('months').setAttribute('min', plan.months || 1);
  $('shorts').setAttribute('min', plan.short); $('longs').setAttribute('min', plan.long);
  if (monthly) { try { $('end').value = periodEnd(value('start'),value('months')); } catch { $('end').value = ''; } }
  $('period-hint').textContent = monthly ? `最低${plan.months}か月。その後は1か月ごとに自動更新。更新停止・変更は満了14日前まで。開始日を起算し、翌月の同日の前日（同日がない場合は月末）までを1か月として計算します。月額は開始日からの1か月単位で計算します。` : '単発制作には自動更新はありません。完了予定日を指定してください。';
  $('plan-scope').textContent = plan.scope;
  $('quantity-hint').textContent = monthly ? `各月の総本数を入力。プラン内はショート${plan.short}本・ロング${plan.long}本で、超過分のみ追加計算します。` : '今回の契約全体の本数を入力してください。';
  $('shoot-hint').textContent = monthly ? '追加撮影は毎月の回数です。4時間22,000円／回、7時間32,000円／回。プレミアムの月1回分は上の欄で指定し、追加回数には含めません。' : '今回の契約全体の撮影回数です。4時間22,000円／回、7時間32,000円／回。';
  [0,1,2].forEach(i=>{ $('extraTiming'+i).disabled=!monthly; if(!monthly) $('extraTiming'+i).value='once'; });
  const data = collect();
  $('summary-plan').textContent = plan.name + (monthly ? ` / 初回${value('months') || '—'}か月` : ' / 1契約');
  $('summary-period').textContent = data.start && data.end ? `${data.start} 〜 ${data.end}` : '期間を入力すると終了日を確認できます。';
  try {
    const c = calculate(data);
    $('summary-error').textContent = '';
    $('recurring-label').textContent = monthly ? '月額（税込）' : '単発の制作・撮影料金';
    // The one-off total is shown once; do not duplicate custom rows in the headline.
    $('summary-recurring').textContent = yen(monthly ? c.recurring : c.oneTime);
    $('summary-once').textContent = monthly ? yen(c.oneTime) : '上記に含む';
    $('summary-total').textContent = yen(c.total);
    $('final-total').textContent = `初回契約期間の確定総額：${yen(c.total)}（税込）／後日精算の実費は含みません。`;
    $('summary-lines').replaceChildren(...c.rows.map(r=>{const p=document.createElement('p');p.textContent=`${r.label} × ${r.qty}：${yen(r.amount)}${r.timing==='monthly'?'／月':'／契約'}`;return p;}));
  } catch(e) {
    $('summary-error').textContent = e.message; $('final-total').textContent = '入力内容を確認すると、ここに確定総額が表示されます。';
    ['summary-recurring','summary-once','summary-total'].forEach(id=>$(id).textContent='—');
    $('summary-lines').replaceChildren();
  }
}
// Text fields with a numeric keyboard let touch users replace or erase values reliably.
form.addEventListener('focusin',e=>{
  if(busy || !e.target.hasAttribute('data-numeric'))return;
  if(e.target.value === '0') e.target.value = '';
  else e.target.select();
});
form.addEventListener('focusout',e=>{
  if(busy || !e.target.hasAttribute('data-numeric'))return;
  if(e.target.value === '' && e.target.getAttribute('min') === '0') e.target.value = '0';
  update();
});
form.addEventListener('input',e=>{
  if(busy)return;
  if(e.target.hasAttribute('data-numeric') && /^\d+$/.test(e.target.value)) e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
  invalidatePDF(); $('contract-error').hidden = true;
  if(e.target.id !== 'reviewed') $('reviewed').checked = false;
  update();
});
form.addEventListener('change',e=>{
  if(busy)return;
  invalidatePDF(); if(e.target.id !== 'reviewed') $('reviewed').checked=false;
  if(e.target.id==='plan') {
    const p=PLANS[value('plan')]; $('shorts').value=p.short||1; $('longs').value=p.long;
    $('months').value=p.months||1; $('includedHours').value='4'; $('end').value='';
    $('shoot4').value=0; $('shoot7').value=0;
  }
  update();
});
let libraries;
function loadScript(src, globalName) {
  if(globalThis[globalName])return Promise.resolve(globalThis[globalName]);
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const timer=setTimeout(()=>{script.remove();reject(new Error('PDF作成に必要なファイルの読み込みがタイムアウトしました。通信状態を確認して再度お試しください。'));},30000);
    script.src=src;
    script.onload=()=>{clearTimeout(timer);if(globalThis[globalName])resolve(globalThis[globalName]);else reject(new Error('PDFライブラリを読み込めませんでした。'));};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('PDF作成に必要なファイルを読み込めませんでした。再度お試しください。'));};
    document.head.append(script);
  });
}
async function dependencies() {
  if(!libraries) libraries=(async()=>{
    const [PDFLib,fontkit,fontBytes]=await Promise.all([
      loadScript('vendor/pdf-lib-1.17.1.min.js','PDFLib'),loadScript('vendor/fontkit-1.1.1.min.js','fontkit'),
      (async()=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);try{const r=await fetch('assets/fonts/NotoSansJP-Regular.ttf',{signal:controller.signal});if(!r.ok)throw new Error('日本語フォントを読み込めませんでした。');return new Uint8Array(await r.arrayBuffer());}finally{clearTimeout(timer);}})()
    ]); return {PDFLib,fontkit,fontBytes};
  })().catch(e=>{libraries=null;throw e;});
  return libraries;
}
form.addEventListener('submit',async e=>{
  e.preventDefault(); if(busy || !form.reportValidity())return;
  const data=collect();
  try {validateContract(data);} catch(error){$('contract-error').textContent=error.message;$('contract-error').hidden=false;$('contract-error').focus();return;}
  invalidatePDF();busy=true;
  const enabled=[...form.querySelectorAll('input,select,textarea,button')].filter(el=>!el.disabled);
  enabled.forEach(el=>el.disabled=true);
  $('create-pdf').textContent='PDFを作成しています…'; $('pdf-status').textContent='日本語フォントを読み込み、契約内容と利用条件をPDFにまとめています。';
  try {
    const bytes=await generateContract(data,await dependencies());
    pdfUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    const link=$('pdf-download');link.href=pdfUrl;link.download=`広報担当さん_契約書_${data.contractDate}.pdf`;
    $('pdf-open').href=pdfUrl;$('pdf-result').hidden=false;
    $('pdf-status').textContent='PDFを作成しました。署名前に内容を双方で確認してください。';
    link.click();link.focus();
  } catch(error) {
    $('contract-error').textContent=error.name==='AbortError'?'読み込みがタイムアウトしました。通信状態を確認して再度お試しください。':`PDFを作成できませんでした。${error.message}`;
    $('contract-error').hidden=false; $('contract-error').focus();$('pdf-status').textContent='入力内容は保持されています。修正または再試行してください。';
  } finally {enabled.forEach(el=>el.disabled=false);busy=false;$('create-pdf').textContent='契約書PDFを作成・保存';update();}
});
$('contractDate').value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
update(); $('create-pdf').disabled=false;
