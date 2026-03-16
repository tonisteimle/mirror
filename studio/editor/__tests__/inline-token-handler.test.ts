import { describe, it, expect } from 'vitest'
import { extractInlineToken, buildTokenDefinition, escapeRegex } from '../inline-token-handler'

describe('extractInlineToken', () => {
  it('extracts simple color token', () => {
    const result = extractInlineToken('Card bg $surface: #333')
    expect(result).toEqual({
      tokenName: 'surface',
      tokenValue: '#333',
      propertyName: 'bg',
      fullMatch: '$surface: #333',
      replacement: '$surface',
    })
  })

  it('extracts token with hex color value', () => {
    const result = extractInlineToken('Button bg $primary: #3B82F6')
    expect(result).toEqual({
      tokenName: 'primary',
      tokenValue: '#3B82F6',
      propertyName: 'bg',
      fullMatch: '$primary: #3B82F6',
      replacement: '$primary',
    })
  })

  it('extracts numeric token', () => {
    const result = extractInlineToken('Button rad $m: 4')
    expect(result).toEqual({
      tokenName: 'm',
      tokenValue: '4',
      propertyName: 'rad',
      fullMatch: '$m: 4',
      replacement: '$m',
    })
  })

  it('extracts token with dots in name', () => {
    const result = extractInlineToken('Text col $text.muted: #888')
    expect(result).toEqual({
      tokenName: 'text.muted',
      tokenValue: '#888',
      propertyName: 'col',
      fullMatch: '$text.muted: #888',
      replacement: '$text.muted',
    })
  })

  it('extracts token with dashes in name', () => {
    const result = extractInlineToken('Box bg $bg-dark: #1a1a1a')
    expect(result).toEqual({
      tokenName: 'bg-dark',
      tokenValue: '#1a1a1a',
      propertyName: 'bg',
      fullMatch: '$bg-dark: #1a1a1a',
      replacement: '$bg-dark',
    })
  })

  it('extracts token with underscores in name', () => {
    const result = extractInlineToken('Box pad $padding_sm: 8')
    expect(result).toEqual({
      tokenName: 'padding_sm',
      tokenValue: '8',
      propertyName: 'pad',
      fullMatch: '$padding_sm: 8',
      replacement: '$padding_sm',
    })
  })

  it('extracts token with extra whitespace', () => {
    const result = extractInlineToken('Card bg $surface:   #333  ')
    expect(result).toEqual({
      tokenName: 'surface',
      tokenValue: '#333',
      propertyName: 'bg',
      fullMatch: '$surface:   #333  ',
      replacement: '$surface',
    })
  })

  it('returns null for regular token reference', () => {
    const result = extractInlineToken('Card bg $surface')
    expect(result).toBeNull()
  })

  it('returns null for line without token', () => {
    const result = extractInlineToken('Card bg #333')
    expect(result).toBeNull()
  })

  it('returns null for empty line', () => {
    const result = extractInlineToken('')
    expect(result).toBeNull()
  })

  it('returns null for token starting with number', () => {
    const result = extractInlineToken('Card bg $123abc: #333')
    expect(result).toBeNull()
  })

  it('returns null if value is empty', () => {
    const result = extractInlineToken('Card bg $surface:')
    expect(result).toBeNull()
  })

  it('handles complex nested token names', () => {
    const result = extractInlineToken('Button pad $spacing.button.md: 12')
    expect(result).toEqual({
      tokenName: 'spacing.button.md',
      tokenValue: '12',
      propertyName: 'pad',
      fullMatch: '$spacing.button.md: 12',
      replacement: '$spacing.button.md',
    })
  })
})

describe('buildTokenDefinition', () => {
  it('builds correct token definition', () => {
    expect(buildTokenDefinition('surface', '#333')).toBe('$surface: #333')
  })

  it('builds definition for numeric value', () => {
    expect(buildTokenDefinition('spacing.md', '8')).toBe('$spacing.md: 8')
  })
})

describe('escapeRegex', () => {
  it('escapes special regex characters', () => {
    expect(escapeRegex('text.muted')).toBe('text\\.muted')
    expect(escapeRegex('a+b*c?')).toBe('a\\+b\\*c\\?')
    expect(escapeRegex('(group)')).toBe('\\(group\\)')
    expect(escapeRegex('a[b]c')).toBe('a\\[b\\]c')
  })

  it('leaves normal characters unchanged', () => {
    expect(escapeRegex('simple')).toBe('simple')
    expect(escapeRegex('with-dash')).toBe('with-dash')
    expect(escapeRegex('with_underscore')).toBe('with_underscore')
  })
})
