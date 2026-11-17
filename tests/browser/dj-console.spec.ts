import {test, expect, type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

/**
 * Jimmy O's DJ console and mini player (DJ-CONSOLE-REPORT.md): every control drives the one real audio element and its
 * Web Audio graph; what moves follows the audio; playback survives client-side navigation.
 */
type Player = {
  getSnapshot(): {index: number; status: string; volume: number; muted: boolean; activated: boolean; error: string | null};
  currentTime: number; paused: boolean; created: {elements: number; contexts: number};
  outputLevel(): number; master: GainNode | null; tracks: {title: string}[];
};
const output = 'artifacts/dj-console';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  await mkdir(output, {recursive: true});
  const list: string[] = []; errors.set(page, list);
  page.on('pageerror', e => list.push(e.message));
  page.on('console', m => {if (m.type() === 'error' && !/Failed to load resource.*404/.test(m.text())) list.push(m.text());});
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

const state = (page: Page) => page.evaluate(() => {
  const m = (window as unknown as {__jimmyOsMusic: Player}).__jimmyOsMusic;
  return {...m.getSnapshot(), t: m.currentTime, paused: m.paused, created: m.created, gain: m.master ? m.master.gain.value : null, title: m.tracks[m.getSnapshot().index].title};
});
/** Loudest output (after volume and mute) over ~0.6 s. */
const loudness = (page: Page) => page.evaluate(async () => {
  const m = (window as unknown as {__jimmyOsMusic: Player}).__jimmyOsMusic;
  let max = 0; for (let i = 0; i < 24; i++) {max = Math.max(max, m.outputLevel()); await new Promise(r => setTimeout(r, 25));}
  return max;
});
const recordAngle = (page: Page) => page.locator('.dj-record').evaluate(el => parseFloat((el as HTMLElement).style.transform.replace(/[^\d.-]/g, '')) || 0);
/** Lit LED pixels in the console's spectrum display (unlit LEDs are nearly transparent). */
const litLeds = (page: Page) => page.locator('.dj-meter').evaluate(c => {
  const canvas = c as HTMLCanvasElement, d = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] > 180) lit++;
  return lit;
});
const dj = (page: Page) => page.getByRole('region', {name: 'DJ console'});

async function home(page: Page, width = 1440, height = 900) {
  await page.setViewportSize({width, height});
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as {__jimmyOsMusic?: Player}).__jimmyOsMusic);
  await page.keyboard.press('Shift');
  await dj(page).scrollIntoViewIfNeeded();
  await expect(dj(page)).toBeVisible();
}
async function play(page: Page) {
  await dj(page).getByRole('button', {name: 'Play', exact: true}).click();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
}

test('nothing plays or loads until the visitor presses play; then real audio plays, the record turns and the meter reads it', async ({page}) => {
  await home(page);
  // No autoplay: no audio element, no context, no request, no mini player.
  const requests: string[] = []; page.on('request', r => {if (r.url().includes('/audio/')) requests.push(r.url());});
  await page.waitForTimeout(1500);
  expect(await state(page)).toMatchObject({status: 'idle', activated: false, volume: 0.3, created: {elements: 0, contexts: 0}});
  expect(requests).toEqual([]);
  await expect(page.locator('.music-dock')).toBeHidden();
  await expect(dj(page).getByRole('slider', {name: 'Volume'})).toHaveAttribute('aria-valuenow', '30');
  const restAngle = await recordAngle(page);

  await play(page);
  await expect(dj(page).getByRole('button', {name: 'Pause'})).toHaveAttribute('aria-pressed', 'true');
  await expect(dj(page)).toContainText('Now playing');
  await expect(dj(page)).toContainText('Demo');
  const t0 = (await state(page)).t;
  await page.waitForTimeout(2500);
  const s = await state(page);
  expect(s.t - t0, 'the position advances in real time').toBeGreaterThan(1.8);
  expect(s.volume, 'pressing play never changes the volume').toBe(0.3);
  expect(s.gain!).toBeCloseTo(0.3 ** 1.5, 2);
  expect(await loudness(page), 'sound reaches the output').toBeGreaterThan(0.004);
  // The platter turns at 33⅓ rpm (200°/s) while the element plays.
  const a = await recordAngle(page); await page.waitForTimeout(500); const b = await recordAngle(page);
  expect(((b - a + 360) % 360)).toBeGreaterThan(60);
  expect(a).not.toBe(restAngle);
  // The meter is lit by the analyser's real spectrum (the track's beat has started by now).
  await page.waitForTimeout(2500);
  await expect.poll(() => litLeds(page)).toBeGreaterThan(40);
  await page.screenshot({path: `${output}/playing-1440.png`});
});

test('pause stops the audio and keeps the place; the record brakes and the meter settles; play resumes from there', async ({page}) => {
  await home(page);
  await play(page);
  await page.waitForTimeout(5000);
  await dj(page).getByRole('button', {name: 'Pause'}).click();
  await expect.poll(async () => (await state(page)).status).toBe('paused');
  const held = (await state(page)).t;
  await page.waitForTimeout(1600);
  const s = await state(page);
  expect(s.paused).toBe(true);
  expect(Math.abs(s.t - held), 'position preserved').toBeLessThan(0.05);
  expect(await loudness(page)).toBeLessThan(0.0005);
  const a = await recordAngle(page); await page.waitForTimeout(400);
  expect(await recordAngle(page), 'the platter has stopped').toBeCloseTo(a, 1);
  await expect.poll(() => litLeds(page), {timeout: 4000}).toBe(0);
  await expect(dj(page)).toContainText('Paused');
  await dj(page).getByRole('button', {name: 'Play', exact: true}).click();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.waitForTimeout(800);
  const resumed = (await state(page)).t;
  expect(resumed).toBeGreaterThan(held);
  expect(resumed - held).toBeLessThan(2);
});

test('next and previous: documented rules, wrapping, metadata, playback and volume kept; the track keys play a chosen track', async ({page}) => {
  await home(page);
  await dj(page).getByRole('slider', {name: 'Volume'}).focus();
  await page.keyboard.press('ArrowUp'); // 35 %
  await play(page);
  const next = dj(page).getByRole('button', {name: 'Next track'}), previous = dj(page).getByRole('button', {name: 'Previous track'});
  await next.click();
  await expect.poll(async () => (await state(page)).index).toBe(1);
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await expect(dj(page).locator('.dj-title')).toHaveText('Disco-Pop Demo');
  await expect(dj(page).getByRole('button', {name: /Play track 2:/})).toHaveAttribute('aria-current', 'true');
  // Within the first 3 s, Previous goes back a track…
  await previous.click();
  await expect.poll(async () => (await state(page)).index).toBe(0);
  // …after 3 s, it restarts the current track.
  await page.waitForTimeout(3600);
  await previous.click();
  await expect.poll(async () => (await state(page)).t).toBeLessThan(1.5);
  expect((await state(page)).index).toBe(0);
  // From the first track, Previous wraps to the fifth; Next from the fifth wraps to the first.
  await previous.click();
  await expect.poll(async () => (await state(page)).index).toBe(4);
  await next.click();
  await expect.poll(async () => (await state(page)).index).toBe(0);
  // Track keys: choose track 4, it plays.
  await dj(page).getByRole('button', {name: /Play track 4:/}).click();
  await expect.poll(async () => (await state(page)).index).toBe(3);
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  expect((await state(page)).volume, 'volume unchanged through every change').toBe(0.35);
  // Paused, Next only cues the next track.
  await dj(page).getByRole('button', {name: 'Pause'}).click();
  await next.click();
  await expect.poll(async () => (await state(page)).index).toBe(4);
  await page.waitForTimeout(600);
  expect((await state(page)).paused).toBe(true);
});

test('the knob sets the real volume by drag and keyboard; mute silences and unmute restores; turning up unmutes', async ({page}) => {
  await home(page);
  await play(page);
  await page.waitForTimeout(4500); // into the beat
  const knob = dj(page).getByRole('slider', {name: 'Volume'});
  const quiet = await loudness(page);
  // Drag up 66 px: about +30 %.
  const box = (await knob.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 11; k++) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - k * 6);
  await page.mouse.up();
  const raised = (await state(page)).volume;
  expect(raised).toBeGreaterThan(0.55);
  expect(raised).toBeLessThan(0.65);
  await expect(knob).toHaveAttribute('aria-valuenow', String(Math.round(raised * 100)));
  await expect.poll(async () => (await state(page)).gain!).toBeCloseTo(raised ** 1.5, 2);
  // The knob's visual turn matches the volume: −135° + 270° × v.
  const turn = await knob.evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--turn')));
  expect(turn).toBeCloseTo(-135 + 270 * raised, 0);
  expect(await loudness(page), 'louder at the output').toBeGreaterThan(quiet * 1.6);
  // Keyboard: arrows step 5 %, Home is silent.
  await knob.focus();
  await page.keyboard.press('ArrowDown');
  await expect(knob).toHaveAttribute('aria-valuenow', String(Math.round(raised * 100) - 5));
  await page.keyboard.press('Home');
  await expect(knob).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('PageUp');
  await page.keyboard.press('PageUp');
  await page.keyboard.press('PageUp');
  await expect(knob).toHaveAttribute('aria-valuenow', '30');
  // Mute / unmute.
  const mute = dj(page).getByRole('button', {name: 'Mute'});
  await mute.click();
  await expect(dj(page).getByRole('button', {name: 'Unmute'})).toHaveAttribute('aria-pressed', 'true');
  await expect(knob).toHaveAttribute('aria-valuetext', '30%, muted');
  await page.waitForTimeout(300);
  expect(await loudness(page)).toBeLessThan(0.0005);
  await dj(page).getByRole('button', {name: 'Unmute'}).click();
  await page.waitForTimeout(300);
  expect(await loudness(page)).toBeGreaterThan(0.003);
  // Turning the volume up while muted unmutes, as on real equipment.
  await dj(page).getByRole('button', {name: 'Mute'}).click();
  await knob.focus();
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await state(page)).muted).toBe(false);
});

test('a track that cannot load reports it plainly, and the console keeps working', async ({page}) => {
  await page.route('**/audio/demo/03-*', route => route.fulfill({status: 404, body: ''}));
  await home(page);
  await play(page);
  await dj(page).getByRole('button', {name: /Play track 3:/}).click();
  await expect(dj(page).getByRole('alert')).toContainText('could not');
  expect((await state(page)).status).toBe('error');
  await dj(page).getByRole('button', {name: 'Next track'}).click();
  await dj(page).getByRole('button', {name: 'Play', exact: true}).click().catch(() => {});
  await expect.poll(async () => (await state(page)).index).toBe(3);
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await expect(dj(page).getByRole('alert')).toHaveCount(0);
});

test('music continues through client-side navigation, with one audio element and one context; the mini player and console stay in sync', async ({page}) => {
  test.setTimeout(90000);
  await home(page);
  await play(page);
  await page.evaluate(() => {(window as unknown as {__visit: string}).__visit = 'same document';});
  // On the homepage, the mini player stays out of the console's way while the console is on screen.
  await expect(page.locator('.music-dock')).toBeHidden();
  let last = (await state(page)).t;
  for (const [name, path] of [['Menu', '/food-menu'], ['Events', '/events'], ['Gallery', '/gallery']] as const) {
    await page.locator('.header nav').getByRole('link', {name, exact: true}).click();
    await expect(page).toHaveURL(path);
    await page.waitForTimeout(1200);
    const s = await state(page);
    expect(await page.evaluate(() => (window as unknown as {__visit?: string}).__visit), `${path}: no reload`).toBe('same document');
    expect(s.status, path).toBe('playing');
    expect(s.t, `${path}: never restarted`).toBeGreaterThan(last);
    expect(s.created, path).toEqual({elements: 1, contexts: 1});
    await expect(page.locator('.music-dock'), path).toBeVisible();
    last = s.t;
  }
  await page.screenshot({path: `${output}/mini-player-gallery-1440.png`});
  await page.locator('.header-book').click();
  await expect(page).toHaveURL('/reservations');
  const dock = page.locator('.music-dock');
  // The mini player controls the same audio: next, volume, mute, pause.
  await dock.getByRole('button', {name: 'Next track'}).click();
  await expect.poll(async () => (await state(page)).index).toBe(1);
  await expect(dock).toContainText('Disco-Pop Demo');
  await dock.getByRole('slider', {name: 'Volume'}).focus();
  await page.keyboard.press('ArrowUp');
  expect((await state(page)).volume).toBe(0.35);
  await dock.getByRole('button', {name: 'Mute'}).click();
  expect((await state(page)).muted).toBe(true);
  await dock.getByRole('button', {name: 'Unmute'}).click();
  await dock.getByRole('button', {name: 'Pause'}).click();
  await expect.poll(async () => (await state(page)).status).toBe('paused');
  // Minimise and restore.
  await dock.getByRole('button', {name: 'Minimise music player'}).click();
  await expect(dock.getByRole('button', {name: /Show music player \(paused/})).toBeVisible();
  await dock.getByRole('button', {name: /Show music player/}).click();
  // Home again: the console reflects what happened elsewhere.
  await page.locator('.header .logo').first().click();
  await expect(page).toHaveURL('/');
  await dj(page).scrollIntoViewIfNeeded();
  await expect(dj(page).getByRole('button', {name: 'Play', exact: true})).toHaveAttribute('aria-pressed', 'false');
  await expect(dj(page).locator('.dj-title')).toHaveText('Disco-Pop Demo');
  await expect(dj(page).getByRole('slider', {name: 'Volume'})).toHaveAttribute('aria-valuenow', '35');
  await expect(page.locator('.music-dock')).toBeHidden();
  expect((await state(page)).created).toEqual({elements: 1, contexts: 1});
  expect(await page.locator('audio, video').evaluateAll(els => els.filter(el => !(el as HTMLMediaElement).paused).length)).toBe(0);
});

test('phones: a compact console with touch controls and no horizontal scroll', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const page = await context.newPage();
  const list: string[] = []; page.on('pageerror', e => list.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as {__jimmyOsMusic?: Player}).__jimmyOsMusic);
  await dj(page).scrollIntoViewIfNeeded();
  await dj(page).getByRole('button', {name: 'Play', exact: true}).tap();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await dj(page).getByRole('button', {name: 'Next track'}).tap();
  await expect.poll(async () => (await state(page)).index).toBe(1);
  await dj(page).getByRole('button', {name: 'Mute'}).tap();
  expect((await state(page)).muted).toBe(true);
  for (const control of await dj(page).locator('.dj-btn, .dj-knob, .dj-mute, .dj-track').all()) {
    const b = (await control.boundingBox())!;
    expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(32);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const box = (await dj(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({path: `${output}/playing-390.png`});
  expect(list).toEqual([]);
  await context.close();
});

test('reduced motion: every control works and the music plays, with no turning platter and no animated meter', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await home(page);
  await expect(dj(page)).toHaveCSS('opacity', '1');
  const rest = await recordAngle(page);
  await play(page);
  await page.waitForTimeout(5000);
  expect((await state(page)).t).toBeGreaterThan(3);
  expect(await recordAngle(page)).toBe(rest);
  expect(await litLeds(page)).toBe(0);
  await dj(page).getByRole('button', {name: 'Next track'}).click();
  await expect.poll(async () => (await state(page)).index).toBe(1);
  await page.locator('.header nav').getByRole('link', {name: 'Menu', exact: true}).click();
  await expect(page.locator('.music-dock-vinyl')).toHaveCSS('animation-name', 'none');
});

/** Screen geometry of the tonearm: pivot, a grab point on the tube, the stylus tip and the record centre/radius. */
const arm = (page: Page) => page.evaluate(() => {
  const svg = document.querySelector<SVGSVGElement>('.dj-arm-svg')!, m = svg.getScreenCTM()!, a = Number(svg.dataset.arm) * Math.PI / 180;
  const at = (x: number, y: number) => ({x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f});
  const stylus = document.querySelector<SVGCircleElement>('.dj-stylus')!.getBoundingClientRect();
  return {angle: Number(svg.dataset.arm), needle: svg.dataset.needle, cue: svg.dataset.cue, pivot: at(92, 11), grab: at(92 - 40 * Math.sin(a), 11 + 40 * Math.cos(a)),
    stylus: {x: stylus.x + stylus.width / 2, y: stylus.y + stylus.height / 2}, center: at(50, 50), unit: m.a};
});
/** Take hold of the tube and swing it about the pivot to `to` degrees (the pointer travels on the arm's own arc). */
async function swing(page: Page, to: number) {
  const g = await arm(page), r = Math.hypot(g.grab.x - g.pivot.x, g.grab.y - g.pivot.y);
  await page.mouse.move(g.grab.x, g.grab.y);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    const a = (g.angle + (to - g.angle) * i / 16) * Math.PI / 180;
    await page.mouse.move(g.pivot.x - r * Math.sin(a), g.pivot.y + r * Math.cos(a));
  }
}

test('the tonearm turns about its fixed pivot, within its limits, with the stylus fixed to the arm', async ({page}) => {
  await home(page);
  const rest = await arm(page);
  expect(rest.angle).toBe(0);
  expect(rest.needle).toBe('rest');
  // Hovering the arm offers a grab.
  await page.mouse.move(rest.grab.x, rest.grab.y);
  await expect(page.locator('.dj-arm-hit')).toHaveCSS('cursor', 'grab');
  const reach = Math.hypot(rest.stylus.x - rest.pivot.x, rest.stylus.y - rest.pivot.y);
  await swing(page, 20);
  const held = await arm(page);
  expect(held.needle).toBe('held');
  expect(held.angle).toBeCloseTo(20, 0);
  // Rigid arm: the pivot does not move and the stylus stays the same distance from it.
  expect(Math.hypot(held.pivot.x - rest.pivot.x, held.pivot.y - rest.pivot.y)).toBeLessThan(0.5);
  expect(Math.abs(Math.hypot(held.stylus.x - held.pivot.x, held.stylus.y - held.pivot.y) - reach)).toBeLessThan(1);
  // Limits: it never swings past the run-out (into the label) or back beyond its rest.
  const g = await arm(page), r = Math.hypot(g.grab.x - g.pivot.x, g.grab.y - g.pivot.y);
  await page.mouse.move(g.pivot.x - r * Math.sin(1.4), g.pivot.y + r * Math.cos(1.4)); // ~80°
  const inner = await arm(page);
  expect(inner.angle).toBeLessThan(45);
  const label = 16.3 * inner.unit;
  expect(Math.hypot(inner.stylus.x - inner.center.x, inner.stylus.y - inner.center.y)).toBeGreaterThan(label);
  await page.mouse.move(g.pivot.x + r * Math.sin(0.5), g.pivot.y + r * Math.cos(0.5)); // beyond the rest
  expect((await arm(page)).angle).toBe(0);
  await page.mouse.up();
  await expect.poll(async () => (await arm(page)).needle).toBe('rest');
  expect((await state(page)).activated, 'putting the arm back without a drop plays nothing').toBe(false);
});

test('needle drop: lowered onto a groove it plays from the matching point; lifted it pauses in place; returned to its rest it stays paused', async ({page}) => {
  await home(page);
  // Over the record the display shows where the needle would land.
  await swing(page, 27);
  const over = await arm(page);
  expect(Number(over.cue)).toBeGreaterThan(0.45);
  expect(Number(over.cue)).toBeLessThan(0.75);
  await expect(dj(page).locator('.dj-time')).toContainText('Cue');
  await expect(page.locator('.dj-cue')).toHaveCSS('opacity', '1');
  // The cue follows the stylus's real distance from the centre (outer groove = start, inner = end).
  const radius = Math.hypot(over.stylus.x - over.center.x, over.stylus.y - over.center.y) / over.unit;
  expect(Number(over.cue)).toBeCloseTo((40.5 - radius) / (40.5 - 20), 1);
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  const duration = await page.evaluate(() => (window as unknown as {__jimmyOsMusic: {getSnapshot(): {duration: number}}}).__jimmyOsMusic.getSnapshot().duration);
  const landed = (await state(page)).t;
  expect(landed).toBeGreaterThan(Number(over.cue) * duration - 1);
  expect(landed).toBeLessThan(Number(over.cue) * duration + 2.5);
  expect((await arm(page)).needle).toBe('down');
  expect(await loudness(page)).toBeGreaterThan(0.002);
  // While it plays the arm creeps inward with the real position (and the platter turns).
  const a1 = (await arm(page)).angle; await page.waitForTimeout(2500); const a2 = (await arm(page)).angle;
  expect(a2).toBeGreaterThan(a1);
  expect(a2 - a1).toBeLessThan(2);
  // Lift it: the music pauses and keeps its place.
  await swing(page, a2 + 3);
  await expect.poll(async () => (await state(page)).status).toBe('paused');
  const held = (await state(page)).t;
  await page.waitForTimeout(500);
  expect(Math.abs((await state(page)).t - held)).toBeLessThan(0.05);
  // Release it off the record: it swings back to its rest and the music stays paused, still in place.
  await swing(page, 4);
  await page.mouse.up();
  await expect.poll(async () => (await arm(page)).angle).toBeLessThan(0.1);
  expect((await state(page)).status).toBe('paused');
  expect(Math.abs((await state(page)).t - held)).toBeLessThan(0.05);
  // Play from the rest: the arm returns to the groove for that position.
  await dj(page).getByRole('button', {name: 'Play', exact: true}).click();
  await expect.poll(async () => (await arm(page)).angle).toBeGreaterThan(20);
  await expect.poll(async () => (await state(page)).status).toBe('playing');
});

test('next track brings the arm back to the lead-in; the seek slider moves position and arm together from the keyboard', async ({page}) => {
  await home(page);
  await swing(page, 30);
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  const deep = (await arm(page)).angle;
  await dj(page).getByRole('button', {name: 'Next track'}).click();
  await expect.poll(async () => (await state(page)).index).toBe(1);
  await expect.poll(async () => (await arm(page)).angle).toBeLessThan(deep - 8);
  await expect.poll(async () => (await arm(page)).angle).toBeLessThan(17);
  // Keyboard seeking (the accessible equivalent of the needle).
  await dj(page).getByRole('button', {name: 'Pause'}).click();
  const seek = dj(page).getByRole('slider', {name: 'Track position'});
  await seek.focus();
  const before = (await state(page)).t, angle = (await arm(page)).angle;
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await state(page)).t).toBeGreaterThan(before + 8);
  await expect.poll(async () => (await arm(page)).angle).toBeGreaterThan(angle + 1);
  await expect(seek).toHaveAttribute('aria-valuetext', /of 1:2\d/);
  expect((await state(page)).status).toBe('paused');
});
