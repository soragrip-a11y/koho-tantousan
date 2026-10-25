import {validPhoto} from './post-model.js';

// Shared by the customer page and staff preview: only sold-out notices get this overlay.
export function noticeMedia(post, state) {
  const image=validPhoto(post.image)?post.image:'';
  if(!image&&state!=='soldout')return '';
  return '<div class="notice-media'+(state==='soldout'?' is-soldout':'')+(image?'':' no-photo')+'">'+(image?'<img class="picture" src="'+image+'" alt="お知らせの写真">':'')+
    (state==='soldout'?'<div class="soldout-cover" role="img" aria-label="終了しました"><strong aria-hidden="true">終了しました</strong></div>':'')+'</div>';
}
