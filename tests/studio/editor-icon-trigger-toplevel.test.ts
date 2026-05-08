// @vitest-environment jsdom
/**
 * Tests for studio/editor/icon-trigger.ts (the TOP-LEVEL icon trigger,
 * not the trigger-manager-style one in studio/editor/triggers/).
 *
 * This module was 0% covered. It uses a stateful module-level singleton
 * + a CodeMirror updateListener that opens IconPicker on space-after-
 * Icon-component, and a keyboard handler for navigation.
 *
 * Tests pin:
 *  - setComponentPrimitives / getComponentPrimitives roundtrip
 *  - showIconPicker / hideIconPicker / isIconPickerOpen lifecycle
 *  - Insertion via the IconPicker callback
 *  - Trigger logic: space after Icon, ends-with-Icon, custom primitives
 *  - Keyboard navigation when picker is open
 *  - Click-outside dismissal
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the pickers module so we control IconPicker behavior.
const mockPicker = vi.hoisted(() => ({
  loadLucideIcons: vi.fn(),
  showAt: vi.fn(),
  hide: vi.fn(),
  filter: vi.fn(),
  navigate: vi.fn(),
  getSelectedIndex: vi.fn(() => 0),
  getFilteredIcons: vi.fn(() => [{ name: 'check' }, { name: 'home' }]),
  addToRecent: vi.fn(),
}))

vi.mock('../../studio/pickers', () => {
  let cb: ((name: string) => void) | null = null
  return {
    getGlobalIconPicker: () => mockPicker,
    setGlobalIconPickerCallback: (fn: (n: string) => void) => {
      cb = fn
    },
    __invokeCallback: (n: string) => cb?.(n),
  }
})

import * as iconTrigger from '../../studio/editor/icon-trigger'
import * as pickers from '../../studio/pickers'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

let parent: HTMLDivElement
let view: EditorView

beforeEach(() => {
  parent = document.createElement('div')
  document.body.appendChild(parent)
  // Reset state FIRST (this may invoke mocks)…
  iconTrigger.hideIconPicker()
  iconTrigger.setComponentPrimitives(new Map())
  // …then reset all mock counters so tests start at 0.
  Object.values(mockPicker).forEach(fn => {
    if ('mockReset' in fn && typeof fn.mockReset === 'function') fn.mockReset()
  })
  mockPicker.getSelectedIndex.mockReturnValue(0)
  mockPicker.getFilteredIcons.mockReturnValue([{ name: 'check' }, { name: 'home' }])
})

afterEach(() => {
  view?.destroy()
  parent.remove()
})

function makeView(initialDoc: string) {
  const state = EditorState.create({
    doc: initialDoc,
    extensions: iconTrigger.iconPickerExtensions,
  })
  view = new EditorView({ state, parent })
  // jsdom returns null for coordsAtPos (no real layout) — stub it so the
  // trigger's coords-driven branch can fire.
  ;(view as unknown as { coordsAtPos: typeof view.coordsAtPos }).coordsAtPos = () => ({
    left: 100,
    top: 50,
    bottom: 60,
    right: 110,
  })
  return view
}

describe('component primitives roundtrip', () => {
  it('set + get returns the same map', () => {
    const map = new Map([
      ['Logo', 'icon'],
      ['Card', 'frame'],
    ])
    iconTrigger.setComponentPrimitives(map)
    expect(iconTrigger.getComponentPrimitives()).toBe(map)
  })

  it('replaces (not merges) on subsequent set', () => {
    iconTrigger.setComponentPrimitives(new Map([['A', 'icon']]))
    iconTrigger.setComponentPrimitives(new Map([['B', 'frame']]))
    const map = iconTrigger.getComponentPrimitives()
    expect(map.get('A')).toBeUndefined()
    expect(map.get('B')).toBe('frame')
  })
})

describe('show / hide / isOpen lifecycle', () => {
  it('isIconPickerOpen starts false', () => {
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })

  it('showIconPicker opens, calls picker.showAt, isOpen flips true', () => {
    makeView('Icon ')
    iconTrigger.showIconPicker(100, 200, 0, view)
    expect(iconTrigger.isIconPickerOpen()).toBe(true)
    expect(mockPicker.showAt).toHaveBeenCalledWith(100, 200)
    expect(mockPicker.loadLucideIcons).toHaveBeenCalledOnce()
  })

  it('showIconPicker is no-op when already open', () => {
    makeView('Icon ')
    iconTrigger.showIconPicker(0, 0, 0, view)
    iconTrigger.showIconPicker(50, 60, 0, view)
    expect(mockPicker.showAt).toHaveBeenCalledTimes(1)
  })

  it('hideIconPicker closes + flips isOpen', () => {
    makeView('Icon ')
    iconTrigger.showIconPicker(0, 0, 5, view)
    iconTrigger.hideIconPicker()
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
    expect(mockPicker.hide).toHaveBeenCalledOnce()
  })

  it('hideIconPicker no-ops when already closed', () => {
    iconTrigger.hideIconPicker()
    expect(mockPicker.hide).not.toHaveBeenCalled()
  })
})

describe('icon insertion via callback', () => {
  it('selecting an icon inserts `"name"` and closes picker', () => {
    makeView('Icon ')
    view.dispatch({ selection: { anchor: 5 } })
    iconTrigger.showIconPicker(0, 0, 5, view)
    ;(pickers as unknown as { __invokeCallback: (n: string) => void }).__invokeCallback('check')
    expect(view.state.doc.toString()).toBe('Icon "check"')
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })
})

describe('trigger logic — opens on space after Icon component', () => {
  it('triggers on space after exactly "Icon"', () => {
    makeView('Icon')
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' ' } })
    expect(iconTrigger.isIconPickerOpen()).toBe(true)
  })

  it('triggers on space after a name ending with "Icon" (e.g. AppIcon)', () => {
    makeView('AppIcon')
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' ' } })
    expect(iconTrigger.isIconPickerOpen()).toBe(true)
  })

  it('triggers on space after a custom primitive marked as "icon"', () => {
    iconTrigger.setComponentPrimitives(new Map([['Logo', 'icon']]))
    makeView('Logo')
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' ' } })
    expect(iconTrigger.isIconPickerOpen()).toBe(true)
  })

  it('does NOT trigger on non-icon component (Frame)', () => {
    makeView('Frame')
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' ' } })
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })

  it('does NOT trigger on non-space insertions', () => {
    makeView('Icon')
    view.dispatch({ changes: { from: view.state.doc.length, insert: 'a' } })
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })

  it('does NOT trigger when picker already open', () => {
    makeView('Icon ')
    iconTrigger.showIconPicker(0, 0, 5, view)
    expect(mockPicker.showAt).toHaveBeenCalledTimes(1)
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' ' } })
    expect(mockPicker.showAt).toHaveBeenCalledTimes(1)
  })
})

describe('trigger logic — filtering while typing', () => {
  it('typing chars forwards to picker.filter', () => {
    makeView('Icon ')
    iconTrigger.showIconPicker(0, 0, 5, view)
    view.dispatch({ changes: { from: 5, insert: 'c' } })
    view.dispatch({ changes: { from: 6, insert: 'h' } })
    expect(mockPicker.filter).toHaveBeenCalled()
  })

  it('typing space (intent: stop picking) closes picker', () => {
    makeView('Icon ')
    iconTrigger.showIconPicker(0, 0, 5, view)
    view.dispatch({ changes: { from: 5, insert: ' ' } })
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })
})

describe('keyboard handling when picker is open', () => {
  function key(view: EditorView, k: string) {
    const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
    return view.contentDOM.dispatchEvent(ev)
  }

  it('does NOTHING when picker is closed', () => {
    makeView('Icon')
    key(view, 'ArrowDown')
    expect(mockPicker.navigate).not.toHaveBeenCalled()
  })

  it('Arrow keys delegate to picker.navigate with proper direction', () => {
    makeView('Icon ')
    iconTrigger.showIconPicker(0, 0, 5, view)
    key(view, 'ArrowDown')
    key(view, 'ArrowUp')
    key(view, 'ArrowLeft')
    key(view, 'ArrowRight')
    expect(mockPicker.navigate).toHaveBeenNthCalledWith(1, 'down')
    expect(mockPicker.navigate).toHaveBeenNthCalledWith(2, 'up')
    expect(mockPicker.navigate).toHaveBeenNthCalledWith(3, 'left')
    expect(mockPicker.navigate).toHaveBeenNthCalledWith(4, 'right')
  })

  it('Enter inserts highlighted icon and closes picker', () => {
    makeView('Icon ')
    view.dispatch({ selection: { anchor: 5 } })
    iconTrigger.showIconPicker(0, 0, 5, view)
    mockPicker.getSelectedIndex.mockReturnValue(1) // 'home'
    key(view, 'Enter')
    expect(view.state.doc.toString()).toBe('Icon "home"')
    expect(mockPicker.addToRecent).toHaveBeenCalledWith('home')
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })

  it('Escape removes typed text and closes picker', () => {
    makeView('Icon ')
    view.dispatch({ selection: { anchor: 5 } })
    iconTrigger.showIconPicker(0, 0, 5, view)
    // Insert text AND advance the cursor (CodeMirror by default keeps the
    // selection at its anchor when the change touches that anchor; we want
    // to simulate the user typing through, so move selection explicitly.)
    view.dispatch({
      changes: { from: 5, insert: 'che' },
      selection: { anchor: 8 },
    })
    key(view, 'Escape')
    expect(view.state.doc.toString()).toBe('Icon ')
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })

  it('Backspace at startPos closes the picker', () => {
    makeView('Icon ')
    view.dispatch({ selection: { anchor: 5 } })
    iconTrigger.showIconPicker(0, 0, 5, view)
    key(view, 'Backspace')
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })
})

describe('setupIconPickerClickOutside', () => {
  it('mousedown OUTSIDE .icon-picker closes the picker', () => {
    iconTrigger.setupIconPickerClickOutside()
    document.body.innerHTML += '<div class="icon-picker"></div>'

    makeView('Icon ')
    iconTrigger.showIconPicker(0, 0, 5, view)
    expect(iconTrigger.isIconPickerOpen()).toBe(true)

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })
})

describe('P3 — mutation-driven', () => {
  it('M1: regex requires Component-Name (uppercase start)', () => {
    makeView('button')
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' ' } })
    expect(iconTrigger.isIconPickerOpen()).toBe(false)
  })

  it('M2: hideIconPicker resets startPos so subsequent typing does NOT filter', () => {
    makeView('Icon ')
    iconTrigger.showIconPicker(0, 0, 5, view)
    iconTrigger.hideIconPicker()
    view.dispatch({ changes: { from: 5, insert: 'x' } })
    expect(mockPicker.filter).not.toHaveBeenCalled()
  })

  it('M3: insertion wraps icon name in DOUBLE quotes (not single, not bare)', () => {
    makeView('Icon ')
    view.dispatch({ selection: { anchor: 5 } })
    iconTrigger.showIconPicker(0, 0, 5, view)
    ;(pickers as unknown as { __invokeCallback: (n: string) => void }).__invokeCallback('star')
    expect(view.state.doc.toString()).toBe('Icon "star"')
  })
})
