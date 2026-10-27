// Future records stay server-private. Refresh at most every 30s while visible.
export function watchCustomer({document,window,read,render,signature,setInterval=globalThis.setInterval,clearInterval=globalThis.clearInterval}){
 let last=signature();const paint=()=>{const next=signature();if(next!==last){last=next;render();}};
 const resume=()=>{if(!document.hidden){paint();read();}};
 const tick=setInterval(paint,1000),poll=setInterval(()=>{if(!document.hidden)read();},30000);
 document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);
 return ()=>{clearInterval(tick);clearInterval(poll);document.removeEventListener('visibilitychange',resume);window.removeEventListener('pageshow',resume);window.removeEventListener('focus',resume);};
}
