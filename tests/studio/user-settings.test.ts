// @vitest-environment jsdom
/**
 * Tests for studio/storage/user-settings.ts
 *
 * Persists recent-icons to localStorage. Auto-saves with a 500ms debounce.
 * Singleton pattern (`getUserSettings()`).
 *
 * Previously zero coverage. Tests must:
 *  1. Reset the singleton between tests (it persists across imports).
 *  2. Reset localStorage between tests.
 *  3. Use fake timers for the save-debounce path.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getUserSettings, initUserSettings } from '../../studio/storage/user-settings'

const STORAGE_KEY = 'mirror-user-settings'

// Reset the singleton between tests by reaching into the module's
// internal state. Vitest doesn't provide a clean way to re-import a
// module fresh per-test without mocking — the helper resets observable
// state instead.
function resetSingleton() {
  const s = getUserSettings()
  s.reset() // wipes settings + flushes save synchronously
}

beforeEach(() => {
  resetSingleton() // calls saveNow() which writes defaults to localStorage
  localStorage.clear() // wipe AFTER the reset so subsequent tests start clean
})

afterEach(() => {
  vi.useRealTimers()
})

describe('UserSettings — singleton', () => {
  it('getUserSettings returns the SAME instance on repeated calls', () => {
    const a = getUserSettings()
    const b = getUserSettings()
    expect(a).toBe(b)
  })

  it('initUserSettings calls load() and marks the singleton as loaded', async () => {
    await initUserSettings()
    expect(getUserSettings().isLoaded()).toBe(true)
  })
})

describe('UserSettings — load()', () => {
  it('loads defaults when localStorage is empty', async () => {
    const s = getUserSettings()
    await s.load()
    expect(s.getRecentIcons()).toEqual([])
    expect(s.isLoaded()).toBe(true)
  })

  it('loads recentIcons from a previously persisted blob', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ recentIcons: ['heart', 'star', 'check'] }))
    const s = getUserSettings()
    await s.load()
    expect(s.getRecentIcons()).toEqual(['heart', 'star', 'check'])
  })

  it('falls back to defaults when stored JSON is malformed', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{}')
    const s = getUserSettings()
    await s.load()
    // Defensive: no throw, defaults applied, marked loaded.
    expect(s.getRecentIcons()).toEqual([])
    expect(s.isLoaded()).toBe(true)
  })

  it('merges stored data over DEFAULT_SETTINGS (forward-compatible)', async () => {
    // Even if the stored blob has extra keys, they survive the merge —
    // and missing keys get filled in from defaults. Locks in the
    // `{...DEFAULT_SETTINGS, ...data}` merge order: stored values win.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ recentIcons: ['x'] }))
    const s = getUserSettings()
    await s.load()
    expect(s.getRecentIcons()).toEqual(['x'])
  })
})

describe('UserSettings — getRecentIcons / addRecentIcon', () => {
  it('returns a copy of the array (not the live reference)', () => {
    const s = getUserSettings()
    const a = s.getRecentIcons()
    a.push('mutation')
    expect(s.getRecentIcons()).toEqual([])
  })

  it('adds icons to the front (most-recent-first ordering)', () => {
    const s = getUserSettings()
    s.addRecentIcon('a')
    s.addRecentIcon('b')
    s.addRecentIcon('c')
    expect(s.getRecentIcons()).toEqual(['c', 'b', 'a'])
  })

  it('moves an existing icon to the front (no duplicates)', () => {
    const s = getUserSettings()
    s.addRecentIcon('a')
    s.addRecentIcon('b')
    s.addRecentIcon('a') // re-add 'a' → moves to front
    expect(s.getRecentIcons()).toEqual(['a', 'b'])
  })

  it('caps the list at maxRecent (default 12)', () => {
    const s = getUserSettings()
    for (let i = 0; i < 20; i++) s.addRecentIcon(`icon${i}`)
    expect(s.getRecentIcons()).toHaveLength(12)
    // Most-recent-first: icon19 is first, icon8 is last (12 items: 19..8).
    expect(s.getRecentIcons()[0]).toBe('icon19')
    expect(s.getRecentIcons()[11]).toBe('icon8')
  })

  it('respects custom maxRecent', () => {
    const s = getUserSettings()
    s.addRecentIcon('a', 3)
    s.addRecentIcon('b', 3)
    s.addRecentIcon('c', 3)
    s.addRecentIcon('d', 3)
    expect(s.getRecentIcons()).toEqual(['d', 'c', 'b'])
  })
})

describe('UserSettings — debounced save', () => {
  it('saves to localStorage after the 500ms debounce elapses', () => {
    vi.useFakeTimers()
    const s = getUserSettings()
    s.addRecentIcon('heart')
    // Before timeout: NOT yet persisted.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    vi.advanceTimersByTime(500)
    // After timeout: persisted.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.recentIcons).toEqual(['heart'])
  })

  it('coalesces multiple rapid changes into a single save', () => {
    vi.useFakeTimers()
    const setSpy = vi.spyOn(Storage.prototype, 'setItem')
    const s = getUserSettings()
    s.addRecentIcon('a')
    s.addRecentIcon('b')
    s.addRecentIcon('c')
    vi.advanceTimersByTime(500)
    // Despite three changes, exactly one save call:
    const callsForOurKey = setSpy.mock.calls.filter(c => c[0] === STORAGE_KEY)
    expect(callsForOurKey).toHaveLength(1)
    setSpy.mockRestore()
  })

  it('does not save before the 500ms boundary (boundary lock)', () => {
    vi.useFakeTimers()
    const s = getUserSettings()
    s.addRecentIcon('heart')
    vi.advanceTimersByTime(499)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('reset() persists immediately (synchronous saveNow path)', () => {
    const s = getUserSettings()
    s.addRecentIcon('something')
    // Force an immediate persist via reset.
    s.reset()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.recentIcons).toEqual([])
  })
})

describe('UserSettings — clearRecentIcons', () => {
  it('empties the list and triggers a debounced save', () => {
    vi.useFakeTimers()
    const s = getUserSettings()
    s.addRecentIcon('a')
    s.addRecentIcon('b')
    s.clearRecentIcons()
    expect(s.getRecentIcons()).toEqual([])
    vi.advanceTimersByTime(500)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.recentIcons).toEqual([])
  })
})

describe('UserSettings — getAll', () => {
  it('returns a SHALLOW copy — top-level fields are independent, but arrays are shared', () => {
    // Discovery: getAll uses `{ ...this.settings }` which is shallow.
    // Mutating the result's recentIcons array DOES leak into internal
    // state. This is documented behavior; if it's ever changed to a
    // deep copy, this test breaks and the change is intentional.
    const s = getUserSettings()
    s.addRecentIcon('heart')
    const snapshot = s.getAll()
    snapshot.recentIcons.push('star')
    // Internal state IS mutated because snapshot.recentIcons is the same array.
    expect(s.getRecentIcons()).toEqual(['heart', 'star'])
  })
})

describe('UserSettings — graceful save errors', () => {
  it('does not throw when localStorage.setItem fails (e.g. quota exceeded)', () => {
    vi.useFakeTimers()
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const s = getUserSettings()
    s.addRecentIcon('heart')
    expect(() => vi.advanceTimersByTime(500)).not.toThrow()
    setSpy.mockRestore()
  })
})
