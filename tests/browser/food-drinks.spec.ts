import {test, expect, type Page} from '@playwright/test';
import {fullMenus} from '../../packages/shared/src/content.ts';

/** Food & Drinks: the categories carousel (A) and Signature Selections (B). FOOD-DRINKS-CINEMATIC-EXPERIENCE-REPORT.md */
const messages = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const errors: string[] = [];
  messages.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
});
test.afterEach(async ({page}) => expect(messages.get(page)).toEqual([]));

const CATEGORIES = [['Food', '/food-menu', 'Explore the Menu'], ['Drinks', '/drink-menu', 'Find Your Drink'], ['After Dark', '/food-menu#after-dark', 'See the After Dark Menu']];
const ITEMS = ['Jimmy O’s Classic Burger', 'Jimmy O’s Loaded Nachos', 'House Tossed Wings (8)', 'Cocktail Pitchers'];
const fd = (page: Page) => page.locator('.fd');
const sig = (page: Page) => page.locator('.sig');
const frames = (page: Page) => page.evaluate(() => new Promise<void>(done => {let n = 0; const step = () => (++n > 3 ? done() : requestAnimationFrame(step)); requestAnimationFrame(step);}));
/** Jump to a section, then wait until the page is still (as a visitor's page would be before a click). */
async function reach(page: Page, selector: string) {
  await page.locator(selector).evaluate(el => window.scrollTo({top: el.getBoundingClientRect().top + scrollY - 40, behavior: 'instant'}));
  await still(page);
}
/** Wait until the page has stopped moving (touch momentum is native and outlives the gesture). */
async function still(page: Page) {
  await expect.poll(() => page.evaluate(() => new Promise<boolean>(done => {const y = scrollY; setTimeout(() => done(scrollY === y), 250);}))).toBe(true);
  await frames(page);
}
async function open(page: Page) {
  await page.goto('/');
  await page.keyboard.press('Shift'); // finish the hero intro
  await page.evaluate(() => document.fonts.ready);
}
const activeCard = (page: Page) => fd(page).locator('.fd-card[data-slot="0"]');
/** No change in flight: every card and dish back on its CSS resting state. */
async function carouselAtRest(page: Page) {
  await expect.poll(() => fd(page).locator('.fd-card').evaluateAll(cards => cards.every(c => !(c as HTMLElement).style.transform))).toBe(true);
}
async function showcaseAtRest(page: Page) {
  await expect.poll(() => sig(page).locator('.sig-dish').evaluateAll(d => d.every(e => !(e as HTMLElement).style.transform))).toBe(true);
}

test('carousel: verified categories and destinations, Food first, only the featured card is interactive', async ({page}) => {
  await open(page);
  await expect(fd(page).getByRole('heading', {level: 2})).toHaveText('A taste of the good life.');
  await expect(fd(page).getByRole('tab')).toHaveText(CATEGORIES.map(([name]) => new RegExp(`${name}$`)));
  await expect(fd(page).getByRole('tab', {name: /Food$/})).toHaveAttribute('aria-selected', 'true');
  for (const [i, [, href, label]] of CATEGORIES.entries()) {
    const link = fd(page).locator('.fd-card').nth(i).getByRole('link', {name: label, includeHidden: true});
    await expect(link).toHaveAttribute('href', href);
    if (i === 0) await expect(link).not.toHaveAttribute('tabindex'); else await expect(link).toHaveAttribute('tabindex', '-1');
  }
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-food');
  await expect(fd(page).locator('.fd-card[aria-hidden="true"]')).toHaveCount(2);
  await reach(page, '.fd');
  for (const img of await fd(page).locator('img').all()) await expect.poll(() => img.evaluate(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await activeCard(page).getByRole('link', {name: 'Explore the Menu'}).click();
  await expect(page).toHaveURL('/food-menu');
});

test('carousel: arrows, tabs with arrow keys, and a click on a neighbour; the measured settle, then rest', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await open(page);
  await expect(fd(page)).toHaveAttribute('data-motion', 'ready');
  await reach(page, '.fd');
  await fd(page).getByRole('button', {name: 'Next category'}).click();
  // Mid-change: the incoming card is moving towards the centre (not yet at rest).
  await page.waitForTimeout(90);
  const moving = await fd(page).locator('#fd-card-drinks').evaluate(el => new DOMMatrix(getComputedStyle(el).transform));
  expect(Math.abs(moving.e)).toBeGreaterThan(2);
  await carouselAtRest(page);
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-drinks');
  await expect(fd(page).getByRole('tab', {name: /Drinks$/})).toHaveAttribute('aria-selected', 'true');
  await expect(fd(page).locator('[aria-live="polite"]')).toHaveText('Drinks, 2 of 3');
  // The featured card's copy is fully shown; the neighbours keep only their category label.
  for (const el of await activeCard(page).locator('.fd-line > span').all()) await expect(el).toHaveCSS('transform', 'none');
  await expect(activeCard(page).locator('.fd-body')).toHaveCSS('opacity', '1');
  await expect(fd(page).locator('#fd-card-food .fd-body')).toHaveCSS('opacity', '0');
  // Previous wraps around.
  await fd(page).getByRole('button', {name: 'Previous category'}).click();
  await fd(page).getByRole('button', {name: 'Previous category'}).click();
  await carouselAtRest(page);
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-after-dark');
  // Tabs: arrow keys, Home and End move the selection and the focus.
  await fd(page).getByRole('tab', {name: /After Dark$/}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(fd(page).getByRole('tab', {name: /Food$/})).toBeFocused();
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-food');
  await page.keyboard.press('End');
  await expect(fd(page).getByRole('tab', {name: /After Dark$/})).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(fd(page).getByRole('tab', {name: /Food$/})).toHaveAttribute('aria-selected', 'true');
  await carouselAtRest(page);
  // A click on a neighbour brings it to the centre.
  await fd(page).locator('#fd-card-drinks').click({position: {x: 400, y: 60}});
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-drinks');
  // Rapid clicks finish each change before the next: always a clean resting state.
  for (let i = 0; i < 5; i++) await fd(page).getByRole('button', {name: 'Next category'}).click();
  await carouselAtRest(page);
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-food'); // Drinks + 5 steps of 3 = Food
  await expect(fd(page).locator('.fd-card[data-slot="0"]')).toHaveCount(1);
});

test('carousel: mouse drag changes the slide; a short drag does nothing and never follows the link', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await open(page);
  await reach(page, '.fd');
  const box = (await fd(page).locator('.fd-stage').boundingBox())!;
  const y = box.y + box.height * 0.4;
  const dragBy = async (dx: number) => {
    await page.mouse.move(720, y); await page.mouse.down();
    for (let k = 1; k <= 10; k++) await page.mouse.move(720 + (dx * k) / 10, y);
    await page.mouse.up();
  };
  await dragBy(-220);
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-drinks');
  await carouselAtRest(page);
  await dragBy(220);
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-food');
  await carouselAtRest(page);
  await dragBy(-30);
  await page.waitForTimeout(300);
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-food');
  await expect(page).toHaveURL('/');
  // A drag released over the featured card's call to action does not follow it.
  const cta = (await activeCard(page).getByRole('link', {name: 'Explore the Menu'}).boundingBox())!;
  await page.mouse.move(cta.x + cta.width / 2 + 160, cta.y + cta.height / 2); await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(cta.x + cta.width / 2 + 160 - k * 20, cta.y + cta.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(400);
  await expect(page).toHaveURL('/');
});

test.describe('touch', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  test('a horizontal swipe changes the slide or dish; a vertical swipe scrolls the page', async ({page, context}) => {
    await open(page);
    await reach(page, '.fd');
    const client = await context.newCDPSession(page);
    const swipe = async (x0: number, y0: number, x1: number, y1: number) => {
      await client.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x0, y: y0}]});
      for (let k = 1; k <= 8; k++) await client.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x0 + ((x1 - x0) * k) / 8, y: y0 + ((y1 - y0) * k) / 8}]});
      await client.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    };
    const stage = (await fd(page).locator('.fd-stage').boundingBox())!;
    const cy = stage.y + stage.height * 0.35;
    await swipe(320, cy, 90, cy + 4);
    await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-drinks');
    const before = await page.evaluate(() => scrollY);
    await swipe(200, cy + 60, 196, cy - 260);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 80);
    await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-drinks');
    await still(page);
    // Signature Selections: a swipe on the dish shows the next one.
    await reach(page, '.sig-orbit');
    const plate = (await sig(page).locator('.sig-plate').boundingBox())!;
    await swipe(plate.x + plate.width * 0.85, plate.y + plate.height / 2, plate.x + plate.width * 0.15, plate.y + plate.height / 2 + 6);
    await expect(sig(page).locator('.sig-item[data-active] .sig-title')).toHaveText(ITEMS[1]);
    await expect(sig(page).locator('.sig-counter')).toHaveText('02 / 04');
  });
});

test('signature: verified dishes, labels taken from each dish’s own menu description, working calls to action', async ({page}) => {
  await open(page);
  await expect(sig(page).getByRole('heading', {level: 2})).toHaveText('Signature Selections');
  await expect(sig(page).locator('.sig-title')).toHaveText(ITEMS);
  const menu = new Map(fullMenus.flatMap(category => category.items.map(item => [item.name, item.description] as const)));
  const pitchers = fullMenus.find(category => category.id === 'cocktail-pitchers')!.items.map(item => item.name);
  for (const [i, title] of ITEMS.entries()) {
    const labels = await sig(page).locator(`.sig-group[data-item="${i}"] .sig-chip`).allTextContents();
    expect(labels.length, title).toBeGreaterThanOrEqual(3);
    for (const label of labels) {
      if (title === 'Cocktail Pitchers') expect(pitchers, label).toContain(label);
      else expect(menu.get(title)!.toLowerCase(), `${title}: ${label}`).toContain(label.toLowerCase());
    }
    if (title !== 'Cocktail Pitchers') expect(menu.get(title)!.startsWith((await sig(page).locator(`.sig-item[data-item="${i}"] .sig-description`).textContent())!.replace(/\.$/, ''))).toBe(true);
  }
  // No prices, allergens or claims are published here.
  expect(await sig(page).innerText()).not.toMatch(/\$\d|gluten|vegan|calorie|allergen/i);
  await reach(page, '.sig');
  for (const img of await sig(page).locator('.sig-dish img').all()) await expect.poll(() => img.evaluate(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect(sig(page).locator('.sig-items')).toHaveCSS('transform', 'none'); // its entrance has finished
  await sig(page).locator('.sig-item[data-active]').getByRole('link', {name: 'See the Food Menu'}).click();
  await expect(page).toHaveURL('/food-menu');
});

test('signature: the measured turntable change, labels and index follow, rapid clicks and keyboard', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await open(page);
  await expect(sig(page)).toHaveAttribute('data-motion', 'ready');
  await reach(page, '.sig');
  await page.waitForTimeout(1600); // entrance
  await sig(page).getByRole('button', {name: 'Next selection'}).click();
  await page.waitForTimeout(450);
  // Mid-change (near the fitted ease's steep middle): the incoming dish is turning in, the outgoing turning away.
  const angle = (i: number) => sig(page).locator(`.sig-dish[data-item="${i}"]`).evaluate(el => {const m = new DOMMatrix(getComputedStyle(el).transform); return Math.atan2(m.b, m.a) * 180 / Math.PI;});
  const [outgoing, incoming] = [await angle(0), await angle(1)];
  // Direction-aware (next turns clockwise: the outgoing dish turns away clockwise, the incoming one arrives
  // from anticlockwise); the amplitude depends on the shot (angled shots swing less than top-down ones).
  expect(outgoing).toBeGreaterThan(5);
  expect(incoming).toBeLessThan(-1);
  await showcaseAtRest(page);
  await expect(sig(page).locator('.sig-dish[data-active]')).toHaveAttribute('data-item', '1');
  await expect(sig(page).locator('.sig-dish[data-item="1"]')).toHaveCSS('opacity', '1');
  await expect(sig(page).locator('.sig-dish[data-item="0"]')).toHaveCSS('opacity', '0');
  await expect(sig(page).locator('.sig-group[data-active][data-side="left"] .sig-chip').first()).toHaveText('Tortilla chips');
  await expect(sig(page).locator('.sig-index [aria-current="true"]')).toHaveAttribute('aria-label', ITEMS[1]);
  await expect(sig(page).locator('[aria-live="polite"]')).toHaveText(`${ITEMS[1]}, 2 of 4`);
  // Previous reverses the direction; the index picks directly.
  await sig(page).getByRole('button', {name: 'Previous selection'}).click();
  await page.waitForTimeout(450);
  expect(await angle(1)).toBeLessThan(-5); // the outgoing nachos turn away anticlockwise
  expect(await angle(0)).toBeGreaterThan(1); // the burger arrives from clockwise
  await showcaseAtRest(page);
  await expect(sig(page).locator('.sig-item[data-active] .sig-title')).toHaveText(ITEMS[0]);
  await sig(page).locator('.sig-index').getByRole('button', {name: /Cocktail Pitchers/}).click();
  await showcaseAtRest(page);
  await expect(sig(page).locator('.sig-item[data-active] .sig-title')).toHaveText(ITEMS[3]);
  // Rapid clicks: each change completes before the next, ending in one clean state.
  for (let i = 0; i < 3; i++) await sig(page).getByRole('button', {name: 'Next selection'}).click();
  await showcaseAtRest(page);
  await expect(sig(page).locator('.sig-item[data-active] .sig-title')).toHaveText(ITEMS[2]); // 3 + 3 = 2 (mod 4)
  await expect(sig(page).locator('.sig-dish[data-active]')).toHaveCount(1);
  for (const dish of await sig(page).locator('.sig-dish:not([data-active])').all()) await expect(dish).toHaveCSS('opacity', '0');
  // Keyboard: the buttons work with Enter and show a focus ring.
  await sig(page).getByRole('button', {name: 'Previous selection'}).focus();
  await page.keyboard.press('Tab'); // arrive by keyboard, as :focus-visible expects
  await expect(sig(page).getByRole('button', {name: 'Next selection'})).toBeFocused();
  await expect(sig(page).getByRole('button', {name: 'Next selection'})).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await showcaseAtRest(page);
  await expect(sig(page).locator('.sig-item[data-active] .sig-title')).toHaveText(ITEMS[3]);
  // Only the active item's link is in the tab order.
  await expect(sig(page).locator('.sig-item:not([data-active]) a[tabindex="-1"]')).toHaveCount(3);
});

test('signature: every dish keeps its geometry and photograph through a full cycle; no attribution sits on the food', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await open(page);
  await expect(sig(page)).toHaveAttribute('data-motion', 'ready');
  await reach(page, '.sig');
  for (let i = 0; i < ITEMS.length; i++) {
    if (i) { await sig(page).getByRole('button', {name: 'Next selection'}).click(); await showcaseAtRest(page); }
    const dish = sig(page).locator(`.sig-dish[data-item="${i}"]`);
    // The plate geometry (React's inline variables) survives the animation's cleanup, and the dish is large.
    await expect(dish).toHaveAttribute('style', /--pf/);
    const box = (await dish.boundingBox())!;
    expect(box.width, ITEMS[i]).toBeGreaterThan(500);
    await expect.poll(() => dish.locator('img').evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await expect(dish).toHaveCSS('opacity', '1');
    // The placeholder credit is no longer part of the composition (it is on the legal page; next test).
    await expect(sig(page).getByText(/Illustrative photo|CC BY/)).toHaveCount(0);
  }
});

test('the placeholder photographs are fully credited on the legal page (title, author, source, licence, changes)', async ({page}) => {
  await page.goto('/privacy#image-credits');
  const heading = page.getByRole('heading', {name: 'Image credits'});
  await expect(heading).toBeVisible();
  const credits = page.locator('.credits li');
  await expect(credits).toHaveCount(3); // the three placeholders; the client's own burger photograph needs none
  const expected = [
    ['Jimmy O’s Loaded Nachos', 'Ewan Munro', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0/', 'Castle,_North_Acton', /licensed under CC BY-SA 2\.0/],
    ['House Tossed Wings (8)', 'JIP', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'Home-made_chicken_wings', /licensed under CC BY-SA 4\.0/],
    ['Cocktail Pitchers', 'Missvain', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/', 'La_Casa_Restaurant', /Cropped, colour-graded/],
  ] as const;
  for (const [i, [dish, author, license, licenseUrl, source, changes]] of expected.entries()) {
    const item = credits.nth(i);
    await expect(item).toContainText(dish);
    await expect(item).toContainText(`by ${author}`);
    await expect(item.getByRole('link', {name: license, exact: true})).toHaveAttribute('href', licenseUrl);
    await expect(item.getByRole('link').first()).toHaveAttribute('href', new RegExp(`commons\\.wikimedia\\.org/wiki/File:${source}`));
    await expect(item).toContainText(changes);
  }
  await expect(page.locator('.legal')).not.toContainText('Classic Burger'); // approved client photograph: not listed
});

test('reduced motion: changes are immediate and complete; no-JS shows both sections with working links', async ({page, browser}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await open(page);
  await reach(page, '.fd');
  await fd(page).getByRole('button', {name: 'Next category'}).click();
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-drinks');
  expect(await fd(page).locator('.fd-card').evaluateAll(cards => cards.every(c => !(c as HTMLElement).style.transform))).toBe(true);
  await expect(activeCard(page).locator('.fd-body')).toHaveCSS('opacity', '1');
  await reach(page, '.sig');
  await sig(page).getByRole('button', {name: 'Next selection'}).click();
  await expect(sig(page).locator('.sig-dish[data-item="1"]')).toHaveCSS('opacity', '1');
  await expect(sig(page).locator('.sig-dish[data-item="1"]')).toHaveCSS('transform', 'none');
  await expect(sig(page).locator('.sig-plate')).toHaveCSS('transform', 'none');
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
  const nojs = await context.newPage();
  await nojs.goto('/');
  expect(await nojs.locator('.fd-card[data-slot="0"] .fd-title').textContent()).toBe('Good food. Great company.');
  await expect(nojs.locator('.fd-card[data-slot="0"]').getByRole('link', {name: 'Explore the Menu'})).toHaveAttribute('href', '/food-menu');
  await expect(nojs.locator('.sig-item[data-active] .sig-title')).toHaveText(ITEMS[0]);
  await nojs.locator('.sig').scrollIntoViewIfNeeded();
  await expect(nojs.locator('.sig-dish[data-active]')).toBeVisible();
  await context.close();
});

for (const width of [360, 390, 768, 1024, 1440, 1920]) test(`both sections compose cleanly at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height: width <= 700 ? 844 : 900});
  await open(page);
  await page.evaluate(() => {
    const state = window as typeof window & {fdCLS: number};
    state.fdCLS = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {value: number; hadRecentInput: boolean; sources: {node?: Element}[]};
        if (!shift.hadRecentInput && shift.sources?.some(s => s.node?.closest?.('.fd, .sig'))) state.fdCLS += shift.value;
      }
    }).observe({type: 'layout-shift'});
  });
  for (const selector of ['.fd', '.sig']) {
    await reach(page, selector);
    await page.waitForTimeout(1800);
    await page.screenshot({path: `artifacts/food-redesign/after/${selector.slice(1)}-${width}.png`, style: 'nextjs-portal{display:none!important}'});
  }
  const report = await page.evaluate(() => {
    const within = (el: Element) => {const b = el.getBoundingClientRect(); return b.left >= -1 && b.right <= innerWidth + 1;};
    const text = [...document.querySelectorAll('.fd *, .sig *')].filter(e => (e as HTMLElement).offsetParent && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim()) && getComputedStyle(e).opacity !== '0' && !e.closest('[aria-hidden="true"]'));
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      tiny: text.filter(e => parseFloat(getComputedStyle(e).fontSize) < 11).map(e => e.textContent!.trim().slice(0, 20)),
      // Every dish's labels, not only the one shown (the hidden groups are laid out in the same places).
      chipsOutside: [...document.querySelectorAll('.sig-chip')].filter(c => c.getBoundingClientRect().width > 0 && !within(c)).map(c => c.textContent),
      controlsOutside: [...document.querySelectorAll('.fd-controls button, .sig-arrow, .fd-card[data-slot="0"] .fd-cta, .sig-item[data-active] .sig-cta')].filter(c => !within(c)).map(c => c.textContent || c.getAttribute('aria-label')),
      smallTargets: [...document.querySelectorAll('.fd-controls button, .sig-arrow, .sig-index button, .fd-card[data-slot="0"] .fd-cta, .sig-item[data-active] .sig-cta')].filter(c => (c as HTMLElement).offsetParent && c.getBoundingClientRect().height < 24).map(c => c.textContent),
    };
  });
  expect(report.overflow).toBe(false);
  expect(report.tiny).toEqual([]);
  expect(report.chipsOutside).toEqual([]);
  expect(report.controlsOutside).toEqual([]);
  expect(report.smallTargets).toEqual([]);
  // Labels never cover the dish's heading or call to action.
  const overlap = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.sig-chip')].map(c => c.getBoundingClientRect()).filter(b => b.width > 0);
    const guard = [...document.querySelectorAll('.sig-item[data-active] :is(.sig-title, .sig-description, .sig-cta)')].map(c => c.getBoundingClientRect());
    return boxes.some(a => guard.some(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1));
  });
  expect(overlap).toBe(false);
  expect(await page.evaluate(() => (window as typeof window & {fdCLS: number}).fdCLS)).toBe(0);
});

/** The join as rendered (central 60% of the width, where the glow and the dish are): `step` is the mean luminance of
 *  the 8 rows just below it minus the 8 just above; `edge` the largest change between neighbouring rows within 3 px
 *  of it. A seam shows in one or the other (the old build: a 5.7 step on phones, a 1.35 edge on desktop). */
async function joinStep(page: Page) {
  const join = await sig(page).evaluate(el => el.getBoundingClientRect().bottom);
  const width = page.viewportSize()!.width;
  const shot = await page.screenshot({clip: {x: Math.round(width * 0.2), y: Math.round(join) - 8, width: Math.round(width * 0.6), height: 16}});
  const scratch = await page.context().newPage();
  const rows = await scratch.evaluate(async data => {
    const img = new Image(); img.src = data; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
    return Array.from({length: img.height}, (_, y) => {const d = g.getImageData(0, y, img.width, 1).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return sum / (d.length / 4);});
  }, `data:image/png;base64,${shot.toString('base64')}`);
  await scratch.close();
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const edge = Math.max(...[5, 6, 7, 8, 9, 10].map(y => Math.abs(rows[y + 1] - rows[y])));
  return {step: +Math.abs(mean(rows.slice(8)) - mean(rows.slice(0, 8))).toFixed(2), edge: +edge.toFixed(2)};
}

// The showcase completes its own composition (dish → fade → breathing space with the guide arcs) and the specials
// section follows in normal flow: no gap, no overlap, no negative margin, nothing of the showcase past its edge,
// and no visible seam where the specials photograph rises out of the same near-black.
for (const width of [1440, 1024, 768, 390, 360]) test(`signature never collapses into the next section at ${width}px (forward, reverse, fast jump)`, async ({page}) => {
  await page.setViewportSize({width, height: width <= 700 ? 844 : width <= 1024 ? 1024 : 900});
  await open(page);
  await expect(sig(page)).toHaveAttribute('data-motion', 'ready');
  const seam = () => sig(page).evaluate(el => el.getBoundingClientRect().bottom + scrollY);
  for (const route of ['forward', 'reverse', 'fast']) {
    if (route === 'reverse') await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
    if (route === 'fast') await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
    await page.evaluate(y => window.scrollTo({top: Math.round(y - innerHeight / 2), behavior: 'instant'}), await seam());
    await still(page);
    const report = await sig(page).evaluate(section => {
      const box = section.getBoundingClientRect();
      const following = section.nextElementSibling as HTMLElement;
      const next = following.getBoundingClientRect();
      // Every piece of content is inside the section, with real spacing before its edge.
      const content = [...section.querySelectorAll('.sig-item[data-active], .sig-nav button, .sig-counter, .sig-index, .sig-group[data-active] .sig-chip, .sig-orbit, .sig-stage')]
        .filter(el => (el as HTMLElement).offsetParent || getComputedStyle(el).position === 'absolute')
        .map(el => ({cls: el.className.toString().split(' ')[0], bottom: el.getBoundingClientRect().bottom}));
      const lowest = Math.max(...content.filter(c => c.cls !== 'sig-orbit').map(c => c.bottom));
      const copy = following.querySelector('.special-copy > *')!.getBoundingClientRect();
      const controls = [...section.querySelectorAll('.sig-nav button, .sig-arrow, .sig-counter, .sig-index button')]
        .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none')
        .map(el => {const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight) return true; const top = document.elementFromPoint(x, y); return !!top && (el === top || el.contains(top));});
      return {
        gap: Math.round(next.top - box.bottom), margin: getComputedStyle(following).marginTop,
        uncontained: content.filter(c => c.bottom > box.bottom + 0.5).map(c => c.cls), air: Math.round(box.bottom - lowest),
        copyBelowJoin: Math.round(copy.top - box.bottom), controlsOnTop: controls.every(Boolean),
        rise: getComputedStyle(following.querySelector('.special-overlay')!).backgroundImage.split('linear-gradient').length - 1,
      };
    });
    expect(report.gap, route).toBe(0); // the next section starts exactly where this one ends
    expect(report.margin, route).toBe('0px'); // in normal flow: no negative margin
    expect(report.uncontained, route).toEqual([]); // nothing of the showcase reaches past its edge
    expect(report.air, route).toBeGreaterThanOrEqual(width > 1100 ? 140 : 52); // intentional breathing space
    expect(report.copyBelowJoin, route).toBeGreaterThanOrEqual(90);
    expect(report.controlsOnTop, route).toBe(true);
    expect(report.rise, route).toBe(3); // the specials photograph rises out of the page colour (plus its own two tints)
    const join = await joinStep(page);
    expect(join.step, `${route}: brightness step across the join`).toBeLessThan(1);
    expect(join.edge, `${route}: sharpest row-to-row change at the join`).toBeLessThan(0.9);
  }
  // The dish layer fades to nothing inside the stage (desktop) or is shown whole (stacked layouts).
  if (width > 1100) await expect(sig(page).locator('.sig-scene')).toHaveCSS('mask-image', /linear-gradient/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('navigating away and back rebuilds both sections cleanly', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await open(page);
  await reach(page, '.sig');
  await sig(page).getByRole('button', {name: 'Next selection'}).click();
  await sig(page).locator('.sig-item[data-active]').getByRole('link').click();
  await expect(page).toHaveURL('/food-menu#appetizers');
  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect(fd(page)).toHaveAttribute('data-motion', 'ready');
  await expect(sig(page)).toHaveAttribute('data-motion', 'ready');
  await reach(page, '.fd');
  await fd(page).getByRole('button', {name: 'Next category'}).click();
  await carouselAtRest(page);
  await expect(activeCard(page)).toHaveAttribute('id', 'fd-card-drinks');
  await reach(page, '.sig');
  await sig(page).getByRole('button', {name: 'Next selection'}).click();
  await showcaseAtRest(page);
  await expect(sig(page).locator('.sig-item[data-active] .sig-title')).toHaveText(ITEMS[1]);
});
