/**
 * Trigger Handlers Tests
 *
 * Tests for trigger character detection and handler dispatch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  findPropertyContext,
  handleTriggerCharacter,
  isTriggerCharacter,
  getTriggerForPicker,
  type TriggerHandlers,
  type TriggerState,
} from '../../editor/trigger-handlers'

describe('Trigger Handlers', () => {
  // ===========================================
  // findPropertyContext
  // ===========================================

  describe('findPropertyContext', () => {
    it('finds property context for simple property', () => {
      expect(findPropertyContext('col ')).toBe('col')
      expect(findPropertyContext('pad ')).toBe('pad')
      expect(findPropertyContext('mar ')).toBe('mar')
    })

    it('finds property context with values before cursor', () => {
      expect(findPropertyContext('pad l-r ')).toBe('pad')
      expect(findPropertyContext('mar t-b ')).toBe('mar')
    })

    it('returns undefined for unknown properties', () => {
      expect(findPropertyContext('unknown ')).toBeUndefined()
      expect(findPropertyContext('foo ')).toBeUndefined()
    })

    it('returns undefined for empty or no context', () => {
      expect(findPropertyContext('')).toBeUndefined()
      expect(findPropertyContext('Box')).toBeUndefined()
      expect(findPropertyContext('  ')).toBeUndefined()
    })

    it('handles indented property context', () => {
      // Matches property when it's the first word (after whitespace)
      expect(findPropertyContext('  col ')).toBe('col')
      expect(findPropertyContext('\t\tcol ')).toBe('col')
    })

    it('returns undefined when property is preceded by non-property word', () => {
      // The regex matches from first word boundary, so 'Box' is captured not 'col'
      expect(findPropertyContext('Box col ')).toBeUndefined()
    })
  })

  // ===========================================
  // handleTriggerCharacter
  // ===========================================

  describe('handleTriggerCharacter', () => {
    let handlers: TriggerHandlers
    let state: TriggerState
    let scheduledFn: (() => void) | null
    let scheduledDelay: number

    beforeEach(() => {
      handlers = {
        openColorPanel: vi.fn(),
        openTokenPicker: vi.fn(),
        openAiPanel: vi.fn(),
        openCommandPalette: vi.fn(),
      }
      state = {
        colorPanelOpen: false,
        aiPanelOpen: false,
      }
      scheduledFn = null
      scheduledDelay = 0
    })

    const scheduleTrigger = (fn: () => void, delay: number) => {
      scheduledFn = fn
      scheduledDelay = delay
    }

    it('handles # trigger for color panel', () => {
      const result = handleTriggerCharacter('#', 'col #', handlers, state, scheduleTrigger)

      expect(result).toBe(true)
      expect(scheduledFn).not.toBeNull()

      // Execute scheduled function
      scheduledFn!()
      expect(handlers.openColorPanel).toHaveBeenCalled()
    })

    it('handles $ trigger for token picker', () => {
      const result = handleTriggerCharacter('$', 'col $', handlers, state, scheduleTrigger)

      expect(result).toBe(true)
      scheduledFn!()
      expect(handlers.openTokenPicker).toHaveBeenCalled()
    })

    it('passes property context to token picker', () => {
      handleTriggerCharacter('$', 'col $', handlers, state, scheduleTrigger)
      scheduledFn!()

      expect(handlers.openTokenPicker).toHaveBeenCalledWith('col')
    })

    it.skip('handles ? trigger for AI panel', () => {
      // Note: '?' trigger for AI panel is not currently implemented in trigger-handlers
      // It's handled via keymaps instead
      const result = handleTriggerCharacter('?', 'Box ?', handlers, state, scheduleTrigger)

      expect(result).toBe(true)
      scheduledFn!()
      expect(handlers.openAiPanel).toHaveBeenCalled()
    })

    it('returns false for non-trigger characters', () => {
      expect(handleTriggerCharacter('a', 'a', handlers, state, scheduleTrigger)).toBe(false)
      expect(handleTriggerCharacter(' ', ' ', handlers, state, scheduleTrigger)).toBe(false)
      expect(handleTriggerCharacter('1', '1', handlers, state, scheduleTrigger)).toBe(false)
    })

    it('does not trigger inside strings', () => {
      const result = handleTriggerCharacter('#', '"color #', handlers, state, scheduleTrigger)

      expect(result).toBe(false)
      expect(scheduledFn).toBeNull()
    })

    it('does not trigger when color panel is open', () => {
      state.colorPanelOpen = true

      const result = handleTriggerCharacter('#', 'col #', handlers, state, scheduleTrigger)

      expect(result).toBe(false)
    })

    it('does not trigger when AI panel is open', () => {
      state.aiPanelOpen = true

      const result = handleTriggerCharacter('?', 'Box ?', handlers, state, scheduleTrigger)

      expect(result).toBe(false)
    })

    it('schedules trigger with delay', () => {
      handleTriggerCharacter('#', 'col #', handlers, state, scheduleTrigger)

      expect(scheduledDelay).toBeGreaterThan(0)
    })
  })

  // ===========================================
  // isTriggerCharacter
  // ===========================================

  describe('isTriggerCharacter', () => {
    it('returns true for trigger characters', () => {
      expect(isTriggerCharacter('#')).toBe(true)
      expect(isTriggerCharacter('$')).toBe(true)
      // Note: '?' and '/' triggers are handled by keymaps, not trigger-handlers
    })

    it('returns false for non-trigger characters', () => {
      expect(isTriggerCharacter('a')).toBe(false)
      expect(isTriggerCharacter(' ')).toBe(false)
      expect(isTriggerCharacter('@')).toBe(false)
      expect(isTriggerCharacter('')).toBe(false)
    })
  })

  // ===========================================
  // getTriggerForPicker
  // ===========================================

  describe('getTriggerForPicker', () => {
    it('returns correct trigger for each picker type', () => {
      expect(getTriggerForPicker('color')).toBe('#')
      expect(getTriggerForPicker('token')).toBe('$')
      expect(getTriggerForPicker('command')).toBe('/')
      // Note: 'ai' has no trigger character - AI panel is accessed via footer input
    })

    it('returns null for unknown picker types', () => {
      expect(getTriggerForPicker('unknown')).toBeNull()
      expect(getTriggerForPicker('')).toBeNull()
      expect(getTriggerForPicker('ai')).toBeNull() // AI has no trigger
    })
  })
})
