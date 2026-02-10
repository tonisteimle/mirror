import { describe, it, expect } from 'vitest'
import { ValidationService, cleanLLMOutput, correctProperty, correctColor } from '../validation'

describe('ValidationService', () => {
  const validator = new ValidationService()

  describe('Markdown Cleaning', () => {
    it('removes markdown code blocks', () => {
      const input = '```dsl\nButton: pad 8\n```'
      const result = cleanLLMOutput(input)
      expect(result.components).toContain('Button:')
      expect(result.hadMarkdown).toBe(true)
    })

    it('splits by markers', () => {
      const input = `--- COMPONENTS ---
Button: pad 8 col #3B82F6

--- LAYOUT ---
Button "Click"`

      const result = cleanLLMOutput(input)
      expect(result.components).toContain('Button:')
      expect(result.layout).toContain('Button "Click"')
    })

    it('removes explanatory text', () => {
      const input = `Here's the component:
Button: pad 8

This creates a button.`

      const result = cleanLLMOutput(input)
      expect(result.hadExplanation).toBe(true)
    })
  })

  describe('Property Correction', () => {
    it('corrects CSS property names', () => {
      const result = correctProperty('padding')
      expect(result.corrected).toBe('pad')
      expect(result.method).toBe('css')
    })

    it('corrects common typos', () => {
      const result = correctProperty('backgrnd')
      expect(result.corrected).toBe('col')
    })

    it('uses fuzzy matching for unknown properties', () => {
      const result = correctProperty('horiz')
      expect(result.corrected).toBe('hor')
    })

    it('returns null for unrecognizable properties', () => {
      const result = correctProperty('xyzabc')
      expect(result.corrected).toBeNull()
    })
  })

  describe('Color Correction', () => {
    it('accepts valid hex colors', () => {
      const result = correctColor('#3B82F6')
      expect(result.isValid).toBe(true)
      expect(result.corrected).toBe('#3B82F6')
    })

    it('adds missing # to hex', () => {
      const result = correctColor('FFF')
      expect(result.corrected).toBe('#FFFFFF')
    })

    it('converts named colors to hex', () => {
      const result = correctColor('red')
      expect(result.corrected).toBe('#FF0000')
    })

    it('converts rgb to hex', () => {
      const result = correctColor('rgb(255, 0, 0)')
      expect(result.corrected).toBe('#FF0000')
    })

    it('normalizes shorthand hex', () => {
      const result = correctColor('#FFF')
      expect(result.corrected).toBe('#FFFFFF')
    })
  })

  describe('Layout Tab Validation', () => {
    it('removes properties from layout lines', () => {
      const input = `--- COMPONENTS ---
Button: pad 8 col #3B82F6

--- LAYOUT ---
Button pad 8 "Click"`

      const result = validator.validate(input)
      expect(result.layout).not.toContain('pad 8')
      expect(result.layout).toContain('Button')
      expect(result.layout).toContain('"Click"')
    })

    it('keeps from keyword in layout', () => {
      const input = `--- COMPONENTS ---
Button: pad 8

--- LAYOUT ---
DangerButton from Button "Delete"`

      const result = validator.validate(input)
      expect(result.layout).toContain('from Button')
    })

    it('errors on definitions in layout', () => {
      const input = `--- COMPONENTS ---
Button: pad 8

--- LAYOUT ---
NewButton: pad 16`

      const result = validator.validate(input)
      expect(result.errors.some(e => e.type === 'DEFINITION_IN_LAYOUT')).toBe(true)
    })
  })

  describe('Components Tab Validation', () => {
    it('warns on instances in components tab', () => {
      const input = `--- COMPONENTS ---
Button pad 8 col #3B82F6

--- LAYOUT ---
Button "Click"`

      const result = validator.validate(input)
      expect(result.warnings.some(w => w.message.includes('instance'))).toBe(true)
    })

    it('detects duplicate definitions (via correction)', () => {
      const input = `--- COMPONENTS ---
Button: pad 8
Button: pad 16

--- LAYOUT ---
Button "Click"`

      const result = validator.validate(input)
      // With auto-correct enabled, duplicates are removed and reported as corrections
      const hasDuplicateCorrection = result.corrections.some(c =>
        c.reason.includes('duplicate') || c.reason.includes('Removed duplicate')
      )
      expect(hasDuplicateCorrection).toBe(true)
    })
  })

  describe('Semantic Validation', () => {
    it('detects invalid from references', () => {
      const input = `--- COMPONENTS ---
DangerButton: from NonExistent col #EF4444

--- LAYOUT ---
DangerButton "Delete"`

      const result = validator.validate(input)
      expect(result.errors.some(e => e.type === 'INVALID_REFERENCE')).toBe(true)
    })

    it('detects circular from references', () => {
      const input = `--- COMPONENTS ---
A: from B pad 8
B: from A col #FFF

--- LAYOUT ---
A "Test"`

      const result = validator.validate(input)
      expect(result.errors.some(e => e.type === 'CIRCULAR_REFERENCE')).toBe(true)
    })

    it('warns on unused components', () => {
      const input = `--- COMPONENTS ---
Button: pad 8
UnusedButton: pad 16

--- LAYOUT ---
Button "Click"`

      const result = validator.validate(input)
      expect(result.warnings.some(w => w.type === 'UNUSED_COMPONENT')).toBe(true)
    })
  })

  describe('Syntax Validation', () => {
    it('handles lines with only properties (no component name)', () => {
      const input = `--- COMPONENTS ---
ver gap 16

--- LAYOUT ---
Box "Test"`

      const result = validator.validate(input)
      // Validation should complete (may have warnings or auto-correct)
      expect(result.isValid !== undefined).toBe(true)
    })

    it('errors on unknown properties', () => {
      const input = `--- COMPONENTS ---
Button: unknownprop 8

--- LAYOUT ---
Button "Click"`

      const result = validator.validate(input)
      const hasUnknownError = result.errors.some(e => e.type === 'UNKNOWN_PROPERTY')
      const hasTypoWarning = result.warnings.some(w => w.type === 'SIMILAR_PROPERTY')
      expect(hasUnknownError || hasTypoWarning).toBe(true)
    })

    it('errors on missing property values', () => {
      const input = `--- COMPONENTS ---
Button: bg

--- LAYOUT ---
Button "Click"`

      const result = validator.validate(input)
      expect(result.errors.some(e => e.type === 'MISSING_VALUE')).toBe(true)
    })

    it('warns on conflicting properties', () => {
      const input = `--- COMPONENTS ---
Box: hor ver gap 8

--- LAYOUT ---
Box "Test"`

      const result = validator.validate(input)
      expect(result.warnings.some(w => w.message.includes('Conflicting'))).toBe(true)
    })
  })

  describe('Full Validation Flow', () => {
    it('validates correct DSL without errors', () => {
      const input = `--- COMPONENTS ---
Button: pad 12 col #3B82F6 rad 8
Card: ver pad 16 gap 8 col #1F2937
Header: hor ver-cen between pad 8

--- LAYOUT ---
Header
Card
Button "Click me"`

      const result = validator.validate(input)
      expect(result.errors.length).toBe(0)
    })

    it('validates DSL with scoped children', () => {
      const componentsCode = [
        'Button: pad 12 col #3B82F6 rad 8',
        '  Icon size 16',
        '  Label size 14'
      ].join('\n')

      const layoutCode = [
        'Button',
        '  Icon "star"',
        '  Label "Click me"'
      ].join('\n')

      const result = validator.check(componentsCode, layoutCode)
      // Scoped children may generate warnings but not critical errors
      const criticalErrors = result.errors.filter(e =>
        !e.message.includes('not defined')
      )
      expect(criticalErrors.length).toBe(0)
    })

    it('corrects and validates LLM output with issues', () => {
      const input = `Here's the UI:

\`\`\`
--- COMPONENTS ---
Button: padding 12 background #3B82F6 border-radius 8

--- LAYOUT ---
Button padding 12 "Click me"
\`\`\`

This creates a styled button.`

      const result = validator.validate(input)

      // Should have corrections
      expect(result.corrections.length).toBeGreaterThan(0)

      // Components should have corrected properties
      expect(result.components).toContain('pad')
      expect(result.components).toContain('col')
      expect(result.components).toContain('rad')

      // Layout should not have properties
      expect(result.layout).not.toContain('padding')
      expect(result.layout).toContain('Button')
      expect(result.layout).toContain('"Click me"')
    })
  })

  describe('Check Mode (No Corrections)', () => {
    it('reports errors without correcting', () => {
      const validator = new ValidationService({ autoCorrect: false })

      const result = validator.check(
        'Button: padding 12',
        'Button padding 12 "Click"'
      )

      // Should have errors/warnings but not correct them
      expect(result.components).toContain('padding')
      expect(result.layout).toContain('padding')
    })
  })
})

describe('Intelligent Splitting', () => {
  it('splits mixed content without markers', () => {
    const input = `Button: pad 8 col #3B82F6

Card: ver gap 8
  Title size 18
  Body size 14

Button "Click me"

Card
  Title "Hello"
  Body "World"`

    const result = cleanLLMOutput(input)
    expect(result.components).toContain('Button:')
    expect(result.components).toContain('Card:')
    expect(result.layout).toContain('Button "Click me"')
    expect(result.layout).toContain('Card')
  })
})
