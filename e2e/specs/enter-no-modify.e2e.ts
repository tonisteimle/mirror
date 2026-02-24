import { test, expect } from '@playwright/test';

test('Button "Label" should not be modified on Enter', async ({ page }) => {
  // Capture ALL console messages
  const logs: string[] = [];
  page.on('console', msg => {
    logs.push(msg.text());
  });

  // Capture network requests
  const apiCalls: string[] = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('openrouter') || url.includes('anthropic')) {
      apiCalls.push('API CALL: ' + req.method() + ' ' + url);
    }
  });

  await page.goto('http://localhost:5173/mirror/app/');
  await page.waitForSelector('.cm-editor', { timeout: 10000 });
  await page.click('.cm-editor');

  await page.keyboard.press('Meta+a');
  await page.keyboard.type('Button "Label"', { delay: 50 });
  await page.waitForTimeout(300);

  const beforeEnter = await page.locator('.cm-content').innerText();
  console.log('Before Enter:', JSON.stringify(beforeEnter.split('\n')[0]));

  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  // Print debug logs
  console.log('--- DEBUG LOGS ---');
  logs.filter(l => l.includes('DEBUG')).forEach(l => console.log(l));
  console.log('--- API CALLS ---');
  apiCalls.forEach(c => console.log(c));
  console.log('--- END ---');

  const afterEnter = await page.locator('.cm-content').innerText();
  console.log('After Enter:', JSON.stringify(afterEnter.split('\n')[0]));

  const firstLine = afterEnter.split('\n')[0].trim();
  expect(firstLine).toBe('Button "Label"');
});
