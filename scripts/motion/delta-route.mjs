import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = 'artifacts/delta-reference/route2'; fs.mkdirSync(out, {recursive: true});
const browser = await chromium.launch({headless: false});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto('https://deltacafes.com/en', {waitUntil: 'domcontentloaded', timeout: 60000});
await page.waitForTimeout(6500);
const d = page.getByRole('button', {name: /Rejeitar todos|Deny|Reject/i}).first(); if (await d.isVisible().catch(() => false)) await d.click();
await page.mouse.wheel(0, 500); await page.waitForTimeout(1200);
const t0 = Date.now();
await page.locator('main a[href="/en/history"]').first().click({noWaitAfter: true});
const log = [];
while (Date.now() - t0 < 6000) {
  const t = Date.now() - t0;
  try { await page.screenshot({path: `${out}/t${String(t).padStart(4, '0')}.png`, timeout: 1500}); log.push([t, page.url()]); } catch (e) { log.push([t, 'shot-timeout']); }
  await page.waitForTimeout(180);
}
console.log(log.map(l => l.join(' ')).join('\n'));
await browser.close();
