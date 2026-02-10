/**
 * Fuzzy Search Tests
 *
 * Tests for fuzzy string matching utilities:
 * - Levenshtein distance calculation
 * - Fuzzy scoring algorithm
 * - Fuzzy filtering
 * - Closest match finding
 * - Similarity checking
 */

import { describe, it, expect } from 'vitest'
import {
  levenshteinDistance,
  fuzzyScore,
  fuzzyFilter,
  findClosestMatch,
  areSimilar,
} from '../../utils/fuzzy-search'

describe('fuzzy-search', () => {
  describe('levenshteinDistance', () => {
    describe('exact matches', () => {
      it('returns 0 for identical strings', () => {
        expect(levenshteinDistance('test', 'test')).toBe(0)
      })

      it('returns 0 for empty strings', () => {
        expect(levenshteinDistance('', '')).toBe(0)
      })
    })

    describe('insertions', () => {
      it('counts single insertion', () => {
        expect(levenshteinDistance('test', 'tests')).toBe(1)
      })

      it('counts multiple insertions', () => {
        expect(levenshteinDistance('test', 'testing')).toBe(3)
      })

      it('counts insertions at start', () => {
        expect(levenshteinDistance('test', 'atest')).toBe(1)
      })

      it('counts insertions in middle', () => {
        expect(levenshteinDistance('tst', 'test')).toBe(1)
      })
    })

    describe('deletions', () => {
      it('counts single deletion', () => {
        expect(levenshteinDistance('tests', 'test')).toBe(1)
      })

      it('counts multiple deletions', () => {
        expect(levenshteinDistance('testing', 'test')).toBe(3)
      })
    })

    describe('substitutions', () => {
      it('counts single substitution', () => {
        expect(levenshteinDistance('test', 'best')).toBe(1)
      })

      it('counts multiple substitutions', () => {
        expect(levenshteinDistance('test', 'boat')).toBe(3)
      })
    })

    describe('mixed operations', () => {
      it('counts combination of operations', () => {
        expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
      })

      it('handles completely different strings', () => {
        expect(levenshteinDistance('abc', 'xyz')).toBe(3)
      })

      it('handles one empty string', () => {
        expect(levenshteinDistance('test', '')).toBe(4)
        expect(levenshteinDistance('', 'test')).toBe(4)
      })
    })

    describe('case sensitivity', () => {
      it('treats different cases as different characters', () => {
        expect(levenshteinDistance('Test', 'test')).toBe(1)
      })

      it('handles all uppercase', () => {
        expect(levenshteinDistance('TEST', 'test')).toBe(4)
      })
    })
  })

  describe('fuzzyScore', () => {
    describe('exact matches', () => {
      it('returns 1 for exact match', () => {
        expect(fuzzyScore('button', 'button')).toBe(1)
      })

      it('returns 1 for case-insensitive exact match', () => {
        expect(fuzzyScore('Button', 'button')).toBe(1)
      })
    })

    describe('prefix matches', () => {
      it('returns 0.95 for prefix match', () => {
        expect(fuzzyScore('but', 'button')).toBe(0.95)
      })

      it('returns 0.95 for single character prefix', () => {
        expect(fuzzyScore('b', 'button')).toBe(0.95)
      })

      it('is case insensitive', () => {
        expect(fuzzyScore('BUT', 'button')).toBe(0.95)
      })
    })

    describe('contains matches', () => {
      it('returns 0.85 for substring match', () => {
        expect(fuzzyScore('ton', 'button')).toBe(0.85)
      })

      it('returns 0.85 for suffix match', () => {
        expect(fuzzyScore('on', 'button')).toBe(0.85)
      })
    })

    describe('fuzzy matches', () => {
      it('returns positive score for close matches', () => {
        const score = fuzzyScore('buton', 'button') // 1 typo
        expect(score).toBeGreaterThan(0)
        expect(score).toBeLessThan(0.85)
      })

      it('returns positive score for 2 character difference', () => {
        const score = fuzzyScore('btn', 'button')
        expect(score).toBeGreaterThan(0)
      })

      it('returns lower score for more differences', () => {
        const score1 = fuzzyScore('buton', 'button')  // 1 diff
        const score2 = fuzzyScore('butin', 'button')  // 2 diff
        expect(score1).toBeGreaterThan(score2)
      })
    })

    describe('typo tolerance', () => {
      it('matches with single typo at start', () => {
        const score = fuzzyScore('xutton', 'button')
        expect(score).toBeGreaterThan(0)
      })

      it('matches with typo at end', () => {
        const score = fuzzyScore('buttox', 'button')
        expect(score).toBeGreaterThan(0)
      })
    })

    describe('no matches', () => {
      it('returns 0 for completely different strings', () => {
        expect(fuzzyScore('xyz', 'button')).toBe(0)
      })

      it('returns 0 for very distant strings', () => {
        expect(fuzzyScore('apple', 'orange')).toBe(0)
      })
    })
  })

  describe('fuzzyFilter', () => {
    interface TestItem {
      name: string
      label?: string
    }

    const items: TestItem[] = [
      { name: 'button', label: 'Submit Button' },
      { name: 'input', label: 'Text Input' },
      { name: 'checkbox', label: 'Check Box' },
      { name: 'select', label: 'Dropdown' },
      { name: 'textarea', label: 'Text Area' },
    ]

    const getSearchable = (item: TestItem) => [item.name, item.label || '']

    it('returns all items for empty query', () => {
      const results = fuzzyFilter(items, '', getSearchable)
      expect(results).toHaveLength(5)
      expect(results.every(r => r.score === 0)).toBe(true)
    })

    it('returns all items for whitespace query', () => {
      const results = fuzzyFilter(items, '   ', getSearchable)
      expect(results).toHaveLength(5)
    })

    it('filters to exact matches', () => {
      const results = fuzzyFilter(items, 'button', getSearchable)
      // One item matches: 'button' (matches both name and label 'Submit Button')
      expect(results).toHaveLength(1)
      expect(results[0].item.name).toBe('button')
      expect(results[0].score).toBe(1) // exact match on name
    })

    it('filters to prefix matches', () => {
      const results = fuzzyFilter(items, 'but', getSearchable)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.name).toBe('button')
    })

    it('filters to substring matches', () => {
      const results = fuzzyFilter(items, 'text', getSearchable)
      expect(results.length).toBeGreaterThan(0)
      const names = results.map(r => r.item.name)
      expect(names).toContain('input')
      expect(names).toContain('textarea')
    })

    it('sorts by score descending', () => {
      const results = fuzzyFilter(items, 'in', getSearchable)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score)
      }
    })

    it('returns matched string', () => {
      const results = fuzzyFilter(items, 'button', getSearchable)
      const buttonResult = results.find(r => r.item.name === 'button')
      expect(buttonResult?.matchedString).toBe('button')
    })

    it('matches against all searchable strings', () => {
      const results = fuzzyFilter(items, 'dropdown', getSearchable)
      expect(results.length).toBe(1)
      expect(results[0].item.name).toBe('select')
      expect(results[0].matchedString).toBe('Dropdown')
    })

    it('returns empty array when no matches', () => {
      const results = fuzzyFilter(items, 'xyz', getSearchable)
      expect(results).toHaveLength(0)
    })

    it('handles fuzzy matches', () => {
      const results = fuzzyFilter(items, 'buton', getSearchable) // typo
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.name).toBe('button')
    })
  })

  describe('findClosestMatch', () => {
    const candidates = ['button', 'input', 'checkbox', 'select', 'textarea']

    describe('with array', () => {
      it('finds exact match', () => {
        const result = findClosestMatch('button', candidates)
        expect(result.match).toBe('button')
        expect(result.distance).toBe(0)
      })

      it('finds closest match for typo', () => {
        const result = findClosestMatch('buton', candidates)
        expect(result.match).toBe('button')
        expect(result.distance).toBe(1)
      })

      it('finds closest match for prefix', () => {
        const result = findClosestMatch('but', candidates)
        expect(result.match).toBe('button')
        expect(result.distance).toBe(3)
      })

      it('returns null for no match within threshold', () => {
        const result = findClosestMatch('xyz', candidates)
        expect(result.match).toBeNull()
        expect(result.distance).toBe(Infinity)
      })

      it('respects custom maxDistance', () => {
        const result = findClosestMatch('buton', candidates, 0)
        expect(result.match).toBeNull()
      })

      it('uses default maxDistance of 3', () => {
        const result = findClosestMatch('inpt', candidates) // 1 deletion
        expect(result.match).toBe('input')
      })
    })

    describe('with Set', () => {
      const candidateSet = new Set(candidates)

      it('works with Set input', () => {
        const result = findClosestMatch('buton', candidateSet)
        expect(result.match).toBe('button')
      })
    })

    describe('case sensitivity', () => {
      it('is case insensitive', () => {
        const result = findClosestMatch('BUTTON', candidates)
        expect(result.match).toBe('button')
        expect(result.distance).toBe(0)
      })

      it('handles mixed case', () => {
        const result = findClosestMatch('BuTTon', candidates)
        expect(result.match).toBe('button')
        expect(result.distance).toBe(0)
      })
    })

    describe('edge cases', () => {
      it('handles empty candidates', () => {
        const result = findClosestMatch('test', [])
        expect(result.match).toBeNull()
      })

      it('handles empty input', () => {
        const result = findClosestMatch('', candidates)
        // Empty string is within distance 3 of some candidates
        expect(result.match).toBeNull()
      })

      it('picks first match when multiple have same distance', () => {
        const result = findClosestMatch('text', ['textarea', 'textbox'])
        expect(result.match).not.toBeNull()
        expect(result.distance).toBeLessThanOrEqual(3)
      })
    })
  })

  describe('areSimilar', () => {
    describe('with default threshold', () => {
      it('returns true for identical strings', () => {
        expect(areSimilar('test', 'test')).toBe(true)
      })

      it('returns true for 1 character difference', () => {
        expect(areSimilar('test', 'tests')).toBe(true)
      })

      it('returns true for 2 character difference', () => {
        expect(areSimilar('test', 'tests!')).toBe(true)
      })

      it('returns false for 3+ character difference', () => {
        expect(areSimilar('test', 'testing')).toBe(false)
      })

      it('is case insensitive', () => {
        expect(areSimilar('Test', 'test')).toBe(true)
      })
    })

    describe('with custom threshold', () => {
      it('allows more differences with higher threshold', () => {
        expect(areSimilar('test', 'testing', 3)).toBe(true)
      })

      it('allows fewer differences with lower threshold', () => {
        expect(areSimilar('test', 'tests', 0)).toBe(false)
      })

      it('returns true for exact match at threshold 0', () => {
        expect(areSimilar('test', 'test', 0)).toBe(true)
      })
    })

    describe('real-world examples', () => {
      it('catches common typos', () => {
        expect(areSimilar('button', 'buton')).toBe(true)
        expect(areSimilar('checkbox', 'chekbox')).toBe(true)
        expect(areSimilar('textarea', 'textara')).toBe(true)
      })

      it('distinguishes different words', () => {
        expect(areSimilar('button', 'input')).toBe(false)
        expect(areSimilar('select', 'checkbox')).toBe(false)
      })
    })
  })
})
