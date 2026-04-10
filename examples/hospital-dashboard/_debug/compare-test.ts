import { test, expect } from '@playwright/test';

test('Staff Item: HTML vs Mirror', async ({ page }) => {
  // HTML Version
  await page.goto('file:///Users/toni.steimle/Documents/Dev/Mirror/examples/hospital-dashboard/staff-item-html.html');
  await page.waitForTimeout(1000);
  const htmlScreenshot = await page.screenshot();

  // Mirror Version
  await page.goto('file:///Users/toni.steimle/Documents/Dev/Mirror/examples/hospital-dashboard/staff-item-mirror.html');
  await page.waitForTimeout(1000);

  // Vergleich mit 0.1% Toleranz
  await expect(page).toHaveScreenshot('staff-item-baseline.png', {
    maxDiffPixelRatio: 0.001  // 0.1% Pixel-Differenz erlaubt
  });
});

test('Sidebar: HTML vs Mirror', async ({ page }) => {
  await page.goto('file:///Users/toni.steimle/Documents/Dev/Mirror/examples/hospital-dashboard/sidebar-html.html');
  await page.waitForTimeout(3000); // Icons brauchen Zeit
  const htmlScreenshot = await page.screenshot();

  await page.goto('file:///Users/toni.steimle/Documents/Dev/Mirror/examples/hospital-dashboard/sidebar-mirror.html');
  await page.waitForTimeout(3000);

  await expect(page).toHaveScreenshot('sidebar-baseline.png', {
    maxDiffPixelRatio: 0.001
  });
});
