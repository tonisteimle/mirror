/**
 * Property Panel Utils Tests
 *
 * Tests for validation, HTML helpers, and token utilities.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateProperty,
  validateWithRule,
  applyValidationStyle,
  validateInput,
  parseNumericValue,
  parseSizeValue,
  parseColorValue,
  formatNumber,
  clamp,
  validateSpacingValue
} from '../../studio/panels/property/utils/validation'
import {
  escapeHtml,
  dataAttrs,
  classNames,
  html,
  raw,
  svgIcon,
  uniqueId,
  ICON_PATHS
} from '../../studio/panels/property/utils/html'
import {
  resolveColorToken,
  resolveSpacingToken,
  isTokenRef,
  resolveToken
} from '../../studio/panels/property/utils/tokens'
import type { SectionData } from '../../studio/panels/property/types'

// =============================================================================
// VALIDATION UTILS
// =============================================================================

describe('Validation Utils', () => {
  describe('validateProperty', () => {
    describe('numeric properties', () => {
      it('should accept integers', () => {
        expect(validateProperty('gap', '12').valid).toBe(true)
        expect(validateProperty('fs', '16').valid).toBe(true)
        expect(validateProperty('x', '100').valid).toBe(true)
      })

      it('should accept decimals', () => {
        expect(validateProperty('gap', '1.5').valid).toBe(true)
        expect(validateProperty('scale', '0.5').valid).toBe(true)
      })

      it('should accept token references', () => {
        expect(validateProperty('gap', '$spacing.md').valid).toBe(true)
        expect(validateProperty('fs', '$font.lg').valid).toBe(true)
      })

      it('should accept empty values', () => {
        expect(validateProperty('gap', '').valid).toBe(true)
        expect(validateProperty('gap', '  ').valid).toBe(true)
      })

      it('should reject invalid values', () => {
        expect(validateProperty('gap', 'abc').valid).toBe(false)
        expect(validateProperty('fs', 'large').valid).toBe(false)
      })
    })

    describe('size properties', () => {
      it('should accept numbers', () => {
        expect(validateProperty('width', '200').valid).toBe(true)
        expect(validateProperty('w', '100.5').valid).toBe(true)
      })

      it('should accept tokens', () => {
        expect(validateProperty('width', '$size.md').valid).toBe(true)
      })
    })

    describe('color properties', () => {
      it('should accept hex colors', () => {
        expect(validateProperty('bg', '#fff').valid).toBe(true)
        expect(validateProperty('bg', '#ffffff').valid).toBe(true)
        expect(validateProperty('col', '#2563ebff').valid).toBe(true)
      })

      it('should accept transparent', () => {
        expect(validateProperty('bg', 'transparent').valid).toBe(true)
      })

      it('should accept color tokens', () => {
        expect(validateProperty('bg', '$primary.bg').valid).toBe(true)
      })

      it('should accept empty values', () => {
        expect(validateProperty('bg', '').valid).toBe(true)
      })
    })

    describe('unknown properties', () => {
      it('should accept any value for unknown properties', () => {
        expect(validateProperty('unknown-prop', 'anything').valid).toBe(true)
        expect(validateProperty('custom', '###').valid).toBe(true)
      })
    })
  })

  describe('validateWithRule', () => {
    const numericRule = {
      pattern: /^(\$[\w.-]+|\d+(\.\d+)?|)$/,
      allowEmpty: true,
      message: 'Nur Zahlen oder $token erlaubt'
    }

    it('should validate against pattern', () => {
      expect(validateWithRule('42', numericRule).valid).toBe(true)
      expect(validateWithRule('abc', numericRule).valid).toBe(false)
    })

    it('should handle empty values based on allowEmpty', () => {
      expect(validateWithRule('', numericRule).valid).toBe(true)

      const strictRule = { ...numericRule, allowEmpty: false }
      expect(validateWithRule('', strictRule).valid).toBe(false)
    })

    it('should return error message on failure', () => {
      const result = validateWithRule('invalid', numericRule)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Nur Zahlen oder $token erlaubt')
    })
  })

  describe('applyValidationStyle', () => {
    let input: HTMLInputElement

    beforeEach(() => {
      input = document.createElement('input')
    })

    it('should add invalid class on error', () => {
      applyValidationStyle(input, { valid: false, message: 'Error' })
      expect(input.classList.contains('invalid')).toBe(true)
    })

    it('should remove invalid class on valid', () => {
      input.classList.add('invalid')
      applyValidationStyle(input, { valid: true })
      expect(input.classList.contains('invalid')).toBe(false)
    })

    it('should set title attribute with error message', () => {
      applyValidationStyle(input, { valid: false, message: 'Custom error' })
      expect(input.getAttribute('title')).toBe('Custom error')
    })

    it('should remove title on valid', () => {
      input.setAttribute('title', 'Previous error')
      applyValidationStyle(input, { valid: true })
      expect(input.getAttribute('title')).toBeNull()
    })
  })

  describe('validateInput', () => {
    let input: HTMLInputElement

    beforeEach(() => {
      input = document.createElement('input')
    })

    it('should validate and style in one call', () => {
      input.value = 'invalid!'
      const result = validateInput(input, 'gap')

      expect(result.valid).toBe(false)
      expect(input.classList.contains('invalid')).toBe(true)
    })

    it('should return valid for correct input', () => {
      input.value = '16'
      const result = validateInput(input, 'gap')

      expect(result.valid).toBe(true)
      expect(input.classList.contains('invalid')).toBe(false)
    })
  })

  describe('parseNumericValue', () => {
    it('should parse integers', () => {
      expect(parseNumericValue('42')).toBe(42)
    })

    it('should parse decimals', () => {
      expect(parseNumericValue('3.14')).toBe(3.14)
    })

    it('should return null for tokens', () => {
      expect(parseNumericValue('$spacing.md')).toBeNull()
    })

    it('should return null for empty values', () => {
      expect(parseNumericValue('')).toBeNull()
    })

    it('should return null for invalid values', () => {
      expect(parseNumericValue('abc')).toBeNull()
    })
  })

  describe('parseSizeValue', () => {
    it('should parse numbers', () => {
      const result = parseSizeValue('200')
      expect(result).toEqual({ type: 'number', value: 200 })
    })

    it('should parse keywords', () => {
      expect(parseSizeValue('full')).toEqual({ type: 'keyword', value: 'full' })
      expect(parseSizeValue('hug')).toEqual({ type: 'keyword', value: 'hug' })
      expect(parseSizeValue('auto')).toEqual({ type: 'keyword', value: 'auto' })
    })

    it('should handle case insensitivity', () => {
      expect(parseSizeValue('FULL')).toEqual({ type: 'keyword', value: 'full' })
      expect(parseSizeValue('HUG')).toEqual({ type: 'keyword', value: 'hug' })
    })

    it('should parse tokens', () => {
      expect(parseSizeValue('$size.md')).toEqual({ type: 'token', value: '$size.md' })
    })

    it('should return null for empty', () => {
      expect(parseSizeValue('')).toBeNull()
    })

    it('should return null for invalid', () => {
      expect(parseSizeValue('invalid')).toBeNull()
    })
  })

  describe('parseColorValue', () => {
    it('should parse hex colors', () => {
      expect(parseColorValue('#fff')).toEqual({ type: 'hex', value: '#fff' })
      expect(parseColorValue('#2563eb')).toEqual({ type: 'hex', value: '#2563eb' })
    })

    it('should parse transparent', () => {
      expect(parseColorValue('transparent')).toEqual({ type: 'transparent', value: 'transparent' })
    })

    it('should parse tokens', () => {
      expect(parseColorValue('$primary')).toEqual({ type: 'token', value: '$primary' })
    })

    it('should parse named colors', () => {
      expect(parseColorValue('white')).toEqual({ type: 'named', value: 'white' })
      expect(parseColorValue('black')).toEqual({ type: 'named', value: 'black' })
      expect(parseColorValue('red')).toEqual({ type: 'named', value: 'red' })
    })

    it('should handle case insensitivity for named colors', () => {
      expect(parseColorValue('WHITE')).toEqual({ type: 'named', value: 'white' })
      expect(parseColorValue('Red')).toEqual({ type: 'named', value: 'red' })
    })

    it('should return null for empty', () => {
      expect(parseColorValue('')).toBeNull()
    })

    it('should return null for invalid', () => {
      expect(parseColorValue('invalid-color')).toBeNull()
    })
  })

  describe('formatNumber', () => {
    it('should format integers without decimals', () => {
      expect(formatNumber(42)).toBe('42')
      expect(formatNumber(100)).toBe('100')
    })

    it('should format decimals with trailing zeros removed', () => {
      expect(formatNumber(3.14)).toBe('3.14')
      expect(formatNumber(2.50)).toBe('2.5')
      expect(formatNumber(1.00)).toBe('1')
    })

    it('should respect decimal precision', () => {
      expect(formatNumber(3.14159, 2)).toBe('3.14')
      expect(formatNumber(3.14159, 4)).toBe('3.1416')
    })
  })

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(50, 0, 100)).toBe(50)
    })

    it('should clamp to min when below', () => {
      expect(clamp(-10, 0, 100)).toBe(0)
    })

    it('should clamp to max when above', () => {
      expect(clamp(150, 0, 100)).toBe(100)
    })

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 100)).toBe(0)
      expect(clamp(100, 0, 100)).toBe(100)
    })
  })

  describe('validateSpacingValue', () => {
    it('should accept empty values', () => {
      expect(validateSpacingValue('').valid).toBe(true)
      expect(validateSpacingValue('  ').valid).toBe(true)
    })

    it('should accept single value', () => {
      expect(validateSpacingValue('16').valid).toBe(true)
    })

    it('should accept two values (vertical horizontal)', () => {
      expect(validateSpacingValue('10 20').valid).toBe(true)
    })

    it('should accept three values (top horizontal bottom)', () => {
      expect(validateSpacingValue('10 20 30').valid).toBe(true)
    })

    it('should accept four values (top right bottom left)', () => {
      expect(validateSpacingValue('10 20 30 40').valid).toBe(true)
    })

    it('should accept token references', () => {
      expect(validateSpacingValue('$spacing.md').valid).toBe(true)
    })

    it('should accept decimal values', () => {
      expect(validateSpacingValue('1.5 2.5').valid).toBe(true)
    })

    it('should reject more than 4 values', () => {
      const result = validateSpacingValue('1 2 3 4 5')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Max 4')
    })

    it('should reject non-numeric values', () => {
      const result = validateSpacingValue('auto')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Zahlen')
    })

    it('should reject mixed valid and invalid', () => {
      expect(validateSpacingValue('10 abc').valid).toBe(false)
    })
  })
})

// =============================================================================
// HTML UTILS
// =============================================================================

describe('HTML Utils', () => {
  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B')
    })

    it('should escape less than', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b')
    })

    it('should escape greater than', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b')
    })

    it('should escape double quotes', () => {
      expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;')
    })

    it('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#39;s')
    })

    it('should handle multiple special characters', () => {
      expect(escapeHtml('<script>"alert"</script>')).toBe('&lt;script&gt;&quot;alert&quot;&lt;/script&gt;')
    })

    it('should return empty string for null/undefined', () => {
      expect(escapeHtml('')).toBe('')
      expect(escapeHtml(null as any)).toBe('')
      expect(escapeHtml(undefined as any)).toBe('')
    })

    it('should pass through safe strings', () => {
      expect(escapeHtml('hello world')).toBe('hello world')
      expect(escapeHtml('12345')).toBe('12345')
    })
  })

  describe('dataAttrs', () => {
    it('should create data attributes from object', () => {
      const result = dataAttrs({ value: '10', prop: 'gap' })
      expect(result).toContain('data-value="10"')
      expect(result).toContain('data-prop="gap"')
    })

    it('should handle boolean true as valueless attribute', () => {
      const result = dataAttrs({ active: true })
      expect(result).toBe('data-active')
    })

    it('should filter out false/null/undefined values', () => {
      const result = dataAttrs({ keep: 'yes', remove: false, skip: null as any, ignore: undefined as any })
      expect(result).toContain('data-keep')
      expect(result).not.toContain('remove')
      expect(result).not.toContain('skip')
      expect(result).not.toContain('ignore')
    })

    it('should escape values', () => {
      const result = dataAttrs({ text: '<script>' })
      expect(result).toContain('&lt;script&gt;')
    })

    it('should handle numbers', () => {
      const result = dataAttrs({ count: 42 })
      expect(result).toBe('data-count="42"')
    })
  })

  describe('classNames', () => {
    it('should combine class names', () => {
      expect(classNames('a', 'b', 'c')).toBe('a b c')
    })

    it('should filter out falsy values', () => {
      expect(classNames('a', false, 'b', null, 'c', undefined)).toBe('a b c')
    })

    it('should handle empty input', () => {
      expect(classNames()).toBe('')
    })

    it('should handle all falsy input', () => {
      expect(classNames(false, null, undefined)).toBe('')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const isDisabled = false
      expect(classNames('btn', isActive && 'active', isDisabled && 'disabled')).toBe('btn active')
    })
  })

  describe('html template tag', () => {
    it('should escape interpolated values', () => {
      const userInput = '<script>alert("xss")</script>'
      const result = html`<div>${userInput}</div>`
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })

    it('should handle null/undefined values', () => {
      expect(html`<div>${null}</div>`).toBe('<div></div>')
      expect(html`<div>${undefined}</div>`).toBe('<div></div>')
    })

    it('should not escape raw() marked content', () => {
      const trusted = raw('<span>safe</span>')
      const result = html`<div>${trusted}</div>`
      expect(result).toContain('<span>safe</span>')
    })
  })

  describe('raw', () => {
    it('should mark string as raw HTML', () => {
      const result = raw('<b>bold</b>')
      expect(result).toEqual({ rawHtml: '<b>bold</b>' })
    })
  })

  describe('svgIcon', () => {
    it('should create SVG element with path', () => {
      const icon = svgIcon('<path d="M0 0"/>')
      expect(icon).toContain('<svg')
      expect(icon).toContain('<path d="M0 0"/>')
      expect(icon).toContain('</svg>')
    })

    it('should apply custom dimensions', () => {
      const icon = svgIcon('<path/>', { width: 24, height: 24 })
      expect(icon).toContain('width="24"')
      expect(icon).toContain('height="24"')
    })

    it('should apply custom class', () => {
      const icon = svgIcon('<path/>', { className: 'my-icon' })
      expect(icon).toContain('class="my-icon"')
    })

    it('should apply custom stroke width', () => {
      const icon = svgIcon('<path/>', { strokeWidth: 3 })
      expect(icon).toContain('stroke-width="3"')
    })
  })

  describe('uniqueId', () => {
    it('should generate unique IDs', () => {
      const id1 = uniqueId()
      const id2 = uniqueId()
      expect(id1).not.toBe(id2)
    })

    it('should use prefix', () => {
      const id = uniqueId('test')
      expect(id).toMatch(/^test-\d+$/)
    })

    it('should use default prefix', () => {
      const id = uniqueId()
      expect(id).toMatch(/^pp-\d+$/)
    })
  })

  describe('ICON_PATHS', () => {
    it('should contain common icon paths', () => {
      expect(ICON_PATHS.chevronDown).toBeDefined()
      expect(ICON_PATHS.chevronUp).toBeDefined()
      expect(ICON_PATHS.plus).toBeDefined()
      expect(ICON_PATHS.check).toBeDefined()
      expect(ICON_PATHS.x).toBeDefined()
    })

    it('should contain valid SVG path elements', () => {
      expect(ICON_PATHS.check).toContain('polyline')
      expect(ICON_PATHS.plus).toContain('line')
    })
  })
})

// =============================================================================
// TOKEN UTILS
// =============================================================================

describe('Token Utils', () => {
  const createSectionData = (colorTokens: any[] = [], spacingTokens: any[] = []): SectionData => ({
    colorTokens,
    spacingTokens
  })

  describe('resolveColorToken', () => {
    it('should resolve color token to value', () => {
      const data = createSectionData([
        { name: 'primary', value: '#2563eb' },
        { name: 'danger', value: '#ef4444' }
      ])

      expect(resolveColorToken('$primary', data)).toBe('#2563eb')
      expect(resolveColorToken('$danger', data)).toBe('#ef4444')
    })

    it('should return empty string for unknown token', () => {
      const data = createSectionData([{ name: 'primary', value: '#2563eb' }])
      expect(resolveColorToken('$unknown', data)).toBe('')
    })

    it('should handle missing colorTokens', () => {
      const data = createSectionData()
      expect(resolveColorToken('$primary', data)).toBe('')
    })

    it('should handle token without $ prefix in data', () => {
      const data = createSectionData([{ name: 'primary', value: '#2563eb' }])
      // Token ref has $, data name doesn't
      expect(resolveColorToken('$primary', data)).toBe('#2563eb')
    })
  })

  describe('resolveSpacingToken', () => {
    it('should resolve spacing token to value', () => {
      const data = createSectionData([], [
        { name: 'sm', fullName: 'sm.pad', value: '4' },
        { name: 'md', fullName: 'md.pad', value: '8' }
      ])

      expect(resolveSpacingToken('$sm.pad', data)).toBe('4')
      expect(resolveSpacingToken('$md.pad', data)).toBe('8')
    })

    it('should return empty string for unknown token', () => {
      const data = createSectionData([], [{ name: 'sm', fullName: 'sm.pad', value: '4' }])
      expect(resolveSpacingToken('$lg.pad', data)).toBe('')
    })

    it('should handle missing spacingTokens', () => {
      const data = createSectionData()
      expect(resolveSpacingToken('$sm.pad', data)).toBe('')
    })
  })

  describe('isTokenRef', () => {
    it('should return true for token references', () => {
      expect(isTokenRef('$primary')).toBe(true)
      expect(isTokenRef('$spacing.md')).toBe(true)
      expect(isTokenRef('$a')).toBe(true)
    })

    it('should return false for non-token values', () => {
      expect(isTokenRef('#fff')).toBe(false)
      expect(isTokenRef('16')).toBe(false)
      expect(isTokenRef('full')).toBe(false)
      expect(isTokenRef('')).toBe(false)
    })
  })

  describe('resolveToken', () => {
    it('should resolve color tokens first', () => {
      const data = createSectionData(
        [{ name: 'primary', value: '#2563eb' }],
        [{ name: 'primary', fullName: 'primary.pad', value: '16' }]
      )

      // Color takes precedence
      expect(resolveToken('$primary', data)).toBe('#2563eb')
    })

    it('should fall back to spacing tokens', () => {
      const data = createSectionData(
        [],
        [{ name: 'sm', fullName: 'sm.pad', value: '4' }]
      )

      expect(resolveToken('$sm.pad', data)).toBe('4')
    })

    it('should return empty string if not found', () => {
      const data = createSectionData()
      expect(resolveToken('$unknown', data)).toBe('')
    })
  })
})
