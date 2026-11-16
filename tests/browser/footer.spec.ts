import {test, expect, type Page} from '@playwright/test';

/** The compact site footer (PREMIUM-FOOTER-REDESIGN-REPORT.md). */
const messages = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const errors: string[] = [];
  messages.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
});
test.afterEach(async ({page}) => expect(messages.get(page)).toEqual([]));

const DIRECTIONS = 'https://www.google.com/maps/search/?api=1&query=Jimmy+O%27s+225+15th+Street+Del+Mar';
/** Footer links, in focus order. */
const LINKS: [string | RegExp, string][] = [
  ['Jimmy O’s Del Mar', '/'], ['225 15th Street, Del Mar, CA 92014', DIRECTIONS], ['(858) 350-3735', 'tel:+18583503735'],
  ['chelsea@jodelmar.com', 'mailto:chelsea@jodelmar.com'], ['Privacy Policy', '/privacy'], [/back to top/i, '#top'],
];
/** Routes the previous footer linked to: now in the header navigation and its menu only. */
const ROUTES = [['Menu', '/food-menu'], ['Drinks', '/drink-menu'], ['Specials', '/specials'], ['Events', '/events'], ['Catering', '/catering'], ['Jobs', '/jobs'], ['Parties', '/private-parties'], ['Gallery', '/gallery'], ['Nightlife', '/nightlife'], ['About', '/about'], ['Contact', '/contact'], ['Reservations', '/reservations']];

const footer = (page: Page) => page.locator('footer');
const toEnd = (page: Page) => page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
/** The reveal has finished: every part at rest. */
async function revealed(page: Page) {
  for (const selector of ['.ft-logo', '.ft-tagline', '.ft-item', '.ft-legal']) {
    for (const el of await page.locator(selector).all()) {
      await expect(el).toHaveCSS('opacity', '1');
      await expect(el).toHaveCSS('transform', 'none');
    }
  }
}

test('shows the verified essentials only: logo, tagline, address, phone, email and the legal row', async ({page}) => {
  for (const route of ['/', '/events']) {
    await page.goto(route);
    const links = await footer(page).locator('a').evaluateAll(as => as.map(a => [(a as HTMLElement).innerText.trim() || a.querySelector('img')?.alt || '', a.getAttribute('href')]));
    expect(links.map(([, href]) => href), route).toEqual(LINKS.map(([, href]) => href));
    for (const [name, href] of LINKS) await expect(footer(page).getByRole('link', {name, exact: typeof name === 'string'})).toHaveAttribute('href', href);
    const text = await footer(page).innerText();
    for (const fact of ['Coastal California by day.', 'Electric nightlife after dark.', `© ${new Date().getFullYear()} Jimmy O’s Del Mar`]) expect(text).toContain(fact);
    // Compact by design: no repeated navigation, no booking buttons, no hours table, no oversized heading.
    await expect(footer(page).locator('nav, .button, h1, h2, h3, dl')).toHaveCount(0);
    expect(text).not.toMatch(/Book a Table|Private Party|Tuesday|See you tonight/i);
    expect(links.filter(([, href]) => href?.includes('jimmyodelmar.com'))).toEqual([]);
    // The type system: Manrope throughout; the logo is the original image.
    for (const selector of ['.ft-tagline', '.ft-link', '.ft-label', '.ft-legal']) expect((await page.locator(selector).first().evaluate(el => getComputedStyle(el).fontFamily)).toLowerCase(), selector).toContain('manrope');
    await expect(footer(page).locator('.ft-logo img')).toHaveAttribute('src', /logo\.png/);
  }
});

test('nothing the footer used to carry is lost: every route is in the header, hours stay on Visit and Contact', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.getByRole('button', {name: 'Open navigation'}).click();
  const menu = page.getByRole('dialog', {name: 'Site navigation'});
  for (const [name, href] of ROUTES) await expect(menu.getByRole('link', {name: new RegExp(`^\\d{2}\\s*${name}$`, 'i')})).toHaveAttribute('href', href); // numbered: "01 Menu"
  await page.keyboard.press('Escape');
  // The homepage "Find your way here" section and the Contact page keep the hours, phone, email and booking.
  for (const [route, scope] of [['/', '#visit'], ['/contact', 'main']]) {
    await page.goto(route);
    const where = page.locator(scope);
    for (const fact of ['Monday', 'Closed', 'Tuesday – Thursday', '5 PM – 2 AM', 'Friday – Sunday', '12 PM – 2 AM', '(858) 350-3735', 'chelsea@jodelmar.com']) await expect(where, `${route} ${fact}`).toContainText(fact);
  }
  await page.goto('/');
  await expect(page.locator('#visit').getByRole('link', {name: /Book a Table/i})).toHaveAttribute('href', '/reservations');
});

for (const width of [360, 390, 768, 1024, 1440, 1920]) test(`compact and clean at ${width}px: height, overflow, overlaps, text size and targets`, async ({page}) => {
  const height = width <= 700 ? 844 : width >= 1920 ? 1080 : 900;
  await page.setViewportSize({width, height});
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await toEnd(page);
  await revealed(page);
  const report = await footer(page).evaluate(el => {
    const links = [...el.querySelectorAll('a')].map(a => ({name: (a as HTMLElement).innerText.trim() || a.getAttribute('href'), box: a.getBoundingClientRect()}));
    const overlaps: string[] = [];
    links.forEach((a, i) => links.slice(i + 1).forEach(b => {
      const x = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left), y = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
      if (x > 1 && y > 1) overlaps.push(`${a.name} × ${b.name}`);
    }));
    const text = [...el.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim()));
    return {
      height: Math.round(el.getBoundingClientRect().height),
      overflow: document.documentElement.scrollWidth > innerWidth,
      overlaps,
      tiny: text.filter(e => parseFloat(getComputedStyle(e).fontSize) < 11).map(e => e.textContent!.trim().slice(0, 20)),
      clipped: text.filter(e => {const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 || b.left < -1;}).map(e => e.textContent!.trim().slice(0, 20)),
      smallTargets: links.filter(l => l.box.height < 24).map(l => l.name),
    };
  });
  // Short by design: about 250–350 px on desktop (never a full-screen section); stacked naturally on phones.
  if (width >= 1024) expect(report.height).toBeLessThanOrEqual(350);
  else if (width > 700) expect(report.height).toBeLessThanOrEqual(320);
  else expect(report.height).toBeLessThanOrEqual(440);
  expect(report.overflow).toBe(false);
  expect(report.overlaps).toEqual([]);
  expect(report.tiny).toEqual([]);
  expect(report.clipped).toEqual([]);
  expect(report.smallTargets).toEqual([]); // WCAG 2.5.8: targets at least 24 px tall
  await footer(page).screenshot({path: `artifacts/footer-redesign/after/footer-${width}.png`, style: 'nextjs-portal{display:none!important}'});
  await page.screenshot({path: `artifacts/footer-redesign/after/viewport-${width}.png`, style: 'nextjs-portal{display:none!important}'});
});

test('links work, and Back to top scrolls smoothly to the top', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/about');
  await toEnd(page);
  await footer(page).getByRole('link', {name: 'Privacy Policy'}).click();
  await expect(page).toHaveURL('/privacy');
  await footer(page).getByRole('link', {name: 'Jimmy O’s Del Mar'}).click();
  await expect(page).toHaveURL('/');
  await expect(footer(page)).toHaveAttribute('data-motion', 'ready');
  await toEnd(page);
  const start = await page.evaluate(() => scrollY);
  expect(start).toBeGreaterThan(2000);
  await footer(page).getByRole('link', {name: /back to top/i}).click();
  // Smooth, not a jump: part-way up shortly after the click, then at the top.
  await page.waitForTimeout(250);
  const during = await page.evaluate(() => scrollY);
  expect(during).toBeGreaterThan(5);
  expect(during).toBeLessThan(start);
  await expect.poll(() => page.evaluate(() => scrollY), {timeout: 6000}).toBeLessThan(5);
});

test('keyboard: every link is reachable in reading order, with a visible focus ring, and focus completes the reveal', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/events');
  await expect(footer(page)).toHaveAttribute('data-motion', 'ready');
  await toEnd(page);
  await footer(page).locator('a').first().focus();
  await revealed(page);
  const order: string[] = [];
  for (let i = 0; i < LINKS.length + 2; i++) {
    const name = await page.evaluate(() => {const a = document.activeElement as HTMLElement; return a?.closest('footer') ? (a.innerText.trim() || a.querySelector('img')?.alt || '') : null;});
    if (name === null) break;
    order.push(name);
    await expect(page.locator(':focus')).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Tab');
  }
  expect(order.length).toBe(LINKS.length);
  order.forEach((name, i) => typeof LINKS[i][0] === 'string' ? expect(name).toBe(LINKS[i][0]) : expect(name).toMatch(LINKS[i][0]));
});

test('a subtle, once-only reveal: logo first, then the contact details; nothing hidden afterwards', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/gallery');
  await expect(footer(page)).toHaveAttribute('data-motion', 'ready');
  await toEnd(page);
  // Early in the reveal: the logo leads, the last contact item follows.
  await page.waitForTimeout(120);
  const [logo, email] = await Promise.all(['.ft-logo', '.ft-item >> nth=2'].map(s => page.locator(s).evaluate(el => Number(getComputedStyle(el).opacity))));
  expect(logo).toBeGreaterThan(email);
  await revealed(page);
  // Once only: scrolling away and back does not hide it again.
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await toEnd(page);
  await revealed(page);
});

test('reduced motion and no JavaScript show the complete footer at once', async ({page, browser}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await toEnd(page);
  await revealed(page);
  await expect(footer(page)).not.toHaveAttribute('data-motion', 'ready');
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
  const nojs = await context.newPage();
  await nojs.goto('/');
  await nojs.locator('footer').scrollIntoViewIfNeeded();
  for (const [name, href] of LINKS) await expect(nojs.locator('footer').getByRole('link', {name, exact: typeof name === 'string'})).toHaveAttribute('href', href);
  for (const el of await nojs.locator('.ft-item').all()) await expect(el).toBeVisible();
  await context.close();
});
