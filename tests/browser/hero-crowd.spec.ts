import {test, expect, type Page} from '@playwright/test';

const fingerprint = (page: Page) => page.locator('.hero-crowd canvas').evaluateAll(elements => elements.map(element => {
  const canvas = element as HTMLCanvasElement;
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  let hash = 2166136261;
  for (let i = 0; i < data.length; i += 4 * 31) hash = Math.imul(hash ^ data[i] ^ data[i + 3], 16777619);
  return hash >>> 0;
}));

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`crowd phones stay tiny and the whole renderer pauses in reduced motion at ${width}px`, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
    await page.setViewportSize({width, height});
    await page.goto('/');
    await page.keyboard.press('Shift');
    await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
    const phones = await page.locator('.hero-crowd canvas[data-depth="back"]').evaluate(element => {
      const canvas = element as HTMLCanvasElement;
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let cool = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        // Warm silhouettes/rims have red >= blue. Only the small screens carry this cool fill.
        if (pixels[i + 3] > 120 && pixels[i] > 22 && pixels[i + 2] > pixels[i] + 5 && pixels[i + 1] > pixels[i] + 3) cool++;
      }
      return {cool, area: canvas.width * canvas.height};
    });
    expect(phones.cool).toBeGreaterThan(2);
    expect(phones.cool / phones.area).toBeLessThan(0.004);
    const moving = await fingerprint(page);
    await page.waitForTimeout(350);
    expect(await fingerprint(page)).not.toEqual(moving);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await expect(page.locator('.cinema-hero')).not.toHaveAttribute('data-ambient');
    const still = await fingerprint(page);
    // Cross the first possible phone-flash time; no dance, glow, or flash changes are allowed.
    await page.waitForTimeout(10000);
    expect(await fingerprint(page)).toEqual(still);
    await expect(page.locator('.hero-atmosphere')).toHaveCSS('opacity', '1');
    await expect(page.locator('h1')).toHaveText('DEL MAR AFTER DARK.');
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
    await expect(page.locator('.hero-crowd canvas')).toHaveCount(2);
    await expect(page.locator('.cinema-hero')).not.toHaveClass(/is-intro/);
    await page.screenshot({path: `artifacts/hero-crowd/after-${width}.png`});
    expect(errors).toEqual([]);
  });
}
