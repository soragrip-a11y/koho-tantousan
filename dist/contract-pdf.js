import { validateContract, clean, yen, renewalDeadline } from './contract-core.js?v=20261010-simple';
import { TERMS } from './contract-terms.js';

export function contractSections(data) {
  const c = validateContract(data), d = Object.fromEntries(Object.entries(data).map(([k,v])=>[k,typeof v==='string'?clean(v):v]));
  const sections = [];
  const section = (title, paragraphs) => sections.push({ title, paragraphs:paragraphs.map(clean) });
  section('1. 契約当事者・契約期間',[
    `契約日：${d.contractDate}`,
    `委託者（甲）：${d.customer}\n代表者・署名者：${d.customerSigner}\n住所：${d.customerAddress}\nメール：${d.customerEmail}\n電話：${d.customerPhone || '記載なし'}\n支払者・請求書宛名：${d.payer}`,
    `受託者（乙）：${d.provider}\n氏名：${d.providerSigner}\n住所：${d.providerAddress}\nメール：${d.providerEmail}`,
    `対象期間：${d.start} 〜 ${c.end}${c.monthly ? `（初回${c.months}か月）` : '（単発）'}`,
    c.monthly ? `最低利用期間は${c.plan.months}か月。初回期間満了後は1か月ごとに自動更新。初回の更新停止・プラン変更の連絡期限は${renewalDeadline(c.end)}（満了14日前）。開始日を起算し、翌月の同日の前日（同日がない場合は月末）までを1か月として計算。月額は開始日からの1か月単位で計算する。` : '単発契約のため自動更新なし。'
  ]);
  section('2. 委託する制作・運用業務',[
    `プラン：${c.plan.name}\n${c.plan.scope}`,
    `${c.monthly?'毎月':'契約全体'}の制作本数：ショート${c.shorts}本（各1分以内）、ロング${c.longs}本（各10分以内）。ショートは動画内表紙、ロングはサムネイル各1枚を含む。`,
    `撮影：${c.monthly?'毎月':'契約全体'} ${d.plan==='premium'?`プラン内1回・${d.includedHours}時間まで ＋ `:''}追加4時間枠${c.shoot4}回、追加7時間枠${c.shoot7}回。準備・休憩・撤収を含む。`,
    `発信目的・制作内容：\n${d.purpose}`,
    '公開先・対象チャンネルおよび素材提供・撮影・納品・公開の日程は、業務の実施前に双方で確認・合意する。',
    `完成動画の利用範囲：\n${d.usage}`,
    `実績掲載：${d.portfolio==='no'?'許可しない。':'掲載対象・内容・時期を別途確認し、記録の残る方法で承認を得た範囲に限る。本書のみでの包括許可はしない。'}`,
    'カット・基本テロップ・音量調整・色調整・BGM・簡単な図解、各動画2回までの修正を含む。広告運用、コメント・DM対応、YouTube以外への投稿運用、ライブ配信は基本料金外。再生数・登録者数・売上などの成果は保証しない。'
  ]);
  section('3. 契約料金・計算内訳（税込）',[
    ...c.rows.map(r=>`${r.label}：${yen(r.unit)} × ${r.qty} = ${yen(r.amount)}${r.timing==='monthly'?'／月':'（初回契約中1回のみ）'}`),
    ...(c.monthly ? [`月額：${yen(c.recurring)} × 初回${c.months}か月 = ${yen(c.recurring*c.months)}`] : []),
    `初回契約中1回のみの制作・追加費用：${yen(c.oneTime)}`,
    `初回契約期間の確定総額：${yen(c.total)}`,
    '上記総額は後日精算の実費・未合意の追加業務・更新後の料金を含まない。一括前払い額を示すものではない。表示料金は税込の支払総額であり、消費税を重ねて加算しない。',
    c.monthly ? `初月の予定支払額：${yen(c.first)}（初月月額＋初回のみの追加費用）。2か月目以降の月額は${yen(c.recurring)}。更新後も本書の月額条件を適用し、初回のみの追加費用は繰り返し計上しない。変更・新規の実費は別途合意する。` : `着手前の予定支払額：${yen(c.first)}。後日精算分は下記の方法による。`
  ]);
  section('4. 追加費用の確認',[
    '事前に見積もり・合意した追加作業や交通費・駐車場代・宿泊費等は、上記の追加費用の内訳に含む。同一の費用を重複請求しない。',
    '金額未確定の実費や新たな追加費用は、発生前に対象・金額または上限・精算方法を提示し、LINE・メール等の記録が残る方法で双方が合意する。未確定額は上記総額に含めない。後日精算の実費は領収書等と明細を添え、25日締め・当月末払い（26日以降の確定分は翌月末払い、銀行休業日は前営業日）とする。'
  ]);
  section('5. 個別の確認事項', [d.notes || '追加の確認事項なし。', '本書の入力内容と別紙利用条件に不整合がある場合は、署名前に双方で確認・修正する。契約成立後の範囲・費用・条件の変更は、双方の合意を記録する。']);
  return { sections, terms:TERMS, data:d, calculation:c };
}

// Pure PDF renderer shared by the browser and automated output checks.
export async function generateContract(data,{PDFLib,fontkit,fontBytes}) {
  const content=contractSections(data), {PDFDocument,rgb}=PDFLib;
  const doc=await PDFDocument.create(); doc.registerFontkit(fontkit);
  const font=await doc.embedFont(fontBytes,{subset:true});
  doc.setTitle('動画制作・運用支援 業務委託契約書');doc.setAuthor('広報担当さん');doc.setLanguage('ja-JP');
  const charset=new Set(font.getCharacterSet());
  const allText=JSON.stringify(content.sections)+JSON.stringify(content.terms);
  const unsupported=[...new Set([...allText].filter(ch=>ch.charCodeAt(0)>32 && !charset.has(ch.codePointAt(0))))];
  if(unsupported.length) throw new Error(`PDFに使用できない文字があります（${unsupported.slice(0,8).join(' ')}）。絵文字・特殊文字を通常の文字に置き換えてください。`);
  const W=595.28,H=841.89,left=46,width=W-92,bottom=54;
  const ink=rgb(.08,.10,.12),muted=rgb(.32,.35,.38),accent=rgb(.65,.31,.02);
  let page,y;
  function newPage(){page=doc.addPage([W,H]);y=H-52;page.drawText('広報担当さん | 動画制作・YouTube運用支援',{x:left,y:H-27,size:8,font,color:muted});}
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
  paragraph('動画制作・運用支援 業務委託契約書',18);
  paragraph('委託者（甲）と受託者（乙）は、以下の個別条件および本書に収録するサービス利用条件に基づき、業務を委託・受託します。',10);
  for(const s of content.sections){heading(s.title);s.paragraphs.forEach(p=>paragraph(p));}
  newPage();heading('別紙 サービス利用条件');
  paragraph('本書に収録した条件を双方で確認し、署名・同意の記録とともに保存してください。料金条件基準日：2026年10月10日。元ページ： https://local-koho.com/terms.html',9);
  for(const term of content.terms){heading(term.title);paragraph(term.text);}
  need(360);heading('双方の確認・署名');
  paragraph(`契約日：${content.data.contractDate}\n本書の個別条件および別紙利用条件を確認し、合意します。PDFの生成だけで契約は確定しません。`,10);
  // Names/addresses are already populated above. Only signatures remain handwritten.
  paragraph(`甲：${content.data.customer}\n署名者名：${content.data.customerSigner}`,10);
  need(65);paragraph('甲 署名：________________________________________________',10);y-=20;
  paragraph(`乙：${content.data.provider}\n氏名：${content.data.providerSigner}`,10);
  need(55);paragraph('乙 署名：________________________________________________',10);
  const pages=doc.getPages();
  pages.forEach((p,i)=>{
    p.drawLine({start:{x:left,y:40},end:{x:W-left,y:40},thickness:.5,color:rgb(.8,.81,.82)});
    p.drawText(`契約日 ${content.data.contractDate}  |  署名前に内容をご確認ください`,{x:left,y:26,font,size:8,color:muted});
    p.drawText(`${i+1} / ${pages.length}`,{x:W-76,y:26,font,size:8,color:muted});
  });
  return doc.save();
}
