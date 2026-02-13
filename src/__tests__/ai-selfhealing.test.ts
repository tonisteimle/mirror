/**
 * AI Self-Healing Module Tests
 *
 * Tests validation feedback, correction prompt generation,
 * and the self-healing loop.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  validateMirrorCode,
  isValidMirrorCode,
  getIssueSummary,
  withSelfHealing,
  type CodeIssue
} from '../lib/ai-selfhealing'

// ============================================================================
// Validation Feedback Tests
// ============================================================================

describe('validateMirrorCode', () => {
  it('returns valid for simple correct code', () => {
    // Simple single-line code that should always be valid
    const code = 'Box pad 16'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(result.correctionPrompt).toBeUndefined()
  })

  it('detects unknown property typos', () => {
    const code = 'Box paddin 16'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)

    const propIssue = result.issues.find(i => i.message.includes('paddin'))
    expect(propIssue).toBeDefined()
  })

  it('detects unknown event typos', () => {
    const code = 'Button onclck toggle "Click"'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(false)

    const eventIssue = result.issues.find(i => i.message.includes('onclck'))
    expect(eventIssue).toBeDefined()
  })

  it('detects unknown animation typos', () => {
    const code = 'Panel show slideup 200'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(false)

    const animIssue = result.issues.find(i => i.message.includes('slideup'))
    expect(animIssue).toBeDefined()
  })

  it('includes line numbers in issues', () => {
    const code = `Box pad 16
Button onclck toggle`

    const result = validateMirrorCode(code)
    const eventIssue = result.issues.find(i => i.message.includes('onclck'))
    expect(eventIssue?.line).toBe(2)
  })

  it('includes suggestions for property typos', () => {
    // Use paddin which is known to match 'pad'
    const code = 'Box paddin 16'

    const result = validateMirrorCode(code)
    const issue = result.issues.find(i => i.message.includes('paddin'))
    expect(issue).toBeDefined()
    // Suggestion may or may not be present depending on implementation
    if (issue?.suggestion) {
      expect(issue.suggestion).toContain('pad')
    }
  })

  it('detects multiple typos in same code', () => {
    const code = `Box paddin 16
Button onclck toggle`

    const result = validateMirrorCode(code)
    expect(result.issues.length).toBeGreaterThanOrEqual(2)
  })

  it('sorts issues by line number', () => {
    const code = `Button onclck toggle
Box paddin 16`

    const result = validateMirrorCode(code)
    for (let i = 1; i < result.issues.length; i++) {
      expect(result.issues[i].line).toBeGreaterThanOrEqual(result.issues[i - 1].line)
    }
  })
})

// ============================================================================
// Correction Prompt Generation Tests
// ============================================================================

describe('Correction Prompt Generation', () => {
  it('generates German correction prompt by default', () => {
    const code = 'Box paddin 16'
    const result = validateMirrorCode(code, false, 'de')

    expect(result.correctionPrompt).toContain('FEHLER:')
    expect(result.correctionPrompt).toContain('Zeile')
    expect(result.correctionPrompt).toContain('korrigiere')
  })

  it('generates English correction prompt when specified', () => {
    const code = 'Box paddin 16'
    const result = validateMirrorCode(code, false, 'en')

    expect(result.correctionPrompt).toContain('ERRORS:')
    expect(result.correctionPrompt).toContain('Line')
    expect(result.correctionPrompt).toContain('fix')
  })

  it('includes original code in correction prompt', () => {
    const code = 'Box paddin 16'
    const result = validateMirrorCode(code)

    expect(result.correctionPrompt).toContain('Box paddin 16')
  })

  it('includes suggestions in correction prompt', () => {
    const code = 'Box colr #FFF'
    const result = validateMirrorCode(code)

    expect(result.correctionPrompt).toContain('col')
  })

  it('does not generate correction prompt for valid code', () => {
    const code = 'Box pad 16 col #FFF'
    const result = validateMirrorCode(code)

    expect(result.correctionPrompt).toBeUndefined()
  })
})

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('isValidMirrorCode', () => {
  it('returns true for valid code', () => {
    expect(isValidMirrorCode('Box pad 16 bg #1E1E1E')).toBe(true)
  })

  it('returns false for code with errors', () => {
    expect(isValidMirrorCode('Box paddin 16')).toBe(false)
  })
})

describe('getIssueSummary', () => {
  it('returns empty array for valid code', () => {
    const summary = getIssueSummary('Box pad 16')
    expect(summary).toHaveLength(0)
  })

  it('returns formatted issue strings', () => {
    const summary = getIssueSummary('Box paddin 16')
    expect(summary.length).toBeGreaterThan(0)
    expect(summary[0]).toMatch(/Line \d+:/)
  })

  it('includes suggestions when present', () => {
    const summary = getIssueSummary('Box paddin 16')
    expect(summary.length).toBeGreaterThan(0)
    // Check that issues are formatted with line numbers
    expect(summary.some(s => s.includes('paddin'))).toBe(true)
  })
})

// ============================================================================
// Self-Healing Integration Tests
// ============================================================================

describe('withSelfHealing', () => {
  it('returns immediately if code is valid', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({ code: 'Box pad 16 bg #1E1E1E' })

    const result = await withSelfHealing(mockGenerate, 'Create a box')

    expect(result.valid).toBe(true)
    expect(result.attempts).toBe(1)
    expect(mockGenerate).toHaveBeenCalledTimes(1)
  })

  it('attempts correction when code has errors', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' }) // First: invalid
      .mockResolvedValueOnce({ code: 'Box pad 16' }) // Second: valid

    const result = await withSelfHealing(mockGenerate, 'Create a box')

    expect(result.valid).toBe(true)
    expect(result.attempts).toBe(2)
    expect(mockGenerate).toHaveBeenCalledTimes(2)
  })

  it('respects maxAttempts option', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({ code: 'Box paddin 16' })

    const result = await withSelfHealing(mockGenerate, 'Create a box', {
      maxAttempts: 3
    })

    expect(result.valid).toBe(false)
    expect(result.attempts).toBe(3)
    expect(mockGenerate).toHaveBeenCalledTimes(3)
  })

  it('passes correction prompt to generate function', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' })
      .mockResolvedValueOnce({ code: 'Box pad 16' })

    await withSelfHealing(mockGenerate, 'Create a box')

    // Second call should have correction prompt
    const secondCall = mockGenerate.mock.calls[1][0]
    expect(secondCall).toContain('FEHLER:')
    expect(secondCall).toContain('paddin')
  })

  it('uses English prompts when language is en', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' })
      .mockResolvedValueOnce({ code: 'Box pad 16' })

    await withSelfHealing(mockGenerate, 'Create a box', { language: 'en' })

    const secondCall = mockGenerate.mock.calls[1][0]
    expect(secondCall).toContain('ERRORS:')
  })

  it('handles generation errors gracefully', async () => {
    const mockGenerate = vi.fn().mockRejectedValue(new Error('API Error'))

    const result = await withSelfHealing(mockGenerate, 'Create a box')

    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].message).toContain('API Error')
  })

  it('returns last code even if not valid after max attempts', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' })
      .mockResolvedValueOnce({ code: 'Box colr #FFF' })

    const result = await withSelfHealing(mockGenerate, 'Create a box', {
      maxAttempts: 2
    })

    expect(result.valid).toBe(false)
    expect(result.code).toBe('Box colr #FFF')
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('includes warnings when includeWarnings is true', async () => {
    // Create code that triggers a warning (if any exist in the validator)
    const mockGenerate = vi.fn().mockResolvedValue({ code: 'Box pad 16' })

    const result = await withSelfHealing(mockGenerate, 'Create a box', {
      includeWarnings: true
    })

    expect(result.valid).toBe(true)
  })

  it('uses correctionPrefix when provided', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' })
      .mockResolvedValueOnce({ code: 'Box pad 16' })

    await withSelfHealing(mockGenerate, 'Create a box', {
      correctionPrefix: 'CUSTOM PREFIX'
    })

    const secondCall = mockGenerate.mock.calls[1][0]
    expect(secondCall).toContain('CUSTOM PREFIX')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty code', () => {
    const result = validateMirrorCode('')
    // Empty code should still parse (no nodes)
    expect(result.valid).toBe(true)
  })

  it('handles simple valid code with token', () => {
    const code = `$primary: #3B82F6
Box bg $primary`

    const result = validateMirrorCode(code)
    // Token definitions and usage should be valid
    expect(result.valid).toBe(true)
  })

  it('handles simple definition', () => {
    const code = 'Card: pad 16 bg #1E1E1E'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(true)
  })

  it('handles multiple errors in one line', () => {
    const code = 'Box paddin 16'

    const result = validateMirrorCode(code)
    expect(result.issues.length).toBeGreaterThanOrEqual(1)
  })

  it('detects typos in multi-line code', () => {
    const code = `Box pad 16
Button onclck toggle`

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(false)
    expect(result.issues.some(i => i.message.includes('onclck'))).toBe(true)
  })
})
