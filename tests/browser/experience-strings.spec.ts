import {test, expect, type Page} from '@playwright/test';

/** "Every night has a rhythm" (#experience): the playable strings section (EXPERIENCE-STRINGS-REPORT.md). */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', error => list.push(error.message));
  page.on('console', message => {if (message.type() === 'error') list.push(message.text());});
  // Count audio activity without changing it: contexts created and notes started.
  await page.addInitScript(() => {
    const w = window as unknown as {__audio: {contexts: number; notes: number}};
    w.__audio = {contexts: 0, notes: 0};
    const Original = window.AudioContext;
    if (!Original) return;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {super(options); w.__audio.contexts++;}
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {w.__audio.notes++; return start.apply(this, args);};
  });
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

const MOMENTS: [string, string][] = [
  ['Nightlife', '/nightlife'], ['Drinks', '/drink-menu'], ['Food', '/food-menu'], ['Specials', '/specials'],
  ['Reservations', '/reservations'], ['Events', '/events'], ['Private parties', '/private-parties'],
];
const section = (page: Page) => page.locator('#experience');
const audio = (page: Page) => page.evaluate(() => (window as unknown as {__audio: {contexts: number; notes: number}}).__audio);
const layoutOf = (page: Page) => section(page).getAttribute('data-instrument');
const cores = (page: Page, layout: string) => page.locator(`.ns-svg[data-layout="${layout}"] .ns-core`);
/** At rest every string shows its exact server-rendered curve (a cubic "C" path); moving strings are sampled. */
const allAtRest = (page: Page, layout: string) => cores(page, layout).evaluateAll(paths => paths.every(p => p.getAttribute('d')!.includes('C')));

async function ready(page: Page) {
  await page.goto('/');
  await page.keyboard.press('Shift'); // finish the hero intro
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
  await expect.poll(() => layoutOf(page)).not.toBeNull();
  const top = await page.locator('#experience .ns-stage').evaluate(el => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(top - 140));
  // The entrance has finished (hint shown) and its closing shimmer has rung out.
  await expect(section(page).locator('.ns-hint')).toHaveCSS('opacity', '1', {timeout: 8000});
  const layout = (await layoutOf(page))!;
  await expect.poll(() => allAtRest(page, layout), {timeout: 12000}).toBe(true);
  return layout;
}

/** A visible point on string `i` that the string itself receives (not covered by a print), scrolled into view. */
async function stringPoint(page: Page, layout: string, i: number, prefer = 0.5) {
  await page.evaluate(({layout, i}) => {
    const box = document.querySelector(`.ns-svg[data-layout="${layout}"] .ns-string[data-string="${i}"] .ns-core`)!.getBoundingClientRect();
    const middle = box.top + box.height / 2;
    if (middle < innerHeight * 0.3 || middle > innerHeight * 0.7) window.scrollTo({top: Math.round(scrollY + middle - innerHeight / 2), behavior: 'instant'});
  }, {layout, i});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const point = await page.evaluate(({layout, i, prefer}) => {
    const hit = document.querySelector<SVGPathElement>(`.ns-svg[data-layout="${layout}"] .ns-string[data-string="${i}"] .ns-hit`)!;
    const m = hit.ownerSVGElement!.getScreenCTM()!;
    const length = hit.getTotalLength();
    const found: {x: number; y: number; at: number}[] = [];
    for (let k = 4; k < 196; k++) {
      const p = hit.getPointAtLength((length * k) / 200);
      const x = p.x * m.a + m.e, y = p.y * m.d + m.f;
      if (x < 40 || x > innerWidth - 40 || y < 110 || y > innerHeight - 60) continue;
      if (document.elementFromPoint(x, y) === hit) found.push({x, y, at: k / 200});
    }
    found.sort((a, b) => Math.abs(a.at - prefer) - Math.abs(b.at - prefer));
    return found[0] ?? null;
  }, {layout, i, prefer});
  expect(point, `string ${i} has an uncovered point in view`).not.toBeNull();
  return point!;
}

/** How far (px, along the page) the string is from rest at screen x. */
const offsetAt = (page: Page, layout: string, i: number, x: number, restY: number) => page.evaluate(({layout, i, x, restY}) => {
  const core = document.querySelector<SVGPathElement>(`.ns-svg[data-layout="${layout}"] .ns-string[data-string="${i}"] .ns-core`)!;
  const m = core.ownerSVGElement!.getScreenCTM()!;
  const length = core.getTotalLength();
  let best = {dx: Infinity, y: 0};
  for (let k = 0; k <= 600; k++) {
    const p = core.getPointAtLength((length * k) / 600);
    const sx = p.x * m.a + m.e;
    if (Math.abs(sx - x) < best.dx) best = {dx: Math.abs(sx - x), y: p.y * m.d + m.f};
  }
  return best.y - restY;
}, {layout, i, x, restY});

test('follows the hero with its heading, controls and seven real moments; the hero’s Discover link leads here', async ({page, request}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await ready(page);
  expect(await page.locator('.scene-cover').evaluate(el => el.firstElementChild?.id)).toBe('experience');
  expect(await section(page).evaluate(el => el.nextElementSibling?.id)).toBe('discover');
  await expect(page.locator('.cinema-foot a').first()).toHaveAttribute('href', '#experience');
  await expect(section(page).getByRole('heading', {level: 2})).toHaveText('Every night has a rhythm.');
  await expect(section(page).getByText('Discover the moments that make Jimmy O’s unforgettable.')).toBeVisible();
  await expect(section(page).getByText('Explore the moments. Pluck the strings.')).toBeVisible();
  const links = section(page).locator('.ns-link');
  await expect(links).toHaveCount(MOMENTS.length);
  for (const [i, [kicker, href]] of MOMENTS.entries()) {
    await expect(links.nth(i)).toHaveAttribute('href', href);
    await expect(links.nth(i)).toContainText(kicker);
    expect((await request.get(href)).status(), href).toBe(200);
  }
  // Real photographs, loaded, with meaningful alternative text; decorative strings are hidden from assistive tech.
  for (const img of await section(page).locator('.ns-photo img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
    expect((await img.getAttribute('alt'))!.length).toBeGreaterThan(15);
  }
  await expect(section(page).locator('.ns-svg[aria-hidden="true"]')).toHaveCount(3);
  // A print is one link: clicking the photograph navigates.
  const drinks = section(page).locator('.ns-card[data-index="1"] .ns-photo');
  await drinks.scrollIntoViewIfNeeded();
  const box = (await drinks.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page).toHaveURL('/drink-menu');
});

test('pulling a string bends it; letting go rings through rest and settles; its prints follow', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  const layout = await ready(page);
  const p = await stringPoint(page, layout, 1, 0.55);
  await page.mouse.move(p.x, p.y);
  // Hover brightens the string near the pointer.
  await expect.poll(() => page.locator(`.ns-svg[data-layout="${layout}"] .ns-string[data-string="1"]`).evaluate(el => Number(el.style.getPropertyValue('--near')))).toBeGreaterThan(0.5);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(p.x, p.y + k * 6);
  await expect.poll(() => offsetAt(page, layout, 1, p.x, p.y)).toBeGreaterThan(45);
  // The string's prints ride along while it is held.
  const swings = section(page).locator('.ns-card .ns-swing');
  await expect.poll(() => swings.evaluateAll(els => els.filter(el => el.style.transform.includes('translate3d')).length)).toBeGreaterThan(0);
  await page.mouse.up();
  // It swings back through rest to the other side…
  await expect.poll(() => offsetAt(page, layout, 1, p.x, p.y), {intervals: [16], timeout: 1500}).toBeLessThan(-5);
  // …then settles exactly on its curve, and the prints come to rest.
  await expect.poll(() => allAtRest(page, layout), {timeout: 9000}).toBe(true);
  await expect.poll(() => swings.evaluateAll(els => els.every(el => el.style.transform === '')), {timeout: 4000}).toBe(true);
});

test('sound is off until enabled; then a click, a peg or a strum plays, and muting silences it again', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  const layout = await ready(page);
  const toggle = section(page).locator('.ns-sound');
  await expect(toggle).toHaveText('Enable sound');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  // Plucking while muted: the string answers, but no audio exists at all.
  const p = await stringPoint(page, layout, 0, 0.45);
  await page.mouse.click(p.x, p.y);
  await page.getByRole('button', {name: 'Pluck the second string (F♯3)'}).click();
  // Scrolling over the strings never plays anything either.
  await page.mouse.move(p.x, p.y);
  await page.mouse.wheel(0, 300);
  await page.mouse.wheel(0, -300);
  expect(await audio(page)).toEqual({contexts: 0, notes: 0});

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveText('Sound on');
  expect((await audio(page)).contexts).toBe(1);
  // Keyboard: the pegs are real buttons.
  await page.getByRole('button', {name: 'Pluck the first string (B3)'}).focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await audio(page)).notes).toBe(1);
  const q = await stringPoint(page, layout, 2, 0.5);
  await page.mouse.click(q.x, q.y);
  await expect.poll(async () => (await audio(page)).notes).toBe(2);
  // A strum: press on the empty stage just above the open low string and drag down across it.
  const r = await stringPoint(page, layout, 3, 0.8);
  const start = await page.evaluate(({x, y}) => {
    for (let dy = 30; dy < 90; dy += 4) if (document.elementFromPoint(x, y - dy)?.classList.contains('ns-instrument')) return y - dy;
    return null;
  }, r);
  expect(start, 'empty stage above the string').not.toBeNull();
  await page.mouse.move(r.x, start!);
  await page.mouse.down();
  for (let y = start! + 8; y < r.y + 40; y += 8) await page.mouse.move(r.x, y);
  await page.mouse.up();
  await expect.poll(async () => (await audio(page)).notes).toBe(3);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const again = await stringPoint(page, layout, 2, 0.5);
  await page.mouse.click(again.x, again.y);
  await page.getByRole('button', {name: 'Pluck the fourth string (A2)'}).click();
  await page.waitForTimeout(200);
  expect((await audio(page)).notes).toBe(3);
});

test('a print and a string never trigger each other: pressing a print plucks nothing; hovering it straightens it', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  const layout = await ready(page);
  await section(page).locator('.ns-sound').click();
  const card = section(page).locator('.ns-card[data-index="3"]');
  // Hover (the caption link is the print's own link): the print turns to a neutral angle and its string answers softly.
  await card.locator('.ns-link').hover();
  await expect.poll(() => card.locator('.ns-tilt').evaluate(el => getComputedStyle(el).rotate), {timeout: 3000}).toMatch(/^(0deg|none)$/);
  const box = (await card.locator('.ns-photo').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => page.locator(`.ns-svg[data-layout="${layout}"] .ns-string[data-string="1"]`).evaluate(el => Number(el.style.getPropertyValue('--near')))).toBeGreaterThan(0.3);
  // Press and drag off the print (no click, so no navigation): nothing is plucked.
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 60, {steps: 6});
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect((await audio(page)).notes).toBe(0);
  await expect(page).toHaveURL('/');
});

test('keyboard: every control and print is reachable, with a visible focus ring', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await ready(page);
  const sound = section(page).locator('.ns-sound');
  await sound.focus();
  const order = ['.ns-sound', '.ns-peg >> nth=0', '.ns-peg >> nth=1', '.ns-peg >> nth=2', '.ns-peg >> nth=3', ...MOMENTS.flatMap((_, i) => [`.ns-card[data-index="${i}"] .ns-mount`, `.ns-card[data-index="${i}"] .ns-link`])];
  for (const [i, selector] of order.entries()) {
    if (i) await page.keyboard.press('Tab');
    await expect(section(page).locator(selector)).toBeFocused();
  }
  // The last print's focus ring is drawn around the whole print.
  const ring = await section(page).locator('.ns-card[data-index="6"] .ns-link').evaluate(el => getComputedStyle(el, '::after').outlineStyle);
  expect(ring).toBe('solid');
});

test('reduced motion: the composition is complete and still; a pluck lights the string without moving it', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await expect.poll(() => layoutOf(page)).toBe('desktop');
  await section(page).locator('.ns-stage').scrollIntoViewIfNeeded();
  for (const el of await section(page).locator('.ns-plate, .ns-caption, .ns-hint, .ns-title .nw > span').all()) await expect(el).toHaveCSS('opacity', '1');
  await expect(section(page).locator('.ns-plate').first()).toHaveCSS('clip-path', 'none');
  await page.getByRole('button', {name: 'Pluck the first string (B3)'}).click();
  await expect.poll(() => page.locator('.ns-svg[data-layout="desktop"] .ns-string[data-string="0"]').evaluate(el => Number(el.style.getPropertyValue('--hit')))).toBeGreaterThan(0);
  expect(await allAtRest(page, 'desktop')).toBe(true);
  expect(await section(page).locator('.ns-swing').evaluateAll(els => els.every(el => el.style.transform === ''))).toBe(true);
});

test('phones: a tap plucks a string; a swipe scrolls the page and never plucks', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  const page = await context.newPage();
  const phoneErrors: string[] = [];
  page.on('pageerror', error => phoneErrors.push(error.message));
  const layout = await ready(page);
  expect(layout).toBe('mobile');
  const group = (i: number) => page.locator(`.ns-svg[data-layout="mobile"] .ns-string[data-string="${i}"]`);
  const p = await stringPoint(page, layout, 1, 0.5);
  await page.touchscreen.tap(p.x, p.y);
  await expect.poll(() => group(1).evaluate(el => Number(el.style.getPropertyValue('--hit')))).toBeGreaterThan(0);
  await expect.poll(() => allAtRest(page, layout)).toBe(false);
  await expect.poll(() => allAtRest(page, layout), {timeout: 9000}).toBe(true);
  await page.evaluate(() => document.querySelectorAll<SVGGElement>('.ns-string').forEach(el => el.style.removeProperty('--hit')));
  // A vertical swipe that starts on a string scrolls natively (touch-action: pan-y) and plucks nothing.
  const q = await stringPoint(page, layout, 2, 0.5);
  const before = await page.evaluate(() => scrollY);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: q.x, y: q.y}]});
  for (let k = 1; k <= 10; k++) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: q.x, y: q.y - k * 16}]});
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 60);
  await page.waitForTimeout(300);
  expect(await group(2).evaluate(el => el.style.getPropertyValue('--hit'))).toBe('');
  expect(await allAtRest(page, layout)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(phoneErrors).toEqual([]);
  await context.close();
});

test('each size has its own composition: prints never overlap and stay inside the screen', async ({page}) => {
  for (const [width, layout] of [[360, 'mobile'], [390, 'mobile'], [700, 'mobile'], [768, 'tablet'], [1024, 'tablet'], [1025, 'desktop'], [1440, 'desktop'], [1920, 'desktop']] as const) {
    await page.setViewportSize({width, height: 900});
    await page.emulateMedia({reducedMotion: 'reduce'}); // measure the resting composition
    await page.goto('/');
    await expect.poll(() => layoutOf(page)).toBe(layout);
    await expect(section(page).locator(`.ns-svg[data-layout="${layout}"]`)).toBeVisible();
    const m = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('#experience .ns-card')].filter(c => getComputedStyle(c).display !== 'none').map(c => c.querySelector('.ns-plate')!.getBoundingClientRect());
      let gap = Infinity;
      for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
        const A = boxes[a], B = boxes[b];
        gap = Math.min(gap, Math.max(B.left - A.right, A.left - B.right, B.top - A.bottom, A.top - B.bottom));
      }
      return {count: boxes.length, gap, edge: Math.min(...boxes.map(r => Math.min(r.left, innerWidth - r.right))), overflow: document.documentElement.scrollWidth > innerWidth};
    });
    expect(m.count, `${width}px`).toBe(7);
    expect(m.gap, `${width}px: prints keep clear of each other`).toBeGreaterThanOrEqual(8);
    expect(m.edge, `${width}px: prints stay on screen`).toBeGreaterThanOrEqual(12);
    expect(m.overflow, `${width}px: no horizontal scroll`).toBe(false);
  }
});

test('no layout shift from the section while the page loads and scrolls through it', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.addInitScript(() => {
    const w = window as unknown as {__cls: number};
    w.__cls = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries() as (PerformanceEntry & {value: number; hadRecentInput: boolean; sources?: {node?: Node}[]})[]) {
        if (!entry.hadRecentInput && entry.sources?.some(s => (s.node as Element | undefined)?.closest?.('#experience'))) w.__cls += entry.value;
      }
    }).observe({type: 'layout-shift', buffered: true});
  });
  await ready(page);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as unknown as {__cls: number}).__cls)).toBeLessThan(0.01);
});

test('off screen, a peg plays sound and light but queues no motion; touch keeps pinch-zoom', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect.poll(() => layoutOf(page)).toBe('desktop');
  // Native scrolling and pinch-zoom stay available over the stage (only the double-tap delay is removed).
  await expect(section(page).locator('.ns-instrument')).toHaveCSS('touch-action', 'manipulation');
  // At the top of the page the strings are below the fold: press a peg without scrolling to it.
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('#experience .ns-peg')!.click());
  await expect.poll(() => page.locator('.ns-svg[data-layout="desktop"] .ns-string[data-string="0"]').evaluate(el => Number(el.style.getPropertyValue('--hit')))).toBeGreaterThan(0);
  // Brought into view, the string is still exactly at rest: nothing was stored up to play out late.
  const top = await page.locator('#experience .ns-stage').evaluate(el => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(top - 140));
  for (let i = 0; i < 6; i++) {
    expect(await page.locator('.ns-svg[data-layout="desktop"] .ns-string[data-string="0"] .ns-core').getAttribute('d')).toContain('C');
    await page.waitForTimeout(50);
  }
});

test('the light moves: strings draw on progressively and a pluck’s pulse travels along the string', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect.poll(() => layoutOf(page)).toBe('desktop');
  const offsets = (selector: string) => page.locator(selector).evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).strokeDashoffset)));
  // Bring the section in and sample the top string while it draws: in-between values, not a jump from 1 to 0.
  const top = await page.locator('#experience').evaluate(el => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(top - 500));
  const drawn: number[] = [];
  for (let i = 0; i < 40; i++) {drawn.push(...await offsets('.ns-svg[data-layout="desktop"] .ns-string[data-string="0"] .ns-core')); await page.waitForTimeout(40);}
  expect(drawn.some(v => v > 0.05 && v < 0.95), `draw-on offsets ${drawn.map(v => v.toFixed(2)).join(' ')}`).toBe(true);
  // A pluck on the open low string: both pulses pass through intermediate positions.
  await expect.poll(() => allAtRest(page, 'desktop'), {timeout: 12000}).toBe(true);
  await page.evaluate(() => document.querySelectorAll<HTMLButtonElement>('#experience .ns-peg')[3].click());
  const pulses: number[][] = [];
  for (let i = 0; i < 12; i++) {pulses.push(await offsets('.ns-svg[data-layout="desktop"] .ns-string[data-string="3"] .ns-pulse')); await page.waitForTimeout(40);}
  const toEnd = pulses.map(p => p[0]), toStart = pulses.map(p => p[1]);
  expect(toEnd.some(v => v < -0.3 && v > -0.99) && new Set(toEnd.map(v => v.toFixed(3))).size > 4, `pulse → end ${toEnd.join(' ')}`).toBe(true);
  expect(toStart.some(v => v < -0.02 && v > -0.3) && new Set(toStart.map(v => v.toFixed(3))).size > 4, `pulse → start ${toStart.join(' ')}`).toBe(true);
});
