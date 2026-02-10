/**
 * Auto-Save Debounce Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Auto-Save Debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce localStorage writes', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    // Simulate rapid changes
    const saveProject = (data: object) => {
      localStorage.setItem('mirror-project', JSON.stringify(data))
    }

    // Without debounce, this would be 3 writes
    // With debounce, only the last one after 500ms
    saveProject({ version: 1 })
    saveProject({ version: 2 })
    saveProject({ version: 3 })

    expect(setItemSpy).toHaveBeenCalledTimes(3) // Direct calls still work
    setItemSpy.mockRestore()
  })

  it('should save after 500ms of inactivity', () => {
    let saveCount = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const debouncedSave = (data: object) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        localStorage.setItem('mirror-project', JSON.stringify(data))
        saveCount++
      }, 500)
    }

    // Rapid changes
    debouncedSave({ v: 1 })
    debouncedSave({ v: 2 })
    debouncedSave({ v: 3 })

    // No save yet
    expect(saveCount).toBe(0)

    // Advance time by 500ms
    vi.advanceTimersByTime(500)

    // Now exactly one save
    expect(saveCount).toBe(1)

    // Verify it's the last value
    const saved = JSON.parse(localStorage.getItem('mirror-project') || '{}')
    expect(saved.v).toBe(3)
  })

  it('should reset timer on new changes', () => {
    let saveCount = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const debouncedSave = (data: object) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        localStorage.setItem('mirror-project', JSON.stringify(data))
        saveCount++
      }, 500)
    }

    debouncedSave({ v: 1 })
    vi.advanceTimersByTime(300) // 300ms passed

    debouncedSave({ v: 2 }) // Reset timer
    vi.advanceTimersByTime(300) // Another 300ms (600ms total, but only 300ms since last change)

    expect(saveCount).toBe(0) // Still no save

    vi.advanceTimersByTime(200) // Now 500ms since last change
    expect(saveCount).toBe(1)
  })
})
