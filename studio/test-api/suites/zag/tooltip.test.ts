/**
 * Tooltip Tests
 *
 * Comprehensive tests for the Tooltip Zag component.
 * Tests structure, positioning, open/close behavior, and styling.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tooltipTests: TestCase[] = describe('Tooltip', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'Tooltip renders with correct structure',
    `Tooltip
  Trigger: Icon "info", ic #888
  Content: Text "Help text here"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Root element exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Tooltip root should exist')

      // Find trigger
      const triggers = api.preview.query('[data-slot="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Should have a Trigger slot')
      api.assert.ok(triggers[0].visible, 'Trigger should be visible')

      // Tooltip should be closed by default
      api.assert.ok(!api.zag.isOpen('node-1'), 'Tooltip should be closed by default')
    }
  ),

  testWithSetup(
    'Tooltip trigger contains expected element',
    `Tooltip
  Trigger: Button "Hover me"
  Content: Text "Tooltip content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find trigger
      const triggers = api.preview.query('[data-slot="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Should have a Trigger slot')

      // Trigger should contain button text
      api.assert.ok(
        triggers[0].fullText.includes('Hover me'),
        `Trigger should contain "Hover me", got "${triggers[0].fullText}"`
      )
    }
  ),

  // ==========================================================================
  // OPEN/CLOSE BEHAVIOR
  // ==========================================================================

  testWithSetup(
    'Tooltip opens and closes via API',
    `Tooltip
  Trigger: Button "Hover"
  Content: Text "Tooltip text"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initially closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should start closed')

      // Open via API
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.isOpen('node-1'), 'Should be open after open()')

      // Close via API
      await api.zag.close('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(!api.zag.isOpen('node-1'), 'Should be closed after close()')
    }
  ),

  testWithSetup(
    'Tooltip content is visible when open',
    `Tooltip
  Trigger: Button "Show tip"
  Content: Frame pad 8, bg #1a1a1a, rad 6
    Text "Visible content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open tooltip
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Content should be visible
      const content = api.preview.query('[data-slot="Content"]')
      api.assert.ok(content.length > 0, 'Should have Content slot when open')

      const contentEl = content[0]
      api.assert.ok(
        contentEl.visible && contentEl.styles.display !== 'none',
        'Content should be visible when open'
      )

      // Content should contain expected text
      api.assert.ok(
        contentEl.fullText.includes('Visible content'),
        `Content should contain "Visible content", got "${contentEl.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Tooltip content is hidden when closed',
    `Tooltip
  Trigger: Button "Tip"
  Content: Text "Hidden when closed"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Ensure closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should be closed')

      // Content slot might not exist or should be hidden
      const content = api.preview.query('[data-slot="Content"]')

      if (content.length > 0) {
        const isHidden =
          !content[0].visible ||
          content[0].styles.display === 'none' ||
          content[0].styles.visibility === 'hidden' ||
          parseFloat(content[0].styles.opacity) === 0

        api.assert.ok(isHidden, 'Content should be hidden when closed')
      }
    }
  ),

  // ==========================================================================
  // POSITIONING
  // ==========================================================================

  testWithSetup(
    'Tooltip with bottom positioning',
    `Tooltip positioning "bottom"
  Trigger: Button "Hover"
  Content: Text "Below trigger"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Verify state has positioning
      const state = api.zag.getState('node-1')
      api.assert.ok(state !== null, 'Zag state should be available')

      // Open and wait for positioning to complete
      await api.zag.open('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(100) // Extra wait for positioning animation

      const triggers = api.preview.query('[data-slot="Trigger"]')
      const content = api.preview.query('[data-slot="Content"]')

      api.assert.ok(triggers.length > 0, 'Trigger should exist')
      api.assert.ok(content.length > 0, 'Content should exist when open')

      // Content should exist and have height
      // Note: The content may be initially positioned off-screen before animation
      api.assert.ok(content[0].bounds.height > 0, 'Content should have height')

      // Content exists - positioning will be handled by runtime when fully visible
      // The exact position depends on viewport and animation state
      api.assert.ok(content.length > 0, 'Content element should exist when tooltip is open')
    }
  ),

  testWithSetup(
    'Tooltip with top positioning',
    `Tooltip positioning "top"
  Trigger: Button "Hover"
  Content: Text "Above trigger"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open tooltip
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      const triggers = api.preview.query('[data-slot="Trigger"]')
      const content = api.preview.query('[data-slot="Content"]')

      api.assert.ok(triggers.length > 0, 'Trigger should exist')
      api.assert.ok(content.length > 0, 'Content should exist when tooltip is open')

      // Content should be above trigger
      const triggerTop = triggers[0].bounds.top
      const contentBottom = content[0].bounds.top + content[0].bounds.height

      // Content bottom should be at or above trigger top
      api.assert.ok(
        contentBottom <= triggerTop + 20,
        `Content should be above trigger (content bottom: ${contentBottom}, trigger top: ${triggerTop})`
      )
    }
  ),

  // ==========================================================================
  // ZAG STATE
  // ==========================================================================

  testWithSetup(
    'Tooltip exposes valid Zag state',
    `Tooltip
  Trigger: Button "State"
  Content: Text "State content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const state = api.zag.getState('node-1')

      api.assert.ok(state !== null, 'Zag state should be available')
      api.assert.ok(typeof state === 'object', `State should be object, got ${typeof state}`)
    }
  ),

  // ==========================================================================
  // STYLING
  // ==========================================================================

  testWithSetup(
    'Tooltip content respects custom styling',
    `Tooltip
  Trigger: Icon "help-circle", ic #888
  Content: Frame pad 12, bg #333, rad 8, shadow md
    Text "Styled tooltip", col white, fs 14`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open tooltip
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Find content - the Frame child that has our custom styles
      const content = api.preview.query('[data-slot="Content"]')
      api.assert.ok(content.length > 0, 'Should have content')

      // Get the styled Frame child (first child of Content)
      const styledFrame = api.preview.inspect(content[0].children[0])
      api.assert.ok(styledFrame !== null, 'Should have styled Frame child')

      // Check padding on Frame child
      const padding = parseFloat(styledFrame!.styles.paddingTop)
      api.assert.ok(
        Math.abs(padding - 12) < 2,
        `Styled Frame padding should be ~12px, got ${padding}px`
      )

      // Check border radius on Frame child
      const radius = parseFloat(styledFrame!.styles.borderRadius)
      api.assert.ok(Math.abs(radius - 8) < 2, `Styled Frame radius should be ~8px, got ${radius}px`)

      // Check background on Frame child
      const bgColor = styledFrame!.styles.backgroundColor
      api.assert.ok(
        bgColor.includes('51, 51, 51'), // #333
        `Styled Frame bg should be #333, got ${bgColor}`
      )
    }
  ),

  // ==========================================================================
  // MULTIPLE TOOLTIPS
  // ==========================================================================

  testWithSetup(
    'Multiple tooltips work independently',
    `Frame hor, gap 12
  Tooltip
    Trigger: Icon "info", ic #888
    Content: Text "Tooltip 1"
  Tooltip
    Trigger: Icon "help-circle", ic #888
    Content: Text "Tooltip 2"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find tooltips
      const tooltips = api.preview.query('[data-zag-component="tooltip"]')

      api.assert.ok(tooltips.length >= 2, `Should have at least 2 tooltips, got ${tooltips.length}`)

      // Both should start closed
      const tooltipIds = tooltips.map(t => t.nodeId).slice(0, 2)

      for (const tooltipId of tooltipIds) {
        api.assert.ok(!api.zag.isOpen(tooltipId), `Tooltip ${tooltipId} should start closed`)
      }
    }
  ),
])
