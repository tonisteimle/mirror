// @vitest-environment jsdom
/**
 * Tests for studio/pickers/icon/icon-data.ts (33 LOC, 0%)
 *  + studio/pickers/animation/index.ts (332 LOC, 0% — AnimationPicker)
 *
 * Both modules are paired here for efficiency.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ICONS,
  getIconsByCategory,
  searchIcons,
  getCategories,
} from '../../studio/pickers/icon/icon-data'
import {
  AnimationPicker,
  createAnimationPicker,
  type AnimationPreset,
} from '../../studio/pickers/animation'

// =============================================================================
// icon-data.ts
// =============================================================================

describe('ICONS — registry shape', () => {
  it('is non-empty', () => {
    expect(Array.isArray(ICONS)).toBe(true)
    expect(ICONS.length).toBeGreaterThan(0)
  })

  it('every icon has the required fields (name, category, tags, style)', () => {
    for (const icon of ICONS) {
      expect(typeof icon.name).toBe('string')
      expect(icon.name.length).toBeGreaterThan(0)
      expect(typeof icon.category).toBe('string')
      expect(Array.isArray(icon.tags)).toBe(true)
      expect(['stroke', 'fill']).toContain(icon.style)
    }
  })

  it('every icon has the (added) empty `path` field', () => {
    for (const icon of ICONS) {
      expect(icon.path).toBe('')
    }
  })
})

describe('getIconsByCategory', () => {
  it('returns icons filtered by exact category match', () => {
    const categories = getCategories()
    const first = categories[0]
    const result = getIconsByCategory(first.name)
    expect(result.length).toBe(first.count)
    for (const icon of result) {
      expect(icon.category).toBe(first.name)
    }
  })

  it('returns empty for unknown category', () => {
    expect(getIconsByCategory('does-not-exist-9999')).toEqual([])
  })
})

describe('searchIcons', () => {
  it('matches by name (case-insensitive)', () => {
    const sample = ICONS[0]
    const upperName = sample.name.toUpperCase()
    const results = searchIcons(upperName)
    expect(results.some(i => i.name === sample.name)).toBe(true)
  })

  it('matches by tag (case-insensitive)', () => {
    // Find an icon with at least one tag.
    const withTags = ICONS.find(i => i.tags.length > 0)
    if (!withTags) return
    const tag = withTags.tags[0]
    const results = searchIcons(tag.toUpperCase())
    expect(results.some(i => i.name === withTags.name)).toBe(true)
  })

  it('returns empty for completely unmatched query', () => {
    expect(searchIcons('zzzzz-no-match-zzz-12345')).toEqual([])
  })

  it('treats empty query as match-all (all names contain "")', () => {
    const results = searchIcons('')
    expect(results.length).toBe(ICONS.length)
  })
})

describe('getCategories', () => {
  it('returns counts that sum to ICONS.length', () => {
    const cats = getCategories()
    const total = cats.reduce((sum, c) => sum + c.count, 0)
    expect(total).toBe(ICONS.length)
  })

  it('every category appears at least once in ICONS', () => {
    const cats = getCategories()
    const iconCats = new Set(ICONS.map(i => i.category))
    for (const c of cats) {
      expect(iconCats.has(c.name)).toBe(true)
    }
  })

  it('every category in ICONS appears in getCategories', () => {
    const catNames = new Set(getCategories().map(c => c.name))
    for (const icon of ICONS) {
      expect(catNames.has(icon.category)).toBe(true)
    }
  })
})

// =============================================================================
// AnimationPicker
// =============================================================================

let onSelect: ReturnType<typeof vi.fn>
let onClose: ReturnType<typeof vi.fn>
let anchor: HTMLElement

beforeEach(() => {
  document.body.innerHTML = ''
  // jsdom doesn't implement scrollIntoView. KeyboardNav calls it.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {}
  }
  anchor = document.createElement('button')
  document.body.appendChild(anchor)
  anchor.getBoundingClientRect = () =>
    ({ top: 0, left: 0, bottom: 20, right: 100, width: 100, height: 20 }) as DOMRect

  onSelect = vi.fn()
  onClose = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AnimationPicker — construction + render', () => {
  it('createAnimationPicker returns an AnimationPicker instance', () => {
    const p = createAnimationPicker({}, { onSelect })
    expect(p).toBeInstanceOf(AnimationPicker)
    expect(p.pickerType).toBe('animation')
  })

  it('uses default ANIMATION_PRESETS when no presets prop provided', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const items = document.querySelectorAll('.animation-picker-item')
    expect(items.length).toBeGreaterThan(0)
  })

  it('honors a custom presets array', () => {
    const custom: AnimationPreset[] = [
      {
        name: 'a1',
        label: 'A1',
        category: 'fade',
        keyframes: '@keyframes a1 { from { opacity: 0; } to { opacity: 1; } }',
        duration: '0.3s',
        easing: 'ease-out',
      },
    ]
    const p = createAnimationPicker({ animate: false, presets: custom }, { onSelect })
    p.show(anchor)
    const items = document.querySelectorAll('.animation-picker-item')
    expect(items.length).toBe(1)
    expect(items[0].getAttribute('data-animation')).toBe('a1')
  })

  it('hides the preview area when showPreview=false', () => {
    const p = createAnimationPicker({ animate: false, showPreview: false }, { onSelect })
    p.show(anchor)
    expect(document.querySelector('.animation-picker-preview')).toBeNull()
  })

  it('renders categories: All button + per-category button', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const buttons = document.querySelectorAll('.animation-picker-category-btn')
    expect(buttons.length).toBeGreaterThan(1)
    expect(buttons[0].textContent).toBe('All')
  })
})

describe('AnimationPicker — interaction', () => {
  it('clicking an item triggers onSelect with the preset name', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const item = document.querySelector('[data-animation="fade-in"]') as HTMLElement
    expect(item).not.toBeNull()
    item.click()
    expect(onSelect).toHaveBeenCalledWith('fade-in')
  })

  it('selectPreset programmatically also fires onSelect', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.selectPreset('spin')
    expect(onSelect).toHaveBeenCalledWith('spin')
  })

  it('selectPreset is a no-op for unknown preset', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.selectPreset('bogus')
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('AnimationPicker — category filter', () => {
  it('setCategory("fade") shows only fade animations', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.setCategory('fade')
    const items = document.querySelectorAll('.animation-picker-item')
    for (const it of items) {
      const name = it.getAttribute('data-animation')!
      // every fade preset has 'fade' in its category — verify via filteredPresets
      // We can't read internal state directly; instead trust that names start with fade
      expect(/fade/i.test(name)).toBe(true)
    }
  })

  it('setCategory(null) shows ALL presets again', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.setCategory('fade')
    const fadeCount = document.querySelectorAll('.animation-picker-item').length
    p.setCategory(null)
    const allCount = document.querySelectorAll('.animation-picker-item').length
    expect(allCount).toBeGreaterThan(fadeCount)
  })

  it('clicking an "All" button resets to all presets', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.setCategory('fade')
    const allBtn = document.querySelector(
      '.animation-picker-category-btn[data-category=""]'
    ) as HTMLElement
    allBtn.click()
    // Verify the all-button is now active
    expect(allBtn.classList.contains('active')).toBe(true)
  })
})

describe('AnimationPicker — filter / search', () => {
  it('filter("fade") narrows to fade animations', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.filter('fade')
    const items = document.querySelectorAll('.animation-picker-item')
    expect(items.length).toBeGreaterThan(0)
    for (const it of items) {
      const name = it.getAttribute('data-animation')!
      expect(/fade/i.test(name)).toBe(true)
    }
  })

  it('search() is an alias for filter()', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.search('spin')
    const items = document.querySelectorAll('.animation-picker-item')
    expect(items.length).toBe(1)
    expect(items[0].getAttribute('data-animation')).toBe('spin')
  })

  it('filter("") restores all presets', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.filter('spin')
    const fewItems = document.querySelectorAll('.animation-picker-item').length
    p.filter('')
    const allItems = document.querySelectorAll('.animation-picker-item').length
    expect(allItems).toBeGreaterThan(fewItems)
  })
})

describe('AnimationPicker — selection state (TriggerManager API)', () => {
  it('navigate("down") advances the selectedIndex', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    expect(p.getSelectedIndex()).toBe(0)
    p.navigate('down')
    expect(p.getSelectedIndex()).toBe(1)
  })

  it('getSelectedValue returns the current preset name', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.navigate('down')
    p.navigate('down')
    const value = p.getSelectedValue()
    expect(typeof value).toBe('string')
    expect(value!.length).toBeGreaterThan(0)
  })

  it('getSelectedPreset returns null when not open', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    expect(p.getSelectedPreset()).toBeNull()
  })

  it('navigate(any) is a no-op when not open', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    expect(() => {
      p.navigate('up')
      p.navigate('down')
      p.navigate('left')
      p.navigate('right')
    }).not.toThrow()
  })
})

describe('AnimationPicker — showAt (TriggerManager API)', () => {
  it('positions the picker at the requested x,y coordinates', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.showAt(150, 200)
    const el = p.getElement()!
    expect(el.style.left).toBe('150px')
    expect(el.style.top).toBe('200px')
  })

  it('opens the picker (isOpen=true)', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.showAt(0, 0)
    expect(p.getIsOpen()).toBe(true)
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1 (icons): searchIcons matches by tag (catches name-only mutation)', () => {
    const withTags = ICONS.find(i => i.tags.length > 0 && !i.name.includes(i.tags[0]))
    if (!withTags) return
    const results = searchIcons(withTags.tags[0])
    expect(results.some(i => i.name === withTags.name)).toBe(true)
  })

  it('M2 (icons): getCategories DEDUPLICATES via Map', () => {
    const cats = getCategories()
    expect(new Set(cats.map(c => c.name)).size).toBe(cats.length)
  })

  it('M3 (animation): selectPreset only fires for KNOWN preset (catches drop-of-find-guard)', () => {
    const p = createAnimationPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.selectPreset('definitely-bogus-12345')
    expect(onSelect).not.toHaveBeenCalled()
  })
})
