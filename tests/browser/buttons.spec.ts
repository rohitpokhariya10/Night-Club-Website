import {test, expect, type Page, type Locator} from '@playwright/test';

/** Directional arrows on buttons and links (BUTTON-MICROINTERACTIONS-REPORT.md): one shared `Arrow` (`.arw`). */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', error => list.push(error.message));
  page.on('console', message => {
    // The 404 page is visited on purpose: the browser logs its 404 response, which is the page working.
    if (message.type() !== 'error' || (page.url().includes('/this-page-does-not-exist') && /status of 404/.test(message.text()))) return;
    list.push(message.text());
  });
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

const MOVE = {'up-right': [4, -4], right: [5, 0], left: [-5, 0], up: [0, -5], down: [0, 5]} as const;
type Dir = keyof typeof MOVE;
const arrowOf = (control: Locator) => control.locator('.arw').first();
/** The arrow's offset (px) from its resting place: the computed `translate`, 'none' meaning at rest. */
const offset = (control: Locator) => arrowOf(control).evaluate(el => {
  const value = getComputedStyle(el).translate;
  if (value === 'none') return [0, 0];
  const [x, y = '0px'] = value.split(' ');
  return [Math.round(parseFloat(x) * 10) / 10, Math.round(parseFloat(y) * 10) / 10];
});
/** Moves the pointer onto the control from outside it, landing near its leading edge (not on the arrow). */
async function hoverControl(page: Page, control: Locator) {
  const box = (await control.boundingBox())!;
  const x = box.x + Math.min(10, box.width / 4);
  const y = box.y + box.height / 2;
  await page.mouse.move(x - 60, y - 60);
  await page.mouse.move(x, y, {steps: 6});
}
async function home(page: Page) {
  await page.goto('/');
  await page.keyboard.press('Shift'); // finish the hero intro
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
}
async function reach(page: Page, control: Locator) {
  await control.evaluate(el => el.scrollIntoView({block: 'center', behavior: 'instant'}));
  await expect.poll(() => page.evaluate(() => new Promise<boolean>(done => {const y = scrollY; setTimeout(() => done(scrollY === y), 250);}))).toBe(true);
}
/** Hover → the arrow moves the way it points and stays inside the control; leave → it eases back. */
async function checkHover(page: Page, control: Locator, dir: Dir, name: string) {
  await expect(arrowOf(control), name).toHaveAttribute('data-arrow', dir);
  await hoverControl(page, control);
  await expect.poll(() => offset(control), name).toEqual([...MOVE[dir]]);
  const inside = await control.evaluate(el => {
    const a = el.querySelector('.arw')!.getBoundingClientRect(); const b = el.getBoundingClientRect();
    return a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;
  });
  expect(inside, `${name}: the moved arrow stays inside its control`).toBe(true);
  await page.mouse.move(1, 1);
  await expect.poll(() => offset(control), name).toEqual([0, 0]);
}

test('every directional icon is the shared arrow, pointing the way its icon does', async ({page}) => {
  for (const path of ['/', '/events', '/gallery', '/contact', '/reservations', '/privacy', '/this-page-does-not-exist']) {
    await page.goto(path);
    const icons = await page.evaluate(() => Array.from(document.querySelectorAll('svg[class*="lucide-arrow"], .arw'), el => ({
      shared: el.classList.contains('arw'), dir: (el as HTMLElement).dataset.arrow ?? '',
      icon: ((el.getAttribute('class') ?? '').match(/lucide-arrow-(up-right|right|left|up|down)\b/) ?? [])[1] ?? (el.textContent ?? '').trim(),
      inControl: !!el.closest('a[href], button'), hidden: el.getAttribute('aria-hidden'),
    })));
    expect(icons.length, path).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(icon.shared, `${path}: ${icon.icon}`).toBe(true);
      expect(icon.inControl, `${path}: ${icon.icon} belongs to a link or button`).toBe(true);
      expect(icon.hidden, `${path}: decorative`).toBe('true');
      if (icon.icon === '←') expect(icon.dir).toBe('left'); else expect(icon.dir, path).toBe(icon.icon);
    }
  }
});

test('hovering a control moves its arrow the way it points, then eases it back (homepage and footer)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await home(page);
  await checkHover(page, page.locator('.cinema-foot a[href="#experience"]'), 'down', 'Discover Jimmy O’s');
  await checkHover(page, page.locator('.cinema-copy .button').first(), 'up-right', 'hero primary button');
  await checkHover(page, page.locator('.header-book'), 'up-right', 'Book a Table (header)');
  for (const [selector, dir, name] of [
    ['.fd-arrow[aria-label="Next category"]', 'right', 'next category'],
    ['.fd-arrow[aria-label="Previous category"]', 'left', 'previous category'],
    ['.sig-next', 'right', 'next selection'],
    ['.sig-prev', 'left', 'previous selection'],
    ['.home-events .event-tile', 'up-right', 'event card'],
    ['.text-link', 'up-right', 'Explore Catering'],
    ['.home-gallery .button', 'up-right', 'Enter the Gallery'],
    ['.ft-top', 'up', 'Back to top'],
    ['.ft-link[href*="maps"]', 'up-right', 'footer address'],
  ] as const) {
    const control = page.locator(selector).first();
    await reach(page, control);
    await checkHover(page, control, dir, name);
  }
  // The round link on the night-out film, once its reveal has finished.
  const film = await page.locator('.night-out-frame').evaluate(el => el.getBoundingClientRect().bottom + scrollY);
  await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(film - 900 * 0.6));
  await page.waitForTimeout(400);
  await checkHover(page, page.locator('.night-out-round'), 'up-right', 'night-out round link');
});

test('the same on internal pages: buttons, the mobile menu, the 404 and the privacy back link', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/nightlife');
  const button = page.locator('main .button').first();
  await reach(page, button);
  await checkHover(page, button, 'up-right', 'nightlife button');
  await page.locator('.menu-toggle').click();
  const menuLink = page.locator('.mobile-menu nav a').first();
  await expect(menuLink).toBeVisible();
  await checkHover(page, menuLink, 'up-right', 'mobile menu link');
  await page.keyboard.press('Escape');
  await page.goto('/this-page-does-not-exist');
  await checkHover(page, page.getByRole('link', {name: 'Back to Jimmy O’s'}), 'up-right', '404 button');
  await page.goto('/privacy');
  await checkHover(page, page.locator('.back-link'), 'left', 'privacy back link');
  await page.goto('/gallery');
  await page.locator('.gallery-tile').first().click();
  const next = page.getByRole('button', {name: 'Next photo'});
  await expect(next).toBeVisible();
  // Let the viewer's opening animation finish, so the button is where the pointer is aimed.
  await expect.poll(async () => {const a = await next.boundingBox(); await page.waitForTimeout(150); const b = await next.boundingBox(); return !!a && !!b && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 0.5;}).toBe(true);
  await checkHover(page, next, 'right', 'lightbox next');
  await checkHover(page, page.getByRole('button', {name: 'Previous photo'}), 'left', 'lightbox previous');
});

test('keyboard focus moves the arrow the same way, and the focus ring stays', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/privacy');
  await page.locator('body').click({position: {x: 5, y: 300}});
  const back = page.locator('.back-link');
  for (let i = 0; i < 40 && !(await back.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(back).toBeFocused();
  await expect.poll(() => offset(back)).toEqual([-5, 0]);
  expect(await back.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.keyboard.press('Tab');
  await expect.poll(() => offset(back)).toEqual([0, 0]);
  // The header's Book a Table, reached from the keyboard.
  const book = page.locator('.header-book');
  await page.goto('/privacy');
  await page.locator('body').click({position: {x: 5, y: 300}});
  for (let i = 0; i < 40 && !(await book.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(book).toBeFocused();
  await expect.poll(() => offset(book)).toEqual([4, -4]);
  expect(await book.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
});

test('the destinations of the directional CTAs are unchanged', async ({page}) => {
  await home(page);
  const expected: [string, string][] = [
    ['.header-book', '/reservations'], ['.cinema-foot a:has(.arw)', '#experience'], ['.night-out-round', '/about'],
    ['.text-link', '/catering'], ['.home-gallery .button', '/gallery'], ['.ft-top', '#top'],
  ];
  for (const [selector, href] of expected) await expect(page.locator(selector).first(), selector).toHaveAttribute('href', href);
  const hero = await page.locator('.cinema-copy .button').evaluateAll(els => els.map(el => [el.textContent?.trim(), el.getAttribute('href')]));
  expect(hero).toEqual([['EXPLORE NIGHTLIFE', '/nightlife'], ['BOOK A TABLE', '/reservations']]);
  // (Back to top's smooth scroll is covered in footer.spec.ts; following a link is covered below and in site.spec.ts.)
  await page.locator('.header-book').click();
  await expect(page).toHaveURL('/reservations');
});

test.describe('reduced motion', () => {
  test.use({reducedMotion: 'reduce'});
  test('arrows never move, but hover and focus still change colour', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto('/privacy');
    const book = page.locator('.header-book');
    const rest = await book.evaluate(el => getComputedStyle(el).backgroundColor);
    await hoverControl(page, book);
    await page.waitForTimeout(400);
    expect(await offset(book)).toEqual([0, 0]);
    expect(await book.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(rest);
    const back = page.locator('.back-link');
    await page.mouse.move(1, 1);
    await page.locator('body').click({position: {x: 5, y: 300}});
    for (let i = 0; i < 40 && !(await back.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(back).toBeFocused();
    await page.waitForTimeout(300);
    expect(await offset(back)).toEqual([0, 0]);
    expect(await back.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  });
});

test.describe('touch', () => {
  test.use({hasTouch: true, isMobile: true, viewport: {width: 390, height: 844}});
  test('a tap leaves no moved arrow and no stuck hover fill', async ({page}) => {
    await page.goto('/');
    const next = page.locator('.fd-arrow[aria-label="Next category"]');
    await next.evaluate(el => el.scrollIntoView({block: 'center', behavior: 'instant'}));
    await page.waitForTimeout(500);
    const rest = await next.evaluate(el => getComputedStyle(el).backgroundColor);
    await next.tap();
    await expect(page.locator('#fd-tab-drinks')).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(500);
    expect(await offset(next)).toEqual([0, 0]);
    expect(await next.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(rest);
    const target = await next.boundingBox();
    expect(Math.min(target!.width, target!.height)).toBeGreaterThanOrEqual(44);
  });
});

test('a disabled (sending) submit button does not animate', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/reservations');
  const submit = page.locator('form.inquiry button.button');
  await reach(page, submit);
  await submit.evaluate(el => {(el as HTMLButtonElement).disabled = true;}); // the state it is in while sending
  await hoverControl(page, submit);
  await page.waitForTimeout(500);
  expect(await offset(submit)).toEqual([0, 0]);
  expect(await submit.evaluate(el => getComputedStyle(el).translate)).toBe('none');
  // Enabled again, it responds.
  await page.mouse.move(1, 1);
  await submit.evaluate(el => {(el as HTMLButtonElement).disabled = false;});
  await checkHover(page, submit, 'up-right', 'submit');
});
