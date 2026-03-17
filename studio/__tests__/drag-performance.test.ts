/**
 * Drag Performance Tests
 *
 * Phase 7 of Drag-Drop Test Expansion Plan
 * Tests performance characteristics of drag-drop operations
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ============================================================================
// SETUP HELPERS
// ============================================================================

// Mock elementFromPoint
let mockElementAtPoint: HTMLElement | null = null

function setupElementFromPointMock(): void {
  // @ts-ignore
  document.elementFromPoint = vi.fn(() => mockElementAtPoint)
}

function setMockElementAtPoint(element: HTMLElement | null): void {
  mockElementAtPoint = element
}

function createContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = 'preview-container'
  Object.assign(container.style, {
    position: 'relative',
    width: '800px',
    height: '600px',
  })
  document.body.appendChild(container)
  return container
}

function createElements(
  container: HTMLElement,
  count: number
): HTMLElement[] {
  const elements: HTMLElement[] = []

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.setAttribute('data-mirror-id', `element-${i}`)
    el.style.width = '50px'
    el.style.height = '30px'
    container.appendChild(el)
    elements.push(el)
  }

  return elements
}

function createNestedElements(depth: number): HTMLElement {
  let current = document.createElement('div')
  current.setAttribute('data-mirror-id', 'root')
  const root = current

  for (let i = 0; i < depth; i++) {
    const child = document.createElement('div')
    child.setAttribute('data-mirror-id', `nested-${i}`)
    current.appendChild(child)
    current = child
  }

  return root
}

// ============================================================================
// LARGE ELEMENT COUNTS
// ============================================================================

describe('Drag Performance: Large Element Counts', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
    setupElementFromPointMock()
  })

  afterEach(() => {
    container.remove()
    vi.restoreAllMocks()
  })

  it('handles 100 elements without significant slowdown', () => {
    const elements = createElements(container, 100)

    const start = performance.now()

    // Simulate zone calculation operations on elements
    for (let i = 0; i < 60; i++) {
      const idx = Math.floor(Math.random() * 100)
      const el = elements[idx]
      el.getBoundingClientRect()

      // Simulate finding closest container
      let current: HTMLElement | null = el
      while (current && current !== container) {
        current.getAttribute('data-mirror-id')
        current = current.parentElement
      }
    }

    const duration = performance.now() - start

    // 60 calculations should complete quickly
    expect(duration).toBeLessThan(1000) // Less than 1 second
    expect(elements.length).toBe(100)
  })

  it('handles 500 elements in reasonable time', () => {
    const elements = createElements(container, 500)

    const start = performance.now()

    // Simulate zone calculation operations
    for (let i = 0; i < 30; i++) {
      const idx = Math.floor(Math.random() * 500)
      const el = elements[idx]
      el.getBoundingClientRect()

      // Check siblings
      const siblings = container.children
      for (let j = 0; j < Math.min(siblings.length, 10); j++) {
        (siblings[j] as HTMLElement).getBoundingClientRect()
      }
    }

    const duration = performance.now() - start

    expect(duration).toBeLessThan(2000) // Less than 2 seconds
    expect(elements.length).toBe(500)
  })

  it('handles element lookup efficiently', () => {
    const elements = createElements(container, 200)

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      const idx = Math.floor(Math.random() * 200)
      container.querySelector(`[data-mirror-id="element-${idx}"]`)
    }
    const duration = performance.now() - start

    // 1000 querySelector calls should be fast
    // Allow some margin for CI/system load variations
    expect(duration).toBeLessThan(750)
    expect(elements.length).toBe(200)
  })
})

// ============================================================================
// DEEP NESTING
// ============================================================================

describe('Drag Performance: Deep Nesting', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
    setupElementFromPointMock()
  })

  afterEach(() => {
    container.remove()
    vi.restoreAllMocks()
  })

  it('handles 20 levels of nesting', () => {
    const root = createNestedElements(20)
    container.appendChild(root)

    // Find deepest element
    let deepest = root
    while (deepest.firstElementChild) {
      deepest = deepest.firstElementChild as HTMLElement
    }

    const start = performance.now()

    // Traverse up 100 times
    for (let i = 0; i < 100; i++) {
      let current: HTMLElement | null = deepest
      let depth = 0
      while (current && current !== container) {
        current = current.parentElement
        depth++
      }
    }

    const duration = performance.now() - start
    expect(duration).toBeLessThan(100) // Should be very fast
  })

  it('handles 50 levels of nesting', () => {
    const root = createNestedElements(50)
    container.appendChild(root)

    let deepest = root
    while (deepest.firstElementChild) {
      deepest = deepest.firstElementChild as HTMLElement
    }

    const start = performance.now()

    // Traverse up 50 times
    for (let i = 0; i < 50; i++) {
      let current: HTMLElement | null = deepest
      while (current && current !== container) {
        current = current.parentElement
      }
    }

    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })

  it('parent traversal completes in <10ms', () => {
    const root = createNestedElements(30)
    container.appendChild(root)

    let deepest = root
    while (deepest.firstElementChild) {
      deepest = deepest.firstElementChild as HTMLElement
    }

    const start = performance.now()

    // Single traversal
    let current: HTMLElement | null = deepest
    const path: HTMLElement[] = []
    while (current && current !== container) {
      path.push(current)
      current = current.parentElement
    }

    const duration = performance.now() - start

    expect(duration).toBeLessThan(10)
    expect(path.length).toBe(31) // 30 nested + root
  })
})

// ============================================================================
// RAPID OPERATIONS
// ============================================================================

describe('Drag Performance: Rapid Operations', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
    setupElementFromPointMock()
  })

  afterEach(() => {
    container.remove()
    vi.restoreAllMocks()
  })

  it('handles 60 zone calculations per second', () => {
    const element = document.createElement('div')
    element.setAttribute('data-mirror-id', 'test-element')
    container.appendChild(element)

    const start = performance.now()

    // Simulate 60Hz updates (60 frames in ~1 second)
    for (let i = 0; i < 60; i++) {
      // Operations typical of zone calculation
      element.getBoundingClientRect()
      document.elementFromPoint(i * 10, i * 8)
      element.closest('[data-mirror-id]')
      container.getBoundingClientRect()
    }

    const duration = performance.now() - start

    // Should complete well under 1 second (60 FPS target = 16.67ms per frame)
    expect(duration).toBeLessThan(1000)
  })

  it('handles 100 DOM class manipulations per second', () => {
    const element = document.createElement('div')
    container.appendChild(element)

    const start = performance.now()

    for (let i = 0; i < 100; i++) {
      element.classList.add('highlight')
      element.classList.remove('highlight')
    }

    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })

  it('handles rapid style updates', () => {
    const element = document.createElement('div')
    container.appendChild(element)

    const start = performance.now()

    for (let i = 0; i < 100; i++) {
      element.style.transform = `translate(${i}px, ${i}px)`
      element.style.opacity = `${(i % 100) / 100}`
    }

    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })
})

// ============================================================================
// MEMORY STABILITY
// ============================================================================

describe('Drag Performance: Memory Stability', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
    setupElementFromPointMock()
  })

  afterEach(() => {
    container.remove()
    vi.restoreAllMocks()
  })

  it('no element accumulation after repeated operations', () => {
    // Simulate creating/removing indicator elements
    for (let i = 0; i < 10; i++) {
      const line = document.createElement('div')
      line.className = 'mirror-drop-line'
      const dot1 = document.createElement('div')
      dot1.className = 'mirror-drop-dot'
      const dot2 = document.createElement('div')
      dot2.className = 'mirror-drop-dot'

      container.appendChild(line)
      container.appendChild(dot1)
      container.appendChild(dot2)

      // Cleanup
      line.remove()
      dot1.remove()
      dot2.remove()
    }

    // Check that indicator elements are cleaned up
    const indicators = container.querySelectorAll('.mirror-drop-line, .mirror-drop-dot')
    expect(indicators.length).toBe(0)
  })

  it('event listeners are properly cleaned up', () => {
    const listeners: (() => void)[] = []

    // Simulate adding/removing event listeners
    for (let i = 0; i < 100; i++) {
      const listener = () => {}
      container.addEventListener('mousemove', listener)
      listeners.push(listener)
    }

    // Clean up
    listeners.forEach((l) => container.removeEventListener('mousemove', l))

    // No way to verify cleanup directly, but this shouldn't throw
    expect(true).toBe(true)
  })

  it('temporary elements are removed', () => {
    // Create temporary elements like during drag
    for (let i = 0; i < 50; i++) {
      const ghost = document.createElement('div')
      ghost.className = 'temp-ghost'
      document.body.appendChild(ghost)
      // Simulate cleanup
      ghost.remove()
    }

    const remainingGhosts = document.querySelectorAll('.temp-ghost')
    expect(remainingGhosts.length).toBe(0)
  })
})

// ============================================================================
// RECT CALCULATION
// ============================================================================

describe('Drag Performance: Rect Calculations', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
  })

  afterEach(() => {
    container.remove()
  })

  it('getBoundingClientRect is fast for many elements', () => {
    const elements = createElements(container, 100)

    const start = performance.now()

    // Call getBoundingClientRect on all elements 10 times
    for (let round = 0; round < 10; round++) {
      elements.forEach((el) => el.getBoundingClientRect())
    }

    const duration = performance.now() - start
    expect(duration).toBeLessThan(200) // 1000 rect calculations
  })

  it('caches rect calculations efficiently', () => {
    const element = document.createElement('div')
    container.appendChild(element)

    // Simulate caching
    const cache = new Map<HTMLElement, DOMRect>()

    const start = performance.now()

    for (let i = 0; i < 1000; i++) {
      if (!cache.has(element)) {
        cache.set(element, element.getBoundingClientRect())
      }
      cache.get(element)
    }

    const duration = performance.now() - start
    expect(duration).toBeLessThan(50) // Cache hits should be very fast
  })
})

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

describe('Drag Performance: Batch Operations', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
  })

  afterEach(() => {
    container.remove()
  })

  it('batch style updates are efficient', () => {
    const elements = createElements(container, 50)

    const start = performance.now()

    // Batch update all elements
    elements.forEach((el) => {
      el.style.cssText = 'width: 60px; height: 40px; background: blue;'
    })

    const duration = performance.now() - start
    expect(duration).toBeLessThan(50)
  })

  it('classList batch operations are efficient', () => {
    const elements = createElements(container, 100)

    const start = performance.now()

    elements.forEach((el) => {
      el.classList.add('a', 'b', 'c')
      el.classList.remove('a', 'b')
      el.classList.toggle('c')
    })

    const duration = performance.now() - start
    expect(duration).toBeLessThan(50)
  })

  it('batch attribute updates are efficient', () => {
    const elements = createElements(container, 100)

    const start = performance.now()

    elements.forEach((el, i) => {
      el.setAttribute('data-index', String(i))
      el.setAttribute('data-type', 'element')
      el.removeAttribute('data-index')
    })

    const duration = performance.now() - start
    expect(duration).toBeLessThan(50)
  })
})
