import {calculatePrice} from './pricing.mjs?v=20261009-2337';
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open)});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');nav.classList.remove('is-open')}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.setAttribute('aria-expanded','false');nav.classList.remove('is-open');menu.focus()}});
const samples=[{title:'今日の活動を、\nひとつの話題に。',caption:'活動報告｜3分以内',steps:[['冒頭','どこで、何をしたのかを一言で。'],['本題','現場の映像と、活動のポイント。'],['結び','気づいたこと、次に取り組むこと。']]},{title:'難しいテーマを、\n普段の言葉で。',caption:'政策解説｜10分以内',steps:[['問い','暮らしにどう関係するのかを提示。'],['解説','根拠となる資料と、論点を整理。'],['まとめ','考え方と、これからの取り組み。']]},{title:'その疑問に、\nひとつずつ答える。',caption:'一問一答｜3分以内',steps:[['質問','よく聞かれる疑問を一つ選ぶ。'],['回答','結論と理由を短く伝える。'],['補足','必要な条件や注意点も添える。']]}];
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

// Quote calculator: included monthly deliverables are defined in the written quote.
const sim=document.querySelector('#simulator-form');
let currentQuote;
const yen=n=>n.toLocaleString('ja-JP')+'円';
function quoteText(r){return `広報担当さん 料金シミュレーション\n${r.name}\n基本料金：${yen(r.base)}\n${r.plan==='single'?'制作':'追加制作'}：ショート${r.shorts}本 / ロング${r.longs}本（${yen(r.production)}）\n最低制作費の調整：${yen(r.minimumAdjustment)}\n出張日当：${yen(r.visit)}（訪問${r.visitDays}日、日当込み${r.includedDays}日）\n交通費：${yen(r.travel)}\n宿泊費：${yen(r.hotel)}\n概算合計（税込）：${yen(r.total)}\n※基本内訳の変更・特殊な編集等は別見積。正式金額は契約前に確認。`;}
function updateQuote(){
 if(!sim)return;
 document.querySelector('#production-fields').disabled=document.querySelector('#sim-plan').value==='pause';
 const values=Object.fromEntries(new FormData(sim));currentQuote=calculatePrice(values);const r=currentQuote;
 document.querySelector('#production-fields').disabled=r.plan==='pause';
 document.querySelector('#production-legend').textContent=r.plan==='single'?'依頼する動画':'基本契約に追加する動画';
 document.querySelector('#sim-note').textContent=r.plan==='pause'?'休会は既存データの保管と再開準備のためのプランです。新規制作・撮影・投稿は含みません。':r.plan==='single'?'素材支給の編集のみは1本から。撮影・訪問を入力すると、制作費は最低30,000円になります。':'ここに入力するのは基本契約の外に追加する本数です。基本分の本数・内訳は打ち合わせと見積書で決定します。';
 const units=r.plan==='standard'?[7000,13000]:[8000,15000];
 document.querySelector('#unit-prices').textContent=r.plan==='pause'?'':`ショート${yen(units[0])} / 本、ロング${yen(units[1])} / 本。`;
 document.querySelector('#quote-plan').textContent=r.name;
 document.querySelector('#quote-total').textContent=r.total.toLocaleString('ja-JP');
 const rows=[['基本料金',r.base],[r.plan==='single'?'動画制作費':'追加動画制作費',r.production],['最低発注額への調整',r.minimumAdjustment],['出張日当',r.visit],['交通費（入力額）',r.travel],['宿泊費（入力額）',r.hotel]];
 document.querySelector('#quote-breakdown').replaceChildren(...rows.map(([label,amount])=>{const d=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=yen(amount);d.append(dt,dd);return d}));
 document.querySelector('#quote-context').textContent=r.plan==='pause'?'休会中の月額です。制作再開時は別途日程と条件を確認します。':r.plan==='single'&&r.shorts+r.longs===0&&r.visitDays===0?'本数または訪問日数を入力してください。制作費のない0円の受注を意味するものではありません。':`訪問${r.visitDays}日 / 日当込み${r.includedDays}日。${r.plan==='single'?'単発依頼':'月額契約'}の概算です。基本内訳変更や特殊な制作は含みません。`;
 document.querySelector('#quote-consult').href='contact.html?v=20261009-2337&estimate='+encodeURIComponent(quoteText(r));
 document.querySelector('#quote-status').textContent='';
}
if(sim){const q=new URLSearchParams(location.search),key=q.get('plan');if(['standard','light','pause','single'].includes(key))document.querySelector('#sim-plan').value=key;sim.addEventListener('input',updateQuote);sim.addEventListener('change',updateQuote);sim.addEventListener('reset',()=>requestAnimationFrame(updateQuote));updateQuote();document.querySelector('#quote-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(quoteText(currentQuote));document.querySelector('#quote-status').textContent='試算内容をコピーしました。'}catch{document.querySelector('#quote-status').textContent='コピーできませんでした。「この内容で相談する」からフォームに引き継げます。'}})}
if(form){const estimate=new URLSearchParams(location.search).get('estimate');if(estimate){document.querySelector('#message').value=estimate.slice(0,3500)+'\n\n【希望の内容・日程】\n';document.querySelector('#topic').value='月額の制作・運用支援';}}
