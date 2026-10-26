// Only reads the signed-in applicant's own state. No approval or mail side effect.
export function watchApproval({window,check,onChange,onError,interval=15000}){
 let stopped=false,busy=false,last='pending',failures=0;
 async function refresh(){
  if(stopped||busy||window.document.visibilityState==='hidden')return;
  busy=true;
  try{const state=await check();if(stopped)return;failures=0;if(state!==last){last=state;await onChange(state);}}
  catch{if(!stopped){failures++;onError?.();}}
  finally{busy=false;}
 }
 let timer;
 function schedule(){timer=window.setTimeout(async()=>{await refresh();if(!stopped)schedule();},Math.min(interval*2**failures,120000));}
 const focus=()=>{void refresh();};
 window.addEventListener('focus',focus);window.document.addEventListener('visibilitychange',focus);schedule();
 return ()=>{stopped=true;window.clearTimeout(timer);window.removeEventListener('focus',focus);window.document.removeEventListener('visibilitychange',focus);};
}
export async function canReviewApplications(client){
 try{const result=await client.rpc('koho_list_staff_requests');return !result.error&&Array.isArray(result.data);}catch{return false;}
}
