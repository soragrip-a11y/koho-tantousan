// Simple browser-local practice flow. No authentication, history or network submission.
import {validPhoto} from './post-model.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountPostUI({app,existing,onSave,onState,onExit,onEdit}) {
  let step=existing?'actions':1,photo=existing?.image||'',text=existing?.text||'',busy=false,disposed=false,token=0,committed=false;
  const $=s=>app.querySelector(s);
  const intro='<p class="easy-note">店員さんの練習です。<br>このスマホだけに残ります。<br>ほかの人には送られません。</p>';
  const back='<button class="easy-secondary" id="back" type="button">← 戻る</button>';
  const cancel='<button class="easy-cancel" id="cancel" type="button">入力をやめる</button>';
  function cancelFlow(){if(confirm('入力をやめますか？ 保存していない内容は消えます。'))onExit();}
  function render(focus=false){
    if(disposed)return;
    app.classList.add('easy-post');app.dataset.step=String(step);
    let content='';
    if(step==='actions'){
      content='<p class="easy-step">このお知らせを変更</p><h1>'+esc(existing.title)+'</h1><p>'+esc(existing.text)+'</p><button id="rewrite" class="easy-primary">書き直す</button><button id="soldout" class="easy-primary">終了にする</button><button id="withdraw" class="easy-secondary">取り下げる</button><p class="easy-help">取り下げると、お店の情報の見本から消えます。</p><button id="exit" class="easy-cancel">← 見え方の確認へ戻る</button>';
    }else if(step===1){
      content='<p class="easy-step">1 / 3　写真</p><h1>お店の情報を、<br>お客さんに<wbr><span class="intro-phrase">伝えましょう</span></h1><p>写真がなくても大丈夫です。</p><input hidden id="camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><input hidden id="library" type="file" accept="image/jpeg,image/png,image/webp"><button id="take-photo" class="easy-primary">写真を撮る</button><button id="choose-photo" class="easy-secondary">スマホの写真を選ぶ</button>'+(photo?'<img class="easy-photo" src="'+photo+'" alt="選んだ写真"><button id="remove-photo" class="easy-cancel">この写真を外す</button>':'')+'<p class="easy-help">撮影画面はスマホによって異なります。</p><button id="next" class="easy-primary">'+(photo?'この写真で次へ →':'写真なしで次へ →')+'</button>'+cancel;
    }else if(step===2){
      content='<p class="easy-step">2 / 3　ひとこと</p><h1>お店の情報を、<br>お客さんに伝えましょう</h1><label class="easy-label" for="words">お知らせの文章</label><textarea id="words" maxlength="180" rows="5" placeholder="例：これはお知らせの練習です">'+esc(text)+'</textarea><p class="easy-help">180文字まで書けます。</p><button id="next" class="easy-primary">内容を確認する →</button>'+back+cancel;
    }else{
      content='<p class="easy-step">3 / 3　確認</p><h1>この内容で<br>載せますか？</h1><div class="easy-review">'+(photo?'<img class="easy-photo" src="'+photo+'" alt="載せる写真">':'<p>写真なし</p>')+'<p class="easy-words">'+esc(text)+'</p></div><p>投稿から24時間たつと、終了したお知らせとして表示されます。写真や文章は自動では消えません。</p><button id="publish" class="easy-primary">投稿する</button><p class="easy-help">このスマホだけに保存する練習です。ほかの人には公開・送信されません。</p>'+back+cancel;
    }
    app.innerHTML='<section class="easy-shell">'+intro+content+'<p id="easy-error" class="error" role="alert"></p></section>';
    if(focus){window.scrollTo(0,0);$('h1').setAttribute('tabindex','-1');$('h1').focus({preventScroll:true});}
    $('#cancel')?.addEventListener('click',cancelFlow);
    $('#back')?.addEventListener('click',()=>{if(step===3)step=2;else{ text=$('#words').value;step=1;}render(true);});
    if(step==='actions'){
      $('#exit').onclick=onExit;
      $('#rewrite').onclick=onEdit;
      $('#soldout').onclick=()=>{if(confirm('このお知らせを終了にしますか？ お客さんの画面に「終了しました」と表示されます。')){if(onState(existing.id,'soldout')===false)$('#easy-error').textContent='変更を保存できませんでした。再読み込みして、もう一度お試しください。';}};
      $('#withdraw').onclick=()=>{if(confirm('このお知らせを取り下げますか？ 客向けの見本から消えます。')){if(onState(existing.id,'withdrawn')===false)$('#easy-error').textContent='変更を保存できませんでした。再読み込みして、もう一度お試しください。';}};
    }else if(step===1){
      $('#take-photo').onclick=()=>$('#camera').click();$('#choose-photo').onclick=()=>$('#library').click();
      $('#camera').onchange=readPhoto;$('#library').onchange=readPhoto;
      $('#remove-photo')?.addEventListener('click',()=>{token++;busy=false;photo='';render();});
      $('#next').onclick=()=>{if(busy)return;step=2;render(true);};
    }else if(step===2){
      $('#next').onclick=()=>{text=$('#words').value.trim();if(!text){$('#easy-error').textContent='文章をひとこと書いてください。';$('#words').focus();return;}step=3;render(true);};
    }else{
      $('#publish').onclick=()=>{
        if(committed)return;committed=true;$('#publish').disabled=true;
        const input={id:existing?.id||crypto.randomUUID(),storeId:'nakatomi',title:'お店からのお知らせ',text,image:photo,state:'active',end:new Date(Date.now()+86400000).toISOString()};
        if(!onSave(input)){committed=false;$('#publish').disabled=false;$('#easy-error').textContent='保存できませんでした。写真を外して、もう一度お試しください。';}
      };
    }
  }
  async function readPhoto(event){
    const file=event.target.files[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){$('#easy-error').textContent='この写真は使えません。別の写真を選んでください。（JPEG・PNG・WebP、10MBまで）';return;}
    const version=++token;busy=true;
    for(const button of app.querySelectorAll('button'))button.disabled=true;
    $('#easy-error').textContent='写真を準備しています…';
    try{
      const bitmap=await createImageBitmap(file);
      if(disposed||version!==token){bitmap.close();return;}
      if(bitmap.width*bitmap.height>50000000){bitmap.close();throw Error();}
      const canvas=document.createElement('canvas'),scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const result=canvas.toDataURL('image/jpeg',.8);if(!validPhoto(result))throw Error();
      photo=result;busy=false;render();
    }catch{if(!disposed){busy=false;render();$('#easy-error').textContent='写真を読み込めません。別の写真を選んでください。';}}
  }
  render();
  return ()=>{disposed=true;token++;app.classList.remove('easy-post');delete app.dataset.step;};
}
