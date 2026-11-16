// The crowd's movement, frame by frame: a crop of the hero's lower part every STEP ms (default 80), so the groove can
// be judged for amplitude, rhythm and naturalness. usage: [SIZE=1440x900] [STEP=80] node scripts/visual/hero-motion.mjs <sheet.jpg>
import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const [width, height] = (process.env.SIZE || '1440x900').split('x').map(Number);
const step = Number(process.env.STEP || 80);
const mobile = width <= 700;
const browser = await chromium.launch();
const page = await (await browser.newContext({viewport: {width, height}, ...(mobile ? {hasTouch: true, isMobile: true} : {})})).newPage();
await page.goto(process.env.BASE_URL || 'http://localhost:3000');
await page.keyboard.press('Shift');
await page.waitForTimeout(2500);
const top = Math.round(height * (mobile ? 0.55 : 0.6)), crop = {x: 0, y: top, width, height: height - top};
const shots = [];
for (let i = 0; i < 12; i++) {shots.push(await page.screenshot({clip: crop})); await page.waitForTimeout(step);}
const tw = mobile ? 390 : 720, th = Math.round(tw * crop.height / width);
const tiles = await Promise.all(shots.map(b => sharp(b).resize(tw, th).toBuffer()));
await sharp({create: {width: tw * 3, height: th * 4, channels: 3, background: '#000'}}).composite(tiles.map((input, i) => ({input, left: (i % 3) * tw, top: Math.floor(i / 3) * th}))).jpeg({quality: 86}).toFile(process.argv[2]);
await browser.close();
console.log('wrote', process.argv[2]);
