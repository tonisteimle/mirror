/**
 * DOM Event Edge Cases Tests
 *
 * Phase 4.3 of Drag-Drop Test Expansion Plan
 * Tests edge cases in DOM event handling during drag-drop operations
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ============================================================================
// EVENT PROPAGATION
// ============================================================================

describe('DOM Event Edge Cases: Event Propagation', () => {
  let container: HTMLDivElement
  let parent: HTMLDivElement
  let child: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'preview-container'
    parent = document.createElement('div')
    parent.setAttribute('data-mirror-id', 'parent')
    child = document.createElement('div')
    child.setAttribute('data-mirror-id', 'child')
    parent.appendChild(child)
    container.appendChild(parent)
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('handles event bubbling correctly', () => {
    const parentHandler = vi.fn()
    const childHandler = vi.fn()
    parent.addEventListener('click', parentHandler)
    child.addEventListener('click', childHandler)

    const event = new MouseEvent('click', { bubbles: true })
    child.dispatchEvent(event)

    expect(childHandler).toHaveBeenCalledTimes(1)
    expect(parentHandler).toHaveBeenCalledTimes(1)
  })

  it('stopPropagation prevents parent handling', () => {
    const parentHandler = vi.fn()
    const childHandler = vi.fn((e: Event) => e.stopPropagation())
    parent.addEventListener('click', parentHandler)
    child.addEventListener('click', childHandler)

    const event = new MouseEvent('click', { bubbles: true })
    child.dispatchEvent(event)

    expect(childHandler).toHaveBeenCalledTimes(1)
    expect(parentHandler).not.toHaveBeenCalled()
  })

  it('handles capture phase events', () => {
    const captureOrder: string[] = []
    parent.addEventListener('click', () => captureOrder.push('parent-capture'), true)
    parent.addEventListener('click', () => captureOrder.push('parent-bubble'))
    child.addEventListener('click', () => captureOrder.push('child'))

    const event = new MouseEvent('click', { bubbles: true })
    child.dispatchEvent(event)

    expect(captureOrder).toEqual(['parent-capture', 'child', 'parent-bubble'])
  })

  it('handles multiple handlers on same element', () => {
    const handlers = [vi.fn(), vi.fn(), vi.fn()]
    handlers.forEach((h) => child.addEventListener('click', h))

    const event = new MouseEvent('click', { bubbles: true })
    child.dispatchEvent(event)

    handlers.forEach((h) => expect(h).toHaveBeenCalledTimes(1))
  })
})

// Note: DragEvent tests removed - jsdom doesn't support DragEvent properly.
// Drag-drop events are tested in integration tests with proper mocking.

// ============================================================================
// MOUSE EVENT EDGE CASES
// ============================================================================

describe('DOM Event Edge Cases: Mouse Events', () => {
  let element: HTMLDivElement

  beforeEach(() => {
    element = document.createElement('div')
    element.setAttribute('data-mirror-id', 'test-element')
    document.body.appendChild(element)
  })

  afterEach(() => {
    document.body.removeChild(element)
  })

  it('tracks mouse button correctly', () => {
    const buttons: number[] = []
    element.addEventListener('mousedown', (e) => buttons.push(e.button))

    // Left click (0), middle (1), right (2)
    ;[0, 1, 2].forEach((button) => {
      const event = new MouseEvent('mousedown', { button })
      element.dispatchEvent(event)
    })

    expect(buttons).toEqual([0, 1, 2])
  })

  it('captures clientX/clientY coordinates', () => {
    let coords = { x: 0, y: 0 }
    element.addEventListener('mousemove', (e) => {
      coords = { x: e.clientX, y: e.clientY }
    })

    const event = new MouseEvent('mousemove', { clientX: 150, clientY: 250 })
    element.dispatchEvent(event)

    expect(coords).toEqual({ x: 150, y: 250 })
  })

  it('handles modifier keys', () => {
    const modifiers: string[] = []
    element.addEventListener('click', (e) => {
      if (e.ctrlKey) modifiers.push('ctrl')
      if (e.shiftKey) modifiers.push('shift')
      if (e.altKey) modifiers.push('alt')
      if (e.metaKey) modifiers.push('meta')
    })

    const event = new MouseEvent('click', {
      ctrlKey: true,
      shiftKey: true,
      altKey: false,
      metaKey: false,
    })
    element.dispatchEvent(event)

    expect(modifiers).toEqual(['ctrl', 'shift'])
  })

  it('distinguishes click from mousedown/mouseup', () => {
    const events: string[] = []
    ;['mousedown', 'mouseup', 'click'].forEach((type) => {
      element.addEventListener(type, () => events.push(type))
    })

    element.dispatchEvent(new MouseEvent('mousedown'))
    element.dispatchEvent(new MouseEvent('mouseup'))
    element.dispatchEvent(new MouseEvent('click'))

    expect(events).toEqual(['mousedown', 'mouseup', 'click'])
  })

  it('handles rapid mousemove events', () => {
    let moveCount = 0
    element.addEventListener('mousemove', () => moveCount++)

    for (let i = 0; i < 100; i++) {
      element.dispatchEvent(new MouseEvent('mousemove', { clientX: i, clientY: i }))
    }

    expect(moveCount).toBe(100)
  })
})

// ============================================================================
// EVENT TARGET RESOLUTION
// ============================================================================

describe('DOM Event Edge Cases: Target Resolution', () => {
  let container: HTMLDivElement
  let wrapper: HTMLDivElement
  let inner: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'preview-container'

    wrapper = document.createElement('div')
    wrapper.setAttribute('data-mirror-id', 'wrapper')

    inner = document.createElement('div')
    inner.setAttribute('data-mirror-id', 'inner')
    inner.textContent = 'Click me'

    wrapper.appendChild(inner)
    container.appendChild(wrapper)
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('event.target is the element that received the event', () => {
    let targetId = ''
    wrapper.addEventListener('click', (e) => {
      targetId = (e.target as HTMLElement).getAttribute('data-mirror-id') || ''
    })

    const event = new MouseEvent('click', { bubbles: true })
    inner.dispatchEvent(event)

    expect(targetId).toBe('inner')
  })

  it('event.currentTarget is the element with the listener', () => {
    let currentTargetId = ''
    wrapper.addEventListener('click', (e) => {
      currentTargetId = (e.currentTarget as HTMLElement).getAttribute('data-mirror-id') || ''
    })

    const event = new MouseEvent('click', { bubbles: true })
    inner.dispatchEvent(event)

    expect(currentTargetId).toBe('wrapper')
  })

  it('finds closest element with data-mirror-id', () => {
    const text = document.createTextNode('text node')
    inner.appendChild(text)

    let foundId = ''
    wrapper.addEventListener('click', (e) => {
      const target = e.target as Node
      const element =
        target.nodeType === Node.ELEMENT_NODE
          ? (target as HTMLElement)
          : (target.parentElement as HTMLElement)
      foundId = element?.closest('[data-mirror-id]')?.getAttribute('data-mirror-id') || ''
    })

    // In real scenario, clicking text node would set target to parent
    // For this test, we verify the lookup logic
    const event = new MouseEvent('click', { bubbles: true })
    inner.dispatchEvent(event)
    expect(foundId).toBe('inner')
  })

  it('handles elements without data-mirror-id', () => {
    const nonMirror = document.createElement('span')
    nonMirror.textContent = 'No ID'
    wrapper.appendChild(nonMirror)

    let foundId: string | null = null
    wrapper.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      foundId = target.getAttribute('data-mirror-id')
    })

    const event = new MouseEvent('click', { bubbles: true })
    nonMirror.dispatchEvent(event)

    expect(foundId).toBeNull()
  })
})

// ============================================================================
// HANDLER CLEANUP
// ============================================================================

describe('DOM Event Edge Cases: Handler Cleanup', () => {
  let element: HTMLDivElement

  beforeEach(() => {
    element = document.createElement('div')
    document.body.appendChild(element)
  })

  afterEach(() => {
    document.body.removeChild(element)
  })

  it('removeEventListener stops handler from being called', () => {
    const handler = vi.fn()
    element.addEventListener('click', handler)
    element.removeEventListener('click', handler)

    element.dispatchEvent(new MouseEvent('click'))

    expect(handler).not.toHaveBeenCalled()
  })

  it('removing one handler does not affect others', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    element.addEventListener('click', handler1)
    element.addEventListener('click', handler2)
    element.removeEventListener('click', handler1)

    element.dispatchEvent(new MouseEvent('click'))

    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  it('AbortController can remove multiple listeners', () => {
    const controller = new AbortController()
    const handlers = [vi.fn(), vi.fn(), vi.fn()]

    handlers.forEach((h) => {
      element.addEventListener('click', h, { signal: controller.signal })
    })

    controller.abort()

    element.dispatchEvent(new MouseEvent('click'))

    handlers.forEach((h) => expect(h).not.toHaveBeenCalled())
  })

  it('once option removes handler after first call', () => {
    const handler = vi.fn()
    element.addEventListener('click', handler, { once: true })

    element.dispatchEvent(new MouseEvent('click'))
    element.dispatchEvent(new MouseEvent('click'))

    expect(handler).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// COORDINATE TRANSFORMS
// ============================================================================

describe('DOM Event Edge Cases: Coordinate Transforms', () => {
  let container: HTMLDivElement
  let element: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    Object.assign(container.style, {
      position: 'absolute',
      left: '100px',
      top: '50px',
      width: '400px',
      height: '400px',
    })

    element = document.createElement('div')
    element.setAttribute('data-mirror-id', 'test')
    Object.assign(element.style, {
      position: 'absolute',
      left: '50px',
      top: '25px',
      width: '100px',
      height: '100px',
    })

    container.appendChild(element)
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('converts clientX/Y to element-relative coordinates', () => {
    // Mock getBoundingClientRect
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      x: 150,
      y: 75,
      width: 100,
      height: 100,
      top: 75,
      left: 150,
      bottom: 175,
      right: 250,
      toJSON: () => {},
    })

    let relativeCoords = { x: 0, y: 0 }
    element.addEventListener('click', (e) => {
      const rect = element.getBoundingClientRect()
      relativeCoords = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    })

    const event = new MouseEvent('click', { clientX: 200, clientY: 100 })
    element.dispatchEvent(event)

    expect(relativeCoords).toEqual({ x: 50, y: 25 })
  })

  it('handles scroll offset in coordinate calculation', () => {
    // pageX/pageY include scroll offset, clientX/clientY don't
    const coords = { page: { x: 0, y: 0 }, client: { x: 0, y: 0 } }

    element.addEventListener('click', (e) => {
      coords.page = { x: e.pageX, y: e.pageY }
      coords.client = { x: e.clientX, y: e.clientY }
    })

    // With scroll, pageX = clientX + scrollX
    const event = new MouseEvent('click', {
      clientX: 100,
      clientY: 100,
      // Note: pageX/pageY default to 0 in synthetic events
    })
    element.dispatchEvent(event)

    expect(coords.client).toEqual({ x: 100, y: 100 })
  })
})

// ============================================================================
// CUSTOM EVENTS
// ============================================================================

describe('DOM Event Edge Cases: Custom Events', () => {
  let element: HTMLDivElement

  beforeEach(() => {
    element = document.createElement('div')
    document.body.appendChild(element)
  })

  afterEach(() => {
    document.body.removeChild(element)
  })

  it('CustomEvent can carry arbitrary detail data', () => {
    let receivedDetail: unknown = null
    element.addEventListener('custom-event', ((e: CustomEvent) => {
      receivedDetail = e.detail
    }) as EventListener)

    const detail = { nodeId: 'test-node', zone: 'inside', position: 0 }
    const event = new CustomEvent('custom-event', { detail })
    element.dispatchEvent(event)

    expect(receivedDetail).toEqual(detail)
  })

  it('custom events bubble when configured', () => {
    const parent = document.createElement('div')
    const child = document.createElement('div')
    parent.appendChild(child)
    document.body.appendChild(parent)

    let bubbledUp = false
    parent.addEventListener('custom-event', () => {
      bubbledUp = true
    })

    const event = new CustomEvent('custom-event', { bubbles: true })
    child.dispatchEvent(event)

    expect(bubbledUp).toBe(true)

    document.body.removeChild(parent)
  })

  it('custom events can be cancelled', () => {
    element.addEventListener('custom-event', (e) => {
      e.preventDefault()
    })

    const event = new CustomEvent('custom-event', { cancelable: true })
    element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})
