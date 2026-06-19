const HOST = "frontface.app";
const KEY = "frontface-indexnow-2026-06-19";
const KEY_LOCATION = `https://${HOST}/frontface-indexnow-key.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;
const INDEXNOW_ENDPOINT = "https://www.bing.com/indexnow";

async function readSitemapUrls() {
  const response = await fetch(SITEMAP_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SITEMAP_URL}: ${response.status}`);
  }

  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function submit(urlList) {
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });

  if (![200, 202].includes(response.status)) {
    const body = await response.text();
    throw new Error(`IndexNow returned ${response.status}: ${body}`);
  }

  return response.status;
}

const urls = await readSitemapUrls();
const status = await submit(urls);

console.log(`Submitted ${urls.length} URLs to IndexNow (${status}).`);
