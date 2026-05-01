/**
 * playwright-html5-drag Tests
 *
 * Run with: npx playwright test
 */

import { test, expect } from '@playwright/test'
import { drag, dragMultiMime, getElementRect } from '../src'

test.describe('playwright-html5-drag', () => {
  test.beforeEach(async ({ page }) => {
    // Create a simple test page with drag-drop handlers
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          #drop-zone {
            width: 300px;
            height: 200px;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          #drop-zone.dragover { border-color: blue; }
          #drop-zone.dropped { border-color: green; background: #e0ffe0; }
        </style>
      </head>
      <body>
        <div id="drop-zone">Drop here</div>
        <div id="result"></div>
        <script>
          const zone = document.getElementById('drop-zone');
          const result = document.getElementById('result');

          zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
          });

          zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
          });

          zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            zone.classList.add('dropped');

            const data = e.dataTransfer.getData('application/json');
            result.textContent = data;
            result.dataset.received = 'true';
          });
        </script>
      </body>
      </html>
    `)
  })

  test('drag with custom MIME type', async ({ page }) => {
    const result = await drag(page, {
      mimeType: 'application/json',
      data: { type: 'widget', id: 42 },
      targetSelector: '#drop-zone',
    })

    expect(result.success).toBe(true)
    expect(result.targetFound).toBe(true)
    expect(result.eventsPrevented.drop).toBe(true)

    // Verify drop was received
    const resultText = await page.locator('#result').textContent()
    expect(resultText).toContain('widget')
    expect(resultText).toContain('42')
  })

  test('drag with position', async ({ page }) => {
    const rect = await getElementRect(page, '#drop-zone')
    expect(rect).not.toBeNull()

    const result = await drag(page, {
      mimeType: 'application/json',
      data: { x: 10, y: 20 },
      targetSelector: '#drop-zone',
      position: { x: rect!.x + 50, y: rect!.y + 50 },
    })

    expect(result.success).toBe(true)

    // Verify zone has dropped class
    const hasClass = await page
      .locator('#drop-zone')
      .evaluate(el => el.classList.contains('dropped'))
    expect(hasClass).toBe(true)
  })

  test('drag to non-existent target fails gracefully', async ({ page }) => {
    const result = await drag(page, {
      mimeType: 'application/json',
      data: { test: true },
      targetSelector: '#does-not-exist',
    })

    expect(result.success).toBe(false)
    expect(result.targetFound).toBe(false)
    expect(result.error).toContain('Target not found')
  })

  test('dragMultiMime with multiple types', async ({ page }) => {
    // Update page to handle multiple MIME types
    await page.evaluate(() => {
      const zone = document.getElementById('drop-zone')!
      const result = document.getElementById('result')!

      zone.addEventListener(
        'drop',
        e => {
          const json = e.dataTransfer?.getData('application/json') || ''
          const text = e.dataTransfer?.getData('text/plain') || ''
          result.dataset.json = json
          result.dataset.text = text
        },
        { once: true }
      )
    })

    const result = await dragMultiMime(page, {
      data: {
        'application/json': { type: 'widget' },
        'text/plain': 'Plain text fallback',
      },
      targetSelector: '#drop-zone',
    })

    expect(result.success).toBe(true)

    // Verify both MIME types were received
    const jsonData = await page.locator('#result').getAttribute('data-json')
    const textData = await page.locator('#result').getAttribute('data-text')

    expect(jsonData).toContain('widget')
    expect(textData).toBe('Plain text fallback')
  })

  test('getElementRect returns correct dimensions', async ({ page }) => {
    const rect = await getElementRect(page, '#drop-zone')

    expect(rect).not.toBeNull()
    // Width/height includes border (2px * 2 = 4px)
    expect(rect!.width).toBeGreaterThanOrEqual(300)
    expect(rect!.height).toBeGreaterThanOrEqual(200)
  })
})
