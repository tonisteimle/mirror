/**
 * Unit Tests für DOM-Runtime
 *
 * Testet alle Runtime-Funktionen isoliert mit JSDOM.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  toggle,
  show,
  hide,
  close,
  select,
  deselect,
  highlight,
  unhighlight,
  highlightNext,
  highlightPrev,
  highlightFirst,
  highlightLast,
  getHighlightableItems,
  selectHighlighted,
  activate,
  deactivate,
  applyState,
  removeState,
  setState,
  toggleState,
  updateVisibility,
  wrap,
  destroy,
  type MirrorElement,
} from '../dom-runtime'

// Helper: Create a MirrorElement
function createElement(tag = 'div', options: {
  stateStyles?: Record<string, Record<string, string>>
  initialState?: string
  visibleWhen?: string
} = {}): MirrorElement {
  const el = document.createElement(tag) as MirrorElement
  if (options.stateStyles) {
    el._stateStyles = options.stateStyles
  }
  if (options.initialState) {
    el._initialState = options.initialState
    el.dataset.state = options.initialState
  }
  if (options.visibleWhen) {
    el._visibleWhen = options.visibleWhen
  }
  return el
}

// ============================================
// VISIBILITY & TOGGLE
// ============================================

describe('show()', () => {
  it('makes element visible', () => {
    const el = createElement()
    el.hidden = true
    el.style.display = 'none'

    show(el)

    expect(el.hidden).toBe(false)
    expect(el.style.display).toBe('')
  })

  it('handles null gracefully', () => {
    expect(() => show(null)).not.toThrow()
  })
})

describe('hide()', () => {
  it('hides element', () => {
    const el = createElement()

    hide(el)

    expect(el.hidden).toBe(true)
    expect(el.style.display).toBe('none')
  })

  it('handles null gracefully', () => {
    expect(() => hide(null)).not.toThrow()
  })
})

describe('toggle()', () => {
  it('toggles open/closed state', () => {
    const el = createElement('div', { initialState: 'closed' })

    toggle(el)
    expect(el.dataset.state).toBe('open')

    toggle(el)
    expect(el.dataset.state).toBe('closed')
  })

  it('toggles expanded/collapsed state', () => {
    const el = createElement('div', { initialState: 'collapsed' })

    toggle(el)
    expect(el.dataset.state).toBe('expanded')

    toggle(el)
    expect(el.dataset.state).toBe('collapsed')
  })

  it('toggles hidden for elements without state', () => {
    const el = createElement()
    el.hidden = false

    toggle(el)
    expect(el.hidden).toBe(true)

    toggle(el)
    expect(el.hidden).toBe(false)
  })

  it('handles null gracefully', () => {
    expect(() => toggle(null)).not.toThrow()
  })
})

describe('close()', () => {
  it('sets open state to closed', () => {
    const el = createElement('div', { initialState: 'open' })

    close(el)

    expect(el.dataset.state).toBe('closed')
  })

  it('sets expanded state to collapsed', () => {
    const el = createElement('div', { initialState: 'expanded' })

    close(el)

    expect(el.dataset.state).toBe('collapsed')
  })

  it('hides element without toggle state', () => {
    const el = createElement()

    close(el)

    expect(el.hidden).toBe(true)
  })

  it('handles null gracefully', () => {
    expect(() => close(null)).not.toThrow()
  })
})

// ============================================
// SELECTION
// ============================================

describe('select()', () => {
  it('marks element as selected', () => {
    const el = createElement('div', {
      stateStyles: { selected: { background: 'blue' } }
    })

    select(el)

    expect(el.dataset.selected).toBe('true')
  })

  it('applies selected state styles', () => {
    const el = createElement('div', {
      stateStyles: { selected: { background: 'blue' } }
    })

    select(el)

    expect(el.style.background).toBe('blue')
  })

  it('deselects siblings', () => {
    const parent = createElement()
    const el1 = createElement()
    const el2 = createElement()
    parent.appendChild(el1)
    parent.appendChild(el2)

    el1.dataset.selected = 'true'
    select(el2)

    expect(el1.dataset.selected).toBeUndefined()
    expect(el2.dataset.selected).toBe('true')
  })

  it('handles null gracefully', () => {
    expect(() => select(null)).not.toThrow()
  })
})

describe('deselect()', () => {
  it('removes selected state', () => {
    const el = createElement('div', {
      stateStyles: { selected: { background: 'blue' } }
    })
    el.dataset.selected = 'true'
    el.style.background = 'blue'
    el._baseStyles = { background: '' }

    deselect(el)

    expect(el.dataset.selected).toBeUndefined()
  })

  it('handles null gracefully', () => {
    expect(() => deselect(null)).not.toThrow()
  })
})

// ============================================
// HIGHLIGHTING
// ============================================

describe('highlight()', () => {
  it('marks element as highlighted', () => {
    const el = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })

    highlight(el)

    expect(el.dataset.highlighted).toBe('true')
  })

  it('applies highlighted state styles', () => {
    const el = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })

    highlight(el)

    // jsdom converts colors to rgb format
    expect(el.style.background).toMatch(/rgb\(51,\s*51,\s*51\)|#333/)
  })

  it('unhighlights siblings', () => {
    const parent = createElement()
    const el1 = createElement()
    const el2 = createElement()
    parent.appendChild(el1)
    parent.appendChild(el2)

    el1.dataset.highlighted = 'true'
    highlight(el2)

    expect(el1.dataset.highlighted).toBeUndefined()
    expect(el2.dataset.highlighted).toBe('true')
  })

  it('handles null gracefully', () => {
    expect(() => highlight(null)).not.toThrow()
  })
})

describe('unhighlight()', () => {
  it('removes highlighted state', () => {
    const el = createElement()
    el.dataset.highlighted = 'true'

    unhighlight(el)

    expect(el.dataset.highlighted).toBeUndefined()
  })

  it('handles null gracefully', () => {
    expect(() => unhighlight(null)).not.toThrow()
  })
})

describe('getHighlightableItems()', () => {
  it('finds items with _stateStyles.highlighted', () => {
    const container = createElement()
    const item1 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    const item2 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item1)
    container.appendChild(item2)

    const items = getHighlightableItems(container)

    expect(items).toHaveLength(2)
    expect(items).toContain(item1)
    expect(items).toContain(item2)
  })

  it('falls back to cursor: pointer items', () => {
    const container = createElement()
    const item1 = createElement()
    item1.style.cursor = 'pointer'
    const item2 = createElement()
    item2.style.cursor = 'pointer'
    container.appendChild(item1)
    container.appendChild(item2)

    const items = getHighlightableItems(container)

    expect(items).toHaveLength(2)
  })

  it('recurses into nested containers', () => {
    const container = createElement()
    const nested = createElement()
    const item = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    nested.appendChild(item)
    container.appendChild(nested)

    const items = getHighlightableItems(container)

    expect(items).toHaveLength(1)
    expect(items).toContain(item)
  })
})

describe('highlightNext()', () => {
  it('highlights first item when none highlighted', () => {
    const container = createElement()
    const item1 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    const item2 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item1)
    container.appendChild(item2)

    highlightNext(container)

    expect(item1.dataset.highlighted).toBe('true')
  })

  it('highlights next item', () => {
    const container = createElement()
    const item1 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    const item2 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item1)
    container.appendChild(item2)
    item1.dataset.highlighted = 'true'

    highlightNext(container)

    expect(item1.dataset.highlighted).toBeUndefined()
    expect(item2.dataset.highlighted).toBe('true')
  })

  it('stays on last item', () => {
    const container = createElement()
    const item1 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    const item2 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item1)
    container.appendChild(item2)
    item2.dataset.highlighted = 'true'

    highlightNext(container)

    expect(item2.dataset.highlighted).toBe('true')
  })
})

describe('highlightPrev()', () => {
  it('highlights last item when none highlighted', () => {
    const container = createElement()
    const item1 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    const item2 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item1)
    container.appendChild(item2)

    highlightPrev(container)

    expect(item2.dataset.highlighted).toBe('true')
  })

  it('highlights previous item', () => {
    const container = createElement()
    const item1 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    const item2 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item1)
    container.appendChild(item2)
    item2.dataset.highlighted = 'true'

    highlightPrev(container)

    expect(item1.dataset.highlighted).toBe('true')
    expect(item2.dataset.highlighted).toBeUndefined()
  })
})

describe('highlightFirst()', () => {
  it('highlights first item', () => {
    const container = createElement()
    const item1 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    const item2 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item1)
    container.appendChild(item2)

    highlightFirst(container)

    expect(item1.dataset.highlighted).toBe('true')
  })
})

describe('highlightLast()', () => {
  it('highlights last item', () => {
    const container = createElement()
    const item1 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    const item2 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item1)
    container.appendChild(item2)

    highlightLast(container)

    expect(item2.dataset.highlighted).toBe('true')
  })
})

describe('selectHighlighted()', () => {
  it('selects the highlighted item', () => {
    const container = createElement()
    const item1 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    const item2 = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item1)
    container.appendChild(item2)
    item2.dataset.highlighted = 'true'

    selectHighlighted(container)

    expect(item2.dataset.selected).toBe('true')
  })

  it('does nothing if no item highlighted', () => {
    const container = createElement()
    const item = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })
    container.appendChild(item)

    selectHighlighted(container)

    expect(item.dataset.selected).toBeUndefined()
  })
})

// ============================================
// ACTIVATION
// ============================================

describe('activate()', () => {
  it('marks element as active', () => {
    const el = createElement('div', {
      stateStyles: { active: { background: 'red' } }
    })

    activate(el)

    expect(el.dataset.active).toBe('true')
  })

  it('applies active state styles', () => {
    const el = createElement('div', {
      stateStyles: { active: { background: 'red' } }
    })

    activate(el)

    expect(el.style.background).toBe('red')
  })

  it('handles null gracefully', () => {
    expect(() => activate(null)).not.toThrow()
  })
})

describe('deactivate()', () => {
  it('removes active state', () => {
    const el = createElement()
    el.dataset.active = 'true'

    deactivate(el)

    expect(el.dataset.active).toBeUndefined()
  })

  it('handles null gracefully', () => {
    expect(() => deactivate(null)).not.toThrow()
  })
})

// ============================================
// STATE MANAGEMENT
// ============================================

describe('applyState()', () => {
  it('applies state styles', () => {
    const el = createElement('div', {
      stateStyles: { highlighted: { background: '#333', color: 'white' } }
    })

    applyState(el, 'highlighted')

    // jsdom converts colors to rgb format
    expect(el.style.background).toMatch(/rgb\(51,\s*51,\s*51\)|#333/)
    expect(el.style.color).toBe('white')
  })

  it('does nothing for unknown state', () => {
    const el = createElement('div', {
      stateStyles: { highlighted: { background: '#333' } }
    })

    applyState(el, 'unknown')

    expect(el.style.background).toBe('')
  })

  it('handles null gracefully', () => {
    expect(() => applyState(null, 'test')).not.toThrow()
  })
})

describe('removeState()', () => {
  it('restores base styles', () => {
    const el = createElement()
    el._baseStyles = { background: 'white' }
    el.style.background = '#333'

    removeState(el, 'highlighted')

    expect(el.style.background).toBe('white')
  })

  it('handles null gracefully', () => {
    expect(() => removeState(null, 'test')).not.toThrow()
  })
})

describe('setState()', () => {
  it('sets data-state attribute', () => {
    const el = createElement()

    setState(el, 'open')

    expect(el.dataset.state).toBe('open')
  })

  it('applies state styles', () => {
    const el = createElement('div', {
      stateStyles: { open: { display: 'block' } }
    })

    setState(el, 'open')

    expect(el.style.display).toBe('block')
  })

  it('stores base styles on first change', () => {
    const el = createElement('div', {
      stateStyles: { open: { background: 'blue' } }
    })
    el.style.background = 'white'

    setState(el, 'open')

    expect(el._baseStyles).toEqual({ background: 'white' })
  })

  it('restores base styles before applying new state', () => {
    const el = createElement('div', {
      stateStyles: {
        open: { background: 'blue' },
        closed: { background: 'red' }
      }
    })
    el.style.background = 'white'

    setState(el, 'open')
    setState(el, 'closed')

    expect(el.style.background).toBe('red')
  })

  it('handles null gracefully', () => {
    expect(() => setState(null, 'test')).not.toThrow()
  })
})

describe('toggleState()', () => {
  it('toggles between two states', () => {
    const el = createElement()
    el.dataset.state = 'off'

    toggleState(el, 'on', 'off')
    expect(el.dataset.state).toBe('on')

    toggleState(el, 'on', 'off')
    expect(el.dataset.state).toBe('off')
  })

  it('defaults second state to "default"', () => {
    const el = createElement()
    el.dataset.state = 'active'

    toggleState(el, 'active')

    expect(el.dataset.state).toBe('default')
  })

  it('handles null gracefully', () => {
    expect(() => toggleState(null, 'test')).not.toThrow()
  })
})

describe('updateVisibility()', () => {
  it('shows children matching visibleWhen', () => {
    const parent = createElement()
    parent.dataset.state = 'open'

    const child = createElement('div', { visibleWhen: 'open' })
    child.dataset.mirrorId = 'child-1'
    child.style.display = 'none'
    parent.appendChild(child)

    updateVisibility(parent)

    expect(child.style.display).toBe('')
  })

  it('hides children not matching visibleWhen', () => {
    const parent = createElement()
    parent.dataset.state = 'closed'

    const child = createElement('div', { visibleWhen: 'open' })
    child.dataset.mirrorId = 'child-1'
    parent.appendChild(child)

    updateVisibility(parent)

    expect(child.style.display).toBe('none')
  })

  it('handles null gracefully', () => {
    expect(() => updateVisibility(null)).not.toThrow()
  })
})

// ============================================
// ELEMENT WRAPPER
// ============================================

describe('wrap()', () => {
  it('returns null for null element', () => {
    expect(wrap(null)).toBeNull()
  })

  it('provides text getter/setter', () => {
    const el = createElement()
    el.textContent = 'Hello'

    const wrapped = wrap(el)!

    expect(wrapped.text).toBe('Hello')
    wrapped.text = 'World'
    expect(el.textContent).toBe('World')
  })

  it('provides visible getter/setter', () => {
    const el = createElement()

    const wrapped = wrap(el)!

    expect(wrapped.visible).toBe(true)
    wrapped.visible = false
    expect(el.style.display).toBe('none')
  })

  it('provides hidden getter/setter', () => {
    const el = createElement()

    const wrapped = wrap(el)!

    wrapped.hidden = true
    expect(el.hidden).toBe(true)
    expect(el.style.display).toBe('none')
  })

  it('provides style property shortcuts', () => {
    const el = createElement()
    const wrapped = wrap(el)!

    wrapped.bg = 'blue'
    wrapped.col = 'white'
    wrapped.pad = 16
    wrapped.gap = 8
    wrapped.rad = 4

    expect(el.style.background).toBe('blue')
    expect(el.style.color).toBe('white')
    expect(el.style.padding).toBe('16px')
    expect(el.style.gap).toBe('8px')
    expect(el.style.borderRadius).toBe('4px')
  })

  it('provides state getter/setter', () => {
    const el = createElement('div', {
      stateStyles: { open: { display: 'block' } }
    })
    const wrapped = wrap(el)!

    wrapped.state = 'open'

    expect(el.dataset.state).toBe('open')
  })

  it('provides class methods', () => {
    const el = createElement()
    const wrapped = wrap(el)!

    wrapped.addClass('test')
    expect(el.classList.contains('test')).toBe(true)

    wrapped.removeClass('test')
    expect(el.classList.contains('test')).toBe(false)

    wrapped.toggleClass('test')
    expect(el.classList.contains('test')).toBe(true)
  })
})

// ============================================
// CLEANUP
// ============================================

describe('destroy()', () => {
  it('removes click-outside handler', () => {
    const el = createElement()
    const handler = vi.fn()
    el._clickOutsideHandler = handler
    document.addEventListener('click', handler)

    destroy(el)

    expect(el._clickOutsideHandler).toBeUndefined()
  })

  it('recursively destroys children', () => {
    const parent = createElement()
    const child = createElement()
    const handler = vi.fn()
    child._clickOutsideHandler = handler
    document.addEventListener('click', handler)
    parent.appendChild(child)

    destroy(parent)

    expect(child._clickOutsideHandler).toBeUndefined()
  })

  it('handles null gracefully', () => {
    expect(() => destroy(null)).not.toThrow()
  })
})
