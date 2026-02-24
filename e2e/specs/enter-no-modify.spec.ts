import { test, expect } from '@playwright/test';

test('Button "Label" should not be modified on Enter', async ({ page }) => {
  await page.goto('http://localhost:5175/mirror/app/');
  
  // Wait for editor to load
  await page.waitForSelector('.cm-editor');
  
  // Click on the editor to focus
  await page.click('.cm-editor');
  
  // Clear and type Button "Label"
  await page.keyboard.press('Meta+a');
  await page.keyboard.type('Button "Label"');
  
  // Wait a bit for any processing
  await page.waitForTimeout(200);
  
  // Get the current content before Enter
  const beforeEnter = await page.locator('.cm-content').innerText();
  console.log('Before Enter:', beforeEnter.trim());
  
  // Press Enter
  await page.keyboard.press('Enter');
  
  // Wait for any async processing
  await page.waitForTimeout(500);
  
  // Get content after Enter
  const afterEnter = await page.locator('.cm-content').innerText();
  console.log('After Enter:', afterEnter.trim());
  
  // The first line should still be Button "Label", not Button hor"Label"
  const firstLine = afterEnter.split('\n')[0].trim();
  expect(firstLine).toBe('Button "Label"');
  expect(firstLine).not.toContain('hor');
});
