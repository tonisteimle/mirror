/**
 * Tests for the LLM Validator
 */

import { describe, it, expect } from 'vitest'
import {
  validateMirrorCode,
  formatValidationResult,
  isValidMirrorCode,
  ValidationResult,
} from '../../dsl/validator/llm-validator'

describe('LLM Validator', () => {
  describe('Valid Mirror Code', () => {
    it('validates simple component with properties', () => {
      const code = `
Button padding 12, background #3B82F6, radius 8
  "Click me"
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('validates short form properties', () => {
      const code = `
Card pad 16, bg #333, rad 4
  Text col #FFF, "Hello"
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('validates layout properties', () => {
      const code = `
Container horizontal, gap 16, spread
  Item
  Item
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('validates directional padding', () => {
      const code = `
Box padding left 16, padding top 8
Box pad l-r 12
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('validates events with actions', () => {
      const code = `
Button onclick toggle
Button onclick show Modal
Button onclick hide Dropdown
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
      expect(result.stats.eventsFound).toBe(3)
      expect(result.stats.actionsFound).toBe(3)
    })

    it('validates keyboard events with modifiers', () => {
      const code = `
Input onkeydown escape: close
Input onkeydown enter: select highlighted
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('validates state blocks', () => {
      const code = `
Item
  state highlighted
    background #333
  state selected
    background #3B82F6
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
      expect(result.stats.statesFound).toBeGreaterThanOrEqual(2)
    })

    it('validates system states', () => {
      const code = `
Button
  hover
    background #555
  focus
    border 2 #3B82F6
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('validates animations', () => {
      const code = `
Modal
  show fade slide-up 300
  hide fade 150
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('validates hover properties', () => {
      const code = `
Button hover-background #555, hover-color #FFF, hover-scale 1.05
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('validates tokens as values', () => {
      const code = `
Card background $primary.bg, color $default.col, padding $md.pad
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('validates complex component', () => {
      const code = `
Dropdown:
  Trigger pad 12, bg #333, rad 4
    Text "Select..."
    Icon "chevron-down"
  Options hidden
    Option pad 8, hover-bg #444
      "Option 1"
    Option pad 8, hover-bg #444
      "Option 2"

events
  Trigger onclick
    toggle Options
  Option onclick
    select self
    hide Options
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })
  })

  describe('Invalid Mirror Code', () => {
    it('detects unknown properties', () => {
      const code = `
Button paddng 12
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('UNKNOWN_PROPERTY')
      expect(result.errors[0].found).toBe('paddng')
      expect(result.errors[0].suggestion).toContain('padding')
    })

    it('detects invalid color values', () => {
      const code = `
Button background red
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors[0].type).toBe('INVALID_VALUE')
      expect(result.errors[0].suggestion).toContain('#RRGGBB')
    })

    it('detects out-of-range opacity', () => {
      const code = `
Box opacity 1.5
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors[0].type).toBe('VALUE_OUT_OF_RANGE')
    })

    it('detects invalid enum values', () => {
      const code = `
Box shadow huge
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors[0].type).toBe('INVALID_VALUE')
      expect(result.errors[0].suggestion).toContain('sm')
    })

    it('detects unknown events', () => {
      const code = `
Button onclck toggle
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors[0].type).toBe('UNKNOWN_EVENT')
      expect(result.errors[0].suggestion).toContain('onclick')
    })

    it('detects invalid key modifiers', () => {
      const code = `
Input onkeydown ctrl: close
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors[0].type).toBe('INVALID_KEY_MODIFIER')
    })

    it('detects unknown actions', () => {
      const code = `
Button onclick toggl
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors[0].type).toBe('UNKNOWN_ACTION')
      expect(result.errors[0].suggestion).toContain('toggle')
    })

    it('detects unknown states', () => {
      const code = `
Item
  state highlited
    bg #333
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors[0].type).toBe('UNKNOWN_STATE')
    })

    it('detects multiple errors', () => {
      const code = `
Button paddng 12, backgrond #333
Button onclck toggl
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty code', () => {
      const result = validateMirrorCode('')
      expect(result.valid).toBe(true)
      expect(result.stats.linesChecked).toBe(0)
    })

    it('handles comments', () => {
      const code = `
// This is a comment
Button pad 12 // inline comment
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('handles string content', () => {
      const code = `
Button "This has paddng in the string"
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true) // paddng is in string, not property
    })

    it('handles component definitions', () => {
      const code = `
MyButton: Button pad 12, bg #3B82F6
PrimaryButton: MyButton bg #2563EB
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('handles conditionals', () => {
      const code = `
Icon if $active then "check" else "circle"
Button if $loading then opacity 0.5
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })

    it('handles iterators', () => {
      const code = `
each $item in $items
  Card pad 12
    Text $item.title
`
      const result = validateMirrorCode(code)
      expect(result.valid).toBe(true)
    })
  })

  describe('Formatting', () => {
    it('formats valid result', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        quality: { overall: 85, correctness: 100, tokenUsage: 80, consistency: 90, completeness: 80, reusability: 90 },
        stats: { linesChecked: 10, propertiesFound: 5, eventsFound: 2, actionsFound: 2, statesFound: 1, tokensUsed: 4, hardcodedValues: 1 },
      }
      const formatted = formatValidationResult(result)
      expect(formatted).toContain('✅ Validation passed')
      expect(formatted).toContain('10 lines')
      expect(formatted).toContain('Quality Score: 85/100')
      expect(formatted).toContain('Correctness: 100%')
    })

    it('formats invalid result with suggestions', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [{
          type: 'UNKNOWN_PROPERTY',
          line: 5,
          message: "Unknown property: 'paddng'",
          found: 'paddng',
          suggestion: "Did you mean 'padding'?",
        }],
        warnings: [],
        quality: { overall: 40, correctness: 90, tokenUsage: 0, consistency: 50, completeness: 50, reusability: 60 },
        stats: { linesChecked: 10, propertiesFound: 4, eventsFound: 0, actionsFound: 0, statesFound: 0, tokensUsed: 0, hardcodedValues: 5 },
      }
      const formatted = formatValidationResult(result)
      expect(formatted).toContain('❌ Validation failed')
      expect(formatted).toContain('Line 5')
      expect(formatted).toContain('paddng')
      expect(formatted).toContain('padding')
      expect(formatted).toContain('Quality Score: 40/100')
    })
  })

  describe('isValidMirrorCode helper', () => {
    it('returns true for valid code', () => {
      expect(isValidMirrorCode('Button pad 12')).toBe(true)
    })

    it('returns false for invalid code', () => {
      expect(isValidMirrorCode('Button paddng 12')).toBe(false)
    })
  })

  describe('Quality Scoring', () => {
    it('gives high token usage score when tokens are used', () => {
      const code = `
Button bg $primary.bg, col $on-primary.col, pad $md.pad
`
      const result = validateMirrorCode(code)
      expect(result.quality.tokenUsage).toBe(100)
      expect(result.stats.tokensUsed).toBe(3)
      expect(result.stats.hardcodedValues).toBe(0)
    })

    it('gives low token usage score when hardcoded values are used', () => {
      const code = `
Button bg #3B82F6, col #FFF, pad 12
`
      const result = validateMirrorCode(code)
      expect(result.quality.tokenUsage).toBe(0)
      expect(result.stats.tokensUsed).toBe(0)
      expect(result.stats.hardcodedValues).toBeGreaterThan(0)
    })

    it('warns when interactive elements have no hover state', () => {
      const code = `
Button onclick toggle, pad 12
`
      const result = validateMirrorCode(code)
      expect(result.quality.completeness).toBe(0)
      expect(result.warnings.some(w => w.type === 'MISSING_HOVER_STATE')).toBe(true)
    })

    it('gives high completeness when interactive element has hover state', () => {
      const code = `
Button onclick toggle
  hover
    bg #555
`
      const result = validateMirrorCode(code)
      expect(result.quality.completeness).toBe(70) // hover (70%) but no focus (30%)
    })

    it('warns about inconsistent spacing', () => {
      const code = `
Box pad 4
Box pad 8
Box pad 12
Box pad 16
Box pad 20
Box pad 24
`
      const result = validateMirrorCode(code)
      expect(result.warnings.some(w => w.type === 'INCONSISTENT_SPACING')).toBe(true)
    })

    it('tracks component definitions and instances', () => {
      const code = `
MyButton: Button pad 12
PrimaryButton: MyButton bg #3B82F6
MyButton "Click 1"
MyButton "Click 2"
PrimaryButton "Submit"
`
      const result = validateMirrorCode(code)
      // 2 definitions, 3 instances
      expect(result.quality.reusability).toBeGreaterThan(0)
    })
  })
})
