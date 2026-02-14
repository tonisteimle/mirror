/**
 * Tests für Intent History Module
 */

import { describe, it, expect } from 'vitest'
import {
  createHistory,
  initHistory,
  pushHistory,
  undo,
  redo,
  getCurrentIntent,
  canUndo,
  canRedo,
  getRecentChanges,
  getHistoryContext
} from '../../intent/history'
import type { Intent } from '../../intent/schema'

// =============================================================================
// Test Utilities
// =============================================================================

function createTestIntent(text: string): Intent {
  return {
    tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
    components: [],
    layout: [{ component: 'Box', text }]
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('Intent History', () => {
  describe('createHistory', () => {
    it('creates empty history', () => {
      const history = createHistory()
      expect(history.past).toHaveLength(0)
      expect(history.present).toBeNull()
      expect(history.future).toHaveLength(0)
    })

    it('uses default max entries', () => {
      const history = createHistory()
      expect(history.maxEntries).toBe(50)
    })

    it('accepts custom max entries', () => {
      const history = createHistory(100)
      expect(history.maxEntries).toBe(100)
    })
  })

  describe('initHistory', () => {
    it('initializes with an intent', () => {
      const history = createHistory()
      const intent = createTestIntent('Initial')
      const initialized = initHistory(history, intent, 'Initial state')

      expect(initialized.present).not.toBeNull()
      expect(initialized.present?.intent.layout[0].text).toBe('Initial')
      expect(initialized.present?.description).toBe('Initial state')
    })

    it('clears past and future', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'Change B')

      const reinitialized = initHistory(history, createTestIntent('New'), 'Fresh start')
      expect(reinitialized.past).toHaveLength(0)
      expect(reinitialized.future).toHaveLength(0)
    })
  })

  describe('pushHistory', () => {
    it('adds new entry to history', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'Changed to B')

      expect(history.present?.intent.layout[0].text).toBe('B')
      expect(history.past).toHaveLength(1)
      expect(history.past[0].intent.layout[0].text).toBe('A')
    })

    it('stores user request', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'Changed', 'Make it B')

      expect(history.present?.userRequest).toBe('Make it B')
    })

    it('clears future on new action', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'To B')
      history = undo(history)
      expect(history.future).toHaveLength(1)

      history = pushHistory(history, createTestIntent('C'), 'To C')
      expect(history.future).toHaveLength(0)
    })

    it('respects max entries', () => {
      let history = createHistory(3)
      history = initHistory(history, createTestIntent('A'))

      for (let i = 1; i <= 10; i++) {
        history = pushHistory(history, createTestIntent(`Entry ${i}`), `Change ${i}`)
      }

      expect(history.past.length).toBeLessThanOrEqual(3)
    })
  })

  describe('undo', () => {
    it('undoes last change', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'To B')
      history = undo(history)

      expect(history.present?.intent.layout[0].text).toBe('A')
    })

    it('moves current to future', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'To B')
      history = undo(history)

      expect(history.future).toHaveLength(1)
      expect(history.future[0].intent.layout[0].text).toBe('B')
    })

    it('does nothing when no past', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      const before = history

      history = undo(history)
      expect(history.present?.intent.layout[0].text).toBe('A')
    })

    it('can undo multiple times', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'To B')
      history = pushHistory(history, createTestIntent('C'), 'To C')
      history = pushHistory(history, createTestIntent('D'), 'To D')

      history = undo(history)
      expect(history.present?.intent.layout[0].text).toBe('C')

      history = undo(history)
      expect(history.present?.intent.layout[0].text).toBe('B')

      history = undo(history)
      expect(history.present?.intent.layout[0].text).toBe('A')
    })
  })

  describe('redo', () => {
    it('redoes undone change', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'To B')
      history = undo(history)
      history = redo(history)

      expect(history.present?.intent.layout[0].text).toBe('B')
    })

    it('does nothing when no future', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = redo(history)

      expect(history.present?.intent.layout[0].text).toBe('A')
    })

    it('can redo multiple times', () => {
      let history = createHistory()
      history = initHistory(history, createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'To B')
      history = pushHistory(history, createTestIntent('C'), 'To C')

      history = undo(history)
      history = undo(history)

      history = redo(history)
      expect(history.present?.intent.layout[0].text).toBe('B')

      history = redo(history)
      expect(history.present?.intent.layout[0].text).toBe('C')
    })
  })

  describe('canUndo / canRedo', () => {
    it('canUndo returns false initially', () => {
      const history = initHistory(createHistory(), createTestIntent('A'))
      expect(canUndo(history)).toBe(false)
    })

    it('canUndo returns true after push', () => {
      let history = initHistory(createHistory(), createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'To B')
      expect(canUndo(history)).toBe(true)
    })

    it('canRedo returns false initially', () => {
      const history = initHistory(createHistory(), createTestIntent('A'))
      expect(canRedo(history)).toBe(false)
    })

    it('canRedo returns true after undo', () => {
      let history = initHistory(createHistory(), createTestIntent('A'))
      history = pushHistory(history, createTestIntent('B'), 'To B')
      history = undo(history)
      expect(canRedo(history)).toBe(true)
    })
  })

  describe('getCurrentIntent', () => {
    it('returns null for empty history', () => {
      const history = createHistory()
      expect(getCurrentIntent(history)).toBeNull()
    })

    it('returns current intent', () => {
      const history = initHistory(createHistory(), createTestIntent('Current'))
      const intent = getCurrentIntent(history)
      expect(intent?.layout[0].text).toBe('Current')
    })
  })

  describe('getRecentChanges', () => {
    it('returns recent change descriptions', () => {
      let history = initHistory(createHistory(), createTestIntent('A'), 'Initial')
      history = pushHistory(history, createTestIntent('B'), 'Changed to B')
      history = pushHistory(history, createTestIntent('C'), 'Changed to C')

      const changes = getRecentChanges(history, 3)
      expect(changes).toContain('Initial')
      expect(changes).toContain('Changed to B')
      expect(changes).toContain('Changed to C')
    })
  })

  describe('getHistoryContext', () => {
    it('returns empty for no history', () => {
      const history = initHistory(createHistory(), createTestIntent('A'))
      const context = getHistoryContext(history)
      expect(context).toBe('')
    })

    it('returns formatted history', () => {
      let history = initHistory(createHistory(), createTestIntent('A'), 'Initial')
      history = pushHistory(history, createTestIntent('B'), 'Made it blue', 'Mach es blau')
      history = pushHistory(history, createTestIntent('C'), 'Added padding', 'Füge Padding hinzu')

      // getHistoryContext shows past entries - after two pushes, 'Made it blue' is in past
      const context = getHistoryContext(history)
      expect(context).toContain('Letzte Änderungen')
      expect(context).toContain('Mach es blau')
    })
  })
})
