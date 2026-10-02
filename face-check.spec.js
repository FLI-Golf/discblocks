const { test, expect } = require('playwright/test');

test('open modal and capture face preview', async ({ page }) => {
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.locator('.group-look-button').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/workspaces/discblocks/face-modal.png', fullPage: true });
  await expect(page.locator('.appearance-modal')).toHaveCount(1);
});
