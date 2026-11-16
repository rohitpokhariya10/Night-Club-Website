// Browses Unsplash search results (no login) and builds a numbered contact sheet per query, recording each
// result's photo page, image URL, description and whether it is free (Unsplash License) or Unsplash+ (paid;
// excluded). Used to choose licensed placeholder imagery. usage: node scripts/assets/unsplash-browse.mjs <outDir> "<query>" ...
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [out, ...queries] = process.argv.slice(2); fs.mkdirSync(out, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 1000}, locale: 'en-US'});
for (const query of queries) {
  await page.goto(`https://unsplash.com/s/photos/${encodeURIComponent(query.replace(/\s+/g, '-'))}?license=free`, {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.waitForTimeout(3500);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(600); }
  const items = await page.evaluate(() => [...document.querySelectorAll('figure')].map(f => {
    const a = f.querySelector('a[href^="/photos/"]'); const img = f.querySelector('img[srcset], img[src*="images.unsplash.com"]');
    return a && img ? {page: 'https://unsplash.com' + a.getAttribute('href'), src: (img.currentSrc || img.src), alt: img.alt, plus: /unsplash\+|plus\.unsplash/i.test(f.innerText + (img.src || ''))} : null;
  }).filter(Boolean).filter(x => !x.plus && /images\.unsplash\.com\/photo-/.test(x.src)).slice(0, 18));
  const slug = query.replace(/\W+/g, '-');
  fs.writeFileSync(`${out}/${slug}.json`, JSON.stringify(items, null, 1));
  const cells = items.map((x, i) => `<figure><img src="${x.src.replace(/w=\d+/, 'w=400')}"><figcaption>${i}: ${x.alt.slice(0, 60)}</figcaption></figure>`).join('');
  const sheet = await browser.newPage({viewport: {width: 1300, height: 400}});
  await sheet.setContent(`<style>body{margin:0;background:#222;color:#fff;font:11px monospace}main{display:grid;grid-template-columns:repeat(6,210px);gap:6px;padding:6px}img{width:210px;height:210px;object-fit:cover;display:block}figure{margin:0}</style><main>${cells}</main>`);
  await sheet.waitForTimeout(3000);
  await sheet.screenshot({path: `${out}/${slug}.png`, fullPage: true});
  await sheet.close();
  console.log(query, items.length, 'free results');
}
await browser.close();
