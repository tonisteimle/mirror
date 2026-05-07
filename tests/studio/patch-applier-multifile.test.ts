/**
 * Tests for applyPatchesMultiFile — Multi-File-Roadmap Komponente 6b.
 *
 * All-or-nothing: if any patch fails, no file is written. Patches without
 * @@FILE default to `options.defaultFile` (back-compat with single-file
 * patches). LLM cannot create new files: any @@FILE pointing to a
 * non-existent filename aborts the whole transaction.
 */

import { describe, it, expect } from 'vitest'
import { applyPatchesMultiFile } from '../../studio/agent/patch-applier'
import { parsePatchResponse } from '../../studio/agent/patch-format'

function parse(input: string) {
  const r = parsePatchResponse(input)
  expect(r.parseErrors).toEqual([])
  return r.patches
}

describe('applyPatchesMultiFile — single-file (backward compat)', () => {
  it('applies patches without @@FILE to the default file', () => {
    const files = { 'app.mir': 'Button "Save"' }
    const patches = parse('@@FIND\nButton "Save"\n@@REPLACE\nButton "Save", bg blue\n@@END')
    const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
    expect(result.success).toBe(true)
    expect(result.updatedFiles).toEqual({ 'app.mir': 'Button "Save", bg blue' })
  })

  it('reports retry-hint when a no-@@FILE patch does not match the default file', () => {
    const files = { 'app.mir': 'Button "Save"' }
    const patches = parse('@@FIND\nNotInSource\n@@REPLACE\nfoo\n@@END')
    const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
    expect(result.success).toBe(false)
    expect(result.retryHints).toHaveLength(1)
    expect(result.retryHints![0].targetFile).toBe('app.mir')
    expect(result.retryHints![0].reason).toBe('no-match')
  })
})

describe('applyPatchesMultiFile — cross-file', () => {
  it('routes patches with @@FILE to the named file', () => {
    const files = {
      'tokens.mir': 'primary.bg: #2271C1',
      'app.mir': 'Button "Save"',
    }
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
    const patches = parse(input)
    const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
    expect(result.success).toBe(true)
    expect(result.updatedFiles).toEqual({
      'tokens.mir': 'primary.bg: #2271C1\naccent.bg: #f59e0b',
      'app.mir': 'Button "Save", bg $accent',
    })
  })

  it('untouched files are not present in updatedFiles (caller keeps originals)', () => {
    const files = {
      'tokens.mir': 'primary.bg: #2271C1',
      'app.mir': 'Button "Save"',
      'data.mir': 'users:\n  alice:\n    name: "Alice"',
    }
    const patches = parse(
      '@@FILE app.mir\n@@FIND\nButton "Save"\n@@REPLACE\nButton "Save", bg blue\n@@END'
    )
    const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
    expect(result.success).toBe(true)
    // tokens.mir + data.mir were not touched by patches → not returned.
    expect(Object.keys(result.updatedFiles!)).toEqual(['app.mir'])
  })
})

describe('applyPatchesMultiFile — all-or-nothing', () => {
  it('aborts the whole transaction if ONE patch fails (no partial writes)', () => {
    const files = {
      'tokens.mir': 'primary.bg: #2271C1',
      'app.mir': 'Button "Save"',
    }
    // First patch: valid. Second patch: NO_MATCH in app.mir.
    const input = [
      '@@FILE tokens.mir',
      '@@FIND',
      'primary.bg: #2271C1',
      '@@REPLACE',
      'primary.bg: #1E5BA8',
      '@@END',
      '@@FILE app.mir',
      '@@FIND',
      'NotInAppMir',
      '@@REPLACE',
      'foo',
      '@@END',
    ].join('\n')
    const patches = parse(input)
    const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
    expect(result.success).toBe(false)
    // Neither file was written: result has no updatedFiles.
    expect(result.updatedFiles).toBeUndefined()
    // Retry hints carry the failed patch + its target.
    expect(result.retryHints).toHaveLength(1)
    expect(result.retryHints![0].targetFile).toBe('app.mir')
    expect(result.retryHints![0].reason).toBe('no-match')
  })
})

describe('applyPatchesMultiFile — unknown files (LLM cannot create)', () => {
  it('rejects @@FILE pointing to a non-existent file (no new files allowed)', () => {
    const files = { 'app.mir': 'Button "Save"' }
    const patches = parse('@@FILE new-file.mir\n@@FIND\nfoo\n@@REPLACE\nbar\n@@END')
    const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
    expect(result.success).toBe(false)
    expect(result.unknownFiles).toEqual(['new-file.mir'])
    expect(result.updatedFiles).toBeUndefined()
  })

  it('aborts even when other patches in the same response are valid', () => {
    const files = {
      'app.mir': 'Button "Save"',
    }
    const input = [
      // Valid — would patch app.mir cleanly.
      '@@FILE app.mir',
      '@@FIND',
      'Button "Save"',
      '@@REPLACE',
      'Button "Save", bg blue',
      '@@END',
      // Invalid — references non-existent file.
      '@@FILE phantom.mir',
      '@@FIND',
      'foo',
      '@@REPLACE',
      'bar',
      '@@END',
    ].join('\n')
    const patches = parse(input)
    const result = applyPatchesMultiFile(files, patches, { defaultFile: 'app.mir' })
    expect(result.success).toBe(false)
    expect(result.unknownFiles).toContain('phantom.mir')
    expect(result.updatedFiles).toBeUndefined()
  })
})
