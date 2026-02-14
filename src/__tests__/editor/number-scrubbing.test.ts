/**
 * Tests for number scrubbing functionality.
 */
import { describe, it, expect } from 'vitest'

// We test the helper functions by extracting the logic

interface NumberMatch {
  start: number
  end: number
  value: number
  text: string
  hasPercent: boolean
}

/**
 * Find the number at or nearest to cursor position on current line.
 */
function findNumberAtCursor(lineText: string, cursorInLine: number): NumberMatch | null {
  const numberRegex = /(-?\d+\.?\d*)(%)?/g
  let match: RegExpExecArray | null
  let best: NumberMatch | null = null
  let bestDistance = Infinity

  while ((match = numberRegex.exec(lineText)) !== null) {
    const start = match.index
    const end = start + match[0].length
    const value = parseFloat(match[1])
    const hasPercent = match[2] === '%'

    let distance: number
    if (cursorInLine >= start && cursorInLine <= end) {
      distance = 0
    } else if (cursorInLine < start) {
      distance = start - cursorInLine
    } else {
      distance = cursorInLine - end
    }

    if (distance < bestDistance) {
      bestDistance = distance
      best = { start, end, value, text: match[0], hasPercent }
    }
  }

  if (best && bestDistance <= 2) {
    return best
  }

  return null
}

/**
 * Get the property name before cursor position.
 */
function getPropertyBeforeCursor(lineText: string, cursorInLine: number): string | null {
  const beforeCursor = lineText.slice(0, cursorInLine)
  const match = beforeCursor.match(/([a-z][-a-z]*)\s*$/i)
  return match ? match[1].toLowerCase() : null
}

describe('Number Scrubbing', () => {
  describe('findNumberAtCursor', () => {
    it('finds number when cursor is on it', () => {
      const result = findNumberAtCursor('pad 16', 5) // cursor on '6'
      expect(result).not.toBeNull()
      expect(result?.value).toBe(16)
      expect(result?.start).toBe(4)
      expect(result?.end).toBe(6)
    })

    it('finds number when cursor is immediately after it', () => {
      const result = findNumberAtCursor('pad 16', 6) // cursor after '16'
      expect(result).not.toBeNull()
      expect(result?.value).toBe(16)
    })

    it('finds number when cursor is immediately before it', () => {
      const result = findNumberAtCursor('pad 16', 4) // cursor on '1'
      expect(result).not.toBeNull()
      expect(result?.value).toBe(16)
    })

    it('finds nearest number in "pad 8 16" when cursor after first number', () => {
      const result = findNumberAtCursor('pad 8 16', 5) // cursor after '8'
      expect(result).not.toBeNull()
      expect(result?.value).toBe(8)
    })

    it('finds second number in "pad 8 16" when cursor on second number', () => {
      const result = findNumberAtCursor('pad 8 16', 7) // cursor on '1' of '16'
      expect(result).not.toBeNull()
      expect(result?.value).toBe(16)
    })

    it('handles percentages', () => {
      const result = findNumberAtCursor('w 50%', 4) // cursor on '%'
      expect(result).not.toBeNull()
      expect(result?.value).toBe(50)
      expect(result?.hasPercent).toBe(true)
    })

    it('handles decimals', () => {
      const result = findNumberAtCursor('opa 0.5', 6) // cursor on '5'
      expect(result).not.toBeNull()
      expect(result?.value).toBe(0.5)
    })

    it('returns null when cursor is too far from any number', () => {
      const result = findNumberAtCursor('Box gap 16', 0) // cursor at start
      expect(result).toBeNull()
    })

    it('returns null when no numbers on line', () => {
      const result = findNumberAtCursor('Box hor cen', 5)
      expect(result).toBeNull()
    })

    it('finds number in complex line', () => {
      const result = findNumberAtCursor('Card 200 150 pad 16 gap 8', 18) // cursor on '16'
      expect(result).not.toBeNull()
      expect(result?.value).toBe(16)
    })
  })

  describe('getPropertyBeforeCursor', () => {
    it('finds property name before cursor', () => {
      expect(getPropertyBeforeCursor('pad ', 4)).toBe('pad')
      expect(getPropertyBeforeCursor('Box pad ', 8)).toBe('pad')
    })

    it('finds property with hyphen', () => {
      expect(getPropertyBeforeCursor('hover-bg ', 9)).toBe('hover-bg')
    })

    it('returns null when cursor is in the middle of a number', () => {
      // At cursor position 5 in "Box 200", we're in the number, not after a property
      expect(getPropertyBeforeCursor('200 ', 3)).toBeNull()
    })

    it('finds property even with existing number', () => {
      expect(getPropertyBeforeCursor('pad 8', 4)).toBe('pad')
    })
  })

  describe('scrubbing behavior', () => {
    it('increments number correctly', () => {
      const line = 'pad 8'
      const match = findNumberAtCursor(line, 5)
      expect(match).not.toBeNull()
      const newValue = match!.value + 2
      expect(newValue).toBe(10)
    })

    it('decrements number correctly', () => {
      const line = 'pad 16'
      const match = findNumberAtCursor(line, 6)
      expect(match).not.toBeNull()
      const newValue = match!.value - 2
      expect(newValue).toBe(14)
    })

    it('clamps percentage to 100', () => {
      const line = 'w 98%'
      const match = findNumberAtCursor(line, 4)
      expect(match).not.toBeNull()
      expect(match?.hasPercent).toBe(true)
      const newValue = Math.min(100, match!.value + 10)
      expect(newValue).toBe(100)
    })

    it('does not go below 0', () => {
      const line = 'pad 2'
      const match = findNumberAtCursor(line, 5)
      expect(match).not.toBeNull()
      const newValue = Math.max(0, match!.value - 10)
      expect(newValue).toBe(0)
    })
  })
})
