export function fixture(overrides={}) {
  return {
    customer:'検証用サンプル団体',customerSigner:'山田 太郎',customerAddress:'千葉県君津市（検証用の架空住所）',customerEmail:'sample@example.com',customerPhone:'',payer:'検証用サンプル団体',
    provider:'ソラグリップ（広報担当さん）',providerSigner:'須永 空和',providerAddress:'千葉県（PDF検証用・実際の契約には使用しない）',providerEmail:'sora.grip@gmail.com',
    contractDate:'2026-10-10',start:'2026-11-01',end:'2026-11-30',plan:'standard',months:'1',shorts:'6',longs:'0',includedHours:'4',shoot4:'0',shoot7:'0',
    purpose:'検証用の活動報告動画。契約成立を目的としない架空データ。',usage:'依頼者の活動紹介として指定の公開先で利用する。',portfolio:'no',notes:'このPDFは機能検証用です。実際の契約書ではありません。',
    extras:[],reviewed:true,...overrides
  };
}
