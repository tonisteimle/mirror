/**
 * Parser robustness: nested state blocks emit a parse error and don't hang.
 *
 * State blocks (`hover:`, `on:`, `selected:`, …) cannot nest. Earlier the
 * parser silently skipped the inner header and re-attributed its body to the
 * outer state, hiding the user's mistake. Now it reports a `Nested state
 * block …` parse error and skips the inner indented block so the outer body
 * loop can continue.
 *
 * Regression guard: `tools/probes/parser-nested-state.ts` is the canonical
 * probe for this; this test file pins the contract in CI.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

function expectNestedStateError(src: string): void {
  const ast = parse(src)
  expect(ast.errors ?? []).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: expect.stringMatching(/Nested state block/),
      }),
    ])
  )
}

describe('Parser — nested inheritance definition', () => {
  it('reports error for `Inner extends Btn:` inside a component body', () => {
    const ast = parse(`Outer:
  Inner extends Btn:
    bg #f00
`)
    expect(ast.errors ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringMatching(
            /Nested component inheritance "Inner extends …" is not supported/
          ),
        }),
      ])
    )
  })

  it('still allows nested `as Frame:` definition inside a component body', () => {
    const ast = parse(`Outer:
  Inner as Frame:
    bg #f00
`)
    expect(ast.errors ?? []).toEqual([])
    const outer = ast.components.find(c => c.name === 'Outer')
    expect(outer).toBeDefined()
    expect(outer?.children).toHaveLength(1)
    const child = outer?.children[0] as { type: string; name?: string }
    expect(child.type).toBe('Component')
    expect(child.name).toBe('Inner')
  })
})

describe('Parser — nested state blocks', () => {
  it('reports an error for hover inside on (instance state)', () => {
    expectNestedStateError(`Btn "X", toggle()
  on:
    bg #eee
    hover:
      bg #ddd
`)
  })

  it('reports an error for hover inside hover (component definition)', () => {
    expectNestedStateError(`Box: bg #fff
  hover:
    bg #eee
    hover:
      bg #ddd
`)
  })

  it('does not hang on three-level nesting', () => {
    const start = Date.now()
    parse(`Box: bg #fff
  hover:
    on:
      active:
        bg #ddd
`)
    expect(Date.now() - start).toBeLessThan(500)
  })
})
