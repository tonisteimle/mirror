/**
 * IconPicker Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  IconPicker,
  createIconPicker,
  ICONS,
  searchIcons,
  getIconsByCategory,
  getCategories,
  type IconDefinition,
} from '../../studio/pickers/icon/index'

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

describe('IconPicker', () => {
  let picker: IconPicker
  let onSelect: ReturnType<typeof vi.fn>
  let anchor: HTMLElement

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
  })

  afterEach(() => {
    picker?.destroy()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should create icon picker with default icons', () => {
      picker = new IconPicker({}, { onSelect })
      expect(picker).toBeDefined()
    })

    it('should create with custom icons', () => {
      const customIcons: IconDefinition[] = [
        { name: 'custom', path: 'M0 0h24v24H0z', category: 'custom', tags: [] }
      ]
      picker = new IconPicker({ icons: customIcons }, { onSelect })
      expect(picker).toBeDefined()
    })

    it('should use factory function', () => {
      picker = createIconPicker({}, { onSelect })
      expect(picker).toBeInstanceOf(IconPicker)
    })
  })

  describe('render()', () => {
    beforeEach(() => {
      // Use built-in Material icons for testing (not Lucide)
      picker = new IconPicker({ animate: false, useLucide: false, showRecent: false }, { onSelect })
    })

    it('should render picker container', () => {
      picker.show(anchor)
      expect(document.querySelector('.icon-picker')).toBeTruthy()
    })

    it('should render search input', () => {
      picker.show(anchor)
      expect(document.querySelector('.icon-picker-search-input')).toBeTruthy()
    })

    it('should render category buttons', () => {
      picker.show(anchor)
      const categories = document.querySelectorAll('.icon-picker-category-btn')
      expect(categories.length).toBeGreaterThan(0)
    })

    it('should render icon grid', () => {
      picker.show(anchor)
      expect(document.querySelector('.icon-picker-grid')).toBeTruthy()
    })

    it('should render icon items', () => {
      picker.show(anchor)
      const items = document.querySelectorAll('.icon-picker-item')
      expect(items.length).toBe(ICONS.length)
    })

    it('should render without search when disabled', () => {
      picker = new IconPicker({ searchable: false, animate: false, useLucide: false, showRecent: false }, { onSelect })
      picker.show(anchor)

      expect(document.querySelector('.icon-picker-search-input')).toBeFalsy()
    })
  })

  describe('Icon items', () => {
    beforeEach(() => {
      picker = new IconPicker({ animate: false, useLucide: false, showRecent: false }, { onSelect })
    })

    it('should render SVG icons', () => {
      picker.show(anchor)
      const svgs = document.querySelectorAll('.icon-picker-item svg')
      expect(svgs.length).toBe(ICONS.length)
    })

    it('should set data-icon attribute', () => {
      picker.show(anchor)
      const item = document.querySelector('.icon-picker-item') as HTMLElement
      expect(item.getAttribute('data-icon')).toBeTruthy()
    })

    it('should set title attribute', () => {
      picker.show(anchor)
      const item = document.querySelector('.icon-picker-item') as HTMLElement
      expect(item.getAttribute('title')).toBeTruthy()
    })

    it('should set role attribute', () => {
      picker.show(anchor)
      const item = document.querySelector('.icon-picker-item') as HTMLElement
      expect(item.getAttribute('role')).toBe('option')
    })
  })

  describe('Icon selection', () => {
    beforeEach(() => {
      picker = new IconPicker({ animate: false, useLucide: false, showRecent: false }, { onSelect })
    })

    it('should call onSelect on icon click', () => {
      picker.show(anchor)
      const item = document.querySelector('.icon-picker-item') as HTMLElement
      const iconName = item.getAttribute('data-icon')
      item.click()

      expect(onSelect).toHaveBeenCalledWith(iconName)
    })

    it('should close picker after selection (default)', () => {
      picker.show(anchor)
      const item = document.querySelector('.icon-picker-item') as HTMLElement
      item.click()

      expect(picker.getIsOpen()).toBe(false)
    })
  })

  describe('Search', () => {
    beforeEach(() => {
      picker = new IconPicker({ animate: false, useLucide: false, showRecent: false }, { onSelect })
    })

    it('should filter icons by name', () => {
      picker.show(anchor)
      picker.search('home')

      const items = document.querySelectorAll('.icon-picker-item')
      expect(items.length).toBeLessThan(ICONS.length)
      expect(items.length).toBeGreaterThan(0)
    })

    it('should filter icons by tag', () => {
      picker.show(anchor)
      picker.search('trash')

      const items = document.querySelectorAll('.icon-picker-item')
      expect(items.length).toBeGreaterThan(0)
    })

    it('should show empty message when no matches', () => {
      picker.show(anchor)
      picker.search('nonexistent12345')

      const empty = document.querySelector('.icon-picker-empty')
      expect(empty).toBeTruthy()
    })

    it('should clear search', () => {
      picker.show(anchor)
      picker.search('home')
      picker.clearSearch()

      const items = document.querySelectorAll('.icon-picker-item')
      expect(items.length).toBe(ICONS.length)
    })

    it('should update via input', () => {
      picker.show(anchor)
      const input = document.querySelector('.icon-picker-search-input') as HTMLInputElement
      input.value = 'home'
      input.dispatchEvent(new Event('input'))

      const items = document.querySelectorAll('.icon-picker-item')
      expect(items.length).toBeLessThan(ICONS.length)
    })
  })

  describe('Category filtering', () => {
    beforeEach(() => {
      picker = new IconPicker({ animate: false, useLucide: false, showRecent: false }, { onSelect })
    })

    it('should filter by category', () => {
      picker.show(anchor)
      picker.setCategory('navigation')

      const items = document.querySelectorAll('.icon-picker-item')
      const navigationIcons = ICONS.filter(i => i.category === 'navigation')
      expect(items.length).toBe(navigationIcons.length)
    })

    it('should show all icons when category is null', () => {
      picker.show(anchor)
      picker.setCategory('navigation')
      picker.setCategory(null)

      const items = document.querySelectorAll('.icon-picker-item')
      expect(items.length).toBe(ICONS.length)
    })

    it('should update active category button', () => {
      picker.show(anchor)
      picker.setCategory('navigation')

      const activeBtn = document.querySelector('.icon-picker-category-btn.active')
      expect(activeBtn?.getAttribute('data-category')).toBe('navigation')
    })

    it('should clear search when changing category', () => {
      picker.show(anchor)
      picker.search('home')
      picker.setCategory('action')

      const input = document.querySelector('.icon-picker-search-input') as HTMLInputElement
      expect(input.value).toBe('')
    })
  })

  describe('getCategories', () => {
    it('should return categories with counts', () => {
      picker = new IconPicker({}, { onSelect })
      const categories = picker.getCategories()

      expect(categories.length).toBeGreaterThan(0)
      expect(categories[0]).toHaveProperty('name')
      expect(categories[0]).toHaveProperty('count')
    })
  })

  describe('getIcon', () => {
    it('should return icon by name', () => {
      picker = new IconPicker({}, { onSelect })
      const icon = picker.getIcon('home')

      expect(icon).toBeTruthy()
      expect(icon?.name).toBe('home')
    })

    it('should return null for unknown icon', () => {
      picker = new IconPicker({}, { onSelect })
      const icon = picker.getIcon('nonexistent')

      expect(icon).toBeNull()
    })
  })

  describe('setIcons', () => {
    it('should update icons list', () => {
      picker = new IconPicker({ animate: false, useLucide: false, showRecent: false }, { onSelect })
      picker.show(anchor)

      const newIcons: IconDefinition[] = [
        { name: 'new-icon', path: 'M0 0h24v24H0z', category: 'test', tags: [] }
      ]
      picker.setIcons(newIcons)

      const items = document.querySelectorAll('.icon-picker-item')
      expect(items.length).toBe(1)
    })
  })

  describe('Icon size and columns', () => {
    it('should set custom icon size', () => {
      picker = new IconPicker({ iconSize: 48, animate: false, useLucide: false, showRecent: false }, { onSelect })
      picker.show(anchor)

      const svg = document.querySelector('.icon-picker-item svg')
      expect(svg?.getAttribute('width')).toBe('48')
      expect(svg?.getAttribute('height')).toBe('48')
    })

    it('should set custom columns', () => {
      picker = new IconPicker({ columns: 4, animate: false, useLucide: false, showRecent: false }, { onSelect })
      picker.show(anchor)

      const grid = document.querySelector('.icon-picker-grid') as HTMLElement
      expect(grid.style.gridTemplateColumns).toBe('repeat(4, 1fr)')
    })
  })

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      picker = new IconPicker({ animate: false, useLucide: false, showRecent: false }, { onSelect })
    })

    it('should navigate with ArrowDown from search', () => {
      picker.show(anchor)
      const input = document.querySelector('.icon-picker-search-input') as HTMLInputElement
      input.focus()

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      input.dispatchEvent(event)

      // Keyboard navigation uses visual selection (picker-selected class), not DOM focus
      // Focus stays in search input for typeahead pattern
      const selectedItem = document.querySelector('.icon-picker-item.picker-selected')
      expect(selectedItem).not.toBeNull()
    })
  })
})

describe('Icon Data Functions', () => {
  describe('searchIcons', () => {
    it('should search by name', () => {
      const results = searchIcons('home')
      expect(results.some(i => i.name === 'home')).toBe(true)
    })

    it('should search by tag', () => {
      const results = searchIcons('house')
      expect(results.some(i => i.name === 'home')).toBe(true) // home has 'house' tag
    })

    it('should be case insensitive', () => {
      const results = searchIcons('HOME')
      expect(results.some(i => i.name === 'home')).toBe(true)
    })

    it('should return empty array for no matches', () => {
      const results = searchIcons('zzzznonexistent')
      expect(results).toHaveLength(0)
    })
  })

  describe('getIconsByCategory', () => {
    it('should return icons for category', () => {
      const icons = getIconsByCategory('navigation')
      expect(icons.length).toBeGreaterThan(0)
      expect(icons.every(i => i.category === 'navigation')).toBe(true)
    })

    it('should return empty for unknown category', () => {
      const icons = getIconsByCategory('nonexistent')
      expect(icons).toHaveLength(0)
    })
  })

  describe('getCategories', () => {
    it('should return all categories', () => {
      const categories = getCategories()
      expect(categories.length).toBeGreaterThan(0)
    })

    it('should include counts', () => {
      const categories = getCategories()
      for (const cat of categories) {
        expect(cat.count).toBeGreaterThan(0)
      }
    })

    it('should match actual icons', () => {
      const categories = getCategories()
      const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0)
      expect(totalCount).toBe(ICONS.length)
    })
  })
})

describe('ICONS constant', () => {
  it('should have icons', () => {
    expect(ICONS.length).toBeGreaterThan(0)
  })

  it('should have valid icon structure', () => {
    for (const icon of ICONS) {
      expect(icon).toHaveProperty('name')
      expect(icon).toHaveProperty('path')
      expect(icon).toHaveProperty('category')
      expect(icon).toHaveProperty('tags')
      expect(Array.isArray(icon.tags)).toBe(true)
    }
  })

  it('should have unique names', () => {
    const names = ICONS.map(i => i.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })
})
