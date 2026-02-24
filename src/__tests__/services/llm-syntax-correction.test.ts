/**
 * E2E Tests: LLM Syntax Error Correction
 *
 * @deprecated These tests have been migrated to the LLM Evaluation System.
 *
 * The new location is:
 *   src/__tests__/llm-evaluation/suites/syntax-correction.test.ts
 *   src/__tests__/llm-evaluation/fixtures/syntax-correction/cases.json
 *
 * To record fixtures and run tests:
 *   npm run llm:record -- --pipeline=syntax-correction
 *   npm run llm:eval
 *
 * The tests below are kept for backwards compatibility and can be run with:
 *   RUN_LLM_TESTS=true npm test -- src/__tests__/services/llm-syntax-correction.test.ts
 *
 * Tests that the LLM correctly fixes typos and syntax errors
 * WITHOUT generating completely different code.
 *
 * These tests require:
 * 1. An API key (VITE_OPENROUTER_API_KEY env var)
 * 2. Sufficient API credits
 *
 * Skip condition: RUN_LLM_TESTS=true npm test
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { translateLineSimple } from '../../services/nl-translation'
import { setApiKey } from '../../lib/ai'
import { parse } from '../../parser/parser'

// Check for API key - tests will be skipped if not available
const getTestApiKey = (): string => {
  // Try env variable
  if (process.env.VITE_OPENROUTER_API_KEY) {
    return process.env.VITE_OPENROUTER_API_KEY
  }
  return ''
}

const API_KEY = getTestApiKey()
// Only run if explicitly enabled AND API key exists
const shouldRun = !!API_KEY && process.env.RUN_LLM_TESTS === 'true'

// Helper: Check if output is a correction of input (not completely different)
function isSimilarCorrection(input: string, output: string): boolean {
  // Normalize both strings
  const normalizeForComparison = (s: string) =>
    s.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[",]/g, '')
      .trim()

  const normInput = normalizeForComparison(input)
  const normOutput = normalizeForComparison(output)

  // Check key tokens from input appear in output
  const inputTokens = normInput.split(' ').filter(t => t.length > 2)
  const outputTokens = new Set(normOutput.split(' '))

  // Allow typo corrections - check base similarity
  let matchCount = 0
  for (const token of inputTokens) {
    // Check exact match or similar (for typo correction)
    if (outputTokens.has(token)) {
      matchCount++
    } else {
      // Check for similar tokens (e.g., buttn → button)
      for (const outToken of outputTokens) {
        if (levenshtein(token, outToken) <= 2) {
          matchCount++
          break
        }
      }
    }
  }

  // At least 50% of tokens should match
  return matchCount >= inputTokens.length * 0.5
}

// Levenshtein distance for typo similarity
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[b.length][a.length]
}

// Helper: Check if output is valid Mirror DSL
function isValidDSL(code: string): boolean {
  try {
    const result = parse(code)
    // Valid if we have nodes or registry and no critical errors
    const hasContent = (result.nodes?.length ?? 0) > 0 || (result.registry?.size ?? 0) > 0
    const hasErrors = (result.errors?.length ?? 0) > 0
    return hasContent && !hasErrors
  } catch {
    return false
  }
}

describe('LLM Syntax Correction E2E', () => {
  beforeAll(() => {
    if (API_KEY) {
      setApiKey(API_KEY)
    }
  })

  describe.skipIf(!shouldRun)('Component Name Typo Corrections', () => {
    it('corrects "Buttn" → "Button"', async () => {
      const input = 'Buttn bg #333'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      expect(result.code.toLowerCase()).toContain('button')
      expect(isValidDSL(result.code)).toBe(true)
      expect(isSimilarCorrection(input, result.code)).toBe(true)
    }, 30000)

    it('corrects "Crad" → "Card"', async () => {
      const input = 'Crad bg #1E1E2E pad 16'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      expect(result.code.toLowerCase()).toContain('card')
      expect(isValidDSL(result.code)).toBe(true)
      // Should preserve properties
      expect(result.code).toMatch(/#1e1e2e|#1E1E2E/i)
    }, 30000)

    it('corrects "Inputt" → "Input"', async () => {
      const input = 'Inputt placeholder "Email"'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      expect(result.code.toLowerCase()).toContain('input')
      expect(isValidDSL(result.code)).toBe(true)
      // Should preserve the placeholder content
      expect(result.code.toLowerCase()).toContain('email')
    }, 30000)

    it('corrects "Toogle" → "Toggle"', async () => {
      const input = 'Toogle bg #333'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      expect(result.code.toLowerCase()).toContain('toggle')
      expect(isValidDSL(result.code)).toBe(true)
    }, 30000)
  })

  describe.skipIf(!shouldRun)('Property Typo Corrections', () => {
    it('corrects "backgrund" → "background"', async () => {
      const input = 'Button backgrund #3B82F6'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      expect(result.code.toLowerCase()).toContain('button')
      expect(result.code.toLowerCase()).toContain('background')
      expect(isValidDSL(result.code)).toBe(true)
      // Should preserve the color value
      expect(result.code).toMatch(/#3b82f6|#3B82F6/i)
    }, 30000)

    it('corrects "paddng" → "padding"', async () => {
      const input = 'Box paddng 16'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      expect(result.code.toLowerCase()).toContain('box')
      // Check for padding (or pad shorthand)
      expect(result.code.toLowerCase()).toMatch(/padding|pad/)
      expect(isValidDSL(result.code)).toBe(true)
    }, 30000)

    it('corrects "colr" → "color"', async () => {
      const input = 'Text colr #FFF "Hello"'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      expect(result.code.toLowerCase()).toContain('text')
      // Check for color (or col shorthand)
      expect(result.code.toLowerCase()).toMatch(/color|col/)
      expect(isValidDSL(result.code)).toBe(true)
      // Should preserve text content
      expect(result.code.toLowerCase()).toContain('hello')
    }, 30000)
  })

  describe.skipIf(!shouldRun)('Does NOT Generate Completely Different Code', () => {
    it('keeps the same component type when correcting typos', async () => {
      const input = 'Buttn pad 12 rad 8 "Save"'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      // Should be a Button, not a Card or other component
      expect(result.code.toLowerCase()).toMatch(/^button\b/)
      // Should not generate navigation, forms, etc.
      expect(result.code.toLowerCase()).not.toMatch(/nav|form|input|card/)
      expect(isValidDSL(result.code)).toBe(true)
    }, 30000)

    it('preserves string content when correcting', async () => {
      const input = 'Buttn "Click me to save"'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      // Should preserve the exact text content
      expect(result.code.toLowerCase()).toContain('click')
      expect(result.code.toLowerCase()).toContain('save')
    }, 30000)

    it('preserves color values when correcting', async () => {
      const input = 'Crad bg #ABCDEF'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      // Should preserve the color
      expect(result.code).toMatch(/#abcdef|#ABCDEF/i)
    }, 30000)

    it('preserves numeric values when correcting', async () => {
      const input = 'Boxx pad 24 rad 16 gap 12'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      // Should be a Box
      expect(result.code.toLowerCase()).toMatch(/^box\b/)
      // Should preserve at least some numeric values
      expect(result.code).toMatch(/24|16|12/)
    }, 30000)
  })

  describe.skipIf(!shouldRun)('Syntax Error Corrections', () => {
    it('fixes missing quotes around strings', async () => {
      // This might parse as separate tokens - LLM should recognize intent
      const input = 'Button Click me'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      // Should have proper string in output
      expect(result.code).toMatch(/".*click.*"/i)
      expect(isValidDSL(result.code)).toBe(true)
    }, 30000)

    it('handles garbled property syntax', async () => {
      const input = 'Button bg=#333 padding=16'
      const result = await translateLineSimple(input, [input], 0)

      expect(result.error).toBeUndefined()
      expect(result.code.toLowerCase()).toContain('button')
      expect(isValidDSL(result.code)).toBe(true)
    }, 30000)
  })

  // Meta-test: Ensure API key check works
  describe('API Key Validation', () => {
    it('reports how to run LLM tests', () => {
      if (!shouldRun) {
        console.log('\n📝 LLM Syntax Correction Tests: SKIPPED')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('To run these tests with actual LLM calls:')
        console.log('')
        console.log('  RUN_LLM_TESTS=true npm test -- src/__tests__/services/llm-syntax-correction.test.ts')
        console.log('')
        console.log('Requirements:')
        console.log('  - VITE_OPENROUTER_API_KEY environment variable set')
        console.log('  - Sufficient API credits on OpenRouter')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      }
      expect(true).toBe(true) // Always passes
    })
  })
})
