// Browser-local fictional demonstration only. No audit log, identity or remote write API.
export const POST_KEY = 'koho-post-experience-v3';
export const validPhoto = value => typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length < 3000000;
export function validatePost(input) {
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 40) throw Error('見出しは1〜40文字で入力してください。');
  if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 180) throw Error('本文は1〜180文字で入力してください。');
  if (!Number.isFinite(Date.parse(input.end))) throw Error('終了日時を入力してください。');
  if (!['active','soldout','ended','withdrawn'].includes(input.state)) throw Error('状態が不正です。');
  if (input.image && !validPhoto(input.image)) throw Error('写真を読み込めません。選び直してください。');
  return {id:String(input.id),storeId:'nakatomi',title:input.title.trim(),text:input.text.trim(),end:input.end,state:input.state,image:input.image||''};
}
export function loadPosts(storage, fallback) {
  const raw=storage.getItem(POST_KEY);
  if(!raw)return fallback;
  const posts=JSON.parse(raw);
  if(!Array.isArray(posts)||posts.length>20)throw Error('デモ保存を読めません。リセットしてください。');
  return posts.map(validatePost);
}
export function savePosts(storage, posts) {
  if(posts.length>20)throw Error('デモは20件までです。リセットして再度お試しください。');
  const next=posts.map(validatePost);
  storage.setItem(POST_KEY,JSON.stringify(next));
  return next;
}
export function postStatus(post, now=Date.now()) {
  if(post.state==='withdrawn')return 'withdrawn';
  if(post.state==='soldout')return 'soldout';
  return post.state==='ended'||Date.parse(post.end)<=now?'ended':'active';
}
