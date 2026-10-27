import {validPhoto,postStatus} from './post-model.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// A separate editing route. Draft changes never touch storage until repost succeeds.
export function mountEditUI({app,existing,onSave,onExit}) {
  let photo=existing.image||'',text=existing.text,busy=false,committed=false,disposed=false;
  const $=selector=>app.querySelector(selector);
  const error=message=>{if(!disposed)$('#easy-error').textContent=message;};
  function cancel(){if(confirm('書き直しをやめますか？ 元のお知らせはそのまま残ります。'))onExit();}
  function render(){
    if(disposed)return;
    app.classList.add('easy-post');app.dataset.step='edit';
    app.innerHTML='<section class="easy-shell"><p class="easy-note">再投稿すると、写真と文章を共有保存します。<br>お店が公開設定のときは、お客さんにも表示されます。</p><h1>お知らせの書き直し</h1>'+
      (photo?'<img class="easy-photo" src="'+photo+'" alt="現在の写真">':'<p>写真なし</p>')+
      '<input hidden id="camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><input hidden id="library" type="file" accept="image/jpeg,image/png,image/webp"><button id="take-photo" class="easy-primary">写真を撮り直す</button><button id="choose-photo" class="easy-secondary">スマホの写真を選ぶ</button><button id="remove-photo" class="easy-cancel" '+(photo?'':'disabled')+'>写真を消す</button><p class="easy-help">撮影できないときは、スマホの写真を選べます。写真なしでも大丈夫です。写真の変更・取り外しは再投稿で反映されます。以前の写真と非公開の操作記録は、この操作では削除されません。</p><label class="easy-label" for="words">お知らせの文章</label><textarea aria-describedby="words-help easy-error" id="words" maxlength="180" rows="5">'+esc(text)+'</textarea><p id="words-help" class="easy-help">180文字まで書けます。</p><p>再投稿すると、今のお知らせを更新して掲載中に戻します。新しいお知らせは増えません。</p><p>掲載期限は、再投稿した時点から24時間後になります。その後は終了表示で残り、写真や文章は自動では消えません。</p><button id="publish" class="easy-primary">再投稿する</button><p class="easy-help">お店が公開設定のときは、この内容がお客さんに公開されます。非公開設定のときは、権限のある店員さんだけが確認できます。</p><button id="cancel" class="easy-cancel">← 変更せずに戻る</button><p id="easy-error" class="error" role="alert"></p></section>';
    $('#words').oninput=event=>{text=event.target.value;};
    $('#take-photo').onclick=()=>$('#camera').click();
    $('#choose-photo').onclick=()=>$('#library').click();
    $('#camera').onchange=readPhoto;$('#library').onchange=readPhoto;
    $('#remove-photo').onclick=()=>{photo='';render();};
    $('#cancel').onclick=cancel;
    $('#publish').onclick=async()=>{
      if(busy||committed)return;
      text=$('#words').value.trim();
      if(!text){error('文章をひとこと書いてください。');$('#words').focus();return;}
      const message=postStatus(existing)==='active'?'この内容で更新しますか？ 掲載期限は今から24時間後になります。':'終了・取り下げのお知らせを、掲載中に戻しますか？ 掲載期限は今から24時間後になります。';
      if(!confirm(message))return;
      committed=true;for(const button of app.querySelectorAll('button'))button.disabled=true;
      if(!await onSave({...existing,text,image:photo,state:'active',end:new Date(Date.now()+86400000).toISOString()})){
        committed=false;for(const button of app.querySelectorAll('button'))button.disabled=false;error('保存できませんでした。写真を外して、もう一度お試しください。');
      }
    };
  }
  async function readPhoto(event){
    const file=event.target.files[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){error('この写真は使えません。別の写真を選んでください。（JPEG・PNG・WebP、10MBまで）');return;}
    busy=true;for(const button of app.querySelectorAll('button'))button.disabled=true;
    error('写真を用意しています…');
    try{
      const bitmap=await createImageBitmap(file);
      if(disposed){bitmap.close();return;}
      if(bitmap.width*bitmap.height>50000000){bitmap.close();throw Error();}
      const canvas=document.createElement('canvas'),scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const result=canvas.toDataURL('image/jpeg',.8);if(!validPhoto(result))throw Error();
      photo=result;busy=false;render();
    }catch{busy=false;render();error('写真を読み込めません。別の写真を選んでください。');}
  }
  render();
  return ()=>{disposed=true;app.classList.remove('easy-post');delete app.dataset.step;};
}
