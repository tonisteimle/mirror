/**
 * Unit Tests für useEditorTriggers
 *
 * Testet die Picker-Typ-Zuordnung für verschiedene Komponenten.
 */
import { describe, it, expect } from 'vitest'
import { getPickerForType } from '../../hooks/useEditorTriggers'

describe('getPickerForType', () => {
  describe('Button picker', () => {
    it('returns "button" for Button', () => {
      expect(getPickerForType('Button')).toBe('button')
    })
  })

  describe('Text picker (Font only)', () => {
    it('returns "text" for Text', () => {
      expect(getPickerForType('Text')).toBe('text')
    })

    it('returns "text" for Link', () => {
      expect(getPickerForType('Link')).toBe('text')
    })
  })

  describe('Icon picker', () => {
    it('returns "icon" for Icon', () => {
      expect(getPickerForType('Icon')).toBe('icon')
    })
  })

  describe('Input picker', () => {
    it('returns "input" for Input', () => {
      expect(getPickerForType('Input')).toBe('input')
    })

    it('returns "input" for Textarea', () => {
      expect(getPickerForType('Textarea')).toBe('input')
    })
  })

  describe('Image picker', () => {
    it('returns "image" for Image', () => {
      expect(getPickerForType('Image')).toBe('image')
    })
  })

  describe('Default picker (Layout + Border)', () => {
    it('returns "default" for Box', () => {
      expect(getPickerForType('Box')).toBe('default')
    })

    it('returns "default" for Container', () => {
      expect(getPickerForType('Container')).toBe('default')
    })

    it('returns "default" for Row', () => {
      expect(getPickerForType('Row')).toBe('default')
    })

    it('returns "default" for Col', () => {
      expect(getPickerForType('Col')).toBe('default')
    })

    it('returns "default" for Column', () => {
      expect(getPickerForType('Column')).toBe('default')
    })

    it('returns "default" for Stack', () => {
      expect(getPickerForType('Stack')).toBe('default')
    })

    it('returns "default" for View', () => {
      expect(getPickerForType('View')).toBe('default')
    })

    it('returns "default" for Group', () => {
      expect(getPickerForType('Group')).toBe('default')
    })

    it('returns "default" for Wrapper', () => {
      expect(getPickerForType('Wrapper')).toBe('default')
    })
  })

  describe('Unknown types', () => {
    it('returns null for custom component names', () => {
      expect(getPickerForType('MyComponent')).toBe(null)
    })

    it('returns null for Card (custom definition)', () => {
      expect(getPickerForType('Card')).toBe(null)
    })

    it('returns null for Header', () => {
      expect(getPickerForType('Header')).toBe(null)
    })

    it('returns null for empty string', () => {
      expect(getPickerForType('')).toBe(null)
    })
  })
})
