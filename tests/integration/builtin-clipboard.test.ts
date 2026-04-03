/**
 * Integration Tests for Built-in Clipboard Functions
 *
 * Tests: copy
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  copy,
  applyState,
  removeState,
} from '../../compiler/runtime/dom-runtime'

describe('Clipboard Functions', () => {
  let dom: JSDOM
  let document: Document
  let window: Window & typeof globalThis
  let mockClipboard: { writeText: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
    })
    document = dom.window.document
    window = dom.window as unknown as Window & typeof globalThis
    global.document = document
    global.window = window

    // Mock clipboard API
    mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    dom.window.close()
    vi.restoreAllMocks()
  })

  describe('copy', () => {
    it('copies string text to clipboard', async () => {
      await copy('Hello World')
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Hello World')
    })

    it('copies element textContent to clipboard', async () => {
      const el = document.createElement('span')
      el.textContent = 'Element text'
      document.body.appendChild(el)

      await copy(el)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Element text')
    })

    it('applies copied state to trigger element', async () => {
      const trigger = document.createElement('button') as any
      trigger._stateStyles = { copied: { backgroundColor: '#10b981' } }
      trigger._baseStyles = { backgroundColor: '#333' }
      document.body.appendChild(trigger)

      await copy('text', trigger)

      // State should be applied
      expect(trigger.dataset.state).toBe('copied')
    })

    it('removes copied state after timeout', async () => {
      vi.useFakeTimers()
      const trigger = document.createElement('button') as any
      trigger._stateStyles = { copied: { backgroundColor: '#10b981' } }
      trigger._baseStyles = { backgroundColor: '#333' }
      document.body.appendChild(trigger)

      await copy('text', trigger)
      expect(trigger.dataset.state).toBe('copied')

      // Fast-forward 2 seconds
      await vi.advanceTimersByTimeAsync(2000)

      // State should be removed (back to undefined since no previous state)
      expect(trigger.dataset.state).toBeUndefined()
      vi.useRealTimers()
    })

    it('handles empty string', async () => {
      await copy('')
      expect(mockClipboard.writeText).toHaveBeenCalledWith('')
    })

    it('handles element with empty textContent', async () => {
      const el = document.createElement('span')
      document.body.appendChild(el)

      await copy(el)
      expect(mockClipboard.writeText).toHaveBeenCalledWith('')
    })
  })

  describe('copy fallback', () => {
    it('uses execCommand fallback when clipboard API fails', async () => {
      // Make clipboard API fail
      mockClipboard.writeText.mockRejectedValue(new Error('Not allowed'))

      // Mock execCommand
      const execCommandSpy = vi.fn().mockReturnValue(true)
      document.execCommand = execCommandSpy

      await copy('fallback text')

      expect(execCommandSpy).toHaveBeenCalledWith('copy')
    })

    it('cleans up textarea after fallback', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Not allowed'))
      document.execCommand = vi.fn().mockReturnValue(true)

      await copy('test')

      // Textarea should be removed after copy
      const textareas = document.querySelectorAll('textarea')
      expect(textareas.length).toBe(0)
    })
  })
})
