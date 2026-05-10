/**
 * AST Type Guard Tests
 *
 * `compiler/parser/ast.ts` was 60% — type guards `isTable`,
 * `isTableColumn`, `isConditional`, `hasContent` were uncovered.
 *
 * 2026-05-10 update: hoisted `isTokenReference` + `isComputedExpression`
 * predicates from inline cast-chains in chart-transformer + react.ts
 * (commit fad36418). Direct tests pin both, including the negative
 * cases that catch silent type-erasure regressions.
 */

import { describe, it, expect } from 'vitest'
import {
  isComponent,
  isInstance,
  isZagComponent,
  isSlot,
  isText,
  isEach,
  isConditional,
  isTokenReference,
  isComputedExpression,
  hasContent,
  isTable,
  isTableColumn,
} from '../../compiler/parser/ast'

describe('AST Type Guards — positive cases', () => {
  it.each([
    [isComponent, { type: 'Component' }],
    [isInstance, { type: 'Instance' }],
    [isZagComponent, { type: 'ZagComponent' }],
    [isSlot, { type: 'Slot' }],
    [isText, { type: 'Text' }],
    [isEach, { type: 'Each' }],
    [isTable, { type: 'Table' }],
    [isTableColumn, { type: 'TableColumn' }],
  ])('returns true for matching type', (guard, node) => {
    expect((guard as any)(node)).toBe(true)
  })

  it('isConditional returns true for kind="conditional"', () => {
    expect(isConditional({ kind: 'conditional' })).toBe(true)
  })

  it('hasContent returns true for objects with content prop', () => {
    expect(hasContent({ content: 'Hello' })).toBe(true)
  })
})

describe('AST Type Guards — negative cases', () => {
  it.each([
    isComponent,
    isInstance,
    isZagComponent,
    isSlot,
    isText,
    isEach,
    isConditional,
    hasContent,
    isTable,
    isTableColumn,
  ])('rejects null/undefined/primitives', guard => {
    expect((guard as any)(null)).toBe(false)
    expect((guard as any)(undefined)).toBe(false)
    expect((guard as any)('string')).toBe(false)
    expect((guard as any)(42)).toBe(false)
    expect((guard as any)(true)).toBe(false)
  })

  it('rejects objects with wrong type field', () => {
    expect(isInstance({ type: 'Component' })).toBe(false)
    expect(isText({ type: 'Instance' })).toBe(false)
    expect(isTable({ type: 'TableRow' })).toBe(false)
    expect(isTableColumn({ type: 'Table' })).toBe(false)
  })

  it('isConditional rejects objects without kind="conditional"', () => {
    expect(isConditional({ type: 'Conditional' })).toBe(false)
    expect(isConditional({ kind: 'expression' })).toBe(false)
    expect(isConditional({})).toBe(false)
  })

  it('hasContent rejects objects without content prop', () => {
    expect(hasContent({ name: 'X' })).toBe(false)
    expect(hasContent({})).toBe(false)
  })
})

describe('isTokenReference', () => {
  it('returns true for canonical TokenReference shape', () => {
    expect(isTokenReference({ kind: 'token', name: 'primary' })).toBe(true)
    expect(isTokenReference({ kind: 'token', name: 'card.bg' })).toBe(true)
  })

  it('rejects objects with kind != "token"', () => {
    expect(isTokenReference({ kind: 'conditional', name: 'x' })).toBe(false)
    expect(isTokenReference({ kind: 'expression', name: 'x' })).toBe(false)
    expect(isTokenReference({ kind: 'loopVar', name: 'item' })).toBe(false)
  })

  it('rejects objects missing name field', () => {
    expect(isTokenReference({ kind: 'token' })).toBe(false)
  })

  it('rejects objects with non-string name', () => {
    expect(isTokenReference({ kind: 'token', name: 42 })).toBe(false)
    expect(isTokenReference({ kind: 'token', name: null })).toBe(false)
  })

  it('rejects null/undefined/primitives', () => {
    expect(isTokenReference(null)).toBe(false)
    expect(isTokenReference(undefined)).toBe(false)
    expect(isTokenReference('$primary')).toBe(false)
    expect(isTokenReference(42)).toBe(false)
  })
})

describe('isComputedExpression', () => {
  it('returns true for canonical ComputedExpression shape', () => {
    expect(
      isComputedExpression({
        kind: 'expression',
        parts: ['Hello ', { kind: 'token', name: 'name' }],
        operators: ['+'],
      })
    ).toBe(true)
  })

  it('returns true for any object with kind="expression"', () => {
    // The predicate only checks the discriminator — narrower validation
    // (parts/operators arrays) happens at the consumer.
    expect(isComputedExpression({ kind: 'expression' })).toBe(true)
  })

  it('rejects objects with kind != "expression"', () => {
    expect(isComputedExpression({ kind: 'token' })).toBe(false)
    expect(isComputedExpression({ kind: 'conditional' })).toBe(false)
  })

  it('rejects null/undefined/primitives', () => {
    expect(isComputedExpression(null)).toBe(false)
    expect(isComputedExpression(undefined)).toBe(false)
    expect(isComputedExpression('expression')).toBe(false)
    expect(isComputedExpression(42)).toBe(false)
  })
})
