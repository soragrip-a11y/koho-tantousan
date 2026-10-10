import {calculatePrice} from './pricing.mjs?v=20261010-pricing2';
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open)});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');nav.classList.remove('is-open')}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.setAttribute('aria-expanded','false');nav.classList.remove('is-open');menu.focus()}});
const samples=[{title:'今日の活動を、\nひとつの話題に。',caption:'活動報告｜1分以内',steps:[['冒頭','どこで、何をしたのかを一言で。'],['本題','現場の映像と、活動のポイント。'],['結び','気づいたこと、次に取り組むこと。']]},{title:'難しいテーマを、\n普段の言葉で。',caption:'政策解説｜10分以内',steps:[['問い','暮らしにどう関係するのかを提示。'],['解説','根拠となる資料と、論点を整理。'],['まとめ','考え方と、これからの取り組み。']]},{title:'その疑問に、\nひとつずつ答える。',caption:'一問一答｜1分以内',steps:[['質問','よく聞かれる疑問を一つ選ぶ。'],['回答','結論と理由を短く伝える。'],['補足','必要な条件や注意点も添える。']]}];
const tabs=[...document.querySelectorAll('[data-template]')];
function setTab(index){tabs.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1});const s=samples[index];document.querySelector('#sample-title').textContent=s.title;document.querySelector('#sample-title').style.whiteSpace='pre-line';document.querySelector('#sample-caption').textContent=s.caption;document.querySelector('#sample-panel').setAttribute('aria-labelledby','tab-'+index);const list=document.querySelector('#sample-steps');list.replaceChildren(...s.steps.map(([a,b])=>{const li=document.createElement('li'),strong=document.createElement('b'),span=document.createElement('span');strong.textContent=a;span.textContent=b;li.append(strong,span);return li}))}
tabs.forEach((b,i)=>{b.addEventListener('click',()=>setTab(i));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();setTab(next);tabs[next].focus()}})});
const form=document.querySelector('#contact-form');
function inquiry(){const d=new FormData(form);return `広報担当さん ご担当者様\n\n【お名前】${d.get('name')}\n【所属】${d.get('organization')||'未記入'}\n【ご相談内容】${d.get('topic')}\n\n${d.get('message')}\n`;}
form?.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const subject='広報担当さんへのご相談：'+new FormData(form).get('topic');location.href='mailto:sora.grip@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(inquiry());document.querySelector('#form-status').textContent='メールアプリで内容を確認して送信してください。開かない場合は「相談内容をコピー」し、記載のメールアドレスにお送りください。'});
document.querySelector('#copy-inquiry')?.addEventListener('click',async()=>{if(!form.reportValidity())return;const status=document.querySelector('#form-status');try{await navigator.clipboard.writeText('送信先：sora.grip@gmail.com\n\n'+inquiry());status.textContent='コピーしました。メールに貼り付けてお送りください。'}catch{status.textContent='コピー機能を利用できません。入力内容を選択してコピーし、sora.grip@gmail.com へお送りください。'}});

// External videos are loaded only after an explicit play action.
document.querySelectorAll('.video-player').forEach(player=>{
 const button=player.querySelector('.video-load'),img=button?.querySelector('img');
 img?.addEventListener('error',()=>img.remove());
 button?.addEventListener('click',()=>{const iframe=document.createElement('iframe');iframe.title=player.dataset.title;iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(player.dataset.video)+'?autoplay=1&rel=0';iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';player.replaceChildren(iframe)});
});

// Monthly inputs count only additional videos; filming inputs count all requested sessions.
const sim=document.querySelector('#simulator-form');
let currentQuote;
const yen=n=>n.toLocaleString('ja-JP')+'円';
const includedText=r=>r.plan==='single'?'単発制作：基本の動画・撮影枠はありません。':`基本分：ショート${r.includedShorts}本＋ロング${r.includedLongs}本。${r.plan==='premium'?'撮影1回4時間・YouTube投稿・月次レポート込み。最低2か月。':'月次相談・簡単な振り返り込み。撮影・投稿はお客様。1か月から。'}`;
function quoteText(r){return `広報担当さん 料金シミュレーション\n${r.name}\n${includedText(r)}\n基本料金：${yen(r.base)}\n${r.plan==='single'?'制作':'追加制作'}：ショート${r.shorts}本 / ロング${r.longs}本（${yen(r.production)}）\n制作合計：ショート${r.totalShorts}本 / ロング${r.totalLongs}本\n撮影希望：4時間${r.halfDays}回 / 7時間${r.fullDays}回\n撮影料金：${yen(r.shootingGross)}\n月額に含まれる撮影分：-${yen(r.includedCredit)}\n交通費・駐車場代等：${yen(r.travel)}\n宿泊費：${yen(r.hotel)}\n概算合計（税込）：${yen(r.total)}\n※月額は1か月分。実費0円は未計上。基本構成変更・特殊な編集等は別見積。正式金額は契約前に確認。`;}
function updateQuote(){
 if(!sim)return;
 const r=currentQuote=calculatePrice(Object.fromEntries(new FormData(sim)));
 document.querySelector('#production-legend').textContent=r.plan==='single'?'依頼する動画':'基本分に追加する動画';
 document.querySelector('#sim-note').textContent=r.plan==='single'?'素材提供の編集は1本から。撮影も必要なら回数を入力してください。制作費の最低発注額はありません。':'基本分の本数は入力不要です。下の動画欄には追加する本数だけを入力してください。構成の組み替えは別見積もりです。';
 document.querySelector('#unit-prices').textContent='ショート8,000円／本、ロング18,000円／本。';
 document.querySelector('#quote-plan').textContent=r.name;
 document.querySelector('#quote-total').textContent=r.total.toLocaleString('ja-JP');
 document.querySelector('#quote-included').textContent=includedText(r);
 const rows=[['基本料金',r.base],[r.plan==='single'?'動画制作費':'追加動画制作費',r.production],['撮影料金（希望回数分）',r.shootingGross],['月額に含まれる撮影分',-r.includedCredit],['交通費・駐車場代等（入力額）',r.travel],['宿泊費（入力額）',r.hotel]];
 document.querySelector('#quote-breakdown').replaceChildren(...rows.map(([label,amount])=>{const d=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=yen(amount);d.append(dt,dd);return d}));
 let context=`制作合計：ショート${r.totalShorts}本・ロング${r.totalLongs}本。撮影：4時間${r.halfDays}回・7時間${r.fullDays}回。${r.plan==='single'?'単発依頼':'月額1か月分'}の概算です。`;
 if(r.plan==='premium'&&r.halfDays+r.fullDays===0)context+='撮影未入力でも基本料金は変わりません。月1回4時間分が基本料金に含まれます。';
 if(r.plan==='single'&&r.shorts+r.longs===0)context+='動画本数を入力してください。撮影のみの場合は別途ご相談ください。';
 document.querySelector('#quote-context').textContent=context;
 document.querySelector('#quote-consult').href='contact.html?v=20261010-pricing2&estimate='+encodeURIComponent(quoteText(r));
 document.querySelector('#quote-status').textContent='';
}
if(sim){const q=new URLSearchParams(location.search);let key=q.get('plan');if(key==='light')key='standard';if(key==='standard'&&q.get('v')?.startsWith('20261009'))key='premium';if(['standard','premium','single'].includes(key))document.querySelector('#sim-plan').value=key;
 function defaultFilming(){document.querySelector('#sim-half').value=document.querySelector('#sim-plan').value==='premium'?'1':'0';document.querySelector('#sim-full').value='0';}
 defaultFilming();document.querySelector('#sim-plan').addEventListener('change',()=>{defaultFilming();updateQuote()});sim.addEventListener('input',updateQuote);sim.addEventListener('change',updateQuote);sim.addEventListener('reset',()=>requestAnimationFrame(()=>{defaultFilming();updateQuote()}));updateQuote();document.querySelector('#quote-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(quoteText(currentQuote));document.querySelector('#quote-status').textContent='試算内容をコピーしました。'}catch{document.querySelector('#quote-status').textContent='コピーできませんでした。「この内容で相談する」からフォームに引き継げます。'}})}
if(form){const estimate=new URLSearchParams(location.search).get('estimate');if(estimate){document.querySelector('#message').value=estimate.slice(0,3500)+'\n\n【希望の内容・日程】\n';document.querySelector('#topic').value=estimate.includes('単発制作')?'動画制作のみ':'月額の制作・運用支援';}}
