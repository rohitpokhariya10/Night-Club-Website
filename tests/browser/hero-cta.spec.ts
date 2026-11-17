import {test, expect, type Page} from '@playwright/test';

/**
 * Booking from the homepage hero. The hero itself carries no button: it ends with its supporting copy, so the headline,
 * crowd and lighting lead. Booking is the header's Book a Table, on every page: solid ember (--button) with a white
 * label and arrow, a deeper ember on hover and focus, a clear focus ring, and a button that never moves (the arrow
 * alone nudges north-east), so the pointer can never slip off it.
 */
const book = (page: Page) => page.locator('.header-book');
const EMBER = 'rgb(194, 65, 46)', DEEPER = 'rgb(169, 55, 42)';

async function open(page: Page, width: number, height: number) {
  await page.setViewportSize({width, height});
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
}

for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [390, 844], [375, 812]]) {
  test(`the hero ends with its copy and the header's ember Book a Table works at ${width}px`, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await open(page, width, height);
    await expect(page.locator('h1')).toHaveText('DEL MAR. TURN IT UP.');
    await expect(page.locator('.hero-description')).toHaveText('Come for the drinks. Stay for the music. Make the night yours.');
    await expect(page.locator('.cinema-hero a[href="/reservations"], .hero-cta, .cinema-copy .button, .cinema-copy .actions')).toHaveCount(0);
    const [header, heading, description] = await Promise.all([page.locator('.header').boundingBox(), page.locator('h1').boundingBox(), page.locator('.hero-description').boundingBox()]);
    expect(heading!.y).toBeGreaterThan(header!.y + header!.height + 24);
    expect(description!.y).toBeGreaterThan(heading!.y + heading!.height);
    expect(description!.y + description!.height).toBeLessThan(height * 0.68);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(book(page)).toBeVisible();
    await expect(book(page)).toHaveText('Book a Table');
    await expect(book(page)).toHaveAttribute('href', '/reservations');
    await expect(book(page)).toHaveCSS('background-color', EMBER);
    await expect(book(page)).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(book(page).locator('.arw')).toHaveCSS('color', 'rgb(255, 255, 255)');
    expect((await book(page).boundingBox())!.height, 'touch target').toBeGreaterThanOrEqual(44);
    await book(page).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/reservations');
    await expect(book(page)).toBeFocused();
    await expect(book(page)).toHaveCSS('background-color', DEEPER); // persistent header keeps keyboard focus
    await page.keyboard.press('Tab');
    await expect(book(page)).toHaveCSS('background-color', EMBER);
    expect(errors).toEqual([]);
  });
}

test('hover deepens the ember and nudges the arrow while the button stays exactly where it is', async ({page}) => {
  await open(page, 1440, 900);
  const rest = (await book(page).boundingBox())!;
  await page.mouse.move(rest.x + rest.width / 2, rest.y - 4);
  await page.mouse.move(rest.x + rest.width / 2, rest.y + 2, {steps: 2});
  const samples = await page.evaluate(async ({x, y}) => {
    const el = document.querySelector('.header-book')!, out: {hit: boolean; top: number; left: number}[] = [];
    for (let i = 0; i < 30; i++) {
      const r = el.getBoundingClientRect();
      out.push({hit: el.contains(document.elementFromPoint(x, y)), top: r.top, left: r.left});
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return out;
  }, {x: rest.x + rest.width / 2, y: rest.y + 2});
  expect(samples.every(s => s.hit), 'the pointer stays on the button through the whole transition').toBe(true);
  expect(samples.every(s => Math.abs(s.top - rest.y) < 0.01 && Math.abs(s.left - rest.x) < 0.01)).toBe(true);
  await expect(book(page)).toHaveCSS('background-color', DEEPER);
  await expect(book(page)).toHaveCSS('transform', 'none');
  await expect.poll(() => book(page).locator('.arw').evaluate(el => getComputedStyle(el).translate)).toBe('4px -4px');
  await expect(book(page)).toHaveCSS('animation-name', 'none');
  await page.mouse.down(); await page.mouse.up();
  await expect(page).toHaveURL('/reservations');
});

test('keyboard focus shows a solid ring and the deeper ember', async ({page}) => {
  await open(page, 1440, 900);
  await page.locator('.header a').first().focus();
  for (let i = 0; i < 20 && !(await book(page).evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(book(page)).toBeFocused();
  await expect(book(page)).toHaveCSS('outline-style', 'solid');
  await expect(book(page)).toHaveCSS('outline-width', '2px');
  await expect(book(page)).toHaveCSS('background-color', DEEPER);
});

test('the white label keeps AA contrast on both the ember and the deeper hover ember', async ({page}) => {
  await open(page, 1440, 900);
  const ratio = (fill: number[]) => {
    const lum = (c: number[]) => c.map(v => {v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;}).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    return 1.05 / (lum(fill) + 0.05);
  };
  expect(ratio([194, 65, 46])).toBeGreaterThanOrEqual(4.5);
  expect(ratio([169, 55, 42])).toBeGreaterThanOrEqual(4.5);
  await expect(book(page)).toHaveCSS('font-size', '11px');
});

test('reduced motion: no hero button, the ember button still changes colour, and its arrow never moves', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await expect(page.locator('.cinema-hero')).not.toHaveAttribute('data-ambient');
  await expect(page.locator('.cinema-hero a[href="/reservations"]')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
  await expect(book(page)).toHaveCSS('background-color', EMBER);
  await expect(book(page)).toHaveCSS('transition-duration', '0s');
  await book(page).hover();
  await expect(book(page)).toHaveCSS('background-color', DEEPER);
  await expect(book(page).locator('.arw')).toHaveCSS('translate', 'none');
});
