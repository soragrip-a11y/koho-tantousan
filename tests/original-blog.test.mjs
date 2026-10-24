import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {validateArticle, renderOriginalArticle, filename, selectApprovedArticles, assertPublicStoreSafe} from '../scripts/render-original-blog.mjs';

const source = () => ({
 id:'2026-10-24-kimitsu-seo-test',
 area:'君津',
 title:'君津市の制度案内｜申請の注意点',
 description:'君津市の制度案内に関する対象者・確認先・注意点を整理します。',
 intro:'対象者は公式資料を確認してください。',
 publishedAt:'2026-10-24T17:00:00+09:00',
 status:'draft',
 approved:false,
 sections:[{heading:'対象となる人',paragraphs:['まず公式資料を確認する。','手続き前に募集条件を確認する。']}],
 sources:[{title:'君津市の公式情報',url:'https://www.city.kimitsu.lg.jp/',checkedAt:'2026-10-24'}],
 faq:[{question:'どこで確認できますか？',answer:'市の公式サイトで確認できます。'}]
});
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('drafts require complete metadata but never qualify as published', () => {
 const draft=source();
 assert.equal(validateArticle(draft),draft);
 const a={...draft,status:'published'};
 assert.throws(()=>validateArticle(a),/Unapproved publication/);
 assert.equal(validateArticle({...a,approved:true}).status,'published');
});
test('invalid source or article IDs fail before publishing',()=>{
 assert.throws(()=>validateArticle({...source(),id:'../evil'}),/Invalid article id/);
 assert.throws(()=>validateArticle({...source(),sources:[{title:'unsafe',url:'javascript:alert(1)',checkedAt:'2026-10-24'}]}),/Invalid source URL/);
 assert.throws(()=>validateArticle({...source(),area:'東京'}),/Invalid area/);
 assert.throws(()=>validateArticle({...source(),sections:[]}),/Missing sections/);
});
test('original article renders clean canonical, structured data, local links and escaped text',()=>{
 const a={...source(),status:'published',approved:true,sections:[{heading:'重要な情報',paragraphs:['利用者 <script>alert(1)</script> に注意。']}]};
 const html=renderOriginalArticle(a,read('dist/blog.html'));
 const {document}=parseHTML(html);
 const file=filename(a);
 assert.equal(document.querySelector('link[rel="canonical"]').getAttribute('href'),'https://local-koho.com/'+file);
 assert.equal(document.querySelector('meta[name="description"]').getAttribute('content'),a.description);
 assert.equal(document.querySelector('meta[property="og:type"]').getAttribute('content'),'article');
 assert.equal(document.querySelector('h1').textContent,a.title);
 assert.equal(document.querySelectorAll('.article-body script').length,0);
 assert.equal(document.querySelector('.article-body section h2').textContent,'重要な情報');
 assert.equal(document.querySelector('.article-sources a').getAttribute('href'),'https://www.city.kimitsu.lg.jp/');
 const metadata=JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
 assert.equal(metadata['@type'],'BlogPosting');
 assert.equal(metadata.datePublished,a.publishedAt);
 assert.equal(metadata.mainEntityOfPage,'https://local-koho.com/'+file);
});
test('publication gate excludes drafts and allows approved articles to be added later',()=>{
 const list=JSON.parse(read('content/site-articles.json'));
 assert.ok(Array.isArray(list));
 const currentApproved=selectApprovedArticles(list);
 assert.ok(currentApproved.every(a=>a.status==='published' && a.approved===true));
 const draft=source();
 const approved={...source(),id:'2026-10-24-funabashi-seo-test',area:'船橋',status:'published',approved:true};
 const mixed=selectApprovedArticles([draft,approved]);
 assert.equal(mixed.length,1);
 assert.equal(mixed[0].id,approved.id);
 assert.throws(()=>selectApprovedArticles([draft,draft]),/Duplicate article ID/);
 assert.throws(()=>selectApprovedArticles([draft],new Set([draft.id])),/collides with existing note article/);
 assert.throws(()=>selectApprovedArticles([{...draft,status:'published',approved:false}]),/Unapproved publication refused/);
});

test('public GitHub store contains only approved live entries; drafts belong in private Drive',()=>{
 const stored=JSON.parse(read('content/site-articles.json'));
 assert.doesNotThrow(()=>assertPublicStoreSafe(stored));
 assert.throws(()=>assertPublicStoreSafe([source()]),/Private drafts must not be stored/);
 const published={...source(),id:'2026-10-24-chiba-sample-approved',status:'published',approved:true};
 assert.doesNotThrow(()=>assertPublicStoreSafe([published]));
});
