// Visual-identity evidence: what a visitor sees, section by section, at each size. Each homepage section is brought to
// the top of the viewport (hero intro skipped, reveals given time to finish) and captured; the navigation menu is
// captured open; internal pages are captured at the top. A contact sheet per size makes review quick.
// THEME=<file.css> injects a stylesheet after load (theme previews: nothing in the project changes).
// usage: [BASE_URL=…] [THEME=…] [SIZES=1440x900,390x844] [PAGES=0|1] [SECTIONS=hero,food,…] node scripts/visual/capture.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const theme = process.env.THEME ? fs.readFileSync(process.env.THEME, 'utf8') : '';
const sizes = (process.env.SIZES || '360x800,390x844,768x1024,1024x768,1440x900,1728x1117,1920x1080').split(',').map(s => s.split('x').map(Number));
const ALL = [
  ['hero', '.cinema-hero'], ['strings', '#experience'], ['strings-cards', '#experience .ns-stage'], ['night-out', '#discover'],
  ['nightlife', '.split-feature'], ['food', '.fd'], ['signature', '.sig'], ['specials', '.special-feature'], ['events', '.home-events'],
  ['celebrations', '.celebrations'], ['gallery', '.home-gallery'], ['reviews', '.review-section'], ['visit', '.visit'], ['footer', '.footer'],
];
const only = process.env.SECTIONS?.split(',');
const sections = only ? ALL.filter(([name]) => only.includes(name)) : ALL;
const PAGES = ['/nightlife', '/food-menu', '/drink-menu', '/events', '/specials', '/gallery', '/reservations', '/private-parties', '/about', '/contact'];
const browser = await chromium.launch();
const errors = [];
const style = async page => {if (theme) await page.addStyleTag({content: theme});};
for (const [width, height] of sizes) {
  const mobile = width <= 700;
  const context = await browser.newContext({viewport: {width, height}, ...(mobile ? {hasTouch: true, isMobile: true} : {})});
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${width}: ${e.message}`));
  await page.goto(base); await style(page);
  await page.keyboard.press('Shift'); // skip the hero intro (it still plays on a real first visit)
  await page.locator('.cinema-hero[data-ambient="running"]').waitFor({timeout: 20000});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const shots = [];
  for (const [name, selector] of sections) {
    const el = page.locator(selector).first();
    if (!(await el.count())) continue;
    const top = await el.evaluate(e => e.getBoundingClientRect().top + scrollY);
    // The footer is shorter than the viewport: show it resting at the bottom of the page.
    const y = name === 'footer' ? 1e7 : name === 'hero' ? 0 : Math.max(0, Math.round(top - (name === 'strings-cards' ? 40 : 0)));
    await page.evaluate(v => window.scrollTo({top: v, behavior: 'instant'}), y);
    await page.waitForTimeout(name === 'hero' ? 400 : 2200);
    const file = `${out}/${width}-${name}.png`;
    await page.screenshot({path: file});
    shots.push([name, file]);
  }
  // Navigation: the menu open.
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  const toggle = page.locator('.menu-toggle');
  if (await toggle.isVisible()) {
    await toggle.click(); await page.waitForTimeout(900);
    const file = `${out}/${width}-menu.png`; await page.screenshot({path: file}); shots.push(['menu', file]);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
  if (process.env.PAGES === '1') for (const path of PAGES) {
    await page.goto(base + path); await style(page); await page.waitForTimeout(1400);
    const file = `${out}/${width}-page${path.replace(/\//g, '-')}.png`; await page.screenshot({path: file}); shots.push([path, file]);
  }
  await context.close();
  // Contact sheet: four across.
  const tw = 480, th = Math.round(tw * height / width), cols = 4, rows = Math.ceil(shots.length / cols);
  const tiles = await Promise.all(shots.map(([, f]) => sharp(f).resize(tw, th).toBuffer()));
  await sharp({create: {width: cols * tw, height: rows * th, channels: 3, background: '#000'}})
    .composite(tiles.map((input, i) => ({input, left: (i % cols) * tw, top: Math.floor(i / cols) * th}))).jpeg({quality: 82}).toFile(`${out}/sheet-${width}x${height}.jpg`);
  console.log(`${width}x${height}: ${shots.length} captures`);
}
await browser.close();
console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
