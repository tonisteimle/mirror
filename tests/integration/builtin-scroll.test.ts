/**
 * Integration Tests for Built-in Scroll Functions
 *
 * Tests: scrollTo, scrollBy, scrollToTop, scrollToBottom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  scrollTo,
  scrollBy,
  scrollToTop,
  scrollToBottom,
  type MirrorElement,
} from '../../compiler/runtime/dom-runtime'

describe('Scroll Functions', () => {
  let dom: JSDOM
  let document: Document
  let window: Window & typeof globalThis

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body style="height: 2000px;"></body></html>', {
      url: 'http://localhost',
    })
    document = dom.window.document
    window = dom.window as unknown as Window & typeof globalThis
    global.document = document
    global.window = window
  })

  afterEach(() => {
    dom.window.close()
  })

  function createTestElement(opts: {
    id?: string
    name?: string
    scrollable?: boolean
  } = {}): MirrorElement {
    const el = document.createElement('div') as MirrorElement
    if (opts.id) el.dataset.mirrorId = opts.id
    if (opts.name) el.dataset.mirrorName = opts.name
    if (opts.scrollable) {
      el.style.overflow = 'auto'
      el.style.height = '200px'
      // Add content to make it scrollable
      el.innerHTML = '<div style="height: 1000px;">Content</div>'
    }
    document.body.appendChild(el)
    return el
  }

  describe('scrollTo', () => {
    it('calls scrollIntoView on element', () => {
      const target = createTestElement({ id: 'target', name: 'TargetSection' })
      const scrollIntoViewMock = vi.fn()
      target.scrollIntoView = scrollIntoViewMock

      scrollTo(target)

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      })
    })

    it('accepts element name as string', () => {
      const target = createTestElement({ name: 'FeaturesSection' })
      const scrollIntoViewMock = vi.fn()
      target.scrollIntoView = scrollIntoViewMock

      scrollTo('FeaturesSection')

      expect(scrollIntoViewMock).toHaveBeenCalled()
    })

    it('accepts custom options', () => {
      const target = createTestElement({ id: 'target' })
      const scrollIntoViewMock = vi.fn()
      target.scrollIntoView = scrollIntoViewMock

      scrollTo(target, { behavior: 'instant', block: 'center' })

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'instant',
        block: 'center',
        inline: 'nearest',
      })
    })

    it('does nothing for null element', () => {
      // Should not throw
      scrollTo(null)
    })
  })

  describe('scrollBy', () => {
    it('calls scrollBy on container', () => {
      const container = createTestElement({ id: 'container', scrollable: true })
      const scrollByMock = vi.fn()
      container.scrollBy = scrollByMock

      scrollBy(container, 100, 200)

      expect(scrollByMock).toHaveBeenCalledWith({
        left: 100,
        top: 200,
        behavior: 'smooth',
      })
    })

    it('accepts element name as string', () => {
      const container = createTestElement({ name: 'Gallery', scrollable: true })
      const scrollByMock = vi.fn()
      container.scrollBy = scrollByMock

      scrollBy('Gallery', 300, 0)

      expect(scrollByMock).toHaveBeenCalledWith({
        left: 300,
        top: 0,
        behavior: 'smooth',
      })
    })

    it('accepts instant behavior', () => {
      const container = createTestElement({ id: 'container', scrollable: true })
      const scrollByMock = vi.fn()
      container.scrollBy = scrollByMock

      scrollBy(container, 0, 100, 'instant')

      expect(scrollByMock).toHaveBeenCalledWith({
        left: 0,
        top: 100,
        behavior: 'instant',
      })
    })

    it('does nothing for null container', () => {
      // Should not throw
      scrollBy(null, 100, 100)
    })
  })

  describe('scrollToTop', () => {
    it('scrolls page to top when no element provided', () => {
      const scrollToMock = vi.fn()
      window.scrollTo = scrollToMock

      scrollToTop()

      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      })
    })

    it('scrolls element to top', () => {
      const container = createTestElement({ id: 'container', scrollable: true })
      const scrollToMock = vi.fn()
      container.scrollTo = scrollToMock

      scrollToTop(container)

      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      })
    })

    it('accepts element name as string', () => {
      const container = createTestElement({ name: 'ChatList', scrollable: true })
      const scrollToMock = vi.fn()
      container.scrollTo = scrollToMock

      scrollToTop('ChatList')

      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      })
    })
  })

  describe('scrollToBottom', () => {
    it('scrolls page to bottom when no element provided', () => {
      const scrollToMock = vi.fn()
      window.scrollTo = scrollToMock

      scrollToBottom()

      expect(scrollToMock).toHaveBeenCalledWith({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      })
    })

    it('scrolls element to bottom', () => {
      const container = createTestElement({ id: 'container', scrollable: true })
      const scrollToMock = vi.fn()
      container.scrollTo = scrollToMock
      // Mock scrollHeight
      Object.defineProperty(container, 'scrollHeight', { value: 1000 })

      scrollToBottom(container)

      expect(scrollToMock).toHaveBeenCalledWith({
        top: 1000,
        behavior: 'smooth',
      })
    })

    it('accepts element name as string', () => {
      const container = createTestElement({ name: 'Messages', scrollable: true })
      const scrollToMock = vi.fn()
      container.scrollTo = scrollToMock
      Object.defineProperty(container, 'scrollHeight', { value: 500 })

      scrollToBottom('Messages')

      expect(scrollToMock).toHaveBeenCalledWith({
        top: 500,
        behavior: 'smooth',
      })
    })
  })
})
