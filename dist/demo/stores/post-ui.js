import {scheduleDraft,scheduleFields,bindSchedule,scheduleLabel} from './schedule.js?v=20261027-2';
import {DELETE_CONFIRMATION} from './delete-operation.js?v=20261025-10';
// Posting UI. The authenticated parent supplies persistence and state changes.
import {validPhoto} from './post-model.js?v=20261027-2';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountPostUI({app,existing,onSave,onState,onExit,onEdit,initialText=''}) {
  let step=existing?'actions':(initialText?2:1),photo=existing?.image||'',text=existing?.text||initialText,busy=false,disposed=false,token=0,committed=false;
  const timing=scheduleDraft(existing);let schedule={start:null,end:null},readSchedule;
  const $=s=>app.querySelector(s);
  const intro='';
  const back='<button class="easy-secondary" id="back" type="button">← 戻る</button>';
  const cancel='<button class="easy-cancel" id="cancel" type="button">入力をやめる</button>';
  function cancelFlow(){if(confirm('入力をやめますか？ 保存していない内容は消えます。'))onExit();}
  function render(focus=false){
    if(disposed)return;
    app.classList.add('easy-post');app.dataset.step=String(step);
    let content='';
    if(step==='actions'){
      content='<p class="easy-step">このお知らせを変更</p><h1>'+esc(existing.title)+'</h1><p>'+esc(existing.text)+'</p>'+(existing.state==='deleting'?'': '<button id="rewrite" class="easy-primary">書き直す</button><button id="soldout" class="easy-primary">終了にする</button>')+'<button id="withdraw" class="easy-secondary">削除する</button><p class="easy-help">削除は確認してから行います。</p><button id="exit" class="easy-cancel">← 見え方の確認へ戻る</button>';
    }else if(step===1){
      content='<p class="easy-step">1 / 3　写真</p><h1>お店の情報を、<br>お客さんに<wbr><span class="intro-phrase">伝えましょう</span></h1><p>写真がなくても大丈夫です。</p><input hidden id="camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><input hidden id="library" type="file" accept="image/jpeg,image/png,image/webp"><button id="take-photo" class="easy-primary">写真を撮る</button><button id="choose-photo" class="easy-secondary">スマホの写真を選ぶ</button>'+(photo?'<img class="easy-photo" src="'+photo+'" alt="選んだ写真"><button id="next" class="easy-primary">この写真で次へ →</button>':'')+'<p class="easy-help">撮影画面はスマホによって異なります。</p>'+(photo?'<button id="remove-photo" class="easy-cancel">この写真を外す</button>':'<button id="next" class="easy-primary">写真なしで次へ →</button>')+cancel;
    }else if(step===2){
      content='<p class="easy-step">2 / 3　ひとこと</p><h1>お店の情報を、<br>お客さんに伝えましょう</h1><label class="easy-label" for="words">お知らせの文章</label><textarea aria-describedby="words-help easy-error" id="words" maxlength="180" rows="5" placeholder="お客さんに伝える内容を書いてください">'+esc(text)+'</textarea><p id="words-help" class="easy-help">180文字まで書けます。</p>'+scheduleFields(timing)+'<button id="next" class="easy-primary">内容を確認する →</button>'+back+cancel;
    }else{
      content='<p class="easy-step">3 / 3　確認</p><h1>この内容で<br>載せますか？</h1><div class="easy-review">'+(photo?'<img class="easy-photo" src="'+photo+'" alt="載せる写真">':'<p>写真なし</p>')+'<p class="easy-words">'+esc(text)+'</p></div><p>'+esc(scheduleLabel(schedule))+'。終了した投稿も写真や文章は自動では消えません。</p><button id="publish" class="easy-primary">投稿する</button><p class="easy-help">お店が公開設定のときは、指定した開始時刻からお客さんに表示されます。時間指定なしはすぐに表示されます。お店のページが非公開の場合は、店員さんだけが確認できます。</p>'+back+cancel;
    }
    app.innerHTML='<section class="easy-shell">'+intro+content+'<p id="easy-error" class="error" role="alert"></p></section>';
    if(step===2)$('#words').value=text;
    if(focus){window.scrollTo(0,0);$('h1').setAttribute('tabindex','-1');$('h1').focus({preventScroll:true});}
    $('#cancel')?.addEventListener('click',cancelFlow);
    $('#back')?.addEventListener('click',()=>{if(step===3)step=2;else{ text=$('#words').value;try{readSchedule();}catch{}step=1;}render(true);});
    if(step==='actions'){
      $('#exit').onclick=onExit;
      if($('#rewrite'))$('#rewrite').onclick=onEdit;
      if($('#soldout'))$('#soldout').onclick=async()=>{if(busy||!confirm('このお知らせを終了にしますか？'))return;busy=true;for(const b of app.querySelectorAll('button,input,textarea,select'))b.disabled=true;const ok=await onState(existing.id,'soldout');if(!ok&&!disposed){busy=false;render();$('#easy-error').textContent='変更を保存できませんでした。接続を確認して再試行してください。';}};
      $('#withdraw').onclick=async()=>{if(busy||!confirm('対象：'+existing.text+'\n\n'+DELETE_CONFIRMATION))return;busy=true;for(const b of app.querySelectorAll('button,input,textarea,select'))b.disabled=true;const ok=await onState(existing.id,'deleted');if(!ok&&!disposed){busy=false;render();$('#easy-error').textContent='変更を保存できませんでした。接続を確認して再試行してください。';}};
    }else if(step===1){
      $('#take-photo').onclick=()=>$('#camera').click();$('#choose-photo').onclick=()=>$('#library').click();
      $('#camera').onchange=readPhoto;$('#library').onchange=readPhoto;
      $('#remove-photo')?.addEventListener('click',()=>{token++;busy=false;photo='';render();});
      $('#next').onclick=()=>{if(busy)return;step=2;render(true);};
    }else if(step===2){
      readSchedule=bindSchedule(app,timing);
      $('#next').onclick=()=>{text=$('#words').value.trim();if(!text){$('#easy-error').textContent='文章をひとこと書いてください。';$('#words').focus();return;}try{schedule=readSchedule();}catch(error){$('#easy-error').textContent=error.message;return;}step=3;render(true);};
    }else{
      $('#publish').onclick=async()=>{
        if(committed)return;committed=true;for(const button of app.querySelectorAll('button,input,textarea,select'))button.disabled=true;
        const input={id:existing?.id||crypto.randomUUID(),storeId:'nakatomi',title:'お店からのお知らせ',text,image:photo,state:'active',...schedule};
        if(!await onSave(input)){committed=false;for(const button of app.querySelectorAll('button,input,textarea,select'))button.disabled=false;$('#easy-error').textContent='保存結果を確認できませんでした。接続を確認し、写真や文章を変えずに、この画面でもう一度「投稿する」を押してください。画面を閉じた場合は、一覧で保存済みか確認してください。';}
      };
    }
  }
  async function readPhoto(event){
    const file=event.target.files[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){$('#easy-error').textContent='この写真は使えません。別の写真を選んでください。（JPEG・PNG・WebP、10MBまで）';return;}
    const version=++token;busy=true;
    for(const button of app.querySelectorAll('button,input,textarea,select'))button.disabled=true;
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
