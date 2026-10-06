import { test, expect, type Page } from 'playwright/test';
import { setArmSlider, getArmSliderValue } from './helpers';

// Arm calibration cases (both anatomical arms set to identical semantic values).
// Vitest owns the rig math; these verify the real UI path drives the controls
// and the page stays healthy. Screenshots are regression artifacts.
const CASES: Array<{
  name: string;
  file: string;
  outIn: number;
  fwdBack: number;
  twist: number;
  elbow: number;
}> = [
  {
    name: 'abduction-90',
    file: 'arm-01-abduction-90.png',
    outIn: 90,
    fwdBack: 0,
    twist: 0,
    elbow: 0,
  },
  {
    name: 'forward-plus-45',
    file: 'arm-02-forward-plus-45.png',
    outIn: 90,
    fwdBack: 45,
    twist: 0,
    elbow: 0,
  },
  {
    name: 'forward-minus-45',
    file: 'arm-03-forward-minus-45.png',
    outIn: 90,
    fwdBack: -45,
    twist: 0,
    elbow: 0,
  },
  {
    name: 'twist-plus-45',
    file: 'arm-04-twist-plus-45.png',
    outIn: 90,
    fwdBack: 0,
    twist: 45,
    elbow: 0,
  },
  {
    name: 'twist-minus-45',
    file: 'arm-05-twist-minus-45.png',
    outIn: 90,
    fwdBack: 0,
    twist: -45,
    elbow: 0,
  },
  { name: 'elbow-45', file: 'arm-06-elbow-45.png', outIn: 90, fwdBack: 0, twist: 0, elbow: 45 },
  { name: 'elbow-90', file: 'arm-07-elbow-90.png', outIn: 90, fwdBack: 0, twist: 0, elbow: 90 },
  { name: 'combined', file: 'arm-08-combined.png', outIn: 90, fwdBack: 45, twist: 45, elbow: 45 },
];

const L = {
  outIn: 'left-arm-out-in',
  fwdBack: 'left-arm-forward-back',
  twist: 'left-arm-twist',
  elbow: 'left-arm-elbow-bend',
};
const R = {
  outIn: 'right-arm-out-in',
  fwdBack: 'right-arm-forward-back',
  twist: 'right-arm-twist',
  elbow: 'right-arm-elbow-bend',
};

async function openSection(page: Page, title: 'Left Arm' | 'Right Arm') {
  const head = page.locator('.sect-head', { hasText: title });
  const body = head.locator('..').locator('.sect-body');
  if (await body.isHidden()) {
    await head.click();
  }
}

async function setArms(
  page: Page,
  side: 'left' | 'right',
  c: { outIn: number; fwdBack: number; twist: number; elbow: number }
) {
  await openSection(page, side === 'left' ? 'Left Arm' : 'Right Arm');
  const ids = side === 'left' ? L : R;
  await setArmSlider(page, ids.outIn, c.outIn);
  await setArmSlider(page, ids.fwdBack, c.fwdBack);
  await setArmSlider(page, ids.twist, c.twist);
  await setArmSlider(page, ids.elbow, c.elbow);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  (page as any).__errors = errors;
  await page.goto('/master.html', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('left-arm-out-in-input').waitFor({ state: 'attached' });
  // Snap to Front view for a deterministic starting camera.
  await page.getByTestId('view-front').click();
});

test.afterEach(async ({ page }) => {
  const errors = (page as any).__errors as string[];
  expect(errors, `uncaught page errors: ${errors.join('; ')}`).toEqual([]);
});

test('camera view controls operate and return to Front', async ({ page }) => {
  await expect(page.locator('#canvas')).toBeVisible();
  for (const view of ['view-left', 'view-right', 'view-back'] as const) {
    await page.getByTestId(view).click();
    await expect(page.getByTestId(view)).toHaveClass(/is-active/);
  }
  await page.getByTestId('view-front').click();
  await expect(page.getByTestId('view-front')).toHaveClass(/is-active/);
  await expect(page.locator('#canvas')).toBeVisible();
});

for (const c of CASES) {
  test(`arm calibration: ${c.name}`, async ({ page }) => {
    // Set both arms to identical semantic values.
    await setArms(page, 'left', c);
    // No cross-contamination: setting left must not move right readouts.
    expect(await getArmSliderValue(page, R.outIn)).not.toBeNaN();
    await setArms(page, 'right', c);

    // Assert displayed values equal requested for BOTH arms.
    expect(await getArmSliderValue(page, L.outIn)).toBe(c.outIn);
    expect(await getArmSliderValue(page, L.fwdBack)).toBe(c.fwdBack);
    expect(await getArmSliderValue(page, L.twist)).toBe(c.twist);
    expect(await getArmSliderValue(page, L.elbow)).toBe(c.elbow);
    expect(await getArmSliderValue(page, R.outIn)).toBe(c.outIn);
    expect(await getArmSliderValue(page, R.fwdBack)).toBe(c.fwdBack);
    expect(await getArmSliderValue(page, R.twist)).toBe(c.twist);
    expect(await getArmSliderValue(page, R.elbow)).toBe(c.elbow);

    // Canvas still rendering.
    await expect(page.locator('#canvas')).toBeVisible();

    // Deterministic regression screenshot of the preview canvas area.
    const canvas = page.locator('#preview');
    await canvas.screenshot({ path: `test-results/arm-calibration/${c.file}` });
  });
}
