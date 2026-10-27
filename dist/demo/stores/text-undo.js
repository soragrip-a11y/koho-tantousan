// One text-only draft, scoped to this mounted staff session. No persistent storage.
export function createTextUndo(storeId){
 let text=null;
 return {
  remember(post){if(post?.storeId!==storeId||typeof post.text!=='string'||post.text.length>180)return false;text=post.text;return true;},
  peek(){return text;},
  clear(){text=null;}
 };
}
