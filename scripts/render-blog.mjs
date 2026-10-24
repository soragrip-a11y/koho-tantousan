import {readFileSync,writeFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {renderOriginals} from './render-original-blog.mjs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const write=(p,s)=>writeFileSync(new URL(p,root),s);
const articles=JSON.parse(read('content/note-articles.json'));
const approved=new Set(['n185eb0dfe1c9','n513a33d7dde6','na27e51f9e846','na75104de9108','nf1fcec6cd3b0','nb9465545900d','n69af80f8210c','nd9e50babf6b9','n528833262a49','nf8b9baf1bd47','nb0e4d3677725','n832c404e2d2e','n62737dad7314','n53d16db656a9','nd7bb4fa858c5','n6757f9f7b91b','n5ed98c8bbfce','nf578c5ca06f8','n7758115fe70a']);
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let index=read('dist/blog.html');
const filename=a=>`blog-${a.id}.html`;
const date=a=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'long'}).format(new Date(a.publishedAt));
for(const a of articles){
 if(!approved.has(a.id)||a.noteUrl!==`https://note.com/koho_tantousan/n/${a.id}`||!Number.isFinite(Date.parse(a.publishedAt)))throw Error('Unapproved article');
 const {document}=parseHTML(`<html><body>${a.bodyHtml}</body></html>`);
 for(const el of document.body.querySelectorAll('*')){
  if(!['P','BR','A','STRONG','EM','UL','OL','LI','H2','H3','BLOCKQUOTE'].includes(el.tagName))throw Error('Unsupported body markup');
  for(const attr of [...el.attributes])if(!['id','name','href','target','rel'].includes(attr.name))throw Error('Unsupported body attribute');
  if(el.tagName==='A'&&!/^https:\/\//.test(el.getAttribute('href')||''))throw Error('Unsafe article link');
 }
 const summary=document.body.textContent.split('。')[0]+'。';
 const canonical=`https://local-koho.com/${filename(a)}`;
 let head=index.slice(0,index.indexOf('<main id="main">'))
  .replace(/<title>.*?<\/title>/,`<title>${escape(a.title)} | 広報担当さん</title>`)
  .replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${canonical}">`)
  .replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(summary)}">`)
  .replace('property="og:type" content="website"','property="og:type" content="article"')
  .replace('</head>',`<meta property="og:title" content="${escape(a.title)}"><meta property="og:description" content="${escape(summary)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://local-koho.com/${a.image}"><meta property="article:published_time" content="${a.publishedAt}"><meta name="twitter:card" content="summary_large_image"></head>`);
 const body=`<main id="main" class="news-article"><article><header><a class="text-link" href="blog.html">ブログ一覧へ</a><p class="eyebrow">${escape(a.area)} / LOCAL NEWS</p><h1>${escape(a.title)}</h1><p class="muted">広報担当さん · note公開：<time datetime="${a.publishedAt}">${date(a)}</time></p><p class="article-origin">広報担当さんが公開した記事の転載です。<a href="${a.noteUrl}" target="_blank" rel="noopener noreferrer">元の記事を note で読む</a></p><figure><img src="${a.image}" width="1280" height="670" alt="${escape(a.imageAlt)}" fetchpriority="high"><figcaption>note 記事に掲載したイメージイラスト</figcaption></figure></header><div class="article-body">${a.bodyHtml}</div><footer class="article-end"><a class="text-link" href="blog.html">ブログ一覧へ戻る</a><a class="text-link" href="${a.noteUrl}" target="_blank" rel="noopener noreferrer">note で元の記事を読む</a></footer></article></main>`;
 write('dist/'+filename(a),head+body+index.slice(index.indexOf('<footer>')));
 a.summary=summary;
}
const list='<ul class="blog-list blog-published">'+[...articles].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).map(a=>`<li><article><a href="${filename(a)}" class="blog-card-image" tabindex="-1" aria-hidden="true"><img src="${a.image}" width="1280" height="670" alt="" loading="lazy"></a><div><p class="eyebrow">${escape(a.area)}</p><time datetime="${a.publishedAt}">${date(a)}</time><h3><a href="${filename(a)}">${escape(a.listTitle || a.title)}</a></h3><p>${escape(a.listSummary || a.summary)}</p><a class="text-link" href="${filename(a)}">この記事を読む</a></div></article></li>`).join('')+'</ul>';
index=index.replace(/<!-- note-articles:start -->[\s\S]*?<!-- note-articles:end -->/,'<!-- note-articles:start -->\n'+list+'\n<!-- note-articles:end -->');
write('dist/blog.html',index);
let sitemap=read('dist/sitemap.xml');
for(const a of articles)if(!sitemap.includes('https://local-koho.com/'+filename(a)))sitemap=sitemap.replace('</urlset>',`  <url><loc>https://local-koho.com/${filename(a)}</loc></url>\n</urlset>`);
write('dist/sitemap.xml',sitemap);
console.log(`Rendered ${articles.length} approved articles from local snapshots. No network requests.`);

// Re-render approved site-original articles after the legacy note snapshot.
// Drafts stay out of the deployed site and sitemap.
renderOriginals();
