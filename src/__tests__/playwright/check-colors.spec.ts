import { test } from '@playwright/test';

test('check color section', async ({ page }) => {
  await page.goto('/studio/');
  await page.waitForTimeout(1000);

  // Close color picker if visible
  const colorPicker = page.locator('#color-picker');
  if (await colorPicker.isVisible()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // Click on element to select it
  const mirrorElement = page.locator('[data-mirror-id]').first();
  await mirrorElement.click({ force: true });
  await page.waitForTimeout(500);

  // Take screenshot
  await page.locator('.property-panel').screenshot({ path: '/tmp/pp-colors.png' });
});
