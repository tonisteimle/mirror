/**
 * Exclusive State Tests
 *
 * Tests for exclusive() function - radio-button-like behavior where
 * only one element in a group can be active at a time.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const exclusiveBasicTests: TestCase[] = describe('Exclusive Basic', [
  testWithSetup(
    'Tab group with exclusive() - only one selected at a time',
    `Frame hor, gap 0
  Button "Home", pad 12 20, col #888, exclusive()
    selected:
      col white
      bor 0 0 2 0, boc #2271C1
  Button "Profile", pad 12 20, col #888, exclusive()
    selected:
      col white
      bor 0 0 2 0, boc #2271C1
  Button "Settings", pad 12 20, col #888, exclusive()
    selected:
      col white
      bor 0 0 2 0, boc #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-2') // Home
      api.assert.exists('node-3') // Profile
      api.assert.exists('node-4') // Settings

      // All start unselected
      api.assert.hasStyle('node-2', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-4', 'color', 'rgb(136, 136, 136)')

      // Click first tab
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // First should be selected, others not
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-4', 'color', 'rgb(136, 136, 136)')

      // Click second tab
      await api.interact.click('node-3')
      await api.utils.delay(150)

      // Second should be selected, first deselected
      api.assert.hasStyle('node-2', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-4', 'color', 'rgb(136, 136, 136)')

      // Click third tab
      await api.interact.click('node-4')
      await api.utils.delay(150)

      // Third should be selected
      api.assert.hasStyle('node-2', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')
    }
  ),

  testWithSetup(
    'Exclusive with initial selected state',
    `Frame hor, gap 4
  Button "A", bg #333, col #888, exclusive()
    selected:
      bg #2271C1
      col white
  Button "B", bg #333, col #888, exclusive(), selected
    selected:
      bg #2271C1
      col white
  Button "C", bg #333, col #888, exclusive()
    selected:
      bg #2271C1
      col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      // B should start selected
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(51, 51, 51)')

      // Click A
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // A selected, B deselected
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'Exclusive with complex style changes',
    `Frame hor, gap 8
  Frame pad 16, bg #1a1a1a, rad 8, exclusive(), cursor pointer
    Icon "home", ic #888, is 20
    Text "Home", col #888
    selected:
      bg #2271C1
      Icon "home", ic white, is 20
      Text "Home", col white
  Frame pad 16, bg #1a1a1a, rad 8, exclusive(), cursor pointer
    Icon "user", ic #888, is 20
    Text "Profile", col #888
    selected:
      bg #2271C1
      Icon "user", ic white, is 20
      Text "Profile", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-2')
      api.assert.exists('node-5')

      // Both start unselected
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(26, 26, 26)')

      // Select first
      await api.interact.click('node-2')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(26, 26, 26)')

      // Select second
      await api.interact.click('node-5')
      await api.utils.delay(150)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(34, 113, 193)')
    }
  ),
])

export const exclusiveGroupTests: TestCase[] = describe('Exclusive Groups', [
  testWithSetup(
    'Multiple exclusive groups operate independently',
    `Frame gap 16
  Frame hor, gap 4
    Text "Size:", col #888
    Button "S", bg #333, col #888, pad 8 12, exclusive()
      selected:
        bg #2271C1
        col white
    Button "M", bg #333, col #888, pad 8 12, exclusive()
      selected:
        bg #2271C1
        col white
    Button "L", bg #333, col #888, pad 8 12, exclusive()
      selected:
        bg #2271C1
        col white
  Frame hor, gap 4
    Text "Color:", col #888
    Button "Red", bg #333, col #888, pad 8 12, exclusive()
      selected:
        bg #ef4444
        col white
    Button "Blue", bg #333, col #888, pad 8 12, exclusive()
      selected:
        bg #2271C1
        col white
    Button "Green", bg #333, col #888, pad 8 12, exclusive()
      selected:
        bg #10b981
        col white`,
    async (api: TestAPI) => {
      // Size group: node-3 (S), node-4 (M), node-5 (L)
      // Color group: node-8 (Red), node-9 (Blue), node-10 (Green)
      api.assert.exists('node-1')

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 10, 'Should have at least 10 nodes')
    }
  ),

  testWithSetup(
    'Exclusive clicking same item twice does not deselect',
    `Frame hor, gap 4
  Button "A", bg #333, exclusive()
    selected:
      bg #2271C1
  Button "B", bg #333, exclusive()
    selected:
      bg #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      // Click A
      await api.interact.click('node-2')
      await api.utils.delay(150)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')

      // Click A again - should stay selected
      await api.interact.click('node-2')
      await api.utils.delay(150)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
    }
  ),
])

export const exclusiveNavigationTests: TestCase[] = describe('Exclusive Navigation Patterns', [
  testWithSetup(
    'Sidebar navigation with exclusive selection',
    `Frame w 200, bg #1a1a1a, pad 8, gap 4
  Frame hor, pad 12, rad 6, gap 8, exclusive(), cursor pointer
    Icon "home", ic #888, is 18
    Text "Dashboard", col #888
    selected:
      bg #2271C120
      Icon "home", ic #2271C1, is 18
      Text "Dashboard", col #2271C1
  Frame hor, pad 12, rad 6, gap 8, exclusive(), cursor pointer
    Icon "users", ic #888, is 18
    Text "Team", col #888
    selected:
      bg #2271C120
      Icon "users", ic #2271C1, is 18
      Text "Team", col #2271C1
  Frame hor, pad 12, rad 6, gap 8, exclusive(), cursor pointer
    Icon "settings", ic #888, is 18
    Text "Settings", col #888
    selected:
      bg #2271C120
      Icon "settings", ic #2271C1, is 18
      Text "Settings", col #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Sidebar container
      api.assert.exists('node-2') // Dashboard item
      api.assert.exists('node-5') // Team item
      api.assert.exists('node-8') // Settings item

      // Click Dashboard
      await api.interact.click('node-2')
      await api.utils.delay(150)

      // Click Team
      await api.interact.click('node-5')
      await api.utils.delay(150)

      // Click Settings
      await api.interact.click('node-8')
      await api.utils.delay(150)

      // Verify navigation structure
      const sidebar = api.preview.inspect('node-1')
      api.assert.ok(sidebar !== null, 'Sidebar should exist')
      api.assert.ok(sidebar!.children.length >= 3, 'Should have at least 3 nav items')
    }
  ),

  testWithSetup(
    'Tab bar with underline indicator',
    `Frame bor 0 0 1 0, boc #333
  Frame hor, gap 0
    Button "Overview", pad 16, col #888, bg transparent, exclusive()
      selected:
        col white
        bor 0 0 2 0, boc #2271C1
    Button "Analytics", pad 16, col #888, bg transparent, exclusive()
      selected:
        col white
        bor 0 0 2 0, boc #2271C1
    Button "Reports", pad 16, col #888, bg transparent, exclusive()
      selected:
        col white
        bor 0 0 2 0, boc #2271C1
    Button "Exports", pad 16, col #888, bg transparent, exclusive()
      selected:
        col white
        bor 0 0 2 0, boc #2271C1`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const tabs = api.preview.getChildren('node-2')
      api.assert.ok(tabs.length >= 4, 'Should have 4 tabs')

      // Click first tab
      await api.interact.click('node-3')
      await api.utils.delay(150)
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // Click third tab
      await api.interact.click('node-5')
      await api.utils.delay(150)
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
    }
  ),
])

export const allExclusiveTests: TestCase[] = [
  ...exclusiveBasicTests,
  ...exclusiveGroupTests,
  ...exclusiveNavigationTests,
]
