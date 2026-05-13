/**
 * augmentForPreview — pure-function tests.
 *
 * Pin the two branches:
 *   1. No uninstanced components → pass-through (no compiler re-runs).
 *   2. ≥1 uninstanced → re-parse + re-emit + re-IR, return augmented
 *      codeToCompile / finalJsCode / ir / sourceMap.
 */

import { describe, it, expect, vi } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { augmentForPreview } from '../../studio/compile/augment-pipeline'
import type { Program } from '../../compiler/parser/ast'

// Stub DOM-emit. We only care that the helper *calls* it on the
// augmented AST — not that it emits real JS. The "DOM-out:<n>" pattern
// lets us verify which AST shape it received.
const fakeGenerateDOM = (ast: ReturnType<typeof parse>): string =>
  `DOM-out:${(ast.components || []).length}c/${(ast.instances || []).length}i`

// Single-arg wrapper around the compiler's `toIR(ast, withSourceMap)` to
// match the helper's callback signature (which always wants the sourceMap).
const wrappedToIR = (ast: Program) => toIR(ast, true)

describe('augmentForPreview', () => {
  describe('no-augment branch (all components already instanced)', () => {
    it('returns inputs unchanged when there are no components', () => {
      const code = 'Frame bg red'
      const ast = parse(code)
      const irResult = toIR(ast, true)
      const r = augmentForPreview({
        fullAst: ast,
        localAst: ast,
        resolvedCode: code,
        jsCode: 'INITIAL_JS',
        irResult,
        parse: vi.fn(parse),
        generateDOM: vi.fn(fakeGenerateDOM),
        toIR: vi.fn(wrappedToIR),
      })
      expect(r.codeToCompile).toBe(code)
      expect(r.finalJsCode).toBe('INITIAL_JS')
      expect(r.ir).toBe(irResult.ir)
      expect(r.sourceMap).toBe(irResult.sourceMap)
    })

    it('does NOT call the compiler-API callbacks when no augmentation is needed', () => {
      const code = 'Card: bg #1a1a1a\n\nCard'
      const ast = parse(code)
      const irResult = toIR(ast, true)
      const parseSpy = vi.fn(parse)
      const domSpy = vi.fn(fakeGenerateDOM)
      const irSpy = vi.fn(wrappedToIR)
      augmentForPreview({
        fullAst: ast,
        localAst: ast,
        resolvedCode: code,
        jsCode: 'INITIAL_JS',
        irResult,
        parse: parseSpy,
        generateDOM: domSpy,
        toIR: irSpy,
      })
      expect(parseSpy).not.toHaveBeenCalled()
      expect(domSpy).not.toHaveBeenCalled()
      expect(irSpy).not.toHaveBeenCalled()
    })
  })

  describe('augment branch (≥1 uninstanced component)', () => {
    it('re-runs parse + generateDOM + toIR and returns augmented results', () => {
      // User defined Card but did not instance it.
      const localCode = 'Card: bg #1a1a1a'
      const localAst = parse(localCode)
      // Full AST is the same in this minimal case (no prelude).
      const fullAst = localAst
      const initialIr = toIR(fullAst, true)

      const parseSpy = vi.fn(parse)
      const domSpy = vi.fn(fakeGenerateDOM)
      const irSpy = vi.fn(wrappedToIR)

      const r = augmentForPreview({
        fullAst,
        localAst,
        resolvedCode: localCode,
        jsCode: 'INITIAL_JS',
        irResult: initialIr,
        parse: parseSpy,
        generateDOM: domSpy,
        toIR: irSpy,
      })

      // Helper appended an implicit `Card` instance and re-ran the pipeline.
      expect(r.codeToCompile).not.toBe(localCode)
      expect(r.codeToCompile).toContain('Card')
      expect(parseSpy).toHaveBeenCalledTimes(1)
      expect(domSpy).toHaveBeenCalledTimes(1)
      expect(irSpy).toHaveBeenCalledTimes(1)
      // finalJsCode came from the augmented DOM-emit, not from `jsCode`.
      expect(r.finalJsCode).not.toBe('INITIAL_JS')
      expect(r.finalJsCode).toMatch(/^DOM-out:/)
      // IR + sourceMap come from the augmented re-run, not the initial one.
      expect(r.ir).not.toBe(initialIr.ir)
      expect(r.sourceMap).not.toBe(initialIr.sourceMap)
    })

    it('calls the toIR callback exactly once on the augmented AST', () => {
      const code = 'Card: bg #1a1a1a'
      const ast = parse(code)
      const irResult = toIR(ast, true)
      const irSpy = vi.fn(wrappedToIR)
      augmentForPreview({
        fullAst: ast,
        localAst: ast,
        resolvedCode: code,
        jsCode: 'INITIAL_JS',
        irResult,
        parse,
        generateDOM: fakeGenerateDOM,
        toIR: irSpy,
      })
      // Augmenting → toIR called once. The "always with sourceMap" contract
      // is the caller's wiring concern; the helper just invokes the callback.
      expect(irSpy).toHaveBeenCalledTimes(1)
    })
  })
})
