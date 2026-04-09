/**
 * Prelude Builder Tests
 */

import { describe, it, expect } from 'vitest'
import { buildPrelude, countPreludeLines, adjustLineNumber } from '../../studio/modules/compiler/prelude-builder'

describe('buildPrelude', () => {
  const getFileType = (filename: string): 'tokens' | 'component' | 'layout' => {
    if (filename.includes('token')) return 'tokens'
    if (filename.includes('component') || filename.includes('button')) return 'component'
    return 'layout'
  }

  it('should return empty prelude for token files', () => {
    const result = buildPrelude({
      files: {
        'tokens.mirror': 'accent.bg: #007bff',
        'main.mirror': 'Box bg $accent.bg',
      },
      currentFile: 'tokens.mirror',
      getFileType,
    })

    expect(result.prelude).toBe('')
    expect(result.offset).toBe(0)
    expect(result.tokenCount).toBe(0)
    expect(result.componentCount).toBe(0)
  })

  it('should include tokens in prelude for layout files', () => {
    const result = buildPrelude({
      files: {
        'tokens.mirror': 'accent.bg: #007bff',
        'main.mirror': 'Box bg $accent.bg',
      },
      currentFile: 'main.mirror',
      getFileType,
    })

    expect(result.prelude).toContain('accent.bg: #007bff')
    expect(result.tokenCount).toBe(1)
  })

  it('should include both tokens and components for layout files', () => {
    const result = buildPrelude({
      files: {
        'tokens.mirror': 'accent.bg: #007bff',
        'button.mirror': 'Button: = Box pad 16',
        'main.mirror': 'Button',
      },
      currentFile: 'main.mirror',
      getFileType,
    })

    expect(result.prelude).toContain('accent.bg: #007bff')
    expect(result.prelude).toContain('Button: = Box pad 16')
    expect(result.tokenCount).toBe(1)
    expect(result.componentCount).toBe(1)
  })

  it('should only include tokens for component files', () => {
    const result = buildPrelude({
      files: {
        'tokens.mirror': 'accent.bg: #007bff',
        'button.mirror': 'Button: = Box bg $accent.bg',
        'card.component.mirror': 'Card: = Box\n  Button',
      },
      currentFile: 'button.mirror',
      getFileType,
    })

    expect(result.prelude).toContain('accent.bg: #007bff')
    expect(result.prelude).not.toContain('Card')
    expect(result.tokenCount).toBe(1)
    expect(result.componentCount).toBe(0)
  })

  it('should not include current file in prelude', () => {
    const result = buildPrelude({
      files: {
        'main.mirror': 'Box w 100',
      },
      currentFile: 'main.mirror',
      getFileType,
    })

    expect(result.prelude).toBe('')
  })

  it('should sort files alphabetically', () => {
    const result = buildPrelude({
      files: {
        'z-tokens.mirror': '$z: #000',
        'a-tokens.mirror': '$a: #fff',
        'main.mirror': 'Box',
      },
      currentFile: 'main.mirror',
      getFileType: (f) => f.includes('token') ? 'tokens' : 'layout',
    })

    const aIndex = result.prelude.indexOf('$a')
    const zIndex = result.prelude.indexOf('$z')
    expect(aIndex).toBeLessThan(zIndex)
  })

  it('should calculate correct offset', () => {
    const result = buildPrelude({
      files: {
        'tokens.mirror': 'line1\nline2',
        'main.mirror': 'Box',
      },
      currentFile: 'main.mirror',
      getFileType,
    })

    // Prelude includes comment line + content + empty line + newline before main
    expect(result.offset).toBeGreaterThan(0)
  })

  it('should skip empty files', () => {
    const result = buildPrelude({
      files: {
        'empty-tokens.mirror': '',
        'tokens.mirror': '$color: #fff',
        'main.mirror': 'Box',
      },
      currentFile: 'main.mirror',
      getFileType,
    })

    expect(result.tokenCount).toBe(1) // Only non-empty token file
  })
})

describe('countPreludeLines', () => {
  it('should count lines correctly', () => {
    expect(countPreludeLines('')).toBe(0)
    expect(countPreludeLines('one')).toBe(1)
    expect(countPreludeLines('one\ntwo')).toBe(2)
    expect(countPreludeLines('one\ntwo\nthree')).toBe(3)
  })
})

describe('adjustLineNumber', () => {
  it('should subtract prelude lines', () => {
    expect(adjustLineNumber(5, 3)).toBe(2)
    expect(adjustLineNumber(10, 5)).toBe(5)
  })

  it('should return at least 1', () => {
    expect(adjustLineNumber(1, 5)).toBe(1)
    expect(adjustLineNumber(0, 10)).toBe(1)
  })
})
