// No recipient, request IDs or credentials are stored by this controller.
export async function submitWithNotification(client){
 try{return await client.functions.invoke('notify-staff/submit',{method:'POST'});}
 catch{return {error:true};}
}
export function retryNotification({client,window,onPending=()=>{}}){
 let stopped=false,busy=false,count=0,timer;
 const delays=[15000,60000,180000];
 const schedule=()=>{if(!stopped&&count<3)timer=window.setTimeout(run,delays[count]);};
 async function run(){
  if(stopped||busy)return;
  if(window.document.visibilityState==='hidden'||window.navigator?.onLine===false){schedule();return;}
  busy=true;count++;
  try{
   const r=await client.functions.invoke('notify-staff',{method:'POST'});
   if(stopped)return;
   if(!r.error&&r.data?.state==='notification_accepted'){stop();return;}
   onPending();
  }catch{if(!stopped)onPending();}
  finally{busy=false;schedule();}
 }
 function stop(){stopped=true;window.clearTimeout(timer);window.removeEventListener('focus',focus);}
 function focus(){if(!stopped&&count<3){window.clearTimeout(timer);void run();}}
 window.addEventListener('focus',focus);schedule();return stop;
}
