/**
 * Compiler Verification — Complex Combinations
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 19. Complex Combinations
// =============================================================================

export const complexCombinationsTests: TestCase[] = describe('Complex Combinations', [
  testWithSetup(
    'Card with all features',
    `Frame bg #1a1a1a, pad 16, rad 12, gap 12, w 300, shadow md
  Frame hor, spread, ver-center
    Frame hor, gap 8, ver-center
      Frame w 40, h 40, bg #2271C1, rad 99, center
        Text "JD", col white, weight bold
      Frame gap 2
        Text "John Doe", col white, weight 500
        Text "john@example.com", col #888, fs 12
    Icon "more-vertical", ic #888, is 20
  Divider
  Text "This is a sample card component with multiple nested elements and various styling properties.", col #888, line 1.5
  Frame hor, gap 8
    Button "Accept", bg #10b981, col white, pad 8 16, rad 6, grow
    Button "Decline", bg #ef4444, col white, pad 8 16, rad 6, grow`,
    async (api: TestAPI) => {
      // Verify structure exists
      api.assert.exists('node-1') // Card
      api.assert.exists('node-2') // Header row

      const card = api.preview.inspect('node-1')
      api.assert.ok(card !== null, 'Card should exist')
      api.assert.ok(card.styles.borderRadius === '12px', 'Card should have 12px radius')
      api.assert.ok(card.styles.boxShadow !== 'none', 'Card should have shadow')
    }
  ),

  testWithSetup(
    'Navigation bar',
    `Frame hor, spread, ver-center, pad 8 16, bg #1a1a1a, bor 0 0 1 0, boc #333
  Frame hor, gap 4, ver-center
    Icon "menu", ic white, is 20
    Text "Brand", col white, fs 18, weight bold
  Frame hor, gap 16
    Text "Home", col white
    Text "About", col #888
    Text "Contact", col #888
  Frame hor, gap 8
    Icon "search", ic #888, is 20
    Icon "bell", ic #888, is 20
    Frame w 32, h 32, bg #2271C1, rad 99, center
      Text "U", col white, weight bold`,
    async (api: TestAPI) => {
      const nav = api.preview.inspect('node-1')
      api.assert.ok(nav !== null, 'Nav should exist')
      api.assert.ok(nav.styles.flexDirection === 'row', 'Nav should be horizontal')
      api.assert.ok(nav.styles.justifyContent === 'space-between', 'Nav should be spread')
    }
  ),

  testWithSetup(
    'Dashboard stats grid',
    `Frame grid 12, gap 16, pad 16, bg #0a0a0a
  Frame w 3, bg #1a1a1a, pad 16, rad 8, gap 8
    Frame hor, spread, ver-center
      Text "Revenue", col #888, fs 12, uppercase
      Icon "dollar-sign", ic #10b981, is 16
    Text "$12,450", col white, fs 24, weight bold
    Text "+12.5%", col #10b981, fs 12
  Frame w 3, bg #1a1a1a, pad 16, rad 8, gap 8
    Frame hor, spread, ver-center
      Text "Users", col #888, fs 12, uppercase
      Icon "users", ic #2271C1, is 16
    Text "1,234", col white, fs 24, weight bold
    Text "+8.2%", col #10b981, fs 12
  Frame w 3, bg #1a1a1a, pad 16, rad 8, gap 8
    Frame hor, spread, ver-center
      Text "Orders", col #888, fs 12, uppercase
      Icon "shopping-cart", ic #f59e0b, is 16
    Text "567", col white, fs 24, weight bold
    Text "-2.1%", col #ef4444, fs 12
  Frame w 3, bg #1a1a1a, pad 16, rad 8, gap 8
    Frame hor, spread, ver-center
      Text "Conversion", col #888, fs 12, uppercase
      Icon "percent", ic #8b5cf6, is 16
    Text "4.5%", col white, fs 24, weight bold
    Text "+0.8%", col #10b981, fs 12`,
    async (api: TestAPI) => {
      const grid = api.preview.inspect('node-1')
      api.assert.ok(grid !== null, 'Grid should exist')
      api.assert.ok(grid.styles.display === 'grid', 'Should be grid layout')
      api.assert.ok(grid.children.length === 4, 'Should have 4 stat cards')
    }
  ),
])
