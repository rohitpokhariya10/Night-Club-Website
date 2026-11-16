// Renders representative sections with candidate type systems injected into the live page (nothing in
// the project changes) and builds a side-by-side sheet. usage: node scripts/motion/type-compare.mjs <outDir> <fontDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const [out, fontDir] = process.argv.slice(2); fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3100';
const systems = {
  current: null,
  'A-syne-manrope': {display: '/fonts/syne-variable-latin.woff2', text: '/fonts/manrope-variable-latin.woff2'},
  'B-spacegrotesk-inter': {display: '/__cmp/space-grotesk.woff2', text: '/__cmp/inter.woff2'},
};
const css = ({display, text}) => `
@font-face{font-family:CmpDisplay;src:url(${display}) format('woff2');font-weight:300 800}
@font-face{font-family:CmpText;src:url(${text}) format('woff2');font-weight:200 800}
body,p,a,li,span,label,input,textarea,select,button,.button,.eyebrow,.header-book,address,small,time,figcaption,blockquote{font-family:CmpText,sans-serif!important}
h1,h2,h3,.footer-wordmark,.photo-tag,.mobile-menu nav a,.special-price strong,.serif{font-family:CmpDisplay,sans-serif!important;font-style:normal!important}
h1{font-weight:700!important;letter-spacing:-.035em!important;text-transform:uppercase}
h2{font-weight:600!important;letter-spacing:-.03em!important}
h3{font-weight:600!important;letter-spacing:-.01em!important}
.script{font-family:CmpText,sans-serif!important;font-size:12px!important;font-weight:600!important;letter-spacing:.24em!important;text-transform:uppercase!important;color:var(--accent-readable)!important}
.header nav a{font-weight:600!important;letter-spacing:.06em!important}
.footer-wordmark{font-weight:700!important;letter-spacing:-.04em!important}`;
const shots = [
  ['/', '.cinema-hero'], ['/', '.split-feature'], ['/', '.home-food'], ['/', '.special-feature'], ['/', '.home-events'],
  ['/', '.home-gallery'], ['/', '.footer'], ['/food-menu', '.page-intro'], ['/food-menu', '.menu-page'], ['/events', '.page-intro'],
];
const browser = await chromium.launch();
const files = {};
for (const [name, sys] of Object.entries(systems).filter(([n]) => !process.env.ONLY || n === process.env.ONLY)) {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
  await page.route('**/__cmp/*.woff2', route => route.fulfill({path: `${fontDir}/${route.request().url().split('/').pop()}`, contentType: 'font/woff2'}));
  for (const [route, sel] of shots) {
    await page.goto(base + route);
    if (sys) await page.addStyleTag({content: css(sys)});
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250);
    const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    const f = `${out}/${name}${route.replace(/\//g, '_')}${sel.replace(/[^a-z]/g, '-')}.png`;
    await el.screenshot({path: f}); (files[sel + route] ??= []).push(f);
  }
  await page.close();
}
await browser.close();
for (const [key, list] of Object.entries(files)) execFileSync('node', ['scripts/motion/contact-sheet.mjs', `${out}/cmp-${key.replace(/[^a-z]/g, '-')}.png`, '3', '560', ...list]);
console.log(fs.readdirSync(out).filter(f => f.startsWith('cmp-')).join('\n'));
