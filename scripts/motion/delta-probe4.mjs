// Route transition via CDP screencast (survives navigation), then a mobile pass.
import {chromium, devices} from '@playwright/test';
import fs from 'node:fs';
const out = 'artifacts/delta-reference';
const browser = await chromium.launch({headless: false});
const deny = async p => { const d = p.getByRole('button', {name: /Rejeitar todos|Deny|Reject/i}).first(); if (await d.isVisible().catch(() => false)) await d.click(); };
{
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  await page.goto('https://deltacafes.com/en', {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.waitForTimeout(6500); await deny(page); await page.waitForTimeout(800);
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async f => { frames.push({t: f.metadata.timestamp, data: f.data}); await cdp.send('Page.screencastFrameAck', {sessionId: f.sessionId}).catch(() => {}); });
  await page.mouse.wheel(0, 500); await page.waitForTimeout(1200);
  await cdp.send('Page.startScreencast', {format: 'jpeg', quality: 60, maxWidth: 720, maxHeight: 450, everyNthFrame: 3});
  const link = page.locator('main a[href*="/en/"]').first();
  const href = await link.getAttribute('href');
  const t0 = Date.now();
  await link.click({noWaitAfter: true, timeout: 5000}).catch(e => console.log('click', e.message));
  await page.waitForTimeout(3500);
  await cdp.send('Page.stopScreencast').catch(() => {});
  console.log('route', href, '->', page.url(), 'frames', frames.length, 'ms', Date.now() - t0);
  fs.mkdirSync(`${out}/route`, {recursive: true});
  const base = frames[0]?.t || 0;
  frames.forEach((f, i) => { if (i % 2 === 0) fs.writeFileSync(`${out}/route/r${String(Math.round((f.t - base) * 1000)).padStart(4, '0')}ms.jpg`, Buffer.from(f.data, 'base64')); });
  await page.close();
}
{
  const ctx = await browser.newContext({...devices['iPhone 13'], viewport: {width: 390, height: 844}, recordVideo: {dir: `${out}/video-mobile`, size: {width: 390, height: 844}}});
  const page = await ctx.newPage();
  await page.goto('https://deltacafes.com/en', {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.waitForTimeout(6500); await deny(page); await page.waitForTimeout(800);
  const info = await page.evaluate(() => ({h: document.documentElement.scrollHeight, cls: document.documentElement.className}));
  fs.mkdirSync(`${out}/mobile`, {recursive: true});
  for (let y = 0, i = 0; y < info.h && i < 40; y += 600, i++) {
    await page.evaluate(yy => window.scrollTo(0, yy), y); await page.waitForTimeout(600);
    await page.screenshot({path: `${out}/mobile/m${String(i).padStart(2, '0')}-y${y}.png`, timeout: 8000}).catch(() => {});
  }
  console.log('mobile', info);
  await ctx.close();
}
await browser.close();
