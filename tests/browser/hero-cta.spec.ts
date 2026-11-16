import {test, expect} from '@playwright/test';

// The hero now ends with the supporting copy. Booking belongs to the unchanged header.
for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [375, 667]]) {
  test(`the hero has no CTA row and the header booking link still works at ${width}px`, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({width, height});
    await page.goto('/');
    await page.keyboard.press('Shift');
    await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
    await expect(page.locator('.cinema-copy .actions, .cinema-copy .button')).toHaveCount(0);
    await expect(page.locator('.cinema-hero')).not.toContainText(/EXPLORE NIGHTLIFE|BOOK A TABLE/);
    await expect(page.locator('h1')).toHaveText('DEL MAR AFTER DARK.');
    await expect(page.locator('.hero-description')).toHaveText('Come for the drinks. Stay for the music. Leave with a story.');
    const heading = await page.locator('h1').boundingBox();
    const description = await page.locator('.hero-description').boundingBox();
    const header = await page.locator('.header').boundingBox();
    expect(heading!.y).toBeGreaterThan(header!.y + header!.height + 24);
    expect(description!.y).toBeGreaterThan(heading!.y + heading!.height);
    expect(description!.y + description!.height).toBeLessThan(height * 0.68);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const booking = page.locator('.header-book');
    await expect(booking).toBeVisible();
    await expect(booking).toHaveAttribute('href', '/reservations');
    await booking.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/reservations');
    expect(errors).toEqual([]);
  });
}

test('reduced motion keeps the text-only composition and header booking available', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await expect(page.locator('.cinema-hero')).not.toHaveAttribute('data-ambient');
  await expect(page.locator('.hero-skip')).toBeHidden();
  await expect(page.locator('.cinema-copy .actions, .cinema-copy .button')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
  await expect(page.locator('.hero-description')).toBeVisible();
  await expect(page.locator('.header-book')).toBeVisible();
});
