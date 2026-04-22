/**
 * Events Section Tests
 *
 * Tests for adding, editing, and deleting events via the Property Panel.
 * Verifies the Add Event functionality works end-to-end.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

function getPropertyPanel(): HTMLElement | null {
  return document.querySelector('.property-panel')
}

function getEventsSection(): HTMLElement | null {
  const panel = getPropertyPanel()
  if (!panel) return null
  // Find the Events section by label
  const labels = panel.querySelectorAll('.section-label')
  for (const label of labels) {
    if (label.textContent?.trim() === 'Events') {
      return label.closest('.section') as HTMLElement
    }
  }
  return null
}

function getAddEventSelect(): HTMLSelectElement | null {
  const section = getEventsSection()
  return section?.querySelector('.pp-add-event-select') as HTMLSelectElement | null
}

function getEventRows(): HTMLElement[] {
  const section = getEventsSection()
  if (!section) return []
  return Array.from(section.querySelectorAll('.pp-event-row'))
}

function getEventActionInput(eventName: string): HTMLInputElement | null {
  const section = getEventsSection()
  if (!section) return null
  return section.querySelector(`input[data-event-name="${eventName}"]`) as HTMLInputElement | null
}

function getDeleteEventButton(eventName: string): HTMLButtonElement | null {
  const section = getEventsSection()
  if (!section) return null
  return section.querySelector(
    `button[data-delete-event="${eventName}"]`
  ) as HTMLButtonElement | null
}

// =============================================================================
// Add Event Tests
// =============================================================================

export const addEventTests: TestCase[] = describe('Add Event', [
  testWithSetup(
    'Events section is visible when element is selected',
    `Button "Click me", bg #2271C1, col white, pad 12 24`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Check Events section exists
      const eventsSection = getEventsSection()
      api.assert.ok(eventsSection !== null, 'Events section should exist in property panel')
    }
  ),

  testWithSetup(
    'Add event dropdown shows available events',
    `Button "Click me", bg #2271C1, col white, pad 12 24`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Check Add event select exists
      const addSelect = getAddEventSelect()
      api.assert.ok(addSelect !== null, 'Add event select should exist')

      // Check it has options
      const options = Array.from(addSelect!.options)
      api.assert.ok(
        options.length > 1,
        `Add event select should have options, got ${options.length}`
      )

      // Check for common events
      const optionValues = options.map(o => o.value)
      api.assert.ok(
        optionValues.includes('onclick'),
        `Should have onclick option, got: ${optionValues.join(', ')}`
      )
      api.assert.ok(
        optionValues.includes('onhover'),
        `Should have onhover option, got: ${optionValues.join(', ')}`
      )
    }
  ),

  testWithSetup(
    'Add onclick event updates code',
    `Button "Click me", bg #2271C1, col white, pad 12 24`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Get initial code
      const codeBefore = api.editor.getCode()
      api.assert.ok(
        !codeBefore.includes('onclick'),
        `Code should not have onclick initially, got: ${codeBefore}`
      )

      // Find and use the add event select
      const addSelect = getAddEventSelect()
      api.assert.ok(addSelect !== null, 'Add event select should exist')

      // Select onclick
      addSelect!.value = 'onclick'
      addSelect!.dispatchEvent(new Event('change', { bubbles: true }))

      // Wait for code update
      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Check code was updated
      const codeAfter = api.editor.getCode()
      api.assert.ok(
        codeAfter.includes('onclick'),
        `Code should contain onclick after adding, got: ${codeAfter}`
      )
    }
  ),

  testWithSetup(
    'Add onhover event updates code',
    `Frame bg #333, pad 16, w 100, h 100`,
    async (api: TestAPI) => {
      // Select the Frame
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Get initial code
      const codeBefore = api.editor.getCode()
      api.assert.ok(!codeBefore.includes('onhover'), `Code should not have onhover initially`)

      // Find and use the add event select
      const addSelect = getAddEventSelect()
      api.assert.ok(addSelect !== null, 'Add event select should exist')

      // Select onhover
      addSelect!.value = 'onhover'
      addSelect!.dispatchEvent(new Event('change', { bubbles: true }))

      // Wait for code update
      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Check code was updated
      const codeAfter = api.editor.getCode()
      api.assert.ok(
        codeAfter.includes('onhover'),
        `Code should contain onhover after adding, got: ${codeAfter}`
      )
    }
  ),

  testWithSetup(
    'Added event appears in Events section',
    `Button "Click me", bg #2271C1, col white, pad 12 24`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Count initial event rows
      const initialRows = getEventRows()
      const initialCount = initialRows.length

      // Add onclick event
      const addSelect = getAddEventSelect()
      api.assert.ok(addSelect !== null, 'Add event select should exist')
      addSelect!.value = 'onclick'
      addSelect!.dispatchEvent(new Event('change', { bubbles: true }))

      // Wait for update
      await api.utils.delay(800)
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Re-select to refresh panel
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Check event row was added
      const newRows = getEventRows()
      api.assert.ok(
        newRows.length > initialCount,
        `Event row should be added. Initial: ${initialCount}, Now: ${newRows.length}`
      )
    }
  ),
])

// =============================================================================
// Existing Event Tests
// =============================================================================

export const existingEventTests: TestCase[] = describe('Existing Events', [
  testWithSetup(
    'Shows existing onclick event',
    `Button "Click me", onclick toggle(), bg #2271C1, col white`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Check event row exists
      const eventRows = getEventRows()
      api.assert.ok(
        eventRows.length >= 1,
        `Should have at least one event row, got ${eventRows.length}`
      )

      // Check onclick input exists with value
      const onclickInput = getEventActionInput('onclick')
      api.assert.ok(onclickInput !== null, 'onclick input should exist')
      api.assert.ok(
        onclickInput!.value.includes('toggle'),
        `onclick input should show toggle(), got: ${onclickInput!.value}`
      )
    }
  ),

  testWithSetup(
    'Shows multiple events',
    `Button "Interactive", onclick toggle(), onhover show(Tooltip), bg #333`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Check event rows
      const eventRows = getEventRows()
      api.assert.ok(
        eventRows.length >= 2,
        `Should have at least 2 event rows, got ${eventRows.length}`
      )

      // Check both inputs exist
      const onclickInput = getEventActionInput('onclick')
      const onhoverInput = getEventActionInput('onhover')
      api.assert.ok(onclickInput !== null, 'onclick input should exist')
      api.assert.ok(onhoverInput !== null, 'onhover input should exist')
    }
  ),

  testWithSetup(
    'Already added events are not in dropdown',
    `Button "Click me", onclick toggle(), bg #2271C1`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Check Add event select
      const addSelect = getAddEventSelect()
      api.assert.ok(addSelect !== null, 'Add event select should exist')

      // Check onclick is NOT in options (already added)
      const options = Array.from(addSelect!.options)
      const optionValues = options.map(o => o.value)
      api.assert.ok(
        !optionValues.includes('onclick'),
        `onclick should NOT be in options (already added), got: ${optionValues.join(', ')}`
      )

      // But onhover should still be available
      api.assert.ok(
        optionValues.includes('onhover'),
        `onhover should still be in options, got: ${optionValues.join(', ')}`
      )
    }
  ),
])

// =============================================================================
// Edit Event Tests
// =============================================================================

export const editEventTests: TestCase[] = describe('Edit Events', [
  testWithSetup(
    'Edit event action updates code',
    `Button "Click me", onclick toggle(), bg #2271C1`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Get onclick input
      const onclickInput = getEventActionInput('onclick')
      api.assert.ok(onclickInput !== null, 'onclick input should exist')

      // Change value
      onclickInput!.value = 'show(Menu)'
      onclickInput!.dispatchEvent(new Event('change', { bubbles: true }))

      // Wait for code update
      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Check code was updated
      const code = api.editor.getCode()
      api.assert.ok(code.includes('show(Menu)'), `Code should contain show(Menu), got: ${code}`)
    }
  ),
])

// =============================================================================
// Delete Event Tests
// =============================================================================

export const deleteEventTests: TestCase[] = describe('Delete Events', [
  testWithSetup(
    'Delete event button exists',
    `Button "Click me", onclick toggle(), bg #2271C1`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Check delete button exists
      const deleteBtn = getDeleteEventButton('onclick')
      api.assert.ok(deleteBtn !== null, 'Delete button for onclick should exist')
    }
  ),

  testWithSetup(
    'Delete event removes from code',
    `Button "Click me", onclick toggle(), bg #2271C1`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Verify onclick is in code
      let code = api.editor.getCode()
      api.assert.ok(code.includes('onclick'), 'Code should have onclick initially')

      // Click delete button
      const deleteBtn = getDeleteEventButton('onclick')
      api.assert.ok(deleteBtn !== null, 'Delete button should exist')
      deleteBtn!.click()

      // Wait for code update
      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Check onclick was removed
      code = api.editor.getCode()
      api.assert.ok(
        !code.includes('onclick'),
        `Code should NOT contain onclick after delete, got: ${code}`
      )
    }
  ),
])

// =============================================================================
// Integration Tests
// =============================================================================

export const eventIntegrationTests: TestCase[] = describe('Event Integration', [
  testWithSetup(
    'Custom event dispatched on add',
    `Button "Test", bg #333`,
    async (api: TestAPI) => {
      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Set up listener for custom event
      let eventReceived = false
      let eventDetail: { nodeId: string; eventName: string } | null = null

      const listener = (e: CustomEvent) => {
        eventReceived = true
        eventDetail = e.detail
      }

      document.addEventListener('property-panel:add-event', listener as EventListener)

      try {
        // Trigger add event
        const addSelect = getAddEventSelect()
        api.assert.ok(addSelect !== null, 'Add event select should exist')
        addSelect!.value = 'onclick'
        addSelect!.dispatchEvent(new Event('change', { bubbles: true }))

        // Wait a bit for event to propagate
        await api.utils.delay(100)

        // Verify custom event was dispatched
        api.assert.ok(eventReceived, 'Custom event property-panel:add-event should be dispatched')
        api.assert.ok(
          eventDetail?.nodeId === 'node-1',
          `Event detail should have nodeId node-1, got: ${eventDetail?.nodeId}`
        )
        api.assert.ok(
          eventDetail?.eventName === 'onclick',
          `Event detail should have eventName onclick, got: ${eventDetail?.eventName}`
        )
      } finally {
        document.removeEventListener('property-panel:add-event', listener as EventListener)
      }
    }
  ),

  testWithSetup(
    'Event listener is connected to CodeModifier',
    `Button "Test", bg #333, pad 12`,
    async (api: TestAPI) => {
      // This test verifies the full chain: UI -> CustomEvent -> Listener -> CodeModifier -> Code Update

      // Select the Button
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Store initial code
      const codeBefore = api.editor.getCode()

      // Add event via UI
      const addSelect = getAddEventSelect()
      api.assert.ok(addSelect !== null, 'Add event select should exist')
      addSelect!.value = 'onclick'
      addSelect!.dispatchEvent(new Event('change', { bubbles: true }))

      // Wait for full processing chain
      await api.utils.delay(1000)
      await api.utils.waitForCompile()

      // Check if code changed
      const codeAfter = api.editor.getCode()
      const codeChanged = codeAfter !== codeBefore

      // This test will FAIL if the event listener is not connected
      api.assert.ok(
        codeChanged,
        `Code should change after adding event. Before: "${codeBefore.trim()}", After: "${codeAfter.trim()}"`
      )

      // Verify onclick was added
      api.assert.ok(
        codeAfter.includes('onclick'),
        `Code should include onclick after adding. Got: ${codeAfter}`
      )
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allEventsTests: TestCase[] = [
  ...addEventTests,
  ...existingEventTests,
  ...editEventTests,
  ...deleteEventTests,
  ...eventIntegrationTests,
]
