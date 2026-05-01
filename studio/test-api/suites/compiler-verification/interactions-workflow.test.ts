/**
 * Compiler Verification — Interactions: Workflow, Rapid
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { colorsMatch } from './_helpers'

// =============================================================================
// 49. Interaction Tests - Complex Workflows
// =============================================================================

export const interactionWorkflowTests: TestCase[] = describe('Interaction: Workflows', [
  testWithSetup(
    'Like button workflow',
    `likes: 0

Frame hor, gap 8, pad 16, bg #1a1a1a, rad 8, ver-center
  Button pad 8, bg #333, rad 6, toggle()
    Icon "heart", ic #888, is 20
    on:
      bg #ef4444
      Icon "heart", ic white, is 20, fill
  Text "$likes likes", col white`,
    async (api: TestAPI) => {
      // Click like button
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Button should be toggled (red background)
      const btn = api.preview.inspect('node-2')
      api.assert.ok(btn, 'btn should exist')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#ef4444'),
        `Like button should be red, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Form submission workflow',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Input placeholder "Enter name", bg #333, col white, pad 12, rad 6
  Button "Submit", bg #2271C1, col white, pad 10 20, rad 6, toggle()
    on:
      bg #10b981
      Text "Submitted"`,
    async (api: TestAPI) => {
      // Focus input
      await api.interact.focus('node-2')
      await api.utils.delay(50)

      // Click submit
      await api.interact.click('node-3')
      await api.utils.delay(100)

      // Submit button should change state
      const submitBtn = api.preview.inspect('node-3')
      api.assert.ok(submitBtn, 'submitBtn should exist')
      api.assert.ok(
        colorsMatch(submitBtn.styles.backgroundColor, '#10b981'),
        `Submit button should be green, got ${submitBtn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Cart increment workflow',
    `quantity: 1

Frame pad 16, bg #1a1a1a, rad 8, gap 12
  Text "Product XYZ", col white, fs 18, weight bold
  Frame hor, gap 12, ver-center
    Button "-", w 36, h 36, bg #333, col white, rad 6, center, decrement(quantity)
    Text "$quantity", col white, fs 20, w 40, center
    Button "+", w 36, h 36, bg #333, col white, rad 6, center, increment(quantity)
  Text "Add to Cart", bg #2271C1, col white, pad 12, rad 6, center, cursor pointer`,
    async (api: TestAPI) => {
      // Initial quantity is 1
      let qtyText = api.preview.inspect('node-5')
      api.assert.ok(qtyText, 'qtyText should exist')
      api.assert.ok(
        qtyText?.fullText === '1' || qtyText?.textContent === '1',
        `Initial quantity should be 1, got "${qtyText?.fullText}"`
      )

      // Click + three times
      for (let i = 0; i < 3; i++) {
        await api.interact.click('node-6')
        await api.utils.delay(50)
      }
      await api.utils.delay(100)

      // Quantity should be 4
      qtyText = api.preview.inspect('node-5')
      api.assert.ok(qtyText, 'qtyText should exist')
      api.assert.ok(
        qtyText?.fullText === '4' || qtyText?.textContent === '4',
        `After 3 increments should be 4, got "${qtyText?.fullText}"`
      )

      // Click - once
      await api.interact.click('node-4')
      await api.utils.delay(100)

      // Quantity should be 3
      qtyText = api.preview.inspect('node-5')
      api.assert.ok(qtyText, 'qtyText should exist')
      api.assert.ok(
        qtyText?.fullText === '3' || qtyText?.textContent === '3',
        `After decrement should be 3, got "${qtyText?.fullText}"`
      )
    }
  ),
])

// =============================================================================
// 50. Interaction Tests - Rapid Interactions
// =============================================================================

export const interactionRapidTests: TestCase[] = describe('Interaction: Rapid Operations', [
  testWithSetup(
    'Rapid toggle clicks',
    `Button "Rapid", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      // Click 10 times rapidly
      for (let i = 0; i < 10; i++) {
        await api.interact.click('node-1')
        await api.utils.delay(20)
      }
      await api.utils.delay(100)

      // After 10 clicks (even), should be off
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn, 'btn should exist')
      api.assert.ok(
        colorsMatch(btn.styles.backgroundColor, '#333'),
        `After 10 clicks should be off, got ${btn.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Rapid counter increments',
    `count: 0

Frame hor, gap 8, ver-center
  Button "+", bg #333, col white, pad 8 16, rad 6, increment(count)
  Text "$count", col white, fs 24, w 60, center`,
    async (api: TestAPI) => {
      // Click + 5 times rapidly
      for (let i = 0; i < 5; i++) {
        await api.interact.click('node-2')
        await api.utils.delay(30)
      }
      await api.utils.delay(150)

      // Count should be 5
      const text = api.preview.inspect('node-3')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText === '5' || text?.textContent === '5',
        `After 5 rapid increments should be 5, got "${text?.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Rapid exclusive selection',
    `Frame hor, gap 4
  Button "1", pad 8 12, bg #333, col white, rad 4, exclusive(), selected
    selected: bg #2271C1
  Button "2", pad 8 12, bg #333, col white, rad 4, exclusive()
    selected: bg #2271C1
  Button "3", pad 8 12, bg #333, col white, rad 4, exclusive()
    selected: bg #2271C1`,
    async (api: TestAPI) => {
      // Rapidly click through all buttons
      await api.interact.click('node-2')
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(30)
      await api.interact.click('node-4')
      await api.utils.delay(30)
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Button 1 should be selected
      const btn1 = api.preview.inspect('node-2')
      api.assert.ok(btn1, 'btn1 should exist')
      api.assert.ok(
        colorsMatch(btn1.styles.backgroundColor, '#2271C1'),
        `Button 1 should be selected, got ${btn1.styles.backgroundColor}`
      )
    }
  ),
])
