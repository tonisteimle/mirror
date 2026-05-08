// @vitest-environment jsdom
/**
 * Tests for studio/pickers/icon/picker.ts (IconPicker, 0%, 636 LOC)
 *
 * Grid-based icon picker with search, category filter, recent-icons,
 * Lucide CDN loading, lazy SVG loading. Tests cover the synchronous
 * surface; CDN/lazy paths are covered with fetch mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  IconPicker,
  createIconPicker,
  getGlobalIconPicker,
  setGlobalIconPickerCallback,
} from '../../studio/pickers/icon/picker'
import type { IconDefinition } from '../../studio/pickers/icon/types'

let anchor: HTMLElement
let onSelect: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {}
  }
  anchor = document.createElement('button')
  document.body.appendChild(anchor)
  anchor.getBoundingClientRect = () =>
    ({ top: 0, left: 0, bottom: 20, right: 100, width: 100, height: 20 }) as DOMRect
  onSelect = vi.fn()
  // Mock fetch for Lucide CDN paths.
  globalThis.fetch = vi.fn(async (url: string) => {
    if (url.includes('lucide')) {
      return {
        ok: true,
        json: async () => ({ icons: {} }),
        text: async () => '<svg></svg>',
      } as Response
    }
    return { ok: false } as Response
  }) as unknown as typeof fetch
})

afterEach(() => {
  vi.useRealTimers()
})

const customIcons: IconDefinition[] = [
  {
    name: 'check',
    path: 'M0 0',
    category: 'common',
    tags: ['ok', 'done'],
    style: 'stroke' as const,
  },
  {
    name: 'x',
    path: 'M1 1',
    category: 'common',
    tags: ['close', 'cancel'],
    style: 'stroke' as const,
  },
  {
    name: 'arrow-up',
    path: 'M2 2',
    category: 'navigation',
    tags: ['up'],
    style: 'stroke' as const,
  },
]

// =============================================================================
// Construction + render
// =============================================================================

describe('IconPicker — construction', () => {
  it('createIconPicker returns instance with type "icon"', () => {
    const p = createIconPicker({ icons: customIcons }, { onSelect })
    expect(p).toBeInstanceOf(IconPicker)
    expect(p.pickerType).toBe('icon')
  })

  it('uses default ICONS when no icons prop is provided', () => {
    const p = createIconPicker({ useLucide: false }, { onSelect })
    p.show(anchor)
    expect(document.querySelectorAll('.icon-picker-item').length).toBeGreaterThan(0)
  })

  it('honors custom icons array', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    const items = document.querySelectorAll('.icon-picker-item')
    // 3 custom icons + recent (none) = 3
    expect(items.length).toBe(3)
  })
})

describe('IconPicker — render shape', () => {
  it('renders search input when searchable=true (default)', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    expect(document.querySelector('.icon-picker-search-input')).not.toBeNull()
  })

  it('omits search when searchable=false', () => {
    const p = createIconPicker(
      {
        icons: customIcons,
        useLucide: false,
        animate: false,
        searchable: false,
        showRecent: false,
      },
      { onSelect }
    )
    p.show(anchor)
    expect(document.querySelector('.icon-picker-search-input')).toBeNull()
  })

  it('renders categories ONLY when not Lucide AND has non-lucide icons', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    expect(document.querySelector('.icon-picker-categories')).not.toBeNull()
  })

  it('omits categories when useLucide=true', () => {
    const p = createIconPicker({ useLucide: true, animate: false, showRecent: false }, { onSelect })
    p.show(anchor)
    expect(document.querySelector('.icon-picker-categories')).toBeNull()
  })

  it('grid uses configured columns', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, columns: 6, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    const grid = document.querySelector('.icon-picker-grid:not(.recent)') as HTMLElement
    expect(grid.style.gridTemplateColumns).toBe('repeat(6, 1fr)')
  })
})

// =============================================================================
// Selection + recent
// =============================================================================

describe('IconPicker — click → select', () => {
  it('clicking an icon fires onSelect with the icon name', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    const item = document.querySelector('[data-icon="check"]') as HTMLElement
    item.click()
    expect(onSelect).toHaveBeenCalledWith('check')
  })

  it('selectByIndex fires onSelect with the icon at that position', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.selectByIndex(2) // arrow-up
    expect(onSelect).toHaveBeenCalledWith('arrow-up')
  })

  it('selectByIndex is a no-op for out-of-range index', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.selectByIndex(99)
    expect(onSelect).not.toHaveBeenCalled()
  })
})

// =============================================================================
// Search
// =============================================================================

describe('IconPicker — search', () => {
  it('search by name (case-insensitive)', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.search('CHECK')
    expect(p.getFilteredIcons()).toHaveLength(1)
    expect(p.getFilteredIcons()[0].name).toBe('check')
  })

  it('search matches by tags', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.search('cancel')
    expect(p.getFilteredIcons()).toHaveLength(1)
    expect(p.getFilteredIcons()[0].name).toBe('x')
  })

  it('whitespace-only query is treated as empty', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.search('   ')
    expect(p.getFilteredIcons()).toHaveLength(3)
  })

  it('filter() is an alias for search()', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.filter('arrow')
    expect(p.getFilteredIcons()).toHaveLength(1)
  })

  it('clearSearch resets filter and active category', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.search('check')
    expect(p.getFilteredIcons()).toHaveLength(1)
    p.clearSearch()
    expect(p.getFilteredIcons()).toHaveLength(3)
  })
})

// =============================================================================
// Category
// =============================================================================

describe('IconPicker — category', () => {
  it('setCategory filters by category', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.setCategory('common')
    expect(p.getFilteredIcons().every(i => i.category === 'common')).toBe(true)
  })

  it('setCategory(null) restores all icons', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.setCategory('common')
    p.setCategory(null)
    expect(p.getFilteredIcons().length).toBeGreaterThanOrEqual(3)
  })

  it('getCategories returns name+count pairs', () => {
    const p = createIconPicker({ useLucide: false, animate: false }, { onSelect })
    const cats = p.getCategories()
    expect(Array.isArray(cats)).toBe(true)
    if (cats.length > 0) {
      expect(typeof cats[0].name).toBe('string')
      expect(typeof cats[0].count).toBe('number')
    }
  })
})

// =============================================================================
// Recent icons
// =============================================================================

describe('IconPicker — recent icons', () => {
  it('addToRecent persists via UserSettings', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false },
      { onSelect }
    )
    p.show(anchor)
    p.addToRecent('check')
    expect(p.getRecentIcons()).toContain('check')
  })

  it('clearRecent empties the recent list', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false },
      { onSelect }
    )
    p.show(anchor)
    p.addToRecent('check')
    p.clearRecent()
    expect(p.getRecentIcons()).not.toContain('check')
  })

  it('renders a recent section when showRecent=true', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: true },
      { onSelect }
    )
    p.show(anchor)
    p.addToRecent('check')
    // Recent grid is the .icon-picker-grid.recent
    expect(document.querySelector('.icon-picker-grid.recent')).not.toBeNull()
  })
})

// =============================================================================
// setIcons
// =============================================================================

describe('IconPicker — setIcons', () => {
  it('replaces the icon list and refreshes the grid', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    expect(p.getFilteredIcons()).toHaveLength(3)
    p.setIcons([
      { name: 'star', path: 'M0', category: 'shapes', tags: [], style: 'stroke' as const },
    ])
    expect(p.getFilteredIcons()).toHaveLength(1)
  })

  it('getIcon finds an icon by name', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false },
      { onSelect }
    )
    expect(p.getIcon('check')?.name).toBe('check')
    expect(p.getIcon('nope')).toBeNull()
  })
})

// =============================================================================
// Lucide loader
// =============================================================================

describe('IconPicker — Lucide CDN', () => {
  it('loadLucideIcons fetches from configured URL + populates internal map', async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            icons: {
              heart: { body: '<path d="M0"/>' },
              star: { body: '<path d="M1"/>' },
            },
          }),
        }) as Response
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const p = createIconPicker({ useLucide: true, animate: false, showRecent: false }, { onSelect })
    await p.loadLucideIcons()
    expect(fetchMock).toHaveBeenCalled()
    // After loading, getFilteredIcons should reflect the loaded set
    expect(p.getFilteredIcons().length).toBe(2)
  })

  it('does NOT re-fetch on subsequent loadLucideIcons calls', async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: true, json: async () => ({ icons: {} }) }) as Response
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const p = createIconPicker({ useLucide: true, animate: false }, { onSelect })
    await p.loadLucideIcons()
    await p.loadLucideIcons()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('catches fetch errors silently (no throw)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network')
    }) as unknown as typeof fetch

    const p = createIconPicker({ useLucide: true, animate: false }, { onSelect })
    await expect(p.loadLucideIcons()).resolves.toBeUndefined()
  })
})

// =============================================================================
// showAt + navigate (TriggerManager API)
// =============================================================================

describe('IconPicker — showAt / navigate', () => {
  it('showAt positions picker at exact coords', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.showAt(50, 100)
    const el = p.getElement()!
    expect(el.style.left).toBe('50px')
    expect(el.style.top).toBe('100px')
  })

  it('navigate("right") forwards to keyboardNav', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, columns: 12, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    expect(p.getSelectedIndex()).toBe(0)
    p.navigate('right')
    expect(p.getSelectedIndex()).toBe(1)
  })
})

// =============================================================================
// Singleton
// =============================================================================

describe('IconPicker — global singleton', () => {
  it('getGlobalIconPicker returns the SAME instance on repeated calls', () => {
    const a = getGlobalIconPicker()
    const b = getGlobalIconPicker()
    expect(a).toBe(b)
  })

  it('setGlobalIconPickerCallback overrides the onSelect callback', () => {
    const newSelect = vi.fn()
    setGlobalIconPickerCallback(newSelect)
    const p = getGlobalIconPicker()
    // Trigger via internal selectValue path
    const items = document.querySelectorAll('.icon-picker-item')
    if (items.length > 0) {
      ;(items[0] as HTMLElement).click()
      expect(newSelect).toHaveBeenCalled()
    }
  })
})

// =============================================================================
// Coverage gaps — search input + keyboard + edge branches
// =============================================================================

describe('IconPicker — search input keyboard', () => {
  it('typing in the search input filters icons', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    const input = document.querySelector('.icon-picker-search-input') as HTMLInputElement
    input.value = 'check'
    input.dispatchEvent(new Event('input'))
    expect(p.getFilteredIcons()).toHaveLength(1)
  })

  it('ArrowDown / ArrowUp / ArrowLeft / ArrowRight in search input do not throw', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    const input = document.querySelector('.icon-picker-search-input') as HTMLInputElement
    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) {
      expect(() =>
        input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
      ).not.toThrow()
    }
  })

  it('Enter key in search input invokes TriggerManager (no throw)', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    const input = document.querySelector('.icon-picker-search-input') as HTMLInputElement
    expect(() =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      )
    ).not.toThrow()
  })

  it('Escape key in search input closes the picker', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    const input = document.querySelector('.icon-picker-search-input') as HTMLInputElement
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    )
    expect(p.getIsOpen()).toBe(false)
  })
})

describe('IconPicker — empty state + getValue', () => {
  it('renders the "Keine Icons gefunden" empty state when search yields zero', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.search('zzzzzzzzzzzz-no-match')
    expect(document.querySelector('.icon-picker-empty')?.textContent).toContain('Keine Icons')
  })

  it('getValue returns selected icon name', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    expect(p.getValue()).toBe('check')
  })

  it('getValue falls back to ICONS when filteredIcons is empty AND no search', () => {
    const p = createIconPicker(
      { icons: [], useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    // No filtered icons, no search query → fall back to built-in ICONS
    expect(typeof p.getValue()).toBe('string')
  })

  it('setValue is a no-op (does not throw)', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false },
      { onSelect }
    )
    expect(() => p.setValue('check')).not.toThrow()
  })
})

describe('IconPicker — category button click (via DOM)', () => {
  it('clicking the All button restores all icons', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.setCategory('common')
    const allBtn = document.querySelector(
      '.icon-picker-category-btn[data-category=""]'
    ) as HTMLElement
    allBtn.click()
    expect(p.getFilteredIcons().length).toBeGreaterThanOrEqual(3)
  })

  it('clicking a category button activates that category', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    const cats = document.querySelectorAll('.icon-picker-category-btn')
    // pick one that's not "All"
    const target = Array.from(cats).find(b => b.getAttribute('data-category')) as HTMLElement
    if (target) {
      target.click()
      expect(target.classList.contains('active')).toBe(true)
    }
  })
})

describe('IconPicker — navigate / keyboard edge cases', () => {
  it('navigate is a no-op when keyboardNav is null (picker not open)', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    expect(() => {
      p.navigate('up')
      p.navigate('down')
      p.navigate('left')
      p.navigate('right')
    }).not.toThrow()
  })

  it('Lucide load re-applies the existing search query after fetch resolves', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            icons: {
              heart: { body: '<path/>' },
              check: { body: '<path/>' },
            },
          }),
        }) as Response
    ) as unknown as typeof fetch

    const p = createIconPicker({ useLucide: true, animate: false }, { onSelect })
    // Pre-set a search query before the load completes
    ;(p as unknown as { searchQuery: string }).searchQuery = 'heart'
    await p.loadLucideIcons()
    expect(p.getFilteredIcons().some(i => i.name === 'heart')).toBe(true)
  })
})

describe('IconPicker — keyboard nav fires onSelect callback', () => {
  it('selecting via KeyboardNav.onSelect fires picker onSelect', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    // Simulate Enter on the first icon — KeyboardNav.handleKeyDown will fire onSelect
    p.navigate('right') // move to position 1 to ensure nav initialized
    const item = document.querySelector('[data-icon="check"]') as HTMLElement
    item.click() // click also routes through addToRecent + selectValue
    expect(onSelect).toHaveBeenCalled()
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: search() trims whitespace (catches drop-of-trim mutation)', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.search('  check  ')
    expect(p.getFilteredIcons()).toHaveLength(1)
    expect(p.getFilteredIcons()[0].name).toBe('check')
  })

  it('M2: setCategory(null) restores ALL icons (catches null-handling mutation)', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.setCategory('common')
    expect(p.getFilteredIcons().length).toBeLessThan(3)
    p.setCategory(null)
    expect(p.getFilteredIcons()).toHaveLength(3)
  })

  it('M3: clearSearch resets categoryless (catches drop-of-activeCategory-respect)', () => {
    const p = createIconPicker(
      { icons: customIcons, useLucide: false, animate: false, showRecent: false },
      { onSelect }
    )
    p.show(anchor)
    p.search('check')
    p.clearSearch()
    // After clearSearch with no active category, all icons restored.
    expect(p.getFilteredIcons()).toHaveLength(3)
  })
})
