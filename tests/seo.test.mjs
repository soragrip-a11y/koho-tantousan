import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseHTML, DOMParser } from 'linkedom';

const dist = new URL('../dist/', import.meta.url);
const read = file => readFileSync(new URL(file, dist), 'utf8');
const origin = 'https://local-koho.com';
const verificationFile = 'google6d1f5ddc13882b87.html';
const publicPages = readdirSync(dist)
  .filter(file => file.endsWith('.html'))
  .filter(file => file !== verificationFile)
  .filter(file => {
    const { document } = parseHTML(read(file));
    return !document.querySelector('meta[name="robots"][content*="noindex"]')
      && !document.querySelector('meta[http-equiv="refresh"]');
  });
const representative = file => `${origin}/${file === 'index.html' ? '' : file}`;

test('Google ownership verification keeps its exact content without page markup', () => {
  assert.equal(read(verificationFile), `google-site-verification: ${verificationFile}`);
});

test('homepage title matches the approved searchable service title', () => {
  const { document } = parseHTML(read('index.html'));
  assert.equal(document.title, '広報担当さん｜動画制作・SNS運用支援｜ソラグリップ');
});

test('every public page has one clean HTTPS canonical in its head', () => {
  for (const file of publicPages) {
    const { document } = parseHTML(read(file));
    const canonicals = [...document.querySelectorAll('link[rel="canonical"]')];
    assert.equal(canonicals.length, 1, file);
    assert.equal(canonicals[0].parentNode, document.head, file);
    assert.equal(canonicals[0].getAttribute('href'), representative(file), file);
    const url = new URL(canonicals[0].getAttribute('href'));
    assert.equal(url.search, '', file);
    assert.equal(url.hash, '', file);
  }
});

test('sitemap contains each indexable representative URL once and no tool or redirect', () => {
  const xml = new DOMParser().parseFromString(read('sitemap.xml'), 'text/xml');
  assert.equal(xml.documentElement.tagName, 'urlset');
  assert.equal(xml.documentElement.getAttribute('xmlns'), 'http://www.sitemaps.org/schemas/sitemap/0.9');
  const urls = [...xml.querySelectorAll('url > loc')].map(node => node.textContent);
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual([...urls].sort(), publicPages.map(representative).sort());
  assert.equal(urls.includes(`${origin}/contract.html`), false);
  assert.equal(urls.includes(`${origin}/simulator.html`), false);
  assert.equal(urls.includes(`${origin}/index.html`), false);
});

test('robots allows public crawling and advertises the canonical sitemap', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/local-koho\.com\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /^Disallow:\s*\S/m);
});

test('private contract tool stays noindex and retired simulator keeps pricing canonical', () => {
  const contract = parseHTML(read('contract.html')).document;
  assert.equal(contract.querySelector('meta[name="robots"]').getAttribute('content'), 'noindex');
  const simulator = parseHTML(read('simulator.html')).document;
  assert.equal(simulator.querySelector('link[rel="canonical"]').getAttribute('href'), `${origin}/pricing.html`);
  assert.equal(simulator.querySelector('meta[http-equiv="refresh"]').getAttribute('content'), '0;url=pricing.html');
});
