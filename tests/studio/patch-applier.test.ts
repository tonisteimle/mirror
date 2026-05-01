/**
 * Tests for studio/agent/patch-applier.ts
 *
 * Pflicht: Anker muss exakt 1× im aktuellen Working-Copy matchen, sonst
 * RetryHint. Bei Erfolg ALLER Patches → success + newSource. Bei einer
 * einzigen Mismatch-Stelle → success: false + retryHints, kein newSource
 * (das Working-Copy wird nicht nach aussen geleakt — der Orchestrator
 * retryt vom Original).
 *
 * Sequenz-Semantik: Patches werden in der gegebenen Reihenfolge auf das
 * gemeinsame Working-Copy angewendet, jeder Patch sieht die Mutation
 * der vorigen.
 *
 * Siehe: docs/concepts/llm-edit-flow-test-concept.md § 3.1 (patch-applier)
 */

import { describe, it, expect } from 'vitest'
import { applyPatches } from '../../studio/agent/patch-applier'
import type { Patch } from '../../studio/agent/patch-format'

const patch = (find: string, replace: string): Patch => ({ find, replace })

describe('PatchApplier — applyPatches', () => {
  describe('happy path', () => {
    it('applies a single unique-anchor patch', () => {
      const source = 'Frame gap 12\n  Text "Hello"'
      const result = applyPatches(source, [patch('Text "Hello"', 'Text "Hi"')])

      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Frame gap 12\n  Text "Hi"')
      expect(result.retryHints).toBeUndefined()
    })

    it('applies multiple independent patches sequentially', () => {
      const source = 'Frame gap 12, pad 16\n  Text "A"\n  Text "B"'
      const result = applyPatches(source, [
        patch('Text "A"', 'Text "AAA"'),
        patch('Text "B"', 'Text "BBB"'),
      ])

      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Frame gap 12, pad 16\n  Text "AAA"\n  Text "BBB"')
    })

    it('treats an empty REPLACE as a deletion (anchor + trailing newline removed when present)', () => {
      const source = 'Frame\n  Text "remove me"\n  Text "keep"'
      const result = applyPatches(source, [patch('  Text "remove me"\n', '')])

      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Frame\n  Text "keep"')
    })

    it('matches multi-line anchors verbatim', () => {
      const source = ['Frame gap 12', '  Text "Hi"', '  Text "World"'].join('\n')
      const result = applyPatches(source, [
        patch('Frame gap 12\n  Text "Hi"', 'Frame gap 8\n  Text "Hello"'),
      ])

      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Frame gap 8\n  Text "Hello"\n  Text "World"')
    })

    it('applies a patch whose anchor IS the entire source', () => {
      const source = 'Text "only"'
      const result = applyPatches(source, [patch('Text "only"', 'Text "replaced"')])

      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Text "replaced"')
    })

    it('preserves $-special characters in REPLACE (no JS regex backref interpretation)', () => {
      const source = 'price: 100'
      const result = applyPatches(source, [patch('100', '$1.99')])

      expect(result.success).toBe(true)
      expect(result.newSource).toBe('price: $1.99')
    })

    it('handles dependent patches when applied in correct order', () => {
      // P1 introduces "Card", P2 expects "Card" — order matters here.
      const source = 'Frame gap 12'
      const result = applyPatches(source, [
        patch('Frame gap 12', 'Card gap 12'),
        patch('Card gap 12', 'Card gap 8, pad 16'),
      ])

      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Card gap 8, pad 16')
    })
  })

  describe('retry hints', () => {
    it('reports no-match when anchor is absent from source', () => {
      const source = 'Text "hello"'
      const result = applyPatches(source, [patch('Button "x"', 'Button "y"')])

      expect(result.success).toBe(false)
      expect(result.newSource).toBeUndefined()
      expect(result.retryHints).toHaveLength(1)
      expect(result.retryHints![0]).toMatchObject({
        reason: 'no-match',
        matchCount: 0,
      })
      expect(result.retryHints![0].patch.find).toBe('Button "x"')
    })

    it('reports multiple-matches when anchor matches more than once', () => {
      const source = 'Text "x"\nText "x"\nText "x"'
      const result = applyPatches(source, [patch('Text "x"', 'Text "y"')])

      expect(result.success).toBe(false)
      expect(result.retryHints).toHaveLength(1)
      expect(result.retryHints![0]).toMatchObject({
        reason: 'multiple-matches',
        matchCount: 3,
      })
    })

    it('reports retryHints only for the failing patch when earlier patches succeed', () => {
      const source = 'Text "A"\nText "ambiguous"\nText "ambiguous"'
      const result = applyPatches(source, [
        patch('Text "A"', 'Text "AAA"'), // OK
        patch('Text "ambiguous"', 'Text "X"'), // matches 2×
      ])

      expect(result.success).toBe(false)
      expect(result.newSource).toBeUndefined()
      expect(result.retryHints).toHaveLength(1)
      expect(result.retryHints![0].patch.find).toBe('Text "ambiguous"')
      expect(result.retryHints![0].matchCount).toBe(2)
    })

    it('treats an empty FIND as no-match (no implicit match-everywhere)', () => {
      const source = 'Frame gap 12'
      const result = applyPatches(source, [patch('', 'something')])

      expect(result.success).toBe(false)
      expect(result.retryHints).toHaveLength(1)
      expect(result.retryHints![0].reason).toBe('no-match')
    })

    it('is whitespace-sensitive (tabs vs spaces are not interchangeable)', () => {
      const source = '  Text "x"' // 2 spaces
      const result = applyPatches(source, [patch('\tText "x"', '\tText "y"')])

      expect(result.success).toBe(false)
      expect(result.retryHints![0].reason).toBe('no-match')
    })
  })

  describe('properties', () => {
    const SAMPLES = [
      '',
      'Frame gap 12',
      'Frame gap 12\n  Text "x"',
      'canvas mobile, bg #18181b\n\nFrame pad 16\n  Button "Click"',
      'X\nY\nZ\n',
    ]

    it('applyPatches(s, []) === s for any source', () => {
      for (const src of SAMPLES) {
        const result = applyPatches(src, [])
        expect(result.success).toBe(true)
        expect(result.newSource).toBe(src)
      }
    })

    it('applyPatches with a no-op patch (find === replace) leaves source unchanged', () => {
      for (const src of SAMPLES) {
        // pick the first non-empty line as anchor (must be unique in sample)
        const firstLine = src.split('\n').find(l => l.length > 0)
        if (!firstLine) continue
        // ensure uniqueness in this sample
        const occurrences = src.split(firstLine).length - 1
        if (occurrences !== 1) continue

        const result = applyPatches(src, [patch(firstLine, firstLine)])
        expect(result.success).toBe(true)
        expect(result.newSource).toBe(src)
      }
    })
  })
})
