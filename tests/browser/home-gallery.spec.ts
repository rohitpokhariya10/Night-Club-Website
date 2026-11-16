import {test, expect, type Page, type Locator} from '@playwright/test';

/**
 * Homepage gallery ring (GALLERY-REFERENCE-MOTION.md, GALLERY-TYPOGRAPHY-REDESIGN-REPORT.md).
 * Replaces the collage suite, whose pixel baseline described the retired four-photo grid. The intents are
 * kept: complete composition, scrubbed entrance that reverses, fast jumps, hover, reduced motion, no-JS,
 * touch and viewer focus, plus the ring's own rules (title always clear of the cards, orbit direction).
 */
const messages = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const errors: string[] = [];
  messages.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
});
test.afterEach(async ({page}) => expect(messages.get(page)).toEqual([]));

const ORDER = [
  'Dancing at Jimmy O’s', 'A little something from the bar', 'A reason to celebrate', 'A night in good company',
  'Loaded nachos to share', 'Settle into the lounge', 'A lively night at the bar', 'Our spot on 15th Street',
];

/** Scrubbed state is applied by ScrollTrigger on the next animation frames after a scroll; wait for them. */
const frames = (page: Page) => page.evaluate(() => new Promise<void>(done => {let n = 0; const step = () => (++n > 3 ? done() : requestAnimationFrame(step)); requestAnimationFrame(step);}));
/** Places `selector`'s top edge at `fraction` of the viewport height. */
async function position(page: Page, selector: string, fraction: number) {
  await page.locator(selector).evaluate((element, fraction) => {
    window.scrollTo({top: scrollY + element.getBoundingClientRect().top - innerHeight * fraction, behavior: 'instant'});
  }, fraction);
}
/** Places the ring's centre at `fraction` of the viewport height. */
async function ringAt(page: Page, fraction: number) {
  await page.locator('.lens-ring').evaluate((ring, fraction) => {
    const box = ring.getBoundingClientRect();
    // On phones the title sits above the stage, so centre the stage (the lower part of the ring).
    const stage = parseFloat(getComputedStyle(ring).paddingBottom) || box.height;
    window.scrollTo({top: scrollY + box.bottom - stage / 2 - innerHeight * fraction, behavior: 'instant'});
  }, fraction);
}
/** The burst/settle layer of a card: offset, scale, tilt and dimming at the current scroll position. */
const inner = (card: Locator) => card.locator('.lens-card-inner').evaluate(el => {
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return {x: m.e, y: m.f, scale: Math.hypot(m.a, m.b), rotation: Math.atan2(m.b, m.a) * 180 / Math.PI,
    shade: Number(getComputedStyle(el).getPropertyValue('--shade')) || 0, opacity: Number(getComputedStyle(el).opacity)};
});
const allInner = (page: Page) => page.locator('.lens-card').evaluateAll(cards => cards.map(card => {
  const el = card.querySelector('.lens-card-inner')!;
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return {scale: Math.hypot(m.a, m.b), rotation: Math.atan2(m.b, m.a) * 180 / Math.PI, shade: Number(getComputedStyle(el).getPropertyValue('--shade')) || 0};
}));
const identity = /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/;

/** Card rectangles relative to the ring, the ring's size, and the title parts. */
function ringLayout(page: Page) {
  return page.locator('.lens-ring').evaluate(ring => {
    const origin = ring.getBoundingClientRect();
    const box = (el: Element) => {const b = el.getBoundingClientRect(); return {x: Math.round(b.x - origin.x), y: Math.round(b.y - origin.y), width: Math.round(b.width), height: Math.round(b.height)};};
    return {
      ring: {width: Math.round(origin.width), height: Math.round(origin.height)},
      cards: [...ring.querySelectorAll('.lens-card')].map(box),
      eyebrow: box(ring.querySelector('.lens-eyebrow')!), heading: box(ring.querySelector('.lens-heading')!), cta: box(ring.querySelector('.lens-title .button')!),
    };
  });
}
/** Every card stays clear of the eyebrow, heading and call to action (the round phone button as a circle). */
function titleCollisions(page: Page) {
  return page.locator('.lens-ring').evaluate(ring => {
    const parts = ['.lens-eyebrow', '.lens-heading', '.lens-title .button'].map(s => ring.querySelector(s)!);
    const hits: string[] = [];
    for (const card of ring.querySelectorAll('.lens-card')) {
      const c = card.getBoundingClientRect();
      for (const part of parts) {
        const p = part.getBoundingClientRect();
        const overlapX = Math.min(c.right, p.right) - Math.max(c.left, p.left), overlapY = Math.min(c.bottom, p.bottom) - Math.max(c.top, p.top);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (getComputedStyle(part).borderRadius === '50%') {
          const r = p.width / 2, cx = p.left + r, cy = p.top + r;
          if (Math.hypot(Math.max(c.left - cx, 0, cx - c.right), Math.max(c.top - cy, 0, cy - c.bottom)) >= r) continue;
        }
        hits.push(`${card.getAttribute('aria-label')} × ${part.className}`);
      }
    }
    return hits;
  });
}
async function watchShifts(page: Page) {
  await page.evaluate(() => {
    const state = window as typeof window & {galleryCLS: number};
    state.galleryCLS = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {value: number; hadRecentInput: boolean; sources: {node?: Element}[]};
        if (!shift.hadRecentInput && shift.sources?.some(source => source.node?.closest?.('.home-gallery'))) state.galleryCLS += shift.value;
      }
    }).observe({type: 'layout-shift'});
  });
}
const shifts = (page: Page) => page.evaluate(() => (window as typeof window & {galleryCLS: number}).galleryCLS);

/** Scene built, ring settled in view, title revealed, ripple finished, images decoded. */
async function settled(page: Page) {
  // The gallery scene is built at browser idle time; wait until it exists before judging its end state.
  await expect(page.locator('.home-gallery')).toHaveAttribute('data-motion', 'ready');
  await ringAt(page, .5);
  for (const card of await page.locator('.lens-card').all()) {
    await expect.poll(() => card.locator('.lens-card-inner').evaluate(el => getComputedStyle(el).transform)).toMatch(identity);
    await expect.poll(async () => (await inner(card)).shade).toBe(0);
  }
  for (const word of await page.locator('.lens-heading .nw > span').all()) await expect(word).toHaveCSS('transform', 'none');
  await expect(page.locator('.lens-eyebrow')).toHaveCSS('clip-path', 'none');
  await expect(page.locator('.lens-title .button')).toHaveCSS('opacity', '1');
  // The settle ripple is short (under two seconds) and ends at rest.
  for (const pop of await page.locator('.lens-card-pop').all()) await expect.poll(() => pop.evaluate(el => getComputedStyle(el).transform), {timeout: 4000}).toMatch(identity);
  for (const img of await page.locator('.lens-card img').all()) await img.evaluate(img => (img as HTMLImageElement).decode());
}

for (const width of [390, 768, 1024, 1440]) test(`homepage ring is complete, clear of the title and opens the viewer at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height: 950});
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await watchShifts(page);
  await settled(page);
  expect(await page.locator('.lens-card img').evaluateAll(images => images.map(image => image.getAttribute('alt')))).toEqual(ORDER);
  expect(await page.locator('.home-gallery h2').textContent()).toBe('The nights we live for.');
  await expect(page.locator('.lens-eyebrow')).toHaveText('A little look inside');
  // Editorial treatment: uppercase Syne headline, Manrope eyebrow; no script lettering in the section.
  expect(await page.locator('.lens-heading').evaluate(el => [getComputedStyle(el).fontFamily.toLowerCase(), getComputedStyle(el).textTransform])).toEqual([expect.stringContaining('syne'), 'uppercase']);
  expect((await page.locator('.lens-eyebrow').evaluate(el => getComputedStyle(el).fontFamily)).toLowerCase()).toContain('manrope');
  await expect(page.locator('.home-gallery .script, .home-gallery .ghost-script')).toHaveCount(0);
  expect(await titleCollisions(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Every photograph is fully on screen horizontally (nothing cropped by the viewport edge).
  for (const box of await page.locator('.lens-card').evaluateAll(cards => cards.map(c => c.getBoundingClientRect().toJSON()))) {
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(width + 1);
  }
  expect(await shifts(page)).toBe(0);
  await page.locator('.home-gallery').screenshot({path: `artifacts/gallery-redesign/after-${width}.png`, style: '.header,.skip-link,nextjs-portal{visibility:hidden!important}'});
  await page.getByRole('button', {name: 'View A little something from the bar', exact: true}).click();
  const viewer = page.getByRole('dialog', {name: 'Photo viewer'});
  await expect(viewer).toHaveCSS('opacity', '1');
  await expect(viewer).toContainText('2 / 8');
  await expect(viewer.locator('img')).toHaveCSS('object-fit', 'contain');
  await page.screenshot({path: `artifacts/gallery-redesign/viewer-${width}.png`});
  await page.keyboard.press('ArrowRight');
  await expect(viewer).toContainText('3 / 8');
  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible();
  await expect(page.getByRole('button', {name: 'View A little something from the bar', exact: true})).toBeFocused();
});

test('scroll-scrubbed burst → settle, counter-clockwise orbit, exact reverse, no layout shift', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 950});
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.home-gallery')).toHaveAttribute('data-motion', 'ready');
  await watchShifts(page);
  const sectionHeight = await page.locator('.home-gallery').evaluate(el => el.getBoundingClientRect().height);
  // Entering: every card is visible but enlarged, tilted and dimmed (the burst).
  await position(page, '.lens-ring', .9);
  await frames(page);
  const early = await allInner(page);
  for (const s of early) expect(s.scale).toBeGreaterThan(1.2);
  for (const s of early) {
    expect(Math.abs(s.rotation)).toBeGreaterThan(8);
    expect(s.shade).toBeGreaterThan(.2);
    expect(s.shade).toBeLessThan(.7); // dimmed, never hidden
  }
  for (const card of await page.locator('.lens-card').all()) expect((await inner(card)).opacity).toBe(1);
  await page.screenshot({path: 'artifacts/gallery-redesign/burst-1440.png'});
  // Midway: progress grows with scroll (smaller, straighter, brighter).
  await position(page, '.lens-ring', .5);
  await frames(page);
  const mid = await allInner(page);
  mid.forEach((s, i) => {
    expect(s.scale).toBeLessThan(early[i].scale);
    expect(Math.abs(s.rotation)).toBeLessThan(Math.abs(early[i].rotation));
    expect(s.shade).toBeLessThan(early[i].shade);
  });
  // Settled: the ring at rest, then the orbit turns it counter-clockwise as the page continues.
  await settled(page);
  const slot = (i: number) => page.locator('.lens-card').nth(i).evaluate(el => ({cx: Number(el.style.getPropertyValue('--cx')), cy: Number(el.style.getPropertyValue('--cy'))}));
  const top0 = await slot(0), right0 = await slot(2);
  await page.evaluate(() => window.scrollBy({top: 260, behavior: 'instant'}));
  await frames(page);
  expect((await slot(0)).cx).toBeLessThan(top0.cx - .03); // the top card moves left…
  expect((await slot(2)).cy).toBeLessThan(right0.cy); // …and the right-hand card moves up: counter-clockwise
  // Reverse scrolling scrubs back to the burst exactly (no replayed entrance, nothing hidden).
  await position(page, '.lens-ring', .9);
  await frames(page);
  const reversed = await allInner(page);
  reversed.forEach((s, i) => {
    expect(s.scale).toBeCloseTo(early[i].scale, 2);
    expect(s.rotation).toBeCloseTo(early[i].rotation, 1);
  });
  await settled(page);
  expect(await shifts(page)).toBe(0);
  expect(await page.locator('.home-gallery').evaluate(el => el.getBoundingClientRect().height)).toBe(sectionHeight);
});

test('fast jumps settle completely; the pointer sends a ripple; hover pops one card without moving the ring', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 950});
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(2, 2);
  await page.evaluate(() => window.scrollTo({top: document.body.scrollHeight, behavior: 'instant'}));
  await frames(page);
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await frames(page);
  await settled(page);
  const card = page.getByRole('button', {name: 'View Loaded nachos to share', exact: true});
  const cardBoxes = () => page.locator('.lens-card').evaluateAll(cards => cards.map(c => {const b = c.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];}));
  const before = await cardBoxes();
  // Entering the ring: a counter-clockwise ripple of tilting, popping cards, back at rest within two seconds.
  await card.hover();
  await expect.poll(() => page.locator('.lens-card-pop').evaluateAll(pops => pops.some(p => getComputedStyle(p).transform !== 'none' && getComputedStyle(p).transform !== 'matrix(1, 0, 0, 1, 0, 0)')), {intervals: [50]}).toBe(true);
  for (const pop of await page.locator('.lens-card-pop').all()) await expect.poll(() => pop.evaluate(el => getComputedStyle(el).transform), {timeout: 4000}).toMatch(identity);
  // Hover pops that card on its own layer: tilt, scale, raised above its neighbours, caption shown.
  await expect(card.locator('.lens-caption')).toHaveCSS('opacity', '1');
  await expect(card.locator('.lens-face')).toHaveCSS('scale', '1.08');
  expect(['-5deg', '5deg']).toContain(await card.locator('.lens-face').evaluate(el => getComputedStyle(el).rotate));
  await expect(card).toHaveCSS('z-index', '30');
  expect(await cardBoxes()).toEqual(before);
  await page.mouse.move(2, 2);
  await expect(card.locator('.lens-caption')).toHaveCSS('opacity', '0');
  await expect(card.locator('.lens-face')).toHaveCSS('scale', 'none');
  // Back up to the entrance: the burst again, every photo visible.
  await position(page, '.lens-ring', .9);
  await frames(page);
  for (const s of await allInner(page)) {
    expect(s.scale).toBeGreaterThan(1.2);
    expect(s.shade).toBeLessThan(.7);
  }
});

test('keyboard: cards in ring order, focus pops the card and shows its caption, Enter opens the viewer', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 950});
  await page.goto('/');
  await settled(page);
  await page.locator('.lens-title .button').focus();
  for (const caption of ORDER) {
    await page.keyboard.press('Tab');
    const card = page.getByRole('button', {name: `View ${caption}`, exact: true});
    await expect(card).toBeFocused();
    await expect(card.locator('.lens-caption')).toHaveCSS('opacity', '1');
  }
  const last = page.getByRole('button', {name: `View ${ORDER[7]}`, exact: true});
  await expect(last.locator('.lens-face')).toHaveCSS('scale', '1.08');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', {name: 'Photo viewer'})).toContainText(`8 / 8 · ${ORDER[7]}`);
  await page.keyboard.press('Escape');
  await expect(last).toBeFocused();
});

test('reduced motion and breakpoint changes immediately restore the complete static ring', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 1440, height: 950});
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const still = await ringLayout(page);
  await page.setViewportSize({width: 390, height: 950});
  const stillMobile = await ringLayout(page);
  expect(await titleCollisions(page)).toEqual([]);
  for (const selector of ['.lens-card-inner', '.lens-card-pop']) {
    for (const layer of await page.locator(selector).all()) {
      await expect(layer).toHaveCSS('opacity', '1');
      await expect(layer).toHaveCSS('transform', 'none');
    }
  }
  await expect(page.locator('.home-gallery')).not.toHaveAttribute('data-motion', 'ready');
  // Motion on, mid-burst at desktop width; then reduced motion again: the static ring returns at once.
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.setViewportSize({width: 1440, height: 950});
  await expect(page.locator('.home-gallery')).toHaveAttribute('data-motion', 'ready');
  await position(page, '.lens-ring', .8);
  await frames(page);
  expect((await allInner(page))[0].scale).toBeGreaterThan(1.1);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect.poll(() => ringLayout(page)).toEqual(still);
  for (const layer of await page.locator('.lens-card-inner').all()) await expect(layer).toHaveCSS('transform', 'none');
  await page.setViewportSize({width: 390, height: 950});
  await expect.poll(() => ringLayout(page)).toEqual(stillMobile);
});

test('homepage viewer supports rapid controls, focus trapping and cleanup across navigation', async ({page}) => {
  await page.goto('/');
  await settled(page);
  const tile = page.getByRole('button', {name: 'View Dancing at Jimmy O’s', exact: true});
  for (let attempt = 0; attempt < 2; attempt++) {
    await tile.click();
    const viewer = page.getByRole('dialog', {name: 'Photo viewer'});
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    await expect(viewer).toContainText('8 / 8');
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await viewer.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(viewer).not.toBeVisible();
    await expect(tile).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await page.locator('.home-gallery').getByRole('link', {name: 'Enter the Gallery'}).click();
    await expect(page).toHaveURL('/gallery');
    await page.getByRole('button', {name: 'View Under the disco ball', exact: true}).click();
    await expect(page.locator('.lightbox')).toContainText('1 / 9');
    await page.keyboard.press('Escape');
    await expect(page.locator('.lightbox')).not.toBeVisible();
    await page.goBack();
    await settled(page);
  }
});

test('homepage ring is complete and links to the gallery without JavaScript', async ({browser}) => {
  // The same composition the motion settles into, rendered by the server alone.
  const reference = await browser.newContext({reducedMotion: 'reduce', viewport: {width: 390, height: 950}});
  const still = await reference.newPage();
  await still.goto('/');
  await still.evaluate(() => document.fonts.ready);
  const expected = await ringLayout(still);
  await reference.close();
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 950}});
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await ringLayout(page)).toEqual(expected);
  await expect(page.locator('.lens-card')).toHaveCount(8);
  for (const card of await page.locator('.lens-card').all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.lens-card-inner')).toHaveCSS('transform', 'none');
    await card.locator('img').evaluate(img => (img as HTMLImageElement).decode());
  }
  await page.locator('.home-gallery').getByRole('link', {name: 'Enter the Gallery'}).click();
  await expect(page).toHaveURL('/gallery');
  await context.close();
});

test.describe('touch ring', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  test('tap and swipe follow the ring order; the round centre button enters the gallery', async ({page, context}) => {
    await page.goto('/');
    await settled(page);
    const first = page.getByRole('button', {name: 'View Dancing at Jimmy O’s', exact: true});
    await first.tap();
    const viewer = page.getByRole('dialog', {name: 'Photo viewer'});
    await expect(viewer).toHaveCSS('opacity', '1');
    await expect(viewer).toContainText('1 / 8');
    const client = await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 300, y: 400}]});
    await client.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: 170, y: 405}]});
    await client.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await expect(viewer).toContainText(`2 / 8 · ${ORDER[1]}`);
    await viewer.getByRole('button', {name: 'Close photo'}).tap();
    await expect(viewer).not.toBeVisible();
    await expect(first).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    const enter = page.locator('.home-gallery').getByRole('link', {name: 'Enter the Gallery'});
    await expect(enter).toHaveCSS('border-radius', '50%');
    await enter.tap();
    await expect(page).toHaveURL('/gallery');
  });
});
