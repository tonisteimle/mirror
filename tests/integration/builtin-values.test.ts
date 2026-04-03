/**
 * Integration Tests for Built-in Value Functions
 *
 * Tests: get, set, increment, decrement, reset
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  get,
  set,
  increment,
  decrement,
  reset,
} from '../../compiler/runtime/dom-runtime'

describe('Value Functions', () => {
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
    // Reset state
    window._mirrorState = {}
  })

  afterEach(() => {
    dom.window.close()
  })

  describe('set', () => {
    it('sets a numeric value', () => {
      set('count', 5)
      expect(get('count')).toBe(5)
    })

    it('sets a string value', () => {
      set('name', 'Alice')
      expect(get('name')).toBe('Alice')
    })

    it('handles $ prefix in token name', () => {
      set('$count', 10)
      expect(get('count')).toBe(10)
      expect(get('$count')).toBe(10)
    })

    it('overwrites existing value', () => {
      set('count', 5)
      set('count', 10)
      expect(get('count')).toBe(10)
    })
  })

  describe('get', () => {
    it('returns undefined for non-existent token', () => {
      expect(get('nonexistent')).toBeUndefined()
    })

    it('returns correct value', () => {
      set('value', 42)
      expect(get('value')).toBe(42)
    })

    it('handles $ prefix', () => {
      set('count', 100)
      expect(get('$count')).toBe(100)
    })
  })

  describe('increment', () => {
    it('increments by 1 by default', () => {
      set('count', 5)
      increment('count')
      expect(get('count')).toBe(6)
    })

    it('increments from 0 if not set', () => {
      increment('newCount')
      expect(get('newCount')).toBe(1)
    })

    it('respects max constraint', () => {
      set('count', 9)
      increment('count', { max: 10 })
      expect(get('count')).toBe(10)

      increment('count', { max: 10 })
      expect(get('count')).toBe(10) // Should not exceed max
    })

    it('handles custom step', () => {
      set('count', 0)
      increment('count', { step: 5 })
      expect(get('count')).toBe(5)
    })

    it('handles $ prefix', () => {
      set('count', 3)
      increment('$count')
      expect(get('count')).toBe(4)
    })
  })

  describe('decrement', () => {
    it('decrements by 1 by default', () => {
      set('count', 5)
      decrement('count')
      expect(get('count')).toBe(4)
    })

    it('decrements from 0 if not set', () => {
      decrement('newCount')
      expect(get('newCount')).toBe(-1)
    })

    it('respects min constraint', () => {
      set('count', 1)
      decrement('count', { min: 0 })
      expect(get('count')).toBe(0)

      decrement('count', { min: 0 })
      expect(get('count')).toBe(0) // Should not go below min
    })

    it('handles custom step', () => {
      set('count', 10)
      decrement('count', { step: 3 })
      expect(get('count')).toBe(7)
    })

    it('handles $ prefix', () => {
      set('count', 5)
      decrement('$count')
      expect(get('count')).toBe(4)
    })
  })

  describe('reset', () => {
    it('resets to 0 by default', () => {
      set('count', 100)
      reset('count')
      expect(get('count')).toBe(0)
    })

    it('resets to custom initial value', () => {
      set('count', 100)
      reset('count', 1)
      expect(get('count')).toBe(1)
    })

    it('handles $ prefix', () => {
      set('count', 50)
      reset('$count', 10)
      expect(get('count')).toBe(10)
    })
  })

  describe('DOM binding', () => {
    it('updates elements with data-token-binding', () => {
      const el = document.createElement('span')
      el.dataset.tokenBinding = 'count'
      document.body.appendChild(el)

      set('count', 42)
      expect(el.textContent).toBe('42')
    })

    it('updates elements with data-mirror-token', () => {
      const el = document.createElement('div')
      el.dataset.mirrorToken = 'name'
      document.body.appendChild(el)

      set('name', 'Hello')
      expect(el.textContent).toBe('Hello')
    })

    it('updates input values', () => {
      const input = document.createElement('input')
      input.dataset.tokenBinding = 'value'
      document.body.appendChild(input)

      set('value', 123)
      expect(input.value).toBe('123')
    })

    it('updates multiple bound elements', () => {
      const el1 = document.createElement('span')
      el1.dataset.tokenBinding = 'count'
      const el2 = document.createElement('span')
      el2.dataset.tokenBinding = 'count'
      document.body.appendChild(el1)
      document.body.appendChild(el2)

      set('count', 99)
      expect(el1.textContent).toBe('99')
      expect(el2.textContent).toBe('99')
    })
  })
})
