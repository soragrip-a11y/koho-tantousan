import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const write = (p, s) => writeFileSync(new URL(p, root), s);
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowedAreas = new Set(['君津', '船橋', '千葉県']);
const origin = 'https://local-koho.com';
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s));
const urlIsSafe = s => {try {const u = new URL(s); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;} catch {return false;}};
const assertText = (s, key, max) => {if (typeof s !== 'string' || !s.trim() || s.length > max) throw Error('Invalid '+key);};
export const filename = a => 'blog-' + a.id + '.html';

export function validateArticle(a) {
 if (!a || typeof a !== 'object') throw Error('Invalid article');
 if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.id || '') || a.id.length < 8 || a.id.length > 80) throw Error('Invalid article id');
 if (!allowedAreas.has(a.area)) throw Error('Invalid area: '+a.id);
 assertText(a.title, 'title', 140);
 assertText(a.description, 'description', 200);
 assertText(a.intro, 'intro', 1500);
 if (!validDate(a.publishedAt) || (a.updatedAt && !validDate(a.updatedAt))) throw Error('Invalid dates: '+a.id);
 if (!Array.isArray(a.sections) || !a.sections.length || a.sections.length > 24) throw Error('Missing sections: '+a.id);
 for(const section of a.sections) {
  assertText(section.heading, 'section heading', 120);
  if (!Array.isArray(section.paragraphs) || !section.paragraphs.length || section.paragraphs.length > 15) throw Error('Missing section paragraphs');
  for(const p of section.paragraphs) assertText(p, 'paragraph', 3000);
 }
 if (!Array.isArray(a.sources) || a.sources.length < 1 || a.sources.length > 20) throw Error('Missing primary sources: '+a.id);
 for(const s of a.sources) {
  assertText(s.title, 'source title', 220);
  if (!urlIsSafe(s.url)) throw Error('Invalid source URL: '+a.id);
  if (typeof s.checkedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt)) throw Error('Source verification date missing: '+a.id);
 }
 if (a.faq !== undefined) {
  if(!Array.isArray(a.faq) || a.faq.length > 12) throw Error('Invalid FAQ');
  for(const q of a.faq) {assertText(q.question, 'FAQ question', 160); assertText(q.answer, 'FAQ answer', 1000);}
 }
 if(a.image !== undefined && !/^assets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/.test(a.image)) throw Error('Invalid image path');
 if(a.image && a.image.includes('..')) throw Error('Unsafe image path');
 // A draft is never published merely because it exists in the content file.
 if(a.status !== 'draft' && a.status !== 'published') throw Error('Invalid status');
 if(a.status === 'published' && a.approved !== true) throw Error('Unapproved publication refused: '+a.id);
 return a;
}
const isoJa = s => new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric'}).format(new Date(s));
export function renderOriginalArticle(a, indexHtml) {
 validateArticle(a);
 const canonical = origin + '/' + filename(a);
 const dateModified = a.updatedAt || a.publishedAt;
 const image = origin + '/' + (a.image || 'assets/service-logo.png');
 const metadata = {
  '@context':'https://schema.org',
  '@type':'BlogPosting',
  headline:a.title,
  description:a.description,
  datePublished:a.publishedAt,
  dateModified,
  mainEntityOfPage:canonical,
  inLanguage:'ja-JP',
  author:{'@type':'Organization',name:'広報担当さん',url:origin+'/'},
  publisher:{'@type':'Organization',name:'広報担当さん',url:origin+'/'},
  image:[image]
 };
 const structuredData = JSON.stringify(metadata).replace(/</g, '\\u003c');
 const head = indexHtml.slice(0, indexHtml.indexOf('<main id="main">'))
  .replace(/<title>.*?<\/title>/, '<title>'+escape(a.title)+' | 広報担当さん</title>')
  .replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="'+canonical+'">')
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="'+escape(a.description)+'">')
  .replace('property="og:type" content="website"', 'property="og:type" content="article"')
  .replace('</head>', '<meta property="og:title" content="'+escape(a.title)+'"><meta property="og:description" content="'+escape(a.description)+'"><meta property="og:url" content="'+canonical+'"><meta property="og:image" content="'+image+'"><meta property="article:published_time" content="'+escape(a.publishedAt)+'"><meta property="article:modified_time" content="'+escape(dateModified)+'"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">'+structuredData+'</script></head>');
 const paragraphs = a.sections.map(s=>'<section><h2>'+escape(s.heading)+'</h2>'+s.paragraphs.map(p=>'<p>'+escape(p).replace(/\n/g,'<br>')+'</p>').join('')+'</section>').join('');
 const faq = a.faq?.length ? '<section><h2>よくある質問</h2>'+a.faq.map(q=>'<h3>'+escape(q.question)+'</h3><p>'+escape(q.answer)+'</p>').join('')+'</section>' : '';
 const sources = '<section class="article-sources"><h2>出典・確認日</h2><ul>'+a.sources.map(s=>'<li><a href="'+escape(s.url)+'" target="_blank" rel="noopener noreferrer">'+escape(s.title)+'</a>（確認：'+escape(s.checkedAt)+'）</li>').join('')+'</ul></section>';
 const figure = a.image ? '<figure><img src="'+escape(a.image)+'" alt="'+escape(a.imageAlt || a.title+'の参考画像')+'" loading="eager"></figure>' : '';
 const main='<main id="main" class="news-article"><article><header><a class="text-link" href="blog.html">ブログ一覧へ</a><p class="eyebrow">'+escape(a.area)+' / LOCAL NEWS</p><h1>'+escape(a.title)+'</h1><p class="muted">広報担当さん · <time datetime="'+escape(a.publishedAt)+'">'+isoJa(a.publishedAt)+'</time></p><p class="article-origin">この記事の原本は広報担当さん公式サイトです。</p>'+figure+'</header><div class="article-body"><p class="lead">'+escape(a.intro)+'</p>'+paragraphs+faq+sources+'</div><footer class="article-end"><a class="text-link" href="blog.html">ブログ一覧へ戻る</a></footer></article></main>';
 return head + main + indexHtml.slice(indexHtml.indexOf('<footer>'));
}

export function selectApprovedArticles(articles, legacyIds = new Set()) {
 if (!Array.isArray(articles)) throw Error('Expected an article array');
 const ids = new Set();
 for (const a of articles) {
  validateArticle(a);
  if(ids.has(a.id)) throw Error('Duplicate article ID');
  if(legacyIds.has(a.id)) throw Error('Article ID collides with existing note article: '+a.id);
  ids.add(a.id);
 }
 return articles.filter(a => a.status === 'published' && a.approved === true);
}

export function assertPublicStoreSafe(articles) {
 if (!Array.isArray(articles)) throw Error('Expected an article array');
 if (articles.some(a => a?.status === 'draft')) throw Error('Private drafts must not be stored in a public GitHub repository. Use private Google Drive.');
}

export function renderOriginals() {
 const articles = JSON.parse(read('content/site-articles.json'));
 assertPublicStoreSafe(articles);
 const legacyIds = new Set(JSON.parse(read('content/note-articles.json')).map(a => a.id));
 const approved = selectApprovedArticles(articles, legacyIds);
 let index = read('dist/blog.html');
 const cards = approved.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).map(a=>
  '<li><article><div><p class="eyebrow">'+escape(a.area)+'</p><time datetime="'+escape(a.publishedAt)+'">'+isoJa(a.publishedAt)+'</time><h3><a href="'+filename(a)+'">'+escape(a.title)+'</a></h3><p>'+escape(a.description)+'</p><a class="text-link" href="'+filename(a)+'">この記事を読む</a></div></article></li>'
 ).join('');
 const marker='<!-- site-originals:start -->';
 const end='<!-- site-originals:end -->';
 const newCards=marker+(cards ? '<ul class="blog-list blog-originals">'+cards+'</ul>' : '')+end;
 if(index.includes(marker)) index=index.replace(/<!-- site-originals:start -->[\s\S]*?<!-- site-originals:end -->/,newCards);
 else index=index.replace('<!-- note-articles:start -->',newCards+'\n<!-- note-articles:start -->');
 write('dist/blog.html',index);
 let sitemap=read('dist/sitemap.xml');
 const siteUrls=approved.map(a=>'<url><loc>'+origin+'/'+filename(a)+'</loc><lastmod>'+escape((a.updatedAt||a.publishedAt).slice(0,10))+'</lastmod></url>').join('');
 const sitemapMarker='<!-- site-originals:start -->',sitemapEnd='<!-- site-originals:end -->';
 const replacement=sitemapMarker+siteUrls+sitemapEnd;
 if(sitemap.includes(sitemapMarker)) sitemap=sitemap.replace(/<!-- site-originals:start -->[\s\S]*?<!-- site-originals:end -->/,replacement);
 else sitemap=sitemap.replace('</urlset>',replacement+'\n</urlset>');
 write('dist/sitemap.xml',sitemap);
 for(const a of approved) write('dist/'+filename(a),renderOriginalArticle(a,index));
 console.log('Rendered '+approved.length+' site-original articles; drafts remain unpublished.');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) renderOriginals();
