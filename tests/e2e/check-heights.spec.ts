import { test, expect } from '@playwright/test';

test('comprehensive height check including containers', async ({ page }) => {
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

  // Measure containers AND elements
  const measurements = await page.evaluate(() => {
    const results: Record<string, number[]> = {
      'toggle-group': [],
      'toggle-btn': [],
      'token-group': [],
      'token-btn': [],
      'prop-input': [],
      'color-group': [],
      'color-swatch': [],
      'prop-select': []
    };

    const panel = document.querySelector('.pp-content');
    if (!panel) return results;

    // Measure containers
    panel.querySelectorAll('.toggle-group').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) results['toggle-group'].push(Math.round(rect.height * 100) / 100);
    });

    panel.querySelectorAll('.token-group').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) results['token-group'].push(Math.round(rect.height * 100) / 100);
    });

    panel.querySelectorAll('.color-group').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) results['color-group'].push(Math.round(rect.height * 100) / 100);
    });

    // Measure elements
    panel.querySelectorAll('.toggle-btn').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) results['toggle-btn'].push(Math.round(rect.height * 100) / 100);
    });

    panel.querySelectorAll('.token-btn').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) results['token-btn'].push(Math.round(rect.height * 100) / 100);
    });

    panel.querySelectorAll('.prop-input, input[type="text"]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) results['prop-input'].push(Math.round(rect.height * 100) / 100);
    });

    panel.querySelectorAll('.color-swatch').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) results['color-swatch'].push(Math.round(rect.height * 100) / 100);
    });

    panel.querySelectorAll('.prop-select, select').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) results['prop-select'].push(Math.round(rect.height * 100) / 100);
    });

    return results;
  });

  console.log('=== CONTAINER & ELEMENT HEIGHTS ===');
  for (const [key, values] of Object.entries(measurements)) {
    const unique = [...new Set(values)];
    console.log(`${key}: ${unique.join(', ')} (${values.length} elements)`);
  }

  // Take screenshot
  await page.locator('.property-panel').screenshot({ path: '/tmp/pp-heights-check.png' });
});
