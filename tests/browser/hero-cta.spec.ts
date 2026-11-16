import {test, expect, type Page} from '@playwright/test';

/**
 * Hero actions: EXPLORE NIGHTLIFE (primary, ember) and BOOK A TABLE (secondary, smoked glass with a champagne hairline).
 * One row from phone to desktop with comfortable touch targets, a soft ember light spill under the primary that rises on
 * hover and keyboard focus, a pressed state, AA labels, and no lift when the visitor prefers reduced motion.
 */
const primary = (page: Page) => page.locator('.cinema-copy .button:not(.outline)');
const secondary = (page: Page) => page.locator('.cinema-copy .button.outline');
const shadow = (page: Page, which: 'primary' | 'secondary') => (which === 'primary' ? primary(page) : secondary(page)).evaluate(el => getComputedStyle(el).boxShadow);
/** Sum of the blur radii and spreads of the outer shadows: a single number for "how much light spills". */
const spill = (boxShadow: string) => boxShadow.split(/,(?![^(]*\))/).filter(s => !s.includes('inset'))
  .map(s => s.replace(/rgba?\([^)]*\)|color\([^)]*\)/g, '').trim().split(/\s+/).map(parseFloat))
  .reduce((sum, [, , blur = 0, spread = 0]) => sum + blur + spread, 0);

async function open(page: Page, width: number, height: number) {
  await page.setViewportSize({width, height});
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
}

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [375, 667]]) {
  test(`both hero actions sit on one clean row with comfortable targets and readable labels at ${width}px`, async ({page}) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await open(page, width, height);
    await expect(primary(page)).toHaveText('EXPLORE NIGHTLIFE');
    await expect(secondary(page)).toHaveText('BOOK A TABLE');
    const [a, b] = await Promise.all([primary(page).boundingBox(), secondary(page).boundingBox()]);
    expect(Math.abs(a!.y - b!.y), 'same row').toBeLessThan(1);
    expect(b!.x - (a!.x + a!.width), 'a clear gap between them').toBeGreaterThanOrEqual(width < 700 ? 10 : 14);
    expect(Math.min(a!.height, b!.height), 'touch target').toBeGreaterThanOrEqual(width < 700 ? 48 : 54);
    expect(a!.x).toBeGreaterThanOrEqual(0); expect(b!.x + b!.width).toBeLessThanOrEqual(width);
    const label = await primary(page).evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(label).toBeGreaterThanOrEqual(width < 700 ? 9.5 : 11);
    // Label and arrow share one centre line.
    const centres = await page.locator('.cinema-copy .button').evaluateAll(els => els.map(el => {
      const range = document.createRange(); range.selectNodeContents(el.firstChild!);
      const text = range.getBoundingClientRect(), icon = el.querySelector('svg')!.getBoundingClientRect();
      return Math.abs((text.top + text.bottom) / 2 - (icon.top + icon.bottom) / 2);
    }));
    for (const offset of centres) expect(offset).toBeLessThan(2.5);
    expect(errors).toEqual([]);
  });
}

test('the primary carries a soft ember light spill that rises on hover and settles when pressed; the secondary answers in champagne', async ({page}) => {
  await open(page, 1440, 900);
  await expect(primary(page)).toHaveCSS('background-color', 'rgb(194, 65, 46)');
  const rest = await shadow(page, 'primary');
  expect(spill(rest), 'a light spill at rest').toBeGreaterThan(20);
  await primary(page).hover();
  await expect.poll(async () => spill(await shadow(page, 'primary'))).toBeGreaterThan(spill(rest) + 20);
  await expect(primary(page)).toHaveCSS('translate', '0px -2px');
  const hovered = spill(await shadow(page, 'primary'));
  await page.mouse.down();
  await expect.poll(async () => spill(await shadow(page, 'primary')), 'pressing settles the light').toBeLessThan(hovered);
  await expect(primary(page)).toHaveCSS('translate', '0px');
  await page.mouse.up();
  const secondaryRest = await secondary(page).evaluate(el => getComputedStyle(el).borderTopColor);
  const secondaryGlow = spill(await shadow(page, 'secondary'));
  await secondary(page).hover();
  await expect.poll(() => secondary(page).evaluate(el => getComputedStyle(el).borderTopColor)).not.toBe(secondaryRest);
  await expect.poll(async () => spill(await shadow(page, 'secondary'))).toBeGreaterThan(secondaryGlow + 10);
});

test('keyboard focus shows a clear ring and the same light response as hover', async ({page}) => {
  await open(page, 1440, 900);
  const rest = spill(await shadow(page, 'primary'));
  await page.locator('.header-book').focus();
  for (let i = 0; i < 40 && !(await primary(page).evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(primary(page)).toBeFocused();
  await expect(primary(page)).toHaveCSS('outline-style', 'solid');
  await expect(primary(page)).toHaveCSS('outline-width', '2px');
  await expect.poll(async () => spill(await shadow(page, 'primary'))).toBeGreaterThan(rest + 20);
  await page.keyboard.press('Tab');
  await expect(secondary(page)).toBeFocused();
  await expect(secondary(page)).toHaveCSS('outline-style', 'solid');
});

test('both labels keep AA contrast against their fills', async ({page}) => {
  await open(page, 1440, 900);
  const ratios = await page.locator('.cinema-copy .button').evaluateAll(els => els.map(el => {
    const rgb = (c: string) => c.match(/[\d.]+/g)!.map(Number);
    const lum = ([r, g, b]: number[]) => [r, g, b].map(v => {v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;}).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const s = getComputedStyle(el), fg = rgb(s.color), bg = rgb(s.backgroundColor);
    // A translucent fill sits over the near-black room (the hero's darkest tone), as on screen.
    const a = bg[3] ?? 1, room = [9, 11, 13], fill = bg.slice(0, 3).map((v, i) => v * a + room[i] * (1 - a));
    const [l1, l2] = [lum(fg), lum(fill)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  }));
  for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test('with reduced motion the actions do not lift, and the light response still marks the hovered action', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await expect(primary(page)).toBeVisible();
  const rest = spill(await shadow(page, 'primary'));
  await primary(page).hover();
  await expect(primary(page)).toHaveCSS('translate', 'none');
  expect(spill(await shadow(page, 'primary'))).toBeGreaterThan(rest + 20);
});
