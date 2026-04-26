/**
 * Multi-File — Differential Testing (Schicht 4)
 *
 * Documentation: docs/concepts/multi-file-backend-support.md.
 *
 * Multi-file support is provided by the language-agnostic `compileProject`
 * preprocessor, which simply concatenates files in canonical order before
 * handing the combined source to a backend. This means the multi-file
 * feature is supported by *all backends* equally — what differs is only
 * the per-feature backend support of the constructs (tokens, components)
 * actually used inside the files.
 *
 * These tests pin that invariant.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { combineProjectFiles } from '../../compiler/preprocessor'
import type { ListFilesFn, ReadFileFn } from '../../compiler/preprocessor'

function makeFs(layout: Record<string, Record<string, string>>): {
  listFiles: ListFilesFn
  readFile: ReadFileFn
} {
  const listFiles: ListFilesFn = dir => Object.keys(layout[dir] || {}).sort()
  const readFile: ReadFileFn = path => {
    const slash = path.indexOf('/')
    if (slash === -1) return null
    const dir = path.slice(0, slash)
    const file = path.slice(slash + 1)
    return layout[dir]?.[file] ?? null
  }
  return { listFiles, readFile }
}

const TOKEN_CROSS_FILE = makeFs({
  tokens: { 'colors.mirror': 'primary.bg: #2271C1' },
  layouts: { 'app.mirror': 'Frame bg $primary, w 100, h 50' },
})

const COMPONENT_CROSS_FILE = makeFs({
  components: { 'btn.mirror': 'PrimaryBtn as Button: bg #2271C1, pad 10 20' },
  layouts: { 'app.mirror': 'PrimaryBtn "Save"' },
})

const TOKEN_AND_COMPONENT = makeFs({
  tokens: { 't.mirror': 'primary.bg: #2271C1\nradius: 6' },
  components: { 'b.mirror': 'PrimaryBtn as Button: bg $primary, rad $radius, pad 10' },
  layouts: { 'app.mirror': 'PrimaryBtn "Go"' },
})

describe('Multi-File — preprocessor is backend-agnostic', () => {
  it('combineProjectFiles produces a deterministic concatenated source', () => {
    const a = combineProjectFiles(TOKEN_CROSS_FILE.listFiles, TOKEN_CROSS_FILE.readFile)
    const b = combineProjectFiles(TOKEN_CROSS_FILE.listFiles, TOKEN_CROSS_FILE.readFile)
    expect(a).toBe(b)
  })

  it('combined source contains both tokens and layouts content', () => {
    const combined = combineProjectFiles(TOKEN_CROSS_FILE.listFiles, TOKEN_CROSS_FILE.readFile)
    expect(combined).toContain('primary.bg')
    expect(combined).toContain('Frame bg $primary')
  })
})

describe('Multi-File — token cross-file resolution per backend', () => {
  const combined = combineProjectFiles(TOKEN_CROSS_FILE.listFiles, TOKEN_CROSS_FILE.readFile)
  const ast = parse(combined)

  it('DOM resolves cross-file token to var(--primary-bg)', () => {
    const out = generateDOM(ast)
    expect(out).toContain('var(--primary-bg)')
  })

  it('React resolves cross-file token (compiles without throwing)', () => {
    expect(() => generateReact(ast)).not.toThrow()
  })

  it('Framework resolves cross-file token (compiles without throwing)', () => {
    expect(() => generateFramework(ast)).not.toThrow()
  })
})

describe('Multi-File — component cross-file resolution per backend', () => {
  const combined = combineProjectFiles(
    COMPONENT_CROSS_FILE.listFiles,
    COMPONENT_CROSS_FILE.readFile
  )
  const ast = parse(combined)

  it('DOM compiles component-from-other-file', () => {
    const out = generateDOM(ast)
    expect(out).toContain('PrimaryBtn')
  })

  it('React compiles component-from-other-file', () => {
    expect(() => generateReact(ast)).not.toThrow()
  })

  it('Framework compiles component-from-other-file', () => {
    expect(() => generateFramework(ast)).not.toThrow()
  })
})

describe('Multi-File — token + component chain per backend', () => {
  const combined = combineProjectFiles(TOKEN_AND_COMPONENT.listFiles, TOKEN_AND_COMPONENT.readFile)
  const ast = parse(combined)

  it('DOM emits component using cross-file token chain', () => {
    const out = generateDOM(ast)
    expect(out).toContain('var(--primary-bg)')
    expect(out).toContain('var(--radius)')
  })

  it('React compiles component+token chain', () => {
    expect(() => generateReact(ast)).not.toThrow()
  })

  it('Framework compiles component+token chain', () => {
    expect(() => generateFramework(ast)).not.toThrow()
  })
})

describe('Multi-File — `use` directive is cosmetic across backends', () => {
  const baseLayout = {
    tokens: { 'c.mirror': 'primary.bg: #2271C1' },
    layouts: { 'app.mirror': 'Frame bg $primary, w 100' },
  }
  const layoutWithUse = {
    ...baseLayout,
    layouts: { 'app.mirror': 'use tokens\n\nFrame bg $primary, w 100' },
  }

  it('DOM output is functionally equivalent with and without `use`', () => {
    const a = generateDOM(
      parse(combineProjectFiles(makeFs(baseLayout).listFiles, makeFs(baseLayout).readFile))
    )
    const b = generateDOM(
      parse(combineProjectFiles(makeFs(layoutWithUse).listFiles, makeFs(layoutWithUse).readFile))
    )
    // Both must produce var(--primary-bg)
    expect(a).toContain('var(--primary-bg)')
    expect(b).toContain('var(--primary-bg)')
  })

  it('React + Framework both accept `use` without throwing', () => {
    const ast = parse(
      combineProjectFiles(makeFs(layoutWithUse).listFiles, makeFs(layoutWithUse).readFile)
    )
    expect(() => generateReact(ast)).not.toThrow()
    expect(() => generateFramework(ast)).not.toThrow()
  })
})
