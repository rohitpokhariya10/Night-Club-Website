import {test, expect, type Page} from '@playwright/test';

/** Midnight Ember and the audit fixes (PREMIUM-NIGHTCLUB-VISUAL-IDENTITY-REPORT.md). */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', error => list.push(error.message));
  page.on('console', message => {if (message.type() === 'error') list.push(message.text());});
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

const HEADER = [['Menu', '/food-menu'], ['Drinks', '/drink-menu'], ['Nightlife', '/nightlife'], ['Events', '/events'], ['Specials', '/specials'], ['Parties', '/private-parties'], ['Gallery', '/gallery'], ['About', '/about'], ['Contact', '/contact']];

/** WCAG contrast between two computed rgb() colours, in the page. */
const contrast = (page: Page, selector: string) => page.locator(selector).first().evaluate(el => {
  const parse = (c: string) => c.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const lum = ([r, g, b]: number[]) => [r, g, b].map(v => {v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;}).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const style = getComputedStyle(el);
  const [a, b] = [lum(parse(style.color)), lum(parse(style.backgroundColor))].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
});

test('the header bar carries the nine priority destinations on one line, with room to spare, at every desktop width', async ({page}) => {
  for (const width of [1100, 1180, 1280, 1366, 1440, 1728, 1920]) {
    await page.setViewportSize({width, height: 900});
    await page.goto('/gallery');
    const nav = page.getByRole('navigation', {name: 'Main navigation'});
    await expect(nav).toBeVisible();
    expect(await nav.getByRole('link').evaluateAll(as => as.map(a => [a.textContent?.trim(), a.getAttribute('href')]))).toEqual(HEADER);
    const m = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.header nav a')].map(a => a.getBoundingClientRect());
      const n = document.querySelector('.header nav')!.getBoundingClientRect();
      return {
        oneLine: links.every(r => Math.abs(r.top - links[0].top) < 2),
        left: n.left - document.querySelector('.header .logo')!.getBoundingClientRect().right,
        right: document.querySelector('.header-book')!.getBoundingClientRect().left - n.right,
        font: parseFloat(getComputedStyle(document.querySelector('.header nav a')!).fontSize),
      };
    });
    expect(m.oneLine, `${width}px`).toBe(true);
    expect(Math.min(m.left, m.right), `${width}px: space beside the bar`).toBeGreaterThanOrEqual(40);
    expect(m.font, `${width}px: readable link size`).toBeGreaterThanOrEqual(11);
  }
  // Narrower: the menu button carries every page, and the full menu still lists all twelve.
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/');
  await expect(page.getByRole('navigation', {name: 'Main navigation'})).toBeHidden();
  await page.getByRole('button', {name: 'Open navigation'}).click();
  await expect(page.getByRole('dialog', {name: 'Site navigation'}).getByRole('link')).toHaveCount(12);
});

test('the gallery burst stays inside its own section through the whole settle (no card reaches into Celebrations or the reviews)', async ({page}) => {
  for (const [width, height] of [[1440, 900], [1920, 1080], [1024, 768], [768, 1024]]) {
    await page.setViewportSize({width, height});
    await page.goto('/');
    await page.keyboard.press('Shift');
    await expect(page.locator('.home-gallery')).toHaveAttribute('data-motion', 'ready');
    const ringTop = await page.locator('.lens-ring').evaluate(el => el.getBoundingClientRect().top + scrollY);
    const ringHeight = await page.locator('.lens-ring').evaluate(el => el.getBoundingClientRect().height);
    for (let k = 0; k <= 8; k++) {
      await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(ringTop - height + (k / 8) * (height * 0.5 + ringHeight / 2)));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const outside = await page.evaluate(() => {
        const s = document.querySelector('.home-gallery')!.getBoundingClientRect();
        const cards = [...document.querySelectorAll('.lens-card-inner')].map(el => el.getBoundingClientRect());
        return Math.max(s.top - Math.min(...cards.map(c => c.top)), Math.max(...cards.map(c => c.bottom)) - s.bottom);
      });
      expect(outside, `${width}×${height}, step ${k}`).toBeLessThanOrEqual(0);
    }
  }
});

test('Midnight Ember: ember is the action colour with an AA label, champagne carries the labels, and every eyebrow is one style', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.keyboard.press('Shift');
  const action = page.locator('.celebrations .button').first();
  await expect(action).toHaveCSS('background-color', 'rgb(194, 65, 46)');
  expect(await contrast(page, '.celebrations .button:not(.outline)')).toBeGreaterThanOrEqual(4.5);
  // Every eyebrow on the homepage shares font, size, weight, tracking and colour.
  const eyebrows = await page.locator('main :is(.script, .eyebrow, .ns-eyebrow, .night-out-eyebrow, .fd-eyebrow, .sig-pill, .lens-eyebrow)').evaluateAll(els => els.map(el => {
    const s = getComputedStyle(el);
    return [s.fontFamily.split(',')[0], s.fontSize, s.fontWeight, s.letterSpacing, s.color, s.textTransform].join(' ');
  }));
  expect(eyebrows.length).toBeGreaterThanOrEqual(8);
  expect(new Set(eyebrows).size, eyebrows.join('\n')).toBe(1);
  expect(eyebrows[0]).toContain('rgb(227, 199, 162)');
  // The night-out label no longer carries a number with no sequence behind it.
  await expect(page.locator('.night-out-index')).toHaveText('');
});

test('the hero keeps the headline clear: no connector lines or captions around it, and the headline and supporting copy lead', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
  await expect(page.locator('.hero-lines')).toHaveCount(0);
  await expect(page.locator('.hero-chip')).toHaveCount(0); // the scene (HERO-NIGHTCLUB-REBUILD-REPORT.md) carries the atmosphere instead
  await expect(page.locator('.cinema-copy h1')).toHaveCSS('opacity', '1');
  await expect(page.locator('.hero-orb, .hero-eyebrow')).toHaveCount(0);
  await expect(page.locator('.header .logo')).toBeVisible();
});

test('photography: internal page intros show the venue (lighter photo, shade only where the text sits)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  for (const path of ['/gallery', '/reservations', '/nightlife']) {
    await page.goto(path);
    await expect(page.locator('.page-intro > .photo img')).toHaveCSS('filter', 'brightness(0.82)');
  }
});
