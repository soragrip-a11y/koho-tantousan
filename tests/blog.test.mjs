import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { parseFeed, renderArticles } from '../scripts/sync-blog.mjs';
const feed = items => `<rss><channel><link>https://note.com/koho_tantousan</link>${items}</channel></rss>`;
const item = (link = 'https://note.com/koho_tantousan/n/n123') => `<item><title>&lt;検証用&gt;</title><link>${link}</link><pubDate>invalid</pubDate><description><![CDATA[<p>${'要点'.repeat(100)}</p><img src="https://example.org/face.jpg"><script>alert(1)</script>]]></description></item>`;

test('empty RSS gives an honest empty state without fabricated dates or articles', () => {
  const html = renderArticles(parseFeed(feed('')));
  assert.match(html, /記事の公開を準備中/);
  assert.doesNotMatch(html, /<article|<time|<img/);
});
test('RSS summaries are bounded text, titles escaped, images and invalid dates omitted', () => {
  const articles = parseFeed(feed(item() + item()));
  assert.equal(articles.length, 1);
  assert.equal([...articles[0].summary].length, 121);
  const html = renderArticles(articles);
  assert.match(html, /&lt;検証用&gt;/);
  assert.doesNotMatch(html, /<script|<img|<time|alert\(1\)/);
});
test('untrusted feeds and destinations fail instead of overwriting a valid list', () => {
  for (const source of ['broken', '<!DOCTYPE rss>' + feed(''), feed(item('javascript:alert(1)')), feed(item('https://note.com/other/n/n123'))]) assert.throws(() => parseFeed(source));
});
test('article dates are original publish dates, sorted newest first and shown in Japan time', () => {
  const source = feed(item().replace('invalid', 'Tue, 20 Oct 2026 18:00:00 GMT') + item().replace('n123', 'n456').replace('invalid', 'Mon, 19 Oct 2026 18:00:00 GMT'));
  const articles = parseFeed(source);
  assert.equal(articles[0].date, '2026-10-20T18:00:00.000Z');
  assert.match(renderArticles(articles), /2026年10月21日/);
});
test('blog has the approved channels, current navigation, no face thumbnails or runtime feed requests', () => {
  const html = readFileSync(new URL('../dist/blog.html', import.meta.url), 'utf8');
  const { document } = parseHTML(html);
  assert.equal(document.querySelector('[aria-current="page"]').getAttribute('href'), 'blog.html');
  for (const url of ['https://note.com/koho_tantousan', 'https://x.com/koho_tantousan']) {
    const a = document.querySelector(`main a[href="${url}"]`);
    assert.ok(a); assert.equal(a.getAttribute('rel'), 'noopener noreferrer');
  }
  assert.equal(document.querySelectorAll('main img').length, 17);
  assert.equal(document.querySelectorAll('main iframe').length, 0);
  assert.match(document.querySelector('main').textContent, /個人的な政治意見や賛否は含めません/);
  assert.doesNotMatch(html, /自動更新済み/);
});
