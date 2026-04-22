/**
 * Input Mask Tests
 *
 * Tests for the input mask formatting functionality.
 */

import { describe, it, expect } from 'vitest'
import { formatWithMask, getRawValue } from '../../compiler/runtime/input-mask'

describe('Input Mask', () => {
  describe('formatWithMask', () => {
    it('formats AHV number correctly', () => {
      expect(formatWithMask('7561234567890', '###.####.####.##')).toBe('756.1234.5678.90')
    })

    it('formats partial AHV number', () => {
      expect(formatWithMask('756123', '###.####.####.##')).toBe('756.123')
    })

    it('formats currency correctly', () => {
      expect(formatWithMask('1234567', "##'###.##")).toBe("12'345.67")
    })

    it('formats phone number correctly', () => {
      expect(formatWithMask('0791234567', '(###) ###-####')).toBe('(079) 123-4567')
    })

    it('formats date correctly', () => {
      expect(formatWithMask('20240115', '####-##-##')).toBe('2024-01-15')
    })

    it('handles empty value', () => {
      expect(formatWithMask('', '###-####')).toBe('')
    })

    it('strips non-alphanumeric characters from input', () => {
      expect(formatWithMask('756.1234.5678.90', '###.####.####.##')).toBe('756.1234.5678.90')
    })

    it('handles letter patterns', () => {
      expect(formatWithMask('ABC123', 'AAA-###')).toBe('ABC-123')
    })

    it('handles alphanumeric patterns', () => {
      expect(formatWithMask('A1B2C3', '***-***')).toBe('A1B-2C3')
    })

    it('ignores invalid characters for digit patterns', () => {
      expect(formatWithMask('12ABC34', '##-##')).toBe('12-34')
    })

    it('ignores invalid characters for letter patterns', () => {
      expect(formatWithMask('A1B2C', 'AAA')).toBe('ABC')
    })
  })

  describe('getRawValue', () => {
    it('extracts raw AHV number', () => {
      expect(getRawValue('756.1234.5678.90', '###.####.####.##')).toBe('7561234567890')
    })

    it('extracts raw phone number', () => {
      expect(getRawValue('(079) 123-4567', '(###) ###-####')).toBe('0791234567')
    })

    it('extracts raw date', () => {
      expect(getRawValue('2024-01-15', '####-##-##')).toBe('20240115')
    })

    it('handles partial input', () => {
      expect(getRawValue('756.12', '###.####.####.##')).toBe('75612')
    })

    it('handles empty value', () => {
      expect(getRawValue('', '###-####')).toBe('')
    })
  })
})
