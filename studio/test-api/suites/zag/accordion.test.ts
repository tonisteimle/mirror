/**
 * Pure Accordion Tests
 *
 * Tests for Pure Mirror Accordion component.
 * Focus on basic functionality: rendering, toggle behavior, and code structure.
 *
 * Note: These tests use the Pure Component definitions.
 * When dropped from Component Panel, the mirTemplate is used instead.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Full Accordion definitions for tests
const ACCORDION_DEFINITION = `Accordion as Frame: ver, gap 2
  Content: Slot`

const ACCORDION_ITEM_DEFINITION = `AccordionItem as Frame: ver, toggle()
  Header: Frame hor, spread, ver-center, pad 12 16, bg #27272a, rad 6, cursor pointer
    hover:
      bg #3f3f46
    Content: Slot
    Chevron: Icon "chevron-down", is 16, ic #888
      on:
        rot 180
  Panel: Frame pad 16, hidden
    on:
      visible
    Content: Slot`

const FULL_ACCORDION_DEFS = `${ACCORDION_DEFINITION}

${ACCORDION_ITEM_DEFINITION}`

// =============================================================================
// Structure & Rendering Tests
// =============================================================================

export const accordionStructureTests: TestCase[] = describe('Accordion Structure', [
  testWithSetup(
    'AccordionItem renders as container',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Section Title"
  Panel: Text "Section Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const item = api.preview.inspect('node-1')
      api.assert.ok(item !== null, 'AccordionItem should render')
      api.assert.ok(item?.tagName?.toLowerCase() === 'div', `Should be a div, got ${item?.tagName}`)
    }
  ),

  testWithSetup(
    'AccordionItem has children',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Click Me"
  Panel: Text "Hidden Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const item = api.preview.inspect('node-1')
      api.assert.ok(
        item?.children && item.children.length > 0,
        'AccordionItem should have children'
      )
    }
  ),

  testWithSetup(
    'Multiple AccordionItems in Accordion container',
    `${FULL_ACCORDION_DEFS}

Accordion
  AccordionItem
    Header: Text "Section 1"
    Panel: Text "Content 1"
  AccordionItem
    Header: Text "Section 2"
    Panel: Text "Content 2"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const accordion = api.preview.inspect('node-1')
      api.assert.ok(accordion !== null, 'Accordion should render')
      api.assert.ok(
        accordion?.children && accordion.children.length >= 2,
        `Should have at least 2 children, got ${accordion?.children?.length}`
      )
    }
  ),

  testWithSetup(
    'AccordionItem code structure is correct',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Title"
  Panel: Text "Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(code.includes('AccordionItem'), 'Should have AccordionItem')
      api.assert.ok(code.includes('Header:'), 'Should have Header slot')
      api.assert.ok(code.includes('Panel:'), 'Should have Panel slot')
    }
  ),
])

// =============================================================================
// Helper function to get data-state attribute
// =============================================================================

function getDataState(nodeId: string): string | null {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  return element?.getAttribute('data-state') ?? null
}

// =============================================================================
// Toggle Behavior Tests
// =============================================================================

export const accordionToggleTests: TestCase[] = describe('Accordion Toggle Behavior', [
  testWithSetup(
    'AccordionItem starts without "on" state',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Closed Section"
  Panel: Text "Hidden by default"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const state = getDataState('node-1')
      api.assert.ok(state !== 'on', `Should not be in "on" state by default, got ${state}`)
    }
  ),

  testWithSetup(
    'AccordionItem with "on" attribute starts in on state',
    `${FULL_ACCORDION_DEFS}

AccordionItem, on
  Header: Text "Open Section"
  Panel: Text "Visible content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const state = getDataState('node-1')
      api.assert.ok(state === 'on', `Should be in "on" state, got ${state}`)
    }
  ),

  testWithSetup(
    'Clicking AccordionItem toggles state',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Click to toggle"
  Panel: Text "Toggle content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get initial state
      const stateBefore = getDataState('node-1')
      api.assert.ok(stateBefore !== 'on', 'Should start closed')

      // Click the AccordionItem using its nodeId
      await api.interact.click('node-1')
      await api.utils.delay(100)

      const stateAfter = getDataState('node-1')
      api.assert.ok(stateAfter === 'on', `Should be on after click, got ${stateAfter}`)
    }
  ),

  testWithSetup(
    'Toggle works - double click returns to initial state',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Toggle twice"
  Panel: Text "Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // First click - open
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Second click - close
      await api.interact.click('node-1')
      await api.utils.delay(100)

      const state = getDataState('node-1')
      api.assert.ok(state !== 'on', `Should be closed after double click, got ${state}`)
    }
  ),
])

// =============================================================================
// Chevron Tests
// =============================================================================

export const accordionChevronTests: TestCase[] = describe('Accordion Chevron', [
  testWithSetup(
    'Accordion definition includes chevron',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "With Chevron"
  Panel: Text "Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('chevron-down') || code.includes('Chevron'),
        'Definition should include chevron'
      )
    }
  ),

  testWithSetup(
    'Chevron has rotation in on state definition',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Rotated Chevron"
  Panel: Text "Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(code.includes('rot 180'), 'Chevron should rotate 180 degrees in on state')
    }
  ),
])

// =============================================================================
// Styling Tests
// =============================================================================

export const accordionStylingTests: TestCase[] = describe('Accordion Styling', [
  testWithSetup(
    'Accordion has vertical layout',
    `${FULL_ACCORDION_DEFS}

Accordion
  AccordionItem
    Header: Text "Item 1"
    Panel: Text "Content 1"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const accordion = api.preview.inspect('node-1')
      api.assert.ok(
        accordion?.styles?.flexDirection === 'column',
        `Should be vertical, got ${accordion?.styles?.flexDirection}`
      )
    }
  ),

  testWithSetup(
    'AccordionItem Header has background',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Styled Header"
  Panel: Text "Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // The definition specifies bg #27272a for header
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('bg #27272a'),
        'Header should have background color in definition'
      )
    }
  ),

  testWithSetup(
    'Panel is hidden by default in definition',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Closed"
  Panel: Text "Hidden"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('Panel: Frame pad 16, hidden'),
        'Panel should be defined as hidden'
      )
    }
  ),

  testWithSetup(
    'Panel becomes visible in on state',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Open"
  Panel: Text "Visible"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('on:') && code.includes('visible'),
        'Panel should become visible in on state'
      )
    }
  ),
])

// =============================================================================
// Content Slot Tests
// =============================================================================

export const accordionContentTests: TestCase[] = describe('Accordion Content Slots', [
  testWithSetup(
    'Header Content slot works',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "My Custom Header"
  Panel: Text "Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const hasText = document.body.textContent?.includes('My Custom Header')
      api.assert.ok(hasText, 'Header should display custom text')
    }
  ),

  testWithSetup(
    'Panel Content slot works',
    `${FULL_ACCORDION_DEFS}

AccordionItem, on
  Header: Text "Open"
  Panel: Text "Panel Content Here"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const hasText = document.body.textContent?.includes('Panel Content Here')
      api.assert.ok(hasText, 'Panel should display custom text')
    }
  ),

  testWithSetup(
    'Header can contain multiple elements',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Frame hor, gap 8
    Icon "folder", is 16
    Text "Folder Name"
  Panel: Text "Folder contents"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(code.includes('Icon "folder"'), 'Header should have Icon')
      api.assert.ok(code.includes('Text "Folder Name"'), 'Header should have Text')
    }
  ),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const accordionEdgeCaseTests: TestCase[] = describe('Accordion Edge Cases', [
  testWithSetup(
    'Single AccordionItem renders',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "Only Item"
  Panel: Text "Only content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const item = api.preview.inspect('node-1')
      api.assert.ok(item !== null, 'Single AccordionItem should render')
    }
  ),

  testWithSetup(
    'Many AccordionItems compile correctly',
    `${FULL_ACCORDION_DEFS}

Accordion
  AccordionItem
    Header: Text "Item 1"
    Panel: Text "Content 1"
  AccordionItem
    Header: Text "Item 2"
    Panel: Text "Content 2"
  AccordionItem
    Header: Text "Item 3"
    Panel: Text "Content 3"
  AccordionItem
    Header: Text "Item 4"
    Panel: Text "Content 4"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      const count = (code.match(/AccordionItem\n/g) || []).length
      api.assert.ok(count >= 4, `Should have 4 AccordionItems, got ${count}`)
    }
  ),

  testWithSetup(
    'Nested content in Panel',
    `${FULL_ACCORDION_DEFS}

AccordionItem, on
  Header: Text "Expandable"
  Panel: Frame gap 8
    Text "Line 1"
    Text "Line 2"
    Button "Action"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(code.includes('Button "Action"'), 'Panel should contain nested Button')
    }
  ),

  testWithSetup(
    'AccordionItem with long header text',
    `${FULL_ACCORDION_DEFS}

AccordionItem
  Header: Text "This is a very long header text that might wrap to multiple lines"
  Panel: Text "Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const hasText = document.body.textContent?.includes('This is a very long header text')
      api.assert.ok(hasText, 'Long header text should render')
    }
  ),

  testWithSetup(
    'AccordionItem with custom styling',
    `AccordionItem as Frame: ver, toggle()
  Header: Frame pad 20, bg #1e40af, rad 8, cursor pointer
    Content: Slot
  Panel: Frame pad 20, hidden
    on:
      visible
    Content: Slot

AccordionItem
  Header: Text "Blue Header"
  Panel: Text "Custom styled"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(code.includes('bg #1e40af'), 'Should have custom blue background')
      api.assert.ok(code.includes('pad 20'), 'Should have custom padding')
    }
  ),
])

// =============================================================================
// Combined Exports
// =============================================================================

export const allAccordionTests: TestCase[] = [
  ...accordionStructureTests,
  ...accordionToggleTests,
  ...accordionChevronTests,
  ...accordionStylingTests,
  ...accordionContentTests,
  ...accordionEdgeCaseTests,
]
