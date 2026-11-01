import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {buildPublicationArtifacts,validateArticle} from '../scripts/render-original-blog.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const all=JSON.parse(read('content/site-articles.json'));
const added=all.filter(a=>a.bodyHtml);
test('all 18 audited articles appear once, preserve sources and match rendered metadata',()=>{
 assert.equal(added.length,18);
 const index=parseHTML(read('dist/blog.html')).document;
 const sitemap=read('dist/sitemap.xml');
 for(const a of added){
  const file='blog-'+a.id+'.html';
  const {document}=parseHTML(read('dist/'+file));
  assert.equal(document.querySelector('h1').textContent,a.title);
  assert.equal(document.querySelector('meta[name="description"]').getAttribute('content'),a.description);
  assert.equal(document.querySelector('meta[property="og:description"]').getAttribute('content'),a.description);
  assert.equal(index.querySelectorAll(`h3 a[href="${file}"]`).length,1);
  assert.equal(sitemap.split('https://local-koho.com/'+file+'</loc>').length-1,1);
  for(const source of a.sources)assert.ok([...document.querySelectorAll('.article-body a')].some(x=>x.getAttribute('href')===source.url));
  assert.equal(document.querySelector('.article-body').textContent,parseHTML('<html><body>'+a.bodyHtml+'</body></html>').document.body.textContent);
 }
});
test('Kameyama separates cruise, hiking and chrysanthemum periods everywhere',()=>{
 const a=added.find(a=>a.id==='kimitsu-kameyama-autumn-festival-2026');
 assert.match(a.description,/ハイキングは11月14日〜12月13日/);
 assert.match(a.description,/紅葉クルーズは11月14日〜12月6日/);
 assert.match(a.description,/菊まつりは11月3〜29日/);
 assert.match(a.bodyHtml,/紅葉狩りクルーズは11月14日〜12月6日/);
 assert.match(a.bodyHtml,/菊まつり：11月29日まで/);
 assert.doesNotMatch(a.bodyHtml,/11月7日〜30日|クルーズ.{0,12}12月13日/);
});
test('rebuilding originals keeps every added page and is idempotent for index and sitemap',()=>{
 const legacy=new Set(JSON.parse(read('content/note-articles.json')).map(a=>a.id));
 const result=buildPublicationArtifacts(all,legacy,read('dist/blog.html'),read('dist/sitemap.xml'));
 assert.equal(result.index,read('dist/blog.html'));
 assert.equal(result.sitemap,read('dist/sitemap.xml'));
 for(const page of result.pages.filter(p=>added.some(a=>'blog-'+a.id+'.html'===p.path)))assert.equal(page.html,read('dist/'+page.path));
});
test('reviewed rich article bodies reject scripts, event handlers and unsafe URLs',()=>{
 for(const bodyHtml of ['<script>alert(1)</script>','<p onclick="x()">x</p>','<a href="javascript:alert(1)">x</a>','<iframe src="https://example.com"></iframe>'])assert.throws(()=>validateArticle({...added[0],bodyHtml}));
});
