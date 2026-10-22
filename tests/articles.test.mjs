import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {syncBlog} from '../scripts/sync-blog.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const articles=JSON.parse(read('content/note-articles.json'));
test('only the nine authorized note articles are published with their complete original bodies',()=>{
 assert.deepEqual(articles.map(a=>a.id).sort(),['n185eb0dfe1c9','n513a33d7dde6','na27e51f9e846','na75104de9108','nf1fcec6cd3b0','nb9465545900d','n69af80f8210c','nd9e50babf6b9','n528833262a49'].sort());
 for(const a of articles){
  const html=read(`dist/blog-${a.id}.html`);
  assert.ok(html.includes(`<div class="article-body">${a.bodyHtml}</div>`),a.id);
  const {document}=parseHTML(html);
  assert.equal(document.querySelector('h1').textContent,a.title);
  assert.equal(document.querySelector('time').getAttribute('datetime'),a.publishedAt);
  assert.ok(document.querySelector(`a[href="${a.noteUrl}"]`));
  assert.equal(document.querySelector('meta[property="og:image"]').getAttribute('content'),'https://local-koho.com/'+a.image);
  assert.equal(document.querySelectorAll('.article-body script,.article-body iframe').length,0);
  const original=parseHTML('<html><body>'+a.bodyHtml+'</body></html>').document;
  assert.deepEqual([...document.querySelectorAll('.article-body a')].map(a=>a.getAttribute('href')),[...original.querySelectorAll('a')].map(a=>a.getAttribute('href')));
 }
});
test('blog index links to nine local full-text pages and has no empty state',()=>{
 const {document}=parseHTML(read('dist/blog.html'));
 assert.equal(document.querySelectorAll('.blog-published li').length,9);
 assert.equal(document.querySelectorAll('.blog-empty').length,0);
 for(const a of articles)assert.ok(document.querySelector(`.blog-published h3 a[href="blog-${a.id}.html"]`));
});
test('legacy live RSS update cannot overwrite the approved full-text index',async()=>{
 const before=read('dist/blog.html');
 await assert.rejects(syncBlog(),/RSS cannot overwrite/);
 assert.equal(read('dist/blog.html'),before);
});
