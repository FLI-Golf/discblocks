const { test } = require('@playwright/test');

test('debug app', async ({ page }) => {
  page.on('console', (msg) => console.log('BROWSER_CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE_ERROR', err.message));
  page.on('requestfailed', (req) =>
    console.log('REQUEST_FAILED', req.url(), req.failure()?.errorText)
  );
  page.on('response', async (res) => {
    if (res.url().includes('/models/')) console.log('MODEL_RESPONSE', res.url(), res.status());
  });

  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  const info = await page.evaluate(() => ({
    title: document.title,
    canvasCount: document.querySelectorAll('canvas').length,
    bodyText: document.body.innerText.slice(0, 200),
    width: window.innerWidth,
    height: window.innerHeight,
    canvas: (() => {
      const c = document.querySelector('#canvas');
      return c
        ? {
            width: c.width,
            height: c.height,
            clientWidth: c.clientWidth,
            clientHeight: c.clientHeight,
          }
        : null;
    })(),
  }));

  console.log('INFO', JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'debug-shot.png', fullPage: true });
});
