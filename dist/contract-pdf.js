
import { validateContract, clean, yen } from './contract-core.js?v=20261024-policy';
import { TERMS } from './contract-terms.js?v=20261024-policy';
import { ACCEPTANCE_POLICY, POLITICAL_DETAIL, AI_POLICY, REQUEST_LABELS, REVIEW_FIELDS } from './acceptance-policy.js?v=20261024';
export const DOCUMENT_TITLES={contract:'動画制作・運用支援 業務委託契約書',estimate:'動画制作・運用支援 見積書',invoice:'動画制作・運用支援 請求書'};
export function contractSections(data) {
 const c=validateContract(data),d=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,typeof v==='string'?clean(v):v]));
 const type=d.documentType||'contract',sections=[];
 const section=(title,paragraphs)=>sections.push({title,paragraphs:paragraphs.map(clean)});
 if(c.reviewOnly){
  section('受託前の確認・未確定事項',[
   '受託前確認票（契約・見積・請求ではありません）。専門家確認の記入だけで適法確認済みとはなりません。確認後も個別の業務範囲・条件を書面で合意する必要があります。',
   '作成日：'+d.contractDate+'／依頼区分：'+REQUEST_LABELS[d.requestCategory],
   '依頼者：'+(d.customer||'未確認')+'／連絡先：'+(d.customerEmail||'未確認'),
   '発信目的・制作内容：'+d.purpose,
   ...Object.entries(REVIEW_FIELDS).map(([key,label])=>label+'：\n'+(d[key]||'未確認')),
   '個別メモ：'+(d.notes||'未記入')
  ]);
  section('受託方針・AI利用', [ACCEPTANCE_POLICY,POLITICAL_DETAIL,AI_POLICY]);
  return {sections,terms:[],data:d,calculation:c,documentTitle:'受託前確認票（受託未確定）',type:'review'};
 }
 section('1. 当事者・対象期間',[
  '書類作成日：'+d.contractDate,
  '宛名：'+d.payer+'\n契約者：'+d.customer+'\n代表者・署名者：'+d.customerSigner+'\n住所：'+d.customerAddress+'\nメール：'+d.customerEmail+'\n電話：'+(d.customerPhone||'記載なし'),
  '発行者：'+d.provider+'\n担当：'+d.providerSigner+'\n住所：'+(d.providerAddress||'________________________________（契約時に記入）')+'\nメール：'+d.providerEmail,
  '対象期間：'+d.start+' 〜 '+c.end+(c.monthly?'（'+c.months+'か月）':'（初回お試し・単発）')
 ]);
 const scope=[
  'プラン：'+c.plan.name+'\n'+c.plan.scope,
  (c.monthly?'各月':'契約全体')+'の制作本数：ショート'+c.shorts+'本（各60秒以内）、ロング'+c.longs+'本（各10分以内）。ショート動画内表紙・ロングのサムネイル各1枚を含む。',
  '撮影：'+(c.monthly?'各月':'契約全体')+' 基本料金内の半日撮影'+c.includedShoots+'回、別料金の半日撮影'+c.shootHalf+'回。半日は現地3時間（準備・休憩・撤収を含む）。交通費は全プラン別途。千葉県・東京都を中心、遠方・長時間の移動は事前相談。',
  '修正：各動画1回込み。'+(d.plan==='premium'?'2回目以降は内容により相談。':'追加修正は内容と費用を事前相談。')+'こちらの過失修正は回数に数えず無料。',
  c.tiktok?'TikTok：同じ動画の投稿代行のみ月額追加15,000円。独自動画制作・別途の運用コンサルは含まない。':'TikTok投稿代行：今回の明細には含まない。'
 ];
 if(type!=='invoice')section('2. 制作・運用の範囲',[
  ...scope,'発信目的・制作内容：\n'+d.purpose,
  '完成動画の利用範囲：\n'+d.usage,
  '実績掲載：'+(d.portfolio==='no'?'許可しない。':'掲載対象・内容・時期を別途確認し、記録の残る方法で承認した範囲に限る。'),
  'カット・基本テロップ・音量調整・色調整・BGM・簡単な図解を含む。広告運用、コメント・DM対応、ライブ配信は基本料金外。',
  '公開先・対象チャンネルや素材提供・撮影・納品・公開の日程は、業務の実施前に双方で確認・合意する。単発初稿は素材・構成確定後ショート5営業日、ロング10営業日が目安。複数本・月額制作は個別に日程を確認する。'
 ]);
 const rows=type==='invoice'?c.invoiceRows:c.rows;
 section(type==='invoice'?'2. 今回の請求明細（税込）':'3. 料金明細（税込）',[
  ...(type==='invoice'?['請求対象：'+(c.monthly?'契約開始から第'+c.invoiceMonth+'月分':'初回お試し・単発')]:[]),
  ...rows.map(r=>r.label+'：'+yen(r.unit)+' × '+r.qty+' = '+yen(r.amount)+(r.timing==='monthly'?'／月':'（初回1回のみ）')),
  ...(type==='invoice'?['今回の請求額：'+yen(c.invoiceTotal)]:[
   ...(c.monthly?['月額：'+yen(c.recurring)+' × '+c.months+'か月 = '+yen(c.recurring*c.months)]:[]),
   '初回1回のみの料金：'+yen(c.oneTime),
   '指定契約期間の確定総額：'+yen(c.total),
   '初月・単発のお支払い額：'+yen(c.first),
   ...(c.monthly&&c.months>1?['2か月目以降の各月額：'+yen(c.recurring)]:[])
  ]),
  '金額は税込のお支払い総額。消費税を重ねて加算しない。後日精算の実費・未合意の追加業務は含まない。適格請求書は発行できない。'
 ]);
 section(type==='invoice'?'3. 支払い・確認事項':'4. 支払い・個別確認',[
  '初月・単発は着手前、月額契約の2か月目以降は当月末払い。銀行振込。銀行休業日の場合は前営業日。振込手数料はお客様負担。',
  ...(type==='invoice'?['支払期限：'+d.paymentDue+'（着手前・当月末等の条件と銀行営業日を確認した日付）','振込先：'+(d.bankDetails||'別途ご案内。振込前に発行者へ確認してください。')]:[]),
  '事前に見積もり・合意した交通費等は明細に含む。同じ費用を二重に請求しない。未確定額は上記総額に含めない。追加費用は発生前に内容・金額または上限・精算方法を双方で合意する。',
  '後日精算の追加費用は毎月25日締め・当月末払い、26日以降の確定分は翌月末払い（銀行休業日は前営業日）。',
  ...(type!=='invoice'?['契約期間は上記で個別に確認する。最低利用期間や自動更新は設定しない。継続・更新は別途合意する。']:[]),
  '個別の確認事項：\n'+(d.notes||'追加の確認事項なし。'),
  '既存の締結済み契約には合意済み条件を適用する。本書の生成だけで契約締結・送信・支払いは行われない。'
 ]);
 if(type==='invoice')sections[2].paragraphs=[
  clean('支払期限：'+d.paymentDue+'（銀行営業日を確認）'),
  clean('振込先：'+(d.bankDetails||'別途ご案内。振込前に発行者へ確認してください。')),
  '初月・単発は着手前、2か月目以降は当月末（銀行休業日は前営業日）。銀行振込・手数料はお客様負担。',
  '後日精算の実費・未合意の追加業務は今回の請求に含みません。同じ費用を二重に請求しません。',
  clean('備考：'+(d.notes||'追加の確認事項なし。'))
 ];
 section('依頼区分・受託条件・AI利用',[ '依頼区分：一般事業。政治・選挙との関係が判明した場合は通常プランの自動適用を止め、個別に確認します。',ACCEPTANCE_POLICY,POLITICAL_DETAIL,AI_POLICY,'既存の締結済み契約・過去発行書類は本書により一方的に変更されません。']);
 return {sections,terms:type==='contract'?TERMS:[],data:d,calculation:c,documentTitle:DOCUMENT_TITLES[type],type};
}

// Pure PDF renderer shared by the browser and automated output checks.
export async function generateContract(data,{PDFLib,fontkit,fontBytes}) {
  return renderDocument(contractSections(data),{PDFLib,fontkit,fontBytes});
}
export async function renderDocument(content,{PDFLib,fontkit,fontBytes}) {
  const {PDFDocument,rgb}=PDFLib;
  const doc=await PDFDocument.create();
  // The bundled shaper substitutes ASCII digits before URL punctuation with
  // alternate glyphs absent from the full-font PDF cmap. Keep literal digits in
  // both measurement and encoding; retain ordinary shaping for all other text.
  doc.registerFontkit({create(bytes){const f=fontkit.create(bytes),layout=f.layout.bind(f);f.layout=(text,features)=>{const run=layout(text,features);run.glyphs=run.glyphs.map(g=>g.codePoints.length===1&&g.codePoints[0]>=48&&g.codePoints[0]<=57?f.glyphForCodePoint(g.codePoints[0]):g);return run;};return f;}});
  // Embed the complete font: subset embedding can omit visible glyphs in short invoices.
  const font=await doc.embedFont(fontBytes,{subset:false});
  doc.setTitle(content.documentTitle);doc.setAuthor('広報担当さん');doc.setLanguage('ja-JP');
  const charset=new Set(font.getCharacterSet());
  const allText=JSON.stringify(content.sections)+JSON.stringify(content.terms);
  const unsupported=[...new Set([...allText].filter(ch=>ch.charCodeAt(0)>32 && !charset.has(ch.codePointAt(0))))];
  if(unsupported.length) throw new Error(`PDFに使用できない文字があります（${unsupported.slice(0,8).join(' ')}）。絵文字・特殊文字を通常の文字に置き換えてください。`);
  const W=595.28,H=841.89,left=46,width=W-92,bottom=54;
  const ink=rgb(.08,.10,.12),muted=rgb(.32,.35,.38),accent=rgb(.65,.31,.02);
  let page,y;
  function newPage(){page=doc.addPage([W,H]);y=H-52;page.drawText((content.sample?'【見本・実取引には使用しない】 ':'')+'広報担当さん | 動画制作・YouTube運用支援',{x:left,y:H-27,size:8,font,color:muted});}
  function need(height){if(y-height<bottom)newPage();}
  function wrap(text,size=10){
    const lines=[];
    for(const paragraph of clean(text).replace(/\t/g,'　').split('\n')){
      // Keep dates, amounts, Latin words and closing punctuation together.
      const tokens=[];
      for(const token of paragraph.match(/[A-Za-z0-9][A-Za-z0-9@._\/:?&=%+#,\-]*|./gu)||[]){
        if(tokens.length && /^[、。，．）］」』】〉》！？：；!?%;:.,)]$/.test(token))tokens[tokens.length-1]+=token;
        else tokens.push(token);
      }
      let line='';
      for(const token of tokens){
        const parts=font.widthOfTextAtSize(token,size)>width?[...token]:[token];
        for(const part of parts){if(line && font.widthOfTextAtSize(line+part,size)>width){lines.push(line);line=part;}else line+=part;}
      }
      lines.push(line);
    }return lines;
  }
  function paragraph(text,size=10){
    const lines=wrap(text,size),lineHeight=size*1.65;
    if(lines.length<=4)need(lines.length*lineHeight+8);
    for(const line of lines){need(lineHeight);page.drawText(line,{x:left,y:y-size,size,font,color:ink});y-=lineHeight;}
    y-=9;
  }
  function heading(text){need(68);y-=5;page.drawRectangle({x:left,y:y-25,width,height:25,color:rgb(.97,.94,.90)});page.drawText(text,{x:left+8,y:y-17,size:11,font,color:accent});y-=38;}
  newPage();
  paragraph(content.documentTitle,18);
  paragraph(content.type==='review'?'確認事項を整理するための書類です。通常プランの金額・包括業務・署名欄は出力しません。受託・実施・支払いを確約するものではありません。':content.type==='contract'?'委託者（甲）と受託者（乙）は、以下の個別条件および本書に収録するサービス利用条件を確認します。':'新規のお取引用書類です。個別に確認した範囲・金額を記載します。生成だけで契約が確定するものではありません。',10);
  for(const s of content.sections){heading(s.title);s.paragraphs.forEach(p=>paragraph(p));}
  if(content.type==='contract') { newPage();heading('別紙 サービス利用条件');
  paragraph(content.termsNotice||'本書に収録した条件を双方で確認し、署名・同意の記録とともに保存してください。料金条件基準日：2026年10月20日。受託条件・AI利用方針：2026年10月24日版。元ページ： https://local-koho.com/terms.html',9);
  for(const term of content.terms){heading(term.title);paragraph(term.text);}
  need(360);heading('双方の確認・署名');
  paragraph(`契約日：${content.data.contractDate}\n本書の個別条件および別紙利用条件を確認し、合意します。PDFの生成だけで契約は確定しません。`,10);
  // Names/addresses are already populated above. Only signatures remain handwritten.
  paragraph(`甲：${content.data.customer}\n署名者名：${content.data.customerSigner}`,10);
  need(65);paragraph('甲 署名：________________________________________________',10);y-=20;
  paragraph(`乙：${content.data.provider}\n氏名：${content.data.providerSigner}`,10);
  need(55);paragraph('乙 署名：________________________________________________',10);
  }
  const pages=doc.getPages();
  pages.forEach((p,i)=>{
    p.drawLine({start:{x:left,y:40},end:{x:W-left,y:40},thickness:.5,color:rgb(.8,.81,.82)});
    p.drawText(`作成日 ${content.data.contractDate}  |  ご利用前に内容をご確認ください`,{x:left,y:26,font,size:8,color:muted});
    p.drawText(`${i+1} / ${pages.length}`,{x:W-76,y:26,font,size:8,color:muted});
  });
  return doc.save();
}
