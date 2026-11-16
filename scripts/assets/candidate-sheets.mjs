// Numbered contact sheets of Openverse candidates per query (thumbnails served by the Openverse API).
// usage: node scripts/assets/candidate-sheets.mjs <candidates.json> <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [file, out] = process.argv.slice(2);
const all = JSON.parse(fs.readFileSync(file, 'utf8'));
const browser = await chromium.launch();
const groups = {};
all.forEach((c, i) => { (groups[c.query] ??= []).push({...c, n: i}); });
for (const [query, items] of Object.entries(groups)) {
  const page = await browser.newPage({viewport: {width: 1320, height: 400}});
  const cells = items.map(c => `<figure><img src="${c.thumbnail}"><figcaption>#${c.n} ${c.license} ${c.width}×${c.height} ${String(c.title).slice(0, 34)}</figcaption></figure>`).join('');
  await page.setContent(`<style>body{margin:0;background:#222;color:#fff;font:10px monospace}main{display:grid;grid-template-columns:repeat(6,214px);gap:4px;padding:4px}img{width:214px;height:160px;object-fit:cover;display:block;background:#333}figure{margin:0}</style><main>${cells}</main>`);
  await page.waitForLoadState('networkidle', {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({path: `${out}/sheet-${query.replace(/\W+/g, '-')}.png`, fullPage: true});
  await page.close();
}
await browser.close();
console.log(Object.keys(groups).join(', '));
