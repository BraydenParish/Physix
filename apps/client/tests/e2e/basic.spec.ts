import { expect, test } from '@playwright/test';

test('page loads and W moves player forward', async ({ page }) => {
  await page.goto('/');

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const overlay = page.locator('#overlay');
  await overlay.click();

  await expect.poll(async () => page.evaluate(() => window.__debug?.isRunning() ?? false)).toBe(true);

  const before = await page.evaluate(() => window.__debug?.getPlayer());

  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.waitForTimeout(200);

  const after = await page.evaluate(() => window.__debug?.getPlayer());

  expect(before).toBeTruthy();
  expect(after).toBeTruthy();
  if (before && after) {
    const deltaZ = after.position.z - before.position.z;
    expect(Math.abs(deltaZ)).toBeGreaterThan(0.05);
  }
});
