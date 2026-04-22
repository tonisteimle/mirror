/**
 * Dialog Tests
 *
 * Comprehensive tests for the Dialog Zag component.
 * Tests trigger, content, backdrop, open/close behavior, and accessibility.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const dialogTests: TestCase[] = describe('Dialog', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'Dialog renders with trigger',
    'Dialog\n  Trigger: Button "Open Dialog"\n  Content: Frame pad 24\n    Text "Dialog content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Root exists
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Dialog root should exist')

      // Find trigger
      const triggers = api.preview.query('[data-slot="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Should have a Trigger slot')

      // Trigger should be visible
      api.assert.ok(triggers[0].visible, 'Trigger should be visible')

      // Trigger should have button text
      api.assert.ok(
        triggers[0].fullText.includes('Open Dialog'),
        `Trigger should contain "Open Dialog", got "${triggers[0].fullText}"`
      )

      // Dialog should be closed by default
      api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should be closed by default')
    }
  ),

  testWithSetup(
    'Dialog content is hidden when closed',
    'Dialog\n  Trigger: Button "Show"\n  Content: Frame pad 24, bg white\n    Text "Hidden content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Dialog is closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should be closed')

      // Content slot should exist but be hidden
      const content = api.preview.query('[data-slot="Content"]')
      api.assert.ok(content.length > 0, 'Content slot should exist even when dialog is closed')

      const isHidden =
        !content[0].visible ||
        content[0].styles.display === 'none' ||
        content[0].styles.visibility === 'hidden' ||
        parseFloat(content[0].styles.opacity) === 0

      api.assert.ok(isHidden, 'Content should be hidden when dialog is closed')
    }
  ),

  // ==========================================================================
  // OPEN/CLOSE BEHAVIOR
  // ==========================================================================

  testWithSetup(
    'Dialog opens and closes via API',
    'Dialog\n  Trigger: Button "Open"\n  Content: Frame pad 24, bg white\n    Text "Modal"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initially closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should start closed')

      // Open
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.isOpen('node-1'), 'Should be open after open()')

      // Close
      await api.zag.close('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(!api.zag.isOpen('node-1'), 'Should be closed after close()')
    }
  ),

  testWithSetup(
    'Dialog opens on trigger click',
    'Dialog\n  Trigger: Button "Click to open"\n  Content: Frame pad 24\n    Text "Opened!"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initially closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Should start closed')

      // Find and click trigger
      const triggers = api.preview.query('[data-slot="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Should have trigger')

      // Click the trigger (which is a button inside the dialog)
      await api.interact.click(triggers[0].nodeId)
      await api.utils.waitForIdle()

      // Should be open
      api.assert.ok(api.zag.isOpen('node-1'), 'Should be open after clicking trigger')
    }
  ),

  testWithSetup(
    'Dialog content becomes visible when opened',
    'Dialog\n  Trigger: Button "Show"\n  Content: Frame pad 24, bg #1a1a1a, rad 12\n    Text "Now visible"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dialog
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Content should be visible
      const content = api.preview.query('[data-slot="Content"]')
      api.assert.ok(content.length > 0, 'Should have Content slot when open')

      const contentEl = content[0]

      // Should be visible
      api.assert.ok(
        contentEl.visible && contentEl.styles.display !== 'none',
        'Content should be visible when open'
      )

      // Should have our styling
      const bgColor = contentEl.styles.backgroundColor
      api.assert.ok(
        bgColor.includes('26, 26, 26'), // #1a1a1a
        `Content should have bg #1a1a1a, got ${bgColor}`
      )

      // Should have border radius
      const radius = parseFloat(contentEl.styles.borderRadius)
      api.assert.ok(Math.abs(radius - 12) < 2, `Content should have rad 12, got ${radius}`)
    }
  ),

  // ==========================================================================
  // BACKDROP
  // ==========================================================================

  testWithSetup(
    'Dialog with backdrop renders overlay',
    'Dialog\n  Trigger: Button "Open"\n  Backdrop: bg rgba(0,0,0,0.5)\n  Content: Frame pad 24, bg white\n    Text "Modal"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dialog
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Find backdrop
      const backdrops = api.preview.query('[data-slot="Backdrop"]')

      // Should have backdrop
      api.assert.ok(backdrops.length > 0, 'Should have Backdrop slot')

      const backdrop = backdrops[0]

      // Backdrop should be visible
      api.assert.ok(backdrop.visible, 'Backdrop should be visible when dialog is open')

      // Backdrop should have semi-transparent background
      const bgColor = backdrop.styles.backgroundColor
      api.assert.ok(
        bgColor.includes('rgba') || bgColor.includes('0.5') || bgColor.includes('128'),
        `Backdrop should have semi-transparent bg, got ${bgColor}`
      )
    }
  ),

  testWithSetup(
    'Backdrop is hidden when dialog closes',
    'Dialog\n  Trigger: Button "Toggle"\n  Backdrop: bg rgba(0,0,0,0.7)\n  Content: Frame pad 24\n    Text "Test"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Verify backdrop exists and is visible
      let backdrops = api.preview.query('[data-slot="Backdrop"]')
      api.assert.ok(backdrops.length > 0, 'Backdrop slot should exist')
      api.assert.ok(backdrops[0].visible, 'Backdrop should be visible when open')

      // Close
      await api.zag.close('node-1')
      await api.utils.waitForIdle()

      // Backdrop should be hidden
      backdrops = api.preview.query('[data-slot="Backdrop"]')
      api.assert.ok(backdrops.length > 0, 'Backdrop slot should still exist after close')

      const isHidden =
        !backdrops[0].visible ||
        backdrops[0].styles.display === 'none' ||
        parseFloat(backdrops[0].styles.opacity) === 0

      api.assert.ok(isHidden, 'Backdrop should be hidden when dialog closes')
    }
  ),

  // ==========================================================================
  // CLOSE TRIGGER
  // ==========================================================================

  testWithSetup(
    'Dialog closes via CloseTrigger',
    `Dialog
  Trigger: Button "Open"
  Content: Frame pad 24, bg #1a1a1a, rad 8
    Text "Dialog Content"
    CloseTrigger: Button "Close", bg #333`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dialog
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(api.zag.isOpen('node-1'), 'Dialog should be open')

      // Find close trigger
      const closeTriggers = api.preview.query('[data-slot="CloseTrigger"]')
      api.assert.ok(closeTriggers.length > 0, 'Should have CloseTrigger')

      // Click close trigger
      await api.interact.click(closeTriggers[0].nodeId)
      await api.utils.waitForIdle()

      // Dialog should be closed
      api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should close after clicking CloseTrigger')
    }
  ),

  // ==========================================================================
  // ZAG STATE
  // ==========================================================================

  testWithSetup(
    'Dialog exposes valid Zag state',
    'Dialog\n  Trigger: Button "State Test"\n  Content: Frame\n    Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const state = api.zag.getState('node-1')

      api.assert.ok(state !== null, 'Zag state should be available')
      api.assert.ok(typeof state === 'object', `State should be object, got ${typeof state}`)

      // Open and check state updates
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      const openState = api.zag.getState('node-1')
      api.assert.ok(openState !== null, 'State should still be available when open')
    }
  ),

  // ==========================================================================
  // STYLING
  // ==========================================================================

  testWithSetup(
    'Dialog content respects custom styling',
    'Dialog\n  Trigger: Button "Styled"\n  Content: Frame w 400, pad 32, bg #2a2a2a, rad 16, gap 16\n    Text "Styled Dialog", fs 20\n    Text "With custom styling"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dialog
      await api.zag.open('node-1')
      await api.utils.waitForIdle()

      // Find content - the Frame child that has our custom styles
      const content = api.preview.query('[data-slot="Content"]')
      api.assert.ok(content.length > 0, 'Should have content')

      // Get the styled Frame child (first child of Content)
      const styledFrame = api.preview.inspect(content[0].children[0])
      api.assert.ok(styledFrame !== null, 'Should have styled Frame child')

      // Check width - the Frame child should have w 400
      const width = styledFrame!.bounds.width
      api.assert.ok(
        Math.abs(width - 400) < 10,
        `Styled Frame width should be ~400px, got ${width}px`
      )

      // Check padding on Frame child
      const padding = parseFloat(styledFrame!.styles.paddingTop)
      api.assert.ok(
        Math.abs(padding - 32) < 2,
        `Styled Frame padding should be ~32px, got ${padding}px`
      )

      // Check border radius on Frame child
      const radius = parseFloat(styledFrame!.styles.borderRadius)
      api.assert.ok(
        Math.abs(radius - 16) < 2,
        `Styled Frame radius should be ~16px, got ${radius}px`
      )

      // Check gap on Frame child
      const gap = parseFloat(styledFrame!.styles.gap)
      api.assert.ok(Math.abs(gap - 16) < 2, `Styled Frame gap should be ~16px, got ${gap}px`)
    }
  ),

  // ==========================================================================
  // MULTIPLE DIALOGS
  // ==========================================================================

  testWithSetup(
    'Multiple dialogs work independently',
    `Frame gap 12
  Dialog
    Trigger: Button "Dialog 1"
    Content: Frame pad 24
      Text "First Dialog"
  Dialog
    Trigger: Button "Dialog 2"
    Content: Frame pad 24
      Text "Second Dialog"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find both dialogs - they should be node-2 and node-3 (node-1 is the Frame)
      const dialogs = api.preview.query('[data-zag-component="dialog"]')

      api.assert.ok(dialogs.length >= 2, `Should have at least 2 dialogs, got ${dialogs.length}`)

      // Both should start closed
      // Note: We need to find the actual dialog node IDs
      const dialogIds = dialogs.map(d => d.nodeId).slice(0, 2)

      for (const dialogId of dialogIds) {
        api.assert.ok(!api.zag.isOpen(dialogId), `Dialog ${dialogId} should start closed`)
      }
    }
  ),
])
