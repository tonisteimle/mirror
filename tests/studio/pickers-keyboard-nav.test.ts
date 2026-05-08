// @vitest-environment jsdom
/**
 * Tests for studio/pickers/base/keyboard-nav.ts
 *
 * KeyboardNav is the navigation engine shared by all pickers (color,
 * icon, token, animation, action). Pure logic + DOM class flips.
 * Previously zero coverage.
 *
 * Tests pin:
 *  - 3 orientations (vertical / horizontal / grid)
 *  - wrap / no-wrap behaviors at edges
 *  - moveUp/Down/Left/Right route correctly per orientation
 *  - selectCurrent fires the onSelect callback
 *  - handleKeyDown maps arrow/Home/End/Enter/Space/Escape and
 *    preventsDefault on every recognized key
 *  - .picker-selected / aria-selected class flips
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KeyboardNav } from '../../studio/pickers/base/keyboard-nav'

let onSelect: ReturnType<typeof vi.fn>
let onCancel: ReturnType<typeof vi.fn>

function makeItems(count: number): HTMLElement[] {
  const items: HTMLElement[] = []
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.dataset.idx = String(i)
    document.body.appendChild(el)
    // jsdom doesn't implement scrollIntoView — stub it.
    el.scrollIntoView = vi.fn()
    items.push(el)
  }
  return items
}

beforeEach(() => {
  document.body.innerHTML = ''
  onSelect = vi.fn()
  onCancel = vi.fn()
})

// =============================================================================
// Construction + setItems
// =============================================================================

describe('KeyboardNav — construction', () => {
  it('accepts vertical orientation with default columns=1, wrap=true', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    expect(nav.getSelectedIndex()).toBe(0)
  })

  it('starts with selectedIndex=0 even after re-setItems', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    nav.moveDown() // → 1
    expect(nav.getSelectedIndex()).toBe(1)
    nav.setItems(makeItems(2)) // resets to 0
    expect(nav.getSelectedIndex()).toBe(0)
  })

  it('selectIndex sets the index when in range', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(5))
    nav.selectIndex(3)
    expect(nav.getSelectedIndex()).toBe(3)
  })

  it('selectIndex is a NO-OP for out-of-range indices', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    nav.selectIndex(10) // out of range
    expect(nav.getSelectedIndex()).toBe(0)
    nav.selectIndex(-1)
    expect(nav.getSelectedIndex()).toBe(0)
  })

  it('getSelectedItem returns null when no items', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    expect(nav.getSelectedItem()).toBeNull()
  })

  it('getSelectedItem returns the current item element', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    const items = makeItems(3)
    nav.setItems(items)
    nav.selectIndex(1)
    expect(nav.getSelectedItem()).toBe(items[1])
  })
})

// =============================================================================
// Vertical navigation
// =============================================================================

describe('KeyboardNav — vertical orientation', () => {
  it('moveDown advances index', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(1)
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(2)
  })

  it('moveUp decrements index', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    nav.selectIndex(2)
    nav.moveUp()
    expect(nav.getSelectedIndex()).toBe(1)
  })

  it('moveDown WRAPS to 0 at end (default wrap=true)', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    nav.selectIndex(2)
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(0)
  })

  it('moveUp WRAPS to last at start (default wrap=true)', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    nav.moveUp()
    expect(nav.getSelectedIndex()).toBe(2)
  })

  it('NO-WRAP: moveDown clamps at last index', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', wrap: false, onSelect })
    nav.setItems(makeItems(3))
    nav.selectIndex(2)
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(2)
  })

  it('NO-WRAP: moveUp clamps at 0', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', wrap: false, onSelect })
    nav.setItems(makeItems(3))
    nav.moveUp()
    expect(nav.getSelectedIndex()).toBe(0)
  })

  it('moveLeft / moveRight are NO-OPs in vertical orientation', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(0)
    nav.moveLeft()
    expect(nav.getSelectedIndex()).toBe(0)
  })
})

// =============================================================================
// Horizontal navigation
// =============================================================================

describe('KeyboardNav — horizontal orientation', () => {
  it('moveRight advances, moveLeft decrements', () => {
    const nav = new KeyboardNav({ orientation: 'horizontal', onSelect })
    nav.setItems(makeItems(4))
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(1)
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(2)
    nav.moveLeft()
    expect(nav.getSelectedIndex()).toBe(1)
  })

  it('moveRight WRAPS at end', () => {
    const nav = new KeyboardNav({ orientation: 'horizontal', onSelect })
    nav.setItems(makeItems(3))
    nav.selectIndex(2)
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(0)
  })

  it('moveLeft WRAPS at start', () => {
    const nav = new KeyboardNav({ orientation: 'horizontal', onSelect })
    nav.setItems(makeItems(3))
    nav.moveLeft()
    expect(nav.getSelectedIndex()).toBe(2)
  })

  it('NO-WRAP: moveRight clamps at last index', () => {
    const nav = new KeyboardNav({ orientation: 'horizontal', wrap: false, onSelect })
    nav.setItems(makeItems(3))
    nav.selectIndex(2)
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(2)
  })

  it('moveUp / moveDown are NO-OPs in horizontal orientation', () => {
    const nav = new KeyboardNav({ orientation: 'horizontal', onSelect })
    nav.setItems(makeItems(3))
    nav.selectIndex(1)
    nav.moveUp()
    expect(nav.getSelectedIndex()).toBe(1)
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(1)
  })
})

// =============================================================================
// Grid navigation
// =============================================================================

describe('KeyboardNav — grid orientation (columns=3)', () => {
  it('moveRight within row advances by 1', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(9))
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(1)
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(2)
  })

  it('moveDown within column advances by `columns` (= 3)', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(9))
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(3)
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(6)
  })

  it('moveDown WRAPS column-wise: from last row → first row, same column', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(9))
    nav.selectIndex(7) // last row, col 1
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(1) // first row, col 1
  })

  it('moveUp WRAPS column-wise: from first row → last row, same column', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(9))
    nav.selectIndex(2) // first row, col 2
    nav.moveUp()
    expect(nav.getSelectedIndex()).toBe(8) // last row, col 2
  })

  it('moveRight at last column wraps to next row, first column', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(9))
    nav.selectIndex(2) // first row, last col
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(3) // second row, first col
  })

  it('moveRight at last item wraps to index 0', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(9))
    nav.selectIndex(8)
    nav.moveRight()
    expect(nav.getSelectedIndex()).toBe(0)
  })

  it('moveLeft at first column wraps to previous row, last column', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(9))
    nav.selectIndex(3) // second row, first col
    nav.moveLeft()
    expect(nav.getSelectedIndex()).toBe(2) // first row, last col
  })

  it('moveLeft at index 0 wraps to last item', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(9))
    nav.moveLeft()
    expect(nav.getSelectedIndex()).toBe(8)
  })

  it('partial last row: moveDown from col-2 with last row only having col 0', () => {
    // 8 items, 3 cols → rows: [0,1,2] [3,4,5] [6,7]
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(8))
    nav.selectIndex(2) // first row, col 2
    nav.moveDown() // to col 2 of next row → 5
    expect(nav.getSelectedIndex()).toBe(5)
  })

  it('moveUp wraps to last-row, same-column — clamped to items.length when partial row', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, onSelect })
    nav.setItems(makeItems(8))
    nav.selectIndex(2) // col 2 in first row
    nav.moveUp() // wraps to last-row col 2 — but row 2 only has cols 0..1
    // implementation clamps to items.length-1 (= 7)
    expect(nav.getSelectedIndex()).toBe(7)
  })

  it('NO-WRAP: moveDown stays put when no row below', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 3, wrap: false, onSelect })
    nav.setItems(makeItems(9))
    nav.selectIndex(7)
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(7)
  })
})

// =============================================================================
// First/Last + selectCurrent
// =============================================================================

describe('KeyboardNav — Home/End/select', () => {
  it('moveToFirst sets index to 0', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(5))
    nav.selectIndex(3)
    nav.moveToFirst()
    expect(nav.getSelectedIndex()).toBe(0)
  })

  it('moveToLast sets index to items.length - 1', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(5))
    nav.moveToLast()
    expect(nav.getSelectedIndex()).toBe(4)
  })

  it('selectCurrent fires onSelect with the current item + index', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    const items = makeItems(3)
    nav.setItems(items)
    nav.selectIndex(1)
    nav.selectCurrent()
    expect(onSelect).toHaveBeenCalledWith(items[1], 1)
  })

  it('selectCurrent is a no-op when no items', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.selectCurrent()
    expect(onSelect).not.toHaveBeenCalled()
  })
})

// =============================================================================
// handleKeyDown — full keymap
// =============================================================================

describe('KeyboardNav — handleKeyDown', () => {
  function makeNav() {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect, onCancel })
    nav.setItems(makeItems(5))
    return nav
  }

  function key(k: string): { event: KeyboardEvent; prevented: boolean } {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
    let prevented = false
    Object.defineProperty(event, 'preventDefault', {
      value: () => {
        prevented = true
      },
    })
    return { event, prevented: false }
  }

  it.each([
    ['ArrowUp', 'moveUp'],
    ['ArrowDown', 'moveDown'],
    ['ArrowLeft', 'moveLeft'],
    ['ArrowRight', 'moveRight'],
    ['Home', 'moveToFirst'],
    ['End', 'moveToLast'],
  ])('handles %s — calls preventDefault and returns true', keyName => {
    const nav = makeNav()
    const event = new KeyboardEvent('keydown', { key: keyName, cancelable: true })
    const pd = vi.spyOn(event, 'preventDefault')
    expect(nav.handleKeyDown(event)).toBe(true)
    expect(pd).toHaveBeenCalled()
  })

  it('Enter calls selectCurrent', () => {
    const nav = makeNav()
    nav.selectIndex(2)
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    expect(nav.handleKeyDown(event)).toBe(true)
    expect(onSelect).toHaveBeenCalledWith(expect.any(HTMLElement), 2)
  })

  it('Space (" ") also calls selectCurrent', () => {
    const nav = makeNav()
    nav.selectIndex(0)
    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true })
    expect(nav.handleKeyDown(event)).toBe(true)
    expect(onSelect).toHaveBeenCalled()
  })

  it('Escape calls onCancel', () => {
    const nav = makeNav()
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    expect(nav.handleKeyDown(event)).toBe(true)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('returns false for unhandled keys (Tab, letter keys, etc.)', () => {
    const nav = makeNav()
    expect(nav.handleKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }))).toBe(false)
    expect(nav.handleKeyDown(new KeyboardEvent('keydown', { key: 'a' }))).toBe(false)
    expect(nav.handleKeyDown(new KeyboardEvent('keydown', { key: '1' }))).toBe(false)
  })
})

// =============================================================================
// Visual selection (CSS class + aria)
// =============================================================================

describe('KeyboardNav — visual selection', () => {
  it('adds .picker-selected + aria-selected="true" to current item', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    const items = makeItems(3)
    nav.setItems(items)
    expect(items[0].classList.contains('picker-selected')).toBe(true)
    expect(items[0].getAttribute('aria-selected')).toBe('true')
    expect(items[1].classList.contains('picker-selected')).toBe(false)
    expect(items[1].getAttribute('aria-selected')).toBe('false')
  })

  it('class flips when selection changes', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    const items = makeItems(3)
    nav.setItems(items)
    nav.moveDown()
    expect(items[0].classList.contains('picker-selected')).toBe(false)
    expect(items[1].classList.contains('picker-selected')).toBe(true)
  })

  it('scrollIntoView is called on the newly selected item', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    const items = makeItems(3)
    nav.setItems(items)
    nav.moveDown()
    expect(items[1].scrollIntoView).toHaveBeenCalled()
  })
})

// =============================================================================
// dispose
// =============================================================================

describe('KeyboardNav — dispose', () => {
  it('clears the items array (subsequent navigation is no-op)', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    nav.dispose()
    expect(nav.getSelectedItem()).toBeNull()
    nav.selectCurrent() // no items → no callback
    expect(onSelect).not.toHaveBeenCalled()
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: grid moveDown jumps by `columns` (NOT by 1)', () => {
    const nav = new KeyboardNav({ orientation: 'grid', columns: 4, onSelect })
    nav.setItems(makeItems(16))
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(4) // exactly columns
  })

  it('M2: vertical moveDown wraps to 0 (NOT items.length)', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    nav.selectIndex(2)
    nav.moveDown()
    expect(nav.getSelectedIndex()).toBe(0)
  })

  it('M3: handleKeyDown returns FALSE for unhandled keys (catches default-true mutation)', () => {
    const nav = new KeyboardNav({ orientation: 'vertical', onSelect })
    nav.setItems(makeItems(3))
    expect(nav.handleKeyDown(new KeyboardEvent('keydown', { key: 'F1' }))).toBe(false)
    expect(nav.handleKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }))).toBe(false)
  })
})
