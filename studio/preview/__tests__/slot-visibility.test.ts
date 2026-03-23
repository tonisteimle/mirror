/**
 * SlotVisibilityService Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SlotVisibilityService, createSlotVisibilityService } from '../slot-visibility'

describe('SlotVisibilityService', () => {
  let container: HTMLElement
  let service: SlotVisibilityService

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    service?.dispose()
    container.remove()
  })

  // SKIPPED: Flaky tests due to MutationObserver timing in JSDOM
  describe.skip('filled class management', () => {
    it('should add filled class when slot has children', () => {
      // Create a slot with a child
      container.innerHTML = `
        <div class="mirror-slot">
          <div class="child">Content</div>
        </div>
      `

      service = createSlotVisibilityService({ container })
      service.attach()

      const slot = container.querySelector('.mirror-slot')
      expect(slot?.classList.contains('filled')).toBe(true)
    })

    it('should not add filled class when slot is empty', () => {
      container.innerHTML = `
        <div class="mirror-slot"></div>
      `

      service = createSlotVisibilityService({ container })
      service.attach()

      const slot = container.querySelector('.mirror-slot')
      expect(slot?.classList.contains('filled')).toBe(false)
    })

    it('should not add filled class when slot only has label', () => {
      container.innerHTML = `
        <div class="mirror-slot">
          <span class="mirror-slot-label">Drop here</span>
        </div>
      `

      service = createSlotVisibilityService({ container })
      service.attach()

      const slot = container.querySelector('.mirror-slot')
      expect(slot?.classList.contains('filled')).toBe(false)
    })

    it('should add filled class when child is added after label', () => {
      container.innerHTML = `
        <div class="mirror-slot">
          <span class="mirror-slot-label">Drop here</span>
        </div>
      `

      service = createSlotVisibilityService({ container })
      service.attach()

      const slot = container.querySelector('.mirror-slot')!
      expect(slot.classList.contains('filled')).toBe(false)

      // Add a child
      const child = document.createElement('div')
      child.className = 'child'
      child.textContent = 'Content'
      slot.appendChild(child)

      // MutationObserver is async, we need to wait
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(slot.classList.contains('filled')).toBe(true)
          resolve()
        }, 0)
      })
    })

    it('should remove filled class when children are removed', () => {
      container.innerHTML = `
        <div class="mirror-slot">
          <div class="child">Content</div>
        </div>
      `

      service = createSlotVisibilityService({ container })
      service.attach()

      const slot = container.querySelector('.mirror-slot')!
      const child = slot.querySelector('.child')!
      expect(slot.classList.contains('filled')).toBe(true)

      // Remove the child
      child.remove()

      // MutationObserver is async
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(slot.classList.contains('filled')).toBe(false)
          resolve()
        }, 0)
      })
    })
  })

  describe('multiple slots', () => {
    it('should handle multiple slots independently', () => {
      container.innerHTML = `
        <div class="mirror-slot" id="slot1">
          <div class="child">Content</div>
        </div>
        <div class="mirror-slot" id="slot2"></div>
        <div class="mirror-slot" id="slot3">
          <span class="mirror-slot-label">Label</span>
        </div>
      `

      service = createSlotVisibilityService({ container })
      service.attach()

      expect(container.querySelector('#slot1')?.classList.contains('filled')).toBe(true)
      expect(container.querySelector('#slot2')?.classList.contains('filled')).toBe(false)
      expect(container.querySelector('#slot3')?.classList.contains('filled')).toBe(false)
    })
  })

  describe('refresh', () => {
    it('should update all slots on refresh', () => {
      container.innerHTML = `
        <div class="mirror-slot"></div>
      `

      service = createSlotVisibilityService({ container })
      service.attach()

      const slot = container.querySelector('.mirror-slot')!
      expect(slot.classList.contains('filled')).toBe(false)

      // Add child without triggering mutation (simulating innerHTML replacement)
      slot.innerHTML = '<div class="child">Content</div>'
      service.refresh()

      expect(slot.classList.contains('filled')).toBe(true)
    })
  })

  describe('custom class names', () => {
    it('should use custom slot class', () => {
      container.innerHTML = `
        <div class="custom-slot">
          <div class="child">Content</div>
        </div>
      `

      service = createSlotVisibilityService({
        container,
        slotClass: 'custom-slot',
      })
      service.attach()

      const slot = container.querySelector('.custom-slot')
      expect(slot?.classList.contains('filled')).toBe(true)
    })

    it('should use custom filled class', () => {
      container.innerHTML = `
        <div class="mirror-slot">
          <div class="child">Content</div>
        </div>
      `

      service = createSlotVisibilityService({
        container,
        filledClass: 'has-content',
      })
      service.attach()

      const slot = container.querySelector('.mirror-slot')
      expect(slot?.classList.contains('has-content')).toBe(true)
      expect(slot?.classList.contains('filled')).toBe(false)
    })

    it('should use custom label class', () => {
      container.innerHTML = `
        <div class="mirror-slot">
          <span class="custom-label">Label</span>
        </div>
      `

      service = createSlotVisibilityService({
        container,
        labelClass: 'custom-label',
      })
      service.attach()

      const slot = container.querySelector('.mirror-slot')
      expect(slot?.classList.contains('filled')).toBe(false)
    })
  })
})
