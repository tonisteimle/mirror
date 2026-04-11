/**
 * TriggerController Unit Tests
 *
 * Tests for the port-based TriggerController using mock adapters.
 *
 * Use Cases:
 * - UC-TR-01: Trigger Detection (# for Color, $ for Token)
 * - UC-TR-02: Picker Activation
 * - UC-TR-03: Value Selection and Insertion
 * - UC-TR-04: Trigger Cancellation (Escape)
 * - UC-TR-05: Navigation in Picker (Arrow Keys)
 * - UC-TR-06: Context-sensitive Triggers
 * - UC-TR-07: Trigger Lifecycle (activate → interact → complete/cancel)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  TriggerController,
  createTriggerController,
} from '../../../studio/editor/triggers/trigger-controller'
import {
  createMockTriggerPorts,
  createMockTriggerRegistry,
  createTriggerTestFixture,
  type MockTriggerPorts,
  type TriggerTestFixture,
} from '../../../studio/editor/triggers/adapters/mock-adapters'
import type { TriggerRegistry } from '../../../studio/editor/triggers/ports'
import type { TriggerConfig } from '../../../studio/editor/triggers/types'

// ============================================
// Test Helpers
// ============================================

function createColorTrigger(): TriggerConfig {
  return {
    id: 'color',
    trigger: {
      type: 'char',
      char: '#',
    },
    picker: {
      showAt: () => {},
      hide: () => {},
      getValue: () => '#ff0000',
    },
    onSelect: () => {},
    liveFilter: true,
    closeOnChars: [' ', ','],
    priority: 100,
  }
}

function createTokenTrigger(): TriggerConfig {
  return {
    id: 'token',
    trigger: {
      type: 'char',
      char: '$',
    },
    picker: {
      showAt: () => {},
      hide: () => {},
      getValue: () => '$primary',
    },
    onSelect: () => {},
    liveFilter: true,
    closeOnChars: [' ', ','],
    priority: 90,
  }
}

function createIconTrigger(): TriggerConfig {
  return {
    id: 'icon',
    trigger: {
      type: 'component',
      names: ['Icon'],
      triggerChar: ' ',
    },
    picker: {
      showAt: () => {},
      hide: () => {},
      getValue: () => '"check"',
    },
    onSelect: () => {},
    priority: 80,
  }
}

function createDoubleClickColorTrigger(): TriggerConfig {
  return {
    id: 'doubleClick-color',
    trigger: {
      type: 'doubleClick',
      pattern: /#[0-9a-fA-F]{6}/,
    },
    picker: {
      showAt: () => {},
      hide: () => {},
      getValue: () => '#00ff00',
    },
    onSelect: () => {},
    priority: 50,
  }
}

// ============================================
// UC-TR-01: Trigger Detection
// ============================================

describe('UC-TR-01: Trigger Detection', () => {
  let ports: MockTriggerPorts
  let registry: TriggerRegistry
  let controller: TriggerController

  beforeEach(() => {
    ports = createMockTriggerPorts({
      source: 'Button "Test", bg ',
      cursor: { line: 1, column: 18, offset: 18 },
      pickerValues: ['#ff0000', '#00ff00', '#0000ff'],
    })
    registry = createMockTriggerRegistry()
    registry.register(createColorTrigger())
    registry.register(createTokenTrigger())

    controller = createTriggerController({
      ports,
      registry,
    })
  })

  describe('Char Trigger Detection', () => {
    it('should detect # as color trigger', () => {
      // Type # after "bg "
      ports.editor.setSource('Button "Test", bg #')
      ports.editor.setCursor({ line: 1, column: 19, offset: 19 })

      const result = controller.checkTriggers('#')

      expect(result.activated).toBe(true)
      expect(result.triggerId).toBe('color')
    })

    it('should detect $ as token trigger', () => {
      // Type $ after "bg "
      ports.editor.setSource('Button "Test", bg $')
      ports.editor.setCursor({ line: 1, column: 19, offset: 19 })

      const result = controller.checkTriggers('$')

      expect(result.activated).toBe(true)
      expect(result.triggerId).toBe('token')
    })

    it('should not activate trigger for unregistered chars', () => {
      ports.editor.setSource('Button "Test", bg @')
      ports.editor.setCursor({ line: 1, column: 19, offset: 19 })

      const result = controller.checkTriggers('@')

      expect(result.activated).toBe(false)
    })

    it('should respect trigger priority', () => {
      // Register both triggers, color has higher priority
      const result = controller.checkTriggers('#')

      expect(result.triggerId).toBe('color')
    })
  })

  describe('Component Trigger Detection', () => {
    beforeEach(() => {
      registry.register(createIconTrigger())
    })

    it('should detect Icon followed by space as icon trigger', () => {
      ports.editor.setSource('Icon ')
      ports.editor.setCursor({ line: 1, column: 5, offset: 5 })

      // Configure detection port to match
      ports.detection.setComponentTriggerResult({
        matches: true,
        componentName: 'Icon',
      })

      const result = controller.checkTriggers(' ')

      expect(result.activated).toBe(true)
      expect(result.triggerId).toBe('icon')
    })

    it('should not trigger for non-matching component names', () => {
      ports.editor.setSource('Button ')
      ports.editor.setCursor({ line: 1, column: 7, offset: 7 })

      ports.detection.setComponentTriggerResult({
        matches: false,
      })

      const result = controller.checkTriggers(' ')

      expect(result.activated).toBe(false)
    })
  })

  describe('Double-Click Trigger Detection', () => {
    beforeEach(() => {
      registry.register(createDoubleClickColorTrigger())
    })

    it('should detect double-click on color value', () => {
      ports.editor.setSource('Button bg #ff0000')
      ports.editor.setCursor({ line: 1, column: 14, offset: 14 })

      const result = controller.checkDoubleClick(14)

      expect(result.activated).toBe(true)
      expect(result.triggerId).toBe('doubleClick-color')
    })

    it('should not trigger double-click outside pattern', () => {
      ports.editor.setSource('Button bg #ff0000')
      ports.editor.setCursor({ line: 1, column: 3, offset: 3 })

      const result = controller.checkDoubleClick(3)

      expect(result.activated).toBe(false)
    })
  })
})

// ============================================
// UC-TR-02: Picker Activation
// ============================================

describe('UC-TR-02: Picker Activation', () => {
  let ports: MockTriggerPorts
  let registry: TriggerRegistry
  let controller: TriggerController

  beforeEach(() => {
    ports = createMockTriggerPorts({
      source: 'Button bg ',
      cursor: { line: 1, column: 10, offset: 10 },
      pickerValues: ['#ff0000', '#00ff00', '#0000ff'],
    })
    registry = createMockTriggerRegistry()
    registry.register(createColorTrigger())

    controller = createTriggerController({
      ports,
      registry,
    })
  })

  it('should show picker when trigger activates', () => {
    ports.editor.setSource('Button bg #')
    ports.editor.setCursor({ line: 1, column: 11, offset: 11 })
    ports.editor.setScreenPosition({ x: 200, y: 150 })

    controller.checkTriggers('#')

    const showHistory = ports.picker.getShowHistory()
    expect(showHistory.length).toBe(1)
    expect(showHistory[0]).toEqual({ x: 200, y: 150 })
  })

  it('should set trigger state as active', () => {
    ports.editor.setSource('Button bg #')
    ports.editor.setCursor({ line: 1, column: 11, offset: 11 })

    controller.checkTriggers('#')

    expect(controller.isActive()).toBe(true)
    expect(controller.getActiveTriggerId()).toBe('color')
  })

  it('should emit activated event', () => {
    ports.editor.setSource('Button bg #')
    ports.editor.setCursor({ line: 1, column: 11, offset: 11 })

    controller.checkTriggers('#')

    const events = ports.events.getActivatedEvents()
    expect(events.length).toBe(1)
    expect(events[0].triggerId).toBe('color')
  })

  it('should build correct trigger context', () => {
    ports.editor.setSource('Button bg #')
    ports.editor.setCursor({ line: 1, column: 11, offset: 11 })

    controller.checkTriggers('#')

    const context = controller.getActiveContext()
    expect(context).not.toBeNull()
    // startPos is the position of the trigger char '#', not cursor position after typing
    expect(context?.startPos).toBe(10)
    expect(context?.line.number).toBe(1)
  })

  it('should not show second picker if already active', () => {
    ports.editor.setSource('Button bg #')
    ports.editor.setCursor({ line: 1, column: 11, offset: 11 })

    // First activation
    controller.checkTriggers('#')

    // Try second activation
    controller.checkTriggers('#')

    const showHistory = ports.picker.getShowHistory()
    expect(showHistory.length).toBe(1) // Only one show call
  })
})

// ============================================
// UC-TR-03: Value Selection and Insertion
// ============================================

describe('UC-TR-03: Value Selection and Insertion', () => {
  let ports: MockTriggerPorts
  let registry: TriggerRegistry
  let controller: TriggerController

  beforeEach(() => {
    ports = createMockTriggerPorts({
      source: 'Button bg #',
      cursor: { line: 1, column: 11, offset: 11 },
      pickerValues: ['#ff0000', '#00ff00', '#0000ff'],
    })
    registry = createMockTriggerRegistry()
    registry.register(createColorTrigger())

    controller = createTriggerController({
      ports,
      registry,
    })

    // Activate trigger
    controller.checkTriggers('#')
  })

  it('should insert selected value into editor', () => {
    const result = controller.selectCurrent()

    expect(result.success).toBe(true)
    expect(result.value).toBe('#ff0000')

    const insertions = ports.editor.getInsertions()
    expect(insertions.length).toBe(1)
    expect(insertions[0].text).toBe('#ff0000')
  })

  it('should replace existing text when selecting', () => {
    const result = controller.selectCurrent()

    const insertions = ports.editor.getInsertions()
    // from is startPos (position of trigger char '#'), to is cursor position
    expect(insertions[0].from).toBe(10) // Start position (where '#' is)
    expect(insertions[0].to).toBe(11) // Cursor position
  })

  it('should emit value selected event', () => {
    controller.selectCurrent()

    const events = ports.events.getValueSelectedEvents()
    expect(events.length).toBe(1)
    expect(events[0].triggerId).toBe('color')
    expect(events[0].value).toBe('#ff0000')
  })

  it('should deactivate trigger after selection', () => {
    controller.selectCurrent()

    expect(controller.isActive()).toBe(false)
    expect(controller.getActiveTriggerId()).toBeNull()
  })

  it('should hide picker after selection', () => {
    controller.selectCurrent()

    expect(ports.picker.wasHidden()).toBe(true)
  })

  it('should focus editor after selection', () => {
    ports.editor.setFocused(false)
    controller.selectCurrent()

    expect(ports.editor.hasFocus()).toBe(true)
  })

  it('should fail selection when no value selected', () => {
    // Set picker to have no selected value
    ports.picker.setValues([])

    const result = controller.selectCurrent()

    expect(result.success).toBe(false)
    expect(result.error).toBe('No value selected')
  })

  it('should fail selection when not active', () => {
    controller.cancel() // Deactivate first

    const result = controller.selectCurrent()

    expect(result.success).toBe(false)
    expect(result.error).toBe('No active trigger')
  })

  describe('Picker-based Selection', () => {
    it('should handle selection via picker onSelect', () => {
      // Simulate picker selection
      ports.picker.simulateSelection('#00ff00')

      // Selection handler should have been called
      const events = ports.events.getValueSelectedEvents()
      expect(events.length).toBe(1)
      expect(events[0].value).toBe('#00ff00')
    })
  })
})

// ============================================
// UC-TR-04: Trigger Cancellation (Escape)
// ============================================

describe('UC-TR-04: Trigger Cancellation', () => {
  let ports: MockTriggerPorts
  let registry: TriggerRegistry
  let controller: TriggerController

  beforeEach(() => {
    ports = createMockTriggerPorts({
      source: 'Button bg #ff',
      cursor: { line: 1, column: 13, offset: 13 },
      pickerValues: ['#ff0000', '#00ff00', '#0000ff'],
    })
    registry = createMockTriggerRegistry()
    registry.register(createColorTrigger())

    controller = createTriggerController({
      ports,
      registry,
    })

    // Activate trigger at position 11, now cursor at 13 (typed 'ff')
    ports.state.activate('color', 11, {
      startPos: 11,
      cursorPos: 13,
      line: { number: 1, from: 0, to: 13, text: 'Button bg #ff' },
      textBefore: 'Button bg #ff',
      textAfter: '',
    })
  })

  it('should handle Escape key to cancel', () => {
    const handled = controller.handleKeyboard('Escape')

    expect(handled).toBe(true)
    expect(controller.isActive()).toBe(false)
  })

  it('should remove typed text on cancel for char triggers', () => {
    const result = controller.cancel()

    expect(result.success).toBe(true)
    expect(result.textRemoved).toBe(true)

    const deletions = ports.editor.getDeletions()
    expect(deletions.length).toBe(1)
    expect(deletions[0]).toEqual({ from: 11, to: 13 })
  })

  it('should hide picker on cancel', () => {
    controller.cancel()

    expect(ports.picker.wasHidden()).toBe(true)
  })

  it('should emit deactivated event', () => {
    controller.cancel()

    const events = ports.events.getDeactivatedEvents()
    expect(events.length).toBe(1)
    expect(events[0]).toBe('color')
  })

  it('should focus editor after cancel', () => {
    ports.editor.setFocused(false)
    controller.cancel()

    expect(ports.editor.hasFocus()).toBe(true)
  })

  it('should return success false when not active', () => {
    ports.state.deactivate()

    const result = controller.cancel()

    expect(result.success).toBe(false)
    expect(result.textRemoved).toBe(false)
  })

  describe('External Picker Close', () => {
    it('should deactivate when picker closes externally', () => {
      expect(controller.isActive()).toBe(true)

      // Simulate picker close event
      ports.picker.simulateClose()

      expect(controller.isActive()).toBe(false)
    })

    it('should handle external picker closed event', () => {
      expect(controller.isActive()).toBe(true)

      // Simulate external picker closed (from event bus)
      ports.events.simulatePickerClosed()

      expect(controller.isActive()).toBe(false)
    })
  })
})

// ============================================
// UC-TR-05: Navigation in Picker
// ============================================

describe('UC-TR-05: Navigation in Picker', () => {
  let ports: MockTriggerPorts
  let registry: TriggerRegistry
  let controller: TriggerController

  beforeEach(() => {
    ports = createMockTriggerPorts({
      source: 'Button bg #',
      cursor: { line: 1, column: 11, offset: 11 },
      pickerValues: ['#ff0000', '#00ff00', '#0000ff'],
    })
    registry = createMockTriggerRegistry()
    registry.register(createColorTrigger())

    controller = createTriggerController({
      ports,
      registry,
    })

    // Activate trigger
    controller.checkTriggers('#')
  })

  describe('Arrow Key Navigation', () => {
    it('should handle ArrowDown to navigate down', () => {
      const handled = controller.handleKeyboard('ArrowDown')

      expect(handled).toBe(true)
      const navHistory = ports.picker.getNavigationHistory()
      expect(navHistory).toContain('down')
    })

    it('should handle ArrowUp to navigate up', () => {
      const handled = controller.handleKeyboard('ArrowUp')

      expect(handled).toBe(true)
      const navHistory = ports.picker.getNavigationHistory()
      expect(navHistory).toContain('up')
    })

    it('should handle Enter to select current', () => {
      const handled = controller.handleKeyboard('Enter')

      expect(handled).toBe(true)
      expect(controller.isActive()).toBe(false) // Selection completes
    })

    it('should not handle arrow keys when not active', () => {
      controller.cancel()

      const handled = controller.handleKeyboard('ArrowDown')

      expect(handled).toBe(false)
    })
  })

  describe('Grid Navigation', () => {
    beforeEach(() => {
      // Re-register with grid keyboard config
      registry.clear()
      registry.register({
        ...createColorTrigger(),
        keyboard: {
          orientation: 'grid',
          columns: 5,
        },
      })

      // Reactivate
      ports.state.deactivate()
      controller.checkTriggers('#')
    })

    it('should handle ArrowLeft in grid mode', () => {
      const handled = controller.handleKeyboard('ArrowLeft')

      expect(handled).toBe(true)
      const navHistory = ports.picker.getNavigationHistory()
      expect(navHistory).toContain('left')
    })

    it('should handle ArrowRight in grid mode', () => {
      const handled = controller.handleKeyboard('ArrowRight')

      expect(handled).toBe(true)
      const navHistory = ports.picker.getNavigationHistory()
      expect(navHistory).toContain('right')
    })
  })

  describe('Backspace Handling', () => {
    it('should cancel trigger when backspace goes before start position', () => {
      // Cursor at start position (10, where '#' is) - backspace would go before
      // With startPos = 10, cursor at 10 triggers: 10 <= 10 = true
      ports.editor.setCursor({ line: 1, column: 10, offset: 10 })
      ports.state.updateContext({ cursorPos: 10 })

      const handled = controller.handleKeyboard('Backspace')

      expect(handled).toBe(true)
      expect(controller.isActive()).toBe(false)
    })

    it('should not cancel when backspace stays after start position', () => {
      // Type some characters first
      ports.editor.setSource('Button bg #ff')
      ports.editor.setCursor({ line: 1, column: 13, offset: 13 })

      const handled = controller.handleKeyboard('Backspace')

      expect(handled).toBe(false) // Let editor handle it
    })
  })
})

// ============================================
// UC-TR-06: Context-sensitive Triggers
// ============================================

describe('UC-TR-06: Context-sensitive Triggers', () => {
  let ports: MockTriggerPorts
  let registry: TriggerRegistry
  let controller: TriggerController

  beforeEach(() => {
    ports = createMockTriggerPorts({
      source: '',
      pickerValues: ['#ff0000', '#00ff00', '#0000ff'],
    })
    registry = createMockTriggerRegistry()
    registry.register(createColorTrigger())

    controller = createTriggerController({
      ports,
      registry,
    })
  })

  describe('Property Context', () => {
    it('should include property in context for bg property', () => {
      ports.editor.setSource('Button bg #')
      ports.editor.setCursor({ line: 1, column: 11, offset: 11 })

      // Detection port extracts property
      ports.detection.setCharTriggerResult({
        matches: true,
        property: 'bg',
      })

      controller.checkTriggers('#')

      const context = controller.getActiveContext()
      expect(context?.property).toBe('bg')
    })

    it('should include property in context for col property', () => {
      ports.editor.setSource('Text "Hi", col #')
      ports.editor.setCursor({ line: 1, column: 16, offset: 16 })

      ports.detection.setCharTriggerResult({
        matches: true,
        property: 'col',
      })

      controller.checkTriggers('#')

      const context = controller.getActiveContext()
      expect(context?.property).toBe('col')
    })
  })

  describe('Live Filtering', () => {
    it('should filter picker when typing after activation', () => {
      ports.editor.setSource('Button bg #')
      ports.editor.setCursor({ line: 1, column: 11, offset: 11 })

      controller.checkTriggers('#')

      // Type 'f'
      ports.editor.setSource('Button bg #f')
      ports.editor.setCursor({ line: 1, column: 12, offset: 12 })

      controller.checkTriggers('f')

      const filterHistory = ports.picker.getFilterHistory()
      expect(filterHistory.length).toBeGreaterThan(0)
    })

    it('should use filter method on controller', () => {
      ports.editor.setSource('Button bg #')
      ports.editor.setCursor({ line: 1, column: 11, offset: 11 })

      controller.checkTriggers('#')
      controller.filter('ff')

      const filterHistory = ports.picker.getFilterHistory()
      expect(filterHistory).toContain('ff')
    })
  })

  describe('Close on Characters', () => {
    it('should close trigger when typing close character', () => {
      ports.editor.setSource('Button bg #ff0000')
      ports.editor.setCursor({ line: 1, column: 17, offset: 17 })

      // Activate
      ports.state.activate('color', 10, {
        startPos: 10,
        cursorPos: 17,
        line: { number: 1, from: 0, to: 17, text: 'Button bg #ff0000' },
        textBefore: 'Button bg #ff0000',
        textAfter: '',
      })

      // Type comma (close character)
      controller.checkTriggers(',')

      expect(controller.isActive()).toBe(false)
    })

    it('should close trigger when typing space', () => {
      ports.editor.setSource('Button bg #ff0000')
      ports.editor.setCursor({ line: 1, column: 17, offset: 17 })

      ports.state.activate('color', 10, {
        startPos: 10,
        cursorPos: 17,
        line: { number: 1, from: 0, to: 17, text: 'Button bg #ff0000' },
        textBefore: 'Button bg #ff0000',
        textAfter: '',
      })

      controller.checkTriggers(' ')

      expect(controller.isActive()).toBe(false)
    })
  })
})

// ============================================
// UC-TR-07: Trigger Lifecycle
// ============================================

describe('UC-TR-07: Trigger Lifecycle', () => {
  let ports: MockTriggerPorts
  let registry: TriggerRegistry
  let controller: TriggerController

  beforeEach(() => {
    ports = createMockTriggerPorts({
      source: 'Button bg ',
      cursor: { line: 1, column: 10, offset: 10 },
      pickerValues: ['#ff0000', '#00ff00', '#0000ff'],
    })
    registry = createMockTriggerRegistry()
    registry.register(createColorTrigger())

    controller = createTriggerController({
      ports,
      registry,
    })
  })

  describe('Complete Lifecycle: Activate → Select → Complete', () => {
    it('should complete full selection lifecycle', () => {
      // 1. Initial state
      expect(controller.isActive()).toBe(false)

      // 2. Type trigger character
      ports.editor.setSource('Button bg #')
      ports.editor.setCursor({ line: 1, column: 11, offset: 11 })
      const activateResult = controller.checkTriggers('#')

      expect(activateResult.activated).toBe(true)
      expect(controller.isActive()).toBe(true)
      expect(ports.picker.getShowHistory().length).toBe(1)

      // 3. Navigate in picker
      controller.handleKeyboard('ArrowDown')
      expect(ports.picker.getNavigationHistory()).toContain('down')

      // 4. Select value
      const selectResult = controller.selectCurrent()
      expect(selectResult.success).toBe(true)

      // 5. Verify final state
      expect(controller.isActive()).toBe(false)
      expect(ports.picker.wasHidden()).toBe(true)
      expect(ports.editor.getInsertions().length).toBe(1)
    })
  })

  describe('Complete Lifecycle: Activate → Navigate → Cancel', () => {
    it('should complete full cancellation lifecycle', () => {
      // 1. Activate
      ports.editor.setSource('Button bg #')
      ports.editor.setCursor({ line: 1, column: 11, offset: 11 })
      controller.checkTriggers('#')

      // 2. Type some characters
      ports.editor.setSource('Button bg #ff')
      ports.editor.setCursor({ line: 1, column: 13, offset: 13 })
      controller.checkTriggers('f')
      controller.checkTriggers('f')

      // 3. Navigate
      controller.handleKeyboard('ArrowDown')
      controller.handleKeyboard('ArrowUp')

      // 4. Cancel with Escape
      const handled = controller.handleKeyboard('Escape')
      expect(handled).toBe(true)

      // 5. Verify cancelled state
      expect(controller.isActive()).toBe(false)
      expect(ports.picker.wasHidden()).toBe(true)
    })
  })

  describe('Multiple Trigger Cycles', () => {
    it('should support multiple activation cycles', () => {
      // First cycle
      ports.editor.setSource('Button bg #')
      ports.editor.setCursor({ line: 1, column: 11, offset: 11 })
      controller.checkTriggers('#')
      controller.selectCurrent()

      expect(controller.isActive()).toBe(false)

      // Reset picker state for second cycle
      ports.picker.reset()

      // Second cycle
      ports.editor.setSource('Button bg #ff0000, col $')
      ports.editor.setCursor({ line: 1, column: 24, offset: 24 })
      registry.register(createTokenTrigger())

      const result = controller.checkTriggers('$')

      expect(result.activated).toBe(true)
      expect(result.triggerId).toBe('token')
    })
  })

  describe('Disposal', () => {
    it('should deactivate on dispose', () => {
      ports.editor.setSource('Button bg #')
      ports.editor.setCursor({ line: 1, column: 11, offset: 11 })
      controller.checkTriggers('#')

      expect(controller.isActive()).toBe(true)

      controller.dispose()

      expect(controller.isActive()).toBe(false)
    })

    it('should not activate after dispose', () => {
      controller.dispose()

      ports.editor.setSource('Button bg #')
      ports.editor.setCursor({ line: 1, column: 11, offset: 11 })
      const result = controller.checkTriggers('#')

      expect(result.activated).toBe(false)
      expect(result.error).toBe('Controller disposed')
    })

    it('should be idempotent on multiple dispose calls', () => {
      controller.dispose()
      controller.dispose() // Should not throw

      expect(controller.isActive()).toBe(false)
    })
  })
})

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
  let ports: MockTriggerPorts
  let registry: TriggerRegistry
  let controller: TriggerController

  beforeEach(() => {
    ports = createMockTriggerPorts()
    registry = createMockTriggerRegistry()

    controller = createTriggerController({
      ports,
      registry,
    })
  })

  it('should handle empty registry gracefully', () => {
    ports.editor.setSource('#')
    ports.editor.setCursor({ line: 1, column: 1, offset: 1 })

    const result = controller.checkTriggers('#')

    expect(result.activated).toBe(false)
  })

  it('should handle empty source', () => {
    registry.register(createColorTrigger())
    ports.editor.setSource('')
    ports.editor.setCursor({ line: 1, column: 0, offset: 0 })

    const result = controller.checkTriggers('#')

    // Still should activate (detection port says it matches)
    expect(result.activated).toBe(true)
  })

  it('should handle multiline content', () => {
    registry.register(createColorTrigger())
    ports.editor.setSource('Line 1\nLine 2 bg #')
    ports.editor.setCursor({ line: 2, column: 11, offset: 18 })

    const result = controller.checkTriggers('#')

    expect(result.activated).toBe(true)
    const context = controller.getActiveContext()
    expect(context?.line.number).toBe(2)
  })

  it('should handle context pattern validation', () => {
    // Register trigger with context pattern
    registry.register({
      ...createColorTrigger(),
      trigger: {
        type: 'char',
        char: '#',
        contextPattern: /\s$/, // Must have space before
      },
    })

    // Without space - detection says no match
    ports.editor.setSource('bg#')
    ports.editor.setCursor({ line: 1, column: 3, offset: 3 })
    ports.detection.setCharTriggerResult({ matches: false })

    const result1 = controller.checkTriggers('#')
    expect(result1.activated).toBe(false)

    // With space - detection says match
    ports.detection.reset()
    ports.editor.setSource('bg #')
    ports.editor.setCursor({ line: 1, column: 4, offset: 4 })

    const result2 = controller.checkTriggers('#')
    expect(result2.activated).toBe(true)
  })
})

// ============================================
// Test Fixture Helper Tests
// ============================================

describe('TriggerTestFixture', () => {
  let fixture: TriggerTestFixture

  beforeEach(() => {
    fixture = createTriggerTestFixture()
    fixture.registry.register(createColorTrigger())
  })

  it('should setup editor state correctly', () => {
    fixture.setup('Button bg ', 1, 10)

    const cursor = fixture.ports.editor.getCursorPosition()
    expect(cursor.line).toBe(1)
    expect(cursor.column).toBe(10)
    expect(fixture.ports.editor.getSource()).toBe('Button bg ')
  })

  it('should type character at cursor', () => {
    fixture.setup('Button bg ', 1, 10)
    fixture.typeChar('#')

    expect(fixture.ports.editor.getSource()).toBe('Button bg #')
    expect(fixture.ports.editor.getCursorPosition().column).toBe(11)
  })

  it('should activate trigger manually', () => {
    fixture.setup('Button bg #', 1, 11)
    fixture.activateTrigger('color')

    expect(fixture.ports.state.isActive()).toBe(true)
    expect(fixture.ports.state.getActiveTriggerId()).toBe('color')
  })

  it('should select value and deactivate', () => {
    fixture.setup('Button bg #', 1, 11)
    fixture.activateTrigger('color')
    fixture.selectValue('#ff0000')

    expect(fixture.ports.state.isActive()).toBe(false)
    expect(fixture.ports.events.getValueSelectedEvents().length).toBe(1)
  })

  it('should cancel and deactivate', () => {
    fixture.setup('Button bg #', 1, 11)
    fixture.activateTrigger('color')
    fixture.cancel()

    expect(fixture.ports.state.isActive()).toBe(false)
    expect(fixture.ports.events.getDeactivatedEvents().length).toBe(1)
  })

  it('should reset all state', () => {
    fixture.setup('Button bg #', 1, 11)
    fixture.activateTrigger('color')
    fixture.selectValue('#ff0000')
    fixture.reset()

    expect(fixture.ports.state.isActive()).toBe(false)
    expect(fixture.ports.state.getStateHistory().length).toBe(0)
    expect(fixture.ports.events.getValueSelectedEvents().length).toBe(0)
  })
})
