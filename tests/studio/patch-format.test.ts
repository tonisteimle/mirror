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
      expect(result.parseErrors[0]).toMatch(/unclosed/i)
    })

    it('reports an error for @@REPLACE without preceding @@FIND', () => {
      const input = ['@@REPLACE', 'bar', '@@END'].join('\n')
      const result = parsePatchResponse(input)
      expect(result.patches).toEqual([])
      expect(result.parseErrors.length).toBeGreaterThanOrEqual(1)
      expect(result.parseErrors[0]).toMatch(/@@REPLACE/)
    })

    it('reports an error for @@END without preceding @@REPLACE', () => {
      const input = ['@@END'].join('\n')
      const result = parsePatchResponse(input)
      expect(result.patches).toEqual([])
      expect(result.parseErrors.length).toBeGreaterThanOrEqual(1)
      expect(result.parseErrors[0]).toMatch(/@@END/)
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
      // Recovery: the second block parses successfully; the first emits an error.
      expect(result.parseErrors.length).toBeGreaterThanOrEqual(1)
      expect(result.parseErrors[0]).toMatch(/unexpected @@FIND|unclosed/i)
      expect(result.patches).toEqual([{ find: 'second', replace: 'replacement' }])
    })

    it('reports an error for missing @@REPLACE between @@FIND and @@END', () => {
      const input = ['@@FIND', 'foo', '@@END'].join('\n')
      const result = parsePatchResponse(input)
      expect(result.patches).toEqual([])
      expect(result.parseErrors.length).toBeGreaterThanOrEqual(1)
    })
  })
})
