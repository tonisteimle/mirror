/**
 * Tests for studio/agent/patch-format.ts — Parser for LLM-Edit-Flow patches
 *
 * Format:
 *   @@FIND
 *   <find content>
 *   @@REPLACE
 *   <replace content>
 *   @@END
 *
 * See: docs/archive/concepts/llm-edit-flow.md (Patch-Format)
 *      docs/archive/concepts/llm-edit-flow-test-concept.md § 3.1 (patch-format Pflicht-Cases)
 */

import { describe, it, expect } from 'vitest'
import { parsePatchResponse } from '../../studio/agent/patch-format'

describe('PatchFormat — parsePatchResponse', () => {
  describe('valid input', () => {
    it('returns no patches and no errors for empty input', () => {
      const result = parsePatchResponse('')
      expect(result.patches).toEqual([])
      expect(result.parseErrors).toEqual([])
    })

    it('parses a single simple block', () => {
      const input = [
        '@@FIND',
        'Button "Save"',
        '@@REPLACE',
        'Button "Save", bg blue',
        '@@END',
      ].join('\n')

      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'Button "Save"', replace: 'Button "Save", bg blue' }])
    })

    it('parses multiple blocks in declaration order', () => {
      const input = [
        '@@FIND',
        'a',
        '@@REPLACE',
        'A',
        '@@END',
        '@@FIND',
        'b',
        '@@REPLACE',
        'B',
        '@@END',
      ].join('\n')

      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([
        { find: 'a', replace: 'A' },
        { find: 'b', replace: 'B' },
      ])
    })

    it('preserves multi-line FIND content verbatim', () => {
      const input = [
        '@@FIND',
        'Frame gap 12',
        '  Text "Hello"',
        '  Text "World"',
        '@@REPLACE',
        'Frame gap 8',
        '  Text "Hi"',
        '@@END',
      ].join('\n')

      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toHaveLength(1)
      expect(result.patches[0].find).toBe('Frame gap 12\n  Text "Hello"\n  Text "World"')
      expect(result.patches[0].replace).toBe('Frame gap 8\n  Text "Hi"')
    })

    it('parses an empty REPLACE block as a deletion patch', () => {
      const input = ['@@FIND', 'Text "to be removed"', '@@REPLACE', '@@END'].join('\n')

      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'Text "to be removed"', replace: '' }])
    })

    it('preserves tab indentation in find/replace content', () => {
      const input = ['@@FIND', '\tText "x"', '@@REPLACE', '\t\tText "x"', '@@END'].join('\n')

      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches[0].find).toBe('\tText "x"')
      expect(result.patches[0].replace).toBe('\t\tText "x"')
    })

    it('preserves unicode in find/replace content', () => {
      const input = [
        '@@FIND',
        'Text "日本語 ✨"',
        '@@REPLACE',
        'Text "日本語 ✨ 🎉"',
        '@@END',
      ].join('\n')

      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches[0].find).toBe('Text "日本語 ✨"')
      expect(result.patches[0].replace).toBe('Text "日本語 ✨ 🎉"')
    })
  })

  describe('tolerant parsing', () => {
    it('ignores LLM prose before the first block (vorrede)', () => {
      const input = [
        'Sure, here are the patches you requested:',
        '',
        '@@FIND',
        'foo',
        '@@REPLACE',
        'bar',
        '@@END',
      ].join('\n')

      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'foo', replace: 'bar' }])
    })

    it('ignores LLM prose after the last block (nachrede)', () => {
      const input = [
        '@@FIND',
        'foo',
        '@@REPLACE',
        'bar',
        '@@END',
        '',
        'Let me know if you need adjustments!',
      ].join('\n')

      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'foo', replace: 'bar' }])
    })

    it('tolerates surrounding markdown code fences', () => {
      const input = ['```', '@@FIND', 'foo', '@@REPLACE', 'bar', '@@END', '```'].join('\n')

      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'foo', replace: 'bar' }])
    })

    it('normalizes CRLF line endings', () => {
      const input = '@@FIND\r\nfoo\r\n@@REPLACE\r\nbar\r\n@@END\r\n'
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'foo', replace: 'bar' }])
    })

    it('strips a leading BOM', () => {
      const input = '﻿@@FIND\nfoo\n@@REPLACE\nbar\n@@END'
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'foo', replace: 'bar' }])
    })

    it('BOM followed by CRLF still parses (BOM-on-its-own-line ignored as non-marker)', () => {
      // Edge: U+FEFF on its own line after CRLF normalization. The state
      // machine treats it as idle-content (trim() makes it empty) and
      // skips to the next line where @@FIND appears. Patches come out
      // identical to the BOM-less case.
      const input = '﻿\r\n@@FIND\r\nfoo\r\n@@REPLACE\r\nbar\r\n@@END'
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'foo', replace: 'bar' }])
    })

    it('accepts markers with trailing whitespace', () => {
      const input = '@@FIND   \nfoo\n@@REPLACE \t\nbar\n@@END  \n'
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'foo', replace: 'bar' }])
    })

    it('accepts markers with leading whitespace', () => {
      const input = '  @@FIND\nfoo\n   @@REPLACE\nbar\n @@END\n'
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'foo', replace: 'bar' }])
    })
  })

  describe('defective input', () => {
    it('reports an error for a missing @@END (unclosed block)', () => {
      const input = ['@@FIND', 'foo', '@@REPLACE', 'bar'].join('\n')
      const result = parsePatchResponse(input)
      expect(result.patches).toEqual([])
      expect(result.parseErrors).toHaveLength(1)
      // Sharp: the message names the start-line of the unclosed block and the
      // state it was in. Anchoring catches drift if the format changes.
      expect(result.parseErrors[0]).toBe(
        "Unclosed block (started at line 1, ended in state 'in_replace')"
      )
    })

    it('reports an error for @@REPLACE without preceding @@FIND', () => {
      const input = ['@@REPLACE', 'bar', '@@END'].join('\n')
      const result = parsePatchResponse(input)
      expect(result.patches).toEqual([])
      // Two errors: (1) @@REPLACE in idle → reset, (2) the subsequent @@END
      // also fails because the reset returned to idle. Capturing both keeps
      // recovery semantics locked.
      expect(result.parseErrors).toEqual([
        "Line 1: @@REPLACE without preceding @@FIND (state was 'idle')",
        "Line 3: @@END without preceding @@REPLACE (state was 'idle')",
      ])
    })

    it('reports an error for @@END without preceding @@REPLACE', () => {
      const input = '@@END'
      const result = parsePatchResponse(input)
      expect(result.patches).toEqual([])
      expect(result.parseErrors).toHaveLength(1)
      expect(result.parseErrors[0]).toBe(
        "Line 1: @@END without preceding @@REPLACE (state was 'idle')"
      )
    })

    it('reports an error and recovers when two @@FIND appear without @@END between them', () => {
      const input = [
        '@@FIND',
        'first',
        '@@FIND',
        'second',
        '@@REPLACE',
        'replacement',
        '@@END',
      ].join('\n')

      const result = parsePatchResponse(input)
      // Recovery: the second block parses successfully; the first emits an
      // error pointing to the unexpected @@FIND on line 3.
      expect(result.parseErrors).toHaveLength(1)
      expect(result.parseErrors[0]).toMatch(/^Line 3: unexpected @@FIND while in state 'in_find'/)
      expect(result.patches).toEqual([{ find: 'second', replace: 'replacement' }])
    })

    it('reports an error for missing @@REPLACE between @@FIND and @@END', () => {
      const input = ['@@FIND', 'foo', '@@END'].join('\n')
      const result = parsePatchResponse(input)
      expect(result.patches).toEqual([])
      expect(result.parseErrors).toHaveLength(1)
      // @@END while in_find → reset, error mentions the state was 'in_find'
      expect(result.parseErrors[0]).toBe(
        "Line 3: @@END without preceding @@REPLACE (state was 'in_find')"
      )
    })
  })

  // Multi-File-Roadmap Komponente 6b: @@FILE marker for cross-file patches.
  describe('@@FILE marker (multi-file targeting)', () => {
    it('attaches targetFile when @@FILE precedes @@FIND', () => {
      const input = [
        '@@FILE tokens.mir',
        '@@FIND',
        'primary.bg: #2271C1',
        '@@REPLACE',
        'primary.bg: #1E5BA8',
        '@@END',
      ].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([
        {
          find: 'primary.bg: #2271C1',
          replace: 'primary.bg: #1E5BA8',
          targetFile: 'tokens.mir',
        },
      ])
    })

    it('omits targetFile when no @@FILE marker is present (back-compat)', () => {
      const input = [
        '@@FIND',
        'Button "Save"',
        '@@REPLACE',
        'Button "Save", bg blue',
        '@@END',
      ].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches[0]).not.toHaveProperty('targetFile')
    })

    it('parses two patches with different @@FILE targets', () => {
      const input = [
        '@@FILE tokens.mir',
        '@@FIND',
        'primary.bg: #2271C1',
        '@@REPLACE',
        'primary.bg: #2271C1',
        'accent.bg: #f59e0b',
        '@@END',
        '@@FILE app.mir',
        '@@FIND',
        'Button "Save"',
        '@@REPLACE',
        'Button "Save", bg $accent',
        '@@END',
      ].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toHaveLength(2)
      expect(result.patches[0].targetFile).toBe('tokens.mir')
      expect(result.patches[1].targetFile).toBe('app.mir')
    })

    it('@@FILE only applies to the immediately following @@FIND, not subsequent blocks', () => {
      const input = [
        '@@FILE tokens.mir',
        '@@FIND',
        'a',
        '@@REPLACE',
        'b',
        '@@END',
        // No @@FILE here — second patch falls back to default (no targetFile).
        '@@FIND',
        'c',
        '@@REPLACE',
        'd',
        '@@END',
      ].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches[0].targetFile).toBe('tokens.mir')
      expect(result.patches[1]).not.toHaveProperty('targetFile')
    })

    it('reports an error when @@FILE appears mid-block', () => {
      const input = [
        '@@FIND',
        '@@FILE tokens.mir',
        'Button "Save"',
        '@@REPLACE',
        'Button "Save", bg blue',
        '@@END',
      ].join('\n')
      const result = parsePatchResponse(input)
      // The @@FILE inside @@FIND is recognized as the marker (not content)
      // and emits an error since it's only valid in idle state. The block
      // continues parsing the remaining content normally.
      expect(result.parseErrors).toHaveLength(1)
      expect(result.parseErrors[0]).toBe(
        "Line 2: @@FILE inside an open block (state 'in_find'); ignoring"
      )
      expect(result.patches).toHaveLength(1)
      expect(result.patches[0].find).toBe('Button "Save"')
      // Sharp: no targetFile attached because @@FILE was rejected.
      expect(result.patches[0]).not.toHaveProperty('targetFile')
    })
  })

  // ---------------------------------------------------------------------------
  // Coverage gaps surfaced during the quality pass
  // ---------------------------------------------------------------------------
  describe('edge cases (P2 coverage)', () => {
    it('treats `@@FILE` alone (no filename) as content, not marker', () => {
      // parseFileMarker returns null for empty filename. Without a filename
      // there is no useful target, so the line is treated as data.
      const input = ['@@FIND', '@@FILE', '@@REPLACE', 'replaced', '@@END'].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: '@@FILE', replace: 'replaced' }])
    })

    it('a second `@@FILE` in idle overwrites the first (last-write-wins)', () => {
      // Two @@FILE markers without an intervening block: only the second one
      // attaches to the next @@FIND. Locks in the documented behavior.
      const input = ['@@FILE a.mir', '@@FILE b.mir', '@@FIND', 'x', '@@REPLACE', 'y', '@@END'].join(
        '\n'
      )
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'x', replace: 'y', targetFile: 'b.mir' }])
    })

    it('preserves content lines that look like markers but with leading content', () => {
      // Anything after the trim that's not a known marker is content.
      const input = [
        '@@FIND',
        'XX@@FIND', // not a marker — has leading "XX"
        '  @@END inside content',
        '@@REPLACE',
        'replaced',
        '@@END',
      ].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches[0].find).toBe('XX@@FIND\n  @@END inside content')
    })

    it('preserves leading and trailing whitespace inside content lines', () => {
      // Whitespace in CONTENT lines is kept byte-exact (only marker lines
      // get trimmed). Critical for indentation-sensitive Mirror code.
      const input = [
        '@@FIND',
        '    leading-spaces',
        'trailing-spaces    ',
        '@@REPLACE',
        '\t\ttabs',
        '@@END',
      ].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches[0].find).toBe('    leading-spaces\ntrailing-spaces    ')
      expect(result.patches[0].replace).toBe('\t\ttabs')
    })

    it('parses an empty FIND block (zero content lines) without error', () => {
      // Empty FIND is valid syntax (parser-level). The applier rejects it
      // separately as an empty anchor — that's a different layer's concern.
      const input = ['@@FIND', '@@REPLACE', 'inserted', '@@END'].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: '', replace: 'inserted' }])
    })

    it('@@FILE is reset between blocks: an unclosed block does not leak its FILE to the next', () => {
      // After an unclosed first block, the second block should NOT inherit
      // the first's @@FILE. reset() is only called on explicit failure; an
      // unclosed-at-EOF first block triggers an error but the next @@FIND
      // (if it existed) would start fresh because @@FIND always re-opens.
      const input = [
        '@@FILE one.mir',
        '@@FIND',
        'a',
        '@@FIND', // recovery: drop the first block, open a fresh one
        'b',
        '@@REPLACE',
        'B',
        '@@END',
      ].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toHaveLength(1)
      // The recovered block does NOT carry the first @@FILE — currentFile
      // was attached to the (failed) first block; the second @@FIND opens
      // afresh without a FILE.
      expect(result.patches).toHaveLength(1)
      expect(result.patches[0]).toEqual({ find: 'b', replace: 'B' })
    })

    it('only normalizes CRLF — bare CR is treated as content character', () => {
      // We replace \r\n with \n, but a stray \r (not followed by \n) stays
      // in content. This is documented Mirror behavior — consumers MUST
      // send LF or CRLF, not legacy classic-Mac CR-only.
      const input = '@@FIND\nfoo\r\n@@REPLACE\nbar\r\n@@END'
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([{ find: 'foo', replace: 'bar' }])
    })

    it('ignores text between two valid blocks (interstitial prose)', () => {
      const input = [
        '@@FIND',
        'a',
        '@@REPLACE',
        'A',
        '@@END',
        '',
        'Now applying the second patch:',
        '',
        '@@FIND',
        'b',
        '@@REPLACE',
        'B',
        '@@END',
      ].join('\n')
      const result = parsePatchResponse(input)
      expect(result.parseErrors).toEqual([])
      expect(result.patches).toEqual([
        { find: 'a', replace: 'A' },
        { find: 'b', replace: 'B' },
      ])
    })
  })
})
