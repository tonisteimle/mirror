/**
 * Pure Mirror Select Component Tests
 *
 * Tests for the pure Mirror Select component using loop-focus, typeahead, and trigger-text.
 */

import type { TestCase, TestAPI } from '../types'
import { describe, testWithSetup } from '../test-runner'

// Item component definition with states
// exclusive() makes siblings mutually exclusive, select() applies selected state
// onclick has both: select the item AND close the dropdown
// Note: Order matters! close() first transitions Trigger to default state (creates Text element),
// then select() updates that Text element with the selected value.
const ITEM_DEF = `Item: pad 8 12, rad 4, col #e4e4e7, cursor pointer, exclusive(), onclick close(Trigger) select()
  highlighted:
    bg #3f3f46
  selected:
    bg #5BA8F5
    col white`

// Pure Mirror Select - using component definition
const SELECT_TEMPLATE = `${ITEM_DEF}

Frame name Select, trigger-text
  Frame name Trigger, hor, spread, pad 10 12, bg #27272a, rad 6, cursor pointer, ver-center, toggle()
    Text "Choose...", col #a1a1aa
    Icon "chevron-down", is 16, ic #71717a
    hover:
      bg #3f3f46
    open:
      Icon "chevron-up", is 16, ic #71717a
  Frame name Content, bg #27272a, rad 8, pad 4, shadow md, gap 2, hidden, loop-focus, typeahead, onkeydown(arrow-down) highlightNext(Content), onkeydown(arrow-up) highlightPrev(Content), onkeydown(enter) close(Trigger) selectHighlighted(Content), onkeydown(escape) toggle(Trigger)
    Trigger.open:
      visible
    Item "Berlin"
    Item "Hamburg"
    Item "München"
    Item "Köln"
    Item "Frankfurt"`

export const pureSelectTests: TestCase[] = describe('Pure Mirror Select', [
  // ============================================================================
  // BASIC FUNCTIONALITY
  // ============================================================================

  testWithSetup(
    'Select renders with trigger and hidden content',
    SELECT_TEMPLATE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select container should exist
      const select = api.preview.inspect('node-1')
      api.assert.ok(select !== null, 'Select container should exist')

      // Find trigger (it has data-mirror-name="Trigger")
      const triggers = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(triggers.length > 0, 'Trigger should exist')

      // Find content
      const contents = api.preview.query('[data-mirror-name="Content"]')
      api.assert.ok(contents.length > 0, 'Content should exist')

      // Content should be hidden initially (display: none)
      api.assert.ok(
        contents[0].styles.display === 'none',
        `Content should be hidden initially, got display: ${contents[0].styles.display}`
      )
    }
  ),

  testWithSetup('Click trigger opens dropdown', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Find trigger
    const triggers = api.preview.query('[data-mirror-name="Trigger"]')
    api.assert.ok(triggers.length > 0, 'Trigger should exist')

    // Click trigger to open
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Content should be visible now
    const contents = api.preview.query('[data-mirror-name="Content"]')
    api.assert.ok(
      contents[0].styles.display !== 'none',
      `Content should be visible after click, got display: ${contents[0].styles.display}`
    )
  }),

  testWithSetup('Click trigger again closes dropdown', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    const triggers = api.preview.query('[data-mirror-name="Trigger"]')

    // Open
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Close
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Content should be hidden again
    const contents = api.preview.query('[data-mirror-name="Content"]')
    api.assert.ok(
      contents[0].styles.display === 'none',
      `Content should be hidden after second click, got display: ${contents[0].styles.display}`
    )
  }),

  // ============================================================================
  // ITEM SELECTION
  // ============================================================================

  testWithSetup(
    'Click item selects it and closes dropdown',
    SELECT_TEMPLATE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dropdown
      const triggers = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(triggers[0].nodeId)
      await api.utils.waitForIdle()

      // Find items
      const items = api.preview.query('[data-component="Item"]')
      api.assert.ok(items.length >= 5, `Should have 5 items, got ${items.length}`)

      // Click first item (Berlin)
      await api.interact.click(items[0].nodeId)
      await api.utils.waitForIdle()

      // Re-query items to get updated state
      const itemsAfter = api.preview.query('[data-component="Item"]')

      // Item should be selected
      api.assert.ok(
        itemsAfter[0].dataAttributes['data-selected'] === 'true',
        'Item should be selected after click'
      )

      // Dropdown should close
      const contents = api.preview.query('[data-mirror-name="Content"]')
      api.assert.ok(contents[0].styles.display === 'none', 'Dropdown should close after selection')
    }
  ),

  testWithSetup(
    'Only one item can be selected (exclusive)',
    SELECT_TEMPLATE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const triggers = api.preview.query('[data-mirror-name="Trigger"]')

      // Open and select first item
      await api.interact.click(triggers[0].nodeId)
      await api.utils.waitForIdle()

      let items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[0].nodeId)
      await api.utils.waitForIdle()

      // Open again and select second item
      await api.interact.click(triggers[0].nodeId)
      await api.utils.waitForIdle()

      items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[1].nodeId)
      await api.utils.waitForIdle()

      // Re-query items to get updated state
      items = api.preview.query('[data-component="Item"]')

      // First item should not be selected
      api.assert.ok(
        items[0].dataAttributes['data-selected'] !== 'true',
        'First item should not be selected anymore'
      )

      // Second item should be selected
      api.assert.ok(
        items[1].dataAttributes['data-selected'] === 'true',
        'Second item should be selected'
      )
    }
  ),

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================

  testWithSetup('Arrow down highlights next item', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Open dropdown
    const triggers = api.preview.query('[data-mirror-name="Trigger"]')
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Find content and press arrow down on it directly
    const contents = api.preview.query('[data-mirror-name="Content"]')
    await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown')
    await api.utils.sleep(50)

    // First item should be highlighted
    const items = api.preview.query('[data-component="Item"]')
    api.assert.ok(
      items[0].dataAttributes['data-highlighted'] === 'true',
      'First item should be highlighted after arrow down'
    )
  }),

  testWithSetup('Arrow up highlights previous item', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Open dropdown
    const triggers = api.preview.query('[data-mirror-name="Trigger"]')
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Find content and navigate
    const contents = api.preview.query('[data-mirror-name="Content"]')
    await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown')
    await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown')
    await api.utils.sleep(50)

    // Navigate back up
    await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowUp')
    await api.utils.sleep(50)

    // First item should be highlighted again
    const items = api.preview.query('[data-component="Item"]')
    api.assert.ok(
      items[0].dataAttributes['data-highlighted'] === 'true',
      'First item should be highlighted after arrow up'
    )
  }),

  testWithSetup('Escape closes dropdown', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Open dropdown
    const triggers = api.preview.query('[data-mirror-name="Trigger"]')
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Find content and press escape
    const contents = api.preview.query('[data-mirror-name="Content"]')
    await api.interact.pressKeyOn(contents[0].nodeId, 'Escape')
    await api.utils.waitForIdle()

    // Dropdown should close
    const contentsAfter = api.preview.query('[data-mirror-name="Content"]')
    api.assert.ok(contentsAfter[0].styles.display === 'none', 'Dropdown should close after Escape')
  }),

  // ============================================================================
  // LOOP FOCUS
  // ============================================================================

  testWithSetup(
    'Loop focus wraps from last to first item',
    SELECT_TEMPLATE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dropdown
      const triggers = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(triggers[0].nodeId)
      await api.utils.waitForIdle()

      // Navigate to last item (5 items)
      const contents = api.preview.query('[data-mirror-name="Content"]')
      for (let i = 0; i < 5; i++) {
        await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown')
      }
      await api.utils.sleep(50)

      // Press arrow down again - should wrap to first
      await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown')
      await api.utils.sleep(50)

      // First item should be highlighted
      const items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items[0].dataAttributes['data-highlighted'] === 'true',
        'First item should be highlighted after wrap'
      )
    }
  ),

  testWithSetup(
    'Loop focus wraps from first to last item',
    SELECT_TEMPLATE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dropdown
      const triggers = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(triggers[0].nodeId)
      await api.utils.waitForIdle()

      // Highlight first item
      const contents = api.preview.query('[data-mirror-name="Content"]')
      await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown')
      await api.utils.sleep(50)

      // Press arrow up - should wrap to last
      await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowUp')
      await api.utils.sleep(50)

      // Last item (Frankfurt, index 4) should be highlighted
      const items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items[4].dataAttributes['data-highlighted'] === 'true',
        `Last item should be highlighted after wrap, items[4] highlighted: ${items[4].dataAttributes['data-highlighted']}`
      )
    }
  ),

  // ============================================================================
  // TYPEAHEAD
  // ============================================================================

  testWithSetup('Typeahead jumps to matching item', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Open dropdown
    const triggers = api.preview.query('[data-mirror-name="Trigger"]')
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Type "m" to jump to München
    const contents = api.preview.query('[data-mirror-name="Content"]')
    await api.interact.pressKeyOn(contents[0].nodeId, 'm')
    await api.utils.sleep(50)

    // München (3rd item, index 2) should be highlighted
    const items = api.preview.query('[data-component="Item"]')
    api.assert.ok(
      items[2].dataAttributes['data-highlighted'] === 'true',
      `München should be highlighted after typing "m", items[2] highlighted: ${items[2].dataAttributes['data-highlighted']}`
    )
  }),

  testWithSetup('Typeahead matches multiple characters', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Open dropdown
    const triggers = api.preview.query('[data-mirror-name="Trigger"]')
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Type "ha" to jump to Hamburg
    const contents = api.preview.query('[data-mirror-name="Content"]')
    await api.interact.pressKeyOn(contents[0].nodeId, 'h')
    await api.interact.pressKeyOn(contents[0].nodeId, 'a')
    await api.utils.sleep(50)

    // Hamburg (2nd item, index 1) should be highlighted
    const items = api.preview.query('[data-component="Item"]')
    api.assert.ok(
      items[1].dataAttributes['data-highlighted'] === 'true',
      `Hamburg should be highlighted after typing "ha", items[1] highlighted: ${items[1].dataAttributes['data-highlighted']}`
    )
  }),

  // ============================================================================
  // ENTER KEY SELECTION
  // ============================================================================

  testWithSetup('Enter key selects highlighted item', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Open dropdown
    const triggers = api.preview.query('[data-mirror-name="Trigger"]')
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Highlight München (3rd item) using pressKeyOn directly
    const contents = api.preview.query('[data-mirror-name="Content"]')
    await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown') // Berlin
    await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown') // Hamburg
    await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown') // München
    await api.utils.sleep(50)

    // Press Enter to select
    await api.interact.pressKeyOn(contents[0].nodeId, 'Enter')
    await api.utils.waitForIdle()

    // München should be selected
    const items = api.preview.query('[data-component="Item"]')
    api.assert.ok(
      items[2].dataAttributes['data-selected'] === 'true',
      'München should be selected after Enter'
    )

    // Dropdown should close
    const contentsAfter = api.preview.query('[data-mirror-name="Content"]')
    api.assert.ok(
      contentsAfter[0].styles.display === 'none',
      'Dropdown should close after Enter selection'
    )
  }),

  testWithSetup('Enter key updates trigger text', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Open dropdown
    const triggers = api.preview.query('[data-mirror-name="Trigger"]')
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    // Highlight Frankfurt (5th item) using pressKeyOn directly
    const contents = api.preview.query('[data-mirror-name="Content"]')
    for (let i = 0; i < 5; i++) {
      await api.interact.pressKeyOn(contents[0].nodeId, 'ArrowDown')
    }
    await api.utils.sleep(50)

    // Press Enter to select
    await api.interact.pressKeyOn(contents[0].nodeId, 'Enter')
    await api.utils.waitForIdle()

    // Trigger should show Frankfurt
    const triggersAfter = api.preview.query('[data-mirror-name="Trigger"]')
    api.assert.ok(
      triggersAfter[0].fullText.includes('Frankfurt'),
      `Trigger should show "Frankfurt" after Enter, got: ${triggersAfter[0].fullText}`
    )
  }),

  // ============================================================================
  // SELECTION PERSISTENCE
  // ============================================================================

  testWithSetup(
    'Selection persists after closing and reopening',
    SELECT_TEMPLATE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const triggers = api.preview.query('[data-mirror-name="Trigger"]')

      // Open and select Köln (4th item)
      await api.interact.click(triggers[0].nodeId)
      await api.utils.waitForIdle()

      let items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[3].nodeId) // Köln
      await api.utils.waitForIdle()

      // Reopen dropdown
      await api.interact.click(triggers[0].nodeId)
      await api.utils.waitForIdle()

      // Köln should still be selected
      items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items[3].dataAttributes['data-selected'] === 'true',
        'Köln should still be selected after reopening'
      )
    }
  ),

  // ============================================================================
  // TRIGGER TEXT
  // ============================================================================

  testWithSetup('Trigger text updates on selection', SELECT_TEMPLATE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    // Find trigger text
    const triggers = api.preview.query('[data-mirror-name="Trigger"]')
    api.assert.ok(triggers.length > 0, 'Trigger element should exist')

    api.assert.ok(
      triggers[0].fullText.includes('Choose'),
      `Initial trigger should show "Choose...", got: ${triggers[0].fullText}`
    )

    // Open and select Hamburg (second item)
    await api.interact.click(triggers[0].nodeId)
    await api.utils.waitForIdle()

    const items = api.preview.query('[data-component="Item"]')
    await api.interact.click(items[1].nodeId)
    await api.utils.waitForIdle()

    // Re-query trigger to get updated text
    const triggersAfter = api.preview.query('[data-mirror-name="Trigger"]')

    api.assert.ok(
      triggersAfter[0].fullText.includes('Hamburg'),
      `Trigger should show "Hamburg" after selection, got: ${triggersAfter[0].fullText}`
    )
  }),

  testWithSetup(
    'Trigger text updates for different items',
    SELECT_TEMPLATE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const triggers = api.preview.query('[data-mirror-name="Trigger"]')

      // Select Berlin
      await api.interact.click(triggers[0].nodeId)
      await api.utils.waitForIdle()
      let items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[0].nodeId)
      await api.utils.waitForIdle()

      let triggersAfter = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(
        triggersAfter[0].fullText.includes('Berlin'),
        `Trigger should show "Berlin", got: ${triggersAfter[0].fullText}`
      )

      // Change to München
      await api.interact.click(triggersAfter[0].nodeId)
      await api.utils.waitForIdle()
      items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[2].nodeId)
      await api.utils.waitForIdle()

      triggersAfter = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(
        triggersAfter[0].fullText.includes('München'),
        `Trigger should now show "München", got: ${triggersAfter[0].fullText}`
      )
    }
  ),
])
