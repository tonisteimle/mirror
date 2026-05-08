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
 * Siehe: docs/archive/concepts/llm-edit-flow-test-concept.md § 3.1 (patch-applier)
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
      // Sharp: toEqual catches accidental extra fields on RetryHint that
      // toMatchObject would miss.
      expect(result.retryHints).toEqual([
        { reason: 'no-match', matchCount: 0, patch: { find: 'Button "x"', replace: 'Button "y"' } },
      ])
    })

    it('reports multiple-matches when anchor matches more than once', () => {
      const source = 'Text "x"\nText "x"\nText "x"'
      const result = applyPatches(source, [patch('Text "x"', 'Text "y"')])

      expect(result.success).toBe(false)
      expect(result.retryHints).toEqual([
        {
          reason: 'multiple-matches',
          matchCount: 3,
          patch: { find: 'Text "x"', replace: 'Text "y"' },
        },
      ])
      // Source must remain untouched on failure (no leak).
      expect(result.newSource).toBeUndefined()
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

  // ---------------------------------------------------------------------------
  // Coverage gaps surfaced during the quality pass
  // ---------------------------------------------------------------------------
  describe('edge cases (P2 coverage)', () => {
    it('subsequent patches are NOT attempted when an earlier patch fails', () => {
      // Documented behavior: applyPatches returns at the first failure with
      // exactly one retryHint. Locking this in protects against a future
      // refactor that might "collect all hints" and silently change the
      // contract for the orchestrator.
      const source = 'Text "ambiguous"\nText "ambiguous"\nText "later"'
      const result = applyPatches(source, [
        patch('Text "ambiguous"', 'Text "X"'), // fails (2 matches)
        patch('Text "later"', 'Text "Y"'), // would succeed if reached
      ])

      expect(result.success).toBe(false)
      expect(result.retryHints).toHaveLength(1)
      expect(result.retryHints![0].patch.find).toBe('Text "ambiguous"')
      // Source must remain unchanged — patch 2 must not have run.
      expect(result.newSource).toBeUndefined()
    })

    it('a later patch can fail because an earlier patch removed its anchor', () => {
      // Sequence semantics: patch 1 deletes the anchor patch 2 expected.
      // The result is a no-match for patch 2 — sequence ordering matters.
      const source = 'A\nB\nC'
      const result = applyPatches(source, [
        patch('B\n', ''), // removes B
        patch('B', 'X'), // anchor no longer exists
      ])

      expect(result.success).toBe(false)
      expect(result.retryHints).toHaveLength(1)
      expect(result.retryHints![0].reason).toBe('no-match')
      expect(result.retryHints![0].matchCount).toBe(0)
    })

    it('rejects no-match against an empty source', () => {
      const result = applyPatches('', [patch('anchor', 'x')])
      expect(result.success).toBe(false)
      expect(result.retryHints).toEqual([
        { reason: 'no-match', matchCount: 0, patch: { find: 'anchor', replace: 'x' } },
      ])
    })

    it('anchor at the very start of source is matched', () => {
      const source = 'Frame gap 12\n  Text "x"'
      const result = applyPatches(source, [patch('Frame gap 12', 'Card gap 12')])
      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Card gap 12\n  Text "x"')
    })

    it('anchor at the very end of source is matched', () => {
      const source = 'Frame gap 12\n  Text "last"'
      const result = applyPatches(source, [patch('Text "last"', 'Text "final"')])
      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Frame gap 12\n  Text "final"')
    })

    it('CR is treated as a literal character (no normalization in applier)', () => {
      // The applier is byte-strict. Source with CRLF and a FIND that contains
      // only LF will not match — this is intentional. The parser normalizes;
      // the applier doesn't.
      const source = 'first\r\nsecond'
      const result = applyPatches(source, [patch('first\nsecond', 'replaced')])
      expect(result.success).toBe(false)
      expect(result.retryHints![0].reason).toBe('no-match')
    })

    it('patch on a substring of a longer line matches just that substring', () => {
      const source = 'Text "Hello, World!"'
      const result = applyPatches(source, [patch('Hello', 'Hi')])
      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Text "Hi, World!"')
    })

    it('overlapping match candidates count as separate occurrences (non-overlap is enforced via pos += needle.length)', () => {
      // Pattern "aa" in "aaaa" → indexOf advances by needle length. We expect
      // 2 occurrences (aa + aa), not 3 (overlapping). countOccurrences uses
      // pos = idx + needle.length, locking this in.
      const source = 'aaaa'
      const result = applyPatches(source, [patch('aa', 'X')])
      expect(result.success).toBe(false)
      expect(result.retryHints![0]).toMatchObject({
        reason: 'multiple-matches',
        matchCount: 2,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Multi-file applier
  // ---------------------------------------------------------------------------
  describe('applyPatchesMultiFile', () => {
    it('groups multiple patches targeting the same file (covers grouped.has path)', async () => {
      const { applyPatchesMultiFile } = await import('../../studio/agent/patch-applier')
      const files = {
        'app.mir': 'Frame gap 12\n  Text "A"\n  Text "B"',
      }
      const patches = [
        { find: 'Text "A"', replace: 'Text "AA"' },
        { find: 'Text "B"', replace: 'Text "BB"' },
      ]
      const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
      expect(result.success).toBe(true)
      expect(result.updatedFiles).toEqual({
        'app.mir': 'Frame gap 12\n  Text "AA"\n  Text "BB"',
      })
    })

    it('multi-file: collects retryHints across files when one file fails', async () => {
      const { applyPatchesMultiFile } = await import('../../studio/agent/patch-applier')
      const files = {
        'app.mir': 'Frame gap 12\n  Text "A"',
        'tokens.mir': 'primary.bg: #2271C1',
      }
      const patches = [
        // app.mir succeeds
        { find: 'Text "A"', replace: 'Text "Z"' },
        // tokens.mir succeeds
        { find: 'primary.bg: #2271C1', replace: 'primary.bg: #FFF', targetFile: 'tokens.mir' },
        // app.mir fails (no match) — same file as patch 1
        { find: 'BogusAnchor', replace: 'foo' },
      ]
      const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
      expect(result.success).toBe(false)
      expect(result.retryHints).toBeDefined()
      // The hint must carry the targetFile so the caller knows where to look.
      const hint = result.retryHints![0] as { reason: string; targetFile: string }
      expect(hint.targetFile).toBe('app.mir')
      expect(hint.reason).toBe('no-match')
      // All-or-nothing: NO files leak through, even though tokens.mir would
      // have succeeded on its own.
      expect(result.updatedFiles).toBeUndefined()
    })

    it('rejects unknown @@FILE before applying anything', async () => {
      const { applyPatchesMultiFile } = await import('../../studio/agent/patch-applier')
      const files = { 'app.mir': 'A' }
      const patches = [{ find: 'A', replace: 'X', targetFile: 'phantom.mir' }]
      const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
      expect(result.success).toBe(false)
      expect(result.unknownFiles).toEqual(['phantom.mir'])
      expect(result.retryHints).toBeUndefined()
      expect(result.updatedFiles).toBeUndefined()
    })

    it('applies cross-file patches in distinct files independently', async () => {
      const { applyPatchesMultiFile } = await import('../../studio/agent/patch-applier')
      const files = {
        'app.mir': 'Text "Hi"',
        'tokens.mir': 'primary.bg: #fff',
        'components.mir': 'Btn: pad 12',
      }
      const patches = [
        { find: 'Text "Hi"', replace: 'Text "Hello"' },
        { find: 'primary.bg: #fff', replace: 'primary.bg: #000', targetFile: 'tokens.mir' },
        { find: 'pad 12', replace: 'pad 16', targetFile: 'components.mir' },
      ]
      const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
      expect(result.success).toBe(true)
      expect(result.updatedFiles).toEqual({
        'app.mir': 'Text "Hello"',
        'tokens.mir': 'primary.bg: #000',
        'components.mir': 'Btn: pad 16',
      })
    })
  })
})
