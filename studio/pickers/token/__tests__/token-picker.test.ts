/**
 * TokenPicker Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  TokenPicker,
  createTokenPicker,
  parseTokens,
  getTokenTypesForProperty,
  type TokenDefinition,
  type TokenContext,
} from '../index'

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

describe('TokenPicker', () => {
  let picker: TokenPicker
  let onSelect: ReturnType<typeof vi.fn>
  let anchor: HTMLElement
  let sampleTokens: TokenDefinition[]

  beforeEach(() => {
    document.body.innerHTML = ''
    anchor = document.createElement('button')
    document.body.appendChild(anchor)

    onSelect = vi.fn()

    anchor.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      bottom: 120,
      left: 100,
      right: 200,
      width: 100,
      height: 20,
    })

    sampleTokens = [
      { name: '$primary.bg', value: '#007bff', type: 'color', category: 'primary' },
      { name: '$primary.col', value: '#ffffff', type: 'color', category: 'primary' },
      { name: '$secondary.bg', value: '#6c757d', type: 'color', category: 'secondary' },
      { name: '$base.pad', value: '16', type: 'spacing', category: 'base' },
      { name: '$base.gap', value: '8', type: 'spacing', category: 'base' },
      { name: '$text.size', value: '14', type: 'size', category: 'text' },
    ]
  })

  afterEach(() => {
    picker?.destroy()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should create token picker with tokens', () => {
      picker = new TokenPicker({ tokens: sampleTokens }, { onSelect })
      expect(picker).toBeDefined()
    })

    it('should create with empty tokens', () => {
      picker = new TokenPicker({ tokens: [] }, { onSelect })
      expect(picker.getFilteredTokens()).toEqual([])
    })

    it('should use factory function', () => {
      picker = createTokenPicker({ tokens: sampleTokens }, { onSelect })
      expect(picker).toBeInstanceOf(TokenPicker)
    })

    it('should set default options', () => {
      picker = new TokenPicker({ tokens: sampleTokens }, { onSelect })
      expect(picker.getFilteredTokens()).toEqual(sampleTokens)
    })
  })

  describe('render()', () => {
    beforeEach(() => {
      picker = new TokenPicker(
        { tokens: sampleTokens, animate: false },
        { onSelect }
      )
    })

    it('should render picker container', () => {
      picker.show(anchor)
      expect(document.querySelector('.token-picker')).toBeTruthy()
    })

    it('should render search input', () => {
      picker.show(anchor)
      expect(document.querySelector('.token-picker-search-input')).toBeTruthy()
    })

    it('should render token list', () => {
      picker.show(anchor)
      expect(document.querySelector('.token-picker-list')).toBeTruthy()
    })

    it('should render token items', () => {
      picker.show(anchor)
      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(sampleTokens.length)
    })

    it('should render grouped by category', () => {
      picker.show(anchor)
      const groups = document.querySelectorAll('.token-picker-group')
      expect(groups.length).toBeGreaterThan(0)
    })

    it('should render without search when disabled', () => {
      picker = new TokenPicker(
        { tokens: sampleTokens, searchable: false, animate: false },
        { onSelect }
      )
      picker.show(anchor)

      expect(document.querySelector('.token-picker-search-input')).toBeFalsy()
    })

    it('should render flat list when grouping disabled', () => {
      picker = new TokenPicker(
        { tokens: sampleTokens, groupByCategory: false, animate: false },
        { onSelect }
      )
      picker.show(anchor)

      const groups = document.querySelectorAll('.token-picker-group')
      expect(groups.length).toBe(0)
    })
  })

  describe('Token items', () => {
    beforeEach(() => {
      picker = new TokenPicker(
        { tokens: sampleTokens, animate: false },
        { onSelect }
      )
    })

    it('should show token name', () => {
      picker.show(anchor)
      const names = document.querySelectorAll('.token-picker-name')
      expect(names[0].textContent).toBe('$primary.bg')
    })

    it('should show token value', () => {
      picker.show(anchor)
      const values = document.querySelectorAll('.token-picker-value')
      expect(values[0].textContent).toBe('#007bff')
    })

    it('should show color preview for color tokens', () => {
      picker.show(anchor)
      const previews = document.querySelectorAll('.token-picker-preview')
      expect(previews.length).toBeGreaterThan(0)
    })

    it('should set data-token attribute', () => {
      picker.show(anchor)
      const item = document.querySelector('.token-picker-item') as HTMLElement
      expect(item.getAttribute('data-token')).toBe('$primary.bg')
    })

    it('should set role attribute', () => {
      picker.show(anchor)
      const item = document.querySelector('.token-picker-item') as HTMLElement
      expect(item.getAttribute('role')).toBe('option')
    })
  })

  describe('Token selection', () => {
    beforeEach(() => {
      picker = new TokenPicker(
        { tokens: sampleTokens, animate: false },
        { onSelect }
      )
    })

    it('should call onSelect on item click', () => {
      picker.show(anchor)
      const item = document.querySelector('.token-picker-item') as HTMLElement
      item.click()

      expect(onSelect).toHaveBeenCalledWith('$primary.bg')
    })

    it('should close picker after selection (default)', () => {
      picker.show(anchor)
      const item = document.querySelector('.token-picker-item') as HTMLElement
      item.click()

      expect(picker.getIsOpen()).toBe(false)
    })
  })

  describe('Search', () => {
    beforeEach(() => {
      picker = new TokenPicker(
        { tokens: sampleTokens, animate: false },
        { onSelect }
      )
    })

    it('should filter tokens by name', () => {
      picker.show(anchor)
      picker.search('primary')

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(2) // primary.bg and primary.col
    })

    it('should filter tokens by value', () => {
      picker.show(anchor)
      picker.search('#007')

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(1)
    })

    it('should filter tokens by category', () => {
      picker.show(anchor)
      picker.search('secondary')

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(1)
    })

    it('should show empty message when no matches', () => {
      picker.show(anchor)
      picker.search('nonexistent')

      const empty = document.querySelector('.token-picker-empty')
      expect(empty).toBeTruthy()
      expect(empty?.textContent).toBe('No matching tokens')
    })

    it('should be case insensitive', () => {
      picker.show(anchor)
      picker.search('PRIMARY')

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(2)
    })

    it('should reset filter', () => {
      picker.show(anchor)
      picker.search('primary')
      picker.resetFilter()

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(sampleTokens.length)
    })

    it('should update via input', () => {
      picker.show(anchor)
      const input = document.querySelector('.token-picker-search-input') as HTMLInputElement
      input.value = 'primary'
      input.dispatchEvent(new Event('input'))

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(2)
    })
  })

  describe('Context filtering', () => {
    beforeEach(() => {
      picker = new TokenPicker(
        { tokens: sampleTokens, animate: false },
        { onSelect }
      )
    })

    it('should filter by context allowed types', () => {
      const context: TokenContext = {
        property: 'bg',
        allowedTypes: ['color']
      }
      picker = new TokenPicker(
        { tokens: sampleTokens, context, animate: false },
        { onSelect }
      )
      picker.show(anchor)

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(3) // Only color tokens
    })

    it('should set context after creation', () => {
      picker.show(anchor)
      picker.setContext({ property: 'pad', allowedTypes: ['spacing'] })

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(2) // Only spacing tokens
    })

    it('should clear context', () => {
      picker = new TokenPicker(
        { tokens: sampleTokens, context: { property: 'bg', allowedTypes: ['color'] }, animate: false },
        { onSelect }
      )
      picker.show(anchor)
      picker.clearContext()

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(sampleTokens.length)
    })
  })

  describe('setValue/getValue', () => {
    it('should return empty string by default', () => {
      picker = new TokenPicker({ tokens: sampleTokens }, { onSelect })
      expect(picker.getValue()).toBe('')
    })

    it('should accept token name', () => {
      picker = new TokenPicker({ tokens: sampleTokens }, { onSelect })
      picker.setValue('$primary.bg')
      // No error thrown
    })
  })

  describe('setTokens', () => {
    it('should update tokens list', () => {
      picker = new TokenPicker(
        { tokens: sampleTokens, animate: false },
        { onSelect }
      )
      picker.show(anchor)

      const newTokens: TokenDefinition[] = [
        { name: '$new.token', value: '#123456', type: 'color' }
      ]
      picker.setTokens(newTokens)

      const items = document.querySelectorAll('.token-picker-item')
      expect(items.length).toBe(1)
    })
  })

  describe('Empty state', () => {
    it('should show empty message with no tokens', () => {
      picker = new TokenPicker(
        { tokens: [], animate: false },
        { onSelect }
      )
      picker.show(anchor)

      const empty = document.querySelector('.token-picker-empty')
      expect(empty).toBeTruthy()
      expect(empty?.textContent).toBe('No tokens available')
    })
  })

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      picker = new TokenPicker(
        { tokens: sampleTokens, animate: false },
        { onSelect }
      )
    })

    it('should navigate with ArrowDown from search', () => {
      picker.show(anchor)
      const input = document.querySelector('.token-picker-search-input') as HTMLInputElement
      input.focus()

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      input.dispatchEvent(event)

      // Should focus first token
      expect(document.activeElement?.classList.contains('token-picker-item')).toBe(true)
    })

    it('should select on Enter', () => {
      picker.show(anchor)

      // Focus first item manually
      const item = document.querySelector('.token-picker-item') as HTMLElement
      item.focus()

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      document.dispatchEvent(event)

      expect(onSelect).toHaveBeenCalled()
    })
  })
})

describe('parseTokens', () => {
  it('should parse simple token definition', () => {
    const source = '$primary.bg: #007bff'
    const tokens = parseTokens(source)

    expect(tokens).toHaveLength(1)
    expect(tokens[0].name).toBe('$primary.bg')
    expect(tokens[0].value).toBe('#007bff')
    expect(tokens[0].type).toBe('color')
    expect(tokens[0].category).toBe('primary')
  })

  it('should parse multiple tokens', () => {
    const source = `
$primary.bg: #007bff
$primary.col: #ffffff
$base.pad: 16
    `
    const tokens = parseTokens(source)

    expect(tokens).toHaveLength(3)
  })

  it('should detect color type from property', () => {
    const source = '$theme.col: #ff0000'
    const tokens = parseTokens(source)

    expect(tokens[0].type).toBe('color')
  })

  it('should detect color type from value', () => {
    const source = '$theme.accent: #ff0000'
    const tokens = parseTokens(source)

    expect(tokens[0].type).toBe('color')
  })

  it('should detect spacing type', () => {
    const source = '$layout.pad: 16'
    const tokens = parseTokens(source)

    expect(tokens[0].type).toBe('spacing')
  })

  it('should detect size type', () => {
    const source = '$text.size: 14'
    const tokens = parseTokens(source)

    expect(tokens[0].type).toBe('size')
  })

  it('should handle empty source', () => {
    const tokens = parseTokens('')
    expect(tokens).toHaveLength(0)
  })

  it('should ignore invalid lines', () => {
    const source = `
$valid.token: value
not a token
$another.valid: 123
    `
    const tokens = parseTokens(source)

    expect(tokens).toHaveLength(2)
  })
})

describe('getTokenTypesForProperty', () => {
  it('should return color types for bg property', () => {
    const types = getTokenTypesForProperty('bg')
    expect(types).toEqual(['color'])
  })

  it('should return color types for col property', () => {
    const types = getTokenTypesForProperty('col')
    expect(types).toEqual(['color'])
  })

  it('should return spacing types for pad property', () => {
    const types = getTokenTypesForProperty('pad')
    expect(types).toEqual(['spacing'])
  })

  it('should return multiple types for width property', () => {
    const types = getTokenTypesForProperty('w')
    expect(types).toContain('size')
    expect(types).toContain('spacing')
  })

  it('should handle case insensitive', () => {
    const types = getTokenTypesForProperty('BG')
    expect(types).toEqual(['color'])
  })

  it('should normalize dashes and underscores', () => {
    const types = getTokenTypesForProperty('border-color')
    expect(types).toEqual(['color'])
  })

  it('should return other for unknown properties', () => {
    const types = getTokenTypesForProperty('unknown')
    expect(types).toEqual(['other'])
  })
})
