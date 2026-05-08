import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  runValidator,
  expandInputs,
  collectPrelude,
  applyIgnore,
  applyInlineDisables,
  parseInlineDisables,
  crossFileCodeToErrorCode,
} from '../../compiler/validator/cli-runner'

let tmpDir: string

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-validator-cli-'))
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
}

beforeEach(() => {
  tmpDir = makeTmpDir()
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('validator CLI runner — file extensions', () => {
  it('accepts .mir', () => {
    const f = path.join(tmpDir, 'a.mir')
    writeFile(f, 'canvas mobile\nText "Hi"')
    const result = runValidator({ inputs: [f] })
    expect(result.totals.files).toBe(1)
  })

  it('accepts .mirror', () => {
    const f = path.join(tmpDir, 'a.mirror')
    writeFile(f, 'canvas mobile\nText "Hi"')
    const result = runValidator({ inputs: [f] })
    expect(result.totals.files).toBe(1)
  })

  it('accepts .tok', () => {
    const f = path.join(tmpDir, 't.tok')
    writeFile(f, 'primary.bg: #2271C1')
    const result = runValidator({ inputs: [f] })
    expect(result.totals.files).toBe(1)
  })

  it('accepts .com', () => {
    const f = path.join(tmpDir, 'c.com')
    writeFile(f, 'Btn: pad 10 20, bg #2271C1, col white')
    const result = runValidator({ inputs: [f] })
    expect(result.totals.files).toBe(1)
  })

  it('ignores files with non-Mirror extensions', () => {
    const f = path.join(tmpDir, 'random.txt')
    writeFile(f, 'not mirror')
    const result = runValidator({ inputs: [f] })
    expect(result.totals.files).toBe(0)
  })
})

describe('validator CLI runner — single-file validation', () => {
  it('returns no errors for valid Mirror code', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(
      f,
      `canvas mobile, bg #1a1a1a
Text "Hello", col white, fs 24
`
    )
    const result = runValidator({ inputs: [f] })
    expect(result.totals.errors).toBe(0)
    expect(result.exitCode).toBe(0)
  })

  it('reports unknown property as error', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(f, `canvas mobile\nText "x", nonsenseprop 5`)
    const result = runValidator({ inputs: [f] })
    expect(result.totals.errors).toBeGreaterThan(0)
    expect(result.exitCode).toBe(1)
  })

  it('reports undefined token as warning when validated alone', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(f, `canvas mobile\nText "x", col $undefinedToken`)
    const result = runValidator({ inputs: [f] })
    // W500 is a warning, not an error
    const allCodes = [
      ...result.fileResults.flatMap(fr => fr.errors.map(e => e.code)),
      ...result.fileResults.flatMap(fr => fr.warnings.map(w => w.code)),
    ]
    expect(allCodes).toContain('W500')
  })
})

describe('validator CLI runner — project mode (multiple files)', () => {
  it('uses cross-file prelude so tokens defined elsewhere resolve', () => {
    const tokens = path.join(tmpDir, 'tokens.tok')
    const components = path.join(tmpDir, 'components.com')
    writeFile(tokens, 'primary.bg: #2271C1')
    writeFile(components, 'Btn as Button: bg $primary, pad 10')

    const result = runValidator({ inputs: [tokens, components] })

    // Token reference $primary should be resolved through the prelude.
    const allCodes = [
      ...result.fileResults.flatMap(fr => fr.errors.map(e => e.code)),
      ...result.fileResults.flatMap(fr => fr.warnings.map(w => w.code)),
    ]
    expect(allCodes).not.toContain('W500')
  })

  it('detects undefined token across files via cross-file pass', () => {
    const tokens = path.join(tmpDir, 'tokens.tok')
    const app = path.join(tmpDir, 'app.mir')
    writeFile(tokens, 'primary.bg: #2271C1')
    writeFile(app, `canvas mobile\nText "x", col $missingToken`)

    const result = runValidator({ inputs: [tokens, app] })

    expect(result.crossFileErrors.some(e => e.code === 'undefined-token')).toBe(true)
  })

  it('detects undefined component across files', () => {
    const components = path.join(tmpDir, 'components.com')
    const app = path.join(tmpDir, 'app.mir')
    writeFile(components, 'Btn: pad 10, bg #2271C1')
    writeFile(app, `canvas mobile\nNonExistentComponent`)

    const result = runValidator({ inputs: [components, app] })

    expect(result.crossFileErrors.some(e => e.code === 'undefined-component')).toBe(true)
  })

  it('detects duplicate token with different values', () => {
    const tokens1 = path.join(tmpDir, 'tokens.tok')
    const tokens2 = path.join(tmpDir, 'more-tokens.tok')
    writeFile(tokens1, 'primary.bg: #2271C1')
    writeFile(tokens2, 'primary.bg: #ff0000')

    const result = runValidator({ inputs: [tokens1, tokens2] })

    expect(result.crossFileErrors.some(e => e.code === 'duplicate-token')).toBe(true)
  })
})

describe('validator CLI runner — project mode (directory)', () => {
  it('discovers files in a directory automatically', () => {
    writeFile(path.join(tmpDir, 'tokens.tok'), 'primary.bg: #2271C1')
    writeFile(path.join(tmpDir, 'components.com'), 'Btn as Button: bg $primary, pad 10')
    writeFile(path.join(tmpDir, 'app.mir'), `canvas mobile\nBtn "Test"`)

    const result = runValidator({ inputs: [tmpDir] })

    expect(result.totals.files).toBe(3)
  })

  it('discovers nested project structure (data/tokens/components/layouts)', () => {
    writeFile(path.join(tmpDir, 'tokens', 'colors.tok'), 'primary.bg: #2271C1')
    writeFile(path.join(tmpDir, 'components', 'btn.com'), 'Btn as Button: bg $primary, pad 10')
    writeFile(path.join(tmpDir, 'app.mir'), 'canvas mobile\nBtn "Test"')

    const result = runValidator({ inputs: [tmpDir] })

    expect(result.totals.files).toBe(3)
  })
})

describe('validator CLI runner — ignoreCodes', () => {
  it('filters errors with the specified code', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(f, `canvas mobile\nText "x", nonsenseprop 5`)

    const without = runValidator({ inputs: [f] })
    const with_ = runValidator({ inputs: [f], ignoreCodes: new Set(['E100']) })

    expect(without.totals.errors).toBeGreaterThan(0)
    expect(with_.totals.errors).toBeLessThan(without.totals.errors)
  })

  it('filters cross-file errors via mapped code', () => {
    const tokens = path.join(tmpDir, 'tokens.tok')
    const app = path.join(tmpDir, 'app.mir')
    writeFile(tokens, 'primary.bg: #2271C1')
    writeFile(app, `canvas mobile\nText "x", col $missingToken`)

    const without = runValidator({ inputs: [tokens, app] })
    const with_ = runValidator({ inputs: [tokens, app], ignoreCodes: new Set(['W500']) })

    expect(without.crossFileErrors.some(e => e.code === 'undefined-token')).toBe(true)
    expect(with_.crossFileErrors.some(e => e.code === 'undefined-token')).toBe(false)
  })
})

describe('validator CLI runner — strict mode and max-warnings', () => {
  it('exit code 0 when clean', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(f, 'canvas mobile\nText "Hi"')
    const result = runValidator({ inputs: [f] })
    expect(result.exitCode).toBe(0)
  })

  it('strict mode treats warnings as exit-failing', () => {
    // Create a file with a warning (undefined token → W500).
    const f = path.join(tmpDir, 'app.mir')
    writeFile(f, `canvas mobile\nText "x", col $undefinedToken`)

    const lenient = runValidator({ inputs: [f] })
    const strict = runValidator({ inputs: [f], strict: true })

    expect(lenient.totals.warnings).toBeGreaterThan(0)
    expect(lenient.exitCode).toBe(0)
    expect(strict.exitCode).toBe(1)
  })

  it('--max-warnings triggers exit code 2 when exceeded', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(f, `canvas mobile\nText "x", col $undefinedToken`)

    const result = runValidator({ inputs: [f], maxWarnings: 0 })

    expect(result.warningLimitExceeded).toBe(true)
    expect(result.exitCode).toBe(2)
  })

  it('--max-warnings=N permits up to N warnings', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(f, `canvas mobile\nText "x", col $undefinedToken`)
    const result = runValidator({ inputs: [f], maxWarnings: 100 })
    expect(result.warningLimitExceeded).toBe(false)
    expect(result.exitCode).toBe(0)
  })
})

describe('validator CLI runner — glob expansion', () => {
  it('expands *.mir glob', () => {
    writeFile(path.join(tmpDir, 'a.mir'), 'canvas mobile\nText "a"')
    writeFile(path.join(tmpDir, 'b.mir'), 'canvas mobile\nText "b"')
    writeFile(path.join(tmpDir, 'c.txt'), 'not mirror')

    const expanded = expandInputs([path.join(tmpDir, '*.mir')])

    expect(expanded.length).toBe(2)
    expect(expanded.every(p => p.endsWith('.mir'))).toBe(true)
  })

  it('expands *.tok glob', () => {
    writeFile(path.join(tmpDir, 'colors.tok'), 'primary.bg: #2271C1')
    writeFile(path.join(tmpDir, 'spaces.tokens'), 'gap-md.gap: 16')

    const expanded = expandInputs([path.join(tmpDir, '*.tok')])

    expect(expanded.length).toBe(1)
    expect(expanded[0]).toContain('colors.tok')
  })
})

describe('collectPrelude', () => {
  it('collects token names + base names from multiple files', () => {
    const prelude = collectPrelude([
      { filename: 'tokens.tok', content: 'primary.bg: #2271C1\nprimary.col: white' },
      { filename: 'more.tok', content: 'danger.bg: #ef4444' },
    ])

    expect(prelude.tokens.has('primary.bg')).toBe(true)
    expect(prelude.tokens.has('primary.col')).toBe(true)
    expect(prelude.tokens.has('primary')).toBe(true) // base name
    expect(prelude.tokens.has('danger.bg')).toBe(true)
    expect(prelude.tokens.has('danger')).toBe(true)
  })

  it('collects component names', () => {
    const prelude = collectPrelude([
      { filename: 'components.com', content: 'Btn: pad 10\nCard as Frame: bg #fff' },
    ])

    expect(prelude.components.has('Btn')).toBe(true)
    expect(prelude.components.has('Card')).toBe(true)
  })

  it('handles empty input gracefully', () => {
    const prelude = collectPrelude([])
    expect(prelude.tokens.size).toBe(0)
    expect(prelude.components.size).toBe(0)
  })
})

describe('applyIgnore', () => {
  it('filters errors with matching codes', () => {
    const result = applyIgnore(
      {
        valid: false,
        errors: [
          { severity: 'error', code: 'E100', message: 'a', line: 1, column: 1 },
          { severity: 'error', code: 'E200', message: 'b', line: 2, column: 1 },
        ],
        warnings: [],
        errorCount: 2,
        warningCount: 0,
      },
      new Set(['E100'])
    )

    expect(result.errorCount).toBe(1)
    expect(result.errors[0].code).toBe('E200')
  })

  it('returns input unchanged when ignoreCodes is empty', () => {
    const input = {
      valid: false,
      errors: [{ severity: 'error' as const, code: 'E100', message: 'a', line: 1, column: 1 }],
      warnings: [],
      errorCount: 1,
      warningCount: 0,
    }
    const result = applyIgnore(input, new Set())
    expect(result).toBe(input)
  })
})

describe('validator CLI runner — --unused', () => {
  it('does NOT emit W501 by default', () => {
    const tokens = path.join(tmpDir, 'tokens.tok')
    const app = path.join(tmpDir, 'app.mir')
    writeFile(tokens, 'primary.bg: #2271C1\nunused.col: white')
    writeFile(app, `canvas mobile\nText "x", col $primary`)

    const result = runValidator({ inputs: [tokens, app] })
    const warnings = result.fileResults.flatMap(fr => fr.warnings.map(w => w.code))
    expect(warnings).not.toContain('W501')
  })

  it('emits W501 with reportUnused: true', () => {
    const tokens = path.join(tmpDir, 'tokens.tok')
    const app = path.join(tmpDir, 'app.mir')
    writeFile(tokens, 'primary.bg: #2271C1\nunused.col: white')
    writeFile(app, `canvas mobile\nText "x", col $primary`)

    const result = runValidator({ inputs: [tokens, app], reportUnused: true })
    const warnings = result.fileResults.flatMap(fr => fr.warnings)
    const unusedTokens = warnings.filter(w => w.code === 'W501')
    expect(unusedTokens.length).toBeGreaterThan(0)
    expect(unusedTokens[0].message).toContain('unused.col')
  })

  it('emits W503 for unused components', () => {
    const components = path.join(tmpDir, 'components.com')
    const app = path.join(tmpDir, 'app.mir')
    writeFile(components, 'Used: pad 10\nUnused: pad 20')
    writeFile(app, `canvas mobile\nUsed`)

    const result = runValidator({ inputs: [components, app], reportUnused: true })
    const warnings = result.fileResults.flatMap(fr => fr.warnings)
    const unusedComps = warnings.filter(w => w.code === 'W503')
    expect(unusedComps.some(w => w.message.includes('Unused'))).toBe(true)
    expect(unusedComps.some(w => w.message.includes('Used'))).toBe(false)
  })

  it('counts a component used as `as Base` as not unused', () => {
    const components = path.join(tmpDir, 'components.com')
    const app = path.join(tmpDir, 'app.mir')
    writeFile(components, 'BaseBtn: pad 10\nDangerBtn as BaseBtn: bg #ef4444')
    writeFile(app, `canvas mobile\nDangerBtn`)

    const result = runValidator({ inputs: [components, app], reportUnused: true })
    const warnings = result.fileResults.flatMap(fr => fr.warnings)
    const baseUnused = warnings.find(w => w.message.includes('BaseBtn'))
    expect(baseUnused).toBeUndefined()
  })

  it('counts a token used via base-name shorthand ($primary for primary.bg)', () => {
    const tokens = path.join(tmpDir, 'tokens.tok')
    const app = path.join(tmpDir, 'app.mir')
    writeFile(tokens, 'primary.bg: #2271C1\nprimary.col: white')
    writeFile(app, `canvas mobile\nFrame bg $primary`)

    const result = runValidator({ inputs: [tokens, app], reportUnused: true })
    const warnings = result.fileResults.flatMap(fr => fr.warnings)
    // Both family entries are "used" because $primary covers them.
    const unusedTokens = warnings.filter(w => w.code === 'W501')
    expect(unusedTokens.length).toBe(0)
  })
})

describe('inline-disable comments', () => {
  it('parseInlineDisables — disable-line with code list', () => {
    const map = parseInlineDisables(
      `Frame nonsense 5  // validate-disable-line E100
Frame ok 16`
    )
    expect(map.lineMap.get(1)?.has('E100')).toBe(true)
    expect(map.lineMap.has(2)).toBe(false)
  })

  it('parseInlineDisables — disable-next-line', () => {
    const map = parseInlineDisables(
      `// validate-disable-next-line E100
Frame nonsense 5
Frame other`
    )
    expect(map.nextLineMap.get(2)?.has('E100')).toBe(true)
  })

  it('parseInlineDisables — wildcard when no codes given', () => {
    const map = parseInlineDisables('Frame x  // validate-disable-line')
    expect(map.lineMap.get(1)?.has('*')).toBe(true)
  })

  it('parseInlineDisables — multi-code', () => {
    const map = parseInlineDisables('Frame x  // validate-disable-line E100, W110, E105')
    const codes = map.lineMap.get(1)!
    expect(codes.has('E100')).toBe(true)
    expect(codes.has('W110')).toBe(true)
    expect(codes.has('E105')).toBe(true)
  })

  it('end-to-end: disable-next-line suppresses E100', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(
      f,
      `canvas mobile
// validate-disable-next-line E100
Text "x", nonsenseprop 5`
    )
    const result = runValidator({ inputs: [f] })
    const codes = result.fileResults[0].errors.map(e => e.code)
    expect(codes).not.toContain('E100')
  })

  it('end-to-end: disable-line suppresses on same line', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(
      f,
      `canvas mobile
Text "x", nonsenseprop 5  // validate-disable-line E100`
    )
    const result = runValidator({ inputs: [f] })
    const codes = result.fileResults[0].errors.map(e => e.code)
    expect(codes).not.toContain('E100')
  })

  it('end-to-end: wildcard disable suppresses everything on the line', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(
      f,
      `canvas mobile
Text "x", nonsenseprop 5, anothernonsense "x"  // validate-disable-line`
    )
    const result = runValidator({ inputs: [f] })
    expect(result.fileResults[0].errors.length).toBe(0)
  })

  it('does NOT suppress unrelated lines', () => {
    const f = path.join(tmpDir, 'app.mir')
    writeFile(
      f,
      `canvas mobile
// validate-disable-next-line E100
Text "x", nonsenseprop 5
Text "y", anothernonsense 7`
    )
    const result = runValidator({ inputs: [f] })
    const codes = result.fileResults[0].errors.map(e => e.code)
    // Line 4's error must still surface.
    expect(codes).toContain('E100')
  })

  it('applyInlineDisables — direct API filters as expected', () => {
    const result = applyInlineDisables(
      {
        valid: false,
        errors: [
          { severity: 'error', code: 'E100', message: 'a', line: 5, column: 1 },
          { severity: 'error', code: 'E105', message: 'b', line: 5, column: 1 },
          { severity: 'error', code: 'E100', message: 'c', line: 6, column: 1 },
        ],
        warnings: [],
        errorCount: 3,
        warningCount: 0,
      },
      {
        lineMap: new Map([[5, new Set(['E100'])]]),
        nextLineMap: new Map(),
      }
    )
    // Line 5 E100 suppressed; line 5 E105 kept; line 6 E100 kept.
    expect(result.errorCount).toBe(2)
    expect(result.errors.map(e => `${e.line}:${e.code}`)).toEqual(['5:E105', '6:E100'])
  })
})

describe('crossFileCodeToErrorCode', () => {
  it('maps undefined-token to W500', () => {
    expect(crossFileCodeToErrorCode('undefined-token')).toBe('W500')
  })
  it('maps undefined-component to E002', () => {
    expect(crossFileCodeToErrorCode('undefined-component')).toBe('E002')
  })
  it('maps duplicate-token to E603', () => {
    expect(crossFileCodeToErrorCode('duplicate-token')).toBe('E603')
  })
})
