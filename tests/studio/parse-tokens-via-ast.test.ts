/**
 * Equivalence tests: parseTokensViaAST vs the regex-based parseTokens.
 *
 * Slice 1 of the parseTokens migration tracked in docs/findings.md
 * ("Studio dupliziert Compiler-Pfade"). The new AST-based parser must
 * produce the same TokenDefinition[] as the regex parser for every
 * input the characterization suite (slice-78-token-picker.test.ts) and
 * existing studio code exercise. Once these pass on a known set of
 * fixtures, the cut-over slice swaps the picker's call-site.
 */

import { describe, it, expect } from 'vitest'
import { parseTokens } from '../../studio/pickers/token/types'
import { parseTokensViaAST } from '../../studio/pickers/token/parse-via-ast'
import type { TokenDefinition } from '../../studio/pickers/token/types'

/**
 * Compare two token arrays as sets keyed by name. Order can differ
 * between the regex and AST paths; what matters is that every
 * regex-parsed token shows up in the AST output with the same
 * value/type/kind/properties.
 */
function tokensEqualByName(
  actual: TokenDefinition[],
  expected: TokenDefinition[],
  fixture: string
): void {
  const actualMap = new Map(actual.map(t => [t.name, t]))
  const expectedMap = new Map(expected.map(t => [t.name, t]))

  for (const [name, exp] of expectedMap) {
    const got = actualMap.get(name)
    expect(got, `[${fixture}] missing token ${name} in AST output`).toBeDefined()
    if (!got) continue
    expect(got.value, `[${fixture}] ${name}.value`).toBe(exp.value)
    expect(got.type, `[${fixture}] ${name}.type`).toBe(exp.type)
    expect(got.kind, `[${fixture}] ${name}.kind`).toBe(exp.kind)
    if (exp.kind === 'set') {
      expect(got.properties, `[${fixture}] ${name}.properties`).toEqual(exp.properties)
    }
  }

  for (const [name] of actualMap) {
    expect(expectedMap.has(name), `[${fixture}] AST emitted unexpected token ${name}`).toBe(true)
  }
}

const FIXTURES: Array<{ label: string; source: string }> = [
  // --- Single-value tokens with suffix ---------------------------------
  {
    label: 'simple suffix tokens',
    source: ['primary.bg: #2271C1', 'primary.col: #ffffff', 'danger.bg: #ef4444'].join('\n'),
  },
  {
    label: 'numeric size tokens',
    source: ['sm.pad: 8', 'md.pad: 16', 'lg.pad: 24'].join('\n'),
  },
  {
    label: 'mixed colors and sizes',
    source: ['accent.bg: #2271C1', 'card.rad: 8', 'card.pad: 16'].join('\n'),
  },

  // --- Property-set tokens (Slice 78) ----------------------------------
  {
    label: 'cardstyle as a property set',
    source: 'cardstyle: bg #1a1a1a, pad 16, rad 8',
  },
  {
    label: 'typography set',
    source: 'heading: fs 24, weight bold, col white',
  },
  {
    label: 'multi-token values inside a set',
    source: 'btn: pad 10 20, rad 6',
  },
  {
    label: 'set with > 3 properties triggers + N more',
    source: 'cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8',
  },
  {
    label: 'mixed singles and sets in one source',
    source: ['primary.bg: #2271C1', 'cardstyle: bg #1a1a1a, pad 16, rad 8', 'btn.pad: 10 20'].join(
      '\n'
    ),
  },

  // --- Single-segment body must NOT be classified as a set -------------
  // RT-1 from slice-78-token-picker.test.ts: `text: hello world` is not
  // a token at all in Mirror; both parsers should emit zero tokens.
  // The regex parser explicitly skips it. Compiler may emit it as a
  // single-value token, in which case the AST mapper would diverge.
  // This fixture is intentionally listed but treated as "expected to
  // diverge" — tracked separately so we don't over-pin.

  // --- Chain-token resolution ------------------------------------------
  {
    label: 'one-hop chain to terminal hex',
    source: ['primary: #2271C1', 'accent.bg: $primary'].join('\n'),
  },
  {
    label: 'three-hop chain',
    source: ['a: #ff0000', 'b: $a', 'c: $b', 'd.bg: $c'].join('\n'),
  },
  {
    label: 'chain cycle terminates without crash',
    source: ['a: $b', 'b: $c', 'c: $a'].join('\n'),
  },
]

describe('parseTokensViaAST equivalence with parseTokens', () => {
  for (const fx of FIXTURES) {
    it(fx.label, () => {
      const expected = parseTokens(fx.source)
      const actual = parseTokensViaAST(fx.source)
      tokensEqualByName(actual, expected, fx.label)
    })
  }
})

describe('parseTokensFromFilesViaAST: multi-file dedup', () => {
  it('dedups by name across files; first occurrence wins', async () => {
    const { parseTokensFromFiles } = await import('../../studio/pickers/token/types')
    const { parseTokensFromFilesViaAST } = await import('../../studio/pickers/token/parse-via-ast')
    const files = {
      'tokens-a.tok': 'primary.bg: #2271C1\naccent.bg: #ff0000',
      'tokens-b.tok': 'primary.bg: #000000\nbutton.rad: 6',
    }
    const regex = parseTokensFromFiles(files)
    const ast = parseTokensFromFilesViaAST(files)

    expect(ast.map(t => t.name).sort()).toEqual(regex.map(t => t.name).sort())
    // primary.bg keeps the first file's value in both implementations.
    const primary = ast.find(t => t.name === '$primary.bg')
    expect(primary?.value).toBe('#2271C1')
  })

  it('skips empty files in both implementations', async () => {
    const { parseTokensFromFiles } = await import('../../studio/pickers/token/types')
    const { parseTokensFromFilesViaAST } = await import('../../studio/pickers/token/parse-via-ast')
    const files = {
      'empty.tok': '',
      'real.tok': 'foo.bg: #fff',
    }
    expect(parseTokensFromFiles(files).length).toBe(1)
    expect(parseTokensFromFilesViaAST(files).length).toBe(1)
  })
})

describe('parseTokensViaAST: edge cases that matched on inspection', () => {
  // Earlier audit noted `text: hello world` as a "potential divergence"
  // (regex parser explicitly skips single-segment non-numeric bodies).
  // The compiler parser turns out to skip it too — bare-word values
  // never make it into AST.tokens. Both implementations agree.
  it('single-segment non-numeric body — both skip', () => {
    expect(parseTokens('text: hello world')).toEqual([])
    expect(parseTokensViaAST('text: hello world')).toEqual([])
  })

  it('comments and empty lines — both ignore', () => {
    const source = ['// comment', '', '  ', '# also a comment', 'primary.bg: #fff'].join('\n')
    const regex = parseTokens(source)
    const ast = parseTokensViaAST(source)
    expect(regex.length).toBe(1)
    expect(ast.length).toBe(1)
    expect(ast[0].name).toBe('$primary.bg')
  })
})
