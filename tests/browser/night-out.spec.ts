import {test, expect, type Page} from '@playwright/test';

/** "More than a night out" (#discover): film, typography, scoped motion, fallbacks. */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', error => list.push(error.message));
  page.on('console', message => {if (message.type() === 'error') list.push(message.text());});
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

const section = (page: Page) => page.locator('#discover');
const jump = (page: Page, top: number) => page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(top));
const topOf = (page: Page, selector: string) => page.locator(selector).evaluate(el => el.getBoundingClientRect().top + scrollY);
async function ready(page: Page) {
  await page.goto('/');
  await page.keyboard.press('Shift'); // finish the hero intro
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
}

test('keeps its heading, film and story link, with the Syne/Manrope typography; the old copy block is gone', async ({page}) => {
  await ready(page);
  await expect(section(page).getByRole('heading', {level: 2})).toHaveText('More than a night out.');
  await expect(section(page).locator('.night-out-eyebrow-text')).toHaveText('A Del Mar original');
  expect((await section(page).locator('h2').evaluate(el => getComputedStyle(el).fontFamily)).toLowerCase()).toContain('syne');
  expect((await section(page).locator('.night-out-eyebrow').evaluate(el => getComputedStyle(el).fontFamily)).toLowerCase()).toContain('manrope');
  // The supporting copy, Our Story button, outlined "Good company" type and the icon row were removed from the
  // homepage, not hidden: none of it is in the document.
  const main = page.locator('main[data-home]');
  for (const gone of ['.night-out-copy', '.night-out-lede', '.night-out-aside', '.night-out-ghost', '.experience-strip']) await expect(main.locator(gone)).toHaveCount(0);
  // (The hero's label row repeats "DJ experiences … good company", and the gallery title says "good company";
  // those sections are unchanged, so the text checks are scoped to this section.)
  for (const text of ['A neighborhood bar', 'A dance floor after dark', 'Catch the game, sing karaoke', 'Good company', 'DJ experiences']) await expect(section(page).getByText(text, {exact: false})).toHaveCount(0);
  await expect(main.getByRole('link', {name: 'Our Story'})).toHaveCount(0);
  // The section ends on the film; the next section follows it directly.
  expect(await section(page).evaluate(el => el.lastElementChild?.className)).toBe('night-out-stage');
  expect(await section(page).evaluate(el => el.nextElementSibling?.classList.contains('split-feature'))).toBe(true);
  // The About page is still one click away, through the round link on the film.
  const story = section(page).getByRole('link', {name: 'Discover the Jimmy O’s story'});
  await expect(story).toHaveAttribute('href', '/about');
  const filmBottom = await page.locator('.night-out-frame').evaluate(el => el.getBoundingClientRect().bottom + scrollY);
  await jump(page, filmBottom - (page.viewportSize()?.height ?? 720) * 0.6);
  await expect(story).toBeInViewport();
  await story.click();
  await expect(page).toHaveURL('/about');
  await expect(page.locator('.experience-strip')).toHaveCount(1); // the strip still belongs to About
});

test('hands off to the next section: the film narrows and darkens as it leaves, with no overlap at any size', async ({page}) => {
  for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [1440, 700]]) {
    await page.setViewportSize({width, height});
    await ready(page);
    const bottom = await page.locator('.night-out-frame').evaluate(el => el.getBoundingClientRect().bottom + scrollY);
    // Halfway through the exit range ('bottom 50%' → 'bottom top'): the film's lower edge at a quarter of the viewport.
    await jump(page, bottom - height * 0.25);
    await expect.poll(() => page.locator('.night-out-frame').evaluate(el => getComputedStyle(el).clipPath)).toMatch(/^inset\(0% [1-9]/);
    const m = await page.evaluate(() => {
      const section = document.querySelector('#discover')!;
      const next = section.nextElementSibling!;
      const frame = document.querySelector('.night-out-frame')!.getBoundingClientRect();
      const round = document.querySelector('.night-out-round')!.getBoundingClientRect();
      const content = Math.min(...Array.from(next.querySelectorAll('.script, h2, .stacked-photo'), el => el.getBoundingClientRect().top));
      return {overlap: section.getBoundingClientRect().bottom - next.getBoundingClientRect().top, frameBottom: frame.bottom, roundBottom: round.bottom, content, wide: document.documentElement.scrollWidth - innerWidth};
    });
    expect(m.overlap, `${width}×${height}`).toBeLessThanOrEqual(0.5);
    expect(m.roundBottom, `${width}×${height}`).toBeGreaterThan(m.frameBottom); // the link still sits across the film's edge
    expect(m.content - m.roundBottom, `${width}×${height}`).toBeGreaterThanOrEqual(80); // clear air before the next section
    expect(m.wide, `${width}×${height}`).toBeLessThanOrEqual(0);
  }
});

test('the film loads only when the section is on screen, plays muted inline, and pauses when it leaves', async ({page}) => {
  const videos: string[] = [];
  page.on('request', request => {if (/\.mp4(\?|$)/.test(request.url())) videos.push(request.url());});
  await page.setViewportSize({width: 1440, height: 900});
  await ready(page);
  const frame = page.locator('.night-film');
  await expect(frame.locator('video')).toHaveCount(0);
  expect(videos).toEqual([]);
  await jump(page, await topOf(page, '.night-out-stage') - 300);
  await expect(frame).toHaveAttribute('data-film', 'playing');
  const video = frame.locator('video');
  await expect.poll(() => video.evaluate(v => !(v as HTMLVideoElement).paused && (v as HTMLVideoElement).currentTime > 0.2)).toBe(true);
  const media = await video.evaluate(v => {const film = v as HTMLVideoElement; return {muted: film.muted, loop: film.loop, inline: film.playsInline, controls: film.controls, src: film.currentSrc};});
  expect(media).toMatchObject({muted: true, loop: true, inline: true, controls: false});
  expect(media.src).toContain('jimmy-os-nightlife-desktop.mp4');
  expect(videos.every(url => url.includes('jimmy-os-nightlife-desktop.mp4'))).toBe(true);
  await expect(video).toHaveCSS('opacity', '1');
  await jump(page, 9999999);
  await expect(frame).toHaveAttribute('data-film', 'paused');
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  await jump(page, await topOf(page, '.night-out-stage') - 200);
  await expect(frame).toHaveAttribute('data-film', 'playing');
});

test('phones load the mobile cut', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page);
  await jump(page, await topOf(page, '.night-out-stage') - 200);
  await expect.poll(() => page.locator('.night-film video').evaluate(v => (v as HTMLVideoElement).currentSrc)).toContain('jimmy-os-nightlife-mobile.mp4');
});

test('reduced motion and Save-Data keep the poster: no film, no animation, everything visible', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await jump(page, await topOf(page, '.night-out-stage') - 200);
  await page.waitForTimeout(600);
  await expect(page.locator('.night-film video')).toHaveCount(0);
  await expect(page.locator('.night-film')).toHaveAttribute('data-film', 'poster');
  const poster = page.locator('.night-film-poster img');
  await expect.poll(() => poster.evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect(page.locator('.night-out-frame')).toHaveCSS('clip-path', 'inset(0px)');
  for (const word of await page.locator('.night-out-title .nw > span').all()) await expect(word).toHaveCSS('transform', 'none');

  const saver = await page.context().newPage();
  await saver.addInitScript(() => Object.defineProperty(navigator, 'connection', {value: Object.assign(new EventTarget(), {saveData: true})}));
  await saver.goto('/');
  await saver.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(await saver.locator('.night-out-stage').evaluate(el => el.getBoundingClientRect().top + scrollY - 200)));
  await saver.waitForTimeout(800);
  await expect(saver.locator('.night-film video')).toHaveCount(0);
  await saver.close();
});

test('entrance and film reveal are scroll-driven: cropped letterbox, open frame, and back again in reverse', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await ready(page);
  const stageTop = await topOf(page, '.night-out-stage');
  const clip = () => page.locator('.night-out-frame').evaluate(el => getComputedStyle(el).clipPath);
  const insetTop = async () => Number((await clip()).match(/inset\(([\d.]+)%/)?.[1] ?? 0);
  await jump(page, stageTop - 900);
  await expect.poll(insetTop).toBeGreaterThan(20);
  await jump(page, stageTop - 900 * 0.55);
  await expect.poll(insetTop).toBeLessThan(20);
  await expect.poll(insetTop).toBeGreaterThan(0);
  await jump(page, stageTop - 900 * 0.1);
  await expect.poll(insetTop).toBe(0);
  // Typography has arrived: every headline word is out of its mask.
  for (const word of await page.locator('.night-out-title .nw > span').all()) await expect(word).toHaveCSS('transform', 'none');
  // Reverse: the frame closes back towards the letterbox.
  await jump(page, stageTop - 900);
  await expect.poll(insetTop).toBeGreaterThan(20);
});

test('no layout shift inside the section and no horizontal overflow at any width', async ({page}) => {
  for (const width of [390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({width, height: 900});
    await ready(page);
    await page.evaluate(() => {
      const state = window as typeof window & {nightCLS: number};
      state.nightCLS = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {value: number; hadRecentInput: boolean; sources: {node?: Element}[]};
          if (!shift.hadRecentInput && shift.sources?.some(source => source.node?.closest?.('#discover'))) state.nightCLS += shift.value;
        }
      }).observe({type: 'layout-shift'});
    });
    const top = await topOf(page, '#discover');
    for (const y of [top - 900, top - 400, top, top + 600, top + 1200]) {
      await jump(page, Math.max(0, y));
      await page.waitForTimeout(150);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px y=${y}`).toBe(true);
    }
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as typeof window & {nightCLS: number}).nightCLS), `${width}px`).toBe(0);
  }
});
