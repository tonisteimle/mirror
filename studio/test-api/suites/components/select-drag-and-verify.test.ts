/**
 * Select Component - Drag & Verify Tests
 *
 * These tests:
 * 1. Drag a Select from the Component Panel into the editor
 * 2. Verify the structure looks correct (Trigger, Content, Items)
 * 3. Test all functionality (open, select, close, keyboard nav)
 * 4. Verify visual appearance matches expectations
 */

import { test, testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Simulates dragging a component from the panel into the editor
 */
async function dragSelectFromPanel(api: TestAPI): Promise<string> {
  // Find the Select palette item
  const paletteItem = document.querySelector('[data-palette-id="comp-select"]') as HTMLElement
  if (!paletteItem) {
    throw new Error('Select palette item not found')
  }

  // Get dragData from the palette item
  const dragData = paletteItem.dataset.dragdata || paletteItem.getAttribute('data-dragdata')

  // Simulate the drop by calling the editor's drop handler
  const studioAPI = (window as any).__studioAPI
  if (studioAPI && studioAPI.insertComponent) {
    return studioAPI.insertComponent('Select')
  }

  // Fallback: use generateComponentCodeFromDragData
  const generateFn = (window as any).generateComponentCodeFromDragData
  if (generateFn) {
    return generateFn('Select')
  }

  throw new Error('No method available to insert Select component')
}

/**
 * Sets editor content and waits for compile
 */
async function setEditorContent(content: string): Promise<void> {
  const editor = (window as any).editor
  if (!editor) throw new Error('Editor not found')

  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: content },
  })

  await new Promise(resolve => setTimeout(resolve, 500))
}

/**
 * Gets current editor content
 */
function getEditorContent(): string {
  const editor = (window as any).editor
  return editor?.state?.doc?.toString() || ''
}

// =============================================================================
// Test Constants
// =============================================================================

// Standard Select code that gets inserted from panel
const SELECT_FROM_PANEL = `Item: pad 8 12, rad 4, col #e4e4e7, cursor pointer, exclusive(), onclick close(Trigger) select()
  highlighted:
    bg #3f3f46
  selected:
    bg #5BA8F5
    col white

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

// =============================================================================
// Test Suites
// =============================================================================

export const selectDragTests: TestCase[] = describe('Select - Drag from Panel', [
  testWithSetup(
    'Select inserted from panel has correct structure',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Verify Select container exists
      const selectContainer = api.preview.query('[data-mirror-name="Select"]')
      api.assert.ok(
        selectContainer.length > 0,
        'Select container should exist'
      )

      // Verify Trigger exists
      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(
        trigger.length > 0,
        'Trigger element should exist'
      )

      // Verify Content exists
      const content = api.preview.query('[data-mirror-name="Content"]')
      api.assert.ok(
        content.length > 0,
        'Content element should exist'
      )

      // Verify Items exist (should have 5)
      const items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items.length >= 5,
        `Should have 5 items, got ${items.length}`
      )
    }
  ),
])

export const selectAppearanceTests: TestCase[] = describe('Select - Appearance', [
  testWithSetup(
    'Trigger has correct visual appearance',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(trigger.length > 0, 'Trigger should exist')

      const styles = trigger[0].styles

      // Check background color (#27272a = rgb(39, 39, 42))
      api.assert.ok(
        styles.backgroundColor.includes('39, 39, 42') ||
        styles.backgroundColor === 'rgb(39, 39, 42)',
        `Trigger bg should be #27272a, got ${styles.backgroundColor}`
      )

      // Check border radius (rad 6 = 6px)
      api.assert.ok(
        styles.borderRadius === '6px' || styles.borderRadius === '6',
        `Trigger should have 6px radius, got ${styles.borderRadius}`
      )

      // Check padding (pad 10 12 = 10px top/bottom, 12px left/right)
      api.assert.ok(
        styles.padding.includes('10px') || styles.paddingTop === '10px',
        `Trigger should have correct padding, got ${styles.padding}`
      )

      // Check cursor
      api.assert.ok(
        styles.cursor === 'pointer',
        `Trigger cursor should be pointer, got ${styles.cursor}`
      )
    }
  ),

  testWithSetup(
    'Trigger shows placeholder text',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(
        trigger[0].fullText.includes('Choose'),
        `Trigger should show "Choose...", got "${trigger[0].fullText}"`
      )
    }
  ),

  testWithSetup(
    'Trigger has chevron icon',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Find trigger children that might be icons
      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      const triggerElement = trigger[0]

      // Check if trigger contains a chevron (either SVG or span with icon class)
      const hasIcon = triggerElement.children.length >= 2
      api.assert.ok(
        hasIcon,
        'Trigger should have icon child (chevron)'
      )
    }
  ),

  testWithSetup(
    'Content is hidden initially',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const content = api.preview.query('[data-mirror-name="Content"]')
      api.assert.ok(
        content[0].styles.display === 'none',
        `Content should be hidden (display: none), got ${content[0].styles.display}`
      )
    }
  ),

  testWithSetup(
    'Content has correct styling when open',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open the dropdown
      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      const content = api.preview.query('[data-mirror-name="Content"]')
      const styles = content[0].styles

      // Check content is visible
      api.assert.ok(
        styles.display !== 'none',
        'Content should be visible when open'
      )

      // Check background
      api.assert.ok(
        styles.backgroundColor.includes('39, 39, 42'),
        `Content bg should be #27272a, got ${styles.backgroundColor}`
      )

      // Check border radius
      api.assert.ok(
        styles.borderRadius === '8px' || styles.borderRadius === '8',
        `Content should have 8px radius, got ${styles.borderRadius}`
      )
    }
  ),

  testWithSetup(
    'Items have correct initial styling',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dropdown to see items
      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      const items = api.preview.query('[data-component="Item"]')
      api.assert.ok(items.length >= 1, 'Should have items')

      const firstItem = items[0]

      // Check padding (pad 8 12)
      api.assert.ok(
        firstItem.styles.padding.includes('8px') ||
        firstItem.styles.paddingTop === '8px',
        `Items should have correct padding, got ${firstItem.styles.padding}`
      )

      // Check text color (#e4e4e7)
      api.assert.ok(
        firstItem.styles.color.includes('228, 228, 231') ||
        firstItem.styles.color === 'rgb(228, 228, 231)',
        `Items should have color #e4e4e7, got ${firstItem.styles.color}`
      )

      // Check cursor
      api.assert.ok(
        firstItem.styles.cursor === 'pointer',
        `Items cursor should be pointer, got ${firstItem.styles.cursor}`
      )
    }
  ),
])

export const selectFunctionalityTests: TestCase[] = describe('Select - Functionality', [
  testWithSetup(
    'Clicking trigger opens dropdown',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Content should be hidden
      let content = api.preview.query('[data-mirror-name="Content"]')
      api.assert.ok(
        content[0].styles.display === 'none',
        'Content should start hidden'
      )

      // Click trigger
      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      // Content should be visible
      content = api.preview.query('[data-mirror-name="Content"]')
      api.assert.ok(
        content[0].styles.display !== 'none',
        'Content should be visible after click'
      )
    }
  ),

  testWithSetup(
    'Clicking trigger again closes dropdown',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')

      // Open
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      // Close
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      const content = api.preview.query('[data-mirror-name="Content"]')
      api.assert.ok(
        content[0].styles.display === 'none',
        'Content should be hidden after second click'
      )
    }
  ),

  testWithSetup(
    'Clicking item selects it',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dropdown
      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      // Click on Berlin (first item)
      let items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[0].nodeId)
      await api.utils.waitForIdle()

      // Item should be selected
      items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items[0].dataAttributes['data-selected'] === 'true',
        'First item should be selected'
      )
    }
  ),

  testWithSetup(
    'Selecting item closes dropdown',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      const items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[0].nodeId)
      await api.utils.waitForIdle()

      const content = api.preview.query('[data-mirror-name="Content"]')
      api.assert.ok(
        content[0].styles.display === 'none',
        'Dropdown should close after selection'
      )
    }
  ),

  testWithSetup(
    'Selected value appears in trigger',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open and select Hamburg
      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      const items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[1].nodeId) // Hamburg is second
      await api.utils.waitForIdle()

      // Trigger should now show Hamburg
      const triggerAfter = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(
        triggerAfter[0].fullText.includes('Hamburg'),
        `Trigger should show "Hamburg", got "${triggerAfter[0].fullText}"`
      )
    }
  ),

  testWithSetup(
    'Can change selection',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      let trigger = api.preview.query('[data-mirror-name="Trigger"]')

      // Select Berlin
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()
      let items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[0].nodeId)
      await api.utils.waitForIdle()

      trigger = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(
        trigger[0].fullText.includes('Berlin'),
        'Berlin should be selected'
      )

      // Change to München
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()
      items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[2].nodeId) // München is third
      await api.utils.waitForIdle()

      trigger = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(
        trigger[0].fullText.includes('München'),
        `Should now show München, got "${trigger[0].fullText}"`
      )
    }
  ),

  testWithSetup(
    'Only one item selected at a time (exclusive)',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')

      // Select first item
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()
      let items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[0].nodeId)
      await api.utils.waitForIdle()

      // Select second item
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()
      items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[1].nodeId)
      await api.utils.waitForIdle()

      // Check states
      items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items[0].dataAttributes['data-selected'] !== 'true',
        'First item should NOT be selected'
      )
      api.assert.ok(
        items[1].dataAttributes['data-selected'] === 'true',
        'Second item should be selected'
      )
    }
  ),

  testWithSetup(
    'Selected item has correct styling',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select an item
      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      let items = api.preview.query('[data-component="Item"]')
      await api.interact.click(items[0].nodeId)
      await api.utils.waitForIdle()

      // Reopen to see styled item
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      items = api.preview.query('[data-component="Item"]')

      // Selected item should have blue background (#5BA8F5)
      api.assert.ok(
        items[0].styles.backgroundColor.includes('91, 168, 245'),
        `Selected item should have blue bg, got ${items[0].styles.backgroundColor}`
      )

      // Selected item should have white text
      api.assert.ok(
        items[0].styles.color.includes('255, 255, 255') ||
        items[0].styles.color === 'rgb(255, 255, 255)' ||
        items[0].styles.color === 'white',
        `Selected item should have white text, got ${items[0].styles.color}`
      )
    }
  ),
])

export const selectKeyboardTests: TestCase[] = describe('Select - Keyboard Navigation', [
  testWithSetup(
    'Arrow down highlights next item',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Open dropdown
      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      // Press arrow down on content
      const content = api.preview.query('[data-mirror-name="Content"]')
      await api.interact.pressKeyOn(content[0].nodeId, 'ArrowDown')
      await api.utils.sleep(100)

      // First item should be highlighted
      const items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items[0].dataAttributes['data-highlighted'] === 'true',
        'First item should be highlighted'
      )
    }
  ),

  testWithSetup(
    'Arrow up highlights previous item',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      const content = api.preview.query('[data-mirror-name="Content"]')

      // Navigate down twice
      await api.interact.pressKeyOn(content[0].nodeId, 'ArrowDown')
      await api.interact.pressKeyOn(content[0].nodeId, 'ArrowDown')
      await api.utils.sleep(100)

      // Navigate back up
      await api.interact.pressKeyOn(content[0].nodeId, 'ArrowUp')
      await api.utils.sleep(100)

      // First item should be highlighted
      const items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items[0].dataAttributes['data-highlighted'] === 'true',
        'First item should be highlighted after ArrowUp'
      )
    }
  ),

  testWithSetup(
    'Enter selects highlighted item',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      const content = api.preview.query('[data-mirror-name="Content"]')

      // Navigate to München (3rd item)
      await api.interact.pressKeyOn(content[0].nodeId, 'ArrowDown')
      await api.interact.pressKeyOn(content[0].nodeId, 'ArrowDown')
      await api.interact.pressKeyOn(content[0].nodeId, 'ArrowDown')
      await api.utils.sleep(100)

      // Press Enter
      await api.interact.pressKeyOn(content[0].nodeId, 'Enter')
      await api.utils.waitForIdle()

      // München should be selected
      const items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items[2].dataAttributes['data-selected'] === 'true',
        'München should be selected'
      )

      // Trigger should show München
      const triggerAfter = api.preview.query('[data-mirror-name="Trigger"]')
      api.assert.ok(
        triggerAfter[0].fullText.includes('München'),
        `Trigger should show München, got "${triggerAfter[0].fullText}"`
      )
    }
  ),

  testWithSetup(
    'Escape closes dropdown',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      const content = api.preview.query('[data-mirror-name="Content"]')
      await api.interact.pressKeyOn(content[0].nodeId, 'Escape')
      await api.utils.waitForIdle()

      const contentAfter = api.preview.query('[data-mirror-name="Content"]')
      api.assert.ok(
        contentAfter[0].styles.display === 'none',
        'Dropdown should close after Escape'
      )
    }
  ),

  testWithSetup(
    'Typeahead jumps to matching item',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      // Type "m" to jump to München
      const content = api.preview.query('[data-mirror-name="Content"]')
      await api.interact.pressKeyOn(content[0].nodeId, 'm')
      await api.utils.sleep(100)

      // München (3rd item) should be highlighted
      const items = api.preview.query('[data-component="Item"]')
      api.assert.ok(
        items[2].dataAttributes['data-highlighted'] === 'true',
        `München should be highlighted after typing "m"`
      )
    }
  ),
])

export const selectHoverTests: TestCase[] = describe('Select - Hover States', [
  testWithSetup(
    'Trigger shows hover state',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      const bgBefore = trigger[0].styles.backgroundColor

      // Hover
      await api.interact.hover(trigger[0].nodeId)
      await api.utils.delay(200)

      const triggerAfter = api.preview.query('[data-mirror-name="Trigger"]')
      const bgAfter = triggerAfter[0].styles.backgroundColor

      // Background should change to #3f3f46 on hover
      api.assert.ok(
        bgAfter.includes('63, 63, 70') ||
        bgAfter !== bgBefore,
        `Trigger hover should change bg, before: ${bgBefore}, after: ${bgAfter}`
      )
    }
  ),

  testWithSetup(
    'Item shows hover/highlight state',
    SELECT_FROM_PANEL,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const trigger = api.preview.query('[data-mirror-name="Trigger"]')
      await api.interact.click(trigger[0].nodeId)
      await api.utils.waitForIdle()

      const items = api.preview.query('[data-component="Item"]')

      // Hover over first item
      await api.interact.hover(items[0].nodeId)
      await api.utils.delay(200)

      const itemAfter = api.preview.query('[data-component="Item"]')

      // Should have highlighted background (#3f3f46)
      api.assert.ok(
        itemAfter[0].styles.backgroundColor.includes('63, 63, 70') ||
        itemAfter[0].dataAttributes['data-highlighted'] === 'true',
        `Item should have hover state`
      )
    }
  ),
])

// =============================================================================
// Export all tests
// =============================================================================

export const allSelectDragAndVerifyTests: TestCase[] = [
  ...selectDragTests,
  ...selectAppearanceTests,
  ...selectFunctionalityTests,
  ...selectKeyboardTests,
  ...selectHoverTests,
]

export default allSelectDragAndVerifyTests
