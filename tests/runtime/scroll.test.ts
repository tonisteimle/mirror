/**
 * Scroll Runtime Tests
 *
 * Pin for `compiler/runtime/scroll.ts`. Specifically validates the
 * `scrollContainerToTop` / `scrollContainerToBottom` helpers introduced
 * by the architecture-hunt: when called from a button click handler, the
 * runtime walks up the parent chain to find the closest scrollable
 * ancestor (overflow:auto/scroll + scrollHeight > clientHeight) and
 * scrolls that. Falls back to window if no scrollable ancestor exists.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  scrollToTop,
  scrollToBottom,
  scrollContainerToTop,
  scrollContainerToBottom,
} from '../../compiler/runtime/scroll'

// jsdom doesn't implement scrollTo on Element/window, so we stub them.
function stubElementScroll(el: HTMLElement): void {
  ;(el as HTMLElement & { scrollTo: (opts: ScrollToOptions) => void }).scrollTo = function (opts) {
    if (opts && typeof opts.top === 'number') this.scrollTop = opts.top
  }
}

function stubWindowScroll(): { scrolledTo: number | null } {
  const tracker = { scrolledTo: null as number | null }
  window.scrollTo = ((opts: ScrollToOptions) => {
    if (opts && typeof opts.top === 'number') tracker.scrolledTo = opts.top
  }) as Window['scrollTo']
  return tracker
}

describe('scroll runtime', () => {
  let outer: HTMLElement
  let inner: HTMLElement
  let button: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    outer = document.createElement('div')
    outer.style.height = '150px'
    // jsdom doesn't expand `overflow: auto` to overflowY in CSSOM,
    // so set the long-form explicitly. Real browsers handle the
    // shorthand fine — see findings.md scroll runtime entry.
    outer.style.overflowY = 'auto'
    inner = document.createElement('div')
    inner.style.height = '500px'
    button = document.createElement('button')
    inner.appendChild(button)
    outer.appendChild(inner)
    document.body.appendChild(outer)

    stubElementScroll(outer)
    stubElementScroll(document.documentElement)
    stubElementScroll(document.body)

    // jsdom returns 0 for client/scroll heights; stub them to make outer
    // look scrollable.
    Object.defineProperty(outer, 'clientHeight', { configurable: true, value: 150 })
    Object.defineProperty(outer, 'scrollHeight', { configurable: true, value: 500 })
  })

  describe('scrollToTop / scrollToBottom (explicit target)', () => {
    it('scrollToTop(el) sets the element scrollTop to 0', () => {
      outer.scrollTop = 200
      scrollToTop(outer)
      expect(outer.scrollTop).toBe(0)
    })

    it('scrollToBottom(el) sets the element scrollTop to scrollHeight', () => {
      outer.scrollTop = 0
      scrollToBottom(outer)
      expect(outer.scrollTop).toBe(500)
    })

    it('scrollToTop() with no target falls back to window scroll', () => {
      const win = stubWindowScroll()
      scrollToTop()
      expect(win.scrolledTo).toBe(0)
    })
  })

  describe('scrollContainerToTop / scrollContainerToBottom (context-aware)', () => {
    it('walks up to find a scrollable ancestor of the click source', () => {
      outer.scrollTop = 200
      scrollContainerToTop(button)
      expect(outer.scrollTop).toBe(0)
    })

    it('scrolls the container to the bottom when called from a descendant', () => {
      outer.scrollTop = 0
      scrollContainerToBottom(button)
      expect(outer.scrollTop).toBe(500)
    })

    it('falls back to window when no scrollable ancestor exists', () => {
      // Re-create the tree without an `overflow: auto` ancestor.
      document.body.innerHTML = ''
      const flat = document.createElement('div')
      const btn = document.createElement('button')
      flat.appendChild(btn)
      document.body.appendChild(flat)
      const win = stubWindowScroll()
      scrollContainerToTop(btn)
      expect(win.scrolledTo).toBe(0)
    })

    it('skips an ancestor that has overflow:auto but no actual overflow', () => {
      // Add an extra ancestor that's `overflow:auto` but content fits.
      const padding = document.createElement('div')
      padding.style.overflowY = 'auto'
      Object.defineProperty(padding, 'clientHeight', { configurable: true, value: 100 })
      Object.defineProperty(padding, 'scrollHeight', { configurable: true, value: 100 })
      // Insert padding between button and outer
      inner.removeChild(button)
      padding.appendChild(button)
      inner.appendChild(padding)
      stubElementScroll(padding)
      outer.scrollTop = 250
      scrollContainerToTop(button)
      // Outer should be the chosen scrollable ancestor (padding has no overflow).
      expect(outer.scrollTop).toBe(0)
    })

    it('handles a null/undefined context by falling back to window', () => {
      const win = stubWindowScroll()
      scrollContainerToTop(null)
      expect(win.scrolledTo).toBe(0)
    })
  })
})
