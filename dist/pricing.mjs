export const plans={standard:{name:'スタンダードプラン',base:55000,shorts:6,longs:0},premium:{name:'プレミアムプラン',base:150000,shorts:8,longs:2},single:{name:'単発制作',base:0,shorts:0,longs:0}};
export const rates={short:8000,long:18000,halfDay:22000,fullDay:32000};
const integer=(v,max=100)=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;};
export function calculatePrice({plan='standard',shorts=0,longs=0,halfDays=0,fullDays=0,travel=0,hotel=0}={}){
 const key=Object.hasOwn(plans,plan)?plan:'standard',p=plans[key];
 const s=integer(shorts),l=integer(longs),half=integer(halfDays,31),full=integer(fullDays,31);
 const production=s*rates.short+l*rates.long,shootingGross=half*rates.halfDay+full*rates.fullDay;
 const includedCredit=key==='premium'&&half+full>0?rates.halfDay:0;
 const shooting=shootingGross-includedCredit,transport=integer(travel,1000000),lodging=integer(hotel,1000000);
 return {plan:key,name:p.name,base:p.base,shorts:s,longs:l,includedShorts:p.shorts,includedLongs:p.longs,totalShorts:p.shorts+s,totalLongs:p.longs+l,production,halfDays:half,fullDays:full,shootingGross,includedCredit,shooting,travel:transport,hotel:lodging,total:p.base+production+shooting+transport+lodging};
}
