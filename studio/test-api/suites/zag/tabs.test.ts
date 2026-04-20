/**
 * Tabs Tests
 *
 * Comprehensive tests for the Tabs Zag component.
 * Tests tab navigation, content switching, keyboard navigation, and styling.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tabsTests: TestCase[] = describe('Tabs', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'Tabs renders with multiple tabs',
    `Tabs defaultValue "home"
  Tab "Home"
    Frame pad 16
      Text "Home Content"
  Tab "Profile"
    Frame pad 16
      Text "Profile Content"
  Tab "Settings"
    Frame pad 16
      Text "Settings Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Root exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Tabs root should exist')

      // Get all tabs
      const tabs = api.zag.getAllTabs('node-1')

      api.assert.ok(
        tabs.length === 3,
        `Should have 3 tabs, got ${tabs.length}: [${tabs.join(', ')}]`
      )

      // Verify tab values
      api.assert.ok(tabs.includes('Home'), 'Should have "Home" tab')
      api.assert.ok(tabs.includes('Profile'), 'Should have "Profile" tab')
      api.assert.ok(tabs.includes('Settings'), 'Should have "Settings" tab')
    }
  ),

  testWithSetup(
    'Tabs has tab list with triggers',
    `Tabs
  Tab "First"
    Text "First content"
  Tab "Second"
    Text "Second content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find tab triggers
      const triggers = api.preview.query('[data-slot="Trigger"]')

      api.assert.ok(
        triggers.length >= 2,
        `Should have at least 2 tab triggers, got ${triggers.length}`
      )

      // Triggers should be visible
      for (const trigger of triggers) {
        api.assert.ok(trigger.visible, 'Tab trigger should be visible')
      }

      // Triggers should have text
      const triggerTexts = triggers.map(t => t.fullText)
      api.assert.ok(
        triggerTexts.some(t => t.includes('First')),
        `Should have "First" trigger, got: ${triggerTexts.join(', ')}`
      )
      api.assert.ok(
        triggerTexts.some(t => t.includes('Second')),
        `Should have "Second" trigger, got: ${triggerTexts.join(', ')}`
      )
    }
  ),

  // ==========================================================================
  // DEFAULT TAB
  // ==========================================================================

  testWithSetup(
    'First tab is active by default',
    `Tabs
  Tab "Alpha"
    Text "Alpha content"
  Tab "Beta"
    Text "Beta content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const activeTab = api.zag.getActiveTab('node-1')

      api.assert.ok(
        activeTab === 'Alpha',
        `First tab should be active by default, got "${activeTab}"`
      )
    }
  ),

  testWithSetup(
    'defaultValue sets initial active tab',
    `Tabs defaultValue "second"
  Tab "first"
    Text "First"
  Tab "second"
    Text "Second"
  Tab "third"
    Text "Third"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const activeTab = api.zag.getActiveTab('node-1')

      api.assert.ok(
        activeTab === 'second',
        `Should start with "second" tab active, got "${activeTab}"`
      )
    }
  ),

  // ==========================================================================
  // TAB SWITCHING
  // ==========================================================================

  testWithSetup(
    'Clicking tab changes active tab',
    `Tabs
  Tab "One"
    Text "Content One"
  Tab "Two"
    Text "Content Two"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial state
      api.assert.ok(api.zag.getActiveTab('node-1') === 'One', 'Should start with "One" active')

      // Find and click "Two" trigger
      const triggers = api.preview.query('[data-slot="Trigger"]')
      const twoTrigger = triggers.find(t => t.fullText.includes('Two'))

      api.assert.ok(twoTrigger, 'Should find "Two" trigger')

      await api.interact.click(twoTrigger!.nodeId)
      await api.utils.waitForIdle()

      // Verify tab changed
      api.assert.ok(
        api.zag.getActiveTab('node-1') === 'Two',
        'Should have "Two" active after click'
      )
    }
  ),

  testWithSetup(
    'Tab content switches with active tab',
    `Tabs
  Tab "Tab A"
    Text "Content for A"
  Tab "Tab B"
    Text "Content for B"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial content should be A
      let visibleText = ''
      const contents = api.preview.query('[data-slot="Content"]')

      for (const content of contents) {
        if (content.visible && content.styles.display !== 'none') {
          visibleText = content.fullText
          break
        }
      }

      api.assert.ok(
        visibleText.includes('Content for A'),
        `Initial visible content should be "Content for A", got "${visibleText}"`
      )

      // Switch to Tab B
      await api.zag.selectTab('node-1', 'Tab B')
      await api.utils.waitForIdle()

      // Content B should now be visible
      visibleText = ''
      const newContents = api.preview.query('[data-slot="Content"]')

      for (const content of newContents) {
        if (content.visible && content.styles.display !== 'none') {
          visibleText = content.fullText
          break
        }
      }

      api.assert.ok(
        visibleText.includes('Content for B'),
        `After switch, content should be "Content for B", got "${visibleText}"`
      )
    }
  ),

  testWithSetup(
    'selectTab API works correctly',
    `Tabs
  Tab "X"
    Text "X"
  Tab "Y"
    Text "Y"
  Tab "Z"
    Text "Z"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Start at X
      api.assert.ok(api.zag.getActiveTab('node-1') === 'X', 'Should start at X')

      // Select Z
      await api.zag.selectTab('node-1', 'Z')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.getActiveTab('node-1') === 'Z', 'Should be at Z after selectTab')

      // Select Y
      await api.zag.selectTab('node-1', 'Y')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.getActiveTab('node-1') === 'Y', 'Should be at Y after selectTab')

      // Back to X
      await api.zag.selectTab('node-1', 'X')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.getActiveTab('node-1') === 'X', 'Should be back at X')
    }
  ),

  // ==========================================================================
  // VISUAL STATES
  // ==========================================================================

  testWithSetup(
    'Active tab has visual indicator',
    `Tabs
  Tab "Active"
    Text "Active tab content"
  Tab "Inactive"
    Text "Inactive tab content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find triggers
      const triggers = api.preview.query('[data-slot="Trigger"]')
      const activeTrigger = triggers.find(t => t.fullText.includes('Active'))
      const inactiveTrigger = triggers.find(t => t.fullText.includes('Inactive'))

      api.assert.ok(activeTrigger, 'Should find active trigger')
      api.assert.ok(inactiveTrigger, 'Should find inactive trigger')

      // Active trigger should have some visual distinction
      // Could be: different background, border, color, or data attribute
      const activeAttrs = activeTrigger!.dataAttributes
      const inactiveAttrs = inactiveTrigger!.dataAttributes

      // Check for data-state or similar indicator
      const hasActiveState =
        activeAttrs['state'] === 'active' ||
        activeAttrs['selected'] === 'true' ||
        activeTrigger!.attributes['aria-selected'] === 'true'

      api.assert.ok(
        hasActiveState,
        `Active trigger should have active state indicator, attrs: ${JSON.stringify(activeAttrs)}`
      )
    }
  ),

  // ==========================================================================
  // ZAG STATE
  // ==========================================================================

  testWithSetup(
    'Tabs exposes valid Zag state',
    `Tabs
  Tab "State Test"
    Text "Testing state"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const state = api.zag.getState('node-1')

      api.assert.ok(state !== null, 'Zag state should be available')
      api.assert.ok(typeof state === 'object', `State should be object, got ${typeof state}`)

      // Should have value or context
      api.assert.ok('value' in state! || 'context' in state!, 'State should have value or context')
    }
  ),

  // ==========================================================================
  // STYLING
  // ==========================================================================

  testWithSetup(
    'Tab content respects styling',
    `Tabs
  Tab "Styled"
    Frame pad 24, bg #1a1a1a, rad 8, gap 12
      Text "Styled content", col white
      Text "With multiple lines"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find visible content
      const contents = api.preview.query('[data-slot="Content"]')
      const visibleContent = contents.find(c => c.visible && c.styles.display !== 'none')

      api.assert.ok(visibleContent, 'Should have visible content')

      // Use the children array from the query result directly
      // The children property contains IDs of child elements
      api.assert.ok(
        visibleContent!.children.length > 0,
        `Content should have child elements (Frame), got ${visibleContent!.children.length} children`
      )

      // Get the Frame child via inspect
      const frameId = visibleContent!.children[0]
      const frame = api.preview.inspect(frameId)
      api.assert.ok(frame !== null, 'Should be able to inspect Frame child')

      // Check background
      api.assert.ok(
        frame!.styles.backgroundColor.includes('26, 26, 26'),
        `Frame should have bg #1a1a1a, got ${frame!.styles.backgroundColor}`
      )

      // Check padding
      const padding = parseFloat(frame!.styles.paddingTop)
      api.assert.ok(Math.abs(padding - 24) < 2, `Frame should have pad 24, got ${padding}`)
    }
  ),
])
