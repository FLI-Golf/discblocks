import { test, expect } from 'playwright/test';

// Canonical-appearance verification: load /master.html in a FRESH browser
// context (empty localStorage) so the avatar comes from SOURCE DEFAULTS, not a
// saved draft. Capture the neutral avatar BEFORE touching any pose slider.
test('canonical male avatar loads from source defaults (empty localStorage)', async ({ page }) => {
  await page.goto('/master.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#canvas').waitFor({ state: 'visible' });
  // Let the rig + jersey texture settle.
  await page.waitForTimeout(1200);

  // Confirm no Master Avatar localStorage was seeded before startup.
  const keys = await page.evaluate(() => Object.keys(window.localStorage));
  const hasBaseline = keys.some((k) => k.startsWith('master-baseline'));

  // Neutral screenshot of the preview canvas (BEFORE touching any pose slider).
  await page
    .locator('#preview')
    .screenshot({ path: 'test-results/canonical/canonical-male-neutral.png' });

  // The avatar rendered from source defaults; no pre-existing baseline draft.
  expect(hasBaseline).toBe(false);
  await expect(page.locator('#canvas')).toBeVisible();
});
