import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const keyFile = 'public/0e443948e25445c7911453bb42d628e0.txt';
const key = readFileSync(keyFile, 'utf8').trim();
const host = process.env.INDEXNOW_HOST || 'cwa1e.top';
const endpoint =
  process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
const sitemapUrl = `https://${host}/sitemap.xml`;
const keyLocation = `https://${host}/${basename(keyFile)}`;

const sitemapResponse = await fetch(sitemapUrl, { cache: 'no-store' });
if (!sitemapResponse.ok) {
  throw new Error(`Sitemap request failed: ${sitemapResponse.status}`);
}

const sitemap = await sitemapResponse.text();
const urlList = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g))
  .map((match) => match[1].trim())
  .filter((url) => url.startsWith(`https://${host}/`));

if (urlList.length === 0) {
  throw new Error('No URLs found in sitemap');
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host,
    key,
    keyLocation,
    urlList,
  }),
});

console.log(`IndexNow submitted ${urlList.length} URLs: ${response.status}`);
if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}
