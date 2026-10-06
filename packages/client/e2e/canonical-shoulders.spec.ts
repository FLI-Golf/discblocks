import { test, expect } from 'playwright/test';

// Capture the canonical male avatar (source defaults, empty localStorage) in
// NEUTRAL pose for visual review of the jersey shoulder caps. No pose sliders.
test('canonical male neutral — jersey shoulders', async ({ page }) => {
  await page.goto('/master.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#canvas').waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);
  await page
    .locator('#preview')
    .screenshot({ path: 'test-results/canonical/canonical-male-jersey-shoulders.png' });
  await expect(page.locator('#canvas')).toBeVisible();
});
