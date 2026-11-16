import {test, expect, type Page} from '@playwright/test';

/**
 * The hero's one booking action (final hero refinement): Book a Table ↗, smoked charcoal with a champagne hairline,
 * below the supporting copy, going to the existing reservations page. The header keeps its own Book a Table link.
 * Hover, focus and press change only the inner light, border tone and arrow: the anchor never moves, so the pointer
 * can never fall off its own target (the earlier flicker). Its border catches the real beams, never a looping shimmer.
 */
const cta = (page: Page) => page.locator('.cinema-copy .hero-cta');

async function open(page: Page, width: number, height: number) {
  await page.setViewportSize({width, height});
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
}

for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [390, 844], [375, 812]]) {
  test(`one booking action under the copy, a comfortable target, and the header link intact at ${width}px`, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await open(page, width, height);
    await expect(page.locator('h1')).toHaveText('DEL MAR. TURN IT UP.');
    await expect(page.locator('.hero-description')).toHaveText('Come for the drinks. Stay for the music. Make the night yours.');
    await expect(page.locator('.cinema-hero a[href="/reservations"]')).toHaveCount(1);
    await expect(cta(page)).toHaveText('Book a Table');
    await expect(page.locator('.header').getByRole('link', {name: 'Book a Table', exact: true})).toHaveCount(1);
    await expect(page.locator('.cinema-hero').getByRole('link', {name: 'Book a Table', exact: true})).toHaveCount(1);
    await expect(cta(page).locator('svg.arw[data-arrow="up-right"]')).toHaveCount(1);
    await expect(cta(page)).toHaveAttribute('href', '/reservations');
    const [heading, description, action, header] = await Promise.all([page.locator('h1').boundingBox(), page.locator('.hero-description').boundingBox(), cta(page).boundingBox(), page.locator('.header').boundingBox()]);
    expect(heading!.y).toBeGreaterThan(header!.y + header!.height + 16);
    expect(action!.y).toBeGreaterThan(description!.y + description!.height + 12);
    expect(action!.y + action!.height).toBeLessThan(height * 0.72);
    expect(Math.abs(action!.x + action!.width / 2 - width / 2), 'centred under the copy').toBeLessThan(2);
    expect(action!.height, 'touch target').toBeGreaterThanOrEqual(width < 700 ? 48 : 54);
    expect(action!.width).toBeGreaterThanOrEqual(170);
    expect(await cta(page).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(11);
    // The label and its arrow share one centre line.
    const offset = await cta(page).evaluate(el => {
      const label = el.querySelector('.hero-cta-label')!.getBoundingClientRect(), icon = el.querySelector('svg')!.getBoundingClientRect();
      return Math.abs((label.top + label.bottom) / 2 - (icon.top + icon.bottom) / 2);
    });
    expect(offset).toBeLessThan(2.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('.header-book')).toBeVisible();
    await expect(page.locator('.header-book')).toHaveAttribute('href', '/reservations');
    await cta(page).click();
    await expect(page).toHaveURL('/reservations');
    expect(errors).toEqual([]);
  });
}

test('hover and press never move the target: no flicker, only the light, border and arrow respond', async ({page}) => {
  await open(page, 1440, 900);
  const rest = (await cta(page).boundingBox())!;
  const border = await cta(page).evaluate(el => getComputedStyle(el).borderTopColor);
  const glow = () => cta(page).evaluate(el => Number(getComputedStyle(el.querySelector('.hero-cta-light')!, '::after').opacity));
  expect(await glow()).toBe(0);
  // Enter from just above the top edge (where a moving button would slip away), then sample through the transition.
  await page.mouse.move(rest.x + rest.width / 2, rest.y - 6);
  await page.mouse.move(rest.x + rest.width / 2, rest.y + 3, {steps: 3});
  const samples = await page.evaluate(async ({x, y}) => {
    const el = document.querySelector('.hero-cta')!, out: {hit: boolean; top: number; height: number}[] = [];
    for (let i = 0; i < 40; i++) {
      const r = el.getBoundingClientRect();
      out.push({hit: el.contains(document.elementFromPoint(x, y)), top: r.top, height: r.height});
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return out;
  }, {x: rest.x + rest.width / 2, y: rest.y + 3});
  expect(samples.every(s => s.hit), 'the pointer stays on the target through the whole hover transition').toBe(true);
  expect(samples.every(s => Math.abs(s.top - rest.y) < 0.01 && Math.abs(s.height - rest.height) < 0.01)).toBe(true);
  await expect.poll(glow).toBeGreaterThan(0.95);
  await expect.poll(() => cta(page).evaluate(el => getComputedStyle(el).borderTopColor)).not.toBe(border);
  await expect.poll(() => cta(page).locator('.arw').evaluate(el => getComputedStyle(el).translate)).toBe('4px -4px');
  expect(await cta(page).evaluate(el => getComputedStyle(el).transform)).toBe('none');
  await page.mouse.down();
  expect((await cta(page).boundingBox())!.y).toBeCloseTo(rest.y, 2);
  await expect.poll(glow).toBeLessThan(0.7);
  await page.mouse.up();
  await expect(page).toHaveURL('/reservations');
});

test('keyboard focus shows a clear ring and the same light response as hover', async ({page}) => {
  await open(page, 1440, 900);
  await page.locator('.header-book').focus();
  for (let i = 0; i < 40 && !(await cta(page).evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(cta(page)).toBeFocused();
  await expect(cta(page)).toHaveCSS('outline-style', 'solid');
  await expect(cta(page)).toHaveCSS('outline-width', '2px');
  await expect.poll(() => cta(page).evaluate(el => Number(getComputedStyle(el.querySelector('.hero-cta-light')!, '::after').opacity))).toBeGreaterThan(0.95);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/reservations');
});

test('the label keeps AA contrast against the smoked fill', async ({page}) => {
  await open(page, 1440, 900);
  const ratio = await cta(page).evaluate(el => {
    const rgb = (c: string) => c.match(/[\d.]+/g)!.map(Number);
    const lum = ([r, g, b]: number[]) => [r, g, b].map(v => {v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;}).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    // The fill's lightest stop (its top), composited over the brightest the room gets behind it (a warm beam).
    const top = rgb(getComputedStyle(el).backgroundImage.match(/rgba?\([^)]*\)/)![0]);
    const a = top[3] ?? 1, room = [120, 80, 56], fill = top.slice(0, 3).map((v, i) => v * a + room[i] * (1 - a));
    const [l1, l2] = [lum(rgb(getComputedStyle(el).color)), lum(fill)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(7);
});

test('the border catches the passing beams (bounded, from the real geometry) and never runs its own loop', async ({page}) => {
  test.setTimeout(45000);
  await open(page, 1440, 900);
  await expect(cta(page)).toHaveCSS('animation-name', 'none');
  const values = await page.evaluate(async () => {
    const el = document.querySelector<HTMLElement>('.hero-cta')!, out: number[] = [];
    const start = performance.now();
    while (performance.now() - start < 26000) {out.push(Number(el.style.getPropertyValue('--cta-g')) || 0); await new Promise(r => setTimeout(r, 100));}
    return out;
  });
  expect(values.every(v => v >= 0 && v <= 1)).toBe(true);
  expect(Math.max(...values), 'a beam crosses the button now and then').toBeGreaterThan(0.3);
  expect(values.filter(v => v < 0.05).length / values.length, 'mostly unlit: a catch, not a glow').toBeGreaterThan(0.55);
  // Covered or paused, the catch holds still with the beams.
  await page.evaluate(() => scrollTo({top: innerHeight * 2.2, behavior: 'instant'}));
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'paused');
  const held = await cta(page).evaluate(el => el.style.getPropertyValue('--cta-g'));
  await page.waitForTimeout(500);
  expect(await cta(page).evaluate(el => el.style.getPropertyValue('--cta-g'))).toBe(held);
});

test('reduced motion: the action is present and still, with no spotlight catch and no transitions', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await expect(page.locator('.cinema-hero')).not.toHaveAttribute('data-ambient');
  await expect(page.locator('.hero-skip')).toBeHidden();
  await expect(cta(page)).toBeVisible();
  await expect(cta(page)).toHaveCSS('opacity', '1');
  await expect(cta(page)).toHaveCSS('transition-duration', '0s');
  expect(await cta(page).evaluate(el => el.style.getPropertyValue('--cta-g'))).toBe('');
  await cta(page).hover();
  await expect(cta(page).locator('.arw')).toHaveCSS('translate', 'none');
  await expect(page.locator('.header-book')).toBeVisible();
});
