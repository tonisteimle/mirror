/**
 * Pure RadioGroup Tests
 *
 * Comprehensive tests for Pure Mirror RadioItem component.
 * RadioGroup is simply a Frame with gap - RadioItem has the exclusive() state machine.
 *
 * Pure RadioItem Definition:
 * RadioItem as Label: hor, gap 8, cursor pointer, exclusive()
 *   Control: Frame w 18, h 18, rad 99, bor 2, boc #3f3f46, center
 *     hover:
 *       boc #888
 *     on:
 *       boc #5BA8F5
 *   Indicator: Frame w 10, h 10, rad 99, bg #5BA8F5, opacity 0, scale 0.5
 *     on:
 *       opacity 1, scale 1
 *   Content: Slot
 *
 * NOTE: exclusive() uses 'on' state (like toggle()), not 'on'
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Test Definitions
// =============================================================================

// Full definition with indicator (uses 'on' state for exclusive())
const RADIO_DEFINITIONS = `RadioItem as Label: hor, gap 8, cursor pointer, exclusive()
  Control: Frame w 18, h 18, rad 99, bor 2, boc #3f3f46, center
    hover:
      boc #888
    on:
      boc #5BA8F5
  Indicator: Frame w 10, h 10, rad 99, bg #5BA8F5, opacity 0, scale 0.5
    on:
      opacity 1, scale 1
  Content: Slot`

// Simpler variant without indicator
const RADIO_NO_INDICATOR = `RadioItem as Label: hor, gap 8, cursor pointer, exclusive()
  Control: Frame w 18, h 18, rad 99, bor 2, boc #3f3f46, center
    on:
      bg #5BA8F5, boc #5BA8F5
  Content: Slot`

// Custom colors variant (green)
const RADIO_CUSTOM_COLORS = `RadioItem as Label: hor, gap 10, cursor pointer, exclusive()
  Control: Frame w 20, h 20, rad 99, bor 2, boc #666, center
    on:
      boc #10b981
  Indicator: Frame w 12, h 12, rad 99, bg #10b981, opacity 0
    on:
      opacity 1
  Content: Slot`

// =============================================================================
// Helper Functions
// =============================================================================

/** Find RadioItem elements (label elements with RadioItem text) */
function findRadioItems(api: TestAPI): string[] {
  const nodeIds = api.preview.getNodeIds()
  return nodeIds.filter(id => {
    const info = api.preview.inspect(id)
    if (!info || info.tagName?.toLowerCase() !== 'label') return false
    // Filter out definition nodes (they are at root level with x close to 0)
    // Instance nodes are inside Frame pad 16, so their left bound is >= 16
    return info.bounds.left >= 10
  })
}

/** Find element by text content */
function findByText(api: TestAPI, text: string): string | undefined {
  const nodeIds = api.preview.getNodeIds()
  return nodeIds.find(id => {
    const info = api.preview.inspect(id)
    return info && info.fullText?.includes(text)
  })
}

/** Find circular control element within a RadioItem */
function findControl(api: TestAPI, radioItemId?: string): string | undefined {
  const nodeIds = api.preview.getNodeIds()

  // If radioItemId provided, find control within that RadioItem
  if (radioItemId) {
    const radioItem = api.preview.inspect(radioItemId)
    if (!radioItem) return undefined

    // Control should be a direct child of the RadioItem with circular border
    return nodeIds.find(id => {
      const info = api.preview.inspect(id)
      if (!info || info.tagName?.toLowerCase() !== 'div') return false

      // Check if within RadioItem bounds
      const isWithin =
        info.bounds.left >= radioItem.bounds.left &&
        info.bounds.top >= radioItem.bounds.top &&
        info.bounds.right <= radioItem.bounds.right + 5 &&
        info.bounds.bottom <= radioItem.bounds.bottom + 5

      if (!isWithin) return false

      const br = info.styles.borderRadius
      const isCircular = br === '99px' || br === '9999px' || parseFloat(br) >= 50
      const isSmallish = info.bounds.width >= 16 && info.bounds.width <= 22
      return isCircular && isSmallish
    })
  }

  // Fallback: find first control
  return nodeIds.find(id => {
    const info = api.preview.inspect(id)
    if (!info || info.tagName?.toLowerCase() !== 'div') return false
    const br = info.styles.borderRadius
    const isCircular = br === '99px' || br === '9999px' || parseFloat(br) >= 50
    const isSmallish = info.bounds.width >= 16 && info.bounds.width <= 22
    return isCircular && isSmallish
  })
}

/** Find indicator element (small circular with blue background) within a RadioItem */
function findIndicator(api: TestAPI, radioItemId?: string): string | undefined {
  const nodeIds = api.preview.getNodeIds()

  // If radioItemId provided, find indicator within that RadioItem
  if (radioItemId) {
    const radioItem = api.preview.inspect(radioItemId)
    if (!radioItem) return undefined

    return nodeIds.find(id => {
      const info = api.preview.inspect(id)
      if (!info) return false

      // Check if within RadioItem bounds
      const isWithin =
        info.bounds.left >= radioItem.bounds.left &&
        info.bounds.top >= radioItem.bounds.top &&
        info.bounds.right <= radioItem.bounds.right + 5 &&
        info.bounds.bottom <= radioItem.bounds.bottom + 5

      if (!isWithin) return false

      // Allow smaller size due to scale 0.5 (visible size ~5px instead of 10px)
      const isSmall = info.bounds.width >= 4 && info.bounds.width <= 14
      const br = info.styles.borderRadius
      const isCircular = br === '99px' || br === '9999px' || parseFloat(br) >= 50
      const hasBlueBackground = info.styles.backgroundColor?.includes('91, 168, 245')
      return isSmall && isCircular && hasBlueBackground
    })
  }

  // Fallback: find first indicator
  return nodeIds.find(id => {
    const info = api.preview.inspect(id)
    if (!info) return false
    // Allow smaller size due to scale 0.5 (visible size ~5px instead of 10px)
    const isSmall = info.bounds.width >= 4 && info.bounds.width <= 14
    const br = info.styles.borderRadius
    const isCircular = br === '99px' || br === '9999px' || parseFloat(br) >= 50
    const hasBlueBackground = info.styles.backgroundColor?.includes('91, 168, 245')
    return isSmall && isCircular && hasBlueBackground
  })
}

// =============================================================================
// Tests
// =============================================================================

export const pureRadioGroupTests: TestCase[] = describe('Pure RadioGroup', [
  // ==========================================================================
  // STRUCTURE & RENDERING
  // ==========================================================================

  testWithSetup(
    'RadioItem container with gap renders correctly',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Option A"
    RadioItem "Option B"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find container with gap 8px
      const nodeIds = api.preview.getNodeIds()
      const containerId = nodeIds.find(id => {
        const info = api.preview.inspect(id)
        if (!info) return false
        const hasGap = info.styles.gap === '8px'
        const hasOptions =
          info.fullText?.includes('Option A') && info.fullText?.includes('Option B')
        return hasGap && hasOptions
      })
      api.assert.ok(containerId !== undefined, 'Container with gap 8 should exist')
      api.assert.hasStyle(containerId!, 'gap', '8px')
      api.assert.hasStyle(containerId!, 'flexDirection', 'column')
    }
  ),

  testWithSetup(
    'RadioItem renders with correct structure',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "First option"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'RadioItem should exist')

      const radioItemId = radioItems[0]
      const radioItem = api.preview.inspect(radioItemId)
      api.assert.equals(radioItem!.tagName.toLowerCase(), 'label', 'RadioItem should be a label')
      api.assert.hasStyle(radioItemId, 'flexDirection', 'row')
      api.assert.hasStyle(radioItemId, 'gap', '8px')
      api.assert.hasStyle(radioItemId, 'cursor', 'pointer')
    }
  ),

  testWithSetup(
    'RadioItem Control has circular styling (rad 99)',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Circle test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find RadioItem first, then find Control within it
      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'Should have at least 1 RadioItem')

      const radioItemId = radioItems[0]
      const controlId = findControl(api, radioItemId)
      api.assert.ok(controlId !== undefined, 'Control should exist within RadioItem')

      const control = api.preview.inspect(controlId!)
      const borderRadius = control!.styles.borderRadius
      api.assert.ok(
        borderRadius === '99px' || borderRadius === '9999px' || parseFloat(borderRadius) >= 50,
        `Control should be circular, got ${borderRadius}`
      )
      api.assert.ok(
        control!.bounds.width >= 16 && control!.bounds.width <= 20,
        `Control width should be ~18px, got ${control!.bounds.width}`
      )
    }
  ),

  testWithSetup(
    'RadioItem Indicator exists with correct styling',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "With indicator"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find RadioItem first, then find Indicator within it
      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'Should have at least 1 RadioItem')

      const radioItemId = radioItems[0]
      const indicatorId = findIndicator(api, radioItemId)
      api.assert.ok(indicatorId !== undefined, 'Indicator should exist within RadioItem')

      const indicator = api.preview.inspect(indicatorId!)
      const borderRadius = indicator!.styles.borderRadius
      api.assert.ok(
        borderRadius === '99px' || borderRadius === '9999px' || parseFloat(borderRadius) >= 50,
        `Indicator should be circular, got ${borderRadius}`
      )
    }
  ),

  // ==========================================================================
  // SLOT CONTENT PROJECTION
  // ==========================================================================

  testWithSetup(
    'Content: Slot receives RadioItem text',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Monthly Plan"
    RadioItem "Yearly Plan"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const item1 = findByText(api, 'Monthly Plan')
      const item2 = findByText(api, 'Yearly Plan')

      api.assert.ok(item1 !== undefined, 'First item should contain "Monthly Plan"')
      api.assert.ok(item2 !== undefined, 'Second item should contain "Yearly Plan"')
    }
  ),

  testWithSetup(
    'Content: Slot with long text',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Premium subscription with all features included"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const item = findByText(api, 'Premium subscription')
      api.assert.ok(item !== undefined, 'Should render long text')
    }
  ),

  testWithSetup(
    'Content: Slot with special characters',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Option A - $9/month"
    RadioItem "Option B - $99/year (Save 20%)"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const item1 = findByText(api, '$9/month')
      const item2 = findByText(api, 'Save 20%')

      api.assert.ok(item1 !== undefined, 'Should render special characters')
      api.assert.ok(item2 !== undefined, 'Should render parentheses and percent')
    }
  ),

  // ==========================================================================
  // EXCLUSIVE SELECTION
  // ==========================================================================

  testWithSetup(
    'Clicking RadioItem sets selected state',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Option A"
    RadioItem "Option B"
    RadioItem "Option C"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 3, 'Should have 3 RadioItems')

      // All should start unselected
      for (const id of radioItems) {
        const state = await api.utils.getDataAttribute(id, 'data-state')
        api.assert.ok(state !== 'on', `${id} should start unselected`)
      }

      // Click second item
      await api.interact.click(radioItems[1])
      await api.utils.delay(200)

      const state = await api.utils.getDataAttribute(radioItems[1], 'data-state')
      api.assert.equals(state, 'on', 'Second item should be selected after click')
    }
  ),

  testWithSetup(
    'exclusive() ensures only one item selected at a time',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "One"
    RadioItem "Two"
    RadioItem "Three"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 3, 'Should have 3 RadioItems')

      // Click "One"
      await api.interact.click(radioItems[0])
      await api.utils.delay(200)

      let state1 = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      const state2 = await api.utils.getDataAttribute(radioItems[1], 'data-state')
      let state3 = await api.utils.getDataAttribute(radioItems[2], 'data-state')

      api.assert.equals(state1, 'on', 'One should be selected')
      api.assert.ok(state2 !== 'on', 'Two should NOT be selected')
      api.assert.ok(state3 !== 'on', 'Three should NOT be selected')

      // Click "Three" - should deselect "One"
      await api.interact.click(radioItems[2])
      await api.utils.delay(200)

      state1 = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      state3 = await api.utils.getDataAttribute(radioItems[2], 'data-state')

      api.assert.ok(state1 !== 'on', 'One should be deselected')
      api.assert.equals(state3, 'on', 'Three should now be selected')
    }
  ),

  testWithSetup(
    'Clicking already-selected item keeps it selected',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Only option"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      const itemId = radioItems[0]

      // Click to select
      await api.interact.click(itemId)
      await api.utils.delay(200)

      let state = await api.utils.getDataAttribute(itemId, 'data-state')
      api.assert.equals(state, 'on', 'Should be selected after first click')

      // Click again - should stay selected
      await api.interact.click(itemId)
      await api.utils.delay(200)

      state = await api.utils.getDataAttribute(itemId, 'data-state')
      api.assert.equals(state, 'on', 'Should still be selected after second click')
    }
  ),

  // ==========================================================================
  // STATE PROPAGATION
  // ==========================================================================

  testWithSetup(
    'on: state propagates to Control border color',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Border test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find the RadioItem first, then find Control within it
      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'Should have at least 1 RadioItem')

      const radioItemId = radioItems[0]
      const controlId = findControl(api, radioItemId)
      api.assert.ok(controlId !== undefined, 'Control should exist within RadioItem')

      const controlBefore = api.preview.inspect(controlId!)
      const bocBefore = controlBefore!.styles.borderColor

      api.assert.ok(
        bocBefore.includes('63, 63, 70'), // #3f3f46
        `Control should have default border color, got ${bocBefore}`
      )

      // Click to select
      await api.interact.click(radioItemId)
      await api.utils.delay(200)

      const controlAfter = api.preview.inspect(controlId!)
      const bocAfter = controlAfter!.styles.borderColor

      api.assert.ok(
        bocAfter.includes('91, 168, 245'), // #5BA8F5
        `Control should have selected border color, got ${bocAfter}`
      )
    }
  ),

  testWithSetup(
    'on: state shows Indicator (opacity 0 to 1)',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Indicator test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find the RadioItem first, then find Indicator within it
      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'Should have at least 1 RadioItem')

      const radioItemId = radioItems[0]
      const indicatorId = findIndicator(api, radioItemId)
      api.assert.ok(indicatorId !== undefined, 'Indicator should exist within RadioItem')

      const indicatorBefore = api.preview.inspect(indicatorId!)
      api.assert.equals(
        indicatorBefore!.styles.opacity,
        '0',
        'Indicator should be hidden initially'
      )

      // Click to select
      await api.interact.click(radioItemId)
      await api.utils.delay(200)

      const indicatorAfter = api.preview.inspect(indicatorId!)
      api.assert.equals(
        indicatorAfter!.styles.opacity,
        '1',
        'Indicator should be visible when selected'
      )
    }
  ),

  testWithSetup(
    'Deselecting hides Indicator again',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "A"
    RadioItem "B"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 2, 'Should have 2 RadioItems')

      // Find indicator in A (RadioItem A is radioItems[0])
      const radioItemA = radioItems[0]
      const indicatorIdA = findIndicator(api, radioItemA)
      api.assert.ok(indicatorIdA !== undefined, 'Indicator A should exist')

      // Select A
      await api.interact.click(radioItemA)
      await api.utils.delay(200)

      let indicatorA = api.preview.inspect(indicatorIdA!)
      api.assert.equals(
        indicatorA!.styles.opacity,
        '1',
        'A indicator should be visible after selection'
      )

      // Select B - A should deselect
      await api.interact.click(radioItems[1])
      await api.utils.delay(200)

      // A's indicator should be hidden
      indicatorA = api.preview.inspect(indicatorIdA!)
      api.assert.equals(
        indicatorA!.styles.opacity,
        '0',
        'A indicator should be hidden after deselection'
      )
    }
  ),

  // ==========================================================================
  // STARTING STATE
  // ==========================================================================

  testWithSetup(
    'RadioItem with "selected" attribute starts selected',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Not selected"
    RadioItem "Pre-selected", on
    RadioItem "Also not selected"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 3, 'Should have 3 RadioItems')

      const state1 = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      const state2 = await api.utils.getDataAttribute(radioItems[1], 'data-state')
      const state3 = await api.utils.getDataAttribute(radioItems[2], 'data-state')

      api.assert.ok(state1 !== 'on', 'First should not be selected')
      api.assert.equals(state2, 'on', 'Second should be pre-selected')
      api.assert.ok(state3 !== 'on', 'Third should not be selected')
    }
  ),

  testWithSetup(
    'Pre-selected RadioItem can be changed',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "A"
    RadioItem "B", on`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)

      // B starts selected
      let stateB = await api.utils.getDataAttribute(radioItems[1], 'data-state')
      api.assert.equals(stateB, 'on', 'B should start selected')

      // Click A
      await api.interact.click(radioItems[0])
      await api.utils.delay(200)

      const stateA = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      stateB = await api.utils.getDataAttribute(radioItems[1], 'data-state')

      api.assert.equals(stateA, 'on', 'A should now be selected')
      api.assert.ok(stateB !== 'on', 'B should be deselected')
    }
  ),

  // ==========================================================================
  // CUSTOM STYLING VARIANTS
  // ==========================================================================

  testWithSetup(
    'RadioItem with custom colors (green)',
    `${RADIO_CUSTOM_COLORS}

Frame pad 16
  Frame gap 8
    RadioItem "Green option"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      await api.interact.click(radioItems[0])
      await api.utils.delay(200)

      // Find indicator with green background
      const nodeIds = api.preview.getNodeIds()
      const greenIndicator = nodeIds.find(id => {
        const info = api.preview.inspect(id)
        if (!info) return false
        return info.styles.backgroundColor?.includes('16, 185, 129') // #10b981
      })

      api.assert.ok(greenIndicator !== undefined, 'Should have green indicator')
    }
  ),

  testWithSetup(
    'RadioItem without Indicator still works',
    `${RADIO_NO_INDICATOR}

Frame pad 16
  Frame gap 8
    RadioItem "No dot"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'Should have at least 1 RadioItem')

      const radioItemId = radioItems[0]
      await api.interact.click(radioItemId)
      await api.utils.delay(200)

      const state = await api.utils.getDataAttribute(radioItemId, 'data-state')
      api.assert.equals(state, 'on', 'Should be selectable without indicator')

      // Control should have filled background when selected
      const controlId = findControl(api, radioItemId)
      api.assert.ok(controlId !== undefined, 'Control should exist within RadioItem')

      const control = api.preview.inspect(controlId!)
      const bg = control!.styles.backgroundColor

      api.assert.ok(
        bg.includes('91, 168, 245'), // #5BA8F5
        `Control should have selected background, got ${bg}`
      )
    }
  ),

  // ==========================================================================
  // LAYOUT VARIATIONS
  // ==========================================================================

  testWithSetup(
    'RadioItems in vertical layout (default)',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Option 1"
    RadioItem "Option 2"
    RadioItem "Option 3"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 3, 'Should have 3 RadioItems')

      const item1 = api.preview.inspect(radioItems[0])
      const item2 = api.preview.inspect(radioItems[1])
      const item3 = api.preview.inspect(radioItems[2])

      // Items should be stacked vertically
      api.assert.ok(
        item1!.bounds.top < item2!.bounds.top && item2!.bounds.top < item3!.bounds.top,
        'RadioItems should be stacked vertically'
      )
    }
  ),

  testWithSetup(
    'RadioItems in horizontal layout',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame hor, gap 16
    RadioItem "A"
    RadioItem "B"
    RadioItem "C"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 3, 'Should have 3 RadioItems')

      const item1 = api.preview.inspect(radioItems[0])
      const item2 = api.preview.inspect(radioItems[1])
      const item3 = api.preview.inspect(radioItems[2])

      // Items should be laid out horizontally
      api.assert.ok(
        item1!.bounds.left < item2!.bounds.left && item2!.bounds.left < item3!.bounds.left,
        'RadioItems should be laid out horizontally'
      )
    }
  ),

  testWithSetup(
    'Multiple groups are independent',
    `${RADIO_DEFINITIONS}

Frame pad 16, gap 24
  Frame gap 8
    RadioItem "Group1-A"
    RadioItem "Group1-B"
  Frame gap 8
    RadioItem "Group2-A"
    RadioItem "Group2-B"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 4, 'Should have 4 RadioItems')

      // Find items by text
      const g1a = radioItems.find(id => api.preview.inspect(id)?.fullText?.includes('Group1-A'))
      const g2b = radioItems.find(id => api.preview.inspect(id)?.fullText?.includes('Group2-B'))

      api.assert.ok(g1a !== undefined, 'Group1-A should exist')
      api.assert.ok(g2b !== undefined, 'Group2-B should exist')

      // Select from first group
      await api.interact.click(g1a!)
      await api.utils.delay(200)

      // Select from second group
      await api.interact.click(g2b!)
      await api.utils.delay(200)

      // Both should be selected (independent groups)
      const state1 = await api.utils.getDataAttribute(g1a!, 'data-state')
      const state2 = await api.utils.getDataAttribute(g2b!, 'data-state')

      api.assert.equals(state1, 'on', 'Group1-A should be selected')
      api.assert.equals(state2, 'on', 'Group2-B should be selected')
    }
  ),

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  testWithSetup(
    'Single RadioItem in group works',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Only option"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      await api.interact.click(radioItems[0])
      await api.utils.delay(200)

      const state = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      api.assert.equals(state, 'on', 'Single item should be selectable')
    }
  ),

  testWithSetup(
    'Many RadioItems render correctly',
    `${RADIO_NO_INDICATOR}

Frame pad 16
  Frame gap 4
    RadioItem "1"
    RadioItem "2"
    RadioItem "3"
    RadioItem "4"
    RadioItem "5"
    RadioItem "6"
    RadioItem "7"
    RadioItem "8"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 8, `Should have 8 RadioItems, got ${radioItems.length}`)

      // Select the 5th item
      await api.interact.click(radioItems[4])
      await api.utils.delay(200)

      const state5 = await api.utils.getDataAttribute(radioItems[4], 'data-state')
      api.assert.equals(state5, 'on', '5th item should be selected')

      // 1st should not be selected
      const state1 = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      api.assert.ok(state1 !== 'on', '1st item should not be selected')
    }
  ),

  testWithSetup(
    'Rapid clicking between items works',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "A"
    RadioItem "B"
    RadioItem "C"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)

      // Rapid clicks
      await api.interact.click(radioItems[0])
      await api.utils.delay(50)
      await api.interact.click(radioItems[1])
      await api.utils.delay(50)
      await api.interact.click(radioItems[2])
      await api.utils.delay(50)
      await api.interact.click(radioItems[0])
      await api.utils.delay(200)

      // Should end at first item
      const stateA = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      const stateB = await api.utils.getDataAttribute(radioItems[1], 'data-state')
      const stateC = await api.utils.getDataAttribute(radioItems[2], 'data-state')

      api.assert.equals(stateA, 'on', 'A should be selected at end')
      api.assert.ok(stateB !== 'on', 'B should not be selected')
      api.assert.ok(stateC !== 'on', 'C should not be selected')
    }
  ),

  testWithSetup(
    'RadioItem with empty text',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem ""`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'RadioItem should render with empty text')

      await api.interact.click(radioItems[0])
      await api.utils.delay(200)

      const state = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      api.assert.equals(state, 'on', 'Should be selectable with empty text')
    }
  ),

  // ==========================================================================
  // DATA ATTRIBUTES
  // ==========================================================================

  testWithSetup(
    'data-state attribute is set correctly',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "State test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)

      // Initially should be default
      let state = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      api.assert.ok(
        state === 'default' || state === null || state === '',
        `Initial state should be default, got "${state}"`
      )

      // After click should be "selected"
      await api.interact.click(radioItems[0])
      await api.utils.delay(200)

      state = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      api.assert.equals(state, 'on', 'State should be "selected" after click')
    }
  ),

  testWithSetup(
    'data-mirror-id attribute is present',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "ID test"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      const mirrorId = await api.utils.getDataAttribute(radioItems[0], 'data-mirror-id')
      api.assert.ok(mirrorId !== null && mirrorId !== '', 'Should have data-mirror-id')
    }
  ),

  // ==========================================================================
  // CLICK TARGET TESTS
  // ==========================================================================

  testWithSetup(
    'Clicking on RadioItem label selects',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Click label"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      await api.interact.click(radioItems[0])
      await api.utils.delay(200)

      const state = await api.utils.getDataAttribute(radioItems[0], 'data-state')
      api.assert.equals(state, 'on', 'Clicking label should select')
    }
  ),

  testWithSetup(
    'Clicking on Control selects parent RadioItem',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Click control"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find RadioItem first, then find Control within it
      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'Should have at least 1 RadioItem')

      const radioItemId = radioItems[0]
      const controlId = findControl(api, radioItemId)
      api.assert.ok(controlId !== undefined, 'Control should exist within RadioItem')

      // Click on Control
      await api.interact.click(controlId!)
      await api.utils.delay(200)

      // Parent RadioItem should be selected
      const state = await api.utils.getDataAttribute(radioItemId, 'data-state')
      api.assert.equals(state, 'on', 'Clicking control should select parent RadioItem')
    }
  ),

  // ==========================================================================
  // VISUAL CONSISTENCY
  // ==========================================================================

  testWithSetup(
    'Control and Indicator are aligned (centered)',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Alignment"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find RadioItem first, then find Control and Indicator within it
      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'Should have at least 1 RadioItem')

      const radioItemId = radioItems[0]
      const controlId = findControl(api, radioItemId)
      const indicatorId = findIndicator(api, radioItemId)

      api.assert.ok(controlId !== undefined, 'Control should exist within RadioItem')
      api.assert.ok(indicatorId !== undefined, 'Indicator should exist within RadioItem')

      const control = api.preview.inspect(controlId!)
      const indicator = api.preview.inspect(indicatorId!)

      const controlCenter = {
        x: control!.bounds.left + control!.bounds.width / 2,
        y: control!.bounds.top + control!.bounds.height / 2,
      }

      const indicatorCenter = {
        x: indicator!.bounds.left + indicator!.bounds.width / 2,
        y: indicator!.bounds.top + indicator!.bounds.height / 2,
      }

      const xDiff = Math.abs(controlCenter.x - indicatorCenter.x)
      const yDiff = Math.abs(controlCenter.y - indicatorCenter.y)

      api.assert.ok(
        xDiff < 10 && yDiff < 10,
        `Indicator should be centered in Control. X diff: ${xDiff}, Y diff: ${yDiff}`
      )
    }
  ),

  testWithSetup(
    'Text is to the right of Control',
    `${RADIO_DEFINITIONS}

Frame pad 16
  Frame gap 8
    RadioItem "Text position"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const radioItems = findRadioItems(api)
      api.assert.ok(radioItems.length >= 1, 'Should have at least 1 RadioItem')

      const radioItemId = radioItems[0]
      const controlId = findControl(api, radioItemId)
      api.assert.ok(controlId !== undefined, 'Control should exist within RadioItem')

      const control = api.preview.inspect(controlId!)
      const radioItem = api.preview.inspect(radioItemId)

      // Text should be visible
      api.assert.ok(radioItem!.fullText.includes('Text position'), 'Text should be visible')

      // Control should be near left edge
      api.assert.ok(
        control!.bounds.left <= radioItem!.bounds.left + 30,
        'Control should be near left edge of RadioItem'
      )
    }
  ),
])

export default pureRadioGroupTests
