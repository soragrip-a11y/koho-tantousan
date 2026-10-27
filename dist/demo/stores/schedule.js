// All wall-clock input is Japan time, independent of the device timezone.
export const NO_EXPIRY_NOTE='すでに終了している場合があります';
export function fromJapanInput(value){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value||''))throw Error('開始と終了の日付・時刻を入力してください。');
 const result=new Date(value+':00+09:00');
 if(!Number.isFinite(result.getTime())||toJapanInput(result)!==value)throw Error('正しい日付・時刻を入力してください。');
 return result.toISOString();
}
export function toJapanInput(value){return new Date(new Date(value).getTime()+9*3600000).toISOString().slice(0,16);}
export function validateSchedule({start=null,end=null}){
 if(start!==null&&!Number.isFinite(Date.parse(start)))throw Error('開始日時を確認してください。');
 if(end!==null&&(!Number.isFinite(Date.parse(end))||start===null||Date.parse(end)<=Date.parse(start)))throw Error('終了は開始より後の日時にしてください。日をまたぐ場合は翌日の日付を選んでください。');
 return {start,end};
}
export function lifecycle(p,now=Date.now()){
 if(['withdrawn','deleting'].includes(p.state))return p.state;
 if(p.start&&Date.parse(p.start)>now)return 'scheduled';
 if(p.state==='soldout')return 'soldout';
 if(p.state==='ended'||(p.end&&Date.parse(p.end)<=now))return 'ended';
 return 'active';
}
export function publicPosts(posts,now=Date.now()){
 return posts.filter(p=>['active','ended','soldout'].includes(lifecycle(p,now))).sort((a,b)=>
  Number(lifecycle(a,now)!=='active')-Number(lifecycle(b,now)!=='active')||
  postingOrder(a,b));
}
// Current API exposes latest publication/republication time, not immutable creation time.
// Missing timestamps follow dated rows and retain source order, without inventing chronology.
function postingOrder(a,b){const x=Date.parse(a.publishedAt),y=Date.parse(b.publishedAt),validX=Number.isFinite(x),validY=Number.isFinite(y);if(!validX||!validY)return Number(validY)-Number(validX);return y-x||String(a.id).localeCompare(String(b.id));}
export function staffPosts(posts,now=Date.now()){
 const rank={active:0,scheduled:1,ended:2,soldout:2,withdrawn:3,deleting:3};
 return [...posts].sort((a,b)=>(rank[lifecycle(a,now)]??3)-(rank[lifecycle(b,now)]??3)||postingOrder(a,b));
}
const formatter=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function scheduleLabel(p){return p.end?'表示期間：'+formatter.format(new Date(p.start||p.publishedAt||Date.now()))+' 〜 '+formatter.format(new Date(p.end))+'（日本時間）':'時間指定なし・終了期限なし';}
export function scheduleDraft(p){return p?.end?{mode:'timed',start:toJapanInput(p.start||p.publishedAt||Date.now()),end:toJapanInput(p.end)}:{mode:'none',start:'',end:''};}
export function scheduleFields(d){return '<fieldset class="schedule-fields"><legend>表示する期間（日本時間）</legend><label>期間の設定<select id="schedule-mode"><option value="none" '+(d.mode==='none'?'selected':'')+'>時間指定なし</option><option value="timed" '+(d.mode==='timed'?'selected':'')+'>開始・終了を指定する</option></select></label><div id="schedule-times" '+(d.mode==='none'?'hidden':'')+'><label for="schedule-start">開始日時（日本時間）</label><input id="schedule-start" type="datetime-local" value="'+d.start+'"><label for="schedule-end">終了日時（日本時間）</label><input id="schedule-end" type="datetime-local" value="'+d.end+'"><p>開始前はお客さんに表示しません。終了後は「終了しました」の表示で残ります。翌日まで続ける場合は終了の日付も変えてください。</p></div><p>時間指定なしは自動終了しません。投稿の下に「'+NO_EXPIRY_NOTE+'」と表示します。在庫を保証するものではありません。</p></fieldset>';}
export function bindSchedule(root,d){
 const capture=()=>{d.mode=root.querySelector('#schedule-mode').value;d.start=root.querySelector('#schedule-start').value;d.end=root.querySelector('#schedule-end').value;root.querySelector('#schedule-times').hidden=d.mode==='none';};
 for(const el of root.querySelectorAll('.schedule-fields input,.schedule-fields select'))el.addEventListener('change',capture);
 return ()=>{capture();return d.mode==='none'?{start:null,end:null}:validateSchedule({start:fromJapanInput(d.start),end:fromJapanInput(d.end)});};
}
