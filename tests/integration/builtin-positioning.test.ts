/**
 * Integration Tests for Built-in Positioning Functions
 *
 * Tests: showBelow, showAbove, showLeft, showRight, showAt, showModal, dismiss
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  showBelow,
  showAbove,
  showLeft,
  showRight,
  showAt,
  showModal,
  dismiss,
  show,
  hide,
  type MirrorElement,
} from '../../compiler/runtime/dom-runtime'

describe('Positioning Functions', () => {
  let dom: JSDOM
  let document: Document
  let window: Window & typeof globalThis

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
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
    width?: number
    height?: number
    hidden?: boolean
  } = {}): MirrorElement {
    const el = document.createElement('div') as MirrorElement
    if (opts.id) el.dataset.mirrorId = opts.id
    if (opts.name) el.dataset.mirrorName = opts.name
    el.style.width = `${opts.width || 100}px`
    el.style.height = `${opts.height || 50}px`
    if (opts.hidden) {
      el.style.display = 'none'
      el.hidden = true
    }
    document.body.appendChild(el)
    return el
  }

  describe('showBelow', () => {
    it('positions element below trigger', () => {
      const trigger = createTestElement({ id: 'trigger' })
      const overlay = createTestElement({ id: 'overlay', hidden: true })

      // Mock getBoundingClientRect for trigger
      trigger.getBoundingClientRect = () => ({
        top: 100,
        bottom: 150,
        left: 50,
        right: 150,
        width: 100,
        height: 50,
        x: 50,
        y: 100,
        toJSON: () => {},
      })

      showBelow(overlay, trigger)

      expect(overlay.style.display).not.toBe('none')
      expect(overlay.hidden).toBe(false)
      expect(overlay.style.position).toBe('fixed')
    })

    it('accepts element name as string', () => {
      const trigger = createTestElement({ id: 'trigger' })
      const overlay = createTestElement({ name: 'MyOverlay', hidden: true })

      trigger.getBoundingClientRect = () => ({
        top: 100,
        bottom: 150,
        left: 50,
        right: 150,
        width: 100,
        height: 50,
        x: 50,
        y: 100,
        toJSON: () => {},
      })

      showBelow('MyOverlay', trigger)

      expect(overlay.style.display).not.toBe('none')
    })
  })

  describe('showAbove', () => {
    it('positions element above trigger', () => {
      const trigger = createTestElement({ id: 'trigger' })
      const overlay = createTestElement({ id: 'overlay', hidden: true })

      trigger.getBoundingClientRect = () => ({
        top: 200,
        bottom: 250,
        left: 50,
        right: 150,
        width: 100,
        height: 50,
        x: 50,
        y: 200,
        toJSON: () => {},
      })

      showAbove(overlay, trigger)

      expect(overlay.style.display).not.toBe('none')
      expect(overlay.style.position).toBe('fixed')
    })
  })

  describe('showModal', () => {
    it('shows element centered with backdrop', () => {
      const modal = createTestElement({ id: 'modal', width: 400, height: 300, hidden: true })

      showModal(modal, true)

      expect(modal.style.display).not.toBe('none')
      expect(modal.hidden).toBe(false)
      expect(modal.style.position).toBe('fixed')
      expect(modal.style.zIndex).toBe('1000')
      expect(modal.dataset.hasBackdrop).toBe('true')

      // Check backdrop was created
      const backdrop = document.querySelector('[data-mirror-backdrop]')
      expect(backdrop).toBeTruthy()
    })

    it('shows modal without backdrop when false', () => {
      const modal = createTestElement({ id: 'modal', hidden: true })

      showModal(modal, false)

      expect(modal.style.display).not.toBe('none')
      expect(modal.dataset.hasBackdrop).toBeUndefined()

      const backdrop = document.querySelector('[data-mirror-backdrop]')
      expect(backdrop).toBeNull()
    })
  })

  describe('dismiss', () => {
    it('hides element and cleans up', () => {
      const overlay = createTestElement({ id: 'overlay' })
      overlay.style.position = 'fixed'
      overlay.style.top = '100px'
      overlay.style.left = '50px'
      overlay.style.zIndex = '1000'
      overlay.dataset.originalPosition = ''

      dismiss(overlay)

      expect(overlay.style.display).toBe('none')
      expect(overlay.hidden).toBe(true)
      expect(overlay.style.top).toBe('')
      expect(overlay.style.left).toBe('')
      expect(overlay.style.zIndex).toBe('')
    })

    it('removes backdrop when dismissing modal', () => {
      const modal = createTestElement({ id: 'modal', hidden: true })

      showModal(modal, true)
      expect(document.querySelector('[data-mirror-backdrop]')).toBeTruthy()

      dismiss(modal)

      const backdrop = document.querySelector('[data-mirror-backdrop]') as HTMLElement
      expect(backdrop?.style.display).toBe('none')
    })

    it('accepts element name as string', () => {
      const overlay = createTestElement({ name: 'MyOverlay' })

      dismiss('MyOverlay')

      expect(overlay.style.display).toBe('none')
    })
  })

  describe('showAt', () => {
    it('positions element with custom position', () => {
      const trigger = createTestElement({ id: 'trigger' })
      const overlay = createTestElement({ id: 'overlay', hidden: true })

      trigger.getBoundingClientRect = () => ({
        top: 100,
        bottom: 150,
        left: 50,
        right: 150,
        width: 100,
        height: 50,
        x: 50,
        y: 100,
        toJSON: () => {},
      })

      showAt(overlay, trigger, 'below', { offset: 8 })

      expect(overlay.style.display).not.toBe('none')
      expect(overlay.style.position).toBe('fixed')
    })

    it('centers element when position is center', () => {
      const overlay = createTestElement({ id: 'overlay', hidden: true })

      showAt(overlay, null, 'center')

      expect(overlay.style.display).not.toBe('none')
      expect(overlay.style.position).toBe('fixed')
    })
  })
})
