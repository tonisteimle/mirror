/**
 * resolvePreviewRedirect — pure-function tests.
 *
 * Pin the decision: when does compile() redirect from the editor's
 * current file to a separate preview-target layout? Five branches:
 *   1. Editor on layout → never redirect.
 *   2. Editor non-layout, no previewFile → no redirect.
 *   3. Editor non-layout, previewFile === currentFile → no redirect.
 *   4. Editor non-layout, previewFile points to non-layout → no redirect.
 *   5. Editor non-layout, previewFile points to a layout → redirect.
 */

import { describe, it, expect } from 'vitest'
import { resolvePreviewRedirect } from '../../studio/compile/preview-redirect'

// Minimal stub for file-type detection: 'layout' for *.mir, plus a
// case-insensitive override map for explicit per-file overrides used
// in tests that need to bend the rules.
function makeGetFileType(overrides: Record<string, string> = {}) {
  return (file: string): string => {
    if (file in overrides) return overrides[file]
    if (file.endsWith('.mir')) return 'layout'
    if (file.endsWith('.tok')) return 'tokens'
    if (file.endsWith('.com')) return 'components'
    return 'data'
  }
}

describe('resolvePreviewRedirect', () => {
  it('returns the current file unchanged when editor is on a layout', () => {
    const r = resolvePreviewRedirect({
      currentFile: 'app.mir',
      currentCode: 'Frame bg red',
      previewFile: 'other.mir',
      files: { 'app.mir': 'Frame bg red', 'other.mir': 'Text "hi"' },
      getFileType: makeGetFileType(),
    })
    expect(r.compileFile).toBe('app.mir')
    expect(r.compileCode).toBe('Frame bg red')
  })

  it('returns the current file when no previewFile is pinned', () => {
    const r = resolvePreviewRedirect({
      currentFile: 'tokens.tok',
      currentCode: 'primary.bg: #2271C1',
      previewFile: null,
      files: { 'tokens.tok': 'primary.bg: #2271C1' },
      getFileType: makeGetFileType(),
    })
    expect(r.compileFile).toBe('tokens.tok')
    expect(r.compileCode).toBe('primary.bg: #2271C1')
  })

  it('returns the current file when previewFile is undefined', () => {
    const r = resolvePreviewRedirect({
      currentFile: 'tokens.tok',
      currentCode: 'primary.bg: #2271C1',
      previewFile: undefined,
      files: { 'tokens.tok': 'primary.bg: #2271C1' },
      getFileType: makeGetFileType(),
    })
    expect(r.compileFile).toBe('tokens.tok')
    expect(r.compileCode).toBe('primary.bg: #2271C1')
  })

  it('returns the current file when previewFile equals currentFile', () => {
    const r = resolvePreviewRedirect({
      currentFile: 'tokens.tok',
      currentCode: 'primary.bg: #2271C1',
      previewFile: 'tokens.tok',
      files: { 'tokens.tok': 'primary.bg: #2271C1' },
      getFileType: makeGetFileType(),
    })
    expect(r.compileFile).toBe('tokens.tok')
    expect(r.compileCode).toBe('primary.bg: #2271C1')
  })

  it('returns the current file when previewFile is not a layout', () => {
    const r = resolvePreviewRedirect({
      currentFile: 'tokens.tok',
      currentCode: 'primary.bg: #2271C1',
      previewFile: 'components.com',
      files: { 'tokens.tok': 'primary.bg: #2271C1', 'components.com': 'Card: bg #1a1a1a' },
      getFileType: makeGetFileType(),
    })
    expect(r.compileFile).toBe('tokens.tok')
    expect(r.compileCode).toBe('primary.bg: #2271C1')
  })

  it('redirects to the previewFile + its code when editor is non-layout and previewFile is a layout', () => {
    const r = resolvePreviewRedirect({
      currentFile: 'tokens.tok',
      currentCode: 'primary.bg: #2271C1',
      previewFile: 'app.mir',
      files: { 'tokens.tok': 'primary.bg: #2271C1', 'app.mir': 'Frame bg $primary' },
      getFileType: makeGetFileType(),
    })
    expect(r.compileFile).toBe('app.mir')
    expect(r.compileCode).toBe('Frame bg $primary')
  })

  it('uses empty string when the previewFile is missing from the files map', () => {
    const r = resolvePreviewRedirect({
      currentFile: 'tokens.tok',
      currentCode: 'primary.bg: #2271C1',
      previewFile: 'missing.mir',
      files: { 'tokens.tok': 'primary.bg: #2271C1' },
      getFileType: makeGetFileType(),
    })
    expect(r.compileFile).toBe('missing.mir')
    expect(r.compileCode).toBe('')
  })
})
