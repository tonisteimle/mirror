/**
 * Tests for semantic selection functionality.
 */
import { describe, it, expect } from 'vitest'

// Test helper functions extracted from the module

function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/)
  return match ? match[1].length : 0
}

function isOnComponentName(lineText: string, posInLine: number): boolean {
  const match = lineText.match(/^(\s*)([A-Z][a-zA-Z0-9]*)/)
  if (!match) return false
  const indent = match[1].length
  const nameEnd = indent + match[2].length
  return posInLine >= indent && posInLine <= nameEnd
}

function findColor(lineText: string, posInLine: number, lineFrom: number): { from: number, to: number } | null {
  const colorRegex = /#[0-9a-fA-F]{3,8}/g
  let match: RegExpExecArray | null
  while ((match = colorRegex.exec(lineText)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (posInLine >= start && posInLine <= end) {
      return { from: lineFrom + start, to: lineFrom + end }
    }
  }
  return null
}

function findString(lineText: string, posInLine: number, lineFrom: number): { from: number, to: number } | null {
  const stringRegex = /"[^"]*"/g
  let match: RegExpExecArray | null
  while ((match = stringRegex.exec(lineText)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (posInLine >= start && posInLine <= end) {
      return { from: lineFrom + start, to: lineFrom + end }
    }
  }
  return null
}

function findNumber(lineText: string, posInLine: number, lineFrom: number): { from: number, to: number } | null {
  const numberRegex = /-?\d+\.?\d*%?/g
  let match: RegExpExecArray | null
  while ((match = numberRegex.exec(lineText)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (posInLine >= start && posInLine <= end) {
      return { from: lineFrom + start, to: lineFrom + end }
    }
  }
  return null
}

describe('Semantic Selection', () => {
  describe('getIndentLevel', () => {
    it('returns 0 for no indent', () => {
      expect(getIndentLevel('Card pad 16')).toBe(0)
    })

    it('returns correct indent for 2 spaces', () => {
      expect(getIndentLevel('  Title "Hello"')).toBe(2)
    })

    it('returns correct indent for 4 spaces', () => {
      expect(getIndentLevel('    Nested')).toBe(4)
    })
  })

  describe('isOnComponentName', () => {
    it('detects cursor on component name', () => {
      expect(isOnComponentName('Card pad 16', 0)).toBe(true)
      expect(isOnComponentName('Card pad 16', 2)).toBe(true)
      expect(isOnComponentName('Card pad 16', 4)).toBe(true) // end of "Card"
    })

    it('returns false when cursor is on property', () => {
      expect(isOnComponentName('Card pad 16', 5)).toBe(false)
      expect(isOnComponentName('Card pad 16', 8)).toBe(false)
    })

    it('handles indented components', () => {
      expect(isOnComponentName('  Title "Hello"', 2)).toBe(true)
      expect(isOnComponentName('  Title "Hello"', 5)).toBe(true)
      expect(isOnComponentName('  Title "Hello"', 7)).toBe(true) // end of "Title"
    })

    it('returns false for lowercase (properties)', () => {
      expect(isOnComponentName('pad 16', 0)).toBe(false)
    })
  })

  describe('findColor', () => {
    it('finds hex color when cursor is on it', () => {
      const result = findColor('Box bg #3B82F6', 8, 0)
      expect(result).toEqual({ from: 7, to: 14 })
    })

    it('finds short hex color', () => {
      const result = findColor('Box bg #FFF', 9, 0)
      expect(result).toEqual({ from: 7, to: 11 })
    })

    it('returns null when cursor not on color', () => {
      const result = findColor('Box bg #FFF', 2, 0)
      expect(result).toBeNull()
    })

    it('finds color with alpha', () => {
      const result = findColor('Box bg #3B82F680', 10, 0)
      expect(result).toEqual({ from: 7, to: 16 })
    })
  })

  describe('findString', () => {
    it('finds string when cursor is on it', () => {
      const result = findString('Button "Click me"', 10, 0)
      expect(result).toEqual({ from: 7, to: 17 })
    })

    it('returns null when cursor not on string', () => {
      const result = findString('Button "Click me"', 3, 0)
      expect(result).toBeNull()
    })

    it('finds empty string', () => {
      const result = findString('Input ""', 7, 0)
      expect(result).toEqual({ from: 6, to: 8 })
    })
  })

  describe('findNumber', () => {
    it('finds number when cursor is on it', () => {
      const result = findNumber('pad 16', 5, 0)
      expect(result).toEqual({ from: 4, to: 6 })
    })

    it('finds percentage', () => {
      const result = findNumber('w 50%', 3, 0)
      expect(result).toEqual({ from: 2, to: 5 })
    })

    it('finds decimal', () => {
      const result = findNumber('opa 0.5', 5, 0)
      expect(result).toEqual({ from: 4, to: 7 })
    })

    it('returns null when cursor not on number', () => {
      const result = findNumber('pad 16', 1, 0)
      expect(result).toBeNull()
    })
  })
})
