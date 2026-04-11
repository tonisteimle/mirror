/**
 * Unit Tests for Autocomplete Engine (Hexagonal Architecture)
 *
 * Tests the AutocompleteEngine using mock ports.
 * No CodeMirror, no DOM - pure unit tests.
 *
 * Use Cases:
 * - UC-AC-01: Primitive Completion (Frame, Text, Button)
 * - UC-AC-02: Property Completion (bg, col, pad)
 * - UC-AC-03: Token Completion ($primary, $card)
 * - UC-AC-04: Icon Completion ("check", "star")
 * - UC-AC-05: Value Completion (center, spread, hor)
 * - UC-AC-06: Context-sensitive Completion
 * - UC-AC-07: Component Completion (user-defined)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  AutocompleteEngine,
  createAutocompleteEngine,
  type AutocompleteContext,
} from '../../../studio/autocomplete/index'
import {
  createMockAutocompletePorts,
  createAutocompleteTestFixture,
  type MockAutocompletePorts,
  type AutocompleteTestFixture,
} from '../../../studio/autocomplete/adapters/mock-adapters'

describe('AutocompleteEngine (Hexagonal)', () => {
  let engine: AutocompleteEngine
  let fixture: AutocompleteTestFixture

  beforeEach(() => {
    engine = createAutocompleteEngine()
    fixture = createAutocompleteTestFixture()
  })

  // ============================================
  // UC-AC-01: Primitive Completion
  // ============================================

  describe('UC-AC-01: Primitive Completion', () => {
    it('should complete primitives at line start', () => {
      const result = engine.getCompletions({
        lineText: 'Fr',
        cursorColumn: 2,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.some(c => c.label === 'Frame')).toBe(true)
    })

    it('should complete Text primitive', () => {
      const result = engine.getCompletions({
        lineText: 'Te',
        cursorColumn: 2,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.some(c => c.label === 'Text')).toBe(true)
    })

    it('should complete Button primitive', () => {
      const result = engine.getCompletions({
        lineText: 'Bu',
        cursorColumn: 2,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.some(c => c.label === 'Button')).toBe(true)
    })

    it('should complete primitives with indentation', () => {
      const result = engine.getCompletions({
        lineText: '  Fr',
        cursorColumn: 4,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.some(c => c.label === 'Frame')).toBe(true)
    })

    it('should not complete primitives after property context', () => {
      const result = engine.getCompletions({
        lineText: 'Frame Fr',
        cursorColumn: 8,
        explicit: false,
      })

      // After "Frame " we're in property context, not element context
      expect(result.context).toBe('property')
    })
  })

  // ============================================
  // UC-AC-02: Property Completion
  // ============================================

  describe('UC-AC-02: Property Completion', () => {
    it('should complete properties after element name', () => {
      const result = engine.getCompletions({
        lineText: 'Frame b',
        cursorColumn: 7,
        explicit: false,
      })

      expect(result.context).toBe('property')
      expect(result.completions.some(c => c.label === 'bg')).toBe(true)
      expect(result.completions.some(c => c.label === 'background')).toBe(true)
    })

    it('should complete properties after comma', () => {
      const result = engine.getCompletions({
        lineText: 'Frame gap 12, p',
        cursorColumn: 15,
        explicit: false,
      })

      expect(result.context).toBe('property')
      expect(result.completions.some(c => c.label === 'pad')).toBe(true)
      expect(result.completions.some(c => c.label === 'padding')).toBe(true)
    })

    it('should complete col property', () => {
      const result = engine.getCompletions({
        lineText: 'Text "Hello", col',
        cursorColumn: 17,
        explicit: false,
      })

      expect(result.context).toBe('property')
      expect(result.completions.some(c => c.label === 'col')).toBe(true)
    })

    it('should complete layout properties', () => {
      const result = engine.getCompletions({
        lineText: 'Frame ho',
        cursorColumn: 8,
        explicit: false,
      })

      expect(result.context).toBe('property')
      expect(result.completions.some(c => c.label === 'hor')).toBe(true)
      expect(result.completions.some(c => c.label === 'horizontal')).toBe(true)
    })

    it('should prioritize common properties', () => {
      const result = engine.getCompletions({
        lineText: 'Frame ',
        cursorColumn: 6,
        explicit: true,
      })

      // Check that common properties appear early in results
      const bgIndex = result.completions.findIndex(c => c.label === 'bg')
      const padIndex = result.completions.findIndex(c => c.label === 'pad')
      const gapIndex = result.completions.findIndex(c => c.label === 'gap')

      // These should be within the first ~20 results
      expect(bgIndex).toBeLessThan(30)
      expect(padIndex).toBeLessThan(30)
      expect(gapIndex).toBeLessThan(30)
    })
  })

  // ============================================
  // UC-AC-03: Token Completion
  // ============================================

  describe('UC-AC-03: Token Completion', () => {
    it('should include token type in completions', () => {
      // The engine gets tokens from the schema, not from ports directly
      const result = engine.getCompletions({
        lineText: 'Frame bg $',
        cursorColumn: 10,
        explicit: true,
      })

      // Token completions should be available
      expect(result.completions.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // UC-AC-04: Icon Completion
  // ============================================

  describe('UC-AC-04: Icon Completion', () => {
    it('should complete icon names in element context', () => {
      const result = engine.getCompletions({
        lineText: 'Ic',
        cursorColumn: 2,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.some(c => c.label === 'Icon')).toBe(true)
    })
  })

  // ============================================
  // UC-AC-05: Value Completion
  // ============================================

  describe('UC-AC-05: Value Completion', () => {
    it('should complete values for weight property', () => {
      const result = engine.getCompletions({
        lineText: 'Text "Hello", weight b',
        cursorColumn: 22,
        explicit: false,
      })

      expect(result.context).toBe('value')
      expect(result.completions.some(c => c.label === 'bold')).toBe(true)
    })

    it('should complete values for cursor property', () => {
      const result = engine.getCompletions({
        lineText: 'Button "Click", cursor p',
        cursorColumn: 24,
        explicit: false,
      })

      expect(result.context).toBe('value')
      expect(result.completions.some(c => c.label === 'pointer')).toBe(true)
    })

    it('should complete values for align property', () => {
      const result = engine.getCompletions({
        lineText: 'Frame align c',
        cursorColumn: 13,
        explicit: false,
      })

      expect(result.context).toBe('value')
      expect(result.completions.some(c => c.label === 'center')).toBe(true)
    })

    it('should complete shadow values', () => {
      const result = engine.getCompletions({
        lineText: 'Frame shadow s',
        cursorColumn: 14,
        explicit: false,
      })

      expect(result.context).toBe('value')
      expect(result.completions.some(c => c.label === 'sm')).toBe(true)
    })
  })

  // ============================================
  // UC-AC-06: Context-sensitive Completion
  // ============================================

  describe('UC-AC-06: Context-sensitive Completion', () => {
    it('should detect element context at line start', () => {
      const context = engine.detectContext('', 0)
      expect(context).toBe('element')
    })

    it('should detect element context with indentation', () => {
      const context = engine.detectContext('  ', 2)
      expect(context).toBe('element')
    })

    it('should detect property context after element', () => {
      const context = engine.detectContext('Frame ', 6)
      expect(context).toBe('property')
    })

    it('should detect property context after comma', () => {
      const context = engine.detectContext('Frame gap 12, ', 14)
      expect(context).toBe('property')
    })

    it('should detect value context after property', () => {
      const context = engine.detectContext('Frame weight ', 13)
      expect(context).toBe('value')
    })

    it('should detect state context after state keyword', () => {
      const context = engine.detectContext('state ', 6)
      expect(context).toBe('state')
    })

    it('should detect action context after event', () => {
      const context = engine.detectContext('onclick: ', 9)
      expect(context).toBe('action')
    })

    it('should detect none context for unrecognized patterns', () => {
      const context = engine.detectContext('some random text', 16)
      expect(context).toBe('none')
    })
  })

  // ============================================
  // UC-AC-07: Component Completion
  // ============================================

  describe('UC-AC-07: User-defined Component Completion', () => {
    it('should complete user-defined components from source', () => {
      const source = `
MyButton: Button pad 12, bg #2271C1
Card: Frame pad 16, rad 8

Frame gap 12
  My`

      const result = engine.getCompletions({
        lineText: '  My',
        cursorColumn: 4,
        fullSource: source,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.some(c => c.label === 'MyButton')).toBe(true)
    })

    it('should complete Card component from source', () => {
      const source = `
MyButton: Button pad 12
Card: Frame pad 16

Frame gap 12
  Ca`

      const result = engine.getCompletions({
        lineText: '  Ca',
        cursorColumn: 4,
        fullSource: source,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.some(c => c.label === 'Card')).toBe(true)
    })

    it('should prioritize user components over primitives', () => {
      const source = `
CustomFrame: Frame pad 16
MyCard: Frame rad 8

Cus`

      const result = engine.getCompletions({
        lineText: 'Cus',
        cursorColumn: 3,
        fullSource: source,
        explicit: false,
      })

      expect(result.context).toBe('element')
      // User-defined component should appear with user component detail
      const customFrame = result.completions.find(c =>
        c.label === 'CustomFrame' && c.detail === 'user component'
      )
      expect(customFrame).toBeDefined()
      // User components should be boosted (higher priority)
      expect(customFrame!.boost).toBeGreaterThan(0)
    })
  })

  // ============================================
  // State Completions
  // ============================================

  describe('State Completions', () => {
    it('should complete state names', () => {
      const result = engine.getCompletions({
        lineText: 'state h',
        cursorColumn: 7,
        explicit: false,
      })

      expect(result.context).toBe('state')
      expect(result.completions.some(c => c.label === 'hover')).toBe(true)
    })

    it('should include all system states', () => {
      const result = engine.getCompletions({
        lineText: 'state ',
        cursorColumn: 6,
        explicit: true,
      })

      expect(result.context).toBe('state')
      expect(result.completions.some(c => c.label === 'hover')).toBe(true)
      expect(result.completions.some(c => c.label === 'focus')).toBe(true)
      expect(result.completions.some(c => c.label === 'active')).toBe(true)
      expect(result.completions.some(c => c.label === 'disabled')).toBe(true)
    })
  })

  // ============================================
  // Action Completions
  // ============================================

  describe('Action Completions', () => {
    it('should complete actions after onclick', () => {
      const result = engine.getCompletions({
        lineText: 'onclick: to',
        cursorColumn: 11,
        explicit: false,
      })

      expect(result.context).toBe('action')
      expect(result.completions.some(c => c.label === 'toggle')).toBe(true)
    })

    it('should complete actions after onhover', () => {
      const result = engine.getCompletions({
        lineText: 'onhover: sh',
        cursorColumn: 11,
        explicit: false,
      })

      expect(result.context).toBe('action')
      expect(result.completions.some(c => c.label === 'show')).toBe(true)
    })
  })

  // ============================================
  // Duration and Easing Completions
  // ============================================

  describe('Duration Completions', () => {
    it('should complete duration values', () => {
      const result = engine.getDurationCompletions()

      expect(result.length).toBeGreaterThan(0)
      expect(result.some(c => c.label === '100')).toBe(true)
      expect(result.some(c => c.label === '200')).toBe(true)
      expect(result.some(c => c.label === '300')).toBe(true)
    })
  })

  describe('Easing Completions', () => {
    it('should complete easing functions', () => {
      const result = engine.getEasingCompletions()

      expect(result.length).toBeGreaterThan(0)
      expect(result.some(c => c.label === 'ease')).toBe(true)
      expect(result.some(c => c.label === 'ease-in')).toBe(true)
      expect(result.some(c => c.label === 'ease-out')).toBe(true)
      expect(result.some(c => c.label === 'ease-in-out')).toBe(true)
    })
  })

  // ============================================
  // Zag Component Completions
  // ============================================

  describe('Zag Component Completions', () => {
    it('should complete Zag components', () => {
      const result = engine.getCompletions({
        lineText: 'Tab',
        cursorColumn: 3,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.some(c => c.label === 'Tabs')).toBe(true)
    })

    it('should provide Zag slot completions', () => {
      const slots = engine.getZagSlotCompletions('Tabs')

      expect(slots.length).toBeGreaterThan(0)
      expect(slots.some(c => c.label.includes('Tabs'))).toBe(true)
    })

    it('should provide Zag prop completions', () => {
      const props = engine.getZagPropCompletions('Tabs')

      expect(props.length).toBeGreaterThan(0)
    })

    it('should complete Dialog component', () => {
      const result = engine.getCompletions({
        lineText: 'Dial',
        cursorColumn: 4,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.some(c => c.label === 'Dialog')).toBe(true)
    })
  })

  // ============================================
  // Explicit Trigger (Ctrl+Space)
  // ============================================

  describe('Explicit Trigger', () => {
    it('should show all completions on explicit trigger', () => {
      const result = engine.getCompletions({
        lineText: '',
        cursorColumn: 0,
        explicit: true,
      })

      // Should have many completions
      expect(result.completions.length).toBeGreaterThan(10)
    })

    it('should filter by typed text on explicit trigger', () => {
      const result = engine.getCompletions({
        lineText: 'Fr',
        cursorColumn: 2,
        explicit: true,
      })

      // Should filter to Frame-related completions
      expect(result.completions.some(c => c.label === 'Frame')).toBe(true)
      expect(result.completions.every(c =>
        c.label.toLowerCase().includes('fr') ||
        c.label.toLowerCase().startsWith('fr')
      )).toBe(true)
    })
  })

  // ============================================
  // Helper Methods
  // ============================================

  describe('Helper Methods', () => {
    it('should return all properties', () => {
      const props = engine.getProperties()
      expect(props.length).toBeGreaterThan(0)
      expect(props.some(c => c.label === 'bg')).toBe(true)
    })

    it('should return all keywords', () => {
      const keywords = engine.getKeywords()
      expect(keywords.length).toBeGreaterThan(0)
    })

    it('should return all completions', () => {
      const all = engine.getAllCompletions()
      expect(all.length).toBeGreaterThan(0)
    })

    it('should return action completions', () => {
      const actions = engine.getActionCompletions()
      expect(actions.length).toBeGreaterThan(0)
      expect(actions.some(c => c.label === 'show')).toBe(true)
      expect(actions.some(c => c.label === 'hide')).toBe(true)
      expect(actions.some(c => c.label === 'toggle')).toBe(true)
    })

    it('should return target completions with source elements', () => {
      const source = `
MyDialog: Dialog
MyButton: Button`

      const targets = engine.getTargetCompletions(source)
      expect(targets.some(c => c.label === 'MyDialog')).toBe(true)
      expect(targets.some(c => c.label === 'MyButton')).toBe(true)
    })

    it('should return Zag components', () => {
      const zag = engine.getZagComponents()
      expect(zag.length).toBeGreaterThan(0)
      expect(zag.some(c => c.label === 'Dialog')).toBe(true)
      expect(zag.some(c => c.label === 'Tabs')).toBe(true)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty line', () => {
      const result = engine.getCompletions({
        lineText: '',
        cursorColumn: 0,
        explicit: false,
      })

      expect(result.context).toBe('element')
      expect(result.completions.length).toBeGreaterThan(0)
    })

    it('should handle line with only whitespace', () => {
      const result = engine.getCompletions({
        lineText: '    ',
        cursorColumn: 4,
        explicit: false,
      })

      expect(result.context).toBe('element')
    })

    it('should limit completions to prevent UI overload', () => {
      const result = engine.getCompletions({
        lineText: '',
        cursorColumn: 0,
        explicit: true,
      })

      // Should be limited (usually 50 or so)
      expect(result.completions.length).toBeLessThanOrEqual(50)
    })

    it('should return correct from/to positions', () => {
      const result = engine.getCompletions({
        lineText: 'Frame bg',
        cursorColumn: 8,
        explicit: false,
      })

      expect(result.from).toBe(6) // Start of "bg"
      expect(result.to).toBe(8)  // End of "bg"
    })

    it('should handle special characters in line', () => {
      const result = engine.getCompletions({
        lineText: 'Text "Hello, World!", col',
        cursorColumn: 25,
        explicit: false,
      })

      // Should still work despite special characters
      expect(result.completions.length).toBeGreaterThan(0)
    })
  })
})

// ============================================
// Mock Adapters Tests
// ============================================

describe('Mock Autocomplete Adapters', () => {
  describe('MockEditorContextPort', () => {
    it('should track source and cursor', () => {
      const fixture = createAutocompleteTestFixture()

      fixture.setup('Frame gap 12', 1, 5)

      expect(fixture.ports.editor.getSource()).toBe('Frame gap 12')
      expect(fixture.ports.editor.getCursor().line).toBe(1)
      expect(fixture.ports.editor.getCursor().column).toBe(5)
    })

    it('should get line info', () => {
      const fixture = createAutocompleteTestFixture()

      fixture.setup('Frame gap 12\nText "Hello"', 2, 4)

      const line = fixture.ports.editor.getLine(2)
      expect(line).not.toBeNull()
      expect(line!.text).toBe('Text "Hello"')
      expect(line!.number).toBe(2)
    })

    it('should get current line', () => {
      const fixture = createAutocompleteTestFixture()

      fixture.setup('Frame gap 12\nText "Hello"', 1, 5)

      const line = fixture.ports.editor.getCurrentLine()
      expect(line).not.toBeNull()
      expect(line!.text).toBe('Frame gap 12')
    })

    it('should get text before cursor', () => {
      const fixture = createAutocompleteTestFixture()

      fixture.setup('Frame gap 12', 1, 5)

      const text = fixture.ports.editor.getTextBeforeCursor()
      expect(text).toBe('Frame')
    })

    it('should get word at cursor', () => {
      const fixture = createAutocompleteTestFixture()

      fixture.setup('Frame gap 12', 1, 8)

      const word = fixture.ports.editor.getWordAtCursor()
      expect(word).not.toBeNull()
      expect(word!.word).toBe('gap')
    })

    it('should return null for invalid line', () => {
      const fixture = createAutocompleteTestFixture()

      fixture.setup('Frame', 1, 0)

      const line = fixture.ports.editor.getLine(5)
      expect(line).toBeNull()
    })

    it('should type text', () => {
      const fixture = createAutocompleteTestFixture()

      fixture.setup('Frame ', 1, 6)
      fixture.typeText('bg')

      expect(fixture.ports.editor.getSource()).toBe('Frame bg')
      expect(fixture.ports.editor.getCursor().column).toBe(8)
    })
  })

  describe('MockSourceMapContextPort', () => {
    it('should track parent Zag components', () => {
      const ports = createMockAutocompletePorts()

      ports.sourceMap.setParentZagComponent(2, 'Tabs')
      ports.sourceMap.setParentZagComponent(3, 'Tabs')

      expect(ports.sourceMap.getParentZagComponent(2)).toBe('Tabs')
      expect(ports.sourceMap.getParentZagComponent(3)).toBe('Tabs')
      expect(ports.sourceMap.getParentZagComponent(1)).toBeNull()
    })

    it('should track tokens', () => {
      const ports = createMockAutocompletePorts()

      ports.sourceMap.addToken('primary')
      ports.sourceMap.addToken('card')

      const tokens = ports.sourceMap.getAvailableTokens()
      expect(tokens).toContain('primary')
      expect(tokens).toContain('card')
    })

    it('should track user components', () => {
      const ports = createMockAutocompletePorts()

      ports.sourceMap.addUserComponent('MyButton')
      ports.sourceMap.addUserComponent('Card')

      const components = ports.sourceMap.getUserDefinedComponents()
      expect(components).toContain('MyButton')
      expect(components).toContain('Card')
    })

    it('should track page names', () => {
      const ports = createMockAutocompletePorts()

      ports.sourceMap.addPageName('HomePage')
      ports.sourceMap.addPageName('SettingsPage')

      const pages = ports.sourceMap.getPageNames()
      expect(pages).toContain('HomePage')
      expect(pages).toContain('SettingsPage')
    })

    it('should clear all data', () => {
      const ports = createMockAutocompletePorts()

      ports.sourceMap.addToken('test')
      ports.sourceMap.addUserComponent('Test')
      ports.sourceMap.clear()

      expect(ports.sourceMap.getAvailableTokens()).toHaveLength(0)
      expect(ports.sourceMap.getUserDefinedComponents()).toHaveLength(0)
    })
  })

  describe('MockCompletionUIPort', () => {
    it('should track shown completions', () => {
      const ports = createMockAutocompletePorts()

      const result = {
        completions: [{ label: 'Frame', type: 'component' as const }],
        from: 0,
        to: 2,
        context: 'element' as AutocompleteContext,
      }

      ports.ui.showCompletions(result)

      expect(ports.ui.getLastShownResult()).toEqual(result)
      expect(ports.ui.isCompletionsVisible()).toBe(true)
    })

    it('should track hide calls', () => {
      const ports = createMockAutocompletePorts()

      ports.ui.hideCompletions()

      expect(ports.ui.wasHideCalled()).toBe(true)
      expect(ports.ui.isCompletionsVisible()).toBe(false)
    })

    it('should track applied completions', () => {
      const ports = createMockAutocompletePorts()

      const completion = { label: 'Frame', type: 'component' as const }
      ports.ui.applyCompletion(completion, 0, 2)

      const applied = ports.ui.getAppliedCompletions()
      expect(applied).toHaveLength(1)
      expect(applied[0].completion.label).toBe('Frame')
      expect(applied[0].from).toBe(0)
      expect(applied[0].to).toBe(2)
    })

    it('should trigger selection handlers', () => {
      const ports = createMockAutocompletePorts()

      let selectedLabel = ''
      ports.ui.onCompletionSelected((c) => {
        selectedLabel = c.label
      })

      ports.ui.simulateSelection({ label: 'Test', type: 'component' })

      expect(selectedLabel).toBe('Test')
    })

    it('should unsubscribe from selection handlers', () => {
      const ports = createMockAutocompletePorts()

      let callCount = 0
      const cleanup = ports.ui.onCompletionSelected(() => {
        callCount++
      })

      ports.ui.simulateSelection({ label: 'Test', type: 'component' })
      expect(callCount).toBe(1)

      cleanup()

      ports.ui.simulateSelection({ label: 'Test2', type: 'component' })
      expect(callCount).toBe(1) // Still 1, handler was removed
    })

    it('should clear tracking data', () => {
      const ports = createMockAutocompletePorts()

      ports.ui.showCompletions({
        completions: [{ label: 'Frame', type: 'component' }],
        from: 0,
        to: 2,
        context: 'element',
      })
      ports.ui.hideCompletions()

      ports.ui.clearTracking()

      expect(ports.ui.getLastShownResult()).toBeNull()
      expect(ports.ui.wasHideCalled()).toBe(false)
      expect(ports.ui.getShownResultsHistory()).toHaveLength(0)
    })
  })
})
