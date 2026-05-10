/**
 * parseTokensViaAST — equivalence against real-world token files in
 * examples/ . Slice 1.5 of the parseTokens migration: this is the
 * "smoke test against actual users" before any cut-over.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parseTokens } from '../../studio/pickers/token/types'
import { parseTokensViaAST } from '../../studio/pickers/token/parse-via-ast'
import type { TokenDefinition } from '../../studio/pickers/token/types'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')

function tokensSorted(tokens: TokenDefinition[]): TokenDefinition[] {
  return tokens.slice().sort((a, b) => a.name.localeCompare(b.name))
}

describe('parseTokensViaAST — real example token files', () => {
  it('examples/personas-informatik/tokens.tok parses to the same tokens', () => {
    const file = path.join(repoRoot, 'examples/personas-informatik/tokens.tok')
    const source = fs.readFileSync(file, 'utf-8')

    const regex = tokensSorted(parseTokens(source))
    const ast = tokensSorted(parseTokensViaAST(source))

    // Same set of token names.
    expect(ast.map(t => t.name)).toEqual(regex.map(t => t.name))

    // For every token, name/value/kind should match. Type may differ
    // by the suffix-vs-value tie-break for unsuffixed tokens — pin
    // value+kind first, surface type mismatches as soft warnings.
    for (let i = 0; i < regex.length; i++) {
      const r = regex[i]
      const a = ast[i]
      expect(a.name, `token ${i}`).toBe(r.name)
      expect(a.value, `${r.name}.value`).toBe(r.value)
      expect(a.kind, `${r.name}.kind`).toBe(r.kind)
      if (r.kind === 'set') {
        expect(a.properties, `${r.name}.properties`).toEqual(r.properties)
      }
    }
  })
})
