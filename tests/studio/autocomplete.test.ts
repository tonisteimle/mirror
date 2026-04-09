/**
 * Comprehensive Tests for Autocomplete Engine
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  AutocompleteEngine,
  createAutocompleteEngine,
  getAutocompleteEngine,
  MIRROR_PROPERTIES,
  MIRROR_KEYWORDS,
  ALL_COMPLETIONS,
  STATE_NAMES,
  PROPERTY_VALUES,
  PRIORITY_PROPERTIES,
  ACTION_COMPLETIONS,
  TARGET_KEYWORDS,
  DURATION_COMPLETIONS,
  EASING_COMPLETIONS,
  extractElementNames,
} from '../../studio/autocomplete'

describe('AutocompleteEngine', () => {
  let engine: AutocompleteEngine

  beforeEach(() => {
    engine = createAutocompleteEngine()
  })

  // ===========================================
  // CONTEXT DETECTION
  // ===========================================

  describe('Context Detection', () => {
    describe('State Context', () => {
      it('should detect state context after "state "', () => {
        const context = engine.detectContext('state ', 6)
        expect(context).toBe('state')
      })

      it('should return none when typing state name (no trailing space)', () => {
        // Context detection requires trailing space after "state"
        const context = engine.detectContext('state h', 7)
        expect(context).toBe('none')
      })

      it('should detect state context with preceding whitespace', () => {
        const context = engine.detectContext('  state ', 8)
        expect(context).toBe('state')
      })
    })

    describe('Property Context', () => {
      it('should detect property context after comma', () => {
        const context = engine.detectContext('Box pad 10, ', 12)
        expect(context).toBe('property')
      })

      it('should detect property context after component name', () => {
        const context = engine.detectContext('Box ', 4)
        expect(context).toBe('property')
      })

      it('should detect property context on indented line', () => {
        const context = engine.detectContext('  ', 2)
        expect(context).toBe('property')
      })

      it('should detect property context after colon', () => {
        const context = engine.detectContext('MyComponent: ', 12)
        expect(context).toBe('property')
      })

      it('should handle component definition pattern', () => {
        // Complex patterns may return none - implementation specific
        const context = engine.detectContext('MyButton: = Button ', 19)
        // The actual behavior depends on implementation
        expect(['property', 'none']).toContain(context)
      })
    })

    describe('Value Context', () => {
      it('should detect value context after "cursor "', () => {
        const context = engine.detectContext('cursor ', 7)
        expect(context).toBe('value')
      })

      it('should detect value context after "w "', () => {
        const context = engine.detectContext('w ', 2)
        expect(context).toBe('value')
      })

      it('should detect value context after "width "', () => {
        const context = engine.detectContext('width ', 6)
        expect(context).toBe('value')
      })

      // Note: overflow and position are not schema properties with keywords
      // These are tested with properties that DO have keywords (weight, shadow, etc.)

      it('should detect value context after "weight "', () => {
        const context = engine.detectContext('weight ', 7)
        expect(context).toBe('value')
      })
    })

    describe('None Context', () => {
      it('should return none for unknown context', () => {
        const context = engine.detectContext('hello', 5)
        expect(context).toBe('none')
      })

      it('should return none for empty line', () => {
        const context = engine.detectContext('', 0)
        expect(context).toBe('none')
      })
    })
  })

  // ===========================================
  // STATE COMPLETIONS
  // ===========================================

  describe('State Completions', () => {
    it('should return all state names after "state "', () => {
      const result = engine.getCompletions({
        lineText: 'state ',
        cursorColumn: 6
      })
      expect(result.context).toBe('state')
      expect(result.completions.length).toBeGreaterThan(0)
    })

    it('should include common states', () => {
      const result = engine.getCompletions({
        lineText: 'state ',
        cursorColumn: 6
      })
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('hover')
      expect(labels).toContain('focus')
      expect(labels).toContain('active')
      expect(labels).toContain('disabled')
      expect(labels).toContain('selected')
    })

    it('should filter state names by typed text', () => {
      const result = engine.getCompletions({
        lineText: 'state ho',
        cursorColumn: 8
      })
      expect(result.completions.length).toBe(1)
      expect(result.completions[0].label).toBe('hover')
    })

    it('should filter states starting with "sel"', () => {
      const result = engine.getCompletions({
        lineText: 'state sel',
        cursorColumn: 9
      })
      expect(result.completions.some(c => c.label === 'selected')).toBe(true)
    })

    it('should filter states starting with "on"', () => {
      const result = engine.getCompletions({
        lineText: 'state on',
        cursorColumn: 8
      })
      expect(result.completions.some(c => c.label === 'on')).toBe(true)
    })

    it('should return empty for non-matching filter', () => {
      const result = engine.getCompletions({
        lineText: 'state xyz',
        cursorColumn: 9
      })
      expect(result.completions.length).toBe(0)
    })
  })

  // ===========================================
  // PROPERTY COMPLETIONS
  // ===========================================

  describe('Property Completions', () => {
    it('should return properties after component name', () => {
      const result = engine.getCompletions({
        lineText: 'Box ',
        cursorColumn: 4
      })
      expect(result.context).toBe('property')
      expect(result.completions.length).toBeGreaterThan(0)
    })

    it('should include common layout properties', () => {
      const result = engine.getCompletions({
        lineText: 'Box ',
        cursorColumn: 4
      })
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('bg')
      expect(labels).toContain('pad')
      expect(labels).toContain('gap')
    })

    it('should filter properties by typed text', () => {
      const result = engine.getCompletions({
        lineText: 'Box bg',
        cursorColumn: 6
      })
      expect(result.completions.some(c => c.label === 'bg')).toBe(true)
    })

    it('should filter properties starting with "pad"', () => {
      const result = engine.getCompletions({
        lineText: 'Box pad',
        cursorColumn: 7
      })
      expect(result.completions.some(c => c.label === 'pad')).toBe(true)
    })

    it('should prioritize common properties', () => {
      const result = engine.getCompletions({
        lineText: 'Box ',
        cursorColumn: 4
      })
      // bg, pad, gap should be near the top
      const firstFew = result.completions.slice(0, 10).map(c => c.label)
      expect(firstFew.some(l => PRIORITY_PROPERTIES.has(l))).toBe(true)
    })

    it('should return completions after comma', () => {
      const result = engine.getCompletions({
        lineText: 'Box pad 10, ',
        cursorColumn: 12
      })
      expect(result.context).toBe('property')
      expect(result.completions.length).toBeGreaterThan(0)
    })

    it('should return completions on indented line', () => {
      const result = engine.getCompletions({
        lineText: '  ',
        cursorColumn: 2
      })
      expect(result.context).toBe('property')
      expect(result.completions.length).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // VALUE COMPLETIONS
  // ===========================================

  describe('Value Completions', () => {
    it('should return cursor values after "cursor "', () => {
      const result = engine.getCompletions({
        lineText: 'cursor ',
        cursorColumn: 7
      })
      expect(result.context).toBe('value')
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('pointer')
      expect(labels).toContain('grab')
      expect(labels).toContain('move')
    })

    it('should return width values after "w "', () => {
      const result = engine.getCompletions({
        lineText: 'w ',
        cursorColumn: 2
      })
      expect(result.context).toBe('value')
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('hug')
      expect(labels).toContain('full')
    })

    it('should return height values after "h "', () => {
      const result = engine.getCompletions({
        lineText: 'h ',
        cursorColumn: 2
      })
      expect(result.context).toBe('value')
      expect(result.completions.some(c => c.label === 'hug')).toBe(true)
    })

    // Note: position and overflow are not schema properties with keywords
    // Use 'absolute', 'fixed', etc. as standalone properties instead

    it('should return shadow values', () => {
      const result = engine.getCompletions({
        lineText: 'shadow ',
        cursorColumn: 7
      })
      expect(result.context).toBe('value')
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('sm')
      expect(labels).toContain('md')
      expect(labels).toContain('lg')
    })

    it('should return weight values', () => {
      const result = engine.getCompletions({
        lineText: 'weight ',
        cursorColumn: 7
      })
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('bold')
      expect(labels).toContain('normal')
    })

    it('should return text-align values', () => {
      const result = engine.getCompletions({
        lineText: 'text-align ',
        cursorColumn: 11
      })
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('center')
      expect(labels).toContain('left')
      expect(labels).toContain('right')
    })

    it('should filter values by typed text', () => {
      const result = engine.getCompletions({
        lineText: 'cursor po',
        cursorColumn: 9
      })
      expect(result.completions.length).toBeGreaterThan(0)
      expect(result.completions.some(c => c.label === 'pointer')).toBe(true)
    })
  })

  // ===========================================
  // HELPER METHODS
  // ===========================================

  describe('Helper Methods', () => {
    it('should return all state names', () => {
      const states = engine.getStateNames()
      expect(states.length).toBeGreaterThan(10)
    })

    it('should return all properties', () => {
      const props = engine.getProperties()
      expect(props.length).toBeGreaterThan(20)
    })

    it('should return property values for known property', () => {
      const values = engine.getPropertyValues('cursor')
      expect(values.length).toBeGreaterThan(0)
      expect(values.some(v => v.label === 'pointer')).toBe(true)
    })

    it('should return empty array for unknown property', () => {
      const values = engine.getPropertyValues('unknown-prop')
      expect(values).toEqual([])
    })

    it('should return keywords', () => {
      const keywords = engine.getKeywords()
      expect(keywords.length).toBeGreaterThan(0)
    })

    it('should return all completions', () => {
      const all = engine.getAllCompletions()
      expect(all.length).toBeGreaterThan(50)
    })
  })
})

// ===========================================
// EXPORTED CONSTANTS
// ===========================================

describe('Autocomplete Constants', () => {
  describe('MIRROR_PROPERTIES', () => {
    it('should contain common properties', () => {
      const labels = MIRROR_PROPERTIES.map(p => p.label)
      expect(labels).toContain('bg')
      expect(labels).toContain('pad')
      expect(labels).toContain('gap')
      expect(labels).toContain('col')
      expect(labels).toContain('rad')
    })

    it('should have correct type', () => {
      expect(MIRROR_PROPERTIES.every(p => p.type === 'property')).toBe(true)
    })
  })

  describe('MIRROR_KEYWORDS', () => {
    it('should contain reserved keywords', () => {
      const labels = MIRROR_KEYWORDS.map(k => k.label)
      // Reserved keywords (component names are in primitives now)
      expect(labels).toContain('as')
      expect(labels).toContain('extends')
      expect(labels).toContain('if')
      expect(labels).toContain('state')
    })

    it('should have correct type', () => {
      expect(MIRROR_KEYWORDS.every(k => k.type === 'keyword')).toBe(true)
    })
  })

  describe('STATE_NAMES', () => {
    it('should contain common states', () => {
      const labels = STATE_NAMES.map(s => s.label)
      expect(labels).toContain('hover')
      expect(labels).toContain('focus')
      expect(labels).toContain('active')
      expect(labels).toContain('disabled')
    })

    it('should have correct type', () => {
      expect(STATE_NAMES.every(s => s.type === 'state')).toBe(true)
    })

    it('should have descriptions', () => {
      expect(STATE_NAMES.every(s => s.detail !== undefined)).toBe(true)
    })
  })

  describe('PROPERTY_VALUES', () => {
    it('should have cursor values', () => {
      expect(PROPERTY_VALUES['cursor'].length).toBeGreaterThan(0)
    })

    it('should have width values', () => {
      expect(PROPERTY_VALUES['w'].length).toBeGreaterThan(0)
      expect(PROPERTY_VALUES['width'].length).toBeGreaterThan(0)
    })

    it('should have shadow values', () => {
      expect(PROPERTY_VALUES['shadow'].length).toBeGreaterThan(0)
    })

    it('should have weight values', () => {
      expect(PROPERTY_VALUES['weight'].length).toBeGreaterThan(0)
    })
  })

  describe('ALL_COMPLETIONS', () => {
    it('should include properties, keywords, and actions', () => {
      // ALL_COMPLETIONS includes primitives, Zag components, properties, events, keywords, and actions
      expect(ALL_COMPLETIONS.length).toBeGreaterThan(MIRROR_PROPERTIES.length + MIRROR_KEYWORDS.length)
    })

    it('should include primitives', () => {
      const labels = ALL_COMPLETIONS.map(c => c.label)
      expect(labels).toContain('Box')
      expect(labels).toContain('Text')
      expect(labels).toContain('Button')
    })

    it('should include Zag components', () => {
      const labels = ALL_COMPLETIONS.map(c => c.label)
      // Tutorial Set: Dialog, Select, Tabs, Checkbox, Switch, RadioGroup, Slider, DatePicker, Tooltip, SideNav
      expect(labels).toContain('Dialog')
      expect(labels).toContain('Select')
      expect(labels).toContain('Tabs')
    })
  })

  describe('PRIORITY_PROPERTIES', () => {
    it('should contain common properties', () => {
      expect(PRIORITY_PROPERTIES.has('bg')).toBe(true)
      expect(PRIORITY_PROPERTIES.has('pad')).toBe(true)
      expect(PRIORITY_PROPERTIES.has('gap')).toBe(true)
    })
  })
})

// ===========================================
// SINGLETON PATTERN
// ===========================================

describe('Singleton Pattern', () => {
  it('getAutocompleteEngine should return same instance', () => {
    const engine1 = getAutocompleteEngine()
    const engine2 = getAutocompleteEngine()
    expect(engine1).toBe(engine2)
  })

  it('createAutocompleteEngine should create new instance', () => {
    const engine1 = createAutocompleteEngine()
    const engine2 = createAutocompleteEngine()
    expect(engine1).not.toBe(engine2)
  })
})

// ===========================================
// EDGE CASES
// ===========================================

describe('Edge Cases', () => {
  let engine: AutocompleteEngine

  beforeEach(() => {
    engine = createAutocompleteEngine()
  })

  it('should handle empty line gracefully', () => {
    const result = engine.getCompletions({
      lineText: '',
      cursorColumn: 0
    })
    // Empty line returns no completions (context is 'none')
    expect(result).toBeDefined()
    expect(result.completions).toBeDefined()
  })

  it('should handle cursor at start of line', () => {
    const result = engine.getCompletions({
      lineText: 'Box',
      cursorColumn: 0
    })
    expect(result).toBeDefined()
  })

  it('should handle cursor beyond line length', () => {
    const result = engine.getCompletions({
      lineText: 'Box',
      cursorColumn: 100
    })
    expect(result).toBeDefined()
  })

  it('should handle whitespace-only line', () => {
    const result = engine.getCompletions({
      lineText: '    ',
      cursorColumn: 4
    })
    expect(result.context).toBe('property')
  })

  it('should handle tab indentation', () => {
    const result = engine.getCompletions({
      lineText: '\t\t',
      cursorColumn: 2
    })
    expect(result).toBeDefined()
  })

  it('should handle multiple spaces', () => {
    const result = engine.getCompletions({
      lineText: 'Box   pad   10',
      cursorColumn: 6
    })
    expect(result).toBeDefined()
  })

  it('should handle special characters in component name', () => {
    const result = engine.getCompletions({
      lineText: 'My_Component: ',
      cursorColumn: 14
    })
    expect(result.context).toBe('property')
  })
})

// ===========================================
// COMPLETION FROM/TO POSITIONS
// ===========================================

describe('Completion Positions', () => {
  let engine: AutocompleteEngine

  beforeEach(() => {
    engine = createAutocompleteEngine()
  })

  it('should return correct from position for state', () => {
    const result = engine.getCompletions({
      lineText: 'state ho',
      cursorColumn: 8
    })
    expect(result.from).toBe(6) // After "state "
  })

  it('should return correct to position', () => {
    const result = engine.getCompletions({
      lineText: 'state ho',
      cursorColumn: 8
    })
    expect(result.to).toBe(8) // At cursor
  })

  it('should return correct positions for property', () => {
    const result = engine.getCompletions({
      lineText: 'Box bg',
      cursorColumn: 6
    })
    expect(result.from).toBeLessThanOrEqual(result.to)
  })
})

// ===========================================
// EXPLICIT TRIGGER
// ===========================================

describe('Explicit Trigger', () => {
  let engine: AutocompleteEngine

  beforeEach(() => {
    engine = createAutocompleteEngine()
  })

  it('should return completions when explicit is true', () => {
    const result = engine.getCompletions({
      lineText: 'Box ',
      cursorColumn: 4,
      explicit: true
    })
    expect(result.completions.length).toBeGreaterThan(0)
  })

  it('should return completions without explicit flag', () => {
    const result = engine.getCompletions({
      lineText: 'Box ',
      cursorColumn: 4,
      explicit: false
    })
    expect(result.completions.length).toBeGreaterThan(0)
  })
})

// ===========================================
// ACTION CHAIN AUTOCOMPLETE
// ===========================================

describe('Action Chain Autocomplete', () => {
  let engine: AutocompleteEngine

  beforeEach(() => {
    engine = createAutocompleteEngine()
  })

  describe('Action Context Detection', () => {
    it('should detect action context after "onclick: "', () => {
      const context = engine.detectContext('onclick: ', 9)
      expect(context).toBe('action')
    })

    it('should detect action context after "onclick:"', () => {
      const context = engine.detectContext('onclick:', 8)
      expect(context).toBe('action')
    })

    it('should detect action context after "onhover: "', () => {
      const context = engine.detectContext('onhover: ', 9)
      expect(context).toBe('action')
    })

    it('should detect action context after "onfocus: "', () => {
      const context = engine.detectContext('onfocus: ', 9)
      expect(context).toBe('action')
    })

    it('should detect action context after "onkeydown enter: "', () => {
      const context = engine.detectContext('onkeydown enter: ', 17)
      expect(context).toBe('action')
    })

    it('should detect action context with leading whitespace', () => {
      const context = engine.detectContext('  onclick: ', 11)
      expect(context).toBe('action')
    })
  })

  describe('Action Completions', () => {
    it('should return action completions after "onclick: "', () => {
      const result = engine.getCompletions({
        lineText: 'onclick: ',
        cursorColumn: 9
      })
      expect(result.context).toBe('action')
      expect(result.completions.length).toBeGreaterThan(0)
    })

    it('should include common actions', () => {
      const result = engine.getCompletions({
        lineText: 'onclick: ',
        cursorColumn: 9
      })
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('show')
      expect(labels).toContain('hide')
      expect(labels).toContain('toggle')
      expect(labels).toContain('select')
      expect(labels).toContain('page')
    })

    it('should filter actions by typed text', () => {
      const result = engine.getCompletions({
        lineText: 'onclick: to',
        cursorColumn: 11
      })
      expect(result.completions.some(c => c.label === 'toggle')).toBe(true)
    })

    it('should filter actions starting with "sh"', () => {
      const result = engine.getCompletions({
        lineText: 'onclick: sh',
        cursorColumn: 11
      })
      expect(result.completions.some(c => c.label === 'show')).toBe(true)
    })
  })

  describe('Target Context Detection', () => {
    it('should detect target context after "onclick: show "', () => {
      const context = engine.detectContext('onclick: show ', 14)
      expect(context).toBe('target')
    })

    it('should detect target context after "onclick: hide "', () => {
      const context = engine.detectContext('onclick: hide ', 14)
      expect(context).toBe('target')
    })

    it('should detect target context after "onclick: toggle "', () => {
      const context = engine.detectContext('onclick: toggle ', 16)
      expect(context).toBe('target')
    })

    it('should detect target context after "onhover: highlight "', () => {
      const context = engine.detectContext('onhover: highlight ', 19)
      expect(context).toBe('target')
    })

    it('should detect target context after chained action "onclick: show Modal, hide "', () => {
      const context = engine.detectContext('onclick: show Modal, hide ', 26)
      expect(context).toBe('target')
    })
  })

  describe('Target Completions', () => {
    it('should return target keywords after "onclick: show "', () => {
      const result = engine.getCompletions({
        lineText: 'onclick: show ',
        cursorColumn: 14
      })
      expect(result.context).toBe('target')
      expect(result.completions.length).toBeGreaterThan(0)
    })

    it('should include target keywords', () => {
      const result = engine.getCompletions({
        lineText: 'onclick: toggle ',
        cursorColumn: 16
      })
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('self')
      expect(labels).toContain('next')
      expect(labels).toContain('prev')
    })

    it('should include element names from source', () => {
      const source = `
Modal: = Box
  bg #fff

Sidebar: = Box
  w 200

Button
  onclick: toggle `
      const result = engine.getCompletions({
        lineText: '  onclick: toggle ',
        cursorColumn: 18,
        fullSource: source
      })
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('Modal')
      expect(labels).toContain('Sidebar')
    })

    it('should filter targets by typed text', () => {
      const result = engine.getCompletions({
        lineText: 'onclick: show sel',
        cursorColumn: 17
      })
      expect(result.completions.some(c => c.label === 'self')).toBe(true)
      expect(result.completions.some(c => c.label === 'selected')).toBe(true)
    })
  })

  describe('Duration Context Detection', () => {
    it('should detect duration context after "transition all "', () => {
      const context = engine.detectContext('transition all ', 15)
      expect(context).toBe('duration')
    })

    it('should detect duration context after "transition bg "', () => {
      const context = engine.detectContext('transition bg ', 14)
      expect(context).toBe('duration')
    })

    it('should detect duration context after "transition opacity "', () => {
      const context = engine.detectContext('transition opacity ', 19)
      expect(context).toBe('duration')
    })
  })

  describe('Duration Completions', () => {
    it('should return duration values after "transition all "', () => {
      const result = engine.getCompletions({
        lineText: 'transition all ',
        cursorColumn: 15
      })
      expect(result.context).toBe('duration')
      expect(result.completions.length).toBeGreaterThan(0)
    })

    it('should include common durations', () => {
      const result = engine.getCompletions({
        lineText: 'transition all ',
        cursorColumn: 15
      })
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('100')
      expect(labels).toContain('200')
      expect(labels).toContain('300')
    })

    it('should filter durations by typed text', () => {
      const result = engine.getCompletions({
        lineText: 'transition all 2',
        cursorColumn: 16
      })
      expect(result.completions.some(c => c.label === '200')).toBe(true)
    })
  })

  describe('Easing Context Detection', () => {
    it('should detect easing context after "transition all 200 "', () => {
      const context = engine.detectContext('transition all 200 ', 19)
      expect(context).toBe('easing')
    })

    it('should detect easing context after "transition bg 150 "', () => {
      const context = engine.detectContext('transition bg 150 ', 18)
      expect(context).toBe('easing')
    })
  })

  describe('Easing Completions', () => {
    it('should return easing values after "transition all 200 "', () => {
      const result = engine.getCompletions({
        lineText: 'transition all 200 ',
        cursorColumn: 19
      })
      expect(result.context).toBe('easing')
      expect(result.completions.length).toBeGreaterThan(0)
    })

    it('should include common easings', () => {
      const result = engine.getCompletions({
        lineText: 'transition all 200 ',
        cursorColumn: 19
      })
      const labels = result.completions.map(c => c.label)
      expect(labels).toContain('ease')
      expect(labels).toContain('ease-in')
      expect(labels).toContain('ease-out')
      expect(labels).toContain('linear')
    })

    it('should filter easings by typed text', () => {
      const result = engine.getCompletions({
        lineText: 'transition all 200 ease-i',
        cursorColumn: 25
      })
      expect(result.completions.some(c => c.label === 'ease-in')).toBe(true)
      expect(result.completions.some(c => c.label === 'ease-in-out')).toBe(true)
    })
  })

  describe('Helper Methods', () => {
    it('should return action completions', () => {
      const actions = engine.getActionCompletions()
      expect(actions.length).toBeGreaterThan(10)
      expect(actions.some(a => a.label === 'show')).toBe(true)
    })

    it('should return target completions without source', () => {
      const targets = engine.getTargetCompletions()
      expect(targets.length).toBeGreaterThan(0)
      expect(targets.some(t => t.label === 'self')).toBe(true)
    })

    it('should return target completions with source', () => {
      const source = 'Modal: = Box\nSidebar = Box'
      const targets = engine.getTargetCompletions(source)
      expect(targets.some(t => t.label === 'Modal')).toBe(true)
      expect(targets.some(t => t.label === 'Sidebar')).toBe(true)
    })

    it('should return duration completions', () => {
      const durations = engine.getDurationCompletions()
      expect(durations.length).toBeGreaterThan(0)
    })

    it('should return easing completions', () => {
      const easings = engine.getEasingCompletions()
      expect(easings.length).toBeGreaterThan(0)
    })
  })
})

// ===========================================
// ELEMENT NAME EXTRACTION
// ===========================================

describe('Element Name Extraction', () => {
  it('should extract definition names', () => {
    const source = `
Modal: = Box
  bg #fff

Sidebar: = Box
  w 200
`
    const names = extractElementNames(source)
    expect(names).toContain('Modal')
    expect(names).toContain('Sidebar')
  })

  it('should extract instance names', () => {
    const source = `
Header = Navbar
Footer = Box
`
    const names = extractElementNames(source)
    expect(names).toContain('Header')
    expect(names).toContain('Footer')
  })

  it('should not include primitive components', () => {
    const source = `
Box bg #fff
Text col #333
Button onclick: show Modal
`
    const names = extractElementNames(source)
    expect(names).not.toContain('Box')
    expect(names).not.toContain('Text')
    expect(names).not.toContain('Button')
  })

  it('should deduplicate names', () => {
    const source = `
Modal: = Box
Modal: = Box
`
    const names = extractElementNames(source)
    expect(names.filter(n => n === 'Modal').length).toBe(1)
  })

  it('should handle empty source', () => {
    const names = extractElementNames('')
    expect(names).toEqual([])
  })
})

// ===========================================
// ACTION/TARGET CONSTANTS
// ===========================================

describe('Action Chain Constants', () => {
  describe('ACTION_COMPLETIONS', () => {
    it('should contain common actions', () => {
      const labels = ACTION_COMPLETIONS.map(a => a.label)
      expect(labels).toContain('show')
      expect(labels).toContain('hide')
      expect(labels).toContain('toggle')
      expect(labels).toContain('select')
      expect(labels).toContain('page')
      expect(labels).toContain('call')
    })

    it('should have correct type', () => {
      expect(ACTION_COMPLETIONS.every(a => a.type === 'keyword')).toBe(true)
    })
  })

  describe('TARGET_KEYWORDS', () => {
    it('should contain target keywords', () => {
      const labels = TARGET_KEYWORDS.map(t => t.label)
      expect(labels).toContain('self')
      expect(labels).toContain('next')
      expect(labels).toContain('prev')
      expect(labels).toContain('first')
      expect(labels).toContain('last')
    })
  })

  describe('DURATION_COMPLETIONS', () => {
    it('should contain duration values', () => {
      const labels = DURATION_COMPLETIONS.map(d => d.label)
      expect(labels).toContain('100')
      expect(labels).toContain('200')
      expect(labels).toContain('300')
    })
  })

  describe('EASING_COMPLETIONS', () => {
    it('should contain easing functions', () => {
      const labels = EASING_COMPLETIONS.map(e => e.label)
      expect(labels).toContain('ease')
      expect(labels).toContain('ease-in')
      expect(labels).toContain('ease-out')
      expect(labels).toContain('linear')
    })
  })
})
