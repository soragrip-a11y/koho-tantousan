// Local memory only. Re-encoding drops EXIF; no upload, persistence or object URLs.
export const validDemoPhoto=s=>typeof s==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s)&&s.length<3000000;
export async function readDemoPhoto(file,{decode=globalThis.createImageBitmap,canvas=()=>document.createElement('canvas')}={}){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<=0||file.size>10*1024*1024)throw Error('JPEG・PNG・WebPの写真を10MB以内で選んでください。');
 let bitmap;
 try{bitmap=await decode(file);if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>50000000)throw Error();
 const c=canvas(),scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);
 const image=c.toDataURL('image/jpeg',.8);if(!validDemoPhoto(image))throw Error();return image;
 }catch{throw Error('写真を読み込めませんでした。JPEG・PNG・WebPの別の写真を選んでください。');}finally{bitmap?.close();}
}
