export const plans={standard:{name:'プレミアムプラン',base:150000,short:7000,long:13000},light:{name:'ライトプラン',base:55000,short:8000,long:15000},pause:{name:'休会プラン',base:3300,short:0,long:0},single:{name:'単発制作',base:0,short:8000,long:15000}};
const integer=(v,max=100)=>Math.max(0,Math.min(max,Math.floor(Number(v)||0)));
export function calculatePrice({plan='light',shorts=0,longs=0,visitDays=0,area='chiba',travel=0,hotel=0}={}){
 const key=Object.hasOwn(plans,plan)?plan:'light',p=plans[key];
 const paused=key==='pause',s=paused?0:integer(shorts),l=paused?0:integer(longs),days=paused?0:integer(visitDays,31);
 const production=s*p.short+l*p.long;
 const minimumAdjustment=key==='single'&&days>0?Math.max(0,30000-production):0;
 const includedDays=key==='standard'&&area==='chiba'?Math.min(1,days):0;
 const visit=(days-includedDays)*17000;
 const transport=paused?0:integer(travel,1000000),lodging=paused?0:integer(hotel,1000000);
 return {plan:key,name:p.name,base:p.base,shorts:s,longs:l,production,minimumAdjustment,visit,visitDays:days,includedDays,travel:transport,hotel:lodging,total:p.base+production+minimumAdjustment+visit+transport+lodging};
}
