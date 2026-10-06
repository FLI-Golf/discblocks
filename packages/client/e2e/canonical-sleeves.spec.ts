import { test, expect } from 'playwright/test';

// Capture the canonical male avatar (source defaults, empty localStorage) in
// NEUTRAL pose for visual sleeve review. No pose sliders are touched.
test('canonical male neutral — sleeves fixed', async ({ page }) => {
  await page.goto('/master.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#canvas').waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);
  await page
    .locator('#preview')
    .screenshot({ path: 'test-results/canonical/canonical-male-neutral-sleeves-fixed.png' });
  await expect(page.locator('#canvas')).toBeVisible();
});
