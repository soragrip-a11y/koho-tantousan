import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { DOMParser } from 'linkedom';

export const FEED_URL = 'https://note.com/koho_tantousan/rss';
const PAGE = new URL('../dist/blog.html', import.meta.url);
const START = '<!-- note-articles:start -->';
const END = '<!-- note-articles:end -->';
const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function parseFeed(source) {
  if (Buffer.byteLength(source) > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('Unsupported RSS');
  const xml = new DOMParser().parseFromString(source, 'text/xml');
  const channel = xml.querySelector('rss > channel');
  if (!channel || channel.querySelector('link')?.textContent.trim() !== 'https://note.com/koho_tantousan') throw new Error('Unexpected RSS channel');
  const seen = new Set();
  return [...channel.querySelectorAll('item')].flatMap(item => {
    const title = item.querySelector('title')?.textContent.trim();
    const href = item.querySelector('link')?.textContent.trim();
    const rawDate = item.querySelector('pubDate')?.textContent.trim();
    if (!title || !/^https:\/\/note\.com\/koho_tantousan\/n\/n[a-zA-Z0-9]+$/.test(href || '')) throw new Error('Invalid article; existing list retained');
    if (seen.has(href)) return [];
    seen.add(href);
    const date = rawDate && Number.isFinite(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : null;
    const description = item.querySelector('description')?.textContent || '';
    const body = new DOMParser().parseFromString(`<html><body>${description}</body></html>`, 'text/html');
    body.querySelectorAll('script,style,iframe').forEach(node => node.remove());
    const plain = body.body.textContent.replace(/続きをみる\s*$/, '').replace(/\s+/g, ' ').trim();
    const summary = [...plain].slice(0, 120).join('') + ([...plain].length > 120 ? '…' : '');
    return [{ title, href, date, summary }];
  }).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 12);
}

export function renderArticles(articles) {
  if (!articles.length) return '<div class="blog-empty"><h3>記事の公開を準備中です。</h3><p>公開された記事は、こちらでご案内します。最新の公開状況は note でも確認できます。</p><a class="text-link" href="https://note.com/koho_tantousan" target="_blank" rel="noopener noreferrer">note を見る（外部サイト）</a></div>';
  return '<ul class="blog-list">' + articles.map(({ title, href, date, summary }) => {
    const label = date ? new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date)) : '';
    return `<li><article>${date ? `<time datetime="${escape(date)}">${label}</time>` : ''}<h3><a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(title)}</a></h3>${summary ? `<p>${escape(summary)}</p>` : ''}<p class="muted">本文は note で読む（外部サイト）</p></article></li>`;
  }).join('') + '</ul>';
}

export async function syncBlog() {
  const current = await readFile(PAGE, 'utf8');
  if (current.includes('blog-published')) throw new Error('Full-text articles are managed with npm run sync:blog from approved local snapshots; RSS cannot overwrite them');
  const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);
  let source = '';
  let size = 0;
  const decoder = new TextDecoder();
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > 2_000_000) throw new Error('RSS too large');
    source += decoder.decode(chunk, { stream: true });
  }
  source += decoder.decode();
  const articles = parseFeed(source);
  const page = await readFile(PAGE, 'utf8');
  if (page.split(START).length !== 2 || page.split(END).length !== 2) throw new Error('Missing or duplicate article markers');
  const next = page.slice(0, page.indexOf(START) + START.length) + '\n' + renderArticles(articles) + '\n' + page.slice(page.indexOf(END));
  await writeFile(PAGE, next);
  console.log(`${articles.length} note articles prepared. Review titles, content and scope before publishing.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncBlog().catch(error => { console.error('Blog not updated:', error.message); process.exitCode = 1; });
}
