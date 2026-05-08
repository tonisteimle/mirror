// @vitest-environment jsdom
/**
 * Tests for studio/inline-edit/ (4 files, 713 LOC, 0% covered).
 *
 * Figma-style inline text editing for the preview. Double-click an
 * editable element (Text/Button/H1-H6/Label/Link/Option) to swap a
 * floating <input> in over it. Enter/Tab/Blur saves; Escape cancels.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isEditableType, EDITABLE_COMPONENT_TYPES } from '../../studio/inline-edit/types'
import {
  InlineEditSession,
  createInlineEditSession,
} from '../../studio/inline-edit/inline-edit-session'

// Mock studio/core so the controller can be loaded standalone.
// vi.mock is hoisted, so we use vi.hoisted to share state with the test file.
const { mockState, mockActions, mockEvents } = vi.hoisted(() => ({
  mockState: { inlineEditNodeId: null as string | null, sourceMap: null as any },
  mockActions: { setInlineEditActive: vi.fn() },
  mockEvents: { emit: vi.fn() },
}))
vi.mock('../../studio/core', () => ({
  state: { get: () => mockState },
  actions: mockActions,
  events: mockEvents,
}))

// Import controller AFTER mock setup.
import {
  InlineEditController,
  createInlineEditController,
} from '../../studio/inline-edit/inline-edit-controller'

// =============================================================================
// types.ts — isEditableType
// =============================================================================

describe('isEditableType', () => {
  it.each(EDITABLE_COMPONENT_TYPES.slice())('"%s" is editable', name => {
    expect(isEditableType(name)).toBe(true)
  })

  it.each(['Frame', 'Icon', 'Image', 'Input', 'Textarea', 'Slot', 'Divider'])(
    '"%s" is NOT editable',
    name => {
      expect(isEditableType(name)).toBe(false)
    }
  )

  it('case-sensitive: lowercase "button" is NOT editable', () => {
    expect(isEditableType('button')).toBe(false)
  })

  it('unknown component name is NOT editable', () => {
    expect(isEditableType('CustomFancyWidget')).toBe(false)
  })

  it('empty string is NOT editable', () => {
    expect(isEditableType('')).toBe(false)
  })
})

// =============================================================================
// InlineEditSession — start/end lifecycle
// =============================================================================

describe('InlineEditSession — basics', () => {
  let element: HTMLElement
  let onEnd: ReturnType<typeof vi.fn>

  beforeEach(() => {
    document.body.innerHTML = ''
    element = document.createElement('button')
    element.textContent = 'Click me'
    document.body.appendChild(element)
    onEnd = vi.fn()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('createInlineEditSession factory returns an InlineEditSession', () => {
    const s = createInlineEditSession({ element, nodeId: 'n1', onEnd })
    expect(s).toBeInstanceOf(InlineEditSession)
  })

  it('isEditing() is false before start', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    expect(s.isEditing()).toBe(false)
  })

  it('start() makes isEditing() true', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    expect(s.isEditing()).toBe(true)
  })

  it('start() captures originalText (trimmed)', () => {
    element.textContent = '  Click me  '
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    expect(s.getOriginalText()).toBe('Click me')
  })

  it('start() adds inline-editing class to element', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    expect(element.classList.contains('inline-editing')).toBe(true)
  })

  it('start() inserts an <input> and an overlay into the DOM', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    expect(document.querySelector('.inline-edit-input')).not.toBeNull()
    expect(document.querySelector('.inline-edit-overlay')).not.toBeNull()
  })

  it('start() input value is the original text', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    expect(input.value).toBe('Click me')
  })

  it('calling start() twice is a no-op', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    s.start()
    expect(document.querySelectorAll('.inline-edit-input').length).toBe(1)
  })

  it('end(false) restores element + removes input/overlay', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    s.end(false)
    expect(element.classList.contains('inline-editing')).toBe(false)
    expect(document.querySelector('.inline-edit-input')).toBeNull()
    expect(document.querySelector('.inline-edit-overlay')).toBeNull()
  })

  it('end() called twice is a no-op', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    s.end(true)
    s.end(true)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('end() before start() is a no-op', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.end(true)
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('end(true) with unchanged text → saved=false (newText === originalText)', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    s.end(true) // input still has original "Click me"
    expect(onEnd).toHaveBeenCalledWith({
      nodeId: 'n1',
      originalText: 'Click me',
      newText: 'Click me',
      saved: false,
    })
  })

  it('end(true) with changed text → saved=true', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.value = 'Click me harder'
    s.end(true)
    expect(onEnd).toHaveBeenCalledWith({
      nodeId: 'n1',
      originalText: 'Click me',
      newText: 'Click me harder',
      saved: true,
    })
  })

  it('end(false) discards new text — newText reverts to originalText', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.value = 'Discarded'
    s.end(false)
    expect(onEnd).toHaveBeenCalledWith({
      nodeId: 'n1',
      originalText: 'Click me',
      newText: 'Click me', // original retained
      saved: false,
    })
  })

  it('end(true) with whitespace-only new text trims and counts as no-change', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.value = '   Click me   '
    s.end(true)
    expect(onEnd).toHaveBeenCalledWith(
      expect.objectContaining({ saved: false, newText: 'Click me' })
    )
  })

  it('getCurrentText() returns input value when active', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.value = 'TYPING'
    expect(s.getCurrentText()).toBe('TYPING')
  })

  it('getCurrentText() falls back to originalText when input is gone', () => {
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    s.end(false)
    expect(s.getCurrentText()).toBe('Click me')
  })
})

// =============================================================================
// InlineEditSession — keyboard handlers
// =============================================================================

describe('InlineEditSession — keyboard', () => {
  let element: HTMLElement
  let onEnd: ReturnType<typeof vi.fn>
  let s: InlineEditSession
  let input: HTMLInputElement

  beforeEach(() => {
    document.body.innerHTML = ''
    element = document.createElement('button')
    element.textContent = 'X'
    document.body.appendChild(element)
    onEnd = vi.fn()
    s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    input = document.querySelector('.inline-edit-input') as HTMLInputElement
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('Enter key saves and ends session', () => {
    input.value = 'changed'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ saved: true, newText: 'changed' }))
    expect(s.isEditing()).toBe(false)
  })

  it('Escape key cancels — newText reverts', () => {
    input.value = 'discarded'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ saved: false, newText: 'X' }))
  })

  it('Tab key saves and ends session', () => {
    input.value = 'tabbed'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ saved: true, newText: 'tabbed' }))
  })

  it('non-special keys do NOT end the session', () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(onEnd).not.toHaveBeenCalled()
    expect(s.isEditing()).toBe(true)
  })

  it('keydown.stopPropagation prevents bubbling', () => {
    let bubbled = false
    document.body.addEventListener('keydown', () => {
      bubbled = true
    })
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(bubbled).toBe(false)
  })

  it('Enter triggers preventDefault on the event', () => {
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    input.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
  })
})

// =============================================================================
// InlineEditSession — input handler (auto-resize + onInput callback)
// =============================================================================

describe('InlineEditSession — input', () => {
  let element: HTMLElement
  let onEnd: ReturnType<typeof vi.fn>
  let onInput: ReturnType<typeof vi.fn>

  beforeEach(() => {
    document.body.innerHTML = ''
    element = document.createElement('button')
    element.textContent = 'X'
    document.body.appendChild(element)
    onEnd = vi.fn()
    onInput = vi.fn()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('input event fires onInput callback with current text', () => {
    new InlineEditSession({ element, nodeId: 'n1', onEnd, onInput }).start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.value = 'typing'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onInput).toHaveBeenCalledWith('typing')
  })

  it('onInput is optional — no error when missing', () => {
    new InlineEditSession({ element, nodeId: 'n1', onEnd }).start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.value = 'x'
    expect(() => input.dispatchEvent(new Event('input', { bubbles: true }))).not.toThrow()
  })
})

// =============================================================================
// InlineEditSession — overlay click
// =============================================================================

describe('InlineEditSession — overlay click saves', () => {
  let element: HTMLElement
  let onEnd: ReturnType<typeof vi.fn>

  beforeEach(() => {
    document.body.innerHTML = ''
    element = document.createElement('button')
    element.textContent = 'X'
    document.body.appendChild(element)
    onEnd = vi.fn()
  })

  it('overlay mousedown ends session with save=true', () => {
    new InlineEditSession({ element, nodeId: 'n1', onEnd }).start()
    const overlay = document.querySelector('.inline-edit-overlay') as HTMLElement
    overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ saved: false })) // value unchanged
  })

  it('overlay mousedown preserves new text when modified', () => {
    new InlineEditSession({ element, nodeId: 'n1', onEnd }).start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.value = 'overlay-saved'
    const overlay = document.querySelector('.inline-edit-overlay') as HTMLElement
    overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(onEnd).toHaveBeenCalledWith(
      expect.objectContaining({ saved: true, newText: 'overlay-saved' })
    )
  })
})

// =============================================================================
// InlineEditSession — blur (focus lost) handler
// =============================================================================

describe('InlineEditSession — blur', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('blur saves session after 50ms delay', () => {
    const element = document.createElement('button')
    element.textContent = 'X'
    document.body.appendChild(element)
    const onEnd = vi.fn()
    new InlineEditSession({ element, nodeId: 'n1', onEnd }).start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.value = 'blurred'
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))

    // Before timer fires
    expect(onEnd).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ saved: true, newText: 'blurred' }))
  })

  it('blur is no-op if session already ended', () => {
    const element = document.createElement('button')
    element.textContent = 'X'
    document.body.appendChild(element)
    const onEnd = vi.fn()
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    s.end(true) // explicit end before timer fires

    vi.advanceTimersByTime(50)
    expect(onEnd).toHaveBeenCalledTimes(1) // not called twice
  })
})

// (text-align heuristics not testable in jsdom: createFloatingInput sets
// styles via `cssText = "...border: 2px solid var(--color-primary, #5BA8F5)..."`,
// which jsdom's CSS parser rejects wholesale, leaving input.style empty.
// The logic is exercised in real-browser tests under studio/test-api.)

// =============================================================================
// InlineEditController
// =============================================================================

function makeSourceMap(nodes: Record<string, { componentName: string }>) {
  return {
    getNodeById: (id: string) => nodes[id] || null,
  }
}

describe('InlineEditController — construction', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    mockState.inlineEditNodeId = null
    mockState.sourceMap = null
    mockActions.setInlineEditActive.mockClear()
    mockEvents.emit.mockClear()
  })

  it('createInlineEditController returns an InlineEditController', () => {
    const container = document.createElement('div')
    expect(createInlineEditController({ container })).toBeInstanceOf(InlineEditController)
  })

  it('uses default node ID attribute "data-mirror-id"', () => {
    const container = document.createElement('div')
    const c = new InlineEditController({ container })
    // Indirectly verify via querySelector when starting an edit.
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'n1')
    el.textContent = 'X'
    container.appendChild(el)
    document.body.appendChild(container)
    mockState.sourceMap = makeSourceMap({ n1: { componentName: 'Button' } })
    const ok = c.startEdit('n1')
    expect(ok).toBe(true)
  })

  it('honors custom nodeIdAttribute', () => {
    const container = document.createElement('div')
    const c = new InlineEditController({ container, nodeIdAttribute: 'data-custom-id' })
    const el = document.createElement('button')
    el.setAttribute('data-custom-id', 'n1')
    el.textContent = 'X'
    container.appendChild(el)
    document.body.appendChild(container)
    mockState.sourceMap = makeSourceMap({ n1: { componentName: 'Button' } })
    expect(c.startEdit('n1')).toBe(true)
  })

  it('isEditing() is false initially', () => {
    const container = document.createElement('div')
    const c = new InlineEditController({ container })
    expect(c.isEditing()).toBe(false)
  })

  it('getEditingNodeId() reads from state', () => {
    mockState.inlineEditNodeId = 'foo'
    const c = new InlineEditController({ container: document.createElement('div') })
    expect(c.getEditingNodeId()).toBe('foo')
  })
})

describe('InlineEditController — startEdit', () => {
  let container: HTMLElement
  let c: InlineEditController

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    mockState.inlineEditNodeId = null
    mockState.sourceMap = makeSourceMap({
      btn1: { componentName: 'Button' },
      icon1: { componentName: 'Icon' },
    })
    mockActions.setInlineEditActive.mockClear()
    mockEvents.emit.mockClear()
    c = new InlineEditController({ container })
  })

  it('returns false when element is not in the container', () => {
    expect(c.startEdit('missing')).toBe(false)
  })

  it('returns false when SourceMap node not found', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'unknown')
    container.appendChild(el)
    expect(c.startEdit('unknown')).toBe(false)
  })

  it('returns false when component type is not editable', () => {
    const el = document.createElement('div')
    el.setAttribute('data-mirror-id', 'icon1')
    container.appendChild(el)
    expect(c.startEdit('icon1')).toBe(false)
  })

  it('returns true and emits inline-edit:started for editable elements', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    expect(c.startEdit('btn1')).toBe(true)
    expect(mockActions.setInlineEditActive).toHaveBeenCalledWith(true, 'btn1')
    expect(mockEvents.emit).toHaveBeenCalledWith(
      'inline-edit:started',
      expect.objectContaining({ nodeId: 'btn1' })
    )
  })

  it('calls onEditStart callback with nodeId + element', () => {
    const onEditStart = vi.fn()
    c = new InlineEditController({ container, onEditStart })
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    c.startEdit('btn1')
    expect(onEditStart).toHaveBeenCalledWith('btn1', el)
  })

  it('returns false when already editing the same node', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    c.startEdit('btn1')
    mockState.inlineEditNodeId = 'btn1'
    expect(c.startEdit('btn1')).toBe(false)
  })

  it('ends previous session when starting on a different node', () => {
    const el1 = document.createElement('button')
    el1.setAttribute('data-mirror-id', 'btn1')
    el1.textContent = 'A'
    const el2 = document.createElement('button')
    el2.setAttribute('data-mirror-id', 'btn1b')
    el2.textContent = 'B'
    container.appendChild(el1)
    container.appendChild(el2)
    mockState.sourceMap = makeSourceMap({
      btn1: { componentName: 'Button' },
      btn1b: { componentName: 'Button' },
    })
    c.startEdit('btn1')
    mockState.inlineEditNodeId = 'btn1'
    c.startEdit('btn1b')
    // Two starts → two events.
    expect(mockEvents.emit).toHaveBeenCalledWith(
      'inline-edit:started',
      expect.objectContaining({ nodeId: 'btn1' })
    )
    expect(mockEvents.emit).toHaveBeenCalledWith(
      'inline-edit:started',
      expect.objectContaining({ nodeId: 'btn1b' })
    )
  })

  it('returns false when no SourceMap is available', () => {
    mockState.sourceMap = null
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    container.appendChild(el)
    expect(c.startEdit('btn1')).toBe(false)
  })

  it('setSourceMap overrides state SourceMap for editability checks', () => {
    mockState.sourceMap = null
    c.setSourceMap(makeSourceMap({ btn1: { componentName: 'Button' } }))
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    expect(c.startEdit('btn1')).toBe(true)
  })
})

describe('InlineEditController — endEdit + dispose', () => {
  let container: HTMLElement
  let c: InlineEditController

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    mockState.inlineEditNodeId = null
    mockState.sourceMap = makeSourceMap({ btn1: { componentName: 'Button' } })
    mockActions.setInlineEditActive.mockClear()
    mockEvents.emit.mockClear()
    c = new InlineEditController({ container })
  })

  it('endEdit(false) ends without saving + fires onEditEnd', () => {
    const onEditEnd = vi.fn()
    c = new InlineEditController({ container, onEditEnd })
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    c.startEdit('btn1')

    c.endEdit(false)
    expect(c.isEditing()).toBe(false)
    expect(mockActions.setInlineEditActive).toHaveBeenLastCalledWith(false, null)
    expect(mockEvents.emit).toHaveBeenCalledWith('inline-edit:ended', expect.any(Object))
    expect(onEditEnd).toHaveBeenCalledWith('btn1', 'X', false)
  })

  it('endEdit when not editing is a no-op', () => {
    c.endEdit(true)
    expect(mockActions.setInlineEditActive).not.toHaveBeenCalled()
  })

  it('dispose detaches listener + ends session', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    c.attach()
    c.startEdit('btn1')
    c.dispose()
    expect(c.isEditing()).toBe(false)
  })
})

describe('InlineEditController — double-click delay flow', () => {
  let container: HTMLElement
  let c: InlineEditController

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    mockState.inlineEditNodeId = null
    mockState.sourceMap = makeSourceMap({ btn1: { componentName: 'Button' } })
    mockActions.setInlineEditActive.mockClear()
    mockEvents.emit.mockClear()
    vi.useFakeTimers()
    c = new InlineEditController({ container })
    c.attach()
  })

  afterEach(() => {
    c.dispose()
    vi.useRealTimers()
  })

  it('dblclick on editable element starts edit after 150ms delay', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 50, clientY: 50 }))

    // Before timer
    expect(c.isEditing()).toBe(false)

    vi.advanceTimersByTime(150)
    expect(c.isEditing()).toBe(true)
  })

  it('dblclick on non-editable element does NOT start edit', () => {
    mockState.sourceMap = makeSourceMap({ icon1: { componentName: 'Icon' } })
    const el = document.createElement('div')
    el.setAttribute('data-mirror-id', 'icon1')
    container.appendChild(el)
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))

    vi.advanceTimersByTime(200)
    expect(c.isEditing()).toBe(false)
  })

  it('dblclick on element WITHOUT data-mirror-id is no-op', () => {
    const el = document.createElement('button')
    el.textContent = 'X'
    container.appendChild(el)
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    vi.advanceTimersByTime(200)
    expect(c.isEditing()).toBe(false)
  })

  it('mouse drift > 10px during delay cancels pending edit', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 50, clientY: 50 }))

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 65, clientY: 50 }))

    vi.advanceTimersByTime(150)
    expect(c.isEditing()).toBe(false)
  })

  it('mouse drift within 10px does NOT cancel', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 50, clientY: 50 }))

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 55, clientY: 55 }))

    vi.advanceTimersByTime(150)
    expect(c.isEditing()).toBe(true)
  })

  it('mousedown elsewhere cancels pending edit', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 50, clientY: 50 }))

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    vi.advanceTimersByTime(150)
    expect(c.isEditing()).toBe(false)
  })

  it('detach() stops dblclick from triggering edits', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    c.detach()
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    vi.advanceTimersByTime(200)
    expect(c.isEditing()).toBe(false)
  })

  it('second dblclick cancels pending and starts a new pending', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 0, clientY: 0 }))
    vi.advanceTimersByTime(50) // partway through first delay
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 0, clientY: 0 }))
    // After second dblclick, only the second timer is alive.
    vi.advanceTimersByTime(150)
    expect(c.isEditing()).toBe(true)
  })

  it('dblclick on closest data-mirror-id ancestor (not direct target)', () => {
    const wrapper = document.createElement('button')
    wrapper.setAttribute('data-mirror-id', 'btn1')
    const inner = document.createElement('span')
    inner.textContent = 'inner'
    wrapper.appendChild(inner)
    container.appendChild(wrapper)
    inner.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 0, clientY: 0 }))
    vi.advanceTimersByTime(150)
    expect(c.isEditing()).toBe(true)
  })

  it('edit does NOT start before EDIT_START_DELAY (catches delay = 0 mutation)', () => {
    const el = document.createElement('button')
    el.setAttribute('data-mirror-id', 'btn1')
    el.textContent = 'X'
    container.appendChild(el)
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 0, clientY: 0 }))
    vi.advanceTimersByTime(100) // 100 < 150 → still pending
    expect(c.isEditing()).toBe(false)
    vi.advanceTimersByTime(50) // total 150 → fires
    expect(c.isEditing()).toBe(true)
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('M1: isEditableType uses exact match (catches Array.includes mutation)', () => {
    expect(isEditableType('Text')).toBe(true)
    expect(isEditableType('TextField')).toBe(false) // partial match must NOT pass
  })

  it('M2: end(true) saved=true ONLY when newText differs (catches drop of comparison)', () => {
    const element = document.createElement('button')
    element.textContent = 'same'
    document.body.appendChild(element)
    const onEnd = vi.fn()
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    s.end(true) // unchanged
    expect(onEnd.mock.calls[0][0].saved).toBe(false)
  })

  it('M3: end(false) ALWAYS saved=false (catches `save && ...` flip)', () => {
    const element = document.createElement('button')
    element.textContent = 'X'
    document.body.appendChild(element)
    const onEnd = vi.fn()
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd })
    s.start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    input.value = 'changed'
    s.end(false)
    expect(onEnd.mock.calls[0][0].saved).toBe(false)
  })

  it('M4: keyboard handler stopPropagation prevents bubbling', () => {
    const element = document.createElement('button')
    element.textContent = 'X'
    document.body.appendChild(element)
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd: vi.fn() })
    s.start()
    const input = document.querySelector('.inline-edit-input') as HTMLInputElement
    let bubbled = false
    document.body.addEventListener('keydown', () => {
      bubbled = true
    })
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(bubbled).toBe(false)
  })

  it('M5: originalText is trimmed (catches drop of .trim() in start)', () => {
    const element = document.createElement('button')
    element.textContent = '   X   '
    document.body.appendChild(element)
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd: vi.fn() })
    s.start()
    expect(s.getOriginalText()).toBe('X')
  })

  it('M6: createInlineEditSession returns same class as direct construction', () => {
    const element = document.createElement('button')
    document.body.appendChild(element)
    expect(createInlineEditSession({ element, nodeId: 'n1', onEnd: vi.fn() })).toBeInstanceOf(
      InlineEditSession
    )
  })

  it('M7: input cleanup on end (catches removeFloatingInput regressions)', () => {
    const element = document.createElement('button')
    element.textContent = 'X'
    document.body.appendChild(element)
    const s = new InlineEditSession({ element, nodeId: 'n1', onEnd: vi.fn() })
    s.start()
    s.end(false)
    // Both input and overlay should be removed.
    expect(document.querySelectorAll('.inline-edit-input').length).toBe(0)
    expect(document.querySelectorAll('.inline-edit-overlay').length).toBe(0)
  })
})
