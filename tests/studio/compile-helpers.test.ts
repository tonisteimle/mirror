// @vitest-environment jsdom
/**
 * Tests for the pure-helper modules in studio/compile/:
 *   - all-project-source.ts
 *   - tokens-source.ts
 *   - prelude-builder.ts
 *   - prelude-line-offset.ts
 *   - code-generator.ts
 *   - collect-prelude.ts
 *
 * All six were 0% covered. They are pure (or DI-only) and form the
 * spine of the compile pipeline: ordering, prelude assembly, line-offset
 * mapping, and the parse/IR/DOM trio.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { collectAllProjectSource } from '../../studio/compile/all-project-source'
import { collectTokensSource } from '../../studio/compile/tokens-source'
import { PreludeBuilder } from '../../studio/compile/prelude-builder'
import { getPreludeLineOffset } from '../../studio/compile/prelude-line-offset'
import { CodeGenerator } from '../../studio/compile/code-generator'
import { collectPrelude } from '../../studio/compile/collect-prelude'
import type { MirrorLangAPI } from '../../studio/compile/types'

// =============================================================================
// all-project-source
// =============================================================================

describe('collectAllProjectSource', () => {
  it('orders files: data → tokens → component → layout', () => {
    const result = collectAllProjectSource({
      getFiles: () => ({
        'app.mir': 'L',
        'tokens.tok': 'T',
        'comp.com': 'C',
        'data.yaml': 'D',
      }),
      getFileType: filename => {
        if (filename.endsWith('.mir')) return 'layout'
        if (filename.endsWith('.tok')) return 'tokens'
        if (filename.endsWith('.com')) return 'component'
        if (filename.endsWith('.yaml')) return 'data'
        return 'other'
      },
    })
    // data first, then tokens, then component, then layout
    expect(result).toBe('D\nT\nC\nL\n')
  })

  it('returns "" for empty file map', () => {
    expect(
      collectAllProjectSource({
        getFiles: () => ({}),
        getFileType: () => 'other',
      })
    ).toBe('')
  })

  it('skips unknown file types entirely', () => {
    const result = collectAllProjectSource({
      getFiles: () => ({ 'a.mir': 'L', 'b.weird': 'W' }),
      getFileType: filename => (filename.endsWith('.mir') ? 'layout' : 'unknown'),
    })
    expect(result).toBe('L\n')
  })

  it('preserves multiple files within the same type bucket', () => {
    const result = collectAllProjectSource({
      getFiles: () => ({ 'a.tok': '1', 'b.tok': '2' }),
      getFileType: () => 'tokens',
    })
    // Both included, separator newline between
    expect(result).toContain('1\n')
    expect(result).toContain('2\n')
  })

  it('joins each file with a trailing newline', () => {
    const result = collectAllProjectSource({
      getFiles: () => ({ 'a.tok': 'X' }),
      getFileType: () => 'tokens',
    })
    expect(result).toBe('X\n')
  })
})

// =============================================================================
// tokens-source
// =============================================================================

describe('collectTokensSource', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('collects tokens + data files from in-memory map', () => {
    const result = collectTokensSource({
      getInMemoryFiles: () => ({
        'tokens.tok': 'primary: #2271C1',
        'data.yaml': 'name: Alice',
        'app.mir': 'Frame "Hello"',
      }),
      getFileType: filename => {
        if (filename.endsWith('.tok')) return 'tokens'
        if (filename.endsWith('.yaml')) return 'data'
        return 'layout'
      },
    })
    expect(result).toContain('primary: #2271C1')
    expect(result).toContain('name: Alice')
    expect(result).not.toContain('Hello')
  })

  it('falls back to localStorage for files not in memory', () => {
    localStorage.setItem('mirror-files', JSON.stringify({ 'extra.tok': 'secondary: #ff0000' }))
    const result = collectTokensSource({
      getInMemoryFiles: () => ({}),
      getFileType: () => 'tokens',
    })
    expect(result).toContain('secondary: #ff0000')
  })

  it('does NOT double-include a file present in both memory and localStorage', () => {
    localStorage.setItem('mirror-files', JSON.stringify({ 'tokens.tok': 'STORED' }))
    const result = collectTokensSource({
      getInMemoryFiles: () => ({ 'tokens.tok': 'MEMORY' }),
      getFileType: () => 'tokens',
    })
    expect(result).toContain('MEMORY')
    expect(result).not.toContain('STORED')
  })

  it('honours custom storageKey', () => {
    localStorage.setItem('custom-key', JSON.stringify({ 'a.tok': 'CUSTOM' }))
    const result = collectTokensSource({
      getInMemoryFiles: () => ({}),
      getFileType: () => 'tokens',
      storageKey: 'custom-key',
    })
    expect(result).toContain('CUSTOM')
  })

  it('warns and continues when localStorage JSON parse fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('mirror-files', 'not-json{')
    const result = collectTokensSource({
      getInMemoryFiles: () => ({ 'a.tok': 'IN-MEMORY' }),
      getFileType: () => 'tokens',
    })
    expect(result).toContain('IN-MEMORY')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('returns "" when no files match', () => {
    const result = collectTokensSource({
      getInMemoryFiles: () => ({ 'app.mir': 'X' }),
      getFileType: () => 'layout',
    })
    expect(result).toBe('')
  })
})

// =============================================================================
// prelude-builder
// =============================================================================

describe('PreludeBuilder', () => {
  it('passes non-layout code through unchanged', () => {
    const b = new PreludeBuilder({
      getPreludeCode: () => 'PRELUDE',
      currentFile: 'tokens.tok',
    })
    expect(b.resolve('USER', 'tokens')).toEqual({
      resolvedCode: 'USER',
      preludeOffset: 0,
    })
  })

  it('passes layout code through unchanged when prelude is empty', () => {
    const b = new PreludeBuilder({
      getPreludeCode: () => '',
      currentFile: 'app.mir',
    })
    expect(b.resolve('USER', 'layout')).toEqual({
      resolvedCode: 'USER',
      preludeOffset: 0,
    })
  })

  it('prepends prelude + separator for layout files', () => {
    const b = new PreludeBuilder({
      getPreludeCode: () => 'PRE',
      currentFile: 'app.mir',
    })
    const result = b.resolve('USER', 'layout')
    expect(result.resolvedCode).toBe('PRE\n\n// === app.mir ===\nUSER')
  })

  it('preludeOffset = prelude.length + separator.length', () => {
    const b = new PreludeBuilder({
      getPreludeCode: () => 'PRE',
      currentFile: 'app.mir',
    })
    const result = b.resolve('USER', 'layout')
    const separator = '\n\n// === app.mir ===\n'
    expect(result.preludeOffset).toBe('PRE'.length + separator.length)
    // Verify offset points at start of USER content.
    expect(result.resolvedCode.slice(result.preludeOffset)).toBe('USER')
  })

  it('preludeOffset is 0 when no prelude prepended', () => {
    const b = new PreludeBuilder({
      getPreludeCode: () => '',
      currentFile: 'app.mir',
    })
    expect(b.resolve('USER', 'layout').preludeOffset).toBe(0)
  })

  it('embeds the actual currentFile name in the separator comment', () => {
    const b = new PreludeBuilder({
      getPreludeCode: () => 'P',
      currentFile: 'screens/login.mir',
    })
    expect(b.resolve('U', 'layout').resolvedCode).toContain('// === screens/login.mir ===')
  })
})

// =============================================================================
// prelude-line-offset
// =============================================================================

describe('getPreludeLineOffset', () => {
  it('returns 0 for non-layout file', () => {
    expect(
      getPreludeLineOffset({
        getCurrentFile: () => 'tokens.tok',
        getFileType: () => 'tokens',
        getPreludeCode: () => 'a\nb\nc',
      })
    ).toBe(0)
  })

  it('returns 0 when prelude is empty', () => {
    expect(
      getPreludeLineOffset({
        getCurrentFile: () => 'app.mir',
        getFileType: () => 'layout',
        getPreludeCode: () => '',
      })
    ).toBe(0)
  })

  it('counts prelude lines + 3 separator lines - 1 (line 1 maps)', () => {
    // Single-line prelude → 1 line + 3 - 1 = 3
    expect(
      getPreludeLineOffset({
        getCurrentFile: () => 'app.mir',
        getFileType: () => 'layout',
        getPreludeCode: () => 'one-line',
      })
    ).toBe(3)
  })

  it('multi-line prelude — 5 lines → 5 + 3 - 1 = 7', () => {
    expect(
      getPreludeLineOffset({
        getCurrentFile: () => 'app.mir',
        getFileType: () => 'layout',
        getPreludeCode: () => 'a\nb\nc\nd\ne',
      })
    ).toBe(7)
  })

  it('passes currentFile to getPreludeCode (excludes the active file)', () => {
    const getPreludeCode = vi.fn().mockReturnValue('prelude')
    getPreludeLineOffset({
      getCurrentFile: () => 'app.mir',
      getFileType: () => 'layout',
      getPreludeCode,
    })
    expect(getPreludeCode).toHaveBeenCalledWith('app.mir')
  })
})

// =============================================================================
// code-generator
// =============================================================================

describe('CodeGenerator', () => {
  let MirrorLang: MirrorLangAPI
  let gen: CodeGenerator

  beforeEach(() => {
    MirrorLang = {
      parse: vi.fn().mockReturnValue({ components: [], instances: [], tokens: [] }),
      toIR: vi.fn().mockReturnValue({ ir: 'IR', sourceMap: { x: 1 } }),
      generateDOM: vi.fn().mockReturnValue('JS'),
    }
    gen = new CodeGenerator({ MirrorLang })
  })

  it('parse() delegates to MirrorLang.parse', () => {
    gen.parse('CODE')
    expect(MirrorLang.parse).toHaveBeenCalledWith('CODE')
  })

  it('parse() throws when AST has errors', () => {
    MirrorLang.parse = vi.fn().mockReturnValue({
      components: [],
      instances: [],
      tokens: [],
      errors: [
        { line: 5, message: 'unexpected token' },
        { line: 10, message: 'missing close' },
      ],
    })
    gen = new CodeGenerator({ MirrorLang })
    expect(() => gen.parse('CODE')).toThrow(/Line 5: unexpected token/)
    expect(() => gen.parse('CODE')).toThrow(/Line 10: missing close/)
  })

  it('parse() does NOT throw when errors array is empty', () => {
    MirrorLang.parse = vi.fn().mockReturnValue({
      components: [],
      instances: [],
      tokens: [],
      errors: [],
    })
    gen = new CodeGenerator({ MirrorLang })
    expect(() => gen.parse('CODE')).not.toThrow()
  })

  it('parse() does NOT throw when errors is undefined', () => {
    expect(() => gen.parse('CODE')).not.toThrow()
  })

  it('generateIR() passes withSourceMap=true', () => {
    const ast = { components: [], instances: [], tokens: [] }
    gen.generateIR(ast)
    expect(MirrorLang.toIR).toHaveBeenCalledWith(ast, true)
  })

  it('generateDOM() delegates to MirrorLang.generateDOM', () => {
    const ast = { components: [], instances: [], tokens: [] }
    gen.generateDOM(ast)
    expect(MirrorLang.generateDOM).toHaveBeenCalledWith(ast)
  })

  it('compile() runs parse → IR → DOM and returns full result', () => {
    const result = gen.compile('CODE', 42)
    expect(result.ast).toEqual({ components: [], instances: [], tokens: [] })
    expect(result.ir).toBe('IR')
    expect(result.sourceMap).toEqual({ x: 1 })
    expect(result.jsCode).toBe('JS')
    expect(result.resolvedCode).toBe('CODE')
    expect(result.preludeOffset).toBe(42)
  })

  it('compile() error format: "Line N: message" joined by newlines', () => {
    MirrorLang.parse = vi.fn().mockReturnValue({
      components: [],
      instances: [],
      tokens: [],
      errors: [
        { line: 3, message: 'boom' },
        { line: 7, message: 'bang' },
      ],
    })
    gen = new CodeGenerator({ MirrorLang })
    try {
      gen.compile('CODE', 0)
      throw new Error('should have thrown')
    } catch (e: any) {
      expect(e.message).toBe('Line 3: boom\nLine 7: bang')
    }
  })
})

// =============================================================================
// collect-prelude
// =============================================================================

describe('collectPrelude', () => {
  it('orders sections data → tokens → components', () => {
    const result = collectPrelude({
      excludeFile: 'app.mir',
      getInMemoryFiles: () => ({
        'comp.com': 'COMP',
        'tokens.tok': 'TOK',
        'data.yaml': 'DATA',
      }),
      getDesktopFiles: () => null,
      getFileType: filename => {
        if (filename.endsWith('.com')) return 'component'
        if (filename.endsWith('.tok')) return 'tokens'
        if (filename.endsWith('.yaml')) return 'data'
        return 'other'
      },
    })
    const dataIdx = result.indexOf('DATA')
    const tokIdx = result.indexOf('TOK')
    const compIdx = result.indexOf('COMP')
    expect(dataIdx).toBeLessThan(tokIdx)
    expect(tokIdx).toBeLessThan(compIdx)
  })

  it('excludes the active file', () => {
    const result = collectPrelude({
      excludeFile: 'tokens.tok',
      getInMemoryFiles: () => ({
        'tokens.tok': 'EXCLUDED',
        'other.tok': 'INCLUDED',
      }),
      getDesktopFiles: () => null,
      getFileType: () => 'tokens',
    })
    expect(result).not.toContain('EXCLUDED')
    expect(result).toContain('INCLUDED')
  })

  it('data files have NO header comment (Mirror data parser limitation)', () => {
    const result = collectPrelude({
      excludeFile: 'app.mir',
      getInMemoryFiles: () => ({ 'data.yaml': 'DATA' }),
      getDesktopFiles: () => null,
      getFileType: () => 'data',
    })
    expect(result).toBe('DATA')
    expect(result).not.toContain('// ===')
  })

  it('tokens + components get "// === filename ===" headers', () => {
    const result = collectPrelude({
      excludeFile: 'app.mir',
      getInMemoryFiles: () => ({
        'tokens.tok': 'TOK',
        'comp.com': 'COMP',
      }),
      getDesktopFiles: () => null,
      getFileType: filename =>
        filename.endsWith('.tok') ? 'tokens' : filename.endsWith('.com') ? 'component' : 'other',
    })
    expect(result).toContain('// === tokens.tok ===\nTOK')
    expect(result).toContain('// === comp.com ===\nCOMP')
  })

  it('merges desktopFiles with in-memory; desktop wins on name collision', () => {
    const result = collectPrelude({
      excludeFile: 'app.mir',
      getInMemoryFiles: () => ({ 'tokens.tok': 'IN-MEMORY' }),
      getDesktopFiles: () => ({ 'tokens.tok': 'DESKTOP' }),
      getFileType: () => 'tokens',
    })
    expect(result).toContain('DESKTOP')
    expect(result).not.toContain('IN-MEMORY')
  })

  it('handles getDesktopFiles returning null', () => {
    const result = collectPrelude({
      excludeFile: 'app.mir',
      getInMemoryFiles: () => ({ 'a.tok': 'A' }),
      getDesktopFiles: () => null,
      getFileType: () => 'tokens',
    })
    expect(result).toContain('A')
  })

  it('handles getDesktopFiles returning undefined', () => {
    const result = collectPrelude({
      excludeFile: 'app.mir',
      getInMemoryFiles: () => ({ 'a.tok': 'A' }),
      getDesktopFiles: () => undefined,
      getFileType: () => 'tokens',
    })
    expect(result).toContain('A')
  })

  it('skips empty/whitespace files', () => {
    const result = collectPrelude({
      excludeFile: 'app.mir',
      getInMemoryFiles: () => ({
        'a.tok': 'GOOD',
        'b.tok': '',
        'c.tok': '   \n  ',
      }),
      getDesktopFiles: () => null,
      getFileType: () => 'tokens',
    })
    expect(result).toContain('GOOD')
    expect(result).not.toContain('// === b.tok')
    expect(result).not.toContain('// === c.tok')
  })

  it('sorts files within each type alphabetically', () => {
    const result = collectPrelude({
      excludeFile: 'app.mir',
      getInMemoryFiles: () => ({ 'z.tok': 'Z', 'a.tok': 'A', 'm.tok': 'M' }),
      getDesktopFiles: () => null,
      getFileType: () => 'tokens',
    })
    const aIdx = result.indexOf('A')
    const mIdx = result.indexOf('M')
    const zIdx = result.indexOf('Z')
    expect(aIdx).toBeLessThan(mIdx)
    expect(mIdx).toBeLessThan(zIdx)
  })

  it('joins sections with double-newline separator', () => {
    const result = collectPrelude({
      excludeFile: 'app.mir',
      getInMemoryFiles: () => ({
        'data.yaml': 'D',
        'tokens.tok': 'T',
      }),
      getDesktopFiles: () => null,
      getFileType: filename => (filename.endsWith('.yaml') ? 'data' : 'tokens'),
    })
    expect(result).toContain('\n\n')
  })

  it('returns "" when only the active file matches', () => {
    const result = collectPrelude({
      excludeFile: 'tokens.tok',
      getInMemoryFiles: () => ({ 'tokens.tok': 'X' }),
      getDesktopFiles: () => null,
      getFileType: () => 'tokens',
    })
    expect(result).toBe('')
  })

  it('skips unknown file types entirely', () => {
    const result = collectPrelude({
      excludeFile: 'x',
      getInMemoryFiles: () => ({ 'unknown.weird': 'WEIRD' }),
      getDesktopFiles: () => null,
      getFileType: () => 'whatever',
    })
    expect(result).toBe('')
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: collectAllProjectSource type-order is exactly data → tokens → component → layout', () => {
    const result = collectAllProjectSource({
      getFiles: () => ({ a: 'A', b: 'B', c: 'C', d: 'D' }),
      getFileType: f => ({ a: 'layout', b: 'tokens', c: 'component', d: 'data' })[f] || 'other',
    })
    // Output must be `D\nB\nC\nA\n` — dropping any order step changes this.
    expect(result).toBe('D\nB\nC\nA\n')
  })

  it('M2: collectTokensSource processed-set prevents duplicates', () => {
    localStorage.setItem('mirror-files', JSON.stringify({ 'a.tok': 'STORED' }))
    const result = collectTokensSource({
      getInMemoryFiles: () => ({ 'a.tok': 'MEMORY' }),
      getFileType: () => 'tokens',
    })
    // Without the processed-set guard, both would be included.
    expect(result.match(/MEMORY/g)).toHaveLength(1)
    expect(result).not.toContain('STORED')
    localStorage.clear()
  })

  it('M3: PreludeBuilder offset includes BOTH prelude AND separator length', () => {
    const b = new PreludeBuilder({
      getPreludeCode: () => 'XX', // 2 chars
      currentFile: 'a.mir',
    })
    const result = b.resolve('Y', 'layout')
    const separator = '\n\n// === a.mir ===\n'
    expect(result.preludeOffset).toBe(2 + separator.length)
    // Slicing at offset must hit user code.
    expect(result.resolvedCode.slice(result.preludeOffset)).toBe('Y')
  })

  it('M4: getPreludeLineOffset adds 3 separator lines (catches drop of `+ 3`)', () => {
    // Single-line prelude → 1 + 3 - 1 = 3.
    const offset = getPreludeLineOffset({
      getCurrentFile: () => 'app.mir',
      getFileType: () => 'layout',
      getPreludeCode: () => 'P',
    })
    expect(offset).toBe(3)
  })

  it('M5: CodeGenerator.parse THROWS when errors.length > 0', () => {
    const MirrorLang: MirrorLangAPI = {
      parse: vi.fn().mockReturnValue({
        components: [],
        instances: [],
        tokens: [],
        errors: [{ line: 1, message: 'oops' }],
      }),
      toIR: vi.fn(),
      generateDOM: vi.fn(),
    }
    expect(() => new CodeGenerator({ MirrorLang }).parse('CODE')).toThrow(/Line 1: oops/)
  })

  it('M6: collectPrelude data files have NO header (catches accidental header add)', () => {
    const result = collectPrelude({
      excludeFile: 'x',
      getInMemoryFiles: () => ({ 'd.yaml': 'DATA' }),
      getDesktopFiles: () => null,
      getFileType: () => 'data',
    })
    expect(result).not.toContain('// ===')
  })

  it('M7: collectPrelude excludes active file (catches drop of `=== excludeFile` skip)', () => {
    const result = collectPrelude({
      excludeFile: 'a.tok',
      getInMemoryFiles: () => ({ 'a.tok': 'EXCLUDED', 'b.tok': 'KEEP' }),
      getDesktopFiles: () => null,
      getFileType: () => 'tokens',
    })
    expect(result).not.toContain('EXCLUDED')
    expect(result).toContain('KEEP')
  })
})
