import { test, expect } from '@playwright/test';

test('spacing section expands to show T/R/B/L instead of H/V', async ({ page }) => {
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

  // Click expand button
  const expandBtn = page.locator('.expand-btn[data-expand="spacing"]').first();
  await expandBtn.click();
  await page.waitForTimeout(300);

  // Debug: Check DOM structure
  const containerHtml = await page.evaluate(() => {
    const container = document.querySelector('[data-expand-container="spacing"]');
    return {
      classList: container?.classList.toString(),
      html: container?.outerHTML.substring(0, 500)
    };
  });
  console.log('Container class list:', containerHtml.classList);
  console.log('Container HTML:', containerHtml.html);

  // Check CSS computed style for collapsed row
  const collapsedRowDisplay = await page.evaluate(() => {
    const row = document.querySelector('.collapsed-row');
    if (row) {
      return getComputedStyle(row).display;
    }
    return 'not found';
  });
  console.log('Collapsed row display:', collapsedRowDisplay);

  // Take screenshot
  await page.locator('.property-panel').screenshot({ path: '/tmp/pp-spacing-debug.png' });
});
