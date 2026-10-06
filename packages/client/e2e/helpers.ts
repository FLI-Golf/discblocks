import { expect, type Page } from 'playwright/test';

// Set a Master Avatar range slider by its data-testid and dispatch the same
// 'input' event the real UI listens for. Then assert the associated <output>
// (data-testid="<id>-value") reflects the requested degree value.
export async function setArmSlider(page: Page, testId: string, value: number): Promise<void> {
  const input = page.getByTestId(`${testId}-input`);
  await input.waitFor({ state: 'attached' });
  // Set the value via the real element and dispatch 'input' so the page's
  // listener fires (the page listens for 'input', not 'change').
  await input.evaluate((el, v) => {
    const inputEl = el as HTMLInputElement;
    inputEl.value = String(v);
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  const valueEl = page.getByTestId(`${testId}-value`);
  await expect(valueEl).toHaveText(`${value}°`);
}

// Read the displayed value (degrees) for a slider.
export async function getArmSliderValue(page: Page, testId: string): Promise<number> {
  const text = await page.getByTestId(`${testId}-value`).innerText();
  return Number.parseInt(text.replace('°', '').trim(), 10);
}
