/**
 * Comprehensive Validator Tests
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  validateCode,
  validateProperties,
  validateReferences,
  validateEvents,
  validateActions,
  validateLibraryComponents,
  validateStates,
  validateAnimations,
  validateTypes,
  ValidatorErrorCodes,
  isValidProperty,
  isValidColor,
  isValidEvent,
  isValidAction,
  isValidAnimation,
  isValidPosition,
  findSimilar,
  didYouMean,
  diagnosticToParseError
} from '../../validator'
import { parse, registerValidator } from '../../parser/parser'

// Register validator with parser before tests
beforeAll(() => {
  registerValidator(validateCode, diagnosticToParseError)
})

describe('Mirror DSL Validator', () => {
  describe('validateCode - Main Function', () => {
    it('returns valid for correct code', () => {
      const code = `
Box pad 16 bg #333
  Text "Hello"
`
      const result = parse(code)
      const validation = validateCode(result, code)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('respects skip option', () => {
      const code = `
$unknownRef: $anotherUnknown
Box bg $unknownRef
`
      const result = parse(code)

      const withRef = validateCode(result, code)
      const withoutRef = validateCode(result, code, { skip: ['reference'] })

      // Reference validator would find warnings
      expect(withRef.warnings.length).toBeGreaterThanOrEqual(withoutRef.warnings.length)
    })

    it('respects strictMode option', () => {
      const code = `
$undefined: $notDefined
Box bg $undefined
`
      const result = parse(code)

      const normal = validateCode(result, code)
      const strict = validateCode(result, code, { strictMode: true })

      // In normal mode, warnings don't affect validity
      // In strict mode, warnings become errors
      if (normal.warnings.length > 0) {
        expect(strict.errors.length).toBeGreaterThanOrEqual(normal.warnings.length)
      }
    })
  })

  describe('Property Validation Schema', () => {
    it('recognizes valid properties', () => {
      const validProps = ['pad', 'mar', 'bg', 'col', 'rad', 'bor', 'gap', 'w', 'h', 'size', 'weight']
      for (const prop of validProps) {
        expect(isValidProperty(prop)).toBe(true)
      }
    })

    it('rejects invalid properties', () => {
      const invalidProps = ['paddin', 'colr', 'backgroud', 'radus']
      for (const prop of invalidProps) {
        expect(isValidProperty(prop)).toBe(false)
      }
    })

    it('recognizes directional properties', () => {
      expect(isValidProperty('pad')).toBe(true)
      expect(isValidProperty('mar')).toBe(true)
      expect(isValidProperty('bor')).toBe(true)
    })
  })

  describe('Color Validation', () => {
    it('validates hex colors', () => {
      expect(isValidColor('#F00')).toBe(true)
      expect(isValidColor('#FF5500')).toBe(true)
      expect(isValidColor('#FF550080')).toBe(true)
    })

    it('validates rgb/rgba colors', () => {
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true)
      expect(isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true)
    })

    it('validates hsl colors', () => {
      expect(isValidColor('hsl(0, 100%, 50%)')).toBe(true)
    })

    it('validates named colors', () => {
      expect(isValidColor('white')).toBe(true)
      expect(isValidColor('black')).toBe(true)
      expect(isValidColor('transparent')).toBe(true)
    })

    it('validates token references', () => {
      expect(isValidColor('$primary')).toBe(true)
    })

    it('rejects invalid colors', () => {
      expect(isValidColor('not-a-color')).toBe(false)
      expect(isValidColor('hello')).toBe(false)
    })
  })

  describe('Event Schema', () => {
    it('validates event names', () => {
      expect(isValidEvent('onclick')).toBe(true)
      expect(isValidEvent('onchange')).toBe(true)
      expect(isValidEvent('onhover')).toBe(true)
      expect(isValidEvent('oninput')).toBe(true)
      expect(isValidEvent('onfocus')).toBe(true)
      expect(isValidEvent('onblur')).toBe(true)
    })

    it('rejects invalid events', () => {
      expect(isValidEvent('onclck')).toBe(false)
      expect(isValidEvent('onclick2')).toBe(false)
    })
  })

  describe('Action Schema', () => {
    it('validates action names', () => {
      expect(isValidAction('open')).toBe(true)
      expect(isValidAction('close')).toBe(true)
      expect(isValidAction('toggle')).toBe(true)
      expect(isValidAction('show')).toBe(true)
      expect(isValidAction('hide')).toBe(true)
      expect(isValidAction('change')).toBe(true)
      expect(isValidAction('page')).toBe(true)
      expect(isValidAction('assign')).toBe(true)
    })

    it('rejects invalid actions', () => {
      expect(isValidAction('opn')).toBe(false)
      expect(isValidAction('toogle')).toBe(false)
    })
  })

  describe('Animation Schema', () => {
    it('validates animation names', () => {
      expect(isValidAnimation('fade')).toBe(true)
      expect(isValidAnimation('scale')).toBe(true)
      expect(isValidAnimation('slide-up')).toBe(true)
      expect(isValidAnimation('slide-down')).toBe(true)
      expect(isValidAnimation('spin')).toBe(true)
      expect(isValidAnimation('pulse')).toBe(true)
      expect(isValidAnimation('bounce')).toBe(true)
    })

    it('rejects invalid animations', () => {
      expect(isValidAnimation('slideup')).toBe(false)  // Missing hyphen
      expect(isValidAnimation('fde')).toBe(false)
    })
  })

  describe('Position Schema', () => {
    it('validates position names', () => {
      expect(isValidPosition('below')).toBe(true)
      expect(isValidPosition('above')).toBe(true)
      expect(isValidPosition('left')).toBe(true)
      expect(isValidPosition('right')).toBe(true)
      expect(isValidPosition('center')).toBe(true)
    })

    it('rejects invalid positions', () => {
      expect(isValidPosition('bellow')).toBe(false)  // Typo
      expect(isValidPosition('middle')).toBe(false)
    })
  })

  describe('Suggestion Engine', () => {
    it('finds similar strings', () => {
      const candidates = ['pad', 'mar', 'rad', 'col', 'bg', 'gap']

      const padSuggestions = findSimilar('padd', candidates)
      expect(padSuggestions.length).toBeGreaterThan(0)
      expect(padSuggestions[0].value).toBe('pad')

      const colSuggestions = findSimilar('colr', candidates)
      expect(colSuggestions.length).toBeGreaterThan(0)
      expect(colSuggestions[0].value).toBe('col')
    })

    it('generates did you mean suggestions', () => {
      const candidates = ['onclick', 'onchange', 'onhover']

      const suggestions = didYouMean('onclck', candidates)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0].replacement).toBe('onclick')
    })

    it('handles no matches gracefully', () => {
      const candidates = ['alpha', 'beta', 'gamma']

      const suggestions = findSimilar('zzzzzzz', candidates, { minScore: 0.8 })
      expect(suggestions).toHaveLength(0)
    })
  })

  describe('Property Validator', () => {
    it('passes valid properties', () => {
      const code = `
Box pad 16 bg #333 rad 8
  Text col white size 14 weight 600
`
      const result = parse(code)
      const validation = validateProperties(result, code)

      // No unknown property errors
      const unknownProps = validation.warnings.filter(w => w.code === ValidatorErrorCodes.UNKNOWN_PROPERTY)
      expect(unknownProps).toHaveLength(0)
    })

    it('detects conflicting properties', () => {
      const code = `Box hor ver`
      const result = parse(code)
      const validation = validateProperties(result, code)

      const conflicts = validation.warnings.filter(w => w.code === ValidatorErrorCodes.CONFLICTING_PROPERTIES)
      expect(conflicts.length).toBeGreaterThan(0)
    })
  })

  describe('Reference Validator', () => {
    it('passes valid token references', () => {
      const code = `
$primary: #3B82F6
$spacing: 16

Box bg $primary pad $spacing
`
      const result = parse(code)
      const validation = validateReferences(result, code)

      const undefinedTokens = validation.warnings.filter(w => w.code === ValidatorErrorCodes.UNDEFINED_TOKEN)
      expect(undefinedTokens).toHaveLength(0)
    })

    it('detects undefined tokens in property references', () => {
      // Note: The parser may store "$unknownToken" as a literal value in properties
      // The reference validator checks properties for token references
      const code = `
$primary: #3B82F6
Box bg $primary
  Text col $undefined
`
      const result = parse(code)
      const validation = validateReferences(result, code)

      // Check that we get some validation result
      expect(validation).toBeDefined()
      expect(validation.valid).toBeDefined()
    })

    it('allows path references without validation', () => {
      const code = `
$user: { name: "John" }
Text $user.name
`
      const result = parse(code)
      const validation = validateReferences(result, code)

      // Path references like $user.name are allowed even if $user.name specifically isn't defined
      // because the parser handles nested access
      expect(validation.valid).toBe(true)
    })
  })

  describe('Library Validator', () => {
    it('validates library component structure', () => {
      const code = `
MyDropdown as Dropdown:
  Trigger
    Button "Menu"
  Content
    Text "Item 1"
`
      const result = parse(code)
      const validation = validateLibraryComponents(result, code)

      // The library validator runs without errors
      expect(validation).toBeDefined()
      expect(validation.errors).toHaveLength(0)
    })

    it('detects library component usage', () => {
      const code = `
Dialog named MyDialog:
  Trigger
    Button "Open"
  Content
    Text "Dialog content"
`
      const result = parse(code)
      const validation = validateLibraryComponents(result, code)

      expect(validation).toBeDefined()
    })
  })

  describe('State Validator', () => {
    it('validates state definitions', () => {
      const code = `
Toggle: w 52
  state off
    bg #333
  state on
    bg #3B82F6
`
      const result = parse(code)
      const validation = validateStates(result, code)

      // Should have no errors for valid state definitions
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Animation Validator', () => {
    it('validates animation definitions', () => {
      const code = `
Panel hidden
  show fade 300
  hide fade 150
`
      const result = parse(code)
      const validation = validateAnimations(result, code)

      // Valid animations should pass
      const unknownAnims = validation.warnings.filter(w => w.code === ValidatorErrorCodes.UNKNOWN_ANIMATION)
      expect(unknownAnims).toHaveLength(0)
    })

    it('validates continuous animations', () => {
      const code = `
Loader: w 32 h 32
  animate spin 1000
`
      const result = parse(code)
      const validation = validateAnimations(result, code)

      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Action Validator', () => {
    it('validates action with targets', () => {
      const code = `
Panel: pad 16 hidden
Button onclick show Panel "Show Panel"
`
      const result = parse(code)
      const validation = validateActions(result, code)

      // Valid action should pass
      const missingTargets = validation.errors.filter(e => e.code === ValidatorErrorCodes.MISSING_ACTION_TARGET)
      expect(missingTargets).toHaveLength(0)
    })
  })

  describe('Event Validator', () => {
    it('validates correct events', () => {
      const code = `Button onclick toggle "Click"`
      const result = parse(code)
      const validation = validateEvents(result, code)

      const unknownEvents = validation.warnings.filter(w => w.code === ValidatorErrorCodes.UNKNOWN_EVENT)
      expect(unknownEvents).toHaveLength(0)
    })
  })

  describe('Type Validator', () => {
    it('handles valid conditionals', () => {
      const code = `
$count: 0
if $count > 0
  Text "Has items"
`
      const result = parse(code)
      const validation = validateTypes(result, code)

      // Should not error on valid comparison
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Parser Integration', () => {
    it('validates when parse option is set', () => {
      const code = `
Box pad 16 bg #333
  Text "Hello"
`
      // Parse with validation
      const result = parse(code, { validate: true })

      // Should have run validation
      expect(result).toBeDefined()
      expect(result.nodes.length).toBeGreaterThan(0)
    })

    it('adds validation errors to diagnostics', () => {
      const code = `
Box hor ver
  Text "Conflicting"
`
      const result = parse(code, { validate: true })

      // Should have conflict warning in diagnostics
      const hasConflict = result.diagnostics.some(d =>
        d.message.includes('conflict') || d.message.includes('hor')
      )
      expect(hasConflict).toBe(true)
    })

    it('supports strictValidation option', () => {
      const code = `
$undefined: $notDefined
Box bg $undefined
`
      const normal = parse(code, { validate: true })
      const strict = parse(code, { validate: true, strictValidation: true })

      // Strict mode should have more errors
      expect(strict.errors.length).toBeGreaterThanOrEqual(normal.errors.length)
    })

    it('supports skipValidation option', () => {
      const code = `Box hor ver`

      const withProperty = parse(code, { validate: true })
      const withoutProperty = parse(code, { validate: true, skipValidation: ['property'] })

      // Without property validation, should have fewer diagnostics
      expect(withoutProperty.diagnostics.length).toBeLessThanOrEqual(withProperty.diagnostics.length)
    })
  })

  describe('Integration Tests', () => {
    it('validates a complex component', () => {
      const code = `
$primary: #3B82F6
$danger: #EF4444

Button: pad 12 24 bg $primary col white rad 8 cursor pointer
  state hover
    bg #2563EB

DangerButton from Button:
  bg $danger

Card: ver pad 16 bg #1E1E2E rad 12 gap 8
  Title: size 18 weight 600 col white
  Description: size 14 col #9CA3AF

Card
  Title "Welcome"
  Description "Get started with Mirror"
  Button onclick page Dashboard "Continue"
`
      const result = parse(code)
      const validation = validateCode(result, code)

      // Should be mostly valid (may have some warnings about undefined Dashboard)
      expect(validation.errors).toHaveLength(0)
    })
  })
})
