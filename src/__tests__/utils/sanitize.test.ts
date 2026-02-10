/**
 * Sanitization Utilities Tests
 *
 * Tests for XSS prevention and input sanitization:
 * - URL validation and sanitization
 * - Text content sanitization
 * - Placeholder sanitization
 * - Component name validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sanitizeHref,
  sanitizeTextContent,
  sanitizePlaceholder,
  isValidComponentName,
} from '../../utils/sanitize'

// Mock the logger to prevent actual logging during tests
vi.mock('../../services/logger', () => ({
  logger: {
    security: {
      warn: vi.fn(),
    },
  },
}))

describe('sanitize', () => {
  describe('sanitizeHref', () => {
    describe('valid URLs', () => {
      it('allows https URLs', () => {
        expect(sanitizeHref('https://example.com')).toBe('https://example.com')
      })

      it('allows http URLs', () => {
        expect(sanitizeHref('http://example.com')).toBe('http://example.com')
      })

      it('allows mailto URLs', () => {
        expect(sanitizeHref('mailto:test@example.com')).toBe('mailto:test@example.com')
      })

      it('allows tel URLs', () => {
        expect(sanitizeHref('tel:+1234567890')).toBe('tel:+1234567890')
      })

      it('allows hash anchors', () => {
        expect(sanitizeHref('#section')).toBe('#section')
      })

      it('allows relative URLs starting with /', () => {
        expect(sanitizeHref('/path/to/page')).toBe('/path/to/page')
      })

      it('allows relative URLs starting with ./', () => {
        expect(sanitizeHref('./path/to/page')).toBe('./path/to/page')
      })

      it('allows relative URLs starting with ../', () => {
        expect(sanitizeHref('../path/to/page')).toBe('../path/to/page')
      })

      it('allows URLs with query parameters', () => {
        expect(sanitizeHref('https://example.com?query=value')).toBe('https://example.com?query=value')
      })

      it('allows URLs with fragments', () => {
        expect(sanitizeHref('https://example.com#section')).toBe('https://example.com#section')
      })

      it('preserves original casing', () => {
        expect(sanitizeHref('HTTPS://EXAMPLE.COM')).toBe('HTTPS://EXAMPLE.COM')
      })
    })

    describe('dangerous URLs', () => {
      it('blocks javascript: protocol', () => {
        expect(sanitizeHref('javascript:alert(1)')).toBe('#')
      })

      it('blocks javascript: with mixed case', () => {
        expect(sanitizeHref('JAVASCRIPT:alert(1)')).toBe('#')
      })

      it('blocks javascript: with whitespace', () => {
        expect(sanitizeHref('  javascript:alert(1)')).toBe('#')
      })

      it('blocks vbscript: protocol', () => {
        expect(sanitizeHref('vbscript:msgbox(1)')).toBe('#')
      })

      it('blocks data:text/html', () => {
        expect(sanitizeHref('data:text/html,<script>alert(1)</script>')).toBe('#')
      })

      it('blocks data:application/xhtml+xml', () => {
        expect(sanitizeHref('data:application/xhtml+xml,<script>alert(1)</script>')).toBe('#')
      })
    })

    describe('unknown protocols', () => {
      it('blocks ftp: protocol', () => {
        expect(sanitizeHref('ftp://example.com')).toBe('#')
      })

      it('blocks file: protocol', () => {
        expect(sanitizeHref('file:///etc/passwd')).toBe('#')
      })

      it('blocks custom protocols', () => {
        expect(sanitizeHref('custom://something')).toBe('#')
      })
    })

    describe('edge cases', () => {
      it('returns # for undefined input', () => {
        expect(sanitizeHref(undefined)).toBe('#')
      })

      it('returns # for null input', () => {
        expect(sanitizeHref(null as unknown as string)).toBe('#')
      })

      it('returns # for empty string', () => {
        expect(sanitizeHref('')).toBe('#')
      })

      it('returns # for non-string input', () => {
        expect(sanitizeHref(123 as unknown as string)).toBe('#')
      })

      it('returns # for object input', () => {
        expect(sanitizeHref({} as unknown as string)).toBe('#')
      })

      it('allows safe-looking relative URLs', () => {
        expect(sanitizeHref('page.html')).toBe('page.html')
      })

      it('allows URLs with special characters in path', () => {
        expect(sanitizeHref('https://example.com/path/to/file-name_test')).toBe('https://example.com/path/to/file-name_test')
      })
    })
  })

  describe('sanitizeTextContent', () => {
    describe('normal text', () => {
      it('returns normal text unchanged', () => {
        expect(sanitizeTextContent('Hello, World!')).toBe('Hello, World!')
      })

      it('preserves HTML entities', () => {
        expect(sanitizeTextContent('&lt;script&gt;')).toBe('&lt;script&gt;')
      })

      it('preserves unicode characters', () => {
        expect(sanitizeTextContent('Hello 世界 🌍')).toBe('Hello 世界 🌍')
      })

      it('preserves whitespace', () => {
        expect(sanitizeTextContent('  Hello  World  ')).toBe('  Hello  World  ')
      })

      it('preserves newlines and tabs', () => {
        expect(sanitizeTextContent('Hello\nWorld\tTest')).toBe('Hello\nWorld\tTest')
      })
    })

    describe('dangerous content', () => {
      it('removes null bytes', () => {
        expect(sanitizeTextContent('Hello\0World')).toBe('HelloWorld')
      })

      it('removes multiple null bytes', () => {
        expect(sanitizeTextContent('He\0ll\0o')).toBe('Hello')
      })

      it('removes line separator (U+2028)', () => {
        expect(sanitizeTextContent('Hello\u2028World')).toBe('HelloWorld')
      })

      it('removes paragraph separator (U+2029)', () => {
        expect(sanitizeTextContent('Hello\u2029World')).toBe('HelloWorld')
      })

      it('removes multiple dangerous characters', () => {
        expect(sanitizeTextContent('A\0B\u2028C\u2029D')).toBe('ABCD')
      })
    })

    describe('edge cases', () => {
      it('returns empty string for undefined', () => {
        expect(sanitizeTextContent(undefined)).toBe('')
      })

      it('returns empty string for null', () => {
        expect(sanitizeTextContent(null as unknown as string)).toBe('')
      })

      it('returns empty string for empty string', () => {
        expect(sanitizeTextContent('')).toBe('')
      })

      it('returns empty string for non-string', () => {
        expect(sanitizeTextContent(123 as unknown as string)).toBe('')
      })
    })
  })

  describe('sanitizePlaceholder', () => {
    describe('normal placeholders', () => {
      it('returns normal text unchanged', () => {
        expect(sanitizePlaceholder('Enter your email')).toBe('Enter your email')
      })

      it('preserves unicode characters', () => {
        expect(sanitizePlaceholder('输入电子邮件')).toBe('输入电子邮件')
      })

      it('trims whitespace', () => {
        expect(sanitizePlaceholder('  Enter email  ')).toBe('Enter email')
      })
    })

    describe('control characters', () => {
      it('replaces newlines with space', () => {
        expect(sanitizePlaceholder('Enter\nyour\nemail')).toBe('Enter your email')
      })

      it('replaces carriage return with space', () => {
        expect(sanitizePlaceholder('Enter\ryour\remail')).toBe('Enter your email')
      })

      it('replaces tabs with space', () => {
        expect(sanitizePlaceholder('Enter\tyour\temail')).toBe('Enter your email')
      })

      it('removes null byte', () => {
        expect(sanitizePlaceholder('Enter\x00email')).toBe('Enteremail')
      })

      it('removes control characters (0x01-0x1F)', () => {
        expect(sanitizePlaceholder('Enter\x01\x02\x1Femail')).toBe('Enteremail')
      })

      it('removes DEL character (0x7F)', () => {
        expect(sanitizePlaceholder('Enter\x7Femail')).toBe('Enteremail')
      })
    })

    describe('edge cases', () => {
      it('returns empty string for undefined', () => {
        expect(sanitizePlaceholder(undefined)).toBe('')
      })

      it('returns empty string for null', () => {
        expect(sanitizePlaceholder(null as unknown as string)).toBe('')
      })

      it('returns empty string for empty string', () => {
        expect(sanitizePlaceholder('')).toBe('')
      })

      it('returns empty string for non-string', () => {
        expect(sanitizePlaceholder(123 as unknown as string)).toBe('')
      })

      it('returns empty string for whitespace-only', () => {
        expect(sanitizePlaceholder('   ')).toBe('')
      })
    })
  })

  describe('isValidComponentName', () => {
    describe('valid names', () => {
      it('accepts PascalCase names', () => {
        expect(isValidComponentName('Button')).toBe(true)
      })

      it('accepts multi-word PascalCase names', () => {
        expect(isValidComponentName('SubmitButton')).toBe(true)
      })

      it('accepts names with numbers', () => {
        expect(isValidComponentName('Button2')).toBe(true)
      })

      it('accepts names with underscores', () => {
        expect(isValidComponentName('My_Button')).toBe(true)
      })

      it('accepts single letter names', () => {
        expect(isValidComponentName('A')).toBe(true)
      })
    })

    describe('invalid names', () => {
      it('rejects lowercase first letter', () => {
        expect(isValidComponentName('button')).toBe(false)
      })

      it('rejects names starting with numbers', () => {
        expect(isValidComponentName('1Button')).toBe(false)
      })

      it('rejects names starting with underscore', () => {
        expect(isValidComponentName('_Button')).toBe(false)
      })

      it('rejects names with hyphens', () => {
        expect(isValidComponentName('My-Button')).toBe(false)
      })

      it('rejects names with spaces', () => {
        expect(isValidComponentName('My Button')).toBe(false)
      })

      it('rejects names with special characters', () => {
        expect(isValidComponentName('Button!')).toBe(false)
        expect(isValidComponentName('Button@')).toBe(false)
        expect(isValidComponentName('Button$')).toBe(false)
      })

      it('rejects names with dots', () => {
        expect(isValidComponentName('My.Button')).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('rejects undefined', () => {
        expect(isValidComponentName(undefined as unknown as string)).toBe(false)
      })

      it('rejects null', () => {
        expect(isValidComponentName(null as unknown as string)).toBe(false)
      })

      it('rejects empty string', () => {
        expect(isValidComponentName('')).toBe(false)
      })

      it('rejects non-string', () => {
        expect(isValidComponentName(123 as unknown as string)).toBe(false)
      })

      it('rejects object', () => {
        expect(isValidComponentName({} as unknown as string)).toBe(false)
      })

      it('rejects array', () => {
        expect(isValidComponentName([] as unknown as string)).toBe(false)
      })
    })
  })
})
